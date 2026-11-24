import React from 'react';
import { Trash2, AlertTriangle, X, RefreshCw, Database } from 'lucide-react';

interface PurgeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventsCount?: number;
  totalEventsCount?: number;
  isScanning?: boolean;
  onPurgeAndRescan: () => void;
  onPurgeOnly: () => void;
}

export const PurgeConfirmationModal: React.FC<PurgeConfirmationModalProps> = ({
  isOpen,
  onClose,
  eventsCount,
  totalEventsCount,
  isScanning = false,
  onPurgeAndRescan,
  onPurgeOnly,
}) => {
  if (!isOpen) return null;

  const displayCount = eventsCount ?? totalEventsCount ?? 0;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="purge-modal-dialog"
        className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6 shadow-2xl border border-slate-200 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Android Bottom Sheet Drag Handle */}
        <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto sm:hidden" aria-hidden="true" />

        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <Trash2 className="w-6 h-6" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center text-slate-400 hover:text-slate-600 p-2 rounded-xl sm:rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Purger les manifestations enregistrées ?
          </h3>
          <p className="text-sm text-slate-600 mt-2">
            Votre base locale contient actuellement <strong className="text-slate-800">{displayCount} manifestations</strong>.
          </p>
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              La purge efface tous les événements préalablement mémorisés dans votre navigateur. Vos disciplines et vos sites cibles configurés sont conservés.
            </span>
          </div>
        </div>

        <div className="space-y-2.5 pt-1">
          <button
            id="btn-purge-and-rescan"
            type="button"
            disabled={isScanning}
            onClick={() => {
              onClose();
              onPurgeAndRescan();
            }}
            className="w-full min-h-[46px] flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-medium text-sm transition-all shadow-sm active:scale-98"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            <span>Purger et relancer une veille immédiate</span>
          </button>

          <button
            id="btn-purge-only"
            type="button"
            onClick={() => {
              onClose();
              onPurgeOnly();
            }}
            className="w-full min-h-[46px] flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-medium text-sm transition-all active:scale-98"
          >
            <Trash2 className="w-4 h-4" />
            <span>Purger uniquement (vider la base)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] py-2.5 rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 text-sm font-medium transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};
