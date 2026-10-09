/**
 * VietQR / EMVCo Merchant-Presented QR parser — ChainGuard AI
 *
 * Pure TypeScript (no DOM / no imports) so it can run in the browser,
 * in API routes, and in `node scripts/test-vietqr.mjs`.
 *
 * What this module CAN detect:
 *  - Malformed EMVCo structure (bad TLV lengths, missing mandatory tags)
 *  - CRC mismatch → the QR string was edited without recomputing the checksum
 *  - Non-VND currency / non-VN country on a "VietQR"
 *  - Account mismatch vs. the merchant's pinned accounts ("QR Pinning")
 *  - Risky URLs embedded in a QR (heuristics only)
 *
 * What it CANNOT detect on its own:
 *  - A brand-new, well-formed VietQR pointing at a scammer's account.
 *    Its CRC is valid. Only QR Pinning (or a blacklist lookup) catches that.
 */

// ============================================
// Types
// ============================================

export interface TlvField {
  tag: string;
  length: number;
  value: string;
}

export type QrKind = 'vietqr' | 'emvco' | 'url' | 'text';
export type FindingLevel = 'ok' | 'info' | 'warning' | 'danger';

export interface QrFinding {
  level: FindingLevel;
  code: string;
  message: string;
}

export interface VietQrData {
  formatIndicator?: string; // tag 00
  initiationMethod?: 'static' | 'dynamic' | 'unknown'; // tag 01
  guid?: string; // 38.00
  bankBin?: string; // 38.01.00
  bankName?: string;
  accountNumber?: string; // 38.01.01
  serviceCode?: string; // 38.02
  serviceLabel?: string;
  merchantCategoryCode?: string; // 52
  currency?: string; // 53
  amount?: string; // 54
  country?: string; // 58
  merchantName?: string; // 59
  merchantCity?: string; // 60
  purpose?: string; // 62.08
  billNumber?: string; // 62.01
  crcDeclared?: string; // 63
  crcComputed?: string;
}

export interface UrlRisk {
  url: string;
  host: string;
  score: number; // 0 - 100
  reasons: string[];
}

export interface PinCheck {
  status: 'match' | 'mismatch' | 'no_pins';
  matched?: PinnedAccount;
}

export interface QrAnalysis {
  kind: QrKind;
  raw: string;
  structureValid: boolean;
  crcValid: boolean | null; // null = not applicable (URL / text)
  data?: VietQrData;
  fields?: TlvField[];
  urlRisk?: UrlRisk;
  pinCheck?: PinCheck;
  findings: QrFinding[];
  verdict: 'SAFE' | 'SUSPICIOUS' | 'DANGER';
  riskScore: number; // 0 - 100
}

export interface PinnedAccount {
  bankBin: string;
  accountNumber: string;
  label?: string;
}

// ============================================
// Constants
// ============================================

export const VIETQR_GUID = 'A000000727';

/** Common NAPAS bank BINs. Unknown BINs are reported as info, not as fraud. */
export const BANK_BINS: Record<string, string> = {
  '970436': 'Vietcombank',
  '970422': 'MB Bank',
  '970407': 'Techcombank',
  '970418': 'BIDV',
  '970415': 'VietinBank',
  '970416': 'ACB',
  '970432': 'VPBank',
  '970423': 'TPBank',
  '970405': 'Agribank',
  '970499': 'Agribank',
  '970403': 'Sacombank',
  '970441': 'VIB',
  '970443': 'SHB',
  '970431': 'Eximbank',
  '970426': 'MSB',
  '970437': 'HDBank',
  '970448': 'OCB',
  '970454': 'BVBank (Viet Capital)',
  '970429': 'SCB',
  '970440': 'SeABank',
  '970449': 'LPBank',
  '970409': 'Bac A Bank',
  '970412': 'PVcomBank',
  '970425': 'ABBank',
  '970427': 'VietABank',
  '970428': 'Nam A Bank',
  '970430': 'PG Bank',
  '970438': 'BaoViet Bank',
  '970452': 'KienlongBank',
  '970400': 'Saigonbank',
  '970419': 'NCB',
  '970406': 'DongA Bank',
  '970408': 'GPBank',
  '970414': 'OceanBank',
  '970433': 'VietBank',
  '970424': 'Shinhan Bank',
  '970457': 'Woori Bank',
};

const SERVICE_CODES: Record<string, string> = {
  QRIBFTTA: 'Chuyển nhanh Napas247 đến tài khoản',
  QRIBFTTC: 'Chuyển nhanh Napas247 đến thẻ',
  QRPUSH: 'Thanh toán QR Push',
  QRCASH: 'Rút tiền bằng QR',
};

