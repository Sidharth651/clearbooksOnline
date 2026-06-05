import { Client } from 'pg';

const dbUrl = "postgresql://postgres:Sumitiscool!9@db.djxsyagrlfheteeiqdfb.supabase.co:5432/postgres";

async function disableRLS() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    
    console.log("Connected to Supabase. Disabling RLS for AI prototyping...");
    
    const tables = ['parties', 'items', 'transactions', 'transaction_items', 'journal_entries'];
    
    for (const table of tables) {
      await client.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY;`);
      console.log(`RLS disabled for ${table}`);
    }
    
    console.log("Done.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

disableRLS();
