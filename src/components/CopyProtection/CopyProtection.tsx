'use client';

import React, { useEffect, useState } from 'react';
import './CopyProtection.css';

export default function CopyProtection() {
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const showWarning = (msg: string) => {
    setWarningMessage(msg);
    setTimeout(() => {
      setWarningMessage(null);
    }, 2800);
  };

  useEffect(() => {
    // 1. Prevent Copy & Cut
    const handleCopy = (e: ClipboardEvent) => {
      // Allow copy inside input or textarea
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      e.preventDefault();
      showWarning('🔒 Nội dung được bảo vệ bởi ChainGuard AI — Vui lòng không sao chép!');
    };

    const handleCut = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      e.preventDefault();
      showWarning('🔒 Thao tác cắt nội dung đã bị khóa!');
    };

    // 2. Prevent Right Click (Context Menu)
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      e.preventDefault();
      showWarning('🛡️ Menu chuột phải đã bị khóa để bảo vệ bản quyền giao diện!');
    };

    // 3. Prevent Copy Shortcuts (Ctrl+C, Ctrl+X, Ctrl+U, F12, Ctrl+Shift+I, etc.)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e || typeof e.key !== 'string') return;
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      // Block Ctrl+C / Cmd+C outside inputs
      if (isCtrlOrCmd && key === 'c' && !isInput) {
        e.preventDefault();
        showWarning('🔒 Phím tắt Ctrl + C đã bị khóa!');
        return;
      }

      // Block Ctrl+X / Cmd+X outside inputs
      if (isCtrlOrCmd && key === 'x' && !isInput) {
        e.preventDefault();
        showWarning('🔒 Phím tắt Ctrl + X đã bị khóa!');
        return;
      }

      // Block Ctrl+U / Cmd+U (View Source)
      if (isCtrlOrCmd && key === 'u') {
        e.preventDefault();
        showWarning('🛡️ Thao tác xem nguồn trang bị từ chối!');
        return;
      }

      // Block Ctrl+S / Cmd+S (Save Page)
      if (isCtrlOrCmd && key === 's') {
        e.preventDefault();
        showWarning('🛡️ Không thể lưu trang web này!');
        return;
      }

      // Block F12 & DevTools Shortcuts
      if (e.key === 'F12' || (isCtrlOrCmd && e.shiftKey && (key === 'i' || key === 'j' || key === 'c'))) {
        // e.preventDefault();
        showWarning('⚠️ Chế độ kiểm tra mã nguồn được bảo vệ!');
      }
    };

    // 4. Prevent Dragging content
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      e.preventDefault();
    };

    window.addEventListener('copy', handleCopy);
    window.addEventListener('cut', handleCut);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('dragstart', handleDragStart);

    return () => {
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('cut', handleCut);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  if (!warningMessage) return null;

  return (
    <div className="copy-protection-toast">
      <div className="copy-toast-content">
        <span className="copy-toast-icon">🛡️</span>
        <span className="copy-toast-text">{warningMessage}</span>
      </div>
      <div className="copy-toast-bar" />
    </div>
  );
}
