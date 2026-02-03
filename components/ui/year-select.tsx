"use client"

import { cn } from "@/lib/utils"

import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface YearSelectProps {
  value?: number
  onChange: (value: number | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  fromYear?: number
  toYear?: number
}

export function YearSelect({
  value,
  onChange,
  placeholder = "Selectează anul",
  disabled = false,
  className,
  fromYear = 1950,
  toYear = new Date().getFullYear() + 2,
}: YearSelectProps) {
  const years = React.useMemo(() => {
    const yearsList: number[] = []
    for (let year = toYear; year >= fromYear; year--) {
      yearsList.push(year)
    }
    return yearsList
  }, [fromYear, toYear])

  return (
    <Select
      value={value?.toString() || ""}
      onValueChange={(val) => onChange(val ? Number.parseInt(val) : undefined)}
      disabled={disabled}
    >
      <SelectTrigger className={cn("bg-background border-border", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {years.map((year) => (
          <SelectItem key={year} value={year.toString()}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
