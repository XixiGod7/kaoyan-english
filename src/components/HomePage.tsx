import { usePaperData } from '../hooks/usePaperData';
import YearCard from './YearCard';
import { GraduationCap, Clock } from 'lucide-react';

export default function HomePage() {
  const { sections } = usePaperData();

  return (
    <div className="space-y-10">
      {/* Hero 区域 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E3A5F] via-[#2E5B8C] to-[#1E3A5F] p-8 md:p-12 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#D97706]/20 rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="w-6 h-6 text-[#F59E0B]" />
            <span className="text-sm font-medium text-blue-200 tracking-wide">POSTGRADUATE ENGLISH</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">
            考研英语（一）历年真题库
          </h2>
          <p className="text-base text-slate-300 max-w-xl mb-6">
            涵盖 1980 年至 2025 年共 46 年考研英语真题，支持在线预览真题试卷、答案速查和详细解析，助你高效备考。
          </p>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#F59E0B]" />
              46 年真题积累
            </span>
            <span className="flex items-center gap-1.5">
              <FileTextIcon />
              96 份 PDF 文件
            </span>
            <span>三大时期完整收录</span>
          </div>
        </div>
      </div>

      {/* 各时段分区 */}
      {sections.map((section) => (
        <section key={section.key}>
          <div className="flex items-center gap-3 mb-5">
            <div className={`h-px flex-1 max-w-[60px] rounded ${
              section.key === 'era-early' ? 'bg-amber-500' :
              section.key === 'era-classic' ? 'bg-blue-500' :
              'bg-emerald-500'
            }`} />
            <h3 className="text-xl font-semibold text-[#1E293B]">{section.title}</h3>
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-[#94A3B8]">{section.subtitle}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {section.years.map((year) => (
              <YearCard key={year.year} yearData={year} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** 小图标组件 */
function FileTextIcon() {
  return (
    <svg className="w-4 h-4 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
