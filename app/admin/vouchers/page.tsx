"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { 
    Search, 
    CheckCircle2, 
    XCircle, 
    Loader2, 
    Gift, 
    User, 
    MapPin, 
    Calendar,
    ArrowRight,
    RefreshCw
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminVoucherPage() {
    const supabase = createClient();
    const [searchCode, setSearchCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [voucher, setVoucher] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [claiming, setClaiming] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchCode.trim()) return;

        setLoading(true);
        setError(null);
        setVoucher(null);
        setSuccess(false);

        try {
            const { data, error: fetchError } = await supabase
                .from("reward_vouchers")
                .select(`
                    *,
                    member:member_id(full_name, phone_number)
                `)
                .eq("voucher_code", searchCode.toUpperCase().trim())
                .single();

            if (fetchError) {
                if (fetchError.code === "PGRST116") {
                    throw new Error("Kode voucher tidak ditemukan.");
                }
                throw fetchError;
            }

            setVoucher(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClaim = async (branch: string) => {
        if (!voucher) return;
        if (voucher.status !== 'active') {
            alert("Voucher ini sudah tidak aktif atau sudah digunakan.");
            return;
        }

        if (!confirm(`Konfirmasi klaim reward "${voucher.reward_name}" di cabang ${branch}?`)) return;

        setClaiming(true);
        try {
            const { error: updateError } = await supabase
                .from("reward_vouchers")
                .update({
                    status: 'used',
                    redeemed_at: new Date().toISOString(),
                    branch_id: branch
                })
                .eq("id", voucher.id);

            if (updateError) throw updateError;

            setSuccess(true);
            setVoucher({ ...voucher, status: 'used', branch_id: branch, redeemed_at: new Date().toISOString() });
        } catch (err: any) {
            alert(`Gagal klaim: ${err.message}`);
        } finally {
            setClaiming(false);
        }
    };

    const resetSearch = () => {
        setSearchCode("");
        setVoucher(null);
        setError(null);
        setSuccess(false);
    };

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={["admin", "owner", "spv"]}>
                <div className="max-w-4xl mx-auto space-y-8 pb-20">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900">Validasi Voucher</h2>
                        <p className="text-slate-500 mt-1">Cek keaslian dan klaim reward member melalui kode voucher.</p>
                    </div>

                    {/* Search Bar */}
                    <Card className="p-2 rounded-[2rem] border-none shadow-2xl shadow-slate-200">
                        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input 
                                    type="text" 
                                    placeholder="Masukkan Kode Voucher (Contoh: BPRO-XXXXXX)" 
                                    className="w-full h-16 pl-14 pr-6 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-primary outline-none text-lg font-black uppercase tracking-widest placeholder:text-slate-300 placeholder:font-medium"
                                    value={searchCode}
                                    onChange={(e) => setSearchCode(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <Button 
                                type="submit" 
                                disabled={loading || !searchCode}
                                className="h-16 px-10 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-widest"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : "CEK VOUCHER"}
                            </Button>
                        </form>
                    </Card>

                    {/* Result Area */}
                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-50 border-2 border-red-100 p-6 rounded-[2rem] flex items-center gap-4 text-red-600"
                            >
                                <XCircle size={24} />
                                <span className="font-bold">{error}</span>
                            </motion.div>
                        )}

                        {voucher && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="space-y-6"
                            >
                                <Card className="overflow-hidden border-none shadow-2xl rounded-[3rem]">
                                    <div className={cn(
                                        "p-10 text-center text-white",
                                        voucher.status === 'active' ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-slate-400"
                                    )}>
                                        <div className="w-24 h-24 bg-white/20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 backdrop-blur-md shadow-inner">
                                            {voucher.status === 'active' ? <Gift size={48} /> : <CheckCircle2 size={48} />}
                                        </div>
                                        <h3 className="text-3xl font-black mb-2">{voucher.reward_name}</h3>
                                        <Badge variant={voucher.status === 'active' ? 'success' : 'secondary'} className="bg-white/20 border-none text-white px-4 py-1.5 rounded-full">
                                            {voucher.status === 'active' ? 'VOUCHER VALID & SIAP PAKAI' : 'VOUCHER SUDAH DIGUNAKAN'}
                                        </Badge>
                                    </div>

                                    <CardContent className="p-10">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            {/* Member Info */}
                                            <div className="space-y-6">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Informasi Member</h4>
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400"><User size={20} /></div>
                                                        <div>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap</p>
                                                            <p className="font-black text-slate-800">{voucher.member?.full_name || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400"><Calendar size={20} /></div>
                                                        <div>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Tanggal Penukaran</p>
                                                            <p className="font-black text-slate-800">{new Date(voucher.created_at).toLocaleString('id-ID')}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Voucher Detail */}
                                            <div className="space-y-6">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Detail Voucher</h4>
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400"><Gift size={20} /></div>
                                                        <div>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Kode Voucher</p>
                                                            <p className="font-black text-primary text-xl tracking-widest">{voucher.voucher_code}</p>
                                                        </div>
                                                    </div>
                                                    {voucher.status === 'used' && (
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500"><MapPin size={20} /></div>
                                                            <div>
                                                                <p className="text-[10px] font-bold text-emerald-500 uppercase">Diklaim Di Cabang</p>
                                                                <p className="font-black text-emerald-700">{voucher.branch_id} ({new Date(voucher.redeemed_at).toLocaleDateString('id-ID')})</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        {voucher.status === 'active' && !success && (
                                            <div className="mt-12 pt-10 border-t border-slate-100">
                                                <p className="text-center text-sm font-bold text-slate-500 mb-6">PILIH CABANG TEMPAT KLAIM:</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <Button 
                                                        onClick={() => handleClaim('BSD')}
                                                        disabled={claiming}
                                                        className="h-20 rounded-[1.5rem] bg-white border-2 border-slate-200 hover:border-primary hover:bg-primary/5 text-slate-800 transition-all group"
                                                    >
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase mb-1">Konfirmasi Di</span>
                                                            <span className="text-xl font-black group-hover:text-primary">CABANG BSD</span>
                                                        </div>
                                                    </Button>
                                                    <Button 
                                                        onClick={() => handleClaim('DEPOK')}
                                                        disabled={claiming}
                                                        className="h-20 rounded-[1.5rem] bg-white border-2 border-slate-200 hover:border-primary hover:bg-primary/5 text-slate-800 transition-all group"
                                                    >
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase mb-1">Konfirmasi Di</span>
                                                            <span className="text-xl font-black group-hover:text-primary">CABANG DEPOK</span>
                                                        </div>
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {success && (
                                            <div className="mt-12 p-8 bg-emerald-50 rounded-[2rem] border-2 border-emerald-100 text-center">
                                                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <CheckCircle2 size={32} />
                                                </div>
                                                <h4 className="text-2xl font-black text-emerald-800">Klaim Berhasil!</h4>
                                                <p className="text-sm font-medium text-emerald-600 mt-1">Reward sudah dicatat sebagai terpakai. Silakan berikan layanan kepada member.</p>
                                                <Button onClick={resetSearch} className="mt-6 bg-emerald-600 text-white font-bold px-8 h-12 rounded-xl">CEK VOUCHER LAIN</Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {!voucher && !loading && !error && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
                                <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 text-slate-200">
                                    <Search size={48} />
                                </div>
                                <p className="text-xl font-bold text-slate-300 uppercase tracking-widest">Menunggu Input Kode</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </RoleGuard>
        </DashboardLayout>
    );
}

// Helper for classNames
function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
