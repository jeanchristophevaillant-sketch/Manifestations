import React from 'react';
import {
  Radar,
  RotateCw,
  Calendar,
  MapPin,
  Compass,
  Database,
  Sparkles,
  Settings,
  Trash2,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  isScanning: boolean;
  onTriggerScan: () => void;
  onOpenSettingsModal?: () => void;
  onOpenPurgeModal?: () => void;
  lastScanTimestamp: string | null;
  totalEventsCount: number;
  newEventsCount: number;
  activeTab: 'report' | 'timeline' | 'all' | 'settings';
  setActiveTab: (tab: 'report' | 'timeline' | 'all' | 'settings') => void;
  activeDisciplinesSummary?: string;
}

export const Header: React.FC<HeaderProps> = ({
  isScanning,
  onTriggerScan,
  onOpenSettingsModal,
  onOpenPurgeModal,
  lastScanTimestamp,
  totalEventsCount,
  newEventsCount,
  activeTab,
  setActiveTab,
  activeDisciplinesSummary = 'Multi-disciplines',
}) => {
  const formatLastScan = (iso: string | null) => {
    if (!iso) return 'Jamais';
    const date = new Date(iso);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-900 sticky top-0 z-40 shadow-xs pt-[env(safe-area-inset-top)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Top App Bar Row — Compact on Android mobile (single row <= 64px), full on desktop */}
        <div className="flex items-center justify-between py-2.5 sm:py-3.5 gap-2 sm:gap-4">
          {/* Brand & Concise Context */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
              <Radar className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 truncate">
                  Veille Manifestations
                </h1>
                <span className="hidden md:inline-block text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-medium whitespace-nowrap">
                  Horizon 6 mois
                </span>
                <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold tabular-nums whitespace-nowrap">
                  {totalEventsCount}
                  <span className="hidden sm:inline"> en base</span>
                </span>
              </div>
              <p className="hidden sm:flex text-xs text-slate-500 items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-teal-700 font-medium truncate max-w-[260px]">
                  {activeDisciplinesSummary}
                </span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <MapPin className="w-3 h-3 text-teal-600" /> Occitanie & France
                </span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1 text-emerald-700 whitespace-nowrap">
                  <Database className="w-3 h-3" /> Base locale
                </span>
              </p>
              <p className="sm:hidden text-[11px] text-slate-500 truncate">
                Occitanie & France · {activeDisciplinesSummary}
              </p>
            </div>
          </div>

          {/* Actions — >= 40-44px touch targets on Android */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <div className="text-right hidden lg:block mr-1">
              <div className="text-[11px] text-slate-500">Dernière mise à jour</div>
              <div className="text-xs font-semibold text-slate-800 tabular-nums">
                {formatLastScan(lastScanTimestamp)}
              </div>
            </div>

            <PWAInstallButton compact />

            {onOpenPurgeModal && (
              <button
                id="header-purge-results-btn"
                type="button"
                onClick={onOpenPurgeModal}
                className="flex items-center justify-center gap-1.5 min-h-[40px] min-w-[40px] sm:min-w-0 sm:px-3 sm:py-2 rounded-xl text-sm font-medium bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 transition-all active:scale-95"
                title="Purger les manifestations enregistrées dans la base locale"
                aria-label="Purger la base"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span className="hidden md:inline">Purger</span>
              </button>
            )}

            <button
              id="header-open-settings-btn"
              type="button"
              onClick={() => {
                if (onOpenSettingsModal) {
                  onOpenSettingsModal();
                } else {
                  setActiveTab('settings');
                }
              }}
              className="flex items-center justify-center gap-1.5 min-h-[40px] min-w-[40px] sm:min-w-0 sm:px-3.5 sm:py-2 rounded-xl text-sm font-medium bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200 transition-all active:scale-95"
              title="Modifier mes paramètres de veille"
              aria-label="Paramètres"
            >
              <Settings className="w-4 h-4 text-teal-700" />
              <span className="hidden sm:inline">Paramètres</span>
            </button>

            <button
              id="header-trigger-scan-btn"
              type="button"
              onClick={onTriggerScan}
              disabled={isScanning}
              className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                isScanning
                  ? 'bg-teal-50 text-teal-800 cursor-wait border border-teal-200'
                  : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm active:scale-95'
              }`}
            >
              <RotateCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Veille en cours...' : 'Lancer la veille'}</span>
            </button>
          </div>
        </div>

        {/* Desktop Tab Navigation (Hidden on mobile where Android-style Bottom Navigation takes over) */}
        <nav
          aria-label="Navigation principale"
          className="hidden sm:flex space-x-1 border-t border-slate-100 pt-1 overflow-x-auto no-scrollbar"
        >
          <button
            id="tab-btn-report"
            type="button"
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'report'
                ? 'border-teal-600 text-teal-800 bg-teal-50/60 font-semibold rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
            }`}
          >
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span>Rapport Hebdomadaire</span>
            {newEventsCount > 0 && (
              <span className="ml-1 text-xs px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 border border-teal-200 font-semibold tabular-nums">
                {newEventsCount} new
              </span>
            )}
          </button>

          <button
            id="tab-btn-timeline"
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'timeline'
                ? 'border-teal-600 text-teal-800 bg-teal-50/60 font-semibold rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
            }`}
          >
            <Calendar className="w-4 h-4 text-teal-600" />
            <span>Calendrier 6 Mois</span>
            <span className="text-xs text-slate-400 font-normal">
              (Granularité fine)
            </span>
          </button>

          <button
            id="tab-btn-all"
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'all'
                ? 'border-teal-600 text-teal-800 bg-teal-50/60 font-semibold rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
            }`}
          >
            <Compass className="w-4 h-4 text-teal-600" />
            <span>Toutes les Manifestations</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold tabular-nums">
              {totalEventsCount}
            </span>
          </button>

          <button
            id="tab-btn-settings"
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'settings'
                ? 'border-teal-600 text-teal-800 bg-teal-50/60 font-semibold rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
            }`}
          >
            <Settings className="w-4 h-4 text-teal-600" />
            <span>Paramètres de Veille & Stockage</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
