"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { ActivityType } from "@/types"

interface ActivityTypeComboboxProps {
  activityTypes: ActivityType[]
  value: string
  onChange: (value: string) => void
  onCreateNew?: (name: string) => void
  placeholder?: string
  disabled?: boolean
}

export function ActivityTypeCombobox({
  activityTypes,
  value,
  onChange,
  onCreateNew,
  placeholder = "Selectează sau scrie tipul activității...",
  disabled = false,
}: ActivityTypeComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const activeTypes = activityTypes.filter((t) => t.is_active)

  const filteredTypes = activeTypes.filter((type) => type.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const selectedType = activityTypes.find((t) => t.id === value)
  const displayValue = selectedType?.name || ""

  const exactMatch = activeTypes.some((type) => type.name.toLowerCase() === searchQuery.toLowerCase())
  const showCreateOption = searchQuery.length > 0 && !exactMatch && onCreateNew

  const handleCreateNew = () => {
    if (searchQuery && onCreateNew) {
      onCreateNew(searchQuery)
      setSearchQuery("")
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal bg-transparent"
        >
          {displayValue || <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start" style={{ width: "var(--radix-popover-trigger-width)" }}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Caută sau scrie un tip nou..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {filteredTypes.length === 0 && !showCreateOption && (
              <CommandEmpty>{searchQuery ? "Niciun tip găsit" : "Nu există tipuri disponibile"}</CommandEmpty>
            )}
            <CommandGroup>
              {filteredTypes.map((type) => (
                <CommandItem
                  key={type.id}
                  value={type.id}
                  onSelect={() => {
                    onChange(type.id)
                    setOpen(false)
                    setSearchQuery("")
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === type.id ? "opacity-100" : "opacity-0")} />
                  <span>{type.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {showCreateOption && (
              <CommandGroup>
                <CommandItem onSelect={handleCreateNew} className="text-primary cursor-pointer border-t">
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Adaugă nou: &quot;{searchQuery}&quot;</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
