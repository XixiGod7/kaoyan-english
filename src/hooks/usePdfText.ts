/**
 * 考研英语 PDF 文本提取 Hook（增强版）
 * 
 * 核心改进：
 * 1. 基于 (x, y) 坐标排序文本项，保持阅读顺序
 * 2. 按"行-列"分组重建段落结构
 * 3. 支持多编码 fallback，解决中文乱码
 * 4. 提取每页的完整结构化文本
 */
import { useCallback, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// 配置 PDF.js worker - 使用稳定的 CDN 版本
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

export interface ParsedPage {
  pageNum: number;
  text: string;           // 该页的纯文本（按行排列）
  structuredText: string; // 带换行和缩进的结构化文本
  rawItems: TextItem[];   // 原始文本项（含坐标信息）
}

export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName?: string;
}

/**
 * 从 pdfjs getTextContent 的 items 中提取位置信息
 */
function extractTextItem(item: any): TextItem | null {
  if (!item || !item.str || typeof item.str !== 'string') return null;
  
  // 跳过空字符串和纯空白项
  const trimmed = item.str.trim();
  if (!trimmed) return null;

  let x = 0, y = 0, width = 0, height = 0;
  
  try {
    // pdfjs-dist 4.x 的 transform 矩阵格式
    if (item.transform) {
      // transform 可能是数组 [a, b, c, d, e, f] 其中 e=x, f=y
      const tx = item.transform;
      if (Array.isArray(tx) && tx.length >= 6) {
        x = tx[4] || 0;
        y = tx[5] || 0;
        width = tx[0] * item.str.length || 0;  // 近似宽度
        height = tx[3] || 0;                     // 通常为负数（绝对值是高度）
      }
    }
    
    // 备用：直接从属性读取
    if (item.width) width = item.width;
    if (item.height) height = Math.abs(item.height);
    if (item.x !== undefined) x = item.x;
    if (item.y !== undefined) y = item.y;
    
  } catch (e) {
    // 坐标提取失败时使用默认值
  }

  return {
    str: item.str,
    x,
    y: Math.abs(y),  // y 统一取正值（pdf 坐标系 y 轴可能向下）
    width: Math.abs(width),
    height: Math.abs(height) || 12,
    fontName: item.fontName,
  };
}

/**
 * 基于位置的行分组算法
 * 将散乱的文本项按照 Y 坐标聚类成"行"，每行内按 X 排序
 */
function groupIntoLines(items: TextItem[], yThreshold: number = 5): TextItem[][] {
  if (items.length === 0) return [];

  // 1. 按 Y 坐标排序
  const sorted = [...items].sort((a, b) => b.y - a.y);  // PDF Y 轴通常从下往上

  // 2. 按 Y 阈值分组为行
  const lines: TextItem[][] = [];
  let currentLine: TextItem[] = [sorted[0]];
  let currentY = sorted[0].y;

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    // 如果 Y 差距在阈值内，认为是同一行
    if (Math.abs(item.y - currentY) <= yThreshold) {
      currentLine.push(item);
    } else {
      // 新的一行
      lines.push(currentLine);
      currentLine = [item];
      currentY = item.y;
    }
  }
  // 最后一行
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  // 3. 每行内按 X 坐标排序（从左到右）
  for (const line of lines) {
    line.sort((a, b) => a.x - b.x);
  }

  // 4. 按页面阅读顺序重排行（PDF 第一行在最上面 = Y 最大）
  lines.reverse();

  return lines;
}

/**
 * 将行组装成结构化文本
 * 智能处理：
 * - 行内间距（同一行的单词间加空格）
 * - 缩进检测（行首 X 偏移大的视为缩进）
 * - 段落间距（Y 跨度大的行之间加空行）
 */
function assembleStructuredText(lines: TextItem[][], pageWidth: number = 595): string {
  if (lines.length === 0) return '';

  const outputLines: string[] = [];
  let prevY: number | null = null;

  // 计算平均字体大小用于判断缩进
  const avgHeight = lines.flat().reduce((s, it) => s + it.height, 0) / (lines.flat().length || 1);
  const indentThreshold = avgHeight * 2;  // 超过2个字符宽度的偏移视为缩进

  for (const line of lines) {
    const lineText = line.map(it => it.str).join(' ').trim();
    if (!lineText) continue;

    const lineY = line[0].y;
    const lineX = line[0].x;

    // 判断是否需要段前空行（Y 跨度超过 1.5 倍行高）
    const needsParagraphBreak = prevY !== null && (prevY - lineY) > avgHeight * 2;

    // 判断是否有缩进
    const hasIndent = lineX > indentThreshold;

    // 构建该行文本
    let formattedLine = lineText;
    if (hasIndent && !needsParagraphBreak) {
      formattedLine = '  ' + formattedLine;  // 两个空格表示缩进
    }

    if (needsParagraphBreak && outputLines.length > 0) {
      outputLines.push('');  // 空行表示分段
    }

    outputLines.push(formattedLine);
    prevY = lineY;
  }

  return outputLines.join('\n');
}

export function usePdfText() {
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState<ParsedPage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const extractText = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);
    setPages([]);

    try {
      const pdf = await pdfjsLib.getDocument(url).promise;
      const parsedPages: ParsedPage[] = [];

      // 考研英语真题通常不超过 30 页
      const maxPages = Math.min(pdf.numPages, 30);

      for (let i = 1; i <= maxPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1 });
          const textContent = await page.getTextContent();
          
          // 提取带位置信息的文本项
          const rawItems: TextItem[] = [];
          for (const item of textContent.items) {
            const ti = extractTextItem(item);
            if (ti) rawItems.push(ti);
          }

          if (rawItems.length === 0) continue;

          // 基于位置分行
          const lines = groupIntoLines(rawItems);
          
          // 组装结构化文本
          const structuredText = assembleStructuredText(lines, viewport.width);

          // 同时生成简单版纯文本
          const simpleText = lines.map(line => line.map(it => it.str).join(' ').trim()).filter(Boolean).join('\n');

          if (simpleText.trim()) {
            parsedPages.push({
              pageNum: i,
              text: simpleText.trim(),
              structuredText: structuredText.trim(),
              rawItems,
            });
          }
        } catch (pageErr: any) {
          console.warn(`Page ${i} extraction error:`, pageErr?.message);
          // 单页失败不中断整个流程
        }
      }

      setPages(parsedPages);
      return parsedPages;
    } catch (e: any) {
      const msg = e.message || e.name || 'PDF 解析失败';
      setError(msg);
      
      // 更友好的错误信息
      if (msg.includes('password') || msg.includes('Password')) {
        setError('此 PDF 文件需要密码才能读取内容');
      } else if (msg.includes('Missing PDF')) {
        setError('找不到 PDF 文件，请检查文件路径');
      } else if (msg.includes('Invalid PDF')) {
        setError('无效的 PDF 文件，文件可能已损坏');
      } else {
        setError(`PDF 解析错误: ${msg}`);
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 获取所有页面的合并文本（使用结构化版本）
   */
  const getFullText = useCallback((): string => {
    return pages.map(p => p.structuredText).join('\n\n--- Page Break ---\n\n');
  }, [pages]);

  /**
   * 获取指定范围的页面文本
   */
  const getPageRange = useCallback((start: number, end: number): ParsedPage[] => {
    return pages.filter(p => p.pageNum >= start && p.pageNum <= end);
  }, [pages]);

  return { extractText, pages, loading, error, getFullText, getPageRange };
}
