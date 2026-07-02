import os
import sys
import json
import argparse
import datetime
import pandas as pd

def format_date(val, today_str):
    if pd.isna(val) or not val:
        return today_str
    try:
        if hasattr(val, 'strftime'):
            return val.strftime('%Y-%m-%d')
        val_str = str(val).strip()
        if len(val_str) >= 10:
            return val_str[:10]
    except Exception:
        pass
    return today_str

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--gln', type=str, default='local')
    parser.add_argument('--depo', type=str, default='SELCUK')
    args = parser.parse_args()

    gln = args.gln
    depo_key = args.depo.upper().strip()
    base_dir = os.path.dirname(os.path.abspath(__file__))
    tenant_dir = os.path.join(base_dir, 'tenants', gln)
    
    excel_path = os.path.join(tenant_dir, 'Kampanya Listesi.xlsx')
    if not os.path.exists(excel_path):
        # Fallback to local
        tenant_dir = os.path.join(base_dir, 'tenants', 'local')
        excel_path = os.path.join(tenant_dir, 'Kampanya Listesi.xlsx')

    if not os.path.exists(excel_path):
        print(json.dumps({"status": "error", "message": f"Kampanya Listesi.xlsx dosyası bulunamadı: {excel_path}"}))
        sys.exit(1)

    try:
        df = pd.read_excel(excel_path)
    except Exception as e:
        print(json.dumps({"status": "error", "message": f"Excel dosyası okunamadı: {str(e)}"}))
        sys.exit(1)

    # Kolonların varlığını kontrol et
    required = ['BARKODU', 'ILACKODU', 'ILACADI', 'FIYAT', 'KAMPANYA BITIS TARIHI', 'STOKDURUMU']
    missing = [c for c in required if c not in df.columns]
    if missing:
        print(json.dumps({"status": "error", "message": f"Excel dosyasında eksik kolonlar var: {', '.join(missing)}"}))
        sys.exit(1)

    cache_path = os.path.join(base_dir, 'tenants', gln, 'query_cache.json')
    
    # Otomatik migrasyon ve önbelleği yükle
    cache = {}
    if os.path.exists(cache_path):
        try:
            with open(cache_path, 'r', encoding='utf-8') as f:
                raw_cache = json.load(f)
            
            # Flatten raw_cache
            for barcode, val in raw_cache.items():
                if isinstance(val, dict):
                    # Check if there are nested warehouse keys (e.g. SELCUK, AS_ECZA)
                    nested_keys = [k for k, v in val.items() if isinstance(v, dict) and 'mf_baremleri' in v]
                    if nested_keys:
                        # Use the first one or merge them
                        cache[barcode] = val[nested_keys[0]]
                    else:
                        cache[barcode] = val
                else:
                    cache[barcode] = val
        except Exception:
            cache = {}

    today_str = datetime.date.today().strftime('%Y-%m-%d')
    count = 0

    for _, row in df.iterrows():
        barcode_raw = row['BARKODU']
        if pd.isna(barcode_raw):
            continue
        
        barcode = str(barcode_raw).strip()
        if not barcode:
            continue
            
        # Float olarak okunan barkodları temizle (örn. 8680381900193.0)
        if barcode.endswith('.0'):
            barcode = barcode[:-2]
        
        ilac_kodu = str(row['ILACKODU']).strip()
        if ilac_kodu.endswith('.0'):
            ilac_kodu = ilac_kodu[:-2]

        fiyat_val = 0.0
        try:
            fiyat_val = float(row['FIYAT'])
        except Exception:
            pass

        stok_durumu = 0
        try:
            sd = int(row['STOKDURUMU'])
            if sd in [1, 2]:
                stok_durumu = 100
        except Exception:
            pass

        # MF Baremlerini parse et
        mf_baremleri = []
        net_fiyatlar = []
        for i in range(1, 8):
            adet_col = f'ADET{i}'
            mf_col = f'MF{i}'
            if adet_col in df.columns and mf_col in df.columns:
                try:
                    adet_val = row[adet_col]
                    mf_val = row[mf_col]
                    if not pd.isna(adet_val) and not pd.isna(mf_val):
                        adet_val = float(adet_val)
                        mf_val = float(mf_val)
                        if adet_val > 0 and mf_val > 0:
                            mf_str = f"{int(adet_val)}+{int(mf_val)}"
                            mf_baremleri.append(mf_str)
                            
                            # Net fiyat hesapla: fiyat * adet / (adet + mf)
                            net_price = fiyat_val * adet_val / (adet_val + mf_val)
                            net_fiyatlar.append(f"{net_price:.2f}".replace('.', ','))
                except Exception:
                    pass

        # Kampanya başlangıç ve bitiş tarihleri
        start_date = format_date(row['KAMPANYA BASLANGIC TARIHI'], today_str)
        exp_date = format_date(row['KAMPANYA BITIS TARIHI'], today_str)

        # Tavsiye edilen satış fiyatını parse et
        tavsiye_edilen_psf = 0.0
        if 'TAVSIYEEDILENSATISFIYATI' in df.columns:
            try:
                tpsf = row['TAVSIYEEDILENSATISFIYATI']
                if not pd.isna(tpsf):
                    tavsiye_edilen_psf = float(tpsf)
            except Exception:
                pass

        # Etiket fiyatını parse et
        etiket_fiyat = 0.0
        if 'ETIKETFIYATI' in df.columns:
            try:
                etf = row['ETIKETFIYATI']
                if not pd.isna(etf):
                    etiket_fiyat = float(etf)
            except Exception:
                pass

        # Hangisi yüksekse onu PSF olarak belirle
        resolved_psf = max(etiket_fiyat, tavsiye_edilen_psf)
        if resolved_psf <= 0:
            resolved_psf = fiyat_val  # Fallback

        # Önbelleğe yaz veya güncelle
        cache[barcode] = {
            "date": exp_date,
            "start_date": start_date,
            "stok": stok_durumu,
            "fiyat_depocu": fiyat_val,
            "fiyat_etiket": round(resolved_psf, 2),
            "tavsiye_edilen_psf": round(resolved_psf, 2),
            "mf_baremleri": mf_baremleri,
            "net_fiyatlar": net_fiyatlar,
            "kod": ilac_kodu,
            "depo": depo_key
        }
        count += 1

    # Önbellek dosyasını kaydet
    try:
        os.makedirs(os.path.dirname(cache_path), exist_ok=True)
        with open(cache_path, 'w', encoding='utf-8') as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(json.dumps({"status": "error", "message": f"Önbellek dosyası kaydedilemedi: {str(e)}"}))
        sys.exit(1)

    print(json.dumps({"status": "success", "count": count}))

if __name__ == '__main__':
    main()
