import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { YearPaperBundle, TaskBundleItem, TaskQuestion } from '../types/quizTask';
import { KaoyanDict, WordFreqItem } from '../types/kaoyan';
import { WordLookupPopover } from './WordLookupPopover';
import { saveQuizHistoryRecord } from '../utils/ebbinghaus';
import { loadQuizProgress, saveQuizProgress, clearQuizProgress, SavedQuizProgress } from '../utils/quizProgress';
import { 
  Home, 
  Clock, 
  ChevronLeft, 
  BookOpen, 
  CheckSquare, 
  Edit, 
  Edit3, 
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  FileText,
  RotateCcw,
  Sparkles,
  Award,
  ExternalLink,
  Maximize2,
  ZoomIn,
  ArrowRight,
  Save,
  PanelRightClose,
  PanelRightOpen,
  ChevronRight
} from 'lucide-react';

interface QuizModeProps {
  year: string;
  onBackToHome: () => void;
  initialTargetSentenceId?: number | null;
  initialTab?: string | null;
  initialSectionId?: number | null;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  dict?: KaoyanDict | null;
  wordStatuses?: Record<string, 'familiar' | 'unfamiliar' | 'unknown'>;
  onToggleWordStatus?: (word: string, status: 'familiar' | 'unfamiliar' | 'unknown') => void;
  onOpenWordModal?: (item: WordFreqItem) => void;
}

const TABS = [
  { id: 'cloze', label: '完形填空 (1-20)' },
  { id: 'reading_1', label: '阅读 Text 1 (21-25)' },
  { id: 'reading_2', label: '阅读 Text 2 (26-30)' },
  { id: 'reading_3', label: '阅读 Text 3 (31-35)' },
  { id: 'reading_4', label: '阅读 Text 4 (36-40)' },
  { id: 'matching', label: '新题型 (41-45)' },
  { id: 'translation', label: '翻译 (46-50)' },
  { id: 'writing_clinical', label: '小作文 (51)' },
  { id: 'writing_essay', label: '大作文 (52)' },
];

