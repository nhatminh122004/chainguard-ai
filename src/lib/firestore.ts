// Firestore Service Layer — ChainGuard AI
// Centralized data access for all dashboard pages

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

// ============================================
// Types
// ============================================

export interface Transaction {
  id?: string;
  userId: string;
  name: string;
  amount: number; // positive = income, negative = expense
  category: string;
  icon: string;
  date: Date | Timestamp;
  note?: string;
  verified: boolean; // on-chain verified
  createdAt?: Timestamp;
}

export interface UserSettings {
  displayName: string;
  currency: string;
  language: string;
  notifications: {
    fraudAlerts: boolean;
    paymentReminders: boolean;
    weeklyReport: boolean;
    creditScoreChange: boolean;
  };
}

export interface FraudAlert {
  id?: string;
  userId: string;
  type: 'warning' | 'info' | 'danger';
  title: string;
  description: string;
  resolved: boolean;
  createdAt?: Timestamp;
}

export interface CreditHistoryEntry {
  month: string;
  score: number;
  change: string;
  date: Date | Timestamp;
}

export interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  creditScore: number;
  transactionCount: number;
  verifiedCount: number;
}

// ============================================
// Category Config
// ============================================

export const CATEGORIES = [
  { value: 'Ăn uống', icon: '🍔', color: '#FF6B6B' },
  { value: 'Mua sắm', icon: '🛍️', color: '#6C63FF' },
  { value: 'Di chuyển', icon: '🚗', color: '#00D2FF' },
  { value: 'Hóa đơn', icon: '📄', color: '#FFB347' },
  { value: 'Giải trí', icon: '🎮', color: '#BB86FC' },
  { value: 'Thu nhập', icon: '💰', color: '#00E676' },
  { value: 'Freelance', icon: '💻', color: '#00E676' },
  { value: 'Lương', icon: '💰', color: '#00E676' },
  { value: 'Sức khỏe', icon: '🏥', color: '#FF6B6B' },
  { value: 'Giáo dục', icon: '📚', color: '#6C63FF' },
  { value: 'Khác', icon: '📦', color: '#9E9E9E' },
];

export function getCategoryConfig(category: string) {
  return CATEGORIES.find((c) => c.value === category) || { value: category, icon: '📦', color: '#9E9E9E' };
}

// ============================================
// Transactions
// ============================================

export async function addTransaction(userId: string, data: Omit<Transaction, 'id' | 'userId' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'transactions'), {
    ...data,
    userId,
    date: data.date instanceof Date ? Timestamp.fromDate(data.date) : data.date,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getTransactions(userId: string, limitCount: number = 50): Promise<Transaction[]> {
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', userId),
    limit(Math.min(limitCount * 2, 200))
  );
  const snapshot = await getDocs(q);
  const txs = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date?.toDate?.() || new Date(),
  })) as Transaction[];
  // Sort client-side to avoid composite index requirement
  return txs.sort((a, b) => {
    const da = a.date instanceof Date ? a.date.getTime() : 0;
    const db2 = b.date instanceof Date ? b.date.getTime() : 0;
    return db2 - da;
  }).slice(0, limitCount);
}

export async function getRecentTransactions(userId: string, count: number = 7): Promise<Transaction[]> {
  return getTransactions(userId, count);
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  await deleteDoc(doc(db, 'transactions', transactionId));
}

export async function updateTransaction(transactionId: string, data: Partial<Transaction>): Promise<void> {
  const updateData: Record<string, unknown> = { ...data };
  if (data.date instanceof Date) {
    updateData.date = Timestamp.fromDate(data.date);
  }
  await updateDoc(doc(db, 'transactions', transactionId), updateData);
}

// ============================================
// Dashboard Stats (aggregated from transactions)
// ============================================

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const transactions = await getTransactions(userId, 500);

  const monthlyTransactions = transactions.filter((t) => {
    const txDate = t.date instanceof Date ? t.date : (t.date as Timestamp).toDate();
    return txDate >= startOfMonth;
  });

  const monthlyIncome = monthlyTransactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpense = monthlyTransactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalBalance = transactions.reduce((sum, t) => sum + t.amount, 0);
  const verifiedCount = transactions.filter((t) => t.verified).length;

  // Get credit score from user doc
  const userDoc = await getDoc(doc(db, 'users', userId));
  const creditScore = userDoc.data()?.creditScore || 500;

  return {
    totalBalance,
    monthlyIncome,
    monthlyExpense,
    creditScore,
    transactionCount: monthlyTransactions.length,
    verifiedCount,
  };
}

