"use client";

import type React from "react";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, CheckCircle2, RefreshCw, Settings, XCircle } from "lucide-react";

type HealthService = {
  id: string;
  name: string;
  ok: boolean;
  message: string;
};

function SetupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [services, setServices] = useState<HealthService[]>([]);
  const [healthLoading, setHealthLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const res = await fetch("/api/setup", { credentials: "include" });
        const text = await res.text();
        let data: { setupRequired?: boolean } = { setupRequired: true };
        try {
          data = text ? JSON.parse(text) : data;
        } catch {
          // Non-JSON response (e.g. 500 plain text) → assume setup required
        }
        if (mounted && !data.setupRequired) {
          router.replace("/login");
          return;
        }
      } catch {
        // Assume setup required on error (e.g. DB not ready)
      } finally {
        if (mounted) setChecking(false);
      }
    }
    check();
    return () => {
      mounted = false;
    };
  }, [router]);

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/health", { credentials: "include" });
      const text = await res.text();
      let data: { services?: HealthService[] } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setServices([
          {
            id: "config",
            name: "Configurare aplicație",
            ok: false,
            message: "Nu s-a putut citi răspunsul.",
          },
          {
            id: "database",
            name: "Bază de date (PostgreSQL)",
            ok: false,
            message: "—",
          },
          {
            id: "api",
            name: "Server API",
            ok: false,
            message:
              "Răspuns invalid. Reporniți aplicația; dacă problema persistă, verificați debug.log.",
          },
        ]);
        return;
      }
      if (Array.isArray(data.services)) {
        setServices(data.services);
      }
    } catch {
      setServices([
        {
          id: "api",
          name: "Server API",
          ok: false,
          message: "Nu s-a putut contacta serverul. Reporniți aplicația.",
        },
      ]);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Parolele nu coincid.");
      return;
    }
    if (password.length < 8) {
      setError("Parola trebuie să aibă cel puțin 8 caractere.");
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const text = await res.text();
      let data: { error?: string } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: "Configurare eșuată." };
      }

      if (!res.ok) {
        setError(data.error || "Configurare eșuată.");
        setSubmitting(false);
        return;
      }
      router.replace("/login");
    } catch {
      setError("A apărut o eroare. Încercați din nou.");
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="space-y-2 text-center pb-8">
          <div className="mx-auto w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-4 shadow-md">
            <Settings className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Configurare inițială
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Creați contul de administrator. Acest pas se face o singură dată.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Service status */}
          <div className="rounded-lg border bg-muted/40 p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Servicii și dependențe
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => fetchHealth()}
                disabled={healthLoading}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${healthLoading ? "animate-spin" : ""}`} />
                Reîmprospătează
              </Button>
            </div>
            {healthLoading ? (
              <p className="text-sm text-muted-foreground py-2">Se verifică serviciile...</p>
            ) : (
              <>
                {/* Overall status */}
                {services.length > 0 && (
                  <div
                    className={`mb-3 px-3 py-2 rounded-md text-sm font-medium ${
                      services.every((s) => s.ok)
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {services.every((s) => s.ok)
                      ? "Toate serviciile sunt gata. Puteți crea contul de administrator."
                      : `${services.filter((s) => !s.ok).length} problemă(e) detectate. Verificați detaliile mai jos.`}
                  </div>
                )}
                {/* Per-service list */}
                <ul className="space-y-3">
                  {services.map((s) => (
                    <li
                      key={s.id}
                      className={`rounded-md border p-2.5 ${
                        s.ok
                          ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10"
                          : "border-destructive/30 bg-destructive/5 dark:border-destructive/50 dark:bg-destructive/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {s.name}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
                            s.ok
                              ? "bg-green-600 text-white dark:bg-green-700"
                              : "bg-destructive text-destructive-foreground"
                          }`}
                        >
                          {s.ok ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              Gata
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" />
                              Problemă
                            </>
                          )}
                        </span>
                      </div>
                      <p
                        className={`mt-1 text-xs ${
                          s.ok
                            ? "text-muted-foreground"
                            : "text-destructive font-medium"
                        }`}
                      >
                        {s.message}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email administrator
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@exemplu.ro"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Parolă
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="h-11 shadow-sm"
              />
              <p className="text-xs text-muted-foreground">
                Minimum 8 caractere.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirmare parolă
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="h-11 shadow-sm"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 shadow-md"
              disabled={submitting}
            >
              {submitting ? "Se creează contul..." : "Creează cont administrator"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <SetupForm />
    </Suspense>
  );
}
