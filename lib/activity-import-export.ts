import type { ActivityType } from "@/types"
import { format as formatDate } from "date-fns"

export interface ImportResult {
  success: boolean
  added: number
  updated: number
  skipped: number
  errors: ImportError[]
  data?: ActivityType[]
}

export interface ImportError {
  row: number
  field?: string
  message: string
  data?: any
}

export type ImportMode = "merge" | "replace"

// Normalize text for comparison (trim, lowercase, collapse spaces)
function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ")
}

// Generate CSV content from activity types
export function exportActivityTypesToCSV(types: ActivityType[]): string {
  const headers = ["id", "name", "category", "isActive"]
  const rows = types.map((type) => [type.id, type.name, type.category || "", type.is_active ? "Da" : "Nu"])

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => {
          // Escape quotes and wrap in quotes if contains comma
          const cellStr = String(cell)
          if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          return cellStr
        })
        .join(","),
    ),
  ].join("\n")

  return csvContent
}

// Generate JSON content from activity types
export function exportActivityTypesToJSON(types: ActivityType[]): string {
  const exportData = types.map((type) => ({
    id: type.id,
    name: type.name,
    category: type.category || "",
    isActive: type.is_active,
    createdAt: type.created_at,
    updatedAt: type.updated_at,
  }))

  return JSON.stringify(exportData, null, 2)
}

// Download a file with given content
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Generate filename with timestamp
export function generateFilename(format: "csv" | "json"): string {
  const timestamp = formatDate(new Date(), "yyyy-MM-dd-HHmmss")
  return `activitati-${timestamp}.${format}`
}

// Parse CSV content
function parseCSV(content: string): string[][] {
  const lines = content.split("\n").filter((line) => line.trim())
  const rows: string[][] = []

  for (const line of lines) {
    const row: string[] = []
    let currentCell = ""
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          currentCell += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === "," && !inQuotes) {
        row.push(currentCell.trim())
        currentCell = ""
      } else {
        currentCell += char
      }
    }

    row.push(currentCell.trim())
    rows.push(row)
  }

  return rows
}

