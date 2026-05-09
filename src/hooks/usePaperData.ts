import { useMemo } from 'react';
import type { PaperYear, ResourceType } from '../types/paper';
import { getAllYears, eraSections } from '../data/papersData';

export function usePaperData(filter?: ResourceType | 'all') {
  const years = useMemo(() => {
    if (!filter || filter === 'all') return getAllYears();
    return getAllYears().map((y) => ({
      ...y,
      resources: y.resources.filter((r) => r.type === filter),
    })).filter((y) => y.resources.length > 0);
  }, [filter]);

  const sections = useMemo(() => {
    if (!filter || filter === 'all') return eraSections;
    return eraSections
      .map((s) => ({
        ...s,
        years: s.years.map((y) => ({
          ...y,
          resources: y.resources.filter((r) => r.type === filter),
        })).filter((y) => y.resources.length > 0),
      }))
      .filter((s) => s.years.length > 0);
  }, [filter]);

  return { years, sections };
}

/** 根据年份获取数据 */
export function useYearDetail(year: string): PaperYear | undefined {
  return useMemo(() => getAllYears().find((y) => y.year === year), [year]);
}
