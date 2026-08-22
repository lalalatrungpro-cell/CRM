import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  OrderService, CustomerService, ProductService, SupplierService,
  TeamService, ChannelService, VietQRService, WarrantyLogService, SupplierPriceService, InventoryService,
  CashTransactionService, clearAllSystemData
} from '../utils/dataService';
import { supabase } from '../utils/supabaseClient';
import { getVietQRUrl } from '../utils/storage';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import DateFilterBar from '../components/DateFilterBar';
import { convertAllOldOrderIds, convertAllOldCustomerIds } from '../utils/orderMigrator';
import {
  Plus, Users, Copy, Check, ShieldAlert, FileText, UserPlus, Search,
  Filter, Eye, EyeOff, ChevronLeft, ChevronRight, X, QrCode, CreditCard,
  Trash2, Printer, RefreshCw, Edit3, Edit, AlertTriangle, ShieldCheck, Boxes
} from 'lucide-react';

const PAGE_SIZE = 15;


// Helper for Brand Channel Logo Icons (Facebook 'f', Zalo 'Z', Telegram, etc.)
const renderChannelBrandIcon = (source, fullChannelName) => {
  const src = String(fullChannelName || source || '').toLowerCase();
  const title = fullChannelName || source || 'Kênh Bán Hàng';

  if (src.includes('facebook') || src.includes('fb')) {
    return (
      <span
        title={title}
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: '#1877F2',
          color: '#ffffff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '900',
          fontSize: '17px',
          fontFamily: 'Helvetica, Arial, sans-serif',
          boxShadow: '0 2px 6px rgba(24,119,242,0.4)',
          cursor: 'help',
          userSelect: 'none'
        }}
      >
        f
      </span>
    );
  }

  if (src.includes('zalo')) {
    return (
      <span
        title={title}
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: '#0068FF',
          color: '#ffffff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '900',
          fontSize: '13px',
          fontFamily: 'Arial, sans-serif',
          boxShadow: '0 2px 6px rgba(0,104,255,0.4)',
          cursor: 'help',
          userSelect: 'none'
        }}
      >
        Z
      </span>
    );
  }

  if (src.includes('tiktok')) {
    return (
      <span
        title={title}
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: '#000000',
          color: '#25F4EE',
          border: '1px solid #FE2C55',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          boxShadow: '0 2px 6px rgba(254,44,85,0.4)',
          cursor: 'help',
          userSelect: 'none'
        }}
      >
        🎵
      </span>
    );
  }

  if (src.includes('telegram')) {
    return (
      <span
        title={title}
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: '#229ED9',
          color: '#ffffff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          boxShadow: '0 2px 6px rgba(34,158,217,0.4)',
          cursor: 'help',
          userSelect: 'none'
        }}
      >
        ✈️
      </span>
    );
  }

  if (src.includes('website')) {
    return (
      <span
        title={title}
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'rgba(139,92,246,0.2)',
          color: '#a78bfa',
          border: '1px solid rgba(139,92,246,0.4)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          cursor: 'help'
        }}
      >
        🌐
      </span>
    );
  }

  if (src.includes('giới thiệu') || src.includes('gioi thieu')) {
    return (
      <span
        title={title}
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'rgba(245,158,11,0.2)',
          color: '#fbbf24',
          border: '1px solid rgba(245,158,11,0.4)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          cursor: 'help'
        }}
      >
        🤝
      </span>
    );
  }

  return (
    <span
      title={title}
      style={{
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: 'rgba(100,116,139,0.2)',
        color: '#94a3b8',
        border: '1px solid rgba(100,116,139,0.4)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '13px',
        cursor: 'help'
      }}
    >
      📌
    </span>
  );
};

