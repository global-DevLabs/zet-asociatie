"use client";

import type React from "react";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
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
import { AlertCircle } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Redirect if authenticated; otherwise check if first-run setup is needed
  useEffect(() => {
    if (isAuthenticated) {
      const callbackUrl = searchParams.get("callbackUrl") || "/";
      router.replace(callbackUrl);
      return;
    }
    let mounted = true;
    fetch("/api/setup", { credentials: "include" })
      .then((res) => res.text())
      .then((text) => {
        let data: { setupRequired?: boolean } = { setupRequired: true };
        try {
          data = text ? JSON.parse(text) : data;
        } catch {
          data = { setupRequired: true };
        }
        return data;
      })
      .then((data) => {
        if (mounted) {
          if (data.setupRequired) {
            router.replace("/setup");
          } else {
            setCheckingSetup(false);
          }
        }
      })
      .catch(() => {
        if (mounted) setCheckingSetup(false);
      });
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error || "Email sau parolă incorectă");
      setSubmitting(false);
    } else {
      // Login successful - redirect immediately
      const callbackUrl = searchParams.get("callbackUrl") || "/";
      router.replace(callbackUrl);
    }
  };

  // If authenticated or still checking setup, show spinner
  if (isAuthenticated || checkingSetup) {
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
            <span className="text-2xl font-bold text-white">A</span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Autentificare
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Sistem de Management Asociație
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplu.ro"
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
                autoComplete="current-password"
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
              {submitting ? "Se autentifică..." : "Autentificare"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
