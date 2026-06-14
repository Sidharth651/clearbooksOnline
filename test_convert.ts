import { convertToModelMessages } from 'ai';

const messages = [
  {
    role: 'user',
    parts: [{ type: 'text', text: 'Create an invoice for ABC' }]
    // missing content!
  },
  {
    role: 'assistant',
    parts: [
      {
        type: 'tool-call',
        toolCallId: 'call_123',
        toolName: 'createInvoice',
        args: { customerId: 'C1' }
      },
      {
        type: 'tool-result',
        toolCallId: 'call_123',
        toolName: 'createInvoice',
        result: { type: 'json', value: 'S-47' }
      },
      {
        type: 'text',
        text: 'Your sales invoice has been created'
      }
    ]
    // missing content!
  },
  {
    role: 'user',
    content: 'new bill same details but rate is 12',
    parts: [{ type: 'text', text: 'new bill same details but rate is 12' }]
  }
];

async function run() {
  try {
    const res = await convertToModelMessages(messages as any);
    console.log("Success:", JSON.stringify(res, null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
