"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { AlertTriangle, Bell, Settings, CheckCircle, Edit, Save, Plus, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AlertRule {
  id: string
  name: string
  threshold: number
  period: "day" | "week" | "month" | "total"
  enabled: boolean
  alertType: "warning" | "critical"
  description: string
}

interface ClientAlert {
  cliente: string
  incidencias: number
  threshold: number
  ruleName: string
  alertType: "warning" | "critical"
  period: string
  exceedsBy: number
}

interface ClienteDistribucion {
  cliente: string
  incidencias: number
  porcentaje: number
}

interface ClientAlertsProps {
  clientesDistribucion?: ClienteDistribucion[]
  totalIncidencias?: number
}

const defaultRules: AlertRule[] = [
  {
    id: "1",
    name: "Cliente Alto Volumen",
    threshold: 10,
    period: "total",
    enabled: true,
    alertType: "warning",
    description: "Cliente con más de 10 incidencias totales",
  },
  {
    id: "2",
    name: "Cliente Crítico",
    threshold: 25,
    period: "total",
    enabled: true,
    alertType: "critical",
    description: "Cliente con más de 25 incidencias totales",
  },
  {
    id: "3",
    name: "Actividad Mensual Alta",
    threshold: 5,
    period: "month",
    enabled: false,
    alertType: "warning",
    description: "Cliente con más de 5 incidencias este mes",
  },
]

