# core/cash_optimizer.py
import math

def safe_float(val, default=0.0):
    """Veriyi güvenli şekilde sayıya çevirir."""
    if val is None or str(val).strip() == "" or str(val) == "None":
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default

def calculate_cash_relief(df, target_days=30):
    """
    Stok seviyesini 'target_days' gününe optimize eder.
    Fazlalık stokları ve serbest kalacak nakit miktarını hesaplar.
    """
    relief_list = []
    
    for _, row in df.iterrows():
        # Verileri sayıya zorluyoruz (Zırhlama)
        hiz = safe_float(row.get('hibrit_hiz'), 0.0)
        mevcut_stok = safe_float(row.get('stok'), 0.0)
        dsf = safe_float(row.get('dsf'), 0.0)
        
        # İdeal Stok: Kullanıcının istediği gün kadar yetecek stok
        ideal_stok = math.ceil(hiz * target_days)
        
        # Fazlalık Stok
        fazlalik_adet = max(0, mevcut_stok - ideal_stok)
        
        # Serbest Kalacak Nakit
        kilitli_nakit = fazlalik_adet * dsf
        
        # Sadece fazlalığı olan ve fiyatı 0'dan büyük olanları al
        if fazlalik_adet > 0 and dsf > 0:
            relief_list.append({
                'barkod': row['barkod'],
                'ad': row['urun_adi'],
                'mevcut_stok': int(mevcut_stok),
                'ideal_stok': ideal_stok,
                'fazlalik': int(fazlalik_adet),
                'kilitli_nakit': round(kilitli_nakit, 2),
                'stok_omru': int(mevcut_stok / (hiz + 0.0001))
            })

    # En çok nakit bağlayan üründen en az olana göre sırala
    relief_list = sorted(relief_list, key=lambda x: x['kilitli_nakit'], reverse=True)
    return relief_list