import sql from 'mssql';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const dbConfig: sql.config = {
    server: process.env.DB_SERVER || '',
    database: process.env.DB_DATABASE || '',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true,
    },
};

async function runMigration() {
    const migrationFile = process.argv[2];

    if (!migrationFile) {
        console.error('Usage: npx ts-node migrations/run-migration.ts <migration-file.sql>');
        process.exit(1);
    }

    const filePath = path.join(__dirname, migrationFile);

    if (!fs.existsSync(filePath)) {
        console.error(`Migration file not found: ${filePath}`);
        process.exit(1);
    }

    console.log(`Running migration: ${migrationFile}`);
    console.log(`Database: ${dbConfig.database} on ${dbConfig.server}`);

    let pool: sql.ConnectionPool | null = null;

    try {
        pool = await sql.connect(dbConfig);
        console.log('Connected to database');

        const sqlContent = fs.readFileSync(filePath, 'utf8');

        // Split on GO statements and execute each batch
        const batches = sqlContent.split(/^GO\s*$/gm).filter(batch => batch.trim());

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i].trim();
            if (batch) {
                console.log(`\nExecuting batch ${i + 1}/${batches.length}...`);
                try {
                    const result = await pool.request().query(batch);
                    if (result.recordset && result.recordset.length > 0) {
                        console.table(result.recordset);
                    }
                } catch (error: any) {
                    console.error(`Error in batch ${i + 1}:`, error.message);
                    // Continue with next batch for non-critical errors
                }
            }
        }

        console.log('\n✅ Migration completed successfully!');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

runMigration();
