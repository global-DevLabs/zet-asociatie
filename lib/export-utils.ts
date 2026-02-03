import type { Member } from "@/types"
import { calculateAge, displayMemberCode } from "./utils"
import { format as formatDate } from "date-fns"

export type ExportFormat = "csv" | "xlsx"
export type ExportSortBy = "name" | "memberCode" | "enrollmentYear" | "rank"

export interface ExportOptions {
  format: ExportFormat
  fields: ExportField[]
  sortBy: ExportSortBy
}

export interface ExportField {
  key: keyof Member | "age"
  label: string
  sensitive?: boolean // Sensitive fields only for admin
}

export const EXPORT_FIELDS: ExportField[] = [
  { key: "memberCode", label: "ID Membru" },
  { key: "firstName", label: "Nume" },
  { key: "lastName", label: "Prenume" },
  { key: "age", label: "Vârstă" },
  { key: "dateOfBirth", label: "Data Nașterii", sensitive: true },
  { key: "cnp", label: "CNP", sensitive: true },
  { key: "rank", label: "Grad" },
  { key: "unit", label: "UM" },
  { key: "mainProfile", label: "Profil Principal" },
  { key: "status", label: "Status" },
  { key: "branchEnrollmentYear", label: "An Înscriere" },
  { key: "retirementYear", label: "An Pensionare" },
  { key: "provenance", label: "Proveniență" },
  { key: "phone", label: "Telefon", sensitive: true },
  { key: "email", label: "Email", sensitive: true },
  { key: "address", label: "Adresă", sensitive: true },
]

export function sortMembers(members: Member[], sortBy: ExportSortBy): Member[] {
  const sorted = [...members]

  switch (sortBy) {
    case "name":
      return sorted.sort((a, b) => {
        const nameA = `${a.lastName} ${a.firstName}`.toLowerCase()
        const nameB = `${b.lastName} ${b.firstName}`.toLowerCase()
        return nameA.localeCompare(nameB)
      })
    case "memberCode":
      return sorted.sort((a, b) => (a.memberCode || a.id).localeCompare(b.memberCode || b.id))
    case "enrollmentYear":
      return sorted.sort((a, b) => (b.branchEnrollmentYear || 0) - (a.branchEnrollmentYear || 0))
    case "rank":
      return sorted.sort((a, b) => a.rank.localeCompare(b.rank))
    default:
      return sorted
  }
}

export function generateCSV(
  members: Member[],
  fields: ExportField[],
  sortBy: ExportSortBy,
  getUnitDisplay: (code: string) => string,
): string {
  const sortedMembers = sortMembers(members, sortBy)

  // Header row
  const headers = fields.map((f) => f.label).join(",")

  // Data rows
  const rows = sortedMembers.map((member) => {
    return fields
      .map((field) => {
        let value: any

        if (field.key === "age") {
          const age = calculateAge(member.dateOfBirth)
          value = age !== null ? age : ""
        } else if (field.key === "memberCode") {
          value = displayMemberCode(member.memberCode) || ""
        } else if (field.key === "unit" && member.unit) {
          value = getUnitDisplay(member.unit)
        } else if (field.key === "dateOfBirth" && member.dateOfBirth) {
          value = formatDate(new Date(member.dateOfBirth), "dd.MM.yyyy")
        } else {
          value = member[field.key as keyof Member] || ""
        }

        // Escape CSV special characters
        const stringValue = String(value)
        if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      })
      .join(",")
  })

  return [headers, ...rows].join("\n")
}

export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function generateFilename(format: ExportFormat, filterDescription?: string): string {
  const date = formatDate(new Date(), "yyyy-MM-dd")
  const desc = filterDescription ? `_${filterDescription.replace(/\s+/g, "-").toLowerCase()}` : ""
  return `members_export_${date}${desc}.${format}`
}
