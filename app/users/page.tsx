"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";
import {
    Users2,
    Plus,
    Search,
    Crown,
    Shield,
    UserCheck,
    Mail,
    Phone,
    User,
    Lock,
    X,
    Loader2,
    Copy,
    CheckCircle2,
    Eye,
    Landmark,
    CreditCard,
    History,
    Wallet,
    Trash2,
    AlertTriangle,
    AlertCircle,
    Building2,
    CalendarClock
} from "lucide-react";

interface UserProfile {
    id: string;
    full_name: string;
    role: string;
    phone: string | null;
    referral_code: string | null;
    branch_id: string | null;
    created_at: string;
}

interface BranchOption {
    id: string;
    name: string;
}

const roleIcons: Record<string, typeof Crown> = {
    owner: Crown,
    admin: Shield,
    member: UserCheck,
};

const roleColors: Record<string, string> = {
    owner: "bg-purple-100 text-purple-700",
    admin: "bg-blue-100 text-blue-700",
    member: "bg-amber-100 text-amber-700",
};

export default function UsersPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterRole, setFilterRole] = useState<string>("all");
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // New user form
    const [newName, setNewName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newRole, setNewRole] = useState("member");
    const [newBranchId, setNewBranchId] = useState("");

    // Branch list for selection
    const [branches, setBranches] = useState<BranchOption[]>([]);
    const [branchNames, setBranchNames] = useState<Record<string, string>>({});

    // Reset password state
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetUserId, setResetUserId] = useState("");
    const [resetTargetName, setResetTargetName] = useState("");
    const [resetPassword, setResetPassword] = useState("");

    // Member Detail State
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [memberBookings, setMemberBookings] = useState<any[]>([]);
    const [memberPoints, setMemberPoints] = useState<any[]>([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // Delete Mitra State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState("");
    const [deleteTargetName, setDeleteTargetName] = useState("");

    const { role: currentUserRole, branchId: currentBranchId } = useAuth();
    const supabase = createClient();

    const fetchUsers = async () => {
        setLoading(true);
        let query = supabase.from("profiles").select("*");
        
        // Non-owner only see members
        if (currentUserRole !== "owner") {
            query = query.eq("role", "member");
        }

        const { data, error } = await query.order("created_at", { ascending: false });

        if (data) {
            setUsers(data);
            setFilteredUsers(data);
        }
        setLoading(false);
    };

    const fetchBranches = async () => {
        const { data } = await supabase
            .from("branches")
            .select("id, name")
            .order("name");
        if (data) {
            setBranches(data);
            const names: Record<string, string> = {};
            data.forEach(b => { names[b.id] = b.name; });
            setBranchNames(names);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchBranches();
    }, []);

    useEffect(() => {
        let filtered = users;
        if (filterRole !== "all") {
            filtered = filtered.filter(u => u.role === filterRole);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(u =>
                u.full_name.toLowerCase().includes(q)
            );
        }
        setFilteredUsers(filtered);
    }, [searchQuery, filterRole, users]);

    const generateReferralCode = () => {
        const prefix = newName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 3);
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}-${random}`;
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setError("");
        setSuccess("");

        // Admin can only add member, owner can add both
        if (currentUserRole === "admin" && newRole !== "member") {
            setError("Admin hanya bisa menambahkan Member.");
            setFormLoading(false);
            return;
        }

        if (newPassword.length < 6) {
            setError("Password minimal 6 karakter.");
            setFormLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: newEmail,
                    password: newPassword,
                    full_name: newName,
                    phone: newPhone,
                    role: newRole,
                    branch_id: newRole === "admin" ? newBranchId : (currentBranchId || null),
                }),
            });

            const result = await res.json();

            if (!res.ok) {
                setError(result.error || "Gagal menambahkan user.");
                setFormLoading(false);
                return;
            }

            setSuccess(result.message);
            setNewName("");
            setNewEmail("");
            setNewPhone("");
            setNewPassword("");
            setNewRole("member");
            setNewBranchId("");
            setShowForm(false);

            // Refresh user list
            setTimeout(() => fetchUsers(), 1000);
        } catch (err) {
            setError("Gagal menambahkan user. Periksa koneksi Anda.");
        }

        setFormLoading(false);
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setError("");
        setSuccess("");

        try {
            const res = await fetch("/api/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: resetUserId,
                    newPassword: resetPassword,
                }),
            });

            const result = await res.json();

            if (!res.ok) {
                setError(result.error || "Gagal merubah password.");
                setFormLoading(false);
                return;
            }

            setSuccess(result.message);
            setResetPassword("");
            setShowResetModal(false);
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            setError("Terjadi kesalahan koneksi.");
        }
        setFormLoading(false);
    };

    const fetchMemberDetails = async (memberId: string) => {
        setIsLoadingDetails(true);
        try {
            // Fetch bookings
            const { data: bkData } = await supabase
                .from("bookings")
                .select("*")
                .eq("mitra_id", memberId) // still using mitra_id column for now
                .order("created_at", { ascending: false });
            if (bkData) setMemberBookings(bkData);

            // Fetch point transactions
            const { data: ptData } = await supabase
                .from("point_transactions")
                .select("*")
                .eq("member_id", memberId)
                .order("created_at", { ascending: false });
            if (ptData) setMemberPoints(ptData || []);
        } catch (err) {
            console.error("Error fetching member details:", err);
        }
        setIsLoadingDetails(false);
    };

    const handleViewDetails = (user: any) => {
        setSelectedMember(user);
        setShowDetailModal(true);
        fetchMemberDetails(user.id);
    };

    const handleDeleteMitra = async () => {
        if (!deleteTargetId) return;

        setFormLoading(true);
        try {
            const res = await fetch(`/api/users?userId=${deleteTargetId}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Gagal menghapus data mitra");
            } else {
                alert(data.message || "Data mitra berhasil dihapus");
                setShowDeleteModal(false);
                fetchUsers(); // Refresh list
            }
        } catch (err) {
            setError("Terjadi kesalahan saat menghapus data");
        }
        setFormLoading(false);
    };

    const copyReferralCode = (code: string) => {
        navigator.clipboard.writeText(code);
    };

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={["owner", "admin"]}>
                <div className="space-y-8 pb-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900">Data Member</h2>
                            <p className="text-slate-500 mt-1">Manajemen data pelanggan dan sistem poin.</p>
                        </div>
                        <Button onClick={() => setShowForm(!showForm)} className="h-12 px-6">
                            {showForm ? <X size={20} className="mr-2" /> : <Plus size={20} className="mr-2" />}
                            {showForm ? "Tutup" : "Tambah User"}
                        </Button>
                    </div>

                    {success && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 font-medium flex items-center gap-2">
                            <CheckCircle2 size={18} />
                            {success}
                        </div>
                    )}

                    {/* Add User Form */}
                    {showForm && (
                        <Card className="border-primary/20 bg-primary/5">
                            <CardHeader>
                                <h3 className="text-xl font-bold">Tambah User Baru</h3>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleAddUser} className="space-y-4">
                                    {error && (
                                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
                                            {error}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold opacity-70">Nama Lengkap</label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input
                                                    type="text"
                                                    value={newName}
                                                    onChange={(e) => setNewName(e.target.value)}
                                                    placeholder="Nama lengkap"
                                                    required
                                                    className="input-field pl-10"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold opacity-70">Email</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input
                                                    type="email"
                                                    value={newEmail}
                                                    onChange={(e) => setNewEmail(e.target.value)}
                                                    placeholder="email@contoh.com"
                                                    required
                                                    className="input-field pl-10"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold opacity-70">No. WhatsApp</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input
                                                    type="tel"
                                                    value={newPhone}
                                                    onChange={(e) => setNewPhone(e.target.value)}
                                                    placeholder="0812xxxxxxxx"
                                                    className="input-field pl-10"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold opacity-70">Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    placeholder="Min. 6 karakter"
                                                    required
                                                    minLength={6}
                                                    className="input-field pl-10"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <Button type="submit" disabled={formLoading} className="w-full md:w-auto h-11" variant="success">
                                        {formLoading ? <Loader2 size={18} className="animate-spin mr-2" /> : <Plus size={18} className="mr-2" />}
                                        {formLoading ? "Menyimpan..." : "Simpan User"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    )}

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari nama member..."
                                className="input-field pl-12 py-3"
                            />
                        </div>
                        <div className="flex gap-2">
                            {["all", "owner", "admin", "member"]
                                .filter(r => currentUserRole === "owner" || (r === "all" || r === "member"))
                                .map((r) => (
                                    <button
                                        key={r}
                                        onClick={() => setFilterRole(r)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filterRole === r
                                            ? "bg-primary text-white shadow-lg shadow-primary/20"
                                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                            }`}
                                    >
                                        {r === "all" ? "Semua" : r.charAt(0).toUpperCase() + r.slice(1)}
                                    </button>
                                ))}
                        </div>
                    </div>

                    {/* User List */}
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-slate-500 mt-3 text-sm">Memuat data user...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredUsers.length === 0 ? (
                                <Card className="text-center py-12">
                                    <Users2 size={48} className="text-slate-300 mx-auto" />
                                    <p className="text-slate-500 mt-4 font-medium">Belum ada user</p>
                                </Card>
                            ) : (
                                filteredUsers.map((user) => {
                                    const Icon = roleIcons[user.role] || UserCheck;
                                    return (
                                        <Card key={user.id} className="p-0 overflow-hidden">
                                            <div className="flex flex-col sm:flex-row items-stretch">
                                                <div className="p-5 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${roleColors[user.role]}`}>
                                                            <Icon size={22} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-lg text-slate-900">{user.full_name}</h4>
                                                            <p className="text-sm text-slate-500">
                                                                {user.phone || "No phone"} • Joined {new Date(user.created_at).toLocaleDateString("id-ID")}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                                                        {user.role === 'member' && (
                                                            <div className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-black flex items-center gap-1 border border-amber-100">
                                                                <PieChart size={12} />
                                                                {(user as any).total_points || 0} PTS
                                                            </div>
                                                        )}
                                                        {user.referral_code && (
                                                            <button
                                                                onClick={() => copyReferralCode(user.referral_code!)}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-mono font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                                                                title="Klik untuk copy"
                                                            >
                                                                <Copy size={12} />
                                                                {user.referral_code}
                                                            </button>
                                                        )}
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${roleColors[user.role]}`}>
                                                            <Icon size={12} />
                                                            {user.role}
                                                        </span>
                                                        {user.branch_id && branchNames[user.branch_id] && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                                                                <Building2 size={11} />
                                                                {branchNames[user.branch_id]}
                                                            </span>
                                                        )}
                                                        <div className="flex gap-1.5 sm:gap-2 ml-auto sm:ml-0">
                                                            <button
                                                                onClick={() => handleViewDetails(user)}
                                                                className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                                                title="Lihat Detail"
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setResetUserId(user.id);
                                                                    setResetTargetName(user.full_name);
                                                                    setShowResetModal(true);
                                                                    setError("");
                                                                }}
                                                                className="p-2 bg-slate-100 text-slate-500 hover:bg-amber-100 hover:text-amber-700 rounded-lg transition-colors"
                                                                title="Ganti Password"
                                                            >
                                                                <Lock size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setDeleteTargetId(user.id);
                                                                    setDeleteTargetName(user.full_name);
                                                                    setShowDeleteModal(true);
                                                                    setError("");
                                                                }}
                                                                className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                                                title="Hapus Member"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </RoleGuard>

            {/* Modal Reset Password */}
            {showResetModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
                                    <Lock size={20} />
                                </div>
                                <h3 className="font-bold text-slate-900">Ganti Password</h3>
                            </div>
                            <button onClick={() => setShowResetModal(false)} className="p-2 text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8">
                            <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Target User</p>
                                <p className="font-bold text-slate-900">{resetTargetName}</p>
                            </div>

                            {error && (
                                <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleResetPassword} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Password Baru</label>
                                    <input
                                        type="text"
                                        value={resetPassword}
                                        onChange={(e) => setResetPassword(e.target.value)}
                                        placeholder="Min. 6 karakter"
                                        required
                                        className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setShowResetModal(false)}
                                    >
                                        Batal
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        className="flex-1 shadow-lg border-2 border-amber-200"
                                        disabled={formLoading}
                                    >
                                        {formLoading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                                        Simpan
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

                    {/* Modal Detail Member */}
            {showDetailModal && selectedMember && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 md:p-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 40 }}
                        className="bg-white rounded-[2.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.15)] w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col border border-white/40"
                    >
                        {/* Header Section */}
                        <div className="p-5 sm:p-8 pb-8 sm:pb-10 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white relative shrink-0">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-400/20 rounded-full translate-y-24 -translate-x-24 blur-3xl" />

                            <div className="relative flex items-center justify-between">
                                <div className="flex items-start sm:items-center gap-4 sm:gap-6">
                                    <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-[2rem] bg-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl border border-white/30 ring-4 ring-white/10 shrink-0">
                                        <User size={28} className="text-white drop-shadow-md sm:hidden" />
                                        <User size={40} className="text-white drop-shadow-md hidden sm:block" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <Badge className="bg-white/20 text-white border-0 text-[10px] font-black uppercase tracking-[0.2em] py-1 px-3">
                                                {selectedMember.role}
                                            </Badge>
                                            <span className="text-[10px] text-amber-100/60 font-black uppercase tracking-widest bg-black/10 px-2 py-1 rounded-lg">ID: {selectedMember.id.slice(0, 8)}</span>
                                        </div>
                                        <h3 className="text-xl sm:text-3xl font-black tracking-tighter leading-none mb-2 break-words">{selectedMember.full_name}</h3>
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-amber-50/70 text-xs sm:text-sm font-bold">
                                            <div className="flex items-center gap-1.5">
                                                <Phone size={14} />
                                                {selectedMember.phone || "No phone"}
                                            </div>
                                            <div className="w-1 h-1 bg-white/30 rounded-full" />
                                            <div className="flex items-center gap-1.5">
                                                <History size={14} />
                                                Gabung {new Date(selectedMember.created_at).toLocaleDateString("id-ID", { month: 'short', year: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all hover:scale-110 active:scale-90 border border-white/5"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Content Area - Rounded Top to overlap header slightly */}
                        <div className="flex-1 overflow-y-auto p-5 sm:p-8 lg:p-10 -mt-6 bg-white rounded-t-[2rem] sm:rounded-t-[3rem] relative z-10 space-y-8 sm:space-y-12 custom-scrollbar">                             {/* Summary Grid */}
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                 {/* Points Info Card */}
                                 <div className="space-y-6">
                                     <h4 className="flex items-center gap-3 text-xs font-black text-slate-400 uppercase tracking-[0.25em]">
                                         <PieChart size={14} />
                                         Ringkasan Poin
                                     </h4>
                                     <Card className="p-6 border-amber-100 bg-amber-50/50 rounded-3xl group hover:border-amber-200 transition-colors shadow-none">
                                         <div className="flex items-center gap-4">
                                             <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-amber-500 shadow-sm border border-amber-100">
                                                 <PieChart size={32} />
                                             </div>
                                             <div>
                                                 <p className="text-[10px] font-black text-amber-600/60 uppercase tracking-widest leading-none mb-1">Total Poin</p>
                                                 <p className="text-4xl font-black text-amber-700 leading-none">{selectedMember.total_points || 0}</p>
                                             </div>
                                         </div>
                                     </Card>
                                 </div>

                                 {/* Statistics Card */}
                                 <div className="space-y-6">
                                     <h4 className="flex items-center gap-3 text-xs font-black text-slate-400 uppercase tracking-[0.25em]">
                                         <History size={14} />
                                         Statistik Kunjungan
                                     </h4>
                                     <Card className="p-6 border-slate-100 bg-slate-50/30 rounded-3xl shadow-none">
                                         <div className="grid grid-cols-2 gap-4">
                                             <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Servis</p>
                                                 <p className="text-2xl font-black text-slate-900 leading-none">{memberBookings.length}</p>
                                             </div>
                                             <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Transaksi</p>
                                                 <p className="text-2xl font-black text-slate-900 leading-none">{memberBookings.filter(b => b.status === "completed").length}</p>
                                             </div>
                                         </div>
                                     </Card>
                                 </div>
                             </div>


                            {/* Detailed List Tabs/Tables */}
                            <div className="space-y-8">
                                 <div className="space-y-4">
                                     <div className="flex items-center justify-between">
                                         <h4 className="flex items-center gap-3 text-xs font-black text-slate-400 uppercase tracking-[0.25em]">
                                             <CalendarClock size={16} className="text-slate-400" />
                                             Riwayat Servis ({memberBookings.length})
                                         </h4>
                                     </div>
                                     <Card className="p-0 overflow-hidden border-slate-100 rounded-3xl shadow-none">
                                         <div className="overflow-x-auto">
                                             <table className="w-full text-left">
                                                 <thead className="bg-slate-50/50 border-b border-slate-100">
                                                     <tr>
                                                         <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Layanan</th>
                                                         <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Tanggal</th>
                                                         <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Status</th>
                                                     </tr>
                                                 </thead>
                                                 <tbody className="divide-y divide-slate-100">
                                                     {memberBookings.length === 0 ? (
                                                         <tr>
                                                             <td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-bold italic">Belum ada riwayat servis</td>
                                                         </tr>
                                                     ) : (
                                                         memberBookings.map((bk) => (
                                                             <tr key={bk.id} className="hover:bg-slate-50/50 transition-all group">
                                                                 <td className="px-6 py-4">
                                                                     <p className="font-black text-slate-900 group-hover:text-amber-600 transition-colors uppercase tracking-tight">{bk.car_model}</p>
                                                                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{bk.license_plate}</p>
                                                                 </td>
                                                                 <td className="px-6 py-4">
                                                                     <p className="text-sm text-slate-600 font-black">
                                                                         {new Date(bk.service_date).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                     </p>
                                                                 </td>
                                                                 <td className="px-6 py-4 text-right">
                                                                     <Badge variant={bk.status === 'completed' ? 'success' : bk.status === 'pending' ? 'warning' : 'danger'} className="font-black uppercase text-[9px] py-1 px-3">
                                                                         {bk.status}
                                                                     </Badge>
                                                                 </td>
                                                             </tr>
                                                         ))
                                                     )}
                                                 </tbody>
                                             </table>
                                         </div>
                                     </Card>
                                 </div>

                                 <div className="space-y-4">
                                     <h4 className="flex items-center gap-3 text-xs font-black text-slate-400 uppercase tracking-[0.25em]">
                                         <PieChart size={16} className="text-slate-400" />
                                         Riwayat Poin ({memberPoints.length})
                                     </h4>
                                     <Card className="p-0 overflow-hidden border-slate-100 rounded-3xl shadow-none">
                                         <div className="overflow-x-auto">
                                             <table className="w-full text-left">
                                                 <thead className="bg-slate-50/50 border-b border-slate-100">
                                                     <tr>
                                                         <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Keterangan</th>
                                                         <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Poin</th>
                                                     </tr>
                                                 </thead>
                                                 <tbody className="divide-y divide-slate-100">
                                                     {memberPoints.length === 0 ? (
                                                         <tr>
                                                             <td colSpan={2} className="px-6 py-12 text-center text-slate-400 font-bold italic">Belum ada riwayat poin</td>
                                                         </tr>
                                                     ) : (
                                                         memberPoints.map((pt) => (
                                                             <tr key={pt.id} className="hover:bg-slate-50/50 transition-all group">
                                                                 <td className="px-6 py-4">
                                                                     <p className="font-black text-slate-900 uppercase tracking-tight">{pt.description}</p>
                                                                     <p className="text-[10px] text-slate-400 font-bold">
                                                                         {new Date(pt.created_at).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                     </p>
                                                                 </td>
                                                                 <td className="px-6 py-4 text-right">
                                                                     <p className={`font-black ${pt.points >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                                         {pt.points >= 0 ? '+' : ''}{pt.points}
                                                                     </p>
                                                                 </td>
                                                             </tr>
                                                         ))
                                                     )}
                                                 </tbody>
                                             </table>
                                         </div>
                                     </Card>
                                 </div>
                            </div>
                        </div>

                        {/* Footer Section */}
                        <div className="p-8 sm:px-10 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="px-12 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(37,99,235,0.3)] hover:shadow-[0_20px_50px_rgba(37,99,235,0.5)] hover:scale-105 active:scale-95 transition-all outline-none"
                            >
                                Tutup Panel Detail
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Modal Konfirmasi Hapus Mitra */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
                    >
                        <div className="p-8 text-center space-y-6">
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-600 animate-pulse">
                                <AlertTriangle size={40} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-slate-900">Hapus Data Member?</h3>
                                <p className="text-slate-500 text-sm leading-relaxed px-4">
                                    Yakin ingin menghapus <span className="font-bold text-slate-900 italic">"{deleteTargetName}"</span>?
                                    Semua akses, profil, dan riwayat poin akan dihapus secara permanen.
                                </p>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-bold flex items-center gap-2">
                                    <AlertCircle size={14} />
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <Button
                                    onClick={() => setShowDeleteModal(false)}
                                    variant="outline"
                                    className="flex-1 py-4 rounded-2xl font-bold"
                                    disabled={formLoading}
                                >
                                    Batal
                                </Button>
                                <Button
                                    onClick={handleDeleteMitra}
                                    variant="danger"
                                    className="flex-1 py-4 rounded-2xl font-bold shadow-lg shadow-red-200"
                                    disabled={formLoading}
                                >
                                    {formLoading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                                    {formLoading ? "Menghapus..." : "Ya, Hapus Data"}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </DashboardLayout>
    );
}
