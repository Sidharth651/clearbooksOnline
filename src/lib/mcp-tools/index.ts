export { getNativeAITools } from './native-tools';
import { getSalesTools } from './tools/sales-tools';
import { getPurchaseTools } from './tools/purchase-tools';
import { getPartyTools } from './tools/party-tools';
import { getItemTools } from './tools/item-tools';
import { getAccountingTools } from './tools/accounting-tools';
import { getReportingTools } from './tools/reporting-tools';
import { getQueryTools } from './tools/query-tools';

export function getMCPToolsConfig(supabase: any, companyId: string) {
  return {
    ...getSalesTools(supabase, companyId),
    ...getPurchaseTools(supabase, companyId),
    ...getPartyTools(supabase, companyId),
    ...getItemTools(supabase, companyId),
    ...getAccountingTools(supabase, companyId),
    ...getReportingTools(supabase, companyId),
    ...getQueryTools(supabase, companyId),
  };
}
