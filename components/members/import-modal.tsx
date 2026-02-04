"use client"

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
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { parseCSV, validateMemberData, type ImportResult } from "@/lib/import-utils"
import { useMembers } from "@/lib/members-store"

interface ImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportModal({ open, onOpenChange }: ImportModalProps) {
  const { refreshMembers } = useMembers()
  const [file, setFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<ImportResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error("Te rog selectează un fișier CSV")
      return
    }

    setFile(selectedFile)
    setParseResult(null)
    setIsProcessing(true)

    try {
      // Parse and validate the CSV file
      const result = await parseCSV(selectedFile)
      setParseResult(result)

      if (result.errors.length > 0) {
        toast.warning(`Fișierul are ${result.errors.length} erori de validare`)
      } else {
        toast.success(`Fișierul conține ${result.validMembers.length} membri valizi`)
      }
    } catch (error) {
      console.error("Parse error:", error)
      toast.error("Eroare la procesarea fișierului")
      setFile(null)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = async () => {
    if (!parseResult || parseResult.validMembers.length === 0) {
      toast.error("Nu există membri valizi pentru import")
      return
    }

    setIsImporting(true)

    try {
      const response = await fetch("/api/members/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ members: parseResult.validMembers }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Import failed")
      }

      toast.success(`Import finalizat: ${data.imported} membri adăugați`)
      
      // Refresh the members list
      await refreshMembers()
      
      // Close modal and reset
      onOpenChange(false)
      resetModal()
    } catch (error) {
      console.error("Import error:", error)
      toast.error("Eroare la importul membrilor")
    } finally {
      setIsImporting(false)
    }
  }

  const resetModal = () => {
    setFile(null)
    setParseResult(null)
    setIsProcessing(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleDownloadTemplate = () => {
    const headers = [
      "ID Membru",
      "Nume",
      "Prenume",
      "Data Nașterii",
      "CNP",
      "Grad",
      "UM",
      "Profil Principal",
      "Status",
      "An Înscriere",
      "An Pensionare",
      "Proveniență",
      "Telefon",
      "Email",
      "Adresă"
    ].join(",")
    
    const example = [
      "01234",
      "Popescu",
      "Ion",
      "15.03.1975",
      "1750315123456",
      "Colonel",
      "Unitatea Militară Pitești",
      "Activ în rezervă",
      "Activ",
      "2015",
      "2020",
      "Prin pensionare",
      "0712345678",
      "ion.popescu@email.com",
      "Str. Exemplu, Nr. 1, Pitești"
    ].join(",")

    const csvContent = `${headers}\n${example}`
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "template_import_membri.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success("Șablon descărcat")
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetModal()
      onOpenChange(open)
    }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Listă Membri</DialogTitle>
          <DialogDescription>
            Încarcă un fișier CSV pentru a importa membri în masă
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Template Download */}
          <div className="bg-muted/50 border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold mb-1">Șablon CSV</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Descarcă șablonul pentru a vedea formatul corect al fișierului CSV
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  type="button"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Descarcă Șablon
                </Button>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Selectează Fișier CSV</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium mb-1">
                  {file ? file.name : "Selectează sau trage fișierul CSV aici"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Format acceptat: CSV (.csv)
                </p>
              </label>
            </div>
          </div>

          {/* Processing Status */}
          {isProcessing && (
            <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Procesare fișier...
            </div>
          )}

          {/* Parse Results */}
          {parseResult && !isProcessing && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Rezultate Validare</Label>
              
              {/* Valid Members */}
              {parseResult.validMembers.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-emerald-900 mb-1">
                        {parseResult.validMembers.length} Membri Valizi
                      </h4>
                      <p className="text-sm text-emerald-700">
                        Acești membri pot fi importați în sistem
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Errors */}
              {parseResult.errors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-amber-900 mb-2">
                        {parseResult.errors.length} Erori Detectate
                      </h4>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {parseResult.errors.slice(0, 10).map((error, idx) => (
                          <p key={idx} className="text-xs text-amber-700">
                            Linia {error.row}: {error.message}
                          </p>
                        ))}
                        {parseResult.errors.length > 10 && (
                          <p className="text-xs text-amber-600 font-medium mt-2">
                            ... și încă {parseResult.errors.length - 10} erori
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              resetModal()
            }}
            disabled={isImporting}
          >
            Anulează
          </Button>
          <Button
            onClick={handleImport}
            disabled={
              !parseResult ||
              parseResult.validMembers.length === 0 ||
              isImporting
            }
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importare...
              </>
            ) : (
              `Importă ${parseResult?.validMembers.length || 0} Membri`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
