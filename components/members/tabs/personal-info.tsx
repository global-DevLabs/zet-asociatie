"use client"

import type { Member } from "@/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RANKS, PROFILES, WITHDRAWAL_REASONS, PROVENANCE_OPTIONS } from "@/lib/constants"
import { calculateAge, formatAge } from "@/lib/utils"
import { DatePickerInput } from "@/components/ui/date-picker-input"
import { YearSelect } from "@/components/ui/year-select"
import { useSettings } from "@/lib/settings-store"
import { useEffect } from "react"

interface PersonalInfoTabProps {
  formData: Partial<Member>
  setFormData: (data: Partial<Member>) => void
  readOnly?: boolean
}

export function PersonalInfoTab({ formData, setFormData, readOnly = false }: PersonalInfoTabProps) {
  const { units, getUnitDisplay } = useSettings()

  const handleChange = (field: keyof Member, value: any) => {
    setFormData({ ...formData, [field]: value })
  }

  const age = calculateAge(formData.dateOfBirth)

  const currentYear = new Date().getFullYear()

  useEffect(() => {
    if (formData.status === "Retras" && !formData.withdrawalYear) {
      handleChange("withdrawalYear", currentYear)
    }
  }, [formData.status])

  return (
    <div className="grid gap-4">
      {/* Identificare */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Identificare & Grad</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <Select
              value={formData.status || "Activ"}
              onValueChange={(value) => handleChange("status", value)}
              disabled={readOnly}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Selectează status" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-[9999]">
                <SelectItem value="Activ">Activ</SelectItem>
                <SelectItem value="Retras">Retras</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Nume <span className="text-red-500">*</span>
            </Label>
            <Input
              value={formData.lastName || ""}
              onChange={(e) => handleChange("lastName", e.target.value)}
              placeholder="Popescu"
              className="bg-background border-border"
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Prenume <span className="text-red-500">*</span>
            </Label>
            <Input
              value={formData.firstName || ""}
              onChange={(e) => handleChange("firstName", e.target.value)}
              placeholder="Ion"
              className="bg-background border-border"
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Grad</Label>
            <Select
              value={formData.rank || ""}
              onValueChange={(value) => handleChange("rank", value)}
              disabled={readOnly}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Selectează grad" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-[9999]">
                {RANKS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">CNP</Label>
            <Input
              value={formData.cnp || ""}
              onChange={(e) => handleChange("cnp", e.target.value)}
              placeholder="1234567890123"
              className="bg-background border-border"
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Data Nașterii</Label>
            <DatePickerInput
              value={formData.dateOfBirth || ""}
              onChange={(value) => handleChange("dateOfBirth", value)}
              disabled={readOnly}
              placeholder="dd.mm.yyyy"
              required={false}
            />
            {formData.dateOfBirth && (
              <p className="text-xs text-muted-foreground mt-1">
                Vârstă: <span className="font-medium text-foreground">{formatAge(age)}</span>
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Locul Nașterii</Label>
            <Input
              value={formData.birthplace || ""}
              onChange={(e) => handleChange("birthplace", e.target.value)}
              className="bg-background border-border"
              disabled={readOnly}
            />
          </div>
        </CardContent>
      </Card>

      {formData.status === "Retras" && (
        <Card className="border-0 shadow-sm bg-amber-50/30 border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-amber-900">Informații Retragere</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Motiv retragere <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.withdrawalReason || ""}
                onValueChange={(value) => handleChange("withdrawalReason", value)}
                disabled={readOnly}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selectează motiv" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-[9999]">
                  {WITHDRAWAL_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">An retragere</Label>
              <YearSelect
                value={formData.withdrawalYear}
                onChange={(value) => handleChange("withdrawalYear", value)}
                disabled={readOnly}
                placeholder="Selectează anul"
                fromYear={1990}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Apartenență */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Apartenență & Profil</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Unitate Militară (UM)</Label>
            <Select
              value={formData.unit || ""}
              onValueChange={(value) => handleChange("unit", value)}
              disabled={readOnly}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Selectează UM" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-[9999]">
                {units.map((u) => (
                  <SelectItem key={u.code} value={u.code}>
                    {getUnitDisplay(u.code)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Profil Principal</Label>
            <Select
              value={formData.mainProfile || ""}
              onValueChange={(value) => handleChange("mainProfile", value)}
              disabled={readOnly}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Selectează profil" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-[9999]">
                {PROFILES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Pensionare & Sucursală */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Pensionare & Sucursală</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-sm font-medium">An Pensionare</Label>
            <YearSelect
              value={formData.retirementYear}
              onChange={(value) => handleChange("retirementYear", value)}
              disabled={readOnly}
              placeholder="Selectează anul"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Nr. Decizie</Label>
            <Input
              value={formData.retirementDecisionNumber || ""}
              onChange={(e) => handleChange("retirementDecisionNumber", e.target.value)}
              className="bg-background border-border"
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Nr. Dosar</Label>
            <Input
              value={formData.retirementFileNumber || ""}
              onChange={(e) => handleChange("retirementFileNumber", e.target.value)}
              className="bg-background border-border"
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">An Înscriere Sucursală</Label>
            <YearSelect
              value={formData.branchEnrollmentYear}
              onChange={(value) => handleChange("branchEnrollmentYear", value)}
              disabled={readOnly}
              placeholder="Selectează anul"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Proveniență</Label>
            <Select
              value={formData.provenance || ""}
              onValueChange={(value) => handleChange("provenance", value)}
              disabled={readOnly}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Selectează proveniența" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-[9999]">
                {PROVENANCE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Telefon</Label>
            <Input
              value={formData.phone || ""}
              onChange={(e) => handleChange("phone", e.target.value)}
              className="bg-background border-border"
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Email</Label>
            <Input
              type="email"
              value={formData.email || ""}
              onChange={(e) => handleChange("email", e.target.value)}
              className="bg-background border-border"
              disabled={readOnly}
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label className="text-sm font-medium">Adresă</Label>
            <Textarea
              value={formData.address || ""}
              onChange={(e) => handleChange("address", e.target.value)}
              className="bg-background border-border"
              disabled={readOnly}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
