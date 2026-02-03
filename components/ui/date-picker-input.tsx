"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format, parse, isValid } from "date-fns"
import { ro } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { displayDateToISO, isoDateToDisplay, isValidDisplayDate } from "@/lib/utils"

interface DatePickerInputProps {
  value?: string // ISO format YYYY-MM-DD
  onChange: (value: string) => void // ISO format YYYY-MM-DD
  placeholder?: string
  disabled?: boolean
  className?: string
  error?: string
  required?: boolean
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = "dd.mm.yyyy",
  disabled = false,
  className,
  error,
  required = false,
}: DatePickerInputProps) {
  const [inputValue, setInputValue] = React.useState<string>(() => isoDateToDisplay(value || ""))
  const [showError, setShowError] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)

  // Sync input value when prop value changes
  React.useEffect(() => {
    setInputValue(isoDateToDisplay(value || ""))
  }, [value])

  const date = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined
  const isValidDate = date && isValid(date)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setShowError(false)

    // Auto-format as user types (optional enhancement)
    if (newValue.length === 8 && !newValue.includes(".")) {
      // User typed 18122025, format to 18.12.2025
      const formatted = `${newValue.slice(0, 2)}.${newValue.slice(2, 4)}.${newValue.slice(4)}`
      setInputValue(formatted)
    }
  }

  const handleBlur = () => {
    if (!inputValue || inputValue.trim() === "") {
      if (required) {
        setShowError(true)
      }
      onChange("")
      return
    }

    if (isValidDisplayDate(inputValue)) {
      const isoDate = displayDateToISO(inputValue)
      onChange(isoDate)
      setShowError(false)
    } else {
      setShowError(true)
    }
  }

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate && isValid(selectedDate)) {
      const isoDate = format(selectedDate, "yyyy-MM-dd")
      const displayDate = format(selectedDate, "dd.MM.yyyy")
      setInputValue(displayDate)
      onChange(isoDate)
      setShowError(false)
      setIsOpen(false)
    }
  }

  const errorMessage = showError
    ? inputValue.trim() === ""
      ? "Acest câmp este obligatoriu"
      : "Data invalidă. Format corect: dd.mm.yyyy"
    : error

  return (
    <div className="relative">
      <div className="relative">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("pr-10", errorMessage && "border-red-500 focus-visible:ring-red-500", className)}
        />
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled}
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              type="button"
            >
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={isValidDate ? date : undefined}
              onSelect={handleSelect}
              initialFocus
              locale={ro}
              captionLayout="dropdown-months"
              fromYear={1900}
              toYear={new Date().getFullYear() + 10}
            />
          </PopoverContent>
        </Popover>
      </div>
      {errorMessage && <p className="text-xs text-red-600 mt-1">{errorMessage}</p>}
    </div>
  )
}
