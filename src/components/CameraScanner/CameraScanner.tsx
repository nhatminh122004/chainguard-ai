'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { decodeQrFromCanvas, getDecoderEngineName } from '@/lib/qr-decoder';
import './CameraScanner.css';

export type CameraMode = 'qr' | 'receipt';

interface CameraScannerProps {
  open: boolean;
  initialMode?: CameraMode;
  onClose: () => void;
  /** Fired once when a QR code is decoded. `frameDataUrl` is a JPEG of the full frame. */
  onQrDetected: (payload: string, frameDataUrl: string) => void;
  /** Fired when a receipt photo is captured (auto or manual). */
  onCapture: (dataUrl: string) => void;
  /** Optional fallback when camera is unavailable. */
  onFallbackUpload?: () => void;
}

type CamError = 'insecure' | 'unsupported' | 'denied' | 'notfound' | 'generic';

const ERROR_TEXT: Record<CamError, { title: string; detail: string }> = {
  insecure: {
    title: 'Camera cần kết nối HTTPS',
    detail:
      'Trình duyệt chỉ cho phép camera trên HTTPS hoặc localhost. Trên điện thoại, hãy mở bản deploy HTTPS hoặc chạy "next dev --experimental-https".',
  },
  unsupported: { title: 'Trình duyệt không hỗ trợ camera', detail: 'Hãy dùng Chrome, Edge hoặc Safari bản mới.' },
  denied: { title: 'Quyền camera bị từ chối', detail: 'Bật lại quyền camera cho trang này trong cài đặt trình duyệt rồi thử lại.' },
  notfound: { title: 'Không tìm thấy camera', detail: 'Thiết bị không có camera hoặc camera đang được ứng dụng khác sử dụng.' },
  generic: { title: 'Không mở được camera', detail: 'Đã xảy ra lỗi khi khởi động camera. Hãy thử lại.' },
};

const QR_INTERVAL_MS = 180;
const STABILITY_INTERVAL_MS = 200;
const STABLE_TICKS_REQUIRED = 8; // ~1.6s steady
const STABLE_DIFF_THRESHOLD = 7; // mean abs diff on 0-255 grayscale
const MIN_CONTRAST = 18; // std-dev; avoids capturing a blank surface

