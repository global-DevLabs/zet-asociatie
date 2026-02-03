import type { Member, Payment, Activity, WhatsAppGroup, ActivityType } from "@/types"
import { format as formatDate } from "date-fns"

export type ChartType = "line" | "bar" | "stacked-bar" | "pie" | "table"
export type MetricType =
  | "member_count"
  | "activity_count"
  | "payment_count"
  | "total_amount"
  | "average_per_member"
  | "participation_rate"

export type GroupByOption =
  | "year"
  | "month"
  | "unit"
  | "rank"
  | "profile"
  | "activity_type"
  | "whatsapp_group"
  | "payment_type"
  | "member_status"

export interface AnalyticsFilters {
  // Date ranges
  dateFrom?: string
  dateTo?: string

  // Member attributes
  ranks?: string[]
  units?: string[]
  profiles?: string[]
  carMemberStatus?: ("Da" | "Nu")[]
  foundationMemberStatus?: ("Da" | "Nu")[]
  hasCurrentWorkplace?: ("Da" | "Nu")[]
  whatsappGroupIds?: string[]
  needs?: string[]
  memberStatus?: ("Activ" | "Retras")[]

  // Activity attributes
  activityTypes?: string[]
  activityDateFrom?: string
  activityDateTo?: string
  participated?: boolean // filter members who participated in activities

  // Payment attributes
  paymentYears?: number[]
  paymentTypes?: string[]
  paymentMethods?: string[]
  paymentStatuses?: string[]
}

export interface AnalyticsConfig {
  filters: AnalyticsFilters
  groupBy: GroupByOption[]
  metrics: MetricType[]
  chartType: ChartType
  title?: string
}

export interface AnalyticsDataPoint {
  label: string
  [key: string]: string | number
}

export interface AnalyticsResult {
  data: AnalyticsDataPoint[]
  config: AnalyticsConfig
  generatedAt: string
  metadata: {
    totalMembers: number
    totalPayments: number
    totalActivities: number
    filtersApplied: number
  }
}

