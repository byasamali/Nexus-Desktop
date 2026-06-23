"use client";

import { useRouter } from 'next/router';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

import GeneralReports from '@/components/GeneralReports';
import YokListesi from '@/components/YokListesi';
import SepetPage from '@/components/Sepet';
import PredictionsReport from '@/components/PredictionsReport';
import TaskBoard from '@/components/TaskBoard';
import InventoryBoard from '@/components/InventoryBoard';
import ExpiryReport from '@/components/ExpiryReport';
import DeadStockReport from '@/components/DeadStockReport';
import OutOfStockReport from '@/components/OutOfStockReport';
import KardesEczanePage from '@/components/KardesEczane';
import Depolar from '@/components/Depolar';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { fetchEczaneData } from '@/lib/api';
import { DashboardData } from '@/lib/types';
import {
  Package, Activity, Moon, AlertTriangle, Search,
  Copy, ShoppingCart, BarChart2, Check, ChevronDown, Calendar, Brain,
  DollarSign, ClipboardList, X, TrendingUp, RefreshCw, MoreVertical, EyeOff, Zap, Download, Layers, Sparkles, ChevronRight,
  ListX, PackageX, Star, ArrowRight, Pill, FlaskConical,
  Building2, Users, Wrench, Settings, Menu, Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import {
  getAnaKategoriler,
  getAltKategoriler,
  isInAnaKategori,
  getBreadcrumb,
  isPharmaceuticalCategory,
  type Category,
} from '@/lib/categoryMap';

// Scrollbar CSS + Inter font
const scrollbarStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

  * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important; }

  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  @media (max-width: 768px) {
    .scrollbar-hide {
      scrollbar-width: auto;
    }
    .scrollbar-hide::-webkit-scrollbar {
      display: block !important;
      height: 4px;
    }
    .scrollbar-hide::-webkit-scrollbar-track {
      background: transparent;
    }
    .scrollbar-hide::-webkit-scrollbar-thumb {
      background: #d4d4d8;
      border-radius: 2px;
  }
  
  /* Wails compact mode for smaller screens */
  .wails-compact td, .wails-compact th {
    padding-left: 12px !important;
    padding-right: 12px !important;
    padding-top: 6px !important;
    padding-bottom: 6px !important;
    font-size: 11px !important;
  }
  .wails-compact .p-6, .wails-compact .p-8 {
    padding: 16px !important;
  }
  .wails-compact aside {
    width: 240px !important;
  }
  .wails-compact main {
    margin-left: 240px !important;
  }

  /* Sidebar collapsed mode */
  aside.sidebar-collapsed {
    width: 80px !important;
  }
  aside.sidebar-collapsed .logo-text {
    display: none !important;
  }
  aside.sidebar-collapsed .nav-section-title {
    display: none !important;
  }
  aside.sidebar-collapsed .nav-item-text {
    display: none !important;
  }
  aside.sidebar-collapsed .nav-item-badge {
    display: none !important;
  }
  aside.sidebar-collapsed .nav-section-chevron {
    display: none !important;
  }
  aside.sidebar-collapsed .nav-divider-text {
    display: none !important;
  }
  aside.sidebar-collapsed .nav-divider-line {
    width: 100% !important;
  }
  aside.sidebar-collapsed button {
    justify-content: center !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }
  aside.sidebar-collapsed .px-3 {
    padding-left: 0.5rem !important;
    padding-right: 0.5rem !important;
  }
  main.main-expanded {
    margin-left: 80px !important;
  }
`;

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = scrollbarStyles;
  document.head.appendChild(style);
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── LOG RENDER FONKSİYONLARI ────────────────────────────────────────────────
// Backend artık HTML yerine yapısal array gönderiyor: ["tip", ...değerler]
// Burada her tip için React render ediyoruz.

function renderLogItem(entry: any, i: number): React.ReactNode {
  if (!Array.isArray(entry)) {
    // Geriye dönük uyumluluk: eski string formatı
    return <div key={i} className="text-[11px] text-stone-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: String(entry) }} />;
  }
  const [tip, ...args] = entry;

  const Row = ({ icon, label, val, cls = '' }: any) => (
    <div key={i} className={cn("flex items-baseline gap-2 text-[11px] py-0.5", cls)}>
      <span className="shrink-0">{icon}</span>
      <span className="text-stone-500 font-medium">{label}</span>
      {val !== undefined && <span className="text-stone-800 font-semibold ml-auto font-mono">{val}</span>}
    </div>
  );

  switch (tip) {
    case 'b': return <Row key={i} icon="📊" label={`${args[0]} hız × ${args[1]} gün − ${args[2]} stok`} val={`= ${args[3]}`} />;
    case 'vz': return <Row key={i} icon="⭐" label="Vazgeçilmez — raf güvenliği" val={`${args[0]} kutu`} cls="text-violet-700" />;
    case 'ucuz': return <Row key={i} icon="💰" label={`Ucuz ürün katsayısı ×${args[0]}`} val={`→ ${args[1]}`} />;
    case 'pahali': return <Row key={i} icon="💸" label={`Pahalı ürün katsayısı ×${args[0]}`} val={`→ ${args[1]}`} />;
    case 'tr+': return <Row key={i} icon="📈" label={`Trend artış (skor: ${args[0]}) ×${args[1]}`} val={`→ ${args[2]}`} cls="text-emerald-700" />;
    case 'tr-': return <Row key={i} icon="📉" label={`Trend düşüş (skor: ${args[0]}) ×${args[1]}`} val={`→ ${args[2]}`} cls="text-amber-700" />;
    case 'ithal': return <Row key={i} icon="🚢" label={`İthal ürün tedarik riski ×${args[0]}`} val={`→ ${args[1]}`} />;
    case 'mf_hdr': return <div key={i} className="text-[10px] font-black text-stone-500 uppercase tracking-widest border-t border-stone-200 pt-2 mt-1">🕒 Nakit Akışı & Barem Analizi</div>;
    case 'mf_row': {
      const [ok, ana, mf, sebep, aylar, net, birim] = args;
      return (
        <div key={i} className={cn("rounded-lg border px-3 py-2 my-1 text-[10px]", ok ? "bg-emerald-50 border-emerald-200" : "bg-stone-50 border-stone-200 opacity-60")}>
          <div className="flex items-center gap-2 font-mono font-bold">
            <span>{ok ? '✅' : '❌'}</span>
            <span className="text-stone-800">{ana}+{mf}</span>
            {sebep && <span className="text-stone-400 font-normal">{sebep}</span>}
            <span className="ml-auto text-emerald-700">₺{net.toLocaleString('tr-TR')}</span>
          </div>
          {aylar && <div className="text-stone-400 mt-0.5 font-mono">📅 {aylar} &nbsp; birim: {birim}</div>}
        </div>
      );
    }
    case 'fin': return <div key={i} className="text-[11px] font-black text-blue-700 border-t border-blue-100 pt-1 mt-1">🚀 Karar: {args[0]}+{args[1]} baremi seçildi</div>;
    case 'blok': return <Row key={i} icon="📦" label={`Blok satış — min ${args[0]} adet alışkanlığı`} />;
    case 'grp': return <div key={i} className="text-[11px] text-teal-700 font-semibold border-t border-teal-100 pt-1 mt-1">🧬 Grup stratejisi: +{args[0]} kutu eşdeğerden kaydırıldı</div>;
    case 'dur': return <div key={i} className="text-[11px] text-red-600 font-semibold">⛔ {args[0]}</div>;
    case 'enteral': return <div key={i} className="text-[11px] text-blue-700 font-semibold">🍼 Enteral — hasta bazlı hedef: {args[0]} kutu</div>;
    default: return <div key={i} className="text-[11px] text-stone-500">{JSON.stringify(entry)}</div>;
  }
}

function renderGrupAnalizi(ozet: any): React.ReactNode {
  // ozet: array of ["tip", ...args] veya eski string formatı
  if (!ozet || (Array.isArray(ozet) && ozet.length === 0)) return null;

  // Eski string format (geriye dönük)
  if (typeof ozet === 'string') {
    return <div className="text-xs text-stone-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: ozet }} />;
  }

  const labels: Record<string, { icon: string; text: (...a: any[]) => string; cls: string }> = {
    oz_stok: { icon: '📊', text: (omur, stok) => `Toplam ${stok} kutu stok, grubu ${omur} gün idare eder.`, cls: 'text-stone-700' },
    oz_fazla: { icon: '🛑', text: (omur) => `Stok fazlalığı — ${omur} gün (6 ayı aşmış). Sipariş vermeden eritin.`, cls: 'text-amber-700' },
    oz_acil: { icon: '🚀', text: (omur) => `Acil tedarik — stok ${omur} gün içinde bitiyor.`, cls: 'text-red-600 font-bold' },
    oz_lider: { icon: '👑', text: (adi, yuzde) => `${adi} satışların %${yuzde}'ini oluşturuyor. Değişim zor.`, cls: 'text-stone-700' },
    oz_firsat: { icon: '🔄', text: () => `Lider baskın değil — hastayı kârlı ürüne yönlendirme şansı yüksek.`, cls: 'text-emerald-700' },
    oz_miad: { icon: '⚠️', text: (n) => `${n} adet miadı yaklaşan ürün var — öncelikli verilmeli.`, cls: 'text-amber-700 font-bold' },
    oz_olu: { icon: '💀', text: (n) => `${n} adet ölü stok — iade veya takas düşünülmeli.`, cls: 'text-stone-500' },
  };

  return (
    <div className="space-y-1">
      {(Array.isArray(ozet) ? ozet : []).map((entry: any, i: number) => {
        if (!Array.isArray(entry)) return <div key={i} className="text-xs text-stone-600">{String(entry)}</div>;
        const [tip, ...args] = entry;
        const def = labels[tip];
        if (!def) return null;
        return (
          <div key={i} className={cn("flex items-start gap-2 text-[11px]", def.cls)}>
            <span className="shrink-0 mt-0.5">{def.icon}</span>
            <span>{def.text(...args)}</span>
          </div>
        );
      })}
    </div>
  );
}

