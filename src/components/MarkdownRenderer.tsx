import React, { useState } from 'react';
import { Copy, CheckCheck, Sparkles, AlertCircle, Info, CheckCircle2, ChevronRight } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isDark?: boolean;
  stripThinking?: boolean;
}

export function cleanAiThinking(raw: string): string {
  if (!raw) return '';
  // 1. Strip complete <think>...</think>
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // 2. Strip unclosed <think>... if streaming is ongoing
  cleaned = cleaned.replace(/<think>[\s\S]*$/gi, '');
  // 3. Strip quote-style thinking indicators
  cleaned = cleaned.replace(/^>\s*💭\s*\*\*AI.*?\*\*.*?\n\n/gi, '');
  return cleaned.trim();
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
  isDark,
  stripThinking = true
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const displayContent = stripThinking ? cleanAiThinking(content) : content;

  if (!displayContent) {
    return null;
  }

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper to render inline markdown styles
  const renderInline = (text: string): React.ReactNode => {
    // Regex matches: bold (**text**), inline code (`code`), italic (*text*)
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong key={pIdx} className="font-bold text-slate-900 dark:text-slate-100 mx-0.5">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <code
            key={pIdx}
            className="px-1.5 py-0.5 mx-0.5 rounded font-mono text-[11px] bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200/80 dark:border-slate-700/80"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
        return (
          <em key={pIdx} className="italic text-slate-700 dark:text-slate-300">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  // Block parser: processes lines into blocks (paragraphs, lists, blockquotes, tables, codeblocks)
  const lines = displayContent.split('\n');
  const elements: React.ReactNode[] = [];
  let lineIdx = 0;
  let elementKey = 0;

  while (lineIdx < lines.length) {
    const rawLine = lines[lineIdx];
    const trimmed = rawLine.trim();

    // Skip empty lines
    if (!trimmed) {
      lineIdx++;
      continue;
    }

    // 1. Code block ```
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      lineIdx++;
      while (lineIdx < lines.length && !lines[lineIdx].trim().startsWith('```')) {
        codeLines.push(lines[lineIdx]);
        lineIdx++;
      }
      if (lineIdx < lines.length) lineIdx++; // consume closing ```
      const fullCode = codeLines.join('\n');
      const curKey = elementKey++;
      elements.push(
        <div
          key={curKey}
          className="my-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 text-xs font-mono shadow-sm"
        >
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/70 border-b border-slate-800 text-[11px] text-slate-400">
            <span>{lang || 'code'}</span>
            <button
              type="button"
              onClick={() => handleCopyCode(fullCode, curKey)}
              className="flex items-center gap-1 hover:text-slate-200 transition-colors"
            >
              {copiedIndex === curKey ? (
                <CheckCheck className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              <span>{copiedIndex === curKey ? '已复制' : '复制'}</span>
            </button>
          </div>
          <pre className="p-3 overflow-x-auto leading-relaxed whitespace-pre font-mono">
            {fullCode}
          </pre>
        </div>
      );
      continue;
    }

    // 2. Table | ... |
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|')) {
      const tableLines: string[] = [];
      while (
        lineIdx < lines.length &&
        lines[lineIdx].trim().startsWith('|') &&
        lines[lineIdx].trim().endsWith('|')
      ) {
        tableLines.push(lines[lineIdx].trim());
        lineIdx++;
      }

      if (tableLines.length >= 2) {
        const headerRow = tableLines[0]
          .slice(1, -1)
          .split('|')
          .map(c => c.trim());
        const isSeparator = /^\|?(\s*:?-+:?\s*\|?)+$/.test(tableLines[1]);
        const bodyRows = (isSeparator ? tableLines.slice(2) : tableLines.slice(1)).map(r =>
          r.slice(1, -1).split('|').map(c => c.trim())
        );

        elements.push(
          <div key={elementKey++} className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                  {headerRow.map((h, i) => (
                    <th key={i} className="p-2.5 font-bold text-slate-800 dark:text-slate-200">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/60">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-2.5 text-slate-700 dark:text-slate-300">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 3. Headings #, ##, ###, ####
    if (/^#{1,4}\s/.test(trimmed)) {
      const match = trimmed.match(/^(#{1,4})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        const headingKey = elementKey++;

        if (level === 1) {
          elements.push(
            <h2 key={headingKey} className="text-base font-bold text-slate-900 dark:text-white mt-4 mb-2 pb-1 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>{renderInline(text)}</span>
            </h2>
          );
        } else if (level === 2) {
          elements.push(
            <h3 key={headingKey} className="text-sm font-bold text-indigo-700 dark:text-indigo-300 mt-3.5 mb-1.5 flex items-center gap-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
              <span>{renderInline(text)}</span>
            </h3>
          );
        } else if (level === 3) {
          elements.push(
            <h4 key={headingKey} className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-3 mb-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-0.5" />
              <span>{renderInline(text)}</span>
            </h4>
          );
        } else {
          elements.push(
            <h5 key={headingKey} className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-2.5 mb-1">
              {renderInline(text)}
            </h5>
          );
        }
        lineIdx++;
        continue;
      }
    }

    // 4. Blockquotes >
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (lineIdx < lines.length && lines[lineIdx].trim().startsWith('>')) {
        quoteLines.push(lines[lineIdx].trim().replace(/^>\s*/, ''));
        lineIdx++;
      }
      elements.push(
        <div
          key={elementKey++}
          className="my-2.5 p-3 rounded-xl border-l-4 border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-1"
        >
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx}>{renderInline(ql)}</p>
          ))}
        </div>
      );
      continue;
    }

    // 5. Unordered List (- , * )
    if (/^[-*]\s/.test(trimmed)) {
      const listItems: string[] = [];
      while (lineIdx < lines.length && /^[-*]\s/.test(lines[lineIdx].trim())) {
        listItems.push(lines[lineIdx].trim().replace(/^[-*]\s+/, ''));
        lineIdx++;
      }
      elements.push(
        <ul key={elementKey++} className="my-2 space-y-1 pl-2">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 dark:bg-purple-500 mt-1.5 shrink-0" />
              <div className="flex-1">{renderInline(item)}</div>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 6. Ordered List (1. , 2. )
    if (/^\d+\.\s/.test(trimmed)) {
      const listItems: { num: string; text: string }[] = [];
      while (lineIdx < lines.length && /^\d+\.\s/.test(lines[lineIdx].trim())) {
        const itemLine = lines[lineIdx].trim();
        const match = itemLine.match(/^(\d+)\.\s+(.*)$/);
        if (match) {
          listItems.push({ num: match[1], text: match[2] });
        }
        lineIdx++;
      }
      elements.push(
        <ol key={elementKey++} className="my-2 space-y-1.5 pl-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center justify-center mt-0.5 shrink-0">
                {item.num}
              </span>
              <div className="flex-1">{renderInline(item.text)}</div>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 7. Special Callout Box (lines starting with 【...】 or emojis like 💡 / ⚠️ / 🎯)
    if (/^(💡|⚠️|🎯|📌|✅|【)/.test(trimmed)) {
      elements.push(
        <div
          key={elementKey++}
          className="my-2 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 text-xs text-slate-800 dark:text-slate-200 leading-relaxed flex items-start gap-2"
        >
          <Info className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
          <div className="flex-1">{renderInline(trimmed)}</div>
        </div>
      );
      lineIdx++;
      continue;
    }

    // 8. Regular paragraph
    elements.push(
      <p key={elementKey++} className="my-1.5 text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {renderInline(trimmed)}
      </p>
    );
    lineIdx++;
  }

  return (
    <div className={`markdown-body space-y-1 select-text ${className}`}>
      {elements}
    </div>
  );
};

export default MarkdownRenderer;
