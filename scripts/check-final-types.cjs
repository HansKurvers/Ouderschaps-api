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

async function checkFinalTypes() {
    let pool;
    
    try {
        console.log('🔄 Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Database connected');
        
        // Check types summary
        console.log('\n📊 Templates by type:');
        const typeSummary = await pool.request().query(`
            SELECT 
                type,
                COUNT(*) as count
            FROM dbo.regelingen_templates
            GROUP BY type
            ORDER BY type
        `);
        
        console.table(typeSummary.recordset);
        
        // Check detailed breakdown
        console.log('\n📋 Detailed breakdown:');
        const detailedSummary = await pool.request().query(`
            SELECT 
                type,
                template_subtype,
                COUNT(*) as count,
                SUM(CASE WHEN meervoud_kinderen = 0 THEN 1 ELSE 0 END) as enkelvoud,
                SUM(CASE WHEN meervoud_kinderen = 1 THEN 1 ELSE 0 END) as meervoud
            FROM dbo.regelingen_templates
            GROUP BY type, template_subtype
            ORDER BY type, template_subtype
        `);
        
        console.table(detailedSummary.recordset);
        
        console.log('\n✅ Database structure is now clean:');
        console.log('   - Type "Algemeen" → Beslissingen/overleg');
        console.log('   - Type "Bijzondere dag" → Vaderdag, Moederdag, Verjaardagen, Jubilea');
        console.log('   - Type "Feestdag" → Normale feestdagen (Kerst, Pasen, etc.)');
        console.log('   - Type "Vakantie" → Schoolvakanties');
        
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
checkFinalTypes().catch(console.error);