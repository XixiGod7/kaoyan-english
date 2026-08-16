import type { PaperResource } from '../types/paper';

interface ResourceTabsProps {
  resources: PaperResource[];
  activeType: string;
  onChange: (type: string) => void;
}

const tabConfig: Record<string, { label: string; icon: string; color: string }> = {
  exam: {
    label: '真题试卷',
    color: '#2E3192',
    icon: '📄',
  },
  answer: {
    label: '答案速查',
    color: '#10B981',
    icon: '✅',
  },
  analysis: {
    label: '详细解析',
    color: '#FF8247',
    icon: '📖',
  },
};

const tabOrder = ['exam', 'answer', 'analysis'];

export default function ResourceTabs({ resources, activeType, onChange }: ResourceTabsProps) {
  const availableTypes = tabOrder.filter((t) => resources.some((r) => r.type === t));

  return (
    <div style={{
      display: 'flex',
      gap: 1,
      padding: 2,
      background: '#f1f5f9',
      borderRadius: '8px',
      width: 'fit-content',
    }}>
      {availableTypes.map((type) => {
        const cfg = tabConfig[type];
        const isActive = activeType === type;
        return (
          <button
            key={type}
            onClick={() => onChange(type)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: isActive ? 600 : 400,
              background: isActive ? '#fff' : 'transparent',
              color: isActive ? '#1a1a1a' : '#64748B',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              borderBottom: isActive ? `2px solid ${cfg.color}` : '2px solid transparent',
              whiteSpace: 'nowrap' as const,
            }}
          >
            <span>{cfg.icon}</span>
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}
