import { KaoyanDict, DictEntry } from '../types/kaoyan';

export interface RelatedWordItem {
  word: string;
  relationship: '形近辨析' | '派生变形' | '同根联想' | '反义对照' | '拼写相近';
  phonetic?: string;
  definition_cn: string;
}

// Curated high-yield Kaoyan confusable and derivative clusters
export const CURATED_WORD_RELATIONS: Record<string, Array<{ word: string; relationship: RelatedWordItem['relationship']; def?: string; phonetic?: string }>> = {
  // R
  'rural': [
    { word: 'urban', relationship: '反义对照', def: 'adj. 城市的，市区的' },
    { word: 'rustic', relationship: '同根联想', def: 'adj. 乡村的，质朴的，粗糙的' },
    { word: 'moral', relationship: '形近辨析', def: 'adj. 道德的 n. 道德，寓意' },
    { word: 'plural', relationship: '形近辨析', def: 'adj. 复数的 n. 复数' },
  ],
  'urban': [
    { word: 'rural', relationship: '反义对照', def: 'adj. 农村的，乡村的' },
    { word: 'suburban', relationship: '派生变形', def: 'adj. 郊区的，城郊的' },
    { word: 'urbane', relationship: '形近辨析', def: 'adj. 温文尔雅的，有礼貌的' },
  ],
  // C
  'critical': [
    { word: 'critic', relationship: '同根联想', def: 'n. 批评家，评论家' },
    { word: 'criticism', relationship: '派生变形', def: 'n. 批评，批判，评论' },
    { word: 'criticize', relationship: '派生变形', def: 'v. 批评，指责，评论' },
    { word: 'crisis', relationship: '同根联想', def: 'n. 危机，紧要关头' },
    { word: 'hypocritical', relationship: '同根联想', def: 'adj. 伪善的，虚伪的' },
  ],
  'crisis': [
    { word: 'critical', relationship: '同根联想', def: 'adj. 关键的，批判性的，危急的' },
    { word: 'crises', relationship: '派生变形', def: 'n. 危机（复数）' },
  ],
  // P
  'professional': [
    { word: 'profession', relationship: '同根联想', def: 'n. 职业，专业' },
    { word: 'professor', relationship: '同根联想', def: 'n. 教授' },
    { word: 'confess', relationship: '同根联想', def: 'v. 承认，坦白，供认' },
    { word: 'profess', relationship: '同根联想', def: 'v. 声称，宣称，公开展现' },
  ],
  // E
  'economic': [
    { word: 'economy', relationship: '同根联想', def: 'n. 经济，节约' },
    { word: 'economical', relationship: '形近辨析', def: 'adj. 经济的，节约的，实惠的' },
    { word: 'economist', relationship: '派生变形', def: 'n. 经济学家' },
    { word: 'economics', relationship: '派生变形', def: 'n. 经济学' },
  ],
  'economical': [
    { word: 'economic', relationship: '形近辨析', def: 'adj. 经济上的，经济学的' },
    { word: 'economy', relationship: '同根联想', def: 'n. 经济，节俭' },
  ],
  // S
  'significant': [
    { word: 'significance', relationship: '派生变形', def: 'n. 重要性，意义' },
    { word: 'signify', relationship: '同根联想', def: 'v. 意味，预示，象征' },
    { word: 'insignificant', relationship: '反义对照', def: 'adj. 微不足道的，不重要的' },
    { word: 'magnificent', relationship: '形近辨析', def: 'adj. 壮丽的，宏伟的' },
  ],
  // A
  'adapt': [
    { word: 'adopt', relationship: '形近辨析', def: 'v. 采纳，收养，通过' },
    { word: 'adept', relationship: '形近辨析', def: 'adj. 熟练的，精通的 n. 内行' },
    { word: 'adaptation', relationship: '派生变形', def: 'n. 适应，改编本' },
  ],
  'adopt': [
    { word: 'adapt', relationship: '形近辨析', def: 'v. 适应，改编' },
    { word: 'adept', relationship: '形近辨析', def: 'adj. 熟练的，擅长的' },
    { word: 'adoption', relationship: '派生变形', def: 'n. 采纳，收养' },
  ],
  'affect': [
    { word: 'effect', relationship: '形近辨析', def: 'n. 效果，影响 v. 实现，引起' },
    { word: 'affection', relationship: '派生变形', def: 'n. 喜爱，感情，爱慕' },
    { word: 'effort', relationship: '拼写相近', def: 'n. 努力，尽力' },
  ],
  'effect': [
    { word: 'affect', relationship: '形近辨析', def: 'v. 影响，感动' },
    { word: 'effective', relationship: '派生变形', def: 'adj. 有效的，起作用的' },
    { word: 'efficient', relationship: '形近辨析', def: 'adj. 高效的，效率高的' },
  ],
  'access': [
    { word: 'assess', relationship: '形近辨析', def: 'v. 评估，评定，估算' },
    { word: 'excess', relationship: '形近辨析', def: 'n. 过度，过量 adj. 额外的' },
    { word: 'accessible', relationship: '派生变形', def: 'adj. 易接近的，可进入的' },
    { word: 'process', relationship: '形近辨析', def: 'n. 过程 v. 处理' },
  ],
  'assess': [
    { word: 'access', relationship: '形近辨析', def: 'n. 进入，通道，使用权 v. 获取' },
    { word: 'assessment', relationship: '派生变形', def: 'n. 评估，评价' },
    { word: 'asset', relationship: '形近辨析', def: 'n. 资产，有价值的人/物' },
  ],
  'alter': [
    { word: 'altar', relationship: '形近辨析', def: 'n. 祭坛，圣坛' },
    { word: 'alert', relationship: '形近辨析', def: 'adj. 警惕的 v. 警告 n. 警报' },
    { word: 'alternative', relationship: '派生变形', def: 'adj. 替代的 n. 可供选择的事物' },
  ],
  'attitude': [
    { word: 'altitude', relationship: '形近辨析', def: 'n. 海拔，高度' },
    { word: 'aptitude', relationship: '形近辨析', def: 'n. 天资，天赋，才能' },
    { word: 'latitude', relationship: '形近辨析', def: 'n. 纬度，自由度' },
  ],
  'attribute': [
    { word: 'contribute', relationship: '同根联想', def: 'v. 贡献，促成，投稿' },
    { word: 'distribute', relationship: '同根联想', def: 'v. 分配，分发，散布' },
    { word: 'tribute', relationship: '同根联想', def: 'n. 致敬，贡品，悼念' },
  ],
  'contribute': [
    { word: 'attribute', relationship: '同根联想', def: 'v. 归因于 n. 属性，特质' },
    { word: 'distribute', relationship: '同根联想', def: 'v. 分配，分发' },
    { word: 'contribution', relationship: '派生变形', def: 'n. 贡献，捐献' },
  ],
  'distribute': [
    { word: 'contribute', relationship: '同根联想', def: 'v. 贡献，促成' },
    { word: 'attribute', relationship: '同根联想', def: 'v. 归因于' },
    { word: 'distribution', relationship: '派生变形', def: 'n. 分配，分布' },
  ],
  // C
  'compliment': [
    { word: 'complement', relationship: '形近辨析', def: 'v. 补充，补足 n. 补充物' },
    { word: 'complete', relationship: '同根联想', def: 'adj. 完整的 v. 完成' },
  ],
  'complement': [
    { word: 'compliment', relationship: '形近辨析', def: 'n./v. 称赞，赞美，恭维' },
    { word: 'complementary', relationship: '派生变形', def: 'adj. 互补的，补充的' },
  ],
  'conscious': [
    { word: 'conscience', relationship: '形近辨析', def: 'n. 良心，良知' },
    { word: 'unconscious', relationship: '反义对照', def: 'adj. 无意识的，不省人事的' },
    { word: 'conspicuous', relationship: '形近辨析', def: 'adj. 显眼的，引人注目的' },
  ],
  'conscience': [
    { word: 'conscious', relationship: '形近辨析', def: 'adj. 有意识的，清醒的' },
    { word: 'conscientious', relationship: '派生变形', def: 'adj. 认真的，尽责的，本着良心的' },
  ],
  'contract': [
    { word: 'contrast', relationship: '形近辨析', def: 'n./v. 对比，对照' },
    { word: 'contact', relationship: '形近辨析', def: 'n./v. 接触，联系' },
    { word: 'extract', relationship: '同根联想', def: 'v. 提取，拔出 n. 提取物' },
    { word: 'abstract', relationship: '同根联想', def: 'adj. 抽象的 n. 摘要' },
  ],
  // D
  'decline': [
    { word: 'incline', relationship: '形近辨析', def: 'v. 倾斜，倾向于' },
    { word: 'recline', relationship: '形近辨析', def: 'v. 斜倚，靠躺' },
    { word: 'decrease', relationship: '同根联想', def: 'v./n. 减少，降低' },
  ],
  'demand': [
    { word: 'command', relationship: '形近辨析', def: 'v./n. 命令，指挥，掌握' },
    { word: 'commend', relationship: '形近辨析', def: 'v. 赞赏，表扬，推荐' },
    { word: 'recommend', relationship: '同根联想', def: 'v. 推荐，建议' },
  ],
  // E
  'expand': [
    { word: 'expend', relationship: '形近辨析', def: 'v. 花费，消耗，支出' },
    { word: 'extend', relationship: '形近辨析', def: 'v. 延伸，扩展，延长' },
    { word: 'expansion', relationship: '派生变形', def: 'n. 扩张，膨胀，发展' },
  ],
  'expend': [
    { word: 'expand', relationship: '形近辨析', def: 'v. 扩大，膨胀，拓展' },
    { word: 'expense', relationship: '派生变形', def: 'n. 开销，费用，代价' },
    { word: 'expensive', relationship: '派生变形', def: 'adj. 昂贵的' },
  ],
  'extend': [
    { word: 'expand', relationship: '形近辨析', def: 'v. 扩大，扩张' },
    { word: 'extent', relationship: '形近辨析', def: 'n. 程度，范围，限度' },
    { word: 'extension', relationship: '派生变形', def: 'n. 延长，延伸，电话分机' },
    { word: 'extensive', relationship: '派生变形', def: 'adj. 广泛的，大量的' },
  ],
  // I
  'immigrate': [
    { word: 'emigrate', relationship: '形近辨析', def: 'v. （从本国）移居国外' },
    { word: 'migrate', relationship: '同根联想', def: 'v. 迁徙，移动' },
    { word: 'immigrant', relationship: '派生变形', def: 'n. 移民（移入）' },
  ],
  'individual': [
    { word: 'individuality', relationship: '派生变形', def: 'n. 个性，独特性' },
    { word: 'individually', relationship: '派生变形', def: 'adv. 个别地，单独地' },
    { word: 'divide', relationship: '同根联想', def: 'v. 分开，划分' },
  ],
  // P
  'principle': [
    { word: 'principal', relationship: '形近辨析', def: 'adj. 最重要的，主要的 n. 校长，本金' },
    { word: 'discipline', relationship: '形近辨析', def: 'n. 纪律，学科 v. 训练' },
  ],
  'principal': [
    { word: 'principle', relationship: '形近辨析', def: 'n. 原则，原理，道德准则' },
    { word: 'primary', relationship: '同根联想', def: 'adj. 首要的，初级的' },
  ],
  // S
  'statue': [
    { word: 'status', relationship: '形近辨析', def: 'n. 地位，身份，状态' },
    { word: 'statute', relationship: '形近辨析', def: 'n. 法规，成文法，法令' },
    { word: 'stature', relationship: '形近辨析', def: 'n. 身高，身材，社会声望' },
    { word: 'state', relationship: '同根联想', def: 'n. 国家，状态 v. 陈述' },
  ],
  'status': [
    { word: 'statue', relationship: '形近辨析', def: 'n. 雕像，塑像' },
    { word: 'statute', relationship: '形近辨析', def: 'n. 法规，法令' },
    { word: 'estate', relationship: '形近辨析', def: 'n. 房地产，财产，庄园' },
  ],
  'suspect': [
    { word: 'aspect', relationship: '同根联想', def: 'n. 方面，方向，外貌' },
    { word: 'inspect', relationship: '同根联想', def: 'v. 检查，视察，检验' },
    { word: 'prospect', relationship: '同根联想', def: 'n. 前景，前途，期望' },
    { word: 'respect', relationship: '同根联想', def: 'v./n. 尊重，尊敬，方面' },
    { word: 'retrospect', relationship: '同根联想', def: 'n./v. 回顾，回想' },
  ],
  'require': [
    { word: 'acquire', relationship: '形近辨析', def: 'v. 获得，学到，取得' },
    { word: 'inquire', relationship: '形近辨析', def: 'v. 询问，打听，调查' },
    { word: 'requirement', relationship: '派生变形', def: 'n. 需求，要求，必要条件' },
  ],
  'acquire': [
    { word: 'require', relationship: '形近辨析', def: 'v. 需要，要求' },
    { word: 'inquire', relationship: '形近辨析', def: 'v. 询问，调查' },
    { word: 'acquisition', relationship: '派生变形', def: 'n. 收购，获得，购置物' },
  ],
};

