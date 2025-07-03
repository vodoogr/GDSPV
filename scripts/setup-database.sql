-- Eliminar tablas existentes si existen (para desarrollo)
DROP TABLE IF EXISTS incidencias_recibidas CASCADE;
DROP TABLE IF EXISTS incidencias CASCADE;

-- Eliminar funciones y triggers existentes
DROP FUNCTION IF EXISTS calculate_incidencia_fields() CASCADE;

-- Crear tabla principal de incidencias
CREATE TABLE incidencias (
  id BIGSERIAL PRIMARY KEY,
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
  fecha_importacion DATE,  -- Añadida esta columna
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de incidencias recibidas
CREATE TABLE incidencias_recibidas (
  id BIGSERIAL PRIMARY KEY,
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
  dias_diferencia INTEGER DEFAULT 0,
  es_critica BOOLEAN DEFAULT FALSE,
  es_reciente BOOLEAN DEFAULT FALSE,
  fecha_importacion DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar rendimiento
CREATE INDEX idx_incidencias_numero_clase ON incidencias(numero, clase_incidencia);
CREATE INDEX idx_incidencias_cliente ON incidencias(cliente);
CREATE INDEX idx_incidencias_nombre_cliente ON incidencias(nombre_cliente);
CREATE INDEX idx_incidencias_recibidas_codigo ON incidencias_recibidas(codigo_incidencia);
CREATE INDEX idx_incidencias_recibidas_fecha_recepcion ON incidencias_recibidas(fecha_recepcion);
CREATE INDEX idx_incidencias_recibidas_fecha_incidencia ON incidencias_recibidas(fecha_incidencia);
CREATE INDEX idx_incidencias_recibidas_ruta ON incidencias_recibidas(ruta);

-- Crear función para calcular campos automáticamente
CREATE OR REPLACE FUNCTION calculate_incidencia_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular días de diferencia (solo si ambas fechas existen)
  IF NEW.fecha_recepcion IS NOT NULL AND NEW.fecha_incidencia IS NOT NULL THEN
    NEW.dias_diferencia := NEW.fecha_incidencia - NEW.fecha_recepcion;
  ELSE
    NEW.dias_diferencia := 0;
  END IF;
  
  -- Marcar como crítica si FECHA_INCIDENCIA > 15 días desde importación
  IF NEW.fecha_incidencia IS NOT NULL AND NEW.fecha_importacion IS NOT NULL THEN
    NEW.es_critica := (NEW.fecha_incidencia < (NEW.fecha_importacion - INTERVAL '15 days'));
  ELSE
    NEW.es_critica := FALSE;
  END IF;
  
  -- Marcar como reciente si FECHA_RECEPCION está en los últimos 2 días
  IF NEW.fecha_recepcion IS NOT NULL THEN
    NEW.es_reciente := (NEW.fecha_recepcion >= (CURRENT_DATE - INTERVAL '2 days'));
  ELSE
    NEW.es_reciente := FALSE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
CREATE TRIGGER trigger_calculate_incidencia_fields
  BEFORE INSERT OR UPDATE ON incidencias_recibidas
  FOR EACH ROW
  EXECUTE FUNCTION calculate_incidencia_fields();

-- Insertar datos de ejemplo para incidencias principales
INSERT INTO incidencias (
  clase_incidencia, numero, estado, tipo_estado, fecha, tienda, nombre_tienda,
  proveedor, nombre_proveedor, marca, telefono_cliente, cliente, nombre_cliente,
  descripcion, solucion, fecha_alta
) VALUES 
(
  'GARANTIA', 'INC001', 'ABIERTO', 'PENDIENTE', '2024-01-15',
  'T001', 'Tienda Centro', 'P001', 'Proveedor ABC', 'Samsung',
  '666123456', 'C001', 'Juan Pérez García',
  'Televisor no enciende después de tormenta eléctrica',
  'Pendiente de revisión técnica', '2024-01-10'
),
(
  'DEVOLUCION', 'INC002', 'CERRADO', 'RESUELTO', '2024-01-20',
  'T002', 'Tienda Norte', 'P002', 'Proveedor XYZ', 'LG',
  '677987654', 'C002', 'María López Ruiz',
  'Frigorífico hace ruido excesivo',
  'Sustituido por unidad nueva', '2024-01-18'
),
(
  'REPARACION', 'INC003', 'ABIERTO', 'EN_PROCESO', '2024-01-25',
  'T001', 'Tienda Centro', 'P003', 'Proveedor DEF', 'Bosch',
  '688456789', 'C003', 'Carlos Martín Sánchez',
  'Lavavajillas no desagua correctamente',
  'En proceso de reparación', '2023-12-20'
);

-- Insertar datos de ejemplo para incidencias recibidas
INSERT INTO incidencias_recibidas (
  documento, numero, fecha, cliente, poblacion, ruta,
  fecha_recepcion, fecha_incidencia, telefono1, incidencia, codigo_incidencia
) VALUES 
(
  'DOC001', 'REC001', '2024-01-28', 'Ana García López', 'Madrid',
  'RUTA_A', '2024-01-27', '2024-01-10', '699123456',
  'Problema con lavadora nueva', 'LAV001'
),
(
  'DOC002', 'REC002', '2024-01-28', 'Pedro Rodríguez', 'Barcelona',
  'RUTA_B', '2024-01-26', '2024-01-25', '677456789',
  'Microondas no calienta', 'MIC001'
),
(
  'DOC003', 'REC003', '2024-01-28', 'Laura Fernández', 'Valencia',
  'RUTA_C', '2024-01-28', '2024-01-05', '688789123',
  'Nevera hace ruido', 'NEV001'
);

-- Verificar que las tablas se crearon correctamente
SELECT 'incidencias' as tabla, count(*) as registros FROM incidencias
UNION ALL
SELECT 'incidencias_recibidas' as tabla, count(*) as registros FROM incidencias_recibidas;
