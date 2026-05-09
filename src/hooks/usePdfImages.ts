/**
 * PDF 页面渲染为图片的 Hook
 * 
 * 核心思路：不依赖文本解析，直接把 PDF 每页渲染成高清 Canvas 图片
 * 保留原始排版、字体、格式，零信息丢失
 */
import { useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// 配置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

export interface PageImage {
  pageNum: number;
  imageUrl: string;       // dataURL (base64 PNG)
  width: number;          // 原始页面宽度 (px, scale=1)
  height: number;         // 原始页面高度
  renderScale: number;    // 实际渲染缩放倍数
}

interface UsePdfImagesReturn {
  pageImages: PageImage[];
  loading: boolean;
  progress: number;       // 0~100 渲染进度
  error: string | null;
  totalPages: number;
  renderToImages: (url: string, scale?: number) => Promise<PageImage[]>;
}

/**
 * 将 PDF 的每一页渲染为高清 Canvas 图片
 * @param url PDF 文件路径或 URL
 * @param scale 渲染分辨率倍数（默认 2x，即 Retina 级别清晰度）
 */
export function usePdfImages(): UsePdfImagesReturn {
  const [pageImages, setPageImages] = useState<PageImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);

  const renderToImages = useCallback(async (url: string, scale: number = 2): Promise<PageImage[]> => {
    setLoading(true);
    setError(null);
    setProgress(0);
    setPageImages([]);

    try {
      const pdf = await pdfjsLib.getDocument(url).promise;
      const numPages = Math.min(pdf.numPages, 30); // 考研真题最多30页
      setTotalPages(numPages);

      const images: PageImage[] = [];

      for (let i = 1; i <= numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale });
          
          // 创建 Canvas 并设置尺寸
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error(`Page ${i}: 无法获取 Canvas context`);

          // 白色背景（PDF 默认透明）
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // 渲染 PDF 页面到 Canvas
          await page.render({
            canvasContext: ctx,
            viewport,
          }).promise;

          // 转为 base64 data URL
          const imageUrl = canvas.toDataURL('image/png', 1.0);

          images.push({
            pageNum: i,
            imageUrl,
            width: viewport.width,
            height: viewport.height,
            renderScale: scale,
          });

          // 更新进度
          setProgress(Math.round((i / numPages) * 100));

          // 避免阻塞 UI，每页之间让出一点时间
          await new Promise(r => setTimeout(r, 10));

        } catch (pageErr: any) {
          console.warn(`[usePdfImages] Page ${i} render error:`, pageErr?.message);
          // 单页失败不中断整体
        }
      }

      setPageImages(images);
      setLoading(false);
      return images;

    } catch (e: any) {
      const msg = e.message || 'PDF 加载失败';
      
      if (msg.includes('password') || msg.includes('Password')) {
        setError('此 PDF 需要密码');
      } else if (msg.includes('Missing PDF')) {
        setError('找不到 PDF 文件');
      } else if (msg.includes('Invalid PDF')) {
        setError('无效的 PDF 文件');
      } else {
        setError(`PDF 错误: ${msg}`);
      }
      
      setLoading(false);
      return [];
    }
  }, []);

  return { pageImages, loading, progress, error, totalPages, renderToImages };
}

/**
 * 辅助函数：将单页 PDF 渲染为图片（用于按需加载）
 */
export async function renderSinglePage(
  url: string,
  pageNum: number,
  scale: number = 2
): Promise<PageImage | null> {
  try {
    const pdf = await pdfjsLib.getDocument(url).promise;
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    return {
      pageNum,
      imageUrl: canvas.toDataURL('image/png', 1.0),
      width: viewport.width,
      height: viewport.height,
      renderScale: scale,
    };
  } catch (e) {
    console.error(`[renderSinglePage] Page ${pageNum} error:`, e);
    return null;
  }
}
