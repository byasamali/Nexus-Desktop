"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Layers, Plus, Trash2, Search, Check, X, ArrowRight, Tag, RefreshCw } from 'lucide-react';

interface Category {
  id: number;
  isim: string;
  ust_kategori_id: number | null;
  is_ana_kategori: boolean;
  seviye: number;
}

interface Product {
  barkod: string;
  urun_adi: string;
  kategori_id: number | null;
  kategori_adi: string;
}

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  
  // Category Form State
  const [newCatName, setNewCatName] = useState("");
  const [newCatParent, setNewCatParent] = useState<number | null>(null);
  
  // Product Search State
  const [productQuery, setProductQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  
  // State for products in the selected category
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Status Messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load all categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load products of selected category
  useEffect(() => {
    if (selectedCategoryId !== null) {
      loadCategoryProducts();
    } else {
      setCategoryProducts([]);
    }
  }, [selectedCategoryId, categories]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  const runAction = async (action: string, params: any = {}) => {
    try {
      if (typeof window === 'undefined' || !(window as any).go || !(window as any).go.main || !(window as any).go.main.App) {
        console.warn(`Wails/Electron API not available for action: ${action}`);
        if (action === "list") {
          return { status: "success", categories: [] };
        }
        return { status: "success", products: [] };
      }
      const response = await (window as any).go.main.App.RunCategoryAction(action, JSON.stringify(params));
      const result = JSON.parse(response);
      return result;
    } catch (err: any) {
      console.error(`Error in RunCategoryAction (${action}):`, err);
      return { status: "error", message: err.message || "Bilinmeyen hata" };
    }
  };

  const loadCategories = async () => {
    const res = await runAction("list");
    if (res.status === "success") {
      setCategories(res.categories || []);
    } else {
      showError(res.message || "Kategoriler yüklenemedi");
    }
  };

  const loadCategoryProducts = async () => {
    if (selectedCategoryId === null) return;
    setLoadingProducts(true);
    // Categories are queried by listing products assigned to selected category id
    // We can run search-products with a specific query, but we don't have a direct "list products by category" action.
    // However, our search_products Python query does: 
    // SELECT p.barkod, p.master_urun_adi, p.kategori_id, c.isim as kategori_adi FROM products p
    // We can search for all products of this category by passing category_id or searching inside all products.
    // Wait! Let's write a direct query or use search-products with a empty query?
    // In manage_categories.py, search_products does: "WHERE p.barkod LIKE ? OR p.master_urun_adi LIKE ?"
    // If the query is empty or "%", it gets up to limit. But we can modify manage_categories.py or search for the category name.
    // Wait, let's search for products where their category_id is selectedCategoryId.
    // Let's implement an action `list-products` in manage_categories.py to list products of a category, or we can query it easily.
    // Wait, let's see if we should modify manage_categories.py to add `list-category-products`.
    // Actually, let's check: how can we list products of a category?
    // Let's run a search in python for products of a category. Let's add that action to manage_categories.py!
    // But first, let's see what categories we have.
    const res = await runAction("search-products", { query: "", limit: 100 });
    if (res.status === "success") {
      // Filter manually on frontend for now, or fetch from python
      // Wait, manual filtering is fine if we only load a subset, but let's update python script to support listing by category!
      // Let's add action "list-by-category" in Python script. It's safer and cleaner.
      // We will modify manage_categories.py to add "list-by-category" action which queries "WHERE kategori_id = ?".
      // Let's do that right away.
    }
    
    // We will call "list-by-category" action
    const categoryRes = await runAction("list-by-category", { category_id: selectedCategoryId });
    if (categoryRes.status === "success") {
      setCategoryProducts(categoryRes.products || []);
    } else {
      showError(categoryRes.message || "Kategori ürünleri yüklenemedi");
    }
    setLoadingProducts(false);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    
    const res = await runAction("add", { name: newCatName, parent_id: newCatParent });
    if (res.status === "success") {
      showSuccess(`'${newCatName}' kategorisi başarıyla oluşturuldu.`);
      setNewCatName("");
      setNewCatParent(null);
      await loadCategories();
    } else {
      showError(res.message || "Kategori eklenemedi");
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    if (id === 1 || id === 2) {
      showError("Sistem kategorileri silinemez.");
      return;
    }
    if (!confirm(`'${name}' kategorisini silmek istediğinize emin misiniz? Bu kategoriye ait ürünler varsayılan kategoriye aktarılacaktır.`)) {
      return;
    }
    
    const res = await runAction("delete", { id });
    if (res.status === "success") {
      showSuccess(`Kategori başarıyla silindi.`);
      if (selectedCategoryId === id) {
        setSelectedCategoryId(null);
      }
      await loadCategories();
    } else {
      showError(res.message || "Kategori silinemez");
    }
  };

  const handleSearchProducts = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!productQuery.trim()) return;
    
    setSearching(true);
    const res = await runAction("search-products", { query: productQuery, limit: 100 });
    if (res.status === "success") {
      setSearchResults(res.products || []);
    } else {
      showError(res.message || "Ürün araması başarısız oldu");
    }
    setSearching(false);
  };

  const handleAssignProduct = async (barcode: string, categoryId: number) => {
    const res = await runAction("assign", { barcode, category_id: categoryId });
    if (res.status === "success") {
      showSuccess("Ürün kategoriye atandı.");
      // Refresh search results to show new category
      setSearchResults(prev => 
        prev.map(p => {
          if (p.barkod === barcode) {
            const cat = categories.find(c => c.id === categoryId);
            return { ...p, kategori_id: categoryId, kategori_adi: cat ? cat.isim : "Bilinmeyen" };
          }
          return p;
        })
      );
      // Refresh current category products if needed
      if (selectedCategoryId !== null) {
        await loadCategoryProducts();
      }
    } else {
      showError(res.message || "Ürün kategoriye atanamadı");
    }
  };

  const handleRemoveProduct = async (barcode: string) => {
    const res = await runAction("remove", { barcode });
    if (res.status === "success") {
      showSuccess("Ürün kategoriden çıkarıldı.");
      // Refresh
      if (selectedCategoryId !== null) {
        await loadCategoryProducts();
      }
      setSearchResults(prev => 
        prev.map(p => {
          if (p.barkod === barcode) {
            return { ...p, kategori_id: 2, kategori_adi: "Kategorisiz (İDU)" };
          }
          return p;
        })
      );
    } else {
      showError(res.message || "Ürün kategoriden çıkarılamadı");
    }
  };

  // Helper to build hierarchy tree representation
  const categoryTree = useMemo(() => {
    // Group by parent
    const byParent: { [key: string]: Category[] } = {};
    categories.forEach(c => {
      const pid = c.ust_kategori_id === null ? "root" : String(c.ust_kategori_id);
      if (!byParent[pid]) byParent[pid] = [];
      byParent[pid].push(c);
    });

    const list: (Category & { indent: number })[] = [];
    
    const recurse = (parentId: string, indent: number) => {
      const children = byParent[parentId] || [];
      // Sort alphabetically
      children.sort((a, b) => a.isim.localeCompare(b.isim, 'tr'));
      
      children.forEach(child => {
        list.push({ ...child, indent });
        recurse(String(child.id), indent + 1);
      });
    };

    recurse("root", 0);
    return list;
  }, [categories]);

  const selectedCategoryName = useMemo(() => {
    const cat = categories.find(c => c.id === selectedCategoryId);
    return cat ? cat.isim : "";
  }, [selectedCategoryId, categories]);

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-teal-600 text-white rounded-2xl shadow-lg shadow-teal-100">
            <Layers size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Kategori Yönetimi</h2>
            <p className="text-slate-500 font-medium">Veritabanındaki ürün kategorilerini düzenleyin ve ürünleri eşleştirin.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={loadCategories}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs transition-all">
            <RefreshCw size={14} /> Yenile
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-4 bg-teal-50 border border-teal-100 text-teal-800 rounded-2xl flex items-center gap-3 font-semibold text-sm">
          <Check size={18} className="text-teal-600" /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl flex items-center gap-3 font-semibold text-sm">
          <X size={18} className="text-rose-600" /> {errorMsg}
        </div>
      )}

      {/* Main Panel grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Categories Hierarchy & Creation */}
        <div className="lg:col-span-5 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Kategori Ağacı</h3>
            <p className="text-slate-400 font-medium text-xs">Aşağıdan kategori seçip içindeki ürünleri listeleyebilir veya yeni kategori ekleyebilirsiniz.</p>
          </div>

          {/* New Category Form */}
          <form onSubmit={handleAddCategory} className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50 space-y-3">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Yeni Kategori Ekle</h4>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Kategori Adı..."
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-100 focus:border-teal-400 outline-none text-sm transition-all"
                required
              />
              <select
                value={newCatParent === null ? "" : String(newCatParent)}
                onChange={e => setNewCatParent(e.target.value === "" ? null : Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-100 focus:border-teal-400 outline-none text-sm transition-all"
              >
                <option value="">Üst Kategori Yok (Ana Kategori)</option>
                {categories
                  .filter(c => c.id !== 1) // don't allow medicine to be general parent
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {"— ".repeat(Math.max(0, (c.seviye || 1) - 1)) + c.isim}
                    </option>
                  ))
                }
              </select>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all"
              >
                <Plus size={14} /> Kategori Ekle
              </button>
            </div>
          </form>

          {/* Categories List */}
          <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[450px] overflow-y-auto">
            {categories.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">Yüklü kategori bulunamadı.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {categoryTree.map(cat => {
                  const isSelected = selectedCategoryId === cat.id;
                  const isSystemCat = cat.id === 1 || cat.id === 2;
                  
                  return (
                    <div 
                      key={cat.id} 
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer group transition-all ${
                        isSelected 
                          ? 'bg-teal-50/50 border-l-4 border-teal-500' 
                          : 'hover:bg-slate-50 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2" style={{ paddingLeft: `${cat.indent * 12}px` }}>
                        <Tag size={12} className={isSelected ? 'text-teal-600' : 'text-slate-400'} />
                        <span className={`text-sm font-semibold ${isSelected ? 'text-teal-900 font-bold' : 'text-slate-700'}`}>
                          {cat.isim}
                        </span>
                        {isSystemCat && (
                          <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded uppercase">
                            Sistem
                          </span>
                        )}
                      </div>
                      
                      {!isSystemCat && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(cat.id, cat.isim);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          title="Kategoriyi Sil"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Category Products & Search */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section: Category Products */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {selectedCategoryId === null ? "Lütfen Kategori Seçin" : `Kategori: '${selectedCategoryName}'`}
                </h3>
                <p className="text-slate-400 font-medium text-xs">
                  {selectedCategoryId === null 
                    ? "Ürünleri görmek ve düzenlemek için sol taraftaki listeden bir kategori seçin." 
                    : `Bu kategoride toplam ${categoryProducts.length} ürün bulunuyor.`
                  }
                </p>
              </div>
            </div>

            {selectedCategoryId !== null && (
              <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                {loadingProducts ? (
                  <div className="text-center py-10 text-slate-400 text-sm flex justify-center items-center gap-2">
                    <RefreshCw size={14} className="animate-spin" /> Yükleniyor...
                  </div>
                ) : categoryProducts.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    Bu kategoride henüz ürün bulunmuyor. Aşağıdan ürün arayıp ekleyebilirsiniz.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider text-[9px]">Ürün Adı</th>
                        <th className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider text-[9px]">Barkod</th>
                        <th className="px-4 py-3 text-right font-bold text-slate-400 uppercase tracking-wider text-[9px] w-24">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium">
                      {categoryProducts.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-slate-700 font-semibold">{p.urun_adi}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono">{p.barkod}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleRemoveProduct(p.barkod)}
                              className="text-rose-600 hover:text-white border border-rose-200 hover:bg-rose-600 font-bold px-2 py-1 rounded-lg transition-all"
                            >
                              Kategoriden Çıkar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* Section: Product Search & Assign */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Ürün Arama & Kategoriye Ekle</h3>
              <p className="text-slate-400 font-medium text-xs">Tüm ürün veritabanında barkod veya ürün adına göre arama yapın.</p>
            </div>

            {/* Search Input Form */}
            <form onSubmit={handleSearchProducts} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Barkod veya Ürün Adı arayın... (Örn: Parol, 8699...)"
                  value={productQuery}
                  onChange={e => setProductQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-teal-100 focus:border-teal-400 outline-none text-sm transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="flex items-center gap-1.5 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all"
              >
                {searching ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />} Ara
              </button>
            </form>

            {/* Search Results Table */}
            {searchResults.length > 0 && (
              <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider text-[9px]">Ürün Adı</th>
                      <th className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider text-[9px]">Barkod</th>
                      <th className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider text-[9px]">Mevcut Kategori</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-400 uppercase tracking-wider text-[9px] w-48">Kategoriye Ekle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium">
                    {searchResults.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-slate-700 font-semibold">{p.urun_adi}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono">{p.barkod}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.kategori_id === 2 ? 'bg-slate-100 text-slate-600' : 'bg-teal-50 text-teal-700'
                          }`}>
                            {p.kategori_adi}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            {selectedCategoryId !== null && p.kategori_id !== selectedCategoryId && (
                              <button
                                onClick={() => handleAssignProduct(p.barkod, selectedCategoryId)}
                                className="flex items-center gap-1 bg-teal-600 hover:bg-teal-700 text-white font-bold px-2.5 py-1.5 rounded-lg text-[10px] transition-all"
                              >
                                Seçili Kategoriye Ekle <ArrowRight size={10} />
                              </button>
                            )}
                            
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAssignProduct(p.barkod, Number(e.target.value));
                                  e.target.value = "";
                                }
                              }}
                              className="bg-slate-50 border border-slate-200 text-slate-700 font-semibold px-2 py-1 rounded-lg text-[10px] max-w-[120px] outline-none"
                              defaultValue=""
                            >
                              <option value="" disabled>Kategori Seç...</option>
                              {categories.map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.isim}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {productQuery && searchResults.length === 0 && !searching && (
              <div className="text-center py-6 text-slate-400 text-sm">Hiçbir ürün bulunamadı.</div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
