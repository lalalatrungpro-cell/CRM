import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ProductService } from '../utils/dataService';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { Package, Plus, Edit2, Trash2, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 12;

export default function Products() {
  const toast = useToast();
  const { shopId } = useAuth();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & Forms
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const emptyForm = {
    name: '',
    category: 'Canva Pro',
    customCategory: '',
    defaultDurationDays: 30,
    defaultSell: 150000,
    defaultCost: 50000,
    maxSlots: 5
  };

  const [formData, setFormData] = useState(emptyForm);

  const loadProducts = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const data = await ProductService.list(shopId);
      setProducts(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải danh sách sản phẩm mẫu!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [shopId]);

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setIsCustomCategory(false);
    setFormData(emptyForm);
  };

  const existingCategories = Array.from(new Set([
    'Canva Pro',
    'Netflix Premium',
    'Google AI Pro',
    'CapCut Pro',
    'Zoom Pro',
    'ChatGPT Plus',
    'Youtube Premium',
    'Spotify Premium',
    'Gói Khác',
    ...products.map(p => p.category).filter(Boolean)
  ]));

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setIsCustomCategory(false);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const handleOpenEditModal = (prod) => {
    setEditingProduct(prod);
    const isCustom = !existingCategories.includes(prod.category);
    setIsCustomCategory(isCustom);
    setFormData({
      name: prod.name || '',
      category: isCustom ? 'CUSTOM_NEW' : (prod.category || 'Canva Pro'),
      customCategory: isCustom ? prod.category : '',
      defaultDurationDays: prod.default_duration_days || prod.defaultDurationDays || 30,
      defaultSell: prod.default_sell || prod.defaultSell || 150000,
      defaultCost: prod.default_cost || prod.defaultCost || 50000,
      maxSlots: prod.max_slots || prod.maxSlots || 5
    });
    setShowModal(true);
  };

  const handleCategorySelectChange = (val) => {
    if (val === 'CUSTOM_NEW') {
      setIsCustomCategory(true);
      setFormData(f => ({ ...f, category: 'CUSTOM_NEW' }));
    } else {
      setIsCustomCategory(false);
      setFormData(f => ({ ...f, category: val }));
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Vui lòng nhập tên sản phẩm!');

    const finalCategory = isCustomCategory
      ? (formData.customCategory.trim() || 'Gói Khác')
      : formData.category;

    const payload = {
      name: formData.name.trim(),
      category: finalCategory,
      default_duration_days: parseInt(formData.defaultDurationDays) || 30,
      default_sell: parseFloat(formData.defaultSell) || 0,
      default_cost: parseFloat(formData.defaultCost) || 0,
      max_slots: parseInt(formData.maxSlots) || 5
    };

    try {
      if (editingProduct) {
        const updated = await ProductService.update(editingProduct.id, payload);
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? updated : p));
        toast.success(`Đã cập nhật sản phẩm "${updated.name}"!`);
      } else {
        const created = await ProductService.create(shopId, payload);
        setProducts(prev => [created, ...prev]);
        toast.success(`Đã thêm sản phẩm "${created.name}" thành công!`);
      }
      closeModal();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi lưu sản phẩm.');
    }
  };

  const handleDeleteProduct = async () => {
    const id = confirmDeleteId;
    try {
      await ProductService.remove(id);
      setProducts(prev => prev.filter(p => String(p.id) !== String(id)));
      setConfirmDeleteId(null);
      toast.success('Đã xóa sản phẩm mẫu!');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xóa sản phẩm.');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'ALL' || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE) || 1;
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Bảng Giá & Sản Phẩm Mẫu POS</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '13px' }}>
            Thiết lập giá bán, giá vốn và hạn dùng mặc định để tạo đơn nhanh khi bán hàng.
          </p>
        </div>

        <button className="glass-button" onClick={handleOpenAddModal}>
          <Plus size={18} /> Thêm Sản Phẩm Mới
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '280px', flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 14px' }}>
          <Search size={16} color="#475569" />
          <input
            type="text"
            placeholder="Tìm tên sản phẩm hoặc danh mục..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', width: '100%', fontSize: '13.5px' }}
          />
          {searchTerm && <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={14} /></button>}
        </div>

        <select
          className="glass-input" style={{ width: 'auto' }}
          value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setCurrentPage(1); }}
        >
          <option value="ALL">Tất cả danh mục ({existingCategories.length})</option>
          {existingCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Grid Cards */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Đang tải bảng giá sản phẩm...</div>
      ) : paginatedProducts.length === 0 ? (
        <div className="glass-panel empty-state">
          <Package size={40} />
          <h3>Không tìm thấy sản phẩm nào</h3>
          <p>Tạo sản phẩm mẫu mới để tự động hóa khâu điền đơn hàng.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {paginatedProducts.map(prod => {
              const sellP = prod.default_sell || prod.defaultSell || 0;
              const costP = prod.default_cost || prod.defaultCost || 0;
              const profit = sellP - costP;
              const durDays = prod.default_duration_days || prod.defaultDurationDays || 30;

              return (
                <div key={prod.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span className="badge badge-info" style={{ fontSize: '10px' }}>{prod.category}</span>
                      <h3 style={{ fontSize: '16.5px', fontWeight: '700', color: '#fff', marginTop: '4px' }}>{prod.name}</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => handleOpenEditModal(prod)} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', padding: '4px' }}>
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => setConfirmDeleteId(prod.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', fontSize: '12.5px' }}>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Giá bán khách:</span>
                      <p style={{ fontWeight: '700', color: '#10b981', margin: '2px 0' }}>{sellP.toLocaleString()}đ</p>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Giá vốn nhập:</span>
                      <p style={{ fontWeight: '700', color: '#f59e0b', margin: '2px 0' }}>{costP.toLocaleString()}đ</p>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Lãi thuần dự kiến:</span>
                      <p style={{ fontWeight: '700', color: '#6366f1', margin: '2px 0' }}>{profit.toLocaleString()}đ</p>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Hạn dùng chuẩn:</span>
                      <p style={{ fontWeight: '700', color: '#fff', margin: '2px 0' }}>{durDays} ngày</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination" style={{ marginTop: '10px' }}>
              <button
                className="page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '13px', color: '#94a3b8', padding: '0 8px' }}>
                Trang {currentPage} / {totalPages} (Tổng {filteredProducts.length} sản phẩm)
              </span>
              <button
                className="page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>
                {editingProduct ? 'Chỉnh Sửa Sản Phẩm Mẫu' : 'Thêm Sản Phẩm Mới'}
              </h2>
              <button className="modal-close-btn" onClick={closeModal}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Tên Sản Phẩm / Dịch Vụ</label>
                <input
                  type="text" required className="glass-input" placeholder="VD: Canva Pro (1 năm)"
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">Danh Mục Dịch Vụ</label>
                <select
                  className="glass-input"
                  value={formData.category} onChange={e => handleCategorySelectChange(e.target.value)}
                >
                  {existingCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="CUSTOM_NEW">+ Thêm Danh Mục Mới...</option>
                </select>
              </div>

              {isCustomCategory && (
                <div>
                  <label className="form-label">Tên Danh Mục Mới</label>
                  <input
                    type="text" required className="glass-input" placeholder="VD: Adobe Creative Cloud"
                    value={formData.customCategory} onChange={e => setFormData({ ...formData, customCategory: e.target.value })}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Giá Bán Mặc Định (VNĐ)</label>
                  <input
                    type="number" required className="glass-input"
                    value={formData.defaultSell} onChange={e => setFormData({ ...formData, defaultSell: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Giá Vốn Mặc Định (VNĐ)</label>
                  <input
                    type="number" required className="glass-input"
                    value={formData.defaultCost} onChange={e => setFormData({ ...formData, defaultCost: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Hạn Dùng Mặc Định (Ngày)</label>
                  <input
                    type="number" required className="glass-input"
                    value={formData.defaultDurationDays} onChange={e => setFormData({ ...formData, defaultDurationDays: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Số Slot Tối Đa Mặc Định</label>
                  <input
                    type="number" required className="glass-input"
                    value={formData.maxSlots} onChange={e => setFormData({ ...formData, maxSlots: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="submit" className="glass-button" style={{ flex: 1, background: '#6366f1', color: '#fff', fontWeight: '700' }}>
                  {editingProduct ? 'Cập Nhật Sản Phẩm' : 'Hoàn Tất Thêm'}
                </button>
                <button type="button" onClick={closeModal} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Xóa Sản Phẩm Mẫu?"
        message="Bạn có chắc muốn xóa sản phẩm mẫu này?"
        onConfirm={handleDeleteProduct}
        onCancel={() => setConfirmDeleteId(null)}
        confirmLabel="Xác Nhận Xóa"
      />
    </div>
  );
}
