import { useState, useEffect, useMemo } from 'react';
import { supabase, Notification } from '../lib/supabase';
import { Bell, Filter, AlertCircle, CheckCircle, ShieldAlert, ArrowUpCircle, Check, Activity, ShieldCheck, Zap, LogOut, History, X, Loader2 } from 'lucide-react';
import NotificationForm from './NotificationForm';
import { useAuth } from '../AuthContext';
import { io } from 'socket.io-client';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function NotificationDashboard() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Derive precisely authorized list natively bypassing unauthorized data explicitly
  const authorizedNotifications = useMemo(() => {
    if (user?.role === 'UNIVERSITY_ADMIN') return notifications;
    if (user?.role === 'COLLEGE_ADMIN') return notifications.filter(n => n.college === user.college || !n.college || n.recipient_role === 'COLLEGE_ADMIN');
    if (user?.role === 'FACULTY') return notifications.filter(n => n.recipient_role === 'FACULTY' && (!user.department || n.message.includes(user.department)));
    if (user?.role === 'FINANCE_OFFICER') return notifications.filter(n => n.recipient_role === 'FINANCE_OFFICER' || n.priority === 'HIGH');
    return notifications;
  }, [notifications, user]);

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filters
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [collegeFilter, setCollegeFilter] = useState<string>('ALL');

  useEffect(() => {
    fetchNotifications();

    // 1. WebSocket Live Connection to Node Microservice
    const socket = io('http://localhost:3000');
    socket.on('connect', () => {
      console.log('[WebSocket] Connected securely to notification matrix.');
    });

    socket.on('new_notification', (payload: any) => {
      setNotifications((prev) => {
        // Prevent duplication if Supabase real-time is also catching it locally
        if (prev.find(n => n.id === payload.id)) return prev;

        // Re-map the payload specifically since it sends 'role' instead of 'recipient_role' from the router
        const formattedPayload = {
          ...payload,
          recipient_role: payload.recipient_role || payload.role
        };

        return [formattedPayload as Notification, ...prev];
      });
    });

    // 2. Supabase Realtime Fallback / Complement
    const subscription = supabase
      .channel('notification_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notification_logs' }, (payload) => {
        setNotifications((prev) => {
          if (prev.find(n => n.id === payload.new.id)) return prev;
          return [payload.new as Notification, ...prev];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notification_logs' }, (payload) => {
        setNotifications((prev) => prev.map(n => n.id === payload.new.id ? payload.new as Notification : n));
      })
      .subscribe();

    return () => {
      socket.disconnect();
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [authorizedNotifications, priorityFilter, statusFilter, roleFilter, collegeFilter]);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notification_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
    } else {
      setNotifications(data || []);
    }
    setLoading(false);
  };

  const filterNotifications = () => {
    let filtered = [...authorizedNotifications];

    if (priorityFilter !== 'ALL') {
      filtered = filtered.filter(n => n.priority === priorityFilter);
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(n => n.status === statusFilter);
    }

    if (roleFilter !== 'ALL') {
      filtered = filtered.filter(n => n.recipient_role === roleFilter);
    }

    if (collegeFilter !== 'ALL') {
      filtered = filtered.filter(n => n.college === collegeFilter);
    }

    setFilteredNotifications(filtered);
  };

  const handleResolve = async (id: string) => {
    try {
      const actor_identifier = user ? `${user.role} (${user.college || user.department || 'GLOBAL'})` : 'UNKNOWN_ACTOR';
      const res = await fetch(`http://localhost:3000/api/notifications/${id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor_identifier })
      });

      if (res.ok) {
        // Let the Supabase UPDATE subscription physically catch and update the local state without forcing a reload
        // Or update optimistically:
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'resolved' } : n));
      }
    } catch (e) {
      console.error('Failed to resolve:', e);
    }
  };

  const handleViewAudit = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingAudit(true);
    setShowAuditModal(true);
    try {
      const res = await fetch(`http://localhost:3000/api/notifications/${id}/audit`);
      const data = await res.json();
      if (res.ok) {
        setAuditLogs(data || []);
      }
    } catch (err) {
      console.error('Failed fetching audit:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleTriggerEscalation = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/notifications/trigger-escalation`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`Successfully escalated ${data.count} items.`);
      }
    } catch (e) { console.error('Failed to trigger SLA chron.', e); }
  };

  const getPriorityClasses = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]';
      case 'MEDIUM': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.2)]';
      case 'LOW': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const getRoleClasses = (role: string) => {
    switch (role) {
      case 'UNIVERSITY_ADMIN': return 'bg-indigo-500/10 text-indigo-600';
      case 'COLLEGE_ADMIN': return 'bg-purple-500/10 text-purple-600';
      case 'FINANCE_OFFICER': return 'bg-emerald-500/10 text-emerald-600';
      case 'FACULTY': return 'bg-blue-500/10 text-blue-600';
      case 'IT_SUPPORT': return 'bg-orange-500/10 text-orange-600';
      default: return 'bg-slate-500/10 text-slate-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'sent': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case 'escalated': return <ArrowUpCircle className="w-4 h-4 text-rose-500" />;
      case 'pending': return <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>;
      case 'scheduled': return <div className="w-3 h-3 border-2 border-indigo-500 border-b-transparent border-t-transparent rounded-full animate-spin"></div>;
      default: return <div className="w-3 h-3 bg-slate-500 rounded-full"></div>;
    }
  };

  const formatTimestamp = (isoString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(new Date(isoString));
  };

  // Create unique distinct lists for dropdowns based on actual records
  const uniqueColleges = Array.from(new Set(authorizedNotifications.map(n => n.college).filter(Boolean)));

  // Analytics Calculations tied strictly to user clearance
  const totalNotifications = authorizedNotifications.length;
  const highPriorityCount = authorizedNotifications.filter(n => n.priority === 'HIGH').length;
  const resolvedCount = authorizedNotifications.filter(n => n.status === 'resolved').length;
  const resolvedPercentage = totalNotifications > 0 ? Math.round((resolvedCount / totalNotifications) * 100) : 0;

  // To avoid duplication, we check pure 'escalated' status + '[ESCALATED]' substring in un-resolved logic
  const escalatedCount = authorizedNotifications.filter(n =>
    n.status === 'escalated' ||
    (n.message.includes('[ESCALATED]') && n.status !== 'resolved')
  ).length;

  const chartData = useMemo(() => {
    const data = [];
    const today = new Date();
    // Start from 6 days ago
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateString = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const count = authorizedNotifications.filter(n => {
        const notifDate = new Date(n.timestamp);
        return notifDate.getDate() === d.getDate() &&
          notifDate.getMonth() === d.getMonth() &&
          notifDate.getFullYear() === d.getFullYear();
      }).length;

      data.push({ date: dateString, count });
    }
    return data;
  }, [authorizedNotifications]);

  return (
    <div className="min-h-screen bg-[#0f111a] font-sans selection:bg-indigo-500/30">

      {/* Abstract Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">

        {/* Dynamic Auth Header Logout Bar */}
        <div className="flex items-center justify-end mb-4">
          <div className="flex items-center gap-4 bg-slate-900/60 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/5 shadow-xl">
            <div className="flex flex-col items-end">
              <span className="text-slate-200 text-sm font-bold uppercase tracking-wider leading-none mb-1">{user?.role.replace('_', ' ')}</span>
              {user?.college && <span className="text-indigo-400 text-[10px] uppercase font-bold tracking-widest leading-none">{user.college}</span>}
              {user?.department && <span className="text-purple-400 text-[10px] uppercase font-bold tracking-widest leading-none">{user.department}</span>}
            </div>
            <div className="w-px h-8 bg-white/10 mx-1"></div>
            <button onClick={logout} className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors" title="Secure Logout Session">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Header Section */}
        <div className="mb-10 text-center space-y-4 pt-4">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-500/10 rounded-2xl mb-2 shadow-[0_0_40px_rgba(99,102,241,0.1)] border border-indigo-500/20">
            <ShieldAlert className="w-10 h-10 text-indigo-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-purple-300 tracking-tight">
            AnnaPay Event Engine
          </h1>
          <p className="text-slate-400 text-lg font-medium max-w-2xl mx-auto">
            Priority-driven distributed notification matrix. Secured Clearance Actuated.
          </p>
        </div>

        {/* Analytics Section */}
        <div className="mb-8 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total */}
            <div className="backdrop-blur-xl bg-slate-900/60 rounded-3xl p-6 border border-white/5 shadow-xl flex flex-col relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-5 h-5 text-indigo-400" />
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Events</span>
              </div>
              <span className="text-4xl font-extrabold text-white">{totalNotifications}</span>
            </div>
            {/* High Priority */}
            <div className="backdrop-blur-xl bg-slate-900/60 rounded-3xl p-6 border border-white/5 shadow-xl flex flex-col relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all"></div>
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-5 h-5 text-rose-400" />
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">High Priority</span>
              </div>
              <span className="text-4xl font-extrabold text-white">{highPriorityCount}</span>
            </div>
            {/* Resolved Percentage */}
            <div className="backdrop-blur-xl bg-slate-900/60 rounded-3xl p-6 border border-white/5 shadow-xl flex flex-col relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Resolution Rate</span>
              </div>
              <span className="text-4xl font-extrabold text-white">{resolvedPercentage}%</span>
            </div>
            {/* Escalated Count */}
            <div className="backdrop-blur-xl bg-slate-900/60 rounded-3xl p-6 border border-white/5 shadow-xl flex flex-col relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all"></div>
              <div className="flex items-center gap-3 mb-2">
                <ArrowUpCircle className="w-5 h-5 text-orange-400" />
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Escalated</span>
              </div>
              <span className="text-4xl font-extrabold text-white">{escalatedCount}</span>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="backdrop-blur-xl bg-slate-900/60 rounded-3xl p-6 border border-white/5 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-wider">
              <Activity className="w-4 h-4 text-indigo-400" /> Event Frequency (Last 7 Days)
            </h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    contentStyle={{ backgroundColor: '#0f111a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                    itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left Panel: Form */}
          <div className="lg:col-span-4 space-y-6">
            <div className="backdrop-blur-xl bg-slate-900/60 rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-400" />
                Trigger Broadcast
              </h2>
              <NotificationForm onSuccess={fetchNotifications} />
            </div>
          </div>

          {/* Right Panel: Logs and Filters */}
          <div className="lg:col-span-8 space-y-6">

            {/* Filters */}
            <div className="backdrop-blur-xl bg-slate-900/60 rounded-3xl p-6 border border-white/5 shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Filter className="w-5 h-5 text-purple-400" />
                  Matrix Filters
                </h2>
                <div className="flex items-center gap-3">
                  <button onClick={handleTriggerEscalation} className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider rounded border border-rose-500/20 transition-all flex items-center gap-1 shadow-sm opacity-80 hover:opacity-100">
                    <AlertCircle className="w-3 h-3" />
                    Trigger Escalation Check
                  </button>
                  <span className="px-3 py-1 bg-white/5 text-slate-300 text-xs font-semibold rounded-full border border-white/10">
                    {filteredNotifications.length} Events
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">Priority</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full bg-slate-800/50 text-slate-200 text-sm border border-slate-700/50 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value="ALL">All Priorities</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-slate-800/50 text-slate-200 text-sm border border-slate-700/50 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="resolved">Resolved</option>
                    <option value="sent">Sent</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="escalated">Escalated</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">Role</label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full bg-slate-800/50 text-slate-200 text-sm border border-slate-700/50 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="UNIVERSITY_ADMIN">Univ Admin</option>
                    <option value="COLLEGE_ADMIN">College Admin</option>
                    <option value="FINANCE_OFFICER">Finance Officer</option>
                    <option value="FACULTY">Faculty</option>
                    <option value="IT_SUPPORT">IT Support</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">College</label>
                  <select
                    value={collegeFilter}
                    onChange={(e) => setCollegeFilter(e.target.value)}
                    className="w-full bg-slate-800/50 text-slate-200 text-sm border border-slate-700/50 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value="ALL">All Colleges</option>
                    {uniqueColleges.map(college => (
                      <option key={college} value={college}>{college}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Notifications List */}
            <div className="space-y-4">
              {loading ? (
                <div className="backdrop-blur-xl bg-slate-900/60 rounded-3xl p-12 border border-white/5 flex flex-col items-center justify-center min-h-[400px]">
                  <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                  <p className="mt-4 text-slate-400 font-medium tracking-wide">Scanning matrix logs...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="backdrop-blur-xl bg-slate-900/60 rounded-3xl p-12 border border-white/5 flex flex-col items-center justify-center min-h-[400px]">
                  <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-white/5">
                    <ShieldAlert className="w-8 h-8 text-slate-500" />
                  </div>
                  <p className="text-slate-400 font-medium text-lg">No signals detected</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredNotifications.map((notification) => {

                    const isExpanded = expandedCards.has(notification.id);

                    // Prioritize exact DB 'escalated' status, otherwise fallback logic
                    const isEscalated = notification.status === 'escalated' || notification.message.includes('[ESCALATED]');

                    let displayStatus = notification.status.toUpperCase();
                    if (isEscalated && notification.status !== 'resolved') {
                      displayStatus = 'ESCALATED';
                    }

                    return (
                      <div key={notification.id} className="group relative backdrop-blur-md bg-slate-800/40 rounded-2xl p-5 border border-white/5 hover:bg-slate-800/60 transition-all duration-300 shadow-lg cursor-default">

                        {/* Status Line */}
                        <div className={`absolute top-0 left-0 bottom-0 w-1.5 rounded-l-2xl opacity-80 ${notification.priority === 'HIGH' ? 'bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : notification.priority === 'MEDIUM' ? 'bg-yellow-500/80' : 'bg-blue-500/80'}`}></div>

                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pl-3">

                          <div className="space-y-3 flex-1" onClick={() => toggleExpand(notification.id)}>
                            <div className="flex flex-wrap items-center gap-2 cursor-pointer">

                              {/* Primary Badges */}
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border ${getPriorityClasses(notification.priority)}`}>
                                {notification.priority}
                              </span>

                              {notification.college && (
                                <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold tracking-wider uppercase text-indigo-300">
                                  🏛️ {notification.college}
                                </span>
                              )}

                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border border-white/5 ${getRoleClasses(notification.recipient_role)}`}>
                                👤 {notification.recipient_role}
                              </span>

                              {/* Escalation Badge */}
                              {isEscalated && (
                                <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-500/20 border border-rose-500/30 text-[10px] font-bold tracking-wider uppercase text-rose-400 animate-pulse">
                                  <ArrowUpCircle className="w-3 h-3" />
                                  ESCALATED
                                </span>
                              )}
                            </div>

                            <p className="text-slate-200 text-[15px] leading-relaxed font-medium cursor-pointer">
                              {notification.message}
                            </p>

                            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                              <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] font-bold">
                                {getStatusIcon(notification.status)}
                                <span className={
                                  displayStatus === 'RESOLVED' ? 'text-emerald-500' :
                                    displayStatus === 'ESCALATED' || displayStatus === 'FAILED' ? 'text-rose-500' :
                                      displayStatus === 'SENT' ? 'text-blue-500' : 'text-amber-500'
                                }>
                                  {displayStatus}
                                </span>
                              </span>
                              <span>•</span>
                              <span>{formatTimestamp(notification.timestamp)}</span>
                              <span>•</span>
                              <span className="text-indigo-400/80 hover:text-indigo-400 transition-colors cursor-pointer underline decoration-dotted underline-offset-4">
                                {isExpanded ? 'Hide Details' : 'Show Details'}
                              </span>
                            </div>

                            {/* Expanded Metadata Section */}
                            <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
                              <div className="overflow-hidden">
                                <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5 space-y-2 text-sm mt-3">
                                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Event Type</p>
                                      <p className="text-slate-300 font-mono text-xs">{notification.event_type}</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Log ID</p>
                                      <p className="text-slate-300 font-mono text-[10px] truncate" title={notification.id}>{notification.id}</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Internal Status</p>
                                      <p className="text-slate-300 font-mono text-xs">{notification.status}</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Target Engine</p>
                                      <p className="text-slate-300 font-mono text-xs">{notification.recipient_role}</p>
                                    </div>
                                  </div>
                                  {Boolean((notification as any).escalation_time) && (
                                    <div className="pt-3 border-t border-slate-700/50 mt-3">
                                      <p className="text-rose-500 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <ArrowUpCircle className="w-3 h-3" /> Auto-Escalation SLA Triggered
                                      </p>
                                      <p className="text-slate-300 font-mono text-xs">{formatTimestamp((notification as any).escalation_time)}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex-shrink-0 pt-2 sm:pt-0 flex flex-col gap-2">
                            {notification.status !== 'resolved' && notification.priority !== 'LOW' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleResolve(notification.id); }}
                                className="w-full px-5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-xl border border-emerald-500/30 hover:border-emerald-500/50 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                              >
                                <Check className="w-4 h-4" />
                                Mark Resolved
                              </button>
                            )}
                            <button
                              onClick={(e) => handleViewAudit(notification.id, e)}
                              className="w-full px-5 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-indigo-300 text-xs font-bold uppercase tracking-wider rounded-xl border border-slate-600/50 hover:border-indigo-500/50 transition-all flex items-center justify-center gap-2 shadow-inner"
                            >
                              <History className="w-4 h-4" />
                              View Audit Trail
                            </button>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Audit Modal Native Insertion */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <History className="w-6 h-6 text-indigo-400" />
                Audit Trail History
              </h3>
              <button onClick={() => setShowAuditModal(false)} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {loadingAudit ? (
                <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>
              ) : auditLogs.length === 0 ? (
                <p className="text-center text-slate-500 py-12">No audit logs found for this item.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${log.action === 'CREATED' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          log.action === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            log.action === 'ESCALATED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                              'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                          }`}>
                          {log.action}
                        </span>
                        <span className="text-slate-300 text-xs font-semibold">{log.actor_identifier}</span>
                      </div>
                      <span className="text-slate-500 text-[10px] font-mono">{formatTimestamp(log.created_at)}</span>
                    </div>
                    {Object.keys(log.details || {}).length > 0 && (
                      <div className="mt-2 bg-slate-900/50 p-3 rounded-lg border border-slate-800 text-xs font-mono text-indigo-200 overflow-hidden">
                        <pre className="whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
