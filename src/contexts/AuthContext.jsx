import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { getMyProfile } from '../utils/auth';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Kiểm tra session hiện tại
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getMyProfile().then(setProfile).catch(console.error);
      }
      setLoading(false);
    }).catch(err => {
      console.error('Lỗi lấy session Supabase:', err);
      setLoading(false); // Vẫn tắt loading để giao diện hiển thị màn hình Login thay vì bị treo blank
    });

    // Lắng nghe thay đổi auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getMyProfile().then(setProfile).catch(console.error);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    profile,
    role: profile?.role ?? null,
    shopId: profile?.shop_id ?? null,
    isAdmin: profile?.role === 'admin',
    isStaff: profile?.role === 'staff',
    isAccountant: profile?.role === 'accountant',
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
