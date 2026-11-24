import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <aside 
      aria-label="Mode hors-ligne actif"
      className="fixed bottom-20 sm:bottom-4 left-3 right-3 sm:left-4 sm:right-auto sm:max-w-md z-50 flex items-center gap-2.5 rounded-xl bg-amber-600/95 text-white px-3.5 py-2.5 shadow-xl backdrop-blur-md border border-amber-400/40 text-xs font-medium animate-in slide-in-from-bottom duration-200"
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
      </span>
      <WifiOff className="w-4 h-4 shrink-0 text-amber-200" />
      <div className="flex-1">
        <span className="font-semibold">Mode hors-ligne :</span> Vos manifestations enregistrées restent consultables dans la base locale.
      </div>
    </aside>
  );
};
