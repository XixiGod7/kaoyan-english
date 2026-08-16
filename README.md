# 考研英语一真题库 (Kaoyan English)

<div align="center">

<img src="public/icons/icon-192.png" width="120" height="120" alt="考研英语一真题库 Logo" style="border-radius: 24px; box-shadow: 0 8px 24px rgba(79, 70, 229, 0.25);" />

### 2010–2026 考研英语一历年全真题库 · 艾宾浩斯智能遗忘曲线单词复习系统

[![GitHub Release](https://img.shields.io/github/v/release/XixiGod7/kaoyan-english?style=flat-square&color=indigo)](https://github.com/XixiGod7/kaoyan-english/releases)
[![React](https://img.shields.io/badge/React-18.3.1-61dafb?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff?style=flat-square&logo=vite)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

[Release 离线包下载](https://github.com/XixiGod7/kaoyan-english/releases) · [核心特性](#-核心功能亮点) · [快速上手](#-快速上手指南) · [项目结构](#-项目结构) · [技术架构](#-技术架构)

</div>

---

## 🌟 核心功能亮点

### 📚 1. 2010–2026 考研英语一全真题库
- **17 套完整真题 · 153 篇专项试卷**：全量收录 2010 至 2026 年考研英语一全部大纲真题；
- **全题型专业深度还原**：
  - **完形填空 (Use of English)**：严格按 1–20 递增题号精准定位，下划线与空缺位置高亮同步对应；
  - **传统阅读理解 (Reading Part A)**：四篇文章独立分页布局，每篇 5 题清晰独立作答，沉浸无干扰；
  - **新题型 (Reading Part B)**：支持七选五、排序题、小标题对应等全题型交互卡片；
  - **英译汉 (Translation Part C)**：划分 5 个独立输入框，卡片尺寸自适应对齐，支持原文划线与题号双向跳转；
  - **应用文与短文写作 (Writing Part A/B)**：高清真题插图还原、大图灯箱无损放大查看，支持参考范文与 AI 辅助批阅；
- **全真答题卡**：支持常驻、一键折叠收起、右侧边缘悬浮唤出，自适应全屏宽度；
- **做题进度实时保存**：自动持久化保存做题记录与主客观题作答，支持断点无缝续作与一键清空重做。

### 🧠 2. 艾宾浩斯智能单词复习系统
- **762 个大纲核心重点词汇**：按历年真题考查频次严格排序，已标生词自动置顶优先复习；
- **遗忘曲线动态追踪**：根据艾宾浩斯记忆规律，提供 **初识、1天、2天、4天、7天、15天** 阶梯式记忆状态管理；
- **今日模糊词循环闭环**：标记为不熟/忘记的单词，今日自动循环加练直至完全掌握；
- **形近词 / 派生词串记**：考点语境、真题例句拓展，支持自定义每日增量复习目标；
- **双向高亮联动**：点击词表单词实时在真题库中高亮出处，再次点击取消选定。

### 💻 3. 极速离线与跨平台桌面应用
- **跨平台一键开箱即用**：内置 Windows (`.bat`) 与 macOS (`.command`) 极速启动器，双击自动启动本地轻量服务并打开浏览器；
- **PWA & 原生独立桌面应用**：支持在 Chrome、Edge 与 Safari 中一键安装到桌面和 Dock 程序坞，极简无边框，随开随关；
- **随手关闭零残留**：直接关闭启动时打开的命令行终端窗口，后台服务即会自动停止退出；
- **数据自由备份与恢复**：学习进度与生词记录纯本地存储，支持标准 JSON 备份导出与跨设备无缝导入；
- **深色 / 浅色双主题**：精心调校的高对比度护眼色彩系统，夜间刷题更舒适。

---

## 🚀 快速上手指南

### 方式一：浏览器一键安装为桌面独立 App（最推荐 · 真正一步到位 · 免启动服务）
1. 在 Chrome、Edge 或 Safari 浏览器中打开在线站点：[**https://xixigod7.github.io/kaoyan-english/**](https://xixigod7.github.io/kaoyan-english/)；
2. **安装到桌面**：
   - **Chrome / Edge**：点击地址栏右侧的 **「安装应用」** 图标（或在页面右上角点击 **「桌面 App」**）；
   - **Safari (macOS Sonoma+)**：点击顶部菜单栏 **「文件」** $\rightarrow$ **「添加到程序坞 (Add to Dock...)」**；
3. **一步到位体验**：安装后，桌面/程序坞将直接生成带有专属书本图标的原生 App。**之后任何时候只需双击桌面图标即可直接秒开进入刷题，完全无需启动任何服务或运行任何脚本！**（已内置 Service Worker 全量离线缓存，即使断网也能 100% 离线使用）。

### 方式二：下载离线压缩包本地运行
1. 前往 [GitHub Releases 页面](https://github.com/XixiGod7/kaoyan-english/releases/tag/v1.0.0) 下载 **`kaoyan-english-v1.0.0-offline.zip`** 并解压；
2. **极速运行**：
   - **macOS 用户**：解压后直接双击 **`考研英语一真题库.app`** 即可一步直达（也可拖动到「应用程序」或桌面常驻，系统会在后台静默唤醒服务并无边框秒开）；
   - **Windows 用户**：双击 **`启动考研英语(无黑框后台运行).vbs`**（静默秒开）或 **`一键启动考研英语.bat`**。

### 方式三：源码本地开发与构建
```bash
# 1. 克隆本仓库
git clone https://github.com/XixiGod7/kaoyan-english.git
cd kaoyan-english

# 2. 安装依赖
npm install

# 3. 启动本地开发服务
npm run dev

# 4. 构建生产产物
npm run build

# 5. 生成离线发布包 (打包至 kaoyan-english-v1.0.0-offline.zip)
python scripts/package_release.py
```

---

## 📂 项目结构

```text
kaoyan-english/
├── dist/                          # 生产打包产物 (单文件生产 HTML)
├── public/
│   ├── data/                      # 2010-2026 年真题数据、762 考频词典、真题例句索引
│   ├── icons/                     # 专属高清应用图标 (512/192/180/64/32) 与 PWA manifest.json
│   ├── images/                    # 写作真题高清插图与图表资产
│   ├── thumbs/                    # 试卷全真预览缩略图
│   └── sw.js                      # 离线 Service Worker
├── src/
│   ├── components/
│   │   ├── Header.tsx             # 顶部全宽导航栏与品牌 Logo
│   │   ├── ExamWall.tsx           # 2010-2026 真题库矩阵主视图
│   │   ├── QuizMode.tsx           # 全题型真题刷题与即时解析系统
│   │   ├── WordFreqSidebar.tsx    # 左侧 762 高频词考频列表与多维筛选
│   │   ├── EbbinghausNotebookModal.tsx # 艾宾浩斯智能单词复习弹窗
│   │   ├── StudyProgressModal.tsx # 个人刷题进度与学习档案看板
│   │   ├── DataBackupModal.tsx    # 学习数据 JSON 导入导出管理
│   │   └── DesktopAppModal.tsx    # 跨端桌面应用生成配置与指引
│   ├── hooks/                     # 题目数据与作答状态 Hooks
│   ├── types/                     # TypeScript 核心类型定义
│   ├── utils/                     # 艾宾浩斯算法与答题进度持久化工具
│   ├── App.tsx                    # 应用主入口与双栏布局管理
│   └── index.css                  # 全局样式与 Tailwind 动画定义
├── scripts/                       # 离线服务测试、打包与发布脚本
│   ├── package_release.py         # 离线包打包与 Zip 生成脚本
│   ├── update_launchers.py        # 跨平台一键启动脚本与轻量本地服务
│   └── verify_offline_server_endpoints.py # 全端点自动化测试验证
├── server.py                      # 本地轻量跨平台 Python 服务端
├── 一键启动考研英语.bat            # Windows 一键启动脚本
├── 一键启动_Mac.command            # macOS 一键启动脚本 (纯 Unix LF 换行)
├── package.json
└── vite.config.ts
```

---

## 🛠️ 技术架构

- **核心框架**：React 18 + TypeScript + Vite 5
- **样式与动画**：Tailwind CSS + Tailwind CSS Animate + Lucide React 图标
- **数据与状态管理**：纯本地 LocalStorage 离线持久化 + JSON 自由导出导入
- **单文件打包构建**：`vite-plugin-singlefile`
- **自动化测试**：Puppeteer 端到端功能与视觉无死角回归验证

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 开源。欢迎 Star、Fork 与提 Issue 建议！
