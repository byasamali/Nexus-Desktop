# core/analytics_engine.py (Sadece gerekli kısımları güncelledim)
import pandas as pd
import numpy as np

def get_dashboard_data(df_raw):
    df = df_raw.copy()
    
    # İsimlendirme Zırhlama
    if 'master_urun_adi' in df.columns: df['urun_adi'] = df['master_urun_adi']
    elif 'lokal_urun_adi' in df.columns: df['urun_adi'] = df['lokal_urun_adi']
    else: df['urun_adi'] = df['barkod'].astype(str)

    # Veri Tipleri
    df['satis_tarihi'] = pd.to_datetime(df['satis_tarihi'], format='mixed', errors='coerce')
    
    # Hatalı/Boş tarihleri temizle
    df = df.dropna(subset=['satis_tarihi'])
    
    # YENİ: satis_fiyati yerine net_tutar kullanıyoruz
    df['net_tutar'] = pd.to_numeric(df['net_tutar'], errors='coerce').fillna(0)
    df['satis_adedi'] = pd.to_numeric(df['satis_adedi'], errors='coerce').fillna(0)
    
    # 🚀 GERÇEK CİRO: Adetle çarpmaya gerek yok, SQL zaten o satırın toplam net tutarını yolluyor
    df['ciro'] = df['net_tutar'].round(2)
    
    df['ay_yil'] = df['satis_tarihi'].dt.to_period('M').astype(str)

    def calculate_stats(data_slice):
        if data_slice.empty: return {'kpi': {}, 'top_ciro': [], 'top_kutu': []}
        
        top_ciro = data_slice.groupby('urun_adi')['ciro'].sum().nlargest(100).reset_index()
        top_kutu = data_slice.groupby('urun_adi')['satis_adedi'].sum().nlargest(250).reset_index()

        return {
            'kpi': {
                'ciro': f"{data_slice['ciro'].sum():,.0f} TL",
                'adet': f"{data_slice['satis_adedi'].sum():,.0f}",
                'islem': f"{len(data_slice):,}",
                'sepet': f"{(data_slice['ciro'].sum() / len(data_slice)):,.2f} TL" if len(data_slice)>0 else "0 TL"
            },
            'top_ciro': top_ciro.to_dict('records'),
            'top_kutu': top_kutu.to_dict('records')
        }

    # Raporlama
    aylar = sorted(df['ay_yil'].unique(), reverse=True)
    report = { 'ANNUAL': calculate_stats(df) }
    for ay in aylar:
        report[ay] = calculate_stats(df[df['ay_yil'] == ay])

    # Trend
    monthly_trend = df.groupby('ay_yil').agg({'ciro':'sum', 'satis_adedi':'sum'}).sort_index()
    
    # İşlem Tipi Dağılımı
    # İşlem Tipi Dağılımı
    if 'satis_tipi' in df.columns:
        islem_tipi_dagilimi = df.groupby('satis_tipi').size().reset_index(name='adet')
        islem_tipi_dagilimi['ort_kutu'] = df.groupby('satis_tipi')['satis_adedi'].mean().values
        islem_tipi_dagilimi['oran'] = (islem_tipi_dagilimi['adet'] / islem_tipi_dagilimi['adet'].sum() * 100).round(1)
    else:
        islem_tipi_dagilimi = []
    
    return {
        'periods': report,
        'month_list': aylar,
        'trends': {
            'labels': monthly_trend.index.tolist(),
            'ciro': monthly_trend['ciro'].tolist(),
            'adet': monthly_trend['satis_adedi'].tolist()
        },
        'islem_tipi_dagilimi': islem_tipi_dagilimi.to_dict('records') if isinstance(islem_tipi_dagilimi, pd.DataFrame) else islem_tipi_dagilimi
    }