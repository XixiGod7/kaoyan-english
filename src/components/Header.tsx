import { BookOpenText } from 'lucide-react';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1E3A5F] to-[#2E5B8C] flex items-center justify-center shadow-md">
            <BookOpenText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#1E293B] leading-tight">考研英语真题库</h1>
            <p className="text-xs text-[#64748B] -mt-0.5">1980-2025 历年真题 · 答案 · 解析</p>
          </div>
        </div>
        <nav className="flex items-center gap-6">
          <a
            href="/"
            className="text-sm font-medium text-[#1E293B] hover:text-[#D97706] transition-colors duration-200"
          >
            首页
          </a>
          <div className="w-px h-4 bg-slate-300" />
          <span className="text-xs text-[#94A3B8] bg-slate-100 px-2.5 py-1 rounded-full">
            共 {32} 个年份 · 96 份试卷
          </span>
        </nav>
      </div>
    </header>
  );
}
