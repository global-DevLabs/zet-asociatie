import type React from "react";
import type { Metadata } from "next";

import "./globals.css";

import { AuthProvider } from "@/lib/auth-context";
import { SettingsProvider } from "@/lib/settings-store";
import { Toaster } from "@/components/ui/toaster";

import { Inter, Geist_Mono as V0_Font_Geist_Mono } from "next/font/google";

// Initialize fonts
const _geistMono = V0_Font_Geist_Mono({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Registru Membri Asociație",
  description: "Aplicatie de administrare membri",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" className="antialiased">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const resizeObserverErrMsg = 'ResizeObserver loop';
                window.onerror = function(msg) {
                  if (msg && msg.toString().includes(resizeObserverErrMsg)) {
                    return true;
                  }
                  return false;
                };
                window.addEventListener('error', function(e) {
                  if (e.message && e.message.includes(resizeObserverErrMsg)) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);
                if (typeof ResizeObserver !== 'undefined') {
                  const OriginalResizeObserver = window.ResizeObserver;
                  window.ResizeObserver = class SafeResizeObserver {
                    constructor(callback) {
                      this._observer = new OriginalResizeObserver((entries, observer) => {
                        try {
                          callback(entries, observer);
                        } catch (e) {
                          if (!e.message?.includes(resizeObserverErrMsg)) {
                            console.error('[ResizeObserver Error]:', e);
                          }
                        }
                      });
                    }
                    observe(...args) { return this._observer.observe(...args); }
                    unobserve(...args) { return this._observer.unobserve(...args); }
                    disconnect(...args) { return this._observer.disconnect(...args); }
                  };
                }
                const originalError = console.error;
                console.error = function(...args) {
                  const msg = args.join(' ');
                  if (!msg.includes(resizeObserverErrMsg)) {
                    originalError.apply(console, args);
                  }
                };
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} font-sans bg-background text-foreground min-h-screen`}
      >
        <AuthProvider>
          <SettingsProvider>
            {children}
            <Toaster />
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
