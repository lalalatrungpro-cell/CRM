-- ==========================================
-- SUPABASE DATABASE SCHEMA FOR MINI-CRM
-- Run this in Supabase -> SQL Editor -> New Query
-- ==========================================

-- Block 1: Bảng shops (workspace của từng chủ shop)
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Block 2: Bảng profiles (thông tin người dùng mở rộng)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'staff', 'accountant')) DEFAULT 'staff',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Block 3: Bảng customers
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  type TEXT CHECK (type IN ('Le', 'CTV', 'Si')) DEFAULT 'Le',
  source TEXT DEFAULT 'Facebook Page',
  notes TEXT DEFAULT '',
  debt NUMERIC DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Block 4: Bảng products
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  default_cost NUMERIC DEFAULT 0,
  default_sell NUMERIC DEFAULT 0,
  default_duration_days INTEGER DEFAULT 30,
  max_slots INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Block 5: Bảng suppliers
CREATE TABLE suppliers (
  id BIGSERIAL PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  zalo TEXT DEFAULT '',
  telegram TEXT DEFAULT '',
  social TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  debt NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Block 6: Bảng teams
CREATE TABLE teams (
  id BIGSERIAL PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT DEFAULT '',
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT DEFAULT 'Team Member',
  infor TEXT DEFAULT '',
  max_slots INTEGER DEFAULT 1,
  purchase_date DATE,
  expire_date DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Block 7: Bảng orders
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT DEFAULT '',
  team_id BIGINT REFERENCES teams(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL DEFAULT '',
  infor TEXT DEFAULT '',
  cost_price NUMERIC DEFAULT 0,
  sell_price NUMERIC DEFAULT 0,
  status TEXT CHECK (status IN ('Đã thanh toán', 'Nợ')) DEFAULT 'Đã thanh toán',
  purchase_date DATE DEFAULT CURRENT_DATE,
  expire_date DATE,
  duration_days INTEGER DEFAULT 30,
  supplier_paid BOOLEAN DEFAULT FALSE,
  warranty_count INTEGER DEFAULT 0,
  renewed_from BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  source TEXT DEFAULT '',
  channel TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Block 8: Bảng care_logs
CREATE TABLE care_logs (
  id BIGSERIAL PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Block 9: Bảng warranty_logs
CREATE TABLE warranty_logs (
  id BIGSERIAL PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  new_infor TEXT DEFAULT '',
  new_team_id BIGINT REFERENCES teams(id),
  note TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Block 10: Bảng channels
CREATE TABLE channels (
  id BIGSERIAL PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Block 11: Bảng vietqr_settings
CREATE TABLE vietqr_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  bank_id TEXT DEFAULT 'MB',
  account_no TEXT DEFAULT '',
  account_name TEXT DEFAULT '',
  template TEXT DEFAULT 'compact2',
  memo_prefix TEXT DEFAULT 'DON',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Block 12: Bảng audit_logs
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Block 13: Tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE vietqr_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: lấy shop_id của người dùng đang đăng nhập
CREATE OR REPLACE FUNCTION get_my_shop_id()
RETURNS UUID AS $$
  SELECT shop_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function: lấy role của người dùng đang đăng nhập
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Policy cho shops: chỉ xem shop của mình
CREATE POLICY "Users see own shop" ON shops
  FOR ALL USING (id = get_my_shop_id());

-- Policy cho profiles: chỉ xem profile của cùng shop
CREATE POLICY "Users see profiles of same shop" ON profiles
  FOR ALL USING (shop_id = get_my_shop_id());

-- Policy mặc định cho tất cả bảng dữ liệu: chỉ xem data của shop mình
CREATE POLICY "Shop isolation - customers" ON customers
  FOR ALL USING (shop_id = get_my_shop_id());

CREATE POLICY "Shop isolation - products" ON products
  FOR ALL USING (shop_id = get_my_shop_id());

CREATE POLICY "Shop isolation - suppliers" ON suppliers
  FOR ALL USING (shop_id = get_my_shop_id());

CREATE POLICY "Shop isolation - teams" ON teams
  FOR ALL USING (shop_id = get_my_shop_id());

CREATE POLICY "Shop isolation - orders" ON orders
  FOR ALL USING (shop_id = get_my_shop_id());

CREATE POLICY "Shop isolation - care_logs" ON care_logs
  FOR ALL USING (shop_id = get_my_shop_id());

CREATE POLICY "Shop isolation - warranty_logs" ON warranty_logs
  FOR ALL USING (shop_id = get_my_shop_id());

CREATE POLICY "Shop isolation - channels" ON channels
  FOR ALL USING (shop_id = get_my_shop_id());

CREATE POLICY "Shop isolation - vietqr_settings" ON vietqr_settings
  FOR ALL USING (shop_id = get_my_shop_id());

CREATE POLICY "Shop isolation - audit_logs" ON audit_logs
  FOR ALL USING (shop_id = get_my_shop_id());