const SOURCE_CONFIG = {
  'Đại Lý / CTV': { label: 'Đại Lý / CTV', color: '#a855f7', bg: 'rgba(168,85,247,0.15)', icon: '🏬' },
  'Facebook Page': { label: 'FB Page', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', icon: '🌐' },
  'Zalo': { label: 'Zalo', color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: '💬' },
  'TikTok Shop': { label: 'TikTok', color: '#ec4899', bg: 'rgba(236,72,153,0.15)', icon: '🎵' },
  'Telegram': { label: 'Telegram', color: '#0ea5e9', bg: 'rgba(14,165,233,0.15)', icon: '✈️' },
  'Giới Thiệu': { label: 'Giới Thiệu', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: '🤝' },
  'Website': { label: 'Website', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', icon: '💻' },
  'Khác': { label: 'Khác', color: '#64748b', bg: 'rgba(100,116,139,0.15)', icon: '📌' }
};

export default function Orders() {
  const toast = useToast();
  const { shopId } = useAuth();

  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [channels, setChannels] = useState([]);
  const [vietqr, setVietqr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '', preset: 'ALL' });

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(null);
  const [showWarrantyModal, setShowWarrantyModal] = useState(null);
  const [showEditModal, setShowEditModal] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterTeamId, setFilterTeamId] = useState('ALL');
  const [filterCustomerType, setFilterCustomerType] = useState('ALL');
  const [filterSupplierId, setFilterSupplierId] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState('');
  const [posCustSearchTerm, setPosCustSearchTerm] = useState('');
  const [showPosCustDropdown, setShowPosCustDropdown] = useState(false);
  const searchContainerRef = useRef(null);

  // Sub-Channel Smart Search State & Ref
  const [subChannelSearchTerm, setSubChannelSearchTerm] = useState('');
  const [showSubChannelDropdown, setShowSubChannelDropdown] = useState(false);
  const subChannelContainerRef = useRef(null);

  // Product Smart Search State & Ref
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const productContainerRef = useRef(null);

  useEffect(() => {
    const handleClickOutsideSubChannel = (event) => {
      if (subChannelContainerRef.current && !subChannelContainerRef.current.contains(event.target)) {
        setShowSubChannelDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutsideSubChannel);
    document.addEventListener('touchstart', handleClickOutsideSubChannel);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideSubChannel);
      document.removeEventListener('touchstart', handleClickOutsideSubChannel);
    };
  }, []);

  useEffect(() => {
    const handleClickOutsideProduct = (event) => {
      if (productContainerRef.current && !productContainerRef.current.contains(event.target)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutsideProduct);
    document.addEventListener('touchstart', handleClickOutsideProduct);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideProduct);
      document.removeEventListener('touchstart', handleClickOutsideProduct);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowPosCustDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);
  const [revealedInfors, setRevealedInfors] = useState({});

  // Warranty form
  const [warrantyReason, setWarrantyReason] = useState('');
  const [warrantyNewInfor, setWarrantyNewInfor] = useState('');
  const [warrantyNewTeamId, setWarrantyNewTeamId] = useState('');
  const [warrantyMode, setWarrantyMode] = useState('EXCHANGE_SAME_SUPPLIER');
  const [warrantyNewSupplierId, setWarrantyNewSupplierId] = useState('');
  const [warrantyAdditionalCost, setWarrantyAdditionalCost] = useState(0);
  const [warrantyRefundAmount, setWarrantyRefundAmount] = useState(0);
  const [warrantyAuditLogs, setWarrantyAuditLogs] = useState([]);
  const [lowestPriceHint, setLowestPriceHint] = useState(null);
  
  

  
  const [editFormData, setEditFormData] = useState({
    id: '',
    infor: '',
    sellPrice: 0,
    costPrice: 0,
    supplierId: '',
    status: 'Đã thanh toán',
    expireDate: ''
  });

  
  const checkLowestPriceForProduct = async (productName) => {
    if (!productName || !shopId) {
      setLowestPriceHint(null);
      return;
    }
    try {
      const hint = await SupplierPriceService.getLowestPriceSupplier(shopId, productName, suppliers);
      setLowestPriceHint(hint);
    } catch (err) {
      setLowestPriceHint(null);
    }
  };

  const handleApplyLowestPriceHint = () => {
    if (!lowestPriceHint) return;
    setFormData(prev => ({
      ...prev,
      supplierId: String(lowestPriceHint.supplier_id),
      costPrice: lowestPriceHint.price,
      supplier_id: String(lowestPriceHint.supplier_id),
      cost_price: lowestPriceHint.price
    }));
    toast.success('Đã áp dụng Nguồn Sỉ rẻ nhất (' + lowestPriceHint.supplier_name + ' - ' + Number(lowestPriceHint.price).toLocaleString() + 'đ)!');
  };
  
  const handleOpenEditModal = (order) => {
    setEditFormData({
      id: order.id,
      infor: order.infor || '',
      sellPrice: order.sell_price || 0,
      costPrice: order.cost_price || 0,
      supplierId: order.supplier_id || '',
      status: order.status || 'Đã thanh toán',
      expireDate: order.expire_date || ''
    });
    setShowEditModal(order);
  };

  
  const handleOpenWarrantyModal = (order) => {
    setShowWarrantyModal(order);
    setWarrantyMode('EXCHANGE_SAME_SUPPLIER');
    setWarrantyReason('');
    setWarrantyNewInfor('');
    setWarrantyNewTeamId('');
    setWarrantyNewSupplierId('');
    setWarrantyAdditionalCost(0);

    // Calculate prorated partial refund recommendation
    const sellP = order.sell_price || order.sellPrice || 0;
    const pDate = new Date(order.purchase_date || Date.now());
    const eDate = new Date(order.expire_date || Date.now());
    const totalDays = Math.max(1, Math.round((eDate - pDate) / (1000 * 60 * 60 * 24))) || 30;
    const remainingDays = Math.max(0, Math.round((eDate - new Date()) / (1000 * 60 * 60 * 24)));
    const estimatedRefund = Math.round((sellP / totalDays) * remainingDays);
    setWarrantyRefundAmount(estimatedRefund > 0 ? estimatedRefund : sellP);
  };
  
  
  const handleConfirmWarranty = async (e) => {
    e.preventDefault();
    if (!showWarrantyModal) return;

    const order = showWarrantyModal;
    const currentCost = Number(order.cost_price || order.costPrice || 0);
    const currentSell = Number(order.sell_price || order.sellPrice || 0);

    let updatedOrderPayload = {};
    let auditLogPayload = {
      order_id: order.id,
      customer_name: order.customer_name,
      product_name: order.product_name,
      warranty_type: warrantyMode,
      reason: warrantyReason,
      new_infor: warrantyNewInfor,
      original_supplier_id: order.supplier_id || ''
    };

    if (warrantyMode === 'SWITCH_TEAM') {
      updatedOrderPayload = {
        team_id: warrantyNewTeamId || order.team_id,
        infor: warrantyNewInfor || order.infor
      };
      auditLogPayload.new_team_id = warrantyNewTeamId;
      auditLogPayload.summary = 'Chuyển Kho Team mới: ' + (teams.find(t => String(t.id) === String(warrantyNewTeamId))?.name || warrantyNewTeamId);
    } else if (warrantyMode === 'EXCHANGE_SAME_SUPPLIER') {
      updatedOrderPayload = {
        infor: warrantyNewInfor || order.infor
      };
      auditLogPayload.summary = 'Đổi Acc mới từ cùng Nguồn Sỉ';
    } else if (warrantyMode === 'CROSS_SUPPLIER') {
      const addCost = Number(warrantyAdditionalCost || 0);
      const newTotalCost = currentCost + addCost;
      updatedOrderPayload = {
        supplier_id: warrantyNewSupplierId || order.supplier_id,
        cost_price: newTotalCost,
        infor: warrantyNewInfor || order.infor
      };
      auditLogPayload.new_supplier_id = warrantyNewSupplierId;
      auditLogPayload.additional_cost_price = addCost;
      auditLogPayload.total_cost_price = newTotalCost;
      auditLogPayload.summary = 'Đổi Acc Chéo Nguồn Sỉ: ' + (suppliers.find(s => String(s.id) === String(warrantyNewSupplierId))?.name || warrantyNewSupplierId) + ' (+ ' + addCost.toLocaleString() + 'đ giá vốn)';
    } else if (warrantyMode === 'FULL_REFUND') {
      updatedOrderPayload = {
        status: 'Đã hoàn tiền (100%)',
        refund_amount: currentSell
      };
      auditLogPayload.refund_amount = currentSell;
      auditLogPayload.summary = 'Hoàn tiền 100%: ' + currentSell.toLocaleString() + 'đ';
    } else if (warrantyMode === 'PARTIAL_REFUND') {
      const refAmt = Number(warrantyRefundAmount || 0);
      updatedOrderPayload = {
        status: 'Hoàn tiền 1 phần (' + refAmt.toLocaleString() + 'đ)',
        refund_amount: refAmt
      };
      auditLogPayload.refund_amount = refAmt;
      auditLogPayload.summary = 'Hoàn tiền 1 phần: ' + refAmt.toLocaleString() + 'đ';
    } else if (warrantyMode === 'REJECT_WARRANTY') {
      updatedOrderPayload = {
        status: 'Từ chối bảo hành'
      };
      auditLogPayload.summary = 'Từ chối bảo hành. Lý do: ' + warrantyReason;
    }

    try {
      await OrderService.update(order.id, updatedOrderPayload);
      await WarrantyLogService.create(shopId, auditLogPayload);
      // [Phase 2] Tự động ghi chi phí hoàn tiền vào CashFlow (tài khoản Ngân Hàng)
      if (warrantyMode === 'FULL_REFUND' || warrantyMode === 'PARTIAL_REFUND') {
        const _refAmt = warrantyMode === 'FULL_REFUND' ? currentSell : Number(warrantyRefundAmount || 0);
        if (_refAmt > 0) {
          await CashTransactionService.create(shopId, {
            type: 'EXPENSE',
            category: 'Hoàn Tiền Bảo Hành',
            amount: _refAmt,
            account_type: 'BANK',
            reference_type: 'warranty',
            reference_id: order.id,
            counterpart_name: order.customer_name || '',
            notes: `Hoàn tiền BH đơn #${order.id} — ${order.product_name || ''} — KH: ${order.customer_name || ''}`,
            transaction_date: new Date().toISOString().split('T')[0]
          });
        }
      }
      toast.success('Đã ghi nhận xử lý bảo hành 360°!');
      setShowWarrantyModal(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi xảy ra khi xử lý bảo hành.');
    }
  };

  const handleSaveEditOrder = async (e) => {
    e.preventDefault();
    if (!editFormData.id) return;

    const payload = {
      infor: editFormData.infor,
      sell_price: Number(editFormData.sellPrice),
      cost_price: Number(editFormData.costPrice),
      supplier_id: editFormData.supplierId,
      status: editFormData.status,
      expire_date: editFormData.expireDate
    };

    try {
      const oldOrder = orders.find(o => String(o.id) === String(editFormData.id));
      if (oldOrder && oldOrder.status === 'Nợ' && editFormData.status === 'Đã thanh toán') {
        const custId = oldOrder.customer_id || oldOrder.customerId;
        const oldSellPrice = Number(oldOrder.sell_price || oldOrder.sellPrice || 0);
        if (custId) {
          const cust = customers.find(c => String(c.id) === String(custId));
          if (cust) {
            const currentDebt = Number(cust.debt || 0);
            const newDebt = Math.max(0, currentDebt - oldSellPrice);
            await CustomerService.update(cust.id, { debt: newDebt });
            toast.success(`Đã tự động trừ công nợ KH ${cust.name}: ${oldSellPrice.toLocaleString('vi-VN')}đ!`);
          }
        }
        await CashTransactionService.create(shopId, {
          type: 'INCOME',
          category: 'Doanh thu POS',
          amount: Number(editFormData.sellPrice || oldSellPrice),
          account_type: 'BANK',
          reference_id: String(editFormData.id),
          notes: `Thu tiền đơn nợ #${editFormData.id}`
        });
      }

      await OrderService.update(editFormData.id, payload);
      toast.success('Đã cập nhật thông tin tài khoản & đơn hàng!');
      setShowEditModal(null);
      if (showDetailModal && String(showDetailModal.id) === String(editFormData.id)) {
        setShowDetailModal({ ...showDetailModal, ...payload });
      }
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi khi cập nhật đơn hàng.');
    }
  };

  const loadData = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [oList, cList, pList, sList, tList, chanList, vqrData] = await Promise.all([
        OrderService.list(shopId),
        CustomerService.list(shopId),
        ProductService.list(shopId),
        SupplierService.list(shopId),
        TeamService.list(shopId),
        ChannelService.list(shopId),
        VietQRService.get(shopId)
      ]);
      setOrders(oList || []);
      setCustomers(cList || []);
      setProducts(pList || []);
      setSuppliers(sList || []);
      setTeams(tList || []);
      setChannels(chanList || []);
      setVietqr(vqrData || { bank_id: 'MB', account_no: '0901234567', account_name: 'SHOP DROPSHIP CRM', memo_prefix: 'DON' });
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải dữ liệu Đơn hàng từ Supabase!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [shopId]);

  const todayStr = new Date().toISOString().split('T')[0];
  const nextMonthStr = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const emptyForm = {
    customerId: '',
    newCustomerName: '',
    newCustomerPhone: '',
    newCustomerEmail: '',
    newCustomerType: '',
    newCustomerSource: 'Facebook Page',
    newCustomerSubChannel: '',
    newCustomerNotes: '',
    productName: '',
    teamId: '',
    supplierId: '',
    inventoryItemId: null,
    inventoryHint: null,
    infor: '',
    sellPrice: '',
    costPrice: '',
    status: '',
    purchaseDate: todayStr,
    expireDate: '',
    durationDays: 30,
    source: 'Facebook Page',
    subChannelName: '',
  };

  const [formData, setFormData] = useState(emptyForm);

  // [Task 1 - Batch POS Cart State]
  const [batchItems, setBatchItems] = useState([]);
  const [selectedAddProduct, setSelectedAddProduct] = useState('');

  // [Phase 5] Detect if selected product is EVERGREEN (no expire date)
  const selectedProduct = products.find(p => p.name === formData.productName);
  const isEvergreen = (selectedProduct?.product_type || selectedProduct?.productType) === 'EVERGREEN';
  const isTeamSlot = (selectedProduct?.product_type || selectedProduct?.productType) === 'TEAM_SLOT';


  // ESC modal close
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setShowQrModal(null);
        setShowDetailModal(null);
        setShowInvoiceModal(null);
        setShowWarrantyModal(null);
        setShowEditModal(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const closeModal = () => {
    setShowModal(false);
    setFormData(emptyForm);
    setBatchItems([]);
    setPosCustSearchTerm('');
    setShowPosCustDropdown(false);
    setSubChannelSearchTerm('');
    setShowSubChannelDropdown(false);
    setProductSearchTerm('');
    setShowProductDropdown(false);
    setSelectedAddProduct('');
  };

  const getCustomerTypeFromState = (fData) => {
    if (fData.customerId === 'NEW') return fData.newCustomerType || '';
    const c = customers.find(cust => String(cust.id) === String(fData.customerId));
    return c?.type || 'Le';
  };

  const getTierPriceForProduct = (prod, custType) => {
    if (!prod) return 150000;
    const sellP = Number(prod.default_sell || prod.defaultSell || 150000);
    const ctvP = Number(prod.price_ctv || prod.priceCtv || 0);
    const siP = Number(prod.price_si || prod.priceSi || 0);

    if (custType === 'CTV') return ctvP > 0 ? ctvP : sellP;
    if (custType === 'Si') return siP > 0 ? siP : (ctvP > 0 ? ctvP : sellP);
    return sellP;
  };

  // [Task 1] Batch Item Helper Functions
  const handleAddProductToBatch = (prodName) => {
    if (!prodName) return;
    const prod = products.find(p => p.name === prodName);
    if (!prod) return;

    const dur = prod.default_duration_days || prod.defaultDurationDays || 30;
    const custType = getCustomerTypeFromState(formData);
    const sellP = getTierPriceForProduct(prod, custType);
    const costP = Number(prod.default_cost || prod.defaultCost || 50000);
    const expDate = new Date(Date.now() + dur * 86400000).toISOString().split('T')[0];

    const availTeam = teams.find(t => {
      if (t.status === 'FAULTY_DIE') return false;
      const tCat = (t.category || '').toLowerCase().trim();
      const tName = (t.name || '').toLowerCase().trim();
      const pCat = (prod.category || '').toLowerCase().trim();
      const pN = (prodName || '').toLowerCase().trim();
      return (tCat && pCat && (tCat.includes(pCat) || pCat.includes(tCat))) ||
             (tName && pN && (tName.includes(pN) || pN.includes(tName)));
    });

    const newItem = {
      id: 'batch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      productName: prod.name,
      quantity: 1,
      sellPrice: sellP,
      costPrice: costP,
      teamId: availTeam ? String(availTeam.id) : '',
      supplierId: prod.supplier_id || prod.supplierId || '',
      infor: '',
      durationDays: dur,
      expireDate: expDate,
      isEvergreen: (prod.product_type || prod.productType) === 'EVERGREEN',
      isTeamSlot: (prod.product_type || prod.productType) === 'TEAM_SLOT'
    };

    setBatchItems(prev => [...prev, newItem]);
    setSelectedAddProduct('');
  };

  const handleUpdateBatchItem = (itemId, field, value) => {
    setBatchItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const updated = { ...item };
      if (field === 'quantity') {
        const qty = Math.max(1, parseInt(value) || 1);
        updated.quantity = qty;
      } else if (field === 'durationDays') {
        const days = parseInt(value) || 30;
        updated.durationDays = days;
        updated.expireDate = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
      } else {
        updated[field] = value;
      }
      return updated;
    }));
  };

  const handleRemoveBatchItem = (itemId) => {
    setBatchItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleCustomerChange = (cId) => {
    setFormData(f => {
      const nextCustType = cId === 'NEW' ? (f.newCustomerType || '') : (customers.find(c => String(c.id) === String(cId))?.type || 'Le');
      const prod = products.find(p => p.name === f.productName);
      const newSellPrice = prod ? getTierPriceForProduct(prod, nextCustType) : f.sellPrice;

      // Update tier prices for all batch items
      setBatchItems(prev => prev.map(item => {
        const itemProd = products.find(p => p.name === item.productName);
        if (itemProd) {
          return { ...item, sellPrice: getTierPriceForProduct(itemProd, nextCustType) };
        }
        return item;
      }));

      return {
        ...f,
        customerId: cId,
        sellPrice: newSellPrice
      };
    });
  };

  const handleNewCustomerTypeChange = (newType) => {
    setFormData(f => {
      const prod = products.find(p => p.name === f.productName);
      const newSellPrice = prod ? getTierPriceForProduct(prod, newType) : f.sellPrice;

      setBatchItems(prev => prev.map(item => {
        const itemProd = products.find(p => p.name === item.productName);
        if (itemProd) {
          return { ...item, sellPrice: getTierPriceForProduct(itemProd, newType) };
        }
        return item;
      }));

      return {
        ...f,
        newCustomerType: newType,
        sellPrice: newSellPrice
      };
    });
  };

  const handleProductSelect = async (pName) => {
    const prod = products.find(p => p.name === pName);
    if (prod) {
      const dur = prod.default_duration_days || prod.defaultDurationDays || 30;
      const custType = getCustomerTypeFromState(formData);
      const sellP = getTierPriceForProduct(prod, custType);
      const costP = prod.default_cost || prod.defaultCost || 50000;
      const exp = new Date(Date.now() + dur * 86400000).toISOString().split('T')[0];

      // Check available inventory key (FIFO)
      let invItem = null;
      let invCount = 0;
      try {
        invItem = await InventoryService.pickAvailableItem(shopId, pName);
        invCount = await InventoryService.getAvailableCount(shopId, pName);
      } catch (e) {}

      const availTeam = teams.find(t => {
        if (t.status === 'FAULTY_DIE') return false;

        const tCat = (t.category || '').toLowerCase().trim();
        const tName = (t.name || '').toLowerCase().trim();
        const pCat = (prod.category || '').toLowerCase().trim();
        const pN = (pName || '').toLowerCase().trim();

        let isMatch = false;
        if (tCat && pCat && tCat === pCat) isMatch = true;
        else if (tCat && pN && (pN.includes(tCat) || tCat.includes(pN))) isMatch = true;
        else if (pCat && tName && (tName.includes(pCat) || pCat.includes(tName))) isMatch = true;
        else if (tName && pN && (tName.includes(pN) || pN.includes(tName))) isMatch = true;

        if (!isMatch) return false;

        const used = orders.filter(o => String(o.team_id || o.teamId) === String(t.id)).length;
        return (t.max_slots || t.maxSlots || 1) - used > 0;
      });

      // Check lowest supplier price today
      checkLowestPriceForProduct(pName);

      setFormData(f => ({
        ...f,
        productName: pName,
        durationDays: dur,
        sellPrice: sellP,
        costPrice: invItem ? (invItem.cost_price || costP) : costP,
        expireDate: exp,
        inventoryItemId: invItem ? invItem.id : null,
        inventoryHint: { count: invCount, item: invItem },
        teamId: (!invItem && availTeam) ? availTeam.id : f.teamId,
        infor: invItem ? invItem.item_code : (availTeam ? (availTeam.infor || f.infor) : f.infor),
        supplierId: invItem ? (invItem.supplier_id || f.supplierId) : (availTeam ? (availTeam.supplier_id || availTeam.supplierId || f.supplierId) : f.supplierId)
      }));
    }
  };

  const handleTeamSelect = (tId) => {
    const team = teams.find(t => String(t.id) === String(tId));
    if (team) {
      setFormData(f => ({
        ...f,
        teamId: tId,
        infor: team.infor || f.infor,
        supplierId: team.supplier_id || team.supplierId || f.supplierId
      }));
    } else {
      setFormData(f => ({ ...f, teamId: tId }));
    }
  };

  const handleDurationChange = (dur) => {
    const days = parseInt(dur) || 30;
    const pDate = formData.purchaseDate ? new Date(formData.purchaseDate) : new Date();
    const exp = new Date(pDate.getTime() + days * 86400000).toISOString().split('T')[0];
    setFormData(f => ({ ...f, durationDays: days, expireDate: exp }));
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();

    // Determine items to process: use batchItems if non-empty, or auto-convert formData.productName
    let itemsToProcess = [...batchItems];
    if (itemsToProcess.length === 0 && formData.productName) {
      const prod = products.find(p => p.name === formData.productName);
      const custType = getCustomerTypeFromState(formData);
      itemsToProcess.push({
        id: 'batch_auto_' + Date.now(),
        productName: formData.productName,
        quantity: 1,
        sellPrice: Number(formData.sellPrice || 0),
        costPrice: Number(formData.costPrice || 0),
        teamId: formData.teamId,
        supplierId: formData.supplierId,
        infor: formData.infor || '',
        durationDays: parseInt(formData.durationDays) || 30,
        expireDate: formData.expireDate || nextMonthStr,
        isEvergreen: isEvergreen
      });
    }

    if (!formData.customerId) {
      return toast.error('Vui lòng chọn hoặc nhập thông tin Khách hàng!');
    }
    if (!formData.source) {
      return toast.error('Vui lòng chọn Nguồn / Kênh bán hàng main!');
    }
    if (!formData.subChannelName || !formData.subChannelName.trim()) {
      return toast.error('Vui lòng chọn hoặc nhập Kênh bán phụ (Trang/Zalo/Đại lý)!');
    }
    if (itemsToProcess.length === 0) {
      return toast.error('Vui lòng chọn ít nhất 1 sản phẩm vào Giỏ hàng POS!');
    }
    if (!formData.status) {
      return toast.error('Vui lòng chọn Trạng thái thanh toán (Đã thanh toán hoặc Nợ)!');
    }

    let finalCustId = formData.customerId;
    let finalCustName = '';
    let finalCustPhone = '';

    try {
      if (formData.customerId === 'NEW') {
        if (!formData.newCustomerName.trim()) return toast.error('Vui lòng nhập tên khách hàng mới!');
        if (!formData.newCustomerType) return toast.error('Vui lòng chọn Phân loại khách hàng (Khách Lẻ / CTV / Khách Sỉ)!');
        const createdCust = await CustomerService.create(shopId, {
          name: formData.newCustomerName.trim(),
          phone: formData.newCustomerPhone.trim() || '',
          email: (formData.newCustomerEmail || '').trim(),
          type: formData.newCustomerType || 'Le',
          source: formData.source || 'Facebook Page',
          sub_channel: (formData.subChannel || formData.newCustomerSubChannel || '').trim(),
          notes: (formData.newCustomerNotes || '').trim(),
          debt: 0
        });
        finalCustId = createdCust.id;
        finalCustName = createdCust.name;
        finalCustPhone = createdCust.phone;
        setCustomers(prev => [createdCust, ...prev]);
      } else {
        const cust = customers.find(c => String(c.id) === String(formData.customerId));
        if (!cust) return toast.error('Vui lòng chọn khách hàng!');
        finalCustId = cust.id;
        finalCustName = cust.name;
        finalCustPhone = cust.phone || '';
      }

      let channelVal = formData.source;
      if (formData.subChannelName) {
        channelVal = `${formData.source} - ${formData.subChannelName}`;
      }

      const safeParseId = (val) => {
        if (!val) return null;
        const num = Number(val);
        return isNaN(num) ? val : num;
      };

      // Generate unique Batch Reference for this checkout session
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randPart = Math.random().toString(36).substr(2, 5).toUpperCase();
      const batchRef = `BATCH-${datePart}-${randPart}`;

      // Expand batch items into individual order payloads
      const expandedPayloads = [];
      for (const item of itemsToProcess) {
        const qty = Math.max(1, parseInt(item.quantity) || 1);
        const supp = suppliers.find(s => String(s.id) === String(item.supplierId));
        const suppName = supp ? supp.name : '';

        // Split multi-line infor string
        const inforLines = (item.infor || '')
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean);

        for (let i = 0; i < qty; i++) {
          let singleInfor = '';
          if (inforLines.length > i) {
            singleInfor = inforLines[i];
          } else if (inforLines.length === 1) {
            singleInfor = inforLines[0];
          } else {
            singleInfor = (item.infor || '').trim();
          }

          expandedPayloads.push({
            customer_id: finalCustId,
            customer_name: finalCustName,
            phone: finalCustPhone,
            supplier_id: safeParseId(item.supplierId),
            supplier_name: suppName,
            team_id: safeParseId(item.teamId),
            product_name: item.productName,
            infor: singleInfor,
            cost_price: parseFloat(item.costPrice) || 0,
            sell_price: parseFloat(item.sellPrice) || 0,
            status: formData.status || 'Đã thanh toán',
            purchase_date: formData.purchaseDate || todayStr,
            expire_date: item.isEvergreen ? '---' : (item.expireDate || nextMonthStr),
            duration_days: parseInt(item.durationDays) || 30,
            supplier_paid: formData.status === 'Đã thanh toán',
            warranty_count: 0,
            source: formData.source,
            channel: channelVal,
            batch_ref: batchRef
          });
        }
      }

      // Create all orders in parallel
      const createdOrders = await Promise.all(
        expandedPayloads.map(payload => OrderService.create(shopId, payload))
      );

      // Calculate total created order value
      const totalCreatedValue = expandedPayloads.reduce((sum, p) => sum + Number(p.sell_price || 0), 0);

      // Bug #3 Fix: Sync customer.debt field ONCE when Nợ orders are created
      if (formData.status === 'Nợ' && finalCustId && finalCustId !== 'NEW') {
        try {
          const custObj = customers.find(c => String(c.id) === String(finalCustId));
          const currentDebt = Number(custObj?.debt || 0);
          const newDebt = currentDebt + totalCreatedValue;
          await CustomerService.update(finalCustId, { debt: newDebt });
          setCustomers(prev => prev.map(c =>
            String(c.id) === String(finalCustId) ? { ...c, debt: newDebt } : c
          ));
        } catch (debtErr) {
          console.error('Lỗi cập nhật công nợ khách hàng:', debtErr);
        }
      }

      setOrders(prev => [...createdOrders, ...prev]);
      closeModal();
      toast.success(`🎉 Đã tạo thành công ${createdOrders.length} đơn hàng POS cho ${finalCustName}!`);
    } catch (err) {
      console.error('Order creation error:', err);
      toast.error('Lỗi khi tạo đơn hàng: ' + (err.message || 'Vui lòng thử lại.'));
    }
  };

  const handleDeleteOrder = async () => {
    const id = confirmDeleteId;
    try {
      await OrderService.remove(id);
      setOrders(prev => prev.filter(o => String(o.id) !== String(id)));
      setConfirmDeleteId(null);
      toast.success('Đã xóa đơn hàng thành công!');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xóa đơn hàng. Vui lòng thử lại.');
    }
  };

  const handleProcessWarranty = async (e) => {
    e.preventDefault();
    if (!warrantyReason.trim()) return toast.error('Vui lòng nhập lý do bảo hành!');

    const order = showWarrantyModal;
    const newWarrantyCount = (order.warranty_count || order.warrantyCount || 0) + 1;

    const safeParseId = (val) => {
      if (!val) return null;
      const num = Number(val);
      return isNaN(num) ? val : num;
    };

    try {
      await supabase.from('warranty_logs').insert({
        shop_id: shopId,
        order_id: order.id,
        reason: warrantyReason.trim(),
        new_infor: warrantyNewInfor.trim() || order.infor,
        new_team_id: warrantyNewTeamId ? safeParseId(warrantyNewTeamId) : order.team_id,
        note: 'Bảo hành đổi tài khoản'
      });

      const updatePayload = {
        warranty_count: newWarrantyCount,
        infor: warrantyNewInfor.trim() || order.infor
      };
      if (warrantyNewTeamId) {
        updatePayload.team_id = safeParseId(warrantyNewTeamId);
      }

      const updatedOrder = await OrderService.update(order.id, updatePayload);
      setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));

      setShowWarrantyModal(null);
      setWarrantyReason('');
      setWarrantyNewInfor('');
      setWarrantyNewTeamId('');
      toast.success(`Đã ghi nhận bảo hành thành công (Lần ${newWarrantyCount})!`);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xử lý bảo hành. Vui lòng thử lại.');
    }
  };

  const handleCopyInfor = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(`infor-${id}`);
    toast.success('Đã copy thông tin kích hoạt!');
    setTimeout(() => setCopiedId(''), 2000);
  };

  const toggleRevealInfor = (id) => {
    setRevealedInfors(prev => ({ ...prev, [id]: !prev[id] }));
  };

        const handleCopyZaloText = (order) => {
    const vqr = vietqr || { bank_id: 'MB', account_no: '0901234567', account_name: 'SHOP DROPSHIP CRM', memo_prefix: 'DON' };
    const bankId = vqr.bank_id || vqr.bankId || 'MB';
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
    toast.success('Đã copy văn bản thông tin đơn hàng! Dán (Ctrl+V) sang Zalo ngay.');
  };

  const handleCopyQRImageOnly = async (order, qrUrl) => {
    if (!qrUrl) return toast.error('Không có hình ảnh VietQR!');
    try {
      toast.info('Đang tạo ảnh QR kèm thông tin chuyển khoản...');
      
      const vqr = vietqr || { bank_id: 'MB', account_no: '0901234567', account_name: 'SHOP DROPSHIP CRM', memo_prefix: 'DON' };
      const bankId = vqr.bank_id || vqr.bankId || 'MB';
      const accountNo = vqr.account_no || vqr.accountNo || '0901234567';
      const accountName = vqr.account_name || vqr.accountName || 'SHOP DROPSHIP CRM';
      const memo = `${vqr.memo_prefix || vqr.memoPrefix || 'DON'} ${order ? order.id : ''}`;
      const amount = order ? ((order.sell_price || order.sellPrice || 0).toLocaleString() + ' VNĐ') : '';

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 340;
        const ctx = canvas.getContext('2d');

        // Card Background (White with subtle shadow/border)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Header Top Accent Bar
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(0, 0, canvas.width, 8);

        // Draw VietQR Image on left
        const qrWidth = 290;
        const qrHeight = 310;
        ctx.drawImage(img, 15, 15, qrWidth, qrHeight);

        // Vertical Separator Line
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(320, 25);
        ctx.lineTo(320, 315);
        ctx.stroke();

        // Right Text Section
        let startX = 340;
        let startY = 45;

        // Title
        ctx.font = 'bold 16px "Inter", sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText('THÔNG TIN CHUYỂN KHOẢN', startX, startY);

        startY += 25;
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + 180, startY);
        ctx.stroke();

        startY += 30;

        // Bank Name
        ctx.font = '14px "Inter", sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('🏦 Ngân hàng:', startX, startY);
        ctx.font = 'bold 15px "Inter", sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(bankId, startX + 115, startY);

        // Account Number
        startY += 32;
        ctx.font = '14px "Inter", sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('🔢 Số tài khoản:', startX, startY);
        ctx.font = 'bold 16px "Inter", sans-serif';
        ctx.fillStyle = '#10b981';
        ctx.fillText(accountNo, startX + 120, startY);

        // Account Owner
        startY += 32;
        ctx.font = '14px "Inter", sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('👤 Chủ TK:', startX, startY);
        ctx.font = 'bold 14px "Inter", sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(accountName, startX + 85, startY);

        // Amount
        if (amount) {
          startY += 32;
          ctx.font = '14px "Inter", sans-serif';
          ctx.fillStyle = '#475569';
          ctx.fillText('💰 Số tiền:', startX, startY);
          ctx.font = 'bold 16px "Inter", sans-serif';
          ctx.fillStyle = '#ef4444';
          ctx.fillText(amount, startX + 85, startY);
        }

        // Transfer Memo
        startY += 34;
        ctx.font = '14px "Inter", sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('📝 Nội dung CK:', startX, startY);
        ctx.font = 'bold 17px "Inter", sans-serif';
        ctx.fillStyle = '#ef4444';
        ctx.fillText(memo, startX + 125, startY);

        // Bottom Footer note
        startY += 38;
        ctx.font = 'italic 11.5px "Inter", sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Vui lòng giữ nguyên nội dung CK để duyệt tự động 24/7', startX, startY);

        canvas.toBlob(async (pngBlob) => {
          if (pngBlob) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': pngBlob })
              ]);
              toast.success('Đã copy THẺ ẢNH QR KÈM THÔNG TIN STK! Dán (Ctrl+V) sang Zalo ngay.');
            } catch (clipErr) {
              console.error(clipErr);
              toast.error('Trình duyệt chặn tự động copy ảnh. Vui lòng nhấp chuột phải vào ảnh QR chọn Sao chép hình ảnh!');
            }
          }
        }, 'image/png');
      };

      img.onerror = () => {
        toast.error('Lỗi khi tải ảnh VietQR!');
      };
      img.src = qrUrl;
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi ghép ảnh QR.');
    }
  };

  const handleCopyRichTextAndQR = async (order, qrUrl) => {
    try {
      toast.info('Đang copy Văn bản + Hình VietQR...');
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64DataUrl = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });

      const vqr = vietqr || { bank_id: 'MB', account_no: '0901234567', account_name: 'SHOP DROPSHIP CRM', memo_prefix: 'DON' };
      const memo = `${vqr.memo_prefix || vqr.memoPrefix || 'DON'} ${order.id}`;

      const custName = order.customer_name || order.customerName;
      const prodName = order.product_name || order.productName;
      const sellP = order.sell_price || order.sellPrice || 0;
      const expDate = order.expire_date || order.expireDate || '---';
      const bName = vqr.bank_id || vqr.bankId || 'MB';
      const accNo = vqr.account_no || vqr.accountNo || '';
      const accName = vqr.account_name || vqr.accountName || '';

      const htmlString = `
        <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000; line-height: 1.5;">
          <p style="font-size: 16px; font-weight: bold; color: #6366f1;">🎉 HOÀN TẤT ĐƠN HÀNG #${order.id}</p>
          <p>👤 <strong>Khách hàng:</strong> ${custName} ${order.phone ? '(' + order.phone + ')' : ''}</p>
          <p>📦 <strong>Sản phẩm:</strong> ${prodName}</p>
          <p>🔑 <strong>Infor:</strong> <code>${order.infor || 'Đã kích hoạt'}</code></p>
          <p>⏳ <strong>Hạn dùng:</strong> ${expDate}</p>
          <p>💰 <strong>Giá thanh toán:</strong> <strong style="color: #10b981; font-size: 16px;">${sellP.toLocaleString()}đ</strong></p>
          <br/>
          <p style="font-weight: bold; color: #000;">💳 THÔNG TIN CHUYỂN KHOẢN VIETQR:</p>
          <p>🔹 Ngân hàng: <strong>${bName}</strong></p>
          <p>🔹 Số tài khoản: <strong style="color: #10b981; font-size: 15px;">${accNo}</strong></p>
          <p>🔹 Chủ tài khoản: <strong>${accName}</strong></p>
          <p>🔹 Nội dung CK: <strong style="color: #2563eb; font-size: 15px;">${memo}</strong></p>
          <br/>
          <p><img src="${base64DataUrl}" width="260" alt="VietQR Code" style="border-radius: 8px; border: 1px solid #ccc;" /></p>
          <p style="color: #64748b; font-style: italic;">Cảm ơn bạn đã ủng hộ shop! ❤️🎁</p>
        </div>
      `;

      const plainText = `🎉 HOÀN TẤT ĐƠN HÀNG #${order.id}\n👤 Khách hàng: ${custName}\n📦 Sản phẩm: ${prodName}\n🔑 Infor: ${order.infor || 'Đã kích hoạt'}\n⏳ Hạn dùng: ${expDate}\n💰 Giá thanh toán: ${sellP.toLocaleString()}đ\n\n💳 THÔNG TIN CHUYỂN KHOẢN VIETQR:\n🔹 Ngân hàng: ${bName}\n🔹 Số tài khoản: ${accNo}\n🔹 Chủ tài khoản: ${accName}\n🔹 Nội dung CK: ${memo}\n🔹 Link QR: ${qrUrl}\n\nCảm ơn bạn đã ủng hộ shop! ❤️🎁`;

      const htmlBlob = new Blob([htmlString], { type: 'text/html' });
      const textBlob = new Blob([plainText], { type: 'text/plain' });

      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob
        })
      ]);

      toast.success('Đã copy cả VĂN BẢN + ẢNH QR! Mở Zalo dán Ctrl+V ngay!');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi copy ảnh QR. Hãy chụp màn hình hoặc tải ảnh về.');
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const filteredOrders = orders.filter(o => {
    const d = o.purchase_date || o.purchaseDate || o.created_at;
    const ds = d ? String(d).split('T')[0] : '';
    if (dateRange.startDate && ds < dateRange.startDate) return false;
    if (dateRange.endDate && ds > dateRange.endDate) return false;

    const term = (searchTerm || '').trim();
    const cleanSearch = term.replace(/^#/, '').toLowerCase();
    const rawSearch = term.toLowerCase();

    const custName = (o.customer_name || o.customerName || '').toLowerCase();
    const prodName = (o.product_name || o.productName || '').toLowerCase();
    const phone = (o.phone || '').toLowerCase();
    const infor = (o.infor || '').toLowerCase();
    const orderIdStr = String(o.id || '').toLowerCase();
    const hashOrderId = `#${orderIdStr}`;

    const matchesSearch = !term ||
                          custName.includes(rawSearch) ||
                          custName.includes(cleanSearch) ||
                          phone.includes(cleanSearch) ||
                          prodName.includes(rawSearch) ||
                          infor.includes(rawSearch) ||
                          orderIdStr.includes(cleanSearch) ||
                          hashOrderId.includes(rawSearch);

    const matchesStatus = filterStatus === 'ALL' || o.status === filterStatus;
    const matchesCategory = filterCategory === 'ALL' || prodName.toLowerCase().includes(filterCategory.toLowerCase());
    const matchesTeam = filterTeamId === 'ALL' || String(o.team_id || o.teamId) === String(filterTeamId);
    
    const custObj = customers.find(c => String(c.id) === String(o.customer_id || o.customerId));
    const custType = custObj?.type || 'Le';
    const matchesCustType = filterCustomerType === 'ALL' || custType === filterCustomerType;

    const matchesSupplier = filterSupplierId === 'ALL' || String(o.supplier_id || o.supplierId) === String(filterSupplierId);

    return matchesSearch && matchesStatus && matchesCategory && matchesTeam && matchesCustType && matchesSupplier;
  });

  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE) || 1;
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleConvertOldOrders = () => {
    toast.info('Đang chuẩn hóa mã đơn & mã khách hàng...');
    try {
      const ordRes = convertAllOldOrderIds();
      const custRes = convertAllOldCustomerIds();
      toast.success(`🎉 Đã chuẩn hóa ${ordRes.totalConverted} đơn hàng & ${custRes.totalConverted} khách hàng! Trang sẽ tự reload...`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi chuyển đổi mã. Xem console để biết chi tiết.');
    }
  };

  const handleClearAllData = () => {
    if (window.confirm('🚨 BẠN CÓ CHẮC CHẮN MUỐN XÓA TRẮNG 100% DỮ LIỆU?\n\nThao tác này sẽ xóa sạch tất cả Đơn hàng, Khách hàng, Kho Teams và Sổ quỹ để bắt đầu sử dụng phần mềm mới tinh.')) {
      clearAllSystemData();
      toast.success('🎉 Đã xóa sạch 100% dữ liệu! Hệ thống đã hoàn toàn mới tinh.');
      setTimeout(() => window.location.reload(), 800);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Compact Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>Quản Lý Đơn Hàng & POS Bán Hàng 360°</h1>

        <button className="glass-button" onClick={() => setShowModal(true)} style={{ padding: '6px 14px', fontSize: '13px' }}>
          <Plus size={16} /> Tạo Đơn POS Mới
        </button>
      </div>

      {/* Compact Date Filter Bar */}
      <DateFilterBar onFilterChange={setDateRange} label="Kỳ Đơn Hàng:" />

      {/* Compact Filters Bar */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '240px', flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px 12px' }}>
          <Search size={15} color="#475569" />
          <input
            type="text"
            placeholder="Tìm tên KH, SĐT, Tên sản phẩm hoặc Mã đơn..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', width: '100%', fontSize: '12.5px' }}
          />
          {searchTerm && <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={14} /></button>}
        </div>

        <select
          className="glass-input" style={{ width: 'auto', padding: '6px 10px', fontSize: '12.5px', borderRadius: '8px' }}
          value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="Đã thanh toán">🟢 Đã thanh toán</option>
          <option value="Nợ">🔴 Đơn còn nợ</option>
        </select>

        <select
          className="glass-input" style={{ width: 'auto', padding: '6px 10px', fontSize: '12.5px', borderRadius: '8px', border: filterTeamId !== 'ALL' ? '1.5px solid #38bdf8' : '1px solid rgba(255,255,255,0.12)', color: filterTeamId !== 'ALL' ? '#38bdf8' : '#fff', fontWeight: filterTeamId !== 'ALL' ? '700' : '400' }}
          value={filterTeamId} onChange={e => { setFilterTeamId(e.target.value); setCurrentPage(1); }}
        >
          <option value="ALL">📦 Tất cả kho team</option>
          {teams.map(t => (
            <option key={t.id} value={t.id}>Team #{t.id} — {t.name}</option>
          ))}
        </select>

        <select
          className="glass-input" style={{ width: 'auto', padding: '6px 10px', fontSize: '12.5px', borderRadius: '8px', border: filterCustomerType !== 'ALL' ? '1.5px solid #a855f7' : '1px solid rgba(255,255,255,0.12)', color: filterCustomerType !== 'ALL' ? '#c084fc' : '#fff', fontWeight: filterCustomerType !== 'ALL' ? '700' : '400' }}
          value={filterCustomerType} onChange={e => { setFilterCustomerType(e.target.value); setCurrentPage(1); }}
        >
          <option value="ALL">👤 Tất cả loại khách</option>
          <option value="Le">🔵 Khách Lẻ</option>
          <option value="CTV">🟡 CTV</option>
          <option value="Si">🟣 Khách Sỉ</option>
        </select>

        <select
          className="glass-input" style={{ width: 'auto', padding: '6px 10px', fontSize: '12.5px', borderRadius: '8px', border: filterSupplierId !== 'ALL' ? '1.5px solid #10b981' : '1px solid rgba(255,255,255,0.12)', color: filterSupplierId !== 'ALL' ? '#10b981' : '#fff', fontWeight: filterSupplierId !== 'ALL' ? '700' : '400' }}
          value={filterSupplierId} onChange={e => { setFilterSupplierId(e.target.value); setCurrentPage(1); }}
        >
          <option value="ALL">🏭 Tất cả NCC</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>🏭 {s.name}</option>
          ))}
        </select>
      </div>

      {/* Orders Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Đang tải danh sách đơn hàng từ đám mây...</div>
        ) : paginatedOrders.length === 0 ? (
          <div className="empty-state">
            <Users size={40} />
            <h3>Không tìm thấy đơn hàng nào</h3>
            <p>Thử tìm với từ khóa khác hoặc tạo đơn hàng mới.</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto', borderRadius: '8px' }}>
            <table style={{ width: '100%', minWidth: '1080px', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Mã Đơn & Khách Hàng', 'Sản Phẩm & Tài Khoản', 'Hạn Dùng & Kênh Bán', 'Tài Chính & Trạng Thái', 'Thao Tác 360°'].map(h => (
                    <th key={h} style={{ padding: '10px 10px', textAlign: 'left', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map(order => {
                  const custName = order.customer_name || order.customerName;
                  const prodName = order.product_name || order.productName;
                  const sellP = Number(order.sell_price || order.sellPrice || 0);
                  const costP = Number(order.cost_price || order.costPrice || 0);
                  const profit = sellP - costP;
                  const profitMargin = sellP > 0 ? Math.round((profit / sellP) * 100) : 0;
                  const expDate = order.expire_date || order.expireDate || '---';
                  const isRevealed = revealedInfors[order.id];
                  const isCopied = copiedId === `infor-${order.id}`;
                  const wCount = order.warranty_count || order.warrantyCount || 0;
                  const srcCfg = SOURCE_CONFIG[order.source] || SOURCE_CONFIG['Facebook Page'];
                  const vqr = vietqr || { bank_id: 'MB', account_no: '0901234567', account_name: 'SHOP DROPSHIP CRM', memo_prefix: 'DON' };
                  const memo = `${vqr.memo_prefix || vqr.memoPrefix || 'DON'} ${order.id}`;
                  const qrUrl = getVietQRUrl ? getVietQRUrl(vqr.bank_id || vqr.bankId, vqr.account_no || vqr.accountNo, vqr.account_name || vqr.accountName, sellP, memo, vqr.template) : '';

                  // Customer Tier look up
                  const custObj = customers.find(c => String(c.id) === String(order.customer_id || order.customerId));
                  const custType = custObj?.type || 'Le';
                  const tierCfg = custType === 'Si'
                    ? { label: 'Sỉ', bg: 'rgba(168,85,247,0.12)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.25)' }
                    : custType === 'CTV'
                    ? { label: 'CTV', bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }
                    : { label: 'Lẻ', bg: 'rgba(6,182,212,0.12)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.25)' };

                  // Expiry Countdown Calculation
                  const linkedProd = products.find(p => p.name === prodName);
                  const isEvergreen = (linkedProd?.product_type || linkedProd?.productType) === 'EVERGREEN';

                  let daysLeft = null;
                  if (!isEvergreen && expDate && expDate !== '---') {
                    const expMs = new Date(expDate).getTime();
                    const nowMs = new Date().getTime();
                    daysLeft = Math.ceil((expMs - nowMs) / (1000 * 60 * 60 * 24));
                  }

                  const createdStr = order.created_at
                    ? new Date(order.created_at).toLocaleDateString('vi-VN')
                    : '---';

                  const linkedSupp = suppliers.find(s => String(s.id) === String(order.supplier_id || order.supplierId));
                  const suppDisplayName = linkedSupp ? linkedSupp.name : (order.supplier_name || order.supplierName || null);

                  const linkedTeam = teams.find(t => String(t.id) === String(order.team_id || order.teamId));
                  const rawTeamName = linkedTeam ? linkedTeam.name : (order.team_name || order.teamName || (order.team_id ? `Team #${order.team_id}` : null));
                  let cleanTeamName = rawTeamName ? String(rawTeamName).trim() : null;
                  if (cleanTeamName && cleanTeamName.includes('|')) cleanTeamName = cleanTeamName.split('|')[0].trim();

                  const isBatch = Boolean(order.batch_ref || order.batchRef);

                  return (
                    <tr
                      key={order.id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        borderLeft: isBatch ? '3px solid #8b5cf6' : '3px solid transparent',
                        background: isBatch ? 'rgba(139,92,246,0.03)' : 'transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* CỘT 1: ĐƠN & KHÁCH HÀNG */}
                      <td style={{ padding: '8px 10px', minWidth: '160px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong
                            onClick={() => {
                              navigator.clipboard.writeText(`#${order.id}`);
                              setCopiedId(`order-${order.id}`);
                              toast.success(`✅ Đã copy mã đơn #${order.id}!`);
                              setTimeout(() => setCopiedId(''), 1500);
                            }}
                            title="Click 1-click copy mã đơn"
                            style={{
                              color: copiedId === `order-${order.id}` ? '#10b981' : '#fff',
                              fontSize: '12.5px',
                              fontFamily: 'monospace',
                              cursor: 'pointer'
                            }}
                          >
                            #{order.id}
                          </strong>
                          <span style={{ fontSize: '10.5px', color: '#64748b' }}>{createdStr}</span>
                          {isBatch && (
                            <span title={`Đơn thuộc Batch ${order.batch_ref || order.batchRef}`} style={{ fontSize: '9.5px', background: 'rgba(139,92,246,0.2)', color: '#c084fc', padding: '1px 5px', borderRadius: '4px', border: '1px solid rgba(139,92,246,0.3)', fontWeight: '700' }}>
                              📦 Batch
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                          <strong style={{ fontSize: '13px', color: '#fff', whiteSpace: 'nowrap' }}>{custName}</strong>
                          {order.phone && (
                            <span
                              onClick={() => {
                                navigator.clipboard.writeText(order.phone);
                                toast.success(`✅ Đã copy SĐT ${order.phone}!`);
                              }}
                              title="Click copy SĐT"
                              style={{ fontSize: '10.5px', color: '#94a3b8', cursor: 'pointer' }}
                            >
                              ({order.phone})
                            </span>
                          )}
                          <span style={{ fontSize: '9px', padding: '0px 5px', borderRadius: '3px', background: tierCfg.bg, color: tierCfg.color, border: tierCfg.border, fontWeight: '700' }}>
                            {tierCfg.label}
                          </span>
                        </div>
                      </td>

                      {/* CỘT 2: SẢN PHẨM & TÀI KHOẢN */}
                      <td style={{ padding: '8px 10px', minWidth: '250px', maxWidth: '320px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong style={{ color: '#818cf8', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {prodName}
                          </strong>
                        </div>

                        {/* Badges container for Supplier & Team side-by-side */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                          {suppDisplayName && (
                            <span style={{ fontSize: '10px', color: '#38bdf8', background: 'rgba(56,189,248,0.12)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(56,189,248,0.25)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                              🏬 {suppDisplayName}
                            </span>
                          )}
                          {cleanTeamName && (
                            <span style={{ fontSize: '10px', color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(16,185,129,0.25)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                              🛡️ {cleanTeamName}
                            </span>
                          )}
                        </div>

                        {/* Account credentials line */}
                        {order.infor ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                            <span style={{ fontSize: '11px', color: isRevealed ? '#e2e8f0' : '#64748b', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                              🔑 {isRevealed ? order.infor : '••••••••••••••••'}
                            </span>
                            <button
                              onClick={() => toggleRevealInfor(order.id)}
                              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
                              title={isRevealed ? "Ẩn thông tin" : "Hiện thông tin"}
                            >
                              {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                            <button
                              onClick={() => handleCopyInfor(order.infor, order.id)}
                              style={{ background: 'none', border: 'none', color: isCopied ? '#10b981' : '#64748b', cursor: 'pointer', padding: 0 }}
                              title="Copy Acc / Link"
                            >
                              {isCopied ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                          </div>
                        ) : (
                          <div style={{ fontSize: '10.5px', color: '#475569', fontStyle: 'italic', marginTop: '2px' }}>Chưa bàn giao Acc/Key</div>
                        )}
                      </td>

                      {/* CỘT 3: HẠN DÙNG & KÊNH BÁN */}
                      <td style={{ padding: '8px 10px', minWidth: '150px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#e2e8f0' }}>{expDate}</span>
                          {isEvergreen ? (
                            <span style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: '4px', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', fontWeight: '700' }}>
                              ⚪ Vĩnh viễn
                            </span>
                          ) : daysLeft !== null && (
                            <span style={{
                              fontSize: '9.5px', padding: '1px 5px', borderRadius: '4px', fontWeight: '700',
                              background: daysLeft <= 0 ? 'rgba(239,68,68,0.2)' : daysLeft <= 7 ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.15)',
                              color: daysLeft <= 0 ? '#f87171' : daysLeft <= 7 ? '#fbbf24' : '#34d399',
                              border: daysLeft <= 0 ? '1px solid rgba(239,68,68,0.3)' : daysLeft <= 7 ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(16,185,129,0.3)'
                            }}>
                              {daysLeft <= 0 ? '🔴 Hết hạn' : `Còn ${daysLeft}d`}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                          {renderChannelBrandIcon(order.source, order.channel)}
                          <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                            {order.channel || order.source || 'Facebook Page'}
                          </span>
                        </div>
                      </td>

                      {/* CỘT 4: TÀI CHÍNH & TRẠNG THÁI */}
                      <td style={{ padding: '8px 10px', minWidth: '160px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong style={{ fontSize: '13.5px', color: '#10b981', fontWeight: '800' }}>
                            {sellP.toLocaleString()}đ
                          </strong>
                          {profit !== 0 && (
                            <span style={{ fontSize: '10.5px', color: profit >= 0 ? '#34d399' : '#f87171' }}>
                              ({profit >= 0 ? '+' : ''}{profit.toLocaleString()}đ)
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                          {/* Payment status badge */}
                          <span style={{
                            fontSize: '9.5px', padding: '1px 6px', borderRadius: '4px', fontWeight: '700',
                            background: order.status === 'Đã thanh toán' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.2)',
                            color: order.status === 'Đã thanh toán' ? '#34d399' : '#f87171',
                            border: order.status === 'Đã thanh toán' ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)'
                          }}>
                            {order.status === 'Đã thanh toán' ? '🟢 Đã TT' : '🔴 Nợ'}
                          </span>

                          {/* Warranty badge */}
                          <span style={{
                            fontSize: '9.5px', padding: '1px 6px', borderRadius: '4px', fontWeight: '700',
                            background: wCount > 0 ? 'rgba(245,158,11,0.18)' : 'rgba(100,116,139,0.15)',
                            color: wCount > 0 ? '#fbbf24' : '#94a3b8',
                            border: wCount > 0 ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(100,116,139,0.2)'
                          }}>
                            {wCount > 0 ? `🛡️ BH ${wCount} lần` : '🛡️ Chưa BH'}
                          </span>
                        </div>
                      </td>

                      {/* CỘT 5: THAO TÁC 360° */}
                      <td style={{ padding: '8px 10px', minWidth: '150px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            className="glass-button" style={{ padding: '5px 7px', fontSize: '11px' }}
                            onClick={() => setShowDetailModal(order)} title="Xem chi tiết đơn"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            className="glass-button" style={{ padding: '5px 7px', fontSize: '11px', color: '#10b981' }}
                            onClick={() => {
                              const bRef = order.batch_ref || order.batchRef;
                              const bOrders = bRef ? orders.filter(o => (o.batch_ref || o.batchRef) === bRef) : [order];
                              setShowInvoiceModal({ order, qrUrl, batchOrders: bOrders });
                            }} title="In Hóa Đơn Zalo / In ấn"
                          >
                            <Printer size={13} />
                          </button>
                          <button
                            className="glass-button" style={{ padding: '5px 7px', fontSize: '11px', color: '#38bdf8' }}
                            onClick={() => handleOpenEditModal(order)} title="Chỉnh sửa đơn"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            className="glass-button" style={{ padding: '5px 7px', fontSize: '11px', color: '#f59e0b' }}
                            onClick={() => handleOpenWarrantyModal(order)} title="Bảo hành & Gia hạn"
                          >
                            <RefreshCw size={13} />
                          </button>
                          <button
                            className="glass-button" style={{ padding: '5px 7px', fontSize: '11px', color: '#ef4444' }}
                            onClick={() => setConfirmDeleteId(order.id)} title="Xóa đơn"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}</tbody>
            </table>
          </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: '13px', color: '#94a3b8', padding: '0 8px' }}>
                  Trang {currentPage} / {totalPages} (Tổng {filteredOrders.length} đơn)
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
      </div>

      {/* MODAL 1: Detail Order 360° */}
      {showDetailModal && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px', background: '#111625' }}>
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>Chi Tiết Đơn Hàng 360° #{showDetailModal.order.id}</h2>
                  <span className={`badge ${showDetailModal.order.status === 'Đã thanh toán' ? 'badge-success' : 'badge-warning'}`}>
                    {showDetailModal.order.status}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Kênh bán: <strong style={{ color: '#818cf8' }}>{showDetailModal.order.channel || showDetailModal.order.source || 'FB Page'}</strong>
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowDetailModal(null)}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Customer & Product Information Grid */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>Khách Hàng:</span>
                  <p style={{ fontWeight: '700', color: '#fff', margin: '2px 0' }}>
                    {showDetailModal.order.customer_name || showDetailModal.order.customerName}
                  </p>
                  <span style={{ color: '#10b981', fontSize: '12px' }}>SĐT: {showDetailModal.order.phone || 'Chưa cập nhật'}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>Sản Phẩm Dịch Vụ:</span>
                  <p style={{ fontWeight: '700', color: '#818cf8', margin: '2px 0' }}>
                    {showDetailModal.order.product_name || showDetailModal.order.productName}
                  </p>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>Nguồn Sỉ: {showDetailModal.order.supplier_name || showDetailModal.order.supplierName || 'Tự nhập'}</span>
                  {(() => {
                    const pObj = products.find(p => p.name === (showDetailModal.order.product_name || showDetailModal.order.productName));
                    if (!pObj?.description) return null;
                    return (
                      <div style={{ fontSize: '11.5px', color: '#94a3b8', background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)', marginTop: '4px' }}>
                        📝 {pObj.description}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Account Credentials Box */}
              {showDetailModal.order.infor && (
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.25)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      🔑 Thông Tin Tài Khoản / Invite Link Giao Khách
                    </span>
                    <button
                      className="glass-button"
                      onClick={() => handleCopyInfor(showDetailModal.order.infor, showDetailModal.order.id)}
                      style={{ padding: '3px 8px', fontSize: '11px', background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}
                    >
                      {copiedId === `infor-${showDetailModal.order.id}` ? <Check size={12} /> : <Copy size={12} />} Copy Acc
                    </button>
                  </div>
                  <code style={{ fontSize: '12.5px', color: '#fff', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                    {showDetailModal.order.infor}
                  </code>
                </div>
              )}

              {/* Financial & Expiry Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12.5px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '8px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '11.5px' }}>Giá Bán Khách</span>
                  <p style={{ fontSize: '15px', fontWeight: '800', color: '#10b981', margin: '2px 0' }}>
                    {(showDetailModal.order.sell_price || showDetailModal.order.sellPrice || 0).toLocaleString()}đ
                  </p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '8px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '11.5px' }}>Giá Vốn Nhập</span>
                  <p style={{ fontSize: '15px', fontWeight: '800', color: '#f59e0b', margin: '2px 0' }}>
                    {(showDetailModal.order.cost_price || showDetailModal.order.costPrice || 0).toLocaleString()}đ
                  </p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '8px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '11.5px' }}>Lợi Nhuận Thuần</span>
                  <p style={{ fontSize: '15px', fontWeight: '800', color: '#6366f1', margin: '2px 0' }}>
                    {((showDetailModal.order.sell_price || showDetailModal.order.sellPrice || 0) - (showDetailModal.order.cost_price || showDetailModal.order.costPrice || 0)).toLocaleString()}đ
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12.5px', background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: '8px' }}>
                <div>
                  <span style={{ color: '#94a3b8' }}>Ngày Mua:</span> <strong>{showDetailModal.order.purchase_date || showDetailModal.order.date || '---'}</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Ngày Hết Hạn:</span> <strong style={{ color: '#ec4899' }}>{showDetailModal.order.expire_date || showDetailModal.order.expireDate || '---'}</strong>
                </div>
              </div>

              {/* VietQR Code & Bank Details */}
              {showDetailModal.qrUrl && (
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <img src={showDetailModal.qrUrl} alt="VietQR" style={{ width: '140px', height: 'auto', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <div style={{ flex: 1, fontSize: '12px', color: '#cbd5e1', lineHeight: 1.6 }}>
                    <p style={{ margin: 0, fontWeight: '700', color: '#fff' }}>💳 THÔNG TIN CHUYỂN KHOẢN VIETQR:</p>
                    <p style={{ margin: 0 }}>🏦 Ngân hàng: <strong>{vietqr?.bank_id || vietqr?.bankId || 'MB'}</strong></p>
                    <p style={{ margin: 0 }}>🔢 STK: <strong style={{ color: '#10b981' }}>{vietqr?.account_no || vietqr?.accountNo || '0901234567'}</strong></p>
                    <p style={{ margin: 0 }}>👤 Chủ TK: <strong>{vietqr?.account_name || vietqr?.accountName || 'SHOP DROPSHIP CRM'}</strong></p>
                    <p style={{ margin: 0 }}>📝 Nội dung: <strong style={{ color: '#ef4444' }}>{(vietqr?.memo_prefix || vietqr?.memoPrefix || 'DON') + ' ' + showDetailModal.order.id}</strong></p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
                <button
                  className="glass-button"
                  onClick={() => handleCopyZaloText(showDetailModal.order)}
                  style={{ background: '#0068ff', color: '#fff', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                >
                  <Copy size={15} /> Copy Văn Bản Zalo
                </button>
                <button
                  className="glass-button"
                  onClick={() => handleCopyQRImageOnly(showDetailModal.order, showDetailModal.qrUrl)}
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                >
                  <QrCode size={15} /> Copy Thẻ Ảnh QR
                </button>
                <button
                  className="glass-button"
                  onClick={() => {
                    const orderToPrint = showDetailModal.order;
                    setShowDetailModal(null);
                    setShowInvoiceModal({ order: orderToPrint, qrUrl: showDetailModal.qrUrl });
                  }}
                  style={{ background: 'rgba(16,185,129,0.18)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                >
                  <Printer size={15} /> In Hóa Đơn A4
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Printable Commercial Invoice */}
      {showInvoiceModal && (
        <div className="modal-overlay" onClick={() => setShowInvoiceModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', background: '#fff', color: '#000' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>HÓA ĐƠN BÁN HÀNG #${showInvoiceModal.order.id}</h2>
              <button className="modal-close-btn" style={{ color: '#000' }} onClick={() => setShowInvoiceModal(null)}><X size={18} /></button>
            </div>
            
            {(() => {
              const bOrders = showInvoiceModal.batchOrders && showInvoiceModal.batchOrders.length > 0
                ? showInvoiceModal.batchOrders
                : [showInvoiceModal.order];
              const isMultiBatch = bOrders.length > 1;
              const totalBatchSum = bOrders.reduce((sum, item) => sum + Number(item.sell_price || item.sellPrice || 0), 0);

              return (
                <div id="printable-invoice" style={{ padding: '16px 0', fontSize: '13.5px', color: '#0f172a', lineHeight: 1.6 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #6366f1', paddingBottom: '12px', marginBottom: '16px' }}>
                    <div>
                      <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#6366f1', margin: 0 }}>DROPSHIP CRM STORE</h2>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0' }}>Chuyên Dịch Vụ & Tài Khoản Bản Quyền Số</p>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Hotline / Zalo CSKH: 0901234567</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: '700', fontSize: '14px', margin: 0 }}>
                        {isMultiBatch ? `MÃ BATCH: ${showInvoiceModal.order.batch_ref || showInvoiceModal.order.batchRef}` : `MÃ HÓA ĐƠN: #${showInvoiceModal.order.id}`}
                      </p>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0' }}>Ngày: {new Date(showInvoiceModal.order.purchase_date || showInvoiceModal.order.purchaseDate || todayStr).toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                    <p style={{ margin: 0 }}><strong>Khách Hàng:</strong> {showInvoiceModal.order.customer_name || showInvoiceModal.order.customerName}</p>
                    <p style={{ margin: '4px 0 0' }}><strong>Số Điện Thoại / Zalo:</strong> {showInvoiceModal.order.phone || 'N/A'}</p>
                  </div>

                  {/* Items Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Sản Phẩm Dịch Vụ</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Thông Tin Infor / Key</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Hạn Dùng</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Thành Tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bOrders.map((item, idx) => (
                        <tr key={item.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px', fontWeight: '700' }}>#{item.id} - {item.product_name || item.productName}</td>
                          <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '12px' }}>{item.infor || 'Đã kích hoạt'}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{item.expire_date || item.expireDate || '---'}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700', color: '#10b981' }}>
                            {(Number(item.sell_price || item.sellPrice || 0)).toLocaleString()}đ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Total & QR */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                    <div>
                      {showInvoiceModal.qrUrl && (
                        <img src={showInvoiceModal.qrUrl} alt="VietQR" style={{ width: '160px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Tổng Tiền Thanh Toán ({bOrders.length} món):</p>
                      <p style={{ fontSize: '22px', fontWeight: '800', color: '#10b981', margin: '4px 0' }}>
                        {totalBatchSum.toLocaleString()} VNĐ
                      </p>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Trạng thái: <strong>{showInvoiceModal.order.status}</strong></p>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              <button onClick={handlePrintInvoice} className="glass-button" style={{ flex: 1, background: '#6366f1', color: '#fff', fontWeight: '700' }}>
                <Printer size={16} /> In Hóa Đơn (Print PDF/A4)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Warranty / Change Account */}
      
      {/* 6-MODE WARRANTY CONTROL PANEL MODAL */}
      {showWarrantyModal && (
        <div className="modal-overlay" onClick={() => setShowWarrantyModal(null)}>
          <div className="modal-box animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', padding: '24px' }}>
            <div className="modal-header" style={{ marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RefreshCw size={20} color="#f59e0b" /> Trung Tâm Bảo Hành & Đổi Trả 360° Đơn #{showWarrantyModal.id}
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>
                  Khách: <strong>{showWarrantyModal.customer_name}</strong> | SP: <strong>{showWarrantyModal.product_name}</strong> | Nguồn sỉ: <strong style={{ color: '#f59e0b' }}>{suppliers.find(s => String(s.id) === String(showWarrantyModal.supplier_id))?.name || 'N/A'}</strong>
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowWarrantyModal(null)}><X size={18} /></button>
            </div>

            {/* 6-Card Scenario Tabs Selector */}
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                🎯 CHỌN KỊCH BẢN BẢO HÀNH (1-CLICK):
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setWarrantyMode('SWITCH_TEAM')}
                  style={{
                    padding: '10px 8px', borderRadius: '8px', border: warrantyMode === 'SWITCH_TEAM' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                    background: warrantyMode === 'SWITCH_TEAM' ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.04)',
                    color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', textAlign: 'center'
                  }}
                >
                  🔵 1. Đổi Kho Team
                </button>

                <button
                  type="button"
                  onClick={() => setWarrantyMode('EXCHANGE_SAME_SUPPLIER')}
                  style={{
                    padding: '10px 8px', borderRadius: '8px', border: warrantyMode === 'EXCHANGE_SAME_SUPPLIER' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                    background: warrantyMode === 'EXCHANGE_SAME_SUPPLIER' ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.04)',
                    color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', textAlign: 'center'
                  }}
                >
                  🟢 2. Đổi Acc Cùng NCC
                </button>

                <button
                  type="button"
                  onClick={() => setWarrantyMode('CROSS_SUPPLIER')}
                  style={{
                    padding: '10px 8px', borderRadius: '8px', border: warrantyMode === 'CROSS_SUPPLIER' ? '2px solid #f97316' : '1px solid rgba(255,255,255,0.1)',
                    background: warrantyMode === 'CROSS_SUPPLIER' ? 'rgba(249,115,22,0.25)' : 'rgba(255,255,255,0.04)',
                    color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', textAlign: 'center'
                  }}
                >
                  🟧 3. Đổi Acc Chéo NCC B
                </button>

                <button
                  type="button"
                  onClick={() => setWarrantyMode('FULL_REFUND')}
                  style={{
                    padding: '10px 8px', borderRadius: '8px', border: warrantyMode === 'FULL_REFUND' ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                    background: warrantyMode === 'FULL_REFUND' ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.04)',
                    color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', textAlign: 'center'
                  }}
                >
                  🔴 4. Hoàn Tiền 100%
                </button>

                <button
                  type="button"
                  onClick={() => setWarrantyMode('PARTIAL_REFUND')}
                  style={{
                    padding: '10px 8px', borderRadius: '8px', border: warrantyMode === 'PARTIAL_REFUND' ? '2px solid #eab308' : '1px solid rgba(255,255,255,0.1)',
                    background: warrantyMode === 'PARTIAL_REFUND' ? 'rgba(234,179,8,0.25)' : 'rgba(255,255,255,0.04)',
                    color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', textAlign: 'center'
                  }}
                >
                  🟡 5. Hoàn Tiền 1 Phần
                </button>

                <button
                  type="button"
                  onClick={() => setWarrantyMode('REJECT_WARRANTY')}
                  style={{
                    padding: '10px 8px', borderRadius: '8px', border: warrantyMode === 'REJECT_WARRANTY' ? '2px solid #64748b' : '1px solid rgba(255,255,255,0.1)',
                    background: warrantyMode === 'REJECT_WARRANTY' ? 'rgba(100,116,139,0.25)' : 'rgba(255,255,255,0.04)',
                    color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', textAlign: 'center'
                  }}
                >
                  ⚪ 6. Từ Chối Bảo Hành
                </button>
              </div>
            </div>

            <form onSubmit={handleConfirmWarranty} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="form-label">Ghi Chú / Lý Do Bảo Hành</label>
                <input
                  type="text" required className="glass-input"
                  placeholder="VD: Sai mật khẩu, sập slot, NCC A bùng..."
                  value={warrantyReason} onChange={e => setWarrantyReason(e.target.value)}
                />
              </div>

              {/* Dynamic Inputs Based on Selected Warranty Mode */}
              {warrantyMode === 'SWITCH_TEAM' && (
                <div>
                  <label className="form-label" style={{ color: '#3b82f6' }}>Chọn Kho Team Mới (Chuyển Slot)</label>
                  <select
                    className="glass-input" required
                    value={warrantyNewTeamId} onChange={e => setWarrantyNewTeamId(e.target.value)}
                  >
                    <option value="">-- Chọn Kho Team mới --</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                    ))}
                  </select>
                </div>
              )}

              {(warrantyMode === 'SWITCH_TEAM' || warrantyMode === 'EXCHANGE_SAME_SUPPLIER' || warrantyMode === 'CROSS_SUPPLIER') && (
                <div>
                  <label className="form-label" style={{ color: '#10b981' }}>Thông Tin Nick / Invite Link Mới Cho Khách</label>
                  <textarea
                    className="glass-input" required
                    style={{ minHeight: '60px', fontFamily: 'monospace', fontSize: '12.5px', background: 'rgba(15,23,42,0.8)' }}
                    placeholder="VD: new_acc@gmail.com | pass_123 | https://link_join_moi..."
                    value={warrantyNewInfor} onChange={e => setWarrantyNewInfor(e.target.value)}
                  />
                </div>
              )}

              {warrantyMode === 'CROSS_SUPPLIER' && (
                <div style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label className="form-label" style={{ color: '#f97316' }}>Chọn Nhà Cung Cấp Mới (NCC B)</label>
                      <select
                        className="glass-input" required
                        value={warrantyNewSupplierId} onChange={e => setWarrantyNewSupplierId(e.target.value)}
                      >
                        <option value="">-- Chọn NCC B thay thế --</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ color: '#f97316' }}>Giá Vốn Mới Phát Sinh (VNĐ)</label>
                      <input
                        type="number" required className="glass-input"
                        placeholder="VD: 60000"
                        value={warrantyAdditionalCost} onChange={e => setWarrantyAdditionalCost(e.target.value)}
                      />
                    </div>
                  </div>
                  <p style={{ fontSize: '11.5px', color: '#fdba74', marginTop: '6px', margin: 0 }}>
                    💡 CRM sẽ tự động cộng dồn Tổng Giá Vốn = <strong>{((showWarrantyModal.cost_price || 0) + Number(warrantyAdditionalCost || 0)).toLocaleString()}đ</strong> và tính lại Lợi nhuận chuẩn xác!
                  </p>
                </div>
              )}

              {warrantyMode === 'PARTIAL_REFUND' && (
                <div style={{ background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)', padding: '12px', borderRadius: '8px' }}>
                  <label className="form-label" style={{ color: '#eab308' }}>Số Tiền Hoàn Cho Khách (VNĐ)</label>
                  <input
                    type="number" required className="glass-input"
                    value={warrantyRefundAmount} onChange={e => setWarrantyRefundAmount(e.target.value)}
                  />
                  <p style={{ fontSize: '11.5px', color: '#fde047', marginTop: '4px', margin: 0 }}>
                    💡 Gợi ý hoàn tiền tự động dựa trên số ngày còn lại chưa dùng của đơn.
                  </p>
                </div>
              )}

              {warrantyMode === 'FULL_REFUND' && (
                <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', padding: '10px', borderRadius: '8px', color: '#fca5a5', fontSize: '12px' }}>
                  ⚠️ Đơn hàng sẽ được chuyển sang trạng thái <strong>Đã hoàn tiền (100%)</strong> ({Number(showWarrantyModal.sell_price || 0).toLocaleString()}đ).
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="glass-button" style={{ flex: 1, background: 'linear-gradient(135deg, #f59e0b, #10b981)', color: '#fff', fontWeight: '700' }}>
                  ⚡ Xác Nhận Xử Lý Bảo Hành
                </button>
                <button type="button" onClick={() => setShowWarrantyModal(null)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL POS Add Order */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Tạo Đơn Hàng Mới (POS)</h2>
              <button className="modal-close-btn" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span>CHỌN KHÁCH HÀNG (Tra cứu SĐT / Email / Tên) *</span>
                  {formData.customerId && formData.customerId !== 'NEW' && (
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '700' }}>
                      ✅ Đã chọn khách cũ
                    </span>
                  )}
                </label>

                {/* Smart Search Bar + 1-Click Khách Vãng Lai Button */}
                <div ref={searchContainerRef} style={{ position: 'relative', width: '100%' }}>
                    <input
                      type="text"
                      className="glass-input"
                      placeholder="🔍 Nhập SĐT, Email hoặc Tên khách hàng để tra cứu (Bắt buộc SĐT)..."
                      value={posCustSearchTerm}
                      onChange={e => {
                        const val = e.target.value;
                        setPosCustSearchTerm(val);
                        setShowPosCustDropdown(true);
                        if (!val) {
                          handleCustomerChange('');
                        }
                      }}
                      onFocus={() => setShowPosCustDropdown(true)}
                      style={{ paddingRight: posCustSearchTerm ? '30px' : '12px' }}
                    />
                    {posCustSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setPosCustSearchTerm('');
                          setShowPosCustDropdown(false);
                          handleCustomerChange('');
                        }}
                        style={{
                          position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px'
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}

                    {/* Floating Auto-Suggest Dropdown */}
                    {showPosCustDropdown && (
                      <div
                        style={{
                          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                          background: '#0f172a', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '10px',
                          marginTop: '4px', maxHeight: '240px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                          display: 'flex', flexDirection: 'column', gap: '2px', padding: '6px'
                        }}
                      >
                        {/* Top Quick Create Option if search term exists */}
                        {posCustSearchTerm.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              const term = posCustSearchTerm.trim();
                              const isNumeric = /^[0-9\s+-]+$/.test(term);
                              setFormData(f => ({
                                ...f,
                                customerId: 'NEW',
                                newCustomerName: !isNumeric ? term : f.newCustomerName,
                                newCustomerPhone: isNumeric ? term : f.newCustomerPhone
                              }));
                              handleCustomerChange('NEW');
                              setShowPosCustDropdown(false);
                            }}
                            style={{
                              textAlign: 'left', padding: '8px 10px', borderRadius: '6px', border: '1px dashed #6366f1',
                              background: 'rgba(99,102,241,0.12)', color: '#818cf8', fontSize: '12px', fontWeight: '700',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                          >
                            <span>➕</span> Thêm mới Khách Hàng với SĐT/Tên "{posCustSearchTerm}"
                          </button>
                        )}

                        {/* Filtered Customer List */}
                        {(() => {
                          const term = posCustSearchTerm.trim().toLowerCase();
                          const matches = customers.filter(c => {
                            if (!term) return true;
                            return (
                              (c.name && c.name.toLowerCase().includes(term)) ||
                              (c.phone && c.phone.includes(term)) ||
                              (c.email && c.email.toLowerCase().includes(term))
                            );
                          }).slice(0, 6);

                          if (matches.length === 0 && !posCustSearchTerm.trim()) {
                            return <div style={{ padding: '8px', color: '#64748b', fontSize: '12px', textAlign: 'center' }}>Nhập SĐT hoặc Tên để tìm...</div>;
                          }

                          return matches.map(c => {
                            const typeCfg = c.type === 'Si' ? { label: 'Khách Sỉ', color: '#a855f7', bg: 'rgba(168,85,247,0.15)' }
                              : (c.type === 'CTV' ? { label: 'CTV', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' }
                              : { label: 'Khách Lẻ', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' });

                            return (
                              <div
                                key={c.id}
                                onClick={() => {
                                  handleCustomerChange(c.id);
                                  setPosCustSearchTerm(`${c.name} (${c.phone || c.email || 'N/A'})`);
                                  setShowPosCustDropdown(false);
                                }}
                                style={{
                                  padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
                                  background: String(formData.customerId) === String(c.id) ? 'rgba(99,102,241,0.2)' : 'transparent',
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.15s ease'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                onMouseLeave={e => e.currentTarget.style.background = String(formData.customerId) === String(c.id) ? 'rgba(99,102,241,0.2)' : 'transparent'}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{c.name}</span>
                                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                    📱 {c.phone || 'Chưa có SĐT'} {c.email ? `• 📧 ${c.email}` : ''}
                                  </span>
                                </div>
                                <span style={{ fontSize: '10.5px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', background: typeCfg.bg, color: typeCfg.color }}>
                                  {typeCfg.label}
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>

              </div>

              {formData.customerId === 'NEW' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(99,102,241,0.06)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.25)' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>👤 Hồ Sơ Khách Hàng Mới Chi Tiết 360°</span>
                  
                  <div style={{ width: '100%' }}>
                    <label className="form-label" style={{ color: '#c084fc', fontWeight: '700', marginBottom: '8px', display: 'block' }}>
                      🏷️ PHÂN LOẠI KHÁCH HÀNG (BẮT BUỘC CHỌN) *
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleNewCustomerTypeChange('Le')}
                        style={{
                          padding: '7px 6px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
                          background: formData.newCustomerType === 'Le' ? 'rgba(6,182,212,0.18)' : 'rgba(255,255,255,0.03)',
                          border: formData.newCustomerType === 'Le' ? '1.5px solid #06b6d4' : '1px solid rgba(255,255,255,0.08)',
                          color: formData.newCustomerType === 'Le' ? '#06b6d4' : '#94a3b8',
                          boxShadow: formData.newCustomerType === 'Le' ? '0 0 10px rgba(6,182,212,0.2)' : 'none',
                          fontSize: '12px', fontWeight: '700', letterSpacing: '0.02em', transition: 'all 0.15s ease'
                        }}
                      >
                        🔵 Khách Lẻ
                      </button>

                      <button
                        type="button"
                        onClick={() => handleNewCustomerTypeChange('CTV')}
                        style={{
                          padding: '7px 6px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
                          background: formData.newCustomerType === 'CTV' ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.03)',
                          border: formData.newCustomerType === 'CTV' ? '1.5px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)',
                          color: formData.newCustomerType === 'CTV' ? '#f59e0b' : '#94a3b8',
                          boxShadow: formData.newCustomerType === 'CTV' ? '0 0 10px rgba(245,158,11,0.2)' : 'none',
                          fontSize: '12px', fontWeight: '700', letterSpacing: '0.02em', transition: 'all 0.15s ease'
                        }}
                      >
                        🟡 CTV
                      </button>

                      <button
                        type="button"
                        onClick={() => handleNewCustomerTypeChange('Si')}
                        style={{
                          padding: '7px 6px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
                          background: formData.newCustomerType === 'Si' ? 'rgba(168,85,247,0.18)' : 'rgba(255,255,255,0.03)',
                          border: formData.newCustomerType === 'Si' ? '1.5px solid #a855f7' : '1px solid rgba(255,255,255,0.08)',
                          color: formData.newCustomerType === 'Si' ? '#a855f7' : '#94a3b8',
                          boxShadow: formData.newCustomerType === 'Si' ? '0 0 10px rgba(168,85,247,0.2)' : 'none',
                          fontSize: '12px', fontWeight: '700', letterSpacing: '0.02em', transition: 'all 0.15s ease'
                        }}
                      >
                        🟣 Khách Sỉ / ĐL
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label className="form-label">Tên Khách Mới *</label>
                      <input
                        type="text" required className="glass-input" placeholder="VD: Nguyễn Văn B"
                        value={formData.newCustomerName} onChange={e => setFormData({ ...formData, newCustomerName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="form-label">SĐT / Zalo Hotline *</label>
                      <input
                        type="text" required className="glass-input" placeholder="0987654321"
                        value={formData.newCustomerPhone} onChange={e => setFormData({ ...formData, newCustomerPhone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Ghi Chú Khách Mới & Yêu Cầu</label>
                    <input
                      type="text" className="glass-input" placeholder="Thói quen mua sắm, tài khoản ưu tiên..."
                      value={formData.newCustomerNotes || ''} onChange={e => setFormData({ ...formData, newCustomerNotes: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Channel Selector */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'start' }}>
                <div>
                  <div style={{ height: '20px', marginBottom: '6px', display: 'flex', alignItems: 'center' }}>
                    <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      🌐 Nguồn Bán Hàng Main *
                    </label>
                  </div>
                  <select
                    className="glass-input"
                    style={{ width: '100%', height: '40px' }}
                    value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value, subChannelName: '' })}
                  >
                    {Object.keys(SOURCE_CONFIG).map(src => (
                      <option key={src} value={src}>{src}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{ height: '20px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      📍 Kênh Phụ / Đại Lý *
                    </label>
                    {formData.subChannelName && (
                      <span style={{ fontSize: '10.5px', color: '#10b981', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)', padding: '2px 7px', borderRadius: '4px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                        ✅ Đã chọn
                      </span>
                    )}
                  </div>

                  <div ref={subChannelContainerRef} style={{ position: 'relative', width: '100%' }}>
                    <input
                      type="text"
                      className="glass-input"
                      placeholder="🔍 Tra cứu Đại Lý, CTV hoặc Trang..."
                      value={subChannelSearchTerm || formData.subChannelName || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setSubChannelSearchTerm(val);
                        setShowSubChannelDropdown(true);
                        setFormData(f => ({ ...f, subChannelName: val }));
                      }}
                      onFocus={() => setShowSubChannelDropdown(true)}
                      style={{ width: '100%', height: '40px', paddingRight: (subChannelSearchTerm || formData.subChannelName) ? '30px' : '12px' }}
                    />
                    {(subChannelSearchTerm || formData.subChannelName) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSubChannelSearchTerm('');
                          setShowSubChannelDropdown(false);
                          setFormData(f => ({ ...f, subChannelName: '' }));
                        }}
                        style={{
                          position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px'
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}

                    {/* Floating Auto-Suggest Dropdown */}
                    {showSubChannelDropdown && (
                      <div
                        style={{
                          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                          background: '#0f172a', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '10px',
                          marginTop: '4px', maxHeight: '240px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                          display: 'flex', flexDirection: 'column', gap: '2px', padding: '6px'
                        }}
                      >
                        {/* Top Option if typing new agent/subchannel name */}
                        {subChannelSearchTerm.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              const val = subChannelSearchTerm.trim();
                              setFormData(f => ({ ...f, subChannelName: val }));
                              setSubChannelSearchTerm(val);
                              setShowSubChannelDropdown(false);
                            }}
                            style={{
                              textAlign: 'left', padding: '8px 10px', borderRadius: '6px', border: '1px dashed #a855f7',
                              background: 'rgba(168,85,247,0.12)', color: '#c084fc', fontSize: '12px', fontWeight: '700',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                          >
                            <span>➕</span> Chọn Kênh / Đại Lý Mới "${subChannelSearchTerm}"
                          </button>
                        )}

                        {/* List Tagged Agents & Wholesalers & CTVs from Customers Table */}
                        {(() => {
                          const term = (subChannelSearchTerm || '').trim().toLowerCase();
                          
                          const isAgencySource = formData.source === 'Đại Lý / CTV';
                          const agentMatches = (isAgencySource || !formData.source)
                            ? customers
                                .filter(c => c.type === 'Si' || c.type === 'CTV')
                                .filter(c => !term || (c.name && c.name.toLowerCase().includes(term)) || (c.phone && c.phone.includes(term)))
                            : [];

                          const chanMatches = (channels || [])
                            .filter(ch => {
                              if (!formData.source) return true;
                              const mainType = ch.channel_type || ch.channelType || ch.main_channel || ch.mainChannel;
                              return mainType === formData.source;
                            })
                            .filter(ch => {
                              const name = ch.sub_channel_name || ch.name || '';
                              return !term || name.toLowerCase().includes(term);
                            });

                          return (
                            <>
                              {agentMatches.map(ag => {
                                const agentVal = `Đại lý ${ag.name.replace(/^Đại lý\s+/i, '')}`;
                                return (
                                  <div
                                    key={'ag_' + ag.id}
                                    onClick={() => {
                                      setFormData(f => ({ ...f, subChannelName: agentVal }));
                                      setSubChannelSearchTerm(agentVal);
                                      setShowSubChannelDropdown(false);
                                    }}
                                    style={{
                                      padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
                                      background: formData.subChannelName === agentVal ? 'rgba(168,85,247,0.2)' : 'transparent',
                                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.15s ease'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                    onMouseLeave={e => e.currentTarget.style.background = formData.subChannelName === agentVal ? 'rgba(168,85,247,0.2)' : 'transparent'}
                                  >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{ag.name}</span>
                                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                        📱 {ag.phone || 'Chưa có SĐT'}
                                      </span>
                                    </div>
                                    <span style={{ fontSize: '10.5px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', background: ag.type === 'Si' ? 'rgba(168,85,247,0.15)' : 'rgba(245,158,11,0.15)', color: ag.type === 'Si' ? '#a855f7' : '#f59e0b' }}>
                                      {ag.type === 'Si' ? '🟣 Sỉ' : '🟡 CTV'}
                                    </span>
                                  </div>
                                );
                              })}

                              {chanMatches.map(ch => {
                                const chVal = ch.sub_channel_name || ch.name;
                                return (
                                  <div
                                    key={'ch_' + ch.id}
                                    onClick={() => {
                                      setFormData(f => ({ ...f, subChannelName: chVal }));
                                      setSubChannelSearchTerm(chVal);
                                      setShowSubChannelDropdown(false);
                                    }}
                                    style={{
                                      padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
                                      background: formData.subChannelName === chVal ? 'rgba(99,102,241,0.2)' : 'transparent',
                                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.15s ease'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                    onMouseLeave={e => e.currentTarget.style.background = formData.subChannelName === chVal ? 'rgba(99,102,241,0.2)' : 'transparent'}
                                  >
                                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>🌐 Trang: {chVal}</span>
                                  </div>
                                );
                              })}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* [Task 1] Smart POS Cart Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ color: '#38bdf8', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🛒 GIỎ HÀNG POS (TẠO 1 HOẶC NHIỀU ĐƠN CÙNG LÚC) *
                  </label>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{batchItems.length} loại sản phẩm</span>
                </div>

                {/* Add Product Smart Auto-Lookup Search Bar */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div ref={productContainerRef} style={{ position: 'relative', flex: 1 }}>
                    <input
                      type="text"
                      className="glass-input"
                      placeholder="🔍 Nhập tên sản phẩm để tra cứu (Canva, ChatGPT, Netflix...)..."
                      value={productSearchTerm}
                      onChange={e => {
                        setProductSearchTerm(e.target.value);
                        setShowProductDropdown(true);
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const term = productSearchTerm.trim().toLowerCase();
                          const matched = products.find(p => p.name.toLowerCase().includes(term));
                          if (matched) {
                            handleAddProductToBatch(matched.name);
                            setProductSearchTerm('');
                            setShowProductDropdown(false);
                          }
                        }
                      }}
                      style={{ width: '100%', paddingRight: productSearchTerm ? '30px' : '12px' }}
                    />
                    {productSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setProductSearchTerm('');
                          setShowProductDropdown(false);
                        }}
                        style={{
                          position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px'
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}

                    {/* Floating Product Auto-Suggest Dropdown */}
                    {showProductDropdown && (
                      <div
                        style={{
                          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                          background: '#0f172a', border: '1px solid rgba(56,189,248,0.4)', borderRadius: '10px',
                          marginTop: '4px', maxHeight: '240px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                          display: 'flex', flexDirection: 'column', gap: '2px', padding: '6px'
                        }}
                      >
                        {(() => {
                          const term = productSearchTerm.trim().toLowerCase();
                          const matches = products.filter(p => {
                            if (!term) return true;
                            return (
                              (p.name && p.name.toLowerCase().includes(term)) ||
                              (p.category && p.category.toLowerCase().includes(term))
                            );
                          }).slice(0, 8);

                          if (matches.length === 0) {
                            return <div style={{ padding: '10px', color: '#64748b', fontSize: '12px', textAlign: 'center' }}>Không tìm thấy sản phẩm khớp...</div>;
                          }

                          const custType = getCustomerTypeFromState(formData);

                          return matches.map(p => {
                            const sellPrice = getTierPriceForProduct(p, custType);
                            return (
                              <div
                                key={p.id}
                                onClick={() => {
                                  handleAddProductToBatch(p.name);
                                  setProductSearchTerm('');
                                  setShowProductDropdown(false);
                                }}
                                style={{
                                  padding: '9px 12px', borderRadius: '8px', cursor: 'pointer',
                                  background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  transition: 'background 0.15s ease'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,189,248,0.12)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>📦 {p.name}</span>
                                  {p.category && <span style={{ fontSize: '11px', color: '#64748b' }}>🏷️ Danh mục: {p.category}</span>}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#38bdf8' }}>{sellPrice.toLocaleString()}đ</span>
                                  <span style={{ display: 'block', fontSize: '10px', color: '#10b981', fontWeight: '700' }}>+ Thêm vào đơn</span>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Batch Items List */}
                {batchItems.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)', fontSize: '12.5px' }}>
                    🛒 Giỏ hàng đang trống. Hãy chọn sản phẩm ở trên và bấm <strong>+ Thêm Vào Đơn</strong>.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto' }}>
                    {batchItems.map((item, idx) => {
                      return (
                        <div key={item.id} style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {/* Item Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ background: '#6366f1', color: '#fff', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800' }}>
                                {idx + 1}
                              </span>
                              <strong style={{ fontSize: '13.5px', color: '#fff' }}>{item.productName}</strong>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveBatchItem(item.id)}
                              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Trash2 size={12} /> Xóa
                            </button>
                          </div>

                          {/* Item Controls Row 1: Quantity & Prices */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px', alignItems: 'center' }}>
                            <div>
                              <label className="form-label" style={{ fontSize: '11px' }}>Số Lượng Slot / Đơn</label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBatchItem(item.id, 'quantity', item.quantity - 1)}
                                  style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontWeight: '800', cursor: 'pointer' }}
                                >
                                  -
                                </button>
                                <input
                                  type="number" min="1" className="glass-input"
                                  style={{ textAlign: 'center', padding: '4px', fontWeight: '800', color: '#f59e0b' }}
                                  value={item.quantity}
                                  onChange={e => handleUpdateBatchItem(item.id, 'quantity', e.target.value)}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBatchItem(item.id, 'quantity', item.quantity + 1)}
                                  style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontWeight: '800', cursor: 'pointer' }}
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="form-label" style={{ fontSize: '11px' }}>Đơn Giá Bán (đ)</label>
                              <input
                                type="number" className="glass-input" style={{ padding: '5px 8px', fontSize: '12px' }}
                                value={item.sellPrice} onChange={e => handleUpdateBatchItem(item.id, 'sellPrice', e.target.value)}
                              />
                            </div>

                            <div>
                              <label className="form-label" style={{ fontSize: '11px' }}>Đơn Giá Vốn (đ)</label>
                              <input
                                type="number" className="glass-input" style={{ padding: '5px 8px', fontSize: '12px' }}
                                value={item.costPrice} onChange={e => handleUpdateBatchItem(item.id, 'costPrice', e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Item Controls Row 2: Team & Duration */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                              <label className="form-label" style={{ fontSize: '11px' }}>Gán Kho Team Slot</label>
                              <select
                                className="glass-input" style={{ padding: '5px 8px', fontSize: '12px' }}
                                value={item.teamId} onChange={e => handleUpdateBatchItem(item.id, 'teamId', e.target.value)}
                              >
                                <option value="">-- Tự động chọn team --</option>
                                {teams.map(t => (
                                  <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                                ))}
                              </select>
                            </div>

                            {!item.isEvergreen && (
                              <div>
                                <label className="form-label" style={{ fontSize: '11px' }}>Thời Hạn (Ngày)</label>
                                <input
                                  type="number" className="glass-input" style={{ padding: '5px 8px', fontSize: '12px' }}
                                  value={item.durationDays} onChange={e => handleUpdateBatchItem(item.id, 'durationDays', e.target.value)}
                                />
                              </div>
                            )}
                          </div>

                          {/* Item Controls Row 3: Acc / Link Multi-line Textarea */}
                          <div>
                            <label className="form-label" style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                              <span>🔑 Acc / Invite Link Gửi Khách</span>
                              <span style={{ color: '#64748b', fontSize: '10.5px' }}>(Mỗi dòng 1 Acc cho 1 slot)</span>
                            </label>
                            <textarea
                              className="glass-input"
                              rows={Math.min(4, Math.max(2, item.quantity))}
                              style={{ fontFamily: 'monospace', fontSize: '11.5px', padding: '6px' }}
                              placeholder={item.quantity > 1 ? `Dán ${item.quantity} acc/link (mỗi dòng 1 acc)...` : "VD: user@gmail.com | InviteLinkJoin"}
                              value={item.infor}
                              onChange={e => handleUpdateBatchItem(item.id, 'infor', e.target.value)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Batch Total Summary Footer Card */}
                {batchItems.length > 0 && (
                  <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', padding: '10px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '700', textTransform: 'uppercase' }}>TỔNG CỘNG ĐƠN HÀNG</div>
                      <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                        {batchItems.reduce((s, i) => s + Number(i.quantity || 1), 0)} sản phẩm trong giỏ ({batchItems.length} loại)
                      </div>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#10b981' }}>
                      {batchItems.reduce((s, i) => s + (Number(i.sellPrice) || 0) * (Number(i.quantity) || 1), 0).toLocaleString()}đ
                    </div>
                  </div>
                )}
              </div>

              {/* Live Order Margin & Anti-Loss Guard Widget */}
              {formData.productName && (
                <div style={{
                  background: (parseFloat(formData.sellPrice || 0) <= parseFloat(formData.costPrice || 0)) ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.08)',
                  border: (parseFloat(formData.sellPrice || 0) <= parseFloat(formData.costPrice || 0)) ? '1px solid #ef4444' : '1px solid rgba(16,185,129,0.25)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '12.5px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#cbd5e1' }}>
                      🏷️ Nhóm: <strong style={{ color: getCustomerTypeFromState(formData) === 'Si' ? '#a855f7' : getCustomerTypeFromState(formData) === 'CTV' ? '#f59e0b' : '#10b981' }}>
                        {getCustomerTypeFromState(formData) === 'Si' ? '🟣 Khách Sỉ' : getCustomerTypeFromState(formData) === 'CTV' ? '🟡 Khách CTV' : '🟢 Khách Lẻ'}
                      </strong>
                    </span>
                    <span style={{ color: (parseFloat(formData.sellPrice || 0) <= parseFloat(formData.costPrice || 0)) ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                      {parseFloat(formData.sellPrice || 0) <= parseFloat(formData.costPrice || 0)
                        ? '⚠️ CẢNH BÁO LỖ VỐN'
                        : `Lãi đơn: +${(parseFloat(formData.sellPrice || 0) - parseFloat(formData.costPrice || 0)).toLocaleString()}đ (${parseFloat(formData.sellPrice || 0) > 0 ? Math.round(((parseFloat(formData.sellPrice || 0) - parseFloat(formData.costPrice || 0)) / parseFloat(formData.sellPrice || 0)) * 100) : 0}%)`
                      }
                    </span>
                  </div>
                  {lowestPriceHint && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#38bdf8', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '4px', marginTop: '2px' }}>
                      <span>⚡ Nguồn sỉ tốt nhất: {lowestPriceHint.supplier_name} ({Number(lowestPriceHint.price).toLocaleString()}đ)</span>
                      <button
                        type="button"
                        onClick={handleApplyLowestPriceHint}
                        style={{ background: 'rgba(56,189,248,0.2)', border: '1px solid #38bdf8', color: '#38bdf8', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', cursor: 'pointer' }}
                      >
                        Áp dụng
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ color: !formData.status ? '#f87171' : '#94a3b8' }}>Trạng Thái Thanh Toán *</label>
                  <select
                    className="glass-input" required
                    style={{
                      borderColor: !formData.status ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)',
                      background: !formData.status ? 'rgba(239,68,68,0.08)' : 'rgba(0,0,0,0.2)'
                    }}
                    value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="">-- Chọn Trạng Thái Thanh Toán * --</option>
                    <option value="Đã thanh toán">🟢 Đã thanh toán</option>
                    <option value="Nợ">🔴 Nợ (Chưa thanh toán)</option>
                  </select>
                </div>
                {!isEvergreen ? (
                <div>
                  <label className="form-label">Ngày Hết Hạn Đơn</label>
                  <input
                    type="date" className="glass-input"
                    value={formData.expireDate} onChange={e => setFormData({ ...formData, expireDate: e.target.value })}
                  />
                </div>
                ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '8px', padding: '10px 14px' }}>
                  <span style={{ fontSize: '20px' }}>♾️</span>
                  <span style={{ fontSize: '12px', color: '#c084fc', fontWeight: '600' }}>Sản phẩm Vĩnh Viễn<br/><span style={{ color: '#94a3b8', fontWeight: '400' }}>Không có ngày hết hạn</span></span>
                </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px', paddingBottom: '6px' }}>
                <button type="submit" className="glass-button" style={{ flex: 1, background: 'linear-gradient(135deg, #6366f1, #10b981)', color: '#fff', fontWeight: '700' }}>
                  Hoàn Tất Tạo Đơn POS
                </button>
                <button type="button" onClick={closeModal} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      {/* EDIT ACCOUNT & ORDER MODAL */}
      {showEditModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div className="glass-panel animate-scale-in" style={{ width: '100%', maxWidth: '520px', padding: '24px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>
                  ✏️ Điền / Cập Nhật Tài Khoản Đơn #{showEditModal.id}
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '12.5px', marginTop: '2px' }}>
                  Khách hàng: {showEditModal.customer_name} | SP: {showEditModal.product_name}
                </p>
              </div>
              <button onClick={() => setShowEditModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditOrder} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ color: '#60a5fa', fontWeight: 'bold' }}>
                  🔑 Thông Tin Tài Khoản / Invite Link Giao Khách:
                </label>
                <textarea
                  className="glass-input"
                  style={{ minHeight: '80px', fontFamily: 'monospace', fontSize: '13px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid #3b82f6' }}
                  placeholder="VD: email@gmail.com | pass123 | https://link_join_slot..."
                  value={editFormData.infor}
                  onChange={e => setEditFormData({ ...editFormData, infor: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label" style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                  🏢 Chọn Nhà Cung Cấp / Nguồn Nhập Sỉ:
                </label>
                <select
                  className="glass-input"
                  style={{ border: '1px solid rgba(245, 158, 11, 0.4)' }}
                  value={editFormData.supplierId}
                  onChange={e => setEditFormData({ ...editFormData, supplierId: e.target.value })}
                >
                  <option value="">-- Chọn Nhà Cung Cấp nhập acc --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (SĐT: {s.phone || 'N/A'})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Giá Bán Khách (VNĐ)</label>
                  <input
                    type="number" className="glass-input"
                    value={editFormData.sellPrice}
                    onChange={e => setEditFormData({ ...editFormData, sellPrice: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Giá Vốn Nhập Sỉ (VNĐ)</label>
                  <input
                    type="number" className="glass-input"
                    value={editFormData.costPrice}
                    onChange={e => setEditFormData({ ...editFormData, costPrice: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Trạng Thái Thanh Toán</label>
                  <select
                    className="glass-input"
                    value={editFormData.status}
                    onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                  >
                    <option value="Đã thanh toán">Đã thanh toán</option>
                    <option value="Nợ">Nợ</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Ngày Hết Hạn Acc</label>
                  <input
                    type="date" className="glass-input"
                    value={editFormData.expireDate}
                    onChange={e => setEditFormData({ ...editFormData, expireDate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="submit" className="glass-button"
                  style={{ flex: 1, background: 'linear-gradient(135deg, #3b82f6, #10b981)', color: '#fff', fontWeight: 'bold' }}
                >
                  💾 Lưu Thông Tin Tài Khoản
                </button>
                <button
                  type="button" onClick={() => setShowEditModal(null)}
                  style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
  
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Xóa Đơn Hàng?"
        message="Bạn có chắc muốn xóa đơn hàng này? Hành động này không thể hoàn tác."
        onConfirm={handleDeleteOrder}
        onCancel={() => setConfirmDeleteId(null)}
        confirmLabel="Xác Nhận Xóa"
      />
    </div>
  );
}



