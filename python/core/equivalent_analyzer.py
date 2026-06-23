# core/equivalent_analyzer.py
import pandas as pd

def analyze_equivalent_trends(df):
    """
    İlaç kategorisindeki ürünlerin Eşdeğer Kodları (Molekül) bazlı analizini yapar.
    """
    print("\n💊 EŞDEĞER GRUP ANALİZİ (Molekül Bazlı)...")
    
    # Sütun kontrolü (Hata önleme)
    required_cols = ['satis_adedi', 'lokal_psf', 'net_tutar', 'esdeger_kodu', 'root_id']
    for col in required_cols:
        if col not in df.columns:
            print(f"⚠️ Hata: Veri setinde '{col}' sütunu bulunamadı.")
            return

    # 1. Filtreleme: İlaçlar ve Geçerli Eşdeğer Kodu olanlar
    # 1. Filtreleme: İlaçlar ve Geçerli Eşdeğer Kodu olanlar
    mask = (df['root_id'] == 1) & (df['esdeger_kodu'].notna()) & (df['esdeger_kodu'] != '')
    df_ilac = df[mask].copy()
    
    if df_ilac.empty:
        print("⚠️ Analiz için eşdeğer kodu verisi bulunamadı.")
        return

    # 2. Metrik Hesaplama
    df_ilac['ciro_etki'] = df_ilac['net_tutar']
    
    # Eşdeğer kodu bazlı gruplama
    eq_stats = df_ilac.groupby('esdeger_kodu').agg({
        'satis_adedi': 'sum',
        'ciro_etki': 'sum',
        'barkod': 'nunique'
    }).reset_index()

    # 3. ETKİ ŞAMPİYONLARI (Ciroya göre ilk 10)
    top_impact = eq_stats.sort_values('ciro_etki', ascending=False).head(20)
    
    # 4. SÜRÜM ŞAMPİYONLARI (Adede göre ilk 10)
    top_volume = eq_stats.sort_values('satis_adedi', ascending=False).head(20)

    # LOGLAMA
    print("-" * 50)
    print(f"{'KOD':<8} | {'ETKİ ŞAMPİYONLARI (Ciro Bazlı)':<30}")
    print("-" * 50)
    for i, row in enumerate(top_impact.itertuples(), 1):
        print(f"{i}. {row.esdeger_kodu:<5} | Çeşitlilik: {row.barkod:<3} | Puan: {int(row.ciro_etki/1000)}")

    print("\n" + "-" * 50)
    print(f"{'KOD':<8} | {'SÜRÜM ŞAMPİYONLARI (Adet Bazlı)':<30}")
    print("-" * 50)
    for i, row in enumerate(top_volume.itertuples(), 1):
        print(f"{i}. {row.esdeger_kodu:<5} | Çeşitlilik: {row.barkod:<3} | Kutu: {int(row.satis_adedi)}")
    
    print("-" * 50)

    return {
        "etki": top_impact[['esdeger_kodu', 'ciro_etki']].to_dict('records'),
        "surum": top_volume[['esdeger_kodu', 'satis_adedi']].to_dict('records')
    }