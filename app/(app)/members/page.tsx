"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react"; // Declare the Search variable

export const dynamic = 'force-dynamic'

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { MembersTable } from "@/components/members/members-table";
import { MemberFilters } from "@/components/members/member-filters";
import { ExportModal } from "@/components/members/export-modal";
import { Button } from "@/components/ui/button";
import { ListSorter, type SortOption } from "@/components/ui/list-sorter";
import { Plus, Download } from "lucide-react";
import { useMembers } from "@/lib/members-store";
import { useWhatsAppGroups } from "@/lib/whatsapp-groups-store";
import { useActivities } from "@/lib/activities-store";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { calculateAge, memberCodeMatchesSearch } from "@/lib/utils";
import type { Member } from "@/types";

const SORT_OPTIONS: SortOption[] = [
  { value: "name", label: "Nume" },
  { value: "age", label: "Vârstă" },
  { value: "memberCode", label: "Cod Membru" },
  { value: "branchEnrollmentYear", label: "Data înscriere" },
  { value: "retirementYear", label: "An pensionare" },
  { value: "unit", label: "UM" },
  { value: "rank", label: "Grad" },
];

function sortMembers(
  members: Member[],
  sortBy: string,
  sortDir: "asc" | "desc"
): Member[] {
  const sorted = [...members].sort((a, b) => {
    let compareResult = 0;

    // Primary sort
    switch (sortBy) {
      case "name": {
        const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
        const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
        compareResult = nameA.localeCompare(nameB, "ro");
        break;
      }
      case "age": {
        const ageA = calculateAge(a.dateOfBirth) ?? 999;
        const ageB = calculateAge(b.dateOfBirth) ?? 999;
        compareResult = ageA - ageB;
        break;
      }
      case "memberCode":
        compareResult = (a.memberCode || "").localeCompare(b.memberCode || "");
        break;
      case "branchEnrollmentYear":
        compareResult =
          (a.branchEnrollmentYear || 0) - (b.branchEnrollmentYear || 0);
        break;
      case "retirementYear":
        compareResult = (a.retirementYear || 0) - (b.retirementYear || 0);
        break;
      case "unit":
        compareResult = (a.unit || "").localeCompare(b.unit || "", "ro");
        break;
      case "rank":
        compareResult = (a.rank || "").localeCompare(b.rank || "", "ro");
        break;
    }

    if (sortDir === "desc") compareResult *= -1;

    if (compareResult === 0 && sortBy !== "name") {
      const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
      const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
      compareResult = nameA.localeCompare(nameB, "ro");
    }
    if (compareResult === 0) {
      compareResult = (a.memberCode || "").localeCompare(b.memberCode || "");
    }

    return compareResult;
  });

  return sorted;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove diacritics
}

