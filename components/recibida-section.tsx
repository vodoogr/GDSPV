"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Upload,
  FileText,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Trash2,
  X,
  Database,
} from "lucide-react"
import { createClient } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"

interface IncidenciaRecibida {
  id: number
  documento: string
  numero: string
  fecha: string
  f_serv: string
  cliente: string
  c_postal: string
  poblacion: string
  ruta: string
  fecha_recepcion: string
  fecha_incidencia: string
  telefono1: string
  telefono2: string
  incidencia: string
  codigo_incidencia: string
  dias_diferencia: number
  es_critica: boolean
  es_reciente: boolean
  fecha_importacion: string
}

export default function RecibidaSection() {
  const [activeTab, setActiveTab] = useState("existing")
  const [incidenciasRecibidas, setIncidenciasRecibidas] = useState<IncidenciaRecibida[]>([])
  const [filteredIncidencias, setFilteredIncidencias] = useState<IncidenciaRecibida[]>([])
  const [csvData, setCsvData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importStats, setImportStats] = useState({
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    duplicates: 0,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Eliminación masiva
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState(0)
  const [deleteStats, setDeleteStats] = useState({
    total: 0,
    deleted: 0,
    remaining: 0,
    attempts: 0,
    maxAttempts: 3,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteStep, setDeleteStep] = useState("")
  const stopRequestedRef = useRef(false)

  // Filters
  const [filterCodigo, setFilterCodigo] = useState("all")
  const [filterFechaRecepcion, setFilterFechaRecepcion] = useState("")
  const [filterFechaIncidencia, setFilterFechaIncidencia] = useState("")
  const [filterRuta, setFilterRuta] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    criticas: 0,
    recientes: 0,
    promedioDias: 0,
  })

  useEffect(() => {
    loadIncidenciasRecibidas()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [incidenciasRecibidas, filterCodigo, filterFechaRecepcion, filterFechaIncidencia, filterRuta, searchTerm])

  const loadIncidenciasRecibidas = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Verificar que la tabla existe
      const { data, error } = await supabase
        .from("incidencias_recibidas")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error loading incidencias recibidas:", error)
        // Si la tabla no existe, mostrar mensaje amigable
        if (error.message.includes("does not exist")) {
          toast({
            title: "Error de base de datos",
            description: "La tabla 'incidencias_recibidas' no existe. Por favor, ejecuta el script de configuración.",
            variant: "destructive",
          })
        }
      } else {
        setIncidenciasRecibidas(data || [])
        calculateStats(data || [])
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data: IncidenciaRecibida[]) => {
    const total = data.length
    const criticas = data.filter((i) => i.es_critica).length
    const recientes = data.filter((i) => i.es_reciente).length
    const promedioDias =
      data.length > 0 ? Math.round(data.reduce((sum, i) => sum + (i.dias_diferencia || 0), 0) / data.length) : 0

    setStats({ total, criticas, recientes, promedioDias })
  }

  const applyFilters = () => {
    let filtered = [...incidenciasRecibidas]

    if (filterCodigo !== "all") {
      filtered = filtered.filter((i) => i.codigo_incidencia === filterCodigo)
    }
    if (filterFechaRecepcion) {
      filtered = filtered.filter((i) => i.fecha_recepcion === filterFechaRecepcion)
    }
    if (filterFechaIncidencia) {
      filtered = filtered.filter((i) => i.fecha_incidencia === filterFechaIncidencia)
    }
    if (filterRuta !== "all") {
      filtered = filtered.filter((i) => i.ruta === filterRuta)
    }
    if (searchTerm) {
      filtered = filtered.filter(
        (i) =>
          i.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.incidencia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.poblacion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.codigo_incidencia?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    setFilteredIncidencias(filtered)
    calculateStats(filtered)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Reset stats
    setImportStats({
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
      duplicates: 0,
    })
    setImportProgress(0)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split("\n").filter((line) => line.trim())
        const headers = lines[0].split(";").map((h) => h.trim())

        // Validar encabezados mínimos requeridos
        const requiredHeaders = ["DOCUMENTO", "NUMERO", "CLIENTE", "CODIGO_INCIDENCIA"]
        const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))

        if (missingHeaders.length > 0) {
          toast({
            title: "Error en formato CSV",
            description: `Faltan columnas requeridas: ${missingHeaders.join(", ")}`,
            variant: "destructive",
          })
          return
        }

        const data = lines.slice(1).map((line) => {
          const values = line.split(";")
          const row: any = {}
          headers.forEach((header, index) => {
            row[header] = values[index]?.trim() || ""
          })
          return row
        })

        setCsvData(data)
        setImportStats((prev) => ({ ...prev, total: data.length }))
        toast({
          title: "CSV cargado correctamente",
          description: `${data.length} registros encontrados en el archivo`,
        })
      } catch (error) {
        console.error("Error parsing CSV:", error)
        toast({
          title: "Error al procesar el archivo",
          description: "El formato del archivo no es válido",
          variant: "destructive",
        })
      }
    }
    reader.readAsText(file)
  }

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null

    // Intentar varios formatos de fecha
    const formats = [
      // DD/MM/YYYY
      {
        regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        parse: (m: RegExpMatchArray) => `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`,
      },
      // YYYY-MM-DD
      {
        regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
        parse: (m: RegExpMatchArray) => `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`,
      },
      // DD-MM-YYYY
      {
        regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
        parse: (m: RegExpMatchArray) => `${m[4]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`,
      },
    ]

    for (const format of formats) {
      const match = dateStr.match(format.regex)
      if (match) {
        return format.parse(match)
      }
    }

    return null
  }

  const saveToDatabase = async () => {
    if (csvData.length === 0) return

    setImporting(true)
    setImportProgress(0)

    try {
      const supabase = createClient()
      let processed = 0
      let success = 0
      let failed = 0
      let duplicates = 0

      // Procesar en lotes de 50 para mejor rendimiento y feedback
      const batchSize = 50
      const totalBatches = Math.ceil(csvData.length / batchSize)

      for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize
        const end = Math.min(start + batchSize, csvData.length)
        const batch = csvData.slice(start, end)

        const dataToInsert = batch.map((row) => {
          // Parsear fechas
          const fechaStr = parseDate(row.FECHA)
          const fechaRecepcionStr = parseDate(row.FECHA_RECEPCION)
          const fechaIncidenciaStr = parseDate(row.FECHA_INCIDENCIA)
          const fServStr = parseDate(row.F_SERV_)

          return {
            documento: row.DOCUMENTO || "",
            numero: row.NUMERO || "",
            fecha: fechaStr,
            f_serv: fServStr,
            cliente: row.CLIENTE || "",
            c_postal: row.C_POSTAL || "",
            poblacion: row.POBLACIÓN || "",
            ruta: row.RUTA || "",
            fecha_recepcion: fechaRecepcionStr,
            fecha_incidencia: fechaIncidenciaStr,
            telefono1: row.TELEFONO1 || "",
            telefono2: row.TELEFONO2 || "",
            incidencia: row.INCIDENCIA || "",
            codigo_incidencia: row.CODIGO_INCIDENCIA || "",
            fecha_importacion: new Date().toISOString().split("T")[0],
          }
        })

        // Verificar duplicados antes de insertar
        for (const item of dataToInsert) {
          if (!item.numero || !item.codigo_incidencia) continue

          const { data: existingData } = await supabase
            .from("incidencias_recibidas")
            .select("id")
            .eq("numero", item.numero)
            .eq("codigo_incidencia", item.codigo_incidencia)
            .maybeSingle()

          if (existingData) {
            duplicates++
          }
        }

        // Insertar datos
        const { data, error } = await supabase.from("incidencias_recibidas").insert(dataToInsert).select()

        processed += batch.length

        if (error) {
          console.error("Error saving batch to database:", error)
          failed += batch.length
        } else {
          success += data.length
        }

        // Actualizar progreso
        const progress = Math.round((processed / csvData.length) * 100)
        setImportProgress(progress)
        setImportStats({
          total: csvData.length,
          processed,
          success,
          failed,
          duplicates,
        })

        // Pequeña pausa para no sobrecargar la UI
        await new Promise((resolve) => setTimeout(resolve, 50))
      }

      toast({
        title: "Importación completada",
        description: `${success} registros importados, ${failed} fallidos, ${duplicates} duplicados`,
        variant: success > 0 ? "default" : "destructive",
      })

      // Recargar datos
      if (success > 0) {
        loadIncidenciasRecibidas()
        setCsvData([])
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error al procesar los datos",
        description: "Ocurrió un error durante la importación",
        variant: "destructive",
      })
    } finally {
      setImporting(false)
    }
  }

  const startDeleteProcess = async () => {
    setIsDeleting(true)
    stopRequestedRef.current = false
    setDeleteProgress(0)
    setDeleteStep("Iniciando proceso de eliminación...")

    try {
      const supabase = createClient()

      // Contar registros totales
      const [{ count: totalIncidencias }, { count: totalComunicaciones }] = await Promise.all([
        supabase.from("incidencias_recibidas").select("*", { count: "exact", head: true }),
        supabase
          .from("comunicaciones")
          .select("*", { count: "exact", head: true })
          .catch(() => ({ count: 0 })),
      ])

      const total = (totalIncidencias || 0) + (totalComunicaciones || 0)

      setDeleteStats({
        total: total || 0,
        deleted: 0,
        remaining: total || 0,
        attempts: 0,
        maxAttempts: 3,
      })

      // Primero intentar eliminar comunicaciones
      if (totalComunicaciones && totalComunicaciones > 0) {
        setDeleteStep("Eliminando comunicaciones...")
        setDeleteProgress(10)

        // Intentar eliminar todo de una vez primero
        try {
          const { error } = await supabase.from("comunicaciones").delete().neq("id", 0)

          if (!error) {
            // Verificar si se eliminaron todas
            const { count: remainingComunicaciones } = await supabase
              .from("comunicaciones")
              .select("*", { count: "exact", head: true })

            if (remainingComunicaciones === 0) {
              setDeleteStats((prev) => ({
                ...prev,
                deleted: prev.deleted + (totalComunicaciones || 0),
                remaining: prev.remaining - (totalComunicaciones || 0),
              }))
              setDeleteProgress(40)
            } else {
              // Si quedan registros, eliminar por lotes
              await deleteByBatches("comunicaciones", totalComunicaciones || 0, 20, 50)
            }
          } else {
            // Si falla, eliminar por lotes
            await deleteByBatches("comunicaciones", totalComunicaciones || 0, 20, 50)
          }
        } catch (error) {
          console.error("Error eliminando comunicaciones:", error)
          await deleteByBatches("comunicaciones", totalComunicaciones || 0, 20, 50)
        }
      } else {
        setDeleteProgress(40)
      }

      // Verificar si se solicitó detener
      if (stopRequestedRef.current) {
        setDeleteStep("Proceso detenido por el usuario")
        return
      }

      // Luego eliminar incidencias recibidas
      if (totalIncidencias && totalIncidencias > 0) {
        setDeleteStep("Eliminando incidencias recibidas...")

        // Intentar eliminar todo de una vez primero
        try {
          const { error } = await supabase.from("incidencias_recibidas").delete().neq("id", 0)

          if (!error) {
            // Verificar si se eliminaron todas
            const { count: remainingIncidencias } = await supabase
              .from("incidencias_recibidas")
              .select("*", { count: "exact", head: true })

            if (remainingIncidencias === 0) {
              setDeleteStats((prev) => ({
                ...prev,
                deleted: prev.deleted + (totalIncidencias || 0),
                remaining: prev.remaining - (totalIncidencias || 0),
              }))
              setDeleteProgress(90)
            } else {
              // Si quedan registros, eliminar por lotes
              await deleteByBatches("incidencias_recibidas", totalIncidencias || 0, 50, 90)
            }
          } else {
            // Si falla, eliminar por lotes
            await deleteByBatches("incidencias_recibidas", totalIncidencias || 0, 50, 90)
          }
        } catch (error) {
          console.error("Error eliminando incidencias:", error)
          await deleteByBatches("incidencias_recibidas", totalIncidencias || 0, 50, 90)
        }
      } else {
        setDeleteProgress(90)
      }

      // Verificación final
      if (!stopRequestedRef.current) {
        setDeleteStep("Verificando eliminación completa...")
        setDeleteProgress(95)

        const [{ count: finalIncidencias }, { count: finalComunicaciones }] = await Promise.all([
          supabase.from("incidencias_recibidas").select("*", { count: "exact", head: true }),
          supabase
            .from("comunicaciones")
            .select("*", { count: "exact", head: true })
            .catch(() => ({ count: 0 })),
        ])

        const remaining = (finalIncidencias || 0) + (finalComunicaciones || 0)

        setDeleteStats((prev) => ({
          ...prev,
          remaining: remaining,
        }))

        if (remaining === 0) {
          setDeleteStep("¡Eliminación completada con éxito!")
          setDeleteProgress(100)
          toast({
            title: "Eliminación completada",
            description: `Se han eliminado ${total} registros correctamente`,
          })
        } else {
          setDeleteStep(`Eliminación parcial. Quedan ${remaining} registros.`)
          setDeleteProgress(Math.round(((total - remaining) / total) * 100))
          toast({
            title: "Eliminación parcial",
            description: `Se eliminaron ${total - remaining} de ${total} registros. Quedan ${remaining} registros.`,
            variant: "warning",
          })
        }
      }

      // Recargar datos
      loadIncidenciasRecibidas()
    } catch (error) {
      console.error("Error en proceso de eliminación:", error)
      setDeleteStep("Error en el proceso de eliminación")
      toast({
        title: "Error en la eliminación",
        description: "Ocurrió un error durante el proceso de eliminación",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const deleteByBatches = async (table: string, total: number, startProgress: number, endProgress: number) => {
    const supabase = createClient()
    const batchSize = 1000
    let deleted = 0
    let attempts = 0

    while (deleted < total && attempts < deleteStats.maxAttempts && !stopRequestedRef.current) {
      attempts++
      setDeleteStats((prev) => ({ ...prev, attempts }))

      try {
        // Obtener IDs en lotes
        const { data: ids } = await supabase.from(table).select("id").order("id", { ascending: true }).limit(batchSize)

        if (!ids || ids.length === 0) break

        // Eliminar por lotes usando IN
        const idList = ids.map((item) => item.id)
        const { error } = await supabase.from(table).delete().in("id", idList)

        if (error) {
          console.error(`Error eliminando lote de ${table}:`, error)

          // Si falla el lote, intentar uno por uno
          for (const item of ids) {
            if (stopRequestedRef.current) break

            await supabase.from(table).delete().eq("id", item.id)
            deleted++

            // Actualizar progreso cada 50 registros
            if (deleted % 50 === 0) {
              const progressPercent = startProgress + Math.round((deleted / total) * (endProgress - startProgress))
              setDeleteProgress(Math.min(progressPercent, endProgress - 1))
              setDeleteStats((prev) => ({
                ...prev,
                deleted: prev.deleted + 50,
                remaining: prev.remaining - 50,
              }))
            }
          }
        } else {
          // Actualizar contadores
          deleted += ids.length
          setDeleteStats((prev) => ({
            ...prev,
            deleted: prev.deleted + ids.length,
            remaining: prev.remaining - ids.length,
          }))

          // Actualizar progreso
          const progressPercent = startProgress + Math.round((deleted / total) * (endProgress - startProgress))
          setDeleteProgress(Math.min(progressPercent, endProgress - 1))
        }

        // Pequeña pausa para no sobrecargar la base de datos
        await new Promise((resolve) => setTimeout(resolve, 50))
      } catch (error) {
        console.error(`Error en lote de ${table}:`, error)
        // Esperar un poco más antes de reintentar
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
    }

    return deleted
  }

  const stopDeleteProcess = () => {
    stopRequestedRef.current = true
    setDeleteStep("Deteniendo proceso...")
  }

  const getUniqueValues = (field: keyof IncidenciaRecibida) => {
    return [...new Set(incidenciasRecibidas.map((i) => i[field]).filter(Boolean))]
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="existing">Incidencias Existentes</TabsTrigger>
          <TabsTrigger value="import">Importador CSV</TabsTrigger>
        </TabsList>

        <TabsContent value="existing" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-slate-600">Total</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">{stats.criticas}</div>
                <div className="text-sm text-slate-600">Críticas (+15 días)</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">{stats.recientes}</div>
                <div className="text-sm text-slate-600">Recientes (2 días)</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{stats.promedioDias}</div>
                <div className="text-sm text-slate-600">Promedio días</div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <Button variant="destructive" className="flex items-center gap-2" onClick={() => setShowDeleteModal(true)}>
              <Trash2 className="h-4 w-4" />
              Eliminar Todos los Registros
            </Button>

            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={loadIncidenciasRecibidas}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Select value={filterCodigo} onValueChange={setFilterCodigo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Código Incidencia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {getUniqueValues("codigo_incidencia").map((codigo) => (
                      <SelectItem key={codigo} value={codigo}>
                        {codigo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  placeholder="Fecha Recepción"
                  value={filterFechaRecepcion}
                  onChange={(e) => setFilterFechaRecepcion(e.target.value)}
                />

                <Input
                  type="date"
                  placeholder="Fecha Incidencia"
                  value={filterFechaIncidencia}
                  onChange={(e) => setFilterFechaIncidencia(e.target.value)}
                />

                <Select value={filterRuta} onValueChange={setFilterRuta}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ruta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {getUniqueValues("ruta").map((ruta) => (
                      <SelectItem key={ruta} value={ruta}>
                        {ruta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Incidencias Table */}
          <Card>
            <CardHeader>
              <CardTitle>Incidencias Recibidas</CardTitle>
              <CardDescription>{filteredIncidencias.length} incidencias encontradas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Código</th>
                      <th className="text-left p-2">Cliente</th>
                      <th className="text-left p-2">Población</th>
                      <th className="text-left p-2">Ruta</th>
                      <th className="text-left p-2">F. Recepción</th>
                      <th className="text-left p-2">F. Incidencia</th>
                      <th className="text-left p-2">Días Dif.</th>
                      <th className="text-left p-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="text-center p-4">
                          <div className="flex justify-center items-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>Cargando...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredIncidencias.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center p-4 text-slate-500">
                          No se encontraron incidencias
                        </td>
                      </tr>
                    ) : (
                      filteredIncidencias.map((incidencia) => (
                        <tr
                          key={incidencia.id}
                          className={`border-b hover:bg-slate-50 ${
                            incidencia.es_reciente ? "bg-orange-100 text-black font-medium" : ""
                          }`}
                        >
                          <td className="p-2">{incidencia.codigo_incidencia}</td>
                          <td className="p-2">{incidencia.cliente}</td>
                          <td className="p-2">{incidencia.poblacion}</td>
                          <td className="p-2">{incidencia.ruta}</td>
                          <td className="p-2">
                            {incidencia.fecha_recepcion
                              ? new Date(incidencia.fecha_recepcion).toLocaleDateString()
                              : "-"}
                          </td>
                          <td className="p-2">
                            {incidencia.fecha_incidencia
                              ? new Date(incidencia.fecha_incidencia).toLocaleDateString()
                              : "-"}
                          </td>
                          <td className="p-2">{incidencia.dias_diferencia || 0}</td>
                          <td className="p-2">
                            <div className="flex gap-1">
                              {incidencia.es_critica && (
                                <Badge variant="destructive" className="text-xs">
                                  Crítica
                                </Badge>
                              )}
                              {incidencia.es_reciente && (
                                <Badge variant="secondary" className="text-xs bg-orange-200 text-orange-800">
                                  Reciente
                                </Badge>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          {/* CSV Format Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Formato CSV Requerido
              </CardTitle>
              <CardDescription>El archivo CSV debe contener las siguientes columnas en este orden:</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                <code className="text-sm">
                  DOCUMENTO;NUMERO;FECHA;F_SERV_;CLIENTE;C_POSTAL;POBLACIÓN;RUTA;FECHA_RECEPCION;FECHA_INCIDENCIA;TELEFONO1;TELEFONO2;INCIDENCIA;CODIGO_INCIDENCIA
                </code>
              </div>
              <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                <p>• Separador: punto y coma (;)</p>
                <p>• Formato de fechas: DD/MM/YYYY o YYYY-MM-DD</p>
                <p>• Archivos soportados: .csv, .txt</p>
                <p>
                  • <strong>Campos obligatorios:</strong> DOCUMENTO, NUMERO, CLIENTE, CODIGO_INCIDENCIA
                </p>
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Importar Archivo CSV
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="cursor-pointer"
                  ref={fileInputRef}
                  disabled={importing}
                />

                {importing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Importando registros...</span>
                      <span>{importProgress}%</span>
                    </div>
                    <Progress value={importProgress} className="h-2" />
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>
                        Procesados: {importStats.processed}/{importStats.total}
                      </span>
                      <span>Éxito: {importStats.success}</span>
                      <span>Fallidos: {importStats.failed}</span>
                      <span>Duplicados: {importStats.duplicates}</span>
                    </div>
                  </div>
                )}

                {csvData.length > 0 && !importing && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{csvData.length} registros cargados</span>
                      <Button onClick={saveToDatabase} disabled={importing} className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        {importing ? "Guardando..." : "Guardar en Base de Datos"}
                      </Button>
                    </div>

                    {/* Preview Table */}
                    <div className="overflow-x-auto max-h-96 border rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                          <tr>
                            <th className="text-left p-2 border-r">Documento</th>
                            <th className="text-left p-2 border-r">Cliente</th>
                            <th className="text-left p-2 border-r">Población</th>
                            <th className="text-left p-2 border-r">Ruta</th>
                            <th className="text-left p-2 border-r">F. Recepción</th>
                            <th className="text-left p-2 border-r">F. Incidencia</th>
                            <th className="text-left p-2 border-r">Código</th>
                            <th className="text-left p-2">Incidencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvData.slice(0, 10).map((row, index) => (
                            <tr key={index} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800">
                              <td className="p-2 border-r">{row.DOCUMENTO}</td>
                              <td className="p-2 border-r">{row.CLIENTE}</td>
                              <td className="p-2 border-r">{row.POBLACIÓN}</td>
                              <td className="p-2 border-r">{row.RUTA}</td>
                              <td className="p-2 border-r">{row.FECHA_RECEPCION}</td>
                              <td className="p-2 border-r">{row.FECHA_INCIDENCIA}</td>
                              <td className="p-2 border-r">{row.CODIGO_INCIDENCIA}</td>
                              <td className="p-2">{row.INCIDENCIA?.substring(0, 50)}...</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {csvData.length > 10 && (
                        <div className="p-2 text-center text-sm text-slate-500 bg-slate-50 dark:bg-slate-800">
                          ... y {csvData.length - 10} registros más
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Eliminar Todos los Registros
              </CardTitle>
              <CardDescription>
                Esta acción eliminará permanentemente todos los registros de incidencias recibidas y comunicaciones.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isDeleting ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{deleteStep}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          <Database className="h-3 w-3 mr-1" />
                          Intento {deleteStats.attempts}/{deleteStats.maxAttempts}
                        </Badge>
                        {stopRequestedRef.current && (
                          <Badge variant="destructive">
                            <X className="h-3 w-3 mr-1" />
                            DETENIDO
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{deleteProgress}%</p>
                      <p className="text-xs text-slate-500">
                        {deleteStats.deleted}/{deleteStats.total} registros
                      </p>
                    </div>
                  </div>

                  <Progress value={deleteProgress} className="h-3" />

                  <div className="flex justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Eliminados: {deleteStats.deleted}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-orange-500" />
                      <span>Restantes: {deleteStats.remaining}</span>
                    </div>
                  </div>

                  {!stopRequestedRef.current && (
                    <Button variant="destructive" className="w-full mt-2" onClick={stopDeleteProcess}>
                      PARAR ELIMINACIÓN
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <p className="text-red-700 font-medium">¡Advertencia!</p>
                    <p className="text-red-600 text-sm mt-1">
                      Esta acción no se puede deshacer. Todos los datos serán eliminados permanentemente.
                    </p>
                  </div>

                  <div className="flex justify-between gap-4">
                    <Button variant="outline" className="w-full" onClick={() => setShowDeleteModal(false)}>
                      Cancelar
                    </Button>
                    <Button variant="destructive" className="w-full" onClick={startDeleteProcess}>
                      Eliminar Todo
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
            {isDeleting && deleteProgress === 100 && (
              <CardFooter className="flex justify-end">
                <Button onClick={() => setShowDeleteModal(false)}>Cerrar</Button>
              </CardFooter>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
