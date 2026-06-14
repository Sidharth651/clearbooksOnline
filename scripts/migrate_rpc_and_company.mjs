/**
 * Supabase Migration Script
 * 
 * Creates:
 * 1. run_query() - RPC function for read-only SQL passthrough
 * 2. run_execute() - RPC function for INSERT/UPDATE/DELETE passthrough
 * 3. company_id columns on all business tables
 * 4. Indexes for company_id
 * 
 * Run with: node scripts/migrate_rpc_and_company.mjs
 */
import { Client } from 'pg';

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:Sumitiscool!9@db.djxsyagrlfheteeiqdfb.supabase.co:5432/postgres";

async function migrate() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    console.log("Connected to Supabase Postgres.");

    // ─── 1. Create run_query RPC function ───
    console.log("\n--- Creating run_query function ---");
    await client.query(`
      CREATE OR REPLACE FUNCTION run_query(
        p_sql TEXT,
        p_params JSONB DEFAULT '[]'::JSONB,
        p_company_id TEXT DEFAULT NULL
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result JSONB;
        safe_sql TEXT;
        param_count INTEGER;
        param_values TEXT[];
        final_sql TEXT;
        i INTEGER;
      BEGIN
        safe_sql := TRIM(p_sql);
        
        -- SECURITY: Only allow SELECT statements
        IF NOT (safe_sql ~* '^\\s*SELECT\\s') THEN
          RAISE EXCEPTION 'run_query only allows SELECT statements. Got: %', LEFT(safe_sql, 50);
        END IF;

        -- SECURITY: Block dangerous subqueries (word-boundary matching to avoid
        -- false positives on column names like created_at matching CREATE)
        IF safe_sql ~* '\\m(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE)\\M' THEN
          RAISE EXCEPTION 'Dangerous keywords detected in SELECT query';
        END IF;

        -- Convert JSONB params array to TEXT[]
        SELECT array_agg(elem) INTO param_values
        FROM jsonb_array_elements_text(p_params) AS elem;

        param_count := COALESCE(array_length(param_values, 1), 0);

        -- Replace $N placeholders with safely quoted literal values.
        -- This allows Postgres to infer the correct types (date, numeric, etc.)
        -- instead of forcing everything through TEXT typed USING params.
        final_sql := safe_sql;
        FOR i IN REVERSE param_count..1 LOOP
          final_sql := replace(final_sql, '$' || i::text, COALESCE(quote_literal(param_values[i]), 'NULL'));
        END LOOP;

        EXECUTE format('SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (%s) t', final_sql) INTO result;

        RETURN COALESCE(result, '[]'::JSONB);
      END;
      $$;
    `);
    console.log("✅ run_query function created.");

    // ─── 2. Create run_execute RPC function ───
    console.log("\n--- Creating run_execute function ---");
    await client.query(`
      CREATE OR REPLACE FUNCTION run_execute(
        p_sql TEXT,
        p_params JSONB DEFAULT '[]'::JSONB,
        p_company_id TEXT DEFAULT NULL
      )
      RETURNS INTEGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        affected INTEGER;
        safe_sql TEXT;
        param_count INTEGER;
        param_values TEXT[];
        final_sql TEXT;
        i INTEGER;
      BEGIN
        safe_sql := TRIM(p_sql);
        
        -- SECURITY: Block DDL and dangerous operations (word-boundary matching)
        IF safe_sql ~* '\\m(DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE)\\M' THEN
          RAISE EXCEPTION 'DDL statements are not allowed via run_execute. Got: %', LEFT(safe_sql, 50);
        END IF;

        -- Convert JSONB params array to TEXT[]
        SELECT array_agg(elem) INTO param_values
        FROM jsonb_array_elements_text(p_params) AS elem;

        param_count := COALESCE(array_length(param_values, 1), 0);

        -- Replace $N placeholders with safely quoted literal values
        final_sql := safe_sql;
        FOR i IN REVERSE param_count..1 LOOP
          final_sql := replace(final_sql, '$' || i::text, COALESCE(quote_literal(param_values[i]), 'NULL'));
        END LOOP;

        EXECUTE final_sql;

        GET DIAGNOSTICS affected = ROW_COUNT;
        RETURN affected;
      END;
      $$;
    `);
    console.log("✅ run_execute function created.");

    // ─── 3. Add company_id to all business tables ───
    console.log("\n--- Adding company_id columns ---");
    const tables = [
      'accounts', 'parties', 'items', 'transactions', 'transaction_items',
      'journal_entries', 'settings', 'stock_allocations',
      'bill_of_materials', 'bom_lines',
      'production_entries', 'production_materials', 'production_costs',
      'import_jobs', 'import_job_rows'
    ];

    for (const table of tables) {
      try {
        await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS company_id TEXT`);
        console.log(`  ✅ Added company_id to ${table}`);
      } catch (e) {
        console.log(`  ⚠️ ${table}: ${e.message}`);
      }
    }

    // ─── 4. Create indexes for company_id ───
    console.log("\n--- Creating company_id indexes ---");
    const indexedTables = ['accounts', 'parties', 'items', 'transactions', 'journal_entries', 'settings'];
    for (const table of indexedTables) {
      try {
        await client.query(`CREATE INDEX IF NOT EXISTS idx_${table}_company ON ${table}(company_id)`);
        console.log(`  ✅ Index created on ${table}.company_id`);
      } catch (e) {
        console.log(`  ⚠️ ${table} index: ${e.message}`);
      }
    }

    // ─── 5. Ensure companies table exists ───
    console.log("\n--- Ensuring companies table ---");
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS companies (
          id TEXT PRIMARY KEY,
          user_id UUID,
          name TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("✅ companies table ready.");
    } catch (e) {
      console.log(`  ⚠️ companies table: ${e.message}`);
    }

    console.log("\n🎉 Migration complete!");

  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
