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

// Template data met de juiste subtypes die frontend verwacht
const templates = {
    moederdag: [
        { naam: 'moederdag_bij_moeder', tekst: '{KIND} is op {FEESTDAG} bij {PARTIJ2}.', card: '{KIND} is op {FEESTDAG} bij {PARTIJ2}' },
        { naam: 'moederdag_met_avond', tekst: '{KIND} is op {FEESTDAG} en de avond voorafgaand bij {PARTIJ2}.', card: '{KIND} is op {FEESTDAG} en de avond voorafgaand bij {PARTIJ2}' },
        { naam: 'moederdag_weekend', tekst: '{KIND} is in het weekend van {FEESTDAG} bij {PARTIJ2}.', card: '{KIND} is in het weekend van {FEESTDAG} bij {PARTIJ2}' },
        { naam: 'moederdag_deel_dag', tekst: '{KIND} krijgt de gelegenheid om op {FEESTDAG} een deel van de dag bij {PARTIJ2} te zijn.', card: '{KIND} krijgt gelegenheid om deel van {FEESTDAG} bij {PARTIJ2} te zijn' },
        { naam: 'moederdag_volgens_schema', tekst: 'Op {FEESTDAG} loopt de zorgregeling volgens schema.', card: 'Op {FEESTDAG} loopt de zorgregeling volgens schema' },
        { naam: 'moederdag_eigen_tekst', tekst: 'Eigen tekst invoeren', card: 'Eigen tekst invoeren' }
    ],
    verjaardag_kind: [
        { naam: 'verj_kind_bij_jarige', tekst: '{KIND} viert zijn/haar verjaardag bij degene waar {KIND} op die dag volgens schema is.', card: '{KIND} viert verjaardag waar hij/zij volgens schema is' },
        { naam: 'verj_kind_beide_vieren', tekst: '{KIND} viert zijn/haar verjaardag met beide ouders samen.', card: '{KIND} viert verjaardag met beide ouders' },
        { naam: 'verj_kind_wisselend', tekst: '{KIND} viert zijn/haar verjaardag het ene jaar bij {PARTIJ1} en het andere jaar bij {PARTIJ2}.', card: '{KIND} viert verjaardag wisselend per jaar' },
        { naam: 'verj_kind_dubbel_feest', tekst: '{KIND} heeft twee verjaardagsfeestjes: één bij {PARTIJ1} en één bij {PARTIJ2}.', card: '{KIND} heeft twee verjaardagsfeestjes' },
        { naam: 'verj_kind_overleg', tekst: 'De verjaardag van {KIND} wordt in onderling overleg gevierd.', card: 'Verjaardag {KIND} in onderling overleg' },
        { naam: 'verj_kind_eigen_tekst', tekst: 'Eigen tekst invoeren', card: 'Eigen tekst invoeren' }
    ],
    verjaardag_partij1: [
        { naam: 'verj_ouder_bezoek', tekst: '{KIND} mag op de verjaardag van beide ouders op bezoek komen.', card: '{KIND} mag beide ouders bezoeken op hun verjaardag' },
        { naam: 'verj_ouder_hele_dag', tekst: '{KIND} is op de verjaardag van {PARTIJ1}/{PARTIJ2} de hele dag bij de jarige ouder.', card: '{KIND} is hele dag bij jarige ouder' },
        { naam: 'verj_ouder_deel_dag', tekst: '{KIND} is een deel van de dag bij de jarige ouder op diens verjaardag.', card: '{KIND} is deel van dag bij jarige ouder' },
        { naam: 'verj_ouder_volgens_schema', tekst: 'Op de verjaardag van de ouders loopt de zorgregeling volgens schema.', card: 'Op verjaardag ouders loopt zorgregeling door' },
        { naam: 'verj_ouder_overleg', tekst: 'Voor de verjaardag van de ouders maken partijen in onderling overleg afspraken.', card: 'Verjaardag ouders in onderling overleg' },
        { naam: 'verj_ouder_eigen_tekst', tekst: 'Eigen tekst invoeren', card: 'Eigen tekst invoeren' }
    ],
    verjaardag_partij2: [
        { naam: 'verj_groot_beide_bezoeken', tekst: '{KIND} bezoekt de grootouders van beide kanten op hun verjaardag.', card: '{KIND} bezoekt alle grootouders op verjaardag' },
        { naam: 'verj_groot_bij_ouder', tekst: '{KIND} bezoekt grootouders samen met de ouder aan wiens kant zij familie zijn.', card: '{KIND} bezoekt grootouders met betreffende ouder' },
        { naam: 'verj_groot_volgens_schema', tekst: 'Voor verjaardagen van grootouders loopt de zorgregeling volgens schema.', card: 'Bij verjaardag grootouders loopt zorgregeling door' },
        { naam: 'verj_groot_overleg', tekst: 'Bezoek aan grootouders op verjaardagen wordt in onderling overleg geregeld.', card: 'Verjaardag grootouders in onderling overleg' },
        { naam: 'verj_groot_eigen_keuze', tekst: '{KIND} mag zelf kiezen of hij/zij de grootouders bezoekt op hun verjaardag.', card: '{KIND} kiest zelf over bezoek grootouders' },
        { naam: 'verj_groot_eigen_tekst', tekst: 'Eigen tekst invoeren', card: 'Eigen tekst invoeren' }
    ],
    bijzonder_jubileum: [
        { naam: 'jubilea_aanwezig', tekst: '{KIND} is aanwezig bij bijzondere jubilea van familieleden.', card: '{KIND} is aanwezig bij familiejubilea' },
        { naam: 'jubilea_familie_kant', tekst: '{KIND} is bij jubilea aanwezig bij de familie van de betreffende kant.', card: '{KIND} bij jubilea van betreffende familiekant' },
        { naam: 'jubilea_overleg', tekst: 'Voor bijzondere jubilea overleggen partijen per gelegenheid.', card: 'Bijzondere jubilea in onderling overleg' },
        { naam: 'jubilea_schema_uitzondering', tekst: 'Bij bijzondere jubilea kan van het reguliere schema worden afgeweken in overleg.', card: 'Bij jubilea afwijken van schema mogelijk' },
        { naam: 'jubilea_informeren', tekst: 'Partijen informeren elkaar tijdig over bijzondere jubilea in de familie.', card: 'Partijen informeren elkaar over jubilea' },
        { naam: 'jubilea_eigen_tekst', tekst: 'Eigen tekst invoeren', card: 'Eigen tekst invoeren' }
    ]
};

