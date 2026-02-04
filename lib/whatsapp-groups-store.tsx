"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { WhatsAppGroup } from "@/types";

interface WhatsAppGroupsContextType {
  groups: WhatsAppGroup[];
  isLoading: boolean;
  error: string | null;
  createGroup: (group: Omit<WhatsAppGroup, "id" | "created_at" | "updated_at">) => Promise<WhatsAppGroup>;
  updateGroup: (id: string, updates: Partial<WhatsAppGroup>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  getGroupById: (id: string) => WhatsAppGroup | undefined;
  refreshGroups: () => Promise<void>;
  getGroupMemberCount: (groupId: string) => number;
}

const WhatsAppGroupsContext = createContext<WhatsAppGroupsContextType | null>(null);

const api = (path: string, options?: RequestInit) =>
  fetch(path, { ...options, credentials: "include" });

export function WhatsAppGroupsProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api("/api/whatsapp-groups");
      if (!res.ok) {
        setError("Failed to load WhatsApp groups");
        return;
      }
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch WhatsApp groups:", err);
      setError("Failed to load WhatsApp groups");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const createGroup = async (
    groupData: Omit<WhatsAppGroup, "id" | "created_at" | "updated_at">
  ): Promise<WhatsAppGroup> => {
    const res = await api("/api/whatsapp-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(groupData),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to create group");
    }
    const newGroup = await res.json();
    setGroups((prev) => [newGroup, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
    return newGroup;
  };

  const updateGroup = async (id: string, updates: Partial<WhatsAppGroup>): Promise<void> => {
    const res = await api(`/api/whatsapp-groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to update group");
    }
    await fetchGroups();
  };

  const deleteGroup = async (id: string): Promise<void> => {
    const res = await api(`/api/whatsapp-groups/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to delete group");
    }
    setGroups((prev) => prev.filter((g) => g.id !== id));
  };

  const getGroupById = (id: string) => groups.find((g) => g.id === id);
  const refreshGroups = () => fetchGroups();
  const getGroupMemberCount = (groupId: string) =>
    groups.find((g) => g.id === groupId)?.member_count ?? 0;

  return (
    <WhatsAppGroupsContext.Provider
      value={{
        groups,
        isLoading,
        error,
        createGroup,
        updateGroup,
        deleteGroup,
        getGroupById,
        refreshGroups,
        getGroupMemberCount,
      }}
    >
      {children}
    </WhatsAppGroupsContext.Provider>
  );
}

export function useWhatsAppGroups() {
  const context = useContext(WhatsAppGroupsContext);
  if (!context) {
    throw new Error("useWhatsAppGroups must be used within WhatsAppGroupsProvider");
  }
  return context;
}
