# core/atc_analyzer.py
import pandas as pd

def analyze_atc_trends(df):
    """
    İlaç kategorisindeki ürünlerin ATC4 bazlı etki ve sürüm analizini yapar.
    """
    print("\n🧬 ATC TREND ANALİZİ (İlaç Grubu)...")
    
    # 1. Filtreleme: Sadece ilaçlar ve ATC kodu olanlar
    mask = (df['root_id'] == 1) & (df['atc_kodu'].notna()) & (df['atc_kodu'] != '')
    df_ilac = df[mask].copy()
    
    if df_ilac.empty:
        print("⚠️ Analiz için yeterli ATC verisi bulunamadı.")
        return

    # 2. ATC4 Seviyesine İndirgeme (İlk 4 karakter)
    df_ilac['atc4'] = df_ilac['atc_kodu'].str[:4]
    
    # 3. Metrik Hesaplama
    # Etki (Ciro payı için ara değer)
    df_ilac['ciro_etki'] = df_ilac['net_tutar']
    
    # ATC4 bazlı gruplama
    atc_stats = df_ilac.groupby('atc4').agg({
        'satis_adedi': 'sum',
        'ciro_etki': 'sum',
        'barkod': 'nunique' # O grupta kaç farklı barkod satılmış
    }).reset_index()

    # 4. ETKİ ŞAMPİYONLARI (Ciroya göre ilk 10)
    top_impact = atc_stats.sort_values('ciro_etki', ascending=False).head(20)
    
    # 5. SÜRÜM ŞAMPİYONLARI (Adede göre ilk 10)
    top_volume = atc_stats.sort_values('satis_adedi', ascending=False).head(20)

    # LOGLAMA
    print("-" * 50)
    print(f"{'ATC4':<7} | {'ETKİ ŞAMPİYONLARI (Ciro Bazlı)':<30}")
    print("-" * 50)
    for i, row in enumerate(top_impact.itertuples(), 1):
        print(f"{i}. {row.atc4:<5} | Ürün Çeşitliliği: {row.barkod:<3} | Sıralama Puanı: {int(row.ciro_etki/1000)}")

    print("\n" + "-" * 50)
    print(f"{'ATC4':<7} | {'SÜRÜM ŞAMPİYONLARI (Adet Bazlı)':<30}")
    print("-" * 50)
    for i, row in enumerate(top_volume.itertuples(), 1):
        print(f"{i}. {row.atc4:<5} | Toplam Kutu: {int(row.satis_adedi):<5} | Ürün Çeşitliliği: {row.barkod}")
    
    print("-" * 50)

    # Sonuçları UI'a paslamak istersen bir sözlük dönebilirsin
    return {
        "etki": top_impact[['atc4', 'ciro_etki']].to_dict('records'),
        "surum": top_volume[['atc4', 'satis_adedi']].to_dict('records')
    }