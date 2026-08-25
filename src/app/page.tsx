'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Logo3D from '@/components/Logo3D/Logo3D';
import './landing.css';

// Particle component
function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: Array<{
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; color: string;
    }> = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const colors = ['#6C63FF', '#00D2FF', '#BB86FC', '#FF6B6B', '#00E676'];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();

        // Draw connections
        particles.forEach((p2, j) => {
          if (i === j) return;
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = (1 - dist / 150) * 0.08;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      ctx.globalAlpha = 1;
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="particles-canvas" />;
}

// 3D Tilt Card
function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 15;
    const rotateY = (centerX - x) / 15;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (card) {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
    }
  };

  return (
    <div
      ref={cardRef}
      className={`tilt-card ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}

// Animated Counter
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
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

  return <span ref={ref} className="text-mono">{count.toLocaleString()}{suffix}</span>;
}

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouse, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouse);
    };
  }, []);

  if (loading) {
    return (
      <div className="loading-screen" suppressHydrationWarning>
        <div className="loading-container-3d" suppressHydrationWarning>
          <div className="cube-loader" suppressHydrationWarning>
            <div className="cube-face front" suppressHydrationWarning>🛡️</div>
            <div className="cube-face back" suppressHydrationWarning>🔗</div>
            <div className="cube-face right" suppressHydrationWarning>🤖</div>
            <div className="cube-face left" suppressHydrationWarning>📊</div>
            <div className="cube-face top" suppressHydrationWarning>💰</div>
            <div className="cube-face bottom" suppressHydrationWarning>🛡️</div>
          </div>
        </div>
        <p className="loading-text">Đang tải ChainGuard AI...</p>
        <div className="loading-bar" suppressHydrationWarning>
          <div className="loading-bar-fill" suppressHydrationWarning></div>
        </div>
      </div>
    );
  }

  return (
    <div className="landing" suppressHydrationWarning>
      {/* Animated Particles Background */}
      <Particles />

      {/* Animated Orbs with parallax */}
      <div className="landing-bg">
        <div className="orb orb-1" style={{ transform: `translate(${mousePos.x * 30}px, ${mousePos.y * 30}px)` }}></div>
        <div className="orb orb-2" style={{ transform: `translate(${-mousePos.x * 20}px, ${-mousePos.y * 20}px)` }}></div>
        <div className="orb orb-3" style={{ transform: `translate(${mousePos.x * 15}px, ${-mousePos.y * 15}px)` }}></div>
        <div className="grid-overlay"></div>
      </div>

      {/* Header */}
      <header className={`landing-header ${scrollY > 50 ? 'scrolled' : ''}`}>
        <div className="landing-container">
          <Logo3D size="md" href="/" />
          <nav className="landing-nav">
            <Link href="/features" className="nav-link">Tính năng</Link>
            <Link href="/how-it-works" className="nav-link">Cách hoạt động</Link>
            <Link href="/technology" className="nav-link">Công nghệ</Link>
            <Link href="/stats" className="nav-link">Số liệu</Link>
            <Link href="/login" className="btn btn-primary btn-sm nav-cta">
              <span className="btn-shine"></span>
              Bắt đầu ngay
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button 
            className={`mobile-menu-btn ${mobileMenuOpen ? 'active' : ''}`} 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <div className={`mobile-nav-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <Link href="/features" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
          ✨ Tính năng
        </Link>
        <Link href="/how-it-works" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
          ⚡ Cách hoạt động
        </Link>
        <Link href="/technology" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
          🤖 Công nghệ AI & Chain
        </Link>
        <Link href="/stats" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
          📊 Số liệu minh bạch
        </Link>
        <Link href="/login" className="btn btn-primary btn-sm mobile-nav-cta" onClick={() => setMobileMenuOpen(false)}>
          Bắt đầu ngay →
        </Link>
      </div>

      {/* Mobile Drawer Backdrop */}
      <div 
        className={`mobile-nav-backdrop ${mobileMenuOpen ? 'open' : ''}`} 
        onClick={() => setMobileMenuOpen(false)} 
      />

      {/* Hero Section */}
      <section className="hero">
        <div className="landing-container">
          <div className="hero-content">
            <div className="hero-badge animate-fade-in-down">
              <span className="badge-dot"></span>
              <span className="badge-text-shimmer">Powered by Google Gemini AI & Blockchain</span>
            </div>
            <h1 className="hero-title animate-fade-in-up">
              <span className="title-line">Tài Chính</span>
              <span className="title-line title-gradient">
                <span className="text-gradient-animated">Minh Bạch</span>
              </span>
              <span className="title-line">& <span className="text-gradient-animated">Thông Minh</span></span>
              <span className="title-line title-sub">Với Trí Tuệ Nhân Tạo</span>
            </h1>
            <p className="hero-description animate-fade-in-up delay-200">
              ChainGuard AI kết hợp sức mạnh của <strong className="highlight-text">AI Gemini</strong> và <strong className="highlight-text">Blockchain Polygon</strong> để giúp bạn quản lý tài chính, chống gian lận và xây dựng điểm tín dụng on-chain minh bạch.
            </p>
            <div className="hero-actions animate-fade-in-up delay-300">
              <Link href="/login" className="btn btn-primary btn-lg btn-glow">
                <span className="btn-shine"></span>
                🚀 Bắt Đầu Miễn Phí
              </Link>
              <Link href="/features" className="btn btn-secondary btn-lg btn-outline-glow">
                Tìm hiểu thêm
                <span className="btn-arrow">→</span>
              </Link>
            </div>
            <div className="hero-stats animate-fade-in-up delay-400">
              <div className="hero-stat">
                <span className="hero-stat-icon">🛡️</span>
                <div>
                  <span className="hero-stat-value">Anti-Fraud</span>
                  <span className="hero-stat-label">AI Detection</span>
                </div>
              </div>
              <div className="hero-stat-divider"></div>
              <div className="hero-stat">
                <span className="hero-stat-icon">🔗</span>
                <div>
                  <span className="hero-stat-value">On-Chain</span>
                  <span className="hero-stat-label">Verified Data</span>
                </div>
              </div>
              <div className="hero-stat-divider"></div>
              <div className="hero-stat">
                <span className="hero-stat-icon">🤖</span>
                <div>
                  <span className="hero-stat-value">Gemini</span>
                  <span className="hero-stat-label">AI Powered</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3D Hero Visual */}
          <div className="hero-visual animate-scale-in delay-200">
            <div className="hero-3d-scene" style={{ transform: `rotateY(${(mousePos.x - 0.5) * 10}deg) rotateX(${(0.5 - mousePos.y) * 5}deg)` }}>
              {/* Main Dashboard Card */}
              <TiltCard className="hero-main-card glass-card-3d">
                <div className="hmc-header">
                  <div className="hmc-dots">
                    <span className="dot red"></span>
                    <span className="dot yellow"></span>
                    <span className="dot green"></span>
                  </div>
                  <span className="hmc-title">ChainGuard Dashboard</span>
                </div>
                <div className="hmc-body">
                  <div className="hmc-balance">
                    <span className="hmc-label">Tổng số dư</span>
                    <span className="hmc-amount text-gradient-animated">15,250,000₫</span>
                  </div>
                  <div className="hmc-chart">
                    <svg viewBox="0 0 300 80" className="mini-chart">
                      <defs>
                        <linearGradient id="chartGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#6C63FF" />
                          <stop offset="100%" stopColor="#00D2FF" />
                        </linearGradient>
                        <linearGradient id="chartFill" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#6C63FF" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#6C63FF" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0,60 Q30,50 60,45 T120,35 T180,25 T240,30 T300,15" fill="none" stroke="url(#chartGrad)" strokeWidth="2.5" className="chart-line" />
                      <path d="M0,60 Q30,50 60,45 T120,35 T180,25 T240,30 T300,15 L300,80 L0,80 Z" fill="url(#chartFill)" className="chart-area" />
                    </svg>
                  </div>
                  <div className="hmc-stats-row">
                    <div className="hmc-stat-item">
                      <span className="hmc-stat-dot income"></span>
                      <span>Thu nhập</span>
                      <span className="text-mono" style={{ color: 'var(--accent-emerald)' }}>+18.5M</span>
                    </div>
                    <div className="hmc-stat-item">
                      <span className="hmc-stat-dot expense"></span>
                      <span>Chi tiêu</span>
                      <span className="text-mono" style={{ color: 'var(--accent-coral)' }}>-7.0M</span>
                    </div>
                  </div>
                </div>
              </TiltCard>

              {/* Floating Cards */}
              <div className="floating-card fc-shield glass-card-3d">
                <div className="fc-icon-pulse">
                  <span>🛡️</span>
                  <div className="pulse-ring"></div>
                </div>
                <div className="fc-content">
                  <span className="fc-title">Fraud Shield</span>
                  <span className="fc-status safe">✅ An toàn</span>
                </div>
              </div>

              <div className="floating-card fc-score glass-card-3d">
                <div className="score-mini-ring">
                  <svg viewBox="0 0 60 60">
                    <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                    <circle cx="30" cy="30" r="24" fill="none" stroke="url(#scoreGrad)" strokeWidth="4"
                      strokeLinecap="round" strokeDasharray="113" strokeDashoffset="28"
                      style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
                    <defs>
                      <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6C63FF" />
                        <stop offset="100%" stopColor="#00D2FF" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="score-mini-val">750</span>
                </div>
                <div className="fc-content">
                  <span className="fc-title">Credit Score</span>
                  <span className="fc-status good">Tốt</span>
                </div>
              </div>

              <div className="floating-card fc-blockchain glass-card-3d">
                <span className="fc-icon">🔗</span>
                <div className="fc-content">
                  <span className="fc-title">Blockchain</span>
                  <span className="fc-hash text-mono">0x1a2b...4d5e</span>
                </div>
                <span className="badge badge-success" style={{ fontSize: '0.6rem' }}>Verified</span>
              </div>

              <div className="floating-card fc-ai glass-card-3d">
                <span className="fc-icon">🤖</span>
                <div className="fc-content">
                  <span className="fc-title">AI Advisor</span>
                  <span className="fc-typing">Đang phân tích<span className="typing-dots"><span>.</span><span>.</span><span>.</span></span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scrolling Logos / Trust Bar */}
      <div className="trust-bar">
        <div className="trust-scroll">
          {['✨ Gemini AI', '🔥 Firebase', '📄 AI Report', '📋 Google Sheets', '📧 Gmail API', '📅 Calendar', '☁️ Cloud Run', '🔗 Polygon', '✨ Gemini AI', '🔥 Firebase', '📄 AI Report', '📋 Google Sheets'].map((item, i) => (
            <span key={i} className="trust-item">{item}</span>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="landing-container">
          <div className="section-header">
            <span className="section-badge">✨ Tính Năng Chính</span>
            <h2 className="section-title">
              Bốn Module <span className="text-gradient-animated">Mạnh Mẽ</span>
            </h2>
            <p className="section-description">
              Kết hợp hoàn hảo giữa AI, Blockchain và hệ sinh thái Google Technologies
            </p>
          </div>
          <div className="features-grid-3d">
            {[
              {
                icon: '🤖', title: 'AI Financial Advisor',
                description: 'Chatbot tư vấn tài chính thông minh bằng Gemini 2.0 Flash. Phân tích chi tiêu, đưa lời khuyên tiết kiệm và đầu tư bằng tiếng Việt.',
                tech: 'Gemini 2.0 Flash', gradient: 'linear-gradient(135deg, #6C63FF, #8B83FF)',
                features: ['Chat AI bằng tiếng Việt', 'Phân tích pattern chi tiêu', 'Cảnh báo gian lận thông minh'],
              },
              {
                icon: '🔗', title: 'Blockchain Ledger',
                description: 'Sổ cái giao dịch minh bạch, bất biến trên blockchain Polygon. Xác minh mọi giao dịch tài chính chỉ với 1 click.',
                tech: 'Polygon Network', gradient: 'linear-gradient(135deg, #00D2FF, #00A8CC)',
                features: ['Hash giao dịch on-chain', 'Smart Contract Savings', 'Xác minh bất kỳ lúc nào'],
              },
              {
                icon: '📈', title: 'On-Chain Credit Score',
                description: 'Điểm tín dụng phi tập trung dựa trên hành vi tài chính thực tế. Lưu trữ minh bạch, không thể giả mạo.',
                tech: 'Smart Contracts', gradient: 'linear-gradient(135deg, #00E676, #69F0AE)',
                features: ['Credit score 300-850', 'Báo cáo Google Sheets', 'Lịch nhắc thanh toán'],
              },
              {
                icon: '🛡️', title: 'Fraud Detection Shield',
                description: 'AI phát hiện giao dịch bất thường real-time. Cảnh báo gian lận qua push notification ngay lập tức.',
                tech: 'Gemini + FCM', gradient: 'linear-gradient(135deg, #FF6B6B, #FF8A80)',
                features: ['Quét real-time 24/7', 'Location fraud detection', 'Push notification alerts'],
              },
            ].map((feature, index) => (
              <TiltCard key={feature.title} className={`feature-card-3d animate-fade-in-up delay-${index}00`}>
                <div className="fc3d-glow" style={{ background: feature.gradient }}></div>
                <div className="fc3d-icon" style={{ background: `${feature.gradient.replace('135deg', '135deg')}` }}>
                  <span>{feature.icon}</span>
                </div>
                <h3 className="fc3d-title">{feature.title}</h3>
                <p className="fc3d-description">{feature.description}</p>
                <ul className="fc3d-features">
                  {feature.features.map((f) => (
                    <li key={f}>
                      <span className="fc3d-check">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="fc3d-footer">
                  <span className="fc3d-tech-badge">{feature.tech}</span>
                </div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - 3D Steps */}
      <section id="how-it-works" className="how-section">
        <div className="landing-container">
          <div className="section-header">
            <span className="section-badge">🔄 Cách Hoạt Động</span>
            <h2 className="section-title">
              Đơn Giản <span className="text-gradient-animated">3 Bước</span>
            </h2>
          </div>
          <div className="steps-3d">
            <div className="steps-line"></div>
            {[
              { step: '01', title: 'Kết Nối', description: 'Đăng nhập bằng Google Account, kết nối ví crypto MetaMask của bạn', icon: '🔐', color: '#6C63FF' },
              { step: '02', title: 'Theo Dõi', description: 'AI tự động phân tích chi tiêu, scan hóa đơn, ghi nhận giao dịch on-chain', icon: '📊', color: '#00D2FF' },
              { step: '03', title: 'Bảo Vệ', description: 'Nhận cảnh báo gian lận real-time, xây dựng credit score, báo cáo tự động', icon: '🛡️', color: '#00E676' },
            ].map((item, index) => (
              <div key={item.step} className="step-3d animate-fade-in-up" style={{ animationDelay: `${index * 0.2}s` }}>
                <div className="step-3d-number" style={{ background: `${item.color}15`, borderColor: `${item.color}30`, color: item.color }}>
                  {item.step}
                </div>
                <TiltCard className="step-3d-card glass-card-3d">
                  <div className="step-3d-icon">{item.icon}</div>
                  <h3 className="step-3d-title">{item.title}</h3>
                  <p className="step-3d-desc">{item.description}</p>
                </TiltCard>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Counter Section */}
      <section id="stats" className="stats-section">
        <div className="landing-container">
          <div className="stats-banner glass-card-3d">
            <div className="stats-banner-glow"></div>
            <div className="stat-counter">
              <span className="stat-counter-value text-gradient-animated">
                <AnimatedCounter target={13000000} />
              </span>
              <span className="stat-counter-label">Người chưa có tài khoản ngân hàng tại VN</span>
            </div>
            <div className="stat-divider-v"></div>
            <div className="stat-counter">
              <span className="stat-counter-value" style={{ color: 'var(--accent-emerald)' }}>
                <AnimatedCounter target={247} suffix="+" />
              </span>
              <span className="stat-counter-label">Giao dịch được bảo vệ</span>
            </div>
            <div className="stat-divider-v"></div>
            <div className="stat-counter">
              <span className="stat-counter-value" style={{ color: 'var(--secondary)' }}>
                <AnimatedCounter target={8} suffix="+" />
              </span>
              <span className="stat-counter-label">Google Technologies tích hợp</span>
            </div>
            <div className="stat-divider-v"></div>
            <div className="stat-counter">
              <span className="stat-counter-value" style={{ color: 'var(--accent-amber)' }}>
                <AnimatedCounter target={99} suffix="%" />
              </span>
              <span className="stat-counter-label">Tỷ lệ phát hiện gian lận</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section id="tech" className="tech-section">
        <div className="landing-container">
          <div className="section-header">
            <span className="section-badge">🔧 Công Nghệ</span>
            <h2 className="section-title">
              Google <span className="text-gradient-animated">Technologies</span>
            </h2>
            <p className="section-description">
              Tích hợp sâu hệ sinh thái Google cho trải nghiệm tốt nhất
            </p>
          </div>
          <div className="tech-grid-3d">
            {[
              { name: 'Gemini AI', desc: 'Chat tư vấn & Vision scan hóa đơn', icon: '✨', color: '#6C63FF' },
              { name: 'Firebase Auth', desc: 'Xác thực Google & Phone OTP', icon: '🔐', color: '#FFCA28' },
              { name: 'Cloud Firestore', desc: 'Database realtime cho transactions', icon: '🔥', color: '#FF6D00' },
              { name: 'Cloud Functions', desc: 'Serverless fraud detection triggers', icon: '⚡', color: '#00BCD4' },
              { name: 'Gemini Reports', desc: 'Báo cáo tài chính AI toàn diện', icon: '📄', color: '#4CAF50' },
              { name: 'Google Sheets', desc: 'Export báo cáo tài chính tự động', icon: '📋', color: '#0F9D58' },
              { name: 'Gmail API', desc: 'Email digest & báo cáo hàng tháng', icon: '📧', color: '#EA4335' },
              { name: 'Cloud Run', desc: 'Deploy containerized & auto-scale', icon: '☁️', color: '#4285F4' },
            ].map((tech, index) => (
              <TiltCard key={tech.name} className={`tech-card-3d animate-fade-in-up`} >
                <div className="tech-card-icon" style={{ background: `${tech.color}15`, borderColor: `${tech.color}30` }}>
                  <span>{tech.icon}</span>
                </div>
                <span className="tech-card-name">{tech.name}</span>
                <span className="tech-card-desc">{tech.desc}</span>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="landing-container">
          <div className="cta-card-3d">
            <div className="cta-particles">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="cta-particle" style={{
                  left: `${(i * 5.26 + 2.63) % 100}%`,
                  animationDelay: `${(i * 0.25) % 5}s`,
                  animationDuration: `${3 + (i * 0.21) % 4}s`,
                }} />
              ))}
            </div>
            <div className="cta-content">
              <h2 className="cta-title">
                Sẵn Sàng <span className="text-gradient-animated">Bảo Vệ Tài Chính</span>?
              </h2>
              <p className="cta-description">
                Tham gia ChainGuard AI ngay hôm nay — hoàn toàn miễn phí.<br />
                Được hỗ trợ bởi Google Technologies & Blockchain.
              </p>
              <Link href="/login" className="btn btn-primary btn-lg btn-glow cta-btn">
                <span className="btn-shine"></span>
                🚀 Bắt Đầu Ngay
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-glow"></div>
        <div className="landing-container">
          {/* Footer Top — Multi Column */}
          <div className="footer-grid">
            {/* Brand Column */}
            <div className="footer-col footer-brand-col">
              <div className="footer-logo-large">
                <Logo3D size="lg" href="/" />
              </div>
              <p className="footer-tagline">
                Nền tảng tài chính thông minh — bảo vệ bằng Blockchain, phân tích bằng AI Gemini. 
                Xây dựng tín dụng on-chain minh bạch cho người Việt.
              </p>
              <div className="footer-socials">
                {[
                  { icon: '🐙', label: 'GitHub', href: '#' },
                  { icon: '📘', label: 'Facebook', href: '#' },
                  { icon: '🐦', label: 'Twitter', href: '#' },
                  { icon: '💼', label: 'LinkedIn', href: '#' },
                ].map((social) => (
                  <a key={social.label} href={social.href} className="footer-social-link" title={social.label}>
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Product Column */}
            <div className="footer-col">
              <h4 className="footer-col-title">Sản phẩm</h4>
              <ul className="footer-nav">
                <li><Link href="/dashboard">📊 Dashboard</Link></li>
                <li><Link href="/chat">🤖 AI Advisor</Link></li>
                <li><Link href="/scanner">📷 Receipt Scanner</Link></li>
                <li><Link href="/credit">📈 Credit Score</Link></li>
                <li><Link href="/fraud">🛡️ Fraud Shield</Link></li>
                <li><Link href="/report">📄 AI Report</Link></li>
                <li><Link href="/blockchain">🔗 Blockchain</Link></li>
              </ul>
            </div>

            {/* Company Column */}
            <div className="footer-col">
              <h4 className="footer-col-title">Khám phá</h4>
              <ul className="footer-nav">
                <li><Link href="/features">✨ Tính năng</Link></li>
                <li><Link href="/how-it-works">📖 Cách hoạt động</Link></li>
                <li><Link href="/technology">🔧 Công nghệ</Link></li>
                <li><Link href="/stats">📊 Thống kê</Link></li>
                <li><Link href="/login">🔐 Đăng nhập</Link></li>
              </ul>
            </div>

            {/* Tech Stack Column */}
            <div className="footer-col">
              <h4 className="footer-col-title">Powered by</h4>
              <div className="footer-tech-badges">
                {[
                  { name: 'Gemini AI', icon: '🤖', color: '#6C63FF' },
                  { name: 'Firebase', icon: '🔥', color: '#FF6D00' },
                  { name: 'Polygon', icon: '🔗', color: '#7B3FE4' },
                  { name: 'Next.js 16', icon: '▲', color: '#ffffff' },
                  { name: 'TypeScript', icon: '💎', color: '#3178C6' },
                ].map((tech) => (
                  <div key={tech.name} className="footer-tech-badge" style={{ borderColor: `${tech.color}30` }}>
                    <span>{tech.icon}</span>
                    <span>{tech.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Divider */}
          <div className="footer-divider">
            <div className="footer-divider-line"></div>
          </div>

          {/* Footer Bottom */}
          <div className="footer-bottom">
            <div className="footer-bottom-left">
              <span className="footer-copyright">
                © 2026 ChainGuard AI — All rights reserved.
              </span>
              <span className="footer-made-with">
                Built with ❤️ for <strong>AIRiserVietnam 2026</strong>
              </span>
            </div>
            <div className="footer-bottom-right">
              <div className="footer-powered-badge">
                <span className="footer-powered-dot"></span>
                <span>Powered by Google Technologies</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