// ============================================
// Spending by Category
// ============================================

export async function getSpendingByCategory(userId: string): Promise<{ category: string; amount: number; percentage: number; color: string; icon: string }[]> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const transactions = await getTransactions(userId, 500);

  const expenses = transactions.filter((t) => {
    const txDate = t.date instanceof Date ? t.date : (t.date as Timestamp).toDate();
    return txDate >= startOfMonth && t.amount < 0;
  });

  const categoryMap = new Map<string, number>();
  expenses.forEach((t) => {
    const current = categoryMap.get(t.category) || 0;
    categoryMap.set(t.category, current + Math.abs(t.amount));
  });

  const totalExpense = Array.from(categoryMap.values()).reduce((sum, v) => sum + v, 0) || 1;

  const result = Array.from(categoryMap.entries())
    .map(([category, amount]) => {
      const config = getCategoryConfig(category);
      return {
        category,
        amount,
        percentage: Math.round((amount / totalExpense) * 100),
        color: config.color,
        icon: config.icon,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return result;
}

// ============================================
// Credit Score
// ============================================

export async function calculateCreditScore(userId: string): Promise<number> {
  const transactions = await getTransactions(userId, 500);

  if (transactions.length === 0) return 500; // Default score

  // Factor 1: Payment consistency (35%) — how regularly transactions are made
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentTxCount = transactions.filter((t) => {
    const d = t.date instanceof Date ? t.date : (t.date as Timestamp).toDate();
    return d >= thirtyDaysAgo;
  }).length;
  const consistencyScore = Math.min(recentTxCount / 20, 1) * 100; // 20+ tx/month = 100

  // Factor 2: Income/Expense ratio (30%)
  const totalIncome = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const ratio = totalExpense > 0 ? totalIncome / totalExpense : 2;
  const ratioScore = Math.min(ratio / 2, 1) * 100; // Income >= 2x expense = 100

  // Factor 3: Diversity of categories (15%)
  const categories = new Set(transactions.map((t) => t.category));
  const diversityScore = Math.min(categories.size / 5, 1) * 100; // 5+ categories = 100

  // Factor 4: History length (10%)
  const oldestDate = transactions.reduce((min, t) => {
    const d = t.date instanceof Date ? t.date : (t.date as Timestamp).toDate();
    return d < min ? d : min;
  }, new Date());
  const historyDays = Math.floor((now.getTime() - oldestDate.getTime()) / (24 * 60 * 60 * 1000));
  const historyScore = Math.min(historyDays / 180, 1) * 100; // 6+ months = 100

  // Factor 5: Verified transactions (10%)
  const verifiedRatio = transactions.length > 0
    ? transactions.filter((t) => t.verified).length / transactions.length
    : 0;
  const verifiedScore = verifiedRatio * 100;

  // Weighted score (300-850 range)
  const rawScore =
    consistencyScore * 0.35 +
    ratioScore * 0.30 +
    diversityScore * 0.15 +
    historyScore * 0.10 +
    verifiedScore * 0.10;

  const creditScore = Math.round(300 + (rawScore / 100) * 550);

  // Update user document
  await updateDoc(doc(db, 'users', userId), {
    creditScore,
    lastCreditUpdate: serverTimestamp(),
  });

  return creditScore;
}

export function getScoreFactors(transactions: Transaction[]): { name: string; score: number; weight: string; icon: string; color: string }[] {
  if (transactions.length === 0) {
    return [
      { name: 'Lịch sử thanh toán', score: 0, weight: '35%', icon: '📅', color: 'var(--accent-emerald)' },
      { name: 'Tỷ lệ thu/chi', score: 0, weight: '30%', icon: '💳', color: 'var(--primary)' },
      { name: 'Đa dạng danh mục', score: 0, weight: '15%', icon: '📊', color: 'var(--accent-amber)' },
      { name: 'Thời gian hoạt động', score: 0, weight: '10%', icon: '⏰', color: 'var(--secondary)' },
      { name: 'Giao dịch verified', score: 0, weight: '10%', icon: '🔍', color: 'var(--accent-purple)' },
    ];
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentTxCount = transactions.filter((t) => {
    const d = t.date instanceof Date ? t.date : (t.date as Timestamp).toDate();
    return d >= thirtyDaysAgo;
  }).length;
  const consistencyScore = Math.round(Math.min(recentTxCount / 20, 1) * 100);

  const totalIncome = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const ratio = totalExpense > 0 ? totalIncome / totalExpense : 2;
  const ratioScore = Math.round(Math.min(ratio / 2, 1) * 100);

  const categories = new Set(transactions.map((t) => t.category));
  const diversityScore = Math.round(Math.min(categories.size / 5, 1) * 100);

  const oldestDate = transactions.reduce((min, t) => {
    const d = t.date instanceof Date ? t.date : (t.date as Timestamp).toDate();
    return d < min ? d : min;
  }, new Date());
  const historyDays = Math.floor((now.getTime() - oldestDate.getTime()) / (24 * 60 * 60 * 1000));
  const historyScore = Math.round(Math.min(historyDays / 180, 1) * 100);

  const verifiedRatio = transactions.length > 0
    ? transactions.filter((t) => t.verified).length / transactions.length
    : 0;
  const verifiedScore = Math.round(verifiedRatio * 100);

  return [
    { name: 'Lịch sử thanh toán', score: consistencyScore, weight: '35%', icon: '📅', color: 'var(--accent-emerald)' },
    { name: 'Tỷ lệ thu/chi', score: ratioScore, weight: '30%', icon: '💳', color: 'var(--primary)' },
    { name: 'Đa dạng danh mục', score: diversityScore, weight: '15%', icon: '📊', color: 'var(--accent-amber)' },
    { name: 'Thời gian hoạt động', score: historyScore, weight: '10%', icon: '⏰', color: 'var(--secondary)' },
    { name: 'Giao dịch verified', score: verifiedScore, weight: '10%', icon: '🔍', color: 'var(--accent-purple)' },
  ];
}

export function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 750) return { label: 'Xuất sắc', color: 'var(--accent-emerald)' };
  if (score >= 650) return { label: 'Tốt', color: 'var(--primary-light)' };
  if (score >= 550) return { label: 'Trung bình', color: 'var(--accent-amber)' };
  if (score >= 400) return { label: 'Cần cải thiện', color: 'var(--accent-coral)' };
  return { label: 'Thấp', color: 'var(--accent-coral)' };
}

// ============================================
// Fraud Alerts
// ============================================

export async function getFraudAlerts(userId: string): Promise<FraudAlert[]> {
  const q = query(
    collection(db, 'fraudAlerts'),
    where('userId', '==', userId),
    limit(50)
  );
  const snapshot = await getDocs(q);
  const alerts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FraudAlert[];
  // Sort client-side to avoid composite index requirement
  return alerts.sort((a, b) => {
    const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as any)?.toDate?.()?.getTime?.() || 0;
    const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as any)?.toDate?.()?.getTime?.() || 0;
    return dateB - dateA;
  }).slice(0, 20);
}

