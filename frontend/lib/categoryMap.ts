// lib/categoryMap.ts

export interface Category {
  id: number;
  isim: string;
  seviye: number;
  ust_kategori_id: number | null;
  is_ana_kategori: boolean;
  tam_yol: string[];
  tam_yol_ids: number[];
}

// ── Supabase'den çektiğin raw format (tam_yol hesaplanmamış) ──
type RawCategory = Omit<Category, 'tam_yol' | 'tam_yol_ids'>;

function buildCategoryMap(raw: RawCategory[]): Record<number, Category> {
  const map: Record<number, Category> = {};

  // Önce hepsini map'e at
  for (const r of raw) {
    map[r.id] = { ...r, tam_yol: [], tam_yol_ids: [] };
  }

  // Sonra her biri için yolu hesapla
  function getPath(id: number): { isimler: string[]; ids: number[] } {
    const cat = map[id];
    if (!cat) return { isimler: [], ids: [] };
    if (cat.ust_kategori_id === null) return { isimler: [cat.isim], ids: [cat.id] };
    const parent = getPath(cat.ust_kategori_id);
    return {
      isimler: [...parent.isimler, cat.isim],
      ids: [...parent.ids, cat.id],
    };
  }

  for (const cat of Object.values(map)) {
    const path = getPath(cat.id);
    map[cat.id].tam_yol = path.isimler;
    map[cat.id].tam_yol_ids = path.ids;
  }

  return map;
}

// ── BURAYA SUPABASE'DEN ALDIĞIN JSON'I YAPIŞTIRIR, TAM_YOL HESAPLANIR ──  

// SELECT id, isim, ust_kategori_id, is_ana_kategori, seviye
// FROM core_kategoriler
// ORDER BY id
// LIMIT 1000;


