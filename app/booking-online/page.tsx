"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RoleGuard from "@/components/auth/RoleGuard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Calendar, 
    Clock, 
    MapPin, 
    Car, 
    CheckCircle2, 
    Loader2, 
    ChevronRight, 
    CalendarCheck,
    Wrench,
    AlertCircle,
    Check,
    PlusCircle
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";

const TIME_SLOTS = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];

const DEFAULT_BRANCHES = [
    { id: "depok", name: "Inka Otoservice Depok", address: "Jl. Raya Depok No. 1, Kota Depok" },
    { id: "bsd", name: "Inka Otoservice BSD", address: "BSD City, Tangerang Selatan" }
];

export default function BookingOnlinePage() {
    const { profile } = useAuth();
    const router = useRouter();
    const supabase = createClient();

    const [step, setStep] = useState(1);
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State
    const [selectedBranch, setSelectedBranch] = useState<any>(null);
    const [carModel, setCarModel] = useState("");
    const [licensePlate, setLicensePlate] = useState("");
    const [serviceDate, setServiceDate] = useState("");
    const [serviceTime, setServiceTime] = useState("");
    const [bookedTimes, setBookedTimes] = useState<string[]>([]);
    const [bookingCode, setBookingCode] = useState("");

    const fetchData = useCallback(async () => {
        setLoading(true);
        const { data: branchData } = await supabase
            .from("branches")
            .select("*")
            .eq("is_active", true);

        if (branchData) {
            const filtered = branchData.filter(b => 
                b.name.toLowerCase().includes("depok") || 
                b.name.toLowerCase().includes("bsd")
            );
            setBranches(filtered);
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        if (profile?.id) fetchData();
    }, [profile?.id, fetchData]);

    useEffect(() => {
        const fetchBookedTimes = async () => {
            if (!serviceDate || !selectedBranch) {
                setBookedTimes([]);
                return;
            }
            const { data } = await supabase
                .from("bookings")
                .select("service_time")
                .eq("service_date", serviceDate)
                .eq("branch_id", selectedBranch.id)
                .in("status", ["pending", "processing", "completed"]);
            
            if (data) setBookedTimes(data.map(b => b.service_time));
        };
        fetchBookedTimes();
    }, [serviceDate, selectedBranch, supabase]);



    const handleBooking = async () => {
        if (!profile || !selectedBranch || !serviceDate || !serviceTime) return;
        
        setIsSubmitting(true);
        try {
            const code = `BK-${selectedBranch.name.substring(0, 3).toUpperCase()}-${new Date().getTime().toString().slice(-4)}`;
            
            const { error } = await supabase.from("bookings").insert([{
                customer_name: profile.full_name,
                customer_phone: profile.phone,
                car_model: carModel,
                license_plate: licensePlate.toUpperCase(),
                service_date: serviceDate,
                service_time: serviceTime,
                mitra_id: profile.id,
                branch_id: selectedBranch.id,
                booking_code: code,
                booking_type: 'referral',
                status: 'pending'
            }]);

            if (error) throw error;
            setBookingCode(code);
            router.push(`/booking-online/invoice/${code}`);
        } catch (err: any) {
            alert("Gagal membuat booking: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading && !profile) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-primary" size={40} />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <RoleGuard allowedRoles={["member"]}>
                <div className="max-w-4xl mx-auto space-y-8 pb-20">
                    {/* Header */}
                    <div className="text-center space-y-4">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Booking Servis Online</h1>
                        <p className="text-slate-500">Pilih jadwal terbaik untuk perawatan kendaraan Anda.</p>
                        
                        <div className="flex items-center justify-center gap-2 mt-8">
                            {[1, 2, 3].map((s) => (
                                <div key={s} className="flex items-center">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all border-2",
                                        step >= s ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : "bg-white border-slate-200 text-slate-300"
                                    )}>
                                        {step > s ? <Check size={20} /> : s}
                                    </div>
                                    {s < 3 && (
                                        <div className={cn("w-12 h-1 bg-slate-200 mx-2 rounded-full", step > s && "bg-primary")} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                <Card className="border-slate-100">
                                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><MapPin className="text-primary" size={24} />Pilih Cabang & Kendaraan</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <label className="text-sm font-bold text-slate-700">Pilih Cabang Bengkel</label>
                                                <div className="grid grid-cols-1 gap-4">
                                                    {(branches.length > 0 ? branches : DEFAULT_BRANCHES).map((b) => (
                                                        <button 
                                                            key={b.id} 
                                                            onClick={() => setSelectedBranch(b)} 
                                                            className={cn(
                                                                "relative flex items-start gap-4 p-5 rounded-2xl border-2 transition-all text-left group",
                                                                selectedBranch?.id === b.id 
                                                                    ? "border-primary bg-primary/5 ring-4 ring-primary/5" 
                                                                    : "border-slate-100 hover:border-slate-200 bg-white"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                                                selectedBranch?.id === b.id ? "border-primary bg-primary" : "border-slate-200"
                                                            )}>
                                                                {selectedBranch?.id === b.id && <div className="w-2 h-2 rounded-full bg-white" />}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="font-black text-slate-900 group-hover:text-primary transition-colors">{b.name}</p>
                                                                <div className="flex items-start gap-1.5 mt-2 text-slate-500">
                                                                    <MapPin size={14} className="mt-0.5 shrink-0" />
                                                                    <p className="text-xs font-medium leading-relaxed">{b.address || "Alamat belum diatur"}</p>
                                                                </div>
                                                            </div>
                                                            {selectedBranch?.id === b.id && (
                                                                <div className="absolute top-4 right-4">
                                                                    <CheckCircle2 className="text-primary" size={20} />
                                                                </div>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                <label className="text-sm font-bold text-slate-700">Informasi Kendaraan</label>
                                                <div className="space-y-4">
                                                    <div className="relative">
                                                        <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                        <input 
                                                            type="text" 
                                                            placeholder="Merek & Tipe Mobil" 
                                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-primary focus:bg-white transition-all" 
                                                            value={carModel} 
                                                            onChange={(e) => setCarModel(e.target.value)} 
                                                        />
                                                    </div>
                                                    <div className="relative">
                                                        <Wrench className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                        <input 
                                                            type="text" 
                                                            placeholder="Nomor Polisi" 
                                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-primary focus:bg-white transition-all uppercase" 
                                                            value={licensePlate} 
                                                            onChange={(e) => setLicensePlate(e.target.value)} 
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-10 flex justify-end">
                                        <Button disabled={!selectedBranch || !carModel || !licensePlate} onClick={() => setStep(2)} className="h-14 px-8 rounded-2xl shadow-xl shadow-primary/20 gap-2 font-black">
                                            LANJUT PILIH JADWAL <ChevronRight size={20} />
                                        </Button>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                <Card className="border-slate-100">
                                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><CalendarCheck className="text-primary" size={24} />Atur Jadwal Kedatangan</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="text-sm font-bold text-slate-700">Pilih Tanggal</label>
                                            <div className="relative">
                                                <input 
                                                    type="date" 
                                                    min={new Date().toISOString().split('T')[0]} 
                                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-primary transition-all font-bold cursor-pointer" 
                                                    value={serviceDate} 
                                                    onChange={(e) => setServiceDate(e.target.value)}
                                                    onClick={(e) => e.currentTarget.showPicker?.()}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-sm font-bold text-slate-700">Pilih Jam</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {TIME_SLOTS.map((time) => {
                                                    const isBooked = bookedTimes.includes(time);
                                                    return (
                                                        <button key={time} disabled={isBooked || !serviceDate} onClick={() => setServiceTime(time)} className={cn("py-3 rounded-xl border-2 font-bold text-sm transition-all", serviceTime === time ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : isBooked ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed" : "bg-white border-slate-100 text-slate-600 hover:border-primary")}>
                                                            {time}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-10 flex justify-between">
                                        <Button variant="outline" onClick={() => setStep(1)} className="h-14 px-8 rounded-2xl font-bold">KEMBALI</Button>
                                        <Button disabled={!serviceDate || !serviceTime} onClick={() => setStep(3)} className="h-14 px-8 rounded-2xl shadow-xl shadow-primary/20 gap-2 font-black">KONFIRMASI BOOKING <ChevronRight size={20} /></Button>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                <Card className="border-slate-100 overflow-hidden">
                                    <div className="p-8 bg-slate-900 text-white -m-6 mb-6">
                                        <h3 className="text-xl font-black uppercase tracking-tight">Konfirmasi Pesanan</h3>
                                        <p className="text-slate-400 text-sm">Mohon periksa kembali data kedatangan Anda.</p>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cabang</p><p className="font-bold text-slate-900">{selectedBranch?.name}</p></div>
                                            <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jadwal</p><p className="font-bold text-slate-900">{serviceDate} @ {serviceTime}</p></div>
                                            <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kendaraan</p><p className="font-bold text-slate-900">{carModel}</p></div>
                                            <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plat Nomor</p><p className="font-bold text-slate-900 uppercase">{licensePlate}</p></div>
                                        </div>
                                        <div className="flex gap-4 pt-6">
                                            <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-14 rounded-2xl font-bold">UBAH JADWAL</Button>
                                            <Button disabled={isSubmitting} onClick={handleBooking} className="flex-[2] h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-xl shadow-emerald-500/20 gap-2 font-black">
                                                {isSubmitting ? <Loader2 className="animate-spin" /> : <CalendarCheck />} SAYA AKAN DATANG
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div key="step4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-8 py-10">
                                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10"><CheckCircle2 size={50} /></div>
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-black text-slate-900">Booking Berhasil!</h2>
                                    <p className="text-slate-500">Simpan kode booking Anda dan tunjukkan ke petugas bengkel.</p>
                                </div>
                                <div className="bg-white border-4 border-dashed border-slate-100 p-8 rounded-[2rem] max-w-sm mx-auto shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Kode Booking Member</p>
                                    <p className="text-5xl font-black text-slate-900 font-mono tracking-tighter">{bookingCode}</p>
                                    <div className="mt-8 pt-8 border-t border-slate-50 grid grid-cols-2 gap-4 text-left">
                                        <div><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Cabang</p><p className="text-xs font-bold text-slate-600">{selectedBranch?.name}</p></div>
                                        <div><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Waktu</p><p className="text-xs font-bold text-slate-600">{serviceTime}</p></div>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <Button onClick={() => window.print()} variant="outline" className="h-14 px-8 rounded-2xl font-bold">CETAK / SIMPAN PDF</Button>
                                    <Button onClick={() => window.location.href = '/'} className="h-14 px-8 rounded-2xl font-black">KEMBALI KE BERANDA</Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </RoleGuard>
        </DashboardLayout>
    );
}
