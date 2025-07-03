"use client"

import { Button } from "@/components/ui/button"
import type { Incidencia } from "@/types/incidencia" // Declare the Incidencia type

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Users,
  Building,
  Package,
  Calendar,
  Target,
  BarChart3,
  Flame,
  Filter,
  X,
} from "lucide-react"
import { createClient } from "@/lib/supabase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface IncidenciaCritica {
  id: number
  numero: string
  clase_incidencia: string
  nombre_cliente: string
  nombre_proveedor: string
  fecha: string
  tipo_estado: string
  dias_transcurridos: number
}

interface AnalyticsData {
  totalIncidencias: number
  incidenciasPorEstado: Array<{ estado: string; count: number; color: string }>
  incidenciasPorMes: Array<{ mes: string; count: number }>
  topProveedores: Array<{ proveedor: string; count: number }>
  incidenciasCriticas: number
  distribucionTipos: Array<{ tipo: string; count: number }>
  top10Criticas: IncidenciaCritica[]
  tiendasUnicas: string[]
  tiposEstadoUnicos: string[]
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [storeFilter, setStoreFilter] = useState("all")
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]) // Declare the incidencias variable

  useEffect(() => {
    loadAnalyticsData()
  }, [])

  const loadAnalyticsData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Primero obtener el conteo total real de incidencias
      const { count: totalCount, error: countError } = await supabase
        .from("incidencias")
        .select("*", { count: "exact", head: true })

      if (countError) {
        console.error("Error getting total count:", countError)
        return
      }

      console.log("Total real de incidencias en la base de datos:", totalCount)

      // Luego obtener todas las incidencias para los análisis (en lotes si es necesario)
      let allIncidencias: any[] = []
      let from = 0
      const batchSize = 1000

      while (true) {
        const { data: batch, error } = await supabase
          .from("incidencias")
          .select("*")
          .range(from, from + batchSize - 1)

        if (error) {
          console.error("Error loading batch:", error)
          break
        }

        if (!batch || batch.length === 0) {
          break
        }

        allIncidencias = [...allIncidencias, ...batch]

        if (batch.length < batchSize) {
          break // Último lote
        }

        from += batchSize
      }

      console.log("Total incidencias cargadas para análisis:", allIncidencias.length)

      setIncidencias(allIncidencias || [])

      // Usar el conteo real para el KPI
      const totalIncidencias = totalCount || 0

      // Usar allIncidencias en lugar de incidenciasData para el resto de cálculos
      const incidenciasData = allIncidencias

      // Obtener tiendas únicas para el filtro
      const tiendasUnicas = [...new Set(incidenciasData.map((inc) => inc.nombre_tienda).filter(Boolean))].sort()

      // Obtener tipos de estado únicos para el filtro
      const tiposEstadoUnicos = [...new Set(incidenciasData.map((inc) => inc.tipo_estado).filter(Boolean))].sort()

      if (!incidenciasData) return

      // Calcular métricas
      //const totalIncidencias = incidenciasData?.length || 0

      console.log("Total incidencias cargadas:", totalIncidencias)

      // Incidencias por estado
      const estadosCount = incidenciasData.reduce((acc: any, inc) => {
        const estado = inc.tipo_estado || "Sin Estado"
        acc[estado] = (acc[estado] || 0) + 1
        return acc
      }, {})

      const incidenciasPorEstado = Object.entries(estadosCount).map(([estado, count], index) => ({
        estado,
        count: count as number,
        color: estado === "NO ASIGNADO" ? "#FB923C" : COLORS[index % COLORS.length],
      }))

      // Incidencias por mes (últimos 6 meses)
      const now = new Date()
      const meses = []
      for (let i = 5; i >= 0; i--) {
        const fecha = new Date(now.getFullYear(), now.getMonth() - i, 1)
        meses.push({
          mes: fecha.toLocaleDateString("es-ES", { month: "short", year: "2-digit" }),
          fecha: fecha,
        })
      }

      const incidenciasPorMes = meses.map(({ mes, fecha }) => {
        const siguienteMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1)
        const count = incidenciasData.filter((inc) => {
          const fechaInc = new Date(inc.fecha)
          return fechaInc >= fecha && fechaInc < siguienteMes
        }).length
        return { mes, count }
      })

      // Top proveedores
      const proveedoresCount = incidenciasData.reduce((acc: any, inc) => {
        const proveedor = inc.nombre_proveedor || "Sin Proveedor"
        acc[proveedor] = (acc[proveedor] || 0) + 1
        return acc
      }, {})

      const topProveedores = Object.entries(proveedoresCount)
        .map(([proveedor, count]) => ({ proveedor, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Incidencias críticas (más de 30 días)
      const now_time = now.getTime()
      const incidenciasCriticasData = incidenciasData
        .filter((inc) => {
          if (!inc.fecha) return false
          const fechaInc = new Date(inc.fecha)
          const diasTranscurridos = (now_time - fechaInc.getTime()) / (1000 * 60 * 60 * 24)
          return diasTranscurridos > 7 && inc.tipo_estado !== "CERRADO" && inc.tipo_estado !== "RESUELTO"
        })
        .map((inc) => {
          const fechaInc = new Date(inc.fecha)
          const diasTranscurridos = Math.floor((now_time - fechaInc.getTime()) / (1000 * 60 * 60 * 24))
          return {
            id: inc.id,
            numero: inc.numero,
            clase_incidencia: inc.clase_incidencia,
            nombre_cliente: inc.nombre_cliente,
            nombre_proveedor: inc.nombre_proveedor,
            fecha: inc.fecha,
            tipo_estado: inc.tipo_estado,
            dias_transcurridos: diasTranscurridos,
          }
        })
        .sort((a, b) => b.dias_transcurridos - a.dias_transcurridos)

      const incidenciasCriticas = incidenciasCriticasData.length
      const top10Criticas = incidenciasCriticasData.slice(0, 10)

      // Distribución por tipos (usando columna "tipo")
      const tiposCount = incidenciasData.reduce((acc: any, inc) => {
        const tipo = inc.tipo || "Sin Tipo"
        acc[tipo] = (acc[tipo] || 0) + 1
        return acc
      }, {})

      const distribucionTipos = Object.entries(tiposCount)
        .map(([tipo, count]) => ({ tipo, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)

      setData({
        totalIncidencias,
        incidenciasPorEstado,
        incidenciasPorMes,
        topProveedores,
        incidenciasCriticas,
        distribucionTipos,
        top10Criticas,
        tiendasUnicas,
        tiposEstadoUnicos,
      })
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-slate-500">No se pudieron cargar los datos de analytics</p>
        </CardContent>
      </Card>
    )
  }

  const kpis = [
    {
      title: "Total Incidencias",
      value: data.totalIncidencias,
      icon: Package,
      color: "bg-blue-500",
      change: "+12%",
      trend: "up",
    },
    {
      title: "Incidencias Críticas",
      value: data.incidenciasCriticas,
      icon: AlertTriangle,
      color: "bg-red-500",
      change: "-5%",
      trend: "down",
    },
  ]

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{kpi.title}</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{kpi.value}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {kpi.trend === "up" ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className={`text-xs ${kpi.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                        {kpi.change}
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-full ${kpi.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incidencias por Estado - Barras */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Incidencias por Estado
            </CardTitle>
            <CardDescription>Distribución actual de incidencias por estado</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.incidenciasPorEstado}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="estado" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Evolución Mensual */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Evolución Mensual
            </CardTitle>
            <CardDescription>Número total de incidencias por mes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.incidenciasPorMes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: "#3b82f6", strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Proveedores - Barras */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Top 5 Proveedores
            </CardTitle>
            <CardDescription>Proveedores con más incidencias</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.topProveedores}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="proveedor" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribución por Tipos (columna "tipo") */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Tipos de Responsabilidad
            </CardTitle>
            <CardDescription>Distribución por tipo (cliente, proveedor, transporte, montador, etc.)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.distribucionTipos.map((tipo, index) => {
                const percentage = (tipo.count / data.totalIncidencias) * 100
                return (
                  <div key={tipo.tipo} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{tipo.tipo}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">{tipo.count}</span>
                        <Badge variant="outline">{percentage.toFixed(1)}%</Badge>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter for Critical Incidents */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-orange-500" />
            Filtrar Incidencias Críticas
          </CardTitle>
          <CardDescription>Filtra las incidencias críticas por estado y tienda</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {data.tiposEstadoUnicos.map((estado) => (
                  <SelectItem key={estado} value={estado}>
                    {estado}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filtrar por tienda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las tiendas</SelectItem>
                {data.tiendasUnicas.map((tienda) => (
                  <SelectItem key={tienda} value={tienda}>
                    {tienda}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(statusFilter !== "all" || storeFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter("all")
                  setStoreFilter("all")
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top 10 Incidencias Críticas */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-red-500" />
            Top 10 Incidencias Más Críticas
            {statusFilter !== "all" && (
              <Badge variant="outline" className="bg-orange-100 text-orange-800">
                Estado: {statusFilter}
              </Badge>
            )}
            {storeFilter !== "all" && (
              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                Tienda: {storeFilter}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Incidencias con más de 7 días sin resolver (ordenadas por antigüedad)
            {statusFilter !== "all" && ` - Filtradas por estado: ${statusFilter}`}
            {storeFilter !== "all" && ` - Filtradas por tienda: ${storeFilter}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {(() => {
            const filteredCriticalIncidencias = data.top10Criticas.filter((inc) => {
              const statusMatch = statusFilter === "all" || inc.tipo_estado === statusFilter
              const storeMatch =
                storeFilter === "all" ||
                (() => {
                  const incidenciaCompleta = incidencias.find((i) => i.id === inc.id)
                  return incidenciaCompleta?.nombre_tienda === storeFilter
                })()
              return statusMatch && storeMatch
            })

            return filteredCriticalIncidencias.length === 0 ? (
              <div className="text-center py-8">
                {statusFilter === "all" && storeFilter === "all" ? (
                  <>
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-lg font-medium text-green-700">¡Excelente!</p>
                    <p className="text-sm text-slate-600">No hay incidencias críticas pendientes</p>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                    <p className="text-lg font-medium text-orange-700">Sin resultados</p>
                    <p className="text-sm text-slate-600">
                      No hay incidencias críticas con los filtros aplicados
                      {statusFilter !== "all" && ` (Estado: ${statusFilter})`}
                      {storeFilter !== "all" && ` (Tienda: ${storeFilter})`}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="text-left p-3 font-medium">Ranking</th>
                      <th className="text-left p-3 font-medium">Número</th>
                      <th className="text-left p-3 font-medium">Clase</th>
                      <th className="text-left p-3 font-medium">Cliente</th>
                      <th className="text-left p-3 font-medium">Proveedor</th>
                      <th className="text-left p-3 font-medium">Estado</th>
                      <th className="text-left p-3 font-medium">Días</th>
                      <th className="text-left p-3 font-medium">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCriticalIncidencias.slice(0, 10).map((inc, index) => (
                      <tr
                        key={inc.id}
                        className={`border-b hover:bg-slate-50 dark:hover:bg-slate-800 ${
                          index < 3 ? "bg-red-50 dark:bg-red-900/10" : ""
                        }`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={index === 0 ? "destructive" : index < 3 ? "secondary" : "outline"}
                              className={index === 0 ? "bg-red-600" : index < 3 ? "bg-orange-100 text-orange-800" : ""}
                            >
                              #{index + 1}
                            </Badge>
                            {index < 3 && <Flame className="h-4 w-4 text-red-500" />}
                          </div>
                        </td>
                        <td className="p-3 font-medium">{inc.numero}</td>
                        <td className="p-3">{inc.clase_incidencia}</td>
                        <td className="p-3">{inc.nombre_cliente}</td>
                        <td className="p-3">{inc.nombre_proveedor}</td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={
                              inc.tipo_estado === "NO ASIGNADO" ? "bg-orange-100 text-orange-800 border-orange-300" : ""
                            }
                          >
                            {inc.tipo_estado}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant="destructive" className="font-bold">
                            {inc.dias_transcurridos} días
                          </Badge>
                        </td>
                        <td className="p-3">{new Date(inc.fecha).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}
        </CardContent>
      </Card>

      {/* Resumen Ejecutivo */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Resumen Ejecutivo
          </CardTitle>
          <CardDescription>Análisis y recomendaciones basadas en los datos</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">📊 Métricas Clave</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  • <strong>{data.totalIncidencias}</strong> incidencias totales en el sistema
                </li>
                <li>
                  • <strong>{data.incidenciasCriticas}</strong> incidencias críticas requieren atención inmediata
                </li>
                <li>
                  • <strong>{data.top10Criticas.length}</strong> incidencias en el top 10 más críticas
                </li>
                <li>
                  • Proveedor con más incidencias: <strong>{data.topProveedores[0]?.proveedor}</strong> (
                  {data.topProveedores[0]?.count})
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">🎯 Recomendaciones</h4>
              <ul className="space-y-2 text-sm">
                <li>• Priorizar incidencias en estado "NO ASIGNADO"</li>
                <li>• Revisar procesos con proveedores de mayor volumen</li>
                <li>• Implementar seguimiento automático para incidencias críticas</li>
                <li>• Optimizar tiempos de respuesta en primer contacto</li>
                <li>• Establecer SLA específicos por tipo de responsabilidad</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
