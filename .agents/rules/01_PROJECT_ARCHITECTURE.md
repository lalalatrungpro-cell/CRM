# DROPSHIP CRM - SYSTEM ARCHITECTURE & DATA MAP

## 🗺️ Page Structure & Module Responsibilities

| Page File | Route | Core Responsibility |
|---|---|---|
| `Orders.jsx` | `/orders` | Main POS Order Engine, 360° Order Detail, Composite VietQR PNG generator, 1-Click Zalo text export, Edit Account Modal, Warranty & Replacement. |
| `Customers.jsx` | `/customers` | 360° Customer Profile (Type: Lẻ/CTV/Sỉ, Channel Source, Sub-Channel), Total Spend (LTV), Receivables. |
| `CustomerDetail.jsx` | `/customers/:id` | Individual customer order history, accounting statement, 7-column invoice printing. |
| `Products.jsx` | `/products` | Digital Product catalog, default duration days, default sell & cost price, dynamic category management. |
| `Suppliers.jsx` | `/suppliers` | Wholesale Supplier catalog, payables debt, contact info, total accounts supplied. |
| `SupplierDetail.jsx` | `/suppliers/:id` | Supplier supply history, payables ledger, 7-column supplier accounting statement. |
| `Teams.jsx` | `/teams` | Team Account Inventory (Canva/Google/Office slots), max slot allocation, slot usage tracking. |
| `ExpiringAccounts.jsx` | `/expiring` | Expiring account alert engine (🔴 Expired, 🟡 Expiring in 7 days, 🟢 Active), 1-click renewal prompt. |
| `Debt.jsx` | `/debt` | 2-way Debt Management (Customer Receivables & Supplier Payables), 7-column accounting invoice generator (Print A4 / PDF). |
| `Settings.jsx` | `/settings` | VietQR Bank Receiver Configuration, Sub-channel/Page management. |
| `Dashboard.jsx` | `/` | Revenue & Net Profit KPI metrics, charts, sales breakdown by channel. |

## 💾 Dual-Sync Data Architecture
- **Supabase Cloud Database**: Remote PostgreSQL database (`customers`, `products`, `orders`, `suppliers`, `teams`, `care_logs`, `warranty_logs`, `channels`, `vietqr_settings`).
- **Local Persistence Fallback (`localStorage`)**: Offline fallback guaranteeing zero data loss across F5 page refreshes even if Supabase is offline or unconfigured.
