"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DatePickerInput } from "@/components/ui/date-picker-input"
import { YearSelect } from "@/components/ui/year-select"
import { useMembers } from "@/lib/members-store"
import { usePayments } from "@/lib/payments-store"
import { useSettings } from "@/lib/settings-store"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import type { Payment, PaymentType, PaymentStatus } from "@/types"
import { Search } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface EditPaymentModalProps {
  payment: Payment | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditPaymentModal({ payment, open, onOpenChange }: EditPaymentModalProps) {
  const { members } = useMembers()
  const { updatePayment } = usePayments()
  const { paymentMethods } = useSettings()
  const { hasPermission } = useAuth()
  const { toast } = useToast()

  const canEdit = hasPermission("edit")

  const [memberSearch, setMemberSearch] = useState("")
  const [selectedMemberId, setSelectedMemberId] = useState<string>("")
  const [memberPopoverOpen, setMemberPopoverOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    date: "",
    contributionYear: "",
    paymentType: "" as PaymentType | "",
    amount: "",
    method: "",
    status: "Plătită" as PaymentStatus,
    observations: "",
  })

  // Initialize form data when payment changes
  useEffect(() => {
    if (payment) {
      setSelectedMemberId(payment.memberId)
      setFormData({
        date: payment.date,
        contributionYear: payment.contributionYear?.toString() || "",
        paymentType: payment.paymentType,
        amount: payment.amount.toString(),
        method: payment.method,
        status: payment.status,
        observations: payment.observations || "",
      })
    }
  }, [payment])

  const selectedMember = useMemo(() => {
    return members.find((m) => m.id === selectedMemberId)
  }, [members, selectedMemberId])

  const filteredMembers = useMemo(() => {
    if (!memberSearch) return members.slice(0, 50)

    const search = memberSearch.toLowerCase().trim()
    return members
      .filter((m) => {
        const memberCode = m.memberCode?.toLowerCase() || ""
        const fullName = `${m.firstName} ${m.lastName}`.toLowerCase()
        const phone = m.phone?.toLowerCase() || ""
        const email = m.email?.toLowerCase() || ""
        return (
          memberCode.includes(search) || fullName.includes(search) || phone.includes(search) || email.includes(search)
        )
      })
      .slice(0, 50)
  }, [members, memberSearch])

  const handleReset = () => {
    setSelectedMemberId("")
    setMemberSearch("")
    setFormData({
      date: "",
      contributionYear: "",
      paymentType: "",
      amount: "",
      method: "",
      status: "Plătită",
      observations: "",
    })
  }

  const handleSubmit = async () => {
    if (!payment) return

    // Validate required fields
    const errors: string[] = []

    if (!selectedMemberId) {
      errors.push("Membru")
    }
    if (!formData.date || formData.date.trim() === "") {
      errors.push("Dată plată")
    }
    if (!formData.paymentType || formData.paymentType.trim() === "") {
      errors.push("Tip plată")
    }
    if (!formData.amount || formData.amount.trim() === "") {
      errors.push("Sumă")
    }
    if (!formData.method || formData.method.trim() === "") {
      errors.push("Metodă de plată")
    }
    if (!formData.status) {
      errors.push("Status")
    }

    if (errors.length > 0) {
      toast({
        title: "Câmpuri lipsă",
        description: `Vă rugăm completați: ${errors.join(", ")}`,
        variant: "destructive",
      })
      return
    }

    const amount = Number.parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Sumă invalidă",
        description: "Suma trebuie să fie un număr pozitiv",
        variant: "destructive",
      })
      return
    }

    let contributionYear: number | undefined
    if (formData.contributionYear && formData.contributionYear.trim() !== "") {
      contributionYear = Number.parseInt(formData.contributionYear)
      if (isNaN(contributionYear)) {
        toast({
          title: "An invalid",
          description: "Anul de cotizație trebuie să fie un număr valid",
          variant: "destructive",
        })
        return
      }
    }

    setIsSubmitting(true)

    try {
      const success = await updatePayment(payment.id, {
        memberId: selectedMemberId,
        date: formData.date,
        year: formData.date ? parseInt(formData.date.slice(0, 4), 10) : new Date().getFullYear(),
        paymentType: formData.paymentType as PaymentType,
        contributionYear,
        amount,
        method: formData.method as any,
        status: formData.status,
        observations: formData.observations || undefined,
      })

      if (success) {
        toast({
          title: "Plată actualizată",
          description: `Plata de ${amount} RON a fost actualizată cu succes`,
        })
        handleReset()
        onOpenChange(false)
      } else {
        throw new Error("Failed to update payment")
      }
    } catch (error) {
      toast({
        title: "Eroare",
        description: error instanceof Error ? error.message : "Nu s-a putut actualiza plata",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleReset()
    }
    onOpenChange(newOpen)
  }

  if (!payment) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{canEdit ? "Editează Plata" : "Vizualizează Plata"}</DialogTitle>
          <DialogDescription>
            {canEdit
              ? "Modificați detaliile plății. Puteți schimba membrul asociat dacă este necesar."
              : "Detalii plată (doar vizualizare)"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <div className="grid gap-4 py-4">
            {/* Payment ID (read-only) */}
            <div className="space-y-2">
              <Label>ID Plată</Label>
              <Input value={payment.id} disabled className="font-mono text-xs" />
            </div>

            {/* Member Search */}
            <div className="space-y-2">
              <Label htmlFor="member">Membru *</Label>
              <Popover open={memberPopoverOpen} onOpenChange={setMemberPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={memberPopoverOpen}
                    className="w-full justify-between font-normal bg-transparent"
                    disabled={!canEdit}
                  >
                    {selectedMember ? (
                      <span>
                        {selectedMember.memberCode} - {selectedMember.firstName} {selectedMember.lastName}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Caută după nume, cod, telefon sau email...</span>
                    )}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Caută membru..." value={memberSearch} onValueChange={setMemberSearch} />
                    <CommandList>
                      <CommandEmpty>Niciun membru găsit</CommandEmpty>
                      <CommandGroup>
                        {filteredMembers.map((member) => (
                          <CommandItem
                            key={member.id}
                            value={member.id}
                            onSelect={() => {
                              setSelectedMemberId(member.id)
                              setMemberPopoverOpen(false)
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {member.firstName} {member.lastName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {member.memberCode} {member.phone && `• ${member.phone}`}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Payment Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Dată plată *</Label>
              <DatePickerInput
                value={formData.date}
                onChange={(value) => setFormData({ ...formData, date: value })}
                placeholder="dd.mm.yyyy"
                required={true}
                disabled={!canEdit}
              />
            </div>

            {/* Contribution Year */}
            <div className="space-y-2">
              <Label htmlFor="contributionYear">An de cotizație</Label>
              <YearSelect
                value={formData.contributionYear ? Number.parseInt(formData.contributionYear) : undefined}
                onChange={(value) => setFormData({ ...formData, contributionYear: value?.toString() || "" })}
                placeholder="Selectează anul (opțional)"
                fromYear={2000}
                toYear={new Date().getFullYear() + 2}
                disabled={!canEdit}
              />
            </div>

            {/* Payment Type */}
            <div className="space-y-2">
              <Label htmlFor="paymentType">Tip plată *</Label>
              <Select
                value={formData.paymentType}
                onValueChange={(value) => setFormData({ ...formData, paymentType: value as PaymentType })}
                disabled={!canEdit}
              >
                <SelectTrigger id="paymentType">
                  <SelectValue placeholder="Selectează tipul plății" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Taxă de înscriere">Taxă de înscriere</SelectItem>
                  <SelectItem value="Cotizație">Cotizație</SelectItem>
                  <SelectItem value="Taxă de reînscriere">Taxă de reînscriere</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Sumă (RON) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="100.00"
                disabled={!canEdit}
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="method">Metodă de plată *</Label>
              <Select
                value={formData.method}
                onValueChange={(value) => setFormData({ ...formData, method: value })}
                disabled={!canEdit}
              >
                <SelectTrigger id="method">
                  <SelectValue placeholder="Selectează metoda" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as PaymentStatus })}
                disabled={!canEdit}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Selectează status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Plătită">Plătită</SelectItem>
                  <SelectItem value="Scadentă">Scadentă</SelectItem>
                  <SelectItem value="Restanță">Restanță</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Observations */}
            <div className="space-y-2">
              <Label htmlFor="observations">Observații / Detalii chitanță</Label>
              <Textarea
                id="observations"
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                placeholder="Detalii chitanță, observații..."
                rows={3}
                disabled={!canEdit}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            {canEdit ? "Anulează" : "Închide"}
          </Button>
          {canEdit && (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Se salvează..." : "Actualizează plata"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
