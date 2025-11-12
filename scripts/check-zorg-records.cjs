const sql = require('mssql');
require('dotenv').config();

async function checkZorgRecords() {
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

        // Check for records with situatie_anders field filled
        console.log('=== ZORG RECORDS WITH SITUATIE_ANDERS ===\n');
        const withAnders = await pool.request().query(`
            SELECT TOP 20
                z.id,
                z.dossier_id,
                zc.naam as categorie,
                zs.naam as situatie,
                z.situatie_anders,
                LEFT(z.overeenkomst, 100) as overeenkomst_preview
            FROM dbo.zorg z
            INNER JOIN dbo.zorg_categorieen zc ON z.zorg_categorie_id = zc.id
            INNER JOIN dbo.zorg_situaties zs ON z.zorg_situatie_id = zs.id
            WHERE z.situatie_anders IS NOT NULL AND z.situatie_anders != ''
            ORDER BY z.id DESC
        `);

        if (withAnders.recordset.length > 0) {
            console.log(`Found ${withAnders.recordset.length} records with situatie_anders:`);
            for (const rec of withAnders.recordset) {
                console.log(`\nID ${rec.id} (Dossier ${rec.dossier_id}):`);
                console.log(`  Categorie: ${rec.categorie}`);
                console.log(`  Situatie: ${rec.situatie}`);
                console.log(`  Anders: "${rec.situatie_anders}"`);
                console.log(`  Overeenkomst: ${rec.overeenkomst_preview}...`);
            }
        } else {
            console.log('No records found with situatie_anders filled');
        }

        // Check for feestdagen records specifically
        console.log('\n\n=== ZORG RECORDS FOR FEESTDAGEN (Category 9) ===\n');
        const feestdagen = await pool.request().query(`
            SELECT
                z.id,
                z.dossier_id,
                zs.naam as situatie,
                z.situatie_anders,
                LEFT(z.overeenkomst, 100) as overeenkomst_preview,
                z.aangemaakt_op
            FROM dbo.zorg z
            INNER JOIN dbo.zorg_situaties zs ON z.zorg_situatie_id = zs.id
            WHERE z.zorg_categorie_id = 9
            ORDER BY z.aangemaakt_op DESC
        `);

        if (feestdagen.recordset.length > 0) {
            console.log(`Found ${feestdagen.recordset.length} feestdagen records:`);
            for (const rec of feestdagen.recordset) {
                console.log(`\nID ${rec.id} (Dossier ${rec.dossier_id}):`);
                console.log(`  Situatie: ${rec.situatie}`);
                if (rec.situatie_anders) {
                    console.log(`  Anders: "${rec.situatie_anders}"`);
                }
                console.log(`  Created: ${rec.aangemaakt_op}`);
            }
        } else {
            console.log('No feestdagen records found');
        }

        // Check for dossier 69 specifically (from the error)
        console.log('\n\n=== ZORG RECORDS FOR DOSSIER 69 ===\n');
        const dossier69 = await pool.request().query(`
            SELECT
                z.id,
                zc.naam as categorie,
                zs.naam as situatie,
                z.situatie_anders,
                LEFT(z.overeenkomst, 50) as overeenkomst_preview
            FROM dbo.zorg z
            INNER JOIN dbo.zorg_categorieen zc ON z.zorg_categorie_id = zc.id
            INNER JOIN dbo.zorg_situaties zs ON z.zorg_situatie_id = zs.id
            WHERE z.dossier_id = 69
            ORDER BY zc.naam, zs.naam
        `);

        if (dossier69.recordset.length > 0) {
            console.log(`Found ${dossier69.recordset.length} records for dossier 69:`);
            for (const rec of dossier69.recordset) {
                console.log(`  [${rec.id}] ${rec.categorie} > ${rec.situatie}`);
                if (rec.situatie_anders) {
                    console.log(`       Anders: "${rec.situatie_anders}"`);
                }
            }
        } else {
            console.log('No records found for dossier 69');
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

checkZorgRecords();
