'use client';

import React from 'react';
import Link from 'next/link';
import Logo3D from '@/components/Logo3D/Logo3D';
import '../landing.css';
import './pages.css';

const googleTech = [
  {
    name: 'Gemini 2.0 Flash',
    category: 'AI / Machine Learning',
    icon: '✨',
    color: '#6C63FF',
    description: 'Model ngôn ngữ lớn mạnh nhất của Google. Hỗ trợ đa ngôn ngữ (tiếng Việt), multimodal (text + image), context window lớn.',
    useCases: ['AI Financial Advisor chatbot', 'Phân tích pattern chi tiêu', 'Cảnh báo gian lận thông minh', 'Tóm tắt báo cáo tài chính'],
    integration: 'Sử dụng @google/generative-ai SDK, system prompt tùy chỉnh cho Fintech Việt Nam.',
  },
  {
    name: 'Gemini Vision',
    category: 'AI / Computer Vision',
    icon: '👁️',
    color: '#00D2FF',
    description: 'Khả năng nhận diện hình ảnh của Gemini. Phân tích ảnh hóa đơn, nhận diện text (OCR), và trích xuất thông tin có cấu trúc.',
    useCases: ['Receipt Scanner — quét hóa đơn', 'OCR tiếng Việt trên hóa đơn', 'Auto-categorize sản phẩm', 'Trích xuất merchant, date, amount'],
    integration: 'Sử dụng inlineData với base64 image, prompt engineering cho JSON output.',
  },
  {
    name: 'Firebase Authentication',
    category: 'Identity & Security',
    icon: '🔐',
    color: '#FFCA28',
    description: 'Xác thực người dùng an toàn với nhiều provider. Hỗ trợ Google Sign-in, Email/Password, Phone OTP, và anonymous auth.',
    useCases: ['Google Sign-in 1-click', 'Email/Password registration', 'Session management', 'User profile auto-creation'],
    integration: 'Firebase Auth SDK v9+ modular, AuthContext React Provider, onAuthStateChanged listener.',
  },
  {
    name: 'Cloud Firestore',
    category: 'Database',
    icon: '🔥',
    color: '#FF6D00',
    description: 'NoSQL database realtime của Google. Lưu trữ transactions, user profiles, receipts, credit scores với realtime sync.',
    useCases: ['Users collection — hồ sơ người dùng', 'Transactions — giao dịch tài chính', 'Receipts — hóa đơn đã scan', 'Credit scores — lịch sử điểm tín dụng'],
    integration: 'Collections: users, transactions, receipts, credit_scores. Security Rules theo user UID.',
  },
  {
    name: 'Firebase Cloud Messaging',
    category: 'Messaging',
    icon: '📲',
    color: '#1976D2',
    description: 'Push notification đa nền tảng. Gửi cảnh báo gian lận, nhắc thanh toán, và thông báo tài chính real-time.',
    useCases: ['Fraud alert — cảnh báo gian lận', 'Payment reminder — nhắc thanh toán', 'Score update — cập nhật credit score', 'Monthly report — báo cáo tháng'],
    integration: 'FCM SDK, service worker, topic-based messaging cho từng loại notification.',
  },
  {
    name: 'Gemini AI Reports',
    category: 'AI Analytics',
    icon: '📄',
    color: '#4CAF50',
    description: 'Báo cáo tài chính toàn diện được tạo bởi Gemini AI. Phân tích chi tiêu, đánh giá rủi ro, khuyến nghị cá nhân hóa dựa trên dữ liệu thực.',
    useCases: ['Báo cáo tài chính hàng tháng', 'Phân tích xu hướng chi tiêu', 'Cảnh báo rủi ro tài chính', 'Kế hoạch hành động cá nhân'],
    integration: 'Gemini 2.0 Flash với system prompt chuyên biệt, phân tích data Firestore real-time.',
  },
  {
    name: 'Google Sheets API',
    category: 'Workspace',
    icon: '📋',
    color: '#0F9D58',
    description: 'Tự động export báo cáo tài chính sang Google Sheets. Người dùng có thể xem, chia sẻ, và phân tích thêm.',
    useCases: ['Monthly financial report export', 'Credit score history tracking', 'Transaction details spreadsheet', 'Budget vs actual comparison'],
    integration: 'Google Sheets API v4, OAuth2 service account, auto-create spreadsheet per user.',
  },
  {
    name: 'Gmail API',
    category: 'Workspace',
    icon: '📧',
    color: '#EA4335',
    description: 'Gửi email báo cáo tài chính tự động. Monthly digest, cảnh báo quan trọng, và OTP verification.',
    useCases: ['Monthly email digest', 'Fraud alert email', 'Welcome email khi đăng ký', 'Credit score update notification'],
    integration: 'Gmail API v1, HTML email templates, scheduled Cloud Functions trigger.',
  },
  {
    name: 'Google Calendar API',
    category: 'Workspace',
    icon: '📅',
    color: '#4285F4',
    description: 'Đồng bộ lịch thanh toán vào Google Calendar. Tự động tạo event nhắc nhở trước ngày đến hạn.',
    useCases: ['Payment due date reminders', 'Subscription renewal alerts', 'Bill payment scheduling', 'Financial review reminders'],
    integration: 'Calendar API v3, auto-create calendar events, recurring reminders.',
  },
  {
    name: 'Google Cloud Run',
    category: 'Infrastructure',
    icon: '☁️',
    color: '#4285F4',
    description: 'Deploy containerized application trên Google Cloud. Auto-scaling, serverless, pay-per-use — zero devops overhead.',
    useCases: ['Production deployment', 'Auto-scaling theo traffic', 'Docker containerization', 'HTTPS & custom domain'],
    integration: 'Dockerfile, Cloud Build, github Actions CI/CD pipeline.',
  },
];

