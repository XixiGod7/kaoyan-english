import React, { useState, useEffect, useRef } from 'react';
import { Volume2, CheckCircle2, AlertTriangle, HelpCircle, ExternalLink, X, Sparkles } from 'lucide-react';
import { KaoyanDict, DictEntry, WordFreqItem } from '../types/kaoyan';

interface WordLookupPopoverProps {
  dict: KaoyanDict | null;
  wordStatuses?: Record<string, 'familiar' | 'unfamiliar' | 'unknown'>;
  onToggleStatus?: (word: string, status: 'familiar' | 'unfamiliar' | 'unknown') => void;
  onOpenWordDetail?: (item: WordFreqItem) => void;
  theme?: 'dark' | 'light';
  containerRef?: React.RefObject<HTMLElement>;
}

interface PopoverState {
  visible: boolean;
  word: string;
  matchedLemma: string;
  entry: DictEntry;
  paperCount: number;
  totalCount: number;
  x: number;
  y: number;
  placement: 'top' | 'bottom';
}

// Lemmatization rules to resolve inflections back to base dictionary forms
export function resolveLemma(rawWord: string, entries: Record<string, DictEntry>): { lemma: string; entry: DictEntry } | null {
  const w = rawWord.toLowerCase().trim().replace(/^[^a-z]+|[^a-z]+$/g, '');
  if (!w || w.length < 2) return null;

  // 1. Direct exact match
  if (entries[w]) return { lemma: w, entry: entries[w] };

  const candidates: string[] = [];

  // 2. Plurals / 3rd person '-s', '-es', '-ies'
  if (w.endsWith('ies') && w.length > 3) candidates.push(w.slice(0, -3) + 'y');
  if (w.endsWith('es') && w.length > 3) candidates.push(w.slice(0, -2));
  if (w.endsWith('s') && w.length > 2) candidates.push(w.slice(0, -1));

  // 3. Past tense / past participle '-ed', '-ied'
  if (w.endsWith('ied') && w.length > 3) candidates.push(w.slice(0, -3) + 'y');
  if (w.endsWith('ed') && w.length > 3) {
    candidates.push(w.slice(0, -2)); // walked -> walk
    candidates.push(w.slice(0, -1)); // decided -> decide (drop 'd')
    // Double consonant: stopped -> stop
    if (w.length > 4 && w[w.length - 3] === w[w.length - 4]) {
      candidates.push(w.slice(0, -3));
    }
  }

  // 4. Continuous '-ing'
  if (w.endsWith('ing') && w.length > 4) {
    candidates.push(w.slice(0, -3)); // studying -> study (or working -> work)
    candidates.push(w.slice(0, -3) + 'e'); // making -> make
    if (w.length > 5 && w[w.length - 4] === w[w.length - 5]) {
      candidates.push(w.slice(0, -4)); // running -> run
    }
  }

  // 5. Adverbs '-ly', '-ily'
  if (w.endsWith('ily') && w.length > 4) candidates.push(w.slice(0, -3) + 'y'); // happily -> happy
  if (w.endsWith('ly') && w.length > 3) candidates.push(w.slice(0, -2)); // quickly -> quick

  // 6. Comparative / Superlative '-er', '-est', '-ier', '-iest'
  if (w.endsWith('ier') && w.length > 4) candidates.push(w.slice(0, -3) + 'y');
  if (w.endsWith('iest') && w.length > 5) candidates.push(w.slice(0, -4) + 'y');
  if (w.endsWith('er') && w.length > 3) {
    candidates.push(w.slice(0, -2));
    candidates.push(w.slice(0, -1));
  }
  if (w.endsWith('est') && w.length > 4) {
    candidates.push(w.slice(0, -3));
    candidates.push(w.slice(0, -2));
  }

  for (const cand of candidates) {
    if (entries[cand]) {
      return { lemma: cand, entry: entries[cand] };
    }
  }

  return null;
}

