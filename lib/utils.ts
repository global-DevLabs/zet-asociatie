import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate age from a date of birth string
 * @param dateOfBirth - ISO date string (YYYY-MM-DD)
 * @returns Age in full years, or null if invalid/missing date
 */
export function calculateAge(dateOfBirth: string | undefined): number | null {
  if (!dateOfBirth || dateOfBirth.trim() === "") {
    return null
  }

  try {
    const birthDate = new Date(dateOfBirth)
    const today = new Date()

    // Validate that the date is valid
    if (isNaN(birthDate.getTime())) {
      return null
    }

    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    // Subtract 1 if birthday hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    // Return null for invalid ages (negative or unreasonably high)
    if (age < 0 || age > 150) {
      return null
    }

    return age
  } catch (error) {
    return null
  }
}

/**
 * Format age for display
 * @param age - Age in years or null
 * @returns Formatted string like "39 ani" or "—" for missing age
 */
export function formatAge(age: number | null): string {
  if (age === null) {
    return "—"
  }
  return `${age} ani`
}

/**
 * Convert DD.MM.YYYY to ISO YYYY-MM-DD
 * @param displayDate - Date in DD.MM.YYYY format
 * @returns ISO date string or empty string if invalid
 */
export function displayDateToISO(displayDate: string): string {
  if (!displayDate || displayDate.trim() === "") {
    return ""
  }

  const cleaned = displayDate.replace(/\s/g, "").replace(/[/-]/g, ".")
  const parts = cleaned.split(".")

  if (parts.length !== 3) {
    return ""
  }

  const day = parts[0].padStart(2, "0")
  const month = parts[1].padStart(2, "0")
  const year = parts[2]

  if (year.length !== 4) {
    return ""
  }

  return `${year}-${month}-${day}`
}

/**
 * Convert ISO YYYY-MM-DD to DD.MM.YYYY (parse as local date to avoid timezone shift)
 * @param isoDate - ISO date string
 * @returns Date in DD.MM.YYYY format or empty string if invalid
 */
export function isoDateToDisplay(isoDate: string): string {
  if (!isoDate || isoDate.trim() === "") {
    return ""
  }

  const match = isoDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) {
    return ""
  }

  const [, y, m, d] = match
  const year = parseInt(y!, 10)
  const month = parseInt(m!, 10)
  const day = parseInt(d!, 10)
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return ""
  }

  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
    return ""
  }

  return `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.${year}`
}

/**
 * Validate a date string in DD.MM.YYYY format (parse as local date to avoid timezone issues)
 * @param displayDate - Date in DD.MM.YYYY format
 * @returns true if valid, false otherwise
 */
export function isValidDisplayDate(displayDate: string): boolean {
  if (!displayDate || displayDate.trim() === "") {
    return false
  }

  const cleaned = displayDate.replace(/\s/g, "").replace(/[/-]/g, ".")
  const parts = cleaned.split(".")
  if (parts.length !== 3) {
    return false
  }

  const day = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const year = parseInt(parts[2], 10)

  if (isNaN(day) || isNaN(month) || isNaN(year) || year < 1000 || year > 9999) {
    return false
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false
  }

  const date = new Date(year, month - 1, day)
  if (isNaN(date.getTime())) {
    return false
  }

  return date.getDate() === day && date.getMonth() + 1 === month && date.getFullYear() === year
}

/**
 * Extract the numeric part from a member code (e.g., "MEM-1004" or "01004" -> 1004)
 * @param memberCode - Member code string
 * @returns Numeric value or null if invalid
 */
export function extractMemberCodeNumber(memberCode: string | undefined | null): number | null {
  if (!memberCode) return null
  
  // Handle legacy formats: MEM-1004, M-1004, M 1004
  const legacyMatch = memberCode.match(/^(?:MEM-|M-|M\s?)(\d+)$/i)
  if (legacyMatch) {
    return Number.parseInt(legacyMatch[1], 10)
  }
  
  // Handle new 5-digit format: 01004
  const numericMatch = memberCode.match(/^(\d{5})$/)
  if (numericMatch) {
    return Number.parseInt(numericMatch[1], 10)
  }
  
  // Handle plain numeric: 1004
  const plainMatch = memberCode.match(/^(\d{1,5})$/)
  if (plainMatch) {
    return Number.parseInt(plainMatch[1], 10)
  }
  
  return null
}