// ============================================
// CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) — EMVCo checksum
// ============================================

export function crc16CcittFalse(input: string): string {
  const bytes = utf8Bytes(input);
  let crc = 0xffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i] << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function utf8Bytes(s: string): number[] {
  if (typeof TextEncoder !== 'undefined') return Array.from(new TextEncoder().encode(s));
  // Fallback (ASCII only)
  return s.split('').map((ch) => ch.charCodeAt(0) & 0xff);
}

// ============================================
// TLV parsing
// ============================================

/** Parses an EMVCo TLV string. Throws if any length is invalid. */
export function parseTlv(input: string): TlvField[] {
  const fields: TlvField[] = [];
  let i = 0;
  while (i < input.length) {
    if (i + 4 > input.length) throw new Error(`TLV bị cắt cụt ở vị trí ${i}`);
    const tag = input.slice(i, i + 2);
    const lenStr = input.slice(i + 2, i + 4);
    if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(lenStr)) {
      throw new Error(`Tag/độ dài không hợp lệ ở vị trí ${i}: "${tag}${lenStr}"`);
    }
    const length = parseInt(lenStr, 10);
    const value = input.slice(i + 4, i + 4 + length);
    if (value.length !== length) throw new Error(`Tag ${tag} khai báo dài ${length} nhưng chỉ còn ${value.length} ký tự`);
    fields.push({ tag, length, value });
    i += 4 + length;
  }
  return fields;
}

function tlv(tag: string, value: string): string {
  return `${tag}${String(value.length).padStart(2, '0')}${value}`;
}

function get(fields: TlvField[], tag: string): string | undefined {
  return fields.find((f) => f.tag === tag)?.value;
}

function safeParseTlv(value: string | undefined): TlvField[] {
  if (!value) return [];
  try {
    return parseTlv(value);
  } catch {
    return [];
  }
}

// ============================================
// Builder (used for tests and demo presets)
// ============================================

export interface BuildVietQrInput {
  bankBin: string;
  accountNumber: string;
  amount?: number;
  purpose?: string;
  merchantName?: string;
  merchantCity?: string;
  service?: 'QRIBFTTA' | 'QRIBFTTC';
}

export function buildVietQr(input: BuildVietQrInput): string {
  const beneficiary = tlv('00', input.bankBin) + tlv('01', input.accountNumber);
  const merchantInfo = tlv('00', VIETQR_GUID) + tlv('01', beneficiary) + tlv('02', input.service || 'QRIBFTTA');
  let payload =
    tlv('00', '01') +
    tlv('01', input.amount ? '12' : '11') +
    tlv('38', merchantInfo) +
    tlv('53', '704');
  if (input.amount) payload += tlv('54', String(Math.round(input.amount)));
  payload += tlv('58', 'VN');
  if (input.merchantName) payload += tlv('59', input.merchantName.slice(0, 25));
  if (input.merchantCity) payload += tlv('60', input.merchantCity.slice(0, 15));
  if (input.purpose) payload += tlv('62', tlv('08', input.purpose.slice(0, 25)));
  payload += '6304';
  return payload + crc16CcittFalse(payload);
}

// ============================================
// Account helpers
// ============================================

export function normalizeAccount(acc: string): string {
  return (acc || '').replace(/[\s.\-]/g, '').toUpperCase();
}

export function maskAccount(acc: string): string {
  const a = normalizeAccount(acc);
  if (a.length <= 6) return a.replace(/.(?=.{2})/g, '*');
  return `${a.slice(0, 4)}${'*'.repeat(Math.max(2, a.length - 6))}${a.slice(-2)}`;
}

export function checkPinnedAccounts(
  bankBin: string | undefined,
  accountNumber: string | undefined,
  pins: PinnedAccount[]
): PinCheck {
  if (!pins || pins.length === 0) return { status: 'no_pins' };
  const acc = normalizeAccount(accountNumber || '');
  const matched = pins.find(
    (p) => normalizeAccount(p.accountNumber) === acc && (!p.bankBin || p.bankBin === bankBin)
  );
  return matched ? { status: 'match', matched } : { status: 'mismatch' };
}

// ============================================
// URL heuristics
// ============================================

const URL_SHORTENERS = [
  'bit.ly', 'tinyurl.com', 't.ly', 'goo.gl', 'is.gd', 'cutt.ly', 'rebrand.ly', 'shorturl.at',
  'ow.ly', 's.id', 'rb.gy', 't.co', 'tiny.cc', 'shorte.st', 'bom.so', 'urlgo.vn',
];

