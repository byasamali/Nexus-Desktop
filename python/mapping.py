# mapping.py

# HTML'e giderken değişken maskeleme
VAR_MAP = {
    "barkod": "v1",
    "urun_adi": "v2",
    "fiyat": "v3",
    "stok": "v4",
    "hibrit_hiz": "v20",
    "gun_farki_son_satis": "v21",
    "oneri": "v25",
    "oneri_stratejik": "v26",
    "is_lider": "v30",
    "ai_yorum": "v50",
    "tags": "v60",
    # kategori_id artık mapping yapılmıyor - direkt 'kategori_id' olarak gönderiliyor
    # v70 KALDIRILDI
    "atc_kodu": "v78",
    "nfc_kodu": "v79",
    "sgk_kodu": "v80",
    "esdeger_kodu": "v81",
    "recete_rengi": "v82",
    "formu": "v83",
    "firma": "v84",
    "idu_icerik": "v85",
    "dsf": "v86",
    "psf": "v87",
    "kamu_fiyati": "v88",
    "esdegersiz_ithal": "v89",
    "son_5_depo": "v90",
    "favori_depo": "v91",
    "son_5_alim_dagilimi": "v95"
}

# KISA ETİKET KODLARI
TAG_MAP = {
    "OLU_STOK": "os",
    "MIAD_RISKI": "mr",
    "KRITIK_STOK": "ks",
    "ITHAL": "ei",
    "VAZGECILMEZ": "vz",
    "TREND_ARTIS": "ta",
    "RENKLI_RECETE": "rr",
    "SORE_YUKSEK": "sy",
    "NOBET_IHTIYAC": "nb"
}

