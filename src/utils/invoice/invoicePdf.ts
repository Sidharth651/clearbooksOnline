import { PrintInvoiceData } from './types';
import { generateInvoiceHTML } from './invoiceTemplate';
import { invoicePrintStyles } from './invoiceStyles';

/**
 * Downloads the invoice as a PDF file
 */
export async function downloadInvoicePdf(data: PrintInvoiceData, filename: string): Promise<void> {
  // We need to dynamically import html2canvas and jspdf to support SSR and avoid Turbopack module loader issues
  if (typeof window === 'undefined') return;
  
  // Handle Turbopack default import structures safely
  const html2canvasModule = await import('html2canvas-pro');
  const html2canvas = html2canvasModule.default || (html2canvasModule as any).html2canvas || html2canvasModule;
  
  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;
  
  const innerHtml = generateInvoiceHTML(data);
  
  const html = `
  <div id="invoice-render-container">
    <style>
      ${invoicePrintStyles}
    </style>
    ${innerHtml}
  </div>
  `;

  const container = document.createElement('div');
  container.innerHTML = html;
  
  // Hide the container off-screen
  container.style.position = 'absolute';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '210mm'; // Enforce A4 width for rendering
  document.body.appendChild(container);
  
  try {
    const elementToRender = container.firstElementChild as HTMLElement;
    
    // Use html2canvas directly
    const canvas = await html2canvas(elementToRender, {
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: elementToRender.scrollWidth,
      windowHeight: elementToRender.scrollHeight
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const margin = 5;
    const imgWidth = pdfWidth - (margin * 2);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}
