"use client";

import type React from "react";
import { useAuth } from "@/lib/auth-context";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();

  // Middleware verifies auth and redirects to /login when needed.
  // This component shows loading state while auth initializes client-side.
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Se încarcă...</p>
        </div>
      </div>
    );
  }

  // If we reach here, middleware already verified auth - render children
  return <>{children}</>;
}
