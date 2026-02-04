"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type {
  Activity,
  ActivityType,
  ActivityParticipant,
  ActivityParticipantStatus,
  ActivityStatus,
} from "@/types";
import { AuditLogger } from "@/lib/audit-logger";
import { useAuth } from "@/lib/auth-context";

interface ActivitiesContextType {
  activities: Activity[];
  activityTypes: ActivityType[];
  isLoading: boolean;
  error: string | null;
  createActivity: (
    activity: Omit<Activity, "id" | "created_at" | "updated_at" | "status">
  ) => Promise<Activity>;
  updateActivity: (id: string, updates: Partial<Activity>) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  archiveActivity: (id: string) => Promise<void>;
  reactivateActivity: (id: string) => Promise<void>;
  getActivityById: (id: string) => Activity | undefined;
  addParticipants: (activityId: string, memberIds: string[]) => Promise<void>;
  updateParticipant: (
    activityId: string,
    memberId: string,
    updates: Partial<Pick<ActivityParticipant, "status" | "note">>
  ) => Promise<void>;
  removeParticipant: (activityId: string, memberId: string) => Promise<void>;
  getParticipants: (activityId: string) => ActivityParticipant[];
  getMemberActivities: (memberId: string) => Activity[];
  refreshActivities: () => Promise<void>;
  updateActivityTypes: (types: ActivityType[]) => void;
  createActivityType: (
    type: Omit<ActivityType, "id" | "created_at" | "updated_at">
  ) => Promise<ActivityType>;
  updateActivityType: (id: string, updates: Partial<ActivityType>) => Promise<void>;
  deleteActivityType: (id: string) => Promise<void>;
}

const ActivitiesContext = createContext<ActivitiesContextType | null>(null);

const api = (path: string, options?: RequestInit) =>
  fetch(path, { ...options, credentials: "include" });

function mapActivity(row: Record<string, unknown>): Activity {
  return {
    id: row.id as string,
    type_id: row.type_id != null ? String(row.type_id) : (row.type_id as string),
    title: row.title as string,
    date_from: row.date_from as string,
    date_to: row.date_to as string,
    location: row.location as string,
    notes: row.notes as string,
    status: (row.status as ActivityStatus) || "active",
    archived_at: row.archived_at as string,
    archived_by: row.archived_by as string,
    created_by: row.created_by as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    participants_count: row.participants_count as number,
  };
}

