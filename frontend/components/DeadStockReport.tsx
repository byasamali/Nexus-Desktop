"use client";

import React, { useState } from 'react';
import { Moon, Search, AlertCircle, PackageOpen, Copy, Check } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function DeadStockReport({ data }: { data: any[] }) {
    const [search, setSearch] = useState("");
    const [copiedBarkod, setCopiedBarkod] = useState<string | null>(null);

    const filteredData = data?.filter(item =>
        item.ad?.toLowerCase().includes(search.toLowerCase()) ||
        item.barkod?.includes(search)
    ) || [];

    const downloadXlsx = () => {
        const rows = filteredData.map(item => ({
            'Ürün Adı': item.ad,
            'Barkod': item.barkod,
            'Mevcut Stok': `${item.stok} Adet`,
            'Hareketsizlik (Gün)': item.son_satis,
            'Potansiyel Kayıp': item.deger
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [{ wch: 40 }, { wch: 18 }, { wch: 15 }, { wch: 20 }, { wch: 18 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Ölü Stoklar');
        XLSX.writeFile(wb, 'olu_stoklar.xlsx');
    };

    const downloadPdf = () => {
        const headers = ['Ürün Detayı', 'Barkod', 'Mevcut Stok', 'Hareketsizlik', 'Potansiyel Kayıp'];
        const rows = filteredData.map(item => [
            item.ad,
            item.barkod,
            `${item.stok} Adet`,
            `${item.son_satis} Gün`,
            item.deger
        ]);
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <html>
                <head>
                    <title>Ölü Stok Raporu</title>
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
                    <h1>Ölü Stok Analizi Raporu</h1>
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

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Ürün veya barkod ara..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-200 outline-none font-medium text-sm transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={downloadXlsx}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-sm rounded-2xl transition-all border border-emerald-100">
                            Excel
                        </button>
                        <button
                            onClick={downloadPdf}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-700 hover:bg-red-100 font-bold text-sm rounded-2xl transition-all border border-red-100">
                            PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* Liste Tablosu */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">Ürün Detayı</th>
                                <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">Barkod</th>
                                <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">Mevcut Stok</th>
                                <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">Hareketsizlik</th>
                                <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px] text-right">Potansiyel Kayıp</th>
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
                                    <td className="px-8 py-5 text-right font-black text-slate-800">
                                        {item.deger}
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