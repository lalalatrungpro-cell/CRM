import { supabase } from './supabaseClient';

// Đăng ký tài khoản và thiết lập metadata
export async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });
  if (error) throw error;
  return data;
}

// Đăng nhập
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// Đăng xuất
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Lấy user hiện tại
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Lấy profile + role của user hiện tại
export async function getMyProfile() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, shops(*)')
    .single();
  if (error) throw error;
  return data;
}

// Lắng nghe thay đổi auth state (đăng nhập/đăng xuất)
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}
