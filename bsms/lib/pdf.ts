import { formatDate } from '@/lib/utils';
import { Payment } from '@/types';

type PdfSection = {
  heading?: string;
  lines: string[];
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 38;
const GREEN = [43, 124, 82] as const;
const TEAL = [93, 191, 199] as const;
const MINT = [148, 218, 184] as const;
const DARK = [18, 24, 38] as const;
const MUTED = [86, 96, 111] as const;
const LINE = [196, 199, 204] as const;

function sanitizeFilePart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function escapePdfText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '?');
}

function money(amount: number): string {
  const hasDecimals = Math.abs(amount % 1) > 0;
  const formatted = new Intl.NumberFormat('en-BD', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return `BDT:${formatted}`;
}

function titleCase(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

function pdfDate(value: string): string {
  return formatDate(value).replace(/,/g, '');
}

function color([r, g, b]: readonly number[]): string {
  return `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)}`;
}

function text(
  value: string,
  x: number,
  y: number,
  options: { size?: number; bold?: boolean; fill?: readonly number[]; align?: 'left' | 'right' | 'center' } = {}
): string {
  const size = options.size ?? 11;
  const font = options.bold ? 'F2' : 'F1';
  const estimatedWidth = value.length * size * 0.5;
  const tx = options.align === 'right' ? x - estimatedWidth : options.align === 'center' ? x - estimatedWidth / 2 : x;

  return [
    `${color(options.fill ?? DARK)} rg`,
    'BT',
    `/${font} ${size} Tf`,
    `1 0 0 1 ${tx.toFixed(2)} ${y.toFixed(2)} Tm`,
    `(${escapePdfText(value)}) Tj`,
    'ET',
  ].join('\n');
}

function wrappedText(
  value: string,
  x: number,
  y: number,
  maxChars: number,
  options: { size?: number; bold?: boolean; fill?: readonly number[]; leading?: number } = {}
): { stream: string; nextY: number } {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  });

  if (current) lines.push(current);

  const leading = options.leading ?? (options.size ?? 11) + 4;
  const stream = lines.map((line, index) => text(line, x, y - index * leading, options)).join('\n');
  return { stream, nextY: y - Math.max(lines.length, 1) * leading };
}

function rect(x: number, y: number, w: number, h: number, options: { fill?: readonly number[]; stroke?: readonly number[]; width?: number } = {}): string {
  const commands: string[] = [];
  if (options.fill) commands.push(`${color(options.fill)} rg`);
  if (options.stroke) commands.push(`${color(options.stroke)} RG`);
  if (options.width) commands.push(`${options.width} w`);
  commands.push(`${x} ${y} ${w} ${h} re`);
  commands.push(options.fill && options.stroke ? 'B' : options.fill ? 'f' : 'S');
  return commands.join('\n');
}

function line(x1: number, y1: number, x2: number, y2: number, stroke: readonly number[] = LINE, width = 1): string {
  return [`${color(stroke)} RG`, `${width} w`, `${x1} ${y1} m`, `${x2} ${y2} l`, 'S'].join('\n');
}

function polygon(points: Array<[number, number]>, fill: readonly number[]): string {
  const [first, ...rest] = points;
  return [
    `${color(fill)} rg`,
    `${first[0]} ${first[1]} m`,
    ...rest.map(([x, y]) => `${x} ${y} l`),
    'h',
    'f',
  ].join('\n');
}

function logoMark(x: number, y: number): string {
  return [
    rect(x, y, 40, 40, { stroke: DARK, width: 4 }),
    rect(x + 8, y + 8, 24, 24, { stroke: DARK, width: 3 }),
    rect(x + 15, y + 15, 10, 10, { stroke: DARK, width: 3 }),
    line(x + 20, y + 15, x + 20, y + 29, DARK, 3),
    line(x + 15, y + 20, x + 29, y + 20, DARK, 3),
  ].join('\n');
}

function tableRow(y: number, values: string[], widths: number[], options: { header?: boolean; bold?: boolean; height?: number } = {}): string {
  const height = options.height ?? 28;
  let x = MARGIN;
  const commands = [
    rect(MARGIN, y - height + 8, widths.reduce((sum, width) => sum + width, 0), height, { stroke: LINE, width: 1 }),
  ];

  values.forEach((value, index) => {
    if (index > 0) commands.push(line(x, y + 8, x, y - height + 8, LINE, 1));
    commands.push(text(value, x + 8, y - 10, { size: options.header ? 13 : 11, bold: options.header || options.bold, fill: options.header ? GREEN : DARK }));
    x += widths[index];
  });

  return commands.join('\n');
}

function wrapCell(value: string, width: number, size: number): string[] {
  const maxChars = Math.max(6, Math.floor((width - 16) / (size * 0.48)));
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      return;
    }

    if (current) {
      lines.push(current);
      current = word;
      return;
    }

    lines.push(word.slice(0, maxChars - 1) + '-');
    current = word.slice(maxChars - 1);
  });

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

