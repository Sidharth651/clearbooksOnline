import { z } from 'zod';
import { genericIlikeSearch } from '../utils/lookup-helpers';

export function getPartyTools(supabase: any, companyId: string) {
  const mcpTool = (c: any) => c;
  return {
    lookupCustomers: mcpTool({
      description: 'Search for customers by name',
      inputSchema: z.object({
        nameQuery: z.string().describe('The name or partial name of the customer to search for'),
      }),
      execute: async ({ nameQuery }: any) => {
        return genericIlikeSearch(supabase, 'parties', 'id, name, phone, address', nameQuery, companyId);
      },
    }),
    createParty: mcpTool({
      description: 'Create a new customer or supplier in the database',
      inputSchema: z.object({
        name: z.string().describe('The name of the party'),
        type: z.enum(['CUSTOMER', 'SUPPLIER']).describe('Type of party'),
        phone: z.string().optional().describe('Phone number'),
      }),
      execute: async ({ name, type, phone }: any) => {
        const accountId = crypto.randomUUID();
        const partyId = crypto.randomUUID();
        
        const { error: accountError } = await supabase
          .from('accounts')
          .insert({
            id: accountId,
            name: name,
            group_type: type === 'CUSTOMER' ? 'SUNDRY_DEBTORS' : 'SUNDRY_CREDITORS',
            system_type: 'PARTY',
            company_id: companyId
          });
          
        if (accountError) throw new Error(accountError.message);
          
        const { error: partyError } = await supabase
          .from('parties')
          .insert({
            id: partyId,
            account_id: accountId,
            name: name,
            type: type,
            phone: phone,
            company_id: companyId
          });
          
        if (partyError) throw new Error(partyError.message);
        
        return {
          success: true,
          partyId,
          accountId,
          message: `${type} '${name}' created successfully.`
        };
      },
    }),
    getPartyBalance: mcpTool({
      description: 'Calculate the outstanding balance for a specific party using their account ID',
      inputSchema: z.object({
        accountId: z.string().describe('The account ID associated with the party'),
      }),
      execute: async ({ accountId }: any) => {
        const { data, error } = await supabase
          .from('journal_entries')
          .select('debit, credit')
          .eq('account_id', accountId)
          .eq('company_id', companyId);
          
        if (error) throw new Error(error.message);
        
        const totalDebit = data.reduce((sum: number, je: any) => sum + Number(je.debit || 0), 0);
        const totalCredit = data.reduce((sum: number, je: any) => sum + Number(je.credit || 0), 0);
        
        return {
          totalDebit,
          totalCredit,
          balance: totalDebit - totalCredit,
          message: totalDebit >= totalCredit ? `Owes you ₹${totalDebit - totalCredit}` : `You owe ₹${totalCredit - totalDebit}`
        };
      },
    }),
  };
}
