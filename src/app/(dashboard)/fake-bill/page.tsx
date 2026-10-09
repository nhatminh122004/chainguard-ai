'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { analyzeFakeBillAndQR, FakeBillAnalysisResult } from '@/lib/gemini';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast/Toast';
import { createFraudAlert } from '@/lib/firestore';
import { useRouter } from 'next/navigation';
import { createPresets, PresetItem } from './samplePresets';
import CameraScanner, { CameraMode } from '@/components/CameraScanner/CameraScanner';
import QrAnalysisPanel from '@/components/QrAnalysisPanel/QrAnalysisPanel';
import { analyzeQrPayload, QrAnalysis } from '@/lib/vietqr';
import { decodeQrFromDataUrl } from '@/lib/qr-decoder';
import { addPinnedAccount, getPinnedAccounts, onPinsChanged } from '@/lib/merchant-pins';
import './fake-bill.css';

export default function FakeBillPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/png');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<FakeBillAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [isSavingAlert, setIsSavingAlert] = useState(false);
  const [isAlertSaved, setIsAlertSaved] = useState(false);
  const [presets, setPresets] = useState<PresetItem[]>([]);

  // Camera + on-device VietQR analysis
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>('qr');
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [qrAnalysis, setQrAnalysis] = useState<QrAnalysis | null>(null);
  const [isDecodingQr, setIsDecodingQr] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize presets on client
  useEffect(() => {
    setPresets(createPresets());
  }, []);

  // Re-evaluate the current QR whenever pinned accounts change
  useEffect(() => {
    if (!qrPayload) return;
    return onPinsChanged(() => setQrAnalysis(analyzeQrPayload(qrPayload, getPinnedAccounts())));
  }, [qrPayload]);

  const clearQr = () => {
    setQrPayload(null);
    setQrAnalysis(null);
  };

  const announceQr = useCallback(
    (analysis: QrAnalysis) => {
      if (analysis.verdict === 'DANGER') {
        showToast('error', 'MÃ QR NGUY HIỂM!', analysis.findings.find((f) => f.level === 'danger')?.message.slice(0, 90) || '');
      } else if (analysis.verdict === 'SUSPICIOUS') {
        showToast('warning', 'Mã QR cần đối chiếu', `Điểm rủi ro ${analysis.riskScore}/100`);
      } else {
        showToast('success', 'Mã VietQR hợp lệ', analysis.data?.bankName || 'CRC khớp');
      }
    },
    [showToast]
  );

  const applyQrPayload = useCallback(
    (payload: string) => {
      const analysis = analyzeQrPayload(payload, getPinnedAccounts());
      setQrPayload(payload);
      setQrAnalysis(analysis);
      announceQr(analysis);
    },
    [announceQr]
  );

  /** Decodes any QR inside the image on-device (no Gemini call needed). */
  const runLocalQrCheck = useCallback(
    async (dataUrl: string) => {
      setIsDecodingQr(true);
      try {
        const payload = await decodeQrFromDataUrl(dataUrl);
        if (payload) applyQrPayload(payload);
        else clearQr();
      } catch {
        clearQr();
      } finally {
        setIsDecodingQr(false);
      }
    },
    [applyQrPayload]
  );

  const loadImageFile = (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      showToast('error', 'File quá lớn', 'Vui lòng chọn ảnh không quá 8MB');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('error', 'Định dạng không hỗ trợ', 'Chỉ chấp nhận JPEG, PNG hoặc WEBP');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImage(dataUrl);
      setMimeType(file.type || 'image/png');
      setResult(null);
      setError(null);
      setActivePreset(null);
      setIsAlertSaved(false);
      runLocalQrCheck(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImageFile(file);
    e.target.value = '';
  };

  const handleSelectPreset = (preset: PresetItem) => {
    setActivePreset(preset.id);
    const dataUrl = preset.generateImage();
    setImage(dataUrl);
    setMimeType('image/png');
    setResult(null);
    setError(null);
    setIsAlertSaved(false);
    clearQr();
    runLocalQrCheck(dataUrl);
    showToast('info', `Đã chọn: ${preset.name}`, 'Nhấn "Bắt đầu giám định AI" để phân tích');
  };

  const openCamera = (mode: CameraMode) => {
    setCameraMode(mode);
    setCameraOpen(true);
  };

  const handleCameraQr = useCallback(
    (payload: string, frame: string) => {
      setCameraOpen(false);
      if (frame) {
        setImage(frame);
        setMimeType('image/jpeg');
      }
      setResult(null);
      setError(null);
      setActivePreset(null);
      setIsAlertSaved(false);
      applyQrPayload(payload);
    },
    [applyQrPayload]
  );

  const handleCameraCapture = useCallback(
    (dataUrl: string) => {
      setCameraOpen(false);
      setImage(dataUrl);
      setMimeType('image/jpeg');
      setResult(null);
      setError(null);
      setActivePreset(null);
      setIsAlertSaved(false);
      clearQr();
      runLocalQrCheck(dataUrl);
      showToast('success', 'Đã chụp biên lai', 'Nhấn "Bắt đầu giám định AI" để phân tích');
    },
    [runLocalQrCheck, showToast]
  );

  const handlePinAccount = (bankBin: string, accountNumber: string, label?: string) => {
    addPinnedAccount({ bankBin, accountNumber, label });
    showToast('success', 'Đã ghim tài khoản cửa hàng', 'Các lần quét sau sẽ cảnh báo nếu QR trỏ tới tài khoản khác');
  };

  const runAnalysis = async () => {
    if (!image) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const base64Data = image.split(',')[1];
      const detectedMime = mimeType || image.split(';')[0].split(':')[1] || 'image/png';

      const analysis = await analyzeFakeBillAndQR(base64Data, detectedMime);
      setResult(analysis);

      if (analysis.verdict === 'HIGH_RISK_FAKE') {
        showToast('error', 'CẢNH BÁO NGUY HIỂM!', `Nguy cơ giả mạo ${analysis.riskScore}% — ${analysis.actionAdvice.slice(0, 50)}...`);
      } else if (analysis.verdict === 'SUSPICIOUS') {
        showToast('warning', 'Cần kiểm tra kỹ!', `Điểm rủi ro: ${analysis.riskScore}% — ${analysis.bankOrApp}`);
      } else {
        showToast('success', 'Biên lai hợp lệ', `Độ tin cậy cao — ${analysis.bankOrApp}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi trong quá trình giám định AI';
      setError(msg);
      showToast('error', 'Lỗi giám định', msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveToFraudShield = async () => {
    if (!result || !user || isAlertSaved) return;

    setIsSavingAlert(true);
    try {
      await createFraudAlert(user.uid, {
        type: result.verdict === 'HIGH_RISK_FAKE' ? 'danger' : result.verdict === 'SUSPICIOUS' ? 'warning' : 'info',
        title: `[Giám Định Bill] ${result.verdict === 'HIGH_RISK_FAKE' ? 'Phát hiện Bill Giả Mạo' : result.verdict === 'SUSPICIOUS' ? 'Biên lai đáng ngờ' : 'Biên lai hợp lệ'} - ${result.bankOrApp}`,
        description: `${result.amount || 'Không rõ số tiền'} • ${result.summary}`,
        resolved: false,
      });

      setIsAlertSaved(true);
      showToast('success', 'Đã lưu vào Fraud Shield!', 'Cảnh báo đã được ghi nhận vào hệ thống bảo mật');
    } catch (err) {
      console.error('Error saving fraud alert:', err);
      showToast('error', 'Lỗi lưu cảnh báo', 'Vui lòng thử lại');
    } finally {
      setIsSavingAlert(false);
    }
  };

  return (
    <div className="fake-bill-container" suppressHydrationWarning>
      {/* Header */}
      <div className="page-header animate-fade-in-down" suppressHydrationWarning>
        <div className="page-header-top">
          <div>
            <div className="fake-bill-header-badge">
              <span>🛡️</span> AI Banking Forensics Shield
            </div>
            <h1 className="page-title">
              🔍 Fake Bill & Scam QR <span className="text-gradient">Detector</span>
            </h1>
            <p className="page-subtitle">
              Giám định biên lai chuyển tiền ngân hàng & quét mã QR lừa đảo bằng Gemini Vision AI — Bảo vệ tiểu thương, hộ kinh doanh Hưng Yên khỏi gian lận tài chính.
            </p>
          </div>
          <div className="flex gap-sm">
            <button
              id="fake-bill-open-camera"
              className="btn btn-primary btn-sm"
              onClick={() => openCamera('qr')}
              title="Quét mã QR hoặc chụp biên lai bằng camera"
            >
              📷 Camera
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => router.push('/fraud')}
              title="Xem danh sách cảnh báo tổng thể"
            >
              🛡️ Fraud Shield
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => router.push('/blockchain')}
              title="Xác thực giao dịch trên Blockchain"
            >
              🔗 On-chain
            </button>
          </div>
        </div>
      </div>

      {/* Preset Quick-Test Toolbar (For Competition Judge & Live Testing) */}
      <div className="presets-toolbar glass-card animate-fade-in-up">
        <div className="card-body" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
          <div className="presets-label">
            <span>⚡ MẪU THỬ NHANH DÀNH CHO GIÁM KHẢO / DEMO TRỰC TIẾP:</span>
          </div>
          <div className="presets-grid" style={{ marginTop: 'var(--space-xs)' }}>
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`preset-chip ${activePreset === preset.id ? 'active' : ''}`}
                onClick={() => handleSelectPreset(preset)}
              >
                <span className="preset-icon">
                  {preset.type === 'legit' || preset.type === 'qr_legit'
                    ? '🟢'
                    : preset.type === 'fake_font' || preset.type === 'qr_swapped' || preset.type === 'qr_tampered'
                    ? '🔴'
                    : preset.type === 'pending_schedule'
                    ? '🟡'
                    : '⚠️'}
                </span>
                <div className="preset-meta">
                  <span className="preset-title">{preset.name}</span>
                  <span className="preset-desc">{preset.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Detector Workspace */}
      <div className="detector-layout">
        {/* Left Side: Upload & Image Viewer */}
        <div className="glass-card animate-fade-in-up">
          <div className="card-header">
            <h3 className="card-title">📤 Ảnh Biên Lai / Mã QR Cần Giám Định</h3>
            <span className="badge badge-primary">Gemini Vision AI</span>
          </div>
          <div className="card-body">
            {!image ? (
              <div
                className="dropzone-box"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) loadImageFile(file);
                }}
              >
                <div className="dropzone-icon">📸</div>
                <h4 className="dropzone-title">Tải lên ảnh chụp màn hình chuyển tiền hoặc mã QR</h4>
                <p className="dropzone-hint">
                  Hỗ trợ ảnh biên lai Vietcombank, MB, Techcombank, BIDV, Vietinbank, Momo hoặc mã VietQR (PNG, JPG, WEBP)
                </p>
                <div className="dropzone-actions">
                  <button
                    id="fake-bill-pick-file"
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    📁 Chọn ảnh từ thiết bị
                  </button>
                  <button
                    id="fake-bill-scan-qr"
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openCamera('qr');
                    }}
                  >
                    🔳 Quét QR bằng camera
                  </button>
                  <button
                    id="fake-bill-capture-receipt"
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openCamera('receipt');
                    }}
                  >
                    🧾 Chụp biên lai
                  </button>
                </div>
              </div>
            ) : (
              <div className="preview-container">
                <div className="bill-preview-wrapper">
                  <img src={image} alt="Receipt or QR" className="bill-preview-img" />
                  {(isAnalyzing || isDecodingQr) && <div className="scanning-scanline" />}
                </div>

                <div className="preview-actions-bar">
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={runAnalysis}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <span className="spinner" />
                        Đang giám định bằng AI Forensics...
                      </>
                    ) : (
                      '🔍 Bắt đầu giám định AI'
                    )}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setImage(null);
                      setResult(null);
                      setError(null);
                      setActivePreset(null);
                      setIsAlertSaved(false);
                      clearQr();
                    }}
                    disabled={isAnalyzing}
                  >
                    🗑️ Đổi ảnh
                  </button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Right Side: Analysis Results & Forensics */}
        <div className="glass-card animate-fade-in-up delay-100">
          <div className="card-header">
            <h3 className="card-title">📊 Kết Quả Giám Định Kỹ Thuật Số</h3>
            {result && (
              <span
                className={`badge ${
                  result.verdict === 'SAFE'
                    ? 'badge-success'
                    : result.verdict === 'SUSPICIOUS'
                    ? 'badge-warning'
                    : 'badge-danger'
                }`}
              >
                {result.verdict === 'SAFE'
                  ? '✅ An Toàn'
                  : result.verdict === 'SUSPICIOUS'
                  ? '🟡 Cần Đối Chiếu'
                  : '🔴 Nguy Cơ Giả Mạo'}
              </span>
            )}
          </div>

          <div className="card-body">
            {qrAnalysis && <QrAnalysisPanel analysis={qrAnalysis} onPinAccount={handlePinAccount} />}

            {error && (
              <div className="form-error" style={{ marginBottom: 'var(--space-md)' }}>
                <span>⚠️</span> {error}
              </div>
            )}

            {isAnalyzing && (
              <div style={{ textAlign: 'center', padding: 'var(--space-3xl) 0' }}>
                <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto var(--space-md)' }} />
                <h4 style={{ color: 'var(--primary-light)', marginBottom: 'var(--space-xs)' }}>
                  Đang phân tích vi mô từng pixel & font chữ...
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Kiểm tra đối chiếu với mẫu chuẩn ngân hàng Việt Nam và quy chuẩn VietQR
                </p>
              </div>
            )}

            {!isAnalyzing && !result && !error && !qrAnalysis && (
              <div style={{ textAlign: 'center', padding: 'var(--space-3xl) var(--space-md)' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: 'var(--space-md)' }}>🛡️</div>
                <h3 style={{ marginBottom: 'var(--space-sm)' }}>Sẵn sàng giám định</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '380px', margin: '0 auto' }}>
                  Chọn một trong các mẫu thử phía trên hoặc tải lên ảnh chụp màn hình biên lai chuyển tiền để AI phân tích font chữ, dấu vết photoshop và mã độc QR.
                </p>
              </div>
            )}

            {!isAnalyzing && result && (
              <div className="animate-scale-in">
                {/* Verdict Banner with Risk Meter */}
                <div
                  className={`verdict-banner ${
                    result.verdict === 'SAFE' ? 'safe' : result.verdict === 'SUSPICIOUS' ? 'suspicious' : 'fake'
                  }`}
                >
                  <div
                    className={`risk-meter-circle ${
                      result.verdict === 'SAFE' ? 'safe' : result.verdict === 'SUSPICIOUS' ? 'suspicious' : 'fake'
                    }`}
                  >
                    <span
                      className="risk-meter-val"
                      style={{
                        color:
                          result.verdict === 'SAFE'
                            ? 'var(--accent-emerald)'
                            : result.verdict === 'SUSPICIOUS'
                            ? 'var(--accent-amber)'
                            : 'var(--accent-coral)',
                      }}
                    >
                      {result.riskScore}%
                    </span>
                    <span className="risk-meter-label">Rủi ro</span>
                  </div>

                  <div className="verdict-info">
                    <span
                      className={`verdict-badge ${
                        result.verdict === 'SAFE' ? 'safe' : result.verdict === 'SUSPICIOUS' ? 'suspicious' : 'fake'
                      }`}
                    >
                      {result.verdict === 'SAFE'
                        ? 'HỢP LỆ & TIN CẬY'
                        : result.verdict === 'SUSPICIOUS'
                        ? 'NGHI NGỜ / CHỜ XÁC MINH'
                        : 'BILL GIẢ MẠO / LỪA ĐẢO'}
                    </span>
                    <h3 className="verdict-title">{result.bankOrApp}</h3>
                    <p className="verdict-summary">{result.summary}</p>
                  </div>
                </div>

                {/* Merchant Action Alert Box */}
                <div className={`action-advice-box ${result.verdict === 'HIGH_RISK_FAKE' ? 'urgent' : ''}`}>
                  <span className="action-advice-icon">
                    {result.verdict === 'HIGH_RISK_FAKE' ? '🚨' : result.verdict === 'SUSPICIOUS' ? '⚠️' : '💡'}
                  </span>
                  <div>
                    <strong>KHUYẾN CÁO CHO CHỦ CỬA HÀNG: </strong>
                    <span>{result.actionAdvice}</span>
                  </div>
                </div>

                {/* Extracted Details */}
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 'var(--space-sm)' }}>
                  📋 Dữ Liệu Giao Dịch Trích Xuất
                </h4>
                <div className="forensic-info-grid">
                  <div className="info-item">
                    <span className="info-item-label">Ngân hàng / Ứng dụng</span>
                    <span className="info-item-val">{result.bankOrApp || 'Không rõ'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-item-label">Số tiền ghi nhận</span>
                    <span
                      className="info-item-val text-mono"
                      style={{
                        color:
                          result.verdict === 'HIGH_RISK_FAKE' ? 'var(--accent-coral)' : 'var(--accent-emerald)',
                      }}
                    >
                      {result.amount || '0 VND'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-item-label">Người thụ hưởng</span>
                    <span className="info-item-val">{result.receiverName || 'Chưa xác định'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-item-label">Tài khoản nhận</span>
                    <span className="info-item-val text-mono">{result.receiverAccount || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-item-label">Mã giao dịch (TxID / FT)</span>
                    <span className="info-item-val text-mono" style={{ fontSize: '0.8rem' }}>
                      {result.transactionCode || 'Không có'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-item-label">Trạng thái hệ thống</span>
                    <span
                      className="info-item-val"
                      style={{
                        color:
                          result.transactionStatus === 'SUCCESS'
                            ? 'var(--accent-emerald)'
                            : result.transactionStatus === 'FAILED'
                            ? 'var(--accent-coral)'
                            : 'var(--accent-amber)',
                      }}
                    >
                      {result.transactionStatus === 'SUCCESS'
                        ? '✅ Thành công'
                        : result.transactionStatus === 'SCHEDULED'
                        ? '⏳ Lệnh hẹn giờ'
                        : result.transactionStatus === 'PENDING'
                        ? '⏳ Đang xử lý'
                        : result.transactionStatus}
                    </span>
                  </div>
                </div>

                {/* Forensic Audit Checklist */}
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 'var(--space-sm)' }}>
                  🔬 Giám Định Kỹ Thuật Số (Forensic Checklist)
                </h4>
                <div className="forensic-checklist">
                  {/* Font Check */}
                  <div className={`check-item ${result.forensicAudit.fontCheck.status}`}>
                    <span className="check-status-badge">
                      {result.forensicAudit.fontCheck.status === 'passed'
                        ? '✅'
                        : result.forensicAudit.fontCheck.status === 'warning'
                        ? '🟡'
                        : '❌'}
                    </span>
                    <div className="check-content">
                      <div className="check-title">Kiểm tra Font chữ & Kích cỡ số tiền</div>
                      <div className="check-detail">{result.forensicAudit.fontCheck.detail}</div>
                    </div>
                  </div>

                  {/* Alignment */}
                  <div className={`check-item ${result.forensicAudit.alignmentCheck.status}`}>
                    <span className="check-status-badge">
                      {result.forensicAudit.alignmentCheck.status === 'passed'
                        ? '✅'
                        : result.forensicAudit.alignmentCheck.status === 'warning'
                        ? '🟡'
                        : '❌'}
                    </span>
                    <div className="check-content">
                      <div className="check-title">Căn lề, khoảng cách dòng & đồ họa</div>
                      <div className="check-detail">{result.forensicAudit.alignmentCheck.detail}</div>
                    </div>
                  </div>

                  {/* Tampering Artifacts */}
                  <div className={`check-item ${result.forensicAudit.tamperingArtifacts.status}`}>
                    <span className="check-status-badge">
                      {result.forensicAudit.tamperingArtifacts.status === 'passed'
                        ? '✅'
                        : result.forensicAudit.tamperingArtifacts.status === 'warning'
                        ? '🟡'
                        : '❌'}
                    </span>
                    <div className="check-content">
                      <div className="check-title">Dấu vết chỉnh sửa ảnh & nén pixel (Photoshop)</div>
                      <div className="check-detail">{result.forensicAudit.tamperingArtifacts.detail}</div>
                    </div>
                  </div>

                  {/* Code Logic */}
                  <div className={`check-item ${result.forensicAudit.transactionCodeLogic.status}`}>
                    <span className="check-status-badge">
                      {result.forensicAudit.transactionCodeLogic.status === 'passed'
                        ? '✅'
                        : result.forensicAudit.transactionCodeLogic.status === 'warning'
                        ? '🟡'
                        : '❌'}
                    </span>
                    <div className="check-content">
                      <div className="check-title">Tính hợp lệ của Mã giao dịch ngân hàng</div>
                      <div className="check-detail">{result.forensicAudit.transactionCodeLogic.detail}</div>
                    </div>
                  </div>

                  {/* Status Integrity */}
                  <div className={`check-item ${result.forensicAudit.statusIntegrity.status}`}>
                    <span className="check-status-badge">
                      {result.forensicAudit.statusIntegrity.status === 'passed'
                        ? '✅'
                        : result.forensicAudit.statusIntegrity.status === 'warning'
                        ? '🟡'
                        : '❌'}
                    </span>
                    <div className="check-content">
                      <div className="check-title">Tính toàn vẹn của trạng thái thanh toán</div>
                      <div className="check-detail">{result.forensicAudit.statusIntegrity.detail}</div>
                    </div>
                  </div>

                  {/* QR Security (if applicable) */}
                  {result.forensicAudit.qrCodeSecurity.status !== 'not_applicable' && (
                    <div className={`check-item ${result.forensicAudit.qrCodeSecurity.status}`}>
                      <span className="check-status-badge">
                        {result.forensicAudit.qrCodeSecurity.status === 'passed' ? '✅' : '❌'}
                      </span>
                      <div className="check-content">
                        <div className="check-title">Độ an toàn của mã QR thanh toán</div>
                        <div className="check-detail">{result.forensicAudit.qrCodeSecurity.detail}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Detected Anomalies */}
                {result.detectedAnomalies && result.detectedAnomalies.length > 0 && result.verdict !== 'SAFE' && (
                  <div className="anomalies-list">
                    <h5>🚨 Các điểm bất thường cụ thể:</h5>
                    <ul>
                      {result.detectedAnomalies.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Footer Action Buttons */}
                <div className="detector-footer-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleSaveToFraudShield}
                    disabled={isSavingAlert || isAlertSaved}
                  >
                    {isAlertSaved ? '✅ Đã lưu vào Fraud Shield' : isSavingAlert ? '⏳ Đang lưu...' : '🚨 Lưu vào Fraud Shield'}
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => router.push('/blockchain')}
                  >
                    🔗 Ghi nhận On-chain
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setImage(null);
                      setResult(null);
                      setActivePreset(null);
                      clearQr();
                    }}
                  >
                    🔄 Quét biên lai khác
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <CameraScanner
        open={cameraOpen}
        initialMode={cameraMode}
        onClose={() => setCameraOpen(false)}
        onQrDetected={handleCameraQr}
        onCapture={handleCameraCapture}
        onFallbackUpload={() => {
          setCameraOpen(false);
          fileInputRef.current?.click();
        }}
      />
    </div>
  );
}
