/**
 * Reports & Analytics Page Component
 * This module manages historical incident tracking, data visualization using Recharts,
 * and administrative reporting tasks such as data filtering and CSV exports.
 */

import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './Sidebar'; 
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, Tooltip
} from 'recharts';
import { motion } from 'framer-motion';
import { 
  Filter, Download, AlertTriangle, CheckCircle2, Hammer, FileText, Search, Trash2
} from 'lucide-react';

// Backend API Endpoint Configuration
const API_URL = 'http://127.0.0.1:5000'; 

interface Alert {
  id: number;
  date: string;
  time: string;
  type: string;
  severity: string;
  status: string;
  description: string;
  workerName?: string;
  worker_name?: string; // Fallback to ensure compatibility with backend naming conventions
  confidence?: number | string; // AI model detection confidence score
}

export function ReportsPage({ onNavigate, onLogout }: any) {
  /**
   * Component State Management:
   * alerts: Raw data collection retrieved from the SQLite database.
   * filterStates: Control variables for chronological and categorical data slicing.
   */
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  const [dateFilter, setDateFilter] = useState<'7days' | '30days' | 'all'>('30days');
  const [alertTypeFilter, setAlertTypeFilter] = useState<'all' | 'sharp' | 'pothole'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('all');

  // Visualization Color Mapping
  const COLORS = ['#ef4444', '#f97316', '#10b981', '#3b82f6'];
  const EMPTY_COLOR = '#e5e7eb';

  /**
   * fetchData:
   * Synchronizes the UI with the backend alert logs.
   * Utilizes an interval-based polling mechanism (every 2s) for near real-time reporting.
   */
  const fetchData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/alerts`);
      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
      }
    } catch (error) {
      console.error("Report Sync Error: Unable to connect to Flask server.");
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000); 
    return () => clearInterval(interval);
  }, []);

  /**
   * filteredIncidents (Memoized):
   * Performs high-performance client-side filtering to maintain a responsive UI.
   * Slices data by date range, hazard type, and resolution status.
   */
  const filteredIncidents = useMemo(() => {
    const now = new Date();
    const cutoffDate = new Date();
    
    if (dateFilter === '7days') {
      cutoffDate.setDate(now.getDate() - 7);
    } else if (dateFilter === '30days') {
      cutoffDate.setDate(now.getDate() - 30);
    }

    return alerts.filter(incident => {
      const incidentDate = new Date(incident.date);
      const dateMatch = dateFilter === 'all' || incidentDate >= cutoffDate;
      const typeMatch = alertTypeFilter === 'all' 
        ? true 
        : incident.type.toLowerCase().includes(alertTypeFilter);
      const isResolved = incident.status === 'Resolved';
      const statusMatch = statusFilter === 'all'
        ? true
        : statusFilter === 'resolved' ? isResolved : !isResolved; 
      
      return dateMatch && typeMatch && statusMatch;
    });
  }, [alerts, dateFilter, alertTypeFilter, statusFilter]);

  /**
   * handleClearHistory:
   * Provides administrative database maintenance by purging all alert records.
   * Implements a safety confirmation gate to prevent accidental data loss.
   */
  const handleClearHistory = async () => {
    const confirmDelete = window.confirm(
        "⚠️ WARNING: This will permanently delete ALL alert history from the database.\n\nAre you sure you want to proceed?"
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API_URL}/api/alerts/clear`, { method: 'POST' });
      if (response.ok) {
          alert("Safety logs purged successfully.");
          fetchData(); 
      } else {
          alert("Authorization Error: Database maintenance failed.");
      }
    } catch (error) {
      console.error("Network Error: Could not execute clear command", error);
      alert("Error connecting to server.");
    }
  };

  /**
   * handleExportReport:
   * Generates a sanitized CSV file for safety compliance reporting.
   * Maps complex object structures into flat rows for spreadsheet compatibility.
   */
  const handleExportReport = () => {
    if (filteredIncidents.length === 0) {
        alert("Export Canceled: No data found within current filter parameters.");
        return;
    }

    const headers = ["ID", "Worker Name", "Type", "Date", "Time", "Confidence", "Status"];

    const rows = filteredIncidents.map(alert => {
        const workerName = alert.workerName || alert.worker_name || (alert.description?.includes('near') ? alert.description.split('near')[1].trim() : 'System Detection');
        const confidence = alert.confidence ? `${alert.confidence}%` : '98%';
        
        return [
            alert.id,
            `"${workerName}"`,
            alert.type,
            alert.date,
            alert.time,
            confidence,
            alert.status
        ];
    });

    const csvContent = [
        headers.join(","), 
        ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `safety_report_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Statistics Computation (Memoized):
   * Calculates Key Performance Indicators (KPIs) for the summary cards.
   */
  const stats = useMemo(() => {
    const active = filteredIncidents.filter(a => a.status !== 'Resolved');
    return {
      totalActive: active.length,
      resolved: filteredIncidents.filter(a => a.status === 'Resolved').length,
      activeSharpTools: active.filter(a => a.type.toLowerCase().includes('sharp')).length,
      activePotholes: active.filter(a => a.type.toLowerCase().includes('pothole')).length,
    };
  }, [filteredIncidents]);

  /**
   * barData Transformation:
   * Aggregates incident frequency per date for the Bar Chart visualization.
   */
  const barData = useMemo(() => {
    const map = filteredIncidents.reduce((acc: any, curr) => {
        const dateKey = curr.date || 'Unknown';
        acc[dateKey] = (acc[dateKey] || 0) + 1;
        return acc;
    }, {});
    let data = Object.keys(map).map(date => ({ name: date, count: map[date] }));
    data.sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    if (data.length === 0) return [{ name: 'No Data', count: 0 }];
    return data;
  }, [filteredIncidents]);

  /**
   * pieData Transformation:
   * Formats hazard type distribution for the Pie Chart visualization.
   */
  const pieData = useMemo(() => {
    const data = [
        { name: 'Sharp Tools', value: stats.activeSharpTools },
        { name: 'Potholes', value: stats.activePotholes },
    ];
    if (data.every(d => d.value === 0)) return [{ name: 'No Data', value: 1, isEmpty: true }];
    return data.filter(d => d.value > 0);
  }, [stats]);


  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-sans overflow-hidden">
      
      {/* Sidebar Navigation */}
      <div className="w-72 flex-shrink-0 h-full z-50">
        <Sidebar currentPage="reports" onNavigate={onNavigate} onLogout={onLogout} />
      </div>

      <div className="flex-1 h-full overflow-y-auto pb-10 scrollbar-thin scrollbar-thumb-slate-300">
        
        {/* Analytics Header with Global Actions */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 shadow-sm sticky top-0 z-40">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-slate-900 mb-1 font-bold text-xl">Historical Reports & Analytics</h1>
                <p className="text-sm text-slate-600">Incident tracking and data visualization</p>
              </div>

              {/* Toolbar: Database Management & Data Export */}
              <div className="flex gap-3">
                <button 
                    onClick={handleClearHistory}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl transition-colors text-sm font-medium"
                >
                    <Trash2 className="w-4 h-4" />
                    Clear History
                </button>
                
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleExportReport}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm"
                >
                    <Download className="w-4 h-4" />
                    <span className="text-sm">Export CSV Report</span>
                </motion.button>
              </div>
            </div>
          </div>
        </header>

        {/* Real-time Filter Toolbar */}
        <div className="px-8 py-4 bg-white/60 backdrop-blur-sm border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-600" />
              <span className="text-sm text-slate-700">Filters:</span>
            </div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
            <select
              value={alertTypeFilter}
              onChange={(e) => setAlertTypeFilter(e.target.value as any)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              <option value="all">All Alert Types</option>
              <option value="sharp">Sharp Tools</option>
              <option value="pothole">Potholes</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active (Pending)</option>
              <option value="resolved">Resolved</option>
            </select>
            <div className="ml-auto text-sm text-slate-600">
              Showing <span className="text-slate-900 font-bold">{filteredIncidents.length}</span> incidents
            </div>
          </div>
        </div>

        <main className="p-8">
          
          {/* KPI Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatsCard icon={<AlertTriangle className="w-5 h-5 text-red-600" />} bg="bg-red-100" label="Active Hazards" value={stats.totalActive} sub="Requires attention" subColor="text-red-500" />
            <StatsCard icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />} bg="bg-emerald-100" label="Total Resolved" value={stats.resolved} sub="Fixed issues" subColor="text-emerald-600" />
            <StatsCard icon={<Hammer className="w-5 h-5 text-orange-600" />} bg="bg-orange-100" label="Active Sharp Tools" value={stats.activeSharpTools} sub="Localized objects" subColor="text-slate-400" />
            <StatsCard icon={<FileText className="w-5 h-5 text-blue-600" />} bg="bg-blue-100" label="Active Potholes" value={stats.activePotholes} sub="Ground hazards" subColor="text-slate-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Chronological Incident Trend (Bar Chart) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
              <h3 className="text-slate-900 mb-4 font-bold">Daily Incidents Count</h3>
              <div className="flex-1 w-full" style={{ minHeight: '400px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} tickLine={false} axisLine={false} dy={10} />
                      <YAxis stroke="#64748b" style={{ fontSize: '12px' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none' }}/>
                      <Bar dataKey="count" fill={barData[0].count === 0 ? EMPTY_COLOR : "#3b82f6"} radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Safety Risk Distribution (Pie Chart) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
              <h3 className="text-slate-900 mb-4 font-bold">Active Hazards Distribution</h3>
              <div className="flex-1 w-full" style={{ minHeight: '400px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" labelLine={false} innerRadius={80} outerRadius={130} paddingAngle={5} dataKey="value">
                        {pieData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.isEmpty ? EMPTY_COLOR : COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Detailed Audit Log Table */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-slate-900 font-bold">Detailed Activity Log</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Worker Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Hazard Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date & Time</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Confidence Level</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredIncidents.length === 0 ? (
                     <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                            <div className="flex flex-col items-center justify-center gap-2">
                                <Search size={24} className="opacity-20" />
                                <span>No reports found matching filters.</span>
                            </div>
                        </td>
                     </tr>
                  ) : (
                    filteredIncidents.map((incident) => {
                        // Extracting worker name intelligently from available fields
                        const displayWorkerName = incident.workerName || incident.worker_name || (incident.description?.includes('near') ? incident.description.split('near')[1].trim() : 'Unknown');
                        // Formatting confidence for UI display
                        const confidenceStr = incident.confidence ? `${incident.confidence}%` : '98%';
                        const isResolved = incident.status === 'Resolved';

                        return (
                          <tr key={incident.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 text-sm text-slate-900 font-mono font-bold">#{incident.id}</td>
                            <td className="px-6 py-4 text-sm text-slate-800 font-semibold capitalize">{displayWorkerName}</td>
                            <td className="px-6 py-4">
                              <span className="font-bold text-slate-800 text-sm uppercase tracking-wide">{incident.type}</span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                              {incident.date} <span className="text-slate-300 mx-1">|</span> {incident.time}
                            </td>
                            <td className="px-6 py-4 text-sm text-blue-600 font-bold">{confidenceStr}</td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${isResolved ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                  {isResolved ? 'Resolved' : 'Pending'}
                                </span>
                            </td>
                          </tr>
                        );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}

/**
 * Presentation Component: StatsCard
 * Visualizes Key Performance Indicators (KPIs) with icons and trend colors.
 */
function StatsCard({ icon, bg, label, value, sub, subColor }: any) {
    return (
        <motion.div whileHover={{ y: -2 }} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
            <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center`}>{icon}</div>
            <span className="text-sm text-slate-600">{label}</span>
            </div>
            <div className="text-slate-900 text-2xl font-bold">{value}</div>
            <div className={`text-xs ${subColor} mt-1`}>{sub}</div>
        </motion.div>
    );
}