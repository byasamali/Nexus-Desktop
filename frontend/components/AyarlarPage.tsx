import React from 'react';
import { Settings, Truck, Plus, User, Trash2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import Depolar, { DepoModal, loadDepolar, saveDepolar, saveDeletedId } from '@/components/Depolar';
import type { Depo } from '@/components/Depolar';

export default function AyarlarPage({ supabase }: { supabase: any }) {
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

  const [localSettings, setLocalSettings] = React.useState({
    eczane_adi: "",
    gln: "",
    software: "Botanik",
    server_instance: "",
    database: "",
    auto_scan_9am: false,
    scan_before_simulation: false,
    auto_scan_24h: false,
    default_ai_order_mode: false
  });
  const [savingSettings, setSavingSettings] = React.useState(false);
  const [depolar, setDepolar] = React.useState<Depo[]>([]);
  const [editingDepo, setEditingDepo] = React.useState<Depo | undefined>(undefined);
  const [showModal, setShowModal] = React.useState(false);

  React.useEffect(() => {
    setDepolar(loadDepolar());
  }, []);

  const handleDeleteDepo = (id: string) => {
    saveDeletedId(id);
    const updated = depolar.filter(d => d.id !== id);
    setDepolar(updated);
    saveDepolar(updated);
  };

  React.useEffect(() => {
    if (isWails) {
      const loadSettings = async () => {
        try {
          const content = await (window as any).go.main.App.LoadSettings();
          if (content && content !== '{}') {
            const parsed = JSON.parse(content);
            setLocalSettings({
              eczane_adi: parsed.eczane_adi || "",
              gln: parsed.gln || "",
              software: parsed.software || "Botanik",
              server_instance: parsed.server_instance || "",
              database: parsed.database || "",
              auto_scan_9am: !!parsed.auto_scan_9am,
              scan_before_simulation: !!parsed.scan_before_simulation,
              auto_scan_24h: !!parsed.auto_scan_24h,
              default_ai_order_mode: !!parsed.default_ai_order_mode
            });
          }
        } catch (err) {
          console.error("Error loading settings:", err);
        }
      };
      loadSettings();
    }
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await (window as any).go.main.App.SaveSettings(JSON.stringify(localSettings));
      alert("Ayarlar başarıyla kaydedildi.");
    } catch (err) {
      console.error("Error saving settings:", err);
      alert("Hata: Ayarlar kaydedilemedi.");
    }
    setSavingSettings(false);
  };

  if (isWails) {
    return (
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Sol Kolon: Yerel Uygulama Ayarları */}
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-slate-900 text-white rounded-2xl">
              <Settings size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Yerel Uygulama Ayarları</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Yerel veritabanı bağlantısı ve eczane bilgilerini düzenleyin.</p>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-wide">Eczane Adı</label>
              <input
                type="text"
                value={localSettings.eczane_adi}
                onChange={e => setLocalSettings(prev => ({ ...prev, eczane_adi: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-100 focus:border-teal-400 outline-none text-sm transition-all font-medium text-slate-800"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-wide">GLN Numarası</label>
              <input
                type="text"
                maxLength={13}
                value={localSettings.gln}
                onChange={e => setLocalSettings(prev => ({ ...prev, gln: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-100 focus:border-teal-400 outline-none text-sm transition-all font-mono text-slate-800"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-wide">Eczane Otomasyon Programı</label>
              <select
                value={localSettings.software}
                onChange={e => setLocalSettings(prev => ({ ...prev, software: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-100 focus:border-teal-400 outline-none text-sm transition-all font-medium text-slate-800 disabled:opacity-85"
                disabled
              >
                <option value="Botanik">Botanik</option>
              </select>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-4">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Veritabanı Bağlantı Ayarları</h4>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                SQL Server bağlantısı için Windows Integrated Security (Trusted Connection) kullanılır. IP veya sunucu adını girin.
              </p>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-wide">SQL Server Instance</label>
                <input
                  type="text"
                  placeholder="Örn: .\BOTANIKSQL veya localhost"
                  value={localSettings.server_instance}
                  onChange={e => setLocalSettings(prev => ({ ...prev, server_instance: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-100 focus:border-teal-400 outline-none text-sm transition-all font-mono text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-wide">Database Adı</label>
                <input
                  type="text"
                  placeholder="Örn: eczane veya FARMAKOM"
                  value={localSettings.database}
                  onChange={e => setLocalSettings(prev => ({ ...prev, database: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-100 focus:border-teal-400 outline-none text-sm transition-all font-mono text-slate-800"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">AI ve Otomatik Tarama Ayarları</h4>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                Uygulama arka plan görevleri ve simülasyon davranışlarını özelleştirin.
              </p>

              <div className="space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={localSettings.auto_scan_9am}
                    onChange={e => setLocalSettings(prev => ({ ...prev, auto_scan_9am: e.target.checked }))}
                    className="w-4 h-4 rounded border-stone-300 text-teal-600 focus:ring-teal-500/20"
                  />
                  <span>Her gün saat 09:00'da komple tarama yap</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={localSettings.scan_before_simulation}
                    onChange={e => setLocalSettings(prev => ({ ...prev, scan_before_simulation: e.target.checked }))}
                    className="w-4 h-4 rounded border-stone-300 text-teal-600 focus:ring-teal-500/20"
                  />
                  <span>Her simülasyon öncesi değişen satırları tara</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={localSettings.auto_scan_24h}
                    onChange={e => setLocalSettings(prev => ({ ...prev, auto_scan_24h: e.target.checked }))}
                    className="w-4 h-4 rounded border-stone-300 text-teal-600 focus:ring-teal-500/20"
                  />
                  <span>Son komple tarama üzerinden 24 saat geçmişse otomatik tarama yap</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={localSettings.default_ai_order_mode}
                    onChange={e => setLocalSettings(prev => ({ ...prev, default_ai_order_mode: e.target.checked }))}
                    className="w-4 h-4 rounded border-stone-300 text-teal-600 focus:ring-teal-500/20"
                  />
                  <span>Program ilk açıldığında AI Sipariş Modunu aktif et</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              {savingSettings ? "Kaydediliyor..." : "Ayarları Kaydet"}
            </button>
          </form>
        </div>

        {/* Sağ Kolon: Depo Entegrasyon Ayarları */}
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md">
                <Truck size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Depo Entegrasyonları</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Sipariş sorgulama ve gönderme yapılacak depoları yönetin.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setEditingDepo(undefined); setShowModal(true); }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md transition-all shrink-0"
            >
              <Plus size={14} /> Yeni Ekle
            </button>
          </div>

          {/* Depolar Listesi */}
          <div className="space-y-3">
            {depolar.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <p className="text-xs font-bold text-slate-400">Kayıtlı depo bulunmuyor.</p>
              </div>
            ) : (
              depolar.map(depo => (
                <div
                  key={depo.id}
                  className={cn(
                    "flex items-center justify-between p-4 border border-slate-100 rounded-2xl bg-slate-50/30 hover:bg-slate-50/80 transition-all",
                    depo.enabled === false && "opacity-60"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-[12px] shadow-sm shrink-0"
                      style={{ backgroundColor: depo.enabled === false ? '#cbd5e1' : depo.renk }}
                    >
                      {depo.ad.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-800 truncate">{depo.ad}</span>
                        {depo.enabled !== false ? (
                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-md border border-emerald-250">Aktif</span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black rounded-md border border-slate-200">Pasif</span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium font-mono max-w-[240px] truncate block mt-0.5">{depo.url}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Aktiflik Switch'i */}
                    <label className="relative inline-flex items-center cursor-pointer select-none mr-1.5">
                      <input
                        type="checkbox"
                        checked={depo.enabled !== false}
                        onChange={(e) => {
                          const updated = depolar.map(d => d.id === depo.id ? { ...d, enabled: e.target.checked } : d);
                          setDepolar(updated);
                          saveDepolar(updated);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>

                    <button
                      type="button"
                      onClick={() => { setEditingDepo(depo); setShowModal(true); }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      title="Düzenle"
                    >
                      <User size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`${depo.ad} deposunu silmek istediğinize emin misiniz?`)) {
                          handleDeleteDepo(depo.id);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Sil"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {showModal && (
          <DepoModal
            depo={editingDepo}
            onClose={() => { setShowModal(false); setEditingDepo(undefined); }}
            onSave={(updatedDepo) => {
              let updated: Depo[];
              const exists = depolar.some(d => d.id === updatedDepo.id);
              if (exists) {
                updated = depolar.map(d => d.id === updatedDepo.id ? updatedDepo : d);
              } else {
                updated = [...depolar, updatedDepo];
              }
              setDepolar(updated);
              saveDepolar(updated);
              setShowModal(false);
              setEditingDepo(undefined);
            }}
          />
        )}
      </div>
    );
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Sol Kolon */}
      <div className="space-y-4">
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
        {!isWails && (
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
        )}
      </div>

      {/* Sağ Kolon */}
      {/* Depo Entegrasyon Ayarları */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm">
              <Truck size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 tracking-tight">Depo Entegrasyonları</h3>
              <p className="text-[10px] text-slate-400 font-medium">Sipariş sorgulama ve gönderme yapılacak depoları yönetin.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setEditingDepo(undefined); setShowModal(true); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[10px] shadow-sm transition-all"
          >
            <Plus size={12} /> Yeni Ekle
          </button>
        </div>

        {/* Depolar Listesi */}
        <div className="space-y-2">
          {depolar.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-stone-200 rounded-xl bg-stone-50/50">
              <p className="text-[10px] font-bold text-stone-400">Kayıtlı depo bulunmuyor.</p>
            </div>
          ) : (
            depolar.map(depo => (
              <div
                key={depo.id}
                className={cn(
                  "flex items-center justify-between p-3 border border-stone-100 rounded-xl bg-stone-50/30 hover:bg-stone-50 transition-all",
                  depo.enabled === false && "opacity-60"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-[10px] shadow-sm shrink-0"
                    style={{ backgroundColor: depo.enabled === false ? '#cbd5e1' : depo.renk }}
                  >
                    {depo.ad.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-800 truncate">{depo.ad}</span>
                      {depo.enabled !== false ? (
                        <span className="px-1 py-0.2 bg-emerald-50 text-emerald-600 text-[8px] font-black rounded border border-emerald-250">Aktif</span>
                      ) : (
                        <span className="px-1 py-0.2 bg-slate-100 text-slate-500 text-[8px] font-black rounded border border-slate-200">Pasif</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium font-mono max-w-[200px] truncate block mt-0.5">{depo.url}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Aktiflik Switch'i */}
                  <label className="relative inline-flex items-center cursor-pointer select-none mr-1">
                    <input
                      type="checkbox"
                      checked={depo.enabled !== false}
                      onChange={(e) => {
                        const updated = depolar.map(d => d.id === depo.id ? { ...d, enabled: e.target.checked } : d);
                        setDepolar(updated);
                        saveDepolar(updated);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-250 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>

                  <button
                    type="button"
                    onClick={() => { setEditingDepo(depo); setShowModal(true); }}
                    className="p-1.5 text-stone-400 hover:text-blue-600 rounded-lg transition-all"
                    title="Düzenle"
                  >
                    <User size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`${depo.ad} deposunu silmek istediğinize emin misiniz?`)) {
                        handleDeleteDepo(depo.id);
                      }
                    }}
                    className="p-1.5 text-stone-450 hover:text-red-500 rounded-lg transition-all"
                    title="Sil"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <DepoModal
          depo={editingDepo}
          onClose={() => { setShowModal(false); setEditingDepo(undefined); }}
          onSave={(updatedDepo) => {
            let updated: Depo[];
            const exists = depolar.some(d => d.id === updatedDepo.id);
            if (exists) {
              updated = depolar.map(d => d.id === updatedDepo.id ? updatedDepo : d);
            } else {
              updated = [...depolar, updatedDepo];
            }
            setDepolar(updated);
            saveDepolar(updated);
            setShowModal(false);
            setEditingDepo(undefined);
          }}
        />
      )}
    </div>
  );
}
