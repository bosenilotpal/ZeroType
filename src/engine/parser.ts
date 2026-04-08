// ============================================================
// Parser Engine — Multi-Intent Regex Detection
// Detects: Indian Phone Numbers, UPI IDs, Email, URLs, Addresses
// ============================================================

export type IntentType = 'phone' | 'upi' | 'address' | 'email' | 'url';

export interface Intent {
  id: string;
  type: IntentType;
  value: string;        // Raw value for actions (e.g., tel: link)
  display: string;      // Formatted display string
  confidence: 'high' | 'medium' | 'low';
}

// ── Regex Patterns ────────────────────────────────────────────

// Indian phone numbers: +91/0 prefix or bare 10-digit starting with 6-9
const PHONE_REGEX =
  /(?<!\d)(?:\+91[\s\-]?|91[\s\-]?|0)?(?:[6789]\d{9})(?!\d)/g;

// UPI ID: localpart@provider (e.g., john.doe@okaxis, 9876543210@upi)
const UPI_REGEX =
  /\b(?:[a-zA-Z0-9.\-_+]{2,64})@(?:okaxis|oksbi|okicici|okhdfcbank|ybl|ibl|axl|upi|paytm|apl|freecharge|airtelpaymentsbank|aubank|indus|kotak|sib|jsb|rbl|dlb|barodampay|uboi|utib|hsbc|citi|dbs|idbi|kvb|nsdl|pockets|wearable|slice|mahb|ezeepay|tapicici|tapAxis|idfcbank|jupitermoney|naviapp)\b/gi;

// Generic UPI fallback (any word@word pattern not already an email domain)
const UPI_GENERIC_REGEX =
  /\b(?:[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,20})\b/g;

// Email addresses
const EMAIL_REGEX =
  /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g;

// URLs
const URL_REGEX =
  /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/g;

// Indian PIN code (6 digits starting with 1-9)
const PINCODE_REGEX = /\b[1-9][0-9]{5}\b/g;

// Indian city/state keywords for address heuristic scoring
const CITY_KEYWORDS = [
  'mumbai', 'delhi', 'bangalore', 'bengaluru', 'hyderabad', 'chennai',
  'kolkata', 'pune', 'ahmedabad', 'jaipur', 'surat', 'lucknow',
  'kanpur', 'nagpur', 'indore', 'thane', 'bhopal', 'visakhapatnam',
  'pimpri', 'vadodara', 'ghaziabad', 'ludhiana', 'agra', 'nashik',
  'faridabad', 'meerut', 'rajkot', 'kalyan', 'vasai', 'varanasi',
  'srinagar', 'aurangabad', 'dhanbad', 'amritsar', 'navi mumbai',
  'allahabad', 'prayagraj', 'ranchi', 'howrah', 'coimbatore', 'jabalpur',
  'gwalior', 'vijayawada', 'jodhpur', 'madurai', 'raipur', 'kota',
];

const STATE_KEYWORDS = [
  'maharashtra', 'delhi', 'karnataka', 'telangana', 'tamil nadu',
  'west bengal', 'gujarat', 'rajasthan', 'uttar pradesh', 'andhra pradesh',
  'madhya pradesh', 'kerala', 'punjab', 'haryana', 'bihar',
  'jharkhand', 'assam', 'odisha', 'goa', 'himachal', 'uttarakhand',
];

const ADDRESS_TRIGGER_WORDS = [
  'road', 'rd', 'street', 'st', 'avenue', 'ave', 'lane', 'ln',
  'nagar', 'colony', 'sector', 'block', 'phase', 'plot', 'flat',
  'floor', 'building', 'tower', 'complex', 'layout', 'extension',
  'marg', 'vihar', 'enclave', 'society', 'cross', 'main', 'near',
  'opposite', 'opp', 'behind', 'next to', 'junction', 'chowk',
  'bazaar', 'bazar', 'market', 'gali', 'mohalla', 'village',
];

const PHONE_CONTEXT_POSITIVE = [
  'phone',
  'mobile',
  'mob',
  'call',
  'missed call',
  'whatsapp',
  'whats app',
  'contact',
  'helpline',
  'ivrs',
];

