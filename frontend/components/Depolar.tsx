"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Globe, Plus, X, Eye, EyeOff, Trash2,
  Copy, Check, ExternalLink, RefreshCw,
  ShoppingCart, Store, Lock, User, Link2,
  Search, ArrowLeft, ArrowRight
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

type Depo = {
  id: string; ad: string; url: string;
  kullanici: string; kod: string; sifre: string; renk: string;
};

type BrowserTab = {
  id: string;
  proxyUrl: string;   // http://127.0.0.1:PORT  (iframe src)
  displayUrl: string; // https://depo.com (adres çubuğunda gösterilen)
  title: string;
  depoId?: string;
};

interface DepolarProps {
  cart: Record<string, CartItem>;
  gln: string;
}

// ── Renk paleti ─────────────────────────────────────────────────────────────

const DEPO_COLORS = [
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

function loadDepolar(): Depo[] {
  try { const r = localStorage.getItem(LOCAL_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveDepolar(d: Depo[]) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(d)); } catch {}
}
function randomId() { return Math.random().toString(36).slice(2, 10); }
function ensureHttp(url: string) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return 'https://' + url;
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

// ── Mini Sepet ───────────────────────────────────────────────────────────────

function MiniSepet({ cart, onBarcodeDoubleClick }: { cart: Record<string, CartItem>; onBarcodeDoubleClick?: (barcode: string) => void }) {
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
        <div className="flex items-center gap-2 mb-3">
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
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-stone-400" />
          <input type="text" placeholder="İlaç ara..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-7 pr-3 h-8 text-[11px] bg-stone-50 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all" />
        </div>
      </div>

      {/* İpucu */}
      <div className="px-3 py-2 bg-teal-50/60 border-b border-teal-100 shrink-0">
        <p className="text-[10px] text-teal-700 font-medium leading-tight">
          💡 <span className="font-bold">Barkod</span>'a tıkla → kopyala &nbsp;|&nbsp; <span className="font-bold">İlaç adı</span>'na tıkla → ilk kelime kopyalanır
        </p>
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
                      title="Barkod kopyala (Çift tıklayarak depoda aratın)"
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

function DepoModal({ depo, onSave, onClose }: { depo?: Depo; onSave: (d: Depo) => void; onClose: () => void }) {
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
    <div className="group relative flex items-center gap-3 px-4 py-3 rounded-2xl border border-stone-100 bg-white hover:border-stone-200 hover:shadow-md transition-all cursor-pointer"
      onClick={() => onOpen(depo)}>
      <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-white font-black text-[13px] shadow-sm"
        style={{ backgroundColor: depo.renk }}>
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

// ── Tarayıcı Paneli (proxy-destekli iframe) ──────────────────────────────────

function BrowserPanel({ 
  tabs, activeTabId, onTabChange, onTabClose, onTabAdd, onNavigate, preloadPath, onIpcMessage, pendingSearch, onSearchProcessed 
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
}) {
  const [addressBar, setAddressBar] = useState('');
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});
  const activeTab = tabs.find(t => t.id === activeTabId);

  useEffect(() => {
    if (activeTab) setAddressBar(activeTab.displayUrl || activeTab.proxyUrl);
  }, [activeTabId, activeTab?.proxyUrl]);

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
              
              // Set value using property descriptor to bypass React/Vue state override
              const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
              if (descriptor && descriptor.set) {
                descriptor.set.call(input, "${barcode}");
              } else {
                input.value = "${barcode}";
              }
              
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              
              // Wait 300ms for input debounce/autocomplete processing
              await sleep(300);
              
              // Trigger search click if search button exists
              const searchBtn = document.querySelector("#btnSearch") || 
                               document.querySelector(".btn-search") ||
                               document.querySelector("a.searchBtn");
              if (searchBtn && typeof searchBtn.click === 'function') {
                searchBtn.click();
              } else {
                // Dispatch full keyboard Enter event sequence
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

      {/* Bilgilendirme Banner'ı */}
      {activeTab && activeTab.proxyUrl && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-amber-800 font-medium leading-normal flex-1">
            ⚠️ <b>Önemli:</b> Depo sitelerinin gelişmiş güvenlik önlemleri (SameSite çerezleri, CORS ve SSL kısıtlamaları) sebebiyle uygulama içi pencereden giriş yaparken sorun yaşayabilirsiniz. Sorunsuz işlem için siteyi <b>dış tarayıcıda</b> açmanız önerilir.
          </p>
          <button onClick={() => openExternal(activeTab.displayUrl || activeTab.proxyUrl)}
            className="ml-3 shrink-0 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded-lg shadow-sm transition-all flex items-center gap-1">
            <ExternalLink size={10} /> Tarayıcıda Aç
          </button>
        </div>
      )}

      {/* webview/iframe alanı */}
      <div className="flex-1 relative bg-white">
        {tabs.map(tab => (
          React.createElement('webview', {
            key: tab.id,
            ref: (el: any) => {
              iframeRefs.current[tab.id] = el;
              if (el) {
                el.removeEventListener('ipc-message', onIpcMessage);
                el.addEventListener('ipc-message', onIpcMessage);
              }
            },
            src: tab.proxyUrl || 'about:blank',
            partition: 'persist:depolar',
            preload: preloadPath || undefined,
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

export default function Depolar({ cart }: DepolarProps) {
  const [depolar, setDepolar] = useState<Depo[]>(loadDepolar);
  const [showModal, setShowModal] = useState(false);
  const [editingDepo, setEditingDepo] = useState<Depo | undefined>(undefined);

  const initialTabId = randomId();
  const [tabs, setTabs] = useState<BrowserTab[]>([
    { id: initialTabId, proxyUrl: '', displayUrl: '', title: 'Yeni Sekme' }
  ]);
  const [activeTabId, setActiveTabId] = useState(initialTabId);

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
      
      // Check if AS Ecza tab is already open
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

  return (
    <div className="flex h-screen overflow-hidden bg-stone-50">
      {/* SOL PANEL — %30 */}
      <div className="w-[30%] min-w-[260px] max-w-[360px] flex flex-col h-full border-r border-stone-200 bg-white">

        {/* Mini Sepet */}
        <div className="flex-1 overflow-hidden flex flex-col" style={{ maxHeight: '55%' }}>
          <MiniSepet cart={cart} />
        </div>

        {/* Ayraç */}
        <div className="px-4 py-2 bg-stone-50 border-y border-stone-100 shrink-0 flex items-center justify-between">
          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest flex items-center gap-1.5">
            <Store size={10} /> Kayıtlı Depolar
          </span>
          <button onClick={() => { setEditingDepo(undefined); setShowModal(true); }}
            className="flex items-center gap-1 text-[10px] font-bold text-teal-600 hover:text-teal-700 transition-colors">
            <Plus size={12} /> Ekle
          </button>
        </div>

        {/* Depo listesi */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {depolar.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-stone-300 py-8 text-center">
              <Store size={28} strokeWidth={1.5} />
              <div>
                <p className="text-[11px] font-semibold text-stone-400">Kayıtlı depo yok</p>
                <p className="text-[10px] text-stone-300 mt-0.5">+ Ekle butonunu kullanın</p>
              </div>
            </div>
          ) : (
            depolar.map(depo => (
              <DepoCard key={depo.id} depo={depo}
                onOpen={handleOpenDepo}
                onEdit={d => { setEditingDepo(d); setShowModal(true); }}
                onDelete={handleDeleteDepo}
              />
            ))
          )}
        </div>
      </div>

      {/* SAĞ PANEL — %70 */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <BrowserPanel
          tabs={tabs}
          activeTabId={activeTabId}
          onTabChange={setActiveTabId}
          onTabClose={handleCloseTab}
          onTabAdd={handleAddTab}
          onNavigate={handleNavigate}
        />
      </div>

      {showModal && (
        <DepoModal depo={editingDepo} onSave={handleSaveDepo}
          onClose={() => { setShowModal(false); setEditingDepo(undefined); }} />
      )}
    </div>
  );
}