export default function QuizMode({ 
  year, 
  onBackToHome, 
  initialTargetSentenceId,
  initialTab,
  initialSectionId,
  theme = 'dark',
  onToggleTheme,
  dict,
  wordStatuses,
  onToggleWordStatus,
  onOpenWordModal,
}: QuizModeProps) {
  const isDark = theme === 'dark';
  const [paperData, setPaperData] = useState<YearPaperBundle | null>(null);
  const [loading, setLoading] = useState(true);

  // Collapsible Answer Sheet State
  const [isAnswerSheetOpen, setIsAnswerSheetOpen] = useState(true);

  // Persistent Progress Initial State
  const initialSavedProg = useMemo(() => loadQuizProgress(year), [year]);
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (initialTab) {
      return initialTab === 'reading' ? 'reading_1' : initialTab;
    }
    return initialSavedProg?.activeTab || 'cloze';
  });
  const [answers, setAnswers] = useState<Record<number, string>>(() => initialSavedProg?.answers || {});
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => initialSavedProg?.elapsedSeconds || 0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [highlightedSentenceId, setHighlightedSentenceId] = useState<number | null>(null);

  // Submission & Scoring State
  const [isSubmitted, setIsSubmitted] = useState<boolean>(() => initialSavedProg?.isSubmitted || false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Show restoration toast if restored non-empty progress on mount
  useEffect(() => {
    if (initialSavedProg && (Object.keys(initialSavedProg.answers || {}).length > 0 || initialSavedProg.elapsedSeconds > 0)) {
      const count = Object.keys(initialSavedProg.answers || {}).length;
      setToastMessage(`已自动恢复 ${year} 年做题进度（已作答 ${count} 题 · 计时 ${Math.floor(initialSavedProg.elapsedSeconds / 60)}分${initialSavedProg.elapsedSeconds % 60}秒）`);
      const timer = setTimeout(() => setToastMessage(null), 3800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Real-time Auto-save progress effect
  useEffect(() => {
    if (Object.keys(answers).length > 0 || elapsedSeconds > 0 || isSubmitted) {
      saveQuizProgress({
        year,
        answers,
        activeTab,
        elapsedSeconds,
        isSubmitted,
        lastUpdated: Date.now(),
      });
    }
  }, [year, answers, activeTab, elapsedSeconds, isSubmitted]);

  // Dictionary for Instant In-Passage Word Selection Popover
  const [localDict, setLocalDict] = useState<KaoyanDict | null>(dict || null);
  useEffect(() => {
    if (dict) {
      setLocalDict(dict);
      return;
    }
    fetch('./data/kaoyan1_dict.json')
      .then(res => res.json())
      .then(data => setLocalDict(data))
      .catch(err => console.error("Failed to load dictionary in QuizMode:", err));
  }, [dict]);

  useEffect(() => {
    fetch(`/data/papers/${year}.json`)
      .then(res => res.json())
      .then(data => {
        setPaperData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load paper", err);
        setLoading(false);
      });
  }, [year]);

  // Handle initial tab & section scrolling
  useEffect(() => {
    if (initialTab) {
      if (initialTab === 'reading') {
        setActiveTab('reading_1');
      } else {
        setActiveTab(initialTab);
      }
    }
    if (initialSectionId) {
      const idMod = initialSectionId % 1000;
      if (idMod === 2) setActiveTab('reading_1');
      else if (idMod === 3) setActiveTab('reading_2');
      else if (idMod === 4) setActiveTab('reading_3');
      else if (idMod === 5) setActiveTab('reading_4');
      
      const timer = setTimeout(() => {
        const el = document.getElementById(`task-section-${initialSectionId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [initialTab, initialSectionId]);

  // Handle jump to sentence from dictionary card
  useEffect(() => {
    if (!initialTargetSentenceId || !paperData) return;

    // Search which task contains this sentence
    let foundTab: string | null = null;
    for (const task of paperData.tasks) {
      const s = (task.detail.sentences || []).find((x: any) => Number(x.id) === Number(initialTargetSentenceId));
      if (s) {
        const cat = task.meta.category || '';
        const name = task.meta.chinese_name || '';
        if (cat === 'cloze') foundTab = 'cloze';
        else if (cat === 'reading' && !name.includes('新题型')) {
          const readingTasks = paperData.tasks.filter(t => t.meta.chinese_name.includes('阅读') && !t.meta.chinese_name.includes('新题型'));
          const rIdx = readingTasks.findIndex(t => t.meta.id === task.meta.id);
          foundTab = rIdx >= 0 ? `reading_${rIdx + 1}` : 'reading_1';
        }
        else if (cat === 'matching' || name.includes('新题型')) foundTab = 'matching';
        else if (cat === 'translation' || name.includes('翻译') || name.includes('英译汉')) foundTab = 'translation';
        else if (name.includes('小作文')) foundTab = 'writing_clinical';
        else if (name.includes('大作文')) foundTab = 'writing_essay';
        break;
      }
    }

    if (foundTab) {
      setActiveTab(foundTab);
    }
    setHighlightedSentenceId(Number(initialTargetSentenceId));

    // Scroll to sentence with multiple retries
    const attemptScroll = (retries = 0) => {
      const el = document.getElementById(`sentence-${initialTargetSentenceId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (retries < 5) {
        setTimeout(() => attemptScroll(retries + 1), 150);
      }
    };

    const timer = setTimeout(() => attemptScroll(0), 100);

    // Clear highlight after 7 seconds
    const clearTimer = setTimeout(() => {
      setHighlightedSentenceId(null);
    }, 7000);

    return () => {
      clearTimeout(timer);
      clearTimeout(clearTimer);
    };
  }, [initialTargetSentenceId, paperData]);

  // Timer
  useEffect(() => {
    if (isSubmitted) return;
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isSubmitted]);

  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (questionId: number, answer: string) => {
    if (isSubmitted) return;
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  // Score Calculation
  const scoreReport = useMemo(() => {
    if (!paperData) return null;

    let clozeCorrect = 0;
    let readingCorrect = 0;
    let matchingCorrect = 0;

    paperData.tasks.forEach(task => {
      const cat = task.meta.category || '';
      const name = task.meta.chinese_name || '';

      (task.detail.questions || []).forEach(q => {
        const qNum = q.id || q.qid;
        const userAns = answers[qNum];
        const correctAns = q.answer;
        if (userAns && correctAns && userAns.trim().toUpperCase() === correctAns.trim().toUpperCase()) {
          if (cat === 'cloze' || (qNum >= 1 && qNum <= 20)) {
            clozeCorrect++;
          } else if ((cat === 'reading' && !name.includes('新题型')) || (qNum >= 21 && qNum <= 40)) {
            readingCorrect++;
          } else if (cat === 'matching' || name.includes('新题型') || (qNum >= 41 && qNum <= 45)) {
            matchingCorrect++;
          }
        }
      });
    });

    const clozeScore = Number((clozeCorrect * 0.5).toFixed(1));
    const readingScore = readingCorrect * 2;
    const matchingScore = matchingCorrect * 2;
    const totalObjectiveScore = Number((clozeScore + readingScore + matchingScore).toFixed(1));
    const totalObjectiveCorrect = clozeCorrect + readingCorrect + matchingCorrect;
    const accuracy = Math.round((totalObjectiveCorrect / 45) * 100);

    return {
      clozeCorrect,
      clozeScore,
      readingCorrect,
      readingScore,
      matchingCorrect,
      matchingScore,
      totalObjectiveCorrect,
      totalObjectiveScore,
      accuracy,
      timeTaken: formatTime(elapsedSeconds)
    };
  }, [paperData, answers, elapsedSeconds]);

  const handleSubmit = () => {
    setIsSubmitted(true);
    setShowResultModal(true);

    // Save to persistent quiz history for study progress tracking
    try {
      saveQuizHistoryRecord({
        year,
        tabId: activeTab,
        sectionTitle: TABS.find(t => t.id === activeTab)?.label || '考研真题',
        score: scoreReport?.totalObjectiveScore || 0,
        totalQuestions: 45,
        correctQuestions: scoreReport?.totalObjectiveCorrect || 0,
        timestamp: Date.now(),
        timeSpentSeconds: elapsedSeconds,
        userAnswers: answers,
      });
    } catch (e) {
      console.error('Failed to save quiz record:', e);
    }
  };

  const handleClearProgress = () => {
    const ansCount = Object.keys(answers).length;
    const confirmMsg = ansCount > 0 || elapsedSeconds > 0
      ? `确定要清空 ${year} 年真题的全部做题进度吗？\n\n清空后将重置已填写的 ${ansCount} 道题目作答、翻译与作文内容、计时以及提交状态。`
      : `确定要重置当前试卷的做题进度吗？`;

    if (window.confirm(confirmMsg)) {
      clearQuizProgress(year);
      setAnswers({});
      setElapsedSeconds(0);
      setIsSubmitted(false);
      setShowResultModal(false);
      setToastMessage(`已清空 ${year} 年真题做题进度，可以重新开始作答！`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleRestart = () => {
    handleClearProgress();
  };

  const allQuestionsCount = 52;
  const answeredCount = Object.keys(answers).length;

  if (loading) return (
    <div className={`flex items-center justify-center h-screen font-bold ${
      isDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-50 text-slate-500'
    }`}>
      正在加载 {year} 年真题试卷...
    </div>
  );
  if (!paperData) return (
    <div className={`flex items-center justify-center h-screen ${
      isDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-50 text-slate-500'
    }`}>
      试卷加载失败
    </div>
  );

  // Render navigation bar
  const renderNavbar = () => (
    <div className={`px-4 h-14 flex items-center justify-between sticky top-0 z-50 shadow-sm flex-shrink-0 border-b transition-colors ${
      isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
    }`}>
      <div className="flex items-center gap-3">
        <button 
          onClick={onBackToHome} 
          className={`flex items-center text-sm font-medium transition-colors ${
            isDark ? 'text-slate-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'
          }`}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          返回真题矩阵
        </button>
        <div className={`font-bold text-sm px-3 py-1 rounded-full border shadow-sm ${
          isDark 
            ? 'bg-slate-800 border-slate-700 text-slate-200' 
            : 'bg-yellow-50 text-gray-700 border-yellow-200'
        }`}>
          {year}年全国硕士研究生招生考试英语一真题
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto max-w-[50vw] py-1 no-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400' 
                : isDark 
                ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2.5">
        {/* In-quiz Theme toggle */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                : 'bg-gray-100 hover:bg-gray-200 text-slate-700 border-gray-200'
            }`}
            title="切换浅色/深色主题"
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        )}

        {/* Realtime Auto-save Indicator Badge */}
        <div 
          className={`hidden lg:flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border ${
            isDark ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
          title="系统已开启实时自动保存，作答与计时进度即时存入本地，退出后随时可恢复"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>自动保存</span>
        </div>

        {/* Clear Progress Button */}
        <button
          id="clear-quiz-progress-btn"
          onClick={handleClearProgress}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1 shadow-xs ${
            isDark 
              ? 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-800/60' 
              : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
          }`}
          title="清空当前试卷的全部做题进度并重做"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">清空进度</span>
        </button>

        <div className={`flex items-center font-bold font-mono text-sm px-2.5 py-1 rounded-lg border ${
          isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-gray-50 border-gray-200 text-gray-700'
        }`}>
          <Clock className={`w-4 h-4 mr-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
          {formatTime(elapsedSeconds)}
        </div>

        {/* Interactive Collapsible Answer Sheet Toggle Button in Navbar */}
        <button
          id="toggle-answersheet-nav-btn"
          onClick={() => setIsAnswerSheetOpen(prev => !prev)}
          className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border transition-all shadow-xs ${
            isAnswerSheetOpen
              ? isDark 
                ? 'bg-indigo-950/60 border-indigo-700/60 text-indigo-300 hover:bg-indigo-900/60' 
                : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
              : isDark 
                ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
          }`}
          title={isAnswerSheetOpen ? '点击收起右侧答题卡' : '点击展开右侧答题卡'}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>答题卡 {answeredCount}/{allQuestionsCount}</span>
          {isAnswerSheetOpen ? (
            <PanelRightClose className="w-3.5 h-3.5 ml-0.5 opacity-75" />
          ) : (
            <PanelRightOpen className="w-3.5 h-3.5 ml-0.5 opacity-75 text-indigo-400" />
          )}
        </button>

        {isSubmitted ? (
          <button 
            onClick={() => setShowResultModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
          >
            <Award className="w-3.5 h-3.5" />
            成绩单 ({scoreReport?.totalObjectiveScore}/60分)
          </button>
        ) : (
          <button 
            onClick={handleSubmit}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
          >
            提交答案
          </button>
        )}
      </div>
    </div>
  );

  // Helper for sentence highlight
  const getSentenceClass = (sId: number) => {
    if (highlightedSentenceId === sId) {
      return "bg-yellow-200 text-yellow-950 ring-4 ring-yellow-400 font-bold px-1.5 py-0.5 rounded shadow-lg transition-all animate-pulse";
    }
    return "";
  };

  // Parse passage to render Cloze blanks with authentic continuous paragraph structure
  // Parse passage to render Cloze blanks with authentic continuous paragraph structure & exact blank offsets
  const parseClozePassage = (task: TaskBundleItem) => {
    const contentJson = task.detail.content_json || {};
    const sentences = task.detail.sentences || [];
    const questions = task.detail.questions || [];

    // Map sentence_id -> list of blanks
    const sentenceBlanksMap: Record<number, { num: number; start: number; end: number }[]> = {};
    for (let num = 1; num <= 20; num++) {
      const bInfo = contentJson[String(num)];
      if (!bInfo || !bInfo.replace || !bInfo.sentence_id) continue;
      const sId = Number(bInfo.sentence_id);
      if (!sentenceBlanksMap[sId]) sentenceBlanksMap[sId] = [];
      sentenceBlanksMap[sId].push({
        num,
        start: bInfo.replace.start,
        end: bInfo.replace.end,
      });
    }

    // Fallback: check contentJson.blanks array
    if (Array.isArray(contentJson.blanks)) {
      contentJson.blanks.forEach((b: any) => {
        const sId = Number(b.sentence_id);
        if (!sentenceBlanksMap[sId]) sentenceBlanksMap[sId] = [];
        if (!sentenceBlanksMap[sId].some(x => x.num === b.blank_no)) {
          sentenceBlanksMap[sId].push({
            num: b.blank_no,
            start: b.replace.start,
            end: b.replace.end,
          });
        }
      });
    }

    // Group sentences by paragraph number (pNum)
    interface ClozeParaGroup {
      pNum: string;
      sentences: any[];
    }

    const paraGroups: ClozeParaGroup[] = [];
    const paraMap: Record<string, ClozeParaGroup> = {};

    if (sentences.length > 0) {
      sentences.forEach((s: any) => {
        const m = (s.order_seq || '').match(/content_(\d+)_/);
        const pNum = m ? m[1] : '1';
        if (!paraMap[pNum]) {
          const group: ClozeParaGroup = { pNum, sentences: [] };
          paraMap[pNum] = group;
          paraGroups.push(group);
        }
        paraMap[pNum].sentences.push(s);
      });
    }

    // Sort paragraph groups
    paraGroups.sort((a, b) => Number(a.pNum) - Number(b.pNum));

    return (
      <div className="space-y-6 relative pb-16">
        {paraGroups.map((group) => {
          const paraSentences = group.sentences;

          return (
            <div key={group.pNum} className="space-y-3">
              <p className={`text-[1.05rem] leading-[2.3] text-justify font-serif indent-8 ${
                isDark ? 'text-slate-100' : 'text-gray-900'
              }`}>
                {paraSentences.map((s, sIdx) => {
                  const sId = Number(s.id);
                  const blanksInS = [...(sentenceBlanksMap[sId] || [])];
                  blanksInS.sort((a, b) => a.start - b.start);

                  const enText = s.en_text || '';
                  const parts: React.ReactNode[] = [];
                  let lastIdx = 0;

                  if (blanksInS.length > 0) {
                    blanksInS.forEach((b) => {
                      if (b.start > lastIdx) {
                        parts.push(
                          <span key={`t-${sId}-${lastIdx}`}>
                            {enText.substring(lastIdx, b.start)}
                          </span>
                        );
                      }

                      const qNum = b.num;
                      const curAns = answers[qNum];
                      const qObj = questions.find((q: any) => (q.id || q.qid) === qNum);
                      const correctAns = qObj?.answer;
                      const isCorrect = isSubmitted && curAns && correctAns && curAns.trim().toUpperCase() === correctAns.trim().toUpperCase();

                      let badgeStyle = curAns
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-1 ring-blue-400 font-bold'
                        : isDark
                        ? 'bg-blue-950/80 text-blue-300 border-blue-700/80 hover:bg-blue-900 shadow-xs'
                        : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 shadow-xs';

                      if (isSubmitted) {
                        if (isCorrect) {
                          badgeStyle = 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-400 font-bold';
                        } else {
                          badgeStyle = 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-400 font-bold';
                        }
                      }

                      const nextChar = enText[b.end];
                      const isFollowedByPunctuation = nextChar && /^[,\.\?\!;:\'\"]/.test(nextChar);

                      parts.push(
                        <button
                          key={`blank-${qNum}`}
                          id={`blank-btn-${qNum}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            scrollToQuestion(qNum);
                          }}
                          className={`inline-flex items-center justify-center font-mono font-bold border rounded-md px-1.5 py-0.5 ${
                            isFollowedByPunctuation ? 'ml-1 mr-0.5' : 'mx-1'
                          } min-w-[2rem] h-6 text-xs align-baseline transition-all hover:scale-105 active:scale-95 ${badgeStyle}`}
                          title={`点击跳转至第 ${qNum} 题作答`}
                        >
                          {curAns ? `[${qNum}: ${curAns}]` : `[${qNum}]`}
                          {isSubmitted && !isCorrect && correctAns && ` (正:${correctAns})`}
                        </button>
                      );

                      lastIdx = b.end;
                    });

                    if (lastIdx < enText.length) {
                      parts.push(
                        <span key={`t-${sId}-${lastIdx}`}>
                          {enText.substring(lastIdx)}
                        </span>
                      );
                    }
                  } else {
                    parts.push(
                      <span key={`t-${sId}-full`}>
                        {enText}
                      </span>
                    );
                  }

                  return (
                    <span 
                      key={s.id || sIdx} 
                      id={s.id ? `sentence-${s.id}` : undefined}
                      className={`${s.id ? getSentenceClass(s.id) : ''} ${sIdx > 0 ? 'ml-1' : ''}`}
                    >
                      {parts}
                    </span>
                  );
                })}
              </p>

              {showTranslation && (
                <div className={`p-3 rounded-xl text-sm font-sans indent-0 border leading-relaxed ${
                  isDark 
                    ? 'bg-emerald-950/50 text-emerald-200 border-emerald-800/50' 
                    : 'bg-green-50 text-green-800 border-green-200'
                }`}>
                  {paraSentences.map(s => s.cn_text).filter(Boolean).join(' ')}
                </div>
              )}
            </div>
          );
        })}

        {/* Translation Toggle */}
        <div className="absolute bottom-0 right-0">
          <label className={`flex items-center space-x-2 cursor-pointer px-3.5 py-1.5 rounded-full border shadow-md text-sm transition ${
            isDark ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}>
            <input 
              type="checkbox" 
              checked={showTranslation} 
              onChange={e => setShowTranslation(e.target.checked)} 
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="font-medium">显示参考译文</span>
          </label>
        </div>
      </div>
    );
  };

  const parseTranslationPassage = (task: TaskBundleItem) => {
    if (!task.detail.sentences || task.detail.sentences.length === 0) {
      return parseClozePassage(task);
    }

    const paragraphs: Record<string, any[]> = {};
    task.detail.sentences.forEach((s: any) => {
      const match = s.order_seq.match(/content_(\d+)_/);
      if (match) {
        const pNum = match[1];
        if (!paragraphs[pNum]) paragraphs[pNum] = [];
        paragraphs[pNum].push(s);
      }
    });

    const marks = task.detail.content_json?.translation_marks || [];
    const markMap = new Map();
    marks.forEach((m: any) => markMap.set(m.sentence_id, m.number));

    return (
      <div className="space-y-6 relative pb-16">
        {Object.keys(paragraphs).sort((a,b)=>Number(a)-Number(b)).map((pNum) => (
          <p key={pNum} className={`text-[1.05rem] leading-[2.2] text-justify font-serif indent-8 ${
            isDark ? 'text-white' : 'text-gray-800'
          }`}>
            {paragraphs[pNum].sort((a,b)=>a.order_seq.localeCompare(b.order_seq)).map(s => {
              const qNum = markMap.get(s.id);
              const highlightClass = getSentenceClass(s.id);

              if (qNum) {
                return (
                  <span key={s.id} id={`sentence-${s.id}`} className={`inline relative ${highlightClass}`}>
                    <span 
                      id={`question-tag-${qNum}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        scrollToQuestion(qNum);
                      }}
                      className={`border-b-[1.5px] pb-[2px] mr-1 cursor-pointer transition-all hover:bg-blue-500/10 rounded-xs ${
                        isDark ? 'border-blue-400 text-blue-300 hover:text-blue-200' : 'border-blue-600 text-blue-700 hover:text-blue-800'
                      }`}
                      title={`点击直接定位并作答第 (${qNum}) 题`}
                    >
                      <strong className={`mr-1 ${isDark ? 'text-blue-400 font-bold' : 'text-blue-700 font-bold'}`}>({qNum})</strong>
                      {s.en_text}
                    </span>
                    {(showTranslation || isSubmitted) && (
                      <span className={`block mt-2 mb-2 border p-2.5 rounded-lg text-sm indent-0 font-sans ${
                        isDark ? 'bg-emerald-950/70 text-emerald-200 border-emerald-800/60' : 'text-green-800 bg-green-50/90 border-green-200'
                      }`}>
                        <strong className={isDark ? 'text-emerald-300' : 'text-emerald-900'}>第({qNum})题参考译文：</strong>{s.cn_text}
                      </span>
                    )}
                  </span>
                );
              }
              return (
                <span key={s.id} id={`sentence-${s.id}`} className={`mr-1 ${highlightClass}`}>
                  {s.en_text}
                  {showTranslation && (
                    <span className={`block mt-2 mb-2 p-2 rounded text-sm indent-0 font-sans border ${
                      isDark ? 'bg-emerald-950/70 text-emerald-200 border-emerald-800/60' : 'text-gray-600 bg-gray-50 border-gray-200'
                    }`}>
                      {s.cn_text}
                    </span>
                  )}
                </span>
              );
            })}
          </p>
        ))}
        <div className="absolute bottom-0 right-0">
          <label className={`flex items-center space-x-2 cursor-pointer px-3.5 py-1.5 rounded-full border shadow-md text-sm transition ${
            isDark ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}>
            <input 
              type="checkbox" 
              checked={showTranslation} 
              onChange={e => setShowTranslation(e.target.checked)} 
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="font-medium">显示参考译文</span>
          </label>
        </div>
      </div>
    );
  };

  const parseReadingPassage = (task: TaskBundleItem) => {
    if (task.detail.sentences && task.detail.sentences.length > 0) {
      return parseTranslationPassage(task);
    }
    return (task.detail.article || '').split('\n\n').map((paragraph, i) => (
      <p key={i} className={`text-[1.05rem] leading-[2.2] text-justify mb-6 font-serif indent-8 ${
        isDark ? 'text-white' : 'text-gray-800'
      }`}>
        {paragraph}
      </p>
    ));
  };

  // Render question cards with answer check & AI explanation
  const renderQuestions = (task: TaskBundleItem, title: string) => {
    // Build quick lookup for question sentences (stems and options)
    const sentenceBySeq: Record<string, any> = {};
    (task.detail.sentences || []).forEach((s: any) => {
      if (s.order_seq) {
        sentenceBySeq[s.order_seq] = s;
      }
    });

    return (
      <div className={`rounded-xl shadow-sm border p-8 min-h-full ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-100 text-gray-900'
      }`}>
        <h2 className="text-xl font-bold text-[#6a5bcd] mb-8 flex items-center justify-center">
          📝 {title}
        </h2>
        <div className="space-y-12">
          {task.detail.questions?.map((q, idx) => {
            const qNum = q.id || (idx + 1);
            const userAns = answers[qNum] || answers[q.qid];
            const correctAns = q.answer;
            const isCorrect = userAns && correctAns && userAns.trim().toUpperCase() === correctAns.trim().toUpperCase();

            // Find stem sentence
            const stemSentence = sentenceBySeq[`question_${q.qid}_stem`] || 
                                 sentenceBySeq[`question_${qNum}_stem`] ||
                                 sentenceBySeq[`question_${q.id}_stem`];
            const stemSId = stemSentence?.id;
            const isStemHighlighted = highlightedSentenceId && (stemSId === highlightedSentenceId || Number(stemSId) === Number(highlightedSentenceId));

            return (
              <div key={q.qid || qNum} className={`scroll-mt-24 p-6 rounded-2xl border ${
                isDark ? 'bg-slate-850 border-slate-750' : 'bg-gray-50/50 border-gray-200/80'
              }`} id={`question-${qNum}`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xl font-black text-blue-500 font-sans">{qNum}.</span>

                  {isSubmitted && (
                    <div className="flex items-center gap-2">
                      {isCorrect ? (
                        <span className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border ${
                          isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> 正确
                        </span>
                      ) : (
                        <span className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border ${
                          isDark ? 'bg-rose-950 text-rose-300 border-rose-700' : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}>
                          <XCircle className="w-3.5 h-3.5" /> 错误 (你的选择: {userAns || '未答'} | 正确: {correctAns})
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                {q.text && q.text !== 'null' && (
                  <div 
                    id={stemSId ? `sentence-${stemSId}` : undefined}
                    className={`font-bold mb-6 text-base leading-relaxed p-1.5 rounded transition-all ${
                      isStemHighlighted 
                        ? 'bg-yellow-300 text-yellow-950 ring-4 ring-yellow-400 font-black shadow-md animate-pulse' 
                        : isDark ? 'text-white' : 'text-gray-800'
                    }`}
                  >
                    {q.text}
                  </div>
                )}
                
                {q.options && q.options.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    {q.options.map(opt => {
                      const match = opt.match(/^([A-Z])[\.\s\)\:、]+(.*)$/i);
                      const letter = match ? match[1].toUpperCase() : opt[0];
                      const content = match ? match[2].trim() : opt.substring(1).trim();
                      const isSelected = userAns === letter;
                      const isThisCorrect = isSubmitted && correctAns === letter;
                      const isThisWrongSelected = isSubmitted && isSelected && !isCorrect;

                      // Find option sentence
                      const optSentence = sentenceBySeq[`question_${q.qid}_${letter}`] || 
                                          sentenceBySeq[`question_${qNum}_${letter}`] ||
                                          sentenceBySeq[`question_${q.id}_${letter}`];
                      const optSId = optSentence?.id;
                      const isOptHighlighted = highlightedSentenceId && (optSId === highlightedSentenceId || Number(optSId) === Number(highlightedSentenceId));

                      let btnStyle = isDark 
                        ? "border-slate-700 hover:border-slate-500 bg-slate-800 text-white" 
                        : "border-gray-200 hover:border-gray-300 bg-white text-gray-800";
                      if (isOptHighlighted) {
                        btnStyle = "bg-yellow-300 text-yellow-950 ring-4 ring-yellow-400 font-bold shadow-lg scale-[1.02] animate-pulse border-yellow-500";
                      } else if (isSubmitted) {
                        if (isThisCorrect) {
                          btnStyle = isDark ? "border-emerald-500 bg-emerald-950/80 text-emerald-100 ring-2 ring-emerald-400 font-bold" : "border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-400 font-bold";
                        } else if (isThisWrongSelected) {
                          btnStyle = isDark ? "border-rose-500 bg-rose-950/80 text-rose-100 ring-2 ring-rose-400" : "border-rose-500 bg-rose-50 text-rose-950 ring-2 ring-rose-400";
                        }
                      } else if (isSelected) {
                        btnStyle = isDark ? "border-blue-500 ring-2 ring-blue-400 bg-blue-950/80 text-white" : "border-blue-500 ring-2 ring-blue-500 bg-blue-50/50 text-gray-900";
                      }
                      
                      return (
                        <button
                          key={letter}
                          id={optSId ? `sentence-${optSId}` : undefined}
                          disabled={isSubmitted}
                          onClick={() => handleAnswerSelect(qNum, letter)}
                          className={`text-left p-3.5 rounded-xl border transition-all flex items-start ${btnStyle}`}
                        >
                          <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold mr-3 transition-colors ${
                            isOptHighlighted
                              ? 'bg-yellow-500 text-black font-black'
                              : isSubmitted
                              ? isThisCorrect
                                ? 'bg-emerald-600 text-white'
                                : isThisWrongSelected
                                ? 'bg-rose-600 text-white'
                                : isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-500'
                              : isSelected
                              ? 'bg-blue-600 text-white'
                              : isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {letter}
                          </span>
                          <span className={`mt-1 text-sm font-medium ${
                            isOptHighlighted 
                              ? 'text-yellow-950 font-bold' 
                              : isSelected 
                              ? (isDark ? 'text-blue-300 font-bold' : 'text-blue-900 font-bold') 
                              : (isDark ? 'text-slate-100' : 'text-gray-700')
                          }`}>
                            {content}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Analysis Box */}
                {isSubmitted && (q.ai_analysis_text || correctAns) && (
                  <div className={`mt-6 border rounded-xl p-4.5 text-xs leading-relaxed shadow-sm ${
                    isDark ? 'bg-amber-950/40 border-amber-800/80 text-amber-100' : 'bg-gradient-to-r from-amber-50/80 to-yellow-50/80 border-amber-200 text-gray-800'
                  }`}>
                    <div className={`font-bold mb-1.5 flex items-center gap-1.5 text-sm ${
                      isDark ? 'text-amber-300' : 'text-amber-900'
                    }`}>
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      【真题深度解析】正确答案：{correctAns}
                    </div>
                    <div className={`leading-relaxed whitespace-pre-wrap font-sans ${
                      isDark ? 'text-amber-200' : 'text-gray-700'
                    }`}>
                      {q.ai_analysis_text || '答案依据：详见官方答案解析与原文对应段落。'}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Section II New Type / Matching (41-45)
  const renderMatchingView = (task: TaskBundleItem) => {
    const detail = task.detail || ({} as any);
    const contentJson = detail.content_json || {};
    const sentences = detail.sentences || [];
    const questions = detail.questions || [];
    const sortedOrders = contentJson.sorted_orders;
    const questionTitles = contentJson.question_titles;

    // Check if this task is Paragraph Ordering (7选5排序)
    const isOrdering = !!sortedOrders || sentences.every(s => !s.order_seq || !s.order_seq.startsWith('content_'));

    if (isOrdering) {
      // 1. Group sentences into paragraphs by Letter A-H
      const letterParagraphs: Record<string, any[]> = {};
      sentences.forEach((s: any) => {
        const m = (s.order_seq || '').match(/_([A-H])_/);
        const letter = m ? m[1] : 'A';
        if (!letterParagraphs[letter]) letterParagraphs[letter] = [];
        letterParagraphs[letter].push(s);
      });

      const letters = Object.keys(letterParagraphs).sort();
      const optionLabels: string[] = contentJson.option_labels || (letters.length ? letters : ['A', 'B', 'C', 'D', 'E', 'F', 'G']);

      return (
        <div className="flex h-full">
          {/* Left Column: Reading & Ordering Material */}
          <div className="flex-1 p-6 overflow-y-auto" style={{ flex: '1.2' }}>
            {/* Top Directions Banner */}
            <div className={`border rounded-2xl p-6 shadow-sm mb-6 ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-[#fffdf7] border-[#f0ebe1] text-gray-900'
            }`}>
              <div className="flex items-center text-[#6a5bcd] font-bold text-sm mb-3">
                <BookOpen className="w-4 h-4 mr-2" />
                Section II 阅读新题型 · 排序题
              </div>
              <p className={`text-sm leading-relaxed mb-4 font-serif ${
                isDark ? 'text-slate-200' : 'text-gray-700'
              }`}>
                {detail.directions || 'The following paragraphs are given in a wrong order. For Questions 41-45, you are required to reorganize these paragraphs into a coherent text.'}
              </p>

              {/* Sorted Orders Indicator Banner */}
              {sortedOrders && (
                <div className={`border rounded-xl p-4 shadow-inner ${
                  isDark ? 'bg-slate-850 border-slate-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
                }`}>
                  <div className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center ${
                    isDark ? 'text-blue-300' : 'text-blue-800'
                  }`}>
                    <span className="w-2 h-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
                    文章结构排序指引
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {sortedOrders.split(/\s*→\s*|\s*->\s*|\s*➜\s*/).map((token: string, idx: number) => {
                      const trimmed = token.trim();
                      const numMatch = trimmed.match(/^(\d+)\.?$/);
                      if (numMatch) {
                        const qNum = parseInt(numMatch[1]);
                        const curAns = answers[qNum];
                        const qObj = questions.find((q: any) => (q.id || q.qid) === qNum);
                        const correctAns = qObj?.answer;
                        const isCorrect = isSubmitted && curAns && correctAns && curAns.toUpperCase() === correctAns.toUpperCase();

                        let badgeColor = curAns 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : isDark
                          ? 'bg-slate-800 text-blue-300 border-slate-700 hover:border-blue-500'
                          : 'bg-white text-blue-700 border-blue-300 hover:border-blue-500';
                        if (isSubmitted) {
                          badgeColor = isCorrect
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-rose-600 text-white border-rose-600';
                        }

                        return (
                          <React.Fragment key={idx}>
                            {idx > 0 && <span className="text-blue-400 font-bold">➜</span>}
                            <button
                              onClick={() => scrollToQuestion(qNum)}
                              className={`px-3.5 py-1.5 rounded-lg font-bold text-sm border shadow-sm transition-all ${badgeColor}`}
                            >
                              {qNum}. {curAns ? `[${curAns}]` : '___'}
                              {isSubmitted && !isCorrect && correctAns && ` (正:${correctAns})`}
                            </button>
                          </React.Fragment>
                        );
                      } else {
                        return (
                          <React.Fragment key={idx}>
                            {idx > 0 && <span className="text-blue-400 font-bold">➜</span>}
                            <span className="px-3.5 py-1.5 rounded-lg font-bold text-sm bg-emerald-600 text-white shadow-sm border border-emerald-700">
                              [{trimmed}] (已给)
                            </span>
                          </React.Fragment>
                        );
                      }
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6 pb-16 relative">
              {letters.map(letter => {
                const paraSentences = letterParagraphs[letter].sort((a,b) => (a.order_seq || '').localeCompare(b.order_seq || ''));
                return (
                  <div key={letter} className={`border rounded-2xl p-6 shadow-sm relative ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-[#fffdf7] border-[#f0ebe1]'}`}>
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#6a5bcd] text-white font-bold text-base mb-4 shadow-sm">
                      {letter}
                    </div>
                    <p className={`text-[1.05rem] leading-[2.2] text-justify font-serif ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                      {paraSentences.map(s => (
                        <span key={s.id || s.order_seq} id={`sentence-${s.id}`} className={`mr-1 ${getSentenceClass(s.id)}`}>
                          {s.en_text}
                          {showTranslation && (
                            <span className={`block mt-2 mb-2 p-2 rounded text-sm font-sans indent-0 ${isDark ? 'text-emerald-300 bg-emerald-950/60' : 'text-green-700 bg-green-50'}`}>
                              {s.cn_text}
                            </span>
                          )}
                        </span>
                      ))}
                    </p>
                  </div>
                );
              })}
              <div className="sticky bottom-4 right-4 flex justify-end z-20">
                <label className={`flex items-center space-x-2 cursor-pointer px-4 py-2 rounded-full border shadow-md text-sm transition ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-gray-300 text-gray-700'}`}>
                  <input type="checkbox" checked={showTranslation} onChange={e => setShowTranslation(e.target.checked)} className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">显示参考译文</span>
                </label>
              </div>
            </div>
          </div>

          <div className={`flex-1 p-6 overflow-y-auto border-l ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-gray-200'}`}>
            <div className={`rounded-xl shadow-sm border p-8 min-h-full ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
              <h2 className="text-xl font-bold text-[#6a5bcd] mb-8 flex items-center justify-center">
                📝 Section II 新题型 (41-45)
              </h2>
              <div className="space-y-8">
                {questions.map((q: any) => {
                  const qNum = q.id || q.qid;
                  const currentAns = answers[qNum];
                  const correctAns = q.answer;
                  const isCorrect = isSubmitted && currentAns && correctAns && currentAns.toUpperCase() === correctAns.toUpperCase();

                  return (
                    <div key={q.qid || qNum} className={`scroll-mt-24 p-6 rounded-xl border ${isDark ? 'bg-slate-850 border-slate-750' : 'bg-gray-50 border-gray-200'}`} id={`question-${qNum}`}>
                      <div className="flex items-center justify-between mb-4">
                        <span className={`text-lg font-bold flex items-center ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>
                          <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm mr-2.5 font-sans">
                            {qNum}
                          </span>
                          第 {qNum} 题选择段落
                        </span>
                        
                        {isSubmitted ? (
                          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${isCorrect ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'}`}>
                            {isCorrect ? '✓ 正确' : `✗ 错误 (正: ${correctAns || '无'})`}
                          </span>
                        ) : currentAns ? (
                          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-blue-100 text-blue-700 border border-blue-200">
                            已选: {currentAns}
                          </span>
                        ) : null}
                      </div>
                      
                      <div className="flex gap-2.5 flex-wrap">
                        {optionLabels.map((letter: string) => {
                          const isSelected = currentAns === letter;
                          const isThisCorrect = isSubmitted && correctAns === letter;
                          const isThisWrongSelected = isSubmitted && isSelected && !isCorrect;

                          let btnStyle = isDark ? "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700" : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300 shadow-sm";
                          if (isSubmitted) {
                            if (isThisCorrect) btnStyle = "bg-emerald-600 text-white ring-2 ring-emerald-400 font-bold";
                            else if (isThisWrongSelected) btnStyle = "bg-rose-600 text-white ring-2 ring-rose-400";
                          } else if (isSelected) btnStyle = "bg-blue-600 text-white ring-2 ring-blue-400";

                          return (
                            <button
                              key={letter}
                              disabled={isSubmitted}
                              onClick={() => handleAnswerSelect(qNum, letter)}
                              className={`w-11 h-11 rounded-xl font-bold text-base transition-all flex items-center justify-center border ${btnStyle}`}
                            >
                              {letter}
                            </button>
                          );
                        })}
                      </div>

                      {isSubmitted && q.ai_analysis_text && (
                        <div className={`mt-4 rounded-lg p-3 text-xs border ${isDark ? 'bg-amber-950/40 border-amber-800/60 text-amber-200' : 'bg-amber-50 border-amber-200 text-gray-800'}`}>
                          <strong>【解析】</strong>{q.ai_analysis_text}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      const contentParagraphs: Record<string, any[]> = {};
      const optionParagraphs: Record<string, any[]> = {};

      sentences.forEach((s: any) => {
        if ((s.order_seq || '').startsWith('content_')) {
          const m = s.order_seq.match(/content_(\d+)_/);
          const pNum = m ? m[1] : '1';
          if (!contentParagraphs[pNum]) contentParagraphs[pNum] = [];
          contentParagraphs[pNum].push(s);
        } else {
          const m = (s.order_seq || '').match(/_([A-H])_/);
          const letter = m ? m[1] : 'A';
          if (!optionParagraphs[letter]) optionParagraphs[letter] = [];
          optionParagraphs[letter].push(s);
        }
      });

      const optLetters = Object.keys(optionParagraphs).sort();
      const optionLabels: string[] = contentJson.option_labels || (optLetters.length ? optLetters : ['A', 'B', 'C', 'D', 'E', 'F', 'G']);

      return (
        <div className="flex h-full">
          <div className="flex-1 p-6 overflow-y-auto" style={{ flex: '1.2' }}>
            <div className={`border rounded-2xl p-8 shadow-sm min-h-full pb-16 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-[#fffdf7] border-[#f0ebe1]'}`}>
              <div className="flex items-center text-[#6a5bcd] font-bold text-sm mb-4">
                <BookOpen className="w-4 h-4 mr-2" />
                Section II 阅读新题型 · 文章材料
              </div>

              {task.detail.directions && (
                <div className={`rounded-xl p-4 text-xs mb-6 border ${isDark ? 'bg-amber-950/40 border-amber-800/60 text-amber-200' : 'bg-amber-50/70 border-amber-200/80 text-amber-900'}`}>
                  {task.detail.directions}
                </div>
              )}

              <div className="space-y-6">
                {Object.keys(contentParagraphs).length > 0 ? (
                  Object.keys(contentParagraphs).sort((a,b)=>Number(a)-Number(b)).map(pNum => (
                    <p key={pNum} className={`text-[1.05rem] leading-[2.2] font-serif indent-8 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                      {contentParagraphs[pNum].sort((a,b)=>(a.order_seq || '').localeCompare(b.order_seq || '')).map((s: any) => (
                        <span key={s.id || s.order_seq} id={`sentence-${s.id}`} className={`mr-1 ${getSentenceClass(s.id)}`}>
                          {s.en_text}
                          {showTranslation && (
                            <span className={`block mt-2 mb-2 p-2 rounded text-sm ${isDark ? 'bg-emerald-950/60 text-emerald-300' : 'bg-green-50 text-green-700'}`}>
                              {s.cn_text}
                            </span>
                          )}
                        </span>
                      ))}
                    </p>
                  ))
                ) : (
                  (task.detail.article || '').split('\n\n').map((para: string, idx: number) => (
                    <p key={idx} className={`text-[1.05rem] leading-[2.2] font-serif mb-6 indent-8 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{para}</p>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className={`flex-1 p-6 overflow-y-auto border-l ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-gray-200'}`}>
            <div className="space-y-8">
              <div className={`rounded-xl shadow-sm border p-6 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-base font-bold mb-4 flex items-center ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 mr-2"></span>
                  备选选项内容 (A-{optionLabels[optionLabels.length-1] || 'G'})
                </h3>
                <div className="space-y-4">
                  {optLetters.map(letter => {
                    const optSentences = optionParagraphs[letter].sort((a,b)=>(a.order_seq || '').localeCompare(b.order_seq || ''));
                    return (
                      <div key={letter} className={`border rounded-xl p-4 ${isDark ? 'bg-slate-850 border-slate-750' : 'bg-slate-50 border-gray-200'}`}>
                        <div className="flex items-start">
                          <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-sm mr-3 flex-shrink-0 flex items-center justify-center">
                            [{letter}]
                          </span>
                          <div className={`text-sm font-serif ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                            {optSentences.map((s: any) => (
                              <span key={s.id || s.order_seq} id={`sentence-${s.id}`} className={`block mb-1 ${getSentenceClass(s.id)}`}>
                                {s.en_text}
                                {showTranslation && (
                                  <span className={`block text-xs p-1.5 rounded mt-1 ${isDark ? 'bg-emerald-950/60 text-emerald-300' : 'bg-green-50 text-green-700'}`}>
                                    {s.cn_text}
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`rounded-xl shadow-sm border p-6 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
                <h3 className="text-base font-bold text-[#6a5bcd] mb-6 flex items-center">
                  📝 作答区 (41-45 题)
                </h3>
                <div className="space-y-6">
                  {questions.map((q: any) => {
                    const qNum = q.id || q.qid;
                    const customTitle = contentJson.question_titles?.[String(qNum)];
                    const currentAns = answers[qNum];
                    const correctAns = q.answer;
                    const isCorrect = isSubmitted && currentAns && correctAns && currentAns.toUpperCase() === correctAns.toUpperCase();

                    return (
                      <div key={q.qid || qNum} className={`scroll-mt-24 p-5 rounded-xl border ${isDark ? 'bg-slate-850/80 border-slate-750' : 'bg-gray-50 border-gray-200'}`} id={`question-${qNum}`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-base font-bold flex items-center ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>
                            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs mr-2 font-sans">
                              {qNum}
                            </span>
                            {customTitle ? `${customTitle}` : `第 ${qNum} 题`}
                          </span>

                          {isSubmitted ? (
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${isCorrect ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'}`}>
                              {isCorrect ? '✓ 正确' : `✗ 错误 (正: ${correctAns})`}
                            </span>
                          ) : currentAns ? (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                              已选: {currentAns}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          {optionLabels.map((letter: string) => {
                            const isSelected = currentAns === letter;
                            const isThisCorrect = isSubmitted && correctAns === letter;
                            const isThisWrongSelected = isSubmitted && isSelected && !isCorrect;

                            let btnStyle = isDark ? "bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700" : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300";
                            if (isSubmitted) {
                              if (isThisCorrect) btnStyle = "bg-emerald-600 text-white ring-2 ring-emerald-400 font-bold";
                              else if (isThisWrongSelected) btnStyle = "bg-rose-600 text-white ring-2 ring-rose-400";
                            } else if (isSelected) btnStyle = "bg-blue-600 text-white ring-2 ring-blue-400";

                            return (
                              <button
                                key={letter}
                                disabled={isSubmitted}
                                onClick={() => handleAnswerSelect(qNum, letter)}
                                className={`w-10 h-10 rounded-lg font-bold text-sm transition-all flex items-center justify-center border ${btnStyle}`}
                              >
                                {letter}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  const renderActiveView = () => {
    if (activeTab === 'cloze') {
      const task = paperData.tasks[0];
      return (
        <div className="flex h-full">
          <div className="flex-1 p-6 overflow-y-auto" style={{ flex: '1.2' }}>
            <div className={`border rounded-2xl p-8 shadow-sm h-auto min-h-full relative ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-[#fffdf7] border-[#f0ebe1]'}`}>
              <div className={`absolute top-0 left-0 px-4 py-1.5 rounded-tl-2xl rounded-br-2xl font-bold flex items-center text-sm ${isDark ? 'bg-indigo-950 text-indigo-300' : 'bg-indigo-50 text-[#6a5bcd]'}`}>
                <BookOpen className="w-4 h-4 mr-1.5" />
                阅读材料 · 完形填空
              </div>
              <div className="mt-8">
                {parseClozePassage(task)}
              </div>
            </div>
          </div>
          <div className={`flex-1 p-6 overflow-y-auto border-l ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-gray-200'}`}>
            {renderQuestions(task, 'Section I 完形填空 (1-20)')}
          </div>
        </div>
      );
    }
    
    if (activeTab === 'reading_1' || activeTab === 'reading_2' || activeTab === 'reading_3' || activeTab === 'reading_4' || activeTab === 'reading') {
      const readingTasks = paperData.tasks.filter(t => t.meta.chinese_name.includes('阅读') && !t.meta.chinese_name.includes('新题型'));
      
      let readingIndex = 0;
      if (activeTab === 'reading_2') readingIndex = 1;
      else if (activeTab === 'reading_3') readingIndex = 2;
      else if (activeTab === 'reading_4') readingIndex = 3;

      const currentTask = readingTasks[readingIndex] || readingTasks[0];
      if (!currentTask) return <div className="p-8 text-center text-slate-400">无阅读数据</div>;

      const textNum = readingIndex + 1;
      const startQ = 21 + readingIndex * 5;
      const endQ = 25 + readingIndex * 5;

      return (
        <div className="flex h-full">
          {/* Left Column: Single Reading Material */}
          <div className="flex-1 p-6 overflow-y-auto" style={{ flex: '1.2' }}>
            <div 
              key={currentTask.meta.id} 
              id={`task-section-${currentTask.meta.id}`} 
              className={`border rounded-2xl p-8 shadow-sm relative min-h-full ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-[#fffdf7] border-[#f0ebe1]'
              }`}
            >
              <div className={`absolute top-0 left-0 px-4 py-1.5 rounded-tl-2xl rounded-br-2xl font-bold flex items-center text-sm ${
                isDark ? 'bg-indigo-950 text-indigo-300' : 'bg-indigo-50 text-[#6a5bcd]'
              }`}>
                <BookOpen className="w-4 h-4 mr-1.5" />
                Section II 阅读理解A · Text {textNum} (第 {startQ}-{endQ} 题)
              </div>
              <div className="mt-8">
                {parseReadingPassage(currentTask)}
              </div>

              {/* Bottom Quick Navigation between Reading Texts */}
              <div className={`mt-8 pt-6 border-t flex items-center justify-between ${
                isDark ? 'border-slate-800' : 'border-gray-200'
              }`}>
                {readingIndex > 0 ? (
                  <button
                    onClick={() => {
                      setActiveTab(`reading_${readingIndex}`);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      isDark 
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                        : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200 shadow-sm'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>上一篇: Text {readingIndex} ({startQ - 5}-{startQ - 1}题)</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setActiveTab('cloze');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      isDark 
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                        : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200 shadow-sm'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>返回: 完形填空 (1-20)</span>
                  </button>
                )}

                {readingIndex < 3 ? (
                  <button
                    onClick={() => {
                      setActiveTab(`reading_${readingIndex + 2}`);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <span>下一篇: Text {textNum + 1} ({endQ + 1}-{endQ + 5}题)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setActiveTab('matching');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <span>进入: 新题型 (41-45)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: 5 Questions for this Single Reading Text */}
          <div className={`flex-1 p-6 overflow-y-auto border-l ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-gray-200'}`}>
            <div className="space-y-8">
              {renderQuestions(currentTask, `Section II 阅读理解A · Text ${textNum} (${startQ}-${endQ} 题)`)}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'matching') {
      const task = paperData.tasks.find(t => t.meta.category === 'matching' || t.meta.chinese_name.includes('新题型'));
      if (!task) return <div>无数据</div>;
      return renderMatchingView(task);
    }

    if (activeTab === 'translation') {
      const task = paperData.tasks.find(t => t.meta.chinese_name.includes('英译汉') || t.meta.chinese_name.includes('翻译'));
      if (!task) return <div>无数据</div>;
      return (
        <div className="flex h-full">
          {/* Left Column: Translation Passage */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto" style={{ flex: '1.2' }}>
            <div className={`border rounded-2xl p-6 md:p-8 shadow-sm relative min-h-full ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-[#fffdf7] border-[#f0ebe1]'}`}>
              <div className={`absolute top-0 left-0 px-4 py-1.5 rounded-tl-2xl rounded-br-2xl font-bold flex items-center text-sm ${isDark ? 'bg-indigo-950 text-indigo-300' : 'bg-indigo-50 text-[#6a5bcd]'}`}>
                <BookOpen className="w-4 h-4 mr-1.5" />
                翻译原文材料 (46-50)
              </div>
              <div className="mt-8">
                {parseTranslationPassage(task)}
              </div>
            </div>
          </div>

          {/* Right Column: 5 Large Harmonious Question Input Cards (46-50) */}
          <div className={`flex-1 p-6 md:p-8 overflow-y-auto border-l ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-gray-200'}`}>
            <div className={`rounded-xl shadow-sm border p-6 md:p-8 min-h-full ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-100 text-gray-900'
            }`}>
              <div className="flex items-center justify-between pb-6 mb-8 border-b border-gray-200 dark:border-slate-800">
                <h2 className="text-xl md:text-2xl font-bold text-[#6a5bcd] flex items-center gap-2.5">
                  📝 Section III 英译汉作答区 (46-50 题)
                </h2>
                <span className={`text-xs md:text-sm px-3.5 py-1.5 rounded-full border font-bold shadow-xs ${
                  isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-yellow-50 text-amber-900 border-yellow-200'
                }`}>
                  每题 2 分 · 共 10 分
                </span>
              </div>

              {/* Five Large Harmonious Question Input Cards */}
              <div className="space-y-10">
                {[46, 47, 48, 49, 50].map((num) => {
                  const mark = (task.detail.content_json?.translation_marks || []).find((m: any) => m.number === num);
                  const s = mark 
                    ? (task.detail.sentences || []).find((x: any) => x.id === mark.sentence_id)
                    : (task.detail.sentences || [])[num - 46];
                  const isAnswered = answers[num] !== undefined && String(answers[num]).trim() !== '';

                  return (
                    <div 
                      key={num} 
                      id={`question-${num}`}
                      className={`scroll-mt-24 p-6 md:p-8 rounded-2xl border shadow-sm transition-all ${
                        isDark 
                          ? 'bg-slate-850 border-slate-750 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20' 
                          : 'bg-gray-50/60 border-gray-200/90 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 shadow-xs'
                      }`}
                    >
                      {/* Header with Large Question Number, Title & Status */}
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-black text-blue-500 font-sans">{num}.</span>
                          <span className={`text-base md:text-lg font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                            第 ({num}) 题
                          </span>
                        </div>
                        {isAnswered && (
                          <span className={`flex items-center gap-1.5 text-xs md:text-sm font-bold px-3 py-1 rounded-full border ${
                            isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 已填写译文
                          </span>
                        )}
                      </div>

                      {/* English original sentence reference - Large & comfortable typography */}
                      {s?.en_text && (
                        <div className={`p-5 md:p-6 rounded-2xl mb-6 text-[1.05rem] md:text-[1.12rem] leading-[1.85] font-serif border shadow-2xs ${
                          isDark ? 'bg-slate-900 border-slate-750 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
                        }`}>
                          <div className="text-xs font-bold text-blue-500 mb-2.5 font-sans tracking-wide uppercase flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-blue-500" />
                            <span>原卷划线句 ({num}) 原文:</span>
                          </div>
                          <p className="font-serif select-text font-normal">{s.en_text}</p>
                        </div>
                      )}

                      {/* Dedicated Large Textarea for this question */}
                      <div className="space-y-2.5">
                        <label className={`block text-xs md:text-sm font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                          <Edit3 className="w-4 h-4 text-blue-500" />
                          <span>请输入您的中文翻译:</span>
                        </label>
                        <textarea
                          id={`translation-input-${num}`}
                          placeholder={`在此输入第 (${num}) 题中文翻译...`}
                          value={answers[num] || ''}
                          onChange={(e) => handleAnswerSelect(num, e.target.value)}
                          rows={4}
                          className={`w-full min-h-[130px] p-4 md:p-5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-y text-base md:text-[1.05rem] leading-[1.85] font-sans transition shadow-inner ${
                            isDark 
                              ? 'bg-slate-900 border-slate-750 text-slate-100 placeholder-slate-500 focus:bg-slate-950' 
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:bg-white'
                          }`}
                        />
                      </div>

                      {/* Standard Reference Translation for this question */}
                      {(isSubmitted || showTranslation) && s?.cn_text && (
                        <div className={`mt-6 border rounded-xl p-5 md:p-6 text-sm md:text-base leading-relaxed shadow-sm ${
                          isDark ? 'bg-emerald-950/60 border-emerald-800 text-emerald-100' : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        }`}>
                          <div className={`font-bold mb-2.5 flex items-center gap-1.5 text-base ${isDark ? 'text-emerald-300' : 'text-emerald-900'}`}>
                            <Sparkles className="w-4 h-4 text-emerald-500" />
                            官方标准参考译文 ({num}):
                          </div>
                          <p className="font-medium text-[0.98rem] md:text-[1.05rem] leading-[1.8]">{s.cn_text}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'writing_clinical' || activeTab === 'writing_essay') {
      const isEssay = activeTab === 'writing_essay';
      const qid = isEssay ? 52 : 51;
      const titleName = isEssay ? '大作文' : '小作文';
      const task = paperData.tasks.find(t => t.meta.chinese_name.includes(isEssay ? '大作文' : '小作文'));
      const modelSentences = task?.detail.sentences || [];
      const directions = task?.detail.directions || "";
      
      return (
        <div className="flex h-full">
          {/* Left Column: Full-width writing direction & original exam question image */}
          <div className={`flex-1 p-6 md:p-8 overflow-y-auto ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`} style={{ flex: '1.2' }}>
            <div className={`border rounded-2xl p-6 md:p-8 shadow-sm relative min-h-full flex flex-col ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-[#fffdf7] border-[#f0ebe1]'
            }`}>
              <div className={`flex items-center justify-between font-bold pb-4 mb-4 border-b ${
                isDark ? 'border-slate-800 text-[#8b7cf8]' : 'border-[#e8e2d8] text-[#6a5bcd]'
              }`}>
                <div className="flex items-center gap-2 text-base md:text-lg">
                  <BookOpen className="w-5 h-5" />
                  <span>Section III 写作 · {titleName} (第 {qid} 题 / {isEssay ? '20' : '10'}分)</span>
                </div>
                {task && (
                  <button
                    onClick={() => setPreviewImageUrl(`/data/images/writing/${task.meta.id}.png`)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-colors shadow-sm ${
                      isDark 
                        ? 'bg-slate-800 hover:bg-slate-750 text-blue-300 border-slate-700' 
                        : 'bg-white hover:bg-gray-50 text-blue-700 border-gray-200'
                    }`}
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                    全屏查看高清大图
                  </button>
                )}
              </div>

              {/* Full-width High-resolution Question Card Image (Crawled from zhentiqiang.com) */}
              {task && (
                <div className="w-full flex flex-col items-center my-2">
                  <img 
                    src={`/data/images/writing/${task.meta.id}.png`} 
                    alt={`${titleName} 原题高清配图`} 
                    onClick={() => setPreviewImageUrl(`/data/images/writing/${task.meta.id}.png`)}
                    className="w-full h-auto max-w-full rounded-xl border border-gray-200 bg-white shadow-md cursor-zoom-in transition-transform duration-200 hover:shadow-lg"
                    style={{ display: 'block' }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.dataset.triedFallback) {
                        target.dataset.triedFallback = 'true';
                        target.src = `./data/images/writing/${task.meta.id}.png`;
                      }
                    }}
                  />
                  <div className={`mt-3 flex items-center justify-between w-full text-xs font-medium ${
                    isDark ? 'text-slate-400' : 'text-gray-500'
                  }`}>
                    <span className="flex items-center gap-1">
                      📷 {year}年考研英语一 {titleName} 原卷扫描超清大图
                    </span>
                    <span className="flex items-center gap-1 cursor-pointer hover:underline text-blue-500" onClick={() => setPreviewImageUrl(`/data/images/writing/${task.meta.id}.png`)}>
                      <Maximize2 className="w-3.5 h-3.5" /> 点击全屏放大查看
                    </span>
                  </div>
                </div>
              )}

              {/* Fallback Directions if image unavailable */}
              {!task && directions && (
                <div className={`mt-4 p-4 rounded-xl border text-sm leading-relaxed font-serif ${
                  isDark ? 'bg-slate-950/70 border-slate-800 text-slate-200' : 'bg-white border-gray-200 text-gray-800'
                }`}>
                  {directions}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Writing Answer Area & High-score Model Essay */}
          <div className={`flex-1 p-6 md:p-8 overflow-y-auto border-l ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
            <div className="max-w-2xl mx-auto h-full flex flex-col">
              <h2 className="text-xl font-bold text-[#6a5bcd] mb-6 flex items-center">
                📝 {qid}. {titleName} 作答区与范文解析
              </h2>
              <textarea 
                placeholder={`在此输入您的${titleName}作答内容...`}
                value={answers[qid] || ''}
                onChange={e => handleAnswerSelect(qid, e.target.value)}
                className={`w-full flex-1 min-h-[260px] p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none mb-4 text-base leading-relaxed ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500' : 'bg-white border-gray-300 text-gray-900'}`}
              ></textarea>
              {(isSubmitted || showTranslation) && modelSentences.length > 0 && (
                <div className={`border rounded-xl p-5 shadow-sm mb-4 ${isDark ? 'bg-emerald-950/40 border-emerald-800/60' : 'bg-emerald-50/90 border-emerald-200'}`}>
                  <h4 className={`font-bold mb-3 flex items-center gap-1.5 text-base ${isDark ? 'text-emerald-300' : 'text-emerald-900'}`}>
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    【官方高分参考范文】中英双语对照
                  </h4>
                  <div className="space-y-3 text-sm">
                    {modelSentences.map((s: any) => (
                      <div key={s.id} id={`sentence-${s.id}`} className={`p-2.5 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-emerald-100'} ${getSentenceClass(s.id)}`}>
                        <p className={`font-serif font-medium mb-1 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{s.en_text}</p>
                        <p className={`text-xs ${isDark ? 'text-emerald-300' : 'text-green-800'}`}>{s.cn_text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const scrollToQuestion = (qid: number) => {
    if (qid >= 1 && qid <= 20 && activeTab !== 'cloze') setActiveTab('cloze');
    else if (qid >= 21 && qid <= 25 && activeTab !== 'reading_1') setActiveTab('reading_1');
    else if (qid >= 26 && qid <= 30 && activeTab !== 'reading_2') setActiveTab('reading_2');
    else if (qid >= 31 && qid <= 35 && activeTab !== 'reading_3') setActiveTab('reading_3');
    else if (qid >= 36 && qid <= 40 && activeTab !== 'reading_4') setActiveTab('reading_4');
    else if (qid >= 41 && qid <= 45 && activeTab !== 'matching') setActiveTab('matching');
    else if (qid >= 46 && qid <= 50 && activeTab !== 'translation') setActiveTab('translation');
    else if (qid === 51 && activeTab !== 'writing_clinical') setActiveTab('writing_clinical');
    else if (qid === 52 && activeTab !== 'writing_essay') setActiveTab('writing_essay');
    
    setTimeout(() => {
      const el = document.getElementById(`question-${qid}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (qid >= 46 && qid <= 50) {
        const inputEl = document.getElementById(`translation-input-${qid}`);
        if (inputEl) (inputEl as HTMLTextAreaElement).focus();
      }
    }, 150);
  };

  const renderAnswerSheet = () => {
    const renderGrid = (title: string, start: number, end: number) => {
      const numbers = Array.from({length: end - start + 1}, (_, i) => start + i);
      return (
        <div className="mb-5">
          <div className={`text-xs font-bold mb-2.5 text-center tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{title}</div>
          <div className="grid grid-cols-5 gap-1.5 px-3">
            {numbers.map(num => {
              const isAnswered = answers[num] !== undefined && String(answers[num]).trim() !== '';
              let btnClass = isDark ? "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400";

              if (isSubmitted && num <= 45) {
                let correctAns: string | undefined;
                for (const t of paperData.tasks) {
                  const q = (t.detail.questions || []).find((x: any) => (x.id || x.qid) === num);
                  if (q) { correctAns = q.answer; break; }
                }
                const userAns = answers[num];
                if (userAns && correctAns && userAns.trim().toUpperCase() === correctAns.trim().toUpperCase()) btnClass = "bg-emerald-600 text-white border-emerald-500";
                else if (userAns) btnClass = "bg-rose-600 text-white border-rose-500";
                else btnClass = isDark ? "bg-amber-950 text-amber-300 border-amber-700" : "bg-amber-50 text-amber-800 border-amber-300";
              } else if (isAnswered) btnClass = isDark ? "bg-blue-900 text-blue-200 border-blue-600 font-bold" : "bg-blue-50 text-blue-700 border-blue-300 font-bold";

              return (
                <button key={num} onClick={() => scrollToQuestion(num)} className={`w-[2.2rem] h-[2.2rem] flex items-center justify-center text-xs rounded-lg border transition-all shadow-xs ${btnClass}`}>
                  {num}
                </button>
              );
            })}
          </div>
        </div>
      );
    };

    return (
      <div className={`w-[17.5rem] border-l h-full overflow-y-auto flex flex-col flex-shrink-0 z-10 shadow-[-5px_0_15px_-5px_rgba(0,0,0,0.05)] transition-colors ${isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-[#f8f9fa] border-gray-200 text-gray-700'}`}>
        <div className={`p-3.5 px-4 border-b font-bold flex items-center justify-between sticky top-0 z-10 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-[#f8f9fa] border-gray-200'}`}>
          <div className="flex items-center text-sm">
            <CheckSquare className="w-4 h-4 mr-1.5 text-[#6a5bcd]" />
            <span>答题卡</span>
            {isSubmitted && <span className="ml-1.5 text-xs text-emerald-500 font-bold">(已交卷)</span>}
          </div>
          <button
            id="collapse-answersheet-btn"
            onClick={() => setIsAnswerSheetOpen(false)}
            className={`px-2 py-1 rounded-lg transition text-xs font-semibold flex items-center gap-1 border shadow-2xs ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700 hover:text-white' 
                : 'bg-white hover:bg-gray-100 text-gray-600 border-gray-200 hover:text-gray-900'
            }`}
            title="收起答题卡"
          >
            <span>收起</span>
            <PanelRightClose className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex-1 py-4 overflow-y-auto">
          {renderGrid('完形填空 (1-20)', 1, 20)}
          {renderGrid('阅读 Text 1 (21-25)', 21, 25)}
          {renderGrid('阅读 Text 2 (26-30)', 26, 30)}
          {renderGrid('阅读 Text 3 (31-35)', 31, 35)}
          {renderGrid('阅读 Text 4 (36-40)', 36, 40)}
          {renderGrid('阅读新题型 (41-45)', 41, 45)}
          {renderGrid('翻译 (46-50)', 46, 50)}
          {renderGrid('小作文 (51)', 51, 51)}
          {renderGrid('大作文 (52)', 52, 52)}
        </div>

        {/* Answer sheet bottom clear button */}
        <div className={`p-3 border-t flex flex-col gap-1.5 sticky bottom-0 z-10 ${isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-gray-50/95 border-gray-200'}`}>
          <button
            onClick={handleClearProgress}
            className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 shadow-xs ${
              isDark
                ? 'bg-slate-800 hover:bg-rose-950/60 text-rose-300 border-slate-700 hover:border-rose-800'
                : 'bg-white hover:bg-rose-50 text-rose-600 border-gray-200 hover:border-rose-200'
            }`}
            title="清空本套试卷所有客观题、翻译与作文作答"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>清空本卷做题进度</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-screen font-sans overflow-hidden transition-colors duration-200 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-gray-900'}`}>
      {renderNavbar()}
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-bounce pointer-events-none">
          <div className={`px-4 py-2 rounded-full shadow-2xl border text-xs font-bold flex items-center gap-2 ${
            isDark 
              ? 'bg-slate-850/95 border-blue-500/50 text-blue-300 backdrop-blur-md ring-1 ring-blue-500/30' 
              : 'bg-white/95 border-blue-300 text-blue-900 backdrop-blur-md shadow-blue-500/10'
          }`}>
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Main View + Collapsible Answer Sheet Container */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 overflow-hidden h-full shadow-sm rounded-tr-lg">
          {renderActiveView()}
        </div>

        {/* Collapsible Answer Sheet Panel with smooth slide/width transition */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 ${
          isAnswerSheetOpen ? 'w-[17.5rem] opacity-100' : 'w-0 opacity-0 pointer-events-none'
        }`}>
          {renderAnswerSheet()}
        </div>

        {/* Floating Quick Open Handle when Collapsed */}
        {!isAnswerSheetOpen && (
          <button
            id="expand-answersheet-floating-btn"
            onClick={() => setIsAnswerSheetOpen(true)}
            className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 py-3 px-2 rounded-l-2xl shadow-xl flex flex-col items-center gap-1.5 transition-all cursor-pointer border border-r-0 hover:px-2.5 ${
              isDark 
                ? 'bg-slate-800/95 hover:bg-slate-700/95 text-indigo-300 border-slate-700 backdrop-blur-md ring-1 ring-indigo-500/20' 
                : 'bg-white/95 hover:bg-gray-50 text-indigo-600 border-gray-200 backdrop-blur-md shadow-indigo-500/10'
            }`}
            title="点击展开答题卡"
          >
            <PanelRightOpen className="w-4 h-4 text-indigo-500" />
            <span className="[writing-mode:vertical-lr] tracking-widest text-[11px] font-bold">答题卡</span>
            <span className={`text-[10px] px-1 py-0.5 rounded-full font-mono font-bold ${
              isDark ? 'bg-indigo-950 text-indigo-300' : 'bg-indigo-50 text-indigo-700'
            }`}>
              {answeredCount}/52
            </span>
          </button>
        )}
      </div>

      {showResultModal && scoreReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className={`rounded-2xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white text-center relative">
              <button onClick={() => setShowResultModal(false)} className="absolute top-4 right-4 text-white/80 hover:text-white text-xl font-bold w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center">✕</button>
              <h3 className="text-2xl font-black">{year}年考研英语一 · 成绩报告单</h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-800/80 border-slate-700 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
                  <div className="text-2xl font-black">{scoreReport.totalObjectiveScore} <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>/ 60</span></div>
                  <div className="text-xs font-bold mt-1">客观题总分</div>
                </div>
                <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-800/80 border-slate-700 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                  <div className="text-2xl font-black">{scoreReport.accuracy}%</div>
                  <div className="text-xs font-bold mt-1">正确率</div>
                </div>
                <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-800/80 border-slate-700 text-purple-400' : 'bg-purple-50 border-purple-100 text-purple-700'}`}>
                  <div className="text-2xl font-black">{scoreReport.totalObjectiveCorrect} <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>/ 45</span></div>
                  <div className="text-xs font-bold mt-1">答对题数</div>
                </div>
              </div>
              <div className="space-y-2.5 pt-2">
                <button onClick={() => setShowResultModal(false)} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
                  <BookOpen className="w-4 h-4" /> 查看题目详细解析
                </button>
                <button
                  onClick={handleRestart}
                  className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border shadow-2xs ${
                    isDark ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  重新作答本卷
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Image Lightbox Fullscreen Preview Modal */}
      {previewImageUrl && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in cursor-zoom-out"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-[96vw] max-h-[96vh] flex flex-col items-center cursor-default" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setPreviewImageUrl(null)}
              title="关闭大图预览"
              className="absolute -top-12 right-0 text-white/90 hover:text-white text-xl font-bold bg-slate-800/90 hover:bg-slate-700 w-10 h-10 rounded-full flex items-center justify-center transition shadow-2xl border border-slate-600"
            >
              ✕
            </button>
            <div className="bg-white p-3 md:p-5 rounded-2xl shadow-2xl overflow-auto max-h-[86vh] max-w-[92vw] flex items-center justify-center border border-gray-300">
              <img 
                src={previewImageUrl} 
                alt="题目高清配图" 
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-inner"
              />
            </div>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-white text-xs font-semibold bg-black/70 px-4 py-1.5 rounded-full border border-white/20 shadow-lg flex items-center gap-1.5">
                <ZoomIn className="w-3.5 h-3.5 text-blue-400" />
                考研英语原卷超清配图 · 点击任意空白处或右上角 ✕ 退出
              </span>
            </div>
          </div>
        </div>
      )}

      {/* In-Passage Word Selection Popover Tooltip */}
      <WordLookupPopover
        dict={localDict}
        wordStatuses={wordStatuses}
        onToggleStatus={onToggleWordStatus}
        onOpenWordDetail={onOpenWordModal}
        theme={theme}
      />
    </div>
  );
}
