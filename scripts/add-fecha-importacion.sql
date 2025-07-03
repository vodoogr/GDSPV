-- Añadir columna fecha_importacion a la tabla incidencias si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'incidencias'
        AND column_name = 'fecha_importacion'
    ) THEN
        ALTER TABLE incidencias ADD COLUMN fecha_importacion DATE;
    END IF;
END $$;

-- Verificar que la columna se ha añadido
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'incidencias' 
AND column_name = 'fecha_importacion';
