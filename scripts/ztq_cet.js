
var APP_ROOT = window.APP_ROOT != null ? window.APP_ROOT : '';
const EXAM_TYPE = (() => {
    const path = window.location.pathname.toLowerCase();
    const host = window.location.hostname.toLowerCase();
    if (/\/kaoyan\/english(1|2)?(\/|$)/.test(path)) {
        return 'kaoyan';
    }
    if (host.startsWith('cet6.') || /\/cet\/6(\/|$)/.test(path)) {
        return 'cet6';
    }
    if (host.startsWith('cet4.') || /\/cet\/4(\/|$)/.test(path)) {
        return 'cet4';
    }
    return 'cet4';
})();
window.CET_EXAM_TYPE = EXAM_TYPE;
const VOCAB_EXAM_TYPE = (() => {
    const path = window.location.pathname.toLowerCase();
    if (/\/kaoyan\/english2(\/|$)/.test(path)) return 'kaoyan2';
    if (/\/kaoyan\/english1(\/|$)/.test(path) || /\/kaoyan\/english(\/|$)/.test(path)) return 'kaoyan1';
    if (EXAM_TYPE === 'cet6') return 'cet6';
    return 'cet4';
})();
window.CET_VOCAB_EXAM_TYPE = VOCAB_EXAM_TYPE;
function getKaoyanPrefixFromPath() {
    const path = window.location.pathname.toLowerCase();
    if (/\/kaoyan\/english1(\/|$)/.test(path)) return '/kaoyan/english1';
    if (/\/kaoyan\/english2(\/|$)/.test(path)) return '/kaoyan/english2';
    if (/\/kaoyan\/english(\/|$)/.test(path)) return '/kaoyan/english';
    return '/kaoyan/english1';
}
function getExamPrefix(examType) {
    if (examType === 'cet6') return '/cet/6';
    if (examType === 'kaoyan') return getKaoyanPrefixFromPath();
    return '/cet/4';
}

function getCurrentMembershipProductType() {
    const path = window.location.pathname.toLowerCase();
    if (/\/kaoyan\/english2(\/|$)/.test(path)) return 'kaoyan_english2';
    if (/\/kaoyan\/english1(\/|$)/.test(path) || /\/kaoyan\/english(\/|$)/.test(path)) return 'kaoyan_english1';
    if (/\/cet\/6(\/|$)/.test(path)) return 'cet6';
    if (/\/cet\/4(\/|$)/.test(path)) return 'cet4';
    return 'kaoyan_math';
}

async function fetchCurrentPageMembershipStatus(force) {
    const membershipFetcher = window['fetchMembershipStatus'];
    if (typeof membershipFetcher === 'function') {
        return membershipFetcher({
            productType: getCurrentMembershipProductType(),
            force: !!force
        });
    }
    const productType = getCurrentMembershipProductType();
    const response = await fetch(
        `${APP_ROOT}/api/membership/status?product_type=${encodeURIComponent(productType)}`
    );
    if (!response.ok) {
        const error = new Error(`membership_status_${response.status}`);
        error.status = response.status;
        throw error;
    }
    return response.json();
}

async function ensureCurrentPageMembershipAccess(options) {
    const opts = options || {};
    if (!isGlobalUserLoggedIn()) {
        triggerGlobalLoginPrompt();
        return false;
    }
    try {
        const data = await fetchCurrentPageMembershipStatus(!!opts.force);
        if (data && data.is_member) return true;
    } catch (error) {
        if (error && error.status === 401) {
            triggerGlobalLoginPrompt();
            return false;
        }
        console.error('Membership check failed:', error);
    }
    if (typeof showMembershipModal === 'function') {
        showMembershipModal();
    } else {
        alert('当前页面会员已到期，请先续费');
    }
    return false;
}
window.ensureCurrentPageMembershipAccess = ensureCurrentPageMembershipAccess;

function getPaperPdfPath(examInfo) {
    const raw = String(examInfo || '').trim();
    if (EXAM_TYPE === 'kaoyan') {
        const m = raw.match(/^(\d{4})\((\d+)\)$/);
        if (m) {
            const year = m[1];
            const paperFolder = VOCAB_EXAM_TYPE === 'kaoyan2' ? 'kaoyan2' : 'kaoyan1';
            return `static/pdfs/${paperFolder}/${year}.pdf`;
        }
    }
    return `static/pdfs/${EXAM_TYPE}/${raw}.pdf`;
}

function getWordDictFilename(examType) {
    if (examType === 'kaoyan') {
        const path = window.location.pathname.toLowerCase();
        if (/\/kaoyan\/english2(\/|$)/.test(path)) return 'kaoyan2_dict.json';
        return 'kaoyan1_dict.json';
    }
    return `${examType}_dict_all.json`;
}
function getWordCountFilename(examType) {
    return `${examType}_kp_word_counts.json`;
}
const API_BASE = `${getExamPrefix(EXAM_TYPE)}/api`;
function buildVocabApiUrl(endpoint) {
    const url = new URL(`${API_BASE}${endpoint}`, window.location.origin);
    url.searchParams.set('exam_type', VOCAB_EXAM_TYPE);
    return url.toString();
}
function buildVocabPayload(payload) {
    return { ...(payload || {}), exam_type: VOCAB_EXAM_TYPE };
}
let currentActiveKid = null;
let g_knowledgePoints = []; // Global cache for knowledge points
let g_kidToTasks = {}; // Global cache for tasks indexed by kid
let g_allTasks = [];
let g_dictAll = null;
let g_kpWordCounts = null;
let g_wordFrequencyStats = null;
let currentActiveWord = null;
let knowledgeFilterSummary = null;
let knowledgeFilterUpdating = false;
const STATIC_BASE = `${API_BASE.replace(/\/api$/, '')}/static`;
const g_taskMetaCache = {};
const g_sentenceIdToTaskId = new Map();
let g_wordStatsRenderSeq = 0;

async function ensureSentenceTaskMap(sentenceIds) {
    const ids = Array.from(new Set((sentenceIds || []).map(x => {
        const n = Number(x);
        return Number.isFinite(n) ? n : null;
    }).filter(x => x != null)));
    const missing = ids.filter(id => !g_sentenceIdToTaskId.has(id));
    if (!missing.length) return;

    const chunks = [];
    for (let i = 0; i < missing.length; i += 50) {
        chunks.push(missing.slice(i, i + 50));
    }

    const fetchChunk = async (chunk) => {
        try {
            const url = `${API_BASE}/sentences_by_ids?ids=${chunk.join(',')}`;
            const r = await fetch(url);
            const j = await r.json();
            const rows = j && Array.isArray(j.sentences) ? j.sentences : [];
            rows.forEach(s => {
                const sid = Number(s && s.id);
                const tid = Number(s && s.task_id);
                if (Number.isFinite(sid) && Number.isFinite(tid)) {
                    g_sentenceIdToTaskId.set(sid, tid);
                }
            });
        } catch (e) {}
    };

    for (let i = 0; i < chunks.length; i += 4) {
        await Promise.all(chunks.slice(i, i + 4).map(fetchChunk));
    }
}

async function fetchTaskMetaById(taskId) {
    const tid = String(taskId || '').trim();
    if (!tid) return null;
    if (g_taskMetaCache[tid]) return g_taskMetaCache[tid];
    try {
        const r = await fetch(`${API_BASE}/tasks?id=${encodeURIComponent(tid)}`);
        const j = await r.json();
        const tasks = j && Array.isArray(j.tasks) ? j.tasks : (j && Array.isArray(j) ? j : []);
        const t = tasks && tasks[0] ? tasks[0] : null;
        if (!t) return null;
        g_taskMetaCache[tid] = t;
        return t;
    } catch (e) {}
    return null;
}

async function loadStaticWordData() {
    if (g_dictAll && g_dictAll.entries) return;
    try {
        const dictUrl = `${STATIC_BASE}/${getWordDictFilename(EXAM_TYPE)}`;
        const shouldLoadWordCounts = EXAM_TYPE !== 'kaoyan';
        const countUrl = shouldLoadWordCounts ? `${STATIC_BASE}/${getWordCountFilename(EXAM_TYPE)}` : null;
        const [dictResp, countResp] = await Promise.all([
            fetch(dictUrl),
            countUrl ? fetch(countUrl).catch(() => null) : Promise.resolve(null),
        ]);
        g_dictAll = await dictResp.json();
        window.CET_DICT_ALL = g_dictAll;
        buildWordFrequencyStatsCache();
        if (countResp && countResp.ok) {
            g_kpWordCounts = await countResp.json();
            window.CET_KP_WORD_COUNTS = g_kpWordCounts;
        } else {
            g_kpWordCounts = null;
            window.CET_KP_WORD_COUNTS = null;
        }
    } catch (e) {
        console.error('Failed to load static word data:', e);
        g_dictAll = g_dictAll || null;
        g_kpWordCounts = null;
        g_wordFrequencyStats = null;
        window.CET_KP_WORD_COUNTS = null;
    }
}

function clearWordHighlight(keepActiveWord) {
    if (!keepActiveWord) currentActiveWord = null;
    document.querySelectorAll('.question-item.word-highlighted').forEach(el => {
        el.classList.remove('word-highlighted');
        const ov = el.querySelector('.word-overlay');
        if (ov) ov.remove();
    });
    document.querySelectorAll('.word-stat-item.word-long-pressed').forEach(el => {
        el.classList.remove('word-long-pressed');
    });
}

function setRecordOverlayEnabled(enabled) {
    try {
        const sw = document.getElementById('showMyRecordsSwitch');
        if (!sw) return;
        const next = !!enabled;
        if (sw.checked === next) return;
        sw.checked = next;
        try {
            sw.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (e) {
            if (typeof applyRecordOverlays === 'function') applyRecordOverlays();
            if (typeof window.updateTaskProgressUI === 'function') window.updateTaskProgressUI();
        }
    } catch (e) {}
}

function setTaskWordKnownOverlayEnabled(enabled) {
    try {
        const next = !!enabled;
        window.__showTaskWordKnownOverlays = next;
        const btn = document.getElementById('globalWordProgressViewBtn');
        if (btn) btn.textContent = next ? '隐藏生词' : '显示生词';
        if (!next) {
            removeTaskWordKnownOverlays();
            window.__taskWordKnownDotOverlayState = null;
            try {
                if (typeof window.updateWordProgressUI === 'function') window.updateWordProgressUI();
            } catch (err) {}
            return;
        }
    } catch (e) {}
}

function clearWordSelectionOverlay() {
    try {
        const w = String(window.currentWordModeWord || '').trim();
        if (w && typeof clearWordModeSelectedWord === 'function') {
            clearWordModeSelectedWord();
            return;
        }
    } catch (e) {}
    try {
        if (typeof clearWordHighlight === 'function') clearWordHighlight();
    } catch (e) {}
}

function enforceOverlayMutex(active) {
    try {
        if (window.__overlayMutexGuard) return;
        window.__overlayMutexGuard = 1;

        if (active !== 'word') {
            clearWordSelectionOverlay();
        }

        if (active !== 'wordKnown') {
            try {
                const on = !!window.__showTaskWordKnownOverlays || !!document.querySelector('.word-known-overlay');
                if (on) setTaskWordKnownOverlayEnabled(false);
            } catch (e) {}
        }

        if (active !== 'record') {
            try {
                const sw = document.getElementById('showMyRecordsSwitch');
                const on = !!(sw && sw.checked) || !!document.querySelector('.record-overlay');
                if (on) setRecordOverlayEnabled(false);
            } catch (e) {}
        }
    } catch (e) {}
    try {
        window.__overlayMutexGuard = 0;
    } catch (e) {}
}

function applyWordTaskHighlightByCleanWord(cleanWord) {
    try {
        const normalized = String(cleanWord || '').toLowerCase().replace(/[^a-z]/g, '');
        if (!normalized || !g_dictAll || !g_dictAll.entries) return false;
        const lemma = resolveLemmaLite(normalized);
        const entry = g_dictAll.entries[lemma];
        const taskIds = entry && Array.isArray(entry.task_ids) ? entry.task_ids : [];
        if (!taskIds.length) return false;
        const taskIdSet = new Set(taskIds.map(x => String(x)));
        let matched = false;
        Array.from(document.querySelectorAll('.question-item')).forEach(c => {
            if (c.getAttribute('data-is-borrowed') === 'true') return;
            const qId = c.getAttribute('data-task-id');
            if (!qId || !taskIdSet.has(String(qId))) return;
            matched = true;
            c.classList.add('word-highlighted');
            if (!c.querySelector('.word-overlay')) {
                const ov = document.createElement('div');
                ov.className = 'word-overlay';
                c.appendChild(ov);
            }
        });
        return matched;
    } catch (e) {}
    return false;
}

function getCurrentSelectedWordLemma() {
    try {
        const raw = String(currentActiveWord || window.currentWordModeWord || '').trim().toLowerCase();
        if (!raw) return '';
        return resolveLemmaLite(raw);
    } catch (e) {}
    return '';
}

window.highlightWordTasks = function (word) {
    if (!g_dictAll || !g_dictAll.entries) {
        console.warn('Dictionary not loaded yet');
        return;
    }
    let keepWordKnownOverlay = false;
    try {
        keepWordKnownOverlay = !!window.__showTaskWordKnownOverlays || !!document.querySelector('.word-known-overlay');
    } catch (e) {}
    if (!keepWordKnownOverlay) {
        enforceOverlayMutex('word');
    }
    const cleanWord = String(word || '').toLowerCase().replace(/[^a-z]/g, '');
    if (!cleanWord) return;
    if (currentActiveWord === cleanWord) {
        clearWordHighlight();
        return;
    }
    currentActiveWord = cleanWord;
    clearWordHighlight(true);
    applyWordTaskHighlightByCleanWord(cleanWord);
    if (keepWordKnownOverlay && typeof applyTaskWordKnownOverlays === 'function') {
        applyTaskWordKnownOverlays();
    }
};

function bindWordStatsInteractions(container) {
    if (!container) return;
    const LONG_PRESS_MS = 500;
    const items = Array.from(container.querySelectorAll('.word-stat-item'));
    items.forEach(el => {
        const word = el.getAttribute('data-word') || '';
        const state = { timer: null, suppressClick: false, longPressTriggered: false };
        const pos = { x: 0, y: 0 };
        const clearTimer = () => {
            if (state.timer) clearTimeout(state.timer);
            state.timer = null;
        };
        const startMouse = (e) => {
            clearTimer();
            state.suppressClick = false;
            state.longPressTriggered = false;
            try {
                if (e && e.touches && e.touches[0]) {
                    pos.x = e.touches[0].clientX;
                    pos.y = e.touches[0].clientY;
                } else if (e && typeof e.clientX === 'number' && typeof e.clientY === 'number') {
                    pos.x = e.clientX;
                    pos.y = e.clientY;
                }
            } catch (err) {}
            state.timer = setTimeout(() => {
                state.suppressClick = true;
                if (typeof window.lookupWord === 'function') {
                    window.lookupWord(word, pos.x, pos.y);
                }
            }, LONG_PRESS_MS);
        };
        const startTouch = (e) => {
            clearTimer();
            state.suppressClick = false;
            state.longPressTriggered = false;
            try {
                if (e && e.touches && e.touches[0]) {
                    pos.x = e.touches[0].clientX;
                    pos.y = e.touches[0].clientY;
                }
            } catch (err) {}
            state.timer = setTimeout(() => {
                state.longPressTriggered = true;
                state.suppressClick = true;
                if (typeof window.lookupWord === 'function') {
                    window.lookupWord(word, pos.x, pos.y);
                }
            }, LONG_PRESS_MS);
        };
        const cancel = () => {
            clearTimer();
            state.longPressTriggered = false;
        };

        el.addEventListener('click', (e) => {
            if (state.suppressClick) {
                state.suppressClick = false;
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            const w = String(word || '').trim().toLowerCase();
            if (w) {
                if (!window.userKnownSet) window.userKnownSet = new Set();
                if (!window.userVocabSet) window.userVocabSet = new Set();
                window.userKnownSet.add(w);
                window.userVocabSet.delete(w);
                if (typeof window.updateWordStatsHighlights === 'function') window.updateWordStatsHighlights();
                if (typeof window.updateWordProgressUI === 'function') window.updateWordProgressUI();
                if (typeof window.updateWordStatusFilterCounts === 'function') window.updateWordStatusFilterCounts();
                fetch(buildVocabApiUrl('/vocab/mark_known_batch'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(buildVocabPayload({ words: [w] }))
                })
                .then(res => res.json())
                .then(data => {
                    if (!data || !data.success) {
                        if (typeof window.fetchUserVocabProgress === 'function') window.fetchUserVocabProgress();
                    }
                })
                .catch(() => {
                    if (typeof window.fetchUserVocabProgress === 'function') window.fetchUserVocabProgress();
                });
            }
            e.preventDefault();
            e.stopPropagation();
        });

        el.addEventListener('touchstart', startTouch, { passive: true });
        el.addEventListener('touchend', cancel, { passive: true });
        el.addEventListener('touchmove', cancel, { passive: true });

        el.addEventListener('mousedown', startMouse);
        el.addEventListener('mouseup', cancel);
        el.addEventListener('mouseleave', cancel);
    });
}

function applyWordStatusFilterInContainer(container, status) {
    if (!container) return;
    const next = (typeof status === 'string') ? status : (container.dataset.wordStatusFilter || '');
    if (next) container.dataset.wordStatusFilter = next;
    else delete container.dataset.wordStatusFilter;
    const chips = Array.from(container.querySelectorAll('.word-status-filter'));
    chips.forEach(chip => {
        const f = chip.getAttribute('data-word-filter') || '';
        const active = (!next && f === 'all') || (!!next && f === next);
        chip.classList.toggle('active', active);
    });
    try {
        const switchWrap = container.querySelector('.word-status-switch');
        const indicator = switchWrap ? switchWrap.querySelector('.word-status-indicator') : null;
        if (switchWrap && indicator) {
            const activeChip = switchWrap.querySelector('.word-status-filter.active') || switchWrap.querySelector('.word-status-filter[data-word-filter="all"]');
            if (activeChip) {
                const left = activeChip.offsetLeft;
                const w = activeChip.offsetWidth;
                indicator.style.width = `${w}px`;
                indicator.style.transform = `translateX(${left}px)`;
                indicator.style.opacity = '1';
            } else {
                indicator.style.opacity = '0';
            }
        }
    } catch (e) {}
    const items = Array.from(container.querySelectorAll('.word-stat-item'));
    items.forEach(item => {
        const s = item.getAttribute('data-status') || '';
        const show = !next || s === next;
        item.style.display = show ? 'inline-block' : 'none';
    });
}

function computeTaskProgressFromThumbs() {
    const cards = Array.from(document.querySelectorAll('.question-item'));
    if (!cards.length) return { total: 0, done: 0 };
    const completedQids = getCompletedQuestions();
    let total = 0;
    let done = 0;
    cards.forEach(el => {
        if (el.getAttribute('data-is-borrowed') === 'true') return;
        total += 1;
        const qidsAttr = el.getAttribute('data-question-ids');
        let taskQids = [];
        try {
            if (qidsAttr) taskQids = JSON.parse(qidsAttr);
        } catch (e) {}
        const isCompleted = Array.isArray(taskQids) && taskQids.some(qid => completedQids.has(String(qid)));
        if (isCompleted) done += 1;
    });
    return { total, done };
}

function renderTaskProgressBar(el, done, total) {
    if (!el) return;
    const pct = total ? (done / total) * 100 : 0;
    const safePct = Math.max(0, Math.min(100, pct));
    const rest = Math.max(0, 100 - safePct);
    const title = `已刷 ${done} / 总 ${total}`;
    el.innerHTML = `
        <div class="word-progress-bar" title="${title}">
            <div style="width:${safePct}%; background:#2fb344;"></div>
            <div style="width:${rest}%; background:#dadada;"></div>
        </div>
    `;
}

function ensureGlobalProgressActionBtn(id) {
    let btn = document.getElementById(id);
    if (btn) return btn;
    btn = document.createElement('button');
    btn.id = id;
    btn.type = 'button';
    btn.textContent = id === 'globalWordProgressViewBtn' ? '显示生词' : '查看';
    btn.style.marginLeft = '0.4vw';
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.verticalAlign = 'middle';
    btn.style.height = 'min(0.9vw, 12px)';
    btn.style.lineHeight = 'min(0.9vw, 12px)';
    btn.style.padding = '0.5vw 0.4vw';
    btn.style.fontSize = 'max(0.7vw, 10px)';
    btn.style.border = '1px solid rgb(73 138 0)';
    btn.style.color = 'rgb(73 138 0)';
    btn.style.background = '#fff';
    btn.style.borderRadius = '4px';
    btn.style.cursor = 'pointer';
    btn.style.boxSizing = 'border-box';
    return btn;
}

function getOrCreateWordStatsContainer() {
    let statsEl = document.getElementById('wordStatsContainer');
    try {
        const mode = localStorage.getItem('cet_sidebar_mode') || 'category';
        const hasSelectedWord = !!(window.currentWordModeWord && String(window.currentWordModeWord || '').trim());
        if (mode === 'word' && !hasSelectedWord) {
            if (statsEl) statsEl.style.display = 'block';
        }
    } catch (e) {}
    if (statsEl) {
        try {
            applyWordModeBaseFontSize();
        } catch (e) {}
        return statsEl;
    }
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return null;
    statsEl = document.createElement('div');
    statsEl.id = 'wordStatsContainer';
    statsEl.style.marginTop = '20px';
    statsEl.style.padding = '10px';
    statsEl.style.borderTop = '1px solid #eee';
    statsEl.style.background = '#fff';
    mainContent.appendChild(statsEl);
    try {
        applyWordModeBaseFontSize();
    } catch (e) {}
    try {
        if (typeof renderWordStats === 'function' && Array.isArray(g_allTasks)) {
            renderWordStats(g_allTasks);
        }
    } catch (e) {}
    return statsEl;
}

function getWordModeBaseFontPx() {
    try {
        const vw = 1.4;
        const maxPx = 17;
        const w = Math.max(
            (document.documentElement && document.documentElement.clientWidth) ? document.documentElement.clientWidth : 0,
            (typeof window.innerWidth === 'number') ? window.innerWidth : 0,
            1
        );
        const px = (vw / 100) * w;
        return Math.max(1, Math.min(maxPx, px));
    } catch (e) {
        return 17;
    }
}

function getWordModeExampleMetaFontPx() {
    try {
        const vw = 1;
        const minPx = 12;
        const w = Math.max(
            (document.documentElement && document.documentElement.clientWidth) ? document.documentElement.clientWidth : 0,
            (typeof window.innerWidth === 'number') ? window.innerWidth : 0,
            1
        );
        const px = (vw / 100) * w;
        return Math.max(minPx, px);
    } catch (e) {
        return 12;
    }
}

function applyWordModeBaseFontSize() {
    try {
        const px = getWordModeBaseFontPx();
        const metaPx = getWordModeExampleMetaFontPx();
        const statsEl = document.getElementById('wordStatsContainer');
        if (statsEl) statsEl.style.fontSize = `${px}px`;
        const root = statsEl || document;
        const list = Array.from(root.querySelectorAll('.word-mode-example-en'));
        list.forEach(el => {
            el.style.fontSize = `${px}px`;
        });
        const list2 = Array.from(root.querySelectorAll('.word-mode-example-cn'));
        list2.forEach(el => {
            el.style.fontSize = `${metaPx}px`;
        });
    } catch (e) {}
}

(function bindWordModeBaseFontSizeResize() {
    try {
        if (window.__wordModeBaseFontSizeResizeBound) return;
        const handler = () => {
            try {
                applyWordModeBaseFontSize();
            } catch (e) {}
        };
        window.addEventListener('resize', handler, { passive: true });
        window.addEventListener('orientationchange', () => setTimeout(handler, 0), { passive: true });
        window.__wordModeBaseFontSizeResizeBound = 1;
    } catch (e) {}
})();

function isGlobalUserLoggedIn() {
    try {
        const sw = document.getElementById('showMyRecordsSwitch');
        if (sw) return true;
        const wp = document.getElementById('globalWordProgressBar');
        if (wp) return true;
        const u = window.currentStudent;
        return !!(u && (u.id || u.phone || u.nickname));
    } catch (e) {
        return false;
    }
}

function triggerGlobalLoginPrompt() {
    try {
        if (typeof startWechatLoginPreferFast === 'function') {
            startWechatLoginPreferFast();
            return;
        }
    } catch (e) {}
    try {
        if (typeof showLoginModal === 'function') {
            showLoginModal();
            return;
        }
    } catch (e) {}
}

window.updateTaskProgressUI = async function() {
    try {
        const barEl = document.getElementById('globalTaskProgressBar');
        if (!barEl) return;
        const loggedIn = isGlobalUserLoggedIn();
        const pctEl = document.getElementById('globalTaskProgressPercent');
        const fracEl = document.getElementById('globalTaskProgressFraction');
        const switchEl = document.getElementById('showMyRecordsSwitch');
        if (!loggedIn) {
            if (pctEl) pctEl.textContent = '';
            if (fracEl) {
                const btn = ensureGlobalProgressActionBtn('globalTaskProgressViewBtn');
                btn.textContent = '登录';
                btn.onclick = (e) => {
                    try {
                        e.preventDefault();
                        e.stopPropagation();
                    } catch (err) {}
                    try {
                        if (typeof startWechatLoginPreferFast === 'function') {
                            startWechatLoginPreferFast();
                        } else if (typeof showLoginModal === 'function') {
                            showLoginModal();
                        }
                    } catch (err) {}
                };
                fracEl.textContent = '登录后查看';
                fracEl.appendChild(btn);
            }
            barEl.innerHTML = '';
            if (switchEl) {
                switchEl.checked = false;
                switchEl.disabled = true;
            }
            $('.record-overlay').remove();
            return;
        }
        if (switchEl) switchEl.disabled = false;
        if (!window.__taskRecordSnapshotLoaded) {
            try {
                await syncUserTaskRecordsFromServer();
            } catch (e) {}
        }
        if (!window.__taskRecordSnapshotLoaded) {
            barEl.innerHTML = '';
            if (pctEl) pctEl.textContent = '';
            if (fracEl) fracEl.textContent = '同步中...';
            return;
        }
        const p = computeTaskProgressFromThumbs();
        const total = p && p.total ? p.total : 0;
        const done = p && p.done ? p.done : 0;
        renderTaskProgressBar(barEl, done, total);
        if (pctEl) {
            const pct = total ? Math.round((done / total) * 100) : 0;
            pctEl.textContent = `${pct}%`;
        }
        if (fracEl) {
            const btn = ensureGlobalProgressActionBtn('globalTaskProgressViewBtn');
            btn.textContent = (switchEl && switchEl.checked) ? '隐藏' : '查看';
            btn.onclick = (e) => {
                try {
                    e.preventDefault();
                    e.stopPropagation();
                } catch (err) {}
                const sw = document.getElementById('showMyRecordsSwitch');
                if (!sw) {
                    try {
                        if (typeof applyRecordOverlays === 'function') applyRecordOverlays();
                    } catch (err) {}
                    return;
                }
                const next = !sw.checked;
                if (next) {
                    try { enforceOverlayMutex('record'); } catch (err) {}
                }
                sw.checked = next;
                btn.textContent = sw.checked ? '隐藏' : '查看';
                let applied = false;
                try {
                    sw.dispatchEvent(new Event('change', { bubbles: true }));
                    applied = true;
                } catch (err) {
                    applied = false;
                }
                // 强制兜底：点了“查看/隐藏”就必须应用一次，避免事件丢失/监听器还没挂导致完全没反应
                try {
                    if (typeof applyRecordOverlays === 'function') applyRecordOverlays();
                    applied = true;
                } catch (err) {}
                // 额外刷新一次进度 UI，确保“查看/隐藏”文字切换同步
                try {
                    if (!sw.checked) {
                        const bt2 = document.getElementById('globalTaskProgressViewBtn');
                        if (bt2) bt2.textContent = '查看';
                    }
                } catch (err) {}
            };
            fracEl.textContent = `${done}/${total}篇`;
            fracEl.appendChild(btn);
        }
        try {
            const sw = document.getElementById('showMyRecordsSwitch');
            if (sw && sw.checked && typeof applyRecordOverlays === 'function') applyRecordOverlays();
        } catch (e) {}
    } catch (e) {}
};

function updateWordStatusFilterCountsInternal(container) {
    if (!container) return;
    const items = Array.from(container.querySelectorAll('.word-stat-item'));
    const total = items.length;
    let known = 0;
    let unknown = 0;
    items.forEach(item => {
        const s = item.getAttribute('data-status') || 'unknown';
        if (s === 'known') known += 1;
        else if (s === 'unknown') unknown += 1;
    });
    const chips = Array.from(container.querySelectorAll('.word-status-filter'));
    chips.forEach(chip => {
        const f = chip.getAttribute('data-word-filter') || '';
        const cEl = chip.querySelector('.word-status-count');
        if (!cEl) return;
        if (f === 'all') cEl.textContent = String(total);
        else if (f === 'known') cEl.textContent = String(known);
        else if (f === 'unknown') cEl.textContent = String(unknown);
        else cEl.textContent = '0';
    });
}

function bindWordStatusFilters(container) {
    if (!container) return;
    if (container.dataset && container.dataset.wordStatusFilterBound !== '1') {
        container.addEventListener('click', (e) => {
            const target = e && e.target;
            const chip = target && target.closest ? target.closest('.word-status-filter') : null;
            if (!chip || !container.contains(chip)) return;
            const f = chip.getAttribute('data-word-filter') || '';
            const next = (f === 'all') ? '' : f;
            applyWordStatusFilterInContainer(container, next);
            updateWordStatusFilterCountsInternal(container);
            e.preventDefault();
            e.stopPropagation();
        }, true);
        container.dataset.wordStatusFilterBound = '1';
    }
    if (container.dataset && container.dataset.wordStatusFilterResizeBound !== '1') {
        window.addEventListener('resize', () => {
            try {
                applyWordStatusFilterInContainer(container);
            } catch (e) {}
        });
        container.dataset.wordStatusFilterResizeBound = '1';
    }
    try {
        if (container.dataset && !container.dataset.wordStatusFilter) {
            container.dataset.wordStatusFilter = 'unknown';
        }
    } catch (e) {}
    applyWordStatusFilterInContainer(container);
    updateWordStatusFilterCountsInternal(container);
}

function applySidebarModeSwitchUi(mode) {
    try {
        const wrap = document.getElementById('sidebarModeSwitch');
        if (!wrap) return;
        const chips = Array.from(wrap.querySelectorAll('[data-sidebar-mode]'));
        chips.forEach(chip => {
            const m = chip.getAttribute('data-sidebar-mode') || '';
            chip.classList.toggle('active', m === mode);
        });
        const indicator = wrap.querySelector('.word-status-indicator');
        if (!indicator) return;
        const activeChip = wrap.querySelector('[data-sidebar-mode].active') || wrap.querySelector('[data-sidebar-mode="category"]');
        if (!activeChip) {
            indicator.style.opacity = '0';
            return;
        }
        const left = activeChip.offsetLeft;
        const w = activeChip.offsetWidth;
        indicator.style.width = `${w}px`;
        indicator.style.transform = `translateX(${left}px)`;
        indicator.style.opacity = '1';
    } catch (e) {}
}

function applyWordModeFilterSwitchUi(mode) {
    try {
        const wrap = document.getElementById('wordModeFilterSwitch');
        if (!wrap) return;
        const m2 = (mode === 'known' || mode === 'unknown') ? mode : 'unknown';
        const chips = Array.from(wrap.querySelectorAll('[data-wordmode-filter]'));
        chips.forEach(chip => {
            const m = chip.getAttribute('data-wordmode-filter') || '';
            chip.classList.toggle('active', m === m2);
        });
        const indicator = wrap.querySelector('.word-status-indicator');
        if (!indicator) return;
        const activeChip = wrap.querySelector('[data-wordmode-filter].active') || wrap.querySelector('[data-wordmode-filter="unknown"]');
        if (!activeChip) {
            indicator.style.opacity = '0';
            return;
        }
        const left = activeChip.offsetLeft;
        const w = activeChip.offsetWidth;
        indicator.style.width = `${w}px`;
        indicator.style.transform = `translateX(${left}px)`;
        indicator.style.opacity = '1';
    } catch (e) {}
}

function updateWordModeFilterCounts() {
    try {
        const wrap = document.getElementById('wordModeFilterSwitch');
        const listEl = document.getElementById('wordModeWordList');
        if (!wrap || !listEl) return;
        const rows = Array.from(listEl.querySelectorAll('.word-mode-row'));
        let known = 0;
        let unknown = 0;
        rows.forEach(r => {
            const s = r.getAttribute('data-status') || 'unknown';
            if (s === 'known') known += 1;
            else if (s === 'unknown') unknown += 1;
        });
        const chips = Array.from(wrap.querySelectorAll('[data-wordmode-filter]'));
        chips.forEach(chip => {
            const f = chip.getAttribute('data-wordmode-filter') || '';
            const cEl = chip.querySelector('.word-status-count');
            if (!cEl) return;
            if (f === 'known') cEl.textContent = String(known);
            else if (f === 'unknown') cEl.textContent = String(unknown);
            else cEl.textContent = '0';
        });
    } catch (e) {}
}

function getWordModeStatusCountsFromList() {
    const out = { known: 0, unknown: 0 };
    try {
        const listEl = document.getElementById('wordModeWordList');
        if (!listEl) return out;
        const rows = Array.from(listEl.querySelectorAll('.word-mode-row'));
        rows.forEach(r => {
            const s = r.getAttribute('data-status') || 'unknown';
            if (s === 'known') out.known += 1;
            else if (s === 'unknown') out.unknown += 1;
        });
    } catch (e) {}
    return out;
}

async function resolveWordModeAutoDefaultFilter() {
    try {
        if (!isGlobalUserLoggedIn()) return 'unknown';
        const data = await fetchCurrentPageMembershipStatus(false);
        if (!(data && data.is_member)) return 'unknown';
    } catch (e) {
        return 'unknown';
    }
    const counts = getWordModeStatusCountsFromList();
    if (counts.unknown > 0) return 'unknown';
    if (counts.known > 0) return 'known';
    return 'unknown';
}

function applyWordModeAutoDefaultFilter() {
    try {
        if (window.__wordModeFilterTouched) return;
        const listEl = document.getElementById('wordModeWordList');
        if (!listEl) return;
        const token = (window.__wordModeAutoFilterToken || 0) + 1;
        window.__wordModeAutoFilterToken = token;
        resolveWordModeAutoDefaultFilter().then(mode => {
            try {
                if (window.__wordModeFilterTouched) return;
                if (window.__wordModeAutoFilterToken !== token) return;
                setWordModeFilter(mode);
            } catch (err) {}
        }).catch(() => {});
    } catch (e) {}
}

function applyWordModeFilterToList(mode) {
    const listEl = document.getElementById('wordModeWordList');
    if (!listEl) return;
    const m = (mode === 'known' || mode === 'unknown') ? mode : 'unknown';
    const hadSelection = !!(window.currentWordModeWord && String(window.currentWordModeWord || '').trim());
    const rows = Array.from(listEl.querySelectorAll('.word-mode-row'));
    rows.forEach(r => {
        const status = r.getAttribute('data-status') || 'unknown';
        const show = (status === m);
        r.style.display = show ? 'flex' : 'none';
    });
    const activeRow = listEl.querySelector('.word-mode-row.active');
    if (activeRow && activeRow.style.display === 'none') {
        activeRow.classList.remove('active');
    }
    const shouldAutoPick = (hadSelection || !!(window.__wordModeSelectionHint && window.__wordModeSelectionHint.anchorWord));
    if (shouldAutoPick && !listEl.querySelector('.word-mode-row.active')) {
        let picked = null;
        try {
            const hint = window.__wordModeSelectionHint;
            const anchorWord = hint && hint.mode === m ? String(hint.anchorWord || '').trim() : '';
            if (anchorWord) {
                const idx = rows.findIndex(r => String((r.dataset && r.dataset.word) ? r.dataset.word : '').trim() === anchorWord);
                if (idx >= 0) {
                    for (let j = idx + 1; j < rows.length; j++) {
                        if (rows[j].style.display !== 'none') { picked = rows[j]; break; }
                    }
                    if (!picked) {
                        for (let j = idx - 1; j >= 0; j--) {
                            if (rows[j].style.display !== 'none') { picked = rows[j]; break; }
                        }
                    }
                }
            }
        } catch (e) {}
        try {
            window.__wordModeSelectionHint = null;
        } catch (e) {}
        if (!picked) {
            picked = listEl.querySelector('.word-mode-row:not([style*="display: none"])') || rows.find(r => r.style.display !== 'none');
        }
        if (picked && picked.dataset && picked.dataset.word) {
            setWordModeSelectedWord(picked.dataset.word);
        }
    }
    try {
        syncWordModeRowInlineControls();
    } catch (e) {}
}

function setWordModeFilter(mode) {
    const m = (mode === 'known' || mode === 'unknown') ? mode : 'unknown';
    try {
        localStorage.setItem('cet_word_mode_filter', m);
    } catch (e) {}
    try {
        window.__wordModeSelectionHint = null;
    } catch (e) {}
    applyWordModeFilterSwitchUi(m);
    applyWordModeFilterToList(m);
}

function selectDefaultWordModeWordByPriority() {
    const listEl = document.getElementById('wordModeWordList');
    if (!listEl) return false;
    const rows = Array.from(listEl.querySelectorAll('.word-mode-row'));
    if (!rows.length) return false;
    const findFirst = (s) => rows.find(r => (r.getAttribute('data-status') || 'unknown') === s);
    const targetRow = findFirst('unknown') || findFirst('known');
    if (!targetRow || !targetRow.dataset || !targetRow.dataset.word) return false;
    const status = targetRow.getAttribute('data-status') || 'unknown';
    setWordModeFilter(status);
    setWordModeSelectedWord(targetRow.dataset.word, { scrollThumbs: false });
    return true;
}

function initWordModeFilterSwitch() {
    const wrap = document.getElementById('wordModeFilterSwitch');
    if (!wrap) return;
    if (wrap.dataset && wrap.dataset.bound === '1') return;
    wrap.addEventListener('click', async (e) => {
        const t = e && e.target;
        const chip = t && t.closest ? t.closest('[data-wordmode-filter]') : null;
        if (!chip || !wrap.contains(chip)) return;
        e.preventDefault();
        e.stopPropagation();
        const m = chip.getAttribute('data-wordmode-filter') || 'unknown';
        if (m === 'known' || m === 'unknown') {
            const allowed = await ensureCurrentPageMembershipAccess();
            if (!allowed) return;
        }
        window.__wordModeFilterTouched = true;
        setWordModeFilter(m);
    }, true);
    wrap.dataset.bound = '1';
    const initial = 'unknown';
    setWordModeFilter(initial);
    setTimeout(() => applyWordModeFilterSwitchUi(initial), 0);
    setTimeout(() => applyWordModeAutoDefaultFilter(), 0);
}

function syncWordModeRowInlineControls() {
    const listEl = document.getElementById('wordModeWordList');
    if (!listEl) return;
    const rows = Array.from(listEl.querySelectorAll('.word-mode-row'));
    rows.forEach(r => {
        const isActive = r.classList.contains('active');
        const meta = r.querySelector('.word-mode-meta');
        const actions = r.querySelector('.word-mode-actions');
        if (meta) meta.style.display = isActive ? 'none' : '';
        if (actions) actions.style.display = isActive ? 'inline-flex' : 'none';
        if (isActive && actions) {
            const s = r.getAttribute('data-status') || 'unknown';
            const btnKnown = actions.querySelector('.word-mode-action-known');
            const btnUnknown = actions.querySelector('.word-mode-action-unknown');
            if (s === 'known') {
                if (btnKnown) btnKnown.style.display = 'none';
                if (btnUnknown) btnUnknown.style.display = '';
            } else if (s === 'unknown') {
                if (btnKnown) btnKnown.style.display = '';
                if (btnUnknown) btnUnknown.style.display = 'none';
            } else {
                if (btnKnown) btnKnown.style.display = '';
                if (btnUnknown) btnUnknown.style.display = '';
            }
            const isDual = !!(btnKnown && btnKnown.style.display !== 'none') && !!(btnUnknown && btnUnknown.style.display !== 'none');
            actions.style.alignItems = 'flex-end';
            actions.style.flexDirection = isDual ? 'column' : 'row';
        }
    });
}

function setWordModeWordStatus(word, nextStatus) {
    const w = String(word || '').trim();
    if (!w) return;
    if (!isGlobalUserLoggedIn()) {
        triggerGlobalLoginPrompt();
        return;
    }
    if (nextStatus === 'known' || nextStatus === 'unknown') {
        ensureCurrentPageMembershipAccess().then(allowed => {
            if (!allowed) return;
            setWordModeWordStatus(w, `${nextStatus}_confirmed`);
        });
        return;
    }
    const wk = w.toLowerCase();
    if (!window.userKnownSet) window.userKnownSet = new Set();
    if (!window.userVocabSet) window.userVocabSet = new Set();
    const normalizedNextStatus = nextStatus === 'known_confirmed'
        ? 'known'
        : nextStatus === 'unknown_confirmed'
        ? 'unknown'
        : nextStatus;
    const status = (normalizedNextStatus === 'known' || normalizedNextStatus === 'unknown' || normalizedNextStatus === 'unclassified')
        ? normalizedNextStatus
        : 'unclassified';
    const shouldShowKnownFeedback = status === 'known' && shouldPlayWordKnownExplosionAudio();
    if (status === 'known') {
        try {
            if (typeof window.playExplosionAudio === 'function') window.playExplosionAudio();
        } catch (e) {}
    }
    try {
        if (status === 'known' || status === 'unknown') {
            const overlayOn = !!window.__showTaskWordKnownOverlays || !!document.querySelector('.word-known-overlay');
            if (shouldShowKnownFeedback && overlayOn && g_dictAll && g_dictAll.entries) {
                const lemma = resolveLemmaLite(wk);
                const entry = g_dictAll.entries[lemma];
                const taskIds = entry && Array.isArray(entry.task_ids) ? entry.task_ids : [];
                window.__pendingWordKnownOverlayFlash = {
                    prevStats: getTaskWordKnownOverlayStats(),
                    targetStatus: status,
                    lemma,
                    taskIds: new Set(taskIds.map(taskId => String(taskId || '').trim()).filter(Boolean))
                };
            } else {
                window.__pendingWordKnownOverlayFlash = null;
            }
        } else {
            window.__pendingWordKnownOverlayFlash = null;
        }
    } catch (e) {}
    try {
        const saved = localStorage.getItem('cet_word_mode_filter') || 'unknown';
        if (String(window.currentWordModeWord || '').trim() === w) {
            window.__wordModeSelectionHint = { anchorWord: w, mode: saved, ts: Date.now() };
        }
    } catch (e) {}

    const lemmaForKeyCheck = (() => {
        try { return resolveLemmaLite(wk); } catch (e) { return ''; }
    })();
    const isKeyWord = !!lemmaForKeyCheck && isKeyLemmaLite(lemmaForKeyCheck);

    if (status === 'known') {
        window.userKnownSet.add(wk);
        window.userVocabSet.delete(wk);
    } else if (status === 'unknown') {
        window.userKnownSet.delete(wk);
        if (!isKeyWord) {
            window.userVocabSet.add(wk);
        } else {
            window.userVocabSet.delete(wk);
        }
    } else {
        window.userKnownSet.delete(wk);
        if (!isKeyWord) {
            window.userVocabSet.delete(wk);
        } else {
            window.userVocabSet.delete(wk);
        }
    }

    try {
        const listEl = document.getElementById('wordModeWordList');
        if (listEl) {
            const row = listEl.querySelector(`.word-mode-row[data-word="${CSS.escape(w)}"]`);
            if (row) row.setAttribute('data-status', status);
        }
    } catch (e) {}

    try {
        if (typeof window.updateWordStatsHighlights === 'function') window.updateWordStatsHighlights();
        if (typeof window.updateWordProgressUI === 'function') window.updateWordProgressUI();
    } catch (e) {}

    try {
        const saved = localStorage.getItem('cet_word_mode_filter') || 'unknown';
        applyWordModeFilterSwitchUi(saved);
        applyWordModeFilterToList(saved);
        syncWordModeRowInlineControls();
        updateWordModeFilterCounts();
    } catch (e) {}

    if (status === 'known') {
        fetch(buildVocabApiUrl('/vocab/mark_known_batch'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildVocabPayload({ words: [wk] }))
        })
        .then(res => res.json())
        .then(data => {
            if (!data || !data.success) {
                if (typeof window.fetchUserVocabProgress === 'function') window.fetchUserVocabProgress();
            }
        })
        .catch(() => {
            if (typeof window.fetchUserVocabProgress === 'function') window.fetchUserVocabProgress();
        });
        return;
    }

    if (status === 'unknown') {
        fetch(buildVocabApiUrl('/vocab/add'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildVocabPayload({ word: wk }))
        })
        .then(res => res.json())
        .then(data => {
            if (!data || !data.success) {
                if (typeof window.fetchUserVocabProgress === 'function') window.fetchUserVocabProgress();
            }
        })
        .catch(() => {
            if (typeof window.fetchUserVocabProgress === 'function') window.fetchUserVocabProgress();
        });
        return;
    }

    fetch(buildVocabApiUrl('/vocab/unset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildVocabPayload({ word: wk }))
    })
    .then(res => res.json())
    .then(data => {
        if (!data || !data.success) {
            if (typeof window.fetchUserVocabProgress === 'function') window.fetchUserVocabProgress();
        }
    })
    .catch(() => {
        if (typeof window.fetchUserVocabProgress === 'function') window.fetchUserVocabProgress();
    });
}

