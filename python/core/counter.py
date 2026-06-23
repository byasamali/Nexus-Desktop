# core/counter.py
import math

def generate_count_plan(df, personnel=['Personel A', 'Personel B', 'Personel C'], total_days=60):
    
    df_active = df[df['stok'] > 0].copy()
    print(f"[DEBUG] Sayım planı için aktif ürün sayısı: {len(df_active)}")
    
    if df_active.empty:
        print("[WARNING] Stokta ürün bulunamadığı için sayım planı boş oluşturuldu.")
        return []

    
    # YENİ PUANLAMA: Her barkod 10 puan + Her kutu 1 puan
    # Örn: 1 barkod 20 kutu = 10 + 20 = 30 Puan.
    df_active['workload'] = 10 + df_active['stok']
    
    # İş yüküne göre sırala
    df_active = df_active.sort_values('workload', ascending=False)
    
    plan = {p: {'items': [], 'total_workload': 0} for p in personnel}
    
    # Adil Dağıtım (En az yükü olana atama)
    for _, row in df_active.iterrows():
        least_busy_person = min(plan, key=lambda p: plan[p]['total_workload'])
        
        plan[least_busy_person]['items'].append({
            'barkod': row['barkod'],
            'ad': row['urun_adi'],
            'stok': int(row['stok']),
            'kategori': row.get('genel_kategori', 'Diğer')
        })
        plan[least_busy_person]['total_workload'] += row['workload']
    
    summary = []
    for p, data in plan.items():
        total_sku = len(data['items'])
        summary.append({
            'personel': p,
            'toplam_urun': total_sku,
            'toplam_puan': int(data['total_workload']), # İzlemek istersen ekledik
            'gunluk_hedef': math.ceil(total_sku / total_days),
            'liste': data['items']
        })
        
    return summary