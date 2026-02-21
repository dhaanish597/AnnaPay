import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Notification {
  id: string;
  event_type: string;
  recipient_role: 'UNIVERSITY_ADMIN' | 'COLLEGE_ADMIN' | 'FINANCE_OFFICER' | 'FACULTY' | 'IT_SUPPORT';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  college?: string;
  status: 'sent' | 'failed' | 'pending' | 'resolved' | 'escalated' | 'scheduled';
  timestamp: string;
}
