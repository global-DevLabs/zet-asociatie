"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { User, UserRole } from "@/types";
import { AuditLogger } from "@/lib/audit-logger";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  hasPermission: (action: "view" | "edit" | "delete" | "settings") => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const loadingRef = useRef(true);

  const isAuthenticated = user !== null;

  // Helper function to convert api user to User type
  const convertApiUserToUser = (apiUser: any): User => {
    const nameParts = (apiUser.fullName || apiUser.email.split("@")[0]).split(
      " "
    );
    return {
      id: apiUser.id,
      email: apiUser.email,
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      role: (apiUser.role || "viewer") as UserRole,
      createdAt: new Date().toISOString(),
    };
  };

  // Check if user is already logged in (from JWT cookie)
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const response = await fetch("/api/auth/user", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok && mounted) {
          const data = await response.json();
          if (data.user) {
            setUser(convertApiUserToUser(data.user));
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (mounted) {
          loadingRef.current = false;
          setIsLoading(false);
        }
      }
    }

    // Safety timeout
    const timeoutId = setTimeout(() => {
      if (mounted && loadingRef.current) {
        console.warn("Auth check timed out after 3s");
        loadingRef.current = false;
        setIsLoading(false);
      }
    }, 3000);

    init();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        AuditLogger.log({
          user: null,
          actionType: "LOGIN_FAILED",
          module: "auth",
          summary: `Failed login attempt for ${email}`,
          metadata: { email, error: data.error },
          isError: true,
        });
        return { success: false, error: data.error || "Login failed" };
      }

      const data = await response.json();
      const user = convertApiUserToUser(data.user);
      setUser(user);

      AuditLogger.log({
        user,
        actionType: "LOGIN",
        module: "auth",
        summary: `${user.firstName} ${user.lastName} logged in`,
      });

      return { success: true };
    } catch (err: any) {
      console.error("Login error:", err);
      return {
        success: false,
        error: err.message || "An unexpected error occurred",
      };
    }
  };

  const logout = async () => {
    if (user) {
      AuditLogger.log({
        user,
        actionType: "LOGOUT",
        module: "auth",
        summary: `${user.firstName} ${user.lastName} logged out`,
      });
    }

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout error:", err);
    }

    setUser(null);
    router.push("/login");
  };

  const hasPermission = (
    action: "view" | "edit" | "delete" | "settings"
  ): boolean => {
    if (!user) return false;
    const role = user.role;

    switch (action) {
      case "view":
        return ["admin", "editor", "viewer"].includes(role);
      case "edit":
        return ["admin", "editor"].includes(role);
      case "delete":
        return role === "admin";
      case "settings":
        return role === "admin";
      default:
        return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, isLoading, login, logout, hasPermission }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
