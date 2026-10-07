'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast/Toast';
import {
  getTransactions,
  getFraudAlerts,
  resolveAlert,
  createFraudAlert,
  detectSuspiciousTransactions,
  FraudAlert,
  Transaction,
  seedDemoTransactions,
} from '@/lib/firestore';

export default function FraudPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [suspicious, setSuspicious] = useState<{ transaction: Transaction; reason: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [serverScanning, setServerScanning] = useState(false);
  const [serverResults, setServerResults] = useState<any>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      await seedDemoTransactions(user.uid);
      const [alertsData, txData] = await Promise.all([
        getFraudAlerts(user.uid),
        getTransactions(user.uid, 200),
      ]);
      setAlerts(alertsData);
      setTransactions(txData);

      // Run suspicious detection
      const detected = detectSuspiciousTransactions(txData);
      setSuspicious(detected);
    } catch (err) {
      console.error('Error loading fraud data:', err);
      showToast('error', 'Lỗi tải dữ liệu bảo mật');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResolve = async (alertId: string) => {
    try {
      await resolveAlert(alertId);
      setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, resolved: true } : a));
      showToast('success', 'Đã đánh dấu xử lý');
    } catch (err) {
      showToast('error', 'Lỗi cập nhật cảnh báo');
      console.error(err);
    }
  };

  const runAIScan = async () => {
    if (!user || scanning) return;
    setScanning(true);
    try {
      const detected = detectSuspiciousTransactions(transactions);
      setSuspicious(detected);

      // Create fraud alerts for new detections
      for (const item of detected) {
        const exists = alerts.find(
          (a) => a.description.includes(item.transaction.name) && !a.resolved
        );
        if (!exists) {
          await createFraudAlert(user.uid, {
            type: 'warning',
            title: item.reason,
            description: `${item.transaction.name} — ${new Intl.NumberFormat('vi-VN').format(Math.abs(item.transaction.amount))}₫`,
            resolved: false,
          });
        }
      }

      // Reload alerts
      const updatedAlerts = await getFraudAlerts(user.uid);
      setAlerts(updatedAlerts);

      if (detected.length === 0) {
        showToast('success', 'Không phát hiện hoạt động đáng ngờ', 'Tất cả giao dịch bình thường');
      } else {
        showToast('warning', `Phát hiện ${detected.length} giao dịch đáng ngờ`, 'Xem chi tiết bên dưới');
      }
    } catch (err) {
      showToast('error', 'Lỗi quét bảo mật');
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  // Server-side fraud scan via API route
  const runServerScan = async () => {
    if (!user || serverScanning) return;
    setServerScanning(true);
    try {
      const txData = transactions.map(t => {
        const d = t.date instanceof Date ? t.date : (t.date as any).toDate();
        return {
          id: t.id || '',
          name: t.name,
          amount: t.amount,
          category: t.category,
          date: d.toISOString(),
          verified: t.verified,
        };
      });

      const res = await fetch('/api/fraud-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: txData }),
      });

      const data = await res.json();
      setServerResults(data);

      // Create alerts for server findings
      if (data.alerts && data.alerts.length > 0) {
        for (const alert of data.alerts.slice(0, 5)) {
          const exists = alerts.find(
            (a) => a.description.includes(alert.transactionName) && !a.resolved
          );
          if (!exists) {
            await createFraudAlert(user.uid, {
              type: alert.severity === 'high' ? 'danger' : 'warning',
              title: `[Server] ${alert.reason}`,
              description: `${alert.transactionName} — ${new Intl.NumberFormat('vi-VN').format(Math.abs(alert.amount))}₫`,
              resolved: false,
            });
          }
        }
        const updatedAlerts = await getFraudAlerts(user.uid);
        setAlerts(updatedAlerts);
        showToast('warning', `Server phát hiện ${data.alertsFound} vấn đề`, `${data.rules.length} quy tắc đã quét`);
      } else {
        showToast('success', 'Server scan hoàn tất', 'Không phát hiện bất thường');
      }
    } catch (err) {
      showToast('error', 'Lỗi Server Scan', 'Không thể kết nối API');
      console.error('Server scan error:', err);
    } finally {
      setServerScanning(false);
    }
  };

  const resolvedCount = alerts.filter((a) => a.resolved).length;
  const unresolvedCount = alerts.filter((a) => !a.resolved).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-md)' }}>🛡️</div>
          <p style={{ color: 'var(--text-secondary)' }}>Đang quét bảo mật...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header animate-fade-in-down">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">🛡️ Fraud Detection <span className="text-gradient">Shield</span></h1>
            <p className="page-subtitle">AI-powered chống gian lận — Phân tích giao dịch thật từ Firestore</p>
          </div>
          <div className="flex gap-sm">
            <button
              className="btn btn-primary btn-sm"
              onClick={runAIScan}
              disabled={scanning}
            >
              {scanning ? '⏳ Đang quét...' : '🔍 Client Scan'}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={runServerScan}
              disabled={serverScanning}
              style={{ borderColor: 'rgba(108,99,255,0.3)' }}
            >
              {serverScanning ? '⏳ Server...' : '🖥️ Server Scan'}
            </button>
            <span className="badge badge-success" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              🟢 Shield Active
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="glass-card stat-card primary animate-fade-in-up">
          <p className="stat-label">Trạng thái</p>
          <p className="stat-value" style={{ color: suspicious.length === 0 ? 'var(--accent-emerald)' : 'var(--accent-amber)', fontSize: '1.5rem' }}>
            {suspicious.length === 0 ? 'An toàn' : 'Cảnh báo'}
          </p>
          <p className="stat-change positive">Bảo vệ 24/7</p>
        </div>
        <div className="glass-card stat-card success animate-fade-in-up delay-100">
          <p className="stat-label">Giao dịch đã quét</p>
          <p className="stat-value" style={{ color: 'var(--accent-emerald)' }}>{transactions.length}</p>
          <p className="stat-change positive">Tổng cộng</p>
        </div>
        <div className="glass-card stat-card warning animate-fade-in-up delay-200">
          <p className="stat-label">Cảnh báo</p>
          <p className="stat-value" style={{ color: 'var(--accent-amber)' }}>{alerts.length}</p>
          <p className="stat-change positive">{resolvedCount} đã xử lý</p>
        </div>
        <div className="glass-card stat-card danger animate-fade-in-up delay-300">
          <p className="stat-label">Chờ xem xét</p>
          <p className="stat-value" style={{ color: unresolvedCount > 0 ? 'var(--accent-coral)' : 'var(--accent-emerald)' }}>{unresolvedCount}</p>
          <p className="stat-change positive">{unresolvedCount === 0 ? 'Tốt' : 'Cần xem xét'}</p>
        </div>
      </div>

      {/* Main */}
      <div className="content-grid">
        <div className="glass-card animate-fade-in-up delay-200">
          <div className="card-header">
            <h3 className="card-title">⚠️ Cảnh báo & Phát hiện</h3>
          </div>
          <div className="card-body">
            {/* Suspicious Transactions */}
            {suspicious.length > 0 && (
              <div style={{ marginBottom: 'var(--space-xl)' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-amber)', marginBottom: 'var(--space-md)' }}>
                  🔍 Giao dịch đáng ngờ ({suspicious.length})
                </h4>
                {suspicious.map((item, i) => {
                  const txDate = item.transaction.date instanceof Date ? item.transaction.date : new Date();
                  return (
                    <div key={i} style={{
                      padding: 'var(--space-md)',
                      background: 'rgba(255,179,71,0.05)',
                      border: '1px solid rgba(255,179,71,0.15)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: 'var(--space-sm)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          🟡 {item.transaction.name}
                        </span>
                        <span className="text-mono" style={{ color: 'var(--accent-coral)', fontWeight: 600, fontSize: '0.85rem' }}>
                          {new Intl.NumberFormat('vi-VN').format(Math.abs(item.transaction.amount))}₫
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.reason}</p>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                        {txDate.toLocaleDateString('vi-VN')} • {txDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Saved Alerts */}
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <div key={alert.id} style={{
                  padding: 'var(--space-lg)',
                  background: alert.type === 'danger' ? 'rgba(255,107,107,0.05)' : 'rgba(255,179,71,0.03)',
                  border: `1px solid ${alert.type === 'danger' ? 'rgba(255,107,107,0.15)' : 'rgba(255,179,71,0.1)'}`,
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--space-md)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {alert.type === 'danger' ? '🔴' : alert.type === 'warning' ? '🟡' : '🔵'} {alert.title}
                    </span>
                    <div className="flex gap-sm">
                      {!alert.resolved && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => alert.id && handleResolve(alert.id)}
                          style={{ fontSize: '0.75rem' }}
                        >
                          ✅ Xử lý
                        </button>
                      )}
                      <span className={`badge ${alert.resolved ? 'badge-success' : 'badge-danger'}`}>
                        {alert.resolved ? 'Đã xử lý' : 'Cần xem xét'}
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    {alert.description}
                  </p>
                </div>
              ))
            ) : suspicious.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>✅</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Không có cảnh báo — tất cả giao dịch bình thường
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-lg">
          <div className="glass-card animate-fade-in-up delay-300">
            <div className="card-header">
              <h3 className="card-title">🤖 AI Fraud Analysis</h3>
              <span className="badge badge-primary">Auto</span>
            </div>
            <div className="card-body" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
              <div style={{
                width: '120px', height: '120px', margin: '0 auto var(--space-lg)',
                background: suspicious.length === 0 ? 'rgba(0, 230, 118, 0.08)' : 'rgba(255, 179, 71, 0.08)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `2px solid ${suspicious.length === 0 ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255, 179, 71, 0.2)'}`,
              }}>
                <span style={{ fontSize: '3rem' }}>{suspicious.length === 0 ? '✅' : '⚠️'}</span>
              </div>
              <h3 style={{ color: suspicious.length === 0 ? 'var(--accent-emerald)' : 'var(--accent-amber)', marginBottom: 'var(--space-sm)' }}>
                {suspicious.length === 0 ? 'An Toàn' : `${suspicious.length} cảnh báo`}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {suspicious.length === 0
                  ? 'Không phát hiện hoạt động đáng ngờ trong giao dịch của bạn'
                  : `Phát hiện ${suspicious.length} giao dịch cần xem xét`
                }
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-sm)' }}>
                Phân tích: {transactions.length} giao dịch
              </p>
            </div>
          </div>

          <div className="glass-card animate-fade-in-up delay-350" style={{
            background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.1), rgba(0, 210, 255, 0.05))',
            borderColor: 'rgba(108, 99, 255, 0.3)',
          }}>
            <div className="card-header">
              <h3 className="card-title">🔍 Fake Bill & QR Scanner</h3>
              <span className="badge badge-primary">Mới / AI</span>
            </div>
            <div className="card-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', lineHeight: 1.5 }}>
                Bảo vệ quầy thu ngân & tiểu thương khỏi biên lai chuyển khoản giả mạo (fake bill ngân hàng) hoặc mã QR độc hại.
              </p>
              <Link href="/fake-bill" className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                🚀 Mở Fake Bill Detector
              </Link>
            </div>
          </div>

          <div className="glass-card animate-fade-in-up delay-400">
            <div className="card-header">
              <h3 className="card-title">🔐 Bảo mật</h3>
            </div>
            <div className="card-body">
              {[
                { name: 'Firebase Auth', status: true },
                { name: 'Firestore Security Rules', status: true },
                { name: 'AI Fraud Detection', status: true },
                { name: 'Transaction Monitoring', status: true },
                { name: 'Location Check', status: false },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: 'var(--space-sm) 0',
                  borderBottom: i < 4 ? '1px solid var(--border-subtle)' : 'none'
                }}>
                  <span style={{ fontSize: '0.85rem' }}>{item.name}</span>
                  <span className={`badge ${item.status ? 'badge-success' : 'badge-warning'}`}>
                    {item.status ? '✅ ON' : '⚠️ OFF'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
