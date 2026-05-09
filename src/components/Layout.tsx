import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header />
      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-[#94A3B8] border-t border-slate-200/60">
        <p>数据来源：桌面「考研英语（一）历年真题」文件夹</p>
      </footer>
    </div>
  );
}
