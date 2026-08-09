import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { getMyProfile } from '../utils/auth';

const AuthContext = createContext({});

const DEMO_PROFILE = {
  id: 'demo-user-id',
  shop_id: 1,
  role: 'admin',
  full_name: 'Chủ Shop (Chế Độ Demo)',
  email: 'admin@shop.com'
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Enable Demo session by default if not set to explicitly false
    const savedDemo = localStorage.getItem('demo_session_active');
    if (savedDemo !== 'false') {
      localStorage.setItem('demo_session_active', 'true');
      setUser({ id: 'demo-user-id', email: 'admin@shop.com' });
      setProfile(DEMO_PROFILE);
      setLoading(false);
      return;
    }

    // Check Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getMyProfile().then(setProfile).catch(console.error);
      }
      setLoading(false);
    }).catch(err => {
      console.error('Lỗi khi lấy session Supabase:', err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const isDemo = localStorage.getItem('demo_session_active') === 'true';
      if (isDemo) return;

      setUser(session?.user ?? null);
      if (session?.user) {
        getMyProfile().then(setProfile).catch(console.error);
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
    shopId: profile?.shop_id ?? 1,
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

