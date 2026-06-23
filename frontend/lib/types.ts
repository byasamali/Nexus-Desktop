export interface UrunDetay {
    v1: string;
    v2: string;
    v4: number;
    v20: number;
    v25: number;
    v26: number;
    v60: string[];
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

export interface DashboardData {
    gruplar: Grup[];
    nobet_listesi: any[];
    nakit_optimizasyon: any[];
    olu_stok_listesi: any[];
    stok_sifir_listesi: any[];

    
    sayim_plani: any[];
    miad_risk_listesi: any[];
    menuler: any;
}