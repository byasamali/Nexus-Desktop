# config.py

# --- HIZ AĞIRLIKLARI ---
AGIRLIKLAR = {
    'HIZ_7G': 0.10,   # Trend tetikleyici (Hızlı tepki ama gürültüye biraz daha kapalı)
    'HIZ_30G': 0.45,  # Ana motor (Eczanenin standart aylık döngüsü)
    'HIZ_120G': 0.35, # Kronik/Raporlu koruması (3-4 aylık periyotları yakalar)
    'HIZ_365G': 0.10  # Genel arka plan (İlacın tarihsel varlığı)
}

# --- PARAMETRELER (YENİLENMİŞ) ---
LIMITLER = {
    'OLU_STOK_GUN': 60,
    'HIZLI_SATIS_ESIGI': 1.0,
    'MIAD_RISK_AY': 2,
    'KRITIK_ES_GUN': 7,
    'KRITIK_TEK_GUN': 3,
    'RENKLI_RECETE_ESIK': 2 # Ayda 2 ve üzeri işlem varsa "Düzenli" kabul et mor ve turuncu için
}

# --- STRATEJİ AYARLARI (YENİ) ---
STRATEJI = {
    'HEDEF_GUN': 30,          # Hedef stok günü
    'MAX_STOK_GUN': 180,      # 6 AY FRENE BASMA SINIRI (Yeni)
    'AYLIK_ENFLASYON': 0.04,  # %4 Enflasyon
    'TREND_ARTIS_ESIK': 1.20, # %20 artış (Frekans bazlı)
    'TREND_AZALIS_ESIK': 0.80,# %20 düşüş
    'ELDEN_PAYI_ESIK': 0.25,  # %25 nakit satış oranı
    'UCUZ_URUN_LIMIT': 200,   # 200 TL altı
    'PAHALI_URUN_LIMIT': 750, # 750 TL üstü
    'MIN_VAZGECILMEZ_STOK': 2,
    'MF_PUAN_FARKI': 0.05,     # %5 Puan Farkı Kuralı (Örn: %10 vs %15)
    'MF_KAYDIRMA_ESIGI': 0.15,# YENİ: Lider ürün %15 daha ucuzsa kaydır
}

# --- KATSAYILAR (YENİ) ---
KATSAYILAR = {
    'ITHAL_ARTIS': 1.2,       # İthal ürün artış katsayısı
    'TREND_ARTIS': 1.2,       # Trendi artan
    'TREND_AZALIS': 0.8,      # Trendi düşen
    'ELDEN_ARTIS': 1.1,       # Nakit jeneratörü
    'UCUZ_ARTIS': 1.2,        # Ucuz ürün riski
    'PAHALI_AZALIS': 0.8,     # Pahalı ürün freni
    'MIAD_FRENI': 0.5         # Miad riski varsa düşür
}