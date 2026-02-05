import { NextResponse } from "next/server";
import { Client } from "pg";

export type HealthService = {
  id: string;
  name: string;
  ok: boolean;
  message: string;
};

export async function GET() {
  const services: HealthService[] = [];

  // 1. Application config (LOCAL_DB_URL, JWT_SECRET)
  const hasConfig =
    !!process.env.LOCAL_DB_URL?.trim() && !!process.env.JWT_SECRET?.trim();
  services.push({
    id: "config",
    name: "Configurare aplicație",
    ok: hasConfig,
    message: hasConfig
      ? "LOCAL_DB_URL și JWT_SECRET sunt setate"
      : "Lipsesc LOCAL_DB_URL sau JWT_SECRET. Reporniți aplicația.",
  });

  // 2. Database (PostgreSQL)
  if (!hasConfig) {
    services.push({
      id: "database",
      name: "Bază de date (PostgreSQL)",
      ok: false,
      message: "Nu se poate verifica fără configurare.",
    });
  } else {
    let dbOk = false;
    let dbMessage = "Conectare eșuată.";
    try {
      const client = new Client({
        connectionString: process.env.LOCAL_DB_URL,
        connectionTimeoutMillis: 3000,
      });
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      dbOk = true;
      dbMessage = "Conectat.";
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("ECONNREFUSED")) {
        dbMessage = "PostgreSQL nu rulează sau portul este incorect.";
      } else if (msg.includes("timeout") || msg.includes("Timeout")) {
        dbMessage = "Timeout la conectare.";
      } else {
        dbMessage = msg.slice(0, 80);
      }
    }
    services.push({
      id: "database",
      name: "Bază de date (PostgreSQL)",
      ok: dbOk,
      message: dbMessage,
    });
  }

  // 3. API (we're here, so it's up)
  services.push({
    id: "api",
    name: "Server API",
    ok: true,
    message: "Funcțional.",
  });

  return NextResponse.json({ services });
}
