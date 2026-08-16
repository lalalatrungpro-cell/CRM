import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { TeamService, SupplierService, OrderService, PurchaseService } from '../utils/dataService';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  ShieldCheck, Plus, Copy, Check, Trash2, Eye, EyeOff, Edit2, X, Search,
  DollarSign, CheckCircle2, AlertCircle, Layers, TrendingUp
} from 'lucide-react';

const CATEGORY_SLOTS = {
  'Canva Pro': 49,
  'Netflix Premium': 5,
  'Google AI Pro': 5,
  'CapCut Pro': 5,
  'Zoom Pro': 1,
  'ChatGPT Plus': 1,
  'Youtube Premium': 5,
  'Spotify Premium': 6,
  'Gói Khác': 1
};

const CATEGORY_COLORS = {
  'Canva Pro': '#10b981',
  'Netflix Premium': '#ef4444',
  'Google AI Pro': '#4285f4',
  'CapCut Pro': '#ec4899',
  'Zoom Pro': '#2d8cff',
  'ChatGPT Plus': '#10a37f',
  'Youtube Premium': '#ff0000',
  'Spotify Premium': '#1ed760',
  'Gói Khác': '#64748b'
};

export default function Teams() {
  const toast = useToast();
  const { shopId } = useAuth();

  const [teams, setTeams] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & Forms
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // State for copying & revealing credentials
  const [copiedId, setCopiedId] = useState('');
  const [revealedInfors, setRevealedInfors] = useState({});

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  const todayStr = new Date().toISOString().split('T')[0];
  const nextYearStr = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];

  const emptyForm = {
    name: '',
    category: 'Canva Pro',
    infor: '',
    maxSlots: 49,
    importCost: 2000000,
    purchaseDate: todayStr,
    expireDate: nextYearStr,
    supplierId: '',
    notes: ''
  };

  const [formData, setFormData] = useState(emptyForm);

  const loadData = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [tList, sList, oList] = await Promise.all([
        TeamService.list(shopId),
        SupplierService.list(shopId),
        OrderService.list(shopId)
      ]);
      setTeams(tList || []);
      setSuppliers(sList || []);
      setOrders(oList || []);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải danh sách kho team!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [shopId]);

  const closeModal = () => {
    setShowModal(false);
    setEditingTeam(null);
    setFormData(emptyForm);
  };

  const handleOpenAddModal = () => {
    setEditingTeam(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const handleOpenEditModal = (team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name || '',
      category: team.category || 'Canva Pro',
      infor: team.infor || '',
      maxSlots: team.max_slots || team.maxSlots || 49,
      importCost: team.import_cost || team.importCost || 0,
      purchaseDate: team.purchase_date || team.purchaseDate || todayStr,
      expireDate: team.expire_date || team.expireDate || nextYearStr,
      supplierId: team.supplier_id || team.supplierId || '',
      notes: team.notes || ''
    });
    setShowModal(true);
  };

  const handleCategoryChange = (cat) => {
    const defaultSlot = CATEGORY_SLOTS[cat] || 1;
    setFormData(f => ({ ...f, category: cat, maxSlots: defaultSlot }));
  };

  const handleSaveTeam = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Vui lòng nhập tên team!');

    const supp = suppliers.find(s => String(s.id) === String(formData.supplierId));
    const suppName = supp ? supp.name : '';
    const cost = Number(formData.importCost || 0);
    const slots = parseInt(formData.maxSlots) || 1;

    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      infor: formData.infor.trim(),
      max_slots: slots,
      import_cost: cost,
      purchase_date: formData.purchaseDate || todayStr,
      expire_date: formData.expireDate || nextYearStr,
      supplier_id: formData.supplierId ? parseInt(formData.supplierId) : null,
      supplier_name: suppName,
      notes: formData.notes.trim()
    };

    try {
      if (editingTeam) {
        const updated = await TeamService.update(editingTeam.id, payload);
        setTeams(prev => prev.map(t => t.id === editingTeam.id ? updated : t));
        toast.success(`Đã cập nhật kho team "${updated.name}"!`);
      } else {
        const created = await TeamService.create(shopId, payload);
        setTeams(prev => [created, ...prev]);

        // Auto record purchase if cost > 0
        if (cost > 0) {
          await PurchaseService.create(shopId, {
            supplier_id: payload.supplier_id,
            supplier_name: payload.supplier_name,
            team_id: created.id,
            product_name: created.name,
            import_cost: cost,
            quantity: slots,
            payment_status: 'PAID',
            purchase_date: payload.purchase_date,
            notes: `Mua kho team "${created.name}" (${slots} slots)`
          });
        }
        toast.success(`Đã khởi tạo kho team "${created.name}" thành công!`);
      }
      closeModal();
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi lưu kho team.');
    }
  };

  const handleDeleteTeam = async () => {
    const id = confirmDeleteId;
    const usedOrders = orders.filter(o => String(o.team_id || o.teamId) === String(id));
    if (usedOrders.length > 0) {
      toast.error('Không thể xóa kho team đang có đơn hàng liên kết!');
      setConfirmDeleteId(null);
      return;
    }

    try {
      await TeamService.remove(id);
      setTeams(prev => prev.filter(t => String(t.id) !== String(id)));
      setConfirmDeleteId(null);
      toast.success('Đã xóa kho team!');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xóa kho team.');
    }
  };

  const handleCopyInfor = (text, teamId) => {
    navigator.clipboard.writeText(text);
    setCopiedId(`team-${teamId}`);
    toast.success('Đã copy thông tin tài khoản gốc!');
    setTimeout(() => setCopiedId(''), 2000);
  };

  const toggleRevealInfor = (teamId) => {
    setRevealedInfors(prev => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  // Live Unit Cost calculation in Modal
  const liveCost = Number(formData.importCost || 0);
  const liveSlots = parseInt(formData.maxSlots || 1) || 1;
  const liveUnitCost = liveSlots > 0 ? Math.round(liveCost / liveSlots) : 0;

  const filteredTeams = teams.filter(t => {
    const matchesSearch = (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.infor || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'ALL' || t.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={26} color="#6366f1" /> Quản Lý Kho Tài Khoản & Teams 360°
          </h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '13px', margin: 0 }}>
            Quản lý tài khoản gốc, giá vốn trọn gói, giá vốn phân bổ từng slot và tỷ lệ hoàn vốn theo thời gian thực.
          </p>
        </div>

        <button className="glass-button" onClick={handleOpenAddModal} style={{ background: 'linear-gradient(135deg, #6366f1, #10b981)', color: '#fff', fontWeight: '700' }}>
          <Plus size={18} /> Thêm Kho Team Mới
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '280px', flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 14px' }}>
          <Search size={16} color="#475569" />
          <input
            type="text"
            placeholder="Tìm theo tên team, dịch vụ, thông tin gốc..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', width: '100%', fontSize: '13.5px' }}
          />
          {searchTerm && <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={14} /></button>}
        </div>

        <select
          className="glass-input" style={{ width: 'auto', padding: '8px 14px' }}
          value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="ALL">Tất Cả Loại Dịch Vụ</option>
          {Object.keys(CATEGORY_SLOTS).map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Grid Cards */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Đang tải dữ liệu kho team từ đám mây...</div>
      ) : filteredTeams.length === 0 ? (
        <div className="glass-panel empty-state">
          <ShieldCheck size={40} />
          <h3>Không tìm thấy kho team nào</h3>
          <p>Tạo kho team mới để bắt đầu gán slot tự động khi bán đơn POS.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {filteredTeams.map(team => {
            const teamOrders = orders.filter(o => String(o.team_id || o.teamId) === String(team.id));
            const usedSlots = teamOrders.length;
            const maxSlots = team.max_slots || team.maxSlots || 1;
            const availableSlots = Math.max(0, maxSlots - usedSlots);
            const usagePercent = Math.min(100, Math.round((usedSlots / maxSlots) * 100));

            // Cost & Financial tracking
            const importCost = Number(team.import_cost || team.importCost || 0);
            const unitCost = maxSlots > 0 ? Math.round(importCost / maxSlots) : 0;
            const totalEarned = teamOrders.reduce((sum, o) => sum + Number(o.sell_price || o.sellPrice || 0), 0);
            const recoveryPercent = importCost > 0 ? Math.round((totalEarned / importCost) * 100) : 100;

            const isRevealed = revealedInfors[team.id];
            const isCopied = copiedId === `team-${team.id}`;
            const catColor = CATEGORY_COLORS[team.category] || '#6366f1';

            return (
              <div key={team.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="badge" style={{ background: `${catColor}20`, color: catColor, border: `1px solid ${catColor}40`, fontSize: '10px' }}>
                      {team.category}
                    </span>
                    <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', marginTop: '4px' }}>{team.name}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => handleOpenEditModal(team)} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', padding: '4px' }}>
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => setConfirmDeleteId(team.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Cost Box & Unit Cost */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Vốn mua Team: </span>
                    <strong style={{ color: '#f59e0b' }}>{importCost.toLocaleString()}đ</strong>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Giá vốn/slot: </span>
                    <strong style={{ color: '#10b981' }}>~{unitCost.toLocaleString()}đ</strong>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#94a3b8' }}>Slot đã gán: <strong>{usedSlots} / {maxSlots}</strong></span>
                    <strong style={{ color: availableSlots > 0 ? '#10b981' : '#ef4444' }}>
                      {availableSlots > 0 ? `Còn ${availableSlots} slot trống` : 'HẾT SLOT'}
                    </strong>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${usagePercent}%`,
                      height: '100%',
                      background: usagePercent >= 100 ? '#ef4444' : usagePercent >= 80 ? '#f59e0b' : '#10b981',
                      borderRadius: '4px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                {/* Financial Recovery */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: '#cbd5e1' }}>
                  <span>Đã thu về: <strong style={{ color: '#10b981' }}>{totalEarned.toLocaleString()}đ</strong></span>
                  <span style={{ color: recoveryPercent >= 100 ? '#10b981' : '#f59e0b', fontWeight: '700' }}>
                    {recoveryPercent >= 100 ? `Đã có lãi (${recoveryPercent}%)` : `Thu hồi ${recoveryPercent}%`}
                  </span>
                </div>

                {/* Account Credentials */}
                {team.infor && (
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '700' }}>Tài khoản gốc</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => toggleRevealInfor(team.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                          {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        <button onClick={() => handleCopyInfor(team.infor, team.id)} style={{ background: 'none', border: 'none', color: isCopied ? '#10b981' : '#94a3b8', cursor: 'pointer' }}>
                          {isCopied ? <Check size={13} /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>
                    <code style={{ fontSize: '12px', color: isRevealed ? '#fff' : '#64748b', wordBreak: 'break-all', display: 'block' }}>
                      {isRevealed ? team.infor : '••••••••••••••••••••••••'}
                    </code>
                  </div>
                )}

                {/* Info Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                  <span>Nguồn: {team.supplier_name || team.supplierName || 'Tự nhập'}</span>
                  <span>Hạn nguồn: {team.expire_date || team.expireDate || 'Vô thời hạn'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================== POPUP MODAL: ADD / EDIT TEAM ==================== */}
      {showModal && createPortal(
        <div className="global-modal-overlay" onClick={closeModal}>
          <div className="global-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px', padding: '24px' }}>
            <div className="modal-header" style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#6366f1" />
                {editingTeam ? 'Chỉnh Sửa Kho Team' : 'Thêm Kho Team / Tài Khoản Mới'}
              </h2>
              <button className="modal-close-btn" onClick={closeModal}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveTeam} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Tên Team / Tên Kho Tài Khoản *</label>
                <input
                  type="text" required className="glass-input" placeholder="VD: Team Canva VIP Pro #01"
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Loại Dịch Vụ *</label>
                  <select
                    className="glass-input"
                    value={formData.category} onChange={e => handleCategoryChange(e.target.value)}
                  >
                    {Object.keys(CATEGORY_SLOTS).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Số Slot Tối Đa *</label>
                  <input
                    type="number" required className="glass-input"
                    value={formData.maxSlots} onChange={e => setFormData({ ...formData, maxSlots: e.target.value })}
                  />
                </div>
              </div>

              {/* Total Purchase Cost & Live Unit Cost */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ color: '#f59e0b' }}>Tổng Tiền Vốn Mua Team (VNĐ) *</label>
                  <input
                    type="number" className="glass-input" placeholder="2000000"
                    value={formData.importCost} onChange={e => setFormData({ ...formData, importCost: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>Giá vốn 1 slot phân bổ:</span>
                  <strong style={{ fontSize: '16px', color: '#10b981', marginTop: '4px' }}>
                    ~{liveUnitCost.toLocaleString()}đ / slot
                  </strong>
                </div>
              </div>

              <div>
                <label className="form-label">Thông Tin Tài Khoản Gốc (Email | Pass | 2FA) *</label>
                <textarea
                  className="glass-input" style={{ minHeight: '65px', fontFamily: 'monospace', fontSize: '12.5px' }} placeholder="VD: master_canva@gmail.com | pass123 | 2FA_KEY"
                  value={formData.infor} onChange={e => setFormData({ ...formData, infor: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Nhà Cung Cấp / Nguồn Sỉ *</label>
                  <select
                    className="glass-input"
                    value={formData.supplierId} onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
                  >
                    <option value="">-- Tự nhập / Không chọn --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Ngày Hết Hạn Nguồn Sỉ *</label>
                  <input
                    type="date" className="glass-input"
                    value={formData.expireDate} onChange={e => setFormData({ ...formData, expireDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Ghi Chú Thêm</label>
                <input
                  type="text" className="glass-input" placeholder="Ghi chú về team..."
                  value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="glass-button" style={{ flex: 1, background: 'linear-gradient(135deg, #6366f1, #10b981)', color: '#fff', fontWeight: '700' }}>
                  {editingTeam ? '💾 Cập Nhật Kho Team' : '✨ Khởi Tạo Kho Team'}
                </button>
                <button type="button" onClick={closeModal} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Xóa Kho Team?"
        message="Bạn có chắc muốn xóa kho team này?"
        onConfirm={handleDeleteTeam}
        onCancel={() => setConfirmDeleteId(null)}
        confirmLabel="Xác Nhận Xóa"
      />
    </div>
  );
}
