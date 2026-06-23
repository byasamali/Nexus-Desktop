"use client";

import React, { useState } from 'react';
import { Moon, Search, AlertCircle, PackageOpen, Copy, Check } from 'lucide-react';

export default function DeadStockReport({ data }: { data: any[] }) {
    const [search, setSearch] = useState("");
    const [copiedBarkod, setCopiedBarkod] = useState<string | null>(null);
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const filteredData = React.useMemo(() => {
        const filtered = data?.filter(item =>
            item.ad?.toLowerCase().includes(search.toLowerCase()) ||
            item.barkod?.includes(search)
        ) || [];

        if (sortField) {
            filtered.sort((a, b) => {
                let valA = a[sortField];
                let valB = b[sortField];

                if (valA === undefined || valA === null) valA = 0;
                if (valB === undefined || valB === null) valB = 0;

                if (typeof valA === 'string') {
                    return sortOrder === 'asc' 
                        ? valA.localeCompare(valB, 'tr') 
                        : valB.localeCompare(valA, 'tr');
                }
                return sortOrder === 'asc' ? valA - valB : valB - valA;
            });
        }
        return filtered;
    }, [data, search, sortField, sortOrder]);

    const copyBarkod = async (barkod: string) => {
        try {
            if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(barkod);
            else {
                const el = document.createElement("textarea");
                el.value = barkod; document.body.appendChild(el); el.select();
                document.execCommand("copy"); document.body.removeChild(el);
            }
            setCopiedBarkod(barkod);
            setTimeout(() => setCopiedBarkod(null), 2000);
        } catch { }
    };

    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
                <PackageOpen size={48} className="text-slate-200 mb-4" />
                <p className="text-slate-500 font-bold">Ölü stok bulunamadı. Harika!</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Üst Kart: Analiz Özeti */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-200">
                        <Moon size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Ölü Stok Analizi</h2>
                        <p className="text-slate-500 font-medium">Son 60 gündür hareketsiz olan <b className="text-slate-800">{data.length}</b> ürün tespit edildi.</p>
                    </div>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Ürün veya barkod ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-200 outline-none font-medium text-sm transition-all"
                    />
                </div>
            </div>

            {/* Liste Tablosu */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th onClick={() => handleSort('ad')} className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px] cursor-pointer hover:text-slate-600 select-none">
                                    Ürün Detayı {sortField === 'ad' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                                </th>
                                <th onClick={() => handleSort('barkod')} className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px] cursor-pointer hover:text-slate-600 select-none">
                                    Barkod {sortField === 'barkod' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                                </th>
                                <th onClick={() => handleSort('stok')} className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px] cursor-pointer hover:text-slate-600 select-none">
                                    Mevcut Stok {sortField === 'stok' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                                </th>
                                <th onClick={() => handleSort('son_satis')} className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px] cursor-pointer hover:text-slate-600 select-none">
                                    Hareketsizlik {sortField === 'son_satis' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredData.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <p className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{item.ad}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <button
                                            onClick={() => copyBarkod(item.barkod)}
                                            className="flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1.5 rounded-lg border transition-all bg-slate-50 border-slate-200 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 text-slate-500">
                                            {copiedBarkod === item.barkod
                                                ? <><Check size={11} className="text-teal-500" /><span className="text-teal-600">Kopyalandı</span></>
                                                : <><Copy size={11} />{item.barkod}</>}
                                        </button>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg font-bold">{item.stok} Adet</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2 text-red-500 font-bold">
                                            <AlertCircle size={14} />
                                            {item.son_satis} Gün
                                        </div>
                                    </td>

                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredData.length === 0 && (
                        <div className="text-center py-12 text-slate-400 font-medium">Arama sonucu bulunamadı.</div>
                    )}
                </div>
            </div>
        </div>
    );
}