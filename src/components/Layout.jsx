import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Tag, ShieldCheck, ShoppingCart, Clock,
  Users, Truck, Wallet, Settings, LogOut, Database
} from 'lucide-react';

export default function Layout() {
  const { user, profile, logout } = useAuth();

  const navItems = [
    { to: '/', label: 'Tổng Quan Dashboard', icon: <LayoutDashboard size={18} /> },
    { to: '/orders', label: 'Đơn Hàng & POS', icon: <ShoppingCart size={18} /> },
    { to: '/customers', label: 'Quản Lý Khách Hàng', icon: <Users size={18} /> },
    { to: '/products', label: 'Bảng Giá & Sản Phẩm', icon: <Tag size={18} /> },
    { to: '/teams', label: 'Kho Tài Khoản & Teams', icon: <ShieldCheck size={18} /> },
    { to: '/expiring', label: 'Cảnh Báo Hết Hạn', icon: <Clock size={18} /> },
    { to: '/suppliers', label: 'Nhà Cung Cấp & Sỉ', icon: <Truck size={18} /> },
    { to: '/debt', label: 'Công Nợ Thu / Chi', icon: <Wallet size={18} /> },
    { to: '/settings', label: 'Cấu Hình VietQR', icon: <Settings size={18} /> }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0d18', color: '#f8fafc' }}>
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        background: '#111528',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        justify: 'space-between',
        flexShrink: 0
      }}>
        {/* Header Logo */}
        <div>
          <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
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
                <h2 style={{ fontSize: '16px', fontWeight: '800', letterSpacing: '-0.02em', margin: 0 }}>Dropship CRM</h2>
                <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Hệ Thống Quản Lý 360°</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ padding: '16px 12px' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {navItems.map(item => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      color: isActive ? '#fff' : '#94a3b8',
                      background: isActive ? 'linear-gradient(90deg, rgba(99,102,241,0.25) 0%, rgba(99,102,241,0.08) 100%)' : 'transparent',
                      borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
                      fontWeight: isActive ? '600' : '500',
                      fontSize: '13.5px',
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
      <main style={{ flex: 1, padding: '24px', overflowY: 'auto', minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}
