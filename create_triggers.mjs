import { Client } from 'pg';

const dbUrl = "postgresql://postgres:Sumitiscool!9@db.djxsyagrlfheteeiqdfb.supabase.co:5432/postgres";

async function createTriggers() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    console.log("Connected to Supabase.");

    // Enable moddatetime extension in the extensions schema
    await client.query(`CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;`);
    console.log("Enabled moddatetime extension.");

    const tables = ["accounts", "parties", "items", "transactions", "transaction_items", "journal_entries", "stock_allocations"];
    for (const table of tables) {
      // Drop trigger if exists to avoid errors
      await client.query(`DROP TRIGGER IF EXISTS handle_updated_at ON ${table};`);
      
      // Create trigger
      await client.query(`
        CREATE TRIGGER handle_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION extensions.moddatetime (updated_at);
      `);
      console.log(`Added updated_at trigger to ${table}`);
    }

    console.log("Triggers creation successful!");
  } catch (err) {
    console.error("Error creating triggers:", err);
  } finally {
    await client.end();
  }
}

createTriggers();