export default function ClientAlerts({ clientesDistribucion, totalIncidencias }: ClientAlertsProps) {
  const [alertRules, setAlertRules] = useState<AlertRule[]>(defaultRules)
  const [activeAlerts, setActiveAlerts] = useState<ClientAlert[]>([])
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [newRule, setNewRule] = useState<Partial<AlertRule>>({
    name: "",
    threshold: 5,
    period: "total",
    enabled: true,
    alertType: "warning",
    description: "",
  })

  // Simple notification function to avoid toast errors
  const showNotification = (message: string, type: "success" | "error" | "warning" = "success") => {
    console.log(`${type.toUpperCase()}: ${message}`)
  }

  useEffect(() => {
    // Cargar reglas desde localStorage
    try {
      const savedRules = localStorage.getItem("client-alert-rules")
      if (savedRules) {
        const parsedRules = JSON.parse(savedRules)
        if (Array.isArray(parsedRules)) {
          setAlertRules(parsedRules)
        }
      }
    } catch (error) {
      console.error("Error loading saved rules:", error)
    }
  }, [])

  useEffect(() => {
    // Guardar reglas en localStorage y recalcular alertas
    if (alertRules && alertRules.length > 0) {
      try {
        localStorage.setItem("client-alert-rules", JSON.stringify(alertRules))
      } catch (error) {
        console.error("Error saving rules:", error)
      }
    }

    // Solo calcular alertas si tenemos datos válidos
    if (clientesDistribucion && Array.isArray(clientesDistribucion) && clientesDistribucion.length > 0) {
      calculateAlerts()
    } else {
      // Si no hay datos, limpiar alertas activas
      setActiveAlerts([])
    }
  }, [alertRules, clientesDistribucion])

  const calculateAlerts = async () => {
    // Validación exhaustiva de datos
    if (!clientesDistribucion) {
      console.log("clientesDistribucion is undefined")
      setActiveAlerts([])
      return
    }

    if (!Array.isArray(clientesDistribucion)) {
      console.log("clientesDistribucion is not an array:", typeof clientesDistribucion)
      setActiveAlerts([])
      return
    }

    if (clientesDistribucion.length === 0) {
      console.log("clientesDistribucion is empty")
      setActiveAlerts([])
      return
    }

    if (!alertRules || !Array.isArray(alertRules)) {
      console.log("alertRules is not valid")
      setActiveAlerts([])
      return
    }

    setIsLoading(true)
    const alerts: ClientAlert[] = []
    const supabase = createClient()

    try {
      // Iterar sobre los clientes de forma segura
      for (let i = 0; i < clientesDistribucion.length; i++) {
        const cliente = clientesDistribucion[i]

        // Validar que el cliente tiene los datos necesarios
        if (!cliente || typeof cliente !== "object" || !cliente.cliente) {
          console.log("Invalid cliente at index", i, cliente)
          continue
        }

        // Iterar sobre las reglas habilitadas
        const enabledRules = alertRules.filter((r) => r && r.enabled)

        for (let j = 0; j < enabledRules.length; j++) {
          const rule = enabledRules[j]

          if (!rule || typeof rule !== "object") {
            continue
          }

          let incidenciasCount = 0

          if (rule.period === "total") {
            incidenciasCount = cliente.incidencias || 0
          } else {
            // Para períodos específicos, consultar la base de datos
            try {
              const now = new Date()
              let startDate: Date

              switch (rule.period) {
                case "day":
                  startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                  break
                case "week":
                  startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                  break
                case "month":
                  startDate = new Date(now.getFullYear(), now.getMonth(), 1)
                  break
                default:
                  startDate = new Date(0)
              }

              // Buscar en incidencias principales
              const { count: incidenciasCount1 } = await supabase
                .from("incidencias")
                .select("*", { count: "exact", head: true })
                .or(
                  `nombre_cliente.ilike.%${cliente.cliente}%,cliente.ilike.%${cliente.cliente}%,cod_cliente.ilike.%${cliente.cliente}%`,
                )
                .gte("fecha", startDate.toISOString())

              // Buscar en incidencias recibidas
              const { count: incidenciasCount2 } = await supabase
                .from("incidencias_recibidas")
                .select("*", { count: "exact", head: true })
                .or(
                  `nombre_cliente.ilike.%${cliente.cliente}%,cliente.ilike.%${cliente.cliente}%,cod_cliente.ilike.%${cliente.cliente}%`,
                )
                .gte("fecha", startDate.toISOString())

              incidenciasCount = (incidenciasCount1 || 0) + (incidenciasCount2 || 0)
            } catch (error) {
              console.error("Error calculating period alerts for client:", cliente.cliente, error)
              continue
            }
          }

          if (incidenciasCount > rule.threshold) {
            alerts.push({
              cliente: cliente.cliente,
              incidencias: incidenciasCount,
              threshold: rule.threshold,
              ruleName: rule.name,
              alertType: rule.alertType,
              period: rule.period,
              exceedsBy: incidenciasCount - rule.threshold,
            })
          }
        }
      }

      // Ordenar por tipo de alerta (críticas primero) y luego por exceso
      alerts.sort((a, b) => {
        if (a.alertType !== b.alertType) {
          return a.alertType === "critical" ? -1 : 1
        }
        return b.exceedsBy - a.exceedsBy
      })

      setActiveAlerts(alerts)

      // Mostrar notificación si hay nuevas alertas críticas
      const criticalAlerts = alerts.filter((a) => a.alertType === "critical")
      if (criticalAlerts.length > 0) {
        showNotification(`${criticalAlerts.length} cliente(s) han superado umbrales críticos`, "warning")
      }
    } catch (error) {
      console.error("Error calculating alerts:", error)
      showNotification("Error al calcular alertas", "error")
      setActiveAlerts([])
    } finally {
      setIsLoading(false)
    }
  }

  const saveRule = () => {
    try {
      if (editingRule) {
        setAlertRules(alertRules.map((rule) => (rule.id === editingRule.id ? editingRule : rule)))
        setEditingRule(null)
        showNotification("Regla actualizada correctamente")
      } else if (newRule.name && newRule.threshold) {
        const rule: AlertRule = {
          id: Date.now().toString(),
          name: newRule.name,
          threshold: newRule.threshold || 5,
          period: newRule.period || "total",
          enabled: newRule.enabled !== false,
          alertType: newRule.alertType || "warning",
          description: newRule.description || "",
        }
        setAlertRules([...alertRules, rule])
        setNewRule({
          name: "",
          threshold: 5,
          period: "total",
          enabled: true,
          alertType: "warning",
          description: "",
        })
        showNotification("Nueva regla creada correctamente")
      }
    } catch (error) {
      console.error("Error saving rule:", error)
      showNotification("Error al guardar la regla", "error")
    }
  }

  const deleteRule = (id: string) => {
    try {
      setAlertRules(alertRules.filter((rule) => rule.id !== id))
      showNotification("Regla eliminada correctamente")
    } catch (error) {
      console.error("Error deleting rule:", error)
      showNotification("Error al eliminar la regla", "error")
    }
  }

  const toggleRule = (id: string) => {
    try {
      setAlertRules(alertRules.map((rule) => (rule.id === id ? { ...rule, enabled: !rule.enabled } : rule)))
    } catch (error) {
      console.error("Error toggling rule:", error)
      showNotification("Error al cambiar el estado de la regla", "error")
    }
  }

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case "day":
        return "Hoy"
      case "week":
        return "Esta semana"
      case "month":
        return "Este mes"
      case "total":
        return "Total"
      default:
        return period
    }
  }

  const getAlertIcon = (alertType: string) => {
    return alertType === "critical" ? (
      <AlertTriangle className="h-4 w-4 text-red-500" />
    ) : (
      <Bell className="h-4 w-4 text-orange-500" />
    )
  }

  // Si no hay datos de clientes, mostrar mensaje informativo
  if (!clientesDistribucion || !Array.isArray(clientesDistribucion) || clientesDistribucion.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Sistema de Alertas de Clientes
          </CardTitle>
          <CardDescription>
            Las alertas se mostrarán cuando haya datos de distribución de clientes disponibles
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center text-slate-500">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay datos de clientes disponibles para generar alertas</p>
            <p className="text-sm mt-2">Las alertas aparecerán automáticamente cuando se carguen los datos</p>
            <div className="mt-4">
              <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar Reglas
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Configuración de Alertas de Clientes</DialogTitle>
                    <DialogDescription>
                      Configura umbrales para recibir alertas cuando los clientes superen ciertos límites de incidencias
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6">
                    {/* Reglas Existentes */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Reglas Configuradas</h3>
                      <div className="space-y-3">
                        {alertRules.map((rule) => (
                          <Card key={rule.id} className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule.id)} />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{rule.name}</span>
                                    <Badge variant={rule.alertType === "critical" ? "destructive" : "secondary"}>
                                      {rule.alertType}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-slate-600">
                                    Umbral: {rule.threshold} incidencias ({getPeriodLabel(rule.period)})
                                  </div>
                                  {rule.description && (
                                    <div className="text-xs text-slate-500 mt-1">{rule.description}</div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingRule(rule)}
                                  disabled={editingRule?.id === rule.id}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => deleteRule(rule.id)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>

                            {/* Formulario de edición */}
                            {editingRule?.id === rule.id && (
                              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor="edit-name">Nombre</Label>
                                    <Input
                                      id="edit-name"
                                      value={editingRule.name}
                                      onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-threshold">Umbral</Label>
                                    <Input
                                      id="edit-threshold"
                                      type="number"
                                      value={editingRule.threshold}
                                      onChange={(e) =>
                                        setEditingRule({ ...editingRule, threshold: Number.parseInt(e.target.value) })
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor="edit-period">Período</Label>
                                    <Select
                                      value={editingRule.period}
                                      onValueChange={(value: any) => setEditingRule({ ...editingRule, period: value })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="day">Día</SelectItem>
                                        <SelectItem value="week">Semana</SelectItem>
                                        <SelectItem value="month">Mes</SelectItem>
                                        <SelectItem value="total">Total</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-type">Tipo de Alerta</Label>
                                    <Select
                                      value={editingRule.alertType}
                                      onValueChange={(value: any) =>
                                        setEditingRule({ ...editingRule, alertType: value })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="warning">Advertencia</SelectItem>
                                        <SelectItem value="critical">Crítica</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div>
                                  <Label htmlFor="edit-description">Descripción</Label>
                                  <Input
                                    id="edit-description"
                                    value={editingRule.description}
                                    onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button onClick={saveRule} size="sm">
                                    <Save className="h-4 w-4 mr-2" />
                                    Guardar
                                  </Button>
                                  <Button variant="outline" onClick={() => setEditingRule(null)} size="sm">
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Nueva Regla */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Crear Nueva Regla</h3>
                      <Card className="p-4">
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="new-name">Nombre</Label>
                              <Input
                                id="new-name"
                                placeholder="Ej: Cliente Problemático"
                                value={newRule.name}
                                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="new-threshold">Umbral</Label>
                              <Input
                                id="new-threshold"
                                type="number"
                                placeholder="5"
                                value={newRule.threshold}
                                onChange={(e) => setNewRule({ ...newRule, threshold: Number.parseInt(e.target.value) })}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="new-period">Período</Label>
                              <Select
                                value={newRule.period}
                                onValueChange={(value: any) => setNewRule({ ...newRule, period: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="day">Día</SelectItem>
                                  <SelectItem value="week">Semana</SelectItem>
                                  <SelectItem value="month">Mes</SelectItem>
                                  <SelectItem value="total">Total</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="new-type">Tipo de Alerta</Label>
                              <Select
                                value={newRule.alertType}
                                onValueChange={(value: any) => setNewRule({ ...newRule, alertType: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="warning">Advertencia</SelectItem>
                                  <SelectItem value="critical">Crítica</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="new-description">Descripción (opcional)</Label>
                            <Input
                              id="new-description"
                              placeholder="Descripción de la regla"
                              value={newRule.description}
                              onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                            />
                          </div>
                          <Button onClick={saveRule} disabled={!newRule.name || !newRule.threshold}>
                            <Plus className="h-4 w-4 mr-2" />
                            Crear Regla
                          </Button>
                        </div>
                      </Card>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Alertas Activas */}
      {activeAlerts.length > 0 && (
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Alertas de Clientes Activas
                  <Badge variant="destructive" className="ml-2">
                    {activeAlerts.length}
                  </Badge>
                </CardTitle>
                <CardDescription>Clientes que han superado los umbrales configurados</CardDescription>
              </div>
              <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Configuración de Alertas de Clientes</DialogTitle>
                    <DialogDescription>
                      Configura umbrales para recibir alertas cuando los clientes superen ciertos límites de incidencias
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6">
                    {/* Reglas Existentes */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Reglas Configuradas</h3>
                      <div className="space-y-3">
                        {alertRules.map((rule) => (
                          <Card key={rule.id} className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule.id)} />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{rule.name}</span>
                                    <Badge variant={rule.alertType === "critical" ? "destructive" : "secondary"}>
                                      {rule.alertType}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-slate-600">
                                    Umbral: {rule.threshold} incidencias ({getPeriodLabel(rule.period)})
                                  </div>
                                  {rule.description && (
                                    <div className="text-xs text-slate-500 mt-1">{rule.description}</div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingRule(rule)}
                                  disabled={editingRule?.id === rule.id}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => deleteRule(rule.id)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>

                            {/* Formulario de edición */}
                            {editingRule?.id === rule.id && (
                              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor="edit-name">Nombre</Label>
                                    <Input
                                      id="edit-name"
                                      value={editingRule.name}
                                      onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-threshold">Umbral</Label>
                                    <Input
                                      id="edit-threshold"
                                      type="number"
                                      value={editingRule.threshold}
                                      onChange={(e) =>
                                        setEditingRule({ ...editingRule, threshold: Number.parseInt(e.target.value) })
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor="edit-period">Período</Label>
                                    <Select
                                      value={editingRule.period}
                                      onValueChange={(value: any) => setEditingRule({ ...editingRule, period: value })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="day">Día</SelectItem>
                                        <SelectItem value="week">Semana</SelectItem>
                                        <SelectItem value="month">Mes</SelectItem>
                                        <SelectItem value="total">Total</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-type">Tipo de Alerta</Label>
                                    <Select
                                      value={editingRule.alertType}
                                      onValueChange={(value: any) =>
                                        setEditingRule({ ...editingRule, alertType: value })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="warning">Advertencia</SelectItem>
                                        <SelectItem value="critical">Crítica</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div>
                                  <Label htmlFor="edit-description">Descripción</Label>
                                  <Input
                                    id="edit-description"
                                    value={editingRule.description}
                                    onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button onClick={saveRule} size="sm">
                                    <Save className="h-4 w-4 mr-2" />
                                    Guardar
                                  </Button>
                                  <Button variant="outline" onClick={() => setEditingRule(null)} size="sm">
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Nueva Regla */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Crear Nueva Regla</h3>
                      <Card className="p-4">
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="new-name">Nombre</Label>
                              <Input
                                id="new-name"
                                placeholder="Ej: Cliente Problemático"
                                value={newRule.name}
                                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="new-threshold">Umbral</Label>
                              <Input
                                id="new-threshold"
                                type="number"
                                placeholder="5"
                                value={newRule.threshold}
                                onChange={(e) => setNewRule({ ...newRule, threshold: Number.parseInt(e.target.value) })}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="new-period">Período</Label>
                              <Select
                                value={newRule.period}
                                onValueChange={(value: any) => setNewRule({ ...newRule, period: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="day">Día</SelectItem>
                                  <SelectItem value="week">Semana</SelectItem>
                                  <SelectItem value="month">Mes</SelectItem>
                                  <SelectItem value="total">Total</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="new-type">Tipo de Alerta</Label>
                              <Select
                                value={newRule.alertType}
                                onValueChange={(value: any) => setNewRule({ ...newRule, alertType: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="warning">Advertencia</SelectItem>
                                  <SelectItem value="critical">Crítica</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="new-description">Descripción (opcional)</Label>
                            <Input
                              id="new-description"
                              placeholder="Descripción de la regla"
                              value={newRule.description}
                              onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                            />
                          </div>
                          <Button onClick={saveRule} disabled={!newRule.name || !newRule.threshold}>
                            <Plus className="h-4 w-4 mr-2" />
                            Crear Regla
                          </Button>
                        </div>
                      </Card>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {activeAlerts.map((alert, index) => (
                <div
                  key={`${alert.cliente}-${alert.ruleName}-${index}`}
                  className={`p-4 rounded-lg border-l-4 ${
                    alert.alertType === "critical"
                      ? "border-l-red-500 bg-red-50 dark:bg-red-900/20"
                      : "border-l-orange-500 bg-orange-50 dark:bg-orange-900/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getAlertIcon(alert.alertType)}
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{alert.cliente}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {alert.incidencias} incidencias ({getPeriodLabel(alert.period)}) - Supera por{" "}
                          {alert.exceedsBy}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Regla: {alert.ruleName}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={alert.alertType === "critical" ? "destructive" : "secondary"}>
                        {alert.alertType === "critical" ? "CRÍTICO" : "ADVERTENCIA"}
                      </Badge>
                      <div className="text-sm text-slate-600 mt-1">Umbral: {alert.threshold}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumen de Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Alertas Activas</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{activeAlerts.length}</p>
              </div>
              <div className="rounded-full bg-red-500 p-2">
                <Bell className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Alertas Críticas</p>
                <p className="text-2xl font-bold text-red-600">
                  {activeAlerts.filter((a) => a.alertType === "critical").length}
                </p>
              </div>
              <div className="rounded-full bg-red-600 p-2">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Reglas Activas</p>
                <p className="text-2xl font-bold text-green-600">{alertRules.filter((r) => r.enabled).length}</p>
              </div>
              <div className="rounded-full bg-green-500 p-2">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading && (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-slate-600">Calculando alertas...</span>
          </div>
        </div>
      )}
    </div>
  )
}
