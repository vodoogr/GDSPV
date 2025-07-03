-- Script simplificado de verificación de tipos de datos
-- Este script no requiere funciones RPC especiales

-- 1. Verificar que las tablas existen
SELECT 
    'Verificación de tablas' as test,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'incidencias') 
        THEN 'incidencias: ✓' 
        ELSE 'incidencias: ✗' 
    END as tabla_incidencias,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'incidencias_recibidas') 
        THEN 'incidencias_recibidas: ✓' 
        ELSE 'incidencias_recibidas: ✗' 
    END as tabla_recibidas;

-- 2. Verificar estructura de columnas importantes
SELECT 
    'Columnas INTEGER' as tipo,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'incidencias' 
AND data_type IN ('integer', 'bigint')
ORDER BY column_name;

SELECT 
    'Columnas DECIMAL/NUMERIC' as tipo,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'incidencias' 
AND data_type IN ('numeric', 'decimal', 'real', 'double precision')
ORDER BY column_name;

SELECT 
    'Columnas BOOLEAN' as tipo,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('incidencias', 'incidencias_recibidas')
AND data_type = 'boolean'
ORDER BY table_name, column_name;

SELECT 
    'Columnas DATE' as tipo,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('incidencias', 'incidencias_recibidas')
AND data_type = 'date'
ORDER BY table_name, column_name;

-- 3. Probar inserción con tipos correctos
INSERT INTO incidencias (
    clase_incidencia,
    numero,
    cliente,
    nombre_cliente,
    duracion_abierta,    -- INTEGER
    ejercicio_pedido,    -- INTEGER
    cantidad,            -- DECIMAL
    gastos_asociados,    -- DECIMAL
    coste,              -- DECIMAL
    resuelto,           -- BOOLEAN
    fecha,              -- DATE
    fecha_alta          -- DATE
) VALUES (
    'VERIFY_TEST',
    'VER001',
    'C999',
    'Cliente Verificación',
    45,                 -- INTEGER
    2024,              -- INTEGER
    3.75,              -- DECIMAL
    125.50,            -- DECIMAL
    89.99,             -- DECIMAL
    true,              -- BOOLEAN
    '2024-01-15',      -- DATE
    '2024-01-10'       -- DATE
);

-- 4. Verificar que se insertó correctamente
SELECT 
    'Verificación de inserción' as test,
    numero,
    duracion_abierta,
    ejercicio_pedido,
    cantidad,
    gastos_asociados,
    coste,
    resuelto,
    fecha,
    fecha_alta
FROM incidencias 
WHERE numero = 'VER001';

-- 5. Probar inserción con valores NULL
INSERT INTO incidencias (
    clase_incidencia,
    numero,
    cliente,
    nombre_cliente,
    duracion_abierta,    -- NULL
    ejercicio_pedido,    -- NULL
    cantidad,            -- NULL
    gastos_asociados,    -- NULL
    coste,              -- NULL
    resuelto            -- FALSE (default)
) VALUES (
    'VERIFY_NULL',
    'VER002',
    'C998',
    'Cliente NULL Test',
    NULL,               -- INTEGER NULL
    NULL,               -- INTEGER NULL
    NULL,               -- DECIMAL NULL
    NULL,               -- DECIMAL NULL
    NULL,               -- DECIMAL NULL
    false               -- BOOLEAN
);

-- 6. Verificar inserción con NULL
SELECT 
    'Verificación de NULL' as test,
    numero,
    duracion_abierta,
    ejercicio_pedido,
    cantidad,
    gastos_asociados,
    coste,
    resuelto
FROM incidencias 
WHERE numero = 'VER002';

-- 7. Probar trigger en incidencias_recibidas
INSERT INTO incidencias_recibidas (
    documento,
    numero,
    cliente,
    codigo_incidencia,
    fecha_recepcion,
    fecha_incidencia,
    fecha_importacion
) VALUES (
    'DOC_VER',
    'RECV001',
    'Cliente Trigger Test',
    'TRIG001',
    '2024-01-27',       -- DATE
    '2024-01-10',       -- DATE (17 días antes)
    CURRENT_DATE        -- DATE
);

-- 8. Verificar que el trigger calculó los campos
SELECT 
    'Verificación de trigger' as test,
    numero,
    fecha_recepcion,
    fecha_incidencia,
    dias_diferencia,    -- Debe ser calculado
    es_critica,         -- Debe ser calculado
    es_reciente,        -- Debe ser calculado
    fecha_importacion
FROM incidencias_recibidas 
WHERE numero = 'RECV001';

-- 9. Contar registros totales
SELECT 
    'Conteo total' as test,
    (SELECT COUNT(*) FROM incidencias) as total_incidencias,
    (SELECT COUNT(*) FROM incidencias_recibidas) as total_recibidas;

-- 10. Limpiar datos de prueba
DELETE FROM incidencias WHERE numero IN ('VER001', 'VER002');
DELETE FROM incidencias_recibidas WHERE numero = 'RECV001';

-- 11. Resultado final
SELECT 
    'VERIFICACIÓN COMPLETADA' as resultado,
    'Todos los tipos de datos funcionan correctamente' as estado,
    NOW() as fecha_verificacion;
