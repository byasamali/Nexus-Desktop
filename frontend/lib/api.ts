import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Detect if running inside Wails environment
const isWails = typeof window !== 'undefined' && (window as any).go !== undefined;

// Kullanıcının eczane verilerini çek
export const fetchEczaneData = async (userId: string) => {
    if (isWails) {
        try {
            // Wails Go backendinden yerel ayarları yükle
            const settingsStr = await (window as any).go.main.App.LoadSettings();
            const settings = JSON.parse(settingsStr);
            
            if (!settings || !settings.gln) {
                return { isWailsSetupRequired: true };
            }
            
            // Wails Go backendinden yerel analiz cache'ini oku
            try {
                const resJson = await (window as any).go.main.App.GetDashboardData(settings.gln);
                return JSON.parse(resJson);
            } catch (err: any) {
                // Eğer analiz dosyası henüz yoksa
                return { 
                    isWailsSyncRequired: true, 
                    gln: settings.gln, 
                    software: settings.software, 
                    eczane_adi: settings.eczane_adi 
                };
            }
        } catch (error) {
            console.error("Wails Eczane Veri Çekme Hatası:", error);
            return null;
        }
    }

    try {
        const { data: eczaneData, error: eczaneError } = await supabase
            .from('eczaneler')
            .select('gln')
            .eq('id', userId)
            .single();

        if (eczaneError || !eczaneData?.gln) {
            console.error("Eczane bulunamadı:", eczaneError);
            return null;
        }

        const { url } = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/get-result`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gln: eczaneData.gln })
            }
        ).then(r => r.json());

        const res = await fetch(url).then(r => r.json());
        return res;
    } catch (error) {
        console.error("API Hatası:", error);
        return null;
    }
};

// Eski fonksiyonlar (silme, backend için)
const NEXUS_API_URL = "http://127.0.0.1:5000/api/v1";

export const fetchDashboardData = async (tenantId: string) => {
    try {
        const response = await fetch(`${NEXUS_API_URL}/dashboard/${tenantId}`);
        return await response.json();
    } catch (error) {
        console.error("API Hatası:", error);
        return null;
    }
};

export const refreshDashboardData = async (tenantId: string) => {
    try {
        const response = await fetch(`${NEXUS_API_URL}/refresh-analysis/${tenantId}`, {
            method: 'POST'
        });
        return await response.json();
    } catch (error) {
        console.error("Yenileme Hatası:", error);
        throw error;
    }
};