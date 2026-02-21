import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Notification {
  id: string;
  role: 'Admin' | 'HR' | 'Finance';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  status: 'sent' | 'failed';
  created_at: string;
}
