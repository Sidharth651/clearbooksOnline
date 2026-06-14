import { Client } from 'pg';

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:Sumitiscool!9@db.djxsyagrlfheteeiqdfb.supabase.co:5432/postgres";

async function fixSettingsPk() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    
    // Drop existing primary key on settings
    await client.query(`ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey;`);
    
    // Delete any rows that have null company_id just in case
    await client.query(`DELETE FROM settings WHERE company_id IS NULL;`);
    
    // Add composite primary key
    await client.query(`ALTER TABLE settings ADD PRIMARY KEY (company_id, key);`);
    
    console.log("✅ Fixed settings primary key to be (company_id, key)");
    
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await client.end();
  }
}

fixSettingsPk();
