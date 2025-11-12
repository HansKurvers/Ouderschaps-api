const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

async function checkGezagPartij() {
    try {
        await sql.connect(config);
        
        console.log('=== Checking gezag_partij values in ouderschapsplan_info ===\n');
        
        // Query 1: Check all records with gezag_partij status
        const result1 = await sql.query`
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
            ORDER BY opi.id DESC`;
        
        console.log('Recent records:');
        console.table(result1.recordset.slice(0, 10));
        
        // Query 2: Check column data type
        const result2 = await sql.query`
            SELECT 
                c.COLUMN_NAME,
                c.DATA_TYPE,
                c.IS_NULLABLE,
                c.COLUMN_DEFAULT,
                c.NUMERIC_PRECISION,
                c.NUMERIC_SCALE
            FROM INFORMATION_SCHEMA.COLUMNS c
            WHERE c.TABLE_NAME = 'ouderschapsplan_info'
            AND c.COLUMN_NAME = 'gezag_partij'`;
        
        console.log('\nColumn information for gezag_partij:');
        console.table(result2.recordset);
        
        // Query 3: Count NULL vs populated values
        const result3 = await sql.query`
            SELECT 
                COUNT(*) as total_records,
                COUNT(gezag_partij) as records_with_value,
                COUNT(*) - COUNT(gezag_partij) as records_with_null,
                CAST(COUNT(gezag_partij) AS FLOAT) / COUNT(*) * 100 as percentage_populated
            FROM dbo.ouderschapsplan_info`;
        
        console.log('\nNull value statistics:');
        console.table(result3.recordset);
        
        // Query 4: Group by gezag_partij values
        const result4 = await sql.query`
            SELECT 
                COALESCE(CAST(gezag_partij AS VARCHAR), 'NULL') as gezag_value,
                COUNT(*) as count
            FROM dbo.ouderschapsplan_info
            GROUP BY gezag_partij
            ORDER BY gezag_partij`;
        
        console.log('\nDistribution of gezag_partij values:');
        console.table(result4.recordset);
        
        // Additional check: Find records where gezag_partij is NULL but partij data exists
        const result5 = await sql.query`
            SELECT TOP 5
                opi.id,
                opi.dossier_id,
                d.dossier_nummer,
                opi.gezag_partij,
                opi.partij_1_persoon_id,
                opi.partij_2_persoon_id,
                opi.created_at,
                opi.updated_at
            FROM dbo.ouderschapsplan_info opi
            INNER JOIN dbo.dossiers d ON d.id = opi.dossier_id
            WHERE opi.gezag_partij IS NULL
            AND opi.partij_1_persoon_id IS NOT NULL
            AND opi.partij_2_persoon_id IS NOT NULL
            ORDER BY opi.created_at DESC`;
        
        if (result5.recordset.length > 0) {
            console.log('\n⚠️  PROBLEEM GEVONDEN: Records met partij data maar zonder gezag_partij:');
            console.table(result5.recordset);
        }
        
    } catch (err) {
        console.error('Database error:', err);
    } finally {
        await sql.close();
    }
}

checkGezagPartij();