"use client"

import { useState } from "react"
import type { Member, Payment, PaymentStatus, PaymentType } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, DollarSign, Receipt } from "lucide-react"
import { useSettings } from "@/lib/settings-store"
import { useToast } from "@/hooks/use-toast"
import { isoDateToDisplay } from "@/lib/utils"
import { DatePickerInput } from "@/components/ui/date-picker-input"
import { YearSelect } from "@/components/ui/year-select"

interface PaymentsTabProps {
  formData: Partial<Member>
  setFormData: (data: Partial<Member>) => void
  readOnly?: boolean
}

interface PaymentFormData {
  date: string
  contributionYear: string
  paymentType: PaymentType | ""
  amount: string
  method: string
  status: PaymentStatus
  observations: string
}

const emptyPaymentForm: PaymentFormData = {
  date: new Date().toISOString().split("T")[0],
  contributionYear: "",
  paymentType: "",
  amount: "",
  method: "",
  status: "Scadentă",
  observations: "",
}

export function PaymentsTab({ formData, setFormData, readOnly = false }: PaymentsTabProps) {
  const { paymentMethods } = useSettings()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>(emptyPaymentForm)

  const payments = formData.payments || []
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)

  const handleOpenDialog = (payment?: Payment) => {
    if (payment) {
      setEditingPayment(payment)
      setPaymentForm({
        date: payment.date.split("T")[0],
        contributionYear: payment.contributionYear?.toString() || "",
        paymentType: payment.paymentType,
        amount: payment.amount.toString(),
        method: payment.method,
        status: payment.status,
        observations: payment.observations || "",
      })
    } else {
      setEditingPayment(null)
      setPaymentForm(emptyPaymentForm)
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingPayment(null)
    setPaymentForm(emptyPaymentForm)
  }

  const handleSavePayment = () => {
    const missingFields: string[] = []

    if (!paymentForm.date || paymentForm.date.trim() === "") {
      missingFields.push("Dată plată")
    }
    if (!paymentForm.paymentType || paymentForm.paymentType.trim() === "") {
      missingFields.push("Tip plată")
    }
    if (!paymentForm.amount || paymentForm.amount.trim() === "") {
      missingFields.push("Sumă")
    }
    if (!paymentForm.method || paymentForm.method.trim() === "") {
      missingFields.push("Metodă de plată")
    }
    if (!paymentForm.status) {
      missingFields.push("Status")
    }

    if (missingFields.length > 0) {
      toast({
        title: "Eroare",
        description: `Următoarele câmpuri obligatorii lipsesc: ${missingFields.join(", ")}`,
        variant: "destructive",
      })
      return
    }

    const amount = Number.parseFloat(paymentForm.amount)
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Eroare",
        description: "Suma trebuie să fie un număr pozitiv",
        variant: "destructive",
      })
      return
    }

    let contributionYear: number | undefined
    if (paymentForm.contributionYear && paymentForm.contributionYear.trim() !== "") {
      contributionYear = Number.parseInt(paymentForm.contributionYear)
      if (isNaN(contributionYear) || contributionYear < 2000 || contributionYear > new Date().getFullYear() + 2) {
        toast({
          title: "Eroare",
          description: "Anul de cotizație trebuie să fie valid (între 2000 și anul curent + 2)",
          variant: "destructive",
        })
        return
      }
    }

    const newPayment: Payment = {
      id: editingPayment?.id || `PAY-${Date.now()}`,
      memberId: formData.id || "",
      date: paymentForm.date,
      year: paymentForm.date ? parseInt(paymentForm.date.slice(0, 4), 10) : new Date().getFullYear(),
      paymentType: paymentForm.paymentType as PaymentType,
      contributionYear,
      amount,
      method: paymentForm.method as any,
      status: paymentForm.status,
      observations: paymentForm.observations || undefined,
    }

    let updatedPayments: Payment[]
    if (editingPayment) {
      updatedPayments = payments.map((p) => (p.id === editingPayment.id ? newPayment : p))
      toast({
        title: "Succes",
        description: "Plata a fost actualizată",
      })
    } else {
      updatedPayments = [...payments, newPayment]
      toast({
        title: "Succes",
        description: "Plata a fost adăugată",
      })
    }

    setFormData({ ...formData, payments: updatedPayments })
    handleCloseDialog()
  }

  const handleDeletePayment = (paymentId: string) => {
    if (confirm("Sigur doriți să ștergeți această plată?")) {
      const updatedPayments = payments.filter((p) => p.id !== paymentId)
      setFormData({ ...formData, payments: updatedPayments })
      toast({
        title: "Plată ștearsă",
        description: "Plata a fost ștearsă cu succes",
      })
    }
  }

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case "Plătită":
        return "text-green-600 bg-green-50"
      case "Scadentă":
        return "text-orange-600 bg-orange-50"
      case "Restanță":
        return "text-red-600 bg-red-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Total Cotizații
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPaid.toLocaleString()} RON</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Receipt className="h-4 w-4 text-blue-600" />
              Număr Plăți
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Istoric Plăți</CardTitle>
          {!readOnly && (
            <Button onClick={() => handleOpenDialog()} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adaugă Cotizație
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium">Nu există plăți înregistrate</p>
              <p className="text-sm mt-1">Apăsați butonul &quot;Adaugă Cotizație&quot; pentru a adăuga prima plată</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tip plată</TableHead>
                    <TableHead>An cotizație</TableHead>
                    <TableHead>Dată plată</TableHead>
                    <TableHead>Sumă (RON)</TableHead>
                    <TableHead>Metodă de plată</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observații</TableHead>
                    {!readOnly && <TableHead className="text-right">Acțiuni</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.paymentType}</TableCell>
                      <TableCell>{payment.contributionYear || "-"}</TableCell>
                      <TableCell>{isoDateToDisplay(payment.date)}</TableCell>
                      <TableCell className="font-semibold">{payment.amount.toLocaleString()} RON</TableCell>
                      <TableCell>{payment.method}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}
                        >
                          {payment.status}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{payment.observations || "-"}</TableCell>
                      {!readOnly && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(payment)}
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePayment(payment.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Payment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingPayment ? "Editează Cotizație" : "Adaugă Cotizație"}</DialogTitle>
            <DialogDescription>
              {editingPayment
                ? "Modificați datele cotizației existente"
                : "Completați formularul pentru a adăuga o nouă cotizație"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="date">Dată plată *</Label>
              <DatePickerInput
                value={paymentForm.date}
                onChange={(value) => setPaymentForm({ ...paymentForm, date: value })}
                placeholder="dd.mm.yyyy"
                required={true}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contributionYear">An de cotizație</Label>
              <YearSelect
                value={paymentForm.contributionYear ? Number.parseInt(paymentForm.contributionYear) : undefined}
                onChange={(value) => setPaymentForm({ ...paymentForm, contributionYear: value?.toString() || "" })}
                placeholder="Selectează anul (opțional)"
                fromYear={2000}
                toYear={new Date().getFullYear() + 2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentType">Tip plată *</Label>
              <Select
                value={paymentForm.paymentType}
                onValueChange={(value) => setPaymentForm({ ...paymentForm, paymentType: value as PaymentType })}
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

            <div className="space-y-2">
              <Label htmlFor="amount">Sumă (RON) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder="100.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Metodă de plată *</Label>
              <Select
                value={paymentForm.method}
                onValueChange={(value) => setPaymentForm({ ...paymentForm, method: value })}
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

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={paymentForm.status}
                onValueChange={(value) => setPaymentForm({ ...paymentForm, status: value as PaymentStatus })}
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

            <div className="space-y-2">
              <Label htmlFor="observations">Observații</Label>
              <Textarea
                id="observations"
                value={paymentForm.observations}
                onChange={(e) => setPaymentForm({ ...paymentForm, observations: e.target.value })}
                placeholder="Note opționale despre plată..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Anulează
            </Button>
            <Button onClick={handleSavePayment}>{editingPayment ? "Actualizează" : "Salvează"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