// Import from CSV
export function importFromCSV(content: string, existingTypes: ActivityType[], mode: ImportMode): ImportResult {
  const errors: ImportError[] = []
  const newTypes: ActivityType[] = []
  let added = 0
  let updated = 0
  let skipped = 0

  try {
    const rows = parseCSV(content)

    if (rows.length === 0) {
      return {
        success: false,
        added: 0,
        updated: 0,
        skipped: 0,
        errors: [{ row: 0, message: "Fișierul CSV este gol" }],
      }
    }

    // Parse header
    const headers = rows[0].map((h) => h.toLowerCase().trim())
    const nameIndex = headers.findIndex((h) => h === "name" || h === "nume" || h === "denumire")
    const idIndex = headers.findIndex((h) => h === "id")
    const categoryIndex = headers.findIndex((h) => h === "category" || h === "categorie")
    const isActiveIndex = headers.findIndex((h) => h === "isactive" || h === "activ" || h === "is_active")

    if (nameIndex === -1) {
      return {
        success: false,
        added: 0,
        updated: 0,
        skipped: 0,
        errors: [{ row: 0, message: "Lipsește coloana obligatorie 'name' sau 'nume'" }],
      }
    }

    // Process data rows
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const name = row[nameIndex]?.trim()

      if (!name) {
        errors.push({ row: i + 1, field: "name", message: "Numele este obligatoriu" })
        skipped++
        continue
      }

      const id = idIndex >= 0 ? row[idIndex]?.trim() : undefined
      const category = categoryIndex >= 0 ? row[categoryIndex]?.trim() : undefined
      const isActiveStr = isActiveIndex >= 0 ? row[isActiveIndex]?.trim().toLowerCase() : "da"
      const isActive = isActiveStr === "da" || isActiveStr === "true" || isActiveStr === "1" || isActiveStr === "yes"

      // Check for duplicates
      const normalizedName = normalizeText(name)
      const existingByName = existingTypes.find((t) => normalizeText(t.name) === normalizedName)
      const existingById = id ? existingTypes.find((t) => t.id === id) : undefined

      if (mode === "merge") {
        if (existingById) {
          // Update by ID
          newTypes.push({
            ...existingById,
            name,
            category,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          updated++
        } else if (existingByName) {
          // Update by name
          newTypes.push({
            ...existingByName,
            name,
            category,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          updated++
        } else {
          // Add new
          newTypes.push({
            id: id || `type-${Date.now()}-${i}`,
            name,
            category,
            is_active: isActive,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          added++
        }
      } else {
        // Replace mode - just add all
        newTypes.push({
          id: id || `type-${Date.now()}-${i}`,
          name,
          category,
          is_active: isActive,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    }

    // In merge mode, keep existing types that weren't updated
    let finalTypes: ActivityType[]
    if (mode === "merge") {
      const updatedIds = new Set(newTypes.map((t) => t.id))
      const untouched = existingTypes.filter((t) => !updatedIds.has(t.id))
      finalTypes = [...untouched, ...newTypes]
    } else {
      finalTypes = newTypes
      added = newTypes.length
    }

    return {
      success: errors.length === 0,
      added,
      updated,
      skipped,
      errors,
      data: finalTypes,
    }
  } catch (error) {
    return {
      success: false,
      added: 0,
      updated: 0,
      skipped: 0,
      errors: [{ row: 0, message: `Eroare la parsarea CSV: ${error}` }],
    }
  }
}

// Import from JSON
export function importFromJSON(content: string, existingTypes: ActivityType[], mode: ImportMode): ImportResult {
  const errors: ImportError[] = []
  const newTypes: ActivityType[] = []
  let added = 0
  let updated = 0
  let skipped = 0

  try {
    const data = JSON.parse(content)

    if (!Array.isArray(data)) {
      return {
        success: false,
        added: 0,
        updated: 0,
        skipped: 0,
        errors: [{ row: 0, message: "Fișierul JSON trebuie să conțină un array de obiecte" }],
      }
    }

    for (let i = 0; i < data.length; i++) {
      const item = data[i]

      if (!item.name && !item.nume) {
        errors.push({ row: i + 1, field: "name", message: "Numele este obligatoriu" })
        skipped++
        continue
      }

      const name = item.name || item.nume
      const id = item.id
      const category = item.category || item.categorie
      const isActive = item.isActive ?? item.is_active ?? item.activ ?? true

      // Check for duplicates
      const normalizedName = normalizeText(name)
      const existingByName = existingTypes.find((t) => normalizeText(t.name) === normalizedName)
      const existingById = id ? existingTypes.find((t) => t.id === id) : undefined

      if (mode === "merge") {
        if (existingById) {
          newTypes.push({
            ...existingById,
            name,
            category,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          updated++
        } else if (existingByName) {
          newTypes.push({
            ...existingByName,
            name,
            category,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          updated++
        } else {
          newTypes.push({
            id: id || `type-${Date.now()}-${i}`,
            name,
            category,
            is_active: isActive,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          added++
        }
      } else {
        newTypes.push({
          id: id || `type-${Date.now()}-${i}`,
          name,
          category,
          is_active: isActive,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    }

    let finalTypes: ActivityType[]
    if (mode === "merge") {
      const updatedIds = new Set(newTypes.map((t) => t.id))
      const untouched = existingTypes.filter((t) => !updatedIds.has(t.id))
      finalTypes = [...untouched, ...newTypes]
    } else {
      finalTypes = newTypes
      added = newTypes.length
    }

    return {
      success: errors.length === 0,
      added,
      updated,
      skipped,
      errors,
      data: finalTypes,
    }
  } catch (error) {
    return {
      success: false,
      added: 0,
      updated: 0,
      skipped: 0,
      errors: [{ row: 0, message: `Eroare la parsarea JSON: ${error}` }],
    }
  }
}

// Generate template files
export function generateCSVTemplate(): string {
  return "id,name,category,isActive\ntype-1,Sport,Fizic,Da\ntype-2,Teatru,Cultural,Da"
}

export function generateJSONTemplate(): string {
  return JSON.stringify(
    [
      {
        id: "type-1",
        name: "Sport",
        category: "Fizic",
        isActive: true,
      },
      {
        id: "type-2",
        name: "Teatru",
        category: "Cultural",
        isActive: true,
      },
    ],
    null,
    2,
  )
}
