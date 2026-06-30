import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const exportToCSV = (title, headers, data, options = {}) => {
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

  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  
  const cleanFilename = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_.-]/g, '_')
    .replace(/__+/g, '_');

  link.download = `${cleanFilename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToXLSX = (title, headers, data, options = {}) => {
  const wsData = [headers, ...data];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  
  const sheetName = title
    .replace(/[\\\/\?\*\[\]]/g, '')
    .substring(0, 31);
    
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const cleanFilename = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_.-]/g, '_')
    .replace(/__+/g, '_');

  XLSX.writeFile(wb, `${cleanFilename}.xlsx`);
};

export const generatePDFBlob = (title, headers, data, options = {}) => {
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
      ['ESTOQUE', 'VENDAS', 'QTD', 'QUANTIDADE', 'VALOR', 'PREÇO', 'PRECO', 'MÉDIA', 'MEDIA', 'DIAS', 'COBERTO', 'CAMINHO', 'SALDO', 'SHARE'].some(key => text.includes(key))
    ) {
      columnStyles[index] = { halign: 'right' };
    } else {
      columnStyles[index] = { halign: 'left' };
    }
  });

  // Determine starting position of table based on options
  let tableStartY = 32;
  
  if (options.kpis && options.kpis.length > 0) {
    tableStartY = 58; // Push table down to make space for KPIs on first page
  }

  autoTable(doc, {
    head: [headers],
    body: data,
    startY: tableStartY,
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
    didParseCell: (cellData) => {
      const firstCellVal = String(cellData.row.raw[0] || '');
      const isChild = firstCellVal.startsWith('   ');
      
      // Determine if the current dataset has hierarchical parent/child structure
      const hasChildren = cellData.table.body.some(r => String(r.raw[0] || '').startsWith('   '));
      
      if (hasChildren) {
        if (!isChild) {
          cellData.cell.styles.fontStyle = 'bold';
          cellData.cell.styles.fillColor = [241, 245, 249]; // Slate-100 highlight for parent row
          cellData.cell.styles.textColor = [15, 23, 42]; // Slate-900 for parent text
          cellData.cell.styles.cellPadding = 5.5; // Slightly taller parent rows
        } else {
          cellData.cell.styles.textColor = [71, 85, 105]; // Slate-600 for child rows
          cellData.cell.styles.fillColor = [255, 255, 255]; // Pure white background for child rows
          if (cellData.column.index === 1) {
            cellData.cell.styles.font = 'courier'; // Monospace for SKUs
            cellData.cell.styles.fontSize = 8;
          }
        }
      }
    },
    didDrawPage: (data) => {
      // 1. Top Indigo Accent Border Bar
      doc.setFillColor(79, 70, 229); // Premium Indigo color
      doc.rect(0, 0, doc.internal.pageSize.width, 3, 'F');

      // 2. Report Main Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42); // Deep slate title color
      doc.text(title.toUpperCase(), 14, 13);

      // 3. Subtitle and Timestamp metadata
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139); // Slate-500 subtitle
      const subtitleText = options.subTitle || `Relatório Gerencial • Gerado em ${new Date().toLocaleString('pt-BR')}`;
      doc.text(subtitleText, 14, 18);

      // 4. Active Filters display
      if (options.filters && options.filters.length > 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(79, 70, 229); // Indigo text for active filters
        doc.text(`Filtros ativos: ${options.filters.join(' | ')}`, 14, 22);
      }

      // 5. Subtle separator line below title block
      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.setLineWidth(0.15);
      doc.line(14, 25, doc.internal.pageSize.width - 14, 25);

      // 6. Draw KPI grid if provided (ONLY on the first page to save space)
      if (data.pageNumber === 1 && options.kpis && options.kpis.length > 0) {
        const kpiY = 28;
        const boxHeight = 22;
        const boxGap = 5;
        
        const pageWidth = doc.internal.pageSize.width;
        const margin = 14;
        const availWidth = pageWidth - 2 * margin;
        const numKpis = options.kpis.length;
        
        const maxBoxWidth = 60;
        let boxWidth = (availWidth - (numKpis - 1) * boxGap) / numKpis;
        if (boxWidth > maxBoxWidth) {
          boxWidth = maxBoxWidth;
        }
        
        options.kpis.forEach((kpi, idx) => {
          const kpiX = margin + idx * (boxWidth + boxGap);
          
          // Draw soft background box
          doc.setFillColor(248, 250, 252); // slate-50
          doc.setDrawColor(241, 245, 249); // slate-100 border
          doc.setLineWidth(0.3);
          doc.roundedRect(kpiX, kpiY, boxWidth, boxHeight, 3, 3, 'FD');

          // Draw KPI Label
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139); // slate-500
          doc.text(kpi.label.toUpperCase(), kpiX + 5, kpiY + 6);

          // Draw KPI Value
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          doc.setTextColor(15, 23, 42); // slate-900
          doc.text(String(kpi.value), kpiX + 5, kpiY + 14);

          // Draw KPI Subtext (optional)
          if (kpi.sub) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(148, 163, 184); // slate-400
            doc.text(kpi.sub, kpiX + 5, kpiY + 19);
          }
        });
      }

      // 7. Page Number and Brand Footer
      const totalPages = doc.internal.getNumberOfPages();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate-400
      const pageStr = `Página ${data.pageNumber} de ${totalPages}`;
      doc.text(pageStr, doc.internal.pageSize.width - 14, doc.internal.pageSize.height - 10, { align: 'right' });
      doc.text('Dedo Duro • Sistema de Gestão de Estoque', 14, doc.internal.pageSize.height - 10);
    }
  });

  const blob = doc.output('blob');
  
  const cleanFilename = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_.-]/g, '_')
    .replace(/__+/g, '_');
    
  const filename = `${cleanFilename}.pdf`;
  return { doc, blob, filename };
};

export const exportToPDF = (title, headers, data, options = {}) => {
  const { doc, filename } = generatePDFBlob(title, headers, data, options);
  doc.save(filename);
};

export const handleExport = (type, title, headers, data, options = {}) => {
  if (type === 'csv') exportToCSV(title, headers, data, options);
  if (type === 'xlsx') exportToXLSX(title, headers, data, options);
  if (type === 'pdf') exportToPDF(title, headers, data, options);
};
