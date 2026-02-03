"use client"

import type { Member, YesNo } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ObservationsTabProps {
  formData: Partial<Member>
  setFormData: (data: Partial<Member>) => void
  readOnly?: boolean
}

export function ObservationsTab({ formData, setFormData, readOnly = false }: ObservationsTabProps) {
  const handleChange = (field: keyof Member, value: any) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleFoundationStatusChange = (value: YesNo) => {
    handleChange("foundationMemberStatus", value)
    if (value === "Nu") {
      handleChange("foundationRole", undefined)
    }
  }

  const handleWorkplaceChange = (value: YesNo) => {
    handleChange("hasCurrentWorkplace", value)
    if (value === "Nu") {
      handleChange("currentWorkplace", undefined)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Observații și Alte Informații</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Status Membru CAR</Label>
              <Select
                value={formData.carMemberStatus || ""}
                onValueChange={(value) => handleChange("carMemberStatus", value)}
                disabled={readOnly}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selectează..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="Da">Da</SelectItem>
                  <SelectItem value="Nu">Nu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Statut Membru Fundație</Label>
              <Select
                value={formData.foundationMemberStatus || ""}
                onValueChange={handleFoundationStatusChange}
                disabled={readOnly}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selectează..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="Da">Da</SelectItem>
                  <SelectItem value="Nu">Nu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.foundationMemberStatus === "Da" && (
            <div className="space-y-2">
              <Label>Rol în Fundație</Label>
              <Select
                value={formData.foundationRole || ""}
                onValueChange={(value) => handleChange("foundationRole", value)}
                disabled={readOnly}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selectează rol..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="Beneficiar program">Beneficiar program</SelectItem>
                  <SelectItem value="Voluntar">Voluntar</SelectItem>
                  <SelectItem value="Altul">Altul</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Are Loc de Muncă Actual?</Label>
            <Select
              value={formData.hasCurrentWorkplace || ""}
              onValueChange={handleWorkplaceChange}
              disabled={readOnly}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Selectează..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="Da">Da</SelectItem>
                <SelectItem value="Nu">Nu</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.hasCurrentWorkplace === "Da" && (
            <div className="space-y-2">
              <Label>Loc de muncă actual</Label>
              <Input
                value={formData.currentWorkplace || ""}
                onChange={(e) => handleChange("currentWorkplace", e.target.value)}
                className="bg-background border-border"
                placeholder="Introduceți locul de muncă..."
                disabled={readOnly}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Alte Observații Relevante</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.otherObservations || ""}
            onChange={(e) => handleChange("otherObservations", e.target.value)}
            className="min-h-[150px] bg-background border-border resize-y"
            placeholder="Introduceți observații relevante..."
            disabled={readOnly}
          />
        </CardContent>
      </Card>
    </div>
  )
}
