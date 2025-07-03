-- Crear tabla principal de incidencias
CREATE TABLE IF NOT EXISTS incidencias (
  id SERIAL PRIMARY KEY,
  clase_incidencia VARCHAR(100),
  numero VARCHAR(50),
  estado VARCHAR(100),
  tipo_estado VARCHAR(100),
  fecha DATE,
  tienda VARCHAR(100),
  nombre_tienda VARCHAR(200),
  proveedor VARCHAR(100),
  nombre_proveedor VARCHAR(200),
  marca VARCHAR(100),
  telefono VARCHAR(20),
  fax VARCHAR(20),
  duracion_abierta INTEGER,
  cliente VARCHAR(100),
  nombre_cliente VARCHAR(200),
  telefono_cliente VARCHAR(20),
  camion VARCHAR(100),
  vendedor VARCHAR(100),
  nombre_vendedor VARCHAR(200),
  ejercicio_pedido INTEGER,
  serie_pedido VARCHAR(50),
  pedido VARCHAR(100),
  referencia VARCHAR(100),
  ejercicio_albaran INTEGER,
  serie_albaran VARCHAR(50),
  albaran VARCHAR(100),
  articulo VARCHAR(100),
  descripcion TEXT,
  descripcion2 TEXT,
  referencia_articulo VARCHAR(100),
  cantidad DECIMAL(10,2),
  tipo VARCHAR(100),
  gravedad VARCHAR(50),
  ultima_recepcion DATE,
  resuelto BOOLEAN DEFAULT FALSE,
  fecha_resuelto DATE,
  solucion TEXT,
  fecha_alta DATE,
  gastos_asociados DECIMAL(10,2),
  coste DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla de incidencias recibidas
CREATE TABLE IF NOT EXISTS incidencias_recibidas (
  id SERIAL PRIMARY KEY,
  documento VARCHAR(100),
  numero VARCHAR(50),
  fecha DATE,
  f_serv DATE,
  cliente VARCHAR(100),
  c_postal VARCHAR(10),
  poblacion VARCHAR(200),
  ruta VARCHAR(50),
  fecha_recepcion DATE,
  fecha_incidencia DATE,
  telefono1 VARCHAR(20),
  telefono2 VARCHAR(20),
  incidencia TEXT,
  codigo_incidencia VARCHAR(50),
  dias_diferencia INTEGER,
  es_critica BOOLEAN DEFAULT FALSE,
  es_reciente BOOLEAN DEFAULT FALSE,
  fecha_importacion DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_incidencias_numero_clase ON incidencias(numero, clase_incidencia);
CREATE INDEX IF NOT EXISTS idx_incidencias_cliente ON incidencias(cliente);
CREATE INDEX IF NOT EXISTS idx_incidencias_recibidas_codigo ON incidencias_recibidas(codigo_incidencia);
CREATE INDEX IF NOT EXISTS idx_incidencias_recibidas_fecha_recepcion ON incidencias_recibidas(fecha_recepcion);

-- Crear función para calcular campos automáticamente
CREATE OR REPLACE FUNCTION calculate_incidencia_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular días de diferencia
  NEW.dias_diferencia := COALESCE(NEW.fecha_incidencia - NEW.fecha_recepcion, 0);
  
  -- Marcar como crítica si FECHA_INCIDENCIA > 15 días desde importación
  NEW.es_critica := (NEW.fecha_incidencia < (NEW.fecha_importacion - INTERVAL '15 days'));
  
  -- Marcar como reciente si FECHA_RECEPCION está en los últimos 2 días
  NEW.es_reciente := (NEW.fecha_recepcion >= (CURRENT_DATE - INTERVAL '2 days'));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_calculate_incidencia_fields ON incidencias_recibidas;
CREATE TRIGGER trigger_calculate_incidencia_fields
  BEFORE INSERT OR UPDATE ON incidencias_recibidas
  FOR EACH ROW
  EXECUTE FUNCTION calculate_incidencia_fields();
