export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "owner" | "gudang" | "sales";
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category_id: string;
  unit: string;
  purchase_price: number;
  selling_price: number;
  stock: number;
  warehouse: string;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  contact_person: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  supplier_id: string;
  date: string;
  status: "draft" | "approved" | "received" | "completed";
  total: number;
  created_at: string;
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  qty: number;
  price: number;
  product?: Product;
}

export interface SalesOrderItem {
  id: string;
  sales_order_id: string;
  product_id: string;
  qty: number;
  price: number;
  product?: Product;
}

export interface SalesOrder {
  id: string;
  number: string;
  customer_id: string;
  date: string;
  status: "draft" | "confirmed" | "invoiced" | "completed";
  total: number;
  created_at: string;
  customer?: Customer;
  items?: SalesOrderItem[];
}

export interface Invoice {
  id: string;
  number: string;
  sales_order_id: string | null;
  customer_id: string;
  date: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: "draft" | "partial" | "paid" | "cancelled";
  created_at: string;
  customer?: Customer;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string;
  qty: number;
  price: number;
  product?: Product;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: string;
  date: string;
  notes: string | null;
  created_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  type: "in" | "out" | "adjustment";
  qty: number;
  reference: string | null;
  notes: string | null;
  created_at: string;
  product?: Product;
}
