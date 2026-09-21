/**
 * Vocabulary lemmatizer and tiered coverage analyzer for Kaoyan reading passages.
 * Faithfully matches the tiered vocabulary coverage (假设已掌握 2000/3000/4000/5000 词)
 * and word frequency analytics.
 */

// Irregular verbs mapping (past, participle, 3rd person)
export const IRREGULAR_VERBS: Record<string, string> = {
  'is': 'be', 'are': 'be', 'was': 'be', 'were': 'be', 'am': 'be', 'been': 'be', 'being': 'be',
  'aren': 'be', 'isn': 'be', 'wasn': 'be', 'weren': 'be', 'an': 'a',
  'does': 'do', 'doing': 'do', 'did': 'do', 'done': 'do',
  'has': 'have', 'had': 'have', 'having': 'have',
  'says': 'say', 'saying': 'say', 'said': 'say',
  'goes': 'go', 'going': 'go', 'went': 'go', 'gone': 'go',
  'made': 'make', 'known': 'know', 'given': 'give', 'taken': 'take', 'seen': 'see',
  'came': 'come', 'told': 'tell', 'found': 'find',
  'thought': 'think', 'felt': 'feel', 'left': 'leave', 'held': 'hold', 'brought': 'bring',
  'began': 'begin', 'begun': 'begin', 'kept': 'keep', 'wrote': 'write', 'written': 'write',
  'stood': 'stand', 'lost': 'lose', 'paid': 'pay', 'met': 'meet', 'built': 'build',
  'sat': 'sit', 'spoke': 'speak', 'spoken': 'speak', 'lay': 'lie', 'lain': 'lie',
  'led': 'lead', 'read': 'read', 'grew': 'grow', 'grown': 'grow', 'ran': 'run',
  'drew': 'draw', 'drawn': 'draw', 'chose': 'choose', 'chosen': 'choose',
  'fell': 'fall', 'fallen': 'fall', 'sent': 'send', 'spent': 'spend', 'wore': 'wear',
  'worn': 'wear', 'rose': 'rise', 'risen': 'rise', 'drove': 'drive', 'driven': 'drive',
  'bought': 'buy', 'caught': 'catch', 'taught': 'teach', 'fought': 'fight',
  'became': 'become', 'struck': 'strike', 'stricken': 'strike', 'shook': 'shake',
  'shaken': 'shake', 'won': 'win', 'sold': 'sell', 'understood': 'understand',
  'meant': 'mean', 'oversaw': 'oversee', 'overseen': 'oversee'
};

/**
 * Returns candidate lemmas for a given surface word
 */
export function getLemmas(word: string): string[] {
  const w = word.toLowerCase();
  const list = [w];
  if (IRREGULAR_VERBS[w]) list.push(IRREGULAR_VERBS[w]);

  // plurals & 3rd person -s
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) {
    list.push(w.slice(0, -1)); // e.g. movies -> movie, incentives -> incentive, subscribers -> subscriber
  }
  if (w.endsWith('es') && w.length > 4) {
    list.push(w.slice(0, -2)); // e.g. boxes -> box, watches -> watch
  }
  if (w.endsWith('ies') && w.length > 4) {
    list.push(w.slice(0, -3) + 'y'); // e.g. countries -> country
  }
  if (w.endsWith('ves') && w.length > 4) {
    list.push(w.slice(0, -3) + 'f'); // e.g. leaves -> leaf
    list.push(w.slice(0, -3) + 'fe'); // e.g. knives -> knife
  }

  // past tense -ed
  if (w.endsWith('ed') && w.length > 4) {
    list.push(w.slice(0, -2)); // e.g. looked -> look
    list.push(w.slice(0, -1)); // e.g. liked -> like, suspended -> suspend
    if (w.length > 5 && w[w.length - 3] === w[w.length - 4]) {
      list.push(w.slice(0, -3)); // e.g. stopped -> stop
    }
  }
  if (w.endsWith('ied') && w.length > 4) {
    list.push(w.slice(0, -3) + 'y'); // e.g. carried -> carry
  }

  // gerund -ing
  if (w.endsWith('ying') && w.length > 5) list.push(w.slice(0, -4) + 'ie');
  else if (w.endsWith('ing') && w.length > 5) {
    list.push(w.slice(0, -3));
    list.push(w.slice(0, -3) + 'e');
    if (w.length > 6 && w[w.length - 4] === w[w.length - 5]) {
      list.push(w.slice(0, -4));
    }
  }

  // adverbs -ly / -ally
  if (w.endsWith('ically') && w.length > 7) list.push(w.slice(0, -5));
  else if (w.endsWith('ally') && w.length > 6) list.push(w.slice(0, -2));
  else if (w.endsWith('ily') && w.length > 4) list.push(w.slice(0, -3) + 'y');
  else if (w.endsWith('ly') && w.length > 4) {
    list.push(w.slice(0, -2));
    list.push(w.slice(0, -2) + 'e');
  }

  // comparatives & superlatives -ier / -iest
  if (w.endsWith('iest') && w.length > 5) list.push(w.slice(0, -4) + 'y');
  else if (w.endsWith('ier') && w.length > 4) list.push(w.slice(0, -3) + 'y');

  // agent nouns -er / -or
  if (w.endsWith('er') && w.length > 4) {
    list.push(w.slice(0, -2));
    list.push(w.slice(0, -1));
  }
  if (w.endsWith('or') && w.length > 4) {
    list.push(w.slice(0, -2));
    list.push(w.slice(0, -2) + 'e');
  }

  // noun derivations -ment
  if (w.endsWith('ment') && w.length > 5) {
    list.push(w.slice(0, -4));
  }

  return Array.from(new Set(list));
}

