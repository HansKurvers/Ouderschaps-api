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

async function fixTypeConstraint() {
    let pool;
    
    try {
        console.log('🔄 Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Database connected');
        
        // Step 1: Drop the existing constraint
        console.log('\n📋 Step 1: Dropping existing constraint...');
        try {
            await pool.request().query(`
                ALTER TABLE dbo.regelingen_templates 
                DROP CONSTRAINT CK__regeling_t__type__32767D0B
            `);
            console.log('✅ Constraint dropped');
        } catch (err) {
            console.log('⚠️  Constraint might not exist or has different name');
        }
        
        // Step 2: Add new constraint that includes 'Bijzondere dag'
        console.log('\n📋 Step 2: Adding new constraint...');
        await pool.request().query(`
            ALTER TABLE dbo.regelingen_templates 
            ADD CONSTRAINT CK_regelingen_templates_type 
            CHECK ([type] IN ('Algemeen', 'Feestdag', 'Vakantie', 'Bijzondere dag'))
        `);
        console.log('✅ New constraint added');
        
        // Step 3: Update bijzondere dagen to new type
        console.log('\n📋 Step 3: Updating bijzondere dagen to type "Bijzondere dag"...');
        const updateResult = await pool.request().query(`
            UPDATE dbo.regelingen_templates
            SET type = 'Bijzondere dag'
            WHERE template_subtype IN ('vaderdag', 'moederdag', 'verjaardag_kind', 
                                      'verjaardag_partij1', 'verjaardag_partij2', 
                                      'bijzonder_jubileum')
        `);
        console.log(`✅ Updated ${updateResult.rowsAffected} templates to type "Bijzondere dag"`);
        
        // Show final result
        console.log('\n📊 Final summary:');
        const summary = await pool.request().query(`
            SELECT 
                type,
                COUNT(*) as count,
                STRING_AGG(DISTINCT template_subtype, ', ') as subtypes
            FROM dbo.regelingen_templates
            GROUP BY type
            ORDER BY type
        `);
        
        console.table(summary.recordset);
        
        console.log('\n✅ All done! Database structure:');
        console.log('   - Type "Feestdag" → Normale feestdagen (Kerst, Pasen, etc.)');
        console.log('   - Type "Bijzondere dag" → Vaderdag, Moederdag, Verjaardagen, Jubilea');
        console.log('   - Type "Vakantie" → Schoolvakanties');
        console.log('   - Type "Algemeen" → Beslissingen/overleg');
        
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
fixTypeConstraint().catch(console.error);