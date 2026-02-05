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

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const text = await res.text();
        let data: { user?: unknown } = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          // Server returned non-JSON (e.g. "Internal Server Error" plain text)
          if (!res.ok) console.error("Auth init: server returned", res.status, text?.slice(0, 80));
        }
        if (mounted && data.user) {
          setUser(data.user);
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

    const timeoutId = setTimeout(() => {
      if (mounted && loadingRef.current) {
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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const text = await res.text();
      let data: { user?: unknown; error?: string } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: res.ok ? undefined : "Login failed" };
      }

      if (!res.ok) {
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

      if (data.user) {
        setUser(data.user);
        AuditLogger.log({
          user: data.user,
          actionType: "LOGIN",
          module: "auth",
          summary: `${data.user.firstName} ${data.user.lastName} logged in`,
        });
      }
      return { success: true };
    } catch (err) {
      console.error("Login error:", err);
      return { success: false, error: "An unexpected error occurred" };
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
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
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
