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

async function fixGezagPartijNulls() {
    try {
        await sql.connect(config);
        
        console.log('=== Fixing gezag_partij NULL values ===\n');
        
        // First, show what we're going to fix
        const checkResult = await sql.query`
            SELECT
                opi.id,
                opi.dossier_id,
                d.dossier_nummer,
                opi.gezag_partij,
                opi.created_at,
                opi.updated_at
            FROM dbo.ouderschapsplan_info opi
            INNER JOIN dbo.dossiers d ON d.id = opi.dossier_id
            WHERE opi.gezag_partij IS NULL`;
        
        if (checkResult.recordset.length === 0) {
            console.log('No records with NULL gezag_partij found. Nothing to fix!');
            return;
        }
        
        console.log(`Found ${checkResult.recordset.length} records with NULL gezag_partij:`);
        console.table(checkResult.recordset);
        
        console.log('\nTo fix these records manually, you can run this SQL:');
        console.log('-- Set to 1 for "Gezamenlijk gezag" (most common default)');
        console.log('UPDATE dbo.ouderschapsplan_info SET gezag_partij = 1 WHERE gezag_partij IS NULL;\n');
        
        console.log('-- Or update specific records:');
        checkResult.recordset.forEach(record => {
            console.log(`-- For dossier ${record.dossier_nummer} (ID: ${record.id})`);
            console.log(`UPDATE dbo.ouderschapsplan_info SET gezag_partij = 2 WHERE id = ${record.id}; -- Set to desired value (1-5)`);
        });
        
        console.log('\n=== Preventing future NULL values ===\n');
        console.log('To prevent this issue in the future, consider:');
        console.log('1. Adding a DEFAULT constraint to the database:');
        console.log('   ALTER TABLE dbo.ouderschapsplan_info ADD CONSTRAINT DF_gezag_partij DEFAULT 1 FOR gezag_partij;\n');
        
        console.log('2. Or making the field NOT NULL with a default:');
        console.log('   -- First update existing NULLs');
        console.log('   UPDATE dbo.ouderschapsplan_info SET gezag_partij = 1 WHERE gezag_partij IS NULL;');
        console.log('   -- Then alter the column');
        console.log('   ALTER TABLE dbo.ouderschapsplan_info ALTER COLUMN gezag_partij TINYINT NOT NULL;');
        
    } catch (err) {
        console.error('Database error:', err);
    } finally {
        await sql.close();
    }
}

fixGezagPartijNulls();