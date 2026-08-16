import React, { useState, useRef } from 'react';
import { 
  Download, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  FileText, 
  X, 
  Database, 
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  wordStatuses: Record<string, 'familiar' | 'unfamiliar' | 'unknown'>;
  onImportData: (data: any, mode: 'merge' | 'overwrite') => boolean;
  onClearData: () => void;
  theme?: 'dark' | 'light';
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({
  isOpen,
  onClose,
  wordStatuses,
  onImportData,
  onClearData,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  if (!isOpen) return null;

  // Calculate current statistics
  let familiarCount = 0;
  let unfamiliarCount = 0;
  let unknownCount = 0;
  Object.values(wordStatuses).forEach(s => {
    if (s === 'familiar') familiarCount++;
    else if (s === 'unfamiliar') unfamiliarCount++;
    else unknownCount++;
  });

  const getFullBackupPayload = () => {
    const quizHistoryRaw = localStorage.getItem('kaoyan_quiz_history') || localStorage.getItem('kaoyan_quiz_records') || '{}';
    let quizHistory = {};
    try {
      quizHistory = JSON.parse(quizHistoryRaw);
    } catch {}

    const ebbinghausRaw = localStorage.getItem('kaoyan_ebbinghaus_records') || '{}';
    let ebbinghausRecords = {};
    try {
      ebbinghausRecords = JSON.parse(ebbinghausRaw);
    } catch {}

    return {
      appName: '考研英语一真题库',
      version: '1.0.0',
      exportTime: new Date().toISOString(),
      stats: {
        familiarCount,
        unfamiliarCount,
        totalMarkedWords: familiarCount + unfamiliarCount,
      },
      data: {
        wordStatuses,
        ebbinghausRecords,
        quizHistory,
        theme: localStorage.getItem('kaoyan_theme') || 'dark',
      }
    };
  };

  // Export JSON file
  const handleExportFile = () => {
    const payload = getFullBackupPayload();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `kaoyan_english_study_data_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Copy JSON to clipboard
  const handleCopyJson = () => {
    const payload = getFullBackupPayload();
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        
        const success = onImportData(parsed, 'merge');
        if (success) {
          setImportMessage({
            type: 'success',
            text: `🎉 成功导入学习数据！已同步更新生词本与做题记录。`,
          });
        } else {
          setImportMessage({
            type: 'error',
            text: '导入失败：文件格式不符合考研学习数据规范。',
          });
        }
      } catch (err) {
        setImportMessage({
          type: 'error',
          text: '文件解析失败：请确保上传的是合法的 JSON 格式备份文件。',
        });
      }
    };
    reader.readAsText(file);
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className={`rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border transition-colors flex flex-col ${
        isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
      }`}>
        {/* Header */}
        <div className={`p-5 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-850' : 'border-gray-100 bg-slate-50/70'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-500 flex items-center justify-center border border-blue-500/30">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                学习数据管理
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                支持多端备份、导入导出与生词本进度同步
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Current Data Overview */}
          <div className={`p-4 rounded-xl border ${
            isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isDark ? 'text-slate-400' : 'text-gray-500'
              }`}>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                当前本地学习数据统计
              </span>
              <span className={`text-xs font-mono font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                共标 {familiarCount + unfamiliarCount} 词
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className={`p-2.5 rounded-lg border ${
                isDark ? 'bg-emerald-950/40 border-emerald-800/60' : 'bg-emerald-50 border-emerald-200'
              }`}>
                <div className={`text-xs font-medium ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>熟词掌握</div>
                <div className={`text-lg font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{familiarCount}</div>
              </div>

              <div className={`p-2.5 rounded-lg border ${
                isDark ? 'bg-rose-950/40 border-rose-800/60' : 'bg-rose-50 border-rose-200'
              }`}>
                <div className={`text-xs font-medium ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>生词重点</div>
                <div className={`text-lg font-black ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{unfamiliarCount}</div>
              </div>

              <div className={`p-2.5 rounded-lg border ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
              }`}>
                <div className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>存储介质</div>
                <div className={`text-xs font-bold mt-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>本地离线</div>
              </div>
            </div>
          </div>

          {/* Notification Message */}
          {importMessage && (
            <div className={`p-3.5 rounded-xl border flex items-center gap-2 text-xs font-bold animate-fade-in ${
              importMessage.type === 'success'
                ? isDark ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : isDark ? 'bg-rose-950/80 border-rose-700 text-rose-200' : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}>
              {importMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              )}
              <span>{importMessage.text}</span>
            </div>
          )}

          {/* Action Cards: Export & Import */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Export Card */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              isDark ? 'bg-slate-850 border-slate-750' : 'bg-white border-gray-200 shadow-xs'
            }`}>
              <div>
                <div className="flex items-center gap-2 mb-1.5 font-bold text-sm">
                  <Download className="w-4 h-4 text-blue-500" />
                  <span>导出学习备份</span>
                </div>
                <p className={`text-xs mb-4 leading-relaxed ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  将您的熟词、生词标记及做题进度导出为标准 JSON 备份文件。
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleExportFile}
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  下载备份文件 (.json)
                </button>

                <button
                  onClick={handleCopyJson}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold border transition flex items-center justify-center gap-1.5 ${
                    isDark 
                      ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700' 
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500">已复制数据至剪贴板</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>复制 JSON 数据文本</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Import Card */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              isDark ? 'bg-slate-850 border-slate-750' : 'bg-white border-gray-200 shadow-xs'
            }`}>
              <div>
                <div className="flex items-center gap-2 mb-1.5 font-bold text-sm">
                  <Upload className="w-4 h-4 text-indigo-500" />
                  <span>导入学习数据</span>
                </div>
                <p className={`text-xs mb-4 leading-relaxed ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  从之前导出的备份文件恢复您的生词本与刷题记录。
                </p>
              </div>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json,application/json"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  选择并导入备份文件
                </button>
              </div>
            </div>
          </div>

          {/* Reset / Clear Data & Close */}
          <div className={`pt-4 border-t flex items-center justify-between ${
            isDark ? 'border-slate-800' : 'border-gray-200'
          }`}>
            {!showConfirmClear ? (
              <>
                <button
                  onClick={() => setShowConfirmClear(true)}
                  className={`text-xs font-semibold flex items-center gap-1.5 transition ${
                    isDark ? 'text-rose-400 hover:text-rose-300' : 'text-rose-600 hover:text-rose-700'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  清空本地学习数据
                </button>

                <button
                  onClick={onClose}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition ${
                    isDark ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  完成
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3 animate-fade-in w-full justify-between">
                <span className="text-xs font-bold text-rose-500 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> 确认清空所有生词和做题记录？
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onClearData();
                      setShowConfirmClear(false);
                      setImportMessage({
                        type: 'success',
                        text: '已成功重置所有本地学习数据。',
                      });
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-700 active:scale-95 transition shadow-sm"
                  >
                    确认清空
                  </button>
                  <button
                    onClick={() => setShowConfirmClear(false)}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition ${
                      isDark ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
