import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, stepCountIs } from 'ai';
import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getMCPToolsConfig } from '@/lib/mcp-tools';

// ─── Supabase admin client (bypasses cookie-based auth) ──────────────────────
function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ─── Telegram helpers ─────────────────────────────────────────────────────────
const TG_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function sendMessage(chatId: number, text: string) {
  // Telegram message limit is 4096 chars — split if needed
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += 4000) {
    chunks.push(text.slice(i, i + 4000));
  }
  for (const chunk of chunks) {
    await fetch(`${TG_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: chunk,
        parse_mode: 'Markdown',
      }),
    });
  }
}

async function sendTyping(chatId: number) {
  await fetch(`${TG_API}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
  });
}

// ─── Webhook handler ──────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const update = await req.json();

  // Only handle plain text messages
  const message = update?.message;
  if (!message?.text) {
    return new Response('OK');
  }

  const telegramChatId: number = message.chat.id;
  const telegramUserId: number = message.from?.id;
  const userText: string = message.text;

  // ── Whitelist check ──────────────────────────────────────────────────────
  const allowedIds = (process.env.TELEGRAM_ALLOWED_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!allowedIds.includes(String(telegramUserId))) {
    await sendMessage(telegramChatId, '⛔ You are not authorised to use this bot.');
    return new Response('OK');
  }

  // ── Show typing indicator ─────────────────────────────────────────────────
  await sendTyping(telegramChatId);

  // ── Supabase + company setup ──────────────────────────────────────────────
  const supabase = getAdminSupabase();

  // Fetch the mapped Supabase user ID for this Telegram user
  const supabaseUserId = process.env.TELEGRAM_SUPABASE_USER_ID!;

  let companyId = '';
  const { data: companies } = await supabase
    .from('companies')
    .select('id')
    .limit(1);
  if (companies && companies.length > 0) {
    companyId = companies[0].id;
  }

  // ── Fetch user memories ───────────────────────────────────────────────────
  let memoryBlock = '';
  try {
    const { data: memories } = await supabase
      .from('user_memories')
      .select('content, category')
      .eq('user_id', supabaseUserId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (memories && memories.length > 0) {
      const lines = memories
        .map((m: { content: string; category: string }) => `- [${m.category}] ${m.content}`)
        .join('\n');
      memoryBlock = `\n\n## Your Memory About This User\n${lines}`;
    }
  } catch {
    // best-effort
  }

  // ── Fetch recent Telegram chat history (last 10 exchanges) ───────────────
  const { data: recentMessages } = await supabase
    .from('telegram_chat_history')
    .select('role, content')
    .eq('telegram_user_id', String(telegramUserId))
    .order('created_at', { ascending: false })
    .limit(20);

  const historyMessages = (recentMessages ?? [])
    .reverse()
    .map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  // Append the current user message
  const messages = [
    ...historyMessages,
    { role: 'user' as const, content: userText },
  ];

  // ── Build tools ───────────────────────────────────────────────────────────
  // Replace askForConfirmation with an auto-confirming version so multi-step
  // tool chains (lookup → confirm → create) work without user interaction.
  const autoConfirmTool = tool({
    description:
      'Auto-confirms any action on behalf of the user. In the Telegram bot context the user is always considered to have confirmed.',
    inputSchema: z.object({
      message: z.string(),
      details: z.any(),
    }),
    execute: async ({ message, details }) => ({
      confirmed: true,
      message,
      details,
    }),
  });

  const mcpConfig = getMCPToolsConfig(supabase, companyId);
  const mcpTools: Record<string, any> = {};
  for (const [key, value] of Object.entries(mcpConfig)) {
    mcpTools[key] = tool(value as any);
  }

  const allTools = {
    askForConfirmation: autoConfirmTool,
    ...mcpTools,
  };

  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const systemPrompt = `You are QuickInvoice AI, an expert AI accountant assistant.
Your job is to help the business owner manage their accounting via Telegram.

You have direct access to their live cloud database via tools.
If they ask to create an invoice (sales), you should:
1. Look up the customer name to get their ID.
2. Look up the item names to get their IDs.
3. Call askForConfirmation (it will auto-confirm in this context).
4. Then call createInvoice with the correct IDs.

For purchases: same flow using supplier name + askForConfirmation + createPurchase.
For ANY creation task (item, party, receipt, payment, journal entry, expense): call askForConfirmation first, then execute.

You can also:
- AP/AR: check outstanding balances, log receipts and payments.
- Reporting: trial balance, profit & loss, tax/GST summaries, top selling items.
- Day-to-Day: log expenses or bank transfers.
- Ad-hoc DB queries: use customQuery tool for anything not covered above.

IMPORTANT: NEVER show internal database IDs to the user.
Since this is Telegram, keep responses concise and use plain text (avoid heavy markdown tables — prefer simple lists).
Today's date is ${new Date().toISOString().split('T')[0]}.${memoryBlock}`;

  let replyText = '';
  try {
    const result = await generateText({
      model: openrouter('openai/gpt-4o-mini'), // Free/cheap fast model that supports tools well
      messages,
      system: systemPrompt,
      tools: allTools,
      stopWhen: stepCountIs(10),
    });
    replyText = result.text || '✅ Done.';
  } catch (err: any) {
    console.error('[Telegram Bot] AI error:', err);
    replyText = '⚠️ Something went wrong. Please try again.';
  }

  // ── Save history ──────────────────────────────────────────────────────────
  try {
    await supabase.from('telegram_chat_history').insert([
      {
        telegram_user_id: String(telegramUserId),
        supabase_user_id: supabaseUserId,
        role: 'user',
        content: userText,
      },
      {
        telegram_user_id: String(telegramUserId),
        supabase_user_id: supabaseUserId,
        role: 'assistant',
        content: replyText,
      },
    ]);
  } catch {
    // best-effort
  }

  // ── Reply to user ─────────────────────────────────────────────────────────
  await sendMessage(telegramChatId, replyText);

  return new Response('OK');
}