function refreshWordModeRowStatusesFromSets() {
    try {
        const listEl = document.getElementById('wordModeWordList');
        if (!listEl) return;
        appendNonKeyUnknownWordsToWordModeList();
        const rows = Array.from(listEl.querySelectorAll('.word-mode-row'));
        const knownSet = window.userKnownSet || new Set();
        const unknownSet = window.userVocabSet || new Set();
        const knownLemmaSet = buildLemmaSetLite(knownSet);
        const unknownLemmaSet = buildLemmaSetLite(unknownSet);
        rows.forEach(r => {
            const w = String((r.dataset && r.dataset.word) ? r.dataset.word : '').trim();
            const status = computeWordModeStatusLite(w, unknownSet, knownSet, unknownLemmaSet, knownLemmaSet);
            r.setAttribute('data-status', status);
        });
        let saved = 'unknown';
        try {
            const raw = localStorage.getItem('cet_word_mode_filter');
            if (raw === 'known' || raw === 'unknown') saved = raw;
        } catch (e) {}
        applyWordModeFilterSwitchUi(saved);
        applyWordModeFilterToList(saved);
        syncWordModeRowInlineControls();
        updateWordModeFilterCounts();
        applyWordModeAutoDefaultFilter();
    } catch (e) {}
}

(function () {
    try {
        window.refreshWordModeRowStatusesFromSets = refreshWordModeRowStatusesFromSets;
    } catch (e) {}
})();

(function bindWordModeVocabSync() {
    let tries = 0;
    const t = setInterval(() => {
        tries += 1;
        try {
            const fn = window.updateWordStatsHighlights;
            if (typeof fn === 'function' && !fn.__wordModeHooked) {
                const wrapped = function () {
                    const r = fn.apply(this, arguments);
                    refreshWordModeRowStatusesFromSets();
                    try {
                        if (window.__showTaskWordKnownOverlays && typeof applyTaskWordKnownOverlays === 'function') {
                            applyTaskWordKnownOverlays();
                        }
                    } catch (e) {}
                    return r;
                };
                wrapped.__wordModeHooked = 1;
                window.updateWordStatsHighlights = wrapped;
                clearInterval(t);
                return;
            }
        } catch (e) {}
        if (tries > 40) clearInterval(t);
    }, 250);
})();

(function bindWordModeVocabLoadedPoll() {
    let tries = 0;
    const t = setInterval(() => {
        tries += 1;
        try {
            const listEl = document.getElementById('wordModeWordList');
            if (!listEl) return;
            const mode = localStorage.getItem('cet_sidebar_mode') || 'category';
            if (mode !== 'word') return;
            const loaded = !!window.isVocabLoaded || ((window.userVocabSet && window.userVocabSet.size) || (window.userKnownSet && window.userKnownSet.size));
            if (loaded) {
                refreshWordModeRowStatusesFromSets();
                clearInterval(t);
                return;
            }
        } catch (e) {}
        if (tries > 80) clearInterval(t);
    }, 250);
})();

(function () {
    if (typeof window.buildLemmaSetLite === 'function') return;
    window.buildLemmaSetLite = buildLemmaSetLite;
})();

function buildLemmaSetLite(srcSet) {
    const out = new Set();
    try {
        if (!srcSet || typeof srcSet.forEach !== 'function') return out;
        srcSet.forEach(w => {
            const clean = String(w || '').trim().toLowerCase().replace(/[^a-z]/g, '');
            if (!clean) return;
            out.add(resolveLemmaLite(clean));
        });
    } catch (e) {}
    return out;
}

function isKeyLemmaLite(lemma) {
    try {
        const l = String(lemma || '').trim().toLowerCase();
        if (!l || !g_dictAll || !g_dictAll.entries) return false;
        const entry = g_dictAll.entries[l];
        if (!entry || typeof entry !== 'object') return false;
        if (EXAM_TYPE === 'kaoyan') return entry.is_kaoyan_key === true;
        if (EXAM_TYPE === 'cet6') return entry.is_cet6_key === true;
        return entry.is_cet4_key === true;
    } catch (e) {}
    return false;
}

function computeWordModeStatusLite(word, unknownSet, knownSet, unknownLemmaSet, knownLemmaSet) {
    const raw = String(word || '').trim().toLowerCase();
    const clean = raw.replace(/[^a-z]/g, '');
    const lemma = clean ? resolveLemmaLite(clean) : '';
    if (lemma && isKeyLemmaLite(lemma)) {
        if (knownSet.has(raw) || (clean && knownSet.has(clean)) || knownSet.has(lemma) || (lemma && knownLemmaSet && knownLemmaSet.has(lemma))) {
            return 'known';
        }
        return 'unknown';
    }
    if (raw && (unknownSet.has(raw) || (clean && unknownSet.has(clean)) || (lemma && unknownSet.has(lemma)) || (lemma && unknownLemmaSet && unknownLemmaSet.has(lemma)))) return 'unknown';
    if (raw && (knownSet.has(raw) || (clean && knownSet.has(clean)) || (lemma && knownSet.has(lemma)) || (lemma && knownLemmaSet && knownLemmaSet.has(lemma)))) return 'known';
    return 'unknown';
}

function normalizeWordModeLemmaLite(word) {
    const clean = String(word || '').trim().toLowerCase().replace(/[^a-z]/g, '');
    if (!clean) return '';
    return resolveLemmaLite(clean);
}

function appendNonKeyUnknownWordsToWordModeList() {
    try {
        const listEl = document.getElementById('wordModeWordList');
        if (!listEl) return;
        const existingRows = Array.from(listEl.querySelectorAll('.word-mode-row'));
        if (!existingRows.length) return;

        const knownSet = window.userKnownSet || new Set();
        const unknownSet = window.userVocabSet || new Set();
        const knownLemmaSet = buildLemmaSetLite(knownSet);
        const unknownLemmaSet = buildLemmaSetLite(unknownSet);

        const baseLemmaSet = new Set();
        existingRows.forEach(r => {
            const w = String((r.dataset && r.dataset.word) ? r.dataset.word : '').trim();
            const lk = normalizeWordModeLemmaLite(w);
            if (lk) baseLemmaSet.add(lk);
        });

        const extras = [];
        try {
            unknownSet.forEach(w => {
                const lk = normalizeWordModeLemmaLite(w);
                if (!lk) return;
                if (isKeyLemmaLite(lk)) return;
                if (baseLemmaSet.has(lk)) return;
                baseLemmaSet.add(lk);
                extras.push({ word: lk, meta: '非重点词' });
            });
        } catch (e) {}

        if (!extras.length) return;
        extras.sort((a, b) => String(a.word || '').localeCompare(String(b.word || ''), 'en'));

        extras.forEach(p => {
            const row = document.createElement('div');
            row.className = 'word-mode-row';
            row.dataset.word = p.word;
            try {
                const status = computeWordModeStatusLite(p.word, unknownSet, knownSet, unknownLemmaSet, knownLemmaSet);
                row.setAttribute('data-status', status);
            } catch (e) {
                row.setAttribute('data-status', 'unknown');
            }
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '6px 8px';
            row.style.border = '1px solid #dbe4ed';
            row.style.borderRadius = '6px';
            row.style.background = '#fff';
            row.style.cursor = 'pointer';
            row.style.userSelect = 'none';

            const wSpan = document.createElement('span');
            wSpan.style.fontWeight = '600';
            wSpan.style.color = '#111';
            wSpan.style.fontSize = '13px';
            wSpan.textContent = p.word;
            row.appendChild(wSpan);

            const right = document.createElement('span');
            right.style.display = 'inline-flex';
            right.style.alignItems = 'center';
            right.style.gap = '6px';
            row.appendChild(right);

            const mSpan = document.createElement('span');
            mSpan.className = 'word-mode-meta';
            mSpan.style.color = '#888';
            mSpan.style.fontSize = '12px';
            mSpan.textContent = p.meta || '';
            right.appendChild(mSpan);

            const actions = document.createElement('span');
            actions.className = 'word-mode-actions';
            actions.style.display = 'none';
            actions.style.flexDirection = 'column';
            actions.style.alignItems = 'flex-end';
            actions.style.justifyContent = 'flex-start';
            actions.style.gap = '6px';
            right.appendChild(actions);

            const btnKnown = document.createElement('button');
            btnKnown.type = 'button';
            btnKnown.className = 'word-mode-action-btn word-mode-action-known';
            btnKnown.textContent = '标为熟词';
            btnKnown.addEventListener('click', (e) => {
                try {
                    e.preventDefault();
                    e.stopPropagation();
                } catch (err) {}
                if (!isGlobalUserLoggedIn()) {
                    try {
                        if (typeof startWechatLoginPreferFast === 'function') {
                            startWechatLoginPreferFast();
                        } else if (typeof showLoginModal === 'function') {
                            showLoginModal();
                        }
                    } catch (err) {}
                    return;
                }
                setWordModeWordStatus(p.word, 'known');
            });
            actions.appendChild(btnKnown);

            const btnUnknown = document.createElement('button');
            btnUnknown.type = 'button';
            btnUnknown.className = 'word-mode-action-btn word-mode-action-unknown';
            btnUnknown.textContent = '标为生词';
            btnUnknown.addEventListener('click', (e) => {
                try {
                    e.preventDefault();
                    e.stopPropagation();
                } catch (err) {}
                if (!isGlobalUserLoggedIn()) {
                    try {
                        if (typeof startWechatLoginPreferFast === 'function') {
                            startWechatLoginPreferFast();
                        } else if (typeof showLoginModal === 'function') {
                            showLoginModal();
                        }
                    } catch (err) {}
                    return;
                }
                setWordModeWordStatus(p.word, 'unknown');
            });
            actions.appendChild(btnUnknown);

            row.addEventListener('click', () => {
                try {
                    if (row.classList.contains('active') || String(window.currentWordModeWord || '').trim() === String(p.word || '').trim()) {
                        clearWordModeSelectedWord();
                        return;
                    }
                    setWordModeSelectedWord(p.word);
                } catch (e) {}
            });

            listEl.appendChild(row);
        });

        try {
            const prev = Array.isArray(window.wordModePairs) ? window.wordModePairs : [];
            window.wordModePairs = prev.concat(extras);
        } catch (e) {}
    } catch (e) {}
}

function renderWordModeListFromWordStats() {
    const listEl = document.getElementById('wordModeWordList');
    if (!listEl) return;
    const statEl = document.getElementById('wordStatsContainer');
    const items = statEl ? Array.from(statEl.querySelectorAll('.word-stat-item')) : [];
    listEl.innerHTML = '';

    const normalizeMeta = (metaRaw) => {
        const meta = String(metaRaw || '').trim();
        if (!meta) return '';
        if (/[篇次]/.test(meta)) return meta;
        const m = meta.match(/^(\d+)\s*\/\s*(\d+)$/);
        if (m) return `${m[1]}篇/${m[2]}次`;
        return meta;
    };

    const pairs = [];
    if (Array.isArray(window.__wordModeStatsPairs) && window.__wordModeStatsPairs.length) {
        window.__wordModeStatsPairs.forEach(p => {
            if (!p) return;
            const w = String(p.word || '').trim();
            if (!w) return;
            pairs.push({ word: w, meta: normalizeMeta(p.meta || '') });
        });
    } else if (items.length) {
        items.forEach(it => {
            const w = (it.getAttribute('data-word') || '').trim();
            if (!w) return;
            const small = it.querySelector('small');
            const meta = small ? normalizeMeta(small.textContent || '') : '';
            pairs.push({ word: w, meta });
        });
    } else if (Array.isArray(window.currentWordStatsWords) && window.currentWordStatsWords.length) {
        window.currentWordStatsWords.forEach(w => {
            const ww = String(w || '').trim();
            if (!ww) return;
            pairs.push({ word: ww, meta: '' });
        });
    }

    if (!pairs.length) {
        const empty = document.createElement('div');
        empty.style.color = '#999';
        empty.style.fontSize = '12px';
        empty.textContent = '词汇统计未生成';
        listEl.appendChild(empty);
        window.wordModePairs = [];
        return [];
    }

    const knownSet = window.userKnownSet || new Set();
    const unknownSet = window.userVocabSet || new Set();
    const knownLemmaSet = buildLemmaSetLite(knownSet);
    const unknownLemmaSet = buildLemmaSetLite(unknownSet);
    const baseLemmaSet = new Set();
    pairs.forEach(p => {
        const lk = normalizeWordModeLemmaLite(p.word);
        if (lk) baseLemmaSet.add(lk);
    });
    const extras = [];
    try {
        unknownSet.forEach(w => {
            const lk = normalizeWordModeLemmaLite(w);
            if (!lk) return;
            if (baseLemmaSet.has(lk)) return;
            baseLemmaSet.add(lk);
            extras.push({ word: lk, meta: '非重点词' });
        });
    } catch (e) {}
    extras.sort((a, b) => String(a.word || '').localeCompare(String(b.word || ''), 'en'));

    const allPairs = pairs.concat(extras);
    window.wordModePairs = allPairs.slice();

    allPairs.forEach(p => {
        const row = document.createElement('div');
        row.className = 'word-mode-row';
        row.dataset.word = p.word;
        try {
            const status = computeWordModeStatusLite(p.word, unknownSet, knownSet, unknownLemmaSet, knownLemmaSet);
            row.setAttribute('data-status', status);
        } catch (e) {
            row.setAttribute('data-status', 'unknown');
        }
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.padding = '6px 8px';
        row.style.border = '1px solid #dbe4ed';
        row.style.borderRadius = '6px';
        row.style.background = '#fff';
        row.style.cursor = 'pointer';
        row.style.userSelect = 'none';

        const wSpan = document.createElement('span');
        wSpan.style.fontWeight = '600';
        wSpan.style.color = '#111';
        wSpan.style.fontSize = '13px';
        wSpan.textContent = p.word;
        row.appendChild(wSpan);

        const right = document.createElement('span');
        right.style.display = 'inline-flex';
        right.style.alignItems = 'center';
        right.style.gap = '6px';
        row.appendChild(right);

        const mSpan = document.createElement('span');
        mSpan.className = 'word-mode-meta';
        mSpan.style.color = '#888';
        mSpan.style.fontSize = '12px';
        mSpan.textContent = p.meta || '';
        right.appendChild(mSpan);

        const actions = document.createElement('span');
        actions.className = 'word-mode-actions';
        actions.style.display = 'none';
        actions.style.flexDirection = 'column';
        actions.style.alignItems = 'flex-end';
        actions.style.justifyContent = 'flex-start';
        actions.style.gap = '6px';
        right.appendChild(actions);

        const btnKnown = document.createElement('button');
        btnKnown.type = 'button';
        btnKnown.className = 'word-mode-action-btn word-mode-action-known';
        btnKnown.textContent = '标为熟词';
        btnKnown.addEventListener('click', (e) => {
            try {
                e.preventDefault();
                e.stopPropagation();
            } catch (err) {}
            if (!isGlobalUserLoggedIn()) {
                triggerGlobalLoginPrompt();
                return;
            }
            setWordModeWordStatus(p.word, 'known');
        });
        actions.appendChild(btnKnown);

        const btnUnknown = document.createElement('button');
        btnUnknown.type = 'button';
        btnUnknown.className = 'word-mode-action-btn word-mode-action-unknown';
        btnUnknown.textContent = '标为生词';
        btnUnknown.addEventListener('click', (e) => {
            try {
                e.preventDefault();
                e.stopPropagation();
            } catch (err) {}
            if (!isGlobalUserLoggedIn()) {
                triggerGlobalLoginPrompt();
                return;
            }
            setWordModeWordStatus(p.word, 'unknown');
        });
        actions.appendChild(btnUnknown);

        row.addEventListener('click', () => {
            try {
                if (row.classList.contains('active') || String(window.currentWordModeWord || '').trim() === String(p.word || '').trim()) {
                    clearWordModeSelectedWord();
                    return;
                }
                setWordModeSelectedWord(p.word);
            } catch (e) {}
        });

        listEl.appendChild(row);
    });
    try {
        let fm = 'unknown';
        try {
            const saved = localStorage.getItem('cet_word_mode_filter');
            if (saved === 'known' || saved === 'unknown') fm = saved;
        } catch (e) {}
        applyWordModeFilterSwitchUi(fm);
        applyWordModeFilterToList(fm);
        updateWordModeFilterCounts();
        applyWordModeAutoDefaultFilter();
    } catch (e) {}
    try {
        if (window.currentWordModeWord) {
            setWordModeSelectedWord(window.currentWordModeWord, { scrollThumbs: false });
        }
    } catch (e) {}
    try {
        syncWordModeRowInlineControls();
    } catch (e) {}
    return pairs;
}

