# core/pharmacy_profiler.py

import pandas as pd
import numpy as np
from loguru import logger

def analyze_pharmacy_hours(df_raw):
    # Veri Hazırlığı
    temp_df = df_raw.copy()
    
    # --- 1. TARİH VE ZAMAN ZIRHLAMASI ---
    temp_df['satis_tarihi'] = pd.to_datetime(temp_df['satis_tarihi'], format='mixed', errors='coerce')
    
    # Hatalı tarihleri (NaT) temizle ki hesaplamayı bozmasın
    temp_df = temp_df.dropna(subset=['satis_tarihi'])
    
    # --- 2. CİRO HESAPLAMASI (YENİ SİSTEM: net_tutar) ---
    # Eski sistemde adet * fiyat yapıyorduk. Artık SQL bize indirimler düşülmüş
    # net_tutar'ı veriyor. Bu yüzden satir_ciro direkt net_tutar'dır.
    if 'net_tutar' not in temp_df.columns:
        temp_df['net_tutar'] = 0.0
        
    temp_df['net_tutar'] = pd.to_numeric(temp_df['net_tutar'], errors='coerce').fillna(0)
    temp_df['satis_adedi'] = pd.to_numeric(temp_df['satis_adedi'], errors='coerce').fillna(0)
    
    temp_df['satir_ciro'] = temp_df['net_tutar']

    # --- 3. SAAT VE GÜN AYARLARI ---
    temp_df['saat_dakika'] = temp_df['satis_tarihi'].dt.hour + temp_df['satis_tarihi'].dt.minute / 60.0
    temp_df['tarih'] = temp_df['satis_tarihi'].dt.date
    temp_df['haftanin_gunu'] = temp_df['satis_tarihi'].dt.weekday

    # --- 4. TATİL VE NÖBET TEMİZLİĞİ ---
    islem_serisi = temp_df.groupby('tarih').size()
    
    # Verinin başladığı günden en son güne kadar takvim oluştur
    if islem_serisi.empty:
        logger.warning("İşlem serisi boş, analiz yapılamıyor.")
        return {}, {}, {}
        
    full_range = pd.date_range(start=islem_serisi.index.min(), end=temp_df['satis_tarihi'].max().date())
    
    tatil_set = set()
    for d in full_range:
        d_date = d.date()
        # Eğer o gün 3'ten az işlem yapıldıysa eczane kapalı kabul et
        if d_date not in islem_serisi.index or islem_serisi[d_date] < 3:
            tatil_set.add(d_date)
    
    gece_islem = temp_df[temp_df['saat_dakika'] >= 19.5].groupby('tarih').size()
    nobet_tarihleri = gece_islem[gece_islem > 3].index
    
    # Sadece AÇIK ve NÖBETSİZ günleri analiz ediyoruz
    df_normal = temp_df[~temp_df['tarih'].isin(nobet_tarihleri)]
    df_normal = df_normal[df_normal['tarih'].apply(lambda x: x not in tatil_set)]

    # --- 5. DETAYLI REÇETE (SEPET) ANALİZİ ---
    # Her unique zaman damgası bir 'Sepet'tir (Hasta İşlemi)
    sepetler = df_normal.groupby('satis_tarihi').agg({
        'satis_tipi': 'first',         # Dinamik satış tipi (sgk_recete, nakit_satis vb.)
        'satis_adedi': 'sum',          # Reçetedeki toplam kutu
        'satir_ciro': 'sum',           # Reçetenin toplam net tutarı
        'barkod': 'count',             # Kalem sayısı (Çeşit)
        'saat_dakika': 'first'         # İşlem saati
    }).rename(columns={'barkod': 'kalem_sayisi'})

    # İstatistikler
    toplam_islem = len(sepetler)
    if toplam_islem == 0:
        logger.warning("Yeterli normal işlem verisi bulunamadı.")
        return {}, {}, {}

    # YENİ: Dinamik Satış Tipi Dağılımı (Go'dan gelen 5 farklı tür için)
    tip_dagilimi = sepetler.groupby('satis_tipi').agg(
        adet=('satis_tipi', 'count'),
        ort_kutu=('satis_adedi', 'mean')
    ).reset_index()

    # Loglama Formatı
    logger.info("📊 DETAYLI REÇETE VE HASTA TRAFİĞİ ANALİZİ")
    logger.info(f"    Toplam İşlem (Hasta Sayısı): {toplam_islem}")

    # --- DETAYLI LOG BLOĞU ---
    log_msg = "\n" + "🧾" + "—"*40 + "🧾\n"
    log_msg += f"   ECZANE İŞLEM (SEPET) KARAKTERİSTİĞİ\n"
    log_msg += "—"*44 + "\n"
    
    # 1. ORTALAMALAR
    avg_kutu = sepetler['satis_adedi'].mean()
    avg_tutar = sepetler['satir_ciro'].mean()
    avg_kalem = sepetler['kalem_sayisi'].mean()
    
    log_msg += f"📦 ORTALAMA SEPET BÜYÜKLÜĞÜ:\n"
    log_msg += f"   • Hasta Başı Kutu  : {avg_kutu:.2f} Adet\n"
    log_msg += f"   • Hasta Başı Ciro  : {avg_tutar:.2f} TL\n"
    log_msg += f"   • Hasta Başı Çeşit : {avg_kalem:.2f} Kalem İlaç\n\n"

    # 2. TÜR DAĞILIMI (Yeni Dinamik Yapı)
    log_msg += f"💳 İŞLEM TİPİ DAĞILIMI:\n"
    for _, row in tip_dagilimi.iterrows():
        tip_adi = str(row['satis_tipi']).upper()
        oran = (row['adet'] / toplam_islem) * 100
        log_msg += f"   • {tip_adi:<18} : %{oran:04.1f}  (Ort. {row['ort_kutu']:.1f} kutu)\n"

    # 3. POLYPHARMACY (Çoklu İlaç Kullanımı)
    tek_kalem = len(sepetler[sepetler['kalem_sayisi'] == 1])
    coklu_kalem = len(sepetler[sepetler['kalem_sayisi'] >= 4]) # 4 ve üzeri ilaç
    
    log_msg += f"💊 REÇETE ZENGİNLİĞİ:\n"
    log_msg += f"   • Tek Kalemlik Satışlar : %{(tek_kalem/toplam_islem*100):.1f} (Genelde ağrı kesici/akut)\n"
    log_msg += f"   • Kombo Reçeteler (4+)  : %{(coklu_kalem/toplam_islem*100):.1f} (Kronik/Yaşlı hasta)\n"
    
    # 4. EN DEĞERLİ SAAT DİLİMİ
    sepetler['saat_tam'] = sepetler['saat_dakika'].astype(int)
    yogun_saat_serisi = sepetler['saat_tam'].mode()
    
    # Mode boş dönerse çökmesin diye güvenlik (Zırh)
    yogun_saat = yogun_saat_serisi[0] if not yogun_saat_serisi.empty else 0
    
    # ✨ Saat bazında işlem dağılımı (yüzdelik)
    saat_dagilimi = sepetler['saat_tam'].value_counts().sort_index()
    saat_yuzdeleri = (saat_dagilimi / len(sepetler) * 100).round(1).to_dict()
    
    # En yoğun saatler (Top 3)
    en_yogun_saatler_series = sepetler['saat_tam'].value_counts().head(3)
    en_yogun_saatler = [(int(saat), int(adet)) for saat, adet in en_yogun_saatler_series.items()]
    
    log_msg += f"\n⏰ EN YOĞUN HASTA SAATİ: {yogun_saat}:00 - {yogun_saat+1}:00\n"
    logger.success(log_msg)
    
    def detect_smart_hours(data, label):
        # Eğer o günler için hiç veri yoksa kapalı dön
        if data.empty: 
            return {'label': label, 'acilis': "09:00", 'kapanis': "KAPALI", 'gun_sayisi': 0}
            
        daily_bounds = data.groupby('tarih')['saat_dakika'].agg(['min', 'max'])
        toplam_gun = len(daily_bounds)
        
        # Pazar günü işlem sayısı 15'ten azsa muhtemelen kapalıdır/nöbet tutmuştur
        if toplam_gun < 15 and label == "Pazar": 
            return {'label': label, 'acilis': "09:00", 'kapanis': "KAPALI", 'gun_sayisi': toplam_gun}
        
        acilis = "09:00" 
        if label == "Hafta İçi":
            if len(daily_bounds[daily_bounds['min'] <= 8.67]) >= 20: acilis = "08:30"
            elif len(daily_bounds[daily_bounds['min'] <= 8.17]) >= 20: acilis = "08:00"
        if label == "Cumartesi":
            erken = len(daily_bounds[daily_bounds['min'] <= 9.42])
            acilis = "09:00" if erken >= (toplam_gun * 0.25) else "09:30"

        kapanis_vakti = daily_bounds['max'].median()
        
        # Eğer median NaN dönerse standart bir kapanış verelim (Zırh)
        if pd.isna(kapanis_vakti):
            kapanis_vakti = 18.0
            
        if label == "Hafta İçi": 
            kapanis = "18:30" if kapanis_vakti > 18.2 else "18:00"
        elif label == "Cumartesi": 
            kapanis = "13:30" if kapanis_vakti > 13.2 else "13:00"
        else: 
            kapanis = "KAPALI"

        return {'label': label, 'acilis': acilis, 'kapanis': kapanis, 'gun_sayisi': toplam_gun}
    

    hi = detect_smart_hours(df_normal[df_normal['haftanin_gunu'] < 5], "Hafta İçi")
    ct = detect_smart_hours(df_normal[df_normal['haftanin_gunu'] == 5], "Cumartesi")
    pz = detect_smart_hours(df_normal[df_normal['haftanin_gunu'] == 6], "Pazar")


    # ✨ Gün bazında işlem dağılımı (yüzdelik)
    gun_dagilimi = df_normal['haftanin_gunu'].value_counts().sort_index()
    gun_isimleri = {0: 'Pazartesi', 1: 'Salı', 2: 'Çarşamba', 3: 'Perşembe', 4: 'Cuma', 5: 'Cumartesi', 6: 'Pazar'}
    gun_yuzdeleri = {gun_isimleri.get(gun, 'Bilinmeyen'): round((adet / len(df_normal) * 100), 1) 
                     for gun, adet in gun_dagilimi.items()}
    
    # En yoğun günler (Top 3)
    en_yogun_gunler = [(gun_isimleri.get(gun, 'Bilinmeyen'), adet) 
                       for gun, adet in gun_dagilimi.nlargest(3).items()]
    
    return hi, ct, pz, tip_dagilimi, {
        'en_yogun_saat': int(yogun_saat),
        'saat_yuzdeleri': {str(k): float(v) for k, v in saat_yuzdeleri.items()},
        'en_yogun_saatler': en_yogun_saatler,
        'gun_yuzdeleri': {str(k): float(v) for k, v in gun_yuzdeleri.items()},
        'en_yogun_gunler': [(str(gun), int(adet)) for gun, adet in en_yogun_gunler]
    }
    