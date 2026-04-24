"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";
import {
    Building2,
    Plus,
    X,
    Loader2,
    CheckCircle2,
    MapPin,
    Phone,
    Pencil,
    Trash2,
    AlertTriangle,
    Users2,
    Shield,
    Crown,
    Mail,
    Lock,
    User,
    Key,
    Save,
    Image as ImageIcon,
    UploadCloud,
} from "lucide-react";

interface Branch {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    created_at: string;
}

interface UserProfile {
    id: string;
    full_name: string;
    role: string;
    phone: string | null;
    branch_id: string | null;
    created_at: string;
    email?: string;
}

export default function BranchesPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [branchAdmins, setBranchAdmins] = useState<Record<string, UserProfile[]>>({});
    const [owners, setOwners] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Global Settings
    const { refreshGlobalLogo, role } = useAuth();
    const [globalLogoUrl, setGlobalLogoUrl] = useState("");
    const [savingLogo, setSavingLogo] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Branch Form state
    const [showBranchForm, setShowBranchForm] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [branchName, setBranchName] = useState("");
    const [branchAddress, setBranchAddress] = useState("");
    const [branchPhone, setBranchPhone] = useState("");

    // Staff Form state
    const [showStaffForm, setShowStaffForm] = useState(false);
    const [staffRole, setStaffRole] = useState<"admin" | "owner">("admin");
    const [staffBranchId, setStaffBranchId] = useState("");
    const [staffName, setStaffName] = useState("");
    const [staffEmail, setStaffEmail] = useState("");
    const [staffPhone, setStaffPhone] = useState("");
    const [staffPassword, setStaffPassword] = useState("");

    // Modals
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteType, setDeleteType] = useState<"branch" | "staff">("branch");
    const [deleteId, setDeleteId] = useState("");
    const [deleteName, setDeleteName] = useState("");

    const [showResetModal, setShowResetModal] = useState(false);
    const [resetId, setResetId] = useState("");
    const [resetName, setResetName] = useState("");
    const [resetPassword, setResetPassword] = useState("");

    const supabase = createClient();

    const fetchData = async () => {
        setLoading(true);
        // Fetch branches
        const { data: bData } = await supabase
            .from("branches")
            .select("*")
            .order("created_at", { ascending: true });

        // Fetch owners and admins
        const { data: pData } = await supabase
            .from("profiles")
            .select("*")
            .in("role", ["owner", "admin"])
            .order("created_at", { ascending: false });

        if (bData) setBranches(bData);
        if (pData) {
            setOwners(pData.filter(p => p.role === "owner"));

            const adminsMap: Record<string, UserProfile[]> = {};
            pData.filter(p => p.role === "admin").forEach(admin => {
                if (admin.branch_id) {
                    if (!adminsMap[admin.branch_id]) adminsMap[admin.branch_id] = [];
                    adminsMap[admin.branch_id].push(admin);
                }
            });
            setBranchAdmins(adminsMap);
        }

        // Fetch global logo URL
        try {
            const { data: logoData } = await supabase
                .from("settings")
                .select("value")
                .eq("key", "global_logo_url")
                .single();
            if (logoData) {
                setGlobalLogoUrl(logoData.value);
            }
        } catch (err) {
            console.log("Settings table might not exist yet.");
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const resetBranchForm = () => {
        setBranchName("");
        setBranchAddress("");
        setBranchPhone("");
        setEditingBranch(null);
        setShowBranchForm(false);
        setError("");
    };

    const resetStaffForm = () => {
        setStaffName("");
        setStaffEmail("");
        setStaffPhone("");
        setStaffPassword("");
        setStaffBranchId("");
        setShowStaffForm(false);
        setError("");
    };

    const handleSaveLogo = async () => {
        setSavingLogo(true);
        setError("");

        try {
            // Check if settings table exists by doing an upside down insert
            const { error: saveError } = await supabase
                .from("settings")
                .upsert(
                    { key: "global_logo_url", value: globalLogoUrl, updated_at: new Date().toISOString() },
                    { onConflict: "key" }
                );

            if (saveError) {
                if (saveError.code === "42P01") {
                    throw new Error("Tabel settings belum ada. Mohon jalankan SQL Editor dari admin panel!");
                }
                throw saveError;
            }

            await refreshGlobalLogo();
            setSuccess("Logo global berhasil diperbarui!");
            setTimeout(() => setSuccess(""), 2000);
        } catch (err: any) {
            setError(err.message || "Gagal menyimpan logo.");
        }
        setSavingLogo(false);
    };

    const handleDeleteLogo = async () => {
        if (!window.confirm("Yakin ingin menghapus logo ini? (Invoice akan kembali menggunakan logo kunci pas)")) return;

        setSavingLogo(true);
        setError("");

        try {
            const { error: saveError } = await supabase
                .from("settings")
                .upsert(
                    { key: "global_logo_url", value: "", updated_at: new Date().toISOString() },
                    { onConflict: "key" }
                );

            if (saveError) throw saveError;

            setGlobalLogoUrl("");
            if (fileInputRef.current) fileInputRef.current.value = "";
            await refreshGlobalLogo();
            setSuccess("Logo berhasil dihapus!");
            setTimeout(() => setSuccess(""), 2000);
        } catch (err: any) {
            setError(err.message || "Gagal menghapus logo.");
        }
        setSavingLogo(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setError("Ukuran gambar logo maksimal 2MB!");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setGlobalLogoUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleBranchSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setError("");
        setSuccess("");

        try {
            const method = editingBranch ? "PATCH" : "POST";
            const body = editingBranch
                ? { id: editingBranch.id, name: branchName, address: branchAddress, phone: branchPhone }
                : { name: branchName, address: branchAddress, phone: branchPhone };

            const res = await fetch("/api/branches", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error);

            setSuccess(result.message);
            resetBranchForm();
            setTimeout(() => { setSuccess(""); fetchData(); }, 1000);
        } catch (err: any) {
            setError(err.message || "Terjadi kesalahan.");
        }
        setFormLoading(false);
    };

    const handleStaffSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setError("");
        setSuccess("");

        try {
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: staffEmail,
                    password: staffPassword,
                    full_name: staffName,
                    phone: staffPhone,
                    role: staffRole,
                    branch_id: staffRole === "admin" ? staffBranchId : null,
                }),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error);

            setSuccess(result.message);
            resetStaffForm();
            setTimeout(() => { setSuccess(""); fetchData(); }, 1000);
        } catch (err: any) {
            setError(err.message || "Gagal menambahkan user.");
        }
        setFormLoading(false);
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setError("");

        try {
            const res = await fetch("/api/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: resetId, newPassword: resetPassword }),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error);

            setSuccess(result.message);
            setShowResetModal(false);
            setResetPassword("");
            setTimeout(() => setSuccess(""), 1000);
        } catch (err: any) {
            setError(err.message);
        }
        setFormLoading(false);
    };

    const handleDelete = async () => {
        setFormLoading(true);
        setError("");

        try {
            const url = deleteType === "branch"
                ? `/api/branches?id=${deleteId}`
                : `/api/users?userId=${deleteId}`;

            const res = await fetch(url, { method: "DELETE" });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);

            setSuccess(result.message);
            setShowDeleteModal(false);
            setTimeout(() => { setSuccess(""); fetchData(); }, 1000);
        } catch (err: any) {
            setError(err.message);
        }
        setFormLoading(false);
    };

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={["owner", "spv"]}>
                <div className="space-y-10 pb-20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Manajemen Organisasi</h2>
                            <p className="text-slate-500 mt-1 font-medium">Kelola cabang, admin, dan struktur kepemilikan bengkel.</p>
                        </div>
                        {role === 'owner' && (
                            <div className="grid grid-cols-2 sm:flex gap-3 w-full sm:w-auto">
                                <Button
                                    onClick={() => { setStaffRole("owner"); setShowStaffForm(true); }}
                                    className="h-14 px-4 sm:px-8 rounded-2xl bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/25 text-white border-0 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all duration-300"
                                >
                                    <Crown size={20} className="sm:mr-1" />
                                    <span className="whitespace-nowrap font-black text-[13px] sm:text-base tracking-tight">Pemilik Baru</span>
                                </Button>
                                <Button
                                    onClick={() => { resetBranchForm(); setShowBranchForm(true); }}
                                    className="h-14 px-4 sm:px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 text-white border-0 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all duration-300"
                                >
                                    <Plus size={22} className="sm:mr-1" />
                                    <span className="whitespace-nowrap font-black text-[13px] sm:text-base tracking-tight">Tambah Cabang</span>
                                </Button>
                            </div>
                        )}
                    </div>

                    {success && (
                        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 font-bold flex items-center gap-3">
                            <CheckCircle2 size={20} /> {success}
                        </motion.div>
                    )}

                    {/* Section: Owners */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <Crown className="text-purple-500" size={20} />
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Daftar Pemilik (Owners)</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {owners.map(owner => (
                                <Card key={owner.id} className="relative overflow-hidden group border-purple-100 bg-purple-50/30 hover:shadow-xl transition-all duration-300">
                                    {role === 'owner' && (
                                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                            <button onClick={() => { setResetId(owner.id); setResetName(owner.full_name); setShowResetModal(true); }} className="p-2 bg-white/80 backdrop-blur shadow-sm rounded-xl text-slate-500 hover:text-amber-600 transition-colors">
                                                <Key size={14} />
                                            </button>
                                            <button onClick={() => { setDeleteType("staff"); setDeleteId(owner.id); setDeleteName(owner.full_name); setShowDeleteModal(true); }} className="p-2 bg-white/80 backdrop-blur shadow-sm rounded-xl text-slate-500 hover:text-red-500 transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                    <CardContent className="p-6 flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 shadow-inner">
                                            <Crown size={28} />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 text-lg">{owner.full_name}</p>
                                            <p className="text-sm text-slate-500 font-medium">{owner.phone || "No phone"}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </section>

                    {/* Section: Pengaturan Global */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <ImageIcon className="text-emerald-500" size={20} />
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Pengaturan Logo Struk/Invoice</h3>
                        </div>
                        {role === 'owner' && (
                            <Card className="border-emerald-100 bg-emerald-50/20 shadow-sm">
                                <CardContent className="p-5 sm:p-6">
                                    <div className="flex flex-col sm:flex-row gap-5 items-start">
                                        <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 bg-white border border-slate-200 rounded-2xl flex items-center justify-center p-2 shadow-inner">
                                            {globalLogoUrl ? (
                                                <img src={globalLogoUrl} alt="Preview Logo" className="max-w-full max-h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80?text=Error'; }} />
                                            ) : (
                                                <ImageIcon size={28} className="text-slate-300" />
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-3 w-full max-w-lg">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Logo Bengkel</label>
                                                <p className="text-xs text-slate-500 mb-1">Maks. 2MB. Logo ini akan digunakan di cetakan struk kasir.</p>
                                                <div className="text-[10px] text-slate-400 font-medium">
                                                    <p>• <b>Persegi (Kotak):</b> 300x300 s/d 500x500 px</p>
                                                    <p>• <b>Persegi Panjang:</b> 500x150 s/d 600x200 px</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="file"
                                                    accept="image/png, image/jpeg, image/webp"
                                                    ref={fileInputRef}
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                />
                                                <Button
                                                    variant="outline"
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="flex-1 h-11 bg-white border-2 border-emerald-100 hover:border-emerald-200 rounded-xl font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all justify-start text-emerald-700 px-4"
                                                >
                                                    <UploadCloud className="w-4 h-4 mr-2 shrink-0" />
                                                    <span className="truncate text-sm">Pilih Gambar...</span>
                                                </Button>
                                                <Button
                                                    onClick={handleSaveLogo}
                                                    disabled={savingLogo || !globalLogoUrl}
                                                    className="h-11 px-5 rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 border-0 text-white shrink-0 text-sm"
                                                >
                                                    {savingLogo ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                                                </Button>
                                                {globalLogoUrl && (
                                                    <Button
                                                        onClick={handleDeleteLogo}
                                                        disabled={savingLogo}
                                                        variant="outline"
                                                        title="Hapus Logo"
                                                        className="h-11 w-11 px-0 rounded-xl font-black border-2 border-red-100 hover:border-red-200 hover:bg-red-50 text-red-500 shrink-0 flex items-center justify-center transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </section>

                    {/* Section: Branches */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 px-2">
                            <Building2 className="text-blue-500" size={20} />
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Daftar Cabang & Admin</h3>
                        </div>
                        {loading ? (
                            <div className="py-20 text-center bg-white rounded-[2.5rem] border border-slate-100">
                                <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Memuat data organisasi...</p>
                            </div>
                        ) : branches.length === 0 ? (
                            <Card className="text-center py-12 border-dashed border-2">
                                <Building2 size={48} className="text-slate-200 mx-auto" />
                                <p className="text-slate-400 mt-4 font-bold uppercase tracking-widest text-xs">Belum ada cabang</p>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {branches.map((branch) => (
                                    <div key={branch.id} className="space-y-4">
                                        <Card className="hover:shadow-xl transition-all duration-300 border-slate-200 overflow-hidden">
                                            <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                                        <Building2 size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-slate-900">{branch.name}</h4>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Cabang Bengkel</p>
                                                    </div>
                                                </div>
                                                {role === 'owner' && (
                                                    <div className="flex gap-1">
                                                        <button onClick={() => { setEditingBranch(branch); setBranchName(branch.name); setBranchAddress(branch.address || ""); setBranchPhone(branch.phone || ""); setShowBranchForm(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button onClick={() => { setDeleteType("branch"); setDeleteId(branch.id); setDeleteName(branch.name); setShowDeleteModal(true); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <CardContent className="p-6 space-y-4">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-3 text-sm text-slate-600">
                                                        <MapPin size={16} className="text-slate-400" />
                                                        <span className="font-medium">{branch.address || "Alamat belum diatur"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-sm text-slate-600">
                                                        <Phone size={16} className="text-slate-400" />
                                                        <span className="font-medium">{branch.phone || "No phone"}</span>
                                                    </div>
                                                </div>

                                                <div className="pt-6 border-t border-slate-100">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                            <Shield size={12} className="text-blue-500" /> Admin Cabang
                                                        </p>
                                                        {role === 'owner' && (
                                                            <button onClick={() => { setStaffRole("admin"); setStaffBranchId(branch.id); setShowStaffForm(true); }} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1">
                                                                <Plus size={10} /> Tambah Admin
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="space-y-3">
                                                        {branchAdmins[branch.id]?.length > 0 ? (
                                                            branchAdmins[branch.id].map(admin => (
                                                                <div key={admin.id} className="flex items-center justify-between p-4 bg-slate-50/80 rounded-2xl border border-slate-100 hover:border-blue-200 transition-colors group">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                                                                            <Shield size={18} />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-black text-slate-900">{admin.full_name}</p>
                                                                            <p className="text-[10px] text-slate-500 font-bold">{admin.phone || admin.email || "No contact"}</p>
                                                                        </div>
                                                                    </div>
                                                                    {role === 'owner' && (
                                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button onClick={() => { setResetId(admin.id); setResetName(admin.full_name); setShowResetModal(true); }} className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors" title="Ubah Password">
                                                                                <Key size={14} />
                                                                            </button>
                                                                            <button onClick={() => { setDeleteType("staff"); setDeleteId(admin.id); setDeleteName(admin.full_name); setShowDeleteModal(true); }} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors" title="Hapus">
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Belum ada admin ditugaskan</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </RoleGuard>

            {/* Modal: Branch Form */}
            <AnimatePresence>
                {showBranchForm && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                            <div className="p-8 bg-gradient-to-br from-slate-50 to-white/50 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                        <Building2 size={24} />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900">{editingBranch ? "Edit Cabang" : "Tambah Cabang"}</h3>
                                </div>
                                <button onClick={resetBranchForm} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"><X size={24} /></button>
                            </div>
                            <form onSubmit={handleBranchSubmit} className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Cabang Bengkel</label>
                                        <div className="relative">
                                            <input type="text" value={branchName} onChange={(e) => setBranchName(e.target.value)} required placeholder="Contoh: Inka Otoservice Depok" className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Lengkap</label>
                                        <input type="text" value={branchAddress} onChange={(e) => setBranchAddress(e.target.value)} placeholder="Jl. Raya No. 123..." className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor Telepon Cabang</label>
                                        <input type="tel" value={branchPhone} onChange={(e) => setBranchPhone(e.target.value)} placeholder="0812..." className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" />
                                    </div>
                                </div>
                                {error && <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-600 font-bold flex items-center gap-2"><AlertTriangle size={14} /> {error}</div>}
                                <Button type="submit" disabled={formLoading} className="w-full h-14 rounded-2xl font-black text-base shadow-xl shadow-blue-500/20" variant="primary">
                                    {formLoading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" size={20} />}
                                    {editingBranch ? "Simpan Perubahan" : "Buat Cabang Sekarang"}
                                </Button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Staff Form */}
            <AnimatePresence>
                {showStaffForm && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                            <div className="p-8 bg-gradient-to-br from-slate-50 to-white/50 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${staffRole === 'owner' ? 'bg-purple-500 shadow-purple-500/20' : 'bg-blue-500 shadow-blue-500/20'}`}>
                                        {staffRole === 'owner' ? <Crown size={24} /> : <Shield size={24} />}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900">Tambah {staffRole === 'owner' ? "Pemilik" : "Admin"}</h3>
                                        {staffRole === 'admin' && staffBranchId && (
                                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Untuk: {branches.find(b => b.id === staffBranchId)?.name}</p>
                                        )}
                                    </div>
                                </div>
                                <button onClick={resetStaffForm} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"><X size={24} /></button>
                            </div>
                            <form onSubmit={handleStaffSubmit} className="p-8 space-y-6">
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                                        <div className="relative">
                                            <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input type="text" value={staffName} onChange={(e) => setStaffName(e.target.value)} required placeholder="Masukkan nama" className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-5 font-bold focus:ring-4 focus:border-primary/50 outline-none transition-all" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email (Untuk Login)</label>
                                        <div className="relative">
                                            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input type="email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} required placeholder="nama@email.com" className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-5 font-bold focus:ring-4 focus:border-primary/50 outline-none transition-all" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">No. WhatsApp</label>
                                        <div className="relative">
                                            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input type="tel" value={staffPhone} onChange={(e) => setStaffPhone(e.target.value)} placeholder="0812..." className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-5 font-bold focus:ring-4 focus:border-primary/50 outline-none transition-all" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input type="password" value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} required minLength={6} placeholder="Min. 6 karakter" className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-5 font-bold focus:ring-4 focus:border-primary/50 outline-none transition-all" />
                                        </div>
                                    </div>
                                </div>
                                {error && <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-600 font-bold flex items-center gap-2"><AlertTriangle size={14} /> {error}</div>}
                                <Button type="submit" disabled={formLoading} className={`w-full h-14 rounded-2xl font-black text-base shadow-xl ${staffRole === 'owner' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' : 'shadow-primary/20'}`}>
                                    {formLoading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" size={20} />}
                                    Simpan {staffRole === 'owner' ? "Pemilik" : "Admin"} Sekarang
                                </Button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Reset Password */}
            <AnimatePresence>
                {showResetModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 p-10">
                            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-6 mx-auto"><Key size={32} /></div>
                            <h3 className="text-2xl font-black text-slate-900 text-center mb-2">Ganti Password</h3>
                            <p className="text-slate-500 text-sm font-medium text-center mb-8">Untuk: <span className="font-bold text-slate-900">{resetName}</span></p>
                            <form onSubmit={handleResetPassword} className="space-y-6">
                                <input type="text" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} required placeholder="Password baru..." className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 text-center font-black tracking-widest focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all" />
                                <div className="flex gap-3">
                                    <Button type="button" variant="outline" onClick={() => setShowResetModal(false)} className="flex-1 h-14 rounded-2xl font-bold">Batal</Button>
                                    <Button type="submit" disabled={formLoading} className="flex-1 h-14 rounded-2xl font-black bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-200">Simpan</Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Delete Confirmation */}
            <AnimatePresence>
                {showDeleteModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 p-10 text-center">
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6 mx-auto"><AlertTriangle size={40} /></div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2">Hapus {deleteType === 'branch' ? "Cabang" : "Karyawan"}?</h3>
                            <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8 px-4">Yakin ingin menghapus <span className="font-black text-slate-900">"{deleteName}"</span>? Tindakan ini permanen dan tidak bisa dibatalkan.</p>
                            {error && <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-bold">{error}</div>}
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="flex-1 h-14 rounded-2xl font-bold">Batal</Button>
                                <Button onClick={handleDelete} disabled={formLoading} className="flex-1 h-14 rounded-2xl font-black bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200 text-white">Ya, Hapus</Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
}
