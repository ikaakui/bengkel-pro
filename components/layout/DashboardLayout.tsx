"use client";

import { useState } from "react";
import {
    LayoutDashboard,
    ShoppingCart,
    Users,
    PieChart,
    Package,
    Wrench,
    LogOut,
    Loader2,
    Menu,
    X,
    UserCircle,
    Settings,
    Users2,
    Shield,
    Crown,
    UserCheck,
    Banknote,
    Copy,
    Check,
    Wallet,
    Bot,
    Building2,
    Phone as PhoneIcon,
    TrendingDown,
    ClipboardList,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import type { UserRole } from "@/components/providers/AuthProvider";

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['owner', 'admin', 'mitra'], group: 'Utama' },
    { name: 'POS (Kasir)', href: '/pos', icon: ShoppingCart, roles: ['admin'], group: 'Utama' },
    { name: 'Antrian Service', href: '/antrian', icon: ClipboardList, roles: ['owner', 'admin'], group: 'Utama' },
    { name: 'Booking Direct', href: '/bookings', icon: Package, roles: ['admin'], group: 'Operasional' },
    { name: 'Booking', href: '/bookings-mitra', icon: Package, roles: ['admin', 'mitra'], group: 'Operasional' },
    { name: 'Komisi', href: '/commissions', icon: PieChart, roles: ['mitra'], group: 'Keuangan' },
    { name: 'Montir AI', href: '/montir-ai', icon: Bot, roles: ['mitra'], group: 'Asisten' },
    { name: 'Persetujuan Dana', href: '/withdrawals', icon: Banknote, roles: ['owner'], group: 'Keuangan' },
    { name: 'Laporan', href: '/reports', icon: PieChart, roles: ['owner'], group: 'Keuangan' },
    { name: 'Katalog', href: '/catalog', icon: Wrench, roles: ['owner'], group: 'Manajemen' },
    { name: 'Pengeluaran', href: '/expenses', icon: TrendingDown, roles: ['owner'], group: 'Keuangan' },
    { name: 'Data Mitra', href: '/users', icon: Users2, roles: ['owner', 'admin'], group: 'Manajemen' },
    { name: 'Karyawan & Admin', href: '/staff', icon: Shield, roles: ['owner'], group: 'Manajemen' },
    { name: 'Organisasi', href: '/branches', icon: Building2, roles: ['owner'], group: 'Manajemen' },
    { name: 'Pengaturan', href: '/settings', icon: Settings, roles: ['owner'], group: 'Sistem' },
];

