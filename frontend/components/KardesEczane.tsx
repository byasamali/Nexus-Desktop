"use client";

import React, { useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { fetchEczaneData } from '@/lib/api';
import {
  Building2, RefreshCw, Search, Package, TrendingUp,
  AlertTriangle, Moon, Clock, ChevronDown, ChevronUp, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

// AWS JSON'dan gelen ürün verisini parse edip sadece stok bilgisi döndür
function parseStokVerisi(rawData: any): StokItem[] {
  if (!rawData?.gruplar) return [];

  const items: StokItem[] = [];

  for (const grup of rawData.gruplar) {
    for (const urun of grup.detaylar || []) {
      const stok = urun.v4 ?? 0;
      const aylikHiz = (urun.v20 ?? 0) * 30;
      const omurGun = aylikHiz > 0 && stok > 0
        ? Math.round(stok / (urun.v20 ?? 1))
        : null;

      items.push({
        barkod: urun.v1 ?? '',
        urun_adi: urun.v2 ?? '',
        stok,
        aylik_hiz: parseFloat(aylikHiz.toFixed(1)),
        omur_gun: omurGun,
        depo: urun.v91 ?? '',
        kategori_id: urun.kategori_id ?? null,
      });
    }
  }

  return items.sort((a, b) => b.stok - a.stok);
}

interface StokItem {
  barkod: string;
  urun_adi: string;
  stok: number;
  aylik_hiz: number;
  omur_gun: number | null;
  depo: string;
  kategori_id: number | null;
}

interface KardesEczane {
  id: string;
  eczane_adi: string;
  kardes_kodu: string;
  stoklar: StokItem[] | null;
  yukleniyor: boolean;
  hata: string | null;
  son_guncelleme: Date | null;
}

export default function KardesEczanePage() {
  const [kardesler, setKardesler] = useState<KardesEczane[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [aramaQuery, setAramaQuery] = useState('');
  const [aktifKardes, setAktifKardes] = useState<string | null>(null);
  const [veriCekildi, setVeriCekildi] = useState(false);

  const kardesleriBul = async () => {
    setYukleniyor(true);
    setHata(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı');

      // Mevcut eczanenin kardes_kodu'nu al
      const { data: benim, error: benimHata } = await supabase
        .from('eczaneler')
        .select('id, eczane_adi, kardes_kodu')
        .eq('id', user.id)
        .single();

      if (benimHata || !benim) throw new Error('Eczane bilgisi alınamadı');
      if (!benim.kardes_kodu) throw new Error('Henüz bir kardeş grubuna dahil değilsiniz. Lütfen yönetici ile iletişime geçin.');

      // Aynı kardes_kodu'na sahip diğer eczaneleri bul
      const { data: kardesListesi, error: kardesHata } = await supabase
        .from('eczaneler')
        .select('id, eczane_adi, kardes_kodu')
        .eq('kardes_kodu', benim.kardes_kodu)
        .neq('id', user.id)
        .eq('onaylandi_mi', true);

      if (kardesHata) throw new Error('Kardeş eczaneler alınamadı');

      if (!kardesListesi || kardesListesi.length === 0) {
        setHata('Aynı grupta başka eczane bulunamadı.');
        setYukleniyor(false);
        return;
      }

      setKardesler(kardesListesi.map(k => ({
        ...k,
        stoklar: null,
        yukleniyor: false,
        hata: null,
        son_guncelleme: null,
      })));

      setVeriCekildi(true);
      if (kardesListesi.length > 0) setAktifKardes(kardesListesi[0].id);

    } catch (e: any) {
      setHata(e.message || 'Bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  const kardesStokCek = async (kardesId: string) => {
    setKardesler(prev => prev.map(k =>
      k.id === kardesId ? { ...k, yukleniyor: true, hata: null } : k
    ));

    try {
      const rawData = await fetchEczaneData(kardesId);
      if (!rawData) throw new Error('Veri alınamadı');

      const stoklar = parseStokVerisi(rawData);

      setKardesler(prev => prev.map(k =>
        k.id === kardesId
          ? { ...k, stoklar, yukleniyor: false, son_guncelleme: new Date() }
          : k
      ));
    } catch (e: any) {
      setKardesler(prev => prev.map(k =>
        k.id === kardesId
          ? { ...k, yukleniyor: false, hata: e.message || 'Veri çekilemedi' }
          : k
      ));
    }
  };

  const tumunuCek = async () => {
    for (const k of kardesler) {
      await kardesStokCek(k.id);
    }
  };

  const aktifKardesData = kardesler.find(k => k.id === aktifKardes);

  const filtreliStoklar = useMemo(() => {
    if (!aktifKardesData?.stoklar) return [];
    const q = aramaQuery.toLowerCase();
    if (!q) return aktifKardesData.stoklar;
    return aktifKardesData.stoklar.filter(s =>
      s.urun_adi.toLowerCase().includes(q) ||
      s.barkod.includes(q)
    );
  }, [aktifKardesData, aramaQuery]);

  const stokOzeti = useMemo(() => {
    const stoklar = aktifKardesData?.stoklar || [];
    return {
      toplam: stoklar.length,
      sifir: stoklar.filter(s => s.stok <= 0).length,
      kritik: stoklar.filter(s => s.omur_gun !== null && s.omur_gun > 0 && s.omur_gun <= 15).length,
      fazla: stoklar.filter(s => s.omur_gun !== null && s.omur_gun > 180).length,
    };
  }, [aktifKardesData]);

  // ── BAŞLANGIÇ EKRANI ────────────────────────────────────────
  if (!veriCekildi) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="text-center">
          <div className="h-16 w-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 size={28} className="text-stone-400" />
          </div>
          <h2 className="text-xl font-black text-stone-900">Kardeş Eczane</h2>
          <p className="text-sm text-stone-400 font-medium mt-1.5 max-w-xs">
            Aynı gruptaki eczanelerin stok bilgilerini görüntüleyin
          </p>
        </div>

        {hata && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-medium max-w-sm text-center">
            {hata}
          </div>
        )}

        <button
          onClick={kardesleriBul}
          disabled={yukleniyor}
          className="flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-xl font-bold text-sm hover:bg-stone-700 transition-all disabled:opacity-60">
          {yukleniyor
            ? <><RefreshCw size={16} className="animate-spin" /> Aranıyor...</>
            : <><Building2 size={16} /> Kardeş Eczaneleri Bul</>
          }
        </button>
      </div>
    );
  }

  // ── ANA EKRAN ────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-stone-900">Kardeş Eczane Stokları</h2>
          <p className="text-xs text-stone-400 font-medium mt-0.5">{kardesler.length} kardeş eczane bulundu</p>
        </div>
        <button
          onClick={tumunuCek}
          disabled={kardesler.some(k => k.yukleniyor)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl font-bold text-xs hover:bg-teal-700 transition-all disabled:opacity-60">
          <RefreshCw size={13} className={cn(kardesler.some(k => k.yukleniyor) && "animate-spin")} />
          Tüm Verileri Çek
        </button>
      </div>

      <div className="flex gap-4">

        {/* Sol: Kardeş Listesi */}
        <div className="w-56 shrink-0 space-y-1.5">
          {kardesler.map(k => (
            <button
              key={k.id}
              onClick={() => setAktifKardes(k.id)}
              className={cn(
                "w-full text-left px-3 py-3 rounded-xl border transition-all",
                aktifKardes === k.id
                  ? "bg-stone-900 border-stone-900 text-white"
                  : "bg-white border-stone-100 text-stone-700 hover:border-stone-200"
              )}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className={cn("text-[12px] font-bold truncate", aktifKardes === k.id ? "text-white" : "text-stone-800")}>
                    {k.eczane_adi}
                  </p>
                  <p className={cn("text-[10px] mt-0.5", aktifKardes === k.id ? "text-stone-300" : "text-stone-400")}>
                    {k.stoklar !== null
                      ? `${k.stoklar.length} ürün`
                      : k.yukleniyor ? 'Çekiliyor...' : 'Veri yok'}
                  </p>
                </div>
                {k.yukleniyor && <RefreshCw size={12} className="animate-spin shrink-0 text-teal-400" />}
                {k.stoklar !== null && !k.yukleniyor && (
                  <div className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
                )}
              </div>

              {/* Veri çek butonu */}
              {!k.yukleniyor && (
                <button
                  onClick={e => { e.stopPropagation(); kardesStokCek(k.id); }}
                  className={cn(
                    "mt-2 w-full text-[10px] font-bold px-2 py-1 rounded-lg transition-all",
                    aktifKardes === k.id
                      ? "bg-white/10 text-white hover:bg-white/20"
                      : "bg-stone-50 text-stone-500 hover:bg-teal-50 hover:text-teal-600 border border-stone-200"
                  )}>
                  {k.stoklar !== null ? '↻ Güncelle' : '⬇ Veri Çek'}
                </button>
              )}

              {k.hata && (
                <p className="text-[9px] text-red-400 mt-1 truncate">{k.hata}</p>
              )}
            </button>
          ))}
        </div>

        {/* Sağ: Stok Tablosu */}
        <div className="flex-1 bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm">

          {/* Tablo header */}
          <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-stone-400" />
              <input
                type="text"
                placeholder="Ürün adı veya barkod ara..."
                value={aramaQuery}
                onChange={e => setAramaQuery(e.target.value)}
                className="w-full pl-7 pr-3 h-8 text-[11px] bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-400/20 focus:border-teal-400 focus:bg-white outline-none transition-all"
              />
            </div>

            {/* Özet istatistikler */}
            {aktifKardesData?.stoklar && (
              <div className="flex items-center gap-2 shrink-0">
                <Stat label="Toplam" value={stokOzeti.toplam} color="stone" />
                <Stat label="Tükenen" value={stokOzeti.sifir} color="red" />
                <Stat label="Kritik" value={stokOzeti.kritik} color="amber" />
                <Stat label="Fazla" value={stokOzeti.fazla} color="slate" />
              </div>
            )}
          </div>

          {/* İçerik */}
          {!aktifKardesData ? (
            <EmptyMsg icon={Building2} text="Soldaki listeden bir eczane seçin" />
          ) : aktifKardesData.yukleniyor ? (
            <LoadingMsg eczaneAdi={aktifKardesData.eczane_adi} />
          ) : aktifKardesData.hata ? (
            <EmptyMsg icon={X} text={aktifKardesData.hata} color="red" />
          ) : aktifKardesData.stoklar === null ? (
            <EmptyMsg icon={Package} text={`${aktifKardesData.eczane_adi} için "Veri Çek" butonuna tıklayın`} />
          ) : filtreliStoklar.length === 0 ? (
            <EmptyMsg icon={Search} text="Arama sonucu bulunamadı" />
          ) : (
            <>
              {aktifKardesData.son_guncelleme && (
                <div className="px-4 py-2 bg-teal-50 border-b border-teal-100 flex items-center gap-1.5">
                  <Clock size={10} className="text-teal-500" />
                  <span className="text-[10px] text-teal-600 font-medium">
                    Son güncelleme: {aktifKardesData.son_guncelleme.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    {' — '}{aktifKardesData.eczane_adi}
                  </span>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-white border-b border-stone-100">
                    <tr>
                      {['Ürün Adı', 'Barkod', 'Depo', 'Stok', 'Hız/ay', 'Stok Ömrü'].map((h, i) => (
                        <th key={i} className={cn(
                          "py-3 font-black text-stone-400 text-[10px] uppercase tracking-widest",
                          i === 0 ? "px-4 text-left" : "px-3 text-center"
                        )}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtreliStoklar.map((item, i) => {
                      const omurColor = !item.omur_gun
                        ? item.stok <= 0 ? 'text-red-500' : 'text-stone-300'
                        : item.omur_gun <= 15 ? 'text-red-500'
                          : item.omur_gun <= 30 ? 'text-amber-500'
                            : item.omur_gun > 180 ? 'text-slate-400'
                              : 'text-emerald-600';

                      return (
                        <tr key={i} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-semibold text-stone-800">{item.urun_adi}</span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="font-mono text-[10px] text-stone-400 bg-stone-50 px-1.5 py-0.5 rounded border border-stone-200">
                              {item.barkod}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center text-[11px] text-stone-400">
                            {item.depo || '—'}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={cn(
                              "font-black text-[13px] font-mono",
                              item.stok <= 0 ? 'text-red-500' : 'text-stone-900'
                            )}>
                              {item.stok}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center font-mono text-stone-600 text-[11px]">
                            {item.aylik_hiz}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={cn("font-bold text-[11px]", omurColor)}>
                              {item.stok <= 0
                                ? 'Tükendi'
                                : item.omur_gun === null
                                  ? 'Hareketsiz'
                                  : `${item.omur_gun} gün`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    stone: 'bg-stone-50 text-stone-600 border-stone-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    slate: 'bg-slate-50 text-slate-500 border-slate-200',
  };
  return (
    <div className={cn("px-2.5 py-1 rounded-lg border text-center", colors[color])}>
      <p className="text-[8px] font-black uppercase">{label}</p>
      <p className="text-[13px] font-black">{value}</p>
    </div>
  );
}

function EmptyMsg({ icon: Icon, text, color = 'stone' }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center",
        color === 'red' ? 'bg-red-50' : 'bg-stone-100')}>
        <Icon size={22} className={color === 'red' ? 'text-red-300' : 'text-stone-300'} />
      </div>
      <p className="text-sm font-semibold text-stone-500 max-w-xs">{text}</p>
    </div>
  );
}

function LoadingMsg({ eczaneAdi }: { eczaneAdi: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative">
        <div className="h-12 w-12 rounded-2xl bg-teal-50 flex items-center justify-center">
          <Building2 size={22} className="text-teal-400" />
        </div>
        <div className="absolute -inset-1 rounded-2xl border-2 border-teal-400 border-t-transparent animate-spin opacity-60" />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-stone-700">{eczaneAdi}</p>
        <p className="text-xs text-stone-400 mt-0.5">Stok verileri çekiliyor...</p>
      </div>
    </div>
  );
}
