import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('user_memories')
    .select('id, content, category, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const clearAll = url.searchParams.get('all') === 'true';

  if (clearAll) {
    // Delete all memories for this user
    const { error } = await supabase
      .from('user_memories')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'All memories cleared' });
  }

  // Delete a single memory by ID
  const body = await req.json().catch(() => ({}));
  const memoryId = body.id;

  if (!memoryId) {
    return NextResponse.json({ error: 'Missing memory id' }, { status: 400 });
  }

  const { error } = await supabase
    .from('user_memories')
    .delete()
    .eq('id', memoryId)
    .eq('user_id', user.id); // Ensure user owns the memory

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
