import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, generateText, convertToModelMessages, stepCountIs } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabase as adminSupabase } from '@/lib/supabase';
import { getNativeAITools, getMCPToolsConfig } from '@/lib/mcp-tools';
import { tool } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const body = await req.json();
  const { messages, id: bodyId, chatId: bodyChatId, customFiles, companyId: bodyCompanyId } = body;
  let companyId = bodyCompanyId || '';
  const url = new URL(req.url);
  const providedChatId = url.searchParams.get('chatId');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!companyId) {
    const { data: companies } = await supabase.from('companies').select('id').limit(1);
    if (companies && companies.length > 0) {
      companyId = companies[0].id;
    }
  }

  const lastMessage = messages[messages.length - 1];
  
  // If we received customFiles, add them to the last message's content array for AI processing
  if (customFiles && customFiles.length > 0) {
    const textPart = typeof lastMessage.content === 'string' 
      ? { type: 'text', text: lastMessage.content } 
      : (Array.isArray(lastMessage.content) ? lastMessage.content.find((p:any) => p.type === 'text') || { type: 'text', text: '' } : { type: 'text', text: lastMessage.content?.text || '' });
    
    lastMessage.content = [
      textPart,
      ...customFiles.map((f: any) => ({
        type: f.contentType.startsWith('image/') ? 'image' : 'file',
        image: f.contentType.startsWith('image/') ? f.url : undefined,
        data: !f.contentType.startsWith('image/') ? f.url : undefined,
        mimeType: f.contentType
      }))
    ];
  }

  const chatId = providedChatId || bodyChatId || bodyId || crypto.randomUUID();

  // Extract title from the user's first message — handle string, object, or parts array
  let chatTitle = "New Chat";
  const msgContent = lastMessage.content;
  if (typeof msgContent === 'string' && msgContent.trim()) {
    chatTitle = msgContent.trim();
  } else if (Array.isArray(msgContent)) {
    const textPart = msgContent.find((p: any) => p.type === 'text');
    if (textPart?.text) chatTitle = textPart.text.trim();
  } else if (typeof msgContent === 'object' && msgContent !== null) {
    chatTitle = (msgContent as any).text || (msgContent as any).value || "New Chat";
  }
  // Also check top-level .text property (used by sendMessage({ text: ... }))
  if (chatTitle === "New Chat" && lastMessage.text) {
    chatTitle = lastMessage.text;
  }
  chatTitle = chatTitle.substring(0, 50);

  // Upsert the chat — creates on first message, no-op on follow-ups
  await supabase.from('chats').upsert({
    id: chatId,
    user_id: user.id,
    title: chatTitle,
  }, { onConflict: 'id', ignoreDuplicates: true });

  // Save Incoming Message (either user message or tool-result assistant message)
  await supabase.from('chat_messages').insert({
    chat_id: chatId,
    role: lastMessage.role || 'user',
    content: lastMessage,
  });

  // --- MEMORY: Fetch user memories to inject into system prompt ---
  let memoryBlock = '';
  try {
    const { data: memories } = await supabase
      .from('user_memories')
      .select('content, category')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (memories && memories.length > 0) {
      const memoryLines = memories.map(
        (m: { content: string; category: string }) => `- [${m.category}] ${m.content}`
      ).join('\n');
      memoryBlock = `\n\n## Your Memory About This User\nYou have remembered the following facts from previous conversations with this user. Use them to personalize your responses:\n${memoryLines}`;
    }
  } catch (e) {
    // If memory fetch fails, continue without memories
    console.error('Failed to fetch user memories:', e);
  }

  // Ensure all messages have a parts array to prevent convertToModelMessages from crashing
  const normalizedMessages = messages.map((m: any) => {
    if (!m.parts) {
      if (typeof m.content === 'string') {
        return { ...m, parts: [{ type: 'text', text: m.content }] };
      } else if (Array.isArray(m.content)) {
        return { ...m, parts: m.content };
      } else {
        return { ...m, parts: [] };
      }
    }
    return m;
  });

  let modelMessages;
  try {
    modelMessages = await convertToModelMessages(normalizedMessages);
  } catch (e: any) {
    console.error('ERROR in convertToModelMessages:', e.message);
    console.error('Failing messages payload:', JSON.stringify(normalizedMessages, null, 2));
    throw e;
  }

  // Check if any message contains attachments (images or files)
  const hasAttachments = messages.some((m: any) => 
    m.experimental_attachments?.length > 0 || 
    (Array.isArray(m.content) && m.content.some((part: any) => part.type === 'image' || part.type === 'file' || part.type === 'file-url' || part.type === 'image-url'))
  );

  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });

  const chatModel = hasAttachments 
    ? google('gemini-2.0-flash') 
    : openrouter('openai/gpt-oss-120b:free');

  const baseSystemPrompt = `You are QuickInvoice AI, an expert, incredibly fast AI accountant assistant.
    Your job is to help the business owner manage their accounting via a chat interface.
    
    You have direct access to their live cloud database via tools.
    If they ask to create an invoice (sales), you should ALWAYS:
    1. Look up the customer name to get their ID. You MUST pass the nameQuery argument.
    2. Look up the item names to get their IDs. You MUST pass the nameQuery argument.
    3. You MUST FIRST call the askForConfirmation tool with the details. DO NOT call createInvoice in the same step.
    4. Once the user confirms, call the createInvoice tool with the correct IDs, quantities, and rates.
    
    If they ask to create a purchase, do the same but use the supplier's name, call askForConfirmation, and then call createPurchase.
    For ANY creation task (item, party, receipt, payment, journal entry, expense), you MUST call askForConfirmation first.
    
    You can also act as a full accountant:
    - AP/AR: check outstanding balances (getOutstandingBalances), log receipts (createReceipt) and payments (createPayment).
    - Reporting: generate a trial balance (getTrialBalance), profit & loss (getProfitAndLoss), tax/GST summaries (getTaxSummary), or top selling items.
    - Day-to-Day: log expenses (recordExpense) or bank transfers (createBankTransfer).
    
    For ANY custom or ad-hoc database question that isn't covered by the specialised tools above, use the customQuery tool.
    It can read any business table with flexible filters, column selection, ordering, and pagination.
    Available tables: accounts, parties, items, transactions, transaction_items, journal_entries, settings, stock_allocations, bill_of_materials, bom_lines, production_entries, production_materials, production_costs, import_jobs, import_job_rows, companies.
    
    IMPORTANT: NEVER show the product ID, item ID, or any database ID to the user in any of your responses when listing items or products.
    
    Be concise, helpful, and professional.`;

  const result = streamText({
    model: chatModel,
    messages: modelMessages,
    stopWhen: stepCountIs(10),
    system: baseSystemPrompt + memoryBlock,
    tools: (() => {
      const nativeTools = getNativeAITools();
      const mcpConfig = getMCPToolsConfig(supabase, companyId);
      const mcpTools: Record<string, any> = {};
      for (const [key, value] of Object.entries(mcpConfig)) {
        mcpTools[key] = tool(value as any);
      }
      return { ...nativeTools, ...mcpTools };
    })(),
    onFinish: async ({ response }) => {
      // Save the AI's response messages (which include tool calls and tool results)
      if (response && response.messages) {
        for (const message of response.messages) {
           await supabase.from('chat_messages').insert({
             chat_id: chatId,
             role: message.role,
             content: message
           });
        }
      }

      // --- MEMORY: Extract memorable facts from this conversation ---
      try {
        // Build a text summary of the conversation for memory extraction
        const conversationText = messages.map((m: any) => {
          const role = m.role === 'user' ? 'User' : 'Assistant';
          const text = typeof m.content === 'string' 
            ? m.content 
            : (m.text || (Array.isArray(m.content) 
                ? m.content.filter((p: any) => p.type === 'text').map((p: any) => p.text).join(' ')
                : JSON.stringify(m.content)));
          return `${role}: ${text}`;
        }).join('\n');

        // Fetch existing memories to avoid duplicates
        const { data: existingMemories } = await supabase
          .from('user_memories')
          .select('content')
          .eq('user_id', user.id);
        
        const existingContents = (existingMemories || []).map(
          (m: { content: string }) => m.content.toLowerCase()
        );

        const extractionResult = await generateText({
          model: google('gemini-2.0-flash'),
          system: `You are a memory extraction system. Given a conversation between a user and their AI accounting assistant, extract key facts about the user that would be useful to remember in future conversations.

Return ONLY a valid JSON array of objects with "content" and "category" fields.
Categories: "preference", "fact", "relationship", "instruction"

Rules:
- Only extract genuinely useful, long-term facts about the USER (not about what the AI did)
- Examples of good memories: "User's company is called Silk House Textiles", "User prefers GST-inclusive pricing", "User's main customer is ABC Corp", "User wants invoices in Hindi"
- Do NOT extract: transient requests ("create invoice for X"), data already in the database (item prices, account balances), or obvious/generic facts
- If there is nothing worth remembering, return []
- Keep each memory concise (under 100 characters)
- Return 1-3 memories maximum per conversation`,
          prompt: conversationText,
        });

        // Parse and save extracted memories
        const responseText = extractionResult.text.trim();
        // Extract JSON array from the response (handle markdown code blocks)
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const newMemories = JSON.parse(jsonMatch[0]);
          
          for (const memory of newMemories) {
            if (!memory.content || !memory.category) continue;
            
            // Skip if a similar memory already exists
            const memoryLower = memory.content.toLowerCase();
            const isDuplicate = existingContents.some(
              (existing: string) => existing.includes(memoryLower) || memoryLower.includes(existing)
            );
            if (isDuplicate) continue;

            await supabase.from('user_memories').insert({
              user_id: user.id,
              content: memory.content,
              category: memory.category,
              source_chat_id: chatId,
            });
          }
        }
      } catch (e) {
        // Memory extraction is best-effort — don't fail the response
        console.error('Memory extraction failed:', e);
      }
    }
  });

  return result.toUIMessageStreamResponse();
}
