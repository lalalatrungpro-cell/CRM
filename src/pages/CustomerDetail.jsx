import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CustomerService, OrderService, CareLogService, VietQRService, WarrantyLogService, TeamService } from '../utils/dataService';
import { getVietQRUrl } from '../utils/storage';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  ArrowLeft, Phone, Calendar, Clock, DollarSign, Award, Send,
  Plus, Trash2, ShieldAlert, Check, Copy, FileText, Eye, EyeOff, MessageCircle, X, Printer, ShieldCheck
} from 'lucide-react';

function numberToVietnameseWords(amount) {
  if (!amount || isNaN(amount) || amount === 0) return "Không đồng chẵn.";
  const num = Math.abs(Math.round(amount));
  const defaultNumbers = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

  function readGroup(n, isLeadingGroup) {
    let hundred = Math.floor(n / 100);
    let ten = Math.floor((n % 100) / 10);
    let unit = n % 10;
    let res = "";

    if (hundred > 0 || !isLeadingGroup) {
      res += defaultNumbers[hundred] + " trăm ";
    }

    if (ten === 0 && unit > 0) {
      if (hundred > 0 || !isLeadingGroup) res += "lẻ ";
      res += defaultNumbers[unit] + " ";
    } else if (ten === 1) {
      res += "mười ";
      if (unit === 1) res += "một ";
      else if (unit === 5) res += "lăm ";
      else if (unit > 0) res += defaultNumbers[unit] + " ";
    } else if (ten > 1) {
      res += defaultNumbers[ten] + " mươi ";
      if (unit === 1) res += "mốt ";
      else if (unit === 5) res += "lăm ";
      else if (unit > 0) res += defaultNumbers[unit] + " ";
    }
    return res;
  }

  let total = num;
  let billion = Math.floor(total / 1000000000);
  total %= 1000000000;
  let million = Math.floor(total / 1000000);
  total %= 1000000;
  let thousand = Math.floor(total / 1000);
  let remain = total % 1000;

  let resultStr = "";
  let isLeading = true;

  if (billion > 0) {
    resultStr += readGroup(billion, isLeading) + "tỷ ";
    isLeading = false;
  }
  if (million > 0) {
    resultStr += readGroup(million, isLeading) + "triệu ";
    isLeading = false;
  }
  if (thousand > 0) {
    resultStr += readGroup(thousand, isLeading) + "nghìn ";
    isLeading = false;
  }
  if (remain > 0) {
    resultStr += readGroup(remain, isLeading);
  }

  resultStr = resultStr.trim();
  if (resultStr.length > 0) {
    resultStr = resultStr.charAt(0).toUpperCase() + resultStr.slice(1) + " đồng chẵn.";
  } else {
    resultStr = "Không đồng chẵn.";
  }
  return resultStr;
}

