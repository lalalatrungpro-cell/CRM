import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance;

try {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL hoặc Anon Key bị thiếu! Vui lòng kiểm tra lại tệp .env.local.');
  }
  // Khởi tạo an toàn, nếu thiếu sẽ dùng url placeholder để không bị crash toàn bộ bundle js khi khởi chạy
  supabaseInstance = createClient(
    supabaseUrl || 'https://eqkhddgmhpropbzwiqmd.supabase.co', 
    supabaseAnonKey || 'placeholder-key'
  );
} catch (err) {
  console.error('Lỗi nghiêm trọng khi tạo client Supabase:', err);
  // Tạo client giả lập tối thiểu để tránh lỗi undefined method crash
  supabaseInstance = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: () => Promise.reject(new Error('Chưa cấu hình Supabase URL')),
      signOut: () => Promise.resolve()
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null })
        }),
        single: () => Promise.resolve({ data: null, error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null })
      })
    })
  };
}

export const supabase = supabaseInstance;
