import type { Activity, ActivityParticipant } from "@/types"
import { format as formatDate, parse } from "date-fns"

// Export activities to CSV
export function exportActivitiesToCSV(
  activities: Activity[],
  getParticipants: (id: string) => ActivityParticipant[],
  getTypeName: (typeId: string) => string,
): string {
  const headers = ["code", "type", "title", "date", "location", "participantsCount"]

  const rows = activities.map((activity) => {
    const participants = getParticipants(activity.id)
    const typeName = getTypeName(activity.type_id)
    const dateFormatted = formatDate(new Date(activity.date_from), "dd.MM.yyyy")

    return [
      activity.id,
      typeName,
      activity.title || "",
      dateFormatted,
      activity.location || "",
      participants.length.toString(),
    ]
  })

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => {
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

// Export activities with participants (one row per participant)
export function exportActivitiesWithParticipantsToCSV(
  activities: Activity[],
  getParticipants: (id: string) => ActivityParticipant[],
  getTypeName: (typeId: string) => string,
  getMemberName: (memberId: string) => string,
): string {
  const headers = [
    "activityCode",
    "activityType",
    "activityTitle",
    "activityDate",
    "activityLocation",
    "memberId",
    "memberName",
    "participantStatus",
  ]

  const rows: string[][] = []

  for (const activity of activities) {
    const participants = getParticipants(activity.id)
    const typeName = getTypeName(activity.type_id)
    const dateFormatted = formatDate(new Date(activity.date_from), "dd.MM.yyyy")

    if (participants.length === 0) {
      // Include activity even if no participants
      rows.push([activity.id, typeName, activity.title || "", dateFormatted, activity.location || "", "", "", ""])
    } else {
      for (const participant of participants) {
        const memberName = getMemberName(participant.member_id)
        rows.push([
          activity.id,
          typeName,
          activity.title || "",
          dateFormatted,
          activity.location || "",
          participant.member_id,
          memberName,
          participant.status,
        ])
      }
    }
  }

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => {
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

// Download file helper
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
export function generateFilename(prefix: string, filterDescription: string, format: "csv"): string {
  const timestamp = formatDate(new Date(), "yyyy-MM-dd-HHmmss")
  const cleanDesc = filterDescription ? `-${filterDescription.replace(/[^a-z0-9]/gi, "-").toLowerCase()}` : ""
  return `${prefix}${cleanDesc}-${timestamp}.${format}`
}

// Parse CSV for import
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

// Parse date in DD.MM.YYYY format
function parseActivityDate(dateStr: string): string | null {
  try {
    // Try DD.MM.YYYY format
    if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(dateStr)) {
      const parsed = parse(dateStr, "dd.MM.yyyy", new Date())
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split("T")[0]
      }
    }

    // Try ISO format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const parsed = new Date(dateStr)
      if (!isNaN(parsed.getTime())) {
        return dateStr
      }
    }

    return null
  } catch {
    return null
  }
}

export interface ImportActivityResult {
  success: boolean
  added: number
  updated: number
  skipped: number
  errors: ImportActivityError[]
  activities?: Omit<Activity, "id" | "created_at" | "updated_at">[]
}

export interface ImportActivityError {
  row: number
  field?: string
  message: string
}

// Import activities from CSV
export function importActivitiesFromCSV(
  content: string,
  getTypeIdByName: (name: string) => string | undefined,
): ImportActivityResult {
  const errors: ImportActivityError[] = []
  const activities: Omit<Activity, "id" | "created_at" | "updated_at">[] = []
  let added = 0
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
    const typeIndex = headers.findIndex((h) => h === "type" || h === "tip")
    const titleIndex = headers.findIndex((h) => h === "title" || h === "titlu")
    const dateIndex = headers.findIndex((h) => h === "date" || h === "data" || h === "dată")
    const locationIndex = headers.findIndex((h) => h === "location" || h === "locatie" || h === "locație")

    if (typeIndex === -1) {
      return {
        success: false,
        added: 0,
        updated: 0,
        skipped: 0,
        errors: [{ row: 0, message: "Lipsește coloana obligatorie 'type' sau 'tip'" }],
      }
    }

    if (dateIndex === -1) {
      return {
        success: false,
        added: 0,
        updated: 0,
        skipped: 0,
        errors: [{ row: 0, message: "Lipsește coloana obligatorie 'date' sau 'data'" }],
      }
    }

    // Process data rows
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const typeName = row[typeIndex]?.trim()
      const title = titleIndex >= 0 ? row[titleIndex]?.trim() : undefined
      const dateStr = row[dateIndex]?.trim()
      const location = locationIndex >= 0 ? row[locationIndex]?.trim() : undefined

      // Validate type
      if (!typeName) {
        errors.push({ row: i + 1, field: "type", message: "Tipul activității este obligatoriu" })
        skipped++
        continue
      }

      const typeId = getTypeIdByName(typeName)
      if (!typeId) {
        errors.push({ row: i + 1, field: "type", message: `Tipul "${typeName}" nu a fost găsit în dicționar` })
        skipped++
        continue
      }

      // Validate date
      if (!dateStr) {
        errors.push({ row: i + 1, field: "date", message: "Data este obligatorie" })
        skipped++
        continue
      }

      const parsedDate = parseActivityDate(dateStr)
      if (!parsedDate) {
        errors.push({
          row: i + 1,
          field: "date",
          message: `Data "${dateStr}" nu este validă. Folosiți formatul DD.MM.YYYY`,
        })
        skipped++
        continue
      }

      activities.push({
        type_id: typeId,
        title,
        date_from: parsedDate,
        location,
      })
      added++
    }

    return {
      success: errors.length === 0,
      added,
      updated: 0,
      skipped,
      errors,
      activities,
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

// Generate CSV template
export function generateActivitiesCSVTemplate(): string {
  return "type,title,date,location\nSport,Fotbal în parc,15.01.2025,Parcul Central\nTeatru,Hamlet,20.02.2025,Teatrul Național"
}
