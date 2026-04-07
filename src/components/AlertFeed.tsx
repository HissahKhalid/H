/**
 * AlertFeed Component
 * This component provides a live, scrollable list of active safety hazards.
 * It visualizes real-time data from the AI camera and sensors, allowing the 
 * Safety Officer to quickly identify who is at risk and the nature of the hazard.
 * * Features:
 * 1. Visual status header (Hazard count vs. Secure state).
 * 2. Administrative 'Clear All' functionality.
 * 3. Individual alert cards with worker identity and detection source.
 */

import { AlertTriangle, Clock, Activity, MapPin, ChevronRight, User, ShieldCheck } from 'lucide-react';
import { Alert } from '../types';

interface AlertFeedProps {
  alerts: Alert[]; // Array of active, unresolved safety alerts
  onAlertClick?: (alert: Alert) => void; // Trigger for opening the CriticalAlertModal
  onClearAll?: () => void; // Bulk resolution action for the database
}

export function AlertFeed({ alerts = [], onAlertClick, onClearAll }: AlertFeedProps) {
  return (
    <div className="flex h-full w-full flex-col border-l border-slate-200 bg-slate-50 font-sans">
      
      {/* Header Section: Real-time Status Monitoring */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h3 className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-wider text-slate-800">
            <Activity className="h-4 w-4 text-purple-600" />
            Safety Live Feed
          </h3>
          <div className="mt-1 flex items-center gap-2">
            {/* Dynamic status label based on the presence of hazards */}
            <span className={`text-xs font-bold ${alerts.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {alerts.length > 0 ? `${alerts.length} Active Hazards` : 'All Systems Safe'}
            </span>
          </div>
        </div>
        
        {/* Bulk Control: Only visible when hazards exist */}
        {alerts.length > 0 && (
          <button 
            onClick={(e) => { e.stopPropagation(); onClearAll?.(); }}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold text-slate-400 transition-all hover:border-red-200 hover:text-red-600"
          >
            CLEAR ALL
          </button>
        )}
      </div>

      {/* Alerts List: Chronological Container */}
      <div className="scrollbar-thin scrollbar-thumb-slate-300 flex-1 space-y-3 overflow-y-auto p-4">
        
        {/* Conditional Rendering: Empty State vs Active Feed */}
        {alerts.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <ShieldCheck className="h-8 w-8 text-emerald-500" />
            </div>
            <h4 className="font-bold text-slate-800">Secure Environment</h4>
            <p className="mt-1 text-xs text-slate-400">No active hazards detected.</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div 
              key={alert.id} 
              onClick={() => onAlertClick?.(alert)}
              className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-red-300 hover:shadow-md"
            >
              {/* Criticality Indicator: Red sidebar for active hazards */}
              <div className="absolute bottom-0 left-0 top-0 w-1 bg-red-500"></div>
              
              <div className="flex gap-3 p-4">
                {/* Visual Icon representing the safety breach */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                
                <div className="min-w-0 flex-1">
                  {/* Meta Information: Hazard Type and Detection Time */}
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-red-700">{alert.message}</span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock size={10} /> {alert.time}
                    </span>
                  </div>
                  
                  {/* Worker Identification */}
                  <h4 className="flex items-center gap-2 truncate text-sm font-bold text-slate-900">
                    <User size={12} className="text-slate-400" /> {alert.workerName}
                  </h4>
                  
                  {/* Telemetry Source: AI Camera or Sensor Feed */}
                  <p className="mt-1 line-clamp-1 text-[11px] italic text-slate-500">
                    Detected with {alert.source}
                  </p>
                </div>

                {/* Interaction Hint */}
                <ChevronRight size={16} className="self-center text-slate-300 transition-colors group-hover:text-red-500" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}