export default function CameraScanner({
  open,
  initialMode = 'qr',
  onClose,
  onQrDetected,
  onCapture,
  onFallbackUpload,
}: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevFrameRef = useRef<Float32Array | null>(null);
  const stableTicksRef = useRef(0);
  const doneRef = useRef(false);

  const [mode, setMode] = useState<CameraMode>(initialMode);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<CamError | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [autoCapture, setAutoCapture] = useState(true);
  const [stability, setStability] = useState(0); // 0..1
  const [flash, setFlash] = useState(false);
  const [engine, setEngine] = useState<string>('');

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Reset state each time the modal opens
  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    doneRef.current = false;
    getDecoderEngineName().then(setEngine);
  }, [open, initialMode]);

  // Start / restart camera stream
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const start = async () => {
      setReady(false);
      setError(null);
      setTorchOn(false);
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        setError('insecure');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('unsupported');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        const track = stream.getVideoTracks()[0];
        const caps = (track.getCapabilities?.() || {}) as MediaTrackCapabilities & { torch?: boolean };
        setTorchSupported(!!caps.torch);
        setReady(true);
      } catch (e) {
        const name = (e as DOMException)?.name;
        setError(
          name === 'NotAllowedError' || name === 'SecurityError'
            ? 'denied'
            : name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'NotReadableError'
            ? 'notfound'
            : 'generic'
        );
      }
    };

    start();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, facingMode, stopStream]);

  // Close on Escape + lock page scroll
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const getWorkCanvas = () => {
    if (!workCanvasRef.current) workCanvasRef.current = document.createElement('canvas');
    return workCanvasRef.current;
  };

  const captureFullFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.92);
  }, []);

  const finish = useCallback(() => {
    doneRef.current = true;
    setFlash(true);
    navigator.vibrate?.(80);
    stopStream();
  }, [stopStream]);

  const handleManualCapture = useCallback(() => {
    const dataUrl = captureFullFrame();
    if (!dataUrl) return;
    finish();
    onCapture(dataUrl);
  }, [captureFullFrame, finish, onCapture]);

  // Main scanning loop
  useEffect(() => {
    if (!open || !ready) return;
    let raf = 0;
    let last = 0;
    let busy = false;
    stableTicksRef.current = 0;
    prevFrameRef.current = null;
    setStability(0);

    const scanQr = async () => {
      const video = videoRef.current;
      if (!video || !video.videoWidth) return;
      // Crop the central square (where the on-screen frame is) → faster & more accurate
      const side = Math.min(video.videoWidth, video.videoHeight) * 0.8;
      const sx = (video.videoWidth - side) / 2;
      const sy = (video.videoHeight - side) / 2;
      const canvas = getWorkCanvas();
      canvas.width = 560;
      canvas.height = 560;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, sx, sy, side, side, 0, 0, canvas.width, canvas.height);
      const payload = await decodeQrFromCanvas(canvas);
      if (payload && !doneRef.current) {
        const frame = captureFullFrame() || '';
        finish();
        onQrDetected(payload, frame);
      }
    };

    const checkStability = () => {
      const video = videoRef.current;
      if (!video || !video.videoWidth) return;
      const w = 48;
      const h = 64;
      const canvas = getWorkCanvas();
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);
      const gray = new Float32Array(w * h);
      let sum = 0;
      for (let i = 0; i < gray.length; i++) {
        const g = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
        gray[i] = g;
        sum += g;
      }
      const mean = sum / gray.length;
      let variance = 0;
      for (let i = 0; i < gray.length; i++) variance += (gray[i] - mean) ** 2;
      const contrast = Math.sqrt(variance / gray.length);

      const prev = prevFrameRef.current;
      prevFrameRef.current = gray;
      if (!prev) return;
      let diff = 0;
      for (let i = 0; i < gray.length; i++) diff += Math.abs(gray[i] - prev[i]);
      diff /= gray.length;

      if (diff < STABLE_DIFF_THRESHOLD && contrast > MIN_CONTRAST) {
        stableTicksRef.current += 1;
      } else {
        stableTicksRef.current = 0;
      }
      const progress = Math.min(1, stableTicksRef.current / STABLE_TICKS_REQUIRED);
      setStability(progress);

      if (autoCapture && progress >= 1 && !doneRef.current) {
        const dataUrl = captureFullFrame();
        if (dataUrl) {
          finish();
          onCapture(dataUrl);
        }
      }
    };

    const tick = async (t: number) => {
      raf = requestAnimationFrame(tick);
      if (doneRef.current || busy) return;
      const interval = mode === 'qr' ? QR_INTERVAL_MS : STABILITY_INTERVAL_MS;
      if (t - last < interval) return;
      last = t;
      busy = true;
      try {
        if (mode === 'qr') await scanQr();
        else checkStability();
      } finally {
        busy = false;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, ready, mode, autoCapture, captureFullFrame, finish, onCapture, onQrDetected]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] });
      setTorchOn(!torchOn);
    } catch {
      setTorchSupported(false);
    }
  };

  if (!open) return null;

  const err = error ? ERROR_TEXT[error] : null;

  return (
    <div className="camscan-overlay" role="dialog" aria-modal="true" aria-label="Camera scanner">
      <div className="camscan-panel">
        {/* Header */}
        <div className="camscan-header">
          <div className="camscan-tabs" role="tablist">
            <button
              id="camscan-tab-qr"
              role="tab"
              aria-selected={mode === 'qr'}
              className={`camscan-tab ${mode === 'qr' ? 'active' : ''}`}
              onClick={() => setMode('qr')}
            >
              🔳 Quét mã QR
            </button>
            <button
              id="camscan-tab-receipt"
              role="tab"
              aria-selected={mode === 'receipt'}
              className={`camscan-tab ${mode === 'receipt' ? 'active' : ''}`}
              onClick={() => setMode('receipt')}
            >
              🧾 Chụp biên lai
            </button>
          </div>
          <button id="camscan-close" className="camscan-icon-btn" onClick={onClose} aria-label="Đóng camera">
            ✕
          </button>
        </div>

        {/* Viewport */}
        <div className="camscan-viewport">
          <video ref={videoRef} className="camscan-video" playsInline muted autoPlay />

          {ready && !err && (
            <div className={`camscan-frame ${mode}`}>
              <span className="corner tl" />
              <span className="corner tr" />
              <span className="corner bl" />
              <span className="corner br" />
              <div className="camscan-laser" />
              {mode === 'receipt' && (
                <div className="camscan-stability" style={{ ['--p' as string]: stability }}>
                  <span>{stability >= 1 ? 'Đang chụp…' : stability > 0 ? 'Giữ yên…' : 'Đưa biên lai vào khung'}</span>
                </div>
              )}
            </div>
          )}

          {!ready && !err && (
            <div className="camscan-status">
              <div className="spinner" />
              <p>Đang khởi động camera…</p>
            </div>
          )}

          {err && (
            <div className="camscan-status error">
              <div className="camscan-error-icon">📵</div>
              <h4>{err.title}</h4>
              <p>{err.detail}</p>
              {onFallbackUpload && (
                <button id="camscan-fallback-upload" className="btn btn-primary btn-sm" onClick={onFallbackUpload}>
                  📁 Tải ảnh lên thay thế
                </button>
              )}
            </div>
          )}

          {flash && <div className="camscan-flash" onAnimationEnd={() => setFlash(false)} />}
        </div>

        {/* Controls */}
        <div className="camscan-controls">
          <div className="camscan-hint">
            {mode === 'qr'
              ? 'Hướng camera vào mã QR — hệ thống tự giải mã VietQR & kiểm tra CRC ngay trên máy.'
              : autoCapture
              ? 'Giữ yên điện thoại ~2 giây, hệ thống sẽ tự chụp.'
              : 'Căn biên lai vào khung rồi bấm chụp.'}
            {engine && <span className="camscan-engine">Engine: {engine}</span>}
          </div>

          <div className="camscan-buttons">
            <button
              id="camscan-switch"
              className="camscan-icon-btn"
              onClick={() => setFacingMode((f) => (f === 'environment' ? 'user' : 'environment'))}
              aria-label="Đổi camera"
              title="Đổi camera trước/sau"
            >
              🔄
            </button>

            {mode === 'receipt' ? (
              <button
                id="camscan-shutter"
                className="camscan-shutter"
                onClick={handleManualCapture}
                disabled={!ready}
                aria-label="Chụp ảnh"
              />
            ) : (
              <div className="camscan-shutter placeholder" aria-hidden="true" />
            )}

            {torchSupported ? (
              <button
                id="camscan-torch"
                className={`camscan-icon-btn ${torchOn ? 'on' : ''}`}
                onClick={toggleTorch}
                aria-label="Bật/tắt đèn flash"
              >
                🔦
              </button>
            ) : mode === 'receipt' ? (
              <button
                id="camscan-auto-toggle"
                className={`camscan-icon-btn ${autoCapture ? 'on' : ''}`}
                onClick={() => setAutoCapture((a) => !a)}
                title="Tự động chụp khi giữ yên"
                aria-label="Bật/tắt tự động chụp"
              >
                ⚡
              </button>
            ) : (
              <span className="camscan-icon-btn placeholder" aria-hidden="true" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
