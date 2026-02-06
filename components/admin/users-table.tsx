"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Shield, Pencil, Eye } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { profilesApi } from "@/lib/db-adapter";
import { isTauri } from "@/lib/db";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "editor" | "viewer";
  is_active: boolean;
  created_at: string;
}

interface UsersTableProps {
  data: UserProfile[];
  onRoleChanged: () => void;
}

export function UsersTable({ data, onRoleChanged }: UsersTableProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setUpdatingUserId(userId);

      if (isTauri()) {
        const ok = await profilesApi.updateProfile(userId, { role: newRole as "admin" | "editor" | "viewer" });
        if (!ok) throw new Error("Failed to update role");
      } else {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update role");
        }
      }

      toast({ title: "Success", description: "User role updated successfully" });
      onRoleChanged();
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update role",
        variant: "destructive",
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleActiveToggle = async (userId: string, isActive: boolean) => {
    try {
      setUpdatingUserId(userId);

      if (isTauri()) {
        const ok = await profilesApi.updateProfile(userId, { is_active: isActive });
        if (!ok) throw new Error("Failed to update status");
      } else {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: isActive }),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update status");
        }
      }

      toast({
        title: "Success",
        description: `User ${isActive ? "activated" : "deactivated"} successfully`,
      });
      onRoleChanged();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      admin: "default",
      editor: "secondary",
      viewer: "outline",
    };

    const icons: Record<string, JSX.Element> = {
      admin: <Shield className="h-3 w-3 mr-1" />,
      editor: <Pencil className="h-3 w-3 mr-1" />,
      viewer: <Eye className="h-3 w-3 mr-1" />,
    };

    return (
      <Badge variant={variants[role] || "outline"} className="capitalize">
        {icons[role]}
        {role}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("ro-RO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const isCurrentUser = (userId: string) => currentUser?.id === userId;

  return (
    <div className="rounded-xl border-0 bg-card shadow-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/50">
            <TableHead className="font-semibold text-foreground/90">
              Name
            </TableHead>
            <TableHead className="font-semibold text-foreground/90">
              Email
            </TableHead>
            <TableHead className="font-semibold text-foreground/90">
              Role
            </TableHead>
            <TableHead className="font-semibold text-foreground/90">
              Status
            </TableHead>
            <TableHead className="font-semibold text-foreground/90">
              Created
            </TableHead>
            <TableHead className="text-right font-semibold text-foreground/90">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <p className="text-sm font-medium">No users found.</p>
                  <p className="text-xs mt-1">Create your first user to get started.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((user) => (
              <TableRow
                key={user.id}
                className={`hover:bg-muted/30 transition-colors duration-150 border-b border-border/30 ${
                  isCurrentUser(user.id) ? "bg-primary/5" : ""
                }`}
              >
                <TableCell className="font-medium">
                  {user.full_name}
                  {isCurrentUser(user.id) && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      You
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {user.email}
                </TableCell>
                <TableCell>
                  {isCurrentUser(user.id) ? (
                    getRoleBadge(user.role)
                  ) : (
                    <Select
                      value={user.role}
                      onValueChange={(value) => handleRoleChange(user.id, value)}
                      disabled={updatingUserId === user.id}
                    >
                      <SelectTrigger className="w-[130px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center">
                            <Shield className="h-3 w-3 mr-2" />
                            Admin
                          </div>
                        </SelectItem>
                        <SelectItem value="editor">
                          <div className="flex items-center">
                            <Pencil className="h-3 w-3 mr-2" />
                            Editor
                          </div>
                        </SelectItem>
                        <SelectItem value="viewer">
                          <div className="flex items-center">
                            <Eye className="h-3 w-3 mr-2" />
                            Viewer
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={user.is_active}
                      onCheckedChange={(checked) =>
                        handleActiveToggle(user.id, checked)
                      }
                      disabled={
                        updatingUserId === user.id || isCurrentUser(user.id)
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(user.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  {updatingUserId === user.id && (
                    <span className="text-xs text-muted-foreground">
                      Updating...
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/20">
        <div className="text-xs text-muted-foreground font-medium">
          Showing{" "}
          <span className="font-semibold text-foreground">{data.length}</span>{" "}
          user{data.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}
