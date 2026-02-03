export type Rank = string
export type Unit = string
export type Profile = string
export type PaymentMethod = "Numerar" | "Card / Online" | "Transfer Bancar"
export type PaymentStatus = "Plătită" | "Scadentă" | "Restanță"
export type PaymentType = "Taxă de înscriere" | "Cotizație" | "Taxă de reînscriere"
export type MemberStatus = "Activ" | "Retras"
export type WithdrawalReason =
  | "Retras la cerere"
  | "Plecat în alt județ"
  | "Reactivat"
  | "Decedat"
  | "Exclus disciplinar"
  | "Neplată cotizație"
export type MemberProvenance = "Prin pensionare" | "Sosit din alt județ" | "Prin reînscriere" | "Prin demisie"

export type YesNo = "Da" | "Nu"
export type FoundationRole = "Beneficiar program" | "Voluntar" | "Altul"
export type ActivityParticipantStatus = "invited" | "attended" | "organizer"
export type WhatsAppGroupStatus = "Active" | "Archived"
export type ActivityStatus = "active" | "archived"

export interface UnitItem {
  code: string
  description?: string
}

export interface Payment {
  id: string // payment_code: P-######
  memberId: string
  date: string // ISO date string
  year: number
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  paymentType: PaymentType
  contributionYear?: number
  observations?: string
  source?: string
  receiptNumber?: string
  legacyPaymentId?: string // Old format: PAY-MEM-####-####
}

export interface Member {
  id: string
  memberCode: string // 5-digit numeric display ID like "01046"
  status?: MemberStatus
  // Personal Data
  rank: Rank
  firstName: string
  lastName: string
  dateOfBirth: string // ISO date string
  cnp?: string
  birthplace?: string
  unit: Unit
  mainProfile: Profile

  // Retirement
  retirementYear?: number
  retirementDecisionNumber?: string
  retirementFileNumber?: string

  // Branch Info
  branchEnrollmentYear?: number
  branchWithdrawalYear?: number
  branchWithdrawalReason?: string
  withdrawalReason?: WithdrawalReason
  withdrawalYear?: number
  provenance?: MemberProvenance

  // Contact
  address?: string
  phone?: string
  email?: string

  // Qualitative Data (Activities)
  whatsappGroupIds?: string[] // Changed from whatsappGroups to whatsappGroupIds for many-to-many relationship
  organizationInvolvement?: string
  magazineContributions?: string

  // Needs
  branchNeeds?: string
  foundationNeeds?: string
  otherNeeds?: string

  // Observations
  carMemberStatus?: YesNo
  foundationMemberStatus?: YesNo
  foundationRole?: FoundationRole
  hasCurrentWorkplace?: YesNo
  currentWorkplace?: string
  otherObservations?: string

  // Computed/Joined
  payments?: Payment[]
}

export interface DashboardStats {
  totalActiveMembers: number
  totalWithdrawnMembers: number
  totalCollectionsCurrentYear: number
}

export type UserRole = "admin" | "editor" | "viewer"

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  createdAt: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
}

export interface ActivityType {
  id: string
  name: string
  category?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Activity {
  id: string // e.g. ACT-0001
  type_id: string
  title?: string
  date_from: string // ISO date string
  date_to?: string // ISO date string
  location?: string
  notes?: string
  status: ActivityStatus
  archived_at?: string
  archived_by?: string
  created_by?: string
  created_at: string
  updated_at: string
  // Joined data
  activity_type?: ActivityType
  participants_count?: number
}

export interface ActivityParticipant {
  activity_id: string
  member_id: string
  status: ActivityParticipantStatus
  note?: string
  created_at: string
  // Joined data
  member?: Member
  activity?: Activity
}

export interface WhatsAppGroup {
  id: string
  name: string
  description?: string
  status: WhatsAppGroupStatus
  created_at: string
  updated_at: string
  member_count?: number
}

export interface MemberGroup {
  member_id: string
  group_id: string
  joined_at: string
  added_by?: string
  notes?: string
  // Joined data
  member?: Member
  group?: WhatsAppGroup
}

export type AuditActionType =
  // Authentication
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  // Members CRUD
  | "CREATE_MEMBER"
  | "UPDATE_MEMBER"
  | "DELETE_MEMBER"
  // Payments CRUD
  | "CREATE_PAYMENT"
  | "UPDATE_PAYMENT"
  | "DELETE_PAYMENT"
  // Activities CRUD
  | "CREATE_ACTIVITY"
  | "UPDATE_ACTIVITY"
  | "DELETE_ACTIVITY"
  | "ARCHIVE_ACTIVITY"
  | "REACTIVATE_ACTIVITY"
  | "ADD_PARTICIPANTS"
  | "REMOVE_PARTICIPANTS"
  // Value Lists
  | "UPDATE_VALUE_LIST"
  // Import/Export
  | "IMPORT_STARTED"
  | "IMPORT_COMPLETED"
  | "IMPORT_FAILED"
  | "EXPORT_STARTED"
  | "EXPORT_COMPLETED"
  | "EXPORT_FAILED"
  // Filtering/Search
  | "FILTER_APPLIED"
  | "FILTER_RESET"
  | "SEARCH_EXECUTED"
  // Navigation/Errors
  | "PAGE_VIEW"
  | "RUNTIME_ERROR"
  | "API_ERROR"

export type AuditModule = "members" | "payments" | "activities" | "settings" | "auth" | "system"

export interface AuditLog {
  id: string
  timestamp: string // ISO timestamp
  actorUserId: string
  actorName: string
  actorRole: UserRole
  actionType: AuditActionType
  module: AuditModule
  entityType?: string // member/payment/activity/value_list
  entityId?: string // internal id
  entityCode?: string // MEM-####/PAY-####/ACT-####
  summary: string // human-readable summary
  metadata?: Record<string, any> // JSON object for details
  ip?: string
  userAgent?: string
  requestId?: string
  isError?: boolean
}

export interface UMUnit {
  id: string
  code: string // e.g. "UM 0754"
  name?: string // Expanded name (optional)
  is_active: boolean
  created_at: string
  updated_at: string
}
