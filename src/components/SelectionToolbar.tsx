import React, { useState, useEffect, useRef } from 'react';
import { Search, Type, Highlighter, X } from 'lucide-react';

interface SelectionState {
  text: string;
  rect: DOMRect | null;
  range: Range | null;
}

export default function SelectionToolbar() {
  const [selection, setSelection] = useState<SelectionState>({ text: '', rect: null, range: null });
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // 延迟获取选区，确保双击选词等操作已经完成
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) {
          setSelection({ text: '', rect: null, range: null });
          return;
        }

        const text = sel.toString().trim();
        if (!text) {
          setSelection({ text: '', rect: null, range: null });
          return;
        }

        // 检查点击是否在 toolbar 内部，如果是，不隐藏
        if (toolbarRef.current && toolbarRef.current.contains(e.target as Node)) {
          return;
        }

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        setSelection({ text, rect, range });
      }, 10);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (toolbarRef.current && toolbarRef.current.contains(e.target as Node)) {
        return;
      }
      setSelection({ text: '', rect: null, range: null });
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  if (!selection.text || !selection.rect) return null;

  const handleLookup = () => {
    const word = encodeURIComponent(selection.text);
    // 使用有道词典
    window.open(`https://dict.youdao.com/result?word=${word}&lang=en`, '_blank', 'width=800,height=600');
    window.getSelection()?.removeAllRanges();
    setSelection({ text: '', rect: null, range: null });
  };

  const handleTranslate = () => {
    const text = encodeURIComponent(selection.text);
    // 使用百度翻译或 DeepL
    window.open(`https://fanyi.baidu.com/#en/zh/${text}`, '_blank', 'width=1000,height=700');
    window.getSelection()?.removeAllRanges();
    setSelection({ text: '', rect: null, range: null });
  };

  const handleHighlight = () => {
    try {
      if (selection.range && !selection.range.collapsed) {
        const mark = document.createElement('mark');
        mark.style.backgroundColor = '#fef08a'; // Tailwind yellow-200
        mark.style.borderRadius = '2px';
        mark.style.padding = '2px 0';
        selection.range.surroundContents(mark);
      }
    } catch (e) {
      console.warn('Highlighting across multiple nodes is not fully supported natively.', e);
    }
    window.getSelection()?.removeAllRanges();
    setSelection({ text: '', rect: null, range: null });
  };

  const top = selection.rect.top + window.scrollY - 45;
  const left = selection.rect.left + window.scrollX + (selection.rect.width / 2);

  return (
    <div
      ref={toolbarRef}
      style={{
        position: 'absolute',
        top: Math.max(0, top) + 'px',
        left: left + 'px',
        transform: 'translateX(-50%)',
        backgroundColor: '#1e293b',
        color: '#fff',
        padding: '6px 8px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 9999,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateX(-50%) translateY(10px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
          }
          .toolbar-btn {
            background: transparent;
            border: none;
            color: #f8fafc;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            transition: background 0.15s;
          }
          .toolbar-btn:hover {
            background: #334155;
          }
          .toolbar-divider {
            width: 1px;
            height: 16px;
            background: #475569;
          }
        `}
      </style>
      <button className="toolbar-btn" onClick={handleLookup} title="查词 (单次词汇)">
        <Search size={14} /> 查词
      </button>
      <div className="toolbar-divider" />
      <button className="toolbar-btn" onClick={handleTranslate} title="翻译 (长句或段落)">
        <Type size={14} /> 翻译
      </button>
      <div className="toolbar-divider" />
      <button className="toolbar-btn" onClick={handleHighlight} title="高亮文本">
        <Highlighter size={14} /> 高亮
      </button>
    </div>
  );
}
