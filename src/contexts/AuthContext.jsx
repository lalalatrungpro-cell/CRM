import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { getMyProfile } from '../utils/auth';

const AuthContext = createContext({});

// Demo profile dùng khi user bấm "Dùng Thử"
const DEMO_PROFILE = {
  id: 'demo-user-id',
  shop_id: 'demo-shop',
  role: 'admin',
  full_name: 'Chủ Shop (Chế Độ Demo)',
  email: 'admin@shop.com'
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Demo mode CHỈ kích hoạt khi user BẤM NÚT "Dùng Thử"
    // Không còn tự động bật nữa
    const savedDemo = localStorage.getItem('demo_session_active');
    if (savedDemo === 'true') {
      setUser({ id: 'demo-user-id', email: 'admin@shop.com' });
      setProfile(DEMO_PROFILE);
      setLoading(false);
      return;
    }

    // Kiểm tra session Supabase thật
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getMyProfile()
          .then(p => setProfile(p))
          .catch(err => {
            console.error('Lỗi khi lấy profile:', err);
            // Fallback profile nếu chưa có row trong bảng profiles
            setProfile({
              id: session.user.id,
              shop_id: null,
              role: 'admin',
              full_name: session.user.user_metadata?.full_name || session.user.email,
              email: session.user.email
            });
          });
      }
      setLoading(false);
    }).catch(err => {
      console.error('Lỗi khi lấy session Supabase:', err);
      setLoading(false);
    });

    // Lắng nghe thay đổi auth (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const isDemo = localStorage.getItem('demo_session_active') === 'true';
      if (isDemo) return;

      setUser(session?.user ?? null);
      if (session?.user) {
        getMyProfile()
          .then(p => setProfile(p))
          .catch(() => {
            setProfile({
              id: session.user.id,
              shop_id: null,
              role: 'admin',
              full_name: session.user.user_metadata?.full_name || session.user.email,
              email: session.user.email
            });
          });
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loginDemo = () => {
    localStorage.setItem('demo_session_active', 'true');
    setUser({ id: 'demo-user-id', email: 'admin@shop.com' });
    setProfile(DEMO_PROFILE);
  };

  const logout = async () => {
    localStorage.removeItem('demo_session_active');
    setUser(null);
    setProfile(null);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    }
  };

  const value = {
    user,
    profile,
    role: profile?.role ?? 'admin',
    shopId: profile?.shop_id ?? null,
    isDemo: localStorage.getItem('demo_session_active') === 'true',
    isAdmin: (profile?.role ?? 'admin') === 'admin',
    isStaff: profile?.role === 'staff',
    isAccountant: profile?.role === 'accountant',
    loginDemo,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
