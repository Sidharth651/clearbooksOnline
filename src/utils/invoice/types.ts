export interface PrintInvoiceData {
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  customerAddress?: string;
  customerPhone?: string;
  customerGstin?: string;
  customerPan?: string;

  firmName?: string;
  firmAddress?: string;
  firmContact?: string;
  firmGst?: string;
  firmPan?: string;
  firmBankAccountNo?: string;
  firmBankName?: string;
  firmBankBranch?: string;
  firmBankIfsc?: string;

  ackNo?: string;
  ackDate?: string;
  irn?: string;
  ewayBillNo?: string;
  
  shippedToName?: string;
  shippedToAddress?: string;
  shippedToGstin?: string;
  shippedToPan?: string;

  agentName?: string;
  transport?: string;
  orderNo?: string;
  lrNo?: string;
  dcNo?: string;
  vehicleNo?: string;

  // Optional label overrides for different document types
  docTitle?: string; // default: 'TAX INVOICE'
  partyLabel?: string; // default: 'Billed To.'
  receivedLabel?: string; // default: 'Received'
  columnVisibility?: {
    showBaleNo: boolean;
    showPcs: boolean;
  };
  items: {
    description: string;
    hsn_code?: string;
    bale_no: string | number;
    pcs: string | number;
    quantity: string | number;
    unit?: string;
    rate: string | number;
    amount: number;
  }[];
  payments: {
    name: string;
    amount: string | number;
  }[];
  itemTotal: number;
  addName?: string;
  addAmount?: number;
  discountAmount?: number;
  grandTotal: number;
  received: number;
  balanceDue: number;
}
