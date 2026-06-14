import { Client } from 'pg';

const dbUrl = "postgresql://postgres:Sumitiscool!9@db.djxsyagrlfheteeiqdfb.supabase.co:5432/postgres";

async function createMemoryTable() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    
    console.log("Connected to Supabase. Creating user_memories table...");
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_memories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          category TEXT DEFAULT 'fact',
          source_chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log("Table 'user_memories' created or already exists.");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_memories_user_id ON user_memories(user_id);
    `);
    console.log("Index created.");

    // Disable RLS for rapid prototyping (matching existing pattern)
    await client.query(`ALTER TABLE user_memories DISABLE ROW LEVEL SECURITY;`);
    console.log("RLS disabled for prototyping on user_memories.");

    console.log("Memory table migration successful!");
  } catch (err) {
    console.error("Error migrating database:", err);
  } finally {
    await client.end();
  }
}

createMemoryTable();
