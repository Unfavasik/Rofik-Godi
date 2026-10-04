import { jsPDF } from 'jspdf';
import type { CustomerOrderRecord } from '../types';
import { WORKSHOP_INFO } from '../data/products';

const money = (amount: number) => `INR ${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const printable = (value: string | null | undefined) => (value || '').normalize('NFKD').replace(/[^\x20-\x7E]/g, '').trim();

export function downloadOrderInvoice(order: CustomerOrderRecord) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const right = pageWidth - 18;
  const orderDate = new Date(order.created_at);
  const dateLabel = Number.isNaN(orderDate.getTime()) ? 'Date unavailable' : orderDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  pdf.setFillColor(217, 35, 45);
  pdf.rect(0, 0, 5, 297, 'F');
  pdf.setTextColor(25, 28, 34);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(19);
  pdf.text(WORKSHOP_INFO.name, 18, 24);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(104, 110, 120);
  pdf.text(printable(WORKSHOP_INFO.subtitle), 18, 31);
  pdf.text(printable(WORKSHOP_INFO.address), 18, 37);
  pdf.text(`${WORKSHOP_INFO.phone}  |  ${WORKSHOP_INFO.email}`, 18, 43);

  pdf.setFillColor(249, 245, 243);
  pdf.roundedRect(18, 53, pageWidth - 36, 31, 3, 3, 'F');
  pdf.setTextColor(217, 35, 45);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(17);
  pdf.text('INVOICE', 24, 65);
  pdf.setTextColor(38, 41, 47);
  pdf.setFontSize(10);
  pdf.text(`Order #${printable(order.order_number)}`, right, 64, { align: 'right' });
  pdf.setTextColor(104, 110, 120);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Placed ${dateLabel}`, right, 73, { align: 'right' });

  pdf.setTextColor(38, 41, 47);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('BILLED TO', 18, 98);
  pdf.text('PICKUP & PAYMENT', 112, 98);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(85, 91, 101);
  pdf.setFontSize(10);
  pdf.text(printable(order.customer_name) || 'Customer', 18, 106);
  pdf.text(printable(order.customer_phone) || 'Phone not provided', 18, 112);
  pdf.text(pdf.splitTextToSize(printable(order.vehicle_model) || 'Vehicle not specified', 78), 18, 118);
  pdf.text(pdf.splitTextToSize(printable(order.pickup_store) || WORKSHOP_INFO.address, 78), 112, 106);
  pdf.text(`Payment: ${printable(order.payment_status).toUpperCase() || 'PENDING'}`, 112, 118);
  pdf.text(`Method: ${printable(order.payment_method).replaceAll('_', ' ').toUpperCase() || '—'}`, 112, 124);

  let y = 143;
  pdf.setFillColor(31, 34, 40);
  pdf.roundedRect(18, y - 8, pageWidth - 36, 12, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('ITEM', 23, y);
  pdf.text('QTY', 132, y, { align: 'right' });
  pdf.text('PRICE', 160, y, { align: 'right' });
  pdf.text('AMOUNT', right - 2, y, { align: 'right' });
  y += 11;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  (order.order_items || []).forEach((item) => {
    const title = printable(item.product_name) || 'Product';
    const color = printable(item.color);
    const lines = pdf.splitTextToSize(color ? `${title} (${color})` : title, 92);
    const rowHeight = Math.max(10, lines.length * 5 + 3);
    if (y + rowHeight > 260) {
      pdf.addPage();
      y = 24;
    }
    pdf.setDrawColor(231, 233, 236);
    pdf.line(18, y - 5, right, y - 5);
    pdf.setTextColor(38, 41, 47);
    pdf.text(lines, 23, y);
    pdf.setTextColor(85, 91, 101);
    pdf.text(String(item.quantity || 0), 132, y, { align: 'right' });
    pdf.text(money(item.unit_price), 160, y, { align: 'right' });
    pdf.setTextColor(38, 41, 47);
    pdf.text(money(Number(item.unit_price || 0) * Number(item.quantity || 0)), right - 2, y, { align: 'right' });
    y += rowHeight;
  });

  if (y > 245) {
    pdf.addPage();
    y = 24;
  }
  y += 7;
  pdf.setDrawColor(217, 220, 224);
  pdf.line(112, y - 4, right, y - 4);
  const summaryRow = (label: string, value: string, strong = false) => {
    pdf.setFont('helvetica', strong ? 'bold' : 'normal');
    pdf.setFontSize(strong ? 12 : 9);
    pdf.setTextColor(strong ? 31 : 104, strong ? 34 : 110, strong ? 40 : 120);
    pdf.text(label, 116, y);
    pdf.text(value, right - 2, y, { align: 'right' });
    y += strong ? 9 : 7;
  };
  summaryRow('Subtotal', money(order.subtotal));
  if (Number(order.discount) > 0) summaryRow('Discount', `- ${money(order.discount)}`);
  summaryRow('Total paid / due', money(order.total), true);

  const footerY = Math.min(Math.max(y + 15, 273), 284);
  pdf.setTextColor(128, 133, 142);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text('Thank you for choosing ROFIK GODI CENTRE.', 18, footerY);
  pdf.text(`${WORKSHOP_INFO.phone}  |  ${WORKSHOP_INFO.email}`, right, footerY, { align: 'right' });
  pdf.save(`invoice-${printable(order.order_number) || 'order'}.pdf`);
}
