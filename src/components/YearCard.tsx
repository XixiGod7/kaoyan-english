import { useNavigate } from 'react-router-dom';
import { FileText, ClipboardCheck, BookOpen } from 'lucide-react';
import type { PaperYear } from '../types/paper';

interface YearCardProps {
  yearData: PaperYear;
}

const typeConfig: Record<string, { icon: typeof FileText; color: string; label: string }> = {
  exam: { icon: FileText, color: 'bg-blue-100 text-blue-700', label: '真题' },
  answer: { icon: ClipboardCheck, color: 'bg-emerald-100 text-emerald-700', label: '答案' },
  analysis: { icon: BookOpen, color: 'bg-amber-100 text-amber-700', label: '解析' },
};

export default function YearCard({ yearData }: YearCardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/year/${yearData.year}`)}
      className="group relative bg-white rounded-2xl p-5 border border-slate-200/70 shadow-sm
                 hover:shadow-lg hover:-translate-y-1 hover:border-[#2E5B8C]/30
                 transition-all duration-300 ease-out cursor-pointer w-full text-left"
    >
      {/* 年份大号数字 */}
      <div className="text-3xl font-bold text-[#1E3A5F] group-hover:text-[#D97706] transition-colors duration-300">
        {yearData.year}
      </div>

      {/* 资源类型标签 */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {yearData.resources.map((res) => {
          const cfg = typeConfig[res.type];
          const Icon = cfg.icon;
          return (
            <span
              key={res.type}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}
            >
              <Icon className="w-3 h-3" />
              {cfg.label}
            </span>
          );
        })}
      </div>

      {/* Hover 提示箭头 */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <svg className="w-5 h-5 text-[#D97706]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
