"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { Payment } from "@/types"
import { useMembers } from "@/lib/members-store"
import { AuditLogger } from "@/lib/audit-logger"
import { useAuth } from "@/lib/auth-context"
import { paymentsApi, dbRowToPayment } from "@/lib/db-adapter"
import { isTauri } from "@/lib/db"
import { createBrowserClient } from "@/lib/supabase/client"
import { memberCodeMatchesSearch } from "@/lib/utils"

interface PaymentsContextType {
  payments: Payment[]
  loading: boolean
  error: string | null
  getAllPayments: () => Payment[]
  getPaymentsByMember: (memberId: string) => Payment[]
  getPaymentByCode: (code: string) => Payment | undefined
  createPayment: (payment: Omit<Payment, "id">) => Promise<Payment>
  updatePayment: (id: string, data: Partial<Payment>) => Promise<boolean>
  deletePayment: (id: string) => Promise<boolean>
  refreshPayments: () => Promise<void>
  searchPayments: (query: string) => Payment[]
}

const PaymentsContext = createContext<PaymentsContextType | undefined>(undefined)

export function PaymentsProvider({ children }: { children: ReactNode }) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { members } = useMembers()
  const { user } = useAuth()

  // Fetch all payments (Supabase or SQLite via adapter)
  const fetchPayments = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await paymentsApi.fetchPayments()
      setPayments(data)
    } catch (err) {
      console.error("Failed to fetch payments:", err)
      setError("Failed to load payments")
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  // Subscribe to Supabase realtime (skip when in Tauri)
  useEffect(() => {
    if (isTauri()) return
    const supabase = createBrowserClient()
    const channel = supabase
      .channel("payments-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newPayment = dbRowToPayment(payload.new)
            setPayments((prev) => [newPayment, ...prev])
          } else if (payload.eventType === "UPDATE") {
            const updatedPayment = dbRowToPayment(payload.new)
            setPayments((prev) =>
              prev.map((p) => (p.id === updatedPayment.id ? updatedPayment : p))
            )
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.payment_code || payload.old.id
            setPayments((prev) => prev.filter((p) => p.id !== deletedId))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const getAllPayments = (): Payment[] => {
    return payments
  }

  const getPaymentsByMember = (memberId: string): Payment[] => {
    return payments.filter((p) => p.memberId === memberId)
  }

  const getPaymentByCode = (code: string): Payment | undefined => {
    const normalizedCode = code.toUpperCase()
    return payments.find((p) => p.id?.toUpperCase() === normalizedCode)
  }

  const searchPayments = (query: string): Payment[] => {
    if (!query) return payments

    const normalizedQuery = query.toLowerCase().trim()

    return payments.filter((p) => {
      // Search by payment code (P-######)
      if (p.id?.toUpperCase().includes(query.toUpperCase())) return true
      
      // Search by legacy payment ID (PAY-MEM-####-####)
      if (p.legacyPaymentId?.toUpperCase().includes(query.toUpperCase())) return true

      const member = members.find((m) => m.id === p.memberId)
      // Use memberCodeMatchesSearch to support all formats (MEM-1004, M-1004, 01004, 1004)
      if (memberCodeMatchesSearch(member?.memberCode, query)) return true
      if (member) {
        const fullName = `${member.firstName} ${member.lastName}`.toLowerCase()
        if (fullName.includes(normalizedQuery)) return true
      }

      if (p.amount.toString().includes(query)) return true

      return false
    })
  }

  const createPayment = async (paymentData: Omit<Payment, "id">): Promise<Payment> => {
    try {
      const member = members.find((m) => m.id === paymentData.memberId)
      if (!member) {
        throw new Error("Member not found")
      }

      const newPayment = await paymentsApi.createPayment(paymentData)

      setPayments((prev) => [newPayment, ...prev])

      AuditLogger.log({
        user,
        actionType: "CREATE_PAYMENT",
        module: "payments",
        entityType: "payment",
        entityId: newPayment.id,
        entityCode: newPayment.id,
        summary: `Plată nouă: ${newPayment.amount} RON pentru ${member.firstName} ${member.lastName} (${member.memberCode})`,
        metadata: {
          amount: newPayment.amount,
          paymentType: newPayment.paymentType,
          method: newPayment.method,
          memberCode: member.memberCode,
          contributionYear: newPayment.contributionYear,
        },
      })

      return newPayment
    } catch (error) {
      console.error("Error creating payment:", error)
      throw error
    }
  }

  const updatePayment = async (id: string, data: Partial<Payment>): Promise<boolean> => {
    try {
      const oldPayment = payments.find((p) => p.id === id)
      if (!oldPayment) {
        return false
      }

      const ok = await paymentsApi.updatePayment(id, data)
      if (!ok) return false

      if (isTauri()) await fetchPayments()

      const member = members.find((m) => m.id === (data.memberId || oldPayment.memberId))

      AuditLogger.log({
        user,
        actionType: "UPDATE_PAYMENT",
        module: "payments",
        entityType: "payment",
        entityId: id,
        entityCode: id,
        summary: `Plată actualizată pentru ${member?.firstName} ${member?.lastName} (${member?.memberCode})`,
        metadata: {
          memberCode: member?.memberCode,
          changedFields: Object.keys(data),
          updates: data,
        },
      })

      return true
    } catch (error) {
      console.error("Error updating payment:", error)
      return false
    }
  }

  const deletePayment = async (id: string): Promise<boolean> => {
    try {
      const payment = payments.find((p) => p.id === id)
      if (!payment) {
        return false
      }

      const ok = await paymentsApi.deletePayment(id)
      if (!ok) return false

      setPayments((prev) => prev.filter((p) => p.id !== id))

      const member = members.find((m) => m.id === payment.memberId)

      AuditLogger.log({
        user,
        actionType: "DELETE_PAYMENT",
        module: "payments",
        entityType: "payment",
        entityId: id,
        entityCode: id,
        summary: `Plată ștearsă: ${payment.amount} RON pentru ${member?.firstName} ${member?.lastName} (${member?.memberCode})`,
        metadata: {
          amount: payment.amount,
          paymentType: payment.paymentType,
          memberCode: member?.memberCode,
          date: payment.date,
        },
      })

      return true
    } catch (error) {
      console.error("Error deleting payment:", error)
      return false
    }
  }

  const refreshPayments = async () => {
    await fetchPayments()
  }

  return (
    <PaymentsContext.Provider
      value={{
        payments,
        loading,
        error,
        getAllPayments,
        getPaymentsByMember,
        getPaymentByCode,
        createPayment,
        updatePayment,
        deletePayment,
        refreshPayments,
        searchPayments,
      }}
    >
      {children}
    </PaymentsContext.Provider>
  )
}

export function usePayments() {
  const context = useContext(PaymentsContext)
  if (context === undefined) {
    throw new Error("usePayments must be used within a PaymentsProvider")
  }
  return context
}