function escapeHtmlLite(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeRegExpLite(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pickEvenlyLite(items, k) {
    const arr = Array.isArray(items) ? items : [];
    const n = arr.length;
    if (n === 0) return [];
    const kk = Math.max(1, Math.min(k || 1, n));
    if (n <= kk) return arr.slice(0, kk);
    const picked = [];
    let lastIdx = -1;
    for (let i = 0; i < kk; i++) {
        let idx = Math.floor(((i + 0.5) * n) / kk);
        if (idx <= lastIdx) idx = lastIdx + 1;
        if (idx >= n) idx = n - 1;
        picked.push(arr[idx]);
        lastIdx = idx;
    }
    return picked;
}

function resolveLemmaLite(cleanWord) {
    try {
        const normalized = String(cleanWord || '').toLowerCase().replace(/[^a-z]/g, '');
        if (!normalized) return '';
        const entries = (g_dictAll && g_dictAll.entries) ? g_dictAll.entries : {};
        const variants = [normalized];
        if (normalized.endsWith('ies') && normalized.length > 3) variants.push(`${normalized.slice(0, -3)}y`);
        if (normalized.endsWith('ied') && normalized.length > 3) variants.push(`${normalized.slice(0, -3)}y`);
        if (normalized.endsWith('s')) variants.push(normalized.slice(0, -1));
        if (normalized.endsWith('es')) variants.push(normalized.slice(0, -2));
        if (normalized.endsWith('d')) variants.push(normalized.slice(0, -1));
        if (normalized.endsWith('ed')) {
            const base = normalized.slice(0, -2);
            variants.push(base, `${base}e`);
            if (base.length >= 2 && base.slice(-1) === base.slice(-2, -1)) {
                variants.push(base.slice(0, -1));
            }
        }
        if (normalized.endsWith('ing')) {
            const base = normalized.slice(0, -3);
            variants.push(base, `${base}e`);
            if (base.length >= 2 && base.slice(-1) === base.slice(-2, -1)) {
                variants.push(base.slice(0, -1));
            }
        }
        const seen = new Set();
        for (const item of variants) {
            const candidate = String(item || '').toLowerCase().replace(/[^a-z]/g, '');
            if (!candidate || seen.has(candidate)) continue;
            seen.add(candidate);
            if (entries[candidate]) return candidate;
        }
        return normalized;
    } catch (e) {
        return cleanWord;
    }
}

function buildWordFrequencyStatsCache() {
    try {
        const entries = (g_dictAll && g_dictAll.entries) ? g_dictAll.entries : {};
        const stats = Object.create(null);
        const isKeyEntry = (entry) => {
            try {
                if (!entry || typeof entry !== 'object') return false;
                if (EXAM_TYPE === 'kaoyan') return entry.is_kaoyan_key === true;
                if (EXAM_TYPE === 'cet6') return entry.is_cet6_key === true;
                return entry.is_cet4_key === true;
            } catch (e) {
                return false;
            }
        };
        Object.keys(entries).forEach(lemma => {
            const cleanLemma = String(lemma || '').trim().toLowerCase();
            if (!cleanLemma) return;
            const entry = entries[cleanLemma];
            const taskIds = entry && Array.isArray(entry.task_ids) ? entry.task_ids : [];
            const sentenceIds = entry && Array.isArray(entry.sentence_ids) ? entry.sentence_ids : [];
            stats[cleanLemma] = {
                taskCount: taskIds.length,
                sentenceCount: sentenceIds.length,
                isKey: isKeyEntry(entry),
            };
        });
        g_wordFrequencyStats = stats;
    } catch (e) {
        g_wordFrequencyStats = null;
    }
}

function getWordFrequencyStats(word) {
    try {
        const lemma = resolveLemmaLite(word);
        if (!lemma) return { lemma: '', taskCount: 0, sentenceCount: 0, isKey: false };
        const isKeyEntry = (entry) => {
            try {
                if (!entry || typeof entry !== 'object') return false;
                if (EXAM_TYPE === 'kaoyan') return entry.is_kaoyan_key === true;
                if (EXAM_TYPE === 'cet6') return entry.is_cet6_key === true;
                return entry.is_cet4_key === true;
            } catch (e) {
                return false;
            }
        };
        const stats = (g_wordFrequencyStats && g_wordFrequencyStats[lemma]) ? g_wordFrequencyStats[lemma] : null;
        if (stats) {
            return {
                lemma,
                taskCount: Number.isFinite(stats.taskCount) ? stats.taskCount : 0,
                sentenceCount: Number.isFinite(stats.sentenceCount) ? stats.sentenceCount : 0,
                isKey: stats.isKey === true,
            };
        }
        const entry = g_dictAll && g_dictAll.entries ? g_dictAll.entries[lemma] : null;
        if (!entry || typeof entry !== 'object') {
            return { lemma, taskCount: 0, sentenceCount: 0, isKey: false };
        }
        const out = {
            lemma,
            taskCount: Array.isArray(entry.task_ids) ? entry.task_ids.length : 0,
            sentenceCount: Array.isArray(entry.sentence_ids) ? entry.sentence_ids.length : 0,
            isKey: isKeyEntry(entry),
        };
        if (!g_wordFrequencyStats) g_wordFrequencyStats = Object.create(null);
        g_wordFrequencyStats[lemma] = out;
        return out;
    } catch (e) {
        return { lemma: '', taskCount: 0, sentenceCount: 0, isKey: false };
    }
}

window.playWordAudio = window.playWordAudio || function(word) {
    try {
        const w = String(word || '').trim();
        if (!w) return;
        const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(w)}&type=2`;
        const audio = new Audio(audioUrl);
        audio.play().catch(() => {
            const u = new SpeechSynthesisUtterance(w);
            u.lang = 'en-US';
            window.speechSynthesis.speak(u);
        });
    } catch (e) {}
};

function shouldPlayWordKnownExplosionAudio() {
    try {
        const wordBtn = document.getElementById('globalWordProgressViewBtn');
        if (wordBtn && !window.__showTaskWordKnownOverlays) {
            return false;
        }
        const paperToggleBtn = document.getElementById('paperListToggleBtn');
        if (paperToggleBtn && paperToggleBtn.dataset && paperToggleBtn.dataset.collapsed === '1') {
            return false;
        }
    } catch (e) {}
    return true;
}

window.playExplosionAudio = window.playExplosionAudio || function() {
    try {
        if (!shouldPlayWordKnownExplosionAudio()) return;
        const audioUrl = `${STATIC_BASE}/audios/other_audios/explosion.m4a`;
        if (!window.__explosionAudio || window.__explosionAudio.src !== audioUrl) {
            window.__explosionAudio = new Audio(audioUrl);
            window.__explosionAudio.preload = 'auto';
        }
        window.__explosionAudio.currentTime = 0;
        const maybePromise = window.__explosionAudio.play();
        if (maybePromise && typeof maybePromise.catch === 'function') {
            maybePromise.catch(() => {});
        }
    } catch (e) {}
};

function getWordModeCorpusSummaryLite() {
    const out = { examCount: 0, articleCount: 0, wordCount: 0 };
    try {
        if (!g_dictAll || !g_dictAll.entries) return out;
        const entries = g_dictAll.entries || {};
        const isKeyEntry = (entry) => {
            try {
                if (!entry || typeof entry !== 'object') return false;
                if (EXAM_TYPE === 'kaoyan') return entry.is_kaoyan_key === true;
                if (EXAM_TYPE === 'cet6') return entry.is_cet6_key === true;
                return entry.is_cet4_key === true;
            } catch (e) {
                return false;
            }
        };
        const taskSet = new Set();
        const examSet = new Set();
        Object.keys(entries).forEach(k => {
            const entry = entries[k];
            if (!entry || typeof entry !== 'object') return;
            if (!isKeyEntry(entry)) return;
            const tIds = Array.isArray(entry.task_ids) ? entry.task_ids : [];
            if (!tIds.length) return;
            out.wordCount += 1;
            tIds.forEach(tid => {
                if (tid == null) return;
                const s = String(tid);
                if (!s) return;
                taskSet.add(s);
                if (EXAM_TYPE === 'kaoyan' && s.length >= 6) {
                    const year = s.slice(0, 4);
                    const paper = s.slice(4, 6);
                    if (/^\d{4}$/.test(year) && /^\d{2}$/.test(paper)) {
                        const p = parseInt(paper, 10);
                        examSet.add(`${year}(${Number.isFinite(p) ? p : paper})`);
                    }
                }
            });
        });
        out.articleCount = taskSet.size;
        out.examCount = examSet.size;
        try {
            const cols = document.querySelectorAll('.col-md-t.mb-3.paper-column, .paper-column');
            const nCols = cols ? cols.length : 0;
            if (nCols > 0) out.examCount = nCols;
        } catch (e) {}
        try {
            const cards = Array.from(document.querySelectorAll('.paper-column .question-item'));
            const uniq = new Set();
            cards.forEach(c => {
                try {
                    if (c.getAttribute('data-is-borrowed') === 'true') return;
                    const tid = c.getAttribute('data-task-id') || '';
                    if (tid) uniq.add(String(tid));
                } catch (e) {}
            });
            if (uniq.size > 0) out.articleCount = uniq.size;
        } catch (e) {}
    } catch (e) {}
    return out;
}

function renderWordModeEmptyPanel() {
    const container = document.getElementById('wordStatsContainer');
    if (!container) return;
    container.style.display = 'block';
    const summary = getWordModeCorpusSummaryLite();
    const examCount = summary.examCount || 0;
    const articleCount = summary.articleCount || 0;
    const wordCount = summary.wordCount || 0;
    container.innerHTML = `
        <div class="word-mode-panel">
            <div class="word-mode-summary" style="display:flex; flex-wrap: wrap; align-items: center; gap: 8px;">
                <span style="font-size:18px; font-weight:700; color:#111;">共${escapeHtmlLite(examCount)}套卷，${escapeHtmlLite(articleCount)}篇文章，${escapeHtmlLite(wordCount)}个大纲重点单词（去掉高考词汇）</span>
            </div>
            <div id="wordModeExamples" style="margin-top:10px; color:#666; line-height:1.8;">
                <div>1.点击左栏单词可查看其出现的篇章和例句</div>
                <div>2.点击以上各列可进入整套试卷</div>
                <div>3.单击查单词，长按查整句</div>
            </div>
        </div>
    `;
}

let g_wordModeDetailSeq = 0;
function renderWordModeDetailPanel(word) {
    const container = document.getElementById('wordStatsContainer');
    if (!container) return;
    container.style.display = 'block';
    const cleanWord = String(word || '').toLowerCase().replace(/[^a-z]/g, '');
    if (!cleanWord) {
        container.innerHTML = '';
        return;
    }
    if (!g_dictAll || !g_dictAll.entries) {
        container.innerHTML = '<div style="padding:10px; color:#666;">词典加载中...</div>';
        return;
    }

    const lemma = resolveLemmaLite(cleanWord);
    const entry = g_dictAll.entries[lemma] || null;
    const phonetic = entry && entry.phonetic ? String(entry.phonetic) : '';
    let appearText = '';
    try {
        const freq = getWordFrequencyStats(lemma);
        const taskCount = freq.taskCount || 0;
        const sentCount = freq.sentenceCount || 0;
        if (taskCount > 0 || sentCount > 0) appearText = `${taskCount}篇/${sentCount}次 `;
    } catch (e) {}
    const appearTextInline = String(appearText || '').trim();
    const sentenceIds = entry && Array.isArray(entry.sentence_ids) ? entry.sentence_ids : [];
    let defs = entry ? entry.definition_cn : null;
    if (typeof defs === 'string') defs = defs.split('\n');
    if (!Array.isArray(defs)) defs = [];
    const merged = [];
    let lastPos = null;
    defs.forEach(d => {
        d = String(d || '').trim();
        if (!d) return;
        const m = d.match(/^([a-z]+\.)\s+(.*)/);
        if (m) {
            const currentPos = m[1];
            const content = m[2];
            if (lastPos === currentPos && merged.length > 0) {
                merged[merged.length - 1] += `；${content}`;
            } else {
                merged.push(d);
                lastPos = currentPos;
            }
        } else {
            merged.push(d);
            lastPos = null;
        }
    });

    const sentenceGlosses = [];
    const seenSentenceGlosses = new Set();
    sentenceIds.forEach(item => {
        const gloss = Array.isArray(item) ? String(item[2] || '').trim() : '';
        if (!gloss || seenSentenceGlosses.has(gloss)) return;
        seenSentenceGlosses.add(gloss);
        sentenceGlosses.push(gloss);
    });

    const defsInline = sentenceGlosses.length
        ? sentenceGlosses.join('；')
        : (merged.length ? merged.join('；') : '暂无释义');

    const seq = ++g_wordModeDetailSeq;
    container.innerHTML = `
        <div class="word-mode-panel">
            <div class="word-mode-summary" style="display:flex; flex-wrap: wrap; align-items: center; gap: 8px;">
                <span style="font-size:48px; font-weight:700; color:#111;">${escapeHtmlLite(lemma)}</span>
                <span style="color:#444; font-size:33px;">${phonetic ? `/${escapeHtmlLite(phonetic)}/` : ''}</span>
                <button class="wp-audio-btn" type="button" onclick="playWordAudio('${escapeHtmlLite(lemma)}')" aria-label="播放读音" title="播放读音">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 10v4h4l5 4V6L8 10H4z"></path>
                        <path d="M16 8a4 4 0 010 8"></path>
                        <path d="M18.5 5.5a7.5 7.5 0 010 13"></path>
                    </svg>
                </button>
                <span style="color:#111; font-size:33px; font-weight:500;">${escapeHtmlLite(defsInline)}</span>
                ${appearTextInline ? `<span style="color:#888; font-size:22px; font-weight:400; margin-left:6px;">${escapeHtmlLite(appearTextInline)}</span>` : ''}

            </div>
             <div id="wordModeExamples" style="margin-top:6px; color:#666;">加载中...</div>
        </div>
    `;

    const ids = sentenceIds;
    const pickedRefs = pickEvenlyLite(ids, 5);
    const exampleRefs = pickedRefs.map(item => {
        if (Array.isArray(item)) {
            const sid = parseInt(item[0], 10);
            return {
                sid,
                surface: String(item[1] || '').trim(),
                gloss: String(item[2] || '').trim(),
                source: String(item[3] || '').trim().toLowerCase(),
            };
        }
        const sid = parseInt(item, 10);
        return {
            sid,
            surface: '',
            gloss: '',
            source: '',
        };
    }).filter(item => Number.isFinite(item.sid));
    const sidList = Array.from(new Set(exampleRefs.map(item => item.sid)));
    const examplesEl = container.querySelector('#wordModeExamples');
    if (!examplesEl) return;
    if (!exampleRefs.length) {
        examplesEl.textContent = '暂无例句';
        return;
    }
    const formsMap = entry && typeof entry === 'object' ? (entry.sentence_forms || {}) : {};
    const unknownSetForHl = window.userVocabSet || new Set();
    const knownSetForHl = window.userKnownSet || new Set();
    const focusLemmaSetForHl = (() => {
        try {
            const src = Array.isArray(window.currentWordStatsWords) ? window.currentWordStatsWords : [];
            const out = new Set();
            src.forEach(w => {
                const ww = String(w || '').trim().toLowerCase().replace(/[^a-z]/g, '');
                if (!ww) return;
                out.add(resolveLemmaLite(ww));
            });
            return out;
        } catch (e) {
            return new Set();
        }
    })();
    const currentLemmaForHl = lemma;
    const containsSurfaceInSentence = (sentenceText, surface) => {
        const cleanSurface = String(surface || '').trim();
        if (!cleanSurface) return false;
        const pattern = new RegExp(`(?<![A-Za-z])${cleanSurface.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z])`, 'i');
        return pattern.test(String(sentenceText || ''));
    };
    const decorateSentenceEn = (enText, preferredForm) => {
        const s = String(enText || '');
        if (!s) return '';
        const formClean = String(preferredForm || '').toLowerCase().replace(/[^a-z]/g, '');
        let out = '';
        let last = 0;
        const re = /[A-Za-z]+/g;
        let m;
        while ((m = re.exec(s)) !== null) {
            const start = m.index;
            const end = start + m[0].length;
            if (start > last) out += escapeHtmlLite(s.slice(last, start));
            const raw = m[0];
            const clean = raw.toLowerCase().replace(/[^a-z]/g, '');
            const lemma2 = clean ? resolveLemmaLite(clean) : '';
            if (clean && (lemma2 === currentLemmaForHl || (formClean && clean === formClean))) {
                out += `<span class="wm-token word-mode-hl" data-lookup-word="${escapeHtmlLite(lemma2 || clean || raw)}">${escapeHtmlLite(raw)}</span>`;
            } else {
                const inFocus = focusLemmaSetForHl.size ? focusLemmaSetForHl.has(lemma2) : false;
                if (clean && inFocus && (unknownSetForHl.has(lemma2) || unknownSetForHl.has(clean))) {
                    out += `<span class="wm-token word-mode-unk" data-lookup-word="${escapeHtmlLite(lemma2 || clean || raw)}">${escapeHtmlLite(raw)}</span>`;
                } else if (clean && inFocus && (knownSetForHl.has(lemma2) || knownSetForHl.has(clean))) {
                    out += `<span class="wm-token word-mode-kn" data-lookup-word="${escapeHtmlLite(lemma2 || clean || raw)}">${escapeHtmlLite(raw)}</span>`;
                } else if (clean && inFocus) {
                    out += `<span class="wm-token word-mode-uncl" data-lookup-word="${escapeHtmlLite(lemma2 || clean || raw)}">${escapeHtmlLite(raw)}</span>`;
                } else {
                    out += `<span class="wm-token" data-lookup-word="${escapeHtmlLite(lemma2 || clean || raw)}">${escapeHtmlLite(raw)}</span>`;
                }
            }
            last = end;
        }
        if (last < s.length) out += escapeHtmlLite(s.slice(last));
        return out;
    };
    fetch(`${API_BASE}/sentences_by_ids?ids=${encodeURIComponent(sidList.join(','))}`)
        .then(r => r.json())
        .then(j => {
            if (seq !== g_wordModeDetailSeq) return;
            const rows = j && j.success ? (j.sentences || []) : [];
            if (!rows || rows.length === 0) {
                examplesEl.textContent = '暂无例句';
                return;
            }
            let baseFontPx = 17;
            try {
                baseFontPx = getWordModeBaseFontPx();
            } catch (e) {}
            let metaFontPx = 12;
            try {
                metaFontPx = getWordModeExampleMetaFontPx();
            } catch (e) {}
            const wordRe = /[A-Za-z]+(?:['-][A-Za-z]+)*/g;
            const rowBySid = new Map();
            rows.forEach(s => {
                const sid = parseInt(s && s.id, 10);
                if (Number.isFinite(sid) && !rowBySid.has(sid)) rowBySid.set(sid, s);
            });
            const html = exampleRefs.map(ref => {
                const s = rowBySid.get(ref.sid);
                if (!s) return '';
                const sid = String(ref.sid || '');
                const taskKey = stripKaoyanPaperSuffix(String(s.task_key || '').trim());
                const en = String(s.en_text || '').trim();
                const isOptionWord = ref.source === 'option' || (ref.surface && !containsSurfaceInSentence(en, ref.surface));
                const sourceLabel = getWordModeSourceLabel(s.order_seq, isOptionWord);
                if (isOptionWord) {
                    const optionWord = String(ref.surface || lemma || '').trim();
                    if (!optionWord) return '';
                    const metaParts = [];
                    if (taskKey) metaParts.push(taskKey);
                    if (sourceLabel) metaParts.push(sourceLabel);
                    const optionMeta = `${String(ref.gloss || '').trim() || '暂无释义'}${metaParts.length ? `（${metaParts.join(' ')}）` : ''}`;
                    return `<div style="padding:6px 0; border-top:1px solid rgba(0,0,0,.06);"><div class="word-mode-example-en" style="line-height:1.6; color:#111; font-size:${baseFontPx}px;"><span class="wm-token word-mode-hl" data-lookup-word="${escapeHtmlLite(lemma || optionWord)}">${escapeHtmlLite(optionWord)}</span></div><div class="word-mode-example-cn" style="margin-top:2px; color:rgb(0 159 124); font-size:${metaFontPx}px;">${escapeHtmlLite(optionMeta)}</div></div>`;
                }
                const metaParts = [];
                if (taskKey) metaParts.push(taskKey);
                if (sourceLabel) metaParts.push(sourceLabel);
                const tail = metaParts.length ? `（${metaParts.join(' ')}）` : '';
                const wc = (en.match(wordRe) || []).length;
                if (wc <= 1) return '';
                let cn = String(s.cn_text || '').trim();
                cn = cn.replace(/^(男|女)：\s*/, '');
                const form = (formsMap && typeof formsMap === 'object' && formsMap[sid]) ? String(formsMap[sid] || '') : (ref.surface || lemma);
                const enHtml = decorateSentenceEn(en, form);
                const cnHtml = cn ? `<div class="word-mode-example-cn" style="margin-top:2px; color:rgb(0 159 124); font-size:${metaFontPx}px;">${escapeHtmlLite(cn)}${escapeHtmlLite(tail)}</div>` : (tail ? `<div class="word-mode-example-cn" style="margin-top:2px; color:rgb(159 83 0); font-size:${metaFontPx}px;">${escapeHtmlLite(tail)}</div>` : '');
                return `<div style="padding:6px 0; border-top:1px solid rgba(0,0,0,.06);"><div class="word-mode-example-en" style="line-height:1.6; color:#111; font-size:${baseFontPx}px;">${enHtml}</div>${cnHtml}</div>`;
            }).filter(Boolean).join('');
            if (!html) {
                examplesEl.textContent = '暂无例句';
                return;
            }
            examplesEl.innerHTML = `<div style="border:1px solid rgba(0,0,0,.06); border-radius:8px; overflow:hidden; background:#fff;">${html}</div>`;
            try {
                applyWordModeBaseFontSize();
            } catch (e) {}
            try {
                if (container.dataset && container.dataset.wordModeLookupBound !== '1') {
                    container.addEventListener('click', (e) => {
                        const t = e && e.target;
                        const token = t && t.closest ? t.closest('.wm-token[data-lookup-word]') : null;
                        if (!token || !container.contains(token)) return;
                        const w = token.getAttribute('data-lookup-word') || '';
                        if (!w) return;
                        if (typeof window.lookupWord !== 'function') return;
                        try {
                            e.preventDefault();
                            e.stopPropagation();
                        } catch (err) {}
                        let x = 0;
                        let y = 0;
                        try {
                            if (e && typeof e.clientX === 'number' && typeof e.clientY === 'number') {
                                x = e.clientX;
                                y = e.clientY;
                            } else if (token && token.getBoundingClientRect) {
                                const r = token.getBoundingClientRect();
                                x = r.left + r.width / 2;
                                y = r.bottom;
                            }
                        } catch (err) {}
                        window.lookupWord(w, x, y);
                    }, true);
                    container.dataset.wordModeLookupBound = '1';
                }
            } catch (e) {}
        })
        .catch(() => {
            if (seq !== g_wordModeDetailSeq) return;
            examplesEl.textContent = '暂无例句';
        });
}

function setWordModeSelectedWord(word, opts) {
    const w = String(word || '').trim();
    if (!w) return;
    const clean = String(w || '').toLowerCase().replace(/[^a-z]/g, '');
    window.currentWordModeWord = w;
    try {
        const listEl = document.getElementById('wordModeWordList');
        if (listEl) {
            const rows = Array.from(listEl.querySelectorAll('.word-mode-row'));
            rows.forEach(r => {
                const rw = (r.dataset.word || '').trim();
                r.classList.toggle('active', rw === w);
            });
            syncWordModeRowInlineControls();
        }
    } catch (e) {}
    try {
        if (clean && clean !== currentActiveWord && typeof window.highlightWordTasks === 'function') window.highlightWordTasks(w);
    } catch (e) {}
    renderWordModeDetailPanel(w);
    try {
        const scrollThumbs = !(opts && opts.scrollThumbs === false);
        if (!scrollThumbs) return;
    } catch (e) {}
}

function clearWordModeSelectedWord() {
    try {
        window.currentWordModeWord = '';
    } catch (e) {}
    try {
        const listEl = document.getElementById('wordModeWordList');
        if (listEl) {
            const rows = Array.from(listEl.querySelectorAll('.word-mode-row.active'));
            rows.forEach(r => r.classList.remove('active'));
            syncWordModeRowInlineControls();
        }
    } catch (e) {}
    try {
        if (typeof clearWordHighlight === 'function') clearWordHighlight();
    } catch (e) {}
    try {
        const keepWordKnownOverlay = !!window.__showTaskWordKnownOverlays || !!document.querySelector('.word-known-overlay');
        if (keepWordKnownOverlay && typeof applyTaskWordKnownOverlays === 'function') {
            applyTaskWordKnownOverlays();
        }
    } catch (e) {}
    try {
        renderWordModeEmptyPanel();
    } catch (e) {}
}

function setSidebarMode(mode) {
    const m = (mode === 'word') ? 'word' : 'category';
    let prev = 'category';
    try {
        prev = localStorage.getItem('cet_sidebar_mode') || 'category';
    } catch (e) {}
    try {
        localStorage.setItem('cet_sidebar_mode', m);
    } catch (e) {}
    const tree = document.getElementById('knowledgeTreeContent');
    const wordList = document.getElementById('wordModeList');
    if (tree) tree.style.display = (m === 'word') ? 'none' : '';
    if (wordList) wordList.style.display = (m === 'word') ? '' : 'none';
    applySidebarModeSwitchUi(m);
    if (m === 'word') {
        try {
            if (typeof clearKnowledgeHighlight === 'function') clearKnowledgeHighlight();
        } catch (e) {}
        try {
            if (prev !== 'word' && typeof clearWordModeSelectedWord === 'function') clearWordModeSelectedWord();
        } catch (e) {}
        try {
            const listEl = document.getElementById('wordModeWordList');
            if (listEl) listEl.innerHTML = '';
        } catch (e) {}
        try {
            if (typeof renderWordStats === 'function' && g_allTasks && g_allTasks.length) {
                renderWordStats(g_allTasks);
            }
        } catch (e) {}
        return;
    }
    try {
        if (typeof clearWordHighlight === 'function') clearWordHighlight();
    } catch (e) {}
    try {
        if (typeof renderWordStats === 'function') renderWordStats(g_allTasks);
    } catch (e) {}
}

function initSidebarModeSwitch() {
    const wrap = document.getElementById('sidebarModeSwitch');
    if (!wrap) return;
    try {
        const host = wrap.parentElement;
        if (host) host.style.display = 'none';
        else wrap.style.display = 'none';
    } catch (e) {}
    const initial = 'word';
    setSidebarMode(initial);
    setTimeout(() => applySidebarModeSwitchUi(initial), 0);
    return;
    if (wrap.dataset && wrap.dataset.bound === '1') return;
    wrap.addEventListener('click', (e) => {
        const t = e && e.target;
        const chip = t && t.closest ? t.closest('[data-sidebar-mode]') : null;
        if (!chip || !wrap.contains(chip)) return;
        const m = chip.getAttribute('data-sidebar-mode') || 'category';
        setSidebarMode(m);
        e.preventDefault();
        e.stopPropagation();
    }, true);
    wrap.dataset.bound = '1';

    const initial2 = 'category';
    setSidebarMode(initial2);
    setTimeout(() => applySidebarModeSwitchUi(initial2), 0);
}

function initPaperListCollapseToggle() {
    const btn = document.getElementById('paperListToggleBtn');
    const inner = document.getElementById('paperListInner');
    if (!btn || !inner) return;
    if (btn.dataset && btn.dataset.bound === '1') return;
    const textEl = document.getElementById('paperListToggleText');
    const icon = btn.querySelector('svg');

    const apply = (collapsed) => {
        const c = !!collapsed;
        inner.style.display = c ? 'none' : '';
        if (textEl) textEl.textContent = c ? '展开\n试卷' : '收起\n试卷';
        if (icon) icon.style.transform = c ? 'rotate(180deg)' : 'rotate(0deg)';
        btn.dataset.collapsed = c ? '1' : '0';
    };

    btn.addEventListener('click', (e) => {
        try {
            e.preventDefault();
            e.stopPropagation();
        } catch (err) {}
        const cur = btn.dataset && btn.dataset.collapsed === '1';
        apply(!cur);
    }, true);
    btn.dataset.bound = '1';
    apply(false);
}

async function ensurePaperListExpandedForWordKnownOverlays() {
    try {
        const btn = document.getElementById('paperListToggleBtn');
        const inner = document.getElementById('paperListInner');
        if (!btn || !inner) return false;
        const textEl = document.getElementById('paperListToggleText');
        const icon = btn.querySelector('svg');
        const computed = window.getComputedStyle ? getComputedStyle(inner) : null;
        const collapsed = (btn.dataset && btn.dataset.collapsed === '1')
            || inner.style.display === 'none'
            || !!(computed && computed.display === 'none');
        if (!collapsed) {
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            return false;
        }
        inner.style.display = '';
        if (textEl) textEl.textContent = '收起\n试卷';
        if (icon) icon.style.transform = 'rotate(0deg)';
        btn.dataset.collapsed = '0';
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return true;
    } catch (e) {}
    return false;
}

window.applyWordStatusFilter = function(status) {
    const container = document.getElementById('wordStatsContainer');
    if (!container) return;
    applyWordStatusFilterInContainer(container, status);
};

window.updateWordStatusFilterCounts = function() {
    const container = document.getElementById('wordStatsContainer');
    if (!container) return;
    updateWordStatusFilterCountsInternal(container);
};

async function fetchTaskIndex() {
    try {
        const r = await fetch(`${API_BASE}/task_index?exam_type=${EXAM_TYPE}`);
        const j = await r.json();
        return j.tasks || [];
    } catch (e) {
        console.error(`Error fetching task index:`, e);
        return [];
    }
}

function buildTaskIndexMap(tasks) {
    g_kidToTasks = {};
    let count = 0;
    for (const task of tasks) {
        if (task.kid) {
            const kid = parseInt(task.kid, 10);
            if (!g_kidToTasks[kid]) {
                g_kidToTasks[kid] = [];
            }
            g_kidToTasks[kid].push(task);
            count++;
        }
    }
    console.log(`Built task index: ${count} tasks mapped to ${Object.keys(g_kidToTasks).length} kids.`);
}

function processNodeCounts(node) {
    let subtreeTasks = (g_kidToTasks[node.id] || []).slice();
    if (node.children) {
        for (const child of node.children) {
            subtreeTasks = subtreeTasks.concat(processNodeCounts(child));
        }
    }

    const unique = [];
    const seen = new Set();
    for (const t of subtreeTasks) {
        if (!seen.has(t.id)) {
            seen.add(t.id);
            unique.push(t);
        }
    }
    node.cachedTasks = unique;

    const wordSet = new Set();
    for (const t of unique) {
        if (t.key_words) {
            let words = [];
            try {
                if (typeof t.key_words === 'string' && (t.key_words.startsWith('[') || t.key_words.startsWith('{'))) {
                    const parsed = JSON.parse(t.key_words);
                    if (Array.isArray(parsed)) words = parsed;
                    else if (typeof parsed === 'object') words = Object.keys(parsed);
                } else {
                    words = String(t.key_words).split(/[,\s]+/).map(s => s.trim()).filter(s => s);
                }
            } catch (e) {
                words = String(t.key_words).split(/[,\s]+/).map(s => s.trim()).filter(s => s);
            }
            words.forEach(w => {
                const ww = String(w || '').trim().toLowerCase();
                if (ww) wordSet.add(ww);
            });
        }
    }
    node.cachedWordCount = wordSet.size;
    node.cachedWords = Array.from(wordSet);

    // console.log(`Node ${node.id} (${node.name}): ${unique.length} tasks`);
    return unique;
}

async function fetchKnowledgePoints() {
    try {
        const r = await fetch(`${API_BASE}/knowledge_points`);
        const j = await r.json();
        return j.points || [];
    } catch (e) {
        console.error("Failed to fetch knowledge points:", e);
        return [];
    }
}
function randomWordCount() {
    return 50 + Math.floor(Math.random() * 151);
}

function updateActiveCount() {
    const container = document.getElementById('keywordContainer');
    const activeDisplay = document.getElementById('activeWordCountDisplay');
    if (container && activeDisplay) {
        const activeCount = container.querySelectorAll('.keyword-item.active').length;
        activeDisplay.textContent = activeCount;
    }
}

function updateKeywordContainer(keywordsStr) {
    const container = document.getElementById('keywordContainer');
    const countDisplay = document.getElementById('wordCountDisplay');
    const activeDisplay = document.getElementById('activeWordCountDisplay');

    if (!container) return;

    container.innerHTML = '';

    if (!keywordsStr || !keywordsStr.trim()) {
        container.innerHTML = '<div style="color: #666; font-style: italic;">暂无关联单词</div>';
        if (countDisplay) countDisplay.textContent = '0';
        if (activeDisplay) activeDisplay.textContent = '0';
        return;
    }

    const words = keywordsStr.trim().split(/\s+/);
    if (countDisplay) countDisplay.textContent = words.length;
    if (activeDisplay) activeDisplay.textContent = '0';

    words.forEach(word => {
        if (word) {
            const span = document.createElement('span');
            span.className = 'keyword-item';
            span.textContent = word;
            span.onclick = function () {
                this.classList.toggle('active');
                updateActiveCount();
            };
            container.appendChild(span);
        }
    });
}

function getNodeLevelById(targetId, nodes = g_knowledgePoints, level = 1) {
    if (!nodes) return null;
    for (const n of nodes) {
        if (n.id === targetId) return level;
        if (n.children && n.children.length) {
            const found = getNodeLevelById(targetId, n.children, level + 1);
            if (found) return found;
        }
    }
    return null;
}

function handleKnowledgeClick(kid, name) {
    console.log('Clicked:', kid);

    const node = findNodeById(g_knowledgePoints, kid);
    const effectiveName = name || (node && node.name) || '';
    const level = getNodeLevelById(kid) || 1;

    if (currentActiveKid === kid) {
        clearKnowledgeHighlight();
        if (g_allTasks && g_allTasks.length) {
            renderWordStats(g_allTasks);
        }
        return;
    }

    currentActiveKid = kid;
    highlightQuestions(kid, node);

    if (node && node.cachedTasks) {
        renderWordStats(node.cachedTasks, effectiveName);
    } else {
        renderWordStats([], effectiveName);
    }
}

function ensureKnowledgeActive(kid, name) {
    const node = findNodeById(g_knowledgePoints, kid);
    const effectiveName = name || (node && node.name) || '';
    currentActiveKid = kid;
    highlightQuestions(kid, node);
    if (node && node.cachedTasks) {
        renderWordStats(node.cachedTasks, effectiveName);
    } else {
        renderWordStats([], effectiveName);
    }
}

function openKnowledgeTasksWithAnimation(kid, name) {
    let elements = Array.from(document.querySelectorAll('.question-item.highlighted'));
    if (!elements.length && kid != null) {
        elements = Array.from(document.querySelectorAll(`.question-item[data-knowledge-id="${kid}"]`));
    }
    if (!elements.length) {
        requestAnimationFrame(() => {
            let retry = Array.from(document.querySelectorAll('.question-item.highlighted'));
            if (!retry.length && kid != null) {
                retry = Array.from(document.querySelectorAll(`.question-item[data-knowledge-id="${kid}"]`));
            }
            if (retry.length > 0) {
                performGatheringAnimation(retry, () => openKnowledgeTasksInModal(kid, name));
            } else {
                openKnowledgeTasksInModal(kid, name);
            }
        });
        return;
    }
    performGatheringAnimation(elements, () => openKnowledgeTasksInModal(kid, name));
}

function performGatheringAnimation(originalElements, callback) {
    const $animationContainer = $('<div class="animation-container"></div>');
    $('body').append($animationContainer);

    const centerX = window.innerWidth / 2;
    const stackTopY = window.innerHeight * 0.3;

    const ua = String(navigator.userAgent || '');
    const isPad = /iPad/i.test(ua) || (String(navigator.platform || '') === 'MacIntel' && Number(navigator.maxTouchPoints || 0) > 1);
    const maxElements = isPad ? 12 : 20;
    const elementsToAnimate = originalElements.slice(0, maxElements);
    const stackGap = 8;
    const stackStartY = stackTopY;

    elementsToAnimate.forEach((originalElement, index) => {
        const rect = originalElement.getBoundingClientRect();
        const $animationElement = $(originalElement.cloneNode(true));

        $animationElement.removeAttr('id');
        $animationElement.find('*').removeAttr('id');

        $animationElement.css({
            position: 'fixed',
            left: rect.left + 'px',
            top: rect.top + 'px',
            width: rect.width + 'px',
            height: rect.height + 'px',
            zIndex: '10000',
            transition: 'transform 0.85s ease-out, opacity 0.85s ease-out',
            transformOrigin: 'center',
            opacity: '1',
            willChange: 'transform, opacity',
            transform: 'translate3d(0,0,0) scale(1)'
        });

        $animationContainer.append($animationElement);
        $(originalElement).css('opacity', '0.3');

        const stackOffset = index * stackGap;

        const targetLeft = (centerX - rect.width / 2);
        const targetTop = (stackStartY - rect.height / 2 + stackOffset);
        const dx = targetLeft - rect.left;
        const dy = targetTop - rect.top;
        requestAnimationFrame(() => {
            $animationElement.css({
                transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.5)`,
                opacity: '0.95'
            });
        });
    });

    setTimeout(() => {
        $animationContainer.remove();
        originalElements.forEach(el => {
            $(el).css('opacity', '');
        });
        if (callback) callback();
    }, 900);
}

