"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Trash2, Package, Upload, Download, Copy, Check, Cloud, CloudOff, Loader2, Search, X, FileUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import { loadDepolar } from '@/components/Depolar';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const isWails = typeof window !== 'undefined' && (window as any).go !== undefined;

type CartItem = {
    barkod: string;
    ad: string;
    depo: string;
    qty: number;
    mf: number;
    v95?: string;
    mf_baremleri?: any[];
    stock?: number;
};

type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

interface SepetPageProps {
    cart: Record<string, any>;
    syncStatus: 'idle' | 'saving' | 'saved' | 'error';
    persistItems: (newItems: CartItem[]) => void;
    setActiveTab: (tab: string) => void;
    gln: string;
    localOrders: any[];
    data?: any;
    webviewRefs?: React.MutableRefObject<Record<string, any>>;
}

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
        
        const baremsInOrder = [order.mf1, order.mf2, order.mf3]
          .filter(Boolean)
          .map(b => b.trim())
          .filter(b => {
            if (!b.includes('+')) return false;
            const free = parseInt(b.split('+')[1]) || 0;
            return free > 0;
          });
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

export default function SepetPage({ cart, syncStatus, persistItems, setActiveTab, gln, localOrders, data, webviewRefs }: SepetPageProps) {
    const [expandedBarkod, setExpandedBarkod] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [editingCell, setEditingCell] = useState<{ barkod: string; field: string } | null>(null);
    const [eczaneId, setEczaneId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [showImportModal, setShowImportModal] = useState(false);
    const [importText, setImportText] = useState('');
    const [sortField, setSortField] = useState<string>('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [queryProgress, setQueryProgress] = useState<{ current: number; total: number; msg: string } | null>(null);

    const handleQueryMFForSelected = async () => {
        const barcodesArray = Array.from(selectedItems);
        if (barcodesArray.length === 0) {
            alert('Lütfen sorgulanacak ürünleri seçin!');
            return;
        }
        
        let successCount = 0;
        let failCount = 0;
        
        const activeDepots = loadDepolar().filter(d => d.enabled !== false);
        const updatedItems = [...items];
        
        for (let idx = 0; idx < barcodesArray.length; idx++) {
            const barcode = barcodesArray[idx];
            const item = updatedItems.find(i => i.barkod === barcode);
            if (!item) continue;
            
            const depoName = item.depo;
            if (!depoName || depoName === 'Depo Belirsiz' || depoName === 'Seçiniz...') {
                failCount++;
                continue;
            }
            
            const currentDepo = activeDepots.find(d => d.ad === depoName || d.id === depoName);
            if (!currentDepo) {
                failCount++;
                continue;
            }

            let cache: any = {};
            let cacheFilename = '';
            let todayStr = '';

            todayStr = new Date().toLocaleDateString('en-CA');
            cacheFilename = currentDepo.id === 'gek' ? 'gek_query_cache.json' : (currentDepo.id === 'alliance' ? 'alliance_query_cache.json' : (currentDepo.id === 'as' || currentDepo.id === 'as_ecza' ? 'as_ecza_query_cache.json' : `${currentDepo.id}_query_cache.json`));
            try {
                const rawCache = await (window as any).go.main.App.LoadLocalJSON(gln || 'local', cacheFilename);
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

                const index = updatedItems.findIndex(i => i.barkod === barcode);
                if (index !== -1) {
                    updatedItems[index] = {
                        ...updatedItems[index],
                        mf_baremleri: parsedBarems
                    };
                }
                successCount++;
                continue;
            }
            
            setQueryProgress({
                current: idx + 1,
                total: barcodesArray.length,
                msg: `${item.ad} sorgulanıyor... (${currentDepo.ad})`
            });
            
            try {
                let targetDomain = 'asecza.com.tr';
                if (currentDepo.id === 'gek') targetDomain = 'esube.gek.org.tr';
                else if (currentDepo.id === 'alliance') targetDomain = 'alliance';
                else if (currentDepo.id === 'selcuk') targetDomain = 'selcukecza.com.tr';
                else if (currentDepo.id === 'nevzat') targetDomain = 'nevzatecza.com.tr';
                else if (currentDepo.id === 'cam') targetDomain = 'camecza.com';
                else {
                    try { targetDomain = new URL(currentDepo.url).hostname.replace('www.', ''); } catch {}
                }
                
                let webview: any = null;
                if (webviewRefs && webviewRefs.current) {
                    for (const [id, el] of Object.entries(webviewRefs.current)) {
                        if (el && typeof el.executeJavaScript === 'function') {
                            try {
                                const url: string = await el.executeJavaScript('location.href');
                                if (url.includes(targetDomain) || 
                                    ((currentDepo.id === 'as' || currentDepo.id === 'as_ecza') && url.includes('127.0.0.1') && url.includes('Siparis')) ||
                                    (currentDepo.id === 'alliance' && (url.includes('alliance-healthcare.com') || url.includes('alliance')))) {
                                    webview = el;
                                    break;
                                }
                            } catch {}
                        }
                    }
                }
                
                if (!webview) {
                    throw new Error('Oturum bulunamadı');
                }
                
                let mfList: string[] = [];
                let netList: string[] = [];
                const barcodeJson = JSON.stringify(barcode);
                
                if (currentDepo.id === 'gek') {
                    const localGekToken = localStorage.getItem('nexus_gek_token') || '';
                    const queryResult: any = await webview.executeJavaScript(`
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
                            body: JSON.stringify({ SearchText: ${barcodeJson}, Gln: ${JSON.stringify(gln)} })
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
                      const kampResult: any = await webview.executeJavaScript(`
                        (async function() {
                          try {
                            const resp = await fetch("https://esube.gek.org.tr/FrameWorkT1/api/GekOnline/UrunKampanyaBilgisiGetir", {
                              method: "POST",
                              headers: { "content-type": "application/json", "Authorization": "Bearer " + (window.__gekToken || "") },
                              body: JSON.stringify({ Matnr: ${JSON.stringify(matnr)}, Gln: ${JSON.stringify(gln)} })
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
                } else if (currentDepo.id === 'alliance') {
                    const queryResult: any = await webview.executeJavaScript(`
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
                      const detailHtml = queryResult.detailHtml || "";
                      const extractSpansLocal = (htmlStr: string): string[] => {
                        if (!htmlStr) return [];
                        const matches = htmlStr.match(/<span>(.*?)<\/span>/g);
                        if (!matches) return [];
                        return matches.map((m: string) => m.replace(/<\/?span>/g, '').trim());
                      };
                      mfList = extractSpansLocal(detailHtml).filter(b => b.includes('+'));
                    }
                } else {
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
                          if (!resp.ok) return { error: 'search_failed' };
                          const data = await resp.json();
                          if (data.hataId === 9 || String(data.hataId) === '9') return { error: 'login_required' };
                          if (data.hataId !== 0) return { error: data.hataStr || 'search_error' };
                          const urunler = data && data.obj && data.obj.urunler;
                          if (!Array.isArray(urunler) || urunler.length === 0) return { error: 'not_found' };
                          const u = urunler[0];
                          return { kod: String(u.kodu || ''), ILACTIP: String(u.ILACTIP || ''), ad: String(u.ad || '') };
                        } catch(e) { return { error: String(e) }; }
                      })()
                    `);
                    
                    if (searchResult && !searchResult.error) {
                      const dParams = { kod: searchResult.kod, ILACTIP: searchResult.ILACTIP };
                      const detailResult: any = await webview.executeJavaScript(`
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
                          bArray.push(kamp.mf);
                          nArray.push(kamp.netFiyat || '');
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
                
                const index = updatedItems.findIndex(i => i.barkod === barcode);
                if (index !== -1) {
                    updatedItems[index] = {
                        ...updatedItems[index],
                        mf_baremleri: parsedBarems
                    };
                }

                cache[barcode] = {
                    date: todayStr,
                    stok: 1,
                    fiyat_depocu: 0,
                    fiyat_etiket: 0,
                    mf_baremleri: mfList,
                    net_fiyatlar: netList || [],
                    kod: '',
                    depo: currentDepo.ad || currentDepo.id
                };
                try {
                    await (window as any).go.main.App.SaveLocalJSON(gln || 'local', cacheFilename, JSON.stringify(cache, null, 2));
                } catch (e) {
                    console.error('Önbellek kaydetme hatası:', e);
                }

                successCount++;
            } catch (err) {
                console.error(`Sorgulama hatası: ${item.ad}`, err);
                failCount++;
            }
        }
        
        persistItems(updatedItems);
        setQueryProgress(null);
        alert(`Sorgulama tamamlandı.\nBaşarılı: ${successCount}\nBaşarısız: ${failCount}`);
    };

    const productMap = useMemo(() => {
        const map: Record<string, any> = {};
        if (data?.gruplar) {
            data.gruplar.forEach((g: any) => {
                (g.detaylar || []).forEach((u: any) => {
                    map[u.v1] = u;
                });
            });
        }
        if (data?.miad_risk_listesi) {
            data.miad_risk_listesi.forEach((u: any) => {
                if (u.barkod) map[u.barkod] = { ...map[u.barkod], ...u };
            });
        }
        return map;
    }, [data]);

    // Derive items directly from cart prop
    const items: CartItem[] = Object.entries(cart)
        .filter(([_, val]: any) => val.inCart && val.qty > 0)
        .map(([id, val]: any) => {
            const extra = productMap[id] || {};
            return {
                barkod: id,
                ad: val.ad || extra.v2 || 'Bilinmeyen Ürün',
                depo: val.depo || extra.v91 || 'Depo Belirsiz',
                qty: val.qty,
                mf: val.mf || 0,
                v95: val.v95 || extra.v95 || '',
                mf_baremleri: val.mf_baremleri?.length ? val.mf_baremleri : (extra.mf_baremleri || []),
                stock: typeof extra.v4 === 'number' ? extra.v4 : parseInt(extra.v4 || 0)
            };
        });

    // --- YÜKLEME: Supabase'den sadece eczaneId (User ID) çek (Import için gerekebilir) ---
    useEffect(() => {
        const loadUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setEczaneId(user.id);
                }
            } catch (e) {
                console.error('Kullanıcı bilgisi alınamadı:', e);
            }
        };
        loadUser();
    }, []);

    // --- MODAL AÇILINCA BODY'Yİ KİLİT ---
    useEffect(() => {
        if (showImportModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
    }, [showImportModal]);

    // --- FİLTRELEME ---
    const filteredItems = items.filter(item =>
        item.barkod.includes(searchQuery) ||
        item.ad.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // --- SIRALAMA ---
    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const sortedItems = useMemo(() => {
        const sorted = [...filteredItems];
        if (!sortField) return sorted;

        sorted.sort((a, b) => {
            let valA: any = a[sortField as keyof CartItem] ?? '';
            let valB: any = b[sortField as keyof CartItem] ?? '';

            if (typeof valA === 'string') {
                return sortOrder === 'asc'
                    ? valA.localeCompare(valB, 'tr')
                    : valB.localeCompare(valA, 'tr');
            } else {
                const numA = Number(valA) || 0;
                const numB = Number(valB) || 0;
                return sortOrder === 'asc' ? numA - numB : numB - numA;
            }
        });
        return sorted;
    }, [filteredItems, sortField, sortOrder]);

    const renderSortIcon = (field: string) => {
        if (sortField !== field) return <span className="text-stone-300 ml-1 text-[9px]">↕</span>;
        return sortOrder === 'asc' ? <span className="text-teal-600 ml-1 text-[9px]">▲</span> : <span className="text-teal-600 ml-1 text-[9px]">▼</span>;
    };

    // --- SEÇIM ---
    const toggleSelectAll = () => {
        if (selectedItems.size === filteredItems.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(filteredItems.map(i => i.barkod)));
        }
    };

    const toggleSelect = (barkod: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(barkod)) {
            newSelected.delete(barkod);
        } else {
            newSelected.add(barkod);
        }
        setSelectedItems(newSelected);
    };

    // --- SİLME ---
    const deleteItem = (barkod: string) => {
        persistItems(items.filter(i => i.barkod !== barkod));
    };

    const deleteSelected = () => {
        if (!confirm(`${selectedItems.size} ürünü silmek istediğinize emin misiniz?`)) return;
        persistItems(items.filter(i => !selectedItems.has(i.barkod)));
        setSelectedItems(new Set());
    };

    // --- TOPLAM HESAPLA ---
    const totalQty = items.reduce((acc, curr) => acc + curr.qty, 0);
    const totalMf = items.reduce((acc, curr) => acc + curr.mf, 0);

    // --- EXPORT ---
    const downloadXlsx = () => {
        const rows = items.map(item => ({
            'Barkod': item.barkod,
            'Ürün Adı': item.ad,
            'Depo': item.depo || '-',
            'Adet': item.qty,
            'MF': item.mf,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [{ wch: 18 }, { wch: 42 }, { wch: 16 }, { wch: 8 }, { wch: 8 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sepet');
        XLSX.writeFile(wb, 'siparis.xlsx');
    };

    const sendWhatsApp = () => {
        const lines = items.map((item, i) =>
            `${i + 1}. *${item.ad}*\n   🔖 ${item.barkod}  |  ${item.depo || '-'}  |  📦 ${item.qty}  |  MF: ${item.mf}`
        );
        const text = [
            `📋 *Sipariş Listesi*`,
            `${items.length} kalem • ${totalQty + totalMf} kutu`,
            ``,
            ...lines,
            ``,
            `✅ Toplamı: *${items.length} kalem* | *${totalQty + totalMf} kutu*`,
        ].join('\n');
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    // --- IMPORT METIN ---
    const importFromText = () => {
        if (!importText.trim()) {
            alert('Lütfen liste yapıştırın!');
            return;
        }

        const lines = importText.trim().split('\n').filter(line => line.trim());
        const newItems: CartItem[] = [];

        for (const line of lines) {
            const parts = line.split(/\t|\s+/).filter(p => p);
            if (parts.length >= 2) {
                const barkod = parts[0];
                const qty = parseInt(parts[1]) || 0;
                const mf = parts[2] ? parseInt(parts[2]) : 0;
                const ad = parts.slice(3).join(' ') || 'Bilinmeyen Ürün';

                if (barkod && qty > 0) {
                    newItems.push({ barkod, ad, depo: 'Aktar', qty, mf });
                }
            }
        }

        if (newItems.length === 0) {
            alert('Geçerli ürün bulunamadı!');
            return;
        }

        const merged = [...items];
        newItems.forEach(newItem => {
            const existing = merged.find(i => i.barkod === newItem.barkod);
            if (existing) {
                existing.qty += newItem.qty;
                existing.mf += newItem.mf;
            } else {
                merged.push(newItem);
            }
        });

        persistItems(merged);
        setShowImportModal(false);
        setImportText('');
        alert(`✅ ${newItems.length} ürün eklendi!`);
    };

    // --- IMPORT EXCEL ---
    const importFromExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = event.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

                const newItems: CartItem[] = rows
                    .map(row => {
                        const barkod = String(row['Barkod'] || row['barkod'] || row['BARKOD'] || '').trim();
                        const qty = parseInt(row['Adet'] || row['adet'] || row['QTY'] || '0');
                        const mf = parseInt(row['MF'] || row['mf'] || '0');
                        const ad = String(row['Ürün Adı'] || row['ürün adı'] || row['Adı'] || row['Ad'] || 'Bilinmeyen').trim();

                        return barkod && qty > 0 ? { barkod, ad, depo: 'Excel', qty, mf } : null;
                    })
                    .filter(Boolean) as CartItem[];

                if (newItems.length === 0) {
                    alert('Geçerli ürün bulunamadı!');
                    return;
                }

                const merged = [...items];
                newItems.forEach(newItem => {
                    const existing = merged.find(i => i.barkod === newItem.barkod);
                    if (existing) {
                        existing.qty += newItem.qty;
                        existing.mf += newItem.mf;
                    } else {
                        merged.push(newItem);
                    }
                });

                persistItems(merged);
                alert(`✅ ${newItems.length} ürün eklendi!`);
            } catch (error) {
                alert('Excel dosyası okunurken hata oluştu!');
            }
        };
        reader.readAsBinaryString(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // --- SYNC BADGE ---
    const SyncBadge = () => {
        if (syncStatus === 'saving') return <span className="flex items-center gap-1.5 text-xs text-amber-600"><Loader2 size={13} className="animate-spin" /> Kaydediliyor</span>;
        if (syncStatus === 'saved') return <span className="flex items-center gap-1.5 text-xs text-teal-600"><Cloud size={13} /> Kaydedildi</span>;
        if (syncStatus === 'error') return <span className="flex items-center gap-1.5 text-xs text-red-600"><CloudOff size={13} /> Hata</span>;
        return <span className="text-xs text-stone-400">Hazır</span>;
    };

    return (
        <div className="min-h-screen bg-white w-full overflow-x-hidden">
            <div className="max-w-6xl mx-auto w-full">

                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
                        <div className="bg-stone-50 w-20 h-20 rounded-full flex items-center justify-center mb-6">
                            <Package size={40} className="text-stone-300" />
                        </div>
                        <h2 className="text-2xl font-bold text-stone-900 mb-2">Sepetin Boş</h2>
                        <p className="text-stone-500 mb-8 max-w-md">Henüz sipariş vermek için ürün eklemedin. Arayüzden ürünler ekleyerek başla.</p>
                        <button onClick={() => setActiveTab('ilac')} className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-all">
                            Ürünleri İncele
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6 p-8">

                        {/* HEADER - TOPLAMLAR & AKSIYONLAR */}
                        <div className="border-b border-stone-200 pb-6">
                            <div className="flex flex-col gap-4">
                                {/* Toplamlar */}
                                <div className="flex items-center gap-8">
                                    <div>
                                        <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-1">Toplam Kalem</p>
                                        <p className="text-3xl font-black text-stone-900">{items.length}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-1">Toplam Kutu</p>
                                        <p className="text-3xl font-black text-teal-600">{totalQty + totalMf}</p>
                                    </div>
                                    <div className="ml-auto">
                                        <SyncBadge />
                                    </div>
                                </div>

                                {/* YETKİLİ KONTROLLERİ */}
                                <div className="flex flex-wrap items-center gap-2 w-full">
                                    <button
                                        onClick={() => setShowImportModal(true)}
                                        className="flex items-center justify-center gap-2 px-3 py-2 border border-stone-200 rounded-lg hover:bg-stone-50 font-semibold text-xs text-stone-700 transition-all shrink-0"
                                    >
                                        <Upload size={14} /> <span className="hidden sm:inline">Metin Aktar</span><span className="sm:hidden">Metin</span>
                                    </button>
                                    
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center justify-center gap-2 px-3 py-2 border border-stone-200 rounded-lg hover:bg-stone-50 font-semibold text-xs text-stone-700 transition-all shrink-0"
                                    >
                                        <FileUp size={14} /> <span className="hidden sm:inline">Excel Aktar</span><span className="sm:hidden">Excel</span>
                                    </button>
                                    
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={importFromExcel}
                                        className="hidden"
                                    />

                                    {/* ARAMA (Excel Aktar ile Excel Butonu Arasında) */}
                                    <div className="relative flex-1 min-w-[200px] max-w-xs">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="Ara..."
                                            className="w-full pl-9 pr-8 py-1.5 border border-stone-200 rounded-lg text-xs outline-none focus:border-teal-500 transition-all"
                                        />
                                        {searchQuery && (
                                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>

                                    {selectedItems.size > 0 && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={deleteSelected}
                                                className="flex items-center justify-center gap-2 px-3 py-2 border border-red-200 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-semibold text-xs transition-all shrink-0"
                                            >
                                                <Trash2 size={14} /> <span>Sil ({selectedItems.size})</span>
                                            </button>
                                            
                                            <select
                                                onChange={(e) => {
                                                    const targetDepo = e.target.value;
                                                    if (!targetDepo) return;
                                                    const updated = items.map(item => selectedItems.has(item.barkod) ? { ...item, depo: targetDepo } : item);
                                                    persistItems(updated);
                                                    e.target.value = "";
                                                }}
                                                className="border border-stone-200 rounded-lg px-2.5 py-1.5 font-bold text-xs text-stone-700 bg-white focus:border-teal-500 cursor-pointer outline-none"
                                            >
                                                <option value="">Depo Değiştir...</option>
                                                {loadDepolar().filter(d => d.enabled !== false).map(d => (
                                                    <option key={d.id} value={d.ad}>{d.ad}</option>
                                                ))}
                                            </select>

                                            <button
                                                onClick={handleQueryMFForSelected}
                                                className="flex items-center justify-center gap-2 px-3 py-2 border border-teal-200 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 font-bold text-xs transition-all shrink-0 cursor-pointer"
                                            >
                                                <Search size={14} /> <span>MF Sorgula</span>
                                            </button>
                                        </div>
                                    )}

                                    <button
                                        onClick={downloadXlsx}
                                        className="flex items-center justify-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold text-xs transition-all shrink-0"
                                    >
                                        <Download size={14} /> <span>Excel</span>
                                    </button>

                                    <button
                                        onClick={sendWhatsApp}
                                        className="flex items-center justify-center gap-2 px-3 py-2 bg-[#25D366] text-white rounded-lg hover:bg-[#1ebe5d] font-semibold text-xs transition-all shrink-0"
                                    >
                                        <WhatsAppIcon /> <span className="hidden sm:inline">WhatsApp</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* TABLO */}
                        <div className="overflow-x-auto scrollbar-hide">
                            <table className="w-full text-xs md:text-sm">
                                <thead>
                                    <tr className="border-b border-stone-200">
                                        <th className="px-2 md:px-4 py-2 md:py-3 text-left">
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 rounded border-stone-300 text-teal-600 focus:ring-2 focus:ring-teal-100 cursor-pointer"
                                            />
                                        </th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 text-left text-[9px] md:text-[11px] font-semibold text-stone-600 uppercase tracking-wide">Ürün</th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 text-left text-[9px] md:text-[11px] font-semibold text-stone-600 uppercase tracking-wide">Barkod</th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 text-center text-[9px] md:text-[11px] font-semibold text-stone-600 uppercase tracking-wide">Adet</th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 text-center text-[9px] md:text-[11px] font-semibold text-stone-600 uppercase tracking-wide">MF</th>
                                        <th className="px-2 md:px-4 py-2 md:py-3 text-right text-[9px] md:text-[11px] font-semibold text-stone-600 uppercase tracking-wide">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.flatMap((item) => {
                                        const isExpanded = expandedBarkod === item.barkod;
                                        const purchases = getPurchaseHistory(item.v95);
                                        const queries = getQueryHistory(item.barkod, localOrders);
                                        
                                        // GÜNCEL SORGU MF'LERİ: Her depo için en son sorgunun MF baremleri
                                        const queryBarems: { ana: number; mf: number }[] = [];
                                        const seenBarem = new Set<string>();
                                        if (Array.isArray(localOrders)) {
                                            const warehouseLatestOrders: Record<string, any> = {};
                                            localOrders
                                                .filter(o => o.barkod === item.barkod)
                                                .forEach(order => {
                                                    const depo = order.depo || 'Bilinmeyen';
                                                    const existing = warehouseLatestOrders[depo];
                                                    if (!existing || new Date(order.tarih || 0).getTime() > new Date(existing.tarih || 0).getTime()) {
                                                        warehouseLatestOrders[depo] = order;
                                                    }
                                                });
                                            
                                            Object.values(warehouseLatestOrders).forEach((order: any) => {
                                                [order.mf1, order.mf2, order.mf3].forEach(val => {
                                                    if (!val) return;
                                                    const clean = val.trim();
                                                    if (!clean.includes('+')) return;
                                                    const [anaStr, mfStr] = clean.split('+');
                                                    const ana = parseInt(anaStr) || 0;
                                                    const mf = parseInt(mfStr) || 0;
                                                    if (ana > 0 && mf > 0) {
                                                        const key = `${ana}+${mf}`;
                                                        if (!seenBarem.has(key)) {
                                                            seenBarem.add(key);
                                                            queryBarems.push({ ana, mf });
                                                        }
                                                    }
                                                });
                                            });
                                        }
                                        const baremler = queryBarems.sort((a, b) => a.ana - b.ana);
                                        return [
                                            <tr key={item.barkod} className={`border-b border-stone-100 hover:bg-stone-50/50 transition-colors group ${isExpanded ? 'bg-stone-50' : ''}`}>
                                                <td className="px-2 md:px-4 py-2 md:py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedItems.has(item.barkod)}
                                                        onChange={() => toggleSelect(item.barkod)}
                                                        className="w-4 h-4 rounded border-stone-300 text-teal-600 focus:ring-2 focus:ring-teal-100 cursor-pointer"
                                                    />
                                                </td>
                                                <td 
                                                    onClick={() => setExpandedBarkod(isExpanded ? null : item.barkod)}
                                                    className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-semibold text-stone-900 cursor-pointer hover:text-teal-600 select-none"
                                                >
                                                    <div className="flex items-center flex-wrap gap-2">
                                                        <span>{item.ad}</span>
                                                        <span className="text-[10px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded font-normal shrink-0">
                                                            Geçmiş ({purchases.length} Alım · {queries.length} Sorgu)
                                                        </span>
                                                        {baremler.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
                                                                {baremler.map((b: any, bi: number) => (
                                                                    <button
                                                                        key={bi}
                                                                        onClick={() => {
                                                                            const updated = items.map(i => i.barkod === item.barkod ? { ...i, qty: b.ana, mf: b.mf } : i);
                                                                            persistItems(updated);
                                                                        }}
                                                                        className="bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold font-mono text-[9px] px-1.5 py-0.5 rounded border border-teal-200 hover:border-teal-300 hover:scale-105 active:scale-95 transition-all shadow-sm"
                                                                        title={`${b.ana} adet alıma ${b.mf} mf`}
                                                                    >
                                                                        {b.ana}+{b.mf}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-mono text-stone-600">{item.barkod}</td>
                                                <td className="px-2 md:px-4 py-2 md:py-3 text-center">
                                                    <input
                                                        type="number"
                                                        value={item.qty}
                                                        onChange={(e) => {
                                                            const updated = items.map(i => i.barkod === item.barkod ? { ...i, qty: Math.max(0, parseInt(e.target.value) || 0) } : i);
                                                            persistItems(updated);
                                                        }}
                                                        className="w-12 md:w-16 text-center border border-stone-200 rounded px-1.5 md:px-2 py-1 md:py-1.5 font-semibold text-xs md:text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                                        min="0"
                                                    />
                                                </td>
                                                <td className="px-2 md:px-4 py-2 md:py-3 text-center">
                                                    <input
                                                        type="number"
                                                        value={item.mf}
                                                        onChange={(e) => {
                                                            const updated = items.map(i => i.barkod === item.barkod ? { ...i, mf: Math.max(0, parseInt(e.target.value) || 0) } : i);
                                                            persistItems(updated);
                                                        }}
                                                        className="w-12 md:w-16 text-center border border-stone-200 rounded px-1.5 md:px-2 py-1 md:py-1.5 font-semibold text-xs md:text-sm text-teal-600 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                                        min="0"
                                                    />
                                                </td>
                                                <td className="px-2 md:px-4 py-2 md:py-3 text-right">
                                                    <button
                                                        onClick={() => deleteItem(item.barkod)}
                                                        className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>,
                                            isExpanded && (
                                                <tr key={`${item.barkod}-expanded`} className="bg-stone-50/50 animate-fadeIn">
                                                    <td colSpan={8} className="px-4 py-4 border-b border-stone-100">
                                                        <div className="pl-8 pr-4 py-1 w-full">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                {/* Sol Kolon: Fatura Alımları */}
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="w-1.5 h-3 rounded bg-blue-500"></span>
                                                                        <h4 className="text-[10px] font-black text-stone-500 uppercase tracking-widest">🚚 Son 5 Depo Alımı (Fatura)</h4>
                                                                    </div>
                                                                    {purchases.length === 0 ? (
                                                                        <p className="text-stone-400 text-xs italic bg-white p-3 rounded-xl border border-stone-100 shadow-sm">Depo alım geçmişi bulunamadı.</p>
                                                                    ) : (
                                                                        <div className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                                                            <table className="w-full text-left text-xs border-collapse">
                                                                                <thead className="bg-stone-50 text-stone-500 border-b border-stone-100">
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
                                                                                            <td className="px-3 py-2 truncate max-w-[120px] font-semibold text-stone-700" title={h.depo}>{h.depo}</td>
                                                                                            <td className="px-3 py-2 text-center font-black text-emerald-600">{h.mf}</td>
                                                                                            <td className="px-3 py-2 text-right font-mono text-stone-600">{h.qty}</td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Sağ Kolon: Canlı Sorgu MF'leri */}
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="w-1.5 h-3 rounded bg-amber-500"></span>
                                                                        <h4 className="text-[10px] font-black text-stone-500 uppercase tracking-widest">🔍 Depo Sorgulamalarında En Son MF'ler</h4>
                                                                    </div>
                                                                    {queries.length === 0 ? (
                                                                        <p className="text-stone-400 text-xs italic bg-white p-3 rounded-xl border border-stone-100 shadow-sm">Sorgu MF geçmişi bulunamadı.</p>
                                                                    ) : (
                                                                        <div className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                                                            <table className="w-full text-left text-xs border-collapse">
                                                                                <thead className="bg-stone-50 text-stone-500 border-b border-stone-100">
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
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        ].filter(Boolean);
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* IMPORT MODAL */}
                {showImportModal && (
                    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 md:p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-sm md:max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-stone-200">
                                <h2 className="text-xl font-bold text-stone-900">📥 Metin Listesi Aktar</h2>
                                <p className="text-sm text-stone-500 mt-1">Başka kaynaktan aldığın listeyi yapıştır</p>
                            </div>

                            <div className="p-6">
                                <label className="block text-sm font-semibold text-stone-700 mb-3">
                                    Listeyi Yapıştır (Barkod | Adet | MF):
                                </label>
                                <textarea
                                    value={importText}
                                    onChange={(e) => setImportText(e.target.value)}
                                    placeholder="8699123456789    10    2&#10;8699987654321    5     0"
                                    className="w-full h-40 p-4 border border-stone-200 rounded-lg font-mono text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 resize-none"
                                />
                                <p className="text-[11px] text-stone-500 mt-2">💡 Format: Barkod TAB Adet [TAB MF]</p>
                            </div>

                            <div className="p-6 bg-stone-50 border-t border-stone-200 flex gap-3 justify-end">
                                <button
                                    onClick={() => {
                                        setShowImportModal(false);
                                        setImportText('');
                                    }}
                                    className="px-4 py-2.5 rounded-lg border border-stone-300 text-stone-700 font-semibold hover:bg-stone-100 transition-all"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={importFromText}
                                    className="px-4 py-2.5 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-all"
                                >
                                    ✅ İçeri Aktar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* PROGRESS OVERLAY */}
                {queryProgress && (
                    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[130] flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl p-6 shadow-2xl border border-stone-150 max-w-sm w-full flex flex-col items-center text-center gap-4">
                            <span className="h-8 w-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin"></span>
                            <div className="space-y-1">
                                <h4 className="font-black text-stone-900 text-sm">Canlı MF Sorgulanıyor</h4>
                                <p className="text-xs text-stone-500">{queryProgress.msg}</p>
                            </div>
                            <div className="w-full bg-stone-100 rounded-full h-1.5">
                                <div className="bg-teal-650 h-1.5 rounded-full transition-all duration-300" style={{ width: `${(queryProgress.current / queryProgress.total) * 100}%` }}></div>
                            </div>
                            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{queryProgress.current} / {queryProgress.total}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
