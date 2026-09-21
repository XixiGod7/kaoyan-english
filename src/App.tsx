import React, { useState, useEffect, useMemo } from 'react';
import { Header, AppTab } from './components/Header';
import { WordFreqSidebar } from './components/WordFreqSidebar';
import { WordDetailModal } from './components/WordDetailModal';
import { DataBackupModal } from './components/DataBackupModal';
import { EbbinghausNotebookModal } from './components/EbbinghausNotebookModal';
import { StudyProgressModal } from './components/StudyProgressModal';
import { DesktopAppModal } from './components/DesktopAppModal';
import { AiConfigModal } from './components/AiConfigModal';
import { ExamWall } from './components/ExamWall';
import QuizMode from './components/QuizMode';
import { IntensiveReadingView } from './components/IntensiveReadingView';
import { ParaphraseView } from './components/ParaphraseView';
import { GrammarDrillView } from './components/GrammarDrillView';
import { PhrasesView } from './components/PhrasesView';
import { VocabStatsView } from './components/VocabStatsView';
import { PersonalCenterView } from './components/PersonalCenterView';
import { TranslationPracticeView } from './components/TranslationPracticeView';
import { SentenceReviewView } from './components/SentenceReviewView';
import { EssayGradingView } from './components/EssayGradingView';
import { HomeView } from './components/HomeView';
import { WordLookupPopover } from './components/WordLookupPopover';
import { PaperGroup, KaoyanDict, WordFreqItem } from './types/kaoyan';
import { 
  loadQuizHistory, 
  loadEbbinghausRecords, 
  syncAllWordsToEbbinghaus, 
  syncSingleWordStatus,
  computeOverallStudyStats, 
  loadDailySessionState,
  QuizRecordItem,
  EbbinghausWordRecord
} from './utils/ebbinghaus';
import { 
  getGlobalFontSize, 
  setGlobalFontSize, 
  subscribeFontSizeChange, 
  FontSizeLevel 
} from './utils/fontSize';

