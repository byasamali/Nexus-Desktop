import React, { useState } from 'react';
import { AlertTriangle, Search, CalendarClock, Check, RefreshCw, Download, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

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

interface ExpiryReportProps {
    data: any[];
    addToReturns?: (barkod: string, ad: string, adet: number) => Promise<boolean>;
    onOpenProductAnalysis?: (barcode: string, fallbackName?: string) => void;
}

export default function ExpiryReport({ data, addToReturns, onOpenProductAnalysis }: ExpiryReportProps) {
    const [search, setSearch] = useState("");
    const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const activeData = data?.filter(item => item.stok > 0) || [];

    const downloadXlsx = () => {
        if (activeData.length === 0) return;
        const rows = activeData.map(item => ({
            'Ürün Adı': item.ad,
            'Barkod': item.barkod,
            'Stok': item.stok,
            'Son Kullanma Tarihi': parseMiadStr(item.miad)
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [{ wch: 40 }, { wch: 18 }, { wch: 10 }, { wch: 25 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Miad Risk Raporu');
        XLSX.writeFile(wb, 'miad_risk_analizi.xlsx');
    };

    const downloadPdf = () => {
        if (activeData.length === 0) return;
        const headers = ['Ürün Adı', 'Barkod', 'Stok', 'Son Kullanma'];
        const rows = activeData.map(item => [
            item.ad,
            item.barkod,
            String(item.stok),
            parseMiadStr(item.miad)
        ]);

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <html>
                <head>
                    <title>Miad Risk Analizi Raporu</title>
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
                    <h1>Miad Risk Analizi Raporu</h1>
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

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const filteredData = activeData.filter(item =>
        item.ad?.toLowerCase().includes(search.toLowerCase()) ||
        item.barkod?.includes(search)
    );

    const sortedData = React.useMemo(() => {
        let result = [...filteredData];
        if (sortField) {
            result.sort((a, b) => {
                let aVal = a[sortField];
                let bVal = b[sortField];
                
                if (sortField === 'stok') {
                    aVal = Number(aVal) || 0;
                    bVal = Number(bVal) || 0;
                } else if (sortField === 'tutar') {
                    aVal = parseFloat(String(aVal).replace(/[^\d.-]/g, '')) || 0;
                    bVal = parseFloat(String(bVal).replace(/[^\d.-]/g, '')) || 0;
                } else {
                    aVal = String(aVal).toLowerCase();
                    bVal = String(bVal).toLowerCase();
                }

                if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [filteredData, sortField, sortOrder]);

    const handleAdd = async (item: any) => {
        if (!addToReturns) return;
        const ok = await addToReturns(item.barkod, item.ad, item.stok);
        if (ok) {
            setAddedItems(prev => ({ ...prev, [item.barkod]: true }));
            setTimeout(() => {
                setAddedItems(prev => ({ ...prev, [item.barkod]: false }));
            }, 2000);
        }
    };

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
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={downloadXlsx}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-sm rounded-2xl transition-all border border-emerald-100"
                            title="Excel Olarak İndir"
                        >
                            <Download size={16} />
                            Excel
                        </button>
                        <button
                            onClick={downloadPdf}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-700 hover:bg-red-100 font-bold text-sm rounded-2xl transition-all border border-red-100"
                            title="PDF Olarak İndir"
                        >
                            <FileText size={16} />
                            PDF
                        </button>
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
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-orange-50/30 border-b border-orange-100">
                            <tr>
                                <th onClick={() => handleSort('ad')} className="px-3 py-1.5 font-black text-slate-400 uppercase tracking-widest text-[10px] cursor-pointer hover:text-orange-650 select-none">
                                    Ürün {sortField === 'ad' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                                </th>
                                <th onClick={() => handleSort('stok')} className="px-3 py-1.5 font-black text-slate-400 uppercase tracking-widest text-[10px] cursor-pointer hover:text-orange-650 select-none">
                                    Stok {sortField === 'stok' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                                </th>
                                <th onClick={() => handleSort('miad')} className="px-3 py-1.5 font-black text-slate-400 uppercase tracking-widest text-[10px] cursor-pointer hover:text-orange-650 select-none">
                                    Son Kullanma {sortField === 'miad' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                                </th>
                                <th className="px-3 py-1.5 font-black text-slate-400 uppercase tracking-widest text-[10px] text-center w-[160px] select-none">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {sortedData.map((item, idx) => (
                                <tr key={idx} className="hover:bg-orange-50/10 transition-colors group">
                                    <td className="px-3 py-1">
                                        <div>
                                            <div 
                                                onClick={() => onOpenProductAnalysis && onOpenProductAnalysis(item.barkod, item.ad)}
                                                className="font-bold text-teal-650 hover:underline hover:text-teal-800 cursor-pointer"
                                                title="İlaç detaylarını görmek için tıklayın"
                                            >
                                                {item.ad}
                                            </div>
                                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">{item.barkod}</div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-1"><span className="font-bold text-slate-600">{item.stok}</span></td>
                                    <td className="px-3 py-1"><span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg font-black text-xs">{parseMiadStr(item.miad)}</span></td>
                                    <td className="px-3 py-1 text-center">
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => handleAdd(item)}
                                                className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                                                    addedItems[item.barkod]
                                                        ? "bg-emerald-600 border-emerald-600 text-white"
                                                        : "bg-white border-orange-200 hover:border-orange-300 text-orange-600 hover:bg-orange-50/50 active:scale-95"
                                                }`}
                                            >
                                                {addedItems[item.barkod] ? (
                                                    <>
                                                        <Check size={12} />
                                                        Eklendi ✓
                                                    </>
                                                ) : (
                                                    <>
                                                        <RefreshCw size={12} />
                                                        İadeye Ekle
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}