export class AnalyticsEngine {
  static applyFilters(
    members: Member[],
    payments: Payment[],
    activities: Activity[],
    activityParticipants: any[],
    filters: AnalyticsFilters,
  ): { filteredMembers: Member[]; filteredPayments: Payment[]; filteredActivities: Activity[] } {
    let filteredMembers = [...members]
    let filteredPayments = [...payments]
    let filteredActivities = [...activities]

    // Date range filter (for member enrollment/retirement)
    if (filters.dateFrom || filters.dateTo) {
      filteredMembers = filteredMembers.filter((m) => {
        const enrollmentDate = m.branchEnrollmentYear ? new Date(m.branchEnrollmentYear, 0, 1) : null
        if (!enrollmentDate) return false

        if (filters.dateFrom && enrollmentDate < new Date(filters.dateFrom)) return false
        if (filters.dateTo && enrollmentDate > new Date(filters.dateTo)) return false
        return true
      })
    }

    // Member attribute filters
    if (filters.ranks && filters.ranks.length > 0) {
      filteredMembers = filteredMembers.filter((m) => filters.ranks!.includes(m.rank))
    }

    if (filters.units && filters.units.length > 0) {
      filteredMembers = filteredMembers.filter((m) => filters.units!.includes(m.unit))
    }

    if (filters.profiles && filters.profiles.length > 0) {
      filteredMembers = filteredMembers.filter((m) => filters.profiles!.includes(m.mainProfile))
    }

    if (filters.carMemberStatus && filters.carMemberStatus.length > 0) {
      filteredMembers = filteredMembers.filter(
        (m) => m.carMemberStatus && filters.carMemberStatus!.includes(m.carMemberStatus),
      )
    }

    if (filters.foundationMemberStatus && filters.foundationMemberStatus.length > 0) {
      filteredMembers = filteredMembers.filter(
        (m) => m.foundationMemberStatus && filters.foundationMemberStatus!.includes(m.foundationMemberStatus),
      )
    }

    if (filters.hasCurrentWorkplace && filters.hasCurrentWorkplace.length > 0) {
      filteredMembers = filteredMembers.filter(
        (m) => m.hasCurrentWorkplace && filters.hasCurrentWorkplace!.includes(m.hasCurrentWorkplace),
      )
    }

    if (filters.whatsappGroupIds && filters.whatsappGroupIds.length > 0) {
      filteredMembers = filteredMembers.filter((m) =>
        m.whatsappGroupIds?.some((gid) => filters.whatsappGroupIds!.includes(gid)),
      )
    }

    if (filters.memberStatus && filters.memberStatus.length > 0) {
      filteredMembers = filteredMembers.filter((m) => m.status && filters.memberStatus!.includes(m.status))
    }

    // Activity filters
    if (filters.activityTypes && filters.activityTypes.length > 0) {
      filteredActivities = filteredActivities.filter((a) => filters.activityTypes!.includes(a.type_id))
    }

    if (filters.activityDateFrom || filters.activityDateTo) {
      filteredActivities = filteredActivities.filter((a) => {
        const actDate = new Date(a.date_from)
        if (filters.activityDateFrom && actDate < new Date(filters.activityDateFrom)) return false
        if (filters.activityDateTo && actDate > new Date(filters.activityDateTo)) return false
        return true
      })
    }

    // Filter members by activity participation
    if (filters.participated !== undefined) {
      const memberIdsInActivities = new Set(activityParticipants.map((p: any) => p.member_id))
      if (filters.participated) {
        filteredMembers = filteredMembers.filter((m) => memberIdsInActivities.has(m.id))
      } else {
        filteredMembers = filteredMembers.filter((m) => !memberIdsInActivities.has(m.id))
      }
    }

    // Payment filters
    if (filters.paymentYears && filters.paymentYears.length > 0) {
      filteredPayments = filteredPayments.filter((p) => filters.paymentYears!.includes(p.year))
    }

    if (filters.paymentTypes && filters.paymentTypes.length > 0) {
      filteredPayments = filteredPayments.filter((p) => filters.paymentTypes!.includes(p.paymentType))
    }

    if (filters.paymentMethods && filters.paymentMethods.length > 0) {
      filteredPayments = filteredPayments.filter((p) => filters.paymentMethods!.includes(p.method))
    }

    if (filters.paymentStatuses && filters.paymentStatuses.length > 0) {
      filteredPayments = filteredPayments.filter((p) => filters.paymentStatuses!.includes(p.status))
    }

    // Filter payments to only include those from filtered members
    const filteredMemberIds = new Set(filteredMembers.map((m) => m.id))
    filteredPayments = filteredPayments.filter((p) => filteredMemberIds.has(p.memberId))

    return { filteredMembers, filteredPayments, filteredActivities }
  }

  static generateAnalytics(
    members: Member[],
    payments: Payment[],
    activities: Activity[],
    activityTypes: ActivityType[],
    whatsappGroups: WhatsAppGroup[],
    activityParticipants: any[],
    config: AnalyticsConfig,
  ): AnalyticsResult {
    // Apply filters
    const { filteredMembers, filteredPayments, filteredActivities } = this.applyFilters(
      members,
      payments,
      activities,
      activityParticipants,
      config.filters,
    )

    // Generate data based on groupBy and metrics
    const data = this.groupAndAggregate(
      filteredMembers,
      filteredPayments,
      filteredActivities,
      activityTypes,
      whatsappGroups,
      activityParticipants,
      config,
    )

    return {
      data,
      config,
      generatedAt: new Date().toISOString(),
      metadata: {
        totalMembers: filteredMembers.length,
        totalPayments: filteredPayments.length,
        totalActivities: filteredActivities.length,
        filtersApplied: Object.keys(config.filters).filter((k) => {
          const val = config.filters[k as keyof AnalyticsFilters]
          return val !== undefined && (Array.isArray(val) ? val.length > 0 : true)
        }).length,
      },
    }
  }

