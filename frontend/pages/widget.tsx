import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Copy, Check, RefreshCw, X, Award } from 'lucide-react';

export default function WidgetPage() {
  const electron = typeof window !== 'undefined' && (window as any).require ? (window as any).require('electron') : null;
  const ipcRenderer = electron ? electron.ipcRenderer : null;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  
  const [gln, setGln] = useState('local');
  const [productMap, setProductMap] = useState<Record<string, any>>({});
  const [queryCache, setQueryCache] = useState<Record<string, any>>({});
  const [carryingCostRate, setCarryingCostRate] = useState<number>(5);
  
  const [copied, setCopied] = useState(false);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryStatus, setQueryStatus] = useState('');
  const [queryWarehouse, setQueryWarehouse] = useState('selcuk');
  const [selectedBarem, setSelectedBarem] = useState<any | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const glnRef = useRef('local');
  const [initStatus, setInitStatus] = useState('Veriler yükleniyor...');

  // Helper to get bridge
  const getBridge = () => (window as any).__widgetBridge;

  // Helper to reload query cache — tries GLN folder first, then 'local' folder
  const reloadQueryCache = async (app: any, activeGln: string) => {
    const tryLoad = async (gln: string) => {
      try {
        const raw = await app.LoadLocalJSON(gln, 'query_cache.json');
        if (raw && raw !== '{}' && raw !== 'null') {
          const parsed = JSON.parse(raw);
          if (Object.keys(parsed).length > 0) return parsed;
        }
      } catch (e) {}
      return null;
    };

    // Try GLN folder first, then 'local'
    const result = (await tryLoad(activeGln)) || (await tryLoad('local')) || {};
    if (Object.keys(result).length > 0) {
      setQueryCache(result);
      console.log('[Widget] query_cache loaded, keys:', Object.keys(result).length);
    } else {
      console.warn('[Widget] query_cache empty or not found for gln:', activeGln);
    }
    return result;
  };

  // 1. Initial configuration and settings loading
  useEffect(() => {
    let retries = 0;
    const init = async () => {
      try {
        const app = (window as any).go?.main?.App;
        if (!app) {
          setInitStatus(`Bağlantı bekleniyor... (${retries}/30)`);
          if (retries < 30) {
            retries++;
            setTimeout(init, 150);
          } else {
            setInitStatus('Hata: Masaüstü API yüklenemedi!');
          }
          return;
        }

        setInitStatus('Ayarlar yükleniyor...');
        const settingsStr = await app.LoadSettings();
        const parsedSettings = JSON.parse(settingsStr);
        const activeGln = parsedSettings.gln || 'local';
        setGln(activeGln);
        glnRef.current = activeGln;

        const savedCost = localStorage.getItem('nexus_ai_carrying_cost');
        if (savedCost) setCarryingCostRate(parseFloat(savedCost) || 5);

        setInitStatus('İlaç analiz cache yükleniyor...');
        try {
          const dataStr = await app.GetDashboardData(activeGln);
          const data = JSON.parse(dataStr);
          const map: Record<string, any> = {};
          if (data?.gruplar) {
            data.gruplar.forEach((g: any) => {
              const groupTotalStock = (g.detaylar || []).reduce((sum: number, u: any) => sum + (Number(u.v4) || 0), 0);
              const groupTotalSpeed = (g.detaylar || []).reduce((sum: number, u: any) => sum + (Number(u.v20) || 0), 0) * 30;
              (g.detaylar || []).forEach((u: any) => {
                map[u.v1] = {
                  ...u,
                  barcode: u.v1,
                  name: u.v2,
                  stock: Number(u.v4) || 0,
                  speed: Number(u.v20) || 0,
                  groupName: g.grup_adi,
                  groupTotalStock,
                  groupTotalSpeed,
                  rawUrun: u
                };
              });
            });
          }
          if (data?.miad_risk_listesi) {
            data.miad_risk_listesi.forEach((u: any) => {
              if (u.barkod) {
                map[u.barkod] = {
                  ...map[u.barkod],
                  ...u,
                  barcode: u.barkod,
                  name: u.urun_adi || map[u.barkod]?.name,
                  stock: u.stok !== undefined ? Number(u.stok) : map[u.barkod]?.stock,
                  rawUrun: map[u.barkod]?.rawUrun || u
                };
              }
            });
          }
          setProductMap(map);
          setInitStatus('Hazır');
        } catch (e: any) {
          console.error('Failed to load analysis cache:', e);
          setInitStatus(`Analiz cache hatası: ${e.message || e}`);
        }

        // Load query_cache.json
        await reloadQueryCache(app, activeGln);

      } catch (err: any) {
        console.error('Initialization failed:', err);
        setInitStatus(`Yükleme hatası: ${err.message || err}`);
      }
    };
    init();

    setTimeout(() => inputRef.current?.focus(), 200);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    // IPC: query finished event from main window
    const handleQueryFinished = async (event: any, result: any) => {
      setQueryLoading(false);
      const app = (window as any).go?.main?.App;
      if (app) {
        const cache = await reloadQueryCache(app, glnRef.current);
        const barkod = result?.barcode;
        const entry = barkod ? cache[barkod] : null;
        
        if (result?.error) {
          const errStr = String(result.error);
          if (errStr.includes('oturumu bulunamadı') || errStr.includes('login_required') || errStr.includes('giriş yapın')) {
            setQueryStatus('❌ Depo oturumu yok! Ana ekrandan giriş yapın.');
          } else {
            setQueryStatus(`❌ Hata: ${errStr}`);
          }
        } else if (entry?.mf_baremleri?.length) {
          setQueryStatus(`✅ ${entry.mf_baremleri.length} barem bulundu`);
        } else {
          setQueryStatus('ℹ️ Kampanya bulunamadı');
        }
        setTimeout(() => setQueryStatus(''), 5000);
      }
    };

    if (ipcRenderer) {
      ipcRenderer.on('widget:query-finished', handleQueryFinished);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (ipcRenderer) ipcRenderer.off('widget:query-finished', handleQueryFinished);
    };
  }, []);

  // 2. Search Autocomplete
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (query.length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const matches = Object.entries(productMap)
      .filter(([barkod, val]: any) => {
        const ad = (val.name || val.v2 || val.ad || '').toLowerCase();
        return ad.includes(query) || String(barkod).includes(query);
      })
      .map(([barkod, val]: any) => ({
        barcode: barkod,
        name: val.name || val.v2 || val.ad || 'Bilinmeyen İlaç',
        stock: val.stock ?? (val.v4 ?? 0),
        speed: val.speed ?? (val.v20 ?? 0),
        groupTotalStock: val.groupTotalStock ?? (val.stock ?? 0),
        groupTotalSpeed: val.groupTotalSpeed ?? ((val.speed ?? 0) * 30),
        rawUrun: val
      }))
      .slice(0, 7);

    setSearchResults(matches);
    setShowDropdown(matches.length > 0);
  }, [searchQuery, productMap]);

  // Reset activeIndex when searchResults changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [searchResults]);

  // 3. Control mouse-ignore based on coordinates
  const isExpanded = !!(selectedProduct || showDropdown);
  const visibleHeight = selectedProduct ? 490 : (showDropdown ? 260 : 60);

  useEffect(() => {
    const bridge = getBridge();
    if (bridge) {
      // Set initial mouseignore state
      bridge.SetMouseIgnore(!isExpanded);
    }

    const handleMouseMove = (e: MouseEvent) => {
      const bridge = getBridge();
      if (!bridge) return;

      // If the mouse is within the visible height of the widget (top portion)
      if (e.clientY <= visibleHeight) {
        bridge.SetMouseIgnore(false);
      } else {
        // If the mouse is below the visible height (transparent empty area) and not expanded
        if (!isExpanded) {
          bridge.SetMouseIgnore(true);
        }
      }
    };

    const handleMouseLeave = () => {
      const bridge = getBridge();
      if (bridge && !isExpanded) {
        bridge.SetMouseIgnore(true);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [visibleHeight, isExpanded]);

  // 4. Selection
  const handleSelectProduct = (prod: any) => {
    setSelectedProduct(prod);
    setSelectedBarem(null);
    setSearchQuery('');
    setShowDropdown(false);
    setQueryStatus('');
  };

  // 5. Close
  const handleClose = () => {
    setSelectedProduct(null);
    setSelectedBarem(null);
    setSearchQuery('');
    const bridge = getBridge();
    if (bridge) bridge.HideWindow();
  };

  // 6. Copy Barcode
  const handleCopyBarcode = async (barcode: string) => {
    try {
      await navigator.clipboard.writeText(barcode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // fallback
      const el = document.createElement('textarea');
      el.value = barcode;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 7. Live query trigger
  const handleLiveQuery = () => {
    if (!selectedProduct || queryLoading) return;
    if (ipcRenderer) {
      setQueryLoading(true);
      setQueryStatus('⏳ Depo sorgulanıyor...');
      ipcRenderer.send('widget:trigger-query', {
        barcode: selectedProduct.barcode,
        warehouseId: queryWarehouse,
        urun: selectedProduct.rawUrun
      });
      // Timeout fallback: if no response after 30s
      setTimeout(() => {
        setQueryLoading(false);
        setQueryStatus('⚠️ Yanıt alınamadı (30s)');
        setTimeout(() => setQueryStatus(''), 3000);
      }, 30000);
    } else {
      setQueryStatus('❌ Ana pencere bağlantısı yok');
      setTimeout(() => setQueryStatus(''), 3000);
    }
  };

  // 8. Resolve campaigns from query_cache
  const resolvedData = useMemo(() => {
    if (!selectedProduct) return { price: 0, barems: [], depo: '' };

    const barkod = selectedProduct.barcode;
    const cachedEntry = queryCache[barkod];
    console.log('[Widget resolvedData] barcode:', barkod, 'cachedEntry:', cachedEntry, 'queryCache keys:', Object.keys(queryCache).length, 'sample keys:', Object.keys(queryCache).slice(0, 5));

    let price = selectedProduct.rawUrun?.v92 || selectedProduct.rawUrun?.fiyat_depocu || 0;
    if (cachedEntry) {
      price = cachedEntry.tavsiye_edilen_psf || cachedEntry.fiyat_etiket || price;
    }

    let barems: any[] = [];
    if (cachedEntry && Array.isArray(cachedEntry.mf_baremleri)) {
      barems = cachedEntry.mf_baremleri.map((raw: string | any) => {
        if (typeof raw === 'string') {
          const p = raw.split('+');
          return { ana: parseInt(p[0]) || 0, mf: parseInt(p[1]) || 0 };
        }
        return raw;
      }).filter((b: any) => b.ana > 0 && b.mf > 0);
      console.log('[Widget resolvedData] Found barems in cachedEntry:', barems);
    } else if (selectedProduct.rawUrun?.mf_baremleri) {
      barems = selectedProduct.rawUrun.mf_baremleri;
      console.log('[Widget resolvedData] Fell back to rawUrun.mf_baremleri:', barems);
    }

    const depo = cachedEntry?.depo || '';
    return { price, barems, depo };
  }, [selectedProduct, queryCache]);

  // 9. Stock lifetimes
  const ownLifetimeDays = useMemo(() => {
    if (!selectedProduct) return 0;
    const dailySpeed = selectedProduct.speed || 0;
    return dailySpeed > 0 ? Math.round(selectedProduct.stock / dailySpeed) : 999;
  }, [selectedProduct]);

  const groupLifetimeDays = useMemo(() => {
    if (!selectedProduct) return 0;
    const dailySpeed = (selectedProduct.groupTotalSpeed || 0) / 30;
    return dailySpeed > 0 ? Math.round(selectedProduct.groupTotalStock / dailySpeed) : 999;
  }, [selectedProduct]);

  // 10. Simulation
  const simulationResults = useMemo(() => {
    if (!selectedProduct || !selectedBarem) return null;
    const ownStock = selectedProduct.stock;
    const ownDailySpeed = selectedProduct.speed || 0;  // per day
    const groupTotalStock = selectedProduct.groupTotalStock;
    const groupDailySpeed = (selectedProduct.groupTotalSpeed || 0) / 30;
    const totalFreeQty = selectedBarem.ana + selectedBarem.mf;
    
    // Own lifetime after barem (add free units to own stock)
    const ownDaysAfter = ownDailySpeed > 0 ? Math.round((ownStock + selectedBarem.mf) / ownDailySpeed) : 999;
    
    // Group lifetime after barem
    const groupDaysAfter = groupDailySpeed > 0
      ? Math.round((groupTotalStock + totalFreeQty) / groupDailySpeed)
      : 999;
    
    const deltaDays = totalFreeQty / (groupDailySpeed || 0.001);
    const deltaMonths = deltaDays / 30;
    const stockCostPct = deltaMonths * (carryingCostRate / 100);
    const gainPct = totalFreeQty > 0 ? selectedBarem.mf / totalFreeQty : 0;
    const netReturn = gainPct - stockCostPct;
    return {
      ownDaysAfter,
      groupDaysAfter,
      stockCostPct: stockCostPct * 100,
      gainPct: gainPct * 100,
      netReturn: netReturn * 100,
      isProfitable: netReturn > 0
    };
  }, [selectedProduct, selectedBarem, carryingCostRate]);

  const lifetimeBadge = (days: number) => (
    <span className={`px-2 py-0.5 rounded-full font-extrabold text-[9px] shadow-sm ${
      days < 30 ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
      days < 90 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
    }`}>
      {days === 999 ? 'Tüketim Yok' : `${days} Gün`}
    </span>
  );

  return (
    <div
      className="w-full select-none font-sans p-1.5 flex flex-col bg-transparent overflow-hidden"
      style={{ height: `${visibleHeight}px`, transition: 'height 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
      onMouseEnter={() => {
        // Make clickable when hovering over widget
        const bridge = getBridge();
        if (bridge) bridge.SetMouseIgnore(false);
      }}
      onMouseLeave={() => {
        // When mouse leaves, restore click-through for non-expanded state
        if (!isExpanded) {
          const bridge = getBridge();
          if (bridge) bridge.SetMouseIgnore(true);
        }
      }}
    >
      {/* Search Bar Row */}
      <div
        style={{ WebkitAppRegion: 'drag' } as any}
        className="flex items-center gap-1.5 h-12 bg-gradient-to-r from-teal-650 via-teal-600 to-cyan-700 border border-teal-400/40 shadow-[0_4px_25px_rgba(20,184,166,0.35)] rounded-xl px-3 w-full shrink-0 relative z-50 cursor-move"
      >
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-white/50">
          <div className="grid grid-cols-2 gap-0.5">
            <span className="w-1 h-1 bg-white/60 rounded-full" />
            <span className="w-1 h-1 bg-white/60 rounded-full" />
            <span className="w-1 h-1 bg-white/60 rounded-full" />
            <span className="w-1 h-1 bg-white/60 rounded-full" />
          </div>
        </div>

        <Search
          size={16}
          style={{ WebkitAppRegion: 'no-drag' } as any}
          className="text-white/80 ml-5 shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
          onDoubleClick={() => {
            const bridge = getBridge();
            if (bridge?.OpenDevTools) bridge.OpenDevTools();
          }}
          title="Çift tık: Geliştirici Konsolu"
        />

        <input
          ref={inputRef}
          style={{ WebkitAppRegion: 'no-drag' } as any}
          type="text"
          placeholder={
            initStatus === 'Hazır'
              ? `İlaç veya barkod ara... (${Object.keys(productMap).length} ürün)`
              : initStatus
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (!showDropdown || searchResults.length === 0) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIndex(prev => (prev + 1) % searchResults.length);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
            } else if (e.key === 'Enter') {
              e.preventDefault();
              const targetIdx = activeIndex >= 0 ? activeIndex : 0;
              if (searchResults[targetIdx]) {
                handleSelectProduct(searchResults[targetIdx]);
              }
            }
          }}
          className="flex-1 bg-white/10 backdrop-blur-sm border border-white/10 text-xs text-white outline-none placeholder-teal-100 rounded-lg px-2 py-1"
        />

        {selectedProduct && (
          <button
            style={{ WebkitAppRegion: 'no-drag' } as any}
            onClick={() => { setSelectedProduct(null); setSelectedBarem(null); }}
            className="p-1 hover:bg-white/15 rounded-md text-white/80 shrink-0 cursor-pointer active:scale-95 transition-all"
            title="Temizle"
          >
            <X size={14} />
          </button>
        )}

        <button
          style={{ WebkitAppRegion: 'no-drag' } as any}
          onClick={handleClose}
          className="p-1 hover:bg-red-500/20 hover:text-red-200 rounded-md text-white/80 shrink-0 transition-colors cursor-pointer active:scale-95"
          title="Kapat"
        >
          <X size={14} />
        </button>

        {/* Autocomplete dropdown */}
        {showDropdown && (
          <div
            style={{ WebkitAppRegion: 'no-drag' } as any}
            className="absolute top-14 left-0 w-full bg-slate-900/96 backdrop-blur-lg border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden z-[99] divide-y divide-slate-800"
          >
            {searchResults.map((prod, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={prod.barcode}
                  onClick={() => handleSelectProduct(prod)}
                  className={`w-full text-left px-4 py-2.5 flex items-center justify-between text-[11px] transition-colors cursor-pointer text-slate-100 ${
                    isActive ? 'bg-teal-500/35 text-white font-extrabold shadow-inner' : 'hover:bg-teal-500/20'
                  }`}
                >
                  <span className="font-semibold truncate flex-1 pr-3">{prod.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-slate-400">
                    <span className="text-[9px]">{prod.barcode}</span>
                    <span className="bg-slate-800 text-slate-300 px-1 py-0.5 rounded text-[9px] font-bold border border-slate-700">
                      S:{prod.stock}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Expanded Details Card */}
      {selectedProduct && (
        <div
          style={{ WebkitAppRegion: 'no-drag' } as any}
          className="mt-1.5 flex-1 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-slate-800 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_20px_rgba(20,184,166,0.15)] rounded-2xl p-4 flex flex-col gap-2.5 overflow-hidden text-slate-100"
        >
          {/* Header: name + barcode + price */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="min-w-0 flex-1">
              <h1 className="text-xs font-black text-white tracking-tight leading-tight">{selectedProduct.name}</h1>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[9px] text-slate-300 font-mono font-bold bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">{selectedProduct.barcode}</span>
                <button
                  onClick={() => handleCopyBarcode(selectedProduct.barcode)}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 transition-all active:scale-95"
                  title="Barkodu kopyala"
                >
                  {copied ? <Check size={10} className="text-teal-400 font-extrabold" /> : <Copy size={10} />}
                </button>
                {selectedProduct.groupName && (
                  <span className="text-[8px] bg-teal-500/10 border border-teal-500/30 text-teal-300 font-extrabold px-1.5 py-0.5 rounded-full truncate max-w-[120px]">{selectedProduct.groupName}</span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0 bg-teal-950/40 border border-teal-500/20 rounded-xl px-2.5 py-1">
              <span className="text-[8px] text-teal-400 font-bold uppercase tracking-wider block">
                {queryCache[selectedProduct.barcode]?.tavsiye_edilen_psf ? 'Tavsiye PSF' : 'PSF'}
              </span>
              <span className="text-[14px] font-black text-teal-300 font-mono">
                ₺{(resolvedData.price || 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Metrics: 2 rows */}
          <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-900/60 border border-slate-800 rounded-xl p-2.5 shadow-sm">
            <div>
              <span className="text-slate-450 block font-medium">Kendi Stoğu / Hız</span>
              <span className="font-extrabold text-white">
                {selectedProduct.stock} kutu <span className="text-[9px] font-medium text-slate-400">/ {((selectedProduct.speed || 0) * 30).toFixed(1)}/ay</span>
              </span>
            </div>
            <div>
              <span className="text-slate-450 block font-medium">Grup Stoğu / Hız</span>
              <span className="font-extrabold text-white">
                {selectedProduct.groupTotalStock} kutu <span className="text-[9px] font-medium text-slate-400">/ {(selectedProduct.groupTotalSpeed || 0).toFixed(1)}/ay</span>
              </span>
            </div>
            {/* Separate lifetime rows */}
            <div className="flex items-center justify-between col-span-1 border-t border-slate-800/80 pt-2">
              <span className="text-slate-400 font-medium">Kendi Ömrü</span>
              {lifetimeBadge(ownLifetimeDays)}
            </div>
            <div className="flex items-center justify-between col-span-1 border-t border-slate-800/80 pt-2">
              <span className="text-slate-400 font-medium">Grup Ömrü</span>
              {lifetimeBadge(groupLifetimeDays)}
            </div>
          </div>

          {/* Campaigns section */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-2.5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] text-slate-350 font-black uppercase tracking-wider flex items-center gap-1">
                <span>MF Kampanyaları</span>
                {resolvedData.depo && <span className="normal-case font-extrabold text-teal-300 bg-teal-500/10 border border-teal-500/30 px-1 py-0.2 rounded">({resolvedData.depo})</span>}
              </span>
              <div className="flex items-center gap-1.5">
                {queryStatus && (
                  <span className="text-[8px] font-bold text-teal-300 bg-teal-500/20 px-1.5 py-0.5 rounded truncate max-w-[120px]">{queryStatus}</span>
                )}
                <select
                  value={queryWarehouse}
                  onChange={(e) => setQueryWarehouse(e.target.value)}
                  style={{ WebkitAppRegion: 'no-drag' } as any}
                  className="text-[9px] border border-slate-700 bg-slate-800 rounded px-1.5 py-0.5 outline-none text-white font-black cursor-pointer"
                >
                  <option value="selcuk">Selçuk</option>
                  <option value="as_ecza">As Ecza</option>
                  <option value="gek">GEK</option>
                </select>
                <button
                  onClick={handleLiveQuery}
                  disabled={queryLoading}
                  className="p-1 border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 hover:border-teal-400 text-teal-300 rounded disabled:opacity-50 transition-all active:scale-95 shadow-sm"
                  title="Depodan canlı sorgula"
                >
                  <RefreshCw size={10} className={queryLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {resolvedData.barems.length === 0 ? (
              <div className="text-[10px] text-slate-400 bg-slate-900/30 text-center py-2.5 rounded-lg border border-dashed border-slate-800">
                {queryLoading ? '⏳ Sorgulanıyor...' : 'Kampanya bulunamadı — Depodan sorgulayın.'}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto">
                {resolvedData.barems.map((b: any, bi: number) => {
                  const colors = [
                    'bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border-sky-500/30',
                    'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30',
                    'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                    'bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-purple-500/30',
                    'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30',
                    'bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border-teal-500/30'
                  ];
                  const isSelected = selectedBarem?.ana === b.ana && selectedBarem?.mf === b.mf;
                  return (
                    <button
                      key={bi}
                      onClick={() => setSelectedBarem(isSelected ? null : b)}
                      className={`font-black font-mono text-[10px] px-2 py-0.5 rounded-lg border transition-all shadow-sm ${colors[bi % colors.length]} ${
                        isSelected ? 'ring-2 ring-teal-400 ring-offset-1 ring-offset-slate-900 scale-105 font-black border-teal-300' : 'hover:scale-105'
                      }`}
                    >
                      {b.ana}+{b.mf}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Simulation result */}
          <div className="border-t border-slate-800 pt-2 shrink-0">
            {simulationResults ? (
              <div className="flex flex-col gap-2 text-[10px]">
                {/* Barem sonrası ömürler */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5 shadow-sm">
                    <span className="text-slate-400 font-medium">Kendi Ömrü →</span>
                    {lifetimeBadge(simulationResults.ownDaysAfter)}
                  </div>
                  <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5 shadow-sm">
                    <span className="text-slate-400 font-medium">Grup Ömrü →</span>
                    {lifetimeBadge(simulationResults.groupDaysAfter)}
                  </div>
                </div>
                {/* Cost & return in 3 columns */}
                <div className="grid grid-cols-3 gap-1 bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 p-2 rounded-xl text-center">
                  <div className="flex flex-col justify-center border-r border-slate-800">
                    <span className="text-slate-500 text-[8px] uppercase font-bold tracking-wider">MF Getirisi</span>
                    <span className="font-extrabold text-emerald-400 font-mono text-[11px] mt-0.5">%{simulationResults.gainPct.toFixed(1)}</span>
                  </div>
                  <div className="flex flex-col justify-center border-r border-slate-800">
                    <span className="text-slate-500 text-[8px] uppercase font-bold tracking-wider">Stok Maliyeti</span>
                    <span className="font-extrabold text-red-400 font-mono text-[11px] mt-0.5">%{simulationResults.stockCostPct.toFixed(1)}</span>
                  </div>
                  <div className="flex flex-col justify-center items-center">
                    <span className="text-slate-500 text-[8px] uppercase font-bold tracking-wider">Net Getiri</span>
                    <span className={`font-black text-[12px] font-mono mt-0.5 ${simulationResults.isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
                      %{simulationResults.netReturn.toFixed(1)}
                    </span>
                    <span className={`text-[7px] font-black px-1 rounded mt-0.5 scale-90 ${
                      simulationResults.isProfitable ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      {simulationResults.isProfitable ? 'KÂRLI' : 'ZARARLI'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] justify-center py-2 bg-slate-900/30 rounded-xl border border-slate-800 border-dashed">
                <Award size={12} className="shrink-0 text-amber-400 animate-pulse" />
                <span className="font-medium">Simülasyon için yukarıdan bir barem seçin</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
