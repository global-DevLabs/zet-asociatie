import type { Member, Payment, Activity, MemberGroup, ActivityParticipant } from "@/types"
import * as XLSX from "xlsx"

export type AnalyticsFilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "in"
  | "between"
  | "greater_than"
  | "less_than"

export interface AnalyticsDateFilter {
  from?: string
  to?: string
}

export interface AnalyticsFilter {
  // Member filters
  ranks?: string[]
  units?: string[]
  profiles?: string[]
  carMemberStatus?: string[]
  foundationMemberStatus?: string[]
  employmentStatus?: string[]
  whatsappGroups?: string[]
  needs?: string[]
  statuses?: string[] // "Activ" | "Retras"

  // Activity filters
  activityTypes?: string[]
  activityDateRange?: AnalyticsDateFilter

  // Payment filters
  paymentYears?: number[]
  paymentTypes?: string[]
  paymentMethods?: string[]
  paymentStatuses?: string[]

  // Date filters
  enrollmentYearRange?: { from?: number; to?: number }
  retirementYearRange?: { from?: number; to?: number }
  ageRange?: { from?: number; to?: number }
}

export type GroupByDimension =
  | "year"
  | "month"
  | "unit"
  | "rank"
  | "profile"
  | "activityType"
  | "whatsappGroup"
  | "paymentType"
  | "memberStatus"
  | "paymentMethod"
  | "contributionYear"

export type MetricType =
  | "memberCount"
  | "activityCount"
  | "paymentCount"
  | "totalAmount"
  | "averagePerMember"
  | "participationRate"
  | "growthRate"

export type ChartType = "line" | "bar" | "stacked-bar" | "pie" | "donut" | "table"

export interface AnalyticsMetric {
  type: MetricType
  label: string
}

export interface AnalyticsQuery {
  filters: AnalyticsFilter
  groupBy: GroupByDimension[]
  metrics: AnalyticsMetric[]
  chartType: ChartType
  name?: string
  id?: string
}

export interface AnalyticsDataPoint {
  label: string
  [key: string]: number | string // Dynamic metric values
}

export interface AnalyticsResult {
  data: AnalyticsDataPoint[]
  totalRecords: number
  query: AnalyticsQuery
  generatedAt: string
}

export class AdvancedAnalyticsEngine {
  // Apply filters to members
  static filterMembers(members: Member[], filters: AnalyticsFilter): Member[] {
    return members.filter((member) => {
      // Rank filter
      if (filters.ranks && filters.ranks.length > 0 && !filters.ranks.includes(member.rank)) {
        return false
      }

      // Unit filter
      if (filters.units && filters.units.length > 0 && !filters.units.includes(member.unit)) {
        return false
      }

      // Profile filter
      if (filters.profiles && filters.profiles.length > 0 && !filters.profiles.includes(member.mainProfile)) {
        return false
      }

      // Status filter
      if (filters.statuses && filters.statuses.length > 0 && !filters.statuses.includes(member.status || "Activ")) {
        return false
      }

      // CAR member status
      if (filters.carMemberStatus && filters.carMemberStatus.length > 0) {
        if (!filters.carMemberStatus.includes(member.carMemberStatus || "Nu")) {
          return false
        }
      }

      // Foundation member status
      if (filters.foundationMemberStatus && filters.foundationMemberStatus.length > 0) {
        if (!filters.foundationMemberStatus.includes(member.foundationMemberStatus || "Nu")) {
          return false
        }
      }

      // Employment status
      if (filters.employmentStatus && filters.employmentStatus.length > 0) {
        if (!filters.employmentStatus.includes(member.hasCurrentWorkplace || "Nu")) {
          return false
        }
      }

      // WhatsApp Groups (check if member is in any of the selected groups)
      if (filters.whatsappGroups && filters.whatsappGroups.length > 0) {
        const memberGroupIds = member.whatsappGroupIds || []
        const hasMatch = filters.whatsappGroups.some((gid) => memberGroupIds.includes(gid))
        if (!hasMatch) return false
      }

      // Needs filter (search in all needs fields)
      if (filters.needs && filters.needs.length > 0) {
        const allNeeds = [member.branchNeeds, member.foundationNeeds, member.otherNeeds]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        const hasMatch = filters.needs.some((need) => allNeeds.includes(need.toLowerCase()))
        if (!hasMatch) return false
      }

      // Enrollment year range
      if (filters.enrollmentYearRange) {
        const year = member.branchEnrollmentYear
        if (year) {
          if (filters.enrollmentYearRange.from && year < filters.enrollmentYearRange.from) return false
          if (filters.enrollmentYearRange.to && year > filters.enrollmentYearRange.to) return false
        } else {
          return false
        }
      }

      // Retirement year range
      if (filters.retirementYearRange) {
        const year = member.retirementYear
        if (year) {
          if (filters.retirementYearRange.from && year < filters.retirementYearRange.from) return false
          if (filters.retirementYearRange.to && year > filters.retirementYearRange.to) return false
        } else {
          return false
        }
      }

      // Age range
      if (filters.ageRange) {
        const birthYear = member.dateOfBirth ? new Date(member.dateOfBirth).getFullYear() : null
        if (birthYear) {
          const age = new Date().getFullYear() - birthYear
          if (filters.ageRange.from && age < filters.ageRange.from) return false
          if (filters.ageRange.to && age > filters.ageRange.to) return false
        } else {
          return false
        }
      }

      return true
    })
  }

