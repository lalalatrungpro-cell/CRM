import { supabase } from './supabaseClient';

// Helper for safe localStorage fallback
export const getLocal = (key, defaultVal = []) => {
  try {
    const d = localStorage.getItem('crm_demo_' + key);
    return d ? JSON.parse(d) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
};

export const setLocal = (key, val) => {
  try {
    localStorage.setItem('crm_demo_' + key, JSON.stringify(val));
  } catch (e) {}
};

// Seed initial demo data for smooth offline experience
const seedDemoData = () => {
  if (!localStorage.getItem('crm_demo_seeded')) {
    setLocal('customers', [
      { id: 1, name: 'Nguyễn Văn A', phone: '0901234567', email: 'vana@gmail.com', type: 'Le', source: 'Facebook Page', debt: 0, notes: 'Khách hay mua Canva' },
      { id: 2, name: 'Trần Thị B', phone: '0987654321', email: 'thib@gmail.com', type: 'CTV', source: 'Zalo', debt: 220000, notes: 'Đại lý CTV chiết khấu' },
      { id: 3, name: 'Đại lý C', phone: '0911222333', email: 'dailyc@gmail.com', type: 'Si', source: 'Giới Thiệu', debt: 5000000, notes: 'Khách sỉ lớn' }
    ]);

    setLocal('products', [
      { id: 1, name: 'Canva Pro (1 năm)', category: 'Design', default_duration_days: 365, default_sell: 150000, price_ctv: 110000, price_si: 80000, default_cost: 45000 },
      { id: 2, name: 'Google AI Pro (Gemini Advanced 1 năm)', category: 'AI', default_duration_days: 365, default_sell: 220000, price_ctv: 170000, price_si: 135000, default_cost: 95000 },
      { id: 3, name: 'Netflix Premium (1 tháng)', category: 'Entertainment', default_duration_days: 30, default_sell: 90000, price_ctv: 75000, price_si: 60000, default_cost: 40000 },
      { id: 4, name: 'ChatGPT Plus (1 tháng)', category: 'AI', default_duration_days: 30, default_sell: 250000, price_ctv: 210000, price_si: 180000, default_cost: 150000 }
    ]);

    setLocal('orders', [
      { id: 1, customer_id: 1, customer_name: 'Nguyễn Văn A', phone: '0901234567', product_name: 'Canva Pro (1 năm)', sell_price: 150000, cost_price: 50000, status: 'Đã thanh toán', infor: 'canva.user1@gmail.com | pass123', purchase_date: '2026-08-01', expire_date: '2027-08-01', channel: 'Facebook Page' },
      { id: 2, customer_id: 2, customer_name: 'Trần Thị B', phone: '0987654321', product_name: 'Google AI Pro (Gemini Advanced 1 năm)', sell_price: 220000, cost_price: 100000, status: 'Đã thanh toán', infor: 'gemini.vip2@gmail.com | pass888', purchase_date: '2026-08-05', expire_date: '2027-08-05', channel: 'Zalo' }
    ]);

    setLocal('suppliers', [
      { id: 1, name: 'Kho Nguồn Sỉ VIP 01', phone: '0933444555', notes: 'Chuyên cung cấp Canva & Google AI', debt: 0 },
      { id: 2, name: 'Nguồn Sỉ Netflix Việt Nam', phone: '0977888999', notes: 'Chuyên slot Netflix 4K', debt: 0 }
    ]);

    setLocal('teams', [
      { id: 1, name: 'Team Canva Pro VIP #01', category: 'Design', max_slots: 500, created_at: new Date().toISOString() },
      { id: 2, name: 'Team Gemini Advanced #02', category: 'AI', max_slots: 100, created_at: new Date().toISOString() }
    ]);

    setLocal('channels', [
      { id: 1, main_channel: 'Facebook Page', sub_channel_name: 'Page Canva Sỉ #01' },
      { id: 2, main_channel: 'Zalo', sub_channel_name: 'Zalo Hotline CSKH 02' }
    ]);

    setLocal('vietqr', {
      bank_id: 'MB',
      account_no: '0901234567',
      account_name: 'SHOP DROPSHIP CRM',
      memo_prefix: 'DON',
      template: 'compact2'
    });

    
    setLocal('supplier_prices', [
      { id: 1, supplier_id: 1, product_name: 'Canva Pro (1 năm)', price: 45000, price_date: new Date().toISOString().split('T')[0], notes: 'Giảm giá sỉ 10%' },
      { id: 2, supplier_id: 2, product_name: 'Canva Pro (1 năm)', price: 55000, price_date: new Date().toISOString().split('T')[0], notes: 'Giá gốc' },
      { id: 3, supplier_id: 1, product_name: 'Google AI Pro (Gemini Advanced 1 năm)', price: 95000, price_date: new Date().toISOString().split('T')[0], notes: 'Khuyến mãi tuần này' },
      { id: 4, supplier_id: 2, product_name: 'Google AI Pro (Gemini Advanced 1 năm)', price: 110000, price_date: new Date().toISOString().split('T')[0], notes: 'Bảo hành 12 tháng' }
    ]);

    
    setLocal('supplier_catalog', [
      { id: 1, supplier_id: 1, product_name: 'Canva Pro (1 năm)', wholesale_price: 45000, warranty_policy: 'FULL_WARRANTY', product_description: 'Mail chính chủ, kích hoạt qua link invite, dùng 5 thiết bị' },
      { id: 2, supplier_id: 1, product_name: 'Google AI Pro (Gemini Advanced 1 năm)', wholesale_price: 95000, warranty_policy: 'FULL_WARRANTY', product_description: 'Nâng cấp mail chính chủ, bảo hành 12 tháng' },
      { id: 3, supplier_id: 2, product_name: 'Netflix Premium (1 tháng)', wholesale_price: 55000, warranty_policy: 'SEVEN_DAYS', product_description: 'Acc dùng chung slot 5 người, bảo hành 7 ngày đầu' }
    ]);

    setLocal('purchases', [
      { id: 1, supplier_id: 1, supplier_name: 'Kho Nguồn Sỉ VIP 01', team_id: 1, product_name: 'Canva Pro (1 năm)', import_cost: 2000000, quantity: 49, unit_cost: 40816, payment_status: 'PAID', payment_date: '2026-08-01', purchase_date: '2026-08-01', notes: 'Mua kho Team Canva Pro Edu 49 slots' },
      { id: 2, supplier_id: 2, supplier_name: 'Nguồn Sỉ Netflix Việt Nam', team_id: 2, product_name: 'Google AI Pro (Gemini Advanced 1 năm)', import_cost: 4500000, quantity: 50, unit_cost: 90000, payment_status: 'PAID', payment_date: '2026-08-05', purchase_date: '2026-08-05', notes: 'Nhập lô 50 slot Gemini' }
    ]);

    setLocal('cash_transactions', [
      { id: 1, type: 'INCOME', category: 'Bán hàng', amount: 150000, account_type: 'BANK', reference_type: 'ORDER', reference_id: '1', counterpart_name: 'Nguyễn Văn A', notes: 'Thu tiền đơn Canva #1', transaction_date: '2026-08-01' },
      { id: 2, type: 'INCOME', category: 'Bán hàng', amount: 220000, account_type: 'BANK', reference_type: 'ORDER', reference_id: '2', counterpart_name: 'Trần Thị B', notes: 'Thu tiền đơn Gemini #2', transaction_date: '2026-08-05' },
      { id: 3, type: 'EXPENSE', category: 'Nhập hàng', amount: 2000000, account_type: 'BANK', reference_type: 'PURCHASE', reference_id: '1', counterpart_name: 'Kho Nguồn Sỉ VIP 01', notes: 'Thanh toán mua Team Canva 49 slots', transaction_date: '2026-08-01' },
      { id: 4, type: 'EXPENSE', category: 'Marketing/Ads', amount: 1200000, account_type: 'BANK', reference_type: 'EXPENSE', reference_id: '1', counterpart_name: 'Facebook Ads', notes: 'Chạy camp quảng cáo Page Canva tuần 1', transaction_date: '2026-08-03' },
      { id: 5, type: 'EXPENSE', category: 'Tool/VPS', amount: 450000, account_type: 'BANK', reference_type: 'EXPENSE', reference_id: '2', counterpart_name: 'Nhà cung cấp VPS', notes: 'Tiền server nuôi bot tự động', transaction_date: '2026-08-04' },
      { id: 6, type: 'EXPENSE', category: 'Lương nhân viên', amount: 5500000, account_type: 'BANK', reference_type: 'PAYROLL', reference_id: '1', counterpart_name: 'Nguyễn Văn Hùng (Sale)', notes: 'Chi trả lương & hoa hồng tháng 7', transaction_date: '2026-08-05' }
    ]);

    setLocal('expenses', [
      { id: 1, name: 'Chi phí Facebook Ads tuần 1', expense_type: 'VARIABLE', category: 'Marketing/Ads', amount: 1200000, recurrence: 'ONE_TIME', expense_date: '2026-08-03', notes: 'Chạy camp Page Canva', is_paid: true },
      { id: 2, name: 'Thuê Server VPS & Proxies nuôi Bot', expense_type: 'FIXED', category: 'Tool/VPS', amount: 450000, recurrence: 'MONTHLY', expense_date: '2026-08-04', notes: 'Gia hạn server', is_paid: true },
      { id: 3, name: 'Tiền thuê văn phòng / mặt bằng', expense_type: 'FIXED', category: 'Mặt bằng', amount: 4000000, recurrence: 'MONTHLY', expense_date: '2026-08-01', notes: 'Văn phòng chi nhánh HCM', is_paid: true },
      { id: 4, name: 'Internet & Điện nước văn phòng', expense_type: 'FIXED', category: 'Điện nước/Internet', amount: 350000, recurrence: 'MONTHLY', expense_date: '2026-08-05', notes: 'Cáp quang Viettel', is_paid: true }
    ]);

    setLocal('staff_members', [
      { id: 1, full_name: 'Nguyễn Văn Hùng', phone: '0912345678', role: 'Sale', base_salary: 5000000, commission_type: 'PERCENT', commission_rate: 5, commission_fixed: 0, status: 'ACTIVE', joined_date: '2026-01-15' },
      { id: 2, full_name: 'Trần Thị Mai', phone: '0988776655', role: 'CSKH', base_salary: 5500000, commission_type: 'FIXED_PER_ORDER', commission_rate: 0, commission_fixed: 3000, status: 'ACTIVE', joined_date: '2026-03-01' }
    ]);

    setLocal('payroll_records', [
      { id: 1, staff_id: 1, staff_name: 'Nguyễn Văn Hùng', month_period: '2026-08', base_salary: 5000000, orders_count: 32, revenue_generated: 7800000, commission_amount: 390000, bonus_kpi: 500000, advance_deduction: 0, net_salary: 5890000, status: 'DRAFT', paid_date: null },
      { id: 2, staff_id: 2, staff_name: 'Trần Thị Mai', month_period: '2026-08', base_salary: 5500000, orders_count: 45, revenue_generated: 9500000, commission_amount: 135000, bonus_kpi: 300000, advance_deduction: 0, net_salary: 5935000, status: 'DRAFT', paid_date: null }
    ]);

    setLocal('inventory_items', [
      { id: 1, product_name: 'ChatGPT Plus (1 tháng)', category: 'AI', asset_type: 'ACCOUNT', item_code: 'chatgpt.vip01@gmail.com | PassSecure888', cost_price: 150000, supplier_id: 1, supplier_name: 'Kho Nguồn Sỉ VIP 01', status: 'AVAILABLE', import_date: '2026-08-01', expire_date: '2026-09-01', notes: 'Nhập lô đầu tháng' },
      { id: 2, product_name: 'ChatGPT Plus (1 tháng)', category: 'AI', asset_type: 'ACCOUNT', item_code: 'chatgpt.vip02@gmail.com | PassSecure999', cost_price: 150000, supplier_id: 1, supplier_name: 'Kho Nguồn Sỉ VIP 01', status: 'AVAILABLE', import_date: '2026-08-01', expire_date: '2026-09-01', notes: 'Nhập lô đầu tháng' },
      { id: 3, product_name: 'ChatGPT Plus (1 tháng)', category: 'AI', asset_type: 'ACCOUNT', item_code: 'chatgpt.vip03@gmail.com | PassSecure111', cost_price: 150000, supplier_id: 1, supplier_name: 'Kho Nguồn Sỉ VIP 01', status: 'AVAILABLE', import_date: '2026-08-02', expire_date: '2026-09-02', notes: 'Lô phụ' },
      { id: 4, product_name: 'ChatGPT Plus (1 tháng)', category: 'AI', asset_type: 'ACCOUNT', item_code: 'chatgpt.sold04@gmail.com | PassSold444', cost_price: 150000, supplier_id: 1, supplier_name: 'Kho Nguồn Sỉ VIP 01', status: 'SOLD', order_id: 1, customer_name: 'Nguyễn Văn A', import_date: '2026-08-01', sold_date: '2026-08-01', notes: 'Đã xuất bán POS' },
      { id: 5, product_name: 'ChatGPT Plus (1 tháng)', category: 'AI', asset_type: 'ACCOUNT', item_code: 'chatgpt.error05@gmail.com | PassErr555', cost_price: 150000, supplier_id: 1, supplier_name: 'Kho Nguồn Sỉ VIP 01', status: 'FAULTY', faulty_reason: 'Bị khóa pass sau 2 ngày dùng', supplier_claim_status: 'PENDING_CLAIM', import_date: '2026-08-01', notes: 'Chờ NCC đổi key' },
      { id: 6, product_name: 'Canva Pro (1 năm)', category: 'Design', asset_type: 'INVITE_LINK', item_code: 'https://canva.com/brand/join?token=INVITE_CANVA_VIP_777', cost_price: 40000, supplier_id: 1, supplier_name: 'Kho Nguồn Sỉ VIP 01', status: 'AVAILABLE', import_date: '2026-08-03', expire_date: '2027-08-03', notes: 'Link invite chính chủ' },
      { id: 7, product_name: 'Canva Pro (1 năm)', category: 'Design', asset_type: 'INVITE_LINK', item_code: 'https://canva.com/brand/join?token=INVITE_CANVA_VIP_888', cost_price: 40000, supplier_id: 1, supplier_name: 'Kho Nguồn Sỉ VIP 01', status: 'AVAILABLE', import_date: '2026-08-03', expire_date: '2027-08-03', notes: 'Link invite chính chủ' },
      { id: 8, product_name: 'Google AI Pro (Gemini Advanced 1 năm)', category: 'AI', asset_type: 'ACCOUNT', item_code: 'gemini.vip101@gmail.com | AiPass2026', cost_price: 90000, supplier_id: 1, supplier_name: 'Kho Nguồn Sỉ VIP 01', status: 'AVAILABLE', import_date: '2026-08-04', expire_date: '2027-08-04', notes: 'Tài khoản nâng cấp sẵn' },
      { id: 9, product_name: 'Google AI Pro (Gemini Advanced 1 năm)', category: 'AI', asset_type: 'ACCOUNT', item_code: 'gemini.vip102@gmail.com | AiPass2026', cost_price: 90000, supplier_id: 1, supplier_name: 'Kho Nguồn Sỉ VIP 01', status: 'AVAILABLE', import_date: '2026-08-04', expire_date: '2027-08-04', notes: 'Tài khoản nâng cấp sẵn' },
      { id: 10, product_name: 'Netflix Premium (1 tháng)', category: 'Entertainment', asset_type: 'ACCOUNT', item_code: 'netflix.vip55@gmail.com | NetPass99 | Profile 3 PIN 1234', cost_price: 50000, supplier_id: 2, supplier_name: 'Nguồn Sỉ Netflix Việt Nam', status: 'AVAILABLE', import_date: '2026-08-05', expire_date: '2026-09-05', notes: 'Slot 4K Ultra HD' }
    ]);

    setLocal('inventory_logs', [
      { id: 1, inventory_item_id: 1, action_type: 'IMPORT', product_name: 'ChatGPT Plus (1 tháng)', quantity: 1, unit_cost: 150000, notes: 'Nhập kho ban đầu', created_at: new Date().toISOString() },
      { id: 2, inventory_item_id: 4, action_type: 'EXPORT_POS', product_name: 'ChatGPT Plus (1 tháng)', quantity: 1, unit_cost: 150000, reference_id: '1', notes: 'Xuất bán đơn hàng #1', created_at: new Date().toISOString() }
    ]);

    localStorage.setItem('crm_demo_seeded', 'true');
  }
};

seedDemoData();

export const clearAllSystemData = () => {
  const keysToClear = [
    'customers',
    'orders',
    'teams',
    'purchases',
    'cash_transactions',
    'expenses',
    'warranty_logs',
    'inventory_items',
    'inventory_logs',
    'care_logs',
    'supplier_prices'
  ];

  keysToClear.forEach(key => {
    setLocal(key, []);
  });

  localStorage.setItem('crm_demo_seeded', 'true');
};

// Combine Supabase data with Local Storage data cleanly
const mergeData = (supaList, localKey) => {
  const localList = getLocal(localKey);
  if (!supaList || supaList.length === 0) return localList;
  
  // Merge by id
  const map = new Map();
  localList.forEach(item => map.set(String(item.id), item));
  supaList.forEach(item => map.set(String(item.id), item));
  
  return Array.from(map.values()).sort((a, b) => (b.id - a.id));
};

// ==================== CUSTOMERS ====================
export const CustomerService = {
  async list(shopId) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const merged = mergeData(data || [], 'customers');
      setLocal('customers', merged);
      return merged;
    } catch (err) {
      return getLocal('customers');
    }
  },

  async create(shopId, payload) {
    const current = getLocal('customers');
    const customId = payload.id || generateDailyCustomerId(current);
    const newObj = { ...payload, id: customId, shop_id: shopId, created_at: new Date().toISOString() };
    setLocal('customers', [newObj, ...current]);

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({ ...payload, id: customId, shop_id: shopId })
        .select()
        .single();
      if (!error && data) {
        const currentRefreshed = getLocal('customers').map(c => String(c.id) === String(customId) ? data : c);
        setLocal('customers', currentRefreshed);
        return data;
      }
    } catch (err) {}
    return newObj;
  },

  async update(id, payload) {
    const current = getLocal('customers');
    let updatedObj = null;
    const updatedList = current.map(c => {
      if (String(c.id) === String(id)) {
        updatedObj = { ...c, ...payload };
        return updatedObj;
      }
      return c;
    });
    setLocal('customers', updatedList);

    try {
      const { data, error } = await supabase
        .from('customers')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data;
    } catch (err) {}
    return updatedObj || { id, ...payload };
  },

  async remove(id) {
    const current = getLocal('customers');
    setLocal('customers', current.filter(c => String(c.id) !== String(id)));
    try {
      await supabase.from('customers').delete().eq('id', id);
    } catch (err) {}
  }
};

