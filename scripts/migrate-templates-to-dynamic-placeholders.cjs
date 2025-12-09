/**
 * Migration script: Convert templates to dynamic enkelvoud/meervoud placeholders
 *
 * This script:
 * 1. Updates all enkelvoud templates with new placeholder syntax
 * 2. Updates card_tekst fields with new placeholders
 * 3. Deletes all meervoud templates (they become redundant)
 * 4. Optionally drops the meervoud_kinderen column
 *
 * Run with: node scripts/migrate-templates-to-dynamic-placeholders.cjs
 * Dry run:  node scripts/migrate-templates-to-dynamic-placeholders.cjs --dry-run
 */

const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Transform template text to use dynamic placeholders
 * @param {string} text - Original template text
 * @returns {string} - Transformed text with dynamic placeholders
 */
function transformTemplate(text) {
    if (!text) return text;

    let result = text;

    // Step 1: Replace {KIND} and {KINDEREN} with {KIND/KINDEREN}
    result = result.replace(/\{KIND\}/g, '{KIND/KINDEREN}');
    result = result.replace(/\{KINDEREN\}/g, '{KIND/KINDEREN}');

    // Step 2: Replace werkwoorden
    // IMPORTANT: Replace longer words first to avoid partial matches
    // Also use negative lookahead to avoid matching inside existing placeholders

    // verblijft/verblijven -> {VERBLIJFT/VERBLIJVEN}
    result = result.replace(/\bverblijven\b(?![^{]*\})/gi, '{VERBLIJFT/VERBLIJVEN}');
    result = result.replace(/\bverblijft\b(?![^{]*\})/gi, '{VERBLIJFT/VERBLIJVEN}');

    // zouden/zou -> {ZOU/ZOUDEN}
    result = result.replace(/\bzouden\b(?![^{]*\})/gi, '{ZOU/ZOUDEN}');
    result = result.replace(/\bzou\b(?![^{]*\})/gi, '{ZOU/ZOUDEN}');

    // krijgen/krijgt -> {KRIJGT/KRIJGEN}
    result = result.replace(/\bkrijgen\b(?![^{]*\})/gi, '{KRIJGT/KRIJGEN}');
    result = result.replace(/\bkrijgt\b(?![^{]*\})/gi, '{KRIJGT/KRIJGEN}');

    // viert/vieren -> {VIERT/VIEREN}
    result = result.replace(/\bvieren\b(?![^{]*\})/gi, '{VIERT/VIEREN}');
    result = result.replace(/\bviert\b(?![^{]*\})/gi, '{VIERT/VIEREN}');

    // heeft/hebben -> {HEEFT/HEBBEN}
    result = result.replace(/\bhebben\b(?![^{]*\})/gi, '{HEEFT/HEBBEN}');
    result = result.replace(/\bheeft\b(?![^{]*\})/gi, '{HEEFT/HEBBEN}');

    // bezoekt/bezoeken -> {BEZOEKT/BEZOEKEN}
    result = result.replace(/\bbezoeken\b(?![^{]*\})/gi, '{BEZOEKT/BEZOEKEN}');
    result = result.replace(/\bbezoekt\b(?![^{]*\})/gi, '{BEZOEKT/BEZOEKEN}');

    // mag/mogen -> {MAG/MOGEN}
    result = result.replace(/\bmogen\b(?![^{]*\})/gi, '{MAG/MOGEN}');
    result = result.replace(/\bmag\b(?![^{]*\})/gi, '{MAG/MOGEN}');

    // is -> {IS/ZIJN}
    // NOTE: We only replace "is" (singular verb), NOT "zijn" because:
    // - "zijn/haar" = "his/her" (possessive) - replaced separately below
    // - "zou zijn" = infinitive "to be" - stays same in plural ("zouden zijn")
    result = result.replace(/\bis\b(?![^{]*\})/gi, '{IS/ZIJN}');

    // zijn/haar -> hun (possessive: his/her -> their)
    // This is a special case: "zijn/haar" in enkelvoud becomes "hun" in meervoud
    result = result.replace(/\bzijn\/haar\b/gi, '{ZIJN-HAAR/HUN}');

    return result;
}

