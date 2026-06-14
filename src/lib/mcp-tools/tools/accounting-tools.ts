import { z } from 'zod';
import { genericIlikeSearch } from '../utils/lookup-helpers';
import { getNextVoucherNo } from '../utils/voucher-number';
import { insertTransactionWithJournalEntries } from '../utils/journal-helpers';

export function getAccountingTools(supabase: any, companyId: string) {
  const mcpTool = (c: any) => c;
  return {
    lookupAccounts: mcpTool({
      description: 'Search for ledger accounts by name (e.g., Cash, Bank, Sales)',
      inputSchema: z.object({
        nameQuery: z.string().describe('The name or partial name of the account to search for'),
      }),
      execute: async ({ nameQuery }: any) => {
        return genericIlikeSearch(supabase, 'accounts', 'id, name, group_type', nameQuery, companyId);
      },
    }),
    createReceipt: mcpTool({
      description: 'Record a payment received from a customer (Accounts Receivable)',
      inputSchema: z.object({
        customerId: z.string().describe('The ID of the customer (party)'),
        accountId: z.string().describe('The ID of the bank or cash account receiving the money'),
        date: z.string().describe('The date of receipt in YYYY-MM-DD format'),
        amount: z.number().describe('The amount received'),
        notes: z.string().optional().describe('Payment notes or reference number'),
      }),
      execute: async ({ customerId, accountId, date, amount, notes }: any) => {
        const transactionId = crypto.randomUUID();
        const voucherNo = await getNextVoucherNo(supabase, 'RECEIPT', 'R', companyId);
        const { data: partyData } = await supabase.from('parties').select('account_id').eq('id', customerId).eq('company_id', companyId).single();
        if (!partyData) throw new Error("Customer not found.");

        await insertTransactionWithJournalEntries(supabase, {
          transactionId, voucherNo, voucherType: 'RECEIPT', date, partyId: customerId, totalAmount: amount, notes, companyId,
          entries: [
            { accountId: accountId, debit: amount, credit: 0 },
            { accountId: partyData.account_id, debit: 0, credit: amount }
          ]
        });

        return { success: true, voucherNo, message: "Receipt created successfully." };
      }
    }),
    createPayment: mcpTool({
      description: 'Record a payment made to a supplier or vendor (Accounts Payable)',
      inputSchema: z.object({
        supplierId: z.string().describe('The ID of the supplier (party)'),
        accountId: z.string().describe('The ID of the bank or cash account making the payment'),
        date: z.string().describe('The date of payment in YYYY-MM-DD format'),
        amount: z.number().describe('The amount paid'),
        notes: z.string().optional().describe('Payment notes or reference number'),
      }),
      execute: async ({ supplierId, accountId, date, amount, notes }: any) => {
        const transactionId = crypto.randomUUID();
        const voucherNo = await getNextVoucherNo(supabase, 'PAYMENT', 'PMT', companyId);
        const { data: partyData } = await supabase.from('parties').select('account_id').eq('id', supplierId).eq('company_id', companyId).single();
        if (!partyData) throw new Error("Supplier not found.");

        await insertTransactionWithJournalEntries(supabase, {
          transactionId, voucherNo, voucherType: 'PAYMENT', date, partyId: supplierId, totalAmount: amount, notes, companyId,
          entries: [
            { accountId: partyData.account_id, debit: amount, credit: 0 },
            { accountId: accountId, debit: 0, credit: amount }
          ]
        });

        return { success: true, voucherNo, message: "Payment created successfully." };
      }
    }),
    recordExpense: mcpTool({
      description: 'A quick tool to log a day-to-day business expense',
      inputSchema: z.object({
        expenseAccountId: z.string().describe('The ID of the expense ledger account'),
        paymentAccountId: z.string().describe('The ID of the bank or cash account used to pay'),
        amount: z.number().describe('The expense amount'),
        date: z.string().describe('The date in YYYY-MM-DD format'),
        notes: z.string().optional().describe('Expense description'),
      }),
      execute: async ({ expenseAccountId, paymentAccountId, amount, date, notes }: any) => {
        const transactionId = crypto.randomUUID();
        const voucherNo = await getNextVoucherNo(supabase, 'PAYMENT', 'EXP', companyId);
        
        await insertTransactionWithJournalEntries(supabase, {
          transactionId, voucherNo, voucherType: 'PAYMENT', date, totalAmount: amount, notes: notes || 'Expense logged by AI', companyId,
          entries: [
            { accountId: expenseAccountId, debit: amount, credit: 0 },
            { accountId: paymentAccountId, debit: 0, credit: amount }
          ]
        });

        return { success: true, voucherNo, message: "Expense recorded successfully." };
      }
    }),
    createBankTransfer: mcpTool({
      description: 'Record a transfer between Cash and Bank accounts (Contra Entry)',
      inputSchema: z.object({
        fromAccountId: z.string().describe('Account ID money is withdrawn from (Credit)'),
        toAccountId: z.string().describe('Account ID money is deposited to (Debit)'),
        amount: z.number().describe('The amount transferred'),
        date: z.string().describe('The date in YYYY-MM-DD format'),
        notes: z.string().optional().describe('Transfer notes'),
      }),
      execute: async ({ fromAccountId, toAccountId, amount, date, notes }: any) => {
        const transactionId = crypto.randomUUID();
        const voucherNo = await getNextVoucherNo(supabase, 'CONTRA', 'C', companyId);
        
        await insertTransactionWithJournalEntries(supabase, {
          transactionId, voucherNo, voucherType: 'CONTRA', date, totalAmount: amount, notes: notes || 'Bank transfer logged by AI', companyId,
          entries: [
            { accountId: toAccountId, debit: amount, credit: 0 },
            { accountId: fromAccountId, debit: 0, credit: amount }
          ]
        });

        return { success: true, voucherNo, message: "Bank transfer recorded successfully." };
      }
    }),
    createJournalEntry: mcpTool({
      description: 'Creates a double-entry journal voucher in the database',
      inputSchema: z.object({
        date: z.string().describe('The date in YYYY-MM-DD format'),
        entries: z.array(z.object({
          accountId: z.string().describe('The ID of the ledger account'),
          type: z.enum(['DEBIT', 'CREDIT']).describe('Whether this is a debit or credit entry'),
          amount: z.number().describe('The amount'),
        })).describe('The debit and credit lines. Total debits must equal total credits.'),
        notes: z.string().optional().describe('Narration or notes for the journal entry'),
      }),
      execute: async ({ date, entries, notes }: any) => {
        const totalDebit = entries.filter((e: any) => e.type === 'DEBIT').reduce((sum: number, e: any) => sum + e.amount, 0);
        const totalCredit = entries.filter((e: any) => e.type === 'CREDIT').reduce((sum: number, e: any) => sum + e.amount, 0);
        
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
          throw new Error(`Debits (${totalDebit}) and Credits (${totalCredit}) must be equal.`);
        }
        
        const transactionId = crypto.randomUUID();
        const voucherNo = await getNextVoucherNo(supabase, 'JOURNAL', 'J', companyId);
        
        const mappedEntries = entries.map((entry: any) => ({
          accountId: entry.accountId,
          debit: entry.type === 'DEBIT' ? entry.amount : 0,
          credit: entry.type === 'CREDIT' ? entry.amount : 0
        }));

        await insertTransactionWithJournalEntries(supabase, {
          transactionId, voucherNo, voucherType: 'JOURNAL', date, totalAmount: totalDebit, notes: notes || 'Generated by AI Assistant', companyId,
          entries: mappedEntries
        });
        
        return {
          success: true,
          voucherNo: voucherNo,
          message: "Journal entry created successfully."
        };
      },
    }),
  };
}
