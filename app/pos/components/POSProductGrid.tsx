"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Search, Loader2, Wrench, Package, Plus } from "lucide-react";

export default function POSProductGrid({ items, loading, onAddToCart }: any) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredItems = useMemo(() => {
        return items.filter((item: any) =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [items, searchTerm]);

    return (
        <>
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Cari sparepart atau jasa service..."
                    className="input-field pl-12 py-3 lg:py-4 text-base lg:text-lg bg-white border border-slate-200 shadow-sm focus:border-primary/50"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 mt-4 lg:mt-6">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20">
                        <Loader2 className="animate-spin mb-2" size={40} />
                        <p className="text-sm font-bold uppercase tracking-widest">Memuat Katalog...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4 p-1 pb-4">
                        {filteredItems.map((item: any) => (
                            <Card key={item.id} className="p-4 cursor-pointer hover:border-primary/50 group" onClick={() => onAddToCart(item)}>
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant={item.category === 'Service' ? 'info' : 'success'}>
                                        {item.category === 'Service' ? <Wrench size={12} className="mr-1 inline" /> : <Package size={12} className="mr-1 inline" />}
                                        {item.category}
                                    </Badge>
                                    {item.stock !== null && (
                                        <span className="text-xs font-medium text-slate-500 text-right">Stok: {item.stock}</span>
                                    )}
                                </div>
                                <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{item.name}</h4>
                                <div className="flex items-center justify-between mt-4">
                                    <span className="text-lg font-bold text-primary">Rp {item.price.toLocaleString('id-ID')}</span>
                                    <button className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
