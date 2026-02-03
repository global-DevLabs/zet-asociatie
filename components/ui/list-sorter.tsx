"use client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ArrowUp, ArrowDown } from "lucide-react"

export interface SortOption {
  value: string
  label: string
}

interface ListSorterProps {
  options: SortOption[]
  value: string
  direction: "asc" | "desc"
  onChange: (value: string, direction: "asc" | "desc") => void
  className?: string
  compact?: boolean // When true, hides the "Sortează:" label for use in unified control bars
}

export function ListSorter({ options, value, direction, onChange, className = "", compact = false }: ListSorterProps) {
  return (
    <div className={`flex items-center gap-2 shrink-0 ${className}`}>
      {!compact && <span className="text-sm font-medium text-muted-foreground hidden sm:inline">Sortează:</span>}
      <Select value={value} onValueChange={(newValue) => onChange(newValue, direction)}>
        <SelectTrigger className="w-[160px] h-10 bg-background border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        className="h-10 w-10 p-0 bg-background border-border"
        onClick={() => onChange(value, direction === "asc" ? "desc" : "asc")}
        title={direction === "asc" ? "Crescător" : "Descrescător"}
      >
        {direction === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
      </Button>
    </div>
  )
}
