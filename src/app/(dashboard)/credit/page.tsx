'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast/Toast';
import {
  getTransactions,
  calculateCreditScore,
  getScoreFactors,
  getScoreLabel,
  seedDemoTransactions,
} from '@/lib/firestore';

export default function CreditScorePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [score, setScore] = useState(0);
  const [scoreFactors, setScoreFactors] = useState<{ name: string; score: number; weight: string; icon: string; color: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const maxScore = 850;

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      await seedDemoTransactions(user.uid);
      const [creditScore, transactions] = await Promise.all([
        calculateCreditScore(user.uid),
        getTransactions(user.uid, 500),
      ]);
      setScore(creditScore);
      setScoreFactors(getScoreFactors(transactions));
    } catch (err) {
      console.error('Error loading credit score:', err);
      showToast('error', 'Lỗi tải điểm tín dụng');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRecalculate = async () => {
    if (!user || recalculating) return;
    setRecalculating(true);
    try {
      const newScore = await calculateCreditScore(user.uid);
      const transactions = await getTransactions(user.uid, 500);
      setScore(newScore);
      setScoreFactors(getScoreFactors(transactions));
      showToast('success', 'Đã cập nhật điểm tín dụng', `Score: ${newScore}`);
    } catch (err) {
      showToast('error', 'Lỗi tính điểm tín dụng');
      console.error(err);
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-md)' }}>📈</div>
          <p style={{ color: 'var(--text-secondary)' }}>Đang tính điểm tín dụng...</p>
        </div>
      </div>
    );
  }

  const percentage = (score / maxScore) * 100;
  const { label: scoreLabel, color: scoreLabelColor } = getScoreLabel(score);

  return (
    <div>
      <div className="page-header animate-fade-in-down">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">📈 Credit Score <span className="text-gradient">On-Chain</span></h1>
            <p className="page-subtitle">Điểm tín dụng phi tập trung — tính từ lịch sử giao dịch thật</p>
          </div>
          <div className="flex gap-sm">
            <button
              className="btn btn-primary btn-sm"
              onClick={handleRecalculate}
              disabled={recalculating}
            >
              {recalculating ? '⏳ Đang tính...' : '🔄 Tính lại'}
            </button>
          </div>
        </div>
      </div>

      {/* Score Display */}
      <div className="content-grid" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="glass-card animate-scale-in" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
          <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto var(--space-xl)' }}>
            <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
              <circle
                cx="100" cy="100" r="85"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${percentage * 5.34} ${534 - percentage * 5.34}`}
                style={{ transition: 'stroke-dasharray 1s ease' }}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="var(--secondary)" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'var(--font-mono)' }} className="text-gradient">
                {score}
              </div>
              <div style={{ fontSize: '0.85rem', color: scoreLabelColor, fontWeight: 600 }}>{scoreLabel}</div>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-md)' }}>
            Điểm tín dụng được tính từ <strong style={{ color: 'var(--primary-light)' }}>lịch sử giao dịch thật</strong> của bạn
          </p>
          <div className="badge badge-primary" style={{ padding: '8px 16px' }}>
            🔗 Tính từ Firestore Data
          </div>
        </div>

        <div className="flex flex-col gap-lg">
          {/* Score Scale */}
          <div className="glass-card animate-fade-in-up delay-200">
            <div className="card-header">
              <h3 className="card-title">📊 Thang điểm</h3>
            </div>
            <div className="card-body">
              {[
                { range: '750 - 850', label: 'Xuất sắc', color: 'var(--accent-emerald)' },
                { range: '650 - 749', label: 'Tốt', color: 'var(--primary-light)' },
                { range: '550 - 649', label: 'Trung bình', color: 'var(--accent-amber)' },
                { range: '400 - 549', label: 'Cần cải thiện', color: 'var(--accent-coral)' },
                { range: '300 - 399', label: 'Thấp', color: '#FF4444' },
              ].map((item, i) => {
                const isActive = score >= parseInt(item.range.split(' - ')[0]) && score <= parseInt(item.range.split(' - ')[1]);
                return (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: 'var(--space-sm) var(--space-md)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '4px',
                    background: isActive ? `${item.color}15` : 'transparent',
                    border: isActive ? `1px solid ${item.color}30` : '1px solid transparent',
                  }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: isActive ? 700 : 400 }}>
                      {isActive ? '👉 ' : ''}{item.label}
                    </span>
                    <span className="text-mono" style={{ fontSize: '0.8rem', color: item.color, fontWeight: 600 }}>
                      {item.range}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Recommendation */}
          <div className="glass-card animate-fade-in-up delay-300" style={{
            background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.08), rgba(0, 210, 255, 0.05))',
            borderColor: 'rgba(108, 99, 255, 0.15)'
          }}>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                <span>🤖</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>AI Recommendation</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {score >= 750 ? (
                  <>Điểm tín dụng của bạn <strong style={{ color: 'var(--accent-emerald)' }}>xuất sắc</strong>! Tiếp tục duy trì thói quen tài chính tốt.</>
                ) : score >= 650 ? (
                  <>Điểm tín dụng <strong style={{ color: 'var(--primary-light)' }}>tốt</strong>. Để tăng điểm, hãy đa dạng hóa giao dịch và duy trì tỷ lệ thu/chi ổn định.</>
                ) : score >= 550 ? (
                  <>Điểm tín dụng <strong style={{ color: 'var(--accent-amber)' }}>trung bình</strong>. Hãy tăng thu nhập hoặc giảm chi tiêu, và thêm nhiều giao dịch để cải thiện.</>
                ) : (
                  <>Điểm tín dụng <strong style={{ color: 'var(--accent-coral)' }}>cần cải thiện</strong>. Thêm nhiều giao dịch, duy trì đều đặn, và cân bằng thu/chi.</>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Score Factors */}
      <div className="glass-card animate-fade-in-up delay-300">
        <div className="card-header">
          <h3 className="card-title">🔍 Yếu tố ảnh hưởng</h3>
        </div>
        <div className="card-body">
          {scoreFactors.map((factor, i) => (
            <div key={i} style={{ marginBottom: 'var(--space-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                  {factor.icon} {factor.name}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>({factor.weight})</span>
                </span>
                <span className="text-mono" style={{ fontWeight: 600, color: factor.color }}>{factor.score}/100</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${factor.score}%`,
                  background: factor.color, borderRadius: '4px',
                  transition: 'width 1s ease'
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
