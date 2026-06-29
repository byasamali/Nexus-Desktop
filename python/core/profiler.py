import pandas as pd
import numpy as np

def profile_data(df):
    """
    Eczane verilerini vektörel operasyonlarla profiller. 
    Döngü (apply/loop) kullanmaz, tüm barkodları tek seferde hesaplar.
    """
    bugun = pd.Timestamp.now().normalize()
    
    # --- 1. ÖN HAZIRLIK VE TEMİZLİK ---
    df = df.copy()
    df['satis_tarihi'] = pd.to_datetime(df['satis_tarihi'], format='mixed')
    
    # Global Tatil Tespiti (Vektörel)
    # 3'ten az işlem olan günleri "tatil/kapalı" kabul et
    islem_gunluk = df.groupby(df['satis_tarihi'].dt.date).size()
    tatil_gunler = set(islem_gunluk[islem_gunluk < 3].index)

    # Zaman pencereleri konfigürasyonu
    windows_config = {
        '7_gun': 7, '15_gun': 15, '30_gun': 30, 
        '45_gun': 45, '90_gun': 90, '120_gun': 120, '365_gun': 365
    }

    # --- 2. İŞLEM (FİŞ) SAYILARININ TESPİTİ ---
    # nunique() yavaş olduğu için önce benzersiz barkod+zaman çiftlerini alıyoruz.
    # Böylece sum() alarak nunique() sonucuna ulaşabileceğiz.
    df_unique = df[['barkod', 'satis_tarihi', 'satis_adedi', 'satis_tipi']].drop_duplicates(subset=['barkod', 'satis_tarihi'])
    
    # Her pencere için aktif gün sayısını ve o pencereye aitlik maskesini hazırla
    aktif_gun_sayilari = {}
    for label, days in windows_config.items():
        thresh = bugun - pd.Timedelta(days=days)
        
        # Aktif gün hesabı (Takvim günü - Tatil günü)
        tarih_range = pd.date_range(end=bugun, periods=days)
        aktif_gun = len([d for d in tarih_range if d.date() not in tatil_gunler])
        aktif_gun_sayilari[label] = max(1, aktif_gun)
        
        # Vektörel maske: Bu satır bu pencereye giriyor mu?
        df_unique[f'is_{label}'] = (df_unique['satis_tarihi'] >= thresh).astype(int)

    # --- 3. AGGREGATION (TEK SEFERDE TÜM İSTATİSTİKLER) ---
    agg_map = {f'is_{label}': 'sum' for label in windows_config}
    agg_map.update({
        'satis_adedi': ['median', 'sum'],  # recete_normu ve yıllık toplam
        'satis_tarihi': 'max'
    })
    
    grouped = df_unique.groupby('barkod').agg(agg_map)
    # Multi-index kolonları düzleştir
    grouped.columns = [f"{col[0]}_{col[1]}" if isinstance(col, tuple) else col for col in grouped.columns]
    
    # --- 4. OLASILIK VE HIZ HESAPLAMALARI (TAMAMI VEKTÖREL) ---
    res = grouped.copy()
    
    # Pencere olasılıkları (SPO - Sales Per Opportunity)
    for label in windows_config:
        res[f'p_{label}'] = res[f'is_{label}_sum'] / aktif_gun_sayilari[label]

    # Ara Metrikler
    res['p_cok_kisa'] = (res['p_7_gun'] + res['p_15_gun']) / 2
    res['p_kisa']     = (res['p_30_gun'] + res['p_45_gun']) / 2
    res['p_orta']     = (res['p_90_gun'] + res['p_120_gun']) / 2
    res['p_uzun']     = res['p_365_gun']

    # --- 5. AI KARAR MANTIĞI (VEKTÖREL IF/ELSE - np.select) ---
    limit_orta = res['p_orta'] * 0.6
    limit_uzun = res['p_uzun'] * 0.6

    conditions = [
        (res['p_kisa'] > 0) & (res['p_cok_kisa'] > (res['p_kisa'] * 1.5)), # Ani Talep
        (res['p_orta'] > 0) & (res['p_kisa'] < limit_orta) | (res['p_uzun'] > 0) & (res['p_kisa'] < limit_uzun), # Sert Düşüş
        (res['p_orta'] > 0) & (res['p_kisa'] < (res['p_orta'] * 0.85)) # Düşüş Trendi
    ]
    
    choices = [
        (res['p_cok_kisa'] * 0.4) + (res['p_kisa'] * 0.6),
        res['p_kisa'],
        (res['p_kisa'] * 0.80) + (res['p_cok_kisa'] * 0.20)
    ]
    
    # Varsayılan: Dengeli Hesap
    default_logic = (res['p_kisa'] * 0.50) + (res['p_orta'] * 0.25) + (res['p_uzun'] * 0.15) + (res['p_cok_kisa'] * 0.10)
    
    res['final_prob'] = np.select(conditions, choices, default=default_logic)

    # Nadir Ürün Koruması: Yıllık işlem 12'den azsa hızı aşağı çek
    res.loc[res['is_365_gun_sum'] < 12, 'final_prob'] = (res['final_prob'] * 0.4) + (res['p_uzun'] * 0.6)

    # Hibrit Hız Hesaplama
    res['hibrit_hiz'] = res['satis_adedi_median'] * res['final_prob']
    res['trend_skoru'] = res['p_kisa'] / (res['p_orta'] + 0.0001)

    # --- 6. META VERİ BİRLEŞTİRME ---
    # Sabit bilgiler (İsim, fiyat, stok vb.) her barkodun ilk satırından alınır
    # Güvenli kolon seçimi: Sadece DataFrame'de mevcut olan kolonları al
    # mf_baremleri sonuna eklendi
    target_meta_cols = ['lokal_urun_adi', 'stok_adet', 'lokal_psf', 'favori_depo', 
                        'final_esdeger_id', 'miad_dagilimi', 'kategori_id', 
                        'kategori_path_ids', 'recete_rengi', 'dsf', 'psf', 
                        'esdegersiz_ithal', 'son_5_alim_dagilimi', 'mf_baremleri']
    
    def parse_mf_from_history(raw_alim):
        mf_data = []
        raw_alim = str(raw_alim)
        if raw_alim and raw_alim not in ['AL_YOK', 'ALIM_YOK', 'None', 'nan', 'YOK']:
            for entry in raw_alim.split('|'):
                try:
                    parts = entry.split(':')
                    if len(parts) > 1 and '+' in parts[1]:
                        # Format örneği -> 2024-01-01:10+3 veya 2024-01-01:10+3@Depo
                        val_part = parts[1].split('@')[0] if '@' in parts[1] else parts[1]
                        ana, mf = map(int, val_part.split('+'))
                        if mf > 0: 
                            mf_data.append({'ana': ana, 'mf': mf})
                except: continue
        return mf_data

    available_cols = [c for c in target_meta_cols if c in df.columns]
    # 🚀 KRİTİK: first() her zaman en son kaydı (güncel stok ve fiyatı) alsın diye tarihleri azalan sıralayalım
    if 'satis_tarihi' in df.columns:
        df = df.sort_values(by='satis_tarihi', ascending=False)
    meta = df.groupby('barkod').first()[available_cols]
    
    # 🚀 KRİTİK: Geçmiş alımlardan MF baremlerini üret
    if 'son_5_alim_dagilimi' in meta.columns:
        meta['mf_baremleri'] = meta['son_5_alim_dagilimi'].apply(parse_mf_from_history)
    
    # Elden Satış Oranı (Vektörel)
    is_nakit = (df['satis_tipi'] == 'nakit_satis').astype(int)
    nakit_oranlari = df.assign(is_nakit=is_nakit).groupby('barkod')['is_nakit'].mean()
    meta['elden_orani'] = nakit_oranlari

    # Son 90 Gün Satış Listesi (Listeler vektörel yapılamaz, bu kısım mecburen grup bazlıdır)
    son_90_thresh = bugun - pd.Timedelta(days=90)
    satis_listeleri = df[df['satis_tarihi'] >= son_90_thresh].groupby('barkod')['satis_adedi'].apply(list)
    meta['satis_adet_listesi'] = satis_listeleri

    # --- 7. SONUÇ TABLOSUNU OLUŞTURMA (UI MAPPING) ---
    # --- 7. SONUÇ TABLOSUNU OLUŞTURMA (UI MAPPING & ZIRHLAMA) ---
    final_df = res.join(meta)
    final_df = final_df.reset_index()

    # A. Kritik İsimlendirmeler ve Gruplama Sütunları
    # Commentator ve Interpreter 'esdeger_id' sütununa ihtiyaç duyar
    final_df['esdeger_id'] = final_df['final_esdeger_id'].fillna(-1).astype(int)
    
    # B. Temel Veri Eşlemeleri
    final_df['urun_adi'] = final_df['lokal_urun_adi'].fillna(final_df['barkod'])
    final_df['stok'] = final_df['stok_adet'].fillna(0).astype(float)
    final_df['fiyat'] = final_df['lokal_psf'].fillna(0).astype(float)
    final_df['blok_satis_modu'] = final_df['satis_adedi_median'].fillna(1.0)
    
    # C. Tarih ve Frekans Analizleri (Vektörel)
    final_df['gun_farki_son_satis'] = (bugun - final_df['satis_tarihi_max']).dt.days.fillna(999)
    final_df['son_90_gun_islem'] = final_df['is_90_gun_sum'].fillna(0).astype(int)
    final_df['toplam_islem_sayisi'] = final_df['is_365_gun_sum'].fillna(0).astype(int)
    final_df['stok_omru_gun'] = final_df['stok'] / (final_df['hibrit_hiz'] + 0.00001)
    
    # D. Aylık Frekans Hesabı (Unique Ay Sayısı)
    # Bu kısım mecburen grup bazlıdır ancak sadece tarih sütunu üzerinde çalıştığı için hızlıdır
    aylik_frekanslar = df.groupby('barkod')['satis_tarihi'].apply(lambda x: x.dt.to_period('M').nunique())
    final_df['aylik_frekans'] = final_df['barkod'].map(aylik_frekanslar).fillna(0)

    # E. Liste Zırhlama (TypeError: object of type 'float' has no len() Hatası Çözümü)
    # Satış listesi NaN (float) olan yerleri boş liste [] ile değiştiriyoruz
    final_df['satis_adet_listesi'] = final_df['satis_adet_listesi'].apply(lambda x: x if isinstance(x, list) else [])

    # F. Gelecek Modüller İçin Container Oluşturma
    final_df['tags'] = [[] for _ in range(len(final_df))]
    final_df['oneri'] = 0.0
    final_df['oneri_stratejik'] = 0.0
    final_df['miad_raw'] = final_df['miad_dagilimi'].fillna('')

    # G. Gereksiz Sütun Temizliği (Payload küçültmek için opsiyonel)
    # UI'ya gitmeyecek teknik sum ve is_ sütunlarını silebilirsin
    cols_to_drop = [c for c in final_df.columns if '_sum' in c or '_median' in c or 'is_' in c or 'p_' in c]
    # final_df.drop(columns=cols_to_drop, inplace=True)

    print(f"✅ Profiler Tamamlandı (Hızlandırılmış Vektörel Sürüm).")
    return final_df