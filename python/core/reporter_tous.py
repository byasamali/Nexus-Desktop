# core/reporter_tous.py
import pandas as pd
import sqlite3
import os

def generate_missing_barcode_report(parquet_path, sqlite_path):
    """
    Master DB'de bulunmayan barkodları tespit eder ve frekans sırasına göre Parquet'e yazar.
    """
    try:
        if not os.path.exists(parquet_path):
            print("❌ Hata: Parquet dosyası bulunamadı.")
            return

        # 1. Verileri Yükle
        df_raw = pd.read_parquet(parquet_path)
        
        # Barkodları temizle ve stringe zorla
        df_raw['barkod'] = df_raw['barkod'].astype(str).str.strip()

        # 2. Master DB'deki Barkodları Çek
        conn = sqlite3.connect(sqlite_path)
        master_barcodes = pd.read_sql("SELECT barkod FROM products", conn)['barkod'].unique()
        conn.close()
        
        # Barkod setini temizle
        master_barcodes = set([str(b).strip() for b in master_barcodes])

        # 3. DB'de Olmayanları Filtrele
        # ~ (tilde) işareti "içinde olmayanlar" demektir
        missing_df = df_raw[~df_raw['barkod'].isin(master_barcodes)].copy()

        if missing_df.empty:
            print("✅ Tebrikler! Tüm barkodlar Master DB'de tanımlı.")
            return

        # 4. Frekans ve Detay Analizi
        # Aynı barkod, aynı isim ve aynı satış tipi için grupla
        report = missing_df.groupby(['barkod', 'lokal_urun_adi', 'satis_tipi']).size().reset_index(name='frekans')

        # 5. Sıralama (En çok satılandan en aza)
        report = report.sort_values(by='frekans', ascending=False)

        # 6. Kaydetme Yolu (Parquet formatında)
        output_path = os.path.join(os.path.dirname(parquet_path), "eksik_barkodlar_raporu.parquet")
        
        # Parquet'e yaz
        report.to_parquet(output_path, index=False)

        print("\n" + "🔍" + "—"*45 + "🔍")
        print(f"   EKSİK BARKOD RAPORU OLUŞTURULDU")
        print("—"*49)
        print(f"📍 Tespit Edilen Eksik Ürün Sayısı: {len(report)}")
        print(f"📍 Toplam Hareket (Frekans): {report['frekans'].sum()}")
        print(f"📂 Dosya Yolu: {output_path}")
        print("—"*49 + "\n")

        return output_path

    except Exception as e:
        print(f"❌ Rapor oluşturulurken hata: {str(e)}")
        return None