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
    Building2
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
};

const roleColors: Record<string, string> = {
    owner: "bg-purple-100 text-purple-700",
    admin: "bg-blue-100 text-blue-700",
};

export default function StaffPage() {
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
    const [newRole, setNewRole] = useState("admin");
    const [newBranchId, setNewBranchId] = useState("");

    // Branch list for selection
    const [branches, setBranches] = useState<BranchOption[]>([]);
    const [branchNames, setBranchNames] = useState<Record<string, string>>({});

    // Reset password state
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetUserId, setResetUserId] = useState("");
    const [resetTargetName, setResetTargetName] = useState("");
    const [resetPassword, setResetPassword] = useState("");

    // Delete User State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState("");
    const [deleteTargetName, setDeleteTargetName] = useState("");

    const { role: currentUserRole, branchId: currentBranchId } = useAuth();
    const supabase = createClient();

    const fetchUsers = async () => {
        setLoading(true);
        // Fetch commission rate first
        const { data: settings } = await supabase
            .from("app_settings")
            .select("value")
            .eq("key", "commission_rate")
            .single();
        if (settings) setCommissionRate(Number(settings.value));

        let query = supabase.from("profiles").select("*").in("role", ["owner", "admin"]);

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
                u.full_name.toLowerCase().includes(q) ||
                u.referral_code?.toLowerCase().includes(q)
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
            setNewRole("admin");
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

    const handleDeleteUser = async () => {
        if (!deleteTargetId) return;

        setFormLoading(true);
        try {
            const res = await fetch(`/api/users?userId=${deleteTargetId}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Gagal menghapus data user");
            } else {
                alert(data.message || "Data user berhasil dihapus");
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
            <RoleGuard allowedRoles={["owner"]}>
                <div className="space-y-8 pb-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900">Data Karyawan & Admin</h2>
                            <p className="text-slate-500 mt-1">Manajemen staf internal, admin cabang, dan pemilik.</p>
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
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold opacity-70">Role</label>
                                        <div className="flex gap-3">
                                            
                                            {currentUserRole === "owner" && (
                                                <button
                                                    type="button"
                                                    onClick={() => setNewRole("admin")}
                                                    className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all ${newRole === "admin"
                                                        ? "border-blue-500 bg-blue-50 text-blue-700"
                                                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                                                        }`}
                                                >
                                                    <Shield size={16} className="inline mr-2" />
                                                    Admin
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {/* Branch selection for admin */}
                                    {newRole === "admin" && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold opacity-70">Cabang *</label>
                                            <div className="relative">
                                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <select
                                                    value={newBranchId}
                                                    onChange={(e) => setNewBranchId(e.target.value)}
                                                    required
                                                    className="input-field pl-10 appearance-none"
                                                >
                                                    <option value="">Pilih Cabang...</option>
                                                    {branches.map((b) => (
                                                        <option key={b.id} value={b.id}>{b.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}
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
                                placeholder="Cari nama atau kode referral..."
                                className="input-field pl-12 py-3"
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            {["all", "owner", "admin"]
                                .map((r) => (
                                    <button
                                        key={r}
                                        onClick={() => setFilterRole(r)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${filterRole === r
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
                                                    <div className="flex items-center gap-4">
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
                                                        <div className="flex gap-2">
                                                            
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
                                                                title="Hapus User"
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

            {/* Modal Konfirmasi Hapus Staff */}
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
                                <h3 className="text-2xl font-black text-slate-900">Hapus Data Karyawan & Admin?</h3>
                                <p className="text-slate-500 text-sm leading-relaxed px-4">
                                    Yakin ingin menghapus <span className="font-bold text-slate-900 italic">"{deleteTargetName}"</span>?
                                    Semua akses dan profil akan dihapus secara permanen. Tindakan tidak dapat dibatalkan.
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
                                    onClick={handleDeleteUser}
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
