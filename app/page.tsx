"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, FileText, Upload, AlertTriangle, Database, BarChart3 } from "lucide-react"
import SearchIncidencias from "@/components/search-incidencias"
import RecibidaSection from "@/components/recibida-section"
import Dashboard from "@/components/dashboard"
import DatabaseStatus from "@/components/database-status"
import IncidenciasImporter from "@/components/incidencias-importer"
import DataTypeVerifier from "@/components/data-type-verifier"
import ScriptExecutor from "@/components/script-executor"
import AnalyticsDashboard from "@/components/analytics/analytics-dashboard"

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("dashboard")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <img src="/placeholder.svg?height=60&width=200" alt="GDSPV Logo" className="h-12 w-auto" />
          </div>
          <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2">GDSPV - Gestión de Postventa</h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Sistema integral de gestión de incidencias y avisos a clientes
          </p>
        </div>

        {/* Database Status Check */}
        <DatabaseStatus />

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Buscar Incidencias
            </TabsTrigger>
            <TabsTrigger value="recibidas" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Recibidas
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Importar CSV
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Configuración
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard
              onNavigate={(tab) => {
                setActiveTab(tab)
              }}
            />
          </TabsContent>

          <TabsContent value="search">
            <SearchIncidencias />
          </TabsContent>

          <TabsContent value="recibidas">
            <RecibidaSection />
          </TabsContent>

          <TabsContent value="import">
            <IncidenciasImporter />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="config">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración del Sistema</CardTitle>
                  <CardDescription>Configurar parámetros del sistema y verificaciones</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    Utiliza las herramientas de verificación para asegurar que el sistema funciona correctamente.
                  </p>
                </CardContent>
              </Card>

              <DataTypeVerifier />
              <ScriptExecutor />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
