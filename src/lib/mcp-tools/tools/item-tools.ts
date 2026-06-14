import { z } from 'zod';
import { genericIlikeSearch } from '../utils/lookup-helpers';

export function getItemTools(supabase: any, companyId: string) {
  const mcpTool = (c: any) => c;
  return {
    lookupItems: mcpTool({
      description: 'Search for inventory items/products by name',
      inputSchema: z.object({
        nameQuery: z.string().describe('The name or partial name of the item to search for'),
      }),
      execute: async ({ nameQuery }: any) => {
        return genericIlikeSearch(supabase, 'items', 'id, name, default_rate, unit', nameQuery, companyId);
      },
    }),
    createItem: mcpTool({
      description: 'Create a new inventory item/product in the database',
      inputSchema: z.object({
        name: z.string().describe('The name of the item'),
        unit: z.string().nullable().optional().describe('Unit of measurement (e.g., PCS, KG, LTR). Defaults to PCS.'),
        defaultRate: z.number().nullable().optional().describe('Default selling/purchase rate.'),
      }),
      execute: async ({ name, unit, defaultRate }: any) => {
        const itemId = crypto.randomUUID();
        const { error } = await supabase
          .from('items')
          .insert({
            id: itemId,
            name: name,
            unit: unit || 'PCS',
            default_rate: defaultRate || 0,
            item_type: 'GENERAL',
            company_id: companyId
          });
          
        if (error) throw new Error(error.message);
        
        return {
          success: true,
          itemId,
          message: `Item '${name}' created successfully.`
        };
      },
    }),
    lookupBOMs: mcpTool({
      description: 'Search for Bill of Materials (BOM) by name',
      inputSchema: z.object({
        query: z.string().optional().describe('Name or partial name of the BOM to search for'),
      }),
      execute: async ({ query }: any) => {
        const searchQuery = query || '';
        const { data, error } = await supabase
          .from('bill_of_materials')
          .select(`
            id, 
            name, 
            notes,
            item:items(name)
          `)
          .eq('company_id', companyId)
          .ilike('name', `%${searchQuery}%`)
          .limit(5);
          
        if (error) throw new Error(error.message);
        
        return data.map((bom: any) => ({
          id: bom.id,
          name: bom.name,
          notes: bom.notes,
          finishedItemName: bom.item?.name || 'Unknown'
        }));
      },
    }),
  };
}