function mapActivityType(row: Record<string, unknown>): ActivityType {
  return {
    id: row.id != null ? String(row.id) : (row.id as string),
    name: row.name as string,
    category: row.category as string,
    is_active: row.is_active as boolean,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function mapParticipant(row: Record<string, unknown>): ActivityParticipant {
  return {
    activity_id: row.activity_id as string,
    member_id: row.member_id as string,
    status: row.status as ActivityParticipantStatus,
    note: row.note as string,
    created_at: row.created_at as string,
  };
}

export function ActivitiesProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [participants, setParticipants] = useState<ActivityParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchActivities = useCallback(async () => {
    try {
      const res = await api("/api/activities");
      if (!res.ok) {
        setError("Failed to load activities");
        return;
      }
      const data = await res.json();
      setActivities(Array.isArray(data) ? data.map(mapActivity) : []);
    } catch (err) {
      console.error("Failed to fetch activities:", err);
      setError("Failed to load activities");
    }
  }, []);

  const fetchActivityTypes = useCallback(async () => {
    try {
      const res = await api("/api/activity-types");
      if (!res.ok) return;
      const data = await res.json();
      setActivityTypes(Array.isArray(data) ? data.map(mapActivityType) : []);
    } catch (err) {
      console.error("Failed to fetch activity types:", err);
    }
  }, []);

  const fetchParticipants = useCallback(async () => {
    try {
      const res = await api("/api/activities/participants");
      if (!res.ok) return;
      const data = await res.json();
      setParticipants(Array.isArray(data) ? data.map(mapParticipant) : []);
    } catch (err) {
      console.error("Failed to fetch participants:", err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      await Promise.all([fetchActivities(), fetchActivityTypes(), fetchParticipants()]);
      if (mounted) setIsLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [fetchActivities, fetchActivityTypes, fetchParticipants]);

  const refreshActivities = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchActivities(), fetchActivityTypes(), fetchParticipants()]);
    setIsLoading(false);
  }, [fetchActivities, fetchActivityTypes, fetchParticipants]);

  const createActivity = useCallback(
    async (
      activityData: Omit<Activity, "id" | "created_at" | "updated_at" | "status">
    ): Promise<Activity> => {
      const payload = {
        ...activityData,
        type_id: activityData.type_id ? Number(activityData.type_id) || null : null,
      };
      const res = await api("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create activity");
      }
      const newActivity = mapActivity(await res.json());
      setActivities((prev) => [newActivity, ...prev]);
      AuditLogger.log({
        user,
        actionType: "CREATE_ACTIVITY",
        module: "activities",
        entityType: "activity",
        entityId: newActivity.id,
        entityCode: newActivity.id,
        summary: `Activitate nouă creată: ${newActivity.title || "Fără titlu"} (${newActivity.id})`,
        metadata: { type_id: newActivity.type_id, date_from: newActivity.date_from, location: newActivity.location },
      });
      return newActivity;
    },
    [user]
  );

  const updateActivity = useCallback(
    async (id: string, updates: Partial<Activity>): Promise<void> => {
      const oldActivity = activities.find((a) => a.id === id);
      const payload = { ...updates };
      if (payload.type_id !== undefined) payload.type_id = Number(payload.type_id) || null;
      const res = await api(`/api/activities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update activity");
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
          metadata: { changedFields: Object.keys(updates), updates },
        });
      }
      await fetchActivities();
    },
    [activities, user, fetchActivities]
  );

  const deleteActivity = useCallback(
    async (id: string): Promise<void> => {
      const activity = activities.find((a) => a.id === id);
      const res = await api(`/api/activities/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete activity");
      }
      setActivities((prev) => prev.filter((a) => a.id !== id));
      setParticipants((prev) => prev.filter((p) => p.activity_id !== id));
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
            participantsCount: participants.filter((p) => p.activity_id === id).length,
            date_from: activity.date_from,
            location: activity.location,
          },
        });
      }
      await fetchActivities();
    },
    [activities, participants, user, fetchActivities]
  );

  const archiveActivity = useCallback(
    async (id: string): Promise<void> => {
      const activity = activities.find((a) => a.id === id);
      const res = await api(`/api/activities/${id}/archive`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to archive activity");
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
          metadata: { previousStatus: activity.status, date_from: activity.date_from },
        });
      }
      await fetchActivities();
    },
    [activities, user, fetchActivities]
  );

  const reactivateActivity = useCallback(
    async (id: string): Promise<void> => {
      const activity = activities.find((a) => a.id === id);
      const res = await api(`/api/activities/${id}/reactivate`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to reactivate activity");
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
          metadata: { previousStatus: activity.status, date_from: activity.date_from },
        });
      }
      await fetchActivities();
    },
    [activities, user, fetchActivities]
  );

  const addParticipants = useCallback(
    async (activityId: string, memberIds: string[]): Promise<void> => {
      const existing = participants.filter(
        (p) => p.activity_id === activityId && memberIds.includes(p.member_id)
      );
      const newMemberIds = memberIds.filter(
        (memberId) => !existing.some((p) => p.member_id === memberId)
      );
      if (newMemberIds.length === 0) {
        throw new Error("Toți membrii selectați sunt deja participanți la această activitate");
      }
      const res = await api(`/api/activities/${activityId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: newMemberIds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Nu s-au putut adăuga participanții");
      }
      const activity = activities.find((a) => a.id === activityId);
      AuditLogger.log({
        user,
        actionType: "ADD_PARTICIPANTS",
        module: "activities",
        entityType: "activity",
        entityId: activityId,
        entityCode: activityId,
        summary: `${newMemberIds.length} participanți adăugați la activitatea ${activity?.title || activityId}`,
        metadata: { participantsAdded: newMemberIds.length, activityTitle: activity?.title },
      });
      const newParticipantsData = newMemberIds.map((member_id) => ({
        activity_id: activityId,
        member_id,
        status: "attended" as const,
        note: undefined,
        created_at: new Date().toISOString(),
      }));
      setParticipants((prev) => [...prev, ...newParticipantsData]);
    },
    [activities, participants, user]
  );

  const updateParticipant = useCallback(
    async (
      activityId: string,
      memberId: string,
      updates: Partial<Pick<ActivityParticipant, "status" | "note">>
    ): Promise<void> => {
      const res = await api(`/api/activities/${activityId}/participants`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, ...updates }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update participant");
      }
      setParticipants((prev) =>
        prev.map((p) =>
          p.activity_id === activityId && p.member_id === memberId ? { ...p, ...updates } : p
        )
      );
    },
    []
  );

  const removeParticipant = useCallback(
    async (activityId: string, memberId: string): Promise<void> => {
      const res = await api(
        `/api/activities/${activityId}/participants?memberId=${encodeURIComponent(memberId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove participant");
      }
      const activity = activities.find((a) => a.id === activityId);
      AuditLogger.log({
        user,
        actionType: "REMOVE_PARTICIPANTS",
        module: "activities",
        entityType: "activity",
        entityId: activityId,
        entityCode: activityId,
        summary: `Participant eliminat din activitatea ${activity?.title || activityId}`,
        metadata: { memberId, activityTitle: activity?.title },
      });
      setParticipants((prev) =>
        prev.filter((p) => !(p.activity_id === activityId && p.member_id === memberId))
      );
    },
    [activities, user]
  );

  const getActivityById = (id: string) => activities.find((a) => a.id === id);
  const getParticipants = (activityId: string) =>
    participants.filter((p) => p.activity_id === activityId);
  const getMemberActivities = (memberId: string) => {
    const memberParticipations = participants.filter((p) => p.member_id === memberId);
    return activities.filter((a) =>
      memberParticipations.some((p) => p.activity_id === a.id)
    );
  };

  const updateActivityTypes = (types: ActivityType[]) => setActivityTypes(types);

  const createActivityType = useCallback(
    async (
      typeData: Omit<ActivityType, "id" | "created_at" | "updated_at">
    ): Promise<ActivityType> => {
      const res = await api("/api/activity-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(typeData),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create activity type");
      }
      const newType = mapActivityType(await res.json());
      setActivityTypes((prev) => [...prev, newType].sort((a, b) => a.name.localeCompare(b.name)));
      return newType;
    },
    []
  );

  const updateActivityType = useCallback(
    async (id: string, updates: Partial<ActivityType>): Promise<void> => {
      const res = await api(`/api/activity-types/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update activity type");
      }
      await fetchActivityTypes();
    },
    [fetchActivityTypes]
  );

  const deleteActivityType = useCallback(
    async (id: string): Promise<void> => {
      const res = await api(`/api/activity-types/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete activity type");
      }
      setActivityTypes((prev) => prev.filter((t) => String(t.id) !== String(id)));
    },
    []
  );

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
  );
}

export function useActivities() {
  const context = useContext(ActivitiesContext);
  if (!context) {
    throw new Error("useActivities must be used within ActivitiesProvider");
  }
  return context;
}
