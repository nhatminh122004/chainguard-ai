'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Logo3D from '@/components/Logo3D/Logo3D';
import '../landing.css';
import './pages.css';

function AnimatedCounter({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const duration = 2000;
          const startTime = performance.now();
          const step = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

const impactStats = [
  {
    category: 'Vấn Đề',
    icon: '⚠️',
    color: '#FF6B6B',
    stats: [
      { label: 'Người Việt chưa có tài khoản ngân hàng', value: 13000000, suffix: '', desc: 'Hơn 13 triệu người chưa tiếp cận dịch vụ tài chính' },
      { label: 'Thiệt hại gian lận tài chính/năm', value: 1500, suffix: ' tỷ₫', desc: 'Ước tính thiệt hại do gian lận tại Việt Nam' },
      { label: 'Tỷ lệ người không theo dõi chi tiêu', value: 67, suffix: '%', desc: 'Không biết tiền đi đâu mỗi tháng' },
      { label: 'Người không có credit score', value: 49000000, suffix: '', desc: 'Gần 50 triệu người không có lịch sử tín dụng' },
    ],
  },
  {
    category: 'Giải Pháp ChainGuard AI',
    icon: '✅',
    color: '#00E676',
    stats: [
      { label: 'Tỷ lệ phát hiện gian lận', value: 99, suffix: '%', desc: 'AI Gemini phân tích real-time 24/7' },
      { label: 'Thời gian scan hóa đơn', value: 3, suffix: 's', desc: 'Gemini Vision nhận diện trong 3 giây' },
      { label: 'Chi phí giao dịch blockchain', value: 0, suffix: '.001 MATIC', desc: 'Chỉ ~0.5đ mỗi giao dịch on-chain' },
      { label: 'Google Technologies tích hợp', value: 10, suffix: '+', desc: 'Gemini, Firebase, Maps, Sheets, Gmail, Calendar, Cloud Run...' },
    ],
  },
  {
    category: 'Tác Động Xã Hội',
    icon: '🌍',
    color: '#00D2FF',
    stats: [
      { label: 'Đối tượng hưởng lợi', value: 62000000, suffix: '', desc: '62 triệu người trưởng thành tại Việt Nam' },
      { label: 'Tiết kiệm chi tiêu trung bình', value: 15, suffix: '%', desc: 'Nhờ AI phân tích và đề xuất ngân sách' },
      { label: 'Giảm rủi ro gian lận', value: 80, suffix: '%', desc: 'Với hệ thống phát hiện AI real-time' },
      { label: 'Người có thể xây credit score', value: 49000000, suffix: '', desc: 'On-chain credit score không cần ngân hàng' },
    ],
  },
];

const competitorComparison = [
  { feature: 'AI Financial Advisor', chainguard: true, momo: false, toss: true, bankApp: false },
  { feature: 'Receipt Scanner (Vision)', chainguard: true, momo: false, toss: false, bankApp: false },
  { feature: 'Blockchain Ledger', chainguard: true, momo: false, toss: false, bankApp: false },
  { feature: 'On-Chain Credit Score', chainguard: true, momo: false, toss: false, bankApp: false },
  { feature: 'Fraud Detection AI', chainguard: true, momo: true, toss: true, bankApp: true },
  { feature: 'Google Workspace', chainguard: true, momo: false, toss: false, bankApp: false },
  { feature: 'Open Source', chainguard: true, momo: false, toss: false, bankApp: false },
  { feature: 'Miễn phí 100%', chainguard: true, momo: true, toss: true, bankApp: false },
];

export default function StatsPage() {
  return (
    <div className="static-page">
      <div className="static-bg">
        <div className="static-orb static-orb-1"></div>
        <div className="static-orb static-orb-2"></div>
        <div className="static-grid"></div>
      </div>

      <header className="static-header">
        <div className="static-container">
          <Logo3D size="md" href="/" />
          <nav className="landing-nav">
            <Link href="/features" className="nav-link">Tính năng</Link>
            <Link href="/how-it-works" className="nav-link">Cách hoạt động</Link>
            <Link href="/technology" className="nav-link">Công nghệ</Link>
            <Link href="/stats" className="nav-link nav-active">Số liệu</Link>
            <Link href="/login" className="btn btn-primary btn-sm">Bắt đầu ngay</Link>
          </nav>
        </div>
      </header>

      <main className="static-main">
        <div className="static-container">
          <div className="section-header" style={{ marginTop: '100px' }}>
            <span className="section-badge">📊 Số Liệu & Tác Động</span>
            <h1 className="section-title" style={{ fontSize: '3rem' }}>
              Tại Sao <span className="text-gradient-animated">ChainGuard AI</span>?
            </h1>
            <p className="section-description">
              Số liệu thực tế về vấn đề tài chính tại Việt Nam và tác động của giải pháp
            </p>
          </div>

          {/* Impact Stats */}
          {impactStats.map((section, si) => (
            <div key={section.category} className="stats-section-card animate-fade-in-up" style={{ animationDelay: `${si * 0.1}s` }}>
              <h2 className="stats-section-title">
                <span>{section.icon}</span> {section.category}
              </h2>
              <div className="stats-number-grid">
                {section.stats.map((stat) => (
                  <div key={stat.label} className="stat-number-card glass-card">
                    <span className="stat-number-value" style={{ color: section.color }}>
                      <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                    </span>
                    <span className="stat-number-label">{stat.label}</span>
                    <span className="stat-number-desc">{stat.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Competitor Comparison */}
          <div className="comparison-section animate-fade-in-up">
            <h2 className="stats-section-title">
              <span>⚔️</span> So Sánh Với Giải Pháp Khác
            </h2>
            <div className="glass-card" style={{ overflow: 'auto' }}>
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Tính năng</th>
                    <th className="highlight-col">ChainGuard AI</th>
                    <th>MoMo</th>
                    <th>Toss</th>
                    <th>Bank App</th>
                  </tr>
                </thead>
                <tbody>
                  {competitorComparison.map((row) => (
                    <tr key={row.feature}>
                      <td>{row.feature}</td>
                      <td className="highlight-col">{row.chainguard ? '✅' : '❌'}</td>
                      <td>{row.momo ? '✅' : '❌'}</td>
                      <td>{row.toss ? '✅' : '❌'}</td>
                      <td>{row.bankApp ? '✅' : '❌'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CTA */}
          <div className="stats-cta glass-card animate-fade-in-up" style={{ textAlign: 'center', padding: 'var(--space-3xl)', marginTop: 'var(--space-2xl)' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 'var(--space-md)' }}>
              Sẵn Sàng <span className="text-gradient-animated">Thay Đổi</span>?
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)', fontSize: '1.1rem' }}>
              Tham gia ChainGuard AI — hoàn toàn miễn phí, bảo mật, và minh bạch.
            </p>
            <Link href="/login" className="btn btn-primary btn-lg">
              🚀 Bắt Đầu Ngay
            </Link>
          </div>
        </div>
      </main>

      <footer className="static-footer">
        <div className="static-container">
          <div className="footer-content">
            <span>🛡️ ChainGuard AI — Built for AIRiserVietnam 2026</span>
            <Link href="/" className="nav-link">← Về trang chủ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
