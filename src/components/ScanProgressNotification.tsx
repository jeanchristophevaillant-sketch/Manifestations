import React from 'react';
import { Radar, CheckCircle2, X, ShieldAlert, Sparkles } from 'lucide-react';

interface ScanProgressNotificationProps {
  isScanning: boolean;
  scanResultToast: {
    visible: boolean;
    message: string;
    newCount: number;
    duplicatesCount: number;
  } | null;
  onDismiss: () => void;
}

export const ScanProgressNotification: React.FC<ScanProgressNotificationProps> = ({
  isScanning,
  scanResultToast,
  onDismiss,
}) => {
  if (isScanning) {
    return (
      <div className="fixed bottom-20 sm:bottom-5 left-3 right-3 sm:left-auto sm:right-5 z-50 bg-white/95 backdrop-blur-md text-slate-900 px-4 py-3 rounded-2xl shadow-lg border border-teal-200 flex items-center gap-3 animate-fade-in sm:max-w-md">
        <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
          <Radar className="w-5 h-5 animate-spin" />
        </div>
        <div className="text-xs space-y-0.5">
          <div className="font-bold text-teal-800">Veille en cours en tâche de fond...</div>
          <div className="text-slate-600">
            Recherche sur Google, offices de tourisme, FFVoile, FFC et sites spécialisés (Occitanie & France).
          </div>
        </div>
      </div>
    );
  }

  if (scanResultToast && scanResultToast.visible) {
    return (
      <div className="fixed bottom-20 sm:bottom-5 left-3 right-3 sm:left-auto sm:right-5 z-50 bg-white/95 backdrop-blur-md text-slate-900 px-4 py-3 rounded-2xl shadow-lg border border-slate-200 flex items-center gap-3 animate-fade-in sm:max-w-md">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="text-xs space-y-0.5 flex-1">
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Rapport de veille mis à jour</span>
          </div>
          <div className="text-slate-600">
            <strong className="text-slate-900">+{scanResultToast.newCount}</strong> nouvelle(s) manifestation(s) •{' '}
            <strong className="text-slate-900">{scanResultToast.duplicatesCount}</strong> doublon(s) évité(s).
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="min-w-[40px] min-h-[40px] flex items-center justify-center p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          aria-label="Fermer la notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return null;
};
