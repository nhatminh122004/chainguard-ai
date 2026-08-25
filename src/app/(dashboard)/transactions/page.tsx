'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast/Toast';
import AddTransactionModal from '@/components/AddTransactionModal/AddTransactionModal';
import {
  getTransactions,
  addTransaction,
  deleteTransaction,
  Transaction,
  getCategoryConfig,
  seedDemoTransactions,
} from '@/lib/firestore';

type SortField = 'date' | 'amount';
type SortOrder = 'asc' | 'desc';

export default function TransactionsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    if (!user) return;
    try {
      await seedDemoTransactions(user.uid);
      const data = await getTransactions(user.uid, 100);
      setTransactions(data);
    } catch (err) {
      console.error('Error loading transactions:', err);
      showToast('error', 'Lỗi tải dữ liệu', 'Không thể tải giao dịch');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

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
    await loadTransactions();
  };

  const handleDelete = async (tx: Transaction) => {
    if (!tx.id) return;
    setDeletingId(tx.id);
    try {
      await deleteTransaction(tx.id);
      showToast('success', 'Đã xóa giao dịch', tx.name);
      setTransactions((prev) => prev.filter((t) => t.id !== tx.id));
    } catch (err) {
      showToast('error', 'Lỗi xóa giao dịch');
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  // Export CSV
  const exportCSV = () => {
    if (filteredSorted.length === 0) {
      showToast('warning', 'Không có dữ liệu', 'Không có giao dịch để xuất');
      return;
    }

    const headers = ['Tên giao dịch', 'Số tiền', 'Danh mục', 'Ngày', 'Verified', 'Ghi chú'];
    const rows = filteredSorted.map(tx => {
      const d = tx.date instanceof Date ? tx.date : (tx.date as Timestamp).toDate();
      return [
        `"${tx.name}"`,
        tx.amount.toString(),
        `"${tx.category}"`,
        d.toLocaleDateString('vi-VN'),
        tx.verified ? 'Có' : 'Không',
        `"${tx.note || ''}"`,
      ].join(',');
    });

    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n'); // BOM for Excel UTF-8
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chainguard_transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Đã xuất CSV!', `${filteredSorted.length} giao dịch`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Filter & Sort
  const categories = ['all', ...new Set(transactions.map((t) => t.category))];

  const filteredSorted = transactions
    .filter((t) => filterCategory === 'all' || t.category === filterCategory)
    .sort((a, b) => {
      if (sortField === 'date') {
        const da = a.date instanceof Date ? a.date.getTime() : 0;
        const db = b.date instanceof Date ? b.date.getTime() : 0;
        return sortOrder === 'desc' ? db - da : da - db;
      }
      return sortOrder === 'desc' ? Math.abs(b.amount) - Math.abs(a.amount) : Math.abs(a.amount) - Math.abs(b.amount);
    });

  // Stats
  const monthlyIncome = transactions
    .filter((t) => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);
  const monthlyExpense = transactions
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const verifiedCount = transactions.filter((t) => t.verified).length;

  const formatShort = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
    return n.toString();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-md)' }}>💳</div>
          <p style={{ color: 'var(--text-secondary)' }}>Đang tải giao dịch...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header animate-fade-in-down">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">💳 Giao Dịch <span className="text-gradient">Tài Chính</span></h1>
            <p className="page-subtitle">Quản lý và theo dõi tất cả giao dịch — đồng bộ với Firestore</p>
          </div>
          <div className="flex gap-sm">
            <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
              📥 Xuất CSV
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
              + Thêm giao dịch
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="glass-card stat-card primary animate-fade-in-up">
          <p className="stat-label">Tổng giao dịch</p>
          <p className="stat-value text-gradient">{transactions.length}</p>
          <p className="stat-change positive">Tất cả</p>
        </div>
        <div className="glass-card stat-card success animate-fade-in-up delay-100">
          <p className="stat-label">Tổng thu</p>
          <p className="stat-value" style={{ color: 'var(--accent-emerald)', fontSize: '1.5rem' }}>{formatShort(monthlyIncome)}</p>
          <p className="stat-change positive">Thu nhập</p>
        </div>
        <div className="glass-card stat-card warning animate-fade-in-up delay-200">
          <p className="stat-label">Tổng chi</p>
          <p className="stat-value" style={{ color: 'var(--accent-amber)', fontSize: '1.5rem' }}>{formatShort(monthlyExpense)}</p>
          <p className="stat-change negative">Chi tiêu</p>
        </div>
        <div className="glass-card stat-card danger animate-fade-in-up delay-300">
          <p className="stat-label">Verified On-Chain</p>
          <p className="stat-value" style={{ color: 'var(--primary-light)' }}>
            {transactions.length > 0 ? Math.round((verifiedCount / transactions.length) * 100) : 0}%
          </p>
          <p className="stat-change positive">{verifiedCount}/{transactions.length} giao dịch</p>
        </div>
      </div>

      {/* Transactions List */}
      <div className="glass-card animate-fade-in-up delay-200">
        <div className="card-header">
          <h3 className="card-title">📋 Tất cả giao dịch</h3>
          <div className="flex gap-sm">
            <select
              className="select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ padding: '6px 30px 6px 10px', fontSize: '0.8rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? '📁 Tất cả' : `${getCategoryConfig(c).icon} ${c}`}
                </option>
              ))}
            </select>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                if (sortField === 'date') {
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                } else {
                  setSortField('date');
                  setSortOrder('desc');
                }
              }}
              style={{ fontSize: '0.8rem' }}
            >
              📅 {sortField === 'date' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                if (sortField === 'amount') {
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                } else {
                  setSortField('amount');
                  setSortOrder('desc');
                }
              }}
              style={{ fontSize: '0.8rem' }}
            >
              💰 {sortField === 'amount' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
            </button>
          </div>
        </div>
        <div className="card-body">
          {filteredSorted.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>📭</div>
              <h3 style={{ marginBottom: 'var(--space-sm)' }}>Chưa có giao dịch</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-lg)' }}>
                Thêm giao dịch đầu tiên của bạn!
              </p>
              <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
                + Thêm giao dịch
              </button>
            </div>
          ) : (
            <ul className="transaction-list">
              {filteredSorted.map((tx) => {
                const txDate = tx.date instanceof Date ? tx.date : new Date();
                return (
                  <li key={tx.id} className="transaction-item">
                    <div
                      className="transaction-icon"
                      style={{ background: tx.amount > 0 ? 'rgba(0,230,118,0.1)' : 'rgba(255,107,107,0.1)' }}
                    >
                      {tx.icon || getCategoryConfig(tx.category).icon}
                    </div>
                    <div className="transaction-info">
                      <div className="transaction-name">
                        {tx.name}
                        {tx.verified && (
                          <span className="badge badge-success" style={{ marginLeft: '8px', fontSize: '0.6rem' }}>
                            🔗 Verified
                          </span>
                        )}
                      </div>
                      <span className="transaction-category">{tx.category}</span>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                      <div>
                        <div className={`transaction-amount ${tx.amount > 0 ? 'income' : 'expense'}`}>
                          {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                        </div>
                        <span className="transaction-time">
                          {txDate.toLocaleDateString('vi-VN')} • {txDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDelete(tx)}
                        disabled={deletingId === tx.id}
                        style={{ fontSize: '0.8rem', padding: '4px 8px', opacity: deletingId === tx.id ? 0.5 : 1 }}
                        title="Xóa giao dịch"
                      >
                        🗑️
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
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
