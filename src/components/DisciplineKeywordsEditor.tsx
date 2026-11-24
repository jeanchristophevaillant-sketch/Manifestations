import React, { useState, useEffect } from 'react';
import { InterestItem } from '../types';
import { Tag, Plus, X, Info } from 'lucide-react';
import { DISCIPLINE_CATEGORIES } from '../utils/categories';

interface DisciplineKeywordsEditorProps {
  interests: InterestItem[];
  onUpdateKeywords: (interestId: string, nextKeywords: string[]) => void;
  selectedInterestId?: string | null;
  onSelectInterestId?: (id: string) => void;
  compact?: boolean;
}

export const DisciplineKeywordsEditor: React.FC<DisciplineKeywordsEditorProps> = ({
  interests,
  onUpdateKeywords,
  selectedInterestId,
  onSelectInterestId,
  compact = false,
}) => {
  const [internalSelectedId, setInternalSelectedId] = useState<string>(
    selectedInterestId || interests[0]?.id || ''
  );
  const [keywordInput, setKeywordInput] = useState('');

  useEffect(() => {
    if (selectedInterestId && interests.some((i) => i.id === selectedInterestId)) {
      setInternalSelectedId(selectedInterestId);
    } else if (!interests.some((i) => i.id === internalSelectedId) && interests.length > 0) {
      setInternalSelectedId(interests[0].id);
    }
  }, [selectedInterestId, interests, internalSelectedId]);

  const activeId = selectedInterestId && interests.some((i) => i.id === selectedInterestId)
    ? selectedInterestId
    : internalSelectedId;

  const selectedInterest = interests.find((i) => i.id === activeId) || interests[0];

  if (!selectedInterest) return null;

  const handleSelect = (id: string) => {
    setInternalSelectedId(id);
    onSelectInterestId?.(id);
    setKeywordInput('');
  };

  const handleAddKeywords = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = keywordInput
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length > 0);
    if (parts.length === 0) return;

    const existing = selectedInterest.keywords || [];
    const existingLower = new Set(existing.map((k) => k.toLowerCase()));
    const additions = parts.filter((k) => !existingLower.has(k));
    if (additions.length === 0) {
      setKeywordInput('');
      return;
    }

    onUpdateKeywords(selectedInterest.id, [...existing, ...additions]);
    setKeywordInput('');
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    const next = (selectedInterest.keywords || []).filter((k) => k !== kwToRemove);
    onUpdateKeywords(selectedInterest.id, next);
  };

  const sortedInterests = [...interests].sort((a, b) => {
    const idxA = DISCIPLINE_CATEGORIES.indexOf((a.category || 'Autre') as any);
    const idxB = DISCIPLINE_CATEGORIES.indexOf((b.category || 'Autre') as any);
    const catDiff = (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    if (catDiff !== 0) return catDiff;
    return a.name.localeCompare(b.name, 'fr');
  });

  return (
    <div
      className={`rounded-xl border border-indigo-200 bg-indigo-50/45 ${
        compact ? 'p-3 space-y-2.5' : 'p-4 space-y-3'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
          <Tag className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>Mots-clés associés aux rubriques</span>
        </div>
        <span className="text-[11px] text-indigo-700 font-medium">
          {(selectedInterest.keywords || []).length} mot{(selectedInterest.keywords || []).length > 1 ? 's' : ''}-clé{(selectedInterest.keywords || []).length > 1 ? 's' : ''} sur « {selectedInterest.name} »
        </span>
      </div>

      <div className="flex items-start gap-2 text-[11px] text-slate-600 bg-white/85 border border-indigo-100 rounded-lg px-2.5 py-2 leading-relaxed">
        <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
        <span>
          Ces mots-clés servent au moteur pour interroger OpenAgenda, filtrer les manifestations détectées et calculer leur score de pertinence.
        </span>
      </div>

      {/* Discipline Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <label
          htmlFor={compact ? 'kw-discipline-select-modal' : 'kw-discipline-select-view'}
          className="text-xs font-semibold text-slate-700 shrink-0"
        >
          Rubrique :
        </label>
        <select
          id={compact ? 'kw-discipline-select-modal' : 'kw-discipline-select-view'}
          value={selectedInterest.id}
          onChange={(e) => handleSelect(e.target.value)}
          className="flex-1 min-h-[38px] text-xs bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
        >
          {sortedInterests.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.category}) — {(item.keywords || []).length} mot{(item.keywords || []).length > 1 ? 's' : ''}-clé{(item.keywords || []).length > 1 ? 's' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Existing Keywords List */}
      <div className="flex flex-wrap gap-1.5">
        {(selectedInterest.keywords || []).length === 0 ? (
          <span className="text-xs text-slate-500 italic">
            Aucun mot-clé enregistré pour cette rubrique. Ajoutez-en ci-dessous.
          </span>
        ) : (
          (selectedInterest.keywords || []).map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-white border border-indigo-200 text-xs font-semibold text-indigo-950 shadow-2xs"
            >
              <span>{kw}</span>
              <button
                type="button"
                onClick={() => handleRemoveKeyword(kw)}
                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title={`Supprimer le mot-clé « ${kw} »`}
                aria-label={`Supprimer le mot-clé ${kw}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
      </div>

      {/* Add Keyword Form */}
      <form onSubmit={handleAddKeywords} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          placeholder="Ajouter un mot-clé (ou plusieurs séparés par des virgules)..."
          className="flex-1 min-h-[38px] text-xs bg-white border border-indigo-200 rounded-lg px-3 py-1.5 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={!keywordInput.trim()}
          className="min-h-[38px] px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Ajouter mot-clé</span>
        </button>
      </form>
    </div>
  );
};
