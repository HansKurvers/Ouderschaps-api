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

const migrationSQL = `
MERGE INTO financiele_instellingen AS target
USING (VALUES
  ('ABN AMRO Bank', 'Bank', 'hypotheek,kapitaalverzekering', 1),
  ('ING Bank', 'Bank', 'hypotheek,kapitaalverzekering', 1),
  ('Rabobank', 'Bank', 'hypotheek,kapitaalverzekering', 1),
  ('de Volksbank (SNS)', 'Bank', 'hypotheek,kapitaalverzekering', 1),
  ('ASN Bank', 'Bank', 'hypotheek,kapitaalverzekering', 1),
  ('RegioBank', 'Bank', 'hypotheek,kapitaalverzekering', 1),
  ('Triodos Bank', 'Bank', 'hypotheek,kapitaalverzekering', 1),
  ('NIBC Bank', 'Bank', 'hypotheek,kapitaalverzekering', 1),
  ('Knab', 'Bank', 'hypotheek,kapitaalverzekering', 1),
  ('bunq', 'Bank', 'kapitaalverzekering', 1),
  ('N26', 'Bank', 'kapitaalverzekering', 1),
  ('Revolut', 'Bank', 'kapitaalverzekering', 1),
  ('BLG Wonen', 'Hypotheekverstrekker', 'hypotheek,kapitaalverzekering', 1),
  ('Florius', 'Hypotheekverstrekker', 'hypotheek,kapitaalverzekering', 1),
  ('Obvion', 'Hypotheekverstrekker', 'hypotheek,kapitaalverzekering', 1),
  ('Munt Hypotheken', 'Hypotheekverstrekker', 'hypotheek,kapitaalverzekering', 1),
  ('Lloyds Bank', 'Bank', 'hypotheek,kapitaalverzekering', 1),
  ('Vista Hypotheken', 'Hypotheekverstrekker', 'hypotheek,kapitaalverzekering', 1),
  ('Lot Hypotheken', 'Hypotheekverstrekker', 'hypotheek,kapitaalverzekering', 1),
  ('Woonfonds', 'Hypotheekverstrekker', 'hypotheek,kapitaalverzekering', 1),
  ('Argenta', 'Bank', 'hypotheek,kapitaalverzekering', 1),
  ('Hypotrust', 'Hypotheekverstrekker', 'hypotheek,kapitaalverzekering', 1),
  ('Direktbank', 'Hypotheekverstrekker', 'hypotheek,kapitaalverzekering', 1),
  ('Centraal Beheer', 'Verzekeraar', 'hypotheek,kapitaalverzekering', 1),
  ('DELA', 'Verzekeraar', 'kapitaalverzekering,uitvaart', 1)
) AS source (naam, type, geschikt_voor, actief)
ON target.naam = source.naam
WHEN MATCHED THEN
  UPDATE SET
    type = source.type,
    geschikt_voor = source.geschikt_voor,
    actief = source.actief
WHEN NOT MATCHED THEN
  INSERT (naam, type, geschikt_voor, actief)
  VALUES (source.naam, source.type, source.geschikt_voor, source.actief);
`;

async function runMigration() {
  try {
    const pool = await sql.connect(config);
    console.log('Connected to database');
    
    const result = await pool.request().query(migrationSQL);
    console.log('Migration completed successfully!');
    console.log('Rows affected:', result.rowsAffected[0]);
    
    // Verify the data
    const verify = await pool.request().query(`
      SELECT naam, type, geschikt_voor 
      FROM financiele_instellingen 
      WHERE type IN ('Bank', 'Hypotheekverstrekker')
      ORDER BY type, naam
    `);
    console.log('\nBanks and Hypotheekverstrekkers in database:');
    verify.recordset.forEach(row => {
      console.log(`  - ${row.naam} (${row.type})`);
    });
    
    await pool.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

runMigration();
