import { NextResponse } from "next/server";
import { Client } from "pg";

export type HealthService = {
  id: string;
  name: string;
  ok: boolean;
  message: string;
};

export async function GET() {
  try {
    const services: HealthService[] = [];

    // 1. Application config (LOCAL_DB_URL, JWT_SECRET) — written by first-run Postgres setup
    const hasConfig =
      !!process.env.LOCAL_DB_URL?.trim() && !!process.env.JWT_SECRET?.trim();
    services.push({
      id: "config",
      name: "Configurare aplicație",
      ok: hasConfig,
      message: hasConfig
        ? "Variabilele de mediu (LOCAL_DB_URL, JWT_SECRET) sunt setate corect."
        : "Lipsesc LOCAL_DB_URL sau JWT_SECRET. Configurația se creează la prima pornire când Postgres pornește cu succes. Dacă apare această eroare, configurarea inițială (Postgres) a eșuat: verificați debug.log (vezi caseta de mai jos), reporniți aplicația ca Administrator sau verificați dacă portul 5432/5433 e liber.",
    });

    // 2. Database (PostgreSQL)
    if (!hasConfig) {
      services.push({
        id: "database",
        name: "Bază de date (PostgreSQL)",
        ok: false,
        message:
          "Nu se poate verifica — configurarea aplicației lipsește deoarece configurarea inițială (pornirea Postgres) nu s-a finalizat. Verificați debug.log pentru [SETUP] și reporniți aplicația.",
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
        dbMessage = "Conexiune reușită. Baza de date este disponibilă.";
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("ECONNREFUSED")) {
          dbMessage = "PostgreSQL nu rulează sau portul este greșit. Verificați dacă serviciul Postgres rulează.";
        } else if (msg.includes("timeout") || msg.includes("Timeout")) {
          dbMessage = "Timeout la conectare. Postgres poate fi încă în pornire sau adresa/portul sunt incorecte.";
        } else if (msg.includes("password") || msg.includes("authentication")) {
          dbMessage = "Autentificare eșuată. Verificați parola din LOCAL_DB_URL (config.json).";
        } else {
          dbMessage = msg.slice(0, 120);
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
      message: "Serverul Next.js răspunde. API-ul este disponibil.",
    });

    return NextResponse.json({ services });
  } catch (err) {
    console.error("Health check error:", err);
    return NextResponse.json({
      services: [
        {
          id: "config",
          name: "Configurare aplicație",
          ok: false,
          message: "Eroare la verificare.",
        },
        {
          id: "database",
          name: "Bază de date (PostgreSQL)",
          ok: false,
          message: "Eroare la verificare.",
        },
        {
          id: "api",
          name: "Server API",
          ok: false,
          message: "Eroare internă server. Verificați fișierul debug.log.",
        },
      ],
    });
  }
}
