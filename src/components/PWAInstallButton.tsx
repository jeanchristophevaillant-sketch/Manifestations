import React, { useState } from 'react';
import { Download, Smartphone, X, Share, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, isInIframe, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // If already installed as standalone PWA on mobile or desktop, do not show install prompt
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // Fallback guide if browser does not fire beforeinstallprompt yet
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <button
        id="pwa-install-action-btn"
        type="button"
        onClick={handleInstallClick}
        aria-label="Installer l'application sur votre smartphone ou ordinateur"
        className={
          className ||
          (compact
            ? 'flex items-center gap-1.5 px-2.5 py-2 min-h-[40px] sm:min-h-0 rounded-xl text-xs font-semibold bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 transition-all active:scale-95 whitespace-nowrap shrink-0'
            : 'flex items-center gap-2 px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all active:scale-95 whitespace-nowrap shrink-0')
        }
        title="Installer l'application WebApp sur votre écran d'accueil"
      >
        <Download className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span className={compact ? 'hidden sm:inline' : ''}>{compact ? 'Installer' : "Installer l'app"}</span>
      </button>

      {/* Mobile Installation Guide Modal */}
      {showIOSModal && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
          onClick={() => setShowIOSModal(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6 shadow-2xl text-slate-900 border border-slate-200 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Android Bottom Sheet Drag Handle */}
            <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" aria-hidden="true" />

            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="ios-install-title" className="text-base font-bold text-slate-900">
                    Installer l'application Chrome
                  </h3>
                  <p className="text-xs text-slate-500">
                    Application web progressive (PWA)
                  </p>
                </div>
              </div>
              <button
                id="close-ios-guide-btn"
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 rounded-xl sm:rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-600">
              <p className="text-xs leading-relaxed">
                Cette application s'installe directement comme une vraie application Android/Desktop (mode plein écran, icône dédiée, fonctionnement hors-ligne).
              </p>

              {isInIframe && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                  <strong>Note aperçu intégré :</strong> Chrome bloque l'installation PWA tant que la page est ouverte dans un cadre intégré. Ouvrez l'URL de l'application dans un onglet Chrome indépendant pour déclencher l'installation native.
                </div>
              )}

              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">
                      Sur Android (Chrome) :
                    </span>
                    <p className="text-xs text-slate-600 mt-1">
                      Appuyez sur le menu <strong>⋮</strong> en haut à droite puis sélectionnez <strong>« Ajouter à l'écran d'accueil » → « Installer »</strong> (ou sur l'icône d'installation dans la barre d'adresse sur ordinateur).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2 border-t border-slate-200/70">
                  <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">
                      Sur iPhone / iPad (Safari) :
                    </span>
                    <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5 flex-wrap">
                      Touchez l'icône de partage <Share className="w-3.5 h-3.5 text-teal-600 inline" /> puis <PlusSquare className="w-3.5 h-3.5 text-teal-600 inline" /> <span className="font-medium text-slate-800">« Sur l'écran d'accueil »</span>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full min-h-[46px] rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white hover:bg-teal-700 active:scale-98 transition shadow-sm"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </>
  );
};
