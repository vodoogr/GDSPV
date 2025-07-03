"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Users, TrendingUp, Search, Upload, Clock, Calendar } from "lucide-react"
import { createClient } from "@/lib/supabase"

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

  useEffect(() => {
    loadDashboardStats()
    loadTiempoAltaStats()
  }, [])

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

      // Resto de la función permanece igual...
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

      // Obtener datos para calcular críticas y recientes
      const { data: recibidas } = await supabase.from("incidencias_recibidas").select("*")
      const { data: incidencias } = await supabase.from("incidencias").select("*")

      const totalIncidencias = (incidenciasCount || 0) + (recibidasCount || 0)
      const incidenciasCriticas = recibidas?.filter((r) => r.es_critica).length || 0

      // Calcular incidencias recientes: fecha_alta menos de 2 días de fecha_importacion
      const incidenciasRecientes =
        incidencias?.filter((i) => {
          if (!i.fecha_alta || !i.fecha_importacion) return false

          const fechaAlta = new Date(i.fecha_alta)
          const fechaImportacion = new Date(i.fecha_importacion)
          const diferenciaDias = Math.abs((fechaImportacion.getTime() - fechaAlta.getTime()) / (1000 * 60 * 60 * 24))

          return diferenciaDias < 2
        }).length || 0

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
      description: "+15 días",
    },
    {
      title: "Recientes",
      value: stats.incidenciasRecientes,
      icon: TrendingUp,
      color: "bg-purple-500",
      description: "Alta < 2 días de importación",
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{stat.title}</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">{stat.description}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tiempo de Alta de Incidencias */}
      {tiempoAltaStats && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Tiempo Promedio de Alta de Incidencias
            </CardTitle>
            <CardDescription>
              Tiempo que transcurre desde la fecha de incidencia hasta la fecha de alta por período
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{formatTiempo(tiempoAltaStats.promedioHoy)}</div>
                <div className="text-sm text-blue-700 dark:text-blue-300">Hoy</div>
                <div className="text-xs text-blue-500 mt-1">Incidencias dadas de alta hoy</div>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{formatTiempo(tiempoAltaStats.promedioDias7)}</div>
                <div className="text-sm text-purple-700 dark:text-purple-300">Últimos 7 días</div>
                <div className="text-xs text-purple-500 mt-1">Promedio semanal</div>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{formatTiempo(tiempoAltaStats.promedioDias30)}</div>
                <div className="text-sm text-orange-700 dark:text-orange-300">Últimos 30 días</div>
                <div className="text-xs text-orange-500 mt-1">Promedio mensual</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{formatTiempo(tiempoAltaStats.promedioAnual)}</div>
                <div className="text-sm text-green-700 dark:text-green-300">Este año</div>
                <div className="text-xs text-green-500 mt-1">Promedio anual</div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <Badge variant="outline" className="bg-slate-50 text-slate-700">
                <Calendar className="h-3 w-3 mr-1" />
                {tiempoAltaStats.totalAnalizadas} incidencias analizadas
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <CardDescription>Accesos directos a las funciones más utilizadas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                onClick={() => onNavigate && onNavigate("search")}
              >
                <Search className="h-6 w-6 text-blue-600 dark:text-blue-400 mb-2" />
                <p className="text-sm font-medium">Buscar Incidencia</p>
              </button>
              <button className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                <Upload className="h-6 w-6 text-green-600 dark:text-green-400 mb-2" />
                <p className="text-sm font-medium">Importar CSV</p>
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado del Sistema</CardTitle>
            <CardDescription>Información general del sistema</CardDescription>
          </CardHeader>
          <CardContent>
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
                <span className="text-sm">Incidencias recientes</span>
                <span className="text-sm text-purple-600 font-medium">{stats.incidenciasRecientes} registros</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Sistema</CardTitle>
          <CardDescription>Detalles sobre el cálculo de estadísticas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">Total Incidencias</div>
              <div className="text-blue-700 dark:text-blue-300">
                Suma de incidencias principales + incidencias recibidas
              </div>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="font-medium text-red-900 dark:text-red-100 mb-1">Críticas</div>
              <div className="text-red-700 dark:text-red-300">
                Incidencias recibidas con más de 15 días desde la fecha de incidencia
              </div>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="font-medium text-green-900 dark:text-green-100 mb-1">Tiempo de Alta</div>
              <div className="text-green-700 dark:text-green-300">
                Diferencia entre fecha de incidencia y fecha de alta (incluye hora)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
