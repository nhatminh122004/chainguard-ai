'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo3D from '@/components/Logo3D/Logo3D';
import './login.css';

export default function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, signInDemo, error, clearError } = useAuth();
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    };
    window.addEventListener('mousemove', handleMouse, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  const handleDemoSignIn = async () => {
    try {
      setIsSubmitting(true);
      const success = await signInDemo();
      if (success) {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      const success = await signInWithGoogle();
      if (success) {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      let success = false;
      if (isSignUp) {
        success = await signUpWithEmail(email, password, displayName);
      } else {
        success = await signInWithEmail(email, password);
      }
      if (success) {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      {/* 3D Background */}
      <div className="login-bg-3d">
        <div className="login-orb login-orb-1" style={{ transform: `translate(${mousePos.x * 40}px, ${mousePos.y * 40}px)` }}></div>
        <div className="login-orb login-orb-2" style={{ transform: `translate(${-mousePos.x * 30}px, ${-mousePos.y * 30}px)` }}></div>
        <div className="login-orb login-orb-3" style={{ transform: `translate(${mousePos.x * 20}px, ${-mousePos.y * 20}px)` }}></div>
        <div className="login-grid"></div>

        {/* Floating 3D elements */}
        <div className="login-float login-float-1">🛡️</div>
        <div className="login-float login-float-2">🔗</div>
        <div className="login-float login-float-3">🤖</div>
        <div className="login-float login-float-4">📊</div>
        <div className="login-float login-float-5">💰</div>
      </div>

      <div className="login-container-3d">
        {/* Left Panel - 3D Branding */}
        <div className="login-branding-3d">
          <Link href="/" className="login-back">← Trang chủ</Link>
          <div className="branding-content-3d">
            <div className="branding-logo-3d">
              <Logo3D size="xl" showText={false} href="" />
            </div>
            <h1 className="branding-title-3d">
              ChainGuard <span className="text-gradient-animated">AI</span>
            </h1>
            <p className="branding-desc-3d">
              Nền tảng tài chính minh bạch bằng Blockchain & AI
            </p>
            <div className="branding-features-3d">
              {[
                { icon: '🤖', text: 'AI Financial Advisor by Gemini', tag: 'AI' },
                { icon: '🔗', text: 'Blockchain verified transactions', tag: 'Web3' },
                { icon: '🛡️', text: 'Real-time fraud detection', tag: 'Security' },
                { icon: '📊', text: 'On-chain credit scoring', tag: 'DeFi' },
              ].map((f, i) => (
                <div key={i} className="bf-item-3d" style={{ animationDelay: `${i * 0.1}s` }}>
                  <span className="bf-icon-3d">{f.icon}</span>
                  <span className="bf-text">{f.text}</span>
                  <span className="bf-tag">{f.tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="login-form-panel-3d">
          <div className="login-form-wrapper-3d">
            <div className="form-header-3d">
              <h2 className="form-title-3d">
                {isSignUp ? 'Tạo tài khoản' : 'Chào mừng trở lại'}
              </h2>
              <p className="form-subtitle-3d">
                {isSignUp
                  ? 'Bắt đầu bảo vệ tài chính với AI & Blockchain'
                  : 'Đăng nhập để tiếp tục quản lý tài chính'}
              </p>
            </div>

            {/* Google Sign In - Premium */}
            <button
              className="google-btn-3d"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
            >
              <div className="google-btn-bg"></div>
              <svg viewBox="0 0 24 24" width="20" height="20" className="google-icon">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Đăng nhập với Google</span>
            </button>

            {/* Quick Demo Access for Judges & Reviewers */}
            <button
              type="button"
              className="btn btn-secondary w-full"
              style={{
                marginTop: 'var(--space-sm)',
                background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.18), rgba(0, 210, 255, 0.18))',
                borderColor: 'rgba(108, 99, 255, 0.4)',
                padding: '12px 18px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: 'var(--text-primary)',
                boxShadow: '0 4px 15px rgba(108, 99, 255, 0.2)',
              }}
              onClick={handleDemoSignIn}
              disabled={isSubmitting}
            >
              <span style={{ fontSize: '1.2rem' }}>🚀</span>
              <span>Truy cập nhanh Demo (Dành cho Giám khảo & Khách)</span>
            </button>

            <div className="form-divider-3d">
              <span>hoặc đăng nhập bằng email</span>
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailSubmit} className="email-form-3d">
              {isSignUp && (
                <div className="input-group-3d">
                  <label className="input-label-3d" htmlFor="displayName">Tên hiển thị</label>
                  <div className="input-wrapper-3d">
                    <span className="input-icon-3d">👤</span>
                    <input id="displayName" type="text" className="input-3d" placeholder="Nhập tên của bạn"
                      value={displayName} onChange={(e) => setDisplayName(e.target.value)} required={isSignUp} />
                  </div>
                </div>
              )}
              <div className="input-group-3d">
                <label className="input-label-3d" htmlFor="email">Email</label>
                <div className="input-wrapper-3d">
                  <span className="input-icon-3d">📧</span>
                  <input id="email" type="email" className="input-3d" placeholder="name@example.com"
                    value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
              <div className="input-group-3d">
                <label className="input-label-3d" htmlFor="password">Mật khẩu</label>
                <div className="input-wrapper-3d">
                  <span className="input-icon-3d">🔒</span>
                  <input id="password" type="password" className="input-3d" placeholder="Nhập mật khẩu (6+ ký tự)"
                    value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
              </div>

              {error && (
                <div className="form-error-3d">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="btn btn-primary w-full submit-btn-3d" disabled={isSubmitting}>
                <span className="btn-shine"></span>
                {isSubmitting ? (
                  <span className="btn-loading"><span className="spinner"></span>Đang xử lý...</span>
                ) : (
                  isSignUp ? '🚀 Tạo tài khoản' : '🔐 Đăng nhập'
                )}
              </button>
            </form>

            <p className="form-switch-3d">
              {isSignUp ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
              <button className="form-switch-btn-3d" onClick={() => { setIsSignUp(!isSignUp); clearError(); }}>
                {isSignUp ? 'Đăng nhập' : 'Đăng ký miễn phí'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
