"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Payment } from "@/types";
import { useMembers } from "@/lib/members-store";
import { AuditLogger } from "@/lib/audit-logger";
import { useAuth } from "@/lib/auth-context";
import { memberCodeMatchesSearch } from "@/lib/utils";

interface PaymentsContextType {
  payments: Payment[];
  loading: boolean;
  error: string | null;
  getAllPayments: () => Payment[];
  getPaymentsByMember: (memberId: string) => Payment[];
  getPaymentByCode: (code: string) => Payment | undefined;
  createPayment: (payment: Omit<Payment, "id">) => Promise<Payment>;
  updatePayment: (id: string, data: Partial<Payment>) => Promise<boolean>;
  deletePayment: (id: string) => Promise<boolean>;
  refreshPayments: () => Promise<void>;
  searchPayments: (query: string) => Payment[];
}

const PaymentsContext = createContext<PaymentsContextType | undefined>(undefined);

const api = (path: string, options?: RequestInit) =>
  fetch(path, { ...options, credentials: "include" });

export function PaymentsProvider({ children }: { children: ReactNode }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { members } = useMembers();
  const { user } = useAuth();

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api("/api/payments");
      if (!res.ok) {
        setError("Failed to load payments");
        return;
      }
      const data = await res.json();
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch payments:", err);
      setError("Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const getAllPayments = () => payments;
  const getPaymentsByMember = (memberId: string) =>
    payments.filter((p) => p.memberId === memberId);
  const getPaymentByCode = (code: string) => {
    const normalizedCode = code.toUpperCase();
    return payments.find((p) => p.id?.toUpperCase() === normalizedCode);
  };

  const searchPayments = (query: string): Payment[] => {
    if (!query) return payments;
    const normalizedQuery = query.toLowerCase().trim();
    return payments.filter((p) => {
      if (p.id?.toUpperCase().includes(query.toUpperCase())) return true;
      if (p.legacyPaymentId?.toUpperCase().includes(query.toUpperCase())) return true;
      const member = members.find((m) => m.id === p.memberId);
      if (memberCodeMatchesSearch(member?.memberCode, query)) return true;
      if (member) {
        const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
        if (fullName.includes(normalizedQuery)) return true;
      }
      if (p.amount.toString().includes(query)) return true;
      return false;
    });
  };

  const createPayment = async (paymentData: Omit<Payment, "id">): Promise<Payment> => {
    const res = await api("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentData),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to create payment");
    }
    const newPayment = await res.json();
    const member = members.find((m) => m.id === paymentData.memberId);
    setPayments((prev) => [newPayment, ...prev]);

    AuditLogger.log({
      user,
      actionType: "CREATE_PAYMENT",
      module: "payments",
      entityType: "payment",
      entityId: newPayment.id,
      entityCode: newPayment.id,
      summary: `Plată nouă: ${newPayment.amount} RON pentru ${member?.firstName} ${member?.lastName} (${member?.memberCode})`,
      metadata: {
        amount: newPayment.amount,
        paymentType: newPayment.paymentType,
        method: newPayment.method,
        memberCode: member?.memberCode,
        contributionYear: newPayment.contributionYear,
      },
    });
    return newPayment;
  };

  const updatePayment = async (id: string, data: Partial<Payment>): Promise<boolean> => {
    const oldPayment = payments.find((p) => p.id === id);
    if (!oldPayment) return false;
    const res = await api(`/api/payments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) return false;
    const member = members.find((m) => m.id === (data.memberId ?? oldPayment.memberId));
    AuditLogger.log({
      user,
      actionType: "UPDATE_PAYMENT",
      module: "payments",
      entityType: "payment",
      entityId: id,
      entityCode: id,
      summary: `Plată actualizată pentru ${member?.firstName} ${member?.lastName} (${member?.memberCode})`,
      metadata: { memberCode: member?.memberCode, changedFields: Object.keys(data), updates: data },
    });
    await fetchPayments();
    return true;
  };

  const deletePayment = async (id: string): Promise<boolean> => {
    const payment = payments.find((p) => p.id === id);
    if (!payment) return false;
    const res = await api(`/api/payments/${id}`, { method: "DELETE" });
    if (!res.ok) return false;
    setPayments((prev) => prev.filter((p) => p.id !== id));
    const member = members.find((m) => m.id === payment.memberId);
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
    });
    return true;
  };

  const refreshPayments = () => fetchPayments();

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
  );
}

export function usePayments() {
  const context = useContext(PaymentsContext);
  if (context === undefined) {
    throw new Error("usePayments must be used within a PaymentsProvider");
  }
  return context;
}
