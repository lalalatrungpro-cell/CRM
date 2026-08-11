import { getLocal, setLocal } from './dataService';

export function dateToPrefix(dateVal) {
  let d = null;
  if (!dateVal) d = new Date();
  else if (typeof dateVal === 'number') {
    d = new Date((dateVal - 25569) * 86400 * 1000);
  } else if (typeof dateVal === 'string') {
    const s = dateVal.trim();
    if (s.includes('-') && s.split('-')[0].length === 4) {
      d = new Date(s);
    } else if (s.includes('/')) {
      const p = s.split('/');
      if (p.length === 3) {
        const yr = p[2].length === 4 ? p[2] : '20' + p[2];
        d = new Date(`${yr}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`);
      }
    }
  }
  if (!d || isNaN(d.getTime())) d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

function isAlreadyNewFormat(id, prefix) {
  const idStr = String(id);
  return idStr.startsWith(prefix) && idStr.length <= prefix.length + 5;
}

export function convertAllOldOrderIds() {
  const localOrders = getLocal('orders') || [];
  if (localOrders.length === 0) return { totalConverted: 0, idMap: {} };

  const sorted = [...localOrders].sort((a, b) => {
    const dA = new Date(a.purchase_date || a.purchaseDate || a.created_at || 0);
    const dB = new Date(b.purchase_date || b.purchaseDate || b.created_at || 0);
    return dA - dB;
  });

  const dailySeq = {};
  const idMap = {};
  const updatedLocalOrders = [];

  for (const o of sorted) {
    const pDate = o.purchase_date || o.purchaseDate || o.created_at;
    const prefix = dateToPrefix(pDate);
    dailySeq[prefix] = (dailySeq[prefix] || 0) + 1;
    const newId = `${prefix}${dailySeq[prefix]}`;
    idMap[String(o.id)] = newId;
    updatedLocalOrders.push({ ...o, id: newId });
  }

  updatedLocalOrders.forEach(o => {
    if (o.renewed_from && idMap[String(o.renewed_from)]) o.renewed_from = idMap[String(o.renewed_from)];
    if (o.renewedFrom && idMap[String(o.renewedFrom)]) o.renewedFrom = idMap[String(o.renewedFrom)];
  });

  setLocal('orders', updatedLocalOrders);

  const localCash = getLocal('cash_transactions') || [];
  setLocal('cash_transactions', localCash.map(c => {
    if (c.reference_type === 'ORDER' && c.reference_id && idMap[String(c.reference_id)]) {
      return { ...c, reference_id: String(idMap[String(c.reference_id)]) };
    }
    return c;
  }));

  const localWarranty = getLocal('warranty_logs') || [];
  setLocal('warranty_logs', localWarranty.map(w => {
    if (w.order_id && idMap[String(w.order_id)]) return { ...w, order_id: idMap[String(w.order_id)] };
    return w;
  }));

  return { totalConverted: updatedLocalOrders.length, idMap };
}

export function convertAllOldCustomerIds() {
  const localCustomers = getLocal('customers') || [];
  if (localCustomers.length === 0) return { totalConverted: 0, idMap: {} };

  const sorted = [...localCustomers].sort((a, b) => {
    return new Date(a.created_at || 0) - new Date(b.created_at || 0);
  });

  const dailySeq = {};
  const idMap = {};
  const updated = [];

  for (const c of sorted) {
    const prefix = 'KH' + dateToPrefix(c.created_at || c.purchase_date);
    dailySeq[prefix] = (dailySeq[prefix] || 0) + 1;
    const newId = `${prefix}${dailySeq[prefix]}`;
    idMap[String(c.id)] = newId;
    updated.push({ ...c, id: newId });
  }

  setLocal('customers', updated);

  // Update customer_id in orders
  const localOrders = getLocal('orders') || [];
  setLocal('orders', localOrders.map(o => {
    const cid = o.customer_id || o.customerId;
    if (cid && idMap[String(cid)]) return { ...o, customer_id: idMap[String(cid)], customerId: idMap[String(cid)] };
    return o;
  }));

  return { totalConverted: updated.length, idMap };
}