function performPaperGatheringAnimation(elements, callback) {
    if (!elements || elements.length === 0) {
        if (callback) callback();
        return;
    }

    let minLeft = Infinity;
    let minTop = Infinity;
    let maxRight = -Infinity;
    let maxBottom = -Infinity;

    elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.left < minLeft) minLeft = rect.left;
        if (rect.top < minTop) minTop = rect.top;
        if (rect.right > maxRight) maxRight = rect.right;
        if (rect.bottom > maxBottom) maxBottom = rect.bottom;
    });

    const width = maxRight - minLeft;
    const height = maxBottom - minTop;

    const container = document.createElement('div');
    container.className = 'paper-animation-container';

    const block = document.createElement('div');
    block.style.position = 'fixed';
    block.style.left = `${minLeft}px`;
    block.style.top = `${minTop}px`;
    block.style.width = `${width}px`;
    block.style.height = `${height}px`;
    block.style.background = 'rgba(33, 150, 243, 0.25)';
    block.style.border = '2px solid #2196f3';
    block.style.borderRadius = '8px';
    block.style.boxSizing = 'border-box';
    block.style.transition = 'transform 0.8s ease-out, opacity 0.8s ease-out';
    block.style.transformOrigin = 'center';
    block.style.opacity = '1';
    block.style.zIndex = '10000';

    container.appendChild(block);
    document.body.appendChild(container);

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const currentCenterX = minLeft + width / 2;
    const currentCenterY = minTop + height / 2;
    const translateX = centerX - currentCenterX;
    const translateY = centerY - currentCenterY;
    requestAnimationFrame(() => {
        block.style.transform = `translate(${translateX}px, ${translateY}px)`;
        block.style.opacity = '0.6';
    });

    setTimeout(() => {
        if (container.parentNode) container.parentNode.removeChild(container);
        if (callback) callback();
    }, 850);
}

// Unified function to open task modal
function openTaskModal(params) {
    const { kid, name, questionId, hidePracticeBtn = true } = params;
    const modal = document.getElementById('task-modal');
    const list = document.getElementById('modal-task-list');
    const filterContainer = document.getElementById('knowledgeFilterContainer');

    // Handle practice button visibility
    const practiceBtn = document.getElementById('practiceModeBtn');
    const gradeBtn = document.getElementById('gradePaperBtn');
    if (practiceBtn) {
        practiceBtn.style.display = hidePracticeBtn ? 'none' : 'block';
    }
    // Always hide grade button in knowledge/single mode
    if (gradeBtn) {
        gradeBtn.style.display = 'none';
    }

    delete modal.dataset.examInfo;
    delete modal.dataset.currentMode;
    setModalTitleScore(null);

    if (kid) {
        modal.dataset.kid = kid;
    } else {
        delete modal.dataset.kid;
    }
    if (questionId) {
        modal.dataset.questionId = questionId;
    } else {
        delete modal.dataset.questionId;
    }

    const isKnowledgeMode = !!kid;
    modal.dataset.knowledgeMode = isKnowledgeMode ? '1' : '';
    if (filterContainer) {
        if (!isKnowledgeMode) {
            filterContainer.style.display = 'none';
        } else {
            filterContainer.style.display = 'none';
            const partSelect = document.getElementById('knowledgeFilterPart');
            const subSelect = document.getElementById('knowledgeFilterSub');
            if (partSelect) {
                partSelect.value = '';
                partSelect.style.display = '';
            }
            if (subSelect) {
                subSelect.value = '';
                subSelect.disabled = true;
                subSelect.style.display = '';
            }
            initKnowledgeFilters();
        }
    }

    // Set title
    if (questionId) {
        setModalTitle('');
        fetchTaskMetaById(questionId).then(t => {
            const current = document.getElementById('task-modal');
            if (!current) return;
            if (String(current.dataset.questionId || '') !== String(questionId)) return;
            if (current.dataset.knowledgeMode === '1') return;
            const taskKey = t ? String(t.task_key || '').trim() : '';
            setModalTitle(taskKey || String(questionId));
        });
    } else {
        setModalTitle(`${name}`);
    }

    // Show loading state
    list.innerHTML = '<div style="color:white; display:flex; justify-content:center; align-items:center; height:100%; font-size: 1.2em;">加载中...</div>';
    
    modal.classList.remove('modal-animate');
    void modal.offsetWidth;
    modal.classList.add('modal-animate');
    modal.classList.add('fullscreen');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    try {
        loadTaskIframe(list, kid, questionId);
    } catch (e) {
        console.error('Failed to open task modal', e);
        closeModal();
    }
}

function loadTaskIframe(container, kid, questionId) {
    let url = `static/tasks.html?exam_type=${EXAM_TYPE}`;
    if (kid) {
        url += `&kid=${encodeURIComponent(kid)}`;
    }
    if (questionId) {
        url += `&question_id=${encodeURIComponent(questionId)}`;
    }
    if (kid) {
        const filters = getKnowledgeFilterParams();
        if (filters.part) {
            url += `&filter_part=${encodeURIComponent(filters.part)}`;
        }
        if (filters.sub) {
            url += `&filter_sub=${encodeURIComponent(filters.sub)}`;
        }
    }

    container.innerHTML = `<iframe src="${url}" style="width:100%; height:100%; border:none;"></iframe>`;

    // Apply display mode
    const mode = localStorage.getItem('displayMode') || 'normal';
    
    const displaySelect = document.getElementById('displayModeSelect');
    if (displaySelect) {
        displaySelect.value = mode;
    }

    const iframe = container.querySelector('iframe');
    if (iframe) {
        // Add load event listener to ensure message is received after iframe loads
        iframe.addEventListener('load', function () {
            this.contentWindow.postMessage({
                type: 'setDisplayMode',
                mode: mode
            }, '*');
        });
    }
}

function getKnowledgeFilterParams() {
    const filterContainer = document.getElementById('knowledgeFilterContainer');
    if (!filterContainer || filterContainer.style.display === 'none') {
        return { part: '', sub: '' };
    }
    const partSelect = document.getElementById('knowledgeFilterPart');
    const subSelect = document.getElementById('knowledgeFilterSub');
    return {
        part: partSelect && partSelect.value ? partSelect.value : '',
        sub: subSelect && subSelect.value ? subSelect.value : ''
    };
}

function initKnowledgeFilters() {
    const partSelect = document.getElementById('knowledgeFilterPart');
    const subSelect = document.getElementById('knowledgeFilterSub');
    if (!partSelect || !subSelect) return;
    if (partSelect.dataset.inited) return;

    function reloadIframe() {
        const modal = document.getElementById('task-modal');
        const list = document.getElementById('modal-task-list');
        const kid = modal.dataset.kid;
        if (!kid || !list) return;
        const questionId = modal.dataset.questionId || '';
        loadTaskIframe(list, kid, questionId);
    }

    partSelect.addEventListener('change', function () {
        if (knowledgeFilterUpdating) return;
        if (knowledgeFilterSummary) {
            knowledgeFilterSummary.filterPart = partSelect.value || '';
            knowledgeFilterSummary.filterSub = '';
        }
        updateKnowledgeFilterUI(knowledgeFilterSummary, true);
        reloadIframe();
    });
    subSelect.addEventListener('change', function () {
        if (knowledgeFilterUpdating) return;
        if (knowledgeFilterSummary) {
            knowledgeFilterSummary.filterSub = subSelect.value || '';
        }
        reloadIframe();
    });

    partSelect.dataset.inited = '1';
}

function updateKnowledgeFilterUI(summary, keepSelection = false) {
    const filterContainer = document.getElementById('knowledgeFilterContainer');
    const partSelect = document.getElementById('knowledgeFilterPart');
    const subSelect = document.getElementById('knowledgeFilterSub');
    if (!filterContainer || !partSelect || !subSelect) return;
    const prevPart = partSelect.value;
    const prevSub = subSelect.value;
    knowledgeFilterSummary = summary || {};
    const parts = (knowledgeFilterSummary.parts || []).map(p => String(p || '').trim()).filter(Boolean);
    if (!parts.length) {
        filterContainer.style.display = 'none';
        partSelect.value = '';
        subSelect.value = '';
        subSelect.disabled = true;
        return;
    }
    const sectionsByPart = knowledgeFilterSummary.sectionsByPart || {};
    const partCounts = knowledgeFilterSummary.partCounts || {};
    const sectionCounts = knowledgeFilterSummary.sectionCounts || {};

    function getPartLabel(part) {
        if (part === 'Part I') return '写作';
        if (part === 'Part II') return '听力';
        if (part === 'Part III') return '阅读';
        if (part === 'Part IV') return '翻译';
        return part || '';
    }

    function buildSectionEntries(part) {
        const sectionMap = (sectionsByPart && part) ? (sectionsByPart[part] || {}) : {};
        const sectionOrder = ['Sec A', 'Sec B', 'Sec C'];
        return sectionOrder
            .filter(k => sectionMap[k])
            .map(k => ({ value: k, label: sectionMap[k] }))
            .concat(Object.keys(sectionMap)
                .filter(k => !sectionOrder.includes(k))
                .map(k => ({ value: k, label: sectionMap[k] })));
    }

    const multipleParts = parts.length > 1;
    if (!multipleParts) {
        const onlyPart = parts[0];
        const sectionEntries = buildSectionEntries(onlyPart);
        if (sectionEntries.length <= 1) {
            filterContainer.style.display = 'none';
            partSelect.value = '';
            subSelect.value = '';
            subSelect.disabled = true;
            return;
        }
    }

    filterContainer.style.display = 'flex';
    knowledgeFilterUpdating = true;
    if (multipleParts) {
        partSelect.style.display = '';
        partSelect.innerHTML = '';
        const totalCount = parts.reduce((sum, p) => sum + (partCounts[p] || 0), 0);
        const allOpt = document.createElement('option');
        allOpt.value = '';
        allOpt.textContent = `全部 ${totalCount}`;
        partSelect.appendChild(allOpt);

        const order = ['Part I', 'Part II', 'Part III', 'Part IV'];
        const orderedParts = order.filter(p => parts.includes(p)).concat(parts.filter(p => !order.includes(p)));
        orderedParts.forEach(p => {
            const option = document.createElement('option');
            option.value = p;
            option.textContent = `${getPartLabel(p)} ${partCounts[p] || 0}`;
            partSelect.appendChild(option);
        });

        const desiredPart = keepSelection ? prevPart : (parts.includes(knowledgeFilterSummary.filterPart) ? knowledgeFilterSummary.filterPart : '');
        partSelect.value = desiredPart;
    } else {
        partSelect.style.display = 'none';
        partSelect.value = parts[0];
    }
    const activePart = partSelect.value;
    const sectionEntries = buildSectionEntries(activePart);
    const sectionCountMap = (activePart && sectionCounts) ? (sectionCounts[activePart] || {}) : {};

    if (!activePart || sectionEntries.length <= 1) {
        subSelect.style.display = 'none';
        subSelect.value = '';
        subSelect.disabled = true;
        knowledgeFilterUpdating = false;
        return;
    }
    subSelect.style.display = '';
    subSelect.innerHTML = '';
    const option = document.createElement('option');
    option.value = '';
    option.textContent = `所有题型 ${sectionEntries.reduce((sum, entry) => sum + (sectionCountMap[entry.value] || 0), 0)}`;
    subSelect.appendChild(option);
    sectionEntries.forEach(opt => {
        const item = document.createElement('option');
        item.value = opt.value;
        item.textContent = `${opt.label} ${sectionCountMap[opt.value] || 0}`;
        subSelect.appendChild(item);
    });
    const desiredSub = keepSelection ? prevSub : (sectionEntries.some(e => e.value === knowledgeFilterSummary.filterSub) ? knowledgeFilterSummary.filterSub : '');
    subSelect.value = desiredSub;
    subSelect.disabled = false;
    knowledgeFilterUpdating = false;
}

window.addEventListener('message', function (event) {
    if (!event.data) return;
    if (event.data.type === 'taskNavSummary') {
        const modal = document.getElementById('task-modal');
        const filterContainer = document.getElementById('knowledgeFilterContainer');
        if (!modal || modal.dataset.knowledgeMode !== '1') {
            if (filterContainer) filterContainer.style.display = 'none';
            return;
        }
        updateKnowledgeFilterUI(event.data);
        return;
    }
    if (event.data.type === 'wordModalOpen' || event.data.type === 'wordModalClose') {
        const modal = document.getElementById('task-modal');
        if (modal) {
            modal.classList.toggle('word-modal-open', event.data.type === 'wordModalOpen');
        }
        return;
    }
    if (event.data.type === 'aiModalOpen' || event.data.type === 'aiModalClose') {
        const modal = document.getElementById('task-modal');
        if (modal) {
            modal.classList.toggle('ai-modal-open', event.data.type === 'aiModalOpen');
        }
        return;
    }
    if (event.data.type === 'statsModalOpen' || event.data.type === 'statsModalClose') {
        const modal = document.getElementById('task-modal');
        if (modal) {
            modal.classList.toggle('stats-modal-open', event.data.type === 'statsModalOpen');
        }
        if (event.data.type === 'statsModalOpen') {
            openFullStatsOverlay(event.data.url);
        } else {
            closeFullStatsOverlay();
        }
        return;
    }
    if (event.data.type === 'sentenceModalOpen' || event.data.type === 'sentenceModalClose') {
        const modal = document.getElementById('task-modal');
        if (modal) {
            modal.classList.toggle('sentence-modal-open', event.data.type === 'sentenceModalOpen');
        }
        return;
    }
    if (event.data.type === 'wordPopupOpen' || event.data.type === 'wordPopupClose') {
        const modal = document.getElementById('task-modal');
        if (modal) {
            modal.classList.toggle('word-popup-open', event.data.type === 'wordPopupOpen');
        }
        return;
    }
    if (event.data.type === 'requireLogin') {
        try {
            if (typeof startWechatLoginPreferFast === 'function') {
                startWechatLoginPreferFast();
            } else if (typeof showLoginModal === 'function') {
                showLoginModal();
            }
        } catch (e) {}
        return;
    }
});

function ensureFullStatsOverlay() {
    if (document.getElementById('fullStatsOverlay')) return;
    const el = document.createElement('div');
    el.id = 'fullStatsOverlay';
    el.style.position = 'fixed';
    el.style.inset = '0';
    el.style.display = 'none';
    el.style.alignItems = 'stretch';
    el.style.justifyContent = 'stretch';
    el.style.background = 'rgba(0,0,0,0.55)';
    el.style.zIndex = '70000';
    el.innerHTML = `
        <div style="width:100vw;height:100vh;background:#111;overflow:hidden;position:relative;">
            <button type="button" id="fullStatsOverlayClose" style="position:absolute; top:10px; right:20px; z-index:70001; border:1px solid rgba(0,0,0,0.25); background:rgba(255,255,255,0.9); color:#111; border-radius:10px; padding:6px 10px; font-size:12px; line-height:1; cursor:pointer;">关闭</button>
            <iframe id="fullStatsOverlayFrame" src="" style="width:100%; height:100%; border:none; background:#111;"></iframe>
        </div>
    `;
    el.addEventListener('click', function (e) {
        if (e.target === el) closeFullStatsOverlay();
    });
    document.body.appendChild(el);
    const btn = document.getElementById('fullStatsOverlayClose');
    if (btn) btn.addEventListener('click', function (e) { e.preventDefault(); closeFullStatsOverlay(); });
    window.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeFullStatsOverlay();
    });
}

function normalizeStatsUrl(url) {
    const u = String(url || '').trim();
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith('/')) return u;
    return `${STATIC_BASE}/${u}`;
}

let __fullStatsPrevOverflowHtml = null;
let __fullStatsPrevOverflowBody = null;

function openFullStatsOverlay(url) {
    ensureFullStatsOverlay();
    const overlay = document.getElementById('fullStatsOverlay');
    const frame = document.getElementById('fullStatsOverlayFrame');
    if (!overlay || !frame) return;
    frame.src = normalizeStatsUrl(url || 'split_read_clue_highlight_grid.html');
    overlay.style.display = 'flex';
    try {
        if (__fullStatsPrevOverflowHtml === null) __fullStatsPrevOverflowHtml = document.documentElement.style.overflow || '';
        if (__fullStatsPrevOverflowBody === null) __fullStatsPrevOverflowBody = document.body.style.overflow || '';
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
    } catch (e) {}
}

function closeFullStatsOverlay() {
    const overlay = document.getElementById('fullStatsOverlay');
    const frame = document.getElementById('fullStatsOverlayFrame');
    if (frame) frame.src = '';
    if (overlay) overlay.style.display = 'none';
    const modal = document.getElementById('task-modal');
    if (modal) modal.classList.remove('stats-modal-open');
    try {
        document.documentElement.style.overflow = __fullStatsPrevOverflowHtml !== null ? __fullStatsPrevOverflowHtml : '';
        document.body.style.overflow = __fullStatsPrevOverflowBody !== null ? __fullStatsPrevOverflowBody : '';
    } catch (e) {}
    __fullStatsPrevOverflowHtml = null;
    __fullStatsPrevOverflowBody = null;
}

// Deprecated: use setDisplayMode
function toggleEyeProtection(checkbox) {
    const isEnabled = checkbox.checked;
    setDisplayMode(isEnabled ? 'eye' : 'normal');
}

function openKnowledgeTasksInModal(kid, name) {
    openTaskModal({ kid, name, hidePracticeBtn: true });
}

function openQuestionInPracticeMode(questionId, kid) {
    // Only pass questionId to force single task mode (treat as single-element array)
    openTaskModal({ questionId, hidePracticeBtn: true });
}

function highlightQuestions(kid, node) {
    console.log('highlightQuestions called with:', kid, node);
    currentActiveKid = kid;
    const headers = document.querySelectorAll('.knowledge-header');
    headers.forEach(h => {
        h.classList.remove('active');
        h.style.backgroundColor = '';
    });
    const targetHeader = document.querySelector(`.knowledge-header[data-knowledge-id="${kid}"]`);
    if (targetHeader) {
        targetHeader.classList.add('active');
        targetHeader.style.backgroundColor = '#f0f8ff';
    }

    const cards = document.querySelectorAll('.question-item');
    cards.forEach(c => {
        c.classList.remove('highlighted');
        const ov = c.querySelector('.question-overlay');
        if (ov) ov.remove();
    });

    // If we have a node with cached tasks, use that list to find matches.
    // This covers Level 1 and Level 2 parent nodes.
    // Otherwise, fallback to exact kid match (though cachedTasks should cover that too).

    let match = [];
    if (node && node.cachedTasks && node.cachedTasks.length > 0) {
        // Use a Set for fast lookup of task IDs
        const taskIds = new Set(node.cachedTasks.map(t => String(t.id)));
        // Iterate all cards and check if their ID is in the set
        // (More efficient than querySelectorAll for each ID if many tasks, 
        // but since we need to scan all cards to remove highlights anyway, we can just check here)
        // However, we already cleared highlights above.
        // Let's iterate cards again or filter.

        // Optimization: Iterate all cards once? We did above.
        // Let's just find the matching cards.
        // Since cards have data-task-id, we can check against our Set.

        cards.forEach(c => {
            if (c.getAttribute('data-is-borrowed') === 'true') return;
            const qId = c.getAttribute('data-task-id');
            if (qId && taskIds.has(String(qId))) {
                match.push(c);
            }
        });
    } else {
        // Fallback (e.g. if node logic fails or task index not ready)
        match = Array.from(document.querySelectorAll(`.question-item[data-knowledge-id="${kid}"]`))
            .filter(c => c.getAttribute('data-is-borrowed') !== 'true');
    }

    match.forEach(c => {
        c.classList.add('highlighted');
        if (!c.querySelector('.question-overlay')) {
            const ov = document.createElement('div');
            ov.className = 'question-overlay';
            c.appendChild(ov);
        }
    });
}

