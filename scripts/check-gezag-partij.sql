-- Check gezag_partij values in the database
SELECT
    opi.id,
    opi.dossier_id,
    opi.gezag_partij,
    opi.gezag_termijn_weken,
    opi.created_at,
    opi.updated_at,
    CASE
        WHEN opi.gezag_partij IS NULL THEN 'NULL - DIT IS HET PROBLEEM'
        WHEN opi.gezag_partij = 1 THEN '1 - Gezamenlijk gezag'
        WHEN opi.gezag_partij = 2 THEN '2 - Alleen gezag - Partij 1'
        WHEN opi.gezag_partij = 3 THEN '3 - Alleen gezag - Partij 2'
        WHEN opi.gezag_partij = 4 THEN '4 - Alleen gezag - Partij 1 (tijdelijk)'
        WHEN opi.gezag_partij = 5 THEN '5 - Alleen gezag - Partij 2 (tijdelijk)'
        ELSE CAST(opi.gezag_partij AS VARCHAR) + ' - ONVERWACHTE WAARDE'
    END as gezag_status,
    d.dossier_nummer
FROM dbo.ouderschapsplan_info opi
INNER JOIN dbo.dossiers d ON d.id = opi.dossier_id
ORDER BY opi.id DESC;

-- Check column data type and constraints
SELECT 
    c.COLUMN_NAME,
    c.DATA_TYPE,
    c.IS_NULLABLE,
    c.COLUMN_DEFAULT,
    c.CHARACTER_MAXIMUM_LENGTH,
    c.NUMERIC_PRECISION,
    c.NUMERIC_SCALE
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.TABLE_NAME = 'ouderschapsplan_info'
AND c.COLUMN_NAME = 'gezag_partij';

-- Count NULL vs populated values
SELECT 
    COUNT(*) as total_records,
    COUNT(gezag_partij) as records_with_value,
    COUNT(*) - COUNT(gezag_partij) as records_with_null,
    CAST(COUNT(gezag_partij) AS FLOAT) / COUNT(*) * 100 as percentage_populated
FROM dbo.ouderschapsplan_info;

-- Group by gezag_partij values to see distribution
SELECT 
    COALESCE(CAST(gezag_partij AS VARCHAR), 'NULL') as gezag_value,
    COUNT(*) as count
FROM dbo.ouderschapsplan_info
GROUP BY gezag_partij
ORDER BY gezag_partij;