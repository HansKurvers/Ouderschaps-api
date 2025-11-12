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

async function fixHardcodedDeKinderen() {
    let pool;
    
    try {
        console.log('🔄 Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Database connected');
        
        // Fix specific IDs that should use {KIND} placeholder
        const updates = [
            // Verjaardag ouders - meervoud
            { id: 138, old: 'De kinderen mogen', new: '{KIND} mogen' },
            { id: 139, old: 'De kinderen zijn', new: '{KIND} zijn' },
            { id: 140, old: 'De kinderen zijn', new: '{KIND} zijn' },
            
            // Verjaardag grootouders - meervoud  
            { id: 150, old: 'De kinderen bezoeken', new: '{KIND} bezoeken' },
            { id: 151, old: 'De kinderen bezoeken', new: '{KIND} bezoeken' },
            { id: 154, old: 'De kinderen mogen', new: '{KIND} mogen' },
            
            // Bijzondere jubilea - meervoud
            { id: 162, old: 'De kinderen zijn', new: '{KIND} zijn' },
            { id: 163, old: 'De kinderen zijn', new: '{KIND} zijn' },
        ];
        
        console.log('\n🔧 Fixing hardcoded "De kinderen" to {KIND} placeholder...\n');
        
        for (const update of updates) {
            const result = await pool.request()
                .input('id', sql.Int, update.id)
                .input('old', sql.NVarChar, update.old)
                .input('new', sql.NVarChar, update.new)
                .query(`
                    UPDATE dbo.regelingen_templates
                    SET 
                        template_tekst = REPLACE(template_tekst, @old, @new),
                        card_tekst = REPLACE(card_tekst, @old, @new)
                    WHERE id = @id
                `);
            
            if (result.rowsAffected[0] > 0) {
                console.log(`✅ Fixed ID ${update.id}: "${update.old}" → "${update.new}"`);
            }
        }
        
        // Also fix card texts that have "De kinderen" at the beginning
        console.log('\n🔧 Fixing card texts...');
        await pool.request().query(`
            UPDATE dbo.regelingen_templates
            SET card_tekst = REPLACE(card_tekst, 'De kinderen', '{KIND}')
            WHERE id IN (162, 163)
            AND card_tekst LIKE 'De kinderen%'
        `);
        
        // Show results
        console.log('\n📋 Updated templates:');
        const results = await pool.request().query(`
            SELECT 
                id,
                template_naam,
                template_tekst,
                card_tekst,
                meervoud_kinderen
            FROM dbo.regelingen_templates
            WHERE id IN (138, 139, 140, 150, 151, 154, 162, 163)
            ORDER BY id
        `);
        
        console.table(results.recordset.map(r => ({
            id: r.id,
            template_naam: r.template_naam,
            heeft_placeholder: r.template_tekst.includes('{KIND}') ? '✅' : '❌',
            template_tekst_preview: r.template_tekst.substring(0, 50) + '...'
        })));
        
        console.log('\n✅ All fixes completed!');
        console.log('\n💡 De frontend zal nu {KIND} vervangen door:');
        console.log('   - "Het kind" voor enkelvoud');
        console.log('   - "De kinderen" voor meervoud');
        
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
fixHardcodedDeKinderen().catch(console.error);