const rawData: RawCategory[] = [

  {
    "id": 1,
    "isim": "İlaç",
    "ust_kategori_id": null,
    "is_ana_kategori": true,
    "seviye": 0
  },
  {
    "id": 2,
    "isim": "İlaç Dışı Ürün",
    "ust_kategori_id": null,
    "is_ana_kategori": true,
    "seviye": 0
  },
  {
    "id": 3,
    "isim": "İlaç Beraberi Ürün",
    "ust_kategori_id": null,
    "is_ana_kategori": true,
    "seviye": 0
  },
  {
    "id": 4,
    "isim": "enjektor",
    "ust_kategori_id": 3,
    "is_ana_kategori": false,
    "seviye": 1
  },
  {
    "id": 5,
    "isim": "strip",
    "ust_kategori_id": 3,
    "is_ana_kategori": false,
    "seviye": 1
  },
  {
    "id": 6,
    "isim": "igne_ucu",
    "ust_kategori_id": 3,
    "is_ana_kategori": false,
    "seviye": 1
  },
  {
    "id": 10,
    "isim": "4mm",
    "ust_kategori_id": 6,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 11,
    "isim": "5mm",
    "ust_kategori_id": 6,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 12,
    "isim": "6mm",
    "ust_kategori_id": 6,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 13,
    "isim": "8mm",
    "ust_kategori_id": 6,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 14,
    "isim": "enteral_beslenme_sol",
    "ust_kategori_id": 1,
    "is_ana_kategori": false,
    "seviye": 1
  },
  {
    "id": 15,
    "isim": "anti_tnf",
    "ust_kategori_id": 1,
    "is_ana_kategori": false,
    "seviye": 1
  },
  {
    "id": 30,
    "isim": "ANNE - BEBEK ÜRÜNLERİ",
    "ust_kategori_id": 2,
    "is_ana_kategori": false,
    "seviye": 1
  },
  {
    "id": 31,
    "isim": "BESİN TAKVİYELERİ",
    "ust_kategori_id": 2,
    "is_ana_kategori": false,
    "seviye": 1
  },
  {
    "id": 32,
    "isim": "KİŞİSEL BAKIM ÜRÜNLERİ",
    "ust_kategori_id": 2,
    "is_ana_kategori": false,
    "seviye": 1
  },
  {
    "id": 33,
    "isim": "MEDİKAL",
    "ust_kategori_id": 2,
    "is_ana_kategori": false,
    "seviye": 1
  },
  {
    "id": 34,
    "isim": "Anne Bakım",
    "ust_kategori_id": 30,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 35,
    "isim": "Emzirme Önlüğü",
    "ust_kategori_id": 34,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 36,
    "isim": "Emzirme Sütyeni",
    "ust_kategori_id": 34,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 37,
    "isim": "Emzirme Yastığı & Minderi",
    "ust_kategori_id": 34,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 38,
    "isim": "Göğüs Koruyucu",
    "ust_kategori_id": 34,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 39,
    "isim": "Göğüs Pedi",
    "ust_kategori_id": 34,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 40,
    "isim": "Göğüs Pompası",
    "ust_kategori_id": 34,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 41,
    "isim": "Elektrikli Göğüs Pompası",
    "ust_kategori_id": 40,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 42,
    "isim": "Manuel Göğüs Pompası",
    "ust_kategori_id": 40,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 43,
    "isim": "Göğüs Ucu Kremi",
    "ust_kategori_id": 34,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 44,
    "isim": "Hamile & Lohusa Külodu",
    "ust_kategori_id": 34,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 45,
    "isim": "Süt Artırıcı",
    "ust_kategori_id": 34,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 46,
    "isim": "Süt Saklama",
    "ust_kategori_id": 34,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 47,
    "isim": "Süt Saklama Kabı",
    "ust_kategori_id": 46,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 48,
    "isim": "Süt Saklama Poşeti",
    "ust_kategori_id": 46,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 49,
    "isim": "Bebek Bakım",
    "ust_kategori_id": 30,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 50,
    "isim": "Bebek Bakım Seti & Çantası",
    "ust_kategori_id": 49,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 51,
    "isim": "Bebek Beslenme",
    "ust_kategori_id": 49,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 52,
    "isim": "Bebek Beslenme Gereçleri",
    "ust_kategori_id": 51,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 53,
    "isim": "Bardak",
    "ust_kategori_id": 52,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 54,
    "isim": "Alıştırma Bardağı",
    "ust_kategori_id": 53,
    "is_ana_kategori": false,
    "seviye": 6
  },
  {
    "id": 55,
    "isim": "Alıştırma Bardağı Yedek Ucu",
    "ust_kategori_id": 53,
    "is_ana_kategori": false,
    "seviye": 6
  },
  {
    "id": 56,
    "isim": "Bebek Kaşık & Çatal & Tabak",
    "ust_kategori_id": 52,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 57,
    "isim": "Bebek Meyve File & Süzgeci",
    "ust_kategori_id": 52,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 58,
    "isim": "Bebek Termos & Matara",
    "ust_kategori_id": 52,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 59,
    "isim": "Biberon",
    "ust_kategori_id": 52,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 60,
    "isim": "Biberon Gereçleri",
    "ust_kategori_id": 59,
    "is_ana_kategori": false,
    "seviye": 6
  },
  {
    "id": 61,
    "isim": "Biberon Seti",
    "ust_kategori_id": 59,
    "is_ana_kategori": false,
    "seviye": 6
  },
  {
    "id": 62,
    "isim": "Biberon Temizleme Fırçası",
    "ust_kategori_id": 59,
    "is_ana_kategori": false,
    "seviye": 6
  },
  {
    "id": 63,
    "isim": "Cam Biberon",
    "ust_kategori_id": 59,
    "is_ana_kategori": false,
    "seviye": 6
  },
  {
    "id": 64,
    "isim": "PP Biberon",
    "ust_kategori_id": 59,
    "is_ana_kategori": false,
    "seviye": 6
  },
  {
    "id": 65,
    "isim": "Emzik",
    "ust_kategori_id": 52,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 66,
    "isim": "Biberon Emziği",
    "ust_kategori_id": 65,
    "is_ana_kategori": false,
    "seviye": 6
  },
  {
    "id": 67,
    "isim": "Emzik Saklama Kutusu",
    "ust_kategori_id": 65,
    "is_ana_kategori": false,
    "seviye": 6
  },
  {
    "id": 68,
    "isim": "Emzik Zinciri",
    "ust_kategori_id": 65,
    "is_ana_kategori": false,
    "seviye": 6
  },
  {
    "id": 69,
    "isim": "Yalancı Emzik",
    "ust_kategori_id": 65,
    "is_ana_kategori": false,
    "seviye": 6
  },
  {
    "id": 70,
    "isim": "Bebek Bisküvisi",
    "ust_kategori_id": 51,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 71,
    "isim": "Bebek Çayı",
    "ust_kategori_id": 51,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 72,
    "isim": "Biberon Maması",
    "ust_kategori_id": 51,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 73,
    "isim": "Devam Sütü",
    "ust_kategori_id": 51,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 74,
    "isim": "Kaşık & Kavanoz Maması",
    "ust_kategori_id": 51,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 75,
    "isim": "Bebek Cihazları",
    "ust_kategori_id": 49,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 76,
    "isim": "Bebek Telsiz & Kamera",
    "ust_kategori_id": 75,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 77,
    "isim": "Biberon Isıtıcı",
    "ust_kategori_id": 75,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 78,
    "isim": "Biberon Sterilizatörü",
    "ust_kategori_id": 75,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 79,
    "isim": "Bebek Fırça & Tarak",
    "ust_kategori_id": 49,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 80,
    "isim": "Bebek Güneş Ürünleri",
    "ust_kategori_id": 49,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 81,
    "isim": "Bebek Güvenlik",
    "ust_kategori_id": 49,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 82,
    "isim": "Bebek Sinek Kovucu",
    "ust_kategori_id": 49,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 83,
    "isim": "Bebek Tekstil",
    "ust_kategori_id": 49,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 84,
    "isim": "Bebek Battaniyesi",
    "ust_kategori_id": 83,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 85,
    "isim": "Bebek Giyim",
    "ust_kategori_id": 83,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 86,
    "isim": "Bebek Önlüğü",
    "ust_kategori_id": 83,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 87,
    "isim": "Bebek Yastığı",
    "ust_kategori_id": 83,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 88,
    "isim": "Sünnet Külodu",
    "ust_kategori_id": 83,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 89,
    "isim": "Bebek Temizlik",
    "ust_kategori_id": 49,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 90,
    "isim": "Bebek Banyo Süngeri",
    "ust_kategori_id": 89,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 91,
    "isim": "Bebek Bezi",
    "ust_kategori_id": 89,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 92,
    "isim": "Alıştırma Külodu",
    "ust_kategori_id": 91,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 93,
    "isim": "Bebek Bakım Örtüsü",
    "ust_kategori_id": 91,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 94,
    "isim": "Klasik Bebek Bezi",
    "ust_kategori_id": 91,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 95,
    "isim": "Mayo Bez",
    "ust_kategori_id": 91,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 96,
    "isim": "Bebek Burun Bakım",
    "ust_kategori_id": 89,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 97,
    "isim": "Aspiratör & Yedek Ucu",
    "ust_kategori_id": 96,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 98,
    "isim": "Serum Fizyolojik Damla",
    "ust_kategori_id": 96,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 99,
    "isim": "Serum Fizyolojik Sprey",
    "ust_kategori_id": 96,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 100,
    "isim": "Bebek Diş Bakım",
    "ust_kategori_id": 89,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 101,
    "isim": "Bebek Diş Fırçası",
    "ust_kategori_id": 100,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 102,
    "isim": "Bebek Diş Macunu",
    "ust_kategori_id": 100,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 103,
    "isim": "Diş Jeli",
    "ust_kategori_id": 100,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 104,
    "isim": "Diş Kaşıyıcı",
    "ust_kategori_id": 100,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 105,
    "isim": "Bebek Göbek Bakım Seti",
    "ust_kategori_id": 89,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 106,
    "isim": "Bebek Islak Mendil & Havlu",
    "ust_kategori_id": 89,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 107,
    "isim": "Bebek Kolonyası",
    "ust_kategori_id": 89,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 108,
    "isim": "Bebek Krem & Yağı",
    "ust_kategori_id": 89,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 109,
    "isim": "Bebek Kulak Çubuğu",
    "ust_kategori_id": 89,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 110,
    "isim": "Bebek Pamuk",
    "ust_kategori_id": 89,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 111,
    "isim": "Bebek Pişik Kremi & Pudra",
    "ust_kategori_id": 89,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 112,
    "isim": "Bebek Sabun & Köpük",
    "ust_kategori_id": 89,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 113,
    "isim": "Bebek Şampuanı",
    "ust_kategori_id": 89,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 114,
    "isim": "Bebek Tırnak Makası",
    "ust_kategori_id": 49,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 115,
    "isim": "Bebek Ürün Standı",
    "ust_kategori_id": 49,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 116,
    "isim": "Gaz Giderici",
    "ust_kategori_id": 49,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 117,
    "isim": "Oyuncak",
    "ust_kategori_id": 49,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 118,
    "isim": "Diğer Bebek Gereçleri",
    "ust_kategori_id": 49,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 119,
    "isim": "Bebek Hediye Seti",
    "ust_kategori_id": 118,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 120,
    "isim": "Bebek Mobilyası",
    "ust_kategori_id": 118,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 121,
    "isim": "Bebek Tuvaleti",
    "ust_kategori_id": 118,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 122,
    "isim": "Puset & Oto Koltuğu",
    "ust_kategori_id": 118,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 123,
    "isim": "Antioksidan",
    "ust_kategori_id": 31,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 124,
    "isim": "Alpha Lipoik Asit",
    "ust_kategori_id": 123,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 125,
    "isim": "Bitkisel Antioksidan",
    "ust_kategori_id": 123,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 126,
    "isim": "Koenzim Q",
    "ust_kategori_id": 123,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 127,
    "isim": "Arı Sütü & Polen & Propolis",
    "ust_kategori_id": 31,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 128,
    "isim": "Bağışıklık Güçlendirici",
    "ust_kategori_id": 31,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 129,
    "isim": "Bitkisel",
    "ust_kategori_id": 31,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 130,
    "isim": "Bitki Çayı",
    "ust_kategori_id": 129,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 131,
    "isim": "Bitkisel Kapsül & Tablet",
    "ust_kategori_id": 129,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 132,
    "isim": "Bitkisel Macun",
    "ust_kategori_id": 129,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 133,
    "isim": "Droglar",
    "ust_kategori_id": 129,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 134,
    "isim": "Ginseng",
    "ust_kategori_id": 129,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 135,
    "isim": "Keçiboynuzu",
    "ust_kategori_id": 129,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 136,
    "isim": "Nutrasötikler",
    "ust_kategori_id": 129,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 137,
    "isim": "Pasiflora",
    "ust_kategori_id": 129,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 138,
    "isim": "Pekmez & Bal & Dut",
    "ust_kategori_id": 129,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 139,
    "isim": "Sıvı & Toz Ekstrakt",
    "ust_kategori_id": 129,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 140,
    "isim": "Yağlar",
    "ust_kategori_id": 129,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 141,
    "isim": "Eklem Sağlığı",
    "ust_kategori_id": 31,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 142,
    "isim": "Glukozamin Kondroitin MSM",
    "ust_kategori_id": 141,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 143,
    "isim": "Hyaluronik Asit",
    "ust_kategori_id": 141,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 144,
    "isim": "Kolajen Tip",
    "ust_kategori_id": 141,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 145,
    "isim": "Yumurta Kabuğu Zarı",
    "ust_kategori_id": 141,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 146,
    "isim": "Kilo Kontrol",
    "ust_kategori_id": 31,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 147,
    "isim": "Sağlıklı Atıştırmalıklar",
    "ust_kategori_id": 146,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 148,
    "isim": "Sporcu Besinleri",
    "ust_kategori_id": 146,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 149,
    "isim": "Aminoasit",
    "ust_kategori_id": 148,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 150,
    "isim": "Karbonhidrat Tozu",
    "ust_kategori_id": 148,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 151,
    "isim": "L-Carnitine & Yağ Yakıcı",
    "ust_kategori_id": 148,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 152,
    "isim": "Protein Tozu",
    "ust_kategori_id": 148,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 153,
    "isim": "Sporcu Gereçleri",
    "ust_kategori_id": 146,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 154,
    "isim": "Shaker",
    "ust_kategori_id": 153,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 155,
    "isim": "Kolajen",
    "ust_kategori_id": 31,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 156,
    "isim": "Sıvı Kolajen",
    "ust_kategori_id": 155,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 157,
    "isim": "Tablet Kolajen",
    "ust_kategori_id": 155,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 158,
    "isim": "Toz Kolajen",
    "ust_kategori_id": 155,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 159,
    "isim": "Omega & Balık Yağı",
    "ust_kategori_id": 31,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 160,
    "isim": "Balık Yağı Kapsül & Tablet",
    "ust_kategori_id": 159,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 161,
    "isim": "Balık Yağı Şurup",
    "ust_kategori_id": 159,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 162,
    "isim": "Krill Yağı",
    "ust_kategori_id": 159,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 163,
    "isim": "Sindirim",
    "ust_kategori_id": 31,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 164,
    "isim": "Prebiyotik",
    "ust_kategori_id": 163,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 165,
    "isim": "Probiyotik",
    "ust_kategori_id": 163,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 166,
    "isim": "Vitamin & Mineral",
    "ust_kategori_id": 31,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 167,
    "isim": "Folik Asit",
    "ust_kategori_id": 166,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 168,
    "isim": "Mineral",
    "ust_kategori_id": 166,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 169,
    "isim": "Multivitamin",
    "ust_kategori_id": 166,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 170,
    "isim": "Saç & Cilt & Tırnak",
    "ust_kategori_id": 166,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 171,
    "isim": "Vitamin",
    "ust_kategori_id": 166,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 172,
    "isim": "Diğer Besin Takviyeleri",
    "ust_kategori_id": 31,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 173,
    "isim": "Ağda, Epilasyon, Tüy",
    "ust_kategori_id": 32,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 174,
    "isim": "Ağda & Ağda Bandı",
    "ust_kategori_id": 173,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 175,
    "isim": "Ağda & Epilasyon Gereçleri",
    "ust_kategori_id": 173,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 176,
    "isim": "Burun & Bıyık Makası",
    "ust_kategori_id": 173,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 177,
    "isim": "Cımbız",
    "ust_kategori_id": 173,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 178,
    "isim": "Tüy Azaltıcı Krem & Serum",
    "ust_kategori_id": 173,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 179,
    "isim": "Tüy Dökücü",
    "ust_kategori_id": 173,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 180,
    "isim": "Tüy Dökücü Krem",
    "ust_kategori_id": 179,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 181,
    "isim": "Tüy Dökücü Sprey",
    "ust_kategori_id": 179,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 182,
    "isim": "Tüy Dökücü Toz",
    "ust_kategori_id": 179,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 183,
    "isim": "Tüy Sarartıcı",
    "ust_kategori_id": 173,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 184,
    "isim": "Ağız Bakım",
    "ust_kategori_id": 32,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 185,
    "isim": "Ağız Bakım Seti",
    "ust_kategori_id": 184,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 186,
    "isim": "Ağız Çalkalama Suyu & Gargara",
    "ust_kategori_id": 184,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 187,
    "isim": "Ağız Kokusu Önleyici",
    "ust_kategori_id": 184,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 188,
    "isim": "Ağız Yara Bakım",
    "ust_kategori_id": 184,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 189,
    "isim": "Dil Temizleyici",
    "ust_kategori_id": 184,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 190,
    "isim": "Diş Arayüz Fırçası",
    "ust_kategori_id": 184,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 191,
    "isim": "Diş Beyazlatıcı",
    "ust_kategori_id": 184,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 192,
    "isim": "Diş Fırçası",
    "ust_kategori_id": 184,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 193,
    "isim": "Diş Fırçası Kabı",
    "ust_kategori_id": 192,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 194,
    "isim": "Diş Fırçası Yedek Başlık",
    "ust_kategori_id": 192,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 195,
    "isim": "Manuel Diş Fırçası",
    "ust_kategori_id": 192,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 196,
    "isim": "Pilli Diş Fırçası",
    "ust_kategori_id": 192,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 197,
    "isim": "Şarjlı Diş Fırçası",
    "ust_kategori_id": 192,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 198,
    "isim": "Diş Gıcırdatma Aparatı",
    "ust_kategori_id": 184,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 199,
    "isim": "Diş İpi & Kürdan",
    "ust_kategori_id": 184,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 200,
    "isim": "Diş Macunu",
    "ust_kategori_id": 184,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 201,
    "isim": "Çocuk Diş Macunu",
    "ust_kategori_id": 200,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 202,
    "isim": "Yetişkin Diş Macunu",
    "ust_kategori_id": 200,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 203,
    "isim": "Diş Protezi",
    "ust_kategori_id": 184,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 204,
    "isim": "Protez Diş Fırçası",
    "ust_kategori_id": 203,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 205,
    "isim": "Protez Saklama Kabı",
    "ust_kategori_id": 203,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 206,
    "isim": "Protez Yapıştırıcı",
    "ust_kategori_id": 203,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 207,
    "isim": "Temizleyici Tablet",
    "ust_kategori_id": 203,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 208,
    "isim": "Diş Tozu & Pastası",
    "ust_kategori_id": 184,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 209,
    "isim": "Seyahat Seti",
    "ust_kategori_id": 184,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 210,
    "isim": "Cilt Bakım",
    "ust_kategori_id": 32,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 211,
    "isim": "Akne & Sivilce",
    "ust_kategori_id": 210,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 212,
    "isim": "Anti Aging",
    "ust_kategori_id": 210,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 213,
    "isim": "BB Krem",
    "ust_kategori_id": 210,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 214,
    "isim": "Cilt Bakım Seti",
    "ust_kategori_id": 210,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 215,
    "isim": "Cilt Maskesi",
    "ust_kategori_id": 210,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 216,
    "isim": "Vücut Maskesi",
    "ust_kategori_id": 215,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 217,
    "isim": "Yüz Maskesi",
    "ust_kategori_id": 215,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 218,
    "isim": "Cilt Nemlendirici",
    "ust_kategori_id": 210,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 219,
    "isim": "Vücut Nemlendirici",
    "ust_kategori_id": 218,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 220,
    "isim": "Yüz Nemlendirici",
    "ust_kategori_id": 218,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 221,
    "isim": "Cilt Serumu",
    "ust_kategori_id": 210,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 222,
    "isim": "Vücut Serumu",
    "ust_kategori_id": 221,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 223,
    "isim": "Yüz Serumu",
    "ust_kategori_id": 221,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 224,
    "isim": "Cilt Temizleyici",
    "ust_kategori_id": 210,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 225,
    "isim": "Antibakteriyel & Alkollü Mendil",
    "ust_kategori_id": 224,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 226,
    "isim": "Dezenfektan Cihaz & Aparatları",
    "ust_kategori_id": 224,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 227,
    "isim": "El & Cilt Dezenfektanı",
    "ust_kategori_id": 224,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 228,
    "isim": "Hijyen Kiti",
    "ust_kategori_id": 224,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 229,
    "isim": "Temizleme Jeli",
    "ust_kategori_id": 224,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 230,
    "isim": "Çatlak Giderici",
    "ust_kategori_id": 210,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 231,
    "isim": "Dudak Bakım",
    "ust_kategori_id": 210,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 232,
    "isim": "Göz Çevresi Bakım",
    "ust_kategori_id": 210,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 233,
    "isim": "Göz Çevresi Krem & Serum",
    "ust_kategori_id": 232,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 234,
    "isim": "Göz Makyaj Temizleyici",
    "ust_kategori_id": 232,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 235,
    "isim": "Göz Maskesi",
    "ust_kategori_id": 232,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 236,
    "isim": "Kaş & Kirpik",
    "ust_kategori_id": 232,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 237,
    "isim": "Güneş & Bronzluk",
    "ust_kategori_id": 210,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 238,
    "isim": "Güneş Koruyucu Set",
    "ust_kategori_id": 237,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 239,
    "isim": "Güneş Kremi & Losyonu",
    "ust_kategori_id": 237,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 240,
    "isim": "Güneş Sonrası",
    "ust_kategori_id": 237,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 241,
    "isim": "Güneş Sütü",
    "ust_kategori_id": 237,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 242,
    "isim": "Güneş Yağı",
    "ust_kategori_id": 237,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 243,
    "isim": "Kaşıntı Giderici",
    "ust_kategori_id": 210,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 244,
    "isim": "Leke & Kızarıklık Giderici",
    "ust_kategori_id": 210,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 245,
    "isim": "Peeling & Arındırıcı",
    "ust_kategori_id": 210,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 246,
    "isim": "Selülit Giderici & Sıkılaştırıcı",
    "ust_kategori_id": 210,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 247,
    "isim": "Temizleyici & Tonik",
    "ust_kategori_id": 210,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 248,
    "isim": "Deodorant",
    "ust_kategori_id": 32,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 249,
    "isim": "Deodorant Kofre",
    "ust_kategori_id": 248,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 250,
    "isim": "Gül Suyu",
    "ust_kategori_id": 248,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 251,
    "isim": "Krem Deodorant",
    "ust_kategori_id": 248,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 252,
    "isim": "Roll-On Deodorant",
    "ust_kategori_id": 248,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 253,
    "isim": "Sprey Deodorant",
    "ust_kategori_id": 248,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 254,
    "isim": "Terleme Karşıtı",
    "ust_kategori_id": 248,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 255,
    "isim": "Vücut Spreyi",
    "ust_kategori_id": 248,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 256,
    "isim": "Duş & Banyo",
    "ust_kategori_id": 32,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 257,
    "isim": "Banyo Lifi & Kesesi & Süngeri",
    "ust_kategori_id": 256,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 258,
    "isim": "Banyo Tuzu",
    "ust_kategori_id": 256,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 259,
    "isim": "Duş Jeli & Köpüğü",
    "ust_kategori_id": 256,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 260,
    "isim": "Sabun",
    "ust_kategori_id": 256,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 261,
    "isim": "Saç Yıkama Bonesi",
    "ust_kategori_id": 256,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 262,
    "isim": "El, Ayak, Tırnak Bakım",
    "ust_kategori_id": 32,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 263,
    "isim": "Ayak Bakım",
    "ust_kategori_id": 262,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 264,
    "isim": "Ayak & Ayakkabı Koku Önleyici",
    "ust_kategori_id": 263,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 265,
    "isim": "Ayak & Topuk Kremi",
    "ust_kategori_id": 263,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 266,
    "isim": "Ayak Törpü & Ponza",
    "ust_kategori_id": 263,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 267,
    "isim": "Pedikür Gereçleri",
    "ust_kategori_id": 263,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 268,
    "isim": "El Bakım",
    "ust_kategori_id": 262,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 269,
    "isim": "El & Tırnak Kremleri",
    "ust_kategori_id": 268,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 270,
    "isim": "Nasır & Mantar & Siğil",
    "ust_kategori_id": 262,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 271,
    "isim": "Tırnak Bakım",
    "ust_kategori_id": 262,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 272,
    "isim": "Acı Cila",
    "ust_kategori_id": 271,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 273,
    "isim": "Aseton & Oje Çıkarıcı",
    "ust_kategori_id": 271,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 274,
    "isim": "Manikür Gereçleri",
    "ust_kategori_id": 271,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 275,
    "isim": "Oje",
    "ust_kategori_id": 271,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 276,
    "isim": "Tırnak Güçlendirici",
    "ust_kategori_id": 271,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 277,
    "isim": "Tırnak Makası",
    "ust_kategori_id": 271,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 278,
    "isim": "Erkek Bakım",
    "ust_kategori_id": 32,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 279,
    "isim": "Erkek Tıraş Bıçağı & Yedekleri",
    "ust_kategori_id": 278,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 280,
    "isim": "Sakal & Bıyık Bakım",
    "ust_kategori_id": 278,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 281,
    "isim": "Tıraş Fırçası",
    "ust_kategori_id": 278,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 282,
    "isim": "Tıraş Köpük & Jel & Krem",
    "ust_kategori_id": 278,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 283,
    "isim": "Tıraş Makinesi",
    "ust_kategori_id": 278,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 284,
    "isim": "Tıraş Sonrası",
    "ust_kategori_id": 278,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 285,
    "isim": "Tıraş Kolonyası",
    "ust_kategori_id": 284,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 286,
    "isim": "Tıraş Losyonu",
    "ust_kategori_id": 284,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 287,
    "isim": "Kadın Bakım",
    "ust_kategori_id": 32,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 288,
    "isim": "Hijyenik Ped",
    "ust_kategori_id": 287,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 289,
    "isim": "Kolonya",
    "ust_kategori_id": 32,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 290,
    "isim": "Bidon Kolonya",
    "ust_kategori_id": 289,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 291,
    "isim": "Cam Şişe Kolonya",
    "ust_kategori_id": 289,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 292,
    "isim": "Parfüm",
    "ust_kategori_id": 32,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 293,
    "isim": "Erkek Parfüm & Kofre",
    "ust_kategori_id": 292,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 294,
    "isim": "Kadın Parfüm & Kofre",
    "ust_kategori_id": 292,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 295,
    "isim": "Saç Bakım",
    "ust_kategori_id": 32,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 296,
    "isim": "Bit & Sirke",
    "ust_kategori_id": 295,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 297,
    "isim": "Bit Losyonu",
    "ust_kategori_id": 296,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 298,
    "isim": "Bit Spreyi",
    "ust_kategori_id": 296,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 299,
    "isim": "Bit Şampuanı",
    "ust_kategori_id": 296,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 300,
    "isim": "Bit Tedavi Kiti",
    "ust_kategori_id": 296,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 301,
    "isim": "Bit Toka & Rozeti & Tarağı",
    "ust_kategori_id": 296,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 302,
    "isim": "Saç Bakım Aletleri",
    "ust_kategori_id": 295,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 303,
    "isim": "Saç Bakım Setleri",
    "ust_kategori_id": 295,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 304,
    "isim": "Saç Boyası & Gereçleri",
    "ust_kategori_id": 295,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 305,
    "isim": "Kına",
    "ust_kategori_id": 304,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 306,
    "isim": "Saç Açıcı",
    "ust_kategori_id": 304,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 307,
    "isim": "Saç Boyama Fırçası",
    "ust_kategori_id": 304,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 308,
    "isim": "Saç Boyası",
    "ust_kategori_id": 304,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 309,
    "isim": "Saç Fiberi",
    "ust_kategori_id": 304,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 310,
    "isim": "Saç Fırça, Tarak & Toka",
    "ust_kategori_id": 295,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 311,
    "isim": "Dermaroller",
    "ust_kategori_id": 310,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 312,
    "isim": "Saç Fırçası",
    "ust_kategori_id": 310,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 313,
    "isim": "Saç Tokası",
    "ust_kategori_id": 310,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 314,
    "isim": "Tarak",
    "ust_kategori_id": 310,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 315,
    "isim": "Saç Kremi",
    "ust_kategori_id": 295,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 316,
    "isim": "Saç Losyonu",
    "ust_kategori_id": 295,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 317,
    "isim": "Saç Maskesi",
    "ust_kategori_id": 295,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 318,
    "isim": "Saç Serumu & Yağı & Toniği",
    "ust_kategori_id": 295,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 319,
    "isim": "Saç Bakım Serumu",
    "ust_kategori_id": 318,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 320,
    "isim": "Saç Bakım Toniği",
    "ust_kategori_id": 318,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 321,
    "isim": "Saç Bakım Yağı",
    "ust_kategori_id": 318,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 322,
    "isim": "Saç Şekillendirici",
    "ust_kategori_id": 295,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 323,
    "isim": "Briyantin",
    "ust_kategori_id": 322,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 324,
    "isim": "Saç Jölesi",
    "ust_kategori_id": 322,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 325,
    "isim": "Saç Köpüğü",
    "ust_kategori_id": 322,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 326,
    "isim": "Saç Spreyi",
    "ust_kategori_id": 322,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 327,
    "isim": "Wax",
    "ust_kategori_id": 322,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 328,
    "isim": "Şampuan",
    "ust_kategori_id": 295,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 329,
    "isim": "Enjektör",
    "ust_kategori_id": 33,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 330,
    "isim": "Beşeri Enjektör",
    "ust_kategori_id": 329,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 331,
    "isim": "Beşeri Enjektör Ucu",
    "ust_kategori_id": 329,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 332,
    "isim": "Hazır Enjektör",
    "ust_kategori_id": 329,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 333,
    "isim": "İnsülin Enjektörü",
    "ust_kategori_id": 329,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 334,
    "isim": "İnsülin İğne Ucu",
    "ust_kategori_id": 329,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 335,
    "isim": "Galenik Ürün & Gereçler",
    "ust_kategori_id": 33,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 336,
    "isim": "Cam & Plastik Şişe",
    "ust_kategori_id": 335,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 337,
    "isim": "Damlalık",
    "ust_kategori_id": 335,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 338,
    "isim": "İngiliz Karbonatı",
    "ust_kategori_id": 335,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 339,
    "isim": "Laboratuvar Sarf Malzemeleri",
    "ust_kategori_id": 335,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 340,
    "isim": "Pomat Kutusu",
    "ust_kategori_id": 335,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 341,
    "isim": "Produi",
    "ust_kategori_id": 335,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 342,
    "isim": "Hasta Bakım",
    "ust_kategori_id": 33,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 343,
    "isim": "Hasta Bezi",
    "ust_kategori_id": 342,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 344,
    "isim": "Hasta Yatak Örtüsü",
    "ust_kategori_id": 342,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 345,
    "isim": "Alez",
    "ust_kategori_id": 344,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 346,
    "isim": "Yatak Koruyucu",
    "ust_kategori_id": 344,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 347,
    "isim": "Mesane Külodu",
    "ust_kategori_id": 342,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 348,
    "isim": "Mesane Pedi",
    "ust_kategori_id": 342,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 349,
    "isim": "Erkek Mesane Pedi",
    "ust_kategori_id": 348,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 350,
    "isim": "Kadın Mesane Pedi",
    "ust_kategori_id": 348,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 351,
    "isim": "Tens Cihazı",
    "ust_kategori_id": 342,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 352,
    "isim": "Yara Bakım Ürünleri",
    "ust_kategori_id": 342,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 353,
    "isim": "Antiseptik",
    "ust_kategori_id": 352,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 354,
    "isim": "Bandaj",
    "ust_kategori_id": 352,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 355,
    "isim": "Flaster",
    "ust_kategori_id": 352,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 356,
    "isim": "Gaz Kompres",
    "ust_kategori_id": 352,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 357,
    "isim": "Gazlı Bez",
    "ust_kategori_id": 352,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 358,
    "isim": "Hasta Temizleme Malzemeleri",
    "ust_kategori_id": 352,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 359,
    "isim": "Perine Temizleme Malzemeleri",
    "ust_kategori_id": 352,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 360,
    "isim": "Sargı Bezi",
    "ust_kategori_id": 352,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 361,
    "isim": "Yara Bandı",
    "ust_kategori_id": 352,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 362,
    "isim": "Yara Kremi & Merhem & Jel",
    "ust_kategori_id": 352,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 363,
    "isim": "Yara Pedi & Örtüsü",
    "ust_kategori_id": 352,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 364,
    "isim": "Yatak",
    "ust_kategori_id": 342,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 365,
    "isim": "Hasta Karyolası",
    "ust_kategori_id": 364,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 366,
    "isim": "Havalı Yatak",
    "ust_kategori_id": 364,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 367,
    "isim": "Isı & Nem Ölçer",
    "ust_kategori_id": 33,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 368,
    "isim": "Duvar & Banyo Derecesi",
    "ust_kategori_id": 367,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 369,
    "isim": "Nem Ölçer",
    "ust_kategori_id": 367,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 370,
    "isim": "Isıtıcı & Soğutucu",
    "ust_kategori_id": 33,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 371,
    "isim": "Buz Aküsü",
    "ust_kategori_id": 370,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 372,
    "isim": "Elektrikli Isıtıcılar",
    "ust_kategori_id": 370,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 373,
    "isim": "Sıcak Su Torbası",
    "ust_kategori_id": 370,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 374,
    "isim": "Termojel",
    "ust_kategori_id": 370,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 375,
    "isim": "Yakı & Isı Bandı",
    "ust_kategori_id": 370,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 376,
    "isim": "İlaç Saklama",
    "ust_kategori_id": 33,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 377,
    "isim": "İlaç Kabı",
    "ust_kategori_id": 376,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 378,
    "isim": "İlaç Kesici & Ezici",
    "ust_kategori_id": 376,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 379,
    "isim": "İlk Yardım",
    "ust_kategori_id": 33,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 380,
    "isim": "Ağrı Kesici Bant",
    "ust_kategori_id": 379,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 381,
    "isim": "Ağrı Kesici Krem",
    "ust_kategori_id": 379,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 382,
    "isim": "Ateş Düşürücü Bant",
    "ust_kategori_id": 379,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 383,
    "isim": "Ecza Dolabı",
    "ust_kategori_id": 379,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 384,
    "isim": "İlk Yardım Seti & Çantası",
    "ust_kategori_id": 379,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 385,
    "isim": "Soğutucu Sprey & Jel",
    "ust_kategori_id": 379,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 386,
    "isim": "Diğer İlk Yardım Malzemeleri",
    "ust_kategori_id": 379,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 387,
    "isim": "Koruyucu Ekipmanlar",
    "ust_kategori_id": 33,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 388,
    "isim": "Koruyucu Gözlük",
    "ust_kategori_id": 387,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 389,
    "isim": "Koruyucu Siperlik",
    "ust_kategori_id": 387,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 390,
    "isim": "Koruyucu Tulum",
    "ust_kategori_id": 387,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 391,
    "isim": "Medikal Cihazlar",
    "ust_kategori_id": 33,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 392,
    "isim": "Ateş Ölçer",
    "ust_kategori_id": 391,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 393,
    "isim": "Beden Derecesi",
    "ust_kategori_id": 392,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 394,
    "isim": "Kulaktan Ateş Ölçer",
    "ust_kategori_id": 392,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 395,
    "isim": "Temassız Ateş Ölçer",
    "ust_kategori_id": 392,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 396,
    "isim": "Hava Temizleyici",
    "ust_kategori_id": 391,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 397,
    "isim": "Kulak Delme Tabancası",
    "ust_kategori_id": 391,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 398,
    "isim": "Masaj Aleti",
    "ust_kategori_id": 391,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 399,
    "isim": "Oksimetre",
    "ust_kategori_id": 391,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 400,
    "isim": "Otoskop",
    "ust_kategori_id": 391,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 401,
    "isim": "Solunum Destek",
    "ust_kategori_id": 391,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 402,
    "isim": "Chamber",
    "ust_kategori_id": 401,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 403,
    "isim": "Hava Nemlendirici",
    "ust_kategori_id": 401,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 404,
    "isim": "Nebulizatör Cihazı",
    "ust_kategori_id": 401,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 405,
    "isim": "Nebulizatör Gereçleri",
    "ust_kategori_id": 401,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 406,
    "isim": "Nebulizatör Maskesi",
    "ust_kategori_id": 401,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 407,
    "isim": "Çocuk Nebulizatör Maskesi",
    "ust_kategori_id": 406,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 408,
    "isim": "Yetişkin Nebulizatör Maskesi",
    "ust_kategori_id": 406,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 409,
    "isim": "Solunum Cihazı",
    "ust_kategori_id": 401,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 410,
    "isim": "Solunum Maskesi",
    "ust_kategori_id": 401,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 411,
    "isim": "Diğer Medikal Cihazlar",
    "ust_kategori_id": 391,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 412,
    "isim": "Ortopedi",
    "ust_kategori_id": 33,
    "is_ana_kategori": false,
    "seviye": 2
  },
  {
    "id": 413,
    "isim": "Ayak",
    "ust_kategori_id": 412,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 414,
    "isim": "Ayak Bilekliği",
    "ust_kategori_id": 413,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 415,
    "isim": "Aircast Ayak Bilekliği",
    "ust_kategori_id": 414,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 416,
    "isim": "Aşil Tendon Destekli",
    "ust_kategori_id": 414,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 417,
    "isim": "Çapraz Bileklik",
    "ust_kategori_id": 414,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 418,
    "isim": "Elastik Ayak Bilekliği",
    "ust_kategori_id": 414,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 419,
    "isim": "Ligament Destekli Ayak Bilekliği",
    "ust_kategori_id": 414,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 420,
    "isim": "Malleol Destekli",
    "ust_kategori_id": 414,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 421,
    "isim": "Medikal Ayak Bilekliği",
    "ust_kategori_id": 414,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 422,
    "isim": "Örgü Ayak Bilekliği",
    "ust_kategori_id": 414,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 423,
    "isim": "Sekiz Bandaj",
    "ust_kategori_id": 414,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 424,
    "isim": "Silikonlu Ayak Bilekliği",
    "ust_kategori_id": 414,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 425,
    "isim": "Ortopedik Ayakkabı",
    "ust_kategori_id": 413,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 426,
    "isim": "Ortopedik Terlik",
    "ust_kategori_id": 413,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 427,
    "isim": "Alçı Terliği",
    "ust_kategori_id": 426,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 428,
    "isim": "Parmak Ayırıcı",
    "ust_kategori_id": 413,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 429,
    "isim": "Bunyon Yastığı",
    "ust_kategori_id": 428,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 430,
    "isim": "Hallus Valgus",
    "ust_kategori_id": 428,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 431,
    "isim": "Metatarsal",
    "ust_kategori_id": 428,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 432,
    "isim": "Parmak Arası Makara",
    "ust_kategori_id": 428,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 433,
    "isim": "Parmak Koruyucu",
    "ust_kategori_id": 428,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 434,
    "isim": "Tabanlık",
    "ust_kategori_id": 413,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 435,
    "isim": "Çelik Tabanlık",
    "ust_kategori_id": 434,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 436,
    "isim": "Kamalı Tabanlık",
    "ust_kategori_id": 434,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 437,
    "isim": "Kumaş Tabanlık",
    "ust_kategori_id": 434,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 438,
    "isim": "Mantar Tabanlık",
    "ust_kategori_id": 434,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 439,
    "isim": "Silikon Tabanlık",
    "ust_kategori_id": 434,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 440,
    "isim": "Topukluk",
    "ust_kategori_id": 413,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 441,
    "isim": "Baldır",
    "ust_kategori_id": 412,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 442,
    "isim": "Alt Baldırlık",
    "ust_kategori_id": 441,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 443,
    "isim": "Üst Baldırlık",
    "ust_kategori_id": 441,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 444,
    "isim": "Boyunluk",
    "ust_kategori_id": 412,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 445,
    "isim": "Nelson Boyunluk",
    "ust_kategori_id": 444,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 446,
    "isim": "Philedelphia Boyunluk",
    "ust_kategori_id": 444,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 447,
    "isim": "Sünger Boyunluk",
    "ust_kategori_id": 444,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 448,
    "isim": "Bulantı Bilekliği",
    "ust_kategori_id": 412,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 449,
    "isim": "Dirsek",
    "ust_kategori_id": 412,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 450,
    "isim": "Elastik Dirseklik",
    "ust_kategori_id": 449,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 451,
    "isim": "Epikondilit Bandaj",
    "ust_kategori_id": 449,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 452,
    "isim": "Medikal Dirseklik",
    "ust_kategori_id": 449,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 453,
    "isim": "Örgü Dirseklik",
    "ust_kategori_id": 449,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 454,
    "isim": "Silikon Destekli Dirseklik",
    "ust_kategori_id": 449,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 455,
    "isim": "Tenisçi Dirsekliği",
    "ust_kategori_id": 449,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 456,
    "isim": "Diz",
    "ust_kategori_id": 412,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 457,
    "isim": "Açı Ayarlı Dizlik",
    "ust_kategori_id": 456,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 458,
    "isim": "Elastik Dizlik",
    "ust_kategori_id": 456,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 459,
    "isim": "Ligament Destekli Dizlik",
    "ust_kategori_id": 456,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 460,
    "isim": "Medikal Dizlik",
    "ust_kategori_id": 456,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 461,
    "isim": "Menteşeli Dizlik",
    "ust_kategori_id": 456,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 462,
    "isim": "Neopren Dizlik",
    "ust_kategori_id": 456,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 463,
    "isim": "Patella Destekli Dizlik",
    "ust_kategori_id": 456,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 464,
    "isim": "Tendon Bandı",
    "ust_kategori_id": 456,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 465,
    "isim": "Yün Dizlik",
    "ust_kategori_id": 456,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 466,
    "isim": "Egzersiz Gereçleri",
    "ust_kategori_id": 412,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 467,
    "isim": "Egzersiz Bandı",
    "ust_kategori_id": 466,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 468,
    "isim": "El Egzersiz Topu",
    "ust_kategori_id": 466,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 469,
    "isim": "Kurşun Ağırlık",
    "ust_kategori_id": 466,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 470,
    "isim": "Stres Topu",
    "ust_kategori_id": 466,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 471,
    "isim": "El",
    "ust_kategori_id": 412,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 472,
    "isim": "Başparmak Tespit Ateli",
    "ust_kategori_id": 471,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 473,
    "isim": "Bilek Bandajı",
    "ust_kategori_id": 471,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 474,
    "isim": "El Bilek Ateli",
    "ust_kategori_id": 471,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 475,
    "isim": "Başparmak Destekli",
    "ust_kategori_id": 474,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 476,
    "isim": "Başparmak Desteksiz",
    "ust_kategori_id": 474,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 477,
    "isim": "El Bilek Splinti",
    "ust_kategori_id": 474,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 478,
    "isim": "Örgü El Bilek Ateli",
    "ust_kategori_id": 474,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 479,
    "isim": "El Parmak Ateli",
    "ust_kategori_id": 471,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 480,
    "isim": "Beyzbol",
    "ust_kategori_id": 479,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 481,
    "isim": "İkili & Dörtlü",
    "ust_kategori_id": 479,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 482,
    "isim": "Kurbağa",
    "ust_kategori_id": 479,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 483,
    "isim": "Mallet Finger",
    "ust_kategori_id": 479,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 484,
    "isim": "Parmak Splinti",
    "ust_kategori_id": 479,
    "is_ana_kategori": false,
    "seviye": 5
  },
  {
    "id": 485,
    "isim": "Kol",
    "ust_kategori_id": 412,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 486,
    "isim": "Kol Askısı",
    "ust_kategori_id": 485,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 487,
    "isim": "Omuz Askısı",
    "ust_kategori_id": 485,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 488,
    "isim": "Omuz Sabitleyici",
    "ust_kategori_id": 485,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 489,
    "isim": "Korse",
    "ust_kategori_id": 412,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 490,
    "isim": "Abdominal Korse",
    "ust_kategori_id": 489,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 491,
    "isim": "Dorsolomber Korse",
    "ust_kategori_id": 489,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 492,
    "isim": "Göğüs Korsesi",
    "ust_kategori_id": 489,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 493,
    "isim": "Hamile Korsesi",
    "ust_kategori_id": 489,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 494,
    "isim": "Karın Korsesi",
    "ust_kategori_id": 489,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 495,
    "isim": "Klavikula Bandajı",
    "ust_kategori_id": 489,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 496,
    "isim": "Lumbosakral Korse",
    "ust_kategori_id": 489,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 497,
    "isim": "Lumbostad Korse",
    "ust_kategori_id": 489,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 498,
    "isim": "Postureks Korse",
    "ust_kategori_id": 489,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 499,
    "isim": "Yün Korse",
    "ust_kategori_id": 489,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 500,
    "isim": "Ortopedik Destek Ürünleri",
    "ust_kategori_id": 412,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 501,
    "isim": "Baston",
    "ust_kategori_id": 500,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 502,
    "isim": "Kanedyen",
    "ust_kategori_id": 500,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 503,
    "isim": "Klozet Yükseltici",
    "ust_kategori_id": 500,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 504,
    "isim": "Koltuk Değneği",
    "ust_kategori_id": 500,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 505,
    "isim": "Tekerlekli Sandalye",
    "ust_kategori_id": 500,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 506,
    "isim": "Yürüteç",
    "ust_kategori_id": 500,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 507,
    "isim": "Ortopedik Yastık",
    "ust_kategori_id": 412,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 508,
    "isim": "Bel Yastığı",
    "ust_kategori_id": 507,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 509,
    "isim": "Boyun Yastığı",
    "ust_kategori_id": 507,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 510,
    "isim": "Horlama Yastığı",
    "ust_kategori_id": 507,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 511,
    "isim": "Reflü Yastığı",
    "ust_kategori_id": 507,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 512,
    "isim": "Seyahat Yastığı",
    "ust_kategori_id": 507,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 513,
    "isim": "Uyku Yastığı",
    "ust_kategori_id": 507,
    "is_ana_kategori": false,
    "seviye": 4
  },
  {
    "id": 514,
    "isim": "Oturma Simidi",
    "ust_kategori_id": 412,
    "is_ana_kategori": false,
    "seviye": 3
  },
  {
    "id": 515,
    "isim": "Protez Ürünler",
    "ust_kategori_id": 412,
    "is_ana_kategori": false,
    "seviye": 3
  }

];

