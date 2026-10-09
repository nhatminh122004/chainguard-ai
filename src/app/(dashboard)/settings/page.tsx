'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast/Toast';
import { getUserSettings, updateUserSettings } from '@/lib/firestore';
import {
  isGoogleConnected,
  requestGoogleAccess,
  clearGoogleToken,
  createCalendarEvent,
} from '@/lib/google-apis';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
  NotificationPermission as NotifPerm,
} from '@/lib/notifications';
import PinnedAccountsCard from '@/components/PinnedAccountsCard/PinnedAccountsCard';

export default function SettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [currency, setCurrency] = useState('VND');
  const [notifications, setNotifications] = useState({
    fraudAlerts: true,
    paymentReminders: true,
    weeklyReport: false,
    creditScoreChange: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Google APIs
  const [googleConnected, setGoogleConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  // Calendar reminder
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [creatingReminder, setCreatingReminder] = useState(false);
  // Push notifications
  const [pushPermission, setPushPermission] = useState<NotifPerm>('default');

  const loadSettings = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getUserSettings(user.uid);
      if (data) {
        setDisplayName(data.displayName);
        setCurrency(data.currency);
        setNotifications(data.notifications);
      } else {
        setDisplayName(user.displayName || 'User');
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateUserSettings(user.uid, {
        displayName,
        currency,
        notifications,
      });
      showToast('success', 'Đã lưu cài đặt', 'Thay đổi đã được áp dụng');
    } catch (err) {
      console.error('Error saving settings:', err);
      showToast('error', 'Lỗi lưu cài đặt', 'Vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Check Google connection on mount
  useEffect(() => {
    setGoogleConnected(isGoogleConnected());
    setPushPermission(getNotificationPermission());
  }, []);

  const connectGoogle = async () => {
    setConnecting(true);
    try {
      await requestGoogleAccess();
      setGoogleConnected(true);
      showToast('success', 'Đã kết nối Google!', 'Sheets, Gmail, Calendar sẵn sàng');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối';
      if (msg !== 'USER_CANCELLED') {
        showToast('error', 'Lỗi kết nối Google', msg);
      }
    } finally {
      setConnecting(false);
    }
  };

  const disconnectGoogle = () => {
    clearGoogleToken();
    setGoogleConnected(false);
    showToast('success', 'Đã ngắt kết nối', 'Google APIs đã ngắt');
  };

  const handleCreateReminder = async () => {
    if (!reminderTitle || !reminderDate) {
      showToast('error', 'Thiếu thông tin', 'Vui lòng nhập tiêu đề và ngày');
      return;
    }
    setCreatingReminder(true);
    try {
      const link = await createCalendarEvent({
        summary: `💰 ${reminderTitle}`,
        description: `Tạo bởi ChainGuard AI\n\nNhắc nhở thanh toán / mục tiêu tài chính`,
        startDate: new Date(reminderDate),
        reminders: [
          { method: 'popup', minutes: 30 },
          { method: 'email', minutes: 1440 },
        ],
      });
      showToast('success', 'Đã tạo nhắc nhở!', 'Đã thêm vào Google Calendar');
      setReminderTitle('');
      setReminderDate('');
      if (link) window.open(link, '_blank');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi tạo event';
      showToast('error', 'Lỗi Calendar', msg);
    } finally {
      setCreatingReminder(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-md)' }}>⚙️</div>
          <p style={{ color: 'var(--text-secondary)' }}>Đang tải cài đặt...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header animate-fade-in-down">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">⚙️ Cài Đặt <span className="text-gradient">Tài Khoản</span></h1>
            <p className="page-subtitle">Quản lý tài khoản, kết nối và tùy chọn</p>
          </div>
        </div>
      </div>

      <div className="content-grid-equal">
        {/* Profile */}
        <div className="glass-card animate-fade-in-up">
          <div className="card-header">
            <h3 className="card-title">👤 Thông tin cá nhân</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
              <div className="avatar" style={{ width: '64px', height: '64px', fontSize: '1.5rem' }}>
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  user?.displayName?.[0] || '?'
                )}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{displayName}</div>
                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>{user?.email}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="input-wrapper">
                <label className="input-label">Tên hiển thị</label>
                <input
                  className="input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="input-wrapper">
                <label className="input-label">Email</label>
                <input className="input" value={user?.email || ''} disabled />
              </div>
              <div className="input-wrapper">
                <label className="input-label">Đơn vị tiền tệ</label>
                <select
                  className="select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    width: '100%',
                  }}
                >
                  <option value="VND">🇻🇳 VND - Việt Nam Đồng</option>
                  <option value="USD">🇺🇸 USD - US Dollar</option>
                  <option value="EUR">🇪🇺 EUR - Euro</option>
                </select>
              </div>
              <button
                className="btn btn-primary"
                style={{ marginTop: 'var(--space-sm)' }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>

        {/* Connections & Notifications */}
        <div className="flex flex-col gap-lg">
          <div className="glass-card animate-fade-in-up delay-200">
            <div className="card-header">
              <h3 className="card-title">🔗 Kết nối</h3>
            </div>
            <div className="card-body">
              {[
                { name: 'Google Account', icon: '🔵', connected: true, desc: user?.email },
                { name: 'Google APIs', icon: '📊', connected: googleConnected, desc: googleConnected ? 'Sheets, Gmail, Calendar' : 'Chưa kết nối', action: true },
                { name: 'MetaMask Wallet', icon: '🦊', connected: false, desc: 'Chưa kết nối' },
                { name: 'Firebase Firestore', icon: '🔥', connected: true, desc: 'Đồng bộ dữ liệu' },
                { name: 'Gemini AI', icon: '🤖', connected: true, desc: 'AI Advisor & Scanner' },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                  padding: 'var(--space-md)',
                  background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--space-sm)'
                }}>
                  <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{item.desc}</div>
                  </div>
                  {('action' in item && item.action) ? (
                    <button
                      className={`btn ${googleConnected ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                      onClick={googleConnected ? disconnectGoogle : connectGoogle}
                      disabled={connecting}
                      style={{ fontSize: '0.75rem' }}
                    >
                      {connecting ? '⏳...' : googleConnected ? 'Ngắt' : 'Kết nối'}
                    </button>
                  ) : (
                    <span className={`badge ${item.connected ? 'badge-success' : 'badge-warning'}`}>
                      {item.connected ? '✅ Connected' : '⚠️ Off'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card animate-fade-in-up delay-300">
            <div className="card-header">
              <h3 className="card-title">🔔 Thông báo</h3>
            </div>
            <div className="card-body">
              {([
                { key: 'fraudAlerts' as const, name: 'Cảnh báo gian lận' },
                { key: 'paymentReminders' as const, name: 'Nhắc thanh toán' },
                { key: 'weeklyReport' as const, name: 'Báo cáo hàng tuần' },
                { key: 'creditScoreChange' as const, name: 'Thay đổi credit score' },
              ]).map((item, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: 'var(--space-sm) 0',
                  borderBottom: i < 3 ? '1px solid var(--border-subtle)' : 'none'
                }}>
                  <span style={{ fontSize: '0.85rem' }}>{item.name}</span>
                  <button
                    className={`badge ${notifications[item.key] ? 'badge-success' : 'badge-warning'}`}
                    onClick={() => toggleNotification(item.key)}
                    style={{ cursor: 'pointer', border: 'none' }}
                  >
                    {notifications[item.key] ? 'ON' : 'OFF'}
                  </button>
                </div>
              ))}
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleSave}
                disabled={saving}
                style={{ marginTop: 'var(--space-md)', width: '100%' }}
              >
                {saving ? '⏳ Đang lưu...' : '💾 Lưu thông báo'}
              </button>
            </div>
          </div>

          {/* Push Notifications */}
          <div className="glass-card animate-fade-in-up delay-350">
            <div className="card-header">
              <h3 className="card-title">📢 Push Notifications</h3>
              <span className={`badge ${pushPermission === 'granted' ? 'badge-success' : pushPermission === 'denied' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                {pushPermission === 'granted' ? '✅ ON' : pushPermission === 'denied' ? '❌ Denied' : '⚠️ Not Asked'}
              </span>
            </div>
            <div className="card-body">
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-md)' }}>
                Nhận thông báo khi có cảnh báo gian lận, giao dịch verified, thay đổi credit score.
              </p>
              {pushPermission === 'granted' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-md)', background: 'rgba(0,166,81,0.05)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                    <span>✅</span> Push notifications đã bật
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      sendTestNotification();
                      showToast('success', 'Đã gửi!', 'Kiểm tra notification của trình duyệt');
                    }}
                    style={{ width: '100%' }}
                  >
                    🔔 Gửi test notification
                  </button>
                </div>
              ) : pushPermission === 'denied' ? (
                <div style={{ padding: 'var(--space-md)', background: 'rgba(229,57,53,0.05)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  ❌ Quyền notification bị từ chối. Vào Settings trình duyệt để bật lại.
                </div>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    const perm = await requestNotificationPermission();
                    setPushPermission(perm);
                    if (perm === 'granted') {
                      showToast('success', 'Đã bật!', 'Bạn sẽ nhận push notifications');
                      sendTestNotification();
                    } else {
                      showToast('warning', 'Bị từ chối', 'Không thể gửi push notifications');
                    }
                  }}
                  style={{ width: '100%' }}
                >
                  🔔 Bật Push Notifications
                </button>
              )}
            </div>
          </div>

          {/* Calendar Reminders */}
          <div className="glass-card animate-fade-in-up delay-400">
            <div className="card-header">
              <h3 className="card-title">📅 Nhắc thanh toán</h3>
              <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>Calendar</span>
            </div>
            <div className="card-body">
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-md)' }}>
                Tạo nhắc nhở thanh toán trên Google Calendar
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div className="input-wrapper">
                  <label className="input-label">Tiêu đề</label>
                  <input
                    className="input"
                    placeholder="VD: Trả tiền điện, Nộp tiền tiết kiệm..."
                    value={reminderTitle}
                    onChange={(e) => setReminderTitle(e.target.value)}
                  />
                </div>
                <div className="input-wrapper">
                  <label className="input-label">Ngày & giờ</label>
                  <input
                    className="input"
                    type="datetime-local"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleCreateReminder}
                  disabled={creatingReminder || !reminderTitle || !reminderDate}
                  style={{ width: '100%' }}
                >
                  {creatingReminder ? '⏳ Đang tạo...' : '📅 Tạo nhắc nhở Google Calendar'}
                </button>
              </div>
              <div style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md)', background: 'rgba(108,99,255,0.05)', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                💡 <strong>Tips:</strong> Tạo nhắc nhở cho hóa đơn định kỳ (tiền điện, internet, thuê nhà) để không quên thanh toán!
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Pinning — merchant's own receiving accounts */}
      <div className="animate-fade-in-up delay-400" style={{ marginTop: 'var(--space-xl)' }}>
        <PinnedAccountsCard />
      </div>
    </div>
  );
}
