/**
 * Seed missing system accounts for all companies in Supabase.
 * 
 * Finds every company_id that is missing any of the 8 core system accounts
 * and inserts the missing ones.
 *
 * Run with: node scripts/seed_system_accounts.mjs
 */
import { Client } from 'pg';

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:Sumitiscool!9@db.djxsyagrlfheteeiqdfb.supabase.co:5432/postgres";

const SYSTEM_ACCOUNTS = [
  { id: 'SYS_SALES',             name: 'Sales Account',                    group_type: 'Revenue',  system_type: 'Sales' },
  { id: 'SYS_PURCHASES',         name: 'Purchases Account',                group_type: 'Expenses', system_type: 'Purchases' },
  { id: 'SYS_CASH',              name: 'Cash',                             group_type: 'Assets',   system_type: 'Cash' },
  { id: 'SYS_DISCOUNT_ALLOWED',  name: 'Discount Allowed',                 group_type: 'Expenses', system_type: 'Discount_Allowed' },
  { id: 'SYS_DISCOUNT_RECEIVED', name: 'Discount Received',                group_type: 'Revenue',  system_type: 'Discount_Received' },
  { id: 'SYS_ADD_CHARGES_REV',   name: 'Additional Charges - Revenue',     group_type: 'Revenue',  system_type: 'Add_Charges_Rev' },
  { id: 'SYS_ADD_CHARGES_EXP',   name: 'Additional Charges - Expenses',    group_type: 'Expenses', system_type: 'Add_Charges_Exp' },
  { id: 'SYS_OB_EQUITY',         name: 'Opening Balance Equity',           group_type: 'Equity',   system_type: 'OB_Equity' },
  { id: 'SYS_FG_INVENTORY',      name: 'Finished Goods Inventory',         group_type: 'Assets',   system_type: 'FG_Inventory' },
  { id: 'SYS_MANUFACTURING',     name: 'Manufacturing Expenses',           group_type: 'Expenses', system_type: 'Manufacturing' },
];

async function seed() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    console.log("Connected to Supabase.\n");

    // Get all company IDs
    const { rows: companies } = await client.query(`SELECT DISTINCT id FROM companies`);
    console.log(`Found ${companies.length} companies: ${companies.map(c => c.id.substring(0, 8) + '…').join(', ')}\n`);

    for (const company of companies) {
      const companyId = company.id;
      console.log(`--- Company ${companyId.substring(0, 8)}… ---`);

      // Check which system accounts already exist for this company
      const { rows: existing } = await client.query(
        `SELECT id FROM accounts WHERE company_id = $1 AND id LIKE 'SYS_%'`,
        [companyId]
      );
      const existingIds = new Set(existing.map(r => r.id));

      const missing = SYSTEM_ACCOUNTS.filter(a => !existingIds.has(a.id));

      if (missing.length === 0) {
        console.log("  ✅ All system accounts present.\n");
        continue;
      }

      console.log(`  Missing ${missing.length} system accounts: ${missing.map(a => a.id).join(', ')}`);

      for (const acc of missing) {
        await client.query(
          `INSERT INTO accounts (company_id, id, name, group_type, system_type)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (company_id, id) DO NOTHING`,
          [companyId, acc.id, acc.name, acc.group_type, acc.system_type]
        );
      }
      console.log(`  ✅ Inserted ${missing.length} missing accounts.\n`);
    }

    console.log("🎉 Done!");
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await client.end();
  }
}

seed();
