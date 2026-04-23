"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import POSProductGrid from "./components/POSProductGrid";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
    Search,
    Plus,
    Minus,
    Trash2,
    CreditCard,
    Ticket,
    User,
    ShoppingBag,
    Wrench,
    Package,
    Loader2,
    Car,
    Hash,
    X,
    Save,
    ArrowLeft,
    CheckCircle2,
    Edit3,
    FileText,
    AlertTriangle,
    AlertCircle,
    PieChart,
    Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase-client";

interface CatalogItem {
    id: string;
    name: string;
    category: 'Service' | 'Spare Part';
    price: number;
    cost_price: number;
    description: string;
    stock: number | null;
}

interface BookingData {
    id: string;
    customer_name: string;
    customer_phone: string;
    car_model: string;
    license_plate: string;
    booking_code: string;
    booking_type: string;
    mitra_id: string | null;
    mitra?: { full_name: string; referral_code: string } | null;
}

function POSContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const bookingId = searchParams.get("booking_id");
    const draftId = searchParams.get("draft_id");

    const [items, setItems] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState<(CatalogItem & { qty: number })[]>([]);
    const [memberCode, setMemberCode] = useState("");
    const [rewards, setRewards] = useState<any[]>([]);
    const [showRewardModal, setShowRewardModal] = useState(false);
    const [appliedReward, setAppliedReward] = useState<any>(null);
    const [customerPoints, setCustomerPoints] = useState(0);
    const [customerName, setCustomerName] = useState("");

    // Booking search state
    const [bookingSearchTerm, setBookingSearchTerm] = useState("");
    const [bookingResults, setBookingResults] = useState<any[]>([]);
    const [isSearchingBooking, setIsSearchingBooking] = useState(false);
    const [showBookingDropdown, setShowBookingDropdown] = useState(false);

    // Booking Conversion Prompts
    const [conversionPrompt, setConversionPrompt] = useState<{
        show: boolean;
        booking: any | null;
        message: string;
        title: string;
    }>({ show: false, booking: null, message: "", title: "" });

    // Booking data
    const [bookingData, setBookingData] = useState<BookingData | null>(null);
    const [loadingBooking, setLoadingBooking] = useState(false);

    // Draft data
    const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftId);
    const [draftStatus, setDraftStatus] = useState<string | null>(null);
    const [loadingDraft, setLoadingDraft] = useState(false);

    // Initial data for change detection
    const [initialCart, setInitialCart] = useState<any[]>([]);
    const [initialCustomerName, setInitialCustomerName] = useState("");

    // Feedback notifications
    const [saveFeedback, setSaveFeedback] = useState<{
        show: boolean;
        type: 'success' | 'warning' | 'info' | 'error';
        title: string;
        message: string;
    }>({ show: false, type: 'success', title: '', message: '' });

    const supabase = createClient();

    const [isProcessing, setIsProcessing] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);

    const fetchItems = async () => {
        setLoading(true);
        const { data } = await supabase
            .from("catalog")
            .select("*")
            .eq("is_active", true)
            .order("name", { ascending: true });

        if (data) setItems(data);

        const { data: rwData } = await supabase
            .from("rewards")
            .select("*")
            .eq("is_active", true)
            .order("points_required", { ascending: true });
        if (rwData) setRewards(rwData);

        setLoading(false);
    };

    // Fetch booking data if booking_id is in URL
    const fetchBookingData = async () => {
        if (!bookingId) return;
        setLoadingBooking(true);
        const { data, error } = await supabase
            .from("bookings")
            .select("*, mitra:mitra_id(full_name, referral_code)")
            .eq("id", bookingId)
            .single();

        if (data && !error) {
            setBookingData(data);
            setCustomerName(data.customer_name || "");
        }
        setLoadingBooking(false);
    };

    // Load existing draft if draft_id or booking_id is in URL
    const loadDraft = async () => {
        if (!draftId && !bookingId) return;
        setLoadingDraft(true);
        try {
            // First determine how we're fetching the draft
            let draft;
            if (draftId) {
                const { data } = await supabase
                    .from("transactions")
                    .select("*")
                    .eq("id", draftId)
                    .single();
                draft = data;
            } else if (bookingId) {
                // If only bookingId is present, try to find an existing draft for it
                const { data } = await supabase
                    .from("transactions")
                    .select("*")
                    .eq("booking_id", bookingId)
                    .neq("status", "Paid")
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .single();
                draft = data;
            }

            if (draft) {
                setCustomerName(draft.customer_name || "");
                setDraftStatus(draft.status);
                setCurrentDraftId(draft.id);

                // Fetch transaction items with catalog details
                const { data: draftItems } = await supabase
                    .from("transaction_items")
                    .select("*, catalog:catalog_id(*)")
                    .eq("transaction_id", draft.id);

                if (draftItems && draftItems.length > 0) {
                    const cartItems = draftItems.map((di: any) => ({
                        id: di.catalog?.id || di.catalog_id,
                        name: di.catalog?.name || "Item",
                        category: di.catalog?.category || "Service",
                        price: di.price_at_sale,
                        cost_price: di.cost_at_sale || 0,
                        description: di.catalog?.description || "",
                        stock: di.catalog?.stock ?? null,
                        qty: di.qty,
                    }));
                    setCart(cartItems);
                    setInitialCart(JSON.parse(JSON.stringify(cartItems)));
                }

                setInitialCustomerName(draft.customer_name || "");

                // Also load booking if linked
                if (draft.booking_id && !bookingId) {
                    const { data: bk } = await supabase
                        .from("bookings")
                        .select("*, mitra:mitra_id(full_name, referral_code)")
                        .eq("id", draft.booking_id)
                        .single();
                    if (bk) {
                        setBookingData(bk);
                    }
                }
            }
        } catch (err) {
            console.error("Error loading draft:", err);
        }
        setLoadingDraft(false);
    };

    useEffect(() => {
        const searchBookings = async () => {
            if (!bookingSearchTerm || bookingSearchTerm.length < 2) {
                setBookingResults([]);
                return;
            }
            setIsSearchingBooking(true);

            // Server-side search menggunakan ilike — jauh lebih efisien daripada fetch 500 lalu filter
            const searchPattern = `%${bookingSearchTerm}%`;
            const { data } = await supabase
                .from("bookings")
                .select("id, customer_name, license_plate, car_model, booking_code, booking_type, status, mitra_id")
                .or(`license_plate.ilike.${searchPattern},customer_name.ilike.${searchPattern},car_model.ilike.${searchPattern},booking_code.ilike.${searchPattern}`)
                .order("created_at", { ascending: false })
                .limit(8);

            if (data) {
                setBookingResults(data);
            }
            setIsSearchingBooking(false);
        };
        const timer = setTimeout(searchBookings, 500);
        return () => clearTimeout(timer);
    }, [bookingSearchTerm]);

    useEffect(() => {
        fetchItems();
    }, []);

    useEffect(() => {
        if (bookingId) {
            fetchBookingData();
        }
    }, [bookingId]);

    useEffect(() => {
        const fetchPoints = async () => {
            const mId = bookingData?.mitra_id;
            if (mId) {
                const { data } = await supabase.from('profiles').select('total_points').eq('id', mId).single();
                if (data) setCustomerPoints(data.total_points || 0);
            } else {
                setCustomerPoints(0);
            }
        };
        fetchPoints();
    }, [bookingData]);

    const addToCart = (item: any) => {
        const existing = cart.find(i => i.id === item.id);
        if (existing) {
            setCart(cart.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
        } else {
            setCart([...cart, { ...item, qty: 1 }]);
        }
    };

    const removeFromCart = (id: string) => {
        setCart(cart.filter(i => i.id !== id));
    };

    const updateQty = (id: string, delta: number) => {
        setCart(cart.map(i => {
            if (i.id === id) {
                const newQty = Math.max(1, i.qty + delta);
                return { ...i, qty: newQty };
            }
            return i;
        }));
    };

    const clearBooking = () => {
        setBookingData(null);
        setCustomerName("");
        // Remove booking_id from URL without reload
        window.history.replaceState({}, "", "/pos");
    };

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const discount = appliedReward ? (appliedReward.reward_type === 'discount' ? (appliedReward.discount_value || 0) : 0) : 0;
    const total = Math.max(0, subtotal - discount);

    const handleApplyReward = (reward: any) => {
        if (customerPoints < reward.points_required) {
            showFeedback('error', 'Poin tidak cukup!', `Dibutuhkan ${reward.points_required} poin.`);
            return;
        }
        setAppliedReward(reward);
        setShowRewardModal(false);
        showFeedback('success', 'Reward Berhasil Diterapkan!', `Diskon ${reward.name} telah dipasang.`);
    };

    // ======= SIMPAN DRAFT =======
    const showFeedback = (type: 'success' | 'warning' | 'info' | 'error', title: string, message: string) => {
        setSaveFeedback({ show: true, type, title, message });
        setTimeout(() => setSaveFeedback(prev => ({ ...prev, show: false })), 4000);
    };

    const handleSaveDraft = async () => {
        if (cart.length === 0) {
            showFeedback('error', 'Keranjang masih kosong! ⚠️', 'Belum ada item yang ditambahkan ke transaksi ini.');
            return;
        }

        setIsSavingDraft(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile } = await supabase.from('profiles').select('branch_id').eq('id', user?.id).single();

            if (currentDraftId) {
                // Check if anything actually changed
                const cartChanged = JSON.stringify(cart) !== JSON.stringify(initialCart);
                const nameChanged = customerName !== initialCustomerName;

                if (!cartChanged && !nameChanged) {
                    showFeedback('error', 'Tidak ada perubahan', 'Draft sudah sesuai dengan data terakhir yang disimpan.');
                    setIsSavingDraft(false);
                    return;
                }

                // UPDATE existing draft
                const { error: updateError } = await supabase
                    .from("transactions")
                    .update({
                        customer_name: customerName || "Guest",
                        total_amount: total,
                    })
                    .eq("id", currentDraftId);

                if (updateError) throw updateError;

                // Delete old items and re-insert
                await supabase
                    .from("transaction_items")
                    .delete()
                    .eq("transaction_id", currentDraftId);

                for (const item of cart) {
                    const { error: iError } = await supabase.from("transaction_items").insert({
                        transaction_id: currentDraftId,
                        catalog_id: item.id,
                        qty: item.qty,
                        price_at_sale: item.price,
                        cost_at_sale: item.cost_price || 0
                    });
                    if (iError) throw iError;
                }

                // Update initial state after successful save
                setInitialCart(JSON.parse(JSON.stringify(cart)));
                setInitialCustomerName(customerName);

                // Show success
                showFeedback('success', 'Draft berhasil diperbarui! ✅', 'Perubahan Anda telah tersimpan dengan aman.');
            } else {
                // CREATE new draft
                const { data: transaction, error: tError } = await supabase
                    .from("transactions")
                    .insert({
                        customer_name: customerName || "Guest",
                        total_amount: total,
                        branch_id: profile?.branch_id,
                        payment_method: "Cash",
                        status: "Draft",
                        ...(bookingData ? { booking_id: bookingData.id } : {}),
                    })
                    .select()
                    .single();

                if (tError) throw tError;

                // Insert items
                for (const item of cart) {
                    const { error: iError } = await supabase.from("transaction_items").insert({
                        transaction_id: transaction.id,
                        catalog_id: item.id,
                        qty: item.qty,
                        price_at_sale: item.price,
                        cost_at_sale: item.cost_price || 0
                    });
                    if (iError) throw iError;
                }

                setCurrentDraftId(transaction.id);
                setDraftStatus("Draft");
                setInitialCart(JSON.parse(JSON.stringify(cart)));
                setInitialCustomerName(customerName || "Guest");

                // Update URL
                const params = new URLSearchParams();
                params.set("draft_id", transaction.id);
                if (bookingId) params.set("booking_id", bookingId);
                window.history.replaceState({}, "", `/pos?${params.toString()}`);

                showFeedback('success', 'Draft baru berhasil disimpan! ✅', 'Data tersimpan, Anda bisa melanjutkannya nanti.');
            }
        } catch (error: any) {
            console.error("Save Draft Error:", error);
            showFeedback('error', 'Gagal menyimpan draft', error.message);
        } finally {
            setIsSavingDraft(false);
        }
    };

    // ======= BUAT INVOICE (Finalisasi) =======
    const handleCheckout = async () => {
        if (cart.length === 0) {
            showFeedback('error', 'Keranjang masih kosong! ⚠️', 'Belum ada item yang ditambahkan ke transaksi ini.');
            return;
        }
        setIsProcessing(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile } = await supabase.from('profiles').select('branch_id').eq('id', user?.id).single();
            const { data: pointSettings } = await supabase.from('app_settings').select('value').eq('key', 'points_per_rupiah').single();
            const pointsPerRupiah = Number(pointSettings?.value || 10000);

            let finalTransactionId = currentDraftId;

            if (currentDraftId) {
                // Finalize existing draft
                const { error: updateError } = await supabase
                    .from("transactions")
                    .update({
                        customer_name: customerName || "Guest",
                        total_amount: total,
                        status: "Paid",
                        payment_method: "Cash",
                    })
                    .eq("id", currentDraftId);

                if (updateError) throw updateError;

                // Delete old items and re-insert (in case items were changed)
                await supabase
                    .from("transaction_items")
                    .delete()
                    .eq("transaction_id", currentDraftId);

                for (const item of cart) {
                    const { error: iError } = await supabase.from("transaction_items").insert({
                        transaction_id: currentDraftId,
                        catalog_id: item.id,
                        qty: item.qty,
                        price_at_sale: item.price,
                        cost_at_sale: item.cost_price || 0
                    });
                    if (iError) throw iError;

                    // Update stock
                    if (item.category === 'Spare Part' && item.stock !== null) {
                        await supabase
                            .from("catalog")
                            .update({ stock: item.stock - item.qty })
                            .eq("id", item.id);
                    }
                }
            } else {
                // Direct checkout (no draft existed)
                const { data: transaction, error: tError } = await supabase
                    .from("transactions")
                    .insert({
                        customer_name: customerName || "Guest",
                        total_amount: total,
                        branch_id: profile?.branch_id,
                        payment_method: "Cash",
                        status: "Paid",
                        ...(bookingData ? { booking_id: bookingData.id } : {}),
                    })
                    .select()
                    .single();

                if (tError) throw tError;

                finalTransactionId = transaction.id;

                for (const item of cart) {
                    const { error: iError } = await supabase.from("transaction_items").insert({
                        transaction_id: transaction.id,
                        catalog_id: item.id,
                        qty: item.qty,
                        price_at_sale: item.price,
                        cost_at_sale: item.cost_price || 0
                    });
                    if (iError) throw iError;

                    if (item.category === 'Spare Part' && item.stock !== null) {
                        await supabase
                            .from("catalog")
                            .update({ stock: item.stock - item.qty })
                            .eq("id", item.id);
                    }
                }
            }

            // If from booking, auto-update booking status to completed
            if (bookingData) {
                await supabase
                    .from("bookings")
                    .update({ status: 'completed', updated_at: new Date().toISOString() })
                    .eq("id", bookingData.id);
            }

            // Point Earning Logic
            const memberId = bookingData?.mitra_id || null;
            if (memberId && total > 0) {
                const earnedPoints = Math.floor(total / pointsPerRupiah);
                if (earnedPoints > 0) {
                    // 1. Update Profile points
                    const { data: prof } = await supabase.from('profiles').select('total_points').eq('id', memberId).single();
                    await supabase
                        .from('profiles')
                        .update({ total_points: (prof?.total_points || 0) + earnedPoints })
                        .eq('id', memberId);

                    // 2. Log transaction
                    await supabase.from('point_transactions').insert({
                        member_id: memberId,
                        points: earnedPoints,
                        type: 'earn',
                        description: `Points earned from transaction #${finalTransactionId?.slice(0, 8)}`,
                        transaction_id: finalTransactionId
                    });
                }
            }

            // Deduct Points if reward applied
            if (appliedReward && memberId) {
                const { data: prof } = await supabase.from('profiles').select('total_points').eq('id', memberId).single();
                const currentTotal = prof?.total_points || 0;

                await supabase
                    .from('profiles')
                    .update({ total_points: currentTotal - appliedReward.points_required })
                    .eq('id', memberId);

                await supabase.from('point_transactions').insert({
                    member_id: memberId,
                    points: -appliedReward.points_required,
                    type: 'redeem',
                    description: `Redeemed reward: ${appliedReward.name}`,
                    transaction_id: finalTransactionId
                });
            }

            // Redirect to Invoice page
            if (finalTransactionId) {
                router.push(`/invoice/${finalTransactionId}`);
            } else {
                showFeedback('success', 'Transaksi Berhasil! ✅', 'Invoice telah dibuat.');
                setCart([]);
                setCustomerName("");
                setBookingData(null);
                setMemberCode("");
                setCurrentDraftId(null);
                setDraftStatus(null);
                window.history.replaceState({}, "", "/pos");
                fetchItems();
            }
        } catch (error: any) {
            console.error("Checkout Error:", error);
            showFeedback('error', 'Gagal memproses transaksi', error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // ======= CONVERT TO DIRECT (Reactivation) =======
    const handleReactivateAsDirect = async () => {
        if (!conversionPrompt.booking) return;
        const b = conversionPrompt.booking;

        // Populate manual POS form with historical data
        setCustomerName(b.customer_name);
        setBookingSearchTerm(b.license_plate);
        // Clear current active booking so it acts as Walk In manual entry
        setBookingData(null);
        setMemberCode("");

        // Hide UI
        setConversionPrompt({ show: false, booking: null, message: "", title: "" });

        // Show success info
        showFeedback('info', 'Data Berhasil Dipanggil! 📥', 'Silakan lanjutkan transaksi POS ini sebagai pelanggan Direct/Walk-in.');
    };

    // ======= BACK TO DASHBOARD =======
    const handleBackToDashboard = () => {
        router.push("/");
    };

    const handleBackToAntrian = () => {
        router.push("/antrian");
    };

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={["owner", "admin"]}>
                <div className="flex flex-col gap-4 lg:gap-6">
                    {/* Draft/Edit Mode Banner */}
                    {currentDraftId && (
                        <div className={cn(
                            "rounded-2xl p-4 border-2 flex items-center justify-between",
                            draftStatus === "In Progress"
                                ? "bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200"
                                : "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200"
                        )}>
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center",
                                    draftStatus === "In Progress" ? "bg-blue-100" : "bg-amber-100"
                                )}>
                                    {draftStatus === "In Progress"
                                        ? <Wrench size={20} className="text-blue-600" />
                                        : <Edit3 size={20} className="text-amber-600" />}
                                </div>
                                <div>
                                    <p className={cn(
                                        "text-xs font-black uppercase tracking-wider",
                                        draftStatus === "In Progress" ? "text-blue-500" : "text-amber-500"
                                    )}>
                                        {draftStatus === "In Progress" ? "Sedang Dikerjakan" : "Mode Edit Draft"}
                                    </p>
                                    <p className="text-sm font-bold text-slate-700">
                                        Anda bisa tambah/kurangi item lalu simpan kembali atau buat invoice
                                    </p>
                                </div>
                            </div>
                            <Badge variant={draftStatus === "In Progress" ? "info" : "warning"} className="text-xs">
                                {draftStatus || "Draft"}
                            </Badge>
                        </div>
                    )}

                    {/* Save Success/Feedback Banner */}
                    {saveFeedback.show && (
                        <div className={cn(
                            "fixed top-6 left-1/2 -translate-x-1/2 z-50 w-fit max-w-[90%] sm:min-w-[400px] shadow-2xl rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-8 border-2 transition-all duration-300",
                            saveFeedback.type === 'success' && "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 shadow-emerald-500/10",
                            saveFeedback.type === 'warning' && "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 shadow-amber-500/10",
                            saveFeedback.type === 'info' && "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-blue-500/10",
                            saveFeedback.type === 'error' && "bg-gradient-to-r from-rose-50 to-red-50 border-rose-200 shadow-rose-500/10"
                        )}>
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                saveFeedback.type === 'success' && "bg-emerald-100 text-emerald-600",
                                saveFeedback.type === 'warning' && "bg-amber-100 text-amber-600",
                                saveFeedback.type === 'info' && "bg-blue-100 text-blue-600",
                                saveFeedback.type === 'error' && "bg-rose-100 text-rose-600"
                            )}>
                                {saveFeedback.type === 'success' && <CheckCircle2 size={20} />}
                                {saveFeedback.type === 'warning' && <AlertTriangle size={20} />}
                                {saveFeedback.type === 'info' && <Edit3 size={20} />}
                                {saveFeedback.type === 'error' && <AlertCircle size={20} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={cn(
                                    "text-sm font-black truncate",
                                    saveFeedback.type === 'success' && "text-emerald-700",
                                    saveFeedback.type === 'warning' && "text-amber-700",
                                    saveFeedback.type === 'info' && "text-blue-700",
                                    saveFeedback.type === 'error' && "text-rose-700"
                                )}>
                                    {saveFeedback.title}
                                </p>
                                <p className={cn(
                                    "text-xs truncate",
                                    saveFeedback.type === 'success' && "text-emerald-600",
                                    saveFeedback.type === 'warning' && "text-amber-600",
                                    saveFeedback.type === 'info' && "text-blue-600",
                                    saveFeedback.type === 'error' && "text-rose-600"
                                )}>
                                    {saveFeedback.message}
                                </p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                {saveFeedback.type === 'success' && (
                                    <>
                                        <button
                                            onClick={handleBackToDashboard}
                                            className="flex items-center gap-1.5 text-xs font-bold bg-white text-slate-700 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                                        >
                                            <ArrowLeft size={14} />
                                            <span className="hidden sm:inline">Dashboard</span>
                                        </button>
                                        <button
                                            onClick={handleBackToAntrian}
                                            className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                                        >
                                            <FileText size={14} />
                                            <span className="hidden sm:inline">Antrian</span>
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => setSaveFeedback(prev => ({ ...prev, show: false }))}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Conversion Prompt Modal */}
                    {conversionPrompt.show && conversionPrompt.booking && (
                        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                                <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-amber-50 shrink-0">
                                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                                        <AlertTriangle size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-amber-900">{conversionPrompt.title}</h3>
                                        <p className="text-xs font-semibold text-amber-700/70 mt-0.5">{conversionPrompt.message}</p>
                                    </div>
                                </div>
                                <div className="p-5 space-y-4">
                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <p className="text-xs font-bold text-slate-400 uppercase">Customer</p>
                                            <p className="font-bold text-slate-900">{conversionPrompt.booking.customer_name}</p>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <p className="text-xs font-bold text-slate-400 uppercase">Kendaraan</p>
                                            <div className="text-right">
                                                <p className="font-bold text-slate-900">{conversionPrompt.booking.car_model}</p>
                                                <p className="font-mono text-xs font-black text-blue-600">{conversionPrompt.booking.license_plate}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        Dengan klik tombol di bawah, semua rincian pelanggan di atas akan dimuat secara otomatis ke nota Kasir sebagai <strong>pelanggan biasa (Direct)</strong>.
                                    </p>
                                </div>
                                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                                    <Button variant="outline" onClick={() => setConversionPrompt({ show: false, booking: null, message: "", title: "" })}>
                                        Batal
                                    </Button>
                                    <Button variant="success" onClick={handleReactivateAsDirect} className="gap-2">
                                        <User size={16} /> Daftar & Panggil Data
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                        </div>
                    )}

                    {/* Reward Selection Modal */}
                    {showRewardModal && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20"
                            >
                                <div className="p-6 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/20 rounded-xl">
                                            <Ticket size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black uppercase tracking-tight">Tukar Poin Reward</h3>
                                            <p className="text-xs font-bold text-white/70">Poin Anda: {customerPoints.toLocaleString()} PTS</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowRewardModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>
                                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                                    {rewards.length === 0 ? (
                                        <div className="text-center py-12 opacity-50">
                                            <Ticket size={48} className="mx-auto mb-4" />
                                            <p className="font-bold">Belum ada katalog reward.</p>
                                        </div>
                                    ) : (
                                        rewards.map((reward) => (
                                            <div
                                                key={reward.id}
                                                className={cn(
                                                    "p-4 rounded-2xl border-2 transition-all flex items-center justify-between group",
                                                    customerPoints >= reward.points_required
                                                        ? "border-amber-100 bg-amber-50/50 hover:border-amber-300"
                                                        : "border-slate-100 bg-slate-50 opacity-60 grayscale"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm",
                                                        customerPoints >= reward.points_required ? "bg-white text-amber-500" : "bg-slate-100 text-slate-400"
                                                    )}>
                                                        {reward.reward_type === 'discount' ? <Ticket size={24} /> : <Package size={24} />}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-slate-900 group-hover:text-amber-700 transition-colors">{reward.name}</h4>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{reward.points_required} POIN</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant={customerPoints >= reward.points_required ? "warning" : "neutral"}
                                                    disabled={customerPoints < reward.points_required}
                                                    onClick={() => handleApplyReward(reward)}
                                                    className="font-black text-[10px]"
                                                >
                                                    TUKAR
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                        *Reward akan memotong total tagihan saat ini
                                    </p>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {/* Loading Draft */}
                    {loadingDraft && (
                        <div className="flex items-center justify-center py-6 bg-amber-50 rounded-2xl border border-amber-200">
                            <Loader2 size={20} className="animate-spin text-amber-500 mr-2" />
                            <span className="text-sm font-bold text-amber-600">Memuat draft transaksi...</span>
                        </div>
                    )}

                    {/* Booking Info Banner */}
                    {loadingBooking && (
                        <div className="flex items-center justify-center py-6 bg-blue-50 rounded-2xl border border-blue-200">
                            <Loader2 size={20} className="animate-spin text-blue-500 mr-2" />
                            <span className="text-sm font-bold text-blue-600">Memuat data booking...</span>
                        </div>
                    )}

                    {bookingData && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4 sm:p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <Hash size={16} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-blue-500 font-bold uppercase tracking-wider">Transaksi dari Booking</p>
                                        <p className="font-mono font-black text-blue-800 text-sm">{bookingData.booking_code}</p>
                                    </div>
                                </div>
                                <button onClick={clearBooking} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Lepas booking">
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                <div className="bg-white/70 rounded-xl p-3">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Customer</p>
                                    <p className="font-bold text-slate-900 truncate">{bookingData.customer_name}</p>
                                    <p className="text-xs text-slate-500 font-mono">{bookingData.customer_phone}</p>
                                </div>
                                <div className="bg-white/70 rounded-xl p-3">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Kendaraan</p>
                                    <p className="font-bold text-slate-900 truncate">{bookingData.car_model}</p>
                                    <p className="text-xs text-slate-500 font-mono">{bookingData.license_plate}</p>
                                </div>
                                <div className="bg-white/70 rounded-xl p-3">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Tipe</p>
                                    <Badge variant={bookingData.booking_type === 'direct' ? 'neutral' : 'info'} className="text-[10px] mt-0.5">
                                        {bookingData.booking_type === 'direct' ? '🏷️ DIRECT' : '🤝 REFERRAL'}
                                    </Badge>
                                </div>
                                {bookingData.mitra && (
                                    <div className="bg-white/70 rounded-xl p-3">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Member</p>
                                        <p className="font-bold text-amber-700 truncate">{bookingData.mitra.full_name}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Main POS Layout */}
                    <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 lg:h-[calc(100vh-10rem)] lg:min-h-[650px] pb-20 lg:pb-4">
                        {/* Left: Product Selection */}
                        <div className="flex-1 flex flex-col gap-4 lg:gap-6 min-h-0 min-w-0">
                            {/* Customer Info Form (moved from right panel) */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative z-50">
                                {!bookingData && (
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3.5 text-blue-500" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Plat nomor"
                                            className="input-field pl-10 pr-2 text-sm py-2.5 border-blue-200 bg-blue-50/30 focus:bg-white focus:border-blue-500 transition-colors placeholder:text-blue-400/70 shadow-sm truncate"
                                            value={bookingSearchTerm}
                                            onChange={(e) => {
                                                setBookingSearchTerm(e.target.value);
                                                setShowBookingDropdown(true);
                                            }}
                                            onFocus={() => setShowBookingDropdown(true)}
                                            onBlur={() => setTimeout(() => setShowBookingDropdown(false), 200)}
                                        />
                                        {showBookingDropdown && bookingSearchTerm.length > 1 && (
                                            <div className="absolute z-10 w-[300px] xl:w-[400px] mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-[400px] overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2">
                                                {isSearchingBooking ? (
                                                    <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                                                        <Loader2 size={16} className="animate-spin text-blue-500" /> Sedang mencari kendaraan...
                                                    </div>
                                                ) : bookingResults.length > 0 ? (
                                                    <div className="p-1.5">
                                                        <div className="px-2 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                            Hasil Pencarian Booking
                                                        </div>
                                                        {bookingResults.map(b => (
                                                            <div
                                                                key={b.id}
                                                                className="p-3 hover:bg-blue-50/80 rounded-lg cursor-pointer transition-colors group border-b border-slate-100 last:border-0"
                                                                onClick={() => {
                                                                    // Check conversion rules
                                                                    if (b.booking_type === 'referral' || b.mitra_id) {
                                                                        setConversionPrompt({
                                                                            show: true,
                                                                            booking: b,
                                                                            title: "History Member",
                                                                            message: "Pelanggan ini sebelumnya terdaftar sebagai Member. Hubungkan kembali datanya?"
                                                                        });
                                                                        setShowBookingDropdown(false);
                                                                        setBookingSearchTerm("");
                                                                    } else if (b.status === 'completed' || b.status === 'cancelled') {
                                                                        setConversionPrompt({
                                                                            show: true,
                                                                            booking: b,
                                                                            title: "History Kunjungan Selesai",
                                                                            message: "Pelanggan ini sedang tidak dalam antrian. Ingin memanggil riwayat datanya?"
                                                                        });
                                                                        setShowBookingDropdown(false);
                                                                        setBookingSearchTerm("");
                                                                    } else {
                                                                        router.push(`/pos?booking_id=${b.id}`);
                                                                        setBookingSearchTerm("");
                                                                        setShowBookingDropdown(false);
                                                                    }
                                                                }}
                                                            >
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="flex items-center gap-2.5">
                                                                        <div className="px-2 py-1 bg-slate-800 text-white text-xs font-mono font-bold rounded shadow-sm group-hover:bg-blue-600 transition-colors">
                                                                            {b.license_plate}
                                                                        </div>
                                                                        <span className="text-sm font-bold text-slate-700">{b.car_model}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        {b.status === 'completed' && <Badge variant="success" className="text-[9px]">SELESAI/DRAFT</Badge>}
                                                                        {b.status === 'processing' && <Badge variant="info" className="text-[9px]">PROSES</Badge>}
                                                                        {b.status === 'pending' && <Badge variant="warning" className="text-[9px]">PENDING</Badge>}
                                                                        <Badge variant={b.booking_type === 'direct' ? 'neutral' : 'info'} className="text-[9px]">
                                                                            {b.booking_type === 'direct' ? 'DIRECT' : 'MEMBER'}
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-3 text-xs text-slate-500 bg-white/50 p-1.5 rounded-md border border-slate-100/50">
                                                                    <div className="flex items-center gap-1.5 truncate">
                                                                        <User size={12} className="text-slate-400 shrink-0" />
                                                                        <span className="truncate">{b.customer_name}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 shrink-0 ml-auto border-l border-slate-200 pl-3">
                                                                        <Hash size={12} className="text-slate-400" />
                                                                        <span className="font-mono">{b.booking_code}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="p-5 text-center">
                                                        <div className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-full mx-auto mb-3">
                                                            <Car size={20} className="text-slate-400" />
                                                        </div>
                                                        <p className="text-sm font-bold text-slate-700 mb-1">Mobil tidak ditemukan</p>
                                                        <p className="text-[11px] text-slate-500 leading-relaxed">
                                                            Pastikan plat nomor benar atau lanjutkan mengisi form manual di bawah.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className={cn("relative", bookingData ? "md:col-span-3" : "md:col-span-1")}>
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="nama pelanggan"
                                        className={cn("input-field pl-10 pr-2 text-sm py-2.5 truncate", bookingData && "bg-slate-100 text-slate-700 cursor-not-allowed")}
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        readOnly={!!bookingData}
                                    />
                                </div>

                                {!bookingData && (
                                    <div className="relative">
                                        <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Member ID"
                                            className="input-field pl-10 pr-2 text-sm py-2.5 truncate"
                                            value={memberCode}
                                            onChange={(e) => setMemberCode(e.target.value)}
                                        />
                                    </div>
                                )}
                                {bookingData && (
                                    <div className="flex items-center gap-2 text-xs text-blue-600 font-bold bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 shadow-sm md:col-span-3">
                                        <Car size={14} className="shrink-0" />
                                        <span className="truncate">{bookingData.car_model} • {bookingData.license_plate}</span>
                                        <span className="text-blue-400 ml-auto font-mono shrink-0">{bookingData.booking_code}</span>
                                    </div>
                                )}
                            </div>

                            <POSProductGrid items={items} loading={loading} onAddToCart={addToCart} />
                        </div>

                        {/* Right: Cart and Checkout */}
                        <Card className="w-full lg:w-[350px] xl:w-[400px] 2xl:w-[450px] shrink-0 lg:h-full flex flex-col p-0 overflow-visible lg:overflow-hidden shadow-xl border-primary/10 mb-2 lg:mb-0 max-h-[80vh] lg:max-h-none">
                            <CardHeader className="p-5 mb-0 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <ShoppingBag className="text-primary" />
                                    Checkout
                                </h3>
                                <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded-lg">{cart.length} ITEMS</span>
                            </CardHeader>

                            <CardContent className="flex-1 flex flex-col p-5 min-h-0">
                                {cart.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4 opacity-50 min-h-[250px] py-10">
                                        <ShoppingBag size={64} strokeWidth={1} />
                                        <p className="font-medium text-sm">Wah, keranjang masih kosong nih.</p>
                                    </div>
                                ) : (
                                    <div className="flex-1 overflow-y-auto pr-3 -mr-3 space-y-3 pb-2">
                                        {cart.map((item) => (
                                            <div key={item.id} className="flex flex-col gap-3 p-4 rounded-xl bg-white border border-slate-100 shadow-sm relative group overflow-hidden shrink-0">
                                                <div className="flex justify-between items-start gap-3">
                                                    <p className="font-semibold text-base text-slate-900 line-clamp-2 pr-8 flex-1 min-w-0">{item.name}</p>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}
                                                        className="absolute right-3 top-3 text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between mt-auto pt-2 gap-2">
                                                    <p className="text-base font-bold text-primary truncate">Rp {item.price.toLocaleString()}</p>
                                                    <div className="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-200 shrink-0">
                                                        <button onClick={(e) => { e.stopPropagation(); updateQty(item.id, -1); }} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-slate-200 text-slate-600 transition-colors">
                                                            <Minus size={16} />
                                                        </button>
                                                        <span className="text-base font-bold w-10 text-center">{item.qty}</span>
                                                        <button onClick={(e) => { e.stopPropagation(); updateQty(item.id, 1); }} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-slate-200 text-slate-600 transition-colors">
                                                            <Plus size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>

                            <CardFooter className="p-4 lg:p-6 lg:pb-8 mt-0 bg-slate-50/50 border-t border-slate-200 flex flex-col gap-3 sm:gap-4 shrink-0">

                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-slate-500 text-xs sm:text-sm">
                                        <span className="font-medium">Subtotal</span>
                                        <span className="font-mono">Rp {subtotal.toLocaleString()}</span>
                                    </div>
                                    {appliedReward && (
                                        <div className="flex justify-between text-rose-500 text-xs sm:text-sm font-bold">
                                            <div className="flex items-center gap-1">
                                                <Ticket size={14} />
                                                <span>Reward: {appliedReward.name}</span>
                                            </div>
                                            <span className="font-mono">-Rp {discount.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-lg font-bold text-slate-700">Total</span>
                                        <span className="text-2xl lg:text-3xl font-black text-primary">Rp {total.toLocaleString()}</span>
                                    </div>
                                </div>

                                {bookingData?.mitra_id && (
                                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-amber-500 shadow-sm">
                                                <PieChart size={16} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-amber-600 font-black uppercase">Poin Member</p>
                                                <p className="text-sm font-black text-amber-700">{customerPoints.toLocaleString()} PTS</p>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="warning"
                                            className="h-8 text-[10px] font-black px-3"
                                            onClick={() => setShowRewardModal(true)}
                                        >
                                            TUKAR
                                        </Button>
                                    </div>
                                )}

                                {/* 2-Button Layout: Save Draft + Buat Invoice */}
                                <div className="flex flex-col gap-2.5">
                                    <Button
                                        variant="warning"
                                        className="w-full py-3 text-sm font-bold tracking-wide text-white shadow-sm"
                                        disabled={cart.length === 0 || isSavingDraft}
                                        onClick={handleSaveDraft}
                                    >
                                        {isSavingDraft ? (
                                            <Loader2 className="animate-spin mr-2" size={18} />
                                        ) : (
                                            <Save className="mr-2" size={18} />
                                        )}
                                        {currentDraftId ? "UPDATE DRAFT" : "SIMPAN DRAFT"}
                                    </Button>

                                    <Button
                                        className="w-full py-3.5 text-sm sm:text-base font-bold tracking-wide shadow-md shadow-primary/20"
                                        disabled={cart.length === 0 || isProcessing}
                                        onClick={handleCheckout}
                                    >
                                        {isProcessing ? (
                                            <Loader2 className="animate-spin mr-2" />
                                        ) : (
                                            <CreditCard className="mr-2" size={20} />
                                        )}
                                        BUAT INVOICE
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </RoleGuard>
        </DashboardLayout>
    );
}

export default function POSPage() {
    return (
        <Suspense fallback={
            <DashboardLayout>
                <div className="flex items-center justify-center h-[60vh]">
                    <Loader2 size={32} className="animate-spin text-slate-300" />
                </div>
            </DashboardLayout>
        }>
            <POSContent />
        </Suspense>
    );
}
