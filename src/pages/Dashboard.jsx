import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { OrderService, CustomerService } from '../utils/dataService';
import {
  DollarSign, TrendingUp, RotateCcw, Download, Wallet, BarChart2
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
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [oList, cList] = await Promise.all([
        OrderService.list(shopId),
        CustomerService.list(shopId)
      ]);
      setOrders(oList || []);
      setCustomers(cList || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [shopId]);

  const paidOrders = orders.filter(o => o.status === 'Đã thanh toán');

  const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.sell_price || o.sellPrice || 0), 0);
  const totalCost = paidOrders.reduce((sum, o) => sum + (o.cost_price || o.costPrice || 0), 0);
  const totalProfit = totalRevenue - totalCost;

  const repeatCustomersCount = customers.filter(c => {
    const custOrders = orders.filter(o => String(o.customer_id || o.customerId) === String(c.id));
    return custOrders.length >= 2;
  }).length;

  const repeatRate = customers.length > 0
    ? Math.round((repeatCustomersCount / customers.length) * 100)
    : 0;

  const totalCustomerDebt = customers.reduce((sum, c) => sum + (c.debt || 0), 0);

  // Channel Analytics calculation matching both o.source and o.channel
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

  const handleExportExcel = () => {
    const headers = ['Mã Đơn', 'Ngày Tạo', 'Khách Hàng', 'Số Điện Thoại', 'Sản Phẩm', 'Giá Bán', 'Giá Vốn', 'Lợi Nhuận', 'Trạng Thái'];
    const rows = orders.map(o => [
      o.id,
      o.purchase_date || o.date || '',
      '"' + (o.customer_name || o.customerName || '').replace(/"/g, '""') + '"',
      '"' + (o.phone || '') + '"',
      '"' + (o.product_name || o.productName || '').replace(/"/g, '""') + '"',
      o.sell_price || o.sellPrice || 0,
      o.cost_price || o.costPrice || 0,
      (o.sell_price || o.sellPrice || 0) - (o.cost_price || o.costPrice || 0),
      '"' + (o.status || '') + '"'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
    link.setAttribute('download', 'Bao_Cao_Doanh_Thu_' + new Date().toISOString().split('T')[0] + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Tổng Quan Kinh Doanh Dashboard</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '13px' }}>
            Doanh thu, lợi nhuận, công nợ và tỷ lệ khách tái ký. <span style={{ color: '#10b981', fontWeight: '600' }}>Chỉ tính đơn Đã Thanh Toán.</span>
          </p>
        </div>

        <button className="glass-button" onClick={handleExportExcel} style={{ background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981' }}>
          <Download size={17} /> Xuất Báo Cáo CSV (.csv)
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Đang tải báo cáo tổng quan từ đám mây...</div>
      ) : (
        <>
          {/* Key Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #10b981', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>Tổng Doanh Thu</span>
                <div style={{ background: 'rgba(16,185,129,0.15)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                  <DollarSign size={18} color="#10b981" />
                </div>
              </div>
              <p style={{ fontSize: '24px', fontWeight: '800', color: '#10b981', margin: '2px 0' }}>
                {totalRevenue.toLocaleString()}đ
              </p>
              <span style={{ fontSize: '12px', color: '#64748b' }}>{paidOrders.length} đơn đã thu tiền</span>
            </div>

            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #6366f1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>Tổng Lợi Nhuận Thuần</span>
                <div style={{ background: 'rgba(99,102,241,0.15)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                  <TrendingUp size={18} color="#6366f1" />
                </div>
              </div>
              <p style={{ fontSize: '24px', fontWeight: '800', color: '#6366f1', margin: '2px 0' }}>
                {totalProfit.toLocaleString()}đ
              </p>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Doanh thu trừ giá vốn</span>
            </div>

            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #38bdf8', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>Tỷ Lệ Tái Ký (Repeat)</span>
                <div style={{ background: 'rgba(56,189,248,0.15)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                  <RotateCcw size={18} color="#38bdf8" />
                </div>
              </div>
              <p style={{ fontSize: '24px', fontWeight: '800', color: '#38bdf8', margin: '2px 0' }}>
                {repeatRate}%
              </p>
              <span style={{ fontSize: '12px', color: '#64748b' }}>{repeatCustomersCount} khách mua từ 2 đơn</span>
            </div>

            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #ef4444', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>Công Nợ Phải Thu</span>
                <div style={{ background: 'rgba(239,68,68,0.15)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                  <Wallet size={18} color="#ef4444" />
                </div>
              </div>
              <p style={{ fontSize: '24px', fontWeight: '800', color: '#ef4444', margin: '2px 0' }}>
                {totalCustomerDebt.toLocaleString()}đ
              </p>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Khách hàng đang nợ</span>
            </div>
          </div>

          {/* Channel Analytics Bars */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BarChart2 size={20} color="#6366f1" />
              <h2 style={{ fontSize: '17px', fontWeight: '700' }}>Phân Tích Doanh Thu Theo Kênh Bán Hàng 360°</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {channelAnalytics.map(chan => (
                <div key={chan.sourceKey} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#fff', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{chan.icon}</span> {chan.label} ({chan.count} đơn)
                    </span>
                    <strong style={{ color: chan.color }}>
                      {chan.revenue.toLocaleString()}đ ({chan.percentage}%)
                    </strong>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.max(2, chan.percentage)}%`,
                      height: '100%',
                      background: chan.color,
                      borderRadius: '4px',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Orders List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: '700' }}>📦 Đơn Hàng Gần Đây</h2>
            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Mã Đơn', 'Khách Hàng', 'Sản Phẩm', 'Doanh Thu', 'Kênh Bán', 'Trạng Thái'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map(o => {
                    const custName = o.customer_name || o.customerName;
                    const prodName = o.product_name || o.productName;
                    const sellP = o.sell_price || o.sellPrice || 0;
                    const srcCfg = SOURCE_CONFIG[o.source] || SOURCE_CONFIG['Facebook Page'];

                    return (
                      <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px 16px' }}><strong>#{o.id}</strong></td>
                        <td style={{ padding: '12px 16px', color: '#fff', fontWeight: '600' }}>{custName}</td>
                        <td style={{ padding: '12px 16px', color: '#818cf8' }}>{prodName}</td>
                        <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: '700' }}>{sellP.toLocaleString()}đ</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className="badge" style={{ background: srcCfg.bg, color: srcCfg.color }}>
                            {srcCfg.icon} {o.channel || o.source || 'FB Page'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className={`badge ${o.status === 'Đã thanh toán' ? 'badge-success' : 'badge-warning'}`}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
