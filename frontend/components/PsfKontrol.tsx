"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Tag, Search, TrendingUp, AlertCircle, Check, Play, RefreshCw, X } from 'lucide-react';
import { isPharmaceuticalCategory, categoryMap } from '@/lib/categoryMap';
import { cn } from '@/lib/utils';
import { loadDepolar } from '@/components/Depolar';

function getCacheKey(depoId: string): string {
  if (!depoId) return 'UNKNOWN';
  const id = depoId.toLowerCase();
  if (id === 'as' || id === 'as_ecza') return 'AS_ECZA';
  return id.toUpperCase();
}

async function loadAndMigrateCache(gln: string): Promise<any> {
  const tenantGln = gln || 'local';
  
  // 1. First try reading query_cache.json
  try {
    const rawCombined = await (window as any).go?.main?.App?.LoadLocalJSON(tenantGln, 'query_cache.json');
    if (rawCombined && rawCombined !== '{}') {
      const parsed = JSON.parse(rawCombined);
      const firstKey = Object.keys(parsed)[0];
      if (firstKey && parsed[firstKey]) {
        const val = parsed[firstKey];
        // If it's already flat, return it directly
        if (val.hasOwnProperty('date') || val.hasOwnProperty('mf_baremleri') || val.hasOwnProperty('fiyat_depocu')) {
          return parsed;
        }
        
        // If it's nested (e.g. { barcode: { SELCUK: { ... } } }), flatten it!
        const flattened: any = {};
        for (const [barcode, entry] of Object.entries(parsed)) {
          if (entry && typeof entry === 'object') {
            const nestedKeys = Object.keys(entry).filter(k => (entry as any)[k] && typeof (entry as any)[k] === 'object' && !Array.isArray((entry as any)[k]));
            if (nestedKeys.length > 0) {
              flattened[barcode] = (entry as any)[nestedKeys[0]];
            } else {
              flattened[barcode] = entry;
            }
          }
        }
        // Save the flattened version back
        try {
          await (window as any).go?.main?.App?.SaveLocalJSON(tenantGln, 'query_cache.json', JSON.stringify(flattened, null, 2));
        } catch (err) {}
        return flattened;
      }
    }
  } catch (err) {}

  // 2. If query_cache.json doesn't exist, migrate from old files in FLAT format
  const combined: any = {};
  const oldFiles = [
    { file: 'selcuk_query_cache.json', key: 'SELCUK' },
    { file: 'as_ecza_query_cache.json', key: 'AS_ECZA' },
    { file: 'gek_query_cache.json', key: 'GEK' },
    { file: 'alliance_query_cache.json', key: 'ALLIANCE' },
    { file: 'nevzat_query_cache.json', key: 'NEVZAT' },
    { file: 'cam_query_cache.json', key: 'CAM' }
  ];

  for (const item of oldFiles) {
    try {
      const raw = await (window as any).go?.main?.App?.LoadLocalJSON(tenantGln, item.file);
      if (raw && raw !== '{}') {
        const data = JSON.parse(raw);
        for (const [barcode, entry] of Object.entries(data)) {
          if (entry && typeof entry === 'object') {
            // Keep the first one that has data
            if (!combined[barcode]) {
              combined[barcode] = {
                ...(entry as any)
              };
            }
          }
        }
      }
    } catch (err) {}
  }

  if (Object.keys(combined).length > 0) {
    try {
      await (window as any).go?.main?.App?.SaveLocalJSON(tenantGln, 'query_cache.json', JSON.stringify(combined, null, 2));
    } catch (err) {}
  }
  return combined;
}

interface PsfKontrolProps {
    data: any;
    gln: string;
    webviewRefs?: React.MutableRefObject<Record<string, any>>;
    onOpenProductAnalysis?: (barcode: string, fallbackName?: string) => void;
}

interface NonPharmaItem {
    barkod: string;
    ad: string;
    kategori_id: number;
    kategori_ad: string;
    localPsf: number;
    stock: number;
    daysInactive: number;
}

const parsePrice = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = String(val).trim();
    if (str.includes('.') && str.includes(',')) {
        const dotIdx = str.indexOf('.');
        const commaIdx = str.indexOf(',');
        if (commaIdx > dotIdx) {
            return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
        } else {
            return parseFloat(str.replace(/,/g, '')) || 0;
        }
    }
    if (str.includes(',')) {
        return parseFloat(str.replace(',', '.')) || 0;
    }
    return parseFloat(str) || 0;
};

