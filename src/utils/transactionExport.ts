import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Transaction {
  id: string;
  type: 'booking_payment' | 'account_topup' | 'refund' | 'fine';
  amount: number;
  description: string;
  created_at: string;
  booking_id?: string;
}

const getTransactionTypeLabel = (type: string): string => {
  switch (type) {
    case 'booking_payment':
      return 'Booking Payment';
    case 'account_topup':
      return 'Account Top-up';
    case 'refund':
      return 'Refund';
    case 'fine':
      return 'Fine';
    default:
      return type.replace('_', ' ').toUpperCase();
  }
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getAmountPrefix = (type: string): string => {
  switch (type) {
    case 'booking_payment':
    case 'fine':
      return '-';
    case 'account_topup':
    case 'refund':
      return '+';
    default:
      return '';
  }
};

export const exportToPDF = (transactions: Transaction[], userEmail: string): void => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(30, 64, 175); // highway-blue color
  doc.text('Transaction History Report', 14, 22);
  
  // User info
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated for: ${userEmail}`, 14, 32);
  doc.text(`Report Date: ${new Date().toLocaleDateString('en-IN')}`, 14, 38);
  doc.text(`Total Transactions: ${transactions.length}`, 14, 44);
  
  // Calculate totals
  const credits = transactions
    .filter(t => t.type === 'account_topup' || t.type === 'refund')
    .reduce((sum, t) => sum + t.amount, 0);
  const debits = transactions
    .filter(t => t.type === 'booking_payment' || t.type === 'fine')
    .reduce((sum, t) => sum + t.amount, 0);
  
  doc.text(`Total Credits: ₹${credits.toFixed(2)}`, 14, 50);
  doc.text(`Total Debits: ₹${debits.toFixed(2)}`, 14, 56);
  
  // Table data
  const tableData = transactions.map((t) => [
    formatDate(t.created_at),
    getTransactionTypeLabel(t.type),
    t.description || '-',
    `${getAmountPrefix(t.type)}₹${t.amount.toFixed(2)}`
  ]);
  
  // Generate table
  autoTable(doc, {
    startY: 65,
    head: [['Date & Time', 'Type', 'Description', 'Amount']],
    body: tableData,
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: 50
    },
    alternateRowStyles: {
      fillColor: [240, 248, 255]
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 35 },
      2: { cellWidth: 70 },
      3: { cellWidth: 30, halign: 'right' }
    },
    margin: { top: 65 }
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount} | TollExpress Transaction Report`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  // Download
  doc.save(`transaction-history-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportToExcel = (transactions: Transaction[], userEmail: string): void => {
  // Prepare data for Excel
  const excelData = transactions.map((t) => ({
    'Date & Time': formatDate(t.created_at),
    'Type': getTransactionTypeLabel(t.type),
    'Description': t.description || '-',
    'Amount (₹)': t.amount,
    'Credit/Debit': t.type === 'account_topup' || t.type === 'refund' ? 'Credit' : 'Debit',
    'Transaction ID': t.id
  }));
  
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  
  // Summary sheet
  const credits = transactions
    .filter(t => t.type === 'account_topup' || t.type === 'refund')
    .reduce((sum, t) => sum + t.amount, 0);
  const debits = transactions
    .filter(t => t.type === 'booking_payment' || t.type === 'fine')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const summaryData = [
    ['Transaction History Report'],
    [''],
    ['User Email', userEmail],
    ['Report Generated', new Date().toLocaleDateString('en-IN')],
    ['Total Transactions', transactions.length],
    ['Total Credits (₹)', credits],
    ['Total Debits (₹)', debits],
    ['Net Balance Change (₹)', credits - debits]
  ];
  
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
  
  // Transactions sheet
  const ws = XLSX.utils.json_to_sheet(excelData);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // Date & Time
    { wch: 18 }, // Type
    { wch: 40 }, // Description
    { wch: 12 }, // Amount
    { wch: 10 }, // Credit/Debit
    { wch: 36 }  // Transaction ID
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
  
  // Download
  XLSX.writeFile(wb, `transaction-history-${new Date().toISOString().split('T')[0]}.xlsx`);
};
