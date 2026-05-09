import type { PaperResource } from '../types/paper';

interface ResourceTabsProps {
  resources: PaperResource[];
  activeType: string;
  onChange: (type: string) => void;
}

const tabConfig: Record<string, { label: string; icon: JSX.Element; color: string }> = {
  exam: {
    label: '真题试卷',
    color: '#3B82F6',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  answer: {
    label: '答案速查',
    color: '#10B981',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  analysis: {
    label: '详细解析',
    color: '#D97706',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
};

const tabOrder = ['exam', 'answer', 'analysis'];

export default function ResourceTabs({ resources, activeType, onChange }: ResourceTabsProps) {
  const availableTypes = tabOrder.filter((t) => resources.some((r) => r.type === t));

  return (
    <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
      {availableTypes.map((type) => {
        const cfg = tabConfig[type];
        const isActive = activeType === type;
        return (
          <button
            key={type}
            onClick={() => onChange(type)}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium
                       transition-all duration-200 cursor-pointer ${
              isActive
                ? 'bg-white text-[#1E293B] shadow-sm'
                : 'text-[#64748B] hover:text-[#1E293B]'
            }`}
            style={{
              borderBottom: isActive ? `2px solid ${cfg.color}` : undefined,
              marginBottom: isActive ? '-1px' : undefined,
            }}
          >
            <span style={{ color: isActive ? cfg.color : '#94A3B8' }}>{cfg.icon}</span>
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}
