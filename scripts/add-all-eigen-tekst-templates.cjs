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

async function addAllEigenTekstTemplates() {
    let pool;
    
    try {
        console.log('🔄 Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Database connected');
        
        // Add eigen tekst for all Bijzondere dag subtypes
        console.log('\n📋 Adding "Eigen tekst invoeren" templates for Bijzondere dagen...');
        
        const bijzondereDagen = [
            { subtype: 'vaderdag', name: 'Vaderdag' },
            { subtype: 'moederdag', name: 'Moederdag' },
            { subtype: 'verjaardag_kind', name: 'Verjaardag kind' },
            { subtype: 'verjaardag_partij1', name: 'Verjaardag partij 1' },
            { subtype: 'verjaardag_partij2', name: 'Verjaardag partij 2' },
            { subtype: 'bijzonder_jubileum', name: 'Bijzonder jubileum' }
        ];
        
        let addedCount = 0;
        
        for (const dag of bijzondereDagen) {
            // Check if eigen tekst already exists for this subtype
            const check = await pool.request()
                .input('Subtype', sql.NVarChar, dag.subtype)
                .query(`
                    SELECT COUNT(*) as count
                    FROM dbo.regelingen_templates
                    WHERE type = 'Bijzondere dag'
                    AND template_subtype = @Subtype
                    AND template_naam LIKE '%eigen%tekst%'
                `);
            
            if (check.recordset[0].count === 0) {
                console.log(`\n✏️  Adding eigen tekst for ${dag.name}...`);
                
                const insert = await pool.request()
                    .input('Subtype', sql.NVarChar, dag.subtype)
                    .query(`
                        INSERT INTO dbo.regelingen_templates 
                        (template_naam, template_tekst, meervoud_kinderen, type, template_subtype, sort_order)
                        VALUES 
                        ('${dag.subtype}_eigen_tekst', 'Eigen tekst invoeren', 0, 'Bijzondere dag', @Subtype, 999),
                        ('${dag.subtype}_eigen_tekst_meervoud', 'Eigen tekst invoeren', 1, 'Bijzondere dag', @Subtype, 999)
                    `);
                
                addedCount += insert.rowsAffected;
                console.log(`✅ Added ${insert.rowsAffected} templates for ${dag.name}`);
            } else {
                console.log(`⏭️  Eigen tekst already exists for ${dag.name}`);
            }
        }
        
        // Check if Algemeen (beslissingen) needs eigen tekst
        console.log('\n📋 Checking Algemeen (beslissingen) for "eigen tekst"...');
        const algemeenCheck = await pool.request().query(`
            SELECT COUNT(*) as count
            FROM dbo.regelingen_templates
            WHERE type = 'Algemeen'
            AND (template_naam LIKE '%eigen%tekst%' OR template_tekst = 'Eigen tekst invoeren')
        `);
        
        if (algemeenCheck.recordset[0].count === 0) {
            console.log('✏️  Adding eigen tekst for Algemeen (beslissingen)...');
            
            const insertAlgemeen = await pool.request().query(`
                INSERT INTO dbo.regelingen_templates 
                (template_naam, template_tekst, meervoud_kinderen, type, template_subtype, sort_order)
                VALUES 
                ('beslissing_eigen_tekst', 'Eigen tekst invoeren', 0, 'Algemeen', 'beslissing', 999),
                ('beslissing_eigen_tekst_meervoud', 'Eigen tekst invoeren', 1, 'Algemeen', 'beslissing', 999)
            `);
            
            addedCount += insertAlgemeen.rowsAffected;
            console.log(`✅ Added ${insertAlgemeen.rowsAffected} templates for Algemeen`);
        }
        
        console.log(`\n✅ Total added: ${addedCount} templates`);
        
        // Final summary
        console.log('\n📊 Final count of all templates with "eigen tekst":');
        const summary = await pool.request().query(`
            SELECT 
                type,
                template_subtype,
                COUNT(*) as total_templates,
                SUM(CASE WHEN template_naam LIKE '%eigen%tekst%' 
                    OR template_tekst = 'Eigen tekst invoeren' 
                    THEN 1 ELSE 0 END) as eigen_tekst_templates
            FROM dbo.regelingen_templates
            GROUP BY type, template_subtype
            ORDER BY type, template_subtype
        `);
        
        console.table(summary.recordset.filter(row => row.eigen_tekst_templates > 0));
        
        console.log('\n✅ All "Eigen tekst invoeren" templates have been added!');
        
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
addAllEigenTekstTemplates().catch(console.error);