import React from 'react';
import { Settings, Brain, RefreshCw } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// ─── WAILS SETUP VIEW ───
export function WailsSetupView({ onSetupComplete }: { onSetupComplete: (data: any) => void }) {
  const [gln, setGln] = React.useState('');
  const [eczaneAdi, setEczaneAdi] = React.useState('');
  const [eczaciAdi, setEczaciAdi] = React.useState('');
  const [telefon, setTelefon] = React.useState('');
  const [software, setSoftware] = React.useState('Botanik');
  const [serverInstance, setServerInstance] = React.useState('.\\BOTANIKSQL');
  const [databaseName, setDatabaseName] = React.useState('eczane');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gln || !eczaneAdi || !eczaciAdi || !telefon) {
      setError("Lütfen tüm alanları doldurun.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 1. Get or generate persistent client UUID
      let clientUuid = '';
      try {
        const settingsStr = await (window as any).go.main.App.LoadSettings();
        if (settingsStr && settingsStr !== '{}') {
          const parsed = JSON.parse(settingsStr);
          clientUuid = parsed.uuid || '';
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }

      if (!clientUuid) {
        // Fallback for crypto.randomUUID which is undefined in non-secure contexts (app:// protocol)
        clientUuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
              const r = Math.random() * 16 | 0,
                    v = c === 'x' ? r : (r & 0x3 | 0x8);
              return v.toString(16);
            });
      }

      // 2. Fetch IP address
      let ipAdresi = '';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json').then(r => r.json());
        ipAdresi = ipRes.ip;
      } catch (ipErr) {
        console.error("IP check failed:", ipErr);
      }

      // 3. Save settings locally with uuid
      await (window as any).go.main.App.SaveSettings(JSON.stringify({
        software,
        gln,
        eczane_adi: eczaneAdi,
        eczaci_adi: eczaciAdi,
        telefon: telefon,
        server_instance: serverInstance,
        database: databaseName,
        uuid: clientUuid
      }));

      // 4. Save/Upsert to Supabase
      try {
        const { error: dbError } = await supabase.from('nexus_lisanslari').upsert({
          id: clientUuid,
          eczane_adi: eczaneAdi,
          eczaci_adi: eczaciAdi,
          telefon: telefon,
          ecza_programi: software,
          ip_adresi: ipAdresi,
          aktif: true,
        });
        if (dbError) {
          console.error("Supabase license save error:", dbError.message);
        }
      } catch (sbErr) {
        console.error("Supabase connection failed:", sbErr);
      }

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
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm font-semibold text-stone-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all disabled:opacity-85"
              disabled
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

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider">Eczacı Adı Soyadı</label>
            <input
              type="text"
              placeholder="Örn: Ecz. Ahmet Yılmaz"
              value={eczaciAdi}
              onChange={(e) => setEczaciAdi(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold text-stone-800 placeholder-stone-300 focus:outline-none focus:border-teal-500 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider">Telefon Numarası</label>
            <input
              type="text"
              placeholder="Örn: 05551234567"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold text-stone-800 placeholder-stone-300 focus:outline-none focus:border-teal-500 transition-all"
            />
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider">SQL Server Instance</label>
            <input
              type="text"
              placeholder="Örn: .\BOTANIKSQL"
              value={serverInstance}
              onChange={(e) => setServerInstance(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold text-stone-800 placeholder-stone-300 focus:outline-none focus:border-teal-500 transition-all font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider">Database Adı</label>
            <input
              type="text"
              placeholder="Örn: eczane"
              value={databaseName}
              onChange={(e) => setDatabaseName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold text-stone-800 placeholder-stone-300 focus:outline-none focus:border-teal-500 transition-all font-mono"
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
export function WailsSyncView({ settings, onSyncComplete }: { settings: any; onSyncComplete: (data: any) => void }) {
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
