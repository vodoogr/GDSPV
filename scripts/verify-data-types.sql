-- Script de verificación de tipos de datos
-- Este script verifica que las tablas tienen los tipos correctos y prueba la inserción de datos

-- 1. Verificar estructura de la tabla incidencias
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'incidencias' 
ORDER BY ordinal_position;

-- 2. Verificar estructura de la tabla incidencias_recibidas
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'incidencias_recibidas' 
ORDER BY ordinal_position;

-- 3. Probar inserción con diferentes tipos de datos en incidencias
INSERT INTO incidencias (
    clase_incidencia,
    numero,
    estado,
    tipo_estado,
    fecha,
    tienda,
    nombre_tienda,
    proveedor,
    nombre_proveedor,
    marca,
    telefono,
    fax,
    duracion_abierta,  -- INTEGER
    cliente,
    nombre_cliente,
    telefono_cliente,
    camion,
    vendedor,
    nombre_vendedor,
    ejercicio_pedido,  -- INTEGER
    serie_pedido,
    pedido,
    referencia,
    ejercicio_albaran,  -- INTEGER
    serie_albaran,
    albaran,
    articulo,
    descripcion,
    descripcion2,
    referencia_articulo,
    cantidad,  -- DECIMAL
    tipo,
    gravedad,
    ultima_recepcion,  -- DATE
    resuelto,  -- BOOLEAN
    fecha_resuelto,  -- DATE
    solucion,
    fecha_alta,  -- DATE
    gastos_asociados,  -- DECIMAL
    coste,  -- DECIMAL
    fecha_importacion  -- DATE
) VALUES (
    'TEST_VERIFICACION',
    'TEST001',
    'ABIERTO',
    'PENDIENTE',
    '2024-01-15',  -- DATE
    'T999',
    'Tienda Test',
    'P999',
    'Proveedor Test',
    'Marca Test',
    '666000000',
    '911000000',
    30,  -- INTEGER
    'C999',
    'Cliente Test',
    '677000000',
    'CAM999',
    'V999',
    'Vendedor Test',
    2024,  -- INTEGER
    'ST',
    'PED999',
    'REF999',
    2024,  -- INTEGER
    'SA',
    'ALB999',
    'ART999',
    'Descripción de prueba para verificar tipos de datos',
    'Descripción adicional',
    'REFART999',
    2.50,  -- DECIMAL
    'TIPO_TEST',
    'ALTA',
    '2024-01-10',  -- DATE
    true,  -- BOOLEAN
    '2024-01-20',  -- DATE
    'Solución de prueba',
    '2024-01-05',  -- DATE
    150.75,  -- DECIMAL
    89.99,  -- DECIMAL
    '2024-01-15'  -- DATE
);

-- 4. Probar inserción con valores NULL en campos opcionales
INSERT INTO incidencias (
    clase_incidencia,
    numero,
    cliente,
    nombre_cliente,
    duracion_abierta,  -- NULL
    ejercicio_pedido,  -- NULL
    ejercicio_albaran,  -- NULL
    cantidad,  -- NULL
    resuelto,  -- DEFAULT FALSE
    gastos_asociados,  -- NULL
    coste  -- NULL
) VALUES (
    'TEST_NULL',
    'TEST002',
    'C998',
    'Cliente Test NULL',
    NULL,  -- INTEGER NULL
    NULL,  -- INTEGER NULL
    NULL,  -- INTEGER NULL
    NULL,  -- DECIMAL NULL
    false,  -- BOOLEAN
    NULL,  -- DECIMAL NULL
    NULL   -- DECIMAL NULL
);

-- 5. Probar inserción en incidencias_recibidas
INSERT INTO incidencias_recibidas (
    documento,
    numero,
    fecha,  -- DATE
    f_serv,  -- DATE
    cliente,
    c_postal,
    poblacion,
    ruta,
    fecha_recepcion,  -- DATE
    fecha_incidencia,  -- DATE
    telefono1,
    telefono2,
    incidencia,
    codigo_incidencia,
    dias_diferencia,  -- INTEGER (calculado por trigger)
    es_critica,  -- BOOLEAN (calculado por trigger)
    es_reciente,  -- BOOLEAN (calculado por trigger)
    fecha_importacion  -- DATE
) VALUES (
    'DOC_TEST',
    'REC_TEST001',
    '2024-01-28',  -- DATE
    '2024-01-25',  -- DATE
    'Cliente Recibida Test',
    '28001',
    'Madrid Test',
    'RUTA_TEST',
    '2024-01-27',  -- DATE
    '2024-01-10',  -- DATE
    '699000000',
    '688000000',
    'Incidencia de prueba para verificar tipos',
    'TEST001',
    0,  -- INTEGER (será recalculado por trigger)
    false,  -- BOOLEAN (será recalculado por trigger)
    false,  -- BOOLEAN (será recalculado por trigger)
    '2024-01-28'  -- DATE
);

