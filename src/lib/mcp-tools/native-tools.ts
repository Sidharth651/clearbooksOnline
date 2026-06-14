import { tool } from 'ai';
import { z } from 'zod';

export function getNativeAITools() {
  return {
    askForConfirmation: tool({
      description: 'Ask the user to confirm an action before executing it. You MUST use this tool before calling createInvoice, createPurchase, createItem, createParty, createReceipt, createPayment, recordExpense, createBankTransfer, or createJournalEntry.',
      inputSchema: z.object({
        message: z.string().describe('A message asking the user to confirm the details. e.g. "Are you sure you want to create an invoice for XYZ Corp?"'),
        details: z.any().describe('The details of the action to be confirmed (e.g. items, quantities, rates, customer name).'),
      }),
    }),
  };
}
