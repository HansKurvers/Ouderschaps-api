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

async function addEigenTekstFeestdagen() {
    let pool;
    
    try {
        console.log('🔄 Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Database connected');
        
        // First check what "eigen tekst" templates already exist
        console.log('\n📋 Checking existing "Eigen tekst" templates...');
        const existing = await pool.request().query(`
            SELECT type, template_subtype, COUNT(*) as count
            FROM dbo.regelingen_templates
            WHERE LOWER(template_naam) LIKE '%eigen%tekst%'
               OR LOWER(template_tekst) = 'eigen tekst invoeren'
            GROUP BY type, template_subtype
            ORDER BY type, template_subtype
        `);
        
        console.log('Existing "eigen tekst" templates:');
        console.table(existing.recordset);
        
        // Check if regular Feestdagen have eigen tekst
        console.log('\n📋 Checking if regular Feestdagen have "eigen tekst" option...');
        const feestdagCheck = await pool.request().query(`
            SELECT COUNT(*) as count
            FROM dbo.regelingen_templates
            WHERE type = 'Feestdag' 
            AND template_subtype = 'algemeen'
            AND (LOWER(template_naam) LIKE '%eigen%tekst%' 
                 OR LOWER(template_tekst) = 'eigen tekst invoeren')
        `);
        
        if (feestdagCheck.recordset[0].count === 0) {
            console.log('❌ No "eigen tekst" found for regular Feestdagen');
            
            // Add eigen tekst for regular feestdagen
            console.log('\n✏️  Adding "Eigen tekst invoeren" templates for regular Feestdagen...');
            
            const insertResult = await pool.request().query(`
                INSERT INTO dbo.regelingen_templates 
                (template_naam, template_tekst, meervoud_kinderen, type, template_subtype, sort_order)
                VALUES 
                ('feestdag_eigen_tekst', 'Eigen tekst invoeren', 0, 'Feestdag', 'algemeen', 999),
                ('feestdag_eigen_tekst_meervoud', 'Eigen tekst invoeren', 1, 'Feestdag', 'algemeen', 999)
            `);
            
            console.log(`✅ Added ${insertResult.rowsAffected} "Eigen tekst invoeren" templates for Feestdagen`);
        } else {
            console.log('✅ "Eigen tekst" templates already exist for regular Feestdagen');
        }
        
        // Check if Vakantie has eigen tekst
        console.log('\n📋 Checking if Vakantie has "eigen tekst" option...');
        const vakantieCheck = await pool.request().query(`
            SELECT COUNT(*) as count
            FROM dbo.regelingen_templates
            WHERE type = 'Vakantie'
            AND (LOWER(template_naam) LIKE '%eigen%tekst%' 
                 OR LOWER(template_tekst) = 'eigen tekst invoeren')
        `);
        
        if (vakantieCheck.recordset[0].count === 0) {
            console.log('❌ No "eigen tekst" found for Vakantie');
            
            // Add eigen tekst for vakantie
            console.log('\n✏️  Adding "Eigen tekst invoeren" templates for Vakantie...');
            
            const insertVakantie = await pool.request().query(`
                INSERT INTO dbo.regelingen_templates 
                (template_naam, template_tekst, meervoud_kinderen, type, template_subtype, sort_order)
                VALUES 
                ('vakantie_eigen_tekst', 'Eigen tekst invoeren', 0, 'Vakantie', 'vakantie', 999),
                ('vakantie_eigen_tekst_meervoud', 'Eigen tekst invoeren', 1, 'Vakantie', 'vakantie', 999)
            `);
            
            console.log(`✅ Added ${insertVakantie.rowsAffected} "Eigen tekst invoeren" templates for Vakantie`);
        } else {
            console.log('✅ "Eigen tekst" templates already exist for Vakantie');
        }
        
        // Final summary
        console.log('\n📊 Final summary of "eigen tekst" templates:');
        const finalSummary = await pool.request().query(`
            SELECT 
                type,
                template_subtype,
                COUNT(*) as total_templates,
                SUM(CASE WHEN LOWER(template_naam) LIKE '%eigen%tekst%' 
                    OR LOWER(template_tekst) = 'eigen tekst invoeren' 
                    THEN 1 ELSE 0 END) as eigen_tekst_count
            FROM dbo.regelingen_templates
            GROUP BY type, template_subtype
            ORDER BY type, template_subtype
        `);
        
        console.table(finalSummary.recordset);
        
        console.log('\n✅ Process complete!');
        
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
addEigenTekstFeestdagen().catch(console.error);