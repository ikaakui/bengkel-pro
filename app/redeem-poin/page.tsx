"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
    Search, Loader2, Gift, User, Star, CheckCircle2,
    Coins, ArrowRight, XCircle, Phone, Sparkles
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Reward {
    id: string;
    name: string;
    points_required: number;
    reward_type: string;
    description: string | null;
    is_active: boolean;
}

export default function RedeemPoinPage() {
    const { branchId, branchName } = useAuth();
    const supabase = createClient();

    // Member search
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedMember, setSelectedMember] = useState<any>(null);

    // Rewards
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loadingRewards, setLoadingRewards] = useState(false);

    // Redeem
    const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
    const [isRedeeming, setIsRedeeming] = useState(false);
    const [redeemSuccess, setRedeemSuccess] = useState(false);
    const [generatedVoucher, setGeneratedVoucher] = useState("");

    // Search members
    useEffect(() => {
        const search = async () => {
            if (!searchTerm || searchTerm.length < 3) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            const pattern = `%${searchTerm}%`;
            const { data } = await supabase
                .from("profiles")
                .select("id, full_name, phone_number, total_points")
                .eq("role", "member")
                .or(`full_name.ilike.${pattern},phone_number.ilike.${pattern}`)
                .order("full_name")
                .limit(8);
            if (data) setSearchResults(data);
            setIsSearching(false);
        };
        const timer = setTimeout(search, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch rewards when member selected
    useEffect(() => {
        const fetchRewards = async () => {
            if (!selectedMember) return;
            setLoadingRewards(true);

            const [rewardsRes, catalogRes] = await Promise.all([
                supabase.from("rewards").select("*").eq("is_active", true),
                supabase.from("catalog").select("*").gt("points_required", 0).eq("is_active", true)
            ]);

            const rewardsList = rewardsRes.data || [];
            const catalogList = (catalogRes.data || []).map((item: any) => ({
                ...item,
                reward_type: item.category === 'Service' ? 'free_service' : 'item'
            }));

            setRewards([...rewardsList, ...catalogList].sort((a, b) => a.points_required - b.points_required));
            setLoadingRewards(false);
        };
        fetchRewards();
    }, [selectedMember]);

    const handleSelectMember = (member: any) => {
        setSelectedMember(member);
        setSearchTerm("");
        setSearchResults([]);
        setSelectedReward(null);
        setRedeemSuccess(false);
    };

    const generateVoucherCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = 'BPRO-';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };

    const handleRedeem = async () => {
        if (!selectedMember || !selectedReward) return;

        if (selectedMember.total_points < selectedReward.points_required) {
            alert("Poin member tidak mencukupi untuk reward ini.");
            return;
        }

        if (!confirm(`Konfirmasi tukar ${selectedReward.points_required} poin untuk "${selectedReward.name}"?`)) return;

        setIsRedeeming(true);
        try {
            const voucherCode = generateVoucherCode();

            // 1. Create voucher
            const { error: vErr } = await supabase
                .from("reward_vouchers")
                .insert({
                    member_id: selectedMember.id,
                    reward_id: selectedReward.id,
                    reward_name: selectedReward.name,
                    voucher_code: voucherCode,
                    status: 'active'
                });
            if (vErr) throw vErr;

            // 2. Deduct points
            const newPoints = (selectedMember.total_points || 0) - selectedReward.points_required;
            const { error: pErr } = await supabase
                .from("profiles")
                .update({ total_points: newPoints })
                .eq("id", selectedMember.id);
            if (pErr) throw pErr;

            // 3. Log point transaction
            await supabase.from("point_transactions").insert({
                member_id: selectedMember.id,
                points: -selectedReward.points_required,
                type: 'redeem',
                description: `Admin Redeem: ${selectedReward.name} (${voucherCode}) di ${branchName}`
            });

            setSelectedMember({ ...selectedMember, total_points: newPoints });
            setGeneratedVoucher(voucherCode);
            setRedeemSuccess(true);
        } catch (err: any) {
            alert("Gagal redeem: " + err.message);
        } finally {
            setIsRedeeming(false);
        }
    };

    const handleReset = () => {
        setSelectedMember(null);
        setSelectedReward(null);
        setRedeemSuccess(false);
        setGeneratedVoucher("");
        setSearchTerm("");
    };

    const memberPoints = selectedMember?.total_points || 0;

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={["admin", "admin_depok", "admin_bsd", "owner", "spv"]}>
                <div className="max-w-3xl mx-auto space-y-8 pb-10">
                    {/* Header */}
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                                <Gift size={28} />
                            </div>
                            Redeem Poin Member
                        </h2>
                        <p className="text-slate-500 mt-2 font-medium ml-[52px]">
                            Proses penukaran poin member menjadi voucher reward di {branchName || "bengkel"}.
                        </p>
                    </div>

                    {/* Step 1: Search Member */}
                    {!selectedMember && (
                        <Card className="p-2 rounded-[2rem] border-none shadow-2xl shadow-slate-200">
                            <div className="relative">
                                <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Cari member... (nama atau no HP)"
                                    className="w-full h-16 pl-14 pr-6 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-amber-300 outline-none text-lg font-bold placeholder:text-slate-300 placeholder:font-medium"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                                {isSearching && <Loader2 size={20} className="absolute right-6 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
                            </div>
                            {searchResults.length > 0 && (
                                <div className="mt-2 divide-y divide-slate-50">
                                    {searchResults.map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => handleSelectMember(m)}
                                            className="w-full flex items-center justify-between p-5 hover:bg-amber-50 transition-colors rounded-2xl"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                                                    <User size={20} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-bold text-slate-900">{m.full_name}</p>
                                                    <p className="text-xs text-slate-500 flex items-center gap-1"><Phone size={10} /> {m.phone_number}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-black text-amber-600">{m.total_points || 0}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Poin</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {!searchTerm && searchResults.length === 0 && (
                                <div className="py-12 text-center">
                                    <Search size={48} className="mx-auto mb-4 text-slate-200" />
                                    <p className="text-slate-300 font-bold uppercase tracking-widest text-sm">Cari member untuk memulai</p>
                                </div>
                            )}
                        </Card>
                    )}

                    {/* Step 2: Member selected → show rewards */}
                    {selectedMember && !redeemSuccess && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            {/* Member info card */}
                            <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden">
                                <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-8 text-white flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-amber-200 uppercase tracking-widest">Member Terpilih</p>
                                        <h3 className="text-2xl font-black mt-1">{selectedMember.full_name}</h3>
                                        <p className="text-amber-100 text-sm font-medium mt-1">{selectedMember.phone_number}</p>
                                    </div>
                                    <div className="bg-white/20 rounded-2xl p-5 text-center backdrop-blur-sm">
                                        <Coins size={24} className="mx-auto mb-1" />
                                        <p className="text-3xl font-black">{memberPoints}</p>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-200">Poin</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-amber-50 flex items-center justify-between">
                                    <span className="text-xs font-bold text-amber-700">Pilih reward yang ingin ditukar:</span>
                                    <button onClick={handleReset} className="text-xs font-bold text-amber-500 hover:text-amber-700 underline">Ganti Member</button>
                                </div>
                            </Card>

                            {/* Rewards list */}
                            {loadingRewards ? (
                                <div className="py-12 flex justify-center">
                                    <Loader2 size={32} className="animate-spin text-amber-500" />
                                </div>
                            ) : rewards.length === 0 ? (
                                <div className="py-12 text-center text-slate-400">
                                    <Gift size={48} className="mx-auto mb-4 opacity-30" />
                                    <p className="font-bold">Belum ada reward tersedia.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {rewards.map(reward => {
                                        const canAfford = memberPoints >= reward.points_required;
                                        const isSelected = selectedReward?.id === reward.id;

                                        return (
                                            <button
                                                key={reward.id}
                                                onClick={() => canAfford && setSelectedReward(reward)}
                                                disabled={!canAfford}
                                                className={cn(
                                                    "p-6 rounded-[1.5rem] border-2 text-left transition-all",
                                                    isSelected
                                                        ? "border-amber-500 bg-amber-50 shadow-lg shadow-amber-100 scale-[1.02]"
                                                        : canAfford
                                                            ? "border-slate-100 bg-white hover:border-amber-300 hover:shadow-lg shadow-md"
                                                            : "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1">
                                                        <h4 className="font-black text-slate-900 text-sm">{reward.name}</h4>
                                                        {reward.description && (
                                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{reward.description}</p>
                                                        )}
                                                    </div>
                                                    {isSelected && <CheckCircle2 size={20} className="text-amber-500 shrink-0" />}
                                                </div>
                                                <div className="mt-4 flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 text-amber-600">
                                                        <Star size={14} />
                                                        <span className="text-sm font-black">{reward.points_required} Poin</span>
                                                    </div>
                                                    <Badge variant={canAfford ? "success" : "danger"} className="text-[9px]">
                                                        {canAfford ? "BISA DITUKAR" : "POIN KURANG"}
                                                    </Badge>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Redeem button */}
                            {selectedReward && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                    <Card className="border-2 border-amber-200 bg-amber-50 rounded-[2rem] p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Reward Dipilih</p>
                                                <p className="font-black text-slate-900 text-lg">{selectedReward.name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-black text-amber-600">{selectedReward.points_required}</p>
                                                <p className="text-[10px] font-black text-amber-400 uppercase">Poin</p>
                                            </div>
                                        </div>
                                        <div className="text-xs text-amber-700 bg-amber-100 p-3 rounded-xl mb-4 font-medium">
                                            Sisa poin member setelah penukaran: <strong>{memberPoints - selectedReward.points_required} poin</strong>
                                        </div>
                                        <Button
                                            onClick={handleRedeem}
                                            disabled={isRedeeming}
                                            className="w-full h-14 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-sm uppercase tracking-widest shadow-xl"
                                        >
                                            {isRedeeming ? (
                                                <><Loader2 size={20} className="animate-spin mr-2" /> Memproses...</>
                                            ) : (
                                                <><Sparkles size={20} className="mr-2" /> Tukarkan Poin Sekarang</>
                                            )}
                                        </Button>
                                    </Card>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* Step 3: Success */}
                    {redeemSuccess && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                            <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden">
                                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-10 text-center text-white">
                                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle2 size={40} />
                                    </div>
                                    <h3 className="text-2xl font-black">Redeem Berhasil!</h3>
                                    <p className="text-emerald-100 mt-2">Voucher telah diterbitkan untuk member.</p>
                                </div>
                                <CardContent className="p-8 space-y-6">
                                    <div className="bg-slate-50 rounded-2xl p-6 text-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Kode Voucher</p>
                                        <p className="text-3xl font-black text-primary tracking-[0.2em] font-mono">{generatedVoucher}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Member</p>
                                            <p className="font-bold text-slate-900">{selectedMember?.full_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reward</p>
                                            <p className="font-bold text-slate-900">{selectedReward?.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Poin Digunakan</p>
                                            <p className="font-bold text-amber-600">-{selectedReward?.points_required} poin</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sisa Poin</p>
                                            <p className="font-bold text-slate-900">{selectedMember?.total_points} poin</p>
                                        </div>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 font-medium">
                                        💡 Voucher ini bisa langsung digunakan saat transaksi melalui menu <strong>Validasi Voucher</strong>.
                                    </div>
                                    <Button onClick={handleReset} className="w-full h-14 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest">
                                        <ArrowRight size={18} className="mr-2" /> Redeem Member Lain
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </div>
            </RoleGuard>
        </DashboardLayout>
    );
}
