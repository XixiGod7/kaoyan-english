import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  PenTool, 
  Sparkles, 
  Send, 
  Clock, 
  RotateCcw, 
  Copy, 
  CheckCheck, 
  FileText, 
  Image as ImageIcon, 
  Check, 
  Loader2, 
  BookOpen, 
  HelpCircle,
  AlertCircle,
  Award,
  ChevronDown,
  ChevronUp,
  Maximize2
} from 'lucide-react';
import { loadAiConfig } from '../utils/aiConfigStorage';
import { gradeWritingEssay, sendChatCompletion, extractScoreFromMarkdown } from '../utils/aiClient';
import { MarkdownRenderer } from './MarkdownRenderer';
import { FontSizeLevel, FONT_SIZE_CONFIGS } from '../utils/fontSize';

interface EssayItem {
  key: string;
  year: number;
  part: 'A' | 'B';
  points: number;
  wordReq: string;
  title: string | null;
  image: string | null;
  directions: string;
  hasModel?: boolean;
}

interface EssayGradingViewProps {
  theme?: 'dark' | 'light';
  fontSizeLevel?: FontSizeLevel;
}

export const EssayGradingView: React.FC<EssayGradingViewProps> = ({
  theme = 'dark',
  fontSizeLevel = 'base',
}) => {
  const isDark = theme === 'dark';
  const fontConfig = FONT_SIZE_CONFIGS[fontSizeLevel];
  const [essays, setEssays] = useState<EssayItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected year and part
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedPart, setSelectedPart] = useState<'A' | 'B'>('B');

  // User input text
  const [userEssay, setUserEssay] = useState<string>('');
  // Timer state
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // AI Grading states
  const [isGrading, setIsGrading] = useState<boolean>(false);
  const [gradingReport, setGradingReport] = useState<string>('');
  const [gradingScore, setGradingScore] = useState<number | null>(null);
  const [isReportFolded, setIsReportFolded] = useState<boolean>(false);

  // AI Model Essay states
  const [isGeneratingModel, setIsGeneratingModel] = useState<boolean>(false);
  const [modelEssay, setModelEssay] = useState<string>('');
  const [showModel, setShowModel] = useState<boolean>(false);

  // Copied toast
  const [copied, setCopied] = useState<boolean>(false);
  // Image zoom modal
  const [isImageZoomed, setIsImageZoomed] = useState<boolean>(false);

  // 1. Fetch essay prompts
  useEffect(() => {
    fetch('./data/essay/essays_all.json')
      .then(res => res.json())
      .then((data: EssayItem[]) => {
        setEssays(data);
        if (data.length > 0) {
          // Set to newest year
          setSelectedYear(data[0].year);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load essay data:', err);
        setLoading(false);
      });
  }, []);

  // Current selected essay
  const currentEssay = useMemo(() => {
    return essays.find(e => e.year === selectedYear && e.part === selectedPart) || null;
  }, [essays, selectedYear, selectedPart]);

  // Load saved user essay from localStorage when currentEssay changes
  useEffect(() => {
    if (!currentEssay) return;
    try {
      const saved = localStorage.getItem(`kaoyan_essay_${currentEssay.key}`);
      setUserEssay(saved || '');
    } catch {
      setUserEssay('');
    }
    // reset AI report and model
    setGradingReport('');
    setGradingScore(null);
    setModelEssay('');
    setShowModel(false);
    setTimerSeconds(0);
    setIsTimerRunning(false);
  }, [currentEssay?.key]);

  // Auto-save user essay to localStorage
  const handleEssayChange = (val: string) => {
    setUserEssay(val);
    if (currentEssay) {
      try {
        localStorage.setItem(`kaoyan_essay_${currentEssay.key}`, val);
      } catch {}
    }
  };

  // Timer tick
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Word count calculation
  const wordCount = useMemo(() => {
    if (!userEssay.trim()) return 0;
    const matches = userEssay.match(/[a-zA-Z0-9'-]+/g);
    return matches ? matches.length : 0;
  }, [userEssay]);

  // Word requirement check
  const wordCountStatus = useMemo(() => {
    if (selectedPart === 'A') {
      // 100 words requirement (approx 90 - 120)
      if (wordCount < 70) return { color: 'text-amber-500', text: '字数偏少 (建议 90-110 词)' };
      if (wordCount > 140) return { color: 'text-amber-500', text: '字数偏多 (建议 90-110 词)' };
      return { color: 'text-emerald-500', text: '字数达标 (约 100 词)' };
    } else {
      // 160-200 words requirement
      if (wordCount < 140) return { color: 'text-amber-500', text: '字数偏少 (要求 160-200 词)' };
      if (wordCount > 230) return { color: 'text-amber-500', text: '字数偏多 (要求 160-200 词)' };
      return { color: 'text-emerald-500', text: '字数达标 (160-200 词)' };
    }
  }, [selectedPart, wordCount]);

  // AI Grade Essay
  const handleGradeEssay = async () => {
    if (!currentEssay) return;
    if (!userEssay.trim()) {
      alert('请先在作答区域书写你的英语作文再发起批改！');
      return;
    }

    const config = loadAiConfig();
    setIsGrading(true);
    setGradingReport('');
    setGradingScore(null);

    try {
      const report = await gradeWritingEssay(
        config,
        {
          year: `${currentEssay.year}`,
          type: currentEssay.part === 'B' ? 'writing_essay' : 'writing_clinical',
          qid: currentEssay.part === 'B' ? 48 : 47,
          directions: currentEssay.directions,
          userEssay: userEssay.trim(),
        },
        (_chunk, full) => {
          setGradingReport(full);
          const score = extractScoreFromMarkdown(full, currentEssay.points);
          if (score !== undefined) setGradingScore(score);
        }
      );

      const finalScore = extractScoreFromMarkdown(report, currentEssay.points);
      if (finalScore !== undefined) setGradingScore(finalScore);
    } catch (err: any) {
      setGradingReport(`⚠️ 作文批改失败: ${err?.message || '请检查 AI 接口与配置'}`);
    } finally {
      setIsGrading(false);
    }
  };

  // AI Generate Model Essay
  const handleGenerateModelEssay = async () => {
    if (!currentEssay) return;
    const config = loadAiConfig();
    setIsGeneratingModel(true);
    setShowModel(true);
    setModelEssay('');

    try {
      const isPartB = currentEssay.part === 'B';
      const systemPrompt = `你是一位专注考研英语一写作阅卷的国家级专家。
请根据考生的试题要求，撰写一篇 100% 符合考研英语一阅卷满分档标准的【官方标杆级高分示范范文】。

【输出格式要求】：
1. 🌟 **【考研满分范文 (High-Score Model Essay)】**：词数严格控制在 ${isPartB ? '170-190' : '95-105'} 词左右。分段清晰（Part A 规范应用文格式，Part B 标准三段式：图画描述、寓意阐释、观点与举措）。
2. 📖 **【中文全真逐句精译】**：与英文逐句对应。
3. 💎 **【考研阅卷亮点词汇与短语】**：列出 4-6 个核心高分替换词与短语，并附带例句。
4. 🚀 **【万能提分句型模板】**：提炼 2-3 个考生可以直接套用在同类题材中的闪光句型。`;

      const userPrompt = `【真题试卷】：${currentEssay.year} 年考研英语一 Section III Part ${currentEssay.part}
【题目要求与说明】：
${currentEssay.directions}

请立即撰写专业、规范的考研满分示范范文！`;

      await sendChatCompletion(
        config,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        (_chunk, full) => {
          setModelEssay(full);
        }
      );
    } catch (err: any) {
      setModelEssay(`⚠️ 范文生成遇到问题: ${err?.message || '请检查 AI 接口与配置'}`);
    } finally {
      setIsGeneratingModel(false);
    }
  };

  // Copy report
  const handleCopyReport = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm">正在加载考研英语写作真题题库 (2001-2026)...</p>
      </div>
    );
  }

  // Available years
  const availableYears = Array.from(new Set(essays.map(e => e.year))).sort((a, b) => b - a);

  const getImageUrl = (img: string | null) => {
    if (!img) return '';
    if (img.startsWith('http') || img.startsWith('/') || img.startsWith('.')) return img;
    return `./images/writing/${img}`;
  };

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* Top Banner & Navigation */}
      <div className="mb-6 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PenTool className="w-5 h-5 text-indigo-500" />
              考研写作真题实战与 AI 智能批改
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              涵盖 2001-2026 年考研英语一 Section III 全部小作文 (Part A) 与大作文 (Part B)，搭载深度阅卷模型诊断
            </p>
          </div>

          {/* Year & Part selectors */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Year selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {availableYears.map(yr => (
                <option key={yr} value={yr}>{yr} 年真题</option>
              ))}
            </select>

            {/* Part switcher */}
            <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100 dark:bg-slate-800">
              <button
                onClick={() => setSelectedPart('A')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  selectedPart === 'A'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Part A 应用文 (10分)
              </button>
              <button
                onClick={() => setSelectedPart('B')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  selectedPart === 'B'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Part B 图画短文 (20分)
              </button>
            </div>
          </div>
        </div>
      </div>

      {currentEssay ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Prompt & Directions (5 Cols on large screens) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Prompt Box */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                    {currentEssay.year} Part {currentEssay.part}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    满分 {currentEssay.points} 分 · 建议约 {currentEssay.wordReq} 词
                  </span>
                </div>
                {currentEssay.title && (
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                    {currentEssay.title}
                  </span>
                )}
              </div>

              {/* Directions Text */}
              <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-sans mb-4">
                {currentEssay.directions}
              </div>

              {/* Part B Prompt Image if present */}
              {currentEssay.image && (
                <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 flex flex-col items-center">
                  <img 
                    src={getImageUrl(currentEssay.image)} 
                    alt={`${currentEssay.year} Part B 图画写作`}
                    className="max-h-64 object-contain rounded cursor-pointer transition-transform group-hover:scale-101"
                    onClick={() => setIsImageZoomed(true)}
                  />
                  <button
                    onClick={() => setIsImageZoomed(true)}
                    className="mt-2 text-[11px] text-slate-400 hover:text-indigo-500 flex items-center gap-1"
                  >
                    <Maximize2 className="w-3 h-3" />
                    点击放大查看原图
                  </button>
                </div>
              )}

              {/* Action: High-score model essay trigger */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => {
                    if (!showModel && !modelEssay) {
                      handleGenerateModelEssay();
                    } else {
                      setShowModel(!showModel);
                    }
                  }}
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {showModel ? '收起高分范文解析' : '查看/生成考研高分范文'}
                </button>
                {modelEssay && (
                  <button
                    onClick={() => handleCopyReport(modelEssay)}
                    className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1"
                  >
                    {copied ? <CheckCheck className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    复制范文
                  </button>
                )}
              </div>

              {/* Collapsible Model Essay Area */}
              {showModel && (
                <div className="mt-3 p-4 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-slate-800 dark:text-slate-200 leading-relaxed animate-in fade-in duration-200">
                  {isGeneratingModel ? (
                    <div className="flex items-center gap-2 py-4 justify-center text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      AI 考研名师正在构建满分范文及闪光句型...
                    </div>
                  ) : (
                    <MarkdownRenderer content={modelEssay} isDark={isDark} />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Writing & AI Grading Area (7 Cols on large screens) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Writing Box */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5">
              {/* Box Header with Timer & Word Count */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  {/* Timer */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{formatTime(timerSeconds)}</span>
                    <button
                      onClick={() => setIsTimerRunning(!isTimerRunning)}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline ml-1"
                    >
                      {isTimerRunning ? '暂停' : '开始计时'}
                    </button>
                    {timerSeconds > 0 && (
                      <button
                        onClick={() => {
                          setIsTimerRunning(false);
                          setTimerSeconds(0);
                        }}
                        className="text-[11px] text-slate-400 hover:text-slate-600 ml-1"
                      >
                        重置
                      </button>
                    )}
                  </div>

                  {/* Word Count Indicator */}
                  <div className="text-xs">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 mr-1">
                      {wordCount} 词
                    </span>
                    <span className={`text-[11px] ${wordCountStatus.color}`}>
                      ({wordCountStatus.text})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (window.confirm('确定清空当前写作草稿吗？')) {
                        handleEssayChange('');
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="清空重写"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Textarea */}
              <textarea
                rows={14}
                value={userEssay}
                onChange={(e) => handleEssayChange(e.target.value)}
                placeholder={`在此输入你的英文作文（如：Dear Paul, ... / As is vividly depicted in the cartoon, ...）\n\n提示：\n• Part A 格式：称呼、首段表明写作意图、正文分条阐述、末段客套、落款 (Li Ming)\n• Part B 格式：第一段简要描述图画、第二段阐述深层寓意、第三段给出具体建议与总结`}
                className="w-full text-sm font-serif leading-relaxed p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y transition-colors"
              />

              {/* Bottom Action Row */}
              <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
                <span className="text-[11px] text-slate-400">
                  ⚡ 作文实时自动保存在本地，断网或刷新不丢失
                </span>

                <button
                  type="button"
                  disabled={isGrading || !userEssay.trim()}
                  onClick={handleGradeEssay}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all hover:scale-102 active:scale-98 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isGrading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      AI 考研阅卷组深度批阅中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      AI 老师智能批改打分
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* AI Grading Report Box */}
            {gradingReport && (
              <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-white dark:bg-slate-900 shadow-sm p-5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-500" />
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      考研写作大纲评分诊断报告
                    </span>
                    {gradingScore !== null && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-600 text-white">
                        {gradingScore} / {currentEssay.points} 分
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsReportFolded(!isReportFolded)}
                      className="text-xs flex items-center gap-1 text-slate-400 hover:text-indigo-500 transition-colors"
                    >
                      {isReportFolded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      <span>{isReportFolded ? '展开报告' : '收起报告'}</span>
                    </button>
                    {!isReportFolded && (
                      <button
                        type="button"
                        onClick={() => handleCopyReport(gradingReport)}
                        className="text-xs flex items-center gap-1 text-slate-400 hover:text-indigo-500 transition-colors"
                      >
                        {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? '已复制' : '复制诊断报告'}
                      </button>
                    )}
                  </div>
                </div>

                {!isReportFolded && (
                  <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                    <MarkdownRenderer content={gradingReport} isDark={isDark} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Image Zoom Modal */}
      {isImageZoomed && currentEssay?.image && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsImageZoomed(false)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl p-4 overflow-hidden">
            <img 
              src={getImageUrl(currentEssay.image)} 
              alt="真题大图"
              className="max-w-full max-h-[80vh] object-contain mx-auto"
            />
            <p className="text-center text-xs text-slate-500 mt-2">
              点击任意位置关闭原图
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
