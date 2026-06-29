"use client";

import React, { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import {
  Activity, Package, Clock, PieChart as PieChartIcon, TrendingUp, ShieldCheck,
  DollarSign, Zap, AlertTriangle, Calendar, ChevronRight, ArrowUpRight, Layers
} from 'lucide-react';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

function parseMiadStr(raw: string | undefined | null): string {
  if (!raw) return 'Belirsiz';
  const str = String(raw);
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(str.trim())) {
    const d = new Date(str.trim());
    if (!isNaN(d.getTime())) return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return str;
}

const atc4Names: Record<string, string> = {
  'A02B': 'Mide Koruyucular (Proton Pompası İnh.)',
  'A10B': 'Oral Antidiyabetikler (Şeker Hapları)',
  'A10A': 'İnsülinler (Şeker İlaçları)',
  'B01A': 'Kan Sulandırıcılar (Antitrombotikler)',
  'C09A': 'Tansiyon İlaçları (ACE İnhibitörleri)',
  'C10A': 'Kolesterol İlaçları (Statine vb.)',
  'J01C': 'Penisilin Grubu Antibiyotikler',
  'J01D': 'Sefalosporin Grubu Antibiyotikler',
  'J01F': 'Makrolid Grubu Antibiyotikler',
  'J01X': 'Diğer Antibakteriyel İlaçlar',
  'M01A': 'Ağrı/Romatizma İlaçları (Romatoid vb.)',
  'N02B': 'Ağrı Kesici & Ateş Düşürücüler (Analjezikler)',
  'N05A': 'Antipsikotik İlaçlar',
  'N05B': 'Sakinleştirici İlaçlar (Anksiyolitikler)',
  'N06A': 'Antidepresan İlaçlar',
  'R03A': 'Astım/KOAH İnhalatör İlaçları',
  'R05C': 'Öksürük Şurupları & Balgam Söktürücüler',
  'R06A': 'Alerji İlaçları (Antihistaminikler)',
  'A11A': 'Multivitamin Takviyeleri',
  'A07A': 'İshal & Bağırsak Enfeksiyonu İlaçları'
};

function formatAtc4(atc4: string): string {
  if (!atc4) return 'Bilinmeyen Tedavi Grubu';
  const clean = atc4.trim().toUpperCase();
  const name = atc4Names[clean];
  return name ? `${clean} - ${name}` : clean;
}

// ── Mini KPI kartı ────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, iconCls, label, value, sub, onClick }: any) {
  return (
    <div onClick={onClick} className={cn("bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4", onClick && "cursor-pointer hover:border-slate-300 hover:shadow-md transition-all")}>
      <div className={cn("h-12 w-12 rounded-full flex items-center justify-center shrink-0", iconCls)}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black text-slate-800 leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Bölüm başlığı ─────────────────────────────────────────────────────────────
function SectionTitle({ icon: Icon, iconCls, title, sub }: any) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <Icon className={cn("h-5 w-5 shrink-0", iconCls)} />
      <div>
        <h3 className="font-bold text-slate-800 text-sm leading-tight">{title}</h3>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

export default function GeneralReports({ data }: { data: any }) {
  const [mounted, setMounted] = useState(false);
  const [champTab, setChampTab] = useState<'kutu' | 'ciro'>('kutu');

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  // ── VERİ ÇEKİMİ ─────────────────────────────────────────────────────────────
  const analytics = data?.analytics || {};
  const gruplar = data?.gruplar || [];
  const atcAnalizi = data?.atc_analizi || {};
  const atcSurum = atcAnalizi?.surum || [];
  const atcEtki = atcAnalizi?.etki || [];

  const esdegerAnalizi = data?.esdeger_analizi || {};
  const esdegerEtki = esdegerAnalizi?.etki || [];
  const esdegerSurum = esdegerAnalizi?.surum || [];

  const kademeAnalizi = data?.kademe_analizi?.dağılım || {};
  const gunSaat = data?.gun_saat_analizi || {};
  const enYogunGunler = gunSaat?.en_yogun_gunler || [];
  const nakitList = data?.nakit_optimizasyon || [];
  const miadList = data?.miad_risk_listesi || [];
  const oluList = data?.olu_stok_listesi || [];

  const annualData = analytics?.periods?.ANNUAL || analytics?.periods?.annual || {};
  const topKutu = (annualData.top_kutu || []).slice(0, 250);
  const topCiro = (annualData.top_ciro || []).slice(0, 250);
  const champList = champTab === 'kutu' ? topKutu : topCiro;

  // Ciro yüzdesi hesapla
  const totalCiro = topCiro.reduce((a: number, u: any) => a + (Number(u.ciro) || 0), 0);
  const getCiroPct = (u: any) => totalCiro > 0 ? ((Number(u.ciro) || 0) / totalCiro * 100).toFixed(1) : '0.0';

  // ── HESAPLAMALAR ─────────────────────────────────────────────────────────────
  const totalProducts = gruplar.reduce((a: number, g: any) => a + g.detaylar.length, 0) || 1;
  const totalOlu = oluList.length;
  const totalMiad = miadList.length;
  const healthScore = Math.max(0, 100 - ((totalOlu + totalMiad) / totalProducts * 100)).toFixed(1);

  // Toplam sipariş özeti
  const totalOneri = gruplar.reduce((a: number, g: any) => a + (g.toplam_oneri || 0), 0);
  const kritikGrupSayisi = gruplar.filter((g: any) => g.kritik_puan > 50).length;

  // Nakit fırsat
  const nakitToplamKilitli = nakitList.reduce((a: number, n: any) => {
    const deger = typeof n.deger === 'string' ? parseFloat(n.deger.replace(/[^0-9.]/g, '')) : (n.deger || 0);
    return a + deger;
  }, 0);
  const topNakit = [...nakitList].sort((a: any, b: any) => (b.fazlalik || 0) - (a.fazlalik || 0)).slice(0, 6);

  // Aylık trend
  const monthlyTrends = analytics?.trends?.labels?.map((label: string, idx: number) => ({
    name: label,
    kutu: Math.round(analytics?.trends?.adet?.[idx] || 0),
    ciro: Math.round(analytics?.trends?.ciro?.[idx] || 0),
  })) || [];

  // İşlem tipi (pasta)
  const islemTipi = data?.analytics?.islem_tipi_dagilimi || [];
  const tipRenkler: Record<string, string> = {
    sgk_recete: '#3b82f6', nakit_satis: '#10b981',
    perakende_recete: '#f59e0b', cezaevi_recete: '#8b5cf6', bilinmeyen_recete: '#9ca3af'
  };
  const tipAdlar: Record<string, string> = {
    sgk_recete: 'SGK Reçete', nakit_satis: 'Nakit Satış',
    perakende_recete: 'Perakende', cezaevi_recete: 'Cezaevi', bilinmeyen_recete: 'Diğer'
  };
  const pieData = islemTipi.length > 0
    ? islemTipi.map((item: any) => ({ name: tipAdlar[item.satis_tipi] || item.satis_tipi, value: item.oran, color: tipRenkler[item.satis_tipi] || '#9ca3af' }))
    : [{ name: 'SGK Reçete', value: 65, color: '#3b82f6' }, { name: 'Nakit Satış', value: 35, color: '#10b981' }];

  // Kademe verileri
  const kademeBar = Object.entries(kademeAnalizi).map(([k, v]: [string, any]) => ({
    kademe: k, kutu: v.yuzde_kutu || 0, ciro: v.yuzde_ciro || 0,
    kar: v.eczacı_kar_marjı || 0, etiket: v.etiket || k
  }));

  // Günlük trafik
  const gunYuzdeleri = gunSaat?.gun_yuzdeleri || {};
  const gunSirasi = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  const gunData = gunSirasi.map(gun => ({
    gun: gun.slice(0, 3), yuzde: gunYuzdeleri[gun] || 0, full: gun
  }));
  const maxGun = Math.max(...gunData.map(g => g.yuzde), 1);

  // Miad ay dağılımı - yeni format destekli
  const miadAylar: Record<string, number> = {};
  miadList.forEach((u: any) => {
    const miad = u.miad || u.miad_raw || '';
    const str = String(miad);
    // "2026-01-31:1|2027-04-30:3" formatı
    if (str.includes(':') && str.includes('-')) {
      str.split('|').forEach(part => {
        const [tarih, adet] = part.split(':');
        if (tarih) {
          const match = tarih.trim().match(/(\d{4})-(\d{2})/);
          if (match) {
            const key = `${match[1]}-${match[2]}`;
            miadAylar[key] = (miadAylar[key] || 0) + (parseInt(adet) || 1);
          }
        }
      });
    } else {
      const match = str.match(/(\d{4})-(\d{2})/);
      if (match) {
        const key = `${match[1]}-${match[2]}`;
        miadAylar[key] = (miadAylar[key] || 0) + 1;
      }
    }
  });
  const miadChart = Object.entries(miadAylar)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 8)
    .map(([ay, sayi]) => ({ ay: ay.slice(5) + '/' + ay.slice(2, 4), sayi }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── 1. NABIZ KARTLARI ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Activity} iconCls="bg-blue-50 text-blue-600" label="Stok Sağlık Skoru" value={`%${healthScore}`} />
        <KpiCard icon={Package} iconCls="bg-emerald-50 text-emerald-600" label="Aktif Ürün Çeşidi" value={totalProducts.toLocaleString('tr-TR')} />
        <KpiCard icon={Zap} iconCls="bg-violet-50 text-violet-600" label="Toplam AI Önerisi" value={totalOneri.toLocaleString('tr-TR')} sub={`${kritikGrupSayisi} kritik grup`} />
        <KpiCard icon={DollarSign} iconCls="bg-orange-50 text-orange-600" label="Kilitli Nakit Fırsatı"
          value={nakitToplamKilitli > 0 ? `₺${(nakitToplamKilitli / 1000).toFixed(0)}K` : `${nakitList.length} kalem`}
          sub={`${nakitList.length} kalem · ${nakitList.reduce((a: number, n: any) => a + (n.fazlalik || 0), 0)} kutu fazla stok`} />
      </div>

      {/* ── 2. TREND + PASTA ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <SectionTitle icon={TrendingUp} iconCls="text-blue-500" title="Kutu Satış Hacmi Trendi" sub="Aylık bazda toplam kutu çıkışı" />
          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrends} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gKutu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }} />
                <Area type="monotone" name="Satılan Kutu" dataKey="kutu" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#gKutu)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <SectionTitle icon={PieChartIcon} iconCls="text-emerald-500" title="İşlem Tipi Dağılımı" sub="Reçeteli vs elden satış" />
          <div className="flex-1 min-h-[180px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip formatter={(v: any) => [`%${Number(v).toFixed(1)}`, 'Oran']} contentStyle={{ borderRadius: '8px', border: 'none', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-1.5 mt-2">
            {pieData.map(e => (
              <div key={e.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: e.color }} />
                  <span className="text-slate-600 font-medium">{e.name}</span>
                </div>
                <span className="font-bold text-slate-700">%{Number(e.value).toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. ŞAMPİYONLAR (sekmeli) ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <SectionTitle icon={ShieldCheck} iconCls="text-indigo-500" title="Şampiyonlar Ligi" sub="Yıllık bazda en güçlü ürünler" />
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {(['kutu', 'ciro'] as const).map(tab => (
              <button key={tab} onClick={() => setChampTab(tab)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  champTab === tab ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                {tab === 'kutu' ? '📦 Sürüm' : '💰 Ciro'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* Sol: Top 10 büyük */}
          <div className="p-4 space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">İlk 10</p>
            {champList.slice(0, 10).map((u: any, i: number) => (
              <div key={i} className="flex items-center gap-3 py-1.5 px-2 rounded-xl hover:bg-slate-50 transition-colors group">
                <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0",
                  i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-white" : i === 2 ? "bg-orange-300 text-white" : "bg-slate-100 text-slate-500")}>
                  {i + 1}
                </span>
                <span className="text-xs font-semibold text-slate-700 truncate flex-1 group-hover:text-indigo-600">{u.urun_adi}</span>
                <span className="text-xs font-bold text-indigo-600 shrink-0">
                  {champTab === 'kutu' ? `${u.satis_adedi} kutu` : `%${getCiroPct(u)}`}
                </span>
              </div>
            ))}
          </div>
          {/* Sağ: 11-250 kompakt liste */}
          <div className="p-4 overflow-y-auto max-h-80 custom-scrollbar">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">11 – {champList.length}</p>
            <div className="space-y-0.5">
              {champList.slice(10).map((u: any, i: number) => (
                <div key={i} className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <span className="text-[10px] text-slate-400 font-mono w-6 shrink-0">{i + 11}</span>
                  <span className="text-xs text-slate-600 truncate flex-1">{u.urun_adi}</span>
                  <span className="text-[10px] font-semibold text-slate-500 shrink-0">
                    {champTab === 'kutu' ? u.satis_adedi : `%${getCiroPct(u)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. KADEME KÂRLILIK + HAFTALIK TRAFİK ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Kademe Analizi */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <SectionTitle icon={Layers} iconCls="text-teal-500" title="İlaç Fiyat Kademesi Röntgeni" sub="K1/K2/K3 kutu ve ciro dağılımı" />
          {kademeBar.length > 0 ? (
            <div className="mt-4 space-y-4">
              {kademeBar.map((k, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">{k.etiket}</span>
                    <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">%{k.kar} kâr marjı</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 w-8">Kutu</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full transition-all duration-700" style={{ width: `${k.kutu}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 w-8 text-right">%{k.kutu}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 w-8">Ciro</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{ width: `${k.ciro}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 w-8 text-right">%{k.ciro}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-blue-400" /><span className="text-[10px] text-slate-500">Kutu</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-indigo-500" /><span className="text-[10px] text-slate-500">Ciro</span></div>
              </div>
            </div>
          ) : (
            <div className="mt-6 text-center text-sm text-slate-400 py-8">Kademe verisi henüz hesaplanmadı</div>
          )}
        </div>

        {/* Haftalık Trafik */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <SectionTitle icon={Clock} iconCls="text-orange-500" title="Haftalık Trafik Haritası" sub={gunSaat.en_yogun_saat ? `En yoğun saat: ${gunSaat.en_yogun_saat}:00` : 'Gün bazlı reçete yoğunluğu'} />
          <div className="mt-5 space-y-2.5">
            {gunData.map((g, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500 w-8 shrink-0">{g.gun}</span>
                <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden relative">
                  <div
                    className={cn("h-full rounded-lg transition-all duration-700 flex items-center justify-end pr-2",
                      (g.yuzde / maxGun) > 0.85 ? "bg-orange-500" : (g.yuzde / maxGun) > 0.6 ? "bg-amber-400" : "bg-slate-300"
                    )}
                    style={{ width: `${Math.max((g.yuzde / maxGun) * 100, 2)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-600 w-10 text-right shrink-0">%{g.yuzde}</span>
              </div>
            ))}
          </div>
          {enYogunGunler.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1.5">En yoğun günler</p>
              <div className="flex gap-2 flex-wrap">
                {enYogunGunler.slice(0, 3).map(([gun, adet]: [string, number], i: number) => (
                  <span key={i} className="text-[10px] font-bold bg-orange-50 text-orange-700 px-2 py-1 rounded-lg border border-orange-100">
                    {gun} — {adet} işlem
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 5. NAKİT OPTİMİZASYON + MİAD TAKVİMİ ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Nakit Fırsat Tablosu */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <SectionTitle icon={DollarSign} iconCls="text-emerald-500" title="Nakit Dönüşüm Fırsatları" sub="Fazla stokta kilitli değer" />
            {nakitToplamKilitli > 0 && (
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                ₺{(nakitToplamKilitli / 1000).toFixed(1)}K kilitli
              </span>
            )}
          </div>
          {topNakit.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {topNakit.map((n: any, i: number) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 text-xs font-black text-emerald-600">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{n.urun_adi || n.ad}</p>
                    <p className="text-[10px] text-slate-400">{n.fazlalik} kutu fazla · {n.stok_omru} gün ömür</p>
                  </div>
                  <span className="text-xs font-black text-emerald-600 shrink-0">{n.deger}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-slate-400">Nakit optimizasyon fırsatı bulunamadı 🎉</div>
          )}
        </div>

        {/* Miad Riski Takvimi */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <SectionTitle icon={Calendar} iconCls="text-red-500" title="Miad Riski Takvimi" sub={`${totalMiad} ürün risk altında`} />
            {totalMiad > 0 && (
              <span className="text-xs font-black text-red-600 bg-red-50 px-2.5 py-1 rounded-xl border border-red-200">{totalMiad} kalem</span>
            )}
          </div>
          {miadChart.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={miadChart} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="ay" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <RechartsTooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: 11 }} formatter={(v: any) => [v, 'Ürün']} />
                  <Bar dataKey="sayi" name="Miad Riski" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-sm text-slate-400">
              {totalMiad === 0 ? '🎉 Miad riski bulunamadı!' : 'Miad tarihi formatı okunamadı'}
            </div>
          )}
          {miadList.slice(0, 4).length > 0 && (
            <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">En Yakın Miad</p>
              {miadList.slice(0, 4).map((u: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <AlertTriangle size={10} className="text-amber-500 shrink-0" />
                  <span className="text-slate-600 truncate flex-1">{u.ad}</span>
                  <span className="font-bold text-red-500 shrink-0">{parseMiadStr(u.miad)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 6. ATC + EŞDEĞER ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col" style={{ maxHeight: 500 }}>
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <SectionTitle icon={Activity} iconCls="text-red-500" title="Hastalık Grubu (ATC4) Hakimiyeti" sub="En çok kutu satılan ilk 20 tedavi grubu" />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {atcSurum.slice(0, 20).map((item: any, idx: number) => {
              const maxVal = atcSurum[0]?.satis_adedi || 1;
              const pct = (item.satis_adedi / maxVal) * 100;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold px-0.5">
                    <span className="text-slate-700 uppercase tracking-tight truncate pr-2" title={formatAtc4(item.atc4)}>{idx + 1}. {formatAtc4(item.atc4)}</span>
                    <span className="text-slate-400 shrink-0">{item.satis_adedi.toLocaleString('tr-TR')} kutu</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col" style={{ maxHeight: 500 }}>
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <SectionTitle icon={ShieldCheck} iconCls="text-indigo-500" title="Molekül (Eşdeğer) Gücü" sub="Eczaneye en yüksek gücü katan ilk 20 molekül grubu" />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {esdegerEtki.slice(0, 20).map((item: any, idx: number) => {
              const maxVal = esdegerEtki[0]?.ciro_etki || 1;
              const pct = (item.ciro_etki / maxVal) * 100;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold px-0.5">
                    <span className="text-slate-700 uppercase tracking-tight truncate pr-2">{idx + 1}. {item.esdeger_kodu}</span>
                    <span className="text-indigo-500 shrink-0">%{pct.toFixed(0)} güç</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}