import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { parseAttendance, AttendanceRecord, ShiftType, AttendanceStatus, RawAttendance, DEFAULT_SHIFT_SETTINGS } from '../lib/attendance';
import { startOfYear, endOfYear, parseISO, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, isSameDay } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { Users, AlertCircle, Clock, CalendarDays, Search, Calendar as CalendarIcon, Filter, AlertTriangle, Plus, Edit2, Trash2, X, Shield, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

export function Dashboard() {
  const [rawData, setRawData] = useState<RawAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings
  const [shiftSettings, setShiftSettings] = useState(DEFAULT_SHIFT_SETTINGS);
  const [employeeShifts, setEmployeeShifts] = useState<Record<string, ShiftType>>({});

  const data = useMemo(() => {
    return parseAttendance(rawData, employeeShifts, shiftSettings);
  }, [rawData, employeeShifts, shiftSettings]);

  // Filters
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '2026-01-01',
    end: '2026-12-31',
  });
  const [filterName, setFilterName] = useState('');
  const [filterShift, setFilterShift] = useState<ShiftType | 'Semua'>('Semua');
  const [filterStatus, setFilterStatus] = useState<AttendanceStatus | 'Semua'>('Semua');
  
  const [chartView, setChartView] = useState<'harian' | 'mingguan' | 'bulanan'>('bulanan');

  // RBAC State
  const [role, setRole] = useState<'Admin' | 'Petugas'>('Petugas');
  const isAdmin = role === 'Admin';

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | number | null>(null);
  const [formData, setFormData] = useState({
    nama: '',
    tanggal: '',
    absen_masuk: '',
    absen_pulang: ''
  });

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'waktu' | 'pegawai'>('waktu');
  const [tempShiftSettings, setTempShiftSettings] = useState(shiftSettings);
  const [tempEmployeeShifts, setTempEmployeeShifts] = useState(employeeShifts);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: fetchResult, error: sbError } = await supabase
        .from('absensi_ojk_157')
        .select('id, nama, tanggal, absen_masuk, absen_pulang');

      if (sbError) {
        throw new Error(sbError.message);
      }

      setRawData(fetchResult as RawAttendance[] || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Gagal mengambil data dari Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If Supabase URL / Key are not set, show error immediately
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_URL === 'YOUR_SUPABASE_URL') {
      setError('Variabel lingkungan Supabase belum diatur. Silakan periksa file .env Anda atau panel Secrets di AI Studio.');
      setLoading(false);
      return;
    }

    const lsShift = localStorage.getItem('shiftSettings');
    if (lsShift) setShiftSettings({ ...DEFAULT_SHIFT_SETTINGS, ...JSON.parse(lsShift) });
    
    const lsEmployees = localStorage.getItem('employeeShifts');
    if (lsEmployees) setEmployeeShifts(JSON.parse(lsEmployees));

    fetchData();
  }, []);

  const openModal = (record?: AttendanceRecord) => {
    if (record) {
      setEditId(record.id || null);
      setFormData({
        nama: record.nama,
        tanggal: record.tanggal,
        absen_masuk: record.absen_masuk || '',
        absen_pulang: record.absen_pulang || ''
      });
    } else {
      setEditId(null);
      setFormData({ nama: '', tanggal: format(new Date(), 'yyyy-MM-dd'), absen_masuk: '', absen_pulang: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        nama: formData.nama,
        tanggal: formData.tanggal,
        absen_masuk: formData.absen_masuk || null,
        absen_pulang: formData.absen_pulang || null
      };

      if (editId) {
        const { error: sbError } = await supabase.from('absensi_ojk_157').update(payload).eq('id', editId);
        if (sbError) throw new Error(sbError.message);
      } else {
        const { error: sbError } = await supabase.from('absensi_ojk_157').insert([payload]);
        if (sbError) throw new Error(sbError.message);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(`Gagal menyimpan data: ${err.message}`);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    try {
      const { error: sbError } = await supabase.from('absensi_ojk_157').delete().eq('id', id);
      if (sbError) throw new Error(sbError.message);
      fetchData();
    } catch (err: any) {
      alert(`Gagal menghapus data: ${err.message}`);
    }
  };

  const openSettings = () => {
    setTempShiftSettings(shiftSettings);
    setTempEmployeeShifts(employeeShifts);
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setShiftSettings(tempShiftSettings);
    setEmployeeShifts(tempEmployeeShifts);
    localStorage.setItem('shiftSettings', JSON.stringify(tempShiftSettings));
    localStorage.setItem('employeeShifts', JSON.stringify(tempEmployeeShifts));
    setIsSettingsOpen(false);
  };

  const uniqueNames = useMemo(() => {
    return Array.from(new Set(rawData.map(r => r.nama))).sort();
  }, [rawData]);

  // Filter Data
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Date filter
      let isInDateRange = true;
      if (dateRange.start && dateRange.end && item.tanggal) {
        try {
          const itemDate = parseISO(item.tanggal);
          const start = parseISO(dateRange.start);
          const end = parseISO(dateRange.end);
          isInDateRange = isWithinInterval(itemDate, { start, end });
        } catch(e) {
          isInDateRange = false;
        }
      }

      // Name filter
      const matchesName = item.nama.toLowerCase().includes(filterName.toLowerCase());

      // Shift filter
      const matchesShift = filterShift === 'Semua' || item.shift === filterShift;

      // Status filter
      const matchesStatus = filterStatus === 'Semua' || item.status === filterStatus;

      return isInDateRange && matchesName && matchesShift && matchesStatus;
    });
  }, [data, dateRange, filterName, filterShift, filterStatus]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let total = filteredData.length;
    let Hadir = 0;
    let Terlambat = 0;
    let TAM = 0;
    let TAP = 0;
    let Libur = 0;

    filteredData.forEach(r => {
      if (r.status === 'Hadir') Hadir++;
      else if (r.status === 'Terlambat') Terlambat++;
      else if (r.status === 'TAM') TAM++;
      else if (r.status === 'TAP') TAP++;
      else if (r.status === 'Libur/Tidak Hadir di Kantor') Libur++;
    });

    return { total, Hadir, Terlambat, TAM, TAP, 'Libur/Tidak Hadir di Kantor': Libur };
  }, [filteredData]);

  // Chart Data preparation
  const chartData = useMemo(() => {
    const grouped = new Map<string, { intervalName: string, Hadir: number, Terlambat: number, TAM: number, TAP: number, 'Libur/Tidak Hadir di Kantor': number }>();

    filteredData.forEach(r => {
      if (!r.tanggal) return;
      const date = parseISO(r.tanggal);
      let key = '';
      
      if (chartView === 'harian') {
        key = format(date, 'yyyy-MM-dd');
      } else if (chartView === 'mingguan') {
        const sw = startOfWeek(date, { weekStartsOn: 1 });
        key = `Minggu ${format(sw, 'dd MMM yyyy')}`;
      } else if (chartView === 'bulanan') {
        key = format(startOfMonth(date), 'MMMM yyyy');
      }

      const existing = grouped.get(key) || { intervalName: key, Hadir: 0, Terlambat: 0, TAM: 0, TAP: 0, 'Libur/Tidak Hadir di Kantor': 0 };
      existing[r.status] += 1;
      grouped.set(key, existing);
    });

    // Sort by key
    return Array.from(grouped.values()).sort((a, b) => a.intervalName.localeCompare(b.intervalName));
  }, [filteredData, chartView]);

  const COLORS = {
    Hadir: '#10b981', // Emerald 500
    Terlambat: '#f97316', // Orange 500
    TAM: '#e11d48', // Rose 600
    TAP: '#d97706', // Amber 600
    'Libur/Tidak Hadir di Kantor': '#64748b', // Slate 500
  };

  const pieData = Object.entries(metrics)
    .filter(([key]) => key !== 'total')
    .map(([key, value]) => ({ name: key, value }));

  return (
    <div className="p-6 max-w-[1200px] mx-auto flex flex-col gap-4 text-slate-800">
      <header className="flex items-center justify-between bg-white px-6 py-4 rounded-xl shadow-sm border border-slate-200 flex-col md:flex-row gap-4 md:gap-0">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Dashboard Absensi Kontak OJK 157</h1>
          <p className="text-xs text-slate-500 font-medium">Monitoring Kehadiran Petugas Kontak OJK 157 • Periode: Jan - Des 2026</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600">Status Database: <span className="text-emerald-600">Connected</span></div>
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button 
              onClick={() => setRole('Petugas')}
              className={cn("px-3 py-1 text-xs font-bold rounded-md transition-colors", role === 'Petugas' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Petugas
            </button>
            <button 
              onClick={() => setRole('Admin')}
              className={cn("px-3 py-1 text-xs font-bold rounded-md transition-colors flex items-center gap-1", role === 'Admin' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              <Shield className="w-3 h-3" /> Admin
            </button>
          </div>
          <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">{isAdmin ? 'A' : 'P'}</div>
        </div>
      </header>

      {error ? (
        <div className="bg-red-50 text-red-700 p-6 rounded-2xl flex items-center gap-3 border border-red-200">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      ) : loading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Memuat data absensi...</p>
        </div>
      ) : (
        <>
          {/* Filters Row */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5 mt-auto">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5"/> Tanggal Mulai</label>
              <input 
                type="date" 
                value={dateRange.start}
                onChange={(e) => setDateRange(p => ({ ...p, start: e.target.value }))}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none"
              />
            </div>
            <div className="space-y-1.5 mt-auto">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5"/> Tanggal Selesai</label>
              <input 
                type="date" 
                value={dateRange.end}
                onChange={(e) => setDateRange(p => ({ ...p, end: e.target.value }))}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none"
              />
            </div>
            <div className="space-y-1.5 mt-auto">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Search className="w-3.5 h-3.5"/> Cari Nama Pegawai</label>
              <input 
                type="text" 
                placeholder="Misal: Budi"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Shift</label>
                <select 
                  value={filterShift} 
                  onChange={(e) => setFilterShift(e.target.value as any)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none bg-white appearance-none"
                >
                  <option value="Semua">Semua Shift</option>
                  <option value="Non Shift">Non Shift</option>
                  <option value="Shift 1">Shift 1</option>
                  <option value="Shift 2">Shift 2</option>
                  <option value="Shift 3">Shift 3</option>
                  <option value="Shift 4">Shift 4</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Filter className="w-3.5 h-3.5"/> Status</label>
                <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none bg-white appearance-none"
                >
                  <option value="Semua">Semua Status</option>
                  <option value="Hadir">Hadir</option>
                  <option value="Terlambat">Terlambat</option>
                  <option value="TAM">TAM</option>
                  <option value="TAP">TAP</option>
                  <option value="Libur/Tidak Hadir di Kantor">Libur/Tidak Hadir di Kantor</option>
                </select>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
             <MetricCard 
               title="Total Data" 
               value={metrics.total} 
               valueClass="text-slate-900" 
               onClick={() => setFilterStatus('Semua')}
               isActive={filterStatus === 'Semua'}
               clickable
             />
             <MetricCard 
               title="Hadir Tepat" 
               value={metrics.Hadir} 
               valueClass="text-emerald-500" 
               onClick={() => setFilterStatus(filterStatus === 'Hadir' ? 'Semua' : 'Hadir')}
               isActive={filterStatus === 'Hadir'}
               clickable
             />
             <MetricCard 
               title="Terlambat" 
               value={metrics.Terlambat} 
               valueClass="text-orange-500" 
               onClick={() => setFilterStatus(filterStatus === 'Terlambat' ? 'Semua' : 'Terlambat')}
               isActive={filterStatus === 'Terlambat'}
               clickable
             />
             <MetricCard 
               title="TAM (Tidak Absen Masuk)" 
               value={metrics.TAM} 
               valueClass="text-rose-600" 
               onClick={() => setFilterStatus(filterStatus === 'TAM' ? 'Semua' : 'TAM')}
               isActive={filterStatus === 'TAM'}
               clickable
             />
             <MetricCard 
               title="TAP (Tidak Absen Pulang)" 
               value={metrics.TAP} 
               valueClass="text-amber-600" 
               onClick={() => setFilterStatus(filterStatus === 'TAP' ? 'Semua' : 'TAP')}
               isActive={filterStatus === 'TAP'}
               clickable
             />
             <MetricCard 
               title="Libur/Tidak Hadir" 
               value={metrics['Libur/Tidak Hadir di Kantor']} 
               valueClass="text-slate-500" 
               onClick={() => setFilterStatus(filterStatus === 'Libur/Tidak Hadir di Kantor' ? 'Semua' : 'Libur/Tidak Hadir di Kantor')}
               isActive={filterStatus === 'Libur/Tidak Hadir di Kantor'}
               clickable
             />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main Bar Chart */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-900">Tren Absensi</h3>
                <select 
                  value={chartView} 
                  onChange={e => setChartView(e.target.value as any)}
                  className="h-9 px-3 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                >
                  <option value="harian">Harian</option>
                  <option value="mingguan">Mingguan</option>
                  <option value="bulanan">Bulanan</option>
                </select>
              </div>
              <div className="h-[350px] w-full min-h-[350px] min-w-0">
                <ResponsiveContainer width="100%" height={350} minWidth={1}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="intervalName" 
                      tick={{ fontSize: 12, fill: '#6B7280' }} 
                      axisLine={false} 
                      tickLine={false} 
                      dy={10} 
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#6B7280' }} 
                      axisLine={false} 
                      tickLine={false} 
                      dx={-10}
                    />
                    <RechartsTooltip 
                      cursor={{ fill: '#F3F4F6' }}
                      contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                    <Bar dataKey="Hadir" stackId="a" fill={COLORS['Hadir']} radius={[0, 0, 4, 4]} />
                    <Bar dataKey="Terlambat" stackId="a" fill={COLORS['Terlambat']} />
                    <Bar dataKey="TAM" stackId="a" fill={COLORS['TAM']} />
                    <Bar dataKey="TAP" stackId="a" fill={COLORS['TAP']} />
                    <Bar dataKey="Libur/Tidak Hadir di Kantor" stackId="a" fill={COLORS['Libur/Tidak Hadir di Kantor']} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distribution Pie Chart */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Distribusi Status</h3>
              <div className="flex-grow flex items-center justify-center h-[300px] w-full min-w-0">
                {filteredData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300} minWidth={1}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-gray-400 text-sm">Tidak ada data untuk ditampilkan</div>
                )}
              </div>
            </div>
          </div>

          {/* Detail Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900">Detail Absensi Pegawai</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-500">
                  Menampilkan {Math.min(filteredData.length, 100)} dari {filteredData.length} baris
                </span>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => openSettings()}
                      className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                    >
                      <Settings className="w-3.5 h-3.5" /> Pengaturan
                    </button>
                    <button 
                      onClick={() => openModal()} 
                      className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Data
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
                  <tr className="border-b border-slate-100">
                     <th className="px-4 py-3">Nama Pegawai</th>
                     <th className="px-4 py-3 text-center">Tanggal</th>
                     <th className="px-4 py-3 text-center">Shift</th>
                     <th className="px-4 py-3 text-center">Masuk</th>
                     <th className="px-4 py-3 text-center">Pulang</th>
                     <th className="px-4 py-3 text-center">Status</th>
                     {isAdmin && <th className="px-4 py-3 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredData.length > 0 ? (
                    filteredData.slice(0, 100).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">{row.nama}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{row.tanggal}</td>
                        <td className="px-4 py-3 text-center text-slate-600">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 uppercase tracking-widest">
                            {row.shift}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-slate-600">{row.absen_masuk || '-'}</td>
                        <td className="px-4 py-3 text-center font-mono text-slate-600">{row.absen_pulang || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={row.status} />
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => openModal(row)} className="text-slate-400 hover:text-indigo-600 transition-colors" title="Edit">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => row.id && handleDelete(row.id)} className="text-slate-400 hover:text-rose-600 transition-colors" title="Hapus">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        Tidak ada data yang sesuai dengan filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-900">Pengaturan Dashboard</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex border-b border-slate-100 px-4 pt-2 gap-4">
              <button 
                onClick={() => setSettingsTab('waktu')}
                className={cn("px-2 py-2 text-sm font-bold border-b-2 transition-colors", settingsTab === 'waktu' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700")}
              >
                Aturan Waktu Shift
              </button>
              <button 
                onClick={() => setSettingsTab('pegawai')}
                className={cn("px-2 py-2 text-sm font-bold border-b-2 transition-colors", settingsTab === 'pegawai' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700")}
              >
                Penempatan Pegawai
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                {settingsTab === 'waktu' && (
                  <div className="space-y-4">
                    {(Object.keys(DEFAULT_SHIFT_SETTINGS) as ShiftType[]).filter(s => s !== 'Unknown').map(shift => (
                      <div key={shift} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
                         <div className="font-bold text-slate-700">{shift}</div>
                         <div className="flex items-center gap-4">
                           <div className="flex flex-col gap-1">
                             <label className="text-[10px] uppercase font-bold text-slate-500">Masuk</label>
                             <input type="time" value={tempShiftSettings[shift].masuk} onChange={(e) => setTempShiftSettings(p => ({...p, [shift]: {...p[shift], masuk: e.target.value}}))} required className="border border-slate-200 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500" />
                           </div>
                           <div className="flex flex-col gap-1">
                             <label className="text-[10px] uppercase font-bold text-slate-500">Pulang</label>
                             <input type="time" value={tempShiftSettings[shift].pulang} onChange={(e) => setTempShiftSettings(p => ({...p, [shift]: {...p[shift], pulang: e.target.value}}))} required className="border border-slate-200 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500" />
                           </div>
                         </div>
                      </div>
                    ))}
                  </div>
                )}

                {settingsTab === 'pegawai' && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                       <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                         <tr>
                            <th className="px-4 py-3">Nama Pegawai</th>
                            <th className="px-4 py-3 w-48">Tipe Shift</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {uniqueNames.map(nama => (
                           <tr key={nama}>
                             <td className="px-4 py-3 font-medium text-slate-700">{nama}</td>
                             <td className="px-4 py-3">
                                <select 
                                  value={tempEmployeeShifts[nama] || 'Non Shift'} 
                                  onChange={(e) => setTempEmployeeShifts(p => ({...p, [nama]: e.target.value as ShiftType}))}
                                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                                >
                                   {(Object.keys(DEFAULT_SHIFT_SETTINGS) as ShiftType[]).filter(s => s !== 'Unknown').map(s => (
                                     <option key={s} value={s}>{s}</option>
                                   ))}
                                </select>
                             </td>
                           </tr>
                         ))}
                         {uniqueNames.length === 0 && (
                            <tr><td colSpan={2} className="px-4 py-6 text-center text-slate-500">Belum ada data pegawai</td></tr>
                         )}
                       </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-2">
                <button type="button" onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors">Batal</button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm">Simpan Pengaturan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-900">{editId ? 'Edit Data Absensi' : 'Tambah Data Absensi'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Nama Pegawai</label>
                <input 
                  type="text" 
                  value={formData.nama} 
                  onChange={e => setFormData(p => ({ ...p, nama: e.target.value }))}
                  required
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Tanggal</label>
                <input 
                  type="date" 
                  value={formData.tanggal} 
                  onChange={e => setFormData(p => ({ ...p, tanggal: e.target.value }))}
                  required
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Jam Masuk</label>
                  <input 
                    type="time" 
                    step="1"
                    value={formData.absen_masuk} 
                    onChange={e => setFormData(p => ({ ...p, absen_masuk: e.target.value }))}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Jam Pulang</label>
                  <input 
                    type="time" 
                    step="1"
                    value={formData.absen_pulang} 
                    onChange={e => setFormData(p => ({ ...p, absen_pulang: e.target.value }))}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, valueClass, onClick, isActive, clickable }: { title: string, value: number, valueClass?: string, onClick?: () => void, isActive?: boolean, clickable?: boolean }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white p-4 rounded-xl shadow-sm border flex flex-col gap-1 transition-all",
        clickable ? "cursor-pointer hover:border-indigo-400 hover:shadow-md active:scale-95" : "border-slate-200",
        isActive ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30" : "border-slate-200"
      )}
    >
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
      <div className="flex items-baseline gap-2">
        <span className={cn("text-2xl font-bold", valueClass || "text-slate-900")}>{value.toLocaleString()}</span>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const styles = {
    'Hadir': 'bg-emerald-100 text-emerald-700',
    'Terlambat': 'bg-orange-100 text-orange-700',
    'TAM': 'bg-rose-100 text-rose-700',
    'TAP': 'bg-amber-100 text-amber-700',
    'Libur/Tidak Hadir di Kantor': 'bg-slate-200 text-slate-700'
  };

  return (
    <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold uppercase", styles[status])}>
      {status}
    </span>
  );
}