function MembersPageContent() {
  const { members, loading, error } = useMembers();
  const { groups } = useWhatsAppGroups();
  const { activities, activityTypes, getParticipants } = useActivities();
  const { hasPermission } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [serverSearchResults, setServerSearchResults] = useState<
    string[] | null
  >(null);
  const [isSearching, setIsSearching] = useState(false);
  // Server search is enabled - members are now stored in Supabase
  const [useServerSearch, setUseServerSearch] = useState(true);
  const searchAbortRef = useRef<AbortController | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    ranks: [] as string[],
    units: [] as string[],
    profiles: [] as string[],
    carStatus: "",
    foundationStatus: "",
    foundationRole: "",
    provenances: [] as string[],
    withdrawalReasons: [] as string[],
    enrollmentYearStart: "",
    enrollmentYearEnd: "",
    retirementYearStart: "",
    retirementYearEnd: "",
    ageMin: "",
    ageMax: "",
    hasOutstandingPayments: "",
    hasRecentPayments: "",
    needsFilter: "", // "none" | "active" | "all"
    whatsappGroups: [] as string[],
    activityTypes: [] as string[],
  });

  const urlSort = searchParams.get("sort");
  const urlDir = searchParams.get("dir") as "asc" | "desc" | null;

  const hasAgeFilter = !!(advancedFilters.ageMin || advancedFilters.ageMax);
  const defaultSort = hasAgeFilter ? "age" : "name";
  const defaultDir = hasAgeFilter ? "asc" : "asc";

  const [sortBy, setSortBy] = useState<string>(urlSort || defaultSort);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(urlDir || defaultDir);

  useEffect(() => {
    if (hasAgeFilter && sortBy === "name") {
      handleSortChange("age", "asc");
    }
  }, [hasAgeFilter]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Server-side search effect
  useEffect(() => {
    if (!useServerSearch) return; // Skip if fallback to client-side

    // Cancel previous request
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }

    if (!debouncedQuery.trim()) {
      setServerSearchResults(null);
      setIsSearching(false);
      return;
    }

    const abortController = new AbortController();
    searchAbortRef.current = abortController;

    const performSearch = async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/members/search?q=${encodeURIComponent(debouncedQuery)}`,
          { signal: abortController.signal }
        );
        const data = await response.json();

        if (data.fallback) {
          // Server search not available, use client-side
          setUseServerSearch(false);
          setServerSearchResults(null);
        } else if (data.memberIds) {
          setServerSearchResults(data.memberIds);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Search failed, falling back to client-side:", err);
          setUseServerSearch(false);
        }
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();

    return () => {
      abortController.abort();
    };
  }, [debouncedQuery, useServerSearch]);

  const handleSortChange = (newSort: string, newDir: "asc" | "desc") => {
    setSortBy(newSort);
    setSortDir(newDir);

    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", newSort);
    params.set("dir", newDir);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const filteredMembers = useMemo(() => {
    // Start with all members or server-filtered members
    let baseMembers = members;

    // If we have server search results and a query, filter by those IDs
    if (
      debouncedQuery.trim() &&
      useServerSearch &&
      serverSearchResults !== null
    ) {
      const serverIdSet = new Set(serverSearchResults);
      baseMembers = members.filter(m => serverIdSet.has(m.id));
    }

    return baseMembers.filter(member => {
      // Client-side search fallback (when server search is not available)
      if (
        debouncedQuery.trim() &&
        (!useServerSearch || serverSearchResults === null)
      ) {
        const normalizedQuery = normalizeText(debouncedQuery);

        const age = calculateAge(member.dateOfBirth);
        const ageString = age !== null ? `${age}` : "";
        const ageWithUnit = age !== null ? `${age} ani` : "";

        const allNeeds = [
          member.branchNeeds || "",
          member.foundationNeeds || "",
          member.otherNeeds || "",
        ].join(" ");
        const observations = member.otherObservations || "";

        const memberGroupNames = (member.whatsappGroupIds || [])
          .map(groupId => {
            const group = groups.find(g => g.id === groupId);
            return group ? group.name : "";
          })
          .join(" ");

        // Check member code using the utility that supports all formats
        const matchesMemberCode = memberCodeMatchesSearch(
          member.memberCode,
          debouncedQuery
        );

        const matchesSimple =
          matchesMemberCode ||
          normalizeText(member.lastName || "").includes(normalizedQuery) ||
          normalizeText(member.firstName || "").includes(normalizedQuery) ||
          normalizeText(member.cnp || "").includes(normalizedQuery) ||
          normalizeText(member.phone || "").includes(normalizedQuery) ||
          normalizeText(member.email || "").includes(normalizedQuery) ||
          normalizeText(member.rank || "").includes(normalizedQuery) ||
          normalizeText(member.unit || "").includes(normalizedQuery) ||
          normalizeText(member.mainProfile || "").includes(normalizedQuery) ||
          normalizeText(member.provenance || "").includes(normalizedQuery) ||
          normalizeText(member.status || "").includes(normalizedQuery) ||
          normalizeText(ageString).includes(normalizedQuery) ||
          normalizeText(ageWithUnit).includes(normalizedQuery) ||
          normalizeText(allNeeds).includes(normalizedQuery) ||
          normalizeText(observations).includes(normalizedQuery) ||
          normalizeText(memberGroupNames).includes(normalizedQuery);

        if (!matchesSimple) return false;
      }

      if (
        advancedFilters.ranks.length > 0 &&
        !advancedFilters.ranks.includes(member.rank)
      )
        return false;
      if (
        advancedFilters.units.length > 0 &&
        !advancedFilters.units.includes(member.unit)
      )
        return false;
      if (
        advancedFilters.profiles.length > 0 &&
        !advancedFilters.profiles.includes(member.mainProfile)
      )
        return false;
      if (
        advancedFilters.carStatus &&
        member.status !== advancedFilters.carStatus
      )
        return false;

      if (advancedFilters.foundationStatus) {
        if (advancedFilters.foundationStatus === "Beneficiar") {
          if (
            member.foundationMemberStatus !== "Da" ||
            member.foundationRole !== "Beneficiar program"
          )
            return false;
        } else if (
          member.foundationMemberStatus !== advancedFilters.foundationStatus
        ) {
          return false;
        }
      }

      if (
        advancedFilters.provenances.length > 0 &&
        !advancedFilters.provenances.includes(member.provenance || "")
      )
        return false;

      if (
        advancedFilters.withdrawalReasons.length > 0 &&
        !advancedFilters.withdrawalReasons.includes(
          member.withdrawalReason || ""
        )
      )
        return false;

      if (
        advancedFilters.enrollmentYearStart &&
        (member.branchEnrollmentYear || 0) <
          Number.parseInt(advancedFilters.enrollmentYearStart)
      )
        return false;
      if (
        advancedFilters.enrollmentYearEnd &&
        (member.branchEnrollmentYear || 0) >
          Number.parseInt(advancedFilters.enrollmentYearEnd)
      )
        return false;

      if (
        advancedFilters.retirementYearStart &&
        (member.retirementYear || 0) <
          Number.parseInt(advancedFilters.retirementYearStart)
      )
        return false;
      if (
        advancedFilters.retirementYearEnd &&
        (member.retirementYear || 0) >
          Number.parseInt(advancedFilters.retirementYearEnd)
      )
        return false;

      if (advancedFilters.ageMin || advancedFilters.ageMax) {
        const age = calculateAge(member.dateOfBirth);
        if (age === null) return false;
        if (
          advancedFilters.ageMin &&
          age < Number.parseInt(advancedFilters.ageMin)
        )
          return false;
        if (
          advancedFilters.ageMax &&
          age > Number.parseInt(advancedFilters.ageMax)
        )
          return false;
      }

      // Filter by Needs Status
      if (
        advancedFilters.needsFilter &&
        advancedFilters.needsFilter !== "all"
      ) {
        const memberNeeds = [
          member.branchNeeds || "",
          member.foundationNeeds || "",
          member.otherNeeds || "",
        ].join("\n");
        const memberNeedsList = memberNeeds
          .split(/[\n,;]+/)
          .map(n => n.trim())
          .filter(n => n);
        const hasNeeds = memberNeedsList.length > 0;

        // "none" = no requests at all
        if (advancedFilters.needsFilter === "none" && hasNeeds) return false;
        // "active" = has needs (Nevoi)
        if (advancedFilters.needsFilter === "active" && !hasNeeds) return false;
        // "inactive" = no current requests (placeholder - same as "none" for now)
        if (advancedFilters.needsFilter === "inactive" && hasNeeds)
          return false;
      }

      if (advancedFilters.whatsappGroups.length > 0) {
        const memberGroupIds = member.whatsappGroupIds || [];
        const hasAnySelectedGroup = advancedFilters.whatsappGroups.some(
          groupId => memberGroupIds.includes(groupId)
        );
        if (!hasAnySelectedGroup) return false;
      }

      // Filter by Activity Types (OR logic - member participated in ANY of the selected activity types)
      if (advancedFilters.activityTypes.length > 0) {
        // Find activities that match selected activity types
        const matchingActivities = activities.filter(activity =>
          advancedFilters.activityTypes.includes(activity.type_id)
        );
        // Check if member participated in any of those activities
        const memberParticipatedInAny = matchingActivities.some(activity => {
          const participants = getParticipants(activity.id);
          return participants.some(p => p.member_id === member.id);
        });
        if (!memberParticipatedInAny) return false;
      }

      return true;
    });
  }, [
    members,
    debouncedQuery,
    advancedFilters,
    groups,
    activities,
    getParticipants,
    serverSearchResults,
    useServerSearch,
  ]);

  const sortedMembers = useMemo(() => {
    return sortMembers(filteredMembers, sortBy, sortDir);
  }, [filteredMembers, sortBy, sortDir]);

  const filterDescription = useMemo(() => {
    const parts: string[] = [];
    if (advancedFilters.carStatus) parts.push(advancedFilters.carStatus);
    if (advancedFilters.ranks.length > 0) parts.push(advancedFilters.ranks[0]);
    if (advancedFilters.profiles.length > 0)
      parts.push(advancedFilters.profiles[0]);
    if (advancedFilters.needsFilter)
      parts.push(`nevoi-${advancedFilters.needsFilter}`);
    if (advancedFilters.whatsappGroups.length > 0)
      parts.push(`${advancedFilters.whatsappGroups.length}-grupuri WhatsApp`);
    return parts.join("-");
  }, [advancedFilters]);

  return (
    <PageContainer
      title="Listă Membri"
      description="Gestionează membrii asociației"
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setExportModalOpen(true)}
            disabled={sortedMembers.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          {hasPermission("edit") ? (
            <Link href="/members/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adaugă Membru
              </Button>
            </Link>
          ) : undefined}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Unified Control Bar */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 border border-border rounded-lg">
          {/* Search - flex-1 to take remaining space */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Caută după nume, cod, grad, UM..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-background border-border"
            />
          </div>

          {/* Filters button */}
          <MemberFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filters={advancedFilters}
            setFilters={setAdvancedFilters}
            resultCount={sortedMembers.length}
            hideSearch
          />

          {/* Sort control */}
          <ListSorter
            options={SORT_OPTIONS}
            value={sortBy}
            direction={sortDir}
            onChange={handleSortChange}
            compact
          />
        </div>

        {(isSearching && debouncedQuery) || loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <span className="animate-pulse">
              {loading ? "Se încarcă membrii..." : "Căutare în curs..."}
            </span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium text-destructive">
              Eroare la încărcarea membrilor
            </p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        ) : sortedMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              Nu s-au găsit membri
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {debouncedQuery ? (
                <>
                  Nu s-au găsit membri pentru:{" "}
                  <span className="font-medium">"{debouncedQuery}"</span>
                </>
              ) : advancedFilters.ranks.length > 0 ? (
                "Încercați să ajustați filtrele de căutare"
              ) : (
                "Nu există membri înregistrați în sistem"
              )}
            </p>
          </div>
        ) : (
          <MembersTable data={sortedMembers} />
        )}
      </div>

      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        members={sortedMembers}
        filterDescription={filterDescription}
      />
    </PageContainer>
  );
}

export default function MembersPage() {
  return <MembersPageContent />;
}
