// src/types.ts

export interface UrunDetay {
    v1: string; // Kategori/Marka
    v2: string; // Ürün Adı
    v4: number; // Stok
    v20: number; // Hız
    v25: number; // Bireysel Öneri
    v26: number; // Stratejik Öneri
    v60: string[]; // Etiketler (ks, mr, os, vz...)
    log_html: string;
    grup_analizi: string;
    ek_tavsiye: string;
}

export interface Grup {
    lider_adi: string;
    toplam_oneri: number;
    kritik_puan: number;
    tags: string;
    detaylar: UrunDetay[];
}

export interface MenuData {
    kategoriler: Record<string, { ad: string; altlar: { ad: string; slug: string }[] }>;
    renkler: Record<string, string>;
}

export interface DashboardData {
    gruplar: Grup[];
    nobet_listesi: any[];
    nakit_optimizasyon: any[];
    olu_stok_listesi: any[];
    miad_risk_listesi: any[];
    sayim_plani: any[]; // Eğer backend gönderiyorsa
    menuler: MenuData;
}