/**
 * Dashboard Component - Safety Operations Center (SOC)
 * This is the primary functional hub of the Halm System. 
 * Responsibilities:
 * 1. Orchestrating real-time data synchronization with the Flask/SQLite backend.
 * 2. Managing the lifecycle of safety alerts and worker GPS coordinates.
 * 3. Controlling the visibility and state of the AI live camera feed.
 * 4. Aggregating system-wide statistics for the safety KPI cards.
 */

import { useState, useEffect } from 'react';
import { Helmet, Alert, Page } from '../types'; 
import { RealGoogleMap } from './RealGoogleMap';
import { AlertFeed } from './AlertFeed';
import { CriticalAlertModal } from './CriticalAlertModal';
import { Sidebar } from './Sidebar';
import { Users, AlertTriangle, Wifi, Hammer, CheckCircle2, Video, VideoOff, MapPin, Eye, EyeOff } from 'lucide-react';

// Central API Configuration
const API_URL = 'http://127.0.0.1:5000'; 

interface DashboardProps {
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

export function Dashboard({ onNavigate, onLogout }: DashboardProps) {
  /**
   * Application State:
   * helmets: Array of worker locations and statuses.
   * alerts: Collections of both active and resolved safety incidents.
   * UI State: Connectivity status, camera visibility, and modal management.
   */
  const [helmets, setHelmets] = useState<Helmet[]>([]);
  const [allAlerts, setAllAlerts] = useState<Alert[]>([]); 
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]); 
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  
  // Camera State: Defaulted to false to ensure privacy and optimize bandwidth on startup
  const [showCamera, setShowCamera] = useState(false);

  // Persistence: Track camera preference across sessions
  useEffect(() => {
    localStorage.setItem('cameraState', JSON.stringify(showCamera));
  }, [showCamera]);

  // Key Performance Indicators (KPI) State
  const [stats, setStats] = useState({
    totalWorkers: 0, 
    sharpToolAlerts: 0,
    potholeAlerts: 0,
    resolvedCount: 0 
  });

  /**
   * Data Synchronization Logic:
   * Fetches alerts and worker data simultaneously to maintain a consistent state.
   * Formats raw backend data into the structured 'Alert' and 'Helmet' types used by the UI.
   */
  const fetchData = async () => {
    try {
      const alertRes = await fetch(`${API_URL}/api/alerts`);
      const workerRes = await fetch(`${API_URL}/api/workers`);
      
      if (alertRes.ok && workerRes.ok) {
        const alertData = await alertRes.json();
        const workerData = await workerRes.json();
        setIsConnected(true);

        // Alert Processing: Mapping database records to UI Alert objects
        const processedAlerts: Alert[] = alertData.map((item: any) => ({
          id: item.id,
          helmetId: `H-${item.id}`,
          workerName: item.worker_name || 'Unknown',
          type: 'hazard',
          severity: 'critical',
          source: `AI Camera (${item.confidence || 0}%)`,
          timestamp: new Date(item.date),
          location: { lat: item.lat || 25.3463, lng: item.lng || 49.5937 },
          description: item.description,
          resolved: item.status === 'Resolved',
          message: item.type,
          time: item.time
        }));

        setAllAlerts(processedAlerts);
        const activeOnly = processedAlerts.filter(a => !a.resolved);
        setActiveAlerts(activeOnly);

        // Helmet Processing: Calculating real-time status based on active alerts
        const formattedHelmets: Helmet[] = workerData.map((w: any) => {
          const hasActiveAlert = activeOnly.some(alert => alert.workerName === w.name);
          // Simulated offset for visualization if coordinates are identical
          const fixedOffset = (w.id * 0.002) % 0.01; 

          return {
            id: `H${w.id}`, 
            workerName: w.name,
            status: hasActiveAlert ? 'alert' : 'active',
            location: { 
              lat: 25.3463 + (w.id % 2 === 0 ? fixedOffset : -fixedOffset), 
              lng: 49.5937 + (w.id % 3 === 0 ? fixedOffset : -fixedOffset) 
            }
          };
        });

        setHelmets(formattedHelmets);
        setStats(prev => ({ ...prev, totalWorkers: workerData.length }));
      }
    } catch (error) {
      setIsConnected(false);
      console.error("Dashboard Sync Failure:", error);
    }
  };

  // Lifecycle: Initialize the 2-second polling interval (Heartbeat)
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Statistic Aggregation:
   * Re-calculates totals whenever 'allAlerts' changes to update header cards.
   */
  useEffect(() => {
    const activeSharp = allAlerts.filter(a => !a.resolved && a.message?.toLowerCase().includes('sharp')).length;
    const activePothole = allAlerts.filter(a => !a.resolved && a.message?.toLowerCase().includes('pothole')).length;
    const resolved = allAlerts.filter(a => a.resolved).length;

    setStats(prev => ({
        ...prev,
        sharpToolAlerts: activeSharp,
        potholeAlerts: activePothole,
        resolvedCount: resolved
    }));
  }, [allAlerts]);

  /**
   * handleResolveAlert:
   * Commits an incident resolution to the backend and updates the UI state.
   */
  const handleResolveAlert = async (alertId: string | number) => {
    try {
      const response = await fetch(`${API_URL}/api/alerts/resolve/${alertId}`, { method: 'POST' });
      if (response.ok) {
        fetchData();
        setSelectedAlert(null);
      }
    } catch (error) {
      console.error("Resolution Error: Failed to clear the alert.");
    }
  };

  /**
   * handleClearAll:
   * Administrative bulk-clear for the alert database.
   */
  const handleClearAll = async () => {
    if(!window.confirm("Perform administrative clear of all alert logs?")) return;
    try {
      const response = await fetch(`${API_URL}/api/alerts/clear`, { method: 'POST' });
      if (response.ok) fetchData();
    } catch (error) {
      console.error("Cleanup Error: Failed to reach purge endpoint.");
    }
  };

  return (
    <div className="flex h-screen w-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* Permanent Navigation Sidebar */}
      <div className="w-72 flex-shrink-0 h-full z-50">
        <Sidebar currentPage="dashboard" onNavigate={(p: Page) => onNavigate(p)} onLogout={onLogout} />
      </div>

      <div className="flex-1 flex flex-col h-full min-w-0 bg-gray-50 relative overflow-hidden">
        
        {/* Dashboard Header: Controls and KPI Cards */}
        <header className="bg-white border-b border-gray-200 px-8 py-6 flex-shrink-0 shadow-sm z-40">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Safety Operations Center</h1>
            <div className="flex items-center gap-3">
               {/* Visibility Toggle for AI Video Feed */}
               <button
                  onClick={() => setShowCamera(!showCamera)}
                  className={`h-9 px-4 rounded-full border text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 transition-all hover:opacity-80 ${
                    showCamera ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                  }`}
               >
                  {showCamera ? <EyeOff size={14} /> : <Eye size={14} />}
                  {showCamera ? 'Hide Live Feed' : 'Show Live Feed'}
               </button>

               {/* Network Status Indicator */}
               <div className={`h-9 px-4 rounded-full border text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 transition-all ${
                  isConnected ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
               }`}>
                 <Wifi className={`w-3.5 h-3.5 ${isConnected ? 'animate-pulse' : ''}`} />
                 {isConnected ? 'System Online' : 'Connecting...'}
               </div>
            </div>
          </div>

          {/* Key Metric Overview Section */}
          <div className="grid grid-cols-4 gap-6">
            <StatsCard icon={<Users className="w-6 h-6 text-blue-600" />} bg="bg-blue-50" label="Total Workers" value={stats.totalWorkers} />
            <StatsCard icon={<Hammer className="w-6 h-6 text-orange-600" />} bg={stats.sharpToolAlerts > 0 ? "bg-red-100" : "bg-orange-50"} label="Sharp Tool Alerts" value={stats.sharpToolAlerts} isDanger={stats.sharpToolAlerts > 0} />
            <StatsCard icon={<AlertTriangle className="w-6 h-6 text-red-600" />} bg={stats.potholeAlerts > 0 ? "bg-red-100" : "bg-red-50"} label="Pothole Hazards" value={stats.potholeAlerts} isDanger={stats.potholeAlerts > 0} />
            <StatsCard icon={<CheckCircle2 className="w-6 h-6 text-green-600" />} bg="bg-green-50" label="Total Resolved" value={stats.resolvedCount} />
          </div>
        </header>

        {/* Main Operational Area */}
        <main className="flex-1 p-6 overflow-hidden relative">
          <div className="flex flex-row gap-6 h-full w-full">
            
            {/* Visual Monitoring Column (Camera + Map) */}
            <div className="flex-1 h-full min-w-0 flex flex-col gap-6 overflow-y-auto pr-2 pb-20 scrollbar-thin">
               {/* AI Camera Feed Panel */}
               {showCamera && (
                   <div className="w-full bg-black rounded-2xl shadow-sm border border-gray-800 relative overflow-hidden shrink-0" style={{ height: '400px' }}>
                       {!cameraError ? (
                           <img src={`${API_URL}/video_feed`} alt="AI Live Vision" className="w-full h-full object-contain bg-black" onError={() => setCameraError(true)}/>
                       ) : (
                           <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-gray-900">
                                <VideoOff size={48} className="mb-4 opacity-50" />
                                <p className="font-bold">AI Feed Interrupted: Check Vision Server</p>
                           </div>
                       )}
                       <div className="absolute top-4 left-4 flex gap-2">
                            <div className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-md animate-pulse shadow-sm flex items-center gap-2">
                                <span className="w-2 h-2 bg-white rounded-full"></span> LIVE AI VISION
                            </div>
                       </div>
                   </div>
               )}

               {/* Satellite GPS Tracking Panel */}
               <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden shrink-0 flex flex-col"
                 style={{ height: showCamera ? '400px' : '100%', minHeight: '400px', flex: showCamera ? 'none' : '1' }}>
                    <div className="flex-1 w-full h-full">
                        <RealGoogleMap
                          helmets={helmets}
                          selectedHelmetId={selectedAlert?.helmetId || null}
                          alerts={activeAlerts} 
                          onHelmetClick={() => {}}
                        />
                    </div>
               </div>
            </div>

            {/* Incident Management Column (Alert Feed) */}
            <div className="flex-shrink-0 h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col" style={{ width: '420px', minWidth: '420px' }}>
              <AlertFeed alerts={activeAlerts} onAlertClick={(a: Alert) => setSelectedAlert(a)} onClearAll={handleClearAll} />
            </div>
          </div>
        </main>
      </div>

      {/* Critical Interaction Layer: Alert Detailed View */}
      {selectedAlert && (
        <CriticalAlertModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} onResolve={handleResolveAlert} />
      )}
    </div>
  );
}

/**
 * StatsCard Presentation Component:
 * Highlights critical safety data points with dynamic danger-state styling.
 */
function StatsCard({ icon, bg, label, value, isDanger = false }: any) {
  return (
    <div className={`border p-4 rounded-2xl flex items-center gap-4 shadow-sm transition-all duration-300 ${isDanger ? 'bg-red-50 border-red-200 ring-1 ring-red-100' : 'bg-white border-gray-200 hover:shadow-md'}`}>
      <div className={`p-3 rounded-xl flex-shrink-0 ${bg}`}>{icon}</div>
      <div className="min-w-0">
        <div className={`text-xs font-extrabold uppercase tracking-wider truncate mb-0.5 ${isDanger ? 'text-red-700' : 'text-gray-400'}`}>{label}</div>
        <div className={`text-2xl font-bold leading-none ${isDanger ? 'text-red-700' : 'text-gray-800'}`}>{value}</div>
      </div>
    </div>
  );
}