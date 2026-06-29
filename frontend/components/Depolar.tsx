"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Globe, Plus, X, Eye, EyeOff, Trash2,
  Copy, Check, ExternalLink, RefreshCw,
  ShoppingCart, Store, Lock, User, Link2,
  Search, ArrowLeft, ArrowRight, Truck, Settings
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Tipler ──────────────────────────────────────────────────────────────────

type CartItem = { qty: number; mf: number; inCart: boolean; ad: string; depo: string };

type InterceptLog = {
  id: string;
  timestamp: string;
  barcode: string;
  name: string;
  dsf: number;
  psf: number;
  baremler: { ana: number; mf: number }[];
  supplier: string;
};

type GekProduct = {
  matnr: string;
  klasm: string;
  ad: string;
  stok: number | string;
  psf: string;
  timestamp: number;
  url: string;
};

export type Depo = {
  id: string; ad: string; url: string;
  kullanici: string; kod: string; sifre: string; renk: string;
  autoOpen?: boolean;
  enabled?: boolean;
};

type BrowserTab = {
  id: string;
  proxyUrl: string;   // http://127.0.0.1:PORT  (iframe src)
  displayUrl: string; // https://depo.com (adres çubuğunda gösterilen)
  title: string;
  depoId?: string;
};

type PendingOrder = {
  barcode: string;
  qty: number;
  timestamp: number;
};

type OrderResult = {
  ok: boolean;
  barcode: string;
  qty?: number;
  error?: string;
  data?: any;
};

type ToastMsg = {
  id: number;
  message: string;
  type: 'success' | 'error' | 'loading';
};

export interface DepolarProps {
  cart: Record<string, CartItem>;
  gln: string;
  onBack: () => void;
  onGoToSettings?: () => void;
  isActive?: boolean;
}

// ── Renk paleti ─────────────────────────────────────────────────────────────

export const DEPO_COLORS = [
  { label: 'Teal',    value: '#14b8a6' },
  { label: 'Violet',  value: '#8b5cf6' },
  { label: 'Amber',   value: '#f59e0b' },
  { label: 'Rose',    value: '#f43f5e' },
  { label: 'Blue',    value: '#3b82f6' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Orange',  value: '#f97316' },
  { label: 'Indigo',  value: '#6366f1' },
];

// ── Yardımcılar ─────────────────────────────────────────────────────────────

const LOCAL_KEY = 'nexus_depolar';
const DELETED_KEY = 'nexus_depolar_silindi'; // kullanıcının kasıtlı sildiği default ID'leri

const GEK_TOKEN_SCRIPT = `
  (function() {
    // 1. window.__gekToken (preload tarafından set edilmiş)
    if (window.__gekToken && window.__gekToken.length > 10) return window.__gekToken;
    // 2. localStorage / sessionStorage tara
    const stores = [window.localStorage, window.sessionStorage];
    const keys = ['token','Token','TOKEN','gek_token','gekToken','accessToken','access_token','auth_token','authToken','jwt','JWT'];
    for (const store of stores) {
      if (!store) continue;
      for (const k of keys) {
        try {
          const v = store.getItem(k);
          if (v && v.length > 10 && !v.startsWith('{')) return v;
          if (v && v.length > 10) {
            try { const j = JSON.parse(v); const t = j.token||j.Token||j.TOKEN||j.accessToken||j.access_token||j.currentSession?.access_token; if(t) return t; } catch {}
          }
        } catch {}
      }
      // Tüm key'lere bak
      try {
        for (let i = 0; i < store.length; i++) {
          const k = store.key(i);
          if (!k) continue;
          const v = store.getItem(k);
          if (!v) continue;
          if (v.length > 10 && !v.startsWith('{') && (k.toLowerCase().includes('token') || k.toLowerCase().includes('auth') || k.toLowerCase().includes('jwt'))) {
            return v;
          }
          try { 
            const j = JSON.parse(v); 
            const t = j.token||j.Token||j.TOKEN||j.accessToken||j.access_token||j.currentSession?.access_token; 
            if(t && String(t).length > 10) return String(t); 
          } catch {}
        }
      } catch {}
    }
    // 3. Cookie'lerden ara
    try {
      const cookies = document.cookie.split(';');
      for (const c of cookies) {
        const [k, v] = c.trim().split('=');
        if (k && ['token','Token','TOKEN','auth','jwt'].some(kk => k.toLowerCase().includes(kk))) {
          if (v && v.length > 10) return decodeURIComponent(v);
        }
      }
    } catch {}
    return null;
  })()
`;

export const DEFAULT_DEPOLAR: Depo[] = [
  { id: 'selcuk',  ad: 'Selçuk Ecza', url: 'https://webdepo.selcukecza.com.tr/', kullanici: '', kod: '', sifre: '', renk: '#3b82f6', enabled: true },
  { id: 'as_ecza', ad: 'AS Ecza',     url: 'https://webdepo.asecza.com.tr/',     kullanici: '', kod: '', sifre: '', renk: '#14b8a6', enabled: true },
  { id: 'nevzat',  ad: 'Nevzat Ecza', url: 'http://webdepo.nevzatecza.com.tr/',  kullanici: '', kod: '', sifre: '', renk: '#f59e0b', enabled: true },
  { id: 'cam',     ad: 'Cam Ecza',    url: 'https://webdepo.camecza.com/',       kullanici: '', kod: '', sifre: '', renk: '#0891b2', enabled: true },
  { id: 'iskoop',  ad: 'İskoop',      url: 'https://esube.iskoop.org/',           kullanici: '', kod: '', sifre: '', renk: '#8b5cf6', enabled: true },
  { id: 'bek',     ad: 'BEK',         url: 'https://esube.bek.org.tr/',           kullanici: '', kod: '', sifre: '', renk: '#10b981', enabled: true },
  { id: 'gek',     ad: 'GEK',         url: 'https://esube.gek.org.tr/',           kullanici: '', kod: '', sifre: '', renk: '#f97316', enabled: true },
  { id: 'sancak',  ad: 'Sancak Ecza', url: 'https://eticaret.sancakecza.com.tr/', kullanici: '', kod: '', sifre: '', renk: '#2563eb', enabled: true },
  { id: 'alliance',ad: 'Alliance',    url: 'https://esiparisv2.alliance-healthcare.com.tr/', kullanici: '', kod: '', sifre: '', renk: '#dc2626', enabled: true },
  { id: 'farmazon',ad: 'Farmazon',    url: 'https://eczaci.farmazon.com.tr/',    kullanici: '', kod: '', sifre: '', renk: '#581c87', enabled: true },
];

export function loadDeletedIds(): Set<string> {
  try {
    if (typeof window === 'undefined') return new Set();
    const r = localStorage.getItem(DELETED_KEY);
    return r ? new Set(JSON.parse(r)) : new Set();
  } catch { return new Set(); }
}

export function saveDeletedId(id: string) {
  try {
    if (typeof window === 'undefined') return;
    const ids = loadDeletedIds();
    ids.add(id);
    localStorage.setItem(DELETED_KEY, JSON.stringify([...ids]));
  } catch {}
}

export function loadDepolar(): Depo[] {
  try {
    if (typeof window === 'undefined') return [...DEFAULT_DEPOLAR];
    const deleted = loadDeletedIds();
    const r = localStorage.getItem(LOCAL_KEY);
    const existing: Depo[] = r ? JSON.parse(r) : [];
    const existingIds = new Set(existing.map(d => d.id));
    const toAdd = DEFAULT_DEPOLAR.filter(d => !deleted.has(d.id) && !existingIds.has(d.id));
    const merged = [...toAdd, ...existing];
    if (toAdd.length > 0) saveDepolar(merged);
    return merged;
  } catch {
    return [...DEFAULT_DEPOLAR];
  }
}
export function saveDepolar(d: Depo[]) {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LOCAL_KEY, JSON.stringify(d));
  } catch {}
}
export function randomId() { return Math.random().toString(36).slice(2, 10); }
export function ensureHttp(url: string) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return 'https://' + url;
}

/** HTML içindeki <span> taglarını parse eder (MF verisi için) */
function extractSpans(html: string): string[] {
  if (!html) return [];
  const matches: string[] = [];
  const regex = /<span>(.*?)<\/span>/g;
  let m;
  while ((m = regex.exec(html)) !== null) matches.push(m[1].trim());
  return matches;
}

/** Türkçe/İngilizce fiyat stringini number'a çevirir */
function parsePrice(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).trim();
  
  // Eğer hem nokta hem virgül varsa
  if (str.includes('.') && str.includes(',')) {
    const dotIdx = str.indexOf('.');
    const commaIdx = str.indexOf(',');
    if (commaIdx > dotIdx) {
      // Türkçe format: 1.170,50 -> Noktaları sil, virgülü nokta yap
      return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    } else {
      // İngilizce format: 1,170.50 -> Virgülleri sil
      return parseFloat(str.replace(/,/g, '')) || 0;
    }
  }
  
  // Sadece virgül varsa: 117,10 -> Nokta yap
  if (str.includes(',')) {
    return parseFloat(str.replace(',', '.')) || 0;
  }
  
  // Sadece nokta varsa veya hiçbir şey yoksa: 117.10 veya 117 -> Doğrudan parse et
  return parseFloat(str) || 0;
}

/** Sorgulanan depo/kampanya verileriyle SQLite veritabanını günceller */
async function updateDbWithLiveData(
  barcode: string,
  dsf: number,
  psf: number,
  mfList: string[]
) {
  try {
    const dbMfBaremleri: { ana: number; mf: number }[] = [];
    
    const parseMfBarem = (mfStr: string | null | undefined) => {
      if (!mfStr) return null;
      const clean = mfStr.trim();
      if (!clean.includes('+')) return null;
      const parts = clean.split('+');
      if (parts.length < 2) return null;
      const ana = parseInt(parts[0]);
      const mf = parseInt(parts[1]);
      if (isNaN(ana) || isNaN(mf)) return null;
      if (mf <= 0) return null; // xx+0 şeklinde olan mf ler aslında mf değildir
      return { ana, mf };
    };

    mfList.forEach(rawMf => {
      const parsed = parseMfBarem(rawMf);
      if (parsed) dbMfBaremleri.push(parsed);
    });

    const mfBaremleriStr = JSON.stringify(dbMfBaremleri);

    if ((window as any).go?.main?.App?.RunCategoryAction) {
      const responseStr = await (window as any).go.main.App.RunCategoryAction(
        "update-live-data",
        JSON.stringify({
          barcode,
          data: {
            dsf: dsf,
            psf: psf,
            mf_baremleri: mfBaremleriStr
          }
        })
      );
      console.log(`[Database Update] ${barcode} için veriler güncellendi:`, responseStr);
    }
  } catch (err) {
    console.error(`[Database Update] ${barcode} güncelleme hatası:`, err);
  }
}

const isWails = typeof window !== 'undefined' && (window as any).go !== undefined;

async function startProxy(url: string): Promise<string> {
  if (!isWails) return url; // geliştirme modunda direkt URL
  try {
    return await (window as any).go.main.App.StartDepoProxy(url);
  } catch (e) {
    console.error('Proxy başlatılamadı:', e);
    return url;
  }
}
async function stopProxy(proxyUrl: string) {
  if (!isWails) return;
  try { await (window as any).go.main.App.StopDepoProxy(proxyUrl); } catch {}
}

function openExternal(url: string) {
  if (!url) return;
  if (isWails && (window as any).go?.main?.App?.OpenURLInBrowser) {
    (window as any).go.main.App.OpenURLInBrowser(url);
  } else {
    window.open(url, '_blank');
  }
}

// ── Toast Bildirimi ──────────────────────────────────────────────────────────

function ToastNotification({ toast, onClose }: { toast: ToastMsg | null; onClose: () => void }) {
  if (!toast) return null;
  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-[13px] font-bold max-w-sm pointer-events-auto",
      toast.type === 'success' && "bg-emerald-600",
      toast.type === 'error'   && "bg-red-500",
      toast.type === 'loading' && "bg-stone-800"
    )}>
      {toast.type === 'loading' && <RefreshCw size={14} className="animate-spin shrink-0" />}
      {toast.type === 'success' && <Check size={14} className="shrink-0" />}
      {toast.type === 'error'   && <X size={14} className="shrink-0" />}
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button onClick={onClose} className="ml-1 opacity-60 hover:opacity-100 transition-opacity shrink-0">
        <X size={12} />
      </button>
    </div>
  );
}

// ── Mini Sepet ───────────────────────────────────────────────────────────────

// ── Mini Sepet ───────────────────────────────────────────────────────────────