const PHONE_CONTEXT_NEGATIVE = [
  'invoice',
  'tax invoice',
  'booking',
  'cons no',
  'cons no/id',
  'id',
  'gst',
  'gstin',
  'hsn',
  'price',
  'qty',
  'quota',
  'loan',
  'subsidy',
  'date',
  'order',
];

// ── Helpers ───────────────────────────────────────────────────

function makeId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function normalizePhone(raw: string): string {
  // Strip everything except digits
  const digits = raw.replace(/\D/g, '');
  // Drop leading 91 (country code) down to 10 digits
  if (digits.length === 12 && digits.startsWith('91')) return '+91 ' + digits.slice(2, 7) + ' ' + digits.slice(7);
  if (digits.length === 11 && digits.startsWith('0')) return '+91 ' + digits.slice(1, 6) + ' ' + digits.slice(6);
  if (digits.length === 10) return '+91 ' + digits.slice(0, 5) + ' ' + digits.slice(5);
  return raw.trim();
}

function rawPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return '+91' + digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return '+91' + digits.slice(1);
  if (digits.length === 10) return '+91' + digits;
  return raw.trim();
}

function normalizeOcrDigits(input: string): string {
  // OCR commonly confuses these characters in phone numbers.
  return input
    .replace(/[Oo]/g, '0')
    .replace(/[Il|]/g, '1')
    .replace(/[Ss]/g, '5')
    .replace(/[B]/g, '8');
}

function toCanonicalPhoneDigits(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length === 10) return digits;
  return null;
}

function hasPhonePositiveContext(line: string): boolean {
  const lower = line.toLowerCase();
  return PHONE_CONTEXT_POSITIVE.some((keyword) => lower.includes(keyword));
}

function hasPhoneNegativeContext(line: string): boolean {
  const lower = line.toLowerCase();
  return PHONE_CONTEXT_NEGATIVE.some((keyword) => lower.includes(keyword));
}

function extractPhoneCandidates(rawText: string): string[] {
  const candidates = new Set<string>();
  const lines = rawText.split(/\n+/).map((line) => line.trim()).filter(Boolean);

  for (const line of lines) {
    const normalizedLine = normalizeOcrDigits(line);
    const positiveContext = hasPhonePositiveContext(line);
    const negativeContext = hasPhoneNegativeContext(line);

    // Strongly prefer explicit contact lines; aggressively skip known invoice/id lines.
    if (negativeContext && !positiveContext) continue;

    // 1) Primary regex on original line.
    const primary = line.match(PHONE_REGEX) ?? [];
    for (const m of primary) {
      const canonical = toCanonicalPhoneDigits(m);
      if (canonical) candidates.add(canonical);
    }

    // 2) Retry with OCR-digit normalization.
    const normalizedMatches = normalizedLine.match(PHONE_REGEX) ?? [];
    for (const m of normalizedMatches) {
      const canonical = toCanonicalPhoneDigits(m);
      if (canonical) candidates.add(canonical);
    }

    // 3) Handle fragmented values with separators but avoid slicing long IDs.
    const fragmentedRuns = normalizedLine.match(/[0-9][0-9\s\-()]{9,}/g) ?? [];
    for (const chunk of fragmentedRuns) {
      const digits = chunk.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 12) continue;
      const canonical =
        digits.length === 12 && digits.startsWith('91')
          ? digits.slice(2)
          : digits.length === 11 && digits.startsWith('0')
            ? digits.slice(1)
            : digits;
      if (/^[6789]\d{9}$/.test(canonical)) {
        candidates.add(canonical);
      }
    }
  }

  return [...candidates];
}

function scoreAddressLikelihood(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  if (PINCODE_REGEX.test(text)) { score += 3; PINCODE_REGEX.lastIndex = 0; }
  for (const city of CITY_KEYWORDS) if (lower.includes(city)) score += 2;
  for (const state of STATE_KEYWORDS) if (lower.includes(state)) score += 2;
  for (const word of ADDRESS_TRIGGER_WORDS) if (lower.includes(word)) score += 1;
  return score;
}

