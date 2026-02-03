"use client"

import type React from "react"

import { useMemo, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Payment, PaymentStatus } from "@/types"
import { useMembers } from "@/lib/members-store"
import { usePayments } from "@/lib/payments-store"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Receipt, MoreVertical, Pencil, Eye, Trash2 } from "lucide-react"
import Link from "next/link"
import { EditPaymentModal } from "./edit-payment-modal"
import { DeletePaymentDialog } from "./delete-payment-dialog"
import { displayPaymentId, displayMemberCode } from "@/lib/utils"

interface PaymentsTableProps {
  payments: Payment[]
}

export function PaymentsTable({ payments }: PaymentsTableProps) {
  const { members } = useMembers()
  const { deletePayment } = usePayments()
  const { hasPermission } = useAuth()
  const { toast } = useToast()
  const canEdit = hasPermission("edit")

  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const paymentsWithMembers = useMemo(() => {
    return payments.map((payment) => ({
      ...payment,
      member: members.find((m) => m.id === payment.memberId),
    }))
  }, [payments, members])

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case "Plătită":
        return "bg-green-500/10 text-green-700 border-green-200"
      case "Scadentă":
        return "bg-orange-500/10 text-orange-700 border-orange-200"
      case "Restanță":
        return "bg-red-500/10 text-red-700 border-red-200"
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-200"
    }
  }

  const handleEdit = (payment: Payment, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setEditingPayment(payment)
    setIsEditModalOpen(true)
  }

  const handleEditModalClose = (open: boolean) => {
    setIsEditModalOpen(open)
    if (!open) {
      // Clean up state after modal closes
      setTimeout(() => setEditingPayment(null), 100)
    }
  }

  const handleDeleteClick = (payment: Payment, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setDeletingPayment(payment)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false)
    // Clean up state after a small delay to ensure dialog animation completes
    setTimeout(() => setDeletingPayment(null), 100)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingPayment) return

    const paymentInfo = { id: displayPaymentId(deletingPayment.id), amount: deletingPayment.amount }

    try {
      const success = deletePayment(deletingPayment.id)
      if (success) {
        toast({
          title: "Plată ștearsă",
          description: `Plata ${paymentInfo.id} în valoare de ${paymentInfo.amount.toLocaleString()} RON a fost ștearsă`,
        })
      } else {
        throw new Error("Nu s-a putut șterge plata")
      }
    } catch (error) {
      toast({
        title: "Eroare",
        description: error instanceof Error ? error.message : "Nu s-a putut șterge plata",
        variant: "destructive",
      })
    } finally {
      handleDeleteDialogClose()
    }
  }

  if (payments.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-16">
          <div className="text-center text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="font-medium">Nu există plăți</p>
            <p className="text-sm mt-1">Apăsați butonul &quot;Încasează&quot; pentru a adăuga prima plată</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cod Plată</TableHead>
                  <TableHead>Cod Membru</TableHead>
                  <TableHead>Nume Membru</TableHead>
                  <TableHead>Dată plată</TableHead>
                  <TableHead>An cotizație</TableHead>
                  <TableHead>Tip plată</TableHead>
                  <TableHead className="text-right">Sumă (RON)</TableHead>
                  <TableHead>Metodă</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observații</TableHead>
                  <TableHead className="text-right">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsWithMembers.map((payment) => (
                  <TableRow key={payment.id} className={!payment.member ? "bg-amber-50/50" : undefined}>
                    <TableCell className="font-mono text-xs">{displayPaymentId(payment.id)}</TableCell>
                    <TableCell>
                      {payment.member ? (
                        <Link
                          href={`/members/${payment.member.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          {displayMemberCode(payment.member.memberCode)}
                        </Link>
                      ) : (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-200">
                          Neasociat
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {payment.member ? `${payment.member.firstName} ${payment.member.lastName}` : "Neasociat"}
                    </TableCell>
                    <TableCell>{new Date(payment.date).toLocaleDateString("ro-RO")}</TableCell>
                    <TableCell>{payment.contributionYear || "-"}</TableCell>
                    <TableCell>
                      <span className="text-sm">{payment.paymentType}</span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{payment.amount.toLocaleString()}</TableCell>
                    <TableCell>{payment.method}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(payment.status)}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {payment.observations || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => handleEdit(payment, e)}>
                            {canEdit ? <Pencil className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                            {canEdit ? "Editează" : "Vizualizează"}
                          </DropdownMenuItem>
                          {canEdit && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => handleDeleteClick(payment, e)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Șterge plata
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <EditPaymentModal payment={editingPayment} open={isEditModalOpen} onOpenChange={handleEditModalClose} />

      {deletingPayment && (
        <DeletePaymentDialog
          open={isDeleteDialogOpen}
          onClose={handleDeleteDialogClose}
          onConfirm={handleDeleteConfirm}
          paymentId={deletingPayment.id}
          amount={deletingPayment.amount}
        />
      )}
    </>
  )
}
