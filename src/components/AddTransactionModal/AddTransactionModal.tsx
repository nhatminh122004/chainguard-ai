'use client';

import React, { useState } from 'react';
import { CATEGORIES } from '@/lib/firestore';
import './AddTransactionModal.css';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    amount: number;
    category: string;
    icon: string;
    date: Date;
    note: string;
    verified: boolean;
  }) => Promise<void>;
}

export default function AddTransactionModal({ isOpen, onClose, onSubmit }: AddTransactionModalProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState('Ăn uống');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set date on client to avoid hydration mismatch
  React.useEffect(() => {
    if (!date) setDate(new Date().toISOString().split('T')[0]);
  }, [date]);

  if (!isOpen) return null;

  const selectedCategory = CATEGORIES.find((c) => c.value === category);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) return;

    setIsSubmitting(true);
    try {
      const numAmount = parseFloat(amount);
      const finalAmount = type === 'expense' ? -Math.abs(numAmount) : Math.abs(numAmount);

      await onSubmit({
        name: name.trim(),
        amount: finalAmount,
        category,
        icon: selectedCategory?.icon || '📦',
        date: new Date(date),
        note: note.trim(),
        verified: false,
      });

      // Reset form
      setName('');
      setAmount('');
      setType('expense');
      setCategory('Ăn uống');
      setDate(new Date().toISOString().split('T')[0]);
      setNote('');
      onClose();
    } catch (err) {
      console.error('Error adding transaction:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const incomeCategories = ['Thu nhập', 'Freelance', 'Lương'];
  const expenseCategories = CATEGORIES.filter((c) => !incomeCategories.includes(c.value));
  const filteredCategories = type === 'income'
    ? CATEGORIES.filter((c) => incomeCategories.includes(c.value))
    : expenseCategories;

  // Auto-switch category when type changes
  const handleTypeChange = (newType: 'expense' | 'income') => {
    setType(newType);
    if (newType === 'income' && !incomeCategories.includes(category)) {
      setCategory('Thu nhập');
    } else if (newType === 'expense' && incomeCategories.includes(category)) {
      setCategory('Ăn uống');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">➕ Thêm giao dịch mới</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Type Toggle */}
            <div className="input-wrapper">
              <label className="input-label">Loại giao dịch</label>
              <div className="type-toggle">
                <button
                  type="button"
                  className={`type-btn ${type === 'expense' ? 'active-expense' : ''}`}
                  onClick={() => handleTypeChange('expense')}
                >
                  📉 Chi tiêu
                </button>
                <button
                  type="button"
                  className={`type-btn ${type === 'income' ? 'active-income' : ''}`}
                  onClick={() => handleTypeChange('income')}
                >
                  📈 Thu nhập
                </button>
              </div>
            </div>

            {/* Name */}
            <div className="input-wrapper">
              <label className="input-label">Tên giao dịch</label>
              <input
                className="input"
                placeholder="VD: Grab Food, Lương tháng 8..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Amount & Category */}
            <div className="form-row">
              <div className="input-wrapper">
                <label className="input-label">Số tiền (₫)</label>
                <input
                  className="input"
                  type="number"
                  placeholder="VD: 150000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  required
                />
              </div>
              <div className="input-wrapper">
                <label className="input-label">Danh mục</label>
                <select
                  className="select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {filteredCategories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.icon} {c.value}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date */}
            <div className="input-wrapper">
              <label className="input-label">Ngày</label>
              <input
                className="input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Note */}
            <div className="input-wrapper">
              <label className="input-label">Ghi chú (tùy chọn)</label>
              <input
                className="input"
                placeholder="Ghi chú thêm..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || !name.trim() || !amount}>
              {isSubmitting ? '⏳ Đang lưu...' : '💾 Lưu giao dịch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
