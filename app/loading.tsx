import { Wrench } from "lucide-react";

export default function Loading() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
            <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 border-4 border-primary/10 rounded-full" />
                    <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center text-primary">
                        <Wrench size={32} className="animate-pulse" />
                    </div>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
                    INKA OTOSERVICE
                </h2>
                <p className="text-slate-500 font-medium">
                    Menyiapkan dashboard Anda...
                </p>
            </div>

            {/* Visual feedback at bottom */}
            <div className="fixed bottom-12 left-0 right-0 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                    Sistem Manajemen Bengkel Modern
                </p>
            </div>
        </div>
    );
}