function renderWordStats(tasks, knowledgeName) {
    const container = document.getElementById('wordStatsContainer');
    if (!container) {
        return;
    }

    // Force visible style just in case
    container.style.display = 'block';

    if (!g_dictAll || !g_dictAll.entries) {
        container.innerHTML = '<div style="padding:10px; color:#666;">词汇统计加载中...</div>';
        return;
    }

    const renderSeq = ++g_wordStatsRenderSeq;
    const taskCount = tasks ? tasks.length : 0;
    let sidebarMode = 'category';
    try {
        sidebarMode = localStorage.getItem('cet_sidebar_mode') || 'category';
    } catch (e) {}

    function isEntryInExam(entry) {
        try {
            const t = String(entry && entry.type ? entry.type : '').toLowerCase();
            if (!t) return true;
            if (t.startsWith('not')) return false;
            if (EXAM_TYPE === 'kaoyan') return t.includes('kaoyan');
            if (EXAM_TYPE === 'cet6') return t.includes('6');
            return t.includes('4');
        } catch (e) {}
        return true;
    }

    function getAllDictWordsForExam() {
        const out = [];
        try {
            const entries = g_dictAll && g_dictAll.entries ? g_dictAll.entries : {};
            Object.keys(entries).forEach(k => {
                const lemma = String(k || '').trim().toLowerCase();
                if (!lemma) return;
                const entry = entries[lemma];
                if (!isEntryInExam(entry)) return;
                out.push(lemma);
            });
        } catch (e) {}
        return out;
    }

    const activeKidRaw = (typeof currentActiveKid !== 'undefined') ? currentActiveKid : null;
    const activeKid = (activeKidRaw === null || activeKidRaw === undefined) ? null : parseInt(activeKidRaw, 10);
    const activeNode = (() => {
        try {
            if (activeKid === null || Number.isNaN(activeKid)) return null;
            if (typeof findNodeById !== 'function') return null;
            return findNodeById(g_knowledgePoints, activeKid);
        } catch (e) {
            return null;
        }
    })();

    const rawWordList = (() => {
        try {
            if (activeNode && Array.isArray(activeNode.cachedWords) && activeNode.cachedWords.length) {
                return activeNode.cachedWords.map(w => String(w || '').trim().toLowerCase()).filter(Boolean);
            }
        } catch (e) {}
        return getAllDictWordsForExam();
    })();

    const useFilteredCounts = !!(activeKid !== null && !Number.isNaN(activeKid) && Array.isArray(tasks) && tasks.length);
    const selectedTaskIdSet = useFilteredCounts
        ? new Set(tasks.map(t => String(t && t.id != null ? t.id : '')).filter(Boolean))
        : null;

    function getWordCounts(word) {
        const cleanWord = String(word || '').toLowerCase().replace(/[^a-z]/g, '');
        if (!cleanWord) return { taskCount: 0, sentenceCount: 0 };
        if (!useFilteredCounts || !selectedTaskIdSet) {
            const freq = getWordFrequencyStats(cleanWord);
            return { taskCount: freq.taskCount || 0, sentenceCount: freq.sentenceCount || 0 };
        }
        const lemma = resolveLemmaLite(cleanWord);
        const entry = g_dictAll.entries[lemma];
        if (!entry || typeof entry !== 'object') return { taskCount: 0, sentenceCount: 0 };
        const tIds = Array.isArray(entry.task_ids) ? entry.task_ids : [];
        const sIds = Array.isArray(entry.sentence_ids) ? entry.sentence_ids : [];
        const filteredTaskCount = tIds.filter(tid => selectedTaskIdSet.has(String(tid))).length;
        const totalTaskCount = tIds.length;
        let filteredSentenceCount = 0;
        if (totalTaskCount > 0 && sIds.length > 0) {
            filteredSentenceCount = Math.round(sIds.length * (filteredTaskCount / totalTaskCount));
        }
        return { taskCount: filteredTaskCount, sentenceCount: filteredSentenceCount };
    }

    const computeAndRender = async () => {
        if (renderSeq !== g_wordStatsRenderSeq) return;

        const sortedWords = rawWordList
            .map(word => {
                const c = getWordCounts(word);
                return { word, taskCount: c.taskCount, sentenceCount: c.sentenceCount };
            })
            .filter(x => (x.taskCount || 0) > 0 || (x.sentenceCount || 0) > 0)
            .sort((a, b) => {
                if (b.taskCount !== a.taskCount) return b.taskCount - a.taskCount;
                if (b.sentenceCount !== a.sentenceCount) return b.sentenceCount - a.sentenceCount;
                return String(a.word).localeCompare(String(b.word));
            });

        window.currentWordStatsWords = sortedWords.map(x => String(x.word || '').trim().toLowerCase()).filter(Boolean);
        try {
            window.__wordModeStatsPairs = sortedWords.map(it => {
                const w = String(it && it.word ? it.word : '').trim();
                const tc = (it && typeof it.taskCount === 'number') ? it.taskCount : parseInt(String(it && it.taskCount != null ? it.taskCount : ''), 10);
                const sc = (it && typeof it.sentenceCount === 'number') ? it.sentenceCount : parseInt(String(it && it.sentenceCount != null ? it.sentenceCount : ''), 10);
                const meta = `${Number.isFinite(tc) ? tc : 0}篇/${Number.isFinite(sc) ? sc : 0}次`;
                return { word: w, meta };
            }).filter(p => p && p.word);
        } catch (e) {}

        if (sidebarMode === 'word') {
            try {
                if (typeof window.updateWordModeList === 'function') window.updateWordModeList();
            } catch (e) {}
            const hasSelectedWord = !!(window.currentWordModeWord && String(window.currentWordModeWord || '').trim());
            if (!hasSelectedWord) {
                try {
                    renderWordModeEmptyPanel();
                } catch (e) {}
            }
            try {
                if (typeof window.updateWordProgressUI === 'function') window.updateWordProgressUI();
            } catch (e) {}
            return;
        }

        const knownSet = window.userKnownSet || new Set();
        let knownCount = 0;
        sortedWords.forEach(item => {
            const wKey = String(item && item.word ? item.word : '').trim().toLowerCase();
            if (wKey && knownSet.has(wKey)) knownCount += 1;
        });
        const totalCount = sortedWords.length;
        const unknownCount = Math.max(0, totalCount - knownCount);

        let html = `
                <div style="margin-bottom: 10px; font-weight: bold; border-bottom: 1px solid #ddd; display: inline-flex;padding-bottom: 5px;  justify-content: space-between; align-items: center;">
                    <span style="font-size: 1.2vw;">${knowledgeName ? `“${knowledgeName}”` : '18套卷'}重点高频词汇 (出现篇数/次数)


                    </span>
                    <span style="font-weight: normal; font-size: 1vw; color: #666; display: inline-flex; align-items: center; gap: 2px; margin: 0 2vw;">
                        <span class="word-status-switch" role="tablist" aria-label="词汇筛选">
                            <span class="word-status-indicator" aria-hidden="true"></span>
                            <span class="word-status-filter" role="tab" tabindex="0" data-word-filter="all" title="点击显示全部">全部<span class="word-status-count">${totalCount}</span></span>
                            <span class="word-status-filter" role="tab" tabindex="0" data-word-filter="known" title="点击筛选熟词"><span class="word-status-dot" style="background:#2fb344;"></span>熟词<span class="word-status-count">${knownCount}</span></span>
                            <span class="word-status-filter" role="tab" tabindex="0" data-word-filter="unknown" title="点击筛选生词"><span class="word-status-dot" style="background:#d63939;"></span>生词<span class="word-status-count">${unknownCount}</span></span>
                        </span>
                    
                        <span style="margin-left: 1vw;color: #008e1e;font-size: 0.9vw;">
                            注：单击单词可标为熟词，长按可查词；点右上角可加入生词本
                        </span>

                    </span>
 
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;  overflow-y: auto;">
            `;

        sortedWords.forEach((item, index) => {
            const word = item.word;
            const taskCount2 = item.taskCount;
            const sentenceCount2 = item.sentenceCount;
            const fontSize = 18;
            const color = '#333';
            const wKey = String(word || '').trim().toLowerCase();
            const isKnown = !!wKey && knownSet.has(wKey);
            const status = isKnown ? 'known' : 'unknown';
            const bg = status === 'unknown' ? '#f0f4f8' : '#f0f4f8';
            const isFirstItem = index === 0;
            const countText = isFirstItem && currentActiveKid === null
                ? `${taskCount2}篇/${sentenceCount2}次`
                : `${taskCount2}/${sentenceCount2}`;
            html += `
                    <span class="word-stat-item" data-word="${word}" data-status="${status}" style="font-size: ${fontSize}px; color: ${color}; background: ${bg}; padding: 2px 8px; border-radius: 4px; border: 1px solid #dbe4ed; display: inline-block;width:169px; cursor: pointer;"
                          >
                        ${word} <small style="color: #888; font-size: 0.6em; margin-left:2px;">${countText}</small>
                    </span>
                `;
        });

        html += `</div>`;

        container.innerHTML = html;
        bindWordStatsInteractions(container);
        bindWordStatusFilters(container);
        updateWordStatusFilterCountsInternal(container);
        if (typeof window.updateWordModeList === 'function') window.updateWordModeList();

        if (window.updateWordStatsHighlights) {
            window.updateWordStatsHighlights();
        }
        updateWordStatusFilterCountsInternal(container);
        if (typeof window.updateWordProgressUI === 'function') {
            window.updateWordProgressUI();
        }
    };

    computeAndRender();
}

window.updateWordModeList = function() {
    try {
        const mode = localStorage.getItem('cet_sidebar_mode') || 'category';
        if (mode === 'word') {
            renderWordModeListFromWordStats();
            const nextWord = window.currentWordModeWord;
            let hasValidSelection = false;
            if (nextWord) {
                try {
                    const listEl = document.getElementById('wordModeWordList');
                    const row = listEl ? listEl.querySelector(`.word-mode-row[data-word="${CSS.escape(nextWord)}"]`) : null;
                    hasValidSelection = !!row;
                } catch (e) {}
            }
            if (hasValidSelection) {
                setWordModeSelectedWord(nextWord, { scrollThumbs: false });
            } else {
                try {
                    window.currentWordModeWord = '';
                } catch (e) {}
                try {
                    renderWordModeEmptyPanel();
                } catch (e) {}
            }
        }
    } catch (e) {}
};

// Injected styles for knowledge tree
(function () {
    if (!document.getElementById('knowledge-tree-styles')) {
        const style = document.createElement('style');
        style.id = 'knowledge-tree-styles';
        style.textContent = `
                    .knowledge-tree-container { font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
                    .knowledge-item { user-select: none; margin-top:0.6vw;}
                    .knowledge-header { 
                        display: flex; 
                        align-items: center; 
                        padding: 3px 5px; 
                        cursor: pointer; 
                        border-radius: 4px; 
                        transition: background-color 0.2s;
                    }
                    .knowledge-header:hover { background-color: #f0f8ff; }
                    .tree-toggle { 
                        display: inline-flex; 
                        align-items: center;
                        justify-content: center;
                        width: 1.6vw;
                        height: 1.6vw;
                        padding: 0 !important;
                        margin-right: 4px; 
                        color: #6c757d; 
                        transition: transform 0.2s;
                    }
                    .tree-toggle::before {
                        content: '';
                        display: inline-block;
                        border-style: solid;
                        border-width: 4px 0 4px 6px;
                        border-color: transparent transparent transparent currentColor;
                        transform: rotate(0deg);
                    }
                    .tree-toggle.expanded::before {
                        transform: rotate(90deg);
                    }
                    .tree-toggle:hover { color: #007bff; }
                    .tree-toggle.empty { visibility: hidden; }
                    .knowledge-name { font-size: clamp(10px, 1.2vw, 14px); color: #333; }
                    .knowledge-count { font-size: max(0.7vw, 9px); color: #9a9a9aff; margin-left: 6px;  padding: 1px 6px; border-radius: 10px; }
                    .knowledge-action { display: none; }
                    .knowledge-header.active .knowledge-count { display: none; }
                    .knowledge-header.active .knowledge-action { display: inline-flex; }
                    .knowledge-header.active { background-color: #b5ddff  !important; }
                    .knowledge-study-btn { 
                        padding: 2px 5px;
                        font-size: 0.9vw;
                        border: 1px solid #206bc4;
                        color: #206bc4;
                        background: #fff;
                        border-radius: 4px;
                        cursor: default;
                    }
                    .piliangzhan-btn { 
                        margin-left: 6px;
                        padding: 1px 5px;
                        font-size: 0.8vw;
                        border: 1px solid #dadada;
                        color: #666;
                        background: #fff;
                        border-radius: 4px;
                        cursor: default;
                    }
                    .shengciben-btn { 
                        padding: 2px 5px;
                        font-size: 0.9vw;
                        border: 1px solid #b33a2fff;
                        color: #fd7d7d;
                        background: #fff;
                        border-radius: 4px;
                        cursor: default;
                    }
                    .knowledge-children { overflow: hidden; }
                    .knowledge-children.hidden { display: none; }
                    
                    /* Levels indentation */
                    .level-1 > .knowledge-header { font-weight: 600; color: #2c3e50; background-color: #fff; margin-bottom: 4px; }
                    .level-1 > .knowledge-header .knowledge-name { font-size: max(0.9vw, 11px);padding:0.5vw 0vw 0.4vw 0.4vw; }
                    .level-1 > .knowledge-header:hover { background-color: #f0f8ff; }
                    .level-2 > .knowledge-header { font-weight: 500; }
                    .level-3 > .knowledge-header { font-weight: 400; color: #555; }
                    .word-progress-bar { height: 4px; width: 5vw; background: #efeee9ff;  overflow: hidden; display: flex; }
                    .word-progress-bar > div { height: 100%; }
                    .word-progress-label { font-size: 11px; color: #666; line-height: 1.2; margin-top: 2px; text-align: center; }
                    #globalWordProgressBar .word-progress-bar { height: 8px; width: 13vw; }
                    #globalTaskProgressBar .word-progress-bar { height: 8px; width: 13vw; }
                    .knowledge-right { margin-left: auto; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
                    .knowledge-right .knowledge-count { margin-left: 0; }
                    .knowledge-right .knowledge-action { margin-left: 0; }
                    .knowledge-right .knowledge-progress { width: 70px; }
                    .word-status-switch { position: relative; display: inline-flex; align-items: center; padding: 2px; border-radius: 999px; border: 1px solid #dbe4ed; background: #fff; gap: 2px; }
                    .word-status-indicator {     border: solid 1px black;position: absolute; top: 2px; bottom: 2px; left: 0; border-radius: 999px; background: #fff8eb; transition: transform 180ms ease, width 180ms ease, opacity 180ms ease; z-index: 0; opacity: 0; }
                    .word-status-filter { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; gap: 0.3vw; padding: 0.2vw 0.6vw; border-radius: 999px; cursor: pointer; user-select: none; box-sizing: border-box; color: #666; font-weight: 500; }
                    .word-status-filter.active { color: #111; font-weight: 700; }
                    #wordModeFilterSwitch .word-status-filter[data-wordmode-filter="known"],
                    #wordModeFilterSwitch .word-status-filter.active[data-wordmode-filter="known"] { color: #2fb344; }
                    #wordModeFilterSwitch .word-status-filter[data-wordmode-filter="unknown"],
                    #wordModeFilterSwitch .word-status-filter.active[data-wordmode-filter="unknown"] { color: #d63939; }
                    .word-status-dot { display:inline-block; width:10px; height:10px; border:1px solid #dbe4ed; border-radius: 2px; box-sizing: border-box; }
                    .word-status-count { margin-left: 0.2vw; font-size: 80%; color: #a8a8a8; }
                    #wordModeFilterSwitch .word-status-filter { flex-direction: column; gap: 0; line-height: 1.1; padding: 2px 10px; }
                    #wordModeFilterSwitch .word-status-count { margin-left: 0; font-size: 66%; }
                    #wordModeFilterSwitch .word-status-filter[data-wordmode-filter="known"] .word-status-count { color: #2fb344; }
                    #wordModeFilterSwitch .word-status-filter[data-wordmode-filter="unknown"] .word-status-count { color: #d63939; }
                    #wordModeFilterSwitch .word-status-filter[data-wordmode-filter="unclassified"],
                    #wordModeFilterSwitch .word-status-filter.active[data-wordmode-filter="unclassified"] { color: #616161ff; }
                    #wordModeFilterSwitch .word-status-filter[data-wordmode-filter="unclassified"] .word-status-count { color: #616161ff; }
                    .word-mode-row.active { background: rgba(186, 217, 255, 0.55) !important; border-color: #bad9ff !important; }
                    .word-mode-action-btn { appearance: none; border: 0; padding: 0.2vw 0.2vw; border-radius: 0.5vw; font-size: 0.8vw; line-height: 1.8; cursor: pointer; color: #fff; font-weight: 700; }
                    .word-mode-action-btn:disabled { opacity: 0.6; cursor: not-allowed; }
                    .word-mode-action-known { background: #2fb344; }
                    .word-mode-action-unknown { background: #d63939; }
                    .word-mode-panel { border-radius: 8px; padding: 10px; }
                    .word-mode-hl { background: rgba(186, 217, 255, 0.8); border-radius: 3px; padding: 0 2px; }
                    .word-mode-unk { text-decoration: underline; text-decoration-color: rgba(214, 57, 57, 0.95); text-decoration-thickness: 2px; text-underline-offset: 2px; }
                    .word-mode-kn { text-decoration: underline; text-decoration-color: rgba(47, 179, 68, 0.95); text-decoration-thickness: 2px; text-underline-offset: 2px; }
                    .word-mode-uncl { text-decoration: underline; text-decoration-color: rgba(160, 160, 160, 0.95); text-decoration-thickness: 2px; text-underline-offset: 2px; }
                    .wm-token { cursor: pointer; }
                    .wp-audio-btn { width: 28px; height: 28px; border-radius: 50%; border: 1px solid #ccc; background: #fff; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0; color: #666; }
                    .wp-audio-btn svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 1.8; }
                `;
        document.head.appendChild(style);
    }
})();

function normalizeProgressWord(w) {
    return String(w || '').trim().toLowerCase();
}

function uniqueWords(words) {
    const out = [];
    const seen = new Set();
    for (const w of (words || [])) {
        const ww = normalizeProgressWord(w);
        if (!ww || seen.has(ww)) continue;
        seen.add(ww);
        out.push(ww);
    }
    return out;
}

function computeWordProgress(words) {
    const list = uniqueWords(words);
    const total = list.length;
    const knownSet = window.userKnownSet || new Set();
    let unknown = 0;
    let known = 0;
    for (const w of list) {
        if (knownSet.has(w)) known++;
        else unknown++;
    }
    return { total, known, unknown };
}

function renderProgressBar(el, prog) {
    if (!el) return;
    const isGlobal = el.id === 'globalWordProgressBar';
    const total = prog && prog.total ? prog.total : 0;
    if (!total) {
        const title = '熟词 0 / 生词 0';
        el.innerHTML = `<div class="word-progress-bar" title="${title}"></div>`;
        return;
    }
    // if (!total) {
    //     el.innerHTML = isGlobal
    //         ? `
    //     <div class="word-progress-bar"></div>
    //     <div class="word-progress-label">熟词 0 / 生词 0 / 未标 0</div>
    // `
    //         : `<div class="word-progress-bar" title="熟词 0 / 生词 0 / 未标 0"></div>`;
    //     return;
    // }
    const baseTotalForWidth = 180;
    const baseWidthVw = 5;
    const minWidthVw = 2;
    const maxWidthVw = 13;
    const barWidthVw = isGlobal ? null : Math.max(minWidthVw, Math.min(maxWidthVw, (total / baseTotalForWidth) * baseWidthVw));

    const knownPct = (prog.known / total) * 100;
    const unknownPct = (prog.unknown / total) * 100;
    const title = `熟词 ${prog.known} / 生词 ${prog.unknown}`;
    if (isGlobal) {
        el.innerHTML = `
        <div class="word-progress-bar" title="${title}">
            <div style="width:${knownPct}%; background:#2fb344;"></div>
            <div style="width:${unknownPct}%; background:#d63939;"></div>
        </div>
    `;
    } else {
        el.innerHTML = `
        <div class="word-progress-bar" title="${title}" style="width:${barWidthVw}vw; margin-left:auto;">
            <div style="width:${knownPct}%; background:#2fb344;"></div>
            <div style="width:${unknownPct}%; background:#d63939;"></div>
        </div>
    `;
    }
}

function findKnowledgeNodeById(kid) {
    const id = parseInt(kid, 10);
    if (!g_knowledgePoints || !Array.isArray(g_knowledgePoints)) return null;
    const stack = [...g_knowledgePoints];
    while (stack.length) {
        const n = stack.pop();
        if (!n) continue;
        if (parseInt(n.id, 10) === id) return n;
        if (n.children && n.children.length) {
            for (const c of n.children) stack.push(c);
        }
    }
    return null;
}

function removeTaskWordKnownOverlays() {
    try {
        document.querySelectorAll('.word-known-overlay').forEach(el => el.remove());
        document.querySelectorAll('.question-item[data-task-id]').forEach(el => {
            try {
                if (el.hasAttribute('data-word-known-prev-title')) {
                    const prev = el.getAttribute('data-word-known-prev-title');
                    if (prev) el.setAttribute('title', prev);
                    else el.removeAttribute('title');
                    el.removeAttribute('data-word-known-prev-title');
                } else if (String(el.getAttribute('title') || '').includes('词')) {
                    el.removeAttribute('title');
                }
            } catch (err) {}
        });
    } catch (e) {}
}

function getTaskWordKnownOverlayStats() {
    const out = {
        taskStats: new Map(),
        totalKnownOccurrences: 0,
        totalUnknownOccurrences: 0,
        totalUnclassifiedOccurrences: 0,
        totalKeyOccurrences: 0,
        hasAnyKnownKeyWord: false,
    };
    try {
        if (!g_dictAll || !g_dictAll.entries) return out;
        const entries = g_dictAll.entries;
        const isKeyEntry = (entry) => {
            try {
                if (!entry || typeof entry !== 'object') return false;
                if (EXAM_TYPE === 'kaoyan') return entry.is_kaoyan_key === true;
                if (EXAM_TYPE === 'cet6') return entry.is_cet6_key === true;
                return entry.is_cet4_key === true;
            } catch (e) {
                return false;
            }
        };
        const knownLemmaSet = (typeof buildLemmaSetLite === 'function')
            ? buildLemmaSetLite(window.userKnownSet || new Set())
            : new Set();
        Object.keys(entries).forEach(rawLemma => {
            const lemma = String(rawLemma || '').trim().toLowerCase();
            if (!lemma) return;
            const entry = entries[lemma];
            if (!isKeyEntry(entry)) return;

            const taskIds = entry && Array.isArray(entry.task_ids) ? entry.task_ids : [];
            const sentenceIds = entry && Array.isArray(entry.sentence_ids) ? entry.sentence_ids : [];
            const occurrenceCount = sentenceIds.length || taskIds.length || 0;
            const isKnown = knownLemmaSet.has(lemma);
            const isUnknown = !isKnown;

            out.totalKeyOccurrences += occurrenceCount;
            if (isKnown) {
                out.totalKnownOccurrences += occurrenceCount;
                out.hasAnyKnownKeyWord = true;
            } else if (isUnknown) {
                out.totalUnknownOccurrences += occurrenceCount;
            }

            taskIds.forEach(taskId => {
                const tid = String(taskId || '').trim();
                if (!tid) return;
                if (!out.taskStats.has(tid)) {
                    out.taskStats.set(tid, {
                        totalWords: 0,
                        knownWords: 0,
                        unknownWords: 0,
                        unclassifiedWords: 0,
                        knownLemmas: [],
                        unknownLemmas: [],
                    });
                }
                const stat = out.taskStats.get(tid);
                stat.totalWords += 1;
                if (isKnown) {
                    stat.knownWords += 1;
                    stat.knownLemmas.push(lemma);
                } else {
                    stat.unknownWords += 1;
                    stat.unknownLemmas.push(lemma);
                }
            });
        });
    } catch (e) {}
    return out;
}

function computeGlobalWordCoverageProgress() {
    try {
        const overlayStats = getTaskWordKnownOverlayStats();
        const total = overlayStats && overlayStats.totalKeyOccurrences ? overlayStats.totalKeyOccurrences : 0;
        const known = overlayStats && overlayStats.totalKnownOccurrences ? overlayStats.totalKnownOccurrences : 0;
        const unknown = overlayStats && overlayStats.totalUnknownOccurrences ? overlayStats.totalUnknownOccurrences : 0;
        const unclassified = Math.max(0, total - known - unknown);
        return { total, known, unknown, unclassified };
    } catch (e) {}
    return { total: 0, known: 0, unknown: 0, unclassified: 0 };
}

function computeTaskUnknownDotPositions(count, width, height) {
    const total = Math.max(0, Number(count) || 0);
    if (!total) return [];
    const dotSize = 8;
    const gapX = 4;
    const gapY = 3;
    const cellWidth = dotSize + gapX;
    const cellHeight = dotSize + gapY;
    const safeWidth = Math.max(dotSize, Math.floor(Number(width) || 0));
    const safeHeight = Math.max(dotSize, Math.floor(Number(height) || 0));
    const maxCols = Math.max(1, Math.floor((safeWidth + gapX) / cellWidth));
    const maxRows = Math.max(1, Math.floor((safeHeight + gapY) / cellHeight));
    let cols = Math.min(total, maxCols);
    let rows = Math.max(1, Math.ceil(total / cols));
    if (rows > maxRows) {
        rows = maxRows;
        cols = Math.max(1, Math.ceil(total / rows));
        cols = Math.min(cols, maxCols);
    }
    const totalWidth = cols * dotSize + Math.max(0, cols - 1) * gapX;
    const totalHeight = rows * dotSize + Math.max(0, rows - 1) * gapY;
    const startLeft = Math.max(0, Math.round((safeWidth - totalWidth) / 2));
    const startTop = Math.max(0, Math.round((safeHeight - totalHeight) / 2));
    const out = [];
    for (let i = 0; i < total; i += 1) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        out.push({
            left: startLeft + col * cellWidth,
            top: startTop + row * cellHeight,
        });
    }
    return out;
}

function rebuildTaskWordKnownDotOverlayState(cards, cardTaskIds, overlayStats) {
    const taskStates = new Map();
    cards.forEach(el => {
        const tid = cardTaskIds.get(el);
        if (!tid) return;
        const stat = overlayStats.taskStats.get(tid) || null;
        const knownLemmas = stat && Array.isArray(stat.knownLemmas)
            ? Array.from(new Set(stat.knownLemmas.map(x => String(x || '').trim().toLowerCase()).filter(Boolean))).sort()
            : [];
        const unknownLemmas = stat && Array.isArray(stat.unknownLemmas)
            ? Array.from(new Set(stat.unknownLemmas.map(x => String(x || '').trim().toLowerCase()).filter(Boolean))).sort()
            : [];
        const dotLemmas = Array.from(new Set(knownLemmas.concat(unknownLemmas)));
        const knownLemmaSet = new Set(knownLemmas);
        const positions = computeTaskUnknownDotPositions(dotLemmas.length, el.clientWidth, el.clientHeight);
        const slots = dotLemmas.map((lemma, index) => ({
            lemma,
            active: true,
            status: knownLemmaSet.has(lemma) ? 'known' : 'unknown',
            index,
        }));
        const slotIndexByLemma = new Map();
        slots.forEach((slot, index) => {
            slotIndexByLemma.set(slot.lemma, index);
        });
        taskStates.set(tid, {
            tid,
            width: el.clientWidth,
            height: el.clientHeight,
            positions,
            slots,
            slotIndexByLemma,
        });
    });
    const state = {
        taskStates,
        taskCount: cardTaskIds.size,
        version: 2,
    };
    window.__taskWordKnownDotOverlayState = state;
    return state;
}

function ensureTaskWordKnownDotOverlayState(cards, cardTaskIds, overlayStats) {
    try {
        const existing = window.__taskWordKnownDotOverlayState;
        const shouldRebuild = !existing
            || existing.version !== 2
            || existing.taskCount !== cardTaskIds.size;
        if (shouldRebuild) {
            return rebuildTaskWordKnownDotOverlayState(cards, cardTaskIds, overlayStats);
        }
        return existing;
    } catch (e) {}
    return rebuildTaskWordKnownDotOverlayState(cards, cardTaskIds, overlayStats);
}

function consumeTaskWordKnownDotOverlayMutation(dotState, pendingFlash) {
    const flashByTaskId = new Map();
    try {
        if (!dotState || !pendingFlash || !pendingFlash.taskIds || !(pendingFlash.taskIds instanceof Set)) return flashByTaskId;
        const targetStatus = String(pendingFlash.targetStatus || '');
        const lemma = String(pendingFlash.lemma || '').trim().toLowerCase();
        if (!lemma) return flashByTaskId;
        pendingFlash.taskIds.forEach(taskId => {
            const tid = String(taskId || '').trim();
            if (!tid) return;
            const taskState = dotState.taskStates instanceof Map ? dotState.taskStates.get(tid) : null;
            if (!taskState) return;
            const slotIndex = taskState.slotIndexByLemma instanceof Map ? taskState.slotIndexByLemma.get(lemma) : null;
            if (slotIndex == null || slotIndex < 0) return;
            const slot = taskState.slots && taskState.slots[slotIndex];
            if (!slot) return;
            if (targetStatus === 'known') {
                slot.active = true;
                slot.status = 'known';
                const pos = taskState.positions && taskState.positions[slotIndex] ? taskState.positions[slotIndex] : null;
                if (pos) flashByTaskId.set(tid, pos);
                return;
            }
            if (targetStatus === 'unknown') {
                slot.active = true;
                slot.status = 'unknown';
                return;
            }
        });
    } catch (e) {}
    return flashByTaskId;
}

function getWordKnownOverlayRatios(stat, hasAnyKnownKeyWord) {
    const safeStat = stat || {
        totalWords: 0,
        knownWords: 0,
        unknownWords: 0,
        unclassifiedWords: 0,
    };
    const total = safeStat.totalWords || 0;
    const known = safeStat.knownWords || 0;
    const unknown = safeStat.unknownWords || 0;
    const unclassified = safeStat.unclassifiedWords || 0;
    return {
        known: total > 0 ? (known / total) : (hasAnyKnownKeyWord ? 1 : 0),
        unknown: total > 0 ? (unknown / total) : 0,
        unclassified: total > 0 ? (unclassified / total) : (hasAnyKnownKeyWord ? 0 : 1),
    };
}

function getWordKnownOverlaySpans(ratios) {
    const r = ratios || { known: 0, unknown: 0, unclassified: 0 };
    const knownStart = 0;
    const knownEnd = Math.max(0, Math.min(1, r.known || 0));
    const unknownStart = knownEnd;
    const unknownEnd = Math.max(unknownStart, Math.min(1, unknownStart + (r.unknown || 0)));
    const unclassifiedStart = unknownEnd;
    const unclassifiedEnd = Math.max(unclassifiedStart, Math.min(1, unclassifiedStart + (r.unclassified || 0)));
    return {
        known: { start: knownStart, end: knownEnd },
        unknown: { start: unknownStart, end: unknownEnd },
        unclassified: { start: unclassifiedStart, end: unclassifiedEnd },
    };
}

function subtractOverlaySpan(nextSpan, prevSpan) {
    const out = [];
    if (!nextSpan || !(nextSpan.end > nextSpan.start)) return out;
    const prev = prevSpan && prevSpan.end > prevSpan.start ? prevSpan : { start: 0, end: 0 };
    if (nextSpan.end <= prev.start || nextSpan.start >= prev.end) {
        out.push({ start: nextSpan.start, end: nextSpan.end });
        return out;
    }
    if (nextSpan.start < prev.start) {
        out.push({ start: nextSpan.start, end: Math.min(nextSpan.end, prev.start) });
    }
    if (nextSpan.end > prev.end) {
        out.push({ start: Math.max(nextSpan.start, prev.end), end: nextSpan.end });
    }
    return out.filter(seg => seg.end - seg.start > 0.0001);
}

const WORD_KNOWN_EXPLOSION_FRAME_COUNT = 18;
const WORD_KNOWN_EXPLOSION_FRAME_MS = 42;
const WORD_KNOWN_EXPLOSION_RENDER_SIZE = 16;
let __wordKnownExplosionFrameUrls = null;

function getWordKnownExplosionFrameUrls() {
    if (Array.isArray(__wordKnownExplosionFrameUrls) && __wordKnownExplosionFrameUrls.length === WORD_KNOWN_EXPLOSION_FRAME_COUNT) {
        return __wordKnownExplosionFrameUrls;
    }
    __wordKnownExplosionFrameUrls = [];
    for (let i = 1; i <= WORD_KNOWN_EXPLOSION_FRAME_COUNT; i += 1) {
        __wordKnownExplosionFrameUrls.push(`${STATIC_BASE}/images/FireBlastTrimmed/Fire_Blast_${i}.png`);
    }
    return __wordKnownExplosionFrameUrls;
}