async function main() {
    console.log('=== Template Migration to Dynamic Placeholders ===\n');

    if (DRY_RUN) {
        console.log('>>> DRY RUN MODE - No changes will be made <<<\n');
    }

    const pool = await sql.connect(config);

    try {
        // Step 1: Get all enkelvoud templates that need updating
        console.log('Step 1: Finding enkelvoud templates to update...\n');

        const enkelvoudTemplates = await pool.request().query(`
            SELECT id, template_naam, template_tekst, card_tekst, type
            FROM dbo.regelingen_templates
            WHERE meervoud_kinderen = 0
            ORDER BY type, id
        `);

        console.log('Found ' + enkelvoudTemplates.recordset.length + ' enkelvoud templates\n');

        // Step 2: Transform and update enkelvoud templates
        console.log('Step 2: Transforming enkelvoud templates...\n');

        let updatedCount = 0;
        for (const template of enkelvoudTemplates.recordset) {
            const newTekst = transformTemplate(template.template_tekst);
            const newCardTekst = transformTemplate(template.card_tekst);

            const hasChanges =
                newTekst !== template.template_tekst ||
                newCardTekst !== template.card_tekst;

            if (hasChanges) {
                console.log('--- ' + template.template_naam + ' (ID ' + template.id + ') ---');

                if (newTekst !== template.template_tekst) {
                    console.log('  Tekst: ' + template.template_tekst.substring(0, 60) + '...');
                    console.log('  ->     ' + newTekst.substring(0, 60) + '...');
                }

                if (newCardTekst !== template.card_tekst && template.card_tekst) {
                    console.log('  Card:  ' + template.card_tekst.substring(0, 40) + '...');
                    console.log('  ->     ' + newCardTekst.substring(0, 40) + '...');
                }

                if (!DRY_RUN) {
                    await pool.request()
                        .input('id', sql.Int, template.id)
                        .input('tekst', sql.NVarChar, newTekst)
                        .input('cardTekst', sql.NVarChar, newCardTekst)
                        .query(`
                            UPDATE dbo.regelingen_templates
                            SET template_tekst = @tekst,
                                card_tekst = @cardTekst
                            WHERE id = @id
                        `);
                }

                updatedCount++;
            }
        }

        console.log('\nUpdated ' + updatedCount + ' templates\n');

        // Step 3: Count and delete meervoud templates
        console.log('Step 3: Removing meervoud templates...\n');

        const meervoudCount = await pool.request().query(`
            SELECT COUNT(*) as count FROM dbo.regelingen_templates WHERE meervoud_kinderen = 1
        `);

        console.log('Found ' + meervoudCount.recordset[0].count + ' meervoud templates to delete\n');

        if (!DRY_RUN) {
            const deleteResult = await pool.request().query(`
                DELETE FROM dbo.regelingen_templates WHERE meervoud_kinderen = 1
            `);
            console.log('Deleted ' + deleteResult.rowsAffected[0] + ' meervoud templates\n');
        } else {
            console.log('(Would delete ' + meervoudCount.recordset[0].count + ' templates)\n');
        }

        // Step 4: Drop the meervoud_kinderen column
        console.log('Step 4: Dropping meervoud_kinderen column...\n');

        if (!DRY_RUN) {
            // First check if there are any constraints on the column
            try {
                // Drop default constraint if exists
                await pool.request().query(`
                    DECLARE @ConstraintName nvarchar(200)
                    SELECT @ConstraintName = name
                    FROM sys.default_constraints
                    WHERE parent_object_id = object_id('dbo.regelingen_templates')
                    AND col_name(parent_object_id, parent_column_id) = 'meervoud_kinderen'

                    IF @ConstraintName IS NOT NULL
                    BEGIN
                        EXEC('ALTER TABLE dbo.regelingen_templates DROP CONSTRAINT ' + @ConstraintName)
                    END
                `);

                // Drop the column
                await pool.request().query(`
                    ALTER TABLE dbo.regelingen_templates DROP COLUMN meervoud_kinderen
                `);
                console.log('Dropped meervoud_kinderen column\n');
            } catch (err) {
                console.log('Warning: Could not drop column: ' + err.message + '\n');
            }
        } else {
            console.log('(Would drop meervoud_kinderen column)\n');
        }

        // Step 5: Verification
        console.log('Step 5: Verification...\n');

        const finalCount = await pool.request().query(`
            SELECT type, COUNT(*) as count
            FROM dbo.regelingen_templates
            GROUP BY type
            ORDER BY type
        `);

        console.log('Final template counts:');
        for (const row of finalCount.recordset) {
            console.log('  ' + (row.type || 'NULL') + ': ' + row.count);
        }

        // Show sample transformed templates
        console.log('\n=== Sample Transformed Templates ===\n');

        const samples = await pool.request().query(`
            SELECT TOP 5 template_naam, template_tekst
            FROM dbo.regelingen_templates
            WHERE template_tekst LIKE '%{KIND/KINDEREN}%'
            ORDER BY NEWID()
        `);

        for (const sample of samples.recordset) {
            console.log('--- ' + sample.template_naam + ' ---');
            console.log(sample.template_tekst);
            console.log('');
        }

        if (DRY_RUN) {
            console.log('\n>>> DRY RUN COMPLETE - No changes were made <<<');
            console.log('>>> Run without --dry-run to apply changes <<<\n');
        } else {
            console.log('\n=== Migration Complete! ===\n');
        }

    } finally {
        await pool.close();
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
