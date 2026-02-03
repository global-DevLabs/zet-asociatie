"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { Activity, ActivityType, ActivityParticipant, ActivityParticipantStatus, ActivityStatus } from "@/types"
import { AuditLogger } from "@/lib/audit-logger"
import { useAuth } from "@/lib/auth-context"
import { createBrowserClient } from "@/lib/supabase/client"

interface ActivitiesContextType {
  activities: Activity[]
  activityTypes: ActivityType[]
  isLoading: boolean
  error: string | null
  createActivity: (activity: Omit<Activity, "id" | "created_at" | "updated_at" | "status">) => Promise<Activity>
  updateActivity: (id: string, updates: Partial<Activity>) => Promise<void>
  deleteActivity: (id: string) => Promise<void>
  archiveActivity: (id: string) => Promise<void>
  reactivateActivity: (id: string) => Promise<void>
  getActivityById: (id: string) => Activity | undefined
  addParticipants: (activityId: string, memberIds: string[]) => Promise<void>
  removeParticipant: (activityId: string, memberId: string) => Promise<void>
  getParticipants: (activityId: string) => ActivityParticipant[]
  getMemberActivities: (memberId: string) => Activity[]
  refreshActivities: () => Promise<void>
  updateActivityTypes: (types: ActivityType[]) => void
  createActivityType: (type: Omit<ActivityType, "id" | "created_at" | "updated_at">) => Promise<ActivityType>
  updateActivityType: (id: string, updates: Partial<ActivityType>) => Promise<void>
  deleteActivityType: (id: string) => Promise<void>
}

const ActivitiesContext = createContext<ActivitiesContextType | null>(null)

// Helper to convert database row to Activity type
function dbRowToActivity(row: any): Activity {
  return {
    id: row.id,
    type_id: row.type_id,
    title: row.title,
    date_from: row.date_from,
    date_to: row.date_to,
    location: row.location,
    notes: row.notes,
    status: row.status || "active",
    archived_at: row.archived_at,
    archived_by: row.archived_by,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    participants_count: row.participants_count,
  }
}

// Helper to convert Activity to database row format
function activityToDbRow(activity: Partial<Activity>): Record<string, any> {
  const row: Record<string, any> = {}

  if (activity.type_id !== undefined) row.type_id = activity.type_id
  if (activity.title !== undefined) row.title = activity.title
  if (activity.date_from !== undefined) row.date_from = activity.date_from
  if (activity.date_to !== undefined) row.date_to = activity.date_to
  if (activity.location !== undefined) row.location = activity.location
  if (activity.notes !== undefined) row.notes = activity.notes
  if (activity.status !== undefined) row.status = activity.status
  if (activity.archived_at !== undefined) row.archived_at = activity.archived_at
  if (activity.archived_by !== undefined) row.archived_by = activity.archived_by
  if (activity.created_by !== undefined) row.created_by = activity.created_by

  return row
}

