import { Client } from 'pg';

const dbUrl = "postgresql://postgres:Sumitiscool!9@db.djxsyagrlfheteeiqdfb.supabase.co:5432/postgres";

async function createTelegramTables() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    
    console.log("Connected to Supabase. Creating telegram_chat_history table...");
    
    await client.query(`
      create table if not exists telegram_chat_history (
        id            uuid primary key default gen_random_uuid(),
        telegram_user_id  text not null,
        supabase_user_id  uuid,
        role          text not null check (role in ('user', 'assistant')),
        content       text not null,
        created_at    timestamptz default now()
      );
    `);
    console.log("Table 'telegram_chat_history' created or already exists.");

    await client.query(`
      create index if not exists idx_telegram_history_user_time
        on telegram_chat_history (telegram_user_id, created_at desc);
    `);
    console.log("Index 'idx_telegram_history_user_time' created.");

    // Disable RLS for rapid prototyping (as per the user's existing pattern)
    await client.query(`ALTER TABLE telegram_chat_history DISABLE ROW LEVEL SECURITY;`);
    console.log("RLS disabled for prototyping on telegram_chat_history.");

    console.log("Database migration successful!");
  } catch (err) {
    console.error("Error migrating database:", err);
  } finally {
    await client.end();
  }
}

createTelegramTables();
