# core/duty_predictor.py
import pandas as pd
import math
import numpy as np

def float_to_time(f):
    """Ondalık saati HH:MM formatına çevirir."""
    h = int(f)
    m = int(round((f - h) * 60))
    return f"{h:02d}:{m:02d}"

def time_to_float(t_str):
    """'HH:MM' formatındaki saati ondalık sayıya çevirir."""
    if not t_str or ":" not in str(t_str) or str(t_str).upper() == "KAPALI": 
        return 0.0
    try:
        parts = str(t_str).split(':')
        h = int(parts[0])
        m = int(parts[1])
        return h + m/60.0
    except:
        return 18.5

def analyze_and_log_duties(df, hi_info, ct_info):
    """
    Eczane profilinden gelen mesai saatlerine göre nöbet günlerini tespit eder ve loglar.
    """
    print("\n" + "="*60)
    print("🚀 NÖBET DEDEKTÖRÜ (Sepet & Mesai Duyarlı) ÇALIŞIYOR...")
    print("="*60)
    
    temp_df = df.copy()
    
    # --- TARİH DÜZELTME (FORMAT HATASINI ÖNLER) ---
    temp_df['satis_tarihi'] = pd.to_datetime(temp_df['satis_tarihi'], format='mixed', errors='coerce')
    temp_df = temp_df.dropna(subset=['satis_tarihi'])
    # ----------------------------------------------

    temp_df['saat_ondalik'] = temp_df['satis_tarihi'].dt.hour + temp_df['satis_tarihi'].dt.minute / 60.0
    temp_df['tarih_gun'] = temp_df['satis_tarihi'].dt.date
    
    hi_kapanis = time_to_float(hi_info.get('kapanis', '18:30'))
    ct_kapanis = time_to_float(ct_info.get('kapanis', '13:00'))
    hi_acilis  = time_to_float(hi_info.get('acilis',  '08:30'))

    gunler = sorted(temp_df['tarih_gun'].unique())

    # --- OPTİMİZASYON: Tüm veriyi günlük olarak önceden grupla ---
    # Her güne tek seferde erişmek için dict of DataFrames
    gun_gruplari = {gun: grp for gun, grp in temp_df.groupby('tarih_gun')}
    # -------------------------------------------------------------

    found_any = False
    duty_dates_found = []

    for i, gun in enumerate(gunler):
        haftanin_gunu = gun.weekday()
        is_sunday = (haftanin_gunu == 6)
        kapanis = 0.0 if is_sunday else (ct_kapanis if haftanin_gunu == 5 else hi_kapanis)

        gun_df = gun_gruplari.get(gun)
        if gun_df is None:
            continue

        aksam_trafiği = gun_df[gun_df['saat_ondalik'] >= kapanis]
        if aksam_trafiği.empty:
            continue

        # Sepet bazlı reçete/nakit sayımı — groupby tek seferde
        aksam_sepetleri = aksam_trafiği.groupby('satis_tarihi')['satis_tipi'].first()
        a_recete = aksam_sepetleri.str.contains('recete', case=False, na=False).sum()
        a_nakit  = (aksam_sepetleri == 'nakit_satis').sum()

        if (is_sunday and a_recete > 5) or (a_recete >= 10):
            found_any = True
            is_full_night = False

            if i + 1 < len(gunler):
                ertesi_gun = gunler[i + 1]
                ertesi_df  = gun_gruplari.get(ertesi_gun)
                if ertesi_df is not None:
                    gece_trafiği = ertesi_df[ertesi_df['saat_ondalik'] < hi_acilis]
                    if gece_trafiği['satis_tarihi'].nunique() >= 2:
                        is_full_night = True

            duty_dates_found.append(gun)
            tarih_str = gun.strftime('%d.%m.%Y %A')

            if is_sunday:
                status = "🏥 [PAZAR NÖBETİ]"
                zaman  = "GÜN BOYU"
            else:
                status = "🌋 [24H KESİNTİSİZ NÖBET]" if is_full_night else "🌙 [GECE NÖBETİ]"
                zaman  = f"Kapanıştan ({float_to_time(kapanis)}) Sonra"

            print(f"{status} -> {tarih_str}")
            print(f"   Detay: {zaman} {a_recete} Reçete, {a_nakit} Elden İşlem.")
            if is_full_night:
                print(f"   Bilgi: Trafik sabah {float_to_time(hi_acilis)}'a kadar sürdü.")
            print("-" * 50)

    if not found_any:
        print("❌ Verilerde nöbet trafiği tespit edilemedi.")
    print("="*60 + "\n")
    return duty_dates_found