export default function TechnologyPage() {
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
            <Link href="/technology" className="nav-link nav-active">Công nghệ</Link>
            <Link href="/stats" className="nav-link">Số liệu</Link>
            <Link href="/login" className="btn btn-primary btn-sm">Bắt đầu ngay</Link>
          </nav>
        </div>
      </header>

      <main className="static-main">
        <div className="static-container">
          <div className="section-header" style={{ marginTop: '100px' }}>
            <span className="section-badge">🔧 Công Nghệ</span>
            <h1 className="section-title" style={{ fontSize: '3rem' }}>
              <span className="text-gradient-animated">10</span> Google Technologies
            </h1>
            <p className="section-description">
              Tích hợp sâu hệ sinh thái Google — từ AI đến Infrastructure, Workspace đến Security
            </p>
          </div>

          {/* Architecture Overview */}
          <div className="arch-overview glass-card animate-fade-in-up">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-lg)', textAlign: 'center' }}>
              🏗️ Kiến Trúc Hệ Thống
            </h3>
            <div className="arch-layers">
              <div className="arch-layer">
                <span className="arch-layer-label">Frontend</span>
                <div className="arch-items">
                  <span className="arch-item">Next.js 16</span>
                  <span className="arch-item">TypeScript</span>
                  <span className="arch-item">React 19</span>
                </div>
              </div>
              <div className="arch-arrow">↓</div>
              <div className="arch-layer">
                <span className="arch-layer-label">AI Layer</span>
                <div className="arch-items">
                  <span className="arch-item highlight">Gemini 2.0 Flash</span>
                  <span className="arch-item highlight">Gemini Vision</span>
                </div>
              </div>
              <div className="arch-arrow">↓</div>
              <div className="arch-layer">
                <span className="arch-layer-label">Backend</span>
                <div className="arch-items">
                  <span className="arch-item">Firebase Auth</span>
                  <span className="arch-item">Firestore</span>
                  <span className="arch-item">Cloud Functions</span>
                  <span className="arch-item">FCM</span>
                </div>
              </div>
              <div className="arch-arrow">↓</div>
              <div className="arch-layer">
                <span className="arch-layer-label">Blockchain</span>
                <div className="arch-items">
                  <span className="arch-item highlight">Polygon Network</span>
                  <span className="arch-item">Solidity</span>
                  <span className="arch-item">ethers.js</span>
                </div>
              </div>
              <div className="arch-arrow">↓</div>
              <div className="arch-layer">
                <span className="arch-layer-label">Workspace</span>
                <div className="arch-items">
                  <span className="arch-item">Sheets API</span>
                  <span className="arch-item">Gmail API</span>
                  <span className="arch-item">Calendar API</span>
                  <span className="arch-item">Gemini Reports</span>
                </div>
              </div>
              <div className="arch-arrow">↓</div>
              <div className="arch-layer">
                <span className="arch-layer-label">Deploy</span>
                <div className="arch-items">
                  <span className="arch-item highlight">Google Cloud Run</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tech Cards */}
          <div className="tech-detail-list">
            {googleTech.map((tech, index) => (
              <div key={tech.name} className="tech-detail-card glass-card animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
                <div className="tdc-header">
                  <div className="tdc-icon" style={{ background: `${tech.color}15`, borderColor: `${tech.color}30` }}>
                    <span>{tech.icon}</span>
                  </div>
                  <div>
                    <h3 className="tdc-name">{tech.name}</h3>
                    <span className="tdc-category">{tech.category}</span>
                  </div>
                </div>
                <p className="tdc-desc">{tech.description}</p>
                <div className="tdc-section">
                  <h4 className="tdc-section-title">Use Cases trong ChainGuard:</h4>
                  <ul className="tdc-use-cases">
                    {tech.useCases.map((uc, i) => (
                      <li key={i}><span style={{ color: tech.color }}>▸</span> {uc}</li>
                    ))}
                  </ul>
                </div>
                <div className="tdc-integration">
                  <span className="tdc-integration-label">Integration:</span>
                  <span className="tdc-integration-text">{tech.integration}</span>
                </div>
              </div>
            ))}
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
