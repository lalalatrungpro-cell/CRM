import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { OrderService, TeamService, CustomerService, CareLogService } from '../utils/dataService';
import { useToast } from '../components/Toast';
import DateFilterBar from '../components/DateFilterBar';
import { Clock, Truck, Copy, Check, RefreshCw, Search, X, MessageSquare, User, ExternalLink, Calendar, ShieldCheck, DollarSign } from 'lucide-react';

export default function ExpiringAccounts() {
  const toast = useToast();
  const { shopId } = useAuth();

  const [orders, setOrders] = useState([]);
  const [teams, setTeams] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Customer Profile 360° Modal State
  const [selectedCustProfile, setSelectedCustProfile] = useState(null);

  // Care Sub-Tabs State ('PENDING' | 'ZALO' | 'SUCCESS' | 'REFUSED' | 'ALL')
  const [careFilterTab, setCareFilterTab] = useState('PENDING');

  // Care Note Modal State
  const [selectedCareOrder, setSelectedCareOrder] = useState(null);
  const [careStatus, setCareStatus] = useState('Đã nhắn Zalo');
  const [careNotes, setCareNotes] = useState('');

  const [copiedId, setCopiedId] = useState('');
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'teams'
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '', preset: 'ALL' });

  // Renewal Modals
  const [renewingOrder, setRenewingOrder] = useState(null);
  const [renewingTeam, setRenewingTeam] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const [orderRenewForm, setOrderRenewForm] = useState({
    durationDays: 30,
    sellPrice: 150000,
    costPrice: 50000,
    status: 'Đã thanh toán',
    newExpireDate: ''
  });

  const [teamRenewForm, setTeamRenewForm] = useState({
    addDays: 365,
    newExpireDate: ''
  });

  const loadData = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [oList, tList, cList] = await Promise.all([
        OrderService.list(shopId),
        TeamService.list(shopId),
        CustomerService.list(shopId)
      ]);
      setOrders(oList || []);
      setTeams(tList || []);
      setCustomers(cList || []);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải danh sách cảnh báo hết hạn!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [shopId]);

  const getWarningDays = (order) => {
    const dur = order.duration_days || order.durationDays || 30;
    if (dur >= 300) return 30;
    if (dur >= 80) return 14;
    return 7;
  };

  const ordersWithDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return orders
      .map(o => {
        const expStr = o.expire_date || o.expireDate;
        if (!expStr) return null;
        const expDate = new Date(expStr);
        expDate.setHours(0, 0, 0, 0);
        const diffTime = expDate.getTime() - today.getTime();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const warnDays = getWarningDays(o);

        return { ...o, daysLeft, warnDays };
      })
      .filter(o => o && o.daysLeft <= o.warnDays && (o.product_type || o.productType) !== 'EVERGREEN')
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [orders]);

  const teamsWithDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return teams
      .map(t => {
        const expStr = t.expire_date || t.expireDate;
        if (!expStr) return null;
        const expDate = new Date(expStr);
        expDate.setHours(0, 0, 0, 0);
        const diffTime = expDate.getTime() - today.getTime();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return { ...t, daysLeft };
      })
      .filter(t => t && t.daysLeft <= 30)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [teams]);

  const filteredOrders = ordersWithDays.filter(o => {
    const expStr = o.expire_date || o.expireDate;
    const ds = expStr ? String(expStr).split('T')[0] : '';
    if (dateRange.startDate && ds < dateRange.startDate) return false;
    if (dateRange.endDate && ds > dateRange.endDate) return false;

    const status = o.care_status || '';
    if (careFilterTab === 'PENDING') {
      if (status.includes('Từ chối gia hạn') || status.includes('Khách chốt gia hạn')) return false;
    } else if (careFilterTab === 'ZALO') {
      if (!status.includes('Đã nhắn Zalo')) return false;
    } else if (careFilterTab === 'SUCCESS') {
      if (!status.includes('Khách chốt gia hạn')) return false;
    } else if (careFilterTab === 'REFUSED') {
      if (!status.includes('Từ chối gia hạn')) return false;
    }

    const custName = o.customer_name || o.customerName || '';
    const prodName = o.product_name || o.productName || '';
    return custName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (o.phone || '').includes(searchTerm) ||
           prodName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredTeams = teamsWithDays.filter(t => {
    const expStr = t.expire_date || t.expireDate;
    const ds = expStr ? String(expStr).split('T')[0] : '';
    if (dateRange.startDate && ds < dateRange.startDate) return false;
    if (dateRange.endDate && ds > dateRange.endDate) return false;

    const teamName = t.name || '';
    const category = t.category || '';
    return teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           category.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleCopyInfor = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(`team-${id}`);
    toast.success('Đã copy tài khoản gốc!');
    setTimeout(() => setCopiedId(''), 2000);
  };

  const handleCopyMessage = (order) => {
    const custName = order.customer_name || order.customerName;
    const prodName = order.product_name || order.productName;
    const expDate = order.expire_date || order.expireDate;

    let msg = `Chào ${custName}, tài khoản dịch vụ ${prodName} của bạn sắp hết hạn vào ngày ${expDate}.`;
    msg += '\nBạn có muốn gia hạn thêm để tiếp tục sử dụng gián đoạn không ạ? ❤️';

    navigator.clipboard.writeText(msg);
    setCopiedId(`msg-${order.id}`);
    toast.success('Đã copy tin nhắn mẫu nhắc gia hạn Zalo!');
    setTimeout(() => setCopiedId(''), 2000);
  };

  
  
  const handleQuickCareStatus = async (order, newStatus) => {
    try {
      const nowStr = new Date().toLocaleString('vi-VN');
      const payload = {
        care_status: newStatus,
        care_notes: newStatus ? (order.care_notes || '') : '',
        care_time: nowStr
      };

      await OrderService.update(order.id, payload);
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...payload } : o));

      const custId = order.customer_id || order.customerId;
      if (custId) {
        try {
          await CustomerService.update(custId, {
            care_status: newStatus,
            care_time: nowStr
          });
        } catch (e) {}
      }

      if (newStatus === '🔴 Từ chối gia hạn') {
        toast.success(`Đã ẩn đơn #${order.id} khỏi bảng Cảnh báo (Đã lưu trữ)!`);
      } else if (!newStatus) {
        toast.success(`Đã khôi phục đơn #${order.id} về danh sách Cần CSKH!`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi cập nhật trạng thái tái ký.');
    }
  };

  const handleOpenCustProfile = (order) => {
    let cust = customers.find(c => String(c.id) === String(order.customer_id || order.customerId));
    if (!cust) {
      cust = {
        name: order.customer_name || order.customerName || 'Khách Hàng',
        phone: order.phone || 'N/A',
        email: order.email || '',
        type: 'Le',
        source: order.source || 'N/A'
      };
    }
    const custOrders = orders.filter(o => String(o.customer_id || o.customerId) === String(cust.id) || (cust.phone && o.phone === cust.phone));
    setSelectedCustProfile({ customer: cust, orders: custOrders });
  };

  const handleOpenCareModal = (order) => {
    setSelectedCareOrder(order);
    setCareStatus(order.care_status || order.careStatus || 'Đã nhắn Zalo');
    setCareNotes(order.care_notes || order.careNotes || '');
  };

  const handleSaveCareNote = async (e) => {
    e.preventDefault();
    if (!selectedCareOrder) return;

    try {
      const nowStr = new Date().toLocaleString('vi-VN');
      const prevHistory = Array.isArray(selectedCareOrder.care_history || selectedCareOrder.careHistory) 
        ? (selectedCareOrder.care_history || selectedCareOrder.careHistory) 
        : [];
      
      const newEntry = {
        time: nowStr,
        status: careStatus,
        notes: careNotes
      };

      const updatedHistory = [newEntry, ...prevHistory];

      const payload = {
        care_status: careStatus,
        care_notes: careNotes,
        care_time: nowStr,
        care_history: updatedHistory
      };

      const updated = await OrderService.update(selectedCareOrder.id, payload);
      setOrders(prev => prev.map(o => o.id === selectedCareOrder.id ? { ...o, ...payload } : o));

      const custId = selectedCareOrder.customer_id || selectedCareOrder.customerId;
      if (custId) {
        try {
          await Promise.all([
            CustomerService.update(custId, {
              care_status: careStatus,
              care_notes: careNotes,
              care_time: nowStr
            }),
            CareLogService.create(shopId, {
              customer_id: custId,
              type: careStatus,
              content: careNotes ? `[Đơn #${selectedCareOrder.id}] ${careNotes}` : `[Đơn #${selectedCareOrder.id}] ${careStatus}`
            })
          ]);

          setCustomers(prev => prev.map(c => String(c.id) === String(custId) ? {
            ...c,
            care_status: careStatus,
            care_notes: careNotes,
            care_time: nowStr
          } : c));
        } catch (e) {}
      }

      setSelectedCareOrder(null);
      toast.success(`Đã lưu nhật ký CSKH cho đơn #${selectedCareOrder.id} và đồng bộ Hồ sơ Khách Hàng!`);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi lưu nhật ký chăm sóc.');
    }
  };

  const handleOpenOrderRenewModal = (order) => {
    const dur = order.duration_days || order.durationDays || 30;
    const sellP = order.sell_price || order.sellPrice || 150000;
    const costP = order.cost_price || order.costPrice || 50000;

    const baseDate = order.expire_date ? new Date(order.expire_date) : new Date();
    const newExp = new Date(baseDate.getTime() + dur * 86400000).toISOString().split('T')[0];

    setRenewingOrder(order);
    setOrderRenewForm({
      durationDays: dur,
      sellPrice: sellP,
      costPrice: costP,
      status: 'Đã thanh toán',
      newExpireDate: newExp
    });
  };

  const handleOrderDurationChange = (dur) => {
    const days = parseInt(dur) || 30;
    const baseDate = renewingOrder && renewingOrder.expire_date ? new Date(renewingOrder.expire_date) : new Date();
    const newExp = new Date(baseDate.getTime() + days * 86400000).toISOString().split('T')[0];
    setOrderRenewForm(f => ({ ...f, durationDays: days, newExpireDate: newExp }));
  };

  const handleConfirmOrderRenew = async (e) => {
    e.preventDefault();
    if (!renewingOrder) return;

    try {
      const payload = {
        customer_id: renewingOrder.customer_id,
        customer_name: renewingOrder.customer_name || renewingOrder.customerName,
        phone: renewingOrder.phone || '',
        supplier_id: renewingOrder.supplier_id,
        supplier_name: renewingOrder.supplier_name || renewingOrder.supplierName,
        team_id: renewingOrder.team_id,
        product_name: renewingOrder.product_name || renewingOrder.productName,
        infor: renewingOrder.infor || '',
        cost_price: parseFloat(orderRenewForm.costPrice) || 0,
        sell_price: parseFloat(orderRenewForm.sellPrice) || 0,
        status: orderRenewForm.status || 'Đã thanh toán',
        purchase_date: todayStr,
        expire_date: orderRenewForm.newExpireDate,
        duration_days: parseInt(orderRenewForm.durationDays) || 30,
        supplier_paid: false,
        warranty_count: 0,
        source: renewingOrder.source || 'Facebook Page',
        channel: renewingOrder.channel || renewingOrder.source || 'FB Page'
      };

      const newOrder = await OrderService.create(shopId, payload);
      setOrders(prev => [newOrder, ...prev]);
      setRenewingOrder(null);
      toast.success(`Đã gia hạn đơn #${renewingOrder.id} thành công cho ${payload.customer_name}!`);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi gia hạn đơn hàng.');
    }
  };

  const handleOpenTeamRenewModal = (team) => {
    const baseDate = team.expire_date ? new Date(team.expire_date) : new Date();
    const newExp = new Date(baseDate.getTime() + 365 * 86400000).toISOString().split('T')[0];

    setRenewingTeam(team);
    setTeamRenewForm({
      addDays: 365,
      newExpireDate: newExp
    });
  };

  const handleConfirmTeamRenew = async (e) => {
    e.preventDefault();
    if (!renewingTeam) return;

    try {
      const updated = await TeamService.update(renewingTeam.id, {
        expire_date: teamRenewForm.newExpireDate
      });
      setTeams(prev => prev.map(t => t.id === renewingTeam.id ? updated : t));
      setRenewingTeam(null);
      toast.success(`Đã gia hạn hạn dùng nguồn cho Kho Team "${updated.name}"!`);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi gia hạn kho team.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Cảnh Báo Hết Hạn & Tái Ký 360°</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '13px' }}>
            Tự động theo dõi các đơn sắp hết hạn và kho team hết hạn để chủ động nhắc Zalo & gia hạn.
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={() => setActiveTab('orders')}
            className={`glass-button ${activeTab === 'orders' ? 'active' : ''}`}
            style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', background: activeTab === 'orders' ? '#6366f1' : 'transparent', color: activeTab === 'orders' ? '#fff' : '#94a3b8', border: 'none' }}
          >
            <Clock size={15} /> Đơn Khách Hết Hạn ({ordersWithDays.length})
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`glass-button ${activeTab === 'teams' ? 'active' : ''}`}
            style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', background: activeTab === 'teams' ? '#6366f1' : 'transparent', color: activeTab === 'teams' ? '#fff' : '#94a3b8', border: 'none' }}
          >
            <Truck size={15} /> Kho Team Hết Hạn ({teamsWithDays.length})
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <DateFilterBar onFilterChange={setDateRange} label="Kỳ Hết Hạn:" />

      {/* Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '400px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 14px' }}>
        <Search size={16} color="#475569" />
        <input
          type="text"
          placeholder={activeTab === 'orders' ? "Tìm khách hàng, SĐT hoặc sản phẩm..." : "Tìm tên kho team hoặc loại dịch vụ..."}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', width: '100%', fontSize: '13.5px' }}
        />
        {searchTerm && <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={14} /></button>}
      </div>

      {/* Tab 1: Orders */}
      {activeTab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Sub-Tabs Renewal Pipeline Filter */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { key: 'PENDING', label: '⚡ Cần CSKH', count: ordersWithDays.filter(o => !o.care_status?.includes('Từ chối gia hạn') && !o.care_status?.includes('Khách chốt gia hạn')).length, color: '#38bdf8' },
              { key: 'ZALO', label: '🟡 Đã Nhắc Zalo', count: ordersWithDays.filter(o => o.care_status?.includes('Đã nhắn Zalo')).length, color: '#f59e0b' },
              { key: 'SUCCESS', label: '🟢 Khách Chốt', count: ordersWithDays.filter(o => o.care_status?.includes('Khách chốt gia hạn')).length, color: '#10b981' },
              { key: 'REFUSED', label: '🔴 Khách Từ Chối (Lưu Trữ)', count: ordersWithDays.filter(o => o.care_status?.includes('Từ chối gia hạn')).length, color: '#ef4444' },
              { key: 'ALL', label: '🌐 Tất Cả Đơn', count: ordersWithDays.length, color: '#94a3b8' }
            ].map(sub => (
              <button
                key={sub.key}
                type="button"
                onClick={() => setCareFilterTab(sub.key)}
                style={{
                  padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                  background: careFilterTab === sub.key ? `${sub.color}22` : 'rgba(255,255,255,0.03)',
                  border: careFilterTab === sub.key ? `1.5px solid ${sub.color}` : '1px solid rgba(255,255,255,0.08)',
                  color: careFilterTab === sub.key ? sub.color : '#94a3b8',
                  transition: 'all 0.15s ease'
                }}
              >
                {sub.label} ({sub.count})
              </button>
            ))}
          </div>

          <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Đang kiểm tra đơn sắp hết hạn...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="empty-state">
              <Clock size={40} />
              <h3>Không có đơn hàng nào sắp hết hạn</h3>
              <p>Tất cả các đơn hàng đều đang trong thời hạn sử dụng an toàn.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Mã Đơn', 'Khách Hàng', 'Sản Phẩm', 'Ngày Hết Hạn', 'Còn Lại', 'Thao Tác Tái Ký'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => {
                  const custName = order.customer_name || order.customerName;
                  const prodName = order.product_name || order.productName;
                  const expDate = order.expire_date || order.expireDate;
                  const dLeft = order.daysLeft;

                  const isExpired = dLeft < 0;
                  const isCopied = copiedId === `msg-${order.id}`;

                  return (
                    <tr key={order.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenCustProfile(order)}
                          style={{ background: 'none', border: 'none', color: '#818cf8', fontWeight: '800', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                        >
                          #{order.id}
                        </button>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenCustProfile(order)}
                          style={{ background: 'none', border: 'none', color: '#fff', fontWeight: '700', cursor: 'pointer', padding: 0, textAlign: 'left', display: 'block' }}
                          title="Click để mở Hồ Sơ Khách Hàng 360°"
                        >
                          👤 {custName}
                        </button>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>📱 {order.phone || 'N/A'}</div>

                        {/* CSKH Care Status Badge */}
                        {order.care_status && (
                          <div style={{ marginTop: '4px', fontSize: '10.5px', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 6px', borderRadius: '4px',
                            background: order.care_status.includes('Đã nhắn') ? 'rgba(245,158,11,0.18)'
                              : (order.care_status.includes('chốt') ? 'rgba(16,185,129,0.18)'
                              : (order.care_status.includes('Từ chối') ? 'rgba(239,68,68,0.18)' : 'rgba(99,102,241,0.18)')),
                            color: order.care_status.includes('Đã nhắn') ? '#f59e0b'
                              : (order.care_status.includes('chốt') ? '#10b981'
                              : (order.care_status.includes('Từ chối') ? '#ef4444' : '#818cf8')),
                            fontWeight: '700'
                          }}>
                            💬 {order.care_status} {order.care_time ? `(${order.care_time.split(' ')[0]})` : ''}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#818cf8', fontWeight: '600' }}>{prodName}</td>
                      <td style={{ padding: '14px 16px' }}>{expDate}</td>
                      <td style={{ padding: '14px 16px' }}>
                        {isExpired ? (
                          <span className="badge badge-danger">ĐÃ QUÁ HẠN {Math.abs(dLeft)} NGÀY</span>
                        ) : dLeft === 0 ? (
                          <span className="badge badge-danger">HẾT HẠN HÔM NAY</span>
                        ) : (
                          <span className="badge badge-warning">CÒN {dLeft} NGÀY</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            className="glass-button"
                            onClick={() => handleCopyMessage(order)}
                            style={{ padding: '5px 9px', fontSize: '11px', background: 'rgba(59,130,246,0.18)', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Copy tin nhắn Zalo gia hạn cá nhân hóa"
                          >
                            {isCopied ? <Check size={12} /> : <Copy size={12} />} Mẫu Zalo
                          </button>
                          <button
                            className="glass-button"
                            onClick={() => handleOpenCareModal(order)}
                            style={{ padding: '5px 9px', fontSize: '11px', background: 'rgba(168,85,247,0.18)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Lưu nhật ký chăm sóc khách hàng"
                          >
                            <MessageSquare size={12} /> CSKH
                          </button>
                          <button
                            className="glass-button"
                            onClick={() => handleOpenOrderRenewModal(order)}
                            style={{ padding: '5px 9px', fontSize: '11px', background: 'rgba(16,185,129,0.18)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Tạo đơn gia hạn mới"
                          >
                            <RefreshCw size={12} /> Gia Hạn
                          </button>

                          {order.care_status?.includes('Từ chối gia hạn') ? (
                            <button
                              className="glass-button"
                              onClick={() => handleQuickCareStatus(order, '')}
                              style={{ padding: '5px 9px', fontSize: '11px', background: 'rgba(56,189,248,0.18)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}
                              title="Khôi phục đơn về danh sách Cần CSKH"
                            >
                              <RefreshCw size={12} /> Khôi Phục
                            </button>
                          ) : (
                            <button
                              className="glass-button"
                              onClick={() => handleQuickCareStatus(order, '🔴 Từ chối gia hạn')}
                              style={{ padding: '5px 9px', fontSize: '11px', background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', gap: '4px' }}
                              title="Ẩn đơn này khỏi bảng Cần CSKH (Khách từ chối)"
                            >
                              <EyeOff size={12} /> Ẩn Cảnh Báo
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        </div>
      )}

      {/* Tab 2: Teams */}
      {activeTab === 'teams' && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Đang kiểm tra kho team hết hạn...</div>
          ) : filteredTeams.length === 0 ? (
            <div className="empty-state">
              <Truck size={40} />
              <h3>Không có kho team nào sắp hết hạn nguồn</h3>
              <p>Tất cả kho team đều có hạn dùng dài hạn.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Tên Kho Team', 'Dịch Vụ', 'Nhà Cung Cấp', 'Ngày Hết Hạn Nguồn', 'Tình Trạng Hạn', 'Thao Tác'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTeams.map(team => {
                  const expDate = team.expire_date || team.expireDate;
                  const dLeft = team.daysLeft;
                  const isExpired = dLeft < 0;
                  const isCopied = copiedId === `team-${team.id}`;

                  return (
                    <tr key={team.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '14px 16px' }}><strong style={{ color: '#fff' }}>{team.name}</strong></td>
                      <td style={{ padding: '14px 16px' }}><span className="badge badge-info">{team.category}</span></td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8' }}>{team.supplier_name || team.supplierName || 'Tự nhập'}</td>
                      <td style={{ padding: '14px 16px' }}>{expDate}</td>
                      <td style={{ padding: '14px 16px' }}>
                        {isExpired ? (
                          <span className="badge badge-danger">HẾT HẠN NGUỒN</span>
                        ) : (
                          <span className="badge badge-warning">CÒN {dLeft} NGÀY</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            className="glass-button"
                            onClick={() => handleCopyInfor(team.infor, team.id)}
                            style={{ padding: '5px 10px', fontSize: '11px', background: 'rgba(99,102,241,0.18)', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            {isCopied ? <Check size={12} /> : <Copy size={12} />} Acc Gốc
                          </button>
                          <button
                            className="glass-button"
                            onClick={() => handleOpenTeamRenewModal(team)}
                            style={{ padding: '5px 10px', fontSize: '11px', background: 'rgba(16,185,129,0.18)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <RefreshCw size={12} /> Gia Hạn Nguồn
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal Gia Hạn Đơn Khách */}
      {renewingOrder && (
        <div className="modal-overlay" onClick={() => setRenewingOrder(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Gia Hạn Đơn Hàng #{renewingOrder.id}</h2>
              <button className="modal-close-btn" onClick={() => setRenewingOrder(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleConfirmOrderRenew} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                <p style={{ margin: 0 }}>Khách hàng: <strong>{renewingOrder.customer_name || renewingOrder.customerName}</strong></p>
                <p style={{ margin: '4px 0 0', color: '#818cf8' }}>Sản phẩm: <strong>{renewingOrder.product_name || renewingOrder.productName}</strong></p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Thời Hạn Thêm (Ngày)</label>
                  <input
                    type="number" required className="glass-input"
                    value={orderRenewForm.durationDays} onChange={e => handleOrderDurationChange(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Ngày Hết Hạn Mới</label>
                  <input
                    type="date" className="glass-input"
                    value={orderRenewForm.newExpireDate} onChange={e => setOrderRenewForm({ ...orderRenewForm, newExpireDate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Giá Bán Gia Hạn (VNĐ)</label>
                  <input
                    type="number" required className="glass-input"
                    value={orderRenewForm.sellPrice} onChange={e => setOrderRenewForm({ ...orderRenewForm, sellPrice: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Giá Vốn Nhập (VNĐ)</label>
                  <input
                    type="number" required className="glass-input"
                    value={orderRenewForm.costPrice} onChange={e => setOrderRenewForm({ ...orderRenewForm, costPrice: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Trạng Thái Thanh Toán</label>
                <select
                  className="glass-input"
                  value={orderRenewForm.status} onChange={e => setOrderRenewForm({ ...orderRenewForm, status: e.target.value })}
                >
                  <option value="Đã thanh toán">Đã thanh toán</option>
                  <option value="Nợ">Nợ</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="submit" className="glass-button" style={{ flex: 1, background: '#10b981', color: '#fff', fontWeight: '700' }}>
                  Xác Nhận Tạo Đơn Gia Hạn
                </button>
                <button type="button" onClick={() => setRenewingOrder(null)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gia Hạn Kho Team */}
      {renewingTeam && (
        <div className="modal-overlay" onClick={() => setRenewingTeam(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Gia Hạn Nguồn Kho Team</h2>
              <button className="modal-close-btn" onClick={() => setRenewingTeam(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleConfirmTeamRenew} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                <p style={{ margin: 0 }}>Kho team: <strong>{renewingTeam.name}</strong></p>
                <p style={{ margin: '4px 0 0', color: '#94a3b8' }}>Dịch vụ: <strong>{renewingTeam.category}</strong></p>
              </div>

              <div>
                <label className="form-label">Ngày Hết Hạn Nguồn Mới</label>
                <input
                  type="date" required className="glass-input"
                  value={teamRenewForm.newExpireDate} onChange={e => setTeamRenewForm({ ...teamRenewForm, newExpireDate: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="submit" className="glass-button" style={{ flex: 1, background: '#10b981', color: '#fff', fontWeight: '700' }}>
                  Xác Nhận Cập Nhật Hạn Nguồn
                </button>
                <button type="button" onClick={() => setRenewingTeam(null)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Profile 360° Modal */}
      {selectedCustProfile && (
        <div className="modal-overlay" onClick={() => setSelectedCustProfile(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={20} color="#818cf8" /> Hồ Sơ Khách Hàng 360°
              </h2>
              <button className="modal-close-btn" onClick={() => setSelectedCustProfile(null)}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Customer Info Card */}
              <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#fff' }}>
                    {selectedCustProfile.customer.name}
                  </h3>
                  <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px', background: selectedCustProfile.customer.type === 'Si' ? 'rgba(168,85,247,0.2)' : 'rgba(6,182,212,0.2)', color: selectedCustProfile.customer.type === 'Si' ? '#a855f7' : '#06b6d4' }}>
                    {selectedCustProfile.customer.type === 'Si' ? '🟣 Khách Sỉ' : '🔵 Khách Lẻ'}
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#cbd5e1', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <span>📱 SĐT: <strong>{selectedCustProfile.customer.phone || 'Chưa có SĐT'}</strong></span>
                  <span>📧 Email: <strong>{selectedCustProfile.customer.email || 'Chưa có Email'}</strong></span>
                  <span>🏬 Kênh: <strong>{selectedCustProfile.customer.source || 'Trực tiếp'}</strong></span>
                </div>
              </div>

              {/* Care Timeline Section */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#a855f7', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  💬 Nhật Ký Chăm Sóc & Lịch Sử Tương Tác CSKH
                </h4>
                {(() => {
                  const rawLogs = [];
                  selectedCustProfile.orders.forEach(o => {
                    if (o.care_status) {
                      rawLogs.push({ time: o.care_time || 'Gần đây', status: o.care_status, notes: o.care_notes || '', orderId: o.id });
                    }
                  });

                  // Deduplicate by content + status + time
                  const seen = new Set();
                  const allCareLogs = rawLogs.filter(l => {
                    const key = `${l.status}_${l.notes}_${l.time}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                  });

                  if (allCareLogs.length === 0) {
                    return <div style={{ color: '#64748b', fontSize: '12px', padding: '10px', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>Chưa có ghi chú chăm sóc nào cho khách này.</div>;
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                      {allCareLogs.map((log, i) => (
                        <div key={i} style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '700' }}>
                            <span style={{ color: '#c084fc' }}>{log.status} (Đơn #{log.orderId})</span>
                            <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>🕒 {log.time}</span>
                          </div>
                          {log.notes && <div style={{ color: '#e2e8f0', marginTop: '4px', fontSize: '11.5px', fontStyle: 'italic' }}>"{log.notes}"</div>}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Purchase History Section */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#38bdf8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  📦 Lịch Sử Mua Hàng ({selectedCustProfile.orders.length} đơn)
                </h4>
                {selectedCustProfile.orders.length === 0 ? (
                  <div style={{ color: '#64748b', fontSize: '12px', padding: '12px', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>Chưa phát sinh đơn hàng khác.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {selectedCustProfile.orders.map(o => (
                      <div key={o.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: '#fff', fontSize: '13px' }}>#{o.id} - {o.product_name || o.productName}</strong>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Hạn dùng: {o.expire_date || o.expireDate || 'N/A'}</div>
                          {o.care_status && <div style={{ fontSize: '10.5px', color: '#f59e0b', marginTop: '2px' }}>💬 CSKH: {o.care_status} ({o.care_notes || ''})</div>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: '#10b981' }}>{Number(o.sell_price || o.sellPrice || 0).toLocaleString()}đ</span>
                          <span style={{ display: 'block', fontSize: '10.5px', color: o.status === 'Đã thanh toán' ? '#10b981' : '#f87171' }}>{o.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button className="glass-button" onClick={() => setSelectedCustProfile(null)} style={{ padding: '8px 20px' }}>Đóng Profile</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Care Note Modal */}
      {selectedCareOrder && (
        <div className="modal-overlay" onClick={() => setSelectedCareOrder(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '17px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={18} color="#a855f7" /> Nhật Ký Chăm Sóc Đơn #{selectedCareOrder.id}
              </h2>
              <button className="modal-close-btn" onClick={() => setSelectedCareOrder(null)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveCareNote} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ color: '#c084fc', fontWeight: '700', marginBottom: '8px', display: 'block' }}>
                  🏷️ TRẠNG THÁI CHĂM SÓC (BẮT BUỘC CHỌN) *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { label: '🟡 Đã nhắn Zalo', color: '#f59e0b', bg: 'rgba(245,158,11,0.18)' },
                    { label: '🟢 Khách chốt gia hạn', color: '#10b981', bg: 'rgba(16,185,129,0.18)' },
                    { label: '🔵 Khách hẹn lại', color: '#38bdf8', bg: 'rgba(56,189,248,0.18)' },
                    { label: '🔴 Từ chối gia hạn', color: '#ef4444', bg: 'rgba(239,68,68,0.18)' }
                  ].map(st => (
                    <button
                      key={st.label}
                      type="button"
                      onClick={() => setCareStatus(st.label)}
                      style={{
                        padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
                        background: careStatus === st.label ? st.bg : 'rgba(255,255,255,0.03)',
                        border: careStatus === st.label ? `1.5px solid ${st.color}` : '1px solid rgba(255,255,255,0.08)',
                        color: careStatus === st.label ? st.color : '#94a3b8',
                        fontSize: '12px', fontWeight: '700', transition: 'all 0.15s ease'
                      }}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">Ghi Chú Chi Tiết (Nội dung nhắn/Lý do hẹn...)</label>
                <textarea
                  className="glass-input"
                  rows={3}
                  placeholder="VD: Khách hẹn ngày 25/8 chuyển khoản gia hạn gói Canva Pro 1 năm..."
                  value={careNotes}
                  onChange={e => setCareNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" className="glass-button" onClick={() => setSelectedCareOrder(null)}>Hủy</button>
                <button type="submit" className="glass-button" style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', color: '#fff', fontWeight: '700' }}>
                  Lưu Nhật Ký CSKH
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
