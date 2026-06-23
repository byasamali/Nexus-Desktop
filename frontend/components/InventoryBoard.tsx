"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
    Users, UserPlus, UserMinus, FileSpreadsheet,
    Printer, CheckCircle2, ChevronRight, PackageSearch
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface Product {
    barkod: string;
    ad: string;
    stok: number;
    kategori?: string;
}

interface PersonnelData {
    personel: string;
    toplam_urun: number;
    gunluk_hedef: number;
    liste: Product[];
}

export default function InventoryBoard({ data: initialData, gln }: { data: PersonnelData[]; gln?: string }) {
    // Mevcut tüm ürünleri tek bir listede topla (yeniden dağıtım yapabilmek için)
    const allProducts = useMemo(() => {
        return initialData?.flatMap(p => p.liste) || [];
    }, [initialData]);

    const [personnelCount, setPersonnelCount] = useState(initialData?.length || 3);
    const [personnelLists, setPersonnelLists] = useState<PersonnelData[]>([]);
    const [loading, setLoading] = useState(true);

    const isWails = typeof window !== 'undefined' && (window as any).go !== undefined;

    useEffect(() => {
        const loadCount = async () => {
            if (!gln) return;
            try {
                if (isWails) {
                    const content = await (window as any).go.main.App.LoadLocalJSON(gln, "sayim.json");
                    if (content && content !== '{}') {
                        const parsed = JSON.parse(content);
                        if (parsed.personnelCount) setPersonnelCount(parsed.personnelCount);
                    }
                } else {
                    const cached = localStorage.getItem("sayim_count_" + gln);
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        if (parsed.personnelCount) setPersonnelCount(parsed.personnelCount);
                    }
                }
            } catch (err) {
                console.error("Sayım planı yüklenirken hata:", err);
            } finally {
                setLoading(false);
            }
        };
        loadCount();
    }, [gln]);

    useEffect(() => {
        if (loading || !gln) return;
        const saveCount = async () => {
            try {
                const payload = { personnelCount };
                if (isWails) {
                    await (window as any).go.main.App.SaveLocalJSON(gln, "sayim.json", JSON.stringify(payload));
                } else {
                    localStorage.setItem("sayim_count_" + gln, JSON.stringify(payload));
                }
            } catch (err) {
                console.error("Sayım planı kaydedilirken hata:", err);
            }
        };
        saveCount();
    }, [personnelCount, gln, loading]);

    // Personel sayısı değiştiğinde ürünleri yeniden dağıt
    useEffect(() => {
        if (allProducts.length === 0) return;

        const newLists: PersonnelData[] = [];
        const count = Math.max(1, personnelCount);

        // Ürünleri gruplara böl (Adil dağıtım)
        for (let i = 0; i < count; i++) {
            newLists.push({
                personel: `Personel ${String.fromCharCode(65 + i)}`, // Personel A, B, C...
                liste: [],
                toplam_urun: 0,
                gunluk_hedef: 0
            });
        }

        allProducts.forEach((product, index) => {
            const targetIndex = index % count;
            newLists[targetIndex].liste.push(product);
        });

        newLists.forEach(p => {
            p.toplam_urun = p.liste.length;
            p.gunluk_hedef = Math.ceil(p.toplam_urun / 30); // 30 günlük sayım planı varsayımı
        });

        setPersonnelLists(newLists);
    }, [personnelCount, allProducts]);

    // EXCEL İNDİRME FONKSİYONU
    const downloadExcel = (person: PersonnelData) => {
        const wsData = person.liste.map(item => ({
            "Barkod": item.barkod,
            "Ürün Adı": item.ad,
            "Sistem Stoğu": item.stok,
            "Fiziksel Sayım": "", // Personel burayı dolduracak
            "Fark": ""
        }));

        const ws = XLSX.utils.json_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sayım Listesi");
        XLSX.writeFile(wb, `${person.personel}_Sayim_Listesi.xlsx`);
    };

    // YAZDIRMA FONKSİYONU (A4 Kağıda Uygun)
    const printList = (person: PersonnelData) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
      <html>
        <head>
          <title>${person.personel} - Sayım Çizelgesi</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h1 { color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 12px; }
            th { bg-color: #f8fafc; }
            .footer { margin-top: 30px; font-size: 10px; color: #64748b; text-align: center; }
          </style>
        </head>
        <body>
          <h1>NEXUS - ${person.personel} Sayım Listesi</h1>
          <p>Tarih: ${new Date().toLocaleDateString('tr-TR')} | Toplam Ürün: ${person.toplam_urun}</p>
          <table>
            <thead>
              <tr>
                <th width="20%">Barkod</th>
                <th width="50%">Ürün Adı</th>
                <th width="10%">Sistem</th>
                <th width="10%">Sayım</th>
                <th width="10%">Fark</th>
              </tr>
            </thead>
            <tbody>
              ${person.liste.map(u => `
                <tr>
                  <td>${u.barkod}</td>
                  <td>${u.ad}</td>
                  <td>${u.stok}</td>
                  <td></td>
                  <td></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">Bu liste Nexus AI tarafından eczane verimliliği için oluşturulmuştur.</div>
        </body>
      </html>
    `;
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <div className="space-y-6">
            {/* ÜST KONTROL PANELİ */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                        <PackageSearch size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Akıllı Sayım Yönetimi</h2>
                        <p className="text-slate-500 font-medium">Toplam {allProducts.length} aktif ürün planlanıyor.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-400 px-3 uppercase tracking-wider">Personel Sayısı</span>
                    <button
                        onClick={() => setPersonnelCount(prev => Math.max(1, prev - 1))}
                        className="p-2 bg-white text-slate-600 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm"
                    >
                        <UserMinus size={20} />
                    </button>
                    <div className="w-12 text-center font-black text-xl text-blue-600">
                        {personnelCount}
                    </div>
                    <button
                        onClick={() => setPersonnelCount(prev => prev + 1)}
                        className="p-2 bg-white text-slate-600 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors shadow-sm"
                    >
                        <UserPlus size={20} />
                    </button>
                </div>
            </div>

            {/* PERSONEL KARTLARI */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {personnelLists.map((person, idx) => (
                    <div key={idx} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl transition-all hover:-translate-y-1">
                        <div className="p-6 border-b border-slate-50 bg-gradient-to-br from-slate-50/50 to-white">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                                        <Users size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800 tracking-tight">{person.personel}</h3>
                                        <p className="text-xs font-bold text-blue-500 uppercase">Sayım Sorumlusu</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-slate-800 leading-none">{person.toplam_urun}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Toplam Barkod</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100/50 p-2 rounded-xl">
                                <CheckCircle2 size={14} className="text-emerald-500" />
                                Günlük Hedef: <span className="text-slate-800">{person.gunluk_hedef} Ürün / Gün</span>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50/30 flex-1">
                            <div className="space-y-2">
                                {person.liste.slice(0, 5).map((u, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-100 text-[11px] font-medium text-slate-600 shadow-sm">
                                        <span className="truncate pr-4">{u.ad}</span>
                                        <span className="shrink-0 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">Stok: {u.stok}</span>
                                    </div>
                                ))}
                                {person.liste.length > 5 && (
                                    <div className="text-center py-2">
                                        <span className="text-[10px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100">
                                            ...ve {person.liste.length - 5} ürün daha
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 grid grid-cols-2 gap-3 border-t border-slate-100 bg-white">
                            <button
                                onClick={() => downloadExcel(person)}
                                className="flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-700 rounded-2xl font-bold text-xs hover:bg-emerald-100 transition-colors border border-emerald-100"
                            >
                                <FileSpreadsheet size={16} /> Excel
                            </button>
                            <button
                                onClick={() => printList(person)}
                                className="flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-2xl font-bold text-xs hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
                            >
                                <Printer size={16} /> Yazdır
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}