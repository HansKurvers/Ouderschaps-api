/**
 * Migration script: Set default templates for vacation situations
 *
 * Sets vakantie_keuze_even_p1_oneven_p2 (ID 210) as default for all
 * vacation situations. This template gives parents flexibility by
 * letting them choose which half of the vacation they prefer.
 *
 * Run with: node scripts/set-vakantie-default-templates.cjs
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

// Default template: vakantie_keuze_even_p1_oneven_p2
// "Even jaren: PARTIJ1 kiest eerst, Oneven jaren: PARTIJ2 kiest eerst"
const DEFAULT_TEMPLATE_ID = 210;

// Vacation situations to update (categorie_id = 6)
const VAKANTIE_SITUATIES = [
    { id: 16, naam: 'Kerstvakantie' },
    { id: 17, naam: 'Voorjaarsvakantie' },
    { id: 18, naam: 'Zomervakantie' },
    { id: 19, naam: 'Herfstvakantie' },
    { id: 20, naam: 'Meivakantie' }
];

async function main() {
    console.log('Setting default templates for vacation situations...\n');

    const pool = await sql.connect(config);

    try {
        // Verify the template exists
        const templateCheck = await pool.request()
            .input('templateId', sql.Int, DEFAULT_TEMPLATE_ID)
            .query('SELECT id, template_naam FROM dbo.regelingen_templates WHERE id = @templateId');

        if (templateCheck.recordset.length === 0) {
            throw new Error('Template ID ' + DEFAULT_TEMPLATE_ID + ' not found!');
        }

        console.log('Using template: ' + templateCheck.recordset[0].template_naam + ' (ID ' + DEFAULT_TEMPLATE_ID + ')\n');

        // Update each vacation situation
        for (const situatie of VAKANTIE_SITUATIES) {
            const result = await pool.request()
                .input('defaultTemplateId', sql.Int, DEFAULT_TEMPLATE_ID)
                .input('situatieId', sql.Int, situatie.id)
                .query(`
                    UPDATE dbo.zorg_situaties
                    SET default_template_id = @defaultTemplateId
                    WHERE id = @situatieId
                `);

            if (result.rowsAffected[0] > 0) {
                console.log('✅ ' + situatie.naam + ' -> default template ID ' + DEFAULT_TEMPLATE_ID);
            } else {
                console.log('⚠️  ' + situatie.naam + ' not found (ID ' + situatie.id + ')');
            }
        }

        console.log('\n✅ Done! Default templates set for all vacation situations.');

        // Show the updated situaties
        console.log('\n=== Verification ===\n');
        const verification = await pool.request().query(`
            SELECT zs.id, zs.naam, zs.default_template_id, rt.template_naam
            FROM dbo.zorg_situaties zs
            LEFT JOIN dbo.regelingen_templates rt ON zs.default_template_id = rt.id
            WHERE zs.zorg_categorie_id = 6
            ORDER BY zs.naam
        `);

        for (const row of verification.recordset) {
            const templateName = row.template_naam || 'geen';
            console.log(row.naam + ': ' + templateName + ' (ID ' + row.default_template_id + ')');
        }

    } finally {
        await pool.close();
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
