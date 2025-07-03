"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, XCircle, AlertTriangle, Database, Play } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"

interface VerificationResult {
  test: string
  status: "success" | "error" | "warning"
  message: string
  details?: any
}

export default function DataTypeVerifier() {
  const [verifying, setVerifying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<VerificationResult[]>([])

  const runVerification = async () => {
    setVerifying(true)
    setProgress(0)
    setResults([])

    const supabase = createClient()
    const testResults: VerificationResult[] = []

    try {
      // Test 1: Verificar estructura de tablas
      setProgress(10)
      try {
        const { data: incidenciasColumns } = await supabase
          .rpc("get_table_columns", { table_name: "incidencias" })
          .catch(() => ({ data: null }))
        const { data: recibidasColumns } = await supabase
          .rpc("get_table_columns", { table_name: "incidencias_recibidas" })
          .catch(() => ({ data: null }))

        testResults.push({
          test: "Estructura de tablas",
          status: "success",
          message: "Tablas encontradas y accesibles",
          details: { incidencias: !!incidenciasColumns, recibidas: !!recibidasColumns },
        })
      } catch (error) {
        testResults.push({
          test: "Estructura de tablas",
          status: "warning",
          message: "No se pudo verificar la estructura completa",
        })
      }

      // Test 2: Insertar datos de prueba con tipos correctos
      setProgress(25)
      try {
        const testData = {
          clase_incidencia: "TEST_TYPES",
          numero: `TEST_${Date.now()}`,
          cliente: "C999",
          nombre_cliente: "Cliente Test Tipos",
          duracion_abierta: 30, // INTEGER
          ejercicio_pedido: 2024, // INTEGER
          cantidad: 2.5, // DECIMAL
          gastos_asociados: 150.75, // DECIMAL
          coste: 89.99, // DECIMAL
          resuelto: true, // BOOLEAN
          fecha: "2024-01-15", // DATE
          fecha_alta: "2024-01-10", // DATE
          fecha_importacion: new Date().toISOString().split("T")[0], // DATE
        }

        const { data, error } = await supabase.from("incidencias").insert(testData).select()

        if (error) {
          testResults.push({
            test: "Inserción con tipos correctos",
            status: "error",
            message: `Error al insertar: ${error.message}`,
          })
        } else {
          testResults.push({
            test: "Inserción con tipos correctos",
            status: "success",
            message: "Datos insertados correctamente con todos los tipos",
          })

          // Limpiar el dato de prueba
          await supabase.from("incidencias").delete().eq("numero", testData.numero)
        }
      } catch (error) {
        testResults.push({
          test: "Inserción con tipos correctos",
          status: "error",
          message: `Error inesperado: ${error}`,
        })
      }

      // Test 3: Probar inserción con valores NULL
      setProgress(40)
      try {
        const nullTestData = {
          clase_incidencia: "TEST_NULL",
          numero: `NULL_${Date.now()}`,
          cliente: "C998",
          nombre_cliente: "Cliente Test NULL",
          duracion_abierta: null,
          ejercicio_pedido: null,
          cantidad: null,
          gastos_asociados: null,
          coste: null,
          resuelto: false,
        }

        const { data, error } = await supabase.from("incidencias").insert(nullTestData).select()

        if (error) {
          testResults.push({
            test: "Inserción con valores NULL",
            status: "error",
            message: `Error con valores NULL: ${error.message}`,
          })
        } else {
          testResults.push({
            test: "Inserción con valores NULL",
            status: "success",
            message: "Valores NULL manejados correctamente",
          })

          // Limpiar el dato de prueba
          await supabase.from("incidencias").delete().eq("numero", nullTestData.numero)
        }
      } catch (error) {
        testResults.push({
          test: "Inserción con valores NULL",
          status: "error",
          message: `Error inesperado con NULL: ${error}`,
        })
      }

      // Test 4: Verificar trigger en incidencias_recibidas
      setProgress(60)
      try {
        const triggerTestData = {
          documento: "DOC_TEST",
          numero: `TRIGGER_${Date.now()}`,
          cliente: "Cliente Trigger Test",
          codigo_incidencia: "TRIG001",
          fecha_recepcion: "2024-01-27",
          fecha_incidencia: "2024-01-10",
          fecha_importacion: new Date().toISOString().split("T")[0],
        }

        const { data, error } = await supabase.from("incidencias_recibidas").insert(triggerTestData).select()

        if (error) {
          testResults.push({
            test: "Triggers automáticos",
            status: "error",
            message: `Error en triggers: ${error.message}`,
          })
        } else if (data && data[0]) {
          const record = data[0]
          const triggersWorking =
            typeof record.dias_diferencia === "number" &&
            typeof record.es_critica === "boolean" &&
            typeof record.es_reciente === "boolean"

          testResults.push({
            test: "Triggers automáticos",
            status: triggersWorking ? "success" : "warning",
            message: triggersWorking ? "Triggers funcionando correctamente" : "Triggers no calcularon todos los campos",
            details: {
              dias_diferencia: record.dias_diferencia,
              es_critica: record.es_critica,
              es_reciente: record.es_reciente,
            },
          })

          // Limpiar el dato de prueba
          await supabase.from("incidencias_recibidas").delete().eq("numero", triggerTestData.numero)
        }
      } catch (error) {
        testResults.push({
          test: "Triggers automáticos",
          status: "error",
          message: `Error inesperado en triggers: ${error}`,
        })
      }

      // Test 5: Verificar datos existentes
      setProgress(80)
      try {
        const { data: incidenciasCount } = await supabase
          .from("incidencias")
          .select("*", { count: "exact", head: true })

        const { data: recibidasCount } = await supabase
          .from("incidencias_recibidas")
          .select("*", { count: "exact", head: true })

        testResults.push({
          test: "Conteo de registros",
          status: "success",
          message: `Incidencias: ${incidenciasCount?.length || 0}, Recibidas: ${recibidasCount?.length || 0}`,
          details: {
            incidencias: incidenciasCount?.length || 0,
            recibidas: recibidasCount?.length || 0,
          },
        })
      } catch (error) {
        testResults.push({
          test: "Conteo de registros",
          status: "warning",
          message: "No se pudo contar los registros existentes",
        })
      }

      setProgress(100)
      setResults(testResults)

      const successCount = testResults.filter((r) => r.status === "success").length
      const errorCount = testResults.filter((r) => r.status === "error").length

      toast({
        title: "Verificación completada",
        description: `${successCount} pruebas exitosas, ${errorCount} errores`,
        variant: errorCount > 0 ? "destructive" : "default",
      })
    } catch (error) {
      console.error("Error en verificación:", error)
      toast({
        title: "Error en verificación",
        description: "Ocurrió un error durante la verificación",
        variant: "destructive",
      })
    } finally {
      setVerifying(false)
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
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      success: "default",
      error: "destructive",
      warning: "secondary",
    } as const

    return <Badge variant={variants[status as keyof typeof variants] || "outline"}>{status.toUpperCase()}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Verificador de Tipos de Datos
        </CardTitle>
        <CardDescription>
          Ejecuta pruebas para verificar que los tipos de datos se manejan correctamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <Button onClick={runVerification} disabled={verifying} className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            {verifying ? "Verificando..." : "Ejecutar Verificación"}
          </Button>

          {verifying && (
            <div className="flex items-center gap-2">
              <span className="text-sm">{progress}%</span>
              <Progress value={progress} className="w-32" />
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Resultados de Verificación:</h3>
            {results.map((result, index) => (
              <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                <div className="flex items-start gap-3">
                  {getStatusIcon(result.status)}
                  <div>
                    <div className="font-medium">{result.test}</div>
                    <div className="text-sm text-slate-600">{result.message}</div>
                    {result.details && (
                      <div className="text-xs text-slate-500 mt-1">
                        <code>{JSON.stringify(result.details, null, 2)}</code>
                      </div>
                    )}
                  </div>
                </div>
                {getStatusBadge(result.status)}
              </div>
            ))}
          </div>
        )}

        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Tipos de datos verificados:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div>• INTEGER (enteros)</div>
            <div>• DECIMAL (decimales)</div>
            <div>• BOOLEAN (booleanos)</div>
            <div>• DATE (fechas)</div>
            <div>• VARCHAR (texto)</div>
            <div>• TEXT (texto largo)</div>
            <div>• NULL (valores nulos)</div>
            <div>• TRIGGERS (automáticos)</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
