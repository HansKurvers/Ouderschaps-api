#!/usr/bin/env node

/**
 * CLI Script to create vouchers
 *
 * Usage:
 *   node scripts/create-voucher.cjs --code TESTER123 --naam "Test voucher" --type gratis
 *   node scripts/create-voucher.cjs --code VFAS20 --naam "VFAS korting" --type percentage --waarde 20 --max 500
 *   node scripts/create-voucher.cjs --code LAUNCH --naam "Lancering" --type maanden_gratis --waarde 2 --tot 2025-03-31
 *   node scripts/create-voucher.cjs --code PODCAST5 --naam "Podcast korting" --type vast_bedrag --waarde 5
 *
 * Options:
 *   --code       Voucher code (required, will be uppercased)
 *   --naam       Display name (required)
 *   --type       Type: gratis, percentage, maanden_gratis, vast_bedrag (required)
 *   --waarde     Value: percentage (1-100), months, or amount in euros
 *   --max        Maximum total uses (optional, default: unlimited)
 *   --max-user   Maximum uses per user (optional, default: 1)
 *   --tot        Valid until date YYYY-MM-DD (optional)
 *   --omschrijving  Internal description (optional)
 *   --list       List all vouchers
 *   --deactivate Deactivate a voucher by code
 */

const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true
    }
};

function parseArgs() {
    const args = {};
    const argv = process.argv.slice(2);

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const nextArg = argv[i + 1];
            if (nextArg && !nextArg.startsWith('--')) {
                args[key] = nextArg;
                i++;
            } else {
                args[key] = true;
            }
        }
    }
    return args;
}

async function listVouchers(pool) {
    console.log('\n📋 Alle vouchers:\n');

    const result = await pool.request().query(`
        SELECT
            code, naam, type, waarde,
            aantal_gebruikt, max_gebruik, max_per_gebruiker,
            is_actief, geldig_tot,
            FORMAT(aangemaakt_op, 'yyyy-MM-dd') as aangemaakt
        FROM dbo.vouchers
        ORDER BY aangemaakt_op DESC
    `);

    if (result.recordset.length === 0) {
        console.log('   Geen vouchers gevonden.');
        return;
    }

    result.recordset.forEach(v => {
        const status = v.is_actief ? '✅' : '❌';
        const maxStr = v.max_gebruik ? `${v.aantal_gebruikt}/${v.max_gebruik}` : `${v.aantal_gebruikt}/∞`;
        const waardeStr = v.type === 'gratis' ? '' :
                         v.type === 'percentage' ? `${v.waarde}%` :
                         v.type === 'maanden_gratis' ? `${v.waarde} mnd` :
                         `€${v.waarde}`;
        const totStr = v.geldig_tot ? ` tot ${v.geldig_tot.toISOString().split('T')[0]}` : '';

        console.log(`   ${status} ${v.code.padEnd(20)} ${v.type.padEnd(15)} ${waardeStr.padEnd(8)} gebruikt: ${maxStr}${totStr}`);
        console.log(`      └─ ${v.naam}`);
    });
    console.log('');
}

async function deactivateVoucher(pool, code) {
    const result = await pool.request()
        .input('code', sql.NVarChar(50), code.toUpperCase())
        .query(`
            UPDATE dbo.vouchers
            SET is_actief = 0, gewijzigd_op = GETDATE()
            OUTPUT INSERTED.code, INSERTED.naam
            WHERE UPPER(code) = @code
        `);

    if (result.recordset.length === 0) {
        console.log(`\n❌ Voucher '${code}' niet gevonden.`);
    } else {
        console.log(`\n✅ Voucher '${result.recordset[0].code}' gedeactiveerd.`);
    }
}

