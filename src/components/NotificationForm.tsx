import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Eye, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../AuthContext';

interface NotificationFormProps {
  onSuccess: () => void;
}

const CONST_COLLEGES = [
  'CEG (College of Engineering Guindy)',
  'MIT (Madras Institute of Technology)',
  'ACTech (Alagappa College of Technology)',
  'SAP (School of Architecture and Planning)',
  'University Departments',
  'Regional Campus Coimbatore',
  'Regional Campus Madurai',
  'Regional Campus Tirunelveli',
];

const CONST_DEPARTMENTS = [
  'Computer Science and Engineering',
  'Information Technology',
  'Electronics and Communication',
  'Electrical and Electronics',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Architecture',
  'Management Studies (MBA)',
  'Finance',
  'Human Resources',
];

export default function NotificationForm({ onSuccess }: NotificationFormProps) {
  const { user } = useAuth();
  const [eventType, setEventType] = useState<string>('SALARY_PROCESSED');
  const [priority, setPriority] = useState<string>('MEDIUM');
  const [department, setDepartment] = useState<string>('');
  const [collegeId, setCollegeId] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  const [dispatchType, setDispatchType] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledAt, setScheduledAt] = useState<string>('');

  // Modal State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Autocomplete UI logic
  const [deptSuggestions, setDeptSuggestions] = useState<string[]>([]);
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);

  const [collegeSuggestions, setCollegeSuggestions] = useState<string[]>([]);
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);

  const deptRef = useRef<HTMLDivElement>(null);
  const collegeRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (deptRef.current && !deptRef.current.contains(event.target as Node)) {
        setShowDeptDropdown(false);
      }
      if (collegeRef.current && !collegeRef.current.contains(event.target as Node)) {
        setShowCollegeDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDeptChange = (val: string) => {
    setDepartment(val);
    setValidationError('');
    if (val.trim() === '') {
      setDeptSuggestions([]);
      setShowDeptDropdown(false);
      return;
    }
    const filtered = CONST_DEPARTMENTS.filter(d => d.toLowerCase().includes(val.toLowerCase()));
    setDeptSuggestions(filtered);
    setShowDeptDropdown(true);
  };

  const handleCollegeChange = (val: string) => {
    setCollegeId(val);
    setValidationError('');
    if (val.trim() === '') {
      setCollegeSuggestions([]);
      setShowCollegeDropdown(false);
      return;
    }
    const filtered = CONST_COLLEGES.filter(c => c.toLowerCase().includes(val.toLowerCase()));
    setCollegeSuggestions(filtered);
    setShowCollegeDropdown(true);
  };

  const validateForm = () => {
    if (!eventType) return "Event type is required.";
    if (!department.trim()) return "Department is required.";
    if (!collegeId.trim()) return "College ID/Name is required.";
    if (dispatchType === 'scheduled') {
      if (!scheduledAt) return "Scheduled date & time is required.";
      if (new Date(scheduledAt) <= new Date()) return "Scheduled time must be in the future.";
    }
    return null;
  };

  const handlePreviewClick = () => {
    const vErr = validateForm();
    if (vErr) {
      setValidationError(vErr);
      return;
    }
    setShowPreviewModal(true);
  };

  const handleDispatchClick = () => {
    const vErr = validateForm();
    if (vErr) {
      setValidationError(vErr);
      return;
    }
    setShowConfirmModal(true);
  };

  const executeDispatch = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    setError('');
    setSuccess('');
    setValidationError('');

    try {
      const apiUrl = `http://localhost:3000/api/notifications`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: eventType,
          priority,
          department,
          college_id: collegeId,
          scheduled_at: dispatchType === 'scheduled' ? new Date(scheduledAt).toISOString() : null,
          actor_identifier: user ? `${user.role} (${user.college || user.department || 'GLOBAL'})` : 'UNKNOWN_ACTOR'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to send notification');
      }

      setSuccess('Event notification dispatched successfully!');

      // Reset some fields
      setDepartment('');
      setCollegeId('');
      setScheduledAt('');
      setDispatchType('immediate');
      onSuccess();

      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during dispatch.');
    } finally {
      setLoading(false);
    }
  };

  // Pseudo-preview generator logic matching the backend template.service.js
  const getPreviewMessage = () => {
    switch (eventType) {
      case 'SALARY_PROCESSED': return `Salary has been processed successfully for ${department} department at ${collegeId}.`;
      case 'PAYROLL_FAILED': return `URGENT: Payroll processing failed for ${department} department at ${collegeId}. Immediate attention required.`;
      case 'APPROVAL_PENDING': return `Pending approval for payroll/funds in ${department} department at ${collegeId}. Please review.`;
      case 'PAYMENT_TRANSFERRED': return `Payment successfully transferred to the designated accounts for ${department} department at ${collegeId}.`;
      case 'SYSTEM_ERROR': return `System error detected regarding ${department} operations at ${collegeId}. Check logs.`;
      default: return `Event occurred: ${eventType} for ${department} at ${collegeId}.`;
    }
  };

  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); handleDispatchClick(); }} className="space-y-5">

        {/* Validation Error Banner */}
        {validationError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="w-4 h-4" />
            {validationError}
          </div>
        )}

        {/* Real Error Banner */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl flex items-start gap-2 text-sm font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Banner */}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider pl-1">Event Type *</label>
            <select
              value={eventType}
              onChange={(e) => { setEventType(e.target.value); setValidationError(''); }}
              className="w-full bg-slate-800/50 text-slate-200 border border-slate-700/50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none"
            >
              <option value="SALARY_PROCESSED">Salary Processed ✓</option>
              <option value="PAYROLL_FAILED">Payroll Failed ⚠</option>
              <option value="APPROVAL_PENDING">Approval Pending ⏳</option>
              <option value="PAYMENT_TRANSFERRED">Payment Transferred 💸</option>
              <option value="SYSTEM_ERROR">System Error 🛑</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider pl-1">Priority Level *</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-slate-800/50 text-slate-200 border border-slate-700/50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none"
            >
              <option value="HIGH">High Priority (Email + Dash + Alerts)</option>
              <option value="MEDIUM">Medium Priority (Dashboard Only)</option>
              <option value="LOW">Low Priority (Log & Storage Only)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Auto-complete Department */}
          <div className="space-y-1.5 relative" ref={deptRef}>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider pl-1">Department *</label>
            <input
              type="text"
              value={department}
              onChange={(e) => handleDeptChange(e.target.value)}
              onFocus={() => { if (deptSuggestions.length > 0) setShowDeptDropdown(true); }}
              className="w-full bg-slate-800/50 text-slate-200 border border-slate-700/50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
              placeholder="Start typing..."
            />
            {/* Dropdown Menu */}
            {showDeptDropdown && deptSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto custom-scrollbar">
                {deptSuggestions.map((s, idx) => (
                  <div
                    key={idx}
                    onClick={() => { setDepartment(s); setShowDeptDropdown(false); setValidationError(''); }}
                    className="px-4 py-2.5 text-sm text-slate-300 hover:bg-indigo-500/20 hover:text-white cursor-pointer transition-colors"
                  >
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Auto-complete College */}
          <div className="space-y-1.5 relative" ref={collegeRef}>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider pl-1">College / Entity *</label>
            <input
              type="text"
              value={collegeId}
              onChange={(e) => handleCollegeChange(e.target.value)}
              onFocus={() => { if (collegeSuggestions.length > 0) setShowCollegeDropdown(true); }}
              className="w-full bg-slate-800/50 text-slate-200 border border-slate-700/50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
              placeholder="e.g. CEG, MIT"
            />
            {/* Dropdown Menu */}
            {showCollegeDropdown && collegeSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto custom-scrollbar">
                {collegeSuggestions.map((s, idx) => (
                  <div
                    key={idx}
                    onClick={() => { setCollegeId(s); setShowCollegeDropdown(false); setValidationError(''); }}
                    className="px-4 py-2.5 text-sm text-slate-300 hover:bg-indigo-500/20 hover:text-white cursor-pointer transition-colors"
                  >
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dispatch Type & Schedule Picker */}
        <div className="space-y-3 pt-1">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider pl-1">Execution Mode *</label>
          <div className="flex flex-col sm:flex-row gap-4">
            <label className="flex flex-1 cursor-pointer items-center gap-3 p-3.5 rounded-xl border border-slate-700/50 bg-slate-800/50 hover:bg-slate-700/80 transition-colors shadow-inner">
              <input type="radio" name="dispatch" className="accent-indigo-500 w-4 h-4 cursor-pointer" checked={dispatchType === 'immediate'} onChange={() => { setDispatchType('immediate'); setValidationError(''); }} />
              <span className="text-slate-200 text-sm font-semibold">Immediate Dispatch</span>
            </label>
            <label className="flex flex-1 cursor-pointer items-center gap-3 p-3.5 rounded-xl border border-slate-700/50 bg-slate-800/50 hover:bg-slate-700/80 transition-colors shadow-inner">
              <input type="radio" name="dispatch" className="accent-indigo-500 w-4 h-4 cursor-pointer" checked={dispatchType === 'scheduled'} onChange={() => { setDispatchType('scheduled'); setValidationError(''); }} />
              <span className="text-slate-200 text-sm font-semibold">Scheduled Target ⏳</span>
            </label>
          </div>

          {dispatchType === 'scheduled' && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 pt-2">
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => { setScheduledAt(e.target.value); setValidationError(''); }}
                className="w-full bg-slate-900/80 text-white border border-indigo-500/30 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-[0_0_15px_rgba(99,102,241,0.1)]"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            type="button"
            onClick={handlePreviewClick}
            className="flex-1 bg-slate-800/50 hover:bg-slate-700 text-indigo-300 font-semibold py-3 px-6 rounded-xl border border-indigo-500/20 hover:border-indigo-500/40 transition-all flex items-center justify-center gap-2 group"
          >
            <Eye className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300" />
            Preview Notification
          </button>

          <button
            type="button"
            onClick={handleDispatchClick}
            disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] font-semibold py-3 px-6 rounded-xl border border-indigo-500/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Dispatch Event
              </>
            )}
          </button>
        </div>
      </form>

      {/* ----------------- PREVIEW MODAL ----------------- */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative scale-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-400" />
                Preview Expected Text
              </h3>
              <button onClick={() => setShowPreviewModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 text-slate-300 leading-relaxed font-medium">
                "{getPreviewMessage()}"
              </div>
              <div className="text-sm text-slate-400">
                <p><strong className="text-slate-300">Priority:</strong> {priority}</p>
                <p><strong className="text-slate-300">Target Dept:</strong> {department}</p>
                <p><strong className="text-slate-300">Target College:</strong> {collegeId}</p>
              </div>
            </div>
            <div className="p-4 border-t border-white/10 bg-slate-800/30 flex justify-end">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- CONFIRMATION MODAL ----------------- */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative scale-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/10 text-center bg-rose-500/10 relative overflow-hidden">
              <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-3 opacity-90 animate-pulse" />
              <h3 className="text-2xl font-bold text-white relative z-10">
                Confirm Dispatch
              </h3>
            </div>
            <div className="p-6 text-center text-slate-300 text-lg">
              Are you sure you want to broadcast this <strong className="text-white">{eventType}</strong> event to <strong className="text-white">{collegeId}</strong>?
              {priority === 'HIGH' && (
                <p className="mt-3 text-sm text-rose-400 font-semibold bg-rose-500/10 py-2 px-3 rounded-lg inline-block text-left w-full">
                  ⚠️ Warning: This is a HIGH priority event and will trigger active external emails and emergency SMS alerts.
                </p>
              )}
            </div>
            <div className="p-5 border-t border-white/10 bg-slate-800/30 flex justify-center gap-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-3 rounded-xl font-medium transition-colors border border-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={executeDispatch}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium transition-colors border border-indigo-500 shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Yes, Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
