import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

export interface ReportMetric {
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
}

export interface ReportTable {
  headers: string[];
  rows: (string | number)[][];
}

export interface GeneratePdfOptions {
  stackName: string;
  reportTitle: string;
  dimensionTitle?: string;
  metrics?: ReportMetric[];
  table?: ReportTable;
}

/**
 * Fallback: captures SVG directly from Recharts container if html2canvas encounters issues
 */
async function captureSvgFallback(chartElement: HTMLElement): Promise<string> {
  const svg = chartElement.querySelector('svg');
  if (!svg) {
    throw new Error('No chart SVG found in container');
  }

  const svgCopy = svg.cloneNode(true) as SVGElement;
  const rect = svg.getBoundingClientRect();
  const width = Math.max(rect.width, 800);
  const height = Math.max(rect.height, 400);

  svgCopy.setAttribute('width', `${width}`);
  svgCopy.setAttribute('height', `${height}`);

  const svgString = new XMLSerializer().serializeToString(svgCopy);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to get 2d context'));
        return;
      }
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Generates an executive-grade PDF report from an analytics chart and its metrics.
 */
export async function generateAnalyticsPdfReport(
  chartElement: HTMLElement,
  options: GeneratePdfOptions
): Promise<void> {
  let chartImgData: string;

  // 1. Capture the chart container
  try {
    const canvas = await html2canvas(chartElement, {
      scale: 2, // High DPI for crystal-clear PDF rendering
      useCORS: true,
      logging: false,
      backgroundColor: '#09090b', // Deep dark theme background matching dashboard
    });
    chartImgData = canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('html2canvas capture warning, falling back to SVG renderer:', err);
    chartImgData = await captureSvgFallback(chartElement);
  }

  // 2. Initialize jsPDF in A4 landscape (297mm x 210mm)
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Background fill (Dark slate / zinc)
  pdf.setFillColor(9, 9, 11);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Header Banner Accent Line
  pdf.setFillColor(139, 92, 246); // Violet-500
  pdf.rect(margin, 10, contentWidth, 2, 'F');

  // Title & Subtitle
  pdf.setTextColor(244, 244, 245); // Zinc-100
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('ANALYTICS & PERFORMANCE REPORT', margin, 18);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(161, 161, 170); // Zinc-400
  pdf.text(`Stack: ${options.stackName}   |   ${options.dimensionTitle || 'Overview'}`, margin, 24);

  // Timestamp
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  pdf.setFontSize(9);
  pdf.setTextColor(113, 113, 122); // Zinc-500
  pdf.text(`Generated: ${dateStr} at ${timeStr}`, pageWidth - margin, 18, { align: 'right' });
  pdf.text('Antigravity Workflow Engine', pageWidth - margin, 24, { align: 'right' });

  let currentY = 30;

  // 3. KPI Metric Summary Cards (if provided)
  if (options.metrics && options.metrics.length > 0) {
    const cardCount = Math.min(options.metrics.length, 4);
    const cardGap = 4;
    const cardWidth = (contentWidth - (cardCount - 1) * cardGap) / cardCount;
    const cardHeight = 18;

    options.metrics.slice(0, cardCount).forEach((metric, idx) => {
      const cardX = margin + idx * (cardWidth + cardGap);

      // Card background
      pdf.setFillColor(24, 24, 27); // Zinc-900
      pdf.setDrawColor(39, 39, 42); // Zinc-800
      pdf.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, 'FD');

      // Metric label
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(161, 161, 170);
      pdf.text(metric.label.toUpperCase(), cardX + 4, currentY + 6);

      // Metric value
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(250, 250, 250);
      pdf.text(String(metric.value), cardX + 4, currentY + 13);

      // Subtext
      if (metric.subtext) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.5);
        pdf.setTextColor(113, 113, 122);
        pdf.text(metric.subtext, cardX + cardWidth - 4, currentY + 13, { align: 'right' });
      }
    });

    currentY += cardHeight + 6;
  }

  // 4. Active Chart Canvas Image
  const imgWidth = contentWidth;
  const maxChartHeight = pageHeight - currentY - 18;
  const finalHeight = Math.min(125, maxChartHeight);
  const finalWidth = imgWidth;

  // Border container for chart
  pdf.setFillColor(18, 18, 20);
  pdf.setDrawColor(39, 39, 42);
  pdf.roundedRect(margin - 1, currentY - 1, finalWidth + 2, finalHeight + 2, 2, 2, 'FD');

  pdf.addImage(chartImgData, 'PNG', margin, currentY, finalWidth, finalHeight);

  // 5. Page 1 Footer
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(113, 113, 122);
  pdf.text('CONFIDENTIAL • FOR INTERNAL USE ONLY', margin, pageHeight - 6);
  pdf.text('Page 1 of 1', pageWidth - margin, pageHeight - 6, { align: 'right' });

  // 6. Optional Page 2: Summary Data Table if requested
  if (options.table && options.table.rows.length > 0) {
    pdf.addPage('a4', 'landscape');

    // Page 2 Background
    pdf.setFillColor(9, 9, 11);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Page 2 Header
    pdf.setFillColor(139, 92, 246);
    pdf.rect(margin, 10, contentWidth, 2, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(244, 244, 245);
    pdf.text('DETAILED METRICS SUMMARY', margin, 18);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(161, 161, 170);
    pdf.text(`${options.stackName} — Aligned Records`, margin, 24);

    let tableY = 32;
    const colCount = Math.min(options.table.headers.length, 8);
    const colWidth = contentWidth / colCount;
    const rowHeight = 7;

    // Table Header Row
    pdf.setFillColor(39, 39, 42);
    pdf.rect(margin, tableY, contentWidth, rowHeight, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(250, 250, 250);

    options.table.headers.slice(0, colCount).forEach((header, colIdx) => {
      pdf.text(header, margin + colIdx * colWidth + 2, tableY + 5);
    });

    tableY += rowHeight;

    // Table Data Rows (up to 22 rows on page 2)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    const rowsToPrint = options.table.rows.slice(0, 22);

    rowsToPrint.forEach((row, rowIdx) => {
      if (rowIdx % 2 === 0) {
        pdf.setFillColor(18, 18, 20);
        pdf.rect(margin, tableY, contentWidth, rowHeight, 'F');
      }

      pdf.setTextColor(228, 228, 231);
      row.slice(0, colCount).forEach((cell, colIdx) => {
        pdf.text(String(cell ?? ''), margin + colIdx * colWidth + 2, tableY + 5);
      });

      tableY += rowHeight;
    });

    // Page 2 Footer
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(113, 113, 122);
    pdf.text('CONFIDENTIAL • FOR INTERNAL USE ONLY', margin, pageHeight - 6);
    pdf.text('Page 2 of 2', pageWidth - margin, pageHeight - 6, { align: 'right' });
  }

  // 7. Trigger download
  const cleanStackName = (options.stackName || 'Analytics').replace(/[^a-zA-Z0-9_-]/g, '_');
  pdf.save(`${cleanStackName}_Report_${dateStr.replace(/\s+/g, '_')}.pdf`);
}
