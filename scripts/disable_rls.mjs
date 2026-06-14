import { Client } from 'pg';

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:Sumitiscool!9@db.djxsyagrlfheteeiqdfb.supabase.co:5432/postgres";

async function disableRls() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    console.log("Connected to Supabase Postgres.");

    const tables = [
      'companies', 'accounts', 'parties', 'items', 'transactions', 'transaction_items',
      'journal_entries', 'settings', 'stock_allocations', 'bill_of_materials',
      'bom_lines', 'production_entries', 'production_materials', 'production_costs',
      'import_jobs', 'import_job_rows'
    ];

    for (const table of tables) {
      try {
        await client.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
        console.log(`✅ Disabled RLS on ${table}`);
      } catch (e) {
        console.log(`⚠️ Failed on ${table}: ${e.message}`);
      }
    }

    console.log("\n🎉 RLS Disabled for all tables!");
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await client.end();
  }
}

disableRls();
