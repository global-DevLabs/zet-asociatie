import type { Member } from "@/types"
import { parse as parseDate, isValid as isValidDate } from "date-fns"

export interface ImportError {
  row: number
  message: string
}

export interface ImportResult {
  validMembers: Partial<Member>[]
  errors: ImportError[]
}

// Map CSV headers to Member fields
const FIELD_MAPPING: Record<string, keyof Member> = {
  "ID Membru": "memberCode",
  "Nume": "lastName",
  "Prenume": "firstName",
  "Data Nașterii": "dateOfBirth",
  "CNP": "cnp",
  "Grad": "rank",
  "UM": "unit",
  "Profil Principal": "mainProfile",
  "Status": "status",
  "An Înscriere": "branchEnrollmentYear",
  "An Pensionare": "retirementYear",
  "Proveniență": "provenance",
  "Telefon": "phone",
  "Email": "email",
  "Adresă": "address",
}

export function parseCSV(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string
        const result = parseCSVText(csvText)
        resolve(result)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error("Failed to read file"))
    }

    reader.readAsText(file)
  })
}

function parseCSVText(csvText: string): ImportResult {
  const lines = csvText.split("\n").filter((line) => line.trim())
  
  if (lines.length < 2) {
    return {
      validMembers: [],
      errors: [{ row: 0, message: "Fișierul este gol sau nu conține date" }],
    }
  }

  const headers = parseCSVLine(lines[0])
  const validMembers: Partial<Member>[] = []
  const errors: ImportError[] = []

  // Validate headers
  const requiredHeaders = ["Nume", "Prenume", "Grad", "UM", "Profil Principal"]
  const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))
  
  if (missingHeaders.length > 0) {
    errors.push({
      row: 0,
      message: `Câmpuri obligatorii lipsă: ${missingHeaders.join(", ")}`,
    })
    return { validMembers, errors }
  }

  // Parse each row
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    
    if (values.length === 0 || values.every(v => !v.trim())) {
      continue // Skip empty lines
    }

    const member: Partial<Member> = {}
    const rowErrors: string[] = []

    // Map CSV values to member fields
    headers.forEach((header, index) => {
      const field = FIELD_MAPPING[header]
      if (!field) return

      const value = values[index]?.trim()
      if (!value) return

      // Handle special field types
      if (field === "dateOfBirth") {
        const parsedDate = parseDateValue(value)
        if (parsedDate) {
          member[field] = parsedDate
        } else {
          rowErrors.push(`Data nașterii invalidă: ${value}`)
        }
      } else if (field === "branchEnrollmentYear" || field === "retirementYear") {
        const year = parseInt(value, 10)
        if (!isNaN(year) && year >= 1900 && year <= 2100) {
          member[field] = year
        } else {
          rowErrors.push(`An invalid pentru ${header}: ${value}`)
        }
      } else {
        // @ts-ignore - dynamic field assignment
        member[field] = value
      }
    })

    // Validate required fields
    if (!member.lastName) rowErrors.push("Nume lipsă")
    if (!member.firstName) rowErrors.push("Prenume lipsă")
    if (!member.rank) rowErrors.push("Grad lipsă")
    if (!member.unit) rowErrors.push("UM lipsă")
    if (!member.mainProfile) rowErrors.push("Profil Principal lipsă")

    // Add member or errors
    if (rowErrors.length > 0) {
      errors.push({
        row: i + 1,
        message: rowErrors.join("; "),
      })
    } else {
      validMembers.push(member)
    }
  }

  return { validMembers, errors }
}

function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quotes
        inQuotes = !inQuotes
      }
    } else if (char === "," && !inQuotes) {
      // Field separator
      values.push(current)
      current = ""
    } else {
      current += char
    }
  }

  values.push(current)
  return values
}

function parseDateValue(value: string): string | null {
  // Try different date formats
  const formats = [
    "dd.MM.yyyy",
    "dd/MM/yyyy",
    "dd-MM-yyyy",
    "yyyy-MM-dd",
    "MM/dd/yyyy",
  ]

  for (const format of formats) {
    const date = parseDate(value, format, new Date())
    if (isValidDate(date)) {
      return date.toISOString().split("T")[0] // Return YYYY-MM-DD format
    }
  }

  return null
}

export function validateMemberData(member: Partial<Member>): string[] {
  const errors: string[] = []

  // Required fields
  if (!member.lastName) errors.push("Nume lipsă")
  if (!member.firstName) errors.push("Prenume lipsă")
  if (!member.rank) errors.push("Grad lipsă")
  if (!member.unit) errors.push("UM lipsă")
  if (!member.mainProfile) errors.push("Profil Principal lipsă")

  // Validate email format
  if (member.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) {
    errors.push("Format email invalid")
  }

  // Validate phone format (basic)
  if (member.phone && !/^[\d\s\-\+\(\)]+$/.test(member.phone)) {
    errors.push("Format telefon invalid")
  }

  // Validate CNP length
  if (member.cnp && member.cnp.length !== 13) {
    errors.push("CNP trebuie să aibă 13 caractere")
  }

  return errors
}
