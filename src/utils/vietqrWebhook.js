import { getData, saveData } from './storage';

/**
 * Handle Auto Bank Webhook (SePay / Cassette / Custom API)
 * Automatically matches transaction content "DON 1786157868439" with Order ID
 */
export const processBankWebhook = (payload) => {
  const data = getData();
  const content = payload.transactionContent || payload.content || payload.addInfo || '';
  const amount = parseFloat(payload.amountIn || payload.amount || 0);

  // Extract order ID using pattern: DON 12345 or DH 12345 or #12345
  const match = content.match(/(?:DON|DH|ORDER|DONHANG)[s#:]*(d+)/i) || content.match(/#(d+)/);

  if (!match) {
    return { success: false, message: 'Khong tim thay Ma don hang trong noi dung chuyen khoan.' };
  }

  const orderId = match[1];
  const targetOrder = (data.orders || []).find(o => String(o.id) === String(orderId));

  if (!targetOrder) {
    return { success: false, message: `Khong tim thay don hang #${orderId} trong he thong.` };
  }

  const isAlreadyPaid = targetOrder.status === 'Da thanh toan' || targetOrder.status === 'Đã thanh toán';

  // Update order status to Paid
  let updatedCustomers = [...(data.customers || [])];
  if (targetOrder.status === 'No' || targetOrder.status === 'Nợ') {
    if (targetOrder.customerId) {
      updatedCustomers = updatedCustomers.map(c =>
        String(c.id) === String(targetOrder.customerId)
          ? { ...c, debt: Math.max(0, (c.debt || 0) - targetOrder.sellPrice) }
          : c
      );
    }
  }

  const updatedOrders = data.orders.map(o =>
    String(o.id) === String(orderId)
      ? { ...o, status: 'Đã thanh toán', paidAt: new Date().toISOString(), bankRef: payload.referenceCode || payload.id }
      : o
  );

  const updatedData = { ...data, customers: updatedCustomers, orders: updatedOrders };
  saveData(updatedData);

  // Dispatch custom browser event for real-time notification
  const event = new CustomEvent('vietqr-payment-received', {
    detail: {
      orderId,
      amount,
      customerName: targetOrder.customerName,
      productName: targetOrder.productName,
      isAlreadyPaid
    }
  });
  window.dispatchEvent(event);

  return {
    success: true,
    orderId,
    amount,
    customerName: targetOrder.customerName,
    isAlreadyPaid,
    message: `Da tu dong xac nhan thanh toan cho don hang #${orderId}!`
  };
};
