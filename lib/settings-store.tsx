"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { RANKS, UNIT_CODES, PROFILES, PAYMENT_METHODS } from "@/lib/constants"
import type { UnitItem } from "@/types"

interface SettingsContextType {
  ranks: string[]
  units: UnitItem[]
  profiles: string[]
  paymentMethods: string[]
  paymentYears: number[]
  updateRanks: (ranks: string[]) => void
  updateUnits: (units: UnitItem[]) => void
  updateProfiles: (profiles: string[]) => void
  updatePaymentMethods: (methods: string[]) => void
  addPaymentYear: (year: number) => boolean
  removePaymentYear: (year: number) => boolean
  getUnitDisplay: (code: string) => string
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

// Generate default payment years (current year + 10 years back)
const currentYear = new Date().getFullYear()
const DEFAULT_PAYMENT_YEARS = Array.from({ length: 11 }, (_, i) => currentYear - i)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [ranks, setRanks] = useState<string[]>(RANKS)
  const [units, setUnits] = useState<UnitItem[]>(UNIT_CODES.map((code) => ({ code })))
  const [profiles, setProfiles] = useState<string[]>(PROFILES)
  const [paymentMethods, setPaymentMethods] = useState<string[]>([...PAYMENT_METHODS])
  const [paymentYears, setPaymentYears] = useState<number[]>(DEFAULT_PAYMENT_YEARS)

  const updateRanks = (newRanks: string[]) => {
    setRanks(newRanks)
  }

  const updateUnits = (newUnits: UnitItem[]) => {
    setUnits(newUnits)
  }

  const updateProfiles = (newProfiles: string[]) => {
    setProfiles(newProfiles)
  }

  const updatePaymentMethods = (newMethods: string[]) => {
    setPaymentMethods(newMethods)
  }

  const addPaymentYear = (year: number): boolean => {
    if (paymentYears.includes(year)) {
      return false // Already exists
    }
    const newYears = [...paymentYears, year].sort((a, b) => b - a) // Sort descending
    setPaymentYears(newYears)
    return true
  }

  const removePaymentYear = (year: number): boolean => {
    const newYears = paymentYears.filter((y) => y !== year)
    setPaymentYears(newYears)
    return true
  }

  const getUnitDisplay = (code: string) => {
    const unit = units.find((u) => u.code === code)
    if (unit && unit.description) {
      return `${unit.code} — ${unit.description}`
    }
    return code
  }

  return (
    <SettingsContext.Provider
      value={{
        ranks,
        units,
        profiles,
        paymentMethods,
        paymentYears,
        updateRanks,
        updateUnits,
        updateProfiles,
        updatePaymentMethods,
        addPaymentYear,
        removePaymentYear,
        getUnitDisplay,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}
