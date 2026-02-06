"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { Activity, ActivityType, ActivityParticipant, ActivityParticipantStatus } from "@/types"
import { AuditLogger } from "@/lib/audit-logger"
import { useAuth } from "@/lib/auth-context"
import {
  activitiesApi,
  dbRowToActivity,
  dbRowToActivityType,
  dbRowToActivityParticipant,
} from "@/lib/db-adapter"
import { isTauri } from "@/lib/db"
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
  updateParticipant: (activityId: string, memberId: string, updates: Partial<Pick<ActivityParticipant, "status" | "note">>) => Promise<void>
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

export function ActivitiesProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([])
  const [participants, setParticipants] = useState<ActivityParticipant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const fetchActivities = useCallback(async () => {
    try {
      const data = await activitiesApi.fetchActivities()
      setActivities(data)
    } catch (err) {
      console.error("Failed to fetch activities:", err)
      setError("Failed to load activities")
    }
  }, [])

  const fetchActivityTypes = useCallback(async () => {
    try {
      const data = await activitiesApi.fetchActivityTypes()
      setActivityTypes(data)
    } catch (err) {
      console.error("Failed to fetch activity types:", err)
    }
  }, [])

  const fetchParticipants = useCallback(async () => {
    try {
      const data = await activitiesApi.fetchParticipants()
      setParticipants(data)
    } catch (err) {
      console.error("Failed to fetch participants:", err)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      await Promise.all([fetchActivities(), fetchActivityTypes(), fetchParticipants()])
      setIsLoading(false)
    }
    loadData()
  }, [fetchActivities, fetchActivityTypes, fetchParticipants])

  useEffect(() => {
    if (isTauri()) return
    const supabase = createBrowserClient()
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
          console.log("[Realtime] Participant event:", payload.eventType, payload)
          
          if (payload.eventType === "INSERT") {
            const newParticipant = dbRowToActivityParticipant(payload.new)
            console.log("[Realtime] Adding participant:", newParticipant)
            setParticipants((prev) => [...prev, newParticipant])
          } else if (payload.eventType === "UPDATE") {
            const updatedParticipant = dbRowToActivityParticipant(payload.new)
            console.log("[Realtime] Updating participant:", updatedParticipant)
            setParticipants((prev) =>
              prev.map((p) =>
                p.activity_id === updatedParticipant.activity_id && p.member_id === updatedParticipant.member_id
                  ? updatedParticipant
                  : p
              )
            )
          } else if (payload.eventType === "DELETE") {
            console.log("[Realtime] Deleting participant:", payload.old)
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
  }, [])

  const createActivity = async (activityData: Omit<Activity, "id" | "created_at" | "updated_at" | "status">) => {
    try {
      const newActivity = await activitiesApi.createActivity(activityData, user?.id)

      setActivities((prev) => [newActivity, ...prev])

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
    } catch (error) {
      console.error("Error in createActivity:", error)
      throw error
    }
  }

  const updateActivity = async (id: string, updates: Partial<Activity>) => {
    const oldActivity = activities.find((a) => a.id === id)

    const ok = await activitiesApi.updateActivity(id, updates)
    if (!ok) throw new Error("Failed to update activity")

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

    // Refresh activities list to show the updated activity
    await fetchActivities()
  }

  const deleteActivity = async (id: string) => {
    const activity = activities.find((a) => a.id === id)
    const activityParticipants = participants.filter((p) => p.activity_id === id)

    const ok = await activitiesApi.deleteActivity(id)
    if (!ok) throw new Error("Failed to delete activity")

    // Manually update local state to immediately reflect the deletion
    setActivities((prev) => prev.filter((a) => a.id !== id))
    setParticipants((prev) => prev.filter((p) => p.activity_id !== id))

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

    // Refresh activities list
    await fetchActivities()
  }

  const archiveActivity = async (id: string) => {
    const activity = activities.find((a) => a.id === id)

    const ok = await activitiesApi.archiveActivity(id, user?.id)
    if (!ok) throw new Error("Failed to archive activity")

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

    // Refresh activities list
    await fetchActivities()
  }

  const reactivateActivity = async (id: string) => {
    const activity = activities.find((a) => a.id === id)

    const ok = await activitiesApi.reactivateActivity(id)
    if (!ok) throw new Error("Failed to reactivate activity")

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

    // Refresh activities list
    await fetchActivities()
  }

  const addParticipants = async (activityId: string, memberIds: string[]) => {
    const existingParticipants = participants.filter(
      (p) => p.activity_id === activityId && memberIds.includes(p.member_id)
    )
    const newMemberIds = memberIds.filter(
      (memberId) => !existingParticipants.some((p) => p.member_id === memberId)
    )

    if (newMemberIds.length === 0) {
      throw new Error("Toți membrii selectați sunt deja participanți la această activitate")
    }

    const newParticipantsData = await activitiesApi.addParticipants(activityId, newMemberIds, "attended")

    const activity = activities.find((a) => a.id === activityId)
    AuditLogger.log({
      user,
      actionType: "ADD_PARTICIPANTS",
      module: "activities",
      entityType: "activity",
      entityId: activityId,
      entityCode: activityId,
      summary: `${newMemberIds.length} participanți adăugați la activitatea ${activity?.title || activityId}`,
      metadata: { participantsAdded: newMemberIds.length, activityTitle: activity?.title },
    })

    setParticipants((prev) => [...prev, ...newParticipantsData])
  }

  const updateParticipant = async (activityId: string, memberId: string, updates: Partial<Pick<ActivityParticipant, "status" | "note">>) => {
    const ok = await activitiesApi.updateParticipant(activityId, memberId, updates)
    if (!ok) throw new Error("Failed to update participant")

    const activity = activities.find((a) => a.id === activityId)
    AuditLogger.log({
      user,
      actionType: "UPDATE_PARTICIPANTS",
      module: "activities",
      entityType: "activity",
      entityId: activityId,
      entityCode: activityId,
      summary: `Participant actualizat în activitatea ${activity?.title || activityId}`,
      metadata: { memberId, updates, activityTitle: activity?.title },
    })

    setParticipants((prev) =>
      prev.map((p) =>
        p.activity_id === activityId && p.member_id === memberId ? { ...p, ...updates } : p
      )
    )
  }

  const removeParticipant = async (activityId: string, memberId: string) => {
    const ok = await activitiesApi.removeParticipant(activityId, memberId)
    if (!ok) throw new Error("Failed to remove participant")

    const activity = activities.find((a) => a.id === activityId)
    AuditLogger.log({
      user,
      actionType: "REMOVE_PARTICIPANTS",
      module: "activities",
      entityType: "activity",
      entityId: activityId,
      entityCode: activityId,
      summary: `Participant eliminat din activitatea ${activity?.title || activityId}`,
      metadata: { memberId, activityTitle: activity?.title },
    })

    setParticipants((prev) =>
      prev.filter((p) => !(p.activity_id === activityId && p.member_id === memberId))
    )
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
    return activitiesApi.createActivityType(typeData)
  }

  const updateActivityType = async (id: string, updates: Partial<ActivityType>) => {
    const ok = await activitiesApi.updateActivityType(id, updates)
    if (!ok) throw new Error("Failed to update activity type")
  }

  const deleteActivityType = async (id: string) => {
    const ok = await activitiesApi.deleteActivityType(id)
    if (!ok) throw new Error("Failed to delete activity type")
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
        updateParticipant,
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
