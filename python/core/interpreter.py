# core/interpreter.py
import sys
import os
import math
import pandas as pd
import numpy as np
from config import KATSAYILAR, STRATEJI
from mapping import TAG_MAP

def safe_float(val, default=0.0):
    if val is None or str(val).strip() == "": return default
    try: return float(val)
    except (ValueError, TypeError): return default

def calculate_vade_tarihi(base_date, ay_offset=3):
    # Pandas DateOffset yerine daha hızlı bir metod
    target = base_date + pd.DateOffset(months=ay_offset)
    return target.replace(day=15)

def apply_strategy(df):
    df = df.copy()
    if df.index.name in ['esdeger_id', 'barkod']:
        df.index.name = None
    df = df.loc[:, ~df.columns.duplicated()]

    # --- 1. SABİT DEĞERLERİ VE STRATEJİLERİ CACHE'LE (HIZ İÇİN) ---
    bugun = pd.Timestamp.now().normalize()
    ay_sonu = (bugun + pd.offsets.MonthEnd(0))
    kalan_gun_bu_ay = (ay_sonu - bugun).days + 1
    depo_vade_bugun = calculate_vade_tarihi(bugun, 3)
    
    enflasyon_oran = safe_float(STRATEJI.get('AYLIK_ENFLASYON', 0.04)) / 30.0
    hedef_gun_std = safe_float(STRATEJI.get('HEDEF_GUN', 30))
    ucuz_limit = STRATEJI['UCUZ_URUN_LIMIT']
    pahali_limit = STRATEJI['PAHALI_URUN_LIMIT']
    max_stok_gun = safe_float(STRATEJI.get('MAX_STOK_GUN', 180))
    guvenlik_stogu = safe_float(STRATEJI.get('GUVENLIK_STOGU', 7))
    hedef_gun_dinamik = max(kalan_gun_bu_ay, guvenlik_stogu)
    mf_puan_esigi = safe_float(STRATEJI.get('MF_PUAN_FARKI', 0.05))

    # --- 2. SİMÜLASYON İÇİN TAKVİM ÖN-HAZIRLIĞI ---
    # Her satırda tarih nesnesi oluşturmamak için 12 aylık bir takvim dizisi oluşturuyoruz
    sim_aylar = []
    curr = bugun
    for _ in range(12):
        m_start = curr + pd.offsets.MonthBegin(0)
        m_end = curr + pd.offsets.MonthEnd(0)
        sim_aylar.append({
            'isim': m_start.strftime('%b'),
            'gun_sayisi': (m_end - m_start).days + 1,
            'ay_basi': m_start
        })
        curr = (m_end + pd.Timedelta(days=1))

    def calculate_advanced_order(row):
        logs = []
        hiz = safe_float(row.get('hibrit_hiz'), 0.0)
        stok = safe_float(row.get('stok'), 0.0)
        fiyat = safe_float(row.get('fiyat'), 0.0)
        dsf = safe_float(row.get('dsf'), 0.0)
        nakit_orani = safe_float(row.get('elden_orani'), 0.25)
        sgk_orani = 1.0 - nakit_orani
        
        tags = row.get('tags', []) if isinstance(row.get('tags'), list) else []
        recete_rengi = str(row.get('recete_rengi', '')).upper()
        frekans = safe_float(row.get('aylik_frekans', 0))
        satis_listesi = row.get('satis_adet_listesi', [])
        path_ids = row.get('kategori_path_ids', []) if isinstance(row.get('kategori_path_ids'), list) else []

        # A. KRİTİK DURDURMA KOŞULLARI
        if TAG_MAP['OLU_STOK'] in tags:
            return 0, [["dur", "Ölü stok — 60+ gün hareketsiz"]], 0.0

        if (recete_rengi in ['MOR', 'TURUNCU'] or 15 in path_ids) and frekans < 2:
            return 0, [["dur", f"Sıralı dağıtım — düşük frekans ({int(frekans)} işlem)"]], 0.0

        if 14 in path_ids: # Enteral Beslenme
            if not satis_listesi: return 0, [["dur", "Enteral — son 3 ayda satış yok"]], 0.0
            target_hacim = np.median(satis_listesi)
            enteral_oneri = max(0, int(target_hacim - stok))
            return enteral_oneri, [["enteral", int(target_hacim)]], 0.0

        # B. TEMEL HESAPLAMA
        ham_ihtiyac = max(0, (hiz * hedef_gun_std) - stok)
        logs.append(["b", round(hiz,2), int(hedef_gun_std), int(stok), round(ham_ihtiyac,1)])

        # C. KATSAYI VE RİSK ANALİZİ LOGLARI
        if TAG_MAP['VAZGECILMEZ'] in tags:
            if (stok + ham_ihtiyac) < STRATEJI['MIN_VAZGECILMEZ_STOK']:
                ham_ihtiyac = STRATEJI['MIN_VAZGECILMEZ_STOK'] - stok
                logs.append(["vz", round(ham_ihtiyac,1)])

        if fiyat > 0:
            if fiyat < ucuz_limit:
                ham_ihtiyac *= KATSAYILAR['UCUZ_ARTIS']
                logs.append(["ucuz", KATSAYILAR['UCUZ_ARTIS'], round(ham_ihtiyac,1)])
            elif fiyat > pahali_limit:
                ham_ihtiyac *= KATSAYILAR['PAHALI_AZALIS']
                logs.append(["pahali", KATSAYILAR['PAHALI_AZALIS'], round(ham_ihtiyac,1)])

        trend = row.get('trend_skoru', 1.0)
        if trend >= STRATEJI['TREND_ARTIS_ESIK']:
            ham_ihtiyac *= KATSAYILAR['TREND_ARTIS']
            logs.append(["tr+", round(trend,2), KATSAYILAR['TREND_ARTIS'], round(ham_ihtiyac,1)])
        elif trend <= STRATEJI['TREND_AZALIS_ESIK']:
            ham_ihtiyac *= KATSAYILAR['TREND_AZALIS']
            logs.append(["tr-", round(trend,2), KATSAYILAR['TREND_AZALIS'], round(ham_ihtiyac,1)])

        if str(row.get('esdegersiz_ithal', '')).lower() in ['evet', 'true', '1']:
            ham_ihtiyac *= KATSAYILAR['ITHAL_ARTIS']
            logs.append(["ithal", KATSAYILAR['ITHAL_ARTIS'], round(ham_ihtiyac,1)])

        stratejik_ihtiyac = int(round(ham_ihtiyac))
        
        # D. BAREM VE NAKİT AKIŞI ANALİZİ (OPTIMIZE SİMÜLASYON)
        import json
        raw_mf_list = row.get('mf_baremleri', [])
        
        # 🚀 KRİTİK: String gelirse JSON'dan listeye çevir
        if isinstance(raw_mf_list, str):
            try:
                if raw_mf_list.strip() in ['', '[]', 'None', 'NULL']:
                    raw_mf_list = []
                else:
                    raw_mf_list = json.loads(raw_mf_list)
            except:
                raw_mf_list = []

        mf_list = []
        # loglama için barem sayısı kontrolü
        mf_sayisi = len(raw_mf_list) if isinstance(raw_mf_list, list) else 0

        if isinstance(raw_mf_list, list) and dsf > 0:
            seen_ratios = set()
            for m in raw_mf_list:
                a, f = safe_float(m.get('ana')), safe_float(m.get('mf'))
                if a > 0 and f > 0:
                    ratio = round(f/a, 4)
                    if ratio not in seen_ratios:
                        mf_list.append({'ana': a, 'mf': f})
                        seen_ratios.add(ratio)
            mf_list.sort(key=lambda x: x['ana'])

        best_barem, max_verim, max_mf_yuzde = None, -1.0, 0.0

        if mf_list and stratejik_ihtiyac > 0:
            logs.append(["mf_hdr"])
            stok_erime_gunu = int(stok / (hiz + 0.001))
            yeni_mal_baslangic = bugun + pd.Timedelta(days=stok_erime_gunu)

            for barem in mf_list:
                ana, mf = barem['ana'], barem['mf']
                total = ana + mf
                mf_yuzde_anlik = mf / total
                if mf_yuzde_anlik > max_mf_yuzde: max_mf_yuzde = mf_yuzde_anlik
                
                kalan_stok, aylik_analiz_str, toplam_fin_etki = total, [], 0
                
                for ay in sim_aylar:
                    if kalan_stok <= 0: break
                    if ay['ay_basi'] < yeni_mal_baslangic.replace(day=1): continue
                    
                    satilan = min(kalan_stok, ay['gun_sayisi'] * hiz)
                    if satilan <= 0: continue
                    
                    # Finansal etki hesabı (Nakit vs SGK Vadesi)
                    nakit_t = ay['ay_basi'] + pd.Timedelta(days=ay['gun_sayisi']/2)
                    sgk_t = ay['ay_basi'] + pd.DateOffset(months=3, day=15)
                    
                    fark_nakit = (depo_vade_bugun - nakit_t).days
                    fark_sgk = (depo_vade_bugun - sgk_t).days
                    
                    toplam_fin_etki += (satilan * nakit_orani * dsf * fark_nakit * enflasyon_oran) + \
                                       (satilan * sgk_orani * dsf * fark_sgk * enflasyon_oran)
                    
                    kalan_stok -= satilan
                    aylik_analiz_str.append(f"{ay['isim']}:{int(satilan)}")

                brut_kar = mf * dsf
                net_avantaj = brut_kar + toplam_fin_etki
                birim_kar = net_avantaj / total if total > 0 else 0
                stok_omru = (stok + total) / (hiz + 0.001)

                is_ok = (net_avantaj > 0 and stok_omru <= max_stok_gun)
                durum_simge = "✅" if is_ok else "❌"
                sebep = f" (Stok Şişer: {int(stok_omru)} gün)" if stok_omru > max_stok_gun else (" (Zarar)" if net_avantaj <= 0 else "")

                logs.append(["mf_row", 1 if is_ok else 0, int(ana), int(mf), sebep.strip(), ",".join(aylik_analiz_str), int(net_avantaj), round(birim_kar,2)])

                if is_ok:
                    if birim_kar > (max_verim + 0.20) or (abs(birim_kar - max_verim) <= 0.20 and net_avantaj > (max_verim * total)):
                        max_verim, best_barem = birim_kar, barem

            if best_barem:
                stratejik_ihtiyac = int(best_barem['ana'])
                logs.append(["fin", int(best_barem['ana']), int(best_barem['mf'])])

        # E. BLOK SATIŞ KONTROLÜ
        if TAG_MAP['VAZGECILMEZ'] in tags:
            blok_mod = safe_float(row.get('blok_satis_modu'), 1.0)
            if 0 < stratejik_ihtiyac < blok_mod:
                stratejik_ihtiyac = int(blok_mod)
                logs.append(["blok", int(blok_mod)])

        return stratejik_ihtiyac, logs, max_mf_yuzde

    # --- 3. ANA İŞLEM (APPLY) ---
    results = df.apply(calculate_advanced_order, axis=1)
    df['oneri'] = results.apply(lambda x: x[0])
    df['hesap_aciklamasi'] = results.apply(lambda x: x[1])
    
    # --- 4. LOG STATİSTİKLERİ ---
    import json
    import sys
    
    total_log_size = 0
    total_log_count = 0
    mf_log_count = 0
    mf_log_size = 0
    max_log_size = 0
    max_log_product = ""
    
    log_breakdown = {}  # Ürün başına log türü sayısı
    
    for idx, logs in enumerate(df['hesap_aciklamasi']):
        if logs:
            total_log_count += len(logs)
            
            logs_json = json.dumps(logs, ensure_ascii=False)
            logs_bytes = len(logs_json.encode('utf-8'))
            total_log_size += logs_bytes
            
            if logs_bytes > max_log_size:
                max_log_size = logs_bytes
                max_log_product = df.iloc[idx].get('urun_adi', f'Row {idx}')
            
            # MF log'u say (Nakit Akışı ve Barem Analizi içeren)
            for log in logs:
                if 'Nakit Akışı' in str(log) or 'Finansal Karar' in str(log) or ('border-start' in str(log)):
                    mf_log_count += 1
            
            mf_logs_json = json.dumps([l for l in logs if 'Nakit Akışı' in str(l) or 'border-start' in str(l) or 'Finansal Karar' in str(l)], ensure_ascii=False)
            mf_log_size += len(mf_logs_json.encode('utf-8'))
    
    print("\n" + "=" * 80)
    print("📋 INTERPRETER LOG STATİSTİKLERİ")
    print("=" * 80)
    print(f"  • Toplam Log Satırı: {total_log_count}")
    print(f"  • Toplam Log Boyutu: {total_log_size:,} byte ({total_log_size/1024:.2f} KB)")
    print(f"  • Ortalama Ürün Başına Log: {total_log_count/len(df):.1f} satır")
    print(f"  • Ortalama Ürün Başına Boyut: {total_log_size/len(df):.0f} byte")
    print(f"  • En Büyük Log: {max_log_size:,} byte ({max_log_product})")
    
    print(f"\n  🔴 MF (Barem Analizi) Logları:")
    print(f"     • Toplam MF Log Satırı: {mf_log_count}")
    print(f"     • Toplam MF Log Boyutu: {mf_log_size:,} byte ({mf_log_size/1024:.2f} KB)")
    print(f"     • Tüm Log'ların {(mf_log_size/total_log_size*100):.1f}%'i MF Logları")
    
    print("=" * 80 + "\n")
    df['mf_max_yuzde'] = results.apply(lambda x: x[2])
    
    # --- 4. GRUP (EŞDEĞER) MANTIĞI (VEKTÖREL VE HIZLI) ---
    if 'esdeger_id' in df.columns:
        # Ay sonu ihtiyacını vektörel hesapla (Stratejik kaydırma için baz değer)
        df['ay_sonu_ihtiyaci'] = (df['hibrit_hiz'] * hedef_gun_dinamik - df['stok']).clip(lower=0)
        
        # Enteral maskesi
        enteral_mask = df['kategori_path_ids'].apply(lambda x: 14 in x if isinstance(x, list) else False)
        df.loc[enteral_mask, 'ay_sonu_ihtiyaci'] = df['oneri']

        # Grup liderlerini bul (Barem avantajı en yüksek olan)
        df['max_grup_mf'] = df.groupby('esdeger_id')['mf_max_yuzde'].transform('max')
        df['lider_rank'] = df.groupby('esdeger_id')['hibrit_hiz'].rank(method='first', ascending=False)
        df['is_lider'] = (df['mf_max_yuzde'] == df['max_grup_mf']) & (df['lider_rank'] == 1)

        # Kaydırma koşulları: Lider değil + MF farkı var + Vazgeçilmez değil + Enteral değil
        vazgecilmez_mask = df['tags'].apply(lambda x: 'vz' in x if isinstance(x, list) else False)
        df['can_shift'] = (~df['is_lider']) & \
                          ((df['max_grup_mf'] - df['mf_max_yuzde']) >= mf_puan_esigi) & \
                          (~vazgecilmez_mask) & (~enteral_mask)

        # Talebi topla ve liderlere dağıt
        df['oneri_stratejik'] = df['oneri']
        shifted_demand = df[df['can_shift']].groupby('esdeger_id')['ay_sonu_ihtiyaci'].sum()
        df.loc[df['can_shift'], 'oneri_stratejik'] = 0
        
        # Liderlerin önerisini güncelle ve log ekle
        def finalize_group_recommendation(row):
            if not row['is_lider']: return row['oneri_stratejik']
            extra = shifted_demand.get(row['esdeger_id'], 0)
            if extra > 0:
                row['hesap_aciklamasi'].append(["grp", int(extra)])
            return max(row['oneri'], row['ay_sonu_ihtiyaci'] + extra)

        df['oneri_stratejik'] = df.apply(finalize_group_recommendation, axis=1)

    return df.reset_index(drop=True)