const roleConfig: Record<UserRole, { label: string; icon: typeof Crown; color: string; bgColor: string }> = {
    owner: { label: 'Owner', icon: Crown, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    admin: { label: 'Admin', icon: Shield, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    mitra: { label: 'Mitra', icon: UserCheck, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const pathname = usePathname();
    const { profile, role, branchName, loading, globalLogoUrl, logoLoading, signOut } = useAuth();

    const userRole = role;
    const filteredNav = userRole ? navigation.filter(item => item.roles.includes(userRole)) : [];
    const currentRole = userRole ? roleConfig[userRole] : null;
    const RoleIcon = currentRole?.icon || UserCircle;

    const copyReferral = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-slate-500 mt-4 text-sm font-medium">Memuat...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full bg-slate-50 flex overflow-hidden">
            {/* Sidebar Mobile Overlay */}
            {sidebarOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 sidebar-glass transition-transform duration-300 transform lg:static lg:translate-x-0 shadow-2xl lg:shadow-none border-r border-slate-200",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex flex-col h-full">
                    {/* Sidebar Header - App Logo */}
                    <div className="h-20 px-6 flex items-center border-b border-slate-100 shrink-0">
                        <Link href="/" className="flex items-center gap-3 group">
                            {logoLoading ? (
                                <div className="w-9 h-9 bg-slate-100 rounded-xl animate-pulse" />
                            ) : globalLogoUrl ? (
                                <img
                                    src={globalLogoUrl}
                                    alt="Logo Bengkel"
                                    className="w-10 h-10 object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                                />
                            ) : (
                                <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform duration-300">
                                    <Wrench size={20} />
                                </div>
                            )}
                            <span className="text-lg font-black tracking-tighter text-slate-900 group-hover:text-primary transition-colors uppercase">
                                Bengkel Pro
                            </span>
                        </Link>
                    </div>

                    {/* Sidebar Navigation - Scrollable Area */}
                    <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 pt-6 pb-20 space-y-8">
                        {[
                            { id: 'utama', label: 'Utama', group: 'Utama' },
                            { id: 'layanan', label: 'Operasional', group: 'Operasional' },
                            { id: 'keuangan', label: 'Keuangan', group: 'Keuangan' },
                            { id: 'manajemen', label: 'Manajemen', group: 'Manajemen' },
                            { id: 'asisten', label: 'AI Helper', group: 'Asisten' },
                            { id: 'sistem', label: 'Sistem', group: 'Sistem' }
                        ].map((cat) => {
                            const groupItems = filteredNav.filter(item => item.group === cat.group);
                            if (groupItems.length === 0) return null;

                            return (
                                <div key={cat.id} className="space-y-3">
                                    <div className="px-4 flex items-center gap-3">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] whitespace-nowrap">
                                            {cat.label}
                                        </h3>
                                        <div className="h-[1px] w-full bg-slate-100" />
                                    </div>
                                    <div className="space-y-1">
                                        {groupItems.map((item) => {
                                            const isActive = pathname === item.href;

                                            let displayName = item.name;
                                            if (item.href === '/bookings-mitra' && userRole !== 'mitra') {
                                                const branchLower = branchName?.toLowerCase() || '';
                                                if (branchLower.includes('bsd') || branchLower.includes('depok')) {
                                                    displayName = 'Booking Mitra';
                                                }
                                            }

                                            return (
                                                <Link
                                                    key={item.name}
                                                    href={item.href}
                                                    onClick={() => setSidebarOpen(false)}
                                                    className={cn(
                                                        "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group relative",
                                                        isActive
                                                            ? "bg-primary text-white shadow-lg shadow-primary/30"
                                                            : "text-slate-600 hover:bg-slate-50 hover:text-primary active:scale-95"
                                                    )}
                                                >
                                                    <item.icon size={18} className={cn(
                                                        "transition-all duration-300",
                                                        isActive ? "text-white scale-110" : "text-slate-400 group-hover:text-primary group-hover:rotate-12"
                                                    )} />
                                                    <span className={cn(
                                                        "text-sm tracking-wide transition-colors",
                                                        isActive ? "font-bold" : "font-semibold"
                                                    )}>
                                                        {displayName}
                                                    </span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}

                        {!userRole && (
                            <div className="space-y-4 px-4 pt-4">
                                <div className="h-10 bg-slate-50 animate-pulse rounded-xl" />
                                <div className="h-10 bg-slate-50 animate-pulse rounded-xl shadow-inner" />
                            </div>
                        )}

                        {/* Logout Button in Scrollable Area */}
                        {userRole && (
                            <div className="pt-4 mt-4 border-t border-slate-100">
                                <button
                                    onClick={() => setShowLogoutModal(true)}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 transition-all duration-300 group active:scale-95"
                                >
                                    <LogOut size={18} className="transition-transform group-hover:-translate-x-1 shrink-0" />
                                    <span className="font-bold text-sm">Logout / Keluar</span>
                                </button>
                            </div>
                        )}
                    </nav>
                </div>
            </aside>
            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Topbar */}
                <header className="h-20 flex-shrink-0 flex items-center justify-between px-6 lg:px-10 border-b border-slate-200 bg-white z-30">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 lg:hidden text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <Menu size={24} />
                    </button>

                    <div className="flex-1 lg:ml-0 px-4">
                        <h1 className="text-lg font-semibold text-slate-900 truncate uppercase tracking-widest opacity-60">
                            {navigation.find(n => n.href === pathname)?.name || 'Dashboard'}
                        </h1>
                        {branchName && role === 'admin' && (
                            <p className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-0.5">
                                <Building2 size={12} />
                                {branchName}
                            </p>
                        )}
                    </div>

                    {/* Profile Section with Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="flex items-center gap-4 hover:bg-slate-100 p-2 rounded-2xl transition-all active:scale-95"
                        >
                            <div className="hidden sm:flex flex-col items-end mr-2">
                                <span className="text-sm font-bold text-slate-900">
                                    {profile?.full_name || 'User'}
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">
                                    {currentRole?.label || 'Memuat...'}
                                </span>
                            </div>
                            <div className={cn(
                                "w-11 h-11 rounded-2xl flex items-center justify-center shadow-inner border border-white/50",
                                currentRole?.bgColor || 'bg-slate-100'
                            )}>
                                <RoleIcon size={24} className={currentRole?.color || 'text-slate-400'} />
                            </div>
                        </button>

                        <AnimatePresence>
                            {isProfileOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setIsProfileOpen(false)}
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
                                    >
                                        {/* Header Dropdown */}
                                        <div className={cn("p-6 pb-4", currentRole?.bgColor || 'bg-slate-50')}>
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-lg">
                                                    <RoleIcon size={32} className={currentRole?.color || 'text-slate-400'} />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 text-lg leading-tight">{profile?.full_name}</p>
                                                    <Badge variant="neutral" className="mt-1 text-[10px]">{currentRole?.label || '-'}</Badge>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Content Dropdown */}
                                        <div className="p-6 space-y-5">
                                            {/* WhatsApp */}
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp</p>
                                                <div className="flex items-center gap-2 text-slate-700 font-bold">
                                                    <PhoneIcon size={16} className="text-emerald-500" />
                                                    {profile?.phone || '-'}
                                                </div>
                                            </div>

                                            {/* Referral Code */}
                                            {userRole === 'mitra' && profile?.referral_code && (
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode Referral</p>
                                                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 group">
                                                        <code className="text-primary font-black tracking-widest">{profile.referral_code}</code>
                                                        <button
                                                            onClick={() => copyReferral(profile.referral_code!)}
                                                            className="p-1.5 hover:bg-primary/10 rounded-lg text-primary transition-colors"
                                                        >
                                                            {copied ? <Check size={16} /> : <Copy size={16} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Bank Info */}
                                            {userRole === 'mitra' && (
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Rekening</p>
                                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                                            <Wallet size={16} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-black text-slate-700 uppercase tracking-tight truncate">
                                                                {profile?.bank_name || '-'}
                                                            </p>
                                                            <p className="text-xs text-slate-500 font-medium">
                                                                {profile?.bank_account_number || '-'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer Dropdown */}
                                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                                            <button
                                                onClick={() => { setIsProfileOpen(false); setShowLogoutModal(true); }}
                                                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-red-600 font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-colors"
                                            >
                                                <LogOut size={16} />
                                                Keluar / Logout
                                            </button>
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 xl:p-10">
                    {children}
                </div>
            </main>

            {/* Logout Confirmation Modal */}
            <AnimatePresence>
                {showLogoutModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => setShowLogoutModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative z-[101] w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 lg:p-10 text-center"
                        >
                            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                                <LogOut size={28} className="text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Yakin ingin keluar?</h3>
                            <p className="text-sm text-slate-500 mb-6">Anda akan keluar dari akun dan kembali ke halaman login.</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowLogoutModal(false)}
                                    className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={async () => {
                                        setLoggingOut(true);
                                        await signOut();
                                    }}
                                    disabled={loggingOut}
                                    className={`flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors flex items-center justify-center gap-2 ${loggingOut ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {loggingOut ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Memproses...
                                        </>
                                    ) : (
                                        'Ya, Keluar'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