function reportTableRow(y: number, values: string[], widths: number[], options: { header?: boolean } = {}): { stream: string; height: number } {
  const size = options.header ? 12 : 9;
  const lineHeight = options.header ? 13 : 11;
  const wrappedCells = values.map((value, index) => wrapCell(value, widths[index], size));
  const height = Math.max(options.header ? 28 : 30, Math.max(...wrappedCells.map((cell) => cell.length)) * lineHeight + 14);
  let x = MARGIN;
  const commands = [
    rect(MARGIN, y - height + 8, widths.reduce((sum, width) => sum + width, 0), height, { stroke: LINE, width: 1 }),
  ];

  wrappedCells.forEach((cellLines, index) => {
    if (index > 0) commands.push(line(x, y + 8, x, y - height + 8, LINE, 1));
    cellLines.forEach((cellLine, lineIndex) => {
      commands.push(text(cellLine, x + 8, y - 10 - lineIndex * lineHeight, {
        size,
        bold: options.header,
        fill: options.header ? GREEN : DARK,
      }));
    });
    x += widths[index];
  });

  return { stream: commands.join('\n'), height };
}

function createPdfBlob(streams: string[]): Blob {
  const pageCount = streams.length;
  const objects: string[] = [];
  const pageObjectIds = streams.map((_, index) => 3 + index * 2);
  const contentObjectIds = streams.map((_, index) => 4 + index * 2);
  const helveticaId = 3 + pageCount * 2;
  const helveticaBoldId = helveticaId + 1;

  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>`);

  streams.forEach((stream, index) => {
    const pageId = pageObjectIds[index];
    const contentId = contentObjectIds[index];
    objects[pageId - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${helveticaId} 0 R /F2 ${helveticaBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId - 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  objects[helveticaId - 1] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[helveticaBoldId - 1] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function baseInvoiceHeader(documentTitle: string, documentNumber: string, dateLabel: string): string {
  return [
    polygon([[0, PAGE_HEIGHT], [PAGE_WIDTH, PAGE_HEIGHT], [PAGE_WIDTH, 610], [0, 505]], TEAL),
    polygon([[0, PAGE_HEIGHT], [270, PAGE_HEIGHT], [0, 505]], MINT),
    text(documentTitle, MARGIN + 8, 752, { size: 26, fill: [0, 0, 0] }),
    text('DATE', MARGIN, 684, { size: 14, bold: true, fill: [0, 0, 0] }),
    text(dateLabel, MARGIN, 657, { size: 16, fill: [0, 0, 0] }),
    text(documentTitle === 'INVOICE' ? 'INVOICE NO' : 'REPORT NO', 214, 684, { size: 14, bold: true, fill: [0, 0, 0] }),
    text(documentNumber, 214, 657, { size: 16, fill: [0, 0, 0] }),
    logoMark(390, 736),
    text('BSMS', 442, 764, { size: 16, bold: true, fill: [0, 0, 0] }),
    text('Building Society', 442, 744, { size: 13, fill: [0, 0, 0] }),
    text('BSMS Building Society', 388, 690, { size: 18, bold: true, fill: [0, 0, 0] }),
    text('Digital building management', 388, 670, { size: 12, fill: [0, 0, 0] }),
    text('Admin Office', 388, 650, { size: 12, fill: [0, 0, 0] }),
    text('Dhaka, Bangladesh', 388, 632, { size: 12, fill: [0, 0, 0] }),
    text('support@bsms.com', 388, 614, { size: 12, fill: [0, 0, 0] }),
  ].join('\n');
}

function receiptStream(payment: Payment): string {
  const recipientLabel = payment.recipient === 'owner' ? (payment.ownerName || 'Owner') : 'Admin (BSMS)';
  const dateLabel = payment.paidDate ? pdfDate(payment.paidDate) : pdfDate(payment.dueDate);
  const subtotal = payment.amount;
  const tax = 0;
  const total = subtotal + tax;
  const itemName = titleCase(payment.type);

  return [
    baseInvoiceHeader('INVOICE', payment.invoiceNumber, dateLabel),
    text('INVOICE TO', MARGIN, 558, { size: 12, bold: true, fill: [0, 0, 0] }),
    text(payment.tenantName, MARGIN, 536, { size: 12, bold: true, fill: [0, 0, 0] }),
    text(`Flat ${payment.flatNumber}`, MARGIN, 517, { size: 12, fill: [0, 0, 0] }),
    text(`Billing month ${payment.month}`, MARGIN, 498, { size: 12, fill: [0, 0, 0] }),
    tableRow(442, ['Client', 'Location', 'Payment Terms', 'Due date'], [128, 142, 164, 85], { header: true, height: 28 }),
    text(payment.tenantName, 74, 412, { size: 10 }),
    text(`Flat ${payment.flatNumber}`, 210, 412, { size: 10 }),
    text(payment.status === 'paid' ? 'Paid' : 'Due on Receipt', 348, 412, { size: 10 }),
    text(pdfDate(payment.dueDate), 488, 412, { size: 10 }),
    text('Item', 82, 365, { size: 14, fill: GREEN }),
    text('Unit Price', 216, 365, { size: 14, fill: GREEN }),
    text('Qty', 376, 365, { size: 14, fill: GREEN }),
    text('Line Total', 476, 365, { size: 14, fill: GREEN }),
    line(MARGIN, 344, PAGE_WIDTH - MARGIN, 344, DARK, 1.4),
    tableRow(298, [itemName, money(payment.amount), '1', money(payment.amount)], [142, 180, 116, 81], { bold: true, height: 42 }),
    tableRow(256, ['Recipient', recipientLabel, 'Method', titleCase(payment.method || 'N/A')], [142, 180, 116, 81], { height: 34 }),
    rect(MARGIN, 160, 519, 66, { stroke: LINE, width: 1 }),
    line(452, 226, 452, 160, LINE, 1),
    line(MARGIN, 204, PAGE_WIDTH - MARGIN, 204, LINE, 1),
    line(MARGIN, 182, PAGE_WIDTH - MARGIN, 182, LINE, 1),
    text('Subtotal', 394, 209, { size: 13, align: 'right' }),
    text(money(subtotal), 552, 209, { size: 10, align: 'right' }),
    text('Sales Tax', 394, 187, { size: 13, align: 'right' }),
    text(money(tax), 552, 187, { size: 10, align: 'right' }),
    text('Total', 394, 165, { size: 13, bold: true, align: 'right' }),
    text(money(total), 552, 165, { size: 10, bold: true, align: 'right' }),
    text(`Status: ${titleCase(payment.status)}`, MARGIN, 120, { size: 11, bold: true, fill: GREEN }),
    text('Generated automatically by BSMS.', MARGIN, 102, { size: 10, fill: MUTED }),
  ].join('\n');
}

function reportStreams(title: string, sections: PdfSection[], subtitle?: string): string[] {
  const pages: string[] = [];
  let commands: string[] = [
    baseInvoiceHeader('REPORT', new Date().getTime().toString().slice(-6), new Date().toLocaleDateString('en-BD')),
    text(title, MARGIN, 558, { size: 18, bold: true }),
  ];
  let y = 532;

  if (subtitle) {
    const wrapped = wrappedText(subtitle, MARGIN, y, 68, { size: 11, fill: MUTED });
    commands.push(wrapped.stream);
    y = wrapped.nextY - 8;
  }

  const finishPage = () => {
    commands.push(text(`Page ${pages.length + 1}`, MARGIN, 28, { size: 9, fill: MUTED }));
    pages.push(commands.join('\n'));
    commands = [
      text(title, MARGIN, 786, { size: 18, bold: true }),
      text('Continued', MARGIN, 766, { size: 10, fill: MUTED }),
    ];
    y = 730;
  };

  sections.forEach((section) => {
    if (y < 130) finishPage();
    if (section.heading) {
      commands.push(text(section.heading, MARGIN, y, { size: 15, bold: true, fill: GREEN }));
      y -= 26;
    }

    const tableLines = section.lines.filter((item) => item.includes('|'));
    if (tableLines.length === section.lines.length && tableLines.length > 0) {
      const headers = section.heading?.toLowerCase().includes('payment')
        ? ['Invoice', 'Name', 'Flat', 'Period', 'Status', 'Amount']
        : section.heading?.toLowerCase().includes('ticket')
          ? ['Ticket', 'Name', 'Flat', 'Category', 'Priority', 'Status']
          : section.heading?.toLowerCase().includes('visitor')
            ? ['Visitor', 'Flat', 'Type', 'Status', 'Date']
            : ['Flat', 'Floor', 'Status', 'Owner', 'Tenant'];
      const widths = headers.length === 6 ? [78, 106, 52, 82, 64, 137] : [98, 72, 78, 124, 147];
      const headerRow = reportTableRow(y, headers, widths, { header: true });
      commands.push(headerRow.stream);
      y -= headerRow.height;

      tableLines.forEach((lineValue) => {
        if (y < 70) finishPage();
        const cells = lineValue.split('|').map((cell) => (
          cell
            .trim()
            .replace(/^Owner:\s*/i, '')
            .replace(/^Tenant:\s*/i, '')
            .replace(/^Flat\s+/i, '')
        ));
        const row = reportTableRow(y, cells.slice(0, headers.length), widths);
        if (y - row.height < 64) {
          finishPage();
        }
        commands.push(row.stream);
        y -= row.height;
      });
      y -= 12;
      return;
    }

    section.lines.forEach((lineValue) => {
      if (y < 82) finishPage();
      const wrapped = wrappedText(lineValue, MARGIN, y, 78, { size: 11 });
      commands.push(wrapped.stream);
      y = wrapped.nextY - 4;
    });
    y -= 12;
  });

  commands.push(text(`Page ${pages.length + 1}`, MARGIN, 28, { size: 9, fill: MUTED }));
  pages.push(commands.join('\n'));
  return pages;
}

export function downloadPdfDocument(filename: string, title: string, sections: PdfSection[], subtitle?: string): void {
  downloadBlob(filename, createPdfBlob(reportStreams(title, sections, subtitle)));
}

export function downloadPaymentReceipt(payment: Payment): void {
  const filename = `invoice-${sanitizeFilePart(payment.invoiceNumber)}`;
  downloadBlob(filename, createPdfBlob([receiptStream(payment)]));
}