function appendWordKnownOverlayFlash(hostEl, overlayEl, prevStat, nextStat, prevHasAnyKnownKeyWord, nextHasAnyKnownKeyWord, flashPos) {
    try {
        if (!shouldPlayWordKnownExplosionAudio()) return;
        if (!overlayEl || !hostEl) return;
        const prevRatios = getWordKnownOverlayRatios(prevStat, prevHasAnyKnownKeyWord);
        const nextRatios = getWordKnownOverlayRatios(nextStat, nextHasAnyKnownKeyWord);
        const changed =
            Math.abs((prevRatios.known || 0) - (nextRatios.known || 0)) > 0.0001 ||
            Math.abs((prevRatios.unknown || 0) - (nextRatios.unknown || 0)) > 0.0001 ||
            Math.abs((prevRatios.unclassified || 0) - (nextRatios.unclassified || 0)) > 0.0001;
        if (!changed) return;
        overlayEl.classList.remove('word-known-overlay-shake');
        void overlayEl.offsetWidth;
        overlayEl.classList.add('word-known-overlay-shake');
        const explosion = document.createElement('img');
        const frameUrls = getWordKnownExplosionFrameUrls();
        let rafId = 0;
        explosion.className = 'word-known-overlay-explosion';
        explosion.alt = '';
        explosion.decoding = 'async';
        explosion.loading = 'eager';
        explosion.style.width = `${WORD_KNOWN_EXPLOSION_RENDER_SIZE}px`;
        explosion.style.height = `${WORD_KNOWN_EXPLOSION_RENDER_SIZE}px`;
        if (frameUrls.length) {
            explosion.src = frameUrls[0];
        }
        const hostRect = hostEl.getBoundingClientRect ? hostEl.getBoundingClientRect() : null;
        if (hostRect) {
            const flashLeft = flashPos && Number.isFinite(flashPos.left) ? flashPos.left + 2 : (hostRect.width / 2);
            const flashTop = flashPos && Number.isFinite(flashPos.top) ? flashPos.top + 2 : (hostRect.height / 2);
            explosion.style.left = `${hostRect.left + flashLeft}px`;
            explosion.style.top = `${hostRect.top + flashTop}px`;
        }
        (document.body || document.documentElement || overlayEl).appendChild(explosion);
        if (frameUrls.length > 1) {
            let frameIndex = 0;
            let startAt = 0;
            const tick = (now) => {
                if (!explosion.isConnected) return;
                if (!startAt) startAt = now;
                const elapsed = now - startAt;
                const nextFrameIndex = Math.min(frameUrls.length - 1, Math.floor(elapsed / WORD_KNOWN_EXPLOSION_FRAME_MS));
                if (nextFrameIndex !== frameIndex) {
                    frameIndex = nextFrameIndex;
                    explosion.src = frameUrls[frameIndex];
                }
                if (frameIndex < frameUrls.length - 1) {
                    rafId = window.requestAnimationFrame(tick);
                }
            };
            rafId = window.requestAnimationFrame(tick);
        }
        setTimeout(() => {
            try {
                if (rafId) window.cancelAnimationFrame(rafId);
                explosion.remove();
            } catch (err) {}
        }, 1050);
        setTimeout(() => {
            try {
                overlayEl.classList.remove('word-known-overlay-shake');
            } catch (err) {}
        }, 550);
    } catch (e) {}
}

function applyTaskWordKnownOverlays() {
    try {
        removeTaskWordKnownOverlays();
        if (!g_dictAll || !g_dictAll.entries) return;

        const cards = Array.from(document.querySelectorAll('.question-item[data-task-id]'));
        if (!cards.length) return;

        const taskIdSet = new Set();
        const cardTaskIds = new Map();
        cards.forEach(el => {
            if (el.getAttribute('data-is-borrowed') === 'true') return;
            const tid = String(el.getAttribute('data-task-id') || '').trim();
            if (!tid) return;
            taskIdSet.add(tid);
            cardTaskIds.set(el, tid);
        });

        const overlayStats = getTaskWordKnownOverlayStats();
        const pendingFlash = window.__pendingWordKnownOverlayFlash || null;
        const pendingTaskIds = pendingFlash && pendingFlash.taskIds instanceof Set ? pendingFlash.taskIds : null;
        const dotState = ensureTaskWordKnownDotOverlayState(cards, cardTaskIds, overlayStats);
        const flashByTaskId = consumeTaskWordKnownDotOverlayMutation(dotState, pendingFlash);
        const selectedLemma = getCurrentSelectedWordLemma();

        cardTaskIds.forEach((tid, el) => {
            if (!taskIdSet.has(tid)) return;
            const stat = overlayStats.taskStats.get(tid) || {
                totalWords: 0,
                knownWords: 0,
                unknownWords: 0,
                unclassifiedWords: 0,
                unknownLemmas: [],
            };
            const total = stat.totalWords;
            const known = stat.knownWords;
            const unknown = stat.unknownWords;
            const ov = document.createElement('div');
            ov.className = 'word-known-overlay';
            const taskDotState = dotState && dotState.taskStates instanceof Map ? dotState.taskStates.get(tid) : null;
            if (taskDotState && Array.isArray(taskDotState.slots) && Array.isArray(taskDotState.positions)) {
                taskDotState.slots.forEach((slot, index) => {
                    if (!slot || !slot.active) return;
                    const pos = taskDotState.positions[index];
                    if (!pos) return;
                    const dot = document.createElement('div');
                    dot.className = 'word-known-dot';
                    if (slot.status === 'known') {
                        dot.classList.add('word-known-dot-known');
                    }
                    if (selectedLemma && String(slot.lemma || '').trim().toLowerCase() === selectedLemma) {
                        dot.classList.add('word-known-dot-selected');
                    }
                    dot.style.left = `${pos.left}px`;
                    dot.style.top = `${pos.top}px`;
                    ov.appendChild(dot);
                });
            }

            try {
                ov.title = total > 0
                    ? `重点词：熟词 ${known} / 生词 ${unknown}`
                    : (overlayStats.hasAnyKnownKeyWord ? '重点词：当前页已开始标注熟词，当前题按全熟显示' : '重点词：暂无可统计词条，当前题按全生词显示');
            } catch (e) {}
            try {
                if (!el.hasAttribute('data-word-known-prev-title')) {
                    el.setAttribute('data-word-known-prev-title', el.getAttribute('title') || '');
                }
                el.setAttribute('title', `${known}/${total}词`);
            } catch (e) {}
            try {
                const cs = window.getComputedStyle ? getComputedStyle(el) : null;
                if (cs && cs.position === 'static') el.style.position = 'relative';
            } catch (e) {}
            try {
                if (pendingFlash && pendingTaskIds && pendingTaskIds.has(tid)) {
                    const prevStats = pendingFlash.prevStats || {};
                    const prevTaskStats = prevStats.taskStats instanceof Map ? prevStats.taskStats.get(tid) : null;
                    appendWordKnownOverlayFlash(
                        el,
                        ov,
                        prevTaskStats,
                        stat,
                        !!(prevStats && prevStats.hasAnyKnownKeyWord),
                        !!overlayStats.hasAnyKnownKeyWord,
                        flashByTaskId.get(tid) || null
                    );
                }
            } catch (e) {}
            el.appendChild(ov);
        });
        try {
            window.__pendingWordKnownOverlayFlash = null;
        } catch (e) {}
    } catch (e) {}
}

(function () {
    try {
        window.applyTaskWordKnownOverlays = applyTaskWordKnownOverlays;
        window.removeTaskWordKnownOverlays = removeTaskWordKnownOverlays;
    } catch (e) {}
})();

function getGlobalWordProgressWords() {
    try {
        const entries = g_dictAll && g_dictAll.entries ? g_dictAll.entries : null;
        if (!entries) return [];
        const dictSize = Object.keys(entries).length;
        if (Array.isArray(window.__globalWordProgressWords) && window.__globalWordProgressWordsDictSize === dictSize) {
            return window.__globalWordProgressWords;
        }
        const isEntryInExam = (entry) => {
            try {
                const t = String(entry && entry.type ? entry.type : '').toLowerCase();
                if (!t) return true;
                if (t.startsWith('not')) return false;
                if (EXAM_TYPE === 'kaoyan') return t.includes('kaoyan');
                if (EXAM_TYPE === 'cet6') return t.includes('6');
                return t.includes('4');
            } catch (e) {}
            return true;
        };
        const out = [];
        Object.keys(entries).forEach(k => {
            const lemma = String(k || '').trim().toLowerCase();
            if (!lemma) return;
            const entry = entries[lemma];
            if (!isEntryInExam(entry)) return;
            const tIds = entry && Array.isArray(entry.task_ids) ? entry.task_ids : [];
            const sIds = entry && Array.isArray(entry.sentence_ids) ? entry.sentence_ids : [];
            if (!tIds.length && !sIds.length) return;
            out.push(lemma);
        });
        window.__globalWordProgressWords = out;
        window.__globalWordProgressWordsDictSize = dictSize;
        return out;
    } catch (e) {
        return [];
    }
}

window.updateWordProgressUI = function() {
    try {
        const globalEl = document.getElementById('globalWordProgressBar');
        if (globalEl) {
            const prog = computeGlobalWordCoverageProgress();
            renderProgressBar(globalEl, prog);
            const pctEl = document.getElementById('globalWordProgressPercent');
            const fracEl = document.getElementById('globalWordProgressFraction');
            if (pctEl) {
                const total = prog && prog.total ? prog.total : 0;
                const known = prog && prog.known ? prog.known : 0;
                const pct = total ? Math.round((known / total) * 100) : 0;
                pctEl.textContent = `${pct}%`;
                if (fracEl) {
                    const btn = ensureGlobalProgressActionBtn('globalWordProgressViewBtn');
                    btn.textContent = window.__showTaskWordKnownOverlays ? '隐藏生词' : '显示生词';
                    btn.onclick = async (e) => {
                        try {
                            e.preventDefault();
                            e.stopPropagation();
                        } catch (err) {}
                        const next = !window.__showTaskWordKnownOverlays;
                        if (next) enforceOverlayMutex('wordKnown');
                        setTaskWordKnownOverlayEnabled(next);
                        if (!next) {
                            try {
                                if (typeof window.updateWordProgressUI === 'function') window.updateWordProgressUI();
                            } catch (err) {}
                            return;
                        }
                        try {
                            const needLoad = typeof window.fetchUserVocabProgress === 'function' && !window.isVocabLoaded;
                            if (needLoad) await window.fetchUserVocabProgress();
                        } catch (err) {}
                        try {
                            await ensurePaperListExpandedForWordKnownOverlays();
                        } catch (err) {}
                        applyTaskWordKnownOverlays();
                        try {
                            if (typeof window.updateWordProgressUI === 'function') window.updateWordProgressUI();
                        } catch (err) {}
                    };
                    fracEl.textContent = '';
                    fracEl.appendChild(btn);
                }
            }
        }

        document.querySelectorAll('.knowledge-progress[data-kid]').forEach(el => {
            const kid = el.getAttribute('data-kid');
            const kidKey = String(kid);
            const node = findKnowledgeNodeById(kid);
            const words = (g_kpWordCounts && Array.isArray(g_kpWordCounts[kidKey]))
                ? g_kpWordCounts[kidKey].map(p => (p && p.length ? p[0] : p))
                : (node && node.cachedWords ? node.cachedWords : []);
            const prog = computeWordProgress(words);
            renderProgressBar(el, prog);
            const right = el.closest('.knowledge-right');
            const prefixEl = right ? right.querySelector('.knowledge-known-prefix') : null;
            if (prefixEl) {
                const known = prog && prog.known ? prog.known : 0;
                prefixEl.textContent = `${known}/`;
            }
        });
    } catch (e) {}
};

window.markAllWordsKnown = function() {
    const words = uniqueWords(window.currentWordStatsWords || []);
    if (!words.length) return;
    fetch(buildVocabApiUrl('/vocab/mark_known_batch'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildVocabPayload({ words }))
    })
    .then(res => res.json())
    .then(data => {
        if (!data || !data.success) return;
        if (!window.userKnownSet) window.userKnownSet = new Set();
        if (!window.userVocabSet) window.userVocabSet = new Set();
        words.forEach(w => {
            window.userKnownSet.add(w);
            window.userVocabSet.delete(w);
        });
        if (typeof window.updateWordStatsHighlights === 'function') window.updateWordStatsHighlights();
        if (typeof window.updateWordProgressUI === 'function') window.updateWordProgressUI();
        if (typeof window.fetchUserVocabProgress === 'function') window.fetchUserVocabProgress();
    })
    .catch(() => {});
};

function setDisplayMode(mode) {
    localStorage.setItem('displayMode', mode);
    
    // Toggle night-mode class on modal (for modal UI elements)
    const modal = document.getElementById('task-modal');
    if (modal) {
        modal.classList.toggle('night-mode', mode === 'night');
        modal.classList.toggle('eye-mode', mode === 'eye');
    }
    
    // Set modal background color for Eye Protection
    const modalContent = document.querySelector('#task-modal .modal-content');
    if (modalContent) {
        // Reset background first
        modalContent.style.backgroundColor = '';
        if (mode === 'eye') {
            modalContent.style.backgroundColor = '#C7EDCC';
        }
    }
    
    // Update radio buttons UI
    const displaySelect = document.getElementById('displayModeSelect');
    if (displaySelect) {
        displaySelect.value = mode;
    }

    // Send message to iframe
    const iframe = document.querySelector('#task-modal iframe');
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
            type: 'setDisplayMode',
            mode: mode
        }, '*');
    }
}

let taskTimerSeconds = 0;
let taskTimerInterval = null;
let taskTimerRunning = false;

function formatTaskTimer(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function updateTaskTimerDisplay() {
    const el = document.getElementById('taskTimerDisplay');
    if (el) el.textContent = formatTaskTimer(taskTimerSeconds);
}

function setTaskTimerRunning(running) {
    taskTimerRunning = running;
    const btn = document.getElementById('taskTimerToggle');
    if (btn) btn.classList.toggle('is-running', running);
}

function startTaskTimer() {
    if (taskTimerInterval) return;
    taskTimerInterval = setInterval(() => {
        taskTimerSeconds += 1;
        updateTaskTimerDisplay();
    }, 1000);
    setTaskTimerRunning(true);
}

function pauseTaskTimer() {
    if (taskTimerInterval) {
        clearInterval(taskTimerInterval);
        taskTimerInterval = null;
    }
    setTaskTimerRunning(false);
}

function toggleTaskTimer() {
    if (taskTimerRunning) {
        pauseTaskTimer();
    } else {
        startTaskTimer();
    }
}

function resetTaskTimer() {
    pauseTaskTimer();
    taskTimerSeconds = 0;
    updateTaskTimerDisplay();
}

// Initialize display mode on load
document.addEventListener('DOMContentLoaded', function () {
    const mode = localStorage.getItem('displayMode') || 'normal';
    // Sync UI if radios exist
    const radios = document.querySelectorAll('input[name="displayMode"]');
    if (radios.length > 0) {
        let found = false;
        radios.forEach(r => {
            if (r.value === mode) {
                r.checked = true;
                found = true;
            }
        });
        if (!found && radios[0]) radios[0].checked = true;
    }
    
    // Apply mode (might need to wait for modal open, but setDisplayMode handles null checks)
    setDisplayMode(mode);
    const toggleBtn = document.getElementById('taskTimerToggle');
    const resetBtn = document.getElementById('taskTimerReset');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleTaskTimer);
    if (resetBtn) resetBtn.addEventListener('click', resetTaskTimer);
    updateTaskTimerDisplay();
});
async function toggleNode(btn, id, level) {
    const header = btn.closest('.knowledge-header');
    const container = header.nextElementSibling;
    const isHidden = container.classList.contains('hidden');

        if (isHidden) {
        // Expanding
        container.classList.remove('hidden');
            btn.classList.add('expanded');

        // Lazy load if needed
        if (container.getAttribute('data-loaded') === 'false') {
            // Find node data
            const node = findNodeById(g_knowledgePoints, id);
            if (node && node.children) {
                container.innerHTML = '<div style="padding-left: 2em; color: #999;">Loading...</div>';
                await renderTreeLevel(container, node.children, level + 1);
                container.setAttribute('data-loaded', 'true');
                if (typeof window.updateWordProgressUI === 'function') window.updateWordProgressUI();
            }
        }
        } else {
        // Collapsing
        container.classList.add('hidden');
            btn.classList.remove('expanded');
    }
}

function findNodeById(nodes, id) {
    for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
            const found = findNodeById(node.children, id);
            if (found) return found;
        }
    }
    return null;
}

async function renderTreeLevel(container, nodes, level) {
    if (!nodes || nodes.length === 0) {
        if (container.innerHTML.includes('Loading...')) container.innerHTML = '';
        return;
    }

    // Clear loading text if present
    if (container.innerHTML.includes('Loading...')) container.innerHTML = '';

    // const counts = await Promise.all(nodes.map(n => fetchTaskCountForKid(n.id)));

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const count = node.cachedTasks ? node.cachedTasks.length : 0;
        const kidKey = String(node.id);
        const wordCount = (g_kpWordCounts && Array.isArray(g_kpWordCounts[kidKey]))
            ? g_kpWordCounts[kidKey].length
            : (node.cachedWordCount || 0);
        const hasChildren = node.children && node.children.length > 0;

        if (count === 0) continue;

        const itemDiv = document.createElement('div');
        itemDiv.className = `knowledge-item level-${level}`;

        // Level 1: Open by default
        // Level 2: Collapsed by default (children hidden)
        const shouldExpand = level === 1;

        // Icon
        let iconHtml;
        if (level === 1) {
            iconHtml = ``;
        } else if (hasChildren) {
            iconHtml = `<span class="tree-toggle${shouldExpand ? ' expanded' : ''}" onclick="event.stopPropagation(); toggleNode(this, ${node.id}, ${level})"></span>`;
        } else {
            iconHtml = ``;
            // iconHtml = `<span class="tree-toggle empty"></span>`;
        }

        // Children Container
        let childrenHtml = '';
        if (hasChildren) {
            // If expanded, we render children immediately?
            // If collapsed, we defer (lazy load) or render hidden.
            // To support "Level 2 default collapsed", we can set hidden.
            // If Level 1 (expanded), we render Level 2.
            // If Level 2 (collapsed), we mark as not loaded to save requests?
            // Or just render hidden if not too many. 
            // Let's lazy load Level 3 (children of Level 2).
            const isLoaded = shouldExpand;
            childrenHtml = `<div class="knowledge-children ${shouldExpand ? '' : 'hidden'}" data-loaded="${isLoaded}"></div>`;
        }

        const indent = (level - 1) * 0.5;

        const actionHtml = level >= 1
            ? `<span class="knowledge-action">
                            <button class="knowledge-study-btn" tabindex="-1" onclick="event.stopPropagation(); ensureKnowledgeActive(${node.id}, '${escapeHTML(node.name)}'); openKnowledgeTasksWithAnimation(${node.id}, '${escapeHTML(node.name)}')">刷题</button>
                        </span>`
            : '';

        itemDiv.innerHTML = `
                    <div class="knowledge-header" data-knowledge-id="${node.id}" onclick="handleKnowledgeClick(${node.id}, '${escapeHTML(node.name)}')" style="padding-left: ${indent}em;">
                        ${iconHtml}
                        <span class="knowledge-name">${escapeHTML(node.name)}</span>
                        <span class="knowledge-right">
                            <span class="knowledge-count">${count}篇, <span class="knowledge-known-prefix" data-kid="${node.id}" style="">0/</span>${wordCount}词</span>
                            ${actionHtml}
                            <div class="knowledge-progress" data-kid="${node.id}"></div>
                        </span>
                    </div>
                    ${childrenHtml}
                `;

        container.appendChild(itemDiv);

        if (hasChildren && shouldExpand) {
            const childContainer = itemDiv.querySelector('.knowledge-children');
            // Recursively render
            await renderTreeLevel(childContainer, node.children, level + 1);
        }
    }
}

async function renderKnowledgeSidebar() {
    const container = document.getElementById('knowledgeTreeContent');
    if (!container) return;

    container.innerHTML = '<div style="padding:10px; color:#666;">Loading knowledge tree...</div>';

    const [kp, tasks] = await Promise.all([
        fetchKnowledgePoints(),
        fetchTaskIndex()
    ]);

    await loadStaticWordData();

    g_knowledgePoints = kp;
    g_allTasks = tasks || [];
    buildTaskIndexMap(tasks);

    // Calculate counts
    for (const root of g_knowledgePoints) {
        processNodeCounts(root);
    }

    container.innerHTML = `
                <div class="knowledge-tree-container"></div>
            `;

    // Ensure word stats container exists in main content (right column)
    let statsContainer = document.getElementById('wordStatsContainer');
    if (!statsContainer) {
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            statsContainer = document.createElement('div');
            statsContainer.id = 'wordStatsContainer';
            statsContainer.style.marginTop = '20px';
            statsContainer.style.padding = '10px';
            statsContainer.style.borderTop = '1px solid #eee';
            statsContainer.style.background = '#fff';
            statsContainer.style.fontSize = '1.2vw';
            // Append to main content (bottom)
            mainContent.appendChild(statsContainer);
        }
    }

    // Auto-render word stats for all tasks on page load
    renderWordStats(tasks);

    const wrap = container.querySelector('.knowledge-tree-container');
    await renderTreeLevel(wrap, g_knowledgePoints, 1);
    if (typeof window.updateWordProgressUI === 'function') window.updateWordProgressUI();
}
function cleanupHidden() {
    document.querySelectorAll('.question-item .mb-1, .question-item .question-overlay').forEach(function (node) {
        if (node && node.parentNode) node.parentNode.removeChild(node);
    });
}
function mapTitleToExamInfo(t) { 
    if (/^\d{4}\(\d+\)$/.test(t)) {
        return t;
    }
    // Return text as is if it matches format like '24-6(1)' or '24-12(2)'
    if (/^\d{2}-\d{1,2}\(\d\)$/.test(t)) {
        return t;
    }

    // Try original format: 2024年6月(1) -> 24-6(1)
    let m = t.match(/(\d{4})([上下])\((\d+)\)/); 
    if (m) {
        const y = m[1], h = m[2], n = m[3]; 
        const yy = String(parseInt(y, 10) % 100); 
        const mm = h === '下' ? '12' : '6'; 
        return `${yy}-${mm}(${n})`;
    }
    
    // Fallback: Try simple format parsing if needed, but prefer database format
    // Try simple format: 24-6(1) -> 24-6(1) (already handled by first check)
    m = t.match(/(\d{2})-(\d{1,2})\((\d+)\)/);
    if (m) {
        return `${m[1]}-${m[2]}(${m[3]})`;
    }

    return null; 
}
function formatExamTitle(examInfo) {
    if (!examInfo) return '';
    if (EXAM_TYPE === 'kaoyan') {
        const m2 = examInfo.match(/^(\d{4})\((\d+)\)$/);
        if (m2) return `${m2[1]}年考研英语第${m2[2]}套`;
        return examInfo;
    }
    const m = examInfo.match(/^(\d{2})-(\d{1,2})\((\d+)\)$/);
    if (!m) return examInfo;
    const year = 2000 + parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const setNo = parseInt(m[3], 10);
    const level = EXAM_TYPE === 'cet6' ? '六' : '四';
    return `${year}年${month}月${level}级第${setNo}套`;
}

function stripKaoyanPaperSuffix(text) {
    return String(text || '')
        .trim()
        .replace(/\(([12])\)(?=_|$)/g, '')
        .replace(/__+/g, '_');
}

function getWordModeSourceLabel(orderSeq, forceOption = false) {
    if (forceOption) return '选项';
    const order = String(orderSeq || '').trim().toLowerCase();
    if (order.includes('stem')) return '题干';
    if (order.includes('content')) return '正文';
    if (order.includes('task')) return '正文';
    if (order.includes('question')) return '选项';
    return '';
}

function setModalTitle(text) {
    const modal = document.getElementById('task-modal');
    if (!modal) return;
    const title = modal.querySelector('.modal-title');
    if (title) {
        title.textContent = text || '';
    }
    const note = document.getElementById('modalTitleNote');
    if (note) {
        const show = typeof text === 'string' && text.trim().endsWith('第3套');
        note.style.display = show ? 'inline' : 'none';
    }
}

function setModalTitleScore(score) {
    const modal = document.getElementById('task-modal');
    if (!modal) return;
    const paperKey = String(modal.dataset.examInfo || '').trim();
    const inPaperMode = !!paperKey && modal.dataset.knowledgeMode !== '1';
    const title = modal.querySelector('.modal-title');
    if (!title) return;
    const host = title.parentElement || title;
    let el = document.getElementById('modalTitleScore');
    if (!el) {
        el = document.createElement('span');
        el.id = 'modalTitleScore';
        el.style.color = '#9e9605a9';
        el.style.fontSize = '1em';
        el.style.fontWeight = '600';
        el.style.marginLeft = '10px';
        el.style.display = 'none';
        el.style.cursor = 'pointer';
        el.addEventListener('click', async (e) => {
            try {
                e.preventDefault();
                e.stopPropagation();
            } catch (err) {}
            const taskModal = document.getElementById('task-modal');
            const paperKey = taskModal ? String(taskModal.dataset.examInfo || '').trim() : '';
            if (!paperKey) return;
            const data = window.__paperGradeCache && window.__paperGradeCache[paperKey]
                ? window.__paperGradeCache[paperKey]
                : await fetchPaperGrade(paperKey);
            if (!data || data.total == null) return;
            renderGradeResult({ total: data.total, details: data.details || {} });
        });
        host.appendChild(el);
    }
    const n = Number(score);
    if (!inPaperMode || !Number.isFinite(n) || n <= 0) {
        el.textContent = '';
        el.style.display = 'none';
        return;
    }
    el.textContent = `得分：${Math.round(n)}`;
    el.style.display = 'inline';
}

async function fetchPaperGrade(paperKey) {
    const k = String(paperKey || '').trim();
    if (!k) return null;
    try {
        const r = await fetch(`${API_BASE}/paper_grade?paper_key=${encodeURIComponent(k)}`);
        const j = await r.json();
        if (j && j.success && j.data && j.data.total != null) {
            window.__paperGradeCache = window.__paperGradeCache || {};
            window.__paperGradeCache[k] = j.data;
            return j.data;
        }
    } catch (e) {}
    return null;
}

