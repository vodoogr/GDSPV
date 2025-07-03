"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Phone,
  Mail,
  MessageSquare,
  AlertTriangle,
  Calendar,
  User,
  Building,
  Wrench,
  Package,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Filter,
  X,
  Clock,
  Check,
} from "lucide-react"
import { createClient } from "@/lib/supabase"

interface Incidencia {
  id: number
  clase_incidencia: string
  numero: string
  tipo_estado: string
  fecha: string
  nombre_tienda: string
  nombre_proveedor: string
  cliente: string
  nombre_cliente: string
  telefono_cliente: string
  descripcion: string
  solucion: string
  fecha_alta: string
  ejercicio_pedido: number
  tipo: string
  nombre_vendedor: string
}

interface TiempoPromedio {
  tiempo_promedio_horas: number
  tiempo_promedio_dias: number
  total_incidencias: number
}

export default function SearchIncidencias() {
  const [searchTerm, setSearchTerm] = useState("")
  const [claseIncidencia, setClaseIncidencia] = useState("")
  const [incidencia, setIncidencia] = useState<Incidencia | null>(null)
  const [allIncidencias, setAllIncidencias] = useState<Incidencia[]>([])
  const [filteredIncidencias, setFilteredIncidencias] = useState<Incidencia[]>([])
  const [loading, setLoading] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageType, setMessageType] = useState("")
  const [messageContent, setMessageContent] = useState("")
  const [showAllIncidencias, setShowAllIncidencias] = useState(false)
  const [tiempoPromedio, setTiempoPromedio] = useState<TiempoPromedio | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Filtros para tiempo promedio
  const [tiempoFiltro, setTiempoFiltro] = useState({
    tipo: "todos",
    año: new Date().getFullYear().toString(),
    mes: (new Date().getMonth() + 1).toString(),
    fecha: new Date().toISOString().split("T")[0],
  })

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)

  // Filtros para "Todas las Incidencias"
  const [filters, setFilters] = useState({
    ejercicio: "",
    numero: "",
    tipo_estado: ["all"], // Changed from "all" to ["all"]
    nombre_tienda: "all",
    nombre_proveedor: "all",
    nombre_cliente: "",
    nombre_vendedor: "all",
    tipo: "all",
    año_alta: "all",
  })

  const [showEmailInput, setShowEmailInput] = useState(false)
  const [clientEmail, setClientEmail] = useState("")

  const [sortConfig, setSortConfig] = useState<{
    key: keyof Incidencia | null
    direction: "asc" | "desc"
  }>({
    key: null,
    direction: "asc",
  })

  useEffect(() => {
    if (showAllIncidencias) {
      loadAllIncidencias()
      loadTiempoPromedio()
    }
  }, [showAllIncidencias])

  useEffect(() => {
    applyFilters()
  }, [allIncidencias, filters])

  const getAvailableYears = () => {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let year = currentYear; year >= currentYear - 5; year--) {
      years.push(year)
    }
    return years
  }

  const loadTiempoPromedio = async () => {
    try {
      const supabase = createClient()

      // Construir filtros de fecha según el tipo seleccionado
      let fechaInicio: Date | null = null
      let fechaFin: Date | null = null

      if (tiempoFiltro.tipo === "año") {
        fechaInicio = new Date(Number.parseInt(tiempoFiltro.año), 0, 1)
        fechaFin = new Date(Number.parseInt(tiempoFiltro.año) + 1, 0, 1)
      } else if (tiempoFiltro.tipo === "mes") {
        fechaInicio = new Date(Number.parseInt(tiempoFiltro.año), Number.parseInt(tiempoFiltro.mes) - 1, 1)
        fechaFin = new Date(Number.parseInt(tiempoFiltro.año), Number.parseInt(tiempoFiltro.mes), 1)
      } else if (tiempoFiltro.tipo === "dia") {
        fechaInicio = new Date(tiempoFiltro.fecha)
        fechaFin = new Date(fechaInicio.getTime() + 24 * 60 * 60 * 1000)
      }

      // Construir query con filtros
      let query = supabase
        .from("incidencias")
        .select("fecha, fecha_alta")
        .not("fecha", "is", null)
        .not("fecha_alta", "is", null)

      if (fechaInicio && fechaFin) {
        query = query
          .gte("fecha", fechaInicio.toISOString().split("T")[0])
          .lt("fecha", fechaFin.toISOString().split("T")[0])
      }

      const { data: incidencias, error } = await query
        .order("fecha", { ascending: true })
        .order("fecha_alta", { ascending: true })

      if (error) {
        console.error("Error loading tiempo promedio:", error)
        return
      }

      if (!incidencias || incidencias.length < 2) {
        setTiempoPromedio({
          tiempo_promedio_horas: 0,
          tiempo_promedio_dias: 0,
          total_incidencias: incidencias?.length || 0,
        })
        return
      }

      // Resto de la lógica de cálculo permanece igual...
      // Agrupar incidencias por día
      const incidenciasPorDia = incidencias.reduce((acc: any, inc) => {
        const fecha = new Date(inc.fecha).toDateString()
        if (!acc[fecha]) acc[fecha] = []
        acc[fecha].push(inc)
        return acc
      }, {})

      // Calcular tiempos entre incidencias consecutivas del mismo día
      const tiemposEntreIncidencias: number[] = []

      Object.values(incidenciasPorDia).forEach((incidenciasDia: any) => {
        if (incidenciasDia.length > 1) {
          // Ordenar por fecha_alta dentro del mismo día
          incidenciasDia.sort((a: any, b: any) => new Date(a.fecha_alta).getTime() - new Date(b.fecha_alta).getTime())

          // Calcular tiempo entre cada incidencia consecutiva
          for (let i = 1; i < incidenciasDia.length; i++) {
            const incidenciaAnterior = new Date(incidenciasDia[i - 1].fecha_alta)
            const incidenciaActual = new Date(incidenciasDia[i].fecha_alta)
            const tiempoEntre = (incidenciaActual.getTime() - incidenciaAnterior.getTime()) / (1000 * 60 * 60) // en horas

            if (tiempoEntre > 0) {
              tiemposEntreIncidencias.push(tiempoEntre)
            }
          }
        }
      })

      // Calcular promedio
      const promedioHoras =
        tiemposEntreIncidencias.length > 0
          ? tiemposEntreIncidencias.reduce((sum, tiempo) => sum + tiempo, 0) / tiemposEntreIncidencias.length
          : 0

      setTiempoPromedio({
        tiempo_promedio_horas: promedioHoras,
        tiempo_promedio_dias: promedioHoras / 24,
        total_incidencias: tiemposEntreIncidencias.length,
      })
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const loadAllIncidencias = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Load ALL incidencias using pagination
      let allIncidenciasData: Incidencia[] = []
      let from = 0
      const batchSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: batch, error } = await supabase
          .from("incidencias")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, from + batchSize - 1)

        if (error) {
          console.error("Error loading incidencias:", error)
          break
        }

        if (batch && batch.length > 0) {
          allIncidenciasData = [...allIncidenciasData, ...batch]
          from += batchSize
          hasMore = batch.length === batchSize
        } else {
          hasMore = false
        }
      }

      console.log(`Total incidencias cargadas: ${allIncidenciasData.length}`)
      setAllIncidencias(allIncidenciasData || [])
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...allIncidencias]

    if (filters.ejercicio) {
      filtered = filtered.filter((i) => i.ejercicio_pedido?.toString().includes(filters.ejercicio))
    }
    if (filters.numero) {
      filtered = filtered.filter((i) => i.numero?.toLowerCase().includes(filters.numero.toLowerCase()))
    }
    if (filters.tipo_estado && filters.tipo_estado.length > 0 && !filters.tipo_estado.includes("all")) {
      filtered = filtered.filter((i) => filters.tipo_estado.includes(i.tipo_estado))
    }
    if (filters.nombre_tienda && filters.nombre_tienda !== "all") {
      filtered = filtered.filter((i) => i.nombre_tienda === filters.nombre_tienda)
    }
    if (filters.nombre_proveedor && filters.nombre_proveedor !== "all") {
      filtered = filtered.filter((i) => i.nombre_proveedor === filters.nombre_proveedor)
    }
    if (filters.nombre_cliente) {
      filtered = filtered.filter((i) => i.nombre_cliente?.toLowerCase().includes(filters.nombre_cliente.toLowerCase()))
    }
    if (filters.nombre_vendedor && filters.nombre_vendedor !== "all") {
      filtered = filtered.filter((i) => i.nombre_vendedor === filters.nombre_vendedor)
    }
    if (filters.tipo && filters.tipo !== "all") {
      filtered = filtered.filter((i) => i.tipo === filters.tipo)
    }
    if (filters.año_alta && filters.año_alta !== "all") {
      filtered = filtered.filter(
        (i) => i.fecha_alta && new Date(i.fecha_alta).getFullYear().toString() === filters.año_alta,
      )
    }

    setFilteredIncidencias(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }

  const clearFilters = () => {
    setFilters({
      ejercicio: "",
      numero: "",
      tipo_estado: ["all"], // Changed from "all" to ["all"]
      nombre_tienda: "all",
      nombre_proveedor: "all",
      nombre_cliente: "",
      nombre_vendedor: "all",
      tipo: "all",
      año_alta: "all",
    })
  }

  const searchIncidencia = async () => {
    if (!searchTerm || !claseIncidencia) return

    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("incidencias")
        .select("*")
        .eq("numero", searchTerm)
        .eq("clase_incidencia", claseIncidencia)
        .single()

      if (error) {
        console.error("Error searching incidencia:", error)
        setIncidencia(null)
      } else {
        setIncidencia(data)
      }
    } catch (error) {
      console.error("Error:", error)
      setIncidencia(null)
    } finally {
      setLoading(false)
    }
  }

  const getMessageTemplate = (type: string) => {
    const templates = {
      VISITA_CLIENTE: `Estimado/a ${incidencia?.nombre_cliente},

Le informamos que hemos programado una visita técnica a su domicilio para revisar la incidencia ${incidencia?.numero}.

Nuestro técnico se pondrá en contacto con usted para coordinar la fecha y hora más conveniente.

Gracias por su paciencia.

Atentamente,
Departamento de Postventa GDSPV`,

      RECOGIDA_CLIENTE: `Estimado/a ${incidencia?.nombre_cliente},

Le informamos que nuestro departamento de distribución se pondrá en contacto con usted próximamente para coordinar la recogida de su producto relacionado con la incidencia ${incidencia?.numero}.

Gracias por su colaboración.

Atentamente,
Departamento de Postventa GDSPV`,

      RECOGIDA_PROVEEDOR: `Estimado proveedor,

Les informamos que tienen mercancía a su disposición relacionada con la incidencia ${incidencia?.numero} del cliente ${incidencia?.nombre_cliente}.

Por favor, coordinen la recogida a la mayor brevedad posible.

Saludos cordiales,
Departamento de Postventa GDSPV`,

      CAMBIO_PROVEEDOR: `Estimado/a ${incidencia?.nombre_cliente},

Le informamos que nuestro departamento de postventa ha realizado la gestión correspondiente con el proveedor para su incidencia ${incidencia?.numero}.

Le avisaremos tan pronto como su producto esté listo para ser entregado.

Gracias por su paciencia.

Atentamente,
Departamento de Postventa GDSPV`,

      REPARACION: `Estimado/a ${incidencia?.nombre_cliente},

Le informamos que nuestro departamento de Postventa ha gestionado el envío de su reparación correspondiente a la incidencia ${incidencia?.numero}.

Nos pondremos en contacto con usted cuando el producto esté listo para ser entregado.

Gracias por su confianza.

Atentamente,
Departamento de Postventa GDSPV`,

      ENTREGA_CLIENTE: `Estimado/a ${incidencia?.nombre_cliente},

¡Buenas noticias! Su producto relacionado con la incidencia ${incidencia?.numero} ya ha llegado a nuestro almacén.

Nuestro departamento de distribución se pondrá en contacto con usted en las próximas 48 horas para coordinar la entrega.

Si no recibe noticias nuestras en este plazo, no dude en llamar al teléfono de atención al cliente.

Gracias por su paciencia.

Atentamente,
Departamento de Postventa GDSPV`,
    }
    return templates[type as keyof typeof templates] || ""
  }

  const handleSendEmail = () => {
    setShowEmailInput(true)
  }

  const confirmSendEmail = () => {
    if (clientEmail.trim()) {
      // Aquí se enviaría el email
      console.log(`Enviando email a: ${clientEmail}`)
      console.log(`Mensaje: ${messageContent}`)
      setShowEmailInput(false)
      setClientEmail("")
      setShowMessageModal(false)
    }
  }

  const handleActionClick = (type: string) => {
    setMessageType(type)
    setMessageContent(getMessageTemplate(type))
    setShowMessageModal(true)
  }

  const isOldIncidencia =
    incidencia &&
    incidencia.fecha_alta &&
    new Date(incidencia.fecha_alta) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Paginación
  const totalPages = Math.ceil(filteredIncidencias.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage

  const formatTiempo = (horas: number) => {
    if (horas < 24) {
      return `${horas.toFixed(1)} horas`
    } else {
      const dias = Math.floor(horas / 24)
      const horasRestantes = (horas % 24).toFixed(1)
      return `${dias} días ${horasRestantes} horas`
    }
  }

  const handleSort = (key: keyof Incidencia) => {
    let direction: "asc" | "desc" = "asc"
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }
    setSortConfig({ key, direction })
  }

  const getSortedData = (data: Incidencia[]) => {
    if (!sortConfig.key) return data

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key!]
      const bValue = b[sortConfig.key!]

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return sortConfig.direction === "asc" ? 1 : -1
      if (bValue == null) return sortConfig.direction === "asc" ? -1 : 1

      // Handle dates
      if (sortConfig.key === "fecha" || sortConfig.key === "fecha_alta") {
        const dateA = new Date(aValue as string).getTime()
        const dateB = new Date(bValue as string).getTime()
        return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA
      }

      // Handle numbers
      if (sortConfig.key === "ejercicio_pedido") {
        const numA = Number(aValue) || 0
        const numB = Number(bValue) || 0
        return sortConfig.direction === "asc" ? numA - numB : numB - numA
      }

      // Handle strings
      const stringA = String(aValue).toLowerCase()
      const stringB = String(bValue).toLowerCase()

      if (stringA < stringB) return sortConfig.direction === "asc" ? -1 : 1
      if (stringA > stringB) return sortConfig.direction === "asc" ? 1 : -1
      return 0
    })
  }

  const sortedIncidencias = getSortedData(filteredIncidencias)
  const endIndex = startIndex + itemsPerPage
  const currentIncidencias = sortedIncidencias.slice(startIndex, endIndex)

  const getUniqueValues = (field: keyof Incidencia) => {
    return [...new Set(allIncidencias.map((i) => i[field]).filter(Boolean))]
  }

  return (
    <div className="space-y-6">
      {/* Search Form - Simplificado */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Incidencia Específica
          </CardTitle>
          <CardDescription>Introduce el número de incidencia y su clase para buscar</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Número de incidencia"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Input
              placeholder="Clase de incidencia"
              value={claseIncidencia}
              onChange={(e) => setClaseIncidencia(e.target.value)}
            />
            <Button onClick={searchIncidencia} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? "Buscando..." : "Buscar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Toggle All Incidencias */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Todas las Incidencias
            </div>
            <Button
              onClick={() => setShowAllIncidencias(!showAllIncidencias)}
              variant={showAllIncidencias ? "destructive" : "default"}
              className="ml-auto"
            >
              {showAllIncidencias ? "Ocultar" : "Mostrar Todas"}
            </Button>
          </CardTitle>
          <CardDescription>Ver y filtrar todas las incidencias del sistema</CardDescription>
        </CardHeader>
      </Card>

      {/* All Incidencias Section */}
      {showAllIncidencias && (
        <div className="space-y-6">
          {/* Tiempo Promedio de Apertura */}
          {tiempoPromedio && (
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Tiempo Promedio Entre Incidencias Consecutivas
                </CardTitle>
                <CardDescription>
                  Tiempo promedio que transcurre entre incidencias consecutivas del mismo día
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {/* Filtros de período */}
                <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <h4 className="font-medium mb-3">Filtrar por período:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Tipo de filtro</label>
                      <Select
                        value={tiempoFiltro.tipo}
                        onValueChange={(value) => setTiempoFiltro({ ...tiempoFiltro, tipo: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos los datos</SelectItem>
                          <SelectItem value="año">Por año</SelectItem>
                          <SelectItem value="mes">Por mes</SelectItem>
                          <SelectItem value="dia">Por día específico</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {tiempoFiltro.tipo === "año" && (
                      <div>
                        <label className="text-sm font-medium mb-1 block">Año</label>
                        <Select
                          value={tiempoFiltro.año}
                          onValueChange={(value) => setTiempoFiltro({ ...tiempoFiltro, año: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar año" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableYears().map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {tiempoFiltro.tipo === "mes" && (
                      <>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Año</label>
                          <Select
                            value={tiempoFiltro.año}
                            onValueChange={(value) => setTiempoFiltro({ ...tiempoFiltro, año: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Año" />
                            </SelectTrigger>
                            <SelectContent>
                              {getAvailableYears().map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Mes</label>
                          <Select
                            value={tiempoFiltro.mes}
                            onValueChange={(value) => setTiempoFiltro({ ...tiempoFiltro, mes: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Mes" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {new Date(2024, i).toLocaleDateString("es-ES", { month: "long" })}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    {tiempoFiltro.tipo === "dia" && (
                      <div>
                        <label className="text-sm font-medium mb-1 block">Fecha específica</label>
                        <Input
                          type="date"
                          value={tiempoFiltro.fecha}
                          onChange={(e) => setTiempoFiltro({ ...tiempoFiltro, fecha: e.target.value })}
                        />
                      </div>
                    )}

                    <div className="flex items-end">
                      <Button onClick={loadTiempoPromedio} className="w-full" disabled={loading}>
                        Calcular
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600">
                      {formatTiempo(tiempoPromedio.tiempo_promedio_horas)}
                    </div>
                    <div className="text-sm text-purple-700 dark:text-purple-300">Tiempo Promedio</div>
                    <div className="text-xs text-purple-500 mt-1">
                      {tiempoFiltro.tipo === "todos" && "Todos los datos"}
                      {tiempoFiltro.tipo === "año" && `Año ${tiempoFiltro.año}`}
                      {tiempoFiltro.tipo === "mes" &&
                        `${new Date(2024, Number.parseInt(tiempoFiltro.mes) - 1).toLocaleDateString("es-ES", { month: "long" })} ${tiempoFiltro.año}`}
                      {tiempoFiltro.tipo === "dia" && `${new Date(tiempoFiltro.fecha).toLocaleDateString("es-ES")}`}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">
                      {Math.floor(tiempoPromedio.tiempo_promedio_horas)}h{" "}
                      {Math.round((tiempoPromedio.tiempo_promedio_horas % 1) * 60)}m
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">Tiempo Entre Incidencias</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">{tiempoPromedio.total_incidencias}</div>
                    <div className="text-sm text-green-700 dark:text-green-300">Intervalos Analizados</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filtros Avanzados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros Avanzados
                {Object.values(filters).some((f) => f) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
                    <X className="h-4 w-4 mr-1" />
                    Limpiar
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Filtros de Búsqueda Rápida */}
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                  <h4 className="font-medium mb-3 text-slate-900 dark:text-slate-100">Búsqueda Rápida</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block text-slate-700 dark:text-slate-300">
                        Número
                      </label>
                      <Input
                        placeholder="Buscar número..."
                        value={filters.numero}
                        onChange={(e) => setFilters({ ...filters, numero: e.target.value })}
                        className="bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block text-slate-700 dark:text-slate-300">
                        Cliente
                      </label>
                      <Input
                        placeholder="Buscar cliente..."
                        value={filters.nombre_cliente}
                        onChange={(e) => setFilters({ ...filters, nombre_cliente: e.target.value })}
                        className="bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block text-slate-700 dark:text-slate-300">
                        Ejercicio
                      </label>
                      <Input
                        placeholder="Año ejercicio..."
                        value={filters.ejercicio}
                        onChange={(e) => setFilters({ ...filters, ejercicio: e.target.value })}
                        className="bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Filtros de Selección */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Año Alta */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Año Alta
                    </label>
                    <Select
                      value={filters.año_alta}
                      onValueChange={(value) => setFilters({ ...filters, año_alta: value })}
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-900">
                        <SelectValue placeholder="Todos los años" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {allIncidencias.length > 0
                          ? [
                              ...new Set(
                                allIncidencias
                                  .map((i) => (i.fecha_alta ? new Date(i.fecha_alta).getFullYear() : null))
                                  .filter(Boolean),
                              ),
                            ]
                              .sort((a, b) => b - a)
                              .map((año) => (
                                <SelectItem key={año} value={año?.toString() || ""}>
                                  {año}
                                </SelectItem>
                              ))
                          : Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((año) => (
                              <SelectItem key={año} value={año.toString()}>
                                {año}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Nombre Tienda */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Tienda
                    </label>
                    <Select
                      value={filters.nombre_tienda}
                      onValueChange={(value) => setFilters({ ...filters, nombre_tienda: value })}
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-900">
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

                  {/* Nombre Proveedor */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Proveedor
                    </label>
                    <Select
                      value={filters.nombre_proveedor}
                      onValueChange={(value) => setFilters({ ...filters, nombre_proveedor: value })}
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-900">
                        <SelectValue placeholder="Todos los proveedores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {getUniqueValues("nombre_proveedor").map((proveedor) => (
                          <SelectItem key={proveedor} value={proveedor || ""}>
                            {proveedor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Nombre Vendedor */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Vendedor
                    </label>
                    <Select
                      value={filters.nombre_vendedor}
                      onValueChange={(value) => setFilters({ ...filters, nombre_vendedor: value })}
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-900">
                        <SelectValue placeholder="Todos los vendedores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {getUniqueValues("nombre_vendedor").map((vendedor) => (
                          <SelectItem key={vendedor} value={vendedor || ""}>
                            {vendedor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tipo */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Tipo
                    </label>
                    <Select value={filters.tipo} onValueChange={(value) => setFilters({ ...filters, tipo: value })}>
                      <SelectTrigger className="bg-white dark:bg-slate-900">
                        <SelectValue placeholder="Todos los tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {getUniqueValues("tipo").map((tipo) => (
                          <SelectItem key={tipo} value={tipo || ""}>
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tipo Estado - Multi-select mejorado */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Estado de Incidencias
                  </label>

                  {/* Estados seleccionados */}
                  <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-white dark:bg-slate-900 min-h-12">
                    {filters.tipo_estado.includes("all") ? (
                      <Badge
                        variant="secondary"
                        className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      >
                        Todos los estados
                      </Badge>
                    ) : filters.tipo_estado.length === 0 ? (
                      <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
                        Selecciona uno o más estados...
                      </span>
                    ) : (
                      filters.tipo_estado.map((estado) => (
                        <Badge
                          key={estado}
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 cursor-pointer transition-colors"
                          onClick={() => {
                            const newEstados = filters.tipo_estado.filter((e) => e !== estado)
                            setFilters({
                              ...filters,
                              tipo_estado: newEstados.length ? newEstados : ["all"],
                            })
                          }}
                        >
                          {estado}
                          <X className="h-3 w-3 ml-1" />
                        </Badge>
                      ))
                    )}
                  </div>

                  {/* Opciones de estado */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-3 border rounded-lg bg-slate-50 dark:bg-slate-800 max-h-40 overflow-y-auto">
                    <div
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors hover:bg-white dark:hover:bg-slate-700 ${
                        filters.tipo_estado.includes("all") ? "bg-blue-100 dark:bg-blue-900/30" : ""
                      }`}
                      onClick={() => setFilters({ ...filters, tipo_estado: ["all"] })}
                    >
                      <div
                        className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${
                          filters.tipo_estado.includes("all") ? "bg-blue-600 border-blue-600" : "border-gray-300"
                        }`}
                      >
                        {filters.tipo_estado.includes("all") && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className="text-sm font-medium">Todos</span>
                    </div>
                    {getUniqueValues("tipo_estado").map((estado) => (
                      <div
                        key={estado}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors hover:bg-white dark:hover:bg-slate-700 ${
                          !filters.tipo_estado.includes("all") && filters.tipo_estado.includes(estado || "")
                            ? "bg-blue-100 dark:bg-blue-900/30"
                            : ""
                        }`}
                        onClick={() => {
                          if (filters.tipo_estado.includes("all")) {
                            setFilters({ ...filters, tipo_estado: [estado || ""] })
                          } else if (filters.tipo_estado.includes(estado || "")) {
                            const newEstados = filters.tipo_estado.filter((e) => e !== estado)
                            setFilters({
                              ...filters,
                              tipo_estado: newEstados.length ? newEstados : ["all"],
                            })
                          } else {
                            setFilters({
                              ...filters,
                              tipo_estado: [...filters.tipo_estado, estado || ""],
                            })
                          }
                        }}
                      >
                        <div
                          className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${
                            !filters.tipo_estado.includes("all") && filters.tipo_estado.includes(estado || "")
                              ? "bg-blue-600 border-blue-600"
                              : "border-gray-300"
                          }`}
                        >
                          {!filters.tipo_estado.includes("all") && filters.tipo_estado.includes(estado || "") && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <span className="text-sm">{estado}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {Object.values(filters).some((f) =>
                      Array.isArray(f) ? !f.includes("all") && f.length > 0 : f && f !== "all",
                    ) && (
                      <span className="flex items-center gap-1">
                        <Filter className="h-4 w-4" />
                        Filtros activos
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Limpiar Filtros
                    </Button>
                    <Button size="sm" onClick={() => setCurrentPage(1)}>
                      <Search className="h-4 w-4 mr-1" />
                      Aplicar Filtros
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {filteredIncidencias.length} incidencias encontradas
                  </Badge>
                  <Badge variant="outline">
                    Página {currentPage} de {totalPages}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-2">
                    {startIndex + 1}-{Math.min(endIndex, filteredIncidencias.length)} de {filteredIncidencias.length}
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

          {/* Incidencias Table */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Incidencias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th
                        className="text-left p-3 font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 select-none"
                        onClick={() => handleSort("ejercicio_pedido")}
                      >
                        <div className="flex items-center gap-1">
                          Ejercicio
                          {sortConfig.key === "ejercicio_pedido" &&
                            (sortConfig.direction === "asc" ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            ))}
                        </div>
                      </th>
                      <th
                        className="text-left p-3 font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 select-none"
                        onClick={() => handleSort("numero")}
                      >
                        <div className="flex items-center gap-1">
                          Número
                          {sortConfig.key === "numero" &&
                            (sortConfig.direction === "asc" ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            ))}
                        </div>
                      </th>
                      <th className="text-left p-3 font-medium">Clase</th>
                      <th className="text-left p-3 font-medium">Estado</th>
                      <th className="text-left p-3 font-medium">Cliente</th>
                      <th
                        className="text-left p-3 font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 select-none"
                        onClick={() => handleSort("nombre_tienda")}
                      >
                        <div className="flex items-center gap-1">
                          Tienda
                          {sortConfig.key === "nombre_tienda" &&
                            (sortConfig.direction === "asc" ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            ))}
                        </div>
                      </th>
                      <th className="text-left p-3 font-medium">Tipo</th>
                      <th
                        className="text-left p-3 font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 select-none"
                        onClick={() => handleSort("fecha")}
                      >
                        <div className="flex items-center gap-1">
                          Fecha
                          {sortConfig.key === "fecha" &&
                            (sortConfig.direction === "asc" ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            ))}
                        </div>
                      </th>
                      <th
                        className="text-left p-3 font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 select-none"
                        onClick={() => handleSort("fecha_alta")}
                      >
                        <div className="flex items-center gap-1">
                          Fecha Alta
                          {sortConfig.key === "fecha_alta" &&
                            (sortConfig.direction === "asc" ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            ))}
                        </div>
                      </th>
                      <th className="text-left p-3 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={10} className="text-center p-8">
                          <div className="flex justify-center items-center gap-2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span>Cargando incidencias...</span>
                          </div>
                        </td>
                      </tr>
                    ) : currentIncidencias.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center p-8 text-slate-500">
                          No se encontraron incidencias con los filtros aplicados
                        </td>
                      </tr>
                    ) : (
                      currentIncidencias.map((inc) => (
                        <tr key={inc.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800">
                          <td className="p-3">{inc.ejercicio_pedido || "-"}</td>
                          <td className="p-3 font-medium">{inc.numero}</td>
                          <td className="p-3">{inc.clase_incidencia}</td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={
                                inc.tipo_estado === "NO ASIGNADO"
                                  ? "bg-orange-100 text-orange-800 border-orange-300"
                                  : "text-xs"
                              }
                            >
                              {inc.tipo_estado}
                            </Badge>
                          </td>
                          <td className="p-3">{inc.nombre_cliente}</td>
                          <td className="p-3">{inc.nombre_tienda}</td>
                          <td className="p-3">{inc.tipo || "-"}</td>
                          <td className="p-3">{inc.fecha ? new Date(inc.fecha).toLocaleDateString() : "-"}</td>
                          <td className="p-3">{inc.fecha_alta ? new Date(inc.fecha_alta).toLocaleString() : "-"}</td>
                          <td className="p-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setIncidencia(inc)
                                setShowDetailModal(true)
                              }}
                            >
                              Ver Detalle
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Incidencia Details */}
      {incidencia && (
        <div className="space-y-6">
          {/* Warning for old incidencias */}
          {isOldIncidencia && (
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">
                    Atención: Esta incidencia tiene más de 7 días desde su fecha de alta
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Info Card */}
          <Card className="border-2 border-blue-200 dark:border-blue-800">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {incidencia.numero} - {incidencia.clase_incidencia}
                </div>
                <div className="text-xl font-semibold text-slate-700 dark:text-slate-300">
                  {incidencia.nombre_tienda}
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{incidencia.nombre_cliente}</div>
                <div className="flex items-center justify-center gap-2 text-lg font-medium text-slate-700 dark:text-slate-300">
                  <Phone className="h-5 w-5" />
                  {incidencia.telefono_cliente}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium">Fecha:</span>
                    <span className="font-bold">{new Date(incidencia.fecha).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        incidencia.tipo_estado === "NO ASIGNADO"
                          ? "bg-orange-100 text-orange-800 border-orange-300"
                          : ""
                      }
                    >
                      {incidencia.tipo_estado}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium">Proveedor:</span>
                    <span className="font-bold">{incidencia.nombre_proveedor}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium">Cliente:</span>
                    <span className="font-bold">{incidencia.cliente}</span>
                  </div>
                  {incidencia.fecha_alta && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-medium">Fecha Alta:</span>
                      <span className="font-bold">{new Date(incidencia.fecha_alta).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description and Solution */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Descripción:</h4>
                  <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                    {incidencia.descripcion || "No hay descripción disponible"}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Solución:</h4>
                  <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                    {incidencia.solucion || "No hay solución registrada"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones de Aviso al Cliente</CardTitle>
              <CardDescription>Selecciona el tipo de aviso que deseas enviar al cliente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button
                  onClick={() => handleActionClick("VISITA_CLIENTE")}
                  className="h-auto p-4 flex flex-col items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <User className="h-6 w-6" />
                  <span className="font-medium">VISITA CLIENTE</span>
                  <span className="text-xs opacity-90">Programar visita técnica</span>
                </Button>

                <Button
                  onClick={() => handleActionClick("RECOGIDA_CLIENTE")}
                  className="h-auto p-4 flex flex-col items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Package className="h-6 w-6" />
                  <span className="font-medium">RECOGIDA CLIENTE</span>
                  <span className="text-xs opacity-90">Coordinar recogida</span>
                </Button>

                <Button
                  onClick={() => handleActionClick("RECOGIDA_PROVEEDOR")}
                  className="h-auto p-4 flex flex-col items-center gap-2 bg-orange-600 hover:bg-orange-700"
                >
                  <Building className="h-6 w-6" />
                  <span className="font-medium">RECOGIDA PROVEEDOR</span>
                  <span className="text-xs opacity-90">Avisar al proveedor</span>
                </Button>

                <Button
                  onClick={() => handleActionClick("CAMBIO_PROVEEDOR")}
                  className="h-auto p-4 flex flex-col items-center gap-2 bg-purple-600 hover:bg-purple-700"
                >
                  <Wrench className="h-6 w-6" />
                  <span className="font-medium">CAMBIO PROVEEDOR</span>
                  <span className="text-xs opacity-90">Gestión con proveedor</span>
                </Button>

                <Button
                  onClick={() => handleActionClick("REPARACION")}
                  className="h-auto p-4 flex flex-col items-center gap-2 bg-red-600 hover:bg-red-700"
                >
                  <Wrench className="h-6 w-6" />
                  <span className="font-medium">REPARACIÓN</span>
                  <span className="text-xs opacity-90">Envío a reparación</span>
                </Button>

                <Button
                  onClick={() => handleActionClick("ENTREGA_CLIENTE")}
                  className="h-auto p-4 flex flex-col items-center gap-2 bg-teal-600 hover:bg-teal-700"
                >
                  <Package className="h-6 w-6" />
                  <span className="font-medium">ENTREGA CLIENTE</span>
                  <span className="text-xs opacity-90">Producto listo</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Mensaje para {messageType.replace("_", " ")}</CardTitle>
              <CardDescription>Revisa y personaliza el mensaje antes de enviarlo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                className="w-full h-64 p-3 border rounded-lg resize-none"
                placeholder="Contenido del mensaje..."
              />
              {showEmailInput && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email del cliente:</label>
                  <Input
                    type="email"
                    placeholder="cliente@email.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowEmailInput(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={confirmSendEmail} disabled={!clientEmail.trim()}>
                      Confirmar Envío
                    </Button>
                  </div>
                </div>
              )}
              {!showEmailInput && (
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowMessageModal(false)}>
                    Cancelar
                  </Button>
                  <Button className="flex items-center gap-2" onClick={handleSendEmail}>
                    <Mail className="h-4 w-4" />
                    Enviar Email
                  </Button>
                  <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                    <MessageSquare className="h-4 w-4" />
                    Enviar WhatsApp
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Detalles de Incidencia */}
      {incidencia && showDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-4 pb-4 px-2 sm:px-4 z-50 overflow-y-auto">
          <Card className="w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden my-4 sm:my-8">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 sticky top-0 z-10 border-b">
              <div className="flex justify-between items-center">
                <CardTitle>Detalles de Incidencia</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowDetailModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {incidencia.numero} - {incidencia.clase_incidencia}
                </div>
                <div className="text-xl font-semibold text-slate-700 dark:text-slate-300">
                  {incidencia.nombre_tienda}
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{incidencia.nombre_cliente}</div>
                <div className="flex items-center justify-center gap-2 text-lg font-medium text-slate-700 dark:text-slate-300">
                  <Phone className="h-5 w-5" />
                  {incidencia.telefono_cliente}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 overflow-y-auto max-h-[calc(95vh-200px)] sm:max-h-[calc(90vh-200px)]">
              {/* Warning for old incidencias */}
              {isOldIncidencia && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg dark:bg-orange-900/20">
                  <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">
                      Atención: Esta incidencia tiene más de 7 días desde su fecha de alta
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium">Fecha:</span>
                    <span className="font-bold">{new Date(incidencia.fecha).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        incidencia.tipo_estado === "NO ASIGNADO"
                          ? "bg-orange-100 text-orange-800 border-orange-300"
                          : ""
                      }
                    >
                      {incidencia.tipo_estado}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium">Proveedor:</span>
                    <span className="font-bold">{incidencia.nombre_proveedor}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium">Cliente:</span>
                    <span className="font-bold">{incidencia.cliente}</span>
                  </div>
                  {incidencia.fecha_alta && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-medium">Fecha Alta:</span>
                      <span className="font-bold">{new Date(incidencia.fecha_alta).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description and Solution */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Descripción:</h4>
                  <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                    {incidencia.descripcion || "No hay descripción disponible"}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Solución:</h4>
                  <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                    {incidencia.solucion || "No hay solución registrada"}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Acciones de Aviso al Cliente</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button
                    onClick={() => handleActionClick("VISITA_CLIENTE")}
                    className="h-auto p-4 flex flex-col items-center gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <User className="h-6 w-6" />
                    <span className="font-medium">VISITA CLIENTE</span>
                    <span className="text-xs opacity-90">Programar visita técnica</span>
                  </Button>

                  <Button
                    onClick={() => handleActionClick("RECOGIDA_CLIENTE")}
                    className="h-auto p-4 flex flex-col items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Package className="h-6 w-6" />
                    <span className="font-medium">RECOGIDA CLIENTE</span>
                    <span className="text-xs opacity-90">Coordinar recogida</span>
                  </Button>

                  <Button
                    onClick={() => handleActionClick("RECOGIDA_PROVEEDOR")}
                    className="h-auto p-4 flex flex-col items-center gap-2 bg-orange-600 hover:bg-orange-700"
                  >
                    <Building className="h-6 w-6" />
                    <span className="font-medium">RECOGIDA PROVEEDOR</span>
                    <span className="text-xs opacity-90">Avisar al proveedor</span>
                  </Button>

                  <Button
                    onClick={() => handleActionClick("CAMBIO_PROVEEDOR")}
                    className="h-auto p-4 flex flex-col items-center gap-2 bg-purple-600 hover:bg-purple-700"
                  >
                    <Wrench className="h-6 w-6" />
                    <span className="font-medium">CAMBIO PROVEEDOR</span>
                    <span className="text-xs opacity-90">Gestión con proveedor</span>
                  </Button>

                  <Button
                    onClick={() => handleActionClick("REPARACION")}
                    className="h-auto p-4 flex flex-col items-center gap-2 bg-red-600 hover:bg-red-700"
                  >
                    <Wrench className="h-6 w-6" />
                    <span className="font-medium">REPARACIÓN</span>
                    <span className="text-xs opacity-90">Envío a reparación</span>
                  </Button>

                  <Button
                    onClick={() => handleActionClick("ENTREGA_CLIENTE")}
                    className="h-auto p-4 flex flex-col items-center gap-2 bg-teal-600 hover:bg-teal-700"
                  >
                    <Package className="h-6 w-6" />
                    <span className="font-medium">ENTREGA CLIENTE</span>
                    <span className="text-xs opacity-90">Producto listo</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
