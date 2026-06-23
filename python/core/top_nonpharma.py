# core/top_nonpharma.py
import pandas as pd
import os

def generate_top_nonpharma_report(df_merged, tenant_dir, top_n=1000):
    """
    İlaç dışı ürünlerin en çok satılanlarını tespit eder ve parquet'e kaydeder.
    Cross-sell analizi, stok optimizasyonu ve kategori trend analizi için kritik veri.
    
    Args:
        df_merged: Master DB ile birleştirilmiş ana dataframe
        tenant_dir: Tenant klasörü yolu
        top_n: Kaç ürün listeleneceği (default: 1000)
    """
    try:
        # 1. İlaç dışı ürünleri filtrele (root_id != 1)
        df_nonpharma = df_merged[df_merged['root_id'] != 1].copy()

        if df_nonpharma.empty:
            print("⚠️ İlaç dışı ürün bulunamadı.")
            return None

        # 2. Barkod bazında topla
        grouped = df_nonpharma.groupby(['barkod', 'lokal_urun_adi']).agg({
            'satis_adedi': 'sum',
            'satir_ciro': 'sum',
            'stok_adet': 'last'  # Son stok durumu
        }).reset_index()

        # 3. Sıralama (satış adedine göre)
        grouped = grouped.sort_values('satis_adedi', ascending=False).head(top_n)

        # 4. Kolon isimlendirme
        grouped.columns = ['barkod', 'urun_adi', 'toplam_satis_adet', 'toplam_ciro', 'guncel_stok']

        # 5. İstatistikler
        toplam_adet = grouped['toplam_satis_adet'].sum()
        toplam_ciro = grouped['toplam_ciro'].sum()

        # 6. Kaydetme
        output_path = os.path.join(tenant_dir, f"top{top_n}_nonpharma.parquet")
        grouped.to_parquet(output_path, index=False)

        # 7. Rapor
        print("\n" + "🛒" + "—"*50 + "🛒")
        print(f"   TOP {top_n} İLAÇ DIŞI ÜRÜN RAPORU OLUŞTURULDU")
        print("—"*54)
        print(f"📍 Toplam Kayıt: {len(grouped)} ürün")
        print(f"📍 Toplam Satış Adedi: {toplam_adet:,.0f}")
        print(f"📍 Toplam Ciro: {toplam_ciro:,.2f} TL")
        print(f"📂 Dosya Yolu: {output_path}")
        print("—"*54 + "\n")

        return output_path

    except Exception as e:
        print(f"❌ Top ilaç dışı rapor oluşturulurken hata: {str(e)}")
        import traceback
        traceback.print_exc()
        return None
