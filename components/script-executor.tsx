"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, XCircle, AlertTriangle, Database, Play, Clock, Copy } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"

interface ScriptResult {
  step: string
  status: "success" | "error" | "warning" | "info"
  message: string
  details?: any
  sqlCommand?: string
}

export default function ScriptExecutor() {
  const [executing, setExecuting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<ScriptResult[]>([])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copiado",
      description: "Comando SQL copiado al portapapeles",
    })
  }

  const executeScript = async () => {
    setExecuting(true)
    setProgress(0)
    setResults([])

    const supabase = createClient()
    const scriptResults: ScriptResult[] = []

    try {
      // Paso 1: Verificar el tipo actual de la columna fecha_alta
      setProgress(20)
      try {
        // Usar una consulta más simple que funcione en Supabase
        const { data, error } = await supabase
          .from("incidencias")
          .select("fecha_alta")
          .not("fecha_alta", "is", null)
          .limit(1)

        if (error) {
          scriptResults.push({
            step: "1. Verificar tabla incidencias",
            status: "error",
            message: `Error al acceder a la tabla: ${error.message}`,
          })
        } else {
          scriptResults.push({
            step: "1. Verificar tabla incidencias",
            status: "success",
            message: `Tabla incidencias accesible. Encontrados registros con fecha_alta.`,
            details: `Registros encontrados: ${data?.length || 0}`,
          })
        }
      } catch (error) {
        scriptResults.push({
          step: "1. Verificar tabla incidencias",
          status: "error",
          message: `Error inesperado: ${error}`,
        })
      }

      // Paso 2: Mostrar comando para cambiar tipo de datos
      setProgress(40)
      const alterTableCommand =
        "ALTER TABLE incidencias ALTER COLUMN fecha_alta TYPE TIMESTAMP USING fecha_alta::TIMESTAMP;"

      scriptResults.push({
        step: "2. Cambiar tipo a TIMESTAMP",
        status: "info",
        message: "Ejecuta este comando en Supabase SQL Editor para cambiar el tipo de datos:",
        sqlCommand: alterTableCommand,
        details: "Este comando convertirá la columna fecha_alta de DATE a TIMESTAMP para almacenar fecha y hora.",
      })

      // Paso 3: Mostrar comando para crear función
      setProgress(60)
      const createFunctionCommand = `CREATE OR REPLACE FUNCTION get_tiempo_promedio_apertura()
RETURNS TABLE(
    tiempo_promedio_horas NUMERIC,
    tiempo_promedio_dias NUMERIC,
    total_incidencias INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROUND(AVG(EXTRACT(EPOCH FROM (fecha_alta - fecha)) / 3600), 2) as tiempo_promedio_horas,
        ROUND(AVG(EXTRACT(EPOCH FROM (fecha_alta - fecha)) / 86400), 2) as tiempo_promedio_dias,
        COUNT(*)::INTEGER as total_incidencias
    FROM incidencias 
    WHERE fecha_alta IS NOT NULL 
    AND fecha IS NOT NULL
    AND fecha_alta > fecha;
END;
$$ LANGUAGE plpgsql;`

      scriptResults.push({
        step: "3. Crear función tiempo promedio",
        status: "info",
        message: "Ejecuta este comando en Supabase SQL Editor para crear la función:",
        sqlCommand: createFunctionCommand,
        details: "Esta función calculará el tiempo promedio entre la fecha de incidencia y la fecha de alta.",
      })

      // Paso 4: Verificar datos existentes
      setProgress(80)
      try {
        const { data, error } = await supabase
          .from("incidencias")
          .select("numero, clase_incidencia, fecha, fecha_alta")
          .not("fecha_alta", "is", null)
          .order("fecha_alta", { ascending: false })
          .limit(5)

        if (error) {
          scriptResults.push({
            step: "4. Verificar datos existentes",
            status: "warning",
            message: `Error al verificar datos: ${error.message}`,
          })
        } else {
          scriptResults.push({
            step: "4. Verificar datos existentes",
            status: "success",
            message: `Encontradas ${data?.length || 0} incidencias con fecha_alta`,
            details: data?.map((d) => `${d.numero} - ${d.fecha_alta}`).join(", ") || "Sin datos",
          })
        }
      } catch (error) {
        scriptResults.push({
          step: "4. Verificar datos existentes",
          status: "warning",
          message: `Error al verificar datos: ${error}`,
        })
      }

      // Paso 5: Instrucciones finales
      setProgress(100)
      scriptResults.push({
        step: "5. Instrucciones finales",
        status: "info",
        message: "Después de ejecutar los comandos SQL:",
        details:
          "1. Re-importa los datos CSV\n2. Verifica que fecha_alta incluye hora\n3. Comprueba el tiempo promedio en 'Buscar Incidencias'",
      })

      setResults(scriptResults)

      const successCount = scriptResults.filter((r) => r.status === "success").length
      const infoCount = scriptResults.filter((r) => r.status === "info").length
      const warningCount = scriptResults.filter((r) => r.status === "warning").length
      const errorCount = scriptResults.filter((r) => r.status === "error").length

      toast({
        title: "Análisis completado",
        description: `${successCount} verificaciones exitosas, ${infoCount} comandos preparados, ${warningCount} advertencias`,
        variant: errorCount > 0 ? "destructive" : "default",
      })
    } catch (error) {
      console.error("Error ejecutando análisis:", error)
      toast({
        title: "Error en análisis",
        description: "Ocurrió un error durante el análisis del sistema",
        variant: "destructive",
      })
    } finally {
      setExecuting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "info":
        return <Database className="h-4 w-4 text-blue-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      success: "default",
      error: "destructive",
      warning: "secondary",
      info: "outline",
    } as const

    const colors = {
      success: "bg-green-500",
      error: "",
      warning: "",
      info: "bg-blue-500 text-white",
    } as const

    return (
      <Badge
        variant={variants[status as keyof typeof variants] || "outline"}
        className={colors[status as keyof typeof colors] || ""}
      >
        {status.toUpperCase()}
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Configurador de TIMESTAMP para fecha_alta
        </CardTitle>
        <CardDescription>
          Analiza el sistema y proporciona los comandos SQL necesarios para actualizar fecha_alta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Este analizador te ayudará a:
          </h4>
          <ul className="text-sm space-y-1 text-blue-700 dark:text-blue-300">
            <li>• Verificar el estado actual de la tabla incidencias</li>
            <li>• Generar los comandos SQL exactos para ejecutar</li>
            <li>• Proporcionar instrucciones paso a paso</li>
            <li>• Verificar datos existentes</li>
          </ul>
        </div>

        <div className="flex justify-between items-center">
          <Button onClick={executeScript} disabled={executing} className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            {executing ? "Analizando..." : "Analizar Sistema"}
          </Button>

          {executing && (
            <div className="flex items-center gap-2">
              <span className="text-sm">{progress}%</span>
              <Progress value={progress} className="w-32" />
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Resultados del Análisis:</h3>
            {results.map((result, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <div className="font-medium">{result.step}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">{result.message}</div>
                    </div>
                  </div>
                  {getStatusBadge(result.status)}
                </div>

                {result.sqlCommand && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Comando SQL:</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(result.sqlCommand!)}
                        className="flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        Copiar
                      </Button>
                    </div>
                    <div className="bg-slate-900 text-green-400 p-3 rounded text-sm font-mono overflow-x-auto">
                      <pre>{result.sqlCommand}</pre>
                    </div>
                  </div>
                )}

                {result.details && !result.sqlCommand && (
                  <div className="text-xs text-slate-500 mt-2 bg-slate-50 dark:bg-slate-800 p-2 rounded">
                    <pre className="whitespace-pre-wrap">{result.details}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {results.some((r) => r.status === "info" && r.sqlCommand) && (
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <h4 className="font-medium mb-2 text-green-800 dark:text-green-200">
              ✅ Pasos para completar la configuración:
            </h4>
            <ol className="text-sm text-green-700 dark:text-green-300 space-y-1">
              <li>
                1. <strong>Abre Supabase Dashboard</strong> → Tu proyecto → SQL Editor
              </li>
              <li>
                2. <strong>Ejecuta los comandos SQL</strong> mostrados arriba (usa el botón "Copiar")
              </li>
              <li>
                3. <strong>Vuelve a la aplicación</strong> y re-importa tus datos CSV
              </li>
              <li>
                4. <strong>Verifica</strong> que el tiempo promedio aparece en "Buscar Incidencias"
              </li>
            </ol>
          </div>
        )}

        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
          <h4 className="font-medium mb-2">💡 Beneficios después de la configuración:</h4>
          <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <p>
              • <strong>fecha_alta</strong> almacenará fecha y hora completa (DD/MM/YYYY HH:mm:ss)
            </p>
            <p>
              • <strong>Tiempo promedio de apertura</strong> se calculará automáticamente
            </p>
            <p>
              • <strong>Métricas más precisas</strong> en el dashboard y búsquedas
            </p>
            <p>
              • <strong>Compatibilidad total</strong> con formato ExpoWin
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
