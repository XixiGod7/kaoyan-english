import { Link } from 'react-router-dom';
import type { PaperEntry } from '../types/paper';
import { getCoverEraClass } from '../data/papersData';

interface PaperCardProps {
  paper: PaperEntry;
}

export default function PaperCard({ paper }: PaperCardProps) {
  const yearNum = parseInt(paper.year, 10);
  const eraClass = getCoverEraClass(yearNum);

  return (
    <Link
      to={`/year/${paper.year}`}
      className="paper-card-link"
    >
      <div className="paper-card">
        {/* 封面 — CSS 渐变风格 */}
        <div className={`css-cover ${eraClass}`}>
          <div className="cover-year">{paper.year}</div>
          <div className="cover-label">考研 · {paper.englishLabel}</div>
          <div className="cover-icon">📄</div>
        </div>

        {/* 底部信息栏 */}
        <div className="card-overlay">
          <div className="card-title">
            {paper.year}年{' '}
            <span className="english-type">{paper.englishLabel}</span>
          </div>
          <progress max={100} value={paper.progress} />
        </div>

        {/* "新" 角标 */}
        {paper.isLatest && (
          <span className="latest-badge">新</span>
        )}
      </div>
    </Link>
  );
}
