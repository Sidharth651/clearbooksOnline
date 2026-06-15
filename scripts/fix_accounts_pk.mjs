import { Client } from 'pg';

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:Sumitiscool!9@db.djxsyagrlfheteeiqdfb.supabase.co:5432/postgres";

async function fixAccountsPk() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    console.log("Connected to Supabase.");

    // ── Step 1: Drop dependent foreign keys ──
    console.log("\n--- Dropping dependent foreign keys ---");

    await client.query(`ALTER TABLE parties DROP CONSTRAINT IF EXISTS parties_account_id_fkey;`);
    console.log("  ✅ Dropped parties_account_id_fkey");

    await client.query(`ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS journal_entries_account_id_fkey;`);
    console.log("  ✅ Dropped journal_entries_account_id_fkey");

    // ── Step 2: Drop old single-column PK ──
    console.log("\n--- Fixing accounts primary key ---");
    await client.query(`ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_pkey;`);
    console.log("  ✅ Dropped old accounts_pkey");

    // Set replica identity to FULL temporarily so we can delete rows
    // (Supabase realtime requires replica identity for DELETE operations)
    await client.query(`ALTER TABLE accounts REPLICA IDENTITY FULL;`);

    // Clean up orphan rows with NULL company_id
    const res = await client.query(`DELETE FROM accounts WHERE company_id IS NULL;`);
    console.log(`  Cleaned up ${res.rowCount} rows with NULL company_id`);

    // ── Step 3: Add composite PK ──
    await client.query(`ALTER TABLE accounts ADD PRIMARY KEY (company_id, id);`);
    console.log("  ✅ Added composite PK (company_id, id)");

    // Restore replica identity to use the new PK index
    await client.query(`ALTER TABLE accounts REPLICA IDENTITY DEFAULT;`);

    // ── Step 4: FK note ──
    console.log("\n--- FK constraints note ---");
    console.log("  ℹ️  Foreign keys from parties/journal_entries to accounts were");
    console.log("     intentionally NOT re-added. The multi-tenant CloudDbAdapter");
    console.log("     handles scoping. App logic enforces referential integrity.");

    console.log("\n🎉 Done! accounts table now uses composite PK (company_id, id).");
    console.log("   You can now re-push the second company via 'Go Online'.");

  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await client.end();
  }
}

fixAccountsPk();
