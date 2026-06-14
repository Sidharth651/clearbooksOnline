export async function getNextVoucherNo(supabase: any, voucherType: string, prefix: string, companyId: string): Promise<string> {
  const { data: existingVouchers } = await supabase
    .from('transactions')
    .select('voucher_no')
    .eq('voucher_type', voucherType)
    .eq('company_id', companyId);

  const suffixRegex = /(?:^|[^0-9])(\d+)$/;
  const maxNo = (existingVouchers ?? []).reduce((max: number, row: any) => {
    const match = row.voucher_no?.match(suffixRegex);
    if (!match) return max;
    const n = parseInt(match[1], 10);
    return n > max ? n : max;
  }, 0);

  return `${prefix}-${maxNo + 1}`;
}

