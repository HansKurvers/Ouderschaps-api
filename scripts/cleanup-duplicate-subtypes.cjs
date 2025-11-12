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

async function cleanupDuplicates() {
    let pool;
    
    try {
        console.log('🔄 Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Database connected');
        
        // Remove old subtypes that are duplicates
        const oldSubtypes = [
            'verjaardag_kinderen',
            'verjaardag_ouders', 
            'verjaardag_grootouders',
            'bijzondere_jubilea'
        ];
        
        console.log('\n🧹 Removing old duplicate subtypes...');
        
        for (const oldSubtype of oldSubtypes) {
            const result = await pool.request()
                .input('subtype', sql.NVarChar, oldSubtype)
                .query(`
                    DELETE FROM dbo.regelingen_templates
                    WHERE template_subtype = @subtype
                `);
            
            console.log(`✅ Removed ${result.rowsAffected} templates with subtype: ${oldSubtype}`);
        }
        
        // Show final state
        console.log('\n📊 Final template subtypes in database:');
        const summary = await pool.request().query(`
            SELECT 
                template_subtype,
                COUNT(*) as template_count,
                SUM(CASE WHEN meervoud_kinderen = 0 THEN 1 ELSE 0 END) as enkelvoud,
                SUM(CASE WHEN meervoud_kinderen = 1 THEN 1 ELSE 0 END) as meervoud
            FROM dbo.regelingen_templates
            WHERE template_subtype IS NOT NULL
            GROUP BY template_subtype
            ORDER BY template_subtype
        `);
        
        console.table(summary.recordset);
        
        console.log('\n✅ Cleanup completed successfully!');
        console.log('\n📋 The following subtypes are now available:');
        console.log('  - vaderdag');
        console.log('  - moederdag');
        console.log('  - verjaardag_kind');
        console.log('  - verjaardag_partij1 (ouders)');
        console.log('  - verjaardag_partij2 (grootouders)');
        console.log('  - bijzonder_jubileum');
        
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
cleanupDuplicates().catch(console.error);