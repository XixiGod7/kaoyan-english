import React, { useState, useEffect } from 'react';
import { 
  Languages, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Send, 
  Check, 
  BookOpen, 
  Bookmark, 
  Volume2, 
  Loader2, 
  Layers, 
  FileText,
  Copy,
  CheckCheck
} from 'lucide-react';
import { PassageSentence } from '../types/reading';
import { loadAiConfig } from '../utils/aiConfigStorage';
import { gradeTranslationSentence } from '../utils/aiClient';
import { isSentenceFavorited, saveFavoriteSentence, removeFavoriteSentence } from '../utils/readingStorage';
import { MarkdownRenderer } from './MarkdownRenderer';
import { FontSizeLevel, FONT_SIZE_CONFIGS } from '../utils/fontSize';

interface TranslationPracticeViewProps {
  theme?: 'dark' | 'light';
  fontSizeLevel?: FontSizeLevel;
  onNavigateToReading?: (passKey: string) => void;
}

interface YearTransGroup {
  year: number;
  tasks: Array<{ no: number; sid: string; key: string }>;
}

export const TranslationPracticeView: React.FC<TranslationPracticeViewProps> = ({
  theme = 'dark',
  fontSizeLevel = 'base',
}) => {
  const isDark = theme === 'dark';
  const fontConfig = FONT_SIZE_CONFIGS[fontSizeLevel];
  const [transIndex, setTransIndex] = useState<YearTransGroup[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [passageContent, setPassageContent] = useState<string>('');
  const [showFullPassage, setShowFullPassage] = useState<boolean>(false);
  const [sentences, setSentences] = useState<PassageSentence[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // User input translations per question number (e.g. { 46: "...", 47: "..." })
  const [userTranslations, setUserTranslations] = useState<Record<number, string>>(() => {
    try {
      const saved = localStorage.getItem(`kaoyan_trans_${selectedYear}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // AI reviews per question number
  const [aiReviews, setAiReviews] = useState<Record<number, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<number, boolean>>({});
  const [aiFolded, setAiFolded] = useState<Record<number, boolean>>({});

  // Revealed reference per question number
  const [revealedRef, setRevealedRef] = useState<Record<number, boolean>>({});
  // Expanded syntax tree per question number
  const [expandedTree, setExpandedTree] = useState<Record<number, boolean>>({});
  // Favorited states
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  // 1. Load index
  useEffect(() => {
    fetch('./data/translation/translation_all.json')
      .then(res => res.json())
      .then((data: YearTransGroup[]) => {
        setTransIndex(data);
        if (data.length > 0 && !data.some(d => d.year === selectedYear)) {
          setSelectedYear(data[0].year);
        }
      })
      .catch(err => console.error('Failed to load translation index:', err));
  }, []);

  // 2. Load details and passage content for selectedYear
  useEffect(() => {
    async function loadYearData() {
      setLoading(true);
      try {
        // Load details (sentences with trunk/components)
        const dRes = await fetch(`./data/translation/details/${selectedYear}-t5.json`);
        if (dRes.ok) {
          const dJson = await dRes.json();
          setSentences(dJson.sentences || []);
          // init favorites
          const favMap: Record<string, boolean> = {};
          (dJson.sentences || []).forEach((s: PassageSentence) => {
            favMap[s.sid] = isSentenceFavorited(s.sid);
          });
          setFavorites(favMap);
        } else {
          setSentences([]);
        }

        // Load passage text
        const pRes = await fetch(`./data/translation/passages/${selectedYear}.json`);
        if (pRes.ok) {
          const pJson = await pRes.json();
          setPassageContent(pJson.content || '');
        } else {
          setPassageContent('');
        }

        // Load user saved translations for this year
        try {
          const saved = localStorage.getItem(`kaoyan_trans_${selectedYear}`);
          setUserTranslations(saved ? JSON.parse(saved) : {});
        } catch {
          setUserTranslations({});
        }
        setAiReviews({});
        setRevealedRef({});
        setExpandedTree({});
      } catch (err) {
        console.error('Failed to load year translation data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadYearData();
  }, [selectedYear]);

  const handleTranslationChange = (qNum: number, val: string) => {
    const updated = { ...userTranslations, [qNum]: val };
    setUserTranslations(updated);
    try {
      localStorage.setItem(`kaoyan_trans_${selectedYear}`, JSON.stringify(updated));
    } catch {}
  };

  const handleSpeak = (text: string) => {
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-US';
      utter.rate = 0.9;
      window.speechSynthesis.speak(utter);
    } catch {}
  };

  const handleToggleFav = (sentence: PassageSentence) => {
    const isFav = favorites[sentence.sid];
    if (isFav) {
      removeFavoriteSentence(sentence.sid);
      setFavorites(prev => ({ ...prev, [sentence.sid]: false }));
    } else {
      saveFavoriteSentence({
        sid: sentence.sid,
        s: sentence.s,
        zh: sentence.zh,
        trunk: sentence.trunk,
        components: sentence.components,
        year: selectedYear,
        text_no: 5,
        addedAt: Date.now()
      });
      setFavorites(prev => ({ ...prev, [sentence.sid]: true }));
    }
  };

  const handleGradeWithAi = async (qNum: number, sentence: PassageSentence) => {
    const userTrans = userTranslations[qNum] || '';
    if (!userTrans.trim()) {
      alert('请先输入您的中文译文再让 AI 老师点评！');
      return;
    }

    setAiLoading(prev => ({ ...prev, [qNum]: true }));
    try {
      const config = loadAiConfig();
      if (config.provider === 'sensenova' && (!config.model || config.model === 'deepseek-chat')) {
        config.model = 'deepseek-v4-flash';
      }

      await gradeTranslationSentence(
        config,
        {
          year: String(selectedYear),
          qNum,
          sentenceEn: sentence.s,
          userTranslation: userTrans,
          standardTranslation: sentence.zh,
        },
        (chunk, fullText) => {
          setAiReviews(prev => ({ ...prev, [qNum]: fullText }));
        }
      );
    } catch (err: any) {
      setAiReviews(prev => ({
        ...prev,
        [qNum]: `⚠️ AI 评阅失败: ${err?.message || '请检查 AI 接口设置'}`
      }));
    } finally {
      setAiLoading(prev => ({ ...prev, [qNum]: false }));
    }
  };

  const currentYearGroup = transIndex.find(g => g.year === selectedYear);
  const tasks = currentYearGroup?.tasks || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Banner & Year Picker */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Languages className="w-5 h-5 text-blue-500" />
                考研英语一 · 历年翻译真题 (Part C)
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                {selectedYear} 年
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              先独立把长难句译成中文，再点击「AI 老师点评」打分（满分 2.0 分），对照参考译文与句法拆解自查。
            </p>
          </div>

          {/* Year Pills Quick Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {transIndex.map(g => (
                <option key={g.year} value={g.year}>
                  {g.year} 年真题翻译 (5题)
                </option>
              ))}
            </select>

            {passageContent && (
              <button
                type="button"
                onClick={() => setShowFullPassage(!showFullPassage)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                <span>{showFullPassage ? '收起原文' : '查看篇章原文'}</span>
                {showFullPassage ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Full Passage View */}
        {showFullPassage && passageContent && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-2 select-text font-serif">
            <div className="flex items-center justify-between text-xs font-sans font-bold text-blue-600 dark:text-blue-400 border-b border-slate-200 dark:border-slate-700 pb-2">
              <span>📄 {selectedYear} 年 Part C 阅读篇章全文 (划线标注处即为下方 5 道翻译题)</span>
            </div>
            <div className="whitespace-pre-wrap pt-2">
              {passageContent}
            </div>
          </div>
        )}
      </div>

      {/* 5 Translation Sentences */}
      <div className="space-y-6">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-xs">正在载入 {selectedYear} 年翻译真题与拆解...</span>
          </div>
        ) : sentences.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            暂未找到该年份题目数据
          </div>
        ) : (
          sentences.map((sent, idx) => {
            const qNum = tasks[idx]?.no || 46 + idx;
            const userTrans = userTranslations[qNum] || '';
            const aiReview = aiReviews[qNum];
            const isAiGrading = aiLoading[qNum];
            const isRefRevealed = revealedRef[qNum];
            const isTreeExpanded = expandedTree[qNum];
            const isFav = favorites[sent.sid];

            return (
              <div
                key={sent.sid || idx}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 transition-all"
              >
                {/* Sentence Header */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      ({qNum})
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      第 {qNum} 题 · 英译汉 (2.0 分)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSpeak(sent.s)}
                      title="朗读原句"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleFav(sent)}
                      title={isFav ? '从难句本移除' : '收入难句本'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isFav
                          ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/50'
                          : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* English Text */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className={`${fontConfig.passageText} font-serif leading-relaxed text-slate-900 dark:text-slate-100 select-text`}>
                    {sent.s}
                  </p>
                </div>

                {/* User Translation Input Area */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    ✍️ 我的翻译作答：
                  </label>
                  <textarea
                    value={userTrans}
                    onChange={e => handleTranslationChange(qNum, e.target.value)}
                    placeholder="在此输入您的中文译文（先独立尝试翻译，再点击「AI 点评」或揭晓参考译文）..."
                    rows={3}
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                  />

                  {/* Actions under textarea */}
                  <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleGradeWithAi(qNum, sent)}
                        disabled={isAiGrading || !userTrans.trim()}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        {isAiGrading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        <span>{isAiGrading ? 'AI 阅卷中...' : 'AI 老师点评打分'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRevealedRef(prev => ({ ...prev, [qNum]: !prev[qNum] }))}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium transition-colors"
                      >
                        {isRefRevealed ? '隐藏参考译文' : '对照参考译文'}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedTree(prev => ({ ...prev, [qNum]: !prev[qNum] }))}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{isTreeExpanded ? '折叠语法树拆解' : '展开语法树拆解'}</span>
                    </button>
                  </div>
                </div>

                {/* AI Review Output */}
                {(isAiGrading || aiReview) && (
                  <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 text-xs space-y-2 select-text leading-relaxed animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-blue-200/60 dark:border-blue-800 pb-2">
                      <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                        AI 老师专业评分诊断报告 (满分 2.0 分)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAiFolded(prev => ({ ...prev, [qNum]: !prev[qNum] }))}
                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                        >
                          {aiFolded[qNum] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                          <span>{aiFolded[qNum] ? '展开报告' : '收起报告'}</span>
                        </button>
                        {aiReview && !aiFolded[qNum] && (
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(aiReview)}
                            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            <span>复制报告</span>
                          </button>
                        )}
                      </div>
                    </div>
                    {!aiFolded[qNum] && (
                      <div className="font-sans text-slate-800 dark:text-slate-200 pt-1">
                        {isAiGrading && !aiReview ? (
                          <div className="flex items-center gap-2 text-slate-400 py-3">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                            <span>AI 老师正在根据考研大纲评分细则分析您的译文采分点与失分原因...</span>
                          </div>
                        ) : (
                          <MarkdownRenderer content={aiReview || ''} isDark={isDark} />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Official Reference Translation */}
                {isRefRevealed && (
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 leading-relaxed space-y-1 select-text">
                    <div className="font-bold text-xs text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                      官方标准参考译文：
                    </div>
                    <p>{sent.zh}</p>
                  </div>
                )}

                {/* Syntax Tree Breakdown */}
                {isTreeExpanded && (
                  <div className="p-4 rounded-xl border border-indigo-200/60 dark:border-indigo-800/40 bg-indigo-50/20 dark:bg-indigo-950/15 space-y-3 text-xs">
                    <div className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>句子核心主干提取 (Trunk)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {sent.trunk?.['主语'] && (
                        <div className="bg-white/90 dark:bg-slate-800 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                          <span className="block font-bold text-sky-600 dark:text-sky-400 mb-1">主语 (Subject)</span>
                          <span className="font-serif text-slate-800 dark:text-slate-200">{sent.trunk['主语']}</span>
                        </div>
                      )}
                      {sent.trunk?.['谓语'] && (
                        <div className="bg-white/90 dark:bg-slate-800 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                          <span className="block font-bold text-rose-600 dark:text-rose-400 mb-1">谓语 (Predicate)</span>
                          <span className="font-serif text-slate-800 dark:text-slate-200">{sent.trunk['谓语']}</span>
                        </div>
                      )}
                      {sent.trunk?.['宾语或表语'] && (
                        <div className="bg-white/90 dark:bg-slate-800 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                          <span className="block font-bold text-emerald-600 dark:text-emerald-400 mb-1">宾语/表语 (Object)</span>
                          <span className="font-serif text-slate-800 dark:text-slate-200">{sent.trunk['宾语或表语']}</span>
                        </div>
                      )}
                    </div>

                    {sent.trunk?.['主干翻译'] && (
                      <div className="text-xs text-indigo-950 dark:text-indigo-200/90 font-medium bg-indigo-100/50 dark:bg-indigo-900/40 px-3 py-1.5 rounded-lg">
                        <span className="font-bold mr-1">主干译意：</span>
                        {sent.trunk['主干翻译']}
                      </div>
                    )}

                    {sent.components && sent.components.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
                        <div className="font-bold text-slate-600 dark:text-slate-400">
                          修饰与从属成分拆解 ({sent.components.length})
                        </div>
                        {sent.components.map((c, cIdx) => (
                          <div key={cIdx} className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                {c['成分类型']}
                              </span>
                              {c['修饰对象'] && (
                                <span className="text-slate-500 dark:text-slate-400">
                                  修饰 → <code className="text-indigo-600 dark:text-indigo-400">{c['修饰对象']}</code>
                                </span>
                              )}
                            </div>
                            <div className="font-serif text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 p-1.5 rounded">
                              {c['原文']}
                            </div>
                            <div className="text-slate-600 dark:text-slate-300">
                              <span className="font-semibold">译：</span>{c['中文翻译']}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
