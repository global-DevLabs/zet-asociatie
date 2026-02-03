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
import { createBrowserClient } from "@/lib/supabase/client";

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
  const supabaseRef = useRef(createBrowserClient());

  const isAuthenticated = user !== null;

  // Helper function to fetch user profile - moved outside useEffect to be reusable
  const fetchProfile = async (userId: string, email: string): Promise<User> => {
    const supabase = supabaseRef.current;

    // Always return a basic user - profile fetch is optional
    const basicUser: User = {
      id: userId,
      email: email,
      firstName: email.split("@")[0],
      lastName: "",
      role: "viewer" as UserRole,
      createdAt: new Date().toISOString(),
    };

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.warn("Profile fetch failed, using basic user:", error.message);
        return basicUser;
      }

      if (profile) {
        const nameParts = (profile.full_name || email.split("@")[0]).split(" ");
        return {
          id: profile.id,
          email: profile.email || email,
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          role: (profile.role || "viewer") as UserRole,
          createdAt: profile.created_at,
        };
      }

      return basicUser;
    } catch (err) {
      console.warn("Profile fetch error:", err);
      return basicUser;
    }
  };

  useEffect(() => {
    let mounted = true;
    const supabase = supabaseRef.current;

    async function init() {
      try {
        // Use getUser() instead of getSession() to get fresh data from server
        const {
          data: { user: authUser },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          // Auth error is expected when not logged in, don't log as error
          if (error.message !== "Auth session missing!") {
            console.error("Auth check error:", error);
          }
        }

        if (authUser && mounted) {
          const profile = await fetchProfile(authUser.id, authUser.email || "");
          if (mounted) {
            setUser(profile);
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

    // Auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (
        (event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "INITIAL_SESSION") &&
        session?.user
      ) {
        const profile = await fetchProfile(
          session.user.id,
          session.user.email || ""
        );
        if (mounted) {
          setUser(profile);
          // Ensure loading is false after auth state resolves
          if (loadingRef.current) {
            loadingRef.current = false;
            setIsLoading(false);
          }
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const supabase = supabaseRef.current;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        AuditLogger.log({
          user: null,
          actionType: "LOGIN_FAILED",
          module: "auth",
          summary: `Failed login attempt for ${email}`,
          metadata: { email, error: error.message },
          isError: true,
        });
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: "No user returned" };
      }

      // Directly fetch and set the user profile instead of waiting for onAuthStateChange
      // This ensures the UI updates immediately after successful login
      const profile = await fetchProfile(data.user.id, data.user.email || "");
      setUser(profile);

      AuditLogger.log({
        user: profile,
        actionType: "LOGIN",
        module: "auth",
        summary: `${profile.firstName} ${profile.lastName} logged in`,
      });

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
      const supabase = createBrowserClient();
      await supabase.auth.signOut();
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
