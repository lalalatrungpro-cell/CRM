import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { OrderService, TeamService } from '../utils/dataService';
import { useToast } from '../components/Toast';
import { Clock, Truck, Copy, Check, RefreshCw, Search, X } from 'lucide-react';

export default function ExpiringAccounts() {
  const toast = useToast();
  const { shopId } = useAuth();

  const [orders, setOrders] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  const [copiedId, setCopiedId] = useState('');
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'teams'
  const [searchTerm, setSearchTerm] = useState('');

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
      const [oList, tList] = await Promise.all([
        OrderService.list(shopId),
        TeamService.list(shopId)
      ]);
      setOrders(oList || []);
      setTeams(tList || []);
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
      .filter(o => o && o.daysLeft <= o.warnDays)
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
    const custName = o.customer_name || o.customerName || '';
    const prodName = o.product_name || o.productName || '';
    return custName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (o.phone || '').includes(searchTerm) ||
           prodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           String(o.id).includes(searchTerm);
  });

  const filteredTeams = teamsWithDays.filter(t => {
    return (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
           (t.category || '').toLowerCase().includes(searchTerm.toLowerCase());
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
                      <td style={{ padding: '14px 16px' }}><strong>#{order.id}</strong></td>
                      <td style={{ padding: '14px 16px' }}>
                        <strong style={{ color: '#fff' }}>{custName}</strong>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{order.phone || 'N/A'}</div>
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
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            className="glass-button"
                            onClick={() => handleCopyMessage(order)}
                            style={{ padding: '5px 10px', fontSize: '11px', background: 'rgba(59,130,246,0.18)', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            {isCopied ? <Check size={12} /> : <Copy size={12} />} Mẫu Zalo
                          </button>
                          <button
                            className="glass-button"
                            onClick={() => handleOpenOrderRenewModal(order)}
                            style={{ padding: '5px 10px', fontSize: '11px', background: 'rgba(16,185,129,0.18)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <RefreshCw size={12} /> Gia Hạn Đơn
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
    </div>
  );
}
