"use client"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { PageContainer } from "@/components/layout/page-container"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ListManager } from "@/components/settings/list-manager"
import { UMUnitsManager } from "@/components/settings/um-units-manager"
import { WhatsAppGroupsManager } from "@/components/settings/whatsapp-groups-manager"
import { useSettings } from "@/lib/settings-store"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { useAuth } from "@/lib/auth-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock } from "lucide-react"

export const dynamic = 'force-dynamic'

function SettingsPageContent() {
  const { ranks, profiles, paymentMethods, updateRanks, updateProfiles, updatePaymentMethods } = useSettings()
  const { hasPermission } = useAuth()

  const canEditSettings = hasPermission("settings")

  if (!canEditSettings) {
    return (
      <div className="min-h-screen bg-background">
        <AppSidebar />
        <PageContainer title="Setări Aplicație" description="Gestionează listele de valori utilizate în aplicație">
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Nu aveți permisiuni pentru a modifica setările. Doar administratorii pot actualiza dicționarele.
            </AlertDescription>
          </Alert>
        </PageContainer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <PageContainer title="Setări Aplicație" description="Gestionează listele de valori utilizate în aplicație">
        <Tabs defaultValue="ranks" className="w-full">
          <TabsList className="inline-flex h-11 items-center justify-start rounded-xl bg-muted/60 p-1.5 text-muted-foreground w-auto shadow-sm">
            <TabsTrigger
              value="ranks"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2 text-sm font-semibold ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md"
            >
              Grade
            </TabsTrigger>
            <TabsTrigger
              value="units"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2 text-sm font-semibold ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md"
            >
              Unități (UM)
            </TabsTrigger>
            <TabsTrigger
              value="profiles"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2 text-sm font-semibold ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md"
            >
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2 text-sm font-semibold ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md"
            >
              Plăți
            </TabsTrigger>
            <TabsTrigger
              value="whatsapp"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2 text-sm font-semibold ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md"
            >
              WhatsApp
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ranks" className="mt-6">
            <ListManager
              title="Listă Grade Militare"
              description="Gestionează gradele disponibile pentru membri."
              items={ranks}
              onUpdate={updateRanks}
            />
          </TabsContent>

          <TabsContent value="units" className="mt-6">
            <UMUnitsManager />
          </TabsContent>

          <TabsContent value="profiles" className="mt-6">
            <ListManager
              title="Listă Profile"
              description="Gestionează profilele profesionale disponibile."
              items={profiles}
              onUpdate={updateProfiles}
            />
          </TabsContent>

          <TabsContent value="payments" className="mt-6">
            <ListManager
              title="Metode de Plată"
              description="Gestionează metodele de plată acceptate."
              items={paymentMethods}
              onUpdate={updatePaymentMethods}
            />
          </TabsContent>

          <TabsContent value="whatsapp" className="mt-6">
            <WhatsAppGroupsManager />
          </TabsContent>
        </Tabs>
      </PageContainer>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsPageContent />
    </ProtectedRoute>
  )
}
