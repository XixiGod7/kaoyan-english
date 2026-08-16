# 考研英语一真题库 (Kaoyan English)

<div align="center">

![考研英语一真题库](public/icon-192.png)

### 2010–2026 考研英语一历年全真题库 · 艾宾浩斯智能遗忘曲线单词复习系统

[![GitHub Release](https://img.shields.io/github/v/release/XixiGod7/kaoyan-english?style=flat-square&color=blue)](https://github.com/XixiGod7/kaoyan-english/releases)
[![React](https://img.shields.io/badge/React-18.3.1-61dafb?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff?style=flat-square&logo=vite)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

[在线体验 / Release 下载](https://github.com/XixiGod7/kaoyan-english/releases) · [功能特性](#-核心功能亮点) · [快速上手](#-快速上手指南) · [技术架构](#-技术架构)

</div>

---

## 🌟 核心功能亮点

### 📚 1. 2010–2026 考研英语一全真题库
- **17 套完整真题 · 153 篇专项试卷**：全量收录 2010 至 2026 年考研英语一全部大纲真题；
- **全题型专业还原**：
  - **完形填空 (Use of English)**：严格按 1–20 递增题号精准定位，下划线与空缺位置高亮同步对应；
  - **传统阅读理解 (Reading Part A)**：四篇文章独立分页，每篇 5 题清晰独立作答，无干扰阅读体验；
  - **新题型 (Reading Part B)**：支持七选五、排序题、小标题对应等全题型卡片交互；
  - **英译汉 (Translation Part C)**：划分 5 个独立输入框，卡片尺寸自适应对齐，支持原文划线与题号双向跳转；
  - **应用文与短文写作 (Writing Part A/B)**：高清真题插图还原、大图灯箱无损放大查看，支持参考范文与 AI 辅助批阅；
- **全真答题卡**：支持常驻、一键折叠收起、右侧边缘悬浮唤出，自适应全屏宽度；
- **做题进度实时保存**：自动持久化保存做题记录与主客观题作答，支持断点无缝续作与一键清空重做。

### 🧠 2. 艾宾浩斯智能单词复习系统
- **762 个大纲核心重点词汇**：按历年真题考查频次严格排序，已标生词自动置顶优先复习；
- **遗忘曲线动态追踪**：根据艾宾浩斯记忆规律，提供 初识、1天、2天、4天、7天、15天 阶梯式记忆状态管理；
- **今日模糊词循环闭环**：标记为不熟/忘记的单词，今日自动循环加练直至完全掌握；
- **形近词 / 派生词串记**：考点语境、真题例句拓展，支持自定义每日增量复习目标；
- **双向高亮联动**：点击词表单词实时在真题库中高亮出处，再次点击取消选定。

### 💻 3. 极速离线与跨平台桌面应用
- **纯离线单文件运行**：提供打包构建的 `kaoyan-english-v1.0.0-standalone.html`，无需安装任何后端即可直接双击运行；
- **独立桌面应用模式**：内置 Windows (`.bat`) 与 macOS (`.command`) 一键启动脚本，支持极简无边框 App 模式；
- **PWA 支持**：支持在现代浏览器中直接点击「安装应用」离线使用；
- **数据自由备份与恢复**：学习进度与生词记录纯本地存储，支持标准 JSON 备份导出与跨设备无缝导入；
- **深色 / 浅色双主题**：精心调校的高对比度护眼色彩系统。

---

## 🚀 快速上手指南

### 方式一：直接下载离线单文件（最便捷，推荐）
1. 前往 [GitHub Releases 页面](https://github.com/XixiGod7/kaoyan-english/releases)；
2. 下载 `kaoyan-english-v1.0.0-standalone.html`；
3. 直接双击在任何现代浏览器（Chrome、Edge、Safari、Firefox）中打开即可使用，完全无需配置任何环境。

### 方式二：下载桌面离线运行包
1. 在 Releases 页面下载 `kaoyan-english-v1.0.0-offline.zip` 并解压；
2. **Windows 用户**：双击运行 `一键启动考研英语.bat`；
3. **macOS 用户**：双击运行 `一键启动_Mac.command`。

### 方式三：源码本地开发与构建
```bash
# 1. 克隆本仓库
git clone https://github.com/XixiGod7/kaoyan-english.git
cd kaoyan-english

# 2. 安装依赖
npm install

# 3. 启动本地开发服务
npm run dev

# 4. 构建单文件离线生产包
npm run build
```

---

## 📂 项目结构

```text
kaoyan-english/
├── dist/                      # 生产打包产物 (单文件 HTML)
├── public/
│   ├── data/                  # 2010-2026 年真题数据、高频词典、例句索引
│   ├── images/                # 真题插图与图表资产
│   ├── thumbs/                # 试卷全真预览缩略图
│   ├── manifest.json          # PWA 配置文件
│   └── sw.js                  # 离线 Service Worker
├── src/
│   ├── components/
│   │   ├── Header.tsx         # 顶部全宽导航栏与品牌 Logo
│   │   ├── ExamWall.tsx       # 2010-2026 真题库矩阵主视图
│   │   ├── QuizMode.tsx       # 全题型真题刷题与即时解析系统
│   │   ├── WordFreqSidebar.tsx # 左侧 762 高频词考频列表与多维筛选
│   │   ├── EbbinghausNotebookModal.tsx # 艾宾浩斯智能单词复习弹窗
│   │   ├── StudyProgressModal.tsx      # 个人刷题进度与学习档案看板
│   │   ├── DataBackupModal.tsx         # 学习数据 JSON 导入导出管理
│   │   └── DesktopAppModal.tsx         # 跨端桌面应用生成配置
│   ├── hooks/                 # 题目数据与作答状态 Hooks
│   ├── types/                 # TypeScript 核心类型定义
│   ├── utils/                 # 艾宾浩斯算法与答题进度持久化工具
│   ├── App.tsx                # 应用主入口与双栏布局管理
│   └── index.css              # 全局样式与 Tailwind 动画定义
├── scripts/                   # 数据抓取、清洗与端到端自动化测试脚本
├── package.json
└── vite.config.ts
```

---

## 🛠️ 技术架构

- **核心框架**：React 18 + TypeScript + Vite 5
- **样式与动画**：Tailwind CSS + Tailwind CSS Animate
- **数据管理**：纯本地 LocalStorage 离线持久化 + JSON 自由导出导入
- **单文件打包**：`vite-plugin-singlefile`
- **自动化测试**：Puppeteer 端到端功能与视觉无死角回归验证

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 开源。欢迎 Star、Fork 与提 Issue 建议！
