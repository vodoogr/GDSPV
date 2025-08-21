"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Sparkles,
  Calendar,
  User,
  Building,
  Phone,
  Clock,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Package,
  ChevronDown,
  ChevronUp,
  Store,
} from "lucide-react"
import { createClient } from "@/lib/supabase"

interface NuevaIncidencia {
  id: number
  numero: string
  clase_incidencia: string
  tipo_estado: string
  fecha: string
  fecha_alta: string
  nombre_cliente: string
  telefono_cliente: string
  nombre_tienda: string
  nombre_proveedor: string
  descripcion: string
  solucion: string
  cliente: string
  tipo: string
  nombre_vendedor: string
  ejercicio_pedido: number
}

interface TiendaGroup {
  nombre_tienda: string
  incidencias: NuevaIncidencia[]
  total: number
  hoy: number
  ayer: number
}

export default function NuevasIncidencias() {
  const [nuevasIncidencias, setNuevasIncidencias] = useState<NuevaIncidencia[]>([])
  const [filteredIncidencias, setFilteredIncidencias] = useState<NuevaIncidencia[]>([])
  const [tiendasAgrupadas, setTiendasAgrupadas] = useState<TiendaGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState<Date | null>(null)
  const [selectedIncidencia, setSelectedIncidencia] = useState<NuevaIncidencia | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [expandedTiendas, setExpandedTiendas] = useState<Set<string>>(new Set())

  // Filtros
  const [filters, setFilters] = useState({
    busqueda: "",
    tipo_estado: "all",
    nombre_tienda: "all",
    fecha_alta: "all",
  })

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(5) // Reducido porque ahora agrupamos

  useEffect(() => {
    loadNuevasIncidencias()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [nuevasIncidencias, filters])

  const loadNuevasIncidencias = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Obtener la fecha de última sincronización (simulamos que es hoy)
      const fechaSincronizacion = new Date()
      setUltimaSincronizacion(fechaSincronizacion)

      // Calcular las fechas de los últimos 2 días
      const fecha2DiasAtras = new Date(fechaSincronizacion)
      fecha2DiasAtras.setDate(fecha2DiasAtras.getDate() - 1) // 2 días incluyendo hoy

      const fechaInicio = fecha2DiasAtras.toISOString().split("T")[0]
      const fechaFin = fechaSincronizacion.toISOString().split("T")[0]

      console.log(`Buscando incidencias nuevas desde ${fechaInicio} hasta ${fechaFin}`)

      // Cargar incidencias con fecha_alta en los últimos 2 días
      let todasLasIncidencias: NuevaIncidencia[] = []
      let from = 0
      const batchSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: batch, error } = await supabase
          .from("incidencias")
          .select("*")
          .gte("fecha_alta", fechaInicio)
          .lte("fecha_alta", fechaFin + " 23:59:59")
          .order("fecha_alta", { ascending: false })
          .range(from, from + batchSize - 1)

        if (error) {
          console.error("Error loading nuevas incidencias:", error)
          break
        }

        if (batch && batch.length > 0) {
          todasLasIncidencias = [...todasLasIncidencias, ...batch]
          from += batchSize
          hasMore = batch.length === batchSize
        } else {
          hasMore = false
        }
      }

      console.log(`Total nuevas incidencias encontradas: ${todasLasIncidencias.length}`)
      setNuevasIncidencias(todasLasIncidencias || [])
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...nuevasIncidencias]

    if (filters.busqueda) {
      filtered = filtered.filter(
        (i) =>
          i.numero?.toLowerCase().includes(filters.busqueda.toLowerCase()) ||
          i.nombre_cliente?.toLowerCase().includes(filters.busqueda.toLowerCase()) ||
          i.clase_incidencia?.toLowerCase().includes(filters.busqueda.toLowerCase()),
      )
    }

    if (filters.tipo_estado && filters.tipo_estado !== "all") {
      filtered = filtered.filter((i) => i.tipo_estado === filters.tipo_estado)
    }

    if (filters.nombre_tienda && filters.nombre_tienda !== "all") {
      filtered = filtered.filter((i) => i.nombre_tienda === filters.nombre_tienda)
    }

    if (filters.fecha_alta && filters.fecha_alta !== "all") {
      const fechaFiltro = new Date(filters.fecha_alta).toDateString()
      filtered = filtered.filter((i) => new Date(i.fecha_alta).toDateString() === fechaFiltro)
    }

    setFilteredIncidencias(filtered)

    // Agrupar por tienda
    const grupos = agruparPorTienda(filtered)
    setTiendasAgrupadas(grupos)
    setCurrentPage(1)
  }

  const agruparPorTienda = (incidencias: NuevaIncidencia[]): TiendaGroup[] => {
    const grupos: { [key: string]: TiendaGroup } = {}
    const hoy = new Date().toDateString()
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()

    incidencias.forEach((incidencia) => {
      const tienda = incidencia.nombre_tienda || "Sin Tienda"

      if (!grupos[tienda]) {
        grupos[tienda] = {
          nombre_tienda: tienda,
          incidencias: [],
          total: 0,
          hoy: 0,
          ayer: 0,
        }
      }

      grupos[tienda].incidencias.push(incidencia)
      grupos[tienda].total++

      const fechaIncidencia = new Date(incidencia.fecha_alta).toDateString()
      if (fechaIncidencia === hoy) {
        grupos[tienda].hoy++
      } else if (fechaIncidencia === ayer) {
        grupos[tienda].ayer++
      }
    })

    // Convertir a array y ordenar por total descendente
    return Object.values(grupos).sort((a, b) => b.total - a.total)
  }

  const clearFilters = () => {
    setFilters({
      busqueda: "",
      tipo_estado: "all",
      nombre_tienda: "all",
      fecha_alta: "all",
    })
  }

  const getUniqueValues = (field: keyof NuevaIncidencia) => {
    return [...new Set(nuevasIncidencias.map((i) => i[field]).filter(Boolean))]
  }

  const getDiasDesdeAlta = (fechaAlta: string) => {
    const fecha = new Date(fechaAlta)
    const hoy = new Date()
    const diferencia = Math.floor((hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24))
    return diferencia
  }

  const getBadgeColor = (dias: number) => {
    if (dias === 0) return "bg-green-100 text-green-800 border-green-300"
    if (dias === 1) return "bg-blue-100 text-blue-800 border-blue-300"
    return "bg-orange-100 text-orange-800 border-orange-300"
  }

  const getBadgeText = (dias: number) => {
    if (dias === 0) return "HOY"
    if (dias === 1) return "AYER"
    return `${dias} DÍAS`
  }

  const toggleTienda = (tienda: string) => {
    const newExpanded = new Set(expandedTiendas)
    if (newExpanded.has(tienda)) {
      newExpanded.delete(tienda)
    } else {
      newExpanded.add(tienda)
    }
    setExpandedTiendas(newExpanded)
  }

  const expandirTodas = () => {
    setExpandedTiendas(new Set(tiendasAgrupadas.map((t) => t.nombre_tienda)))
  }

  const contraerTodas = () => {
    setExpandedTiendas(new Set())
  }

  // Paginación de tiendas
  const totalPages = Math.ceil(tiendasAgrupadas.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentTiendas = tiendasAgrupadas.slice(startIndex, endIndex)

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-l-4 border-l-emerald-500">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            Nuevas Incidencias por Tienda
            <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">
              {filteredIncidencias.length} incidencias en {tiendasAgrupadas.length} tiendas
            </Badge>
          </CardTitle>
          <CardDescription>
            Incidencias dadas de alta en los últimos 2 días, agrupadas por tienda
            {ultimaSincronizacion && (
              <span className="block mt-1 text-emerald-700 dark:text-emerald-300">
                Última sincronización: {ultimaSincronizacion.toLocaleDateString("es-ES")}
              </span>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
            {Object.values(filters).some((f) => f && f !== "all") && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Búsqueda</label>
              <Input
                placeholder="Número, cliente o clase..."
                value={filters.busqueda}
                onChange={(e) => setFilters({ ...filters, busqueda: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Estado</label>
              <Select
                value={filters.tipo_estado}
                onValueChange={(value) => setFilters({ ...filters, tipo_estado: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {getUniqueValues("tipo_estado").map((estado) => (
                    <SelectItem key={estado} value={estado || ""}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Tienda</label>
              <Select
                value={filters.nombre_tienda}
                onValueChange={(value) => setFilters({ ...filters, nombre_tienda: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las tiendas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {getUniqueValues("nombre_tienda").map((tienda) => (
                    <SelectItem key={tienda} value={tienda || ""}>
                      {tienda}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Fecha Alta</label>
              <Input
                type="date"
                value={filters.fecha_alta === "all" ? "" : filters.fecha_alta}
                onChange={(e) => setFilters({ ...filters, fecha_alta: e.target.value || "all" })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controles de Expansión */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                {tiendasAgrupadas.length} tiendas con incidencias
              </Badge>
              <Badge variant="outline">
                Página {currentPage} de {totalPages}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={expandirTodas}>
                Expandir Todas
              </Button>
              <Button variant="outline" size="sm" onClick={contraerTodas}>
                Contraer Todas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-2">
                {startIndex + 1}-{Math.min(endIndex, tiendasAgrupadas.length)} de {tiendasAgrupadas.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Tiendas Agrupadas */}
      <Card>
        <CardHeader>
          <CardTitle>Incidencias Agrupadas por Tienda</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <p>Cargando nuevas incidencias...</p>
            </div>
          ) : currentTiendas.length === 0 ? (
            <div className="text-center p-8 text-slate-500">
              <Store className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium mb-2">No hay tiendas con incidencias nuevas</h3>
              <p>No se encontraron incidencias nuevas con los filtros aplicados</p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentTiendas.map((tienda) => {
                const isExpanded = expandedTiendas.has(tienda.nombre_tienda)
                return (
                  <Card key={tienda.nombre_tienda} className="border-l-4 border-l-emerald-400">
                    <Collapsible open={isExpanded} onOpenChange={() => toggleTienda(tienda.nombre_tienda)}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Store className="h-5 w-5 text-emerald-600" />
                              <div>
                                <CardTitle className="text-lg">{tienda.nombre_tienda}</CardTitle>
                                <CardDescription>{tienda.total} incidencias nuevas</CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex gap-2">
                                {tienda.hoy > 0 && (
                                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                                    {tienda.hoy} HOY
                                  </Badge>
                                )}
                                {tienda.ayer > 0 && (
                                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                                    {tienda.ayer} AYER
                                  </Badge>
                                )}
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-slate-500" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-slate-500" />
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            {tienda.incidencias.map((incidencia) => {
                              const diasDesdeAlta = getDiasDesdeAlta(incidencia.fecha_alta)
                              return (
                                <Card
                                  key={incidencia.id}
                                  className="hover:shadow-md transition-shadow cursor-pointer border-l-2 border-l-slate-300"
                                  onClick={() => {
                                    setSelectedIncidencia(incidencia)
                                    setShowDetailModal(true)
                                  }}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-3">
                                          <h4 className="font-semibold">
                                            {incidencia.numero} - {incidencia.clase_incidencia}
                                          </h4>
                                          <Badge variant="outline" className={getBadgeColor(diasDesdeAlta)}>
                                            {getBadgeText(diasDesdeAlta)}
                                          </Badge>
                                          <Badge
                                            variant="outline"
                                            className={
                                              incidencia.tipo_estado === "NO ASIGNADO"
                                                ? "bg-red-100 text-red-800 border-red-300"
                                                : "bg-blue-100 text-blue-800 border-blue-300"
                                            }
                                          >
                                            {incidencia.tipo_estado}
                                          </Badge>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                          <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                              <User className="h-4 w-4 text-slate-500" />
                                              <span className="font-medium">{incidencia.nombre_cliente}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Phone className="h-4 w-4 text-slate-500" />
                                              <span>{incidencia.telefono_cliente}</span>
                                            </div>
                                          </div>

                                          <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                              <Calendar className="h-4 w-4 text-slate-500" />
                                              <span>
                                                Fecha: {new Date(incidencia.fecha).toLocaleDateString("es-ES")}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Clock className="h-4 w-4 text-slate-500" />
                                              <span>
                                                Alta: {new Date(incidencia.fecha_alta).toLocaleString("es-ES")}
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        {incidencia.descripcion && incidencia.descripcion.trim() && (
                                          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                            <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                                              {incidencia.descripcion}
                                            </p>
                                          </div>
                                        )}
                                      </div>

                                      <Button variant="outline" size="sm" className="ml-4 bg-transparent">
                                        Ver Detalle
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              )
                            })}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalles */}
      {selectedIncidencia && showDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-4 pb-4 px-2 sm:px-4 z-50 overflow-y-auto">
          <Card className="w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden my-4 sm:my-8">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 sticky top-0 z-10 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-600" />
                  Detalle de Nueva Incidencia
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowDetailModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                  {selectedIncidencia.numero} - {selectedIncidencia.clase_incidencia}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="outline" className={getBadgeColor(getDiasDesdeAlta(selectedIncidencia.fecha_alta))}>
                    {getBadgeText(getDiasDesdeAlta(selectedIncidencia.fecha_alta))}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      selectedIncidencia.tipo_estado === "NO ASIGNADO"
                        ? "bg-red-100 text-red-800 border-red-300"
                        : "bg-blue-100 text-blue-800 border-blue-300"
                    }
                  >
                    {selectedIncidencia.tipo_estado}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 overflow-y-auto max-h-[calc(95vh-200px)] sm:max-h-[calc(90vh-200px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium">Cliente:</span>
                    <span className="font-bold">{selectedIncidencia.nombre_cliente}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium">Teléfono:</span>
                    <span className="font-bold">{selectedIncidencia.telefono_cliente}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium">Tienda:</span>
                    <span className="font-bold">{selectedIncidencia.nombre_tienda}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium">Fecha:</span>
                    <span className="font-bold">{new Date(selectedIncidencia.fecha).toLocaleDateString("es-ES")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium">Fecha Alta:</span>
                    <span className="font-bold">{new Date(selectedIncidencia.fecha_alta).toLocaleString("es-ES")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium">Proveedor:</span>
                    <span className="font-bold">{selectedIncidencia.nombre_proveedor}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Descripción:</h4>
                  <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                    {selectedIncidencia.descripcion && selectedIncidencia.descripcion.trim()
                      ? selectedIncidencia.descripcion
                      : "No hay descripción disponible"}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Solución:</h4>
                  <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                    {selectedIncidencia.solucion && selectedIncidencia.solucion.trim()
                      ? selectedIncidencia.solucion
                      : "No hay solución registrada"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
