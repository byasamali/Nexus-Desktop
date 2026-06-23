"use client";

import React, { useState, useEffect } from 'react';
import { 
    ListX, Search, Plus, Trash2, Calendar, 
    ShoppingCart, AlertCircle, Sparkles, Building2, Package
} from 'lucide-react';

interface OutOfStockItem {
    barcode: string;
    name: string;
    depo: string;
    addedAt: string;
    notes?: string;
}

export default function YokListesi({ data, gln }: { data: any; gln: string }) {
    const [items, setItems] = useState<OutOfStockItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [customName, setCustomName] = useState('');
    const [customBarcode, setCustomBarcode] = useState('');
    const [customNotes, setCustomNotes] = useState('');
    const [loading, setLoading] = useState(true);

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

    const sortedItems = React.useMemo(() => {
        let result = [...items];
        if (sortField) {
            result.sort((a, b) => {
                let valA = (a[sortField as keyof OutOfStockItem] || '') as any;
                let valB = (b[sortField as keyof OutOfStockItem] || '') as any;

                if (typeof valA === 'string') {
                    return sortOrder === 'asc' 
                        ? valA.localeCompare(valB as string, 'tr') 
                        : (valB as string).localeCompare(valA, 'tr');
                }
                return sortOrder === 'asc' 
                    ? (valA > valB ? 1 : -1) 
                    : (valB > valA ? 1 : -1);
            });
        }
        return result;
    }, [items, sortField, sortOrder]);

    const isWails = typeof window !== 'undefined' && (window as any).go !== undefined;

    // Load Out of Stock List from local storage or Go backend
    useEffect(() => {
        const loadList = async () => {
            setLoading(true);
            try {
                if (isWails && gln) {
                    const content = await (window as any).go.main.App.LoadLocalJSON(gln, "yok_listesi.json");
                    if (content && content !== '{}') {
                        setItems(JSON.parse(content));
                    } else {
                        setItems([]);
                    }
                } else {
                    const cached = localStorage.getItem(`yok_listesi_${gln || 'local'}`);
                    if (cached) {
                        setItems(JSON.parse(cached));
                    } else {
                        setItems([]);
                    }
                }
            } catch (err) {
                console.error("Yok listesi yüklenirken hata oluştu:", err);
            } finally {
                setLoading(false);
            }
        };
        loadList();
    }, [gln]);

    // Save list helper
    const saveList = async (updatedItems: OutOfStockItem[]) => {
        try {
            if (isWails && gln) {
                await (window as any).go.main.App.SaveLocalJSON(gln, "yok_listesi.json", JSON.stringify(updatedItems));
            } else {
                localStorage.setItem(`yok_listesi_${gln || 'local'}`, JSON.stringify(updatedItems));
            }
        } catch (err) {
            console.error("Yok listesi kaydedilirken hata oluştu:", err);
        }
    };

    // Inventory search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        
        const q = searchQuery.toLowerCase();
        const results: any[] = [];
        
        if (data?.gruplar) {
            for (const group of data.gruplar) {
                for (const item of group.detaylar || []) {
                    const barcode = String(item.v1 || '').toLowerCase();
                    const name = String(item.v2 || '').toLowerCase();
                    if (barcode.includes(q) || name.includes(q)) {
                        if (!results.find(r => r.barcode === item.v1)) {
                            results.push({
                                barcode: item.v1,
                                name: item.v2,
                                depo: item.v91 || 'DEPO_YOK'
                            });
                        }
                    }
                    if (results.length >= 8) break;
                }
                if (results.length >= 8) break;
            }
        }
        setSearchResults(results);
    }, [searchQuery, data]);

    const addItem = (item: { barcode: string; name: string; depo: string }) => {
        // Prevent duplicate barcodes
        if (items.some(i => i.barcode === item.barcode)) {
            alert("Bu ilaç zaten yok listenizde kayıtlı.");
            return;
        }

        const newItem: OutOfStockItem = {
            barcode: item.barcode,
            name: item.name,
            depo: item.depo,
            addedAt: new Date().toISOString(),
            notes: customNotes.trim() || undefined
        };

        const updated = [newItem, ...items];
        setItems(updated);
        saveList(updated);
        
        // Reset inputs
        setSearchQuery('');
        setSearchResults([]);
        setCustomNotes('');
    };

    const addCustomItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customName.trim()) {
            alert("Lütfen ilaç adını girin.");
            return;
        }

        const barcode = customBarcode.trim() || `CUSTOM_${Date.now()}`;
        
        if (items.some(i => i.barcode === barcode)) {
            alert("Bu barkod zaten yok listenizde kayıtlı.");
            return;
        }

        const newItem: OutOfStockItem = {
            barcode: barcode,
            name: customName.trim(),
            depo: 'Manuel Giriş',
            addedAt: new Date().toISOString(),
            notes: customNotes.trim() || undefined
        };

        const updated = [newItem, ...items];
        setItems(updated);
        saveList(updated);

        // Reset
        setCustomName('');
        setCustomBarcode('');
        setCustomNotes('');
    };

    const removeItem = (barcode: string) => {
        const updated = items.filter(item => item.barcode !== barcode);
        setItems(updated);
        saveList(updated);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

            {/* HEADER */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-red-50 text-red-500 rounded-2xl">
                        <ListX size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Yok Listem</h2>
                        <p className="text-slate-500 font-medium">Bulunamayan ve sipariş verilmesi gereken ilaçlar listesi.</p>
                    </div>
                </div>
                <div className="bg-red-50/50 border border-red-100 rounded-2xl px-5 py-3 text-right">
                    <span className="text-2xl font-black text-red-600 block leading-none">{items.length}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">Eksik Kalem</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* SOL: EKLEME PANELİ */}
                <div className="space-y-6 lg:col-span-1">
                    {/* ARAMA İLE İLAÇ EKLE */}
                    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-4">
                        <h3 className="font-black text-slate-800 text-lg leading-tight flex items-center gap-2">
                            <Search size={18} className="text-red-500" />
                            İlaç Arama
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">Eczane envanterinden hızlıca arayarak ekleyin.</p>
                        
                        <div className="relative">
                            <input 
                                type="text"
                                placeholder="Barkod veya ilaç adı girin..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white transition-all"
                            />
                            <Search className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
                        </div>

                        {searchResults.length > 0 && (
                            <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-50 bg-white shadow-lg">
                                {searchResults.map((r, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => addItem(r)}
                                        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 text-left transition-colors"
                                    >
                                        <div className="min-w-0 pr-3">
                                            <p className="text-xs font-bold text-slate-800 truncate">{r.name}</p>
                                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{r.barcode} · {r.depo}</p>
                                        </div>
                                        <div className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors">
                                            <Plus size={14} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {searchQuery.trim() && searchResults.length === 0 && (
                            <p className="text-xs text-slate-400 text-center py-2 font-medium">Sonuç bulunamadı.</p>
                        )}
                    </div>

                    {/* MANUEL / CUSTOM İLAÇ EKLE */}
                    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-4">
                        <h3 className="font-black text-slate-800 text-lg leading-tight flex items-center gap-2">
                            <Plus size={18} className="text-red-500" />
                            Yeni İlaç Ekle (Manuel)
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">Veritabanında olmayan yeni veya özel bir ilaç ekleyin.</p>
                        
                        <form onSubmit={addCustomItem} className="space-y-3">
                            <input 
                                type="text"
                                placeholder="İlaç Adı (Zorunlu)"
                                value={customName}
                                onChange={(e) => setCustomName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white transition-all"
                                required
                            />
                            <input 
                                type="text"
                                placeholder="Barkod (İsteğe Bağlı)"
                                value={customBarcode}
                                onChange={(e) => setCustomBarcode(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white transition-all"
                            />
                            <input 
                                type="text"
                                placeholder="Notlar (Örn: Hastaya sözü var, 2 adet)"
                                value={customNotes}
                                onChange={(e) => setCustomNotes(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white transition-all"
                            />
                            <button 
                                type="submit"
                                className="w-full py-3 bg-red-500 text-white rounded-2xl font-bold text-xs hover:bg-red-600 transition-colors shadow-lg shadow-red-100"
                            >
                                Listeye Ekle
                            </button>
                        </form>
                    </div>
                </div>

                {/* SAĞ: LİSTE TABLOSU */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
                        <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="font-black text-slate-800 text-lg tracking-tight">Yok Listesindeki İlaçlar</h3>
                            <span className="text-xs font-bold text-slate-400">{items.length} Kalem Listeleniyor</span>
                        </div>

                        {items.length > 0 ? (
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/50">
                                            <th onClick={() => handleSort('name')} className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider cursor-pointer hover:text-red-600 select-none">
                                                İlaç Adı {sortField === 'name' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                                            </th>
                                            <th onClick={() => handleSort('barcode')} className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider cursor-pointer hover:text-red-600 select-none">
                                                Barkod {sortField === 'barcode' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                                            </th>
                                            <th onClick={() => handleSort('depo')} className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider cursor-pointer hover:text-red-600 select-none">
                                                En Son Depo {sortField === 'depo' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                                            </th>
                                            <th onClick={() => handleSort('addedAt')} className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider cursor-pointer hover:text-red-600 select-none">
                                                Ekleme Zamanı {sortField === 'addedAt' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                                            </th>
                                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider text-right select-none">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {sortedItems.map((item, idx) => (
                                            <tr key={item.barcode} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-red-50 text-red-500 rounded-xl">
                                                            <Package size={16} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                                                            {item.notes && (
                                                                <p className="text-[10px] text-red-500 font-medium mt-0.5 flex items-center gap-1">
                                                                    <AlertCircle size={10} />
                                                                    {item.notes}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-mono text-slate-500">{item.barcode}</td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-600">
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg border border-slate-200">
                                                        <Building2 size={12} className="text-slate-400" />
                                                        {item.depo}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1.5">
                                                        <Calendar size={12} className="text-slate-400" />
                                                        {new Date(item.addedAt).toLocaleDateString('tr-TR', {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={() => removeItem(item.barcode)}
                                                        className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 border border-slate-100 hover:border-red-100 shadow-sm"
                                                        title="Listeden Kaldır"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                                <div className="h-16 w-16 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mb-4 border border-slate-100">
                                    <ListX size={28} />
                                </div>
                                <h4 className="text-base font-black text-slate-800">Yok Listeniz Boş</h4>
                                <p className="text-xs text-slate-400 font-medium max-w-sm mt-1">
                                    Harika! Şu an için eksik ilacınız bulunmuyor. Eklemek için yandaki arama veya manuel paneli kullanabilirsiniz.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
