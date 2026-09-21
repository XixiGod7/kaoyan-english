import React from 'react';
import {
  BookOpen,
  FileText,
  Target,
  Sparkles,
  Award,
  Layers,
  CheckCircle2,
  ArrowRight,
  BrainCircuit,
  PenTool,
  Languages,
  RotateCcw,
  Zap,
  BookmarkCheck,
  BarChart3,
  HardDriveDownload,
  Flame,
  ShieldCheck,
  Cpu,
  GraduationCap
} from 'lucide-react';
import { AppTab } from './Header';

interface HomeViewProps {
  theme?: 'dark' | 'light';
  onNavigateTab: (tab: AppTab) => void;
  onOpenEbbinghaus?: () => void;
  onOpenProgress?: () => void;
  onOpenAiConfig?: () => void;
  onOpenBackup?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  theme = 'dark',
  onNavigateTab,
  onOpenEbbinghaus,
  onOpenProgress,
  onOpenAiConfig,
  onOpenBackup,
}) => {
  const isDark = theme === 'dark';

  // 6 Main Core Functional Zones
  const coreFeatures = [
    {
      id: 'reading',
      title: '长难句逐句精读拆解',
      subtitle: '自然段聚合排版 · 语法树主干提取 · 顺读门槛测评',
      desc: '收录 2010-2026 全真考研英语一阅读 Part A 全篇。以自然段落为单位聚合排版，每句提供主谓宾主干提取与修饰成分层级剖析，搭配官方标准译文、生词覆盖门槛分析与 AI 助教答疑。',
      badge: '重磅核心',
      badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
      icon: BookOpen,
      iconColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
      actionText: '进入 2026 精读 →',
      onClick: () => onNavigateTab('reading'),
      features: ['自然段聚合排版，行文自然', '句子核心主干 (Trunk) 自动提取', '大纲词汇顺读门槛与生词分析', 'AI 考研长难句助教深度剖析']
    },
    {
      id: 'quiz',
      title: '全真真题模拟考场',
      subtitle: '2010-2026 卷面全真还原 · 真实考场计时 · 自动判分',
      desc: '完整涵盖完形填空 (1-20)、阅读 Text 1~4 (21-40)、新题型 (41-45)、英译汉 (46-50) 以及大小作文 (51-52)。支持左右双栏对照沉浸阅读、答题卡涂卡作答、自动批改与逐题详细解析。',
      badge: '模考实战',
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      icon: FileText,
      iconColor: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60',
      actionText: '开启真题模考 →',
      onClick: () => onNavigateTab('quiz'),
      features: ['2010-2026 连续 17 年考研真题卷', '双栏分屏沉浸阅读与涂卡体验', '全套试题答案与考点深度解析', '考试计时与历次刷题档案统计']
    },
    {
      id: 'vocab',
      title: '词汇盲区速测与考纲覆盖',
      subtitle: '40 词科学三阶抽测 · 6673 考纲词掌握度',
      desc: '2 分钟快速摸清考研词面底盘！严选真题高频核心、冲刺提分与生僻拔尖三大梯队词汇，支持“认识/不认识”即时核对释义与双向反悔改判，精准诊断考研词汇储备与短板弱项。',
      badge: '摸底神器',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      icon: Target,
      iconColor: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
      actionText: '2 分钟速测盲区 →',
      onClick: () => onNavigateTab('vocab'),
      features: ['40 题考研真题真实词频科学抽样', '认识/不认识即时揭晓词义与音标', '支持双向反悔改判，杜绝误触', '全面统计 6,673 词考纲掌握比例']
    },
    {
      id: 'translation',
      title: '英译汉划线句专项突破',
      subtitle: 'Part C 划线翻译 · 考研大纲评分 AI 诊断报告',
      desc: '精选历年真题阅读 Part C 翻译长难句。支持考生自主中文作答打卡，揭晓官方标准参考译文与句子主干拆解，并调用大模型根据考研评分细则出具采分点分析与 2.0 分满分诊断报告。',
      badge: '翻译专项',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
      icon: Languages,
      iconColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
      actionText: '开始翻译练习 →',
      onClick: () => onNavigateTab('translation'),
      features: ['历年 Part C 经典翻译划线真题', '中英独立翻译作答与本地自动保存', 'AI 老师评分诊断报告 (满分2.0分)', '官方标准参考译文对照与拆解']
    },
    {
      id: 'essay',
      title: '考研写作实战与 AI 智能批改',
      subtitle: 'Part A 应用文 + Part B 图画论说文 · 满分范文',
      desc: '收录历年小作文（书信/告示等应用文）与大作文（经典图画论说文）。支持模拟真实写作限时计时、实时字数预警、AI 考研阅卷组多维智能打分诊断以及满分高分范文解析。',
      badge: '写作提分',
      badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800',
      icon: PenTool,
      iconColor: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60',
      actionText: '开始写作批改 →',
      onClick: () => onNavigateTab('essay'),
      features: ['Part A 10分应用文 + Part B 20分大作文', '真题清晰插图与全屏大图预览', '词数实时监控与模拟考场计时器', 'AI 考研大纲诊断报告与满分范文']
    },
    {
      id: 'ebbinghaus',
      title: '艾宾浩斯抗遗忘背词系统',
      subtitle: '科学记忆曲线 · 762+ 重点词循环巩固',
      desc: '严格遵循 1、2、4、7、15 天艾宾浩斯记忆遗忘规律。结合真题考频倒序智能推送复习队列，支持一键切换熟词/生词/未掌握状态，让每个单词牢牢刻在长期记忆中。',
      badge: '抗遗忘',
      badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
      icon: BrainCircuit,
      iconColor: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60',
      actionText: '打开背词本 →',
      onClick: () => onOpenEbbinghaus?.(),
      features: ['严格遵循艾宾浩斯科学复习周期', '真题出现考频从高到低精准规划', '熟词/生词/未知三态即时打卡', '随时打开背词弹窗，边读边背']
    }
  ];

  // Secondary Practice Features
  const specializedDrills = [
    {
      id: 'paraphrase',
      title: '同义替换专项突破 (200题)',
      desc: '攻克考研阅读最大命题陷阱！训练题干与原文的近义词变形、反义正说与上下义转换。',
      icon: Sparkles,
      iconBg: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400',
      tab: 'paraphrase' as AppTab,
    },
    {
      id: 'sentence-review',
      title: '长难句随机复习抽背',
      desc: '从历年 1,200+ 句库中随机抽题自测，隐藏译文检验独立读懂能力，并呼叫 AI 助教答疑。',
      icon: RotateCcw,
      iconBg: 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400',
      tab: 'sentence-review' as AppTab,
    },
    {
      id: 'grammar',
      title: '10 大高频语法专项攻坚',
      desc: '定语从句、状语从句、名词性从句、倒装句、虚拟语气等考研高频语法专项系统刷题。',
      icon: Layers,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
      tab: 'grammar' as AppTab,
    },
    {
      id: 'phrases',
      title: '历年真题核心短语搭配',
      desc: '汇聚历年真题高频动词短语与介词固定搭配，结合真题原句听读与语境记忆。',
      icon: BookmarkCheck,
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
      tab: 'phrases' as AppTab,
    },
    {
      id: 'personal',
      title: '个人备考中心 & 学习档案',
      desc: '多维查看做题正确率、难句收藏夹、错题重练本与生词分布，全方位跟踪备考成效。',
      icon: BarChart3,
      iconBg: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400',
      tab: 'personal' as AppTab,
    },
    {
      id: 'backup',
      title: '数据离线备份与跨端迁移',
      desc: '学习记录、背词打卡、生词本完全保存在本地浏览器中，支持一键 JSON 导出与恢复。',
      icon: HardDriveDownload,
      iconBg: 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400',
      onClick: onOpenBackup,
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12 sm:space-y-16 animate-in fade-in duration-300">
      {/* 1. Hero Section */}
      <section className="relative rounded-3xl p-6 sm:p-10 lg:p-12 overflow-hidden border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 dark:from-slate-900/95 dark:via-slate-900/90 dark:to-indigo-950/40 shadow-sm">
        {/* Background glow & decorative shapes */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-blue-400/10 dark:bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-72 h-72 rounded-full bg-indigo-400/10 dark:bg-blue-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-5 sm:space-y-6">
          {/* Top highlight badges */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 text-white font-bold shadow-xs">
              <GraduationCap className="w-3.5 h-3.5" />
              考研英语一专属备战平台
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              收录 2010–2026 全年真题
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-200 dark:border-indigo-800">
              <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              AI 考研名师大模型答疑
            </span>
          </div>

          {/* Main Title & Slogan */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              真题为王 · 句法为骨
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 mt-1">
                考研英语一全真真题学习库
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-sans max-w-2xl">
              深度融合自然段长难句精读、全真考场计时模考、40题词汇盲区速测、Part C 划线翻译、大小作文 AI 阅卷以及艾宾浩斯抗遗忘背词，助你构建扎实而高效的考研英语底盘。
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap pt-2">
            <button
              type="button"
              onClick={() => onNavigateTab('reading')}
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-sm font-bold flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>开启 2026 长难句精读</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('quiz')}
              className="px-5 py-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 active:scale-98 text-slate-800 dark:text-slate-200 text-sm font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-blue-500" />
              <span>进入全真模考卷</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('vocab')}
              className="px-5 py-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 active:scale-98 text-amber-800 dark:text-amber-200 text-sm font-bold border border-amber-200 dark:border-amber-800/80 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Flame className="w-4 h-4 text-amber-500" />
              <span>2 分钟词汇盲区摸底</span>
            </button>
          </div>

          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/80 text-xs">
            <div>
              <span className="block text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">17 年</span>
              <span className="text-slate-500 dark:text-slate-400">2010-2026 全真收录</span>
            </div>
            <div>
              <span className="block text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">6,673 词</span>
              <span className="text-slate-500 dark:text-slate-400">考研大纲真题全量库</span>
            </div>
            <div>
              <span className="block text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">1,200+ 句</span>
              <span className="text-slate-500 dark:text-slate-400">主干修饰语法树拆解</span>
            </div>
            <div>
              <span className="block text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">100% 本地</span>
              <span className="text-slate-500 dark:text-slate-400">离线可用 · 数据私密</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Core Functional Modules Section (6 Large Cards) */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
          <div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase">
              Core Capabilities
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              六大考研核心备战板块
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            点击任意板块即可直接跳转至对应功能区
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coreFeatures.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.id}
                onClick={feat.onClick}
                className="group relative rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/90 p-6 flex flex-col justify-between shadow-xs hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-600 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
              >
                {/* Decorative background hover sheen */}
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />

                <div className="space-y-4">
                  {/* Card Header: Icon + Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${feat.iconColor}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${feat.badgeColor}`}>
                      {feat.badge}
                    </span>
                  </div>

                  {/* Title & Subtitle */}
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {feat.title}
                    </h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                      {feat.subtitle}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                    {feat.desc}
                  </p>

                  {/* Bullet points */}
                  <ul className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400">
                    {feat.features.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bottom Action Bar */}
                <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    <span>{feat.actionText}</span>
                  </span>
                  <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Specialized Drill Matrix (6 Secondary Cards) */}
      <section className="space-y-6">
        <div className="border-b border-slate-200/80 dark:border-slate-800 pb-3">
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase">
            Targeted Training
          </span>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            专项提分训练与保障工具
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {specializedDrills.map((drill) => {
            const Icon = drill.icon;
            return (
              <div
                key={drill.id}
                onClick={() => {
                  if (drill.tab) onNavigateTab(drill.tab);
                  else if (drill.onClick) drill.onClick();
                }}
                className="group rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 p-4.5 flex items-start gap-3.5 shadow-2xs hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-600 hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${drill.iconBg}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                      {drill.title}
                    </h4>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {drill.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Platform Safety & Offline Architecture Banner */}
      <section className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-100/60 dark:bg-slate-900/60 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              离线优先架构 · 学习数据 100% 掌握在自己手中
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            无需强制联网登录，做题记录、难句收藏、背词打卡均保存在本地存储中。支持一键导出备份文件，换电脑换浏览器轻松迁移。
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap justify-center">
          <button
            type="button"
            onClick={onOpenBackup}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <HardDriveDownload className="w-3.5 h-3.5 text-blue-500" />
            <span>备份与恢复学习记录</span>
          </button>

          <button
            type="button"
            onClick={onOpenAiConfig}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>配置自定义 AI 大模型</span>
          </button>
        </div>
      </section>
    </div>
  );
};
