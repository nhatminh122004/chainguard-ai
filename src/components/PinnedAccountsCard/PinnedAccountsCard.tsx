'use client';

import React, { useEffect, useState } from 'react';
import { BANK_BINS, maskAccount, type PinnedAccount } from '@/lib/vietqr';
import { addPinnedAccount, getPinnedAccounts, onPinsChanged, removePinnedAccount } from '@/lib/merchant-pins';
import { useToast } from '@/components/Toast/Toast';

const BANK_OPTIONS = Object.entries(BANK_BINS)
  .filter(([bin], i, arr) => arr.findIndex(([, name]) => name === BANK_BINS[bin]) === i)
  .sort((a, b) => a[1].localeCompare(b[1]));

/**
 * Settings card: register the merchant's own receiving accounts.
 * Used by the QR scanner to detect sticker-over (dán đè) QR codes.
 */
export default function PinnedAccountsCard() {
  const { showToast } = useToast();
  const [pins, setPins] = useState<PinnedAccount[]>([]);
  const [bankBin, setBankBin] = useState('970436');
  const [accountNumber, setAccountNumber] = useState('');
  const [label, setLabel] = useState('');

  useEffect(() => {
    setPins(getPinnedAccounts());
    return onPinsChanged(() => setPins(getPinnedAccounts()));
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!/^[0-9A-Za-z\s.\-]{4,25}$/.test(accountNumber)) throw new Error('Số tài khoản phải gồm 4–25 ký tự số/chữ');
      setPins(addPinnedAccount({ bankBin, accountNumber, label: label.trim() || undefined }));
      setAccountNumber('');
      setLabel('');
      showToast('success', 'Đã ghim tài khoản', 'Máy quét QR sẽ cảnh báo nếu mã QR trỏ tới tài khoản khác');
    } catch (err) {
      showToast('error', 'Không thể ghim', (err as Error).message);
    }
  };

  return (
    <div className="glass-card" id="pinned-accounts-card">
      <div className="card-header">
        <h3 className="card-title">📌 Tài khoản nhận tiền của cửa hàng (QR Pinning)</h3>
        <span className="badge badge-primary">Chống QR dán đè</span>
      </div>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Kẻ gian thường dán một mã VietQR <b>hợp lệ</b> của họ đè lên mã của quán — kiểm tra CRC không phát hiện được.
          Hãy đăng ký số tài khoản thật của bạn; khi quét, ChainGuard sẽ báo đỏ nếu tài khoản trong mã QR khác danh sách này.
          Dữ liệu chỉ lưu trên thiết bị này.
        </p>

        {pins.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            {pins.map((p) => (
              <li
                key={`${p.bankBin}-${p.accountNumber}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--space-sm)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(0, 230, 118, 0.06)',
                  border: '1px solid rgba(0, 230, 118, 0.25)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                    {BANK_BINS[p.bankBin] || p.bankBin} •{' '}
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{maskAccount(p.accountNumber)}</span>
                  </span>
                  {p.label && <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{p.label}</span>}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPins(removePinnedAccount(p.bankBin, p.accountNumber))}
                  aria-label={`Bỏ ghim ${maskAccount(p.accountNumber)}`}
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ fontSize: '0.82rem', color: 'var(--accent-amber)' }}>⚠️ Chưa ghim tài khoản nào.</div>
        )}

        <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-sm)', alignItems: 'end' }}>
          <label className="input-wrapper">
            <span className="input-label">Ngân hàng</span>
            <select id="pin-bank" className="input" value={bankBin} onChange={(e) => setBankBin(e.target.value)}>
              {BANK_OPTIONS.map(([bin, name]) => (
                <option key={bin} value={bin}>
                  {name} ({bin})
                </option>
              ))}
            </select>
          </label>
          <label className="input-wrapper">
            <span className="input-label">Số tài khoản</span>
            <input
              id="pin-account"
              className="input"
              inputMode="numeric"
              placeholder="VD: 1029384756"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
            />
          </label>
          <label className="input-wrapper">
            <span className="input-label">Ghi chú (tuỳ chọn)</span>
            <input id="pin-label" className="input" placeholder="Quầy chính" value={label} onChange={(e) => setLabel(e.target.value)} />
          </label>
          <button id="pin-add" type="submit" className="btn btn-primary btn-sm">
            ➕ Ghim tài khoản
          </button>
        </form>
      </div>
    </div>
  );
}
