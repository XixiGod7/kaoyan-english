import PaperCard from './YearCard';
import { yearGroups } from '../data/papersData';

export default function HomePage() {
  return (
    <div>
      {/* ===== 页面标题区 ===== */}
      <header className="page-header" style={{ paddingTop: '1px' }}>
        <h1>
          历年<strong>考研</strong>英语真题在线
        </h1>
        <p className="subtitle">
          2010 - 2025年，历年十六套真题试卷（英语一）
        </p>

        {/* 功能入口 */}
        <div className="feature-pills" style={{ marginTop: '2rem' }}>
          <span className="feature-pill">
            👆 取词查词
          </span>
          <span className="feature-pill">
            🌐 句子翻译
          </span>
          <span className="feature-pill">
            ✏️ 手写、标注高亮
          </span>
        </div>

        <p
          className="hidden sm:block"
          style={{
            textAlign: 'center',
            marginTop: '2.5rem',
            paddingLeft: '1rem',
            paddingRight: '1rem',
            color: '#666',
            fontSize: '0.95rem',
          }}
        >
          考研英语试题、查答案、专家答案解析，收藏起来！
        </p>
      </header>

      {/* ===== 年份试卷列表 ===== */}
      <div className="content-body" style={{ marginTop: '2rem' }}>
        {yearGroups.map((group, idx) => (
          <div key={group.year}>
            {idx > 0 && <hr />}
            <section className="year-section">
              <h2 title={`${group.year}年`}>{group.year}年</h2>
              <div className="year-row">
                <div className="year-row-cont">
                  {group.papers.map((paper) => (
                    <PaperCard key={`${paper.year}-${paper.englishType}`} paper={paper} />
                  ))}
                </div>
              </div>
            </section>
          </div>
        ))}

        {/* ===== 底部安装提示 ===== */}
        <div className="bottom-install" style={{ marginTop: '4rem' }}>
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <a href="#" style={{ fontSize: '1.8rem' }}>
              📱 考研英语真题在线
            </a>
          </div>
          <br />
          <p style={{ fontSize: '1.8rem', fontWeight: 300, marginTop: '1rem' }}>
            电脑、平板、手机都可以使用
          </p>
        </div>

        <br /><br />
      </div>
    </div>
  );
}
