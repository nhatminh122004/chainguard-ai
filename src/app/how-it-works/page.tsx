'use client';

import React from 'react';
import Link from 'next/link';
import Logo3D from '@/components/Logo3D/Logo3D';
import '../landing.css';
import './pages.css';

const steps = [
  {
    step: '01',
    title: 'Đăng Ký & Kết Nối',
    icon: '🔐',
    color: '#6C63FF',
    description: 'Tạo tài khoản miễn phí bằng Google Account hoặc Email. Kết nối ví MetaMask để sử dụng các tính năng blockchain.',
    details: [
      'Đăng nhập 1-click với Google OAuth 2.0',
      'Kết nối MetaMask wallet (Polygon Amoy Testnet)',
      'Tự động tạo hồ sơ người dùng trên Firestore',
      'Khởi tạo credit score mặc định 500 điểm',
    ],
    techUsed: ['Firebase Auth', 'Firestore', 'ethers.js'],
  },
  {
    step: '02',
    title: 'Theo Dõi & Phân Tích',
    icon: '📊',
    color: '#00D2FF',
    description: 'AI tự động phân tích mọi giao dịch tài chính. Scan hóa đơn bằng camera, chat với AI advisor, và nhận insights real-time.',
    details: [
      'Nhập giao dịch thủ công hoặc scan hóa đơn bằng Gemini Vision',
      'AI phân tích pattern chi tiêu và đưa cảnh báo',
      'Tự động phân loại giao dịch theo danh mục',
      'Dashboard real-time với biểu đồ và thống kê',
    ],
    techUsed: ['Gemini 2.0 Flash', 'Gemini Vision', 'Cloud Firestore'],
  },
  {
    step: '03',
    title: 'Ghi Nhận On-Chain',
    icon: '🔗',
    color: '#BB86FC',
    description: 'Mỗi giao dịch quan trọng được hash SHA-256 và ghi nhận trên blockchain Polygon — minh bạch, bất biến, xác minh được.',
    details: [
      'Hash SHA-256 cho mỗi giao dịch',
      'Ghi lên smart contract TransactionLedger.sol',
      'Gas fee cực thấp (~0.001 MATIC)',
      'Xem trên Polygonscan công khai',
    ],
    techUsed: ['Polygon', 'Solidity', 'ethers.js'],
  },
  {
    step: '04',
    title: 'Bảo Vệ & Cảnh Báo',
    icon: '🛡️',
    color: '#FF6B6B',
    description: 'Hệ thống Fraud Shield quét 24/7. Phát hiện giao dịch bất thường, location fraud, và gửi cảnh báo push notification.',
    details: [
      'AI scan real-time mọi giao dịch mới',
      'AI phân tích pattern giao dịch bất thường',
      'Push notification qua Firebase Cloud Messaging',
      'Tự động khóa giao dịch đáng ngờ',
    ],
    techUsed: ['Gemini AI', 'Firestore', 'FCM'],
  },
  {
    step: '05',
    title: 'Xây Dựng Credit Score',
    icon: '📈',
    color: '#00E676',
    description: 'Điểm tín dụng on-chain được tính tự động dựa trên hành vi tài chính. Thanh toán đúng hạn, chi tiêu hợp lý = score cao.',
    details: [
      'Score từ 300-850, tính theo 5 yếu tố',
      'Cập nhật on-chain mỗi tháng',
      'Export báo cáo sang Google Sheets',
      'Nhắc lịch thanh toán qua Google Calendar',
    ],
    techUsed: ['Smart Contracts', 'Google Sheets', 'Calendar API'],
  },
  {
    step: '06',
    title: 'Báo Cáo & Tối Ưu',
    icon: '📋',
    color: '#FFB347',
    description: 'Nhận báo cáo tài chính tự động hàng tháng qua email. AI đề xuất chiến lược tối ưu chi tiêu và tiết kiệm.',
    details: [
      'Email digest hàng tháng qua Gmail API',
      'Báo cáo chi tiết trên Google Sheets',
      'AI đề xuất ngân sách tối ưu',
      'So sánh tiến độ với mục tiêu đặt ra',
    ],
    techUsed: ['Gmail API', 'Google Sheets', 'Gemini AI'],
  },
];

export default function HowItWorksPage() {
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
            <Link href="/how-it-works" className="nav-link nav-active">Cách hoạt động</Link>
            <Link href="/technology" className="nav-link">Công nghệ</Link>
            <Link href="/stats" className="nav-link">Số liệu</Link>
            <Link href="/login" className="btn btn-primary btn-sm">Bắt đầu ngay</Link>
          </nav>
        </div>
      </header>

      <main className="static-main">
        <div className="static-container">
          <div className="section-header" style={{ marginTop: '100px' }}>
            <span className="section-badge">🔄 Cách Hoạt Động</span>
            <h1 className="section-title" style={{ fontSize: '3rem' }}>
              Quy Trình <span className="text-gradient-animated">6 Bước</span>
            </h1>
            <p className="section-description">
              Từ đăng ký đến bảo vệ tài chính toàn diện — mọi thứ được tự động hóa bởi AI
            </p>
          </div>

          <div className="timeline">
            <div className="timeline-line"></div>
            {steps.map((item, index) => (
              <div key={item.step} className="timeline-item animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="timeline-marker" style={{ background: `${item.color}20`, borderColor: `${item.color}50`, color: item.color }}>
                  {item.step}
                </div>
                <div className="timeline-card glass-card">
                  <div className="timeline-card-header">
                    <span className="timeline-icon" style={{ background: `${item.color}15` }}>{item.icon}</span>
                    <div>
                      <h3 className="timeline-title">{item.title}</h3>
                      <p className="timeline-desc">{item.description}</p>
                    </div>
                  </div>
                  <ul className="timeline-details">
                    {item.details.map((detail, i) => (
                      <li key={i}>
                        <span className="timeline-check" style={{ color: item.color }}>✓</span>
                        {detail}
                      </li>
                    ))}
                  </ul>
                  <div className="timeline-tech">
                    {item.techUsed.map((tech) => (
                      <span key={tech} className="timeline-tech-badge">{tech}</span>
                    ))}
                  </div>
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