export async function resolveAlert(alertId: string): Promise<void> {
  await updateDoc(doc(db, 'fraudAlerts', alertId), { resolved: true });
}

export async function createFraudAlert(userId: string, alert: Omit<FraudAlert, 'id' | 'userId' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'fraudAlerts'), {
    ...alert,
    userId,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// Analyze transactions for suspicious patterns
export function detectSuspiciousTransactions(transactions: Transaction[]): { transaction: Transaction; reason: string }[] {
  const suspicious: { transaction: Transaction; reason: string }[] = [];

  transactions.forEach((tx) => {
    const txDate = tx.date instanceof Date ? tx.date : (tx.date as Timestamp).toDate();

    // Large unusual expenses (> 5,000,000₫)
    if (tx.amount < -5000000) {
      suspicious.push({ transaction: tx, reason: 'Giao dịch chi tiêu lớn bất thường' });
    }

    // Late night transactions (12AM - 5AM)
    const hour = txDate.getHours();
    if (hour >= 0 && hour < 5 && tx.amount < 0) {
      suspicious.push({ transaction: tx, reason: `Giao dịch vào lúc ${hour}:${txDate.getMinutes().toString().padStart(2, '0')} AM` });
    }

    // Very high frequency — duplicate amounts within same day
    const sameDayTx = transactions.filter((t) => {
      const d = t.date instanceof Date ? t.date : (t.date as Timestamp).toDate();
      return d.toDateString() === txDate.toDateString() && t.id !== tx.id && t.amount === tx.amount && t.amount < 0;
    });
    if (sameDayTx.length > 0) {
      suspicious.push({ transaction: tx, reason: 'Phát hiện giao dịch trùng lặp cùng ngày' });
    }
  });

  // Deduplicate by transaction ID
  const seen = new Set<string>();
  return suspicious.filter((s) => {
    if (seen.has(s.transaction.id || '')) return false;
    seen.add(s.transaction.id || '');
    return true;
  });
}

// ============================================
// User Settings
// ============================================

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) return null;

  const data = userDoc.data();
  return {
    displayName: data.displayName || 'User',
    currency: data.settings?.currency || 'VND',
    language: data.settings?.language || 'vi',
    notifications: {
      fraudAlerts: data.settings?.notifications?.fraudAlerts ?? true,
      paymentReminders: data.settings?.notifications?.paymentReminders ?? true,
      weeklyReport: data.settings?.notifications?.weeklyReport ?? false,
      creditScoreChange: data.settings?.notifications?.creditScoreChange ?? true,
    },
  };
}

