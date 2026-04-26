"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import { useAuth } from "@/components/providers/AuthProvider";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
    Loader2,
    Car,
    User,
    Clock,
    Wrench,
    CheckCircle2,
    Edit3,
    FileText,
    Search,
    Filter,
    ArrowRight,
    Package,
    Hash,
    CalendarDays,
    AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase-client";

interface QueueItem {
    id: string;
    customer_name: string;
    total_amount: number;
    status: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
    booking_id: string | null;
    booking?: {
        car_model: string;
        license_plate: string;
        booking_code: string;
        customer_phone: string;
    } | null;
    transaction_items: {
        id: string;
        qty: number;
        price_at_sale: number;
        catalog: {
            name: string;
            category: string;
        } | null;
    }[];
}

type FilterStatus = "all" | "Draft" | "In Progress" | "Paid";

export default function AntrianServicePage() {
    const [items, setItems] = useState<QueueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterStatus>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const router = useRouter();
    const { branchId, role } = useAuth();
    const supabase = createClient();

    const [resolvedBranchId, setResolvedBranchId] = useState<string | null>(null);

    // Pre-resolve branch ID once, instead of looking it up inside every fetchQueue call
    useEffect(() => {
        const resolveBranch = async () => {
            if (!role) {
                // If role is missing, we can't resolve branch, but we shouldn't
                // necessarily keep loading if RoleGuard is already done.
                // However, usually RoleGuard handles the wait.
                return;
            }

            if (branchId) {
                setResolvedBranchId(branchId);
                return;
            }
            // Fallback for branch-specific admins without branchId in auth context
            if (role === 'admin_bsd' || role === 'admin_depok') {
                const searchName = role === 'admin_bsd' ? 'BSD' : 'Depok';
                try {
                    const { data: bData } = await supabase.from("branches").select("id").ilike("name", `%${searchName}%`).single();
                    if (bData) {
                        setResolvedBranchId(bData.id);
                    } else {
                        setResolvedBranchId(''); // Fallback to show all if branch not found
                    }
                } catch (err) {
                    console.error("Branch resolve error:", err);
                    setResolvedBranchId('');
                }
            } else {
                // Owner/admin/spv — no branch filter needed, set to empty string to signal "show all"
                setResolvedBranchId('');
            }
        };
        resolveBranch();
    }, [branchId, role]);

    const fetchQueue = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("transactions")
                .select(`
                    *,
                    booking:booking_id(car_model, license_plate, booking_code, customer_phone),
                    transaction_items(id, qty, price_at_sale, catalog:catalog_id(name, category))
                `)
                .in("status", ["Draft", "In Progress", "Paid"])
                .order("created_at", { ascending: false })
                .limit(100);

            if (resolvedBranchId) {
                query = query.eq("branch_id", resolvedBranchId);
            } else if (resolvedBranchId === null) {
                // Branch not yet resolved — skip fetch
                setLoading(false);
                return;
            }
            // resolvedBranchId === '' means owner/admin — show all

            // Timeout 15s agar tidak stuck loading selamanya
            const { data, error } = await Promise.race([
                query,
                new Promise((_, reject) => setTimeout(() => reject(new Error("Request timeout")), 15000))
            ]) as any;

            if (error) throw error;
            if (data) {
                setItems(data as unknown as QueueItem[]);
            }
        } catch (err: any) {
            console.error("Fetch Queue Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (resolvedBranchId !== null) {
            fetchQueue();
        }
    }, [resolvedBranchId]);

    const filteredItems = items.filter(item => {
        const matchesFilter = filter === "all" || item.status === filter;
        const matchesSearch = !searchTerm ||
            item.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.booking?.license_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.booking?.booking_code?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock; bgClass: string; borderClass: string }> = {
        "Draft": { label: "Draft", color: "text-amber-600", icon: Edit3, bgClass: "bg-amber-50", borderClass: "border-amber-200" },
        "In Progress": { label: "Dikerjakan", color: "text-blue-600", icon: Wrench, bgClass: "bg-blue-50", borderClass: "border-blue-200" },
        "Paid": { label: "Selesai", color: "text-emerald-600", icon: CheckCircle2, bgClass: "bg-emerald-50", borderClass: "border-emerald-200" },
    };

    const counts = {
        all: items.length,
        Draft: items.filter(i => i.status === "Draft").length,
        "In Progress": items.filter(i => i.status === "In Progress").length,
        Paid: items.filter(i => i.status === "Paid").length,
    };

    const handleOpenInPOS = (item: QueueItem) => {
        const params = new URLSearchParams();
        params.set("draft_id", item.id);
        if (item.booking_id) {
            params.set("booking_id", item.booking_id);
        }
        router.push(`/pos?${params.toString()}`);
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        await supabase
            .from("transactions")
            .update({ status: newStatus })
            .eq("id", id);
        fetchQueue();
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    const filterTabs: { key: FilterStatus; label: string; icon: typeof Filter }[] = [
        { key: "all", label: "Semua", icon: Filter },
        { key: "Draft", label: "Draft", icon: Edit3 },
        { key: "In Progress", label: "Dikerjakan", icon: Wrench },
        { key: "Paid", label: "Selesai", icon: CheckCircle2 },
    ];

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={["owner", "admin", "admin_bsd", "admin_depok"]}>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">Antrian Service</h2>
                            <p className="text-sm text-slate-500 mt-1">Kelola semua transaksi service kendaraan</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {counts.Draft > 0 && (
                                <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-xl border border-amber-200">
                                    <AlertCircle size={16} />
                                    <span className="text-sm font-bold">{counts.Draft} draft menunggu</span>
                                </div>
                            )}
                            {counts["In Progress"] > 0 && (
                                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl border border-blue-200">
                                    <Wrench size={16} />
                                    <span className="text-sm font-bold">{counts["In Progress"]} dikerjakan</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex gap-2 flex-1 overflow-x-auto pb-1">
                            {filterTabs.map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setFilter(tab.key)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
                                        filter === tab.key
                                            ? "bg-primary text-white shadow-lg shadow-primary/20"
                                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                                    )}
                                >
                                    <tab.icon size={16} />
                                    {tab.label}
                                    <span className={cn(
                                        "text-xs px-2 py-0.5 rounded-full font-black",
                                        filter === tab.key
                                            ? "bg-white/20 text-white"
                                            : "bg-slate-100 text-slate-500"
                                    )}>
                                        {counts[tab.key]}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Cari customer, plat..."
                                className="input-field pl-10 text-sm py-2.5"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Queue List */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-30">
                            <Loader2 className="animate-spin mb-3" size={40} />
                            <p className="text-sm font-bold uppercase tracking-widest">Memuat antrian...</p>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Car size={64} strokeWidth={1} className="mb-4 opacity-30" />
                            <p className="font-bold text-lg">Tidak ada antrian</p>
                            <p className="text-sm mt-1">
                                {filter !== "all" ? `Belum ada transaksi dengan status "${filter}"` : "Belum ada transaksi service"}
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {filteredItems.map((item) => {
                                const config = statusConfig[item.status] || statusConfig["Draft"];
                                const StatusIcon = config.icon;
                                const serviceCount = item.transaction_items?.length || 0;

                                return (
                                    <Card key={item.id} className={cn(
                                        "p-0 overflow-hidden border-l-4 transition-all hover:shadow-lg",
                                        config.borderClass
                                    )}>
                                        <div className="p-5">
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                                {/* Left: Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", config.bgClass)}>
                                                            <StatusIcon size={20} className={config.color} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h3 className="font-black text-slate-900 text-lg truncate">
                                                                    {item.customer_name || "Guest"}
                                                                </h3>
                                                                <Badge variant={
                                                                    item.status === "Draft" ? "warning" :
                                                                        item.status === "In Progress" ? "info" : "success"
                                                                }>
                                                                    {config.label}
                                                                </Badge>
                                                            </div>
                                                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                                                <span className="flex items-center gap-1">
                                                                    <CalendarDays size={12} />
                                                                    {formatDate(item.created_at)}
                                                                </span>
                                                                {item.booking?.booking_code && (
                                                                    <span className="flex items-center gap-1 text-blue-500 font-mono font-bold">
                                                                        <Hash size={12} />
                                                                        {item.booking.booking_code}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Vehicle + Items info */}
                                                    <div className="flex flex-wrap items-center gap-2 sm:ml-[52px]">
                                                        {item.booking && (
                                                            <div className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg font-bold">
                                                                <Car size={14} />
                                                                {item.booking.car_model} • {item.booking.license_plate}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg font-bold">
                                                            <Package size={14} />
                                                            {serviceCount} item
                                                        </div>
                                                        {item.notes && (
                                                            <div className="flex items-center gap-1.5 text-xs bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg font-bold">
                                                                <FileText size={14} />
                                                                {item.notes}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Items preview */}
                                                    {serviceCount > 0 && (
                                                        <div className="sm:ml-[52px] mt-2 flex flex-wrap gap-1.5">
                                                            {item.transaction_items.slice(0, 3).map((ti) => (
                                                                <span key={ti.id} className="text-[11px] bg-white border border-slate-200 px-2 py-1 rounded-md text-slate-600">
                                                                    {ti.catalog?.name || "Item"} x{ti.qty}
                                                                </span>
                                                            ))}
                                                            {serviceCount > 3 && (
                                                                <span className="text-[11px] bg-slate-50 border border-slate-200 px-2 py-1 rounded-md text-slate-400 font-bold">
                                                                    +{serviceCount - 3} lainnya
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right: Price + Actions */}
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center lg:items-end gap-3 lg:gap-2 shrink-0 sm:ml-[52px] lg:ml-0 w-full sm:w-auto">
                                                    <div className="text-right">
                                                        <p className="text-xs text-slate-400 font-bold uppercase">Total</p>
                                                        <p className="text-xl font-black text-primary">
                                                            Rp {item.total_amount?.toLocaleString() || "0"}
                                                        </p>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                                        {item.status === "Draft" && (
                                                            <>
                                                                <Button
                                                                    className="text-xs px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm shadow-emerald-200"
                                                                    onClick={() => handleUpdateStatus(item.id, "In Progress")}
                                                                >
                                                                    <Wrench size={14} className="mr-1" />
                                                                    Mulai Kerjakan
                                                                </Button>
                                                                <Button
                                                                    className="text-xs px-3 py-2"
                                                                    onClick={() => handleOpenInPOS(item)}
                                                                >
                                                                    <Edit3 size={14} className="mr-1" />
                                                                    Edit di POS
                                                                </Button>
                                                            </>
                                                        )}
                                                        {item.status === "In Progress" && (
                                                            <Button
                                                                className="text-xs px-3 py-2"
                                                                onClick={() => handleOpenInPOS(item)}
                                                            >
                                                                <ArrowRight size={14} className="mr-1" />
                                                                Lanjut ke POS
                                                            </Button>
                                                        )}
                                                        {item.status === "Paid" && (
                                                            <Button
                                                                variant="outline"
                                                                className="text-xs px-3 py-2 text-emerald-600 border-emerald-200"
                                                                onClick={() => handleOpenInPOS(item)}
                                                            >
                                                                <FileText size={14} className="mr-1" />
                                                                Lihat Detail
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </RoleGuard>
        </DashboardLayout>
    );
}
