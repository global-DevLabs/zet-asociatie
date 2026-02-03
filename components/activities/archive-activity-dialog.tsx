"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Archive } from "lucide-react"

interface ArchiveActivityDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  activityTitle: string
}

export function ArchiveActivityDialog({ open, onClose, onConfirm, activityTitle }: ArchiveActivityDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <Archive className="h-5 w-5 text-blue-600" />
            </div>
            <AlertDialogTitle>Arhivează activitatea?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            Activitatea nu va mai apărea în lista activă. O poți reactiva oricând din activitățile arhivate.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Anulează
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Se arhivează..." : "Arhivează"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
