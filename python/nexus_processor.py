# import boto3 (disabled in local mode)
from dotenv import load_dotenv
load_dotenv()
import os
import pandas as pd
from rich import print
import sqlite3
import numpy as np
import requests
import json
import time
from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine

# Dosyanın en üstündeki importların arasına ekle
from supabase import create_client, Client

# Core Modüller
from core.normalizer import normalize_data
from core.profiler import profile_data
from core.labeler import apply_labels
from core.interpreter import apply_strategy
from core.commentator import generate_comments
from core.presenter import prepare_ui_data
from core.pharmacy_profiler import analyze_pharmacy_hours
from core.location_pharmacy import detect_location_profile
from core.duty_predictor import analyze_and_log_duties, generate_duty_projections
from core.cash_optimizer import calculate_cash_relief
from core.analytics_engine import get_dashboard_data
from core.counter import generate_count_plan
from core.atc_analyzer import analyze_atc_trends
from core.equivalent_analyzer import analyze_equivalent_trends
from core.last_duty_reporter import generate_last_duty_report
from core.margin_analyzer import analyze_margins
from core.top_nonpharma import generate_top_nonpharma_report
from core.category_manager import CategoryManager

# Reporter Modülleri
from core.reporter_tous import generate_missing_barcode_report
from core.report_nocategory import generate_nocategory_report

