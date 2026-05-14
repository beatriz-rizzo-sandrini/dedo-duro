import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const exportToCSV = (title, headers, data) => {
  let csv = headers.join(';') + '\n';
  data.forEach(row => {
    const rowStr = row.map(val => {
      let str = String(val).replace(/"/g, '""');
      // Replace line breaks to space
      str = str.replace(/\n/g, ' ');
      if (str.includes(';')) str = `"${str}"`;
      return str;
    }).join(';');
    csv += rowStr + '\n';
  });

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${title.toLowerCase().replace(/\s+/g, '_')}.csv`;
  link.click();
};

export const exportToXLSX = (title, headers, data) => {
  const wsData = [headers, ...data];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title);
  XLSX.writeFile(wb, `${title.toLowerCase().replace(/\s+/g, '_')}.xlsx`);
};

export const exportToPDF = (title, headers, data) => {
  const doc = new jsPDF('landscape');
  
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 22);

  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 30,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] }
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}.pdf`);
};

export const handleExport = (type, title, headers, data) => {
  if (type === 'csv') exportToCSV(title, headers, data);
  if (type === 'xlsx') exportToXLSX(title, headers, data);
  if (type === 'pdf') exportToPDF(title, headers, data);
};
