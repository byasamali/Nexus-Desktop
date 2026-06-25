"use client";

import React, { useState } from 'react';
import { 
    EyeOff, Calendar, ShoppingCart, Sparkles, Building2, Package, Check, Trash2, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export default function GozdenKacanlar({ data, gln, cart = {}, updateCart, toggleCartItem, setCart }: { data: any; gln: string; cart?: any; updateCart?: any; toggleCartItem?: any; setCart?: any }) {
    const [quantities, setQuantities] = useState<Record<string, number>>({});

    const gozdenKacabilenler = React.useMemo(() => {
        const list: any[] = [];
        if (!data?.gruplar) return list;
        
        data.gruplar.forEach((g: any) => {
            (g.detaylar || []).forEach((u: any) => {
                const stock = u.v4 || 0;
                const dailySpeed = u.v20 || 0;
                const monthlySpeed = dailySpeed * 30;
                const daysInactive = u.v21 || 0;
                
                // Kriterler: Stok <= 0 VE (Hareketsizlik >= 60 gün (2 ay) VEYA Aylık Hız < 1)
                if (stock <= 0 && (daysInactive >= 60 || monthlySpeed < 1)) {
                    list.push({
                        barcode: u.v1,
                        name: u.v2,
                        depo: u.v91 || 'DEPO_YOK',
                        daysInactive,
                        monthlySpeed,
                        rawUrun: u
                    });
                }
            });
        });
        
        // Hareketsizlik süresine göre azalan şekilde sıralayalım (en uzun süredir satılmayanlar en üstte)
        return list.sort((a, b) => b.daysInactive - a.daysInactive);
    }, [data]);

    const downloadXlsx = () => {
        if (gozdenKacabilenler.length === 0) return;
        const rows = gozdenKacabilenler.map(item => ({
            'Ürün Adı': item.name,
            'Barkod': item.barcode,
            'En Son Depo': item.depo,
            'Hareketsizlik (Gün)': item.daysInactive,
            'Aylık Satış Hızı': item.monthlySpeed.toFixed(2)
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [{ wch: 45 }, { wch: 18 }, { wch: 15 }, { wch: 20 }, { wch: 18 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Gözden Kaçanlar');
        XLSX.writeFile(wb, 'gozden_kacanlar.xlsx');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-500/20">
                            <EyeOff size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-none">
                                Gözden Kaçanlar
                            </h2>
                            <p className="text-xs text-slate-400 font-medium mt-1.5">
                                Son 2 aydır (60+ gün) satılmamış VEYA aylık satış hızı 1'den küçük olan sıfır stoklu ilaçlar.
                            </p>
                        </div>
                    </div>
                </div>
                {gozdenKacabilenler.length > 0 && (
                    <button
                        onClick={downloadXlsx}
                        className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-sm transition-all shrink-0 self-start md:self-auto"
                    >
                        <Download size={14} />
                        Excel İndir
                    </button>
                )}
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px] animate-fadeIn">
                <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h3 className="font-black text-slate-800 text-lg tracking-tight">Gözden Kaçan İlaç Listesi</h3>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">Sipariş verilmeyi bekleyen hareketsiz sıfır stoklu ürünler.</p>
                    </div>
                    <span className="text-xs font-bold text-slate-400">{gozdenKacabilenler.length} Kalem Listeleniyor</span>
                </div>

                {gozdenKacabilenler.length > 0 ? (
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider select-none">İlaç Adı</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider select-none">Barkod</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider select-none">En Son Depo</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider text-center select-none">Hareketsizlik</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider text-center select-none">Aylık Hız</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider text-center select-none w-[200px]">Sipariş</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {gozdenKacabilenler.map((item) => {
                                    const u = item.rawUrun;
                                    const qtyVal = quantities[u.v1] !== undefined
                                        ? quantities[u.v1]
                                        : (cart[u.v1]?.qty || Math.round(u.v26 || 0) + Math.round(u.v27 || 0) || 1);
                                    const inCart = cart[u.v1]?.inCart || false;

                                    return (
                                        <tr key={item.barcode} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-amber-50 text-amber-500 rounded-xl">
                                                        <Package size={16} />
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-800 truncate max-w-[280px]" title={item.name}>{item.name}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-mono text-slate-500">{item.barcode}</td>
                                            <td className="px-6 py-4 text-xs font-bold text-slate-600">
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg border border-slate-200">
                                                    <Building2 size={12} className="text-slate-400" />
                                                    {item.depo}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-center font-bold text-slate-600">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-600 rounded-full border border-red-100">
                                                    <Calendar size={12} />
                                                    {item.daysInactive} Gün
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-center font-mono font-bold text-slate-500">
                                                {item.monthlySpeed.toFixed(2)}/ay
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <input
                                                        type="number"
                                                        value={qtyVal}
                                                        onChange={e => setQuantities(prev => ({ ...prev, [u.v1]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                                        className="w-12 h-8 text-center border border-slate-200 rounded-lg font-bold font-mono text-xs outline-none focus:border-red-500 bg-white"
                                                        min="0"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            if (updateCart && toggleCartItem) {
                                                                updateCart(u.v1, qtyVal, undefined, u);
                                                                if (!inCart) {
                                                                    toggleCartItem(u.v1, u);
                                                                }
                                                            }
                                                        }}
                                                        className={cn(
                                                            "h-8 px-2 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 shrink-0",
                                                            inCart
                                                                ? "bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100"
                                                                : "bg-red-500 text-white hover:bg-red-600"
                                                        )}
                                                    >
                                                        {inCart ? <Check size={10} /> : <ShoppingCart size={10} />}
                                                        {inCart ? "Güncelle" : "Sepete Ekle"}
                                                    </button>
                                                    {inCart && (
                                                        <button
                                                            onClick={() => {
                                                                if (setCart) {
                                                                    setCart((prev: any) => ({
                                                                        ...prev,
                                                                        [u.v1]: {
                                                                            ...prev[u.v1],
                                                                            qty: 0,
                                                                            mf: 0,
                                                                            inCart: false
                                                                        }
                                                                    }));
                                                                }
                                                            }}
                                                            className="h-8 w-8 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-all flex items-center justify-center shrink-0"
                                                            title="Sepetten Çıkar"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <div className="h-16 w-16 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mb-4 border border-slate-100">
                            <Sparkles size={28} />
                        </div>
                        <h4 className="text-base font-black text-slate-800">Gözden Kaçan İlaç Yok</h4>
                        <p className="text-xs text-slate-400 font-medium max-w-sm mt-1">
                            Harika! Son 2 aydır hareketsiz olan VEYA aylık hızı 1'den küçük olan sıfır stoklu bir ilaç bulunmuyor.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
