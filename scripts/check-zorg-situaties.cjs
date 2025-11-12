const sql = require('mssql');
require('dotenv').config();

async function checkZorgSituaties() {
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

        // Get all zorg categories
        console.log('=== ZORG CATEGORIES ===\n');
        const categories = await pool.request().query('SELECT * FROM dbo.zorg_categorieen ORDER BY id');
        for (const cat of categories.recordset) {
            console.log(`${cat.id}: ${cat.naam}`);
        }

        console.log('\n=== ZORG SITUATIES ===\n');
        const situaties = await pool.request().query(`
            SELECT
                zs.id,
                zs.naam,
                zs.zorg_categorie_id,
                zc.naam as categorie_naam
            FROM dbo.zorg_situaties zs
            LEFT JOIN dbo.zorg_categorieen zc ON zs.zorg_categorie_id = zc.id
            ORDER BY zs.zorg_categorie_id, zs.id
        `);

        // Group by category
        const byCategory = {};
        for (const sit of situaties.recordset) {
            const catId = sit.zorg_categorie_id || 'NULL';
            if (!byCategory[catId]) {
                byCategory[catId] = [];
            }
            byCategory[catId].push(sit);
        }

        for (const [catId, items] of Object.entries(byCategory)) {
            console.log(`\n📂 Category ${catId} (${items[0].categorie_naam || 'Uncategorized'}):`);
            for (const item of items) {
                console.log(`   ${item.id}: ${item.naam}`);
            }
        }

        // Look for "feestdagen" or "overige" specifically
        console.log('\n=== SEARCH FOR FEESTDAGEN/OVERIGE ===\n');
        const search = await pool.request().query(`
            SELECT
                zs.id,
                zs.naam,
                zs.zorg_categorie_id,
                zc.naam as categorie_naam
            FROM dbo.zorg_situaties zs
            LEFT JOIN dbo.zorg_categorieen zc ON zs.zorg_categorie_id = zc.id
            WHERE zs.naam LIKE '%feest%' OR zs.naam LIKE '%overige%' OR zs.naam LIKE '%overig%'
            ORDER BY zs.id
        `);

        if (search.recordset.length > 0) {
            console.log('Found matching situaties:');
            for (const item of search.recordset) {
                console.log(`   ${item.id}: ${item.naam} (categorie: ${item.categorie_naam || 'NULL'})`);
            }
        } else {
            console.log('❌ No situaties found matching "feest" or "overige"');
        }

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

checkZorgSituaties();
