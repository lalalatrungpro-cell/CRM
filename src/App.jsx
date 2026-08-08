import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import { initData } from './utils/storage';

import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Teams from './pages/Teams';
import ExpiringAccounts from './pages/ExpiringAccounts';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Suppliers from './pages/Suppliers';
import SupplierDetail from './pages/SupplierDetail';
import Orders from './pages/Orders';
import Debt from './pages/Debt';
import Settings from './pages/Settings';
import MigratePage from './pages/MigratePage';

const RequireAuth = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff', fontSize: '16px', background: '#0b0d19' }}>
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff', fontSize: '16px', background: '#0b0d19' }}>
        Đang tải ứng dụng...
      </div>
    );
  }
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="teams" element={<Teams />} />
        <Route path="expiring" element={<ExpiringAccounts />} />
        <Route path="orders" element={<Orders />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="suppliers/:id" element={<SupplierDetail />} />
        <Route path="debt" element={<Debt />} />
        <Route path="settings" element={<Settings />} />
        <Route path="migrate" element={<MigratePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  useEffect(() => {
    const handlePaymentNotification = (e) => {
      const { orderId, amount, customerName } = e.detail || {};
      console.log('Auto Bank Payment Received:', e.detail);
    };
    window.addEventListener('vietqr-payment-received', handlePaymentNotification);
    return () => window.removeEventListener('vietqr-payment-received', handlePaymentNotification);
  }, []);
  useEffect(() => { initData(); }, []);

  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
