import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, signUp } from '../utils/auth';
import { LogIn, ShieldAlert, Sparkles } from 'lucide-react';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const toast = useToast();
  const navigate = useNavigate();
  const { loginDemo } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      return setError('Vui lòng điền đầy đủ Email và Mật khẩu.');
    }
    if (isSignUp && !fullName.trim()) {
      return setError('Vui lòng nhập Họ và tên.');
    }

    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        await signUp(email.trim(), password, fullName.trim());
        toast.success('Đăng ký tài khoản thành công! Vui lòng đăng nhập.');
        setIsSignUp(false);
        setPassword('');
      } else {
        await signIn(email.trim(), password);
        toast.success('Đăng nhập thành công!');
        setTimeout(() => {
          window.location.href = '/';
        }, 300);
      }
    } catch (err) {
      console.error('Login error:', err);
      const msg = err.message || '';
      if (msg.includes('Invalid API key') || msg.includes('apiKey')) {
        setError('Lỗi API Key: Khóa Supabase chưa chuẩn. Bạn có thể bấm nút Dùng Thử màu xanh lá bên dưới để vào ngay!');
      } else {
        setError(msg || 'Đăng nhập thất bại. Kiểm tra lại thông tin hoặc bấm nút Dùng Thử bên dưới.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoClick = () => {
    loginDemo();
    toast.success('Đăng nhập thành công! Đang chuyển hướng vào hệ thống...');
    setTimeout(() => {
      window.location.href = '/';
    }, 300);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0d18' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '40px', width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '26px' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '50%', background: '#6366f1',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)'
          }}>
            <LogIn size={28} color="white" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>Dropship CRM</h2>
          <p style={{ color: '#94a3b8', marginTop: '8px', fontSize: '13.5px' }}>
            {isSignUp ? 'Đăng ký tài khoản cửa hàng mới' : 'Đăng nhập để quản lý cửa hàng 360°'}
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '12px', borderRadius: '10px', fontSize: '12.5px', marginBottom: '20px', lineHeight: 1.5 }}>
            <strong><ShieldAlert size={14} style={{ display: 'inline', marginRight: '4px' }} /> Lỗi Đăng Nhập:</strong>
            <p style={{ margin: '4px 0 0 0' }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isSignUp && (
            <div>
              <label className="form-label">Họ và tên chủ shop</label>
              <input
                type="text"
                className="glass-input"
                placeholder="VD: Nguyễn Văn A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          )}
          <div>
            <label className="form-label">Email đăng nhập</label>
            <input
              type="email"
              className="glass-input"
              placeholder="nhanvien@shop.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div>
            <label className="form-label">Mật khẩu</label>
            <input
              type="password"
              className="glass-input"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className="glass-button" style={{ width: '100%', marginTop: '6px', fontWeight: '700', background: '#6366f1', color: '#fff' }} disabled={loading}>
            {loading ? 'Đang xử lý...' : isSignUp ? 'Đăng Ký Tài Khoản' : 'Đăng Nhập Supabase'}
          </button>
        </form>

        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'center' }}>


          <div style={{ fontSize: '13px', marginTop: '6px' }}>
            <span style={{ color: '#94a3b8' }}>
              {isSignUp ? 'Đã có tài khoản? ' : 'Chưa có tài khoản cửa hàng? '}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              style={{
                background: 'none', border: 'none', color: '#6366f1',
                fontWeight: '600', cursor: 'pointer', padding: 0
              }}
              disabled={loading}
            >
              {isSignUp ? 'Đăng nhập ngay' : 'Đăng ký ngay'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
