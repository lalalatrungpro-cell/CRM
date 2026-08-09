import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SupplierService, OrderService, ProductService, SupplierPriceService } from '../utils/dataService';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { Truck, Plus, BarChart2, TrendingDown, Award, Sparkles, Eye, Edit2, ShieldCheck, AlertTriangle, CheckCircle, X, Trash2, Search } from 'lucide-react';

export default function Suppliers() {
  const navigate = useNavigate();
  const toast = useToast();
  const { shopId } = useAuth();

  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & Forms
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', notes: '' });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('LIST');
  const [products, setProducts] = useState([]);
  const [todayPrices, setTodayPrices] = useState([]);
  const [selectedCompareProduct, setSelectedCompareProduct] = useState('');
  

  const loadData = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      
      const [suppList, orderList, prodList, priceList] = await Promise.all([
        SupplierService.list(shopId),
        OrderService.list(shopId),
        ProductService.list(shopId),
        SupplierPriceService.listTodayPrices(shopId)
      ]);
      setSuppliers(suppList || []);
      setOrders(orderList || []);
      setProducts(prodList || []);
      setTodayPrices(priceList || []);
      if ((prodList || []).length > 0) setSelectedCompareProduct(prodList[0].name);
  
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải nhà cung cấp từ Supabase!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [shopId]);

  const closeModal = () => {
    setShowModal(false);
    setEditingSupplier(null);
    setFormData({ name: '', phone: '', notes: '' });
  };

  const handleOpenAddModal = () => {
    setEditingSupplier(null);
    setFormData({ name: '', phone: '', notes: '' });
    setShowModal(true);
  };

  const handleOpenEditModal = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name || '',
      phone: supplier.phone || '',
      notes: supplier.notes || ''
    });
    setShowModal(true);
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Vui lòng nhập tên nhà cung cấp!');

    try {
      if (editingSupplier) {
        const updated = await SupplierService.update(editingSupplier.id, {
          name: formData.name.trim(),
          phone: formData.phone.trim() || '',
          notes: formData.notes.trim() || ''
        });
        setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? updated : s));
        toast.success(`Đã cập nhật nhà cung cấp "${updated.name}"!`);
      } else {
        const created = await SupplierService.create(shopId, {
          name: formData.name.trim(),
          phone: formData.phone.trim() || '',
          notes: formData.notes.trim() || '',
          debt: 0
        });
        setSuppliers(prev => [created, ...prev]);
        toast.success(`Đã thêm nhà cung cấp "${created.name}" thành công!`);
      }
      closeModal();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi lưu nhà cung cấp.');
    }
  };

  const handleDeleteSupplier = async () => {
    const id = confirmDeleteId;
    const hasOrders = orders.some(o => String(o.supplier_id || o.supplierId) === String(id));
    if (hasOrders) {
      toast.error('Không thể xóa nhà cung cấp đang có đơn hàng liên kết!');
      setConfirmDeleteId(null);
      return;
    }

    try {
      await SupplierService.remove(id);
      setSuppliers(prev => prev.filter(s => String(s.id) !== String(id)));
      setConfirmDeleteId(null);
      toast.success('Đã xóa nhà cung cấp!');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xóa nhà cung cấp.');
    }
  };

  const getReliabilityMetric = (supplierId) => {
    const suppOrders = orders.filter(o => String(o.supplier_id || o.supplierId) === String(supplierId));
    const totalOrders = suppOrders.length;
    if (totalOrders === 0) return { label: 'CHƯA CÓ ĐƠN', color: '#64748b', bg: 'rgba(100,116,139,0.15)', icon: ShieldCheck };

    const warrantyOrders = suppOrders.filter(o => (o.warranty_count || o.warrantyCount || 0) > 0);
    const errRate = (warrantyOrders.length / totalOrders) * 100;

    if (errRate === 0) return { label: 'UY TÍN CAO (0% LỖI)', color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: CheckCircle };
    if (errRate <= 15) return { label: `TRUNG BÌNH (${errRate.toFixed(0)}% LỖI)`, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: AlertTriangle };
    return { label: `RỦI RO CAO (${errRate.toFixed(0)}% LỖI)`, color: '#ef4444', bg: 'rgba(239,68,68,0.15)', icon: AlertTriangle };
  };

  const filteredSuppliers = suppliers.filter(s => {
    return (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
           (s.phone || '').includes(searchTerm) ||
           (s.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Quản Lý Nhà Cung Cấp & Nguồn Sỉ 360°</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '13px' }}>
            Theo dõi uy tín nguồn sỉ, công nợ nhập sỉ và lịch sử chất lượng tài khoản.
          </p>
        </div>

        <button className="glass-button" onClick={handleOpenAddModal}>
          <Plus size={18} /> Thêm Nhà Cung Cấp Mới
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '400px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 14px' }}>
        <Search size={16} color="#475569" />
        <input
          type="text"
          placeholder="Tìm nhà cung cấp theo tên, SĐT hoặc ghi chú..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', width: '100%', fontSize: '13.5px' }}
        />
        {searchTerm && <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={14} /></button>}
      </div>

      {/* Grid List */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Đang tải danh sách nguồn sỉ...</div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="glass-panel empty-state">
          <Truck size={40} />
          <h3>Không tìm thấy nhà cung cấp nào</h3>
          <p>Tạo nhà cung cấp mới để quản lý nguồn hàng nhập sỉ.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredSuppliers.map(s => {
            const rel = getReliabilityMetric(s.id);
            const RelIcon = rel.icon;
            const suppOrdersCount = orders.filter(o => String(o.supplier_id || o.supplierId) === String(s.id)).length;

            return (
              <div key={s.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#fff' }}>{s.name}</h3>
                    <p style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: '2px' }}>SĐT: {s.phone || 'Chưa cập nhật'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => handleOpenEditModal(s)} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', padding: '4px' }}>
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => setConfirmDeleteId(s.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="badge" style={{ background: rel.bg, color: rel.color, padding: '4px 10px', fontSize: '11px' }}>
                    <RelIcon size={12} /> {rel.label}
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>({suppOrdersCount} đơn nhập)</span>
                </div>

                {s.notes && (
                  <p style={{ fontSize: '12px', color: '#cbd5e1', background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px', fontStyle: 'italic' }}>
                    "{s.notes}"
                  </p>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    className="glass-button"
                    onClick={() => navigate(`/suppliers/${s.id}`)}
                    style={{ flex: 1, padding: '8px', fontSize: '12px', background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Eye size={14} /> Xem Chi Tiết 360°
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>
                {editingSupplier ? 'Chỉnh Sửa Nhà Cung Cấp' : 'Thêm Nhà Cung Cấp Mới'}
              </h2>
              <button className="modal-close-btn" onClick={closeModal}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Tên Nhà Cung Cấp / Tên Nguồn Sỉ</label>
                <input
                  type="text" required className="glass-input" placeholder="VD: Kho Canva Sỉ VIP 01"
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">Số Điện Thoại / Zalo Hotline</label>
                <input
                  type="text" className="glass-input" placeholder="VD: 0912345678"
                  value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">Ghi Chú Nguồn Hàng</label>
                <textarea
                  className="glass-input" style={{ minHeight: '70px', fontSize: '12.5px' }} placeholder="Chính sách bảo hành, cam kết đổi trả..."
                  value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="submit" className="glass-button" style={{ flex: 1, background: '#6366f1', color: '#fff', fontWeight: '700' }}>
                  {editingSupplier ? 'Cập Nhật Nguồn Sỉ' : 'Hoàn Tất Thêm'}
                </button>
                <button type="button" onClick={closeModal} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Xóa Nhà Cung Cấp?"
        message="Bạn có chắc muốn xóa nhà cung cấp này?"
        onConfirm={handleDeleteSupplier}
        onCancel={() => setConfirmDeleteId(null)}
        confirmLabel="Xác Nhận Xóa"
      />
    </div>
  );
}
