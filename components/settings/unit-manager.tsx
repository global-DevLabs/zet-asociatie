"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit2, Save, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { UnitItem } from "@/types"

interface UnitManagerProps {
  title: string
  description: string
  items: UnitItem[]
  onUpdate: (items: UnitItem[]) => void
}

export function UnitManager({ title, description, items, onUpdate }: UnitManagerProps) {
  const [localItems, setLocalItems] = useState(items)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editDescription, setEditDescription] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    setLocalItems(items)
  }, [items])

  const startEdit = (index: number, description = "") => {
    setEditingIndex(index)
    setEditDescription(description)
  }

  const saveEdit = () => {
    if (editingIndex !== null) {
      const updatedItems = [...localItems]
      updatedItems[editingIndex] = {
        ...updatedItems[editingIndex],
        description: editDescription.trim() || undefined,
      }
      setLocalItems(updatedItems)
      onUpdate(updatedItems)
      setEditingIndex(null)
      toast({
        title: "Descriere actualizată",
        description: "Descrierea UM a fost actualizată cu succes.",
      })
    }
  }

  return (
    <Card className="border-0 shadow-md rounded-xl">
      <CardHeader className="pb-5 border-b border-border/50">
        <CardTitle className="text-base font-bold tracking-tight">{title}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground mt-1">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        <div className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/50">
                <TableHead className="font-semibold text-foreground/90 h-12 w-[140px]">Cod UM</TableHead>
                <TableHead className="font-semibold text-foreground/90">Denumire Desfășurată</TableHead>
                <TableHead className="w-[100px] text-right font-semibold text-foreground/90">Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localItems.map((item, index) => (
                <TableRow
                  key={item.code}
                  className="hover:bg-muted/30 transition-colors duration-150 h-14 border-b border-border/30"
                >
                  <TableCell className="py-3">
                    <span className="text-sm font-semibold tracking-tight">{item.code}</span>
                  </TableCell>
                  <TableCell className="py-3">
                    {editingIndex === index ? (
                      <Input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Adaugă denumire (opțional)..."
                        className="h-9 bg-background border-border shadow-sm"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {item.description || <em className="text-muted-foreground/50">Fără denumire</em>}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right py-3">
                    {editingIndex === index ? (
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-all duration-150"
                          onClick={saveEdit}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
                          onClick={() => setEditingIndex(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 hover:bg-muted transition-all duration-150"
                          onClick={() => startEdit(index, item.description)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
