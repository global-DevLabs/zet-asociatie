"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Download, FileText } from "lucide-react"
import { useMembers } from "@/lib/members-store"
import { useMemberGroups } from "@/lib/member-groups-store"
import { useToast } from "@/hooks/use-toast"
import {
  parseGroupMembersCSV,
  parseGroupMembersXLSX,
  downloadGroupMembersTemplate,
  type GroupImportResult,
} from "@/lib/group-import-export"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ImportMembersModalProps {
  isOpen: boolean
  onClose: () => void
  groupId: string
  groupName: string
}

export function ImportMembersModal({ isOpen, onClose, groupId, groupName }: ImportMembersModalProps) {
  const { members } = useMembers()
  const { bulkAddMembersToGroup } = useMemberGroups()
  const { toast } = useToast()
  const [mode, setMode] = useState<"append" | "replace">("append")
  const [file, setFile] = useState<File | null>(null)
  const [previewResult, setPreviewResult] = useState<GroupImportResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)

    // Parse and preview
    try {
      let result: GroupImportResult

      if (selectedFile.name.endsWith(".csv")) {
        const text = await selectedFile.text()
        result = parseGroupMembersCSV(text, members)
      } else if (selectedFile.name.endsWith(".xlsx")) {
        const buffer = await selectedFile.arrayBuffer()
        result = parseGroupMembersXLSX(buffer, members)
      } else {
        toast({
          title: "Format invalid",
          description: "Te rugăm să încarci un fișier CSV sau XLSX",
          variant: "destructive",
        })
        return
      }

      setPreviewResult(result)
    } catch (error) {
      toast({
        title: "Eroare la parsare",
        description: "Nu am putut citi fișierul. Verifică formatul.",
        variant: "destructive",
      })
    }
  }

  const handleImport = async () => {
    if (!previewResult || previewResult.validMemberIds.length === 0) {
      toast({
        title: "Eroare",
        description: "Nu există membri valizi de importat",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      await bulkAddMembersToGroup(groupId, previewResult.validMemberIds, mode)

      toast({
        title: "Import reușit",
        description: `${previewResult.added} ${previewResult.added === 1 ? "membru adăugat" : "membri adăugați"} în ${groupName}`,
      })

      handleClose()
    } catch (error) {
      toast({
        title: "Eroare",
        description: "Import eșuat. Te rugăm să încerci din nou.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setPreviewResult(null)
    setMode("append")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import membri în {groupName}</DialogTitle>
          <DialogDescription>Încarcă un fișier CSV sau XLSX cu ID-urile membrilor de adăugat</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Mode Selection */}
          <div className="space-y-2">
            <Label>Mod import</Label>
            <RadioGroup value={mode} onValueChange={(v: any) => setMode(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="append" id="append" />
                <Label htmlFor="append" className="font-normal cursor-pointer">
                  Adaugă membri noi (păstrează membrii existenți)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="replace" id="replace" />
                <Label htmlFor="replace" className="font-normal cursor-pointer">
                  Înlocuiește toți membrii (șterge și re-importă)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file">Fișier</Label>
            <div className="flex gap-2">
              <input id="file" type="file" accept=".csv,.xlsx" onChange={handleFileChange} className="flex-1 text-sm" />
              <Button variant="outline" size="sm" onClick={() => downloadGroupMembersTemplate("csv")}>
                <Download className="h-4 w-4 mr-2" />
                Template CSV
              </Button>
            </div>
          </div>

          {/* Preview */}
          {previewResult && (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Preview import:</p>
                  <p>✅ Membri valizi: {previewResult.added}</p>
                  {previewResult.skipped > 0 && <p>⚠️ Ignorați: {previewResult.skipped}</p>}
                  {previewResult.errors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="font-medium text-destructive">Erori:</p>
                      <ul className="list-disc list-inside text-sm">
                        {previewResult.errors.slice(0, 5).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                        {previewResult.errors.length > 5 && <li>...și încă {previewResult.errors.length - 5} erori</li>}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Anulează
          </Button>
          <Button
            onClick={handleImport}
            disabled={!previewResult || previewResult.validMemberIds.length === 0 || isProcessing}
          >
            {isProcessing ? "Se importă..." : `Importă ${previewResult?.added || 0} membri`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
