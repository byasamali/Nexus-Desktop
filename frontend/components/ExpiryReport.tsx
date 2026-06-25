"use client";

import React, { useState } from 'react';
import { AlertTriangle, Search, CalendarClock } from 'lucide-react';

function parseMiadStr(raw: string | undefined | null): string {
    if (!raw) return 'Belirsiz';
    const str = String(raw);
    if (str.includes(':') && str.includes('-')) {
        const parts = str.split('|');
        return parts.map(part => {
            const [tarih, adet] = part.split(':');
            if (!tarih) return part;
            const d = new Date(tarih.trim());
            if (isNaN(d.getTime())) return part;
            const ay = d.toLocaleString('tr-TR', { month: 'short', year: '2-digit' });
            return adet ? `${adet} kutu · ${ay}` : ay;
        }).join(' | ');
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(str.trim())) {
        const d = new Date(str.trim());
        if (!isNaN(d.getTime())) return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    return str;
}

export default function ExpiryReport({ data }: { data: any[] }) {
    const [search, setSearch] = useState("");

    const activeData = data?.filter(item => item.stok > 0) || [];

    const filteredData = activeData.filter(item =>
        item.ad?.toLowerCase().includes(search.toLowerCase()) ||
        item.barkod?.includes(search)
    );

    if (!activeData || activeData.length === 0) return (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-emerald-100">
            <CalendarClock size={48} className="text-emerald-100 mb-4" />
            <p className="text-emerald-600 font-bold">Yakın miadlı ürününüz bulunmuyor.</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2rem] border border-orange-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-100">
                        <AlertTriangle size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Miad Risk Analizi</h2>
                        <p className="text-slate-500 font-medium">Son 6 aya girmiş <b className="text-orange-600">{activeData.length}</b> kritik ürün var.</p>
                    </div>
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Miadlı ürün ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-orange-200 outline-none font-medium text-sm transition-all"
                    />
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-orange-50/30 border-b border-orange-100">
                            <tr>
                                <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">Ürün</th>
                                <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">Stok</th>
                                <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">Son Kullanma</th>
                                <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px] text-right">Mali Değer</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredData.map((item, idx) => (
                                <tr key={idx} className="hover:bg-orange-50/10 transition-colors group">
                                    <td className="px-8 py-5 font-bold text-slate-700">{item.ad}</td>
                                    <td className="px-8 py-5"><span className="font-bold text-slate-600">{item.stok}</span></td>
                                    <td className="px-8 py-5"><span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg font-black text-xs">{parseMiadStr(item.miad)}</span></td>
                                    <td className="px-8 py-5 text-right font-black text-slate-800">{item.tutar}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}