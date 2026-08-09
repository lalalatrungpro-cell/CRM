import { supabase } from './supabaseClient';

// Helper for safe localStorage fallback
const getLocal = (key, defaultVal = []) => {
  try {
    const d = localStorage.getItem('crm_demo_' + key);
    return d ? JSON.parse(d) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
};

const setLocal = (key, val) => {
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
      { id: 1, name: 'Canva Pro (1 năm)', category: 'Design', default_duration_days: 365, default_sell: 150000, default_cost: 50000 },
      { id: 2, name: 'Google AI Pro (Gemini Advanced 1 năm)', category: 'AI', default_duration_days: 365, default_sell: 220000, default_cost: 100000 },
      { id: 3, name: 'Netflix Premium (1 tháng)', category: 'Entertainment', default_duration_days: 30, default_sell: 90000, default_cost: 40000 },
      { id: 4, name: 'ChatGPT Plus (1 tháng)', category: 'AI', default_duration_days: 30, default_sell: 200000, default_cost: 120000 }
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

    localStorage.setItem('crm_demo_seeded', 'true');
  }
};

seedDemoData();

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
    const newObj = { ...payload, id: Date.now(), shop_id: shopId, created_at: new Date().toISOString() };
    const current = getLocal('customers');
    const updated = [newObj, ...current];
    setLocal('customers', updated);

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({ ...payload, shop_id: shopId })
        .select()
        .single();
      if (!error && data) {
        const currentRefreshed = getLocal('customers').map(c => String(c.id) === String(newObj.id) ? data : c);
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

    const newObj = { ...formattedPayload, id: Date.now(), shop_id: shopId, created_at: new Date().toISOString() };
    const current = getLocal('orders');
    setLocal('orders', [newObj, ...current]);

    try {
      const { data, error } = await supabase
        .from('orders')
        .insert({ ...formattedPayload, shop_id: shopId })
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
        notes: lowest.notes || ''
      };
    } catch (err) {
      return null;
    }
  }
};
