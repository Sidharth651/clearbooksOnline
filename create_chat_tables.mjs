import { Client } from 'pg';

const dbUrl = "postgresql://postgres:Sumitiscool!9@db.djxsyagrlfheteeiqdfb.supabase.co:5432/postgres";

async function createChatTables() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    
    console.log("Connected to Supabase. Creating chat tables...");
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS chats (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log("Table 'chats' created or already exists.");

    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
          role TEXT NOT NULL,
          content JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log("Table 'chat_messages' created or already exists.");

    // Disable RLS for rapid prototyping (as per the user's existing pattern)
    await client.query(`ALTER TABLE chats DISABLE ROW LEVEL SECURITY;`);
    await client.query(`ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;`);
    console.log("RLS disabled for prototyping on chat tables.");

    console.log("Database migration successful!");
  } catch (err) {
    console.error("Error migrating database:", err);
  } finally {
    await client.end();
  }
}

createChatTables();
