import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { WordFreqSidebar } from './components/WordFreqSidebar';
import { WordDetailModal } from './components/WordDetailModal';
import { DataBackupModal } from './components/DataBackupModal';
import { EbbinghausNotebookModal } from './components/EbbinghausNotebookModal';
import { StudyProgressModal } from './components/StudyProgressModal';
import { DesktopAppModal } from './components/DesktopAppModal';
import { ExamWall } from './components/ExamWall';
import QuizMode from './components/QuizMode';
import { PaperGroup, KaoyanDict, WordFreqItem } from './types/kaoyan';
import { 
  loadQuizHistory, 
  loadEbbinghausRecords, 
  syncAllWordsToEbbinghaus, 
  computeOverallStudyStats, 
  loadDailySessionState,
  QuizRecordItem 
} from './utils/ebbinghaus';

export const App: React.FC = () => {
  const [papers, setPapers] = useState<PaperGroup[]>([]);
  const [dict, setDict] = useState<KaoyanDict | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isEbbinghausOpen, setIsEbbinghausOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [isDesktopAppOpen, setIsDesktopAppOpen] = useState(false);
  const [quizHistory, setQuizHistory] = useState<Record<string, QuizRecordItem[]>>(() => loadQuizHistory());

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('kaoyan_theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const handleToggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('kaoyan_theme', next);
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<WordFreqItem | null>(null);
  const [wordStatuses, setWordStatuses] = useState<Record<string, 'familiar' | 'unfamiliar' | 'unknown'>>(() => {
    try {
      const saved = localStorage.getItem('kaoyan_word_statuses');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Data import handler
  const handleImportData = (payload: any, mode: 'merge' | 'overwrite'): boolean => {
    try {
      if (!payload || typeof payload !== 'object') return false;
      const dataObj = payload.data || payload;
      const importedStatuses = dataObj.wordStatuses;

      if (importedStatuses && typeof importedStatuses === 'object') {
        setWordStatuses(prev => {
          const merged = mode === 'overwrite' ? { ...importedStatuses } : { ...prev, ...importedStatuses };
          try {
            localStorage.setItem('kaoyan_word_statuses', JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }

      if (dataObj.quizHistory) {
        try {
          localStorage.setItem('kaoyan_quiz_history', JSON.stringify(dataObj.quizHistory));
          setQuizHistory(dataObj.quizHistory);
        } catch {}
      }

      if (dataObj.ebbinghausRecords) {
        try {
          const currentEbb = loadEbbinghausRecords();
          const mergedEbb = mode === 'overwrite' ? dataObj.ebbinghausRecords : { ...currentEbb, ...dataObj.ebbinghausRecords };
          localStorage.setItem('kaoyan_ebbinghaus_records', JSON.stringify(mergedEbb));
        } catch {}
      }

      if (dataObj.theme && (dataObj.theme === 'dark' || dataObj.theme === 'light')) {
        setTheme(dataObj.theme);
        try {
          localStorage.setItem('kaoyan_theme', dataObj.theme);
        } catch {}
      }

      return true;
    } catch (e) {
      console.error('Failed to import study data:', e);
      return false;
    }
  };

  // Data clear handler
  const handleClearData = () => {
    setWordStatuses({});
    setQuizHistory({});
    try {
      localStorage.removeItem('kaoyan_word_statuses');
      localStorage.removeItem('kaoyan_quiz_history');
      localStorage.removeItem('kaoyan_quiz_records');
      localStorage.removeItem('kaoyan_ebbinghaus_records');
    } catch {}
  };

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [papersRes, dictRes] = await Promise.all([
          fetch('./data/papers_by_type.json'),
          fetch('./data/kaoyan1_dict.json'),
        ]);

        if (papersRes.ok) {
          const papersData = await papersRes.json();
          setPapers(papersData);
        }

        if (dictRes.ok) {
          const dictData = await dictRes.json();
          setDict(dictData);
        }
      } catch (err) {
        console.error('Failed to load kaoyan data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Save statuses to localStorage
  const handleToggleStatus = (word: string, status: 'familiar' | 'unfamiliar' | 'unknown') => {
    setWordStatuses(prev => {
      const updated = { ...prev, [word]: status };
      try {
        localStorage.setItem('kaoyan_word_statuses', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    if (selectedWord && selectedWord.word === word) {
      setSelectedWord(prev => prev ? { ...prev, status } : null);
    }
  };

  // Build sorted WordFreqItem[] list (Strictly 762 Core Focus Words with Exam Sentences)
  const wordFreqList = useMemo<WordFreqItem[]>(() => {
    if (!dict || !dict.entries) return [];

    const list: WordFreqItem[] = [];

    Object.entries(dict.entries).forEach(([word, entry]) => {
      if (!entry.definition_cn) return;

      const sentenceIds = entry.sentence_ids || [];
      const taskIds = entry.task_ids || [];

      // Filter: Only include curated 762 exam core focus words that actually appear in the past papers
      const isCoreExamWord = entry.is_kaoyan_key || sentenceIds.length > 0 || taskIds.length > 0;
      if (!isCoreExamWord) return;

      const totalCount = sentenceIds.length || 1;
      const paperCount = taskIds.length || Math.min(totalCount, 28);
      const status = wordStatuses[word] || 'unknown';

      list.push({
        word,
        entry,
        paperCount,
        totalCount,
        status,
      });
    });

    // Sort by paperCount desc, totalCount desc, alphabetical asc
    return list.sort((a, b) => {
      if (b.paperCount !== a.paperCount) return b.paperCount - a.paperCount;
      if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
      return a.word.localeCompare(b.word);
    });
  }, [dict, wordStatuses]);

  const [targetSentenceId, setTargetSentenceId] = useState<number | null>(null);
  const [targetTab, setTargetTab] = useState<string | null>(null);
  const [targetSectionId, setTargetSectionId] = useState<number | null>(null);
  const [wordModalItem, setWordModalItem] = useState<WordFreqItem | null>(null);

  const handleJumpToSentence = (year: string, sentenceId: number) => {
    setSelectedYear(year);
    setTargetSentenceId(sentenceId);
    setTargetTab(null);
    setTargetSectionId(null);
    setWordModalItem(null);
  };

  const handleSelectSection = (year: string, tabId: string, sectionId: number, sentenceId?: number | null) => {
    setSelectedYear(year);
    setTargetTab(tabId);
    setTargetSectionId(sectionId);
    setTargetSentenceId(sentenceId || null);
  };

  const isDark = theme === 'dark';

  // Compute due review words count for Ebbinghaus badge
  const dueReviewCount = useMemo(() => {
    const session = loadDailySessionState();
    if (session) {
      return session.activeQueueWords.length;
    }
    const records = loadEbbinghausRecords();
    const synced = syncAllWordsToEbbinghaus(wordFreqList, wordStatuses, records);
    const now = Date.now();
    return Object.values(synced).filter(r => r.nextReviewTime <= now && r.stage < 8).length;
  }, [wordFreqList, wordStatuses, isEbbinghausOpen]);

  const studyStats = useMemo(() => {
    return computeOverallStudyStats(papers, quizHistory);
  }, [papers, quizHistory]);

  const refreshQuizHistory = () => {
    setQuizHistory(loadQuizHistory());
  };

  return (
    <div className={`h-screen flex flex-col font-sans antialiased transition-colors duration-200 overflow-hidden ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-gray-900'
    }`}>
      {/* Top Bar */}
      <Header
        onGoHome={() => {
          setSelectedYear(null);
          setTargetSentenceId(null);
          setTargetTab(null);
          setTargetSectionId(null);
          refreshQuizHistory();
        }}
        currentYear={selectedYear}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenDataBackup={() => setIsBackupModalOpen(true)}
        onOpenEbbinghaus={() => setIsEbbinghausOpen(true)}
        onOpenProgress={() => setIsProgressOpen(true)}
        onOpenDesktopApp={() => setIsDesktopAppOpen(true)}
        dueReviewCount={dueReviewCount}
      />

      {loading ? (
        <div className={`flex-1 flex items-center justify-center text-sm font-bold gap-3 ${
          isDark ? 'text-slate-300' : 'text-slate-600'
        }`}>
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          正在加载 2010-2026 考研英语真题库与高频词库...
        </div>
      ) : selectedYear ? (
        /* Full Quiz Mode View for Selected Year */
        <div className="flex-1">
          <QuizMode
            year={selectedYear}
            initialTargetSentenceId={targetSentenceId}
            initialTab={targetTab}
            initialSectionId={targetSectionId}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            dict={dict}
            wordStatuses={wordStatuses}
            onToggleWordStatus={handleToggleStatus}
            onOpenWordModal={item => setWordModalItem(item)}
            onBackToHome={() => {
              setSelectedYear(null);
              setTargetSentenceId(null);
              setTargetTab(null);
              setTargetSectionId(null);
              refreshQuizHistory();
            }}
          />
        </div>
      ) : (
        /* Main Home: Left Word Sidebar + Right Exam Wall */
        <div className="flex-1 flex overflow-hidden">
          <WordFreqSidebar
            words={wordFreqList}
            onSelectWord={item => setSelectedWord(item)}
            selectedWord={selectedWord}
            onToggleStatus={handleToggleStatus}
            theme={theme}
          />

          <ExamWall
            papers={papers}
            selectedWord={selectedWord}
            onSelectWord={setSelectedWord}
            onOpenWordModal={item => setWordModalItem(item)}
            onSelectSection={handleSelectSection}
            onToggleStatus={handleToggleStatus}
            quizHistory={quizHistory}
            onOpenProgressModal={() => setIsProgressOpen(true)}
            theme={theme}
          />
        </div>
      )}

      {/* Word Detail & Sentence Examples Modal */}
      <WordDetailModal
        item={wordModalItem}
        onClose={() => setWordModalItem(null)}
        onToggleStatus={handleToggleStatus}
        onJumpToSentence={handleJumpToSentence}
        theme={theme}
      />

      {/* Ebbinghaus Forgetting Curve Vocabulary Notebook & Review Modal */}
      <EbbinghausNotebookModal
        isOpen={isEbbinghausOpen}
        onClose={() => setIsEbbinghausOpen(false)}
        dict={dict}
        words={wordFreqList}
        wordStatuses={wordStatuses}
        onToggleStatus={handleToggleStatus}
        onOpenWordDetail={item => setWordModalItem(item)}
        theme={theme}
      />

      {/* Study Progress & Quiz Records Dashboard Modal */}
      <StudyProgressModal
        isOpen={isProgressOpen}
        onClose={() => setIsProgressOpen(false)}
        stats={studyStats}
        papers={papers}
        quizHistory={quizHistory}
        onSelectYear={year => {
          setSelectedYear(year);
          setTargetTab(null);
          setTargetSectionId(null);
        }}
        theme={theme}
      />

      {/* Personal Learning Data Backup & Import/Export Modal */}
      <DataBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        wordStatuses={wordStatuses}
        onImportData={handleImportData}
        onClearData={handleClearData}
        theme={theme}
      />

      {/* Desktop App Generation & PWA Modal */}
      <DesktopAppModal
        isOpen={isDesktopAppOpen}
        onClose={() => setIsDesktopAppOpen(false)}
        theme={theme}
      />
    </div>
  );
};

export default App;
