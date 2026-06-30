"use client";

import { useRouter } from 'next/router';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
import * as XLSX from 'xlsx';

import GeneralReports from '@/components/GeneralReports';
import YokListesi from '@/components/YokListesi';
import GozdenKacanlar from '@/components/GozdenKacanlar';
import SepetPage from '@/components/Sepet';
import PredictionsReport from '@/components/PredictionsReport';
import TaskBoard from '@/components/TaskBoard';
import InventoryBoard from '@/components/InventoryBoard';
import ExpiryReport from '@/components/ExpiryReport';
import DeadStockReport from '@/components/DeadStockReport';
import OutOfStockReport from '@/components/OutOfStockReport';
import AyarlarPage from '@/components/AyarlarPage';
import DataTable from '@/components/DataTable';
import { WailsSetupView, WailsSyncView } from '@/components/WailsSetup';
import Depolar, { DepoModal, loadDepolar, saveDepolar, loadDeletedIds, saveDeletedId, DEFAULT_DEPOLAR } from '@/components/Depolar';
import type { Depo } from '@/components/Depolar';
import CategoryManager from '@/components/CategoryManager';
import IadelerPage from '@/components/Iadeler';
import PsfKontrolPage from '@/components/PsfKontrol';
import ProductDbModal from '@/components/ProductDbModal';
import DatabaseManager from '@/components/DatabaseManager';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { fetchEczaneData } from '@/lib/api';
import { DashboardData } from '@/lib/types';
import {
  Package, Activity, Moon, AlertTriangle, Search,
  Copy, ShoppingCart, BarChart2, Check, ChevronDown, Calendar, Brain,
  DollarSign, ClipboardList, X, TrendingUp, RefreshCw, MoreVertical, EyeOff, Zap, Download, Layers, Sparkles, ChevronRight, Info, FileText,
  ListX, RotateCcw, PackageX, Pill, FlaskConical, Trash2,
  Building2, Users, Settings, Menu, Truck, Database, Tag, Plus, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import {
  getAnaKategoriler as defaultGetAnaKategoriler,
  getAltKategoriler as defaultGetAltKategoriler,
  isInAnaKategori,
  getBreadcrumb as defaultGetBreadcrumb,
  isPharmaceuticalCategory as defaultIsPharmaceuticalCategory,
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

const getPurchaseHistory = (alimStr: string) => {
  const purchases: Array<{ date: string; depo: string; mf: string; qty: number }> = [];
  if (alimStr && alimStr !== 'AL_YOK' && alimStr !== 'ALIM_YOK' && alimStr !== 'YOK') {
    alimStr.split('|').forEach(entry => {
      const parts = entry.split(':');
      if (parts.length >= 2) {
        const dateStr = parts[0];
        const val = parts[1];
        if (val.includes('+')) {
          let mfVal = val;
          let depoName = 'Bilinmeyen Depo';
          if (val.includes('@')) {
            const valParts = val.split('@');
            mfVal = valParts[0];
            depoName = valParts[1];
          }
          purchases.push({
            date: dateStr,
            depo: depoName,
            mf: mfVal,
            qty: parseInt(mfVal.split('+')[0]) || 0
          });
        }
      }
    });
  }
  return purchases
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
};

const getQueryHistory = (barcode: string, localOrders: any[]) => {
  const groupedQueries: Record<string, { date: string; depo: string; barems: Set<string> }> = {};
  if (Array.isArray(localOrders)) {
    localOrders.forEach(order => {
      if (order.barkod === barcode) {
        const dateStr = order.tarih ? (order.tarih.includes('T') ? order.tarih.split('T')[0] : order.tarih) : '';
        if (!dateStr) return;
        const depo = order.depo || 'Bilinmeyen Depo';
        const key = `${dateStr}_${depo}`;
        
        const baremsInOrder = [order.mf1, order.mf2, order.mf3].filter(Boolean).map(b => b.trim());
        if (baremsInOrder.length > 0) {
          if (!groupedQueries[key]) {
            groupedQueries[key] = {
              date: dateStr,
              depo: depo,
              barems: new Set<string>()
            };
          }
          baremsInOrder.forEach(b => groupedQueries[key].barems.add(b));
        }
      }
    });
  }
  return Object.values(groupedQueries)
    .map(q => ({
      date: q.date,
      depo: q.depo,
      baremsStr: Array.from(q.barems).join(', ')
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
};

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

interface CartItem { qty: number; mf: number; inCart: boolean; ad: string; depo: string; v95?: string; mf_baremleri?: any[]; }

function KategoriFiltreBar({
  selectedMainCats, setSelectedMainCats, selectedAltCats, setSelectedAltCats,
  excludedAltCats, setExcludedAltCats,
  getAnaKategoriler = defaultGetAnaKategoriler,
  getAltKategoriler = defaultGetAltKategoriler,
}: any) {
  const anaKategoriler = getAnaKategoriler();
  const [activeAna, setActiveAna] = useState<number | null>(selectedMainCats[0] || null);
  const [catSearch, setCatSearch] = useState(""); // Kategori içi arama

  const altKategoriler = activeAna ? getAltKategoriler(activeAna).filter((c: any) =>
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

const parsePriceLocal = (val: any): number => {
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
  
  // Sadece virgül varsa (örn: 123,45)
  if (str.includes(',')) {
    return parseFloat(str.replace(',', '.')) || 0;
  }
  
  // Sadece nokta varsa (örn: 123.45)
  if (str.includes('.')) {
    const parts = str.split('.');
    const lastPart = parts[parts.length - 1];
    if (lastPart.length === 2 || lastPart.length === 4 || lastPart.length === 1 || lastPart.length === 3) {
      return parseFloat(str) || 0;
    } else {
      // Binlik ayırıcıdır: 1.120 -> 1120
      return parseFloat(str.replace(/\./g, '')) || 0;
    }
  }
  
  return parseFloat(str) || 0;
};

export default function OrderCockpit() {
  const router = useRouter();
  const isWails = typeof window !== 'undefined' && (window as any).go !== undefined;

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('oneri');
  
  // Dynamic categories state and helpers
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [dynamicCategoryMap, setDynamicCategoryMap] = useState<Record<number, any>>({});
  const [filterZero, setFilterZero] = useState<'active' | 'passive' | 'excluded'>('active');
  const [filterTnf, setFilterTnf] = useState<'active' | 'passive' | 'excluded'>('active');
  const [filterEnteral, setFilterEnteral] = useState<'active' | 'passive' | 'excluded'>('active');
  const [editingCategoryProduct, setEditingCategoryProduct] = useState<any>(null);
  const [editingDbProduct, setEditingDbProduct] = useState<any>(null);

  const loadDbCategories = async () => {
    try {
      if (!isWails) return;
      const response = await (window as any).go.main.App.RunCategoryAction("list", "{}");
      const result = JSON.parse(response);
      if (result.status === "success") {
        setDbCategories(result.categories || []);
        
        const raw = result.categories || [];
        const map: Record<number, any> = {};
        for (const r of raw) {
          map[r.id] = { ...r, tam_yol: [], tam_yol_ids: [] };
        }
        
        const getPath = (id: number): { isimler: string[]; ids: number[] } => {
          const cat = map[id];
          if (!cat) return { isimler: [], ids: [] };
          if (cat.ust_kategori_id === null) return { isimler: [cat.isim], ids: [cat.id] };
          const parent = getPath(cat.ust_kategori_id);
          return {
            isimler: [...parent.isimler, cat.isim],
            ids: [...parent.ids, cat.id],
          };
        };
        
        for (const cat of Object.values(map)) {
          const path = getPath(cat.id);
          map[cat.id].tam_yol = path.isimler;
          map[cat.id].tam_yol_ids = path.ids;
        }
        setDynamicCategoryMap(map);
      }
    } catch (err) {
      console.error("Error loading categories from SQLite:", err);
    }
  };

  useEffect(() => {
    loadDbCategories();
    // Webview preload script yolunu yükle
    async function loadPreload() {
      try {
        if ((window as any).go?.main?.App?.GetWebviewPreloadPath) {
          const p = await (window as any).go.main.App.GetWebviewPreloadPath();
          setPreloadPath(p);
        } else if ((window as any).electronAPI?.invoke) {
          const p = await (window as any).electronAPI.invoke('wails:GetWebviewPreloadPath');
          setPreloadPath(p);
        } else if (typeof window !== 'undefined' && (window as any).require) {
          const { ipcRenderer } = (window as any).require('electron');
          const p = await ipcRenderer.invoke('wails:GetWebviewPreloadPath');
          setPreloadPath(p);
        }
      } catch (err) {
        console.error('Error fetching webview preload path:', err);
      }
    }
    loadPreload();
    try {
      const stored = localStorage.getItem('nexus_ai_carrying_cost');
      if (stored) {
        setAiMonthlyCarryingCost(parseFloat(stored) || 5);
      }
    } catch (e) {
      console.error(e);
    }
    try {
      const storedHide = localStorage.getItem('nexus_hide_group_headers');
      if (storedHide) {
        setHideGroupHeaders(storedHide === 'true');
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const getDynamicBreadcrumb = (id: number) => {
    return dynamicCategoryMap[id]?.tam_yol?.join(' > ') ?? defaultGetBreadcrumb(id);
  };

  const getDynamicAnaKategoriler = () => {
    const list = Object.values(dynamicCategoryMap).filter((c: any) => c.is_ana_kategori);
    return list.length > 0 ? list : defaultGetAnaKategoriler();
  };

  const getDynamicAltKategoriler = (anaId: number) => {
    const list = Object.values(dynamicCategoryMap).filter((c: any) => c.ust_kategori_id === anaId);
    return list.length > 0 ? list : defaultGetAltKategoriler(anaId);
  };

  const isDynamicPharmaceuticalCategory = (categoryId: number | null) => {
    if (categoryId === null) return false;
    if (dynamicCategoryMap[categoryId]) {
      return dynamicCategoryMap[categoryId].tam_yol_ids?.includes(1) ?? false;
    }
    return defaultIsPharmaceuticalCategory(categoryId);
  };

  // Helper for quick zero-stock lookup
  const zeroStockBarcodes = useMemo(() => {
    return new Set(data?.stok_sifir_listesi?.map((item: any) => item.barkod) || []);
  }, [data]);

  const handleAddToYokListesi = async (urun: any) => {
    try {
      const gln = data?.gln || 'local';
      const content = await (window as any).go.main.App.LoadLocalJSON(gln, "yok_listesi.json");
      let items = [];
      if (content && content !== '{}') {
        items = JSON.parse(content);
      }
      
      if (items.some((i: any) => i.barcode === urun.v1)) {
        alert("Bu ürün zaten yok listenizde kayıtlı.");
        return;
      }
      
      const newItem = {
        barcode: urun.v1,
        name: urun.v2,
        depo: urun.v91 || 'DEPO_YOK',
        addedAt: new Date().toISOString(),
        notes: "Sipariş Önerisinden Eklendi"
      };
      
      const updated = [newItem, ...items];
      await (window as any).go.main.App.SaveLocalJSON(gln, "yok_listesi.json", JSON.stringify(updated));
      alert("Ürün başarıyla Yok Listesine eklendi.");
    } catch (err) {
      console.error("Yok listesine eklenirken hata oluştu:", err);
      alert("Hata: Yok listesine eklenemedi.");
    }
  };

  const handleSaveProductCategory = async (barcode: string, categoryId: number) => {
    try {
      const res = await (window as any).go.main.App.RunCategoryAction("assign", JSON.stringify({ barcode, category_id: categoryId }));
      const result = JSON.parse(res);
      if (result.status === "success") {
        alert("Ürün kategorisi başarıyla güncellendi. Yeni kategorinin geçerli olması için analizi tetikleyebilirsiniz.");
        setEditingCategoryProduct(null);
        loadDbCategories();
      } else {
        alert("Hata: " + result.message);
      }
    } catch (err) {
      console.error("Kategori güncellenirken hata:", err);
      alert("Hata: Kategori güncellenemedi.");
    }
  };
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [filterKritik, setFilterKritik] = useState<'active' | 'passive' | 'excluded'>('active');
  const [expandedCategory, setExpandedCategory] = useState<'ilac' | 'disi' | null>(null);
  const [ignoredBarkods, setIgnoredBarkods] = useState<Set<string>>(new Set());
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const isInitialCartLoad = useRef(true);
  const [cartSyncStatus, setCartSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedBarkods, setSelectedBarkods] = useState<Set<string>>(new Set());
  const [visibleGroupsCount, setVisibleGroupsCount] = useState(20);
  const [filterEsdegersiz, setFilterEsdegersiz] = useState<'active' | 'passive' | 'excluded'>('active');
  const [selectedDaysLimit, setSelectedDaysLimit] = useState<number | null>(30);
  const [hideGroupHeaders, setHideGroupHeaders] = useState<boolean>(false);
  
  // ✨ AI Sipariş Modu State'leri
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiTargetDays, setAiTargetDays] = useState<number>(7);
  const [aiMaxDays, setAiMaxDays] = useState<number>(30);
  const [aiSimulating, setAiSimulating] = useState(false);
  const [aiProgress, setAiProgress] = useState('');
  const [aiMonthlyCarryingCost, setAiMonthlyCarryingCost] = useState<number>(5);
  const [whyItem, setWhyItem] = useState<any>(null);
  const [aiResults, setAiResults] = useState<any[]>([]);
  const [preloadPath, setPreloadPath] = useState('');
  const [aiExcludeEnteral, setAiExcludeEnteral] = useState<boolean>(false);
  const [aiExcludeTnf, setAiExcludeTnf] = useState<boolean>(false);
  const [aiExcludeIlacDisi, setAiExcludeIlacDisi] = useState<boolean>(false);
  const [aiOnlySadece, setAiOnlySadece] = useState<'all' | 'ilac_disi'>('all');
  const [aiOnlyPharmaceuticalAndNoEquivalent, setAiOnlyPharmaceuticalAndNoEquivalent] = useState<boolean>(false);
  const [aiSkipMfQuery, setAiSkipMfQuery] = useState<boolean>(false);
  const [esdegerItem, setEsdegerItem] = useState<any>(null);
  const [aiSimulationWarehouse, setAiSimulationWarehouse] = useState<string>('as_ecza');

  // ⚡ Acil Sipariş Modu State'leri
  const [showUrgentModal, setShowUrgentModal] = useState(false);
  const [urgentWarehouse, setUrgentWarehouse] = useState<string>('as_ecza');
  const [urgentSkipMfQuery, setUrgentSkipMfQuery] = useState<boolean>(false);
  const [mfQueryProduct, setMfQueryProduct] = useState<any>(null);
  const [selectedMfWarehouse, setSelectedMfWarehouse] = useState<string>('as_ecza');
  const [isSingleMfQuerying, setIsSingleMfQuerying] = useState<boolean>(false);

  const handleToggleAISelect = (barcode: string) => {
    setAiResults(prev => prev.map(r => r.barkod === barcode ? { ...r, selected: !r.selected } : r));
  };

  const handleToggleUrgentSelect = (barcode: string) => {
    setUrgentResults(prev => prev.map(r => r.barkod === barcode ? { ...r, selected: !r.selected } : r));
  };
  const [urgentSimulating, setUrgentSimulating] = useState(false);
  const [urgentProgress, setUrgentProgress] = useState('');
  const [urgentResults, setUrgentResults] = useState<any[]>([]);
  const [urgentDaysLimit, setUrgentDaysLimit] = useState<number | 'aySonu'>(45);

  useEffect(() => {
    if (showUrgentModal) {
      const products = getUrgentProducts();
      const daysLimitCount = urgentDaysLimit === 'aySonu' ? getDaysUntilMonthEnd() : urgentDaysLimit;
      const initialResults = products.map(item => {
        const isEquivalent = (item.group?.original_count ?? item.group?.detaylar?.length ?? 0) > 1;
        const statsSource = isEquivalent ? (item.group.original_detaylar || item.group.detaylar) : [item.rawUrun];

        const esdegerGrubu = isEquivalent ? {
          urunler: statsSource.map((u: any) => ({
            ad: u.v2 || '',
            barkod: u.v1 || '',
            stok: Number(u.v4) || 0,
            hiz: Number(u.v20) || 0,
          }))
        } : null;

        const defaultQty = item.stok <= 0 ? Math.max(1, Math.ceil(item.dailySpeed * 7)) : 1;
        const localCost = parsePriceLocal(item.rawUrun.v88 || item.rawUrun.v93 || 0);

        return {
          barkod: item.barkod,
          ad: item.ad,
          stok: item.stok,
          hiz: item.hiz,
          dailySpeed: item.dailySpeed,
          estOmur: item.estOmur,
          depoStok: 0,
          depocuFiyati: localCost,
          fiyatEtiket: parsePriceLocal(item.rawUrun.v87 || 0),
          secilenBarem: null,
          onerilenMf: null,
          onerilen: defaultQty,
          toplamTutar: defaultQty * localCost,
          baremler: [],
          netFiyatlar: [],
          esdegerGrubu,
          selected: true,
          whyData: {
            need: defaultQty,
            targetDays: daysLimitCount,
            baselineBarem: null,
            baselineNetPrice: localCost,
            carryingCostRate: 5,
            barems: []
          }
        };
      });
      setUrgentResults(initialResults);
    }
  }, [showUrgentModal]);

  useEffect(() => {
    if (urgentResults.length === 0) return;
    const daysLimitCount = urgentDaysLimit === 'aySonu' ? getDaysUntilMonthEnd() : urgentDaysLimit;
    setUrgentResults(prev => prev.map(r => {
      const need = r.stok <= 0 ? Math.max(1, Math.ceil(r.dailySpeed * 7)) : 1;
      if (!r.baremler || r.baremler.length === 0) {
        return {
          ...r,
          onerilen: need,
          toplamTutar: need * r.depocuFiyati,
          secilenBarem: null,
          onerilenMf: null,
          whyData: {
            need,
            targetDays: daysLimitCount,
            baselineBarem: null,
            baselineNetPrice: r.depocuFiyati,
            carryingCostRate: 5,
            barems: []
          }
        };
      }
      
      const parsedBarems = r.baremler.map((bStr: string, idx: number) => {
        const parts = bStr.split('+');
        const ana = parseInt(parts[0]) || 0;
        const bedava = parseInt(parts[1]) || 0;
        const rawNetPrice = r.netFiyatlar[idx];
        let netPrice = parsePriceLocal(rawNetPrice) || r.depocuFiyati * (ana / (ana + bedava));
        return { raw: bStr, ana, bedava, netPrice };
      });
      parsedBarems.sort((a, b) => a.ana - b.ana);
      
      let baselineBaremObj = null;
      for (let i = parsedBarems.length - 1; i >= 0; i--) {
        if (parsedBarems[i].ana <= need) {
          baselineBaremObj = parsedBarems[i];
          break;
        }
      }
      const baselineNetPrice = baselineBaremObj ? baselineBaremObj.netPrice : r.depocuFiyati;
      const baselineBaremRaw = baselineBaremObj ? baselineBaremObj.raw : null;
      
      let suggestedQty = need;
      let chosenBarem = null;
      let chosenNetPrice = r.depocuFiyati;
      
      if (baselineBaremObj && (baselineBaremObj.ana + baselineBaremObj.bedava) >= need) {
        suggestedQty = baselineBaremObj.ana;
        chosenBarem = baselineBaremObj.raw;
        chosenNetPrice = baselineBaremObj.netPrice;
      }
      
      const currentGroupStock = r.esdegerGrubu 
        ? r.esdegerGrubu.urunler.reduce((acc: number, u: any) => acc + (Number(u.stok) || 0), 0)
        : r.stok;
      const groupDailySpeed = r.esdegerGrubu 
        ? r.esdegerGrubu.urunler.reduce((acc: number, u: any) => acc + (Number(u.hiz) || 0), 0)
        : r.dailySpeed;
      
      const analyzedBarems = parsedBarems.map(b => {
        const totalFreeQty = b.ana + b.bedava;
        const totalDays = (currentGroupStock + totalFreeQty) / (groupDailySpeed || 0.001);
        const deltaDays = totalFreeQty / (groupDailySpeed || 0.001);
        const deltaMonths = deltaDays / 30;
        const carryingCostPct = deltaMonths * (5 / 100);
        const currentMfRatio = (b.ana + b.bedava) > 0 ? b.bedava / (b.ana + b.bedava) : 0;
        const baselineMfRatio = baselineBaremObj && (baselineBaremObj.ana + baselineBaremObj.bedava) > 0 
          ? baselineBaremObj.bedava / (baselineBaremObj.ana + baselineBaremObj.bedava) 
          : 0;
        const gainPct = Math.max(0, currentMfRatio - baselineMfRatio);
        const netReturn = gainPct - carryingCostPct;
        
        let status = 'pending';
        let reason = '';
        
        if (totalDays > daysLimitCount) {
          status = 'rejected_max_days';
          reason = `${Math.round(totalDays)} gün`;
        } else if (b.raw === baselineBaremRaw) {
          status = 'baseline_covered';
          reason = 'Referans barem (Saf İhtiyaç)';
        } else if (netReturn <= 0) {
          status = 'rejected_carrying_cost';
          reason = `Maliyet (%${(carryingCostPct * 100).toFixed(1)}) > Kazanç (%${(gainPct * 100).toFixed(1)})`;
        } else {
          status = 'profitable';
          reason = `Net Getiri: %${(netReturn * 100).toFixed(1)}`;
        }
        
        return {
          raw: b.raw,
          ana: b.ana,
          bedava: b.bedava,
          netPrice: b.netPrice,
          gainPct,
          carryingCostPct,
          netReturn,
          status,
          reason
        };
      });
      
      const profitableBarems = analyzedBarems.filter(b => b.status === 'profitable');
      profitableBarems.sort((a, b) => b.netReturn - a.netReturn);
      const bestBaremObj = profitableBarems[0] || null;
      
      if (bestBaremObj) {
        suggestedQty = bestBaremObj.ana;
        chosenBarem = bestBaremObj.raw;
        chosenNetPrice = bestBaremObj.netPrice;
      }
      
      return {
        ...r,
        onerilen: suggestedQty,
        toplamTutar: suggestedQty * r.depocuFiyati,
        secilenBarem: chosenBarem,
        onerilenMf: chosenBarem,
        whyData: {
          need,
          targetDays: daysLimitCount,
          baselineBarem: baselineBaremRaw,
          baselineNetPrice,
          carryingCostRate: 5,
          barems: analyzedBarems
        }
      };
    }));
  }, [urgentDaysLimit]);
  const [appSettings, setAppSettings] = useState<any>({
    eczane_adi: "",
    gln: "",
    software: "Botanik",
    server_instance: "",
    database: "",
    auto_scan_9am: false,
    scan_before_simulation: false,
    auto_scan_24h: false,
    default_ai_order_mode: false,
  });

  const getDaysUntilMonthEnd = () => {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return Math.max(1, lastDayOfMonth.getDate() - now.getDate());
  };

  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const cartSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sharedWebviewRefs = useRef<Record<string, any>>({});
  const [copiedBarkod, setCopiedBarkod] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any | null>(null);
  const [analysisTab, setAnalysisTab] = useState<'product' | 'group'>('product');

  const handleOpenProductAnalysis = (barcode: string, fallbackName?: string) => {
    const urun = data?.gruplar?.flatMap((g: any) => g.detaylar).find((u: any) => u.v1 === barcode);
    if (urun) {
      setSelectedAnalysis(urun);
    } else {
      setSelectedAnalysis({
        v1: barcode,
        v2: fallbackName || 'İlaç',
        v95: barcode
      });
    }
    setAnalysisTab('product');
  };

  const [pendingDepoSearch, setPendingDepoSearch] = useState<{ barcode: string; timestamp: number } | null>(null);
  const [modalQty, setModalQty] = useState<number>(0);
  const [modalMf, setModalMf] = useState<number>(0);
  const [localOrders, setLocalOrders] = useState<any[]>([]);
  const [selectedGrup, setSelectedGrup] = useState<any | null>(null);
  const [menuStates, setMenuStates] = useState({ stok: true, operasyon: false, ag: false, analitik: false, araclar: false });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filterIlac, setFilterIlac] = useState<'active' | 'passive' | 'excluded'>('active');
  const [filterDisi, setFilterDisi] = useState<'active' | 'passive' | 'excluded'>('active');
  useEffect(() => {
    if (selectedAnalysis) {
      const barcode = selectedAnalysis.v1;
      const itemCart = cart[barcode] || { qty: 0, mf: 0, inCart: false };
      const defaultQty = itemCart.qty > 0 ? itemCart.qty : (Math.round(selectedAnalysis.v26 || 0) + Math.round(selectedAnalysis.v27 || 0) || 0);
      setModalQty(defaultQty);
      const defaultMf = itemCart.qty > 0 ? itemCart.mf : calculateAutoMF(defaultQty, selectedAnalysis.mf_baremleri || []);
      setModalMf(defaultMf);
      setAnalysisTab('product');
    } else {
      setModalQty(0);
      setModalMf(0);
    }
  }, [selectedAnalysis]);

  const handleModalQtyChange = (val: number) => {
    setModalQty(val);
    if (selectedAnalysis) {
      setModalMf(calculateAutoMF(val, selectedAnalysis.mf_baremleri || []));
    }
  };

  const handleModalAddToCart = () => {
    if (!selectedAnalysis) return;
    updateCart(selectedAnalysis.v1, modalQty, modalMf, selectedAnalysis);
    const barcode = selectedAnalysis.v1;
    const itemCart = cart[barcode] || { qty: 0, mf: 0, inCart: false };
    if (!itemCart.inCart) {
      toggleCartItem(barcode, selectedAnalysis);
    }
  };

  const handleModalRemoveFromCart = () => {
    if (!selectedAnalysis) return;
    setCart(prev => {
      return {
        ...prev,
        [selectedAnalysis.v1]: {
          ...prev[selectedAnalysis.v1],
          qty: 0,
          mf: 0,
          inCart: false
        }
      };
    });
    setModalQty(0);
    setModalMf(0);
  };

  const nextFilterState = (current: 'active' | 'passive' | 'excluded'): 'active' | 'passive' | 'excluded' => {
    if (current === 'active') return 'passive';
    if (current === 'passive') return 'excluded';
    return 'active';
  };

  const getFilterBtnClass = (
    state: 'active' | 'passive' | 'excluded',
    activeClass: string
  ) => {
    return cn(
      "h-9 px-3 rounded-xl border font-bold text-[11px] transition-all flex items-center gap-1.5 shrink-0",
      state === 'active' ? activeClass :
      state === 'excluded' ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100/70 hover:border-red-300 line-through decoration-red-400 decoration-2" :
      "bg-white border-stone-200 text-stone-400 hover:border-stone-300 hover:text-stone-600"
    );
  };
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
        let targetQty = current.qty;
        if (!current.inCart) {
          const activeDays = selectedDaysLimit !== null ? selectedDaysLimit : 30;
          const spd = urun.v20 || 0;
          const stk = urun.v4 || 0;
          const need = Math.round(Math.max(0, spd * activeDays - stk));
          targetQty = need > 0 ? need : 1;
        }
        newCart[barkod] = { ...current, qty: targetQty, inCart: true, mf: current.mf || calculateAutoMF(targetQty, urun.mf_baremleri) };
      }
    });
    setCart(newCart);
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

  // ✨ AI Sipariş Modu Fonksiyonları
  const runAISimulation = async () => {
    try {
      const gln = data?.gln || 'local';
      const todayStr = new Date().toLocaleDateString('en-CA');
      let cacheFile = '';

    // B. Her simülasyon öncesi değişen satırlar için tarama yapsın
    if (appSettings.scan_before_simulation) {
      setSyncStatusMsg("Simülasyon öncesi değişen satırlar taranıyor...");
      try {
        await (window as any).go.main.App.TriggerSyncAndAnalysis(gln, false);
        // reload data after scan
        const res = await fetchEczaneData("");
        if (res) setData(res);
      } catch (err) {
        console.error("Incremental scan before simulation failed:", err);
      }
      setSyncStatusMsg("");
    }

    // SQLite Veritabanı Güncelleme Yardımıcısı
    const updateDbWithLiveDataLocal = async (barcode: string, dsf: number, psf: number, mfList: string[]) => {
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
          if (mf <= 0) return null; // xx+0 mf değildir
          return { ana, mf };
        };

        mfList.forEach(rawMf => {
          const parsed = parseMfBarem(rawMf);
          if (parsed) dbMfBaremleri.push(parsed);
        });

        const mfBaremleriStr = JSON.stringify(dbMfBaremleri);

        if ((window as any).go?.main?.App?.RunCategoryAction) {
          await (window as any).go.main.App.RunCategoryAction(
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
        }
      } catch (err) {
        console.error(`[AI Database Update] ${barcode} güncelleme hatası:`, err);
      }
    };

    // Ömür Hesaplama Yardımcısı
    const getGroupLifetimeLocal = (g: any) => {
      const isEquivalent = (g.original_count ?? g.detaylar.length) > 1;
      const det = isEquivalent ? (g.original_detaylar || g.detaylar || []) : (g.detaylar || []);
      if (isEquivalent) {
        const totalStock = det.reduce((acc: number, u: any) => acc + (Number(u.v4) || 0), 0);
        const totalDailySpeed = det.reduce((acc: number, u: any) => acc + (Number(u.v20) || 0), 0);
        if (totalDailySpeed <= 0) return 999999;
        return totalStock / totalDailySpeed;
      } else {
        const urun = det[0];
        if (!urun) return 999999;
        const stock = Number(urun.v4) || 0;
        const dailySpeed = Number(urun.v20) || 0;
        if (dailySpeed <= 0) return 999999;
        return stock / dailySpeed;
      }
    };

    // 1. Önbelleği (cache) yükle
    let cache: Record<string, any> = {};
    try {
      if ((window as any).go?.main?.App?.LoadLocalJSON) {
        // Seçili depoya göre sipariş geçmişini yükle
        const orderFile = aiSimulationWarehouse === 'gek' ? 'gek_siparisler.json' : 'as_siparisler.json';
        const rawSiparisler = await (window as any).go.main.App.LoadLocalJSON(gln, orderFile);
        if (rawSiparisler && rawSiparisler !== '{}') {
          const parsed = JSON.parse(rawSiparisler);
          if (Array.isArray(parsed)) {
            parsed.forEach((entry: any) => {
              if (entry.barkod && entry.tarih && entry.durum === 'success') {
                const dateStr = entry.tarih.includes('T') ? entry.tarih.split('T')[0] : entry.tarih;
                const mf_baremleri = [entry.mf1, entry.mf2, entry.mf3].filter(Boolean) as string[];
                // net_fiyatlar: sayısal değerleri string'e çevir, 0 olanları filtrele
                const net_fiyatlar = [entry.net_fiyat1, entry.net_fiyat2, entry.net_fiyat3]
                  .filter(val => val && Number(val) > 0)
                  .map(val => String(val));

                cache[entry.barkod] = {
                  date: dateStr,
                  stok: entry.stok_durumu || 0,
                  fiyat_depocu: entry.fiyat_depocu || 0,
                  fiyat_etiket: entry.fiyat_etiket || 0,
                  mf_baremleri: mf_baremleri,
                  net_fiyatlar: net_fiyatlar,
                  kod: entry.urun_kodu || '',
                  depo: entry.depo || (aiSimulationWarehouse === 'gek' ? 'GEK' : 'AS ECZA')
                };
              }
            });
          }
        }
        
        // Ardından sorgu önbelleğini yükle
        cacheFile = aiSimulationWarehouse === 'gek' ? 'gek_query_cache.json' : (aiSimulationWarehouse === 'alliance' ? 'alliance_query_cache.json' : (aiSimulationWarehouse === 'as' || aiSimulationWarehouse === 'as_ecza' ? 'as_ecza_query_cache.json' : `${aiSimulationWarehouse}_query_cache.json`));
        const cacheStr = await (window as any).go.main.App.LoadLocalJSON(gln, cacheFile);
        if (cacheStr && cacheStr !== '{}') {
          const legacyCache = JSON.parse(cacheStr);
          Object.keys(legacyCache).forEach(barcode => {
            cache[barcode] = legacyCache[barcode];
          });
        }
      }
    } catch (e) {
      console.log("[AI Order] Önbellek yüklenemedi, yeni oluşturulacak:", e);
    }

    // 2. Simüle edilecek grupları topla (önerilen veya hızı olan)
    const groupsToSimulate = filteredGroups.filter((g: any) => {
      // Kriter 3: Sadece seçilen gün sayısı ve altında ömre sahip olan ilaçlar değerlendirilsin
      const localLifetime = getGroupLifetimeLocal(g);
      if (localLifetime > aiTargetDays) return false;

      // Sadece eşdeğersiz ilaçlar kontrolü (kategori=ilaç VE eşdeğeri olmayan)
      if (aiOnlyPharmaceuticalAndNoEquivalent) {
        const isPharmaceutical = isDynamicPharmaceuticalCategory(g.kategori_id || 0);
        // eşdeğersiz: grubun original_count === 1 veya detaylar.length === 1
        const isEsdegersiz = (g.original_count ?? g.detaylar.length) === 1;
        if (!isPharmaceutical || !isEsdegersiz) return false;
      }

      const isEquivalent = (g.original_count ?? g.detaylar.length) > 1;
      const det = isEquivalent ? (g.original_detaylar || g.detaylar || []) : (g.detaylar || []);
      const totalDailySpeed = det.reduce((acc: number, u: any) => acc + (Number(u.v20) || 0), 0);
      return g.toplam_oneri > 0 || totalDailySpeed > 0;
    });

    if (groupsToSimulate.length === 0) {
      alert(`${aiTargetDays} gün ve altında ömre sahip sipariş önerisi bulunamadı.`);
      return;
    }

    // Kriter 2: Enteral ve TNF ürünlerini hariç tutma kontrolleri
    const isProductTnf = (urun: any) => {
      return urun.kategori_id === 15 || (urun.kategori_id && dynamicCategoryMap[urun.kategori_id]?.tam_yol_ids?.includes(15)) || false;
    };
    const isProductEnteral = (urun: any) => {
      return urun.kategori_id === 14 || (urun.kategori_id && dynamicCategoryMap[urun.kategori_id]?.tam_yol_ids?.includes(14)) || false;
    };

    // Her grubun lider/ana ürünü üzerinden sorgu listesi oluştur
    const productsToQuery = groupsToSimulate.map((g: any) => {
      const urun = g.detaylar[0];
      return {
        barcode: urun?.v1,
        ad: urun?.v2,
        grup: g,
        isTnf: urun ? isProductTnf(urun) : false,
        isEnteral: urun ? isProductEnteral(urun) : false,
        isPharmaceutical: urun ? isDynamicPharmaceuticalCategory(g.kategori_id || 0) : false
      };
    }).filter(p => {
      if (!p.barcode) return false;
      if (aiExcludeEnteral && p.isEnteral) return false;
      if (aiExcludeTnf && p.isTnf) return false;
      if (aiExcludeIlacDisi && !p.isPharmaceutical) return false;
      // Sadece İlaç Dışı modu
      if (aiOnlySadece === 'ilac_disi' && p.isPharmaceutical) return false;
      return true;
    });

    if (productsToQuery.length === 0) {
      alert("Seçilen kriterlere ve filtrelere uygun ürün bulunamadı.");
      return;
    }

    // 3. Aktif depo webview referansını tarayıp bul
    let hiddenWebview: any = null;
    let targetDomain = 'asecza.com.tr';
    if (aiSimulationWarehouse === 'gek') targetDomain = 'esube.gek.org.tr';
    else if (aiSimulationWarehouse === 'alliance') targetDomain = 'alliance';
    else if (aiSimulationWarehouse === 'selcuk') targetDomain = 'selcukecza.com.tr';
    else if (aiSimulationWarehouse === 'nevzat') targetDomain = 'nevzatecza.com.tr';
    else if (aiSimulationWarehouse === 'cam') targetDomain = 'camecza.com';
    else {
      const foundDepo = loadDepolar().find(d => d.id === aiSimulationWarehouse);
      if (foundDepo) {
        try {
          targetDomain = new URL(foundDepo.url).hostname.replace('www.', '');
        } catch {}
      }
    }
    
    const warehouseName = loadDepolar().find(d => d.id === aiSimulationWarehouse)?.ad || 'AS Ecza';

    if (!aiSkipMfQuery) {
      // Öncelikle depo ID'sine göre doğrudan eşleştirmeyi dene
      const directEl = sharedWebviewRefs.current[aiSimulationWarehouse];
      if (directEl && typeof directEl.executeJavaScript === 'function') {
        hiddenWebview = directEl;
      }
      
      // Bulunamazsa URL tabanlı geri çekilme (fallback) eşleştirmesini yap
      if (!hiddenWebview) {
        for (const [id, el] of Object.entries(sharedWebviewRefs.current)) {
          if (el && typeof el.executeJavaScript === 'function') {
            try {
              const url: string = await el.executeJavaScript('location.href');
              if (url.includes(targetDomain) || 
                  ((aiSimulationWarehouse === 'as' || aiSimulationWarehouse === 'as_ecza') && url.includes('127.0.0.1') && url.includes('Siparis')) ||
                  (aiSimulationWarehouse === 'alliance' && (url.includes('alliance-healthcare.com') || url.includes('alliance')))) {
                hiddenWebview = el;
                break;
              }
            } catch (e) {
              // ignore
            }
          }
        }
      }
    }

    if (!hiddenWebview) {
      if (!aiSkipMfQuery) {
        const proceed = window.confirm(`${warehouseName} oturumu bulunamadı.\n\nYalnızca önbellek verileriyle (MF sorgulaması yapılmadan) simülasyonu başlatmak ister misiniz?\n\nTamam → Önbellek ile devam et\nİptal → Simülasyonu durdur`);
        if (!proceed) return;
      }
      // hiddenWebview null kalıyor; aşağıdaki döngü önbellek verisini kullanacak
    }

    // GEK webview hâlâ irj/portal/'daysa FrameWorkT1'e navigate et
    // (API istekleri Referer: FrameWorkT1/'dan gelmesi gerekiyor)
    if (aiSimulationWarehouse === 'gek' && hiddenWebview) {
      try {
        const currentUrl: string = await hiddenWebview.executeJavaScript('location.href');
        if (currentUrl.includes('irj/portal') && !currentUrl.includes('FrameWorkT1')) {
          hiddenWebview.loadURL('https://esube.gek.org.tr/FrameWorkT1/');
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => resolve(), 8000);
            const checkReady = setInterval(async () => {
              try {
                const url: string = await hiddenWebview.executeJavaScript('location.href');
                if (url.includes('FrameWorkT1')) {
                  clearInterval(checkReady);
                  clearTimeout(timeout);
                  setTimeout(() => resolve(), 2000);
                }
              } catch {}
            }, 500);
          });
        }
      } catch {}
    }

    if (aiSimulationWarehouse === 'gek' && hiddenWebview) {
      try {
        const debugData = await hiddenWebview.executeJavaScript(`
          (async function() {
            try {
              const res = {
                href: location.href,
                __gekToken: window.__gekToken || null,
                localStorage: {},
                sessionStorage: {},
                cookies: document.cookie
              };
              try {
                for (let i = 0; i < localStorage.length; i++) {
                  const k = localStorage.key(i);
                  res.localStorage[k] = localStorage.getItem(k);
                }
              } catch(e) { res.localStorageError = String(e); }
              try {
                for (let i = 0; i < sessionStorage.length; i++) {
                  const k = sessionStorage.key(i);
                  res.sessionStorage[k] = sessionStorage.getItem(k);
                }
              } catch(e) { res.sessionStorageError = String(e); }
              return res;
            } catch(e) {
              return { error: String(e) };
            }
          })()
        `);
        await (window as any).go.main.App.SaveLocalJSON(gln, "gek_debug.json", JSON.stringify(debugData, null, 2));
      } catch(de) {
        console.error("Debug write failed", de);
      }
    }

    // Oturum kontrolü yap (Eğer cache'ten okunmayacak ürünler varsa kontrol önemli)
    const hasUncached = productsToQuery.some(p => !cache[p.barcode] || cache[p.barcode].date !== todayStr);
    if (hasUncached && hiddenWebview) {
      try {
        const currentUrl: string = await hiddenWebview.executeJavaScript('location.href');
        const isLoginRequired = currentUrl.includes('/Login.aspx') || currentUrl.includes('login.aspx');
        if (isLoginRequired) {
          alert(`${warehouseName} oturumunuz sonlanmış veya giriş yapılmamış. Lütfen 'Depolar' sekmesinden ${warehouseName}'ya giriş yapın.`);
          return;
        }
      } catch (err) {
        alert(`${warehouseName} durum kontrolü başarısız oldu: ` + String(err));
        return;
      }
    }

    setAiSimulating(true);
    setAiResults([]);

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    const results: any[] = [];



    // Span etiketlerini temizleme
    const extractSpansLocal = (htmlStr: string): string[] => {
      if (!htmlStr) return [];
      const matches = htmlStr.match(/<span>(.*?)<\/span>/g);
      if (!matches) return [];
      return matches.map(m => m.replace(/<\/?span>/g, '').trim());
    };

    for (let i = 0; i < productsToQuery.length; i++) {
      const item = productsToQuery[i];
      const barcode = item.barcode;
      const name = item.ad;
      const group = item.grup;

      setAiProgress(`Canlı veriler kontrol ediliyor [${i + 1}/${productsToQuery.length}]: ${name}`);

      try {
        const isEquivalent = (group.original_count ?? group.detaylar.length) > 1;
        const statsSource = isEquivalent ? (group.original_detaylar || group.detaylar) : group.detaylar;

        const currentGroupStock = statsSource.reduce((acc: number, u: any) => acc + (Number(u.v4) || 0), 0);
        const groupDailySpeed = statsSource.reduce((acc: number, u: any) => acc + (Number(u.v20) || 0), 0);

        const esdegerGrubu = isEquivalent ? {
          urunler: statsSource.map((u: any) => ({
            ad: u.v2 || '',
            barkod: u.v1 || '',
            stok: Number(u.v4) || 0,
            hiz: Number(u.v20) || 0,
          })),
          toplamStok: currentGroupStock,
          toplamHiz: groupDailySpeed,
          grupOmur: groupDailySpeed > 0 ? Math.round(currentGroupStock / groupDailySpeed) : null,
        } : null;

        const rawNeed = groupDailySpeed * aiTargetDays - currentGroupStock;
        const need = Math.max(0, Math.ceil(rawNeed));

        const cached = cache[barcode];
        let detail: any = null;
        let mfList: string[] = [];
        let netList: string[] = [];
        let dsfVal = 0;
        let psfVal = 0;
        let isFromCache = false;

        // Kriter 4: Bir gün içinde bir barkod depodan sadece bir kez sorgulanabilir.
        if (cached && cached.date === todayStr) {
          isFromCache = true;
          dsfVal = cached.fiyat_depocu;
          psfVal = cached.fiyat_etiket;
          mfList = cached.mf_baremleri || [];
          netList = cached.net_fiyatlar || [];
          detail = {
            stokDurumu: cached.stok,
            depocuFiyati: dsfVal,
            SonFiyat: psfVal,
            ad: name,
            kod: cached.kod || ''
          };
          console.log(`[AI Cache] ${barcode} önbellekten yüklendi.`);
        } else {
          // Önbellekte yoksa, canlı sorgu atıyoruz
          const barcodeJson = JSON.stringify(barcode);
          if (!hiddenWebview) {
            results.push({
              barkod: barcode,
              ad: name,
              stok: currentGroupStock,
              hiz: groupDailySpeed * 30,
              ihtiyac: need,
              onerilen: aiSkipMfQuery ? need : 0,
              secilenBarem: null,
              yeniOmur: currentGroupStock > 0 && groupDailySpeed > 0 ? Math.round((currentGroupStock + (aiSkipMfQuery ? need : 0)) / groupDailySpeed) : null,
              depocuFiyati: 0,
              netFiyat: null,
              toplamTutar: 0,
              isCached: false,
              baremler: [],
              netFiyatlar: [],
              whyData: null,
              esdegerGrubu,
              hata: aiSkipMfQuery ? null : 'Depo bağlantısı yok — önbellekte veri bulunamadı',
              selected: true
            });
            setAiResults([...results]);
            await sleep(10);
            continue;
          }


          if (aiSimulationWarehouse === 'gek') {
            // GEK Canlı Sorgu
            const localGekToken = (typeof window !== 'undefined' ? localStorage.getItem('nexus_gek_token') : '') || '';
            const queryResult: any = await hiddenWebview.executeJavaScript(`
              (async function() {
                try {
                  let token = window.__gekToken || ${JSON.stringify(localGekToken)} || "";
                  if (!token) {
                    const stores = [window.localStorage, window.sessionStorage];
                    const keys = ['token','Token','TOKEN','gek_token','gekToken','accessToken','access_token','auth_token','authToken','jwt','JWT'];
                    for (const store of stores) {
                      if (token) break;
                      if (!store) continue;
                      for (const k of keys) {
                        try {
                          const v = store.getItem(k);
                          if (v && v.length > 10 && !v.startsWith('{')) { token = v; break; }
                          if (v && v.length > 10) {
                            try { const j = JSON.parse(v); const t = j.token||j.Token||j.TOKEN||j.accessToken||j.access_token||j.currentSession?.access_token; if(t) { token = t; break; } } catch {}
                          }
                        } catch {}
                      }
                      if (token) break;
                      try {
                        for (let i = 0; i < store.length; i++) {
                          const k = store.key(i);
                          if (!k) continue;
                          const v = store.getItem(k);
                          if (!v) continue;
                          if (v.length > 10 && !v.startsWith('{') && (k.toLowerCase().includes('token') || k.toLowerCase().includes('auth') || k.toLowerCase().includes('jwt'))) {
                            token = v;
                            break;
                          }
                          try { 
                            const j = JSON.parse(v); 
                            const t = j.token||j.Token||j.TOKEN||j.accessToken||j.access_token||j.currentSession?.access_token; 
                            if(t && String(t).length > 10) { token = String(t); break; }
                          } catch {}
                        }
                      } catch {}
                    }
                  }
                  if (!token) {
                    try {
                      const cookies = document.cookie.split(';');
                      for (const c of cookies) {
                        const [k, v] = c.trim().split('=');
                        if (k && ['token','Token','TOKEN','auth','jwt'].some(kk => k.toLowerCase().includes(kk))) {
                          if (v && v.length > 10) { token = decodeURIComponent(v); break; }
                        }
                      }
                    } catch {}
                  }
                  if (!token) {
                    // Son çare: session cookie ile /gt endpoint'inden token al
                    // (eklentinin yaptığı gibi — kullanıcı login olmuşsa cookie var)
                    try {
                      const gtResp = await fetch('https://esube.gek.org.tr/MainService/api/rfc/gt', {
                        method: 'GET',
                        headers: { 'accept': 'application/json;charset=UTF-8' },
                        credentials: 'include'
                      });
                      if (gtResp.ok) {
                        let gtData = null;
                        try { gtData = await gtResp.json(); } catch { gtData = null; }
                        const tok = gtData && (gtData.token || gtData.Token || gtData.TOKEN || gtData.accessToken || gtData.access_token || (gtData.response && (gtData.response.token || gtData.response.Token)));
                        if (tok && String(tok).length > 10) {
                          token = String(tok);
                        }
                      }
                    } catch {}
                  }
                  if (!token) {
                    // /gt de başarısız → /al endpoint'ini dene (alternatif GEK token endpoint)
                    try {
                      const alResp = await fetch('https://esube.gek.org.tr/MainService/api/rfc/al', {
                        method: 'POST',
                        headers: { 'accept': 'application/json;charset=UTF-8', 'content-type': 'application/json' },
                        credentials: 'include',
                        body: '{}'
                      });
                      if (alResp.ok) {
                        let alData = null;
                        try { alData = await alResp.json(); } catch { alData = null; }
                        const tok2 = alData && (alData.token || alData.Token || alData.TOKEN || alData.accessToken || alData.access_token);
                        if (tok2 && String(tok2).length > 10) token = String(tok2);
                      }
                    } catch {}
                  }
                  if (token) {
                    window.__gekToken = token;
                  } else {
                    return { error: 'login_required' };
                  }
                  
                  // 1. Arama Hazırlığı (ss)
                  const ssUrl = 'https://esube.gek.org.tr/MainService/api/rfc/mat/ss?ST=' + encodeURIComponent(${barcodeJson});
                  await fetch(ssUrl, {
                    method: 'GET',
                    headers: { 'accept': 'application/json;charset=UTF-8', 'TOKEN': token, 'sln': '1' },
                    credentials: 'include'
                  }).catch(() => {});

                  // 2. Arama
                  const searchUrl = 'https://esube.gek.org.tr/MainService/api/rfc/mat/sm?ST=' + encodeURIComponent(${barcodeJson}) + '&TYP=3';
                  let searchResp = await fetch(searchUrl, {
                    method: 'GET',
                    headers: { 'accept': 'application/json;charset=UTF-8', 'TOKEN': token, 'sln': '1' },
                    credentials: 'include'
                  });
                  // Token süresi dolmuşsa /gt'den yenile ve tekrar dene
                  if (searchResp.status === 401 || searchResp.status === 403) {
                    try {
                      const gtR = await fetch('https://esube.gek.org.tr/MainService/api/rfc/gt', {
                        method: 'GET',
                        headers: { 'accept': 'application/json;charset=UTF-8' },
                        credentials: 'include'
                      });
                      if (gtR.ok) {
                        let gd = null;
                        try { gd = await gtR.json(); } catch {}
                        const nt = gd && (gd.token || gd.Token || gd.TOKEN || gd.accessToken || gd.access_token || (gd.response && (gd.response.token || gd.response.Token)));
                        if (nt && String(nt).length > 10) {
                          token = String(nt);
                          window.__gekToken = token;
                          
                          // Yeni token ile ss çağrısı
                          await fetch(ssUrl, {
                            method: 'GET',
                            headers: { 'accept': 'application/json;charset=UTF-8', 'TOKEN': token, 'sln': '1' },
                            credentials: 'include'
                          }).catch(() => {});

                          // Yenilenen token ile tekrar dene
                          searchResp = await fetch(searchUrl, {
                            method: 'GET',
                            headers: { 'accept': 'application/json;charset=UTF-8', 'TOKEN': token, 'sln': '1' },
                            credentials: 'include'
                          });
                        }
                      }
                    } catch {}
                  }
                  if (searchResp.status === 500) return { error: 'not_found' };
                  if (searchResp.status === 401 || searchResp.status === 403) return { error: 'login_required' };
                  if (!searchResp.ok) return { error: 'search_http_' + searchResp.status };
                  const searchData = await searchResp.json();
                  const items = searchData && Array.isArray(searchData.ET_MAKTX) ? searchData.ET_MAKTX : [];
                  if (items.length === 0) return { error: 'not_found' };
                  
                  const matnr = String(items[0].MATNR);
                  const name = String(items[0].MAKTX || '');
                  
                  // 2. Detay Çekme
                  const detailUrl = 'https://esube.gek.org.tr/MainService/api/rfc/mat/ms?MATNR=' + encodeURIComponent(matnr);
                  const detailResp = await fetch(detailUrl, {
                    method: 'POST',
                    headers: {
                      'accept': 'application/json;charset=UTF-8',
                      'content-type': 'application/json',
                      'TOKEN': token,
                      'sln': '1'
                    },
                    credentials: 'include',
                    body: '{}'
                  });
                  if (!detailResp.ok) return { error: 'detail_http_' + detailResp.status };
                  const detailData = await detailResp.json();
                  return { ok: true, matnr, name, detailData };
                } catch(e) {
                  return { error: String(e && e.message ? e.message : e) };
                }
              })()
            `);

            if (queryResult.error) {
              throw new Error(queryResult.error === 'not_found' ? 'Ürün Bulunamadı' : queryResult.error);
            }

            if ((window as any).go?.main?.App?.SaveLocalJSON) {
              await (window as any).go.main.App.SaveLocalJSON(gln, "gek_detail_debug.json", JSON.stringify({
                barcode,
                queryResult
              }, null, 2));
            }

            const detailData = queryResult.detailData;
            
            // Stok ve Fiyatları parse et
            const conds = detailData?.ET_A004 || [];
            const zpsf = conds.find((c: any) => c.KSCHL === 'ZPSF' || c.KSCHL === 'Z002');
            const zdep = conds.find((c: any) => c.KSCHL === 'ZDEP' || c.KSCHL === 'Z001' || c.KSCHL === 'ZWHO');
            
            let tmpPsf = 0;
            let tmpDsf = 0;
            if (zpsf) tmpPsf = parseFloat(zpsf.KBETR) || 0;
            if (zdep) tmpDsf = parseFloat(zdep.KBETR) || 0;
            
            if (!tmpPsf) tmpPsf = parseFloat(conds[0]?.KBETR) || parseFloat(detailData?.PSF) || 0;
            if (!tmpDsf) tmpDsf = parseFloat(detailData?.DSF) || tmpPsf * 0.83;

            psfVal = tmpPsf;
            dsfVal = tmpDsf;

            const rawStok = detailData?.ET_MARC?.[0]?.LABST ?? detailData?.LABST ?? 0;
            const stokVal = typeof rawStok === 'number' ? rawStok : parseInt(rawStok || 0);

            // GEK Kampanya (MF) baremleri
            const campaigns = detailData?.ET_KAMPANYA || detailData?.ET_KOMP || [];
            campaigns.forEach((c: any) => {
              if (c.MF) mfList.push(c.MF);
              if (c.NET) netList.push(String(c.NET));
            });

            // Canlı sorguyu önbelleğe yazıyoruz
            cache[barcode] = {
              date: todayStr,
              stok: stokVal,
              fiyat_depocu: dsfVal,
              fiyat_etiket: psfVal,
              mf_baremleri: mfList,
              net_fiyatlar: netList,
              kod: queryResult.matnr || '',
              depo: 'GEK'
            };

            if ((window as any).go?.main?.App?.SaveLocalJSON) {
              await (window as any).go.main.App.SaveLocalJSON(gln, cacheFile, JSON.stringify(cache));
            }

            // Canlı sorgulanan veriler veritabanını güncellemede kullanılır
            await updateDbWithLiveDataLocal(barcode, dsfVal, psfVal, mfList);

            // GEK Sipariş log kaydı yazılır
            try {
              const qtyInCart = cart[barcode]?.qty || 0;
              const entry = {
                tarih:        todayStr,
                barkod:       barcode,
                urun_adi:     name,
                miktar:       qtyInCart,
                urun_kodu:    queryResult.matnr || '',
                fiyat_etiket: +psfVal.toFixed(2),
                fiyat_depocu: +dsfVal.toFixed(2),
                mf1:          mfList[0]  || null,
                mf2:          mfList[1]  || null,
                mf3:          mfList[2]  || null,
                net_fiyat1:   parsePriceLocal(netList[0]),
                net_fiyat2:   parsePriceLocal(netList[1]),
                net_fiyat3:   parsePriceLocal(netList[2]),
                stok_durumu:  stokVal,
                kdv:          1,
                firma_adi:    "",
                urun_tipi:    "Itriyat",
                durum:        'success',
                depo:         'GEK'
              };

              const rawGek = await (window as any).go.main.App.LoadLocalJSON(gln, 'gek_siparisler.json');
              let gekList = [];
              if (rawGek && rawGek !== '{}') {
                try {
                  const parsed = JSON.parse(rawGek);
                  if (Array.isArray(parsed)) gekList = parsed;
                } catch {}
              }
              gekList.push(entry);
              await (window as any).go.main.App.SaveLocalJSON(gln, 'gek_siparisler.json', JSON.stringify(gekList, null, 2));

            } catch (jsonErr) {
              console.error('[AI Order GEK Log] Hata:', jsonErr);
            }

            detail = {
              stokDurumu: stokVal,
              depocuFiyati: dsfVal,
              SonFiyat: psfVal,
              ad: name,
              kod: queryResult.matnr || ''
            };

          } else if (aiSimulationWarehouse === 'alliance') {
            const queryResult: any = await hiddenWebview.executeJavaScript(`
              (async function() {
                try {
                  const sUrl = "https://esiparisv2.alliance-healthcare.com.tr/Item/ElasticSearchItems";
                  const sr = await fetch(sUrl, {
                    method: "POST",
                    headers: { "content-type": "application/json; charset=UTF-8", accept: "application/json, text/plain, */*", "x-requested-with": "XMLHttpRequest" },
                    credentials: "include",
                    body: JSON.stringify({ RequestedPage: 1, SearchText: ${barcodeJson} })
                  });
                  if (!sr.ok) return { error: 'search_failed' };
                  const sd = await sr.json();
                  if (!Array.isArray(sd) || sd.length === 0) return { error: 'not_found' };
                  const item = sd[0];
                  
                  const dUrl = "https://esiparisv2.alliance-healthcare.com.tr/Sales/ItemDetailv2";
                  const dr = await fetch(dUrl, {
                    method: "POST",
                    headers: { "content-type": "application/json; charset=UTF-8", accept: "text/html, */*; q=0.01", "x-requested-with": "XMLHttpRequest" },
                    credentials: "include",
                    body: JSON.stringify({ ItemID: String(item.ID), LoadSimple: true })
                  });
                  let detailHtml = "";
                  if (dr.ok) {
                    detailHtml = await dr.text();
                  }
                  return { item, detailHtml };
                } catch(e) { return { error: String(e) }; }
              })()
            `);
            
            let dsfVal = 0;
            let psfVal = 0;
            let stokVal = 0;
            if (queryResult && !queryResult.error) {
              const item = queryResult.item;
              dsfVal = parseFloat(item.DepotPrice) || 0;
              psfVal = parseFloat(item.LabelPrice) || 0;
              stokVal = parseFloat(item.StockQty) || 0;
              
              const detailHtml = queryResult.detailHtml || "";
              const extractSpansLocal = (htmlStr: string): string[] => {
                if (!htmlStr) return [];
                const matches = htmlStr.match(/<span>(.*?)<\/span>/g);
                if (!matches) return [];
                return matches.map((m: string) => m.replace(/<\/?span>/g, '').trim());
              };
              mfList = extractSpansLocal(detailHtml).filter(b => b.includes('+'));
            } else {
              throw new Error(queryResult?.error || 'Alliance sorgu hatası');
            }
            
            detail = {
              stokDurumu: stokVal,
              depocuFiyati: dsfVal,
              SonFiyat: psfVal,
              ad: name,
              kod: queryResult?.item?.Code || ''
            };

            cache[barcode] = {
              date: todayStr,
              stok: stokVal,
              fiyat_depocu: dsfVal,
              fiyat_etiket: psfVal,
              mf_baremleri: mfList,
              net_fiyatlar: netList,
              kod: queryResult?.item?.Code || '',
              depo: 'ALLIANCE'
            };

            if ((window as any).go?.main?.App?.SaveLocalJSON) {
              await (window as any).go.main.App.SaveLocalJSON(gln, cacheFile, JSON.stringify(cache));
            }

            await updateDbWithLiveDataLocal(barcode, dsfVal, psfVal, mfList);

            try {
              const qtyInCart = cart[barcode]?.qty || 0;
              const entry = {
                tarih:        todayStr,
                barkod:       barcode,
                urun_adi:     name,
                miktar:       qtyInCart,
                urun_kodu:    queryResult?.item?.Code || '',
                fiyat_etiket: +psfVal.toFixed(2),
                fiyat_depocu: +dsfVal.toFixed(2),
                mf1:          mfList[0]  || null,
                mf2:          mfList[1]  || null,
                mf3:          mfList[2]  || null,
                net_fiyat1:   null,
                net_fiyat2:   null,
                net_fiyat3:   null,
                stok_durumu:  stokVal,
                kdv:          1,
                firma_adi:    "",
                urun_tipi:    "Itriyat",
                durum:        'success',
                depo:         'ALLIANCE'
              };
              if ((window as any).go?.main?.App?.AppendOrderResult) {
                await (window as any).go.main.App.AppendOrderResult(gln, entry);
              }
            } catch {}

          } else {
            // A. Ürün Arama (AS Ecza)
            const searchResult: any = await hiddenWebview.executeJavaScript(`
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
                  if (!resp.ok) return { error: 'search_http_' + resp.status };
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

            if (searchResult.error) {
              throw new Error(searchResult.error === 'not_found' ? 'Ürün Bulunamadı' : searchResult.error);
            }

            const { kod, ILACTIP } = searchResult;
            const kodJson = JSON.stringify(kod);
            const ilacTipJson = JSON.stringify(ILACTIP);

            await sleep(150);

            // B. Detay & Kampanya Çekme (AS Ecza)
            const detailResult: any = await hiddenWebview.executeJavaScript(`
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

            if (!detailResult || !detailResult.obj) {
              throw new Error('Detay verisi alınamadı');
            }

            detail = detailResult.obj;
            
            // Tüm kampanya kayıtlarını dolaş: mf alanı boş olmayan ilkini kullan
            const kampanyalar: any[] = Array.isArray(detail?.grdKampanyalar) ? detail.grdKampanyalar : [];
            let mfRaw = '';
            let netRaw = '';
            for (const kamp of kampanyalar) {
              if (kamp?.mf && String(kamp.mf).trim().length > 0) {
                mfRaw  = kamp.mf;
                netRaw = kamp.netFiyat || '';
                break;
              }
            }
            if (!mfRaw && kampanyalar.length > 0) { // Fallback to first if none matched
              mfRaw = kampanyalar[0]?.mf || '';
              netRaw = kampanyalar[0]?.netFiyat || '';
            }
            
            mfList = extractSpansLocal(mfRaw).filter(m => {
              if (!m) return false;
              if (m.toLowerCase().endsWith('+0')) return false;
              return true;
            });
            netList = extractSpansLocal(netRaw);

            dsfVal = parsePriceLocal(detail.depocuFiyati);
            psfVal = parsePriceLocal(detail.tavsiyeEdilenSatisFiyati || detail.SonFiyat || detail.etiketFiyati);

            // Canlı sorguyu önbelleğe yazıyoruz
            cache[barcode] = {
              date: todayStr,
              stok: typeof detail.stokDurumu === 'number' ? detail.stokDurumu : parseInt(detail.stokDurumu || 0),
              fiyat_depocu: dsfVal,
              fiyat_etiket: psfVal,
              mf_baremleri: mfList,
              net_fiyatlar: netList,
              kod: detail.kod || '',
              depo: 'AS ECZA'
            };

            if ((window as any).go?.main?.App?.SaveLocalJSON) {
              await (window as any).go.main.App.SaveLocalJSON(gln, cacheFile, JSON.stringify(cache));
            }

            // Canlı sorgulanan veriler veritabanını güncellemede kullanılır
            await updateDbWithLiveDataLocal(barcode, dsfVal, psfVal, mfList);

            // Ayrıca veritabanına log kaydı yazılır
            try {
              const qtyInCart = cart[barcode]?.qty || 0;
              const entry = {
                tarih:        todayStr,
                barkod:       barcode,
                urun_adi:     name,
                miktar:       qtyInCart,
                urun_kodu:    detail?.kod       || '',
                fiyat_etiket: +psfVal.toFixed(2),
                fiyat_depocu: +dsfVal.toFixed(2),
                mf1:          mfList[0]  || null,
                mf2:          mfList[1]  || null,
                mf3:          mfList[2]  || null,
                net_fiyat1:   parsePriceLocal(netList[0]),
                net_fiyat2:   parsePriceLocal(netList[1]),
                net_fiyat3:   parsePriceLocal(netList[2]),
                stok_durumu:  detail?.stokDurumu || 0,
                kdv:          parseInt(detail?.kdv?.val1 || 0),
                firma_adi:    detail?.firma?.display || "",
                urun_tipi:    detail?.urunTipi || "",
                durum:        'success',
                depo:         'AS ECZA'
              };

              if ((window as any).go?.main?.App?.AppendOrderResult) {
                await (window as any).go.main.App.AppendOrderResult(gln, entry);
              }
            } catch (jsonErr) {
              console.error('[AI Order Log] Hata:', jsonErr);
            }
          }
        }

        // 3. AI Karar & Barem Optimizasyonu



        // Eşdeğer grup verisi (Strateji C)
        /*
        const esdegerGrubu = isEquivalent ? {
          urunler: statsSource.map((u: any) => ({
            ad: u.v2 || '',
            barkod: u.v1 || '',
            stok: Number(u.v4) || 0,
            hiz: Number(u.v20) || 0,
          })),
          toplamStok: currentGroupStock,
          toplamHiz: groupDailySpeed,
          grupOmru: groupDailySpeed > 0 ? Math.round(currentGroupStock / groupDailySpeed) : null,
        } : null;
        */

        // const rawNeed = groupDailySpeed * aiTargetDays - currentGroupStock;
        // const need = Math.max(0, Math.ceil(rawNeed));

        let suggestedQty = 0;
        let chosenBarem: string | null = null;
        let chosenNetPrice = dsfVal;
        let whyData: any = null;

        if (need > 0) {
          suggestedQty = need; // Varsayılan: Saf İhtiyaç

          if (mfList.length > 0 && groupDailySpeed > 0) {
            const parsedBarems = mfList.map((m, idx) => {
              const parts = m.split('+');
              const ana = parseInt(parts[0]) || 0;
              const bedava = parseInt(parts[1]) || 0;
              const netPrice = parsePriceLocal(netList[idx]) || dsfVal * (ana / (ana + bedava));
              return {
                raw: m,
                ana,
                bedava,
                netPrice,
                discount: bedava / (ana + bedava)
              };
            }).filter(b => b.ana > 0);

            // Barem alım miktarına göre küçükten büyüğe sırala
            parsedBarems.sort((a, b) => a.ana - b.ana);

            // 1. Baseline baremi belirle (saf ihtiyacın karşıladığı en büyük barem)
            let baselineBaremObj = null;
            for (let i = parsedBarems.length - 1; i >= 0; i--) {
              if (parsedBarems[i].ana <= need) {
                baselineBaremObj = parsedBarems[i];
                break;
              }
            }
            
            const baselineNetPrice = baselineBaremObj ? baselineBaremObj.netPrice : dsfVal;
            const baselineBaremRaw = baselineBaremObj ? baselineBaremObj.raw : null;

            // 2. Default değerleri baseline durumuna göre ayarla
            if (baselineBaremObj && (baselineBaremObj.ana + baselineBaremObj.bedava) >= need) {
              suggestedQty = baselineBaremObj.ana;
              chosenBarem = baselineBaremObj.raw;
              chosenNetPrice = baselineBaremObj.netPrice;
            }

            // 3. Her baremi analiz et
            const analyzedBarems = parsedBarems.map(b => {
              const totalFreeQty = b.ana + b.bedava;
              const totalDays = (currentGroupStock + totalFreeQty) / groupDailySpeed;
              const deltaDays = totalFreeQty / groupDailySpeed;
              const deltaMonths = deltaDays / 30;
              const carryingCostPct = deltaMonths * (aiMonthlyCarryingCost / 100);
              
              // Getiri oranı (baseline net fiyata göre)
              const currentMfRatio = (b.ana + b.bedava) > 0 ? b.bedava / (b.ana + b.bedava) : 0;
              const baselineMfRatio = baselineBaremObj && (baselineBaremObj.ana + baselineBaremObj.bedava) > 0 
                ? baselineBaremObj.bedava / (baselineBaremObj.ana + baselineBaremObj.bedava) 
                : 0;
              const gainPct = Math.max(0, currentMfRatio - baselineMfRatio);
              const netReturn = gainPct - carryingCostPct;

              let status = 'pending';
              let reason = '';

              if (aiMaxDays < 9999 && totalDays > aiMaxDays) {
                status = 'rejected_max_days';
                reason = `${Math.round(totalDays)} gün`;
              } else if (b.raw === baselineBaremRaw) {
                status = 'baseline_covered';
                reason = 'Referans barem (Saf İhtiyaç)';
              } else if (netReturn <= 0) {
                status = 'rejected_carrying_cost';
                reason = `Maliyet (%${(carryingCostPct * 100).toFixed(1)}) > Kazanç (%${(gainPct * 100).toFixed(1)})`;
              } else {
                status = 'profitable';
                reason = `Net Getiri: %${(netReturn * 100).toFixed(1)}`;
              }

              return {
                raw: b.raw,
                ana: b.ana,
                bedava: b.bedava,
                netPrice: b.netPrice,
                gainPct,
                carryingCostPct,
                netReturn,
                status,
                reason
              };
            });

            // 3. En kârlı olan (profitable statuslu ve netReturn değeri en yüksek) baremi seç
            const profitableBarems = analyzedBarems.filter(b => b.status === 'profitable');
            profitableBarems.sort((a, b) => b.netReturn - a.netReturn);

            let bestBarem = profitableBarems[0] || null;

            if (bestBarem) {
              suggestedQty = bestBarem.ana;
              chosenBarem = bestBarem.raw;
              chosenNetPrice = bestBarem.netPrice;
            }

            whyData = {
              need,
              targetDays: aiTargetDays,
              baselineBarem: baselineBaremRaw,
              baselineNetPrice,
              carryingCostRate: aiMonthlyCarryingCost,
              barems: analyzedBarems
            };
          }
        }

        const estFutureLifetime = groupDailySpeed > 0
          ? Math.round((currentGroupStock + suggestedQty + (chosenBarem ? (parseInt(chosenBarem.split('+')[1]) || 0) : 0)) / groupDailySpeed)
          : null;

        results.push({
          barkod: barcode,
          ad: name,
          stok: currentGroupStock,
          hiz: groupDailySpeed * 30, // monthly speed
          ihtiyac: need,
          onerilen: suggestedQty,
          secilenBarem: chosenBarem,
          yeniOmur: estFutureLifetime,
          depocuFiyati: dsfVal,
          netFiyat: chosenBarem ? chosenNetPrice : null,
          toplamTutar: suggestedQty * dsfVal,
          isCached: isFromCache,
          baremler: mfList,
          netFiyatlar: netList,
          whyData,
          esdegerGrubu,
          selected: true,
        });

      } catch (err) {
        console.error(`AI simülasyon hatası [${name}]:`, err);
        results.push({
          barkod: barcode,
          ad: name,
          stok: 0,
          hiz: 0,
          ihtiyac: 0,
          onerilen: 0,
          secilenBarem: null,
          yeniOmur: null,
          depocuFiyati: 0,
          netFiyat: null,
          toplamTutar: 0,
          hata: String(err?.message || err || 'Sorgu Hatası'),
          baremler: [],
          netFiyatlar: [],
          selected: true
        });
      }

      setAiResults([...results]);
      if (results[results.length - 1].isCached) {
        // Cache'ten okunduysa bekleme süresini atla
        await sleep(10);
      } else {
        await sleep(150);
      }
    }

    setAiResults([...results]);
    setAiSimulating(false);
    setAiProgress('');
    } catch (err: any) {
      alert("Simülasyon başlatılamadı: " + String(err?.message || err));
      setAiSimulating(false);
      setAiProgress('');
    }
  };

  const handleBaremSelect = (productBarcode: string, barem: string | null) => {
    setAiResults(prev => prev.map(item => {
      if (item.barkod !== productBarcode) return item;
      
      const isAlreadySelected = item.secilenBarem === barem;
      const newBarem = isAlreadySelected ? null : barem;
      
      let newQty = item.ihtiyac;
      let newNetFiyat = item.depocuFiyati;
      
      if (newBarem) {
        const parts = newBarem.split('+');
        const ana = parseInt(parts[0]) || 0;
        const bedava = parseInt(parts[1]) || 0;
        
        newQty = ana;
        
        const idx = item.baremler ? item.baremler.indexOf(newBarem) : -1;
        if (idx !== -1 && item.netFiyatlar?.[idx]) {
          newNetFiyat = parsePriceLocal(item.netFiyatlar[idx]);
        } else {
          newNetFiyat = item.depocuFiyati * (ana / (ana + bedava));
        }
      }
      
      const monthlySpeed = item.hiz; // monthly speed (dailySpeed * 30)
      const dailySpeed = monthlySpeed / 30;
      const bedavaQty = newBarem ? (parseInt(newBarem.split('+')[1]) || 0) : 0;
      const estFutureLifetime = dailySpeed > 0
        ? Math.round((item.stok + newQty + bedavaQty) / dailySpeed)
        : null;
        
      return {
        ...item,
        secilenBarem: newBarem,
        onerilen: newQty,
        netFiyat: newBarem ? newNetFiyat : null,
        toplamTutar: newQty * item.depocuFiyati,
        yeniOmur: estFutureLifetime
      };
    }));
  };

  const handleDeleteResult = (productBarcode: string) => {
    setAiResults(prev => prev.filter(item => item.barkod !== productBarcode));
  };

  const handleDeleteUrgentResult = (productBarcode: string) => {
    setUrgentResults(prev => prev.filter(item => item.barkod !== productBarcode));
  };

  const handleApplyAISuggestions = () => {
    const newCart = { ...cart };
    aiResults.forEach(r => {
      if (r.onerilen > 0 && !r.hata && r.selected) {
        const urun = data?.gruplar?.flatMap((g: any) => g.detaylar).find((u: any) => u.v1 === r.barkod) as any;
        if (urun) {
          // Seçilen baremin bedava miktarı
          const parts = r.secilenBarem ? r.secilenBarem.split('+') : null;
          const bedava = parts ? parseInt(parts[1]) || 0 : 0;

          // Simülasyondan gelen güncel MF baremleri (string "50+5" → {ana:50, mf:5} formatına çevir)
          const liveMfBaremleri: { ana: number; mf: number }[] = (r.baremler || []).reduce((acc: { ana: number; mf: number }[], raw: string) => {
            const p = raw.split('+');
            const ana = parseInt(p[0]) || 0;
            const mf = parseInt(p[1]) || 0;
            if (ana > 0 && mf > 0) acc.push({ ana, mf });
            return acc;
          }, []);

          newCart[r.barkod] = {
            qty: r.onerilen,
            mf: bedava,
            inCart: true,
            ad: urun.v2,
            depo: urun.v91 || loadDepolar().find(d => d.id === aiSimulationWarehouse)?.ad || 'AS ECZA',
            v95: urun.v95 || null,
            // Güncel MF baremleri: simülasyondan gelen canlı veri öncelikli
            mf_baremleri: liveMfBaremleri.length > 0 ? liveMfBaremleri : (urun.mf_baremleri || [])
          };
        }
      }
    });
    setCart(newCart);
    setShowAIModal(false);
    alert('✨ AI Önerileri başarıyla sepete eklendi');
  };

  const getUrgentProducts = () => {
    const list: any[] = [];
    if (!data?.gruplar) return list;
    
    data.gruplar.forEach((g: any) => {
      (g.detaylar || []).forEach((u: any) => {
        const stock = u.v4 || 0;
        const dailySpeed = u.v20 || 0;
        const monthlySpeed = dailySpeed * 30;
        const daysInactive = u.v21 || 0;
        
        // Son gelen veri paketinde işlem görmüş: gün farkı 0 veya 1 gün
        const isProcessed = (daysInactive <= 1);
        
        if (isProcessed) {
          const estOmur = dailySpeed > 0 ? (stock / dailySpeed) : 9999;
          const isOutOfStock = (stock <= 0);
          const isLifetimeShort = (estOmur < 2);
          
          if (isOutOfStock || isLifetimeShort) {
            list.push({
              barkod: u.v1,
              ad: u.v2,
              stok: stock,
              dailySpeed,
              hiz: monthlySpeed,
              daysInactive,
              estOmur: dailySpeed > 0 ? Math.round(stock / dailySpeed) : 0,
              rawUrun: u,
              group: g
            });
          }
        }
      });
    });
    
    // Aylık hız değerlerine göre çoktan aza sırala
    return list.sort((a, b) => b.hiz - a.hiz);
  };

  const handleUrgentBaremSelect = (productBarcode: string, barem: string | null) => {
    setUrgentResults(prev => prev.map(item => {
      if (item.barkod !== productBarcode) return item;
      
      const isAlreadySelected = item.secilenBarem === barem;
      const newBarem = isAlreadySelected ? null : barem;
      
      let newQty = item.stok <= 0 ? Math.max(1, Math.ceil(item.dailySpeed * 7)) : 1;
      let newNetFiyat = item.depocuFiyati;
      
      if (newBarem) {
        const parts = newBarem.split('+');
        const ana = parseInt(parts[0]) || 0;
        const bedava = parseInt(parts[1]) || 0;
        
        newQty = ana;
        
        const idx = item.baremler ? item.baremler.indexOf(newBarem) : -1;
        if (idx !== -1 && item.netFiyatlar?.[idx]) {
          newNetFiyat = parsePriceLocal(item.netFiyatlar[idx]);
        } else {
          newNetFiyat = item.depocuFiyati * (ana / (ana + bedava));
        }
      }
      
      return {
        ...item,
        secilenBarem: newBarem,
        onerilen: newQty,
        netFiyat: newBarem ? newNetFiyat : null,
        toplamTutar: newQty * item.depocuFiyati
      };
    }));
  };

  const handleApplyUrgentSuggestions = () => {
    const newCart = { ...cart };
    urgentResults.forEach(r => {
      if (r.onerilen > 0 && !r.hata && r.selected) {
        const urun = data?.gruplar?.flatMap((g: any) => g.detaylar).find((u: any) => u.v1 === r.barkod) as any;
        if (urun) {
          const parts = r.secilenBarem ? r.secilenBarem.split('+') : null;
          const bedava = parts ? parseInt(parts[1]) || 0 : 0;
          
          const liveMfBaremleri: { ana: number; mf: number }[] = (r.baremler || []).reduce((acc: { ana: number; mf: number }[], raw: string) => {
            const p = raw.split('+');
            const ana = parseInt(p[0]) || 0;
            const mf = parseInt(p[1]) || 0;
            if (ana > 0 && mf > 0) acc.push({ ana, mf });
            return acc;
          }, []);
          
          newCart[r.barkod] = {
            qty: r.onerilen,
            mf: bedava,
            inCart: true,
            ad: urun.v2,
            depo: urun.v91 || loadDepolar().find(d => d.id === urgentWarehouse)?.ad || 'AS ECZA',
            v95: urun.v95 || null,
            mf_baremleri: liveMfBaremleri.length > 0 ? liveMfBaremleri : (urun.mf_baremleri || [])
          };
        }
      }
    });
    setCart(newCart);
    setShowUrgentModal(false);
    alert('⚡ Acil Sipariş Önerileri başarıyla sepete eklendi');
  };

  const handleExportUrgentExcel = () => {
    if (urgentResults.length === 0) return;
    const itemsToSend = urgentResults.filter(r => r.onerilen > 0);
    if (itemsToSend.length === 0) {
      alert("Sipariş adeti girilmiş acil ürün bulunamadı.");
      return;
    }
    const rows = itemsToSend.map(r => ({
      'Ürün Adı': r.ad,
      'Barkod': r.barkod,
      'Sipariş Adeti': r.onerilen,
      'Sipariş MF\'si': r.secilenBarem || 'Yok'
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Acil Sipariş Raporu');
    XLSX.writeFile(wb, 'acil_siparis_raporu.xlsx');
  };

  const handleExportUrgentPdf = () => {
    if (urgentResults.length === 0) return;
    const itemsToSend = urgentResults.filter(r => r.onerilen > 0);
    if (itemsToSend.length === 0) {
      alert("Sipariş adeti girilmiş acil ürün bulunamadı.");
      return;
    }

    const printStyle = document.createElement('style');
    printStyle.id = 'urgent-print-style';
    printStyle.innerHTML = `
      @media print {
        body * {
          display: none !important;
        }
        #urgent-print-container, #urgent-print-container * {
          display: block !important;
        }
        #urgent-print-container {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          display: block !important;
          font-family: 'Inter', sans-serif;
          color: #334155;
          padding: 20px;
        }
        h1 {
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 20px;
          color: #b91c1c;
          border-bottom: 2px solid #fecaca;
          padding-bottom: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th {
          background-color: #fef2f2;
          color: #991b1b;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 9px;
          letter-spacing: 0.05em;
          padding: 10px 8px;
          border-bottom: 1px solid #fca5a5;
          text-align: left;
        }
        td {
          padding: 10px 8px;
          border-bottom: 1px solid #fee2e2;
          font-size: 11px;
          color: #334155;
        }
        tr:nth-child(even) td {
          background-color: #fffaf9;
        }
        .footer {
          margin-top: 30px;
          font-size: 10px;
          color: #94a3b8;
          text-align: right;
        }
      }
    `;

    const printContainer = document.createElement('div');
    printContainer.id = 'urgent-print-container';
    printContainer.innerHTML = `
      <h1>Acil Sipariş Raporu</h1>
      <table>
        <thead>
          <tr>
            <th>Ürün Adı</th>
            <th>Barkod</th>
            <th>Sipariş Adeti</th>
            <th>Sipariş MF'si</th>
          </tr>
        </thead>
        <tbody>
          ${itemsToSend.map(r => `
            <tr>
              <td>${r.ad}</td>
              <td>${r.barkod}</td>
              <td>${r.onerilen}</td>
              <td>${r.secilenBarem || 'Yok'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="footer">Oluşturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')}</div>
    `;

    document.body.appendChild(printStyle);
    document.body.appendChild(printContainer);
    
    window.print();
    
    setTimeout(() => {
      document.getElementById('urgent-print-style')?.remove();
      document.getElementById('urgent-print-container')?.remove();
    }, 1000);
  };

  const handleShareUrgentWhatsapp = () => {
    if (urgentResults.length === 0) return;
    
    let text = `🚨 *ACİL SİPARİŞ RAPORU (${new Date().toLocaleDateString('tr-TR')})* 🚨\n\n`;
    const itemsToSend = urgentResults.filter(r => r.onerilen > 0);
    if (itemsToSend.length === 0) {
      alert("Sipariş adeti girilmiş acil ürün bulunamadı.");
      return;
    }
    
    itemsToSend.forEach((r, idx) => {
      text += `${idx + 1}) *${r.ad}*\n`;
      text += `   Barkod: ${r.barkod}\n`;
      text += `   Sipariş: *${r.onerilen} Adet*${r.secilenBarem ? ` (MF: ${r.secilenBarem})` : ''}\n\n`;
    });
    
    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    window.location.href = url;
  };

  const handleExportAIExcel = () => {
    if (aiResults.length === 0) return;
    const itemsToSend = aiResults.filter(r => r.onerilen > 0 && !r.hata);
    if (itemsToSend.length === 0) {
      alert("Sipariş adeti girilmiş ürün bulunamadı.");
      return;
    }
    const rows = itemsToSend.map(r => ({
      'Ürün Adı': r.ad,
      'Barkod': r.barkod,
      'Sipariş Adeti': r.onerilen,
      'Sipariş MF\'si': r.secilenBarem || 'Yok'
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Akıllı Sipariş Raporu');
    XLSX.writeFile(wb, 'akilli_siparis_raporu.xlsx');
  };

  const handleExportAIPdf = () => {
    if (aiResults.length === 0) return;
    const itemsToSend = aiResults.filter(r => r.onerilen > 0 && !r.hata);
    if (itemsToSend.length === 0) {
      alert("Sipariş adeti girilmiş ürün bulunamadı.");
      return;
    }

    const printStyle = document.createElement('style');
    printStyle.id = 'ai-print-style';
    printStyle.innerHTML = `
      @media print {
        body * {
          display: none !important;
        }
        #ai-print-container, #ai-print-container * {
          display: block !important;
        }
        #ai-print-container {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          display: block !important;
          font-family: 'Inter', sans-serif;
          color: #334155;
          padding: 20px;
        }
        h1 {
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 20px;
          color: #5b21b6;
          border-bottom: 2px solid #ddd6fe;
          padding-bottom: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th {
          background-color: #f5f3ff;
          color: #5b21b6;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 9px;
          letter-spacing: 0.05em;
          padding: 10px 8px;
          border-bottom: 1px solid #c084fc;
          text-align: left;
        }
        td {
          padding: 10px 8px;
          border-bottom: 1px solid #f3e8ff;
          font-size: 11px;
          color: #334155;
        }
        tr:nth-child(even) td {
          background-color: #faf5ff;
        }
        .footer {
          margin-top: 30px;
          font-size: 10px;
          color: #94a3b8;
          text-align: right;
        }
      }
    `;

    const printContainer = document.createElement('div');
    printContainer.id = 'ai-print-container';
    printContainer.innerHTML = `
      <h1>Akıllı Sipariş Raporu</h1>
      <table>
        <thead>
          <tr>
            <th>Ürün Adı</th>
            <th>Barkod</th>
            <th>Sipariş Adeti</th>
            <th>Sipariş MF'si</th>
          </tr>
        </thead>
        <tbody>
          ${itemsToSend.map(r => `
            <tr>
              <td>${r.ad}</td>
              <td>${r.barkod}</td>
              <td>${r.onerilen}</td>
              <td>${r.secilenBarem || 'Yok'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="footer">Oluşturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')}</div>
    `;

    document.body.appendChild(printStyle);
    document.body.appendChild(printContainer);
    
    window.print();
    
    setTimeout(() => {
      document.getElementById('ai-print-style')?.remove();
      document.getElementById('ai-print-container')?.remove();
    }, 1000);
  };

  const handleShareAIWhatsapp = () => {
    if (aiResults.length === 0) return;
    
    let text = `🤖 *AKILLI SİPARİŞ RAPORU (${new Date().toLocaleDateString('tr-TR')})* 🤖\n\n`;
    const itemsToSend = aiResults.filter(r => r.onerilen > 0 && !r.hata);
    if (itemsToSend.length === 0) {
      alert("Sipariş adeti girilmiş ürün bulunamadı.");
      return;
    }
    
    itemsToSend.forEach((r, idx) => {
      text += `${idx + 1}) *${r.ad}*\n`;
      text += `   Barkod: ${r.barkod}\n`;
      text += `   Sipariş: *${r.onerilen} Adet*${r.secilenBarem ? ` (MF: ${r.secilenBarem})` : ''}\n\n`;
    });
    
    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    window.location.href = url;
  };

  const runUrgentQuery = async () => {
    try {
      const gln = data?.gln || 'local';
      const todayStr = new Date().toLocaleDateString('en-CA');
      const targetDaysLimit = urgentDaysLimit === 'aySonu' ? getDaysUntilMonthEnd() : urgentDaysLimit;
      let cacheFile = '';

      if (appSettings.scan_before_simulation) {
        setSyncStatusMsg("Simülasyon öncesi değişen satırlar taranıyor...");
        try {
          await (window as any).go.main.App.TriggerSyncAndAnalysis(gln, false);
          const res = await fetchEczaneData("");
          if (res) setData(res);
        } catch (err) {
          console.error("Incremental scan before simulation failed:", err);
        }
        setSyncStatusMsg("");
      }

      const updateDbWithLiveDataLocal = async (barcode: string, dsf: number, psf: number, mfList: string[]) => {
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
            if (mf <= 0) return null;
            return { ana, mf };
          };

          mfList.forEach(rawMf => {
            const parsed = parseMfBarem(rawMf);
            if (parsed) dbMfBaremleri.push(parsed);
          });

          const mfBaremleriStr = JSON.stringify(dbMfBaremleri);

          if ((window as any).go?.main?.App?.RunCategoryAction) {
            await (window as any).go.main.App.RunCategoryAction(
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
          }
        } catch (err) {
          console.error(`[Urgent Database Update] ${barcode} güncelleme hatası:`, err);
        }
      };

      let cache: Record<string, any> = {};
      try {
        if ((window as any).go?.main?.App?.LoadLocalJSON) {
          const orderFile = urgentWarehouse === 'gek' ? 'gek_siparisler.json' : 'as_siparisler.json';
          const rawSiparisler = await (window as any).go.main.App.LoadLocalJSON(gln, orderFile);
          if (rawSiparisler && rawSiparisler !== '{}') {
            const parsed = JSON.parse(rawSiparisler);
            if (Array.isArray(parsed)) {
              parsed.forEach((entry: any) => {
                if (entry.barkod && entry.tarih && entry.durum === 'success') {
                  const dateStr = entry.tarih.includes('T') ? entry.tarih.split('T')[0] : entry.tarih;
                  const mf_baremleri = [entry.mf1, entry.mf2, entry.mf3].filter(Boolean) as string[];
                  const net_fiyatlar = [entry.net_fiyat1, entry.net_fiyat2, entry.net_fiyat3]
                    .filter(val => val && Number(val) > 0)
                    .map(val => String(val));

                  cache[entry.barkod] = {
                    date: dateStr,
                    stok: entry.stok_durumu || 0,
                    fiyat_depocu: entry.fiyat_depocu || 0,
                    fiyat_etiket: entry.fiyat_etiket || 0,
                    mf_baremleri: mf_baremleri,
                    net_fiyatlar: net_fiyatlar,
                    kod: entry.urun_kodu || '',
                    depo: entry.depo || loadDepolar().find(d => d.id === urgentWarehouse)?.ad || 'AS ECZA'
                  };
                }
              });
            }
          }
          
          cacheFile = urgentWarehouse === 'gek' ? 'gek_query_cache.json' : (urgentWarehouse === 'alliance' ? 'alliance_query_cache.json' : (urgentWarehouse === 'as' || urgentWarehouse === 'as_ecza' ? 'as_ecza_query_cache.json' : `${urgentWarehouse}_query_cache.json`));
          const cacheStr = await (window as any).go.main.App.LoadLocalJSON(gln, cacheFile);
          if (cacheStr && cacheStr !== '{}') {
            const legacyCache = JSON.parse(cacheStr);
            Object.keys(legacyCache).forEach(barcode => {
              cache[barcode] = legacyCache[barcode];
            });
          }
        }
      } catch (e) {
        console.log("[Urgent Order] Önbellek yüklenemedi:", e);
      }

      const productsToQuery = getUrgentProducts();

      if (productsToQuery.length === 0) {
        alert("Acil sipariş için uygun ürün bulunamadı.");
        return;
      }

      let hiddenWebview: any = null;
      let targetDomain = 'asecza.com.tr';
      if (urgentWarehouse === 'gek') targetDomain = 'esube.gek.org.tr';
      else if (urgentWarehouse === 'alliance') targetDomain = 'alliance';
      else if (urgentWarehouse === 'selcuk') targetDomain = 'selcukecza.com.tr';
      else if (urgentWarehouse === 'nevzat') targetDomain = 'nevzatecza.com.tr';
      else if (urgentWarehouse === 'cam') targetDomain = 'camecza.com';
      else {
        const foundDepo = loadDepolar().find(d => d.id === urgentWarehouse);
        if (foundDepo) {
          try {
            targetDomain = new URL(foundDepo.url).hostname.replace('www.', '');
          } catch {}
        }
      }
      
      const warehouseName = loadDepolar().find(d => d.id === urgentWarehouse)?.ad || 'AS Ecza';

      if (!urgentSkipMfQuery) {
        // Öncelikle depo ID'sine göre doğrudan eşleştirmeyi dene
        const directEl = sharedWebviewRefs.current[urgentWarehouse];
        if (directEl && typeof directEl.executeJavaScript === 'function') {
          hiddenWebview = directEl;
        }
        
        // Bulunamazsa URL tabanlı geri çekilme (fallback) eşleştirmesini yap
        if (!hiddenWebview) {
          for (const [id, el] of Object.entries(sharedWebviewRefs.current)) {
            if (el && typeof el.executeJavaScript === 'function') {
              try {
                const url: string = await el.executeJavaScript('location.href');
                if (url.includes(targetDomain) || 
                    ((urgentWarehouse === 'as' || urgentWarehouse === 'as_ecza') && url.includes('127.0.0.1') && url.includes('Siparis')) ||
                    (urgentWarehouse === 'alliance' && (url.includes('alliance-healthcare.com') || url.includes('alliance')))) {
                  hiddenWebview = el;
                  break;
                }
              } catch (e) {}
            }
          }
        }
      }

      if (!hiddenWebview) {
        if (!urgentSkipMfQuery) {
          const proceed = window.confirm(`${warehouseName} oturumu bulunamadı.\n\nYalnızca önbellek verileriyle (MF sorgulaması yapılmadan) simülasyonu başlatmak ister misiniz?\n\nTamam → Önbellek ile devam et\nİptal → Simülasyonu durdur`);
          if (!proceed) return;
        }
        // hiddenWebview null kalıyor; döngü önbellek verisini kullanacak
      }

      if (urgentWarehouse === 'gek' && hiddenWebview) {
        try {
          const currentUrl: string = await hiddenWebview.executeJavaScript('location.href');
          if (currentUrl.includes('irj/portal') && !currentUrl.includes('FrameWorkT1')) {
            hiddenWebview.loadURL('https://esube.gek.org.tr/FrameWorkT1/');
            await new Promise<void>((resolve) => {
              const timeout = setTimeout(() => resolve(), 8000);
              const checkReady = setInterval(async () => {
                try {
                  const url: string = await hiddenWebview.executeJavaScript('location.href');
                  if (url.includes('FrameWorkT1')) {
                    clearInterval(checkReady);
                    clearTimeout(timeout);
                    setTimeout(() => resolve(), 2000);
                  }
                } catch {}
              }, 500);
            });
          }
        } catch {}
      }

      const hasUncached = productsToQuery.some(p => !cache[p.barkod] || cache[p.barkod].date !== todayStr);
      if (hasUncached && hiddenWebview) {
        try {
          const currentUrl: string = await hiddenWebview.executeJavaScript('location.href');
          const isLoginRequired = currentUrl.includes('/Login.aspx') || currentUrl.includes('login.aspx');
          if (isLoginRequired) {
            alert(`${warehouseName} oturumunuz sonlanmış veya giriş yapılmamış. Lütfen 'Depolar' sekmesinden ${warehouseName}'ya giriş yapın.`);
            return;
          }
        } catch (err) {
          alert(`${warehouseName} durum kontrolü başarısız oldu: ` + String(err));
          return;
        }
      }

      setUrgentSimulating(true);
      setUrgentResults([]);

      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
      const results: any[] = [];

      const extractSpansLocal = (htmlStr: string): string[] => {
        if (!htmlStr) return [];
        const matches = htmlStr.match(/<span>(.*?)<\/span>/g);
        if (!matches) return [];
        return matches.map(m => m.replace(/<\/?span>/g, '').trim());
      };

      for (let i = 0; i < productsToQuery.length; i++) {
        const item = productsToQuery[i];
        const barcode = item.barkod;
        const name = item.ad;

        setUrgentProgress(`Canlı veriler kontrol ediliyor [${i + 1}/${productsToQuery.length}]: ${name}`);

        try {
          // ── SKIP MODE: depodan sorgu yapma, bellekte varsa kullan ──────────────
          if (urgentSkipMfQuery) {
            setUrgentProgress(`Simüle ediliyor [${i + 1}/${productsToQuery.length}]: ${name}`);
            const cachedEntry = cache[barcode];
            const isFromCache = !!(cachedEntry && cachedEntry.date === todayStr);
            const dsfSkip  = isFromCache ? (cachedEntry.fiyat_depocu || 0) : 0;
            const psfSkip  = isFromCache ? (cachedEntry.fiyat_etiket || 0) : 0;
            const mfSkip   = isFromCache ? (cachedEntry.mf_baremleri  || []) : [];
            const netSkip  = isFromCache ? (cachedEntry.net_fiyatlar  || []) : [];

            const itemStock  = item.stok ?? 0;
            const dailySpd   = item.dailySpeed ?? ((item.hiz ?? 0) / 30);
            const monthlySpd = item.hiz ?? 0;
            const rawNeed    = dailySpd * targetDaysLimit - itemStock;
            const need       = Math.max(0, Math.ceil(rawNeed));
            let   skipQty    = need > 0 ? need : (itemStock <= 0 ? Math.max(1, Math.ceil(dailySpd * 7)) : 1);

            let skipBarem: string | null = null;
            let skipNetPrice = dsfSkip;
            if (mfSkip.length > 0 && need > 0 && dsfSkip > 0) {
              const parsed = mfSkip.map((m: string, idx: number) => {
                const parts = m.split('+');
                const ana   = parseInt(parts[0]) || 0;
                const bedava = parseInt(parts[1]) || 0;
                const np = parsePriceLocal(netSkip[idx]) || (ana + bedava > 0 ? dsfSkip * ana / (ana + bedava) : dsfSkip);
                return { raw: m, ana, bedava, np };
              }).filter((b: any) => b.ana > 0).sort((a: any, b: any) => a.ana - b.ana);

              for (let bi = parsed.length - 1; bi >= 0; bi--) {
                if (parsed[bi].ana <= need) {
                  skipBarem    = parsed[bi].raw;
                  skipQty      = parsed[bi].ana;
                  skipNetPrice = parsed[bi].np;
                  break;
                }
              }
            }

            results.push({
              barkod:       barcode,
              ad:           name,
              stok:         itemStock,
              hiz:          monthlySpd,
              dailySpeed:   dailySpd,
              estOmur:      item.estOmur ?? 0,
              depoStok:     isFromCache ? (cachedEntry.stok || 0) : 0,
              depocuFiyati: dsfSkip,
              fiyatEtiket:  psfSkip,
              secilenBarem: skipBarem,
              onerilenMf:   skipBarem,
              onerilen:     skipQty,
              netFiyat:     skipBarem ? skipNetPrice : null,
              toplamTutar:  skipQty * dsfSkip,
              isCached:     isFromCache,
              baremler:     mfSkip,
              netFiyatlar:  netSkip,
              whyData:      null,
              esdegerGrubu: null,
              selected:     true,
              hata:         null,
            });
            setUrgentResults([...results]);
            await sleep(10);
            continue;
          }
          // ── END SKIP MODE ────────────────────────────────────────────────────────

          const cached = cache[barcode];
          let detail: any = null;
          let mfList: string[] = [];
          let netList: string[] = [];
          let dsfVal = 0;
          let psfVal = 0;
          let isFromCache = false;

          if (cached && cached.date === todayStr) {
            isFromCache = true;
            dsfVal = cached.fiyat_depocu;
            psfVal = cached.fiyat_etiket;
            mfList = cached.mf_baremleri || [];
            netList = cached.net_fiyatlar || [];
            detail = {
              stokDurumu: cached.stok,
              depocuFiyati: dsfVal,
              SonFiyat: psfVal,
              ad: name,
              kod: cached.kod || ''
            };
          } else {
            // Önbellekte yoksa, canlı sorgu atıyoruz
            if (!hiddenWebview) {
              // Depo bağlantısı yok veya MF sorgulaması atlandı
              const daysLimitCount = urgentDaysLimit === 'aySonu' ? getDaysUntilMonthEnd() : urgentDaysLimit;
              const itemStock = item.stok ?? 0;
              const itemSpeed = item.hiz ?? 0;
              const rawNeed = itemSpeed * daysLimitCount - itemStock;
              const need = Math.max(0, Math.ceil(rawNeed));
              results.push({
                barkod: barcode,
                ad: name,
                stok: itemStock,
                hiz: itemSpeed,
                estOmur: item.estOmur ?? 0,
                onerilen: urgentSkipMfQuery ? need : 0,
                baremler: [],
                secilenBarem: null,
                onerilenMf: null,
                depocuFiyati: 0,
                fiyatEtiket: 0,
                netFiyat: null,
                toplamTutar: 0,
                depo: '',
                isCached: false,
                hata: urgentSkipMfQuery ? null : 'Depo bağlantısı yok — önbellekte veri bulunamadı',
                selected: true
              });
              setUrgentResults([...results]);
              await sleep(10);
              continue;
            }
            const barcodeJson = JSON.stringify(barcode);

            if (urgentWarehouse === 'gek') {
              const localGekToken = (typeof window !== 'undefined' ? localStorage.getItem('nexus_gek_token') : '') || '';
              const queryResult: any = await hiddenWebview.executeJavaScript(`
                (async function() {
                  try {
                    let token = window.__gekToken || ${JSON.stringify(localGekToken)} || "";
                    if (!token) {
                      const stores = [window.localStorage, window.sessionStorage];
                      const keys = ['token','Token','TOKEN','gek_token','gekToken','accessToken','access_token','auth_token','authToken','jwt','JWT'];
                      for (const store of stores) {
                        if (token) break;
                        if (!store) continue;
                        for (const k of keys) {
                          try {
                            const v = store.getItem(k);
                            if (v && v.length > 10 && !v.startsWith('{')) { token = v; break; }
                            if (v && v.length > 10) {
                              try { const j = JSON.parse(v); const t = j.token||j.Token||j.TOKEN||j.accessToken||j.access_token||j.currentSession?.access_token; if(t) { token = t; break; } } catch {}
                            }
                          } catch {}
                        }
                        if (token) break;
                        try {
                          for (let i = 0; i < store.length; i++) {
                            const k = store.key(i);
                            if (!k) continue;
                            const v = store.getItem(k);
                            if (!v) continue;
                            if (v.length > 10 && !v.startsWith('{') && (k.toLowerCase().includes('token') || k.toLowerCase().includes('auth') || k.toLowerCase().includes('jwt'))) {
                              token = v;
                              break;
                            }
                            try { 
                              const j = JSON.parse(v); 
                              const t = j.token||j.Token||j.TOKEN||j.accessToken||j.access_token||j.currentSession?.access_token; 
                              if(t && String(t).length > 10) { token = String(t); break; }
                            } catch {}
                          }
                        } catch {}
                      }
                    }
                    if (!token) {
                      try {
                        const cookies = document.cookie.split(';');
                        for (const c of cookies) {
                          const [k, v] = c.trim().split('=');
                          if (k && ['token','Token','TOKEN','auth','jwt'].some(kk => k.toLowerCase().includes(kk))) {
                            if (v && v.length > 10) { token = decodeURIComponent(v); break; }
                          }
                        }
                      } catch {}
                    }
                    if (!token) {
                      try {
                        const gtResp = await fetch('https://esube.gek.org.tr/MainService/api/rfc/gt', {
                          method: 'GET',
                          headers: { 'accept': 'application/json;charset=UTF-8' },
                          credentials: 'include'
                        });
                        if (gtResp.ok) {
                          let gtData = null;
                          try { gtData = await gtResp.json(); } catch { gtData = null; }
                          const tok = gtData && (gtData.token || gtData.Token || gtData.TOKEN || gtData.accessToken || gtData.access_token || (gtData.response && (gtData.response.token || gtData.response.Token)));
                          if (tok && String(tok).length > 10) {
                            token = String(tok);
                          }
                        }
                      } catch {}
                    }
                    if (token) {
                      window.__gekToken = token;
                    } else {
                      return { error: 'login_required' };
                    }
                    
                    const ssUrl = 'https://esube.gek.org.tr/MainService/api/rfc/mat/ss?ST=' + encodeURIComponent(${barcodeJson});
                    await fetch(ssUrl, {
                      method: 'GET',
                      headers: { 'accept': 'application/json;charset=UTF-8', 'TOKEN': token, 'sln': '1' },
                      credentials: 'include'
                    }).catch(() => {});

                    const searchUrl = 'https://esube.gek.org.tr/MainService/api/rfc/mat/sm?ST=' + encodeURIComponent(${barcodeJson}) + '&TYP=3';
                    let searchResp = await fetch(searchUrl, {
                      method: 'GET',
                      headers: { 'accept': 'application/json;charset=UTF-8', 'TOKEN': token, 'sln': '1' },
                      credentials: 'include'
                    });
                    
                    if (searchResp.status === 401 || searchResp.status === 403) {
                      try {
                        const gtR = await fetch('https://esube.gek.org.tr/MainService/api/rfc/gt', {
                          method: 'GET',
                          headers: { 'accept': 'application/json;charset=UTF-8' },
                          credentials: 'include'
                        });
                        if (gtR.ok) {
                          let gd = null;
                          try { gd = await gtR.json(); } catch {}
                          const nt = gd && (gd.token || gd.Token || gd.TOKEN || gd.accessToken || gd.access_token || (gd.response && (gd.response.token || gd.response.Token)));
                          if (nt && String(nt).length > 10) {
                            token = String(nt);
                            window.__gekToken = token;
                            await fetch(ssUrl, {
                              method: 'GET',
                              headers: { 'accept': 'application/json;charset=UTF-8', 'TOKEN': token, 'sln': '1' },
                              credentials: 'include'
                            }).catch(() => {});
                            searchResp = await fetch(searchUrl, {
                              method: 'GET',
                              headers: { 'accept': 'application/json;charset=UTF-8', 'TOKEN': token, 'sln': '1' },
                              credentials: 'include'
                            });
                          }
                        }
                      } catch {}
                    }
                    if (searchResp.status === 500) return { error: 'not_found' };
                    if (searchResp.status === 401 || searchResp.status === 403) return { error: 'login_required' };
                    if (!searchResp.ok) return { error: 'search_http_' + searchResp.status };
                    const searchData = await searchResp.json();
                    const items = searchData && Array.isArray(searchData.ET_MAKTX) ? searchData.ET_MAKTX : [];
                    if (items.length === 0) return { error: 'not_found' };
                    
                    const matnr = String(items[0].MATNR);
                    const name = String(items[0].MAKTX || '');
                    
                    const detailUrl = 'https://esube.gek.org.tr/MainService/api/rfc/mat/ms?MATNR=' + encodeURIComponent(matnr);
                    const detailResp = await fetch(detailUrl, {
                      method: 'POST',
                      headers: {
                        'accept': 'application/json;charset=UTF-8',
                        'content-type': 'application/json',
                        'TOKEN': token,
                        'sln': '1'
                      },
                      credentials: 'include',
                      body: '{}'
                    });
                    if (!detailResp.ok) return { error: 'detail_http_' + detailResp.status };
                    const detailData = await detailResp.json();
                    return { ok: true, matnr, name, detailData };
                  } catch(e) {
                    return { error: String(e && e.message ? e.message : e) };
                  }
                })()
              `);

              if (queryResult.error) {
                throw new Error(queryResult.error === 'not_found' ? 'Ürün Bulunamadı' : queryResult.error);
              }

              const detailData = queryResult.detailData;
              const conds = detailData?.ET_A004 || [];
              const zpsf = conds.find((c: any) => c.KSCHL === 'ZPSF' || c.KSCHL === 'Z002');
              const zdep = conds.find((c: any) => c.KSCHL === 'ZDEP' || c.KSCHL === 'Z001' || c.KSCHL === 'ZWHO');
              
              let tmpPsf = 0;
              let tmpDsf = 0;
              if (zpsf) tmpPsf = parseFloat(zpsf.KBETR) || 0;
              if (zdep) tmpDsf = parseFloat(zdep.KBETR) || 0;
              
              if (!tmpPsf) tmpPsf = parseFloat(conds[0]?.KBETR) || parseFloat(detailData?.PSF) || 0;
              if (!tmpDsf) tmpDsf = parseFloat(detailData?.DSF) || tmpPsf * 0.83;

              psfVal = tmpPsf;
              dsfVal = tmpDsf;

              const rawStok = detailData?.ET_MARC?.[0]?.LABST ?? detailData?.LABST ?? 0;
              const stokVal = typeof rawStok === 'number' ? rawStok : parseInt(rawStok || 0);

              const campaigns = detailData?.ET_KAMPANYA || detailData?.ET_KOMP || [];
              campaigns.forEach((c: any) => {
                if (c.MF) {
                  const m = String(c.MF).trim();
                  if (!m.toLowerCase().endsWith('+0')) {
                    mfList.push(m);
                  }
                }
                if (c.NET && Number(c.NET) > 0) netList.push(String(c.NET));
              });

              cache[barcode] = {
                date: todayStr,
                stok: stokVal,
                fiyat_depocu: dsfVal,
                fiyat_etiket: psfVal,
                mf_baremleri: mfList,
                net_fiyatlar: netList,
                kod: queryResult.matnr || '',
                depo: 'GEK'
              };

               if ((window as any).go?.main?.App?.SaveLocalJSON) {
                await (window as any).go.main.App.SaveLocalJSON(gln, cacheFile, JSON.stringify(cache));
              }

              await updateDbWithLiveDataLocal(barcode, dsfVal, psfVal, mfList);

              try {
                const qtyInCart = cart[barcode]?.qty || 0;
                const entry = {
                  tarih:        todayStr,
                  barkod:       barcode,
                  urun_adi:     name,
                  miktar:       qtyInCart,
                  urun_kodu:    queryResult.matnr || '',
                  fiyat_etiket: +psfVal.toFixed(2),
                  fiyat_depocu: +dsfVal.toFixed(2),
                  mf1:          mfList[0]  || null,
                  mf2:          mfList[1]  || null,
                  mf3:          mfList[2]  || null,
                  net_fiyat1:   parsePriceLocal(netList[0]),
                  net_fiyat2:   parsePriceLocal(netList[1]),
                  net_fiyat3:   parsePriceLocal(netList[2]),
                  stok_durumu:  stokVal,
                  kdv:          1,
                  firma_adi:    "",
                  urun_tipi:    "Itriyat",
                  durum:        'success',
                  depo:         'GEK'
                };
                if ((window as any).go?.main?.App?.AppendOrderResult) {
                  await (window as any).go.main.App.AppendOrderResult(gln, entry);
                }
              } catch {}

              detail = {
                stokDurumu: stokVal,
                depocuFiyati: dsfVal,
                SonFiyat: psfVal,
                ad: name,
                kod: queryResult.matnr || ''
              };

            } else if (urgentWarehouse === 'alliance') {
              const queryResult: any = await hiddenWebview.executeJavaScript(`
                (async function() {
                  try {
                    const sUrl = "https://esiparisv2.alliance-healthcare.com.tr/Item/ElasticSearchItems";
                    const sr = await fetch(sUrl, {
                      method: "POST",
                      headers: { "content-type": "application/json; charset=UTF-8", accept: "application/json, text/plain, */*", "x-requested-with": "XMLHttpRequest" },
                      credentials: "include",
                      body: JSON.stringify({ RequestedPage: 1, SearchText: ${barcodeJson} })
                    });
                    if (!sr.ok) return { error: 'search_failed' };
                    const sd = await sr.json();
                    if (!Array.isArray(sd) || sd.length === 0) return { error: 'not_found' };
                    const item = sd[0];
                    
                    const dUrl = "https://esiparisv2.alliance-healthcare.com.tr/Sales/ItemDetailv2";
                    const dr = await fetch(dUrl, {
                      method: "POST",
                      headers: { "content-type": "application/json; charset=UTF-8", accept: "text/html, */*; q=0.01", "x-requested-with": "XMLHttpRequest" },
                      credentials: "include",
                      body: JSON.stringify({ ItemID: String(item.ID), LoadSimple: true })
                    });
                    let detailHtml = "";
                    if (dr.ok) {
                      detailHtml = await dr.text();
                    }
                    return { item, detailHtml };
                  } catch(e) { return { error: String(e) }; }
                })()
              `);
              
              let dsfVal = 0;
              let psfVal = 0;
              let stokVal = 0;
              if (queryResult && !queryResult.error) {
                const item = queryResult.item;
                dsfVal = parseFloat(item.DepotPrice) || 0;
                psfVal = parseFloat(item.LabelPrice) || 0;
                stokVal = parseFloat(item.StockQty) || 0;
                
                const detailHtml = queryResult.detailHtml || "";
                const extractSpansLocal = (htmlStr: string): string[] => {
                  if (!htmlStr) return [];
                  const matches = htmlStr.match(/<span>(.*?)<\/span>/g);
                  if (!matches) return [];
                  return matches.map((m: string) => m.replace(/<\/?span>/g, '').trim());
                };
                mfList = extractSpansLocal(detailHtml).filter(b => b.includes('+'));
              } else {
                throw new Error(queryResult?.error || 'Alliance sorgu hatası');
              }
              
              detail = {
                stokDurumu: stokVal,
                depocuFiyati: dsfVal,
                SonFiyat: psfVal,
                ad: name,
                kod: queryResult?.item?.Code || ''
              };

              cache[barcode] = {
                date: todayStr,
                stok: stokVal,
                fiyat_depocu: dsfVal,
                fiyat_etiket: psfVal,
                mf_baremleri: mfList,
                net_fiyatlar: netList,
                kod: queryResult?.item?.Code || '',
                depo: 'ALLIANCE'
              };

               if ((window as any).go?.main?.App?.SaveLocalJSON) {
                await (window as any).go.main.App.SaveLocalJSON(gln, cacheFile, JSON.stringify(cache));
              }

              await updateDbWithLiveDataLocal(barcode, dsfVal, psfVal, mfList);

              try {
                const qtyInCart = cart[barcode]?.qty || 0;
                const entry = {
                  tarih:        todayStr,
                  barkod:       barcode,
                  urun_adi:     name,
                  miktar:       qtyInCart,
                  urun_kodu:    queryResult?.item?.Code || '',
                  fiyat_etiket: +psfVal.toFixed(2),
                  fiyat_depocu: +dsfVal.toFixed(2),
                  mf1:          mfList[0]  || null,
                  mf2:          mfList[1]  || null,
                  mf3:          mfList[2]  || null,
                  net_fiyat1:   null,
                  net_fiyat2:   null,
                  net_fiyat3:   null,
                  stok_durumu:  stokVal,
                  kdv:          1,
                  firma_adi:    "",
                  urun_tipi:    "Itriyat",
                  durum:        'success',
                  depo:         'ALLIANCE'
                };
                if ((window as any).go?.main?.App?.AppendOrderResult) {
                  await (window as any).go.main.App.AppendOrderResult(gln, entry);
                }
              } catch {}

            } else {
              const searchResult: any = await hiddenWebview.executeJavaScript(`
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
                    if (!resp.ok) return { error: 'search_http_' + resp.status };
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

              if (searchResult.error) {
                throw new Error(searchResult.error === 'not_found' ? 'Ürün Bulunamadı' : searchResult.error);
              }

              const { kod, ILACTIP } = searchResult;
              const kodJson = JSON.stringify(kod);
              const ilacTipJson = JSON.stringify(ILACTIP);

              await sleep(150);

              const detailResult: any = await hiddenWebview.executeJavaScript(`
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

              if (!detailResult || !detailResult.obj) {
                throw new Error('Detay verisi alınamadı');
              }

              detail = detailResult.obj;
              
              const kampanyalar: any[] = Array.isArray(detail?.grdKampanyalar) ? detail.grdKampanyalar : [];
              let mfRaw = '';
              let netRaw = '';
              for (const kamp of kampanyalar) {
                if (kamp?.mf && String(kamp.mf).trim().length > 0) {
                  mfRaw  = kamp.mf;
                  netRaw = kamp.netFiyat || '';
                  break;
                }
              }
              if (!mfRaw && kampanyalar.length > 0) {
                mfRaw = kampanyalar[0]?.mf || '';
                netRaw = kampanyalar[0]?.netFiyat || '';
              }
              
              mfList = extractSpansLocal(mfRaw).filter(m => {
                if (!m) return false;
                if (m.toLowerCase().endsWith('+0')) return false;
                return true;
              });
              netList = extractSpansLocal(netRaw);

              dsfVal = parsePriceLocal(detail.depocuFiyati);
              psfVal = parsePriceLocal(detail.tavsiyeEdilenSatisFiyati || detail.SonFiyat || detail.etiketFiyati);

              cache[barcode] = {
                date: todayStr,
                stok: typeof detail.stokDurumu === 'number' ? detail.stokDurumu : parseInt(detail.stokDurumu || 0),
                fiyat_depocu: dsfVal,
                fiyat_etiket: psfVal,
                mf_baremleri: mfList,
                net_fiyatlar: netList,
                kod: detail.kod || '',
                depo: 'AS ECZA'
              };

               if ((window as any).go?.main?.App?.SaveLocalJSON) {
                await (window as any).go.main.App.SaveLocalJSON(gln, cacheFile, JSON.stringify(cache));
              }

              await updateDbWithLiveDataLocal(barcode, dsfVal, psfVal, mfList);

              try {
                const qtyInCart = cart[barcode]?.qty || 0;
                const entry = {
              tarih:        todayStr,
                  barkod:       barcode,
                  urun_adi:     name,
                  miktar:       qtyInCart,
                  urun_kodu:    detail?.kod       || '',
                  fiyat_etiket: +psfVal.toFixed(2),
                  fiyat_depocu: +dsfVal.toFixed(2),
                  mf1:          mfList[0]  || null,
                  mf2:          mfList[1]  || null,
                  mf3:          mfList[2]  || null,
                  net_fiyat1:   parsePriceLocal(netList[0]),
                  net_fiyat2:   parsePriceLocal(netList[1]),
                  net_fiyat3:   parsePriceLocal(netList[2]),
                  stok_durumu:  detail?.stokDurumu || 0,
                  kdv:          parseInt(detail?.kdv?.val1 || 0),
                  firma_adi:    detail?.firma?.display || "",
                  urun_tipi:    detail?.urunTipi || "",
                  durum:        'success',
                  depo:         'AS ECZA'
                };

                if ((window as any).go?.main?.App?.AppendOrderResult) {
                  await (window as any).go.main.App.AppendOrderResult(gln, entry);
                }
              } catch {}
            }
          }

          const isEquivalent = (item.group.original_count ?? item.group.detaylar.length) > 1;
          const statsSource = isEquivalent ? (item.group.original_detaylar || item.group.detaylar) : item.group.detaylar;
          const currentGroupStock = statsSource.reduce((acc: number, u: any) => acc + (Number(u.v4) || 0), 0);
          const groupDailySpeed = statsSource.reduce((acc: number, u: any) => acc + (Number(u.v20) || 0), 0);

          const esdegerGrubu = isEquivalent ? {
            urunler: statsSource.map((u: any) => ({
              ad: u.v2 || '',
              barkod: u.v1 || '',
              stok: Number(u.v4) || 0,
              hiz: Number(u.v20) || 0,
            })),
            toplamStok: currentGroupStock,
            toplamHiz: groupDailySpeed,
            grupOmru: groupDailySpeed > 0 ? Math.round(currentGroupStock / groupDailySpeed) : null,
          } : null;

          const rawNeed = groupDailySpeed * targetDaysLimit - currentGroupStock;
          const need = Math.max(0, Math.ceil(rawNeed));

          let suggestedQty = item.stok <= 0 ? Math.max(1, Math.ceil(item.dailySpeed * 7)) : 1;
          let chosenBarem: string | null = null;
          let chosenNetPrice = dsfVal;
          let whyData: any = null;

          if (need > 0) {
            suggestedQty = need;
            if (mfList.length > 0 && groupDailySpeed > 0) {
              const parsedBarems = mfList.map((m, idx) => {
                const parts = m.split('+');
                const ana = parseInt(parts[0]) || 0;
                const bedava = parseInt(parts[1]) || 0;
                const netPrice = parsePriceLocal(netList[idx]) || dsfVal * (ana / (ana + bedava));
                return {
                  raw: m,
                  ana,
                  bedava,
                  netPrice,
                  discount: bedava / (ana + bedava)
                };
              }).filter(b => b.ana > 0);

              parsedBarems.sort((a, b) => a.ana - b.ana);

              let baselineBaremObj = null;
              for (let i = parsedBarems.length - 1; i >= 0; i--) {
                if (parsedBarems[i].ana <= need) {
                  baselineBaremObj = parsedBarems[i];
                  break;
                }
              }
              const baselineNetPrice = baselineBaremObj ? baselineBaremObj.netPrice : dsfVal;
              const baselineBaremRaw = baselineBaremObj ? baselineBaremObj.raw : null;

              if (baselineBaremObj && (baselineBaremObj.ana + baselineBaremObj.bedava) >= need) {
                suggestedQty = baselineBaremObj.ana;
                chosenBarem = baselineBaremObj.raw;
                chosenNetPrice = baselineBaremObj.netPrice;
              }

              const analyzedBarems = parsedBarems.map(b => {
                const totalFreeQty = b.ana + b.bedava;
                const totalDays = (currentGroupStock + totalFreeQty) / groupDailySpeed;
                const deltaDays = totalFreeQty / groupDailySpeed;
                const deltaMonths = deltaDays / 30;
                const carryingCostPct = deltaMonths * (5 / 100);
                const currentMfRatio = (b.ana + b.bedava) > 0 ? b.bedava / (b.ana + b.bedava) : 0;
                const baselineMfRatio = baselineBaremObj && (baselineBaremObj.ana + baselineBaremObj.bedava) > 0 
                  ? baselineBaremObj.bedava / (baselineBaremObj.ana + baselineBaremObj.bedava) 
                  : 0;
                const gainPct = Math.max(0, currentMfRatio - baselineMfRatio);
                const netReturn = gainPct - carryingCostPct;

                let status = 'pending';
                let reason = '';

                if (totalDays > targetDaysLimit) {
                  status = 'rejected_max_days';
                  reason = `${Math.round(totalDays)} gün`;
                } else if (b.raw === baselineBaremRaw) {
                  status = 'baseline_covered';
                  reason = 'Referans barem (Saf İhtiyaç)';
                } else if (netReturn <= 0) {
                  status = 'rejected_carrying_cost';
                  reason = `Maliyet (%${(carryingCostPct * 100).toFixed(1)}) > Kazanç (%${(gainPct * 100).toFixed(1)})`;
                } else {
                  status = 'profitable';
                  reason = `Net Getiri: %${(netReturn * 100).toFixed(1)}`;
                }

                return {
                  raw: b.raw,
                  ana: b.ana,
                  bedava: b.bedava,
                  netPrice: b.netPrice,
                  gainPct,
                  carryingCostPct,
                  netReturn,
                  status,
                  reason
                };
              });

              const profitableBarems = analyzedBarems.filter(b => b.status === 'profitable');
              profitableBarems.sort((a, b) => b.netReturn - a.netReturn);
              const bestBaremObj = profitableBarems[0] || null;

              if (bestBaremObj) {
                suggestedQty = bestBaremObj.ana;
                chosenBarem = bestBaremObj.raw;
                chosenNetPrice = bestBaremObj.netPrice;
              }

              whyData = {
                need,
                targetDays: targetDaysLimit,
                baselineBarem: baselineBaremRaw,
                baselineNetPrice,
                carryingCostRate: 5,
                barems: analyzedBarems
              };
            }
          }

          results.push({
            barkod: barcode,
            ad: name,
            stok: item.stok,
            hiz: item.hiz,
            dailySpeed: item.dailySpeed,
            estOmur: item.estOmur,
            depoStok: detail?.stokDurumu || 0,
            depocuFiyati: dsfVal,
            fiyatEtiket: psfVal,
            secilenBarem: chosenBarem,
            onerilenMf: chosenBarem,
            onerilen: suggestedQty,
            netFiyat: chosenBarem ? chosenNetPrice : null,
            toplamTutar: suggestedQty * dsfVal,
            isCached: isFromCache,
            baremler: mfList,
            netFiyatlar: netList,
            whyData,
            esdegerGrubu,
            selected: true,
          });

        } catch (err) {
          console.error(`Urgent query error [${name}]:`, err);
          results.push({
            barkod: barcode,
            ad: name,
            stok: item.stok,
            hiz: item.hiz,
            dailySpeed: item.dailySpeed,
            estOmur: item.estOmur,
            depoStok: 0,
            depocuFiyati: 0,
            fiyatEtiket: 0,
            secilenBarem: null,
            onerilenMf: null,
            onerilen: 0,
            toplamTutar: 0,
            hata: String(err?.message || err || 'Sorgu Hatası'),
            baremler: [],
            netFiyatlar: [],
            whyData: null,
            esdegerGrubu: null,
            selected: true,
          });
        }

        setUrgentResults([...results]);
        if (results[results.length - 1].isCached) {
          // No delay
        } else {
          await sleep(180 + Math.random() * 80);
        }
      }

      setUrgentSimulating(false);
      setUrgentProgress('');
      alert('⚡ Acil Sipariş Sorgulaması Tamamlandı!');

    } catch (err: any) {
      alert("Acil sipariş sorgusu başarısız oldu: " + String(err?.message || err));
      setUrgentSimulating(false);
      setUrgentProgress('');
    }
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

  // Timer for 9 AM scan
  useEffect(() => {
    if (!isWails || !appSettings.gln) return;
    
    let lastScanDay = "";
    
    const interval = setInterval(async () => {
      try {
        const settingsStr = await (window as any).go.main.App.LoadSettings();
        if (!settingsStr || settingsStr === '{}') return;
        const parsed = JSON.parse(settingsStr);
        
        if (!parsed.auto_scan_9am) return;
        
        const now = new Date();
        const currentDay = now.toDateString(); // e.g. "Fri Jun 26 2026"
        const hours = now.getHours();
        const minutes = now.getMinutes();
        
        if (hours === 9 && minutes === 0 && lastScanDay !== currentDay) {
          lastScanDay = currentDay;
          console.log("[Auto-Scan] Saat 09:00. Günlük komple tarama tetikleniyor...");
          await triggerScanBackground(parsed.gln, true);
        }
      } catch (e) {
        console.error("[Auto-Scan] Timer check failed:", e);
      }
    }, 60 * 1000); // Check every minute
    
    return () => clearInterval(interval);
  }, [isWails, appSettings.gln, appSettings.auto_scan_9am]);

  const triggerScanBackground = async (gln: string, fullSync: boolean) => {
    try {
      console.log(`[Auto-Scan] Background scan running (fullSync=${fullSync})...`);
      // Trigger sync
      await (window as any).go.main.App.TriggerSyncAndAnalysis(gln, fullSync);
      
      // Update last_full_scan_time if it was a fullSync
      if (fullSync) {
        const settingsStr = await (window as any).go.main.App.LoadSettings();
        if (settingsStr && settingsStr !== '{}') {
          const parsed = JSON.parse(settingsStr);
          parsed.last_full_scan_time = new Date().toISOString();
          await (window as any).go.main.App.SaveSettings(JSON.stringify(parsed));
          setAppSettings(parsed);
        }
      }
      
      // Reload dashboard data
      const res = await fetchEczaneData("");
      if (res) setData(res);
    } catch (e) {
      console.error("[Auto-Scan] Background scan failed:", e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      let res;
      if (isWails) {
        try {
          const settingsStr = await (window as any).go.main.App.LoadSettings();
          if (settingsStr && settingsStr !== '{}') {
            const parsed = JSON.parse(settingsStr);
            setAppSettings(parsed);
            
            // d- program ilk açıldığında ai sipariş modu açılsın
            if (parsed.default_ai_order_mode) {
              setShowAIModal(true);
            }
            
            // c- son komple tarama üzerinden 24 saat geçmişse otomatik komple tarama yapsın
            if (parsed.auto_scan_24h && parsed.last_full_scan_time) {
              const lastScan = new Date(parsed.last_full_scan_time).getTime();
              const now = new Date().getTime();
              if (now - lastScan > 24 * 60 * 60 * 1000) {
                console.log("[Auto-Scan] Son komple taramadan bu yana 24 saat geçmiş. Tarama tetikleniyor...");
                triggerScanBackground(parsed.gln, true);
              }
            }
          }
        } catch (settingsErr) {
          console.error("loadData settings error:", settingsErr);
        }
        res = await fetchEczaneData("");
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return router.push('/register');
        res = await fetchEczaneData(user.id);
      }
      if (!res) { setLoading(false); return; }
      setData(res);



      let savedCartObj: Record<string, any> = {};
      if (isWails) {
        const cached = await (window as any).go.main.App.LoadLocalJSON(res.gln || "local", "cart.json");
        if (cached && cached !== '{}') savedCartObj = JSON.parse(cached);
        try {
          const glnStr = res.gln || "local";
          const allOrders: any[] = [];
          
          // 1. AS Siparişler
          try {
            const rawAs = await (window as any).go.main.App.LoadLocalJSON(glnStr, "as_siparisler.json");
            if (rawAs && rawAs !== '{}') {
              const parsed = JSON.parse(rawAs);
              if (Array.isArray(parsed)) {
                parsed.forEach((o: any) => { o.depo = o.depo || 'AS ECZA'; allOrders.push(o); });
              }
            }
          } catch {}

          // 2. GEK Siparişler
          try {
            const rawGek = await (window as any).go.main.App.LoadLocalJSON(glnStr, "gek_siparisler.json");
            if (rawGek && rawGek !== '{}') {
              const parsed = JSON.parse(rawGek);
              if (Array.isArray(parsed)) {
                parsed.forEach((o: any) => { o.depo = o.depo || 'GEK'; allOrders.push(o); });
              }
            }
          } catch {}

          // 3. Alliance Siparişler
          try {
            const rawAlliance = await (window as any).go.main.App.LoadLocalJSON(glnStr, "alliance_siparisler.json");
            if (rawAlliance && rawAlliance !== '{}') {
              const parsed = JSON.parse(rawAlliance);
              if (Array.isArray(parsed)) {
                parsed.forEach((o: any) => { o.depo = o.depo || 'Alliance'; allOrders.push(o); });
              }
            }
          } catch {}

          setLocalOrders(allOrders);
        } catch (e) {
          console.error("Local orders load failed:", e);
        }
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: cartData } = await supabase.from('kullanici_sepetleri').select('sepet').eq('eczane_id', user?.id).maybeSingle();
        savedCartObj = cartData?.sepet ? (typeof cartData.sepet === 'string' ? JSON.parse(cartData.sepet) : cartData.sepet) : {};
      }

      const initialCart: Record<string, CartItem> = {};
      Object.keys(savedCartObj).forEach(b => { initialCart[b] = { ...savedCartObj[b], inCart: true }; });
      setCart(initialCart);
    } catch (err) { console.error("Sistem hatası:", err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
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

  const addToReturnsList = async (barkod: string, ad: string, adet: number) => {
    try {
      const isWails = typeof window !== 'undefined' && (window as any).go !== undefined;
      const gln = data?.gln || 'local';
      let currentList: any[] = [];

      if (isWails) {
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

      if (isWails) {
        await (window as any).go.main.App.SaveLocalJSON(gln, "iade_listesi.json", JSON.stringify(currentList));
      } else {
        localStorage.setItem(`iade_listesi_${gln}`, JSON.stringify(currentList));
      }

      window.dispatchEvent(new CustomEvent('nexus:iadeListesiUpdated'));
      return true;
    } catch (err) {
      console.error("İadeye eklenirken hata oluştu:", err);
      return false;
    }
  };

  const updateCart = (barkod: string, qty: number, manualMf?: number, urun?: any, forceInCart?: boolean) => {
    setCart(prev => {
      let finalMf = manualMf;
      if (manualMf === undefined && urun) finalMf = calculateAutoMF(qty, urun.mf_baremleri);
      const existing = prev[barkod] || { qty: 0, mf: 0, inCart: false, ad: "Bilinmeyen Ürün", depo: "Depo Belirsiz" };
      return { 
        ...prev, 
        [barkod]: { 
          ...existing, 
          qty, 
          mf: finalMf || 0, 
          inCart: forceInCart !== undefined ? forceInCart : existing.inCart,
          ad: urun?.v2 || existing.ad, 
          depo: urun?.v91 || existing.depo, 
          v95: urun?.v95 || existing.v95, 
          mf_baremleri: urun?.mf_baremleri || existing.mf_baremleri 
        } 
      };
    });
  };

  const toggleCartItem = (barkod: string, urun: any) => {
    setCart(prev => {
      const existing = prev[barkod] || ({ qty: 0, mf: 0, inCart: false, ad: urun.v2, depo: urun.v91 } as CartItem);
      return { ...prev, [barkod]: { ...existing, inCart: !existing.inCart, v95: urun.v95 || existing.v95, mf_baremleri: urun.mf_baremleri || existing.mf_baremleri } };
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
          depo: item.depo || existing?.depo || 'Depo Belirsiz',
          v95: item.v95 || existing?.v95,
          mf_baremleri: item.mf_baremleri || existing?.mf_baremleri
        };
      });
      return nextCart;
    });
  };

  const deadStockMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (data?.olu_stok_listesi) {
      data.olu_stok_listesi.forEach((item: any) => {
        map[item.barkod] = item.son_satis || 0;
      });
    }
    return map;
  }, [data]);

  const getFilteredGroups = () => {
    if (!data?.gruplar) return [];
    const q = searchQuery.toLowerCase();
    return data.gruplar
      .map((g: any) => {
        const filteredDetaylar = g.detaylar.filter((urun: any) => {
          if (ignoredBarkods.has(urun.v1)) return false;

          // Son 2 ayda (60 gün) hareket görmemiş VEYA aylık hızı < 1 olanları gizle
          const dailySpd = urun.v20 || 0;
          const monthlySpd = dailySpd * 30;
          const daysInactive = urun.v21 || 0;
          if (daysInactive >= 60 || monthlySpd < 1) return false;

          const isPharmaceutical = isDynamicPharmaceuticalCategory(g.kategori_id || 0);
          const isCrit = (g.tags || "").includes('ks') || (g.kritik_puan || 0) > 10;
          const isZero = zeroStockBarcodes.has(urun.v1);
          const isTnf = urun.kategori_id === 15 || (urun.kategori_id && dynamicCategoryMap[urun.kategori_id]?.tam_yol_ids?.includes(15)) || false;
          const isEnteral = urun.kategori_id === 14 || (urun.kategori_id && dynamicCategoryMap[urun.kategori_id]?.tam_yol_ids?.includes(14)) || false;
          const isEsdegersiz = g.detaylar.length === 1;

          const filterMatches = [
            { state: filterIlac, matches: isPharmaceutical },
            { state: filterDisi, matches: !isPharmaceutical },
            { state: filterKritik, matches: isCrit },
            { state: filterZero, matches: isZero },
            { state: filterTnf, matches: isTnf },
            { state: filterEnteral, matches: isEnteral },
            { state: filterEsdegersiz, matches: isEsdegersiz }
          ];

          // 1. Dışlama Kontrolü (State 3 - Excluded)
          const isExcluded = filterMatches.some(f => f.state === 'excluded' && f.matches);
          if (isExcluded) return false;

          // 2. Dahil Etme Kontrolü (State 1 - Active)
          const hasActiveFilters = filterMatches.some(f => f.state === 'active');
          if (hasActiveFilters) {
            const matchesAnyActive = filterMatches.some(f => f.state === 'active' && f.matches);
            if (!matchesAnyActive) return false;
          } else {
            // Aktif filtre yoksa hiçbirini gösterme
            return false;
          }

          const matchSearch = q === "" || (urun.v2 || "").toLowerCase().includes(q) || (urun.v1 || "").toLowerCase().includes(q);
          if (q !== "" && !matchSearch) return false;
          const uColor = (urun.v82 || "").toUpperCase();
          if (selectedColors.length > 0 && !selectedColors.includes(uColor)) return false;

          // Stok Ömrü Filtresi
          if (selectedDaysLimit !== null) {
            const dailySpeed = urun.v20 || 0;
            const stock = urun.v4 || 0;
            if (stock <= 0) {
              // Stok yoksa ömür 0 gündür (seçilen limitin altındadır, gösterilir)
            } else if (dailySpeed <= 0) {
              // Stok var ama satış hızı yoksa ömür sonsuzdur, filtreden elenir
              return false;
            } else {
              const stockLifeDays = stock / dailySpeed;
              if (stockLifeDays >= selectedDaysLimit) return false;
            }
          }

          return true;
        });
        return {
          ...g,
          detaylar: filteredDetaylar,
          original_detaylar: g.detaylar,
          original_count: g.detaylar.length
        };
      })
      .filter((g: any) => {
        if (g.detaylar.length === 0) return false;
        // Normal öneri görünümü (aktif tab oneri ise) gürültü azaltma thresholding
        if (activeTab === 'oneri' && g.toplam_oneri <= 0 && (g.kritik_puan || 0) < 50) return false;
        return true;
      })
      .sort((a: any, b: any) => {
        const detA = a.original_detaylar || a.detaylar || [];
        const detB = b.original_detaylar || b.detaylar || [];

        if (cockpitSortField) {
          let valA: any = 0;
          let valB: any = 0;

          switch (cockpitSortField) {
            case 'ad':
              valA = a.lider_adi || '';
              valB = b.lider_adi || '';
              break;
            case 'hiz':
              valA = detA.reduce((acc: number, u: any) => acc + (Number(u.v20) || 0), 0) * 30;
              valB = detB.reduce((acc: number, u: any) => acc + (Number(u.v20) || 0), 0) * 30;
              break;
            case 'stok':
              valA = detA.reduce((acc: number, u: any) => acc + (Number(u.v4) || 0), 0);
              valB = detB.reduce((acc: number, u: any) => acc + (Number(u.v4) || 0), 0);
              break;
            case 'iht':
              valA = detA.reduce((acc: number, u: any) => acc + Math.round(Math.max(0, (Number(u.v20) || 0) * 30 - (Number(u.v4) || 0))), 0);
              valB = detB.reduce((acc: number, u: any) => acc + Math.round(Math.max(0, (Number(u.v20) || 0) * 30 - (Number(u.v4) || 0))), 0);
              break;
            case 'oneri':
              valA = a.toplam_oneri || 0;
              valB = b.toplam_oneri || 0;
              break;
          }

          if (typeof valA === 'string' && typeof valB === 'string') {
            return cockpitSortOrder === 'asc'
              ? valA.localeCompare(valB, 'tr')
              : valB.localeCompare(valA, 'tr');
          }

          const numA = Number(valA) || 0;
          const numB = Number(valB) || 0;
          return cockpitSortOrder === 'asc' ? numA - numB : numB - numA;
        }

        if (activeTab === 'ks') return (b.kritik_puan || 0) - (a.kritik_puan || 0);

        // Hibrit sıralama modeli (Karekök Aylık Çıkış Hızı ve Ömür İlişkisi)
        // Öncelik Puanı (CPI) = (sqrt(Aylık Hız) + 1) / (Kalan Ömür + 10)
        // Puanı yüksek olan (daha kritik olan) ürünler en üstte listelenir (descending).
        const getGroupCPI = (g: any) => {
          const isEquivalent = (g.original_count ?? g.detaylar.length) > 1;
          const det = isEquivalent ? (g.original_detaylar || g.detaylar || []) : (g.detaylar || []);

          let totalStock = 0;
          let totalDailySpeed = 0;

          if (isEquivalent) {
            totalStock = det.reduce((acc: number, u: any) => acc + (Number(u.v4) || 0), 0);
            totalDailySpeed = det.reduce((acc: number, u: any) => acc + (Number(u.v20) || 0), 0);
          } else {
            const urun = det[0];
            if (urun) {
              totalStock = Number(urun.v4) || 0;
              totalDailySpeed = Number(urun.v20) || 0;
            }
          }

          const monthlySpeed = totalDailySpeed * 30;
          const lifetime = totalDailySpeed > 0 ? (totalStock / totalDailySpeed) : 999999;

          return (Math.sqrt(monthlySpeed) + 1) / (lifetime + 10);
        };

        const cpiA = getGroupCPI(a);
        const cpiB = getGroupCPI(b);

        if (cpiA !== cpiB) {
          return cpiB - cpiA; // Yüksek puanlılar üstte
        }

        return (b.toplam_oneri || 0) - (a.toplam_oneri || 0);
      });
  };

  const filteredGroups = useMemo(() => getFilteredGroups(), [data, searchQuery, ignoredBarkods, filterEsdegersiz, selectedColors, activeTab, cart, cockpitSortField, cockpitSortOrder, filterZero, filterTnf, filterEnteral, filterIlac, filterDisi, filterKritik, selectedDaysLimit, deadStockMap]);

  const filteredIlacGroups = useMemo(() => {
    return filteredGroups.filter(g => isDynamicPharmaceuticalCategory(g.kategori_id || 0));
  }, [filteredGroups]);

  const filteredDisiGroups = useMemo(() => {
    return filteredGroups.filter(g => !isDynamicPharmaceuticalCategory(g.kategori_id || 0));
  }, [filteredGroups]);

  const cartSummary = useMemo(() => {
    const vals = Object.values(cart).filter(c => c.inCart && c.qty > 0);
    return { items: vals.length, kutu: vals.reduce((a, c) => a + (c.qty || 0), 0), mf: vals.reduce((a, c) => a + (c.mf || 0), 0) };
  }, [cart]);

  // ── Tümünü Seç (Ana görünüm) ─────────────────────────────────────────────
  const allMainBarkods = useMemo(() =>
    filteredGroups.flatMap((g: any) => g.detaylar?.map((u: any) => u.v1) || []),
  [filteredGroups]);

  const isAllMainSelected = useMemo(() =>
    allMainBarkods.length > 0 && allMainBarkods.every(b => selectedBarkods.has(b)),
  [allMainBarkods, selectedBarkods]);

  const handleToggleSelectAllMain = () => {
    setSelectedBarkods(prev => {
      const next = new Set(prev);
      if (isAllMainSelected) {
        allMainBarkods.forEach(b => next.delete(b));
      } else {
        allMainBarkods.forEach(b => next.add(b));
      }
      return next;
    });
  };

  // ── Tümünü Seç (Genişletilmiş cockpit görünümü) ──────────────────────────
  const allExpandedBarkods = useMemo(() => {
    const list = expandedCategory === 'ilac' ? filteredIlacGroups : filteredDisiGroups;
    return list.flatMap((g: any) => g.detaylar?.map((u: any) => u.v1) || []);
  }, [expandedCategory, filteredIlacGroups, filteredDisiGroups]);

  const isAllExpandedSelected = useMemo(() =>
    allExpandedBarkods.length > 0 && allExpandedBarkods.every(b => selectedBarkods.has(b)),
  [allExpandedBarkods, selectedBarkods]);

  const handleToggleSelectAllExpanded = () => {
    setSelectedBarkods(prev => {
      const next = new Set(prev);
      if (isAllExpandedSelected) {
        allExpandedBarkods.forEach(b => next.delete(b));
      } else {
        allExpandedBarkods.forEach(b => next.add(b));
      }
      return next;
    });
  };

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
    return <WailsSetupView onSetupComplete={async (newData: any) => { await loadData(); }} />;
  }

  if (data?.isWailsSyncRequired) {
    return <WailsSyncView settings={data} onSyncComplete={async (newData: any) => { await loadData(); }} />;
  }

  // Depolar sekmesi sidebar'ı gizler ve tam ekran açılır
  const isDepolarTab = activeTab === 'depolar';

  const handleExecuteSingleProductMFQuery = async (urun: any, warehouseId: string) => {
    if (!urun) return;
    
    const extractSpansLocal = (htmlStr: string): string[] => {
      if (!htmlStr) return [];
      const matches = htmlStr.match(/<span>(.*?)<\/span>/g);
      if (!matches) {
        return htmlStr.includes('<') ? [] : [htmlStr.trim()];
      }
      return matches.map((m: string) => m.replace(/<\/?span>/g, '').trim());
    };
    
    const activeDepolar = loadDepolar();
    const currentDepo = activeDepolar.find(d => d.id === warehouseId);
    if (!currentDepo) {
      alert('Depo bulunamadı.');
      return;
    }

    const barcode = urun.v1;
    const todayStr = new Date().toLocaleDateString('en-CA');
    const cacheFilename = warehouseId === 'gek' ? 'gek_query_cache.json' : (warehouseId === 'alliance' ? 'alliance_query_cache.json' : (warehouseId === 'as' || warehouseId === 'as_ecza' ? 'as_ecza_query_cache.json' : `${warehouseId}_query_cache.json`));
    let cache: any = {};
    try {
      const rawCache = await (window as any).go.main.App.LoadLocalJSON(data?.gln || 'local', cacheFilename);
      if (rawCache && rawCache !== '{}') cache = JSON.parse(rawCache);
    } catch {}

    const cached = cache[barcode];
    if (cached && cached.date === todayStr) {
      const mfList = cached.mf_baremleri || [];
      const parsedBarems = mfList.map((raw: string) => {
        const p = raw.split('+');
        return {
          ana: parseInt(p[0]) || 0,
          mf: parseInt(p[1]) || 0
        };
      }).filter((b: any) => b.ana > 0 && b.mf > 0);

      if (data && Array.isArray(data.gruplar)) {
        const updatedGruplar = data.gruplar.map((g: any) => {
          const updatedDetaylar = (g.detaylar || []).map((u: any) => {
            if (u.v1 === barcode) {
              return { ...u, mf_baremleri: parsedBarems };
            }
            return u;
          });
          return { ...g, detaylar: updatedDetaylar };
        });
        setData({ ...data, gruplar: updatedGruplar });
      }

      alert(`Sorgulama tamamlandı! Baremler (Önbellekten): ${mfList.join(', ') || 'Barem bulunamadı'}`);
      setMfQueryProduct(null);
      return;
    }
    
    const warehouseName = currentDepo.ad;
    let targetDomain = 'asecza.com.tr';
    if (warehouseId === 'gek') targetDomain = 'esube.gek.org.tr';
    else if (warehouseId === 'alliance') targetDomain = 'alliance';
    else if (warehouseId === 'selcuk') targetDomain = 'selcukecza.com.tr';
    else if (warehouseId === 'nevzat') targetDomain = 'nevzatecza.com.tr';
    else if (warehouseId === 'cam') targetDomain = 'camecza.com';
    else {
      try { targetDomain = new URL(currentDepo.url).hostname.replace('www.', ''); } catch {}
    }

    let hiddenWebview: any = null;
    if (sharedWebviewRefs && sharedWebviewRefs.current) {
      for (const [id, el] of Object.entries(sharedWebviewRefs.current)) {
        if (el && typeof el.executeJavaScript === 'function') {
          try {
            const url: string = await el.executeJavaScript('location.href');
            if (url.includes(targetDomain) || 
                ((warehouseId === 'as' || warehouseId === 'as_ecza') && url.includes('127.0.0.1') && url.includes('Siparis')) ||
                (warehouseId === 'alliance' && (url.includes('alliance-healthcare.com') || url.includes('alliance')))) {
              hiddenWebview = el;
              break;
            }
          } catch (e) {}
        }
      }
    }

    if (!hiddenWebview) {
      alert(`${warehouseName} oturumu bulunamadı. Lütfen önce 'Depolar' sekmesinden ${warehouseName}'ya giriş yapın.`);
      return;
    }

    setIsSingleMfQuerying(true);
    try {
      const barcode = urun.v1;
      const barcodeJson = JSON.stringify(barcode);
      let mfList: string[] = [];
      let netList: string[] = [];
      let dsfVal = 0;
      let psfVal = 0;

      if (warehouseId === 'gek') {
        const localGekToken = (typeof window !== 'undefined' ? localStorage.getItem('nexus_gek_token') : '') || '';
        const queryResult: any = await hiddenWebview.executeJavaScript(`
          (async function() {
            try {
              let token = window.__gekToken || ${JSON.stringify(localGekToken)} || "";
              if (!token) {
                const stores = [window.localStorage, window.sessionStorage];
                const keys = ['token','Token','TOKEN','gek_token','gekToken','accessToken','access_token','auth_token','authToken','jwt','JWT'];
                for (const store of stores) {
                  if (token) break;
                  if (!store) continue;
                  for (const k of keys) {
                    try {
                      const v = store.getItem(k);
                      if (v && v.length > 10 && !v.startsWith('{')) { token = v; break; }
                      if (v && v.length > 10) {
                        try { const j = JSON.parse(v); const t = j.token||j.Token||j.TOKEN||j.accessToken||j.access_token||j.currentSession?.access_token; if(t) { token = t; break; } } catch {}
                      }
                    } catch {}
                  }
                }
              }
              if (!token) {
                try {
                  const cookies = document.cookie.split(';');
                  for (const c of cookies) {
                    const [k, v] = c.trim().split('=');
                    if (k && ['token','Token','TOKEN','auth','jwt'].some(kk => k.toLowerCase().includes(kk))) {
                      if (v && v.length > 10) { token = decodeURIComponent(v); break; }
                    }
                  }
                } catch {}
              }
              if (!token) {
                try {
                  const gtResp = await fetch('https://esube.gek.org.tr/MainService/api/rfc/gt', {
                    method: 'GET',
                    headers: { 'accept': 'application/json;charset=UTF-8' },
                    credentials: 'include'
                  });
                  if (gtResp.ok) {
                    const rawText = await gtResp.text();
                    let t = null;
                    try {
                      const j = JSON.parse(rawText);
                      t = j.token || j.Token || j.TOKEN || j.accessToken || j.access_token || j.data?.token || rawText.trim();
                    } catch {
                      t = rawText.trim();
                    }
                    if (t && t.length > 10) { token = t; }
                  }
                } catch {}
              }
              if (!token) return { error: 'login_required' };
              
              window.__gekToken = token;

              const resp = await fetch("https://esube.gek.org.tr/FrameWorkT1/api/GekOnline/UrunArama", {
                method: "POST",
                headers: { "content-type": "application/json", "Authorization": "Bearer " + token },
                body: JSON.stringify({ SearchText: ${barcodeJson}, Gln: ${JSON.stringify(data?.gln || 'local')} })
              });
              if (!resp.ok) return { error: 'http_' + resp.status };
              const resData = await resp.json();
              if (resData.hataId !== 0) return { error: resData.hataStr || 'gek_err' };
              const urunler = resData.obj?.urunAramaList;
              if (!Array.isArray(urunler) || urunler.length === 0) return { error: 'not_found' };
              return urunler[0];
            } catch(e) { return { error: String(e) }; }
          })()
        `);
        
        if (queryResult && queryResult.error) {
          throw new Error(queryResult.error === 'login_required' ? 'GEK oturumu zaman aşımına uğramış' : queryResult.error);
        }
        
        if (queryResult && !queryResult.error) {
          const matnr = queryResult.matnr;
          dsfVal = parseFloat(queryResult.aktifFiyat) || 0;
          psfVal = parseFloat(queryResult.kamuFiyati) || 0;
          
          const kampResult: any = await hiddenWebview.executeJavaScript(`
            (async function() {
              try {
                const resp = await fetch("https://esube.gek.org.tr/FrameWorkT1/api/GekOnline/UrunKampanyaBilgisiGetir", {
                  method: "POST",
                  headers: { "content-type": "application/json", "Authorization": "Bearer " + (window.__gekToken || "") },
                  body: JSON.stringify({ Matnr: ${JSON.stringify(matnr)}, Gln: ${JSON.stringify(data?.gln || 'local')} })
                });
                return resp.ok ? await resp.json() : null;
              } catch { return null; }
            })()
          `);
          
          const kampData = kampResult && kampResult.obj;
          const bArray: string[] = [];
          const nArray: string[] = [];
          if (Array.isArray(kampData?.kampanyaBaremleri)) {
            kampData.kampanyaBaremleri.forEach((b: any) => {
              if (b.anaMiktar > 0 && b.bedelsizMiktar > 0) {
                bArray.push(`${b.anaMiktar}+${b.bedelsizMiktar}`);
                nArray.push(String(b.netFiyat || 0));
              }
            });
          }
          mfList = bArray;
          netList = nArray;
        }
      } else if (warehouseId === 'alliance') {
        const queryResult: any = await hiddenWebview.executeJavaScript(`
          (async function() {
            try {
              const sUrl = "https://esiparisv2.alliance-healthcare.com.tr/Item/ElasticSearchItems";
              const sr = await fetch(sUrl, {
                method: "POST",
                headers: { "content-type": "application/json; charset=UTF-8", accept: "application/json, text/plain, */*", "x-requested-with": "XMLHttpRequest" },
                credentials: "include",
                body: JSON.stringify({ RequestedPage: 1, SearchText: ${barcodeJson} })
              });
              if (!sr.ok) return { error: 'search_failed' };
              const sd = await sr.json();
              if (!Array.isArray(sd) || sd.length === 0) return { error: 'not_found' };
              const item = sd[0];
              
              const dUrl = "https://esiparisv2.alliance-healthcare.com.tr/Sales/ItemDetailv2";
              const dr = await fetch(dUrl, {
                method: "POST",
                headers: { "content-type": "application/json; charset=UTF-8", accept: "text/html, */*; q=0.01", "x-requested-with": "XMLHttpRequest" },
                credentials: "include",
                body: JSON.stringify({ ItemID: String(item.ID), LoadSimple: true })
              });
              let detailHtml = "";
              if (dr.ok) {
                detailHtml = await dr.text();
              }
              return { item, detailHtml };
            } catch(e) { return { error: String(e) }; }
          })()
        `);
        
        if (queryResult && !queryResult.error) {
          const item = queryResult.item;
          dsfVal = parseFloat(item.DepotPrice) || 0;
          psfVal = parseFloat(item.LabelPrice) || 0;
          
          const detailHtml = queryResult.detailHtml || "";
          mfList = extractSpansLocal(detailHtml).filter(b => b.includes('+'));
        }
      } else {
        const searchResult: any = await hiddenWebview.executeJavaScript(`
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
              if (!resp.ok) return { error: 'search_failed' };
              const data = await resp.json();
              if (data.hataId === 9 || String(data.hataId) === '9') return { error: 'login_required' };
              if (data.hataId !== 0) return { error: data.hataStr || 'search_error' };
              const urunler = data && data.obj && data.obj.urunler;
              if (!Array.isArray(urunler) || urunler.length === 0) return { error: 'not_found' };
              const u = urunler[0];
              return { kod: String(u.kodu || ''), ILACTIP: String(u.ILACTIP || ''), ad: String(u.ad || ''), dsf: parseFloat(u.fiyat_depocu) || 0, psf: parseFloat(u.fiyat_etiket) || 0 };
            } catch(e) { return { error: String(e) }; }
          })()
        `);
        
        if (searchResult && !searchResult.error) {
          dsfVal = searchResult.dsf;
          psfVal = searchResult.psf;
          
          const dParams = { kod: searchResult.kod, ILACTIP: searchResult.ILACTIP };
          const detailResult: any = await hiddenWebview.executeJavaScript(`
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
                return resp.ok ? await resp.json() : null;
              } catch { return null; }
            })()
          `);
          
          const detail = detailResult && detailResult.obj;
          const kampanyalar = Array.isArray(detail?.grdKampanyalar) ? detail.grdKampanyalar : [];
          const bArray: string[] = [];
          const nArray: string[] = [];
          kampanyalar.forEach((kamp: any) => {
            if (kamp?.mf && String(kamp.mf).trim().length > 0) {
              const cleanedMf = extractSpansLocal(kamp.mf).filter(m => {
                if (!m) return false;
                if (m.toLowerCase().endsWith('+0')) return false;
                return true;
              });
              const cleanedNet = extractSpansLocal(kamp.netFiyat || '');
              bArray.push(...cleanedMf);
              nArray.push(...cleanedNet);
            }
          });
          mfList = bArray;
          netList = nArray;
        }
      }

      const parsedBarems = mfList.map(raw => {
        const p = raw.split('+');
        return {
          ana: parseInt(p[0]) || 0,
          mf: parseInt(p[1]) || 0
        };
      }).filter(b => b.ana > 0 && b.mf > 0);

      const todayStr = new Date().toLocaleDateString('en-CA');
      const cacheFilename = warehouseId === 'gek' ? 'gek_query_cache.json' : (warehouseId === 'alliance' ? 'alliance_query_cache.json' : 'as_ecza_query_cache.json');
      let cache: any = {};
      try {
        const rawCache = await (window as any).go.main.App.LoadLocalJSON(data?.gln || 'local', cacheFilename);
        if (rawCache && rawCache !== '{}') cache = JSON.parse(rawCache);
      } catch {}
      cache[barcode] = {
        date: todayStr,
        stok: 1,
        fiyat_depocu: dsfVal,
        fiyat_etiket: psfVal,
        mf_baremleri: mfList,
        net_fiyatlar: netList,
        kod: ''
      };
      await (window as any).go.main.App.SaveLocalJSON(data?.gln || 'local', cacheFilename, JSON.stringify(cache, null, 2));

      if (data && Array.isArray(data.gruplar)) {
        const updatedGruplar = data.gruplar.map((g: any) => {
          const updatedDetaylar = (g.detaylar || []).map((u: any) => {
            if (u.v1 === barcode) {
              return { ...u, mf_baremleri: parsedBarems };
            }
            return u;
          });
          return { ...g, detaylar: updatedDetaylar };
        });
        setData({ ...data, gruplar: updatedGruplar });
      }

      alert(`Sorgulama tamamlandı! Baremler: ${mfList.join(', ') || 'Barem bulunamadı'}`);
    } catch (err: any) {
      alert('Sorgulama hatası: ' + (err.message || err));
    } finally {
      setIsSingleMfQuerying(false);
      setMfQueryProduct(null);
    }
  };

  return (
    <div className={cn("flex min-h-screen bg-stone-50 text-stone-900 font-sans relative", isWails && "wails-compact")}>
      
      {/* DEPOLAR PANELİ — Kalıcı Yüklü, unmount edilmez */}
      <div
        aria-hidden={!isDepolarTab}
        className={cn(
          "fixed inset-0 z-50 bg-stone-50 overflow-hidden flex flex-col transition-all duration-300",
          isDepolarTab ? "opacity-100 pointer-events-auto visible" : "opacity-0 pointer-events-none invisible"
        )}
      >
        <Depolar 
          cart={cart} 
          gln={data?.gln || 'local'} 
          onBack={() => setActiveTab('oneri')} 
          webviewRefs={sharedWebviewRefs}
          pendingSearch={pendingDepoSearch}
          onSearchProcessed={() => setPendingDepoSearch(null)}
          onGoToSettings={() => setActiveTab('ayarlar')}
          isActive={isDepolarTab}
        />
      </div>

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
            <SideNavItem id="oneri" icon={Sparkles} label="Sipariş Önerisi" activeTab={activeTab} onClick={(id: string) => { setActiveTab(id); setSidebarOpen(false); }} accent="teal" badge="AI" />
            {/* Kritik Stoklar buradan kaldırıldı */}
            <SideNavItem id="sepet" icon={ShoppingCart} label="Sipariş Sepeti" activeTab={activeTab} onClick={(id: string) => { setActiveTab(id); setSidebarOpen(false); }} accent="emerald"
              badge={cartSummary.items > 0 ? String(cartSummary.items) : undefined} />
            <SideNavItem id="depolar" icon={Truck} label="Depolar" activeTab={activeTab} onClick={(id: string) => { setActiveTab(id); setSidebarOpen(false); }} accent="blue" />
            <NavDivider label="Takip" />
            <SideNavItem id="yok_listesi" icon={ListX} label="Yok Listem" activeTab={activeTab} onClick={(id: string) => { setActiveTab(id); setSidebarOpen(false); }} accent="red" />
            <SideNavItem id="gozden_kacanlar" icon={EyeOff} label="Gözden Kaçanlar" activeTab={activeTab} onClick={(id: string) => { setActiveTab(id); setSidebarOpen(false); }} accent="amber" />
            <SideNavItem id="iadeler" icon={RotateCcw} label="İadeler" activeTab={activeTab} onClick={(id: string) => { setActiveTab(id); setSidebarOpen(false); }} accent="emerald" />
            <SideNavItem id="psf_kontrol" icon={Tag} label="PSF Kontrolü" activeTab={activeTab} onClick={(id: string) => { setActiveTab(id); setSidebarOpen(false); }} accent="yellow" />
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
            <SideNavItem id="kategori_yonetimi" icon={Layers} label="Kategori Yönetimi" activeTab={activeTab} onClick={(id: string) => { setActiveTab(id); setSidebarOpen(false); }} accent="teal" />
            <SideNavItem id="veritabani_araci" icon={Database} label="Veritabanı Aracı" activeTab={activeTab} onClick={(id: string) => { setActiveTab(id); setSidebarOpen(false); }} accent="orange" />
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
                    label={filterKritik !== 'active' ? "AI Önerisi" : "Kritik Stok"}
                    value={filteredGroups.length}
                    sub={filterKritik !== 'active' ? "sipariş fırsatı" : "acil tedarik"}
                    color={filterKritik !== 'active' ? "violet" : "red"}
                    icon={filterKritik !== 'active' ? Sparkles : Zap}
                    onClick={() => setFilterKritik(nextFilterState(filterKritik))} // Tıklayınca modu değiştirir
                  />
                  <StatPill label="Hareketsiz Stok" value={data?.olu_stok_listesi?.length || 0} sub="ölü stok" color="slate" icon={Moon} onClick={() => setActiveTab('os')} />
                  <StatPill label="Miad Riski" value={data?.miad_risk_listesi?.length || 0} sub="son 6 ay" color="amber" icon={AlertTriangle} onClick={() => setActiveTab('mr')} />
                </div>

                {/* TEK PANEL */}
                <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm">

                  {/* Panel header — Satır 1: toggle + kritik + arama */}
                  <div className="px-3 md:px-5 py-3 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      {/* 7'li Yatay Filtre Grubu */}
                      <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
                        {/* İlaç */}
                        <button onClick={() => setFilterIlac(nextFilterState(filterIlac))}
                          className={getFilterBtnClass(filterIlac, "bg-stone-900 border-stone-900 text-white shadow-sm")}>
                          <Pill size={14} className={filterIlac === 'active' ? "fill-white" : ""} />
                          <span>İlaç</span>
                        </button>

                        {/* İlaç Dışı */}
                        <button onClick={() => setFilterDisi(nextFilterState(filterDisi))}
                          className={getFilterBtnClass(filterDisi, "bg-stone-900 border-stone-900 text-white shadow-sm")}>
                          <Sparkles size={14} className={filterDisi === 'active' ? "fill-white" : ""} />
                          <span>İlaç Dışı</span>
                        </button>

                        {/* Kritik */}
                        <button onClick={() => setFilterKritik(nextFilterState(filterKritik))}
                          className={getFilterBtnClass(filterKritik, "bg-red-600 border-red-600 text-white shadow-sm shadow-red-200")}>
                          <Zap size={14} className={filterKritik === 'active' ? "fill-white" : ""} />
                          <span>Kritik</span>
                        </button>

                        {/* Stoğu Tükenmiş */}
                        <button onClick={() => setFilterZero(nextFilterState(filterZero))}
                          className={getFilterBtnClass(filterZero, "bg-rose-600 border-rose-600 text-white shadow-sm shadow-rose-200")}>
                          <PackageX size={14} className={filterZero === 'active' ? "fill-white" : ""} />
                          <span>Stoğu Tükenmiş</span>
                        </button>

                        {/* TNF */}
                        <button onClick={() => setFilterTnf(nextFilterState(filterTnf))}
                          className={getFilterBtnClass(filterTnf, "bg-violet-600 border-violet-600 text-white shadow-sm shadow-violet-200")}>
                          <FlaskConical size={14} className={filterTnf === 'active' ? "fill-white" : ""} />
                          <span>TNF</span>
                        </button>

                        {/* Enteral */}
                        <button onClick={() => setFilterEnteral(nextFilterState(filterEnteral))}
                          className={getFilterBtnClass(filterEnteral, "bg-amber-600 border-amber-600 text-white shadow-sm shadow-amber-200")}>
                          <Activity size={14} className={filterEnteral === 'active' ? "fill-white" : ""} />
                          <span>Enteral</span>
                        </button>

                        {/* Eşdeğersiz */}
                        <button onClick={() => setFilterEsdegersiz(nextFilterState(filterEsdegersiz))}
                          className={getFilterBtnClass(filterEsdegersiz, "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-200")}>
                          <Layers size={14} className={filterEsdegersiz === 'active' ? "fill-white" : ""} />
                          <span>Eşdeğersiz</span>
                        </button>
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
                    <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-0.5 scrollbar-hide w-full justify-between">
                      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                        {/* AI Sipariş Modu Butonu */}
                        <button
                          onClick={() => setShowAIModal(true)}
                          className="h-8 px-3 rounded-lg text-[11px] font-black bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm hover:shadow-md hover:from-violet-700 hover:to-indigo-700 transition-all flex items-center gap-1.5 shrink-0 select-none"
                        >
                          <Sparkles size={12} className="text-white fill-white/25" />
                          <span>AI Sipariş Modu</span>
                        </button>

                        {/* Acil Sipariş Modu Butonu */}
                        <button
                          onClick={() => setShowUrgentModal(true)}
                          className="h-8 px-3 rounded-lg text-[11px] font-black bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 shrink-0 select-none"
                        >
                          <Zap size={12} className="text-white fill-white/25 animate-pulse" />
                          <span>Acil Sipariş Modu</span>
                        </button>

                        <div className="w-px h-5 bg-stone-200 shrink-0" />

                        {/* Stok Ömrü Filtresi */}
                        <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200/60 shrink-0 h-8">
                          <span className="text-[9px] font-bold text-stone-500 px-2 select-none whitespace-nowrap">Stok Ömrü &lt;</span>
                          {[
                            { label: 'Ay Sonu', value: 'month-end' },
                            { label: '2G', value: 2 },
                            { label: '7G', value: 7 },
                            { label: '15G', value: 15 },
                            { label: '30G', value: 30 },
                            { label: '45G', value: 45 },
                            { label: '60G', value: 60 },
                            { label: '90G', value: 90 },
                          ].map(opt => {
                            const limit = opt.value === 'month-end' ? getDaysUntilMonthEnd() : opt.value as number;
                            const isActive = selectedDaysLimit === limit;
                            return (
                              <button
                                key={opt.label}
                                onClick={() => setSelectedDaysLimit(limit)}
                                className={cn(
                                  "h-7 px-2 text-[10px] font-bold rounded-md transition-all whitespace-nowrap",
                                  isActive
                                    ? "bg-white text-stone-950 shadow-sm border border-stone-200/40"
                                    : "text-stone-500 hover:text-stone-850"
                                )}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Grup Başlıklarını Gizleme Checkbox'ı */}
                        <label className="flex items-center gap-1.5 cursor-pointer select-none text-[10px] font-bold text-stone-500 hover:text-stone-850 transition-colors shrink-0 h-8 px-2.5 bg-stone-50 border border-stone-200 rounded-lg">
                          <input 
                            type="checkbox" 
                            checked={hideGroupHeaders} 
                            onChange={e => {
                              const val = e.target.checked;
                              setHideGroupHeaders(val);
                              localStorage.setItem('nexus_hide_group_headers', String(val));
                            }} 
                            className="w-3.5 h-3.5 rounded border-stone-300 text-teal-600 focus:ring-teal-500/20 cursor-pointer" 
                          />
                          <span>Grupları Gizle</span>
                        </label>

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

                      {/* Ürün Arama Kutusu (En Sağda) */}
                      <div className="relative w-64 shrink-0">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 pointer-events-none" />
                        <input type="text" placeholder="Ürün ara..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 h-8 text-[11px] bg-stone-50 border border-stone-200 rounded-lg outline-none focus:bg-white transition-all focus:border-stone-300 font-medium" />
                      </div>
                    </div>


                  </div>

                  {/* İÇERİK — mobilde kart listesi, masaüstünde tablo */}
                  {(() => {
                    const list = filteredGroups;
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
                              <col style={{ width: '300px' }} /> {/* Sipariş */}
                            </colgroup>
                            <thead className="sticky top-0 z-10 bg-white border-b border-stone-100">
                              <tr>
                                <th className="py-4 text-center align-middle">
                                  <input
                                    type="checkbox"
                                    checked={isAllMainSelected}
                                    onChange={handleToggleSelectAllMain}
                                    className="w-3.5 h-3.5 rounded border-stone-300 text-teal-600 focus:ring-teal-500 cursor-pointer bg-white"
                                  />
                                </th>
                                <th className="py-4 px-3 text-left font-semibold text-stone-400 text-[10px] uppercase tracking-widest">Ürün Bilgisi</th>
                                <th className="py-4 font-semibold text-stone-400 text-[10px] uppercase tracking-widest text-center">Sipariş</th>
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
                                  showTree={isDynamicPharmaceuticalCategory(g.kategori_id || 0)}
                                  onEditCategory={setEditingCategoryProduct}
                                  onAddToYokListesi={handleAddToYokListesi}
                                  onEditProductDetails={setEditingDbProduct}
                                  selectedDaysLimit={selectedDaysLimit}
                                  hideGroupHeaders={hideGroupHeaders}
                                  onSorgulaMf={(urun: any) => setMfQueryProduct(urun)}
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
                 {activeTab === 'yok_listesi' && (
                  <YokListesi 
                    data={data} 
                    gln={data?.gln || 'local'} 
                    cart={cart}
                    updateCart={updateCart}
                    toggleCartItem={toggleCartItem}
                    setCart={setCart}
                    onSearchInWarehouse={(barcode: string) => {
                      setPendingDepoSearch({ barcode, timestamp: Date.now() });
                      setActiveTab('depolar');
                    }}
                    onOpenProductAnalysis={handleOpenProductAnalysis}
                  />
                )}
                {activeTab === 'gozden_kacanlar' && (
                  <GozdenKacanlar 
                    data={data} 
                    gln={data?.gln || 'local'} 
                    cart={cart}
                    updateCart={updateCart}
                    toggleCartItem={toggleCartItem}
                    setCart={setCart}
                    onOpenProductAnalysis={handleOpenProductAnalysis}
                  />
                )}
                {activeTab === 'sepet' && <SepetPage cart={cart} syncStatus={cartSyncStatus} persistItems={updateCartFromSepet} setActiveTab={setActiveTab} gln={data?.gln || 'local'} localOrders={localOrders} data={data} webviewRefs={sharedWebviewRefs} />}
                {/* {activeTab === 'depolar' && <Depolar cart={cart} gln={data?.gln || 'local'} />} */}
                {activeTab === 'gorev' && <TaskBoard gln={data?.gln || 'local'} />}
                {activeTab === 'sayim' && <InventoryBoard data={data?.sayim_plani || []} gln={data?.gln || 'local'} />}
                {activeTab === 'os' && <DeadStockReport data={data?.olu_stok_listesi || []} gln={data?.gln || 'local'} addToReturns={addToReturnsList} onOpenProductAnalysis={handleOpenProductAnalysis} />}
                {activeTab === 'mr' && <ExpiryReport data={data?.miad_risk_listesi || []} addToReturns={addToReturnsList} onOpenProductAnalysis={handleOpenProductAnalysis} />}
                {activeTab === 'st' && <OutOfStockReport data={data?.stok_sifir_listesi || []} onOpenProductAnalysis={handleOpenProductAnalysis} />}
                {activeTab === 'ayarlar' && <AyarlarPage supabase={supabase} />}
                {activeTab === 'kategori_yonetimi' && <CategoryManager />}
                {activeTab === 'veritabani_araci' && <DatabaseManager />}
                {activeTab === 'iadeler' && <IadelerPage gln={data?.gln || 'local'} data={data} onOpenProductAnalysis={handleOpenProductAnalysis} />}
                {activeTab === 'psf_kontrol' && <PsfKontrolPage data={data} gln={data?.gln || 'local'} webviewRefs={sharedWebviewRefs} onOpenProductAnalysis={handleOpenProductAnalysis} />}
                {/* {activeTab === 'kardes' && <KardesEczanePage />} */}
                {['nb', 'para'].includes(activeTab) && (
                  <DataTable data={activeTab === 'nb' ? (data?.nobet_listesi || []) : (data?.nakit_optimizasyon || [])} type={activeTab} gln={data?.gln || 'local'} handleOpenProductAnalysis={handleOpenProductAnalysis} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* MOBİL BOTTOM NAV */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 z-30 pb-safe">
        {/* Mobil İlaç/İlaç Dışı toggle kaldırıldı, üstteki 7'li filtre grubu kullanılıyor */}
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
                    <button onClick={() => setFilterEsdegersiz(nextFilterState(filterEsdegersiz))}
                      className={cn("h-8 px-3 text-[11px] font-semibold rounded-lg border transition-all flex items-center gap-1.5",
                        filterEsdegersiz === 'active' ? "bg-violet-600 border-violet-600 text-white shadow-sm" :
                        filterEsdegersiz === 'excluded' ? "bg-red-50 border-red-200 text-red-600 line-through decoration-red-400 decoration-2" :
                        "bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:text-stone-700"
                      )}>
                      {filterEsdegersiz === 'active' && <Check size={10} className="inline mr-1" />}
                      <span>Eşdeğersiz</span>
                    </button>

                    {/* Stok Ömrü Filtresi */}
                    <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200/60 shrink-0 h-8">
                      <span className="text-[9px] font-bold text-stone-500 px-2 select-none whitespace-nowrap">Stok Ömrü &lt;</span>
                      {[
                        { label: 'Ay Sonu', value: 'month-end' },
                        { label: '2G', value: 2 },
                        { label: '7G', value: 7 },
                        { label: '15G', value: 15 },
                        { label: '30G', value: 30 },
                        { label: '45G', value: 45 },
                        { label: '60G', value: 60 },
                        { label: '90G', value: 90 },
                      ].map(opt => {
                        const limit = opt.value === 'month-end' ? getDaysUntilMonthEnd() : opt.value as number;
                        const isActive = selectedDaysLimit === limit;
                        return (
                          <button
                            key={opt.label}
                            onClick={() => setSelectedDaysLimit(limit)}
                            className={cn(
                              "h-7 px-2 text-[10px] font-bold rounded-md transition-all whitespace-nowrap",
                              isActive
                                ? "bg-white text-stone-950 shadow-sm border border-stone-200/40"
                                : "text-stone-500 hover:text-stone-850"
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sağ aksiyon grubu */}
                  <div className="flex items-center gap-1.5 ml-auto shrink-0">

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
                                const current = newCart[u.v1] || { qty: 0, mf: 0, inCart: false, ad: u.v2, depo: u.v91 };
                                let targetQty = current.qty;
                                if (!current.inCart) {
                                  const activeDays = selectedDaysLimit !== null ? selectedDaysLimit : 30;
                                  const spd = u.v20 || 0;
                                  const stk = u.v4 || 0;
                                  const need = Math.round(Math.max(0, spd * activeDays - stk));
                                  targetQty = need > 0 ? need : 1;
                                }
                                newCart[u.v1] = { 
                                  ...current, 
                                  qty: targetQty, 
                                  inCart: true, 
                                  mf: current.mf || calculateAutoMF(targetQty, u.mf_baremleri),
                                  ad: u.v2,
                                  depo: u.v91,
                                  v95: u.v95,
                                  mf_baremleri: u.mf_baremleri
                                };
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
                        <col style={{ width: '45px' }} /> {/* Checkbox */}
                        <col /> {/* Ürün Bilgisi */}
                        <col style={{ width: '300px' }} /> {/* Sipariş */}
                      </colgroup>
                      <thead className="sticky top-0 z-10 bg-white border-b border-stone-100">
                        <tr>
                          <th className="py-4 text-center align-middle">
                            <input
                              type="checkbox"
                              checked={isAllExpandedSelected}
                              onChange={handleToggleSelectAllExpanded}
                              className="w-3.5 h-3.5 rounded border-stone-300 text-teal-600 focus:ring-teal-500 cursor-pointer bg-white"
                            />
                          </th>
                          <th 
                            onClick={() => handleCockpitSort('ad')}
                            className="py-4 px-3 text-left font-semibold text-stone-400 text-[10px] uppercase tracking-widest select-none cursor-pointer hover:text-stone-600"
                          >
                            Ürün Bilgisi{cockpitSortField === 'ad' ? (cockpitSortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                          </th>
                          <th className="py-4 font-semibold text-stone-400 text-[10px] uppercase tracking-widest text-center">
                            Sipariş
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.slice(0, visibleGroupsCount).map((g: any, gi: number) => (
                          <TableGroupRow key={gi} grup={g} cart={cart} updateCart={updateCart}
                            toggleCartItem={toggleCartItem} copyFn={copyToClipboard} copiedId={copiedBarkod}
                            openAnalysis={setSelectedAnalysis} activeMenu={activeMenu} setActiveMenu={setActiveMenu}
                            onIgnore={handleIgnore} selectedBarkods={selectedBarkods} setSelectedBarkods={setSelectedBarkods}
                            onGrupDetail={setSelectedGrup} selectedDaysLimit={selectedDaysLimit}
                            onSorgulaMf={(urun: any) => setMfQueryProduct(urun)} />
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
            getBreadcrumb={getDynamicBreadcrumb}
            cart={cart}
            updateCart={updateCart}
            toggleCartItem={toggleCartItem}
            setCart={setCart}
          />
        )}
      </AnimatePresence>

            {/* KATEGORİ DÜZENLEME MODALI */}
      <AnimatePresence>
        {editingCategoryProduct && (
          <CategoryEditModal
            urun={editingCategoryProduct}
            categories={dbCategories}
            onClose={() => setEditingCategoryProduct(null)}
            onSave={handleSaveProductCategory}
          />
        )}
      </AnimatePresence>

      {/* İLAÇ DB DÜZENLEME MODALI */}
      <AnimatePresence>
        {editingDbProduct && (
          <ProductDbModal
            urun={editingDbProduct}
            categories={dbCategories}
            onClose={() => setEditingDbProduct(null)}
            onSave={async () => {
              setEditingDbProduct(null);
              await loadData();
            }}
          />
        )}
      </AnimatePresence>

      {/* ANALİZ MODALI */}
      <AnimatePresence>
        {selectedAnalysis && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-end md:items-center justify-center bg-stone-900/40 backdrop-blur-sm p-0 md:p-6"
            onClick={() => setSelectedAnalysis(null)}>
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
              onClick={(e: any) => e.stopPropagation()}
              className="bg-white rounded-t-[2rem] md:rounded-[2rem] shadow-2xl w-full md:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-6 py-5 border-b border-stone-100 flex justify-between items-start shrink-0">
                <div className="flex-1 pr-4">
                  <h3 className="font-black text-stone-900 text-lg leading-tight">{selectedAnalysis.v2}</h3>
                  <p className="text-xs font-mono text-stone-400 mt-1">Barkod: {selectedAnalysis.v1}</p>
                  {selectedAnalysis.kategori_id && (
                    <span className="text-xs font-medium text-teal-600 mt-1.5 bg-teal-50 inline-block px-2 py-0.5 rounded-lg">{getDynamicBreadcrumb(selectedAnalysis.kategori_id)}</span>
                  )}
                </div>
                <button onClick={() => setSelectedAnalysis(null)}
                  className="h-9 w-9 flex items-center justify-center rounded-xl bg-stone-100 hover:bg-red-50 hover:text-red-600 transition-colors text-stone-500 shrink-0">
                  <X size={16} />
                </button>
              </div>
              {(() => {
                const productGroup = data?.gruplar?.find((g: any) => g.detaylar?.some((d: any) => d.v1 === selectedAnalysis.v1)) || null;
                if (!productGroup) return null;
                return (
                  <div className="flex border-b border-stone-100 shrink-0 bg-stone-50/50 px-6 py-2.5 gap-3">
                    <button
                      onClick={() => setAnalysisTab('product')}
                      className={cn(
                        "px-4 py-2 text-xs font-black rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer border",
                        analysisTab === 'product'
                          ? "bg-teal-600 text-white border-teal-600 shadow-teal-100"
                          : "bg-white text-stone-500 hover:text-stone-750 border-stone-200 hover:bg-stone-50"
                      )}
                    >
                      İlaç Analizi
                    </button>
                    <button
                      onClick={() => setAnalysisTab('group')}
                      className={cn(
                        "px-4 py-2 text-xs font-black rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer border",
                        analysisTab === 'group'
                          ? "bg-teal-600 text-white border-teal-600 shadow-teal-100"
                          : "bg-white text-stone-500 hover:text-stone-750 border-stone-200 hover:bg-stone-50"
                      )}
                    >
                      Grup Analizi ({productGroup.lider_adi})
                    </button>
                  </div>
                );
              })()}
              <div className="p-0 overflow-y-auto custom-scrollbar bg-white">
                {(() => {
                  const productGroup = data?.gruplar?.find((g: any) => g.detaylar?.some((d: any) => d.v1 === selectedAnalysis.v1)) || null;
                  if (analysisTab === 'group' && productGroup) {
                    return (
                      <GrupDetailContent
                        grup={productGroup}
                        rawGrup={productGroup}
                        getBreadcrumb={getDynamicBreadcrumb}
                        cart={cart}
                        updateCart={updateCart}
                        toggleCartItem={toggleCartItem}
                        setCart={setCart}
                        onProductClick={(u: any) => {
                          setSelectedAnalysis(u);
                          setAnalysisTab('product');
                        }}
                      />
                    );
                  }

                  const dailySpeed = selectedAnalysis.v20 || 0;
                  const stock = selectedAnalysis.v4 || 0;
                  const lifeDays = dailySpeed > 0 ? Math.floor(stock / dailySpeed) : 0;
                  const shelfLifeText = stock <= 0 ? 'Tükendi' : dailySpeed <= 0 ? 'Hareketsiz' : `${lifeDays} Gün`;
                  const shelfLifeColor = stock <= 0 ? 'text-red-500' : dailySpeed <= 0 ? 'text-stone-400' : lifeDays <= 15 ? 'text-red-500' : lifeDays > 180 ? 'text-amber-500' : 'text-teal-600';

                  return (
                    <>
                      {/* BİLGİ KUTULARI (KPI GRID) */}
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 px-5 py-3 border-b border-stone-100 bg-stone-50/30">
                        <div className="bg-white border border-stone-200 rounded-xl p-2 text-center shadow-sm">
                          <div className="text-[9px] text-stone-400 font-black uppercase tracking-widest">Mevcut Stok</div>
                          <div className={cn("text-xs font-black mt-0.5", stock <= 0 ? "text-red-500" : "text-stone-850")}>{stock} Adet</div>
                        </div>
                        <div className="bg-white border border-stone-200 rounded-xl p-2 text-center shadow-sm">
                          <div className="text-[9px] text-stone-400 font-black uppercase tracking-widest">Aylık Hız</div>
                          <div className="text-xs font-black text-blue-600 mt-0.5">{(dailySpeed * 30).toFixed(1)}/ay</div>
                        </div>
                         <div className="bg-white border border-stone-200 rounded-xl p-2 text-center shadow-sm">
                          <div className="text-[9px] text-stone-400 font-black uppercase tracking-widest">Son 1 Ay</div>
                          <div className="text-xs font-black text-stone-700 mt-0.5">{selectedAnalysis.v22 || 0} Adet</div>
                        </div>
                        <div className="bg-white border border-stone-200 rounded-xl p-2 text-center shadow-sm">
                          <div className="text-[9px] text-stone-400 font-black uppercase tracking-widest">Son 2 Ay</div>
                          <div className="text-xs font-black text-stone-700 mt-0.5">{selectedAnalysis.v23 || 0} Adet</div>
                        </div>
                        <div className="bg-white border border-stone-200 rounded-xl p-2 text-center shadow-sm">
                          <div className="text-[9px] text-stone-400 font-black uppercase tracking-widest">Yıllık Çıkış</div>
                          <div className="text-xs font-black text-stone-700 mt-0.5">{selectedAnalysis.v24 || 0} Adet</div>
                        </div>
                        <div className="bg-white border border-stone-200 rounded-xl p-2 text-center shadow-sm">
                          <div className="text-[9px] text-stone-400 font-black uppercase tracking-widest">Kalan Ömür</div>
                          <div className={cn("text-xs font-black mt-0.5", shelfLifeColor)}>{shelfLifeText}</div>
                        </div>
                      </div>

                      {/* HIZLI SİPARİŞ BANNERI */}
                      <div className="bg-teal-50/40 border-b border-stone-100 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                            <ShoppingCart size={18} />
                          </div>
                          <div>
                            <h4 className="font-bold text-stone-900 text-sm">Hızlı Sipariş</h4>
                            <p className="text-xs text-stone-500">Miktar belirleyip sepetinize ekleyin veya güncelleyin.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-stone-200 shadow-sm max-w-sm">
                          <div className="w-20">
                            <label className="block text-[9px] text-stone-400 font-black uppercase tracking-wider mb-0.5 pl-1">Miktar</label>
                            <input
                              type="number"
                              value={modalQty}
                              onChange={e => handleModalQtyChange(Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-full h-8 px-2 border border-stone-200 rounded-lg font-bold font-mono text-xs outline-none focus:border-teal-500 bg-stone-50/30 text-center"
                              min="0"
                            />
                          </div>
                          <div className="w-20">
                            <label className="block text-[9px] text-stone-400 font-black uppercase tracking-wider mb-0.5 pl-1">MF Baremi</label>
                            <input
                              type="number"
                              value={modalMf}
                              onChange={e => setModalMf(Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-full h-8 px-2 border border-stone-200 rounded-lg font-bold font-mono text-xs text-teal-600 outline-none focus:border-teal-500 bg-stone-50/30 text-center"
                              min="0"
                            />
                          </div>
                          <div className="flex gap-1.5 pt-4">
                            <button
                              onClick={handleModalAddToCart}
                              className="h-8 px-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 shrink-0"
                            >
                              <Check size={12} /> {cart[selectedAnalysis.v1]?.inCart ? "Güncelle" : "Ekle"}
                            </button>
                            {cart[selectedAnalysis.v1]?.inCart && (
                              <button
                                onClick={handleModalRemoveFromCart}
                                className="h-8 w-8 border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs rounded-lg transition-all flex items-center justify-center shrink-0"
                                title="Sepetten Çıkar"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <table className="w-full text-left border-collapse text-sm">
                        <tbody className="divide-y divide-stone-100">
                        {/* MF HAREKETLERİ */}
                        <tr className="hover:bg-stone-50/50 transition-colors">
                          <th className="w-[110px] min-w-[110px] p-3 bg-stone-50/30 text-[10px] font-black text-stone-400 uppercase tracking-tight align-top border-r border-stone-100">
                            <div className="flex flex-col items-center text-center gap-1.5 mt-1"><Activity size={16} className="text-emerald-500" /> MF Geçmişi</div>
                          </th>
                          <td className="p-5 align-top">
                            {(() => {
                              const purchases = getPurchaseHistory(selectedAnalysis.v95);
                              const queries = getQueryHistory(selectedAnalysis.v1, localOrders);
                              
                              if (purchases.length === 0 && queries.length === 0) {
                                return <p className="text-stone-400 text-xs font-medium italic">Son 6 aya ait MF alım veya sorgu geçmişi bulunamadı.</p>;
                              }
                              return (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Sol Kolon: Fatura Alımları */}
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-1.5 h-3 rounded bg-blue-500"></span>
                                      <h4 className="text-[10px] font-black text-stone-500 uppercase tracking-widest">🚚 Son 5 Depo Alımı (Fatura)</h4>
                                    </div>
                                    {purchases.length === 0 ? (
                                      <p className="text-stone-400 text-xs italic bg-stone-50 p-3 rounded-xl border border-stone-100 shadow-sm">Alım geçmişi bulunamadı.</p>
                                    ) : (
                                      <div className="border border-stone-100 rounded-xl overflow-hidden bg-white shadow-sm">
                                        <table className="w-full text-left text-xs border-collapse">
                                          <thead className="bg-stone-50 text-stone-550 border-b border-stone-100">
                                            <tr>
                                              <th className="px-3 py-2 font-bold uppercase tracking-wider text-[9px]">Tarih</th>
                                              <th className="px-3 py-2 font-bold uppercase tracking-wider text-[9px]">Depo</th>
                                              <th className="px-3 py-2 font-bold uppercase tracking-wider text-[9px] text-center">MF</th>
                                              <th className="px-3 py-2 font-bold uppercase tracking-wider text-[9px] text-right">Miktar</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-stone-100 text-stone-700 font-medium">
                                            {purchases.map((h, hi) => (
                                              <tr key={hi} className="hover:bg-stone-50/30 transition-colors">
                                                <td className="px-3 py-2 font-mono text-stone-500">{h.date.split('-').reverse().join('.')}</td>
                                                <td className="px-3 py-2 truncate max-w-[100px] font-semibold text-stone-700" title={h.depo}>{h.depo}</td>
                                                <td className="px-3 py-2 text-center font-black text-emerald-600">{h.mf}</td>
                                                <td className="px-3 py-2 text-right font-mono text-stone-600">{h.qty}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>

                                  {/* Sağ Kolon: Sorgularda En Son MF'ler */}
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-1.5 h-3 rounded bg-amber-500"></span>
                                      <h4 className="text-[10px] font-black text-stone-500 uppercase tracking-widest">🔍 Depo Sorgularında En Son MF'ler</h4>
                                    </div>
                                    {queries.length === 0 ? (
                                      <p className="text-stone-400 text-xs italic bg-stone-50 p-3 rounded-xl border border-stone-100 shadow-sm">Sorgu geçmişi bulunamadı.</p>
                                    ) : (
                                      <div className="border border-stone-100 rounded-xl overflow-hidden bg-white shadow-sm">
                                        <table className="w-full text-left text-xs border-collapse">
                                          <thead className="bg-stone-50 text-stone-550 border-b border-stone-100">
                                            <tr>
                                              <th className="px-3 py-2 font-bold uppercase tracking-wider text-[9px]">Tarih</th>
                                              <th className="px-3 py-2 font-bold uppercase tracking-wider text-[9px]">Depo</th>
                                              <th className="px-3 py-2 font-bold uppercase tracking-wider text-[9px] text-right">Bulunan MF'ler</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-stone-100 text-stone-700 font-medium">
                                            {queries.map((q, qi) => (
                                              <tr key={qi} className="hover:bg-stone-50/30 transition-colors">
                                                <td className="px-3 py-2 font-mono text-stone-500">{q.date.split('-').reverse().join('.')}</td>
                                                <td className="px-3 py-2 font-bold text-stone-600">{q.depo}</td>
                                                <td className="px-3 py-2 text-right font-black text-emerald-600">{q.baremsStr}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </td>
                        </tr>

                        {/* STRATEJİK TAVSİYE */}
                        {(selectedAnalysis.ek_tavsiye || selectedAnalysis.stratejik_tavsiye) && (
                          <tr className="hover:bg-stone-50/50 transition-colors">
                            <th className="w-[110px] min-w-[110px] p-3 bg-stone-50/30 text-[10px] font-black text-stone-400 uppercase tracking-tight align-top border-r border-stone-100">
                              <div className="flex flex-col items-center text-center gap-1.5 mt-1"><Sparkles size={16} className="text-teal-500" /> Strateji</div>
                            </th>
                            <td className="p-5 align-top">
                              {renderTavsiye(selectedAnalysis.ek_tavsiye || selectedAnalysis.stratejik_tavsiye)}
                            </td>
                          </tr>
                        )}

                        {/* GRUP ANALİZİ */}
                        {(selectedAnalysis.grup_analizi || selectedAnalysis.grup_yorumu) && (
                          <tr className="hover:bg-stone-50/50 transition-colors">
                            <th className="w-[110px] min-w-[110px] p-3 bg-stone-50/30 text-[10px] font-black text-stone-400 uppercase tracking-tight align-top border-r border-stone-100">
                              <div className="flex flex-col items-center text-center gap-1.5 mt-1"><Activity size={16} className="text-violet-500" /> Grup Analizi</div>
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
                            <th className="w-[110px] min-w-[110px] p-3 bg-stone-50/30 text-[10px] font-black text-stone-400 uppercase tracking-tight align-top border-r border-stone-100">
                              <div className="flex flex-col items-center text-center gap-1.5 mt-1"><Brain size={16} className="text-stone-400" /> Karar Logları</div>
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
                  </>
                );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACİL SİPARİŞ MODALI */}
      <AnimatePresence>
        {showUrgentModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-stone-900/40 backdrop-blur-sm p-0 md:p-6"
            onClick={() => { if (!urgentSimulating) setShowUrgentModal(false); }}>
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
              onClick={(e: any) => e.stopPropagation()}
              className="bg-white rounded-t-[2rem] md:rounded-[2rem] shadow-2xl w-full md:max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
              
              {/* MODAL HEADER */}
              <div className="px-6 py-5 border-b border-stone-100 flex justify-between items-start shrink-0">
                <div>
                  <h3 className="font-black text-stone-900 text-base leading-tight flex items-center gap-2">
                    <Zap size={18} className="text-red-500 fill-red-500/10" />
                    Acil Sipariş Modülü
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">Son veri paketinde hareket görmüş, stoksuz kalmış veya 2 günden az ömrü kalmış acil ürünler.</p>
                </div>
                <button onClick={() => { if (!urgentSimulating) setShowUrgentModal(false); }} disabled={urgentSimulating}
                  className="h-9 w-9 flex items-center justify-center rounded-xl bg-stone-100 hover:bg-red-50 hover:text-red-600 transition-colors text-stone-500 shrink-0 disabled:opacity-50">
                  <X size={16} />
                </button>
              </div>

              {/* MODAL BODY */}
              <div className="px-4 py-3 overflow-y-auto custom-scrollbar bg-white flex-1 flex flex-col gap-3">

                {/* KONTROL BANDI */}
                <div className="bg-gradient-to-r from-red-50 to-stone-50 border border-red-100 rounded-2xl px-4 py-3 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest shrink-0">Depo:</span>
                    <select
                      value={urgentWarehouse}
                      onChange={(e) => setUrgentWarehouse(e.target.value)}
                      className="bg-transparent text-[11px] font-black text-slate-700 outline-none border-none cursor-pointer"
                    >
                      {loadDepolar().filter(d => d.enabled !== false).map(d => (
                        <option key={d.id} value={d.id}>{d.ad}</option>
                      ))}
                    </select>

                    <div className="w-[1px] h-4 bg-stone-200 mx-2 hidden sm:block"></div>

                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest shrink-0">Hedef Ömür:</span>
                    <select
                      value={urgentDaysLimit}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUrgentDaysLimit(val === 'aySonu' ? 'aySonu' : parseInt(val));
                      }}
                      className="h-7 px-2 border border-stone-200 rounded-lg text-[11px] font-bold text-stone-650 bg-white outline-none focus:border-red-500 cursor-pointer"
                    >
                      <option value="7">7 Günlük</option>
                      <option value="30">30 Günlük</option>
                      <option value="45">45 Günlük</option>
                      <option value="60">60 Günlük</option>
                    </select>

                    <div className="w-[1px] h-4 bg-stone-200 mx-2 hidden sm:block"></div>

                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-stone-600 hover:text-red-700 transition-colors" title="MF sorgulaması yapmadan yalnızca önbellek/yerel verilerle simülasyon yap">
                      <input type="checkbox" checked={urgentSkipMfQuery} onChange={e => setUrgentSkipMfQuery(e.target.checked)} className="w-3.5 h-3.5 rounded accent-red-650" />
                      MF Sorgulamayı atla
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Excel, PDF, WhatsApp İndirme Butonları (Sadece sonuçlar varsa gösterilir) */}
                    {urgentResults.length > 0 && (
                      <div className="flex items-center gap-1.5 border-r border-stone-200 pr-3 mr-1.5 shrink-0">
                        <button onClick={handleExportUrgentExcel} className="h-8 px-2.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1 cursor-pointer" title="Excel Olarak İndir">
                          <Download size={11} /> Excel
                        </button>
                        <button onClick={handleExportUrgentPdf} className="h-8 px-2.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1 cursor-pointer" title="PDF Raporu Oluştur">
                          <FileText size={11} /> PDF
                        </button>
                        <button onClick={handleShareUrgentWhatsapp} className="h-8 px-2.5 rounded-lg text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors flex items-center gap-1.5 cursor-pointer" title="WhatsApp ile Paylaş">
                          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.803-4.389 9.805-9.788.002-2.615-1.012-5.074-2.859-6.925C16.37 2.04 13.916.996 11.998.996 6.592.996 2.192 5.389 2.19 10.789c-.001 1.5.49 2.961 1.422 4.5l-.995 3.636 3.73-.978zm13.14-5.38c-.3-.15-1.77-.874-2.045-.974-.275-.1-.475-.15-.675.15-.2.3-.77.974-.945 1.174-.175.2-.35.225-.65.075-.3-.15-1.265-.467-2.41-1.485-.89-.795-1.49-1.777-1.665-2.077-.175-.3-.02-.463.13-.613.135-.135.3-.35.45-.525.15-.175.2-.3.3-.5s.05-.375-.025-.525C10.74 8.796 10.14 7.32 9.89 6.72c-.244-.585-.491-.506-.675-.516-.175-.01-.375-.01-.575-.01-.2 0-.525.075-.8 1.075-.275 1.075-.77 2.455-.77 2.505 0 .05.075.325.275.6.2.275 1.34 2.046 3.245 2.87 1.57.68 2.185.748 2.97.63.485-.075 1.77-.724 2.02-1.399.25-.675.25-1.25.175-1.375-.075-.125-.275-.2-.575-.35z"/></svg> Paylaş
                        </button>
                      </div>
                    )}

                    {!urgentSimulating && (
                      <button onClick={runUrgentQuery} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-red-200 transition-all flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer">
                        <Zap size={14} /> {urgentResults.length > 0 ? "Sorgulamayı Yenile" : "Sorgulamayı Başlat"}
                      </button>
                    )}
                    {urgentSimulating && (
                      <div className="flex items-center gap-3">
                        <div className="relative w-6 h-6">
                          <div className="absolute inset-0 rounded-full border-2 border-red-100"></div>
                          <div className="absolute inset-0 rounded-full border-2 border-red-600 border-t-transparent animate-spin"></div>
                        </div>
                        <p className="text-xs font-bold text-red-600 animate-pulse">{urgentProgress}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* SORGULANACAK / SORGULANMIŞ ÜRÜN TABLOSU */}
                <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-sm bg-white flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto custom-scrollbar" style={{maxHeight: 'calc(95vh - 220px)'}}>
                    {urgentResults.length === 0 ? (
                      <div className="p-8 text-center text-stone-400 font-medium">
                        {getUrgentProducts().length === 0 ? (
                          "Acil tedarik edilmesi gereken sıfır stoklu veya kritik ömürlü bir ürün bulunmuyor."
                        ) : (
                          <>
                            <p className="mb-2">Kriterlere uygun {getUrgentProducts().length} acil ürün belirlendi.</p>
                            <p className="text-xs text-stone-400">Canlı stok ve MF kampanyalarını kontrol etmek için yukarıdan depo seçip sorgulamayı başlatın.</p>
                            
                            {/* ÖN İZLEME LİSTESİ */}
                            <div className="mt-4 max-w-xl mx-auto border border-stone-100 rounded-xl overflow-hidden text-left bg-stone-50/50">
                              <table className="w-full text-xs">
                                <thead className="bg-stone-100 text-stone-600 font-bold">
                                  <tr>
                                    <th className="px-3 py-1.5 text-left">Ürün Adı</th>
                                    <th className="px-3 py-1.5 text-center">Stok</th>
                                    <th className="px-3 py-1.5 text-center">Aylık Hız</th>
                                    <th className="px-3 py-1.5 text-center">Ömür (Gün)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {getUrgentProducts().slice(0, 10).map((p, pIdx) => (
                                    <tr key={pIdx} className="border-b border-stone-200/50">
                                      <td 
                                        onClick={() => handleOpenProductAnalysis(p.barkod, p.ad)}
                                        className="px-3 py-1 font-bold text-teal-650 hover:underline hover:text-teal-850 cursor-pointer"
                                        title="İlaç detaylarını ve alım geçmişini görmek için tıklayın"
                                      >
                                        {p.ad}
                                      </td>
                                      <td className="px-3 py-1 text-center font-bold text-stone-600">{p.stok}</td>
                                      <td className="px-3 py-1 text-center font-mono font-bold text-stone-500">{p.hiz.toFixed(1)}/ay</td>
                                      <td className="px-3 py-1 text-center">
                                        <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-bold text-[10px]">{p.estOmur} gün</span>
                                      </td>
                                    </tr>
                                  ))}
                                  {getUrgentProducts().length > 10 && (
                                    <tr>
                                      <td colSpan={4} className="px-3 py-2 text-center text-stone-400 italic font-semibold">... ve diğer {getUrgentProducts().length - 10} ürün daha</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead className="bg-stone-50 text-stone-600 border-b border-stone-200 sticky top-0 z-10">
                          <tr>
                            <th className="px-3 py-1.5 font-bold uppercase tracking-wider">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="checkbox"
                                  checked={urgentResults.length > 0 && urgentResults.every(r => r.selected)}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setUrgentResults(prev => prev.map(r => ({ ...r, selected: checked })));
                                  }}
                                  className="w-3.5 h-3.5 rounded accent-red-650 cursor-pointer"
                                />
                                İlaç Adı
                              </div>
                            </th>
                            <th className="px-3 py-1.5 font-bold uppercase tracking-wider text-center w-14">Stok</th>
                            <th className="px-3 py-1.5 font-bold uppercase tracking-wider text-center w-14">Aylık Hız</th>
                            <th className="px-3 py-1.5 font-bold uppercase tracking-wider text-center w-14">Ömür</th>
                            <th className="px-3 py-1.5 font-bold uppercase tracking-wider text-center w-[160px]">Sipariş Miktarı</th>
                            <th className="px-3 py-1.5 font-bold uppercase tracking-wider text-center w-[160px]">Canlı MF</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 font-medium">
                          {urgentResults.map((r, rIdx) => {
                            return (
                              <tr key={rIdx} className={cn("hover:bg-stone-50/50 transition-all", r.onerilen > 0 && "bg-red-50/20")}>
                                <td className="px-3 py-1 font-bold text-stone-900">
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <input
                                        type="checkbox"
                                        checked={!!r.selected}
                                        onChange={() => handleToggleUrgentSelect(r.barkod)}
                                        className="w-3.5 h-3.5 rounded accent-red-650 cursor-pointer shrink-0"
                                      />
                                      <span 
                                        onClick={() => handleOpenProductAnalysis(r.barkod, r.ad)}
                                        className="font-bold text-teal-650 hover:underline hover:text-teal-850 cursor-pointer"
                                        title="İlaç detaylarını ve alım geçmişini görmek için tıklayın"
                                      >
                                        {r.ad}
                                      </span>
                                      {/* Barkod kopyalama - daima görünür, yeşil */}
                                      <button
                                        onClick={() => navigator.clipboard?.writeText(r.barkod)}
                                        className="shrink-0 p-0.5 text-emerald-600 hover:text-emerald-800 transition-all cursor-pointer bg-emerald-50 rounded border border-emerald-200"
                                        title={`Barkodu kopyala: ${r.barkod}`}
                                      >
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                      </button>
                                      {r.whyData && (
                                        <button
                                          onClick={() => setWhyItem(r)}
                                          className="shrink-0 px-1 py-0.5 rounded text-[8px] font-black bg-violet-50 text-violet-500 border border-violet-200 hover:bg-violet-100 transition-colors cursor-pointer"
                                          title="Neden bu barem önerildi?"
                                        >
                                          Neden?
                                        </button>
                                      )}
                                      {r.esdegerGrubu && (
                                        <button
                                          onClick={() => setEsdegerItem(r)}
                                          className="shrink-0 px-1 py-0.5 rounded text-[10px] font-black bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                                          title={`Eşdeğer grubu (${r.esdegerGrubu.urunler.length} ürün)`}
                                        >
                                          ⚖
                                        </button>
                                      )}
                                      {/* Sil butonu - daima görünür, kırmızı */}
                                      <button
                                        onClick={() => handleDeleteUrgentResult(r.barkod)}
                                        className="shrink-0 p-0.5 text-red-600 hover:text-red-800 transition-all cursor-pointer bg-red-50 rounded border border-red-200 ml-auto"
                                        title="Simülasyondan Kaldır"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </div>
                                    <span 
                                      onClick={() => {
                                        navigator.clipboard?.writeText(r.barkod);
                                        setCopiedBarkod(r.barkod);
                                        setTimeout(() => setCopiedBarkod(null), 2000);
                                      }}
                                      className="text-[9px] font-mono text-stone-400 font-normal cursor-pointer hover:underline hover:text-teal-600 mt-0.5 block w-max"
                                      title="Barkodu kopyalamak için tıklayın"
                                    >
                                      {copiedBarkod === r.barkod ? "✓ Kopyalandı" : r.barkod}
                                    </span>
                                    {r.hata && <span className="text-[9px] text-red-500 font-bold">{r.hata}</span>}
                                  </div>
                                </td>
                                <td className="px-3 py-1 text-center font-bold text-stone-600">{r.stok}</td>
                                <td className="px-3 py-1 text-center font-mono font-bold text-stone-500">{r.hiz.toFixed(1)}</td>
                                <td className="px-3 py-1 text-center">
                                  <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-bold text-[10px]">
                                    {r.estOmur}G
                                  </span>
                                </td>
                                <td className="px-3 py-1 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <input
                                      type="number"
                                      value={r.onerilen}
                                      onChange={(e) => {
                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                        setUrgentResults(prev => prev.map(item => item.barkod === r.barkod ? { ...item, onerilen: val, toplamTutar: val * item.depocuFiyati } : item));
                                      }}
                                      className="w-12 h-7 text-center border border-stone-200 rounded-lg font-bold font-mono text-[11px] outline-none focus:border-red-500 bg-white"
                                      min="0"
                                    />
                                    <span className="text-[9px] font-black text-stone-400">Adet</span>
                                  </div>
                                </td>
                                <td className="px-3 py-1 text-center">
                                  <div className="flex flex-col gap-1 items-center justify-center">
                                    <div className="flex flex-wrap gap-0.5 justify-center">
                                      {r.baremler && r.baremler.length > 0 ? (
                                        r.baremler.map((barem: string, bIdx: number) => {
                                          const isSelected = r.secilenBarem === barem;
                                          const isRecommended = r.onerilenMf === barem;
                                          const bgClass = isSelected 
                                            ? "bg-emerald-600 border-emerald-700 text-white font-black" 
                                            : isRecommended 
                                              ? "bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-250 font-extrabold ring-2 ring-amber-400"
                                              : "bg-red-500 border-red-650 text-white hover:bg-red-600";
                                          return (
                                            <button
                                              key={bIdx}
                                              onClick={() => handleUrgentBaremSelect(r.barkod, barem)}
                                              className={cn("px-1.5 py-0.5 rounded text-[9px] font-black border transition-all cursor-pointer whitespace-nowrap", bgClass)}
                                              title={isRecommended ? "45 Günlük Limit İçin En Avantajlı Öneri!" : "Barem seçmek/bırakmak için tıklayın"}
                                            >
                                              {barem} {isRecommended && "⭐"}
                                            </button>
                                          );
                                        })
                                      ) : (
                                        <span className="text-stone-300 font-bold">—</span>
                                      )}
                                    </div>
                                    {r.onerilenMf && (
                                      <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                                        🎯 Öneri (45G): {r.onerilenMf}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

              </div>

              {/* MODAL FOOTER */}
              <div className="px-6 py-4 border-t border-stone-100 bg-stone-50 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-stone-500">
                  {urgentResults.length > 0 && (
                    <>Sipariş Verilen Ürün: <span className="text-red-650 font-black">{urgentResults.filter(r => r.onerilen > 0).length} kalem</span></>
                  )}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => { if (!urgentSimulating) setShowUrgentModal(false); }} disabled={urgentSimulating}
                    className="h-10 px-5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 font-extrabold text-xs transition-colors cursor-pointer disabled:opacity-50">
                    Kapat
                  </button>
                  <button onClick={handleApplyUrgentSuggestions} disabled={urgentSimulating || urgentResults.length === 0 || urgentResults.every(r => r.onerilen === 0)}
                    className="h-10 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer">
                    <Check size={14} /> Onayla ve Sepete Aktar
                  </button>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI SİPARİŞ MODALI */}
      <AnimatePresence>
        {showAIModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-stone-900/40 backdrop-blur-sm p-0 md:p-6"
            onClick={() => { if (!aiSimulating) setShowAIModal(false); }}>
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
              onClick={(e: any) => e.stopPropagation()}
              className="bg-white rounded-t-[2rem] md:rounded-[2rem] shadow-2xl w-full md:max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
              
              {/* MODAL HEADER */}
              <div className="px-6 py-5 border-b border-stone-100 flex justify-between items-start shrink-0">
                <div>
                  <h3 className="font-black text-stone-900 text-base leading-tight flex items-center gap-2">
                    <Sparkles size={18} className="text-violet-600" />
                    AI Akıllı Sipariş Simülasyonu
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">Seçili depo canlı MF ve stok verileriyle optimizasyon yapar.</p>
                </div>
                <button onClick={() => { if (!aiSimulating) setShowAIModal(false); }} disabled={aiSimulating}
                  className="h-9 w-9 flex items-center justify-center rounded-xl bg-stone-100 hover:bg-red-50 hover:text-red-600 transition-colors text-stone-500 shrink-0 disabled:opacity-50">
                  <X size={16} />
                </button>
              </div>

              {/* MODAL BODY */}
              <div className="px-4 py-3 overflow-y-auto custom-scrollbar bg-white flex-1 flex flex-col gap-3">

                {/* KOMPAKT KONTROL BANDI */}
                <div className="bg-gradient-to-r from-violet-50 to-stone-50 border border-violet-100 rounded-2xl px-4 py-3">
                  {/* Üst satır: Slider'lar */}
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    {/* A: Hedef Gün */}
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-violet-600 text-white text-[9px] font-black flex items-center justify-center">A</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-stone-500 truncate">Hedef Stok Süresi</span>
                          <span className="text-xs font-black text-violet-700 ml-1 shrink-0">{aiTargetDays}G</span>
                        </div>
                        <input type="range" min="2" max="60" value={aiTargetDays} onChange={e => setAiTargetDays(parseInt(e.target.value) || 7)} className="w-full accent-violet-600 h-1.5 bg-violet-200 rounded-lg appearance-none cursor-pointer" />
                        <div className="flex gap-1 mt-1.5">
                          {[7, 10, 15, 30].map(d => (
                            <button key={d} onClick={() => setAiTargetDays(d)} className={cn("px-1.5 py-0.5 text-[9px] font-extrabold rounded border transition-colors", aiTargetDays === d ? "bg-violet-600 border-violet-600 text-white" : "bg-white border-stone-200 text-stone-400 hover:border-violet-300 hover:text-violet-600")}>{d}G</button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* B: Max Birikim */}
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-violet-600 text-white text-[9px] font-black flex items-center justify-center">B</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-stone-500 truncate">Max Barem Birikimi</span>
                          <span className="text-xs font-black text-violet-700 ml-1 shrink-0">{aiMaxDays >= 9999 ? '∞' : `${aiMaxDays}G`}</span>
                        </div>
                        <input type="range" min="10" max="90" value={Math.min(aiMaxDays, 90)} onChange={e => setAiMaxDays(parseInt(e.target.value) || 30)} disabled={aiMaxDays >= 9999} className="w-full accent-violet-600 h-1.5 bg-violet-200 rounded-lg appearance-none cursor-pointer disabled:opacity-40" />
                        <div className="flex gap-1 mt-1.5">
                          {[20, 30, 45, 60, 90].map(d => (
                            <button key={d} onClick={() => setAiMaxDays(d)} className={cn("px-1.5 py-0.5 text-[9px] font-extrabold rounded border transition-colors", aiMaxDays === d ? "bg-violet-600 border-violet-600 text-white" : "bg-white border-stone-200 text-stone-400 hover:border-violet-300 hover:text-violet-600")}>{d}G</button>
                          ))}
                          <button onClick={() => setAiMaxDays(9999)} className={cn("px-1.5 py-0.5 text-[9px] font-extrabold rounded border transition-colors", aiMaxDays >= 9999 ? "bg-amber-500 border-amber-600 text-white" : "bg-white border-stone-200 text-stone-400 hover:border-amber-400 hover:text-amber-600")}>∞</button>
                        </div>
                        {aiMaxDays >= 9999 && <p className="text-[9px] text-amber-600 font-bold mt-1">⚠ Sınırsız mod: nakit akışı riskini göz önünde bulundurun.</p>}
                      </div>
                    </div>

                    {/* C: Taşıma Maliyeti */}
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-violet-600 text-white text-[9px] font-black flex items-center justify-center">C</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-stone-500 truncate">Aylık Stok Maliyeti</span>
                          <span className="text-xs font-black text-violet-700 ml-1 shrink-0">%{aiMonthlyCarryingCost}</span>
                        </div>
                        <input type="range" min="0" max="20" step="0.5" value={aiMonthlyCarryingCost} onChange={e => { const val = parseFloat(e.target.value) || 0; setAiMonthlyCarryingCost(val); localStorage.setItem('nexus_ai_carrying_cost', String(val)); }} className="w-full accent-violet-600 h-1.5 bg-violet-200 rounded-lg appearance-none cursor-pointer" />
                        <div className="flex gap-1 mt-1.5">
                          {[2, 3, 5, 8, 10].map(c => (
                            <button key={c} onClick={() => { setAiMonthlyCarryingCost(c); localStorage.setItem('nexus_ai_carrying_cost', String(c)); }} className={cn("px-1.5 py-0.5 text-[9px] font-extrabold rounded border transition-colors", aiMonthlyCarryingCost === c ? "bg-violet-600 border-violet-600 text-white" : "bg-white border-stone-200 text-stone-400 hover:border-violet-300 hover:text-violet-600")}>%{c}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Alt satır: Depo + Filtreler tek satırda */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2.5 border-t border-violet-100/70">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest shrink-0">Depo:</span>
                    <select
                      value={aiSimulationWarehouse}
                      onChange={(e) => setAiSimulationWarehouse(e.target.value)}
                      className="bg-transparent text-[11px] font-black text-slate-700 outline-none border-none cursor-pointer"
                    >
                      {loadDepolar().filter(d => d.enabled !== false).map(d => (
                        <option key={d.id} value={d.id}>{d.ad}</option>
                      ))}
                    </select>

                    <div className="w-px h-4 bg-stone-200 mx-1 shrink-0"></div>

                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest shrink-0">Hariç Tut:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-stone-600 hover:text-violet-700 transition-colors">
                      <input type="checkbox" checked={aiExcludeEnteral} onChange={e => setAiExcludeEnteral(e.target.checked)} className="w-3.5 h-3.5 rounded accent-violet-600" />
                      Enteral
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-stone-600 hover:text-violet-700 transition-colors">
                      <input type="checkbox" checked={aiExcludeTnf} onChange={e => setAiExcludeTnf(e.target.checked)} className="w-3.5 h-3.5 rounded accent-violet-600" />
                      TNF
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-stone-600 hover:text-violet-700 transition-colors">
                      <input type="checkbox" checked={aiExcludeIlacDisi} onChange={e => setAiExcludeIlacDisi(e.target.checked)} className="w-3.5 h-3.5 rounded accent-violet-600" />
                      İlaç Dışı
                    </label>

                    <div className="w-px h-4 bg-stone-200 mx-1 shrink-0"></div>

                    <button onClick={() => setAiOnlySadece(aiOnlySadece === 'ilac_disi' ? 'all' : 'ilac_disi')} className={cn("px-2 py-0.5 text-[10px] font-extrabold rounded-full border transition-colors", aiOnlySadece === 'ilac_disi' ? "bg-teal-600 border-teal-700 text-white" : "bg-white border-stone-200 text-stone-400 hover:border-teal-400 hover:text-teal-600")}>
                      İlaç Dışı
                    </button>
                    <button onClick={() => setAiOnlyPharmaceuticalAndNoEquivalent(!aiOnlyPharmaceuticalAndNoEquivalent)} className={cn("px-2 py-0.5 text-[10px] font-extrabold rounded-full border transition-colors", aiOnlyPharmaceuticalAndNoEquivalent ? "bg-violet-600 border-violet-700 text-white" : "bg-white border-stone-200 text-stone-400 hover:border-violet-400 hover:text-violet-600")}>
                      Eşdeğersiz İlaçlar
                    </button>

                    <div className="w-px h-4 bg-stone-200 mx-1 shrink-0"></div>

                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-stone-600 hover:text-violet-700 transition-colors" title="MF sorgulaması yapmadan yalnızca önbellek/yerel verilerle simülasyon yap">
                      <input type="checkbox" checked={aiSkipMfQuery} onChange={e => setAiSkipMfQuery(e.target.checked)} className="w-3.5 h-3.5 rounded accent-orange-500" />
                      MF Sorgulamayı atla
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 py-1">
                  {aiResults.length > 0 && !aiSimulating && (
                    <div className="flex items-center gap-1.5 border-r border-stone-200 pr-3 mr-1.5 shrink-0">
                      <button onClick={handleExportAIExcel} className="h-8 px-2.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1 cursor-pointer" title="Excel Olarak İndir">
                        <Download size={11} /> Excel
                      </button>
                      <button onClick={handleExportAIPdf} className="h-8 px-2.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1 cursor-pointer" title="PDF Raporu Oluştur">
                        <FileText size={11} /> PDF
                      </button>
                      <button onClick={handleShareAIWhatsapp} className="h-8 px-2.5 rounded-lg text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors flex items-center gap-1.5 cursor-pointer" title="WhatsApp ile Paylaş">
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.803-4.389 9.805-9.788.002-2.615-1.012-5.074-2.859-6.925C16.37 2.04 13.916.996 11.998.996 6.592.996 2.192 5.389 2.19 10.789c-.001 1.5.49 2.961 1.422 4.5l-.995 3.636 3.73-.978zm13.14-5.38c-.3-.15-1.77-.874-2.045-.974-.275-.1-.475-.15-.675.15-.2.3-.77.974-.945 1.174-.175.2-.35.225-.65.075-.3-.15-1.265-.467-2.41-1.485-.89-.795-1.49-1.777-1.665-2.077-.175-.3-.02-.463.13-.613.135-.135.3-.35.45-.525.15-.175.2-.3.3-.5s.05-.375-.025-.525C10.74 8.796 10.14 7.32 9.89 6.72c-.244-.585-.491-.506-.675-.516-.175-.01-.375-.01-.575-.01-.2 0-.525.075-.8 1.075-.275 1.075-.77 2.455-.77 2.505 0 .05.075.325.275.6.2.275 1.34 2.046 3.245 2.87 1.57.68 2.185.748 2.97.63.485-.075 1.77-.724 2.02-1.399.25-.675.25-1.25.175-1.375-.075-.125-.275-.2-.575-.35z"/></svg> Paylaş
                      </button>
                    </div>
                  )}

                  {!aiSimulating && (
                    <button onClick={runAISimulation} className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-sm rounded-xl shadow-md shadow-violet-200 transition-all flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer">
                      <Sparkles size={15} /> {aiResults.length > 0 ? "Simülasyonu Yenile" : "Simülasyonu Başlat"}
                    </button>
                  )}
                  {aiSimulating && (
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8">
                        <div className="absolute inset-0 rounded-full border-3 border-violet-100"></div>
                        <div className="absolute inset-0 rounded-full border-3 border-violet-600 border-t-transparent animate-spin"></div>
                      </div>
                      <p className="text-xs font-bold text-violet-700 animate-pulse">{aiProgress}</p>
                    </div>
                  )}
                </div>

                {/* SİMÜLASYON SONUÇ TABLOSU */}
                {aiResults.length > 0 && (
                  <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-sm bg-white flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto custom-scrollbar" style={{maxHeight: 'calc(95vh - 290px)'}}>
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-stone-50 border-b border-stone-200 sticky top-0 z-10 text-stone-500">
                          <tr>
                            <th className="px-3 py-2 font-bold uppercase text-[9px] w-[35%]">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="checkbox"
                                  checked={aiResults.length > 0 && aiResults.every(r => r.selected)}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setAiResults(prev => prev.map(r => ({ ...r, selected: checked })));
                                  }}
                                  className="w-3.5 h-3.5 rounded accent-violet-650 cursor-pointer"
                                />
                                Ürün Adı
                              </div>
                            </th>
                            <th className="px-2 py-2 font-bold uppercase text-[9px] text-center w-[8%]">Stok</th>
                            <th className="px-2 py-2 font-bold uppercase text-[9px] text-center w-[9%]">Hız/ay</th>
                            <th className="px-2 py-2 font-bold uppercase text-[9px] text-center w-[8%]">İhtiyaç</th>
                            <th className="px-2 py-2 font-bold uppercase text-[9px] text-center w-[8%]">Öneri</th>
                            <th className="px-2 py-2 font-bold uppercase text-[9px] text-center w-[19%]">M.F. Baremleri</th>
                            <th className="px-2 py-2 font-bold uppercase text-[9px] text-center w-[13%]">Oluşacak Ömür</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                          {aiResults.map((r, idx) => {
                            if (r.hata) {
                              return (
                                <tr key={idx} className="hover:bg-stone-50/50 group/row bg-red-50/10">
                                  <td className="px-2 py-2 text-left">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <input
                                        type="checkbox"
                                        checked={!!r.selected}
                                        onChange={() => handleToggleAISelect(r.barkod)}
                                        className="w-3.5 h-3.5 rounded accent-violet-650 cursor-pointer shrink-0"
                                      />
                                      <p 
                                        onClick={() => handleOpenProductAnalysis(r.barkod, r.ad)}
                                        className="font-bold text-teal-650 hover:underline hover:text-teal-800 cursor-pointer truncate text-[11px] min-w-0 shrink" 
                                        title="İlaç detaylarını görmek için tıklayın"
                                      >
                                        {r.ad}
                                      </p>
                                      <button
                                        onClick={() => navigator.clipboard?.writeText(r.barkod)}
                                        className="shrink-0 p-0.5 text-emerald-600 hover:text-emerald-800 transition-all cursor-pointer bg-emerald-50 rounded border border-emerald-250"
                                        title={`Barkodu kopyala: ${r.barkod}`}
                                      >
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                      </button>
                                      {r.esdegerGrubu && (
                                        <button
                                          onClick={() => setEsdegerItem(r)}
                                          className="shrink-0 px-1.5 py-0.5 rounded text-[11px] font-black bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                                          title={`Eşdeğer grubu (${r.esdegerGrubu.urunler.length} ürün)`}
                                        >
                                          ⚖
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleDeleteResult(r.barkod)}
                                        className="shrink-0 p-0.5 text-red-600 hover:text-red-800 transition-all cursor-pointer ml-auto bg-red-50 rounded border border-red-200"
                                        title="Simülasyondan Kaldır"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </div>
                                  </td>
                                  <td className="px-2 py-2 text-center font-mono font-bold text-stone-500 text-[11px]">{r.stok}</td>
                                  <td className="px-2 py-2 text-center font-mono font-bold text-stone-500 text-[11px]">{(r.hiz || 0).toFixed(1)}</td>
                                  <td className="px-2 py-2 text-center font-mono font-bold text-stone-600 text-[11px]">{r.ihtiyac}</td>
                                  <td className="px-2 py-2 text-center font-mono text-stone-300 text-[11px]">
                                    —
                                  </td>
                                  <td className="px-2 py-2 text-center">
                                    <span className="text-red-500 font-bold text-[9px] block whitespace-normal max-w-[200px]" title={r.hata}>
                                      ⚠️ {r.hata}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    {r.yeniOmur !== null && r.yeniOmur !== undefined ? (
                                      <span className={cn(
                                        "px-1.5 py-0.5 rounded text-[10px] font-black",
                                        r.yeniOmur < 15 ? "bg-rose-50 text-rose-700" :
                                        r.yeniOmur < 30 ? "bg-amber-50 text-amber-700" :
                                        "bg-emerald-50 text-emerald-700"
                                      )}>
                                        {r.yeniOmur} gün
                                      </span>
                                    ) : (
                                      <span className="text-stone-350">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            }
                            return (
                              <tr key={idx} className="hover:bg-stone-50/50 group/row">
                                <td className="px-2 py-2 text-left">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={!!r.selected}
                                      onChange={() => handleToggleAISelect(r.barkod)}
                                      className="w-3.5 h-3.5 rounded accent-violet-650 cursor-pointer shrink-0"
                                    />
                                    <p 
                                      onClick={() => handleOpenProductAnalysis(r.barkod, r.ad)}
                                      className="font-bold text-teal-650 hover:underline hover:text-teal-800 cursor-pointer truncate text-[11px] min-w-0 shrink" 
                                      title="İlaç detaylarını ve alım geçmişini görmek için tıklayın"
                                    >
                                      {r.ad}
                                    </p>
                                    <button
                                      onClick={() => navigator.clipboard?.writeText(r.barkod)}
                                      className="shrink-0 p-0.5 text-emerald-600 hover:text-emerald-800 transition-all cursor-pointer bg-emerald-50 rounded border border-emerald-200"
                                      title={`Barkodu kopyala: ${r.barkod}`}
                                    >
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                    </button>
                                    {r.whyData && (
                                      <button
                                        onClick={() => setWhyItem(r)}
                                        className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black bg-violet-50 text-violet-500 border border-violet-200 hover:bg-violet-100 transition-colors cursor-pointer"
                                        title="Neden bu barem önerildi?"
                                      >
                                        Neden?
                                      </button>
                                    )}
                                    {/* Eşdeğer */}
                                    {r.esdegerGrubu && (
                                      <button
                                        onClick={() => setEsdegerItem(r)}
                                        className="shrink-0 px-1.5 py-0.5 rounded text-[11px] font-black bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                                        title={`Eşdeğer grubu (${r.esdegerGrubu.urunler.length} ürün)`}
                                      >
                                        ⚖
                                      </button>
                                    )}
                                    {r.isCached && (
                                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-stone-300" title="Önbellek"></span>
                                    )}
                                    {/* Sil butonu */}
                                    <button
                                      onClick={() => handleDeleteResult(r.barkod)}
                                      className="shrink-0 p-0.5 text-red-600 hover:text-red-800 transition-all cursor-pointer ml-auto bg-red-50 rounded border border-red-200"
                                      title="Simülasyondan Kaldır"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </td>
                                <td className="px-2 py-2 text-center font-mono font-bold text-stone-500 text-[11px]">{r.stok}</td>
                                <td className="px-2 py-2 text-center font-mono font-bold text-stone-500 text-[11px]">{r.hiz.toFixed(1)}</td>
                                <td className="px-2 py-2 text-center font-mono font-bold text-stone-600 text-[11px]">{r.ihtiyac}</td>
                                <td className={cn("px-2 py-2 text-center font-mono font-black text-[11px]", r.onerilen > 0 ? "text-violet-700 bg-violet-50/40" : "text-stone-300")}>
                                  {r.onerilen}
                                </td>
                                <td className="px-2 py-2 text-center">
                                  <div className="flex flex-wrap gap-0.5 justify-center">
                                    {r.baremler && r.baremler.length > 0 ? (
                                      r.baremler
                                        .filter((barem: string) => {
                                          if (!barem.includes('+')) return false;
                                          const free = parseInt(barem.split('+')[1]) || 0;
                                          return free > 0;
                                        })
                                        .map((barem: string, bIdx: number) => {
                                          const isSelected = r.secilenBarem === barem;
                                          const bgClass = r.secilenBarem 
                                            ? (isSelected ? "bg-emerald-600 border-emerald-700 text-white" : "bg-amber-500 border-amber-600 text-white hover:bg-amber-600") 
                                            : "bg-amber-500 border-amber-600 text-white hover:bg-amber-600";
                                          return (
                                            <button
                                              key={bIdx}
                                              onClick={() => handleBaremSelect(r.barkod, barem)}
                                              className={cn(
                                                "px-1.5 py-0.5 rounded text-[9px] font-black border transition-all cursor-pointer whitespace-nowrap",
                                                bgClass
                                              )}
                                              title="Barem seçmek/bırakmak için tıklayın"
                                            >
                                              {barem}
                                            </button>
                                          );
                                        })
                                    ) : (
                                      <span className="text-stone-300 font-bold">—</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  {r.yeniOmur !== null ? (
                                    <span className={cn(
                                      "px-1.5 py-0.5 rounded text-[10px] font-black",
                                      r.yeniOmur < 15 ? "bg-rose-50 text-rose-700" :
                                      r.yeniOmur < 30 ? "bg-amber-50 text-amber-700" :
                                      "bg-emerald-50 text-emerald-700"
                                    )}>
                                      ~{r.yeniOmur} gün
                                    </span>
                                  ) : (
                                    <span className="text-stone-300 font-bold">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {/* ÖZET SATIRI */}
                    <div className="bg-stone-50 px-5 py-4 border-t border-stone-200 flex justify-between items-center text-xs font-black text-stone-700">
                      <div>
                        Toplam Simüle Edilen: <span className="text-stone-900 font-bold">{aiResults.length} kalem</span>
                      </div>
                      <div className="flex gap-4">
                        <span>Toplam Sipariş: <span className="text-violet-750 font-black">{aiResults.filter(r => (r.onerilen || 0) > 0).length} kalem, {aiResults.reduce((acc, r) => acc + (r.onerilen || 0), 0)} kutu</span></span>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* MODAL FOOTER */}
              <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex justify-between items-center shrink-0">
                <p className="text-[10px] font-semibold text-stone-400 max-w-sm leading-normal">
                  * Onayladığınızda AI önerileri sepetinize aktarılacak ve otomatik olarak güncellenecektir.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => { if (!aiSimulating) setShowAIModal(false); }} disabled={aiSimulating}
                    className="h-10 px-4 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 font-bold text-xs disabled:opacity-50">
                    İptal
                  </button>
                  <button onClick={handleApplyAISuggestions} disabled={aiSimulating || aiResults.length === 0 || aiResults.every(r => r.onerilen === 0)}
                    className="h-10 px-5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs shadow-md disabled:opacity-50 flex items-center gap-1.5">
                    <Check size={14} /> Onayla ve Sepete Aktar
                  </button>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EŞDEĞer GRUBU POPUP */}
      <AnimatePresence>
        {esdegerItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setEsdegerItem(null)}>
            <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
              onClick={(e: any) => e.stopPropagation()}
              className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-start">
                <div>
                  <h3 className="font-black text-stone-900 text-sm flex items-center gap-2">
                    <span className="text-base">⚖</span> Eşdeğer Grup Bilgisi
                  </h3>
                  <p className="text-[11px] text-stone-400 mt-0.5 truncate max-w-xs" title={esdegerItem.ad}>{esdegerItem.ad}</p>
                </div>
                <button onClick={() => setEsdegerItem(null)} className="h-8 w-8 flex items-center justify-center rounded-xl bg-stone-100 hover:bg-red-50 hover:text-red-600 transition-colors text-stone-500">
                  <X size={14} />
                </button>
              </div>
              <div className="px-6 py-4 space-y-3">
                <div className="grid grid-cols-3 gap-3 bg-amber-50 rounded-2xl p-4 border border-amber-100">
                  <div className="text-center">
                    <span className="block text-[10px] text-amber-600 font-extrabold uppercase">Toplam Grup Stoğu</span>
                    <span className="text-xl font-black text-amber-800">{esdegerItem.esdegerGrubu.toplamStok}</span>
                    <span className="text-[10px] text-amber-600 font-bold ml-0.5">adet</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-[10px] text-amber-600 font-extrabold uppercase">Toplam Hız</span>
                    <span className="text-xl font-black text-amber-800">{(esdegerItem.esdegerGrubu.toplamHiz * 30).toFixed(1)}</span>
                    <span className="text-[10px] text-amber-600 font-bold ml-0.5">/ay</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-[10px] text-amber-600 font-extrabold uppercase">Grup Stok Ömrü</span>
                    <span className={cn("text-xl font-black", esdegerItem.esdegerGrubu.grupOmru !== null && esdegerItem.esdegerGrubu.grupOmru < 15 ? "text-rose-700" : esdegerItem.esdegerGrubu.grupOmru !== null && esdegerItem.esdegerGrubu.grupOmru < 30 ? "text-amber-800" : "text-emerald-700")}>
                      {esdegerItem.esdegerGrubu.grupOmru !== null ? `~${esdegerItem.esdegerGrubu.grupOmru}` : '∞'}
                    </span>
                    <span className="text-[10px] text-amber-600 font-bold ml-0.5">gün</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Gruptaki Ürünler</p>
                  {esdegerItem.esdegerGrubu.urunler.map((u: any, i: number) => (
                    <div key={i} className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-2.5 border border-stone-100">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-800 truncate max-w-[240px]" title={u.ad}>{u.ad}</p>
                        <p className="text-[9px] font-mono text-stone-400">{u.barkod}</p>
                      </div>
                      <div className="flex gap-4 shrink-0 ml-3">
                        <div className="text-center">
                          <span className="block text-[9px] text-stone-400 font-bold">Stok</span>
                          <span className="font-black text-stone-700 text-sm">{u.stok}</span>
                        </div>
                        <div className="text-center">
                          <span className="block text-[9px] text-stone-400 font-bold">Hız/ay</span>
                          <span className="font-black text-stone-700 text-sm">{(u.hiz * 30).toFixed(1)}</span>
                        </div>
                        <div className="text-center">
                          <span className="block text-[9px] text-stone-400 font-bold">Ömür</span>
                          <span className={cn("font-black text-sm", u.hiz > 0 && Math.round(u.stok / u.hiz) < 15 ? "text-rose-600" : u.hiz > 0 && Math.round(u.stok / u.hiz) < 30 ? "text-amber-600" : "text-emerald-600")}>
                            {u.hiz > 0 ? `~${Math.round(u.stok / u.hiz)}g` : '∞'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-stone-400 font-semibold text-center">Bilgi amaçlıdır. Sipariş önerisi grubun lider ürününe yapılmaktadır.</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {whyItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]">
              
              {/* Header */}
              <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                <div>
                  <h3 className="text-sm font-black text-stone-850 truncate max-w-[450px]" title={whyItem.ad}>
                    {whyItem.ad}
                  </h3>
                  <p className="text-[10px] font-mono text-stone-400 mt-1">Barkod: {whyItem.barkod}</p>
                </div>
                <button 
                  onClick={() => setWhyItem(null)}
                  className="h-8 w-8 rounded-full border border-stone-200 bg-white hover:bg-stone-50 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6 text-left">
                
                {/* 1. Ürün Durumu */}
                <div>
                  <h4 className="text-xs font-black text-stone-700 uppercase tracking-wider mb-3">1. Ürün Durum Özeti</h4>
                  <div className="grid grid-cols-3 gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-100/50">
                    <div>
                      <span className="block text-[10px] text-stone-400 font-extrabold uppercase">Mevcut Stok</span>
                      <span className="text-sm font-black text-stone-800">{whyItem.stok} Adet</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-stone-400 font-extrabold uppercase">Aylık Hız</span>
                      <span className="text-sm font-black text-stone-800">{whyItem.hiz ? whyItem.hiz.toFixed(1) : 0} Adet/ay</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-stone-400 font-extrabold uppercase">Saf İhtiyaç (Hedef {whyItem.whyData?.targetDays} Gün)</span>
                      <span className="text-sm font-black text-violet-750">{whyItem.whyData?.need} Adet</span>
                    </div>
                  </div>
                </div>

                {/* 2. Karar Analizi */}
                {whyItem.whyData && (
                  <>
                    <div>
                      <h4 className="text-xs font-black text-stone-700 uppercase tracking-wider mb-3">2. AI Karar Gerekçesi</h4>
                      <div className="bg-violet-50/30 border border-violet-100 p-4 rounded-2xl space-y-2 text-xs">
                        <p className="text-stone-700 leading-relaxed font-semibold">
                          Standart hedefiniz doğrultusunda almanız gereken saf ihtiyaç <strong>{whyItem.whyData.need} adet</strong> olarak belirlenmiştir. 
                          {whyItem.secilenBarem ? (
                            whyItem.secilenBarem === whyItem.whyData.baselineBarem ? (
                              <>
                                {" "}Sistem, ihtiyacınızı karşılamak için en uygun referans baremin <strong>{whyItem.secilenBarem}</strong> olduğunu belirlemiştir. 
                                Bu doğrultuda sipariş miktarınız baremin ana miktarı olan <strong>{whyItem.onerilen} adet</strong> olarak ayarlanmış ve +{(parseInt(whyItem.secilenBarem.split('+')[1]) || 0)} bedava ürün kazanılmıştır.
                              </>
                            ) : (
                              <>
                                {" "}Sistem, mevcut baremleri karşılaştırdığında <strong>{whyItem.secilenBarem}</strong> baremine geçmeyi finansal olarak daha avantajlı bulmuştur. 
                                Bu kararla sipariş miktarınız <strong>{whyItem.onerilen} adete</strong> yükseltilmiştir.
                              </>
                            )
                          ) : (
                            <>
                              {" "}Mevcut hiçbir üst bareme geçmek, belirlediğiniz gün sınırını aşması veya ekstra stok maliyetinin iskonto kazancından fazla olması nedeniyle avantajlı bulunmamıştır. 
                              Bu nedenle saf ihtiyaç miktarı olan <strong>{whyItem.onerilen} adet</strong> sipariş önerilmiştir.
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* 3. Barem Karşılaştırma Listesi */}
                    <div>
                      <h4 className="text-xs font-black text-stone-700 uppercase tracking-wider mb-3">3. Barem Karşılaştırma Analizi</h4>
                      <div className="space-y-3">
                        {whyItem.whyData.barems.map((b: any, bIdx: number) => {
                          const isSelected = whyItem.secilenBarem === b.raw;
                          return (
                            <div key={bIdx} className={cn(
                              "p-4 rounded-2xl border text-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all",
                              isSelected 
                                ? "bg-emerald-50/40 border-emerald-200" 
                                : b.status.startsWith('rejected') 
                                  ? "bg-stone-50/50 border-stone-200" 
                                  : "bg-white border-stone-200"
                            )}>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-lg text-[10px] font-black border",
                                    isSelected 
                                      ? "bg-emerald-600 border-emerald-700 text-white" 
                                      : "bg-stone-200 border-stone-300 text-stone-700"
                                  )}>
                                    {b.raw} Baremi
                                  </span>
                                  {isSelected && (
                                    <span className="text-[10px] font-black text-emerald-600 flex items-center gap-0.5">
                                      ✓ Seçilen Karar
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-stone-500 font-medium">
                                  Net Birim Fiyat: <strong className="text-stone-700">{b.netPrice.toFixed(2)} TL</strong> 
                                  {whyItem.whyData.baselineBarem !== b.raw && (
                                    <> (Getiri: <strong className="text-emerald-600 font-extrabold">%{(b.gainPct * 100).toFixed(1)}</strong>)</>
                                  )}
                                </p>
                              </div>

                              <div className="text-left md:text-right shrink-0">
                                {b.status === 'baseline_covered' ? (
                                  <div className="space-y-0.5">
                                    <span className="block text-[10px] font-bold text-stone-500">Referans Barem</span>
                                    <span className="text-[9px] text-stone-400 font-semibold">Saf ihtiyacınızı karşılayan taban alım.</span>
                                  </div>
                                ) : b.status === 'rejected_max_days' ? (
                                  <div className="space-y-0.5">
                                    <span className="block text-[10px] font-bold text-amber-600">❌ Aşılan Sınır: {b.reason}</span>
                                    <span className="text-[9px] text-stone-400 font-semibold">Belirlenen maksimum gün sınırını aşıyor.</span>
                                  </div>
                                ) : b.status === 'rejected_carrying_cost' ? (
                                  <div className="space-y-0.5">
                                    <span className="block text-[10px] font-bold text-red-500">❌ Finansal Olarak Verimsiz</span>
                                    <span className="text-[9px] text-stone-400 font-semibold">Getiri: %{(b.gainPct * 100).toFixed(1)} | Stok Maliyeti: <span className="text-red-650 font-extrabold text-red-600">%{(b.carryingCostPct * 100).toFixed(1)}</span></span>
                                  </div>
                                ) : (
                                  <div className="space-y-0.5">
                                    <span className="block text-[10px] font-bold text-emerald-600">✓ Karlı (Net Getiri: %{(b.netReturn * 100).toFixed(1)})</span>
                                    <span className="text-[9px] text-stone-400 font-semibold">Getiri: %{(b.gainPct * 100).toFixed(1)} | Stok Maliyeti: <span className="text-red-650 font-extrabold text-red-600">%{(b.carryingCostPct * 100).toFixed(1)}</span></span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

              </div>

              {/* Footer */}
              <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-end">
                <button 
                  onClick={() => setWhyItem(null)}
                  className="h-10 px-6 rounded-xl bg-stone-900 hover:bg-stone-850 text-white font-extrabold text-xs shadow-md cursor-pointer"
                >
                  Kapat
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SINGLE MF QUERY MODAL */}
      <AnimatePresence>
        {mfQueryProduct && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4"
            onClick={() => { if (!isSingleMfQuerying) setMfQueryProduct(null); }}>
            <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
              onClick={(e: any) => e.stopPropagation()}
              className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
              <div className="px-6 py-5 border-b border-stone-100 flex justify-between items-start">
                <div>
                  <h3 className="font-black text-stone-900 text-base leading-tight flex items-center gap-2">
                    <Search size={18} className="text-teal-600" />
                    MF Sorgula
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">{mfQueryProduct.v2}</p>
                </div>
                <button onClick={() => { if (!isSingleMfQuerying) setMfQueryProduct(null); }} className="h-8 w-8 flex items-center justify-center rounded-xl bg-stone-100 hover:bg-red-50 hover:text-red-600 transition-colors text-stone-500">
                  <X size={14} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-stone-500 font-bold">Sorgulanacak Depo:</span>
                  <select
                    value={selectedMfWarehouse}
                    onChange={(e) => setSelectedMfWarehouse(e.target.value)}
                    className="border border-stone-200 rounded-xl px-3 py-2 text-xs font-black text-slate-700 outline-none cursor-pointer bg-stone-50"
                  >
                    {loadDepolar().filter(d => d.enabled !== false).map(d => (
                      <option key={d.id} value={d.id}>{d.ad}</option>
                    ))}
                  </select>
                </div>
                {isSingleMfQuerying && (
                  <div className="flex items-center gap-2 text-xs font-bold text-teal-650">
                    <span className="h-4 w-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></span>
                    Canlı depo sorgulaması yapılıyor, lütfen bekleyin...
                  </div>
                )}
              </div>
              <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex justify-end gap-2">
                <button
                  disabled={isSingleMfQuerying}
                  onClick={() => setMfQueryProduct(null)}
                  className="h-9 px-4 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 font-bold text-xs disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  disabled={isSingleMfQuerying}
                  onClick={() => handleExecuteSingleProductMFQuery(mfQueryProduct, selectedMfWarehouse)}
                  className="h-9 px-5 rounded-xl bg-teal-650 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  Sorgula
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* WhatsApp İletişim İkonu */}
      <a
        href="whatsapp://send?phone=905523624027&text=Merhaba,%20Nexus%20masaüstü%20programı%20hakkında%20geliştirme%20önerim/sorum%20var:"
        className="fixed bottom-6 right-6 z-[100] bg-[#25D366] text-white p-3.5 rounded-full shadow-2xl hover:bg-[#1ebe5d] transition-all hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer border border-[#1ebe5d]"
        title="WhatsApp Destek & Geri Bildirim"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.803-4.389 9.805-9.788.002-2.615-1.012-5.074-2.859-6.925C16.37 2.04 13.916.996 11.998.996 6.592.996 2.192 5.389 2.19 10.789c-.001 1.5.49 2.961 1.422 4.5l-.995 3.636 3.73-.978zm13.14-5.38c-.3-.15-1.77-.874-2.045-.974-.275-.1-.475-.15-.675.15-.2.3-.77.974-.945 1.174-.175.2-.35.225-.65.075-.3-.15-1.265-.467-2.41-1.485-.89-.795-1.49-1.777-1.665-2.077-.175-.3-.02-.463.13-.613.135-.135.3-.35.45-.525.15-.175.2-.3.3-.5s.05-.375-.025-.525C10.74 8.796 10.14 7.32 9.89 6.72c-.244-.585-.491-.506-.675-.516-.175-.01-.375-.01-.575-.01-.2 0-.525.075-.8 1.075-.275 1.075-.77 2.455-.77 2.505 0 .05.075.325.275.6.2.275 1.34 2.046 3.245 2.87 1.57.68 2.185.748 2.97.63.485-.075 1.77-.724 2.02-1.399.25-.675.25-1.25.175-1.375-.075-.125-.275-.2-.575-.35z"/>
        </svg>
      </a>
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
    if (!opt) { setOpt('suggestion'); updateCart(urun.v1, onr, undefined, urun, true); return; }
    updateCart(urun.v1, opt === 'need' ? need : onr, undefined, urun, true);
  };

  return (
    <div className={cn("px-4 py-3.5 border-b border-stone-50", isSel && "bg-violet-50/40")}>
      {/* Satır 1: checkbox + ürün adı + analiz */}
      <div className="flex items-start gap-2.5">
        <input type="checkbox" checked={isSel} onChange={toggleSel}
          className="w-4 h-4 mt-0.5 rounded border-stone-300 text-teal-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 w-full">
            <button onClick={() => openAnalysis(urun)} className="text-left flex-1 min-w-0">
              <span className="font-semibold text-[13px] text-stone-900 leading-snug block truncate">
                {urun.v2} <span className="text-stone-600 font-bold text-xs">(Stok: {urun.v4})</span>
              </span>
            </button>
          </div>
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

function TableGroupRow({ grup, cart, updateCart, toggleCartItem, copyFn, copiedId, openAnalysis, activeMenu, setActiveMenu, onIgnore, selectedBarkods, setSelectedBarkods, onGrupDetail, showTree, onEditCategory, onAddToYokListesi, onEditProductDetails, selectedDaysLimit, hideGroupHeaders, onSorgulaMf }: any) {
  const [isOpen, setIsOpen] = useState(true);
  const originalCount = grup.original_count ?? grup.detaylar.length;
  const isSingle = originalCount === 1;

  // Eşdeğerli ise orijinal (tüm) ürün listesi üzerinden, eşdeğersiz ise filtreli ürün üzerinden hesapla
  const statsSource = (originalCount > 1 && grup.original_detaylar) ? grup.original_detaylar : grup.detaylar;

  const totalSpeed = statsSource.reduce((acc: number, u: any) => acc + (Number(u.v20) || 0), 0) * 30;
  const totalStock = statsSource.reduce((acc: number, u: any) => acc + (Number(u.v4) || 0), 0);
  const totalDailySpeed = statsSource.reduce((acc: number, u: any) => acc + (Number(u.v20) || 0), 0);
  const omurGun = totalDailySpeed > 0 ? Math.round(totalStock / totalDailySpeed) : null;
  const grupBaslik = (grup.lider_adi || '').split(' ')[0] + ' GRUBU';

  const sharedProps = { cart, updateCart, toggleCartItem, copyFn, copiedId, openAnalysis, activeMenu, setActiveMenu, onIgnore, selectedBarkods, setSelectedBarkods, showTree, onEditCategory, onAddToYokListesi, onEditProductDetails, selectedDaysLimit, onSorgulaMf };

  return (
    <>
      {/* Grup Başlığı - Sadece İlaç sekmesinde ve birden fazla ürün varsa gösterilir */}
      {(!hideGroupHeaders && showTree) && (
        <tr className="bg-stone-50/50 border-t border-stone-200/60">
          <td className="relative h-10">
            {/* Dikey çizgi başlangıcı (Ağaç yapısı için) */}
            {isOpen && <div className="absolute left-1/2 bottom-0 w-px h-1/2 bg-orange-300 -translate-x-1/2" />}
          </td>
          <td className="px-3 py-2" colSpan={2}>
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
                  <span className="flex items-center gap-1" title="Grup Aylık Ortalama Çıkış Hızı">
                    <TrendingUp size={12} className="text-stone-400" /> {totalSpeed.toFixed(1)}/ay
                  </span>
                  <span className={cn("flex items-center gap-1", totalStock <= 0 ? "text-red-500" : "text-stone-600")} title="Grup Toplam Stoğu">
                    <Package size={12} className="text-stone-400" /> {totalStock} Stok
                  </span>
                  <span className="text-stone-400 font-bold" title="Gruptaki Eşdeğer Sayısı">
                    {originalCount} Eşdeğer
                  </span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[9px] font-black",
                    omurGun === null ? "text-stone-400 bg-stone-50" :
                    omurGun < 30 ? "text-rose-700 bg-rose-50 animate-pulse border border-rose-100" :
                    omurGun < 60 ? "text-amber-700 bg-amber-50 border border-amber-100" :
                    "text-emerald-700 bg-emerald-50 border border-emerald-100"
                  )} title="Grup Kalan Ömrü">
                    Ömür: {omurGun !== null ? `~${omurGun} gün` : '—'}
                  </span>
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
          {/* <td className="pr-4"></td> */}
        </tr>
      )}

      {/* Ürün Satırları (TableProductRow) */}
      {(isSingle || !showTree || hideGroupHeaders || isOpen) && grup.detaylar.map((urun: any, idx: number) => (
        <TableProductRow
          key={idx}
          urun={urun}
          {...sharedProps}
          isGrouped={!hideGroupHeaders && !isSingle && showTree}
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
  selectedBarkods, setSelectedBarkods, isGrouped, isLastChild, showTree,
  onEditCategory, onAddToYokListesi, onEditProductDetails, selectedDaysLimit,
  onSorgulaMf
}: any) {
  const [period, setPeriod] = useState<number | string>(30);
  const [opt, setOpt] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [customQty, setCustomQty] = useState<number | null>(null);

  const { inCart } = itemCart;
  const isSel = selectedBarkods?.has(urun.v1);
  const spd = urun.v20 || 0;
  const stk = urun.v4 || 0;
  const spd30 = spd * 30;

  const rawBaremler = Array.isArray(urun.mf_baremleri) ? urun.mf_baremleri : [];
  const seen = new Set<string>();
  const baremler = rawBaremler.filter((b: any) => {
    if (!b || b.mf === 0 || b.ana === 0) return false;
    const key = `${b.ana}+${b.mf}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const periodDays = () => {
    if (period === 'month') {
      const t = new Date(), last = new Date(t.getFullYear(), t.getMonth() + 1, 0);
      return Math.ceil((last.getTime() - t.getTime()) / 86400000);
    }
    return period as number;
  };
  const activeDays = selectedDaysLimit !== null ? selectedDaysLimit : periodDays();
  const need = Math.round(Math.max(0, spd * activeDays - stk));
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
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span
              onClick={() => openAnalysis(urun)}
              className="font-bold text-[13px] text-stone-900 truncate cursor-pointer hover:text-orange-600 transition-colors leading-snug flex-1">
              {urun.v2} <span className="text-stone-600 font-bold text-xs">(Stok: {urun.v4}) (aylık ortalama: {spd30.toFixed(1)})</span>
            </span>

            {/* Adet Kutusu ve Sepet Butonu (İlaç Adının Yanında) */}
            <div className="flex items-center gap-1.5 shrink-0 ml-4">
              <input
                type="number"
                value={customQty !== null ? customQty : (inCart ? itemCart.qty : (need > 0 ? need : 1))}
                onChange={(e) => {
                  const val = Math.max(0, parseInt(e.target.value) || 0);
                  setCustomQty(val);
                  if (inCart) {
                    updateCart(urun.v1, val, undefined, urun);
                  }
                }}
                className="w-14 h-9 text-center border border-stone-200 rounded-lg font-bold font-mono text-sm outline-none focus:border-teal-500 bg-white"
                min="0"
              />
              <button 
                onClick={() => {
                  const qtyVal = customQty !== null ? customQty : (need > 0 ? need : 1);
                  updateCart(urun.v1, qtyVal, undefined, urun, true);
                }}
                className={cn(
                  "h-9 w-14 rounded-lg border transition-all flex items-center justify-center font-bold",
                  inCart 
                    ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700" 
                    : "bg-teal-600 border-teal-600 text-white hover:bg-teal-700 hover:scale-105 active:scale-95 shadow-sm"
                )}
                title={inCart ? `Sepette (${itemCart.qty} Adet)` : `Sepete Ekle`}
              >
                {inCart ? <Check size={18} /> : <ShoppingCart size={16} />}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <button onClick={() => copyFn(urun.v1)}
              className="font-mono text-[10px] text-stone-400 hover:text-teal-600 bg-stone-50 px-2 py-0.5 rounded border border-stone-200 transition-colors flex items-center gap-1">
              {copiedId === urun.v1 ? <><Check size={8} /> Kopyalandı</> : <><Copy size={8} /> {urun.v1}</>}
            </button>

            <button onClick={() => onEditCategory && onEditCategory(urun)}
              className="p-1 hover:text-blue-600 bg-white hover:bg-blue-50 text-stone-400 rounded border border-stone-200 hover:border-blue-200 transition-colors flex items-center justify-center shrink-0"
              title="Kategoriyi Düzenle">
              <Layers size={11} />
            </button>

            <button onClick={() => onAddToYokListesi && onAddToYokListesi(urun)}
              className="p-1 hover:text-rose-600 bg-white hover:bg-rose-50 text-stone-400 rounded border border-stone-200 hover:border-rose-200 transition-colors flex items-center justify-center shrink-0"
              title="Yok Listesine Ekle">
              <ListX size={11} />
            </button>

            <button onClick={() => onEditProductDetails && onEditProductDetails(urun)}
              className="p-1 hover:text-indigo-600 bg-white hover:bg-indigo-50 text-stone-400 rounded border border-stone-200 hover:border-indigo-200 transition-colors flex items-center justify-center shrink-0"
              title="İlaç Bilgilerini Düzenle (master_db)">
              <Settings size={11} />
            </button>

            <button onClick={() => onSorgulaMf && onSorgulaMf(urun)}
              className="px-2 py-0.5 text-[10px] font-bold text-teal-650 bg-teal-50 border border-teal-250 hover:bg-teal-100 hover:border-teal-350 rounded transition-colors flex items-center gap-1 cursor-pointer"
              title="Depolarda MF Sorgula">
              <Search size={10} />
              <span>MF Sorgula</span>
            </button>
          </div>
        </div>
      </td>

      {/* Sipariş (Sadece MF baremleri) */}
      <td className="px-3 py-4 text-center align-middle">
        <div className="flex items-center gap-2 justify-end">
          {/* MF Baremleri (Sol Taraf) */}
          {baremler.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center mr-1">
              {baremler.map((b: any, bi: number) => {
                const isCurrentMf = inCart && itemCart.qty === b.ana && itemCart.mf === b.mf;
                return (
                  <button
                    key={bi}
                    onClick={() => {
                      setCustomQty(b.ana);
                      updateCart(urun.v1, b.ana, b.mf, urun, true);
                    }}
                    className={cn(
                      "text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border transition-all active:scale-95",
                      isCurrentMf
                        ? "bg-teal-600 border-teal-600 text-white font-black"
                        : "bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200"
                    )}
                    title={`${b.ana} adet alıma ${b.mf} mf`}
                  >
                    {b.ana}+{b.mf}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}, (prev, next) => {
  return prev.itemCart.qty === next.itemCart.qty &&
    prev.itemCart.inCart === next.itemCart.inCart &&
    prev.selectedBarkods.has(prev.urun.v1) === next.selectedBarkods.has(next.urun.v1) &&
    prev.urun.kategori_id === next.urun.kategori_id &&
    prev.urun.v2 === next.urun.v2 &&
    prev.showTree === next.showTree &&
    prev.isLastChild === next.isLastChild &&
    prev.selectedDaysLimit === next.selectedDaysLimit;
});

function GrupDetailContent({ grup, rawGrup, getBreadcrumb, cart, updateCart, toggleCartItem, setCart, onProductClick }: any) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const det = (rawGrup || grup).detaylar || [];
  const totalD = det.reduce((a: number, u: any) => a + (u.v20 || 0), 0);
  const totalS = det.reduce((a: number, u: any) => a + (u.v4 || 0), 0);
  const totalV = det.reduce((a: number, u: any) => a + ((u.v4 || 0) * (u.v87 || u.v86 || 0)), 0);
  const total30 = det.reduce((a: number, u: any) => a + (u.v22 || 0), 0);
  const total60 = det.reduce((a: number, u: any) => a + (u.v23 || 0), 0);
  const total365 = det.reduce((a: number, u: any) => a + (u.v24 || 0), 0);
  const omur = totalD > 0 && totalS > 0 ? Math.round(totalS / totalD) : null;
  const lider = det[0] || {};
  const kat = lider.kategori_id ? getBreadcrumb(lider.kategori_id) : '';
  const sorted = [...det].map((u: any) => ({
    ...u,
    pay: totalD > 0 ? Math.round((u.v20 || 0) / totalD * 100) : 0,
    omur: (u.v20 || 0) > 0 && (u.v4 || 0) > 0 ? Math.round((u.v4 || 0) / (u.v20 || 0)) : null,
  })).sort((a: any, b: any) => b.pay - a.pay);

  const kpis = [
    { l: 'Hız', v: `${(totalD * 30).toFixed(1)}/ay`, c: 'text-blue-600' },
    { l: 'Stok', v: totalS, c: totalS <= 0 ? 'text-red-500' : 'text-stone-800' },
    { l: 'Ömür', v: omur ? `~${omur}g` : '—', c: !omur ? 'text-red-500' : omur < 30 ? 'text-amber-500' : 'text-emerald-600' },
    { l: 'Öneri', v: grup.toplam_oneri || 0, c: 'text-emerald-600' },
    { l: 'Grup 1 Ay', v: `${total30} Adet`, c: 'text-stone-600' },
    { l: 'Grup 2 Ay', v: `${total60} Adet`, c: 'text-stone-600' },
    { l: 'Grup Yıllık', v: `${total365} Adet`, c: 'text-stone-600' },
  ];

  return (
    <div>
      {/* KPI satırı */}
      <div className="grid grid-cols-4 md:grid-cols-7 divide-x divide-stone-100 border-b border-stone-100 bg-stone-50/50">
        {kpis.map(k => (
          <div key={k.l} className="px-1 py-2.5 text-center">
            <div className="text-[9px] text-stone-400 font-black uppercase tracking-widest">{k.l}</div>
            <div className={cn("text-[11px] font-black leading-tight mt-0.5", k.c)}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Karşılaştırma tablosu */}
      <div className="px-4 pt-3 pb-1">
        <div className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-2">Eşdeğer Karşılaştırması</div>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-stone-200">
              {['Ürün', 'Hız/ay', 'Pay', 'Stok', 'Ömür', 'Sipariş'].map(h => (
                <th key={h} className={cn("py-1.5 font-semibold text-stone-400 text-[10px] uppercase tracking-wide", h === 'Ürün' ? 'text-left px-0' : h === 'Sipariş' ? 'text-center px-2 w-[160px]' : 'text-center px-2')}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((u: any, i: number) => {
              const qtyVal = quantities[u.v1] !== undefined
                ? quantities[u.v1]
                : (cart[u.v1]?.qty || Math.round(u.v26 || 0) + Math.round(u.v27 || 0) || 1);
              const inCart = cart[u.v1]?.inCart || false;

              return (
                <tr key={i} className={cn("border-b border-stone-100 hover:bg-stone-50/60", i === 0 && "bg-blue-50/20")}>
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-1.5">
                      {i === 0 && <span className="w-1 h-1 rounded-full bg-blue-500 shrink-0" />}
                      <div>
                        <div
                          onClick={() => onProductClick && onProductClick(u)}
                          className="font-semibold text-stone-850 text-xs truncate max-w-[220px] cursor-pointer hover:text-indigo-650 hover:underline"
                          title={u.v2}
                        >
                          {u.v2}
                        </div>
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
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <input
                        type="number"
                        value={qtyVal}
                        onChange={e => setQuantities(prev => ({ ...prev, [u.v1]: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="w-11 h-6 text-center border border-stone-200 rounded font-bold font-mono text-xs outline-none focus:border-teal-500 bg-white"
                        min="0"
                      />
                      <button
                        onClick={() => {
                          updateCart(u.v1, qtyVal, undefined, u, true);
                        }}
                        className={cn(
                          "h-6 px-1.5 text-[9px] font-bold rounded transition-all flex items-center justify-center gap-0.5 shrink-0",
                          inCart
                            ? "bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100"
                            : "bg-teal-600 text-white hover:bg-teal-700"
                        )}
                      >
                        {inCart ? <Check size={8} /> : <ShoppingCart size={8} />}
                        {inCart ? "Güncelle" : "Ekle"}
                      </button>
                      {inCart && (
                        <button
                          onClick={() => {
                            setCart((prev: any) => ({
                              ...prev,
                              [u.v1]: {
                                ...prev[u.v1],
                                qty: 0,
                                mf: 0,
                                inCart: false
                              }
                            }));
                          }}
                          className="h-6 w-6 border border-red-200 text-red-600 hover:bg-red-50 rounded transition-all flex items-center justify-center shrink-0"
                          title="Sepetten Çıkar"
                        >
                          <Trash2 size={8} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
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
  );
}

function GrupDetailModal({ grup, onClose, getBreadcrumb, rawGrup, cart, updateCart, toggleCartItem, setCart, onProductClick }: any) {
  const det = (rawGrup || grup).detaylar || [];
  const lider = det[0] || {};
  const kat = lider.kategori_id ? getBreadcrumb(lider.kategori_id) : '';
  const rec = (lider.v82 || '').toUpperCase();
  const recColor = rec.includes('KIRMIZI') ? 'text-red-600 bg-red-50 border-red-200'
    : rec.includes('YEŞİL') ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
      : rec.includes('TURUNCU') ? 'text-orange-600 bg-orange-50 border-orange-200'
        : rec.includes('MOR') ? 'text-violet-600 bg-violet-50 border-violet-200' : '';
  const tagMap: any = { ks: 'Kritik', os: 'Ölü Stok', mr: 'Miad', vz: 'Vazgeçilmez', ei: 'İthal', nb: 'Nöbet' };
  const tags = (grup.tags || '').split(' ').filter(Boolean);

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
          <GrupDetailContent
            grup={grup}
            rawGrup={rawGrup}
            getBreadcrumb={getBreadcrumb}
            cart={cart}
            updateCart={updateCart}
            toggleCartItem={toggleCartItem}
            setCart={setCart}
            onProductClick={onProductClick}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}


function CategoryEditModal({ urun, categories, onClose, onSave }: any) {
  const [selectedCatId, setSelectedCatId] = useState<number>(urun.kategori_id || 2);

  // Filter out 'ilac' (1) and build a tree-like hierarchy list
  const getSortedTreeList = () => {
    const list: any[] = [];
    const recurse = (parentId: number | null, indent: number) => {
      const children = categories.filter((c: any) => c.ust_kategori_id === parentId && c.id !== 1);
      children.sort((a: any, b: any) => a.isim.localeCompare(b.isim, 'tr'));
      children.forEach((child: any) => {
        list.push({ ...child, indent });
        recurse(child.id, indent + 1);
      });
    };
    recurse(null, 0);
    return list;
  };

  const treeList = getSortedTreeList();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e: any) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col p-6 space-y-4">
        
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-stone-900 text-base">Kategori Düzenle</h3>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg bg-stone-100 hover:bg-red-50 hover:text-red-500 text-stone-400 transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-stone-400 uppercase tracking-wide">Ürün Adı</label>
          <div className="font-bold text-stone-800 text-sm">{urun.v2}</div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-stone-400 uppercase tracking-wide">Barkod</label>
          <div className="font-mono text-stone-500 text-xs">{urun.v1}</div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-stone-400 uppercase tracking-wide">Kategori Seçin</label>
          <select
            value={selectedCatId}
            onChange={e => setSelectedCatId(Number(e.target.value))}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-100 focus:border-teal-400 outline-none text-xs transition-all font-medium text-slate-800"
          >
            {/* Always fallback categories if empty */}
            {treeList.length > 0 ? (
              treeList.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {"— ".repeat(c.indent) + c.isim}
                </option>
              ))
            ) : (
              categories.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.isim}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs transition-all"
          >
            Vazgeç
          </button>
          <button
            onClick={() => onSave(urun.v1, selectedCatId)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs transition-all"
          >
            Kaydet
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}


