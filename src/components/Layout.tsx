import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <main className="bd-masthead">
        <Header onGoHome={() => {}} />
        {children}
      </main>

      {/* 底部版权 */}
      <div className="copyright">
        <p>
          <a className="item" href="#">常见问题</a>
          {'    '}
          <a className="item" href="#">联系我们</a>
        </p>
        <p style={{ marginTop: '1rem' }}>
          数据来源：考研英语（一）历年真题 · 仅供学习参考
        </p>
      </div>
    </div>
  );
}