export const categoryMap = buildCategoryMap(rawData);

// ── Helper fonksiyonlar (değişmedi) ──
export const getCategory = (id: number) => categoryMap[id] ?? null;
export const getAnaKategoriler = () => Object.values(categoryMap).filter(c => c.is_ana_kategori);
export const getAltKategoriler = (anaId: number) => Object.values(categoryMap).filter(c => c.ust_kategori_id === anaId);
export const isInAnaKategori = (id: number, anaId: number) => categoryMap[id]?.tam_yol_ids.includes(anaId) ?? false;
export const getBreadcrumb = (id: number) => categoryMap[id]?.tam_yol.join(' > ') ?? '';
export const getAnaKategoriIsim = (id: number) => categoryMap[id]?.tam_yol[0] ?? '';



/**
 * Bir ürünün ilaç olup olmadığını kontrol eder
 * kategori_id'den root_id'yi çıkararak karar verir
 * 
 * @param categoryId - Kategori ID (ürün detayında kategori_id)
 * @returns true ilaç ise (root_id=1), false ilaç dışı ise (root_id=2 veya 3)
 */
export function isPharmaceuticalCategory(categoryId: number | null): boolean {
  if (categoryId === null || categoryId === undefined) {
    return false;
  }

  // categoryMap'ten kategoriyi bul
  const category = categoryMap[categoryId];
  if (!category) {
    return false;
  }

  // tam_yol_ids'in ilk elemanı root_id'dir (1=İLAÇ, 2=İDU, 3=İBR)
  const rootId = category.tam_yol_ids[0];

  return rootId === 1; // Sadece 1 (İLAÇ) true döner
}