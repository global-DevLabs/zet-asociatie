"use client"

import type React from "react"

import { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, Download, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useActivities } from "@/lib/activities-store"
import { useMembers } from "@/lib/members-store"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

interface ImportParticipantsModalProps {
  open: boolean
  onClose: () => void
  activityId: string
  activityTitle: string
}

interface ParsedRow {
  member_code?: string
  member_id?: string
  member_name?: string
  role?: string
  notes?: string
  rowNumber: number
  matchedMemberId?: string
}

interface ValidationResult {
  valid: ParsedRow[]
  duplicates: ParsedRow[]
  missing: ParsedRow[]
  invalid: ParsedRow[]
}

export function ImportParticipantsModal({ open, onClose, activityId, activityTitle }: ImportParticipantsModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { addParticipants, getParticipants } = useActivities()
  const { members } = useMembers()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setIsProcessing(true)
    setValidation(null)

    try {
      const text = await selectedFile.text()
      const lines = text.split(/\r?\n/).filter((l) => l.trim())

      if (lines.length === 0) {
        throw new Error("Fișier gol")
      }

      // Parse header - detect delimiter
      const firstLine = lines[0]
      const delimiter = firstLine.includes(";") ? ";" : ","
      
      const header = firstLine.split(delimiter).map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase())
      const memberCodeIdx = header.findIndex(
        (h) => h.includes("member_code") || h.includes("cod_membru") || h.includes("cod membru"),
      )
      const memberIdIdx = header.findIndex((h) => h.includes("member_id"))
      const memberNameIdx = header.findIndex(
        (h) => h.includes("nume") || h.includes("name") || h.includes("membru"),
      )
      const roleIdx = header.findIndex((h) => h.includes("role") || h.includes("rol"))
      const notesIdx = header.findIndex(
        (h) => h.includes("note") || h.includes("observatii"),
      )

      if (memberCodeIdx === -1 && memberIdIdx === -1 && memberNameIdx === -1) {
        throw new Error("CSV-ul trebuie să conțină coloana 'member_code', 'member_id' sau 'nume'")
      }

      // Parse data rows
      const parsed: ParsedRow[] = lines.slice(1).map((line, idx) => {
        const cells = line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""))
        return {
          member_code: memberCodeIdx !== -1 ? cells[memberCodeIdx] : undefined,
          member_id: memberIdIdx !== -1 ? cells[memberIdIdx] : undefined,
          member_name: memberNameIdx !== -1 ? cells[memberNameIdx] : undefined,
          role: roleIdx !== -1 ? cells[roleIdx] : undefined,
          notes: notesIdx !== -1 ? cells[notesIdx] : undefined,
          rowNumber: idx + 2, // +2 because 1-indexed and skip header
        }
      })

      // Validate
      const currentParticipants = getParticipants(activityId)
      const currentMemberIds = new Set(currentParticipants.map((p) => p.member_id))

      const valid: ParsedRow[] = []
      const duplicates: ParsedRow[] = []
      const missing: ParsedRow[] = []
      const invalid: ParsedRow[] = []

      // Helper to normalize text for matching
      const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()

      for (const row of parsed) {
        // Find member by member_id, member_code, or name
        let member = null
        
        if (row.member_id) {
          member = members.find((m) => m.id === row.member_id)
        }
        
        if (!member && row.member_code) {
          member = members.find((m) => m.memberCode === row.member_code)
        }
        
        // Try matching by name if no ID/code match
        if (!member && row.member_name) {
          const searchName = normalize(row.member_name)
          member = members.find((m) => {
            const fullName = normalize(`${m.lastName} ${m.firstName}`)
            const reverseName = normalize(`${m.firstName} ${m.lastName}`)
            return fullName.includes(searchName) || reverseName.includes(searchName) || searchName.includes(fullName) || searchName.includes(reverseName)
          })
        }

        if (!member) {
          missing.push(row)
        } else if (currentMemberIds.has(member.id)) {
          duplicates.push({ ...row, matchedMemberId: member.id })
        } else {
          valid.push({ ...row, matchedMemberId: member.id })
        }
      }

      setValidation({ valid, duplicates, missing, invalid })
    } catch (error) {
      toast({
        title: "Eroare la citire",
        description: error instanceof Error ? error.message : "Fișierul nu poate fi citit",
        variant: "destructive",
      })
      setFile(null)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = async () => {
    if (!validation || validation.valid.length === 0) return

    setIsProcessing(true)

    try {
      const memberIds = validation.valid.map((v) => v.matchedMemberId!).filter(Boolean)
      await addParticipants(activityId, memberIds)

      toast({
        title: "Import reușit",
        description: `${memberIds.length} participanți adăugați cu succes`,
      })

      onClose()
      setFile(null)
      setValidation(null)
    } catch (error) {
      toast({
        title: "Import eșuat",
        description: "A apărut o eroare la importarea participanților",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadTemplate = () => {
    const template = [
      "cod_membru,nume,rol,observatii",
      "01001,Popescu Ion,Participant,",
      "01002,Ionescu Maria,Organizator,Responsabil logistică",
      ",Georgescu Vasile,Participant,Poate fi identificat doar după nume",
    ].join("\r\n")

    const bom = "\uFEFF"
    const blob = new Blob([bom + template], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "template-participanti.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Participanți (CSV/XLSX)</DialogTitle>
          <DialogDescription>{activityTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Fișierul trebuie să conțină cel puțin una din coloanele: <code className="text-xs">cod_membru</code> sau{" "}
              <code className="text-xs">nume</code>. Coloanele <code className="text-xs">rol</code> și{" "}
              <code className="text-xs">observatii</code> sunt opționale. Acceptă CSV exportat din Excel (UTF-8 sau ANSI).
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Descarcă template CSV
            </Button>
          </div>

          <div>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx" onChange={handleFileSelect} className="hidden" />
            <Button onClick={() => fileInputRef.current?.click()} className="w-full" variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              {file ? file.name : "Selectează fișier CSV"}
            </Button>
          </div>

          {validation && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  {validation.valid.length} valid
                </Badge>
                {validation.duplicates.length > 0 && (
                  <Badge variant="secondary">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    {validation.duplicates.length} duplicate
                  </Badge>
                )}
                {validation.missing.length > 0 && (
                  <Badge variant="destructive">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    {validation.missing.length} lipsă
                  </Badge>
                )}
              </div>

              {validation.missing.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {validation.missing.length} membri nu au fost găsiți:{" "}
                    {validation.missing
                      .slice(0, 3)
                      .map((m) => m.member_code)
                      .join(", ")}
                    {validation.missing.length > 3 && ` +${validation.missing.length - 3} mai mult`}
                  </AlertDescription>
                </Alert>
              )}

              {validation.duplicates.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {validation.duplicates.length} membri sunt deja participanți și vor fi ignorați
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Anulează
          </Button>
          <Button onClick={handleImport} disabled={isProcessing || !validation || validation.valid.length === 0}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Se procesează...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Importă {validation && validation.valid.length > 0 && `(${validation.valid.length})`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