function extractAddresses(text: string): Intent[] {
  const intents: Intent[] = [];
  // Split text into line groups (addresses usually span 1-3 lines)
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  // Sliding window of 1–4 consecutive lines
  for (let i = 0; i < lines.length; i++) {
    for (let len = 1; len <= 4 && i + len <= lines.length; len++) {
      const candidate = lines.slice(i, i + len).join(', ');
      const score = scoreAddressLikelihood(candidate);
      if (score >= 3) {
        // Avoid duplicating subsets already captured
        const alreadyCaptured = intents.some((a) => a.display.includes(lines[i]));
        if (!alreadyCaptured) {
          intents.push({
            id: makeId(),
            type: 'address',
            value: candidate,
            display: candidate,
            confidence: score >= 5 ? 'high' : score >= 3 ? 'medium' : 'low',
          });
        }
        break; // Largest match wins for this start
      }
    }
  }
  return intents;
}

function looksEmailLike(value: string): boolean {
  const [local = '', provider = ''] = value.toLowerCase().split('@');
  if (!local || !provider) return false;

  const hasDigit = /\d/.test(local);
  const hasDot = local.includes('.');
  const providerLooksLongBrand = provider.length >= 6 && /^[a-z]+$/.test(provider);
  const providerLooksUpiish = /(upi|pay|bank|ok|axis|sbi|icici|hdfc|ybl|ibl|axl)/.test(provider);

  // Generic business/contact emails misread without TLD often look like this.
  if (!hasDigit && (hasDot || providerLooksLongBrand) && !providerLooksUpiish) {
    return true;
  }
  return false;
}

// ── Main Parse Function ───────────────────────────────────────

export function parseIntents(rawText: string): Intent[] {
  const intents: Intent[] = [];
  const seenValues = new Set<string>();

  // 1. URLs (extract before emails to avoid partial matches)
  const urlMatches = rawText.match(URL_REGEX) ?? [];
  for (const m of urlMatches) {
    if (!seenValues.has(m)) {
      seenValues.add(m);
      intents.push({ id: makeId(), type: 'url', value: m, display: m, confidence: 'high' });
    }
  }

  // 2. Email (before UPI to avoid overlap on generic @)
  const emailMatches = rawText.match(EMAIL_REGEX) ?? [];
  for (const m of emailMatches) {
    // Skip if already captured as URL
    if (!seenValues.has(m) && !urlMatches.some((u) => u.includes(m))) {
      seenValues.add(m);
      intents.push({ id: makeId(), type: 'email', value: m, display: m, confidence: 'high' });
    }
  }

  // 3. UPI IDs (known providers first, then generic)
  const textForUpi = rawText;
  const upiKnownMatches = [...textForUpi.matchAll(UPI_REGEX)].map((m) => m[0]);
  for (const m of upiKnownMatches) {
    if (!seenValues.has(m.toLowerCase())) {
      seenValues.add(m.toLowerCase());
      intents.push({ id: makeId(), type: 'upi', value: m, display: m, confidence: 'high' });
    }
  }

  // Generic UPI heuristic — only if not already captured as email/url/upi
  const upiGenericMatches = [...rawText.matchAll(UPI_GENERIC_REGEX)].map((m) => m[0]);
  for (const m of upiGenericMatches) {
    const lower = m.toLowerCase();
    const isEmail = emailMatches.some((e) => e.toLowerCase() === lower);
    const isUrl = urlMatches.some((u) => u.includes(m));
    const isEmailLike = looksEmailLike(lower);
    if (!seenValues.has(lower) && !isEmail && !isUrl && !isEmailLike) {
      seenValues.add(lower);
      intents.push({ id: makeId(), type: 'upi', value: m, display: m, confidence: 'medium' });
    }
  }

  // 4. Phone numbers
  const phoneMatches = extractPhoneCandidates(rawText);
  for (const m of phoneMatches) {
    const normalized = rawPhone(m);
    if (!seenValues.has(normalized)) {
      seenValues.add(normalized);
      intents.push({
        id: makeId(),
        type: 'phone',
        value: normalized,
        display: normalizePhone(m),
        confidence: 'high',
      });
    }
  }

  // 5. Addresses (heuristic scoring)
  const addresses = extractAddresses(rawText);
  for (const addr of addresses) {
    if (!seenValues.has(addr.value)) {
      seenValues.add(addr.value);
      intents.push(addr);
    }
  }

  // Sort by type priority: phone > upi > address > email > url
  const priority: Record<IntentType, number> = { phone: 0, upi: 1, address: 2, email: 3, url: 4 };
  return intents.sort((a, b) => priority[a.type] - priority[b.type]);
}
