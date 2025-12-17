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

async function runMigration() {
  try {
    const pool = await sql.connect(config);
    console.log('Connected to database');

    // 0. Update CHECK constraint to allow new types
    console.log('\n0. Updating CHECK constraint for new types...');
    try {
      await pool.request().query(`
        ALTER TABLE dbo.pensioen_uitvoerders
        DROP CONSTRAINT CK_pensioen_uitvoerders_type
      `);
      console.log('   Old constraint dropped');
    } catch (e) {
      console.log('   Constraint already removed or not found');
    }

    await pool.request().query(`
      ALTER TABLE dbo.pensioen_uitvoerders
      ADD CONSTRAINT CK_pensioen_uitvoerders_type
      CHECK ([type] IN (
        'Anders',
        'Hypotheekverstrekker',
        'Bank',
        'Verzekeraar',
        'PPI',
        'Pensioenfonds',
        'Broker',
        'Vermogensbeheerder',
        'Crypto Exchange'
      ))
    `);
    console.log('   New constraint added with Broker, Vermogensbeheerder, Crypto Exchange');

    // 1. Update existing banks to include 'belegging' in geschikt_voor
    console.log('\n1. Updating banks to include belegging...');
    const updateBanks = await pool.request().query(`
      UPDATE dbo.pensioen_uitvoerders
      SET geschikt_voor = geschikt_voor + ',belegging'
      WHERE type = 'Bank'
        AND geschikt_voor IS NOT NULL
        AND geschikt_voor NOT LIKE '%belegging%'
    `);
    console.log(`   Banks updated: ${updateBanks.rowsAffected[0]}`);

    // 2. Add new beleggingsinstellingen using MERGE
    console.log('\n2. Adding new beleggingsinstellingen...');
    const mergeSql = `
      MERGE INTO dbo.pensioen_uitvoerders AS target
      USING (VALUES
        -- Brokers (online beleggingsplatformen)
        ('DeGiro', 'Broker', 'belegging', 1, 100),
        ('LYNX', 'Broker', 'belegging', 1, 101),
        ('Saxo Bank', 'Broker', 'belegging', 1, 102),
        ('Flatex', 'Broker', 'belegging', 1, 103),
        ('Interactive Brokers', 'Broker', 'belegging', 1, 104),
        ('BinckBank', 'Broker', 'belegging', 1, 105),
        ('Trade Republic', 'Broker', 'belegging', 1, 106),
        ('eToro', 'Broker', 'belegging', 1, 107),
        ('MEXEM', 'Broker', 'belegging', 1, 108),
        ('Bux Zero', 'Broker', 'belegging', 1, 109),

        -- Vermogensbeheerders
        ('ABN AMRO MeesPierson', 'Vermogensbeheerder', 'belegging', 1, 200),
        ('ING Private Banking', 'Vermogensbeheerder', 'belegging', 1, 201),
        ('Rabobank Private Banking', 'Vermogensbeheerder', 'belegging', 1, 202),
        ('Van Lanschot Kempen', 'Vermogensbeheerder', 'belegging', 1, 203),
        ('InsingerGilissen', 'Vermogensbeheerder', 'belegging', 1, 204),
        ('Optimix', 'Vermogensbeheerder', 'belegging', 1, 205),
        ('Robeco', 'Vermogensbeheerder', 'belegging', 1, 206),
        ('Triodos Investment Management', 'Vermogensbeheerder', 'belegging', 1, 207),
        ('Kempen & Co', 'Vermogensbeheerder', 'belegging', 1, 208),
        ('ASN Beleggingsfondsen', 'Vermogensbeheerder', 'belegging', 1, 209),

        -- Crypto Exchanges
        ('Bitvavo', 'Crypto Exchange', 'belegging', 1, 300),
        ('Binance', 'Crypto Exchange', 'belegging', 1, 301),
        ('Coinbase', 'Crypto Exchange', 'belegging', 1, 302),
        ('Kraken', 'Crypto Exchange', 'belegging', 1, 303),
        ('Bybit', 'Crypto Exchange', 'belegging', 1, 304),
        ('Bitpanda', 'Crypto Exchange', 'belegging', 1, 305),
        ('BLOX', 'Crypto Exchange', 'belegging', 1, 306)
      ) AS source (naam, type, geschikt_voor, is_actief, volgorde)
      ON target.naam = source.naam AND target.type = source.type
      WHEN MATCHED THEN
        UPDATE SET
          geschikt_voor = CASE
            WHEN target.geschikt_voor IS NULL THEN source.geschikt_voor
            WHEN target.geschikt_voor NOT LIKE '%belegging%' THEN target.geschikt_voor + ',belegging'
            ELSE target.geschikt_voor
          END,
          is_actief = source.is_actief
      WHEN NOT MATCHED THEN
        INSERT (naam, type, geschikt_voor, is_actief, volgorde, aangemaakt_op)
        VALUES (source.naam, source.type, source.geschikt_voor, source.is_actief, source.volgorde, GETDATE());
    `;
    const mergeResult = await pool.request().query(mergeSql);
    console.log(`   Records merged: ${mergeResult.rowsAffected[0]}`);

    // 3. Update "Anders" record to include belegging
    console.log('\n3. Updating Anders record...');
    const updateAnders = await pool.request().query(`
      UPDATE dbo.pensioen_uitvoerders
      SET geschikt_voor = CASE
        WHEN geschikt_voor IS NULL THEN 'belegging'
        WHEN geschikt_voor NOT LIKE '%belegging%' THEN geschikt_voor + ',belegging'
        ELSE geschikt_voor
      END
      WHERE naam = 'Anders'
    `);
    console.log(`   Anders updated: ${updateAnders.rowsAffected[0]}`);

    // 4. Verify results
    console.log('\n=== Verification: Records with belegging ===');
    const verify = await pool.request().query(`
      SELECT type, naam, geschikt_voor
      FROM dbo.pensioen_uitvoerders
      WHERE geschikt_voor LIKE '%belegging%' OR naam = 'Anders'
      ORDER BY type, volgorde, naam
    `);

    let currentType = '';
    verify.recordset.forEach(row => {
      if (row.type !== currentType) {
        currentType = row.type;
        console.log(`\n  [${currentType}]`);
      }
      console.log(`    - ${row.naam}`);
    });

    // 5. Count by type
    console.log('\n=== Summary by type ===');
    const summary = await pool.request().query(`
      SELECT type, COUNT(*) as count
      FROM dbo.pensioen_uitvoerders
      WHERE geschikt_voor LIKE '%belegging%'
      GROUP BY type
      ORDER BY type
    `);
    summary.recordset.forEach(row => {
      console.log(`  ${row.type}: ${row.count} records`);
    });

    await pool.close();
    console.log('\nMigration completed successfully!');

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

runMigration();
