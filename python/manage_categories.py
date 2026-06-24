import sys
import os
import sqlite3
import json

def get_db_connection():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, "database", "master_db.sqlite")
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Database not found at {db_path}")
    return sqlite3.connect(db_path)

def list_categories():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, isim, ust_kategori_id, is_ana_kategori, seviye FROM categories ORDER BY isim ASC")
        rows = cur.fetchall()
        categories = []
        for r in rows:
            categories.append({
                "id": r[0],
                "isim": r[1],
                "ust_kategori_id": int(r[2]) if r[2] is not None else None,
                "is_ana_kategori": bool(r[3]),
                "seviye": r[4]
            })
        conn.close()
        return {"status": "success", "categories": categories}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def add_category(name, parent_id=None):
    if not name or not name.strip():
        return {"status": "error", "message": "Kategori adı boş olamaz"}
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # En büyük id değerini bulup +1 ekle
        cur.execute("SELECT MAX(id) FROM categories")
        max_id = cur.fetchone()[0]
        new_id = (max_id if max_id is not None else 0) + 1
        # Genelde 1 ve 2 gibi özel id'lerin üstüne çıkması garanti olsun
        if new_id < 100:
            new_id = 100
            
        seviye = 1
        is_ana_kategori = 1
        
        if parent_id is not None:
            cur.execute("SELECT seviye FROM categories WHERE id = ?", (parent_id,))
            parent = cur.fetchone()
            if parent:
                seviye = parent[0] + 1
                is_ana_kategori = 0
            else:
                return {"status": "error", "message": "Belirtilen üst kategori bulunamadı"}
                
        import datetime
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        cur.execute(
            "INSERT INTO categories (id, isim, ust_kategori_id, is_ana_kategori, seviye, olusturma_tarihi) VALUES (?, ?, ?, ?, ?, ?)",
            (new_id, name.strip(), parent_id, is_ana_kategori, seviye, now_str)
        )
        conn.commit()
        conn.close()
        return {"status": "success", "category": {"id": new_id, "isim": name.strip(), "ust_kategori_id": parent_id, "is_ana_kategori": bool(is_ana_kategori), "seviye": seviye}}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def delete_category(category_id):
    if category_id in [1, 2]:
        return {"status": "error", "message": "Ana sistem kategorileri ('ilac' ve 'idu') silinemez."}
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Kategori var mı kontrol et
        cur.execute("SELECT id FROM categories WHERE id = ?", (category_id,))
        if not cur.fetchone():
            conn.close()
            return {"status": "error", "message": "Kategori bulunamadı"}
            
        # Alt kategoriler varsa onları da sil veya üst kategorilerini boşalt?
        # Kullanıcı kolaylığı için bu kategorinin alt kategorilerinin ust_kategori_id'lerini silinenin üst kategorisi yapalım
        cur.execute("SELECT ust_kategori_id FROM categories WHERE id = ?", (category_id,))
        parent_id = cur.fetchone()[0]
        
        cur.execute("UPDATE categories SET ust_kategori_id = ? WHERE ust_kategori_id = ?", (parent_id, category_id))
        
        # Bu kategorideki ürünleri kategorisiz yap (kategori_id = 2 veya NULL yapalım)
        cur.execute("UPDATE products SET kategori_id = 2 WHERE kategori_id = ?", (category_id,))
        
        # Kategoriyi sil
        cur.execute("DELETE FROM categories WHERE id = ?", (category_id,))
        
        conn.commit()
        conn.close()
        return {"status": "success", "message": f"Kategori {category_id} başarıyla silindi ve ürünleri varsayılan kategoriye aktarıldı."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def search_products(query, limit=50):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Hem barkoda hem de isme göre ara
        sql_query = """
            SELECT p.barkod, p.master_urun_adi, p.kategori_id, c.isim as kategori_adi 
            FROM products p
            LEFT JOIN categories c ON p.kategori_id = c.id
            WHERE p.barkod LIKE ? OR p.master_urun_adi LIKE ?
            LIMIT ?
        """
        like_query = f"%{query}%"
        cur.execute(sql_query, (like_query, like_query, limit))
        rows = cur.fetchall()
        
        products = []
        for r in rows:
            products.append({
                "barkod": r[0],
                "urun_adi": r[1],
                "kategori_id": r[2],
                "kategori_adi": r[3] if r[3] is not None else "Kategorisiz (İDU)"
            })
            
        conn.close()
        return {"status": "success", "products": products}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def list_by_category(category_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        sql_query = """
            SELECT p.barkod, p.master_urun_adi, p.kategori_id, c.isim as kategori_adi 
            FROM products p
            LEFT JOIN categories c ON p.kategori_id = c.id
            WHERE p.kategori_id = ?
            ORDER BY p.master_urun_adi ASC
        """
        cur.execute(sql_query, (category_id,))
        rows = cur.fetchall()
        
        products = []
        for r in rows:
            products.append({
                "barkod": r[0],
                "urun_adi": r[1],
                "kategori_id": r[2],
                "kategori_adi": r[3] if r[3] is not None else "Kategorisiz"
            })
            
        conn.close()
        return {"status": "success", "products": products}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def assign_product(barcode, category_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Barkod var mı kontrol et
        cur.execute("SELECT barkod FROM products WHERE barkod = ?", (barcode,))
        if not cur.fetchone():
            conn.close()
            return {"status": "error", "message": "Ürün bulunamadı (Barkod veritabanında kayıtlı değil)"}
            
        # Kategori var mı kontrol et
        cur.execute("SELECT id FROM categories WHERE id = ?", (category_id,))
        if not cur.fetchone():
            conn.close()
            return {"status": "error", "message": "Belirtilen kategori bulunamadı"}
            
        cur.execute("UPDATE products SET kategori_id = ? WHERE barkod = ?", (category_id, barcode))
        conn.commit()
        conn.close()
        return {"status": "success", "message": f"Ürün ({barcode}) kategori {category_id} ile eşleştirildi."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def remove_product(barcode):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Barkod var mı kontrol et
        cur.execute("SELECT barkod FROM products WHERE barkod = ?", (barcode,))
        if not cur.fetchone():
            conn.close()
            return {"status": "error", "message": "Ürün bulunamadı"}
            
        # Kategori ID'yi varsayılan 'idu' (2) olarak ata
        cur.execute("UPDATE products SET kategori_id = 2 WHERE barkod = ?", (barcode,))
        conn.commit()
        conn.close()
        return {"status": "success", "message": f"Ürün ({barcode}) kategoriden çıkarıldı."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_product(barcode):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT barkod, urun_adi, kategori_id, atc_kodu, sgk_kodu, esdeger_kodu, 
                   recete_rengi, isf, dsf, psf, saf_kamu, fiyat_farki, kamu_toplam, esdegersiz_ithal
            FROM products WHERE barkod = ?
        """, (barcode,))
        r = cur.fetchone()
        conn.close()
        if not r:
            return {"status": "error", "message": "Ürün bulunamadı"}
            
        return {
            "status": "success",
            "product": {
                "barkod": r[0],
                "urun_adi": r[1],
                "kategori_id": r[2],
                "atc_kodu": r[3],
                "sgk_kodu": r[4],
                "esdeger_kodu": r[5],
                "recete_rengi": r[6],
                "isf": r[7],
                "dsf": r[8],
                "psf": r[9],
                "saf_kamu": r[10],
                "fiyat_farki": r[11],
                "kamu_toplam": r[12],
                "esdegersiz_ithal": r[13]
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

def update_product(barcode, data):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("SELECT barkod FROM products WHERE barkod = ?", (barcode,))
        if not cur.fetchone():
            conn.close()
            return {"status": "error", "message": "Ürün bulunamadı"}
            
        cur.execute("""
            UPDATE products
            SET urun_adi = ?,
                kategori_id = ?,
                atc_kodu = ?,
                sgk_kodu = ?,
                esdeger_kodu = ?,
                recete_rengi = ?,
                isf = ?,
                dsf = ?,
                psf = ?,
                esdegersiz_ithal = ?,
                master_urun_adi = ?
            WHERE barkod = ?
        """, (
            data.get("urun_adi"),
            data.get("kategori_id"),
            data.get("atc_kodu"),
            data.get("sgk_kodu"),
            data.get("esdeger_kodu"),
            data.get("recete_rengi"),
            data.get("isf"),
            data.get("dsf"),
            data.get("psf"),
            data.get("esdegersiz_ithal"),
            data.get("urun_adi"),
            barcode
        ))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Ürün bilgileri başarıyla güncellendi"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def update_live_data(barcode, data):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Olası eksik mf_baremleri sütununu ekle
        try:
            cur.execute("ALTER TABLE products ADD COLUMN mf_baremleri TEXT")
            conn.commit()
        except sqlite3.OperationalError:
            pass
            
        cur.execute("SELECT barkod FROM products WHERE barkod = ?", (barcode,))
        if not cur.fetchone():
            conn.close()
            return {"status": "error", "message": "Ürün bulunamadı"}
            
        cur.execute("""
            UPDATE products
            SET dsf = ?,
                psf = ?,
                mf_baremleri = ?
            WHERE barkod = ?
        """, (
            data.get("dsf"),
            data.get("psf"),
            data.get("mf_baremleri"),
            barcode
        ))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Canlı fiyat ve kampanya bilgileri güncellendi"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "Eksik parametre. Kullanım: manage_categories.py <action> [params_json]"}))
        sys.exit(1)
        
    action = sys.argv[1]
    params = {}
    
    if len(sys.argv) > 2:
        try:
            params = json.loads(sys.argv[2])
        except Exception as e:
            print(json.dumps({"status": "error", "message": f"Parametre JSON hatası: {str(e)}"}))
            sys.exit(1)
            
    if action == "list":
        result = list_categories()
    elif action == "list-by-category":
        result = list_by_category(params.get("category_id"))
    elif action == "add":
        result = add_category(params.get("name"), params.get("parent_id"))
    elif action == "delete":
        result = delete_category(params.get("id"))
    elif action == "search-products":
        result = search_products(params.get("query", ""), params.get("limit", 50))
    elif action == "assign":
        result = assign_product(params.get("barcode"), params.get("category_id"))
    elif action == "remove":
        result = remove_product(params.get("barcode"))
    elif action == "get-product":
        result = get_product(params.get("barcode"))
    elif action == "update-product":
        result = update_product(params.get("barcode"), params.get("data", {}))
    elif action == "update-live-data":
        result = update_live_data(params.get("barcode"), params.get("data", {}))
    else:
        result = {"status": "error", "message": f"Bilinmeyen eylem: {action}"}
        
    # Ensure stdout is outputting in clean UTF-8
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
