"use client";

import React, { useState, useEffect } from 'react';
import { Moon, Search, AlertCircle, PackageOpen, Copy, Check, RefreshCw } from 'lucide-react';

export default function DeadStockReport({ data, gln }: { data: any[], gln: string }) {
    const [search, setSearch] = useState("");
    const [copiedBarkod, setCopiedBarkod] = useState<string | null>(null);
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Return list state & visual feedback state
    const [returnsList, setReturnsList] = useState<any[]>([]);
    const [addedToReturns, setAddedToReturns] = useState<Record<string, boolean>>({});

    const isWails = typeof window !== 'undefined' && (window as any).go !== undefined;

    const loadReturnsList = async () => {
        try {
            if (isWails && gln) {
                const content = await (window as any).go.main.App.LoadLocalJSON(gln, "iade_listesi.json");
                if (content && content !== '{}') {
                    setReturnsList(JSON.parse(content));
                } else {
                    setReturnsList([]);
                }
            } else {
                const cached = localStorage.getItem(`iade_listesi_${gln}`);
                if (cached) {
                    setReturnsList(JSON.parse(cached));
                } else {
                    setReturnsList([]);
                }
            }
        } catch (err) {
            console.error("İade listesi yüklenirken hata:", err);
        }
    };

    useEffect(() => {
        loadReturnsList();

        const handleUpdate = () => {
            loadReturnsList();
        };
        window.addEventListener('nexus:iadeListesiUpdated', handleUpdate);
        return () => {
            window.removeEventListener('nexus:iadeListesiUpdated', handleUpdate);
        };
    }, [gln]);

    const saveReturnsList = async (list: any[]) => {
        try {
            if (isWails && gln) {
                await (window as any).go.main.App.SaveLocalJSON(gln, "iade_listesi.json", JSON.stringify(list));
            } else {
                localStorage.setItem(`iade_listesi_${gln}`, JSON.stringify(list));
            }
            setReturnsList(list);
            window.dispatchEvent(new CustomEvent('nexus:iadeListesiUpdated'));
        } catch (err) {
            console.error("İade listesi kaydedilirken hata:", err);
        }
    };

    const addToReturns = async (item: any) => {
        const barkod = item.barkod;
        const ad = item.ad || 'Bilinmeyen Ürün';
        const adet = Number(item.stok) || 1;

        const newList = [...returnsList];
        const existingIdx = newList.findIndex(i => i.barkod === barkod);
        if (existingIdx > -1) {
            newList[existingIdx].adet = (newList[existingIdx].adet || 0) + adet;
        } else {
            newList.push({ barkod, ad, adet });
        }

        await saveReturnsList(newList);

        setAddedToReturns(prev => ({ ...prev, [barkod]: true }));
        setTimeout(() => setAddedToReturns(prev => ({ ...prev, [barkod]: false })), 2000);
    };



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
                                <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px] select-none">
                                    İşlem
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
                                    <td className="px-8 py-5">
                                        <button
                                            onClick={() => addToReturns(item)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs transition-all ${
                                                addedToReturns[item.barkod]
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700'
                                            }`}
                                        >
                                            {addedToReturns[item.barkod] ? (
                                                <><Check size={12} /> Eklendi</>
                                            ) : (
                                                <><RefreshCw size={12} /> İadeye Ekle</>
                                            )}
                                        </button>
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