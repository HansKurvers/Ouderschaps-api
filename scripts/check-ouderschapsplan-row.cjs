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

async function checkOuderschapsplanRow() {
    try {
        await sql.connect(config);
        
        console.log('=== Checking ouderschapsplan_info for dossier_id 1005 ===\n');
        
        // First, let's confirm what the actual dossier ID is for dossier nummer 1005
        const dossierCheck = await sql.query`
            SELECT id, dossier_nummer 
            FROM dbo.dossiers 
            WHERE dossier_nummer = '1005'`;
        
        console.log('Dossier lookup:');
        console.table(dossierCheck.recordset);
        
        const actualDossierId = dossierCheck.recordset[0]?.id;
        console.log('\nActual dossier ID for nummer 1005:', actualDossierId);
        
        // Count query - using the string '1005' (might be the issue!)
        console.log('\n--- Query 1: Count with dossier_id = 1005 (as number) ---');
        const count1 = await sql.query`
            SELECT COUNT(*) as row_count
            FROM dbo.ouderschapsplan_info
            WHERE dossier_id = 1005`;
        
        console.log('Row count where dossier_id = 1005:', count1.recordset[0].row_count);
        
        // Count query - using the actual dossier ID
        console.log('\n--- Query 2: Count with actual dossier_id ---');
        const count2 = await sql.query`
            SELECT COUNT(*) as row_count
            FROM dbo.ouderschapsplan_info
            WHERE dossier_id = ${actualDossierId}`;
        
        console.log('Row count where dossier_id =', actualDossierId + ':', count2.recordset[0].row_count);
        
        // Get all data - using 1005
        console.log('\n--- Query 3: All data where dossier_id = 1005 ---');
        const data1 = await sql.query`
            SELECT *
            FROM dbo.ouderschapsplan_info
            WHERE dossier_id = 1005`;
        
        if (data1.recordset.length > 0) {
            console.table(data1.recordset);
        } else {
            console.log('NO ROWS FOUND for dossier_id = 1005');
        }
        
        // Get all data - using actual ID
        console.log('\n--- Query 4: All data where dossier_id = actual ID ---');
        const data2 = await sql.query`
            SELECT *
            FROM dbo.ouderschapsplan_info
            WHERE dossier_id = ${actualDossierId}`;
        
        if (data2.recordset.length > 0) {
            console.table(data2.recordset);
        } else {
            console.log('NO ROWS FOUND for dossier_id =', actualDossierId);
        }
        
        // Let's also check ALL ouderschapsplan_info records
        console.log('\n--- ALL ouderschapsplan_info records ---');
        const allRecords = await sql.query`
            SELECT opi.id, opi.dossier_id, d.dossier_nummer, opi.gezag_partij
            FROM dbo.ouderschapsplan_info opi
            LEFT JOIN dbo.dossiers d ON d.id = opi.dossier_id
            ORDER BY opi.id DESC`;
        
        console.table(allRecords.recordset);
        
    } catch (err) {
        console.error('Database error:', err);
    } finally {
        await sql.close();
    }
}

checkOuderschapsplanRow();