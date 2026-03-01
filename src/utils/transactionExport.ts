import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

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

const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

const saveAndShareFile = async (fileName: string, base64Data: string, mimeType: string): Promise<void> => {
  const result = await Filesystem.writeFile({
    path: fileName,
    data: base64Data,
    directory: Directory.Cache,
  });

  await Share.share({
    title: fileName,
    url: result.uri,
  });
};

export const exportToPDF = async (transactions: Transaction[], userEmail: string): Promise<void> => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(30, 64, 175);
  doc.text('Transaction History Report', 14, 22);
  
  // User info
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated for: ${userEmail}`, 14, 32);
  doc.text(`Report Date: ${new Date().toLocaleDateString('en-IN')}`, 14, 38);
  doc.text(`Total Transactions: ${transactions.length}`, 14, 44);
  
  const credits = transactions
    .filter(t => t.type === 'account_topup' || t.type === 'refund')
    .reduce((sum, t) => sum + t.amount, 0);
  const debits = transactions
    .filter(t => t.type === 'booking_payment' || t.type === 'fine')
    .reduce((sum, t) => sum + t.amount, 0);
  
  doc.text(`Total Credits: ₹${credits.toFixed(2)}`, 14, 50);
  doc.text(`Total Debits: ₹${debits.toFixed(2)}`, 14, 56);
  
  const tableData = transactions.map((t) => [
    formatDate(t.created_at),
    getTransactionTypeLabel(t.type),
    t.description || '-',
    `${getAmountPrefix(t.type)}₹${t.amount.toFixed(2)}`
  ]);
  
  autoTable(doc, {
    startY: 65,
    head: [['Date & Time', 'Type', 'Description', 'Amount']],
    body: tableData,
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontSize: 10, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9, textColor: 50 },
    alternateRowStyles: { fillColor: [240, 248, 255] },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 35 },
      2: { cellWidth: 70 },
      3: { cellWidth: 30, halign: 'right' }
    },
    margin: { top: 65 }
  });
  
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
  
  const fileName = `transaction-history-${new Date().toISOString().split('T')[0]}.pdf`;

  if (isNativePlatform()) {
    const base64 = doc.output('datauristring').split(',')[1];
    await saveAndShareFile(fileName, base64, 'application/pdf');
  } else {
    doc.save(fileName);
  }
};

export const exportToExcel = async (transactions: Transaction[], userEmail: string): Promise<void> => {
  const excelData = transactions.map((t) => ({
    'Date & Time': formatDate(t.created_at),
    'Type': getTransactionTypeLabel(t.type),
    'Description': t.description || '-',
    'Amount (₹)': t.amount,
    'Credit/Debit': t.type === 'account_topup' || t.type === 'refund' ? 'Credit' : 'Debit',
    'Transaction ID': t.id
  }));
  
  const wb = XLSX.utils.book_new();
  
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
  
  const ws = XLSX.utils.json_to_sheet(excelData);
  ws['!cols'] = [
    { wch: 20 }, { wch: 18 }, { wch: 40 }, { wch: 12 }, { wch: 10 }, { wch: 36 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
  
  const fileName = `transaction-history-${new Date().toISOString().split('T')[0]}.xlsx`;

  if (isNativePlatform()) {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    await saveAndShareFile(fileName, wbout, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  } else {
    XLSX.writeFile(wb, fileName);
  }
};
