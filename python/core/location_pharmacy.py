# core/location_pharmacy.py
import pandas as pd
import numpy as np

def detect_location_profile(df_raw, df_master):
    """
    Eczanenin satış karakteristiğini analiz eder ve detaylı bir 'Röntgen' raporu sunar.
    """
    try:
        if df_raw is None or len(df_raw) == 0:
            return "VERİ YETERSİZ", "Analiz için veri bulunamadı."

        # --- 1. VERİ ZIRHLAMA VE HAZIRLIK ---
        raw = df_raw.copy()
        raw['satis_adedi'] = pd.to_numeric(raw['satis_adedi'], errors='coerce').fillna(0)
        raw['lokal_psf'] = pd.to_numeric(raw['lokal_psf'], errors='coerce').fillna(0)
        raw['net_tutar'] = pd.to_numeric(raw['net_tutar'], errors='coerce').fillna(0)
        
        # 🚀 YENİ CİRO HESABI: Artık adet * fiyat yapmıyoruz. 
        # Doğrudan SQL'den gelen kuruşu kuruşuna doğru tahsilat (net_tutar) kullanılıyor.
        raw['satir_ciro'] = raw['net_tutar']
        
        # --- TARİH DÜZELTMESİ ---
        raw['satis_tarihi'] = pd.to_datetime(raw['satis_tarihi'], format='mixed', errors='coerce')
        raw = raw.dropna(subset=['satis_tarihi'])
        # -----------------------
        
        mstr = df_master.copy()
        mstr['psf'] = pd.to_numeric(mstr['psf'], errors='coerce').fillna(0)
        mstr['hibrit_hiz'] = pd.to_numeric(mstr['hibrit_hiz'], errors='coerce').fillna(0)

        # --- 2. TEMEL ORANLAR ---
        toplam_kutu = raw['satis_adedi'].sum()
        toplam_ciro = raw['satir_ciro'].sum()

        # YENİ: Artık 'ELDEN' yerine doğrudan SQL'den gelen 'nakit_satis' etiketini kullanıyoruz
        elden_df = raw[raw['satis_tipi'] == 'nakit_satis']
        elden_kutu = elden_df['satis_adedi'].sum()
        elden_ciro = elden_df['satir_ciro'].sum()

        kutu_orani = (elden_kutu / toplam_kutu * 100) if toplam_kutu > 0 else 0
        ciro_orani = (elden_ciro / toplam_ciro * 100) if toplam_ciro > 0 else 0

        # --- 3. EK ANALİZLER (Röntgen Verileri) ---
        # A. En Yoğun Mesai Saati
        raw['saat'] = raw['satis_tarihi'].dt.hour
        en_yogun_saat = raw['saat'].mode()[0] if not raw['saat'].empty else 0
        
        # B. Ortalama Ürün Fiyatı (Sepet Birim Ortalaması)
        birim_fiyat_ort = toplam_ciro / toplam_kutu if toplam_kutu > 0 else 0

        # C. Pahalı İlaçların (PSF > 2500) Cirodaki Payı
        # Kullanıcı isteğiyle "Pahalı İlaç Payı" tespiti net_tutar'a göre BOZULMADI. 
        # Eski satis_fiyati yerine fiyat eşiği olarak yeni lokal_psf kullanıldı.
        pahali_ciro = raw[raw['lokal_psf'] > 2500]['satir_ciro'].sum()
        pahali_payi = (pahali_ciro / toplam_ciro * 100) if toplam_ciro > 0 else 0

        # D. Haftanın En Yoğun Günü
        raw['gun_adi'] = raw['satis_tarihi'].dt.day_name()
        gun_bazli = raw.groupby('gun_adi')['satir_ciro'].sum()
        en_yogun_gun = gun_bazli.idxmax() if not gun_bazli.empty else "-"
        
        # E. OTC/Vitamin vs İlaç Dengesi (Hız üzerinden tahmin)
        otc_keywords =['vitamin', 'kozmetik', 'takviye', 'dermo', 'besin', 'gıda', 'itriyat']
        otc_mask = mstr['genel_kategori'].fillna('').str.lower().str.contains('|'.join(otc_keywords))
        otc_hiz_toplam = mstr[otc_mask]['hibrit_hiz'].sum()
        toplam_hiz = mstr['hibrit_hiz'].sum()
        otc_hacim_yuzde = (otc_hiz_toplam / toplam_hiz * 100) if toplam_hiz > 0 else 0

        # --- 4. KONUM TESPİT MANTIĞI (Gelişmiş) ---
        score_asm = 0
        score_hosp = 0
        score_street = 0

        if kutu_orani < 15: score_asm += 40
        if pahali_payi < 5: score_asm += 20
        if birim_fiyat_ort < 300: score_asm += 20

        if pahali_payi > 15: score_hosp += 50
        if birim_fiyat_ort > 600: score_hosp += 20
        
        if ciro_orani > 30: score_street += 40
        if otc_hacim_yuzde > 15: score_street += 30
        if "Saturday" in en_yogun_gun: score_street += 20

        scores = {"SAĞLIK OCAĞI": score_asm, "HASTANE KARŞISI": score_hosp, "CADDE ECZANESİ": score_street}
        winner = max(scores, key=scores.get)
        if scores[winner] < 30: winner = "STANDART MAHALLE"

        # --- 5. LOGLARI OLUŞTURMA ---
        log_lines =[
            f"📍 TAHMİNİ KONUM   : {winner}",
            f"📊 NAKİT SATIŞ     : Kutu: %{kutu_orani:.1f} | Ciro: %{ciro_orani:.1f}",
            f"💰 PAHALI İLAÇ PAYI: %{pahali_payi:.1f} (Lokal PSF > 2500 TL olanlar)",
            f"🛒 BİRİM ORTALAMA  : {birim_fiyat_ort:.2f} TL (Ürün başı ort. satış)",
            f"🌿 İLAÇ DIŞI HACMİ : %{otc_hacim_yuzde:.1f} (Kategori bazlı yoğunluk)",
            f"⏰ ZAMAN ANALİZİ   : En Yoğun Gün: {en_yogun_gun} | En Yoğun Saat: {en_yogun_saat}:00"
        ]

        return winner, "\n".join(log_lines)

    except Exception as e:
        return "HATA", f"Analiz başarısız: {str(e)}"