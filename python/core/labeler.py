# core/labeler.py
import pandas as pd
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from mapping import TAG_MAP
from config import LIMITLER

def safe_num(val):
    if val is None or str(val) == 'nan' or str(val) == 'None': return 0
    try: return float(val)
    except: return 0

def apply_labels(df):
    bugun = pd.Timestamp.now()

    if 'favori_depo' in df.columns:
        valid_rows = df[df['favori_depo'] != 'DEPO_YOK'].shape[0]
        print(f"⚙️  Analiz Ediliyor: {valid_rows} satırda favori depo verisi hazır alındı.")
    else:
        df['favori_depo'] = "Depo Belirsiz"

    def get_tags(row):
        tags =[]
        stok = safe_num(row.get('stok'))
        son_satis_gun = safe_num(row.get('gun_farki_son_satis'))
        omur_gun = safe_num(row.get('stok_omru_gun'))
        
        if stok > 0 and son_satis_gun > LIMITLER['OLU_STOK_GUN']:
            tags.append(TAG_MAP['OLU_STOK'])
            
        esik = LIMITLER['KRITIK_ES_GUN'] if safe_num(row.get('esdeger_id')) >= 0 else LIMITLER['KRITIK_TEK_GUN']
        if omur_gun < esik:
            tags.append(TAG_MAP['KRITIK_STOK'])
            
        if str(row.get('esdegersiz_ithal', '')).lower() in['evet', '1', 'true']:
            tags.append(TAG_MAP['ITHAL'])
        
        renk = str(row.get('recete_rengi', '')).upper()
        if renk in['KIRMIZI', 'YEŞİL']: tags.append(TAG_MAP['RENKLI_RECETE'])
        elif renk in ['TURUNCU', 'MOR']: tags.append(TAG_MAP['SORE_YUKSEK'])

        

        miad_raw = str(row.get('miad_raw', ''))
        if miad_raw and miad_raw != 'YOK' and miad_raw != 'None' and miad_raw != '':
            try:
                for entry in miad_raw.split('|'):
                    if not entry or entry == 'None': continue
                    parts = entry.split(':')
                    if len(parts) > 0:
                        # SQL'den gelen format: 20YY-MM-DD (örn: 2024-12-25)
                        exp_date = pd.to_datetime(parts[0], format='%Y-%m-%d', errors='coerce')
                        if pd.notnull(exp_date) and (exp_date - bugun).days <= (LIMITLER['MIAD_RISK_AY'] * 30):
                            tags.append(TAG_MAP['MIAD_RISKI'])
                            break
            except Exception as e:
                pass

        sureklilik = row.get('aylik_frekans', 0) >= 6
        guncellik = row.get('son_90_gun_islem', 0) >= 2
        if sureklilik and guncellik:
            tags.append(TAG_MAP['VAZGECILMEZ'])
            
        return tags

    df['tags'] = df.apply(get_tags, axis=1)
    return df