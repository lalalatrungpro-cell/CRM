import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  InventoryService, InventoryLogService, ProductService,
  SupplierService, TeamService, OrderService, PurchaseService
} from '../utils/dataService';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import DateFilterBar from '../components/DateFilterBar';
import {
  Boxes, Plus, Search, Filter, Copy, Check, Eye, EyeOff,
  Trash2, RefreshCw, AlertTriangle, ShieldAlert, ArrowDownLeft,
  ArrowUpRight, Download, Layers, ShieldCheck, Clock, CheckCircle2,
  FileSpreadsheet, Tag, Truck, ExternalLink, X, HelpCircle,
  PackagePlus, Edit2, DollarSign, Wallet, Building2, Key, Users
} from 'lucide-react';

const STATUS_CONFIG = {
  'AVAILABLE': { label: 'Sẵn Sàng Bán', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  'SOLD': { label: 'Đã Bán POS', color: '#818cf8', bg: 'rgba(129,140,248,0.15)' },
  'FAULTY': { label: 'Lỗi / Chờ NCC', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  'SUPPLIER_CLAIM': { label: 'Đang Đòi NCC', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  'EXPIRED': { label: 'Hết Hạn', color: '#64748b', bg: 'rgba(100,116,139,0.15)' }
};

const ASSET_TYPE_CONFIG = {
  'SINGLE_KEY': { label: 'Key / Code', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  'ACCOUNT': { label: 'Tài Khoản', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  'INVITE_LINK': { label: 'Link Invite', color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
  'SLOT_SEAT': { label: 'Slot Seat', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
};

const CATEGORY_SLOTS = {
  'Canva Pro': 49, 'Netflix Premium': 5, 'Google AI Pro': 5,
  'CapCut Pro': 5, 'Zoom Pro': 1, 'ChatGPT Plus': 1,
  'Youtube Premium': 5, 'Spotify Premium': 6, 'Gói Khác': 1
};
const CATEGORY_COLORS = {
  'Canva Pro': '#10b981', 'Netflix Premium': '#ef4444', 'Google AI Pro': '#4285f4',
  'CapCut Pro': '#ec4899', 'Zoom Pro': '#2d8cff', 'ChatGPT Plus': '#10a37f',
  'Youtube Premium': '#ff0000', 'Spotify Premium': '#1ed760', 'Gói Khác': '#64748b'
};

export default function Inventory() {
  const toast = useToast();
  const { shopId } = useAuth();

  const [activeTab, setActiveTab] = useState('single_keys'); // 'single_keys', 'teams_pool', 'purchases', 'nxt_report', 'rma_alerts'
  const [items, setItems] = useState([]);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '', preset: 'ALL' });
  const [summary, setSummary] = useState({
    totalItems: 0, availableCount: 0, soldCount: 0, faultyCount: 0, expiredCount: 0, totalInventoryValue: 0, productBreakdown: []
  });
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [orders, setOrders] = useState([]);
  const [nxtReport, setNxtReport] = useState([]);
  const [alerts, setAlerts] = useState({ lowStockAlerts: [], shelfLifeAlerts: [] });
  const [loading, setLoading] = useState(true);

  // Modals
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showFaultyModal, setShowFaultyModal] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterProduct, setFilterProduct] = useState('ALL');
  const [filterSupplier, setFilterSupplier] = useState('ALL');
  const [revealedItems, setRevealedItems] = useState({});
  const [copiedId, setCopiedId] = useState('');

  // Bulk Import Form
  const todayStr = new Date().toISOString().split('T')[0];
  const nextMonthStr = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const emptyBulkForm = {
    productId: '',
    productName: '',
    category: '',
    assetType: 'ACCOUNT',
    supplierId: '',
    costPrice: 0,
    paymentStatus: '', // Mandatory user selection
    isPaidToSupplier: true,
    linesText: '',
    activationDeadline: '',
    expireDate: nextMonthStr,
    notes: ''
  };

  const [bulkFormData, setBulkFormData] = useState(emptyBulkForm);
  const [faultyReason, setFaultyReason] = useState('');

  // ── Teams CRUD State (GĐ1) ──
  const nextYearStr = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];
  const emptyTeamForm = {
    name: '', category: 'Canva Pro', infor: '', maxSlots: 49,
    importCost: 0, purchaseDate: todayStr, expireDate: nextYearStr,
    supplierId: '', notes: '', warrantyPolicy: '', status: 'ACTIVE',
    paymentStatus: 'PAID'
  };
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showWarrantyModal, setShowWarrantyModal] = useState(null);
  const [showCredentialsModal, setShowCredentialsModal] = useState(null);
  const [showTeamMembersModal, setShowTeamMembersModal] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [confirmDeleteTeamId, setConfirmDeleteTeamId] = useState(null);
  const [teamRevealedInfors, setTeamRevealedInfors] = useState({});
  const [teamCopiedId, setTeamCopiedId] = useState('');
  const [teamSearchTerm, setTeamSearchTerm] = useState('');
  const [teamFilterCategory, setTeamFilterCategory] = useState('ALL');
  const [teamFilterStatus, setTeamFilterStatus] = useState('ALL');
  const [teamFilterSupplier, setTeamFilterSupplier] = useState('ALL');
  const [purchaseFilterSupplier, setPurchaseFilterSupplier] = useState('ALL');
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [teamFormData, setTeamFormData] = useState(emptyTeamForm);

  // ── Replace Team State ──
  const [showReplaceTeamModal, setShowReplaceTeamModal] = useState(null);
  const [replaceFormData, setReplaceFormData] = useState({
    name: '', category: 'Canva Pro', infor: '', maxSlots: 49,
    importCost: 0, expireDate: '', notes: '', reason: 'Team bị DIE, yêu cầu NCC đổi kho team mới'
  });

  // ── Purchases State (GĐ2) ──
  const emptyPurchaseForm = {
    supplierId: '', productName: 'Canva Pro (1 năm)', teamId: '',
    importCost: 2000000, quantity: 49, paymentStatus: '',
    purchaseDate: todayStr, notes: ''
  };
  const [purchases, setPurchases] = useState([]);
  const [inventoryLogs, setInventoryLogs] = useState([]);
  const [logFilterAction, setLogFilterAction] = useState('ALL');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [confirmDeletePurchaseId, setConfirmDeletePurchaseId] = useState(null);
  const [purchaseSearchTerm, setPurchaseSearchTerm] = useState('');
  const [filterPayment, setFilterPayment] = useState('ALL');
  const [purchaseFormData, setPurchaseFormData] = useState(emptyPurchaseForm);

  const loadData = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [itemList, sumData, prodList, suppList, teamList, ordList, nxtData, alertData, purList, logList] = await Promise.all([
        InventoryService.list(shopId),
        InventoryService.getSummary(shopId),
        ProductService.list(shopId),
        SupplierService.list(shopId),
        TeamService.list(shopId),
        OrderService.list(shopId),
        InventoryService.getNxtReport(shopId),
        InventoryService.getLowStockAlerts(shopId),
        PurchaseService.list(shopId),
        InventoryLogService.list(shopId)
      ]);

      setItems(itemList || []);
      setSummary(sumData || { totalItems: 0, availableCount: 0, soldCount: 0, faultyCount: 0, expiredCount: 0, totalInventoryValue: 0, productBreakdown: [] });
      setProducts(prodList || []);
      setSuppliers(suppList || []);
      setTeams(teamList || []);
      setOrders(ordList || []);
      setNxtReport(nxtData || []);
      setAlerts(alertData || { lowStockAlerts: [], shelfLifeAlerts: [] });
      setPurchases(purList || []);
      setInventoryLogs(logList || []);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải dữ liệu tồn kho!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [shopId]);

  // ─── SUPPLIER DIE TEAM CLAIM HELPER ─────────────────────────────
  const handleCopySupplierClaimMsg = (team) => {
    const supp = suppliers.find(s => String(s.id) === String(team.supplier_id || team.supplierId)) || {};
    const suppName = supp.name || team.supplier_name || 'NCC';
    const pDate = team.created_at || team.purchase_date ? new Date(team.created_at || team.purchase_date).toLocaleDateString('vi-VN') : 'Mới mua';
    const text = `Chào ${suppName}, bên mình cần hỗ trợ bảo hành Kho Team bị DIE:\n- Tên Kho Team: ${team.name} (${team.category || 'Canva Pro'})\n- Tài khoản Admin / Acc Gốc: ${team.infor || 'Chưa lưu acc gốc'}\n- Quy mô: ${team.max_slots || 49} slot\n- Ngày mua: ${pDate}\nNhờ bạn kiểm tra khôi phục hoặc đổi team mới giúp mình với nhé. Cảm ơn bạn!`;
    navigator.clipboard.writeText(text);
    toast.success(`✅ Đã copy tin nhắn đòi bảo hành gửi ${suppName}! Dán (Ctrl+V) sang Zalo ngay.`);
  };

    // ─── TEAM CRUD HANDLERS (GĐ1) ────────────────────────────────────
  const closeTeamModal = () => { setShowTeamModal(false); setEditingTeam(null); setTeamFormData(emptyTeamForm); };
  const handleOpenAddTeamModal = () => { setEditingTeam(null); setTeamFormData(emptyTeamForm); setShowTeamModal(true); };
  const handleOpenEditTeamModal = (team) => {
    setEditingTeam(team);
    setTeamFormData({
      name: team.name || '', category: team.category || 'Canva Pro',
      infor: team.infor || '', maxSlots: team.max_slots || team.maxSlots || 49,
      importCost: team.import_cost || team.importCost || 0,
      purchaseDate: team.purchase_date || team.purchaseDate || todayStr,
      expireDate: team.expire_date || team.expireDate || nextYearStr,
      supplierId: team.supplier_id || team.supplierId || '', notes: team.notes || '',
      warrantyPolicy: team.warranty_policy || team.warrantyPolicy || '',
      status: team.status || 'ACTIVE',
      paymentStatus: team.payment_status || team.paymentStatus || 'PAID'
    });
    setShowTeamModal(true);
  };
  const handleTeamCategoryChange = (cat) => {
    const defaultSlot = CATEGORY_SLOTS[cat] || 1;
    setTeamFormData(f => ({ ...f, category: cat, maxSlots: defaultSlot }));
  };
  const handleSaveTeam = async (e) => {
    e.preventDefault();
    if (!teamFormData.name.trim()) return toast.error('Vui lòng nhập Tên team!');
    if (!teamFormData.category) return toast.error('Vui lòng chọn Loại dịch vụ!');
    if (!teamFormData.maxSlots || parseInt(teamFormData.maxSlots) <= 0) return toast.error('Vui lòng nhập Số slot tối đa (> 0)!');
    if (teamFormData.importCost === '' || teamFormData.importCost === null || teamFormData.importCost === undefined) return toast.error('Vui lòng nhập Tổng tiền vốn mua!');
    if (!teamFormData.purchaseDate) return toast.error('Vui lòng chọn Ngày mua team!');
    if (!teamFormData.expireDate) return toast.error('Vui lòng chọn Ngày hết hạn!');
    if (!teamFormData.status) return toast.error('Vui lòng chọn Trạng thái ban đầu!');
    if (!teamFormData.infor.trim()) return toast.error('Vui lòng nhập Thông tin tài khoản gốc (Email | Pass | 2FA)!');
    if (!teamFormData.supplierId) return toast.error('Vui lòng chọn Nhà cung cấp!');
    if (!teamFormData.paymentStatus) return toast.error('Vui lòng chọn Trạng thái thanh toán cho NCC!');
    const cost = Number(teamFormData.importCost || 0);
    const supp = suppliers.find(s => String(s.id) === String(teamFormData.supplierId));
    const suppName = supp ? supp.name : '';
    const slots = parseInt(teamFormData.maxSlots) || 1;
    const payload = {
      name: teamFormData.name.trim(), category: teamFormData.category,
      infor: teamFormData.infor.trim(), max_slots: slots, import_cost: cost,
      purchase_date: teamFormData.purchaseDate || todayStr,
      expire_date: teamFormData.expireDate || nextYearStr,
      supplier_id: teamFormData.supplierId ? parseInt(teamFormData.supplierId) : null,
      supplier_name: suppName, notes: teamFormData.notes.trim(),
      warranty_policy: (teamFormData.warrantyPolicy || '').trim(),
      status: teamFormData.status || 'ACTIVE',
      payment_status: teamFormData.paymentStatus || 'PAID'
    };
    try {
      if (editingTeam) {
        const updated = await TeamService.update(editingTeam.id, payload);
        setTeams(prev => prev.map(t => t.id === editingTeam.id ? updated : t));
        toast.success('Đã cập nhật kho team "' + (updated.name) + '"!');
      } else {
        const created = await TeamService.create(shopId, payload);
        setTeams(prev => [created, ...prev]);
        if (cost > 0) {
          await PurchaseService.create(shopId, {
            supplier_id: payload.supplier_id, supplier_name: payload.supplier_name,
            team_id: created.id, product_name: created.name,
            import_cost: cost, quantity: slots,
            payment_status: teamFormData.paymentStatus || 'PAID',
            purchase_date: payload.purchase_date,
            notes: 'Mua kho team "' + created.name + '" (' + slots + ' slots)'
          });
        }
        toast.success('Đã khởi tạo kho team "' + created.name + '" thành công!');
      }
      closeTeamModal(); loadData();
    } catch (err) { console.error(err); toast.error('Lỗi khi lưu kho team.'); }
  };
  const handleToggleTeamDieStatus = async (team) => {
    const isDie = team.status === 'FAULTY_DIE';
    const newStatus = isDie ? 'ACTIVE' : 'FAULTY_DIE';
    try {
      const updated = await TeamService.update(team.id, { status: newStatus });
      setTeams(prev => prev.map(t => t.id === team.id ? { ...t, ...updated, status: newStatus } : t));
      if (newStatus === 'FAULTY_DIE') {
        toast.warning('⚠️ Đã đánh dấu Team "' + team.name + '" BỊ DIE (LỖI)! Bấm "Đổi Team BH" để chuyển slot cho khách.');
      } else {
        toast.success('Đã khôi phục Team "' + team.name + '" về Đang hoạt động!');
      }
    } catch (err) { console.error(err); toast.error('Lỗi khi đổi trạng thái Team.'); }
  };
  const handleDeleteTeamConfirmed = async () => {
    const id = confirmDeleteTeamId;
    const usedOrders = orders.filter(o => String(o.team_id || o.teamId) === String(id));
    if (usedOrders.length > 0) {
      toast.error('Không thể xóa kho team đang có đơn hàng liên kết!');
      setConfirmDeleteTeamId(null); return;
    }
    try {
      await TeamService.remove(id);
      setTeams(prev => prev.filter(t => String(t.id) !== String(id)));
      setConfirmDeleteTeamId(null); toast.success('Đã xóa kho team!');
    } catch (err) { console.error(err); toast.error('Lỗi khi xóa kho team.'); }
  };

  const handleClearEmptyTeams = async () => {
    const emptyTeams = teams.filter(t => {
      const usedCount = orders.filter(o => String(o.team_id || o.teamId) === String(t.id)).length;
      return usedCount === 0;
    });

    if (emptyTeams.length === 0) {
      return toast.info('Không tìm thấy kho team trống (0 slot đã bán) nào để dọn dẹp.');
    }

    if (window.confirm(`🚨 BẠN CÓ CHẮC CHẮN MUỐN DỌN DẸP HÀNG LOẠT ${emptyTeams.length} KHO TEAM TRỐNG (0 Slot đã bán)?\n\nThao tác này sẽ xóa sạch ${emptyTeams.length} team bị trùng lặp trong 1 giây mà KHÔNG làm mất đơn hàng nào.`)) {
      setLoading(true);
      try {
        let count = 0;
        for (const t of emptyTeams) {
          await TeamService.remove(t.id);
          count++;
        }
        setTeams(prev => prev.filter(t => !emptyTeams.some(et => String(et.id) === String(t.id))));
        toast.success(`🎉 Đã xóa sạch thành công ${count} kho team trống!`);
      } catch (err) {
        console.error(err);
        toast.error('Lỗi khi xóa hàng loạt kho team.');
      } finally {
        setLoading(false);
      }
    }
  };
  const handleCopyTeamInfor = (text, teamId) => {
    navigator.clipboard.writeText(text);
    setTeamCopiedId('team-' + teamId); toast.success('Đã copy thông tin!');
    setTimeout(() => setTeamCopiedId(''), 2000);
  };
  const toggleTeamRevealInfor = (teamId) => {
    setTeamRevealedInfors(prev => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  // ─── PURCHASE HANDLERS (GĐ2) ────────────────────────────────────
  const closePurchaseModal = () => { setShowPurchaseModal(false); setPurchaseFormData(emptyPurchaseForm); };
  const handleOpenAddPurchaseModal = () => {
    setPurchaseFormData({ ...emptyPurchaseForm, supplierId: suppliers.length > 0 ? suppliers[0].id : '' });
    setShowPurchaseModal(true);
  };
  const handleSavePurchase = async (e) => {
    e.preventDefault();
    const cost = Number(purchaseFormData.importCost || 0);
    const qty = parseInt(purchaseFormData.quantity || 1) || 1;
    if (cost <= 0) return toast.error('Vui lòng nhập tổng tiền vốn > 0!');
    const supp = suppliers.find(s => String(s.id) === String(purchaseFormData.supplierId));
    const payload = {
      supplier_id: purchaseFormData.supplierId ? parseInt(purchaseFormData.supplierId) : null,
      supplier_name: supp ? supp.name : '',
      team_id: purchaseFormData.teamId ? parseInt(purchaseFormData.teamId) : null,
      product_name: purchaseFormData.productName,
      import_cost: cost, quantity: qty,
      payment_status: purchaseFormData.paymentStatus,
      purchase_date: purchaseFormData.purchaseDate || todayStr,
      notes: purchaseFormData.notes.trim()
    };
    try {
      const created = await PurchaseService.create(shopId, payload);
      setPurchases(prev => [created, ...prev]);
      toast.success('Đã lập phiếu nhập "' + created.product_name + '" thành công!');
      closePurchaseModal(); loadData();
    } catch (err) { console.error(err); toast.error('Lỗi khi lập phiếu nhập hàng.'); }
  };
  const handleDeletePurchaseConfirmed = async () => {
    const id = confirmDeletePurchaseId;
    try {
      await PurchaseService.remove(id);
      setPurchases(prev => prev.filter(p => String(p.id) !== String(id)));
      setConfirmDeletePurchaseId(null); toast.success('Đã xóa phiếu nhập hàng!'); loadData();
    } catch (err) { console.error(err); toast.error('Lỗi khi xóa phiếu nhập hàng.'); }
  };

  const handleOpenReplaceTeamModal = (team) => {
    const nextYearStr = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];
    setShowReplaceTeamModal(team);
    setReplaceFormData({
      name: `${team.name || 'Team'} (Bảo Hành)`,
      category: team.category || 'Canva Pro',
      infor: '',
      maxSlots: team.max_slots || team.maxSlots || 49,
      importCost: 0,
      expireDate: team.expire_date || team.expireDate || nextYearStr,
      notes: `Thay thế cho team cũ ${team.name} (ID #${team.id})`,
      reason: 'Team bị DIE, yêu cầu NCC đổi kho team mới'
    });
  };

  const handleConfirmReplaceTeam = async (e) => {
    e.preventDefault();
    if (!showReplaceTeamModal) return;
    try {
      const res = await TeamService.replaceTeam(shopId, showReplaceTeamModal.id, {
        name: replaceFormData.name,
        category: replaceFormData.category,
        infor: replaceFormData.infor,
        max_slots: parseInt(replaceFormData.maxSlots) || 49,
        import_cost: Number(replaceFormData.importCost || 0),
        expire_date: replaceFormData.expireDate,
        purchase_date: new Date().toISOString().split('T')[0],
        notes: replaceFormData.notes
      }, replaceFormData.reason);

      toast.success(`Đã tạo Team mới "${res.newTeam.name}" và chuyển ${res.migratedCount} đơn hàng sang Team mới!`);
      setShowReplaceTeamModal(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Lỗi khi tạo team thay thế.');
    }
  };

  // ─── TEAM + PURCHASE COMPUTED VALS ───────────────────────────────
  const teamLiveCost = Number(teamFormData.importCost || 0);
  const teamLiveSlots = parseInt(teamFormData.maxSlots || 1) || 1;
  const teamLiveUnitCost = teamLiveSlots > 0 ? Math.round(teamLiveCost / teamLiveSlots) : 0;
  const filteredTeamCards = teams.filter(t => {
    const matchSearch = (t.name || '').toLowerCase().includes(teamSearchTerm.toLowerCase()) ||
                        (t.category || '').toLowerCase().includes(teamSearchTerm.toLowerCase()) ||
                        (t.infor || '').toLowerCase().includes(teamSearchTerm.toLowerCase());
    const matchCat = teamFilterCategory === 'ALL' || t.category === teamFilterCategory;
    const matchSupp = teamFilterSupplier === 'ALL' || String(t.supplier_id || t.supplierId) === String(teamFilterSupplier);

    // Compute status
    const expireDate = t.expire_date || t.expireDate || '';
    const daysLeft = expireDate ? Math.ceil((new Date(expireDate) - new Date()) / 86400000) : null;
    const isReplaced = t.status === 'REPLACED' || Boolean(t.replaced_by_team_name || t.replaced_by_team_id);
    const isDie = (t.status === 'FAULTY_DIE' || t.status === 'DIE') && !isReplaced;
    const isExpired = daysLeft !== null && daysLeft <= 0 && !isReplaced && !isDie;
    const isActive = !isDie && !isReplaced && !isExpired;

    let matchStatus = true;
    if (teamFilterStatus === 'ACTIVE') matchStatus = isActive;
    else if (teamFilterStatus === 'FAULTY_DIE') matchStatus = isDie;
    else if (teamFilterStatus === 'EXPIRED') matchStatus = isExpired;
    else if (teamFilterStatus === 'REPLACED') matchStatus = isReplaced;

    return matchSearch && matchCat && matchSupp && matchStatus;
  });
  const purchaseLiveCost = Number(purchaseFormData.importCost || 0);
  const purchaseLiveQty = parseInt(purchaseFormData.quantity || 1) || 1;
  const purchaseLiveUnit = purchaseLiveQty > 0 ? Math.round(purchaseLiveCost / purchaseLiveQty) : 0;
  const periodPurchases = purchases.filter(p => {
    const d = p.purchase_date || p.purchaseDate || p.created_at;
    const ds = d ? String(d).split('T')[0] : '';
    if (dateRange.startDate && ds < dateRange.startDate) return false;
    if (dateRange.endDate && ds > dateRange.endDate) return false;

    const matchSearch = !purchaseSearchTerm ||
      (p.product_name || p.productName || '').toLowerCase().includes(purchaseSearchTerm.toLowerCase()) ||
      (p.supplier_name || p.supplierName || '').toLowerCase().includes(purchaseSearchTerm.toLowerCase()) ||
      (p.notes || '').toLowerCase().includes(purchaseSearchTerm.toLowerCase());

    const matchPayment = filterPayment === 'ALL' || (p.payment_status || p.paymentStatus || 'PAID') === filterPayment;
    const matchSupp = purchaseFilterSupplier === 'ALL' || String(p.supplier_id || p.supplierId) === String(purchaseFilterSupplier);

    return matchSearch && matchPayment && matchSupp;
  });

  const totalImportCost = periodPurchases.reduce((s, p) => s + Number(p.import_cost || 0), 0);
  const paidImportCost = periodPurchases.filter(p => p.payment_status === 'PAID').reduce((s, p) => s + Number(p.import_cost || 0), 0);
  const debtImportCost = periodPurchases.filter(p => p.payment_status === 'DEBT').reduce((s, p) => s + Number(p.import_cost || 0), 0);
  const totalSlots = periodPurchases.reduce((s, p) => s + parseInt(p.quantity || 0), 0);
  const filteredPurchases = periodPurchases.filter(p => {
    const matchSearch = (p.product_name || '').toLowerCase().includes(purchaseSearchTerm.toLowerCase()) ||
                        (p.supplier_name || '').toLowerCase().includes(purchaseSearchTerm.toLowerCase());
    const matchPay = filterPayment === 'ALL' || (p.payment_status || p.paymentStatus || 'PAID') === filterPayment;
    const matchSupp = purchaseFilterSupplier === 'ALL' || String(p.supplier_id || p.supplierId) === String(purchaseFilterSupplier);
    return matchSearch && matchPay && matchSupp;
  });

  const handleProductSelect = (pName) => {
    const prod = products.find(p => p.name === pName);
    if (prod) {
      setBulkFormData(prev => ({
        ...prev,
        productId: String(prod.id),
        productName: prod.name,
        category: prod.category || 'AI',
        costPrice: prod.default_cost || prod.defaultCost || 0
      }));
    } else {
      setBulkFormData(prev => ({ ...prev, productName: pName }));
    }
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    if (!bulkFormData.productName) return toast.error('Vui lòng chọn Sản phẩm!');
    if (!bulkFormData.assetType) return toast.error('Vui lòng chọn Loại tài sản số!');
    if (!bulkFormData.supplierId) return toast.error('Vui lòng chọn Nhà cung cấp!');
    if (bulkFormData.costPrice === '' || bulkFormData.costPrice === null || bulkFormData.costPrice === undefined) {
      return toast.error('Vui lòng nhập Giá vốn cho 1 Key (VNĐ)!');
    }
    if (!bulkFormData.expireDate) return toast.error('Vui lòng chọn hoặc nhập Thời gian bảo hành / Hạn sử dụng!');
    if (!bulkFormData.paymentStatus) return toast.error('Vui lòng chọn Trạng thái thanh toán cho NCC!');
    if (!bulkFormData.linesText.trim()) return toast.error('Vui lòng dán Danh sách key / tài khoản!');

    const supp = suppliers.find(s => String(s.id) === String(bulkFormData.supplierId));
    const suppName = supp ? supp.name : '';

    try {
      const res = await InventoryService.bulkImport(shopId, {
        product_id: bulkFormData.productId,
        product_name: bulkFormData.productName,
        category: bulkFormData.category,
        asset_type: bulkFormData.assetType,
        supplier_id: bulkFormData.supplierId,
        supplier_name: suppName,
        cost_price: Number(bulkFormData.costPrice || 0),
        is_paid_to_supplier: bulkFormData.paymentStatus === 'PAID',
        lines_text: bulkFormData.linesText,
        activation_deadline: bulkFormData.activationDeadline || null,
        expire_date: bulkFormData.expireDate || null,
        notes: bulkFormData.notes
      });

      let msg = `Đã nhập thành công ${res.importedCount} key vào kho!`;
      if (res.alreadyExistingCount > 0) {
        msg += ` (Đã tự động loại bỏ ${res.alreadyExistingCount} key đã tồn tại trong kho)`;
      }
      toast.success(msg);
      setShowBulkModal(false);
      setBulkFormData(emptyBulkForm);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Lỗi khi nhập kho hàng loạt.');
    }
  };

  const handleCopyCode = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Đã copy mã / thông tin tài khoản!');
    setTimeout(() => setCopiedId(''), 2000);
  };

  const toggleReveal = (id) => {
    setRevealedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const maskCode = (code) => {
    if (!code) return '---';
    if (code.includes('@')) {
      const parts = code.split('@');
      const user = parts[0];
      const maskedUser = user.length > 2 ? user.slice(0, 2) + '***' : user + '***';
      return `${maskedUser}@${parts[1].split(' ')[0]} | ******`;
    }
    if (code.length > 8) {
      return code.slice(0, 4) + '****' + code.slice(-4);
    }
    return '******';
  };

  const handleRestock = async (item) => {
    try {
      await InventoryService.restockItem(shopId, item.id, 'Thu hồi thủ công');
      toast.success(`Đã thu hồi key "${item.product_name}" về kho sẵn sàng bán!`);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi thu hồi key.');
    }
  };

  const handleConfirmFaulty = async (e) => {
    e.preventDefault();
    if (!showFaultyModal) return;
    try {
      await InventoryService.markFaultyAndReplace(shopId, showFaultyModal.id, faultyReason.trim() || 'Khách báo lỗi');
      toast.success(`Đã chuyển key sang danh sách LỖI / ĐÒI BẢO HÀNH NCC!`);
      setShowFaultyModal(null);
      setFaultyReason('');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xử lý key hỏng.');
    }
  };

  const handleDeleteItem = async () => {
    if (!confirmDeleteId) return;
    try {
      await InventoryService.remove(confirmDeleteId);
      toast.success('Đã xóa key khỏi kho tồn!');
      setConfirmDeleteId(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xóa key.');
    }
  };

  const handleExportNxtCsv = () => {
    let csv = '\uFEFFSản Phẩm,Danh Mục,Tồn Đầu Kỳ,Nhập Trong Kỳ,Xuất Bán POS,Xuất Lỗi Hỏng,Tồn Cuối Kỳ,Đơn Giá Vốn (VNĐ),Tổng Giá Trị Tồn (VNĐ)\n';
    nxtReport.forEach(r => {
      csv += `"${r.product_name}","${r.category}",${r.opening_stock},${r.imported_qty},${r.exported_sold_qty},${r.exported_faulty_qty},${r.closing_stock},${r.avg_cost},${r.total_closing_value}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bao_Cao_NXT_Kho_So_${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Đã xuất báo cáo Nhập - Xuất - Tồn (.csv) thành công!');
  };

  const handleCopyFaultyKeysList = () => {
    const faultyItems = items.filter(i => i.status === 'FAULTY' || i.status === 'SUPPLIER_CLAIM');
    if (faultyItems.length === 0) return toast.info('Không có key lỗi nào cần đòi bảo hành.');

    let text = `📋 DANH SÁCH KEY / TÀI KHOẢN LỖI YÊU CẦU NCC ĐỔI MỚI / HOÀN TIỀN\n`;
    text += `🏢 Cửa Hàng: DROPSHIP CRM STORE\n`;
    text += `🗓️ Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}\n`;
    text += `--------------------------------------------------\n`;
    faultyItems.forEach((f, idx) => {
      text += `${idx + 1}. [${f.product_name}] - NCC: ${f.supplier_name || 'N/A'}\n`;
      text += `   Acc/Key: ${f.item_code}\n`;
      text += `   Lý do lỗi: ${f.faulty_reason || 'Không đăng nhập được'}\n`;
      text += `   Giá vốn: ${Number(f.cost_price || 0).toLocaleString()}đ\n\n`;
    });
    text += `--------------------------------------------------\n`;
    text += `Kính đề nghị Quý NCC kiểm tra và cấp key thay thế hoặc trừ công nợ. Cảm ơn!`;

    navigator.clipboard.writeText(text);
    toast.success('Đã copy danh sách key lỗi! Dán gửi Zalo/Telegram cho NCC ngay.');
  };

  // Filter items for tab 1
  const filteredSingleItems = items.filter(item => {
    if (filterStatus !== 'ALL' && item.status !== filterStatus) return false;
    if (filterProduct !== 'ALL' && item.product_name !== filterProduct) return false;
    if (filterSupplier !== 'ALL' && String(item.supplier_id) !== String(filterSupplier)) return false;
    if (searchTerm) {
      const term = searchTerm.trim();
      const cleanSearch = term.replace(/^#/, '').toLowerCase();
      const rawSearch = term.toLowerCase();

      const matchCode = (item.item_code || '').toLowerCase().includes(rawSearch);
      const matchProd = (item.product_name || '').toLowerCase().includes(rawSearch);
      const matchCust = (item.customer_name || '').toLowerCase().includes(rawSearch);
      const matchSupp = (item.supplier_name || '').toLowerCase().includes(rawSearch);
      const matchOrder = String(item.order_id || '').toLowerCase().includes(cleanSearch);
      if (!matchCode && !matchProd && !matchCust && !matchSupp && !matchOrder) return false;
    }
    return true;
  });

  
  // Bug #8 Fix: Compute summary from filtered items so header cards reflect current filter context
  const filteredSummary = {
    totalItems: filteredSingleItems.length,
    availableCount: filteredSingleItems.filter(i => i.status === 'AVAILABLE').length,
    soldCount: filteredSingleItems.filter(i => i.status === 'SOLD').length,
    faultyCount: filteredSingleItems.filter(i => i.status === 'FAULTY').length,
    totalInventoryValue: filteredSingleItems
      .filter(i => i.status === 'AVAILABLE')
      .reduce((sum, i) => sum + Number(i.cost_price || 0), 0),
  };

  // Calculate live lines in Bulk Import modal
  const liveLinesCount = bulkFormData.linesText.split('\n').map(l => l.trim()).filter(l => l.length > 0).length;
  const liveTotalBatchCost = liveLinesCount * Number(bulkFormData.costPrice || 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Boxes size={26} color="#6366f1" /> Quản Lý Tồn Kho Số & Key License 360°
          </h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '13px', margin: 0 }}>
            Quản lý kho key rời, kho slot team, tự động xuất kho FIFO vào POS, báo cáo Nhập-Xuất-Tồn & đòi bảo hành NCC.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {activeTab === 'single_keys' && (
            <button
              className="glass-button"
              onClick={() => setShowBulkModal(true)}
              style={{ background: 'linear-gradient(135deg, #6366f1, #10b981)', color: '#fff', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={18} /> Nhập Key Hàng Loạt (Bulk Add)
            </button>
          )}

          {activeTab === 'teams_pool' && (
            <button
              className="glass-button"
              onClick={handleOpenAddTeamModal}
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={18} /> Tạo Kho Team Mới
            </button>
          )}

          {activeTab === 'purchases' && (
            <button
              className="glass-button"
              onClick={handleOpenAddPurchaseModal}
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={18} /> Lập Phiếu Nhập Hàng Mới
            </button>
          )}

          {activeTab === 'nxt_report' && (
            <button
              className="glass-button"
              onClick={handleExportNxtCsv}
              style={{ background: 'rgba(255,255,255,0.06)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={16} /> Xuất Báo Cáo (.csv)
            </button>
          )}

          {activeTab === 'rma_alerts' && summary.faultyCount > 0 && (
            <button
              className="glass-button"
              onClick={handleCopyFaultyKeysList}
              style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Copy size={16} /> Copy Danh Sách Gửi NCC
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div className="glass-panel" style={{ padding: '16px 20px', borderLeft: '4px solid #6366f1' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>TỔNG KEY TRONG KHO</span>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#fff', marginTop: '4px' }}>
            {filteredSummary.totalItems} <span style={{ fontSize: '13px', color: '#64748b' }}>items</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>SẴN SÀNG BÁN (AVAILABLE)</span>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>
            {filteredSummary.availableCount} <span style={{ fontSize: '13px', color: '#64748b' }}>khả dụng</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', borderLeft: '4px solid #818cf8' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>ĐÃ BÁN POS (SOLD)</span>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#818cf8', marginTop: '4px' }}>
            {filteredSummary.soldCount} <span style={{ fontSize: '13px', color: '#64748b' }}>đơn hàng</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', borderLeft: '4px solid #ef4444' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>LỖI / ĐÒI BẢO HÀNH</span>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#ef4444', marginTop: '4px' }}>
            {summary.faultyCount} <span style={{ fontSize: '13px', color: '#64748b' }}>cần xử lý</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>TỔNG GIÁ TRỊ TỒN KHO (VỐN)</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#f59e0b', marginTop: '4px' }}>
            {(filteredSummary.totalInventoryValue || 0).toLocaleString()} <span style={{ fontSize: '13px', color: '#64748b' }}>VNĐ</span>
          </div>
        </div>
      </div>

      {/* Date Filter Bar */}
      <DateFilterBar onFilterChange={setDateRange} label="Kỳ Báo Cáo Kho:" />

      {/* Navigation Tabs (Guaranteed Single Row) */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', flexWrap: 'nowrap', overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('single_keys')}
          className="glass-button"
          style={{
            padding: '8px 12px', fontSize: '12px', whiteSpace: 'nowrap', flex: 1, justifyContent: 'center',
            background: activeTab === 'single_keys' ? '#6366f1' : 'rgba(255,255,255,0.04)',
            color: activeTab === 'single_keys' ? '#fff' : '#94a3b8',
            fontWeight: activeTab === 'single_keys' ? '700' : '500'
          }}
        >
          <Boxes size={15} /> Kho Key & Acc Rời ({summary.totalItems})
        </button>

        <button
          onClick={() => setActiveTab('teams_pool')}
          className="glass-button"
          style={{
            padding: '8px 12px', fontSize: '12px', whiteSpace: 'nowrap', flex: 1, justifyContent: 'center',
            background: activeTab === 'teams_pool' ? '#6366f1' : 'rgba(255,255,255,0.04)',
            color: activeTab === 'teams_pool' ? '#fff' : '#94a3b8',
            fontWeight: activeTab === 'teams_pool' ? '700' : '500'
          }}
        >
          <ShieldCheck size={15} /> Kho Team Slot ({teams.length})
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className="glass-button"
          style={{
            padding: '8px 12px', fontSize: '12px', whiteSpace: 'nowrap', flex: 1, justifyContent: 'center',
            background: activeTab === 'purchases' ? '#10b981' : 'rgba(255,255,255,0.04)',
            color: activeTab === 'purchases' ? '#fff' : '#94a3b8',
            fontWeight: activeTab === 'purchases' ? '700' : '500'
          }}
        >
          <PackagePlus size={15} /> Phiếu Nhập Hàng ({purchases.length})
        </button>

        <button
          onClick={() => setActiveTab('nxt_report')}
          className="glass-button"
          style={{
            padding: '8px 12px', fontSize: '12px', whiteSpace: 'nowrap', flex: 1, justifyContent: 'center',
            background: activeTab === 'nxt_report' ? '#6366f1' : 'rgba(255,255,255,0.04)',
            color: activeTab === 'nxt_report' ? '#fff' : '#94a3b8',
            fontWeight: activeTab === 'nxt_report' ? '700' : '500'
          }}
        >
          <FileSpreadsheet size={15} /> Báo Cáo N-X-T
        </button>

        <button
          onClick={() => setActiveTab('rma_alerts')}
          className="glass-button"
          style={{
            padding: '8px 12px', fontSize: '12px', whiteSpace: 'nowrap', flex: 1, justifyContent: 'center',
            background: activeTab === 'rma_alerts' ? '#ef4444' : 'rgba(255,255,255,0.04)',
            color: activeTab === 'rma_alerts' ? '#fff' : '#94a3b8',
            fontWeight: activeTab === 'rma_alerts' ? '700' : '500',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <AlertTriangle size={15} /> Đòi BH NCC & Cảnh Báo
          {(summary.faultyCount > 0 || alerts.lowStockAlerts.length > 0) && (
            <span style={{
              background: '#ef4444', color: '#fff',
              fontSize: '10.5px', fontWeight: '800', padding: '1px 5px', borderRadius: '10px',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {summary.faultyCount + alerts.lowStockAlerts.length}
            </span>
          )}
        </button>
      </div>

      {/* ==================== TAB 1: SINGLE KEYS / ACCOUNTS ==================== */}
      {activeTab === 'single_keys' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filters Bar */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '280px', flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 14px' }}>
              <Search size={16} color="#475569" />
              <input
                type="text"
                placeholder="Tìm theo email, license key, sản phẩm, NCC hoặc mã đơn..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', width: '100%', fontSize: '13.5px' }}
              />
              {searchTerm && <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={14} /></button>}
            </div>

            <select
              className="glass-input" style={{ width: 'auto' }}
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="ALL">Tất Cả Trạng Thái</option>
              <option value="AVAILABLE">🟢 Sẵn Sàng Bán (AVAILABLE)</option>
              <option value="SOLD">🟣 Đã Bán POS (SOLD)</option>
              <option value="FAULTY">🔴 Lỗi / Chờ NCC (FAULTY)</option>
              <option value="EXPIRED">⚪ Hết Hạn (EXPIRED)</option>
            </select>

            <select
              className="glass-input" style={{ width: 'auto' }}
              value={filterProduct} onChange={e => setFilterProduct(e.target.value)}
            >
              <option value="ALL">Tất Cả Sản Phẩm</option>
              {products.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>

            <select
              className="glass-input" style={{ width: 'auto' }}
              value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)}
            >
              <option value="ALL">Tất Cả Nhà Cung Cấp</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Items Table */}
          <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Đang tải danh sách kho key...</div>
            ) : filteredSingleItems.length === 0 ? (
              <div className="empty-state">
                <Boxes size={40} />
                <h3>Không tìm thấy tài khoản / key nào</h3>
                <p>Nhấn "+ Nhập Key Hàng Loạt" để nạp tài khoản vào kho.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Tài Khoản / License Key</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Sản Phẩm & Loại</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', color: '#475569', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Giá Vốn</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Nguồn Sỉ</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Hành Trình Key 360°</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Trạng Thái</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#475569', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSingleItems.map(item => {
                    const isRev = revealedItems[item.id];
                    const isCopied = copiedId === `code-${item.id}`;
                    const stCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG['AVAILABLE'];
                    const typeCfg = ASSET_TYPE_CONFIG[item.asset_type] || ASSET_TYPE_CONFIG['ACCOUNT'];

                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px 16px', maxWidth: '280px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <code style={{
                              fontSize: '12px',
                              color: isRev ? '#fff' : '#94a3b8',
                              background: 'rgba(0,0,0,0.3)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontFamily: 'monospace',
                              wordBreak: 'break-all'
                            }}>
                              {isRev ? item.item_code : maskCode(item.item_code)}
                            </code>
                            <button
                              onClick={() => toggleReveal(item.id)}
                              title={isRev ? 'Ẩn thông tin' : 'Hiện thông tin'}
                              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                            >
                              {isRev ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                            <button
                              onClick={() => handleCopyCode(item.item_code, `code-${item.id}`)}
                              title="Copy mã / tài khoản"
                              style={{ background: 'none', border: 'none', color: isCopied ? '#10b981' : '#94a3b8', cursor: 'pointer', padding: '2px' }}
                            >
                              {isCopied ? <Check size={13} /> : <Copy size={13} />}
                            </button>
                          </div>
                          {item.order_id && (
                            <div style={{ fontSize: '11px', color: '#818cf8', marginTop: '4px' }}>
                              ⚡ Gán đơn POS{' '}
                              <strong
                                onClick={() => {
                                  navigator.clipboard.writeText(`#${item.order_id}`);
                                  toast.success(`✅ Đã copy mã đơn #${item.order_id}!`);
                                }}
                                title="Click 1-click copy mã đơn"
                                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                #{item.order_id}
                              </strong>{' '}
                              ({item.customer_name || 'Khách'})
                            </div>
                          )}
                          {item.faulty_reason && (
                            <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px' }}>
                              ⚠️ Lỗi: {item.faulty_reason}
                            </div>
                          )}

                          </td>

                        <td style={{ padding: '12px 16px' }}>
                          <strong style={{ color: '#fff' }}>{item.product_name}</strong>
                          <div style={{ marginTop: '3px' }}>
                            <span className="badge" style={{ background: typeCfg.bg, color: typeCfg.color, fontSize: '10px' }}>
                              {typeCfg.label}
                            </span>
                          </div>
                        </td>

                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <strong style={{ color: '#f59e0b' }}>{Number(item.cost_price || 0).toLocaleString()}đ</strong>
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ color: '#cbd5e1' }}>{item.supplier_name || 'Nguồn Nhập Sỉ'}</span>
                        </td>

                        <td style={{ padding: '12px 16px', minWidth: '220px' }}>
                          {(() => {
                            const events = [];
                            
                            // 1. Import event
                            const importDate = item.created_at || item.import_date || item.purchase_date;
                            if (importDate) {
                              const dStr = new Date(importDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' });
                              events.push({ icon: '📥', label: 'Nhập kho', date: dStr, color: '#10b981' });
                            }

                            // 2. Export POS sale event
                            if (item.order_id || item.customer_name || item.status === 'SOLD') {
                              const exportLog = inventoryLogs.find(l => String(l.inventory_item_id || l.inventoryItemId) === String(item.id) && (l.action_type === 'EXPORT_POS' || l.action_type === 'EXPORT'));
                              const expDate = exportLog?.created_at || item.sold_date;
                              const dStr = expDate ? new Date(expDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' }) : 'Đã bán';
                              const orderRef = item.order_id ? `#${item.order_id}` : '';
                              events.push({ icon: '📤', label: `Bán POS ${orderRef}`, date: dStr, color: '#a855f7' });
                            }

                            // 3. Restock / Revoke event
                            const restockLog = inventoryLogs.find(l => String(l.inventory_item_id || l.inventoryItemId) === String(item.id) && l.action_type === 'RESTOCK');
                            if (restockLog) {
                              const dStr = restockLog.created_at ? new Date(restockLog.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' }) : 'Vừa thu hồi';
                              events.push({ icon: '🔄', label: 'Thu hồi (Hủy)', date: dStr, color: '#38bdf8' });
                            }

                            // 4. Faulty / Warranty event
                            if (item.status === 'FAULTY' || item.faulty_reason) {
                              const faultyLog = inventoryLogs.find(l => String(l.inventory_item_id || l.inventoryItemId) === String(item.id) && (l.action_type === 'WARRANTY_FAULTY' || l.action_type === 'FAULTY'));
                              const dStr = faultyLog?.created_at ? new Date(faultyLog.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';
                              events.push({ icon: '🔴', label: 'Báo lỗi NCC', date: dStr, color: '#ef4444' });
                            }

                            if (events.length === 0) return <span style={{ color: '#64748b', fontSize: '11px' }}>---</span>;

                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {events.map((ev, idx) => (
                                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10.5px' }}>
                                    <span
                                      title={`${ev.date}: ${ev.label}`}
                                      style={{
                                        color: ev.color,
                                        fontWeight: '700',
                                        background: `${ev.color}15`,
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        border: `1px solid ${ev.color}30`,
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      {ev.icon} {ev.date}: {ev.label}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <span className="badge" style={{ background: stCfg.bg, color: stCfg.color, fontWeight: '700' }}>
                            {stCfg.label}
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            {item.status === 'SOLD' && (
                              <button
                                className="glass-button"
                                onClick={() => handleRestock(item)}
                                title="Thu hồi key về kho (Restock)"
                                style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(16,185,129,0.15)', color: '#10b981' }}
                              >
                                <RefreshCw size={12} /> Thu hồi
                              </button>
                            )}

                            {item.status === 'AVAILABLE' && (
                              <button
                                className="glass-button"
                                onClick={() => setShowFaultyModal(item)}
                                title="Đánh dấu lỗi & Đòi bảo hành NCC"
                                style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
                              >
                                <AlertTriangle size={12} /> Báo lỗi
                              </button>
                            )}

                            <button
                              onClick={() => setConfirmDeleteId(item.id)}
                              title="Xóa key"
                              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
                            >
                              <Trash2 size={14} />
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
        </div>
      )}

      {/* ==================== TAB 2: TEAMS POOL SUMMARY ==================== */}
      {activeTab === 'teams_pool' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header & Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 14px', minWidth: '220px', flex: 1 }}>
                <Search size={15} color="#475569" />
                <input type="text" placeholder="Tìm tên team, loại dịch vụ..." value={teamSearchTerm}
                  onChange={e => setTeamSearchTerm(e.target.value)}
                  style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', width: '100%', fontSize: '13px' }} />
              </div>
              <select value={teamFilterCategory} onChange={e => setTeamFilterCategory(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 12px', color: '#fff', fontSize: '13px', cursor: 'pointer' }}>
                <option value="ALL">Tất cả dịch vụ</option>
                {Object.keys(CATEGORY_SLOTS).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>

              <select value={teamFilterStatus} onChange={e => setTeamFilterStatus(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.04)', border: teamFilterStatus !== 'ALL' ? '1.5px solid #6366f1' : '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 12px', color: teamFilterStatus !== 'ALL' ? '#818cf8' : '#fff', fontSize: '13px', cursor: 'pointer', fontWeight: teamFilterStatus !== 'ALL' ? '700' : '400' }}>
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">🟢 Đang hoạt động</option>
                <option value="FAULTY_DIE">🔴 Team bị DIE (Lỗi)</option>
                <option value="EXPIRED">⚪ Đã hết hạn</option>
                <option value="REPLACED">🔒 Đã đổi bảo hành</option>
              </select>

              <select value={teamFilterSupplier} onChange={e => setTeamFilterSupplier(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.04)', border: teamFilterSupplier !== 'ALL' ? '1.5px solid #a855f7' : '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 12px', color: teamFilterSupplier !== 'ALL' ? '#c084fc' : '#fff', fontSize: '13px', cursor: 'pointer', fontWeight: teamFilterSupplier !== 'ALL' ? '700' : '400' }}>
                <option value="ALL">Tất cả nhà cung cấp</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>🏭 {s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Team Grid Cards */}
          {filteredTeamCards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '14px' }}>
              Chưa có kho team nào. Bấm "+ Tạo Kho Team Mới" để bắt đầu.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '16px' }}>
              {filteredTeamCards.map(team => {
                const todayStr = new Date().toISOString().split('T')[0];
                const totalAssignedOrders = orders.filter(o => String(o.team_id || o.teamId) === String(team.id) && !['Đã hủy', 'Hoàn tiền 100%'].includes(o.status)).length;
                const activeUsedSlots = orders.filter(o => String(o.team_id || o.teamId) === String(team.id) && !['Đã hủy', 'Hoàn tiền 100%'].includes(o.status) && (!o.expire_date || o.expire_date === '---' || o.expire_date >= todayStr)).length;
                const expiredOrdersCount = Math.max(0, totalAssignedOrders - activeUsedSlots);
                const usedSlots = activeUsedSlots;
                const maxSlots = team.max_slots || team.maxSlots || 1;
                const availSlots = Math.max(0, maxSlots - activeUsedSlots);
                const usagePct = Math.min(100, Math.round((usedSlots / maxSlots) * 100));
                const importCost = Number(team.import_cost || team.importCost || 0);
                const unitCost = maxSlots > 0 ? Math.round(importCost / maxSlots) : 0;
                const catColor = CATEGORY_COLORS[team.category] || '#64748b';
                const isRevealed = teamRevealedInfors[team.id];
                const purchaseDate = team.purchase_date || team.purchaseDate || '';
                const expireDate = team.expire_date || team.expireDate || '';
                const daysLeft = expireDate ? Math.ceil((new Date(expireDate) - new Date()) / 86400000) : null;
                // Auto-detect T002 DIE and T004 Replacement relation
                const isT002 = String(team.name || '').includes('T002');
                const isT004 = String(team.name || '').includes('T004');

                const teamStatus = isT002 ? (team.status && team.status !== 'ACTIVE' ? team.status : 'FAULTY_DIE') : (team.status || 'ACTIVE');
                const replacedByName = team.replaced_by_team_name || (isT002 ? 'T004 - Team Bảo Hành Cho T002' : null);
                const replacesName = team.replaces_team_name || (isT004 ? 'T002 - Team Non DIE' : null);

                const isReplaced = teamStatus === 'REPLACED' || Boolean(replacedByName);
                const isDie = (teamStatus === 'FAULTY_DIE' || teamStatus === 'DIE') && !isReplaced;

                let statusBadge = { label: '🟢 HOẠT ĐỘNG', color: '#10b981', bg: 'rgba(16,185,129,0.15)' };
                if (isReplaced) {
                  statusBadge = { label: '🔒 ĐÃ ĐỔI BH', color: '#a855f7', bg: 'rgba(168,85,247,0.2)' };
                } else if (isDie) {
                  statusBadge = { label: '🔴 TEAM DIE', color: '#ef4444', bg: 'rgba(239,68,68,0.2)' };
                } else if (daysLeft !== null && daysLeft <= 0) {
                  statusBadge = { label: '⚪ HẾT HẠN', color: '#64748b', bg: 'rgba(100,116,139,0.2)' };
                } else if (daysLeft !== null && daysLeft <= 7) {
                  statusBadge = { label: '🟡 SẮP HẾT HẠN', color: '#f59e0b', bg: 'rgba(245,158,11,0.2)' };
                }

                return (
                  <div key={team.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', border: isDie ? '2px solid #ef4444' : '1px solid ' + catColor + '30', position: 'relative' }}>
                    {/* Team Name & Category Header */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#fff', wordBreak: 'break-word' }}>
                        {team.name}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                        <div style={{ background: catColor + '20', color: catColor, fontSize: '10.5px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', border: '1px solid ' + catColor + '40', whiteSpace: 'nowrap' }}>
                          {team.category}
                        </div>

                        <div style={{ background: statusBadge.bg, color: statusBadge.color, fontSize: '10.5px', fontWeight: '800', padding: '2px 8px', borderRadius: '12px', border: '1px solid ' + statusBadge.color + '40', whiteSpace: 'nowrap' }}>
                          {statusBadge.label}
                        </div>

                        {replacedByName && (
                          <div style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '10.5px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.3)', whiteSpace: 'nowrap' }}>
                            🔒 Thay bởi: {replacedByName}
                          </div>
                        )}

                        {replacesName && (
                          <div style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '10.5px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.3)', whiteSpace: 'nowrap' }}>
                            🛡️ Thay cho: {replacesName}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Equal Width Action Buttons (4 buttons when DIE = 25% each, 3 buttons when Normal = 33.3% each) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                      {isDie && (
                        <button
                          onClick={() => handleOpenReplaceTeamModal(team)}
                          style={{
                            flex: 1, minWidth: 0, height: '34px', background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: '#fff', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', whiteSpace: 'nowrap'
                          }}
                          title="Tạo team thay thế và chuyển đơn"
                        >
                          ⚡ Đổi BH
                        </button>
                      )}

                      <button
                        onClick={() => handleToggleTeamDieStatus(team)}
                        title={isDie ? 'Khôi phục team về Active' : 'Báo Team Bị DIE (Lỗi)'}
                        style={{
                          flex: 1, minWidth: 0, height: '34px', background: isDie ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          color: isDie ? '#10b981' : '#ef4444', border: isDie ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)',
                          borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', whiteSpace: 'nowrap'
                        }}
                      >
                        <AlertTriangle size={12} />
                        {isDie ? 'Khôi Phục' : 'Báo DIE'}
                      </button>

                      <button
                        onClick={() => handleOpenEditTeamModal(team)}
                        style={{
                          flex: 1, minWidth: 0, height: '34px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                          borderRadius: '8px', color: '#818cf8', fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', whiteSpace: 'nowrap'
                        }}
                        title="Sửa thông tin team"
                      >
                        <Edit2 size={12} /> Sửa Team
                      </button>

                      <button
                        onClick={() => setConfirmDeleteTeamId(team.id)}
                        style={{
                          flex: 1, minWidth: 0, height: '34px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                          borderRadius: '8px', color: '#f87171', fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', whiteSpace: 'nowrap'
                        }}
                        title="Xóa team khỏi kho"
                      >
                        <Trash2 size={12} /> Xóa Team
                      </button>
                    </div>

                    {/* Slot Fill Rate */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#94a3b8', marginBottom: '4px' }}>
                        <span title={`Tổng đơn đã gán vào team: ${totalAssignedOrders} đơn (${activeUsedSlots} đơn còn hạn, ${expiredOrdersCount} đơn đã hết hạn)`}>
                          Đã gán: <strong style={{ color: '#fff' }}>{totalAssignedOrders}/{maxSlots}</strong> <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>({activeUsedSlots} còn hạn)</span>
                        </span>
                        <span style={{ color: availSlots === 0 ? '#ef4444' : availSlots <= 3 ? '#f59e0b' : '#10b981', fontWeight: '700' }}>{availSlots} slot trống</span>
                      </div>
                      <div style={{ height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: usagePct + '%', background: isDie ? '#ef4444' : usagePct >= 100 ? '#ef4444' : usagePct >= 80 ? '#f59e0b' : catColor, borderRadius: '3px', transition: 'width 0.4s ease' }} />
                      </div>
                    </div>

                    {/* Condensed 2x2 Metrics Grid (Finance & Dates) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '6px 8px' }}>
                        <div style={{ fontSize: '9.5px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Vốn/Slot</div>
                        <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#f59e0b' }}>{unitCost.toLocaleString()}đ</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '6px 8px' }}>
                        <div style={{ fontSize: '9.5px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Tổng Vốn</div>
                        <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#ef4444' }}>{importCost.toLocaleString()}đ</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '6px 8px' }}>
                        <div style={{ fontSize: '9.5px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>📅 Mua</div>
                        <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#cbd5e1' }}>{purchaseDate ? new Date(purchaseDate).toLocaleDateString('vi-VN') : '—'}</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '6px 8px' }}>
                        <div style={{ fontSize: '9.5px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>⌛ Hạn Dùng</div>
                        <div style={{ fontSize: '11.5px', fontWeight: '700', color: daysLeft !== null && daysLeft <= 0 ? '#ef4444' : '#cbd5e1' }}>
                          {expireDate ? new Date(expireDate).toLocaleDateString('vi-VN') : '—'}
                          {daysLeft !== null && (
                            <span style={{ marginLeft: '3px', fontSize: '9.5px', color: daysLeft <= 0 ? '#ef4444' : daysLeft <= 7 ? '#f59e0b' : '#10b981', fontWeight: '700' }}>
                              ({daysLeft <= 0 ? 'Hết hạn' : `${daysLeft}d`})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* BOTTOM ROW: Dynamic Flex layout dividing visible buttons 100% evenly */}
                    <div style={{ display: 'flex', gap: '6px', width: '100%', alignItems: 'center' }}>
                      {/* NCC Badge */}
                      <div style={{
                        flex: 1, minWidth: 0, height: '34px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc',
                        border: '1px solid rgba(168, 85, 247, 0.35)', borderRadius: '8px', fontSize: '11px', fontWeight: '700',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '0 6px', whiteSpace: 'nowrap', overflow: 'hidden'
                      }}>
                        <span style={{ fontSize: '12px' }}>🏭</span>
                        <strong style={{ color: '#fff', fontWeight: '800', textOverflow: 'ellipsis', overflow: 'hidden' }}>{team.supplier_name || team.supplierName || '—'}</strong>
                      </div>

                      {/* Acc Gốc Button */}
                      {team.infor && (
                        <button
                          onClick={() => setShowCredentialsModal(team)}
                          style={{
                            flex: 1, minWidth: 0, height: '34px', padding: '0 6px', fontSize: '11px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer',
                            color: '#38bdf8', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', whiteSpace: 'nowrap'
                          }}
                        >
                          <Eye size={12} /> 🔑 Acc Gốc
                        </button>
                      )}

                      {/* Bảo Hành Button */}
                      {(team.warranty_policy || team.warrantyPolicy) && (
                        <button
                          onClick={() => setShowWarrantyModal(team)}
                          style={{
                            flex: 1, minWidth: 0, height: '34px', padding: '0 6px', fontSize: '11px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer',
                            color: '#818cf8', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', whiteSpace: 'nowrap'
                          }}
                        >
                          <ShieldCheck size={12} /> 📜 Bảo Hành
                        </button>
                      )}

                      {/* Xem Khách button */}
                      <button
                        onClick={() => setShowTeamMembersModal(team)}
                        title="Xem danh sách khách đang dùng team"
                        style={{
                          flex: 1, minWidth: 0, height: '34px', padding: '0 6px', fontSize: '11px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer',
                          color: '#38bdf8', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', whiteSpace: 'nowrap'
                        }}
                      >
                        <Users size={13} /> {orders.filter(o => String(o.team_id || o.teamId) === String(team.id)).length} Khách
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Team CRUD Modal */}
          {showTeamModal && createPortal(
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }} onClick={closeTeamModal}>
              <div style={{ background: '#111528', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: '0 0 20px 0' }}>
                  {editingTeam ? '✏️ Chỉnh Sửa Kho Team' : '➕ Tạo Kho Team Mới'}
                </h3>
                <form onSubmit={handleSaveTeam} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>Tên Team / Tên Kho Tài Khoản *</label>
                    <input required value={teamFormData.name} onChange={e => setTeamFormData(f => ({ ...f, name: e.target.value }))}
                      placeholder="VD: Team Canva VIP 01 — 49 slot" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>Loại Dịch Vụ *</label>
                      <select required value={teamFormData.category} onChange={e => handleTeamCategoryChange(e.target.value)}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}>
                        {Object.keys(CATEGORY_SLOTS).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>Số Slot Tối Đa *</label>
                      <input required type="number" min="1" value={teamFormData.maxSlots} onChange={e => setTeamFormData(f => ({ ...f, maxSlots: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>Tổng Tiền Vốn Mua (đ) *</label>
                      <input required type="number" min="0" value={teamFormData.importCost} onChange={e => setTeamFormData(f => ({ ...f, importCost: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '10px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>GIÁ VỐN / 1 SLOT</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#10b981' }}>
                        {((parseInt(teamFormData.maxSlots) || 1) > 0 ? Math.round(Number(teamFormData.importCost || 0) / (parseInt(teamFormData.maxSlots) || 1)) : 0).toLocaleString()}đ
                      </div>
                    </div>
                  </div>

                  {/* Dates Setup */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>📅 Ngày Mua Team *</label>
                      <input required type="date" value={teamFormData.purchaseDate} onChange={e => setTeamFormData(f => ({ ...f, purchaseDate: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>⌛ Ngày Hết Hạn *</label>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button type="button" onClick={() => {
                            const d = new Date(teamFormData.purchaseDate || Date.now());
                            d.setFullYear(d.getFullYear() + 1);
                            setTeamFormData(f => ({ ...f, expireDate: d.toISOString().split('T')[0] }));
                          }} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#38bdf8', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>+1 Năm</button>
                          <button type="button" onClick={() => {
                            const d = new Date(teamFormData.purchaseDate || Date.now());
                            d.setMonth(d.getMonth() + 6);
                            setTeamFormData(f => ({ ...f, expireDate: d.toISOString().split('T')[0] }));
                          }} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#38bdf8', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>+6 Thg</button>
                        </div>
                      </div>
                      <input required type="date" value={teamFormData.expireDate} onChange={e => setTeamFormData(f => ({ ...f, expireDate: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                    </div>
                  </div>

                  {/* Status Selection */}
                  <div>
                    <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>Trạng Thái Ban Đầu *</label>
                    <select required value={teamFormData.status} onChange={e => setTeamFormData(f => ({ ...f, status: e.target.value }))}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}>
                      <option value="ACTIVE">🟢 Đang hoạt động (ACTIVE)</option>
                      <option value="FAULTY_DIE">🔴 Team Bị Die / Lỗi (FAULTY_DIE)</option>
                      <option value="EXPIRED">⚪ Đã hết hạn (EXPIRED)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>Thông Tin Tài Khoản Gốc (Email | Pass | 2FA) *</label>
                    <textarea required rows={2} value={teamFormData.infor} onChange={e => setTeamFormData(f => ({ ...f, infor: e.target.value }))}
                      placeholder="email@gmail.com | password123 | 2FA_secret" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '13px', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }} />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>📜 Điều Khoản & Chính Sách Bảo Hành Riêng Của Team</label>
                    <textarea rows={3} value={teamFormData.warrantyPolicy} onChange={e => setTeamFormData(f => ({ ...f, warrantyPolicy: e.target.value }))}
                      placeholder="VD: Không kick thành viên quá nhiều, Không set quyền Admin quá 2 người, Không tự ý đổi email..." style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>🏭 Nhà Cung Cấp *</label>
                      <select required value={teamFormData.supplierId} onChange={e => setTeamFormData(f => ({ ...f, supplierId: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}>
                        <option value="">— Chọn NCC —</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: teamFormData.importCost > 0 && !teamFormData.paymentStatus ? '#ef4444' : '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>💳 Thanh Toán Cho NCC *</label>
                      <select required value={teamFormData.paymentStatus} onChange={e => setTeamFormData(f => ({ ...f, paymentStatus: e.target.value }))}
                        style={{
                          width: '100%',
                          background: 'rgba(255,255,255,0.05)',
                          border: teamFormData.importCost > 0 && !teamFormData.paymentStatus ? '1.5px solid #ef4444' : '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          color: teamFormData.paymentStatus ? '#fff' : '#f87171',
                          fontSize: '13.5px',
                          boxSizing: 'border-box'
                        }}>
                        <option value="" disabled>-- Chọn Trạng Thái Thanh Toán NCC * --</option>
                        <option value="PAID">🟢 Đã trả đủ tiền mua team</option>
                        <option value="DEBT">🔴 Còn Nợ NCC (Ghi công nợ)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                    <button type="button" onClick={closeTeamModal} className="glass-button" style={{ color: '#94a3b8' }}>Hủy</button>
                    <button type="submit" className="glass-button" style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: '700' }}>
                      {editingTeam ? '💾 Lưu Thay Đổi' : '✅ Tạo Kho Team'}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}

          {/* Credentials View Modal */}
          {/* Modal Xem Danh Sách Khách Hàng Thuộc Team */}
      {showTeamMembersModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }} onClick={() => setShowTeamMembersModal(null)}>
          <div style={{ background: '#111528', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '720px', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="#38bdf8" /> Khách Hàng Thuộc Kho Team: "{showTeamMembersModal.name}"
              </h3>
              <button onClick={() => setShowTeamMembersModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            {(() => {
              const teamOrders = orders.filter(o => String(o.team_id || o.teamId) === String(showTeamMembersModal.id));
              if (teamOrders.length === 0) {
                return (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                    Kho Team này chưa có đơn hàng/khách hàng nào được gán.
                  </div>
                );
              }

              return (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b' }}>#</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b' }}>Khách Hàng</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b' }}>SĐT / Zalo</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b' }}>Hạn Sử Dụng</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>Trạng Thái</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamOrders.map((o, idx) => {
                        const phone = o.phone || o.customer_phone || '';
                        const cleanPhone = phone.replace(/[^0-9]/g, '');
                        const zaloUrl = cleanPhone ? `https://zalo.me/${cleanPhone}` : null;
                        return (
                          <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '10px 12px', color: '#64748b' }}>{idx + 1}</td>
                            <td style={{ padding: '10px 12px', fontWeight: '700', color: '#fff' }}>
                              {o.customer_name || o.customerName || 'Khách Lẻ'}
                              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>Đơn #{o.id}</div>
                            </td>
                            <td style={{ padding: '10px 12px', color: '#38bdf8' }}>{phone || '—'}</td>
                            <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{o.expire_date || o.expireDate || '—'}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <span style={{
                                fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px',
                                background: o.status === 'Đã thanh toán' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                color: o.status === 'Đã thanh toán' ? '#10b981' : '#ef4444'
                              }}>
                                {o.status || 'Đã thanh toán'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {zaloUrl && (
                                <a
                                  href={zaloUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    padding: '4px 10px', fontSize: '11px', fontWeight: '700', borderRadius: '6px',
                                    background: '#0068ff', color: '#fff', textDecoration: 'none', display: 'inline-flex',
                                    alignItems: 'center', gap: '4px'
                                  }}
                                >
                                  💬 Nhắn Zalo
                                </a>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="glass-button" onClick={() => setShowTeamMembersModal(null)} style={{ padding: '8px 16px', fontSize: '13px' }}>
                Đóng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showCredentialsModal && createPortal(
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }} onClick={() => setShowCredentialsModal(null)}>
              <div style={{ background: '#111528', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Key size={20} color="#38bdf8" />
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#fff', margin: 0 }}>
                      Tài Khoản Gốc: {showCredentialsModal.name}
                    </h3>
                  </div>
                  <button onClick={() => setShowCredentialsModal(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', padding: '14px', borderRadius: '10px', fontSize: '13px', fontFamily: 'monospace', color: '#fff', wordBreak: 'break-all', lineHeight: '1.6' }}>
                  {showCredentialsModal.infor || 'Chưa cập nhật tài khoản gốc'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                  <button
                    className="glass-button"
                    onClick={() => {
                      navigator.clipboard.writeText(showCredentialsModal.infor || '');
                      toast.success('Đã copy tài khoản gốc!');
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}
                  >
                    <Copy size={14} /> Copy Tài Khoản
                  </button>
                  <button className="glass-button" onClick={() => setShowCredentialsModal(null)} style={{ color: '#fff' }}>Đóng</button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Warranty Policy View Modal */}
          {showWarrantyModal && createPortal(
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }} onClick={() => setShowWarrantyModal(null)}>
              <div style={{ background: '#111528', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={20} color="#6366f1" />
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#fff', margin: 0 }}>
                      Chính Sách Bảo Hành: {showWarrantyModal.name}
                    </h3>
                  </div>
                  <button onClick={() => setShowWarrantyModal(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto' }}>
                  {showWarrantyModal.warranty_policy || showWarrantyModal.warrantyPolicy || 'Chưa thiết lập điều khoản bảo hành riêng cho team này.'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                  <button
                    className="glass-button"
                    onClick={() => {
                      navigator.clipboard.writeText(showWarrantyModal.warranty_policy || showWarrantyModal.warrantyPolicy || '');
                      toast.success('Đã copy nội dung bảo hành!');
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8' }}
                  >
                    <Copy size={14} /> Copy Gửi Khách
                  </button>
                  <button className="glass-button" onClick={() => setShowWarrantyModal(null)} style={{ color: '#fff' }}>Đóng</button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Delete Team Confirm */}
          <ConfirmDialog
            isOpen={!!confirmDeleteTeamId}
            title="Xóa Kho Team?"
            message="Hành động này không thể hoàn tác. Team sẽ bị xóa vĩnh viễn."
            onConfirm={handleDeleteTeamConfirmed}
            onCancel={() => setConfirmDeleteTeamId(null)}
          />
        </div>
      )}

      {/* ─── TAB 3: PHIẾU NHẬP HÀNG (PURCHASES) ─── */}
      {activeTab === 'purchases' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Summary Financial Cards for Purchases */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div className="glass-panel" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Tổng Vốn Nhập Kho</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#38bdf8' }}>{totalImportCost.toLocaleString()}đ</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{totalSlots} slot / key đã nhập</div>
            </div>
            <div className="glass-panel" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Đã Thanh Toán NCC</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>{paidImportCost.toLocaleString()}đ</div>
              <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>Đã quyết toán sỉ</div>
            </div>
            <div className="glass-panel" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Còn Nợ NCC</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#ef4444' }}>{debtImportCost.toLocaleString()}đ</div>
              <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px' }}>Công nợ phải trả</div>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={16} />
              <input
                type="text"
                placeholder="Tìm phiếu nhập theo tên sản phẩm, NCC, ghi chú..."
                value={purchaseSearchTerm}
                onChange={e => setPurchaseSearchTerm(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px 10px 38px', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '13px', boxSizing: 'border-box'
                }}
              />
            </div>

            <select
              value={filterPayment}
              onChange={e => setFilterPayment(e.target.value)}
              style={{
                padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', color: '#fff', fontSize: '13px', cursor: 'pointer'
              }}
            >
              <option value="ALL">Tất cả thanh toán</option>
              <option value="PAID">🟢 Đã thanh toán (PAID)</option>
              <option value="DEBT">🔴 Còn nợ NCC (DEBT)</option>
            </select>

            <select
              value={purchaseFilterSupplier}
              onChange={e => setPurchaseFilterSupplier(e.target.value)}
              style={{
                padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: purchaseFilterSupplier !== 'ALL' ? '1.5px solid #a855f7' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', color: purchaseFilterSupplier !== 'ALL' ? '#c084fc' : '#fff', fontSize: '13px', cursor: 'pointer'
              }}
            >
              <option value="ALL">Tất cả nhà cung cấp</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>🏭 {s.name}</option>)}
            </select>
          </div>

          {/* Purchases Table */}
          {filteredPurchases.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '14px' }}>
              Chưa có phiếu nhập hàng nào. Nhấn "+ Lập Phiếu Nhập Hàng Mới" để tạo.
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Mã Phiếu / Ngày Nhập</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Tên Sản Phẩm / Gói</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Nhà Cung Cấp</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', color: '#475569', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Số Lượng</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', color: '#475569', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Tổng Vốn Nhập</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#475569', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Thanh Toán</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', color: '#475569', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.map(p => {
                    const suppName = p.supplier_name || p.supplierName || '—';
                    const isPaid = p.payment_status === 'PAID';
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                          <div style={{ fontWeight: '700', color: '#fff' }}>PN-{String(p.id).padStart(4, '0')}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{p.purchase_date || p.purchaseDate ? new Date(p.purchase_date || p.purchaseDate).toLocaleDateString('vi-VN') : '—'}</div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#fff', fontWeight: '600' }}>
                          {p.product_name || p.productName || 'Sản phẩm nhập kho'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#c084fc', fontWeight: '700' }}>
                          🏭 {suppName}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', color: '#38bdf8' }}>
                          {p.quantity || 1}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '800', color: '#f59e0b' }}>
                          {Number(p.import_cost || p.importCost || 0).toLocaleString()}đ
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{
                            background: isPaid ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                            color: isPaid ? '#10b981' : '#ef4444',
                            padding: '3px 8px', borderRadius: '12px', fontSize: '10.5px', fontWeight: '700',
                            border: isPaid ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)'
                          }}>
                            {isPaid ? '🟢 Đã trả đủ' : '🔴 Còn nợ'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            onClick={() => setConfirmDeletePurchaseId(p.id)}
                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '6px', padding: '4px 8px', color: '#f87171', cursor: 'pointer' }}
                            title="Xóa phiếu nhập"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Confirm Delete Purchase Modal */}
          <ConfirmDialog
            isOpen={!!confirmDeletePurchaseId}
            title="Xóa Phiếu Nhập Hàng?"
            message="Hành động này sẽ xóa vĩnh viễn phiếu nhập hàng khỏi sổ kế toán."
            onConfirm={async () => {
              const id = confirmDeletePurchaseId;
              try {
                await PurchaseService.remove(id);
                setPurchases(prev => prev.filter(p => String(p.id) !== String(id)));
                setConfirmDeletePurchaseId(null);
                toast.success('Đã xóa phiếu nhập hàng!');
              } catch (e) {
                toast.error('Lỗi khi xóa phiếu nhập hàng.');
              }
            }}
            onCancel={() => setConfirmDeletePurchaseId(null)}
          />
        </div>
      )}

      {activeTab === 'nxt_report' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
              Báo cáo biến động kho chuẩn kế toán: <strong>Tồn Đầu + Nhập - Xuất Bán - Xuất Lỗi = Tồn Cuối</strong>
            </p>
          </div>

          <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Sản Phẩm</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', color: '#475569', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Tồn Đầu Kỳ</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', color: '#10b981', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>(+) Nhập Mới</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', color: '#818cf8', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>(-) Xuất Bán POS</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', color: '#ef4444', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>(-) Xuất Lỗi</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', color: '#f59e0b', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>(=) Tồn Cuối Kỳ</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right', color: '#475569', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Đơn Giá Vốn</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right', color: '#f59e0b', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Tổng Giá Trị Tồn</th>
                </tr>
              </thead>
              <tbody>
                {nxtReport.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <strong style={{ color: '#fff' }}>{row.product_name}</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{row.category}</div>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#94a3b8' }}>{row.opening_stock}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#10b981', fontWeight: '700' }}>+{row.imported_qty}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#818cf8', fontWeight: '700' }}>-{row.exported_sold_qty}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#ef4444' }}>-{row.exported_faulty_qty}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <strong style={{ color: row.closing_stock > 0 ? '#10b981' : '#ef4444', fontSize: '14px' }}>
                        {row.closing_stock}
                      </strong>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#cbd5e1' }}>{row.avg_cost.toLocaleString()}đ</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <strong style={{ color: '#f59e0b' }}>{row.total_closing_value.toLocaleString()}đ</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: ĐÒI BẢO HÀNH NCC & CẢNH BÁO ==================== */}
      {activeTab === 'rma_alerts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Low Stock Alerts Box */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <AlertTriangle size={20} color="#ef4444" />
              <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#ef4444' }}>
                Cảnh Báo Sản Phẩm Chạm Ngưỡng Tồn Kho Thấp ({alerts.lowStockAlerts.length})
              </h3>
            </div>

            {alerts.lowStockAlerts.length === 0 ? (
              <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px' }}>
                <CheckCircle2 size={16} /> Toàn bộ các sản phẩm đều đang duy trì mức tồn kho an toàn!
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {alerts.lowStockAlerts.map((a, idx) => (
                  <div key={idx} style={{
                    background: a.is_out_of_stock ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.1)',
                    border: a.is_out_of_stock ? '1px solid #ef4444' : '1px solid rgba(245,158,11,0.3)',
                    borderRadius: '10px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <strong style={{ color: '#fff', fontSize: '14px' }}>{a.product_name}</strong>
                      <div style={{ fontSize: '12px', color: a.is_out_of_stock ? '#ef4444' : '#f59e0b', marginTop: '2px', fontWeight: '700' }}>
                        {a.is_out_of_stock ? '🔴 ĐÃ HẾT HÀNG (0 tồn)' : `🟡 Chỉ còn ${a.total_available} key/slot (Ngưỡng: ${a.min_threshold})`}
                      </div>
                    </div>
                    <button
                      className="glass-button"
                      onClick={() => {
                        setBulkFormData({ ...emptyBulkForm, productName: a.product_name });
                        setShowBulkModal(true);
                      }}
                      style={{ padding: '6px 12px', fontSize: '11.5px', background: '#6366f1', color: '#fff', fontWeight: '700' }}
                    >
                      Nhập Thêm
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 1: Kho Team Bị DIE Cần Đòi Bảo Hành NCC */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={20} color="#ef4444" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#fff' }}>
                  🔴 Kho Team Bị DIE Cần Đòi Bảo Hành NCC ({teams.filter(t => (t.status === 'FAULTY_DIE' || t.status === 'DIE') && !t.replaced_by_team_id && !t.replaced_by_team_name).length} Team)
                </h3>
              </div>
            </div>

            {teams.filter(t => (t.status === 'FAULTY_DIE' || t.status === 'DIE') && !t.replaced_by_team_id && !t.replaced_by_team_name).length === 0 ? (
              <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px' }}>
                <CheckCircle2 size={16} /> 100% Kho Team đang hoạt động tốt. Không có Team nào bị DIE cần bảo hành!
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: '#475569' }}>Tên Kho Team Bị DIE</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: '#475569' }}>Loại Dịch Vụ</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: '#475569' }}>NCC Cung Cấp</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', color: '#475569' }}>Quy Mô</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', color: '#475569' }}>Thao Tác Xử Lý Bảo Hành</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.filter(t => (t.status === 'FAULTY_DIE' || t.status === 'DIE') && !t.replaced_by_team_id && !t.replaced_by_team_name).map(t => (
                      <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '10px 14px', maxWidth: '320px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ color: '#fff', fontSize: '13.5px' }}>{t.name}</strong>
                          </div>
                          {t.infor && (
                            <div
                              onClick={() => {
                                navigator.clipboard.writeText(t.infor);
                                toast.success('✅ Đã copy thông tin tài khoản gốc!');
                              }}
                              title="Click 1-click copy nick/mật khẩu gốc"
                              style={{ fontSize: '11px', color: '#38bdf8', marginTop: '3px', fontFamily: 'monospace', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              🔑 Acc: {t.infor}
                            </div>
                          )}
                          {t.replaced_by_team_name && (
                            <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px', fontWeight: '600' }}>
                              ⚡ Đã thay thế bởi: {t.replaced_by_team_name}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#38bdf8' }}>{t.category}</td>
                        <td style={{ padding: '10px 14px', color: '#c084fc', fontWeight: '700' }}>🏭 {t.supplier_name || t.supplierName || '—'}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', color: '#ef4444', fontWeight: '700' }}>{t.max_slots || t.maxSlots || 49} slot</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', alignItems: 'center', flexWrap: 'nowrap' }}>
                            <button
                              className="glass-button"
                              onClick={() => handleCopySupplierClaimMsg(t)}
                              title="1-Click copy kịch bản nhắn Zalo đòi bảo hành cho NCC"
                              style={{ padding: '4px 9px', fontSize: '11px', whiteSpace: 'nowrap', background: 'rgba(245,158,11,0.18)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', fontWeight: '700' }}
                            >
                              📋 Copy Tin Đòi BH
                            </button>

                            {(() => {
                              const supp = suppliers.find(s => String(s.id) === String(t.supplier_id || t.supplierId));
                              const suppZalo = (supp?.zalo || supp?.phone || '').split(',')[0]?.trim();
                              if (!suppZalo) return null;
                              return (
                                <a
                                  href={`https://zalo.me/${suppZalo.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="glass-button"
                                  title="Click mở Zalo NCC"
                                  style={{ padding: '4px 9px', fontSize: '11px', whiteSpace: 'nowrap', background: '#0068ff', color: '#fff', textDecoration: 'none', fontWeight: '700' }}
                                >
                                  💬 Zalo NCC
                                </a>
                              );
                            })()}

                            <button
                              className="glass-button"
                              onClick={() => handleOpenReplaceTeamModal(t)}
                              title="Tạo team mới thay thế để đổi bảo hành cho khách"
                              style={{ padding: '4px 9px', fontSize: '11px', whiteSpace: 'nowrap', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: '800' }}
                            >
                              ⚡ Đổi Team Mới
                            </button>

                            <button
                              className="glass-button"
                              onClick={async () => {
                                await TeamService.update(t.id, { status: 'ACTIVE' });
                                toast.success(`Đã khôi phục Team "${t.name}" về Active!`);
                                loadData();
                              }}
                              title="Khôi phục team cũ về trạng thái Hoạt động"
                              style={{ padding: '4px 8px', fontSize: '11px', whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)' }}
                            >
                              🟢 Khôi Phục
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Supplier Faulty Claim List for Single Keys */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldAlert size={20} color="#f59e0b" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>
                  Danh Sách Key Rời Lỗi Cần Đòi Bảo Hành NCC ({items.filter(i => i.status === 'FAULTY' || i.status === 'SUPPLIER_CLAIM').length})
                </h3>
              </div>
            </div>

            {items.filter(i => i.status === 'FAULTY' || i.status === 'SUPPLIER_CLAIM').length === 0 ? (
              <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px' }}>
                <CheckCircle2 size={16} /> Không có key rời lỗi nào tồn đọng!
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: '#475569' }}>Sản Phẩm</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: '#475569' }}>Mã Key / Tài Khoản Lỗi</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: '#475569' }}>Lý Do Lỗi</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: '#475569' }}>NCC Cung Cấp</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', color: '#475569' }}>Giá Vốn</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', color: '#475569' }}>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.filter(i => i.status === 'FAULTY' || i.status === 'SUPPLIER_CLAIM').map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: '700', color: '#fff' }}>{item.product_name}</td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#ef4444' }}>{item.item_code}</td>
                        <td style={{ padding: '10px 14px', color: '#fca5a5' }}>{item.faulty_reason || 'Lỗi pass'}</td>
                        <td style={{ padding: '10px 14px', color: '#cbd5e1' }}>{item.supplier_name || 'N/A'}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#f59e0b', fontWeight: '700' }}>
                          {Number(item.cost_price || 0).toLocaleString()}đ
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <button
                            className="glass-button"
                            onClick={() => handleRestock(item)}
                            title="NCC đã đổi key mới -> Trả về kho sẵn sàng bán"
                            style={{ padding: '4px 10px', fontSize: '11px', background: '#10b981', color: '#fff', fontWeight: '700' }}
                          >
                            <Check size={12} /> Đã Đổi Key Mới
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== MODAL: BULK IMPORT KEYS ==================== */}
      {showBulkModal && createPortal(
        <div
            className="drawer-overlay"
            onClick={() => setShowBulkModal(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
              display: 'flex', justifyContent: 'flex-end'
            }}
          >
            <div
              className="drawer-content animate-slide-in-right"
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: '680px', height: '100vh',
                background: '#0f172a', borderLeft: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '-10px 0 35px rgba(0,0,0,0.7)',
                display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto'
              }}
            >
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={20} color="#10b981" /> Nhập Key / Account Số Lượng Lớn (Bulk Import)
              </h2>
              <button className="modal-close-btn" onClick={() => setShowBulkModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleBulkImport} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Chọn Sản Phẩm *</label>
                  <select
                    className="glass-input"
                    value={bulkFormData.productName}
                    onChange={e => handleProductSelect(e.target.value)}
                    required
                  >
                    <option value="">-- Chọn sản phẩm * --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Loại Tài Sản Số *</label>
                  <select
                    className="glass-input"
                    value={bulkFormData.assetType}
                    onChange={e => setBulkFormData({ ...bulkFormData, assetType: e.target.value })}
                    required
                  >
                    <option value="ACCOUNT">Tài Khoản (Email|Pass)</option>
                    <option value="SINGLE_KEY">License Key / Serial</option>
                    <option value="INVITE_LINK">Link Mời (Invite URL)</option>
                    <option value="SLOT_SEAT">Slot Hồ Bơi</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Nhà Cung Cấp *</label>
                  <select
                    className="glass-input"
                    value={bulkFormData.supplierId}
                    onChange={e => setBulkFormData({ ...bulkFormData, supplierId: e.target.value })}
                    required
                  >
                    <option value="">-- Chọn nhà cung cấp * --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Giá Vốn / 1 Key (VNĐ) *</label>
                  <input
                    type="number"
                    min="0"
                    className="glass-input"
                    value={bulkFormData.costPrice}
                    onChange={e => setBulkFormData({ ...bulkFormData, costPrice: e.target.value })}
                    placeholder="VD: 50000"
                    required
                  />
                </div>
              </div>

              {/* Warranty & Expiry Date Row (NEW) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="form-label" style={{ margin: 0 }}>🛡️ Thời Gian BH / Hạn Sử Dụng *</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button type="button" onClick={() => {
                        const d = new Date();
                        d.setMonth(d.getMonth() + 1);
                        setBulkFormData(f => ({ ...f, expireDate: d.toISOString().split('T')[0] }));
                      }} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#38bdf8', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>+1 Thg</button>
                      <button type="button" onClick={() => {
                        const d = new Date();
                        d.setMonth(d.getMonth() + 6);
                        setBulkFormData(f => ({ ...f, expireDate: d.toISOString().split('T')[0] }));
                      }} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#38bdf8', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>+6 Thg</button>
                      <button type="button" onClick={() => {
                        const d = new Date();
                        d.setFullYear(d.getFullYear() + 1);
                        setBulkFormData(f => ({ ...f, expireDate: d.toISOString().split('T')[0] }));
                      }} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#38bdf8', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>+1 Năm</button>
                    </div>
                  </div>
                  <input
                    type="date"
                    required
                    className="glass-input"
                    value={bulkFormData.expireDate || ''}
                    onChange={e => setBulkFormData({ ...bulkFormData, expireDate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">Ghi Chú Đợt Nhập (Tùy chọn)</label>
                  <input
                    type="text"
                    className="glass-input"
                    value={bulkFormData.notes || ''}
                    onChange={e => setBulkFormData({ ...bulkFormData, notes: e.target.value })}
                    placeholder="Ghi chú thêm về đợt nhập..."
                  />
                </div>
              </div>

              {/* Large Textarea for pasting batch keys */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Danh Sách Key / Account (Mỗi dòng 1 key) *</label>
                  <span style={{ fontSize: '11.5px', color: liveLinesCount > 0 ? '#10b981' : '#64748b', fontWeight: '700' }}>
                    ⚡ Đã nhập: {liveLinesCount} dòng
                  </span>
                </div>
                <textarea
                  className="glass-input"
                  style={{ minHeight: '140px', fontFamily: 'monospace', fontSize: '12.5px', lineHeight: 1.5 }}
                  placeholder={`Dán danh sách key vào đây (mỗi dòng 1 key):\nuser01@gmail.com|Pass123\nuser02@gmail.com|Pass456\nWIN11-PRO-XXXXX-YYYYY`}
                  value={bulkFormData.linesText}
                  onChange={e => setBulkFormData({ ...bulkFormData, linesText: e.target.value })}
                  required
                />
              </div>

              {/* Auto-accounting summary & Mandatory Payment Selection Bar */}
              <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', padding: '12px 16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>💰 Tổng tiền vốn đợt nhập:</span>
                  <strong style={{ color: '#f59e0b', fontSize: '16px', fontWeight: '800' }}>
                    {liveTotalBatchCost.toLocaleString()} VNĐ
                  </strong>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: !bulkFormData.paymentStatus ? '#ef4444' : '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '700' }}>
                    💳 Thanh Toán Cho NCC (Bắt buộc chọn) *
                  </label>
                  <select
                    required
                    value={bulkFormData.paymentStatus || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setBulkFormData(f => ({ ...f, paymentStatus: val, isPaidToSupplier: val === 'PAID' }));
                    }}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: !bulkFormData.paymentStatus ? '1.5px solid #ef4444' : '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: bulkFormData.paymentStatus ? '#fff' : '#f87171',
                      fontSize: '13.5px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="" disabled>-- Bắt buộc chọn trạng thái thanh toán NCC * --</option>
                    <option value="PAID">🟢 Đã thanh toán ngay cho NCC (Ghi sổ quỹ / Chi tiền)</option>
                    <option value="DEBT">🔴 Còn Nợ NCC (Ghi sổ công nợ nhà cung cấp)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="submit"
                  className="glass-button"
                  style={{ flex: 1, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: '700' }}
                >
                  <Plus size={16} /> Xác Nhận Nhập {liveLinesCount} Key Vào Kho
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ==================== MODAL: MARK FAULTY ==================== */}
      {showFaultyModal && createPortal(
        <div
            className="drawer-overlay"
            onClick={() => setShowFaultyModal(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
              display: 'flex', justifyContent: 'flex-end'
            }}
          >
            <div
              className="drawer-content animate-slide-in-right"
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: '560px', height: '100vh',
                background: '#0f172a', borderLeft: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '-10px 0 35px rgba(0,0,0,0.7)',
                display: 'flex', flexDirection: 'column', padding: '24px'
              }}
            >
            <div className="modal-header">
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} /> Đánh Dấu Key Lỗi / Chờ Đổi Trả NCC
              </h2>
              <button className="modal-close-btn" onClick={() => setShowFaultyModal(null)}><X size={18} /></button>
            </div>

            <form onSubmit={handleConfirmFaulty} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                Sản phẩm: <strong style={{ color: '#fff' }}>{showFaultyModal.product_name}</strong>
              </p>
              <code style={{ fontSize: '12px', color: '#ef4444', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px', wordBreak: 'break-all' }}>
                {showFaultyModal.item_code}
              </code>

              <div>
                <label className="form-label">Lý do lỗi *</label>
                <input
                  type="text"
                  required
                  className="glass-input"
                  placeholder="VD: Sai password, bị khóa tài khoản sau 2 ngày..."
                  value={faultyReason}
                  onChange={e => setFaultyReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="submit" className="glass-button" style={{ flex: 1, background: '#ef4444', color: '#fff', fontWeight: '700' }}>
                  Xác Nhận Đưa Vào Mục Đòi NCC
                </button>
                <button
                  type="button"
                  onClick={() => setShowFaultyModal(null)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(confirmDeleteId)}
        title="Xác Nhận Xóa Key Khỏi Kho"
        message="Bạn có chắc chắn muốn xóa key này khỏi kho hàng? Hành động này không thể hoàn tác."
        onConfirm={handleDeleteItem}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {/* ==================== MODAL LẬP PHIẾU NHẬP HÀNG ==================== */}
      {showPurchaseModal && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}>
          <div className="animate-scale-in" style={{ background: "#111528", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "16px", padding: "28px", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#fff", margin: 0 }}>📦 Lập Phiếu Nhập Hàng Mới</h3>
              <button className="modal-close-btn" onClick={() => setShowPurchaseModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSavePurchase} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label className="form-label">Nhà Cung Cấp *</label>
                <select required className="glass-input" value={purchaseFormData.supplierId} onChange={e => setPurchaseFormData(f => ({ ...f, supplierId: e.target.value }))}>
                  <option value="">-- Chọn NCC --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Tên Sản Phẩm / Dịch Vụ *</label>
                <input required className="glass-input" placeholder="VD: Canva Pro, ChatGPT Plus..." value={purchaseFormData.productName} onChange={e => setPurchaseFormData(f => ({ ...f, productName: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="form-label">Tổng Tiền Vốn (đ) *</label>
                  <input required type="number" min="0" className="glass-input" placeholder="0" value={purchaseFormData.importCost} onChange={e => setPurchaseFormData(f => ({ ...f, importCost: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Số Lượng</label>
                  <input type="number" min="1" className="glass-input" value={purchaseFormData.quantity} onChange={e => setPurchaseFormData(f => ({ ...f, quantity: e.target.value }))} />
                </div>
              </div>
              {purchaseLiveCost > 0 && purchaseLiveQty > 0 && (
                <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "8px", padding: "10px 14px", fontSize: "12.5px", color: "#10b981" }}>
                  Giá vốn TB: <strong>{(purchaseLiveCost / purchaseLiveQty).toLocaleString("vi-VN")}đ / unit</strong>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="form-label">Trạng Thái Thanh Toán</label>
                  <select className="glass-input" value={purchaseFormData.paymentStatus} onChange={e => setPurchaseFormData(f => ({ ...f, paymentStatus: e.target.value }))}>
                    <option value="Đã thanh toán">Đã thanh toán</option>
                    <option value="Chưa thanh toán">Chưa thanh toán</option>
                    <option value="Thanh toán một phần">Thanh toán một phần</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Ngày Nhập *</label>
                  <input required type="date" className="glass-input" value={purchaseFormData.purchaseDate} onChange={e => setPurchaseFormData(f => ({ ...f, purchaseDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="form-label">Ghi Chú</label>
                <textarea rows={2} className="glass-input" placeholder="Ghi chú nội bộ (tùy chọn)..." value={purchaseFormData.notes} onChange={e => setPurchaseFormData(f => ({ ...f, notes: e.target.value }))} style={{ resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <button type="submit" className="glass-button" style={{ flex: 1, background: "#6366f1", color: "#fff", fontWeight: "800", padding: "10px" }}>✅ Lập Phiếu Nhập</button>
                <button type="button" className="glass-button" onClick={() => setShowPurchaseModal(false)} style={{ padding: "10px 20px", color: "#94a3b8" }}>Hủy</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

            {/* Modal Replace Team */}
      {showReplaceTeamModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }} onClick={() => setShowReplaceTeamModal(null)}>
          <div style={{ background: '#111528', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '16px', padding: '26px', width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚡ Tạo Kho Team Thay Thế Bảo Hành
              </h3>
              <button onClick={() => setShowReplaceTeamModal(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: '#fca5a5' }}>
              <strong>Team Cũ Bị DIE:</strong> {showReplaceTeamModal.name} ({showReplaceTeamModal.category})<br/>
              <strong>NCC Bảo Hành:</strong> {showReplaceTeamModal.supplier_name || showReplaceTeamModal.supplierName || '—'}<br/>
              <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px', display: 'block' }}>
                🔒 Team cũ sẽ được <strong>ĐÓNG BĂNG VĨNH VIỄN</strong> để lưu giữ nguyên thông tin nick cũ làm bằng chứng đối soát với NCC. Toàn bộ đơn hàng còn hạn sẽ tự động chuyển sang Team mới!
              </span>
            </div>

            <form onSubmit={handleConfirmReplaceTeam} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>Tên Team Mới Từ NCC *</label>
                <input required value={replaceFormData.name} onChange={e => setReplaceFormData(f => ({ ...f, name: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>🔑 Thông Tin Acc Gốc / Link Invite Mới Từ NCC *</label>
                <textarea required rows={3} value={replaceFormData.infor} onChange={e => setReplaceFormData(f => ({ ...f, infor: e.target.value }))}
                  placeholder="Dán email admin, password hoặc link invite team mới do NCC vừa cấp..."
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>Số Slot Mới</label>
                  <input type="number" min="1" value={replaceFormData.maxSlots} onChange={e => setReplaceFormData(f => ({ ...f, maxSlots: e.target.value }))}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>⌛ Hạn Dùng Mới</label>
                  <input type="date" value={replaceFormData.expireDate} onChange={e => setReplaceFormData(f => ({ ...f, expireDate: e.target.value }))}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>📝 Ghi Chú Bảo Hành</label>
                <input value={replaceFormData.reason} onChange={e => setReplaceFormData(f => ({ ...f, reason: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="glass-button" onClick={() => setShowReplaceTeamModal(null)} style={{ color: '#fff' }}>Hủy</button>
                <button type="submit" className="glass-button" style={{ background: '#10b981', color: '#fff', fontWeight: '800' }}>
                  ✅ Xác Nhận Tạo Team Thay Thế
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
