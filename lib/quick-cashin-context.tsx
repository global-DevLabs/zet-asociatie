"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface QuickCashinContextType {
  isOpen: boolean
  openModal: () => void
  closeModal: () => void
}

const QuickCashinContext = createContext<QuickCashinContextType | undefined>(undefined)

export function QuickCashinProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const openModal = () => setIsOpen(true)
  const closeModal = () => setIsOpen(false)

  return <QuickCashinContext.Provider value={{ isOpen, openModal, closeModal }}>{children}</QuickCashinContext.Provider>
}

export function useQuickCashin() {
  const context = useContext(QuickCashinContext)
  if (!context) {
    throw new Error("useQuickCashin must be used within QuickCashinProvider")
  }
  return context
}
