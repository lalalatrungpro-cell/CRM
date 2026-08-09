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
      { id: 2, customer_id: 2, customer_name: 'Trần Thị B', phone: '0987654321', product_name: 'Google AI Pro (Gemini Advanced 1 năm)', sell_price: 220000, cost_price: 100000, status: 'Nợ', infor: 'gemini.vip2@gmail.com | pass888', purchase_date: '2026-08-05', expire_date: '2027-08-05', channel: 'Zalo' }
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

    localStorage.setItem('crm_demo_seeded', 'true');
  }
};

seedDemoData();

// ==================== CUSTOMERS ====================
export const CustomerService = {
  async list(shopId) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error || !data) throw error || new Error('No data');
      return data;
    } catch (err) {
      console.warn('Supabase query fallback to local:', err?.message);
      return getLocal('customers');
    }
  },

  async create(shopId, payload) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({ ...payload, shop_id: shopId })
        .select()
        .single();
      if (error || !data) throw error || new Error('Insert failed');
      return data;
    } catch (err) {
      const current = getLocal('customers');
      const newObj = { ...payload, id: Date.now(), shop_id: shopId, created_at: new Date().toISOString() };
      setLocal('customers', [newObj, ...current]);
      return newObj;
    }
  },

  async update(id, payload) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error || !data) throw error || new Error('Update failed');
      return data;
    } catch (err) {
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
      return updatedObj || { id, ...payload };
    }
  },

  async remove(id) {
    try {
      await supabase.from('customers').delete().eq('id', id);
    } catch (err) {
      const current = getLocal('customers');
      setLocal('customers', current.filter(c => String(c.id) !== String(id)));
    }
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
      if (error || !data) throw error || new Error('No data');
      return data;
    } catch (err) {
      return getLocal('products');
    }
  },

  async create(shopId, payload) {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert({ ...payload, shop_id: shopId })
        .select()
        .single();
      if (error || !data) throw error || new Error('Insert failed');
      return data;
    } catch (err) {
      const current = getLocal('products');
      const newObj = { ...payload, id: Date.now(), shop_id: shopId, created_at: new Date().toISOString() };
      setLocal('products', [newObj, ...current]);
      return newObj;
    }
  },

  async update(id, payload) {
    try {
      const { data, error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error || !data) throw error || new Error('Update failed');
      return data;
    } catch (err) {
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
      return updatedObj || { id, ...payload };
    }
  },

  async remove(id) {
    try {
      await supabase.from('products').delete().eq('id', id);
    } catch (err) {
      const current = getLocal('products');
      setLocal('products', current.filter(p => String(p.id) !== String(id)));
    }
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
      if (error || !data) throw error || new Error('No data');
      return data;
    } catch (err) {
      return getLocal('orders');
    }
  },

  async create(shopId, payload) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert({ ...payload, shop_id: shopId })
        .select()
        .single();
      if (error || !data) throw error || new Error('Insert failed');
      return data;
    } catch (err) {
      const current = getLocal('orders');
      const newObj = { ...payload, id: Date.now(), shop_id: shopId, created_at: new Date().toISOString() };
      setLocal('orders', [newObj, ...current]);
      return newObj;
    }
  },

  async update(id, payload) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error || !data) throw error || new Error('Update failed');
      return data;
    } catch (err) {
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
      return updatedObj || { id, ...payload };
    }
  },

  async remove(id) {
    try {
      await supabase.from('orders').delete().eq('id', id);
    } catch (err) {
      const current = getLocal('orders');
      setLocal('orders', current.filter(o => String(o.id) !== String(id)));
    }
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
      if (error || !data) throw error || new Error('No data');
      return data;
    } catch (err) {
      return getLocal('suppliers');
    }
  },

  async create(shopId, payload) {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({ ...payload, shop_id: shopId })
        .select()
        .single();
      if (error || !data) throw error || new Error('Insert failed');
      return data;
    } catch (err) {
      const current = getLocal('suppliers');
      const newObj = { ...payload, id: Date.now(), shop_id: shopId, created_at: new Date().toISOString() };
      setLocal('suppliers', [newObj, ...current]);
      return newObj;
    }
  },

  async update(id, payload) {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error || !data) throw error || new Error('Update failed');
      return data;
    } catch (err) {
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
      return updatedObj || { id, ...payload };
    }
  },

  async remove(id) {
    try {
      await supabase.from('suppliers').delete().eq('id', id);
    } catch (err) {
      const current = getLocal('suppliers');
      setLocal('suppliers', current.filter(s => String(s.id) !== String(id)));
    }
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
      if (error || !data) throw error || new Error('No data');
      return data;
    } catch (err) {
      return getLocal('teams');
    }
  },

  async create(shopId, payload) {
    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({ ...payload, shop_id: shopId })
        .select()
        .single();
      if (error || !data) throw error || new Error('Insert failed');
      return data;
    } catch (err) {
      const current = getLocal('teams');
      const newObj = { ...payload, id: Date.now(), shop_id: shopId, created_at: new Date().toISOString() };
      setLocal('teams', [newObj, ...current]);
      return newObj;
    }
  },

  async update(id, payload) {
    try {
      const { data, error } = await supabase
        .from('teams')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error || !data) throw error || new Error('Update failed');
      return data;
    } catch (err) {
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
      return updatedObj || { id, ...payload };
    }
  },

  async remove(id) {
    try {
      await supabase.from('teams').delete().eq('id', id);
    } catch (err) {
      const current = getLocal('teams');
      setLocal('teams', current.filter(t => String(t.id) !== String(id)));
    }
  }
};

