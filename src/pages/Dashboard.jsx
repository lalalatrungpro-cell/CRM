import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  OrderService, CustomerService, SupplierService,
  CashTransactionService, ExpenseService, PayrollService, PurchaseService, InventoryService, TeamService
} from '../utils/dataService';
import {
  DollarSign, TrendingUp, Download, Wallet, Landmark,
  Building, Megaphone, Users, ArrowDownRight, ArrowUpRight,
  ShieldCheck, AlertTriangle, CheckCircle2, PieChart, BarChart3, RefreshCw, Boxes,
  Crown, ShoppingBag, Flame, ArrowRight, ExternalLink, ShieldAlert, Clock
} from 'lucide-react';

const SOURCE_CONFIG = {
  'Facebook Page': { label: 'FB Page', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', icon: '🌐' },
  'Zalo': { label: 'Zalo', color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: '💬' },
  'TikTok Shop': { label: 'TikTok', color: '#ec4899', bg: 'rgba(236,72,153,0.15)', icon: '🎵' },
  'Telegram': { label: 'Telegram', color: '#0ea5e9', bg: 'rgba(14,165,233,0.15)', icon: '✈️' },
  'Giới Thiệu': { label: 'Giới Thiệu', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: '🤝' },
  'Website': { label: 'Website', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', icon: '💻' },
  'Khác': { label: 'Khác', color: '#64748b', bg: 'rgba(100,116,139,0.15)', icon: '📌' }
};

export default function Dashboard() {
  const { shopId } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [cashSummary, setCashSummary] = useState({ totalIncome: 0, totalExpense: 0, netBalance: 0, cashBalance: 0, bankBalance: 0 });
  const [opexSummary, setOpexSummary] = useState({ totalFixed: 0, totalVariable: 0, totalOpex: 0 });
  const [payrolls, setPayrolls] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [inventorySummary, setInventorySummary] = useState({ availableCount: 0, totalInventoryValue: 0 });
  const [teams, setTeams] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [productSortMode, setProductSortMode] = useState('REVENUE'); // 'REVENUE' | 'QTY' | 'PROFIT'
  const [loading, setLoading] = useState(true);

  // ── Date Range Filter State ──
  const [datePreset, setDatePreset] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleApplyDatePreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (preset === 'LAST_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (preset === 'THIS_QUARTER') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const firstDay = new Date(now.getFullYear(), qMonth, 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), qMonth + 3, 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (preset === 'THIS_YEAR') {
      setStartDate(`${now.getFullYear()}-01-01`);
      setEndDate(`${now.getFullYear()}-12-31`);
    }
  };

  const loadData = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [oList, cList, sList, cSum, oSum, pList, purList, invSum, tList, itemsList] = await Promise.all([
        OrderService.list(shopId),
        CustomerService.list(shopId),
        SupplierService.list(shopId),
        CashTransactionService.getBalanceSummary(shopId),
        ExpenseService.getOpexSummary(shopId),
        PayrollService.list(shopId),
        PurchaseService.list(shopId),
        InventoryService.getSummary(shopId),
        TeamService.list(shopId),
        InventoryService.list(shopId)
      ]);
      setOrders(oList || []);
      setCustomers(cList || []);
      setSuppliers(sList || []);
      setCashSummary(cSum || { totalIncome: 0, totalExpense: 0, netBalance: 0, cashBalance: 0, bankBalance: 0 });
      setOpexSummary(oSum || { totalFixed: 0, totalVariable: 0, totalOpex: 0 });
      setPayrolls(pList || []);
      setPurchases(purList || []);
      setInventorySummary(invSum || { availableCount: 0, totalInventoryValue: 0 });
      setTeams(tList || []);
      setInventoryItems(itemsList || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [shopId]);

  // Financial Calculations & Date Range Filter
  const isDateInRange = (dateStr) => {
    if (!startDate && !endDate) return true;
    if (!dateStr) return true;
    const d = String(dateStr).split('T')[0];
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  };

  const filteredOrders = orders.filter(o => isDateInRange(o.purchase_date || o.purchaseDate));
  const paidOrders = filteredOrders.filter(o => o.status !== 'Từ chối bảo hành' && !String(o.status || '').includes('100%'));

  const totalRevenue = paidOrders.reduce((sum, o) => {
    const sellP = Number(o.sell_price || o.sellPrice || 0);
    const refP = Number(o.refund_amount || 0);
    return sum + Math.max(0, sellP - refP);
  }, 0);

  const totalCogs = paidOrders.reduce((sum, o) => sum + Number(o.cost_price || o.costPrice || 0), 0);
  const grossProfit = totalRevenue - totalCogs;
  const grossMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

  // OPEX components
  const filteredPayrolls = payrolls.filter(p => isDateInRange(p.payment_date || p.created_at));
  const totalPayrollPaid = filteredPayrolls.filter(p => p.status === 'PAID').reduce((sum, p) => sum + Number(p.net_salary || 0), 0);
  const totalOpexExpenses = opexSummary.totalOpex;
  const totalOperatingCost = totalOpexExpenses + totalPayrollPaid;

  // Real Net Profit
  const realNetProfit = grossProfit - totalOperatingCost;
  const netMargin = totalRevenue > 0 ? Math.round((realNetProfit / totalRevenue) * 100) : 0;

  // Debt Metrics
  const totalCustomerDebt = customers.reduce((sum, c) => sum + Number(c.debt || 0), 0);
  const totalSupplierDebt = suppliers.reduce((sum, s) => sum + Number(s.debt || 0), 0);

  // Customer Loyalty
  const repeatCustomersCount = customers.filter(c => {
    const custOrders = orders.filter(o => String(o.customer_id || o.customerId) === String(c.id));
    return custOrders.length >= 2;
  }).length;
  const repeatRate = customers.length > 0 ? Math.round((repeatCustomersCount / customers.length) * 100) : 0;

  // Channel Analytics
  const channelAnalytics = Object.keys(SOURCE_CONFIG).map(sourceKey => {
    const sourceOrders = paidOrders.filter(o => {
      const mainSrc = o.source || '';
      const fullChan = o.channel || '';
      return mainSrc === sourceKey || fullChan.startsWith(sourceKey) || (sourceKey === 'Khác' && !mainSrc && !fullChan);
    });

    const revenue = sourceOrders.reduce((sum, o) => sum + Math.max(0, Number(o.sell_price || o.sellPrice || 0) - Number(o.refund_amount || 0)), 0);
    const count = sourceOrders.length;
    const percentage = totalRevenue > 0 ? ((revenue / totalRevenue) * 100).toFixed(1) : 0;

    return {
      sourceKey,
      ...SOURCE_CONFIG[sourceKey],
      revenue,
      count,
      percentage
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // Tier analytics: Lẻ / CTV / Sỉ breakdown
  const TIER_CONFIG = {
    'Le':  { label: 'Khách Lẻ',  icon: '🟢', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    'CTV': { label: 'CTV',       icon: '🟡', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    'Si':  { label: 'Khách Sỉ',  icon: '🟣', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  };
  const tierAnalytics = Object.entries(TIER_CONFIG).map(([tierKey, cfg]) => {
    const tierCustomers = customers.filter(c => (c.type || 'Le') === tierKey);
    const tierCustIds = new Set(tierCustomers.map(c => String(c.id)));
    const tierOrders = paidOrders.filter(o => tierCustIds.has(String(o.customer_id || o.customerId || '')));
    const revenue = tierOrders.reduce((s, o) => s + Math.max(0, Number(o.sell_price || o.sellPrice || 0) - Number(o.refund_amount || 0)), 0);
    const profit = tierOrders.reduce((s, o) => s + Math.max(0, Number(o.sell_price || o.sellPrice || 0) - Number(o.refund_amount || 0) - Number(o.cost_price || o.costPrice || 0)), 0);
    return { tierKey, ...cfg, count: tierOrders.length, customers: tierCustomers.length, revenue, profit };
  });

  // Top Products & Real-time Inventory Health Aggregation
  const productMap = {};
  paidOrders.forEach(o => {
    const rawName = o.product_name || o.productName || 'Sản phẩm khác';
    const name = rawName.trim();
    if (!productMap[name]) {
      productMap[name] = { name, count: 0, revenue: 0, cogs: 0, profit: 0 };
    }
    const rev = Math.max(0, Number(o.sell_price || o.sellPrice || 0) - Number(o.refund_amount || 0));
    const cost = Number(o.cost_price || o.costPrice || 0);
    productMap[name].count += 1;
    productMap[name].revenue += rev;
    productMap[name].cogs += cost;
    productMap[name].profit += (rev - cost);
  });

  const productList = Object.values(productMap).map(p => {
    const singleAvail = (inventoryItems || []).filter(i =>
      i.status === 'AVAILABLE' &&
      (i.product_name || i.productName || '').toLowerCase().includes(p.name.toLowerCase())
    ).length;

    let teamAvailSlots = 0;
    (teams || []).forEach(t => {
      if (t.status !== 'FAULTY_DIE' && !t.replaced_by_team_name && !t.replaced_by_team_id) {
        const cat = t.category || '';
        if (p.name.toLowerCase().includes(cat.toLowerCase()) || cat.toLowerCase().includes(p.name.toLowerCase())) {
          const maxS = t.max_slots || t.maxSlots || 49;
          const usedS = (orders || []).filter(o => String(o.team_id || o.teamId) === String(t.id)).length;
          teamAvailSlots += Math.max(0, maxS - usedS);
        }
      }
    });

    const totalStock = singleAvail + teamAvailSlots;
    return { ...p, stock: totalStock };
  });

  if (productSortMode === 'QTY') {
    productList.sort((a, b) => b.count - a.count);
  } else if (productSortMode === 'PROFIT') {
    productList.sort((a, b) => b.profit - a.profit);
  } else {
    productList.sort((a, b) => b.revenue - a.revenue);
  }
  const top5Products = productList.slice(0, 5);

  // Top 5 VIP Customers (LTV Leaderboard)
  const customerLTVMap = {};
  paidOrders.forEach(o => {
    const custId = String(o.customer_id || o.customerId || '');
    const custName = o.customer_name || o.customerName || 'Khách Vãng Lai';
    const key = custId || custName;
    if (!customerLTVMap[key]) {
      customerLTVMap[key] = {
        id: custId,
        name: custName,
        phone: o.phone || '',
        totalSpent: 0,
        orderCount: 0,
        type: 'Le'
      };
    }
    const rev = Math.max(0, Number(o.sell_price || o.sellPrice || 0) - Number(o.refund_amount || 0));
    customerLTVMap[key].totalSpent += rev;
    customerLTVMap[key].orderCount += 1;
  });

  const top5VIPCustomers = Object.values(customerLTVMap).map(c => {
    const found = customers.find(cust => String(cust.id) === String(c.id) || cust.name === c.name);
    return {
      ...c,
      phone: found ? (found.phone || c.phone) : c.phone,
      type: found ? (found.type || 'Le') : 'Le',
      debt: found ? Number(found.debt || 0) : 0
    };
  }).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

  // Realtime 360° Actionable Alert Center
  const todayStr = new Date().toISOString().split('T')[0];
  const in7DaysStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const deadTeamsAlert = (teams || []).filter(t => (t.status === 'FAULTY_DIE' || t.status === 'DIE') && !t.replaced_by_team_name && !t.replaced_by_team_id);
  const expiringOrdersAlert = (orders || []).filter(o => {
    const exp = o.expire_date || o.expireDate;
    return exp && exp >= todayStr && exp <= in7DaysStr;
  });
  const debtorCustomersAlert = (customers || []).filter(c => Number(c.debt || 0) > 0);
  const outOfStockProducts = productList.filter(p => p.stock === 0 || p.stock <= 3);

  const handleExportPnL = () => {
    const lines = [
      ['BÁO CÁO KẾT QUẢ KINH DOANH & TÀI CHÍNH DOANH NGHIỆP (P&L STATEMENT)', ''],
      ['Ngày xuất báo cáo:', new Date().toLocaleDateString('vi-VN')],
      ['', ''],
      ['1. DOANH THU THUẦN BÁN HÀNG', totalRevenue],
      ['2. GIÁ VỐN HÀNG BÁN (COGS)', -totalCogs],
      ['3. LỢI NHUẬN GỘP (GROSS PROFIT)', grossProfit],
      ['Biên lãi gộp (%):', grossMargin + '%'],
      ['', ''],
      ['4. CHI PHÍ VẬN HÀNH (OPEX)', -totalOperatingCost],
      ['  - Chi phí Cố định (Mặt bằng, VPS, Tool):', -opexSummary.totalFixed],
      ['  - Chi phí Biến động (Ads, Marketing):', -opexSummary.totalVariable],
      ['  - Chi phí Lương nhân viên & Hoa hồng:', -totalPayrollPaid],
      ['', ''],
      ['5. LÃI RÒNG THỰC TẾ DOANH NGHIỆP (NET PROFIT)', realNetProfit],
      ['Biên lãi ròng (%):', netMargin + '%'],
      ['', ''],
      ['6. SỐ DƯ QUỸ HIỆN TẠI', cashSummary.netBalance],
      ['  - Quỹ Ngân Hàng:', cashSummary.bankBalance],
      ['  - Quỹ Tiền Mặt:', cashSummary.cashBalance],
      ['7. CÔNG NỢ PHẢI THU (Khách nợ):', totalCustomerDebt],
      ['8. CÔNG NỢ PHẢI TRẢ (Nợ NCC):', totalSupplierDebt]
    ];

    const csvContent = '\uFEFF' + lines.map(row => row.join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
    link.setAttribute('download', 'Bao_Cao_Tai_Chinh_PnL_' + new Date().toISOString().split('T')[0] + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fmtShort = (n) => {
    const abs = Math.abs(n || 0);
    if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace('.0','') + 'B';
    if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0','') + 'M';
    if (abs >= 1_000) return (n / 1_000).toFixed(0) + 'K';
    return Number(n || 0).toLocaleString('vi-VN');
  };
  const fmt = (n) => Number(n || 0).toLocaleString('vi-VN');

  const getInitials = (name) => (name || '?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const AVATAR_COLORS = ['#6366f1','#10b981','#f59e0b','#ec4899','#0ea5e9','#a855f7','#ef4444'];
  const getAvatarColor = (name) => AVATAR_COLORS[(name||'').charCodeAt(0) % AVATAR_COLORS.length];

  const hasAlerts = deadTeamsAlert.length > 0 || expiringOrdersAlert.length > 0 || outOfStockProducts.length > 0 || debtorCustomersAlert.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }} className="animate-fade-in">

      {/* ══════════ HEADER SECTION ══════════ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.03em', margin: 0, background: 'linear-gradient(135deg,#ffffff 30%,#94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              📊 Command Center 360°
            </h1>
            {hasAlerts && (
              <span style={{ position: 'relative', display: 'inline-flex', width: '10px', height: '10px' }}>
                <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#ef4444', animation: 'ping 1.5s cubic-bezier(0,0,.2,1) infinite', opacity: 0.7 }} />
                <span style={{ position: 'relative', borderRadius: '50%', width: '10px', height: '10px', background: '#ef4444' }} />
              </span>
            )}
          </div>
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
            Toàn cảnh doanh nghiệp P&L · Cập nhật: {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="glass-button" onClick={loadData} title="Làm mới dữ liệu" style={{ padding: '9px 13px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px' }}>
            <RefreshCw size={16} />
          </button>
          <button className="glass-button" onClick={handleExportPnL} style={{ background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.35)', color: '#10b981', fontWeight: '700', fontSize: '13px', borderRadius: '10px', padding: '9px 16px', gap: '8px' }}>
            <Download size={16} /> Xuất P&L .csv
          </button>
        </div>
      </div>

      {/* ══════════ DATE FILTER TOOLBAR BAR ══════════ */}
      <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', gap: '5px', background: 'rgba(0,0,0,0.35)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { key: 'ALL', label: '🗓 Tất Cả', color: '#6366f1' },
            { key: 'THIS_MONTH', label: '📅 Tháng Này', color: '#10b981' },
            { key: 'LAST_MONTH', label: '↩ Tháng Trước', color: '#38bdf8' },
            { key: 'THIS_QUARTER', label: '📊 Quý Này', color: '#f59e0b' },
            { key: 'THIS_YEAR', label: '📆 Năm Nay', color: '#a855f7' },
          ].map(({ key, label, color }) => (
            <button key={key} onClick={() => handleApplyDatePreset(key)} style={{
              padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', border: 'none', transition: 'all .2s ease',
              background: datePreset === key ? color : 'transparent',
              color: datePreset === key ? '#ffffff' : '#64748b',
              boxShadow: datePreset === key ? `0 0 14px ${color}66` : 'none',
            }}>{label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Từ:</span>
          <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setDatePreset('CUSTOM'); }}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '6px 10px', color: '#94a3b8', fontSize: '12px', outline: 'none' }} />
          <span style={{ fontSize: '12px', color: '#64748b' }}>→</span>
          <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setDatePreset('CUSTOM'); }}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '6px 10px', color: '#94a3b8', fontSize: '12px', outline: 'none' }} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite' }} />
          Đang tải toàn cảnh dữ liệu CRM...
        </div>
      ) : (
        <>

          {/* ══════════ TẦNG 1: 4 HERO KPI CARDS ══════════ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>

            {/* Card 1: Doanh Thu Thuần */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(15,23,42,0.85) 100%)',
              border: '1px solid rgba(16,185,129,0.3)', borderRadius: '18px', padding: '22px',
              borderLeft: '4px solid #10b981', boxShadow: '0 8px 32px rgba(16,185,129,0.12)', position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '90px', height: '90px', background: 'radial-gradient(circle, rgba(16,185,129,0.2), transparent 70%)', borderRadius: '50%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Doanh Thu Thuần</span>
                <div style={{ background: 'rgba(16,185,129,0.2)', borderRadius: '10px', padding: '7px' }}><TrendingUp size={18} color="#10b981" /></div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.03em' }}>
                {fmt(totalRevenue)}<span style={{ fontSize: '15px', color: '#94a3b8', marginLeft: '3px' }}>đ</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>{paidOrders.length} đơn hàng trong kỳ chọn</div>
            </div>

            {/* Card 2: Lợi Nhuận Ròng */}
            <div style={{
              background: `linear-gradient(135deg, rgba(${realNetProfit >= 0 ? '99,102,241' : '239,68,68'},0.15) 0%, rgba(15,23,42,0.85) 100%)`,
              border: `1px solid rgba(${realNetProfit >= 0 ? '99,102,241' : '239,68,68'},0.3)`, borderRadius: '18px', padding: '22px',
              borderLeft: `4px solid ${realNetProfit >= 0 ? '#6366f1' : '#ef4444'}`, boxShadow: `0 8px 32px rgba(${realNetProfit >= 0 ? '99,102,241' : '239,68,68'},0.12)`, position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '90px', height: '90px', background: `radial-gradient(circle, rgba(${realNetProfit >= 0 ? '99,102,241' : '239,68,68'},0.2), transparent 70%)`, borderRadius: '50%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: realNetProfit >= 0 ? '#6366f1' : '#ef4444', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Lợi Nhuận Ròng</span>
                <div style={{ background: `rgba(${realNetProfit >= 0 ? '99,102,241' : '239,68,68'},0.2)`, borderRadius: '10px', padding: '7px' }}>
                  {realNetProfit >= 0 ? <ArrowUpRight size={18} color="#6366f1" /> : <ArrowDownRight size={18} color="#ef4444" />}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <div style={{ fontSize: '28px', fontWeight: '900', color: realNetProfit >= 0 ? '#818cf8' : '#ef4444', letterSpacing: '-0.03em' }}>
                  {realNetProfit >= 0 ? '+' : ''}{fmt(realNetProfit)}<span style={{ fontSize: '15px', marginLeft: '3px' }}>đ</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '6px', background: realNetProfit >= 0 ? 'rgba(99,102,241,0.25)' : 'rgba(239,68,68,0.25)', color: realNetProfit >= 0 ? '#818cf8' : '#ef4444' }}>{netMargin}%</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>Biên lãi gộp: {grossMargin}%</div>
            </div>

            {/* Card 3: Quỹ Tiền Mặt & Bank */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(56,189,248,0.15) 0%, rgba(15,23,42,0.85) 100%)',
              border: '1px solid rgba(56,189,248,0.3)', borderRadius: '18px', padding: '22px',
              borderLeft: '4px solid #38bdf8', boxShadow: '0 8px 32px rgba(56,189,248,0.12)', position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '90px', height: '90px', background: 'radial-gradient(circle, rgba(56,189,248,0.2), transparent 70%)', borderRadius: '50%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Quỹ Tiền Mặt & Bank</span>
                <div style={{ background: 'rgba(56,189,248,0.2)', borderRadius: '10px', padding: '7px' }}><Wallet size={18} color="#38bdf8" /></div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.03em' }}>
                {fmt(cashSummary.netBalance)}<span style={{ fontSize: '15px', color: '#94a3b8', marginLeft: '3px' }}>đ</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>🏦 Bank: {fmtShort(cashSummary.bankBalance)}đ · 💵 Két: {fmtShort(cashSummary.cashBalance)}đ</div>
            </div>

            {/* Card 4: Giá Trị Tồn Kho */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(15,23,42,0.85) 100%)',
              border: '1px solid rgba(168,85,247,0.3)', borderRadius: '18px', padding: '22px',
              borderLeft: '4px solid #a855f7', boxShadow: '0 8px 32px rgba(168,85,247,0.12)', position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '90px', height: '90px', background: 'radial-gradient(circle, rgba(168,85,247,0.2), transparent 70%)', borderRadius: '50%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Giá Trị Tồn Kho</span>
                <div style={{ background: 'rgba(168,85,247,0.2)', borderRadius: '10px', padding: '7px' }}><Boxes size={18} color="#a855f7" /></div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.03em' }}>
                {fmt(inventorySummary.totalInventoryValue || 0)}<span style={{ fontSize: '15px', color: '#94a3b8', marginLeft: '3px' }}>đ</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>{inventorySummary.availableCount || 0} key/slot sẵn sàng xuất bán</div>
            </div>

          </div>

          {/* ══════════ TẦNG 2: P&L + OPEX + DEBT/LOYALTY ══════════ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

            {/* P&L Income Statement Panel */}
            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '22px', backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DollarSign size={18} color="#10b981" /> Báo Cáo P&L (Kết Quả Kinh Doanh)
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: '① Doanh Thu Thuần', value: totalRevenue, color: '#10b981', sign: '' },
                  { label: '② Giá Vốn COGS', value: -totalCogs, color: '#ef4444', sign: '-' },
                  { label: '③ Lãi Gộp (Gross Profit)', value: grossProfit, color: '#38bdf8', sign: '', bold: true, separator: true },
                  { label: '④ Chi Phí OPEX', value: -totalOpexExpenses, color: '#f59e0b', sign: '-' },
                  { label: '⑤ Lương & Hoa Hồng', value: -totalPayrollPaid, color: '#f59e0b', sign: '-' },
                  { label: '⑥ LÃI RÒNG NET PROFIT', value: realNetProfit, color: realNetProfit >= 0 ? '#818cf8' : '#ef4444', sign: realNetProfit >= 0 ? '+' : '', bold: true, separator: true, big: true },
                ].map((row, i) => (
                  <div key={i}>
                    {row.separator && <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '6px', marginBottom: '10px' }} />}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '10px', background: row.big ? `rgba(${realNetProfit >= 0 ? '99,102,241' : '239,68,68'},0.12)` : 'rgba(255,255,255,0.02)', border: row.big ? `1px solid rgba(${realNetProfit >= 0 ? '99,102,241' : '239,68,68'},0.3)` : 'none' }}>
                      <span style={{ fontSize: row.big ? '14px' : '13px', color: row.big ? '#ffffff' : '#94a3b8', fontWeight: row.bold ? '800' : '500' }}>{row.label}</span>
                      <span style={{ fontSize: row.big ? '16px' : '13.5px', fontWeight: row.bold ? '900' : '700', color: row.color, fontVariantNumeric: 'tabular-nums' }}>{row.sign}{fmt(Math.abs(row.value))}đ</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* OPEX Cost Structure + Debt + Loyalty */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* OPEX */}
              <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '20px', backdropFilter: 'blur(16px)', flex: 1, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart3 size={16} color="#ef4444" /> Cơ Cấu Chi Phí Vận Hành (OPEX)
                </h3>
                {[
                  { label: 'Chi phí Cố định (Mặt bằng, VPS)', value: opexSummary.totalFixed, color: '#38bdf8', icon: <Building size={14} color="#38bdf8" /> },
                  { label: 'Chi phí Biến động (Ads, Marketing)', value: opexSummary.totalVariable, color: '#f59e0b', icon: <Megaphone size={14} color="#f59e0b" /> },
                  { label: 'Quỹ Lương & Hoa Hồng', value: totalPayrollPaid, color: '#10b981', icon: <Users size={14} color="#10b981" /> },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', marginBottom: '10px' }}>
                    <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>{item.icon}{item.label}</span>
                    <strong style={{ color: '#ffffff' }}>{fmt(item.value)}đ</strong>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '800' }}>
                  <span style={{ color: '#ef4444' }}>TỔNG OPEX:</span>
                  <span style={{ color: '#ef4444' }}>-{fmt(totalOperatingCost)}đ</span>
                </div>
              </div>

              {/* Debt + Loyalty Mini Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { label: 'Khách Nợ', value: fmt(totalCustomerDebt) + 'đ', color: '#f59e0b', icon: <ArrowDownRight size={16} />, sub: 'Phải Thu' },
                  { label: 'Nợ NCC', value: fmt(totalSupplierDebt) + 'đ', color: '#ef4444', icon: <ArrowUpRight size={16} />, sub: 'Phải Trả' },
                  { label: 'Tái Mua', value: repeatRate + '%', color: '#38bdf8', icon: <ShieldCheck size={16} />, sub: `${repeatCustomersCount}/${customers.length} KH` },
                ].map((s, i) => (
                  <div key={i} style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px', textAlign: 'center', borderTop: `3px solid ${s.color}`, backdropFilter: 'blur(16px)' }}>
                    <div style={{ color: s.color, display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>{s.icon}</div>
                    <div style={{ fontSize: '14px', fontWeight: '900', color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontWeight: '700' }}>{s.label}</div>
                    <div style={{ fontSize: '10.5px', color: '#64748b' }}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ══════════ TẦNG 3: TOP 5 PRODUCTS + TOP 5 VIP CUSTOMERS ══════════ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '16px' }}>

            {/* Top 5 Products Leaderboard */}
            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', overflow: 'hidden', backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '18px 20px', background: 'linear-gradient(90deg, rgba(245,158,11,0.15), transparent)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🔥 Top 5 Sản Phẩm Bán Chạy & Tồn Kho
                </h3>
                <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.35)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {[
                    { key: 'REVENUE', label: '💰 Doanh Thu' },
                    { key: 'QTY', label: '📦 Số Bán' },
                    { key: 'PROFIT', label: '📈 Lãi Gộp' },
                  ].map(({ key, label }) => (
                    <button key={key} onClick={() => setProductSortMode(key)} style={{
                      padding: '5px 10px', fontSize: '11px', fontWeight: '700', borderRadius: '7px', cursor: 'pointer', border: 'none', transition: 'all .15s',
                      background: productSortMode === key ? '#6366f1' : 'transparent',
                      color: productSortMode === key ? '#ffffff' : '#64748b',
                    }}>{label}</button>
                  ))}
                </div>
              </div>
              {top5Products.length === 0 ? (
                <div style={{ padding: '36px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Chưa có dữ liệu bán hàng trong kỳ này.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b', fontWeight: '600', width: '40px' }}>#</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: '600' }}>Sản Phẩm</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b', fontWeight: '600' }}>Đã Bán</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b', fontWeight: '600' }}>Doanh Thu</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b', fontWeight: '600' }}>Lãi Gộp</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b', fontWeight: '600' }}>Tồn Kho</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top5Products.map((p, idx) => {
                      const medals = ['🥇','🥈','🥉'];
                      const rank = idx < 3 ? medals[idx] : `#${idx+1}`;
                      const isOut = p.stock === 0;
                      const isLow = p.stock > 0 && p.stock <= 3;
                      return (
                        <tr key={p.name} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', transition: 'background .15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '12px 12px', textAlign: 'center', fontSize: idx === 0 ? '16px' : '13px', borderLeft: idx === 0 ? '4px solid #f59e0b' : '4px solid transparent' }}>{rank}</td>
                          <td style={{ padding: '12px 12px', fontWeight: '700', color: '#ffffff', maxWidth: '170px' }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          </td>
                          <td style={{ padding: '12px 12px', textAlign: 'center', fontWeight: '800', color: '#38bdf8' }}>{p.count} đơn</td>
                          <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: '700', color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.revenue)}đ</td>
                          <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: '700', color: '#a855f7', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.profit)}đ</td>
                          <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                            <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', background: isOut ? 'rgba(239,68,68,0.18)' : isLow ? 'rgba(245,158,11,0.18)' : 'rgba(16,185,129,0.15)', color: isOut ? '#ef4444' : isLow ? '#f59e0b' : '#10b981', border: `1px solid ${isOut ? 'rgba(239,68,68,0.35)' : isLow ? 'rgba(245,158,11,0.35)' : 'rgba(16,185,129,0.3)'}` }}>
                              {isOut ? '🔴 Hết hàng' : isLow ? `🟡 Còn ${p.stock}` : `🟢 Còn ${p.stock}`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Top 5 VIP Customers */}
            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', overflow: 'hidden', backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '18px 20px', background: 'linear-gradient(90deg, rgba(245,158,11,0.15), transparent)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  👑 Top 5 Khách Hàng VIP (LTV High Spenders)
                </h3>
              </div>
              {top5VIPCustomers.length === 0 ? (
                <div style={{ padding: '36px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Chưa có dữ liệu mua hàng.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b', fontWeight: '600', width: '40px' }}>#</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: '600' }}>Khách Hàng</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b', fontWeight: '600' }}>Đơn</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b', fontWeight: '600' }}>LTV</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b', fontWeight: '600' }}>Công Nợ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top5VIPCustomers.map((c, idx) => {
                      const medals = ['👑','🥈','🥉'];
                      const rank = idx < 3 ? medals[idx] : `#${idx+1}`;
                      const typeLabel = c.type === 'Si' ? 'Sỉ' : c.type === 'CTV' ? 'CTV' : 'Lẻ';
                      const typeColor = c.type === 'Si' ? '#a855f7' : c.type === 'CTV' ? '#f59e0b' : '#10b981';
                      const avatarColor = getAvatarColor(c.name);
                      return (
                        <tr key={c.id || c.name} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', transition: 'background .15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '12px 12px', textAlign: 'center', fontSize: idx === 0 ? '16px' : '13px', borderLeft: idx === 0 ? '4px solid #f59e0b' : '4px solid transparent' }}>{rank}</td>
                          <td style={{ padding: '12px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `${avatarColor}33`, border: `1.5px solid ${avatarColor}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '900', color: avatarColor, flexShrink: 0 }}>
                                {getInitials(c.name)}
                              </div>
                              <div>
                                <div style={{ fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                                  {c.name}
                                  <span style={{ fontSize: '9.5px', padding: '1px 6px', borderRadius: '4px', background: `${typeColor}22`, color: typeColor, fontWeight: '800', border: `1px solid ${typeColor}44` }}>{typeLabel}</span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>{c.phone || '—'}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 12px', textAlign: 'center', fontWeight: '800', color: '#38bdf8' }}>{c.orderCount} đơn</td>
                          <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: '800', color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>{fmt(c.totalSpent)}đ</td>
                          <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: '700', color: c.debt > 0 ? '#ef4444' : '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                            {c.debt > 0 ? fmt(c.debt) + 'đ' : '0đ'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ══════════ TẦNG 4: CHANNELS + TIER ══════════ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>

            {/* Channel Performance */}
            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '20px', backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PieChart size={18} color="#38bdf8" /> Hiệu Quả Kênh Bán Hàng & Nguồn Khách
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {channelAnalytics.filter(c => c.count > 0).map(chan => (
                  <div key={chan.sourceKey}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px' }}>{chan.icon}</span>
                        <span style={{ color: '#ffffff', fontWeight: '600', fontSize: '13px' }}>{chan.label}</span>
                        <span style={{ color: '#64748b', fontSize: '11.5px' }}>({chan.count} đơn)</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: '800', color: chan.color, fontSize: '13.5px' }}>{fmt(chan.revenue)}đ</span>
                        <span style={{ color: '#94a3b8', fontSize: '11.5px', marginLeft: '6px' }}>({chan.percentage}%)</span>
                      </div>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${chan.percentage}%`, background: chan.color, borderRadius: '6px', transition: 'width .6s ease' }} />
                    </div>
                  </div>
                ))}
                {channelAnalytics.filter(c => c.count > 0).length === 0 && (
                  <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Chưa có dữ liệu kênh bán hàng.</div>
                )}
              </div>
            </div>

            {/* Tier Analytics */}
            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '20px', backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="#a855f7" /> Doanh Thu Theo Nhóm Khách
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {tierAnalytics.map(t => (
                  <div key={t.tierKey} style={{ background: t.bg, border: `1px solid ${t.color}40`, borderRadius: '14px', padding: '16px', borderTop: `4px solid ${t.color}` }}>
                    <div style={{ fontSize: '20px', marginBottom: '6px' }}>{t.icon} <strong style={{ color: t.color, fontSize: '14px' }}>{t.label}</strong></div>
                    <div style={{ fontSize: '11.5px', color: '#94a3b8', marginBottom: '8px' }}>{t.customers} KH · {t.count} đơn</div>
                    <div style={{ fontSize: '15px', fontWeight: '900', color: t.color }}>{fmt(t.revenue)}đ</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>Lãi: {fmt(t.profit)}đ</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ══════════ TẦNG 5: ALERT CENTER 360° ══════════ */}
          <div style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${hasAlerts ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '18px', overflow: 'hidden', backdropFilter: 'blur(16px)', boxShadow: hasAlerts ? '0 0 32px rgba(239,68,68,0.1)' : '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '16px 20px', background: hasAlerts ? 'linear-gradient(90deg, rgba(239,68,68,0.15), transparent)' : 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                {hasAlerts && <span style={{ position: 'absolute', inset: '-4px', borderRadius: '50%', background: 'rgba(239,68,68,0.4)', animation: 'ping 1.5s cubic-bezier(0,0,.2,1) infinite' }} />}
                <ShieldAlert size={20} color={hasAlerts ? '#ef4444' : '#64748b'} />
              </div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: hasAlerts ? '#ffffff' : '#64748b' }}>
                Trung Tâm Cảnh Báo Nóng 360° (Cần Xử Lý Ngay)
              </h3>
              {!hasAlerts && <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(16,185,129,0.18)', color: '#10b981', fontWeight: '800', border: '1px solid rgba(16,185,129,0.3)' }}>✅ Tất cả ổn định</span>}
            </div>

            <div style={{ padding: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              {[
                { count: deadTeamsAlert.length, label: '🔴 Kho Team Bị DIE', sub: 'Chưa tạo team thay thế NCC', btnLabel: 'Xử Lý Ngay', color: '#ef4444', route: '/inventory' },
                { count: expiringOrdersAlert.length, label: '🟡 Đơn Sắp Hết Hạn', sub: 'Cần báo khách gia hạn (7 ngày tới)', btnLabel: 'Báo Gia Hạn', color: '#f59e0b', route: '/expiring' },
                { count: outOfStockProducts.length, label: '📦 Sản Phẩm Cháy Hàng', sub: 'Tồn kho = 0 hoặc dưới ngưỡng', btnLabel: 'Nhập Kho Ngay', color: '#6366f1', route: '/inventory' },
                { count: debtorCustomersAlert.length, label: '💸 Khách Hàng Đang Nợ', sub: `Tổng nợ: ${fmt(totalCustomerDebt)}đ`, btnLabel: 'Thu Nợ Ngay', color: '#10b981', route: '/customers' },
              ].map((alert, i) => {
                const active = alert.count > 0;
                return (
                  <div key={i} style={{
                    background: active ? `rgba(${alert.color === '#ef4444' ? '239,68,68' : alert.color === '#f59e0b' ? '245,158,11' : alert.color === '#6366f1' ? '99,102,241' : '16,185,129'},0.12)` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${active ? alert.color + '50' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px',
                    boxShadow: active ? `0 0 24px ${alert.color}20` : 'none',
                  }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: active ? alert.color : '#64748b' }}>{alert.label}</div>
                      <div style={{ fontSize: '26px', fontWeight: '900', color: active ? alert.color : '#ffffff', marginTop: '4px' }}>
                        {alert.count} {i === 0 ? 'Team' : i === 1 ? 'Đơn' : i === 2 ? 'Sản Phẩm' : 'Khách'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '3px' }}>{alert.sub}</div>
                    </div>
                    <button onClick={() => navigate(alert.route)} style={{
                      padding: '7px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: '12px',
                      background: active ? alert.color : 'rgba(255,255,255,0.08)', color: '#ffffff',
                      display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start', transition: 'all .2s ease',
                    }}>{alert.btnLabel} <ArrowRight size={13} /></button>
                  </div>
                );
              })}
            </div>
          </div>

        </>
      )}

      <style>{`
        @keyframes ping { 0% { transform: scale(1); opacity: .7; } 75%, 100% { transform: scale(1.8); opacity: 0; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