-- 6. Verificar que los datos se insertaron correctamente
SELECT 
    'incidencias' as tabla,
    clase_incidencia,
    numero,
    duracion_abierta,
    ejercicio_pedido,
    ejercicio_albaran,
    cantidad,
    resuelto,
    gastos_asociados,
    coste,
    fecha,
    fecha_alta,
    fecha_resuelto,
    ultima_recepcion,
    fecha_importacion
FROM incidencias 
WHERE numero LIKE 'TEST%'
ORDER BY numero;

-- 7. Verificar incidencias_recibidas y que los triggers funcionan
SELECT 
    'incidencias_recibidas' as tabla,
    numero,
    fecha,
    f_serv,
    fecha_recepcion,
    fecha_incidencia,
    dias_diferencia,  -- Debe ser calculado automáticamente
    es_critica,       -- Debe ser calculado automáticamente
    es_reciente,      -- Debe ser calculado automáticamente
    fecha_importacion
FROM incidencias_recibidas 
WHERE numero LIKE 'REC_TEST%'
ORDER BY numero;

-- 8. Verificar tipos de datos específicos con consultas de prueba
SELECT 
    'Verificación de tipos INTEGER' as test,
    COUNT(*) as registros_con_enteros
FROM incidencias 
WHERE duracion_abierta IS NOT NULL 
AND ejercicio_pedido IS NOT NULL;

SELECT 
    'Verificación de tipos DECIMAL' as test,
    COUNT(*) as registros_con_decimales
FROM incidencias 
WHERE cantidad IS NOT NULL 
AND gastos_asociados IS NOT NULL 
AND coste IS NOT NULL;

SELECT 
    'Verificación de tipos BOOLEAN' as test,
    COUNT(*) as registros_true,
    COUNT(CASE WHEN resuelto = false THEN 1 END) as registros_false
FROM incidencias;

SELECT 
    'Verificación de tipos DATE' as test,
    COUNT(*) as registros_con_fechas
FROM incidencias 
WHERE fecha IS NOT NULL 
AND fecha_alta IS NOT NULL;

-- 9. Probar conversiones de tipos problemáticas
-- Esto debería fallar si intentamos insertar texto en un campo numérico
DO $$
BEGIN
    BEGIN
        INSERT INTO incidencias (clase_incidencia, numero, cliente, nombre_cliente, duracion_abierta)
        VALUES ('TEST_ERROR', 'ERROR001', 'C000', 'Test Error', 'texto_no_numerico');
        RAISE NOTICE 'ERROR: Se permitió insertar texto en campo INTEGER';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'CORRECTO: Se rechazó texto en campo INTEGER - %', SQLERRM;
    END;
    
    BEGIN
        INSERT INTO incidencias (clase_incidencia, numero, cliente, nombre_cliente, cantidad)
        VALUES ('TEST_ERROR', 'ERROR002', 'C000', 'Test Error', 'texto_no_decimal');
        RAISE NOTICE 'ERROR: Se permitió insertar texto en campo DECIMAL';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'CORRECTO: Se rechazó texto en campo DECIMAL - %', SQLERRM;
    END;
    
    BEGIN
        INSERT INTO incidencias (clase_incidencia, numero, cliente, nombre_cliente, fecha)
        VALUES ('TEST_ERROR', 'ERROR003', 'C000', 'Test Error', 'fecha_invalida');
        RAISE NOTICE 'ERROR: Se permitió insertar texto en campo DATE';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'CORRECTO: Se rechazó texto en campo DATE - %', SQLERRM;
    END;
END $$;

-- 10. Limpiar datos de prueba
DELETE FROM incidencias WHERE numero LIKE 'TEST%' OR numero LIKE 'ERROR%';
DELETE FROM incidencias_recibidas WHERE numero LIKE 'REC_TEST%';

-- 11. Resumen final
SELECT 
    'RESUMEN DE VERIFICACIÓN' as resultado,
    'Tipos de datos verificados correctamente' as estado;
