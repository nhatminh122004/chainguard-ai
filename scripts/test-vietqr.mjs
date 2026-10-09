// Run: node scripts/test-vietqr.mjs   (Node >= 23.6 strips TS types natively)
import assert from 'node:assert/strict';
import {
  crc16CcittFalse,
  buildVietQr,
  analyzeQrPayload,
  parseTlv,
  assessUrl,
  maskAccount,
} from '../src/lib/vietqr.ts';

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✔ ${name}`);
  } catch (e) {
    console.error(`  ✘ ${name}\n    ${e.message}`);
    process.exitCode = 1;
  }
}

console.log('VietQR / EMVCo tests');

test('CRC-16/CCITT-FALSE standard check vector "123456789" = 29B1', () => {
  assert.equal(crc16CcittFalse('123456789'), '29B1');
});

const legit = buildVietQr({
  bankBin: '970436',
  accountNumber: '1029384756',
  amount: 250000,
  merchantName: 'NGUYEN HOANG MINH',
  purpose: 'Thanh toan don 489',
});

test('builder output parses as valid TLV and ends with 6304 + CRC', () => {
  const fields = parseTlv(legit);
  assert.equal(fields[0].tag, '00');
  assert.equal(fields.at(-1).tag, '63');
  assert.equal(fields.at(-1).length, 4);
});

test('round-trip: parsed fields match builder input, CRC valid', () => {
  const a = analyzeQrPayload(legit);
  assert.equal(a.kind, 'vietqr');
  assert.equal(a.crcValid, true);
  assert.equal(a.data.bankBin, '970436');
  assert.equal(a.data.bankName, 'Vietcombank');
  assert.equal(a.data.accountNumber, '1029384756');
  assert.equal(a.data.amount, '250000');
  assert.equal(a.data.currency, '704');
  assert.equal(a.data.purpose, 'Thanh toan don 489');
  assert.equal(a.data.initiationMethod, 'dynamic');
});

test('editing one digit of the amount → CRC mismatch, DANGER', () => {
  const tampered = legit.replace('5406250000', '5406950000');
  assert.notEqual(tampered, legit);
  const a = analyzeQrPayload(tampered);
  assert.equal(a.crcValid, false);
  assert.equal(a.verdict, 'DANGER');
  assert.ok(a.findings.some((f) => f.code === 'CRC_MISMATCH'));
});

test('editing account number → CRC mismatch', () => {
  const tampered = legit.replace('1029384756', '1029384799');
  assert.equal(analyzeQrPayload(tampered).crcValid, false);
});

test('swapped QR (valid CRC, different account) → passes CRC, caught only by pinning', () => {
  const swapped = buildVietQr({ bankBin: '970422', accountNumber: '0987654321', merchantName: 'NGUYEN HOANG MINH' });
  const pins = [{ bankBin: '970436', accountNumber: '1029384756', label: 'Quầy chính' }];
  const noPins = analyzeQrPayload(swapped);
  assert.equal(noPins.crcValid, true);
  assert.notEqual(noPins.verdict, 'DANGER');
  const withPins = analyzeQrPayload(swapped, pins);
  assert.equal(withPins.pinCheck.status, 'mismatch');
  assert.equal(withPins.verdict, 'DANGER');
});

test('pinned account match → SAFE', () => {
  const pins = [{ bankBin: '970436', accountNumber: '1029 384 756' }];
  const a = analyzeQrPayload(legit, pins);
  assert.equal(a.pinCheck.status, 'match');
  assert.equal(a.verdict, 'SAFE');
});

test('truncated payload → structure invalid', () => {
  const a = analyzeQrPayload(legit.slice(0, 40));
  assert.equal(a.structureValid, false);
  assert.equal(a.verdict, 'DANGER');
});

test('phishing URL (brand lookalike + .xyz + http + otp) → DANGER', () => {
  const a = analyzeQrPayload('http://vcb-nhanthuong-otp.xyz/login');
  assert.equal(a.kind, 'url');
  assert.equal(a.verdict, 'DANGER');
  assert.ok(a.urlRisk.score >= 60, `score ${a.urlRisk.score}`);
});

test('official bank domain over https → low URL score', () => {
  const r = assessUrl('https://www.vietcombank.com.vn/');
  assert.ok(r.score < 20, `score ${r.score}`);
});

test('javascript: scheme → very high risk', () => {
  assert.ok(assessUrl('javascript:alert(1)').score >= 90);
});

test('maskAccount hides middle digits', () => {
  assert.equal(maskAccount('1029384756'), '1029****56');
});

console.log(`\n${passed} passed${process.exitCode ? ', some FAILED' : ''}`);
