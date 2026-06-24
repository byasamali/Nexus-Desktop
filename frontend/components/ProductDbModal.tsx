"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, RefreshCw } from 'lucide-react';

export default function ProductDbModal({ urun, categories, onClose, onSave }: any) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Local form states
  const [urunAdi, setUrunAdi] = useState("");
  const [kategoriId, setKategoriId] = useState(2);
  const [atcKodu, setAtcKodu] = useState("");
  const [sgkKodu, setSgkKodu] = useState("");
  const [esdegerKodu, setEsdegerKodu] = useState("");
  const [receteRengi, setReceteRengi] = useState("Beyaz");
  const [isf, setIsf] = useState(0.0);
  const [dsf, setDsf] = useState(0.0);
  const [psf, setPsf] = useState(0.0);
  const [esdegersizIthal, setEsdegersizIthal] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await (window as any).go.main.App.RunCategoryAction("get-product", JSON.stringify({ barcode: urun.v1 }));
        const result = JSON.parse(response);
        if (result.status === "success" && result.product) {
          const p = result.product;
          setUrunAdi(p.urun_adi || "");
          setKategoriId(p.kategori_id || 2);
          setAtcKodu(p.atc_kodu || "");
          setSgkKodu(p.sgk_kodu || "");
          setEsdegerKodu(p.esdeger_kodu || "");
          setReceteRengi(p.recete_rengi || "Beyaz");
          setIsf(Number(p.isf) || 0.0);
          setDsf(Number(p.dsf) || 0.0);
          setPsf(Number(p.psf) || 0.0);
          setEsdegersizIthal(Number(p.esdegersiz_ithal) || 0);
        } else {
          setError(result.message || "İlaç bilgileri yüklenemedi");
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Veritabanına bağlanılamadı");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [urun]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await (window as any).go.main.App.RunCategoryAction("update-product", JSON.stringify({
        barcode: urun.v1,
        data: {
          urun_adi: urunAdi,
          kategori_id: kategoriId,
          atc_kodu: atcKodu,
          sgk_kodu: sgkKodu,
          esdeger_kodu: esdegerKodu,
          recete_rengi: receteRengi,
          isf,
          dsf,
          psf,
          esdegersiz_ithal: esdegersizIthal
        }
      }));
      const result = JSON.parse(response);
      if (result.status === "success") {
        onSave();
      } else {
        alert("Hata: " + result.message);
      }
    } catch (err: any) {
      console.error(err);
      alert("Hata: Veritabanı güncellenemedi (" + err.message + ")");
    }
  };

  // Filter out 'ilac' (1) and build hierarchy
  const getSortedTreeList = () => {
    const list: any[] = [];
    const recurse = (parentId: number | null, indent: number) => {
      const children = categories.filter((c: any) => c.ust_kategori_id === parentId && c.id !== 1);
      children.sort((a: any, b: any) => a.isim.localeCompare(b.isim, 'tr'));
      children.forEach((child: any) => {
        list.push({ ...child, indent });
        recurse(child.id, indent + 1);
      });
    };
    recurse(null, 0);
    return list;
  };
  const treeList = getSortedTreeList();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4 overflow-y-auto font-sans"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e: any) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col p-6 space-y-4 max-h-[90vh] my-8 overflow-y-auto custom-scrollbar">
        
        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
          <div>
            <h3 className="font-black text-stone-900 text-base">İlaç Kartı Düzenle</h3>
            <p className="text-[10px] text-stone-400 font-medium font-mono mt-0.5">{urun.v1}</p>
          </div>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg bg-stone-100 hover:bg-red-50 hover:text-red-500 text-stone-400 transition-colors">
            <X size={14} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={24} className="animate-spin text-teal-600" />
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-semibold text-center">{error}</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-stone-400 uppercase tracking-wide">İlaç Adı (master_db)</label>
              <input
                type="text"
                value={urunAdi}
                onChange={e => setUrunAdi(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-100 focus:border-teal-400 outline-none text-xs transition-all font-bold text-slate-800"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-stone-400 uppercase tracking-wide">Kategori</label>
                <select
                  value={kategoriId}
                  onChange={e => setKategoriId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-100 focus:border-teal-400 outline-none text-xs transition-all font-semibold text-slate-800"
                >
                  <option value={2}>Kategorisiz (İDU)</option>
                  {treeList.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {"— ".repeat(c.indent) + c.isim}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-stone-400 uppercase tracking-wide">Reçete Rengi</label>
                <select
                  value={receteRengi}
                  onChange={e => setReceteRengi(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-100 focus:border-teal-400 outline-none text-xs transition-all font-semibold text-slate-800"
                >
                  <option value="Beyaz">Beyaz</option>
                  <option value="Kırmızı">Kırmızı</option>
                  <option value="Yeşil">Yeşil</option>
                  <option value="Turuncu">Turuncu</option>
                  <option value="Mor">Mor</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-stone-400 uppercase tracking-wide">ATC Kodu</label>
                <input
                  type="text"
                  value={atcKodu}
                  onChange={e => setAtcKodu(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-100 focus:border-teal-400 outline-none text-xs transition-all font-mono text-stone-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-stone-400 uppercase tracking-wide">SGK Kodu</label>
                <input
                  type="text"
                  value={sgkKodu}
                  onChange={e => setSgkKodu(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-100 focus:border-teal-400 outline-none text-xs transition-all font-mono text-stone-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-stone-400 uppercase tracking-wide">Eşdeğer Kodu</label>
                <input
                  type="text"
                  value={esdegerKodu}
                  onChange={e => setEsdegerKodu(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-100 focus:border-teal-400 outline-none text-xs transition-all font-mono text-stone-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-stone-400 uppercase tracking-wide">İmalatçı Fiyatı (ISF)</label>
                <input
                  type="number"
                  step="0.01"
                  value={isf}
                  onChange={e => setIsf(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-100 focus:border-teal-400 outline-none text-xs transition-all font-mono font-bold text-stone-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-stone-400 uppercase tracking-wide">Depocu Fiyatı (DSF)</label>
                <input
                  type="number"
                  step="0.01"
                  value={dsf}
                  onChange={e => setDsf(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-100 focus:border-teal-400 outline-none text-xs transition-all font-mono font-bold text-stone-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-stone-400 uppercase tracking-wide">Eczane Satış (PSF)</label>
                <input
                  type="number"
                  step="0.01"
                  value={psf}
                  onChange={e => setPsf(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-100 focus:border-teal-400 outline-none text-xs transition-all font-mono font-bold text-stone-700"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="esdegersizIthal"
                checked={esdegersizIthal === 1}
                onChange={e => setEsdegersizIthal(e.target.checked ? 1 : 0)}
                className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 cursor-pointer"
              />
              <label htmlFor="esdegersizIthal" className="text-xs font-semibold text-stone-600 select-none cursor-pointer">Eşdeğersiz İthal İlaç</label>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl font-bold text-xs shadow-md transition-all mt-4"
            >
              Master Veritabanını Güncelle
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
