"use client"

import type { Member } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface NeedsTabProps {
  formData: Partial<Member>
  setFormData: (data: Partial<Member>) => void
  readOnly?: boolean
}

export function NeedsTab({ formData, setFormData, readOnly = false }: NeedsTabProps) {
  const handleChange = (field: keyof Member, value: any) => {
    setFormData({ ...formData, [field]: value })
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Nevoi și Solicitări</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Nevoi / Solicitări către Sucursală</Label>
            <Textarea
              value={formData.branchNeeds || ""}
              onChange={(e) => handleChange("branchNeeds", e.target.value)}
              className="min-h-[100px] bg-background border-border"
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label>Nevoi / Solicitări către Fundația "Solidaritate Patrie și Onoare"</Label>
            <Textarea
              value={formData.foundationNeeds || ""}
              onChange={(e) => handleChange("foundationNeeds", e.target.value)}
              className="min-h-[100px] bg-background border-border"
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label>Alte Nevoi / Solicitări</Label>
            <Textarea
              value={formData.otherNeeds || ""}
              onChange={(e) => handleChange("otherNeeds", e.target.value)}
              className="min-h-[100px] bg-background border-border"
              disabled={readOnly}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