const RISKY_TLDS = ['xyz', 'top', 'click', 'icu', 'buzz', 'online', 'site', 'live', 'shop', 'cc', 'tk', 'ml', 'ga', 'cf', 'gq', 'cyou', 'sbs'];

/** Brand keyword → official registrable domains. Hosts containing the keyword but not on these domains are flagged. */
const BRAND_DOMAINS: Record<string, string[]> = {
  vietcombank: ['vietcombank.com.vn'],
  vcb: ['vietcombank.com.vn'],
  techcombank: ['techcombank.com', 'techcombank.com.vn'],
  mbbank: ['mbbank.com.vn'],
  bidv: ['bidv.com.vn'],
  vietinbank: ['vietinbank.vn'],
  agribank: ['agribank.com.vn'],
  tpbank: ['tpb.vn', 'tpbank.vn'],
  vpbank: ['vpbank.com.vn'],
  sacombank: ['sacombank.com.vn'],
  momo: ['momo.vn'],
  zalopay: ['zalopay.vn'],
  napas: ['napas.com.vn'],
};

const PHISHING_PATH_WORDS = ['login', 'signin', 'verify', 'otp', 'xac-thuc', 'xacthuc', 'dang-nhap', 'dangnhap', 'nhan-thuong', 'nhanthuong', 'khuyen-mai', 'update', 'secure'];

export function looksLikeUrl(raw: string): boolean {
  const s = raw.trim();
  return /^[a-z][a-z0-9+.\-]*:\/\//i.test(s) || /^(javascript|data|intent|sms|tel):/i.test(s) || /^www\./i.test(s);
}

