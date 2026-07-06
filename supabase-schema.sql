-- =============================================
-- CLIENT RUBY - Database Schema
-- Copy paste ini ke Supabase SQL Editor
-- =============================================

-- 1. Tabel Users (profiles)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'owner', 'gudang', 'sales')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile saat signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Tabel Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  purchase_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  stock NUMERIC(15,2) NOT NULL DEFAULT 0,
  warehouse TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT,
  address TEXT,
  contact_person TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabel Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabel Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'received', 'completed')),
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabel Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  qty NUMERIC(15,2) NOT NULL DEFAULT 0,
  price NUMERIC(15,2) NOT NULL DEFAULT 0
);

-- 8. Tabel Sales Orders
CREATE TABLE IF NOT EXISTS sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'invoiced', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tabel Sales Order Items
CREATE TABLE IF NOT EXISTS sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  qty NUMERIC(15,2) NOT NULL DEFAULT 0,
  price NUMERIC(15,2) NOT NULL DEFAULT 0
);

-- 10. Tabel Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  sales_order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax NUMERIC(15,2) NOT NULL DEFAULT 0,
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'partial', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Tabel Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  qty NUMERIC(15,2) NOT NULL DEFAULT 0,
  price NUMERIC(15,2) NOT NULL DEFAULT 0
);

-- 12. Tabel Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Tabel Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
  qty NUMERIC(15,2) NOT NULL DEFAULT 0,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_sales_order ON sales_order_items(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Helper function: get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if admin or owner
CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() IN ('admin', 'owner');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if can manage master data (admin, owner, sales)
CREATE OR REPLACE FUNCTION public.can_manage_master()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() IN ('admin', 'owner', 'sales');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if can manage stock (admin, owner, gudang)
CREATE OR REPLACE FUNCTION public.can_manage_stock()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() IN ('admin', 'owner', 'gudang');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if can manage sales (admin, owner, sales)
CREATE OR REPLACE FUNCTION public.can_manage_sales()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() IN ('admin', 'owner', 'sales');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if can manage purchases (admin, owner)
CREATE OR REPLACE FUNCTION public.can_manage_purchases()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() IN ('admin', 'owner');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if can view reports (admin, owner)
CREATE OR REPLACE FUNCTION public.can_view_reports()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() IN ('admin', 'owner');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================
-- RLS POLICIES (drop first agar bisa dijalankan ulang)
-- =============================================

-- Users table
DROP POLICY IF EXISTS "Authenticated users can view users" ON users;
DROP POLICY IF EXISTS "Admin can manage users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Authenticated users can view users" ON users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can manage users" ON users FOR ALL USING (public.is_admin_or_owner());
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Categories (admin, owner, sales can manage)
DROP POLICY IF EXISTS "View categories" ON categories;
DROP POLICY IF EXISTS "Manage categories" ON categories;
CREATE POLICY "View categories" ON categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage categories" ON categories FOR ALL USING (public.can_manage_master());

-- Products (admin, owner, sales can manage; gudang can view)
DROP POLICY IF EXISTS "View products" ON products;
DROP POLICY IF EXISTS "Manage products" ON products;
CREATE POLICY "View products" ON products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage products" ON products FOR ALL USING (public.can_manage_master());

-- Suppliers (admin, owner, sales can manage)
DROP POLICY IF EXISTS "View suppliers" ON suppliers;
DROP POLICY IF EXISTS "Manage suppliers" ON suppliers;
CREATE POLICY "View suppliers" ON suppliers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage suppliers" ON suppliers FOR ALL USING (public.can_manage_master());

-- Customers (admin, owner, sales can manage)
DROP POLICY IF EXISTS "View customers" ON customers;
DROP POLICY IF EXISTS "Manage customers" ON customers;
CREATE POLICY "View customers" ON customers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage customers" ON customers FOR ALL USING (public.can_manage_master());

-- Purchase Orders (admin, owner can manage)
DROP POLICY IF EXISTS "View purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "Manage purchase_orders" ON purchase_orders;
CREATE POLICY "View purchase_orders" ON purchase_orders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage purchase_orders" ON purchase_orders FOR ALL USING (public.can_manage_purchases());

-- Purchase Order Items
DROP POLICY IF EXISTS "View purchase_order_items" ON purchase_order_items;
DROP POLICY IF EXISTS "Manage purchase_order_items" ON purchase_order_items;
CREATE POLICY "View purchase_order_items" ON purchase_order_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage purchase_order_items" ON purchase_order_items FOR ALL USING (public.can_manage_purchases());

-- Sales Orders (admin, owner, sales can manage)
DROP POLICY IF EXISTS "View sales_orders" ON sales_orders;
DROP POLICY IF EXISTS "Manage sales_orders" ON sales_orders;
CREATE POLICY "View sales_orders" ON sales_orders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage sales_orders" ON sales_orders FOR ALL USING (public.can_manage_sales());

-- Sales Order Items
DROP POLICY IF EXISTS "View sales_order_items" ON sales_order_items;
DROP POLICY IF EXISTS "Manage sales_order_items" ON sales_order_items;
CREATE POLICY "View sales_order_items" ON sales_order_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage sales_order_items" ON sales_order_items FOR ALL USING (public.can_manage_sales());

-- Invoices (admin, owner, sales can manage)
DROP POLICY IF EXISTS "View invoices" ON invoices;
DROP POLICY IF EXISTS "Manage invoices" ON invoices;
CREATE POLICY "View invoices" ON invoices FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage invoices" ON invoices FOR ALL USING (public.can_manage_sales());

-- Invoice Items
DROP POLICY IF EXISTS "View invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "Manage invoice_items" ON invoice_items;
CREATE POLICY "View invoice_items" ON invoice_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage invoice_items" ON invoice_items FOR ALL USING (public.can_manage_sales());

-- Payments (admin, owner, sales can manage)
DROP POLICY IF EXISTS "View payments" ON payments;
DROP POLICY IF EXISTS "Manage payments" ON payments;
CREATE POLICY "View payments" ON payments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage payments" ON payments FOR ALL USING (public.can_manage_sales());

-- Stock Movements (admin, owner, gudang can manage)
DROP POLICY IF EXISTS "View stock_movements" ON stock_movements;
DROP POLICY IF EXISTS "Manage stock_movements" ON stock_movements;
CREATE POLICY "View stock_movements" ON stock_movements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage stock_movements" ON stock_movements FOR ALL USING (public.can_manage_stock());
