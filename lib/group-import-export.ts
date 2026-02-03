import type { Member } from "@/types"
import * as XLSX from "xlsx"

export interface GroupImportResult {
  success: boolean
  added: number
  skipped: number
  errors: string[]
  validMemberIds: string[]
}

export function parseGroupMembersCSV(csvText: string, allMembers: Member[]): GroupImportResult {
  const lines = csvText.trim().split("\n")
  const validMemberIds: string[] = []
  const errors: string[] = []
  let skipped = 0

  // Skip header if present
  const startIndex = lines[0]?.toLowerCase().includes("member") ? 1 : 0

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const columns = line.split(",").map((col) => col.trim().replace(/^["']|["']$/g, ""))
    const memberId = columns[0]

    if (!memberId) {
      errors.push(`Rând ${i + 1}: Lipsește member_id`)
      continue
    }

    // Validate member exists
    const memberExists = allMembers.some((m) => m.id === memberId || m.memberCode === memberId)
    if (!memberExists) {
      errors.push(`Rând ${i + 1}: Membru ${memberId} nu există`)
      skipped++
      continue
    }

    // Find actual member ID (in case memberCode was provided)
    const member = allMembers.find((m) => m.id === memberId || m.memberCode === memberId)
    if (member) {
      validMemberIds.push(member.id)
    }
  }

  return {
    success: errors.length === 0,
    added: validMemberIds.length,
    skipped,
    errors,
    validMemberIds,
  }
}

export function parseGroupMembersXLSX(file: ArrayBuffer, allMembers: Member[]): GroupImportResult {
  const workbook = XLSX.read(file, { type: "array" })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

  const validMemberIds: string[] = []
  const errors: string[] = []
  let skipped = 0

  // Skip header row
  const startIndex = 1

  for (let i = startIndex; i < data.length; i++) {
    const row = data[i]
    if (!row || row.length === 0) continue

    const memberId = String(row[0] || "").trim()

    if (!memberId) {
      errors.push(`Rând ${i + 1}: Lipsește member_id`)
      continue
    }

    // Validate member exists
    const member = allMembers.find((m) => m.id === memberId || m.memberCode === memberId)
    if (!member) {
      errors.push(`Rând ${i + 1}: Membru ${memberId} nu există`)
      skipped++
      continue
    }

    validMemberIds.push(member.id)
  }

  return {
    success: errors.length === 0,
    added: validMemberIds.length,
    skipped,
    errors,
    validMemberIds,
  }
}

export function exportGroupMembersToCSV(members: (Member & { joinedAt?: string })[], groupName: string): void {
  const headers = ["member_id", "member_code", "name", "rank", "unit", "status", "joined_at"]
  const rows = members.map((m) => [
    m.id,
    m.memberCode,
    `${m.firstName} ${m.lastName}`,
    m.rank,
    m.unit,
    m.status || "Activ",
    m.joinedAt || "",
  ])

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

  // Add BOM for Excel UTF-8 support
  const bom = "\uFEFF"
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `group-${groupName.replace(/\s+/g, "-").toLowerCase()}-membri-${new Date().toISOString().split("T")[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function downloadGroupMembersTemplate(format: "csv" | "xlsx"): void {
  if (format === "csv") {
    const headers = ["member_id", "notes"]
    const exampleRow = ["01001", "Optional note"]
    const csv = [headers, exampleRow].map((row) => row.join(",")).join("\n")

    const bom = "\uFEFF"
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `template-import-membri-grup.csv`
    link.click()
    URL.revokeObjectURL(url)
  } else {
    // XLSX template
    const ws = XLSX.utils.aoa_to_sheet([
      ["member_id", "notes"],
      ["01001", "Optional note"],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Members")
    XLSX.writeFile(wb, `template-import-membri-grup.xlsx`)
  }
}