export async function updateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<void> {
  const updateData: Record<string, unknown> = {};

  if (settings.displayName !== undefined) {
    updateData.displayName = settings.displayName;
  }
  if (settings.currency !== undefined) {
    updateData['settings.currency'] = settings.currency;
  }
  if (settings.language !== undefined) {
    updateData['settings.language'] = settings.language;
  }
  if (settings.notifications !== undefined) {
    Object.entries(settings.notifications).forEach(([key, value]) => {
      updateData[`settings.notifications.${key}`] = value;
    });
  }

  await updateDoc(doc(db, 'users', userId), updateData);
}

// ============================================
// Seed demo data (for first-time users)
// ============================================

export async function seedDemoTransactions(userId: string): Promise<void> {
  const existingTx = await getTransactions(userId, 1);
  if (existingTx.length > 0) return; // Already has data

  const now = new Date();
  const demoData: Omit<Transaction, 'id' | 'userId' | 'createdAt'>[] = [
    { name: 'Lương tháng ' + (now.getMonth() + 1), amount: 15000000, category: 'Thu nhập', icon: '💰', date: new Date(now.getFullYear(), now.getMonth(), 5), verified: true, note: 'Lương công ty' },
    { name: 'Grab Food - Phở Hà Nội', amount: -125000, category: 'Ăn uống', icon: '🍔', date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), verified: true },
    { name: 'Shopee - Tai nghe Bluetooth', amount: -450000, category: 'Mua sắm', icon: '🛍️', date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), verified: false },
    { name: 'EVN - Tiền điện', amount: -320000, category: 'Hóa đơn', icon: '⚡', date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), verified: true },
    { name: 'Freelance - UI/UX Design', amount: 3500000, category: 'Thu nhập', icon: '💻', date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), verified: true },
    { name: 'Highlands Coffee', amount: -55000, category: 'Ăn uống', icon: '☕', date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), verified: false },
    { name: 'Grab Bike - Q1 → Q7', amount: -45000, category: 'Di chuyển', icon: '🏍️', date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000), verified: true },
    { name: 'Netflix', amount: -99000, category: 'Giải trí', icon: '🎬', date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), verified: false },
    { name: 'Internet VNPT', amount: -250000, category: 'Hóa đơn', icon: '🌐', date: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000), verified: true },
    { name: 'Tiền thuê nhà T' + (now.getMonth() + 1), amount: -4500000, category: 'Hóa đơn', icon: '🏠', date: new Date(now.getFullYear(), now.getMonth(), 1), verified: true },
  ];

  const batch = writeBatch(db);
  demoData.forEach((tx) => {
    const ref = doc(collection(db, 'transactions'));
    batch.set(ref, {
      ...tx,
      userId,
      date: Timestamp.fromDate(tx.date as Date),
      createdAt: serverTimestamp(),
    });
  });
  await batch.commit();
}
