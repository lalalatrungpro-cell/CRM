import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { StaffMemberService, PayrollService } from '../utils/dataService';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import DateFilterBar from '../components/DateFilterBar';
import {
  Users, UserCheck, Plus, RefreshCw, X, Trash2, Edit2,
  DollarSign, Calculator, CheckCircle2, Clock, Award, Shield
} from 'lucide-react';

export default function Payroll() {
  const toast = useToast();
  const { shopId } = useAuth();

  const [activeTab, setActiveTab] = useState('PAYROLL'); // 'PAYROLL' | 'STAFF'
  const [staffList, setStaffList] = useState([]);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '', preset: 'ALL' });

  // Month selector (default current YYYY-MM)
  const currentMonthPeriod = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthPeriod);

  // Modals
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [confirmDeleteStaffId, setConfirmDeleteStaffId] = useState(null);

  const [showEditPayrollModal, setShowEditPayrollModal] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const emptyStaffForm = {
    fullName: '',
    phone: '',
    role: 'Sale',
    baseSalary: 5000000,
    commissionType: 'PERCENT', // 'PERCENT' | 'FIXED_PER_ORDER'
    commissionRate: 5,
    commissionFixed: 0,
    status: 'ACTIVE',
    joinedDate: todayStr
  };

  const [staffFormData, setStaffFormData] = useState(emptyStaffForm);

  const loadData = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [sList, pList] = await Promise.all([
        StaffMemberService.list(shopId),
        PayrollService.list(shopId)
      ]);
      setStaffList(sList || []);
      setPayrollRecords(pList || []);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải dữ liệu nhân sự & bảng lương!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [shopId]);

  // ==================== STAFF HANDLERS ====================
  const handleOpenAddStaff = () => {
    setEditingStaff(null);
    setStaffFormData(emptyStaffForm);
    setShowStaffModal(true);
  };

  const handleOpenEditStaff = (staff) => {
    setEditingStaff(staff);
    setStaffFormData({
      fullName: staff.full_name || staff.fullName || '',
      phone: staff.phone || '',
      role: staff.role || 'Sale',
      baseSalary: staff.base_salary || staff.baseSalary || 0,
      commissionType: staff.commission_type || staff.commissionType || 'PERCENT',
      commissionRate: staff.commission_rate || staff.commissionRate || 0,
      commissionFixed: staff.commission_fixed || staff.commissionFixed || 0,
      status: staff.status || 'ACTIVE',
      joinedDate: staff.joined_date || staff.joinedDate || todayStr
    });
    setShowStaffModal(true);
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!staffFormData.fullName.trim()) return toast.error('Vui lòng nhập họ tên nhân viên!');

    const payload = {
      full_name: staffFormData.fullName.trim(),
      phone: staffFormData.phone.trim(),
      role: staffFormData.role,
      base_salary: Number(staffFormData.baseSalary || 0),
      commission_type: staffFormData.commissionType,
      commission_rate: Number(staffFormData.commissionRate || 0),
      commission_fixed: Number(staffFormData.commissionFixed || 0),
      status: staffFormData.status,
      joined_date: staffFormData.joinedDate || todayStr
    };

    try {
      if (editingStaff) {
        await StaffMemberService.update(editingStaff.id, payload);
        toast.success(`Đã cập nhật hồ sơ "${payload.full_name}"!`);
      } else {
        await StaffMemberService.create(shopId, payload);
        toast.success(`Đã thêm nhân sự "${payload.full_name}" thành công!`);
      }
      setShowStaffModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi lưu nhân sự.');
    }
  };

  const handleDeleteStaff = async () => {
    const id = confirmDeleteStaffId;
    try {
      await StaffMemberService.remove(id);
      setStaffList(prev => prev.filter(s => String(s.id) !== String(id)));
      setPayrollRecords(prev => prev.filter(p => String(p.staff_id) !== String(id) && String(p.id) !== String(id)));
      setConfirmDeleteStaffId(null);
      toast.success('Đã xóa nhân sự khỏi hệ thống!');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xóa nhân sự.');
    }
  };

  // ==================== PAYROLL HANDLERS ====================
  const handleAutoCalculatePayroll = async () => {
    try {
      const calculated = await PayrollService.calculatePayrollForMonth(shopId, selectedMonth);
      for (const item of calculated) {
        await PayrollService.savePayrollRecord(shopId, item);
      }
      toast.success(`Đã tự động tính toán bảng lương kỳ ${selectedMonth} thành công!`);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tính toán bảng lương.');
    }
  };

  const handleConfirmAndPay = async (record) => {
    try {
      await PayrollService.confirmAndPaySalary(shopId, record, 'BANK');
      toast.success(`Đã chi trả lương ${record.net_salary.toLocaleString()}đ cho "${record.staff_name}" & hạch toán Sổ Quỹ!`);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi chi trả lương.');
    }
  };

  const handleOpenEditPayroll = (record) => {
    setEditingPayroll({ ...record });
    setShowEditPayrollModal(true);
  };

  const handleSaveEditPayroll = async (e) => {
    e.preventDefault();
    try {
      await PayrollService.savePayrollRecord(shopId, editingPayroll);
      toast.success(`Đã cập nhật bảng lương "${editingPayroll.staff_name}"!`);
      setShowEditPayrollModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi cập nhật bảng lương.');
    }
  };

  // Filter records by selected month
  const currentMonthRecords = payrollRecords.filter(p => p.month_period === selectedMonth);
  const totalNetSalary = currentMonthRecords.reduce((sum, p) => sum + Number(p.net_salary || 0), 0);
  const totalPaidSalary = currentMonthRecords.filter(p => p.status === 'PAID').reduce((sum, p) => sum + Number(p.net_salary || 0), 0);
  const totalCommission = currentMonthRecords.reduce((sum, p) => sum + Number(p.commission_amount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={26} color="#6366f1" /> Quản Lý Nhân Sự, Hoa Hồng & Bảng Tính Lương
          </h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '13px', margin: 0 }}>
            Hồ sơ nhân sự, tự động tính hoa hồng theo đơn hàng chốt thực tế và 1-chạm chi trả lương vào Sổ Quỹ.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="glass-button" onClick={loadData} title="Tải lại dữ liệu" style={{ padding: '8px 12px' }}>
            <RefreshCw size={16} />
          </button>
          <button
            className="glass-button"
            onClick={handleOpenAddStaff}
            style={{ background: 'linear-gradient(135deg, #6366f1, #10b981)', color: '#fff', fontWeight: '700' }}
          >
            <Plus size={18} /> + Thêm Nhân Sự Mới
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <DateFilterBar onFilterChange={setDateRange} label="Kỳ Bảng Lương:" />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Tổng Quỹ Lương ({selectedMonth})</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#fff', marginTop: '4px' }}>
            {totalNetSalary.toLocaleString()}đ
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Bao gồm lương cứng + hoa hồng + thưởng</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Tổng Hoa Hồng Doanh Số</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#f59e0b', marginTop: '4px' }}>
            {totalCommission.toLocaleString()}đ
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Hoa hồng chốt đơn của đội ngũ Sale</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Đã Chi Trả Lương</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>
            {totalPaidSalary.toLocaleString()}đ
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Đã hạch toán xuất quỹ thành công</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Tổng Nhân Sự Đang Hoạt Động</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#38bdf8', marginTop: '4px' }}>
            {staffList.filter(s => s.status === 'ACTIVE').length} nhân sự
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Đội ngũ Sale, CSKH, Kỹ thuật</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('PAYROLL')}
            style={{
              padding: '9px 18px', borderRadius: '8px', border: 'none',
              background: activeTab === 'PAYROLL' ? '#6366f1' : 'rgba(255,255,255,0.04)',
              color: activeTab === 'PAYROLL' ? '#fff' : '#94a3b8',
              fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <Calculator size={16} /> Bảng Lương & Hoa Hồng Hằng Tháng
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('STAFF')}
            style={{
              padding: '9px 18px', borderRadius: '8px', border: 'none',
              background: activeTab === 'STAFF' ? '#10b981' : 'rgba(255,255,255,0.04)',
              color: activeTab === 'STAFF' ? '#fff' : '#94a3b8',
              fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <UserCheck size={16} /> Danh Sách Nhân Sự ({staffList.length})
          </button>
        </div>

        {activeTab === 'PAYROLL' && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="glass-input"
              style={{ width: 'auto', padding: '7px 12px', fontSize: '13px' }}
            />
            <button
              onClick={handleAutoCalculatePayroll}
              className="glass-button"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: '700', fontSize: '12.5px' }}
            >
              ⚡ Tự Động Tính Lương Tháng Này
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: PAYROLL SHEET */}
      {activeTab === 'PAYROLL' && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Nhân Viên', 'Vị Trí', 'Lương Cứng', 'Đơn Chốt', 'Doanh Thu Chốt', 'Hoa Hồng', 'Thưởng KPI', 'Trừ Tạm Ứng', 'Lương Thực Nhận', 'Trạng Thái', 'Thao Tác'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="11" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Đang tải bảng lương...</td></tr>
                ) : currentMonthRecords.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      Chưa có dữ liệu bảng lương cho tháng {selectedMonth}. Bấm nút <strong>"⚡ Tự Động Tính Lương Tháng Này"</strong> để tính toán.
                    </td>
                  </tr>
                ) : (
                  currentMonthRecords.map(p => {
                    const isPaid = p.status === 'PAID';
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: '700', color: '#fff' }}>{p.staff_name}</div>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#38bdf8' }}>
                          {p.role || 'Sale'}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#cbd5e1' }}>
                          {Number(p.base_salary || 0).toLocaleString()}đ
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: '700', color: '#fff' }}>
                          {p.orders_count || 0} đơn
                        </td>
                        <td style={{ padding: '14px 16px', color: '#10b981' }}>
                          {Number(p.revenue_generated || 0).toLocaleString()}đ
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: '700', color: '#f59e0b' }}>
                          +{Number(p.commission_amount || 0).toLocaleString()}đ
                        </td>
                        <td style={{ padding: '14px 16px', color: '#38bdf8' }}>
                          +{Number(p.bonus_kpi || 0).toLocaleString()}đ
                        </td>
                        <td style={{ padding: '14px 16px', color: '#ef4444' }}>
                          -{Number(p.advance_deduction || 0).toLocaleString()}đ
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: '900', fontSize: '14px', color: '#10b981' }}>
                          {Number(p.net_salary || 0).toLocaleString()}đ
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {isPaid ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '11px', fontWeight: 'bold' }}>
                              <CheckCircle2 size={12} /> Đã chi trả
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: '11px', fontWeight: 'bold' }}>
                              <Clock size={12} /> Bảng nháp
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {!isPaid && (
                              <button
                                type="button"
                                onClick={() => handleConfirmAndPay(p)}
                                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #10b981', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                                title="Xác nhận chi trả lương"
                              >
                                💵 Chi Lương
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditPayroll(p)}
                              style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '4px' }}
                              title="Chỉnh sửa thưởng/phạt"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteStaffId(p.staff_id || p.id)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                              title="Xóa nhân sự này"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: STAFF LIST */}
      {activeTab === 'STAFF' && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Nhân Viên', 'Số Điện Thoại', 'Vị Trí', 'Lương Cứng', 'Cơ Chế Hoa Hồng', 'Ngày Vào Làm', 'Trạng Thái', 'Thao Tác'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffList.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: '#fff' }}>
                      {s.full_name}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#cbd5e1' }}>
                      {s.phone || 'N/A'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontSize: '11.5px', fontWeight: 'bold' }}>
                        {s.role}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: '#10b981' }}>
                      {Number(s.base_salary || 0).toLocaleString()}đ
                    </td>
                    <td style={{ padding: '14px 16px', color: '#f59e0b', fontWeight: '600' }}>
                      {s.commission_type === 'PERCENT' ? `${s.commission_rate}% Doanh thu` : `${Number(s.commission_fixed || 0).toLocaleString()}đ / đơn`}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#94a3b8' }}>
                      {s.joined_date || todayStr}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', background: s.status === 'ACTIVE' ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)', color: s.status === 'ACTIVE' ? '#10b981' : '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}>
                        {s.status === 'ACTIVE' ? '🟢 Hoạt động' : '⚪ Đã nghỉ'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditStaff(s)}
                          style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', padding: '4px' }}
                          title="Sửa nhân sự"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteStaffId(s.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                          title="Xóa nhân sự"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== POPUP MODAL: ADD / EDIT STAFF ==================== */}
      {showStaffModal && createPortal(
        <div
            className="drawer-overlay"
            onClick={() => setShowStaffModal(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
              display: 'flex', justifyContent: 'flex-end'
            }}
          >
            <div
              className="drawer-content animate-slide-in-right"
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: '560px', height: '100vh', background: '#0f172a', borderLeft: '1px solid rgba(255,255,255,0.1)', boxShadow: '-10px 0 35px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              background: 'linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95))',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px', boxShadow: '0 4px 15px rgba(139,92,246,0.35)'
                }}>
                  👔
                </div>
                <div>
                  <h2 style={{ fontSize: '19px', fontWeight: '800', color: '#fff', margin: 0 }}>
                    QUẢN LÝ HỒ SƠ NHÂN VIÊN
                  </h2>
                  <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '3px 0 0 0' }}>
                    Thêm/Sửa nhân sự, phân quyền & cấu hình lương KPI
                  </p>
                </div>
              </div>
              <button
                type="button" onClick={() => setShowStaffModal(false)}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', cursor: 'pointer', padding: '7px', borderRadius: '10px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Họ Và Tên *</label>
                  <input
                    type="text" required className="glass-input" placeholder="VD: Nguyễn Văn Hùng"
                    value={staffFormData.fullName} onChange={e => setStaffFormData({ ...staffFormData, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Số Điện Thoại / Zalo</label>
                  <input
                    type="text" className="glass-input" placeholder="0912345678"
                    value={staffFormData.phone} onChange={e => setStaffFormData({ ...staffFormData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Vị Trí Công Việc</label>
                  <select
                    className="glass-input"
                    value={staffFormData.role} onChange={e => setStaffFormData({ ...staffFormData, role: e.target.value })}
                  >
                    <option value="Sale">Nhân Viên Sale / Chốt Đơn</option>
                    <option value="CSKH">Nhân Viên CSKH / Bảo Hành</option>
                    <option value="Technical">Kỹ Thuật / Quản Lý Kho</option>
                    <option value="Accountant">Kế Toán / Thu Ngân</option>
                    <option value="Manager">Quản Lý / Trưởng Nhóm</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Mức Lương Cứng (VNĐ)</label>
                  <input
                    type="number" className="glass-input" placeholder="5000000"
                    value={staffFormData.baseSalary} onChange={e => setStaffFormData({ ...staffFormData, baseSalary: e.target.value })}
                  />
                </div>
              </div>

              {/* Commission Rule */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#f59e0b', textTransform: 'uppercase' }}>
                  🎯 Cơ Chế Tính Hoa Hồng Doanh Số
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="form-label">Loại Hoa Hồng</label>
                    <select
                      className="glass-input"
                      value={staffFormData.commissionType} onChange={e => setStaffFormData({ ...staffFormData, commissionType: e.target.value })}
                    >
                      <option value="PERCENT">% Hoa Hồng Trên Doanh Thu</option>
                      <option value="FIXED_PER_ORDER">Tiền Thưởng Cố Định / Đơn</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">
                      {staffFormData.commissionType === 'PERCENT' ? '% Hoa Hồng (VD: 5%)' : 'Số Tiền/Đơn (VNĐ)'}
                    </label>
                    <input
                      type="number" className="glass-input"
                      value={staffFormData.commissionType === 'PERCENT' ? staffFormData.commissionRate : staffFormData.commissionFixed}
                      onChange={e => {
                        if (staffFormData.commissionType === 'PERCENT') {
                          setStaffFormData({ ...staffFormData, commissionRate: e.target.value });
                        } else {
                          setStaffFormData({ ...staffFormData, commissionFixed: e.target.value });
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Ngày Bắt Đầu Làm</label>
                  <input
                    type="date" className="glass-input"
                    value={staffFormData.joinedDate} onChange={e => setStaffFormData({ ...staffFormData, joinedDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Trạng Thái Làm Việc</label>
                  <select
                    className="glass-input"
                    value={staffFormData.status} onChange={e => setStaffFormData({ ...staffFormData, status: e.target.value })}
                  >
                    <option value="ACTIVE">🟢 Đang làm việc</option>
                    <option value="INACTIVE">⚪ Đã nghỉ việc</option>
                  </select>
                </div>
              </div>

              </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#111827', marginTop: 'auto', display: 'flex', gap: '12px' }}>
              <button type="submit" className="glass-button" style={{ flex: 1, height: '44px', background: 'linear-gradient(135deg, #6366f1, #10b981)', color: '#fff', fontWeight: '700' }}>
                {editingStaff ? '💾 Cập Nhật Nhân Sự' : '✨ Thêm Mới Nhân Sự'}
              </button>
              <button type="button" onClick={() => setShowStaffModal(false)} style={{ padding: '0 20px', height: '44px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>
                Hủy
              </button>
            </div>
          </form>
          </div>
        </div>,
        document.body
      )}

      {/* ==================== POPUP MODAL: EDIT PAYROLL (BONUS / DEDUCTION) ==================== */}
      {showEditPayrollModal && editingPayroll && createPortal(
        <div
            className="drawer-overlay"
            onClick={() => setShowEditPayrollModal(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
              display: 'flex', justifyContent: 'flex-end'
            }}
          >
            <div
              className="drawer-content animate-slide-in-right"
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: '560px', height: '100vh', background: '#0f172a', borderLeft: '1px solid rgba(255,255,255,0.1)', boxShadow: '-10px 0 35px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              background: 'linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95))',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px', boxShadow: '0 4px 15px rgba(59,130,246,0.35)'
                }}>
                  🧮
                </div>
                <div>
                  <h2 style={{ fontSize: '19px', fontWeight: '800', color: '#fff', margin: 0 }}>
                    TÍNH LƯƠNG & THƯỞNG KINH DOANH
                  </h2>
                  <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '3px 0 0 0' }}>
                    Tính lương cứng, hoa hồng doanh số & thưởng hiệu suất
                  </p>
                </div>
              </div>
              <button
                type="button" onClick={() => setShowEditPayrollModal(false)}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', cursor: 'pointer', padding: '7px', borderRadius: '10px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditPayroll} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Lương Cứng (VNĐ)</label>
                <input
                  type="number" className="glass-input"
                  value={editingPayroll.base_salary}
                  onChange={e => setEditingPayroll({ ...editingPayroll, base_salary: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="form-label">Hoa Hồng Doanh Số (VNĐ)</label>
                <input
                  type="number" className="glass-input"
                  value={editingPayroll.commission_amount}
                  onChange={e => setEditingPayroll({ ...editingPayroll, commission_amount: Number(e.target.value) })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label" style={{ color: '#10b981' }}>+ Thưởng KPI / Dự Án</label>
                  <input
                    type="number" className="glass-input"
                    value={editingPayroll.bonus_kpi}
                    onChange={e => setEditingPayroll({ ...editingPayroll, bonus_kpi: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ color: '#ef4444' }}>- Trừ Tạm Ứng / Phạt</label>
                  <input
                    type="number" className="glass-input"
                    value={editingPayroll.advance_deduction}
                    onChange={e => setEditingPayroll({ ...editingPayroll, advance_deduction: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ color: '#cbd5e1' }}>Lương Thực Nhận Sau Điều Chỉnh:</span>
                <strong style={{ color: '#10b981', fontSize: '16px' }}>
                  {(Number(editingPayroll.base_salary || 0) + Number(editingPayroll.commission_amount || 0) + Number(editingPayroll.bonus_kpi || 0) - Number(editingPayroll.advance_deduction || 0)).toLocaleString()}đ
                </strong>
              </div>

            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#111827', marginTop: 'auto', display: 'flex', gap: '12px' }}>
              <button type="submit" className="glass-button" style={{ flex: 1, height: '44px', background: 'linear-gradient(135deg, #3b82f6, #10b981)', color: '#fff', fontWeight: '700' }}>
                💾 Cập Nhật Lương Tháng
              </button>
              <button type="button" onClick={() => setShowEditPayrollModal(false)} style={{ padding: '0 20px', height: '44px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>
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
        isOpen={!!confirmDeleteStaffId}
        title="Xóa Nhân Sự?"
        message="Bạn có chắc muốn xóa hồ sơ nhân viên này?"
        onConfirm={handleDeleteStaff}
        onCancel={() => setConfirmDeleteStaffId(null)}
        confirmLabel="Xác Nhận Xóa"
      />
    </div>
  );
}
