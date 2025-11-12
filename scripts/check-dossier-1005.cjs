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

async function checkDossier1005() {
    try {
        await sql.connect(config);
        
        console.log('=== Checking dossier 1005 ===\n');
        
        // First check if dossier 1005 exists
        const dossierResult = await sql.query`
            SELECT id, dossier_nummer, status, aangemaakt_op, gewijzigd_op
            FROM dbo.dossiers
            WHERE dossier_nummer = '1005'`;
        
        if (dossierResult.recordset.length === 0) {
            console.log('Dossier 1005 not found!');
            return;
        }
        
        console.log('Dossier 1005 found:');
        console.table(dossierResult.recordset);
        
        const dossierId = dossierResult.recordset[0].id;
        
        // Check ouderschapsplan_info for this dossier
        const infoResult = await sql.query`
            SELECT
                opi.*,
                CASE
                    WHEN opi.gezag_partij IS NULL THEN 'NULL - DIT IS HET PROBLEEM'
                    WHEN opi.gezag_partij = 1 THEN '1 - Gezamenlijk gezag'
                    WHEN opi.gezag_partij = 2 THEN '2 - Alleen gezag - Partij 1'
                    WHEN opi.gezag_partij = 3 THEN '3 - Alleen gezag - Partij 2'
                    WHEN opi.gezag_partij = 4 THEN '4 - Alleen gezag - Partij 1 (tijdelijk)'
                    WHEN opi.gezag_partij = 5 THEN '5 - Alleen gezag - Partij 2 (tijdelijk)'
                    ELSE CAST(opi.gezag_partij AS VARCHAR) + ' - ONVERWACHTE WAARDE'
                END as gezag_status
            FROM dbo.ouderschapsplan_info opi
            WHERE opi.dossier_id = ${dossierId}`;
        
        if (infoResult.recordset.length === 0) {
            console.log('\nNo ouderschapsplan_info found for dossier 1005');
        } else {
            console.log('\nOuderschapsplan info for dossier 1005:');
            console.log('ID:', infoResult.recordset[0].id);
            console.log('Dossier ID:', infoResult.recordset[0].dossier_id);
            console.log('Gezag Partij:', infoResult.recordset[0].gezag_partij);
            console.log('Gezag Status:', infoResult.recordset[0].gezag_status);
            console.log('Gezag Termijn Weken:', infoResult.recordset[0].gezag_termijn_weken);
            console.log('Created:', infoResult.recordset[0].created_at);
            console.log('Updated:', infoResult.recordset[0].updated_at);
            
            // Show all non-null fields
            console.log('\nNon-null fields in ouderschapsplan_info:');
            const record = infoResult.recordset[0];
            Object.keys(record).forEach(key => {
                if (record[key] !== null && key !== 'gezag_status') {
                    console.log(`  ${key}: ${record[key]}`);
                }
            });
        }
        
        // Also check what's in dossiers table
        console.log('\n=== All current dossiers ===');
        const allDossiers = await sql.query`
            SELECT d.id, d.dossier_nummer, d.status, d.aangemaakt_op,
                   COUNT(opi.id) as has_ouderschapsplan_info
            FROM dbo.dossiers d
            LEFT JOIN dbo.ouderschapsplan_info opi ON opi.dossier_id = d.id
            GROUP BY d.id, d.dossier_nummer, d.status, d.aangemaakt_op
            ORDER BY d.dossier_nummer DESC`;
        
        console.table(allDossiers.recordset);
        
    } catch (err) {
        console.error('Database error:', err);
    } finally {
        await sql.close();
    }
}

checkDossier1005();