import { createOpenRouter } from '@openrouter/ai-sdk-provider';

// ... other imports stay the same (we'll just replace line 1 and update line 44)
import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabase as adminSupabase } from '@/lib/supabase'; // Using the original client for admin tasks like tools if needed, but better to use the user's client if they have RLS. For now, since RLS is disabled, either is fine.

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const url = new URL(req.url);
  const providedChatId = url.searchParams.get('chatId');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const lastMessage = messages[messages.length - 1];
  const chatId = providedChatId || crypto.randomUUID();

  // Check if chat exists
  const { data: existingChat } = await supabase.from('chats').select('id').eq('id', chatId).single();
  
  if (!existingChat) {
    await supabase.from('chats').insert({
      id: chatId,
      user_id: user.id,
      title: (lastMessage.content || lastMessage.text || "New Chat").substring(0, 40),
    });
  }

  // Save User Message
  await supabase.from('chat_messages').insert({
    chat_id: chatId,
    role: 'user',
    content: lastMessage,
  });

  const modelMessages = await convertToModelMessages(messages);

  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const result = streamText({
    model: openrouter('openai/gpt-oss-120b:free'),
    messages: modelMessages,
    stopWhen: stepCountIs(5),
    system: `You are QuickInvoice AI, an expert, incredibly fast AI accountant assistant.
    Your job is to help the business owner manage their accounting via a chat interface.
    
    You have direct access to their live cloud database via tools.
    If they ask to create an invoice, you should ALWAYS:
    1. Look up the customer name to get their ID. You MUST pass the nameQuery argument.
    2. Look up the item names to get their IDs. You MUST pass the nameQuery argument.
    3. Call the createInvoice tool with the correct IDs, quantities, and rates.
    
    Be concise, helpful, and professional.`,
    tools: {
      lookupInvoices: tool({
        description: 'Fetch recent sales invoices from the database',
        inputSchema: z.object({
          limit: z.number().optional().describe('Number of recent invoices to fetch. Default is 5.'),
        }),
        execute: async ({ limit }) => {
          const fetchLimit = limit || 5;
          const { data, error } = await supabase
            .from('transactions')
            .select(`
              id,
              voucher_no,
              date,
              total_amount,
              party:parties(name)
            `)
            .eq('voucher_type', 'SALES')
            .order('date', { ascending: false })
            .limit(fetchLimit);
            
          if (error) throw new Error(error.message);
          
          return data.map((tx: any) => ({
            id: tx.id,
            voucherNo: tx.voucher_no,
            date: tx.date,
            totalAmount: tx.total_amount,
            customerName: tx.party?.name || 'Unknown'
          }));
        },
      }),
      lookupCustomers: tool({
        description: 'Search for customers by name',
        inputSchema: z.object({
          nameQuery: z.string().describe('The name or partial name of the customer to search for'),
        }),
        execute: async ({ nameQuery }) => {
          const query = nameQuery || '';
          const { data, error } = await supabase
            .from('parties')
            .select('id, name, phone, address')
            .ilike('name', `%${query}%`)
            .limit(5);
          if (error) throw new Error(error.message);
          return data;
        },
      }),
      lookupItems: tool({
        description: 'Search for inventory items/products by name',
        inputSchema: z.object({
          nameQuery: z.string().describe('The name or partial name of the item to search for'),
        }),
        execute: async ({ nameQuery }) => {
          const query = nameQuery || '';
          const { data, error } = await supabase
            .from('items')
            .select('id, name, default_rate, unit')
            .ilike('name', `%${query}%`)
            .limit(5);
          if (error) throw new Error(error.message);
          return data;
        },
      }),
      createInvoice: tool({
        description: 'Creates a sales invoice in the database. Returns the generated invoice number.',
        inputSchema: z.object({
          customerId: z.string().describe('The ID of the customer'),
          date: z.string().describe('The invoice date in YYYY-MM-DD format'),
          items: z.array(z.object({
            itemId: z.string().describe('The ID of the item'),
            description: z.string().describe('The name/description of the item'),
            quantity: z.number().describe('Quantity sold'),
            rate: z.number().describe('Price per unit'),
          })).describe('The line items on the invoice'),
        }),
        execute: async ({ customerId, date, items }) => {
          const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
          const transactionId = crypto.randomUUID();

          const prefix = 'S';
          const { data: existingVouchers } = await supabase
            .from('transactions')
            .select('voucher_no')
            .eq('voucher_type', 'SALES');

          const suffixRegex = /(?:^|[^0-9])(\d+)$/;
          const maxNo = (existingVouchers ?? []).reduce((max, row) => {
            const match = row.voucher_no?.match(suffixRegex);
            if (!match) return max;
            const n = parseInt(match[1], 10);
            return n > max ? n : max;
          }, 0);

          const voucherNo = `${prefix}-${maxNo + 1}`;

          const { error: txError } = await supabase
            .from('transactions')
            .insert({
              id: transactionId,
              voucher_no: voucherNo,
              voucher_type: 'SALES',
              date: date,
              party_id: customerId,
              total_amount: totalAmount,
              notes: 'Generated by AI Assistant'
            });

          if (txError) throw new Error(txError.message);

          const txItems = items.map(item => ({
            id: crypto.randomUUID(),
            transaction_id: transactionId,
            item_id: item.itemId,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.quantity * item.rate
          }));

          const { error: itemsError } = await supabase
            .from('transaction_items')
            .insert(txItems);

          if (itemsError) throw new Error(itemsError.message);

          return {
            success: true,
            voucherNo: voucherNo,
            totalAmount: totalAmount,
            message: "Invoice saved successfully."
          };
        },
      }),
    },
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
    }
  });

  return result.toUIMessageStreamResponse();
}
