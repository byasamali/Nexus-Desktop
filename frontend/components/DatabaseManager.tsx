import React, { useState, useEffect } from 'react';
import { Database, Play, RefreshCw, Table, Terminal, AlertCircle, FileText, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

interface ColumnInfo {
    cid: number;
    name: string;
    type: string;
    notnull: number;
    dflt_value: any;
    pk: number;
}

export default function DatabaseManager() {
    const [tables, setTables] = useState<string[]>([]);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [tableColumns, setTableColumns] = useState<ColumnInfo[]>([]);
    const [tableRows, setTableRows] = useState<any[]>([]);
    const [customQuery, setCustomQuery] = useState<string>('SELECT * FROM categories LIMIT 100;');
    const [queryResult, setQueryResult] = useState<any[] | null>(null);
    const [queryChanges, setQueryChanges] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<'browse' | 'sql'>('browse');
    const [loading, setLoading] = useState<boolean>(false);
    
    // Pagination for table browser
    const [page, setPage] = useState<number>(1);
    const limit = 50;

    const runQuery = async (sql: string, params: any[] = []): Promise<any> => {
        setError(null);
        setLoading(true);
        try {
            const resJson = await (window as any).go.main.App.RunDbQuery(sql, JSON.stringify(params));
            const res = JSON.parse(resJson);
            if (res.status === 'success') {
                return res;
            } else {
                throw new Error(res.message || 'Bilinmeyen SQL hatası');
            }
        } catch (err: any) {
            console.error(err);
            setError(err?.message || String(err));
            return null;
        } finally {
            setLoading(false);
        }
    };

    const fetchTables = async () => {
        const res = await runQuery("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC;");
        if (res && res.data) {
            setTables(res.data.map((t: any) => t.name));
        }
    };

    useEffect(() => {
        fetchTables();
    }, []);

    const handleSelectTable = async (tableName: string) => {
        setSelectedTable(tableName);
        setPage(1);
        setQueryResult(null);
        setQueryChanges(null);
        setError(null);
        
        // Fetch columns
        const colsRes = await runQuery(`PRAGMA table_info(${tableName});`);
        if (colsRes && colsRes.data) {
            setTableColumns(colsRes.data as ColumnInfo[]);
        }

        // Fetch rows count
        fetchTableData(tableName, 1);
    };

    const fetchTableData = async (tableName: string, pageNum: number) => {
        const offset = (pageNum - 1) * limit;
        const dataRes = await runQuery(`SELECT * FROM ${tableName} LIMIT ${limit} OFFSET ${offset};`);
        if (dataRes && dataRes.data) {
            setTableRows(dataRes.data);
        } else {
            setTableRows([]);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (selectedTable) {
            setPage(newPage);
            fetchTableData(selectedTable, newPage);
        }
    };

    const handleExecuteCustomQuery = async () => {
        setQueryResult(null);
        setQueryChanges(null);
        setError(null);
        if (!customQuery.trim()) return;

        const res = await runQuery(customQuery);
        if (res) {
            if (res.data) {
                setQueryResult(res.data);
            } else if (res.changes !== undefined) {
                setQueryChanges(res.changes);
                // Refresh tables in case user created/dropped a table
                fetchTables();
            }
        }
    };

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full font-sans bg-white min-h-[85vh]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-100 pb-5">
                <div>
                    <h2 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2.5">
                        <span className="p-2 bg-orange-50 text-orange-600 rounded-2xl border border-orange-100"><Database size={22} /></span>
                        Veritabanı Tarayıcı & Düzenleyici
                    </h2>
                    <p className="text-xs text-stone-400 font-bold mt-1 uppercase tracking-wider">Geliştirici Modu (SQLite: master_db.sqlite)</p>
                </div>
                
                {/* View switcher */}
                <div className="flex bg-stone-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveView('browse')}
                        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                            activeView === 'browse' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'
                        }`}
                    >
                        <Table size={14} /> Tabloları İncele
                    </button>
                    <button
                        onClick={() => setActiveView('sql')}
                        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                            activeView === 'sql' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'
                        }`}
                    >
                        <Terminal size={14} /> SQL Konsolu
                    </button>
                </div>
            </div>

            {/* Error alerts */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex items-start gap-2 animate-shake">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <div>
                        <p className="uppercase tracking-wider text-[10px] mb-1">SQL Hatası</p>
                        <p className="font-mono font-medium leading-relaxed">{error}</p>
                    </div>
                </div>
            )}

            {/* Changes success message */}
            {queryChanges !== null && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 text-xs font-bold flex items-start gap-2">
                    <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                    <div>
                        <p className="uppercase tracking-wider text-[10px] mb-1">İşlem Başarılı</p>
                        <p className="font-medium">Sorgu başarıyla çalıştırıldı. Etkilenen/değişen satır sayısı: <span className="font-mono font-black">{queryChanges}</span></p>
                    </div>
                </div>
            )}

            {activeView === 'browse' ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Left Pane: Tables List */}
                    <div className="border border-stone-150 rounded-2xl p-4 bg-stone-50/50 flex flex-col gap-3 min-h-[500px]">
                        <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Veritabanı Tabloları ({tables.length})</div>
                        <div className="flex flex-col gap-1 overflow-y-auto max-h-[600px] pr-1">
                            {tables.map(table => (
                                <button
                                    key={table}
                                    onClick={() => handleSelectTable(table)}
                                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between border transition-all ${
                                        selectedTable === table 
                                            ? 'bg-orange-50 border-orange-200 text-orange-700 shadow-sm' 
                                            : 'bg-white border-stone-150 hover:bg-stone-50 text-stone-700 hover:text-stone-900'
                                    }`}
                                >
                                    <span className="truncate flex items-center gap-2"><Table size={12} className={selectedTable === table ? 'text-orange-600' : 'text-stone-400'} /> {table}</span>
                                    {selectedTable === table && <span className="w-1.5 h-1.5 rounded-full bg-orange-600 shrink-0" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right Pane: Table Data Browser */}
                    <div className="md:col-span-3 border border-stone-150 rounded-2xl p-5 bg-white flex flex-col gap-5 min-h-[500px]">
                        {selectedTable ? (
                            <>
                                {/* Table name and schema summary */}
                                <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                                    <div>
                                        <h3 className="font-black text-base text-stone-900 flex items-center gap-1.5">
                                            <Table size={16} className="text-orange-500" /> {selectedTable}
                                        </h3>
                                        <p className="text-[10px] text-stone-400 font-bold uppercase mt-1 tracking-wider">
                                            Şema: {tableColumns.map(c => `${c.name} (${c.type})`).join(', ')}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => handleSelectTable(selectedTable)} 
                                        disabled={loading}
                                        className="p-2 hover:bg-stone-50 text-stone-500 rounded-xl border border-stone-100 hover:border-stone-200 shadow-sm transition-all"
                                    >
                                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                                    </button>
                                </div>

                                {/* Table Data grid */}
                                <div className="overflow-x-auto border border-stone-100 rounded-xl shadow-inner scrollbar-hide max-h-[500px]">
                                    {tableRows.length > 0 ? (
                                        <table className="w-full text-xs text-left border-collapse min-w-[600px]">
                                            <thead className="bg-stone-50 text-stone-500 border-b border-stone-150 sticky top-0 z-10">
                                                <tr>
                                                    {tableColumns.map(col => (
                                                        <th key={col.name} className="px-4 py-3 font-bold uppercase tracking-wider text-[9px] border-r border-stone-150">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="truncate">{col.name}</span>
                                                                <span className="text-[8px] font-normal text-stone-400 capitalize bg-stone-100 px-1 py-0.5 rounded font-mono shrink-0">{col.type}</span>
                                                            </div>
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-100 text-stone-800">
                                                {tableRows.map((row, ri) => (
                                                    <tr key={ri} className="hover:bg-stone-50/50 transition-colors font-medium">
                                                        {tableColumns.map(col => {
                                                            const val = row[col.name];
                                                            return (
                                                                <td key={col.name} className="px-4 py-2.5 font-mono max-w-[200px] truncate border-r border-stone-100 text-[11px]" title={val !== null ? String(val) : 'NULL'}>
                                                                    {val !== null ? (
                                                                        typeof val === 'boolean' ? (val ? 'TRUE' : 'FALSE') : String(val)
                                                                    ) : (
                                                                        <span className="text-stone-300 italic text-[10px]">NULL</span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="p-12 text-center text-stone-400 italic">Bu tabloda veri bulunmamaktadır.</div>
                                    )}
                                </div>

                                {/* Pagination controls */}
                                <div className="flex items-center justify-between border-t border-stone-100 pt-4 mt-auto">
                                    <span className="text-xs text-stone-400 font-bold">Sayfa: <span className="text-stone-700">{page}</span></span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handlePageChange(Math.max(1, page - 1))}
                                            disabled={page === 1 || loading}
                                            className="px-3 py-1.5 text-xs font-bold border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 disabled:opacity-50 flex items-center gap-1 transition-all"
                                        >
                                            <ChevronLeft size={14} /> Geri
                                        </button>
                                        <button
                                            onClick={() => handlePageChange(page + 1)}
                                            disabled={tableRows.length < limit || loading}
                                            className="px-3 py-1.5 text-xs font-bold border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 disabled:opacity-50 flex items-center gap-1 transition-all"
                                        >
                                            İleri <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center min-h-[400px] text-stone-400 text-center gap-3">
                                <Database size={40} className="text-stone-200" />
                                <div className="font-semibold text-stone-500">Tablo Seçilmedi</div>
                                <p className="text-xs max-w-xs leading-relaxed text-stone-400">Verileri görüntülemek, şemasını incelemek ve taramak için sol panelden bir tablo seçin.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* SQL Console View */
                <div className="flex flex-col gap-5 border border-stone-150 rounded-2xl p-5 bg-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Terminal size={16} className="text-orange-500" />
                            <h3 className="font-black text-sm text-stone-900 uppercase tracking-wide">SQL Sorgu Çalıştırıcı</h3>
                        </div>
                        <button
                            onClick={handleExecuteCustomQuery}
                            disabled={loading || !customQuery.trim()}
                            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Play size={12} fill="white" /> Sorguyu Çalıştır
                        </button>
                    </div>

                    <textarea
                        value={customQuery}
                        onChange={e => setCustomQuery(e.target.value)}
                        placeholder="SELECT * FROM categories WHERE seviye = 1 ORDER BY isim ASC;"
                        className="w-full h-32 p-4 border border-stone-200 rounded-xl font-mono text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 resize-y shadow-inner bg-stone-50/20"
                    />

                    {/* Result table for custom query */}
                    {queryResult && (
                        <div className="flex flex-col gap-3">
                            <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest flex justify-between items-center px-1">
                                <span>Sorgu Sonuçları ({queryResult.length} satır)</span>
                            </div>
                            <div className="overflow-x-auto border border-stone-150 rounded-xl scrollbar-hide max-h-[400px] shadow-inner">
                                {queryResult.length > 0 ? (
                                    <table className="w-full text-xs text-left border-collapse min-w-[500px]">
                                        <thead className="bg-stone-50 text-stone-500 border-b border-stone-150 sticky top-0 z-10">
                                            <tr>
                                                {Object.keys(queryResult[0]).map(key => (
                                                    <th key={key} className="px-4 py-3 font-bold uppercase tracking-wider text-[9px] border-r border-stone-150">
                                                        {key}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-100 text-stone-800 font-medium">
                                            {queryResult.map((row, ri) => (
                                                <tr key={ri} className="hover:bg-stone-50/50 transition-colors">
                                                    {Object.keys(row).map(key => {
                                                        const val = row[key];
                                                        return (
                                                            <td key={key} className="px-4 py-2.5 font-mono max-w-[250px] truncate border-r border-stone-100 text-[11px]" title={val !== null ? String(val) : 'NULL'}>
                                                                {val !== null ? String(val) : <span className="text-stone-300 italic text-[10px]">NULL</span>}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="p-8 text-center text-stone-400 italic">Sorgu başarıyla tamamlandı fakat veri dönmedi.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
