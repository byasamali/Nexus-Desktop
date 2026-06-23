"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Staff {
  id: string;
  name: string;
  role: 'Eczacı' | 'Teknisyen' | 'Stajyer';
  color: string;
  avatar: string;
}

interface Task {
  id: string;
  title: string;
  assigneeId: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'completed';
  time: string;
  category: 'Stok' | 'Miad' | 'Temizlik' | 'Raporlama' | 'Hasta' | 'Diğer';
  note?: string;
  createdAt: string;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];
const ROLE_OPTIONS: Staff['role'][] = ['Eczacı', 'Teknisyen', 'Stajyer'];
const PRIORITY_OPTIONS: Task['priority'][] = ['low', 'medium', 'high', 'critical'];
const CATEGORY_OPTIONS: Task['category'][] = ['Stok', 'Miad', 'Temizlik', 'Raporlama', 'Hasta', 'Diğer'];

const PRIORITY_META = {
  low: { label: 'Düşük', bg: 'bg-slate-100', text: 'text-slate-500', dot: '#94a3b8' },
  medium: { label: 'Normal', bg: 'bg-blue-50', text: 'text-blue-500', dot: '#3b82f6' },
  high: { label: 'Yüksek', bg: 'bg-orange-50', text: 'text-orange-500', dot: '#f97316' },
  critical: { label: 'Kritik', bg: 'bg-red-50', text: 'text-red-600', dot: '#ef4444' },
};

const STATUS_META = {
  pending: { label: 'Bekliyor', bg: 'bg-slate-100', text: 'text-slate-500' },
  'in-progress': { label: 'Devam Ediyor', bg: 'bg-indigo-50', text: 'text-indigo-600' },
  completed: { label: 'Tamamlandı', bg: 'bg-emerald-50', text: 'text-emerald-600' },
};

const CATEGORY_EMOJI: Record<Task['category'], string> = {
  Stok: '📦', Miad: '📅', Temizlik: '🧹', Raporlama: '📊', Hasta: '💊', Diğer: '📌',
};

// ─── INITIAL DATA ─────────────────────────────────────────────────────────────

const INITIAL_STAFF: Staff[] = [
  { id: 's1', name: 'Ecz. Onur', role: 'Eczacı', color: '#6366f1', avatar: 'O' },
  { id: 's2', name: 'Tekn. Ayşe', role: 'Teknisyen', color: '#f59e0b', avatar: 'A' },
  { id: 's3', name: 'Tekn. Mehmet', role: 'Teknisyen', color: '#10b981', avatar: 'M' },
];

const INITIAL_TASKS: Task[] = [
  { id: 't1', title: 'Buzdolabı Isı Takibi', assigneeId: 's1', priority: 'critical', status: 'pending', time: '09:00', category: 'Stok', createdAt: new Date().toISOString(), note: 'Her sabah ilk iş olarak kontrol et' },
  { id: 't2', title: 'Miad Kontrolü (A Grubu Rafı)', assigneeId: 's2', priority: 'high', status: 'completed', time: '11:30', category: 'Miad', createdAt: new Date().toISOString() },
  { id: 't3', title: 'E-Reçete İcmal Listesi', assigneeId: 's1', priority: 'high', status: 'in-progress', time: '18:00', category: 'Raporlama', createdAt: new Date().toISOString() },
  { id: 't4', title: 'Vitrin Düzenlemesi', assigneeId: 's3', priority: 'low', status: 'pending', time: '14:00', category: 'Temizlik', createdAt: new Date().toISOString() },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

function Avatar({ staff, size = 32 }: { staff: Staff; size?: number }) {
  return (
    <div style={{ width: size, height: size, background: staff.color + '22', border: `2px solid ${staff.color}44`, color: staff.color, fontSize: size * 0.38, fontWeight: 700 }}
      className="rounded-full flex items-center justify-center flex-shrink-0 select-none">
      {staff.avatar}
    </div>
  );
}

// ─── MODALS ───────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-base">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors text-lg leading-none">×</button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </div>
  );
}

