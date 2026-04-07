/**
 * CriticalAlertModal Component
 * This component displays a detailed overlay when a safety hazard is detected.
 * It provides the Safety Officer with precise incident data including:
 * 1. Hazard Type (Sharp tools, potholes, etc.)
 * 2. Worker Identity
 * 3. Spatial Coordinates (GPS)
 * 4. Temporal Data (Date/Time)
 * 5. AI Confidence Levels
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, MapPin, Clock, Activity, User, CheckCircle } from 'lucide-react';

export interface Alert {
  id: string | number;
  type?: string;
  message?: string;
  source?: string;
  workerName: string;
  location: any; 
  date?: string;
  time?: string;
  confidence?: number | string;
}

export interface CriticalAlertModalProps {
  alert: Alert | null;
  onClose: () => void;
  onResolve: (id: string | number) => void;
}

export function CriticalAlertModal({ alert, onClose, onResolve }: CriticalAlertModalProps) {
  // Guard clause: Do not render if there is no active alert selected
  if (!alert) return null;

  /**
   * Hazard Categorization:
   * Dynamically determines the visual theme based on the alert type.
   * Potholes use Warning Yellow, while Sharp Tools/Falls use Danger Red.
   */
  const hazardType = alert.message || alert.type || 'Hazard Detected';
  const isPothole = hazardType.toLowerCase().includes("pothole");
  
  /**
   * Confidence Formatting:
   * Parses the AI model's precision score from various potential backend formats.
   */
  let confidenceLevel = "98%"; 
  if (alert.confidence) {
    confidenceLevel = String(alert.confidence).includes('%') 
      ? String(alert.confidence) 
      : `${alert.confidence}%`;
  } else if (alert.source) {
    const match = String(alert.source).match(/\d+(\.\d+)?%/);
    if (match) confidenceLevel = match[0];
  }

  // Formatting timestamp for clear legibility in the SOC (Safety Operations Center)
  const displayDate = alert.date || new Date().toLocaleDateString('en-GB'); 
  const displayTime = alert.time || 'Unknown Time';

  const themeColor = isPothole ? "text-yellow-500" : "text-red-500";
  const themeBg = isPothole ? "bg-yellow-100" : "bg-red-100";

  /**
   * Action Handler:
   * Executes the resolution logic in the parent component and closes the modal.
   */
  const handleResolveAndClose = () => {
    onResolve(alert.id);
    onClose(); 
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        
        {/* Modal Backdrop: Darkens the background and adds a high-end glassmorphism blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Content: Main Alert Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", damping: 25, stiffness: 400 }}
          className="relative w-96 bg-white rounded-3xl shadow-2xl p-6 overflow-hidden z-50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header: Visual Hazard Identity */}
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 ${themeBg} ${themeColor} shadow-sm`}>
              <AlertTriangle size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight uppercase">
                {hazardType}
              </h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                Critical Alert
              </p>
            </div>
          </div>

          {/* Personnel Assignment: Identifying the worker at risk */}
          <div className="bg-gray-50 rounded-3xl p-4 flex items-center gap-4 mb-6 border border-gray-100">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400">
              <User size={20} />
            </div>
            <div>
              <span className="block text-xs font-bold text-gray-400 uppercase mb-1">
                Reported By
              </span>
              <span className="block text-base font-bold text-gray-800">
                {alert.workerName || 'Unknown Worker'}
              </span>
            </div>
          </div>

          {/* Telemetry and Metadata: GPS, Time, and Accuracy */}
          <div className="space-y-2 mb-8">
            <InfoRow 
              icon={<MapPin size={18} />} 
              label="Location" 
              value={alert.location} 
            />
            <InfoRow 
              icon={<Clock size={18} />} 
              label="Date & Time" 
              value={`${displayDate} • ${displayTime}`} 
            />
            <InfoRow 
              icon={<Activity size={18} />} 
              label="AI Confidence" 
              value={confidenceLevel} 
              valueClassName="text-blue-600"
            />
          </div>

          {/* User Interaction: Dismissal and Resolution Controls */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-bold transition-colors shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleResolveAndClose}
              className="flex-1 py-3.5 rounded-full bg-green-500 hover:bg-green-600 text-white text-sm font-bold shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              Resolved
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/**
 * InfoRow Sub-component:
 * Handles the display of specific alert attributes in a consistent, scannable format.
 * Includes data-sanitization for GPS coordinate objects.
 */
function InfoRow({ 
  icon, 
  label, 
  value, 
  valueClassName = "text-gray-800" 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: any; 
  valueClassName?: string;
}) {
  
  let displayValue = "N/A";
  if (typeof value === 'string' || typeof value === 'number') {
    displayValue = String(value);
  } else if (value && typeof value === 'object' && 'lat' in value && 'lng' in value) {
    // Formatting coordinates to 4 decimal places for site accuracy
    displayValue = `${Number(value.lat).toFixed(4)}, ${Number(value.lng).toFixed(4)}`;
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3 text-gray-500">
        {icon}
        <span className="text-sm font-bold">{label}</span>
      </div>
      <span className={`text-sm font-bold truncate max-w-[160px] text-right ${valueClassName}`}>
        {displayValue}
      </span>
    </div>
  );
}