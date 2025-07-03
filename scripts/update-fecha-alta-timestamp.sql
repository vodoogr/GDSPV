-- Script para actualizar la columna fecha_alta a formato TIMESTAMP
-- Esto permitirá almacenar fecha y hora correctamente

-- 1. Verificar el tipo actual de la columna fecha_alta
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'incidencias' 
AND column_name = 'fecha_alta';

-- 2. Cambiar el tipo de datos de fecha_alta a TIMESTAMP
ALTER TABLE incidencias 
ALTER COLUMN fecha_alta TYPE TIMESTAMP USING fecha_alta::TIMESTAMP;

-- 3. Verificar el cambio
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'incidencias' 
AND column_name = 'fecha_alta';

-- 4. Crear función para calcular tiempo promedio de apertura
CREATE OR REPLACE FUNCTION get_tiempo_promedio_apertura()
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
    AND fecha_alta > fecha; -- Solo considerar casos donde fecha_alta es posterior a fecha
END;
$$ LANGUAGE plpgsql;

-- 5. Probar la función
SELECT * FROM get_tiempo_promedio_apertura();

-- 6. Mostrar algunas incidencias con fecha_alta para verificar
SELECT 
    numero,
    clase_incidencia,
    fecha,
    fecha_alta,
    CASE 
        WHEN fecha_alta IS NOT NULL AND fecha IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (fecha_alta - fecha)) / 3600 
        ELSE NULL 
    END as horas_apertura
FROM incidencias 
WHERE fecha_alta IS NOT NULL 
ORDER BY fecha_alta DESC 
LIMIT 10;
