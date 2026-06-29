import React, { useState, useMemo } from 'react';
import { Package, ShoppingCart, Check, Copy, Info, Download, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-stone-200 rounded-2xl bg-white/60">
      <div className="h-12 w-12 bg-stone-100 rounded-2xl flex items-center justify-center mb-3">
        <Package size={22} className="text-stone-300" />
      </div>
      <p className="text-sm font-bold text-stone-600">Gösterilecek ürün yok</p>
      <p className="text-xs text-stone-400 font-medium mt-1">Harika! Şu an bir eksik görünmüyor.</p>
    </div>
  );
}

export default function DataTable({ data, type, gln, handleOpenProductAnalysis }: { data: any[], type: string, gln: string, handleOpenProductAnalysis: (barcode: string, fallbackName?: string) => void }) {
  const [copiedBarkod, setCopiedBarkod] = useState<string | null>(null);
  const [cartQty, setCartQty] = useState<Record<string, number>>({});
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const [addedToReturns, setAddedToReturns] = useState<Record<string, boolean>>({});
  const [reasonItem, setReasonItem] = useState<any | null>(null);

  const addToReturnsList = async (item: any) => {
    try {
      const isWails = typeof window !== 'undefined' && (window as any).go !== undefined;
      let currentList: any[] = [];
      const barkod = item.barkod;
      const ad = item.ad || item.urun_adi || 'Bilinmeyen Ürün';
      const adet = Number(item.fazlalik) || 1;

      if (isWails && gln) {
        const content = await (window as any).go.main.App.LoadLocalJSON(gln, "iade_listesi.json");
        if (content && content !== '{}') {
          currentList = JSON.parse(content);
        }
      } else {
        const cached = localStorage.getItem(`iade_listesi_${gln}`);
        if (cached) {
          currentList = JSON.parse(cached);
        }
      }

      if (!Array.isArray(currentList)) {
        currentList = [];
      }

      const existingIdx = currentList.findIndex((i: any) => i.barkod === barkod);
      if (existingIdx > -1) {
        currentList[existingIdx].adet = (currentList[existingIdx].adet || 0) + adet;
      } else {
        currentList.push({ barkod, ad, adet });
      }

      if (isWails && gln) {
        await (window as any).go.main.App.SaveLocalJSON(gln, "iade_listesi.json", JSON.stringify(currentList));
      } else {
        localStorage.setItem(`iade_listesi_${gln}`, JSON.stringify(currentList));
      }

      setAddedToReturns(prev => ({ ...prev, [barkod]: true }));
      setTimeout(() => setAddedToReturns(prev => ({ ...prev, [barkod]: false })), 2000);
      window.dispatchEvent(new CustomEvent('nexus:iadeListesiUpdated'));
    } catch (err) {
      console.error("İadeye eklenirken hata oluştu:", err);
    }
  };

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

  const sortedData = useMemo(() => {
    let result = [...data];
    if (sortField) {
      result.sort((a: any, b: any) => {
        let valA, valB;
        if (sortField === 'ad') {
          valA = a.ad || a.urun_adi || '';
          valB = b.ad || b.urun_adi || '';
        } else if (sortField === 'deger') {
          const psfA = a.psf || a.v87 || 0;
          const fazlaA = a.fazlalik || 0;
          valA = psfA * fazlaA;
          const psfB = b.psf || b.v87 || 0;
          const fazlaB = b.fazlalik || 0;
          valB = psfB * fazlaB;
        } else {
          valA = a[sortField];
          valB = b[sortField];
        }

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
    return result;
  }, [data, sortField, sortOrder]);

  const exportXlsx = async () => {
    let rows: any[] = [];
    let filename = '';
    if (type === 'nb') {
      rows = sortedData.map(item => ({
        'Ürün Adı': item.ad || item.urun_adi || '—',
        'Barkod': item.barkod || '—',
        'Mevcut Stok': item.stok || 0,
        'Hedef Stok': item.hedef || 0,
        'Eksik (İhtiyaç)': item.ihtiyac || 0,
        'Nöbet Sıklığı / Katsayı': item.katsayi === 999 ? `%${(item.frekans * 100).toFixed(0)} (Demirbaş)` : `${item.oncelik?.toFixed(1) || 'Analitik'}`
      }));
      filename = 'nobet_hazirlik.xlsx';
    } else if (type === 'para') {
      rows = sortedData.map(item => {
        const fazla = item.fazlalik || 0;
        const psf = item.psf || item.v87 || 0;
        const val = fazla * psf;
        return {
          'Ürün Adı': item.ad || item.urun_adi || '—',
          'Barkod': item.barkod || '—',
          'Fazla Stok': fazla,
          'Stok Ömrü (Gün)': item.stok_omru || 0,
          'Mali Değer (Kayıp)': val
        };
      });
      filename = 'nakit_donusum_firsatlari.xlsx';
    }

    if (rows.length === 0) return;
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nexus Rapor');
    XLSX.writeFile(wb, filename);
  };

  const exportPdf = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let title = '';

    if (type === 'nb') {
      title = 'Nöbet Hazırlık İhtiyaç Listesi';
      headers = ['Ürün Adı', 'Barkod', 'Mevcut Stok', 'Hedef Stok', 'Eksik Adet'];
      rows = sortedData.map(item => [
        item.ad || item.urun_adi || '—',
        item.barkod || '—',
        item.stok || 0,
        item.hedef || 0,
        `+${item.ihtiyac || 0}`
      ]);
    } else if (type === 'para') {
      title = 'Nakit Dönüşüm Fırsatları Raporu';
      headers = ['Ürün Adı', 'Barkod', 'Fazla Stok', 'Stok Ömrü', 'Potansiyel Değer'];
      rows = sortedData.map(item => {
        const psf = item.psf || item.v87 || 0;
        const fazla = item.fazlalik || 0;
        const val = psf * fazla;
        return [
          item.ad || item.urun_adi || '—',
          item.barkod || '—',
          fazla,
          `${item.stok_omru} Gün`,
          `₺${val.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
        ];
      });
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 20px; color: #334155; }
            h1 { font-size: 20px; font-weight: 800; margin-bottom: 20px; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #f8fafc; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; padding: 12px 10px; border-bottom: 1px solid #e2e8f0; text-align: left; }
            td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #334155; }
            tr:nth-child(even) td { background-color: #fafafa; }
            .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: right; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
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
          <div class="footer">Oluşturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')}</div>
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

  if (!data || data.length === 0) return <EmptyState />;

  const copyBarkod = async (barkod: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(barkod);
      else {
        const el = document.createElement("textarea");
        el.value = barkod; document.body.appendChild(el); el.select();
        document.execCommand("copy"); document.body.removeChild(el);
      }
      setCopiedBarkod(barkod); setTimeout(() => setCopiedBarkod(null), 2000);
    } catch { }
  };

  const addToCart = (item: any) => {
    const qty = cartQty[item.barkod] ?? (item.ihtiyac || 1);
    window.dispatchEvent(new CustomEvent('nexus:addToCart', { detail: { barkod: item.barkod, ad: item.ad || item.urun_adi, qty } }));
    setAddedItems(prev => ({ ...prev, [item.barkod]: true }));
    setTimeout(() => setAddedItems(prev => ({ ...prev, [item.barkod]: false })), 2000);
  };

  const config: any = {
    nb: { title: "Nöbet İhtiyaç Listesi", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200" },
    para: { title: "Nakit Dönüşüm Fırsatları", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  };
  const cfg = config[type] || { title: "Liste", color: "text-stone-600", bg: "bg-stone-50", border: "border-stone-200" };

  if (type === 'nb') {
    return (
      <div className={cn("w-full bg-white rounded-2xl border shadow-sm overflow-hidden relative", cfg.border)}>
        {reasonItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4" onClick={() => setReasonItem(null)}>
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-stone-200 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-black text-stone-950 text-sm">{reasonItem.ad || reasonItem.urun_adi}</h4>
                <button onClick={() => setReasonItem(null)} className="text-stone-400 hover:text-stone-600 font-bold">✕</button>
              </div>
              <div className="text-xs text-stone-600 leading-relaxed space-y-3">
                {reasonItem.katsayi === 999 ? (
                  <p>
                    Bu ürün, geçmiş nöbetlerinizdeki yüksek çıkış sıklığına (<span className="font-bold text-violet-600">%{(reasonItem.frekans * 100).toFixed(0)}</span>) göre <span className="font-bold text-violet-600">"Nöbet Demirbaşı"</span> olarak listelenmiştir. Nöbet öncesi hedef stokta en az <span className="font-black text-stone-900">{reasonItem.hedef}</span> adet bulunması önerilir.
                  </p>
                ) : (
                  <p>
                    Bu ürün, son nöbet analizlerinize ve güncel çıkış hızınıza göre bu nöbette ihtiyaç duyulabileceği öngörülerek <span className="font-bold text-violet-600">"Analitik Öngörü"</span> ile eklenmiştir. Hedeflenen nöbet stoğu: <span className="font-black text-stone-900">{reasonItem.hedef}</span>, Mevcut stok: <span className="font-black text-stone-900">{reasonItem.stok}</span>, Gerekli tedarik: <span className="font-black text-stone-900">+{reasonItem.ihtiyac}</span> adet.
                  </p>
                )}
              </div>
              <button onClick={() => setReasonItem(null)} className="mt-6 w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-850 rounded-xl text-xs font-bold transition-all">Tamam</button>
            </div>
          </div>
        )}

        <div className={cn("px-6 py-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3", cfg.bg)}>
          <h3 className={cn("font-black text-base", cfg.color)}>{cfg.title}</h3>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button onClick={exportXlsx}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 text-[10px] font-black uppercase text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all shadow-sm">
              <Download size={12} /> Excel
            </button>
            <button onClick={exportPdf}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 text-[10px] font-black uppercase text-red-700 hover:bg-red-50 rounded-xl transition-all shadow-sm">
              PDF
            </button>
            <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-white border border-stone-200 text-stone-500 shrink-0">{data.length} kayıt</span>
          </div>
        </div>
        <div className="md:hidden divide-y divide-stone-100 bg-stone-50/30">
          {sortedData.map((item: any, i: number) => (
            <div key={i} className="p-4">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p 
                      onClick={() => item.barkod && handleOpenProductAnalysis(item.barkod, item.ad || item.urun_adi)}
                      className="font-bold text-[13px] text-teal-650 hover:underline hover:text-teal-800 cursor-pointer"
                      title="İlaç detaylarını görmek için tıklayın"
                    >
                      {item.ad || item.urun_adi || '—'}
                    </p>
                    <button onClick={() => setReasonItem(item)} className="text-stone-400 hover:text-violet-600 transition-colors" title="Neden Eklendi?">
                      <Info size={12} />
                    </button>
                  </div>
                  {item.barkod ? (
                    <button onClick={() => copyBarkod(item.barkod)}
                      className="flex items-center gap-1 text-[10px] font-mono mt-1 text-stone-400 active:text-teal-600 transition-colors">
                      {copiedBarkod === item.barkod ? <Check size={11} className="text-teal-500" /> : <Copy size={11} />}{item.barkod}
                    </button>
                  ) : <span className="text-stone-300 text-xs font-mono">—</span>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-red-600 font-black text-sm">+{item.ihtiyac}</p>
                  <p className="text-[10px] text-stone-400 font-semibold">Hedef: {item.hedef}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-0.5 border border-stone-200 rounded-xl overflow-hidden bg-white w-fit">
                  <button onClick={() => setCartQty(prev => ({ ...prev, [item.barkod]: Math.max(1, (prev[item.barkod] ?? (item.ihtiyac || 1)) - 1) }))}
                    className="h-9 px-3 text-stone-400 active:bg-stone-100 transition-colors text-sm">−</button>
                  <input type="number" min={1} value={cartQty[item.barkod] ?? (item.ihtiyac || 1)}
                    onChange={e => setCartQty(prev => ({ ...prev, [item.barkod]: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-10 h-9 text-center text-sm font-bold text-stone-700 outline-none bg-transparent" />
                  <button onClick={() => setCartQty(prev => ({ ...prev, [item.barkod]: (prev[item.barkod] ?? (item.ihtiyac || 1)) + 1 }))}
                    className="h-9 px-3 text-stone-400 active:bg-stone-100 transition-colors text-sm">+</button>
                </div>
                {item.barkod && (
                  <button onClick={() => addToCart(item)}
                    className={cn("h-9 px-4 rounded-xl text-xs font-bold border transition-all whitespace-nowrap",
                      addedItems[item.barkod] ? "bg-teal-600 text-white border-teal-600 shadow-sm" : "bg-white text-stone-600 border-stone-200 active:bg-violet-50")}>
                    {addedItems[item.barkod] ? "Eklendi" : "Sepete Ekle"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                {[
                  ['Ürün Adı', 'ad'],
                  ['Mevcut Stok', 'stok'],
                  ['Hedef', 'hedef'],
                  ['Eksik', 'ihtiyac']
                ].map(([h, field]) => (
                  <th key={h} onClick={() => handleSort(field)} className="px-4 py-3.5 font-black text-stone-400 uppercase tracking-widest text-[10px] cursor-pointer hover:text-stone-600 select-none">
                    {h} {sortField === field ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
                {['Adet', 'Sepete'].map(h => (
                  <th key={h} className="px-4 py-3.5 font-black text-stone-400 uppercase tracking-widest text-[10px] select-none">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {sortedData.map((item: any, i: number) => (
                <tr key={i} className="hover:bg-violet-50/20 transition-colors">
                  <td className="px-4 py-3 font-bold text-stone-700 text-xs">
                    <div className="flex items-center gap-2">
                      <span 
                        onClick={() => item.barkod && handleOpenProductAnalysis(item.barkod, item.ad || item.urun_adi)}
                        className="cursor-pointer hover:underline text-teal-655 hover:text-teal-800"
                        title="İlaç detaylarını görmek için tıklayın"
                      >
                        {item.ad || item.urun_adi || '—'}
                      </span>
                      {item.barkod && (
                        <>
                          <button onClick={() => copyBarkod(item.barkod)}
                            title={`${item.barkod} kopyala`}
                            className="p-1 hover:text-teal-655 hover:border-teal-200 bg-stone-50 border border-stone-200 rounded transition-colors text-stone-450">
                            {copiedBarkod === item.barkod ? <Check size={10} className="text-teal-500" /> : <Copy size={10} />}
                          </button>
                          <button onClick={() => setReasonItem(item)}
                            title="Neden Eklendi?"
                            className="p-1 hover:text-violet-600 hover:border-violet-200 bg-stone-50 border border-stone-200 rounded transition-colors text-stone-450">
                            <Info size={10} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-550 font-bold font-mono text-xs">{item.stok ?? 0}</td>
                  <td className="px-4 py-3 text-stone-500 text-xs font-mono">{item.hedef}</td>
                  <td className="px-4 py-3 text-red-600 font-black text-xs font-mono">+{item.ihtiyac}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5 border border-stone-200 rounded-lg overflow-hidden bg-white w-fit">
                      <button onClick={() => setCartQty(prev => ({ ...prev, [item.barkod]: Math.max(1, (prev[item.barkod] ?? (item.ihtiyac || 1)) - 1) }))}
                        className="px-2 py-1.5 text-stone-400 hover:bg-stone-100 transition-colors text-xs">−</button>
                      <input type="number" min={1}
                        value={cartQty[item.barkod] ?? (item.ihtiyac || 1)}
                        onChange={e => setCartQty(prev => ({ ...prev, [item.barkod]: Math.max(1, parseInt(e.target.value) || 1) }))}
                        className="w-10 text-center text-xs font-bold text-stone-700 outline-none bg-transparent" />
                      <button onClick={() => setCartQty(prev => ({ ...prev, [item.barkod]: (prev[item.barkod] ?? (item.ihtiyac || 1)) + 1 }))}
                        className="px-2 py-1.5 text-stone-400 hover:bg-stone-100 transition-colors text-xs">+</button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {item.barkod ? (
                      <button onClick={() => addToCart(item)}
                        className={cn("flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap",
                          addedItems[item.barkod] ? "bg-teal-600 text-white border-teal-600" : "bg-white text-stone-600 border-stone-200 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700")}>
                        {addedItems[item.barkod] ? <><Check size={10} />Eklendi</> : <><ShoppingCart size={10} />Ekle</>}
                      </button>
                    ) : <span className="text-stone-300 text-xs">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const paraHeaders = ['Ürün Adı', 'PSF Değeri', 'Fazla Stok', 'Ömür'];

  return (
    <div className={cn("w-full bg-white rounded-2xl border shadow-sm overflow-hidden", cfg.border)}>
      <div className={cn("px-6 py-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3", cfg.bg)}>
        <h3 className={cn("font-black text-base", cfg.color)}>{cfg.title}</h3>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button onClick={exportXlsx}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 text-[10px] font-black uppercase text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all shadow-sm">
            <Download size={12} /> Excel
          </button>
          <button onClick={exportPdf}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 text-[10px] font-black uppercase text-red-700 hover:bg-red-50 rounded-xl transition-all shadow-sm">
            PDF
          </button>
          <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-white border border-stone-200 text-stone-500 shrink-0">{data.length} kayıt</span>
        </div>
      </div>
      <div className="md:hidden divide-y divide-stone-100 bg-stone-50/20">
        {sortedData.map((item: any, i: number) => (
          <div key={i} className="p-4">
            <p 
              onClick={() => item.barkod && handleOpenProductAnalysis(item.barkod, item.ad || item.urun_adi)}
              className="font-bold text-teal-655 hover:underline hover:text-teal-800 cursor-pointer text-[13px] mb-3 leading-snug"
              title="İlaç detaylarını görmek için tıklayın"
            >
              {item.ad || item.urun_adi || "Bilinmeyen Ürün"}
            </p>
            {type === 'para' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 justify-between bg-white px-4 py-3 rounded-xl border border-stone-200/60 shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-0.5">Fazla</span>
                    <span className="text-red-500 font-black text-sm">-{item.fazlalik}</span>
                  </div>
                  <div className="w-px h-6 bg-stone-100" />
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-0.5">Ömür</span>
                    <span className="text-stone-600 font-bold text-[13px]">{item.stok_omru} Gün</span>
                  </div>
                  <div className="w-px h-6 bg-stone-100" />
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-0.5">Değer</span>
                    {(() => {
                      const psf = item.psf || item.v87 || 0;
                      const fazla = item.fazlalik || 0;
                      const val = psf && fazla ? (Number(psf) * Number(fazla)) : null;
                      return val ? <span className="font-black text-emerald-600 text-sm">₺{val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> : <span className="text-stone-300 font-bold text-sm">—</span>;
                    })()}
                  </div>
                </div>
                {item.barkod && (
                  <button
                    onClick={() => addToReturnsList(item)}
                    className={cn("w-full py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5",
                      addedToReturns[item.barkod] ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-stone-600 border-stone-200 active:bg-emerald-50")}
                  >
                    {addedToReturns[item.barkod] ? <><Check size={12} />İadeye Eklendi</> : <><RefreshCw size={12} />İadeye Ekle</>}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="hidden md:block overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 border-b border-stone-100">
            <tr>
              {[
                ['Ürün Adı', 'ad'],
                ['PSF Değeri', 'deger'],
                ['Fazla Stok', 'fazlalik'],
                ['Ömür', 'stok_omru']
              ].map(([h, field]) => (
                <th key={h} onClick={() => handleSort(field)} className="px-6 py-3.5 font-black text-stone-400 uppercase tracking-widest text-[10px] cursor-pointer hover:text-stone-600 select-none">
                  {h} {sortField === field ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
              {type === 'para' && (
                <th className="px-6 py-3.5 font-black text-stone-400 uppercase tracking-widest text-[10px] select-none">İade</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {sortedData.map((item: any, i: number) => (
              <tr key={i} className="hover:bg-stone-50/60 transition-colors">
                <td className="px-6 py-4 font-bold text-stone-700 text-xs">
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => item.barkod && handleOpenProductAnalysis(item.barkod, item.ad || item.urun_adi)}
                      className="cursor-pointer hover:underline text-teal-655 hover:text-teal-800"
                      title="İlaç detaylarını görmek için tıklayın"
                    >
                      {item.ad || item.urun_adi || "Bilinmeyen Ürün"}
                    </span>
                    {item.barkod && (
                      <button onClick={() => copyBarkod(item.barkod)}
                        title={`${item.barkod} kopyala`}
                        className="p-1 hover:text-teal-655 hover:border-teal-300 bg-stone-50 border border-stone-200 rounded transition-colors text-stone-400">
                        {copiedBarkod === item.barkod ? <Check size={10} className="text-teal-500" /> : <Copy size={10} />}
                      </button>
                    )}
                  </div>
                </td>
                {type === 'para' && (
                  <>
                    <td className="px-6 py-4 text-xs">
                      {(() => {
                        const psf = item.psf || item.v87 || 0;
                        const fazla = item.fazlalik || 0;
                        const val = psf && fazla ? (Number(psf) * Number(fazla)) : null;
                        return val ? <span className="font-black text-emerald-600">₺{val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> : <span className="text-stone-300">—</span>;
                      })()}
                    </td>
                    <td className="px-6 py-4 text-red-500 font-bold text-xs">-{item.fazlalik}</td>
                    <td className="px-6 py-4 text-stone-500 text-xs">{item.stok_omru} Gün</td>
                    <td className="px-6 py-4 text-xs">
                      {item.barkod ? (
                        <button
                          onClick={() => addToReturnsList(item)}
                          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap",
                            addedToReturns[item.barkod] ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white text-stone-600 border-stone-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700")}
                        >
                          {addedToReturns[item.barkod] ? <><Check size={10} />Eklendi</> : <><RefreshCw size={10} />İadeye Ekle</>}
                        </button>
                      ) : <span className="text-stone-300">—</span>}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
