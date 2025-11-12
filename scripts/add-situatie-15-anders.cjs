const sql = require('mssql');
require('dotenv').config();

async function addSituatie15() {
    try {
        const config = {
            server: process.env.DB_SERVER || '',
            database: process.env.DB_DATABASE || '',
            user: process.env.DB_USER || '',
            password: process.env.DB_PASSWORD || '',
            options: {
                encrypt: true,
                trustServerCertificate: false,
                enableArithAbort: true,
                connectionTimeout: 30000,
                requestTimeout: 30000,
            },
            pool: {
                max: 10,
                min: 0,
                idleTimeoutMillis: 30000,
            },
        };

        console.log('Connecting to database...');
        const pool = await sql.connect(config);
        console.log('✅ Connected!\n');

        // First, verify ID 15 doesn't exist
        console.log('=== CHECKING IF ID 15 EXISTS ===\n');
        const check = await pool.request().query(`
            SELECT id FROM dbo.zorg_situaties WHERE id = 15
        `);

        if (check.recordset.length > 0) {
            console.log('⚠️  ID 15 already exists! No action needed.');
            await pool.close();
            return;
        }

        console.log('ID 15 does not exist. Proceeding with insert...\n');

        // Execute IDENTITY_INSERT and INSERT in one batch
        console.log('=== INSERTING ID 15 WITH IDENTITY_INSERT ===\n');
        console.log('Record details:');
        console.log('  ID: 15');
        console.log('  Naam: Anders');
        console.log('  Categorie ID: NULL (universal - works for all categories)\n');

        const insertQuery = `
            SET IDENTITY_INSERT dbo.zorg_situaties ON;

            INSERT INTO dbo.zorg_situaties (id, naam, zorg_categorie_id)
            VALUES (15, 'Anders', NULL);

            SET IDENTITY_INSERT dbo.zorg_situaties OFF;
        `;

        await pool.request().query(insertQuery);

        console.log('✅ Record inserted successfully!\n');

        // Verify the insert
        console.log('=== VERIFYING INSERT ===\n');
        const verify = await pool.request().query(`
            SELECT id, naam, zorg_categorie_id
            FROM dbo.zorg_situaties
            WHERE id = 15
        `);

        if (verify.recordset.length > 0) {
            const rec = verify.recordset[0];
            console.log('✅ VERIFICATION SUCCESSFUL:');
            console.log(`   ID: ${rec.id}`);
            console.log(`   Naam: ${rec.naam}`);
            console.log(`   Categorie ID: ${rec.zorg_categorie_id || 'NULL (universal)'}`);
        } else {
            console.log('❌ VERIFICATION FAILED - Record not found after insert!');
        }

        await pool.close();
        console.log('\n🎉 Migration complete! ID 15 is now available for frontend.');
        console.log('\n📝 Note: This "Anders" situatie can be used with ANY category because zorg_categorie_id is NULL.');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.originalError) {
            console.error('Original Error:', error.originalError.message);
        }
        process.exit(1);
    }
}

addSituatie15();
