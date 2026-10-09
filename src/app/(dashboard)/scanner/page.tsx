'use client';

import React, { useState, useRef } from 'react';
import { scanReceipt as scanReceiptWithAi, ReceiptData } from '@/lib/gemini';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast/Toast';
import { addTransaction, getCategoryConfig } from '@/lib/firestore';
import { useRouter } from 'next/navigation';
import './scanner.css';

export default function ScannerPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setError('Ảnh vượt quá giới hạn 8MB.');
        e.target.value = '';
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Chỉ hỗ trợ ảnh JPEG, PNG hoặc WEBP.');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setReceiptData(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const scanReceipt = async () => {
    if (!image) return;

    setIsScanning(true);
    setError(null);

    try {
      const base64Data = image.split(',')[1];
      const mimeType = image.split(';')[0].split(':')[1];
      const data = await scanReceiptWithAi(base64Data, mimeType);
      setReceiptData(data);
      showToast('success', 'Quét thành công!', `Phát hiện hóa đơn từ ${data.merchant}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi khi quét hóa đơn';
      setError(message + '. Kiểm tra API key Gemini.');
    } finally {
      setIsScanning(false);
    }
  };

  const saveTransaction = async () => {
    if (!receiptData || !user) return;

    setIsSaving(true);
    try {
      // Parse the total amount
      const totalStr = receiptData.total.replace(/[^0-9.-]/g, '');
      const amount = -Math.abs(parseFloat(totalStr) || 0);

      // Parse date
      let txDate = new Date();
      if (receiptData.date) {
        const parts = receiptData.date.split('/');
        if (parts.length === 3) {
          txDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          if (isNaN(txDate.getTime())) txDate = new Date();
        }
      }

      const categoryConfig = getCategoryConfig(receiptData.category);

      await addTransaction(user.uid, {
        name: receiptData.merchant || 'Hóa đơn quét',
        amount,
        category: receiptData.category || 'Khác',
        icon: categoryConfig.icon,
        date: txDate,
        note: `Quét bởi AI • ${receiptData.items?.length || 0} sản phẩm`,
        verified: false,
      });

      showToast('success', 'Đã lưu giao dịch!', `${receiptData.merchant} — ${new Intl.NumberFormat('vi-VN').format(Math.abs(amount))}₫`);

      // Reset and navigate
      setTimeout(() => {
        router.push('/transactions');
      }, 1500);
    } catch (err) {
      console.error('Error saving transaction:', err);
      showToast('error', 'Lỗi lưu giao dịch', 'Vui lòng thử lại');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header animate-fade-in-down">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">📷 Receipt <span className="text-gradient">Scanner</span></h1>
            <p className="page-subtitle">Quét hóa đơn bằng AI Gemini Vision — tự động phân loại chi tiêu</p>
          </div>
        </div>
      </div>

      <div className="scanner-layout">
        {/* Upload Area */}
        <div className="scanner-upload glass-card animate-fade-in-up">
          <div className="card-header">
            <h3 className="card-title">📤 Upload Hóa Đơn</h3>
            <span className="badge badge-primary">Gemini Vision</span>
          </div>
          <div className="card-body">
            {!image ? (
              <div
                className="upload-dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="upload-icon">📷</div>
                <p className="upload-title">Kéo thả hoặc nhấn để upload</p>
                <p className="upload-subtitle">Hỗ trợ: JPG, PNG, WEBP (tối đa 10MB)</p>
              </div>
            ) : (
              <div className="image-preview">
                <img src={image} alt="Receipt" className="preview-img" />
                <div className="preview-actions">
                  <button
                    className="btn btn-primary"
                    onClick={scanReceipt}
                    disabled={isScanning}
                  >
                    {isScanning ? (
                      <>
                        <span className="spinner"></span>
                        Đang quét bằng AI...
                      </>
                    ) : (
                      '🔍 Quét bằng Gemini AI'
                    )}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => { setImage(null); setReceiptData(null); setError(null); }}
                  >
                    🗑️ Xóa ảnh
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

        {/* Result */}
        <div className="scanner-result">
          {error && (
            <div className="glass-card animate-fade-in-up" style={{ marginBottom: 'var(--space-lg)' }}>
              <div className="card-body">
                <div className="form-error">
                  <span>⚠️</span> {error}
                </div>
              </div>
            </div>
          )}

          {receiptData ? (
            <div className="glass-card animate-scale-in">
              <div className="card-header">
                <h3 className="card-title">📋 Kết Quả Phân Tích</h3>
                <span className="badge badge-success">✅ Thành công</span>
              </div>
              <div className="card-body">
                <div className="result-grid">
                  <div className="result-item">
                    <span className="result-label">🏪 Cửa hàng</span>
                    <span className="result-value">{receiptData.merchant}</span>
                  </div>
                  <div className="result-item">
                    <span className="result-label">📅 Ngày</span>
                    <span className="result-value">{receiptData.date}</span>
                  </div>
                  <div className="result-item">
                    <span className="result-label">💰 Tổng tiền</span>
                    <span className="result-value" style={{ color: 'var(--accent-coral)', fontFamily: 'var(--font-mono)', fontSize: '1.2rem' }}>
                      {receiptData.total} {receiptData.currency}
                    </span>
                  </div>
                  <div className="result-item">
                    <span className="result-label">📂 Danh mục</span>
                    <span className="badge badge-primary">{receiptData.category}</span>
                  </div>
                </div>

                {receiptData.items && receiptData.items.length > 0 && (
                  <div className="result-items">
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
                      🛒 Chi tiết sản phẩm
                    </h4>
                    <table className="items-table">
                      <thead>
                        <tr>
                          <th>Sản phẩm</th>
                          <th>Giá</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receiptData.items.map((item, i) => (
                          <tr key={i}>
                            <td>{item.name}</td>
                            <td className="text-mono">{item.price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="result-actions">
                  <button
                    className="btn btn-primary"
                    onClick={saveTransaction}
                    disabled={isSaving}
                  >
                    {isSaving ? '⏳ Đang lưu...' : '💾 Lưu giao dịch'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => { setReceiptData(null); setImage(null); }}>
                    📷 Quét lại
                  </button>
                </div>
              </div>
            </div>
          ) : !error && (
            <div className="glass-card animate-fade-in-up" style={{ textAlign: 'center' }}>
              <div className="card-body" style={{ padding: 'var(--space-3xl)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>📷</div>
                <h3 style={{ marginBottom: 'var(--space-sm)' }}>Chưa có hóa đơn</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Upload ảnh hóa đơn để AI Gemini tự động phân tích và phân loại chi tiêu
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
