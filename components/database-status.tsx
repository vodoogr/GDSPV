"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, Database, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase"

interface DatabaseStatus {
  connected: boolean
  incidenciasTable: boolean
  recibidasTable: boolean
  error?: string
}

export default function DatabaseStatus() {
  const [status, setStatus] = useState<DatabaseStatus>({
    connected: false,
    incidenciasTable: false,
    recibidasTable: false,
  })
  const [loading, setLoading] = useState(true)
  const [dbName, setDbName] = useState<string>("supabase")

  const checkDatabaseStatus = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Intentar obtener el nombre real de la base de datos
      try {
        const { data: dbInfo } = await supabase.rpc("get_db_name").catch(() => ({ data: null }))
        if (dbInfo) {
          setDbName(dbInfo)
        }
      } catch (error) {
        // Silenciar error si la función RPC no existe
      }

      // Verificar conexión
      const { error: connectionError } = await supabase
        .from("incidencias")
        .select("count", { count: "exact", head: true })

      if (connectionError) {
        setStatus({
          connected: false,
          incidenciasTable: false,
          recibidasTable: false,
          error: connectionError.message,
        })
        return
      }

      // Verificar tabla incidencias
      const { error: incidenciasError } = await supabase.from("incidencias").select("id").limit(1)

      // Verificar tabla incidencias_recibidas
      const { error: recibidasError } = await supabase.from("incidencias_recibidas").select("id").limit(1)

      setStatus({
        connected: true,
        incidenciasTable: !incidenciasError,
        recibidasTable: !recibidasError,
        error: incidenciasError?.message || recibidasError?.message,
      })
    } catch (error) {
      console.error("Error checking database status:", error)
      setStatus({
        connected: false,
        incidenciasTable: false,
        recibidasTable: false,
        error: "Error de conexión",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Extraer información de la URL de Supabase que sí está disponible en el cliente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    const projectId = supabaseUrl.split("//")[1]?.split(".")[0] || "supabase-project"
    setDbName(projectId)

    checkDatabaseStatus()
  }, [])

  const getStatusBadge = (isOk: boolean, label: string) => {
    return (
      <Badge variant={isOk ? "default" : "destructive"} className={isOk ? "bg-green-500" : ""}>
        {isOk ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
        {label}
      </Badge>
    )
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Estado de la Base de Datos
        </CardTitle>
        <CardDescription>Verificación del estado de conexión y tablas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {getStatusBadge(status.connected, "Conexión")}
            {getStatusBadge(status.incidenciasTable, "Sistema")}
            {getStatusBadge(status.recibidasTable, "Base de Datos")}
          </div>
          <Button onClick={checkDatabaseStatus} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Verificar
          </Button>
        </div>
        {status.error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">
              <strong>Error:</strong> {status.error}
            </p>
            {status.error.includes("does not exist") && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                💡 <strong>Solución:</strong> Ejecuta el script "setup-database.sql" en tu base de datos de Supabase.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
