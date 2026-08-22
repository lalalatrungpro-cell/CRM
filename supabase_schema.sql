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
  price_ctv NUMERIC DEFAULT 0,
  price_si NUMERIC DEFAULT 0,
  default_duration_days INTEGER DEFAULT 30,
  max_slots INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration nếu bảng products đã tồn tại:
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS price_ctv NUMERIC DEFAULT 0;
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS price_si NUMERIC DEFAULT 0;

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
  batch_ref TEXT DEFAULT NULL,
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

-- ==========================================
-- ENTERPRISE ERP & FINANCIAL ACCOUNTING EXPANSION
-- ==========================================

-- Block 14: Bảng purchases (Phiếu Nhập Hàng & Mua Kho Trọn Gói)
CREATE TABLE IF NOT EXISTS purchases (
  id BIGSERIAL PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT DEFAULT '',
  team_id BIGINT REFERENCES teams(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  import_cost NUMERIC NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost NUMERIC GENERATED ALWAYS AS (CASE WHEN quantity > 0 THEN import_cost / quantity ELSE 0 END) STORED,
  payment_status TEXT CHECK (payment_status IN ('PAID', 'DEBT')) DEFAULT 'PAID',
  payment_date DATE DEFAULT CURRENT_DATE,
  purchase_date DATE DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration cho teams:
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS import_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_paid_to_supplier BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS purchase_id BIGINT REFERENCES purchases(id);

-- Block 15: Bảng cash_transactions (Sổ Quỹ Thu Chi & Dòng Tiền)
CREATE TABLE IF NOT EXISTS cash_transactions (
  id BIGSERIAL PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('INCOME', 'EXPENSE')) NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  account_type TEXT DEFAULT 'BANK', -- 'CASH', 'BANK'
  reference_type TEXT DEFAULT '',   -- 'ORDER', 'PURCHASE', 'PAYROLL', 'EXPENSE', 'MANUAL'
  reference_id TEXT DEFAULT '',
  counterpart_name TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  transaction_date DATE DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Block 16: Bảng expenses (Quản Lý Chi Phí Doanh Nghiệp OPEX)
CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  expense_type TEXT CHECK (expense_type IN ('FIXED', 'VARIABLE')) NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  recurrence TEXT DEFAULT 'ONE_TIME', -- 'ONE_TIME', 'MONTHLY', 'YEARLY'
  expense_date DATE DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  is_paid BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Block 17: Bảng staff_members (Hồ Sơ Nhân Sự & Cơ Chế Lương/Hoa Hồng)
CREATE TABLE IF NOT EXISTS staff_members (
  id BIGSERIAL PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  role TEXT DEFAULT 'Sale',
  base_salary NUMERIC DEFAULT 0,
  commission_type TEXT DEFAULT 'PERCENT', -- 'PERCENT', 'FIXED_PER_ORDER'
  commission_rate NUMERIC DEFAULT 0,     -- % hoa hồng trên doanh thu (VD: 5 = 5%)
  commission_fixed NUMERIC DEFAULT 0,    -- tiền cố định/đơn (VD: 5000)
  status TEXT DEFAULT 'ACTIVE',
  joined_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Block 18: Bảng payroll_records (Bảng Tính Lương & Hoa Hồng Hằng Tháng)
CREATE TABLE IF NOT EXISTS payroll_records (
  id BIGSERIAL PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  staff_id BIGINT NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  staff_name TEXT NOT NULL,
  month_period TEXT NOT NULL,            -- 'YYYY-MM'
  base_salary NUMERIC DEFAULT 0,
  orders_count INTEGER DEFAULT 0,
  revenue_generated NUMERIC DEFAULT 0,
  commission_amount NUMERIC DEFAULT 0,
  bonus_kpi NUMERIC DEFAULT 0,
  advance_deduction NUMERIC DEFAULT 0,
  net_salary NUMERIC GENERATED ALWAYS AS (base_salary + commission_amount + bonus_kpi - advance_deduction) STORED,
  status TEXT DEFAULT 'DRAFT',           -- 'DRAFT', 'CONFIRMED', 'PAID'
  paid_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies cho các bảng mới
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop isolation - purchases" ON purchases
  FOR ALL USING (shop_id = get_my_shop_id());

CREATE POLICY "Shop isolation - cash_transactions" ON cash_transactions
  FOR ALL USING (shop_id = get_my_shop_id());

CREATE POLICY "Shop isolation - expenses" ON expenses
  FOR ALL USING (shop_id = get_my_shop_id());

CREATE POLICY "Shop isolation - staff_members" ON staff_members
  FOR ALL USING (shop_id = get_my_shop_id());

CREATE POLICY "Shop isolation - payroll_records" ON payroll_records
  FOR ALL USING (shop_id = get_my_shop_id());

-- ==========================================
-- DIGITAL INVENTORY MANAGEMENT 360°
-- ==========================================

-- Migration cho products: Thêm ngưỡng cảnh báo tồn kho tối thiểu
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock_alert INTEGER DEFAULT 5;

-- Block 19: Bảng inventory_items (Kho Key / License / Account Rời & Slot Số)
CREATE TABLE IF NOT EXISTS inventory_items (
  id BIGSERIAL PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  category TEXT DEFAULT '',
  asset_type TEXT CHECK (asset_type IN ('SINGLE_KEY', 'ACCOUNT', 'INVITE_LINK', 'SLOT_SEAT')) DEFAULT 'SINGLE_KEY',
  item_code TEXT NOT NULL,            -- Email|Pass, License Key, Invite URL
  cost_price NUMERIC DEFAULT 0,       -- Giá vốn nhập của item
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT DEFAULT '',
  purchase_id BIGINT REFERENCES purchases(id) ON DELETE SET NULL,
  team_id BIGINT REFERENCES teams(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('AVAILABLE', 'SOLD', 'RESERVED', 'FAULTY', 'SUPPLIER_CLAIM', 'EXPIRED')) DEFAULT 'AVAILABLE',
  order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT DEFAULT '',
  import_date DATE DEFAULT CURRENT_DATE,
  sold_date DATE,
  activation_deadline DATE,          -- Hạn chót kích hoạt (nếu có)
  expire_date DATE,                  -- Hạn dùng của tài khoản
  faulty_reason TEXT DEFAULT '',     -- Lý do lỗi (khi chuyển FAULTY)
  supplier_claim_status TEXT DEFAULT '', -- 'PENDING_CLAIM', 'REFUNDED', 'REPLACED'
  notes TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index tối ưu tốc độ bốc key FIFO cực nhanh
CREATE INDEX IF NOT EXISTS idx_inv_fifo ON inventory_items (shop_id, product_name, status, import_date ASC);

-- Block 20: Bảng inventory_logs (Sổ Nhật Ký Luân Chuyển Kho 360°)
CREATE TABLE IF NOT EXISTS inventory_logs (
  id BIGSERIAL PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  inventory_item_id BIGINT REFERENCES inventory_items(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,         -- 'IMPORT', 'EXPORT_POS', 'RESTOCK', 'WARRANTY_FAULTY', 'SUPPLIER_EXCHANGE'
  product_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_cost NUMERIC DEFAULT 0,
  reference_id TEXT DEFAULT '',      -- order_id, purchase_id, warranty_id
  performed_by TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Isolation cho Inventory
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop isolation - inventory_items" ON inventory_items FOR ALL USING (shop_id = get_my_shop_id());
CREATE POLICY "Shop isolation - inventory_logs" ON inventory_logs FOR ALL USING (shop_id = get_my_shop_id());



-- Index for fast batch lookup
CREATE INDEX IF NOT EXISTS idx_orders_batch_ref ON orders(shop_id, batch_ref);
