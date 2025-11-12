#!/usr/bin/env node

const sql = require('mssql');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Database configuration
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true
    }
};

async function addZorgregelingTemplatesVakantieBijzondere() {
    let pool;
    
    try {
        console.log('🔄 Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Database connected');
        
        // Add templates for Vakantie
        console.log('\n📋 Adding Vakantie templates...');
        
        // Get next sort_order for Vakantie
        const maxSortVakantie = await pool.request().query(`
            SELECT ISNULL(MAX(sort_order), 0) as maxSort 
            FROM dbo.regelingen_templates 
            WHERE type = 'Vakantie'
        `);
        const nextSortVakantie = maxSortVakantie.recordset[0].maxSort + 10;
        
        // Insert Vakantie enkelvoud
        await pool.request()
            .input('template_naam', sql.NVarChar, 'vakantie_volgens_zorgregeling')
            .input('template_tekst', sql.NVarChar, '{KIND} verblijft deze {VAKANTIE} waar {KIND} zou zijn volgens de wekelijkse zorgregeling.')
            .input('meervoud_kinderen', sql.Bit, 0)
            .input('type', sql.NVarChar, 'Vakantie')
            .input('sort_order', sql.Int, nextSortVakantie)
            .query(`
                INSERT INTO dbo.regelingen_templates 
                (template_naam, template_tekst, meervoud_kinderen, type, sort_order)
                VALUES 
                (@template_naam, @template_tekst, @meervoud_kinderen, @type, @sort_order)
            `);
        
        // Insert Vakantie meervoud
        await pool.request()
            .input('template_naam', sql.NVarChar, 'vakantie_volgens_zorgregeling_meervoud')
            .input('template_tekst', sql.NVarChar, '{KIND} verblijven deze {VAKANTIE} waar {KIND} zou zijn volgens de wekelijkse zorgregeling.')
            .input('meervoud_kinderen', sql.Bit, 1)
            .input('type', sql.NVarChar, 'Vakantie')
            .input('sort_order', sql.Int, nextSortVakantie)
            .query(`
                INSERT INTO dbo.regelingen_templates 
                (template_naam, template_tekst, meervoud_kinderen, type, sort_order)
                VALUES 
                (@template_naam, @template_tekst, @meervoud_kinderen, @type, @sort_order)
            `);
        
        console.log('✅ Vakantie templates added');
        
        // Add templates for each Bijzondere dag subtype
        console.log('\n📋 Adding Bijzondere dag templates...');
        
        const bijzondereSubtypes = [
            { subtype: 'vaderdag', feestdag: 'Vaderdag' },
            { subtype: 'moederdag', feestdag: 'Moederdag' },
            { subtype: 'verjaardag_kind', feestdag: 'verjaardag' },
            { subtype: 'verjaardag_partij1', feestdag: 'verjaardag' },
            { subtype: 'verjaardag_partij2', feestdag: 'verjaardag' },
            { subtype: 'bijzonder_jubileum', feestdag: 'jubileum' }
        ];
        
        for (const { subtype, feestdag } of bijzondereSubtypes) {
            // Get max sort_order for this subtype
            const maxSort = await pool.request()
                .input('subtype', sql.NVarChar, subtype)
                .query(`
                    SELECT ISNULL(MAX(sort_order), 0) as maxSort 
                    FROM dbo.regelingen_templates 
                    WHERE type = 'Bijzondere dag' AND template_subtype = @subtype
                `);
            const nextSort = maxSort.recordset[0].maxSort + 10;
            
            // Insert enkelvoud
            await pool.request()
                .input('template_naam', sql.NVarChar, `${subtype}_volgens_zorgregeling`)
                .input('template_tekst', sql.NVarChar, `{KIND} verblijft deze ${feestdag} waar {KIND} zou zijn volgens de wekelijkse zorgregeling.`)
                .input('meervoud_kinderen', sql.Bit, 0)
                .input('type', sql.NVarChar, 'Bijzondere dag')
                .input('template_subtype', sql.NVarChar, subtype)
                .input('sort_order', sql.Int, nextSort)
                .query(`
                    INSERT INTO dbo.regelingen_templates 
                    (template_naam, template_tekst, meervoud_kinderen, type, template_subtype, sort_order)
                    VALUES 
                    (@template_naam, @template_tekst, @meervoud_kinderen, @type, @template_subtype, @sort_order)
                `);
            
            // Insert meervoud
            await pool.request()
                .input('template_naam', sql.NVarChar, `${subtype}_volgens_zorgregeling_meervoud`)
                .input('template_tekst', sql.NVarChar, `{KIND} verblijven deze ${feestdag} waar {KIND} zou zijn volgens de wekelijkse zorgregeling.`)
                .input('meervoud_kinderen', sql.Bit, 1)
                .input('type', sql.NVarChar, 'Bijzondere dag')
                .input('template_subtype', sql.NVarChar, subtype)
                .input('sort_order', sql.Int, nextSort)
                .query(`
                    INSERT INTO dbo.regelingen_templates 
                    (template_naam, template_tekst, meervoud_kinderen, type, template_subtype, sort_order)
                    VALUES 
                    (@template_naam, @template_tekst, @meervoud_kinderen, @type, @template_subtype, @sort_order)
                `);
            
            console.log(`✅ Added templates for ${subtype}`);
        }
        
        // Show summary
        console.log('\n📊 Summary of templates per type:');
        const summary = await pool.request().query(`
            SELECT 
                type,
                template_subtype,
                COUNT(*) as count
            FROM dbo.regelingen_templates
            GROUP BY type, template_subtype
            ORDER BY type, template_subtype
        `);
        
        console.table(summary.recordset);
        
        console.log('\n✅ All templates successfully added!');
        console.log('   - Vakantie: Added "volgens zorgregeling" option');
        console.log('   - Bijzondere dagen: Added "volgens zorgregeling" for each subtype');
        
    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    } finally {
        if (pool) {
            await pool.close();
            console.log('\n🔒 Database connection closed');
        }
    }
}

// Run the script
addZorgregelingTemplatesVakantieBijzondere().catch(console.error);