  // Apply filters to payments
  static filterPayments(payments: Payment[], filters: AnalyticsFilter): Payment[] {
    return payments.filter((payment) => {
      // Payment year filter
      if (filters.paymentYears && filters.paymentYears.length > 0 && !filters.paymentYears.includes(payment.year)) {
        return false
      }

      // Payment type filter
      if (
        filters.paymentTypes &&
        filters.paymentTypes.length > 0 &&
        !filters.paymentTypes.includes(payment.paymentType)
      ) {
        return false
      }

      // Payment method filter
      if (
        filters.paymentMethods &&
        filters.paymentMethods.length > 0 &&
        !filters.paymentMethods.includes(payment.method)
      ) {
        return false
      }

      // Payment status filter
      if (
        filters.paymentStatuses &&
        filters.paymentStatuses.length > 0 &&
        !filters.paymentStatuses.includes(payment.status)
      ) {
        return false
      }

      return true
    })
  }

  // Apply filters to activities
  static filterActivities(activities: Activity[], filters: AnalyticsFilter): Activity[] {
    return activities.filter((activity) => {
      // Activity type filter
      if (
        filters.activityTypes &&
        filters.activityTypes.length > 0 &&
        !filters.activityTypes.includes(activity.type_id)
      ) {
        return false
      }

      // Activity date range
      if (filters.activityDateRange) {
        const activityDate = new Date(activity.date_from)
        if (filters.activityDateRange.from && activityDate < new Date(filters.activityDateRange.from)) {
          return false
        }
        if (filters.activityDateRange.to && activityDate > new Date(filters.activityDateRange.to)) {
          return false
        }
      }

      return true
    })
  }

  // Group data by dimension
  static groupData<T>(
    items: T[],
    dimension: GroupByDimension,
    getValueFn: (item: T) => string | number | undefined,
  ): Map<string, T[]> {
    const groups = new Map<string, T[]>()

    for (const item of items) {
      const value = getValueFn(item)
      const key = value !== undefined && value !== null ? String(value) : "Necunoscut"

      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(item)
    }

    return groups
  }

  // Calculate metrics
  static calculateMetric(items: any[], metric: MetricType, allMembers: Member[], allPayments: Payment[]): number {
    switch (metric) {
      case "memberCount":
        return items.filter((i) => i.id && i.memberCode).length

      case "activityCount":
        return items.filter((i) => i.id && i.type_id).length

      case "paymentCount":
        return items.filter((i) => i.id && i.amount !== undefined).length

      case "totalAmount":
        return items.reduce((sum, i) => sum + (i.amount || 0), 0)

      case "averagePerMember":
        const totalAmount = items.reduce((sum, i) => sum + (i.amount || 0), 0)
        const memberCount = new Set(items.map((i) => i.memberId).filter(Boolean)).size
        return memberCount > 0 ? totalAmount / memberCount : 0

      case "participationRate":
        // Calculate what % of members participated in activities
        const participatingMembers = new Set(items.map((i) => i.member_id || i.memberId).filter(Boolean)).size
        const totalMembers = allMembers.length
        return totalMembers > 0 ? (participatingMembers / totalMembers) * 100 : 0

      case "growthRate":
        // Calculate year-over-year growth (requires time-series data)
        return 0 // Requires more complex calculation

      default:
        return 0
    }
  }