class NexusProcessor:
    """
    Sunucudaki ham Parquet verisini okur, Master DB ile birleştirir,
    Eczane Profili, Nöbet Analizi ve Ürün Analizlerini çalıştırıp UI için paketler.
    """

    
    def __init__(self, gln: str):
        # 1. Önce temel dizinleri ve bağlantı bilgilerini tanımla
        self.gln = gln
        import sys
        if getattr(sys, 'frozen', False):
            self.base_dir = os.path.dirname(sys.executable)
        else:
            self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.tenant_dir = os.path.join(self.base_dir, "tenants", gln)
        self.parquet_path = os.path.join(self.tenant_dir, "raw_data.parquet")


        # ========== YENİ ==========
        # Eğer raw_data.parquet yoksa, packets'tan oluştur
        if not os.path.exists(self.parquet_path):
            self._create_parquet_from_packets()
        # ==============================


        self.master_db_path = os.path.join(self.base_dir, "database", "master_db.sqlite")

        # 2. Supabase bağlantısını kur (Yerel modda devredışı)
        self.supabase = None
        self.eczane_uuid = "local"
        self.onaylandi_mi = True


    def _create_parquet_from_packets(self):
        """packets/ klasöründeki .enc dosyalarından raw_data oluştur"""
        packets_dir = os.path.join(self.tenant_dir, "packets")
        
        if not os.path.exists(packets_dir):
            print(f"⚠️ {self.gln} için packets klasörü yok")
            return
        
        print(f"\n🔧 Paketlerden raw_data.parquet oluşturuluyor...")
        
        # Tüm .enc dosyalarını aç
        all_data = []
        packet_files = sorted([f for f in os.listdir(packets_dir) if f.endswith('.enc')])
        
        print(f"📦 {len(packet_files)} paket bulundu")
        
        for packet_file in packet_files:
            try:
                packet_path = os.path.join(packets_dir, packet_file)
                with open(packet_path, 'r', encoding='utf-8') as f:
                    encrypted_data = f.read()
                
                # Şifre çöz (api_key gerek - burada sabit kullan veya şu şekilde)
                api_key = f"token_{self.gln}"
                decrypted_data = self._decrypt_payload(encrypted_data, api_key)
                
                if decrypted_data:
                    all_data.extend(decrypted_data)
                    print(f"   ✅ {packet_file}: {len(decrypted_data)} satır")
            
            except Exception as e:
                print(f"   ❌ {packet_file}: {e}")
        
        if not all_data:
            print(f"⚠️ Hiçbir paket açılamadı")
            return
        
        # DataFrame'e çevir
        df = pd.DataFrame(all_data)
        
        # Sayısal sütunları düzelt
        numeric_cols = ['satis_adedi', 'stok_adet', 'lokal_psf', 'net_tutar', 'indirim']
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        
        # raw_data.parquet'a kaydet
        os.makedirs(self.tenant_dir, exist_ok=True)
        df.to_parquet(self.parquet_path, index=False)
        
        # latest_data.parquet'a da kaydet
        latest_path = os.path.join(self.tenant_dir, "latest_data.parquet")
        df.to_parquet(latest_path, index=False)
        
        print(f"✅ Parquet dosyaları oluşturuldu:")
        print(f"   raw_data.parquet: {len(df)} satır")
        print(f"   latest_data.parquet: {len(df)} satır\n")

    def _decrypt_payload(self, encrypted_b64, api_key):
        """AES-GCM şifre çözme"""
        try:
            import base64
            from Crypto.Cipher import AES
            
            key = api_key.ljust(32)[:32].encode('utf-8')
            raw_data = base64.b64decode(encrypted_b64)
            nonce = raw_data[:16]
            tag = raw_data[-16:]
            ciphertext = raw_data[16:-16]
            cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
            decrypted_json = cipher.decrypt_and_verify(ciphertext, tag)
            return json.loads(decrypted_json.decode('utf-8'))
        except Exception as e:
            print(f"❌ Şifre çözme hatası: {e}")
            return None


    def sync_master_db_from_cloud(self):
        """
        Supabase API üzerinden vw_nexus_master ve core_kategoriler verilerini indirir.
        Deterministic ordering (barkod) kullanarak sayfalama hatasını önler.
        """
        sync_file = os.path.join(self.base_dir, "database", "last_sync.txt")
        temp_db_path = os.path.join(self.base_dir, "database", "master_db.sqlite")
        
        print("\n" + "🔄" + "—"*45)
        print("📡 BULUT VERİTABANI SENKRONİZASYON SERVİSİ")
        print("—"*49)

        # 1. GÜNCELİK KONTROLÜ
        if os.path.exists(sync_file):
            with open(sync_file, "r") as f:
                last_sync_raw = f.read().strip()
                try:
                    last_sync_dt = datetime.strptime(last_sync_raw, "%Y-%m-%d %H:%M:%S")
                    if datetime.now() - last_sync_dt < timedelta(hours=20):
                        print(f"✅ Sistem Güncel: Son işlem {last_sync_raw} tarihinde yapılmış.")
                        print("—"*49 + "\n")
                        return
                except ValueError: pass

        start_time = datetime.now()
        
        try:
            local_conn = sqlite3.connect(temp_db_path)

            # --- 1. ÜRÜNLERİ ÇEK (vw_nexus_master) ---
            print(f"🌐 Adım 1: Ürün listesi indiriliyor (vw_nexus_master)...")
            all_products = []
            offset = 0
            chunk_size = 1000
            
            while True:
                # 🚀 DÜZELTME: 'descending' yerine 'desc' kullanıyoruz
                response = self.supabase.table('vw_nexus_master')\
                    .select("*")\
                    .order('barkod', desc=False)\
                    .range(offset, offset + chunk_size - 1)\
                    .execute()
                
                data = response.data
                if not data:
                    break
                
                all_products.extend(data)
                
                # İlerleme Logu
                if len(all_products) % 5000 == 0 or len(data) < chunk_size:
                    print(f"   📥 {len(all_products)} ürün çekildi...")
                
                if len(data) < chunk_size: # Son sayfa gelmişse çık
                    break
                    
                offset += chunk_size

            df_cloud = pd.DataFrame(all_products)
            
            # Alias ekle ve temizle
            df_cloud['barkod'] = df_cloud['barkod'].astype(str).str.strip()
            df_cloud['master_urun_adi'] = df_cloud['urun_adi']
            
            # SQLite'a Yaz
            df_cloud.to_sql("products", local_conn, if_exists='replace', index=False)
            print(f"   💾 {len(df_cloud)} ürün SQLite'a kaydedildi.")

            # --- 2. KATEGORİLERİ ÇEK ---
            print(f"🌐 Adım 2: Kategori hiyerarşisi indiriliyor...")
            cat_response = self.supabase.table('core_kategoriler').select("*").execute()
            df_cats = pd.DataFrame(cat_response.data)
            df_cats.to_sql("categories", local_conn, if_exists='replace', index=False)
            print(f"   💾 {len(df_cats)} kategori işlendi.")

            # --- 3. DOĞRULAMA (Klamer Testi) ---
            target_bc = '8699717280151'
            check_q = f"SELECT barkod, master_urun_adi FROM products WHERE barkod = '{target_bc}'"
            res = pd.read_sql(check_q, local_conn)
            
            if not res.empty:
                print(f"   ✅ DOĞRULAMA BAŞARILI: Klamer veritabanına eklendi.")
            else:
                print(f"   ⚠️ KRİTİK UYARI: Klamer hala yerel DB'de yok!")

            local_conn.close()

            # ZAMAN DAMGASINI KAYDET
            with open(sync_file, "w") as f:
                f.write(datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

            duration = (datetime.now() - start_time).seconds
            print(f"✨ Senkronizasyon Başarılı! (Süre: {duration} sn)")
            print("—"*49 + "\n")

        except Exception as e:
            print(f"❌ HATA: Senkronizasyon yarıda kesildi!")
            print(f"🔴 Detay: {str(e)}")
            import traceback
            traceback.print_exc()
            print("—"*49 + "\n")



    def run_full_analysis(self):


         # --- SENKRONİZASYONU TETİKLE ---
        # self.sync_master_db_from_cloud() 


        # ------------------------------


        if not self.eczane_uuid:
            return {"error": "Eczane kayıtlı değil!"}
        
        if not self.onaylandi_mi:
            print(f"⚠️ {self.gln} onaylanmamış! Analiz durduruldu.")
            return {"error": "Eczane henüz onaylanmamış."}

        print(f"🧠 {self.gln} (UUID: {self.eczane_uuid}) İÇİN ANALİZ BAŞLATILIYOR...")


       
        print("="*60)

        if not os.path.exists(self.parquet_path):
            return {"error": "Ham veri henüz yüklenmemiş."}

        # --- 1. HAM VERİ OKUMA VE ÖN TEMİZLİK ---
        print("⏳ Ham veri okunuyor...")
        df_raw = pd.read_parquet(self.parquet_path)


        # 🚀 BARKOD ZIRHLAMA (HAM VERİ)
        df_raw['barkod'] = df_raw['barkod'].astype(str).apply(lambda x: x.split('.')[0] if '.' in x else x).str.strip()
        # Boş barkodları temizle
        df_raw = df_raw[df_raw['barkod'] != 'nan']
        
        # Barkod Tip Dönüşümü
        if 'barkod' in df_raw.columns:
            df_raw['barkod'] = df_raw['barkod'].astype(str).str.split('.').str[0].str.strip()

        # 🚩 REPORTER 1: Master DB'de olmayan barkodlar (Eksik Barkod Raporu)
        print("📋 Eksik barkod raporu kontrol ediliyor...")
        generate_missing_barcode_report(self.parquet_path, self.master_db_path)

        # --- 2. MASTER DB BİRLEŞTİRME ---
        # --- 2. MASTER DB BİRLEŞTİRME ---
        conn = sqlite3.connect(self.master_db_path)
        df_master = pd.read_sql("SELECT * FROM products", conn)
        conn.close()

        # 🚀 BARKOD ZIRHLAMA (MASTER VERİ)
        df_master['barkod'] = df_master['barkod'].astype(str).str.strip()
        df_master['barkod'] = df_master['barkod'].astype(str).apply(lambda x: x.split('.')[0] if '.' in x else x).str.strip()

        # Merge işlemi
        merge_cols = [col for col in df_master.columns if col not in ['barkod']]
        df_merged = pd.merge(df_raw, df_master[['barkod'] + merge_cols], 
                            on='barkod', how='left', suffixes=('', '_master'))

        # 🚀 KRİTİK KONTROL: Master her zaman kazanır — ham verideki değerlerin üzerine yaz
        priority_cols = ['kategori_id', 'atc_kodu', 'esdeger_kodu', 'recete_rengi', 'isf', 'dsf', 'psf', 'mf_baremleri', 'kamu_fiyati']

        for col in priority_cols:
            master_col = f"{col}_master"
            if master_col in df_merged.columns:
                # Master değeri varsa onu kullan (0, NaN, None → ham veriyle doldur)
                # combine_first(B): "self'te boşsa B'yi kullan" → master_col.combine_first(raw_col)
                raw_col = df_merged[col] if col in df_merged.columns else pd.Series(dtype='object', index=df_merged.index)
                df_merged[col] = df_merged[master_col].combine_first(raw_col)
                df_merged = df_merged.drop(columns=[master_col])

        # Master DB'den gelen ürün adını düzelt
        if 'urun_adi_master' in df_merged.columns:
            df_merged['master_urun_adi'] = df_merged['urun_adi_master']
            df_merged = df_merged.drop(columns=['urun_adi_master'])

        # Master DB'den gelen ürün adını düzelt
        if 'urun_adi_master' in df_merged.columns:
            df_merged['master_urun_adi'] = df_merged['urun_adi_master']
            df_merged = df_merged.drop(columns=['urun_adi_master'])
        elif 'urun_adi' in df_merged.columns:
            df_merged['master_urun_adi'] = df_merged['urun_adi']

        # 🚀 MF VERİ HATTI DOĞRULAMA (TANI LOGU)
        # ————————————————————————————————————————————————————————————
        target_bcs = ['8680150570121', '8699591700233'] # Pulmotus ve Ibu-fort
        print("\n🔍 [DATA PIPELINE CHECK] MF BAREMLERİ TAŞINDI MI?")
        for bc in target_bcs:
            mask = df_merged[df_merged['barkod'] == bc]
            if not mask.empty:
                val = mask.iloc[0].get('mf_baremleri')
                print(f"   📦 {bc} -> MF Verisi Tipi: {type(val)}")
                print(f"   📦 {bc} -> Değer: {str(val)[:100]}...")
            else:
                print(f"   ❌ {bc} -> df_merged içinde bulunamadı!")
        print("————————————————————————————————————————————————————————————\n")

        print(f"🔍 Master DB Eşleşme Kontrolü:")
        eslesme_sayisi = df_merged['master_urun_adi'].notna().sum()
        print(f"   • Master DB'de bulunan ürün sayısı: {eslesme_sayisi} / {len(df_merged)}")
        
        if eslesme_sayisi > 0:
            print(f"   • Master DB'den gelen örnek ISF'ler: {df_master['isf'].head(3).tolist()}")
        else:
            print("   ❌ KRİTİK: Hiçbir barkod Master DB ile eşleşmedi! Barkod formatlarını kontrol edin.")

        print(f"🔍 DEBUG - df_merged Kolonları:")
        print(df_merged.columns.tolist())
        print(f"\n🔍 DEBUG - df_master Kolonları:")
        print(df_master.columns.tolist())



        # Kategori ağacını yükle (root_id'yi bulmak için)
        conn = sqlite3.connect(self.master_db_path)
        query_cat = "SELECT id, isim, ust_kategori_id FROM categories"
        df_categories = pd.read_sql(query_cat, conn)
        conn.close()
        
        # CategoryManager'ı başlat
        cat_mgr = CategoryManager(df_categories)

        # DEBUG: Kategori ağacını göster
        #print("\n🔍 DEBUG - KATEGORI AĞACI:")
        #print(f"Toplam kategori sayısı: {len(df_categories)}")
        #print("\nKategoriler (id, isim, ust_kategori_id, root_id):")
        #for idx, row in df_categories.iterrows():
        #    root = cat_mgr.get_root_id(row['id'])
        #    root_name = cat_mgr.get_root_name(row['id'])
        #    print(f"  ID: {row['id']:<5} | İsim: {row['isim']:<30} | Root: {root} ({root_name}) | Parent: {row.get('ust_kategori_id')}")
        
        # kategori_id'den root_id'yi bul
        df_merged['root_id'] = df_merged['kategori_id'].apply(lambda cid: cat_mgr.get_root_id(cid) if pd.notna(cid) else None)
        
        # 🚀 EKSİK OLAN SATIR: Kategori soy ağacını (path_ids) hesapla ve ekle
        df_merged['kategori_path_ids'] = df_merged['kategori_id'].apply(lambda cid: cat_mgr.get_path_ids(cid) if pd.notna(cid) else[])


        # 🚀 BURAYI EKLE/GÜNCELLE: Kolonun kaybolmadığından emin olalım
        if 'son_5_depo' not in df_merged.columns:
            if 'son_5_depo' in df_raw.columns:
                df_merged['son_5_depo'] = df_raw['son_5_depo']
            else:
                df_merged['son_5_depo'] = "DEPO_YOK"
        
        # NaN değerleri metne çevirelim (Sayı olmasınlar)
        df_merged['son_5_depo'] = df_merged['son_5_depo'].fillna("DEPO_YOK").astype(str)

        # --- 3. KRİTİK VERİ TİPİ ZIRHLAMA (HATA ÇÖZÜMÜ) ---
        print("🛡️ Veri tipleri zırhlanıyor...")
        
        # A. Tarih Zırhlama: Geçersiz tarihleri temizle, NaT yap.
        if 'satis_tarihi' in df_merged.columns:
            df_merged['satis_tarihi'] = pd.to_datetime(df_merged['satis_tarihi'], errors='coerce').dt.tz_localize(None)
            # Nöbet analizinin çökmemesi için NaT olan satırları (tarihsiz satışlar) analiz dışı bırakıyoruz
            df_merged = df_merged.dropna(subset=['satis_tarihi'])


        # Master DB'de ISF'si dolu olan kaç ürün var? (Merge öncesi)
        master_dolu_isf = df_master[df_master['isf'].notna() & (df_master['isf'] != "") & (df_master['isf'] != 0)]
        print(f"📊 Master DB'de ISF verisi olan ürün sayısı: {len(master_dolu_isf)}")
        
        if len(master_dolu_isf) > 0:
            raw_val = master_dolu_isf['isf'].iloc[0]
            print(f"   • Örnek ham ISF verisi: '{raw_val}' (Tip: {type(raw_val)})")
        # ----------------------------

        
        # B. Sayısal Zırhlama: Kıyaslama hatalarını önlemek için NaN'ları 0 yap
        # YENİ: satis_fiyati silindi. lokal_psf, net_tutar, indirim eklendi.
        numeric_cols =['stok_adet', 'lokal_psf', 'net_tutar', 'indirim', 'satis_adedi', 'isf', 'dsf', 'psf', 'kamu_fiyati']
        for col in numeric_cols:
            if col in df_merged.columns:
                df_merged[col] = pd.to_numeric(df_merged[col], errors='coerce').fillna(0)

        # 🚀 YENİ CİRO HESABI: Artık çarpma yok, direkt SQL'den gelen tahsilat var
        df_merged['satir_ciro'] = df_merged['net_tutar']

        # 🚀 TAM BURAYA EKLE:
        # Veri temizlendiğine göre artık ATC analizini yapabiliriz.
        _t = {}  # zamanlama sözlüğü

        print("🔍 ATC dağılımları hesaplanıyor...")
        _t0 = time.time(); atc_results = analyze_atc_trends(df_merged); _t['ATC Analizi'] = time.time() - _t0

        # 🚩 EŞDEĞER GRUP ANALİZİ (YENİ SCRIPT)
        print("🔍 Eşdeğer grup (Molekül) dağılımları hesaplanıyor...")
        print(f"DEBUG: Mevcut Sütunlar: {df_merged.columns.tolist()}")
        _t0 = time.time(); eq_results = analyze_equivalent_trends(df_merged); _t['Eşdeğer Analizi'] = time.time() - _t0

        # 🚩 REPORTER 2: Kategorisiz IDU ürünleri
        print("🏷️ Kategorisiz ürün raporu hazırlanıyor...")
        _t0 = time.time(); generate_nocategory_report(df_merged, self.tenant_dir); _t['Kategorisiz Rapor'] = time.time() - _t0
        
        # 🚩 REPORTER 3: Top 1000 İlaç Dışı Ürünler (Big Data için kritik)
        print("🛒 Top 1000 ilaç dışı ürün analizi yapılıyor...")
        _t0 = time.time(); generate_top_nonpharma_report(df_merged, self.tenant_dir, top_n=1000); _t['Top NonPharma'] = time.time() - _t0

        # --- 4. ANALYTICS VE EŞDEĞER YÖNETİMİ ---
        print("📊 Satış trendleri analiz ediliyor...")
        _t0 = time.time(); dashboard_analytics = get_dashboard_data(df_merged); _t['Dashboard Analytics'] = time.time() - _t0

        if 'esdeger_kodu' in df_merged.columns:
            df_merged['esdeger_kodu'] = df_merged['esdeger_kodu'].replace(['', '0', 'None', 'nan', 'NULL'], np.nan)
            df_merged['final_esdeger_id'] = pd.factorize(df_merged['esdeger_kodu'])[0]
            
            mask_missing = df_merged['esdeger_kodu'].isna()
            if mask_missing.any():
                df_merged.loc[mask_missing, 'final_esdeger_id'] = range(-1000, -1000 - mask_missing.sum(), -1)

        # --- 5. ECZANE VE NÖBET ANALİZİ ---
        print("🏥 Eczane profili analiz ediliyor...")
        _t0 = time.time()
        try:
            hi_info, ct_info, pz_info, islem_tipi_dagilimi, gun_saat_analizi = analyze_pharmacy_hours(df_merged)
            print(f"✅ Eczane profili hazır - En yoğun saat: {gun_saat_analizi.get('en_yogun_saat')}:00")
        except Exception as e:
            print(f"❌ Eczane profili hatası: {e}")
            import traceback
            traceback.print_exc()
            hi_info, ct_info, pz_info, islem_tipi_dagilimi = {}, {}, {}, []
            gun_saat_analizi = {
                'en_yogun_saat': 0,
                'saat_yuzdeleri': {},
                'en_yogun_saatler': [],
                'gun_yuzdeleri': {},
                'en_yogun_gunler': []
            }
        _t['Eczane Profili'] = time.time() - _t0

        _t0 = time.time(); konum_tahmini, konum_detayi = detect_location_profile(df_merged, df_master); _t['Konum Tespiti'] = time.time() - _t0

        print("💰 İlaç fiyat kademeleri ve kârlılık analiz ediliyor...")
        _t0 = time.time(); margin_results = analyze_margins(df_merged); _t['Margin Analizi'] = time.time() - _t0

        print("🌙 Geçmiş nöbetler tespit ediliyor...")
        _t0 = time.time(); found_duty_dates = analyze_and_log_duties(df_merged, hi_info, ct_info); _t['Nöbet Tespiti'] = time.time() - _t0

        # 🚩 YENİ: Son Nöbet Detay Raporu (Tarihli Dosya)
        _t0 = time.time()
        try:
            generate_last_duty_report(df_merged, hi_info, ct_info, found_duty_dates, self.tenant_dir)
        except Exception as e:
            print(f"❌ Son nöbet raporu oluşturulurken hata: {e}")
        _t['Son Nöbet Raporu'] = time.time() - _t0

        # --- 6. ÜRÜN PROFİLLEME VE STRATEJİ ---
        print("📦 Ürün bazlı hibrit hız ve stok analizi yapılıyor...")
        
        # 🎯 ADIM 1 - Ön Filtreleme: 365 günden eski veriyi at
        print("\n📊 Veri Ön-Filterlemesi...")
        before_count = len(df_merged)
        df_merged = df_merged[df_merged['satis_tarihi'] >= (pd.Timestamp.now() - pd.Timedelta(days=365))]
        after_count = len(df_merged)
        print(f"✅ {before_count} satırdan → {after_count} satıra indirildi (-{before_count-after_count} eski kayıt)")
        
        # DEBUG: Profiler'a göndermeden önce kontrol et
        print(f"\n🔍 NEXUS DEBUG:")
        print(f"  df_merged shape: {df_merged.shape}")
        test_urun = df_merged[df_merged['barkod'] == '8699514040019']
        if not test_urun.empty:
            print(f"  Test ürün satır sayısı: {len(test_urun)}")
            print(f"  Test ürün tarihleri min-max: {test_urun['satis_tarihi'].min()} - {test_urun['satis_tarihi'].max()}")
        else:
            print(f"  Test ürün BULUNAMADI!")
        
        _t0 = time.time(); df_profiled = profile_data(df_merged); _t['Profiler'] = time.time() - _t0



        # 🚀 profile_data sonrası kayıp kolonları geri ekle
        if 'son_5_depo' not in df_profiled.columns:
            if 'son_5_depo' in df_merged.columns:
                df_profiled['son_5_depo'] = df_merged['son_5_depo']
            else:
                df_profiled['son_5_depo'] = "DEPO_YOK"
        
        # ✅ atc_kodu'nu da geri ekle (ATC analizi için)
        if 'atc_kodu' not in df_profiled.columns and 'atc_kodu' in df_merged.columns:
            df_profiled['atc_kodu'] = df_merged['atc_kodu']

        print("🏷️ Etiketler ve stratejiler uygulanıyor...")
        _t0 = time.time(); df_profiled = apply_labels(df_profiled); _t['Labeler'] = time.time() - _t0
        _t0 = time.time(); df_profiled = apply_strategy(df_profiled); _t['Interpreter'] = time.time() - _t0
        # 🕵️‍♂️ DEBUG: HESAP LOGLARI KONTROLÜ
        




       
        print("\n" + "🎯" + "—"*45)
        print("DEBUG: HEDEF ÜRÜNLERİN HESAP ANALİZİ")
        target_bcs = ['8680150570121', '8699591700233'] # Pulmotus ve Ibu-fort
        
        test_items = df_profiled[df_profiled['barkod'].isin(target_bcs)]
        
        if not test_items.empty:
            for _, row in test_items.iterrows():
                print(f"📦 Barkod: {row.get('barkod')} - Ürün: {row.get('urun_adi')}")
                logs = row.get('hesap_aciklamasi', [])
                print(f"📝 Toplam Log Satırı: {len(logs)}")
                for l in logs:
                    # Yeni format: ["tip", ...değerler] array — terminale düz metin bas
                    if isinstance(l, list):
                        tip = l[0] if l else '?'
                        args = l[1:] if len(l) > 1 else []
                        clean_log = f"[{tip}] {' | '.join(str(a) for a in args)}"
                    else:
                        import re
                        clean_log = re.sub(r'<[^>]+>', '', str(l))
                    print(f"   -> {clean_log}")
                print("-" * 40)
        else:
            print("⚠️ Hedef barkodlar analiz tablosunda bulunamadı!")
        print("—"*49 + "\n")


        
        _t0 = time.time(); df_profiled = generate_comments(df_profiled); _t['Commentator'] = time.time() - _t0

        # 🔥 KRİTİK DÜZELTME: Sayım planı ve UI paketi öncesi TÜM tabloyu temizle
        # NaN ve Inf değerleri JSON'ı bozar.
        df_profiled = df_profiled.replace([np.inf, -np.inf], 0).fillna(0)

        print("📋 Sayım planı oluşturuluyor...")
        _t0 = time.time()
        try:
            if 'stok' not in df_profiled.columns and 'stok_adet' in df_profiled.columns:
                df_profiled['stok'] = df_profiled['stok_adet']
            count_plan = generate_count_plan(df_profiled)
            print(f"✅ Sayım planı {len(count_plan)} personel için hazırlandı.")
        except Exception as e:
            print(f"❌ Sayım planı oluşturulurken hata: {str(e)}")
            count_plan = []
        _t['Sayım Planı'] = time.time() - _t0

        # --- 7. PROJEKSİYONLAR VE UI PAKETLEME ---
        print("🔮 Gelecek nöbet projeksiyonları...")
        _t0 = time.time()
        duty_projections = generate_duty_projections(
            df_merged, df_profiled, hi_info, ct_info, found_duty_dates
        )
        _t['Nöbet Projeksiyonu'] = time.time() - _t0

        _t0 = time.time(); cash_relief_list = calculate_cash_relief(df_profiled); _t['Nakit Optimizasyon'] = time.time() - _t0

        # ──────────────────────────────────────────────────────────
        # 🎁 UI PAKETLEME (BAŞLANGIÇ)
        # ──────────────────────────────────────────────────────────
        print("🎁 Veriler arayüz (UI) için paketleniyor...")
        df_profiled = df_profiled.replace([np.inf, -np.inf], 0).fillna(0)
        _t0_ui = time.time()

        ui_paket = prepare_ui_data(
            df_profiled, 
            projections=duty_projections, 
            cash_relief=cash_relief_list,
            analytics=dashboard_analytics
        )
        
        # ✨ Gün/Saat Analizi UI'ye ekle
        ui_paket['gun_saat_analizi'] = gun_saat_analizi

        # DEBUG: İLAÇ vs İLAÇ DIŞI DAĞILIMI
        print("\n🔍 DEBUG - İLAÇ vs İLAÇ DIŞI:")
        if 'gruplar' in ui_paket:
            ilac_sayisi = 0
            idu_sayisi = 0
            for grup in ui_paket['gruplar']:
                kategori_id = grup.get('kategori_id')
                
                if kategori_id is None or kategori_id == 0:
                    root_id = 2
                elif kategori_id in (1, 2, 3):
                    root_id = kategori_id
                elif kategori_id >= 4:
                    if 14 <= kategori_id <= 15:
                        root_id = 1
                    elif kategori_id >= 30:
                        root_id = 2
                    else:
                        root_id = 2
                else:
                    root_id = 2
                
                if root_id == 1:
                    ilac_sayisi += 1
                else:
                    idu_sayisi += 1
                
                if ilac_sayisi + idu_sayisi <= 10:
                    print(f"  Grup: {grup.get('lider_adi', 'Unknown')[:30]:<30} | kategori_id: {kategori_id} | root_id: {root_id}")
            
            print(f"\n  Toplam İLAÇ: {ilac_sayisi}")
            print(f"  Toplam İDU: {idu_sayisi}")
        
        # Sayım planını pakete ekle
        ui_paket['sayim_plani'] = count_plan 
        ui_paket['atc_analizi'] = atc_results
        ui_paket['esdeger_analizi'] = eq_results
        ui_paket['kademe_analizi'] = margin_results

        # --- STOĞU TÜKENMİŞ LİSTESİ (df_merged'den hesapla) ---
        try:
            if not df_merged.empty:
                # 1. En son işlem tarihine göre sıralayıp her barkodun en son kaydını alalım (güncel stok bilgisi için)
                df_sorted = df_merged.sort_values(by="satis_tarihi")
                df_latest_by_barcode = df_sorted.drop_duplicates(subset=["barkod"], keep="last")
                
                # 2. Stok değeri 0 veya negatif olanları filtreleyelim
                df_candidate = df_latest_by_barcode[df_latest_by_barcode["stok_adet"] <= 0]
                
                # 3. Son 1 hafta içinde satışı (pozitif satış adedi) olan barkodları belirleyelim
                max_date = df_merged['satis_tarihi'].max()
                one_week_ago = max_date - pd.Timedelta(days=7)
                sales_last_week = df_merged[(df_merged['satis_tarihi'] >= one_week_ago) & (df_merged['satis_adedi'] > 0)]
                sold_barcodes_last_week = set(sales_last_week['barkod'].unique())
                
                # 4. Son 1 hafta içinde satışı olan ve şu an stoğu tükenmiş olan adayları filtreleyelim
                df_sifir = df_candidate[df_candidate['barkod'].isin(sold_barcodes_last_week)].copy()
                
                ui_paket["stok_sifir_listesi"] = [
                    {
                        "barkod": str(row.get("barkod", "")),
                        "ad": str(row.get("master_urun_adi", row.get("lokal_urun_adi", ""))),
                        "depo": str(row.get("favori_depo", "")),
                        "aylik_hiz": round(float(row.get("satis_adedi", 0)) / 30, 2) if pd.notna(row.get("satis_adedi")) else 0.0,
                    }
                    for _, row in df_sifir.iterrows()
                ]
            else:
                ui_paket["stok_sifir_listesi"] = []
        except Exception as e:
            print(f"⚠️ Stoğu tükenen liste hatası: {e}")
            ui_paket["stok_sifir_listesi"] = []
        
        ui_paket['eczane_profili'] = {
            'konum': konum_tahmini,
            'detay': konum_detayi,
            'saatler': {'hi': hi_info, 'ct': ct_info}
        }

        # MF VERİ TAKİP LOGU
        test_bcs = ['8680150570121', '8699591700233']
        print("\n🔍 [TANI] PROFİLLER SONRASI MF KONTROLÜ:")
        for t_bc in test_bcs:
            row_check = df_profiled[df_profiled['barkod'] == t_bc]
            if not row_check.empty:
                mf_list = row_check.iloc[0].get('mf_baremleri')
                print(f"   📦 {t_bc} -> Bulunan MF Sayısı: {len(mf_list) if isinstance(mf_list, list) else 'Liste Değil'}")
                print(f"      • İçerik: {mf_list}")
        
        # PAYLOAD BOYUTUNU HESAPLA (DETAYLI BREAKDOWN)
        try:
            import json
            
            # Her component'in boyutunu hesapla
            component_sizes = {}
            
            # 1. GRUPLAR (Detaylı ürün verileri)
            if 'gruplar' in ui_paket:
                gruplar_json = json.dumps(ui_paket['gruplar'], ensure_ascii=False)
                gruplar_size = len(gruplar_json.encode('utf-8'))
                component_sizes['gruplar'] = gruplar_size
                
                # Gruplar içindeki hesap_aciklamasi (MF Logs)
                mf_logs_size = 0
                hesap_count = 0
                for grup in ui_paket['gruplar']:
                    for detay in grup.get('detaylar', []):
                        logs = detay.get('hesap_aciklamasi', [])
                        if logs:
                            mf_logs_size += len(json.dumps(logs, ensure_ascii=False).encode('utf-8'))
                            hesap_count += len(logs)
                
                component_sizes['mf_logs'] = mf_logs_size
                component_sizes['hesap_count'] = hesap_count
            
            # 2. ANALYTICS (Dashboard verileri)
            if 'analytics' in ui_paket:
                analytics_json = json.dumps(ui_paket['analytics'], ensure_ascii=False)
                analytics_size = len(analytics_json.encode('utf-8'))
                component_sizes['analytics'] = analytics_size
            
            # 3. ATC ANALİZİ
            if 'atc_analizi' in ui_paket:
                atc_json = json.dumps(ui_paket['atc_analizi'], ensure_ascii=False)
                atc_size = len(atc_json.encode('utf-8'))
                component_sizes['atc_analizi'] = atc_size
            
            # 4. EŞDEĞERİ ANALİZİ
            if 'esdeger_analizi' in ui_paket:
                esdeger_json = json.dumps(ui_paket['esdeger_analizi'], ensure_ascii=False)
                esdeger_size = len(esdeger_json.encode('utf-8'))
                component_sizes['esdeger_analizi'] = esdeger_size
            
            # 5. SAYIM PLANI
            if 'sayim_plani' in ui_paket:
                sayim_json = json.dumps(ui_paket['sayim_plani'], ensure_ascii=False)
                sayim_size = len(sayim_json.encode('utf-8'))
                component_sizes['sayim_plani'] = sayim_size
            
            # 6. KADEME ANALİZİ
            if 'kademe_analizi' in ui_paket:
                kademe_json = json.dumps(ui_paket['kademe_analizi'], ensure_ascii=False)
                kademe_size = len(kademe_json.encode('utf-8'))
                component_sizes['kademe_analizi'] = kademe_size
            
            # 7. NÖBET LİSTESİ
            if 'nobet_listesi' in ui_paket:
                nobet_json = json.dumps(ui_paket['nobet_listesi'], ensure_ascii=False)
                nobet_size = len(nobet_json.encode('utf-8'))
                component_sizes['nobet_listesi'] = nobet_size
            
            # 8. NAKİT OPTİMİZASYON
            if 'nakit_optimizasyon' in ui_paket:
                nakit_json = json.dumps(ui_paket['nakit_optimizasyon'], ensure_ascii=False)
                nakit_size = len(nakit_json.encode('utf-8'))
                component_sizes['nakit_optimizasyon'] = nakit_size
            
            # 9. STOK SIFIR LİSTESİ
            if 'stok_sifir_listesi' in ui_paket:
                stok_json = json.dumps(ui_paket['stok_sifir_listesi'], ensure_ascii=False)
                stok_size = len(stok_json.encode('utf-8'))
                component_sizes['stok_sifir_listesi'] = stok_size
            
            # 10. GÜN/SAAT ANALİZİ
            if 'gun_saat_analizi' in ui_paket:
                gun_saat_json = json.dumps(ui_paket['gun_saat_analizi'], ensure_ascii=False)
                gun_saat_size = len(gun_saat_json.encode('utf-8'))
                component_sizes['gun_saat_analizi'] = gun_saat_size
            
            # 11. ECZANE PROFİLİ
            if 'eczane_profili' in ui_paket:
                profil_json = json.dumps(ui_paket['eczane_profili'], ensure_ascii=False)
                profil_size = len(profil_json.encode('utf-8'))
                component_sizes['eczane_profili'] = profil_size
            
            # TOPLAM
            ui_json_str = json.dumps(ui_paket, ensure_ascii=False)
            total_size = len(ui_json_str.encode('utf-8'))
            mb_size = total_size / (1024 * 1024)
            kb_size = total_size / 1024
            
            # RAPOR YAZDIR
            print("\n" + "=" * 80)
            print("📊 PAYLOAD BOYUT BREAKDOWN")
            print("=" * 80)
            
            # Sıralı çıktı (büyükten küçüğe)
            sorted_components = sorted(component_sizes.items(), key=lambda x: x[1], reverse=True)
            
            for component, size in sorted_components:
                size_kb = size / 1024
                percentage = (size / total_size * 100) if total_size > 0 else 0
                bar = "█" * int(percentage / 5)
                
                if component == 'mf_logs':
                    print(f"  🔴 {component:<25} {size:>8} byte ({size_kb:>6.2f} KB) {percentage:>5.1f}% {bar}")
                elif component == 'gruplar':
                    print(f"  🔵 {component:<25} {size:>8} byte ({size_kb:>6.2f} KB) {percentage:>5.1f}% {bar}")
                else:
                    print(f"     {component:<25} {size:>8} byte ({size_kb:>6.2f} KB) {percentage:>5.1f}% {bar}")
            
            print("-" * 80)
            print(f"  {'TOPLAM':<25} {total_size:>8} byte ({kb_size:>6.2f} KB) 100.0%")
            print(f"  {'':<25} {mb_size:>8.2f} MB")
            print("=" * 80)
            
            # İstatistikler
            if 'hesap_count' in component_sizes:
                print(f"\n📈 İSTATİSTİKLER:")
                print(f"  • Toplam MF Log Satırı: {component_sizes['hesap_count']}")
                print(f"  • MF Logs Boyutu: {component_sizes['mf_logs']} byte ({component_sizes['mf_logs']/1024:.2f} KB)")
                print(f"  • MF'nin Toplam Payload'ı: {(component_sizes['mf_logs']/total_size*100):.1f}%")
                if 'gruplar' in component_sizes:
                    print(f"  • MF'nin Gruplar'daki Oranı: {(component_sizes['mf_logs']/component_sizes['gruplar']*100):.1f}%")
            
            if mb_size > 5.0:
                print(f"\n⚠️  DİKKAT: Payload boyutu çok büyük ({mb_size:.2f} MB)! UI tarafında kasmalar yaşanabilir.")
            elif mb_size > 2.0:
                print(f"\n⚡ UYARI: Payload {mb_size:.2f} MB oldu. Optimize etmeyi düşün.")
            else:
                print(f"\n✅ Payload boyutu iyi ({mb_size:.2f} MB).")
            
            print()
            
        except Exception as e:
            print(f"⚠️ Payload boyutu hesaplanırken hata oluştu: {e}")
        
        # 🎁 UI PAKETLEME SÜRESİNİ KAYDET
        _t['UI Paketleme'] = time.time() - _t0_ui

        # ──────────────────────────────────────────────────────────
        # ☁️ SUPABASE YÜKLEME (DEVREDİŞİ - YEREL MOD)
        # ──────────────────────────────────────────────────────────
        _t0_aws = time.time()
        print("☁️ Uygulama yerel modda çalışıyor (Bulut senkronizasyonu devre dışı).")
        _t['S3 Yükleme'] = time.time() - _t0_aws
        # ──────────────────────────────────────────────────────────
        
        print(f"✅ Analiz başarıyla tamamlandı. {len(df_profiled)} ürün grubu işlendi.")

        # ── PERFORMANS RAPORU ──────────────────────────────────────
        toplam = sum(_t.values())
        print("\n" + "─" * 52)
        print(f"  ⏱️  NEXUS PERFORMANS RAPORU")
        print("─" * 52)
        for islem, sure in _t.items():
            bar = "█" * int(sure / toplam * 20)
            print(f"  {islem:<22} {sure:>7.3f}s  {bar}")
        print("─" * 52)
        print(f"  {'TOPLAM':<22} {toplam:>7.3f}s")
        print("─" * 52 + "\n")
        print("="*60 + "\n")

        return ui_paket

if __name__ == "__main__":
    import requests
    import os
    import json

    print("\n" + "="*50)
    print("      NEXUS ANALİZ MOTORU")
    print("="*50)
    
    target_tenant = input("👉 Tenant ID girin (Örn: 34-Pilot): ").strip()
    
    print("\n🧠 Analiz başlatılıyor...")

    processor = NexusProcessor(target_tenant)
    sonuc = processor.run_full_analysis()

    print("✅ Analiz tamamlandı!")
    print(f"📊 Toplam ürün grubu: {len(sonuc.get('gruplar', []))}")
    annual = sonuc.get('analytics', {}).get('periods', {}).get('ANNUAL', {})
    print(f"💰 Toplam ciro: {annual.get('toplam_ciro', 0) or 0:,.2f} TL")