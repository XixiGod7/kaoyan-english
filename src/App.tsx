import React, { Component } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './components/HomePage';
import ResourceTabs from './components/ResourceTabs';
import PdfViewer from './components/PdfViewer';
import QuizMode from './components/QuizMode';
import { useYearDetail, usePaperData } from './hooks/usePaperData';

class ErrorBoundary extends Component<{ children: any }, { error: Error | null }> {
  constructor(props: any) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, background: '#fee2e2', color: '#dc2626', fontFamily: 'monospace' }}>
          <h1>⚠️ Error!</h1>
          <pre style={{ fontSize: 14 }}>{this.state.error.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function YearView() {
  const [activeTab, setActiveTab] = React.useState(() => 'exam');
  const [mode, setMode] = React.useState<'pdf' | 'quiz'>('pdf');
  const { year } = useParams();
  const navigate = useNavigate();
  
  const yearData = useYearDetail(year!);
  const { years } = usePaperData();

  if (!yearData) {
    return (
      <div style={{ padding: 40, background: '#fef3c7', color: '#92400e' }}>
        <h1>No data for year: {year}</h1>
        <p>Available years: {years.map((y: any) => y.year).join(', ')}</p>
      </div>
    );
  }

  const currentResource = yearData.resources.find((r: any) => r.type === activeTab);

  // 答题模式：全屏展示
  if (mode === 'quiz' && currentResource) {
    return (
      <div>
        {/* 返回按钮 */}
        <button
          onClick={() => setMode('pdf')}
          style={{
            position: 'fixed', top: 16, left: 16, zIndex: 100,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px',
            background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px',
            fontSize: '13px', color: '#64748b', cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          ← 返回 PDF 预览
        </button>
        <QuizMode year={year!} title={`${yearData.year}年考研英语 - ${currentResource.label}`} />
      </div>
    );
  }

  // PDF 预览模式
  return (
    <div className="space-y-6">
      {/* 导航 */}
      <button onClick={() => navigate('/')} className="text-sm text-[#64748B] hover:text-[#1E293B]">
        ← 返回总览
      </button>

      {/* 标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#1E293B]">{yearData.year}年 考研英语</h2>
          <p className="text-sm text-[#94A3B8] mt-1">{yearData.eraLabel}</p>
        </div>

        {/* 模式切换 + Tab */}
        <div className="flex items-center gap-3">
          {/* 模式切换 */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setMode('pdf')}
              style={{
                padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                background: mode === 'pdf' ? 'white' : 'transparent',
                color: mode === 'pdf' ? '#1E293B' : '#94a3b8',
                cursor: 'pointer', transition: 'all 0.15s',
                border: mode === 'pdf' ? 'none' : '1px solid transparent',
                boxShadow: mode === 'pdf' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              📄 PDF 预览
            </button>
            <button
              onClick={() => setMode('quiz')}
              style={{
                padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                background: mode === 'quiz' ? '#2563eb' : 'transparent',
                color: mode === 'quiz' ? 'white' : '#94a3b8',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              ✏️ 在线答题
            </button>
          </div>

          {/* 资源 Tab */}
          <ResourceTabs
            resources={yearData.resources}
            activeType={activeTab}
            onChange={(t) => setActiveTab(t)}
          />
        </div>
      </div>

      {/* PDF 预览 */}
      {currentResource ? (
        <PdfViewer resource={currentResource} />
      ) : (
        <div className="text-center py-20 text-[#94A3B8]">该类型暂无资源</div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/year/:year" element={<YearView />} />
          </Routes>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
}