// ==================== CARE LOGS ====================
export const CareLogService = {
  async list(shopId, customerId) {
    try {
      let query = supabase.from('care_logs').select('*').eq('shop_id', shopId);
      if (customerId) query = query.eq('customer_id', customerId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error || !data) throw error || new Error('No data');
      return data;
    } catch (err) {
      const current = getLocal('care_logs');
      if (customerId) return current.filter(c => String(c.customer_id) === String(customerId));
      return current;
    }
  },

  async create(shopId, payload) {
    try {
      const { data, error } = await supabase
        .from('care_logs')
        .insert({ ...payload, shop_id: shopId })
        .select()
        .single();
      if (error || !data) throw error || new Error('Insert failed');
      return data;
    } catch (err) {
      const current = getLocal('care_logs');
      const newObj = { ...payload, id: Date.now(), shop_id: shopId, created_at: new Date().toISOString() };
      setLocal('care_logs', [newObj, ...current]);
      return newObj;
    }
  },

  async remove(id) {
    try {
      await supabase.from('care_logs').delete().eq('id', id);
    } catch (err) {
      const current = getLocal('care_logs');
      setLocal('care_logs', current.filter(c => String(c.id) !== String(id)));
    }
  }
};

// ==================== WARRANTY LOGS ====================
export const WarrantyLogService = {
  async listByShop(shopId) {
    try {
      const { data, error } = await supabase
        .from('warranty_logs')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error || !data) throw error || new Error('No data');
      return data;
    } catch (err) {
      return getLocal('warranty_logs');
    }
  },

  async create(shopId, payload) {
    try {
      const { data, error } = await supabase
        .from('warranty_logs')
        .insert({ ...payload, shop_id: shopId })
        .select()
        .single();
      if (error || !data) throw error || new Error('Insert failed');
      return data;
    } catch (err) {
      const current = getLocal('warranty_logs');
      const newObj = { ...payload, id: Date.now(), shop_id: shopId, created_at: new Date().toISOString() };
      setLocal('warranty_logs', [newObj, ...current]);
      return newObj;
    }
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
      if (error || !data) throw error || new Error('No data');
      return data;
    } catch (err) {
      return getLocal('channels');
    }
  },

  async create(shopId, payload) {
    try {
      const { data, error } = await supabase
        .from('channels')
        .insert({ ...payload, shop_id: shopId })
        .select()
        .single();
      if (error || !data) throw error || new Error('Insert failed');
      return data;
    } catch (err) {
      const current = getLocal('channels');
      const newObj = { ...payload, id: Date.now(), shop_id: shopId, created_at: new Date().toISOString() };
      setLocal('channels', [newObj, ...current]);
      return newObj;
    }
  },

  async remove(id) {
    try {
      await supabase.from('channels').delete().eq('id', id);
    } catch (err) {
      const current = getLocal('channels');
      setLocal('channels', current.filter(c => String(c.id) !== String(id)));
    }
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
    try {
      const existing = await this.get(shopId);
      if (existing && existing.id) {
        const { data, error } = await supabase
          .from('vietqr_settings')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        if (error || !data) throw error || new Error('Update failed');
        return data;
      } else {
        const { data, error } = await supabase
          .from('vietqr_settings')
          .insert({ ...payload, shop_id: shopId })
          .select()
          .single();
        if (error || !data) throw error || new Error('Insert failed');
        return data;
      }
    } catch (err) {
      setLocal('vietqr', payload);
      return payload;
    }
  }
};