const isUnpaid = (status) => {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  return s === 'nợ' || s === 'no' || s === 'chưa thanh toán';
};

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { shopId } = useAuth();

  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [teams, setTeams] = useState([]);
  const [careLogs, setCareLogs] = useState([]);
  const [warrantyLogs, setWarrantyLogs] = useState([]);
  const [vietqr, setVietqr] = useState(null);
  const [loading, setLoading] = useState(true);

  const [notes, setNotes] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const [revealedInfors, setRevealedInfors] = useState({});
  const [showDebtInvoiceModal, setShowDebtInvoiceModal] = useState(false);

  // Care log form
  const [logType, setLogType] = useState('Nhắc gia hạn');
  const [logContent, setLogContent] = useState('');
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState(null);

  const loadData = async () => {
    if (!shopId || !id) return;
    setLoading(true);
    try {
      const [custList, orderList, cLogs, vqrData, wLogs, tList] = await Promise.all([
        CustomerService.list(shopId),
        OrderService.list(shopId),
        CareLogService.list(shopId, id),
        VietQRService.get(shopId),
        WarrantyLogService.listByShop(shopId),
        TeamService.list(shopId)
      ]);

      const foundCust = (custList || []).find(c => String(c.id) === String(id));
      if (!foundCust) {
        toast.error('Không tìm thấy khách hàng!');
        navigate('/customers');
        return;
      }

      const custOrders = (orderList || []).filter(o => String(o.customer_id || o.customerId) === String(id));
      const orderIds = custOrders.map(o => o.id);
      const custWarrantyLogs = (wLogs || []).filter(w => orderIds.includes(w.order_id));

      setCustomer(foundCust);
      setNotes(foundCust.notes || '');
      setOrders(custOrders);
      setTeams(tList || []);
      setCareLogs(cLogs || []);
      setWarrantyLogs(custWarrantyLogs);
      setVietqr(vqrData || { bank_id: 'MB', account_no: '0901234567', account_name: 'SHOP DROPSHIP CRM', memo_prefix: 'DON' });
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải thông tin khách hàng từ Supabase!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [shopId, id]);

  const handleSaveNotes = async () => {
    try {
      await CustomerService.update(customer.id, { notes });
      toast.success('Đã lưu ghi chú khách hàng!');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi lưu ghi chú.');
    }
  };

  const handleAddCareLog = async (e) => {
    e.preventDefault();
    if (!logContent.trim()) return toast.error('Vui lòng nhập nội dung chăm sóc!');

    try {
      const created = await CareLogService.create(shopId, {
        customer_id: customer.id,
        type: logType,
        content: logContent.trim()
      });
      setCareLogs(prev => [created, ...prev]);
      setLogContent('');
      toast.success('Đã ghi nhận nhật ký chăm sóc khách!');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tạo nhật ký chăm sóc.');
    }
  };

  const handleDeleteCareLog = async () => {
    const logId = confirmDeleteLogId;
    try {
      await CareLogService.remove(logId);
      setCareLogs(prev => prev.filter(l => l.id !== logId));
      setConfirmDeleteLogId(null);
      toast.success('Đã xóa nhật ký chăm sóc!');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xóa nhật ký.');
    }
  };

  const handleCopyInfor = (text, oId) => {
    navigator.clipboard.writeText(text);
    setCopiedId(`infor-${oId}`);
    toast.success('Đã copy thông tin tài khoản!');
    setTimeout(() => setCopiedId(''), 2000);
  };

  const toggleRevealInfor = (oId) => {
    setRevealedInfors(prev => ({ ...prev, [oId]: !prev[oId] }));
  };

  const handleOpenZaloChat = () => {
    if (!customer || !customer.phone) {
      toast.error('Khách hàng chưa có số điện thoại!');
      return;
    }
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    window.open(`https://zalo.me/${cleanPhone}`, '_blank');
  };

  const totalSpent = orders
    .filter(o => o.status === 'Đã thanh toán')
    .reduce((sum, o) => sum + (o.sell_price || o.sellPrice || 0), 0);

  const unpaidOrdersList = orders.filter(o => isUnpaid(o.status));
  const calculatedDebt = unpaidOrdersList.reduce((sum, o) => sum + (o.sell_price || o.sellPrice || 0), 0);
  const currentDebt = calculatedDebt > 0 ? calculatedDebt : (customer ? (customer.debt || 0) : 0);

  const vqr = vietqr || {};
  const memo = `${vqr.memo_prefix || vqr.memoPrefix || 'DON'} NO KH ${customer ? customer.id : ''}`;
  const qrUrl = getVietQRUrl ? getVietQRUrl(vqr.bank_id || vqr.bankId, vqr.account_no || vqr.accountNo, vqr.account_name || vqr.accountName, currentDebt, memo) : '';

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Đang tải hồ sơ 360° khách hàng...</div>;
  }

  if (!customer) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Back & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="glass-button" onClick={() => navigate('/customers')} style={{ padding: '8px 12px' }}>
          <ArrowLeft size={16} /> Quay lại
        </button>
        <h1 style={{ fontSize: '22px', fontWeight: '800' }}>Hồ Sơ Khách Hàng 360°: {customer.name}</h1>
      </div>

      {/* Customer 360 Card */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(16,185,129,0.05))', border: '1px solid rgba(99,102,241,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#fff' }}>{customer.name}</h2>
              <span className="badge badge-info">{customer.type || 'Lẻ'}</span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '13.5px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={14} color="#10b981" /> {customer.phone || 'Chưa có SĐT'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="glass-button"
              onClick={handleOpenZaloChat}
              style={{ background: '#0068ff', color: '#fff', fontWeight: '700', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <MessageCircle size={16} /> Nhắn Zalo Trực Tiếp
            </button>
            <button
              className="glass-button"
              onClick={() => setShowDebtInvoiceModal(true)}
              style={{ background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <FileText size={16} /> Bảng Kê Công Nợ
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '10px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px' }}>
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>Tổng Doanh Thu (LTV)</span>
            <p style={{ fontSize: '20px', fontWeight: '800', color: '#10b981', margin: '4px 0' }}>{totalSpent.toLocaleString()}đ</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px' }}>
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>Tổng Đơn Hàng</span>
            <p style={{ fontSize: '20px', fontWeight: '800', color: '#6366f1', margin: '4px 0' }}>{orders.length} đơn</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px' }}>
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>Công Nợ Hiện Tại</span>
            <p style={{ fontSize: '20px', fontWeight: '800', color: currentDebt > 0 ? '#ef4444' : '#10b981', margin: '4px 0' }}>
              {currentDebt.toLocaleString()}đ
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Orders + Care Logs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Left Column: Orders & Warranty Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Orders History */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>📦 Lịch Sử Đơn Hàng ({orders.length})</h3>
            {orders.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Chưa có đơn hàng nào</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {orders.map(o => {
                  const isRev = revealedInfors[o.id];
                  const isCop = copiedId === `infor-${o.id}`;
                  const linkedTeam = teams.find(t => String(t.id) === String(o.team_id || o.teamId));
                  const rawTeamName = linkedTeam ? linkedTeam.name : (o.team_name || o.teamName || (o.team_id ? `Team #${o.team_id}` : null));
                  let cleanName = rawTeamName ? String(rawTeamName).trim() : null;
                  if (cleanName && cleanName.includes('|')) cleanName = cleanName.split('|')[0].trim();
                  if (cleanName) cleanName = cleanName.replace(/^Mail\s*\|\s*Pass\s*\|\s*2FA\s*/i, '').trim();

                  return (
                    <div key={o.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#818cf8', fontSize: '14px' }}>#{o.id} - {o.product_name || o.productName}</strong>
                        <span className={`badge ${o.status === 'Đã thanh toán' ? 'badge-success' : 'badge-warning'}`}>{o.status}</span>
                      </div>
                      {cleanName && (
                        <div title={rawTeamName} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', padding: '3px 8px', fontSize: '11.5px', color: '#10b981', fontWeight: '700', width: 'fit-content', margin: '2px 0', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <ShieldCheck size={13} style={{ flexShrink: 0 }} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{cleanName}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#94a3b8' }}>
                        <span>Hạn: {o.expire_date || o.expireDate || '---'}</span>
                        <strong style={{ color: '#10b981' }}>{(o.sell_price || o.sellPrice || 0).toLocaleString()}đ</strong>
                      </div>
                      {o.infor && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '6px', marginTop: '4px' }}>
                          <code style={{ flex: 1, fontSize: '11.5px', color: isRev ? '#fff' : '#64748b' }}>
                            {isRev ? o.infor : '••••••••••••••••'}
                          </code>
                          <button onClick={() => toggleRevealInfor(o.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                            {isRev ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                          <button onClick={() => handleCopyInfor(o.infor, o.id)} style={{ background: 'none', border: 'none', color: isCop ? '#10b981' : '#94a3b8', cursor: 'pointer' }}>
                            {isCop ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Warranty History */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>🛡️ Lịch Sử Bảo Hành / Đổi Acc ({warrantyLogs.length})</h3>
            {warrantyLogs.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '16px' }}>Khách chưa có lượt bảo hành nào</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {warrantyLogs.map((w, idx) => (
                  <div key={w.id || idx} style={{ background: 'rgba(245,158,11,0.08)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#f59e0b', fontWeight: '700' }}>
                      <span>Đơn #{w.order_id} - Lý do: {w.reason}</span>
                      <span>{new Date(w.created_at).toLocaleDateString('vi-VN')}</span>
                    </div>
                    {w.new_infor && (
                      <div style={{ fontSize: '11.5px', color: '#fff', marginTop: '4px', fontFamily: 'monospace' }}>
                        Acc mới: {w.new_infor}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Care Logs & Internal Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Notes Box */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>📝 Ghi Chú Nội Bộ Khách Hàng</h3>
            <textarea
              className="glass-input"
              style={{ minHeight: '80px', fontSize: '13px' }}
              placeholder="Ghi chú thói quen khách, yêu cầu riêng..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
            <button className="glass-button" onClick={handleSaveNotes} style={{ alignSelf: 'flex-end', fontSize: '12px' }}>
              Lưu Ghi Chú
            </button>
          </div>

          {/* Timeline Care Logs */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>💬 Nhật Ký Chăm Sóc Khách</h3>

            <form onSubmit={handleAddCareLog} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <select className="glass-input" value={logType} onChange={e => setLogType(e.target.value)}>
                <option value="Nhắc gia hạn">Nhắc gia hạn</option>
                <option value="Hỗ trợ/Bảo hành">Hỗ trợ / Bảo hành</option>
                <option value="Tư vấn bán mới">Tư vấn bán mới</option>
                <option value="Thu nợ">Thu nợ</option>
                <option value="Tương tác khác">Tương tác khác</option>
              </select>
              <textarea
                className="glass-input"
                style={{ minHeight: '60px', fontSize: '12.5px' }}
                placeholder="Nội dung tương tác với khách..."
                value={logContent}
                onChange={e => setLogContent(e.target.value)}
                required
              />
              <button type="submit" className="glass-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Send size={14} /> Ghi Nhật Ký
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              {careLogs.map(log => (
                <div key={log.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge badge-info" style={{ fontSize: '10px' }}>{log.type}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{new Date(log.created_at).toLocaleDateString('vi-VN')}</span>
                      <button onClick={() => setConfirmDeleteLogId(log.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <p style={{ color: '#fff', fontSize: '13px', marginTop: '6px', whiteSpace: 'pre-wrap' }}>{log.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Printable Debt Invoice Modal */}
      {showDebtInvoiceModal && (
        <div className="modal-overlay" onClick={() => setShowDebtInvoiceModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '780px', background: '#fff', color: '#0f172a' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>BẢNG KÊ CÔNG NỢ KHÁCH HÀNG</h2>
              <button className="modal-close-btn" style={{ color: '#000' }} onClick={() => setShowDebtInvoiceModal(false)}><X size={18} /></button>
            </div>

            <div id="printable-invoice" style={{ padding: '12px 4px', fontSize: '12.5px', color: '#0f172a', lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #ef4444', paddingBottom: '10px', marginBottom: '14px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#ef4444', margin: 0 }}>DROPSHIP CRM STORE</h2>
                  <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0' }}>Chuyên Dịch Vụ & Tài Khoản Bản Quyền Số</p>
                  <p style={{ fontSize: '11.5px', color: '#64748b', margin: 0 }}>Hotline / Zalo CSKH: <strong>0901234567</strong></p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0, textTransform: 'uppercase' }}>BẢNG KÊ CÔNG NỢ THU TIỀN</h3>
                  <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0' }}>
                    Số chứng từ: <strong>BKCN-{new Date().getFullYear()}/{(new Date().getMonth() + 1).toString().padStart(2, '0')}/{customer.id}</strong>
                  </p>
                  <p style={{ fontSize: '11.5px', color: '#64748b', margin: 0 }}>
                    Ngày xuất: {new Date().toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>

              {/* Customer Info Box */}
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px' }}>
                  <div><strong>Tên Khách Hàng (Bên Nợ):</strong> {customer.name}</div>
                  <div><strong>SĐT / Zalo:</strong> {customer.phone || 'N/A'}</div>
                  <div><strong>Mã Khách Hàng:</strong> KH-{customer.id}</div>
                  <div><strong>Phân Loại:</strong> {customer.type === 'Si' ? 'Khách Sỉ / Đại lý' : customer.type === 'CTV' ? 'Cộng Tác Viên' : 'Khách Lẻ'}</div>
                </div>
              </div>

              {/* Detailed Orders Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '8px', textAlign: 'center', width: '40px', border: '1px solid #cbd5e1' }}>STT</th>
                    <th style={{ padding: '8px', textAlign: 'center', width: '70px', border: '1px solid #cbd5e1' }}>Mã Đơn</th>
                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Tên SP</th>
                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Infor SP</th>
                    <th style={{ padding: '8px', textAlign: 'right', width: '100px', border: '1px solid #cbd5e1' }}>Đơn Giá</th>
                    <th style={{ padding: '8px', textAlign: 'center', width: '40px', border: '1px solid #cbd5e1' }}>SL</th>
                    <th style={{ padding: '8px', textAlign: 'right', width: '110px', border: '1px solid #cbd5e1' }}>Thành Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {unpaidOrdersList.length > 0 ? (
                    unpaidOrdersList.map((o, idx) => (
                      <tr key={o.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{idx + 1}</td>
                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700', border: '1px solid #cbd5e1' }}>#{o.id}</td>
                        <td style={{ padding: '8px', fontWeight: '700', color: '#0f172a', border: '1px solid #cbd5e1' }}>{o.product_name || o.productName}</td>
                        <td style={{ padding: '8px', fontSize: '11px', color: '#475569', fontFamily: 'monospace', wordBreak: 'break-all', border: '1px solid #cbd5e1' }}>
                          {o.infor || 'Chưa cấp infor'}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #cbd5e1' }}>{(o.sell_price || o.sellPrice || 0).toLocaleString()}đ</td>
                        <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>1</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700', color: '#ef4444', border: '1px solid #cbd5e1' }}>
                          {(o.sell_price || o.sellPrice || 0).toLocaleString()}đ
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>1</td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700', border: '1px solid #cbd5e1' }}>---</td>
                      <td style={{ padding: '8px', fontWeight: '700', border: '1px solid #cbd5e1' }}>Dư nợ công nợ dịch vụ tích lũy chốt sổ</td>
                      <td style={{ padding: '8px', fontSize: '11px', color: '#475569', fontFamily: 'monospace', border: '1px solid #cbd5e1' }}>Tích lũy chốt sổ</td>
                      <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #cbd5e1' }}>{currentDebt.toLocaleString()}đ</td>
                      <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>1</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700', color: '#ef4444', border: '1px solid #cbd5e1' }}>
                        {currentDebt.toLocaleString()}đ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* VietQR & Total Box */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {qrUrl && (
                    <img
                      src={qrUrl}
                      alt="VietQR Chuyển Khoản"
                      style={{ width: '135px', height: 'auto', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  )}
                  <div style={{ fontSize: '11.5px', color: '#334155', lineHeight: 1.5 }}>
                    <p style={{ margin: 0, fontWeight: '700', color: '#0f172a' }}>💳 THÔNG TIN CHUYỂN KHOẢN:</p>
                    <p style={{ margin: 0 }}>🏦 Ngân hàng: <strong>{vietqr?.bank_id || vietqr?.bankId || 'MB'}</strong></p>
                    <p style={{ margin: 0 }}>🔢 Số tài khoản: <strong style={{ color: '#10b981' }}>{vietqr?.account_no || vietqr?.accountNo || '0901234567'}</strong></p>
                    <p style={{ margin: 0 }}>👤 Chủ TK: <strong>{vietqr?.account_name || vietqr?.accountName || 'SHOP DROPSHIP CRM'}</strong></p>
                    <p style={{ margin: 0 }}>📝 Nội dung CK: <strong style={{ color: '#ef4444' }}>{(vietqr?.memo_prefix || vietqr?.memoPrefix || 'DON') + ' NO KH ' + customer.id}</strong></p>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0, fontWeight: '600' }}>TỔNG CỘNG CÔNG NỢ PHẢI THU:</p>
                  <p style={{ fontSize: '22px', fontWeight: '800', color: '#ef4444', margin: '4px 0' }}>
                    {currentDebt.toLocaleString()} VNĐ
                  </p>
                  <p style={{ fontSize: '12px', color: '#334155', fontStyle: 'italic', margin: 0 }}>
                    (Bằng chữ: <strong>{numberToVietnameseWords(currentDebt)}</strong>)
                  </p>
                </div>
              </div>

              {/* Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center', marginTop: '20px', fontSize: '11.5px' }}>
                <div>
                  <p style={{ fontWeight: '700', margin: 0 }}>NGƯỜI LẬP BẢNG KÊ</p>
                  <p style={{ fontSize: '10.5px', color: '#64748b', fontStyle: 'italic', margin: '2px 0 45px 0' }}>(Ký, ghi rõ họ tên)</p>
                  <p style={{ fontWeight: '600', color: '#334155' }}>Nhân Viên Kế Toán</p>
                </div>
                <div>
                  <p style={{ fontWeight: '700', margin: 0 }}>KHÁCH HÀNG / BÊN NỢ</p>
                  <p style={{ fontSize: '10.5px', color: '#64748b', fontStyle: 'italic', margin: '2px 0 45px 0' }}>(Ký, xác nhận đối chiếu)</p>
                  <p style={{ fontWeight: '600', color: '#334155' }}>{customer.name}</p>
                </div>
                <div>
                  <p style={{ fontWeight: '700', margin: 0 }}>ĐẠI DIỆN CỬA HÀNG</p>
                  <p style={{ fontSize: '10.5px', color: '#64748b', fontStyle: 'italic', margin: '2px 0 45px 0' }}>(Ký, đóng dấu nếu có)</p>
                  <p style={{ fontWeight: '600', color: '#334155' }}>Chủ Shop CRM</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              <button onClick={() => window.print()} className="glass-button" style={{ flex: 1, background: '#ef4444', color: '#fff', fontWeight: '700' }}>
                <Printer size={16} /> In Bảng Kê Công Nợ (Print A4)
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmDeleteLogId}
        title="Xóa Nhật Ký Chăm Sóc?"
        message="Bạn có chắc muốn xóa dòng nhật ký này?"
        onConfirm={handleDeleteCareLog}
        onCancel={() => setConfirmDeleteLogId(null)}
        confirmLabel="Xác Nhận Xóa"
      />
    </div>
  );
}
