const sql = require('mssql');
require('dotenv').config();

async function migrateV5WoonplaatsElkeWeek() {
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

        console.log('=== V5 WOONPLAATS & ELKE WEEK MIGRATION ===\n');

        // ============================================================
        // PART 1: WOONPLAATS FIELDS
        // ============================================================
        console.log('📍 PART 1: Adding woonplaats (residence) fields to ouderschapsplan_info\n');
        console.log('Adding 3 woonplaats columns:');
        console.log('  - woonplaats_optie TINYINT NULL (1-5)');
        console.log('  - woonplaats_partij1 NVARCHAR(100) NULL');
        console.log('  - woonplaats_partij2 NVARCHAR(100) NULL\n');
        console.log('Purpose: Track residence arrangements after separation\n');

        // Check if woonplaats columns already exist
        const existingWoonplaatsColumns = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = 'ouderschapsplan_info'
              AND COLUMN_NAME IN (
                'woonplaats_optie',
                'woonplaats_partij1',
                'woonplaats_partij2'
              )
        `);

        if (existingWoonplaatsColumns.recordset.length > 0) {
            console.log('⚠️  Some woonplaats columns already exist:');
            for (const col of existingWoonplaatsColumns.recordset) {
                console.log(`   - ${col.COLUMN_NAME}`);
            }
            console.log('\nSkipping columns that already exist...\n');
        }

        const existingWoonplaatsColumnNames = existingWoonplaatsColumns.recordset.map(c => c.COLUMN_NAME);

        // Add woonplaats columns that don't exist
        const woonplaatsColumnsToAdd = [];
        if (!existingWoonplaatsColumnNames.includes('woonplaats_optie')) {
            woonplaatsColumnsToAdd.push('woonplaats_optie TINYINT NULL');
        }
        if (!existingWoonplaatsColumnNames.includes('woonplaats_partij1')) {
            woonplaatsColumnsToAdd.push('woonplaats_partij1 NVARCHAR(100) NULL');
        }
        if (!existingWoonplaatsColumnNames.includes('woonplaats_partij2')) {
            woonplaatsColumnsToAdd.push('woonplaats_partij2 NVARCHAR(100) NULL');
        }

        if (woonplaatsColumnsToAdd.length === 0) {
            console.log('✅ All woonplaats columns already exist - no migration needed\n');
        } else {
            console.log(`Adding ${woonplaatsColumnsToAdd.length} new woonplaats columns...\n`);

            const alterWoonplaatsQuery = `
                ALTER TABLE dbo.ouderschapsplan_info
                ADD ${woonplaatsColumnsToAdd.join(',\n    ')}
            `;

            console.log('Executing:');
            console.log(alterWoonplaatsQuery);
            console.log('');

            await pool.request().query(alterWoonplaatsQuery);

            console.log('✅ Woonplaats columns added successfully!\n');
        }

        // Verify woonplaats migration
        console.log('=== VERIFYING WOONPLAATS MIGRATION ===\n');
        const verifyWoonplaats = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = 'ouderschapsplan_info'
              AND COLUMN_NAME IN (
                'woonplaats_optie',
                'woonplaats_partij1',
                'woonplaats_partij2'
              )
            ORDER BY COLUMN_NAME
        `);

        if (verifyWoonplaats.recordset.length === 3) {
            console.log('✅ WOONPLAATS MIGRATION SUCCESSFUL - All 3 columns verified:\n');
            for (const col of verifyWoonplaats.recordset) {
                const length = col.CHARACTER_MAXIMUM_LENGTH ? ` (${col.CHARACTER_MAXIMUM_LENGTH})` : '';
                console.log(`   ✅ ${col.COLUMN_NAME}: ${col.DATA_TYPE}${length} (nullable: ${col.IS_NULLABLE})`);
            }
        } else {
            console.log(`❌ WOONPLAATS MIGRATION INCOMPLETE - Found ${verifyWoonplaats.recordset.length}/3 columns\n`);
        }

        console.log('\n📊 Woonplaats field meanings:');
        console.log('   woonplaats_optie:');
        console.log('     1 = Blijft hetzelfde (beiden blijven in huidige plaats/plaatsen)');
        console.log('     2 = Partij 1 gaat naar andere plaats');
        console.log('     3 = Partij 2 gaat naar andere plaats');
        console.log('     4 = Beiden gaan naar andere plaats');
        console.log('     5 = Nog onduidelijk');
        console.log('   woonplaats_partij1:');
        console.log('     Toekomstige woonplaats van partij 1 (alleen relevant bij optie 2 or 4)');
        console.log('   woonplaats_partij2:');
        console.log('     Toekomstige woonplaats van partij 2 (alleen relevant bij optie 3 or 4)\n');

        // ============================================================
        // PART 2: ELKE WEEK VERIFICATION
        // ============================================================
        console.log('📅 PART 2: Verifying "Elke week" in week_regelingen table\n');

        // Check if "Elke week" exists
        const elkeWeekCheck = await pool.request().query(`
            SELECT id, omschrijving
            FROM dbo.week_regelingen
            WHERE LOWER(omschrijving) LIKE '%elke week%'
        `);

        if (elkeWeekCheck.recordset.length > 0) {
            console.log('✅ "Elke week" already exists in week_regelingen:\n');
            for (const record of elkeWeekCheck.recordset) {
                console.log(`   ✅ ID: ${record.id} | Omschrijving: "${record.omschrijving}"`);
            }
        } else {
            console.log('⚠️  "Elke week" does NOT exist, adding it now...\n');

            await pool.request().query(`
                INSERT INTO dbo.week_regelingen (omschrijving)
                VALUES ('Elke week')
            `);

            // Verify insertion
            const verifyElkeWeek = await pool.request().query(`
                SELECT id, omschrijving
                FROM dbo.week_regelingen
                WHERE LOWER(omschrijving) LIKE '%elke week%'
            `);

            if (verifyElkeWeek.recordset.length > 0) {
                console.log('✅ "Elke week" successfully added:\n');
                for (const record of verifyElkeWeek.recordset) {
                    console.log(`   ✅ ID: ${record.id} | Omschrijving: "${record.omschrijving}"`);
                }
            } else {
                console.log('❌ Failed to add "Elke week"\n');
            }
        }

        // Show all week_regelingen for reference
        console.log('\n📋 All week_regelingen in database:\n');
        const allWeekRegelingen = await pool.request().query(`
            SELECT id, omschrijving
            FROM dbo.week_regelingen
            ORDER BY id
        `);

        for (const record of allWeekRegelingen.recordset) {
            const isElkeWeek = record.omschrijving.toLowerCase().includes('elke week');
            const marker = isElkeWeek ? '⭐' : '  ';
            console.log(`${marker} ID: ${record.id} | Omschrijving: "${record.omschrijving}"`);
        }

        // ============================================================
        // SUMMARY
        // ============================================================
        console.log('\n' + '='.repeat(60));
        console.log('🎉 V5 MIGRATION COMPLETE!\n');
        console.log('Summary:');
        console.log('  ✅ Woonplaats fields: 3 columns added to ouderschapsplan_info');
        console.log('  ✅ "Elke week": Verified/added to week_regelingen');
        console.log('\n📝 Notes:');
        console.log('  - Frontend can now save residence arrangement choices');
        console.log('  - "Elke week" option available for visitation schedules');
        console.log('  - All fields are nullable for backward compatibility');
        console.log('='.repeat(60) + '\n');

        await pool.close();

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.originalError) {
            console.error('Original Error:', error.originalError.message);
        }
        process.exit(1);
    }
}

migrateV5WoonplaatsElkeWeek();
