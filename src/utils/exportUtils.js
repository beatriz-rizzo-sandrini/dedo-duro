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
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Calculate dynamic column alignments based on header keywords to align numbers/prices beautifully
  const columnStyles = {};
  headers.forEach((header, index) => {
    const text = String(header).toUpperCase();
    if (
      ['ESTOQUE', 'VENDAS', 'QTD', 'QUANTIDADE', 'VALOR', 'PREÇO', 'PRECO', 'MÉDIA', 'MEDIA', 'DIAS', 'COBERTO', 'CAMINHO', 'SALDO'].some(key => text.includes(key))
    ) {
      columnStyles[index] = { halign: 'right' };
    } else {
      columnStyles[index] = { halign: 'left' };
    }
  });

  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 32,
    margin: { top: 32, bottom: 20, left: 14, right: 14 },
    theme: 'striped',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 4.5,
      lineColor: [226, 232, 240], // slate-200 divider lines
      lineWidth: 0.1,
      textColor: [51, 65, 85], // slate-700 body text
      valign: 'middle'
    },
    headStyles: {
      fillColor: [15, 23, 42], // slate-900 header (looks extremely modern)
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      cellPadding: 5
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // slate-50 background for premium alternate row look
    },
    columnStyles: columnStyles,
    didDrawPage: (data) => {
      // 1. Top Indigo Accent Border Bar
      doc.setFillColor(79, 70, 229); // Premium Indigo color
      doc.rect(0, 0, doc.internal.pageSize.width, 3, 'F');

      // 2. Report Main Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42); // Deep slate title color
      doc.text(title, 14, 15);

      // 3. Subtitle and Timestamp metadata
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139); // Slate-500 subtitle
      const nowStr = new Date().toLocaleString('pt-BR');
      doc.text(`Relatório Gerencial • Gerado em ${nowStr}`, 14, 21);

      // 4. Subtle separator line below title block
      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.setLineWidth(0.15);
      doc.line(14, 25, doc.internal.pageSize.width - 14, 25);

      // 5. Page Number and Brand Footer
      const totalPages = doc.internal.getNumberOfPages();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate-400
      const pageStr = `Página ${data.pageNumber} de ${totalPages}`;
      doc.text(pageStr, doc.internal.pageSize.width - 14, doc.internal.pageSize.height - 10, { align: 'right' });
      doc.text('Dedo Duro • Sistema de Gestão de Estoque', 14, doc.internal.pageSize.height - 10);
    }
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}.pdf`);
};

export const handleExport = (type, title, headers, data) => {
  if (type === 'csv') exportToCSV(title, headers, data);
  if (type === 'xlsx') exportToXLSX(title, headers, data);
  if (type === 'pdf') exportToPDF(title, headers, data);
};