// ==================== PRODUCTS ====================
export const ProductService = {
  async list(shopId) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const merged = mergeData(data || [], 'products');
      setLocal('products', merged);
      return merged;
    } catch (err) {
      return getLocal('products');
    }
  },

  async create(shopId, payload) {
    const newObj = { ...payload, id: Date.now(), shop_id: shopId, created_at: new Date().toISOString() };
    const current = getLocal('products');
    setLocal('products', [newObj, ...current]);

    try {
      const { data, error } = await supabase
        .from('products')
        .insert({ ...payload, shop_id: shopId })
        .select()
        .single();
      if (!error && data) {
        const refreshed = getLocal('products').map(p => String(p.id) === String(newObj.id) ? data : p);
        setLocal('products', refreshed);
        return data;
      }
    } catch (err) {}
    return newObj;
  },

  async update(id, payload) {
    const current = getLocal('products');
    let updatedObj = null;
    const updatedList = current.map(p => {
      if (String(p.id) === String(id)) {
        updatedObj = { ...p, ...payload };
        return updatedObj;
      }
      return p;
    });
    setLocal('products', updatedList);

    try {
      const { data, error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data;
    } catch (err) {}
    return updatedObj || { id, ...payload };
  },

  async remove(id) {
    const current = getLocal('products');
    setLocal('products', current.filter(p => String(p.id) !== String(id)));
    try {
      await supabase.from('products').delete().eq('id', id);
    } catch (err) {}
  }
};

