export async function genericIlikeSearch(supabase: any, table: string, selectCols: string, query: string, companyId: string, limit: number = 5) {
  const searchQuery = query || '';
  const { data, error } = await supabase
    .from(table)
    .select(selectCols)
    .eq('company_id', companyId)
    .ilike('name', `%${searchQuery}%`)
    .limit(limit);
    
  if (error) throw new Error(error.message);
  return data;
}
