"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { Check, ChevronsUpDown, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface MultiSelectOption {
  value: string
  label: string
  description?: string
}

interface MultiSelectComboboxProps {
  options: MultiSelectOption[]
  selectedValues: string[]
  onSelectionChange: (values: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  maxDisplayedChips?: number
  disabled?: boolean
  className?: string
}

export function MultiSelectCombobox({
  options,
  selectedValues,
  onSelectionChange,
  placeholder = "Selectează...",
  searchPlaceholder = "Caută...",
  emptyMessage = "Nu există opțiuni disponibile",
  maxDisplayedChips = 3,
  disabled = false,
  className,
}: MultiSelectComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)

  // Find portal container - prefer dialog/sheet content for proper z-index layering
  useEffect(() => {
    if (typeof document === "undefined") return
    const dialogContent = triggerRef.current?.closest("[data-slot='dialog-content'], [data-slot='sheet-content']") as HTMLElement | null
    setPortalContainer(dialogContent || document.body)
  }, [open])

  const filteredOptions = options.filter((option) => {
    const search = searchQuery.toLowerCase()
    return (
      option.label.toLowerCase().includes(search) ||
      option.value.toLowerCase().includes(search) ||
      (option.description && option.description.toLowerCase().includes(search))
    )
  })

  const toggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      onSelectionChange(selectedValues.filter((v) => v !== value))
    } else {
      onSelectionChange([...selectedValues, value])
    }
  }

  const removeValue = (value: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onSelectionChange(selectedValues.filter((v) => v !== value))
  }

  const selectAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    const allValues = filteredOptions.map((o) => o.value)
    const newSelection = [...new Set([...selectedValues, ...allValues])]
    onSelectionChange(newSelection)
  }

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelectionChange([])
  }

  const selectedOptions = options.filter((o) => selectedValues.includes(o.value))
  const displayedChips = selectedOptions.slice(0, maxDisplayedChips)
  const remainingCount = selectedOptions.length - maxDisplayedChips

  // Position dropdown
  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      const dropdownHeight = Math.min(350, options.length * 40 + 100)
      
      let top = rect.bottom + 4
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        top = rect.top - dropdownHeight - 4
      }
      
      setDropdownPosition({
        top,
        left: rect.left,
        width: rect.width,
      })
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open, options.length])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  // Close on escape
  useEffect(() => {
    if (!open) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [open])

  return (
    <div className={cn("relative", className)}>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="w-full justify-between bg-transparent h-auto min-h-[40px] py-1.5 px-3"
      >
        <div className="flex items-center gap-1.5 flex-wrap flex-1 text-left">
          {selectedOptions.length === 0 ? (
            <span className="text-muted-foreground text-sm">{placeholder}</span>
          ) : (
            <>
              {displayedChips.map((option) => (
                <Badge key={option.value} variant="secondary" className="px-1.5 py-0.5 text-xs gap-1">
                  {option.label}
                  <button
                    type="button"
                    onClick={(e) => removeValue(option.value, e)}
                    className="hover:bg-muted rounded-sm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {remainingCount > 0 && (
                <Badge variant="outline" className="px-1.5 py-0.5 text-xs">
                  +{remainingCount}
                </Badge>
              )}
            </>
          )}
        </div>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open &&
        portalContainer &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] rounded-md border bg-popover shadow-lg flex flex-col pointer-events-auto"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              maxHeight: "min(350px, 50vh)",
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Search */}
            <div className="flex items-center border-b px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                ref={inputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                autoComplete="off"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("")
                    inputRef.current?.focus()
                  }}
                  className="ml-2 p-1 hover:bg-accent rounded"
                >
                  <X className="h-3 w-3 opacity-50" />
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between px-2 py-1.5 border-b bg-muted/30">
              <span className="text-xs text-muted-foreground">
                {filteredOptions.length} opțiuni
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={selectAll}
                  disabled={filteredOptions.length === 0}
                >
                  Selectează tot
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={clearAll}
                  disabled={selectedValues.length === 0}
                >
                  Șterge tot
                </Button>
              </div>
            </div>

            {/* Options list */}
            <div
              className="flex-1 min-h-0 overflow-y-auto p-1"
              style={{ overscrollBehavior: "contain" }}
              onWheel={(e) => e.stopPropagation()}
            >
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {searchQuery ? "Niciun rezultat găsit" : emptyMessage}
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = selectedValues.includes(option.value)
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleOption(option.value)}
                      className={cn(
                        "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                        isSelected && "bg-primary/5"
                      )}
                    >
                      <div
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center",
                          isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex flex-col items-start flex-1 text-left">
                        <span className={cn(isSelected && "font-medium")}>{option.label}</span>
                        {option.description && (
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>,
          portalContainer
        )}
    </div>
  )
}
