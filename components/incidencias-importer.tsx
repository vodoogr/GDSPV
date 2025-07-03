"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CSVImporter from "./csv-importer"

export default function IncidenciasImporter() {
  const [activeTab, setActiveTab] = useState("incidencias")
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleImportComplete = () => {
    // Incrementar el trigger para forzar una recarga de datos
    setRefreshTrigger((prev) => prev + 1)
  }

  // Mapeo de columnas para incidencias principales - CORREGIDO
  const incidenciasMapping = {
    "Clase Incidencia": "clase_incidencia",
    Numero: "numero",
    Estado: "estado",
    "Tipo de Estado": "tipo_estado",
    Fecha: "fecha",
    Tienda: "tienda",
    "Nombre Tienda": "nombre_tienda",
    Proveedor: "proveedor",
    "Nombre proveedor": "nombre_proveedor",
    Marca: "marca",
    Teléfono: "telefono",
    Fax: "fax",
    "Duración Abierta": "duracion_abierta",
    Cliente: "cliente",
    "Nombre Cliente": "nombre_cliente",
    "Teléfono Cliente": "telefono_cliente",
    Camion: "camion",
    Vendedor: "vendedor",
    "Nombre vendedor": "nombre_vendedor",
    "Ejercicio Pedido": "ejercicio_pedido",
    "Serie Pedido": "serie_pedido",
    Pedido: "pedido",
    "Referencia Pedido": "referencia",
    "Ejercicio Albarán": "ejercicio_albaran",
    "Serie Albarán": "serie_albaran",
    Albarán: "albaran",
    Artículo: "articulo",
    Descripción: "descripcion", // CORREGIDO: Columna 27
    Descripción2: "descripcion2",
    "Referencia Artículo": "referencia_articulo",
    Cantidad: "cantidad",
    Tipo: "tipo",
    Gravedad: "gravedad",
    "Última Recepción": "ultima_recepcion",
    Resuelto: "resuelto",
    "Fecha Resuelto": "fecha_resuelto",
    Solución: "solucion", // CORREGIDO: Columna 36
    "Fecha de Alta": "fecha_alta",
    "Gastos Asociados": "gastos_asociados",
    Coste: "coste",
  }

  // Mapeo de columnas para incidencias recibidas
  const recibidasMapping = {
    DOCUMENTO: "documento",
    NUMERO: "numero",
    FECHA: "fecha",
    F_SERV_: "f_serv",
    CLIENTE: "cliente",
    C_POSTAL: "c_postal",
    POBLACIÓN: "poblacion",
    RUTA: "ruta",
    FECHA_RECEPCION: "fecha_recepcion",
    FECHA_INCIDENCIA: "fecha_incidencia",
    TELEFONO1: "telefono1",
    TELEFONO2: "telefono2",
    INCIDENCIA: "incidencia",
    CODIGO_INCIDENCIA: "codigo_incidencia",
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importadores CSV</CardTitle>
        <CardDescription>Importa datos desde archivos CSV a las tablas del sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="incidencias">Incidencias Principales</TabsTrigger>
            <TabsTrigger value="recibidas">Incidencias Recibidas</TabsTrigger>
          </TabsList>

          <TabsContent value="incidencias">
            <CSVImporter
              title="Importar Incidencias Principales"
              description="Importa el listado principal de incidencias desde un archivo CSV (ExpoWin)"
              tableName="incidencias"
              requiredColumns={["Clase Incidencia", "Numero", "Cliente", "Nombre Cliente"]}
              columnMapping={incidenciasMapping}
              onImportComplete={handleImportComplete}
            />
          </TabsContent>

          <TabsContent value="recibidas">
            <CSVImporter
              title="Importar Incidencias Recibidas"
              description="Importa el listado de incidencias recibidas desde un archivo CSV"
              tableName="incidencias_recibidas"
              requiredColumns={["DOCUMENTO", "NUMERO", "CLIENTE", "CODIGO_INCIDENCIA"]}
              columnMapping={recibidasMapping}
              onImportComplete={handleImportComplete}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