// Comprehensive basic 1500+ foundation vocabulary
export const BASIC_VOCAB_SET = new Set([
  'a', 'about', 'above', 'across', 'act', 'active', 'activity', 'actor', 'actual', 'actually', 'add',
  'address', 'admit', 'adult', 'advance', 'advanced', 'advantage', 'advice', 'advise', 'affair', 'affect',
  'afford', 'afraid', 'after', 'afternoon', 'again', 'against', 'age', 'agency', 'agent', 'ago', 'agree',
  'agreement', 'ahead', 'aid', 'aim', 'air', 'aircraft', 'airline', 'airport', 'alarm', 'alive', 'all',
  'allow', 'almost', 'alone', 'along', 'already', 'also', 'alter', 'alternative', 'although', 'always',
  'am', 'amaze', 'ambition', 'among', 'amount', 'ancient', 'and', 'anger', 'angle', 'angry', 'animal',
  'announce', 'annual', 'another', 'answer', 'antique', 'antiques', 'anxious', 'any', 'anybody', 'anymore', 'anyone', 'anything',
  'anyway', 'anywhere', 'apart', 'apartment', 'apparent', 'apparently', 'appeal', 'appear', 'appearance',
  'apple', 'application', 'apply', 'appoint', 'approach', 'appropriate', 'approval', 'approve', 'approximate',
  'archive', 'archives', 'area', 'argue', 'argument', 'arise', 'arm', 'army', 'around', 'arrange', 'arrangement', 'arrest',
  'arrival', 'arrive', 'art', 'article', 'artificial', 'artist', 'as', 'ashamed', 'aside', 'ask', 'asleep',
  'aspect', 'assess', 'assessment', 'asset', 'assign', 'assist', 'assistance', 'associate', 'association',
  'assume', 'assumption', 'assure', 'at', 'athlete', 'atmosphere', 'attach', 'attack', 'attempt', 'attend',
  'attention', 'attitude', 'attorney', 'attract', 'attraction', 'attractive', 'attribute', 'audience', 'author',
  'authority', 'available', 'average', 'avoid', 'award', 'aware', 'awareness', 'away', 'awful', 'baby',
  'back', 'background', 'bad', 'badly', 'bag', 'bake', 'balance', 'ball', 'ban', 'band', 'bank', 'bar',
  'bare', 'barely', 'bargain', 'base', 'basic', 'basically', 'basis', 'battle', 'be', 'beach', 'bear',
  'beat', 'beautiful', 'beauty', 'because', 'become', 'bed', 'bedroom', 'beer', 'before', 'begin', 'beginning',
  'behalf', 'behave', 'behavior', 'behind', 'being', 'belief', 'believe', 'belong', 'below', 'belt', 'bench',
  'bend', 'beneath', 'benefit', 'beside', 'besides', 'best', 'bet', 'better', 'between', 'beyond', 'big',
  'bike', 'bill', 'billion', 'bind', 'biology', 'bird', 'birth', 'birthday', 'bit', 'bite', 'bitter', 'black',
  'blade', 'blame', 'blank', 'blind', 'block', 'blood', 'blow', 'blue', 'board', 'boat', 'body', 'boil',
  'bomb', 'bond', 'bone', 'book', 'boom', 'boot', 'border', 'born', 'borrow', 'boss', 'both', 'bother',
  'bottle', 'bottom', 'boundary', 'bowl', 'box', 'boy', 'brain', 'branch', 'brand', 'bread', 'break',
  'breakfast', 'breast', 'breath', 'breathe', 'brick', 'bridge', 'brief', 'bright', 'brilliant', 'bring',
  'broad', 'brother', 'brown', 'brush', 'budget', 'build', 'building', 'bullet', 'bunch', 'burn', 'bury',
  'bus', 'business', 'busy', 'but', 'butter', 'button', 'buy', 'buyer', 'by', 'cabinet', 'cable', 'cake',
  'calculate', 'call', 'calm', 'camera', 'camp', 'campaign', 'can', 'cancer', 'candidate', 'cap', 'capable',
  'capacity', 'capital', 'captain', 'capture', 'car', 'card', 'care', 'career', 'careful', 'carefully',
  'cargo', 'carpet', 'carrier', 'carry', 'case', 'cash', 'cast', 'cat', 'catch', 'category', 'cause',
  'cease', 'ceiling', 'celebrate', 'celebration', 'cell', 'cent', 'center', 'central', 'century', 'ceremony',
  'certain', 'certainly', 'chain', 'chair', 'chairman', 'challenge', 'chamber', 'champion', 'championship',
  'chance', 'change', 'channel', 'chapter', 'character', 'characteristic', 'charge', 'charity', 'chart',
  'chase', 'cheap', 'check', 'cheek', 'cheese', 'chemical', 'chest', 'chicken', 'chief', 'child', 'childhood',
  'choice', 'choose', 'church', 'cigarette', 'circle', 'circumstance', 'cite', 'citizen', 'city', 'civil',
  'claim', 'class', 'classic', 'classroom', 'clean', 'clear', 'clearly', 'clerk', 'clever', 'climate',
  'climb', 'clinic', 'clinical', 'clock', 'close', 'closely', 'closer', 'clothes', 'clothing', 'cloud',
  'club', 'coach', 'coal', 'coalition', 'coast', 'coat', 'code', 'coffee', 'cognitive', 'cold', 'collapse',
  'colleague', 'collect', 'collection', 'collective', 'college', 'color', 'column', 'combine', 'combination',
  'come', 'comedy', 'comfort', 'comfortable', 'command', 'commander', 'comment', 'commercial', 'commission',
  'commit', 'commitment', 'committee', 'common', 'commonly', 'communicate', 'communication', 'community',
  'company', 'compare', 'comparison', 'compete', 'competition', 'competitive', 'competitor', 'complain',
  'complaint', 'complete', 'completely', 'complex', 'complicated', 'component', 'compose', 'composition',
  'comprehensive', 'computer', 'concentrate', 'concentration', 'concept', 'concern', 'concerned', 'concert',
  'conclude', 'conclusion', 'concrete', 'condition', 'conduct', 'conference', 'confidence', 'confident',
  'confirm', 'conflict', 'confront', 'confusion', 'congress', 'connect', 'connection', 'conscious',
  'consequence', 'conservative', 'consider', 'considerable', 'consideration', 'consist', 'consistent',
  'constant', 'constantly', 'constitute', 'constitutional', 'construct', 'construction', 'consultant',
  'consume', 'consumer', 'consumption', 'contact', 'contain', 'container', 'contemporary', 'content',
  'contest', 'context', 'continue', 'continued', 'continuous', 'contract', 'contrast', 'contribute',
  'contribution', 'control', 'controversial', 'controversy', 'convention', 'conventional', 'conversation',
  'convert', 'conviction', 'convince', 'cook', 'cookie', 'cooking', 'cool', 'cooperation', 'cope', 'copy',
  'core', 'corner', 'corporate', 'corporation', 'correct', 'correctly', 'cost', 'could', 'council',
  'counsel', 'count', 'counter', 'country', 'county', 'couple', 'courage', 'course', 'court', 'cousin',
  'cover', 'coverage', 'cow', 'crack', 'craft', 'crash', 'crazy', 'cream', 'create', 'creation', 'creative',
  'creativity', 'creature', 'credit', 'crew', 'crime', 'criminal', 'crisis', 'criteria', 'critical',
  'criticism', 'criticize', 'crop', 'cross', 'crowd', 'crucial', 'cry', 'cultural', 'culture', 'cup',
  'curious', 'current', 'currently', 'curriculum', 'custom', 'customer', 'cut', 'cycle', 'dad', 'daily',
  'damage', 'dance', 'danger', 'dangerous', 'dare', 'dark', 'darkness', 'data', 'date', 'daughter', 'day',
  'dead', 'deal', 'dealer', 'dear', 'death', 'debate', 'debt', 'decade', 'decide', 'decision', 'deck',
  'declare', 'decline', 'decrease', 'deep', 'deeply', 'deer', 'defeat', 'defend', 'defendant', 'defense',
  'defensive', 'deficit', 'define', 'definitely', 'definition', 'degree', 'delay', 'deliver', 'delivery',
  'demand', 'democracy', 'democratic', 'demonstrate', 'demonstration', 'deny', 'department', 'depend',
  'dependent', 'depending', 'depict', 'depression', 'depth', 'deputy', 'derive', 'describe', 'description',
  'desert', 'deserve', 'design', 'designer', 'desire', 'desk', 'desperate', 'despite', 'destroy',
  'destruction', 'detail', 'detailed', 'detect', 'determine', 'develop', 'development', 'device', 'devote',
  'dialogue', 'diet', 'differ', 'difference', 'different', 'differently', 'difficult', 'difficulty', 'dig',
  'digital', 'dimension', 'dinner', 'direct', 'direction', 'directly', 'director', 'dirt', 'dirty',
  'disability', 'disagree', 'disappear', 'disaster', 'discipline', 'discourse', 'discover', 'discovery',
  'discrimination', 'discuss', 'discussion', 'disease', 'dish', 'dismiss', 'disorder', 'display', 'dispute',
  'distance', 'distant', 'distinct', 'distinction', 'distinguish', 'distribute', 'distribution', 'district',
  'diverse', 'diversity', 'divide', 'division', 'divorce', 'do', 'doctor', 'document', 'dog', 'domestic',
  'dominant', 'dominate', 'donkey', 'door', 'double', 'doubt', 'down', 'draft', 'drag', 'drama', 'dramatic',
  'dramatically', 'draw', 'drawing', 'dream', 'dress', 'drink', 'drive', 'driver', 'drop', 'drug', 'dry',
  'due', 'during', 'dust', 'duty', 'each', 'eager', 'ear', 'early', 'earn', 'earnings', 'earth', 'ease',
  'easily', 'east', 'eastern', 'easy', 'eat', 'economic', 'economics', 'economist', 'economy', 'edge',
  'edition', 'editor', 'educate', 'education', 'educational', 'educator', 'effect', 'effective',
  'effectively', 'efficiency', 'efficient', 'effort', 'egg', 'eight', 'either', 'elderly', 'elect',
  'election', 'electric', 'electricity', 'electronic', 'element', 'elementary', 'eliminate', 'elite',
  'else', 'elsewhere', 'email', 'embrace', 'emerge', 'emergency', 'emission', 'emotion', 'emotional',
  'emphasis', 'emphasize', 'employ', 'employee', 'employer', 'employment', 'empty', 'enable', 'encounter',
  'encourage', 'end', 'enemy', 'energy', 'enforcement', 'engage', 'engine', 'engineer', 'engineering',
  'english', 'enhance', 'enjoy', 'enormous', 'enough', 'ensure', 'enter', 'enterprise', 'entertainment',
  'entire', 'entirely', 'entrance', 'entry', 'environment', 'environmental', 'episode', 'equal', 'equally',
  'equipment', 'era', 'error', 'escape', 'especially', 'essay', 'essential', 'essentially', 'establish',
  'establishment', 'estate', 'estimate', 'etc', 'ethics', 'ethnic', 'european', 'evaluate', 'evaluation',
  'even', 'evening', 'event', 'eventually', 'ever', 'every', 'everybody', 'everyday', 'everyone', 'everything',
  'everywhere', 'evidence', 'evolution', 'evolve', 'exact', 'exactly', 'examination', 'examine', 'example',
  'exceed', 'excellent', 'except', 'exception', 'exchange', 'exciting', 'exclude', 'excuse', 'executive',
  'exercise', 'exhibit', 'exhibition', 'exist', 'existence', 'existing', 'expand', 'expansion', 'expect',
  'expectation', 'expense', 'expensive', 'experience', 'experiment', 'experimental', 'expert', 'explain',
  'explanation', 'explode', 'explore', 'explosion', 'expose', 'exposure', 'express', 'expression', 'extend',
  'extension', 'extensive', 'extent', 'external', 'extra', 'extraordinary', 'extreme', 'extremely', 'eye',
  'fabric', 'face', 'facility', 'fact', 'factor', 'factory', 'faculty', 'fade', 'fail', 'failure', 'fair',
  'fairly', 'faith', 'fall', 'false', 'familiar', 'family', 'famous', 'fan', 'fantasy', 'far', 'farm',
  'farmer', 'fashion', 'fast', 'fat', 'fate', 'father', 'fault', 'favor', 'favorite', 'fear', 'feature',
  'federal', 'fee', 'feed', 'feel', 'feeling', 'fellow', 'female', 'fence', 'few', 'fewer', 'fiber',
  'fiction', 'field', 'fifteen', 'fifth', 'fifty', 'fight', 'fighter', 'fighting', 'figure', 'file',
  'fill', 'film', 'final', 'finally', 'finance', 'financial', 'find', 'finding', 'fine', 'finger', 'finish',
  'fire', 'firm', 'first', 'fish', 'fishing', 'fit', 'fitness', 'five', 'fix', 'flag', 'flame', 'flat',
  'flavor', 'flee', 'flesh', 'flight', 'float', 'floor', 'flow', 'flower', 'fly', 'focus', 'folk', 'follow',
  'following', 'food', 'foot', 'football', 'for', 'force', 'foreign', 'forest', 'forever', 'forget', 'form',
  'formal', 'format', 'formats', 'formation', 'former', 'formula', 'forth', 'fortune', 'forward', 'found', 'foundation',
  'founder', 'four', 'fourth', 'frame', 'framework', 'free', 'freedom', 'freeze', 'french', 'frequency',
  'frequent', 'frequently', 'fresh', 'friend', 'friendly', 'friendship', 'from', 'front', 'fruit',
  'frustration', 'fuel', 'full', 'fully', 'fun', 'function', 'fund', 'fundamental', 'funding', 'funeral',
  'funny', 'furniture', 'furthermore', 'future', 'gain', 'galaxy', 'gallery', 'game', 'gang', 'gap',
  'garage', 'garden', 'garlic', 'gas', 'gate', 'gather', 'gay', 'gaze', 'gear', 'gender', 'gene',
  'general', 'generally', 'generate', 'generation', 'genetic', 'gentleman', 'gently', 'german', 'gesture',
  'get', 'ghost', 'giant', 'gift', 'gifted', 'girl', 'girlfriend', 'give', 'given', 'glad', 'glance',
  'glass', 'global', 'glove', 'go', 'goal', 'god', 'gold', 'golden', 'golf', 'good', 'government',
  'governor', 'grab', 'grade', 'gradually', 'graduate', 'grain', 'grand', 'grandfather', 'grandmother',
  'grant', 'grass', 'grave', 'gray', 'great', 'greatest', 'green', 'grocery', 'ground', 'group', 'grow',
  'growing', 'growth', 'guarantee', 'guard', 'guess', 'guest', 'guide', 'guideline', 'guilty', 'gun',
  'guy', 'habit', 'habitat', 'hair', 'half', 'hall', 'hand', 'handful', 'handle', 'hang', 'happen',
  'happy', 'hard', 'hardly', 'hat', 'hate', 'have', 'he', 'head', 'headline', 'headquarters', 'health',
  'healthy', 'hear', 'hearing', 'heart', 'heat', 'heaven', 'heavily', 'heavy', 'heel', 'height', 'helicopter',
  'hell', 'hello', 'help', 'helpful', 'her', 'here', 'heritage', 'hero', 'herself', 'hesitate', 'hide',
  'high', 'highlight', 'highly', 'highway', 'hill', 'him', 'himself', 'hire', 'his', 'historian', 'historic',
  'historical', 'history', 'hit', 'hold', 'holder', 'holding', 'hole', 'holiday', 'holy', 'home', 'homeless',
  'honest', 'honey', 'honor', 'hope', 'horizon', 'horror', 'horse', 'hospital', 'host', 'hot', 'hotel',
  'hour', 'house', 'household', 'housing', 'how', 'however', 'huge', 'human', 'humor', 'hundred', 'hungry',
  'hunt', 'hunter', 'hunting', 'hurt', 'husband', 'hypothesis', 'i', 'ice', 'idea', 'ideal', 'identification',
  'identify', 'identity', 'ie', 'if', 'ignore', 'ill', 'illegal', 'illness', 'illustrate', 'image',
  'imagination', 'imagine', 'immediate', 'immediately', 'immigrant', 'immigration', 'impact', 'implement',
  'implication', 'imply', 'importance', 'important', 'impose', 'impossible', 'impress', 'impression',
  'impressive', 'improve', 'improvement', 'in', 'incentive', 'incident', 'include', 'including', 'income',
  'incorporate', 'increase', 'increased', 'increasing', 'increasingly', 'incredible', 'indeed', 'independence',
  'independent', 'index', 'indian', 'indicate', 'indication', 'individual', 'industrial', 'industry',
  'infant', 'infection', 'inflation', 'influence', 'inform', 'information', 'ingredient', 'initial',
  'initially', 'initiative', 'injury', 'inner', 'innocent', 'inquiry', 'inside', 'insight', 'insist',
  'inspire', 'install', 'instance', 'instead', 'institution', 'institutional', 'instruction', 'instructor',
  'instrument', 'insurance', 'intellectual', 'intelligence', 'intend', 'intense', 'intensity', 'intention',
  'interaction', 'interest', 'interested', 'interesting', 'internal', 'international', 'internet',
  'interpret', 'interpretation', 'intervention', 'interview', 'into', 'introduce', 'introduction',
  'invasion', 'invest', 'investigate', 'investigation', 'investigator', 'investment', 'investor', 'invite',
  'involve', 'involved', 'involvement', 'iraqi', 'irish', 'iron', 'islamic', 'island', 'israeli', 'issue',
  'it', 'italian', 'item', 'its', 'itself', 'jacket', 'jail', 'japanese', 'jet', 'jew', 'jewish', 'job',
  'join', 'joint', 'joke', 'journal', 'journalist', 'journey', 'joy', 'judge', 'judgment', 'juice',
  'jump', 'junior', 'jury', 'just', 'justice', 'justify', 'keep', 'key', 'kick', 'kid', 'kill', 'killer',
  'killing', 'kind', 'king', 'kiss', 'kitchen', 'knee', 'knife', 'knock', 'know', 'knowledge', 'lab',
  'label', 'labor', 'laboratory', 'lack', 'lady', 'lake', 'land', 'landscape', 'language', 'lap', 'large',
  'largely', 'last', 'late', 'later', 'latter', 'laugh', 'launch', 'law', 'lawn', 'lawsuit', 'lawyer',
  'lay', 'layer', 'lead', 'leader', 'leadership', 'leading', 'leaf', 'league', 'lean', 'learn', 'learning',
  'least', 'leather', 'leave', 'left', 'leg', 'legacy', 'legal', 'legend', 'legislation', 'legitimate',
  'lemon', 'length', 'less', 'lesson', 'let', 'letter', 'level', 'liberal', 'library', 'license', 'lie',
  'life', 'lifestyle', 'lifetime', 'lift', 'light', 'like', 'likely', 'limit', 'limitation', 'limited',
  'line', 'link', 'lip', 'list', 'listen', 'literally', 'literary', 'literature', 'little', 'live', 'living',
  'load', 'loan', 'local', 'locate', 'location', 'lock', 'long', 'long-term', 'look', 'loose', 'lose',
  'loss', 'lost', 'lot', 'lots', 'loud', 'love', 'lovely', 'lover', 'low', 'lower', 'luck', 'lucky',
  'lunch', 'lung', 'machine', 'mad', 'magazine', 'mail', 'main', 'mainly', 'maintain', 'maintenance',
  'major', 'majority', 'make', 'maker', 'makeup', 'male', 'mall', 'man', 'manage', 'management', 'manager',
  'manner', 'manufacturer', 'manufacturing', 'many', 'map', 'margin', 'mark', 'market', 'marketing',
  'marriage', 'married', 'marry', 'mask', 'mass', 'massive', 'master', 'match', 'material', 'math',
  'matter', 'may', 'maybe', 'mayor', 'me', 'meal', 'mean', 'meaning', 'meanwhile', 'measure', 'measurement',
  'meat', 'mechanism', 'media', 'medical', 'medication', 'medicine', 'medium', 'meet', 'meeting', 'member',
  'membership', 'memory', 'mental', 'mention', 'menu', 'mere', 'merely', 'message', 'metal', 'meter',
  'method', 'middle', 'might', 'military', 'milk', 'million', 'mind', 'mine', 'minister', 'minor',
  'minority', 'minute', 'miracle', 'mirror', 'miss', 'missile', 'mission', 'mistake', 'mix', 'mixture',
  'mode', 'model', 'moderate', 'modern', 'modest', 'mom', 'moment', 'money', 'monitor', 'month', 'mood',
  'moon', 'moral', 'more', 'moreover', 'morning', 'mortgage', 'most', 'mostly', 'mother', 'motion',
  'motivation', 'motor', 'mount', 'mountain', 'mouse', 'mouth', 'move', 'movement', 'movie', 'mr', 'mrs',
  'ms', 'much', 'multiple', 'murder', 'muscle', 'museum', 'music', 'musical', 'musician', 'muslim',
  'must', 'mutual', 'my', 'myself', 'mystery', 'myth', 'naked', 'name', 'narrative', 'narrow', 'nation',
  'national', 'native', 'natural', 'naturally', 'nature', 'near', 'nearby', 'nearly', 'necessarily',
  'necessary', 'neck', 'need', 'negative', 'negotiate', 'negotiation', 'neighbor', 'neighborhood',
  'neither', 'nerve', 'nervous', 'net', 'network', 'never', 'nevertheless', 'new', 'newly', 'news',
  'newspaper', 'next', 'nice', 'night', 'nine', 'no', 'nobody', 'nod', 'noise', 'nomination', 'none',
  'nonetheless', 'nor', 'normal', 'normally', 'north', 'northern', 'nose', 'not', 'note', 'nothing',
  'notice', 'notion', 'novel', 'now', 'nowhere', 'nuclear', 'number', 'numerous', 'nurse', 'nut', 'object',
  'objective', 'obligation', 'observation', 'observe', 'observer', 'obtain', 'obvious', 'obviously',
  'occasion', 'occasionally', 'occupation', 'occupy', 'occur', 'ocean', 'odd', 'odds', 'of', 'off',
  'offense', 'offensive', 'offer', 'office', 'officer', 'official', 'often', 'oh', 'oil', 'ok', 'okay',
  'old', 'olympic', 'on', 'once', 'one', 'ongoing', 'onion', 'online', 'only', 'onto', 'open', 'opening',
  'operate', 'operating', 'operation', 'operator', 'opinion', 'opponent', 'opportunity', 'oppose',
  'opposite', 'opposition', 'option', 'or', 'orange', 'order', 'ordinary', 'organic', 'organization',
  'organize', 'orientation', 'origin', 'original', 'originally', 'other', 'others', 'otherwise', 'ought',
  'our', 'ourselves', 'out', 'outcome', 'outside', 'oven', 'over', 'overall', 'overcome', 'overlook',
  'owe', 'own', 'owner', 'pace', 'pack', 'package', 'page', 'pain', 'painful', 'paint', 'painter', 'painting',
  'pair', 'pale', 'palestinian', 'palm', 'pan', 'panel', 'pant', 'paper', 'parent', 'park', 'parking',
  'part', 'participant', 'participate', 'participation', 'particular', 'particularly', 'partly', 'partner',
  'partnership', 'party', 'pass', 'passage', 'passenger', 'passion', 'past', 'patch', 'path', 'patient',
  'pattern', 'pause', 'pay', 'payment', 'peace', 'peak', 'peer', 'penalty', 'people', 'pepper', 'per',
  'perceive', 'percentage', 'perception', 'perfect', 'perfectly', 'perform', 'performance', 'performer',
  'perhaps', 'period', 'permanent', 'permission', 'permit', 'person', 'personal', 'personality', 'personally',
  'personnel', 'perspective', 'persuade', 'pet', 'phase', 'phenomenon', 'philosophy', 'phone', 'photo',
  'photograph', 'photographer', 'phrase', 'physical', 'physically', 'physician', 'piano', 'pick', 'picture',
  'pie', 'piece', 'pile', 'pilot', 'pine', 'pink', 'pipe', 'pitch', 'place', 'plan', 'plane', 'planet',
  'planning', 'plant', 'plastic', 'plate', 'platform', 'play', 'player', 'please', 'pleasure', 'plenty',
  'plot', 'plus', 'pocket', 'poem', 'poet', 'poetry', 'point', 'pole', 'police', 'policy', 'political',
  'politically', 'politician', 'politics', 'poll', 'pollution', 'pool', 'poor', 'pop', 'popular',
  'population', 'porch', 'port', 'portion', 'portrait', 'portray', 'pose', 'position', 'positive', 'possess',
  'possibility', 'possible', 'possibly', 'post', 'pot', 'potato', 'potential', 'potentially', 'pound',
  'pour', 'poverty', 'powder', 'power', 'powerful', 'practical', 'practice', 'pray', 'prayer', 'precisely',
  'predict', 'prefer', 'preference', 'pregnancy', 'pregnant', 'preparation', 'prepare', 'prescription',
  'presence', 'present', 'presentation', 'preserve', 'president', 'presidential', 'press', 'pressure',
  'pretend', 'pretty', 'prevent', 'previous', 'previously', 'price', 'pride', 'priest', 'primarily',
  'primary', 'prime', 'principal', 'principle', 'print', 'prior', 'priority', 'prison', 'prisoner',
  'privacy', 'private', 'probably', 'problem', 'procedure', 'proceed', 'process', 'produce', 'producer',
  'product', 'production', 'profession', 'professional', 'professor', 'profile', 'profit', 'program',
  'progress', 'project', 'prominent', 'promise', 'promote', 'prompt', 'proof', 'proper', 'properly',
  'property', 'proportion', 'proposal', 'propose', 'proposed', 'prosecutor', 'prospect', 'protect',
  'protection', 'protein', 'protest', 'proud', 'prove', 'provide', 'provided', 'provider', 'province',
  'provision', 'psychological', 'psychologist', 'psychology', 'public', 'publication', 'publicly',
  'publish', 'publisher', 'pull', 'punishment', 'purchase', 'pure', 'purpose', 'pursue', 'push', 'put',
  'qualify', 'quality', 'quarter', 'quarterback', 'question', 'quick', 'quickly', 'quiet', 'quietly',
  'quit', 'quite', 'quote', 'race', 'racial', 'radical', 'radio', 'rail', 'rain', 'raise', 'range', 'rank',
  'rapid', 'rapidly', 'rare', 'rarely', 'rate', 'rather', 'rating', 'ratio', 'raw', 'reach', 'react',
  'reaction', 'read', 'reader', 'reading', 'ready', 'real', 'reality', 'realize', 'really', 'reason',
  'reasonable', 'recall', 'receive', 'recent', 'recently', 'recipe', 'recognition', 'recognize', 'recommend',
  'recommendation', 'record', 'recording', 'recover', 'recovery', 'recruit', 'red', 'reduce', 'reduction',
  'refer', 'reference', 'reflect', 'reflection', 'reform', 'refugee', 'refuse', 'regard', 'regarding',
  'regardless', 'regime', 'region', 'regional', 'register', 'regular', 'regularly', 'regulate', 'regulation',
  'reinforce', 'reject', 'relate', 'relation', 'relationship', 'relative', 'relatively', 'relax', 'release',
  'relevant', 'relief', 'religion', 'religious', 'rely', 'remain', 'remaining', 'remarkable', 'remember',
  'remind', 'remote', 'remove', 'repeat', 'repeatedly', 'replace', 'reply', 'report', 'reporter', 'represent',
  'representation', 'representative', 'reputation', 'request', 'require', 'requirement', 'research',
  'researcher', 'resemble', 'reservation', 'resident', 'resist', 'resistance', 'resolution', 'resolve',
  'resort', 'resource', 'respect', 'respond', 'respondent', 'response', 'responsibility', 'responsible',
  'rest', 'restaurant', 'restore', 'restriction', 'result', 'retain', 'retire', 'retirement', 'return',
  'reveal', 'revenue', 'review', 'revolution', 'rhythm', 'rice', 'rich', 'rid', 'ride', 'rifle', 'right',
  'ring', 'rise', 'risk', 'river', 'road', 'rock', 'role', 'roll', 'romantic', 'roof', 'room', 'root',
  'rope', 'rose', 'rough', 'roughly', 'round', 'route', 'routine', 'row', 'rub', 'rule', 'run', 'running',
  'rural', 'rush', 'russian', 'sacred', 'sad', 'safe', 'safety', 'sake', 'salad', 'salary', 'sale', 'sales',
  'salt', 'same', 'sample', 'sanction', 'sand', 'satellite', 'satisfaction', 'satisfy', 'sauce', 'save',
  'saving', 'say', 'scale', 'scandal', 'scared', 'scenario', 'scene', 'schedule', 'scheme', 'scholar',
  'scholarship', 'school', 'science', 'scientific', 'scientist', 'scope', 'score', 'scream', 'screen',
  'script', 'sea', 'search', 'season', 'seat', 'second', 'secret', 'secretary', 'section', 'sector',
  'secure', 'security', 'see', 'seed', 'seek', 'seem', 'segment', 'seize', 'seldom', 'select', 'selection',
  'self', 'sell', 'seller', 'senate', 'senator', 'send', 'senior', 'sense', 'sensitive', 'sentence',
  'separate', 'sequence', 'series', 'serious', 'seriously', 'serve', 'service', 'session', 'set', 'setting',
  'settle', 'settlement', 'seven', 'several', 'severe', 'sex', 'sexual', 'shade', 'shadow', 'shake',
  'shall', 'shape', 'share', 'sharp', 'she', 'sheet', 'shelf', 'shell', 'shelter', 'shift', 'shine',
  'ship', 'shirt', 'shit', 'shock', 'shoe', 'shoot', 'shooting', 'shop', 'shopping', 'shore', 'short',
  'shortly', 'shot', 'should', 'shoulder', 'shout', 'show', 'shower', 'shrug', 'shut', 'sick', 'side',
  'sigh', 'sight', 'sign', 'signal', 'significance', 'significant', 'significantly', 'silence', 'silent',
  'silver', 'similar', 'similarly', 'simple', 'simply', 'sin', 'since', 'sing', 'singer', 'single',
  'sink', 'sir', 'sister', 'sit', 'site', 'situation', 'six', 'size', 'ski', 'skill', 'skin', 'sky',
  'slave', 'sleep', 'slice', 'slide', 'slight', 'slightly', 'slip', 'slow', 'slowly', 'small', 'smart',
  'smell', 'smile', 'smoke', 'smooth', 'snap', 'snow', 'so', 'so-called', 'soccer', 'social', 'society',
  'soft', 'softly', 'soil', 'solar', 'soldier', 'solid', 'solution', 'solve', 'some', 'somebody', 'somehow',
  'someone', 'something', 'sometimes', 'somewhat', 'somewhere', 'son', 'song', 'soon', 'sophisticated',
  'sorry', 'sort', 'soul', 'sound', 'soup', 'source', 'south', 'southern', 'soviet', 'space', 'spanish',
  'speak', 'speaker', 'special', 'specialist', 'species', 'specific', 'specifically', 'speech', 'speed',
  'spend', 'spending', 'spin', 'spirit', 'spiritual', 'split', 'spokesman', 'sport', 'spot', 'spread',
  'spring', 'square', 'squeeze', 'stability', 'stable', 'staff', 'stage', 'stair', 'stake', 'stand',
  'standard', 'standing', 'star', 'stare', 'start', 'state', 'statement', 'station', 'statistics', 'status',
  'stay', 'steady', 'steal', 'steel', 'step', 'stick', 'still', 'stir', 'stock', 'stomach', 'stone', 'stop',
  'storage', 'store', 'storm', 'story', 'straight', 'strange', 'stranger', 'strategic', 'strategy', 'stream',
  'street', 'strength', 'strengthen', 'stress', 'stretch', 'strike', 'string', 'strip', 'stroke', 'strong',
  'strongly', 'structure', 'struggle', 'student', 'studio', 'study', 'stuff', 'stupid', 'style', 'subject',
  'submit', 'subsequent', 'substance', 'substantial', 'succeed', 'success', 'successful', 'successfully',
  'such', 'sudden', 'suddenly', 'sue', 'suffer', 'sufficient', 'sugar', 'suggest', 'suggestion', 'suicide',
  'suit', 'suitable', 'summer', 'summit', 'sun', 'super', 'supply', 'support', 'supporter', 'suppose',
  'supposed', 'supreme', 'sure', 'surely', 'surface', 'surgery', 'surprise', 'surprised', 'surprising',
  'surprisingly', 'surround', 'survey', 'survival', 'survive', 'survivor', 'suspect', 'sustain', 'swear',
  'sweep', 'sweet', 'swim', 'swimming', 'swing', 'switch', 'symbol', 'symptom', 'system', 'table', 'tablespoon',
  'tactic', 'tail', 'take', 'tale', 'talent', 'talk', 'tall', 'tank', 'tap', 'tape', 'target', 'task',
  'taste', 'tax', 'taxpayer', 'tea', 'teach', 'teacher', 'teaching', 'team', 'tear', 'teaspoon', 'technical',
  'technique', 'technology', 'teen', 'teenager', 'telephone', 'telescope', 'television', 'tell', 'temperature',
  'temporary', 'ten', 'tend', 'tendency', 'tennis', 'tension', 'tent', 'term', 'terms', 'terrible', 'territory',
  'terror', 'terrorism', 'terrorist', 'test', 'testify', 'testimony', 'testing', 'text', 'than', 'thank',
  'thanks', 'that', 'the', 'theater', 'their', 'theirs', 'them', 'theme', 'themselves', 'then', 'theory',
  'therapy', 'there', 'therefore', 'these', 'they', 'thick', 'thin', 'thing', 'think', 'thinking', 'third',
  'thirty', 'this', 'those', 'though', 'thought', 'thousand', 'threat', 'threaten', 'three', 'throat',
  'through', 'throughout', 'throw', 'thus', 'ticket', 'tie', 'tight', 'time', 'tiny', 'tip', 'tire',
  'tired', 'tissue', 'title', 'to', 'tobacco', 'today', 'toe', 'together', 'tomato', 'tomorrow', 'tone',
  'tongue', 'tonight', 'too', 'tool', 'tooth', 'top', 'topic', 'toss', 'total', 'totally', 'touch',
  'tough', 'tour', 'tourist', 'tournament', 'toward', 'towards', 'tower', 'town', 'toy', 'trace', 'track',
  'trade', 'tradition', 'traditional', 'traffic', 'tragedy', 'trail', 'train', 'trainer', 'training',
  'transfer', 'transform', 'transformation', 'transition', 'translate', 'transportation', 'travel',
  'traveler', 'treat', 'treatment', 'treaty', 'tree', 'tremendous', 'trend', 'trial', 'tribe', 'trick',
  'trip', 'troop', 'trouble', 'truck', 'true', 'truly', 'trust', 'truth', 'try', 'tube', 'tunnel', 'turn',
  'tv', 'twelve', 'twenty', 'twice', 'twin', 'two', 'type', 'typical', 'typically', 'ugly', 'ultimate',
  'ultimately', 'unable', 'uncle', 'under', 'undergo', 'understand', 'understanding', 'unfortunately',
  'uniform', 'union', 'unique', 'unit', 'united', 'universal', 'universe', 'university', 'unknown',
  'unless', 'unlike', 'unlikely', 'until', 'unusual', 'up', 'upon', 'upper', 'urban', 'urge', 'us',
  'use', 'used', 'useful', 'user', 'usual', 'usually', 'utility', 'vacation', 'valley', 'valuable',
  'value', 'variable', 'variation', 'variety', 'various', 'vary', 'vast', 'vegetable', 'vehicle',
  'venture', 'version', 'versus', 'very', 'vessel', 'veteran', 'via', 'victim', 'victory', 'video',
  'view', 'viewer', 'village', 'violate', 'violation', 'violence', 'violent', 'virtually', 'virtue',
  'virus', 'visible', 'vision', 'visit', 'visitor', 'visual', 'vital', 'voice', 'volume', 'volunteer',
  'vote', 'voter', 'vs', 'vulnerable', 'wage', 'wait', 'wake', 'walk', 'wall', 'wander', 'want', 'war',
  'warm', 'warn', 'warning', 'wash', 'waste', 'watch', 'water', 'wave', 'way', 'we', 'weak', 'wealth',
  'wealthy', 'weapon', 'wear', 'weather', 'wedding', 'week', 'weekend', 'weekly', 'weigh', 'weight',
  'welcome', 'welfare', 'well', 'west', 'western', 'wet', 'what', 'whatever', 'wheel', 'when', 'whenever',
  'where', 'whereas', 'whether', 'which', 'while', 'whisper', 'white', 'who', 'whole', 'whom', 'whose',
  'why', 'wide', 'widely', 'widespread', 'wife', 'wild', 'will', 'willing', 'win', 'wind', 'window',
  'wine', 'wing', 'winner', 'winter', 'wipe', 'wire', 'wisdom', 'wise', 'wish', 'with', 'withdraw',
  'within', 'without', 'witness', 'woman', 'wonder', 'wonderful', 'wood', 'wooden', 'word', 'work',
  'worker', 'working', 'works', 'workshop', 'world', 'worried', 'worry', 'worth', 'would', 'wound',
  'wrap', 'write', 'writer', 'writing', 'wrong', 'yard', 'yeah', 'year', 'yell', 'yellow', 'yes',
  'yesterday', 'yet', 'yield', 'you', 'young', 'your', 'yours', 'yourself', 'youth', 'zone'
]);

