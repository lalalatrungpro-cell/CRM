import { getBankDisplayName } from '../utils/storage';
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { OrderService, TeamService, CustomerService, CareLogService, VietQRService } from '../utils/dataService';
import { useToast } from '../components/Toast';
import DateFilterBar from '../components/DateFilterBar';
import { Clock, Truck, Copy, Check, RefreshCw, Search, X, MessageSquare, User, ExternalLink, Calendar, ShieldCheck, DollarSign, EyeOff } from 'lucide-react';

export default function ExpiringAccounts() {
  const toast = useToast();
  const { shopId } = useAuth();

  const [orders, setOrders] = useState([]);
  const [teams, setTeams] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vietqr, setVietqr] = useState(null);
  const [loading, setLoading] = useState(true);

  // Customer Profile 360° Modal State
  const [selectedCustProfile, setSelectedCustProfile] = useState(null);

  // Care Sub-Tabs State ('PENDING' | 'ZALO' | 'SUCCESS' | 'REFUSED' | 'ALL')
  const [careFilterTab, setCareFilterTab] = useState('PENDING');

  // Care Note & Unified 360 State
  const [selectedCareOrder, setSelectedCareOrder] = useState(null);
  const [careStatus, setCareStatus] = useState('Đã nhắn Zalo');
  const [careNotes, setCareNotes] = useState('');
  const [followupDate, setFollowupDate] = useState('');

  const [copiedId, setCopiedId] = useState('');
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'teams'
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '', preset: 'ALL' });

  // Renewal Modals
  const [renewingOrder, setRenewingOrder] = useState(null);
  const [renewingTeam, setRenewingTeam] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const formatShortDate = (dateStr) => {
    if (!dateStr || dateStr === '---') return '---';
    const parts = String(dateStr).split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parts[0].slice(-2);
      const month = parts[1];
      const day = parts[2];
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };


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

  
  const handleCopyFullOrderText = (order) => {
    if (!order) return;
    const vqr = vietqr || { bank_id: 'MB', account_no: '0901234567', account_name: 'SHOP DROPSHIP CRM', memo_prefix: 'DON' };
    const rawBankId = vqr.bank_id || vqr.bankId || 'MB';
    const bankId = getBankDisplayName(rawBankId);
    const accountNo = vqr.account_no || vqr.accountNo || '0901234567';
    const accountName = vqr.account_name || vqr.accountName || 'SHOP DROPSHIP CRM';
    const memo = `${vqr.memo_prefix || vqr.memoPrefix || 'DON'} ${order.id}`;

    const custName = order.customer_name || order.customerName || 'Khách Hàng';
    const prodName = order.product_name || order.productName || 'Sản Phẩm';
    const infor = order.infor || 'Đã kích hoạt';
    const expDate = order.expire_date || order.expireDate || '---';
    const price = (order.sell_price || order.sellPrice || 0).toLocaleString();

    let text = `🎉 XÁC NHẬN ĐƠN HÀNG #${order.id}\n`;
    text += `👤 Khách hàng: ${custName}\n`;
    text += `📦 Sản phẩm: ${prodName}\n`;
    text += `🔑 Account / Info: ${infor}\n`;
    text += `⏳ Ngày hết hạn: ${expDate}\n`;
    text += `💰 Giá thanh toán: ${price} VNĐ\n\n`;
    text += `💳 THÔNG TIN CHUYỂN KHOẢN:\n`;
    text += `🏦 Ngân hàng: ${bankId}\n`;
    text += `🔢 Số tài khoản: ${accountNo}\n`;
    text += `👤 Chủ TK: ${accountName}\n`;
    text += `📝 Nội dung CK: ${memo}\n\n`;
    text += `Cảm ơn Quý khách đã ủng hộ shop! ❤️🎁`;

    navigator.clipboard.writeText(text);
    setCopiedId(`full-${order.id}`);
    toast.success(`✅ Đã copy toàn bộ thông tin đơn hàng #${order.id}! Dán (Ctrl+V) sang Zalo ngay.`);
    setTimeout(() => setCopiedId(''), 2000);
  };

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
    
    // Target order for care notes
    const targetOrder = order || custOrders[0] || {};
    setSelectedCustProfile({ customer: cust, orders: custOrders, currentOrder: targetOrder });
    setCareStatus(targetOrder.care_status || targetOrder.careStatus || '🟡 Đã nhắn Zalo');
    setCareNotes(targetOrder.care_notes || targetOrder.careNotes || '');
    setFollowupDate(targetOrder.followup_date || targetOrder.followupDate || '');
  };

  const handleOpenCareModal = (order) => {
    setSelectedCareOrder(order);
    setCareStatus(order.care_status || order.careStatus || 'Đã nhắn Zalo');
    setCareNotes(order.care_notes || order.careNotes || '');
  };

  
  const handleSaveUnifiedCareNote = async (e) => {
    e.preventDefault();
    if (!selectedCustProfile || !selectedCustProfile.currentOrder) return;
    const targetOrder = selectedCustProfile.currentOrder;

    try {
      const nowStr = new Date().toLocaleString('vi-VN');
      const prevHistory = Array.isArray(targetOrder.care_history || targetOrder.careHistory) 
        ? (targetOrder.care_history || targetOrder.careHistory) 
        : [];
      
      const newEntry = {
        time: nowStr,
        status: careStatus,
        notes: careNotes,
        followup_date: followupDate
      };

      const updatedHistory = [newEntry, ...prevHistory];

      const payload = {
        care_status: careStatus,
        care_notes: careNotes,
        care_time: nowStr,
        followup_date: followupDate,
        care_history: updatedHistory
      };

      const updated = await OrderService.update(targetOrder.id, payload);
      setOrders(prev => prev.map(o => o.id === targetOrder.id ? { ...o, ...payload } : o));

      const custId = targetOrder.customer_id || targetOrder.customerId;
      if (custId) {
        try {
          await Promise.all([
            CustomerService.update(custId, {
              care_status: careStatus,
              care_notes: careNotes,
              care_time: nowStr,
              followup_date: followupDate
            }),
            CareLogService.create(shopId, {
              customer_id: custId,
              type: careStatus,
              content: careNotes ? `[Đơn #${targetOrder.id}] ${careNotes}` : `[Đơn #${targetOrder.id}] ${careStatus}`
            })
          ]);

          setCustomers(prev => prev.map(c => String(c.id) === String(custId) ? {
            ...c,
            care_status: careStatus,
            care_notes: careNotes,
            care_time: nowStr,
            followup_date: followupDate
          } : c));
        } catch (e) {}
      }

      // Update local profile state
      setSelectedCustProfile(prev => prev ? {
        ...prev,
        currentOrder: { ...prev.currentOrder, ...payload },
        orders: prev.orders.map(o => o.id === targetOrder.id ? { ...o, ...payload } : o)
      } : null);

      toast.success(`Đã lưu nhật ký CSKH 360° cho đơn #${targetOrder.id}!`);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi lưu nhật ký chăm sóc.');
    }
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
            <div style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#0f172a', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
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
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ color: '#818cf8', fontWeight: '700' }}>{prodName}</div>
                        {order.infor ? (
                          <div style={{ marginTop: '4px', fontSize: '11px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={order.infor}>
                              🔑 {order.infor}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyFullOrderText(order)}
                              style={{ background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.35)', color: '#10b981', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer', fontWeight: '700', whiteSpace: 'nowrap' }}
                              title="1-Click copy TOÀN BỘ thông tin đơn hàng gửi Zalo"
                            >
                              {copiedId === `full-${order.id}` ? '✓ Đã Copy' : 'Copy Đơn'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(order.infor);
                                setCopiedId(`infor-${order.id}`);
                                toast.success(`✅ Đã copy thông tin acc/key đơn #${order.id}!`);
                                setTimeout(() => setCopiedId(''), 2000);
                              }}
                              style={{ background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.35)', color: '#818cf8', borderRadius: '4px', padding: '2px 6px', fontSize: '10.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '700' }}
                              title="Copy chỉ chuỗi email/password/key"
                            >
                              {copiedId === `infor-${order.id}` ? <Check size={11} /> : <Copy size={11} />} Copy Acc
                            </button>
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>Tự nhập acc</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', fontWeight: '600' }}>{formatShortDate(expDate)}</td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        {isExpired ? (
                          <span className="badge badge-danger" style={{ padding: '3px 8px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>Quá hạn {Math.abs(dLeft)} ngày</span>
                        ) : dLeft === 0 ? (
                          <span className="badge badge-danger" style={{ padding: '3px 8px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>Hết hạn hôm nay</span>
                        ) : (
                          <span className="badge badge-warning" style={{ padding: '3px 8px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>Còn {dLeft} ngày</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenCustProfile(order)}
                            style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}
                            title="Mở Hồ Sơ Khách Hàng 360° & Chăm Sóc KH"
                          >
                            <MessageSquare size={12} /> CSKH 360°
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenOrderRenewModal(order)}
                            style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}
                            title="Tạo đơn gia hạn mới"
                          >
                            <RefreshCw size={12} /> Gia Hạn
                          </button>

                          {order.care_status?.includes('Từ chối gia hạn') ? (
                            <button
                              type="button"
                              onClick={() => handleQuickCareStatus(order, '')}
                              style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}
                              title="Khôi phục đơn về danh sách Cần CSKH"
                            >
                              <RefreshCw size={11} /> Khôi Phục
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleQuickCareStatus(order, '🔴 Từ chối gia hạn')}
                              style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.22)', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}
                              title="Ẩn đơn này khỏi bảng Cần CSKH (Khách từ chối)"
                            >
                              <EyeOff size={11} /> Ẩn Cảnh Báo
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
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

      {/* UNIFIED CUSTOMER 360° PROFILE & CSKH CARE MODAL */}
      {selectedCustProfile && (
        <div className="modal-overlay" onClick={() => setSelectedCustProfile(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={20} color="#a855f7" /> Hồ Sơ Khách Hàng 360° & CSKH
              </h2>
              <button className="modal-close-btn" onClick={() => setSelectedCustProfile(null)}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* SECTION 1: Customer Profile Header Card */}
              <div style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#fff' }}>
                    👤 {selectedCustProfile.customer.name}
                  </h3>
                  <span style={{ fontSize: '11.5px', fontWeight: '700', padding: '3px 10px', borderRadius: '6px', background: selectedCustProfile.customer.type === 'Si' ? 'rgba(168,85,247,0.25)' : 'rgba(6,182,212,0.25)', color: selectedCustProfile.customer.type === 'Si' ? '#c084fc' : '#38bdf8' }}>
                    {selectedCustProfile.customer.type === 'Si' ? '🟣 Khách Sỉ' : '🔵 Khách Lẻ'}
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#cbd5e1', display: 'flex', gap: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span>📱 SĐT/Zalo: <strong style={{ color: '#fff' }}>{selectedCustProfile.customer.phone || 'N/A'}</strong></span>
                  {selectedCustProfile.customer.email && <span>📧 Email: <strong style={{ color: '#fff' }}>{selectedCustProfile.customer.email}</strong></span>}
                  <span>🏬 Kênh: <strong style={{ color: '#818cf8' }}>{selectedCustProfile.customer.source || 'Trực tiếp'}</strong></span>
                  <span>💰 Tổng LTV: <strong style={{ color: '#10b981' }}>{selectedCustProfile.orders.reduce((sum, o) => sum + Number(o.sell_price || o.sellPrice || 0), 0).toLocaleString()}đ</strong></span>
                </div>
                {selectedCustProfile.currentOrder?.infor && (
                  <div style={{ marginTop: '4px', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#e2e8f0', fontFamily: 'monospace' }}>
                      🔑 <strong>Infor Acc/Key (Đơn #{selectedCustProfile.currentOrder.id}):</strong> {selectedCustProfile.currentOrder.infor}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleCopyFullOrderText(selectedCustProfile.currentOrder)}
                        style={{ background: 'rgba(16,185,129,0.22)', border: '1px solid rgba(16,185,129,0.45)', color: '#10b981', borderRadius: '6px', padding: '4px 10px', fontSize: '11.5px', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Copy TOÀN BỘ văn bản xác nhận đơn hàng đầy đủ (Tên, SP, Acc, Hạn, Giá, Ngân hàng)"
                      >
                        {copiedId === `full-${selectedCustProfile.currentOrder.id}` ? <Check size={12} /> : <Copy size={12} />} 📋 Copy Full Đơn Hàng Cũ
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedCustProfile.currentOrder.infor);
                          setCopiedId(`infor-modal-${selectedCustProfile.currentOrder.id}`);
                          toast.success(`✅ Đã copy thông tin acc/key đơn #${selectedCustProfile.currentOrder.id}!`);
                          setTimeout(() => setCopiedId(''), 2000);
                        }}
                        style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8', borderRadius: '6px', padding: '4px 10px', fontSize: '11.5px', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Copy chỉ chuỗi Acc/Key"
                      >
                        {copiedId === `infor-modal-${selectedCustProfile.currentOrder.id}` ? <Check size={12} /> : <Copy size={12} />} Copy Acc
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: Interactive CSKH 1-Click Action Panel */}
              <form onSubmit={handleSaveUnifiedCareNote} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '13.5px', fontWeight: '800', color: '#f59e0b', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={15} /> TƯƠNG TÁC CSKH & NHẮC TÁI KÝ ĐƠN #{selectedCustProfile.currentOrder?.id || ''}
                </h4>

                {/* Quick Status Selector Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                  {[
                    { label: '🟡 Đã nhắn Zalo', value: '🟡 Đã nhắn Zalo', color: '#f59e0b' },
                    { label: '🟢 Khách chốt gia hạn', value: '🟢 Khách chốt gia hạn', color: '#10b981' },
                    { label: '🔵 Khách hẹn lại', value: '🔵 Khách hẹn lại', color: '#38bdf8' },
                    { label: '🔴 Từ chối gia hạn', value: '🔴 Từ chối gia hạn', color: '#ef4444' }
                  ].map(st => (
                    <button
                      key={st.value}
                      type="button"
                      onClick={() => setCareStatus(st.value)}
                      style={{
                        padding: '8px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', textAlign: 'center',
                        background: careStatus === st.value ? `${st.color}25` : 'rgba(255,255,255,0.04)',
                        border: careStatus === st.value ? `1.5px solid ${st.color}` : '1px solid rgba(255,255,255,0.08)',
                        color: careStatus === st.value ? st.color : '#94a3b8',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                {/* Follow-up Reminder Date (Shows when Khách hẹn lại is selected) */}
                {careStatus.includes('hẹn lại') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(56,189,248,0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(56,189,248,0.25)' }}>
                    <Calendar size={16} color="#38bdf8" />
                    <label style={{ fontSize: '12.5px', color: '#38bdf8', fontWeight: '700', whiteSpace: 'nowrap' }}>📅 Chọn Ngày Hẹn Nhắc Lại:</label>
                    <input
                      type="date"
                      className="glass-input"
                      value={followupDate}
                      onChange={e => setFollowupDate(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: '12.5px' }}
                    />
                  </div>
                )}

                {/* Quick Zalo Copy Button */}
                {selectedCustProfile.currentOrder && (
                  <button
                    type="button"
                    onClick={() => {
                      handleCopyMessage(selectedCustProfile.currentOrder);
                      setCareStatus('🟡 Đã nhắn Zalo');
                    }}
                    style={{
                      padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                      background: 'rgba(59,130,246,0.18)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    <Copy size={14} /> 📋 Copy Tin Nhắn Mẫu Zalo Tái Ký Cá Nhân Hóa
                  </button>
                )}

                {/* Notes Textarea */}
                <div>
                  <label className="form-label" style={{ fontSize: '11.5px', color: '#94a3b8' }}>Ghi Chú Chi Tiết Tương Tác</label>
                  <textarea
                    className="glass-input"
                    rows={2}
                    placeholder="Gõ ghi chú chăm sóc (VD: Khách hẹn ngày 28/8 nạp tiền gia hạn Canva Pro 1 năm...)"
                    value={careNotes}
                    onChange={e => setCareNotes(e.target.value)}
                    style={{ fontSize: '12.5px', resize: 'vertical' }}
                  />
                </div>

                {/* Submit Save Button */}
                <button
                  type="submit"
                  className="glass-button"
                  style={{ padding: '10px', fontSize: '13px', background: '#a855f7', color: '#fff', fontWeight: '700', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Check size={16} /> 💾 Lưu Nhật Ký CSKH 360° & Cập Nhật Profile
                </button>
              </form>

              {/* SECTION 3: Care History Timeline */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#c084fc', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  💬 Dòng Thời Gian Nhật Ký CSKH (Lịch Sử Tương Tác)
                </h4>
                {(() => {
                  const rawLogs = [];
                  selectedCustProfile.orders.forEach(o => {
                    if (o.care_status) {
                      rawLogs.push({ time: o.care_time || 'Gần đây', status: o.care_status, notes: o.care_notes || '', orderId: o.id });
                    }
                  });

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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                      {allCareLogs.map((log, i) => (
                        <div key={i} style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '700' }}>
                            <span style={{ color: '#c084fc' }}>{log.status} (Đơn #${log.orderId})</span>
                            <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>🕒 {log.time}</span>
                          </div>
                          {log.notes && <div style={{ color: '#e2e8f0', marginTop: '4px', fontSize: '11.5px', fontStyle: 'italic' }}>"${log.notes}"</div>}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* SECTION 4: Purchase History & Quick Renewal */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#38bdf8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  📦 Lịch Sử Mua Hàng ({selectedCustProfile.orders.length} đơn) & Gia Hạn
                </h4>
                {selectedCustProfile.orders.length === 0 ? (
                  <div style={{ color: '#64748b', fontSize: '12px', padding: '12px', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>Chưa phát sinh đơn hàng khác.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                    {selectedCustProfile.orders.map(o => (
                      <div key={o.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: '#fff', fontSize: '13px' }}>#{o.id} - {o.product_name || o.productName}</strong>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Hạn dùng: {o.expire_date || o.expireDate || 'N/A'}</div>
                          {o.infor && (
                            <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '4px' }}>🔑 {o.infor}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(o.infor);
                                  toast.success(`✅ Đã copy thông tin acc/key đơn #${o.id}!`);
                                }}
                                style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', padding: 0, fontSize: '10.5px', fontWeight: '700', textDecoration: 'underline' }}
                              >
                                Copy
                              </button>
                            </div>
                          )}
                          {o.care_status && <div style={{ fontSize: '10.5px', color: '#f59e0b', marginTop: '2px' }}>💬 CSKH: {o.care_status} ({o.care_notes || ''})</div>}
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: '#10b981' }}>{Number(o.sell_price || o.sellPrice || 0).toLocaleString()}đ</span>
                          <button
                            type="button"
                            className="glass-button"
                            onClick={() => {
                              setSelectedCustProfile(null);
                              handleOpenOrderRenewModal(o);
                            }}
                            style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(16,185,129,0.18)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <RefreshCw size={11} /> Gia Hạn Đơn Này
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button className="glass-button" onClick={() => setSelectedCustProfile(null)} style={{ padding: '8px 20px', fontSize: '12.5px' }}>Đóng Profile 360°</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
