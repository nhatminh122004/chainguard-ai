'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast/Toast';
import AddTransactionModal from '@/components/AddTransactionModal/AddTransactionModal';
import Link from 'next/link';
import {
  getDashboardStats,
  getRecentTransactions,
  getSpendingByCategory,
  getTransactions,
  addTransaction,
  seedDemoTransactions,
  Transaction,
  DashboardStats,
  getCategoryConfig,
  isTransactionOnChainVerified,
} from '@/lib/firestore';
import { SpendingDoughnutChart, TrendLineChart, MonthlyBarChart } from '@/components/Charts/Charts';
import { Timestamp } from 'firebase/firestore';

// Mini sparkline component
function Sparkline({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 120;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#grad-${color.replace('#', '')})`}
      />
    </svg>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [greeting, setGreeting] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [spending, setSpending] = useState<{ category: string; amount: number; percentage: number; color: string; icon: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [trendData, setTrendData] = useState<{ label: string; income: number; expense: number }[]>([]);

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    if (hour < 12) setGreeting('Chào buổi sáng');
    else if (hour < 18) setGreeting('Chào buổi chiều');
    else setGreeting('Chào buổi tối');

    setCurrentDate(now.toLocaleDateString('vi-VN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }));
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      // Seed demo data for new users
      await seedDemoTransactions(user.uid);

      const [dashStats, transactions, categorySpending] = await Promise.all([
        getDashboardStats(user.uid),
        getRecentTransactions(user.uid, 7),
        getSpendingByCategory(user.uid),
      ]);

      setStats(dashStats);
      setRecentTx(transactions);
      setSpending(categorySpending);

      // Build 7-day trend data
      const allTx = await getTransactions(user.uid, 200);
      const trend: { label: string; income: number; expense: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric' });
        let dayIncome = 0, dayExpense = 0;
        allTx.forEach(tx => {
          const txDate = tx.date instanceof Date ? tx.date : (tx.date as Timestamp).toDate();
          if (txDate.toDateString() === d.toDateString()) {
            if (tx.amount > 0) dayIncome += tx.amount;
            else dayExpense += Math.abs(tx.amount);
          }
        });
        trend.push({ label: dayStr, income: dayIncome, expense: dayExpense });
      }
      setTrendData(trend);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      showToast('error', 'Lỗi tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddTransaction = async (data: {
    name: string;
    amount: number;
    category: string;
    icon: string;
    date: Date;
    note: string;
    verified: boolean;
  }) => {
    if (!user) return;
    await addTransaction(user.uid, data);
    showToast('success', 'Đã thêm giao dịch', data.name);
    await loadData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(amount)) + '₫';
  };

  const formatShort = (amount: number) => {
    if (Math.abs(amount) >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
    if (Math.abs(amount) >= 1000) return (amount / 1000).toFixed(0) + 'K';
    return amount.toString();
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Vừa xong';
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays === 1) return '1 ngày trước';
    return `${diffDays} ngày trước`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-md)', animation: 'pulse 2s infinite' }}>📊</div>
          <p style={{ color: 'var(--text-secondary)' }}>Đang tải dashboard...</p>
        </div>
      </div>
    );
  }

  const balance = stats?.totalBalance || 0;
  const income = stats?.monthlyIncome || 0;
  const expense = stats?.monthlyExpense || 0;
  const creditScore = stats?.creditScore || 500;

  return (
    <div className="dashboard-page">
      {/* Page Header */}
      <div className="page-header animate-fade-in-down">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">
              {greeting}, <span className="text-gradient">{user?.displayName || 'User'}</span> 👋
            </h1>
            <p className="page-subtitle">{currentDate}</p>
          </div>
          <div className="flex gap-sm">
            <Link href="/scanner" className="btn btn-secondary btn-sm">
              📷 Scan hóa đơn
            </Link>
            <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
              + Thêm giao dịch
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards - 3D */}
      <div className="stats-grid">
        {[
          {
            label: 'Tổng số dư', value: formatCurrency(balance), valueClass: 'text-gradient',
            change: balance >= 0 ? 'Dương' : 'Âm', changeType: balance >= 0 ? 'positive' : 'negative' as const, icon: '💰',
            sparkData: [0, balance * 0.6, balance * 0.7, balance * 0.8, balance * 0.85, balance * 0.9, balance],
            sparkColor: '#6C63FF', borderColor: 'var(--primary)',
          },
          {
            label: 'Thu nhập tháng này', value: formatCurrency(income), valueClass: '',
            change: `${stats?.transactionCount || 0} giao dịch`, changeType: 'positive' as const, icon: '📈',
            sparkData: [0, income * 0.3, income * 0.5, income * 0.6, income * 0.75, income * 0.9, income],
            sparkColor: '#00E676', borderColor: 'var(--accent-emerald)',
          },
          {
            label: 'Chi tiêu tháng này', value: formatCurrency(expense), valueClass: '',
            change: `${spending.length} danh mục`, changeType: 'negative' as const, icon: '📉',
            sparkData: [0, expense * 0.2, expense * 0.35, expense * 0.5, expense * 0.65, expense * 0.8, expense],
            sparkColor: '#FFB347', borderColor: 'var(--accent-amber)',
          },
          {
            label: 'Credit Score', value: creditScore.toString(), valueClass: '',
            change: creditScore >= 650 ? 'Tốt' : 'Cần cải thiện',
            changeType: creditScore >= 650 ? 'positive' : 'negative' as const, icon: '🏆',
            sparkData: [creditScore - 50, creditScore - 40, creditScore - 30, creditScore - 20, creditScore - 15, creditScore - 5, creditScore],
            sparkColor: '#BB86FC', borderColor: 'var(--accent-purple)',
          },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="glass-card stat-card-3d animate-fade-in-up"
            style={{ animationDelay: `${i * 0.1}s`, borderTopColor: stat.borderColor }}
          >
            <div className="stat-card-top">
              <div>
                <p className="stat-label">{stat.label}</p>
                <p className={`stat-value-3d ${stat.valueClass}`} style={!stat.valueClass ? { color: stat.borderColor } : {}}>
                  {stat.value}
                </p>
              </div>
              <div className="stat-icon-3d" style={{ background: `${stat.borderColor}12` }}>
                {stat.icon}
              </div>
            </div>
            <div className="stat-card-bottom">
              <span className={`stat-change ${stat.changeType}`}>
                {stat.changeType === 'positive' ? '↑' : '↓'} {stat.change}
              </span>
              <Sparkline data={stat.sparkData} color={stat.sparkColor} height={32} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="content-grid">
        {/* Recent Transactions */}
        <div className="glass-card animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="card-header">
            <h3 className="card-title">💳 Giao dịch gần đây</h3>
            <Link href="/transactions" className="btn btn-ghost btn-sm">Xem tất cả →</Link>
          </div>
          <div className="card-body">
            {recentTx.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>📭</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Chưa có giao dịch nào</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 'var(--space-md)' }} onClick={() => setModalOpen(true)}>
                  + Thêm giao dịch
                </button>
              </div>
            ) : (
              <ul className="transaction-list">
                {recentTx.map((tx) => {
                  const txDate = tx.date instanceof Date ? tx.date : new Date();
                  return (
                    <li key={tx.id} className="transaction-item">
                      <div
                        className="transaction-icon-3d"
                        style={{ background: tx.amount > 0 ? 'rgba(0,230,118,0.08)' : 'rgba(255,107,107,0.08)' }}
                      >
                        <span>{tx.icon || getCategoryConfig(tx.category).icon}</span>
                      </div>
                      <div className="transaction-info">
                        <div className="transaction-name">
                          {tx.name}
                          {isTransactionOnChainVerified(tx) && (
                            <span className="badge badge-success" style={{ marginLeft: '8px', fontSize: '0.55rem', padding: '2px 6px' }}>
                              🔗 On-Chain
                            </span>
                          )}
                        </div>
                        <span className="transaction-category">{tx.category}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className={`transaction-amount ${tx.amount > 0 ? 'income' : 'expense'}`}>
                          {tx.amount > 0 ? '+' : '-'}{formatCurrency(tx.amount)}
                        </div>
                        <span className="transaction-time">{getTimeAgo(txDate)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-lg">
          {/* Fraud Shield Status */}
          <div className="glass-card animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="card-header">
              <h3 className="card-title">🛡️ Fraud Shield</h3>
              <span className="badge badge-success">Active</span>
            </div>
            <div className="card-body">
              <div className="shield-status-3d">
                <div className="shield-ring">
                  <div className="shield-ring-inner">
                    <span className="shield-icon">✅</span>
                  </div>
                  <svg className="shield-svg" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(0,230,118,0.1)" strokeWidth="3" />
                    <circle cx="50" cy="50" r="44" fill="none" stroke="var(--accent-emerald)" strokeWidth="3"
                      strokeDasharray="276" strokeDashoffset="0" strokeLinecap="round"
                      style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', animation: 'shieldRotate 3s linear infinite' }}
                    />
                  </svg>
                </div>
                <p style={{ color: 'var(--accent-emerald)', fontWeight: 700, fontSize: '0.95rem' }}>
                  An Toàn — Không phát hiện gian lận
                </p>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                  Quét lần cuối: vừa xong
                </p>
              </div>
              <div className="shield-stats-row">
                <div className="shield-stat">
                  <span className="text-mono" style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--accent-emerald)' }}>
                    {stats?.transactionCount || 0}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Đã quét</span>
                </div>
                <div className="shield-stat">
                  <span className="text-mono" style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--accent-amber)' }}>0</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Cảnh báo</span>
                </div>
                <div className="shield-stat">
                  <span className="text-mono" style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--accent-coral)' }}>0</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Đã chặn</span>
                </div>
              </div>
            </div>
          </div>

          {/* Spending by Category — Doughnut Chart */}
          <div className="glass-card animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <div className="card-header">
              <h3 className="card-title">📊 Chi tiêu theo danh mục</h3>
            </div>
            <div className="card-body">
              <SpendingDoughnutChart data={spending} />
            </div>
          </div>

          {/* AI Insight Card */}
          <div className="glass-card ai-insight-card animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            <div className="card-body">
              <div className="ai-insight-header">
                <div className="ai-avatar-pulse">
                  <span>🤖</span>
                  <div className="ai-pulse-ring"></div>
                </div>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>AI Insight</span>
                  <span className="badge badge-primary" style={{ marginLeft: '8px' }}>Gemini</span>
                </div>
              </div>
              <p className="ai-insight-text">
                {spending.length > 0 ? (
                  <>
                    Danh mục chi tiêu lớn nhất tháng này: <strong>{spending[0]?.category}</strong> ({formatShort(spending[0]?.amount || 0)}).
                    {income > expense ? (
                      <> Bạn đang tiết kiệm được <strong style={{ color: 'var(--accent-emerald)' }}>{formatCurrency(income - expense)}</strong> tháng này. Tuyệt vời! 🎉</>
                    ) : (
                      <> Chi tiêu đang vượt thu nhập <strong style={{ color: 'var(--accent-coral)' }}>{formatCurrency(expense - income)}</strong>. Hãy cắt giảm chi tiêu! ⚠️</>
                    )}
                  </>
                ) : (
                  <>Thêm giao dịch để AI phân tích chi tiêu và đưa ra lời khuyên tài chính cho bạn. 📊</>
                )}
              </p>
              <Link href="/chat" className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: 'var(--space-md)' }}>
                💬 Chat với AI Advisor
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Trend Charts Row */}
      <div className="content-grid" style={{ marginTop: 'var(--space-lg)' }}>
        <div className="glass-card animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
          <div className="card-header">
            <h3 className="card-title">📈 Xu hướng 7 ngày</h3>
            <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>Chart.js</span>
          </div>
          <div className="card-body">
            <TrendLineChart data={trendData} />
          </div>
        </div>
        <div className="glass-card animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
          <div className="card-header">
            <h3 className="card-title">📊 So sánh tháng</h3>
          </div>
          <div className="card-body">
            <MonthlyBarChart income={income} expense={expense} />
          </div>
        </div>
      </div>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddTransaction}
      />
    </div>
  );
}