// Common proper nouns (geographical, companies, platforms, countries, organizations)
export const PROPER_NOUNS = new Set([
  'california', 'los', 'angeles', 'georgia', 'hollywood', 'canada', 'europe',
  'netflix', 'amazon', 'disney', 'la', 'america', 'american', 'americans',
  'britain', 'british', 'england', 'english', 'france', 'french', 'germany',
  'german', 'china', 'chinese', 'japan', 'japanese', 'russia', 'russian',
  'washington', 'york', 'london', 'paris', 'chicago', 'texas', 'florida',
  'beijing', 'shanghai', 'eu', 'uk', 'usa', 'un', 'who', 'fbi', 'cia', 'nasa',
  'apple', 'google', 'microsoft', 'facebook', 'meta', 'twitter', 'youtube', 'tiktok',
  'harvard', 'oxford', 'cambridge', 'mit', 'stanford', 'columbia', 'yale', 'princeton'
]);

/**
 * Resolves a surface word to its canonical base lemma using candidate generators and known dictionaries
 */
export function getCanonicalLemma(
  word: string,
  dictMap?: Record<string, any>,
  statsMap?: Record<string, any>
): string {
  const w = word.toLowerCase();
  if (PROPER_NOUNS.has(w)) return w;

  const candidates = getLemmas(w);

  // 1. Check basic vocabulary first
  const basicMatch = candidates.find(c => BASIC_VOCAB_SET.has(c));
  if (basicMatch) return basicMatch;

  // 2. Check stats / kaoyan dict
  if (dictMap || statsMap) {
    const dictMatch = candidates.find(c => (dictMap && dictMap[c]) || (statsMap && statsMap[c]));
    if (dictMatch) return dictMatch;
  }

  return w;
}

