"use client";

import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, Trash2, ShieldAlert, Check } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function IadelerPage({ gln }: { gln: string }) {
    const [returnsList, setReturnsList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const isWails = typeof window !== 'undefined' && (window as any).go !== undefined;

    const loadReturnsList = async () => {
        setLoading(true);
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
        } finally {
            setLoading(false);
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

    const updateReturnQty = async (barkod: string, newQty: number) => {
        const qty = Math.max(1, newQty);
        const newList = returnsList.map(item => {
            if (item.barkod === barkod) {
                return { ...item, adet: qty };
            }
            return item;
        });
        await saveReturnsList(newList);
    };

    const removeFromReturns = async (barkod: string) => {
        const newList = returnsList.filter(item => item.barkod !== barkod);
        await saveReturnsList(newList);
        showSuccess("Ürün iade listesinden çıkarıldı.");
    };

    const clearAllReturns = async () => {
        if (confirm("Tüm iade listesini temizlemek istediğinize emin misiniz?")) {
            await saveReturnsList([]);
            showSuccess("Tüm iade listesi temizlendi.");
        }
    };

    const exportReturnsToExcel = () => {
        const rows = returnsList.map(item => ({
            'Barkod': item.barkod,
            'Ürün Adı': item.ad,
            'Adet': item.adet
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [{ wch: 18 }, { wch: 42 }, { wch: 10 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'İade Listesi');
        XLSX.writeFile(wb, 'iade_listesi.xlsx');
    };

    const exportReturnsToPdf = () => {
        if (returnsList.length === 0) return;
        const headers = ['Ürün Adı', 'Barkod', 'İade Adeti'];
        const rows = returnsList.map(item => [
            item.ad,
            item.barkod,
            item.adet
        ]);

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <html>
                <head>
                    <title>İade Listesi</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; padding: 20px; color: #334155; }
                        h1 { font-size: 20px; font-weight: 800; margin-bottom: 20px; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th { background-color: #f8fafc; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; padding: 12px 10px; border-bottom: 1px solid #e2e8f0; text-align: left; }
                        td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #334155; }
                        tr:nth-child(even) td { background-color: #fafafa; }
                        .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: right; }
                        @media print {
                            body { padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    <h1>İadeler Raporu</h1>
                    <table>
                        <thead>
                            <tr>
                                ${headers.map(h => `<th>${h}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.map(row => `
                                <tr>
                                    ${row.map(cell => `<td>${cell}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="footer">Oluşturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}</div>
                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 500);
                        }
                    </script>
                </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    const showSuccess = (msg: string) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(null), 3000);
    };

    return (
        <div className="space-y-6">
            {/* Üst Kart */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-100">
                        <RefreshCw size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">İade Edilecek Ürünler</h2>
                        <p className="text-slate-500 font-medium">Ölü Stok veya Nakit Fırsatı ekranlarından iadeye eklenen <b className="text-slate-800">{returnsList.length}</b> ilaç listeleniyor.</p>
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    {returnsList.length > 0 && (
                        <>
                            <button
                                onClick={clearAllReturns}
                                className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-3 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-2xl font-bold text-xs transition-all"
                            >
                                <Trash2 size={14} /> Listeyi Temizle
                            </button>
                            <button
                                onClick={exportReturnsToExcel}
                                className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-md transition-all active:scale-[0.98]"
                            >
                                <Download size={14} /> Excel Olarak İndir
                            </button>
                            <button
                                onClick={exportReturnsToPdf}
                                className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-xs shadow-md transition-all active:scale-[0.98]"
                            >
                                PDF Olarak İndir
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Success Message Banner */}
            {successMsg && (
                <div className="p-4 bg-teal-50 border border-teal-100 text-teal-800 rounded-2xl flex items-center gap-3 font-semibold text-sm">
                    <Check size={18} className="text-teal-600" /> {successMsg}
                </div>
            )}

            {/* Liste Tablosu */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="text-center py-20 text-slate-400 font-medium flex justify-center items-center gap-2">
                        <RefreshCw size={18} className="animate-spin" /> Yükleniyor...
                    </div>
                ) : returnsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <ShieldAlert size={48} className="text-slate-200 mb-4" />
                        <p className="text-slate-500 font-bold">İade edilecek ürün bulunamadı.</p>
                        <p className="text-xs text-slate-400 font-medium mt-1">Ölü Stok veya Nakit Fırsatı sekmelerinden iade listesine ürün ekleyebilirsiniz.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">Ürün Adı</th>
                                    <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">Barkod</th>
                                    <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px] w-48">İade Adedi</th>
                                    <th className="px-8 py-5 text-right font-black text-slate-400 uppercase tracking-widest text-[10px] w-24">Sil</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {returnsList.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-5 font-bold text-slate-700 text-xs">{item.ad}</td>
                                        <td className="px-8 py-5 font-mono text-xs text-slate-500">{item.barkod}</td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-1 border border-slate-200 rounded-xl overflow-hidden bg-white w-fit">
                                                <button
                                                    onClick={() => updateReturnQty(item.barkod, item.adet - 1)}
                                                    className="px-3 py-2 text-slate-400 hover:bg-slate-100 transition-colors font-bold text-xs"
                                                >
                                                    -
                                                </button>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={item.adet}
                                                    onChange={(e) => updateReturnQty(item.barkod, parseInt(e.target.value) || 1)}
                                                    className="w-12 text-center text-xs font-bold text-slate-700 outline-none bg-transparent"
                                                />
                                                <button
                                                    onClick={() => updateReturnQty(item.barkod, item.adet + 1)}
                                                    className="px-3 py-2 text-slate-400 hover:bg-slate-100 transition-colors font-bold text-xs"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button
                                                onClick={() => removeFromReturns(item.barkod)}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                title="Listeden Çıkar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