def generate_duty_projections(df_raw, df_profiled, hi_info, ct_info, found_duty_dates):
    if not found_duty_dates:
        return []

    num_duties_total = len(found_duty_dates)
    recent_duties = found_duty_dates[-2:]

    # --- 1. TÜM ZAMANLARIN VERİSİ ---
    temp_raw = df_raw.copy()

    # --- TARİH DÜZELTME ---
    temp_raw['satis_tarihi'] = pd.to_datetime(temp_raw['satis_tarihi'], format='mixed', errors='coerce')
    temp_raw = temp_raw.dropna(subset=['satis_tarihi'])
    # ----------------------

    temp_raw['tarih_gun']    = temp_raw['satis_tarihi'].dt.date
    temp_raw['saat_ondalik'] = temp_raw['satis_tarihi'].dt.hour + temp_raw['satis_tarihi'].dt.minute / 60.0

    hi_kapanis = time_to_float(hi_info.get('kapanis', '18:30'))
    ct_kapanis = time_to_float(ct_info.get('kapanis', '13:00'))
    hi_acilis  = time_to_float(hi_info.get('acilis',  '08:30'))

    # --- OPTİMİZASYON: get_duty_sales vektörel ---
    def get_duty_sales(target_dates, source_df):
        if not target_dates:
            return pd.DataFrame()

        frames = []
        for d in target_dates:
            wd      = d.weekday()
            start_h = 0.0 if wd == 6 else (ct_kapanis if wd == 5 else hi_kapanis)
            next_d  = d + pd.Timedelta(days=1)

            day_mask   = (source_df['tarih_gun'] == d)    & (source_df['saat_ondalik'] >= start_h)
            night_mask = (source_df['tarih_gun'] == next_d) & (source_df['saat_ondalik'] < hi_acilis)

            day_part            = source_df[day_mask].copy()
            day_part['nobet_id']  = d
            night_part            = source_df[night_mask].copy()
            night_part['nobet_id'] = d

            frames.extend([day_part, night_part])

        return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()

    all_time_sales = get_duty_sales(found_duty_dates, temp_raw)
    recent_sales   = get_duty_sales(recent_duties,    temp_raw)

    if all_time_sales.empty:
        return []

    # --- İstatistikler (groupby — zaten vektörel) ---
    barkod_all_freq = all_time_sales.groupby('barkod')['nobet_id'].nunique()

    recent_stats = recent_sales.groupby('barkod').agg(
        sepet_sayisi=('satis_tarihi', 'nunique'),
        toplam_adet =('satis_adedi',  'sum')
    ).reset_index()

    # --- OPTİMİZASYON: DEMİRBAŞ — iterrows yerine merge + vektörel hesap ---
    demirbas_df = barkod_all_freq[barkod_all_freq >= (0.70 * num_duties_total)].reset_index()
    demirbas_df.columns = ['barkod', 'nobet_sayisi']
    demirbas_df['bulunma_orani'] = demirbas_df['nobet_sayisi'] / num_duties_total

    # Tüm nöbet satışlarından sepet ve adet topla
    all_agg = all_time_sales.groupby('barkod').agg(
        sep=('satis_tarihi', 'nunique'),
        adt=('satis_adedi',  'sum')
    ).reset_index()

    demirbas_df = demirbas_df.merge(all_agg, on='barkod', how='left')
    demirbas_df['norm']  = np.ceil(demirbas_df['adt'] / demirbas_df['sep'].clip(lower=1)).astype(int)
    demirbas_df['hedef'] = np.maximum(
        np.ceil(demirbas_df['sep'] / num_duties_total) * demirbas_df['norm'],
        demirbas_df['norm']
    ).astype(int)

    # Profiled ile join — stok bilgisi
    profil_slim = df_profiled[['barkod', 'stok', 'urun_adi', 'hibrit_hiz']].copy()
    profil_slim['barkod'] = profil_slim['barkod'].astype(str).str.strip()
    demirbas_df['barkod'] = demirbas_df['barkod'].astype(str).str.strip()

    demirbas_df = demirbas_df.merge(profil_slim, on='barkod', how='left')
    demirbas_df['stok'] = demirbas_df['stok'].fillna(0)
    demirbas_df = demirbas_df[demirbas_df['stok'] < demirbas_df['hedef']]

    demirbas_listesi = [
        {
            'ad':      row['urun_adi'] if pd.notna(row['urun_adi']) else 'Bilinmeyen',
            'oran':    row['bulunma_orani'] * 100,
            'ihtiyac': int(row['hedef'] - row['stok']),
            'mevcut':  int(row['stok']),
            'hedef':   int(row['hedef']),
            'barkod':  row['barkod'],
        }
        for _, row in demirbas_df.iterrows()
    ]
    processed_barkods = set(demirbas_df['barkod'].tolist())

    # --- OPTİMİZASYON: SON 2 NÖBET — iterrows yerine merge + vektörel hesap ---
    recent_stats['barkod'] = recent_stats['barkod'].astype(str).str.strip()
    recent_stats = recent_stats[~recent_stats['barkod'].isin(processed_barkods)]

    recent_stats = recent_stats.merge(profil_slim, on='barkod', how='left')
    recent_stats['stok']       = recent_stats['stok'].fillna(0)
    recent_stats['hibrit_hiz'] = recent_stats['hibrit_hiz'].fillna(0.01).clip(lower=0.01)

    n_recent = len(recent_duties) if recent_duties else 1
    recent_stats['adet_per_recete'] = np.ceil(
        recent_stats['toplam_adet'] / recent_stats['sepet_sayisi'].clip(lower=1)
    ).astype(int).clip(lower=1)
    recent_stats['beklenen_sepet'] = recent_stats['sepet_sayisi'] / n_recent
    recent_stats['hedef_stok']     = np.maximum(
        np.ceil(recent_stats['beklenen_sepet']) * recent_stats['adet_per_recete'],
        recent_stats['adet_per_recete']
    ).astype(int)

    recent_stats = recent_stats[recent_stats['stok'] < recent_stats['hedef_stok']]
    recent_stats['ihtiyac']       = (recent_stats['hedef_stok'] - recent_stats['stok']).astype(int)
    recent_stats['katsayi_degeri'] = recent_stats['beklenen_sepet'] / (recent_stats['hibrit_hiz'] + 0.0001)
    recent_stats['oncelik']        = recent_stats['ihtiyac'] * recent_stats['katsayi_degeri']

    projections = recent_stats.apply(lambda r: {
        'barkod':  r['barkod'],
        'ad':      r['urun_adi'] if pd.notna(r['urun_adi']) else 'Bilinmeyen',
        'hedef':   int(r['hedef_stok']),
        'stok':    int(r['stok']),
        'ihtiyac': int(r['ihtiyac']),
        'katsayi': r['katsayi_degeri'],
        'frekans': r['beklenen_sepet'],
        'oncelik': r['oncelik'],
    }, axis=1).tolist()

    # --- LOGLAR (değişmedi) ---
    print(f"\n📊 NÖBET ANALİZ ÖZETİ")
    print(f"   • Tüm Zamanlar (Demirbaş): {num_duties_total} Nöbet")
    if recent_duties:
        print(f"   • Güncel Analiz (Son 2): {recent_duties[0].strftime('%d.%m')} ve {recent_duties[1].strftime('%d.%m')}")

    if demirbas_listesi:
        print("\n" + "╔" + "═"*68 + "╗")
        print("║" + f"🚨 %70+ FREKANSLI NÖBET DEMİRBAŞLARI (TARİHİ) 🚨".center(68) + "║")
        print("╠" + "═"*68 + "╣")
        print("║ " + f"{'ÜRÜN ADI':33} | {'FREQ':6} | {'STOK/HEDEF':12} | {'EKSİK':6}" + " ║")
        print("╟" + "─"*68 + "╢")
        for d in sorted(demirbas_listesi, key=lambda x: x['oran'], reverse=True):
            durum = f"{d['mevcut']}/{d['hedef']}"
            print(f"║ ⭐ {d['ad'][:30]:30} | %{d['oran']:-4.0f} | {durum:>10} | +{d['ihtiyac']:-2d}  ║")
        print("╚" + "═"*68 + "╝")

    print("\n📦 GÜNCEL NÖBET İHTİYAÇLARI (Son 2 Nöbet Bazlı)")
    print("-" * 70)
    projections = sorted(projections, key=lambda x: x['oncelik'], reverse=True)
    for p in projections[:25]:
        print(f"📍 {p['ad'][:30]:30} | Hedef: {p['hedef']} | Stok: {p['stok']} | 🚀 EKSİK: {p['ihtiyac']}")

    # UI Dönüşü: Demirbaşları da ekle
    for d in demirbas_listesi:
        projections.append({
            'ad':      d['ad'],
            'hedef':   d['hedef'],
            'stok':    d['mevcut'],
            'ihtiyac': d['ihtiyac'],
            'katsayi': 999,
            'frekans': d['oran'] / 100,
        })

    return projections