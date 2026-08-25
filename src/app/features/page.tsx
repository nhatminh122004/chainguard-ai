'use client';

import React from 'react';
import Link from 'next/link';
import Logo3D from '@/components/Logo3D/Logo3D';
import '../landing.css';
import './pages.css';

const features = [
  {
    icon: '🤖', title: 'AI Financial Advisor', tag: 'Gemini 2.0 Flash',
    gradient: 'linear-gradient(135deg, #6C63FF, #8B83FF)',
    description: 'Chatbot tư vấn tài chính thông minh được hỗ trợ bởi Google Gemini 2.0 Flash. Hiểu ngữ cảnh tiếng Việt, phân tích xu hướng chi tiêu, và đưa ra lời khuyên đầu tư cá nhân hóa.',
    details: [
      { title: 'Chat AI Tiếng Việt', desc: 'Giao tiếp tự nhiên bằng tiếng Việt, hiểu văn hóa tài chính Việt Nam', icon: '💬' },
      { title: 'Phân Tích Pattern', desc: 'AI học từ lịch sử chi tiêu để phát hiện thói quen và đề xuất cải thiện', icon: '📈' },
      { title: 'Cảnh Báo Thông Minh', desc: 'Nhận thông báo khi chi tiêu vượt ngưỡng hoặc có giao dịch bất thường', icon: '🔔' },
      { title: 'Tư Vấn Đầu Tư', desc: 'Đề xuất chiến lược tiết kiệm và đầu tư phù hợp với mục tiêu cá nhân', icon: '💰' },
    ],
    demo: { label: 'Thử AI Chat ngay', href: '/login' },
  },
  {
    icon: '📷', title: 'Receipt Scanner AI', tag: 'Gemini Vision',
    gradient: 'linear-gradient(135deg, #00D2FF, #00A8CC)',
    description: 'Quét hóa đơn bằng camera hoặc upload ảnh — AI Gemini Vision tự động nhận diện cửa hàng, sản phẩm, giá tiền và phân loại chi tiêu trong tích tắc.',
    details: [
      { title: 'OCR Thông Minh', desc: 'Nhận diện text trên hóa đơn Việt Nam, bao gồm cả viết tay', icon: '👁️' },
      { title: 'Auto Categorize', desc: 'Tự động phân loại vào danh mục: Ăn uống, Mua sắm, Di chuyển, etc.', icon: '📂' },
      { title: 'Multi-Format', desc: 'Hỗ trợ JPG, PNG, WEBP — chụp trực tiếp hoặc upload từ gallery', icon: '🖼️' },
      { title: 'Lưu & Xác Minh', desc: 'Lưu kết quả vào Firestore và ghi hash lên blockchain Polygon', icon: '🔗' },
    ],
    demo: { label: 'Thử Scanner ngay', href: '/login' },
  },
  {
    icon: '🔗', title: 'Blockchain Ledger', tag: 'Polygon Network',
    gradient: 'linear-gradient(135deg, #BB86FC, #9C27B0)',
    description: 'Sổ cái giao dịch phi tập trung trên blockchain Polygon. Mỗi giao dịch được hash SHA-256 và ghi nhận on-chain — minh bạch, bất biến, và xác minh được bất kỳ lúc nào.',
    details: [
      { title: 'Hash Giao Dịch', desc: 'Mỗi giao dịch được tạo hash SHA-256 và ghi lên smart contract', icon: '🔐' },
      { title: 'Smart Contract Savings', desc: 'Hợp đồng thông minh tự động quản lý mục tiêu tiết kiệm', icon: '📄' },
      { title: 'Xác Minh Công Khai', desc: 'Bất kỳ ai cũng có thể verify giao dịch trên Polygonscan', icon: '✅' },
      { title: 'Gas Fee Thấp', desc: 'Chi phí giao dịch chỉ ~0.001 MATIC (~0.5đ) trên Polygon', icon: '⚡' },
    ],
    demo: { label: 'Xem Blockchain Explorer', href: '/login' },
  },
  {
    icon: '🛡️', title: 'Fraud Detection Shield', tag: 'Gemini + FCM',
    gradient: 'linear-gradient(135deg, #FF6B6B, #FF8A80)',
    description: 'Hệ thống phát hiện gian lận real-time bằng AI. Phân tích mẫu giao dịch, phát hiện bất thường, cảnh báo location fraud, và gửi push notification ngay lập tức.',
    details: [
      { title: 'Real-Time Scan', desc: 'Quét mọi giao dịch 24/7, phân tích pattern để phát hiện anomaly', icon: '🔍' },
      { title: 'Location Fraud', desc: 'So sánh vị trí giao dịch với Google Maps để phát hiện fraud', icon: '📍' },
      { title: 'Push Notification', desc: 'Cảnh báo tức thì qua Firebase Cloud Messaging khi phát hiện', icon: '📲' },
      { title: 'Report & Block', desc: 'Tự động khóa giao dịch đáng ngờ và tạo báo cáo chi tiết', icon: '🚫' },
    ],
    demo: { label: 'Xem Fraud Shield', href: '/login' },
  },
  {
    icon: '📈', title: 'On-Chain Credit Score', tag: 'Smart Contracts',
    gradient: 'linear-gradient(135deg, #00E676, #69F0AE)',
    description: 'Điểm tín dụng phi tập trung (300-850) dựa trên hành vi tài chính thực tế. Lưu trữ minh bạch trên blockchain, không thể giả mạo hay chỉnh sửa.',
    details: [
      { title: 'Scoring Algorithm', desc: '5 yếu tố: Thanh toán (35%), Sử dụng (30%), Thời gian (15%), Đa dạng (10%), Yêu cầu mới (10%)', icon: '📊' },
      { title: 'On-Chain Storage', desc: 'Score được hash và lưu on-chain, ai cũng có thể verify', icon: '🔗' },
      { title: 'Google Sheets Export', desc: 'Tự động export báo cáo credit score sang Google Sheets', icon: '📋' },
      { title: 'Calendar Reminders', desc: 'Đồng bộ lịch thanh toán vào Google Calendar', icon: '📅' },
    ],
    demo: { label: 'Xem Credit Score', href: '/login' },
  },
  {
    icon: '📄', title: 'AI Financial Report', tag: 'Gemini 2.0 Flash',
    gradient: 'linear-gradient(135deg, #FFB347, #FF9800)',
    description: 'Báo cáo tài chính toàn diện được tạo bởi AI Gemini. Phân tích chi tiêu, đánh giá rủi ro, khuyến nghị tối ưu tài chính — tất cả dựa trên dữ liệu giao dịch thực tế.',
    details: [
      { title: 'Phân Tích Toàn Diện', desc: 'AI phân tích thu/chi, xu hướng, và sức khỏe tài chính tổng thể', icon: '📊' },
      { title: 'Cảnh Báo Rủi Ro', desc: 'Phát hiện vấn đề tiềm ẩn: vượt chi, thiếu quỹ khẩn cấp', icon: '⚠️' },
      { title: 'Khuyến Nghị AI', desc: 'Lời khuyên cá nhân hóa với con số cụ thể từ Gemini', icon: '💡' },
      { title: 'Kế Hoạch Hành Động', desc: 'Các bước cụ thể với timeline cho tháng tới', icon: '📅' },
    ],
    demo: { label: 'Xem AI Report', href: '/login' },
  },
];