function MiniSepet({
  cart,
  onBarcodeDoubleClick,
  bulkQueryResult,
  bulkQueryLoading,
  onBulkQuery,
  activeDepoAd = 'Aktif Depo',
}: {
  cart: Record<string, CartItem>;
  onBarcodeDoubleClick?: (barcode: string) => void;
  bulkQueryResult?: Record<string, { ok: boolean; stok?: number; fiyat_depocu?: number; mf?: string; net?: number; error?: string }>;
  bulkQueryLoading?: boolean;
  onBulkQuery?: () => void;
  activeDepoAd?: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const cartItems = Object.entries(cart)
    .filter(([, v]) => v.inCart && v.qty > 0)
    .filter(([barkod, v]) =>
      search === '' ||
      v.ad.toLowerCase().includes(search.toLowerCase()) ||
      barkod.includes(search)
    );

  const totalKutu = cartItems.reduce((a, [, v]) => a + v.qty, 0);

  const copyText = useCallback(async (text: string, key: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement('textarea');
        el.value = text; document.body.appendChild(el);
        el.select(); document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(key); setTimeout(() => setCopied(null), 1800);
    } catch {}
  }, []);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Başlık */}
      <div className="px-4 pt-4 pb-3 border-b border-stone-100 shrink-0">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-teal-600 flex items-center justify-center">
              <ShoppingCart size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[13px] font-black text-stone-900 leading-none">Sipariş Sepeti</p>
              <p className="text-[10px] text-stone-400 font-medium mt-0.5">
                {cartItems.length} kalem · {totalKutu} kutu
              </p>
            </div>
          </div>
          {cartItems.length > 0 && onBulkQuery && (
            <button
              onClick={onBulkQuery}
              disabled={bulkQueryLoading}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all border shrink-0",
                bulkQueryLoading
                  ? "bg-stone-50 border-stone-200 text-stone-400 cursor-not-allowed"
                  : "bg-teal-50 hover:bg-teal-100 border-teal-200 text-teal-700 active:scale-95"
              )}
              title={`Sepetteki tüm ürünleri ${activeDepoAd} üzerinden sorgular`}
            >
              <RefreshCw size={10} className={cn("text-teal-600", bulkQueryLoading && "animate-spin")} />
              {bulkQueryLoading ? "Sorgulanıyor..." : "Toplu Sorgula"}
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-stone-400" />
          <input type="text" placeholder="İlaç ara..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-7 pr-3 h-8 text-[11px] bg-stone-50 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all" />
        </div>
      </div>
 
       {/* Liste */}
       <div className="flex-1 overflow-y-auto">
         {cartItems.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-full gap-3 text-stone-300 px-4 text-center">
             <ShoppingCart size={32} strokeWidth={1.5} />
             <div>
               <p className="text-[12px] font-semibold text-stone-400">Sepet boş</p>
               <p className="text-[11px] text-stone-300 mt-0.5">Sipariş önerisinden ürün ekleyin</p>
             </div>
           </div>
         ) : (
           <div className="divide-y divide-stone-50">
             {cartItems.map(([barkod, item]) => {
               const firstName = item.ad.split(' ')[0];
               const isCB = copied === `barkod-${barkod}`;
               const isCA = copied === `ad-${barkod}`;
               const res = bulkQueryResult?.[barkod];
               return (
                 <div key={barkod} className="group px-3 py-2.5 hover:bg-stone-50/80 transition-colors">
                   <button onClick={() => copyText(firstName, `ad-${barkod}`)}
                     title={`"${firstName}" kopyala`}
                     className="w-full text-left mb-1 flex items-start gap-1.5 group/ad">
                     <span className={cn("text-[11px] font-semibold leading-tight flex-1 transition-colors",
                       isCA ? "text-teal-600" : "text-stone-800 group-hover/ad:text-teal-700")}>
                       {item.ad}
                     </span>
                     {isCA ? <Check size={10} className="text-teal-500 shrink-0 mt-0.5" />
                       : <Copy size={9} className="text-stone-300 group-hover/ad:text-teal-400 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-all" />}
                   </button>
                   <div className="flex items-center justify-between gap-2">
                     <button
                       onClick={() => copyText(barkod, `barkod-${barkod}`)}
                       onDoubleClick={(e) => {
                         e.stopPropagation();
                         onBarcodeDoubleClick?.(barkod);
                       }}
                       title={`Tek tık: kopyala · Çift tık: ${activeDepoAd} sepetine ekle`}
                       className={cn("flex items-center gap-1 px-2 py-0.5 rounded-md border transition-all font-mono text-[10px] font-bold group/bk",
                         isCB ? "bg-teal-50 border-teal-200 text-teal-700" : "bg-stone-50 border-stone-200 text-stone-500 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700")}
                     >
                       {isCB ? <Check size={9} className="text-teal-500" /> : <Copy size={9} className="text-stone-400 group-hover/bk:text-teal-500" />}
                       {barkod}
                     </button>
                     <div className="flex items-center gap-1 shrink-0">
                       <span className="text-[10px] font-black text-stone-800 bg-stone-100 px-2 py-0.5 rounded-md">
                         {item.qty} <span className="font-medium text-stone-400">kutu</span>
                       </span>
                       {item.mf > 0 && (
                         <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">+{item.mf}</span>
                       )}
                     </div>
                   </div>
                   {res && (
                     <div className="mt-1.5 pt-1.5 border-t border-dashed border-stone-100 flex items-center justify-between text-[10px] text-stone-500 font-medium">
                       {res.ok ? (
                         <>
                           <div className="flex items-center gap-1.5">
                             {res.mf ? (
                               <span className="bg-amber-50 text-amber-700 font-bold px-1 py-0.2 rounded text-[9px]">
                                 MF: {res.mf}
                               </span>
                             ) : (
                               <span className="text-[9px] text-stone-400 font-medium italic">MF Yok</span>
                             )}
                           </div>
                           <span className="font-bold text-stone-700">
                             {res.net ? `${res.net.toFixed(2)} TL` : res.fiyat_depocu ? `${res.fiyat_depocu.toFixed(2)} TL` : ''}
                           </span>
                         </>
                       ) : (
                         <span className="text-rose-500 text-[9px]">
                           {res.error === 'not_found' ? 'Bulunamadı' : 'Sorgu hatası'}
                         </span>
                       )}
                     </div>
                   )}
                 </div>
               );
             })}
           </div>
         )}
      </div>
    </div>
  );
}

// ── Depo Ekleme / Düzenleme Modalı ──────────────────────────────────────────

