# core/margin_analyzer.py
import pandas as pd

def analyze_margins(df):
    """
    İlaç Fiyat Kararnamesi Kademeleri Analizi.
    
    KURALLAR:
    1. Sadece root_id == 1 olanlar (ilaçlar).
    2. isf > 0 VE kamu_toplam > 0 olanlar (ikisi de dolu olmalı).
    3. Ciro = kamu_toplam (zaten hesaplanmış).
    """
    
    # 1. Filtreleme: İlaç Kategorisi + Pozitif Fiyat Verileri
    mask = (df['root_id'] == 1) & (df['isf'] > 0) & (df['kamu_toplam'] > 0)
    
    df_ilac = df[mask].copy()
    
    if df_ilac.empty:
        return { 
            "error": "Kriterlere uygun (ilac kategorisi ve tam fiyat verisi) ürün bulunamadı.", 
            "dağılım": {} 
        }

    # 2. Ciro (kamu_toplam zaten ciro değeri)
    df_ilac['satir_ciro'] = df_ilac['kamu_toplam']

    # 3. Kademe Tanımlama (isf baremlerine göre)
    def get_tier(price):
        if price <= 383.43: return "K1"
        elif price <= 768.03: return "K2"
        else: return "K3"

    df_ilac['kademe'] = df_ilac['isf'].apply(get_tier)
    
    # 4. İstatistikleri Grupla
    stats = df_ilac.groupby('kademe').agg({
        'satis_adedi': 'sum', 
        'satir_ciro': 'sum'
    })
    
    total_kutu = stats['satis_adedi'].sum()
    total_ciro = stats['satir_ciro'].sum()

    # Yasal Eczacı Kâr Oranları
    kademeler = {
        "K1": {"ad": "1. Kademe (383₺ Altı)", "ecz_kar": 28},
        "K2": {"ad": "2. Kademe (383-768₺)", "ecz_kar": 18},
        "K3": {"ad": "3. Kademe (768₺ Üstü)", "ecz_kar": 13}
    }

    res = {}
    print("\n💰 [KÂRLILIK RÖNTGENİ - SADECE İLAÇ GRUBU]")
    print("-" * 55)
    print(f"{'KADEME':<25} | {'KUTU %':<8} | {'CİRO %':<8} | {'KÂR'}")
    print("-" * 55)

    for k_id, k_info in kademeler.items():
        kutu = stats.loc[k_id, 'satis_adedi'] if k_id in stats.index else 0
        ciro = stats.loc[k_id, 'satir_ciro'] if k_id in stats.index else 0
        
        p_kutu = round((kutu / total_kutu * 100), 1) if total_kutu > 0 else 0
        p_ciro = round((ciro / total_ciro * 100), 1) if total_ciro > 0 else 0
        
        # Konsol Logu
        print(f"{k_info['ad']:<25} | %{p_kutu:<7} | %{p_ciro:<7} | %{k_info['ecz_kar']}")
        
        # UI Paketi
        res[k_id] = {
            "etiket": k_info["ad"],
            "yuzde_kutu": p_kutu,
            "yuzde_ciro": p_ciro,
            "eczacı_kar_marjı": k_info["ecz_kar"]
        }
    
    print("-" * 55)
    print(f"Toplam Analiz Edilen: {int(total_kutu)} İlaç Kutusu | {total_ciro:,.2f} TL Kamu Cirosu")
    print("-" * 55 + "\n")

    return {
        "toplam_ilac_kutu": int(total_kutu),
        "toplam_ilac_ciro": round(total_ciro, 2),
        "dağılım": res
    }