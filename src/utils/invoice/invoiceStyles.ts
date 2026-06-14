export const invoicePrintStyles = `
  #invoice-render-container { font-size: 11px; color: #000; background: #fff; padding: 10px; font-family: Arial, sans-serif; }
  #invoice-render-container * { box-sizing: border-box; font-family: Arial, sans-serif; }
  #invoice-render-container .invoice-container {
    width: 100%;
    max-width: 210mm;
    margin: 0 auto;
    border: 1px solid #000;
  }
  
  #invoice-render-container .header-row {
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid #000;
    padding: 4px 8px;
    font-weight: bold;
  }
  
  #invoice-render-container .firm-details {
    text-align: center;
    padding: 10px;
    border-bottom: 1px solid #000;
  }
  #invoice-render-container .firm-name { font-size: 24px; font-weight: bold; }
  #invoice-render-container .firm-subtitle { font-size: 13px; margin: 4px 0; }
  #invoice-render-container .firm-address { font-size: 11px; }
  
  #invoice-render-container .gst-pan-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 8px;
    font-weight: bold;
  }
  
  #invoice-render-container .invoice-meta {
    display: flex;
    border-top: 1px solid #000;
    border-bottom: 1px solid #000;
  }
  #invoice-render-container .meta-col {
    flex: 1;
    padding: 4px 8px;
    border-right: 1px solid #000;
  }
  #invoice-render-container .meta-col:last-child { border-right: none; }
  #invoice-render-container .meta-row { display: flex; margin-bottom: 4px; }
  #invoice-render-container .meta-label { width: 100px; }
  #invoice-render-container .meta-value { font-weight: bold; }
  
  #invoice-render-container .irn-row {
    padding: 4px 8px;
    border-bottom: 1px solid #000;
  }
  
  #invoice-render-container .address-section {
    display: flex;
    border-bottom: 1px solid #000;
  }
  #invoice-render-container .address-col {
    flex: 1;
    padding: 4px 8px;
    border-right: 1px solid #000;
    min-height: 100px;
  }
  #invoice-render-container .address-col:last-child { border-right: none; }
  
  #invoice-render-container .transport-section {
    display: flex;
    border-bottom: 1px solid #000;
  }
  #invoice-render-container .transport-col {
    flex: 1;
    padding: 4px 8px;
    border-right: 1px solid #000;
  }
  #invoice-render-container .transport-col:last-child { border-right: none; }
  #invoice-render-container .trans-row { display: flex; margin-bottom: 4px; }
  #invoice-render-container .trans-label { width: 90px; }

  #invoice-render-container .items-table {
    width: 100%;
    border-collapse: collapse;
  }
  #invoice-render-container .items-table th {
    border-bottom: 1px solid #000;
    padding: 6px 4px;
    text-align: center;
    font-weight: normal;
  }
  #invoice-render-container .items-table th:not(:first-child) {
    border-left: 1px solid #000;
  }
  #invoice-render-container .item-row td { vertical-align: top; }
  #invoice-render-container .item-row.empty td { height: 20px; }
  
  #invoice-render-container .footer-split {
    display: flex;
    border-top: 1px solid #000;
  }
  #invoice-render-container .footer-left {
    flex: 1.5;
    border-right: 1px solid #000;
    display: flex;
    flex-direction: column;
  }
  #invoice-render-container .footer-right {
    flex: 1;
  }
  
  #invoice-render-container .bale-info {
    padding: 4px 8px;
    border-bottom: 1px solid #000;
    flex-grow: 1;
  }
  #invoice-render-container .bank-info {
    padding: 4px 8px;
  }
  #invoice-render-container .bank-row { display: flex; margin-bottom: 4px; }
  #invoice-render-container .bank-label { width: 90px; font-weight: bold; }
  #invoice-render-container .bank-value { font-weight: bold; }
  
  #invoice-render-container .summary-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 8px;
  }
  #invoice-render-container .summary-row.net-amount {
    border-top: 1px solid #000;
    font-size: 14px;
    font-weight: bold;
  }
  
  #invoice-render-container .amount-words {
    padding: 6px 8px;
    border-top: 1px solid #000;
    font-weight: bold;
  }
  
  #invoice-render-container .terms-section {
    display: flex;
    border-top: 1px solid #000;
  }
  #invoice-render-container .terms-left {
    flex: 2;
    padding: 4px 8px;
    border-right: 1px solid #000;
  }
  #invoice-render-container .terms-right {
    flex: 1;
    padding: 4px 8px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    text-align: center;
    font-weight: bold;
  }
  
  #invoice-render-container .signatures {
    display: flex;
    justify-content: space-between;
    padding: 4px 8px;
    border-top: 1px solid #000;
  }
`;
