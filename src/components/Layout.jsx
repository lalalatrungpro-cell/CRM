import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ErrorBoundary from './ErrorBoundary';
import {
  Key, LayoutDashboard, Tag, ShieldCheck, ShoppingCart, Clock,
  Users, Truck, Wallet, Settings, LogOut, Database,
  PackagePlus, TrendingDown, Calculator, Landmark, Boxes
} from 'lucide-react';

export default function Layout() {
  const { user, profile, logout } = useAuth();

  const navSections = [
    {
      title: 'TÀI CHÍNH & KẾ TOÁN',
      items: [
        { to: '/', label: 'Báo Cáo P&L Tài Chính', icon: <LayoutDashboard size={17} /> },
        { to: '/cashflow', label: 'Sổ Quỹ Thu / Chi', icon: <Wallet size={17} /> },
        { to: '/expenses', label: 'Chi Phí Vận Hành OPEX', icon: <TrendingDown size={17} /> },
        { to: '/payroll', label: 'Nhân Sự & Bảng Lương', icon: <Calculator size={17} /> }
      ]
    },
    {
      title: 'BÁN HÀNG & KHO HÀNG',
      items: [
        { to: '/orders', label: 'Đơn Hàng & POS', icon: <ShoppingCart size={17} /> },
        { to: '/inventory', label: 'Kho & Nhập Hàng', icon: <Boxes size={17} /> },
        { to: '/products', label: 'Bảng Giá & Sản Phẩm', icon: <Tag size={17} /> },
        { to: '/expiring', label: 'Cảnh Báo Hết Hạn', icon: <Clock size={17} /> }
      ]
    },
    {
      title: 'ĐỐI TÁC & CÔNG NỢ',
      items: [
        { to: '/customers', label: 'Quản Lý Khách Hàng', icon: <Users size={17} /> },
        { to: '/suppliers', label: 'Nhà Cung Cấp & Sỉ', icon: <Truck size={17} /> },
        { to: '/debt', label: 'Quản Lý Công Nợ', icon: <Landmark size={17} /> }
      ]
    },
    {
      title: 'HỆ THỐNG',
      items: [
        { to: '/settings', label: 'Cài Đặt & Kênh Bán Hàng', icon: <Settings size={17} /> },
        { to: '/licenses', label: 'Bản Quyền MamNonPro', icon: <Key size={17} /> }
      ]
    }
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0a0d18', color: '#f8fafc' }}>
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        background: '#111528',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 100
      }}>
        {/* Header Logo */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ padding: '20px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #10b981)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(99,102,241,0.3)'
              }}>
                <Database size={20} color="#fff" />
              </div>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '-0.02em', margin: 0 }}>Dropship ERP 360°</h2>
                <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Quản Trị Doanh Nghiệp</p>
              </div>
            </div>
          </div>

          {/* Navigation Links Grouped */}
          <nav style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {navSections.map(section => (
              <div key={section.title}>
                <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#64748b', letterSpacing: '0.06em', padding: '0 10px 6px 10px' }}>
                  {section.title}
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {section.items.map(item => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === '/'}
                        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                        style={({ isActive }) => ({
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          color: isActive ? '#fff' : '#94a3b8',
                          background: isActive ? 'linear-gradient(90deg, rgba(99,102,241,0.25) 0%, rgba(99,102,241,0.08) 100%)' : 'transparent',
                          borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
                          fontWeight: isActive ? '700' : '500',
                          fontSize: '13px',
                          transition: 'all 0.15s ease',
                          textDecoration: 'none'
                        })}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Footer User Profile */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #10b981)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '700', fontSize: '14px', color: '#fff'
              }}>
                {(profile?.full_name || user?.email || 'A')[0].toUpperCase()}
              </div>
              <div>
                <p style={{ fontWeight: '600', fontSize: '13px', color: '#fff', margin: 0 }}>{profile?.full_name || user?.email?.split('@')[0]}</p>
                <p style={{ color: '#64748b', fontSize: '11px', margin: 0 }}>
                  {profile?.role === 'admin' ? 'Chủ Shop' : profile?.role === 'accountant' ? 'Kế Toán' : 'Nhân Viên'}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Đăng xuất"
              style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '24px', overflowY: 'auto', height: '100vh', boxSizing: 'border-box', minWidth: 0 }}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
