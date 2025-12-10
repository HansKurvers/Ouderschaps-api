const sql = require('mssql');
require('dotenv').config();

async function migrateDefaultTemplatesSortOrder() {
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

        console.log('=== DEFAULT TEMPLATES SORT ORDER MIGRATION ===\n');
        console.log('Doel: Default templates bovenaan zetten in keuze-modal\n');

        // Default template IDs per categorie
        const defaultTemplateIds = [
            9,    // Feestdagen: wisselend elk jaar
            11,   // Feestdagen: volgens schema
            20,   // Vakanties: wisselend
            36,   // Beslissingen/Overige: na overleg en overeenstemming
            37,   // Beslissingen/Overige: overleg niet nodig
            48,   // Bijzondere dagen: vaderdag_bij_vader
            60,   // Bijzondere dagen: moederdag_bij_moeder
            122,  // Bijzondere dagen: verj_kind_wisselend
            134,  // Bijzondere dagen: verj_ouder_deel_dag
            144,  // Bijzondere dagen: verj_groot_beide_bezoeken
            157,  // Bijzondere dagen: jubilea_familie_kant
            210,  // Vakanties: keuze (kerst, mei, zomer)
        ];

        console.log('Default template IDs:', defaultTemplateIds.join(', '));
        console.log('');

        // Show current sort_order values
        console.log('📊 Huidige sort_order waardes:');
        const currentValues = await pool.request().query(`
            SELECT id, template_naam, type, sort_order
            FROM dbo.regelingen_templates
            WHERE id IN (${defaultTemplateIds.join(',')})
            ORDER BY type, sort_order
        `);

        for (const row of currentValues.recordset) {
            console.log(`  ID ${row.id}: ${row.template_naam} (${row.type}) - sort_order: ${row.sort_order}`);
        }
        console.log('');

        // Update sort_order to 0 for all default templates
        console.log('🔄 Updating sort_order to 0 for default templates...');
        const updateResult = await pool.request().query(`
            UPDATE dbo.regelingen_templates
            SET sort_order = 0
            WHERE id IN (${defaultTemplateIds.join(',')})
        `);

        console.log(`✅ Updated ${updateResult.rowsAffected[0]} templates\n`);

        // Verify the update
        console.log('📊 Nieuwe sort_order waardes:');
        const newValues = await pool.request().query(`
            SELECT id, template_naam, type, sort_order
            FROM dbo.regelingen_templates
            WHERE id IN (${defaultTemplateIds.join(',')})
            ORDER BY type, sort_order
        `);

        for (const row of newValues.recordset) {
            console.log(`  ID ${row.id}: ${row.template_naam} (${row.type}) - sort_order: ${row.sort_order}`);
        }
        console.log('');

        // Show sample of templates order after update (e.g., Feestdag templates)
        console.log('📋 Voorbeeld: Feestdag templates volgorde na migratie:');
        const feestdagOrder = await pool.request().query(`
            SELECT TOP 5 id, template_naam, sort_order
            FROM dbo.regelingen_templates
            WHERE type = 'Feestdag'
            ORDER BY sort_order ASC, template_naam ASC
        `);

        let position = 1;
        for (const row of feestdagOrder.recordset) {
            const isDefault = defaultTemplateIds.includes(row.id) ? ' ⭐ DEFAULT' : '';
            console.log(`  ${position}. ID ${row.id}: ${row.template_naam} (sort: ${row.sort_order})${isDefault}`);
            position++;
        }
        console.log('');

        await pool.close();
        console.log('✅ Migration completed successfully!');
        console.log('\n🎉 Default templates staan nu bovenaan in de keuze-modal!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

migrateDefaultTemplatesSortOrder();
