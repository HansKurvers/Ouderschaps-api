const sql = require('mssql');
require('dotenv').config();

async function migrateV7CommunicatieAfspraken() {
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

        console.log('=== V7 COMMUNICATIE AFSPRAKEN MIGRATION ===\n');
        console.log('Creating communicatie_afspraken table with 18 fields + metadata\n');

        // Check if table already exists
        const tableExists = await pool.request().query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = 'communicatie_afspraken'
        `);

        if (tableExists.recordset[0].count > 0) {
            console.log('⚠️  Table communicatie_afspraken already exists - skipping creation\n');
        } else {
            console.log('Creating table dbo.communicatie_afspraken...\n');

            await pool.request().query(`
                CREATE TABLE dbo.communicatie_afspraken (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    dossier_id INT NOT NULL,

                    -- Boolean veld
                    villa_pinedo BIT NULL,

                    -- String velden (alle SELECT opties)
                    kies_methode NVARCHAR(50) NULL,
                    omgang_tekst_of_schema NVARCHAR(50) NULL,
                    opvang NVARCHAR(100) NULL,
                    informatie_uitwisseling NVARCHAR(100) NULL,
                    bijlage_beslissingen NVARCHAR(50) NULL,
                    social_media NVARCHAR(100) NULL,
                    mobiel_tablet NVARCHAR(100) NULL,
                    id_bewijzen NVARCHAR(100) NULL,
                    aansprakelijkheidsverzekering NVARCHAR(100) NULL,
                    ziektekostenverzekering NVARCHAR(100) NULL,
                    toestemming_reizen NVARCHAR(100) NULL,
                    jongmeerderjarige NVARCHAR(100) NULL,
                    studiekosten NVARCHAR(100) NULL,
                    bankrekening_kinderen NVARCHAR(100) NULL,
                    evaluatie NVARCHAR(50) NULL,
                    parenting_coordinator NVARCHAR(100) NULL,
                    mediation_clausule NVARCHAR(50) NULL,

                    -- Timestamps
                    created_at DATETIME2 DEFAULT GETDATE(),
                    updated_at DATETIME2 DEFAULT GETDATE(),

                    -- Foreign key naar dossiers tabel
                    CONSTRAINT FK_communicatie_afspraken_dossiers
                        FOREIGN KEY (dossier_id)
                        REFERENCES dbo.dossiers(id)
                        ON DELETE CASCADE
                )
            `);

            console.log('✅ Table created successfully!\n');

            // Create index
            console.log('Creating index on dossier_id...\n');

            await pool.request().query(`
                CREATE INDEX IX_communicatie_afspraken_dossier_id
                    ON dbo.communicatie_afspraken(dossier_id)
            `);

            console.log('✅ Index created successfully!\n');
        }

        // Verify the migration
        console.log('=== VERIFYING MIGRATION ===\n');
        const verify = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = 'communicatie_afspraken'
            ORDER BY ORDINAL_POSITION
        `);

        if (verify.recordset.length > 0) {
            console.log(`✅ MIGRATION SUCCESSFUL - Found ${verify.recordset.length} columns:\n`);

            let booleanCount = 0;
            let stringCount = 0;
            let metadataCount = 0;

            for (const col of verify.recordset) {
                const length = col.CHARACTER_MAXIMUM_LENGTH ? ` (${col.CHARACTER_MAXIMUM_LENGTH})` : '';
                const marker = col.COLUMN_NAME.includes('created_at') || col.COLUMN_NAME.includes('updated_at') || col.COLUMN_NAME === 'id' || col.COLUMN_NAME === 'dossier_id' ? '📅' :
                              col.DATA_TYPE === 'bit' ? '✅' : '📝';

                console.log(`${marker} ${col.COLUMN_NAME}: ${col.DATA_TYPE}${length} (nullable: ${col.IS_NULLABLE})`);

                if (col.DATA_TYPE === 'bit' && col.COLUMN_NAME !== 'id') booleanCount++;
                if (col.DATA_TYPE === 'nvarchar') stringCount++;
                if (col.COLUMN_NAME === 'created_at' || col.COLUMN_NAME === 'updated_at') metadataCount++;
            }

            console.log(`\n📊 Summary:`);
            console.log(`   ✅ Boolean fields: ${booleanCount}`);
            console.log(`   📝 String fields: ${stringCount}`);
            console.log(`   📅 Metadata fields: ${metadataCount}`);
            console.log(`   📋 Total columns: ${verify.recordset.length}`);
        } else {
            console.log(`❌ MIGRATION FAILED - No columns found\n`);
        }

        // Check foreign key constraint
        console.log('\n=== VERIFYING FOREIGN KEY CONSTRAINT ===\n');
        const fkCheck = await pool.request().query(`
            SELECT
                fk.name AS constraint_name,
                OBJECT_NAME(fk.parent_object_id) AS table_name,
                COL_NAME(fc.parent_object_id, fc.parent_column_id) AS column_name,
                OBJECT_NAME(fk.referenced_object_id) AS referenced_table,
                COL_NAME(fc.referenced_object_id, fc.referenced_column_id) AS referenced_column
            FROM sys.foreign_keys AS fk
            INNER JOIN sys.foreign_key_columns AS fc
                ON fk.object_id = fc.constraint_object_id
            WHERE OBJECT_NAME(fk.parent_object_id) = 'communicatie_afspraken'
        `);

        if (fkCheck.recordset.length > 0) {
            for (const fk of fkCheck.recordset) {
                console.log(`✅ Foreign Key: ${fk.constraint_name}`);
                console.log(`   ${fk.table_name}.${fk.column_name} → ${fk.referenced_table}.${fk.referenced_column}`);
                console.log(`   CASCADE DELETE enabled`);
            }
        } else {
            console.log('⚠️  No foreign key constraints found');
        }

        // Check index
        console.log('\n=== VERIFYING INDEX ===\n');
        const indexCheck = await pool.request().query(`
            SELECT
                i.name AS index_name,
                i.type_desc,
                COL_NAME(ic.object_id, ic.column_id) AS column_name
            FROM sys.indexes AS i
            INNER JOIN sys.index_columns AS ic
                ON i.object_id = ic.object_id
                AND i.index_id = ic.index_id
            WHERE OBJECT_NAME(i.object_id) = 'communicatie_afspraken'
                AND i.is_primary_key = 0
        `);

        if (indexCheck.recordset.length > 0) {
            for (const idx of indexCheck.recordset) {
                console.log(`✅ Index: ${idx.index_name} (${idx.type_desc})`);
                console.log(`   Column: ${idx.column_name}`);
            }
        } else {
            console.log('⚠️  No indexes found (besides primary key)');
        }

        await pool.close();
        console.log('\n🎉 V7 Communicatie Afspraken Migration complete!\n');
        console.log('📝 Table structure:');
        console.log('   • 1 Primary Key (id)');
        console.log('   • 1 Foreign Key (dossier_id → dossiers.id) with CASCADE DELETE');
        console.log('   • 1 Boolean field (villa_pinedo)');
        console.log('   • 17 String fields (communication & parenting agreements)');
        console.log('   • 2 Timestamp fields (created_at, updated_at)');
        console.log('   • 1 Index on dossier_id for fast lookups');
        console.log('\n🔄 API Endpoints:');
        console.log('   • GET /api/communicatie-afspraken/dossier/:dossierId');
        console.log('   • POST /api/communicatie-afspraken');
        console.log('   • PUT /api/communicatie-afspraken/:id');
        console.log('   • DELETE /api/communicatie-afspraken/:id');
        console.log('\n✨ Frontend Step 3 (Communication & Agreements) is now ready!');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.originalError) {
            console.error('Original Error:', error.originalError.message);
        }
        process.exit(1);
    }
}

migrateV7CommunicatieAfspraken();