// Compute Levenshtein distance for string similarity
function getLevenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = [];

  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

// Get the root stem of a word by removing common English suffixes
function getWordStem(word: string): string {
  let stem = word.toLowerCase();
  const suffixes = [
    'ation', 'ition', 'sion', 'tion', 'ment', 'able', 'ible', 'ness', 
    'fully', 'less', 'ship', 'ance', 'ence', 'ally', 'ical', 'ize', 
    'ise', 'ism', 'ist', 'ing', 'est', 'ity', 'ive', 'ful', 'ous', 
    'ent', 'ant', 'ary', 'ory', 'ed', 'ly', 'al', 'er', 'or', 'es', 's'
  ];

  for (const s of suffixes) {
    if (stem.length > s.length + 3 && stem.endsWith(s)) {
      stem = stem.slice(0, -s.length);
      break;
    }
  }
  return stem;
}

// Find related, derivative, and confusable words for a target word
export function findRelatedWords(
  targetWord: string,
  dict: KaoyanDict | null
): RelatedWordItem[] {
  if (!targetWord) return [];
  const lower = targetWord.toLowerCase().trim();
  const results: RelatedWordItem[] = [];
  const addedWords = new Set<string>([lower]);

  // 1. First priority: check curated high-yield pairs
  if (CURATED_WORD_RELATIONS[lower]) {
    for (const item of CURATED_WORD_RELATIONS[lower]) {
      const dictEntry = dict?.entries?.[item.word];
      results.push({
        word: item.word,
        relationship: item.relationship,
        phonetic: item.phonetic || dictEntry?.phonetic,
        definition_cn: item.def || dictEntry?.definition_cn?.replace(/\n/g, '； ') || '考研核心高频词'
      });
      addedWords.add(item.word.toLowerCase());
    }
  }

  // 2. Second priority: Dynamic Morphological & Stem matching from Dictionary
  if (dict?.entries) {
    const targetStem = getWordStem(lower);
    const allDictKeys = Object.keys(dict.entries);

    // Look for morphological derivatives (share common stem >= 4 letters)
    if (targetStem.length >= 4) {
      for (const w of allDictKeys) {
        if (results.length >= 5) break;
        const wLower = w.toLowerCase();
        if (addedWords.has(wLower)) continue;

        if (wLower.startsWith(targetStem) || (wLower.length >= targetStem.length && getWordStem(wLower) === targetStem)) {
          const entry = dict.entries[w];
          results.push({
            word: w,
            relationship: '派生变形',
            phonetic: entry.phonetic,
            definition_cn: entry.definition_cn?.replace(/\n/g, '； ') || '衍生词'
          });
          addedWords.add(wLower);
        }
      }
    }

    // 3. Third priority: Orthographic similarity & small edit distance
    if (results.length < 4) {
      const candidates: Array<{ word: string; dist: number; entry: DictEntry }> = [];

      for (const w of allDictKeys) {
        const wLower = w.toLowerCase();
        if (addedWords.has(wLower)) continue;
        if (Math.abs(wLower.length - lower.length) > 2) continue;

        const dist = getLevenshteinDistance(lower, wLower);
        // Allow edit distance of 1 or 2 for words with length >= 4
        if (dist >= 1 && dist <= 2) {
          candidates.push({ word: w, dist, entry: dict.entries[w] });
        }
      }

      candidates.sort((a, b) => a.dist - b.dist);

      for (const cand of candidates.slice(0, 4 - results.length)) {
        results.push({
          word: cand.word,
          relationship: '形近辨析',
          phonetic: cand.entry.phonetic,
          definition_cn: cand.entry.definition_cn?.replace(/\n/g, '； ') || '形近易混词'
        });
        addedWords.add(cand.word.toLowerCase());
      }
    }
  }

  return results.slice(0, 5);
}
