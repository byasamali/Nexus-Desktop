"use client";

import React, { useState, useMemo } from 'react';
import { PackageX, Search, AlertCircle, TrendingDown, Copy, Check, ShoppingCart, Plus, Minus } from 'lucide-react';

interface OutOfStockItem {
  barkod: string;
  ad: string;
  aylik_hiz?: number;
}

export default function OutOfStockReport({ data }: { data: OutOfStockItem[] }) {
  const [search, setSearch] = useState("");
  const [copiedBarkod, setCopiedBarkod] = useState<string | null>(null);
  const [cartQty, setCartQty] = useState<Record<string, number>>({});
  const [addedToCart, setAddedToCart] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() =>
    (data || []).filter(item =>
      item.ad?.toLowerCase().includes(search.toLowerCase()) ||
      item.barkod?.includes(search)
    ), [data, search]);

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
    // Supabase sepet entegrasyonu için global event dispatch
    window.dispatchEvent(new CustomEvent('nexus:addToCart', { detail: { barkod: item.barkod, ad: item.ad, qty } }));
    setAddedToCart(prev => ({ ...prev, [item.barkod]: true }));
    setTimeout(() => setAddedToCart(prev => ({ ...prev, [item.barkod]: false })), 2000);
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

      {/* Tablo */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">Ürün</th>
                <th className="px-6 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">Aylık Hız</th>
                <th className="px-6 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">Stok</th>
                <th className="px-6 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">Barkod</th>
                <th className="px-6 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">Sepete Ekle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((item, idx) => (
                <tr key={idx} className="hover:bg-rose-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-700 group-hover:text-rose-600 transition-colors">{item.ad}</p>
                  </td>
                  <td className="px-6 py-4">
                    {item.aylik_hiz != null && item.aylik_hiz > 0 ? (
                      <div className="flex items-center gap-1.5 text-orange-500 font-bold text-xs">
                        <TrendingDown size={13} />
                        {item.aylik_hiz.toFixed(1)} / ay
                      </div>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg font-black text-xs">
                      <AlertCircle size={12} /> 0
                    </span>
                  </td>
                  {/* Barkod kopyala */}
                  <td className="px-6 py-4">
                    <button
                      onClick={() => copyBarkod(item.barkod)}
                      className="flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1.5 rounded-lg border transition-all bg-slate-50 border-slate-200 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 text-slate-500">
                      {copiedBarkod === item.barkod
                        ? <><Check size={11} className="text-teal-500" /><span className="text-teal-600">Kopyalandı</span></>
                        : <><Copy size={11} />{item.barkod}</>}
                    </button>
                  </td>
                  {/* Sepete ekle */}
                  <td className="px-6 py-4">
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
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400 font-medium">Arama sonucu bulunamadı.</div>
          )}
        </div>
      </div>
    </div>
  );
}