export interface PassageLemmaItem {
  lemma: string;
  count: number;
  surfaceForms: string[];
  isProperNoun?: boolean;
}

/**
 * Extracts and canonicalizes passage tokens into base lemmas, grouping inflections and filtering contractions.
 */
export function extractPassageLemmas(
  text: string,
  dictMap?: Record<string, any>,
  statsMap?: Record<string, any>
): {
  tokens: PassageLemmaItem[];
  totalWords: number;
} {
  // Pre-clean contractions cleanly without destroying word stems
  const cleaned = text
    .replace(/[’']/g, "'")
    .replace(/\bcan't\b/gi, 'can not')
    .replace(/\bwon't\b/gi, 'will not')
    .replace(/\bshan't\b/gi, 'shall not')
    .replace(/\bcannot\b/gi, 'can not')
    .replace(/n't\b/gi, ' not')
    .replace(/'(s|ve|re|d|ll|m)\b/gi, ' ');

  // Extract raw words
  const rawTokens = cleaned.match(/[a-zA-Z]{2,}/g) || [];
  
  const lemmaMap: Record<string, { count: number; surfaces: Set<string>; isProper: boolean }> = {};
  let totalWords = 0;

  rawTokens.forEach(raw => {
    const low = raw.toLowerCase();
    
    // Check if proper noun
    const isProper = PROPER_NOUNS.has(low);
    const lemma = isProper ? low : getCanonicalLemma(low, dictMap, statsMap);

    if (!lemmaMap[lemma]) {
      lemmaMap[lemma] = { count: 0, surfaces: new Set(), isProper };
    }
    lemmaMap[lemma].count += 1;
    lemmaMap[lemma].surfaces.add(raw);
    totalWords++;
  });

  const tokens = Object.entries(lemmaMap).map(([lemma, data]) => ({
    lemma,
    count: data.count,
    surfaceForms: Array.from(data.surfaces),
    isProperNoun: data.isProper
  }));

  return { tokens, totalWords };
}

/**
 * Extracts passage tokens for backwards compatibility, returning grouped canonical words.
 */
export function extractPassageTokens(
  text: string,
  dictMap?: Record<string, any>,
  statsMap?: Record<string, any>
): { word: string; count: number; isProperNoun?: boolean }[] {
  const { tokens } = extractPassageLemmas(text, dictMap, statsMap);
  return tokens.map(t => ({
    word: t.lemma,
    count: t.count,
    isProperNoun: t.isProperNoun
  }));
}

/**
 * Evaluates whether a word is considered mastered under a given tier
 */
export function isWordMastered(
  word: string,
  tier: '2000' | '3000' | '4000' | '5000' | 'custom',
  vocabStats: Record<string, { rank: number; trans: string }>,
  dictMap?: Record<string, any>,
  wordStatuses: Record<string, 'familiar' | 'unfamiliar' | 'unknown'> = {}
): boolean {
  const w = word.toLowerCase();

  // Proper nouns / named entities are not considered vocabulary test obstacles
  if (PROPER_NOUNS.has(w)) return true;

  // Custom user word status
  if (tier === 'custom') {
    if (wordStatuses[w] === 'familiar') return true;
    if (wordStatuses[w] === 'unfamiliar') return false;
  }

  const lemmas = getLemmas(w);

  // 1. Check basic foundation words (1500+ words)
  for (const lem of lemmas) {
    if (BASIC_VOCAB_SET.has(lem)) return true;
  }

  // 2. In 5000 tier, all words in kaoyan syllabus dictionary or stats are mastered
  if (tier === '5000') {
    for (const lem of lemmas) {
      if (vocabStats[lem] || (dictMap && dictMap[lem])) {
        return true;
      }
    }
  }

  // 3. Exam frequency rank thresholds for tiers (using actual exam occurrence rank 1~3149)
  const rankThreshold = tier === '2000' ? 800
    : tier === '3000' ? 1800
    : tier === '4000' ? 2800
    : 99999;

  for (const lem of lemmas) {
    const stat = vocabStats[lem];
    if (stat && stat.rank <= rankThreshold) {
      return true;
    }
  }

  return false;
}

