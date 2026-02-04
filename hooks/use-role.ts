import { useAuth } from "@/lib/auth-context";
import type { UserRole } from "@/types";

/**
 * Hook to access the current user's role
 * 
 * @returns The current user's role, or null if not authenticated
 * 
 * @example
 * const role = useRole();
 * if (role === 'admin') {
 *   // Show admin UI
 * }
 */
export function useRole(): UserRole | null {
  const { user } = useAuth();
  return user?.role || null;
}

/**
 * Hook to check if the current user has a specific role
 * 
 * @param requiredRole - The role to check for
 * @returns true if the user has the required role, false otherwise
 * 
 * @example
 * const isAdmin = useHasRole('admin');
 * if (isAdmin) {
 *   // Show admin UI
 * }
 */
export function useHasRole(requiredRole: UserRole): boolean {
  const role = useRole();
  return role === requiredRole;
}

/**
 * Hook to check if the current user has any of the specified roles
 * 
 * @param roles - Array of roles to check for
 * @returns true if the user has any of the specified roles, false otherwise
 * 
 * @example
 * const canEdit = useHasAnyRole(['admin', 'editor']);
 * if (canEdit) {
 *   // Show edit UI
 * }
 */
export function useHasAnyRole(roles: UserRole[]): boolean {
  const role = useRole();
  return role !== null && roles.includes(role);
}

/**
 * Hook to check if the current user is an admin
 * 
 * @returns true if the user is an admin, false otherwise
 * 
 * @example
 * const isAdmin = useIsAdmin();
 * if (isAdmin) {
 *   // Show admin UI
 * }
 */
export function useIsAdmin(): boolean {
  return useHasRole("admin");
}

/**
 * Hook to check if the current user can edit (admin or editor)
 * 
 * @returns true if the user can edit, false otherwise
 * 
 * @example
 * const canEdit = useCanEdit();
 * if (canEdit) {
 *   // Show edit UI
 * }
 */
export function useCanEdit(): boolean {
  return useHasAnyRole(["admin", "editor"]);
}
