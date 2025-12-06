


export type ViolationCode = 'profanity' | 'email' | 'url' | 'phone' | 'cpf' | 'too_many_digits';
export interface Violation { code: ViolationCode; match: string | null }

export function containsIdentitySensitive(text = ''): Violation | null {
  if (!text) return null;
  const prepared = normalizeLeet(removeDiacritics(String(text).toLowerCase()));
  const tokens = prepared.split(/\s+/).filter(Boolean);
  for (const t of tokens) {
    if (IDENTITY_SET.has(normalizeWord(t))) return { code: 'profanity', match: t };
    const deobf = squeezeDuplicates(t.replace(/[^a-z0-9]+/gi, ''));
    if (deobf && IDENTITY_SET.has(normalizeWord(deobf))) return { code: 'profanity', match: deobf };
  }
  return null;
}

const removeDiacritics = (str = '') => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const basePT = [
  'porra','merda','caralho','buceta','puta','puto','fdp','pqp','babaca','otario','otária','otaria','otário','desgraçado','desgracado','arrombado','arrombada','vagabundo','vagabunda','cuzão','cuzao','cu','pau no cu','pau-no-cu','pau','pênis','penis','bosta','corno','safado','safada','escroto','escrota','viado','viada','viadinho','boiola','bicha','retardado','retardada'
];
const baseEN = [
  'fuck','shit','asshole','bastard','bitch','cunt','dick','pussy','motherfucker','mf','fucker','jerk','retard','retarded','slut','whore','fag','faggot','queer'
];
const baseES = [
  'mierda','carajo','coño','cono','pendejo','pendeja','cabron','cabrón','culero','zorra','puta','puto','gilipollas','maricon','maricón'
];

const identityPT = ['gay','traveco','sapatao','sapatão'];
const identityEN = ['tranny','shemale','dyke'];
const identityES = ['travelo'];

const normalizeWord = (w: string) => removeDiacritics(String(w).toLowerCase().trim());
let PROFANITY_SET: Set<string> = new Set([...basePT, ...baseEN, ...baseES].map(normalizeWord));
let IDENTITY_SET: Set<string> = new Set([...identityPT, ...identityEN, ...identityES].map(normalizeWord));
let dictLoaded = false;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DICT_KEY = 'cf_dict_ldnoobw_v1';

async function fetchLDList(lang: string): Promise<string[]> {
  const url = `https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/${encodeURIComponent(lang)}`;
  const resp = await fetch(url, { cache: 'no-store' });
  if (!resp.ok) throw new Error(`Failed to fetch ${lang} list`);
  const text = await resp.text();
  return text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

export async function ensureDictionariesLoaded(): Promise<void> {
  if (dictLoaded) return;
  try {
    const cachedRaw = localStorage.getItem(DICT_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      if (cached?.ts && (Date.now() - cached.ts) < ONE_DAY_MS && Array.isArray(cached.words)) {
        PROFANITY_SET = new Set(cached.words.map((w: string) => normalizeWord(w)));
        dictLoaded = true;
        return;
      }
    }
  } catch {}

  try {
    const [en, es, pt] = await Promise.all([
      fetchLDList('en'),
      fetchLDList('es'),
      fetchLDList('pt')
    ]);
    const words = [...new Set([...baseEN, ...baseES, ...basePT, ...en, ...es, ...pt])];
    PROFANITY_SET = new Set(words.map(normalizeWord));
    
    dictLoaded = true;
    try {
      localStorage.setItem(DICT_KEY, JSON.stringify({ ts: Date.now(), words }));
    } catch {}
  } catch {
    
    dictLoaded = true;
  }
}


function normalizeLeet(text = ''): string {
  const map: Record<string, string> = {
    '@': 'a', '4': 'a',
    '3': 'e',
    '1': 'i', '!': 'i',
    '0': 'o',
    '$': 's', '5': 's',
    '7': 't',
    '8': 'b',
    '9': 'g',
    '(': 'c', '{': 'c', '[': 'c',
    '|': 'l'
  };
  let out = '';
  for (const ch of String(text)) out += map[ch] || ch;
  return out;
}

function squeezeDuplicates(text = ''): string {
  return String(text).replace(/([a-z0-9])\1{1,}/gi, '$1');
}

export function containsProfanity(text = ''): Violation | null {
  if (!text) return null;
  const prepared = normalizeLeet(removeDiacritics(String(text).toLowerCase()));
  const tokens = prepared.split(/\s+/).filter(Boolean);
  for (const t of tokens) {
    if (PROFANITY_SET.has(normalizeWord(t))) return { code: 'profanity', match: t };
    const deobf = squeezeDuplicates(t.replace(/[^a-z0-9]+/gi, ''));
    if (deobf && PROFANITY_SET.has(normalizeWord(deobf))) return { code: 'profanity', match: deobf };
  }
  return null;
}

export function detectEmail(text = ''): Violation | null {
  const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
  const m = emailRegex.exec(text);
  return m ? { code: 'email', match: m[0] } : null;
}

export function detectURL(text = ''): Violation | null {
  const patterns = [
    /\bhttps?:\/\/[^\s]+/i,
    /\bwww\.[^\s]+/i,
    /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,})(?:\/[^\s]*)?/i
  ];
  for (const re of patterns) {
    const m = re.exec(String(text));
    if (m) return { code: 'url', match: m[0] };
  }
  return null;
}

