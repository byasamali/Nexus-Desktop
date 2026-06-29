"use client";

import React, { useState, useMemo } from 'react';
import { PackageX, Search, AlertCircle, TrendingDown, Copy, Check, ShoppingCart, Plus, Minus, Download, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

interface OutOfStockItem {
  barkod: string;
  ad: string;
  aylik_hiz?: number;
}

export default function OutOfStockReport({ data, onOpenProductAnalysis }: { data: OutOfStockItem[]; onOpenProductAnalysis?: (barcode: string, fallbackName?: string) => void }) {
  const [search, setSearch] = useState("");
  const [copiedBarkod, setCopiedBarkod] = useState<string | null>(null);
  const [cartQty, setCartQty] = useState<Record<string, number>>({});
  const [addedToCart, setAddedToCart] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<string>('aylik_hiz');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() =>
    (data || []).filter(item =>
      item.ad?.toLowerCase().includes(search.toLowerCase()) ||
      item.barkod?.includes(search)
    ), [data, search]);

  const sortedData = useMemo(() => {
    const list = [...filtered];
    return list.sort((a, b) => {
      let aVal = a[sortField as keyof OutOfStockItem];
      let bVal = b[sortField as keyof OutOfStockItem];

      if (aVal === undefined) aVal = '';
      if (bVal === undefined) bVal = '';

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(String(bVal), 'tr') 
          : String(bVal).localeCompare(aVal, 'tr');
      }

      const aNum = Number(aVal) || 0;
      const bNum = Number(bVal) || 0;
      return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
    });
  }, [filtered, sortField, sortOrder]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? ' ▲' : ' ▼';
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

  const addToCartHandler = async (item: OutOfStockItem) => {
    const qty = cartQty[item.barkod] || 1;
    window.dispatchEvent(new CustomEvent('nexus:addToCart', { detail: { barkod: item.barkod, ad: item.ad, qty } }));
    setAddedToCart(prev => ({ ...prev, [item.barkod]: true }));
    setTimeout(() => setAddedToCart(prev => ({ ...prev, [item.barkod]: false })), 2000);
  };

  const downloadXlsx = () => {
    if ((data || []).length === 0) return;
    const rows = (data || []).map(item => ({
      'Ürün Adı': item.ad,
      'Barkod': item.barkod,
      'Aylık Hız': item.aylik_hiz ? `${item.aylik_hiz.toFixed(1)} / ay` : '—'
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 40 }, { wch: 18 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stoğu Tükenmiş Ürünler');
    XLSX.writeFile(wb, 'stogu_tukenmis_urunler.xlsx');
  };

  const downloadPdf = () => {
    if ((data || []).length === 0) return;
    const headers = ['Ürün Adı', 'Barkod', 'Aylık Hız'];
    const rows = (data || []).map(item => [
      item.ad,
      item.barkod,
      item.aylik_hiz ? `${item.aylik_hiz.toFixed(1)} / ay` : '—'
    ]);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Stoğu Tükenmiş Ürünler Raporu</title>
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
          <h1>Stoğu Tükenmiş Ürünler Raporu</h1>
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

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
        <PackageX size={48} className="text-slate-200 mb-4" />
        <p className="text-slate-500 font-bold">Stoğu tükenen ürün yok. Harika!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Üst Özet Kartı */}
      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-rose-600 text-white rounded-2xl shadow-lg shadow-rose-200">
            <PackageX size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Stoğu Tükenmiş Ürünler</h2>
            <p className="text-slate-500 font-medium">
              Son veri paketinde stoğu sıfırlanan{' '}
              <b className="text-slate-800">{data.length}</b> ürün tespit edildi.
            </p>
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
              placeholder="Ürün adı veya barkod ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-rose-200 outline-none font-medium text-sm transition-all"
            />
          </div>
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th onClick={() => handleSort('ad')} className="px-3 py-1.5 font-black text-slate-400 uppercase tracking-wide text-[10px] cursor-pointer hover:text-slate-600 select-none">Ürün{renderSortIcon('ad')}</th>
                <th onClick={() => handleSort('aylik_hiz')} className="px-3 py-1.5 font-black text-slate-400 uppercase tracking-wide text-[10px] cursor-pointer hover:text-slate-600 select-none">Aylık Hız{renderSortIcon('aylik_hiz')}</th>
                <th className="px-3 py-1.5 font-black text-slate-400 uppercase tracking-wide text-[10px] select-none">Stok</th>
                <th className="px-3 py-1.5 font-black text-slate-400 uppercase tracking-wide text-[10px] select-none">Sepete Ekle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedData.map((item, idx) => (
                <tr key={idx} className="hover:bg-rose-50/30 transition-colors group">
                  <td className="px-3 py-1">
                    <div className="flex items-center gap-2.5">
                      <span 
                        onClick={() => onOpenProductAnalysis && onOpenProductAnalysis(item.barkod, item.ad)}
                        className="font-bold text-teal-650 hover:underline hover:text-teal-800 cursor-pointer transition-colors"
                        title="İlaç detaylarını görmek için tıklayın"
                      >
                        {item.ad}
                      </span>
                      <button
                        onClick={() => copyBarkod(item.barkod)}
                        className={`p-1 rounded hover:bg-stone-105 transition-all flex items-center gap-1.5 text-[10px] font-mono border ${
                          copiedBarkod === item.barkod ? "text-teal-650 font-bold bg-teal-50 border-teal-200" : "text-stone-400 bg-stone-50/50 border-stone-200/60"
                        }`}
                        title="Barkodu Kopyala"
                      >
                        {copiedBarkod === item.barkod ? (
                          <Check size={10} className="text-teal-500" />
                        ) : (
                          <Copy size={9} />
                        )}
                        <span>{item.barkod}</span>
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-1">
                    {item.aylik_hiz != null && item.aylik_hiz > 0 ? (
                      <div className="flex items-center gap-1.5 text-orange-500 font-bold text-xs">
                        <TrendingDown size={13} />
                        {item.aylik_hiz.toFixed(1)} / ay
                      </div>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg font-black text-xs">
                      <AlertCircle size={12} /> 0
                    </span>
                  </td>
                  <td className="px-3 py-1">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 border border-slate-200 rounded-lg overflow-hidden bg-white">
                        <button
                          onClick={() => setCartQty(prev => ({ ...prev, [item.barkod]: Math.max(1, (prev[item.barkod] || 1) - 1) }))}
                          className="px-2 py-1.5 text-slate-400 hover:bg-slate-100 transition-colors text-xs font-bold">
                          <Minus size={10} />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={cartQty[item.barkod] || 1}
                          onChange={e => setCartQty(prev => ({ ...prev, [item.barkod]: Math.max(1, parseInt(e.target.value) || 1) }))}
                          className="w-10 text-center text-xs font-bold text-slate-700 outline-none bg-transparent"
                        />
                        <button
                          onClick={() => setCartQty(prev => ({ ...prev, [item.barkod]: (prev[item.barkod] || 1) + 1 }))}
                          className="px-2 py-1.5 text-slate-400 hover:bg-slate-100 transition-colors text-xs font-bold">
                          <Plus size={10} />
                        </button>
                      </div>
                      <button
                        onClick={() => addToCartHandler(item)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${addedToCart[item.barkod]
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700'
                          }`}>
                        {addedToCart[item.barkod] ? <><Check size={11} />Eklendi</> : <><ShoppingCart size={11} />Ekle</>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedData.length === 0 && (
            <div className="text-center py-12 text-slate-400 font-medium">Arama sonucu bulunamadı.</div>
          )}
        </div>
      </div>
    </div>
  );
}
