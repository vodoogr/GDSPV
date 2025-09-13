"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, TrendingUp, Clock, Users, BarChart3, ChevronDown, ChevronUp } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import ClientAlerts from "./client-alerts"

interface DashboardStats {
  totalIncidencias: number
  criticas: number
  nuevas: number
  tiempoPromedioAlta: number
  clientesUnicos: number
}

interface ClienteDistribucion {
  cliente: string
  incidencias: number
  porcentaje: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalIncidencias: 0,
    criticas: 0,
    nuevas: 0,
    tiempoPromedioAlta: 0,
    clientesUnicos: 0,
  })
  const [clientesDistribucion, setClientesDistribucion] = useState<ClienteDistribucion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCompactMode, setIsCompactMode] = useState(false)
  const [isTimeCollapsed, setIsTimeCollapsed] = useState(true)
  const [isAlertsCollapsed, setIsAlertsCollapsed] = useState(false)

  useEffect(() => {
    // Cargar preferencias del usuario
    try {
      const compactMode = localStorage.getItem("dashboard-compact-mode")
      if (compactMode) {
        setIsCompactMode(JSON.parse(compactMode))
      }

      const timeCollapsed = localStorage.getItem("dashboard-time-collapsed")
      if (timeCollapsed) {
        setIsTimeCollapsed(JSON.parse(timeCollapsed))
      }

      const alertsCollapsed = localStorage.getItem("dashboard-alerts-collapsed")
      if (alertsCollapsed) {
        setIsAlertsCollapsed(JSON.parse(alertsCollapsed))
      }
    } catch (error) {
      console.error("Error loading preferences:", error)
    }

    fetchDashboardData()
  }, [])

  const toggleCompactMode = () => {
    try {
      const newMode = !isCompactMode
      setIsCompactMode(newMode)
      localStorage.setItem("dashboard-compact-mode", JSON.stringify(newMode))
    } catch (error) {
      console.error("Error saving compact mode:", error)
    }
  }

  const toggleTimeCollapsed = () => {
    try {
      const newState = !isTimeCollapsed
      setIsTimeCollapsed(newState)
      localStorage.setItem("dashboard-time-collapsed", JSON.stringify(newState))
    } catch (error) {
      console.error("Error saving time collapsed state:", error)
    }
  }

  const toggleAlertsCollapsed = () => {
    try {
      const newState = !isAlertsCollapsed
      setIsAlertsCollapsed(newState)
      localStorage.setItem("dashboard-alerts-collapsed", JSON.stringify(newState))
    } catch (error) {
      console.error("Error saving alerts collapsed state:", error)
    }
  }

  const fetchDashboardData = async () => {
    setIsLoading(true)
    const supabase = createClient()

    try {
      // Obtener estadísticas principales
      const { data: incidencias, error: incidenciasError } = await supabase.from("incidencias").select("*")

      const { data: incidenciasRecibidas, error: recibidasError } = await supabase
        .from("incidencias_recibidas")
        .select("*")

      if (incidenciasError) {
        console.error("Error fetching incidencias:", incidenciasError)
      }
      if (recibidasError) {
        console.error("Error fetching incidencias_recibidas:", recibidasError)
      }

      const allIncidencias = [...(incidencias || []), ...(incidenciasRecibidas || [])]
      console.log("Total incidencias cargadas:", allIncidencias.length)

      // Calcular estadísticas
      const totalIncidencias = allIncidencias.length

      // Calcular críticas (prioridad alta o crítica)
      const criticas = allIncidencias.filter((inc) => {
        const prioridad = inc.prioridad?.toLowerCase()
        return prioridad === "alta" || prioridad === "crítica" || prioridad === "critical" || prioridad === "high"
      }).length

      console.log("Incidencias críticas:", criticas)

      // Calcular nuevas (últimos 2 días basado en fecha_alta)
      const twoDaysAgo = new Date()
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
      twoDaysAgo.setHours(0, 0, 0, 0)

      const nuevas = allIncidencias.filter((inc) => {
        if (!inc.fecha_alta) return false
        const fechaAlta = new Date(inc.fecha_alta)
        return fechaAlta >= twoDaysAgo
      }).length

      console.log("Incidencias nuevas (últimos 2 días):", nuevas)

      // Calcular tiempo promedio de alta (en días)
      const incidenciasConFechas = allIncidencias.filter((inc) => inc.fecha && inc.fecha_alta)
      let tiempoPromedioAlta = 0

      if (incidenciasConFechas.length > 0) {
        const tiempoTotal = incidenciasConFechas.reduce((total, inc) => {
          const fechaInicio = new Date(inc.fecha)
          const fechaAlta = new Date(inc.fecha_alta)
          const diferenciaDias = (fechaAlta.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)
          return total + Math.max(0, diferenciaDias)
        }, 0)
        tiempoPromedioAlta = tiempoTotal / incidenciasConFechas.length
      }

      console.log("Tiempo promedio de alta:", tiempoPromedioAlta)

      // Calcular clientes únicos
      const clientesSet = new Set<string>()
      allIncidencias.forEach((inc) => {
        if (inc.nombre_cliente) clientesSet.add(inc.nombre_cliente.toLowerCase().trim())
        if (inc.cliente) clientesSet.add(inc.cliente.toLowerCase().trim())
        if (inc.cod_cliente) clientesSet.add(inc.cod_cliente.toLowerCase().trim())
      })
      const clientesUnicos = clientesSet.size

      console.log("Clientes únicos:", clientesUnicos)

      // Calcular distribución por cliente
      const clienteMap = new Map<string, number>()

      allIncidencias.forEach((inc) => {
        let clienteKey = ""
        if (inc.nombre_cliente) {
          clienteKey = inc.nombre_cliente.trim()
        } else if (inc.cliente) {
          clienteKey = inc.cliente.trim()
        } else if (inc.cod_cliente) {
          clienteKey = inc.cod_cliente.trim()
        }

        if (clienteKey) {
          // Normalizar el nombre del cliente
          const normalizedKey = clienteKey.toLowerCase()
          let finalKey = clienteKey

          // Buscar si ya existe una variación de este cliente
          for (const [existingKey] of clienteMap) {
            if (existingKey.toLowerCase() === normalizedKey) {
              finalKey = existingKey
              break
            }
          }

          clienteMap.set(finalKey, (clienteMap.get(finalKey) || 0) + 1)
        }
      })

      // Convertir a array y ordenar
      const distribucion = Array.from(clienteMap.entries())
        .map(([cliente, incidencias]) => ({
          cliente,
          incidencias,
          porcentaje: totalIncidencias > 0 ? (incidencias / totalIncidencias) * 100 : 0,
        }))
        .sort((a, b) => b.incidencias - a.incidencias)
        .slice(0, 20) // Top 20 clientes

      console.log("Distribución por cliente:", distribucion)

      setStats({
        totalIncidencias,
        criticas,
        nuevas,
        tiempoPromedioAlta,
        clientesUnicos,
      })

      // Asegurar que setClientesDistribucion recibe un array válido
      if (Array.isArray(distribucion)) {
        setClientesDistribucion(distribucion)
      } else {
        console.error("Distribución no es un array:", distribucion)
        setClientesDistribucion([])
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      // En caso de error, asegurar que tenemos arrays vacíos
      setClientesDistribucion([])
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con toggle de modo compacto */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Dashboard de Control</h1>
          <p className="text-slate-600 dark:text-slate-400">Resumen general del sistema de incidencias</p>
        </div>
        <Button variant="outline" onClick={toggleCompactMode}>
          {isCompactMode ? "Modo Expandido" : "Modo Compacto"}
        </Button>
      </div>

      {/* Estadísticas principales */}
      <div className={`grid gap-4 ${isCompactMode ? "grid-cols-2 md:grid-cols-5" : "grid-cols-1 md:grid-cols-5"}`}>
        <Card>
          <CardContent className={isCompactMode ? "p-4" : "p-6"}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Incidencias</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalIncidencias}</p>
              </div>
              <div className="rounded-full bg-blue-500 p-2">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={isCompactMode ? "p-4" : "p-6"}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Críticas</p>
                <p className="text-2xl font-bold text-red-600">{stats.criticas}</p>
              </div>
              <div className="rounded-full bg-red-500 p-2">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={isCompactMode ? "p-4" : "p-6"}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Nuevas</p>
                <p className="text-2xl font-bold text-green-600">{stats.nuevas}</p>
              </div>
              <div className="rounded-full bg-green-500 p-2">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={isCompactMode ? "p-4" : "p-6"}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Tiempo Promedio</p>
                <p className="text-2xl font-bold text-orange-600">{stats.tiempoPromedioAlta.toFixed(1)}d</p>
              </div>
              <div className="rounded-full bg-orange-500 p-2">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={isCompactMode ? "p-4" : "p-6"}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Clientes Únicos</p>
                <p className="text-2xl font-bold text-purple-600">{stats.clientesUnicos}</p>
              </div>
              <div className="rounded-full bg-purple-500 p-2">
                <Users className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sistema de Alertas de Clientes */}
      <Collapsible open={!isAlertsCollapsed} onOpenChange={() => toggleAlertsCollapsed()}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    Sistema de Alertas de Clientes
                  </CardTitle>
                  <CardDescription>Monitoreo automático de umbrales por cliente</CardDescription>
                </div>
                {isAlertsCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className={isCompactMode ? "p-4" : "p-6"}>
              <ClientAlerts
                clientesDistribucion={Array.isArray(clientesDistribucion) ? clientesDistribucion : []}
                totalIncidencias={stats.totalIncidencias}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Tiempo Promedio de Alta de Incidencias */}
      <Collapsible open={!isTimeCollapsed} onOpenChange={() => toggleTimeCollapsed()}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Tiempo Promedio de Alta de Incidencias
                  </CardTitle>
                  <CardDescription>Análisis del tiempo de resolución</CardDescription>
                </div>
                {isTimeCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className={isCompactMode ? "p-4" : "p-6"}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {stats.tiempoPromedioAlta.toFixed(1)}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Días promedio</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {stats.tiempoPromedioAlta <= 3
                        ? "Excelente"
                        : stats.tiempoPromedioAlta <= 7
                          ? "Bueno"
                          : "Mejorable"}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Evaluación</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{(stats.tiempoPromedioAlta * 24).toFixed(0)}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Horas promedio</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  )
}
