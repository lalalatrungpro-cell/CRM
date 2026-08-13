import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  OrderService, CustomerService, SupplierService,
  CashTransactionService, ExpenseService, PayrollService, PurchaseService, InventoryService
} from '../utils/dataService';
import {
  DollarSign, TrendingUp, Download, Wallet, Landmark,
  Building, Megaphone, Users, ArrowDownRight, ArrowUpRight,
  ShieldCheck, AlertTriangle, CheckCircle2, PieChart, BarChart3, RefreshCw, Boxes
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

  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [cashSummary, setCashSummary] = useState({ totalIncome: 0, totalExpense: 0, netBalance: 0, cashBalance: 0, bankBalance: 0 });
  const [opexSummary, setOpexSummary] = useState({ totalFixed: 0, totalVariable: 0, totalOpex: 0 });
  const [payrolls, setPayrolls] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [inventorySummary, setInventorySummary] = useState({ availableCount: 0, totalInventoryValue: 0 });
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
      const [oList, cList, sList, cSum, oSum, pList, purList, invSum] = await Promise.all([
        OrderService.list(shopId),
        CustomerService.list(shopId),
        SupplierService.list(shopId),
        CashTransactionService.getBalanceSummary(shopId),
        ExpenseService.getOpexSummary(shopId),
        PayrollService.list(shopId),
        PurchaseService.list(shopId),
        InventoryService.getSummary(shopId)
      ]);
      setOrders(oList || []);
      setCustomers(cList || []);
      setSuppliers(sList || []);
      setCashSummary(cSum || { totalIncome: 0, totalExpense: 0, netBalance: 0, cashBalance: 0, bankBalance: 0 });
      setOpexSummary(oSum || { totalFixed: 0, totalVariable: 0, totalOpex: 0 });
      setPayrolls(pList || []);
      setPurchases(purList || []);
      setInventorySummary(invSum || { availableCount: 0, totalInventoryValue: 0 });
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

  // [Phase 3] Tier analytics: Lẻ / CTV / Sỉ breakdown
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            📊 Báo Cáo Tài Chính & Kế Toán Quản Trị P&L
          </h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '13px', margin: 0 }}>
            Tổng quan toàn diện: Doanh thu ➔ Giá vốn COGS ➔ Lợi nhuận gộp ➔ Chi phí OPEX ➔ <strong style={{ color: '#10b981' }}>Lãi ròng thực tế Net Profit</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="glass-button" onClick={loadData} title="Tải lại dữ liệu" style={{ padding: '8px 12px' }}>
            <RefreshCw size={16} />
          </button>
          <button className="glass-button" onClick={handleExportPnL} style={{ background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', fontWeight: '700' }}>
            <Download size={17} /> Xuất Báo Cáo P&L (.csv)
          </button>
        </div>
      </div>

      {/* Date Filter Toolbar Bar */}
      <div className="glass-panel" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'rgba(17,21,40,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginRight: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BarChart3 size={15} color="#818cf8" /> Khoảng Thời Gian:
          </span>

          <button
            onClick={() => handleApplyDatePreset('ALL')}
            style={{
              padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
              background: datePreset === 'ALL' ? '#6366f1' : 'rgba(255,255,255,0.05)',
              color: datePreset === 'ALL' ? '#fff' : '#94a3b8',
              border: datePreset === 'ALL' ? '1px solid #818cf8' : '1px solid rgba(255,255,255,0.08)'
            }}
          >
            🗓️ Tất Cả
          </button>

          <button
            onClick={() => handleApplyDatePreset('THIS_MONTH')}
            style={{
              padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
              background: datePreset === 'THIS_MONTH' ? '#10b981' : 'rgba(255,255,255,0.05)',
              color: datePreset === 'THIS_MONTH' ? '#fff' : '#94a3b8',
              border: datePreset === 'THIS_MONTH' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)'
            }}
          >
            📅 Tháng Này
          </button>

          <button
            onClick={() => handleApplyDatePreset('LAST_MONTH')}
            style={{
              padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
              background: datePreset === 'LAST_MONTH' ? '#38bdf8' : 'rgba(255,255,255,0.05)',
              color: datePreset === 'LAST_MONTH' ? '#fff' : '#94a3b8',
              border: datePreset === 'LAST_MONTH' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)'
            }}
          >
            ⏪ Tháng Trước
          </button>

          <button
            onClick={() => handleApplyDatePreset('THIS_QUARTER')}
            style={{
              padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
              background: datePreset === 'THIS_QUARTER' ? '#f59e0b' : 'rgba(255,255,255,0.05)',
              color: datePreset === 'THIS_QUARTER' ? '#fff' : '#94a3b8',
              border: datePreset === 'THIS_QUARTER' ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)'
            }}
          >
            📊 Quý Này
          </button>

          <button
            onClick={() => handleApplyDatePreset('THIS_YEAR')}
            style={{
              padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
              background: datePreset === 'THIS_YEAR' ? '#a855f7' : 'rgba(255,255,255,0.05)',
              color: datePreset === 'THIS_YEAR' ? '#fff' : '#94a3b8',
              border: datePreset === 'THIS_YEAR' ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.08)'
            }}
          >
            📆 Năm Nay
          </button>
        </div>

        {/* Date Inputs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Từ:</span>
          <input
            type="date"
            value={startDate}
            onChange={e => { setStartDate(e.target.value); setDatePreset('CUSTOM'); }}
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '5px 8px', color: '#fff', fontSize: '12px' }}
          />
          <span style={{ fontSize: '12px', color: '#64748b' }}>Đến:</span>
          <input
            type="date"
            value={endDate}
            onChange={e => { setEndDate(e.target.value); setDatePreset('CUSTOM'); }}
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '5px 8px', color: '#fff', fontSize: '12px' }}
          />
          {(startDate || endDate) && (
            <button
              onClick={() => handleApplyDatePreset('ALL')}
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
            >
              Xóa Lọc
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Đang tổng hợp báo cáo tài chính quản trị...</div>
      ) : (
        <>
          {/* ==================== 1. EXECUTIVE P&L WATERFALL CARD ==================== */}
          <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(17,21,40,0.9), rgba(10,13,24,0.95))', border: '1px solid rgba(99,102,241,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  📈 BẢNG BÁO CÁO KẾT QUẢ KINH DOANH CHUẨN DOANH NGHIỆP (P&L STATEMENT)
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: '4px 0 0 0' }}>
                  Hiệu Quả Sinh Lời & Lãi Ròng Thực Tế
                </h3>
              </div>
              <div style={{ padding: '6px 14px', borderRadius: '10px', background: realNetProfit >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', border: realNetProfit >= 0 ? '1px solid #10b981' : '1px solid #ef4444' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Biên Lãi Ròng (Net Margin): </span>
                <strong style={{ fontSize: '15px', color: realNetProfit >= 0 ? '#10b981' : '#ef4444' }}>{netMargin}%</strong>
              </div>
            </div>

            {/* 5-Step Waterfall Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              {/* 1. Revenue */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: '600' }}>1. TỔNG DOANH THU</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginTop: '4px' }}>
                  {totalRevenue.toLocaleString()}đ
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{paidOrders.length} đơn chốt</div>
              </div>

              {/* 2. COGS */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: '600' }}>2. GIÁ VỐN (COGS)</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#f59e0b', marginTop: '4px' }}>
                  -{totalCogs.toLocaleString()}đ
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Vốn nhập tài khoản/slot</div>
              </div>

              {/* 3. Gross Profit */}
              <div style={{ background: 'rgba(99,102,241,0.06)', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.2)' }}>
                <div style={{ fontSize: '11.5px', color: '#818cf8', fontWeight: '700' }}>3. LỢI NHUẬN GỘP</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#818cf8', marginTop: '4px' }}>
                  +{grossProfit.toLocaleString()}đ
                </div>
                <div style={{ fontSize: '11px', color: '#818cf8', marginTop: '2px' }}>Biên gộp {grossMargin}%</div>
              </div>

              {/* 4. OPEX */}
              <div style={{ background: 'rgba(239,68,68,0.06)', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div style={{ fontSize: '11.5px', color: '#ef4444', fontWeight: '700' }}>4. CHI PHÍ OPEX</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#ef4444', marginTop: '4px' }}>
                  -{totalOperatingCost.toLocaleString()}đ
                </div>
                <div style={{ fontSize: '11px', color: '#fca5a5', marginTop: '2px' }}>Ads + Lương + Mặt bằng</div>
              </div>

              {/* 5. NET PROFIT */}
              <div style={{ background: realNetProfit >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', padding: '14px 16px', borderRadius: '12px', border: realNetProfit >= 0 ? '1px solid rgba(16,185,129,0.35)' : '1px solid rgba(239,68,68,0.35)' }}>
                <div style={{ fontSize: '11.5px', color: realNetProfit >= 0 ? '#10b981' : '#ef4444', fontWeight: '800' }}>
                  🏆 5. LÃI RÒNG THỰC
                </div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: realNetProfit >= 0 ? '#10b981' : '#ef4444', marginTop: '4px' }}>
                  {realNetProfit >= 0 ? '+' : ''}{realNetProfit.toLocaleString()}đ
                </div>
                <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>Tiền thực bỏ túi chủ shop</div>
              </div>
            </div>
          </div>

          {/* ==================== 2. CASH BALANCE & DEBT OVERVIEW ==================== */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {/* Real Cash Balance */}
            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: '#94a3b8', fontWeight: '600' }}>TỔNG QUỸ TIỀN MẶT & BANK</span>
                <Wallet size={20} color="#10b981" />
              </div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: cashSummary.netBalance >= 0 ? '#10b981' : '#ef4444', marginTop: '6px' }}>
                {cashSummary.netBalance >= 0 ? '+' : ''}{cashSummary.netBalance.toLocaleString()}đ
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#cbd5e1', marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                <span>🏦 Bank: {cashSummary.bankBalance.toLocaleString()}đ</span>
                <span>💵 Két: {cashSummary.cashBalance.toLocaleString()}đ</span>
              </div>
            </div>

            {/* Customer Debt */}
            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: '#94a3b8', fontWeight: '600' }}>CÔNG NỢ PHẢI THU (Khách Nợ)</span>
                <ArrowDownRight size={20} color="#f59e0b" />
              </div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#f59e0b', marginTop: '6px' }}>
                {totalCustomerDebt.toLocaleString()}đ
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>Tiền nợ từ các khách sỉ & CTV</div>
            </div>

            {/* Supplier Debt */}
            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #ef4444' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: '#94a3b8', fontWeight: '600' }}>CÔNG NỢ PHẢI TRẢ (Nợ NCC)</span>
                <ArrowUpRight size={20} color="#ef4444" />
              </div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#ef4444', marginTop: '6px' }}>
                {totalSupplierDebt.toLocaleString()}đ
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>Tiền mua sỉ/lô chưa thanh toán NCC</div>
            </div>

            {/* Loyalty / Repeat Rate */}
            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #38bdf8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: '#94a3b8', fontWeight: '600' }}>TỶ LỆ KHÁCH TÁI MUA / GIA HẠN</span>
                <ShieldCheck size={20} color="#38bdf8" />
              </div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#38bdf8', marginTop: '6px' }}>
                {repeatRate}%
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>{repeatCustomersCount} / {customers.length} khách mua từ 2 lần</div>
            </div>

            {/* Inventory Asset Value */}
            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #a855f7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: '#94a3b8', fontWeight: '600' }}>GIÁ TRỊ TỒN KHO SỐ (VỐN)</span>
                <Boxes size={20} color="#a855f7" />
              </div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#a855f7', marginTop: '6px' }}>
                {(inventorySummary.totalInventoryValue || 0).toLocaleString()}đ
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '6px' }}>
                Đang có <strong>{inventorySummary.availableCount || 0}</strong> key sẵn sàng xuất bán
              </div>
            </div>
          </div>

          {/* ==================== 3. OPEX COST STRUCTURE & CHANNELS ==================== */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* OPEX Cost Structure */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={18} color="#ef4444" /> Cơ Cấu Chi Phí Hoạt Động (OPEX)
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Fixed Cost */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building size={14} color="#38bdf8" /> Chi phí Cố định (Mặt bằng, VPS, Tool):
                  </span>
                  <strong style={{ color: '#fff' }}>{opexSummary.totalFixed.toLocaleString()}đ</strong>
                </div>

                {/* Variable Cost */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Megaphone size={14} color="#f59e0b" /> Chi phí Biến động (Quảng cáo Ads, Bank):
                  </span>
                  <strong style={{ color: '#fff' }}>{opexSummary.totalVariable.toLocaleString()}đ</strong>
                </div>

                {/* Payroll */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={14} color="#10b981" /> Quỹ Lương & Hoa hồng nhân sự:
                  </span>
                  <strong style={{ color: '#fff' }}>{totalPayrollPaid.toLocaleString()}đ</strong>
                </div>

                {/* Total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
                  <span style={{ color: '#ef4444', fontWeight: '700' }}>TỔNG CHI PHÍ VẬN HÀNH:</span>
                  <strong style={{ color: '#ef4444', fontSize: '16px' }}>-{totalOperatingCost.toLocaleString()}đ</strong>
                </div>
              </div>
            </div>

            {/* Channel Performance */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PieChart size={18} color="#38bdf8" /> Hiệu Quả Kênh Bán Hàng & Nguồn Khách
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {channelAnalytics.map(chan => (
                  <div key={chan.sourceKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{chan.icon}</span>
                      <span style={{ color: '#fff', fontWeight: '600' }}>{chan.label}</span>
                      <span style={{ color: '#64748b', fontSize: '11px' }}>({chan.count} đơn)</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ color: '#38bdf8' }}>{chan.revenue.toLocaleString()}đ</strong>
                      <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: '6px' }}>({chan.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                  📊 Doanh Thu Theo Nhóm Khách
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {tierAnalytics.map(t => (
                    <div key={t.tierKey} style={{ background: t.bg, border: '1px solid ' + t.color + '40', borderRadius: '12px', padding: '14px' }}>
                      <div style={{ fontSize: '18px', marginBottom: '4px' }}>{t.icon} <strong style={{ color: t.color }}>{t.label}</strong></div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>{t.customers} KH &middot; {t.count} đơn</div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: t.color }}>{t.revenue.toLocaleString()}đ</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Lãi: {t.profit.toLocaleString()}đ</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
