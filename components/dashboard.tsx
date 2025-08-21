"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  Users,
  TrendingUp,
  Search,
  Upload,
  Clock,
  ChevronDown,
  ChevronUp,
  Minimize2,
  Maximize2,
} from "lucide-react"
import { createClient } from "@/lib/supabase"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface DashboardStats {
  totalIncidencias: number
  incidenciasCriticas: number
  incidenciasRecientes: number
}

interface TiempoAltaStats {
  promedioHoy: number
  promedioDias7: number
  promedioDias30: number
  promedioAnual: number
  totalAnalizadas: number
}

interface DashboardProps {
  onNavigate?: (tab: string) => void
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalIncidencias: 0,
    incidenciasCriticas: 0,
    incidenciasRecientes: 0,
  })
  const [tiempoAltaStats, setTiempoAltaStats] = useState<TiempoAltaStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isTimeStatsOpen, setIsTimeStatsOpen] = useState(false)
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(true)
  const [isSystemStatusOpen, setIsSystemStatusOpen] = useState(true)
  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const [compactMode, setCompactMode] = useState(false)

  useEffect(() => {
    loadDashboardStats()
    loadTiempoAltaStats()

    // Cargar preferencia de modo compacto desde localStorage
    const savedCompactMode = localStorage.getItem("dashboard-compact-mode")
    if (savedCompactMode) {
      const isCompact = JSON.parse(savedCompactMode)
      setCompactMode(isCompact)
      if (isCompact) {
        setIsQuickActionsOpen(false)
        setIsSystemStatusOpen(false)
        setIsInfoOpen(false)
        setIsTimeStatsOpen(false)
      }
    }
  }, [])

  const toggleCompactMode = () => {
    const newCompactMode = !compactMode
    setCompactMode(newCompactMode)
    localStorage.setItem("dashboard-compact-mode", JSON.stringify(newCompactMode))

    if (newCompactMode) {
      // Modo compacto: contraer todas las secciones
      setIsQuickActionsOpen(false)
      setIsSystemStatusOpen(false)
      setIsInfoOpen(false)
      setIsTimeStatsOpen(false)
    } else {
      // Modo normal: expandir secciones principales
      setIsQuickActionsOpen(true)
      setIsSystemStatusOpen(true)
      setIsInfoOpen(false)
      setIsTimeStatsOpen(false)
    }
  }

  const loadTiempoAltaStats = async () => {
    try {
      const supabase = createClient()

      // Obtener TODAS las incidencias con fecha y fecha_alta válidas
      let allIncidencias: any[] = []
      let from = 0
      const batchSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: batch, error } = await supabase
          .from("incidencias")
          .select("fecha, fecha_alta")
          .not("fecha", "is", null)
          .not("fecha_alta", "is", null)
          .range(from, from + batchSize - 1)

        if (error) {
          console.error("Error loading tiempo alta stats:", error)
          return
        }

        if (batch && batch.length > 0) {
          allIncidencias = [...allIncidencias, ...batch]
          from += batchSize
          hasMore = batch.length === batchSize
        } else {
          hasMore = false
        }
      }

      console.log(`Total incidencias cargadas para análisis: ${allIncidencias.length}`)

      if (allIncidencias.length === 0) {
        setTiempoAltaStats({
          promedioHoy: 0,
          promedioDias7: 0,
          promedioDias30: 0,
          promedioAnual: 0,
          totalAnalizadas: 0,
        })
        return
      }

      const now = new Date()
      const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const hace7Dias = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000)
      const hace30Dias = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000)
      const inicioAno = new Date(now.getFullYear(), 0, 1)

      // Calcular tiempos de alta (diferencia entre fecha_alta y fecha en horas)
      const calcularTiempoAlta = (fecha: string, fechaAlta: string): number => {
        const fechaInc = new Date(fecha)
        const fechaAltaInc = new Date(fechaAlta)
        return (fechaAltaInc.getTime() - fechaInc.getTime()) / (1000 * 60 * 60) // en horas
      }

      // Filtrar y calcular para cada período usando allIncidencias
      const incidenciasHoy = allIncidencias.filter((inc) => {
        const fechaAlta = new Date(inc.fecha_alta)
        return fechaAlta >= hoy
      })

      const incidencias7Dias = allIncidencias.filter((inc) => {
        const fechaAlta = new Date(inc.fecha_alta)
        return fechaAlta >= hace7Dias
      })

      const incidencias30Dias = allIncidencias.filter((inc) => {
        const fechaAlta = new Date(inc.fecha_alta)
        return fechaAlta >= hace30Dias
      })

      const incidenciasAnuales = allIncidencias.filter((inc) => {
        const fechaAlta = new Date(inc.fecha_alta)
        return fechaAlta >= inicioAno
      })

      // Calcular promedios
      const calcularPromedio = (lista: any[]): number => {
        if (lista.length === 0) return 0
        const tiempos = lista
          .map((inc) => calcularTiempoAlta(inc.fecha, inc.fecha_alta))
          .filter((tiempo) => tiempo >= 0) // Solo tiempos positivos
        if (tiempos.length === 0) return 0
        return tiempos.reduce((sum, tiempo) => sum + tiempo, 0) / tiempos.length
      }

      setTiempoAltaStats({
        promedioHoy: calcularPromedio(incidenciasHoy),
        promedioDias7: calcularPromedio(incidencias7Dias),
        promedioDias30: calcularPromedio(incidencias30Dias),
        promedioAnual: calcularPromedio(incidenciasAnuales),
        totalAnalizadas: allIncidencias.length,
      })
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const loadDashboardStats = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Obtener conteo real de incidencias principales
      const { count: incidenciasCount, error: incidenciasError } = await supabase
        .from("incidencias")
        .select("*", { count: "exact", head: true })

      if (incidenciasError) {
        console.error("Error cargando incidencias:", incidenciasError)
      }

      // Obtener conteo real de incidencias recibidas
      const { count: recibidasCount, error: recibidasError } = await supabase
        .from("incidencias_recibidas")
        .select("*", { count: "exact", head: true })

      if (recibidasError) {
        console.error("Error cargando incidencias recibidas:", recibidasError)
      }

      // Obtener datos completos para calcular críticas y recientes
      const { data: recibidas } = await supabase.from("incidencias_recibidas").select("*")
      const { data: incidencias } = await supabase.from("incidencias").select("*")

      console.log("Datos recibidas:", recibidas?.length || 0)
      console.log("Datos incidencias:", incidencias?.length || 0)

      const totalIncidencias = (incidenciasCount || 0) + (recibidasCount || 0)

      // Calcular incidencias críticas: más de 15 días desde la fecha de incidencia
      const fechaActual = new Date()
      let incidenciasCriticas = 0

      // Revisar incidencias_recibidas
      if (recibidas && recibidas.length > 0) {
        console.log("Ejemplo de incidencia recibida:", recibidas[0])
        incidenciasCriticas += recibidas.filter((r) => {
          if (!r.fecha) return false
          const fechaIncidencia = new Date(r.fecha)
          const diferenciaDias = Math.floor((fechaActual.getTime() - fechaIncidencia.getTime()) / (1000 * 60 * 60 * 24))
          return diferenciaDias > 15
        }).length
      }

      // Revisar también incidencias principales
      if (incidencias && incidencias.length > 0) {
        console.log("Ejemplo de incidencia principal:", incidencias[0])
        incidenciasCriticas += incidencias.filter((i) => {
          if (!i.fecha) return false
          const fechaIncidencia = new Date(i.fecha)
          const diferenciaDias = Math.floor((fechaActual.getTime() - fechaIncidencia.getTime()) / (1000 * 60 * 60 * 24))
          return diferenciaDias > 15
        }).length
      }

      // Calcular incidencias nuevas: dadas de alta en los últimos 2 días (igual que en nuevas-incidencias.tsx)
      const fechaSincronizacion = new Date()
      const fecha2DiasAtras = new Date(fechaSincronizacion)
      fecha2DiasAtras.setDate(fecha2DiasAtras.getDate() - 1) // 2 días incluyendo hoy

      const fechaInicio = fecha2DiasAtras.toISOString().split("T")[0]
      const fechaFin = fechaSincronizacion.toISOString().split("T")[0]

      console.log(`Buscando incidencias nuevas desde ${fechaInicio} hasta ${fechaFin}`)

      // Contar incidencias con fecha_alta en los últimos 2 días (misma lógica que nuevas-incidencias.tsx)
      const { count: nuevasCount, error: nuevasError } = await supabase
        .from("incidencias")
        .select("*", { count: "exact", head: true })
        .gte("fecha_alta", fechaInicio)
        .lte("fecha_alta", fechaFin + " 23:59:59")

      const incidenciasRecientes = nuevasCount || 0

      console.log(`Incidencias críticas calculadas: ${incidenciasCriticas}`)
      console.log(`Incidencias nuevas calculadas: ${incidenciasRecientes}`)
      console.log(`Fecha actual: ${fechaActual.toISOString()}`)
      console.log(`Rango de fechas nuevas: ${fechaInicio} a ${fechaFin}`)

      setStats({
        totalIncidencias,
        incidenciasCriticas,
        incidenciasRecientes,
      })
    } catch (error) {
      console.error("Error general:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatTiempo = (horas: number): string => {
    if (horas === 0) return "Sin datos"
    if (horas < 1) return `${Math.round(horas * 60)} min`
    if (horas < 24) return `${horas.toFixed(1)} horas`
    const dias = Math.floor(horas / 24)
    const horasRestantes = (horas % 24).toFixed(1)
    return `${dias}d ${horasRestantes}h`
  }

  const statCards = [
    {
      title: "Total Incidencias",
      value: stats.totalIncidencias,
      icon: Users,
      color: "bg-blue-500",
      description: "Incidencias registradas",
    },
    {
      title: "Críticas",
      value: stats.incidenciasCriticas,
      icon: AlertTriangle,
      color: "bg-red-500",
      description: "Más de 15 días sin resolver",
    },
    {
      title: "Nuevas",
      value: stats.incidenciasRecientes,
      icon: TrendingUp,
      color: "bg-purple-500",
      description: "Dadas de alta últimos 2 días",
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header con modo compacto */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h2>
            <p className="text-slate-600 dark:text-slate-400">Resumen general del sistema</p>
          </div>
          <div className="animate-pulse">
            <div className="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con Control de Modo Compacto */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h2>
          <p className="text-slate-600 dark:text-slate-400">
            {compactMode ? "Vista compacta - Información esencial" : "Resumen general del sistema"}
          </p>
        </div>
        <Button
          onClick={toggleCompactMode}
          variant={compactMode ? "default" : "outline"}
          className="flex items-center gap-2"
        >
          {compactMode ? (
            <>
              <Maximize2 className="h-4 w-4" />
              Vista Completa
            </>
          ) : (
            <>
              <Minimize2 className="h-4 w-4" />
              Modo Compacto
            </>
          )}
        </Button>
      </div>

      {/* Stats Cards - Siempre visibles pero más compactas en modo compacto */}
      <div
        className={`grid gap-6 ${compactMode ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}
      >
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className={compactMode ? "p-4" : "p-6"}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{stat.title}</p>
                    <p
                      className={`font-bold text-slate-900 dark:text-slate-100 ${compactMode ? "text-2xl" : "text-3xl"}`}
                    >
                      {stat.value}
                    </p>
                    {!compactMode && <p className="text-xs text-slate-500 dark:text-slate-500">{stat.description}</p>}
                  </div>
                  <div className={`rounded-full ${stat.color} ${compactMode ? "p-2" : "p-3"}`}>
                    <Icon className={`text-white ${compactMode ? "h-5 w-5" : "h-6 w-6"}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tiempo de Alta de Incidencias - Colapsible */}
      {tiempoAltaStats && (
        <Collapsible open={isTimeStatsOpen} onOpenChange={setIsTimeStatsOpen}>
          <Card className="border-l-4 border-l-green-500">
            <CollapsibleTrigger asChild>
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 cursor-pointer hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Tiempo Promedio de Alta de Incidencias
                      <Badge variant="outline" className="ml-2">
                        {tiempoAltaStats.totalAnalizadas} incidencias
                      </Badge>
                    </CardTitle>
                    {!compactMode && (
                      <CardDescription>
                        Tiempo que transcurre desde la fecha de incidencia hasta la fecha de alta por período
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-green-600 font-medium">
                      Promedio anual: {formatTiempo(tiempoAltaStats.promedioAnual)}
                    </div>
                    {isTimeStatsOpen ? (
                      <ChevronUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className={compactMode ? "p-4" : "p-6"}>
                <div
                  className={`grid gap-6 ${compactMode ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"}`}
                >
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className={`font-bold text-blue-600 ${compactMode ? "text-xl" : "text-2xl"}`}>
                      {formatTiempo(tiempoAltaStats.promedioHoy)}
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">Hoy</div>
                    {!compactMode && <div className="text-xs text-blue-500 mt-1">Incidencias dadas de alta hoy</div>}
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className={`font-bold text-purple-600 ${compactMode ? "text-xl" : "text-2xl"}`}>
                      {formatTiempo(tiempoAltaStats.promedioDias7)}
                    </div>
                    <div className="text-sm text-purple-700 dark:text-purple-300">Últimos 7 días</div>
                    {!compactMode && <div className="text-xs text-purple-500 mt-1">Promedio semanal</div>}
                  </div>
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className={`font-bold text-orange-600 ${compactMode ? "text-xl" : "text-2xl"}`}>
                      {formatTiempo(tiempoAltaStats.promedioDias30)}
                    </div>
                    <div className="text-sm text-orange-700 dark:text-orange-300">Últimos 30 días</div>
                    {!compactMode && <div className="text-xs text-orange-500 mt-1">Promedio mensual</div>}
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className={`font-bold text-green-600 ${compactMode ? "text-xl" : "text-2xl"}`}>
                      {formatTiempo(tiempoAltaStats.promedioAnual)}
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300">Este año</div>
                    {!compactMode && <div className="text-xs text-green-500 mt-1">Promedio anual</div>}
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Quick Actions y System Status - En una sola fila en modo compacto */}
      <div className={`grid gap-6 ${compactMode ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 lg:grid-cols-2"}`}>
        {/* Quick Actions */}
        <Collapsible open={isQuickActionsOpen} onOpenChange={setIsQuickActionsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Acciones Rápidas</CardTitle>
                    {!compactMode && <CardDescription>Accesos directos a las funciones más utilizadas</CardDescription>}
                  </div>
                  {isQuickActionsOpen ? (
                    <ChevronUp className="h-4 w-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className={compactMode ? "p-4 pt-0" : "space-y-4"}>
                <div className={`grid gap-4 ${compactMode ? "grid-cols-2" : "grid-cols-2"}`}>
                  <button
                    className={`bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors ${compactMode ? "p-3" : "p-4"}`}
                    onClick={() => onNavigate && onNavigate("search")}
                  >
                    <Search
                      className={`text-blue-600 dark:text-blue-400 mb-2 ${compactMode ? "h-5 w-5" : "h-6 w-6"}`}
                    />
                    <p className="text-sm font-medium">Buscar Incidencia</p>
                  </button>
                  <button
                    className={`bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors ${compactMode ? "p-3" : "p-4"}`}
                    onClick={() => onNavigate && onNavigate("import")}
                  >
                    <Upload
                      className={`text-green-600 dark:text-green-400 mb-2 ${compactMode ? "h-5 w-5" : "h-6 w-6"}`}
                    />
                    <p className="text-sm font-medium">Importar CSV</p>
                  </button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* System Status */}
        <Collapsible open={isSystemStatusOpen} onOpenChange={setIsSystemStatusOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Estado del Sistema</CardTitle>
                    {!compactMode && <CardDescription>Información general del sistema</CardDescription>}
                  </div>
                  {isSystemStatusOpen ? (
                    <ChevronUp className="h-4 w-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className={compactMode ? "p-4 pt-0" : ""}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Base de datos</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Conectado
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Última sincronización</span>
                    <span className="text-sm text-slate-500">{new Date().toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Incidencias nuevas</span>
                    <span className="text-sm text-purple-600 font-medium">{stats.incidenciasRecientes} registros</span>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Information Card - Solo visible en modo normal o si se expande manualmente */}
      <Collapsible open={isInfoOpen} onOpenChange={setIsInfoOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Información del Sistema</CardTitle>
                  {!compactMode && <CardDescription>Detalles sobre el cálculo de estadísticas</CardDescription>}
                </div>
                {isInfoOpen ? (
                  <ChevronUp className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className={compactMode ? "p-4 pt-0" : ""}>
              <div
                className={`grid gap-4 text-sm ${compactMode ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-3"}`}
              >
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">Total Incidencias</div>
                  <div className="text-blue-700 dark:text-blue-300">
                    Suma de incidencias principales + incidencias recibidas
                  </div>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="font-medium text-red-900 dark:text-red-100 mb-1">Críticas</div>
                  <div className="text-red-700 dark:text-red-300">
                    Incidencias con más de 15 días desde la fecha de incidencia
                  </div>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="font-medium text-purple-900 dark:text-purple-100 mb-1">Nuevas</div>
                  <div className="text-purple-700 dark:text-purple-300">
                    Incidencias dadas de alta en los últimos 2 días
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
