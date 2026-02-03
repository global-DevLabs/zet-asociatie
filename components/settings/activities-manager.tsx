"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useActivities } from "@/lib/activities-store"
import { Trash2, Plus, Download, Upload, FileDown } from "lucide-react"
import type { ActivityType } from "@/types"
import {
  exportActivityTypesToCSV,
  exportActivityTypesToJSON,
  downloadFile,
  generateFilename,
  importFromCSV,
  importFromJSON,
  generateCSVTemplate,
  generateJSONTemplate,
  type ImportMode,
} from "@/lib/activity-import-export"

interface ActivitiesManagerProps {
  title: string
  description: string
}

export function ActivitiesManager({ title, description }: ActivitiesManagerProps) {
  const { activityTypes, updateActivityTypes, createActivityType, updateActivityType, deleteActivityType } =
    useActivities()
  const { toast } = useToast()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [newActivity, setNewActivity] = useState({ name: "", category: "" })
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importMode, setImportMode] = useState<ImportMode>("merge")
  const [importPreview, setImportPreview] = useState<any[] | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const handleExportCSV = () => {
    const csv = exportActivityTypesToCSV(activityTypes)
    downloadFile(csv, generateFilename("csv"), "text/csv;charset=utf-8")
    toast({
      title: "Export realizat",
      description: "Fișierul CSV a fost descărcat cu succes.",
    })
  }

  const handleExportJSON = () => {
    const json = exportActivityTypesToJSON(activityTypes)
    downloadFile(json, generateFilename("json"), "application/json")
    toast({
      title: "Export realizat",
      description: "Fișierul JSON a fost descărcat cu succes.",
    })
  }

  const handleDownloadTemplate = (format: "csv" | "json") => {
    if (format === "csv") {
      downloadFile(generateCSVTemplate(), "template-activitati.csv", "text/csv;charset=utf-8")
    } else {
      downloadFile(generateJSONTemplate(), "template-activitati.json", "application/json")
    }
    toast({
      title: "Template descărcat",
      description: `Template-ul ${format.toUpperCase()} a fost descărcat.`,
    })
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportFile(file)
    setImportPreview(null)

    // Read and preview file
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      try {
        let result
        if (file.name.endsWith(".csv")) {
          result = importFromCSV(content, activityTypes, importMode)
        } else if (file.name.endsWith(".json")) {
          result = importFromJSON(content, activityTypes, importMode)
        } else {
          toast({
            title: "Format invalid",
            description: "Doar fișiere CSV și JSON sunt acceptate.",
            variant: "destructive",
          })
          return
        }

        if (result.data) {
          setImportPreview(result.data.slice(0, 10))
        }
      } catch (error) {
        toast({
          title: "Eroare la citirea fișierului",
          description: "Nu s-a putut citi conținutul fișierului.",
          variant: "destructive",
        })
      }
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!importFile) return

    setIsImporting(true)
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      try {
        let result
        if (importFile.name.endsWith(".csv")) {
          result = importFromCSV(content, activityTypes, importMode)
        } else if (importFile.name.endsWith(".json")) {
          result = importFromJSON(content, activityTypes, importMode)
        }

        if (result && result.success && result.data) {
          // Create backup before replace
          if (importMode === "replace") {
            const backup = exportActivityTypesToJSON(activityTypes)
            downloadFile(backup, `backup-${generateFilename("json")}`, "application/json")
          }

          updateActivityTypes(result.data)
          toast({
            title: "Import realizat cu succes",
            description: `Adăugate: ${result.added}, Actualizate: ${result.updated}, Omise: ${result.skipped}`,
          })
          setIsImportModalOpen(false)
          setImportFile(null)
          setImportPreview(null)
        } else if (result && result.errors.length > 0) {
          toast({
            title: "Import cu erori",
            description: `${result.errors.length} erori găsite. Prima eroare: ${result.errors[0].message}`,
            variant: "destructive",
          })
        }
      } catch (error) {
        toast({
          title: "Eroare la import",
          description: "Nu s-a putut importa fișierul.",
          variant: "destructive",
        })
      } finally {
        setIsImporting(false)
      }
    }
    reader.readAsText(importFile)
  }

  const handleAdd = () => {
    if (!newActivity.name.trim()) {
      toast({
        title: "Eroare",
        description: "Numele activității este obligatoriu.",
        variant: "destructive",
      })
      return
    }

    createActivityType({
      name: newActivity.name.trim(),
      category: newActivity.category.trim() || undefined,
      is_active: true,
    })

    toast({
      title: "Activitate adăugată",
      description: `${newActivity.name} a fost adăugată cu succes.`,
    })

    setNewActivity({ name: "", category: "" })
    setIsAddModalOpen(false)
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Sigur doriți să ștergeți activitatea "${name}"?`)) {
      deleteActivityType(id)
      toast({
        title: "Activitate ștearsă",
        description: `${name} a fost ștearsă.`,
      })
    }
  }

  const handleToggleActive = (type: ActivityType) => {
    updateActivityType(type.id, { is_active: !type.is_active })
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adaugă
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJSON}>
              <Download className="h-4 w-4 mr-2" />
              JSON
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Denumire</TableHead>
              <TableHead>Categorie</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activityTypes.map((type) => (
              <TableRow key={type.id}>
                <TableCell className="font-medium">{type.name}</TableCell>
                <TableCell>{type.category || "—"}</TableCell>
                <TableCell>
                  <Badge
                    variant={type.is_active ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => handleToggleActive(type)}
                  >
                    {type.is_active ? "Activ" : "Inactiv"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(type.id, type.name)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {activityTypes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nu există activități definite. Adaugă prima activitate sau importă din fișier.
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adaugă Activitate Nouă</DialogTitle>
            <DialogDescription>Completează detaliile activității noi.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Denumire *</Label>
              <Input
                id="name"
                value={newActivity.name}
                onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                placeholder="Ex: Sport"
              />
            </div>
            <div>
              <Label htmlFor="category">Categorie</Label>
              <Input
                id="category"
                value={newActivity.category}
                onChange={(e) => setNewActivity({ ...newActivity, category: e.target.value })}
                placeholder="Ex: Fizic"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Anulează
            </Button>
            <Button onClick={handleAdd}>Adaugă</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Activități</DialogTitle>
            <DialogDescription>Importă o listă de activități din fișier CSV sau JSON.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Descarcă Template</Label>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={() => handleDownloadTemplate("csv")}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Template CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDownloadTemplate("json")}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Template JSON
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="file">Selectează Fișier</Label>
              <Input id="file" type="file" accept=".csv,.json" onChange={handleFileSelect} className="mt-2" />
            </div>

            <div>
              <Label htmlFor="mode">Mod Import</Label>
              <Select value={importMode} onValueChange={(v) => setImportMode(v as ImportMode)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merge">Merge (adaugă și actualizează)</SelectItem>
                  <SelectItem value="replace">Replace (înlocuiește tot)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                {importMode === "merge"
                  ? "Adaugă elemente noi și actualizează cele existente"
                  : "Înlocuiește întreaga listă cu cea din fișier"}
              </p>
            </div>

            {importPreview && (
              <div>
                <Label>Preview (primele 10 rânduri)</Label>
                <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Denumire</TableHead>
                        <TableHead>Categorie</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreview.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.category || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={item.is_active ? "default" : "secondary"}>
                              {item.is_active ? "Activ" : "Inactiv"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsImportModalOpen(false)
                setImportFile(null)
                setImportPreview(null)
              }}
            >
              Anulează
            </Button>
            <Button onClick={handleImport} disabled={!importFile || isImporting}>
              {isImporting ? "Importare..." : "Importă"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