  private static groupAndAggregate(
    members: Member[],
    payments: Payment[],
    activities: Activity[],
    activityTypes: ActivityType[],
    whatsappGroups: WhatsAppGroup[],
    activityParticipants: any[],
    config: AnalyticsConfig,
  ): AnalyticsDataPoint[] {
    const grouped: Record<string, any> = {}

    // Determine primary grouping (use first groupBy option)
    const primaryGroup = config.groupBy[0] || "year"

    // Create groups
    if (primaryGroup === "year") {
      const years = new Set<number>()
      members.forEach((m) => m.branchEnrollmentYear && years.add(m.branchEnrollmentYear))
      payments.forEach((p) => p.year && years.add(p.year))
      activities.forEach((a) => {
        const year = new Date(a.date_from).getFullYear()
        if (year && !isNaN(year)) years.add(year)
      })

      Array.from(years)
        .filter((year) => year != null && !isNaN(year))
        .sort()
        .forEach((year) => {
          grouped[year.toString()] = { label: year.toString() }
        })
    } else if (primaryGroup === "month") {
      const months = new Set<string>()
      activities.forEach((a) => {
        if (a.date_from) {
          const month = formatDate(new Date(a.date_from), "yyyy-MM")
          months.add(month)
        }
      })
      payments.forEach((p) => {
        if (p.year) {
          const month = `${p.year}-01`
          months.add(month)
        }
      })

      Array.from(months)
        .sort()
        .forEach((month) => {
          grouped[month] = { label: formatDate(new Date(month), "MMM yyyy") }
        })
    } else if (primaryGroup === "unit") {
      const units = new Set(members.map((m) => m.unit).filter((u) => u != null && u !== ""))
      units.forEach((unit) => {
        grouped[unit] = { label: unit }
      })
    } else if (primaryGroup === "rank") {
      const ranks = new Set(members.map((m) => m.rank).filter((r) => r != null && r !== ""))
      ranks.forEach((rank) => {
        grouped[rank] = { label: rank }
      })
    } else if (primaryGroup === "profile") {
      const profiles = new Set(members.map((m) => m.mainProfile).filter((p) => p != null && p !== ""))
      profiles.forEach((profile) => {
        grouped[profile] = { label: profile }
      })
    } else if (primaryGroup === "activity_type") {
      activityTypes.forEach((at) => {
        if (at.id && at.name) {
          grouped[at.id] = { label: at.name }
        }
      })
    } else if (primaryGroup === "whatsapp_group") {
      whatsappGroups.forEach((wg) => {
        if (wg.id && wg.name) {
          grouped[wg.id] = { label: wg.name }
        }
      })
    } else if (primaryGroup === "payment_type") {
      const types = new Set(payments.map((p) => p.paymentType).filter((t) => t != null && t !== ""))
      types.forEach((type) => {
        grouped[type] = { label: type }
      })
    } else if (primaryGroup === "member_status") {
      grouped["Activ"] = { label: "Activ" }
      grouped["Retras"] = { label: "Retras" }
    }

    // Calculate metrics for each group
    config.metrics.forEach((metric) => {
      Object.keys(grouped).forEach((groupKey) => {
        let value = 0

        if (metric === "member_count") {
          value = members.filter((m) => this.belongsToGroup(m, primaryGroup, groupKey)).length
        } else if (metric === "activity_count") {
          value = activities.filter((a) => this.belongsToGroup(a, primaryGroup, groupKey, activityTypes)).length
        } else if (metric === "payment_count") {
          value = payments.filter((p) => this.belongsToGroup(p, primaryGroup, groupKey)).length
        } else if (metric === "total_amount") {
          value = payments
            .filter((p) => this.belongsToGroup(p, primaryGroup, groupKey))
            .reduce((sum, p) => sum + p.amount, 0)
        } else if (metric === "average_per_member") {
          const groupMembers = members.filter((m) => this.belongsToGroup(m, primaryGroup, groupKey))
          const groupPayments = payments.filter((p) => groupMembers.some((m) => m.id === p.memberId))
          const total = groupPayments.reduce((sum, p) => sum + p.amount, 0)
          value = groupMembers.length > 0 ? total / groupMembers.length : 0
        } else if (metric === "participation_rate") {
          const groupMembers = members.filter((m) => this.belongsToGroup(m, primaryGroup, groupKey))
          const participantIds = new Set(activityParticipants.map((p: any) => p.member_id))
          const participatedCount = groupMembers.filter((m) => participantIds.has(m.id)).length
          value = groupMembers.length > 0 ? (participatedCount / groupMembers.length) * 100 : 0
        }

        grouped[groupKey][this.getMetricLabel(metric)] = Math.round(value * 100) / 100
      })
    })

    return Object.values(grouped)
  }

