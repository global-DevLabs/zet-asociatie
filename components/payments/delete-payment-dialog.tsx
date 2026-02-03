"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { displayPaymentId } from "@/lib/utils"

interface DeletePaymentDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  paymentId: string
  amount: number
}

export function DeletePaymentDialog({ open, onClose, onConfirm, paymentId, amount }: DeletePaymentDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      await onConfirm()
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !isDeleting) {
      onClose()
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Șterge plata?</AlertDialogTitle>
          <AlertDialogDescription>
            Ești sigur că vrei să ștergi plata {displayPaymentId(paymentId)} în valoare de {amount.toLocaleString()} RON?
            <br />
            <br />
            <strong>Această acțiune este permanentă și nu poate fi anulată.</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isDeleting}>Anulează</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Se șterge..." : "Șterge"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
