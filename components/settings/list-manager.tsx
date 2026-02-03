"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Edit2, Save, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ListManagerProps {
  title: string
  description: string
  items: string[]
  onUpdate: (items: string[]) => void
}

export function ListManager({ title, description, items, onUpdate }: ListManagerProps) {
  const [localItems, setLocalItems] = useState(items)
  const [newItem, setNewItem] = useState("")
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    setLocalItems(items)
  }, [items])

  const handleAdd = () => {
    if (newItem.trim()) {
      const updatedItems = [...localItems, newItem.trim()]
      setLocalItems(updatedItems)
      onUpdate(updatedItems)
      setNewItem("")
      toast({
        title: "Element adăugat",
        description: "Noul element a fost adăugat cu succes.",
      })
    }
  }

  const handleDelete = (index: number) => {
    const updatedItems = localItems.filter((_, i) => i !== index)
    setLocalItems(updatedItems)
    onUpdate(updatedItems)
    toast({
      title: "Element șters",
      description: "Elementul a fost șters cu succes.",
    })
  }

  const startEdit = (index: number, value: string) => {
    setEditingIndex(index)
    setEditValue(value)
  }

  const saveEdit = () => {
    if (editingIndex !== null && editValue.trim()) {
      const updatedItems = [...localItems]
      updatedItems[editingIndex] = editValue.trim()
      setLocalItems(updatedItems)
      onUpdate(updatedItems)
      setEditingIndex(null)
      toast({
        title: "Element actualizat",
        description: "Elementul a fost actualizat cu succes.",
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
        <div className="flex gap-3">
          <Input
            placeholder="Adaugă element nou..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="bg-background border-border shadow-sm focus:shadow-md transition-shadow"
          />
          <Button onClick={handleAdd} className="shrink-0 shadow-sm hover:shadow-md transition-shadow">
            <Plus className="h-4 w-4 mr-2" />
            Adaugă
          </Button>
        </div>

        <div className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/50">
                <TableHead className="font-semibold text-foreground/90 h-12">Valoare</TableHead>
                <TableHead className="w-[140px] text-right font-semibold text-foreground/90">Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localItems.map((item, index) => (
                <TableRow
                  key={index}
                  className="hover:bg-muted/30 transition-colors duration-150 h-14 border-b border-border/30"
                >
                  <TableCell className="py-3">
                    {editingIndex === index ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-9 bg-background border-border shadow-sm"
                      />
                    ) : (
                      <span className="text-sm font-semibold tracking-tight">{item}</span>
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
                          onClick={() => startEdit(index, item)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-red-500/70 hover:text-red-700 hover:bg-red-50 transition-all duration-150"
                          onClick={() => handleDelete(index)}
                        >
                          <Trash2 className="h-4 w-4" />
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
