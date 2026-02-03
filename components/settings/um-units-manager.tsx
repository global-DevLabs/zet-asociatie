"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Edit2, Plus, Trash2 } from "lucide-react"
import { useUMUnits } from "@/lib/um-units-store"
import { useAuth } from "@/lib/auth-context"
import { Badge } from "@/components/ui/badge"

export function UMUnitsManager() {
  const { units, loading, addUnit, updateUnit, deleteUnit } = useUMUnits()
  const { hasPermission } = useAuth()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<{ id: string; code: string; name: string } | null>(null)
  const [newCode, setNewCode] = useState("")
  const [newName, setNewName] = useState("")
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const canEdit = hasPermission("settings")

  const filteredUnits = units.filter(
    (u) =>
      u.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const handleAdd = async () => {
    if (!newCode.trim()) {
      setError("Codul UM este obligatoriu")
      return
    }

    const result = await addUnit(newCode, newName || undefined)
    if (result.success) {
      setNewCode("")
      setNewName("")
      setError("")
      setIsAddOpen(false)
    } else {
      setError(result.error || "Eroare la adăugarea UM-ului")
    }
  }

  const handleEdit = async () => {
    if (!editingUnit) return

    const success = await updateUnit(editingUnit.id, {
      name: editingUnit.name || undefined,
    })

    if (success) {
      setEditingUnit(null)
      setIsEditOpen(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Sigur doriți să ștergeți acest UM? Acțiunea este permanentă.")) return
    await deleteUnit(id)
  }

  if (loading) {
    return (
      <Card className="border-0 shadow-md rounded-xl">
        <CardContent className="py-10 text-center text-muted-foreground">Se încarcă unitățile militare...</CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-md rounded-xl">
      <CardHeader className="pb-5 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold tracking-tight">Unități Militare (UM)</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              Gestionează codurile UM și denumirile desfășurate
            </CardDescription>
          </div>
          {canEdit && (
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adaugă UM
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adaugă Unitate Militară</DialogTitle>
                  <DialogDescription>
                    Introduceți codul UM (ex: "0754" sau "UM 0754") și opțional o denumire desfășurată.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>
                      Cod UM <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="0754 sau UM 0754"
                      value={newCode}
                      onChange={(e) => {
                        setNewCode(e.target.value)
                        setError("")
                      }}
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">Codul va fi formatat automat ca "UM XXXX"</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Denumire Desfășurată (opțional)</Label>
                    <Input
                      placeholder="ex: Baza militară București"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddOpen(false)
                        setNewCode("")
                        setNewName("")
                        setError("")
                      }}
                    >
                      Anulează
                    </Button>
                    <Button onClick={handleAdd}>Adaugă</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Caută după cod sau denumire..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Badge variant="secondary" className="ml-auto">
            {filteredUnits.length} {filteredUnits.length === 1 ? "UM" : "UM-uri"}
          </Badge>
        </div>

        <div className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/50">
                <TableHead className="font-semibold text-foreground/90 h-12 w-[180px]">Cod UM</TableHead>
                <TableHead className="font-semibold text-foreground/90">Denumire Desfășurată</TableHead>
                {canEdit && (
                  <TableHead className="w-[120px] text-right font-semibold text-foreground/90">Acțiuni</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUnits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 3 : 2} className="text-center py-8 text-muted-foreground">
                    {searchQuery
                      ? "Niciun UM găsit pentru criteriile de căutare."
                      : "Nu există UM-uri în baza de date."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUnits.map((unit) => (
                  <TableRow
                    key={unit.id}
                    className="hover:bg-muted/30 transition-colors duration-150 h-14 border-b border-border/30"
                  >
                    <TableCell className="py-3">
                      <span className="text-sm font-semibold tracking-tight">{unit.code}</span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-sm text-muted-foreground">
                        {unit.name || <em className="text-muted-foreground/50">Fără denumire</em>}
                      </span>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right py-3">
                        <div className="flex justify-end gap-1.5">
                          <Dialog open={isEditOpen && editingUnit?.id === unit.id} onOpenChange={setIsEditOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 hover:bg-muted transition-all duration-150"
                                onClick={() => setEditingUnit({ id: unit.id, code: unit.code, name: unit.name || "" })}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Editează UM: {unit.code}</DialogTitle>
                                <DialogDescription>
                                  Actualizați denumirea desfășurată pentru acest cod UM.
                                </DialogDescription>
                              </DialogHeader>
                              {editingUnit && (
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>Cod UM</Label>
                                    <Input value={editingUnit.code} disabled className="bg-muted" />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Denumire Desfășurată</Label>
                                    <Input
                                      placeholder="Adaugă denumire..."
                                      value={editingUnit.name}
                                      onChange={(e) => setEditingUnit({ ...editingUnit, name: e.target.value })}
                                    />
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                                      Anulează
                                    </Button>
                                    <Button onClick={handleEdit}>Salvează</Button>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-150"
                            onClick={() => handleDelete(unit.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
