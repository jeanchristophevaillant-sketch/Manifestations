import React from 'react';
import { Sparkles, Calendar, Compass, Settings, RotateCw } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'report' | 'timeline' | 'all' | 'settings';
  setActiveTab: (tab: 'report' | 'timeline' | 'all' | 'settings') => void;
  newEventsCount: number;
  totalEventsCount: number;
  isScanning: boolean;
  onTriggerScan: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  newEventsCount,
  totalEventsCount,
  isScanning,
  onTriggerScan,
}) => {
  return (
    <nav
      id="mobile-bottom-navbar"
      aria-label="Navigation principale mobile"
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1.5 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_-4px_rgba(15,23,42,0.08)]"
    >
      <div className="grid grid-cols-5 items-center justify-between text-center gap-0.5">
        {/* Tab 1: Rapport */}
        <button
          id="mobile-nav-report"
          type="button"
          onClick={() => setActiveTab('report')}
          className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-colors min-h-[48px] active:scale-95 ${
            activeTab === 'report'
              ? 'text-teal-800 font-semibold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <div
            className={`relative flex items-center justify-center w-12 h-7 rounded-full transition-colors ${
              activeTab === 'report' ? 'bg-teal-100 text-teal-800' : ''
            }`}
          >
            <Sparkles className="w-5 h-5" />
            {newEventsCount > 0 && (
              <span className="absolute -top-1 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-teal-600 text-white font-bold text-[10px] tabular-nums">
                {newEventsCount > 9 ? '9+' : newEventsCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight truncate max-w-full">
            Rapport
          </span>
        </button>

        {/* Tab 2: Calendrier 6M */}
        <button
          id="mobile-nav-timeline"
          type="button"
          onClick={() => setActiveTab('timeline')}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-colors min-h-[48px] active:scale-95 ${
            activeTab === 'timeline'
              ? 'text-teal-800 font-semibold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <div
            className={`flex items-center justify-center w-12 h-7 rounded-full transition-colors ${
              activeTab === 'timeline' ? 'bg-teal-100 text-teal-800' : ''
            }`}
          >
            <Calendar className="w-5 h-5" />
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight truncate max-w-full">
            6 Mois
          </span>
        </button>

        {/* Center: Quick Scan Action (Material 3 FAB-in-bar) */}
        <button
          id="mobile-nav-scan"
          type="button"
          onClick={onTriggerScan}
          disabled={isScanning}
          aria-label={isScanning ? 'Veille en cours' : 'Lancer une veille'}
          className="flex flex-col items-center justify-center py-0.5 px-1 min-h-[48px] active:scale-95 transition-transform"
        >
          <div
            className={`w-11 h-8 rounded-2xl flex items-center justify-center shadow-sm transition-all ${
              isScanning
                ? 'bg-teal-100 border border-teal-300 text-teal-800'
                : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/25'
            }`}
          >
            <RotateCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
          </div>
          <span className="text-[11px] font-semibold text-teal-800 mt-0.5">
            {isScanning ? 'Veille...' : 'Scanner'}
          </span>
        </button>

        {/* Tab 3: All Events */}
        <button
          id="mobile-nav-all"
          type="button"
          onClick={() => setActiveTab('all')}
          className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-colors min-h-[48px] active:scale-95 ${
            activeTab === 'all'
              ? 'text-teal-800 font-semibold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <div
            className={`relative flex items-center justify-center w-12 h-7 rounded-full transition-colors ${
              activeTab === 'all' ? 'bg-teal-100 text-teal-800' : ''
            }`}
          >
            <Compass className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 text-[9px] px-1 rounded-full bg-slate-200 text-slate-800 font-bold tabular-nums">
              {totalEventsCount > 99 ? '99+' : totalEventsCount}
            </span>
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight truncate max-w-full">
            Liste
          </span>
        </button>

        {/* Tab 4: Settings */}
        <button
          id="mobile-nav-settings"
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-colors min-h-[48px] active:scale-95 ${
            activeTab === 'settings'
              ? 'text-teal-800 font-semibold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <div
            className={`flex items-center justify-center w-12 h-7 rounded-full transition-colors ${
              activeTab === 'settings' ? 'bg-teal-100 text-teal-800' : ''
            }`}
          >
            <Settings className="w-5 h-5" />
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight truncate max-w-full">
            Réglages
          </span>
        </button>
      </div>
    </nav>
  );
};
