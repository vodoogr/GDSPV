"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Download, CheckCircle, Trash2, AlertTriangle, Zap, Clock, StopCircle, Calendar } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"

interface CSVImporterProps {
  title: string
  description: string
  tableName: string
  requiredColumns: string[]
  columnMapping: Record<string, string>
  onImportComplete?: () => void
}

export default function CSVImporter({
  title,
  description,
  tableName,
  requiredColumns,
  columnMapping,
  onImportComplete,
}: CSVImporterProps) {
  const [csvData, setCsvData] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [importStats, setImportStats] = useState({
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    duplicates: 0,
    speed: 0,
    elapsedTime: 0,
    estimatedTimeRemaining: 0,
  })
  const [importStartTime, setImportStartTime] = useState<number | null>(null)
  const [loadStartTime, setLoadStartTime] = useState<number | null>(null)
  const [shouldStop, setShouldStop] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Función optimizada para procesar CSV en chunks
  const processCSVInChunks = useCallback(
    async (text: string) => {
      const lines = text.split("\n")
      const headers = lines[0].split(";").map((h) => h.trim())

      // Validar headers
      const missingHeaders = requiredColumns.filter((h) => !headers.includes(h))
      if (missingHeaders.length > 0) {
        throw new Error(`Faltan columnas requeridas: ${missingHeaders.join(", ")}`)
      }

      const dataLines = lines.slice(1).filter((line) => line.trim())
      const totalLines = dataLines.length
      const chunkSize = 1000 // Procesar 1000 líneas a la vez
      const processedData: any[] = []

      for (let i = 0; i < totalLines; i += chunkSize) {
        if (shouldStop) {
          throw new Error("Carga cancelada por el usuario")
        }

        const chunk = dataLines.slice(i, i + chunkSize)

        // Procesar chunk
        const chunkData = chunk.map((line) => {
          const values = line.split(";")
          const row: any = {}
          headers.forEach((header, index) => {
            row[header] = values[index]?.trim() || ""
          })
          return row
        })

        processedData.push(...chunkData)

        // Actualizar progreso
        const progress = Math.min(100, Math.round(((i + chunkSize) / totalLines) * 100))
        setLoadingProgress(progress)

        // Permitir que la UI se actualice
        await new Promise((resolve) => setTimeout(resolve, 1))
      }

      return processedData
    },
    [requiredColumns, shouldStop],
  )

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setLoadingProgress(0)
    setShouldStop(false)
    setLoadStartTime(Date.now())

    // Reset stats
    setImportStats({
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
      duplicates: 0,
      speed: 0,
      elapsedTime: 0,
      estimatedTimeRemaining: 0,
    })
    setImportProgress(0)

    try {
      toast({
        title: "Cargando archivo",
        description: "Procesando archivo CSV desde ExpoWin...",
      })

      // Usar FileReader con ArrayBuffer para mejor rendimiento
      const arrayBuffer = await file.arrayBuffer()
      const decoder = new TextDecoder("utf-8")
      const text = decoder.decode(arrayBuffer)

      // Procesar en chunks para archivos grandes
      const data = await processCSVInChunks(text)

      const loadTime = ((Date.now() - (loadStartTime || 0)) / 1000).toFixed(1)

      setCsvData(data)
      setImportStats((prev) => ({ ...prev, total: data.length }))

      toast({
        title: "✅ Archivo cargado",
        description: `${data.length} registros procesados en ${loadTime}s`,
      })
    } catch (error: any) {
      console.error("Error parsing CSV:", error)
      toast({
        title: "Error al procesar el archivo",
        description: error.message || "El formato del archivo no es válido",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setLoadingProgress(0)
      setShouldStop(false)
      setLoadStartTime(null)
    }
  }

  const stopLoading = () => {
    setShouldStop(true)
    toast({
      title: "Deteniendo carga",
      description: "La carga se detendrá en el siguiente chunk...",
    })
  }

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr || dateStr.trim() === "") return null

    const cleanDateStr = dateStr.trim()

    // Intentar varios formatos de fecha incluyendo DD/MM/YYYY HH:mm:ss y DD/MM/YYYY HH:mm de ExpoWin
    const formats = [
      // DD/MM/YYYY HH:mm:ss (formato ExpoWin completo para fecha_alta)
      {
        regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/,
        parse: (m: RegExpMatchArray) => {
          const day = m[1].padStart(2, "0")
          const month = m[2].padStart(2, "0")
          const year = m[3]
          const hour = m[4].padStart(2, "0")
          const minute = m[5].padStart(2, "0")
          const second = m[6].padStart(2, "0")

          const monthNum = Number.parseInt(month)
          const dayNum = Number.parseInt(day)

          if (monthNum < 1 || monthNum > 12) return null
          if (dayNum < 1 || dayNum > 31) return null

          // IMPORTANTE: Devolver como TIMESTAMP completo para PostgreSQL
          return `${year}-${month}-${day} ${hour}:${minute}:${second}`
        },
      },
      // DD/MM/YYYY HH:mm (formato ExpoWin sin segundos) - CORREGIDO PARA TU CASO
      {
        regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})$/,
        parse: (m: RegExpMatchArray) => {
          const day = m[1].padStart(2, "0")
          const month = m[2].padStart(2, "0")
          const year = m[3]
          const hour = m[4].padStart(2, "0")
          const minute = m[5].padStart(2, "0")

          const monthNum = Number.parseInt(month)
          const dayNum = Number.parseInt(day)

          if (monthNum < 1 || monthNum > 12) return null
          if (dayNum < 1 || dayNum > 31) return null

          // IMPORTANTE: Devolver como TIMESTAMP completo con segundos en 00
          return `${year}-${month}-${day} ${hour}:${minute}:00`
        },
      },
      // DD/MM/YYYY (solo fecha)
      {
        regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        parse: (m: RegExpMatchArray) => {
          const day = m[1].padStart(2, "0")
          const month = m[2].padStart(2, "0")
          const year = m[3]

          const monthNum = Number.parseInt(month)
          const dayNum = Number.parseInt(day)

          if (monthNum < 1 || monthNum > 12) return null
          if (dayNum < 1 || dayNum > 31) return null

          return `${year}-${month}-${day}`
        },
      },
      // DD-MM-YYYY
      {
        regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
        parse: (m: RegExpMatchArray) => {
          const day = m[1].padStart(2, "0")
          const month = m[2].padStart(2, "0")
          const year = m[3]

          const monthNum = Number.parseInt(month)
          const dayNum = Number.parseInt(day)

          if (monthNum < 1 || monthNum > 12) return null
          if (dayNum < 1 || dayNum > 31) return null

          return `${year}-${month}-${day}`
        },
      },
      // YYYY-MM-DD (ya en formato correcto)
      {
        regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
        parse: (m: RegExpMatchArray) => {
          const year = m[1]
          const month = m[2].padStart(2, "0")
          const day = m[3].padStart(2, "0")

          const monthNum = Number.parseInt(month)
          const dayNum = Number.parseInt(day)

          if (monthNum < 1 || monthNum > 12) return null
          if (dayNum < 1 || dayNum > 31) return null

          return `${year}-${month}-${day}`
        },
      },
    ]

    for (const format of formats) {
      const match = cleanDateStr.match(format.regex)
      if (match) {
        const result = format.parse(match)
        if (result) {
          try {
            // Validar fecha/timestamp
            const testDate = new Date(result.includes(" ") ? result : result + "T00:00:00.000Z")
            if (!isNaN(testDate.getTime())) {
              return result
            }
          } catch (error) {
            console.warn(`Error validando fecha parseada: ${result}`)
          }
        }
      }
    }

    return null
  }

  // Optimizar verificación de duplicados con batch queries
  const checkDuplicatesBatch = async (dataToCheck: any[]) => {
    const supabase = createClient()
    const duplicates: any[] = []
    const unique: any[] = []

    if (tableName === "incidencias") {
      // Obtener todos los números y clases existentes de una vez
      const numbers = dataToCheck.map((item) => item.numero).filter(Boolean)
      const classes = dataToCheck.map((item) => item.clase_incidencia).filter(Boolean)

      const { data: existing } = await supabase
        .from("incidencias")
        .select("numero, clase_incidencia")
        .in("numero", numbers)
        .in("clase_incidencia", classes)

      const existingSet = new Set(existing?.map((item) => `${item.numero}-${item.clase_incidencia}`) || [])

      dataToCheck.forEach((item) => {
        const key = `${item.numero}-${item.clase_incidencia}`
        if (existingSet.has(key)) {
          duplicates.push(item)
        } else {
          unique.push(item)
        }
      })
    } else if (tableName === "incidencias_recibidas") {
      // Similar para incidencias_recibidas
      const numbers = dataToCheck.map((item) => item.numero).filter(Boolean)
      const codes = dataToCheck.map((item) => item.codigo_incidencia).filter(Boolean)

      const { data: existing } = await supabase
        .from("incidencias_recibidas")
        .select("numero, codigo_incidencia")
        .in("numero", numbers)
        .in("codigo_incidencia", codes)

      const existingSet = new Set(existing?.map((item) => `${item.numero}-${item.codigo_incidencia}`) || [])

      dataToCheck.forEach((item) => {
        const key = `${item.numero}-${item.codigo_incidencia}`
        if (existingSet.has(key)) {
          duplicates.push(item)
        } else {
          unique.push(item)
        }
      })
    } else {
      // Si no hay lógica específica, todos son únicos
      unique.push(...dataToCheck)
    }

    return { duplicates, unique }
  }

  const updateImportStats = useCallback(
    (processed: number, success: number, failed: number, duplicates: number) => {
      const now = Date.now()
      const elapsedSeconds = importStartTime ? (now - importStartTime) / 1000 : 0
      const speed = elapsedSeconds > 0 ? Math.round(processed / elapsedSeconds) : 0

      // Calcular tiempo estimado restante
      const remaining = csvData.length - processed
      const estimatedTimeRemaining = speed > 0 ? Math.round(remaining / speed) : 0

      setImportStats({
        total: csvData.length,
        processed,
        success,
        failed,
        duplicates,
        speed,
        elapsedTime: Math.round(elapsedSeconds),
        estimatedTimeRemaining,
      })

      const progress = Math.round((processed / csvData.length) * 100)
      setImportProgress(progress)
    },
    [importStartTime, csvData.length],
  )

  const saveToDatabase = async () => {
    if (csvData.length === 0) return

    setImporting(true)
    setImportProgress(0)
    setImportStartTime(Date.now())
    setShouldStop(false)

    try {
      const supabase = createClient()
      let processed = 0
      let success = 0
      let failed = 0
      let duplicates = 0

      // Aumentar tamaño de lote para mejor rendimiento
      const batchSize = 500 // Aumentado de 50 a 500
      const totalBatches = Math.ceil(csvData.length / batchSize)

      for (let i = 0; i < totalBatches; i++) {
        if (shouldStop) {
          toast({
            title: "Importación detenida",
            description: `Proceso detenido después de procesar ${processed} registros`,
          })
          break
        }

        const start = i * batchSize
        const end = Math.min(start + batchSize, csvData.length)
        const batch = csvData.slice(start, end)

        const dataToInsert = batch.map((row) => {
          const mappedData: Record<string, any> = {}

          // Aplicar mapeo de columnas
          Object.entries(columnMapping).forEach(([csvColumn, dbColumn]) => {
            const value = row[csvColumn]?.trim() || ""

            // Manejar fechas (especial para fecha_alta que viene con hora de ExpoWin)
            if (dbColumn.includes("fecha") || dbColumn.includes("date")) {
              const parsedDate = parseDate(value)
              mappedData[dbColumn] = parsedDate

              // DEBUG: Log para fecha_alta específicamente
              if (dbColumn === "fecha_alta" && parsedDate) {
                console.log(`DEBUG fecha_alta: "${value}" → "${parsedDate}"`)
              }
            }
            // Manejar números enteros
            else if (dbColumn.includes("ejercicio") || dbColumn.includes("duracion") || dbColumn === "cantidad") {
              if (value && !isNaN(Number.parseInt(value))) {
                mappedData[dbColumn] = Number.parseInt(value)
              } else {
                mappedData[dbColumn] = null
              }
            }
            // Manejar números decimales
            else if (dbColumn.includes("coste") || dbColumn.includes("gastos")) {
              if (value && !isNaN(Number.parseFloat(value))) {
                mappedData[dbColumn] = Number.parseFloat(value)
              } else {
                mappedData[dbColumn] = null
              }
            }
            // Manejar booleanos
            else if (dbColumn === "resuelto") {
              mappedData[dbColumn] = value.toLowerCase() === "true" || value === "1" || value.toLowerCase() === "sí"
            }
            // Manejar strings
            else {
              mappedData[dbColumn] = value || null
            }
          })

          // Añadir fecha de importación
          if (tableName === "incidencias_recibidas") {
            mappedData.fecha_importacion = new Date().toISOString().split("T")[0]
          } else if (tableName === "incidencias") {
            mappedData.fecha_importacion = new Date().toISOString().split("T")[0]
          }

          return mappedData
        })

        // Verificar duplicados con método optimizado
        const { duplicates: batchDuplicates, unique: batchUnique } = await checkDuplicatesBatch(dataToInsert)
        duplicates += batchDuplicates.length

        // Solo insertar los únicos
        if (batchUnique.length > 0) {
          const { data, error } = await supabase.from(tableName).insert(batchUnique).select()

          if (error) {
            console.error(`Error saving batch to ${tableName}:`, error)
            failed += batchUnique.length
          } else {
            success += data.length
          }
        }

        processed += batch.length
        updateImportStats(processed, success, failed, duplicates)

        // Reducir pausa para mayor velocidad
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      const elapsedTime = ((Date.now() - (importStartTime || 0)) / 1000).toFixed(1)

      toast({
        title: shouldStop ? "🛑 Importación detenida" : "🚀 Importación completada",
        description: `${success} registros importados, ${failed} fallidos, ${duplicates} duplicados omitidos en ${elapsedTime}s`,
        variant: success > 0 ? "default" : "destructive",
      })

      // Limpiar datos
      if (success > 0) {
        setCsvData([])
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }

        // Notificar que la importación se completó
        if (onImportComplete) {
          onImportComplete()
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
      setImportStartTime(null)
      setShouldStop(false)
    }
  }

  const stopImport = () => {
    setShouldStop(true)
    toast({
      title: "Deteniendo importación",
      description: "La importación se detendrá después del lote actual...",
    })
  }

  const deleteAllRecords = async () => {
    setDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from(tableName).delete().neq("id", 0)

      if (error) {
        toast({
          title: "Error al eliminar",
          description: `Error: ${error.message}`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Eliminación completada",
          description: `Todos los registros de ${tableName} han sido eliminados`,
        })

        if (onImportComplete) {
          onImportComplete()
        }
      }
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error al eliminar",
        description: "Ocurrió un error durante la eliminación",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className="space-y-4">
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            {title}{" "}
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Optimizado
            </Badge>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Formato ExpoWin */}
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span className="font-medium text-sm">Formato CSV requerido:</span>
              </div>
              <code className="text-xs bg-white dark:bg-slate-900 p-2 rounded block">
                Clase Incidencia;Numero;Estado;Tipo de Estado;Fecha;Tienda;Nombre Tienda;Proveedor;Nombre
                proveedor;Marca;Teléfono;Fax;Duración Abierta;Cliente;Nombre Cliente;Teléfono;Camion;Vendedor;Nombre
                vendedor;Ejercicio Pedido;Serie Pedido;Pedido;Referencia;Ejercicio Albarán;Serie
                Albarán;Albarán;Artículo;Descripción;Descripción2;Referencia;Cantidad;Tipo;Gravedad;Última
                Recepción;Resuelto;Fecha Resuelto;Solución;Fecha de Alta;Gastos Asociados;Coste;
              </code>
              <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <p>• Separador: punto y coma (;)</p>
                <p>• Formatos de fecha: DD/MM/YYYY, DD/MM/YYYY HH:mm:ss (fecha_alta), YYYY-MM-DD</p>
                <p>• Origen: ExpoWin → Incidencias Detalladas</p>
                <p>• Los duplicados se omitirán automáticamente</p>
                <p>
                  • <strong>IMPORTANTE:</strong> fecha_alta debe incluir hora (DD/MM/YYYY HH:mm)
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="cursor-pointer"
                  ref={fileInputRef}
                  disabled={importing || isLoading}
                />
              </div>
              {(isLoading || importing) && (
                <Button
                  variant="destructive"
                  onClick={isLoading ? stopLoading : stopImport}
                  className="flex items-center gap-2"
                >
                  <StopCircle className="h-4 w-4" />
                  Parar
                </Button>
              )}
              <Button
                variant="destructive"
                onClick={() => setShowDeleteModal(true)}
                disabled={deleting || importing || isLoading}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar Todo
              </Button>
            </div>

            {/* Estadísticas en tiempo real - Contenedor visual */}
            {(isLoading || importing || importStats.total > 0) && (
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-green-600" />
                    Estadísticas en Tiempo Real
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Progreso de carga */}
                    {isLoading && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium flex items-center gap-2">
                            <Zap className="h-4 w-4 text-yellow-500" />
                            Cargando archivo desde ExpoWin...
                          </span>
                          <span className="text-sm font-bold">{loadingProgress}%</span>
                        </div>
                        <Progress value={loadingProgress} className="h-3" />
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          Procesando en chunks optimizados para máximo rendimiento
                        </div>
                      </div>
                    )}

                    {/* Progreso de importación */}
                    {importing && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium flex items-center gap-2">
                            <Download className="h-4 w-4 text-blue-500" />
                            Importando a base de datos...
                          </span>
                          <span className="text-sm font-bold">{importProgress}%</span>
                        </div>
                        <Progress value={importProgress} className="h-3" />
                      </div>
                    )}

                    {/* Métricas detalladas */}
                    {importStats.total > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {importStats.processed}
                          </div>
                          <div className="text-xs text-slate-500">Procesados</div>
                          <div className="text-xs text-slate-400">de {importStats.total}</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-green-600">{importStats.success}</div>
                          <div className="text-xs text-green-700 dark:text-green-300">Éxito</div>
                          <div className="text-xs text-green-500">
                            {((importStats.success / importStats.total) * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-red-600">{importStats.failed}</div>
                          <div className="text-xs text-red-700 dark:text-red-300">Fallidos</div>
                          <div className="text-xs text-red-500">
                            {((importStats.failed / importStats.total) * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-orange-600">{importStats.duplicates}</div>
                          <div className="text-xs text-orange-700 dark:text-orange-300">Duplicados</div>
                          <div className="text-xs text-orange-500">
                            {((importStats.duplicates / importStats.total) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Métricas de rendimiento */}
                    {importing && importStats.speed > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
                          <div className="text-xl font-bold text-blue-600">{importStats.speed}</div>
                          <div className="text-xs text-blue-700 dark:text-blue-300">registros/segundo</div>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg text-center">
                          <div className="text-xl font-bold text-purple-600">{formatTime(importStats.elapsedTime)}</div>
                          <div className="text-xs text-purple-700 dark:text-purple-300">tiempo transcurrido</div>
                        </div>
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg text-center">
                          <div className="text-xl font-bold text-indigo-600">
                            {formatTime(importStats.estimatedTimeRemaining)}
                          </div>
                          <div className="text-xs text-indigo-700 dark:text-indigo-300">tiempo estimado restante</div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {csvData.length > 0 && !importing && !isLoading && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium text-green-900 dark:text-green-100 flex items-center gap-2">
                        Archivo ExpoWin cargado correctamente
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          {csvData.length} registros
                        </Badge>
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-300">
                        Listo para importación rápida con verificación de duplicados
                      </div>
                    </div>
                  </div>
                  <Button onClick={saveToDatabase} disabled={importing} className="bg-green-600 hover:bg-green-700">
                    <Download className="h-4 w-4 mr-2" />
                    Importar Datos
                  </Button>
                </div>

                {/* Preview Table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-800 p-3 border-b">
                    <h4 className="font-medium">Vista previa (primeros 10 registros)</h4>
                  </div>
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-700 sticky top-0">
                        <tr>
                          {Object.keys(columnMapping).map((header) => (
                            <th key={header} className="text-left p-3 border-r font-medium">
                              {header}
                              {header.includes("Alta") && (
                                <Badge variant="outline" className="ml-1 text-xs bg-blue-50 text-blue-700">
                                  TIMESTAMP
                                </Badge>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(0, 10).map((row, index) => (
                          <tr key={index} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800">
                            {Object.keys(columnMapping).map((header) => {
                              const value = row[header]
                              const dbColumn = columnMapping[header]

                              // Mostrar fechas parseadas en la preview
                              if (dbColumn.includes("fecha") || dbColumn.includes("date")) {
                                const parsedDate = parseDate(value)
                                const isTimestamp = parsedDate && parsedDate.includes(" ")

                                return (
                                  <td key={header} className="p-3 border-r">
                                    <div>
                                      <div className="text-slate-900 dark:text-slate-100">{value || "-"}</div>
                                      {value && (
                                        <div className={`text-xs ${parsedDate ? "text-green-600" : "text-red-600"}`}>
                                          {parsedDate || "Fecha inválida"}
                                          {isTimestamp && (
                                            <Badge variant="outline" className="ml-1 text-xs bg-blue-50 text-blue-700">
                                              TIMESTAMP
                                            </Badge>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                )
                              }

                              return (
                                <td key={header} className="p-3 border-r">
                                  {value?.substring(0, 50) || "-"}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {csvData.length > 10 && (
                      <div className="p-3 text-center text-sm text-slate-500 bg-slate-50 dark:bg-slate-800 border-t">
                        ... y {csvData.length - 10} registros más
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Confirmar Eliminación
              </CardTitle>
              <CardDescription>
                Esta acción eliminará permanentemente todos los registros de la tabla {tableName}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800 mb-4">
                <p className="text-red-700 dark:text-red-400 text-sm">
                  ⚠️ Esta acción no se puede deshacer. Todos los datos serán eliminados permanentemente.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowDeleteModal(false)}>
                  Cancelar
                </Button>
                <Button variant="destructive" className="flex-1" onClick={deleteAllRecords} disabled={deleting}>
                  {deleting ? "Eliminando..." : "Eliminar Todo"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
