import { z } from 'zod';

export function getReportingTools(supabase: any, companyId: string) {
  const mcpTool = (c: any) => c;
  return {
    getTopSellingItems: mcpTool({
      description: 'Get the top selling items by quantity for a specific date range',
      inputSchema: z.object({
        startDate: z.string().describe('Start date in YYYY-MM-DD format'),
        endDate: z.string().describe('End date in YYYY-MM-DD format'),
        limit: z.number().optional().describe('Number of items to return. Default is 5.'),
      }),
      execute: async ({ startDate, endDate, limit }: any) => {
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .select('id')
          .eq('voucher_type', 'SALES')
          .eq('company_id', companyId)
          .gte('date', startDate)
          .lte('date', endDate);
          
        if (txError) throw new Error(txError.message);
        if (!txData || txData.length === 0) return [];
        
        const txIds = txData.map((tx: any) => tx.id);
        
        const { data: itemsData, error: itemsError } = await supabase
          .from('transaction_items')
          .select('item_id, quantity, amount, items(name)')
          .eq('company_id', companyId)
          .in('transaction_id', txIds);
          
        if (itemsError) throw new Error(itemsError.message);
        
        const aggregation: Record<string, { name: string, quantity: number, amount: number }> = {};
        
        for (const row of itemsData || []) {
          if (!row.item_id) continue;
          if (!aggregation[row.item_id]) {
            aggregation[row.item_id] = {
              name: (row.items as any)?.name || 'Unknown',
              quantity: 0,
              amount: 0
            };
          }
          aggregation[row.item_id].quantity += Number(row.quantity || 0);
          aggregation[row.item_id].amount += Number(row.amount || 0);
        }
        
        const sorted = Object.values(aggregation).sort((a, b) => b.quantity - a.quantity);
        return sorted.slice(0, limit || 5);
      },
    }),
    getRecentTransactions: mcpTool({
      description: 'Fetch the most recent transactions of any type (e.g. RECEIPTS, PAYMENTS, SALES, PURCHASE, JOURNAL)',
      inputSchema: z.object({
        limit: z.number().optional().describe('Number of recent transactions to fetch. Default is 10.'),
      }),
      execute: async ({ limit }: any) => {
        const fetchLimit = limit || 10;
        const { data, error } = await supabase
          .from('transactions')
          .select(`
            id,
            voucher_no,
            voucher_type,
            date,
            total_amount,
            party:parties(name)
          `)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(fetchLimit);
          
        if (error) throw new Error(error.message);
        
        return data.map((tx: any) => ({
          id: tx.id,
          voucherNo: tx.voucher_no,
          type: tx.voucher_type,
          date: tx.date,
          totalAmount: tx.total_amount,
          partyName: tx.party?.name || 'N/A'
        }));
      },
    }),
    getOutstandingBalances: mcpTool({
      description: 'Get outstanding balances for all AR (Receivables/Customers) or AP (Payables/Suppliers)',
      inputSchema: z.object({
        type: z.enum(['AR', 'AP']).describe('AR for Receivables (Customers), AP for Payables (Suppliers)'),
      }),
      execute: async ({ type }: any) => {
        const groupType = type === 'AR' ? 'SUNDRY_DEBTORS' : 'SUNDRY_CREDITORS';
        
        const { data: accountsData, error: accError } = await supabase
          .from('accounts')
          .select('id, name')
          .eq('group_type', groupType)
          .eq('company_id', companyId);
          
        if (accError) throw new Error(accError.message);
        if (!accountsData || accountsData.length === 0) return [];
        
        const accountIds = accountsData.map((a: any) => a.id);
        
        const { data: jeData, error: jeError } = await supabase
          .from('journal_entries')
          .select('account_id, debit, credit')
          .eq('company_id', companyId)
          .in('account_id', accountIds);
          
        if (jeError) throw new Error(jeError.message);
        
        const balances: Record<string, { name: string, balance: number }> = {};
        accountsData.forEach((a: any) => balances[a.id] = { name: a.name, balance: 0 });
        
        jeData?.forEach((je: any) => {
           const net = type === 'AR' 
             ? Number(je.debit) - Number(je.credit) 
             : Number(je.credit) - Number(je.debit);
           balances[je.account_id].balance += net;
        });
        
        return Object.values(balances)
          .filter(b => Math.abs(b.balance) > 0.01)
          .sort((a, b) => b.balance - a.balance);
      }
    }),
    getTrialBalance: mcpTool({
      description: 'Generates a trial balance showing total debits and credits for all ledger accounts',
      inputSchema: z.object({}),
      execute: async () => {
        const { data: jeData, error: jeError } = await supabase
          .from('journal_entries')
          .select('account_id, debit, credit')
          .eq('company_id', companyId);
          
        if (jeError) throw new Error(jeError.message);
        
        const { data: accData, error: accError } = await supabase
          .from('accounts')
          .select('id, name, group_type')
          .eq('company_id', companyId);
          
        if (accError) throw new Error(accError.message);
        
        const accountMap = new Map<string, any>(accData.map((a: any) => [a.id, a]));
        const tb: Record<string, { name: string, group: string, debit: number, credit: number }> = {};
        
        jeData?.forEach((je: any) => {
           const acc = accountMap.get(je.account_id);
           if (!acc) return;
           if (!tb[je.account_id]) {
              tb[je.account_id] = { name: acc.name, group: acc.group_type, debit: 0, credit: 0 };
           }
           tb[je.account_id].debit += Number(je.debit || 0);
           tb[je.account_id].credit += Number(je.credit || 0);
        });
        
        return Object.values(tb).map(row => {
          const net = row.debit - row.credit;
          return {
             name: row.name,
             group: row.group,
             netBalance: Math.abs(net),
             type: net >= 0 ? 'DEBIT' : 'CREDIT'
          };
        }).filter(r => r.netBalance > 0.01);
      }
    }),
    getProfitAndLoss: mcpTool({
      description: 'Calculates the net profit by summarizing income and expense accounts',
      inputSchema: z.object({}),
      execute: async () => {
        const { data: jeData, error: jeError } = await supabase
          .from('journal_entries')
          .select('account_id, debit, credit')
          .eq('company_id', companyId);
          
        if (jeError) throw new Error(jeError.message);
        
        const { data: accData, error: accError } = await supabase
          .from('accounts')
          .select('id, name, group_type')
          .eq('company_id', companyId);
          
        if (accError) throw new Error(accError.message);
        
        const incomeGroups = ['SALES_ACCOUNTS', 'DIRECT_INCOMES', 'INDIRECT_INCOMES'];
        const expenseGroups = ['PURCHASE_ACCOUNTS', 'DIRECT_EXPENSES', 'INDIRECT_EXPENSES'];
        
        const accountMap = new Map<string, any>(accData.map((a: any) => [a.id, a]));
        
        let totalIncome = 0;
        let totalExpense = 0;
        
        jeData?.forEach((je: any) => {
           const acc = accountMap.get(je.account_id);
           if (!acc) return;
           
           if (incomeGroups.includes(acc.group_type)) {
              totalIncome += (Number(je.credit) - Number(je.debit));
           } else if (expenseGroups.includes(acc.group_type)) {
              totalExpense += (Number(je.debit) - Number(je.credit));
           }
        });
        
        return {
           totalIncome,
           totalExpense,
           netProfit: totalIncome - totalExpense,
           message: (totalIncome - totalExpense) >= 0 ? "You are operating at a profit." : "You are operating at a loss."
        };
      }
    }),
    getTaxSummary: mcpTool({
      description: 'Get gross sales and purchases totals for tax/GST reporting',
      inputSchema: z.object({
        startDate: z.string().describe('Start date in YYYY-MM-DD format'),
        endDate: z.string().describe('End date in YYYY-MM-DD format'),
      }),
      execute: async ({ startDate, endDate }: any) => {
        const { data: sales, error: sErr } = await supabase
          .from('transactions')
          .select('total_amount')
          .eq('voucher_type', 'SALES')
          .eq('company_id', companyId)
          .gte('date', startDate)
          .lte('date', endDate);
        if (sErr) throw new Error(sErr.message);
        
        const { data: purchases, error: pErr } = await supabase
          .from('transactions')
          .select('total_amount')
          .eq('voucher_type', 'PURCHASE')
          .eq('company_id', companyId)
          .gte('date', startDate)
          .lte('date', endDate);
        if (pErr) throw new Error(pErr.message);
        
        const totalGrossSales = sales.reduce((sum: number, tx: any) => sum + Number(tx.total_amount), 0);
        const totalGrossPurchases = purchases.reduce((sum: number, tx: any) => sum + Number(tx.total_amount), 0);
        
        return {
           period: `${startDate} to ${endDate}`,
           totalGrossSales,
           totalGrossPurchases,
           message: "These gross figures can be used for your GST/Tax returns."
        };
      }
    }),
  };
}
