import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ voucherNo: string }> }
) {
  try {
    const { voucherNo } = await params;
    
    // 1. Fetch transaction
    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .select('id, voucher_no, date, total_amount, party_id, notes')
      .eq('voucher_no', voucherNo)
      .single();

    if (txError || !tx) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // 2. Fetch party details
    let customerName = 'Cash Customer';
    let customerPhone = '';
    let customerAddress = '';
    let customerGstin = '';
    
    if (tx.party_id) {
      const { data: party } = await supabase
        .from('parties')
        .select('name, phone, address, gstin')
        .eq('id', tx.party_id)
        .single();
        
      if (party) {
        customerName = party.name || customerName;
        customerPhone = party.phone || '';
        customerAddress = party.address || '';
        customerGstin = party.gstin || '';
      }
    }

    // 3. Fetch line items
    const { data: items, error: itemsError } = await supabase
      .from('transaction_items')
      .select('item_id, description, quantity, rate, amount, items(name, unit)')
      .eq('transaction_id', tx.id);

    if (itemsError) {
      console.error('Error fetching items:', itemsError);
    }

    const formattedItems = (items || []).map((item: any) => ({
      description: item.description || (item.items?.name) || 'Item',
      quantity: Number(item.quantity) || 1,
      rate: Number(item.rate) || 0,
      amount: Number(item.amount) || 0,
      unit: item.items?.unit || 'PCS',
      hsn_code: '', // Assuming not available
      bale_no: '',
      pcs: Number(item.quantity) || 1,
    }));

    // 4. Construct PrintInvoiceData
    const printData = {
      invoiceNo: tx.voucher_no,
      invoiceDate: tx.date,
      customerName: customerName,
      customerPhone: customerPhone,
      customerAddress: customerAddress,
      customerGstin: customerGstin,
      
      firmName: 'QUICKINVOICE',
      firmAddress: '123 Business Street\\nCity, State 12345',
      firmContact: '+91 9876543210',
      
      items: formattedItems,
      payments: [],
      itemTotal: Number(tx.total_amount) || 0,
      grandTotal: Number(tx.total_amount) || 0,
      received: 0,
      balanceDue: Number(tx.total_amount) || 0,
    };

    return NextResponse.json(printData);
  } catch (error: any) {
    console.error('Invoice API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