export const App: React.FC = () => {
  const [papers, setPapers] = useState<PaperGroup[]>([]);
  const [dict, setDict] = useState<KaoyanDict | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isEbbinghausOpen, setIsEbbinghausOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [isDesktopAppOpen, setIsDesktopAppOpen] = useState(false);
  const [isAiConfigOpen, setIsAiConfigOpen] = useState(false);
  const [quizHistory, setQuizHistory] = useState<Record<string, QuizRecordItem[]>>(() => loadQuizHistory());
  const [ebbinghausRecords, setEbbinghausRecords] = useState<Record<string, EbbinghausWordRecord>>(() => loadEbbinghausRecords());

  // Global Font Size state
  const [fontSizeLevel, setFontSizeLevel] = useState<FontSizeLevel>(() => getGlobalFontSize());

  useEffect(() => {
    return subscribeFontSizeChange(setFontSizeLevel);
  }, []);

  const handleSetFontSize = (level: FontSizeLevel) => {
    setFontSizeLevel(level);
    setGlobalFontSize(level);
  };

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

  const [currentTab, setCurrentTab] = useState<AppTab>('home');
  const [currentPassKey, setCurrentPassKey] = useState<string>('2026-t1');
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<WordFreqItem | null>(null);
  const [lookupTarget, setLookupTarget] = useState<{ word: string; rect: DOMRect } | null>(null);

  // Synchronize documentElement class for Tailwind dark mode
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const [wordStatuses, setWordStatuses] = useState<Record<string, 'familiar' | 'unfamiliar' | 'unknown'>>(() => {
    try {
      const saved = localStorage.getItem('kaoyan_word_statuses');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleWordClick = (word: string, rect?: DOMRect) => {
    if (rect) {
      setLookupTarget({ word, rect });
    } else {
      const clean = word.toLowerCase().replace(/[^a-z]/g, '');
      const entry = dict?.entries[clean];
      if (entry) {
        setWordModalItem({
          word: clean,
          entry,
          paperCount: 1,
          totalCount: 1,
          status: wordStatuses[clean] || 'unknown',
        });
      }
    }
  };

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

      if (dataObj.favoriteSentences) {
        try {
          const cur = JSON.parse(localStorage.getItem('kaoyan_favorite_sentences') || '[]');
          const merged = mode === 'overwrite' ? dataObj.favoriteSentences : [...dataObj.favoriteSentences, ...cur.filter((c: any) => !dataObj.favoriteSentences.some((d: any) => d.sid === c.sid))];
          localStorage.setItem('kaoyan_favorite_sentences', JSON.stringify(merged));
        } catch {}
      }

      if (dataObj.wrongQuestions) {
        try {
          const cur = JSON.parse(localStorage.getItem('kaoyan_wrong_questions') || '[]');
          const merged = mode === 'overwrite' ? dataObj.wrongQuestions : [...dataObj.wrongQuestions, ...cur.filter((c: any) => !dataObj.wrongQuestions.some((d: any) => String(d.id) === String(c.id)))];
          localStorage.setItem('kaoyan_wrong_questions', JSON.stringify(merged));
        } catch {}
      }

      if (dataObj.paraphraseProgress) {
        try {
          const cur = JSON.parse(localStorage.getItem('kaoyan_paraphrase_progress') || '{}');
          const merged = mode === 'overwrite' ? dataObj.paraphraseProgress : { ...cur, ...dataObj.paraphraseProgress };
          localStorage.setItem('kaoyan_paraphrase_progress', JSON.stringify(merged));
        } catch {}
      }

      if (dataObj.phraseDictateHistory) {
        try {
          const cur = JSON.parse(localStorage.getItem('kaoyan_phrase_dictate_history') || '{}');
          const merged = mode === 'overwrite' ? dataObj.phraseDictateHistory : { ...cur, ...dataObj.phraseDictateHistory };
          localStorage.setItem('kaoyan_phrase_dictate_history', JSON.stringify(merged));
        } catch {}
      }

      if (dataObj.readingProgress) {
        try {
          const cur = JSON.parse(localStorage.getItem('kaoyan_reading_progress') || '{}');
          const merged = mode === 'overwrite' ? dataObj.readingProgress : { ...cur, ...dataObj.readingProgress };
          localStorage.setItem('kaoyan_reading_progress', JSON.stringify(merged));
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
      localStorage.removeItem('kaoyan_favorite_sentences');
      localStorage.removeItem('kaoyan_wrong_questions');
      localStorage.removeItem('kaoyan_paraphrase_progress');
      localStorage.removeItem('kaoyan_phrase_dictate_history');
      localStorage.removeItem('kaoyan_reading_progress');
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

  // Save statuses to localStorage & sync with Ebbinghaus records
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

    // Deep sync to Ebbinghaus database & active daily session
    const syncRes = syncSingleWordStatus(word, status, ebbinghausRecords);
    setEbbinghausRecords(syncRes.records);

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
    const synced = syncAllWordsToEbbinghaus(wordFreqList, wordStatuses, ebbinghausRecords);
    const now = Date.now();
    return Object.values(synced).filter(r => r.nextReviewTime <= now && r.stage < 8).length;
  }, [wordFreqList, wordStatuses, ebbinghausRecords, isEbbinghausOpen]);

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
      {/* Top Bar Navigation */}
      {!selectedYear && (
        <Header
          onGoHome={() => {
            setCurrentTab('home');
            setSelectedYear(null);
            setTargetSentenceId(null);
            setTargetTab(null);
            setTargetSectionId(null);
            refreshQuizHistory();
          }}
          currentYear={selectedYear}
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            if (tab !== 'quiz') {
              setSelectedYear(null);
            }
          }}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenDataBackup={() => setIsBackupModalOpen(true)}
          onOpenEbbinghaus={() => setIsEbbinghausOpen(true)}
          onOpenProgress={() => setIsProgressOpen(true)}
          onOpenDesktopApp={() => setIsDesktopAppOpen(true)}
          onOpenAiConfig={() => setIsAiConfigOpen(true)}
          dueReviewCount={dueReviewCount}
          fontSizeLevel={fontSizeLevel}
          onSetFontSize={handleSetFontSize}
        />
      )}

      {loading ? (
        <div className={`flex-1 flex items-center justify-center text-sm font-bold gap-3 ${
          isDark ? 'text-slate-300' : 'text-slate-600'
        }`}>
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          正在加载 2001-2026 考研英语真题库、长难句精读与语法分析系统...
        </div>
      ) : selectedYear ? (
        /* Full Quiz Mode View for Selected Year */
        <div className="flex-1 h-full min-h-0 overflow-hidden">
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
            onOpenAiConfig={() => setIsAiConfigOpen(true)}
            fontSizeLevel={fontSizeLevel}
            onSetFontSize={handleSetFontSize}
            onBackToHome={() => {
              setSelectedYear(null);
              setTargetSentenceId(null);
              setTargetTab(null);
              setTargetSectionId(null);
              refreshQuizHistory();
            }}
          />
        </div>
      ) : currentTab === 'home' ? (
        /* 0. Platform Homepage View */
        <main className="flex-1 overflow-y-auto">
          <HomeView
            theme={theme}
            onNavigateTab={(tab) => {
              setCurrentTab(tab);
              if (tab !== 'quiz') {
                setSelectedYear(null);
              }
            }}
            onOpenEbbinghaus={() => setIsEbbinghausOpen(true)}
            onOpenProgress={() => setIsProgressOpen(true)}
            onOpenAiConfig={() => setIsAiConfigOpen(true)}
            onOpenBackup={() => setIsBackupModalOpen(true)}
          />
        </main>
      ) : currentTab === 'reading' ? (
        /* 1. Intensive Reading View */
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6">
          <IntensiveReadingView
            initialPassKey={currentPassKey}
            onWordClick={handleWordClick}
            onNavigateToQuiz={(yr) => {
              setSelectedYear(yr);
              setCurrentTab('quiz');
            }}
            wordStatuses={wordStatuses}
            onUpdateWordStatus={handleToggleStatus}
            fontSizeLevel={fontSizeLevel}
          />
        </main>
      ) : currentTab === 'quiz' ? (
        /* 2. Real Exam Quiz Wall */
        <div className="flex-1 flex overflow-hidden">
          <WordFreqSidebar
            words={wordFreqList}
            onSelectWord={item => setSelectedWord(item)}
            selectedWord={selectedWord}
            onToggleStatus={handleToggleStatus}
            onOpenEbbinghaus={() => setIsEbbinghausOpen(true)}
            ebbinghausRecords={ebbinghausRecords}
            dueReviewCount={dueReviewCount}
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
      ) : currentTab === 'paraphrase' ? (
        /* 3. Paraphrase Drill View */
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6">
          <ParaphraseView
            onWordClick={handleWordClick}
            onNavigateToReading={(passKey) => {
              setCurrentPassKey(passKey);
              setCurrentTab('reading');
            }}
          />
        </main>
      ) : currentTab === 'translation' ? (
        /* 4. Translation Practice View */
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6">
          <TranslationPracticeView
            theme={theme}
            fontSizeLevel={fontSizeLevel}
            onNavigateToReading={(passKey) => {
              setCurrentPassKey(passKey);
              setCurrentTab('reading');
            }}
          />
        </main>
      ) : currentTab === 'sentence-review' ? (
        /* 5. Sentence Review Random Drill View */
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6">
          <SentenceReviewView
            theme={theme}
            fontSizeLevel={fontSizeLevel}
            onWordClick={handleWordClick}
            onNavigateToReading={(passKey) => {
              setCurrentPassKey(passKey);
              setCurrentTab('reading');
            }}
          />
        </main>
      ) : currentTab === 'essay' ? (
        /* 6. Essay Real Exam & AI Grading View */
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6">
          <EssayGradingView
            theme={theme}
            fontSizeLevel={fontSizeLevel}
          />
        </main>
      ) : currentTab === 'grammar' ? (
        /* 7. Grammar Drill View */
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6">
          <GrammarDrillView
            onWordClick={handleWordClick}
            onNavigateToReading={(passKey) => {
              setCurrentPassKey(passKey);
              setCurrentTab('reading');
            }}
          />
        </main>
      ) : currentTab === 'phrases' ? (
        /* 8. Phrases View */
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6">
          <PhrasesView
            onWordClick={handleWordClick}
            onNavigateToReading={(passKey) => {
              setCurrentPassKey(passKey);
              setCurrentTab('reading');
            }}
          />
        </main>
      ) : currentTab === 'vocab' ? (
        /* 9. Vocab Stats & Blind Spot Test View */
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6">
          <VocabStatsView
            onWordClick={handleWordClick}
            wordStatuses={wordStatuses}
            onUpdateWordStatus={handleToggleStatus}
          />
        </main>
      ) : currentTab === 'personal' ? (
        /* 10. Personal Learning Hub */
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6">
          <PersonalCenterView
            onWordClick={handleWordClick}
            onNavigateToReading={(passKey) => {
              setCurrentPassKey(passKey);
              setCurrentTab('reading');
            }}
            wordStatuses={wordStatuses}
          />
        </main>
      ) : null}

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
        onClose={() => {
          setIsEbbinghausOpen(false);
          setEbbinghausRecords(loadEbbinghausRecords());
        }}
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

      {/* AI Grading & Custom API Settings Modal */}
      <AiConfigModal
        isOpen={isAiConfigOpen}
        onClose={() => setIsAiConfigOpen(false)}
        theme={theme}
      />

      {/* Floating Word Lookup Popover Card (Dictionary Tooltip) */}
      <WordLookupPopover
        dict={dict}
        wordStatuses={wordStatuses}
        onToggleStatus={handleToggleStatus}
        onOpenWordDetail={item => setWordModalItem(item)}
        targetWord={lookupTarget}
        onClose={() => setLookupTarget(null)}
        theme={theme}
      />
    </div>
  );
};

export default App;
