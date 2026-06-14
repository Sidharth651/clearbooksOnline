const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://djxsyagrlfheteeiqdfb.supabase.co';
const supabaseKey = 'sb_publishable_QKwABLXdBWJZwv7iZUeLJQ_yKHEkNOf';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error(error);
    return;
  }
  
  console.log(JSON.stringify(data.map(d => d.content), null, 2));
}

main();
