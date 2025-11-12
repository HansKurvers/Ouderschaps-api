const sql = require('mssql');
require('dotenv').config();

async function checkSituatie15() {
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

        // Check for ID 15 specifically
        console.log('=== CHECKING FOR ZORG_SITUATIE ID 15 ===\n');
        const check15 = await pool.request().query(`
            SELECT id, naam, zorg_categorie_id
            FROM dbo.zorg_situaties
            WHERE id = 15
        `);

        if (check15.recordset.length > 0) {
            console.log('✅ ID 15 EXISTS:');
            const rec = check15.recordset[0];
            console.log(`   ID: ${rec.id}`);
            console.log(`   Naam: ${rec.naam}`);
            console.log(`   Categorie ID: ${rec.zorg_categorie_id || 'NULL (universal)'}`);
        } else {
            console.log('❌ ID 15 DOES NOT EXIST\n');
        }

        // Check all IDs around 15 to see the gap
        console.log('\n=== IDS AROUND 15 (10-20) ===\n');
        const checkRange = await pool.request().query(`
            SELECT
                zs.id,
                zs.naam,
                zs.zorg_categorie_id,
                zc.naam as categorie_naam
            FROM dbo.zorg_situaties zs
            LEFT JOIN dbo.zorg_categorieen zc ON zs.zorg_categorie_id = zc.id
            WHERE zs.id BETWEEN 10 AND 20
            ORDER BY zs.id
        `);

        for (const rec of checkRange.recordset) {
            console.log(`   ${rec.id}: ${rec.naam} (cat: ${rec.categorie_naam || 'NULL'})`);
        }

        // Check if there are any "Anders" or "Overige" situaties
        console.log('\n=== SEARCHING FOR "ANDERS" OR "OVERIGE" ===\n');
        const searchAnders = await pool.request().query(`
            SELECT
                zs.id,
                zs.naam,
                zs.zorg_categorie_id,
                zc.naam as categorie_naam
            FROM dbo.zorg_situaties zs
            LEFT JOIN dbo.zorg_categorieen zc ON zs.zorg_categorie_id = zc.id
            WHERE zs.naam LIKE '%anders%'
               OR zs.naam LIKE '%overige%'
               OR zs.naam LIKE '%overig%'
               OR zs.naam LIKE '%custom%'
            ORDER BY zs.id
        `);

        if (searchAnders.recordset.length > 0) {
            console.log('Found matching situaties:');
            for (const rec of searchAnders.recordset) {
                console.log(`   ${rec.id}: ${rec.naam} (cat: ${rec.categorie_naam || 'NULL'})`);
            }
        } else {
            console.log('❌ No "Anders" or "Overige" situaties found');
        }

        // Check highest ID
        console.log('\n=== HIGHEST SITUATIE ID ===\n');
        const maxId = await pool.request().query(`
            SELECT MAX(id) as max_id
            FROM dbo.zorg_situaties
        `);
        console.log(`Highest ID: ${maxId.recordset[0].max_id}`);

        await pool.close();
        console.log('\n✅ Done!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.originalError) {
            console.error('Original Error:', error.originalError.message);
        }
        process.exit(1);
    }
}

checkSituatie15();
