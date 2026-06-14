import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('chats')
    .select('id, title, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Retroactively fix chats that still have "New Chat" as their title
  const untitledChats = (data || []).filter(c => c.title === 'New Chat' || !c.title);
  for (const chat of untitledChats) {
    const { data: firstMsg } = await supabase
      .from('chat_messages')
      .select('content')
      .eq('chat_id', chat.id)
      .eq('role', 'user')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (firstMsg?.content) {
      let title = '';
      const c = firstMsg.content;
      // content can be a stored message object — extract text from various shapes
      if (typeof c === 'string') {
        title = c;
      } else if (typeof c === 'object') {
        title = c.text || c.content || '';
        if (!title && Array.isArray(c.parts)) {
          const textPart = c.parts.find((p: any) => p.type === 'text');
          if (textPart) title = textPart.text || '';
        }
      }
      title = title.trim().substring(0, 50);
      if (title) {
        await supabase.from('chats').update({ title }).eq('id', chat.id);
        chat.title = title;
      }
    }
  }

  return NextResponse.json(data);
}
