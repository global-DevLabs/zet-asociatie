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
import { Label } from "@/components/ui/label"
import { Loader2, Upload, Download, AlertCircle, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  importActivitiesFromCSV,
  generateActivitiesCSVTemplate,
  downloadFile,
  type ImportActivityResult,
} from "@/lib/activities-export-import"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ImportModalProps {
  open: boolean
  onClose: () => void
  onImport: (activities: any[]) => Promise<void>
  getTypeIdByName: (name: string) => string | undefined
}

export function ImportModal({ open, onClose, onImport, getTypeIdByName }: ImportModalProps) {
  const [isImporting, setIsImporting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<ImportActivityResult | null>(null)
  const [previewData, setPreviewData] = useState<string[][]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".csv")) {
      toast({
        title: "Fișier invalid",
        description: "Vă rugăm selectați un fișier CSV",
        variant: "destructive",
      })
      return
    }

    setSelectedFile(file)
    setImportResult(null)

    // Preview first 10 rows
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      const rows = content
        .split("\n")
        .slice(0, 10)
        .map((row) => row.split(",").map((cell) => cell.trim()))
      setPreviewData(rows)
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!selectedFile) return

    setIsImporting(true)

    try {
      const content = await selectedFile.text()
      const result = importActivitiesFromCSV(content, getTypeIdByName)

      setImportResult(result)

      if (result.success && result.activities && result.activities.length > 0) {
        await onImport(result.activities)

        toast({
          title: "Import reușit",
          description: `Au fost importate ${result.added} activități`,
        })

        // Close after successful import
        setTimeout(() => {
          onClose()
        }, 1500)
      } else if (result.errors.length > 0) {
        toast({
          title: "Import cu erori",
          description: `${result.errors.length} erori detectate. Verificați detaliile.`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Import failed:", error)
      toast({
        title: "Import eșuat",
        description: "A apărut o eroare la importarea fișierului",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleDownloadTemplate = () => {
    const template = generateActivitiesCSVTemplate()
    downloadFile(template, "template-activitati.csv", "text/csv;charset=utf-8")

    toast({
      title: "Template descărcat",
      description: "Completați template-ul și încărcați-l pentru import",
    })
  }

  const handleReset = () => {
    setSelectedFile(null)
    setImportResult(null)
    setPreviewData([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          handleReset()
        }
        onClose()
      }}
    >
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Importă Activități</DialogTitle>
          <DialogDescription>
            Încarcă un fișier CSV cu activități noi. Descarcă template-ul pentru format corect.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Download Template */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div>
              <p className="text-sm font-medium">Template CSV</p>
              <p className="text-xs text-muted-foreground">Descarcă și completează template-ul</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Descarcă
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Încarcă fișier CSV</Label>
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1">
                <Upload className="mr-2 h-4 w-4" />
                {selectedFile ? selectedFile.name : "Selectează fișier"}
              </Button>
              {selectedFile && (
                <Button variant="ghost" size="icon" onClick={handleReset}>
                  ×
                </Button>
              )}
            </div>
          </div>

          {/* Preview */}
          {previewData.length > 0 && !importResult && (
            <div className="space-y-2">
              <Label>Preview (primele 10 rânduri)</Label>
              <ScrollArea className="h-32 w-full rounded-md border bg-muted/30 p-2">
                <div className="text-xs font-mono space-y-1">
                  {previewData.map((row, i) => (
                    <div key={i} className="whitespace-nowrap">
                      {row.join(" | ")}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="space-y-3">
              {importResult.success ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription>Import reușit: {importResult.added} activități adăugate</AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{importResult.errors.length} erori detectate</AlertDescription>
                </Alert>
              )}

              {importResult.errors.length > 0 && (
                <ScrollArea className="h-40 w-full rounded-md border p-3">
                  <div className="space-y-2">
                    {importResult.errors.map((error, i) => (
                      <div key={i} className="text-sm">
                        <span className="font-medium">Rândul {error.row}</span>
                        {error.field && <span className="text-muted-foreground"> ({error.field})</span>}:{" "}
                        {error.message}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {/* Info */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900">
            <p className="font-medium mb-1">Format așteptat:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li>type, title, date (DD.MM.YYYY), location</li>
              <li>Tipul activității trebuie să existe în dicționar</li>
              <li>Data în format DD.MM.YYYY (ex: 15.01.2025)</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              handleReset()
              onClose()
            }}
            disabled={isImporting}
          >
            {importResult?.success ? "Închide" : "Anulează"}
          </Button>
          {!importResult?.success && (
            <Button onClick={handleImport} disabled={!selectedFile || isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Se importă...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importă
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
