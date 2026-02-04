"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { Payment } from "@/types"
import { useMembers } from "@/lib/members-store"
import { AuditLogger } from "@/lib/audit-logger"
import { useAuth } from "@/lib/auth-context"
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

// Helper to convert database row to Payment type
function dbRowToPayment(row: any): Payment {
  return {
    id: row.payment_code || row.id,
    memberId: row.member_id,
    date: row.date,
    year: row.year,
    amount: parseFloat(row.amount),
    method: row.method,
    status: row.status,
    paymentType: row.payment_type,
    contributionYear: row.contribution_year,
    observations: row.observations,
    source: row.source,
    receiptNumber: row.receipt_number,
    legacyPaymentId: row.legacy_payment_id,
  }
}

// Helper to convert Payment to database row format
function paymentToDbRow(payment: Partial<Payment>): Record<string, any> {
  const row: Record<string, any> = {}

  if (payment.memberId !== undefined) row.member_id = payment.memberId
  if (payment.date !== undefined) row.date = payment.date
  if (payment.year !== undefined) row.year = payment.year
  if (payment.amount !== undefined) row.amount = payment.amount
  if (payment.method !== undefined) row.method = payment.method
  if (payment.status !== undefined) row.status = payment.status
  if (payment.paymentType !== undefined) row.payment_type = payment.paymentType
  if (payment.contributionYear !== undefined) row.contribution_year = payment.contributionYear
  if (payment.observations !== undefined) row.observations = payment.observations
  if (payment.source !== undefined) row.source = payment.source
  if (payment.receiptNumber !== undefined) row.receipt_number = payment.receiptNumber
  if (payment.legacyPaymentId !== undefined) row.legacy_payment_id = payment.legacyPaymentId

  return row
}

export function PaymentsProvider({ children }: { children: ReactNode }) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { members } = useMembers()
  const { user } = useAuth()
  const supabase = createBrowserClient()

  // Fetch all payments from Supabase
  const fetchPayments = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from("payments")
        .select("*")
        .order("date", { ascending: false })

      if (fetchError) {
        console.error("Error fetching payments:", fetchError)
        setError(fetchError.message)
        return
      }

      const mappedPayments = (data || []).map(dbRowToPayment)
      setPayments(mappedPayments)
    } catch (err) {
      console.error("Failed to fetch payments:", err)
      setError("Failed to load payments")
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Initial load
  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  // Subscribe to realtime changes
  useEffect(() => {
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
  }, [supabase])

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
      const { data: paymentCode, error: codeError } = await supabase.rpc("get_next_payment_code")

      if (codeError || !paymentCode) {
        console.error("Failed to generate payment code:", codeError)
        throw new Error("Failed to generate payment code")
      }

      const member = members.find((m) => m.id === paymentData.memberId)
      if (!member) {
        throw new Error("Member not found")
      }

      const dbRow = paymentToDbRow(paymentData)
      dbRow.payment_code = paymentCode

      const { data, error: insertError } = await supabase
        .from("payments")
        .insert(dbRow)
        .select()

      // Check for actual insert failure
      if (insertError) {
        console.error("Failed to create payment:", insertError)
        throw new Error(insertError.message || "Failed to create payment")
      }

      // Get the inserted payment (data is an array)
      const insertedData = data && data.length > 0 ? data[0] : null
      
      if (!insertedData) {
        console.error("No data returned after payment insert")
        throw new Error("Failed to retrieve created payment data")
      }

      const newPayment = dbRowToPayment(insertedData)

      // Manually add to local state to immediately show in list
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

      const dbRow = paymentToDbRow(data)
      dbRow.updated_at = new Date().toISOString()

      const { error: updateError } = await supabase
        .from("payments")
        .update(dbRow)
        .eq("payment_code", id)

      if (updateError) {
        console.error("Failed to update payment:", updateError)
        return false
      }

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

      const { error: deleteError } = await supabase
        .from("payments")
        .delete()
        .eq("payment_code", id)

      if (deleteError) {
        console.error("Failed to delete payment:", deleteError)
        return false
      }

      // Manually update local state to immediately reflect the deletion
      // (realtime subscription may not always receive the DELETE event properly)
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
