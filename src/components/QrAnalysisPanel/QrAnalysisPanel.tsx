'use client';

import React from 'react';
import type { QrAnalysis, QrFinding } from '@/lib/vietqr';
import { formatVnd, maskAccount } from '@/lib/vietqr';
import './QrAnalysisPanel.css';

interface QrAnalysisPanelProps {
  analysis: QrAnalysis;
  /** Called when the merchant confirms this QR's account is their own. */
  onPinAccount?: (bankBin: string, accountNumber: string, label?: string) => void;
  /** Slot for extra badges (e.g. scam-registry lookup). */
  extra?: React.ReactNode;
}

const LEVEL_ICON: Record<QrFinding['level'], string> = {
  ok: '✅',
  info: 'ℹ️',
  warning: '🟡',
  danger: '🚨',
};

const VERDICT_TEXT = {
  SAFE: { label: 'MÃ QR HỢP LỆ', cls: 'safe' },
  SUSPICIOUS: { label: 'CẦN ĐỐI CHIẾU', cls: 'suspicious' },
  DANGER: { label: 'NGUY HIỂM — KHÔNG THANH TOÁN', cls: 'danger' },
} as const;

export default function QrAnalysisPanel({ analysis, onPinAccount, extra }: QrAnalysisPanelProps) {
  const v = VERDICT_TEXT[analysis.verdict];
  const d = analysis.data;
  const isPayment = analysis.kind === 'vietqr' || analysis.kind === 'emvco';

  const handlePin = () => {
    if (!d?.bankBin || !d.accountNumber || !onPinAccount) return;
    const ok = window.confirm(
      `Chỉ ghim nếu đây là mã QR CHÍNH CHỦ của cửa hàng bạn.\n\n${d.bankName || d.bankBin} • ${d.accountNumber}\n${d.merchantName || ''}\n\nGhim tài khoản này?`
    );
    if (ok) onPinAccount(d.bankBin, d.accountNumber, d.merchantName);
  };

  return (
    <div className={`qrpanel qrpanel-${v.cls} animate-scale-in`} id="qr-analysis-panel">
      {/* Verdict */}
      <div className="qrpanel-head">
        <div className={`qrpanel-score ${v.cls}`}>
          <span className="qrpanel-score-val">{analysis.riskScore}</span>
          <span className="qrpanel-score-lbl">rủi ro</span>
        </div>
        <div className="qrpanel-head-info">
          <span className={`qrpanel-verdict ${v.cls}`}>{v.label}</span>
          <h4 className="qrpanel-title">
            {analysis.kind === 'vietqr'
              ? `VietQR • ${d?.bankName || `BIN ${d?.bankBin || '?'}`}`
              : analysis.kind === 'emvco'
              ? 'Mã EMVCo (không phải VietQR)'
              : analysis.kind === 'url'
              ? 'Mã QR chứa đường link'
              : 'Mã QR văn bản'}
          </h4>
          <div className="qrpanel-chips">
            {analysis.crcValid !== null && (
              <span className={`qrpanel-chip ${analysis.crcValid ? 'ok' : 'bad'}`}>
                {analysis.crcValid ? '✔ CRC khớp' : '✘ CRC sai'}
              </span>
            )}
            {isPayment && (
              <span className={`qrpanel-chip ${analysis.structureValid ? 'ok' : 'bad'}`}>
                {analysis.structureValid ? '✔ Cấu trúc EMVCo' : '✘ Cấu trúc hỏng'}
              </span>
            )}
            {analysis.pinCheck?.status === 'match' && <span className="qrpanel-chip ok">📌 Đúng TK cửa hàng</span>}
            {analysis.pinCheck?.status === 'mismatch' && <span className="qrpanel-chip bad">📌 Sai TK cửa hàng</span>}
            {analysis.urlRisk && (
              <span className={`qrpanel-chip ${analysis.urlRisk.score >= 50 ? 'bad' : 'warn'}`}>
                🌐 URL rủi ro {analysis.urlRisk.score}/100
              </span>
            )}
          </div>
        </div>
      </div>

      {extra}

      {/* Decoded payment fields */}
      {isPayment && d && (
        <div className="qrpanel-grid">
          <Field label="Ngân hàng" value={d.bankName ? `${d.bankName} (${d.bankBin})` : d.bankBin || '—'} />
          <Field label="Số tài khoản" value={d.accountNumber || '—'} mono />
          <Field label="Tên thụ hưởng" value={d.merchantName || 'Không ghi'} />
          <Field label="Số tiền" value={d.amount ? formatVnd(d.amount) : 'Người trả tự nhập'} mono />
          <Field label="Nội dung" value={d.purpose || '—'} />
          <Field
            label="Loại mã"
            value={d.initiationMethod === 'dynamic' ? 'QR động (có số tiền)' : d.initiationMethod === 'static' ? 'QR tĩnh' : '—'}
          />
          {d.serviceLabel && <Field label="Dịch vụ" value={d.serviceLabel} />}
          <Field label="Tiền tệ / Quốc gia" value={`${d.currency === '704' ? 'VND' : d.currency || '—'} • ${d.country || '—'}`} />
        </div>
      )}

      {/* URL details */}
      {analysis.urlRisk && (
        <div className="qrpanel-url">
          <span className="qrpanel-url-label">Đường link đích</span>
          <code className="qrpanel-url-val">{analysis.urlRisk.url}</code>
          <div className="qrpanel-bar">
            <div className="qrpanel-bar-fill" style={{ width: `${analysis.urlRisk.score}%` }} />
          </div>
        </div>
      )}

      {/* Findings */}
      <ul className="qrpanel-findings">
        {analysis.findings.map((f, i) => (
          <li key={`${f.code}-${i}`} className={`qrpanel-finding ${f.level}`}>
            <span className="qrpanel-finding-icon">{LEVEL_ICON[f.level]}</span>
            <span>{f.message}</span>
          </li>
        ))}
      </ul>

      {/* Pin action */}
      {onPinAccount && d?.accountNumber && d.bankBin && analysis.pinCheck?.status !== 'match' && analysis.crcValid && (
        <button id="qr-pin-account" type="button" className="btn btn-secondary btn-sm qrpanel-pin" onClick={handlePin}>
          📌 Ghim {maskAccount(d.accountNumber)} làm tài khoản cửa hàng
        </button>
      )}

      {/* Raw payload for technical judges */}
      <details className="qrpanel-raw">
        <summary>🧬 Dữ liệu thô &amp; cấu trúc TLV</summary>
        <code className="qrpanel-raw-str">{analysis.raw}</code>
        {analysis.fields && analysis.fields.length > 0 && (
          <table className="qrpanel-tlv">
            <thead>
              <tr>
                <th>Tag</th>
                <th>Len</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {analysis.fields.map((f, i) => (
                <tr key={`${f.tag}-${i}`}>
                  <td>{f.tag}</td>
                  <td>{f.length}</td>
                  <td>{f.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {d?.crcComputed && (
          <p className="qrpanel-crc-line">
            CRC khai báo: <b>{d.crcDeclared}</b> • CRC tính lại: <b>{d.crcComputed}</b>
          </p>
        )}
      </details>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="qrpanel-field">
      <span className="qrpanel-field-label">{label}</span>
      <span className={`qrpanel-field-val ${mono ? 'mono' : ''}`}>{value}</span>
    </div>
  );
}
