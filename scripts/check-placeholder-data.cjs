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

async function checkPlaceholderData() {
    try {
        await sql.connect(config);
        
        console.log('=== Checking placeholder data for dossier 1005 ===\n');
        
        // Get the ouderschapsplan info with party names
        const result = await sql.query`
            SELECT
                opi.*,
                p1.voornamen AS partij1_voornamen,
                p1.tussenvoegsel AS partij1_tussenvoegsel,
                p1.achternaam AS partij1_achternaam,
                p2.voornamen AS partij2_voornamen,
                p2.tussenvoegsel AS partij2_tussenvoegsel,
                p2.achternaam AS partij2_achternaam,
                p1.voornamen + ' ' + ISNULL(p1.tussenvoegsel + ' ', '') + p1.achternaam AS partij_1_naam,
                p2.voornamen + ' ' + ISNULL(p2.tussenvoegsel + ' ', '') + p2.achternaam AS partij_2_naam
            FROM dbo.ouderschapsplan_info opi
            LEFT JOIN dbo.personen p1 ON opi.partij_1_persoon_id = p1.id
            LEFT JOIN dbo.personen p2 ON opi.partij_2_persoon_id = p2.id
            WHERE opi.dossier_id = 75`; // Dossier 1005
        
        if (result.recordset.length === 0) {
            console.log('No ouderschapsplan_info found for dossier 1005');
            return;
        }
        
        const info = result.recordset[0];
        console.log('Ouderschapsplan Info:');
        console.log('- Gezag Partij:', info.gezag_partij);
        console.log('- Partij 1 ID:', info.partij_1_persoon_id);
        console.log('- Partij 1 Naam:', info.partij_1_naam);
        console.log('- Partij 2 ID:', info.partij_2_persoon_id);
        console.log('- Partij 2 Naam:', info.partij_2_naam);
        
        // Simulate what the text generator would produce
        const { generateGezagZin } = require('../src/utils/ouderschapsplan-text-generator.ts');
        
        console.log('\n=== Generated placeholders ===');
        console.log('\nWithout names (current behavior in create/update):');
        const zinWithoutNames = generateGezagZin(info.gezag_partij);
        console.log('gezagZin:', zinWithoutNames);
        
        console.log('\nWith names (desired behavior):');
        const zinWithNames = generateGezagZin(info.gezag_partij, info.gezag_termijn_weken, info.partij_1_naam, info.partij_2_naam);
        console.log('gezagZin:', zinWithNames);
        
        console.log('\n=== What the document generator receives ===');
        console.log('The document generator queries ouderschapsplan_info and should get:');
        console.log('- gezag_partij:', info.gezag_partij);
        console.log('- It should then generate its own text based on this value');
        
    } catch (err) {
        console.error('Database error:', err);
    } finally {
        await sql.close();
    }
}

checkPlaceholderData();