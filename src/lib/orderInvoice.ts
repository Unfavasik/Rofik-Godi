import { jsPDF } from 'jspdf';
import type { CustomerOrderRecord } from '../types';
import { WORKSHOP_INFO } from '../data/products';
import { isOrderComplete } from './orderPresentation';

const safeFilename = (value: string) => value.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '') || 'order';
const amount = (value: number) => `INR ${Number(value || 0).toLocaleString('en-IN')}`;
const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

export const downloadOrderInvoice = (
  order: CustomerOrderRecord,
  customerName = order.customer_name,
) => {
  if (!isOrderComplete(order.status)) return false;

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 16;
  const right = pageWidth - margin;
  const items = order.order_items || [];
  const paymentState = order.payment_status?.toLowerCase() === 'paid' ? 'PAID' : 'DUE AT PICKUP';

  pdf.setFillColor(217, 67, 53);
  pdf.rect(0, 0, pageWidth, 5, 'F');
  pdf.setTextColor(24, 26, 30);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text('ROFIK GODI CENTRE', margin, 20);
  pdf.setTextColor(100, 105, 114);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(String(WORKSHOP_INFO.address || 'Kadbeltala, Murshidabad'), margin, 26);
  pdf.text(`Phone: ${WORKSHOP_INFO.phone || '+91 98321 45678'}`, margin, 31);

  pdf.setFillColor(255, 244, 241);
  pdf.roundedRect(right - 48, 13, 48, 24, 3, 3, 'F');
  pdf.setTextColor(194, 57, 45);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('INVOICE', right - 24, 22, { align: 'center' });
  pdf.setFontSize(8);
  pdf.text(`ORDER #${order.order_number}`, right - 24, 29, { align: 'center' });

  pdf.setDrawColor(226, 228, 232);
  pdf.line(margin, 42, right, 42);
  pdf.setTextColor(110, 116, 125);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('BILLED TO', margin, 52);
  pdf.text('ORDER DATE', 112, 52);
  pdf.setTextColor(28, 30, 34);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text(customerName || order.customer_name || 'Customer', margin, 59);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Phone: ${order.customer_phone || '—'}`, margin, 65);
  pdf.text(dateLabel(order.created_at), 112, 59);
  pdf.text(`Status: ${order.status === 'PICKED_UP' ? 'Picked up' : 'Completed'}`, 112, 65);

  pdf.setFillColor(247, 248, 250);
  pdf.roundedRect(margin, 74, right - margin, 15, 2, 2, 'F');
  pdf.setTextColor(97, 103, 113);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('PICKUP LOCATION', margin + 4, 80);
  pdf.setTextColor(31, 34, 39);
  pdf.setFontSize(9);
  pdf.text(String(order.pickup_store || WORKSHOP_INFO.name || 'Rofik Godi Centre'), margin + 4, 85);

  let y = 101;
  const drawTableHeader = () => {
    pdf.setFillColor(31, 34, 39);
    pdf.roundedRect(margin, y - 6, right - margin, 11, 2, 2, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('ITEM', margin + 3, y + 1);
    pdf.text('QTY', 139, y + 1, { align: 'right' });
    pdf.text('UNIT PRICE', 166, y + 1, { align: 'right' });
    pdf.text('AMOUNT', right - 3, y + 1, { align: 'right' });
    y += 11;
  };
  drawTableHeader();

  for (const item of items) {
    const nameLines = pdf.splitTextToSize(String(item.product_name || 'Product'), 93) as string[];
    const rowHeight = Math.max(11, nameLines.length * 4.4 + 5);
    if (y + rowHeight > 264) {
      pdf.addPage();
      y = 23;
      drawTableHeader();
    }
    pdf.setTextColor(33, 36, 41);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.text(nameLines, margin + 3, y + 1);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(96, 103, 112);
    pdf.setFontSize(8);
    pdf.text(String(item.quantity || 0), 139, y + 1, { align: 'right' });
    pdf.text(amount(Number(item.unit_price || 0)), 166, y + 1, { align: 'right' });
    pdf.setTextColor(33, 36, 41);
    pdf.setFont('helvetica', 'bold');
    pdf.text(amount(Number(item.quantity || 0) * Number(item.unit_price || 0)), right - 3, y + 1, { align: 'right' });
    if (item.color) {
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(130, 136, 144);
      pdf.setFontSize(7);
      pdf.text(`Color: ${item.color}`, margin + 3, y + nameLines.length * 4.4 + 1);
    }
    y += rowHeight;
    pdf.setDrawColor(232, 234, 237);
    pdf.line(margin, y, right, y);
    y += 2;
  }

  const summaryTop = Math.max(y + 5, 123);
  if (summaryTop > 250) {
    pdf.addPage();
    y = 25;
  } else {
    y = summaryTop;
  }
  const summaryX = 119;
  const summaryRight = right - 3;
  const summaryRow = (label: string, value: string, rowY: number, strong = false, green = false) => {
    pdf.setFont('helvetica', strong ? 'bold' : 'normal');
    pdf.setFontSize(strong ? 11 : 9);
    pdf.setTextColor(green ? 30 : strong ? 30 : 105, green ? 125 : strong ? 34 : 111, green ? 78 : strong ? 39 : 119);
    pdf.text(label, summaryX, rowY);
    pdf.text(value, summaryRight, rowY, { align: 'right' });
  };
  summaryRow('Subtotal', amount(order.subtotal), y);
  y += 7;
  summaryRow('Discount', `− ${amount(order.discount)}`, y, false, true);
  y += 5;
  pdf.setDrawColor(214, 217, 222);
  pdf.line(summaryX, y, right, y);
  y += 8;
  summaryRow('TOTAL', amount(order.total), y, true);
  y += 7;
  summaryRow('Payment', paymentState, y, false, paymentState === 'PAID');
  y += 13;

  if (y > 264) {
    pdf.addPage();
    y = 25;
  }
  pdf.setFillColor(255, 247, 244);
  pdf.roundedRect(margin, y, right - margin, 18, 2, 2, 'F');
  pdf.setTextColor(183, 72, 59);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('THANK YOU FOR CHOOSING ROFIK GODI CENTRE', pageWidth / 2, y + 7, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(113, 118, 126);
  pdf.setFontSize(7);
  pdf.text(`Questions? Call ${WORKSHOP_INFO.phone || '+91 98321 45678'}`, pageWidth / 2, y + 13, { align: 'center' });

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(150, 154, 161);
    pdf.setFontSize(7);
    pdf.text(`Invoice · ${order.order_number}     Page ${page} of ${pageCount}`, pageWidth / 2, 289, { align: 'center' });
  }

  pdf.setProperties({ title: `Invoice ${order.order_number}`, subject: 'Completed order invoice', author: 'Rofik Godi Centre' });
  pdf.save(`invoice-${safeFilename(order.order_number)}.pdf`);
  return true;
};
