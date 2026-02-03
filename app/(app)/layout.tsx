"use client";

import type React from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { MembersProvider } from "@/lib/members-store";
import { PaymentsProvider } from "@/lib/payments-store";
import { ActivitiesProvider } from "@/lib/activities-store";
import { WhatsAppGroupsProvider } from "@/lib/whatsapp-groups-store";
import { MemberGroupsProvider } from "@/lib/member-groups-store";
import { AuditLogProvider } from "@/lib/audit-log-store";
import { UMUnitsProvider } from "@/lib/um-units-store";
import { QuickCashinProvider } from "@/lib/quick-cashin-context";
import { QuickCashinModal } from "@/components/payments/quick-cashin-modal";

function DataProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuditLogProvider>
      <UMUnitsProvider>
        <MembersProvider>
          <PaymentsProvider>
            <ActivitiesProvider>
              <WhatsAppGroupsProvider>
                <MemberGroupsProvider>
                  <QuickCashinProvider>
                    {children}
                    <QuickCashinModal />
                  </QuickCashinProvider>
                </MemberGroupsProvider>
              </WhatsAppGroupsProvider>
            </ActivitiesProvider>
          </PaymentsProvider>
        </MembersProvider>
      </UMUnitsProvider>
    </AuditLogProvider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <DataProviders>
        <div className="min-h-screen bg-background">
          <AppSidebar />
          {children}
        </div>
      </DataProviders>
    </ProtectedRoute>
  );
}
