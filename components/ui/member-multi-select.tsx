"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, Users, Search, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn, displayMemberCode } from "@/lib/utils"
import type { Member } from "@/types"

interface MemberMultiSelectProps {
  members: Member[]
  selectedMemberIds: string[]
  onSelectionChange: (memberIds: string[]) => void
  excludeMemberIds?: string[]
  placeholder?: string
  maxHeight?: string
  showCount?: boolean
}

export function MemberMultiSelect({
  members,
  selectedMemberIds,
  onSelectionChange,
  excludeMemberIds = [],
  placeholder = "Caută și selectează membri...",
  maxHeight = "300px",
  showCount = true,
}: MemberMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
  const [isInsideDialog, setIsInsideDialog] = useState(false)

  // Find portal container - prefer dialog content for proper z-index layering inside modals
  useEffect(() => {
    if (typeof document === "undefined") return
    const dialogContent = triggerRef.current?.closest("[data-slot='dialog-content']") as HTMLElement | null
    setIsInsideDialog(!!dialogContent)
    setPortalContainer(dialogContent || document.body)
  }, [open])

  const availableMembers = members.filter((m) => !excludeMemberIds.includes(m.id))

  const filteredMembers = availableMembers.filter((member) => {
    const search = searchQuery.toLowerCase()
    return (
      member.memberCode.toLowerCase().includes(search) ||
      member.firstName.toLowerCase().includes(search) ||
      member.lastName.toLowerCase().includes(search) ||
      (member.rank && member.rank.toLowerCase().includes(search)) ||
      (member.unit && member.unit.toLowerCase().includes(search))
    )
  })

  const toggleMember = (memberId: string) => {
    if (selectedMemberIds.includes(memberId)) {
      onSelectionChange(selectedMemberIds.filter((id) => id !== memberId))
    } else {
      onSelectionChange([...selectedMemberIds, memberId])
    }
  }

  const removeMember = (memberId: string) => {
    onSelectionChange(selectedMemberIds.filter((id) => id !== memberId))
  }

  const selectedMembers = members.filter((m) => selectedMemberIds.includes(m.id))

  // Position dropdown relative to trigger
  useEffect(() => {
    if (open && triggerRef.current && portalContainer) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      
      // If inside dialog, use relative positioning to dialog content
      if (isInsideDialog) {
        const dialogContent = portalContainer
        const dialogRect = dialogContent.getBoundingClientRect()
        
        // Account for dialog's scroll position
        const scrollTop = dialogContent.scrollTop
        const scrollLeft = dialogContent.scrollLeft
        
        // Calculate position relative to dialog, accounting for scroll
        const relativeTop = triggerRect.bottom - dialogRect.top + scrollTop + 4
        const relativeLeft = triggerRect.left - dialogRect.left + scrollLeft
        
        setDropdownPosition({
          top: relativeTop,
          left: relativeLeft,
          width: triggerRect.width,
        })
      } else {
        // Use viewport positioning for non-dialog contexts
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        const dropdownMaxHeight = Math.min(400, viewportHeight * 0.6)
        
        let left = triggerRect.left
        const dropdownWidth = triggerRect.width
        
        if (left + dropdownWidth > viewportWidth - 16) {
          left = Math.max(16, viewportWidth - dropdownWidth - 16)
        }
        left = Math.max(16, left)
        
        let top = triggerRect.bottom + 4
        
        if (top + dropdownMaxHeight > viewportHeight - 16) {
          top = triggerRect.top - dropdownMaxHeight - 4
          if (top < 16) {
            top = 16
          }
        }
        
        setDropdownPosition({
          top,
          left,
          width: triggerRect.width,
        })
      }
      
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open, portalContainer, isInsideDialog])

  // Close dropdown on outside click
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

  // Close dropdown on escape
  useEffect(() => {
    if (!open) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [open])

  // Reposition dropdown on scroll or resize
  useEffect(() => {
    if (!open || !triggerRef.current || !portalContainer) return

    const updatePosition = () => {
      if (!triggerRef.current || !portalContainer) return
      
      const triggerRect = triggerRef.current.getBoundingClientRect()
      
      if (isInsideDialog) {
        const dialogContent = portalContainer
        const dialogRect = dialogContent.getBoundingClientRect()
        
        // Account for dialog's scroll position
        const scrollTop = dialogContent.scrollTop
        const scrollLeft = dialogContent.scrollLeft
        
        // Calculate position relative to dialog, accounting for scroll
        const relativeTop = triggerRect.bottom - dialogRect.top + scrollTop + 4
        const relativeLeft = triggerRect.left - dialogRect.left + scrollLeft
        
        setDropdownPosition({
          top: relativeTop,
          left: relativeLeft,
          width: triggerRect.width,
        })
      } else {
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        const dropdownMaxHeight = Math.min(400, viewportHeight * 0.6)
        
        let left = triggerRect.left
        const dropdownWidth = triggerRect.width
        
        if (left + dropdownWidth > viewportWidth - 16) {
          left = Math.max(16, viewportWidth - dropdownWidth - 16)
        }
        left = Math.max(16, left)
        
        let top = triggerRect.bottom + 4
        
        if (top + dropdownMaxHeight > viewportHeight - 16) {
          top = triggerRect.top - dropdownMaxHeight - 4
          if (top < 16) {
            top = 16
          }
        }
        
        setDropdownPosition({
          top,
          left,
          width: triggerRect.width,
        })
      }
    }

    // Listen to scroll events globally with capture to catch dialog scroll
    window.addEventListener("scroll", updatePosition, true)
    window.addEventListener("resize", updatePosition)
    
    // Also specifically listen to the dialog's scroll if inside one
    if (isInsideDialog && portalContainer) {
      portalContainer.addEventListener("scroll", updatePosition)
    }
    
    return () => {
      window.removeEventListener("scroll", updatePosition, true)
      window.removeEventListener("resize", updatePosition)
      if (isInsideDialog && portalContainer) {
        portalContainer.removeEventListener("scroll", updatePosition)
      }
    }
  }, [open, portalContainer, isInsideDialog])

  return (
    <div className="space-y-2" ref={containerRef}>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="w-full justify-between bg-transparent h-auto min-h-[40px] py-2"
      >
        <div className="flex items-center gap-2 flex-1">
          <Search className="h-4 w-4 shrink-0 opacity-50" />
          <span className="text-muted-foreground">
            {selectedMemberIds.length === 0
              ? placeholder
              : showCount
                ? `${selectedMemberIds.length} ${selectedMemberIds.length === 1 ? "membru selectat" : "membri selectați"}`
                : "Membrii selectați"}
          </span>
        </div>
        <Users className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {/* Portal-rendered dropdown for proper z-index layering */}
      {open &&
        portalContainer &&
        createPortal(
          <div
            ref={dropdownRef}
            className={cn(
              "z-[9999] rounded-md border bg-popover shadow-lg pointer-events-auto flex flex-col",
              isInsideDialog ? "absolute" : "fixed"
            )}
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              maxHeight: "min(400px, 60vh)",
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Sticky header section */}
            <div className="shrink-0 bg-popover">
              {/* Search input */}
              <div className="flex items-center border-b px-3 py-2">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Caută după cod, nume, grad sau UM..."
                  value={searchQuery}
                  onChange={(e) => {
                    e.stopPropagation()
                    setSearchQuery(e.target.value)
                  }}
                  onKeyDown={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  autoFocus
                  autoComplete="off"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground pointer-events-auto"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSearchQuery("")
                      inputRef.current?.focus()
                    }}
                    className="ml-2 p-1 hover:bg-accent rounded"
                  >
                    <X className="h-3 w-3 opacity-50" />
                  </button>
                )}
              </div>

              {/* Actions bar */}
              <div className="flex items-center justify-between px-2 py-1 border-b">
                <span className="text-xs text-muted-foreground">
                  {filteredMembers.length} {filteredMembers.length === 1 ? "membru disponibil" : "membri disponibili"}
                </span>
                <div className="flex gap-1">
                  {availableMembers.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const availableIds = availableMembers.map((m) => m.id)
                        const newSelection = [...new Set([...selectedMemberIds, ...availableIds])]
                        onSelectionChange(newSelection)
                      }}
                    >
                      Selectează tot
                    </Button>
                  )}
                  {selectedMemberIds.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onSelectionChange([])
                      }}
                    >
                      Șterge tot
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Member list - scrollable container */}
            <div
              className="flex-1 min-h-0 overflow-y-auto p-1"
              style={{
                overscrollBehavior: "contain",
              }}
              onWheel={(e) => {
                // Prevent scroll from leaking to parent/page
                e.stopPropagation()
              }}
            >
              {filteredMembers.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {searchQuery
                    ? "Niciun membru găsit cu acest criteriu"
                    : "Toți membrii sunt deja selectați sau excludși"}
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const isSelected = selectedMemberIds.includes(member.id)
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleMember(member.id)
                      }}
                      className={cn(
                        "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground pointer-events-auto",
                        isSelected && "bg-primary/10",
                      )}
                    >
                      <Check
                        className={cn("mr-2 h-4 w-4 shrink-0", isSelected ? "opacity-100 text-primary" : "opacity-0")}
                      />
                                <div className="flex flex-col items-start flex-1">
                                  <span className={cn("font-medium", isSelected && "text-primary")}>
                                    {displayMemberCode(member.memberCode)} — {member.lastName} {member.firstName}
                                  </span>
                        {(member.rank || member.unit) && (
                          <span className="text-xs text-muted-foreground">
                            {member.rank}
                            {member.rank && member.unit && " | "}
                            {member.unit}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>,
          portalContainer,
        )}

      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/30">
          {selectedMembers.map((member) => (
                  <Badge key={member.id} variant="secondary" className="pl-2 pr-1 py-1">
                    <span className="text-xs">
                      {displayMemberCode(member.memberCode)} — {member.lastName} {member.firstName}
                    </span>
              <button
                type="button"
                onClick={() => removeMember(member.id)}
                className="ml-1 hover:bg-muted rounded-sm p-0.5"
                aria-label={`Elimină ${member.firstName} ${member.lastName}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
