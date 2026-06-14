import { Client } from 'pg';

const dbUrl = "postgresql://postgres:Sumitiscool!9@db.djxsyagrlfheteeiqdfb.supabase.co:5432/postgres";

async function updateSchema() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    console.log("Connected to Supabase.");

    const tables = ["accounts", "parties", "items", "transactions", "transaction_items", "journal_entries", "stock_allocations"];
    for (const table of tables) {
      await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`);
      console.log(`Added updated_at to ${table}`);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS deleted_records (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        deleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Created deleted_records table.");
    
    // Disable RLS for deleted_records
    await client.query(`ALTER TABLE deleted_records DISABLE ROW LEVEL SECURITY;`);
    console.log("RLS disabled for deleted_records.");

    console.log("Schema update successful!");
  } catch (err) {
    console.error("Error migrating database:", err);
  } finally {
    await client.end();
  }
}

updateSchema();
