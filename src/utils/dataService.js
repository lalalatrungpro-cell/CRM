import { supabase } from './supabaseClient';

// ==================== CUSTOMERS ====================
export const CustomerService = {
  async list(shopId) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(shopId, payload) {
    const { data, error } = await supabase
      .from('customers')
      .insert({ ...payload, shop_id: shopId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('customers')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
  }
};

// ==================== PRODUCTS ====================
export const ProductService = {
  async list(shopId) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(shopId, payload) {
    const { data, error } = await supabase
      .from('products')
      .insert({ ...payload, shop_id: shopId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  }
};

// ==================== SUPPLIERS ====================
export const SupplierService = {
  async list(shopId) {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(shopId, payload) {
    const { data, error } = await supabase
      .from('suppliers')
      .insert({ ...payload, shop_id: shopId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('suppliers')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) throw error;
  }
};

// ==================== TEAMS ====================
export const TeamService = {
  async list(shopId) {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(shopId, payload) {
    const { data, error } = await supabase
      .from('teams')
      .insert({ ...payload, shop_id: shopId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('teams')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) throw error;
  }
};

// ==================== ORDERS ====================
export const OrderService = {
  async list(shopId) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(shopId, payload) {
    const { data, error } = await supabase
      .from('orders')
      .insert({ ...payload, shop_id: shopId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('orders')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) throw error;
  }
};

// ==================== CARE LOGS ====================
export const CareLogService = {
  async list(shopId, customerId) {
    const { data, error } = await supabase
      .from('care_logs')
      .select('*')
      .eq('shop_id', shopId)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(shopId, payload) {
    const { data, error } = await supabase
      .from('care_logs')
      .insert({ ...payload, shop_id: shopId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase.from('care_logs').delete().eq('id', id);
    if (error) throw error;
  }
};

// ==================== CHANNELS ====================
export const ChannelService = {
  async list(shopId) {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  async create(shopId, payload) {
    const { data, error } = await supabase
      .from('channels')
      .insert({ ...payload, shop_id: shopId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase.from('channels').delete().eq('id', id);
    if (error) throw error;
  }
};

// ==================== VIETQR SETTINGS ====================
export const VietQRService = {
  async get(shopId) {
    const { data, error } = await supabase
      .from('vietqr_settings')
      .select('*')
      .eq('shop_id', shopId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async save(shopId, payload) {
    const { data, error } = await supabase
      .from('vietqr_settings')
      .upsert({ ...payload, shop_id: shopId })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};


// ==================== WARRANTY LOGS ====================
export const WarrantyLogService = {
  async listByOrder(shopId, orderId) {
    const { data, error } = await supabase
      .from('warranty_logs')
      .select('*')
      .eq('shop_id', shopId)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async listByShop(shopId) {
    const { data, error } = await supabase
      .from('warranty_logs')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(shopId, payload) {
    const { data, error } = await supabase
      .from('warranty_logs')
      .insert({ ...payload, shop_id: shopId })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
