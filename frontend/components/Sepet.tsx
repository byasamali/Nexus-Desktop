"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Trash2, Package, Upload, Download, Copy, Check, Cloud, CloudOff, Loader2, Search, X, FileUp } from 'lucide-react';
import * as XLSX from 'xlsx';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const isWails = typeof window !== 'undefined' && (window as any).go !== undefined;

type CartItem = {
    barkod: string;
    ad: string;
    depo: string;
    qty: number;
    mf: number;
};

type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

interface SepetPageProps {
    cart: Record<string, any>;
    syncStatus: 'idle' | 'saving' | 'saved' | 'error';
    persistItems: (newItems: CartItem[]) => void;
    setActiveTab: (tab: string) => void;
    gln: string;
    localOrders: any[];
}

const getCombinedMfHistory = (barcode: string, alimStr: string, localOrders: any[]) => {
  const history: Array<{ date: string; mf: string; source: string; qty: number }> = [];
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // 1. Parse warehouse purchase history (v95)
  if (alimStr && alimStr !== 'AL_YOK' && alimStr !== 'ALIM_YOK' && alimStr !== 'YOK') {
    alimStr.split('|').forEach(entry => {
      const parts = entry.split(':');
      if (parts.length >= 2) {
        const dateStr = parts[0];
        const val = parts[1];
        if (val.includes('+')) {
          const entryDate = new Date(dateStr);
          if (entryDate >= sixMonthsAgo) {
            history.push({
              date: dateStr,
              mf: val,
              source: 'Depo Alımı',
              qty: parseInt(val.split('+')[0]) || 0
            });
          }
        }
      }
    });
  }

  // 2. Local order history
  if (Array.isArray(localOrders)) {
    localOrders.forEach(order => {
      if (order.barkod === barcode && order.durum === 'success') {
        const entryDate = new Date(order.tarih);
        if (entryDate >= sixMonthsAgo) {
          const mfs = [order.mf1, order.mf2, order.mf3].filter(Boolean).join(', ');
          if (mfs) {
            const dateStr = entryDate.toISOString().split('T')[0];
            history.push({
              date: dateStr,
              mf: mfs,
              source: 'AS Ecza (Sipariş)',
              qty: order.miktar || 0
            });
          }
        }
      }
    });
  }

  // Sort by date descending
  return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export default function SepetPage({ cart, syncStatus, persistItems, setActiveTab, gln, localOrders }: SepetPageProps) {
    const [expandedBarkod, setExpandedBarkod] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [editingCell, setEditingCell] = useState<{ barkod: string; field: string } | null>(null);
    const [eczaneId, setEczaneId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [showImportModal, setShowImportModal] = useState(false);
    const [importText, setImportText] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);



    // Derive items directly from cart prop
    const items = Object.entries(cart)
        .filter(([_, val]: any) => val.inCart && val.qty > 0)
        .map(([id, val]: any) => ({
            barkod: id,
            ad: val.ad || 'Bilinmeyen Ürün',
            depo: val.depo || 'Depo Belirsiz',
            qty: val.qty,
            mf: val.mf || 0,
            v95: val.v95 || ''
        }));

    // --- YÜKLEME: Supabase'den sadece eczaneId (User ID) çek (Import için gerekebilir) ---
    useEffect(() => {
        const loadUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setEczaneId(user.id);
                }
            } catch (e) {
                console.error('Kullanıcı bilgisi alınamadı:', e);
            }
        };
        loadUser();
    }, []);

    // --- MODAL AÇILINCA BODY'Yİ KİLİT ---
    useEffect(() => {
        if (showImportModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
    }, [showImportModal]);

    // --- FİLTRELEME ---
    const filteredItems = items.filter(item =>
        item.barkod.includes(searchQuery) ||
        item.ad.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // --- SEÇIM ---
    const toggleSelectAll = () => {
        if (selectedItems.size === filteredItems.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(filteredItems.map(i => i.barkod)));
        }
    };

    const toggleSelect = (barkod: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(barkod)) {
            newSelected.delete(barkod);
        } else {
            newSelected.add(barkod);
        }
        setSelectedItems(newSelected);
    };

    // --- SİLME ---
    const deleteItem = (barkod: string) => {
        persistItems(items.filter(i => i.barkod !== barkod));
    };

    const deleteSelected = () => {
        if (!confirm(`${selectedItems.size} ürünü silmek istediğinize emin misiniz?`)) return;
        persistItems(items.filter(i => !selectedItems.has(i.barkod)));
        setSelectedItems(new Set());
    };

    // --- TOPLAM HESAPLA ---
    const totalQty = items.reduce((acc, curr) => acc + curr.qty, 0);
    const totalMf = items.reduce((acc, curr) => acc + curr.mf, 0);

    // --- EXPORT ---
    const downloadXlsx = () => {
        const rows = items.map(item => ({
            'Barkod': item.barkod,
            'Ürün Adı': item.ad,
            'Depo': item.depo || '-',
            'Adet': item.qty,
            'MF': item.mf,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [{ wch: 18 }, { wch: 42 }, { wch: 16 }, { wch: 8 }, { wch: 8 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sepet');
        XLSX.writeFile(wb, 'siparis.xlsx');
    };

    const sendWhatsApp = () => {
        const lines = items.map((item, i) =>
            `${i + 1}. *${item.ad}*\n   🔖 ${item.barkod}  |  ${item.depo || '-'}  |  📦 ${item.qty}  |  MF: ${item.mf}`
        );
        const text = [
            `📋 *Sipariş Listesi*`,
            `${items.length} kalem • ${totalQty + totalMf} kutu`,
            ``,
            ...lines,
            ``,
            `✅ Toplamı: *${items.length} kalem* | *${totalQty + totalMf} kutu*`,
        ].join('\n');
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    // --- IMPORT METIN ---
    const importFromText = () => {
        if (!importText.trim()) {
            alert('Lütfen liste yapıştırın!');
            return;
        }

        const lines = importText.trim().split('\n').filter(line => line.trim());
        const newItems: CartItem[] = [];

        for (const line of lines) {
            const parts = line.split(/\t|\s+/).filter(p => p);
            if (parts.length >= 2) {
                const barkod = parts[0];
                const qty = parseInt(parts[1]) || 0;
                const mf = parts[2] ? parseInt(parts[2]) : 0;
                const ad = parts.slice(3).join(' ') || 'Bilinmeyen Ürün';

                if (barkod && qty > 0) {
                    newItems.push({ barkod, ad, depo: 'Aktar', qty, mf });
                }
            }
        }

        if (newItems.length === 0) {
            alert('Geçerli ürün bulunamadı!');
            return;
        }

        const merged = [...items];
        newItems.forEach(newItem => {
            const existing = merged.find(i => i.barkod === newItem.barkod);
            if (existing) {
                existing.qty += newItem.qty;
                existing.mf += newItem.mf;
            } else {
                merged.push(newItem);
            }
        });

        persistItems(merged);
        setShowImportModal(false);
        setImportText('');
        alert(`✅ ${newItems.length} ürün eklendi!`);
    };

    // --- IMPORT EXCEL ---
    const importFromExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = event.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

                const newItems: CartItem[] = rows
                    .map(row => {
                        const barkod = String(row['Barkod'] || row['barkod'] || row['BARKOD'] || '').trim();
                        const qty = parseInt(row['Adet'] || row['adet'] || row['QTY'] || '0');
                        const mf = parseInt(row['MF'] || row['mf'] || '0');
                        const ad = String(row['Ürün Adı'] || row['ürün adı'] || row['Adı'] || row['Ad'] || 'Bilinmeyen').trim();

                        return barkod && qty > 0 ? { barkod, ad, depo: 'Excel', qty, mf } : null;
                    })
                    .filter(Boolean) as CartItem[];

                if (newItems.length === 0) {
                    alert('Geçerli ürün bulunamadı!');
                    return;
                }

                const merged = [...items];
                newItems.forEach(newItem => {
                    const existing = merged.find(i => i.barkod === newItem.barkod);
                    if (existing) {
                        existing.qty += newItem.qty;
                        existing.mf += newItem.mf;
                    } else {
                        merged.push(newItem);
                    }
                });

                persistItems(merged);
                alert(`✅ ${newItems.length} ürün eklendi!`);
            } catch (error) {
                alert('Excel dosyası okunurken hata oluştu!');
            }
        };
        reader.readAsBinaryString(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // --- SYNC BADGE ---
    const SyncBadge = () => {
        if (syncStatus === 'saving') return <span className="flex items-center gap-1.5 text-xs text-amber-600"><Loader2 size={13} className="animate-spin" /> Kaydediliyor</span>;
        if (syncStatus === 'saved') return <span className="flex items-center gap-1.5 text-xs text-teal-600"><Cloud size={13} /> Kaydedildi</span>;
        if (syncStatus === 'error') return <span className="flex items-center gap-1.5 text-xs text-red-600"><CloudOff size={13} /> Hata</span>;
        return <span className="text-xs text-stone-400">Hazır</span>;
    };

    return (
        <div className="min-h-screen bg-white w-full overflow-x-hidden">
            <div className="max-w-6xl mx-auto w-full">

                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
                        <div className="bg-stone-50 w-20 h-20 rounded-full flex items-center justify-center mb-6">
                            <Package size={40} className="text-stone-300" />
                        </div>
                        <h2 className="text-2xl font-bold text-stone-900 mb-2">Sepetin Boş</h2>
                        <p className="text-stone-500 mb-8 max-w-md">Henüz sipariş vermek için ürün eklemedin. Arayüzden ürünler ekleyerek başla.</p>
                        <button onClick={() => setActiveTab('ilac')} className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-all">
                            Ürünleri İncele
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6 p-8">

                        {/* HEADER - TOPLAMLAR & AKSIYONLAR */}
                        <div className="border-b border-stone-200 pb-6">
                            <div className="flex flex-col gap-4">
                                {/* Toplamlar */}
                                <div className="flex items-center gap-8">
                                    <div>
                                        <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-1">Toplam Kalem</p>
                                        <p className="text-3xl font-black text-stone-900">{items.length}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-1">Toplam Kutu</p>
                                        <p className="text-3xl font-black text-teal-600">{totalQty + totalMf}</p>
                                    </div>
                                    <div className="ml-auto">
                                        <SyncBadge />
                                    </div>
                                </div>

                                {/* ARAMA */}
                                <div className="relative max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Ürün adı veya barkod ara..."
                                        className="w-full pl-10 pr-10 py-2.5 border border-stone-200 rounded-lg text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>

                                {/* BUTONLAR */}
                                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                                    <button
                                        onClick={() => setShowImportModal(true)}
                                        className="flex items-center justify-center md:justify-start gap-2 px-3 md:px-4 py-2 md:py-2.5 border border-stone-200 rounded-lg hover:bg-stone-50 font-semibold text-xs md:text-sm text-stone-700 transition-all"
                                    >
                                        <Upload size={14} /> <span className="hidden sm:inline">Metin Aktar</span><span className="sm:hidden">Metin</span>
                                    </button>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center justify-center md:justify-start gap-2 px-3 md:px-4 py-2 md:py-2.5 border border-stone-200 rounded-lg hover:bg-stone-50 font-semibold text-xs md:text-sm text-stone-700 transition-all"
                                    >
                                        <FileUp size={14} /> <span className="hidden sm:inline">Excel Aktar</span><span className="sm:hidden">Excel</span>
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={importFromExcel}
                                        className="hidden"
                                    />
                                    {selectedItems.size > 0 && (
                                        <button
                                            onClick={deleteSelected}
                                            className="flex items-center justify-center md:justify-start gap-2 px-3 md:px-4 py-2 md:py-2.5 border border-red-200 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-semibold text-xs md:text-sm transition-all"
                                        >
                                            <Trash2 size={14} /> <span className="hidden sm:inline">Sil ({selectedItems.size})</span><span className="sm:hidden">Sil</span>
                                        </button>
                                    )}
                                    <div className="ml-auto flex gap-2 w-full md:w-auto">

                                        <button
                                            onClick={downloadXlsx}
                                            className="flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold text-xs md:text-sm transition-all"
                                        >
                                            <Download size={14} /> <span className="hidden sm:inline">Excel</span>
                                        </button>
                                        <button
                                            onClick={sendWhatsApp}
                                            className="flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-[#25D366] text-white rounded-lg hover:bg-[#1ebe5d] font-semibold text-xs md:text-sm transition-all"
                                        >
                                            <WhatsAppIcon /> <span className="hidden sm:inline">WhatsApp</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* TABLO */}
                        <div className="overflow-x-auto scrollbar-hide">
                            <table className="w-full text-xs md:text-sm">
                                <thead>
                                    <tr className="border-b border-stone-200">
                                        <th className="px-2 md:px-4 py-2 md:py-3 text-left">
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 rounded border-stone-300 text-teal-600 focus:ring-2 focus:ring-teal-100 cursor-pointer"
                                            />
                                        </th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 text-left text-[9px] md:text-[11px] font-semibold text-stone-600 uppercase tracking-wide">Ürün</th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 text-left text-[9px] md:text-[11px] font-semibold text-stone-600 uppercase tracking-wide">Barkod</th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 text-center text-[9px] md:text-[11px] font-semibold text-stone-600 uppercase tracking-wide">Depo</th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 text-center text-[9px] md:text-[11px] font-semibold text-stone-600 uppercase tracking-wide">Adet</th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 text-center text-[9px] md:text-[11px] font-semibold text-stone-600 uppercase tracking-wide">MF</th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 text-right text-[9px] md:text-[11px] font-semibold text-stone-600 uppercase tracking-wide">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.flatMap((item) => {
                                        const isExpanded = expandedBarkod === item.barkod;
                                        const mfHistory = getCombinedMfHistory(item.barkod, item.v95, localOrders);
                                        return [
                                            <tr key={item.barkod} className={`border-b border-stone-100 hover:bg-stone-50/50 transition-colors group ${isExpanded ? 'bg-stone-50' : ''}`}>
                                                <td className="px-2 md:px-4 py-2 md:py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedItems.has(item.barkod)}
                                                        onChange={() => toggleSelect(item.barkod)}
                                                        className="w-4 h-4 rounded border-stone-300 text-teal-600 focus:ring-2 focus:ring-teal-100 cursor-pointer"
                                                    />
                                                </td>
                                                <td 
                                                    onClick={() => setExpandedBarkod(isExpanded ? null : item.barkod)}
                                                    className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-semibold text-stone-900 cursor-pointer hover:text-teal-600 select-none"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span>{item.ad}</span>
                                                        <span className="text-[10px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded font-normal shrink-0">
                                                            MF ({mfHistory.length})
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-mono text-stone-600">{item.barkod}</td>
                                                <td className="px-2 md:px-4 py-2 md:py-3 text-center text-xs md:text-sm text-stone-600">{item.depo}</td>
                                                <td className="px-2 md:px-4 py-2 md:py-3 text-center">
                                                    <input
                                                        type="number"
                                                        value={item.qty}
                                                        onChange={(e) => {
                                                            const updated = items.map(i => i.barkod === item.barkod ? { ...i, qty: Math.max(0, parseInt(e.target.value) || 0) } : i);
                                                            persistItems(updated);
                                                        }}
                                                        className="w-12 md:w-16 text-center border border-stone-200 rounded px-1.5 md:px-2 py-1 md:py-1.5 font-semibold text-xs md:text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                                        min="0"
                                                    />
                                                </td>
                                                <td className="px-2 md:px-4 py-2 md:py-3 text-center">
                                                    <input
                                                        type="number"
                                                        value={item.mf}
                                                        onChange={(e) => {
                                                            const updated = items.map(i => i.barkod === item.barkod ? { ...i, mf: Math.max(0, parseInt(e.target.value) || 0) } : i);
                                                            persistItems(updated);
                                                        }}
                                                        className="w-12 md:w-16 text-center border border-stone-200 rounded px-1.5 md:px-2 py-1 md:py-1.5 font-semibold text-xs md:text-sm text-teal-600 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                                        min="0"
                                                    />
                                                </td>
                                                <td className="px-2 md:px-4 py-2 md:py-3 text-right">
                                                    <button
                                                        onClick={() => deleteItem(item.barkod)}
                                                        className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>,
                                            isExpanded && (
                                                <tr key={`${item.barkod}-expanded`} className="bg-stone-50/50">
                                                    <td colSpan={7} className="px-4 py-3 border-b border-stone-100">
                                                        <div className="pl-8 pr-4 py-2 max-w-xl">
                                                            <h4 className="text-[11px] font-black text-stone-500 uppercase tracking-wider mb-2">📦 {item.ad} — Son 6 Aylık MF Geçmişi</h4>
                                                            {mfHistory.length === 0 ? (
                                                                <p className="text-stone-400 text-xs italic">Son 6 aya ait MF alım/sipariş geçmişi bulunamadı.</p>
                                                            ) : (
                                                                <div className="border border-stone-200 rounded-lg overflow-hidden bg-white shadow-inner">
                                                                    <table className="w-full text-left text-xs border-collapse">
                                                                        <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                                                                            <tr>
                                                                                <th className="px-3 py-1.5 font-bold uppercase tracking-wider text-[9px]">Tarih</th>
                                                                                <th className="px-3 py-1.5 font-bold uppercase tracking-wider text-[9px]">Kaynak</th>
                                                                                <th className="px-3 py-1.5 font-bold uppercase tracking-wider text-[9px]">MF Baremi</th>
                                                                                <th className="px-3 py-1.5 font-bold uppercase tracking-wider text-[9px] text-right">Miktar</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-stone-100 text-stone-700 font-medium">
                                                                            {mfHistory.map((h, hi) => (
                                                                                <tr key={hi} className="hover:bg-stone-50/40">
                                                                                    <td className="px-3 py-1.5 font-mono">{h.date.split('-').reverse().join('.')}</td>
                                                                                    <td className="px-3 py-1.5">
                                                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                                                            h.source.includes('Sipariş') ? 'bg-teal-50 text-teal-600' : 'bg-blue-50 text-blue-600'
                                                                                        }`}>
                                                                                            {h.source}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="px-3 py-1.5 font-bold text-emerald-600">{h.mf}</td>
                                                                                    <td className="px-3 py-1.5 text-right font-mono">{h.qty}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        ].filter(Boolean);
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* IMPORT MODAL */}
                {showImportModal && (
                    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 md:p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-sm md:max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-stone-200">
                                <h2 className="text-xl font-bold text-stone-900">📥 Metin Listesi Aktar</h2>
                                <p className="text-sm text-stone-500 mt-1">Başka kaynaktan aldığın listeyi yapıştır</p>
                            </div>

                            <div className="p-6">
                                <label className="block text-sm font-semibold text-stone-700 mb-3">
                                    Listeyi Yapıştır (Barkod | Adet | MF):
                                </label>
                                <textarea
                                    value={importText}
                                    onChange={(e) => setImportText(e.target.value)}
                                    placeholder="8699123456789    10    2&#10;8699987654321    5     0"
                                    className="w-full h-40 p-4 border border-stone-200 rounded-lg font-mono text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 resize-none"
                                />
                                <p className="text-[11px] text-stone-500 mt-2">💡 Format: Barkod TAB Adet [TAB MF]</p>
                            </div>

                            <div className="p-6 bg-stone-50 border-t border-stone-200 flex gap-3 justify-end">
                                <button
                                    onClick={() => {
                                        setShowImportModal(false);
                                        setImportText('');
                                    }}
                                    className="px-4 py-2.5 rounded-lg border border-stone-300 text-stone-700 font-semibold hover:bg-stone-100 transition-all"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={importFromText}
                                    className="px-4 py-2.5 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-all"
                                >
                                    ✅ İçeri Aktar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