async function savePaperGrade(paperKey, scoreData) {
    const k = String(paperKey || '').trim();
    if (!k || !scoreData) return;
    try {
        await fetch(`${API_BASE}/paper_grade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                paper_key: k,
                total: scoreData.total,
                details: scoreData.details
            })
        });
        window.__paperGradeCache = window.__paperGradeCache || {};
        window.__paperGradeCache[k] = { paper_key: k, total: scoreData.total, details: scoreData.details };
        try {
            const sw = document.getElementById('showMyRecordsSwitch');
            if (sw && sw.checked && typeof applyRecordOverlays === 'function') applyRecordOverlays();
        } catch (e) {}
    } catch (e) {}
}
function isThirdSet(exam) { const m = exam.match(/^\d{2}-\d{1,2}-(\d)$/); return m && m[1] === '3'; }
function hasPartII(arr) { return arr.some(t => t.part === 'Part II'); }
function sameYearMonth(exam) { const m = exam.match(/^(\d{2}-\d{1,2})-\d$/); return m ? m[1] : null; }
async function getTasks(exam) {
    const r = await fetch(`${API_BASE}/tasks?exam_info=${encodeURIComponent(exam)}&exam_type=${EXAM_TYPE}`);
    const j = await r.json();
    let arr = j.tasks || [];
    const orderMap = { 'Part I': 1, 'Part II': 2, 'Part III': 3, 'Part IV': 4 };
    arr.sort((a, b) => {
        const oa = (orderMap[a.part] || 99), ob = (orderMap[b.part] || 99);
        if (oa !== ob) return oa - ob;
        const sa = String(a.section || ''), sb = String(b.section || '');
        const sc = sa.localeCompare(sb);
        if (sc !== 0) return sc;
        return (a.id || 0) - (b.id || 0);
    });
    return arr;
}
/* Removed duplicate replaceThumbs logic */
cleanupHidden();
renderKnowledgeSidebar();

/* Removed duplicate handleKnowledgeClick */

async function showKnowledgeTasks(kid, kname) {
    const modal = document.getElementById('task-modal');
    const list = document.getElementById('modal-task-list');

    // Hide practice button for knowledge mode
    const practiceBtn = document.getElementById('practiceModeBtn');
    if (practiceBtn) practiceBtn.style.display = 'none';
    const gradeBtn = document.getElementById('gradePaperBtn');
    if (gradeBtn) gradeBtn.style.display = 'none';

    setModalTitle(`${kname}`);
    list.innerHTML = '<div>Loading...</div>';
    modal.style.display = 'flex';

    try {
        const r = await fetch(`${API_BASE}/tasks?kid=${encodeURIComponent(kid)}&exam_type=${EXAM_TYPE}`);
        const j = await r.json();
        const tasks = j.tasks || [];

        if (tasks.length === 0) {
            list.innerHTML = '<div>No tasks found for this knowledge point.</div>';
            return;
        }

        tasks.sort((a, b) => {
            const infoA = a.exam_info || '';
            const infoB = b.exam_info || '';
            if (!infoA) return 1;
            if (!infoB) return -1;

            // Helper to parse exam info into comparable parts
            function parseExamInfo(s) {
                let y = 0, m = 0, set = 0;
                
                // Try "YY-MM(N)" first
                let match = s.match(/^(\d+)-(\d+)[(（](\d+)[)）]$/);
                if (match) {
                    y = parseInt(match[1]);
                    if (y < 100) y += 2000;
                    m = parseInt(match[2]);
                    set = parseInt(match[3]);
                    return { y, m, set };
                }

                // Try "YYYY年MM月第N套"
                match = s.match(/^(\d+)年(\d+)月第(\d+)套$/);
                if (match) {
                    y = parseInt(match[1]);
                    m = parseInt(match[2]);
                    set = parseInt(match[3]);
                    return { y, m, set };
                }

                return { y: 0, m: 0, set: 0 };
            }

            const pA = parseExamInfo(infoA);
            const pB = parseExamInfo(infoB);

            // If parsing succeeded for both
            if (pA.y > 0 && pB.y > 0) {
                if (pA.y !== pB.y) return pB.y - pA.y; // Year DESC
                if (pA.m !== pB.m) return pB.m - pA.m; // Month DESC
                return pA.set - pB.set;                // Set ASC
            }

            // Fallback to simple string comparison if format unknown
            return infoB.localeCompare(infoA, undefined, { numeric: true, sensitivity: 'base' });
        });

        list.innerHTML = tasks.map(t => {
            let content = '';
            let trans = '';
            let transLabel = 'Translation';

            try {
                const c = typeof t.content_json === 'string' ? JSON.parse(t.content_json) : t.content_json;

                if (t.part === 'Part I') {
                    content = c.reference_essay || c.question || 'No text content';
                    trans = c.translation || c.reference_translation || '';
                }
                else if (t.part === 'Part II') {
                    content = c.listening_script || 'Audio script not available';
                    trans = c.translation || '';
                }
                else if (t.part === 'Part III') {
                    content = c.article || 'Article content not available';
                    trans = c.translation || '';
                }
                else if (t.part === 'Part IV') {
                    content = c.reference_translation || 'No text content';
                    trans = c.question || '';
                    transLabel = 'Original Text (Chinese)';
                }
                else {
                    content = JSON.stringify(c);
                }
            } catch (e) { content = 'Error parsing content'; }

            return `
                    <div class="task-item">
                        <div class="task-meta">
                            <strong>${t.exam_info || 'Unknown Exam'}</strong> | 
                            ${t.part} - ${t.section || 'N/A'} | 
                            ID: ${t.id}
                        </div>
                        <div class="task-content">${escapeHTML(content)}</div>
                        ${trans ? `<div class="task-translation" style="margin-top:12px; padding-top:12px; border-top:1px dashed #eee; color:#555;">
                            <div style="font-size:12px; font-weight:bold; margin-bottom:4px; color:#888;">${transLabel}:</div>
                            <div style="font-size:14px; line-height:1.6;">${escapeHTML(trans)}</div>
                        </div>` : ''}
                    </div>`;
        }).join('');

    } catch (e) {
        console.error(e);
        list.innerHTML = '<div style="color:red">Error loading tasks.</div>';
    }
}

function toggleViewMode(text, passedExamInfo) {
    const modal = document.getElementById('task-modal');
    const btn = document.getElementById('practiceModeBtn');
    const filterContainer = document.getElementById('knowledgeFilterContainer');
    const taskTimer = document.getElementById('taskTimer');
    const displayModeContainer = document.getElementById('displayModeContainer');
    
    // Use passed examInfo if available, otherwise fallback to dataset
    let examInfo = passedExamInfo || modal.dataset.examInfo;

    // If passedExamInfo is provided, we are likely initializing from showPaperDetail
    if (passedExamInfo) {
        delete modal.dataset.kid;
        delete modal.dataset.questionId;
        modal.dataset.knowledgeMode = '';
        modal.dataset.examInfo = passedExamInfo;
        setModalTitle(text || formatExamTitle(passedExamInfo));
        setModalTitleScore(null);
        fetchPaperGrade(passedExamInfo).then(d => {
            if (d && d.total != null) setModalTitleScore(d.total);
        });
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        modal.dataset.currentMode = 'browse';
    } else {
        examInfo = modal.dataset.examInfo;
    }

    if (!examInfo) {
        alert('无法获取试卷信息，请重试');
        return;
    }

    const modalBody = document.getElementById('modal-task-list');
    const currentMode = modal.dataset.currentMode || 'browse';
    const gradeBtn = document.getElementById('gradePaperBtn');
    const eyeProtectionContainer = document.querySelector('.form-check.form-switch');

    // Get current display mode
    const displayMode = localStorage.getItem('displayMode') || 'normal';

    if (currentMode === 'browse') {
        // Switch to Practice Mode
        modal.dataset.currentMode = 'practice';
        modal.dataset.knowledgeMode = '';
        btn.textContent = '切换到浏览模式';
        if (gradeBtn) gradeBtn.style.display = 'block';
        if (filterContainer) filterContainer.style.display = 'none';
        if (taskTimer) taskTimer.style.display = 'flex';
        if (displayModeContainer) displayModeContainer.style.display = 'flex';
        
        // Show eye protection checkbox in Practice Mode
        if (eyeProtectionContainer) eyeProtectionContainer.style.display = 'block';
        
        modalBody.innerHTML = `<iframe src="static/tasks.html?exam=${encodeURIComponent(examInfo)}&exam_type=${EXAM_TYPE}" style="width:100%; height:100%; border:none;"></iframe>`;

        const iframe = modalBody.querySelector('iframe');
        if (iframe) {
            iframe.addEventListener('load', function () {
                this.contentWindow.postMessage({
                    type: 'setDisplayMode',
                    mode: displayMode
                }, '*');
            });
        }

        try {
            const prefs = JSON.parse(localStorage.getItem('user_preferences') || '{}');
            prefs.paper_view_mode = 'practice';
            localStorage.setItem('user_preferences', JSON.stringify(prefs));
        } catch (e) { console.error('Failed to save pref', e); }
    } else {
        if (modal.dataset.membershipApprovedBrowse !== '1') {
            ensureCurrentPageMembershipAccess().then(allowed => {
                if (!allowed) return;
                modal.dataset.membershipApprovedBrowse = '1';
                // Re-enter in-place after membership approval; reusing passedExamInfo
                // would incorrectly trigger the initial "open paper" branch again.
                toggleViewMode(text);
            });
            return;
        }
        delete modal.dataset.membershipApprovedBrowse;
        // Switch back to Browse Mode (Fullpage / PDF)
        modal.dataset.currentMode = 'browse';
        modal.dataset.knowledgeMode = '';
        btn.textContent = '切换到刷题模式';
        if (gradeBtn) gradeBtn.style.display = 'none';
        if (filterContainer) filterContainer.style.display = 'none';
        if (taskTimer) taskTimer.style.display = 'none';
        if (displayModeContainer) displayModeContainer.style.display = 'none';
        
        // Hide eye protection checkbox in Browse Mode
        if (eyeProtectionContainer) eyeProtectionContainer.style.display = 'none';
        
        const pdfPath = getPaperPdfPath(examInfo);
        const ua = navigator.userAgent || '';
        const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isSafari = /Safari/.test(ua) && !/(Chrome|CriOS|FxiOS|EdgiOS|OPiOS)/.test(ua);

        if (isIOS && isSafari) {
            modalBody.innerHTML = `
                <div style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 12px; background-color: #525659;">
                    <div style="color: #fff; font-size: 14px;">iPad Safari 请使用新标签打开 PDF 以查看全部页面</div>
                    <a href="${pdfPath}" target="_blank" style="padding: 8px 16px; background: #fff; color: #206bc4; border-radius: 6px; text-decoration: none;">打开 PDF</a>
                </div>
            `;
        } else {
            modalBody.innerHTML = `
                <div style="width: 100%; height: 100%; display: flex; justify-content: center; background-color: #525659;">
                    <iframe 
                        src="${pdfPath}#page=1" 
                        style="width: 100%; height: 100%; border: none;"
                        loading="lazy"
                        frameborder="0"
                    ></iframe>
                </div>
            `;
        }

        try {
            const prefs = JSON.parse(localStorage.getItem('user_preferences') || '{}');
            prefs.paper_view_mode = 'browse';
            localStorage.setItem('user_preferences', JSON.stringify(prefs));
        } catch (e) { console.error('Failed to save pref', e); }
    }
}

// Renamed from switchToPracticeMode
// function switchToPracticeMode() { ... }

function openOriginalMode() {
    const modal = document.getElementById('task-modal');
    const examInfo = modal.dataset.examInfo;

    if (!examInfo) {
        alert('无法获取试卷信息，请重试');
        return;
    }

    const url = `static/fullpage.html?exam=${encodeURIComponent(examInfo)}&exam_type=${EXAM_TYPE}`;
    window.open(url, '_blank');
}

function closeModal() {
    const modal = document.getElementById('task-modal');
    modal.style.display = 'none';
    modal.classList.remove('fullscreen');
    modal.classList.remove('stats-modal-open');
    modal.classList.remove('sentence-modal-open');
    modal.classList.remove('word-popup-open');
    closeFullStatsOverlay();
    document.body.style.overflow = 'auto'; // Restore scrolling
    // Clean up iframe to stop audio/video
    const modalBody = document.getElementById('modal-task-list');
    const iframe = modalBody.querySelector('iframe');
    if (iframe && iframe.contentWindow && iframe.contentWindow.disableGlobalShowAnswers) {
        try {
            iframe.contentWindow.disableGlobalShowAnswers();
        } catch (e) {}
    }
    const gradeBtn = document.getElementById('gradePaperBtn');
    if (gradeBtn) gradeBtn.dataset.active = '';
    closeGradeModal();
    if (iframe) {
        modalBody.innerHTML = '';
    }
    resetTaskTimer();
}


function clearKnowledgeHighlight() {
    currentActiveKid = null;
    const headers = document.querySelectorAll('.knowledge-header');
    headers.forEach(h => h.classList.remove('active'));
    const cards = document.querySelectorAll('.question-item');
    cards.forEach(c => {
        c.classList.remove('highlighted');
        const ov = c.querySelector('.question-overlay');
        if (ov) ov.remove();
    });
}

// Paper Detail Modal Logic
async function showPaperDetail(header) {
    const titleEl = header.querySelector('h6');
    if (!titleEl) return;
    const rawExamInfo = String(header.getAttribute('data-paper-exam-info') || header.getAttribute('data-paper-name') || '').trim();
    const text = titleEl.textContent.trim();
    // Prefer the hidden raw exam_info stored on the element.
    const examInfo = mapTitleToExamInfo(rawExamInfo) || mapTitleToExamInfo(text);

    if (!examInfo) {
        console.error('Could not parse exam info from:', rawExamInfo || text);
        return;
    }
    
    const displayTitle = formatExamTitle(examInfo) || text;
    toggleViewMode(displayTitle, examInfo);
}

function renderPaperContent(tasks, title) {
    const modalBody = document.getElementById('modal-task-list');

    // Group tasks by Part
    const parts = {};
    tasks.forEach(t => {
        if (!parts[t.part]) parts[t.part] = [];
        parts[t.part].push(t);
    });

    let html = `<div class="paper-detail-content">
                <h1>${title}</h1>`;

    const partOrder = ['Part I', 'Part II', 'Part III', 'Part IV'];

    // Global question counter for the paper
    const qCounter = { val: 1 };

    partOrder.forEach(partName => {
        if (parts[partName] && parts[partName].length > 0) {
            html += `<div class="part-title">${partName}</div>`;

            let lastSection = null;
            let directionsPrintedForSection = false;

            parts[partName].forEach(task => {
                // Render Directions only once per section
                if (task.section !== lastSection) {
                    lastSection = task.section;
                    directionsPrintedForSection = false;
                }

                if (!directionsPrintedForSection && task.directions) {
                    html += `<div class="directions">${escapeHTML(task.directions)}</div>`;
                    directionsPrintedForSection = true;
                }

                html += renderTaskContent(task, qCounter);
            });
        }
    });

    html += `</div>`;
    modalBody.innerHTML = html;
}

function sanitizeRichTextHtml(rawHtml) {
    if (!rawHtml) return '';
    const template = document.createElement('template');
    template.innerHTML = String(rawHtml);
    const allowedTags = new Set(['EM', 'U', 'BR', 'P', 'STRONG']);

    function clean(node) {
        Array.from(node.childNodes).forEach(child => {
            if (child.nodeType === Node.ELEMENT_NODE) {
                const tag = (child.tagName || '').toUpperCase();
                if (!allowedTags.has(tag)) {
                    const fragment = document.createDocumentFragment();
                    while (child.firstChild) fragment.appendChild(child.firstChild);
                    child.replaceWith(fragment);
                    clean(node);
                    return;
                }
                Array.from(child.attributes || []).forEach(attr => child.removeAttribute(attr.name));
                clean(child);
                return;
            }
            if (child.nodeType !== Node.TEXT_NODE) {
                child.remove();
            }
        });
    }

    clean(template.content);
    return template.innerHTML;
}

function renderPlainTextHtml(text) {
    const value = escapeHTML(String(text || ''));
    if (!value) return '';
    const paragraphs = value.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
    if (!paragraphs.length) {
        return value.replace(/\n/g, '<br>');
    }
    return paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}

function renderRichBlockHtml(plainText, richHtml) {
    const safeHtml = sanitizeRichTextHtml(richHtml);
    if (safeHtml) {
        if (/<\s*p\b/i.test(safeHtml)) return safeHtml;
        return safeHtml.replace(/\n/g, '<br>');
    }
    return renderPlainTextHtml(plainText);
}

function renderRichParagraphs(paragraphs, fallbackText, fallbackHtml, className = 'passage-text') {
    if (Array.isArray(paragraphs) && paragraphs.length) {
        const blocks = paragraphs.map(paragraph => {
            const html = renderRichBlockHtml(paragraph && paragraph.text, paragraph && paragraph.html);
            if (!html) return '';
            if (/<\s*p\b/i.test(html)) return html;
            return `<p>${html}</p>`;
        }).filter(Boolean);
        if (blocks.length) {
            return `<div class="${className}">${blocks.join('')}</div>`;
        }
    }
    const fallback = renderRichBlockHtml(fallbackText, fallbackHtml);
    return fallback ? `<div class="${className}">${fallback}</div>` : '';
}

function renderRichInlineHtml(plainText, richHtml) {
    const safeHtml = sanitizeRichTextHtml(richHtml);
    if (safeHtml) return safeHtml.replace(/\n/g, '<br>');
    return escapeHTML(String(plainText || ''));
}

function renderTaskContent(task, qCounter = { val: 1 }) {
    let html = '';

    let c = task.content_json;
    if (typeof c === 'string') {
        try { c = JSON.parse(c); } catch (e) { }
    }

    if (!c) return html;

    if (task.part === 'Part I') { // Writing
        const questionHtml = renderRichBlockHtml(c.question, c.question_html || c.stem_html);
        if (questionHtml) html += `<div class="question">${questionHtml}</div>`;
        // REMOVED: reference_essay and translation for exam view
        // if (c.reference_essay) html += `<div class="reference-essay"><strong>Reference Essay:</strong><br>${escapeHTML(c.reference_essay).replace(/\n/g, '<br>')}</div>`;
        // if (c.translation) html += `<div class="translation-box"><strong>Translation:</strong><br>${escapeHTML(c.translation).replace(/\n/g, '<br>')}</div>`;
    } else if (task.part === 'Part II') { // Listening
        if (task.is_borrowed) {
            html += `<div class="context-text">(Listening content is the same as the 2nd set)</div>`;
        }

        if (c.context_text) {
            html += `<div class="context-text">${escapeHTML(c.context_text)}</div>`;
        }

        // REMOVED: listening_script for exam view
        // if (c.listening_script) {
        //      html += `<div class="listening-script" style="display:block;">${escapeHTML(c.listening_script).replace(/\n/g, '<br>')}</div>`;
        // }

        // Show questions and options for Listening
        if (c.questions && Array.isArray(c.questions)) {
            c.questions.forEach((q) => {
                html += `<div class="question">
                            <div class="question-number" style="margin-bottom: 5pt;"><strong>${q.id || qCounter.val++}.</strong></div>
                            <div class="options">
                                ${q.options ? q.options.map((opt, oid) => `<div class="option">${String.fromCharCode(65 + oid)}) ${escapeHTML(opt.replace(/^[A-Z][\.\)]\s*/, ''))}</div>`).join('') : ''}
                            </div>
                        </div>`;
            });
        }
    } else if (task.part === 'Part III') { // Reading
        html += renderRichParagraphs(c.paragraphs, c.article, c.article_html, 'passage-text');

        if (c.context_text) {
            html += `<div class="context-text">${escapeHTML(c.context_text)}</div>`;
        }

        // Section A: Banked Cloze
        const wordBank = c.word_bank || c.word_bank_details;
        if (wordBank && Array.isArray(wordBank)) {
            html += `<div class="word-bank"><table class="word-bank-table">`;
            // 3 rows of 5 words usually
            for (let i = 0; i < wordBank.length; i += 5) {
                html += `<tr>${wordBank.slice(i, i + 5).map(w => `<td>${escapeHTML(w)}</td>`).join('')}</tr>`;
            }
            html += `</table></div>`;
        }

        // Questions
        if (c.questions && Array.isArray(c.questions)) {
            // For Banked Cloze (Section A), questions usually don't have text, so we skip rendering them as a list
            // unless they have content.
            const hasQuestionText = c.questions.some(q => q.question || q.text || q.question_content);

            if (hasQuestionText) {
                // Check if it is a Matching task (Part III Section B)
                // Using stricter check for Part III Section B or "Matching" in title
                const isMatching = (task.part === 'Part III' && task.section === 'Sec B') ||
                    (task.full_section && task.full_section.includes('Matching'));

                if (isMatching) {
                    c.questions.forEach((q) => {
                        const questionText = renderRichInlineHtml(
                            q.question || q.text || q.question_content || '',
                            q.question_html || q.text_html || q.stem_html || ''
                        );
                        html += `<div class="matching-item">
                                    <strong>${q.id || qCounter.val++}.</strong> ${questionText}
                                </div>`;
                    });
                } else {
                    c.questions.forEach((q) => {
                        const questionText = renderRichInlineHtml(
                            q.question || q.text || q.question_content || '',
                            q.question_html || q.text_html || q.stem_html || ''
                        );
                        html += `<div class="question">
                                    <div style="margin-bottom: 5pt;"><strong>${q.id || qCounter.val++}.</strong> ${questionText}</div>
                                    <div class="options">
                                        ${q.options ? q.options.map((opt, oid) => `<div class="option">${String.fromCharCode(65 + oid)}) ${escapeHTML(opt.replace(/^[A-Z][\.\)]\s*/, ''))}</div>`).join('') : ''}
                                    </div>
                                </div>`;
                    });
                }
            } else {
                // For Banked Cloze, we still need to increment the counter if we skipped them
                // But wait, if we are using q.id, we don't strictly need to increment qCounter manually for skipped items
                // if we assume qCounter is only for when ID is missing.
                // However, if some items have ID and some don't (unlikely in same paper), it might be tricky.
                // For now, if we skip rendering, we assume the IDs in the JSON are sufficient for any future reference.
                // But if we use qCounter.val for *other* sections that rely on it, we might need to sync.
                // Fortunately, the qCounter is passed by reference.
                // If we skip rendering, we should probably update qCounter just in case subsequent sections depend on it?
                // Actually, Banked Cloze questions usually have IDs (26-35).
                // If we skip them, we just don't increment qCounter.
                // If the next section starts, it will use its own IDs or continue qCounter.
                // Let's just iterate and increment if needed, but not render?
                // No, let's keep it simple. If hasQuestionText is false, we assume it's Banked Cloze and the user reads from the text.
            }
        }
    } else if (task.part === 'Part IV') { // Translation
        const questionHtml = renderRichBlockHtml(c.question, c.question_html || c.original_html);
        if (questionHtml) html += `<div class="passage-text">${questionHtml}</div>`;
        // REMOVED: reference_translation
    }

    return html;
}



async function gradePaper() {
    const allowed = await ensureCurrentPageMembershipAccess();
    if (!allowed) return;
    const iframe = document.querySelector('#modal-task-list iframe');
    if (iframe && iframe.contentWindow && iframe.contentWindow.calculateScore) {
        const modal = document.getElementById('grade-modal');
        const body = document.getElementById('grade-modal-body');
        if (modal && body) {
            body.innerHTML = `<div style="text-align:center; padding:40px 0; color:#666; font-size:16px;">批改中...</div>`;
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
        const scoreData = await iframe.contentWindow.calculateScore();
        if (!scoreData) {
            if (modal) modal.style.display = 'none';
            return;
        }
        if (scoreData.error) {
            if (modal) modal.style.display = 'none';
            alert(scoreData.error);
            return;
        }
        renderGradeResult(scoreData);
        try {
            const modal = document.getElementById('task-modal');
            const paperKey = modal ? (modal.dataset.examInfo || '') : '';
            await savePaperGrade(paperKey, scoreData);
            const latest = await fetchPaperGrade(paperKey);
            if (latest && latest.total != null) setModalTitleScore(latest.total);
        } catch (e) {}
        if (iframe.contentWindow.enableGlobalShowAnswers) {
            iframe.contentWindow.enableGlobalShowAnswers();
        }
    } else {
        alert('无法连接到试卷页面或该页面不支持批改');
    }
}

function renderGradeResult(data) {
    const modal = document.getElementById('grade-modal');
    const body = document.getElementById('grade-modal-body');
    const isKaoyan = String(data && data.examType || '').toLowerCase() === 'kaoyan';

    if (isKaoyan) {
        const score = Number(data.total || 0);
        let statusHtml = '';
        if (score >= 80) {
            statusHtml = '<div style="color: #27ae60; font-size: 18px; font-weight: bold; margin-top: 5px;">成绩优秀</div>';
        } else if (score >= 60) {
            statusHtml = '<div style="color: #2980b9; font-size: 18px; font-weight: bold; margin-top: 5px;">达到合格线</div>';
        } else {
            statusHtml = '<div style="color: #e74c3c; font-size: 18px; font-weight: bold; margin-top: 5px;">仍有较大提升空间</div>';
        }
        let html = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 48px; font-weight: bold; color: #d4a259;">${score % 1 === 0 ? Math.round(score) : score} <span style="font-size: 16px; color: #666;">/ 100</span></div>
                    ${statusHtml}
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="background: #f8f9fa; border-bottom: 2px solid #eee;">
                        <th style="padding: 10px; text-align: left;">题型</th>
                        <th style="padding: 10px; text-align: right;">得分</th>
                        <th style="padding: 10px; text-align: right;">满分</th>
                    </tr>
            `;
        for (const info of Object.values(data.details || {})) {
            const rawScore = Number(info && info.score || 0);
            const scoreText = rawScore % 1 === 0 ? Math.round(rawScore) : rawScore;
            html += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 10px;">${info.label || ''}</td>
                        <td style="padding: 10px; text-align: right; font-weight: bold; color: ${rawScore > 0 ? '#21bf73' : '#333'};">${scoreText}</td>
                        <td style="padding: 10px; text-align: right; color: #666;">${info.max || 0}</td>
                    </tr>
                `;
        }
        html += `</table>`;
        body.innerHTML = html;
        modal.style.display = 'flex';
        return;
    }

    const partNames = {
        'listening': '听力',
        'reading': '阅读',
        'writing_translation': '写作+翻译'
    };

    let statusHtml = '';
    const score = data.total;
    if (score >= 550) {
        statusHtml = '<div style="color: #27ae60; font-size: 18px; font-weight: bold; margin-top: 5px;">🎉 成绩优秀！</div>';
    } else if (score >= 425) {
        statusHtml = '<div style="color: #2980b9; font-size: 18px; font-weight: bold; margin-top: 5px;">✅ 考试通过~</div>';
    } else {
        statusHtml = '<div style="color: #e74c3c; font-size: 18px; font-weight: bold; margin-top: 5px;">⚠️ 遗憾未通过~</div>';
    }

    let html = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 48px; font-weight: bold; color: #d4a259;">${Math.round(data.total)} <span style="font-size: 16px; color: #666;">/ 710</span></div>
                    ${statusHtml}
                    <div style="color: #999; font-size: 12px; margin-top: 4px;">(425分通过)</div>
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="background: #f8f9fa; border-bottom: 2px solid #eee;">
                        <th style="padding: 10px; text-align: left;">题型</th>
                        <th style="padding: 10px; text-align: right;">得分</th>
                        <th style="padding: 10px; text-align: right;">满分</th>
                    </tr>
            `;

    for (const [key, info] of Object.entries(data.details)) {
        const name = partNames[key] || key;
        html += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 10px;">${name}</td>
                        <td style="padding: 10px; text-align: right; font-weight: bold; color: ${info.score > 0 ? '#21bf73' : '#333'};">${Math.round(info.score)}</td>
                        <td style="padding: 10px; text-align: right; color: #666;">${info.max}</td>
                    </tr>
                `;
    }

    html += `</table>`;
    body.innerHTML = html;
    modal.style.display = 'flex';
}

function closeGradeModal() {
    const modal = document.getElementById('grade-modal');
    modal.style.display = 'none';
}

function setGradeButtonState(active) {
    const btn = document.getElementById('gradePaperBtn');
    if (!btn) return;
    btn.dataset.active = '';
    btn.textContent = '一键批改本卷';
}

async function toggleGradePaper() {
    const iframe = document.querySelector('#modal-task-list iframe');
    if (!iframe) return;
    setGradeButtonState(false);
    await gradePaper();
}
async function loadPaperGroups() {
    if (EXAM_TYPE === 'cet4') {
        console.log('加载CET4试卷组');
        await loadPapersByType('cet4');
        return;
    } else if (EXAM_TYPE === 'cet6') {
        console.log('加载CET6试卷组');
        await loadPapersByType('cet6');
        return;
    } else if (EXAM_TYPE === 'kaoyan') {
        console.log('加载考研英语试卷');
        await loadPapersByType('kaoyan');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/papergroups`);
        const paperGroups = await response.json();

        const $dropdown = $('#papergroupSelect');
        // $dropdown.html('<option value="">选择试卷组</option>');

        // 获取本地缓存的group_id
        const cachedGroupId = StorageManager.getUserSelection('group_id');

        paperGroups.forEach(group => {
            const $option = $('<option></option>');
            $option.val(group.id);
            $option.text(group.name);

            // 优先使用本地缓存的group_id，否则默认选中id为8的试卷组
            if (cachedGroupId && group.id == cachedGroupId) {
                $option.prop('selected', true);
            } else if (!cachedGroupId && group.id == 8) {
                $option.prop('selected', true);

            }

            $dropdown.append($option);
        });

        // 自动加载选中的试卷组
        const selectedGroupId = cachedGroupId || 8;
        const selectedGroup = paperGroups.find(group => group.id == selectedGroupId);
        if (selectedGroup) {
            loadPaperGroup(selectedGroupId);
        }


    } catch (error) {
    }
}

// 试卷组选择变化处理
function loadPaperGroup(groupId) {
    if (!groupId) {
        // 重置显示
        $('#knowledgeTreeContent').html('<p class="text-muted">请先选择试卷组</p>');
        $('#paperListContent').html('<p class="text-muted">请先选择试卷组</p>');
        // 隐藏统计容器
        hideKnowledgeStats();
        return;
    }

    // 加载知识点树和试卷列表
    loadKnowledgeTree(groupId);
    loadPaperList(groupId);

    // 显示试卷组整体统计
    showPaperGroupStats(groupId);
}
async function loadPapersByType(examType) {
    console.log(`加载${examType}试卷`);
    try {
        const response = await fetch(`${API_BASE}/papers/by_type/${examType}`);
        const papers = await response.json();
        
        // Mark these papers with their type for renderPapers logic
        // This is important because renderPapers needs to know if it's cet4 or cet6
        // to handle "Part III" vs "Part IV" display logic if any difference exists.
        // Actually, renderPapers just renders list. 
        // But we need to ensure click handler knows the type?
        // showPaperDetail uses mapTitleToExamInfo which relies on title text.
        // As long as title is standard, it's fine.
        
        renderPapers(papers);
    } catch (error) {
        console.error('Render papers error:', error);
        $('#paperListContent').html('<p class="text-danger">加载试卷列表失败</p>');
    }
}

    // // 渲染试卷列表
    // function renderPapers(papers) {
    //     const $container = $('#paperListContent');
        
    //     if (!papers || papers.length === 0) {
    //         $container.html('<p class="text-muted">暂无试卷数据</p>');
    //         return;
    //     }

    //     // Sort papers by name/year descending (e.g. 23-12(1) > 22-12(1))
    //     papers.sort((a, b) => {
    //         const nameA = a.name || '';
    //         const nameB = b.name || '';
    //         return nameB.localeCompare(nameA);
    //     });
        
    //     // 按列显示所有题目
    //     let html = '<div class="row">';
        
    //     papers.forEach((paper, paperIndex) => {
    //         html += `
    //             <div class="col-md-t mb-3 paper-column" style="width: 4.5vw; cursor: pointer;" data-paper-id="${paper.id}">
    //                 <div class="card h-100">
    //                     <div class="paper-header" data-paper-id="${paper.id}" data-paper-name="${paper.name}" onclick="showPaperDetail(this)" style="cursor: pointer;display:block;">
    //                         <h6 class="card-title mb-0 small text-center">${paper.name}</h6>
    //                     </div>
    //                     <div class="card-body p-2">`;
            
    //         // 显示该试卷的所有题目图片
    //         if (paper.questions && paper.questions.length > 0) {
    //             // Sort questions by index
    //             paper.questions.sort((a, b) => (a.index || 0) - (b.index || 0));

    //             paper.questions.forEach((question, questionIndex) => {
    //                 // 使用 id.png 作为图片路径
    //                 const questionIndex1Based = question.index || (questionIndex + 1);
    //                 const imageId = question.thumbnail_id || question.id;
    //                 const imagePath = `static/thumbs/${imageId}.png`;
                    
    //                 html += `
    //                     <div class="mb-q position-relative question-item" 
    //                          data-knowledge-id="${question.knowledge_tags_id || ''}"
    //                          data-paper-name="${paper.name}"
    //                          data-question-number="${questionIndex1Based}"
    //                          data-question-id="${question.id || ''}"
    //                          data-question-type="${question.question_type || 1}"
    //                          data-score="${question.score || 0}"
    //                          data-year="${question.year || ''}"
    //                          data-happy-count="${question.happy_count || 0}"
    //                          data-maybe-count="${question.maybe_count || 0}"
    //                          data-sad-count="${question.sad_count || 0}"
    //                          style="cursor: pointer;" 
    //                          onclick="handleQuestionItemClick(this)"
    //                          onmouseenter="handleQuestionItemHover(this, true)"
    //                          onmouseleave="handleQuestionItemHover(this, false)">
                            // <img src="${imagePath}" 
                            //      alt="题目 ${questionIndex1Based}" 
                            //      class="img-fluid w-100" 
                            //      loading="lazy"
                            //      onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
    //                         <div class="mb-1" style="display: none;">
    //                             <span class="d-block text-center p-3 bg-light text-muted small">
    //                                 题目 ${questionIndex1Based}
    //                             </span>
    //                         </div>
    //                         <div class="question-overlay" style="display: none;"></div>
    //                     </div>
    //                 `;
    //             });
    //         } else {
    //             html += '<p class="text-muted small text-center">暂无题目</p>';
    //         }
            
    //         html += `
    //                     </div>
    //                 </div>
    //             </div>
    //         `;
    //     });
        
    //     html += '</div>';
    //     $container.html(html);
        
    //     // 如果刷题记录开关是开启状态，重新应用刷题记录蒙版
    //     const showMyRecordsSwitch = document.getElementById('showMyRecordsSwitch');
    //     if (showMyRecordsSwitch && showMyRecordsSwitch.checked && typeof applyMoodOverlays === 'function') {
    //         setTimeout(() => {
    //             applyMoodOverlays();
    //         }, 100);
    //     }
        
    //     // 如果显示题号开关是开启状态，重新添加题号
    //     const showQuestionNumbersSwitch = document.getElementById('showQuestionNumbersSwitch');
    //     if (showQuestionNumbersSwitch && showQuestionNumbersSwitch.checked && typeof addQuestionNumbers === 'function') {
    //         setTimeout(() => {
    //             addQuestionNumbers();
    //         }, 100);
    //     }
    // }
    // 渲染试卷列表
    function sortPaperQuestionsForDisplay(questions) {
        if (!Array.isArray(questions)) return [];
        if (EXAM_TYPE !== 'kaoyan') return questions.slice();

        const sectionRank = (section) => {
            const value = String(section || '').trim();
            if (value === 'Section I') return 0;
            if (value === 'Section II') return 1;
            if (value === 'Section III') return 2;
            return 9;
        };

        const partRank = (part, section) => {
            const value = String(part || '').trim();
            const sec = String(section || '').trim();
            if (!value) return 0;
            if (sec === 'Section III') {
                if (value === 'Part C') return 0;
                if (value === 'Part A') return 1;
                if (value === 'Part B') return 2;
                return 9;
            }
            if (value === 'Part A') return 0;
            if (value === 'Part B') return 1;
            if (value === 'Part C') return 2;
            return 9;
        };

        return questions.slice().sort((a, b) => {
            const secDiff = sectionRank(a && a.section) - sectionRank(b && b.section);
            if (secDiff !== 0) return secDiff;

            const partDiff = partRank(a && a.part, a && a.section) - partRank(b && b.part, b && b.section);
            if (partDiff !== 0) return partDiff;

            const idA = Number(a && a.id) || 0;
            const idB = Number(b && b.id) || 0;
            if (idA !== idB) return idA - idB;

            const idxA = Number(a && a.index) || 0;
            const idxB = Number(b && b.index) || 0;
            return idxA - idxB;
        });
    }

    function renderPapers(papers) {
        const $container = $('#paperListContent');
        
        if (!papers || papers.length === 0) {
            $container.html('<p class="text-muted">暂无试卷数据</p>');
            return;
        }
        
        // 按列显示所有题目
        let html = '<div class="row">';
        
        papers.forEach((paper) => {
            const paperTitle = EXAM_TYPE === 'kaoyan'
                ? stripKaoyanPaperSuffix(paper.name)
                : paper.name;
            const paperTitleHtml = `<h6 class="card-title mb-0 small text-center">${paperTitle}</h6>`;
            html += `
                <div class="col-md-t mb-3 paper-column" data-paper-id="${paper.id}">
                    <div class="card h-100">
                        <div class="paper-header" data-paper-id="${paper.id}" data-paper-name="${paper.name}" data-paper-exam-info="${paper.name}" onclick="showPaperDetail(this)" style="cursor: pointer;display:block;">
                            ${paperTitleHtml}
                        </div>
                        <div class="card-body p-2">`;
            
            // 显示该试卷的所有题目图片
            const sortedQuestions = sortPaperQuestionsForDisplay(paper.questions || []);
            if (sortedQuestions.length > 0) {
                sortedQuestions.forEach((question, questionIndex) => {
                    // 使用 id.png 作为图片路径
                    const questionIndex1Based = questionIndex + 1;
                    const imageId = question.thumbnail_id || question.id;
                    // const imagePath = `/static/thumbs/${imageId}.png`;
                    const imagePath = `static/thumbs/${imageId}.png`;
                    
                    html += `
                        <div class="mb-q position-relative question-item" 
                             data-knowledge-id="${question.knowledge_tags_id || ''}"
                             data-paper-name="${paper.name}"
                             data-question-number="${questionIndex1Based}"
                             data-task-id="${question.id || ''}"
                             data-question-ids='${JSON.stringify(question.question_ids || [])}'
                             data-question-type="${question.question_type || 1}"
                             data-part="${question.part || ''}"
                             data-section="${question.section || ''}"
                             data-score="${question.score || 0}"
                             data-year="${question.year || ''}"
                             style="cursor: pointer;" 
                             onclick="handleQuestionItemClick(this)"
                             onmouseenter="handleQuestionItemHover(this, true)"
                             onmouseleave="handleQuestionItemHover(this, false)">
                            <img src="${imagePath}" 
                                 alt="题目 ${questionIndex1Based}" 
                                 class="img-fluid w-100" 
                                 
                                 loading="lazy"
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                            <div class="mb-1" style="display: none;">
                                <span class="d-block text-center p-3 bg-light text-muted small">
                                    题目 ${questionIndex1Based}
                                </span>
                            </div>
                            <div class="question-overlay" style="display: none;"></div>
                        </div>
                    `;
                });
            } else {
                html += '<p class="text-muted small text-center">暂无题目</p>';
            }
            
            html += `
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        $container.html(html);
        try {
            const mode = localStorage.getItem('cet_sidebar_mode') || 'category';
            const hasSelectedWord = !!(window.currentWordModeWord && String(window.currentWordModeWord || '').trim());
            if (mode === 'word' && !hasSelectedWord && typeof renderWordModeEmptyPanel === 'function') {
                setTimeout(() => {
                    try {
                        renderWordModeEmptyPanel();
                        applyWordModeBaseFontSize();
                    } catch (e) {}
                }, 0);
            }
        } catch (e) {}

        setTimeout(() => {
            if (typeof window.updateTaskProgressUI === 'function') {
                window.updateTaskProgressUI();
            }
        }, 0);
        
        // 如果刷题记录开关是开启状态，重新应用刷题记录蒙版
        const showMyRecordsSwitch = document.getElementById('showMyRecordsSwitch');
        if (showMyRecordsSwitch && showMyRecordsSwitch.checked) {
            // 延迟一下确保DOM完全渲染
            setTimeout(() => {
                if (typeof applyRecordOverlays === 'function') {
                    applyRecordOverlays();
                } else if (typeof applyMoodOverlays === 'function') {
                    applyMoodOverlays();
                }
            }, 100);
        }
        
        // 如果显示题号开关是开启状态，重新添加题号
        const showQuestionNumbersSwitch = document.getElementById('showQuestionNumbersSwitch');
        if (showQuestionNumbersSwitch && showQuestionNumbersSwitch.checked) {
            // 延迟一下确保DOM完全渲染
            setTimeout(() => {
                addQuestionNumbers();
            }, 100);
        }
    }

function handleQuestionItemClick(el) {
    const taskId = el.getAttribute('data-task-id');
    const kId = el.getAttribute('data-knowledge-id');
    
    // 检查是否有视觉蒙版（与handleQuestionItemHover逻辑一致）
    const $questionElement = $(el);
    const hasQuestionNumber = $questionElement.find('.question-number').is(':visible');
    const isHighlighted = $questionElement.hasClass('highlighted');
    const isWordHighlighted = $questionElement.hasClass('word-highlighted');
    const hasMoodOverlay = $questionElement.find('.mood-overlay').length > 0;
    const hasRecordOverlay = $questionElement.find('.record-overlay').length > 0;
    const hasDifficultyOverlay = $questionElement.find('.difficulty-overlay').length > 0;
    const hasWordOverlay = $questionElement.find('.word-overlay').length > 0;
    const hasWordKnownOverlay = $questionElement.find('.word-known-overlay').length > 0;
    const isWordMode = isWordHighlighted || hasWordOverlay;

    // 如果有蒙版，或者是高亮状态（比如点击知识点后的高亮），则进入单题模式
    if (!isWordMode && (hasQuestionNumber || isHighlighted || hasMoodOverlay || hasRecordOverlay || hasDifficultyOverlay || hasWordKnownOverlay)) {
        if (taskId) {
            openQuestionInPracticeMode(taskId, kId);
        }
    } else {
        const $paperColumn = $questionElement.closest('.paper-column');
        const $paperHeader = $paperColumn.find('.paper-header');
        const paperName = $questionElement.attr('data-paper-name');

        const openPaperDetail = (headerEl) => {
            if (!headerEl) {
                if (taskId) openQuestionInPracticeMode(taskId, kId);
                return;
            }
            showPaperDetail(headerEl);
        };

        const headerEl = $paperHeader.length > 0 ? $paperHeader[0] : null;
        let fallbackHeaderEl = headerEl;

        if (!fallbackHeaderEl && paperName) {
            const tempHeader = document.createElement('div');
            const tempTitle = document.createElement('h6');
            tempTitle.textContent = paperName;
            tempHeader.appendChild(tempTitle);
            fallbackHeaderEl = tempHeader;
        }

        if (paperName) {
            const elements = Array.from(document.querySelectorAll(`.question-item[data-paper-name="${paperName}"]`));
            if (elements.length > 0) {
                performPaperGatheringAnimation(elements, () => openPaperDetail(fallbackHeaderEl));
                return;
            }
        }

        openPaperDetail(fallbackHeaderEl);
    }
}

function handleQuestionItemHover(el, isEnter) {
    const $questionElement = $(el);
    
    // 检查题目是否有视觉元素：题号、高亮蒙版、心情蒙版或难度蒙版
    const hasQuestionNumber = $questionElement.find('.question-number').is(':visible');
    const isHighlighted = $questionElement.hasClass('highlighted');
    const isWordHighlighted = $questionElement.hasClass('word-highlighted');
    const hasMoodOverlay = $questionElement.find('.mood-overlay').length > 0;
    const hasRecordOverlay = $questionElement.find('.record-overlay').length > 0;
    const hasDifficultyOverlay = $questionElement.find('.difficulty-overlay').length > 0;
    const hasWordOverlay = $questionElement.find('.word-overlay').length > 0;
    const hasWordKnownOverlay = $questionElement.find('.word-known-overlay').length > 0;
    const isWordMode = isWordHighlighted || hasWordOverlay;
    const isSingleQuestionMode = !isWordMode && (hasQuestionNumber || isHighlighted || hasMoodOverlay || hasRecordOverlay || hasDifficultyOverlay || hasWordKnownOverlay);
    if (isSingleQuestionMode && isEnter) {
        el.classList.add('shadow-sm');
    } else {
        el.classList.remove('shadow-sm');
    }
    
    // 如果题目上有视觉元素（题号或任何蒙版），则使用默认的CSS悬浮效果（单个题目）；否则高亮整张试卷
    if (isSingleQuestionMode) {
        // 使用默认的CSS悬浮效果（单个题目），不需要额外处理
        return;
    } else {
        // 高亮整张试卷
        const paperName = $questionElement.attr('data-paper-name');
        
        if (paperName) {
            // 找到同一张试卷的所有题目
            const $samePaperQuestions = $(`.question-item[data-paper-name="${paperName}"]`);
            
            if (isEnter) {
                // 鼠标进入：为整张试卷添加悬浮效果
                $samePaperQuestions.addClass('paper-hover');
            } else {
                // 鼠标离开：移除整张试卷的悬浮效果
                $samePaperQuestions.removeClass('paper-hover');
            }
        }
    }
}

// 页面初始化
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOMContentLoaded');
    
    // Check if user is logged in (global check), then load papers
    // Note: checkGlobalLoginStatus is async but we don't need to wait for it to start loading papers
    // Papers are public? Yes, list is public.
    
    loadPaperGroups();
    
    // Auto-check membership to update UI badge
    if (typeof checkGlobalMembershipStatus === 'function') {
        checkGlobalMembershipStatus();
    }
});

/*
优化思路如下：

数学


*/

// 获取已做题目记录
function getTaskRecordsStorageKey() {
    try {
        const u = window.currentStudent || null;
        const userId = u && u.id ? String(u.id) : '';
        if (!userId) return null;
        return `user_task_records:${getCurrentMembershipProductType()}:${userId}`;
    } catch (e) {
        return null;
    }
}

function getTaskRecordsStorageKeyOrDefault() {
    return getTaskRecordsStorageKey() || 'user_task_records';
}

window.__taskRecordSnapshot = window.__taskRecordSnapshot || null;
window.__taskRecordSnapshotLoaded = window.__taskRecordSnapshotLoaded || false;

function getCompletedQuestions() {
    if (!isGlobalUserLoggedIn()) return new Set();
    try {
        if (!window.__taskRecordSnapshotLoaded) return new Set();
        const records = window.__taskRecordSnapshot || {};
        const completed = new Set();
        Object.keys(records).forEach(key => {
            if (key.startsWith('q')) {
                const qid = key.substring(1); // remove 'q' prefix
                completed.add(qid);
            }
        });
        return completed;
    } catch (e) {
        console.error('Failed to parse user records', e);
        return new Set();
    }
}

async function syncUserTaskRecordsFromServer() {
    if (!isGlobalUserLoggedIn()) return;
    try {
        const r = await fetch(`${API_BASE}/record/list`, { credentials: 'same-origin' });
        const j = await r.json();
        if (!j || !j.success || !j.data) return;
        const serverRecords = (j.data && typeof j.data === 'object') ? j.data : {};
        window.__taskRecordSnapshot = serverRecords;
        window.__taskRecordSnapshotLoaded = true;
        localStorage.setItem(getTaskRecordsStorageKeyOrDefault(), JSON.stringify(serverRecords));
        try {
            if (typeof window.updateTaskProgressUI === 'function') window.updateTaskProgressUI();
        } catch (e) {}
        try {
            const sw = document.getElementById('showMyRecordsSwitch');
            if (sw && sw.checked && typeof applyRecordOverlays === 'function') applyRecordOverlays();
        } catch (e) {}
    } catch (e) {}
}

function getTaskRecordsByQidMap() {
    const map = new Map();
    try {
        if (!window.__taskRecordSnapshotLoaded) return map;
        const records = window.__taskRecordSnapshot || {};
        Object.keys(records).forEach(key => {
            if (!key || key.charAt(0) !== 'q') return;
            const qid = key.substring(1);
            if (!qid) return;
            const raw = records[key];
            let obj = {
                kind: 'unknown',
                has_record: true,
            };
            if (typeof raw === 'string') {
                // 主观题有 AI 批改：后端返回 JSON 字符串
                if (raw.length > 0 && (raw.charAt(0) === '{' || raw.charAt(0) === '[')) {
                    try {
                        const parsed = JSON.parse(raw);
                        if (parsed && typeof parsed === 'object') {
                            const score = parseFloat(parsed.ai_score);
                            obj.kind = 'subjective';
                            obj.ai_score = Number.isFinite(score) ? score : null;
                            obj.graded = Number.isFinite(score) && score > 0;
                            obj.text = String(parsed.text || '');
                        }
                    } catch (e) {
                        obj.kind = 'subjective';
                        obj.graded = false;
                        obj.ai_score = null;
                    }
                } else {
                    // 客观题 user_answer
                    obj.kind = 'objective';
                    obj.user_answer = raw;
                }
            } else if (raw && typeof raw === 'object') {
                // 预留兼容：后端未来如果直接返回对象
                const score = parseFloat(raw.ai_score);
                obj.kind = Number.isFinite(score) ? 'subjective' : 'objective';
                obj.ai_score = Number.isFinite(score) ? score : null;
                obj.graded = Number.isFinite(score) && score > 0;
                obj.user_answer = typeof raw.user_answer === 'string' ? raw.user_answer : '';
                obj.text = typeof raw.text === 'string' ? raw.text : '';
            }
            map.set(String(qid), obj);
        });
    } catch (e) {}
    return map;
}

function normalizeAnswerStr(value) {
    if (value == null) return '';
    const s = String(value).trim().toUpperCase();
    if (!s) return '';
    const letters = new Set();
    for (let i = 0; i < s.length; i++) {
        const c = s.charAt(i);
        if (c >= 'A' && c <= 'Z') letters.add(c);
    }
    return Array.from(letters).sort().join('');
}

window.__questionCorrectAnswerCache = window.__questionCorrectAnswerCache || Object.create(null);
window.__questionCorrectAnswerLoading = window.__questionCorrectAnswerLoading || false;
window.__questionCorrectAnswerDirtyAfterLoad = window.__questionCorrectAnswerDirtyAfterLoad || false;

async function ensureCorrectAnswersForQids(qidIterable, opts) {
    const cache = window.__questionCorrectAnswerCache || Object.create(null);
    const wanted = new Set();
    (qidIterable || []).forEach((q) => {
        const qs = String(q || '').trim();
        if (!qs) return;
        if (!(qs in cache)) wanted.add(qs);
    });
    if (wanted.size === 0) return { loaded: 0 };
    if (window.__questionCorrectAnswerLoading) {
        window.__questionCorrectAnswerDirtyAfterLoad = true;
        return { loading: true };
    }
    const list = Array.from(wanted);
    window.__questionCorrectAnswerLoading = true;
    window.__questionCorrectAnswerDirtyAfterLoad = false;
    let loaded = 0;
    try {
        const chunks = [];
        // URL 超长会导致 Nginx/CDN/TLS 直接断开（ERR_CONNECTION_CLOSED），所以改成 POST JSON 分小批次
        const CHUNK_SIZE = 100;
        for (let i = 0; i < list.length; i += CHUNK_SIZE) chunks.push(list.slice(i, i + CHUNK_SIZE));
        for (let ci = 0; ci < chunks.length; ci++) {
            const ids = chunks[ci];
            if (!ids || !ids.length) continue;
            const r = await fetch(`${API_BASE}/question_answers`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ ids: ids }),
            });
            const j = await r.json();
            const ans = (j && j.success && j.answers && typeof j.answers === 'object') ? j.answers : {};
            Object.keys(ans).forEach((k) => {
                const key = String(k || '').trim();
                if (!key) return;
                cache[key] = normalizeAnswerStr(ans[k]);
                loaded++;
            });
        }
    } catch (e) {
        list.forEach((q) => {
            if (!(q in cache)) cache[q] = '';
        });
    } finally {
        window.__questionCorrectAnswerCache = cache;
        const needRefresh = !!window.__questionCorrectAnswerDirtyAfterLoad;
        window.__questionCorrectAnswerLoading = false;
        window.__questionCorrectAnswerDirtyAfterLoad = false;
        if (needRefresh && opts && opts.refresh) {
            try {
                if (typeof renderRecordOverlaysOnce === 'function') renderRecordOverlaysOnce();
            } catch (e) {}
        }
    }
    return { loaded };
}

function computeObjectiveVerdictMapFromGradeDetails(details) {
    // 返回 Map<qidString, true(对)/false(错)>
    const m = new Map();
    if (!details || !Array.isArray(details)) return m;
    details.forEach((d) => {
        if (!d || typeof d !== 'object') return;
        const qids = [];
        if (Number.isFinite(d.question_id) || typeof d.question_id === 'string') qids.push(String(d.question_id));
        if (Array.isArray(d.qids)) d.qids.forEach((q) => qids.push(String(q)));
        if (Array.isArray(d.question_ids)) d.question_ids.forEach((q) => qids.push(String(q)));
        const ua = normalizeAnswerStr(d.user_answer);
        const ca = normalizeAnswerStr(d.correct_answer ?? d.answer ?? d.answer_key ?? d.standard_answer ?? d.right_answer);
        let isCorrect = false;
        if (typeof d.is_correct === 'boolean') {
            isCorrect = d.is_correct;
        } else if (ua && ca) {
            isCorrect = ua === ca;
        } else if (Number.isFinite(parseFloat(d.score)) && Number.isFinite(parseFloat(d.full_score)) && parseFloat(d.full_score) > 0) {
            isCorrect = parseFloat(d.score) >= parseFloat(d.full_score);
        }
        qids.forEach((q) => { if (q) m.set(q, !!isCorrect); });
    });
    return m;
}

function extractTaskQidContext($el) {
    const paperKey = String($el.closest('.paper-column').attr('data-paper-key') || $el.attr('data-paper-name') || '').trim();
    const taskId = String($el.attr('data-task-id') || '').trim();
    const part = String($el.attr('data-part') || '').trim();
    let qids = [];
    try {
        const raw = $el.attr('data-question-ids');
        if (raw) qids = JSON.parse(raw) || [];
    } catch (e) { qids = []; }
    return {
        paperKey,
        taskId,
        part,
        qids: Array.isArray(qids) ? qids.map((q) => String(q)).filter(Boolean) : [],
    };
}

function computeTaskRecordRatio($el, qmap) {
    // 返回 { kind, okPct, failPct, blankPct }，均为 0..100；三者相加必定 = 100
    const ctx = extractTaskQidContext($el);
    const qids = ctx.qids;
    if (!qids.length) return { kind: 'none' };
    const hasRecordQids = qids.filter((q) => qmap.has(q));
    if (!hasRecordQids.length) return { kind: 'none' };

    const isSubjectiveTask = (ctx.part === 'Part I' || ctx.part === 'Part IV' || qids.length === 1);

    if (isSubjectiveTask) {
        for (let i = 0; i < hasRecordQids.length; i++) {
            const r = qmap.get(hasRecordQids[i]);
            if (r && r.kind === 'subjective' && r.graded && r.ai_score != null) {
                const pct = Math.max(0, Math.min(100, Number(r.ai_score) || 0));
                const ok = Math.round(pct);
                return { kind: 'subjective', okPct: ok, failPct: 100 - ok, blankPct: 0 };
            }
        }
        return { kind: 'subjective', okPct: 0, failPct: 0, blankPct: 100 };
    }

    // 客观题：
    //   第一优先级：paper_grade.details（人工/评卷确认过的 is_correct/score）
    //   第二优先级：question_answers 缓存的 correct_answer 与用户保存的 user_answer 对比（按用户说的“现场计算”）
    //   以上都没有 → 透明段
    let verdictFromGrade = null;
    if (ctx.paperKey && typeof window.__paperGradeCache === 'object' && window.__paperGradeCache) {
        const g = window.__paperGradeCache[ctx.paperKey];
        if (g && g.details) verdictFromGrade = computeObjectiveVerdictMapFromGradeDetails(g.details);
    }
    const correctCache = window.__questionCorrectAnswerCache || Object.create(null);

    let ok = 0, fail = 0, blank = 0;
    const total = qids.length;
    qids.forEach((q) => {
        const r = qmap.get(q);
        if (!r) { blank++; return; }
        if (verdictFromGrade && verdictFromGrade.has(q)) {
            if (verdictFromGrade.get(q)) ok++;
            else fail++;
            return;
        }
        // 现场计算：用 normalizeAnswerStr 比较 A..Z（支持单选/多选任意顺序、带括号、带标点、大小写、空格）
        if (r && r.kind === 'objective' && typeof r.user_answer === 'string') {
            const ua = normalizeAnswerStr(r.user_answer);
            const ca = q in correctCache ? String(correctCache[q] || '') : '';
            if (ua && ca) {
                if (ua === ca) ok++;
                else fail++;
                return;
            }
            // 有 user_answer 但 correct_answer 还没拉到（缓存 miss），先归为透明（避免误判）
            blank++;
            return;
        }
        blank++;
    });

    const clamp100 = (n) => Math.max(0, Math.min(100, Number(n) || 0));
    const pct = (x) => Math.round(((x / total) * 100));
    let okPct = clamp100(pct(ok));
    let failPct = clamp100(pct(fail));
    let blankPct = clamp100(pct(blank));
    let diff = 100 - (okPct + failPct + blankPct);
    if (diff !== 0) {
        blankPct = clamp100(blankPct + diff);
        diff = 100 - (okPct + failPct + blankPct);
        if (diff !== 0) {
            if (okPct > 0) okPct = clamp100(okPct + diff);
            else if (failPct > 0) failPct = clamp100(failPct + diff);
            else blankPct = 100;
        }
    }
    return { kind: 'objective', okPct, failPct, blankPct };
}

function renderRecordOverlayMarkup(ratio) {
    if (!ratio || ratio.kind === 'none') return '';
    const clamp100 = (n) => Math.max(0, Math.min(100, Number(n) || 0));
    const ok = clamp100(ratio.okPct);
    const fl = clamp100(ratio.failPct);
    let bl = clamp100(ratio.blankPct);
    const total = ok + fl + bl;
    if (total === 0) bl = 100;
    const segments = [];
    if (ok > 0) segments.push(`<div class="record-segment record-green" style="width:${ok.toFixed(3)}%"></div>`);
    if (fl > 0) segments.push(`<div class="record-segment record-red" style="width:${fl.toFixed(3)}%"></div>`);
    if (bl > 0) segments.push(`<div class="record-segment record-transparent" style="width:${bl.toFixed(3)}%"></div>`);
    return `<div class="record-overlay" aria-label="正确 ${ok}% / 错误 ${fl}% / 未答 ${bl}%">${segments.join('')}</div>`;
}

window.__recordOverlayApplyingPromise = null;

function applyRecordOverlays() {
    // 1) “隐藏”必须立即生效：无论当前是否有异步 applying 任务在跑，都立刻清掉蒙版并取消等待
    try {
        const sw0 = document.getElementById('showMyRecordsSwitch');
        if (!sw0 || !sw0.checked) {
            $('.record-overlay').remove();
            if (window.__recordOverlayApplyingPromise) {
                try {
                    if (typeof window.__recordOverlayApplyingPromise.cancel === 'function') {
                        window.__recordOverlayApplyingPromise.cancel();
                    }
                } catch (e) {}
            }
            window.__recordOverlayApplyingPromise = null;
            return null;
        }
    } catch (e) {}

    if (window.__recordOverlayApplyingPromise) {
        return window.__recordOverlayApplyingPromise;
    }
    let cancelled = false;
    const task = (async () => {
        try {
            if (cancelled) return;
            if (!isGlobalUserLoggedIn()) {
                $('.record-overlay').remove();
                const sw = document.getElementById('showMyRecordsSwitch');
                if (sw) sw.checked = false;
                return;
            }
            const sw = document.getElementById('showMyRecordsSwitch');
            const showRecords = !!(sw && sw.checked);
            if (!showRecords) {
                $('.record-overlay').remove();
                return;
            }

            if (!window.__taskRecordSnapshotLoaded) {
                try {
                    if (typeof syncUserTaskRecordsFromServer === 'function') {
                        await syncUserTaskRecordsFromServer();
                    }
                } catch (e) {}
                if (cancelled) return;
            }
            if (!window.__taskRecordSnapshotLoaded) return;
            if (cancelled) return;

            const qmap = getTaskRecordsByQidMap();
            if (qmap.size === 0) {
                $('.record-overlay').remove();
                return;
            }

            try {
                const needQids = [];
                const cache = window.__questionCorrectAnswerCache || Object.create(null);
                $('.question-item').each(function () {
                    const $el = $(this);
                    if (!$el.length) return;
                    const ctx = extractTaskQidContext($el);
                    if (!ctx || !ctx.qids || !ctx.qids.length) return;
                    const isSubjective = (ctx.part === 'Part I' || ctx.part === 'Part IV' || ctx.qids.length === 1);
                    if (isSubjective) return;
                    ctx.qids.forEach((q) => { if (!(q in cache)) needQids.push(q); });
                });
                const needUnique = Array.from(new Set(needQids));
                if (needUnique.length > 0) {
                    try {
                        await ensureCorrectAnswersForQids(needUnique, { refresh: false });
                    } catch (e) {}
                }
            } catch (e) {}
            if (cancelled) return;

            const sw2 = document.getElementById('showMyRecordsSwitch');
            if (!sw2 || !sw2.checked) {
                $('.record-overlay').remove();
                return;
            }
            $('.record-overlay').remove();
            renderRecordOverlaysOnce();
        } catch (e) {
            console.error('applyRecordOverlays failed', e);
        } finally {
            if (window.__recordOverlayApplyingPromise === task) {
                window.__recordOverlayApplyingPromise = null;
            }
        }
    })();
    task.cancel = () => { cancelled = true; };
    window.__recordOverlayApplyingPromise = task;
    return task;
}

function renderRecordOverlaysOnce() {
    try {
        const qmap = getTaskRecordsByQidMap();
        $('.question-item').each(function () {
            const $el = $(this);
            if (!$el.length) return;
            if ($el.find('> .record-overlay').length > 0) return;
            const ratio = computeTaskRecordRatio($el, qmap);
            const markup = renderRecordOverlayMarkup(ratio);
            if (markup) {
                try { $el.append(markup); } catch (e) {}
            }
        });
    } catch (e) {
        console.error('renderRecordOverlaysOnce failed', e);
    }
}

// 监听开关变化
document.addEventListener('DOMContentLoaded', function() {
    const switchEl = document.getElementById('showMyRecordsSwitch');
    if (switchEl) {
        // 默认不选中
        switchEl.checked = false;
        switchEl.disabled = !isGlobalUserLoggedIn();

        switchEl.addEventListener('change', function() {
            if (!isGlobalUserLoggedIn()) {
                switchEl.checked = false;
                switchEl.disabled = true;
                if (typeof startWechatLoginPreferFast === 'function') {
                    startWechatLoginPreferFast();
                } else if (typeof showLoginModal === 'function') {
                    showLoginModal();
                }
                return;
            }
            if (switchEl.checked) {
                enforceOverlayMutex('record');
            }
            try {
                const ret = applyRecordOverlays();
                if (ret && typeof ret.then === 'function') {
                    ret.then(() => {
                        if (typeof window.updateTaskProgressUI === 'function') {
                            window.updateTaskProgressUI();
                        }
                    }).catch(() => {});
                    return;
                }
            } catch (e) {}
            if (typeof window.updateTaskProgressUI === 'function') {
                window.updateTaskProgressUI();
            }
        });
    }

    (async () => {
        try {
            await syncUserTaskRecordsFromServer();
        } catch (e) {}
        try {
            if (typeof window.updateTaskProgressUI === 'function') {
                await window.updateTaskProgressUI();
            }
        } catch (e) {}
        try {
            const sw = document.getElementById('showMyRecordsSwitch');
            if (sw && sw.checked) {
                try { await applyRecordOverlays(); } catch (e) {}
            }
        } catch (e) {}
    })();

    window.addEventListener('storage', (e) => {
        try {
            if (!isGlobalUserLoggedIn()) return;
            if (!e || e.key !== getTaskRecordsStorageKeyOrDefault()) return;
            try {
                window.__taskRecordSnapshot = e.newValue ? (JSON.parse(e.newValue) || {}) : {};
                window.__taskRecordSnapshotLoaded = true;
            } catch (parseErr) {
                window.__taskRecordSnapshot = {};
                window.__taskRecordSnapshotLoaded = true;
            }
            (async () => {
                try {
                    if (typeof window.updateTaskProgressUI === 'function') await window.updateTaskProgressUI();
                } catch (e) {}
                const sw = document.getElementById('showMyRecordsSwitch');
                if (sw && sw.checked) {
                    try { await applyRecordOverlays(); } catch (e) {}
                }
            })();
        } catch (err) {}
    });
});

document.addEventListener('DOMContentLoaded', function() {
    try {
        initSidebarModeSwitch();
        initWordModeFilterSwitch();
        initPaperListCollapseToggle();
    } catch (e) {}
});