export default function FeaturesPage() {
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
            <Link href="/features" className="nav-link nav-active">Tính năng</Link>
            <Link href="/how-it-works" className="nav-link">Cách hoạt động</Link>
            <Link href="/technology" className="nav-link">Công nghệ</Link>
            <Link href="/stats" className="nav-link">Số liệu</Link>
            <Link href="/login" className="btn btn-primary btn-sm">Bắt đầu ngay</Link>
          </nav>
        </div>
      </header>

      <main className="static-main">
        <div className="static-container">
          <div className="section-header" style={{ marginTop: '100px' }}>
            <span className="section-badge">✨ Tính Năng Chi Tiết</span>
            <h1 className="section-title" style={{ fontSize: '3rem' }}>
              6 Module <span className="text-gradient-animated">Mạnh Mẽ</span>
            </h1>
            <p className="section-description">
              Kết hợp hoàn hảo giữa AI Gemini, Blockchain Polygon và hệ sinh thái Google Technologies
            </p>
          </div>

          <div className="features-detail-list">
            {features.map((feature, index) => (
              <div key={feature.title} className={`feature-detail-card animate-fade-in-up ${index % 2 !== 0 ? 'reverse' : ''}`}>
                <div className="fdc-content">
                  <div className="fdc-tag-row">
                    <span className="fdc-icon-lg" style={{ background: feature.gradient }}>{feature.icon}</span>
                    <span className="fdc-tech-tag">{feature.tag}</span>
                  </div>
                  <h2 className="fdc-title">{feature.title}</h2>
                  <p className="fdc-description">{feature.description}</p>
                  <Link href={feature.demo.href} className="btn btn-primary btn-sm" style={{ marginTop: 'var(--space-md)' }}>
                    {feature.demo.label} →
                  </Link>
                </div>
                <div className="fdc-details-grid">
                  {feature.details.map((detail) => (
                    <div key={detail.title} className="fdc-detail-item glass-card">
                      <span className="fdc-detail-icon">{detail.icon}</span>
                      <h4 className="fdc-detail-title">{detail.title}</h4>
                      <p className="fdc-detail-desc">{detail.desc}</p>
                    </div>
                  ))}
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