// ─── STAFF MODAL ──────────────────────────────────────────────────────────────

function StaffModal({ staff, onSave, onClose }: {
  staff?: Staff; onSave: (s: Staff) => void; onClose: () => void;
}) {
  const [form, setForm] = useState<Staff>(staff ?? { id: uid(), name: '', role: 'Teknisyen', color: COLORS[0], avatar: '' });
  const set = (k: keyof Staff, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({ ...form, avatar: form.name.trim().charAt(form.name.trim().lastIndexOf(' ') + 1) || form.name.trim().charAt(0) });
  };

  return (
    <Modal title={staff ? 'Personeli Düzenle' : 'Yeni Personel Ekle'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Ad Soyad</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ecz. Ad Soyad" required
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Rol</label>
          <div className="flex gap-2">
            {ROLE_OPTIONS.map(r => (
              <button type="button" key={r} onClick={() => set('role', r)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${form.role === r ? 'bg-indigo-500 text-white border-indigo-500' : 'border-slate-200 text-slate-500 hover:border-indigo-200'}`}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Renk</label>
          <div className="flex gap-2">
            {COLORS.map(c => (
              <button type="button" key={c} onClick={() => set('color', c)}
                style={{ background: c }}
                className={`w-8 h-8 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-110'}`} />
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">İptal</button>
          <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors">Kaydet</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── TASK MODAL ───────────────────────────────────────────────────────────────

function TaskModal({ task, staffList, onSave, onClose }: {
  task?: Task; staffList: Staff[]; onSave: (t: Task) => void; onClose: () => void;
}) {
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const [form, setForm] = useState<Task>(task ?? {
    id: uid(), title: '', assigneeId: staffList[0]?.id ?? '', priority: 'medium',
    status: 'pending', time: now, category: 'Diğer', note: '', createdAt: new Date().toISOString(),
  });
  const set = (k: keyof Task, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal title={task ? 'Görevi Düzenle' : 'Yeni Görev Ekle'} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); if (form.title.trim()) onSave(form); }} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Görev Adı</label>
          <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Görev açıklaması..." required
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Sorumlu</label>
            <select value={form.assigneeId} onChange={e => set('assigneeId', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none bg-white">
              <option value="">Atanmadı</option>
              {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Saat</label>
            <input type="time" value={form.time} onChange={e => set('time', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none" />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Öncelik</label>
          <div className="grid grid-cols-4 gap-2">
            {PRIORITY_OPTIONS.map(p => {
              const m = PRIORITY_META[p];
              return (
                <button type="button" key={p} onClick={() => set('priority', p)}
                  className={`py-2 rounded-xl text-[11px] font-bold border transition-all ${form.priority === p ? `${m.bg} ${m.text} border-current` : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Kategori</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map(c => (
              <button type="button" key={c} onClick={() => set('category', c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${form.category === c ? 'bg-indigo-500 text-white border-indigo-500' : 'border-slate-200 text-slate-500 hover:border-indigo-200'}`}>
                {CATEGORY_EMOJI[c]} {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Durum</label>
          <div className="flex gap-2">
            {(['pending', 'in-progress', 'completed'] as Task['status'][]).map(s => (
              <button type="button" key={s} onClick={() => set('status', s)}
                className={`flex-1 py-2 rounded-xl text-[11px] font-bold border transition-all ${form.status === s ? `${STATUS_META[s].bg} ${STATUS_META[s].text} border-current` : 'border-slate-200 text-slate-400'}`}>
                {STATUS_META[s].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Not (Opsiyonel)</label>
          <textarea value={form.note} onChange={e => set('note', e.target.value)} rows={2} placeholder="Ek açıklama..."
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none resize-none" />
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">İptal</button>
          <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors">Kaydet</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── STAFF PANEL ──────────────────────────────────────────────────────────────

function StaffPanel({ staffList, tasks, onAdd, onEdit, onDelete, onClose }: {
  staffList: Staff[]; tasks: Task[];
  onAdd: () => void; onEdit: (s: Staff) => void; onDelete: (id: string) => void; onClose: () => void;
}) {
  return (
    <Modal title="Personel Yönetimi" onClose={onClose}>
      <div className="space-y-3">
        {staffList.map(s => {
          const myTasks = tasks.filter(t => t.assigneeId === s.id);
          const done = myTasks.filter(t => t.status === 'completed').length;
          return (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
              <Avatar staff={s} size={40} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 text-sm truncate">{s.name}</div>
                <div className="text-xs text-slate-400">{s.role} · {done}/{myTasks.length} görev</div>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => onEdit(s)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-xs font-semibold hover:bg-indigo-50 hover:text-indigo-600 transition-colors">Düzenle</button>
                <button onClick={() => onDelete(s.id)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-xs font-semibold hover:bg-red-50 hover:text-red-500 transition-colors">Sil</button>
              </div>
            </div>
          );
        })}
        <button onClick={onAdd}
          className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 text-sm font-semibold hover:border-indigo-300 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2">
          <span className="text-lg">+</span> Personel Ekle
        </button>
      </div>
    </Modal>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function TaskBoard({ gln }: { gln?: string }) {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [staffList, setStaffList] = useState<Staff[]>(INITIAL_STAFF);
  const [loading, setLoading] = useState(true);

  const isWails = typeof window !== 'undefined' && (window as any).go !== undefined;

  useEffect(() => {
    const loadData = async () => {
      if (!gln) return;
      try {
        if (isWails) {
          const content = await (window as any).go.main.App.LoadLocalJSON(gln, "gorev.json");
          if (content && content !== '{}') {
            const parsed = JSON.parse(content);
            if (parsed.tasks) setTasks(parsed.tasks);
            if (parsed.staffList) setStaffList(parsed.staffList);
          }
        } else {
          const cached = localStorage.getItem("gorev_" + gln);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.tasks) setTasks(parsed.tasks);
            if (parsed.staffList) setStaffList(parsed.staffList);
          }
        }
      } catch (err) {
        console.error("Görev panosu yüklenirken hata:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [gln]);

  useEffect(() => {
    if (loading || !gln) return;
    const saveData = async () => {
      try {
        const payload = { tasks, staffList };
        if (isWails) {
          await (window as any).go.main.App.SaveLocalJSON(gln, "gorev.json", JSON.stringify(payload));
        } else {
          localStorage.setItem("gorev_" + gln, JSON.stringify(payload));
        }
      } catch (err) {
        console.error("Görev panosu kaydedilirken hata:", err);
      }
    };
    saveData();
  }, [tasks, staffList, gln, loading]);

  // Modals
  const [showStaffPanel, setShowStaffPanel] = useState(false);
  const [staffModal, setStaffModal] = useState<{ open: boolean; staff?: Staff }>({ open: false });
  const [taskModal, setTaskModal] = useState<{ open: boolean; task?: Task }>({ open: false });

  // Filters
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'time' | 'priority' | 'status'>('time');

  // ── Computed ──

  const filteredTasks = useMemo(() => {
    let list = [...tasks];
    if (filterAssignee !== 'all') list = list.filter(t => t.assigneeId === filterAssignee);
    if (filterPriority !== 'all') list = list.filter(t => t.priority === filterPriority);
    if (filterStatus !== 'all') list = list.filter(t => t.status === filterStatus);
    if (filterCategory !== 'all') list = list.filter(t => t.category === filterCategory);
    if (search.trim()) list = list.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

    const pOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sOrder = { pending: 0, 'in-progress': 1, completed: 2 };
    if (sortBy === 'priority') list.sort((a, b) => pOrder[a.priority] - pOrder[b.priority]);
    else if (sortBy === 'status') list.sort((a, b) => sOrder[a.status] - sOrder[b.status]);
    else list.sort((a, b) => a.time.localeCompare(b.time));
    return list;
  }, [tasks, filterAssignee, filterPriority, filterStatus, filterCategory, search, sortBy]);

  const stats = useMemo(() => ({
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    critical: tasks.filter(t => t.priority === 'critical' && t.status !== 'completed').length,
  }), [tasks]);

  // ── Handlers ──

  const saveTask = (t: Task) => {
    setTasks(prev => prev.find(x => x.id === t.id) ? prev.map(x => x.id === t.id ? t : x) : [t, ...prev]);
    setTaskModal({ open: false });
  };

  const deleteTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));

  const cycleStatus = (id: string) => {
    const cycle: Task['status'][] = ['pending', 'in-progress', 'completed'];
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: cycle[(cycle.indexOf(t.status) + 1) % 3] } : t));
  };

  const saveStaff = (s: Staff) => {
    setStaffList(prev => prev.find(x => x.id === s.id) ? prev.map(x => x.id === s.id ? s : x) : [...prev, s]);
    setStaffModal({ open: false });
  };

  const deleteStaff = (id: string) => {
    setStaffList(prev => prev.filter(s => s.id !== id));
    setTasks(prev => prev.map(t => t.assigneeId === id ? { ...t, assigneeId: '' } : t));
  };

  const getStaff = (id: string) => staffList.find(s => s.id === id);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* ── HEADER ── */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center text-white text-lg">💊</div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Operasyon Planı</h1>
            </div>
            <p className="text-sm text-slate-400 font-medium">
              {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowStaffPanel(true)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
              👥 Personel
            </button>
            <button onClick={() => setTaskModal({ open: true })}
              className="px-4 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600 transition-colors flex items-center gap-2 shadow-sm">
              + Görev Ekle
            </button>
          </div>
        </div>

        {/* ── STATS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Toplam', value: stats.total, color: 'bg-white', text: 'text-slate-800', sub: 'text-slate-400' },
            { label: 'Bekliyor', value: stats.pending, color: 'bg-white', text: 'text-slate-600', sub: 'text-slate-400' },
            { label: 'Devam', value: stats.inProgress, color: 'bg-indigo-50', text: 'text-indigo-700', sub: 'text-indigo-400' },
            { label: 'Tamamlandı', value: stats.completed, color: 'bg-emerald-50', text: 'text-emerald-700', sub: 'text-emerald-400' },
            { label: '🔴 Kritik', value: stats.critical, color: 'bg-red-50', text: 'text-red-700', sub: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className={`${s.color} rounded-2xl p-4 border border-slate-100 shadow-sm`}>
              <div className={`text-2xl font-extrabold ${s.text}`}>{s.value}</div>
              <div className={`text-xs font-semibold ${s.sub} mt-0.5`}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── FILTERS ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Ara..."
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none w-48" />

            <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none">
              <option value="all">👤 Tüm Personel</option>
              {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none">
              <option value="all">⚡ Tüm Öncelik</option>
              {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
            </select>

            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none">
              <option value="all">📌 Tüm Durum</option>
              <option value="pending">Bekliyor</option>
              <option value="in-progress">Devam Ediyor</option>
              <option value="completed">Tamamlandı</option>
            </select>

            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none">
              <option value="all">🗂 Tüm Kategori</option>
              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</option>)}
            </select>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Sırala:</span>
              {(['time', 'priority', 'status'] as const).map(s => (
                <button key={s} onClick={() => setSortBy(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortBy === s ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  {s === 'time' ? '🕐 Saat' : s === 'priority' ? '⚡ Öncelik' : '📌 Durum'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── TASK TABLE ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[10px] uppercase tracking-widest font-bold text-slate-400 border-b border-slate-100">
                  <th className="px-5 py-3.5 text-center w-10">Durum</th>
                  <th className="px-5 py-3.5">Görev</th>
                  <th className="px-5 py-3.5">Sorumlu</th>
                  <th className="px-5 py-3.5">Öncelik</th>
                  <th className="px-5 py-3.5">Kategori</th>
                  <th className="px-5 py-3.5">Saat</th>
                  <th className="px-5 py-3.5 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <AnimatePresence mode="popLayout">
                  {filteredTasks.map(task => {
                    const staff = getStaff(task.assigneeId);
                    const pm = PRIORITY_META[task.priority];
                    const sm = STATUS_META[task.status];
                    return (
                      <motion.tr key={task.id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                        className={`group hover:bg-indigo-50/30 transition-all ${task.status === 'completed' ? 'opacity-50' : ''}`}>

                        {/* Status cycle button */}
                        <td className="px-5 py-3.5 text-center">
                          <button onClick={() => cycleStatus(task.id)} title={sm.label}
                            className={`w-7 h-7 rounded-full border-2 flex items-center justify-center mx-auto transition-all hover:scale-110 active:scale-95 ${sm.bg} ${sm.text} border-current`}>
                            {task.status === 'completed' ? '✓' : task.status === 'in-progress' ? '▶' : '○'}
                          </button>
                        </td>

                        {/* Title + note */}
                        <td className="px-5 py-3.5 max-w-xs">
                          <div className={`text-sm font-semibold ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                            {task.title}
                          </div>
                          {task.note && <div className="text-xs text-slate-400 truncate mt-0.5">{task.note}</div>}
                        </td>

                        {/* Assignee */}
                        <td className="px-5 py-3.5">
                          {staff ? (
                            <div className="flex items-center gap-2">
                              <Avatar staff={staff} size={28} />
                              <div>
                                <div className="text-xs font-semibold text-slate-700">{staff.name}</div>
                                <div className="text-[10px] text-slate-400">{staff.role}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Atanmadı</span>
                          )}
                        </td>

                        {/* Priority */}
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${pm.bg} ${pm.text}`}>
                            <span style={{ background: pm.dot }} className="w-1.5 h-1.5 rounded-full inline-block" />
                            {pm.label}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-semibold text-slate-500">{CATEGORY_EMOJI[task.category]} {task.category}</span>
                        </td>

                        {/* Time */}
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-mono font-semibold text-slate-500">⏱ {task.time}</span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setTaskModal({ open: true, task })}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-500 text-[11px] font-bold hover:bg-indigo-100 transition-colors">
                              Düzenle
                            </button>
                            <button onClick={() => deleteTask(task.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-400 text-[11px] font-bold hover:bg-red-100 transition-colors">
                              Sil
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>

            {filteredTasks.length === 0 && (
              <div className="py-16 text-center">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-slate-400 text-sm font-semibold">Görev bulunamadı.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">{filteredTasks.length} / {tasks.length} görev görüntüleniyor</span>
            <div className="w-36 bg-slate-200 rounded-full h-1.5">
              <div className="bg-emerald-400 h-1.5 rounded-full transition-all" style={{ width: `${tasks.length ? (stats.completed / tasks.length) * 100 : 0}%` }} />
            </div>
          </div>
        </div>

        {/* ── STAFF WORKLOAD ── */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {staffList.map(s => {
            const myTasks = tasks.filter(t => t.assigneeId === s.id);
            const done = myTasks.filter(t => t.status === 'completed').length;
            const pct = myTasks.length ? Math.round((done / myTasks.length) * 100) : 0;
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
                <Avatar staff={s} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 text-sm truncate">{s.name}</div>
                  <div className="text-[10px] text-slate-400 mb-1.5">{s.role} · {done}/{myTasks.length} tamamlandı</div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: s.color }} />
                  </div>
                </div>
                <div className="text-lg font-extrabold" style={{ color: s.color }}>{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {showStaffPanel && (
          <StaffPanel staffList={staffList} tasks={tasks}
            onAdd={() => { setShowStaffPanel(false); setStaffModal({ open: true }); }}
            onEdit={s => { setShowStaffPanel(false); setStaffModal({ open: true, staff: s }); }}
            onDelete={id => { deleteStaff(id); }}
            onClose={() => setShowStaffPanel(false)} />
        )}
        {staffModal.open && (
          <StaffModal staff={staffModal.staff} onSave={saveStaff} onClose={() => setStaffModal({ open: false })} />
        )}
        {taskModal.open && (
          <TaskModal task={taskModal.task} staffList={staffList} onSave={saveTask} onClose={() => setTaskModal({ open: false })} />
        )}
      </AnimatePresence>
    </div>
  );
}