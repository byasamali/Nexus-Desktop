# core/report_nocategory.py
import pandas as pd
import os

def generate_nocategory_report(df_normalized, output_dir):
    """
    İlaç dışı ana kategorisinde (root_id=3) olup henüz alt kategoriye
    ayrışmamış ürünleri raporlar. Yani kategori_id == 3 olanlar:
    ana kolda takılı kalmış, alt kategoriye inmemiş ürünler.
    """
    try:
        # 1. Filtreleme Mantığı
        # kategori_id == 3 → doğrudan ilaç dışı ana kategorisinde, alt kategoriye girmemiş
        mask = df_normalized['kategori_id'].astype(str).str.split('.').str[0] == '2'
        df_no_cat = df_normalized[mask].copy()

        if df_no_cat.empty:
            print("✅ Alt kategoriye ayrışmamış ilaç dışı ürün bulunamadı.")
            return

        # 2. Frekans Analizi
        # Master'daki ismi kullanıyoruz (yoksa lokal ismi)
        report = df_no_cat.groupby(['barkod', 'master_urun_adi']).size().reset_index(name='frekans')

        # 3. Sıralama (En çok hareket görenden en aza)
        report = report.sort_values(by='frekans', ascending=False)

        # 4. Kaydetme (Parquet formatında)
        output_path = os.path.join(output_dir, "kategorisiz_urunler_raporu.parquet")
        report.to_parquet(output_path, index=False)

        print("\n" + "🏷️" + "—"*45 + "🏷️")
        print(f"   İLAÇ DIŞI KATEGORİSİZ ÜRÜN RAPORU OLUŞTURULDU")
        print("—"*49)
        print(f"📍 Alt Kategoriye Girmemiş Ürün Sayısı: {len(report)}")
        print(f"📍 Toplam Hareket: {report['frekans'].sum()}")
        print(f"📂 Dosya Yolu: {output_path}")
        print("—"*49 + "\n")

        return output_path

    except Exception as e:
        print(f"❌ Kategori raporu oluşturulurken hata: {str(e)}")
        return None