"use client";

import { useState, useEffect } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { useIsAdmin } from "@/hooks/use-role";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { UsersTable } from "@/components/admin/users-table";
import { CreateUserModal } from "@/components/admin/create-user-modal";
import { useToast } from "@/hooks/use-toast";

export const dynamic = "force-dynamic";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "editor" | "viewer";
  is_active: boolean;
  created_at: string;
}

export default function AdminUsersPage() {
  const isAdmin = useIsAdmin();
  const router = useRouter();
  const { isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Redirect if not admin (after auth loads)
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/");
      toast({
        title: "Access Denied",
        description: "You must be an admin to access this page.",
        variant: "destructive",
      });
    }
  }, [isAdmin, authLoading, router, toast]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/users");

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchUsers();
  };

  const handleUserCreated = () => {
    setIsCreateModalOpen(false);
    fetchUsers();
  };

  const handleRoleChanged = () => {
    fetchUsers();
  };

  // Don't render anything until auth is loaded
  if (authLoading) {
    return (
      <PageContainer
        title="User Management"
        description="Manage user accounts and roles"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Don't render if not admin
  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <PageContainer
        title="User Management"
        description="Manage user accounts and roles"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading users...</p>
            </div>
          </div>
        ) : (
          <UsersTable data={users} onRoleChanged={handleRoleChanged} />
        )}
      </PageContainer>

      <CreateUserModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onUserCreated={handleUserCreated}
      />
    </>
  );
}
