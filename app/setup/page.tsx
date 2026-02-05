"use client";

import type React from "react";
import { useState, useEffect, Suspense } from "react";
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
import { AlertCircle, CheckCircle2, Settings, XCircle } from "lucide-react";

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

  // Fetch service status for the status section
  useEffect(() => {
    let mounted = true;
    async function fetchHealth() {
      try {
        const res = await fetch("/api/health", { credentials: "include" });
        const text = await res.text();
        let data: { services?: HealthService[] } = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          setServices([
            {
              id: "api",
              name: "Server API",
              ok: false,
              message: "Răspuns invalid de la server.",
            },
          ]);
          return;
        }
        if (mounted && Array.isArray(data.services)) {
          setServices(data.services);
        }
      } catch {
        if (mounted) {
          setServices([
            {
              id: "api",
              name: "Server API",
              ok: false,
              message: "Nu s-a putut contacta serverul.",
            },
          ]);
        }
      } finally {
        if (mounted) setHealthLoading(false);
      }
    }
    fetchHealth();
  }, []);

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
          <div className="rounded-lg border bg-muted/40 p-3">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Status servicii
            </h3>
            {healthLoading ? (
              <p className="text-xs text-muted-foreground">Se verifică...</p>
            ) : (
              <ul className="space-y-1.5">
                {services.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-start gap-2 text-sm"
                  >
                    {s.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    )}
                    <span className={s.ok ? "text-foreground" : "text-destructive"}>
                      <span className="font-medium">{s.name}:</span>{" "}
                      {s.message}
                    </span>
                  </li>
                ))}
              </ul>
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
