const sql = require('mssql');
require('dotenv').config();

async function addNewBeslissingenTemplates() {
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

        console.log('=== ADD NEW BESLISSINGEN TEMPLATES ===\n');

        // New templates to add - these should appear at the TOP of the list
        // Using negative sort_order to ensure they come before existing templates (which have sort_order >= 0)
        const newTemplates = [
            // Studiekosten templates
            {
                naam: 'draagkracht_rato',
                tekst: 'Beide ouders dragen naar rato van hun draagkracht hierin bij.',
                subtype: 'beslissing',
                sortOrder: -10  // First in list
            },
            {
                naam: 'netto_inkomen_rato',
                tekst: 'De ouders dragen naar rato van hun netto inkomen hierin bij.',
                subtype: 'beslissing',
                sortOrder: -9   // Second in list
            },
            // Jongmeerderjarige templates
            {
                naam: 'bijdrage_rechtstreeks_kind',
                tekst: 'De ouders betalen een bijdrage rechtstreeks aan het kind.',
                subtype: 'beslissing',
                sortOrder: -8   // Third in list
            },
            {
                naam: 'bijdrage_rechtstreeks_kind_uitwonend',
                tekst: 'De ouders betalen een bijdrage rechtstreeks aan het kind als het kind niet meer thuiswoont.',
                subtype: 'beslissing',
                sortOrder: -7   // Fourth in list
            }
        ];

        for (const template of newTemplates) {
            // Check if template already exists
            const existing = await pool.request()
                .input('naam', sql.NVarChar, template.naam)
                .input('type', sql.NVarChar, 'Algemeen')
                .query(`
                    SELECT id, template_naam, sort_order
                    FROM dbo.regelingen_templates
                    WHERE template_naam = @naam AND type = @type
                `);

            if (existing.recordset.length > 0) {
                console.log(`⚠️  Template "${template.naam}" already exists (ID: ${existing.recordset[0].id})`);
                console.log(`   Current sort_order: ${existing.recordset[0].sort_order}`);

                // Update sort_order if needed
                if (existing.recordset[0].sort_order !== template.sortOrder) {
                    await pool.request()
                        .input('id', sql.Int, existing.recordset[0].id)
                        .input('sortOrder', sql.Int, template.sortOrder)
                        .query(`
                            UPDATE dbo.regelingen_templates
                            SET sort_order = @sortOrder
                            WHERE id = @id
                        `);
                    console.log(`   ✅ Updated sort_order to ${template.sortOrder}`);
                }
                continue;
            }

            // Insert new template
            // meervoud_kinderen is required but deprecated - using 0 (false) as default
            // Templates now use dynamic placeholders like {KIND/KINDEREN}
            const result = await pool.request()
                .input('naam', sql.NVarChar, template.naam)
                .input('tekst', sql.NVarChar, template.tekst)
                .input('type', sql.NVarChar, 'Algemeen')
                .input('subtype', sql.NVarChar, template.subtype)
                .input('sortOrder', sql.Int, template.sortOrder)
                .input('meervoudKinderen', sql.Bit, 0)
                .query(`
                    INSERT INTO dbo.regelingen_templates
                        (template_naam, template_tekst, type, template_subtype, sort_order, meervoud_kinderen)
                    OUTPUT INSERTED.id
                    VALUES
                        (@naam, @tekst, @type, @subtype, @sortOrder, @meervoudKinderen)
                `);

            console.log(`✅ Added template "${template.naam}" with ID: ${result.recordset[0].id}`);
            console.log(`   Text: ${template.tekst}`);
            console.log(`   Sort order: ${template.sortOrder}`);
            console.log('');
        }

        // Show updated template order
        console.log('\n📋 Algemeen templates volgorde na toevoegen:');
        const allTemplates = await pool.request().query(`
            SELECT TOP 10 id, template_naam, template_tekst, sort_order
            FROM dbo.regelingen_templates
            WHERE type = 'Algemeen' AND template_subtype = 'beslissing'
            ORDER BY sort_order ASC, template_naam ASC
        `);

        let position = 1;
        for (const row of allTemplates.recordset) {
            const shortText = row.template_tekst.substring(0, 60) + (row.template_tekst.length > 60 ? '...' : '');
            console.log(`  ${position}. [${row.sort_order}] ${row.template_naam}: ${shortText}`);
            position++;
        }

        await pool.close();
        console.log('\n✅ Script completed successfully!');

    } catch (error) {
        console.error('❌ Script failed:', error.message);
        process.exit(1);
    }
}

addNewBeslissingenTemplates();