async function addTemplates() {
    let pool;
    
    try {
        console.log('🔄 Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Database connected');
        
        // Get max sort_order
        const maxSortResult = await pool.request().query(`
            SELECT ISNULL(MAX(sort_order), 0) as maxSort 
            FROM dbo.regelingen_templates 
            WHERE type = 'Feestdag'
        `);
        let currentSortOrder = maxSortResult.recordset[0].maxSort;
        
        console.log(`📊 Starting sort_order from: ${currentSortOrder + 10}`);
        
        // Process each subtype
        for (const [subtype, templateList] of Object.entries(templates)) {
            console.log(`\n🔧 Processing ${subtype} templates...`);
            
            // Check if templates already exist for this subtype
            const existingCheck = await pool.request()
                .input('subtype', sql.NVarChar, subtype)
                .query(`
                    SELECT COUNT(*) as count 
                    FROM dbo.regelingen_templates 
                    WHERE template_subtype = @subtype
                `);
            
            if (existingCheck.recordset[0].count > 0) {
                console.log(`⏭️  Skipping ${subtype} - templates already exist`);
                continue;
            }
            
            // Add templates for both enkelvoud and meervoud
            for (const meervoud of [0, 1]) {
                for (const template of templateList) {
                    currentSortOrder += 10;
                    
                    let templateTekst = template.tekst;
                    let cardTekst = template.card;
                    
                    // Voor meervoud, vervang {KIND} met "De kinderen"
                    if (meervoud === 1) {
                        templateTekst = templateTekst.replace(/\{KIND\}/g, 'De kinderen');
                        cardTekst = cardTekst.replace(/\{KIND\}/g, 'De kinderen');
                        
                        // Fix grammatica voor meervoud
                        templateTekst = templateTekst
                            .replace('zijn/haar', 'hun')
                            .replace('hij/zij', 'zij')
                            .replace('is ', 'zijn ')
                            .replace('viert ', 'vieren ')
                            .replace('heeft ', 'hebben ')
                            .replace('krijgt ', 'krijgen ')
                            .replace('bezoekt ', 'bezoeken ')
                            .replace('mag ', 'mogen ');
                            
                        cardTekst = cardTekst
                            .replace('zijn/haar', 'hun')
                            .replace('hij/zij', 'zij')
                            .replace('is ', 'zijn ')
                            .replace('viert ', 'vieren ')
                            .replace('heeft ', 'hebben ')
                            .replace('krijgt ', 'krijgen ')
                            .replace('bezoekt ', 'bezoeken ')
                            .replace('mag ', 'mogen ');
                    }
                    
                    await pool.request()
                        .input('template_naam', sql.NVarChar, template.naam + (meervoud ? '_meervoud' : ''))
                        .input('template_tekst', sql.NVarChar, templateTekst)
                        .input('card_tekst', sql.NVarChar, cardTekst)
                        .input('meervoud_kinderen', sql.Bit, meervoud)
                        .input('type', sql.NVarChar, 'Feestdag')
                        .input('template_subtype', sql.NVarChar, subtype)
                        .input('sort_order', sql.Int, currentSortOrder)
                        .query(`
                            INSERT INTO dbo.regelingen_templates 
                            (template_naam, template_tekst, card_tekst, meervoud_kinderen, type, template_subtype, sort_order)
                            VALUES 
                            (@template_naam, @template_tekst, @card_tekst, @meervoud_kinderen, @type, @template_subtype, @sort_order)
                        `);
                }
            }
            
            console.log(`✅ Added ${templateList.length * 2} templates for ${subtype}`);
        }
        
        // Show summary
        console.log('\n📊 Final summary:');
        const summary = await pool.request().query(`
            SELECT 
                template_subtype,
                COUNT(*) as template_count,
                SUM(CASE WHEN meervoud_kinderen = 0 THEN 1 ELSE 0 END) as enkelvoud,
                SUM(CASE WHEN meervoud_kinderen = 1 THEN 1 ELSE 0 END) as meervoud
            FROM dbo.regelingen_templates
            WHERE template_subtype IS NOT NULL
            GROUP BY template_subtype
            ORDER BY template_subtype
        `);
        
        console.table(summary.recordset);
        
        console.log('\n✅ All templates added successfully!');
        
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
addTemplates().catch(console.error);