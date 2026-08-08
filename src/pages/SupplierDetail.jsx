import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SupplierService, TeamService, OrderService } from '../utils/dataService';
import { useToast } from '../components/Toast';
import { ArrowLeft, Phone, FileText, MessageCircle, Truck, Layers, ShoppingBag } from 'lucide-react';

export default function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { shopId } = useAuth();

  const [supplier, setSupplier] = useState(null);
  const [teams, setTeams] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!shopId || !id) return;
    setLoading(true);
    try {
      const [suppList, teamList, orderList] = await Promise.all([
        SupplierService.list(shopId),
        TeamService.list(shopId),
        OrderService.list(shopId)
      ]);

      const foundSupp = (suppList || []).find(s => String(s.id) === String(id));
      if (!foundSupp) {
        toast.error('Không tìm thấy nhà cung cấp!');
        navigate('/suppliers');
        return;
      }

      const suppTeams = (teamList || []).filter(t => String(t.supplier_id || t.supplierId) === String(id));
      const suppOrders = (orderList || []).filter(o => String(o.supplier_id || o.supplierId) === String(id));

      setSupplier(foundSupp);
      setTeams(suppTeams);
      setOrders(suppOrders);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải thông tin nhà cung cấp!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [shopId, id]);

  const handleOpenZaloChat = () => {
    if (!supplier || !supplier.phone) {
      toast.error('Nhà cung cấp chưa có số điện thoại!');
      return;
    }
    const cleanPhone = supplier.phone.replace(/[^0-9]/g, '');
    window.open(`https://zalo.me/${cleanPhone}`, '_blank');
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Đang tải hồ sơ nguồn sỉ 360°...</div>;
  }

  if (!supplier) return null;

  const totalImportCost = orders.reduce((sum, o) => sum + (o.cost_price || o.costPrice || 0), 0);
  const unpaidOrders = orders.filter(o => o.supplier_paid === false || o.supplierPaid === false);
  const totalDebtToSupplier = unpaidOrders.reduce((sum, o) => sum + (o.cost_price || o.costPrice || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Back & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="glass-button" onClick={() => navigate('/suppliers')} style={{ padding: '8px 12px' }}>
          <ArrowLeft size={16} /> Quay lại
        </button>
        <h1 style={{ fontSize: '22px', fontWeight: '800' }}>Hồ Sơ Nguồn Sỉ 360°: {supplier.name}</h1>
      </div>

      {/* Supplier Profile Card */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(99,102,241,0.05))', border: '1px solid rgba(245,158,11,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#fff' }}>{supplier.name}</h2>
            <p style={{ color: '#94a3b8', fontSize: '13.5px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={14} color="#f59e0b" /> SĐT Hotline: <strong>{supplier.phone || 'Chưa cập nhật'}</strong>
            </p>
            {supplier.notes && (
              <p style={{ color: '#cbd5e1', fontSize: '13px', marginTop: '6px', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '8px' }}>
                "Ghi chú: {supplier.notes}"
              </p>
            )}
          </div>

          <button
            className="glass-button"
            onClick={handleOpenZaloChat}
            style={{ background: '#0068ff', color: '#fff', fontWeight: '700', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <MessageCircle size={16} /> Nhắn Zalo Nguồn Sỉ
          </button>
        </div>

        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '10px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px' }}>
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>Tổng Tiền Nhập Hàng</span>
            <p style={{ fontSize: '20px', fontWeight: '800', color: '#6366f1', margin: '4px 0' }}>{totalImportCost.toLocaleString()}đ</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px' }}>
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>Số Đơn Đã Nhập</span>
            <p style={{ fontSize: '20px', fontWeight: '800', color: '#fff', margin: '4px 0' }}>{orders.length} đơn</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px' }}>
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>Công Nợ Chưa Thanh Toán Sỉ</span>
            <p style={{ fontSize: '20px', fontWeight: '800', color: totalDebtToSupplier > 0 ? '#f59e0b' : '#10b981', margin: '4px 0' }}>
              {totalDebtToSupplier.toLocaleString()}đ
            </p>
          </div>
        </div>
      </div>

      {/* Linked Teams List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h3 style={{ fontSize: '17px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} color="#6366f1" /> Kho Team Do Nguồn Cung Cấp ({teams.length})
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
          {teams.map(t => (
            <div key={t.id} className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <strong style={{ color: '#fff', fontSize: '14.5px' }}>{t.name}</strong>
              <span className="badge badge-info" style={{ width: 'fit-content', fontSize: '10px' }}>{t.category}</span>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Hạn nguồn: {t.expire_date || t.expireDate || '---'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Orders List from Supplier */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h3 style={{ fontSize: '17px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingBag size={18} color="#10b981" /> Danh Sách Đơn Hàng Từ Nguồn Sỉ Này ({orders.length})
        </h3>
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Mã Đơn', 'Khách Hàng', 'Sản Phẩm', 'Giá Vốn Nhập', 'Thanh Toán Sỉ'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 16px' }}><strong>#{o.id}</strong></td>
                  <td style={{ padding: '12px 16px', color: '#fff' }}>{o.customer_name || o.customerName}</td>
                  <td style={{ padding: '12px 16px', color: '#818cf8' }}>{o.product_name || o.productName}</td>
                  <td style={{ padding: '12px 16px', color: '#f59e0b', fontWeight: '700' }}>{(o.cost_price || o.costPrice || 0).toLocaleString()}đ</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className={`badge ${(o.supplier_paid || o.supplierPaid) ? 'badge-success' : 'badge-warning'}`}>
                      {(o.supplier_paid || o.supplierPaid) ? 'Đã TT Sỉ' : 'Chưa TT Sỉ'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
