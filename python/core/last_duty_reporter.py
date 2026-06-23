import pandas as pd
import polars as pl
import os
import math

def time_to_float(t_str):
    if not t_str or ":" not in str(t_str): return 18.5
    try:
        parts = str(t_str).split(':')
        return int(parts[0]) + int(parts[1])/60.0
    except:
        return 18.5

def generate_last_duty_report(df_raw, hi_info, ct_info, found_duty_dates, tenant_dir):
    """
    Nöbet verilerini ayıklar, hem Excel raporu basar hem de 
    Big Data sorguları için Polars/Parquet formatında arşivler.
    """
    if not found_duty_dates:
        print("⚠️ Nöbet raporu için tespit edilmiş bir nöbet tarihi bulunamadı.")
        return

    # Zaman Ayarları
    hi_kapanis = time_to_float(hi_info.get('kapanis', '18:30'))
    ct_kapanis = time_to_float(ct_info.get('kapanis', '13:00'))
    hi_acilis = time_to_float(hi_info.get('acilis', '08:30'))

    # Veriyi Polars'a çevirelim (Işık hızı için)
    # Pandas'tan Polars'a geçerken tarih kolonunu garantiye alalım
    df_raw['satis_tarihi'] = pd.to_datetime(df_raw['satis_tarihi'], errors='coerce')
    ldf = pl.from_pandas(df_raw.dropna(subset=['satis_tarihi']))

    # Tarih ve Saat kolonlarını ekle
    ldf = ldf.with_columns([
        pl.col("satis_tarihi").dt.date().alias("tarih_gun"),
        (pl.col("satis_tarihi").dt.hour() + pl.col("satis_tarihi").dt.minute() / 60.0).alias("saat_ondalik")
    ])

    all_duty_frames = []

    # 1. TÜM NÖBETLERİ DÖNGÜYE AL VE AYIKLA
    for d in found_duty_dates:
        wd = d.weekday() # 0=Pazartesi, 6=Pazar
        # Nöbet başlangıç saati (Pazar ise 00:00, Cumartesi ise ct_kapanis, hafta içi hi_kapanis)
        start_h = 0.0 if wd == 6 else (ct_kapanis if wd == 5 else hi_kapanis)
        
        # O günkü kapanış sonrası satışlar
        day_sales = ldf.filter((pl.col("tarih_gun") == d) & (pl.col("saat_ondalik") >= start_h))
        
        # Ertesi sabah açılışa kadar olan satışlar
        next_day = d + pd.Timedelta(days=1)
        night_sales = ldf.filter((pl.col("tarih_gun") == next_day) & (pl.col("saat_ondalik") < hi_acilis))
        
        # Bu nöbeti birleştir ve etiketle
        current_duty = pl.concat([day_sales, night_sales])
        if not current_duty.is_empty():
            current_duty = current_duty.with_columns(pl.lit(d).alias("nobet_tarihi"))
            all_duty_frames.append(current_duty)

    if not all_duty_frames:
        print("⚠️ Nöbet saatlerinde herhangi bir satış kaydı bulunamadı.")
        return

    # Tüm nöbet verilerini tek bir dev tabloda birleştir
    full_nobet_db = pl.concat(all_duty_frames)

    # 2. TÜM NÖBETLER ARŞİVİ (all_nobet.parquet)
    all_nobet_path = os.path.join(tenant_dir, "all_nobet.parquet")
    full_nobet_db.write_parquet(all_nobet_path)
    print(f"📦 Tüm nöbetlerin verisi arşivlendi: all_nobet.parquet ({full_nobet_db.height} satır)")

    # 3. SON NÖBET ÖZEL PARQUET (Örn: 23022026_nobet.parquet)
    last_duty_date = found_duty_dates[-1]
    last_duty_data = full_nobet_db.filter(pl.col("nobet_tarihi") == last_duty_date)
    
    date_str = last_duty_date.strftime('%d%m%Y')
    last_nobet_path = os.path.join(tenant_dir, f"{date_str}_nobet.parquet")
    last_duty_data.write_parquet(last_nobet_path)
    print(f"🎯 Son nöbet verisi kaydedildi: {date_str}_nobet.parquet")

    # 4. SON NÖBET DETAY RAPORU (PARQUET - Big Data Ready)
    # Özet rapor için gruplayalım
    report_df = last_duty_data.group_by(['barkod', 'lokal_urun_adi']).agg([
        pl.col('satis_adedi').sum().alias('toplam_adet')
    ]).sort('toplam_adet', descending=True)
    
    # Parquet olarak kaydet
    detail_path = os.path.join(tenant_dir, f"{date_str}_nobet_detay.parquet")
    report_df.write_parquet(detail_path)
    print(f"✅ Son nöbet detay raporu kaydedildi: {date_str}_nobet_detay.parquet ({report_df.height} ürün)")