async function createVoucher(pool, args) {
    // Validate required fields
    if (!args.code) {
        console.error('❌ --code is verplicht');
        process.exit(1);
    }
    if (!args.naam) {
        console.error('❌ --naam is verplicht');
        process.exit(1);
    }
    if (!args.type) {
        console.error('❌ --type is verplicht (gratis, percentage, maanden_gratis, vast_bedrag)');
        process.exit(1);
    }

    const validTypes = ['gratis', 'percentage', 'maanden_gratis', 'vast_bedrag'];
    if (!validTypes.includes(args.type)) {
        console.error(`❌ Ongeldig type '${args.type}'. Kies uit: ${validTypes.join(', ')}`);
        process.exit(1);
    }

    // Validate waarde based on type
    let waarde = null;
    if (args.type !== 'gratis') {
        if (!args.waarde) {
            console.error(`❌ --waarde is verplicht voor type '${args.type}'`);
            process.exit(1);
        }
        waarde = parseFloat(args.waarde);
        if (isNaN(waarde) || waarde <= 0) {
            console.error('❌ --waarde moet een positief getal zijn');
            process.exit(1);
        }
        if (args.type === 'percentage' && waarde > 100) {
            console.error('❌ Percentage kan niet hoger zijn dan 100');
            process.exit(1);
        }
    }

    // Parse optional fields
    const maxGebruik = args.max ? parseInt(args.max) : null;
    const maxPerGebruiker = args['max-user'] ? parseInt(args['max-user']) : 1;
    const geldigTot = args.tot ? new Date(args.tot + 'T23:59:59') : null;
    const omschrijving = args.omschrijving || null;

    try {
        const result = await pool.request()
            .input('code', sql.NVarChar(50), args.code.toUpperCase().trim())
            .input('naam', sql.NVarChar(100), args.naam)
            .input('type', sql.NVarChar(20), args.type)
            .input('waarde', sql.Decimal(10, 2), waarde)
            .input('omschrijving', sql.NVarChar(500), omschrijving)
            .input('max_gebruik', sql.Int, maxGebruik)
            .input('max_per_gebruiker', sql.Int, maxPerGebruiker)
            .input('geldig_tot', sql.DateTime, geldigTot)
            .query(`
                INSERT INTO dbo.vouchers (code, naam, type, waarde, omschrijving, max_gebruik, max_per_gebruiker, geldig_tot)
                OUTPUT INSERTED.*
                VALUES (@code, @naam, @type, @waarde, @omschrijving, @max_gebruik, @max_per_gebruiker, @geldig_tot)
            `);

        const voucher = result.recordset[0];

        console.log('\n✅ Voucher aangemaakt!\n');
        console.log(`   Code:        ${voucher.code}`);
        console.log(`   Naam:        ${voucher.naam}`);
        console.log(`   Type:        ${voucher.type}`);
        if (voucher.waarde) console.log(`   Waarde:      ${voucher.waarde}`);
        if (voucher.max_gebruik) console.log(`   Max gebruik: ${voucher.max_gebruik}`);
        console.log(`   Per user:    ${voucher.max_per_gebruiker}`);
        if (voucher.geldig_tot) console.log(`   Geldig tot:  ${voucher.geldig_tot.toISOString().split('T')[0]}`);
        if (voucher.omschrijving) console.log(`   Notitie:     ${voucher.omschrijving}`);
        console.log('');

    } catch (error) {
        if (error.message.includes('Violation of UNIQUE KEY')) {
            console.error(`\n❌ Voucher met code '${args.code.toUpperCase()}' bestaat al.`);
        } else {
            console.error('\n❌ Fout bij aanmaken voucher:', error.message);
        }
        process.exit(1);
    }
}

function showHelp() {
    console.log(`
📦 Voucher CLI Tool

Gebruik:
  node scripts/create-voucher.cjs [opties]

Commando's:
  --list                          Toon alle vouchers
  --deactivate CODE               Deactiveer een voucher

Voucher aanmaken:
  --code CODE                     Voucher code (verplicht, wordt automatisch UPPERCASE)
  --naam "Naam"                   Weergavenaam (verplicht)
  --type TYPE                     Type: gratis, percentage, maanden_gratis, vast_bedrag (verplicht)
  --waarde GETAL                  Waarde (verplicht voor alles behalve gratis)
  --max GETAL                     Maximum totaal gebruik (optioneel, standaard: onbeperkt)
  --max-user GETAL                Maximum per gebruiker (optioneel, standaard: 1)
  --tot YYYY-MM-DD                Geldig tot datum (optioneel)
  --omschrijving "Tekst"          Interne notitie (optioneel)

Voorbeelden:
  # Gratis tester voucher
  node scripts/create-voucher.cjs --code GRATIS-JAN --naam "Gratis voor Jan" --type gratis

  # 20% korting voor vereniging
  node scripts/create-voucher.cjs --code VFAS20 --naam "VFAS ledenkorting" --type percentage --waarde 20 --max 500

  # 2 maanden gratis lanceringsactie
  node scripts/create-voucher.cjs --code LAUNCH2025 --naam "Lanceringsactie" --type maanden_gratis --waarde 2 --tot 2025-03-31 --max 100

  # €5 korting per maand
  node scripts/create-voucher.cjs --code PODCAST5 --naam "Podcast korting" --type vast_bedrag --waarde 5
`);
}

async function main() {
    const args = parseArgs();

    if (args.help || args.h || Object.keys(args).length === 0) {
        showHelp();
        process.exit(0);
    }

    let pool;
    try {
        console.log('🔌 Verbinden met database...');
        pool = await sql.connect(config);

        if (args.list) {
            await listVouchers(pool);
        } else if (args.deactivate) {
            await deactivateVoucher(pool, args.deactivate);
        } else {
            await createVoucher(pool, args);
        }

    } catch (error) {
        console.error('❌ Database fout:', error.message);
        process.exit(1);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

main();