// Helper to convert database row to ActivityType
function dbRowToActivityType(row: any): ActivityType {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// Helper to convert database row to ActivityParticipant
function dbRowToParticipant(row: any): ActivityParticipant {
  return {
    activity_id: row.activity_id,
    member_id: row.member_id,
    status: row.status,
    note: row.note,
    created_at: row.created_at,
  }
}

export function ActivitiesProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([])
  const [participants, setParticipants] = useState<ActivityParticipant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const supabase = createBrowserClient()

  // Fetch all activities from Supabase
  const fetchActivities = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("activities")
        .select("*")
        .order("date_from", { ascending: false })

      if (fetchError) {
        console.error("Error fetching activities:", fetchError)
        setError(fetchError.message)
        return
      }

      const mappedActivities = (data || []).map(dbRowToActivity)
      setActivities(mappedActivities)
    } catch (err) {
      console.error("Failed to fetch activities:", err)
      setError("Failed to load activities")
    }
  }, [supabase])

  // Fetch all activity types from Supabase
  const fetchActivityTypes = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("activity_types")
        .select("*")
        .order("name", { ascending: true })

      if (fetchError) {
        console.error("Error fetching activity types:", fetchError)
        return
      }

      const mappedTypes = (data || []).map(dbRowToActivityType)
      setActivityTypes(mappedTypes)
    } catch (err) {
      console.error("Failed to fetch activity types:", err)
    }
  }, [supabase])

  // Fetch all participants from Supabase
  const fetchParticipants = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("activity_participants")
        .select("*")

      if (fetchError) {
        console.error("Error fetching participants:", fetchError)
        return
      }

      const mappedParticipants = (data || []).map(dbRowToParticipant)
      setParticipants(mappedParticipants)
    } catch (err) {
      console.error("Failed to fetch participants:", err)
    }
  }, [supabase])

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      await Promise.all([fetchActivities(), fetchActivityTypes(), fetchParticipants()])
      setIsLoading(false)
    }
    loadData()
  }, [fetchActivities, fetchActivityTypes, fetchParticipants])

  // Subscribe to realtime changes
  useEffect(() => {
    const activitiesChannel = supabase
      .channel("activities-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activities" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newActivity = dbRowToActivity(payload.new)
            setActivities((prev) => [newActivity, ...prev])
          } else if (payload.eventType === "UPDATE") {
            const updatedActivity = dbRowToActivity(payload.new)
            setActivities((prev) =>
              prev.map((a) => (a.id === updatedActivity.id ? updatedActivity : a))
            )
          } else if (payload.eventType === "DELETE") {
            setActivities((prev) => prev.filter((a) => a.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    const participantsChannel = supabase
      .channel("participants-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_participants" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newParticipant = dbRowToParticipant(payload.new)
            setParticipants((prev) => [...prev, newParticipant])
          } else if (payload.eventType === "DELETE") {
            setParticipants((prev) =>
              prev.filter(
                (p) =>
                  !(p.activity_id === payload.old.activity_id && p.member_id === payload.old.member_id)
              )
            )
          }
        }
      )
      .subscribe()

    const typesChannel = supabase
      .channel("activity-types-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_types" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newType = dbRowToActivityType(payload.new)
            setActivityTypes((prev) => [...prev, newType])
          } else if (payload.eventType === "UPDATE") {
            const updatedType = dbRowToActivityType(payload.new)
            setActivityTypes((prev) =>
              prev.map((t) => (t.id === updatedType.id ? updatedType : t))
            )
          } else if (payload.eventType === "DELETE") {
            setActivityTypes((prev) => prev.filter((t) => t.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(activitiesChannel)
      supabase.removeChannel(participantsChannel)
      supabase.removeChannel(typesChannel)
    }
  }, [supabase])

  const generateActivityId = async () => {
    // Get max activity ID from database
    const { data } = await supabase
      .from("activities")
      .select("id")
      .order("id", { ascending: false })
      .limit(1)

    let maxNum = 0
    if (data && data.length > 0) {
      const match = data[0].id.match(/^ACT-(\d+)$/)
      if (match) {
        maxNum = Number.parseInt(match[1], 10)
      }
    }
    return `ACT-${String(maxNum + 1).padStart(4, "0")}`
  }

  const createActivity = async (activityData: Omit<Activity, "id" | "created_at" | "updated_at" | "status">) => {
    const activityId = await generateActivityId()

    const dbRow = activityToDbRow(activityData)
    dbRow.id = activityId
    dbRow.status = "active"
    dbRow.created_by = user?.id

    const { data, error: insertError } = await supabase
      .from("activities")
      .insert(dbRow)
      .select()
      .single()

    if (insertError || !data) {
      console.error("Failed to create activity:", insertError)
      throw new Error(insertError?.message || "Failed to create activity")
    }

    const newActivity = dbRowToActivity(data)

    AuditLogger.log({
      user,
      actionType: "CREATE_ACTIVITY",
      module: "activities",
      entityType: "activity",
      entityId: newActivity.id,
      entityCode: newActivity.id,
      summary: `Activitate nouă creată: ${newActivity.title || "Fără titlu"} (${newActivity.id})`,
      metadata: {
        type_id: newActivity.type_id,
        date_from: newActivity.date_from,
        location: newActivity.location,
      },
    })

    return newActivity
  }

  const updateActivity = async (id: string, updates: Partial<Activity>) => {
    const oldActivity = activities.find((a) => a.id === id)

    const dbRow = activityToDbRow(updates)
    dbRow.updated_at = new Date().toISOString()

    const { error: updateError } = await supabase
      .from("activities")
      .update(dbRow)
      .eq("id", id)

    if (updateError) {
      console.error("Failed to update activity:", updateError)
      throw new Error(updateError.message)
    }

    if (oldActivity) {
      AuditLogger.log({
        user,
        actionType: "UPDATE_ACTIVITY",
        module: "activities",
        entityType: "activity",
        entityId: id,
        entityCode: id,
        summary: `Activitate actualizată: ${oldActivity.title || "Fără titlu"} (${id})`,
        metadata: {
          changedFields: Object.keys(updates),
          updates,
        },
      })
    }
  }

  const deleteActivity = async (id: string) => {
    const activity = activities.find((a) => a.id === id)
    const activityParticipants = participants.filter((p) => p.activity_id === id)

    const { error: deleteError } = await supabase
      .from("activities")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("Failed to delete activity:", deleteError)
      throw new Error(deleteError.message)
    }

    if (activity) {
      AuditLogger.log({
        user,
        actionType: "DELETE_ACTIVITY",
        module: "activities",
        entityType: "activity",
        entityId: id,
        entityCode: id,
        summary: `Activitate ștearsă: ${activity.title || "Fără titlu"} (${id})`,
        metadata: {
          participantsCount: activityParticipants.length,
          date_from: activity.date_from,
          location: activity.location,
        },
      })
    }
  }

  const archiveActivity = async (id: string) => {
    const activity = activities.find((a) => a.id === id)

    const { error: updateError } = await supabase
      .from("activities")
      .update({
        status: "archived",
        archived_at: new Date().toISOString(),
        archived_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateError) {
      console.error("Failed to archive activity:", updateError)
      throw new Error(updateError.message)
    }

    if (activity) {
      AuditLogger.log({
        user,
        actionType: "ARCHIVE_ACTIVITY",
        module: "activities",
        entityType: "activity",
        entityId: id,
        entityCode: id,
        summary: `Activitate arhivată: ${activity.title || "Fără titlu"} (${id})`,
        metadata: {
          previousStatus: activity.status,
          date_from: activity.date_from,
        },
      })
    }
  }

  const reactivateActivity = async (id: string) => {
    const activity = activities.find((a) => a.id === id)

    const { error: updateError } = await supabase
      .from("activities")
      .update({
        status: "active",
        archived_at: null,
        archived_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateError) {
      console.error("Failed to reactivate activity:", updateError)
      throw new Error(updateError.message)
    }

    if (activity) {
      AuditLogger.log({
        user,
        actionType: "REACTIVATE_ACTIVITY",
        module: "activities",
        entityType: "activity",
        entityId: id,
        entityCode: id,
        summary: `Activitate reactivată: ${activity.title || "Fără titlu"} (${id})`,
        metadata: {
          previousStatus: activity.status,
          date_from: activity.date_from,
        },
      })
    }
  }

  const addParticipants = async (activityId: string, memberIds: string[]) => {
    const existingParticipants = participants.filter(
      (p) => p.activity_id === activityId && memberIds.includes(p.member_id)
    )

    // Filter out members that are already participants
    const newMemberIds = memberIds.filter(
      (memberId) => !existingParticipants.some((p) => p.member_id === memberId)
    )

    if (newMemberIds.length === 0) {
      return
    }

    const newParticipants = newMemberIds.map((memberId) => ({
      activity_id: activityId,
      member_id: memberId,
      status: "attended" as ActivityParticipantStatus,
    }))

    const { error: insertError } = await supabase
      .from("activity_participants")
      .insert(newParticipants)

    if (insertError) {
      console.error("Failed to add participants:", insertError)
      throw new Error(insertError.message)
    }

    const activity = activities.find((a) => a.id === activityId)
    AuditLogger.log({
      user,
      actionType: "ADD_PARTICIPANTS",
      module: "activities",
      entityType: "activity",
      entityId: activityId,
      entityCode: activityId,
      summary: `${newMemberIds.length} participanți adăugați la activitatea ${activity?.title || activityId}`,
      metadata: {
        participantsAdded: newMemberIds.length,
        activityTitle: activity?.title,
      },
    })
  }

  const removeParticipant = async (activityId: string, memberId: string) => {
    const { error: deleteError } = await supabase
      .from("activity_participants")
      .delete()
      .eq("activity_id", activityId)
      .eq("member_id", memberId)

    if (deleteError) {
      console.error("Failed to remove participant:", deleteError)
      throw new Error(deleteError.message)
    }

    const activity = activities.find((a) => a.id === activityId)
    AuditLogger.log({
      user,
      actionType: "REMOVE_PARTICIPANTS",
      module: "activities",
      entityType: "activity",
      entityId: activityId,
      entityCode: activityId,
      summary: `Participant eliminat din activitatea ${activity?.title || activityId}`,
      metadata: {
        memberId,
        activityTitle: activity?.title,
      },
    })
  }

  const getActivityById = (id: string) => {
    return activities.find((activity) => activity.id === id)
  }

  const getParticipants = (activityId: string) => {
    return participants.filter((p) => p.activity_id === activityId)
  }

  const getMemberActivities = (memberId: string) => {
    const memberParticipations = participants.filter((p) => p.member_id === memberId)
    return activities.filter((activity) =>
      memberParticipations.some((p) => p.activity_id === activity.id)
    )
  }

  const refreshActivities = async () => {
    setIsLoading(true)
    await Promise.all([fetchActivities(), fetchActivityTypes(), fetchParticipants()])
    setIsLoading(false)
  }

  const updateActivityTypes = (types: ActivityType[]) => {
    setActivityTypes(types)
  }

  const createActivityType = async (typeData: Omit<ActivityType, "id" | "created_at" | "updated_at">) => {
    const { data, error: insertError } = await supabase
      .from("activity_types")
      .insert({
        name: typeData.name,
        category: typeData.category,
        is_active: typeData.is_active,
      })
      .select()
      .single()

    if (insertError || !data) {
      console.error("Failed to create activity type:", insertError)
      throw new Error(insertError?.message || "Failed to create activity type")
    }

    return dbRowToActivityType(data)
  }

  const updateActivityType = async (id: string, updates: Partial<ActivityType>) => {
    const { error: updateError } = await supabase
      .from("activity_types")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateError) {
      console.error("Failed to update activity type:", updateError)
      throw new Error(updateError.message)
    }
  }

  const deleteActivityType = async (id: string) => {
    const { error: deleteError } = await supabase
      .from("activity_types")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("Failed to delete activity type:", deleteError)
      throw new Error(deleteError.message)
    }
  }

  return (
    <ActivitiesContext.Provider
      value={{
        activities,
        activityTypes,
        isLoading,
        error,
        createActivity,
        updateActivity,
        deleteActivity,
        archiveActivity,
        reactivateActivity,
        getActivityById,
        addParticipants,
        removeParticipant,
        getParticipants,
        getMemberActivities,
        refreshActivities,
        updateActivityTypes,
        createActivityType,
        updateActivityType,
        deleteActivityType,
      }}
    >
      {children}
    </ActivitiesContext.Provider>
  )
}

export function useActivities() {
  const context = useContext(ActivitiesContext)
  if (!context) {
    throw new Error("useActivities must be used within ActivitiesProvider")
  }
  return context
}