export function DepoModal({ depo, onSave, onClose }: { depo?: Depo; onSave: (d: Depo) => void; onClose: () => void }) {
  const [form, setForm] = useState<Depo>(depo || {
    id: randomId(), ad: '', url: '', kullanici: '', kod: '', sifre: '', renk: DEPO_COLORS[0].value,
  });
  const [showPass, setShowPass] = useState(false);
  const set = (k: keyof Depo, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-950/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-stone-100">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: form.renk + '20' }}>
              <Store size={15} style={{ color: form.renk }} />
            </div>
            <h2 className="text-sm font-black text-stone-900">{depo ? 'Depo Düzenle' : 'Yeni Depo Ekle'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 transition-colors"><X size={16} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Renk */}
          <div>
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2">Renk</label>
            <div className="flex gap-2 flex-wrap">
              {DEPO_COLORS.map(c => (
                <button key={c.value} onClick={() => set('renk', c.value)}
                  className={cn("w-7 h-7 rounded-lg transition-all border-2", form.renk === c.value ? "border-stone-800 scale-110 shadow-md" : "border-transparent hover:border-stone-300")}
                  style={{ backgroundColor: c.value }} />
              ))}
            </div>
          </div>
          {/* Ad */}
          <div>
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-1.5">Depo Adı</label>
            <input type="text" placeholder="örn. DEF Ecza" value={form.ad} onChange={e => set('ad', e.target.value)}
              className="w-full h-9 px-3 text-[12px] font-medium border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 bg-stone-50 transition-all" />
          </div>
          {/* URL */}
          <div>
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-1.5">Giriş URL</label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
              <input type="url" placeholder="https://depo.com/giris" value={form.url} onChange={e => set('url', e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-[12px] font-medium border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 bg-stone-50 transition-all" />
            </div>
          </div>
          {/* Kullanıcı + Kod */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-1.5">Kullanıcı Adı</label>
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                <input type="text" placeholder="kullanici" value={form.kullanici} onChange={e => set('kullanici', e.target.value)}
                  className="w-full h-9 pl-8 pr-2 text-[12px] font-medium border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 bg-stone-50 transition-all" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-1.5">Gln / Kod</label>
              <input type="text" placeholder="GLN kodu" value={form.kod} onChange={e => set('kod', e.target.value)}
                className="w-full h-9 px-3 text-[12px] font-medium border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 bg-stone-50 transition-all" />
            </div>
          </div>
          {/* Şifre */}
          <div>
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-1.5">Şifre</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
              <input type={showPass ? 'text' : 'password'} placeholder="••••••••" value={form.sifre} onChange={e => set('sifre', e.target.value)}
                className="w-full h-9 pl-9 pr-10 text-[12px] font-medium border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 bg-stone-50 transition-all" />
              <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors">
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Aktif & Otomatik Aç Seçenekleri */}
          <div className="flex gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[12px] font-semibold text-stone-600">
              <input type="checkbox" checked={form.enabled !== false} onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} className="w-4 h-4 accent-teal-600 cursor-pointer rounded border-stone-300" />
              Aktif
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none text-[12px] font-semibold text-stone-600">
              <input type="checkbox" checked={!!form.autoOpen} onChange={e => setForm(f => ({ ...f, autoOpen: e.target.checked }))} className="w-4 h-4 accent-teal-600 cursor-pointer rounded border-stone-300" />
              Otomatik Aç
            </label>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-stone-100 flex gap-3">
          <button onClick={onClose} className="flex-1 h-9 rounded-xl border border-stone-200 text-stone-600 font-semibold text-[12px] hover:bg-stone-50 transition-colors">İptal</button>
          <button onClick={() => { if (form.ad && form.url) onSave(form); }}
            disabled={!form.ad || !form.url}
            className="flex-1 h-9 rounded-xl bg-stone-900 text-white font-bold text-[12px] hover:bg-stone-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {depo ? 'Kaydet' : 'Ekle'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Depo Kartı (sol liste) ───────────────────────────────────────────────────

function DepoCard({ depo, onOpen, onEdit, onDelete }: {
  depo: Depo; onOpen: (d: Depo) => void; onEdit: (d: Depo) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className={cn("group relative flex items-center gap-3 px-4 py-3 rounded-2xl border border-stone-100 bg-white hover:border-stone-200 hover:shadow-md transition-all cursor-pointer",
      depo.enabled === false && "opacity-50")}
      onClick={() => onOpen(depo)}>
      <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-white font-black text-[13px] shadow-sm"
        style={{ backgroundColor: depo.enabled === false ? '#cbd5e1' : depo.renk }}>
        {depo.ad.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-black text-stone-900 truncate">{depo.ad}</p>
        <p className="text-[10px] text-stone-400 font-medium truncate mt-0.5">{depo.url}</p>
        {(depo.kullanici || depo.kod) && (
          <p className="text-[10px] text-stone-400 truncate">
            {depo.kullanici && <span className="text-stone-500 font-medium">{depo.kullanici}</span>}
            {depo.kullanici && depo.kod && <span className="mx-1 text-stone-300">·</span>}
            {depo.kod && <span className="font-mono text-stone-500">{depo.kod}</span>}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
        <button onClick={e => { e.stopPropagation(); onOpen(depo); }} className="p-1.5 rounded-lg hover:bg-teal-50 text-stone-400 hover:text-teal-600 transition-colors" title="Aç"><ExternalLink size={13} /></button>
        <button onClick={e => { e.stopPropagation(); onEdit(depo); }} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors" title="Düzenle"><User size={13} /></button>
        <button onClick={e => { e.stopPropagation(); onDelete(depo.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-500 transition-colors" title="Sil"><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

const getAutofillScript = (depo: any, autoSubmit = false) => {
  const code = (depo.kod || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  const user = (depo.kullanici || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  const pass = (depo.sifre || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  
  return `
    (function() {
      console.log("[Nexus Autofill] Starting credentials auto-fill loop for ${depo.id}...");
      
      const setInputValue = (input, val) => {
        if (!input) return false;
        if (input.value === val) return true;
        
        input.focus();
        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        if (nativeSetter) {
          nativeSetter.call(input, val);
        } else {
          input.value = val;
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.blur();
        return true;
      };

      const triggerSubmit = (btn) => {
        try {
          const url = window.location.href;
          const attemptKey = 'nexus_auto_login_attempted_' + encodeURIComponent(url);
          if (!sessionStorage.getItem(attemptKey)) {
            sessionStorage.setItem(attemptKey, 'true');
            if (btn) {
              console.log("[Nexus Autofill] Auto-submitting login form via button click...");
              btn.click();
            } else {
              const form = document.querySelector('form');
              if (form) {
                console.log("[Nexus Autofill] Auto-submitting parent form...");
                form.submit();
              }
            }
          } else {
            console.log("[Nexus Autofill] Auto-submit already attempted for this session, skipping.");
          }
        } catch (e) {
          console.error("[Nexus Autofill] Error in triggerSubmit:", e);
        }
      };

      const url = window.location.href;
      let attempts = 0;
      const maxAttempts = 30;

      if (window.__nexusAutofillInterval) {
        clearInterval(window.__nexusAutofillInterval);
      }

      window.__nexusAutofillInterval = setInterval(() => {
        attempts++;
        if (attempts > maxAttempts) {
          clearInterval(window.__nexusAutofillInterval);
          window.__nexusAutofillInterval = null;
          console.log("[Nexus Autofill] Stopped polling after max attempts.");
          return;
        }

        // 1. Selcuk, AS Ecza, Nevzat (EGAS Webdepo portals)
        if (url.includes('selcuk') || url.includes('asecza') || url.includes('nevzatecza') || url.includes('webdepo')) {
          const txtCode = document.querySelector('#txtEczaneKodu') || 
                          document.querySelector('input[id$="txtEczaneKodu"]') || 
                          document.querySelector('input[name*="txtEczaneKodu"]');
          const txtUser = document.querySelector('#txtKullaniciAdi') || 
                          document.querySelector('input[id$="txtKullaniciAdi"]') || 
                          document.querySelector('input[name*="txtKullaniciAdi"]');
          const txtPass = document.querySelector('#txtSifre') || 
                          document.querySelector('input[id$="txtSifre"]') || 
                          document.querySelector('input[name*="txtSifre"]');
          
          if (txtCode && "${user}" && txtCode.value !== "${user}") {
            setInputValue(txtCode, "${user}");
          }
          if (txtUser && "${code}" && txtUser.value !== "${code}") {
            setInputValue(txtUser, "${code}");
          }
          if (txtPass && "${pass}" && txtPass.value !== "${pass}") {
            setInputValue(txtPass, "${pass}");
          }
          
          const codeReady = !"${user}" || (txtCode && txtCode.value === "${user}");
          const userReady = !"${code}" || (txtUser && txtUser.value === "${code}");
          const passReady = !"${pass}" || (txtPass && txtPass.value === "${pass}");
          
          if (codeReady && userReady && passReady) {
            clearInterval(window.__nexusAutofillInterval);
            window.__nexusAutofillInterval = null;
            console.log("[Nexus Autofill] All fields filled, stopping poll.");
            
            if (${autoSubmit}) {
              const submitBtn = document.querySelector('#btnGiris') || 
                                document.querySelector('input[id$="btnGiris"]') || 
                                document.querySelector('input[name*="btnGiris"]') || 
                                document.querySelector('input[type="submit"]') || 
                                document.querySelector('button[type="submit"]');
              triggerSubmit(submitBtn);
            }
          }
        }
        
        // 2. BEK, GEK, Iskop (Coop E-Şube portals)
        else if (url.includes('bek.org.tr') || url.includes('gek.org.tr') || url.includes('iskoop.org') || url.includes('esube')) {
          const inputs = Array.from(document.querySelectorAll('input'));
          
          const usernameInput = inputs.find(i => {
            const type = (i.getAttribute('type') || '').toLowerCase();
            if (type !== 'text' && type !== 'number' && type !== 'tel') return false;
            
            const id = (i.getAttribute('id') || '').toLowerCase();
            const name = (i.getAttribute('name') || '').toLowerCase();
            const fcn = (i.getAttribute('formcontrolname') || '').toLowerCase();
            const ph = (i.getAttribute('placeholder') || '').toLowerCase();
            
            return name.includes('username') || name.includes('user') || name.includes('kod') || name.includes('ortak') || name.includes('kullanici') ||
                   id.includes('username') || id.includes('user') || id.includes('kod') || id.includes('ortak') || id.includes('kullanici') ||
                   fcn.includes('username') || fcn.includes('user') || fcn.includes('kod') || fcn.includes('ortak') || fcn.includes('kullanici') ||
                   ph.includes('kullanıcı') || ph.includes('ortak') || ph.includes('kod') || ph.includes('eczane');
          }) || inputs.find(i => {
            const type = (i.getAttribute('type') || '').toLowerCase();
            return (type === 'text' || type === 'number' || type === 'tel') && i.offsetWidth > 0 && i.offsetHeight > 0;
          });

          const passwordInput = inputs.find(i => (i.getAttribute('type') || '').toLowerCase() === 'password');

          const loginVal = "${code}" || "${user}";
          if (usernameInput && loginVal && usernameInput.value !== loginVal) {
            setInputValue(usernameInput, loginVal);
          }
          if (passwordInput && "${pass}" && passwordInput.value !== "${pass}") {
            setInputValue(passwordInput, "${pass}");
          }

          const userReady = !loginVal || (usernameInput && usernameInput.value === loginVal);
          const passReady = !"${pass}" || (passwordInput && passwordInput.value === "${pass}");
          
          if (userReady && passReady) {
            clearInterval(window.__nexusAutofillInterval);
            window.__nexusAutofillInterval = null;
            console.log("[Nexus Autofill] All fields filled, stopping poll.");
            
            if (${autoSubmit}) {
              const submitBtn = document.querySelector('button[type="submit"]') || 
                                document.querySelector('input[type="submit"]') || 
                                document.querySelector('.btn-login') || 
                                document.querySelector('#btnLogin') || 
                                document.querySelector('button[id$="btnGiris"]');
              triggerSubmit(submitBtn);
            }
          }
        }
      }, 300);
    })();
  `;
};

// ── Tarayıcı Paneli (proxy-destekli webview) ─────────────────────────────────

function BrowserPanel({
  tabs, activeTabId, onTabChange, onTabClose, onTabAdd, onNavigate, preloadPath, onIpcMessage, pendingSearch, onSearchProcessed, pendingOrder, onOrderProcessed, onOrderResult, webviewRefs: extWebviewRefs, depolar
}: {
  tabs: BrowserTab[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  onTabClose: (id: string) => void;
  onTabAdd: () => void;
  onNavigate: (id: string, proxyUrl: string, displayUrl: string) => void;
  preloadPath?: string;
  onIpcMessage: (event: any) => void;
  pendingSearch: { barcode: string; timestamp: number } | null;
  onSearchProcessed: () => void;
  pendingOrder: PendingOrder | null;
  onOrderProcessed: () => void;
  onOrderResult: (result: OrderResult) => void;
  webviewRefs?: React.MutableRefObject<Record<string, any>>;
  depolar: Depo[];
}) {
  const [addressBar, setAddressBar] = useState('');
  const depolarRef = useRef(depolar);
  depolarRef.current = depolar;
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});
  const activeTab = tabs.find(t => t.id === activeTabId);

  // Dışarıdaki ref'e de yaz (GEK executeJavaScript için)
  const setWebviewRef = (id: string, el: any) => {
    iframeRefs.current[id] = el;
    if (extWebviewRefs) extWebviewRefs.current[id] = el;
  };

  useEffect(() => {
    if (activeTab) setAddressBar(activeTab.displayUrl || activeTab.proxyUrl);
  }, [activeTabId, activeTab?.proxyUrl]);

  // ── Barkod Arama (tek tık kopyala zaten var, bu sadece eski arama akışı) ────
  useEffect(() => {
    if (!pendingSearch) return;
    const { barcode } = pendingSearch;
    const webview = iframeRefs.current[activeTabId] as any;
    if (webview) {
      console.log(`[BrowserPanel] Double clicked barcode search triggered: ${barcode}`);
      const searchScript = `
        (async function() {
          const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
          try {
            const input = document.querySelector("#txtSearch") || 
                          document.querySelector("input#txtSearch") || 
                          document.querySelector("#txtSearchUrun") || 
                          document.querySelector("input[placeholder*='Ara']");
            if (input) {
              input.focus();
              const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
              if (descriptor && descriptor.set) {
                descriptor.set.call(input, "${barcode}");
              } else {
                input.value = "${barcode}";
              }
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              await sleep(300);
              const searchBtn = document.querySelector("#btnSearch") || 
                               document.querySelector(".btn-search") ||
                               document.querySelector("a.searchBtn");
              if (searchBtn && typeof searchBtn.click === 'function') {
                searchBtn.click();
              } else {
                const eventOpts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true };
                input.dispatchEvent(new KeyboardEvent('keydown', eventOpts));
                input.dispatchEvent(new KeyboardEvent('keypress', eventOpts));
                input.dispatchEvent(new KeyboardEvent('keyup', eventOpts));
              }
            }
          } catch(e) {
            console.error("Auto search failed:", e);
          }
        })();
      `;
      try {
        webview.executeJavaScript(searchScript);
      } catch (err) {
        console.error("Failed to execute javascript in webview:", err);
      }
    }
    onSearchProcessed();
  }, [pendingSearch, activeTabId, onSearchProcessed]);

  // ── AS Ecza Otomatik Sipariş ─────────────────────────────────────────────
  useEffect(() => {
    if (!pendingOrder) return;

    const { barcode, qty } = pendingOrder;
    const webview = iframeRefs.current[activeTabId] as any;

    if (!webview || typeof webview.executeJavaScript !== 'function') {
      onOrderResult({ ok: false, barcode, error: 'webview_not_ready' });
      onOrderProcessed();
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // — Adım 1: Login kontrolü + sayfa kontrolü —
        const currentUrl: string = await webview.executeJavaScript('location.href');
        if (cancelled) return;

        if (currentUrl.includes('/Login.aspx') || currentUrl.includes('login.aspx')) {
          onOrderResult({ ok: false, barcode, error: 'login_required' });
          return;
        }

        // Hizlisiparis sayfasında değilsek oraya git
        if (!currentUrl.includes('/Siparis/hizlisiparis')) {
          const origin = (() => { try { return new URL(currentUrl).origin; } catch { return 'https://webdepo.asecza.com.tr'; } })();
          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, 10000);
            const done = () => { clearTimeout(timer); setTimeout(resolve, 800); };
            webview.addEventListener('did-finish-load', done, { once: true });
            if (typeof webview.loadURL === 'function') {
              webview.loadURL(`${origin}/Siparis/hizlisiparis.aspx`);
            } else {
              clearTimeout(timer); resolve();
            }
          });
          if (cancelled) return;
          // Login kontrolü tekrar
          const urlAfterNav: string = await webview.executeJavaScript('location.href');
          if (urlAfterNav.includes('/Login.aspx')) {
            onOrderResult({ ok: false, barcode, error: 'login_required' });
            return;
          }
        }

        // — Adım 2: Barkodla ürün ara (AJAX, session cookiesi kullanır) —
        const barcodeJson = JSON.stringify(barcode);
        const searchResult: any = await webview.executeJavaScript(`
          (async function() {
            try {
              const params = new URLSearchParams({
                action: 'GetUrunler', searchText: ${barcodeJson},
                isInculude: 'false', isStoktakiler: 'false', siralama: 'ilacASC',
                marka: '', baslangicSayfasi: '0', topRowNum: '0', sayfaMaxRowAdet: '20', s: 's'
              });
              const resp = await fetch('/Siparis/hizlisiparis-ajax.aspx', {
                method: 'POST',
                headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', 'x-requested-with': 'XMLHttpRequest' },
                credentials: 'include',
                body: params.toString()
              });
              if (!resp.ok) return { error: (resp.status === 401 || resp.status === 403) ? 'login_required' : 'search_http_' + resp.status };
              const data = await resp.json();
              if (data.hataId === 9 || String(data.hataId) === '9') return { error: 'login_required' };
              if (data.hataId !== 0) return { error: data.hataStr || 'search_error' };
              const urunler = data && data.obj && data.obj.urunler;
              if (!Array.isArray(urunler) || urunler.length === 0) return { error: 'not_found' };
              const u = urunler[0];
              return { kod: String(u.kodu || ''), ILACTIP: String(u.ILACTIP || ''), ad: String(u.ad || '') };
            } catch(e) { return { error: String(e && e.message ? e.message : e) }; }
          })()
        `);
        if (cancelled) return;

        if (searchResult.error) {
          onOrderResult({ ok: false, barcode, error: searchResult.error });
          return;
        }

        const { kod, ILACTIP } = searchResult;
        const kodJson = JSON.stringify(kod);
        const ilacTipJson = JSON.stringify(ILACTIP);

        // — Adım 3: Ürün detayını al (MF, fiyat verileri) —
        const detailResult: any = await webview.executeJavaScript(`
          (async function() {
            try {
              const params = new URLSearchParams({
                action: 'GetIlacDetay', kod: ${kodJson},
                isEsdeger: 'false', esdeger: '', isJenerik: 'false', jenerikId: '',
                tip: 'null', ILACTIP: ${ilacTipJson}, kampKodu: ''
              });
              const resp = await fetch('/Ilac/IlacGetir-ajax.aspx', {
                method: 'POST',
                headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', 'x-requested-with': 'XMLHttpRequest' },
                credentials: 'include',
                body: params.toString()
              });
              return resp.ok ? await resp.json() : null;
            } catch { return null; }
          })()
        `);
        if (cancelled) return;

        // — Adım 4: Sayfada ürünü ara (arama kutusuna barkod yaz) —
        await webview.executeJavaScript(`
          (async function() {
            const sleep = ms => new Promise(r => setTimeout(r, ms));
            const box = document.querySelector('#txtSearch') || document.querySelector('input[placeholder*="Ara"]');
            if (box) {
              try {
                const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
                d && d.set ? d.set.call(box, ${barcodeJson}) : (box.value = ${barcodeJson});
              } catch { box.value = ${barcodeJson}; }
              box.dispatchEvent(new Event('input', { bubbles: true }));
              box.dispatchEvent(new Event('change', { bubbles: true }));
              await sleep(200);
              box.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true }));
            }
          })()
        `);

        // Ürün AJAX ile yüklenmesini bekle
        await new Promise(r => setTimeout(r, 2500));
        if (cancelled) return;

        // — Adım 5: Miktar gir ve siparişi ver —
        const qtyStr = JSON.stringify(String(qty));
        const orderResult: any = await webview.executeJavaScript(`
          (async function() {
            const sleep = ms => new Promise(r => setTimeout(r, ms));
            const setNative = (el, val) => {
              try {
                const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
                d && d.set ? d.set.call(el, val) : (el.value = val);
              } catch { el.value = val; }
            };
            const waitFor = async (fn, ms) => {
              const t = Date.now();
              while (Date.now() - t < ms) { const el = fn(); if (el) return el; await sleep(100); }
              return null;
            };

            const miktar = await waitFor(
              () => document.querySelector('#txtMiktar') ||
                    document.querySelector('input#txtMiktar') ||
                    document.querySelector('input[placeholder="Miktar"]'),
              4000
            );
            if (!miktar) return { ok: false, detail: 'txtMiktar_not_found' };

            miktar.focus();
            await sleep(150);
            setNative(miktar, ${qtyStr});
            miktar.dispatchEvent(new Event('input', { bubbles: true }));
            miktar.dispatchEvent(new Event('change', { bubbles: true }));
            await sleep(400);

            // IlacFiyatHesapla fonksiyonunu bekle
            const hasFn = await (async () => {
              const t = Date.now();
              while (Date.now() - t < 5000) {
                if (typeof IlacFiyatHesapla === 'function') return true;
                await sleep(100);
              }
              return false;
            })();

            if (hasFn) {
              try { IlacFiyatHesapla(); } catch(e) {}
              try { typeof GetSubeler === 'function' && GetSubeler(); } catch {}
              return { ok: true, used: 'IlacFiyatHesapla' };
            }

            // Fallback: butona tıkla
            const btn = document.querySelector('#aSiparisEkle') ||
                        document.querySelector('a#aSiparisEkle') ||
                        Array.from(document.querySelectorAll('a')).find(a =>
                          (a.getAttribute('href') || '').includes('IlacFiyatHesapla')
                        );
            if (btn) { btn.click(); return { ok: true, used: 'click' }; }

            return { ok: false, detail: 'order_button_not_found' };
          })()
        `);
        if (cancelled) return;

        if (orderResult?.ok) {
          onOrderResult({ ok: true, barcode, qty, data: detailResult });
        } else {
          onOrderResult({ ok: false, barcode, error: orderResult?.detail || 'order_failed' });
        }

      } catch (err: any) {
        if (!cancelled) {
          onOrderResult({ ok: false, barcode, error: String(err?.message || err) });
        }
      } finally {
        if (!cancelled) onOrderProcessed();
      }
    })();

    return () => { cancelled = true; };
  }, [pendingOrder]);

  const handleNavigate = async (rawUrl: string) => {
    const url = ensureHttp(rawUrl);
    const proxyUrl = await startProxy(url);
    onNavigate(activeTabId, proxyUrl, url);
    setAddressBar(url);
  };

  return (
    <div className="flex flex-col h-full bg-stone-100">
      {/* Sekme çubuğu */}
      <div className="flex items-end gap-0.5 px-2 pt-2 bg-stone-200/60 overflow-x-auto scrollbar-hide shrink-0">
        {tabs.map(tab => (
          <div key={tab.id} onClick={() => onTabChange(tab.id)}
            className={cn("flex items-center gap-2 min-w-[120px] max-w-[200px] h-9 px-3 rounded-t-xl text-[11px] font-semibold cursor-pointer transition-all shrink-0 group/tab",
              tab.id === activeTabId ? "bg-white text-stone-900 shadow-sm" : "bg-stone-200/80 text-stone-500 hover:bg-stone-100 hover:text-stone-700")}>
            <Globe size={11} className="shrink-0 text-stone-400" />
            <span className="flex-1 truncate">{tab.title || 'Yeni Sekme'}</span>
            {tabs.length > 1 && (
              <button onClick={e => { e.stopPropagation(); onTabClose(tab.id); }}
                className="p-0.5 rounded hover:bg-stone-200 text-stone-400 hover:text-stone-600 opacity-0 group-hover/tab:opacity-100 transition-all shrink-0">
                <X size={10} />
              </button>
            )}
          </div>
        ))}
        <button onClick={onTabAdd}
          className="flex items-center justify-center h-9 w-9 rounded-t-xl bg-stone-200/60 hover:bg-stone-100 text-stone-500 hover:text-stone-700 transition-all shrink-0" title="Yeni Sekme">
          <Plus size={14} />
        </button>
      </div>

      {/* Adres çubuğu */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-stone-200 shrink-0">
        <button onClick={() => {
          const webview = iframeRefs.current[activeTabId] as any;
          if (webview) {
            if (typeof webview.goBack === 'function') webview.goBack();
            else if (webview.contentWindow) try { webview.contentWindow.history.back(); } catch {}
          }
        }}
          className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors">
          <ArrowLeft size={14} />
        </button>
        <button onClick={() => {
          const webview = iframeRefs.current[activeTabId] as any;
          if (webview) {
            if (typeof webview.goForward === 'function') webview.goForward();
            else if (webview.contentWindow) try { webview.contentWindow.history.forward(); } catch {}
          }
        }}
          className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors">
          <ArrowRight size={14} />
        </button>
        <button onClick={() => {
          const webview = iframeRefs.current[activeTabId] as any;
          if (webview) {
            if (typeof webview.reload === 'function') webview.reload();
            else webview.src = webview.src;
          }
        }}
          className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors">
          <RefreshCw size={13} />
        </button>

        <div className="flex-1 relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
          <input type="text" value={addressBar}
            onChange={e => setAddressBar(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleNavigate(addressBar); }}
            onFocus={e => e.target.select()}
            className="w-full h-9 pl-9 pr-3 text-[12px] bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 focus:bg-white transition-all font-medium"
            placeholder="Adres girin..." />
        </div>

        <button onClick={() => { if (activeTab?.displayUrl) openExternal(activeTab.displayUrl); }}
          className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors" title="Dışarıda aç">
          <ExternalLink size={14} />
        </button>
      </div>



      {/* webview alanı */}
      <div className="flex-1 relative bg-white">
        {preloadPath && tabs.map(tab => (
          React.createElement('webview', {
            key: tab.id,
            ref: (el: any) => {
              setWebviewRef(tab.id, el);
              if (el) {
                el.removeEventListener('ipc-message', onIpcMessage);
                el.addEventListener('ipc-message', onIpcMessage);

                if (!el.__autofillSetupDone) {
                  el.__autofillSetupDone = true;
                  const runAutofill = async () => {
                    try {
                      const latestDepolar = depolarRef.current || [];
                      let depo = latestDepolar.find((d: any) => d.id === tab.depoId);
                      if (!depo) {
                        // Try matching by URL as fallback
                        const currentUrl = (typeof el.getURL === 'function' ? el.getURL() : '') || el.src || '';
                        if (currentUrl) {
                          depo = latestDepolar.find((d: any) => {
                            if (!d.url) return false;
                            try {
                              const dHost = new URL(d.url).hostname.replace('www.', '');
                              const curHost = new URL(currentUrl).hostname.replace('www.', '');
                              return dHost === curHost || curHost.includes(dHost) || dHost.includes(curHost);
                            } catch {
                              return false;
                            }
                          });
                        }
                      }
                      if (depo && (depo.kullanici || depo.kod || depo.sifre)) {
                        console.log(`[Nexus Autofill] Running script for ${depo.id} on event`);
                        const script = getAutofillScript(depo, !!depo.autoOpen);
                        await el.executeJavaScript(script);
                      }
                    } catch (err) {
                      console.error("[Nexus Autofill] executeJavaScript error:", err);
                    }
                  };
                  el.addEventListener('dom-ready', runAutofill);
                  el.addEventListener('did-navigate', runAutofill);
                  el.addEventListener('did-frame-navigate', runAutofill);
                  el.addEventListener('did-navigate-in-page', runAutofill);
                }
              }
            },
            src: tab.proxyUrl || 'about:blank',
            partition: 'persist:depolar',
            preload: preloadPath || undefined,
            webpreferences: 'nodeIntegrationInSubFrames=yes,contextIsolation=yes,nodeIntegration=no',
            className: cn("absolute inset-0 w-full h-full border-0 transition-opacity duration-200",
              tab.id === activeTabId ? "opacity-100 pointer-events-auto z-10" : "opacity-0 pointer-events-none z-0")
          })
        ))}

        {(!activeTab || !activeTab.proxyUrl) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-20 bg-gradient-to-br from-stone-50 to-stone-100 pointer-events-none">
            <div className="h-16 w-16 rounded-2xl bg-white border border-stone-200 flex items-center justify-center shadow-sm">
              <Globe size={28} className="text-stone-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-stone-500">Yeni Sekme</p>
              <p className="text-[11px] text-stone-400 mt-1">Sol menüden bir depo seçin veya adres girin</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Ana Bileşen ──────────────────────────────────────────────────────────────

export default function Depolar({ cart, gln, onBack, webviewRefs: extWebviewRefs, pendingSearch, onSearchProcessed, onGoToSettings, isActive }: any) {
  const [depolar, setDepolar] = useState<Depo[]>(loadDepolar);

  useEffect(() => {
    if (isActive) {
      setDepolar(loadDepolar());
    }
  }, [isActive]);
  const [showModal, setShowModal] = useState(false);
  const [editingDepo, setEditingDepo] = useState<Depo | undefined>(undefined);

  const initialTabId = randomId();
  const autoOpenedRef = useRef(false);
  const [tabs, setTabs] = useState<BrowserTab[]>([
    { id: initialTabId, proxyUrl: '', displayUrl: '', title: 'Yeni Sekme' }
  ]);
  const [activeTabId, setActiveTabId] = useState(initialTabId);

  // Yeni state'ler
  const [preloadPath, setPreloadPath] = useState<string | undefined>(undefined);
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [gekToken, setGekToken] = useState<string>('');
  const [gekProducts, setGekProducts] = useState<GekProduct[]>([]);
  const [showGekPanel, setShowGekPanel] = useState(false);
  const pendingGekDetail = useRef<{ matnr: string; klasm: string; ad: string } | null>(null);
  const gekSearchCache = useRef<Map<string, { matnr: string; klasm: string; ad: string }>>(new Map());
  // Webview element referansları (GEK executeJavaScript için)
  const localWebviewRefs = useRef<Record<string, any>>({});
  const webviewRefs = extWebviewRefs || localWebviewRefs;

  // Bulk query states
  const [bulkQueryResult, setBulkQueryResult] = useState<Record<string, { ok: boolean; stok?: number; fiyat_depocu?: number; mf?: string; net?: number; error?: string }>>({});
  const [bulkQueryLoading, setBulkQueryLoading] = useState(false);

  // Preload path yüKle (Electron webview için)
  useEffect(() => {
    // Hem Wails hem Electron için dene
    const tryGetPreloadPath = async () => {
      try {
        // Önce window.go (Wails)
        if ((window as any).go?.main?.App?.GetWebviewPreloadPath) {
          const p = await (window as any).go.main.App.GetWebviewPreloadPath();
          if (p) { setPreloadPath(p); return; }
        }
        // Electron IPC üzerinden
        if ((window as any).electronAPI?.invoke) {
          const p = await (window as any).electronAPI.invoke('wails:GetWebviewPreloadPath');
          if (p) { setPreloadPath(p); return; }
        }
        // Node integration aktifse doğrudan ipcRenderer
        if ((window as any).require) {
          const { ipcRenderer } = (window as any).require('electron');
          const p = await ipcRenderer.invoke('wails:GetWebviewPreloadPath');
          if (p) { setPreloadPath(p); return; }
        }
      } catch (e) {
        console.warn('[Depolar] preloadPath alınamadı:', e);
      }
    };
    tryGetPreloadPath();
  }, []);

  // Başlangıçta işaretli depoları otomatik aç
  useEffect(() => {
    const triggerAutoOpen = async () => {
      if (depolar.length > 0 && !autoOpenedRef.current) {
        autoOpenedRef.current = true;
        const autoOpenList = depolar.filter(d => d.enabled !== false && d.autoOpen && d.url);
        if (autoOpenList.length > 0) {
          const openedTabs: BrowserTab[] = [];
          for (let i = 0; i < autoOpenList.length; i++) {
            const depo = autoOpenList[i];
            const url = ensureHttp(depo.url);
            const proxyUrl = await startProxy(url);
            openedTabs.push({
              id: randomId(),
              proxyUrl,
              displayUrl: url,
              title: depo.ad,
              depoId: depo.id
            });
          }
          if (openedTabs.length > 0) {
            setTabs(openedTabs);
            setActiveTabId(openedTabs[0].id);
          }
        }
      }
    };
    triggerAutoOpen();
  }, [depolar]);

  // Depo kaydet/güncelle
  const handleSaveDepo = (depo: Depo) => {
    setDepolar(prev => {
      const idx = prev.findIndex(d => d.id === depo.id);
      const next = idx >= 0 ? prev.map(d => d.id === depo.id ? depo : d) : [...prev, depo];
      saveDepolar(next); return next;
    });
    setShowModal(false); setEditingDepo(undefined);
  };

  const handleDeleteDepo = (id: string) => {
    // Eğer default bir depo siliniyorsa, bir sonraki yüklemede geri gelmemesi için kaydet
    const isDefault = DEFAULT_DEPOLAR.some(d => d.id === id);
    if (isDefault) saveDeletedId(id);
    setDepolar(prev => { const next = prev.filter(d => d.id !== id); saveDepolar(next); return next; });
  };

  // Depoyu proxy ile aç
  const handleOpenDepo = async (depo: Depo) => {
    const url = ensureHttp(depo.url);
    const proxyUrl = await startProxy(url);
    const newTab: BrowserTab = { id: randomId(), proxyUrl, displayUrl: url, title: depo.ad, depoId: depo.id };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  useEffect(() => {
    const handleOpenDepoEvent = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { id, ad, url } = customEvent.detail;

      // AS Ecza tab açık mı kontrol et
      const existing = tabs.find(t => t.displayUrl && t.displayUrl.includes("asecza.com.tr"));
      if (existing) {
        setActiveTabId(existing.id);
        return;
      }

      const proxyUrl = await startProxy(url);
      const newTab: BrowserTab = { id: randomId(), proxyUrl, displayUrl: url, title: ad, depoId: id };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    };

    window.addEventListener('nexus:openDepo', handleOpenDepoEvent);
    return () => {
      window.removeEventListener('nexus:openDepo', handleOpenDepoEvent);
    };
  }, [tabs]);

  // ── GEK Barkod Arama (önce tanımlanmalı — handleBarcodeDoubleClick kullanıyor) ───────
  const searchGekBarcode = useCallback(async (barcode: string, token?: string): Promise<any> => {
    const activeTabObj = tabs.find(t => t.id === activeTabId);
    const isGekTab = activeTabObj?.displayUrl?.includes('gek.org.tr');
    if (!isGekTab) return null;

    const webview = webviewRefs.current[activeTabId];
    if (!webview || typeof webview.executeJavaScript !== 'function') {
      console.warn('[GEK] executeJavaScript desteklenmiyor - webview gerekli');
      return null;
    }

    // Token önce argümandan, sonra state'ten al
    const stateToken = token || gekToken || (typeof window !== 'undefined' ? localStorage.getItem('nexus_gek_token') : '') || '';

    let usedToken = stateToken;
    if (!usedToken || usedToken.length < 10) {
      try {
        const pageToken = await webview.executeJavaScript(GEK_TOKEN_SCRIPT);
        if (pageToken && typeof pageToken === 'string' && pageToken.length > 10) {
          console.log('[GEK] Token sayfadan okundu, uzunluk:', pageToken.length);
          setGekToken(pageToken);
          if (typeof window !== 'undefined') localStorage.setItem('nexus_gek_token', pageToken);
          usedToken = pageToken;
        }
      } catch (e) {
        console.warn('[GEK] Token okuma hatası:', e);
      }
    }

    const script = `
      (async function() {
        try {
          // Token önce sayfadan, sonra argümandan
          const tok = window.__gekToken || ${JSON.stringify(usedToken || '')};
          if (!tok || tok.length < 10) return { error: 'token_yok' };
          const base = '/MainService/api/rfc';
          const h = { 'accept': 'application/json;charset=UTF-8', 'TOKEN': tok, 'sln': '1' };

          // Adım 1: Arama Hazırlığı (ss)
          await fetch(base + '/mat/ss?ST=${barcode}',
            { method: 'GET', headers: h, credentials: 'include' }).catch(() => {});

          // Adım 2: Barkod ile ürün ara
          const sr = await fetch(base + '/mat/sm?ST=${barcode}&TYP=3',
            { method: 'GET', headers: h, credentials: 'include' });
          if (sr.status === 401 || sr.status === 403) return { error: 'login_required' };
          if (!sr.ok) return { error: 'arama_basarisiz', status: sr.status };
          const sd = await sr.json();
          const items = sd && Array.isArray(sd.ET_MAKTX) ? sd.ET_MAKTX : [];
          if (!items.length) return { error: 'urun_bulunamadi', searchData: sd };

          const matnr = String(items[0].MATNR || '');
          const klasm = String(items[0].KLASM || items[0].JIP_KLASM || '');
          const ad    = String(items[0].MAKTX || items[0].AD || '');

          // Adım 2: Detay çek
          const dr = await fetch(base + '/mat/ms?MATNR=' + encodeURIComponent(matnr),
            { method: 'POST', headers: { ...h, 'content-type': 'application/json' },
              credentials: 'include', body: '{}' });
          const dd = dr.ok ? await dr.json() : null;

          return { ok: true, matnr, klasm, ad, searchData: sd, detailData: dd };
        } catch(e) {
          return { error: String(e && e.message ? e.message : e) };
        }
      })()
    `;

    try {
      const result = await webview.executeJavaScript(script);
      console.log('[GEK] Arama sonucu:', result);
      return result;
    } catch (err) {
      console.error('[GEK] executeJavaScript hatası:', err);
      return { error: String(err) };
    }
  }, [tabs, activeTabId, gekToken]);

  // ── GEK / BEK / İskoop Sepete Ekleme / Sipariş Verme ───────────────────────
  const orderGekBekIskoopBarcode = useCallback(async (barcode: string, qty: number, depoId: string): Promise<any> => {
    const activeTabObj = tabs.find(t => t.id === activeTabId);
    if (!activeTabObj) return null;

    const webview = webviewRefs.current[activeTabId];
    if (!webview || typeof webview.executeJavaScript !== 'function') {
      console.warn('[Depo] executeJavaScript desteklenmiyor - webview gerekli');
      return null;
    }

    const tokenToUse = (depoId === 'gek' ? gekToken : depoId === 'bek' ? (typeof window !== 'undefined' ? localStorage.getItem('nexus_bek_token') : '') : (typeof window !== 'undefined' ? localStorage.getItem('nexus_iskoop_token') : '')) || '';
    const relativeBase = depoId === 'bek' ? '/MainService/api/rfc/mat' : '/MainService/api/rfc';

    const script = `
      (async function() {
        try {
          const tok = window.__gekToken || window.__bekToken || window.__iskoopToken || ${JSON.stringify(tokenToUse)};
          if (!tok || tok.length < 10) return { error: 'token_yok' };
          const base = ${JSON.stringify(relativeBase)};
          const h = { 'accept': 'application/json;charset=UTF-8', 'token': tok, 'TOKEN': tok };

          // Adım 1: Barkod ile ürün ara
          if (${JSON.stringify(depoId)} === 'bek') {
            await fetch(base + '/ss?ST=${barcode}', { method: 'GET', headers: h, credentials: 'include' }).catch(() => {});
          } else {
            await fetch(base + '/mat/ss?ST=${barcode}', { method: 'GET', headers: h, credentials: 'include' }).catch(() => {});
          }

          const sUrl = base + (${JSON.stringify(depoId)} === 'bek' ? '/sm?ST=${barcode}&TYP=3' : '/mat/sm?ST=${barcode}&TYP=3');
          const sr = await fetch(sUrl, { method: 'GET', headers: h, credentials: 'include' });
          if (sr.status === 401 || sr.status === 403) return { error: 'login_required' };
          if (!sr.ok) return { error: 'arama_basarisiz', status: sr.status };
          const sd = await sr.json();
          const items = sd && Array.isArray(sd.ET_MAKTX) ? sd.ET_MAKTX : [];
          if (!items.length) return { error: 'urun_bulunamadi', searchData: sd };

          const matnr = String(items[0].MATNR || '');
          const klasm = String(items[0].KLASM || items[0].JIP_KLASM || '');
          const ad    = String(items[0].MAKTX || items[0].AD || '');

          // Adım 2: Detay çek (Fiyat/PSF bilgisi için)
          const dUrl = base + (${JSON.stringify(depoId)} === 'bek' ? '/ms?MATNR=' : '/mat/ms?MATNR=') + encodeURIComponent(matnr);
          const dr = await fetch(dUrl, { method: 'POST', headers: { ...h, 'content-type': 'application/json' },
              credentials: 'include', body: '{}' });
          if (!dr.ok) return { error: 'detay_basarisiz', status: dr.status };
          const dd = await dr.json();

          const psfVal = dd?.ET_A004?.[0]?.KBETR ?? dd?.PSF ?? 0;
          const psfNum = Number(psfVal);
          const psf = Number.isFinite(psfNum) ? psfNum : 0;
          const qty = ${qty};

          // Adım 3: Sepete ekle
          const orderUrl = base + '/order/ab?IP_AUGRU=P10&IP_CIHAZ=DESK';
          const orderBody = {
            IP_ADET: qty,
            IP_IPTAL: "",
            IP_LPRIO: "02",
            IP_MATNR: matnr,
            IP_PSTYV: "",
            IP_S_LINE: {
              BDURUN: "",
              KALEM_NOT: null,
              LPRIO: "02",
              MATNR: matnr,
              MISK: 0,
              TESTIP: "01",
              TTAR: "",
              UPDAT: "I",
              VSART: "Z1",
              ZADET: qty,
              ZMMF: 0
            },
            IP_S_MAN_PSF: {
              LGORT: "1002",
              PSF: psf,
              SECILI: "X",
              STD_FYT: "X"
            },
            IP_S_MAN_WERKS: {},
            IP_VBELN: null,
            JIP_KLASM: klasm
          };

          const or = await fetch(orderUrl, {
            method: 'POST',
            headers: { 
              'accept': 'application/json;charset=UTF-8', 
              'content-type': 'application/json',
              'token': tok,
              'TOKEN': tok,
              'sln': '1'
            },
            credentials: 'include',
            body: JSON.stringify(orderBody)
          });

          if (!or.ok) {
            if (or.status === 401 || or.status === 403) return { error: 'login_required' };
            const detailText = await or.text().catch(() => '');
            return { error: 'sepet_ekleme_basarisiz', status: or.status, detail: detailText };
          }

          const od = await or.json();
          const vbeln = od && typeof od === 'object' && (od.EP_VBELN || od.VBELN || (od.EP_S_HEAD && od.EP_S_HEAD.VBELN)) || null;

          // Adım 4: Onay/Kontrol (opsiyonel)
          let ocData = null;
          if (vbeln) {
            const ocUrl = base + '/order/oc?VBELN=' + encodeURIComponent(String(vbeln));
            const ocr = await fetch(ocUrl, {
              method: 'GET',
              headers: { 
                'accept': 'application/json;charset=UTF-8', 
                'token': tok,
                'sln': '1'
              },
              credentials: 'include'
            });
            if (ocr.ok) {
              ocData = await ocr.json().catch(() => null);
            }
          }

          return { ok: true, matnr, klasm, ad, searchData: sd, detailData: dd, orderData: od, vbeln, ocData };
        } catch(e) {
          return { error: String(e && e.message ? e.message : e) };
        }
      })()
    `;

    try {
      const result = await webview.executeJavaScript(script);
      console.log('[Depo] Sipariş sonucu:', result);
      return result;
    } catch (err) {
      console.error('[Depo] executeJavaScript sipariş hatası:', err);
      return { error: String(err) };
    }
  }, [tabs, activeTabId, gekToken]);

  // ── Farmazon Sepete Ekleme ─────────────────────────────────────────────────
  const orderFarmazonBarcode = useCallback(async (barcode: string, qty: number): Promise<any> => {
    const activeTabObj = tabs.find(t => t.id === activeTabId);
    if (!activeTabObj) return null;

    const webview = webviewRefs.current[activeTabId];
    if (!webview || typeof webview.executeJavaScript !== 'function') {
      console.warn('[Depo] executeJavaScript desteklenmiyor - webview gerekli');
      return null;
    }

    const tokenToUse = (typeof window !== 'undefined' ? localStorage.getItem('nexus_farmazon_token') : '') || '';

    const script = `
      (async function() {
        try {
          const tok = window.__token || ${JSON.stringify(tokenToUse)};
          if (!tok) return { error: 'login_required' };
          const bearer = tok.startsWith('Bearer ') ? tok : 'Bearer ' + tok;
          const h = {
            'accept': 'application/json, text/plain, */*',
            'authorization': bearer,
            'referer': 'https://www.farmazon.com.tr/',
            'x-sec-hed': 'F4BD0033-D533-4160-866A-7D34518B7EEE'
          };

          // Search
          const sUrl = 'https://lab.farmazon.com.tr/api/v1/master/searchbykeyword?keyword=' + encodeURIComponent(${JSON.stringify(barcode)});
          const sr = await fetch(sUrl, { method: 'GET', headers: h });
          if (sr.status === 401 || sr.status === 403) return { error: 'login_required' };
          if (!sr.ok) return { error: 'search_failed', status: sr.status };
          
          const sd = await sr.json();
          const products = sd && sd.result && Array.isArray(sd.result.products) ? sd.result.products : [];
          if (products.length === 0) return { error: 'not_found' };
          const prod = products[0];

          // Detail (Get listings)
          const dUrl = 'https://lab.farmazon.com.tr/api/v1/Products/GetProductListings?productID=' + encodeURIComponent(String(prod.productId));
          const dr = await fetch(dUrl, { method: 'GET', headers: h });
          if (dr.status === 401 || dr.status === 403) return { error: 'login_required' };
          if (!dr.ok) return { error: 'detail_failed', status: dr.status };
          
          const dd = await dr.json();
          const listings = dd && dd.result && Array.isArray(dd.result.listings) ? dd.result.listings : [];
          if (listings.length === 0) return { error: 'no_listings' };

          // Sort listings by price (cheapest first)
          const sorted = listings.filter(l => l.price != null && l.stock > 0).sort((a, b) => a.price - b.price);
          const best = sorted.length > 0 ? sorted[0] : listings[0];
          
          const listingId = best.id;
          
          // Add to basket
          const basketUrl = 'https://lab.farmazon.com.tr/api/v1/BasketItems/AddToBasketListing';
          const basketResp = await fetch(basketUrl, {
            method: 'POST',
            headers: { ...h, 'content-type': 'application/json' },
            body: JSON.stringify({ listingId: Number(listingId), count: Number(${qty}) })
          });

          if (!basketResp.ok) {
            if (basketResp.status === 401 || basketResp.status === 403) return { error: 'login_required' };
            return { error: 'add_to_basket_failed', status: basketResp.status };
          }
          
          return { ok: true, ad: prod.productName };
        } catch(e) {
          return { error: String(e && e.message ? e.message : e) };
        }
      })()
    `;

    try {
      const result = await webview.executeJavaScript(script);
      console.log('[Farmazon] Sipariş sonucu:', result);
      return result;
    } catch (err) {
      console.error('[Farmazon] executeJavaScript sipariş hatası:', err);
      return { error: String(err) };
    }
  }, [tabs, activeTabId]);

  // ── Alliance Healthcare Sepete Ekleme ──────────────────────────────────────
  const orderAllianceBarcode = useCallback(async (barcode: string, qty: number): Promise<any> => {
    const activeTabObj = tabs.find(t => t.id === activeTabId);
    if (!activeTabObj) return null;

    const webview = webviewRefs.current[activeTabId];
    if (!webview || typeof webview.executeJavaScript !== 'function') {
      console.warn('[Depo] executeJavaScript desteklenmiyor - webview gerekli');
      return null;
    }

    let cleanBarcode = barcode;
    if (cleanBarcode && cleanBarcode.length === 14 && cleanBarcode.startsWith('0')) {
      cleanBarcode = cleanBarcode.substring(1);
    }

    const script = `
      (async function() {
        try {
          // 1. Arama
          const sUrl = "https://esiparisv2.alliance-healthcare.com.tr/Item/ElasticSearchItems";
          const sr = await fetch(sUrl, {
            method: "POST",
            headers: { "content-type": "application/json; charset=UTF-8", accept: "application/json, text/plain, */*", "x-requested-with": "XMLHttpRequest" },
            credentials: "include",
            body: JSON.stringify({ RequestedPage: 1, SearchText: ${JSON.stringify(cleanBarcode)} })
          });
          if (sr.status === 401 || sr.status === 403) return { error: 'login_required' };
          if (!sr.ok) return { error: 'search_failed', status: sr.status };
          const sd = await sr.json();
          if (!Array.isArray(sd) || sd.length === 0) return { error: 'urun_bulunamadi' };
          const item = sd[0];
          const itemId = String(item.ID || '');
          if (!itemId) return { error: 'urun_id_bulunamadi' };

          // 2. Detay Çek
          const dUrl = "https://esiparisv2.alliance-healthcare.com.tr/Sales/ItemDetailv2";
          const dr = await fetch(dUrl, {
            method: "POST",
            headers: { "content-type": "application/json; charset=UTF-8", accept: "text/html, */*; q=0.01", "x-requested-with": "XMLHttpRequest" },
            credentials: "include",
            body: JSON.stringify({ ItemID: itemId, LoadSimple: true })
          });
          if (dr.status === 401 || dr.status === 403) return { error: 'login_required' };
          if (!dr.ok) return { error: 'detail_failed', status: dr.status };
          const detailHtml = await dr.text();

          // 3. Parse ItemString & OfferString
          const itemStringMatch = detailHtml.match(/itemstring=["']([^"']+)["']/i);
          const offerStringMatch = detailHtml.match(/offerstring=["']([^"']+)["']/i);
          if (!itemStringMatch || !offerStringMatch) {
            return { error: 'detail_strings_missing' };
          }
          const itemString = itemStringMatch[1];
          const offerString = offerStringMatch[1];

          // 4. Sepete Ekle
          const basketUrl = "https://esiparisv2.alliance-healthcare.com.tr/Sales/AddItemToBasket";
          const basketResp = await fetch(basketUrl, {
            method: "POST",
            headers: { "content-type": "application/json; charset=UTF-8", accept: "*/*", "x-requested-with": "XMLHttpRequest" },
            credentials: "include",
            body: JSON.stringify({
              ItemString: itemString,
              OfferString: offerString,
              Quantity: String(${qty}),
              SupplierControlParam: false
            })
          });
          if (basketResp.status === 401 || basketResp.status === 403) return { error: 'login_required' };
          if (!basketResp.ok) return { error: 'add_to_basket_failed', status: basketResp.status };
          
          const data = await basketResp.json().catch(() => null);
          return { ok: true, ad: item.Name || item.ad || ${JSON.stringify(barcode)}, data };
        } catch(e) {
          return { error: String(e && e.message ? e.message : e) };
        }
      })()
    `;

    try {
      const result = await webview.executeJavaScript(script);
      console.log('[Alliance] Sipariş sonucu:', result);
      return result;
    } catch (err) {
      console.error('[Alliance] executeJavaScript sipariş hatası:', err);
      return { error: String(err) };
    }
  }, [tabs, activeTabId]);

  // ── Barkoda çift tıklama ───────────────────────────────────────────────────
  const handleBarcodeDoubleClick = useCallback(async (barcode: string) => {
    const activeTabObj = tabs.find(t => t.id === activeTabId);
    let depoId = '';

    // 1. Try matching by activeTabObj.displayUrl (primary indicator)
    if (activeTabObj?.displayUrl) {
      const url = activeTabObj.displayUrl.toLowerCase();
      if (url.includes('asecza.com.tr') || url.includes('asecza')) depoId = 'as_ecza';
      else if (url.includes('selcukecza.com.tr') || url.includes('selcukecza')) depoId = 'selcuk';
      else if (url.includes('nevzatecza.com.tr') || url.includes('nevzatecza')) depoId = 'nevzat';
      else if (url.includes('camecza.com') || url.includes('camecza')) depoId = 'cam';
      else if (url.includes('gek.org.tr') || url.includes('gek.org')) depoId = 'gek';
      else if (url.includes('bek.org.tr') || url.includes('bek.org')) depoId = 'bek';
      else if (url.includes('iskoop.org') || url.includes('iskoop')) depoId = 'iskoop';
      else if (url.includes('sancakecza.com') || url.includes('sancakecza')) depoId = 'sancak';
      else if (url.includes('alliance-healthcare.com') || url.includes('alliance')) depoId = 'alliance';
      else if (url.includes('farmazon.com.tr') || url.includes('farmazon')) depoId = 'farmazon';
    }

    // 2. Fallback to tab's depoId and lookup in depolar state array if needed
    if (!depoId && activeTabObj?.depoId) {
      const tId = activeTabObj.depoId;
      if (tId === 'as' || tId === 'as_ecza') depoId = 'as_ecza';
      else if (tId === 'selcuk') depoId = 'selcuk';
      else if (tId === 'nevzat') depoId = 'nevzat';
      else if (tId === 'cam') depoId = 'cam';
      else if (tId === 'gek') depoId = 'gek';
      else if (tId === 'bek') depoId = 'bek';
      else if (tId === 'iskoop') depoId = 'iskoop';
      else if (tId === 'sancak') depoId = 'sancak';
      else if (tId === 'alliance') depoId = 'alliance';
      else if (tId === 'farmazon') depoId = 'farmazon';
      else {
        // Custom generated ID (e.g. '565ifjhj'), look up url in depolar list
        const matchedDepo = depolar.find((d: any) => d.id === tId);
        if (matchedDepo && matchedDepo.url) {
          const url = matchedDepo.url.toLowerCase();
          if (url.includes('asecza') || url.includes('as_ecza')) depoId = 'as_ecza';
          else if (url.includes('selcuk')) depoId = 'selcuk';
          else if (url.includes('nevzat')) depoId = 'nevzat';
          else if (url.includes('camecza') || url.includes('cam')) depoId = 'cam';
          else if (url.includes('gek')) depoId = 'gek';
          else if (url.includes('bek')) depoId = 'bek';
          else if (url.includes('iskoop')) depoId = 'iskoop';
          else if (url.includes('sancak')) depoId = 'sancak';
          else if (url.includes('alliance')) depoId = 'alliance';
          else if (url.includes('farmazon')) depoId = 'farmazon';
        }
      }
    }

    // ── GEK / BEK / İskoop aktifse ──────────────────────────────────────────
    if (depoId === 'gek' || depoId === 'bek' || depoId === 'iskoop') {
      const item = cart[barcode];
      if (!item || item.qty <= 0) {
        setToast({ id: Date.now(), message: '⚠️ Sepette bu ürün için geçerli miktar yok', type: 'error' });
        setTimeout(() => setToast(null), 4000);
        return;
      }

      setToast({ id: Date.now(), message: `⏳ ${activeTabObj.title} için sipariş veriliyor...`, type: 'loading' });
      const result = await orderGekBekIskoopBarcode(barcode, item.qty, depoId);

      if (!result) {
        setToast({ id: Date.now(), message: '⚠️ Sipariş başlatılamadı (webview hazır değil)', type: 'error' });
        setTimeout(() => setToast(null), 4000);
        return;
      }
      if (result.error === 'token_yok') {
        setToast({ id: Date.now(), message: '🔑 Oturum token bulunamadı — önce giriş yapın', type: 'error' });
        setTimeout(() => setToast(null), 5000);
        return;
      }
      if (result.error === 'login_required') {
        setToast({ id: Date.now(), message: '🔑 Oturum gerekli — lütfen giriş yapın', type: 'error' });
        setTimeout(() => setToast(null), 5000);
        return;
      }
      if (result.error === 'urun_bulunamadi') {
        setToast({ id: Date.now(), message: `❌ Depoda ürün bulunamadı: ${barcode}`, type: 'error' });
        setTimeout(() => setToast(null), 4000);
        return;
      }
      if (result.error) {
        setToast({ id: Date.now(), message: `❌ Sipariş hatası: ${result.error}`, type: 'error' });
        setTimeout(() => setToast(null), 4000);
        return;
      }

      // Başarılı
      const ad = result.ad || barcode;
      const vbelnStr = result.vbeln ? ` (Sipariş No: ${result.vbeln})` : '';
      setToast({ id: Date.now(), message: `✅ ${ad} için ${activeTabObj.title}'e sipariş başarıyla verildi!${vbelnStr}`, type: 'success' });
      setTimeout(() => setToast(null), 6000);
      return;
    }

    // ── Farmazon aktifse ────────────────────────────────────────────────────
    if (depoId === 'farmazon') {
      const item = cart[barcode];
      if (!item || item.qty <= 0) {
        setToast({ id: Date.now(), message: '⚠️ Sepette bu ürün için geçerli miktar yok', type: 'error' });
        setTimeout(() => setToast(null), 4000);
        return;
      }

      setToast({ id: Date.now(), message: `⏳ Farmazon'da ${barcode} için sepet aranıyor...`, type: 'loading' });
      const result = await orderFarmazonBarcode(barcode, item.qty);

      if (!result) {
        setToast({ id: Date.now(), message: '⚠️ Sipariş başlatılamadı (webview hazır değil)', type: 'error' });
        setTimeout(() => setToast(null), 4000);
        return;
      }
      if (result.error === 'login_required') {
        setToast({ id: Date.now(), message: '🔑 Farmazon oturumu gerekli — lütfen giriş yapın', type: 'error' });
        setTimeout(() => setToast(null), 5000);
        return;
      }
      if (result.error === 'urun_bulunamadi' || result.error === 'not_found') {
        setToast({ id: Date.now(), message: `❌ Farmazon'da ürün bulunamadı: ${barcode}`, type: 'error' });
        setTimeout(() => setToast(null), 4000);
        return;
      }
      if (result.error) {
        setToast({ id: Date.now(), message: `❌ Sipariş hatası: ${result.error}`, type: 'error' });
        setTimeout(() => setToast(null), 4000);
        return;
      }

      // Başarılı
      setToast({ id: Date.now(), message: `✅ ${result.ad || barcode} Farmazon sepetine başarıyla eklendi!`, type: 'success' });
      setTimeout(() => setToast(null), 6000);
      return;
    }

    // ── Alliance aktifse ────────────────────────────────────────────────────
    if (depoId === 'alliance') {
      const item = cart[barcode];
      if (!item || item.qty <= 0) {
        setToast({ id: Date.now(), message: '⚠️ Sepette bu ürün için geçerli miktar yok', type: 'error' });
        setTimeout(() => setToast(null), 4000);
        return;
      }

      setToast({ id: Date.now(), message: `⏳ Alliance'da ${barcode} için sipariş veriliyor...`, type: 'loading' });
      const result = await orderAllianceBarcode(barcode, item.qty);

      if (!result) {
        setToast({ id: Date.now(), message: '⚠️ Sipariş başlatılamadı (webview hazır değil)', type: 'error' });
        setTimeout(() => setToast(null), 4000);
        return;
      }
      if (result.error === 'login_required') {
        setToast({ id: Date.now(), message: '🔑 Alliance oturumu gerekli — lütfen giriş yapın', type: 'error' });
        setTimeout(() => setToast(null), 5000);
        return;
      }
      if (result.error === 'urun_bulunamadi') {
        setToast({ id: Date.now(), message: `❌ Alliance'da ürün bulunamadı: ${barcode}`, type: 'error' });
        setTimeout(() => setToast(null), 4000);
        return;
      }
      if (result.error) {
        setToast({ id: Date.now(), message: `❌ Sipariş hatası: ${result.error}`, type: 'error' });
        setTimeout(() => setToast(null), 4000);
        return;
      }

      // Başarılı
      setToast({ id: Date.now(), message: `✅ ${result.ad || barcode} Alliance sepetine başarıyla eklendi!`, type: 'success' });
      setTimeout(() => setToast(null), 6000);
      return;
    }

    // ── AS / Selcuk / Nevzat / Cam aktifse ──────────────────────────────────
    if (depoId === 'as_ecza' || depoId === 'selcuk' || depoId === 'nevzat' || depoId === 'cam') {
      const item = cart[barcode];
      if (!item || item.qty <= 0) {
        setToast({ id: Date.now(), message: '⚠️ Sepette bu ürün için geçerli miktar yok', type: 'error' });
        setTimeout(() => setToast(null), 4000);
        return;
      }

      setToast({ id: Date.now(), message: `⏳ ${barcode} için ${activeTabObj.title}'e sipariş veriliyor...`, type: 'loading' });
      setPendingOrder({ barcode, qty: item.qty, timestamp: Date.now() });
      return;
    }
    
    // Diğer depolar için uyar
    setToast({ id: Date.now(), message: `⚠️ ${activeTabObj?.title || 'Bu depo'} için otomatik sipariş desteklenmiyor.`, type: 'error' });
    setTimeout(() => setToast(null), 4000);
  }, [cart, tabs, activeTabId, orderGekBekIskoopBarcode, orderFarmazonBarcode, orderAllianceBarcode, depolar]);

  // ── Toplu Fiyat ve Stok Sorgulama (Aktif Sekmeye Göre Dinamik) ─────────────
  const triggerWarehouseBulkQuery = useCallback(async () => {
    // 1. Get all barcodes from cart that are inCart and qty > 0
    const barcodes = Object.entries(cart)
      .filter(([, v]) => (v as any).inCart && (v as any).qty > 0)
      .map(([barkod]) => barkod);

    if (barcodes.length === 0) {
      setToast({ id: Date.now(), message: '⚠️ Sepette sorgulanacak ürün yok', type: 'error' });
      setTimeout(() => setToast(null), 4000);
      return;
    }

    // 2. Get active tab and depoId
    const activeTabObj = tabs.find(t => t.id === activeTabId);
    let depoId = '';

    // 1. Try matching by activeTabObj.displayUrl (primary indicator)
    if (activeTabObj?.displayUrl) {
      const url = activeTabObj.displayUrl.toLowerCase();
      if (url.includes('asecza.com.tr') || url.includes('asecza')) depoId = 'as_ecza';
      else if (url.includes('selcukecza.com.tr') || url.includes('selcukecza')) depoId = 'selcuk';
      else if (url.includes('nevzatecza.com.tr') || url.includes('nevzatecza')) depoId = 'nevzat';
      else if (url.includes('camecza.com') || url.includes('camecza')) depoId = 'cam';
      else if (url.includes('gek.org.tr') || url.includes('gek.org')) depoId = 'gek';
      else if (url.includes('bek.org.tr') || url.includes('bek.org')) depoId = 'bek';
      else if (url.includes('iskoop.org') || url.includes('iskoop')) depoId = 'iskoop';
      else if (url.includes('sancakecza.com') || url.includes('sancakecza')) depoId = 'sancak';
      else if (url.includes('alliance-healthcare.com') || url.includes('alliance')) depoId = 'alliance';
      else if (url.includes('farmazon.com.tr') || url.includes('farmazon')) depoId = 'farmazon';
    }

    // 2. Fallback to tab's depoId and lookup in depolar state array if needed
    if (!depoId && activeTabObj?.depoId) {
      const tId = activeTabObj.depoId;
      if (tId === 'as' || tId === 'as_ecza') depoId = 'as_ecza';
      else if (tId === 'selcuk') depoId = 'selcuk';
      else if (tId === 'nevzat') depoId = 'nevzat';
      else if (tId === 'cam') depoId = 'cam';
      else if (tId === 'gek') depoId = 'gek';
      else if (tId === 'bek') depoId = 'bek';
      else if (tId === 'iskoop') depoId = 'iskoop';
      else if (tId === 'sancak') depoId = 'sancak';
      else if (tId === 'alliance') depoId = 'alliance';
      else if (tId === 'farmazon') depoId = 'farmazon';
      else {
        // Custom generated ID (e.g. '565ifjhj'), look up url in depolar list
        const matchedDepo = depolar.find((d: any) => d.id === tId);
        if (matchedDepo && matchedDepo.url) {
          const url = matchedDepo.url.toLowerCase();
          if (url.includes('asecza') || url.includes('as_ecza')) depoId = 'as_ecza';
          else if (url.includes('selcuk')) depoId = 'selcuk';
          else if (url.includes('nevzat')) depoId = 'nevzat';
          else if (url.includes('camecza') || url.includes('cam')) depoId = 'cam';
          else if (url.includes('gek')) depoId = 'gek';
          else if (url.includes('bek')) depoId = 'bek';
          else if (url.includes('iskoop')) depoId = 'iskoop';
          else if (url.includes('sancak')) depoId = 'sancak';
          else if (url.includes('alliance')) depoId = 'alliance';
          else if (url.includes('farmazon')) depoId = 'farmazon';
        }
      }
    }

    if (!depoId) {
      setToast({ id: Date.now(), message: '⚠️ Lütfen aktif bir depo sekmesini seçin.', type: 'error' });
      setTimeout(() => setToast(null), 4000);
      return;
    }

    const webview = webviewRefs.current[activeTabId] as any;
    if (!webview || typeof webview.executeJavaScript !== 'function') {
      setToast({ id: Date.now(), message: '❌ Depo tarayıcı paneli hazır değil', type: 'error' });
      setTimeout(() => setToast(null), 4000);
      return;
    }

    // Check login or page state based on depoId
    try {
      const currentUrl: string = await webview.executeJavaScript('location.href');
      if (currentUrl.includes('/Login.aspx') || currentUrl.includes('login.aspx') || currentUrl.includes('/login') || currentUrl.includes('/Login')) {
        setToast({ id: Date.now(), message: `🔑 ${activeTabObj.title} oturumu gerekli — lütfen giriş yapın`, type: 'error' });
        setTimeout(() => setToast(null), 5000);
        return;
      }
    } catch (err) {
      setToast({ id: Date.now(), message: '❌ Depo durum kontrolü başarısız oldu', type: 'error' });
      setTimeout(() => setToast(null), 4000);
      return;
    }

    setBulkQueryLoading(true);

    try {
      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
      let loginRequiredEncountered = false;

      for (let i = 0; i < barcodes.length; i++) {
        const barcode = barcodes[i];

        setToast({
          id: Date.now(),
          message: `⏳ ${activeTabObj.title}'den sorgulanıyor... [${i + 1}/${barcodes.length}]`,
          type: 'loading'
        });

        try {
          const barcodeJson = JSON.stringify(barcode);
          let queryResult: any = null;

          if (depoId === 'as_ecza' || depoId === 'selcuk' || depoId === 'nevzat' || depoId === 'cam') {
            // AS/Selcuk/Nevzat/Cam family (WebDepo)
            const searchResult = await webview.executeJavaScript(`
              (async function() {
                try {
                  const params = new URLSearchParams({
                    action: 'GetUrunler', searchText: ${barcodeJson},
                    isInculude: 'false', isStoktakiler: 'false', siralama: 'ilacASC',
                    marka: '', baslangicSayfasi: '0', topRowNum: '0', sayfaMaxRowAdet: '20', s: 's'
                  });
                  const resp = await fetch('/Siparis/hizlisiparis-ajax.aspx', {
                    method: 'POST',
                    headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', 'x-requested-with': 'XMLHttpRequest' },
                    credentials: 'include',
                    body: params.toString()
                  });
                  if (!resp.ok) return { error: (resp.status === 401 || resp.status === 403) ? 'login_required' : 'search_failed' };
                  const data = await resp.json();
                  if (data.hataId === 9 || String(data.hataId) === '9') return { error: 'login_required' };
                  if (data.hataId !== 0) return { error: data.hataStr || 'search_error' };
                  const urunler = data && data.obj && data.obj.urunler;
                  if (!Array.isArray(urunler) || urunler.length === 0) return { error: 'not_found' };
                  const u = urunler[0];
                  return { kod: String(u.kodu || ''), ILACTIP: String(u.ILACTIP || ''), ad: String(u.ad || '') };
                } catch(e) { return { error: String(e && e.message ? e.message : e) }; }
              })()
            `);

            if (searchResult && !searchResult.error) {
              await sleep(150);
              const dParams = { kod: searchResult.kod, ILACTIP: searchResult.ILACTIP };
              queryResult = await webview.executeJavaScript(`
                (async function() {
                  try {
                    const params = new URLSearchParams({
                      action: 'GetIlacDetay', kod: ${JSON.stringify(dParams.kod)},
                      isEsdeger: 'false', esdeger: '', isJenerik: 'false', jenerikId: '',
                      tip: 'null', ILACTIP: ${JSON.stringify(dParams.ILACTIP)}, kampKodu: ''
                    });
                    const resp = await fetch('/Ilac/IlacGetir-ajax.aspx', {
                      method: 'POST',
                      headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', 'x-requested-with': 'XMLHttpRequest' },
                      credentials: 'include',
                      body: params.toString()
                    });
                    if (!resp.ok) return { error: 'detail_failed' };
                    const dData = await resp.json();
                    const detail = dData?.obj;
                    if (!detail) return { error: 'no_detail' };
                    
                    return {
                      ok: true,
                      detail: detail
                    };
                  } catch(e) { return { error: String(e && e.message ? e.message : e) }; }
                })()
              `);
            } else {
              queryResult = searchResult;
            }
          } else if (depoId === 'gek' || depoId === 'bek' || depoId === 'iskoop') {
            // GEK/BEK/Iskoop family (MainService REST API)
            const tokenToUse = (depoId === 'gek' ? gekToken : depoId === 'bek' ? (typeof window !== 'undefined' ? localStorage.getItem('nexus_bek_token') : '') : (typeof window !== 'undefined' ? localStorage.getItem('nexus_iskoop_token') : '')) || '';
            const relativeBase = depoId === 'bek' ? '/MainService/api/rfc/mat' : '/MainService/api/rfc';

            queryResult = await webview.executeJavaScript(`
              (async function() {
                try {
                  const tok = window.__gekToken || window.__bekToken || window.__iskoopToken || ${JSON.stringify(tokenToUse)};
                  if (!tok) return { error: 'login_required' };
                  const base = ${JSON.stringify(relativeBase)};
                  const h = { 'accept': 'application/json;charset=UTF-8', 'token': tok, 'TOKEN': tok };
                  
                  // For BEK, call /ss first
                  if (${JSON.stringify(depoId)} === 'bek') {
                    await fetch(base + '/ss?ST=${barcode}', { method: 'GET', headers: h, credentials: 'include' }).catch(() => {});
                  } else {
                    await fetch(base + '/mat/ss?ST=${barcode}', { method: 'GET', headers: h, credentials: 'include' }).catch(() => {});
                  }
                  
                  // Search
                  const sUrl = base + (${JSON.stringify(depoId)} === 'bek' ? '/sm?ST=${barcode}&TYP=3' : '/mat/sm?ST=${barcode}&TYP=3');
                  const sr = await fetch(sUrl, { method: 'GET', headers: h, credentials: 'include' });
                  if (sr.status === 401 || sr.status === 403) return { error: 'login_required' };
                  if (!sr.ok) return { error: 'search_failed', status: sr.status };
                  const sd = await sr.json();
                  const items = sd && Array.isArray(sd.ET_MAKTX) ? sd.ET_MAKTX : [];
                  if (!items.length) return { error: 'not_found' };
                  
                  const matnr = String(items[0].MATNR || '');
                  
                  // Details
                  const dUrl = base + (${JSON.stringify(depoId)} === 'bek' ? '/ms?MATNR=' : '/mat/ms?MATNR=') + encodeURIComponent(matnr);
                  const dr = await fetch(dUrl, {
                    method: 'POST', headers: { ...h, 'content-type': 'application/json' },
                    credentials: 'include', body: '{}'
                  });
                  if (!dr.ok) return { error: 'detail_failed', status: dr.status };
                  const dd = await dr.json();
                  
                  // Extract fields
                  const detail = dd?.obj || dd || {};
                  const stokVal = detail?.ET_MARC?.[0]?.LABST ?? detail?.LABST ?? 0;
                  const rawFyt = detail?.ET_A004?.[0]?.KBETR ?? detail?.PSF ?? 0;
                  
                  return {
                    ok: true,
                    stok: Number(stokVal) || 0,
                    fiyat_depocu: Number(rawFyt) || 0
                  };
                } catch(e) { return { error: String(e && e.message ? e.message : e) }; }
              })()
            `);
          } else if (depoId === 'sancak') {
            // Sancak Ecza
            queryResult = await webview.executeJavaScript(`
              (async function() {
                try {
                  const sUrl = "https://eticaret.sancakecza.com.tr/Sales/QuickSearchItems";
                  const sParams = { Key: ${barcodeJson}, SearchType: 0, StockType: 0, Page: 1, CacheForCampaign: false, ItemScope: "0" };
                  const sr = await fetch(sUrl, {
                    method: "POST",
                    headers: { "content-type": "application/json; charset=UTF-8", accept: "application/json, text/plain, */*", "x-requested-with": "XMLHttpRequest" },
                    credentials: "include",
                    body: JSON.stringify(sParams)
                  });
                  if (!sr.ok) return { error: (sr.status === 401 || sr.status === 403) ? 'login_required' : 'search_failed', status: sr.status };
                  const sd = await sr.json();
                  const items = sd && Array.isArray(sd.Value) ? sd.Value : [];
                  if (items.length === 0) return { error: 'not_found' };
                  const item = items[0];
                  
                  return {
                    ok: true,
                    stok: Number(item.StockQty) || 0,
                    fiyat_depocu: Number(item.Price) || 0
                  };
                } catch(e) { return { error: String(e && e.message ? e.message : e) }; }
              })()
            `);
          } else if (depoId === 'alliance') {
            // Alliance Healthcare
            queryResult = await webview.executeJavaScript(`
              (async function() {
                try {
                  const sUrl = "https://esiparisv2.alliance-healthcare.com.tr/Item/ElasticSearchItems";
                  const sr = await fetch(sUrl, {
                    method: "POST",
                    headers: { "content-type": "application/json; charset=UTF-8", accept: "application/json, text/plain, */*", "x-requested-with": "XMLHttpRequest" },
                    credentials: "include",
                    body: JSON.stringify({ RequestedPage: 1, SearchText: ${barcodeJson} })
                  });
                  if (!sr.ok) return { error: (sr.status === 401 || sr.status === 403) ? 'login_required' : 'search_failed', status: sr.status };
                  const sd = await sr.json();
                  if (!Array.isArray(sd) || sd.length === 0) return { error: 'not_found' };
                  const item = sd[0];
                  
                  return {
                    ok: true,
                    stok: Number(item.StockQty) || 0,
                    fiyat_depocu: Number(item.Price) || 0
                  };
                } catch(e) { return { error: String(e && e.message ? e.message : e) }; }
              })()
            `);
          } else if (depoId === 'farmazon') {
            // Farmazon integration
            const tokenToUse = (typeof window !== 'undefined' ? localStorage.getItem('nexus_farmazon_token') : '') || '';
            queryResult = await webview.executeJavaScript(`
              (async function() {
                try {
                  const tok = window.__token || ${JSON.stringify(tokenToUse)};
                  if (!tok) return { error: 'login_required' };
                  const bearer = tok.startsWith('Bearer ') ? tok : 'Bearer ' + tok;
                  const h = {
                    'accept': 'application/json, text/plain, */*',
                    'authorization': bearer,
                    'referer': 'https://www.farmazon.com.tr/',
                    'x-sec-hed': 'F4BD0033-D533-4160-866A-7D34518B7EEE'
                  };

                  // Search
                  const sUrl = 'https://lab.farmazon.com.tr/api/v1/master/searchbykeyword?keyword=' + encodeURIComponent(${barcodeJson});
                  const sr = await fetch(sUrl, { method: 'GET', headers: h });
                  if (sr.status === 401 || sr.status === 403) return { error: 'login_required' };
                  if (!sr.ok) return { error: 'search_failed', status: sr.status };
                  
                  const sd = await sr.json();
                  const products = sd && sd.result && Array.isArray(sd.result.products) ? sd.result.products : [];
                  if (products.length === 0) return { error: 'not_found' };
                  const prod = products[0];

                  // Detail (Get listings)
                  const dUrl = 'https://lab.farmazon.com.tr/api/v1/Products/GetProductListings?productID=' + encodeURIComponent(String(prod.productId));
                  const dr = await fetch(dUrl, { method: 'GET', headers: h });
                  if (dr.status === 401 || dr.status === 403) return { error: 'login_required' };
                  if (!dr.ok) return { error: 'detail_failed', status: dr.status };
                  
                  const dd = await dr.json();
                  const listings = dd && dd.result && Array.isArray(dd.result.listings) ? dd.result.listings : [];
                  if (listings.length === 0) return { error: 'no_listings' };

                  // Sort listings by price (cheapest first)
                  const sorted = listings.filter(l => l.price != null && l.stock > 0).sort((a, b) => a.price - b.price);
                  const best = sorted.length > 0 ? sorted[0] : listings[0];
                  
                  return {
                    ok: true,
                    stok: Number(best.stock) || 0,
                    fiyat_depocu: Number(best.price) || 0
                  };
                } catch(e) { return { error: String(e && e.message ? e.message : e) }; }
              })()
            `);
          }

          // Process final result
          if (!queryResult || queryResult.error) {
            if (queryResult?.error === 'login_required') {
              loginRequiredEncountered = true;
              setBulkQueryResult(prev => ({
                ...prev,
                [barcode]: { ok: false, error: 'login_required' }
              }));
              break;
            }
            setBulkQueryResult(prev => ({
              ...prev,
              [barcode]: { ok: false, error: queryResult?.error || 'query_failed' }
            }));
          } else {
            let stokVal = 0;
            let dsfVal = 0;
            let psfVal = 0;
            let mfList: string[] = [];
            let netList: string[] = [];

            if (queryResult.detail) {
              const detail = queryResult.detail;
              const mfRaw  = detail.grdKampanyalar?.[0]?.mf      || '';
              const netRaw = detail.grdKampanyalar?.[0]?.netFiyat || '';
              mfList = extractSpans(mfRaw);
              netList = extractSpans(netRaw);

              dsfVal = parsePrice(detail.depocuFiyati);
              psfVal = parsePrice(detail.SonFiyat ?? detail.etiketFiyati);
              stokVal = typeof detail.stokDurumu === 'number' ? detail.stokDurumu : parseInt(detail.stokDurumu || 0);
            } else {
              stokVal = queryResult.stok || 0;
              dsfVal = queryResult.fiyat_depocu || 0;
              psfVal = queryResult.ok ? dsfVal * 1.25 : 0; // fallback psf
            }

            setBulkQueryResult(prev => ({
              ...prev,
              [barcode]: {
                ok: true,
                stok: stokVal,
                fiyat_depocu: dsfVal,
                mf: mfList[0] || undefined,
                net: parsePrice(netList[0]) || undefined
              }
            }));

            // SQLite veritabanını güncel canlı verilerle güncelle (opsiyonel)
            if (depoId === 'as_ecza') {
              await updateDbWithLiveData(barcode, dsfVal, psfVal, mfList);
            }
          }
        } catch (itemErr: any) {
          setBulkQueryResult(prev => ({
            ...prev,
            [barcode]: { ok: false, error: String(itemErr?.message || itemErr) }
          }));
        }

        await sleep(150);
      }
      
      if (loginRequiredEncountered) {
        setToast({ id: Date.now(), message: `🔑 ${activeTabObj.title} oturumu zaman aşımına uğramış olabilir, lütfen giriş yapın`, type: 'error' });
        setTimeout(() => setToast(null), 5000);
      } else {
        setToast({ id: Date.now(), message: `✅ ${activeTabObj.title} sorgulama tamamlandı!`, type: 'success' });
        setTimeout(() => setToast(null), 4000);
      }
    } catch (err: any) {
      console.error('[Depolar] Toplu sorgulama hatası:', err);
      setToast({ id: Date.now(), message: `❌ Toplu sorgulama başarısız: ${err?.message || err}`, type: 'error' });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setBulkQueryLoading(false);
    }
  }, [cart, tabs, activeTabId, gekToken]);

  // ── Sipariş tamamlandı → JSON'a kaydet + toast ────────────────────────────
  const handleOrderResult = useCallback(async (result: OrderResult) => {
    if (result.ok) {
      // Local JSON'a kaydet (main process üzerinden atomik append)
      if (isWails) {
        try {
          const detail = result.data?.obj;
          const mfRaw  = detail?.grdKampanyalar?.[0]?.mf      || '';
          const netRaw = detail?.grdKampanyalar?.[0]?.netFiyat || '';
          const mfList  = extractSpans(mfRaw);
          const netList = extractSpans(netRaw);

          const dsfVal = parsePrice(detail?.depocuFiyati);
          const psfVal = parsePrice(detail?.SonFiyat ?? detail?.etiketFiyati);

          // SQLite veritabanını güncel canlı verilerle güncelle
          await updateDbWithLiveData(result.barcode, dsfVal, psfVal, mfList);

          const entry = {
            tarih:        new Date().toISOString().split('T')[0],
            barkod:       result.barcode,
            urun_adi:     detail?.ad        || '',
            miktar:       result.qty        ?? 0,
            urun_kodu:    detail?.kod       || '',
            fiyat_etiket: +psfVal.toFixed(2),
            fiyat_depocu: +dsfVal.toFixed(2),
            mf1:          mfList[0]  || null,
            mf2:          mfList[1]  || null,
            mf3:          mfList[2]  || null,
            net_fiyat1:   parsePrice(netList[0]),
            net_fiyat2:   parsePrice(netList[1]),
            net_fiyat3:   parsePrice(netList[2]),
            stok_durumu:  detail?.stokDurumu || 0,
            kdv:          parseInt(detail?.kdv?.val1 || 0),
            firma_adi:    detail?.firma?.display || "",
            urun_tipi:    detail?.urunTipi || "",
            durum:        'success',
            depo:         'AS ECZA'
          };

          await (window as any).go.main.App.AppendOrderResult(gln, entry);
        } catch (err) {
          console.error('[Depolar] JSON kayıt hatası:', err);
        }
      }

      setToast({ id: Date.now(), message: '✅ AS Ecza\'ya sipariş başarıyla verildi!', type: 'success' });
      setTimeout(() => setToast(null), 4000);
    } else {
      const msg =
        result.error === 'login_required'    ? '⚠️ AS Ecza\'ya giriş yapılmamış! Önce giriş yapın.' :
        result.error === 'not_found'          ? '❌ Ürün AS Ecza\'da bulunamadı' :
        result.error === 'webview_not_ready'  ? '❌ Tarayıcı paneli henüz hazır değil' :
        result.error === 'order_button_not_found' ? '❌ Sipariş butonu bulunamadı (ürün yüklendi mi?)' :
        `❌ Hata: ${result.error}`;
      setToast({ id: Date.now(), message: msg, type: 'error' });
      setTimeout(() => setToast(null), 6000);
    }
  }, [gln]);

  // Sekme ekle
  const handleAddTab = () => {
    const newTab: BrowserTab = { id: randomId(), proxyUrl: '', displayUrl: '', title: 'Yeni Sekme' };
    setTabs(prev => [...prev, newTab]); setActiveTabId(newTab.id);
  };

  // Sekme kapat → proxy'yi de durdur
  const handleCloseTab = async (id: string) => {
    const tab = tabs.find(t => t.id === id);
    if (tab?.proxyUrl) await stopProxy(tab.proxyUrl);
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      if (next.length === 0) {
        const fresh: BrowserTab = { id: randomId(), proxyUrl: '', displayUrl: '', title: 'Yeni Sekme' };
        setActiveTabId(fresh.id); return [fresh];
      }
      if (activeTabId === id) setActiveTabId(next[next.length - 1].id);
      return next;
    });
  };

  // Navigasyon güncelleme
  const handleNavigate = (tabId: string, proxyUrl: string, displayUrl: string) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, proxyUrl, displayUrl } : t));
  };

  // IPC mesaj handler (webview preload'dan gelen veriler)
  const handleIpcMessage = useCallback((event: any) => {
    try {
      const { channel, args } = event;
      if (channel === 'depo-data-intercept') {
        const payload = args?.[0];
        console.log('[Depolar] IPC intercept:', payload?.type, payload?.supplier);

        // ── GEK Network Traffic loglama ──────────────────────────────────────
        if (payload?.type === 'gek-network-traffic' && payload?.supplier === 'gek') {
          (async () => {
            try {
              let logs = [];
              if ((window as any).go?.main?.App?.LoadLocalJSON) {
                try {
                  const content = await (window as any).go.main.App.LoadLocalJSON(gln || 'local', 'gek_network_log.json');
                  if (content && content.trim().startsWith('[')) {
                    logs = JSON.parse(content);
                  }
                } catch (e) {
                  logs = [];
                }
              }
              const entry = {
                timestamp: new Date().toISOString(),
                url: payload.url,
                method: payload.method,
                headers: payload.headers,
                requestBody: payload.requestBody,
                status: payload.status,
                response: payload.response
              };
              logs.push(entry);
              // limit to last 200 logs to avoid huge files
              if (logs.length > 200) {
                logs = logs.slice(logs.length - 200);
              }
              if ((window as any).go?.main?.App?.SaveLocalJSON) {
                await (window as any).go.main.App.SaveLocalJSON(gln || 'local', 'gek_network_log.json', JSON.stringify(logs, null, 2));
              }
            } catch (err) {
              console.error('Error writing network traffic log:', err);
            }
          })();
        }

        // ── GEK Token yakalandı ──────────────────────────────────────────────
        if (payload?.type === 'gek-token' && payload?.token) {
          console.log('[Depolar] GEK token alındı, uzunluk:', payload.token.length);
          setGekToken(payload.token);
          if (typeof window !== 'undefined') {
            localStorage.setItem('nexus_gek_token', payload.token);
          }
        }

        // ── Depo Token yakalandı (Dinamik) ───────────────────────────────────
        if (payload?.type === 'depo-token' && payload?.token) {
          const supplier = payload.supplier || 'unknown';
          const tok = payload.token;
          console.log(`[Depolar] ${supplier} token alındı, uzunluk:`, tok.length);
          if (supplier === 'gek') {
            setGekToken(tok);
            if (typeof window !== 'undefined') localStorage.setItem('nexus_gek_token', tok);
          } else if (supplier === 'bek') {
            if (typeof window !== 'undefined') localStorage.setItem('nexus_bek_token', tok);
          } else if (supplier === 'iskoop') {
            if (typeof window !== 'undefined') localStorage.setItem('nexus_iskoop_token', tok);
          } else if (supplier === 'farmazon') {
            if (typeof window !== 'undefined') localStorage.setItem('nexus_farmazon_token', tok);
          }
        }

        // ── GEK API yanıtı yakalandı (pasif intercept) ───────────────────────
        if (payload?.type === 'gek-data' && payload?.supplier === 'gek') {
          const url: string = payload.url || '';
          const data = payload.detailData;
          if (!data) return;

          // Ürün arama yanıtı: /rfc/mat/sm
          if (url.includes('/rfc/mat/sm') || url.includes('/mat/sm')) {
            const items: any[] = data?.ET_MAKTX || [];
            items.forEach(item => {
              const matnr = String(item.MATNR || '').trim();
              if (matnr) {
                gekSearchCache.current.set(matnr, {
                  matnr,
                  klasm: String(item.KLASM || item.JIP_KLASM || ''),
                  ad: String(item.MAKTX || item.AD || ''),
                });
              }
            });
            console.log('[GEK] Arama cache güncellendi. Cache boyutu:', gekSearchCache.current.size);

            if (items.length > 0) {
              const item = items[0];
              pendingGekDetail.current = {
                matnr: String(item.MATNR || ''),
                klasm: String(item.KLASM || item.JIP_KLASM || ''),
                ad: String(item.MAKTX || item.AD || ''),
              };
            }
          }

          // Ürün detay yanıtı: /rfc/mat/ms
          if (url.includes('/rfc/mat/ms') || url.includes('/mat/ms')) {
            const match = url.match(/[?&]MATNR=([^&]+)/i);
            const matnrFromUrl = match ? decodeURIComponent(match[1]).trim() : '';

            let info = matnrFromUrl ? gekSearchCache.current.get(matnrFromUrl) : null;
            if (!info && pendingGekDetail.current) {
              info = pendingGekDetail.current;
            }

            if (info) {
              const detail = data?.obj || data || {};
              const stokVal = detail?.ET_MARC?.[0]?.LABST ?? detail?.LABST ?? detail?.stokDurumu ?? '?';
              const rawPsf = detail?.tavsiyeEdilenSatisFiyati || detail?.SonFiyat || detail?.etiketFiyati || (detail?.ET_A004?.[0]?.KBETR ?? detail?.PSF ?? '');
              const psfStr = rawPsf ? String(rawPsf) : '';

              const newProd: GekProduct = {
                matnr: info.matnr,
                klasm: info.klasm,
                ad: info.ad,
                stok: String(stokVal),
                psf: psfStr,
                timestamp: Date.now(),
                url,
              };
              console.log('[GEK] Ürün detay yakalandı:', newProd);
              setGekProducts(prev => {
                // Aynı matnr varsa güncelle, yoksa başa ekle (max 20 kayıt)
                const filtered = prev.filter(p => p.matnr !== newProd.matnr);
                return [newProd, ...filtered].slice(0, 20);
              });
              setShowGekPanel(true);
              pendingGekDetail.current = null;
            }
          }
        }
      }
    } catch {}
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-stone-50">
      {/* ÜST BAR */}
      <div className="flex items-center gap-4 px-4 py-2.5 bg-white border-b border-stone-200 shrink-0">

        {/* Başlık ve Kamyon Simgesi */}
        <div className="flex items-center gap-2 text-blue-600 shrink-0">
          <Truck className="h-5 w-5" />
          <span className="text-xs font-black tracking-tight uppercase">Depolar</span>
        </div>

        {/* Ana Menüye Dönüş Butonu */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[11px] font-bold text-stone-500 hover:text-stone-850 px-3 py-1.5 rounded-xl hover:bg-stone-100 transition-all shrink-0 border border-stone-200 shadow-sm"
        >
          <ArrowLeft size={14} />
          Ana Menü
        </button>

        <div className="w-px h-5 bg-stone-200 shrink-0" />

        {/* Yatay Depolar Listesi */}
        <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-hide py-0.5">
          {depolar.filter(d => d.enabled !== false).length === 0 ? (
            <span className="text-[11px] text-stone-400 font-medium">Aktif depo yok. Lütfen ayarlardan depoları aktifleştirin.</span>
          ) : (
            depolar.filter(d => d.enabled !== false).map(depo => (
              <div key={depo.id} className="group relative flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 rounded-xl hover:border-blue-400 hover:shadow-sm transition-all shrink-0">
                <button
                  onClick={() => handleOpenDepo(depo)}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-stone-700 hover:text-blue-600"
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: depo.renk }} />
                  {depo.ad}
                </button>

                {/* Hover Credentials Tooltip */}
                <div className="absolute top-full left-0 mt-1 hidden group-hover:flex flex-col bg-stone-900 text-white rounded-xl shadow-lg border border-stone-800 p-2.5 z-[999] min-w-[160px] text-[10px] space-y-1">
                  <div className="flex items-center justify-between gap-2 border-b border-stone-800 pb-1 mb-1">
                    <span className="text-stone-400 font-bold uppercase text-[9px]">{depo.ad}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-stone-500 font-medium shrink-0">Kullanıcı:</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard?.writeText(depo.kullanici || '');
                        alert(`${depo.ad} Kullanıcı Adı kopyalandı!`);
                      }}
                      className="font-mono font-bold text-stone-300 hover:text-teal-400 truncate hover:underline text-right"
                      title="Kopyalamak için tıklayın"
                    >
                      {depo.kullanici || '—'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-stone-500 font-medium shrink-0">Kod:</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard?.writeText(depo.kod || '');
                        alert(`${depo.ad} Depo Kodu kopyalandı!`);
                      }}
                      className="font-mono font-bold text-stone-300 hover:text-teal-400 truncate hover:underline text-right"
                      title="Kopyalamak için tıklayın"
                    >
                      {depo.kod || '—'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-stone-500 font-medium shrink-0">Şifre:</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard?.writeText(depo.sifre || '');
                        alert(`${depo.ad} Şifre kopyalandı!`);
                      }}
                      className="font-mono font-bold text-stone-300 hover:text-teal-400 truncate hover:underline text-right"
                      title="Kopyalamak için tıklayın"
                    >
                      {depo.sifre || '—'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {onGoToSettings && (
            <button
              onClick={onGoToSettings}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-dashed border-stone-300 hover:border-blue-500 text-[10px] font-bold text-stone-500 hover:text-blue-600 transition-all shrink-0"
            >
              <Settings size={12} /> Depoları Yönet
            </button>
          )}
        </div>

        <div className="w-px h-5 bg-stone-200 shrink-0" />

        {/* GEK Ürünleri Toggle Butonu */}
        {gekProducts.length > 0 && (
          <button
            onClick={() => setShowGekPanel(v => !v)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all shrink-0",
              showGekPanel
                ? "border-orange-400 bg-orange-50 text-orange-700"
                : "border-orange-200 bg-white text-orange-500 hover:border-orange-400 hover:bg-orange-50"
            )}
          >
            <Search size={11} />
            GEK Ürünleri
            <span className="bg-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full leading-none">
              {gekProducts.length}
            </span>
          </button>
        )}
      </div>

      {/* ALT BÖLÜM */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sol Panel — Mini Sepet */}
        <div className="w-[22%] min-w-[220px] max-w-[300px] flex flex-col h-full border-r border-stone-200 bg-white">
          <MiniSepet
            cart={cart}
            onBarcodeDoubleClick={handleBarcodeDoubleClick}
            bulkQueryResult={bulkQueryResult}
            bulkQueryLoading={bulkQueryLoading}
            onBulkQuery={triggerWarehouseBulkQuery}
            activeDepoAd={tabs.find(t => t.id === activeTabId)?.title || 'Aktif Depo'}
          />
        </div>

        {/* Sağ Panel — Tarayıcı Paneli */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <BrowserPanel
            tabs={tabs}
            activeTabId={activeTabId}
            onTabChange={setActiveTabId}
            onTabClose={handleCloseTab}
            onTabAdd={handleAddTab}
            onNavigate={handleNavigate}
            preloadPath={preloadPath}
            onIpcMessage={handleIpcMessage}
            pendingSearch={pendingSearch}
            onSearchProcessed={onSearchProcessed}
            pendingOrder={pendingOrder}
            onOrderProcessed={() => setPendingOrder(null)}
            onOrderResult={handleOrderResult}
            webviewRefs={webviewRefs}
            depolar={depolar}
          />
        </div>

        {/* GEK Ürün Bilgi Paneli (toggle) */}
        {showGekPanel && gekProducts.length > 0 && (
          <div className="w-[260px] min-w-[260px] flex flex-col h-full border-l border-orange-200 bg-white">
            {/* Panel Başlık */}
            <div className="flex items-center justify-between px-3 py-2.5 bg-orange-50 border-b border-orange-200 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                <p className="text-[11px] font-black text-orange-800 uppercase tracking-wide">GEK Ürünleri</p>
                <span className="text-[9px] bg-orange-200 text-orange-700 font-bold px-1.5 py-0.5 rounded-full">
                  {gekProducts.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setGekProducts([])}
                  className="text-[9px] text-orange-400 hover:text-orange-600 font-bold transition-colors px-1"
                  title="Listeyi Temizle"
                >
                  Temizle
                </button>
                <button
                  onClick={() => setShowGekPanel(false)}
                  className="p-0.5 rounded hover:bg-orange-100 text-orange-400 hover:text-orange-600 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* Ürün Listesi */}
            <div className="flex-1 overflow-y-auto divide-y divide-stone-50">
              {gekProducts.map((prod, i) => (
                <div key={`${prod.matnr}-${i}`} className="px-3 py-2.5 hover:bg-stone-50/80 transition-colors group">
                  {/* Ürün Adı */}
                  <p className="text-[11px] font-bold text-stone-900 leading-tight mb-1.5 line-clamp-2">
                    {prod.ad || '—'}
                  </p>
                  {/* MATNR + KLASM */}
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    {prod.matnr && (
                      <span className="font-mono text-[9px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-bold">
                        {prod.matnr.replace(/^0+/, '')}
                      </span>
                    )}
                    {prod.klasm && (
                      <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">
                        {prod.klasm}
                      </span>
                    )}
                  </div>
                  {/* Stok + PSF */}
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-[8px] font-black text-stone-400 uppercase tracking-wide mb-0.5">Stok</p>
                      <p className={cn(
                        "text-[12px] font-black",
                        Number(prod.stok) > 0 ? "text-emerald-600" : "text-red-500"
                      )}>
                        {prod.stok}
                      </p>
                    </div>
                    {prod.psf && (
                      <div>
                        <p className="text-[8px] font-black text-stone-400 uppercase tracking-wide mb-0.5">PSF</p>
                        <p className="text-[12px] font-black text-stone-700">{prod.psf}</p>
                      </div>
                    )}
                    <div className="ml-auto text-[8px] text-stone-300 font-medium">
                      {new Date(prod.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Alt bilgi */}
            <div className="px-3 py-2 bg-orange-50/50 border-t border-orange-100 shrink-0">
              <p className="text-[9px] text-orange-500 font-medium leading-tight">
                💡 GEK'te arama yaptıkça ürünler otomatik eklenir
              </p>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <DepoModal depo={editingDepo} onSave={handleSaveDepo}
          onClose={() => { setShowModal(false); setEditingDepo(undefined); }} />
      )}

      {/* Toast Bildirimi */}
      <ToastNotification toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
