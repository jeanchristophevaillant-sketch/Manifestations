import React, { useState, useEffect } from 'react';
import { ManifestationEvent } from '../types';
import { getThematicIllustration, isValidRemoteImageUrl } from '../utils/eventImages';

interface EventVisualProps {
  event: ManifestationEvent;
  variant?: 'card' | 'modal';
  className?: string;
}

/**
 * Renders the visual banner for a manifestation:
 * 1. Displays the official promotional image extracted from the source website when valid.
 * 2. Seamlessly falls back to a bespoke thematic illustration if no promo image exists or if loading fails.
 */
export const EventVisual: React.FC<EventVisualProps> = ({
  event,
  variant = 'card',
  className = '',
}) => {
  const hasPromoImage = isValidRemoteImageUrl(event.imageUrl);
  const [promoFailed, setPromoFailed] = useState(false);

  useEffect(() => {
    setPromoFailed(false);
  }, [event.id, event.imageUrl]);

  const thematic = getThematicIllustration(event);
  const showPromo = hasPromoImage && !promoFailed;
  const imgSrc = showPromo ? (event.imageUrl as string) : thematic.src;
  const imgAlt = showPromo ? event.title : `${event.title} — ${thematic.alt}`;
  const isWikimediaPhoto =
    showPromo && /wikimedia\.org|wikipedia\.org/i.test(event.imageUrl || '');

  return (
    <div
      className={`relative overflow-hidden bg-slate-100 ${
        variant === 'modal' ? 'aspect-[16/9] max-h-64 w-full rounded-2xl border border-slate-200' : 'aspect-[16/9] w-full'
      } ${className}`}
    >
      <img
        src={imgSrc}
        alt={imgAlt}
        loading={variant === 'modal' ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={(e) => {
          if (showPromo) {
            const img = e.currentTarget;
            if (img.naturalWidth > 0 && (img.naturalWidth < 120 || img.naturalHeight < 80)) {
              setPromoFailed(true);
            }
          }
        }}
        onError={() => {
          if (showPromo) {
            setPromoFailed(true);
          }
        }}
        className={`w-full h-full object-cover ${
          variant === 'card'
            ? 'transition-transform duration-300 ease-out group-hover:scale-[1.03]'
            : ''
        }`}
      />

      {/* Subtle bottom contrast edge + unobtrusive visual provenance indicator in modal */}
      {variant === 'modal' && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 via-slate-950/25 to-transparent px-3.5 py-2.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-white/95 tracking-wide">
            {showPromo
              ? (isWikimediaPhoto ? 'Photographie du lieu de la manifestation' : 'Visuel issu du site de l’événement')
              : `Illustration thématique · ${thematic.themeLabel}`}
          </span>
        </div>
      )}
    </div>
  );
};