/**
 * Format a number as a 5-digit member code
 * @param num - Numeric value
 * @returns 5-digit string (e.g., "01004")
 */
export function formatMemberCode(num: number | null): string {
  if (num === null || isNaN(num)) return ""
  return String(num).padStart(5, "0")
}

/**
 * Display a member code - converts any format to 5-digit numeric
 * @param memberCode - Member code in any format
 * @returns 5-digit string display format
 */
export function displayMemberCode(memberCode: string | undefined | null): string {
  const num = extractMemberCodeNumber(memberCode)
  if (num === null) return memberCode || ""
  return formatMemberCode(num)
}

/**
 * Check if a search query matches a member code (supports all formats)
 * @param memberCode - The member's code
 * @param query - Search query
 * @returns true if matches
 */
export function memberCodeMatchesSearch(memberCode: string | undefined | null, query: string): boolean {
  if (!memberCode || !query) return false
  
  const queryNum = extractMemberCodeNumber(query)
  const codeNum = extractMemberCodeNumber(memberCode)
  
  // Both are numeric - compare numbers
  if (queryNum !== null && codeNum !== null) {
    return codeNum === queryNum || String(codeNum).includes(String(queryNum))
  }
  
  // Fallback to string comparison
  const normalizedCode = displayMemberCode(memberCode).toLowerCase()
  const normalizedQuery = query.toLowerCase().replace(/^(mem-|m-|m\s)/i, "")
  
  return normalizedCode.includes(normalizedQuery)
}

// ========== Payment ID Utilities ==========

/**
 * Extract the numeric part from a payment ID (e.g., "P-123456" or "P000123" -> 123456 or 123)
 * @param paymentId - Payment ID string
 * @returns Numeric value or null if invalid
 */
export function extractPaymentIdNumber(paymentId: string | undefined | null): number | null {
  if (!paymentId) return null
  
  // Handle legacy format: P-123456
  const legacyMatch = paymentId.match(/^P-(\d+)$/i)
  if (legacyMatch) {
    return Number.parseInt(legacyMatch[1], 10)
  }
  
  // Handle new format: P000123
  const newMatch = paymentId.match(/^P(\d{6})$/i)
  if (newMatch) {
    return Number.parseInt(newMatch[1], 10)
  }
  
  // Handle plain P + digits: P123
  const plainMatch = paymentId.match(/^P(\d+)$/i)
  if (plainMatch) {
    return Number.parseInt(plainMatch[1], 10)
  }
  
  return null
}

/**
 * Format a number as a payment ID (P + 6 digits)
 * @param num - Numeric value
 * @returns Payment ID string (e.g., "P000123")
 */
export function formatPaymentId(num: number | null): string {
  if (num === null || isNaN(num)) return ""
  return `P${String(num).padStart(6, "0")}`
}

/**
 * Display a payment ID - converts any format to P + 6 digits
 * @param paymentId - Payment ID in any format
 * @returns Display format (e.g., "P000123")
 */
export function displayPaymentId(paymentId: string | undefined | null): string {
  if (!paymentId) return ""
  
  const num = extractPaymentIdNumber(paymentId)
  if (num === null) {
    // If we can't parse it, return as-is
    return paymentId
  }
  return formatPaymentId(num)
}

/**
 * Check if a search query matches a payment ID (supports all formats)
 * @param paymentId - The payment's ID
 * @param query - Search query
 * @returns true if matches
 */
export function paymentIdMatchesSearch(paymentId: string | undefined | null, query: string): boolean {
  if (!paymentId || !query) return false
  
  const normalizedQuery = query.toLowerCase().trim()
  
  // Direct match on display format
  const displayId = displayPaymentId(paymentId).toLowerCase()
  if (displayId.includes(normalizedQuery)) return true
  
  // Match on raw ID
  if (paymentId.toLowerCase().includes(normalizedQuery)) return true
  
  // Match on numeric part only
  const queryNum = extractPaymentIdNumber(query) ?? Number.parseInt(normalizedQuery.replace(/\D/g, ""), 10)
  const idNum = extractPaymentIdNumber(paymentId)
  
  if (!isNaN(queryNum) && idNum !== null) {
    return String(idNum).includes(String(queryNum))
  }
  
  return false
}
