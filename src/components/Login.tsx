import React, { useState } from 'react';
import { useAuth, Role } from '../AuthContext';
import { Shield, ChevronRight, LayoutDashboard, Building2, BookOpen } from 'lucide-react';

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

export default function Login() {
    const { login } = useAuth();
    const [role, setRole] = useState<Role>('UNIVERSITY_ADMIN');
    const [college, setCollege] = useState(CONST_COLLEGES[0]);
    const [department, setDepartment] = useState(CONST_DEPARTMENTS[0]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        login({ role, college: role === 'COLLEGE_ADMIN' ? college : undefined, department: role === 'FACULTY' ? department : undefined });
    };

    return (
        <div className="min-h-screen bg-[#0f111a] font-sans selection:bg-indigo-500/30 flex items-center justify-center p-4">
            {/* Abstract Animated Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen" />
            </div>

            <div className="backdrop-blur-xl bg-slate-900/60 rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden group w-full max-w-md z-10">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-80"></div>

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center p-4 bg-indigo-500/10 rounded-2xl mb-4 shadow-[0_0_40px_rgba(99,102,241,0.1)] border border-indigo-500/20">
                        <Shield className="w-10 h-10 text-indigo-400" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-purple-300 tracking-tight">
                        Matrix Access
                    </h1>
                    <p className="text-slate-400 text-sm mt-2 font-medium">Verify credentials to enter broadcast interface.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1 flex items-center gap-2">
                            <LayoutDashboard className="w-3.5 h-3.5" />
                            Select Clearance Level
                        </label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as Role)}
                            className="w-full bg-slate-800/80 text-white text-sm border border-slate-700/50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-inner"
                        >
                            <option value="UNIVERSITY_ADMIN">Global University Administrator</option>
                            <option value="COLLEGE_ADMIN">Local College Administrator</option>
                            <option value="FINANCE_OFFICER">Central Finance Officer</option>
                            <option value="FACULTY">Department Faculty Member</option>
                        </select>
                    </div>

                    {role === 'COLLEGE_ADMIN' && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1 flex items-center gap-2">
                                <Building2 className="w-3.5 h-3.5" />
                                Select Registered College
                            </label>
                            <select
                                value={college}
                                onChange={(e) => setCollege(e.target.value)}
                                className="w-full bg-slate-800/80 text-white text-sm border border-slate-700/50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-inner"
                            >
                                {CONST_COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    )}

                    {role === 'FACULTY' && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1 flex items-center gap-2">
                                <BookOpen className="w-3.5 h-3.5" />
                                Select Assigned Department
                            </label>
                            <select
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                                className="w-full bg-slate-800/80 text-white text-sm border border-slate-700/50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-inner"
                            >
                                {CONST_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full relative group overflow-hidden bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm tracking-wide rounded-xl px-6 py-3.5 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] mt-4 flex items-center justify-center gap-2"
                    >
                        <span className="relative z-10 flex items-center gap-2 uppercase">
                            Authenticate & Enter <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </button>
                </form>
            </div>
        </div>
    );
}