  // Execute analytics query
  static executeQuery(
    query: AnalyticsQuery,
    members: Member[],
    payments: Payment[],
    activities: Activity[],
    activityParticipants: ActivityParticipant[],
    memberGroups: MemberGroup[],
  ): AnalyticsResult {
    // Filter data
    const filteredMembers = this.filterMembers(members, query.filters)
    const filteredPayments = this.filterPayments(payments, query.filters)
    const filteredActivities = this.filterActivities(activities, query.filters)

    // Determine primary data source based on metrics
    const hasPaymentMetrics = query.metrics.some((m) =>
      ["paymentCount", "totalAmount", "averagePerMember"].includes(m.type),
    )
    const hasActivityMetrics = query.metrics.some((m) => ["activityCount", "participationRate"].includes(m.type))

    let dataPoints: AnalyticsDataPoint[] = []

    // If no grouping, calculate overall metrics
    if (query.groupBy.length === 0) {
      const point: AnalyticsDataPoint = {
        label: "Total",
      }

      for (const metric of query.metrics) {
        if (hasPaymentMetrics) {
          point[metric.label] = this.calculateMetric(filteredPayments, metric.type, members, payments)
        } else if (hasActivityMetrics) {
          point[metric.label] = this.calculateMetric(filteredActivities, metric.type, members, payments)
        } else {
          point[metric.label] = this.calculateMetric(filteredMembers, metric.type, members, payments)
        }
      }

      dataPoints = [point]
    } else {
      // Group by first dimension (support for multiple dimensions would be more complex)
      const primaryDimension = query.groupBy[0]

      let groups: Map<string, any[]>

      if (hasPaymentMetrics) {
        groups = this.groupDataByDimension(filteredPayments, primaryDimension, filteredMembers)
      } else if (hasActivityMetrics) {
        groups = this.groupDataByDimension(filteredActivities, primaryDimension, filteredMembers)
      } else {
        groups = this.groupDataByDimension(filteredMembers, primaryDimension, filteredMembers)
      }

      // Calculate metrics for each group
      for (const [groupLabel, groupItems] of groups.entries()) {
        const point: AnalyticsDataPoint = {
          label: groupLabel,
        }

        for (const metric of query.metrics) {
          point[metric.label] = this.calculateMetric(groupItems, metric.type, members, payments)
        }

        dataPoints.push(point)
      }
    }

    // Sort data points by label
    dataPoints.sort((a, b) => {
      // Try numeric sort first
      const aNum = Number(a.label)
      const bNum = Number(b.label)
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum
      }
      // Fall back to string sort
      return String(a.label).localeCompare(String(b.label))
    })

    return {
      data: dataPoints,
      totalRecords: dataPoints.length,
      query,
      generatedAt: new Date().toISOString(),
    }
  }

  private static groupDataByDimension(
    items: any[],
    dimension: GroupByDimension,
    members: Member[],
  ): Map<string, any[]> {
    switch (dimension) {
      case "year":
        return this.groupData(items, dimension, (item) => {
          if (item.date) return new Date(item.date).getFullYear()
          if (item.date_from) return new Date(item.date_from).getFullYear()
          if (item.year) return item.year
          if (item.branchEnrollmentYear) return item.branchEnrollmentYear
          return undefined
        })

      case "month":
        return this.groupData(items, dimension, (item) => {
          if (item.date) return new Date(item.date).toISOString().substring(0, 7) // YYYY-MM
          if (item.date_from) return new Date(item.date_from).toISOString().substring(0, 7)
          return undefined
        })

      case "unit":
        return this.groupData(items, dimension, (item) => item.unit)

      case "rank":
        return this.groupData(items, dimension, (item) => item.rank)

      case "profile":
        return this.groupData(items, dimension, (item) => item.mainProfile)

      case "activityType":
        return this.groupData(items, dimension, (item) => item.type_id || item.activityType)

      case "paymentType":
        return this.groupData(items, dimension, (item) => item.paymentType)

      case "paymentMethod":
        return this.groupData(items, dimension, (item) => item.method)

      case "memberStatus":
        return this.groupData(items, dimension, (item) => item.status || "Activ")

      case "contributionYear":
        return this.groupData(items, dimension, (item) => item.contributionYear || item.year)

      default:
        return new Map([["All", items]])
    }
  }

  // Export to CSV
  static exportToCSV(result: AnalyticsResult, filename: string): void {
    const headers = ["Label", ...result.query.metrics.map((m) => m.label)]
    const rows = result.data.map((point) => [point.label, ...result.query.metrics.map((m) => point[m.label] || 0)])

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

    // Add UTF-8 BOM for Excel compatibility
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
  }

  // Export to XLSX
  static exportToXLSX(result: AnalyticsResult, filename: string): void {
    const data = result.data.map((point) => {
      const row: any = { Label: point.label }
      for (const metric of result.query.metrics) {
        row[metric.label] = point[metric.label] || 0
      }
      return row
    })

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Analytics")

    XLSX.writeFile(workbook, filename)
  }

  // Generate filename with timestamp
  static generateFilename(query: AnalyticsQuery, format: "csv" | "xlsx"): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19)
    const name = query.name || "analytics-report"
    return `${name}-${timestamp}.${format}`
  }
}
