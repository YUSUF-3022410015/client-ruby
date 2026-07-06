-- =============================================
-- MIGRATION FIX: Drop & recreate all RLS policies
-- Jalankan ini jika tabel sudah ada tapi policies bermasalah
-- =============================================

-- Helper functions (CREATE OR REPLACE = safe untuk dijalankan ulang)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() IN ('admin', 'owner');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.can_manage_master()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() IN ('admin', 'owner', 'sales');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.can_manage_stock()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() IN ('admin', 'owner', 'gudang');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.can_manage_sales()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() IN ('admin', 'owner', 'sales');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.can_manage_purchases()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() IN ('admin', 'owner');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.can_view_reports()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() IN ('admin', 'owner');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Enable RLS (idempotent)
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

-- Users
DROP POLICY IF EXISTS "Authenticated users can view users" ON users;
DROP POLICY IF EXISTS "Admin can manage users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Authenticated users can view users" ON users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can manage users" ON users FOR ALL USING (public.is_admin_or_owner());
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Categories
DROP POLICY IF EXISTS "View categories" ON categories;
DROP POLICY IF EXISTS "Manage categories" ON categories;
CREATE POLICY "View categories" ON categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage categories" ON categories FOR ALL USING (public.can_manage_master());

-- Products
DROP POLICY IF EXISTS "View products" ON products;
DROP POLICY IF EXISTS "Manage products" ON products;
CREATE POLICY "View products" ON products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage products" ON products FOR ALL USING (public.can_manage_master());

-- Suppliers
DROP POLICY IF EXISTS "View suppliers" ON suppliers;
DROP POLICY IF EXISTS "Manage suppliers" ON suppliers;
CREATE POLICY "View suppliers" ON suppliers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage suppliers" ON suppliers FOR ALL USING (public.can_manage_master());

-- Customers
DROP POLICY IF EXISTS "View customers" ON customers;
DROP POLICY IF EXISTS "Manage customers" ON customers;
CREATE POLICY "View customers" ON customers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage customers" ON customers FOR ALL USING (public.can_manage_master());

-- Purchase Orders
DROP POLICY IF EXISTS "View purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "Manage purchase_orders" ON purchase_orders;
CREATE POLICY "View purchase_orders" ON purchase_orders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage purchase_orders" ON purchase_orders FOR ALL USING (public.can_manage_purchases());

-- Purchase Order Items
DROP POLICY IF EXISTS "View purchase_order_items" ON purchase_order_items;
DROP POLICY IF EXISTS "Manage purchase_order_items" ON purchase_order_items;
CREATE POLICY "View purchase_order_items" ON purchase_order_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage purchase_order_items" ON purchase_order_items FOR ALL USING (public.can_manage_purchases());

-- Sales Orders
DROP POLICY IF EXISTS "View sales_orders" ON sales_orders;
DROP POLICY IF EXISTS "Manage sales_orders" ON sales_orders;
CREATE POLICY "View sales_orders" ON sales_orders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage sales_orders" ON sales_orders FOR ALL USING (public.can_manage_sales());

-- Sales Order Items
DROP POLICY IF EXISTS "View sales_order_items" ON sales_order_items;
DROP POLICY IF EXISTS "Manage sales_order_items" ON sales_order_items;
CREATE POLICY "View sales_order_items" ON sales_order_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage sales_order_items" ON sales_order_items FOR ALL USING (public.can_manage_sales());

-- Invoices
DROP POLICY IF EXISTS "View invoices" ON invoices;
DROP POLICY IF EXISTS "Manage invoices" ON invoices;
CREATE POLICY "View invoices" ON invoices FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage invoices" ON invoices FOR ALL USING (public.can_manage_sales());

-- Invoice Items
DROP POLICY IF EXISTS "View invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "Manage invoice_items" ON invoice_items;
CREATE POLICY "View invoice_items" ON invoice_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage invoice_items" ON invoice_items FOR ALL USING (public.can_manage_sales());

-- Payments
DROP POLICY IF EXISTS "View payments" ON payments;
DROP POLICY IF EXISTS "Manage payments" ON payments;
CREATE POLICY "View payments" ON payments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage payments" ON payments FOR ALL USING (public.can_manage_sales());

-- Stock Movements
DROP POLICY IF EXISTS "View stock_movements" ON stock_movements;
DROP POLICY IF EXISTS "Manage stock_movements" ON stock_movements;
CREATE POLICY "View stock_movements" ON stock_movements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage stock_movements" ON stock_movements FOR ALL USING (public.can_manage_stock());