export default function PsfKontrolPage({ data, gln, webviewRefs, onOpenProductAnalysis }: PsfKontrolProps) {
    const [search, setSearch] = useState("");
    const [cacheData, setCacheData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [onlyShowDiff, setOnlyShowDiff] = useState(false);

    // Canlı sorgu state'leri
    const [queryWarehouse, setQueryWarehouse] = useState<string>(() => {
        const active = loadDepolar().filter(d => d.enabled !== false);
        return active.length > 0 ? active[0].id : 'as_ecza';
    });
    const [selectedBarcodes, setSelectedBarcodes] = useState<Set<string>>(new Set());
    const [queryProgress, setQueryProgress] = useState<{ current: number; total: number; currentName: string } | null>(null);
    const [isQuerying, setIsQuerying] = useState(false);
    const queryCancelRequested = useRef(false);

    useEffect(() => {
        const loadCache = async () => {
            setLoading(true);
            let mergedCache: Record<string, any> = {};
            try {
                if ((window as any).go?.main?.App?.LoadLocalJSON) {
                    // 1. Load AS Siparisler
                    const rawSiparisler = await (window as any).go.main.App.LoadLocalJSON(gln, "as_siparisler.json");
                    if (rawSiparisler && rawSiparisler !== '{}') {
                        const parsed = JSON.parse(rawSiparisler);
                        if (Array.isArray(parsed)) {
                            parsed.forEach((entry: any) => {
                                if (entry.barkod && entry.durum === 'success') {
                                    mergedCache[entry.barkod] = {
                                        fiyat_etiket: entry.fiyat_etiket || 0,
                                        fiyat_depocu: entry.fiyat_depocu || 0,
                                        date: entry.tarih || '',
                                        depo: entry.depo || 'AS ECZA'
                                    };
                                }
                            });
                        }
                    }

                    // 2. Load GEK Siparisler
                    const rawGekSiparisler = await (window as any).go.main.App.LoadLocalJSON(gln, "gek_siparisler.json");
                    if (rawGekSiparisler && rawGekSiparisler !== '{}') {
                        const parsed = JSON.parse(rawGekSiparisler);
                        if (Array.isArray(parsed)) {
                            parsed.forEach((entry: any) => {
                                if (entry.barkod && entry.durum === 'success') {
                                    mergedCache[entry.barkod] = {
                                        fiyat_etiket: entry.fiyat_etiket || 0,
                                        fiyat_depocu: entry.fiyat_depocu || 0,
                                        date: entry.tarih || '',
                                        depo: entry.depo || 'GEK'
                                    };
                                }
                            });
                        }
                    }

                    // 2.5. Load Alliance Siparisler
                    const rawAllianceSiparisler = await (window as any).go.main.App.LoadLocalJSON(gln, "alliance_siparisler.json");
                    if (rawAllianceSiparisler && rawAllianceSiparisler !== '{}') {
                        const parsed = JSON.parse(rawAllianceSiparisler);
                        if (Array.isArray(parsed)) {
                            parsed.forEach((entry: any) => {
                                if (entry.barkod && entry.durum === 'success') {
                                    mergedCache[entry.barkod] = {
                                        fiyat_etiket: entry.fiyat_etiket || 0,
                                        fiyat_depocu: entry.fiyat_depocu || 0,
                                        date: entry.tarih || '',
                                        depo: entry.depo || 'Alliance'
                                    };
                                }
                            });
                        }
                    }

                    // 3. Load combined query cache
                    try {
                        const globalCache = await loadAndMigrateCache(gln);
                        Object.keys(globalCache).forEach(barcode => {
                            const entryObj = globalCache[barcode];
                            if (entryObj && typeof entryObj === 'object') {
                                if (entryObj.hasOwnProperty('date') || entryObj.hasOwnProperty('mf_baremleri') || entryObj.hasOwnProperty('fiyat_depocu')) {
                                    mergedCache[barcode] = {
                                        fiyat_etiket: entryObj.fiyat_etiket || 0,
                                        fiyat_depocu: entryObj.fiyat_depocu || 0,
                                        tavsiye_edilen_psf: entryObj.tavsiye_edilen_psf || 0,
                                        date: entryObj.date || '',
                                        depo: entryObj.depo || ''
                                    };
                                } else {
                                    Object.keys(entryObj).forEach(depoKey => {
                                        const info = entryObj[depoKey];
                                        if (info && typeof info === 'object') {
                                            mergedCache[barcode] = {
                                                fiyat_etiket: info.fiyat_etiket || 0,
                                                fiyat_depocu: info.fiyat_depocu || 0,
                                                tavsiye_edilen_psf: info.tavsiye_edilen_psf || 0,
                                                date: info.date || '',
                                                depo: info.depo || depoKey
                                            };
                                        }
                                    });
                                }
                            }
                        });
                    } catch (err) {
                        console.error("[PSF Kontrol] Birleşik önbellek yüklenirken hata:", err);
                    }
                }
            } catch (e) {
                console.error("[PSF Kontrol] Önbellek yüklenirken hata:", e);
            }
            setCacheData(mergedCache);
            setLoading(false);
        };
        loadCache();
    }, [gln, data]);

    const nonPharmaList = useMemo(() => {
        if (!data || !data.gruplar) return [];
        const items: any[] = [];

        data.gruplar.forEach((group: any) => {
            if (!group.detaylar) return;
            group.detaylar.forEach((urun: any) => {
                const barcode = urun.v1;
                const categoryId = urun.kategori_id;
                
                // İlaç dışı kategoriler
                if (isPharmaceuticalCategory(categoryId)) return;

                // Son 6 ay (180 gün) hareket görmüş (v21 <= 180)
                const daysInactive = urun.v21 === undefined || urun.v21 === null ? 999 : Number(urun.v21);
                if (daysInactive > 180) return;

                const localPsf = parsePrice(urun.v3 || urun.v87 || 0);
                const stock = Number(urun.v4) || 0;

                const cached = cacheData[barcode];
                const depoPsf = cached ? parsePrice(cached.fiyat_etiket || 0) : 0;
                
                let diff = 0;
                let diffPercent = 0;
                let potentialLoss = 0;
                let hasPriceDifference = false;

                if (depoPsf > localPsf && localPsf > 0) {
                    diff = depoPsf - localPsf;
                    diffPercent = (diff / localPsf) * 100;
                    potentialLoss = diff * stock;
                    hasPriceDifference = true;
                }

                items.push({
                    barkod: barcode,
                    ad: urun.v2 || 'Bilinmeyen Ürün',
                    kategori_id: categoryId,
                    kategori_ad: categoryMap[categoryId]?.isim || 'Diğer / İlaç Dışı',
                    localPsf,
                    depoPsf,
                    diff,
                    diffPercent,
                    potentialLoss,
                    hasPriceDifference,
                    depo: cached?.depo || 'AS ECZA',
                    date: cached?.date ? cached.date.split('T')[0] : null,
                    daysInactive,
                    stock
                });
            });
        });

        // Fiyat farkı olanları öncelikli gösterip sonra isme göre sırala
        return items.sort((a, b) => {
            if (a.hasPriceDifference && !b.hasPriceDifference) return -1;
            if (!a.hasPriceDifference && b.hasPriceDifference) return 1;
            return b.diff - a.diff || a.ad.localeCompare(b.ad, 'tr');
        });
    }, [data, cacheData]);

    const filteredNonPharmaData = useMemo(() => {
        let list = nonPharmaList;
        if (onlyShowDiff) {
            list = list.filter(item => item.hasPriceDifference);
        }
        return list.filter(item =>
            item.ad.toLowerCase().includes(search.toLowerCase()) ||
            item.barkod.includes(search) ||
            item.kategori_ad.toLowerCase().includes(search.toLowerCase())
        );
    }, [nonPharmaList, onlyShowDiff, search]);

    const stats = useMemo(() => {
        const flagged = nonPharmaList.filter(item => item.hasPriceDifference);
        if (flagged.length === 0) return { totalLoss: 0, avgDiffPercent: 0, count: 0 };
        const totalLoss = flagged.reduce((sum, item) => sum + (item.potentialLoss > 0 ? item.potentialLoss : 0), 0);
        const avgDiffPercent = flagged.reduce((sum, item) => sum + item.diffPercent, 0) / flagged.length;
        return {
            totalLoss,
            avgDiffPercent,
            count: flagged.length
        };
    }, [nonPharmaList]);

    // Seçim fonksiyonları
    const handleSelectRow = (barcode: string) => {
        setSelectedBarcodes(prev => {
            const next = new Set(prev);
            if (next.has(barcode)) {
                next.delete(barcode);
            } else {
                next.add(barcode);
            }
            return next;
        });
    };

    const handleSelectAll = (visibleItems: any[]) => {
        setSelectedBarcodes(prev => {
            const next = new Set(prev);
            const allSelected = visibleItems.every(item => prev.has(item.barkod));
            if (allSelected) {
                visibleItems.forEach(item => next.delete(item.barkod));
            } else {
                visibleItems.forEach(item => next.add(item.barkod));
            }
            return next;
        });
    };

    const handleQuerySelected = async () => {
        let hiddenWebview: any = null;
        const barcodesArray = selectedBarcodes.size > 0 
            ? Array.from(selectedBarcodes)
            : filteredNonPharmaData.map(item => item.barkod);

        if (barcodesArray.length === 0) {
            alert("Sorgulanacak ürün bulunamadı. Lütfen listede ürün olduğundan emin olun.");
            return;
        }
        
        let targetDomain = 'asecza.com.tr';
        if (queryWarehouse === 'gek') targetDomain = 'esube.gek.org.tr';
        else if (queryWarehouse === 'alliance') targetDomain = 'alliance';
        else if (queryWarehouse === 'selcuk') targetDomain = 'selcukecza.com.tr';
        else if (queryWarehouse === 'nevzat') targetDomain = 'nevzatecza.com.tr';
        else if (queryWarehouse === 'cam') targetDomain = 'camecza.com';
        else {
            const foundDepo = loadDepolar().find(d => d.id === queryWarehouse);
            if (foundDepo) {
                try {
                    targetDomain = new URL(foundDepo.url).hostname.replace('www.', '');
                } catch {}
            }
        }
        
        const warehouseName = loadDepolar().find(d => d.id === queryWarehouse)?.ad || 'AS Ecza';
        
        if (webviewRefs && webviewRefs.current) {
            // Öncelikle depo ID'sine göre doğrudan eşleştirmeyi dene
            const directEl = webviewRefs.current[queryWarehouse];
            if (directEl && typeof directEl.executeJavaScript === 'function') {
                hiddenWebview = directEl;
            }
            
            // Bulunamazsa URL tabanlı geri çekilme (fallback) eşleştirmesini yap
            if (!hiddenWebview) {
                for (const [id, el] of Object.entries(webviewRefs.current)) {
                    if (el && typeof el.executeJavaScript === 'function') {
                        try {
                            const url: string = await el.executeJavaScript('location.href');
                            if (url.includes(targetDomain) || 
                                ((queryWarehouse === 'as' || queryWarehouse === 'as_ecza') && url.includes('127.0.0.1') && url.includes('Siparis')) ||
                                (queryWarehouse === 'alliance' && (url.includes('alliance-healthcare.com') || url.includes('alliance')))) {
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
            alert(`${warehouseName} oturumu bulunamadı. Lütfen önce 'Depolar' sekmesinden ${warehouseName}'yı açıp giriş yapın.`);
            return;
        }

        // GEK webview irj/portal/'daysa FrameWorkT1'e navigate et
        if (queryWarehouse === 'gek') {
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

        setIsQuerying(true);
        queryCancelRequested.current = false;
        const total = barcodesArray.length;

        // Önbelleği yükle
        let cache: Record<string, any> = {};
        try {
            cache = await loadAndMigrateCache(gln);
        } catch (e) {
            console.error("Cache load failed", e);
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
        const extractSpansLocal = (htmlStr: string): string[] => {
            if (!htmlStr) return [];
            const matches = htmlStr.match(/<span>(.*?)<\/span>/g);
            if (!matches) return [];
            return matches.map(m => m.replace(/<\/?span>/g, '').trim());
        };

        for (let i = 0; i < total; i++) {
            if (queryCancelRequested.current) {
                console.log("Query cancelled by user.");
                break;
            }

            const barcode = barcodesArray[i];
            const urun = nonPharmaList.find(item => item.barkod === barcode);
            const name = urun ? urun.ad : 'Bilinmeyen Ürün';

            setQueryProgress({
                current: i + 1,
                total,
                currentName: name
            });

            try {
                let cleanBarcode = barcode;
                if (cleanBarcode && cleanBarcode.length === 14 && cleanBarcode.startsWith('0')) {
                    cleanBarcode = cleanBarcode.substring(1);
                }
                const barcodeJson = JSON.stringify(cleanBarcode);

                if (queryWarehouse === 'gek') {
                    // ── GEK Canlı Sorgu ──
                    const localGekToken = (typeof window !== 'undefined' ? localStorage.getItem('nexus_gek_token') : '') || '';
                    // Debug: capture current page URL and test search from it (only on first barcode)
                    if (i === 0) {
                        try {
                            const debugData = await hiddenWebview.executeJavaScript(`
                                (async function() {
                                    try {
                                        const res = { href: location.href, cookies: document.cookie, tests: {} };
                                        let token = null;
                                        try {
                                            const r = await fetch('https://esube.gek.org.tr/MainService/api/rfc/gt', {
                                                method: 'GET',
                                                headers: { 'Accept': 'application/json;charset=UTF-8', 'Accept-Language': '' },
                                                credentials: 'include'
                                            });
                                            res.tests.get_token = { ok: r.ok, status: r.status };
                                            if (r.ok) {
                                                const j = await r.json();
                                                token = j.token || j.Token || j.TOKEN;
                                                res.tests.get_token.token_len = token ? token.length : 0;
                                            }
                                        } catch(e) { res.tests.get_token = { error: String(e) }; }
                                        if (token) {
                                            try {
                                                const r = await fetch('https://esube.gek.org.tr/MainService/api/rfc/mat/sm?ST=8683411356236&TYP=3', {
                                                    method: 'GET',
                                                    headers: { 'Accept': 'application/json;charset=UTF-8', 'Accept-Language': '', 'TOKEN': token },
                                                    credentials: 'include'
                                                });
                                                res.tests.search_test = { ok: r.ok, status: r.status, text: (await r.text()).slice(0, 500) };
                                            } catch(e) { res.tests.search_test = { error: String(e) }; }
                                        }
                                        return res;
                                    } catch(e) { return { error: String(e) }; }
                                })()
                            `);
                            if ((window as any).go?.main?.App?.SaveLocalJSON) {
                                await (window as any).go.main.App.SaveLocalJSON(gln, "gek_debug.json", JSON.stringify(debugData, null, 2));
                            }
                        } catch (de) {
                            console.error("GEK debug write failed", de);
                        }
                    }

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
                            try {
                              const gtResp = await fetch('https://esube.gek.org.tr/MainService/api/rfc/gt', {
                                method: 'GET',
                                headers: { 'Accept': 'application/json;charset=UTF-8', 'Accept-Language': '' },
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
                            // /gt de başarısız → /al endpoint'ini dene
                            try {
                              const alResp = await fetch('https://esube.gek.org.tr/MainService/api/rfc/al', {
                                method: 'POST',
                                headers: { 'Accept': 'application/json;charset=UTF-8', 'Accept-Language': '', 'Content-Type': 'application/json' },
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

                           const base = 'https://esube.gek.org.tr/MainService/api/rfc';
                           const h = { 'Accept': 'application/json;charset=UTF-8', 'Accept-Language': '', 'TOKEN': token, 'sln': '1' };
 
                           // Oturum bağlamını kur (ud ve gs)
                           await fetch(base + '/ud', { method: 'GET', headers: h, credentials: 'include' }).catch(() => {});
                           await fetch(base + '/gs', { method: 'GET', headers: h, credentials: 'include' }).catch(() => {});

                           // 1. Arama Hazırlığı (ss)
                           const ssUrl = base + '/mat/ss?ST=' + encodeURIComponent(${barcodeJson});
                           await fetch(ssUrl, { method: 'GET', headers: h, credentials: 'include' }).catch(() => {});
 
                           // 2. Arama
                           const searchUrl = base + '/mat/sm?ST=' + encodeURIComponent(${barcodeJson}) + '&TYP=3';
                           let searchResp = await fetch(searchUrl, {
                             method: 'GET',
                             headers: h,
                             credentials: 'include'
                           });
 
                           if (searchResp.status === 500 || searchResp.status === 401 || searchResp.status === 403) {
                             const gtR = await fetch(base + '/gt', {
                               method: 'GET',
                               headers: { 'Accept': 'application/json;charset=UTF-8', 'Accept-Language': '', 'sln': '1' },
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
                                   headers: { 'Accept': 'application/json;charset=UTF-8', 'Accept-Language': '', 'TOKEN': token, 'sln': '1' },
                                   credentials: 'include'
                                 }).catch(() => {});

                                 searchResp = await fetch(searchUrl, {
                                   method: 'GET',
                                   headers: { 'Accept': 'application/json;charset=UTF-8', 'Accept-Language': '', 'TOKEN': token, 'sln': '1' },
                                   credentials: 'include'
                                 });
                               }
                             }
                           }

                          if (searchResp.status === 500) return { error: 'login_required' };
                          if (searchResp.status === 401 || searchResp.status === 403) return { error: 'login_required' };
                          if (!searchResp.ok) return { error: 'search_http_' + searchResp.status };

                          const searchData = await searchResp.json();
                          const items = searchData && Array.isArray(searchData.ET_MAKTX) ? searchData.ET_MAKTX : [];
                          if (items.length === 0) return { error: 'not_found' };

                          const matnr = String(items[0].MATNR);
                          const name = String(items[0].MAKTX || '');

                          // 2. Detay Çekme
                          const detailUrl = base + '/mat/ms?MATNR=' + encodeURIComponent(matnr);
                          const detailResp = await fetch(detailUrl, {
                            method: 'POST',
                            headers: { 'Accept': 'application/json;charset=UTF-8', 'Accept-Language': '', 'Content-Type': 'application/json', 'TOKEN': token, 'sln': '1' },
                            credentials: 'include',
                            body: '{}'
                          });
                          if (!detailResp.ok) return { error: 'detail_http_' + detailResp.status };
                          const detailData = await detailResp.json();
                          return { ok: true, matnr, name, detailData, token };
                        } catch(e) {
                          return { error: String(e && e.message ? e.message : e) };
                        }
                      })()
                    `);

                    if (queryResult.error) {
                        if (queryResult.error === 'token_yok' || queryResult.error === 'login_required') {
                            alert("GEK oturumunuz bulunamadı veya token alınamadı. Lütfen Depolar sekmesinden GEK'e giriş yapın ve sayfayı bir kez hareket ettirin.");
                            break;
                        }
                        throw new Error(queryResult.error === 'not_found' ? 'Ürün Bulunamadı' : queryResult.error);
                    }

                    if (queryResult.token) {
                        localStorage.setItem('nexus_gek_token', queryResult.token);
                    }

                    // Save debug GEK json
                    if ((window as any).go?.main?.App?.SaveLocalJSON) {
                        await (window as any).go.main.App.SaveLocalJSON(gln, "son_sorgu_ham_veri.json", JSON.stringify({
                            barkod: barcode,
                            urun_adi: name,
                            warehouse: 'GEK',
                            queryResult
                        }, null, 2));
                    }

                    const detailData = queryResult.detailData;
                    
                    let tmpPsf = 0;
                    let tmpDsf = 0;
                    let stokVal = 0;
                    
                    const mfList: string[] = [];
                    const netList: string[] = [];

                    const kart = detailData?.EP_S_MALZEME_KARTI || {};
                    tmpPsf = parseFloat(kart.PSF || kart.ZTVS_FIYATI || kart.TVS_FIYATI || detailData?.EP_T_PSF?.[0]?.PSF || detailData?.ZTVS_FIYATI || detailData?.TVS_FIYATI || detailData?.PSF || 0);
                    if (!tmpPsf) {
                        const conds = detailData?.ET_A004 || [];
                        const zpsf = conds.find((c: any) => c.KSCHL === 'ZPSF' || c.KSCHL === 'Z002');
                        if (zpsf) tmpPsf = parseFloat(zpsf.KBETR) || 0;
                        if (!tmpPsf && conds.length > 0) tmpPsf = parseFloat(conds[0]?.KBETR) || 0;
                    }
                    
                    tmpDsf = parseFloat(kart.DSF || detailData?.DSF || 0);
                    if (!tmpDsf) {
                        const conds = detailData?.ET_A004 || [];
                        const zdep = conds.find((c: any) => c.KSCHL === 'ZDEP' || c.KSCHL === 'Z001' || c.KSCHL === 'ZWHO');
                        if (zdep) tmpDsf = parseFloat(zdep.KBETR) || 0;
                    }
                    if (!tmpDsf && detailData?.EP_T_KLASM?.[0]) {
                        tmpDsf = parseFloat(detailData.EP_T_KLASM[0].DSF || detailData.EP_T_KLASM[0].BIRIMFIYAT || detailData.EP_T_KLASM[0].NETFIYAT || 0);
                    }
                    if (!tmpDsf) {
                        tmpDsf = tmpPsf * 0.83;
                    }
                    
                    if (detailData?.EP_S_VWERK?.STOK_MEVCUT === 'X') {
                        stokVal = parseInt(detailData?.EP_S_LIMIT?.KALAN_BAZ || 999);
                    } else {
                        stokVal = parseInt(kart.STOK || detailData?.STOK || 0) || 0;
                    }

                    const baremler = detailData?.EP_T_BAREM || [];
                    baremler.forEach((b: any) => {
                        if (b.MFTXT && b.MFTXT.includes('+')) {
                            mfList.push(b.MFTXT);
                            const netVal = b.BIRIMFIYAT || b.PORV2_BIRIMFIYAT || 0;
                            netList.push(String(netVal));
                        }
                    });

                    const dsfVal = tmpDsf;
                    const psfVal = tmpPsf;

                    const tvsPsf = parseFloat(kart.ZTVS_FIYATI || kart.TVS_FIYATI || detailData?.ZTVS_FIYATI || detailData?.TVS_FIYATI || 0) || psfVal;
                    cache[barcode] = {
                        date: todayStr,
                        stok: stokVal,
                        fiyat_depocu: dsfVal,
                        fiyat_etiket: psfVal,
                        tavsiye_edilen_psf: tvsPsf,
                        mf_baremleri: mfList,
                        net_fiyatlar: netList,
                        kod: queryResult.matnr || ''
                    };

                    if ((window as any).go?.main?.App?.SaveLocalJSON) {
                        await (window as any).go.main.App.SaveLocalJSON(gln, "query_cache.json", JSON.stringify(cache));
                    }

                    // SQLite veritabanını güncelle
                    if ((window as any).go?.main?.App?.RunCategoryAction) {
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

                        await (window as any).go.main.App.RunCategoryAction(
                            "update-live-data",
                            JSON.stringify({
                                barcode,
                                data: {
                                    dsf: dsfVal,
                                    psf: psfVal,
                                    mf_baremleri: JSON.stringify(dbMfBaremleri)
                                }
                            })
                        );
                    }

                    // Log dosyasına ekle
                    try {
                        const entry = {
                            tarih: todayStr,
                            barkod: barcode,
                            urun_adi: name,
                            miktar: 0,
                            urun_kodu: queryResult.matnr || '',
                            fiyat_etiket: +psfVal.toFixed(2),
                            fiyat_depocu: +dsfVal.toFixed(2),
                            mf1: mfList[0] || null,
                            mf2: mfList[1] || null,
                            mf3: mfList[2] || null,
                            net_fiyat1: parsePrice(netList[0]),
                            net_fiyat2: parsePrice(netList[1]),
                            net_fiyat3: parsePrice(netList[2]),
                            stok_durumu: cache[barcode].stok,
                            kdv: 1,
                            firma_adi: "",
                            urun_tipi: "Itriyat",
                            durum: 'success',
                            depo: 'GEK'
                        };

                        const rawGek = await (window as any).go.main.App.LoadLocalJSON(gln, 'gek_siparisler.json');
                        let gekList = [];
                        if (rawGek && rawGek !== '{}') {
                            const parsed = JSON.parse(rawGek);
                            if (Array.isArray(parsed)) gekList = parsed;
                        }
                        gekList.push(entry);
                        await (window as any).go.main.App.SaveLocalJSON(gln, 'gek_siparisler.json', JSON.stringify(gekList, null, 2));
                    } catch (logErr) {
                        console.error("Failed to append order result", logErr);
                    }

                    setCacheData(prev => ({
                        ...prev,
                        [barcode]: {
                            fiyat_etiket: psfVal,
                            fiyat_depocu: dsfVal,
                            date: todayStr,
                            depo: 'GEK'
                        }
                    }));

                } else if (queryWarehouse === 'alliance') {
                    // ── Alliance Healthcare Canlı Sorgu ──
                    const barcodeJson = JSON.stringify(cleanBarcode);
                    
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
                          if (!sr.ok) return { error: (sr.status === 401 || sr.status === 403) ? 'login_required' : 'search_failed', status: sr.status };
                          const sd = await sr.json();
                          if (!Array.isArray(sd) || sd.length === 0) return { error: 'not_found' };
                          const item = sd[0];

                          // Fetch details page HTML
                          const dUrl = "https://esiparisv2.alliance-healthcare.com.tr/Sales/ItemDetailv2";
                          const dr = await fetch(dUrl, {
                            method: "POST",
                            headers: { "content-type": "application/json; charset=UTF-8", accept: "text/html, */*; q=0.01", "x-requested-with": "XMLHttpRequest" },
                            credentials: "include",
                            body: JSON.stringify({ ItemID: String(item.ID), LoadSimple: true })
                          });
                          let detailHtml = "";
                          let stok = 0;
                          let fiyat_depocu = 0;
                          let fiyat_etiket = 0;
                          
                          if (dr.ok) {
                            detailHtml = await dr.text();
                            const match = detailHtml.match(/data-item="([^"]+)"/);
                            if (match && match[1]) {
                              try {
                                const decoded = atob(match[1]);
                                const parsedItem = JSON.parse(decoded);
                                stok = Number(parsedItem.QA) || 0;
                                fiyat_depocu = parsedItem.PriceTag ? (Number(parsedItem.PriceTag.SalesPrice) || 0) : 0;
                                fiyat_etiket = parsedItem.PriceTag ? (Number(parsedItem.PriceTag.ListPrice) || 0) : 0;
                              } catch(e) {}
                            }
                          }

                          return {
                            ok: true,
                            kod: String(item.ID || ''),
                            ad: String(item.Name || ''),
                            stok: stok,
                            fiyat_depocu: fiyat_depocu,
                            fiyat_etiket: fiyat_etiket,
                            rawItem: item,
                            detailHtml
                          };
                        } catch(e) { return { error: String(e && e.message ? e.message : e) }; }
                      })()
                    `);

                    if ((window as any).go?.main?.App?.SaveLocalJSON) {
                        await (window as any).go.main.App.SaveLocalJSON(gln, "son_sorgu_ham_veri.json", JSON.stringify({
                            barkod: barcode,
                            urun_adi: name,
                            warehouse: 'Alliance',
                            queryResult
                        }, null, 2));
                    }

                    if (queryResult.error) {
                        if (queryResult.error === 'login_required') {
                            alert("Alliance Healthcare oturumunuz sonlanmış. Lütfen giriş yapıp tekrar deneyin.");
                            break;
                        }
                        throw new Error(queryResult.error === 'not_found' ? 'Ürün Bulunamadı' : queryResult.error);
                    }

                    const dsfVal = queryResult.fiyat_depocu || 0;
                    const psfVal = queryResult.fiyat_etiket || dsfVal * 1.25;
                    const stokVal = queryResult.stok || 0;

                    const mfList: string[] = [];
                    const netList: string[] = [];

                    cache[barcode] = {
                        date: todayStr,
                        stok: stokVal,
                        fiyat_depocu: dsfVal,
                        fiyat_etiket: psfVal,
                        tavsiye_edilen_psf: psfVal,
                        mf_baremleri: mfList,
                        net_fiyatlar: netList,
                        kod: queryResult.kod || ''
                    };

                    if ((window as any).go?.main?.App?.SaveLocalJSON) {
                        await (window as any).go.main.App.SaveLocalJSON(gln, "query_cache.json", JSON.stringify(cache));
                    }

                    // SQLite veritabanını güncelle
                    if ((window as any).go?.main?.App?.RunCategoryAction) {
                        await (window as any).go.main.App.RunCategoryAction(
                            "update-live-data",
                            JSON.stringify({
                                barcode,
                                data: {
                                    dsf: dsfVal,
                                    psf: psfVal,
                                    mf_baremleri: JSON.stringify([])
                                }
                            })
                        );
                    }

                    // Log dosyasına ekle
                    try {
                        const entry = {
                            tarih: todayStr,
                            barkod: barcode,
                            urun_adi: name,
                            miktar: 0,
                            urun_kodu: queryResult.kod || '',
                            fiyat_etiket: +psfVal.toFixed(2),
                            fiyat_depocu: +dsfVal.toFixed(2),
                            mf1: null,
                            mf2: null,
                            mf3: null,
                            net_fiyat1: null,
                            net_fiyat2: null,
                            net_fiyat3: null,
                            stok_durumu: stokVal,
                            kdv: 1,
                            firma_adi: "",
                            urun_tipi: "Itriyat",
                            durum: 'success',
                            depo: 'Alliance'
                        };

                        const rawAlliance = await (window as any).go.main.App.LoadLocalJSON(gln, 'alliance_siparisler.json');
                        let allianceList = [];
                        if (rawAlliance && rawAlliance !== '{}') {
                            const parsed = JSON.parse(rawAlliance);
                            if (Array.isArray(parsed)) allianceList = parsed;
                        }
                        allianceList.push(entry);
                        await (window as any).go.main.App.SaveLocalJSON(gln, 'alliance_siparisler.json', JSON.stringify(allianceList, null, 2));
                    } catch (logErr) {
                        console.error("Failed to append order result", logErr);
                    }

                    setCacheData(prev => ({
                        ...prev,
                        [barcode]: {
                            fiyat_etiket: psfVal,
                            fiyat_depocu: dsfVal,
                            date: todayStr,
                            depo: 'Alliance'
                        }
                    }));

                } else {
                    // ── AS Ecza Canlı Sorgu ──
                    const barcodeJson = JSON.stringify(barcode);
                    
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
                        if (searchResult.error === 'login_required') {
                            alert("AS Ecza oturumunuz sonlanmış. Lütfen giriş yapıp tekrar deneyin.");
                            break;
                        }
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

                    const detail = detailResult.obj;

                    const campaigns: any[] = Array.isArray(detail?.grdKampanyalar) ? detail.grdKampanyalar : [];
                    let mfRaw = '';
                    let netRaw = '';
                    for (const kamp of campaigns) {
                        if (kamp?.mf && String(kamp.mf).trim().length > 0) {
                            mfRaw = kamp.mf;
                            netRaw = kamp.netFiyat || '';
                            break;
                        }
                    }
                    if (!mfRaw && campaigns.length > 0) {
                        mfRaw = campaigns[0]?.mf || '';
                        netRaw = campaigns[0]?.netFiyat || '';
                    }

                    const mfList = extractSpansLocal(mfRaw).filter(m => {
                        if (!m) return false;
                        if (m.toLowerCase().endsWith('+0')) return false;
                        return true;
                    });
                    const netList = extractSpansLocal(netRaw);

                    const dsfVal = parsePrice(detail.depocuFiyati);
                    const psfVal = parsePrice(detail.tavsiyeEdilenSatisFiyati || detail.SonFiyat || detail.etiketFiyati);

                    const tvsPsf = parsePrice(detail.tavsiyeEdilenSatisFiyati) || psfVal;
                    cache[barcode] = {
                        date: todayStr,
                        stok: typeof detail.stokDurumu === 'number' ? detail.stokDurumu : parseInt(detail.stokDurumu || 0),
                        fiyat_depocu: dsfVal,
                        fiyat_etiket: psfVal,
                        tavsiye_edilen_psf: tvsPsf,
                        mf_baremleri: mfList,
                        net_fiyatlar: netList,
                        kod: detail.kod || ''
                    };

                    if ((window as any).go?.main?.App?.SaveLocalJSON) {
                        await (window as any).go.main.App.SaveLocalJSON(gln, "query_cache.json", JSON.stringify(cache));
                        await (window as any).go.main.App.SaveLocalJSON(gln, "son_sorgu_ham_veri.json", JSON.stringify({
                            barkod: barcode,
                            urun_adi: name,
                            warehouse: 'AS',
                            searchResult: searchResult,
                            detailResult: detailResult
                        }, null, 2));
                    }

                    // SQLite veritabanını güncelle
                    if ((window as any).go?.main?.App?.RunCategoryAction) {
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

                        await (window as any).go.main.App.RunCategoryAction(
                            "update-live-data",
                            JSON.stringify({
                                barcode,
                                data: {
                                    dsf: dsfVal,
                                    psf: psfVal,
                                    mf_baremleri: JSON.stringify(dbMfBaremleri)
                                }
                            })
                        );
                    }

                    // Log dosyasına ekle
                    try {
                        const entry = {
                            tarih: todayStr,
                            barkod: barcode,
                            urun_adi: name,
                            miktar: 0,
                            urun_kodu: detail?.kod || '',
                            fiyat_etiket: +psfVal.toFixed(2),
                            fiyat_depocu: +dsfVal.toFixed(2),
                            mf1: mfList[0] || null,
                            mf2: mfList[1] || null,
                            mf3: mfList[2] || null,
                            net_fiyat1: parsePrice(netList[0]),
                            net_fiyat2: parsePrice(netList[1]),
                            net_fiyat3: parsePrice(netList[2]),
                            stok_durumu: detail?.stokDurumu || 0,
                            kdv: parseInt(detail?.kdv?.val1 || 0),
                            firma_adi: detail?.firma?.display || "",
                            urun_tipi: detail?.urunTipi || "",
                            durum: 'success',
                            depo: 'AS ECZA'
                        };

                        if ((window as any).go?.main?.App?.AppendOrderResult) {
                            await (window as any).go.main.App.AppendOrderResult(gln, entry);
                        }
                    } catch (logErr) {
                        console.error("Failed to append order result", logErr);
                    }

                    setCacheData(prev => ({
                        ...prev,
                        [barcode]: {
                            fiyat_etiket: psfVal,
                            fiyat_depocu: dsfVal,
                            date: todayStr,
                            depo: 'AS ECZA'
                        }
                    }));
                }

            } catch (err: any) {
                console.error(`Error querying barcode ${barcode}:`, err);
            }

            // Arama aralarında bekleme
            await sleep(300);
        }

        setIsQuerying(false);
        setQueryProgress(null);
        setSelectedBarcodes(new Set());
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-stone-100">
                <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mb-4"></div>
                <p className="text-stone-500 font-medium">Fiyat verileri kontrol ediliyor...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
            {/* ÜST BİLGİ KARTLARI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white py-3 px-5 rounded-2xl border border-red-100 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block">Güncellenecek Ürün</span>
                        <span className="text-xl font-black text-slate-800 block mt-0.5">{stats.count} Kalem</span>
                    </div>
                    <div className="p-2 bg-red-50 text-red-500 rounded-xl">
                        <AlertCircle size={18} />
                    </div>
                </div>

                <div className="bg-white py-3 px-5 rounded-2xl border border-amber-100 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Ortalama Fiyat Farkı</span>
                        <span className="text-xl font-black text-slate-800 block mt-0.5">%{stats.avgDiffPercent.toFixed(1)}</span>
                    </div>
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                        <TrendingUp size={18} />
                    </div>
                </div>

                <div className="bg-white py-3 px-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Kaçan Kâr Fırsatı</span>
                        <span className="text-xl font-black text-slate-800 block mt-0.5">{stats.totalLoss.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺</span>
                    </div>
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                        <Tag size={18} />
                    </div>
                </div>
            </div>

            {/* FİLTRE VE BAŞLIK BANTLARI */}
            <div className="bg-white py-3.5 px-6 rounded-2xl border border-stone-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md shadow-amber-100">
                        <Tag size={20} />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-slate-800 tracking-tight leading-none">
                            İlaç Dışı Ürünler & PSF Fark Kontrolü
                        </h2>
                        <p className="text-[11px] text-slate-400 font-medium mt-1">
                            Lokal ve depo fiyat etiket farklarını karşılaştırıp güncelleyin.
                        </p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl hover:bg-slate-100 transition-colors">
                        <input
                            type="checkbox"
                            checked={onlyShowDiff}
                            onChange={(e) => setOnlyShowDiff(e.target.checked)}
                            className="w-3.5 h-3.5 accent-amber-600 rounded cursor-pointer"
                        />
                        Sadece Farklılar ({stats.count})
                    </label>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Ürün veya kategori ara..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-150 rounded-xl focus:ring-2 focus:ring-amber-200 outline-none font-medium text-xs transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* CANLI SORGU İLERLEME BANNERI */}
            {queryProgress && (
                <div className="bg-amber-50 border border-amber-100 p-5 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4 animate-[fadeIn_0.2s_ease-out]">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">{queryWarehouse === 'gek' ? 'Güney Ecza (GEK)' : queryWarehouse === 'alliance' ? 'Alliance Healthcare' : 'AS Ecza'} Canlı Sorgu Yapılıyor ({queryProgress.current}/{queryProgress.total})</p>
                            <p className="text-xs text-slate-500 mt-0.5">Sorgulanan Ürün: <span className="font-bold text-amber-600">{queryProgress.currentName}</span></p>
                        </div>
                    </div>
                    <button
                        onClick={() => { queryCancelRequested.current = true; }}
                        className="px-4 py-2 bg-white border border-stone-200 hover:bg-red-50 hover:text-red-500 text-stone-600 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                    >
                        <X size={14} /> Sorguyu Durdur
                    </button>
                </div>
            )}

            {/* DEPO CANLI SORGU PANELİ */}
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4 animate-[fadeIn_0.2s_ease-out]">
                <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-slate-700">
                        {selectedBarcodes.size > 0 ? (
                            <>Seçilen Ürün Sayısı: <span className="text-amber-600 font-black">{selectedBarcodes.size}</span></>
                        ) : (
                            <>Tüm Liste Sorgulanacak: <span className="text-amber-600 font-black">{filteredNonPharmaData.length} ürün</span></>
                        )}
                    </span>
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-stone-200">
                        <span className="text-xs text-stone-500 font-bold">Depo Seçimi:</span>
                        <select
                            disabled={isQuerying}
                            value={queryWarehouse}
                            onChange={(e) => setQueryWarehouse(e.target.value)}
                            className="text-xs font-black text-slate-700 outline-none cursor-pointer bg-transparent"
                        >
                            {loadDepolar().filter(d => d.enabled !== false).map(d => (
                                <option key={d.id} value={d.id}>{d.ad}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <button
                    disabled={isQuerying}
                    onClick={handleQuerySelected}
                    className={cn(
                        "px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl text-sm transition-all shadow-md flex items-center gap-2",
                        isQuerying ? "opacity-55 cursor-not-allowed" : ""
                    )}
                >
                    <Play size={15} /> {selectedBarcodes.size > 0 ? "Seçilenleri" : "Tüm Listeyi"} {loadDepolar().find(d => d.id === queryWarehouse)?.ad || 'Depodan'} Sorgula
                </button>
            </div>

            {/* TABLO BÖLÜMÜ */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    {filteredNonPharmaData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="p-4 bg-amber-50 text-amber-500 rounded-full mb-4">
                                <AlertCircle size={36} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">Ürün Bulunamadı</h3>
                            <p className="text-slate-500 font-medium mt-1 text-center max-w-sm">
                                Arama filtresine uygun veya güncellenecek herhangi bir etiket fiyatı farkı bulunmuyor.
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/50 border-b border-slate-100">
                                <tr>
                                    <th className="px-3 py-1.5 w-12">
                                        <input
                                            type="checkbox"
                                            disabled={isQuerying}
                                            checked={filteredNonPharmaData.length > 0 && filteredNonPharmaData.every(item => selectedBarcodes.has(item.barkod))}
                                            onChange={() => handleSelectAll(filteredNonPharmaData)}
                                            className="w-4 h-4 accent-amber-600 cursor-pointer rounded border-stone-300"
                                        />
                                    </th>
                                    <th className="px-3 py-1.5 font-black text-slate-400 uppercase tracking-widest text-[10px]">Ürün</th>
                                    <th className="px-3 py-1.5 font-black text-slate-400 uppercase tracking-widest text-[10px]">Kategori</th>
                                    <th className="px-3 py-1.5 font-black text-slate-400 uppercase tracking-widest text-[10px] text-center">Stok</th>
                                    <th className="px-3 py-1.5 font-black text-slate-400 uppercase tracking-widest text-[10px] text-center">Son Hareket</th>
                                    <th className="px-3 py-1.5 font-black text-slate-400 uppercase tracking-widest text-[10px] text-right">Lokal PSF</th>
                                    <th className="px-3 py-1.5 font-black text-slate-400 uppercase tracking-widest text-[10px] text-right">Depo PSF</th>
                                    <th className="px-3 py-1.5 font-black text-slate-400 uppercase tracking-widest text-[10px] text-right">Fark Durumu</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredNonPharmaData.map((item, idx) => {
                                    return (
                                        <tr key={idx} className="hover:bg-slate-50/20 transition-colors group">
                                            <td className="px-3 py-1">
                                                <input
                                                    type="checkbox"
                                                    disabled={isQuerying}
                                                    checked={selectedBarcodes.has(item.barkod)}
                                                    onChange={() => handleSelectRow(item.barkod)}
                                                    className="w-4 h-4 accent-amber-600 cursor-pointer rounded border-stone-300"
                                                />
                                            </td>
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
                                            <td className="px-3 py-1">
                                                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold">
                                                    {item.kategori_ad}
                                                </span>
                                            </td>
                                            <td className="px-3 py-1 text-center">
                                                <span className={`font-bold ${item.stock === 0 ? 'text-slate-300' : 'text-slate-600'}`}>
                                                    {item.stock}
                                                </span>
                                            </td>
                                            <td className="px-3 py-1 text-center text-xs font-bold text-slate-600">
                                                {item.daysInactive === 0 ? 'Bugün' : `${item.daysInactive} gün önce`}
                                            </td>
                                            <td className="px-3 py-1 text-right font-semibold text-slate-600">
                                                {item.localPsf.toFixed(2)} ₺
                                            </td>
                                            <td className="px-3 py-1 text-right font-semibold text-slate-800">
                                                {item.depoPsf > 0 ? (
                                                    <>
                                                        {item.depoPsf.toFixed(2)} ₺
                                                        <div className="text-[9px] text-slate-400 font-medium mt-0.5">{item.depo} ({item.date})</div>
                                                    </>
                                                ) : (
                                                    <span className="text-slate-300 text-xs italic">Sorgulanmamış</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-1 text-right">
                                                {item.depoPsf > 0 ? (
                                                    item.hasPriceDifference ? (
                                                        <span className="inline-flex items-center gap-0.5 font-bold text-red-500">
                                                            +{item.diff.toFixed(2)} ₺ (+{item.diffPercent.toFixed(0)}%)
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-0.5 font-bold text-emerald-500">
                                                            Uyumlu
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="text-slate-300 font-medium text-xs">-</span>
                                                )}
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
    );
}
