import { PrintInvoiceData } from './types';
import { formatDate, formatNumber, numberToWords } from './formatters';

export function generateInvoiceHTML(data: PrintInvoiceData): string {
  const docTitle = (data.docTitle ?? "TAX INVOICE").toUpperCase();
  const partyLabel = data.partyLabel ?? "Billed To.";
  
  const validItems = data.items.filter(
    (i) => i.description && Number(i.quantity) > 0,
  );

  let totalBales = 0;
  let totalPcs = 0;
  let totalMetre = 0;

  const itemRows = validItems
    .map(
      (item) => {
        const hsn = item.hsn_code || "";
        const bales = item.bale_no || "";
        const pcs = item.pcs || "";
        const metre = Number(item.quantity) || 0;
        const rate = Number(item.rate) || 0;
        
        if (Number(bales) && !isNaN(Number(bales))) totalBales += Number(bales);
        if (Number(pcs) && !isNaN(Number(pcs))) totalPcs += Number(pcs);
        totalMetre += metre;

        return `
    <tr class="item-row">
      <td style="text-align:left; padding:4px;">${item.description}</td>
      <td style="text-align:center; padding:4px; border-left: 1px solid #000;">${hsn}</td>
      <td style="text-align:center; padding:4px; border-left: 1px solid #000;">${bales}</td>
      <td style="text-align:center; padding:4px; border-left: 1px solid #000;">${pcs}</td>
      <td style="text-align:right; padding:4px; border-left: 1px solid #000;">${formatNumber(metre)}</td>
      <td style="text-align:right; padding:4px; border-left: 1px solid #000;">${formatNumber(rate)}</td>
      <td style="text-align:right; padding:4px; border-left: 1px solid #000;">${formatNumber(item.amount)}</td>
    </tr>
  `;
      }
    )
    .join("");

  // Create empty rows to stretch the table if few items
  const emptyRowsCount = Math.max(0, 10 - validItems.length);
  const emptyRows = Array(emptyRowsCount).fill(`
    <tr class="item-row empty">
      <td style="padding:4px;">&nbsp;</td>
      <td style="padding:4px; border-left: 1px solid #000;"></td>
      <td style="padding:4px; border-left: 1px solid #000;"></td>
      <td style="padding:4px; border-left: 1px solid #000;"></td>
      <td style="padding:4px; border-left: 1px solid #000;"></td>
      <td style="padding:4px; border-left: 1px solid #000;"></td>
      <td style="padding:4px; border-left: 1px solid #000;"></td>
    </tr>
  `).join("");

  const assessableValue = data.itemTotal;
  // If we had GST components, we'd show them here. For now, matching exact format, we just show IGST 0% or whatever if not specified.
  const igstAmount = data.addAmount || 0; // Using addAmount for tax just as a placeholder if no exact tax fields exist, but ideally it should be specific.

  const words = numberToWords(Math.floor(data.grandTotal));

  return `
  <div class="invoice-container">
    <div class="header-row">
      <div>${docTitle}</div>
      <div>ORIGINAL FOR CONSIGNEE</div>
    </div>
    
    <div class="firm-details">
      <div class="firm-name">${data.firmName || "QUICKINVOICE"}</div>
      <div class="firm-subtitle">WHOLESALE CLOTH MERRCHANTS & TRADERS</div>
      <div class="firm-address">${data.firmAddress || ""}</div>
      <div class="firm-address">PHONE :${data.firmContact || ""}</div>
    </div>
    
    <div class="gst-pan-row">
      <div>
        <div>GSTIN :${data.firmGst || ""}</div>
        <div style="margin-top: 4px;">Tax is Payable On Reverse Charge : NO</div>
      </div>
      <div style="align-self: flex-end;">PAN : ${data.firmPan || ""}</div>
    </div>
    
    <div class="invoice-meta">
      <div class="meta-col">
        <div class="meta-row">
          <div class="meta-label">INVOICE NO</div>
          <div class="meta-value">: ${data.invoiceNo}</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">INVOICE DATE</div>
          <div class="meta-value">: ${formatDate(data.invoiceDate)}</div>
        </div>
      </div>
    </div>
    
    <div class="address-section">
      <div class="address-col">
        <div style="margin-bottom: 4px;">${partyLabel}</div>
        <div style="font-weight: bold; margin-bottom: 2px;">${data.customerName}</div>
        <div style="margin-bottom: 8px;">${(data.customerAddress || "").replace(/\\n/g, "<br>")}</div>
        <div style="display:flex; justify-content:space-between; font-weight:bold; margin-top: auto;">
          <div>GSTIN : ${data.customerGstin || ""}</div>
          <div>PAN : ${data.customerPan || ""}</div>
        </div>
      </div>
      <div class="address-col">
        <div style="margin-bottom: 4px;">Shipped To.</div>
        <div style="font-weight: bold; margin-bottom: 2px;">${data.shippedToName || data.customerName}</div>
        <div style="margin-bottom: 8px;">${(data.shippedToAddress || data.customerAddress || "").replace(/\\n/g, "<br>")}</div>
        <div style="display:flex; font-weight:bold; margin-top: auto;">
          <div>GSTIN : ${data.shippedToGstin || data.customerGstin || ""}</div>
        </div>
      </div>
    </div>
    
    <div class="transport-section">
      <div class="transport-col">
        <div class="trans-row"><div class="trans-label">AGENT NAME</div><div>: ${data.agentName || ""}</div></div>
        <div class="trans-row"><div class="trans-label">ORDER NO</div><div>: ${data.orderNo || ""}</div></div>
        <div class="trans-row"><div class="trans-label">D.C. NO</div><div>: ${data.dcNo || ""}</div></div>
      </div>
      <div class="transport-col">
        <div class="trans-row"><div class="trans-label">TRANSPORT</div><div>: ${data.transport || ""}</div></div>
        <div class="trans-row"><div class="trans-label">LR . NO</div><div>: ${data.lrNo || ""}</div></div>
        <div class="trans-row"><div class="trans-label">VEHICLE NO</div><div>: ${data.vehicleNo || ""}</div></div>
      </div>
    </div>
    
    <table class="items-table">
      <thead>
        <tr>
          <th>DESCRIPTION OF GOODS</th>
          <th style="width:60px;">HSN</th>
          <th style="width:60px;">NO.OF<br>BALES</th>
          <th style="width:60px;">NO.OF<br>PIECES</th>
          <th style="width:70px;">TOTAL<br>METRE</th>
          <th style="width:70px;">RATE /<br>METRE</th>
          <th style="width:90px;">AMOUNT</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        ${emptyRows}
      </tbody>
    </table>
    
    <div class="footer-split">
      <div class="footer-left">
        <div class="bale-info">
          <div>NO.OF BALE : ${totalBales || ""}</div>
          <div style="margin-top: 4px;">BALE NOS : </div>
        </div>
        <div class="bank-info">
          <div style="font-weight: bold; margin-bottom: 4px;">BANK DETAIL :-</div>
          <div class="bank-row"><div class="bank-label">ACCOUNT NO</div><div class="bank-value">: ${data.firmBankAccountNo || ""}</div></div>
          <div class="bank-row"><div class="bank-label">BANK NAME</div><div class="bank-value">: ${data.firmBankName || ""}</div></div>
          <div class="bank-row"><div class="bank-label">BRANCH</div><div class="bank-value">: ${data.firmBankBranch || ""}</div></div>
          <div class="bank-row"><div class="bank-label">IFSC</div><div class="bank-value">: ${data.firmBankIfsc || ""}</div></div>
        </div>
      </div>
      <div class="footer-right">
        <div class="summary-row">
          <div>ASSESSABLE VALUE</div>
          <div>${formatNumber(assessableValue)}</div>
        </div>
        <div class="summary-row">
          <div>IGST</div>
          <div>${formatNumber(igstAmount)}</div>
        </div>
        <div style="height: 40px;"></div>
        ${data.discountAmount ? `
        <div class="summary-row">
          <div>TRADE DISCOUNT</div>
          <div>-${formatNumber(data.discountAmount)}</div>
        </div>
        ` : ''}
        ${Math.abs(data.grandTotal - (assessableValue + igstAmount - (data.discountAmount || 0))) > 0.001 ? `
        <div class="summary-row">
          <div>ROUNDED OFF</div>
          <div>${formatNumber(data.grandTotal - (assessableValue + igstAmount - (data.discountAmount || 0)))}</div>
        </div>
        ` : ''}
        <div class="summary-row net-amount">
          <div>NET AMOUNT</div>
          <div>${formatNumber(data.grandTotal)}</div>
        </div>
      </div>
    </div>
    
    <div class="amount-words">
      Rupees : ${words} Only
    </div>
    
    <div class="terms-section">
      <div class="terms-left">
        <div style="font-weight: bold; margin-bottom: 4px;">Terms & Conditions :</div>
        <div>Overdue interest will be charged at 24% from the invoice date.</div>
        <div>We are not responsible for any loss or damage in transit.</div>
        <div>We will not accept any claim after processing of goods.</div>
        <div>Subject to jurisdiction.</div>
      </div>
      <div class="terms-right">
        <div>For ${data.firmName || "QUICKINVOICE"}</div>
        <div style="height: 40px;"></div>
      </div>
    </div>
    
    <div class="signatures">
      <div>Prepared by</div>
      <div>Checked by</div>
      <div style="margin-right: 20px;">Authorised Signatory</div>
    </div>
    
  </div>`;
}
