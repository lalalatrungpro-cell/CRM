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
  'Facebook Page': { label: 'FB Page', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', icon: 'ðŸŒ' },
  'Zalo': { label: 'Zalo', color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: 'ðŸ’¬' },
  'TikTok Shop': { label: 'TikTok', color: '#ec4899', bg: 'rgba(236,72,153,0.15)', icon: 'ðŸŽµ' },
  'Telegram': { label: 'Telegram', color: '#0ea5e9', bg: 'rgba(14,165,233,0.15)', icon: 'âœˆï¸' },
  'Giá»›i Thiá»‡u': { label: 'Giá»›i Thiá»‡u', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: 'ðŸ¤' },
  'Website': { label: 'Website', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', icon: 'ðŸ’»' },
  'KhÃ¡c': { label: 'KhÃ¡c', color: '#64748b', bg: 'rgba(100,116,139,0.15)', icon: 'ðŸ“Œ' }
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

  // â”€â”€ Date Range Filter State â”€â”€
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
  const paidOrders = filteredOrders.filter(o => o.status !== 'Tá»« chá»‘i báº£o hÃ nh' && !String(o.status || '').includes('100%'));

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
      return mainSrc === sourceKey || fullChan.startsWith(sourceKey) || (sourceKey === 'KhÃ¡c' && !mainSrc && !fullChan);
    });

    const revenue = sourceOrders.reduce((sum, o) => sum + (o.sell_price || o.sellPrice || 0), 0);
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

  // [Phase 3] Tier analytics: Láº» / CTV / Sá»‰ breakdown
  const TIER_CONFIG = {
    'Le':  { label: 'KhÃ¡ch Láº»',  icon: 'ðŸŸ¢', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    'CTV': { label: 'CTV',       icon: 'ðŸŸ¡', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    'Si':  { label: 'KhÃ¡ch Sá»‰',  icon: 'ðŸŸ£', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  };
  const tierAnalytics = Object.entries(TIER_CONFIG).map(([tierKey, cfg]) => {
    const tierCustomers = customers.filter(c => (c.type || 'Le') === tierKey);
    const tierCustIds = new Set(tierCustomers.map(c => String(c.id)));
    const tierOrders = paidOrders.filter(o => tierCustIds.has(String(o.customer_id || o.customerId || '')));
    const revenue = tierOrders.reduce((s, o) => s + Math.max(0, Number(o.sell_price || o.sellPrice || 0) - Number(o.refund_amount || 0)), 0);
    const profit = tierOrders.reduce((s, o) => s + Math.max(0, Number(o.sell_price || o.sellPrice || 0) - Number(o.refund_amount || 0) - Number(o.cost_price || o.costPrice || 0)), 0);
    return { tierKey, ...cfg, count: tierOrders.length, customers: tierCustomers.length, revenue, profit };
  });

  // â”€â”€ Top Products & Real-time Inventory Health Aggregation â”€â”€
  const productMap = {};
  paidOrders.forEach(o => {
    const rawName = o.product_name || o.productName || 'Sáº£n pháº©m khÃ¡c';
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
    // Single keys stock
    const singleAvail = (inventoryItems || []).filter(i =>
      i.status === 'AVAILABLE' &&
      (i.product_name || i.productName || '').toLowerCase().includes(p.name.toLowerCase())
    ).length;

    // Team slots stock
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

  // â”€â”€ Top 5 VIP Customers (LTV Leaderboard) â”€â”€
  const customerLTVMap = {};
  paidOrders.forEach(o => {
    const custId = String(o.customer_id || o.customerId || '');
    const custName = o.customer_name || o.customerName || 'KhÃ¡ch VÃ£ng Lai';
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

  // â”€â”€ Realtime 360Â° Actionable Alert Center â”€â”€
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
      ['BÃO CÃO Káº¾T QUáº¢ KINH DOANH & TÃ€I CHÃNH DOANH NGHIá»†P (P&L STATEMENT)', ''],
      ['NgÃ y xuáº¥t bÃ¡o cÃ¡o:', new Date().toLocaleDateString('vi-VN')],
      ['', ''],
      ['1. DOANH THU THUáº¦N BÃN HÃ€NG', totalRevenue],
      ['2. GIÃ Vá»N HÃ€NG BÃN (COGS)', -totalCogs],
      ['3. Lá»¢I NHUáº¬N Gá»˜P (GROSS PROFIT)', grossProfit],
      ['BiÃªn lÃ£i gá»™p (%):', grossMargin + '%'],
      ['', ''],
      ['4. CHI PHÃ Váº¬N HÃ€NH (OPEX)', -totalOperatingCost],
      ['  - Chi phÃ­ Cá»‘ Ä‘á»‹nh (Máº·t báº±ng, VPS, Tool):', -opexSummary.totalFixed],
      ['  - Chi phÃ­ Biáº¿n Ä‘á»™ng (Ads, Marketing):', -opexSummary.totalVariable],
      ['  - Chi phÃ­ LÆ°Æ¡ng nhÃ¢n viÃªn & Hoa há»“ng:', -totalPayrollPaid],
      ['', ''],
      ['5. LÃƒI RÃ’NG THá»°C Táº¾ DOANH NGHIá»†P (NET PROFIT)', realNetProfit],
      ['BiÃªn lÃ£i rÃ²ng (%):', netMargin + '%'],
      ['', ''],
      ['6. Sá» DÆ¯ QUá»¸ HIá»†N Táº I', cashSummary.netBalance],
      ['  - Quá»¹ NgÃ¢n HÃ ng:', cashSummary.bankBalance],
      ['  - Quá»¹ Tiá»n Máº·t:', cashSummary.cashBalance],
      ['7. CÃ”NG Ná»¢ PHáº¢I THU (KhÃ¡ch ná»£):', totalCustomerDebt],
      ['8. CÃ”NG Ná»¢ PHáº¢I TRáº¢ (Ná»£ NCC):', totalSupplierDebt]
    ];

    const csvContent = '\uFEFF' + lines.map(row => row.join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
    link.setAttribute('download', 'Bao_Cao_Tai_Chinh_PnL_' + new Date().toISOString().split('T')[0] + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // â”€â”€â”€ Helper: format money short (125000000 => 125M / 5500000 => 5.5M / 950000 => 950K)
  const fmtShort = (n) => {
    const abs = Math.abs(n);
    if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace('.0','') + 'B';
    if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0','') + 'M';
    if (abs >= 1_000) return (n / 1_000).toFixed(0) + 'K';
    return n.toLocaleString();
  };
  const fmt = (n) => Number(n || 0).toLocaleString('vi-VN');

  // Avatar initials helper
  const getInitials = (name) => (name || '?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const AVATAR_COLORS = ['#6366f1','#10b981','#f59e0b','#ec4899','#0ea5e9','#a855f7','#ef4444'];
  const getAvatarColor = (name) => AVATAR_COLORS[(name||'').charCodeAt(0) % AVATAR_COLORS.length];

  const hasAlerts = deadTeamsAlert.length > 0 || expiringOrdersAlert.length > 0 || outOfStockProducts.length > 0 || debtorCustomersAlert.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }} className="animate-fade-in">

      {/* â•â•â•â•â•â•â•â•â•â• HEADER â•â•â•â•â•â•â•â•â•â• */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-0.03em', margin: 0, background: 'linear-gradient(135deg,#fff 30%,#94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ðŸ“Š Command Center 360Â°
            </h1>
            {hasAlerts && (
              <span style={{ position: 'relative', display: 'inline-flex', width: '10px', height: '10px' }}>
                <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#ef4444', animation: 'ping 1.5s cubic-bezier(0,0,.2,1) infinite', opacity: 0.7 }} />
                <span style={{ position: 'relative', borderRadius: '50%', width: '10px', height: '10px', background: '#ef4444' }} />
              </span>
            )}
          </div>
          <p style={{ color: '#475569', fontSize: '12px', margin: 0 }}>
            ToÃ n cáº£nh doanh nghiá»‡p Â· Cáº­p nháº­t: {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="glass-button" onClick={loadData} title="LÃ m má»›i dá»¯ liá»‡u" style={{ padding: '8px 12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <RefreshCw size={15} />
          </button>
          <button className="glass-button" onClick={handleExportPnL} style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontWeight: '700', fontSize: '13px', gap: '6px' }}>
            <Download size={15} /> Xuáº¥t P&L .csv
          </button>
        </div>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â• DATE FILTER BAR â•â•â•â•â•â•â•â•â•â• */}
      <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
          {[
            { key: 'ALL', label: 'ðŸ—“ Táº¥t Cáº£', color: '#6366f1' },
            { key: 'THIS_MONTH', label: 'ðŸ“… ThÃ¡ng NÃ y', color: '#10b981' },
            { key: 'LAST_MONTH', label: 'â†© ThÃ¡ng TrÆ°á»›c', color: '#38bdf8' },
            { key: 'THIS_QUARTER', label: 'ðŸ“Š QuÃ½ NÃ y', color: '#f59e0b' },
            { key: 'THIS_YEAR', label: 'ðŸ“† NÄƒm Nay', color: '#a855f7' },
          ].map(({ key, label, color }) => (
            <button key={key} onClick={() => handleApplyDatePreset(key)} style={{
              padding: '5px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', border: 'none', transition: 'all .2s',
              background: datePreset === key ? color : 'transparent',
              color: datePreset === key ? '#fff' : '#64748b',
              boxShadow: datePreset === key ? `0 0 12px ${color}55` : 'none',
            }}>{label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#475569' }}>Tá»«:</span>
          <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setDatePreset('CUSTOM'); }}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', padding: '5px 8px', color: '#94a3b8', fontSize: '12px', outline: 'none' }} />
          <span style={{ fontSize: '11px', color: '#475569' }}>â†’</span>
          <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setDatePreset('CUSTOM'); }}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', padding: '5px 8px', color: '#94a3b8', fontSize: '12px', outline: 'none' }} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#475569', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
          Äang táº£i dá»¯ liá»‡u...
        </div>
      ) : (
        <>

          {/* â•â•â•â•â•â•â•â•â•â• Táº¦NG 1: 4 HERO KPI CARDS â•â•â•â•â•â•â•â•â•â• */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>

            {/* Card 1: Doanh Thu Thuáº§n */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(15,23,42,0.8) 100%)',
              border: '1px solid rgba(16,185,129,0.25)', borderRadius: '16px', padding: '20px',
              borderLeft: '3px solid #10b981', boxShadow: '0 4px 24px rgba(16,185,129,0.08)', position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', background: 'radial-gradient(circle, rgba(16,185,129,0.15), transparent 70%)', borderRadius: '50%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Doanh Thu Thuáº§n</span>
                <div style={{ background: 'rgba(16,185,129,0.15)', borderRadius: '8px', padding: '6px' }}><TrendingUp size={16} color="#10b981" /></div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#fff', letterSpacing: '-0.03em' }}>{fmtShort(totalRevenue)}<span style={{ fontSize: '14px', color: '#94a3b8', marginLeft: '2px' }}>Ä‘</span></div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{paidOrders.length} Ä‘Æ¡n hÃ ng trong ká»³</div>
            </div>

            {/* Card 2: Lá»£i Nhuáº­n RÃ²ng */}
            <div style={{
              background: `linear-gradient(135deg, rgba(${realNetProfit >= 0 ? '99,102,241' : '239,68,68'},0.12) 0%, rgba(15,23,42,0.8) 100%)`,
              border: `1px solid rgba(${realNetProfit >= 0 ? '99,102,241' : '239,68,68'},0.25)`, borderRadius: '16px', padding: '20px',
              borderLeft: `3px solid ${realNetProfit >= 0 ? '#6366f1' : '#ef4444'}`, boxShadow: `0 4px 24px rgba(${realNetProfit >= 0 ? '99,102,241' : '239,68,68'},0.08)`, position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', background: `radial-gradient(circle, rgba(${realNetProfit >= 0 ? '99,102,241' : '239,68,68'},0.15), transparent 70%)`, borderRadius: '50%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: realNetProfit >= 0 ? '#6366f1' : '#ef4444', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Lá»£i Nhuáº­n RÃ²ng</span>
                <div style={{ background: `rgba(${realNetProfit >= 0 ? '99,102,241' : '239,68,68'},0.15)`, borderRadius: '8px', padding: '6px' }}>
                  {realNetProfit >= 0 ? <ArrowUpRight size={16} color="#6366f1" /> : <ArrowDownRight size={16} color="#ef4444" />}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <div style={{ fontSize: '28px', fontWeight: '900', color: realNetProfit >= 0 ? '#818cf8' : '#ef4444', letterSpacing: '-0.03em' }}>{realNetProfit >= 0 ? '+' : ''}{fmtShort(realNetProfit)}<span style={{ fontSize: '14px', marginLeft: '2px' }}>Ä‘</span></div>
                <span style={{ fontSize: '11px', fontWeight: '800', padding: '2px 6px', borderRadius: '6px', background: realNetProfit >= 0 ? 'rgba(99,102,241,0.2)' : 'rgba(239,68,68,0.2)', color: realNetProfit >= 0 ? '#818cf8' : '#ef4444' }}>{netMargin}%</span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>BiÃªn lÃ£i gá»™p: {grossMargin}%</div>
            </div>

            {/* Card 3: Quá»¹ Tiá»n Máº·t & Bank */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(15,23,42,0.8) 100%)',
              border: '1px solid rgba(56,189,248,0.25)', borderRadius: '16px', padding: '20px',
              borderLeft: '3px solid #38bdf8', boxShadow: '0 4px 24px rgba(56,189,248,0.08)', position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', background: 'radial-gradient(circle, rgba(56,189,248,0.15), transparent 70%)', borderRadius: '50%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Quá»¹ Tiá»n Máº·t & Bank</span>
                <div style={{ background: 'rgba(56,189,248,0.15)', borderRadius: '8px', padding: '6px' }}><Wallet size={16} color="#38bdf8" /></div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#fff', letterSpacing: '-0.03em' }}>{fmtShort(cashSummary.netBalance)}<span style={{ fontSize: '14px', color: '#94a3b8', marginLeft: '2px' }}>Ä‘</span></div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>ðŸ¦ {fmtShort(cashSummary.bankBalance)}Ä‘ Â· ðŸ’µ {fmtShort(cashSummary.cashBalance)}Ä‘</div>
            </div>

            {/* Card 4: GiÃ¡ Trá»‹ Tá»“n Kho */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(15,23,42,0.8) 100%)',
              border: '1px solid rgba(168,85,247,0.25)', borderRadius: '16px', padding: '20px',
              borderLeft: '3px solid #a855f7', boxShadow: '0 4px 24px rgba(168,85,247,0.08)', position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', background: 'radial-gradient(circle, rgba(168,85,247,0.15), transparent 70%)', borderRadius: '50%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.08em' }}>GiÃ¡ Trá»‹ Tá»“n Kho</span>
                <div style={{ background: 'rgba(168,85,247,0.15)', borderRadius: '8px', padding: '6px' }}><Boxes size={16} color="#a855f7" /></div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#fff', letterSpacing: '-0.03em' }}>{fmtShort(inventorySummary.totalInventoryValue || 0)}<span style={{ fontSize: '14px', color: '#94a3b8', marginLeft: '2px' }}>Ä‘</span></div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{inventorySummary.availableCount || 0} key/slot sáºµn sÃ ng xuáº¥t bÃ¡n</div>
            </div>

          </div>

          {/* â•â•â•â•â•â•â•â•â•â• Táº¦NG 2: P&L + OPEX + DEBT/LOYALTY â•â•â•â•â•â•â•â•â•â• */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

            {/* P&L Income Statement */}
            <div style={{ background: 'rgba(15,23,42,0.75)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px', backdropFilter: 'blur(12px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <DollarSign size={16} color="#10b981" /> BÃ¡o CÃ¡o P&L (Káº¿t Quáº£ Kinh Doanh)
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'â‘  Doanh Thu Thuáº§n', value: totalRevenue, color: '#10b981', sign: '' },
                  { label: 'â‘¡ GiÃ¡ Vá»‘n COGS', value: -totalCogs, color: '#ef4444', sign: '-' },
                  { label: 'â‘¢ LÃ£i Gá»™p (Gross Profit)', value: grossProfit, color: '#38bdf8', sign: '', bold: true, separator: true },
                  { label: 'â‘£ Chi PhÃ­ OPEX', value: -totalOpexExpenses, color: '#f59e0b', sign: '-' },
                  { label: 'â‘¤ LÆ°Æ¡ng & Hoa Há»“ng', value: -totalPayrollPaid, color: '#f59e0b', sign: '-' },
                  { label: 'â‘¥ LÃƒI RÃ’NG NET PROFIT', value: realNetProfit, color: realNetProfit >= 0 ? '#818cf8' : '#ef4444', sign: realNetProfit >= 0 ? '+' : '', bold: true, separator: true, big: true },
                ].map((row, i) => (
                  <div key={i}>
                    {row.separator && <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '4px', marginBottom: '8px' }} />}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: '8px', background: row.big ? `rgba(${realNetProfit >= 0 ? '99,102,241' : '239,68,68'},0.08)` : 'transparent' }}>
                      <span style={{ fontSize: row.big ? '13px' : '12px', color: row.big ? '#fff' : '#94a3b8', fontWeight: row.bold ? '800' : '500' }}>{row.label}</span>
                      <span style={{ fontSize: row.big ? '15px' : '13px', fontWeight: row.bold ? '900' : '700', color: row.color, fontVariantNumeric: 'tabular-nums' }}>{row.sign}{fmt(Math.abs(row.value))}Ä‘</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* OPEX Cost Structure + Debt + Loyalty */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* OPEX */}
              <div style={{ background: 'rgba(15,23,42,0.75)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '18px', backdropFilter: 'blur(12px)', flex: 1 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <BarChart3 size={15} color="#ef4444" /> CÆ¡ Cáº¥u Chi PhÃ­ Váº­n HÃ nh (OPEX)
                </h3>
                {[
                  { label: 'Chi phÃ­ Cá»‘ Ä‘á»‹nh (Máº·t báº±ng, VPS)', value: opexSummary.totalFixed, color: '#38bdf8', icon: <Building size={13} color="#38bdf8" /> },
                  { label: 'Chi phÃ­ Biáº¿n Ä‘á»™ng (Ads, Marketing)', value: opexSummary.totalVariable, color: '#f59e0b', icon: <Megaphone size={13} color="#f59e0b" /> },
                  { label: 'Quá»¹ LÆ°Æ¡ng & Hoa Há»“ng', value: totalPayrollPaid, color: '#10b981', icon: <Users size={13} color="#10b981" /> },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                    <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>{item.icon}{item.label}</span>
                    <strong style={{ color: '#fff' }}>{fmt(item.value)}Ä‘</strong>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '800' }}>
                  <span style={{ color: '#ef4444' }}>Tá»”NG OPEX:</span>
                  <span style={{ color: '#ef4444' }}>-{fmt(totalOperatingCost)}Ä‘</span>
                </div>
              </div>

              {/* Debt + Loyalty mini stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { label: 'KhÃ¡ch Ná»£', value: fmt(totalCustomerDebt) + 'Ä‘', color: '#f59e0b', icon: <ArrowDownRight size={14} />, sub: 'Pháº£i Thu' },
                  { label: 'Ná»£ NCC', value: fmt(totalSupplierDebt) + 'Ä‘', color: '#ef4444', icon: <ArrowUpRight size={14} />, sub: 'Pháº£i Tráº£' },
                  { label: 'TÃ¡i Mua', value: repeatRate + '%', color: '#38bdf8', icon: <ShieldCheck size={14} />, sub: `${repeatCustomersCount}/${customers.length} KH` },
                ].map((s, i) => (
                  <div key={i} style={{ background: 'rgba(15,23,42,0.75)', border: `1px solid rgba(255,255,255,0.06)`, borderRadius: '12px', padding: '12px', textAlign: 'center', borderTop: `2px solid ${s.color}` }}>
                    <div style={{ color: s.color, display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>{s.icon}</div>
                    <div style={{ fontSize: '13px', fontWeight: '900', color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{s.label}</div>
                    <div style={{ fontSize: '10px', color: '#475569' }}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* â•â•â•â•â•â•â•â•â•â• Táº¦NG 3: TOP 5 PRODUCTS + TOP 5 VIP CUSTOMERS â•â•â•â•â•â•â•â•â•â• */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '14px' }}>

            {/* Top 5 Products */}
            <div style={{ background: 'rgba(15,23,42,0.75)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
              <div style={{ padding: '16px 18px', background: 'linear-gradient(90deg, rgba(245,158,11,0.12), transparent)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  ðŸ”¥ Top 5 Sáº£n Pháº©m BÃ¡n Cháº¡y
                </h3>
                <div style={{ display: 'flex', gap: '3px', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {[
                    { key: 'REVENUE', label: 'ðŸ’° Doanh Thu' },
                    { key: 'QTY', label: 'ðŸ“¦ Sá»‘ BÃ¡n' },
                    { key: 'PROFIT', label: 'ðŸ“ˆ LÃ£i Gá»™p' },
                  ].map(({ key, label }) => (
                    <button key={key} onClick={() => setProductSortMode(key)} style={{
                      padding: '4px 9px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', cursor: 'pointer', border: 'none', transition: 'all .15s',
                      background: productSortMode === key ? '#6366f1' : 'transparent',
                      color: productSortMode === key ? '#fff' : '#64748b',
                    }}>{label}</button>
                  ))}
                </div>
              </div>
              {top5Products.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#475569', fontSize: '13px' }}>ChÆ°a cÃ³ dá»¯ liá»‡u bÃ¡n hÃ ng trong ká»³ nÃ y.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'center', color: '#475569', fontWeight: '600', width: '36px' }}>#</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: '#475569', fontWeight: '600' }}>Sáº£n Pháº©m</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>ÄÃ£ BÃ¡n</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>Doanh Thu</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>LÃ£i Gá»™p</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>Kho</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top5Products.map((p, idx) => {
                      const medals = ['ðŸ¥‡','ðŸ¥ˆ','ðŸ¥‰'];
                      const rank = idx < 3 ? medals[idx] : `#${idx+1}`;
                      const isOut = p.stock === 0;
                      const isLow = p.stock > 0 && p.stock <= 3;
                      return (
                        <tr key={p.name} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', transition: 'background .15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '10px 10px', textAlign: 'center', fontSize: idx === 0 ? '16px' : '13px', borderLeft: idx === 0 ? '3px solid #f59e0b' : '3px solid transparent' }}>{rank}</td>
                          <td style={{ padding: '10px 10px', fontWeight: '700', color: '#e2e8f0', maxWidth: '160px' }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          </td>
                          <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: '800', color: '#38bdf8' }}>{p.count}</td>
                          <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: '700', color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>{fmtShort(p.revenue)}Ä‘</td>
                          <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: '700', color: '#a855f7', fontVariantNumeric: 'tabular-nums' }}>{fmtShort(p.profit)}Ä‘</td>
                          <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                            <span style={{ padding: '2px 7px', borderRadius: '20px', fontSize: '10px', fontWeight: '800', background: isOut ? 'rgba(239,68,68,0.15)' : isLow ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.12)', color: isOut ? '#ef4444' : isLow ? '#f59e0b' : '#10b981', border: `1px solid ${isOut ? 'rgba(239,68,68,0.3)' : isLow ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.25)'}` }}>
                              {isOut ? 'ðŸ”´ Háº¿t' : isLow ? `ðŸŸ¡ CÃ²n ${p.stock}` : `ðŸŸ¢ ${p.stock}`}
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
            <div style={{ background: 'rgba(15,23,42,0.75)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
              <div style={{ padding: '16px 18px', background: 'linear-gradient(90deg, rgba(245,158,11,0.12), transparent)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  ðŸ‘‘ Top 5 KhÃ¡ch HÃ ng VIP (LTV Cao Nháº¥t)
                </h3>
              </div>
              {top5VIPCustomers.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#475569', fontSize: '13px' }}>ChÆ°a cÃ³ dá»¯ liá»‡u mua hÃ ng.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'center', color: '#475569', fontWeight: '600', width: '36px' }}>#</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: '#475569', fontWeight: '600' }}>KhÃ¡ch HÃ ng</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>ÄÆ¡n</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>LTV</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>Ná»£</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top5VIPCustomers.map((c, idx) => {
                      const medals = ['ðŸ‘‘','ðŸ¥ˆ','ðŸ¥‰'];
                      const rank = idx < 3 ? medals[idx] : `#${idx+1}`;
                      const typeLabel = c.type === 'Si' ? 'Sá»‰' : c.type === 'CTV' ? 'CTV' : 'Láº»';
                      const typeColor = c.type === 'Si' ? '#a855f7' : c.type === 'CTV' ? '#f59e0b' : '#10b981';
                      const avatarColor = getAvatarColor(c.name);
                      return (
                        <tr key={c.id || c.name} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', transition: 'background .15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '10px 10px', textAlign: 'center', fontSize: idx === 0 ? '16px' : '13px', borderLeft: idx === 0 ? '3px solid #f59e0b' : '3px solid transparent' }}>{rank}</td>
                          <td style={{ padding: '10px 10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: `${avatarColor}33`, border: `1.5px solid ${avatarColor}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '900', color: avatarColor, flexShrink: 0 }}>
                                {getInitials(c.name)}
                              </div>
                              <div>
                                <div style={{ fontWeight: '700', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px' }}>
                                  {c.name}
                                  <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '4px', background: `${typeColor}22`, color: typeColor, fontWeight: '800', border: `1px solid ${typeColor}44` }}>{typeLabel}</span>
                                </div>
                                <div style={{ fontSize: '10.5px', color: '#475569' }}>{c.phone || 'â€”'}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: '800', color: '#38bdf8' }}>{c.orderCount}</td>
                          <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: '800', color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>{fmtShort(c.totalSpent)}Ä‘</td>
                          <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: '700', color: c.debt > 0 ? '#ef4444' : '#334155', fontVariantNumeric: 'tabular-nums' }}>
                            {c.debt > 0 ? fmtShort(c.debt) + 'Ä‘' : 'â€”'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* â•â•â•â•â•â•â•â•â•â• Táº¦NG 4: CHANNELS + TIER â•â•â•â•â•â•â•â•â•â• */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>

            {/* Channel Performance */}
            <div style={{ background: 'rgba(15,23,42,0.75)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '18px', backdropFilter: 'blur(12px)' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <PieChart size={15} color="#38bdf8" /> Hiá»‡u Quáº£ KÃªnh BÃ¡n HÃ ng
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {channelAnalytics.filter(c => c.count > 0).map(chan => (
                  <div key={chan.sourceKey}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <span style={{ fontSize: '14px' }}>{chan.icon}</span>
                        <span style={{ color: '#cbd5e1', fontWeight: '600', fontSize: '12.5px' }}>{chan.label}</span>
                        <span style={{ color: '#475569', fontSize: '11px' }}>({chan.count} Ä‘Æ¡n)</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: '800', color: chan.color, fontSize: '13px' }}>{fmtShort(chan.revenue)}Ä‘</span>
                        <span style={{ color: '#475569', fontSize: '11px', marginLeft: '5px' }}>{chan.percentage}%</span>
                      </div>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${chan.percentage}%`, background: chan.color, borderRadius: '4px', transition: 'width .6s ease' }} />
                    </div>
                  </div>
                ))}
                {channelAnalytics.filter(c => c.count > 0).length === 0 && (
                  <div style={{ color: '#475569', fontSize: '13px', textAlign: 'center', padding: '20px' }}>ChÆ°a cÃ³ dá»¯ liá»‡u kÃªnh bÃ¡n hÃ ng.</div>
                )}
              </div>
            </div>

            {/* Tier Analytics */}
            <div style={{ background: 'rgba(15,23,42,0.75)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '18px', backdropFilter: 'blur(12px)' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Users size={15} color="#a855f7" /> Doanh Thu Theo NhÃ³m KhÃ¡ch
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                {tierAnalytics.map(t => (
                  <div key={t.tierKey} style={{ background: t.bg, border: `1px solid ${t.color}33`, borderRadius: '12px', padding: '14px', borderTop: `3px solid ${t.color}` }}>
                    <div style={{ fontSize: '20px', marginBottom: '6px' }}>{t.icon}</div>
                    <div style={{ fontWeight: '800', color: t.color, fontSize: '13px', marginBottom: '4px' }}>{t.label}</div>
                    <div style={{ fontSize: '10.5px', color: '#64748b', marginBottom: '6px' }}>{t.customers} KH Â· {t.count} Ä‘Æ¡n</div>
                    <div style={{ fontSize: '14px', fontWeight: '900', color: '#fff' }}>{fmtShort(t.revenue)}Ä‘</div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>LÃ£i: {fmtShort(t.profit)}Ä‘</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* â•â•â•â•â•â•â•â•â•â• Táº¦NG 5: ALERT CENTER 360Â° â•â•â•â•â•â•â•â•â•â• */}
          <div style={{ background: 'rgba(15,23,42,0.75)', border: `1px solid ${hasAlerts ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '16px', overflow: 'hidden', backdropFilter: 'blur(12px)', boxShadow: hasAlerts ? '0 0 30px rgba(239,68,68,0.07)' : 'none' }}>
            <div style={{ padding: '14px 18px', background: hasAlerts ? 'linear-gradient(90deg, rgba(239,68,68,0.1), transparent)' : 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                {hasAlerts && <span style={{ position: 'absolute', inset: '-3px', borderRadius: '50%', background: 'rgba(239,68,68,0.4)', animation: 'ping 1.5s cubic-bezier(0,0,.2,1) infinite' }} />}
                <AlertTriangle size={18} color={hasAlerts ? '#ef4444' : '#475569'} />
              </div>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: hasAlerts ? '#fff' : '#64748b' }}>
                Trung TÃ¢m Cáº£nh BÃ¡o NÃ³ng 360Â° â€” Cáº§n Xá»­ LÃ½ Ngay
              </h3>
              {!hasAlerts && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: '800', border: '1px solid rgba(16,185,129,0.25)' }}>âœ… Táº¥t cáº£ á»•n Ä‘á»‹nh</span>}
            </div>

            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {[
                { count: deadTeamsAlert.length, label: 'ðŸ”´ Kho Team Bá»‹ DIE', sub: 'ChÆ°a táº¡o team thay tháº¿', btnLabel: 'Xá»­ LÃ½ Ngay', color: '#ef4444', route: '/inventory' },
                { count: expiringOrdersAlert.length, label: 'ðŸŸ¡ ÄÆ¡n Sáº¯p Háº¿t Háº¡n', sub: 'Cáº§n bÃ¡o khÃ¡ch gia háº¡n (7 ngÃ y)', btnLabel: 'BÃ¡o Gia Háº¡n', color: '#f59e0b', route: '/expiring' },
                { count: outOfStockProducts.length, label: 'ðŸ“¦ Sáº£n Pháº©m ChÃ¡y HÃ ng', sub: 'Tá»“n kho = 0 hoáº·c dÆ°á»›i ngÆ°á»¡ng', btnLabel: 'Nháº­p Kho Ngay', color: '#6366f1', route: '/inventory' },
                { count: debtorCustomersAlert.length, label: 'ðŸ’¸ KhÃ¡ch Äang Ná»£', sub: `Tá»•ng ná»£: ${fmt(totalCustomerDebt)}Ä‘`, btnLabel: 'Thu Ná»£ Ngay', color: '#10b981', route: '/customers' },
              ].map((alert, i) => {
                const active = alert.count > 0;
                return (
                  <div key={i} style={{
                    background: active ? `rgba(${alert.color === '#ef4444' ? '239,68,68' : alert.color === '#f59e0b' ? '245,158,11' : alert.color === '#6366f1' ? '99,102,241' : '16,185,129'},0.08)` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${active ? alert.color + '40' : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px',
                    boxShadow: active ? `0 0 20px ${alert.color}15` : 'none',
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: active ? alert.color : '#334155' }}>{alert.label}</div>
                    <div style={{ fontSize: '30px', fontWeight: '900', color: active ? alert.color : '#475569', lineHeight: 1 }}>
                      {alert.count}
                      <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', marginLeft: '4px' }}>{alert.count === 1 ? '' : ''}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569' }}>{alert.sub}</div>
                    <button onClick={() => navigate(alert.route)} style={{
                      padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: '11.5px',
                      background: active ? alert.color : 'rgba(255,255,255,0.06)', color: '#fff',
                      display: 'flex', alignItems: 'center', gap: '5px', alignSelf: 'flex-start', transition: 'opacity .15s',
                    }}>{alert.btnLabel} <ArrowRight size={12} /></button>
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
