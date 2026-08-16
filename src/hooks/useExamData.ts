/**
 * 加载预生成的考试结构化JSON数据
 * 
 * 数据来源: 动态拉取 /data/{year}.json
 */
import { useState, useEffect, useCallback } from 'react';

export interface JsonChoice {
  label: string;
  text: string;
}

export interface JsonQuestion {
  number: number;
  stem: string;
  choices: JsonChoice[];
  type: string;
}

export interface JsonTextGroup {
  text_num: number;
  article: string;
  questions: JsonQuestion[];
}

export interface JsonSection {
  key: string;
  name: string;
  type: string;
  question_range: [number, number];
  article?: string;
  images?: string[];
  questions: JsonQuestion[];
  warnings?: string[];
  texts?: JsonTextGroup[];
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    console.log('[useExamData] effect triggered, year=', year);
    
    if (!year) {
      setData(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);
    
    // Add cache-busting timestamp to avoid browser caching old JSON after edit
    const url = `/data/${year}.json?t=${Date.now()}`;

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => {
        if (!isMounted) return;
        if (json && json.sections && Object.keys(json.sections).length > 0) {
          Object.keys(json.sections).forEach(k => {
            json.sections[k].key = k;
          });
          setData(json);
        } else {
          setError('数据格式错误：缺少 sections 字段');
        }
      })
      .catch((e: any) => {
        if (!isMounted) return;
        console.error(`[useExamData] Failed to load ${year}:`, e);
        setError(e.message || `无法加载 ${year} 年的试题数据`);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [year, refreshTrigger]);

  return { data, loading, error, refresh };
}