function renderTavsiye(tavsiye: any): React.ReactNode {
  if (!tavsiye) return null;
  // Eski HTML string formatı (geriye dönük)
  if (typeof tavsiye === 'string') {
    return <div className="text-xs text-stone-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: tavsiye }} />;
  }
  // Yeni dict formatı: { urun, vz, net }
  const { urun, vz, net } = tavsiye;
  return (
    <div className="bg-teal-50 rounded-xl border border-teal-100 p-3 space-y-1.5">
      <div className="text-[10px] font-black text-teal-600 uppercase tracking-widest">💡 Stratejik Satınalma Tavsiyesi</div>
      <div className="text-[11px] text-stone-700">En yüksek birim verimliliğe sahip ürün: <span className="font-bold text-stone-900">{urun}</span></div>
      {vz && vz !== 'Bulunmuyor' && <div className="text-[11px] text-stone-600">Vazgeçilmezler: <span className="italic">{vz}</span></div>}
      <div className="text-[11px] font-bold text-emerald-700">🎯 Kalan ihtiyacı {urun} ürününe yönlendirerek yaklaşık <span className="font-black">₺{Number(net).toLocaleString('tr-TR')}</span> net ek kâr sağlanabilir.</div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────


function calculateAutoMF(qty: number, baremler: any[]) {
  if (!baremler || !Array.isArray(baremler) || baremler.length === 0) return 0;
  let bestMf = 0;
  const sorted = [...baremler].sort((a, b) => b.ana - a.ana);
  for (let b of sorted) {
    if (qty >= b.ana && b.ana > 0) {
      bestMf = Math.floor(qty / b.ana) * b.mf;
      break;
    }
  }
  return bestMf;
}

function getColorClass(colorStr: string) {
  if (!colorStr) return "border-l-stone-200";
  const lower = colorStr.toLowerCase();
  if (lower.includes('kırmızı')) return "border-l-red-400";
  if (lower.includes('yeşil')) return "border-l-emerald-400";
  if (lower.includes('turuncu')) return "border-l-amber-400";
  if (lower.includes('mor')) return "border-l-violet-400";
  return "border-l-stone-200";
}

interface CartItem { qty: number; mf: number; inCart: boolean; ad: string; depo: string; }

function KategoriFiltreBar({
  selectedMainCats, setSelectedMainCats, selectedAltCats, setSelectedAltCats,
  excludedAltCats, setExcludedAltCats,
}: any) {
  const anaKategoriler = getAnaKategoriler();
  const [activeAna, setActiveAna] = useState<number | null>(selectedMainCats[0] || null);
  const [catSearch, setCatSearch] = useState(""); // Kategori içi arama

  const altKategoriler = activeAna ? getAltKategoriler(activeAna).filter(c =>
    c.isim.toLowerCase().includes(catSearch.toLowerCase())
  ) : [];

  return (
    <div className="flex flex-col md:flex-row gap-0 border border-stone-200 rounded-2xl overflow-hidden bg-white shadow-sm transition-all">
      {/* SOL: Ana Kategoriler */}
      <div className="w-full md:w-56 shrink-0 bg-stone-50/50 border-r border-stone-100">
        <div className="p-3 border-b border-stone-100 bg-white/50">
          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Ana Gruplar</span>
        </div>
        <div className="py-2 px-2 space-y-0.5">
          {anaKategoriler.map(cat => (
            <button key={cat.id} onClick={() => setActiveAna(cat.id)}
              className={cn("w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all",
                activeAna === cat.id ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200" : "text-stone-500 hover:bg-white/60")}>
              <span className="truncate">{cat.isim}</span>
              {selectedMainCats.includes(cat.id) && <div className="w-1.5 h-1.5 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]" />}
            </button>
          ))}
        </div>
      </div>

      {/* SAĞ: Alt Kategoriler & Arama */}
      <div className="flex-1 flex flex-col min-h-[300px] bg-white">
        <div className="p-3 border-b border-stone-100 flex items-center gap-3 bg-stone-50/30">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-stone-400" />
            <input
              type="text"
              placeholder="Alt kategori ara..."
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-[11px] bg-white border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all"
            />
          </div>
          <div className="flex gap-1">
            <button onClick={() => { setSelectedAltCats([]); setExcludedAltCats([]); }} className="text-[10px] font-bold text-stone-400 hover:text-red-500 px-2 py-1 transition-colors">Sıfırla</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          {!activeAna ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-300 gap-2">
              <Layers size={24} strokeWidth={1.5} />
              <span className="text-[11px] font-medium">Lütfen bir ana grup seçin</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {altKategoriler.map(cat => {
                const isInc = selectedAltCats.includes(cat.id);
                const isExc = excludedAltCats.includes(cat.id);
                return (
                  <div key={cat.id} className={cn(
                    "group flex items-center justify-between p-2 rounded-xl border transition-all",
                    isInc ? "bg-teal-50 border-teal-100 shadow-sm" : isExc ? "bg-red-50 border-red-100 opacity-80" : "bg-white border-stone-100 hover:border-stone-200"
                  )}>
                    <span className={cn("text-[11px] font-semibold truncate flex-1 px-1", isInc ? "text-teal-700" : isExc ? "text-red-700 line-through" : "text-stone-600")}>
                      {cat.isim}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Dahil Et (Check) */}
                      <button
                        onClick={() => {
                          if (isInc) setSelectedAltCats(selectedAltCats.filter(id => id !== cat.id));
                          else { setExcludedAltCats(excludedAltCats.filter(id => id !== cat.id)); setSelectedAltCats([...selectedAltCats, cat.id]); }
                        }}
                        className={cn("w-6 h-6 rounded-lg flex items-center justify-center transition-all", isInc ? "bg-teal-600 text-white" : "bg-stone-100 text-stone-400 hover:bg-teal-100 hover:text-teal-600")}>
                        <Check size={12} strokeWidth={3} />
                      </button>
                      {/* Dışla (X) */}
                      <button
                        onClick={() => {
                          if (isExc) setExcludedAltCats(excludedAltCats.filter(id => id !== cat.id));
                          else { setSelectedAltCats(selectedAltCats.filter(id => id !== cat.id)); setExcludedAltCats([...excludedAltCats, cat.id]); }
                        }}
                        className={cn("w-6 h-6 rounded-lg flex items-center justify-center transition-all", isExc ? "bg-red-600 text-white" : "bg-stone-100 text-stone-400 hover:bg-red-100 hover:text-red-600")}>
                        <X size={12} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrderCockpit() {
  const router = useRouter();
  const isWails = typeof window !== 'undefined' && (window as any).go !== undefined;

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('oneri');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isKritik, setIsKritik] = useState(false); // Yeni eklendi
  const [expandedCategory, setExpandedCategory] = useState<'ilac' | 'disi' | null>(null);
  const [ignoredBarkods, setIgnoredBarkods] = useState<Set<string>>(new Set());
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const isInitialCartLoad = useRef(true);
  const [cartSyncStatus, setCartSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyOrders, setShowOnlyOrders] = useState(true);
  const [selectedMainCats, setSelectedMainCats] = useState<number[]>([]);
  const [selectedAltCats, setSelectedAltCats] = useState<number[]>([]);
  const [excludedAltCats, setExcludedAltCats] = useState<number[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedBarkods, setSelectedBarkods] = useState<Set<string>>(new Set());
  const [visibleGroupsCount, setVisibleGroupsCount] = useState(20);
  const [showOnlyEsdesiz, setShowOnlyEsdesiz] = useState(false);
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const cartSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copiedBarkod, setCopiedBarkod] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any | null>(null);
  const [selectedGrup, setSelectedGrup] = useState<any | null>(null);
  const [menuStates, setMenuStates] = useState({ stok: true, operasyon: false, ag: false, analitik: false, araclar: false });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mainCategory, setMainCategory] = useState<'ilac' | 'disi'>('ilac');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [cockpitSortField, setCockpitSortField] = useState<string | null>(null);
  const [cockpitSortOrder, setCockpitSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleCockpitSort = (field: string) => {
    if (cockpitSortField === field) {
      setCockpitSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setCockpitSortField(field);
      setCockpitSortOrder('desc');
    }
  };

  const toggleMenu = (key: 'stok' | 'operasyon' | 'ag' | 'analitik' | 'araclar') => {
    setMenuStates(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleBulkAddToCart = () => {
    const newCart = { ...cart };
    selectedBarkods.forEach(barkod => {
      const urun = data?.gruplar?.flatMap((g: any) => g.detaylar).find((u: any) => u.v1 === barkod) as any;
      if (urun) {
        const current = newCart[barkod] || { qty: 0, mf: 0, inCart: false, ad: urun.v2, depo: urun.v91 };
        const targetQty = current.qty > 0 ? current.qty : (urun.v26 > 0 ? urun.v26 : 1);
        newCart[barkod] = { ...current, qty: targetQty, inCart: true, mf: current.mf || calculateAutoMF(targetQty, urun.mf_baremleri) };
      }
    });
    setCart(newCart);
  };

  const handleSelectAllVisible = () => {
    const list = mainCategory === 'ilac' ? filteredIlacGroups : filteredDisiGroups;
    const allVisibleBarkods = list.flatMap((g: any) => g.detaylar.map((u: any) => u.v1));
    setSelectedBarkods(prev => {
      const next = new Set(prev);
      allVisibleBarkods.forEach(b => next.add(b));
      return next;
    });
  };

  const handleClearSelection = () => setSelectedBarkods(new Set());

  const handleDownloadExcel = () => {
    const list = expandedCategory === 'ilac' ? filteredIlacGroups : filteredDisiGroups;
    const excelTemplate = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8"><style>.text-format{mso-number-format:"\\@";}.num-format{mso-number-format:"General";}th{background-color:#f1f5f9;font-weight:bold;border:1px solid #cbd5e1;}td{border:1px solid #e2e8f0;}</style></head><body><table><thead><tr><th>Barkod</th><th>Ürün Adı</th><th>Depo</th><th>Aylık Hız</th><th>Stok</th><th>Öneri</th></tr></thead><tbody>${list.flatMap((g: any) => g.detaylar.map((u: any) => `<tr><td class="text-format">${u.v1}</td><td>${u.v2}</td><td>${u.v91 || ""}</td><td class="num-format">${(u.v20 * 30).toFixed(1).replace('.', ',')}</td><td class="num-format">${u.v4}</td><td class="num-format">${g.toplam_oneri}</td></tr>`).join('')).join('')}</tbody></table></body></html>`;
    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nexus_siparis_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleSelectAll = (grupBarkodları: string[]) => {
    setSelectedBarkods(prev => {
      const next = new Set(prev);
      const hepsiSecili = grupBarkodları.every(b => prev.has(b));
      grupBarkodları.forEach(b => { if (hepsiSecili) next.delete(b); else next.add(b); });
      return next;
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setSyncStatusMsg("Yerel senkronizasyon başlatılıyor...");
    try {
      let dashboardData;
      if (isWails) {
        // Setup listener for Wails sync status events
        const wailsRuntime = (window as any).runtime;
        if (wailsRuntime && typeof wailsRuntime.EventsOn === 'function') {
          wailsRuntime.EventsOn("sync:status", (status: string) => {
            if (status === "connecting") {
              setSyncStatusMsg("Yerel veritabanına bağlanılıyor...");
            } else if (status === "fetching") {
              setSyncStatusMsg("SQL verileri çekiliyor...");
            } else if (status === "processing") {
              setSyncStatusMsg("Değişiklik analizi yapılıyor...");
            } else if (status === "completed") {
              setSyncStatusMsg("Senkronizasyon tamamlandı, güncelleniyor...");
            } else if (status.startsWith("error:")) {
              setSyncStatusMsg(status.replace("error:", "Hata: "));
            }
          });
        }

        const settingsStr = await (window as any).go.main.App.LoadSettings();
        const settings = JSON.parse(settingsStr);
        if (!settings || !settings.gln) {
          alert("Lütfen önce ayarlarınızı yapın.");
          setIsRefreshing(false);
          return;
        }
        const resJson = await (window as any).go.main.App.TriggerSyncAndAnalysis(settings.gln, false);
        dashboardData = JSON.parse(resJson);

        // Turn off event listener
        if (wailsRuntime && typeof wailsRuntime.EventsOff === 'function') {
          wailsRuntime.EventsOff("sync:status");
        }
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return router.push('/register');

        // 1. Yerel Go Ajanına senkronizasyon başlatma isteği gönder
        const startRes = await fetch("http://127.0.0.1:9999/run-sync", { method: "POST" });
        if (!startRes.ok) {
          if (startRes.status === 409) {
            // Zaten çalışıyor, direkt izlemeye geç
            console.log("Sync already in progress, starting polling...");
          } else {
            throw new Error(`Yerel ajan hatası: ${startRes.statusText}`);
          }
        }

        // 2. Polling döngüsü başlat
        const pollStatus = async () => {
          return new Promise<void>((resolve, reject) => {
            const interval = setInterval(async () => {
              try {
                const statusRes = await fetch("http://127.0.0.1:9999/sync-status");
                if (!statusRes.ok) throw new Error("Ajan durumu okunamadı");
                const statusData = await statusRes.json();
                const status = statusData.status;

                // Duruma göre kullanıcıya mesaj göster
                if (status === "connecting") {
                  setSyncStatusMsg("Yerel veritabanına bağlanılıyor...");
                } else if (status === "fetching") {
                  setSyncStatusMsg("SQL verileri çekiliyor...");
                } else if (status === "processing") {
                  setSyncStatusMsg("Değişiklik analizi yapılıyor...");
                } else if (status === "uploading") {
                  setSyncStatusMsg("Değişen veriler buluta yükleniyor...");
                } else if (status === "completed") {
                  clearInterval(interval);
                  setSyncStatusMsg("Sunucu analizi yenileniyor...");
                  resolve();
                } else if (status.startsWith("error:")) {
                  clearInterval(interval);
                  reject(new Error(status.replace("error:", "")));
                }
              } catch (e) {
                clearInterval(interval);
                reject(e);
              }
            }, 1500);
          });
        };

        await pollStatus();

        // 3. Bulut sunucusundaki analizi yenile (ve cache'i temizle)
        const { data: eczaneData } = await supabase
          .from('eczaneler')
          .select('gln')
          .eq('id', user.id)
          .single();
        if (!eczaneData?.gln) throw new Error("Eczane GLN bulunamadı");
        const gln = eczaneData.gln;

        const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/refresh-analysis/${gln}`, { method: 'POST' });
        if (!refreshRes.ok) throw new Error("Bulut analizi yenilenemedi");
        
        dashboardData = await refreshRes.json();

        // 4. Ajanı idle durumuna geri çek
        await fetch("http://127.0.0.1:9999/reset-sync", { method: "POST" });
      }

      setData(dashboardData);
      setSyncStatusMsg("");
    } catch (error: any) {
      alert("Analiz sırasında bir hata oluştu: " + (error?.message || error || "Bilinmeyen Hata"));
      setSyncStatusMsg("");
      if (!isWails) {
        try {
          await fetch("http://127.0.0.1:9999/reset-sync", { method: "POST" });
        } catch (e) {}
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleIgnore = (barkod: string) => { setIgnoredBarkods(prev => new Set(prev).add(barkod)); setActiveMenu(null); };

  useEffect(() => {
    const handleAddToCartEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { barkod, ad, qty } = customEvent.detail;
      if (!barkod) return;

      setCart(prev => {
        const existing = prev[barkod] || { qty: 0, mf: 0, inCart: false, ad: ad || "Bilinmeyen Ürün", depo: "Depo Belirsiz" };
        const targetQty = qty || existing.qty || 1;
        return {
          ...prev,
          [barkod]: {
            ...existing,
            qty: targetQty,
            inCart: true,
            ad: ad || existing.ad
          }
        };
      });
    };

    window.addEventListener('nexus:addToCart', handleAddToCartEvent);
    return () => {
      window.removeEventListener('nexus:addToCart', handleAddToCartEvent);
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        let res;
        if (isWails) {
          res = await fetchEczaneData("");
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return router.push('/register');
          res = await fetchEczaneData(user.id);
        }
        if (!res) { setLoading(false); return; }
        setData(res);

        console.log('🔍 DASHBOARD DEBUG - Gruplar:');
        if (res.gruplar && Array.isArray(res.gruplar)) {
          const testBarkod = '8699745001834';
          for (const grup of res.gruplar) {
            for (const detay of grup.detaylar || []) {
              if (detay.v1 === testBarkod) {
                console.log(`✅ Bulundu - ${testBarkod}:`, detay);
                break;
              }
            }
          }
        }

        let savedCartObj: Record<string, any> = {};
        if (isWails) {
          const cached = await (window as any).go.main.App.LoadLocalJSON(res.gln || "local", "cart.json");
          if (cached && cached !== '{}') savedCartObj = JSON.parse(cached);
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          const { data: cartData } = await supabase.from('kullanici_sepetleri').select('sepet').eq('eczane_id', user?.id).maybeSingle();
          savedCartObj = cartData?.sepet ? (typeof cartData.sepet === 'string' ? JSON.parse(cartData.sepet) : cartData.sepet) : {};
        }

        const initialCart: Record<string, CartItem> = {};
        Object.keys(savedCartObj).forEach(b => { initialCart[b] = { ...savedCartObj[b], inCart: true }; });
        if (res.gruplar) {
          res.gruplar.forEach((g: any) => {
            g.detaylar.forEach((u: any) => {
              if (!initialCart[u.v1] && u.v26 > 0) initialCart[u.v1] = { qty: u.v26, mf: 0, inCart: false, ad: u.v2, depo: u.v91 };
            });
          });
        }
        setCart(initialCart);
      } catch (err) { console.error("Sistem hatası:", err); }
      finally { setLoading(false); }
    };
    loadData();
  }, [router]);

  useEffect(() => {
    if (isInitialCartLoad.current) {
      isInitialCartLoad.current = false;
      return;
    }
    setCartSyncStatus('saving');
    if (cartSaveRef.current) clearTimeout(cartSaveRef.current);
    cartSaveRef.current = setTimeout(async () => {
      try {
        const inCartItems = Object.entries(cart).filter(([_, val]: any) => val.inCart && val.qty > 0);
        const cartObj = Object.fromEntries(inCartItems.map(([id, val]: any) => [id, { barkod: id, ad: val.ad, depo: val.depo, qty: val.qty, mf: val.mf }]));
        if (isWails) {
          await (window as any).go.main.App.SaveLocalJSON(data?.gln || "local", "cart.json", JSON.stringify(cartObj));
          setCartSyncStatus('saved');
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            setCartSyncStatus('error');
            return;
          }
          const { error } = await supabase.from('kullanici_sepetleri').upsert(
            { eczane_id: user.id, sepet: cartObj, guncelleme_tarihi: new Date().toISOString() },
            { onConflict: 'eczane_id' }
          );
          setCartSyncStatus(error ? 'error' : 'saved');
        }
        setTimeout(() => setCartSyncStatus('idle'), 2000);
      } catch (e) {
        console.error('Sepet kayıt hatası:', e);
        setCartSyncStatus('error');
        setTimeout(() => setCartSyncStatus('idle'), 2000);
      }
    }, 800);
    return () => { if (cartSaveRef.current) clearTimeout(cartSaveRef.current); };
  }, [cart]);

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const el = document.createElement("textarea");
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopiedBarkod(text);
      setTimeout(() => setCopiedBarkod(null), 2000);
    } catch (err) { console.error('Kopyalama hatası:', err); }
  };

  const updateCart = (barkod: string, qty: number, manualMf?: number, urun?: any) => {
    setCart(prev => {
      let finalMf = manualMf;
      if (manualMf === undefined && urun) finalMf = calculateAutoMF(qty, urun.mf_baremleri);
      const existing = prev[barkod] || { qty: 0, mf: 0, inCart: false, ad: "Bilinmeyen Ürün", depo: "Depo Belirsiz" };
      return { ...prev, [barkod]: { ...existing, qty, mf: finalMf || 0, ad: urun?.v2 || existing.ad, depo: urun?.v91 || existing.depo } };
    });
  };

  const toggleCartItem = (barkod: string, urun: any) => {
    setCart(prev => {
      const existing = prev[barkod] || { qty: 0, mf: 0, inCart: false, ad: urun.v2, depo: urun.v91 };
      return { ...prev, [barkod]: { ...existing, inCart: !existing.inCart } };
    });
  };

  const updateCartFromSepet = (newItems: any[]) => {
    setCart(prev => {
      const nextCart = { ...prev };
      Object.keys(nextCart).forEach(b => {
        if (nextCart[b].inCart) {
          nextCart[b] = { ...nextCart[b], inCart: false, qty: 0, mf: 0 };
        }
      });
      newItems.forEach(item => {
        const existing = nextCart[item.barkod];
        nextCart[item.barkod] = {
          qty: item.qty,
          mf: item.mf,
          inCart: true,
          ad: item.ad || existing?.ad || 'Bilinmeyen Ürün',
          depo: item.depo || existing?.depo || 'Depo Belirsiz'
        };
      });
      return nextCart;
    });
  };

  const getFilteredGroups = (type: 'ilac' | 'disi') => {
    if (!data?.gruplar) return [];
    const q = searchQuery.toLowerCase();
    return data.gruplar
      .map((g: any) => {
        const filteredDetaylar = g.detaylar.filter((urun: any) => {
          if (ignoredBarkods.has(urun.v1)) return false;
          const matchSearch = q === "" || (urun.v2 || "").toLowerCase().includes(q) || (urun.v1 || "").toLowerCase().includes(q);
          if (q !== "" && !matchSearch) return false;
          const itemCart = cart[urun.v1] || { qty: 0 };
          if (showOnlyOrders && itemCart.qty === 0) return false;
          if (selectedMainCats.length > 0) {
            const kid = (urun.kategori_id || 0) as number;
            if (!selectedMainCats.some(anaId => isInAnaKategori(kid, anaId))) return false;
          }
          if (selectedAltCats.length > 0) {
            if (!selectedAltCats.includes((urun.kategori_id || 0) as number)) return false;
          }
          // Dışlanan alt kategoriler
          if (excludedAltCats.length > 0) {
            if (excludedAltCats.includes((urun.kategori_id || 0) as number)) return false;
          }
          const uColor = (urun.v82 || "").toUpperCase();
          if (selectedColors.length > 0 && !selectedColors.includes(uColor)) return false;
          return true;
        });
        return { ...g, detaylar: filteredDetaylar, original_count: g.detaylar.length };
      })
      .filter((g: any) => {
        if (g.detaylar.length === 0) return false;
        const isPharmaceutical = isPharmaceuticalCategory(g.kategori_id || 0);
        if (type === 'ilac' && !isPharmaceutical) return false;
        if (type === 'disi' && isPharmaceutical) return false;

        // Kritik filtreleme logic
        if (isKritik) {
          if (!(g.tags || "").includes('ks') && (g.kritik_puan || 0) <= 10) return false;
        } else {
          // Normal öneri görünümü (aktif tab oneri ise)
          if (activeTab === 'oneri' && g.toplam_oneri <= 0 && (g.kritik_puan || 0) < 50) return false;
        }
        if (showOnlyEsdesiz && (g.original_count ?? g.detaylar.length) > 1) return false;
        return true;
      })
      .sort((a: any, b: any) => {
        if (cockpitSortField) {
          let valA, valB;
          if (cockpitSortField === 'ad') {
            valA = a.lider_adi || '';
            valB = b.lider_adi || '';
          } else if (cockpitSortField === 'hiz') {
            valA = a.detaylar.reduce((acc: number, u: any) => acc + (u.v20 || 0), 0) * 30;
            valB = b.detaylar.reduce((acc: number, u: any) => acc + (u.v20 || 0), 0) * 30;
          } else if (cockpitSortField === 'stok') {
            valA = a.detaylar.reduce((acc: number, u: any) => acc + (u.v4 || 0), 0);
            valB = b.detaylar.reduce((acc: number, u: any) => acc + (u.v4 || 0), 0);
          } else if (cockpitSortField === 'iht') {
            valA = a.detaylar.reduce((acc: number, u: any) => acc + Math.round(Math.max(0, (u.v20 || 0) * 30 - (u.v4 || 0))), 0);
            valB = b.detaylar.reduce((acc: number, u: any) => acc + Math.round(Math.max(0, (u.v20 || 0) * 30 - (u.v4 || 0))), 0);
          } else if (cockpitSortField === 'oneri') {
            valA = a.toplam_oneri || 0;
            valB = b.toplam_oneri || 0;
          }

          if (valA === undefined || valA === null) valA = 0;
          if (valB === undefined || valB === null) valB = 0;

          if (typeof valA === 'string') {
            return cockpitSortOrder === 'asc' 
              ? valA.localeCompare(valB, 'tr') 
              : valB.localeCompare(valA, 'tr');
          }
          return cockpitSortOrder === 'asc' ? valA - valB : valB - valA;
        }

        if (activeTab === 'ks') return (b.kritik_puan || 0) - (a.kritik_puan || 0);
        return (b.toplam_oneri || 0) - (a.toplam_oneri || 0);
      });
  };

  const filteredIlacGroups = useMemo(() => getFilteredGroups('ilac'), [data, searchQuery, ignoredBarkods, showOnlyOrders, showOnlyEsdesiz, selectedMainCats, selectedAltCats, excludedAltCats, selectedColors, activeTab, cart, cockpitSortField, cockpitSortOrder]);
  const filteredDisiGroups = useMemo(() => getFilteredGroups('disi'), [data, searchQuery, ignoredBarkods, showOnlyOrders, showOnlyEsdesiz, selectedMainCats, selectedAltCats, excludedAltCats, selectedColors, activeTab, cart, cockpitSortField, cockpitSortOrder]);

  const cartSummary = useMemo(() => {
    const vals = Object.values(cart).filter(c => c.inCart && c.qty > 0);
    return { items: vals.length, kutu: vals.reduce((a, c) => a + (c.qty || 0), 0), mf: vals.reduce((a, c) => a + (c.mf || 0), 0) };
  }, [cart]);

  const isMainView = activeTab === 'oneri';

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-stone-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-14 w-14 rounded-2xl border-2 border-stone-200 bg-white flex items-center justify-center shadow-sm">
            <span className="text-2xl font-black text-stone-800 tracking-tighter">N</span>
          </div>
          <div className="absolute -inset-1 rounded-2xl border-2 border-teal-400 border-t-transparent animate-spin opacity-60"></div>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-stone-700">Nexus Pro</p>
          <p className="text-xs text-stone-400 font-medium mt-0.5">Veriler hazırlanıyor...</p>
        </div>
      </div>
    </div>
  );

  if (data?.isWailsSetupRequired) {
    return <WailsSetupView onSetupComplete={(newData: any) => { setData(newData); }} />;
  }

  if (data?.isWailsSyncRequired) {
    return <WailsSyncView settings={data} onSyncComplete={(newData: any) => { setData(newData); }} />;
  }

  // Depolar sekmesi sidebar'ı gizler ve tam ekran açılır
  const isDepolarTab = activeTab === 'depolar';

  if (isDepolarTab) {
    return (
      <div className={cn("flex h-screen bg-stone-50 text-stone-900 font-sans overflow-hidden", isWails && "wails-compact")}>
        {/* Depolar tam ekran — sidebar yok */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Mini üst bar */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-stone-100 shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 bg-stone-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-xs tracking-tighter">N</span>
              </div>
              <span className="font-black text-stone-900 text-sm tracking-tight">Nexus</span>
              <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-md">PRO</span>
            </div>
            <div className="w-px h-4 bg-stone-200" />
            <div className="flex items-center gap-1.5 text-blue-600">
              <Truck size={14} />
              <span className="text-[12px] font-black">Depolar</span>
            </div>
            <div className="flex-1" />
            <button
              onClick={() => setActiveTab('oneri')}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-500 hover:text-stone-800 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
            >
              <Menu size={13} />
              Ana Menü
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <Depolar cart={cart} gln={data?.gln || 'local'} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-screen bg-stone-50 text-stone-900 font-sans relative", isWails && "wails-compact")}>

      {/* REFRESH OVERLAY */}
      <AnimatePresence>
        {isRefreshing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl p-12 flex flex-col items-center gap-6 max-w-sm text-center">
              <div className="relative">
                <div className="h-16 w-16 rounded-2xl bg-stone-900 flex items-center justify-center text-white">
                  <Brain size={28} />
                </div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-teal-400 border-t-transparent animate-spin"></div>
              </div>
              <div>
                <h2 className="text-lg font-black text-stone-900">{syncStatusMsg || "Nexus AI Analiz Ediyor"}</h2>
                <p className="text-sm text-stone-500 mt-1 font-medium">Lütfen bekleyin, işlemler yürütülüyor...</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBİL OVERLAY */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-stone-900/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* SOL PANEL */}
      <motion.aside 
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.05}
        onDragEnd={(e, info) => { if (info.offset.x < -50) setSidebarOpen(false); }}
        className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-white border-r border-stone-100 flex flex-col transition-all duration-300",
        "lg:translate-x-0",
        sidebarCollapsed ? "w-20 sidebar-collapsed" : "w-72",
        sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* LOGO */}
        <div className="px-5 py-5 border-b border-stone-100 shrink-0">
          <div className="flex items-center justify-between logo-container">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 bg-stone-900 rounded-xl flex items-center justify-center shrink-0">
                <span className="text-white font-black text-sm tracking-tighter">N</span>
              </div>
              <div className="leading-none logo-text">
                <span className="font-black text-stone-900 text-base tracking-tight">Nexus</span>
                <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-md ml-1.5">PRO</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 logo-text">
              <button onClick={handleRefresh} disabled={isRefreshing} title="Yenile"
                className={cn("p-1.5 rounded-lg transition-all", isRefreshing ? "text-teal-600 bg-teal-50" : "text-stone-300 hover:text-stone-600 hover:bg-stone-50")}>
                <RefreshCw size={15} className={cn(isRefreshing && "animate-spin")} />
              </button>
            </div>
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg text-stone-300 hover:text-stone-600 hover:bg-stone-50 transition-all hidden lg:block"
              title={sidebarCollapsed ? "Genişlet" : "Daralt"}>
              {sidebarCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              )}
            </button>
          </div>
        </div>

        {/* NAV */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">

          {/* SİPARİŞ & STOK */}
          <NavSection label="Sipariş & Stok" open={menuStates.stok} onToggle={() => toggleMenu('stok')}>
            <SideNavItem id="oneri" icon={Sparkles} label="Sipariş Önerisi" activeTab={activeTab} onClick={(id: string) => { setActiveTab(id); setSidebarOpen(false); setIsKritik(false); }} accent="teal" badge="AI" />
            {/* Kritik Stoklar buradan kaldırıldı */}
            <SideNavItem id="sepet" icon={ShoppingCart} label="Sipariş Sepeti" activeTab={activeTab} onClick={(id: string) => { setActiveTab(id); setSidebarOpen(false); }} accent="emerald"
              badge={cartSummary.items > 0 ? String(cartSummary.items) : undefined} />
            <SideNavItem id="depolar" icon={Truck} label="Depolar" activeTab={activeTab} onClick={(id: string) => { setActiveTab(id); setSidebarOpen(false); }} accent="blue" />
            <NavDivider label="Takip" />
            <SideNavItem id="yok_listesi" icon={ListX} label="Yok Listem" activeTab={activeTab} onClick={(id: string) => { setActiveTab(id); setSidebarOpen(false); }} accent="red" />
            {/* <SideNavItemDisabled icon={Star} label="PSF'si Hatalı" /> */}
            <SideNavItem id="mr" icon={AlertTriangle} label="Miad Riski" activeTab={activeTab} onClick={(id: string) => { setActiveTab(id); setSidebarOpen(false); }} accent="amber" />
            <SideNavItem id="st" icon={PackageX} label="Stoğu Tükenmiş" activeTab={activeTab} onClick={(id: string) => { setActiveTab(id); setSidebarOpen(false); }} accent="rose" />
            <SideNavItem id="os" icon={Moon} label="Ölü Stoklar" activeTab={activeTab} onClick={(id: string) => { setActiveTab(id); setSidebarOpen(false); }} accent="slate" />
          </NavSection>

          {/* GÜNLÜK OPERASYON */}
          <NavSection label="Günlük Operasyon" open={menuStates.operasyon} onToggle={() => toggleMenu('operasyon')}>
            <SideNavItem id="nb" icon={Calendar} label="Nöbet Hazırlık" activeTab={activeTab} onClick={(id: string) => { setActiveTab(id); setSidebarOpen(false); }} accent="violet" />
            <SideNavItem id="para" icon={DollarSign} label="Nakit Fırsatı" activeTab={activeTab} onClick={(id: string) => { setActiveTab(id); setSidebarOpen(false); }} accent="emerald" />
            <SideNavItem id="sayim" icon={ClipboardList} label="Sayım Planı" activeTab={activeTab} onClick={(id: string) => { setActiveTab(id); setSidebarOpen(false); }} accent="blue" />
            <SideNavItem id="gorev" icon={ClipboardList} label="Görev Panosu" activeTab={activeTab} onClick={(id: string) => { setActiveTab(id); setSidebarOpen(false); }} accent="orange" />
          </NavSection>

          {/* AĞ & İŞBİRLİĞİ */}
          {/*
          <NavSection label="Ağ & İşbirliği" open={menuStates.ag} onToggle={() => toggleMenu('ag')}>
            <SideNavItem id="kardes" icon={Building2} label="Kardeş Eczane" activeTab={activeTab} onClick={(id: string) => { setActiveTab(id); setSidebarOpen(false); }} accent="teal" />

            <SideNavItemDisabled icon={Users} label="Grup Eczane" badge="Yakında" />
          </NavSection>
          */}

          {/* ANALİTİK */}
          <NavSection label="Analitik & Raporlar" open={menuStates.analitik} onToggle={() => toggleMenu('analitik')}>
            <SideNavItem id="tahmin" icon={TrendingUp} label="Tahminler & AI" activeTab={activeTab} onClick={(id: string) => { setActiveTab(id); setSidebarOpen(false); }} accent="blue" />
            <SideNavItem id="rapor" icon={BarChart2} label="Grafikler & Raporlar" activeTab={activeTab} onClick={(id: string) => { setActiveTab(id); setSidebarOpen(false); }} accent="indigo" />
          </NavSection>

          {/* ARAÇLAR */}
          <NavSection label="Araçlar" open={menuStates.araclar} onToggle={() => toggleMenu('araclar')}>
            <SideNavItemDisabled icon={Wrench} label="İçerik yakında..." />
          </NavSection>

        </nav>

        {/* ALT SABİT BÖLÜM */}
        <div className="shrink-0 border-t border-stone-100">
          {sidebarCollapsed && (
            <div className="px-3 py-2 flex justify-center">
              <button onClick={handleRefresh} disabled={isRefreshing} title="Yenile"
                className={cn("p-2 rounded-xl transition-all border border-stone-100 shadow-sm", isRefreshing ? "text-teal-600 bg-teal-50" : "text-stone-500 hover:text-stone-700 bg-white")}>
                <RefreshCw size={16} className={cn(isRefreshing && "animate-spin")} />
              </button>
            </div>
          )}
          {/* Hesap & Ayarlar */}
          <div className="px-3 py-2">
            <SideNavItem id="ayarlar" icon={Settings} label="Ayarlar" activeTab={activeTab} onClick={(id: string) => { setActiveTab(id); setSidebarOpen(false); }} accent="slate" />
          </div>
          {/* Çıkış */}
          {!isWails && (
            <div className="px-3 pb-3">
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push('/register');
                }}
                className="flex w-full items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-semibold text-red-500 hover:bg-red-50 hover:text-red-700 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span className="flex-1 text-left">Çıkış Yap</span>
              </button>
            </div>
          )}
        </div>
      </motion.aside>

      {/* ANA İÇERİK */}
      <main className={cn("flex-1 min-h-screen transition-all duration-300", sidebarCollapsed ? "lg:ml-20 main-expanded" : "lg:ml-72")}>

        {/* TOP BAR — mobile */}
        <div className="lg:hidden sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-stone-100 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-600">
            <BarChart2 size={18} />
          </button>
          <span className="font-black text-stone-900 tracking-tight">Nexus Pro</span>
          <div className="flex items-center gap-1.5">
            {cartSummary.items > 0 && (
              <button onClick={() => setActiveTab('sepet')} className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 text-teal-700 px-2.5 py-1.5 rounded-xl text-[11px] font-bold">
                <ShoppingCart size={13} /> {cartSummary.items}
              </button>
            )}
          </div>
        </div>

        <div className="p-3 md:p-6 lg:p-8 pb-32 lg:pb-8">
          <AnimatePresence mode="wait">
            {isMainView ? (
              <motion.div key="main" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-7xl mx-auto space-y-3 md:space-y-5">

                {/* SAYAÇ BANTLARI — mobilde 2, masaüstünde 4 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                  <StatPill label="Sipariş Sepeti" value={cartSummary.kutu} sub={`${cartSummary.items} kalem`} color="teal" icon={ShoppingCart} />
                  <StatPill
                    label={isKritik ? "Kritik Stok" : "AI Önerisi"}
                    value={mainCategory === 'ilac' ? filteredIlacGroups.length : filteredDisiGroups.length}
                    sub={isKritik ? "acil tedarik" : "sipariş fırsatı"}
                    color={isKritik ? "red" : "violet"}
                    icon={isKritik ? Zap : Sparkles}
                    onClick={() => setIsKritik(!isKritik)} // Tıklayınca modu değiştirir
                  />
                  <StatPill label="Hareketsiz Stok" value={data?.olu_stok_listesi?.length || 0} sub="ölü stok" color="slate" icon={Moon} onClick={() => setActiveTab('os')} />
                  <StatPill label="Miad Riski" value={data?.miad_risk_listesi?.length || 0} sub="son 6 ay" color="amber" icon={AlertTriangle} onClick={() => setActiveTab('mr')} />
                </div>

                {/* TEK PANEL */}
                <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm">

                  {/* Panel header — Satır 1: toggle + kritik + arama */}
                  <div className="px-3 md:px-5 py-3 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      {/* İlaç / İlaç Dışı Toggle */}
                      <div className="flex items-center rounded-xl overflow-hidden border border-stone-200 shrink-0">
                        <button onClick={() => setMainCategory('ilac')}
                          className={cn("h-9 px-3 md:px-4 text-[12px] font-bold transition-all", mainCategory === 'ilac' ? "bg-stone-900 text-white" : "bg-white text-stone-500")}>İlaç</button>
                        <button onClick={() => setMainCategory('disi')}
                          className={cn("h-9 px-3 md:px-4 text-[12px] font-bold transition-all", mainCategory === 'disi' ? "bg-stone-900 text-white" : "bg-white text-stone-500")}>İlaç Dışı</button>
                      </div>

                      {/* Kritik Modu Butonu (Yeni) */}
                      <button onClick={() => setIsKritik(!isKritik)}
                        className={cn("h-10 md:h-9 px-4 md:px-3 rounded-xl border font-bold text-[11px] transition-all flex items-center gap-1.5 shrink-0",
                          isKritik ? "bg-red-600 border-red-600 text-white shadow-sm shadow-red-200" : "bg-white border-stone-200 text-stone-500 hover:border-red-200 hover:text-red-600")}>
                        <Zap size={14} className={isKritik ? "fill-white" : ""} />
                        <span>Kritik</span>
                      </button>

                      {/* Arama (flex-1 sayesinde kalan alanı kaplar) */}
                      <div className="relative flex-1 min-w-0 max-w-md ml-auto">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-stone-400" />
                        <input type="text" placeholder="Ürün ara..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                          className="w-full pl-7 pr-3 h-9 text-[11px] bg-stone-50 border border-stone-200 rounded-lg outline-none focus:bg-white transition-all" />
                      </div>

                      {/* Sepet — mobilde sağ köşe */}
                      {cartSummary.items > 0 && (
                        <button onClick={() => setActiveTab('sepet')}
                          className="flex items-center gap-1.5 h-9 px-3 bg-teal-50 border border-teal-200 text-teal-700 text-[11px] font-semibold rounded-lg hover:bg-teal-100 transition-all shrink-0">
                          <ShoppingCart size={12} />
                          <span className="hidden md:inline">{cartSummary.items} kalem · {cartSummary.kutu} kutu</span>
                          <span className="md:hidden">{cartSummary.items}</span>
                        </button>
                      )}
                    </div>

                    {/* Satır 2: filtreler — mobilde scroll edilebilir yatay */}
                    <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-0.5 scrollbar-hide">
                      <button onClick={() => setShowFilterPanel((v: boolean) => !v)}
                        className={cn("h-8 px-2.5 text-[11px] font-semibold rounded-lg border transition-all flex items-center gap-1.5 shrink-0",
                          (selectedMainCats.length > 0 || selectedAltCats.length > 0 || excludedAltCats.length > 0)
                            ? "bg-stone-900 text-white border-stone-900"
                            : "bg-white text-stone-600 border-stone-200 hover:border-stone-300")}>
                        <Layers size={11} />
                        <span className="whitespace-nowrap">Kategori</span>
                        {(selectedMainCats.length > 0 || selectedAltCats.length > 0 || excludedAltCats.length > 0) && (
                          <span className="bg-white/20 text-white text-[9px] px-1 rounded-full">
                            {selectedMainCats.length + selectedAltCats.length + excludedAltCats.length}
                          </span>
                        )}
                      </button>

                      <button onClick={() => setShowOnlyEsdesiz(!showOnlyEsdesiz)}
                        className={cn("h-8 px-2.5 text-[11px] font-semibold rounded-lg border transition-all flex items-center gap-1.5 shrink-0",
                          showOnlyEsdesiz ? "bg-violet-600 text-white border-violet-600" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300")}>
                        {showOnlyEsdesiz && <Check size={10} />}
                        <span className="whitespace-nowrap">Eşdeğersiz</span>
                      </button>

                      <button onClick={() => setShowOnlyOrders(!showOnlyOrders)}
                        className={cn("h-8 px-2.5 text-[11px] font-semibold rounded-lg border transition-all flex items-center gap-1.5 shrink-0",
                          showOnlyOrders ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-300")}>
                        {showOnlyOrders ? <Check size={10} /> : <EyeOff size={10} />}
                        <span className="whitespace-nowrap">Sıfırları Gizle</span>
                      </button>

                      <div className="w-px h-5 bg-stone-200 shrink-0" />

                      <button onClick={handleSelectAllVisible}
                        className="h-8 px-2.5 text-[11px] font-semibold rounded-lg border border-stone-200 bg-white text-stone-600 hover:border-stone-300 transition-all flex items-center gap-1.5 shrink-0">
                        <Check size={10} /><span className="whitespace-nowrap">Tümünü Seç</span>
                      </button>

                      {selectedBarkods.size > 0 && (
                        <>
                          <button onClick={handleBulkAddToCart}
                            className="h-8 px-2.5 text-[11px] font-semibold rounded-lg bg-teal-600 text-white border border-teal-600 hover:bg-teal-700 transition-all flex items-center gap-1.5 shrink-0">
                            <ShoppingCart size={10} />
                            <span className="whitespace-nowrap">Ekle ({selectedBarkods.size})</span>
                          </button>
                          <button onClick={handleClearSelection}
                            className="h-8 px-2.5 text-[11px] font-semibold rounded-lg border border-stone-200 text-red-500 hover:bg-red-50 transition-all flex items-center gap-1.5 shrink-0">
                            <X size={10} /><span className="whitespace-nowrap">Temizle</span>
                          </button>
                        </>
                      )}
                    </div>

                    {/* Kategori filtre paneli */}
                    {showFilterPanel && (
                      <div className="mt-3 pt-3 border-t border-stone-100">
                        <KategoriFiltreBar
                          selectedMainCats={selectedMainCats} setSelectedMainCats={setSelectedMainCats}
                          selectedAltCats={selectedAltCats} setSelectedAltCats={setSelectedAltCats}
                          excludedAltCats={excludedAltCats} setExcludedAltCats={setExcludedAltCats} />
                      </div>
                    )}
                  </div>

                  {/* İÇERİK — mobilde kart listesi, masaüstünde tablo */}
                  {(() => {
                    const list = mainCategory === 'ilac' ? filteredIlacGroups : filteredDisiGroups;
                    if (list.length === 0) return <div className="p-8"><EmptyState /></div>;
                    return (
                      <>
                        {/* MOBİL: kart listesi */}
                        <div className="sm:hidden divide-y divide-stone-100">
                          {list.slice(0, visibleGroupsCount).map((g: any, gi: number) => (
                            <MobileGroupCard key={gi} grup={g} cart={cart} updateCart={updateCart}
                              toggleCartItem={toggleCartItem} copyFn={copyToClipboard} copiedId={copiedBarkod}
                              openAnalysis={setSelectedAnalysis} selectedBarkods={selectedBarkods}
                              setSelectedBarkods={setSelectedBarkods} onGrupDetail={setSelectedGrup} />
                          ))}
                        </div>

                        {/* MASAÜSTÜ: tablo */}

                        <div className="hidden sm:block overflow-x-auto">
                          <table className="border-collapse text-xs w-full" style={{ tableLayout: 'fixed' }}>
                            <colgroup>
                              <col style={{ width: '45px' }} /> {/* Checkbox ve Çizgi Kolonu */}
                              <col /> {/* Ürün Bilgisi */}
                              <col style={{ width: '220px' }} /> {/* Tahmini Satış */}
                              <col style={{ width: '56px' }} />
                              <col style={{ width: '56px' }} />
                              <col style={{ width: '68px' }} />
                              <col style={{ width: '36px' }} />
                            </colgroup>
                            <thead className="sticky top-0 z-10 bg-white border-b border-stone-100">
                              <tr>
                                <th className="py-4"></th>
                                <th className="py-4 px-3 text-left font-semibold text-stone-400 text-[10px] uppercase tracking-widest">Ürün Bilgisi</th>
                                <th className="py-4 font-semibold text-stone-400 text-[10px] uppercase tracking-widest text-center">Tahmini Satış</th>
                                <th className="py-4 font-semibold text-stone-400 text-[10px] uppercase tracking-widest text-center">Hız/ay</th>
                                <th className="py-4 font-semibold text-stone-400 text-[10px] uppercase tracking-widest text-center">Stok</th>
                                <th className="py-4 font-semibold text-stone-400 text-[10px] uppercase tracking-widest text-center">İHT</th>
                                <th className="py-4"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {list.slice(0, visibleGroupsCount).map((g: any, gi: number) => (
                                <TableGroupRow
                                  key={gi}
                                  grup={g}
                                  cart={cart}
                                  updateCart={updateCart}
                                  toggleCartItem={toggleCartItem}
                                  copyFn={copyToClipboard}
                                  copiedId={copiedBarkod}
                                  openAnalysis={setSelectedAnalysis}
                                  activeMenu={activeMenu}
                                  setActiveMenu={setActiveMenu}
                                  onIgnore={handleIgnore}
                                  selectedBarkods={selectedBarkods}
                                  setSelectedBarkods={setSelectedBarkods}
                                  onGrupDetail={setSelectedGrup}
                                  mainCategory={mainCategory} // Yeni: kategori bilgisi gönderiliyor
                                />
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Devamını yükle */}
                        {visibleGroupsCount < list.length && (
                          <button onClick={() => setVisibleGroupsCount(prev => prev + 30)}
                            className="w-full py-4 bg-white hover:bg-stone-50 border-t border-stone-100 text-stone-400 hover:text-teal-600 font-semibold transition-all text-[11px] flex items-center justify-center gap-2">
                            <span className="w-5 h-px bg-stone-200" />
                            {list.length - visibleGroupsCount} grup daha yükle
                            <span className="w-5 h-px bg-stone-200" />
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </motion.div>
            ) : (
              <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="max-w-7xl mx-auto">
                {activeTab === 'rapor' && <GeneralReports data={data} />}
                {activeTab === 'tahmin' && <PredictionsReport data={data} />}
                {activeTab === 'yok_listesi' && <YokListesi data={data} gln={data?.gln || 'local'} />}
                {activeTab === 'sepet' && <SepetPage cart={cart} syncStatus={cartSyncStatus} persistItems={updateCartFromSepet} setActiveTab={setActiveTab} />}
                {/* {activeTab === 'depolar' && <Depolar cart={cart} gln={data?.gln || 'local'} />} */}
                {activeTab === 'gorev' && <TaskBoard gln={data?.gln || 'local'} />}
                {activeTab === 'sayim' && <InventoryBoard data={data?.sayim_plani || []} gln={data?.gln || 'local'} />}
                {activeTab === 'os' && <DeadStockReport data={data?.olu_stok_listesi || []} />}
                {activeTab === 'mr' && <ExpiryReport data={data?.miad_risk_listesi || []} />}
                {activeTab === 'st' && <OutOfStockReport data={data?.stok_sifir_listesi || []} />}
                {activeTab === 'ayarlar' && <AyarlarPage supabase={supabase} />}
                {/* {activeTab === 'kardes' && <KardesEczanePage />} */}
                {['nb', 'para'].includes(activeTab) && (
                  <DataTable data={activeTab === 'nb' ? (data?.nobet_listesi || []) : (data?.nakit_optimizasyon || [])} type={activeTab} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* MOBİL BOTTOM NAV */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 z-30 pb-safe">
        {/* İlaç / İlaç Dışı toggle — sadece main view'de */}
        {isMainView && (
          <div className="flex border-b border-stone-100">
            <button onClick={() => setMainCategory('ilac')}
              className={cn("flex-1 py-2 text-[11px] font-semibold transition-all",
                mainCategory === 'ilac' ? "text-stone-900 border-b-2 border-stone-900" : "text-stone-400")}>
              İlaç <span className="text-[10px] ml-1 opacity-60">{filteredIlacGroups.length}</span>
            </button>
            <button onClick={() => setMainCategory('disi')}
              className={cn("flex-1 py-2 text-[11px] font-semibold transition-all",
                mainCategory === 'disi' ? "text-stone-900 border-b-2 border-stone-900" : "text-stone-400")}>
              İlaç Dışı <span className="text-[10px] ml-1 opacity-60">{filteredDisiGroups.length}</span>
            </button>
          </div>
        )}
        <div className="flex items-center h-16 px-2">
          {[
            { id: 'oneri', icon: Sparkles, label: 'Öneri' },
            { id: 'sepet', icon: ShoppingCart, label: 'Sepet' },
            { id: 'rapor', icon: BarChart2, label: 'Analiz' },
          ].map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 h-full rounded-2xl transition-all relative mx-0.5",
                activeTab === id ? "text-teal-700 bg-teal-50" : "text-stone-400 hover:text-stone-600"
              )}>
              <Icon size={activeTab === id ? 18 : 22} />
              {activeTab === id && <span className="text-[11px] font-bold tracking-tight">{label}</span>}
            </button>
          ))}
          <button
            onClick={() => setSidebarOpen(true)}
            className={cn(
              "flex items-center justify-center h-full aspect-square rounded-2xl transition-all mx-0.5",
              sidebarOpen ? "text-stone-900 bg-stone-100" : "text-stone-400 hover:text-stone-600"
            )}>
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* TÜMÜNÜ GÖSTER MODALI */}
      <AnimatePresence>
        {expandedCategory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-stone-950/50 backdrop-blur-sm p-0 md:p-5"
            onClick={() => setExpandedCategory(null)}>
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 340 }}
              onClick={(e: any) => e.stopPropagation()}
              className="bg-white rounded-t-[1.75rem] md:rounded-2xl w-full md:max-w-7xl h-[93vh] md:h-[90vh] overflow-hidden flex flex-col"
              style={{ boxShadow: '0 32px 80px -12px rgba(0,0,0,0.22), 0 0 0 0.5px rgba(0,0,0,0.06)' }}>

              {/* MODAL HEADER */}
              <div className="bg-white border-b border-stone-100 px-5 pt-4 pb-3 shrink-0">

                {/* Üst satır: başlık + kontroller */}
                <div className="flex items-center gap-2.5 flex-wrap">

                  {/* Başlık */}
                  <div className="flex items-center gap-2.5 shrink-0 mr-1">
                    <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center text-white shrink-0 text-[10px] font-black",
                      expandedCategory === 'ilac' ? "bg-violet-600" : "bg-teal-600")}>
                      {expandedCategory === 'ilac' ? 'İL' : 'OTC'}
                    </div>
                    <div>
                      <h2 className="font-bold text-stone-900 text-[13px] leading-none">
                        {expandedCategory === 'ilac' ? 'İlaç Analiz Paneli' : 'İlaç Dışı & OTC Ürünleri'}
                      </h2>
                      <span className="text-[10px] text-stone-400 font-medium">
                        {(expandedCategory === 'ilac' ? filteredIlacGroups : filteredDisiGroups).length} ürün grubu
                      </span>
                    </div>
                  </div>

                  {/* Dikey ayraç */}
                  <div className="h-6 w-px bg-stone-200 shrink-0 hidden md:block" />

                  {/* Tab'lar — kategori */}
                  <div className="flex items-center p-0.5 bg-stone-100 rounded-lg shrink-0">
                    {(['ilac', 'disi'] as const).map((cat, i) => (
                      <button key={cat} onClick={() => setExpandedCategory(cat)}
                        className={cn("h-7 px-3.5 text-[11px] font-semibold rounded-md transition-all",
                          expandedCategory === cat
                            ? "bg-white text-stone-900 shadow-sm"
                            : "text-stone-500 hover:text-stone-700")}>
                        {i === 0 ? 'İlaç' : 'İlaç Dışı'}
                      </button>
                    ))}
                  </div>

                  {/* Arama */}
                  <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-stone-400 pointer-events-none" />
                    <input type="text" placeholder="Ürün adı veya barkod..."
                      value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-7 pr-3 h-8 text-[11px] font-medium bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-400/20 focus:border-teal-400 focus:bg-white outline-none transition-all placeholder:text-stone-300" />
                  </div>

                  {/* Filtre pill'leri */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => setShowOnlyEsdesiz(!showOnlyEsdesiz)}
                      className={cn("h-8 px-3 text-[11px] font-semibold rounded-lg border transition-all",
                        showOnlyEsdesiz
                          ? "bg-violet-600 text-white border-violet-600"
                          : "bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:text-stone-700")}>
                      {showOnlyEsdesiz && <Check size={10} className="inline mr-1" />}Eşdeğersiz
                    </button>
                    <button onClick={() => setShowOnlyOrders(!showOnlyOrders)}
                      className={cn("h-8 px-3 text-[11px] font-semibold rounded-lg border transition-all",
                        showOnlyOrders
                          ? "bg-stone-900 text-white border-stone-900"
                          : "bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:text-stone-700")}>
                      {showOnlyOrders && <Check size={10} className="inline mr-1" />}Sepettekiler
                    </button>
                  </div>

                  {/* Sağ aksiyon grubu */}
                  <div className="flex items-center gap-1.5 ml-auto shrink-0">
                    <button onClick={handleSelectAllVisible}
                      className="h-8 px-3 text-[11px] font-semibold rounded-lg border border-stone-200 bg-white text-stone-600 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50 transition-all flex items-center gap-1.5">
                      <Check size={11} />Tümünü Seç
                    </button>
                    <button onClick={handleDownloadExcel}
                      className="h-8 px-3 text-[11px] font-semibold rounded-lg border border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-800 transition-all flex items-center gap-1.5">
                      <Download size={11} />Excel
                    </button>
                    {selectedBarkods.size > 0 && (
                      <>
                        <button onClick={() => {
                          const list = expandedCategory === 'ilac' ? filteredIlacGroups : filteredDisiGroups;
                          const newCart = { ...cart };
                          list.forEach((g: any) => {
                            g.detaylar.forEach((u: any) => {
                              if (selectedBarkods.has(u.v1)) {
                                const qty = g.toplam_oneri > 0 ? g.toplam_oneri : (u.v26 > 0 ? u.v26 : 1);
                                newCart[u.v1] = { ...(newCart[u.v1] || { mf: 0, ad: u.v2, depo: u.v91 }), qty, inCart: true, ad: u.v2, depo: u.v91, mf: calculateAutoMF(qty, u.mf_baremleri) };
                              }
                            });
                          });
                          setCart(newCart);
                        }} className="h-8 px-3 text-[11px] font-semibold rounded-lg bg-teal-600 text-white border border-teal-600 hover:bg-teal-700 transition-all flex items-center gap-1.5">
                          <ShoppingCart size={11} />Sepete Ekle ({selectedBarkods.size})
                        </button>
                        <button onClick={handleClearSelection}
                          className="h-8 px-3 text-[11px] font-semibold rounded-lg border border-stone-200 text-red-500 hover:bg-red-50 hover:border-red-200 transition-all flex items-center gap-1.5">
                          <X size={11} />Seçimi Temizle
                        </button>
                      </>
                    )}
                    <div className="h-6 w-px bg-stone-200 mx-0.5" />
                    <button onClick={() => setExpandedCategory(null)}
                      className="h-8 w-8 flex items-center justify-center rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-700 transition-colors shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Alt satır: kategori filtresi */}
                <div className="mt-2.5 pt-2.5 border-t border-stone-100">
                  <KategoriFiltreBar selectedMainCats={selectedMainCats} setSelectedMainCats={setSelectedMainCats}
                    selectedAltCats={selectedAltCats} setSelectedAltCats={setSelectedAltCats}
                    excludedAltCats={excludedAltCats} setExcludedAltCats={setExcludedAltCats} />
                </div>
              </div>

              {/* MODAL CONTENT — tablo */}
              <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
                {(() => {
                  const list = expandedCategory === 'ilac' ? filteredIlacGroups : filteredDisiGroups;
                  if (list.length === 0) return (
                    <div className="p-8"><EmptyState /></div>
                  );
                  return (
                    <table className="border-collapse text-xs w-full" style={{ tableLayout: 'fixed' }}>
                      <colgroup>
                        <col style={{ width: '40px' }} />
                        <col />
                        <col style={{ width: '220px' }} />
                        <col style={{ width: '56px' }} />
                        <col style={{ width: '56px' }} />
                        <col style={{ width: '68px' }} />
                        <col style={{ width: '36px' }} />
                      </colgroup>
                      <thead className="sticky top-0 z-10 bg-white border-b border-stone-100">
                        <tr>
                          {(() => {
                            const getHeaderSortKey = (label: string) => {
                              if (label === 'Ürün Bilgisi') return 'ad';
                              if (label === 'Hız/ay') return 'hiz';
                              if (label === 'Stok') return 'stok';
                              if (label === 'İHT') return 'iht';
                              return null;
                            };
                            return [['', ''], ['Ürün Bilgisi', 'left'], ['Tahmini Satış', ''], ['Hız/ay', ''], ['Stok', ''], ['İHT', ''], ['', '']].map(([h, align], i) => {
                              const sortKey = getHeaderSortKey(h);
                              return (
                                <th 
                                  key={i} 
                                  onClick={() => sortKey && handleCockpitSort(sortKey)}
                                  className={cn(
                                    "py-4 font-semibold text-stone-400 text-[10px] uppercase tracking-widest select-none",
                                    h && "px-3",
                                    sortKey && "cursor-pointer hover:text-stone-600",
                                    align === 'left' ? "text-left" : "text-center"
                                  )}
                                >
                                  {h}
                                  {sortKey && cockpitSortField === sortKey ? (cockpitSortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                                </th>
                              );
                            });
                          })()}
                        </tr>
                      </thead>
                      <tbody>
                        {list.slice(0, visibleGroupsCount).map((g: any, gi: number) => (
                          <TableGroupRow key={gi} grup={g} cart={cart} updateCart={updateCart}
                            toggleCartItem={toggleCartItem} copyFn={copyToClipboard} copiedId={copiedBarkod}
                            openAnalysis={setSelectedAnalysis} activeMenu={activeMenu} setActiveMenu={setActiveMenu}
                            onIgnore={handleIgnore} selectedBarkods={selectedBarkods} setSelectedBarkods={setSelectedBarkods}
                            onGrupDetail={setSelectedGrup} />
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
                {/* Devamını yükle */}
                {(() => {
                  const list = expandedCategory === 'ilac' ? filteredIlacGroups : filteredDisiGroups;
                  return visibleGroupsCount < list.length ? (
                    <button onClick={() => setVisibleGroupsCount(prev => prev + 30)}
                      className="w-full py-4 bg-white hover:bg-stone-50 border-t border-stone-100 text-stone-400 hover:text-teal-600 font-semibold transition-all text-[11px] flex items-center justify-center gap-2">
                      <span className="w-5 h-px bg-stone-200" />
                      {list.length - visibleGroupsCount} grup daha yükle
                      <span className="w-5 h-px bg-stone-200" />
                    </button>
                  ) : null;
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GRUP DETAY MODALI */}
      <AnimatePresence>
        {selectedGrup && (
          <GrupDetailModal
            grup={selectedGrup}
            rawGrup={data?.gruplar?.find((g: any) => g.lider_adi === selectedGrup.lider_adi)}
            onClose={() => setSelectedGrup(null)}
            getBreadcrumb={getBreadcrumb}
          />
        )}
      </AnimatePresence>

      {/* ANALİZ MODALI */}
      <AnimatePresence>
        {selectedAnalysis && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-stone-900/40 backdrop-blur-sm p-0 md:p-6"
            onClick={() => setSelectedAnalysis(null)}>
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
              onClick={(e: any) => e.stopPropagation()}
              className="bg-white rounded-t-[2rem] md:rounded-[2rem] shadow-2xl w-full md:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-6 py-5 border-b border-stone-100 flex justify-between items-start shrink-0">
                <div className="flex-1 pr-4">
                  <h3 className="font-black text-stone-900 text-lg leading-tight">{selectedAnalysis.v2}</h3>
                  <p className="text-xs font-mono text-stone-400 mt-1">Barkod: {selectedAnalysis.v1}</p>
                  {selectedAnalysis.kategori_id && (
                    <span className="text-xs font-medium text-teal-600 mt-1.5 bg-teal-50 inline-block px-2 py-0.5 rounded-lg">{getBreadcrumb(selectedAnalysis.kategori_id)}</span>
                  )}
                </div>
                <button onClick={() => setSelectedAnalysis(null)}
                  className="h-9 w-9 flex items-center justify-center rounded-xl bg-stone-100 hover:bg-red-50 hover:text-red-600 transition-colors text-stone-500 shrink-0">
                  <X size={16} />
                </button>
              </div>
              <div className="p-0 overflow-y-auto custom-scrollbar bg-white">
                {(() => {
                  const dailySpeed = selectedAnalysis.v20 || 0;
                  const stock = selectedAnalysis.v4 || 0;
                  const lifeDays = dailySpeed > 0 ? Math.floor(stock / dailySpeed) : 0;
                  const shelfLifeText = stock <= 0 ? 'Tükendi' : dailySpeed <= 0 ? 'Hareketsiz' : `${lifeDays} Gün`;
                  const shelfLifeColor = stock <= 0 ? 'text-red-500' : dailySpeed <= 0 ? 'text-stone-400' : lifeDays <= 15 ? 'text-red-500' : lifeDays > 180 ? 'text-amber-500' : 'text-teal-600';

                  return (
                    <table className="w-full text-left border-collapse text-sm">
                      <tbody className="divide-y divide-stone-100">

                        {/* KÜNYEe */}
                        <tr className="hover:bg-stone-50/50 transition-colors">
                          <th className="w-[25%] p-5 bg-stone-50/30 text-xs font-black text-stone-400 uppercase tracking-widest align-top border-r border-stone-100">
                            <div className="flex items-center gap-2"><Package size={14} className="text-blue-500" /> Künye</div>
                          </th>
                          <td className="p-5 align-top">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {[
                                { label: 'Mevcut Stok', val: stock, cls: stock <= 0 ? 'text-red-500' : 'text-stone-800' },
                                { label: 'Aylık Hız', val: (dailySpeed * 30).toFixed(1), cls: 'text-stone-800' },
                                { label: 'Stok Ömrü', val: shelfLifeText, cls: shelfLifeColor },
                                { label: 'Ana Depo', val: selectedAnalysis.v91 || '-', cls: 'text-stone-800 text-xs' },
                              ].map(k => (
                                <div key={k.label} className="bg-white p-3 rounded-xl border border-stone-100 shadow-sm">
                                  <p className="text-[10px] text-stone-400 font-bold uppercase mb-0.5">{k.label}</p>
                                  <p className={cn("text-lg font-black", k.cls)}>{k.val}</p>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>

                        {/* STRATEJİK TAVSİYE */}
                        {(selectedAnalysis.ek_tavsiye || selectedAnalysis.stratejik_tavsiye) && (
                          <tr className="hover:bg-stone-50/50 transition-colors">
                            <th className="w-[25%] p-5 bg-stone-50/30 text-xs font-black text-stone-400 uppercase tracking-widest align-top border-r border-stone-100">
                              <div className="flex items-center gap-2"><Sparkles size={14} className="text-teal-500" /> Strateji</div>
                            </th>
                            <td className="p-5 align-top">
                              {renderTavsiye(selectedAnalysis.ek_tavsiye || selectedAnalysis.stratejik_tavsiye)}
                            </td>
                          </tr>
                        )}

                        {/* GRUP ANALİZİ */}
                        {(selectedAnalysis.grup_analizi || selectedAnalysis.grup_yorumu) && (
                          <tr className="hover:bg-stone-50/50 transition-colors">
                            <th className="w-[25%] p-5 bg-stone-50/30 text-xs font-black text-stone-400 uppercase tracking-widest align-top border-r border-stone-100">
                              <div className="flex items-center gap-2"><Activity size={14} className="text-violet-500" /> Grup Analizi</div>
                            </th>
                            <td className="p-5 align-top">
                              <div className="bg-white border border-stone-100 rounded-xl p-4 shadow-sm">
                                {renderGrupAnalizi(selectedAnalysis.grup_analizi || selectedAnalysis.grup_yorumu)}
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* KARAR LOGLARI */}
                        {(selectedAnalysis.hesap_aciklamasi || selectedAnalysis.log_html) && (
                          <tr className="hover:bg-stone-50/50 transition-colors">
                            <th className="w-[25%] p-5 bg-stone-50/30 text-xs font-black text-stone-400 uppercase tracking-widest align-top border-r border-stone-100">
                              <div className="flex items-center gap-2"><Brain size={14} className="text-stone-400" /> Karar Logları</div>
                            </th>
                            <td className="p-5 align-top">
                              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 shadow-inner space-y-0.5">
                                {(selectedAnalysis.hesap_aciklamasi || selectedAnalysis.log_html || []).map((entry: any, i: number) =>
                                  renderLogItem(entry, i)
                                )}
                              </div>
                            </td>
                          </tr>
                        )}

                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// KÜÇÜK BİLEŞENLER
// ─────────────────────────────────────────────────────────

const accentMap: Record<string, { bg: string; text: string; border: string; light: string }> = {
  teal: { bg: 'bg-teal-600', text: 'text-teal-700', border: 'border-teal-200', light: 'bg-teal-50' },
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-700', border: 'border-emerald-200', light: 'bg-emerald-50' },
  violet: { bg: 'bg-violet-600', text: 'text-violet-700', border: 'border-violet-200', light: 'bg-violet-50' },
  red: { bg: 'bg-red-500', text: 'text-red-600', border: 'border-red-200', light: 'bg-red-50' },
  amber: { bg: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-200', light: 'bg-amber-50' },
  rose: { bg: 'bg-rose-500', text: 'text-rose-600', border: 'border-rose-200', light: 'bg-rose-50' },
  slate: { bg: 'bg-slate-500', text: 'text-slate-600', border: 'border-slate-200', light: 'bg-slate-50' },
  blue: { bg: 'bg-blue-600', text: 'text-blue-700', border: 'border-blue-200', light: 'bg-blue-50' },
  indigo: { bg: 'bg-indigo-600', text: 'text-indigo-700', border: 'border-indigo-200', light: 'bg-indigo-50' },
  orange: { bg: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-200', light: 'bg-orange-50' },
};

function SideNavItem({ id, icon: Icon, label, activeTab, onClick, accent = 'teal', badge }: any) {
  const isActive = activeTab === id;
  const a = accentMap[accent] || accentMap.teal;
  return (
    <button onClick={() => onClick(id)}
      className={cn("group flex w-full items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-all",
        isActive
          ? `text-stone-900 font-semibold border-l-3 border-l-${accent}-600 bg-stone-50`
          : "text-stone-600 font-medium hover:text-stone-900 hover:bg-stone-50")}>
      <Icon size={17} className={cn("shrink-0 font-bold", isActive ? `text-${accent}-600` : "text-stone-500")} />
      <span className="flex-1 text-left font-semibold">{label}</span>
      {badge && (
        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full",
          isActive ? `${a.bg} text-white` : "bg-stone-200 text-stone-700")}>
          {badge}
        </span>
      )}
    </button>
  );
}

function SideNavItemDisabled({ icon: Icon, label, badge }: any) {
  return (
    <div className="flex w-full items-center gap-2.5 px-2.5 py-2 rounded-xl opacity-40 cursor-not-allowed select-none">
      <Icon size={14} className="text-stone-300 shrink-0" />
      <span className="text-xs font-semibold text-stone-400 flex-1">{label}</span>
      <span className="text-[8px] font-black bg-amber-100 text-amber-500 px-1.5 py-0.5 rounded-full uppercase">
        {badge || "Yeni"}
      </span>
    </div>
  );
}

function NavSection({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="pb-2 pt-1">
      <button onClick={onToggle} className="flex w-full items-center justify-between px-2 py-1.5 group">
        <span className="text-[11px] font-semibold text-stone-600 uppercase tracking-tight group-hover:text-stone-900 transition-colors">
          {label}
        </span>
        <ChevronDown size={16} className={cn("text-stone-600 font-bold transition-transform duration-200", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden space-y-0.5"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-2 pt-2 pb-1">
      <div className="flex-1 h-px bg-stone-100" />
      <span className="text-[8px] font-black text-stone-300 uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-stone-100" />
    </div>
  );
}

function StatPill({ label, value, sub, color = 'teal', icon: Icon, onClick }: any) {
  const a = accentMap[color] || accentMap.teal;
  return (
    <div onClick={onClick}
      className={cn("bg-white border border-stone-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm transition-all",
        onClick && "cursor-pointer hover:shadow-md hover:border-stone-200")}>
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", a.light)}>
        <Icon size={18} className={a.text} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-stone-400 uppercase tracking-wide truncate">{label}</p>
        <p className="text-2xl font-black text-stone-900 leading-none mt-0.5">{value}</p>
        <p className="text-[10px] font-medium text-stone-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function ProductPanel({ title, subtitle, icon: Icon, color, groups, cart, updateCart, toggleCart, copyFn, copiedId, onExpand, badge }: any) {
  const a = accentMap[color] || accentMap.teal;
  return (
    <div className={cn("bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col", a.border)}>
      <div className={cn("px-5 py-4 flex items-center justify-between border-b", a.light)}>
        <div className="flex items-center gap-3">
          <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center text-white", a.bg)}>
            <Icon size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-stone-900 text-sm">{title}</h3>
              <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-full border", a.light, a.text, a.border)}>{badge}</span>
            </div>
            <p className="text-xs text-stone-400 font-medium">{subtitle}</p>
          </div>
        </div>
        <span className={cn("text-xs font-black px-2 py-1 rounded-xl border", a.light, a.text, a.border)}>{groups.length}</span>
      </div>

      <div className="flex-1 divide-y divide-stone-50">
        {groups.slice(0, 5).map((grup: any, i: number) => (
          <SimpleDashboardRow key={i} grup={grup} cart={cart} updateCart={updateCart} toggleCart={toggleCart} copyFn={copyFn} copiedId={copiedId} />
        ))}
        {groups.length === 0 && <EmptyState />}
      </div>

      <div className="p-3 bg-stone-50/60">
        <button onClick={onExpand}
          className="w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 border bg-white hover:border-stone-300 text-stone-600 hover:text-stone-900 border-stone-200">
          Tümünü Görüntüle ({groups.length}) <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function SimpleDashboardRow({ grup, cart, updateCart, toggleCart, copyFn, copiedId }: any) {
  const lider = grup.detaylar[0];
  const aylikHiz = lider.v20 * 30;
  const inCart = cart[lider.v1]?.inCart || false;

  const handleQuickAdd = () => {
    if (!inCart) {
      updateCart(lider.v1, grup.toplam_oneri > 0 ? grup.toplam_oneri : 1, undefined, lider);
      toggleCart(lider.v1, lider);
    } else {
      toggleCart(lider.v1, lider);
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition-colors group">
      <div className="flex-1 min-w-0 pr-3">
        <p className="font-bold text-xs text-stone-800 truncate">{lider.v2}</p>
        <div className="flex items-center gap-2 mt-1">
          <button onClick={() => copyFn(lider.v1)}
            className="font-mono text-[10px] text-stone-400 hover:text-teal-600 bg-stone-50 hover:bg-teal-50 px-1.5 py-0.5 rounded-md border border-stone-200 hover:border-teal-200 transition-all flex items-center gap-1">
            {copiedId === lider.v1 ? <><Check size={9} className="text-teal-500" /><span className="text-teal-600">Kopyalandı</span></> : <><Copy size={9} />{lider.v1}</>}
          </button>
          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md border",
            lider.v4 <= 0 ? "bg-red-50 text-red-600 border-red-100" : "bg-stone-50 text-stone-500 border-stone-200")}>
            Stok: {lider.v4}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-center bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200 text-xs">
          <p className="text-[8px] font-black text-stone-400 uppercase">Öneri</p>
          <p className="font-black text-stone-900">{grup.toplam_oneri}</p>
        </div>
        <button onClick={handleQuickAdd}
          className={cn("h-9 w-9 flex items-center justify-center rounded-xl border font-bold transition-all",
            inCart ? "bg-teal-600 text-white border-teal-600 shadow-sm" : "bg-white text-stone-400 border-stone-200 hover:border-teal-300 hover:text-teal-600")}>
          {inCart ? <Check size={15} /> : <ShoppingCart size={15} />}
        </button>
      </div>
    </div>
  );
}

function MobileGroupCard({ grup, cart, updateCart, toggleCartItem, copyFn, copiedId, openAnalysis, selectedBarkods, setSelectedBarkods, onGrupDetail }: any) {
  const [isOpen, setIsOpen] = useState(true);
  const originalCount = grup.original_count ?? grup.detaylar.length;
  const isSingle = originalCount === 1;
  const totalSpeed = grup.detaylar.reduce((acc: number, u: any) => acc + (u.v20 || 0), 0) * 30;
  const totalStock = grup.detaylar.reduce((acc: number, u: any) => acc + (u.v4 || 0), 0);
  const totalDailySpeed = grup.detaylar.reduce((acc: number, u: any) => acc + (u.v20 || 0), 0);
  const omurGun = totalDailySpeed > 0 && totalStock > 0 ? Math.round(totalStock / totalDailySpeed) : null;
  const grupBaslik = (grup.lider_adi || '').split(' ')[0] + ' GRUBU';

  return (
    <div className="bg-white">
      {/* Grup başlığı */}
      <div
        onClick={() => !isSingle && setIsOpen(!isOpen)}
        className={cn("flex items-center gap-2 px-4 py-2.5 bg-stone-50 border-b border-stone-100", !isSingle && "cursor-pointer active:bg-stone-100")}>
        <span className="text-[10px] font-bold text-stone-900 uppercase tracking-wide flex-1">{grupBaslik}</span>
        {!isSingle && (
          <button onClick={e => { e.stopPropagation(); onGrupDetail && onGrupDetail(grup); }}
            className="text-[9px] font-bold px-2 py-0.5 rounded border border-indigo-200 bg-indigo-50 text-indigo-600 shrink-0">
            Analiz
          </button>
        )}
        <span className="text-[10px] text-stone-400 shrink-0">{totalSpeed.toFixed(1)}/ay</span>
        <span className={cn("text-[10px] font-semibold shrink-0", totalStock <= 0 ? "text-red-500" : "text-stone-500")}>
          {totalStock <= 0 ? 'stok yok' : `stok ${totalStock}`}
        </span>
        {omurGun && omurGun < 30 && <span className="text-[10px] text-amber-500 font-semibold shrink-0">~{omurGun}g</span>}
        {!isSingle && <ChevronDown size={12} className={cn("text-stone-400 transition-transform shrink-0", isOpen && "rotate-180")} />}
        {isSingle && <span className="text-[9px] text-stone-300 italic shrink-0">eşdeğersiz</span>}
      </div>

      {/* Ürün kartları */}
      {(isSingle || isOpen) && grup.detaylar.map((urun: any, idx: number) => (
        <MobileProductCard key={idx} urun={urun}
          itemCart={cart[urun.v1] || { qty: 0, mf: 0, inCart: false }}
          updateCart={updateCart} toggleCartItem={toggleCartItem}
          copyFn={copyFn} copiedId={copiedId} openAnalysis={openAnalysis}
          selectedBarkods={selectedBarkods} setSelectedBarkods={setSelectedBarkods} />
      ))}
    </div>
  );
}

function MobileProductCard({ urun, itemCart, updateCart, toggleCartItem, copyFn, copiedId, openAnalysis, selectedBarkods, setSelectedBarkods }: any) {
  const [period, setPeriod] = useState<number | string>(30);
  const [opt, setOpt] = useState<string | null>(null);
  const [customNeed, setCustomNeed] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const { inCart } = itemCart;
  const isSel = selectedBarkods?.has(urun.v1);
  const spd = urun.v20 || 0;
  const stk = urun.v4 || 0;

  const periodDays = () => {
    if (period === 'month') {
      const t = new Date(), last = new Date(t.getFullYear(), t.getMonth() + 1, 0);
      return Math.ceil((last.getTime() - t.getTime()) / 86400000);
    }
    return period as number;
  };
  const need = customNeed !== null ? customNeed : Math.round(Math.max(0, spd * periodDays() - stk));
  const onr = Math.round(urun.v26 || 0) + Math.round(urun.v27 || 0);
  const changePeriod = (v: number | string) => { setPeriod(v); setCustomNeed(null); };

  const toggleSel = () => {
    setSelectedBarkods((p: Set<string>) => { const n = new Set(p); isSel ? n.delete(urun.v1) : n.add(urun.v1); return n; });
  };

  const addToCart = () => {
    if (!opt) { setOpt('suggestion'); updateCart(urun.v1, onr, undefined, urun); toggleCartItem(urun.v1, urun); return; }
    updateCart(urun.v1, opt === 'need' ? need : onr, undefined, urun);
    if (!inCart) toggleCartItem(urun.v1, urun);
  };

  return (
    <div className={cn("px-4 py-3.5 border-b border-stone-50", isSel && "bg-violet-50/40")}>
      {/* Satır 1: checkbox + ürün adı + analiz */}
      <div className="flex items-start gap-2.5">
        <input type="checkbox" checked={isSel} onChange={toggleSel}
          className="w-4 h-4 mt-0.5 rounded border-stone-300 text-teal-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <button onClick={() => openAnalysis(urun)} className="text-left w-full">
            <span className="font-semibold text-[13px] text-stone-900 leading-snug block">{urun.v2}</span>
          </button>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={() => copyFn(urun.v1)}
              className="font-mono text-[10px] text-stone-400 bg-stone-50 px-1.5 py-0.5 rounded border border-stone-200 flex items-center gap-1">
              {copiedId === urun.v1 ? <><Check size={8} className="text-teal-500" />Kopyalandı</> : <><Copy size={8} />{urun.v1}</>}
            </button>
            {urun.v91 && <span className="text-[10px] text-stone-400">{urun.v91}</span>}
          </div>
        </div>
        {/* Stok badge */}
        <span className={cn("text-[12px] font-bold shrink-0 mt-0.5", stk <= 0 ? "text-red-500" : "text-stone-700")}>
          {stk <= 0 ? '0' : stk}
        </span>
      </div>

      {/* Satır 2: period seçici */}
      <div className="flex items-center gap-0.5 mt-2.5 ml-6">
        {PERIODS.map(p => {
          const days = p.value === 'month'
            ? (() => { const t = new Date(), last = new Date(t.getFullYear(), t.getMonth() + 1, 0); return Math.ceil((last.getTime() - t.getTime()) / 86400000); })()
            : p.value as number;
          const val = Math.round(spd * days);
          const isActive = p.value === period;
          return (
            <button key={p.label} onClick={() => changePeriod(p.value)}
              className={cn("flex flex-col items-center px-2.5 py-1 rounded-lg transition-all flex-1",
                isActive ? "bg-stone-900" : "bg-stone-100")}>
              <span className="text-[8px] font-semibold uppercase text-stone-400 leading-none">{p.label}</span>
              <span className={cn("text-[12px] font-bold font-mono leading-tight mt-0.5", isActive ? "text-white" : "text-stone-600")}>{val}</span>
            </button>
          );
        })}
      </div>

      {/* Satır 3: İHT | ÖNR | Sepet */}
      <div className="flex items-center gap-2 mt-2.5 ml-6">
        <div className="flex-1">
          <div className="text-[8px] text-stone-400 uppercase font-semibold mb-1">İHTİYAÇ</div>
          {editing
            ? <input autoFocus type="number" value={customNeed ?? need}
              onChange={e => setCustomNeed(Math.max(0, parseInt(e.target.value) || 0))}
              onBlur={() => { setEditing(false); setOpt('need'); }}
              onKeyDown={e => e.key === 'Enter' && (setEditing(false), setOpt('need'))}
              className="w-full h-9 text-sm font-bold text-center border-2 border-stone-800 rounded-lg outline-none font-mono bg-white" />
            : <button onClick={() => { setOpt('need'); setEditing(true); }}
              className={cn("w-full h-9 text-sm font-bold rounded-lg text-center font-mono border-2 transition-all",
                opt === 'need' ? "bg-stone-800 text-white border-stone-800" : "bg-stone-100 text-stone-800 border-transparent")}>
              {need}
            </button>
          }
        </div>
        <div className="flex-1">
          <div className="text-[8px] text-emerald-600 uppercase font-semibold mb-1">ÖNERİ</div>
          <button onClick={() => setOpt('suggestion')}
            className={cn("w-full h-9 text-sm font-bold rounded-lg text-center font-mono border-2 transition-all",
              opt === 'suggestion' ? "bg-emerald-600 text-white border-emerald-600" : "bg-emerald-50 text-emerald-700 border-transparent")}>
            {onr}
          </button>
        </div>
        <div className="shrink-0 mt-4">
          <button onClick={addToCart}
            className={cn("h-9 w-9 flex items-center justify-center rounded-xl border-2 transition-all",
              inCart ? "bg-teal-600 text-white border-teal-600" : "bg-white text-stone-400 border-stone-200")}>
            {inCart ? <Check size={16} /> : <ShoppingCart size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function TableGroupRow({ grup, cart, updateCart, toggleCartItem, copyFn, copiedId, openAnalysis, activeMenu, setActiveMenu, onIgnore, selectedBarkods, setSelectedBarkods, onGrupDetail, mainCategory }: any) {
  const [isOpen, setIsOpen] = useState(true);
  const originalCount = grup.original_count ?? grup.detaylar.length;
  const isSingle = originalCount === 1;
  const showTree = mainCategory === 'ilac'; // Sadece ilaçta ağaç yapısı göster

  const totalSpeed = grup.detaylar.reduce((acc: number, u: any) => acc + (u.v20 || 0), 0) * 30;
  const totalStock = grup.detaylar.reduce((acc: number, u: any) => acc + (u.v4 || 0), 0);
  const totalDailySpeed = grup.detaylar.reduce((acc: number, u: any) => acc + (u.v20 || 0), 0);
  const omurGun = totalDailySpeed > 0 && totalStock > 0 ? Math.round(totalStock / totalDailySpeed) : null;
  const grupBaslik = (grup.lider_adi || '').split(' ')[0] + ' GRUBU';

  const sharedProps = { cart, updateCart, toggleCartItem, copyFn, copiedId, openAnalysis, activeMenu, setActiveMenu, onIgnore, selectedBarkods, setSelectedBarkods, showTree };

  return (
    <>
      {/* Grup Başlığı - Sadece İlaç sekmesinde ve birden fazla ürün varsa gösterilir */}
      {(showTree) && (
        <tr className="bg-stone-50/50 border-t border-stone-200/60">
          <td className="relative h-10">
            {/* Dikey çizgi başlangıcı (Ağaç yapısı için) */}
            {isOpen && <div className="absolute left-1/2 bottom-0 w-px h-1/2 bg-orange-300 -translate-x-1/2" />}
          </td>
          <td className="px-3 py-2" colSpan={5}>
            <div className="flex items-center justify-between">
              {/* Sol Taraf: Rozet + Analiz Butonu + İstatistikler */}
              <div className="flex items-center gap-2">
                {/* Turuncu Grup Rozeti */}
                <div className="bg-orange-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-sm tracking-tight shrink-0">
                  {grupBaslik}
                </div>

                {/* Grup Analizi Butonu (Rozetin hemen yanında) */}
                <button
                  onClick={(e) => { e.stopPropagation(); onGrupDetail && onGrupDetail(grup); }}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-all text-[10px] font-bold shadow-sm shrink-0">
                  <Activity size={10} /> Analiz
                </button>

                {/* Grup İstatistikleri */}
                <div className="flex items-center gap-4 text-[10px] font-bold text-stone-500 ml-2">
                  <span className="flex items-center gap-1"><TrendingUp size={12} className="text-stone-400" /> {totalSpeed.toFixed(1)}/ay</span>
                  <span className={cn("flex items-center gap-1", totalStock <= 0 ? "text-red-500" : "text-stone-600")}>
                    <Package size={12} className="text-stone-400" /> {totalStock} Stok
                  </span>
                  <span className="text-stone-300 font-medium">{originalCount} Eşdeğer</span>
                  {omurGun && omurGun < 30 && (
                    <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[9px] animate-pulse">Kritik: ~{omurGun} gün</span>
                  )}
                </div>
              </div>

              {/* Sağ Taraf: Aç/Kapat Kontrolü */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="p-1.5 hover:bg-stone-200 rounded-lg transition-colors text-stone-400">
                  <ChevronDown size={14} className={cn("transition-transform duration-200", isOpen && "rotate-180")} />
                </button>
              </div>
            </div>
          </td>
          {/* Boş hücreler (Tablo yapısını korumak için) */}
          <td className="pr-4"></td>
        </tr>
      )}

      {/* Ürün Satırları (TableProductRow) */}
      {(isSingle || !showTree || isOpen) && grup.detaylar.map((urun: any, idx: number) => (
        <TableProductRow
          key={idx}
          urun={urun}
          {...sharedProps}
          isGrouped={!isSingle && showTree}
          isLastChild={idx === grup.detaylar.length - 1}
          itemCart={cart[urun.v1] || { qty: 0, mf: 0, inCart: false }}
        />
      ))}
    </>
  );
}

const PERIODS = [
  { label: 'AyS', value: 'month' as const },
  { label: '15G', value: 15 },
  { label: '30G', value: 30 },
  { label: '60G', value: 60 },
  { label: '90G', value: 90 },
];

const TableProductRow = React.memo(function TableProductRow({
  urun, itemCart, updateCart, toggleCartItem, copyFn, copiedId, openAnalysis,
  selectedBarkods, setSelectedBarkods, isGrouped, isLastChild, showTree
}: any) {
  const [period, setPeriod] = useState<number | string>(30);
  const [opt, setOpt] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const { inCart } = itemCart;
  const isSel = selectedBarkods?.has(urun.v1);
  const spd = urun.v20 || 0;
  const stk = urun.v4 || 0;
  const spd30 = spd * 30;

  const periodDays = () => {
    if (period === 'month') {
      const t = new Date(), last = new Date(t.getFullYear(), t.getMonth() + 1, 0);
      return Math.ceil((last.getTime() - t.getTime()) / 86400000);
    }
    return period as number;
  };
  const need = Math.round(Math.max(0, spd * periodDays() - stk));
  const onr = Math.round(urun.v26 || 0) + Math.round(urun.v27 || 0);

  const toggleSel = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setSelectedBarkods((p: Set<string>) => {
      const n = new Set(p);
      e.target.checked ? n.add(urun.v1) : n.delete(urun.v1);
      return n;
    });
  };

  return (
    <tr className={cn("border-b border-stone-100 hover:bg-stone-50 transition-colors bg-white", isSel && "bg-teal-50/30")}>
      {/* Checkbox ve L-Tipi Çizgi Hücresi */}
      <td className="relative w-10 px-0 py-0 text-center align-middle hidden sm:table-cell">
        {isGrouped && showTree && (
          <>
            {/* Dikey Çizgi */}
            <div
              className="absolute left-1/2 w-px bg-orange-300 -translate-x-1/2"
              style={{
                top: 0,
                height: isLastChild ? '50%' : '100%'
              }}
            />
            {/* Yatay Çizgi (L-Bitiş) */}
            <div className="absolute left-1/2 top-1/2 w-3 h-px bg-orange-300" />
          </>
        )}
        <input
          type="checkbox"
          checked={isSel}
          onChange={toggleSel}
          className="relative z-10 w-3.5 h-3.5 rounded border-stone-300 text-teal-600 focus:ring-teal-500 cursor-pointer bg-white"
        />
      </td>

      {/* Ürün Bilgisi */}
      <td className="px-3 py-4 align-middle">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              onClick={() => openAnalysis(urun)}
              className="font-bold text-[13px] text-stone-900 truncate cursor-pointer hover:text-orange-600 transition-colors leading-snug">
              {urun.v2}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <button onClick={() => copyFn(urun.v1)}
              className="font-mono text-[10px] text-stone-400 hover:text-teal-600 bg-stone-50 px-2 py-0.5 rounded border border-stone-200 transition-colors flex items-center gap-1">
              {copiedId === urun.v1 ? <><Check size={8} /> Kopyalandı</> : <><Copy size={8} /> {urun.v1}</>}
            </button>
            {urun.v91 && <span className="text-[10px] text-stone-400 font-medium">{urun.v91}</span>}
          </div>
        </div>
      </td>

      {/* Tahmini Satış (Period Seçici) */}
      <td className="px-2 py-4 align-middle hidden sm:table-cell">
        <div className="flex items-center justify-center gap-0.5">
          {PERIODS.map(p => {
            const days = p.value === 'month' ? 30 : p.value as number;
            const displayVal = Math.round(spd * days);
            const isActive = p.value === period;
            return (
              <button key={p.label} onClick={() => setPeriod(p.value)}
                className={cn("flex flex-col items-center px-1.5 py-1 rounded transition-all w-[38px]",
                  isActive ? "bg-stone-900 text-white" : "hover:bg-stone-100 text-stone-500")}>
                <span className="text-[7px] font-black uppercase leading-none mb-0.5">{p.label}</span>
                <span className="text-[11px] font-bold font-mono leading-tight">{displayVal}</span>
              </button>
            );
          })}
        </div>
      </td>

      <td className="px-3 py-4 text-center align-middle hidden sm:table-cell">
        <span className="text-[12px] font-mono font-bold text-stone-700">{spd30.toFixed(1)}</span>
      </td>
      <td className="px-3 py-4 text-center align-middle hidden sm:table-cell">
        <span className={cn("text-[12px] font-black font-mono", stk <= 0 ? "text-red-500" : "text-stone-900")}>{stk}</span>
      </td>
      <td className="px-2 py-4 align-middle hidden sm:table-cell">
        <button onClick={() => setOpt(opt === 'need' ? null : 'need')}
          className={cn("w-full py-1 text-sm font-black rounded font-mono border-2 transition-all",
            opt === 'need' ? "bg-stone-800 text-white border-stone-800" : "bg-stone-100 text-stone-800 border-transparent hover:border-stone-300")}>
          {need}
        </button>
      </td>
      <td className="px-2 py-4 text-center align-middle hidden sm:table-cell">
        <button onClick={() => {
          updateCart(urun.v1, need, undefined, urun);
          toggleCartItem(urun.v1, urun);
        }}
          className={cn("h-8 w-8 flex items-center justify-center rounded-lg border-2 transition-all mx-auto",
            inCart ? "bg-teal-600 text-white border-teal-600" : "bg-white text-stone-400 border-stone-200 hover:border-teal-400 hover:text-teal-600")}>
          {inCart ? <Check size={14} /> : <ShoppingCart size={14} />}
        </button>
      </td>
    </tr>
  );
}, (prev, next) => {
  return prev.itemCart.qty === next.itemCart.qty &&
    prev.itemCart.inCart === next.itemCart.inCart &&
    prev.selectedBarkods.has(prev.urun.v1) === next.selectedBarkods.has(next.urun.v1) &&
    prev.showTree === next.showTree &&
    prev.isLastChild === next.isLastChild;
});


function GrupDetailModal({ grup, onClose, getBreadcrumb, rawGrup }: any) {
  // rawGrup: filtrelenmemiş orijinal grup, yoksa grup kullan
  const det = (rawGrup || grup).detaylar || [];
  const totalD = det.reduce((a: number, u: any) => a + (u.v20 || 0), 0);
  const totalS = det.reduce((a: number, u: any) => a + (u.v4 || 0), 0);
  const totalV = det.reduce((a: number, u: any) => a + ((u.v4 || 0) * (u.v87 || u.v86 || 0)), 0);
  const omur = totalD > 0 && totalS > 0 ? Math.round(totalS / totalD) : null;
  const lider = det[0] || {};
  const kat = lider.kategori_id ? getBreadcrumb(lider.kategori_id) : '';
  const rec = (lider.v82 || '').toUpperCase();
  const recColor = rec.includes('KIRMIZI') ? 'text-red-600 bg-red-50 border-red-200'
    : rec.includes('YEŞİL') ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
      : rec.includes('TURUNCU') ? 'text-orange-600 bg-orange-50 border-orange-200'
        : rec.includes('MOR') ? 'text-violet-600 bg-violet-50 border-violet-200' : '';
  const tagMap: any = { ks: 'Kritik', os: 'Ölü Stok', mr: 'Miad', vz: 'Vazgeçilmez', ei: 'İthal', nb: 'Nöbet' };
  const tags = (grup.tags || '').split(' ').filter(Boolean);
  const sorted = [...det].map((u: any) => ({
    ...u,
    pay: totalD > 0 ? Math.round((u.v20 || 0) / totalD * 100) : 0,
    omur: (u.v20 || 0) > 0 && (u.v4 || 0) > 0 ? Math.round((u.v4 || 0) / (u.v20 || 0)) : null,
  })).sort((a: any, b: any) => b.pay - a.pay);

  const kpis = [
    { l: 'Hız', v: `${(totalD * 30).toFixed(1)}/ay`, c: 'text-blue-600' },
    { l: 'Stok', v: totalS, c: totalS <= 0 ? 'text-red-500' : 'text-stone-800' },
    { l: 'Ömür', v: omur ? `~${omur}g` : '—', c: !omur ? 'text-red-500' : omur < 30 ? 'text-amber-500' : 'text-emerald-600' },
    { l: 'Değer', v: totalV > 0 ? `₺${(totalV / 1000).toFixed(1)}K` : '—', c: 'text-stone-700' },
    { l: 'Öneri', v: grup.toplam_oneri || 0, c: 'text-emerald-600' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-end md:items-center justify-center bg-stone-900/50 backdrop-blur-sm p-0 md:p-8"
      onClick={onClose}>
      <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={(e: any) => e.stopPropagation()}
        className="bg-white rounded-t-3xl md:rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] md:max-h-[82vh] overflow-hidden flex flex-col mt-auto md:mt-0 pb-safe">

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-stone-100 shrink-0 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-black text-stone-900 text-sm truncate mb-1" title={grup.lider_adi}>{grup.lider_adi}</div>
            <div className="flex flex-wrap gap-1.5">
              {kat && <span className="text-[10px] text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-100 font-medium">{kat}</span>}
              {recColor && <span className={cn("text-[10px] px-2 py-0.5 rounded border font-bold", recColor)}>{lider.v82}</span>}
              {lider.v78 && <span className="text-[10px] text-stone-500 bg-stone-50 px-2 py-0.5 rounded border border-stone-200 font-mono">{lider.v78}</span>}
              {tags.map((t: string) => tagMap[t] && <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-stone-50 text-stone-600 border-stone-200">{tagMap[t]}</span>)}
            </div>
          </div>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg bg-stone-100 hover:bg-red-50 hover:text-red-500 text-stone-400 transition-colors shrink-0">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* KPI satırı */}
          <div className="grid grid-cols-5 divide-x divide-stone-100 border-b border-stone-100 bg-stone-50/50">
            {kpis.map(k => (
              <div key={k.l} className="px-3 py-2.5 text-center">
                <div className="text-[9px] text-stone-400 font-black uppercase tracking-widest">{k.l}</div>
                <div className={cn("text-base font-black leading-tight mt-0.5", k.c)}>{k.v}</div>
              </div>
            ))}
          </div>

          {/* Karşılaştırma tablosu */}
          <div className="px-4 pt-3 pb-1">
            <div className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-2">Eşdeğer Karşılaştırması</div>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200">
                  {['Ürün', 'Hız/ay', 'Pay', 'Stok', 'Ömür'].map(h => (
                    <th key={h} className={cn("py-1.5 font-semibold text-stone-400 text-[10px] uppercase tracking-wide", h === 'Ürün' ? 'text-left px-0' : 'text-center px-2')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((u: any, i: number) => (
                  <tr key={i} className={cn("border-b border-stone-100 hover:bg-stone-50/60", i === 0 && "bg-blue-50/20")}>
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-1.5">
                        {i === 0 && <span className="w-1 h-1 rounded-full bg-blue-500 shrink-0" />}
                        <div>
                          <div className="font-semibold text-stone-800 text-xs truncate max-w-[220px]" title={u.v2}>{u.v2}</div>
                          <div className="font-mono text-[9px] text-stone-400">{u.v1}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center font-mono font-bold text-stone-700">{((u.v20 || 0) * 30).toFixed(1)}</td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1 justify-center">
                        <div className="h-1 rounded-full bg-blue-100 overflow-hidden w-8">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${u.pay}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-blue-700 min-w-[22px]">{u.pay}%</span>
                      </div>
                    </td>
                    <td className={cn("py-2 px-2 text-center font-mono font-bold", u.v4 <= 0 ? 'text-red-500' : 'text-stone-700')}>{u.v4}</td>
                    <td className={cn("py-2 px-2 text-center font-mono text-[11px] font-semibold", !u.omur ? 'text-red-500' : u.omur < 30 ? 'text-amber-600' : 'text-emerald-600')}>{u.omur ? `${u.omur}g` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* AI Analiz + Tavsiye */}
          {(grup.grup_analizi || grup.ek_tavsiye) && (
            <div className="px-4 py-3 grid md:grid-cols-2 gap-3 border-t border-stone-100">
              {grup.grup_analizi && grup.grup_analizi.length > 0 && (
                <div className="bg-violet-50 rounded-xl border border-violet-100 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5"><Brain size={11} className="text-violet-500" /><span className="text-[9px] font-black text-violet-600 uppercase tracking-widest">Grup Analizi</span></div>
                  {renderGrupAnalizi(grup.grup_analizi)}
                </div>
              )}
              {grup.ek_tavsiye && (
                <div className="mt-1">
                  {renderTavsiye(grup.ek_tavsiye)}
                </div>
              )}
            </div>
          )}

          {/* Hesap detayları */}
          {det.some((u: any) => u.log_html) && (
            <div className="px-4 py-3 border-t border-stone-100">
              <div className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-2">İhtiyaç Detayları</div>
              <div className="space-y-1">
                {det.filter((u: any) => u.log_html).map((u: any, i: number) => (
                  <details key={i} className="group">
                    <summary className="flex items-center gap-2 cursor-pointer list-none py-1 px-2 rounded-lg hover:bg-stone-50 border border-stone-100">
                      <ChevronRight size={10} className="text-stone-400 group-open:rotate-90 transition-transform shrink-0" />
                      <span className="text-[11px] font-semibold text-stone-700 truncate flex-1">{u.v2}</span>
                      <span className="text-[9px] text-stone-400 font-mono">{u.v1}</span>
                    </summary>
                    <div className="pl-6 pr-2 py-1.5">
                      <div className="space-y-0.5">
                        {(Array.isArray(u.log_html) ? u.log_html : [u.log_html]).map((entry: any, j: number) =>
                          renderLogItem(entry, j)
                        )}
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}


function parseMiadStr(raw: string | undefined | null): string {
  if (!raw) return 'Belirsiz';
  const str = String(raw);
  // "2026-01-31:1|2027-04-30:3" formatı
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
  // Düz tarih formatı "2026-01-31"
  if (/^\d{4}-\d{2}-\d{2}$/.test(str.trim())) {
    const d = new Date(str.trim());
    if (!isNaN(d.getTime())) return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return str;
}

function AyarlarPage({ supabase }: { supabase: any }) {
  const isWails = typeof window !== 'undefined' && (window as any).go !== undefined;
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(!isWails);

  React.useEffect(() => {
    if (isWails) return;
    supabase.auth.getUser().then(({ data }: any) => {
      setUser(data?.user);
      setLoading(false);
    });
  }, []);

  if (isWails) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm text-center">
          <div className="h-12 w-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-100">
            <Settings size={22} />
          </div>
          <h3 className="text-lg font-black text-slate-800 tracking-tight">Ayarlar</h3>
          <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
            Masaüstü uygulaması yerel modda çalışmaktadır. Şimdilik herhangi bir ayar bulunmamaktadır.
          </p>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Profil Kartı */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-stone-900 to-stone-700 px-6 py-5 flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-black text-xl">
            {(user?.email || 'U')[0].toUpperCase()}
          </div>
          <div>
            <p className="text-white font-black text-base">{user?.email?.split('@')[0] || 'Kullanıcı'}</p>
            <p className="text-stone-400 text-xs font-medium mt-0.5">{user?.email}</p>
          </div>
        </div>
        <div className="divide-y divide-stone-50">
          {[
            { label: 'E-posta', value: user?.email || '—' },
            { label: 'Kullanıcı ID', value: user?.id ? user.id.slice(0, 16) + '...' : '—' },
            { label: 'Kayıt Tarihi', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
            { label: 'Son Giriş', value: user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—' },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between px-6 py-3.5">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wide">{row.label}</span>
              <span className="text-xs font-semibold text-stone-700 font-mono">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hesap Bilgileri */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm px-6 py-4">
        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3">Plan</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-teal-50 flex items-center justify-center">
              <Sparkles size={15} className="text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-black text-stone-900">Nexus Pro</p>
              <p className="text-[10px] text-stone-400 font-medium">Tüm özellikler aktif</p>
            </div>
          </div>
          <span className="text-[10px] font-black px-2 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">Aktif</span>
        </div>
      </div>

      {/* Çıkış */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm px-6 py-4">
        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3">Oturum</p>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = '/register';
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 font-bold text-sm hover:bg-red-100 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Çıkış Yap
        </button>
      </div>
    </div>
  );
}

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

function DataTable({ data, type }: { data: any[], type: string }) {
  const [copiedBarkod, setCopiedBarkod] = useState<string | null>(null);
  const [cartQty, setCartQty] = useState<Record<string, number>>({});
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});

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

  // Nöbet özel görünümü - barkod + adet + sepet
  if (type === 'nb') {
    return (
      <div className={cn("w-full bg-white rounded-2xl border shadow-sm overflow-hidden", cfg.border)}>
        <div className={cn("px-6 py-4 border-b flex justify-between items-center", cfg.bg)}>
          <h3 className={cn("font-black text-base", cfg.color)}>{cfg.title}</h3>
          <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-white border border-stone-200 text-stone-500">{data.length} kayıt</span>
        </div>
        {/* MOBİL: Kart Görünümü */}
        <div className="md:hidden divide-y divide-stone-100 bg-stone-50/30">
          {data.map((item: any, i: number) => (
            <div key={i} className="p-4">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-[13px] text-stone-800">{item.ad || item.urun_adi || '—'}</p>
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
        {/* MASAÜSTÜ: Tablo Görünümü */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                {[
                  ['Ürün Adı', 'ad'],
                  ['Barkod', 'barkod'],
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
                  <td className="px-4 py-3 font-bold text-stone-700 text-xs">{item.ad || item.urun_adi || '—'}</td>
                  <td className="px-4 py-3">
                    {item.barkod ? (
                      <button onClick={() => copyBarkod(item.barkod)}
                        className="flex items-center gap-1.5 font-mono text-[10px] px-2 py-1 rounded-lg border transition-all bg-stone-50 border-stone-200 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 text-stone-500 whitespace-nowrap">
                        {copiedBarkod === item.barkod
                          ? <><Check size={10} className="text-teal-500" />Kopyalandı</>
                          : <><Copy size={10} />{item.barkod}</>}
                      </button>
                    ) : <span className="text-stone-300 text-xs font-mono">—</span>}
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-xs">{item.hedef}</td>
                  <td className="px-4 py-3 text-red-600 font-black text-xs">+{item.ihtiyac}</td>
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

  // Diğer tipler (para)
  const paraHeaders = ['Ürün Adı', 'PSF Değeri', 'Fazla Stok', 'Ömür'];
  const headers = type === 'para' ? paraHeaders : ['Ürün', 'Miktar'];

  return (
    <div className={cn("w-full bg-white rounded-2xl border shadow-sm overflow-hidden", cfg.border)}>
      <div className={cn("px-6 py-4 border-b flex justify-between items-center", cfg.bg)}>
        <h3 className={cn("font-black text-base", cfg.color)}>{cfg.title}</h3>
        <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-white border border-stone-200 text-stone-500">{data.length} kayıt</span>
      </div>
      {/* MOBİL GÖRÜNÜM (Kart) */}
      <div className="md:hidden divide-y divide-stone-100 bg-stone-50/20">
        {sortedData.map((item: any, i: number) => (
          <div key={i} className="p-4">
            <p className="font-bold text-stone-800 text-[13px] mb-3 leading-snug">{item.ad || item.urun_adi || "Bilinmeyen Ürün"}</p>
            {type === 'para' && (
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
            )}
          </div>
        ))}
      </div>
      
      {/* MASAÜSTÜ GÖRÜNÜM (Tablo) */}
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
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {sortedData.map((item: any, i: number) => (
              <tr key={i} className="hover:bg-stone-50/60 transition-colors">
                <td className="px-6 py-4 font-bold text-stone-700 text-xs">{item.ad || item.urun_adi || "Bilinmeyen Ürün"}</td>
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

// ─── WAILS SETUP VIEW ───
function WailsSetupView({ onSetupComplete }: { onSetupComplete: (data: any) => void }) {
  const [gln, setGln] = React.useState('');
  const [eczaneAdi, setEczaneAdi] = React.useState('');
  const [software, setSoftware] = React.useState('Botanik');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gln || !eczaneAdi) {
      setError("Lütfen tüm alanları doldurun.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Save settings to local settings.json
      await (window as any).go.main.App.SaveSettings(JSON.stringify({
        software,
        gln,
        eczane_adi: eczaneAdi
      }));
      // Trigger database extraction and python analysis
      const resJson = await (window as any).go.main.App.TriggerSyncAndAnalysis(gln, true);
      const res = JSON.parse(resJson);
      onSetupComplete(res);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || err || "SQL veritabanına bağlanılamadı veya analiz sırasında hata oluştu. Lütfen SQL Server'ın çalıştığını ve TCP/IP bağlantısının açık olduğunu doğrulayın.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl border border-stone-100 shadow-xl p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-16 w-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
            <Settings size={32} />
          </div>
          <h2 className="text-xl font-black text-stone-900 tracking-tight">Nexus Eczane Kurulumu</h2>
          <p className="text-xs text-stone-400 font-medium">Yerel veritabanı bağlantısı ve eczane kimliği ayarlarını yapın.</p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium space-y-1">
            <p className="font-bold flex items-center gap-1">⚠️ Kurulum Hatası:</p>
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider">Eczane Programı</label>
            <select
              value={software}
              onChange={(e) => setSoftware(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm font-semibold text-stone-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
            >
              <option value="Botanik">Botanik SQL</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider">Eczane GLN Numarası</label>
            <input
              type="text"
              placeholder="Örn: 8680001531578"
              value={gln}
              onChange={(e) => setGln(e.target.value.replace(/\D/g, ''))}
              maxLength={13}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold text-stone-800 placeholder-stone-300 focus:outline-none focus:border-teal-500 transition-all font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider">Eczane Adı</label>
            <input
              type="text"
              placeholder="Örn: Yılmaz Eczanesi"
              value={eczaneAdi}
              onChange={(e) => setEczaneAdi(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold text-stone-800 placeholder-stone-300 focus:outline-none focus:border-teal-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-teal-600 text-white font-bold text-sm shadow-md hover:bg-teal-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Veritabanı Okunuyor & Analiz Ediliyor...
              </>
            ) : (
              "Kaydet ve Analizi Başlat"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── WAILS SYNC VIEW ───
function WailsSyncView({ settings, onSyncComplete }: { settings: any; onSyncComplete: (data: any) => void }) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    try {
      const resJson = await (window as any).go.main.App.TriggerSyncAndAnalysis(settings.gln, true);
      const res = JSON.parse(resJson);
      onSyncComplete(res);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || err || "SQL veritabanına bağlanılamadı veya analiz sırasında hata oluştu. Lütfen SQL Server'ın çalıştığını ve TCP/IP bağlantısının açık olduğunu doğrulayın.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl border border-stone-100 shadow-xl p-8 space-y-6 text-center">
        <div className="flex flex-col items-center space-y-2">
          <div className="h-16 w-16 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600">
            <Brain size={32} />
          </div>
          <h2 className="text-xl font-black text-stone-900 tracking-tight">{settings.eczane_adi || "Eczane Analizi"}</h2>
          <p className="text-xs text-stone-400 font-medium">Yerel veritabanınızdan analiz ve sipariş öneri verilerinin çıkarılması gerekiyor.</p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium space-y-1 text-left">
            <p className="font-bold flex items-center gap-1">⚠️ Bağlantı Hatası:</p>
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 text-xs text-stone-500 font-semibold space-y-1 text-left">
          <div className="flex justify-between"><span>Program:</span> <span className="text-stone-700 font-bold">{settings.software}</span></div>
          <div className="flex justify-between"><span>GLN Numarası:</span> <span className="text-stone-700 font-mono font-bold">{settings.gln}</span></div>
        </div>

        <button
          onClick={handleSync}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-violet-600 text-white font-bold text-sm shadow-md hover:bg-violet-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Sanal Eczacı Analiz Yapıyor...
            </>
          ) : (
            <>
              <RefreshCw size={16} className="animate-spin" />
              Veritabanını Tara ve Analiz Et
            </>
          )}
        </button>
      </div>
    </div>
  );
}


