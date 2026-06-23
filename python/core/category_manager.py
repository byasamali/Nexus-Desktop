# core/category_manager.py
import pandas as pd

class CategoryManager:
    """
    Kategori ağacını hafızada tutar ve herhangi bir alt kategori ID'si 
    verildiğinde onun en üst (root) kategorisini veya tüm soy ağacını hızlıca bulur.
    """
    def __init__(self, df_categories):
        self.cat_map = {}
        
        # Veritabanından gelen veriyi hızlı sözlüğe (dict) çevir
        if df_categories is not None and not df_categories.empty:
            records = df_categories.to_dict('records')
            for r in records:
                self.cat_map[r['id']] = r

        # Tüm ID'lerin hiyerarşik yolunu önceden hesapla (Hız için)
        self.paths = {}
        for cid in self.cat_map.keys():
            self.paths[cid] = self._calculate_path(cid)

    def _calculate_path(self, cid):
        path_ids =[]
        path_names =[]
        current_id = cid
        
        visited = set() # Sonsuz döngü koruması
        
        while current_id is not None and current_id in self.cat_map and current_id not in visited:
            visited.add(current_id)
            cat = self.cat_map[current_id]
            
            # Başa ekleyerek dizilişi Kök -> Yaprak şeklinde yapıyoruz
            path_ids.insert(0, cat['id'])
            path_names.insert(0, cat['isim'])
            
            # Üst kategoriye geç
            parent_id = cat.get('ust_kategori_id')
            if pd.isna(parent_id):
                current_id = None
            else:
                current_id = int(parent_id)
                
        return {'ids': path_ids, 'names': path_names}

    def get_path_ids(self, cid):
        """Örn: [3, 6, 10] döner"""
        if pd.isna(cid) or cid not in self.paths:
            return[]
        return self.paths[cid]['ids']

    def get_root_id(self, cid):
        """
        Kategori ID'den root_id'yi bulur.
        Eğer kategori yoksa veya 0 ise, IDU (2) döner (varsayılan).
        """
        if pd.isna(cid) or cid == 0 or cid not in self.paths:
            return 2  # Kategorisiz ürünler = İDU (İlaç Dışı Ürünler)
        p_ids = self.get_path_ids(cid)
        return p_ids[0] if p_ids else 2  # Fallback: IDU

    def get_root_name(self, cid):
        """Örn: 'ilac' veya 'idu' döner"""
        if pd.isna(cid) or cid not in self.paths:
            return "Bilinmeyen"
        return self.paths[cid]['names'][0]