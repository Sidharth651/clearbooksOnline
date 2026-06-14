import { z } from 'zod';

export function getQueryTools(supabase: any, companyId: string) {
  const mcpTool = (c: any) => c;
  return {
    customQuery: mcpTool({
      description: `A flexible, READ-ONLY tool to query any business table in the database.
Use this when no other specialised lookup tool fits the user's request.
Available tables: accounts, parties, items, transactions, transaction_items, journal_entries,
settings, stock_allocations, bill_of_materials, bom_lines, production_entries,
production_materials, production_costs, import_jobs, import_job_rows, companies.
You can select specific columns (with Supabase relation syntax like "party:parties(name)"),
apply equality and comparison filters, order results, and limit rows returned.`,
      inputSchema: z.object({
        table: z.string().describe('The table name to query (e.g. "transactions", "journal_entries", "parties")'),
        select: z.string().optional().describe('Comma-separated columns to select. Supports Supabase relation syntax e.g. "id, name, party:parties(name)". Defaults to "*" (all columns).'),
        filters: z.array(z.object({
          column: z.string().describe('The column name to filter on'),
          operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in', 'is'])
            .describe('Filter operator: eq (=), neq (!=), gt (>), gte (>=), lt (<), lte (<=), like (LIKE), ilike (case-insensitive LIKE), in (IN array), is (IS null/true/false)'),
          value: z.any().describe('The value to compare against. For "in" operator pass an array, for "is" pass null/true/false, for "like"/"ilike" use % wildcards.'),
        })).optional().describe('Array of filter conditions to apply. All filters are ANDed together.'),
        orderBy: z.string().optional().describe('Column name to order results by'),
        ascending: z.boolean().optional().describe('Sort direction. true = ascending, false = descending. Default is false (newest first).'),
        limit: z.number().optional().describe('Max rows to return. Default is 20, max is 100.'),
      }),
      execute: async ({ table, select, filters, orderBy, ascending, limit }: any) => {
        const ALLOWED_TABLES = [
          'accounts', 'parties', 'items', 'transactions', 'transaction_items',
          'journal_entries', 'settings', 'stock_allocations', 'bill_of_materials',
          'bom_lines', 'production_entries', 'production_materials', 'production_costs',
          'import_jobs', 'import_job_rows', 'companies'
        ];

        if (!ALLOWED_TABLES.includes(table)) {
          throw new Error(`Table "${table}" is not allowed. Allowed tables: ${ALLOWED_TABLES.join(', ')}`);
        }

        const fetchLimit = Math.min(limit || 20, 100);
        let query = supabase.from(table).select(select || '*');

        // Always filter by company (except companies table itself)
        if (table !== 'companies') {
          query = query.eq('company_id', companyId);
        }

        // Apply filters
        if (filters && filters.length > 0) {
          for (const f of filters) {
            switch (f.operator) {
              case 'eq':    query = query.eq(f.column, f.value); break;
              case 'neq':   query = query.neq(f.column, f.value); break;
              case 'gt':    query = query.gt(f.column, f.value); break;
              case 'gte':   query = query.gte(f.column, f.value); break;
              case 'lt':    query = query.lt(f.column, f.value); break;
              case 'lte':   query = query.lte(f.column, f.value); break;
              case 'like':  query = query.like(f.column, f.value); break;
              case 'ilike': query = query.ilike(f.column, f.value); break;
              case 'in':    query = query.in(f.column, f.value); break;
              case 'is':    query = query.is(f.column, f.value); break;
            }
          }
        }

        // Apply ordering
        if (orderBy) {
          query = query.order(orderBy, { ascending: ascending ?? false });
        }

        // Apply limit
        query = query.limit(fetchLimit);

        const { data, error } = await query;
        if (error) throw new Error(error.message);

        return {
          table,
          rowCount: data?.length || 0,
          rows: data,
        };
      },
    })
  };
}