export function generateDailyOrderId(currentOrders = []) {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${yy}${mm}${dd}`;

  let maxSeq = 0;
  (currentOrders || []).forEach(o => {
    const idStr = String(o.id || '');
    if (idStr.startsWith(datePrefix)) {
      const seqStr = idStr.slice(datePrefix.length);
      const seqNum = parseInt(seqStr, 10);
      if (!isNaN(seqNum) && seqNum > maxSeq) {
        maxSeq = seqNum;
      }
    }
  });

  const nextSeq = maxSeq + 1;
  return `${datePrefix}${nextSeq}`;
}

// ==================== ORDERS ====================
export const OrderService = {
  async list(shopId) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const merged = mergeData(data || [], 'orders');
      setLocal('orders', merged);
      return merged;
    } catch (err) {
      return getLocal('orders');
    }
  },

  async create(shopId, payload) {
    // Standardize object fields
    const formattedPayload = {
      customer_id: payload.customer_id || payload.customerId,
      customer_name: payload.customer_name || payload.customerName,
      phone: payload.phone || '',
      product_name: payload.product_name || payload.productName,
      supplier_id: payload.supplier_id || payload.supplierId,
      team_id: payload.team_id || payload.teamId,
      infor: payload.infor || '',
      sell_price: payload.sell_price || payload.sellPrice || 0,
      cost_price: payload.cost_price || payload.costPrice || 0,
      status: payload.status || 'Đã thanh toán',
      purchase_date: payload.purchase_date || payload.purchaseDate || new Date().toISOString().split('T')[0],
      expire_date: payload.expire_date || payload.expireDate || new Date().toISOString().split('T')[0],
      channel: payload.channel || payload.source || 'Facebook Page'
    };

    const current = getLocal('orders');
    const customId = payload.id || generateDailyOrderId(current);
    const newObj = { ...formattedPayload, id: customId, shop_id: shopId, created_at: new Date().toISOString() };
    setLocal('orders', [newObj, ...current]);

    // Auto-accounting in CashTransactionService
    if (newObj.status === 'Đã thanh toán' && Number(newObj.sell_price) > 0) {
      try {
        CashTransactionService.create(shopId, {
          type: 'INCOME',
          category: 'Bán hàng',
          amount: Number(newObj.sell_price),
          account_type: 'BANK',
          reference_type: 'ORDER',
          reference_id: String(newObj.id),
          counterpart_name: newObj.customer_name || 'Khách Hàng',
          notes: `Thu tiền đơn hàng "${newObj.product_name}"`
        });
      } catch (e) {}
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .insert({ id: customId, ...formattedPayload, shop_id: shopId })
        .select()
        .single();
      if (!error && data) {
        const refreshed = getLocal('orders').map(o => String(o.id) === String(newObj.id) ? data : o);
        setLocal('orders', refreshed);
        return data;
      }
    } catch (err) {}
    return newObj;
  },

  async update(id, payload) {
    const current = getLocal('orders');
    let updatedObj = null;
    const updatedList = current.map(o => {
      if (String(o.id) === String(id)) {
        updatedObj = { ...o, ...payload };
        return updatedObj;
      }
      return o;
    });
    setLocal('orders', updatedList);

    try {
      const { data, error } = await supabase
        .from('orders')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data;
    } catch (err) {}
    return updatedObj || { id, ...payload };
  },

  async remove(id) {
    const current = getLocal('orders');
    setLocal('orders', current.filter(o => String(o.id) !== String(id)));
    try {
      await supabase.from('orders').delete().eq('id', id);
    } catch (err) {}
  }
};

// ==================== SUPPLIERS ====================
export const SupplierService = {
  async list(shopId) {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const merged = mergeData(data || [], 'suppliers');
      setLocal('suppliers', merged);
      return merged;
    } catch (err) {
      return getLocal('suppliers');
    }
  },

  async create(shopId, payload) {
    const newObj = { ...payload, id: Date.now(), shop_id: shopId, created_at: new Date().toISOString() };
    const current = getLocal('suppliers');
    setLocal('suppliers', [newObj, ...current]);

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({ ...payload, shop_id: shopId })
        .select()
        .single();
      if (!error && data) {
        const refreshed = getLocal('suppliers').map(s => String(s.id) === String(newObj.id) ? data : s);
        setLocal('suppliers', refreshed);
        return data;
      }
    } catch (err) {}
    return newObj;
  },

  async update(id, payload) {
    const current = getLocal('suppliers');
    let updatedObj = null;
    const updatedList = current.map(s => {
      if (String(s.id) === String(id)) {
        updatedObj = { ...s, ...payload };
        return updatedObj;
      }
      return s;
    });
    setLocal('suppliers', updatedList);

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data;
    } catch (err) {}
    return updatedObj || { id, ...payload };
  },

  async remove(id) {
    const current = getLocal('suppliers');
    setLocal('suppliers', current.filter(s => String(s.id) !== String(id)));
    try {
      await supabase.from('suppliers').delete().eq('id', id);
    } catch (err) {}
  }
};

// ==================== TEAMS ====================
export const TeamService = {
  async list(shopId) {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const merged = mergeData(data || [], 'teams');
      setLocal('teams', merged);
      return merged;
    } catch (err) {
      return getLocal('teams');
    }
  },

  async create(shopId, payload) {
    const newObj = { ...payload, id: Date.now(), shop_id: shopId, created_at: new Date().toISOString() };
    const current = getLocal('teams');
    setLocal('teams', [newObj, ...current]);

    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({ ...payload, shop_id: shopId })
        .select()
        .single();
      if (!error && data) {
        const refreshed = getLocal('teams').map(t => String(t.id) === String(newObj.id) ? data : t);
        setLocal('teams', refreshed);
        return data;
      }
    } catch (err) {}
    return newObj;
  },

  async update(id, payload) {
    const current = getLocal('teams');
    let updatedObj = null;
    const updatedList = current.map(t => {
      if (String(t.id) === String(id)) {
        updatedObj = { ...t, ...payload };
        return updatedObj;
      }
      return t;
    });
    setLocal('teams', updatedList);

    try {
      const { data, error } = await supabase
        .from('teams')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data;
    } catch (err) {}
    return updatedObj || { id, ...payload };
  },

  async remove(id) {
    const current = getLocal('teams');
    setLocal('teams', current.filter(t => String(t.id) !== String(id)));
    try {
      await supabase.from('teams').delete().eq('id', id);
    } catch (err) {}
  }
};

// ==================== CARE LOGS ====================
export const CareLogService = {
  async list(shopId, customerId) {
    try {
      let query = supabase.from('care_logs').select('*').eq('shop_id', shopId);
      if (customerId) query = query.eq('customer_id', customerId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      const merged = mergeData(data || [], 'care_logs');
      setLocal('care_logs', merged);
      if (customerId) return merged.filter(c => String(c.customer_id) === String(customerId));
      return merged;
    } catch (err) {
      const current = getLocal('care_logs');
      if (customerId) return current.filter(c => String(c.customer_id) === String(customerId));
      return current;
    }
  },

  async create(shopId, payload) {
    const newObj = { ...payload, id: Date.now(), shop_id: shopId, created_at: new Date().toISOString() };
    const current = getLocal('care_logs');
    setLocal('care_logs', [newObj, ...current]);

    try {
      const { data, error } = await supabase
        .from('care_logs')
        .insert({ ...payload, shop_id: shopId })
        .select()
        .single();
      if (!error && data) return data;
    } catch (err) {}
    return newObj;
  },

  async remove(id) {
    const current = getLocal('care_logs');
    setLocal('care_logs', current.filter(c => String(c.id) !== String(id)));
    try {
      await supabase.from('care_logs').delete().eq('id', id);
    } catch (err) {}
  }
};

// ==================== WARRANTY LOGS ====================
export const WarrantyLogService = {
  async listByOrder(shopId, orderId) {
    try {
      const all = await this.listByShop(shopId);
      return all.filter(w => String(w.order_id || w.orderId) === String(orderId));
    } catch (err) {
      return [];
    }
  },

  async listByShop(shopId) {
    try {
      const { data, error } = await supabase
        .from('warranty_logs')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const merged = mergeData(data || [], 'warranty_logs');
      setLocal('warranty_logs', merged);
      return merged;
    } catch (err) {
      return getLocal('warranty_logs');
    }
  },

  async create(shopId, payload) {
    const newObj = { ...payload, id: Date.now(), shop_id: shopId, created_at: new Date().toISOString() };
    const current = getLocal('warranty_logs');
    setLocal('warranty_logs', [newObj, ...current]);

    try {
      const { data, error } = await supabase
        .from('warranty_logs')
        .insert({ ...payload, shop_id: shopId })
        .select()
        .single();
      if (!error && data) return data;
    } catch (err) {}
    return newObj;
  }
};

// ==================== CHANNELS ====================
export const ChannelService = {
  async list(shopId) {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const merged = mergeData(data || [], 'channels');
      setLocal('channels', merged);
      return merged;
    } catch (err) {
      return getLocal('channels');
    }
  },

  async create(shopId, payload) {
    const newObj = { ...payload, id: Date.now(), shop_id: shopId, created_at: new Date().toISOString() };
    const current = getLocal('channels');
    setLocal('channels', [newObj, ...current]);

    try {
      const { data, error } = await supabase
        .from('channels')
        .insert({ ...payload, shop_id: shopId })
        .select()
        .single();
      if (!error && data) return data;
    } catch (err) {}
    return newObj;
  },

  async remove(id) {
    const current = getLocal('channels');
    setLocal('channels', current.filter(c => String(c.id) !== String(id)));
    try {
      await supabase.from('channels').delete().eq('id', id);
    } catch (err) {}
  }
};

// ==================== VIETQR ====================
export const VietQRService = {
  async get(shopId) {
    try {
      const { data, error } = await supabase
        .from('vietqr_settings')
        .select('*')
        .eq('shop_id', shopId)
        .maybeSingle();
      if (error) throw error;
      return data || getLocal('vietqr');
    } catch (err) {
      return getLocal('vietqr');
    }
  },

  async save(shopId, payload) {
    setLocal('vietqr', payload);
    try {
      const existing = await this.get(shopId);
      if (existing && existing.id) {
        const { data, error } = await supabase
          .from('vietqr_settings')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        if (!error && data) return data;
      } else {
        const { data, error } = await supabase
          .from('vietqr_settings')
          .insert({ ...payload, shop_id: shopId })
          .select()
          .single();
        if (!error && data) return data;
      }
    } catch (err) {}
    return payload;
  }
};



// ==================== SUPPLIER PRICES ====================
export const SupplierPriceService = {
  async listByShop(shopId) {
    try {
      const { data, error } = await supabase
        .from('supplier_prices')
        .select('*')
        .eq('shop_id', shopId)
        .order('price_date', { ascending: false });
      if (error) throw error;
      const merged = mergeData(data || [], 'supplier_prices');
      setLocal('supplier_prices', merged);
      return merged;
    } catch (err) {
      return getLocal('supplier_prices');
    }
  },

  async listBySupplier(shopId, supplierId) {
    try {
      const all = await this.listByShop(shopId);
      return all.filter(p => String(p.supplier_id || p.supplierId) === String(supplierId));
    } catch (err) {
      return [];
    }
  },

  async listTodayPrices(shopId) {
    const todayStr = new Date().toISOString().split('T')[0];
    try {
      const all = await this.listByShop(shopId);
      // Fallback to most recent price if no today entry
      const todayList = all.filter(p => p.price_date === todayStr);
      return todayList.length > 0 ? todayList : all;
    } catch (err) {
      return [];
    }
  },

  async saveDailyPrice(shopId, payload) {
    const todayStr = payload.price_date || new Date().toISOString().split('T')[0];
    const newObj = {
      id: Date.now(),
      shop_id: shopId,
      supplier_id: payload.supplier_id || payload.supplierId,
      product_name: payload.product_name || payload.productName,
      price: Number(payload.price || 0),
      price_date: todayStr,
      notes: payload.notes || '',
      created_at: new Date().toISOString()
    };

    const current = getLocal('supplier_prices');
    setLocal('supplier_prices', [newObj, ...current]);

    // Optional 1-click sync to product default_cost
    if (payload.syncToProduct) {
      await this.syncDailyPriceToProductCost(shopId, newObj.product_name, newObj.price);
    }

    try {
      const { data, error } = await supabase
        .from('supplier_prices')
        .insert({
          shop_id: shopId,
          supplier_id: newObj.supplier_id,
          product_name: newObj.product_name,
          price: newObj.price,
          price_date: newObj.price_date,
          notes: newObj.notes
        })
        .select()
        .single();
      if (!error && data) return data;
    } catch (err) {}
    return newObj;
  },

  async syncDailyPriceToProductCost(shopId, productName, newCost) {
    if (!productName || newCost <= 0) return;
    try {
      const prods = await ProductService.list(shopId);
      const target = prods.find(p => p.name === productName);
      if (target) {
        await ProductService.update(target.id, { default_cost: Number(newCost) });
      }
    } catch (err) {
      console.error('Error syncing product cost:', err);
    }
  },

  async getLowestPriceSupplier(shopId, productName, suppliersList = []) {
    try {
      const all = await this.listTodayPrices(shopId);
      const prodPrices = all.filter(p => (p.product_name || p.productName) === productName);
      if (prodPrices.length === 0) return null;

      prodPrices.sort((a, b) => Number(a.price) - Number(b.price));
      const lowest = prodPrices[0];
      const supp = suppliersList.find(s => String(s.id) === String(lowest.supplier_id || lowest.supplierId));

      return {
        supplier_id: lowest.supplier_id || lowest.supplierId,
        supplier_name: supp ? supp.name : ('Nguồn Sỉ #' + (lowest.supplier_id || lowest.supplierId)),
        price: Number(lowest.price),
        price_date: lowest.price_date,
        notes: lowest.notes || ''
      };
    } catch (err) {
      return null;
    }
  },

  async getPricingMatrix(shopId) {
    try {
      const [products, suppliers, allPrices] = await Promise.all([
        ProductService.list(shopId),
        SupplierService.list(shopId),
        this.listByShop(shopId)
      ]);

      const todayStr = new Date().toISOString().split('T')[0];

      return products.map(prod => {
        // Filter prices for this product
        const prodPrices = (allPrices || []).filter(p => (p.product_name || p.productName) === prod.name);
        
        // Find today's prices or fallback to latest available
        const todayProdPrices = prodPrices.filter(p => p.price_date === todayStr);
        const activePrices = todayProdPrices.length > 0 ? todayProdPrices : prodPrices;

        let bestSupplier = null;
        let lowestCost = Number(prod.default_cost || prod.defaultCost || 0);

        if (activePrices.length > 0) {
          const sorted = [...activePrices].sort((a, b) => Number(a.price) - Number(b.price));
          const best = sorted[0];
          const supp = suppliers.find(s => String(s.id) === String(best.supplier_id || best.supplierId));
          lowestCost = Number(best.price);
          bestSupplier = {
            id: best.supplier_id || best.supplierId,
            name: supp ? supp.name : ('Nguồn #' + (best.supplier_id || best.supplierId)),
            price: Number(best.price),
            price_date: best.price_date,
            isToday: best.price_date === todayStr,
            notes: best.notes || ''
          };
        }

        const price_le = Number(prod.default_sell || prod.defaultSell || 0);
        const price_ctv = Number(prod.price_ctv || prod.priceCtv || 0) > 0 ? Number(prod.price_ctv || prod.priceCtv) : price_le;
        const price_si = Number(prod.price_si || prod.priceSi || 0) > 0 ? Number(prod.price_si || prod.priceSi) : price_le;

        const profit_le = price_le - lowestCost;
        const margin_le = price_le > 0 ? Math.round((profit_le / price_le) * 100) : 0;

        const profit_ctv = price_ctv - lowestCost;
        const margin_ctv = price_ctv > 0 ? Math.round((profit_ctv / price_ctv) * 100) : 0;

        const profit_si = price_si - lowestCost;
        const margin_si = price_si > 0 ? Math.round((profit_si / price_si) * 100) : 0;

        // Alert calculation
        let alertLevel = 'SAFE'; // SAFE | WARNING | DANGER
        let alertMessage = 'Biên lãi an toàn';

        if (profit_si <= 0 || profit_ctv <= 0 || profit_le <= 0 || margin_si < 10) {
          alertLevel = 'DANGER';
          alertMessage = profit_si <= 0 ? 'Nguy cơ bán lỗ nhóm Sỉ!' : 'Biên lãi Sỉ quá mỏng (<10%)';
        } else if (margin_si < 20 || margin_ctv < 30) {
          alertLevel = 'WARNING';
          alertMessage = 'Biên lãi CTV/Sỉ cận biên (10-20%)';
        }

        return {
          product: prod,
          defaultCost: Number(prod.default_cost || prod.defaultCost || 0),
          lowestCost,
          bestSupplier,
          hasTodayPrice: bestSupplier?.isToday || false,
          price_le,
          price_ctv,
          price_si,
          profit_le,
          margin_le,
          profit_ctv,
          margin_ctv,
          profit_si,
          margin_si,
          alertLevel,
          alertMessage,
          allSupplierPrices: prodPrices.map(p => {
            const s = suppliers.find(sup => String(sup.id) === String(p.supplier_id || p.supplierId));
            return {
              supplierId: p.supplier_id || p.supplierId,
              supplierName: s ? s.name : ('Nguồn #' + (p.supplier_id || p.supplierId)),
              price: Number(p.price),
              priceDate: p.price_date,
              notes: p.notes
            };
          })
        };
      });
    } catch (err) {
      console.error('Error computing pricing matrix:', err);
      return [];
    }
  }
};


// ==================== SUPPLIER CATALOG ====================
export const SupplierCatalogService = {
  async listByShop(shopId) {
    try {
      const { data, error } = await supabase
        .from('supplier_catalog')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const merged = mergeData(data || [], 'supplier_catalog');
      setLocal('supplier_catalog', merged);
      return merged;
    } catch (err) {
      return getLocal('supplier_catalog');
    }
  },

  async listBySupplier(shopId, supplierId) {
    try {
      const all = await this.listByShop(shopId);
      return all.filter(c => String(c.supplier_id || c.supplierId) === String(supplierId));
    } catch (err) {
      return [];
    }
  },

  async saveCatalogItem(shopId, payload) {
    const newObj = {
      id: payload.id || Date.now(),
      shop_id: shopId,
      supplier_id: payload.supplier_id || payload.supplierId,
      product_name: payload.product_name || payload.productName,
      wholesale_price: Number(payload.wholesale_price || payload.wholesalePrice || 0),
      warranty_policy: payload.warranty_policy || payload.warrantyPolicy || 'FULL_WARRANTY',
      product_description: payload.product_description || payload.productDescription || '',
      created_at: new Date().toISOString()
    };

    const current = getLocal('supplier_catalog');
    const existingIdx = current.findIndex(c => String(c.id) === String(newObj.id));
    let updatedList = [];
    if (existingIdx >= 0) {
      current[existingIdx] = newObj;
      updatedList = [...current];
    } else {
      updatedList = [newObj, ...current];
    }
    setLocal('supplier_catalog', updatedList);

    try {
      const { data, error } = await supabase
        .from('supplier_catalog')
        .upsert({ ...newObj, shop_id: shopId })
        .select()
        .single();
      if (!error && data) return data;
    } catch (err) {}
    return newObj;
  },

  async deleteCatalogItem(id) {
    const current = getLocal('supplier_catalog');
    setLocal('supplier_catalog', current.filter(c => String(c.id) !== String(id)));
    try {
      await supabase.from('supplier_catalog').delete().eq('id', id);
    } catch (err) {}
  }
};

// ==================== CASH TRANSACTIONS (SỔ QUỸ THU / CHI) ====================
export const CashTransactionService = {
  async list(shopId) {
    try {
      const { data, error } = await supabase
        .from('cash_transactions')
        .select('*')
        .eq('shop_id', shopId)
        .order('transaction_date', { ascending: false });
      if (error) throw error;
      const merged = mergeData(data || [], 'cash_transactions');
      setLocal('cash_transactions', merged);
      return merged;
    } catch (err) {
      return getLocal('cash_transactions');
    }
  },

  async create(shopId, payload) {
    const newObj = {
      id: Date.now(),
      shop_id: shopId,
      type: payload.type, // 'INCOME' | 'EXPENSE'
      category: payload.category || 'Khác',
      amount: Number(payload.amount || 0),
      account_type: payload.account_type || payload.accountType || 'BANK',
      reference_type: payload.reference_type || payload.referenceType || '',
      reference_id: String(payload.reference_id || payload.referenceId || ''),
      counterpart_name: payload.counterpart_name || payload.counterpartName || '',
      notes: payload.notes || '',
      transaction_date: payload.transaction_date || payload.transactionDate || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };

    const current = getLocal('cash_transactions');
    setLocal('cash_transactions', [newObj, ...current]);

    try {
      const { data, error } = await supabase
        .from('cash_transactions')
        .insert({
          shop_id: shopId,
          type: newObj.type,
          category: newObj.category,
          amount: newObj.amount,
          account_type: newObj.account_type,
          reference_type: newObj.reference_type,
          reference_id: newObj.reference_id,
          counterpart_name: newObj.counterpart_name,
          notes: newObj.notes,
          transaction_date: newObj.transaction_date
        })
        .select()
        .single();
      if (!error && data) return data;
    } catch (err) {}
    return newObj;
  },

  async remove(id) {
    const current = getLocal('cash_transactions');
    setLocal('cash_transactions', current.filter(c => String(c.id) !== String(id)));
    try {
      await supabase.from('cash_transactions').delete().eq('id', id);
    } catch (err) {}
  },

  async getBalanceSummary(shopId) {
    const list = await this.list(shopId);
    let totalIncome = 0;
    let totalExpense = 0;
    let cashBalance = 0;
    let bankBalance = 0;

    list.forEach(tx => {
      const amt = Number(tx.amount || 0);
      if (tx.type === 'INCOME') {
        totalIncome += amt;
        if (tx.account_type === 'CASH') cashBalance += amt;
        else bankBalance += amt;
      } else {
        totalExpense += amt;
        if (tx.account_type === 'CASH') cashBalance -= amt;
        else bankBalance -= amt;
      }
    });

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      cashBalance,
      bankBalance
    };
  }
};

// ==================== PURCHASES (NHẬP HÀNG & MUA KHO TRỌN GÓI) ====================
export const PurchaseService = {
  async list(shopId) {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('shop_id', shopId)
        .order('purchase_date', { ascending: false });
      if (error) throw error;
      const merged = mergeData(data || [], 'purchases');
      setLocal('purchases', merged);
      return merged;
    } catch (err) {
      return getLocal('purchases');
    }
  },

  async create(shopId, payload) {
    const qty = parseInt(payload.quantity || 1) || 1;
    const importCost = Number(payload.import_cost || payload.importCost || 0);
    const unitCost = qty > 0 ? Math.round(importCost / qty) : 0;
    const todayStr = payload.purchase_date || payload.purchaseDate || new Date().toISOString().split('T')[0];

    const newObj = {
      id: Date.now(),
      shop_id: shopId,
      supplier_id: payload.supplier_id || payload.supplierId || null,
      supplier_name: payload.supplier_name || payload.supplierName || '',
      team_id: payload.team_id || payload.teamId || null,
      product_name: payload.product_name || payload.productName,
      import_cost: importCost,
      quantity: qty,
      unit_cost: unitCost,
      payment_status: payload.payment_status || payload.paymentStatus || 'PAID',
      payment_date: todayStr,
      purchase_date: todayStr,
      notes: payload.notes || '',
      created_at: new Date().toISOString()
    };

    const current = getLocal('purchases');
    setLocal('purchases', [newObj, ...current]);

    // Tự động hạch toán kế toán:
    // 1. Nếu đã thanh toán -> Sinh Phiếu Chi trong Sổ Quỹ
    if (newObj.payment_status === 'PAID') {
      await CashTransactionService.create(shopId, {
        type: 'EXPENSE',
        category: 'Nhập hàng',
        amount: importCost,
        account_type: 'BANK',
        reference_type: 'PURCHASE',
        reference_id: String(newObj.id),
        counterpart_name: newObj.supplier_name || 'Nhà Cung Cấp',
        notes: `Thanh toán phiếu nhập hàng "${newObj.product_name}" (${qty} slots)`
      });
    }

    // 2. Nếu mua nợ NCC -> Cộng vào công nợ của NCC đó
    if (newObj.payment_status === 'DEBT' && newObj.supplier_id) {
      const suppList = getLocal('suppliers');
      const targetSupp = suppList.find(s => String(s.id) === String(newObj.supplier_id));
      if (targetSupp) {
        const newDebt = Number(targetSupp.debt || 0) + importCost;
        targetSupp.debt = newDebt;
        setLocal('suppliers', [...suppList]);
        try {
          await supabase.from('suppliers').update({ debt: newDebt }).eq('id', targetSupp.id);
        } catch (e) {}
      }
    }

    try {
      const { data, error } = await supabase
        .from('purchases')
        .insert({
          shop_id: shopId,
          supplier_id: newObj.supplier_id,
          supplier_name: newObj.supplier_name,
          team_id: newObj.team_id,
          product_name: newObj.product_name,
          import_cost: newObj.import_cost,
          quantity: newObj.quantity,
          payment_status: newObj.payment_status,
          payment_date: newObj.payment_date,
          purchase_date: newObj.purchase_date,
          notes: newObj.notes
        })
        .select()
        .single();
      if (!error && data) return data;
    } catch (err) {}
    return newObj;
  },

  async remove(id) {
    const current = getLocal('purchases');
    setLocal('purchases', current.filter(p => String(p.id) !== String(id)));
    try {
      await supabase.from('purchases').delete().eq('id', id);
    } catch (err) {}
  }
};

// ==================== EXPENSES (CHI PHÍ DOANH NGHIỆP OPEX) ====================
export const ExpenseService = {
  async list(shopId) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('shop_id', shopId)
        .order('expense_date', { ascending: false });
      if (error) throw error;
      const merged = mergeData(data || [], 'expenses');
      setLocal('expenses', merged);
      return merged;
    } catch (err) {
      return getLocal('expenses');
    }
  },

  async create(shopId, payload) {
    const newObj = {
      id: Date.now(),
      shop_id: shopId,
      name: payload.name,
      expense_type: payload.expense_type || payload.expenseType || 'FIXED', // 'FIXED' | 'VARIABLE'
      category: payload.category || 'Vận hành',
      amount: Number(payload.amount || 0),
      recurrence: payload.recurrence || 'ONE_TIME', // 'ONE_TIME' | 'MONTHLY' | 'YEARLY'
      expense_date: payload.expense_date || payload.expenseDate || new Date().toISOString().split('T')[0],
      notes: payload.notes || '',
      is_paid: payload.is_paid !== undefined ? payload.is_paid : true,
      created_at: new Date().toISOString()
    };

    const current = getLocal('expenses');
    setLocal('expenses', [newObj, ...current]);

    // Tự động sinh Phiếu Chi trong Sổ Quỹ nếu đã chi tiền
    if (newObj.is_paid) {
      await CashTransactionService.create(shopId, {
        type: 'EXPENSE',
        category: newObj.category,
        amount: newObj.amount,
        account_type: 'BANK',
        reference_type: 'EXPENSE',
        reference_id: String(newObj.id),
        counterpart_name: newObj.name,
        notes: `Chi phí ${newObj.expense_type === 'FIXED' ? 'cố định' : 'biến động'}: ${newObj.name}`
      });
    }

    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          shop_id: shopId,
          name: newObj.name,
          expense_type: newObj.expense_type,
          category: newObj.category,
          amount: newObj.amount,
          recurrence: newObj.recurrence,
          expense_date: newObj.expense_date,
          notes: newObj.notes,
          is_paid: newObj.is_paid
        })
        .select()
        .single();
      if (!error && data) return data;
    } catch (err) {}
    return newObj;
  },

  async update(id, payload) {
    const current = getLocal('expenses');
    const idx = current.findIndex(e => String(e.id) === String(id));
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...payload };
      setLocal('expenses', [...current]);
    }
    try {
      await supabase.from('expenses').update(payload).eq('id', id);
    } catch (err) {}
  },

  async remove(id) {
    const current = getLocal('expenses');
    setLocal('expenses', current.filter(e => String(e.id) !== String(id)));
    try {
      await supabase.from('expenses').delete().eq('id', id);
    } catch (err) {}
  },

  async getOpexSummary(shopId, monthPeriod = null) {
    const list = await this.list(shopId);
    let totalFixed = 0;
    let totalVariable = 0;

    list.forEach(item => {
      if (monthPeriod && item.expense_date && !item.expense_date.startsWith(monthPeriod)) return;
      const amt = Number(item.amount || 0);
      if (item.expense_type === 'FIXED') totalFixed += amt;
      else totalVariable += amt;
    });

    return {
      totalFixed,
      totalVariable,
      totalOpex: totalFixed + totalVariable
    };
  }
};

// ==================== STAFF MEMBERS (HỒ SƠ NHÂN SỰ) ====================
export const StaffMemberService = {
  async list(shopId) {
    try {
      const { data, error } = await supabase
        .from('staff_members')
        .select('*')
        .eq('shop_id', shopId)
        .order('joined_date', { ascending: false });
      if (error) throw error;
      const merged = mergeData(data || [], 'staff_members');
      setLocal('staff_members', merged);
      return merged;
    } catch (err) {
      return getLocal('staff_members');
    }
  },

  async create(shopId, payload) {
    const newObj = {
      id: Date.now(),
      shop_id: shopId,
      full_name: payload.full_name || payload.fullName,
      phone: payload.phone || '',
      role: payload.role || 'Sale',
      base_salary: Number(payload.base_salary || payload.baseSalary || 0),
      commission_type: payload.commission_type || payload.commissionType || 'PERCENT',
      commission_rate: Number(payload.commission_rate || payload.commissionRate || 0),
      commission_fixed: Number(payload.commission_fixed || payload.commissionFixed || 0),
      status: payload.status || 'ACTIVE',
      joined_date: payload.joined_date || payload.joinedDate || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };

    const current = getLocal('staff_members');
    setLocal('staff_members', [newObj, ...current]);

    try {
      const { data, error } = await supabase
        .from('staff_members')
        .insert({
          shop_id: shopId,
          full_name: newObj.full_name,
          phone: newObj.phone,
          role: newObj.role,
          base_salary: newObj.base_salary,
          commission_type: newObj.commission_type,
          commission_rate: newObj.commission_rate,
          commission_fixed: newObj.commission_fixed,
          status: newObj.status,
          joined_date: newObj.joined_date
        })
        .select()
        .single();
      if (!error && data) return data;
    } catch (err) {}
    return newObj;
  },

  async update(id, payload) {
    const current = getLocal('staff_members');
    const idx = current.findIndex(s => String(s.id) === String(id));
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...payload };
      setLocal('staff_members', [...current]);
    }
    try {
      await supabase.from('staff_members').update(payload).eq('id', id);
    } catch (err) {}
  },

  async remove(id) {
    const current = getLocal('staff_members');
    setLocal('staff_members', current.filter(s => String(s.id) !== String(id)));

    const currentPayrolls = getLocal('payroll_records');
    setLocal('payroll_records', currentPayrolls.filter(p => String(p.staff_id) !== String(id) && String(p.id) !== String(id)));

    try {
      await supabase.from('staff_members').delete().eq('id', id);
      await supabase.from('payroll_records').delete().eq('staff_id', id);
      await supabase.from('payroll_records').delete().eq('id', id);
    } catch (err) {}
  }
};

// ==================== PAYROLL RECORDS (BẢNG LƯƠNG & HOA HỒNG) ====================
export const PayrollService = {
  async list(shopId) {
    try {
      const { data, error } = await supabase
        .from('payroll_records')
        .select('*')
        .eq('shop_id', shopId)
        .order('month_period', { ascending: false });
      if (error) throw error;
      const merged = mergeData(data || [], 'payroll_records');
      setLocal('payroll_records', merged);
      return merged;
    } catch (err) {
      return getLocal('payroll_records');
    }
  },

  async calculatePayrollForMonth(shopId, monthPeriod) {
    const staffList = await StaffMemberService.list(shopId);
    const ordersList = await OrderService.list(shopId);

    // Filter orders in that month (purchase_date starts with 'YYYY-MM')
    const monthOrders = (ordersList || []).filter(o => {
      const pDate = o.purchase_date || o.purchaseDate || '';
      return pDate.startsWith(monthPeriod);
    });

    return staffList.map(staff => {
      // Find orders closed by this staff (if order has created_by or staff_name)
      const staffOrders = monthOrders.filter(o => {
        return (o.created_by_name && o.created_by_name === staff.full_name) ||
               (o.staff_id && String(o.staff_id) === String(staff.id));
      });

      const ordersCount = staffOrders.length > 0 ? staffOrders.length : (staff.role === 'Sale' ? 15 : 10);
      const revenueGen = staffOrders.length > 0
        ? staffOrders.reduce((sum, o) => sum + Number(o.sell_price || o.sellPrice || 0), 0)
        : (ordersCount * 200000);

      let commAmt = 0;
      if (staff.commission_type === 'PERCENT' && staff.commission_rate > 0) {
        commAmt = Math.round((revenueGen * staff.commission_rate) / 100);
      } else if (staff.commission_fixed > 0) {
        commAmt = ordersCount * staff.commission_fixed;
      }

      const baseSal = Number(staff.base_salary || 0);
      const bonus = 0;
      const deduction = 0;
      const netSal = baseSal + commAmt + bonus - deduction;

      return {
        staff_id: staff.id,
        staff_name: staff.full_name,
        role: staff.role,
        month_period: monthPeriod,
        base_salary: baseSal,
        orders_count: ordersCount,
        revenue_generated: revenueGen,
        commission_amount: commAmt,
        bonus_kpi: bonus,
        advance_deduction: deduction,
        net_salary: netSal,
        status: 'DRAFT',
        paid_date: null
      };
    });
  },

  async savePayrollRecord(shopId, payload) {
    const baseSal = Number(payload.base_salary || 0);
    const comm = Number(payload.commission_amount || 0);
    const bonus = Number(payload.bonus_kpi || 0);
    const ded = Number(payload.advance_deduction || 0);
    const netSal = baseSal + comm + bonus - ded;

    const newObj = {
      id: payload.id || Date.now(),
      shop_id: shopId,
      staff_id: payload.staff_id,
      staff_name: payload.staff_name,
      month_period: payload.month_period,
      base_salary: baseSal,
      orders_count: parseInt(payload.orders_count || 0),
      revenue_generated: Number(payload.revenue_generated || 0),
      commission_amount: comm,
      bonus_kpi: bonus,
      advance_deduction: ded,
      net_salary: netSal,
      status: payload.status || 'DRAFT',
      paid_date: payload.paid_date || null,
      created_at: new Date().toISOString()
    };

    const current = getLocal('payroll_records');
    const existingIdx = current.findIndex(p => String(p.id) === String(newObj.id) || (String(p.staff_id) === String(newObj.staff_id) && p.month_period === newObj.month_period));
    let updated = [];
    if (existingIdx >= 0) {
      current[existingIdx] = newObj;
      updated = [...current];
    } else {
      updated = [newObj, ...current];
    }
    setLocal('payroll_records', updated);

    try {
      const { data, error } = await supabase
        .from('payroll_records')
        .upsert({ ...newObj, shop_id: shopId })
        .select()
        .single();
      if (!error && data) return data;
    } catch (err) {}
    return newObj;
  },

  async confirmAndPaySalary(shopId, payrollRecord, accountType = 'BANK') {
    const todayStr = new Date().toISOString().split('T')[0];
    const updated = {
      ...payrollRecord,
      status: 'PAID',
      paid_date: todayStr
    };

    await this.savePayrollRecord(shopId, updated);

    // Tự động sinh Phiếu Chi Lương trong Sổ Quỹ
    await CashTransactionService.create(shopId, {
      type: 'EXPENSE',
      category: 'Lương nhân viên',
      amount: updated.net_salary,
      account_type: accountType,
      reference_type: 'PAYROLL',
      reference_id: String(updated.id),
      counterpart_name: updated.staff_name,
      notes: `Chi trả bảng lương tháng ${updated.month_period} cho nhân sự ${updated.staff_name}`
    });

    return updated;
  }
};

// ==================== INVENTORY LOGS ====================
export const InventoryLogService = {
  async list(shopId, itemId = null) {
    try {
      let query = supabase
        .from('inventory_logs')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (itemId) query = query.eq('inventory_item_id', itemId);
      const { data, error } = await query;
      if (error) throw error;
      return mergeData(data || [], 'inventory_logs');
    } catch (err) {
      const logs = getLocal('inventory_logs');
      if (itemId) return logs.filter(l => String(l.inventory_item_id) === String(itemId));
      return logs;
    }
  },

  async create(shopId, payload) {
    const newLog = {
      ...payload,
      id: Date.now(),
      shop_id: shopId,
      created_at: new Date().toISOString()
    };
    const current = getLocal('inventory_logs');
    setLocal('inventory_logs', [newLog, ...current]);

    try {
      await supabase.from('inventory_logs').insert({ ...payload, shop_id: shopId });
    } catch (e) {}
    return newLog;
  }
};

// ==================== DIGITAL INVENTORY MANAGEMENT 360° ====================
export const InventoryService = {
  async list(shopId, filters = {}) {
    try {
      let query = supabase
        .from('inventory_items')
        .select('*')
        .eq('shop_id', shopId)
        .order('import_date', { ascending: false });

      if (filters.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status);
      }
      if (filters.product_name && filters.product_name !== 'ALL') {
        query = query.eq('product_name', filters.product_name);
      }
      if (filters.supplier_id && filters.supplier_id !== 'ALL') {
        query = query.eq('supplier_id', filters.supplier_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      const merged = mergeData(data || [], 'inventory_items');
      setLocal('inventory_items', merged);
      return this.applyLocalFilters(merged, filters);
    } catch (err) {
      const current = getLocal('inventory_items');
      return this.applyLocalFilters(current, filters);
    }
  },

  applyLocalFilters(items, filters = {}) {
    return items.filter(item => {
      if (filters.status && filters.status !== 'ALL' && item.status !== filters.status) return false;
      if (filters.product_name && filters.product_name !== 'ALL' && item.product_name !== filters.product_name) return false;
      if (filters.supplier_id && filters.supplier_id !== 'ALL' && String(item.supplier_id) !== String(filters.supplier_id)) return false;
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const matchCode = (item.item_code || '').toLowerCase().includes(s);
        const matchProd = (item.product_name || '').toLowerCase().includes(s);
        const matchCust = (item.customer_name || '').toLowerCase().includes(s);
        const matchSupp = (item.supplier_name || '').toLowerCase().includes(s);
        if (!matchCode && !matchProd && !matchCust && !matchSupp) return false;
      }
      return true;
    });
  },

  async getSummary(shopId) {
    const items = await this.list(shopId);
    const totalItems = items.length;
    const availableItems = items.filter(i => i.status === 'AVAILABLE');
    const soldItems = items.filter(i => i.status === 'SOLD');
    const faultyItems = items.filter(i => i.status === 'FAULTY' || i.status === 'SUPPLIER_CLAIM');
    const expiredItems = items.filter(i => i.status === 'EXPIRED');

    // Total inventory value based on cost price of available assets
    const totalInventoryValue = availableItems.reduce((sum, i) => sum + Number(i.cost_price || 0), 0);

    // Group by product
    const productMap = {};
    items.forEach(i => {
      const pName = i.product_name || 'Khác';
      if (!productMap[pName]) {
        productMap[pName] = { product_name: pName, total: 0, available: 0, sold: 0, faulty: 0, total_value: 0 };
      }
      productMap[pName].total += 1;
      if (i.status === 'AVAILABLE') {
        productMap[pName].available += 1;
        productMap[pName].total_value += Number(i.cost_price || 0);
      } else if (i.status === 'SOLD') {
        productMap[pName].sold += 1;
      } else if (i.status === 'FAULTY' || i.status === 'SUPPLIER_CLAIM') {
        productMap[pName].faulty += 1;
      }
    });

    return {
      totalItems,
      availableCount: availableItems.length,
      soldCount: soldItems.length,
      faultyCount: faultyItems.length,
      expiredCount: expiredItems.length,
      totalInventoryValue,
      productBreakdown: Object.values(productMap)
    };
  },

  // Bulk Import with Auto-Dedup & Accounting integration
  async bulkImport(shopId, {
    product_id = null,
    product_name,
    category = '',
    asset_type = 'SINGLE_KEY',
    supplier_id = null,
    supplier_name = '',
    cost_price = 0,
    is_paid_to_supplier = true,
    lines_text = '',
    activation_deadline = null,
    expire_date = null,
    notes = ''
  }) {
    if (!lines_text || !product_name) throw new Error('Thiếu thông tin sản phẩm hoặc danh sách key.');

    const todayStr = new Date().toISOString().split('T')[0];
    const rawLines = lines_text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    if (rawLines.length === 0) throw new Error('Danh sách key rỗng.');

    // 1. Auto-Dedup within current batch
    const uniqueLines = Array.from(new Set(rawLines));
    const duplicatesInBatch = rawLines.length - uniqueLines.length;

    // 2. Auto-Dedup against existing inventory items in shop
    const currentItems = getLocal('inventory_items');
    const existingCodeSet = new Set(currentItems.map(i => i.item_code.trim().toLowerCase()));

    const validNewLines = [];
    const alreadyExistingLines = [];

    uniqueLines.forEach(line => {
      if (existingCodeSet.has(line.toLowerCase())) {
        alreadyExistingLines.push(line);
      } else {
        validNewLines.push(line);
      }
    });

    if (validNewLines.length === 0) {
      throw new Error(`Tất cả ${rawLines.length} key vừa dán đã tồn tại trong kho hoặc trùng lặp!`);
    }

    const unitCost = Number(cost_price || 0);
    const totalBatchCost = unitCost * validNewLines.length;

    // 3. Create Purchase record if cost > 0
    let purchaseRecord = null;
    if (totalBatchCost > 0) {
      purchaseRecord = await PurchaseService.create(shopId, {
        supplier_id: supplier_id ? parseInt(supplier_id) : null,
        supplier_name: supplier_name || 'Nguồn Nhập Key',
        product_name: product_name,
        import_cost: totalBatchCost,
        quantity: validNewLines.length,
        payment_status: is_paid_to_supplier ? 'PAID' : 'DEBT',
        purchase_date: todayStr,
        notes: `Nhập kho lô ${validNewLines.length} key "${product_name}"`
      });
    }

    // 4. Generate item records
    const newItemsToCreate = validNewLines.map((line, idx) => ({
      id: Date.now() + idx + Math.floor(Math.random() * 1000),
      shop_id: shopId,
      product_id: product_id ? parseInt(product_id) : null,
      product_name: product_name,
      category: category,
      asset_type: asset_type,
      item_code: line,
      cost_price: unitCost,
      supplier_id: supplier_id ? parseInt(supplier_id) : null,
      supplier_name: supplier_name,
      purchase_id: purchaseRecord ? purchaseRecord.id : null,
      status: 'AVAILABLE',
      import_date: todayStr,
      activation_deadline: activation_deadline || null,
      expire_date: expire_date || null,
      notes: notes || '',
      created_at: new Date().toISOString()
    }));

    // Update local storage
    const updatedItems = [...newItemsToCreate, ...currentItems];
    setLocal('inventory_items', updatedItems);

    // Create log entry
    await InventoryLogService.create(shopId, {
      inventory_item_id: newItemsToCreate[0]?.id || 0,
      action_type: 'IMPORT',
      product_name: product_name,
      quantity: newItemsToCreate.length,
      unit_cost: unitCost,
      reference_id: purchaseRecord ? String(purchaseRecord.id) : '',
      notes: `Nhập kho ${newItemsToCreate.length} key ${product_name}`
    });

    // Supabase sync
    try {
      const supaPayload = newItemsToCreate.map(item => ({
        shop_id: shopId,
        product_id: item.product_id,
        product_name: item.product_name,
        category: item.category,
        asset_type: item.asset_type,
        item_code: item.item_code,
        cost_price: item.cost_price,
        supplier_id: item.supplier_id,
        supplier_name: item.supplier_name,
        purchase_id: item.purchase_id,
        status: item.status,
        import_date: item.import_date,
        activation_deadline: item.activation_deadline,
        expire_date: item.expire_date,
        notes: item.notes
      }));
      await supabase.from('inventory_items').insert(supaPayload);
    } catch (e) {}

    return {
      importedCount: newItemsToCreate.length,
      duplicatesInBatch,
      alreadyExistingCount: alreadyExistingLines.length,
      totalBatchCost,
      purchaseId: purchaseRecord?.id || null
    };
  },

  // FIFO Item Picker for POS
  async pickAvailableItem(shopId, productName) {
    const items = await this.list(shopId, { status: 'AVAILABLE', product_name: productName });
    if (!items || items.length === 0) return null;

    // FIFO sort: earliest import_date, then lowest ID
    const sorted = [...items].sort((a, b) => {
      const dateA = new Date(a.import_date || 0).getTime();
      const dateB = new Date(b.import_date || 0).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return a.id - b.id;
    });

    return sorted[0];
  },

  async getAvailableCount(shopId, productName) {
    const items = await this.list(shopId, { status: 'AVAILABLE', product_name: productName });
    return items ? items.length : 0;
  },

  // Assign item to Order (called upon POS order completion)
  async assignItemToOrder(shopId, itemId, orderId, customerId, customerName) {
    const todayStr = new Date().toISOString().split('T')[0];
    const updatePayload = {
      status: 'SOLD',
      order_id: parseInt(orderId),
      customer_id: customerId ? parseInt(customerId) : null,
      customer_name: customerName || '',
      sold_date: todayStr
    };

    const current = getLocal('inventory_items');
    let itemObj = null;
    const updated = current.map(item => {
      if (String(item.id) === String(itemId)) {
        itemObj = { ...item, ...updatePayload };
        return itemObj;
      }
      return item;
    });
    setLocal('inventory_items', updated);

    // Create log
    if (itemObj) {
      await InventoryLogService.create(shopId, {
        inventory_item_id: itemObj.id,
        action_type: 'EXPORT_POS',
        product_name: itemObj.product_name,
        quantity: 1,
        unit_cost: itemObj.cost_price,
        reference_id: String(orderId),
        notes: `Xuất bán đơn hàng POS #${orderId} cho ${customerName}`
      });
    }

    try {
      await supabase.from('inventory_items').update(updatePayload).eq('id', itemId);
    } catch (e) {}

    return itemObj;
  },

  // Mark item as Faulty / RMA and pick replacement
  async markFaultyAndReplace(shopId, itemId, reason = '', orderId = null) {
    const current = getLocal('inventory_items');
    let faultyItem = null;
    const updated = current.map(item => {
      if (String(item.id) === String(itemId)) {
        faultyItem = {
          ...item,
          status: 'FAULTY',
          faulty_reason: reason,
          supplier_claim_status: 'PENDING_CLAIM'
        };
        return faultyItem;
      }
      return item;
    });
    setLocal('inventory_items', updated);

    if (faultyItem) {
      await InventoryLogService.create(shopId, {
        inventory_item_id: faultyItem.id,
        action_type: 'WARRANTY_FAULTY',
        product_name: faultyItem.product_name,
        quantity: 1,
        unit_cost: faultyItem.cost_price,
        reference_id: orderId ? String(orderId) : '',
        notes: `Khách báo lỗi: ${reason}. Đưa vào danh sách đòi bảo hành NCC.`
      });
    }

    try {
      await supabase
        .from('inventory_items')
        .update({ status: 'FAULTY', faulty_reason: reason, supplier_claim_status: 'PENDING_CLAIM' })
        .eq('id', itemId);
    } catch (e) {}

    // Find replacement item if available
    let replacementItem = null;
    if (faultyItem && faultyItem.product_name) {
      replacementItem = await this.pickAvailableItem(shopId, faultyItem.product_name);
    }

    return { faultyItem, replacementItem };
  },

  // Restock item back to AVAILABLE (e.g. order cancelled/refunded)
  async restockItem(shopId, itemId, notes = '') {
    const updatePayload = {
      status: 'AVAILABLE',
      order_id: null,
      customer_id: null,
      customer_name: '',
      sold_date: null,
      faulty_reason: '',
      supplier_claim_status: '',
      notes: notes ? `Thu hồi về kho: ${notes}` : 'Thu hồi về kho'
    };

    const current = getLocal('inventory_items');
    let itemObj = null;
    const updated = current.map(item => {
      if (String(item.id) === String(itemId)) {
        itemObj = { ...item, ...updatePayload };
        return itemObj;
      }
      return item;
    });
    setLocal('inventory_items', updated);

    if (itemObj) {
      await InventoryLogService.create(shopId, {
        inventory_item_id: itemObj.id,
        action_type: 'RESTOCK',
        product_name: itemObj.product_name,
        quantity: 1,
        unit_cost: itemObj.cost_price,
        notes: `Thu hồi key về kho sẵn sàng bán: ${notes}`
      });
    }

    try {
      await supabase.from('inventory_items').update(updatePayload).eq('id', itemId);
    } catch (e) {}

    return itemObj;
  },

  async updateStatus(id, status, notes = '') {
    const current = getLocal('inventory_items');
    let updatedObj = null;
    const updated = current.map(item => {
      if (String(item.id) === String(id)) {
        updatedObj = { ...item, status, notes: notes || item.notes };
        return updatedObj;
      }
      return item;
    });
    setLocal('inventory_items', updated);

    try {
      await supabase.from('inventory_items').update({ status, notes }).eq('id', id);
    } catch (e) {}
    return updatedObj;
  },

  async updateItem(id, payload) {
    const current = getLocal('inventory_items');
    let updatedObj = null;
    const updated = current.map(item => {
      if (String(item.id) === String(id)) {
        updatedObj = { ...item, ...payload };
        return updatedObj;
      }
      return item;
    });
    setLocal('inventory_items', updated);

    try {
      await supabase.from('inventory_items').update(payload).eq('id', id);
    } catch (e) {}
    return updatedObj;
  },

  async remove(id) {
    const current = getLocal('inventory_items');
    setLocal('inventory_items', current.filter(i => String(i.id) !== String(id)));
    try {
      await supabase.from('inventory_items').delete().eq('id', id);
    } catch (e) {}
  },

  // Nhập - Xuất - Tồn (N-X-T Report)
  async getNxtReport(shopId, startDate = null, endDate = null) {
    const items = await this.list(shopId);
    const logs = await InventoryLogService.list(shopId);

    const reportMap = {};

    // Group items by product_name
    items.forEach(i => {
      const pName = i.product_name || 'Khác';
      if (!reportMap[pName]) {
        reportMap[pName] = {
          product_name: pName,
          category: i.category || 'Dịch Vụ',
          opening_stock: 0,
          imported_qty: 0,
          exported_sold_qty: 0,
          exported_faulty_qty: 0,
          closing_stock: 0,
          avg_cost: Number(i.cost_price || 0),
          total_closing_value: 0
        };
      }
      if (i.status === 'AVAILABLE') {
        reportMap[pName].closing_stock += 1;
        reportMap[pName].total_closing_value += Number(i.cost_price || 0);
      } else if (i.status === 'SOLD') {
        reportMap[pName].exported_sold_qty += 1;
      } else if (i.status === 'FAULTY' || i.status === 'SUPPLIER_CLAIM') {
        reportMap[pName].exported_faulty_qty += 1;
      }
      reportMap[pName].imported_qty += 1;
    });

    const reportList = Object.values(reportMap).map(row => {
      row.opening_stock = Math.max(0, row.closing_stock + row.exported_sold_qty + row.exported_faulty_qty - row.imported_qty);
      if (row.closing_stock > 0) {
        row.avg_cost = Math.round(row.total_closing_value / row.closing_stock);
      }
      return row;
    });

    return reportList;
  },

  // Low Stock & Expiry Alerts
  async getLowStockAlerts(shopId) {
    const products = await ProductService.list(shopId);
    const items = await this.list(shopId);
    const teams = await TeamService.list(shopId);
    const orders = await OrderService.list(shopId);

    const alerts = [];
    const today = new Date();

    products.forEach(prod => {
      const pName = prod.name;
      const minThreshold = prod.min_stock_alert || 5;

      // Available single keys
      const availKeys = items.filter(i => i.product_name === pName && i.status === 'AVAILABLE').length;

      // Available team slots
      const matchingTeams = teams.filter(t => t.category === prod.category || t.name.includes(pName));
      let availSlots = 0;
      matchingTeams.forEach(t => {
        const used = orders.filter(o => String(o.team_id || o.teamId) === String(t.id)).length;
        const max = t.max_slots || t.maxSlots || 1;
        availSlots += Math.max(0, max - used);
      });

      const totalAvail = availKeys + availSlots;

      if (totalAvail <= minThreshold) {
        alerts.push({
          type: 'LOW_STOCK',
          product_id: prod.id,
          product_name: pName,
          category: prod.category,
          total_available: totalAvail,
          available_keys: availKeys,
          available_team_slots: availSlots,
          min_threshold: minThreshold,
          is_out_of_stock: totalAvail === 0
        });
      }
    });

    // Check shelf-life expiring keys (activation_deadline within 3 days)
    const shelfLifeAlerts = items.filter(i => {
      if (i.status !== 'AVAILABLE' || !i.activation_deadline) return false;
      const deadline = new Date(i.activation_deadline);
      const diffDays = Math.round((deadline - today) / (1000 * 60 * 60 * 24));
      return diffDays <= 3;
    }).map(i => ({
      type: 'EXPIRING_KEY',
      item_id: i.id,
      product_name: i.product_name,
      item_code: i.item_code,
      activation_deadline: i.activation_deadline
    }));

    return {
      lowStockAlerts: alerts,
      shelfLifeAlerts
    };
  }
};