export function countDigits(text = ''): number { return (String(text).match(/\d/g) || []).length; }
export function longestDigitRun(text = ''): number {
  let max = 0, cur = 0;
  for (const ch of String(text)) {
    if (ch >= '0' && ch <= '9') { cur++; if (cur > max) max = cur; }
    else cur = 0;
  }
  return max;
}

export function detectPhoneLike(text = ''): Violation | null {
  const run = longestDigitRun(text);
  const total = countDigits(text);
  if (run >= 6 || total >= 11) {
    return { code: 'phone', match: String(text).match(/\d[\d\s().+-]{5,}/)?.[0] || null };
  }
  return null;
}

function onlyDigits(v: string) { return String(v || '').replace(/\D/g, ''); }
export function isValidCPF(cpf: string): boolean {
  const d = onlyDigits(cpf);
  if (!d || d.length !== 11 || /^([0-9])\1{10}$/.test(d)) return false;
  let sum = 0, rest;
  for (let i = 1; i <= 9; i++) sum += parseInt(d.substring(i - 1, i)) * (11 - i);
  rest = (sum * 10) % 11; if (rest === 10 || rest === 11) rest = 0; if (rest !== parseInt(d.substring(9, 10))) return false;
  sum = 0; for (let i = 1; i <= 10; i++) sum += parseInt(d.substring(i - 1, i)) * (12 - i);
  rest = (sum * 10) % 11; if (rest === 10 || rest === 11) rest = 0; return rest === parseInt(d.substring(10, 11));
}

export function detectCPF(text = ''): Violation | null {
  const candidates = String(text).match(/\b\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[\s-]?\d{2}\b/g);
  if (!candidates) {
    const raw = String(text).match(/\d{11}/g);
    if (raw) {
      for (const c of raw) { if (isValidCPF(c)) return { code: 'cpf', match: c }; }
    }
    return null;
  }
  for (const c of candidates) {
    if (isValidCPF(c)) return { code: 'cpf', match: c };
  }
  return null;
}

export function checkProhibitedContent(text = ''): { ok: boolean; violations: Violation[] } {
  const violations: Violation[] = [];
  
  const vId = containsIdentitySensitive(text); if (vId) violations.push(vId);
  const v1 = containsProfanity(text); if (v1) violations.push(v1);
  const v2 = detectEmail(text); if (v2) violations.push(v2);
  const vUrl = detectURL(text); if (vUrl) violations.push(vUrl);
  const v3 = detectPhoneLike(text); if (v3) violations.push(v3);
  const v4 = detectCPF(text); if (v4) violations.push(v4);
  if (countDigits(text) > 5 && !violations.find(v => v.code === 'phone' || v.code === 'cpf')) {
    violations.push({ code: 'too_many_digits', match: null });
  }
  return { ok: violations.length === 0, violations };
}
