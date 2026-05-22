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

// 适配器：将真题伴侣的数组格式转换为原有的 ExamJsonData 格式
function transformZhentiData(year: number, rawArray: any[]): ExamJsonData {
  const sections: Record<string, JsonSection> = {};
  
  let fallbackNumber = 1;
  let maxQuestionNumber = 0;
  
  rawArray.forEach((rawSec, idx) => {
    const meta = rawSec.meta || {};
    const content = rawSec.content || {};
    
    // Extract article text
    let article = '';
    if (content.conts) {
      article = content.conts.map((c: any) => {
        if (!c.econt) return '';
        const econtVals = Array.isArray(c.econt) ? c.econt : Object.values(c.econt);
        return econtVals.map((e: any) => e.name || '').join(' ');
      }).join('\\n\\n');
    }
    
    // Extract questions
    const questions: JsonQuestion[] = [];
    const tms = content.tm || [];
    tms.forEach((tm: any) => {
      const choices: JsonChoice[] = [];
      const daan = tm.daan || {};
      const xx = daan.xx || [];
      const xxVals = Array.isArray(xx) ? xx : Object.values(xx);
      xxVals.forEach((opt: any) => {
        choices.push({
          label: opt.name || '',
          text: opt.subject || opt.val || ''
        });
      });
      
      const stemHtml = tm.tigan || '';
      const stem = stemHtml.replace(/<[^>]+>/g, '').trim();
      
      let qType = 'choice';
      if (meta.types === 9) qType = 'new_type';
      if (meta.types === 4) qType = 'translation';
      if (meta.types === 3) qType = meta.title?.includes('A') ? 'writing_small' : 'writing_big';
      
      const qNum = tm.num ? parseInt(tm.num, 10) : fallbackNumber++;
      if (qNum > maxQuestionNumber) maxQuestionNumber = qNum;
      
      questions.push({
        number: qNum,
        stem: stem,
        choices,
        type: qType
      });
    });
    
    const secTypeMap: Record<number, string> = {
      2: 'cloze',
      1: 'reading',
      9: 'new_type',
      4: 'translation',
      3: 'writing'
    };
    
    const typeStr = secTypeMap[meta.types] || 'unknown';
    
    const qCount = questions.length;
    const range: [number, number] = qCount > 0 
      ? [questions[0].number, questions[qCount - 1].number]
      : [fallbackNumber, fallbackNumber];
      
    sections[`sec_${idx}`] = {
      key: `sec_${idx}`,
      name: meta.title || 'Unknown',
      type: typeStr,
      question_range: range,
      article,
      questions
    };
  });
  
  return {
    year: year,
    filename: `${year}.json`,
    era: year >= 2010 ? 'english1' : 'early',
    era_label: year >= 2010 ? '英语一' : '早期考研英语',
    total_pages: 10,
    max_question_number: maxQuestionNumber,
    found_question_count: maxQuestionNumber,
    extracted_question_count: maxQuestionNumber,
    sections
  };
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
        
        const rawJson = await response.json();
        
        if (!cancelled) {
          // 如果是真题伴侣的数组格式，进行转换
          if (Array.isArray(rawJson)) {
            const transformedData = transformZhentiData(parseInt(year!, 10), rawJson);
            setData(transformedData);
          } else if (rawJson.sections && Object.keys(rawJson.sections).length > 0) {
            setData(rawJson);
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