export function assessUrl(raw: string): UrlRisk {
  const reasons: string[] = [];
  let score = 0;
  const trimmed = raw.trim();
  const candidate = /^www\./i.test(trimmed) ? `http://${trimmed}` : trimmed;

  let parsed: URL | null = null;
  try {
    parsed = new URL(candidate);
  } catch {
    return { url: trimmed, host: '', score: 60, reasons: ['Không phân tích được cấu trúc URL'] };
  }

  const scheme = parsed.protocol.replace(':', '').toLowerCase();
  const host = parsed.hostname.toLowerCase();

  if (['javascript', 'data', 'intent', 'file', 'vbscript'].includes(scheme)) {
    score += 90;
    reasons.push(`Lược đồ nguy hiểm "${scheme}:" có thể thực thi mã hoặc mở ứng dụng`);
  } else if (scheme === 'http') {
    score += 20;
    reasons.push('Không mã hóa HTTPS — dữ liệu nhập vào có thể bị đánh cắp');
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[')) {
    score += 40;
    reasons.push('Tên miền là địa chỉ IP trần — dấu hiệu điển hình của trang lừa đảo');
  }

  if (host.split('.').some((label) => label.startsWith('xn--'))) {
    score += 40;
    reasons.push('Tên miền punycode (xn--) — có thể giả mạo ký tự giống tên ngân hàng');
  }

  if (URL_SHORTENERS.some((s) => host === s || host.endsWith(`.${s}`))) {
    score += 30;
    reasons.push('Link rút gọn che giấu đích đến thật');
  }

  const tld = host.split('.').pop() || '';
  if (RISKY_TLDS.includes(tld)) {
    score += 20;
    reasons.push(`Đuôi tên miền ".${tld}" thường bị dùng cho trang lừa đảo giá rẻ`);
  }

  for (const [brand, officials] of Object.entries(BRAND_DOMAINS)) {
    if (host.includes(brand)) {
      const isOfficial = officials.some((d) => host === d || host.endsWith(`.${d}`));
      if (!isOfficial) {
        score += 45;
        reasons.push(`Chứa thương hiệu "${brand}" nhưng KHÔNG phải tên miền chính thức (${officials.join(', ')})`);
      }
      break;
    }
  }

  const pathAndQuery = `${parsed.pathname}${parsed.search}`.toLowerCase();
  const hitWords = PHISHING_PATH_WORDS.filter((w) => pathAndQuery.includes(w) || host.includes(w));
  if (hitWords.length > 0) {
    score += 15;
    reasons.push(`Từ khóa thường gặp ở trang phishing: ${hitWords.join(', ')}`);
  }

  if (trimmed.includes('@') && scheme.startsWith('http')) {
    score += 25;
    reasons.push('URL chứa ký tự "@" — có thể che giấu tên miền thật');
  }

  if (host.split('.').length > 4) {
    score += 10;
    reasons.push('Quá nhiều tên miền con — kỹ thuật che giấu tên miền thật');
  }

  if (reasons.length === 0) reasons.push('Không phát hiện dấu hiệu rủi ro theo heuristic (không đảm bảo an toàn tuyệt đối)');

  return { url: trimmed, host, score: Math.min(100, score), reasons };
}

// ============================================
// Main analyzer
// ============================================

export function analyzeQrPayload(rawInput: string, pins: PinnedAccount[] = []): QrAnalysis {
  const raw = (rawInput || '').trim();
  const findings: QrFinding[] = [];

  // --- URL QR ---
  if (looksLikeUrl(raw)) {
    const urlRisk = assessUrl(raw);
    findings.push({
      level: 'warning',
      code: 'NOT_PAYMENT_QR',
      message: 'Đây KHÔNG phải mã VietQR thanh toán mà là một đường link. Mã nhận tiền hợp lệ không yêu cầu mở website.',
    });
    urlRisk.reasons.forEach((r) =>
      findings.push({ level: urlRisk.score >= 50 ? 'danger' : urlRisk.score >= 20 ? 'warning' : 'info', code: 'URL_RISK', message: r })
    );
    const riskScore = Math.max(30, urlRisk.score);
    return {
      kind: 'url',
      raw,
      structureValid: true,
      crcValid: null,
      urlRisk,
      findings,
      riskScore,
      verdict: riskScore >= 60 ? 'DANGER' : 'SUSPICIOUS',
    };
  }

  // --- EMVCo? ---
  if (!raw.startsWith('000201') && !raw.startsWith('000202')) {
    findings.push({ level: 'info', code: 'PLAIN_TEXT', message: 'Mã QR chứa văn bản thông thường, không phải mã thanh toán VietQR/EMVCo.' });
    return { kind: 'text', raw, structureValid: false, crcValid: null, findings, riskScore: 20, verdict: 'SUSPICIOUS' };
  }

  let fields: TlvField[] = [];
  let structureValid = true;
  try {
    fields = parseTlv(raw);
  } catch (e) {
    structureValid = false;
    findings.push({ level: 'danger', code: 'TLV_INVALID', message: `Cấu trúc EMVCo bị hỏng: ${(e as Error).message}` });
  }

  const data: VietQrData = {};

  // CRC: computed over everything up to and including "6304"
  const crcIdx = raw.lastIndexOf('6304');
  let crcValid = false;
  if (crcIdx >= 0 && crcIdx + 8 === raw.length) {
    data.crcDeclared = raw.slice(crcIdx + 4).toUpperCase();
    data.crcComputed = crc16CcittFalse(raw.slice(0, crcIdx + 4));
    crcValid = data.crcDeclared === data.crcComputed;
    findings.push(
      crcValid
        ? { level: 'ok', code: 'CRC_OK', message: `Mã kiểm tra CRC khớp (${data.crcComputed}) — chuỗi QR không bị sửa thủ công sau khi tạo.` }
        : {
            level: 'danger',
            code: 'CRC_MISMATCH',
            message: `CRC KHÔNG khớp (khai báo ${data.crcDeclared}, tính được ${data.crcComputed}) — nội dung QR (số tài khoản / số tiền) đã bị chỉnh sửa.`,
          }
    );
  } else {
    findings.push({ level: 'danger', code: 'CRC_MISSING', message: 'Thiếu trường CRC (tag 63) ở cuối chuỗi — không đúng chuẩn EMVCo.' });
  }

  if (fields.length > 0) {
    data.formatIndicator = get(fields, '00');
    const init = get(fields, '01');
    data.initiationMethod = init === '11' ? 'static' : init === '12' ? 'dynamic' : 'unknown';
    data.merchantCategoryCode = get(fields, '52');
    data.currency = get(fields, '53');
    data.amount = get(fields, '54');
    data.country = get(fields, '58');
    data.merchantName = get(fields, '59');
    data.merchantCity = get(fields, '60');

    const additional = safeParseTlv(get(fields, '62'));
    data.billNumber = get(additional, '01');
    data.purpose = get(additional, '08');

    if (fields[0]?.tag !== '00' || data.formatIndicator !== '01') {
      findings.push({ level: 'warning', code: 'FORMAT_INDICATOR', message: 'Tag 00 (Payload Format Indicator) không đứng đầu hoặc khác "01".' });
    }

    // Merchant account info: VietQR uses tag 38 with GUID A000000727
    const merchant = safeParseTlv(get(fields, '38'));
    data.guid = get(merchant, '00');
    if (data.guid === VIETQR_GUID) {
      const beneficiary = safeParseTlv(get(merchant, '01'));
      data.bankBin = get(beneficiary, '00');
      data.accountNumber = get(beneficiary, '01');
      data.serviceCode = get(merchant, '02');
      data.serviceLabel = data.serviceCode ? SERVICE_CODES[data.serviceCode] || 'Không xác định' : undefined;
      data.bankName = data.bankBin ? BANK_BINS[data.bankBin] : undefined;

      if (!data.bankBin || !data.accountNumber) {
        findings.push({ level: 'danger', code: 'BENEFICIARY_MISSING', message: 'Thiếu mã BIN ngân hàng hoặc số tài khoản thụ hưởng.' });
      } else if (!data.bankName) {
        findings.push({ level: 'info', code: 'BIN_UNKNOWN', message: `BIN ${data.bankBin} không có trong danh sách ngân hàng phổ biến — hãy đối chiếu thủ công.` });
      }
    } else {
      const otherTemplates = fields.filter((f) => Number(f.tag) >= 26 && Number(f.tag) <= 51);
      findings.push({
        level: otherTemplates.length > 0 ? 'info' : 'warning',
        code: 'NOT_VIETQR',
        message:
          otherTemplates.length > 0
            ? 'Mã EMVCo hợp lệ nhưng không dùng định danh VietQR (A000000727) — có thể là ví điện tử hoặc mạng thẻ khác.'
            : 'Không tìm thấy thông tin tài khoản thụ hưởng (tag 26–51).',
      });
    }

    if (data.currency && data.currency !== '704') {
      findings.push({ level: 'warning', code: 'CURRENCY', message: `Mã tiền tệ ${data.currency} không phải VND (704).` });
    }
    if (data.country && data.country !== 'VN') {
      findings.push({ level: 'warning', code: 'COUNTRY', message: `Mã quốc gia "${data.country}" không phải VN.` });
    }
    if (data.amount && !/^\d+(\.\d{1,2})?$/.test(data.amount)) {
      findings.push({ level: 'danger', code: 'AMOUNT_FORMAT', message: `Số tiền "${data.amount}" sai định dạng.` });
    }
  }

  // QR Pinning
  let pinCheck: PinCheck | undefined;
  if (data.accountNumber) {
    pinCheck = checkPinnedAccounts(data.bankBin, data.accountNumber, pins);
    if (pinCheck.status === 'match') {
      findings.push({
        level: 'ok',
        code: 'PIN_MATCH',
        message: `Tài khoản trùng khớp với tài khoản đã đăng ký của cửa hàng${pinCheck.matched?.label ? ` (${pinCheck.matched.label})` : ''}.`,
      });
    } else if (pinCheck.status === 'mismatch') {
      findings.push({
        level: 'danger',
        code: 'PIN_MISMATCH',
        message: 'Tài khoản trong QR KHÁC với mọi tài khoản cửa hàng đã đăng ký — dấu hiệu QR bị DÁN ĐÈ. Không nhận thanh toán qua mã này.',
      });
    } else {
      findings.push({
        level: 'warning',
        code: 'PIN_NONE',
        message: 'Chưa xác minh chủ tài khoản: chưa đăng ký tài khoản cửa hàng nên không thể phát hiện QR bị dán đè (CRC không bắt được trường hợp này). Hãy ghim tài khoản trong Cài đặt.',
      });
    }
  }

  // Score
  let riskScore = 0;
  for (const f of findings) {
    if (f.level === 'danger') riskScore += 45;
    else if (f.level === 'warning') riskScore += 15;
  }
  riskScore = Math.min(100, riskScore);
  if (riskScore === 0 && pinCheck?.status !== 'match') riskScore = 10; // valid but unverified owner

  const verdict: QrAnalysis['verdict'] = riskScore >= 45 ? 'DANGER' : riskScore >= 15 ? 'SUSPICIOUS' : 'SAFE';

  return {
    kind: data.guid === VIETQR_GUID ? 'vietqr' : 'emvco',
    raw,
    structureValid,
    crcValid,
    data,
    fields,
    pinCheck,
    findings,
    riskScore,
    verdict,
  };
}

export function formatVnd(amount?: string | number): string {
  if (amount === undefined || amount === '') return '';
  const n = typeof amount === 'number' ? amount : Number(amount);
  if (Number.isNaN(n)) return String(amount);
  return `${new Intl.NumberFormat('vi-VN').format(n)} ₫`;
}
