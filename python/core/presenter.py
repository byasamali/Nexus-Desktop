# core/presenter.py

import re
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import mapping
import pandas as pd
import numpy as np

def slugify(text):
    if not text or str(text) == 'None' or str(text).strip() == '':
        return 'yok'
    text = str(text).lower().strip()
    tr_map = {'ş': 's', 'ç': 'c', 'ö': 'o', 'ğ': 'g', 'ü': 'u', 'ı': 'i', ' ': '-'}
    for tr, en in tr_map.items():
        text = text.replace(tr, en)
    text = re.sub(r'[^a-z0-9-]', '', text)
    return re.sub(r'-+', '-', text).strip('-')

def safe_num(val):
    try:
        if pd.isna(val) or val is None: return 0
        return float(val)
    except:
        return 0




def prepare_ui_data(df, projections=None, cash_relief=None, sayim_plani=None, analytics=None):

    print("\n" + "="*50)
    if analytics and 'periods' in analytics:
        annual = analytics['periods'].get('ANNUAL') or analytics['periods'].get('annual')
        if annual:
            print("✅ DEBUG: Python tarafında Şampiyonlar Listesi hazır!")
            print(f"📊 İlk 5 Kutu Şampiyonu: {annual.get('top_kutu', [])[:5]}")
        else:
            print("❌ DEBUG: 'ANNUAL' anahtarı analytics['periods'] içinde yok!")
    else:
        print("❌ DEBUG: Analytics objesi prepare_ui_data fonksiyonuna Hiç Gelmiyor!")
    print("="*50 + "\n")

    df = df.copy()
    df = df.replace({np.nan: None})
    df.index.name = None
    if hasattr(df.index, 'names'):
        df.index.names = [None] * len(df.index.names)
    df = df.loc[:, ~df.columns.duplicated()]
    if 'esdeger_id' in df.columns:
        df.index.names = [None] * df.index.nlevels

    # ── 1. MENÜLER ───────────────────────────────────────────
    # Artık genel_kategori string'i yerine kategori_id üzerinden
    # UI zaten categoryMap.ts'den her şeyi biliyor
    # Sadece renk sözlüğünü gönderiyoruz
    renk_sozlugu = {}
    if 'recete_rengi' in df.columns:
        for r in df['recete_rengi'].dropna().unique():
            if r and str(r).lower() != 'none':
                renk_sozlugu[slugify(r)] = str(r).upper()

    # ── 2. GRUPLAR ───────────────────────────────────────────
    results = []

    if 'esdeger_id' in df.columns:
        df['is_lider'] = df.groupby('esdeger_id')['hibrit_hiz'].transform(
            lambda x: x == x.max()
        )

        for gid, grup in df.groupby('esdeger_id'):
            toplam_oneri = grup['oneri_stratejik'].fillna(0).sum()

            # Kritik Puan
            total_items = len(grup)
            out_of_stock_items = len(grup[grup['stok'] <= 0])
            grup_carpani = 1 + (out_of_stock_items / max(1, total_items)) * 5

            grup_stok_toplam = grup['stok'].fillna(0).sum()
            grup_hiz_toplam = grup['hibrit_hiz'].fillna(0).sum()

            max_kritik_puan = 0
            for _, row in grup.iterrows():
                v = safe_num(row.get('hibrit_hiz', 0))
                f = safe_num(row.get('aylik_frekans', 0))
                s = safe_num(row.get('stok', 0))

                t_skoru = (v * 30 * 0.4) + (f * 0.6)
                if s <= 0:
                    urgency = 100 + t_skoru
                else:
                    urgency = t_skoru / (s + 0.1)

                item_puan = urgency * grup_carpani
                if item_puan > max_kritik_puan:
                    max_kritik_puan = item_puan

            if grup_stok_toplam <= 0 and grup_hiz_toplam > 0:
                max_kritik_puan += 10000

            # Tag Pool
            tag_pool = set()
            for row_tags in grup['tags']:
                if isinstance(row_tags, list):
                    for t in row_tags:
                        if t != 'mr':
                            tag_pool.add(t)
                            
            if toplam_oneri > 0:
                tag_pool.add('oneri')

            # Lider
            lider_row = grup[grup['is_lider']].iloc[0] if grup['is_lider'].any() else grup.iloc[0]
            # genel_kategori artık gönderilmiyor - frontend categoryMap'ten bulacak

            # Reçete rengi tag'i
            if 'recete_rengi' in lider_row:
                recete = lider_row.get('recete_rengi')
                if recete and str(recete).lower() not in ('none', ''):
                    tag_pool.add(slugify(str(recete)))

            # Detaylar
            # ── grup_analizi ve ek_tavsiye artık detaylar'dan çıkarıldı ──
            # Grup seviyesinde bir kez tutulur → payload küçülür
            grup_analizi_text = None
            ek_tavsiye_text = None

            allowed_keys = list(mapping.VAR_MAP.values()) + ['log_html', 'mf_baremleri']

            detaylar = []
            for index, row in grup.iterrows():
                raw_dict = row.rename(index=mapping.VAR_MAP).to_dict()

                d = {}
                
                # ✅ SADECE KATEGORİ_ID YETERLI - Frontend categoryMap'ten root_id'yi çıkarır
                # Pandas Series'den direkt eriş
                try:
                    kategori_id = row['kategori_id']
                except (KeyError, TypeError):
                    kategori_id = None
                
                if kategori_id is not None and pd.notna(kategori_id):
                    d['kategori_id'] = int(kategori_id)
                else:
                    d['kategori_id'] = None

                # log_html: HTML yerine ham liste gönder, UI render eder
                hesap = row.get('hesap_aciklamasi') if hasattr(row, 'get') else None
                if isinstance(hesap, list) and len(hesap) > 0:
                    d['log_html'] = hesap  # string değil, liste olarak gönder
                elif hesap and str(hesap) not in ('', 'None'):
                    d['log_html'] = str(hesap)

                # grup_analizi / ek_tavsiye: ilk üründen al, sonra grup seviyesine koy
                if grup_analizi_text is None:
                    grup_analizi_text = row.get('grup_yorumu', None) if hasattr(row, 'get') else None
                if ek_tavsiye_text is None:
                    ek_tavsiye_text = row.get('stratejik_tavsiye', None) if hasattr(row, 'get') else None

                # Sadece kullanılan alanları aktar (v70 haricinde - zaten üstte ekledik)
                for key, value in raw_dict.items():
                    if key == 'v70':  # kategori_id - zaten ekledik
                        continue
                    if key not in allowed_keys:
                        continue
                    if value is None or value == "":
                        continue
                    if isinstance(value, (list, dict, tuple)):
                        if len(value) == 0:
                            continue
                    elif pd.isna(value):
                        continue
                    d[key] = value

                detaylar.append(d)

            results.append({
                'kategori_id': int(lider_row.get('kategori_id')) if pd.notna(lider_row.get('kategori_id')) else None,
                'lider_adi': lider_row.get('urun_adi', 'Bilinmeyen Ürün'),
                'toplam_oneri': int(toplam_oneri),
                'kritik_puan': round(max_kritik_puan, 2),
                'tags': " ".join(filter(None, tag_pool)),
                # grup_analizi ve ek_tavsiye artık grup seviyesinde, detaylar'da değil
                'grup_analizi': grup_analizi_text or [],
                'ek_tavsiye': ek_tavsiye_text or None,
                'detaylar': detaylar
            })

    # ── 3. BAĞIMSIZ LİSTELER ─────────────────────────────────
    nobet_sonuc = []
    if projections:
        for p in projections:
            p_clean = {
                k: (0 if isinstance(v, float) and pd.isna(v) else v)
                for k, v in p.items()
            }
            if p_clean.get('ihtiyac', 0) > 0 or p_clean.get('frekans', 0) > 0.6:
                nobet_sonuc.append(p_clean)

    olu_stok_listesi = []
    if 'tags' in df.columns:
        os_mask = df['tags'].apply(
            lambda x: 'os' in x if isinstance(x, list) else False
        )
        for _, row in df[os_mask].iterrows():
            stok_adet = safe_num(row.get('stok', 0))
            dsf_fiyat = safe_num(row.get('dsf', 0))
            olu_stok_listesi.append({
                'ad': row.get('urun_adi'),
                'barkod': row.get('barkod'),
                'stok': int(stok_adet),
                'son_satis': int(safe_num(row.get('gun_farki_son_satis', 0))),
                'deger': f"{int(stok_adet * dsf_fiyat)} TL"
            })

    miad_risk_listesi = []
    if 'tags' in df.columns:
        mr_mask = df['tags'].apply(
            lambda x: 'mr' in x if isinstance(x, list) else False
        )
        for _, row in df[mr_mask].iterrows():
            stok_adet = safe_num(row.get('stok', 0))
            psf_fiyat = safe_num(row.get('psf', 0))
            miad_risk_listesi.append({
                'ad': row.get('urun_adi', 'Bilinmeyen'),
                'barkod': row.get('barkod', '-'),
                'stok': int(stok_adet),
                'miad': row.get('miad_raw', 'Belirsiz'),
                'tutar': f"{int(stok_adet * psf_fiyat)} TL"
            })

    clean_cash_relief = []
    if cash_relief:
        for item in cash_relief:
            clean_item = {
                k: (0 if isinstance(v, float) and pd.isna(v) else v)
                for k, v in item.items()
            }
            clean_cash_relief.append(clean_item)

    # 🔍 KATEGORİ_ID İSTATİSTİKLERİ
    print("\n" + "="*80)
    print("📊 KATEGORİ_ID İSTATİSTİKLERİ (UI'ye Giden Ürünler)")
    print("="*80)
    
    kategori_bos = []
    kategori_dolu = []
    for grup in results:
        for detay in grup.get('detaylar', []):
            if detay.get('kategori_id') is None or detay.get('kategori_id') == 0:
                kategori_bos.append({
                    'barkod': detay.get('v1'),  # barkod
                    'urun': detay.get('v2'),     # ürün adı
                    'kategori_id': detay.get('kategori_id')
                })
            else:
                kategori_dolu.append({
                    'barkod': detay.get('v1'),
                    'urun': detay.get('v2'),
                    'kategori_id': detay.get('kategori_id')
                })
    
    toplam_giden = len(kategori_bos) + len(kategori_dolu)
    print(f"✅ Kategori_id Dolu: {len(kategori_dolu)}")
    print(f"❌ Kategori_id Boş: {len(kategori_bos)}")
    print(f"📦 Toplam Giden Ürün: {toplam_giden}")
    
    if kategori_bos:
        print(f"\n⚠️  KATEGORİSİZ ÜRÜNLER (İlk 10):")
        for i, item in enumerate(kategori_bos[:10], 1):
            print(f"   {i}. {item['barkod']} | {item['urun'][:40]:<40} | kategori_id: {item['kategori_id']}")
    
    print("="*80 + "\n")

    return {
        'gruplar': sorted(results, key=lambda x: x['toplam_oneri'], reverse=True),
        'nobet_listesi': nobet_sonuc,
        'nakit_optimizasyon': clean_cash_relief,
        'olu_stok_listesi': olu_stok_listesi,
        'miad_risk_listesi': miad_risk_listesi,
        'sayim_plani': sayim_plani if sayim_plani else [],
        'analytics': analytics if analytics else {},
        'menuler': {
            # kategoriler artık gönderilmiyor — UI categoryMap.ts'den biliyor
            'renkler': renk_sozlugu
        }
    }