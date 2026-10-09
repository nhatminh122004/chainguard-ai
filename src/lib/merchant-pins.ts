/**
 * Merchant pinned accounts ("QR Pinning") — ChainGuard AI
 *
 * The merchant registers the bank account(s) their QR standee should point to.
 * When a QR is scanned, the decoded account is compared against this list —
 * this is what catches a sticker-over (dán đè) QR, which still has a valid CRC.
 *
 * Stored in localStorage so it works in demo mode and offline at the counter.
 */

import type { PinnedAccount } from './vietqr';
import { normalizeAccount } from './vietqr';

const KEY = 'chainguard_pinned_accounts';
const EVENT = 'chainguard:pins-changed';

export function getPinnedAccounts(): PinnedAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(pins: PinnedAccount[]) {
  localStorage.setItem(KEY, JSON.stringify(pins));
  window.dispatchEvent(new Event(EVENT));
}

export function addPinnedAccount(pin: PinnedAccount): PinnedAccount[] {
  const accountNumber = normalizeAccount(pin.accountNumber);
  if (!accountNumber) throw new Error('Số tài khoản không hợp lệ');
  const pins = getPinnedAccounts().filter(
    (p) => !(normalizeAccount(p.accountNumber) === accountNumber && p.bankBin === pin.bankBin)
  );
  const next = [...pins, { ...pin, accountNumber }];
  save(next);
  return next;
}

export function removePinnedAccount(bankBin: string, accountNumber: string): PinnedAccount[] {
  const acc = normalizeAccount(accountNumber);
  const next = getPinnedAccounts().filter((p) => !(normalizeAccount(p.accountNumber) === acc && p.bankBin === bankBin));
  save(next);
  return next;
}

export function onPinsChanged(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