  private static belongsToGroup(
    item: Member | Payment | Activity,
    groupBy: GroupByOption,
    groupKey: string,
    activityTypes?: ActivityType[],
  ): boolean {
    if ("branchEnrollmentYear" in item) {
      // Member
      const member = item as Member
      if (groupBy === "year") return member.branchEnrollmentYear?.toString() === groupKey
      if (groupBy === "unit") return member.unit === groupKey
      if (groupBy === "rank") return member.rank === groupKey
      if (groupBy === "profile") return member.mainProfile === groupKey
      if (groupBy === "whatsapp_group") return member.whatsappGroupIds?.includes(groupKey) || false
      if (groupBy === "member_status") return (member.status || "Activ") === groupKey
    } else if ("paymentType" in item) {
      // Payment
      const payment = item as Payment
      if (groupBy === "year") return payment.year != null ? payment.year.toString() === groupKey : false
      if (groupBy === "payment_type") return payment.paymentType === groupKey
      if (groupBy === "month") {
        if (!payment.year) return false
        const paymentMonth = `${payment.year}-01`
        return paymentMonth === groupKey
      }
    } else if ("type_id" in item) {
      // Activity
      const activity = item as Activity
      if (groupBy === "year") {
        if (!activity.date_from) return false
        const year = new Date(activity.date_from).getFullYear()
        return !isNaN(year) ? year.toString() === groupKey : false
      }
      if (groupBy === "month") {
        if (!activity.date_from) return false
        const activityMonth = formatDate(new Date(activity.date_from), "yyyy-MM")
        return activityMonth === groupKey
      }
      if (groupBy === "activity_type") return activity.type_id === groupKey
    }

    return false
  }

  private static getMetricLabel(metric: MetricType): string {
    const labels: Record<MetricType, string> = {
      member_count: "Membri",
      activity_count: "Activități",
      payment_count: "Plăți",
      total_amount: "Total (RON)",
      average_per_member: "Medie/Membru (RON)",
      participation_rate: "Participare (%)",
    }
    return labels[metric]
  }

  static exportToCSV(result: AnalyticsResult): string {
    const headers = ["Label", ...result.config.metrics.map((m) => this.getMetricLabel(m))]
    const rows = result.data.map((d) => {
      return [d.label, ...result.config.metrics.map((m) => d[this.getMetricLabel(m)] || 0)]
    })

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n")

    // Add UTF-8 BOM for Excel compatibility
    return "\uFEFF" + csvContent
  }

  static generateFilename(config: AnalyticsConfig): string {
    const timestamp = formatDate(new Date(), "yyyy-MM-dd-HHmmss")
    const title = config.title?.replace(/[^a-z0-9]/gi, "_") || "analytics"
    return `${title}_${timestamp}`
  }
}
