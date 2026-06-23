# core/normalizer.py

import pandas as pd
import sqlite3
import os
import numpy as np
from core.category_manager import CategoryManager

def normalize_data(df_local, sqlite_path):
    """
    İstemciden gelen ham DataFrame'i Master DB ile evlendirir,
    kategori hiyerarşisini (ID bazlı) çözer ve eşdeğer gruplarını ayarlar.
    """

    print("\n🔍 DEBUG: Eczaneden Gelen Sütunlar:", df_local.columns.tolist())
    
    if not os.path.exists(sqlite_path):
        raise FileNotFoundError(f"❌ Master DB bulunamadı: {sqlite_path}")

    # --- 1. MASTER DB'DEN ÜRÜNLERİ VE KATEGORİLERİ ÇEK ---
    conn = sqlite3.connect(sqlite_path)
    
    # Artık sadece vw_nexus_master'ın bize sağladığı kolonları çekiyoruz
    query_products = """
    SELECT 
        barkod, master_urun_adi, kategori_id, atc_kodu, sgk_kodu,
        esdeger_kodu, recete_rengi, isf, dsf, psf, saf_kamu, fiyat_farki, kamu_toplam,
        esdegersiz_ithal
    FROM products
    """
    df_master = pd.read_sql(query_products, conn)
    
    # Kategorileri çekip Manager'ı başlatıyoruz
    df_categories = pd.read_sql("SELECT * FROM categories", conn)
    cat_manager = CategoryManager(df_categories)
    
    conn.close()

    # --- 2. VERİ TİPLERİNİ ZIRHLA ---
    df_local['barkod'] = df_local['barkod'].astype(str).str.strip()
    df_master['barkod'] = df_master['barkod'].astype(str).str.strip()

    # --- 3. MASTER VE LOKAL VERİYİ BİRLEŞTİR (MERGE) ---
    df = pd.merge(df_local, df_master, on='barkod', how='left')

    # --- 4. YENİ KATEGORİ SİSTEMİNİ UYGULA (SİHİRLİ DOKUNUŞ) ---
    df['kategori_id'] = pd.to_numeric(df['kategori_id'], errors='coerce')
    
    # Kategori Manager'ı kullanarak her satıra "Ağaç" bilgisini ekliyoruz
    df['root_id'] = df['kategori_id'].apply(cat_manager.get_root_id)
    df['kategori_path_ids'] = df['kategori_id'].apply(cat_manager.get_path_ids)
    
    # Eski sistemlerin çökmemesi için genel_kategori'yi geçici olarak "ilac", "idu" metni olarak bırakıyoruz
    df['genel_kategori'] = df['kategori_id'].apply(cat_manager.get_root_name)

    # Eski `kamu_fiyati` yerine artık DB'den gelen `kamu_toplam` ı kullanıyoruz
    df['kamu_fiyati'] = df['kamu_toplam']

    # --- 5. KOLON KORUMA ---
    if 'favori_depo' not in df.columns:
        df['favori_depo'] = "DEPO_YOK"
    df['favori_depo'] = df['favori_depo'].fillna("DEPO_YOK").astype(str)

    # --- 6. SAYISAL ZIRHLAMA ---
    sayisal_kolonlar =['stok_adet', 'lokal_psf', 'net_tutar', 'indirim', 'satis_adedi', 
                   'dsf', 'psf', 'kamu_fiyati', 'isf', 'saf_kamu', 'fiyat_farki']
    # kategori_id'yi ayrı işle
    if 'kategori_id' in df.columns:
        # 0 veya NaN olanları 2 (IDU) yap (Kategorisiz Kalmasın)
        df['kategori_id'] = pd.to_numeric(df['kategori_id'], errors='coerce').fillna(2)
        # Eğer kategori_id hala 0 ise (bazı SQL'lerden 0 gelebilir), onu da 2 yap
        df.loc[df['kategori_id'] == 0, 'kategori_id'] = 2

    # --- 7. TARİH DÜZELTME ---
    if 'satis_tarihi' in df.columns:
        df['satis_tarihi'] = pd.to_datetime(df['satis_tarihi'], format='mixed', errors='coerce')
        df = df.dropna(subset=['satis_tarihi'])

    # --- 8. EŞDEĞER GRUPLAMA ---
    df['esdeger_kodu'] = df['esdeger_kodu'].astype(str).replace(['', '0', 'None', 'nan', 'NULL'], np.nan)
    df['final_esdeger_id'] = pd.factorize(df['esdeger_kodu'])[0]
    
    mask_esdegersiz = df['esdeger_kodu'].isna()
    if mask_esdegersiz.any():
        df.loc[mask_esdegersiz, 'final_esdeger_id'] = np.arange(-1, -mask_esdegersiz.sum() - 1, -1)

    print(f"✅ Normalizasyon Tamamlandı: {len(df)} satır Hiyerarşik ID Sistemiyle işlendi.")
    return df