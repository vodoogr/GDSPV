"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Search, Upload, Inbox, TrendingUp, Settings } from "lucide-react"
import Dashboard from "@/components/dashboard"
import SearchIncidencias from "@/components/search-incidencias"
import IncidenciasImporter from "@/components/incidencias-importer"
import RecibidaSection from "@/components/recibida-section"
import AnalyticsDashboard from "@/components/analytics/analytics-dashboard"
import DatabaseStatus from "@/components/database-status"
import Header from "@/components/layout/header"
import { useAuth } from "@/contexts/auth-context"
import LoginPage from "@/components/login-page"

export default function Home() {
  const { user, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState("dashboard")

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  const getAvailableTabs = (userRole: string) => {
    const baseTabs = [
      { id: "dashboard", label: "Dashboard", icon: BarChart3 },
      { id: "search", label: "Búsqueda", icon: Search },
      { id: "import", label: "Importar", icon: Upload },
    ]

    // Solo Supervisor y admin pueden ver estas opciones
    if (userRole === "Supervisor" || userRole === "Administrador") {
      baseTabs.push(
        { id: "recibidas", label: "Recibidas", icon: Inbox },
        { id: "analytics", label: "Analytics", icon: TrendingUp },
        { id: "config", label: "Configuración", icon: Settings },
      )
    }

    return baseTabs
  }

  const availableTabs = getAvailableTabs(user.role)

  // Si el tab activo no está disponible para el usuario, cambiar al dashboard
  if (!availableTabs.find((tab) => tab.id === activeTab)) {
    setActiveTab("dashboard")
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <div className="container mx-auto p-6 space-y-6">
        {/* Header Principal */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Sistema de Gestión de Postventa</h1>
          <p className="text-slate-600 dark:text-slate-400">Control y seguimiento de incidencias de postventa</p>
        </div>

        {/* Estado de Base de Datos */}
        <DatabaseStatus />

        {/* Navegación Principal */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 gap-1">
            {availableTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2 text-xs sm:text-sm">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <Dashboard />
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            <SearchIncidencias />
          </TabsContent>

          <TabsContent value="import" className="space-y-6">
            <IncidenciasImporter />
          </TabsContent>

          {/* Tabs solo para Supervisor y Administrador */}
          {(user.role === "Supervisor" || user.role === "Administrador") && (
            <>
              <TabsContent value="recibidas" className="space-y-6">
                <RecibidaSection />
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <AnalyticsDashboard />
              </TabsContent>

              <TabsContent value="config" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Configuración del Sistema
                    </CardTitle>
                    <CardDescription>
                      Configuración avanzada del sistema (Solo para Supervisores y Administradores)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Settings className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-600 mb-2">Panel de Configuración</h3>
                      <p className="text-slate-500">Funcionalidades de configuración disponibles próximamente</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  )
}
