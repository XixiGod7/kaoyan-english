/**
 * 考研英语答题界面 v7 — 响应式布局 + 统一选项 + 答题卡联动
 */
import React, { useState, useCallback } from 'react';
import { useExamData, ExamJsonData, JsonSection, JsonQuestion } from '../hooks/useExamData';

const T = {
  bg: '#f8fafc', surface: '#ffffff', border: '#e2e8f0',
  primary: '#2563eb', primaryLight: '#dbeafe', text: '#1e293b',
  subtext: '#64748b', correct: '#16a34a', wrong: '#dc2626', accent: '#8b5cf6',
};

interface Props {
  year: string;
  title?: string;
}

export default function QuizMode({ year, title }: Props) {
  const { data, loading, error } = useExamData(year);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [translationAnswers, setTranslationAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [activeTabIdx, setActiveTabIdx] = useState(0);

  React.useEffect(() => {
    if (!data || done) return;
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [done, data]);

  const handleAnswer = useCallback((qNum: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [qNum]: answer }));
  }, []);

  const handleTransAnswer = useCallback((qNum: string, answer: string) => {
    setTranslationAnswers(prev => ({ ...prev, [qNum]: answer }));
  }, []);

  const handleSubmit = () => setDone(true);
  const handleReset = () => {
    setAnswers({});
    setTranslationAnswers({});
    setDone(false);
    setSeconds(0);
    setActiveTabIdx(0);
  };

  if (loading && !data) return <LoadingView year={year} />;
  if (error && !data) return <ErrorView msg={error} />;
  if (!data) return <div style={{ padding: 40, textAlign: 'center' }}>暂无数据</div>;

  const orderedSections = Object.values(data.sections)
    .filter(s => s.questions?.length > 0 || s.article)
    .sort((a, b) => a.question_range[0] - b.question_range[0]);

  const allQuestions = orderedSections.flatMap(s => s.questions || []);
  const activeSection = orderedSections[activeTabIdx] || null;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const answeredCount = Object.keys(answers).length +
    Object.values(translationAnswers).filter(v => v.trim()).length;

  // 统一的 question key：sec.key-number
  const qk = (secKey: string, qNum: number) => `${secKey}-${qNum}`;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: T.bg }}>
      {/* ====== 顶部栏 ====== */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', borderBottom: `1px solid ${T.border}`,
        background: T.surface, flexShrink: 0, gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: T.text, whiteSpace: 'nowrap' }}>
            {title || `${year}年 考研英语`}
          </span>
          <span style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 8,
            background: '#fef3c7', color: '#92400e', fontWeight: 600, whiteSpace: 'nowrap',
          }}>{data.era_label}</span>
        </div>

        <nav style={{ display: 'flex', gap: 1, overflowX: 'auto', flex: 1, justifyContent: 'center' }}>
          {orderedSections.map((sec, idx) => (
            <button key={sec.key}
              onClick={() => setActiveTabIdx(idx)}
              style={{
                padding: '4px 10px', fontSize: 11,
                fontWeight: idx === activeTabIdx ? 600 : 400,
                background: idx === activeTabIdx ? T.primary : 'transparent',
                color: idx === activeTabIdx ? '#fff' : T.subtext,
                border: 'none', borderRadius: '5px 5px 0 0',
                cursor: 'pointer', whiteSpace: 'nowrap', lineHeight: 1.4,
              }}
            >
              {sec.name.replace(/Section\s+[IVX]+\s*/i, '').replace(/Part\s*[A-C]\s*/i, '').split(' ').pop()}
              <span style={{ marginLeft: 3, opacity: 0.6, fontSize: 9 }}>({sec.question_range[0]}-{sec.question_range[1]})</span>
            </button>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 600, color: T.text, background: '#f1f5f9', padding: '3px 10px', borderRadius: 6 }}>
            {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
          </span>
          <span style={{ fontSize: 12, color: T.subtext }}>{answeredCount}/{allQuestions.length}</span>
          {!done ? (
            <button onClick={handleSubmit} disabled={answeredCount === 0}
              style={{
                padding: '5px 14px', fontSize: 12, fontWeight: 600,
                background: answeredCount > 0 ? T.primary : '#94a3b8', color: '#fff',
                border: 'none', borderRadius: 6, cursor: answeredCount > 0 ? 'pointer' : 'not-allowed',
              }}>提交</button>
          ) : (
            <button onClick={handleReset}
              style={{ padding: '5px 14px', fontSize: 12, fontWeight: 600, background: '#64748b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              重做
            </button>
          )}
        </div>
      </header>

      {/* ====== 主体 ====== */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* 左侧内容区 — 自适应宽度 */}
        <main style={{ flex: 1, overflow: 'auto', padding: '12px 16px', background: T.bg, minWidth: 0 }}>
          {activeSection ? renderSectionContent(activeSection, done, answers, translationAnswers, handleAnswer, handleTransAnswer, qk) : null}
        </main>

        {/* 右侧答题卡 — 紧凑，响应式宽度 */}
        <aside style={{
          width: 'clamp(140px, 12vw, 200px)', borderLeft: `1px solid ${T.border}`, background: T.surface,
          overflowY: 'auto', padding: 10, flexShrink: 0,
        }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, margin: '0 0 8px', color: T.text }}>答题卡</h3>

          {orderedSections.map(sec => (
            <div key={sec.key} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: T.subtext, marginBottom: 3 }}>
                {sec.name.split(' ').slice(-1)[0]} ({sec.question_range[0]}-{sec.question_range[1]})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {(sec.questions || []).map(q => {
                const key = qk(sec.key, q.number);
                const ans = answers[key];
                const tAns = translationAnswers[key]?.trim();
                const hasAns = !!ans || !!tAns;

                return (
                  <span key={q.number}
                    title={ans ? `选${ans}` : tAns ? '已答' : '未答'}
                    style={{
                      width: 22, height: 22, borderRadius: 4, flexShrink: 0,
                      background: hasAns ? (done ? T.correct : T.primary) : '#e2e8f0',
                      color: hasAns ? '#fff' : '#94a3b8',
                      fontSize: 10, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s ease',
                    }}>{q.number}</span>
                );
              })}
              </div>
              {(!sec.questions?.length) && (
                <div style={{ fontSize: 9, color: '#d97706', fontStyle: 'italic' }}>-</div>
              )}
            </div>
          ))}

          {done && (
            <div style={{ marginTop: 8, padding: 6, background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: T.correct }}>完成</div>
              <div style={{ fontSize: 9, color: '#15803d' }}>
                {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')} | {answeredCount}/{allQuestions.length}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// ==================== 子组件 ====================

function LoadingView({ year }: { year: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column', gap: 16, background: T.bg }}>
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="17" fill="none" stroke="#e2e8f0" strokeWidth="3" />
        <path d="M20 3 A17 17 0 0 1 37 20" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round">
          <animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="0.8s" repeatCount="indefinite" />
        </path>
      </svg>
      <span style={{ color: T.subtext, fontSize: 14 }}>正在加载 {year} 年试题...</span>
    </div>
  );
}

function ErrorView({ msg }: { msg: string }) {
  return (
    <div style={{ padding: 40, textAlign: 'center', height: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: T.bg }}>
      <h3 style={{ color: T.wrong }}>加载失败</h3>
      <p style={{ color: T.subtext }}>{msg}</p>
    </div>
  );
}

/** 生成 question key 的函数类型 */
type QKFn = (secKey: string, qNum: number) => string;

function renderSectionContent(
  sec: JsonSection,
  isDone: boolean,
  answers: Record<string, string>,
  transAns: Record<string, string>,
  onAns: (n: string, a: string) => void,
  onTrans: (n: string, a: string) => void,
  qk: QKFn,
) {
  const isReadingA = sec.type === 'reading-a' || sec.type === 'reading';
  const isWriting = sec.type.includes('writing');
  const textGroups = (isReadingA && sec.texts?.length) ? sec.texts : null;

  // ===== 阅读A节：按 Text 1-4 分组，左右分栏 =====
  if (textGroups && textGroups.length > 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {textGroups.map((tg, idx) => (
          <div key={`text-${tg.text_num}`} style={{
            display: 'flex', gap: 0, minHeight: 0,
            borderTop: idx > 0 ? `2px solid #cbd5e1` : 'none',
            paddingTop: idx > 0 ? 20 : 0,
          }}>
            {/* 左侧：文章 */}
            <div style={{ flex: '1 1 55%', paddingRight: 16, overflowY: 'auto', maxHeight: 'calc(100vh - 100px)', minWidth: 0 }}>
              <div style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                marginBottom: 12, paddingBottom: 6, borderBottom: `1.5px solid ${T.primary}`,
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.primary, letterSpacing: '0.5px' }}>Text {tg.text_num}</span>
                <span style={{ fontSize: 10, color: T.subtext }}>
                  Q{tg.questions[0]?.number ?? '-'}-{tg.questions[tg.questions.length - 1]?.number ?? '-'}
                </span>
              </div>
              {tg.article && (
                <article style={{
                  fontSize: 'clamp(13px, 1.4vw, 16px)', lineHeight: 1.9, color: '#1e293b',
                  textAlign: 'justify', textJustify: 'inter-word',
                  fontFamily: '"Times New Roman", "SimSun", "Songti SC", Georgia, serif',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  padding: '0 2px', textIndent: '2em',
                }}>
                  {tg.article}
                </article>
              )}
            </div>

            {/* 分割线 */}
            <div style={{ width: 1, background: T.border, flexShrink: 0 }} />

            {/* 右侧：题目 */}
            <div style={{ flex: '1 1 45%', paddingLeft: 16, overflowY: 'auto', maxHeight: 'calc(100vh - 100px)', minWidth: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {tg.questions.map(q => (
                  <QuestionCard key={qk(sec.key, q.number)}
                    q={q} secKey={sec.key} isDone={isDone}
                    answers={answers} transAns={transAns} onAns={onAns} onTrans={onTrans}
                    qk={qk} isReadingContext />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ===== 写作题：不分栏 =====
  if (isWriting) {
    return (
      <section>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#ec4899', marginBottom: 12 }}>
          {sec.name}
        </div>
        {sec.questions?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {sec.questions.map(q => (
              <QuestionCard key={qk(sec.key, q.number)}
                q={q} secKey={sec.key} isDone={isDone}
                answers={answers} transAns={transAns} onAns={onAns} onTrans={onTrans}
                qk={qk} />
            ))}
          </div>
        ) : (
          <div style={{ padding: 30, textAlign: 'center', color: T.subtext, background: T.surface, borderRadius: 8, border: `1px dashed ${T.border}` }}>
            该 Section 暂无题目
          </div>
        )}
      </section>
    );
  }

  // ===== 有文章的其他section（完形/新题型/翻译）：左右分栏 =====
  const hasArticle = sec.article && sec.article.trim();

  if (hasArticle) {
    return (
      <div style={{ display: 'flex', gap: 0 }}>
        {/* 左侧：文章 */}
        <div style={{ flex: '1 1 55%', paddingRight: 16, overflowY: 'auto', maxHeight: 'calc(100vh - 100px)', minWidth: 0 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: T.accent, marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            阅读材料
          </div>
          <article style={{
            fontSize: 'clamp(13px, 1.4vw, 16px)', lineHeight: 1.9, color: T.text,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            fontFamily: '"Times New Roman", "SimSun", "Songti SC", Georgia, serif',
            textAlign: 'justify', textIndent: '2em', padding: '0 2px',
          }}>
            {sec.article}
          </article>
        </div>

        {/* 分割线 */}
        <div style={{ width: 1, background: T.border, flexShrink: 0 }} />

        {/* 右侧：题目 */}
        <div style={{ flex: '1 1 45%', paddingLeft: 16, overflowY: 'auto', maxHeight: 'calc(100vh - 100px)', minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.primary, marginBottom: 10 }}>
            {sec.name}
          </div>
          {sec.questions?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sec.questions.map(q => (
                <QuestionCard key={qk(sec.key, q.number)}
                  q={q} secKey={sec.key} isDone={isDone}
                  answers={answers} transAns={transAns} onAns={onAns} onTrans={onTrans}
                  qk={qk} />
              ))}
            </div>
          ) : (
            <div style={{ padding: 30, textAlign: 'center', color: T.subtext, background: T.surface, borderRadius: 8, border: `1px dashed ${T.border}` }}>
              该 Section 暂无题目
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== 无文章的section：纯题目 =====
  return (
    <section>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.primary, marginBottom: 10 }}>
        {sec.name}
      </div>
      {sec.questions?.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sec.questions.map(q => (
            <QuestionCard key={qk(sec.key, q.number)}
              q={q} secKey={sec.key} isDone={isDone}
              answers={answers} transAns={transAns} onAns={onAns} onTrans={onTrans}
              qk={qk} />
          ))}
        </div>
      ) : (
        <div style={{ padding: 30, textAlign: 'center', color: T.subtext, background: T.surface, borderRadius: 8, border: `1px dashed ${T.border}` }}>
          该 Section 暂无题目
        </div>
      )}
    </section>
  );
}

// ==================== QuestionCard ====================

interface QCProps {
  q: JsonQuestion;
  secKey: string;
  isDone: boolean;
  answers: Record<string, string>;
  transAns: Record<string, string>;
  onAns: (n: string, a: string) => void;
  onTrans: (n: string, a: string) => void;
  qk: QKFn;
  isReadingContext?: boolean;
}

function QuestionCard({ q, secKey, isDone, answers, transAns, onAns, onTrans, qk, isReadingContext }: QCProps) {
  const key = qk(secKey, q.number);
  const curAns = answers[key];

  // 选择题
  if (q.choices?.length) {
    const avgLen = q.choices.reduce((s, c) => s + c.text.length, 0) / q.choices.length;
    const cols = avgLen < 8 ? 4 : avgLen < 20 ? 2 : 1;

    if (isReadingContext) {
      // 阅读题 — 紧凑风格，选项换行
      return (
        <div style={{ paddingLeft: 14, borderLeft: `3px solid ${T.primary}`, paddingTop: 2, paddingBottom: 2 }}>
          <div style={{ fontSize: 'clamp(12px, 1.2vw, 14px)', fontWeight: 500, color: T.text, marginBottom: 8, lineHeight: 1.6 }}>
            <span style={{ marginRight: 4, color: T.primary, fontWeight: 700 }}>{q.number}.</span>
            <span style={{ fontFamily: '"Times New Roman", SimSun, Georgia, serif' }}>{q.stem}</span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: 4, paddingLeft: 16,
          }}>
            {q.choices.map(opt => {
              const sel = curAns === opt.label;
              return (
                <button key={opt.label} disabled={isDone} onClick={() => onAns(key, opt.label)}
                  style={{
                    padding: '5px 8px', borderRadius: 5, cursor: isDone ? 'not-allowed' : 'pointer',
                    border: sel ? `2px solid ${T.primary}` : '1px solid transparent',
                    background: sel ? '#eff6ff' : 'transparent',
                    fontSize: 'clamp(12px, 1.1vw, 14px)',
                    display: 'flex', alignItems: 'center', gap: 6,
                    color: sel ? T.primary : '#334155',
                    fontFamily: '"Times New Roman", SimSun, Georgia, serif',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    minWidth: 0,
                  }}
                >
                  <span style={{
                    width: 20, height: 20, flexShrink: 0,
                    borderRadius: 4, fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: sel ? T.primary : '#f1f5f9',
                    color: sel ? '#fff' : T.subtext,
                    transition: 'all 0.15s ease',
                  }}>{opt.label}</span>
                  <span style={{
                    lineHeight: 1.4, textAlign: 'left',
                    color: opt.text ? 'inherit' : '#c4cdd5',
                    fontStyle: opt.text ? 'normal' : 'italic',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {opt.text || '\u2014'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    // 非阅读 — 卡片风格，选项自适应列数
    return (
      <div style={{ padding: 10, background: T.surface, borderRadius: 8, border: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 'clamp(12px, 1.2vw, 14px)', fontWeight: 500, color: T.text, marginBottom: 8, lineHeight: 1.5 }}>
          <span style={{ marginRight: 4, color: T.primary, fontWeight: 700 }}>{q.number}.</span>{q.stem}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gap: 6,
        }}>
          {q.choices.map(opt => {
            const sel = curAns === opt.label;
            return (
              <button key={opt.label} disabled={isDone} onClick={() => onAns(key, opt.label)}
                style={{
                  padding: '5px 8px', borderRadius: 6, cursor: isDone ? 'not-allowed' : 'pointer',
                  border: `2px solid ${sel ? T.primary : T.border}`,
                  background: sel ? T.primaryLight : '#fafafa',
                  fontSize: 'clamp(12px, 1.1vw, 13px)',
                  display: 'flex', alignItems: 'center', gap: 5,
                  color: sel ? T.primary : T.text,
                  minWidth: 0,
                }}>
                <span style={{
                  width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                  background: sel ? T.primary : '#e2e8f0', color: sel ? '#fff' : T.subtext,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                }}>{opt.label}</span>
                <span style={{
                  lineHeight: 1.35,
                  color: opt.text ? 'inherit' : '#c4cdd5',
                  fontStyle: opt.text ? 'normal' : 'italic',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: cols === 4 ? 'nowrap' : 'normal',
                }}>{opt.text || '\u2014'}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 新题型
  if (q.type === 'new_type') {
    return (
      <div style={{ padding: 10, background: T.surface, borderRadius: 8, border: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 'clamp(12px, 1.2vw, 14px)', fontWeight: 500, color: T.text, marginBottom: 6 }}>
          <span style={{ marginRight: 4, color: T.primary, fontWeight: 700 }}>{q.number}.</span>
          {q.stem || '请在文章中找到对应空格'}
        </div>
        {q.choices?.length && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
            {q.choices.map(opt => {
              const sel = curAns === opt.label;
              return (
                <button key={opt.label} disabled={isDone} onClick={() => onAns(key, opt.label)}
                  style={{
                    padding: '4px 10px', borderRadius: 5, fontSize: 11,
                    border: `2px solid ${sel ? T.primary : T.border}`,
                    background: sel ? T.primaryLight : '#fafafa',
                    color: sel ? T.primary : T.text, cursor: isDone ? 'default' : 'pointer',
                  }}>
                  {opt.label}. {opt.text.length > 30 ? opt.text.substring(0, 30) + '...' : opt.text}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 翻译
  if (q.type === 'translation') {
    return (
      <div style={{ padding: 10, background: T.surface, borderRadius: 8, border: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 6 }}>
          <span style={{ marginRight: 4, color: '#f59e0b', fontWeight: 700 }}>{q.number}.</span>
        </div>
        <div style={{ padding: 10, background: '#fffbeb', borderRadius: 5, fontSize: 13, lineHeight: 1.7, fontFamily: 'Georgia, serif', border: '1px solid #fde68a', marginBottom: 6 }}>
          {q.stem}
        </div>
        <textarea value={transAns[key] || ''} onChange={e => !isDone && onTrans(key, e.target.value)} disabled={isDone}
          placeholder="在此输入中文翻译..." rows={3}
          style={{ width: '100%', padding: 8, borderRadius: 5, border: `1px solid ${T.border}`, fontSize: 12, resize: 'vertical' }} />
      </div>
    );
  }

  // 写作
  if (q.type.includes('writing')) {
    const wt = q.type === 'writing_big' ? '大作文' : '小作文';
    return (
      <div style={{ padding: 14, background: T.surface, borderRadius: 8, border: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#ec4899', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          第{q.number}题 · {wt}
        </div>
        <div style={{ padding: 10, background: '#fdf2f8', borderRadius: 5, fontSize: 12, lineHeight: 1.7, border: '1px solid #fbcfe8', marginBottom: 10 }}>
          {q.stem}
        </div>
        <textarea value={transAns[key] || ''} onChange={e => !isDone && onTrans(key, e.target.value)} disabled={isDone}
          placeholder={`在这里写${wt}...`} rows={8}
          style={{ width: '100%', padding: 10, borderRadius: 5, border: `1px solid ${T.border}`, fontSize: 13, resize: 'vertical', lineHeight: 1.7 }} />
      </div>
    );
  }

  // 兜底
  return (
    <div style={{ padding: 10, borderRadius: 8, background: T.surface, border: `1px solid ${T.border}` }}>
      <strong>{q.number}.</strong> {q.stem || '(未知题型)'}
    </div>
  );
}

export type { ExamJsonData as ParsedExam, JsonQuestion as Question, JsonSection as SectionInfo };
