/**
 * 加载预生成的考试结构化JSON数据
 * 
 * 数据来源: /public/data/{year}.json (由 pdf_to_json.py 脚本生成)
 * 不再依赖浏览器端 PDF 文本解析
 */
import { useState, useEffect } from 'react';

export interface JsonChoice {
  label: string;
  text: string;
}

export interface JsonQuestion {
  number: number;
  stem: string;
  choices: JsonChoice[];
  type: string;  // 'choice', 'new_type', 'translation', 'writing_small', 'writing_big'
}

export interface JsonTextGroup {
  text_num: number;
  article: string;
  questions: JsonQuestion[];
}

export interface JsonSection {
  key: string;
  name: string;
  type: string;   // 'cloze', 'reading', 'reading-a', 'new_type', 'translation', 'writing_small', 'writing_big'
  question_range: [number, number];
  article?: string;
  questions: JsonQuestion[];
  warnings?: string[];
  texts?: JsonTextGroup[];   // 阅读A节拆分后的 Text 1-4 分组
}

export interface ExamJsonData {
  year: number;
  filename: string;
  era: string;
  era_label: string;
  total_pages: number;
  max_question_number: number;
  found_question_count: number;
  extracted_question_count: number;
  sections: Record<string, JsonSection>;
}

export function useExamData(year: string | undefined) {
  const [data, setData] = useState<ExamJsonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[useExamData] effect triggered, year=', year);
    
    if (!year) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/data/${year}.json`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: 数据文件不存在 (${year}.json)`);
        }
        
        const json: ExamJsonData = await response.json();
        
        if (!cancelled) {
          // 验证基本结构
          if (json.sections && Object.keys(json.sections).length > 0) {
            setData(json);
          } else {
            setError('数据格式错误：缺少 sections 字段');
          }
        }
      } catch (e: any) {
        console.error(`[useExamData] Failed to load ${year}:`, e);
        if (!cancelled) {
          setError(e.message || `无法加载 ${year} 年的试题数据`);
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => { cancelled = true; };
  }, [year]);

  return { data, loading, error };
}
