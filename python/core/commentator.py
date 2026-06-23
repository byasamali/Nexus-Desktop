
# core/commentator.py
import pandas as pd
import numpy as np

def safe_float(val, default=0.0):
    """Boş metin veya None gelirse hata vermeden varsayılan değeri döner."""
    if val is None or str(val).strip() == "":
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default

def generate_comments(df):
    """
    1. Ürün Bazlı: Zaten interpreter'da hesapladık (hesap_aciklamasi).
    2. Grup Bazlı: Tüm grubun röntgenini çeker.
    """

    # ── OPTİMİZASYON: Grup bazlı istatistikleri tek seferde hesapla ──
    hiz_col  = df['hibrit_hiz'].fillna(0).astype(float)
    stok_col = df['stok'].fillna(0).astype(float)
    dsf_col  = df['dsf'].apply(safe_float) if 'dsf' in df.columns else pd.Series(0.0, index=df.index)

    grp_hiz  = df.groupby('esdeger_id')['hibrit_hiz'].sum().fillna(0)
    grp_stok = df.groupby('esdeger_id')['stok'].sum().fillna(0)
    grp_oneri = df.groupby('esdeger_id')['oneri'].sum().fillna(0) if 'oneri' in df.columns else pd.Series(0.0)

    # Lider: her grup için hibrit_hiz max olan satır
    lider_idx = df.groupby('esdeger_id')['hibrit_hiz'].idxmax()
    lider_df  = df.loc[lider_idx, ['esdeger_id', 'urun_adi', 'hibrit_hiz']].set_index('esdeger_id')

    # Tag bazlı sayımlar — vektörel
    df['_has_mr'] = df['tags'].apply(lambda x: 'mr' in x if isinstance(x, list) else False)
    df['_has_os'] = df['tags'].apply(lambda x: 'os' in x if isinstance(x, list) else False)
    df['_has_vz'] = df['tags'].apply(lambda x: 'vz' in x if isinstance(x, list) else False)

    grp_mr = df.groupby('esdeger_id')['_has_mr'].sum()
    grp_os = df.groupby('esdeger_id')['_has_os'].sum()

    # Vazgeçilmezler: grup → liste
    vz_df = df[df['_has_vz']].groupby('esdeger_id')['urun_adi'].apply(list)

    # ── OPTİMİZASYON: MF kâr şampiyonu — explode ile iterrows'suz ──
    # mf_baremleri sütununu explode et: her barem bir satır olur
    mf_col = 'mf_baremleri'
    if mf_col in df.columns:
        mf_df = df[['esdeger_id', 'urun_adi', mf_col, 'dsf']].copy()
        mf_df['dsf'] = mf_df['dsf'].apply(safe_float)
        # Sadece liste olan satırları al
        mf_df = mf_df[mf_df[mf_col].apply(lambda x: isinstance(x, list) and len(x) > 0)]
        if not mf_df.empty:
            mf_df = mf_df.explode(mf_col)
            mf_df['_ana'] = mf_df[mf_col].apply(lambda m: safe_float(m.get('ana', 0)) if isinstance(m, dict) else 0)
            mf_df['_mf']  = mf_df[mf_col].apply(lambda m: safe_float(m.get('mf',  0)) if isinstance(m, dict) else 0)
            mf_df = mf_df[mf_df['_ana'] > 0]
            mf_df['_ratio'] = mf_df['_mf'] / mf_df['_ana']
            # Her grup için en yüksek ratio'lu satırı al
            best_idx = mf_df.groupby('esdeger_id')['_ratio'].idxmax()
            best_mf  = mf_df.loc[best_idx].set_index('esdeger_id')[['urun_adi', 'dsf', '_ratio']]
            best_mf.columns = ['kar_sampiyonu', 'sampiyon_dsf', 'best_ratio']
        else:
            best_mf = pd.DataFrame(columns=['kar_sampiyonu', 'sampiyon_dsf', 'best_ratio'])
    else:
        best_mf = pd.DataFrame(columns=['kar_sampiyonu', 'sampiyon_dsf', 'best_ratio'])

    # Grup sayısı (len(grup) > 1 kontrolü için)
    grp_size = df.groupby('esdeger_id').size()

    # ── Ana döngü: artık sadece yorum metni üretiyor, hesap yok ──
    group_comments = {}

    for gid in grp_hiz.index:
        toplam_hiz  = grp_hiz[gid]
        toplam_stok = grp_stok[gid]
        grup_omru   = int(toplam_stok / (toplam_hiz + 0.001))

        lider_adi   = lider_df.loc[gid, 'urun_adi'] if gid in lider_df.index else 'Bilinmeyen'
        lider_hiz   = lider_df.loc[gid, 'hibrit_hiz'] if gid in lider_df.index else 0
        lider_payi  = lider_hiz / (toplam_hiz + 0.001)

        miad_riskli_sayisi = int(grp_mr.get(gid, 0))
        olu_stok_sayisi    = int(grp_os.get(gid, 0))

        yorumlar = []
        yorumlar.append(["oz_stok", int(grup_omru), int(toplam_stok)])

        if grup_omru > 180:
            yorumlar.append(["oz_fazla", int(grup_omru)])
        elif grup_omru < 15:
            yorumlar.append(["oz_acil", int(grup_omru)])

        if lider_payi > 0.8:
            yorumlar.append(["oz_lider", lider_adi, int(lider_payi*100)])
        elif lider_payi < 0.5:
            yorumlar.append(["oz_firsat"])

        if miad_riskli_sayisi > 0:
            yorumlar.append(["oz_miad", miad_riskli_sayisi])

        if olu_stok_sayisi > 0:
            yorumlar.append(["oz_olu", olu_stok_sayisi])

        # Tavsiye metni
        tavsiye_metni    = ""
        toplam_grup_oneri = safe_float(grp_oneri.get(gid, 0))

        if gid in best_mf.index and grp_size.get(gid, 1) > 1 and toplam_grup_oneri > 0:
            row_mf = best_mf.loc[gid]
            if isinstance(row_mf, pd.DataFrame):
                row_mf = row_mf.iloc[0]
            kar_sampiyonu = row_mf['kar_sampiyonu']
            sampiyon_dsf  = float(row_mf['sampiyon_dsf'])
            best_ratio    = float(row_mf['best_ratio'])
            vazgecilmezler   = vz_df.get(gid, [])

            brut_ek_kazanc    = toplam_grup_oneri * best_ratio * sampiyon_dsf
            tahmini_net_kazanc = int(brut_ek_kazanc * 0.85)
            vz_str = ", ".join(vazgecilmezler) if vazgecilmezler else "Bulunmuyor"

            tavsiye_metni = {"urun": kar_sampiyonu, "vz": vz_str, "net": tahmini_net_kazanc}

        group_comments[gid] = {'ozet': yorumlar, 'tavsiye': tavsiye_metni}

    # Temizlik
    df.drop(columns=['_has_mr', '_has_os', '_has_vz'], inplace=True, errors='ignore')

    df['grup_yorumu']      = df['esdeger_id'].map(lambda x: group_comments.get(x, {}).get('ozet', ''))
    df['stratejik_tavsiye'] = df['esdeger_id'].map(lambda x: group_comments.get(x, {}).get('tavsiye', ''))
    return df