export const WordLookupPopover: React.FC<WordLookupPopoverProps> = ({
  dict,
  wordStatuses = {},
  onToggleStatus,
  onOpenWordDetail,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Play audio voice
  const handlePlayAudio = (e: React.MouseEvent, word: string) => {
    e.stopPropagation();
    if (!word) return;
    setIsPlayingAudio(true);
    const audio = new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`);
    audio.play().catch(err => console.log('Audio playback error:', err));
    audio.onended = () => setIsPlayingAudio(false);
    audio.onerror = () => setIsPlayingAudio(false);
  };

  useEffect(() => {
    if (!dict || !dict.entries) return;

    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        return;
      }

      const text = selection.toString().trim();
      // Only process words between 2 and 35 chars without line breaks
      if (!text || text.length < 2 || text.length > 35 || /\r|\n/.test(text)) {
        return;
      }

      const clean = text.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');
      if (!clean) return;

      const res = resolveLemma(clean, dict.entries);
      if (!res) return;

      const { lemma, entry } = res;
      const sentenceIds = entry.sentence_ids || [];
      const taskIds = entry.task_ids || [];
      const totalCount = sentenceIds.length || 1;
      const paperCount = taskIds.length || Math.min(totalCount, 28);

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Check if rect is visible
      if (rect.width === 0 && rect.height === 0) return;

      const popoverWidth = 320;
      const popoverHeight = 220;

      let x = rect.left + rect.width / 2;
      let y = rect.top - 12;
      let placement: 'top' | 'bottom' = 'top';

      // Keep within horizontal screen bounds
      if (x - popoverWidth / 2 < 12) {
        x = popoverWidth / 2 + 12;
      } else if (x + popoverWidth / 2 > window.innerWidth - 12) {
        x = window.innerWidth - popoverWidth / 2 - 12;
      }

      // If too close to viewport top, show below selection
      if (rect.top < popoverHeight + 20) {
        y = rect.bottom + 12;
        placement = 'bottom';
      }

      setPopover({
        visible: true,
        word: clean,
        matchedLemma: lemma,
        entry,
        paperCount,
        totalCount,
        x,
        y,
        placement,
      });
    };

    const handleDocumentMouseDown = (e: MouseEvent) => {
      // If clicking inside the popover, don't close it
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
        return;
      }
      setPopover(null);
    };

    // Listen to mouseup on document to capture selection
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('mousedown', handleDocumentMouseDown);

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('mousedown', handleDocumentMouseDown);
    };
  }, [dict]);

  if (!popover || !popover.visible) return null;

  const currentStatus = wordStatuses[popover.matchedLemma] || wordStatuses[popover.word.toLowerCase()] || 'unknown';
  const isExamKey = popover.entry.is_kaoyan_key || (popover.entry.sentence_ids && popover.entry.sentence_ids.length > 0);

  // Format definitions
  let defs = popover.entry.definition_cn || '';
  const defLines = defs.split('\n').map(l => l.trim()).filter(Boolean);

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        left: `${popover.x}px`,
        top: `${popover.y}px`,
        transform: popover.placement === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
        zIndex: 99999,
      }}
      className={`w-80 max-w-[90vw] rounded-2xl p-4 shadow-2xl border backdrop-blur-xl animate-scale-in select-text transition-all ${
        isDark
          ? 'bg-slate-900/95 border-slate-700/80 text-slate-100 ring-1 ring-white/10'
          : 'bg-white/95 border-gray-200/90 text-gray-900 ring-1 ring-black/5'
      }`}
    >
      {/* Popover Header */}
      <div className="flex items-start justify-between gap-2 border-b pb-2.5 mb-2.5 border-slate-700/50">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {popover.matchedLemma}
            </span>
            {popover.word.toLowerCase() !== popover.matchedLemma && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono">
                原形
              </span>
            )}
            <button
              onClick={(e) => handlePlayAudio(e, popover.matchedLemma)}
              className={`p-1 rounded-full hover:scale-110 active:scale-95 transition-all ${
                isPlayingAudio 
                  ? 'bg-blue-500 text-white animate-pulse' 
                  : isDark ? 'text-blue-400 hover:bg-slate-800' : 'text-blue-600 hover:bg-blue-50'
              }`}
              title="发音朗读"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-1">
            {popover.entry.phonetic && (
              <span className={`text-xs font-mono font-semibold ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                /{popover.entry.phonetic}/
              </span>
            )}
            {isExamKey ? (
              <span className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" />
                考频: {popover.paperCount}篇/{popover.totalCount}次
              </span>
            ) : (
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'
              }`}>
                大纲扩展词
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setPopover(null)}
          className={`p-1 rounded-lg transition-colors ${
            isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Chinese Definitions */}
      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 mb-3 scrollbar-thin">
        {defLines.length > 0 ? (
          defLines.map((line, i) => (
            <p key={i} className={`text-xs leading-relaxed ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
              {line}
            </p>
          ))
        ) : (
          <p className="text-xs text-gray-400 italic">暂无释义</p>
        )}
      </div>

      {/* Status Badges & Action Bar */}
      <div className={`pt-2.5 border-t flex items-center justify-between gap-1.5 ${
        isDark ? 'border-slate-800' : 'border-gray-100'
      }`}>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleStatus && onToggleStatus(popover.matchedLemma, 'familiar')}
            className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-all flex items-center gap-1 ${
              currentStatus === 'familiar'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : isDark ? 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-emerald-950/40' : 'bg-gray-50 text-emerald-600 border-gray-200 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            熟词
          </button>

          <button
            onClick={() => onToggleStatus && onToggleStatus(popover.matchedLemma, 'unfamiliar')}
            className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-all flex items-center gap-1 ${
              currentStatus === 'unfamiliar'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : isDark ? 'bg-slate-800 text-rose-400 border-slate-700 hover:bg-rose-950/40' : 'bg-gray-50 text-rose-600 border-gray-200 hover:bg-rose-50'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            生词
          </button>
        </div>

        {onOpenWordDetail && isExamKey && (
          <button
            onClick={() => {
              onOpenWordDetail({
                word: popover.matchedLemma,
                entry: popover.entry,
                paperCount: popover.paperCount,
                totalCount: popover.totalCount,
                status: currentStatus,
              });
              setPopover(null);
            }}
            className="px-2 py-1 rounded-md text-[11px] font-bold text-blue-400 hover:text-blue-300 bg-blue-950/60 hover:bg-blue-900 border border-blue-800/80 transition-all flex items-center gap-1"
          >
            <span>真题例句</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
