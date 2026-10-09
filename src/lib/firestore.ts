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
  blockchain?: {
    dataHash: string;
    txHash: string;
    blockNumber: number;
    walletAddress: string;
    contractAddress: string;
    network: 'sepolia';
    verifiedAt: string;
  };
  createdAt?: Timestamp;
}

export function isTransactionOnChainVerified(transaction: Transaction): boolean {
  return transaction.verified === true
    && typeof transaction.blockchain?.dataHash === 'string'
    && typeof transaction.blockchain?.txHash === 'string'
    && Number.isInteger(transaction.blockchain?.blockNumber);
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
// Local Demo Storage Helper (Zero-error fallback)
// ============================================
const DEMO_TX_KEY = 'chainguard_demo_transactions';
const DEMO_ALERTS_KEY = 'chainguard_demo_alerts';

export function isDemoUser(userId?: string | null): boolean {
  if (!userId) return true;
  if (userId.startsWith('demo-')) return true;
  if (typeof window !== 'undefined' && localStorage.getItem('chainguard_demo_session') === 'true') {
    return true;
  }
  return false;
}

export function getLocalDemoTransactions(): Transaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DEMO_TX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((t: any) => ({
      ...t,
      date: new Date(t.date),
      // Migrate legacy demo rows which claimed verification without evidence.
      verified: t.verified === true && typeof t.blockchain?.dataHash === 'string' && typeof t.blockchain?.txHash === 'string',
    }));
  } catch {
    return [];
  }
}

export function saveLocalDemoTransactions(txs: Transaction[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DEMO_TX_KEY, JSON.stringify(txs));
  } catch (e) {
    console.warn('Failed to save local demo transactions:', e);
  }
}

export function getLocalDemoAlerts(): FraudAlert[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DEMO_ALERTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalDemoAlerts(alerts: FraudAlert[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DEMO_ALERTS_KEY, JSON.stringify(alerts));
  } catch (e) {
    console.warn('Failed to save local demo alerts:', e);
  }
}

// ============================================
// Transactions
// ============================================

export async function addTransaction(userId: string, data: Omit<Transaction, 'id' | 'userId' | 'createdAt'>): Promise<string> {
  if (isDemoUser(userId)) {
    const id = 'demo-tx-' + Date.now();
    const newTx: Transaction = {
      id,
      userId,
      ...data,
      date: data.date instanceof Date ? data.date : new Date(),
    };
    const local = getLocalDemoTransactions();
    saveLocalDemoTransactions([newTx, ...local]);
    return id;
  }

  try {
    const docRef = await addDoc(collection(db, 'transactions'), {
      ...data,
      userId,
      date: data.date instanceof Date ? Timestamp.fromDate(data.date) : data.date,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err: any) {
    console.warn('Firestore addTransaction fallback to local storage:', err?.message);
    const id = 'local-tx-' + Date.now();
    const newTx: Transaction = {
      id,
      userId,
      ...data,
      date: data.date instanceof Date ? data.date : new Date(),
    };
    const local = getLocalDemoTransactions();
    saveLocalDemoTransactions([newTx, ...local]);
    return id;
  }
}

export async function getTransactions(userId: string, limitCount: number = 50): Promise<Transaction[]> {
  if (isDemoUser(userId)) {
    let local = getLocalDemoTransactions();
    if (local.length === 0) {
      await seedDemoTransactions(userId);
      local = getLocalDemoTransactions();
    }
    return local.slice(0, limitCount);
  }

  try {
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
    return txs.sort((a, b) => {
      const da = a.date instanceof Date ? a.date.getTime() : 0;
      const db2 = b.date instanceof Date ? b.date.getTime() : 0;
      return db2 - da;
    }).slice(0, limitCount);
  } catch (err: any) {
    console.warn('Firestore getTransactions fallback to local data:', err?.message);
    let local = getLocalDemoTransactions();
    if (local.length === 0) {
      await seedDemoTransactions(userId);
      local = getLocalDemoTransactions();
    }
    return local.slice(0, limitCount);
  }
}

export async function getRecentTransactions(userId: string, count: number = 7): Promise<Transaction[]> {
  return getTransactions(userId, count);
}

function isLocalTransactionId(id: string): boolean {
  return id.startsWith('demo-') || id.startsWith('local-');
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  if (isLocalTransactionId(transactionId)) {
    saveLocalDemoTransactions(getLocalDemoTransactions().filter((t) => t.id !== transactionId));
    return;
  }
  await deleteDoc(doc(db, 'transactions', transactionId));
}

export async function updateTransaction(transactionId: string, data: Partial<Transaction>): Promise<void> {
  if (isLocalTransactionId(transactionId)) {
    saveLocalDemoTransactions(
      getLocalDemoTransactions().map((t) => {
        if (t.id !== transactionId) return t;
        const date = data.date instanceof Timestamp ? data.date.toDate() : data.date ?? t.date;
        return { ...t, ...data, date };
      })
    );
    return;
  }
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
  const verifiedCount = transactions.filter(isTransactionOnChainVerified).length;

  // Get credit score from user doc (demo users have no Firebase auth → skip Firestore)
  let creditScore = 500;
  if (isDemoUser(userId)) {
    creditScore = getLocalDemoUserDoc().creditScore ?? 500;
  } else {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      creditScore = userDoc.data()?.creditScore || 500;
    } catch (err: any) {
      console.warn('Firestore getDashboardStats (users doc) fallback to default score:', err?.message);
    }
  }

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
    ? transactions.filter(isTransactionOnChainVerified).length / transactions.length
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
  if (isDemoUser(userId)) {
    saveLocalDemoUserDoc({ ...getLocalDemoUserDoc(), creditScore });
  } else {
    try {
      await updateDoc(doc(db, 'users', userId), {
        creditScore,
        lastCreditUpdate: serverTimestamp(),
      });
    } catch (err: any) {
      console.warn('Firestore calculateCreditScore update skipped:', err?.message);
    }
  }

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
    ? transactions.filter(isTransactionOnChainVerified).length / transactions.length
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
  if (isDemoUser(userId)) {
    const local = getLocalDemoAlerts();
    if (local.length === 0) {
      const initAlert: FraudAlert = {
        id: 'alert-init-1',
        userId,
        type: 'warning',
        title: 'Bảo vệ tài khoản kích hoạt',
        description: 'Hệ thống AI Forensics & Shield đang giám sát giao dịch và biên lai chuyển khoản.',
        resolved: false,
        createdAt: new Date() as any,
      };
      saveLocalDemoAlerts([initAlert]);
      return [initAlert];
    }
    return local;
  }

  try {
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
  } catch (err: any) {
    console.warn('Firestore getFraudAlerts fallback to local alerts:', err?.message);
    return getLocalDemoAlerts();
  }
}

export async function resolveAlert(alertId: string): Promise<void> {
  const local = getLocalDemoAlerts();
  const index = local.findIndex((a) => a.id === alertId);
  if (index !== -1) {
    local[index].resolved = true;
    saveLocalDemoAlerts(local);
  }

  try {
    await updateDoc(doc(db, 'fraudAlerts', alertId), { resolved: true });
  } catch (err: any) {
    console.warn('Firestore resolveAlert warning (handled locally):', err?.message);
  }
}

export async function createFraudAlert(userId: string, alert: Omit<FraudAlert, 'id' | 'userId' | 'createdAt'>): Promise<string> {
  if (isDemoUser(userId)) {
    const id = 'alert-' + Date.now();
    const newAlert: FraudAlert = {
      id,
      userId,
      ...alert,
      createdAt: new Date() as any,
    };
    const local = getLocalDemoAlerts();
    saveLocalDemoAlerts([newAlert, ...local]);
    return id;
  }

  try {
    const docRef = await addDoc(collection(db, 'fraudAlerts'), {
      ...alert,
      userId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err: any) {
    console.warn('Firestore createFraudAlert fallback to local alerts:', err?.message);
    const id = 'local-alert-' + Date.now();
    const newAlert: FraudAlert = {
      id,
      userId,
      ...alert,
      createdAt: new Date() as any,
    };
    const local = getLocalDemoAlerts();
    saveLocalDemoAlerts([newAlert, ...local]);
    return id;
  }
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

// Demo users have no Firebase Auth session, so their "users" doc lives in localStorage.
const DEMO_USER_DOC_KEY = 'chainguard_demo_user_doc';

interface LocalDemoUserDoc {
  displayName?: string;
  creditScore?: number;
  settings?: { currency?: string; language?: string; notifications?: Partial<UserSettings['notifications']> };
}

function getLocalDemoUserDoc(): LocalDemoUserDoc {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(DEMO_USER_DOC_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveLocalDemoUserDoc(data: LocalDemoUserDoc) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_USER_DOC_KEY, JSON.stringify(data));
}

function toUserSettings(data: LocalDemoUserDoc | Record<string, any>): UserSettings {
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

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  if (isDemoUser(userId)) {
    const local = getLocalDemoUserDoc();
    return local.displayName || local.settings ? toUserSettings(local) : null;
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return null;
    return toUserSettings(userDoc.data());
  } catch (err: any) {
    console.warn('Firestore getUserSettings fallback to defaults:', err?.message);
    return null;
  }
}

export async function updateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<void> {
  if (isDemoUser(userId)) {
    const local = getLocalDemoUserDoc();
    saveLocalDemoUserDoc({
      ...local,
      ...(settings.displayName !== undefined && { displayName: settings.displayName }),
      settings: {
        ...local.settings,
        ...(settings.currency !== undefined && { currency: settings.currency }),
        ...(settings.language !== undefined && { language: settings.language }),
        ...(settings.notifications !== undefined && {
          notifications: { ...local.settings?.notifications, ...settings.notifications },
        }),
      },
    });
    return;
  }

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

  // Real users: let permission errors propagate so the UI reports a failed save honestly.
  await updateDoc(doc(db, 'users', userId), updateData);
}

// ============================================
// Seed demo data (for first-time users)
// ============================================

export async function seedDemoTransactions(userId: string): Promise<void> {
  const isDemo = isDemoUser(userId);
  const now = new Date();
  const demoData: Transaction[] = [
    { id: 'demo-tx-1', userId, name: 'Lương tháng ' + (now.getMonth() + 1), amount: 15000000, category: 'Thu nhập', icon: '💰', date: new Date(now.getFullYear(), now.getMonth(), 5), verified: false, note: 'Lương công ty' },
    { id: 'demo-tx-2', userId, name: 'Grab Food - Phở Hà Nội', amount: -125000, category: 'Ăn uống', icon: '🍔', date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), verified: false },
    { id: 'demo-tx-3', userId, name: 'Shopee - Tai nghe Bluetooth', amount: -450000, category: 'Mua sắm', icon: '🛍️', date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), verified: false },
    { id: 'demo-tx-4', userId, name: 'EVN - Tiền điện', amount: -320000, category: 'Hóa đơn', icon: '⚡', date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), verified: false },
    { id: 'demo-tx-5', userId, name: 'Freelance - UI/UX Design', amount: 3500000, category: 'Thu nhập', icon: '💻', date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), verified: false },
    { id: 'demo-tx-6', userId, name: 'Highlands Coffee', amount: -55000, category: 'Ăn uống', icon: '☕', date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), verified: false },
    { id: 'demo-tx-7', userId, name: 'Grab Bike - Q1 → Q7', amount: -45000, category: 'Di chuyển', icon: '🏍️', date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000), verified: false },
    { id: 'demo-tx-8', userId, name: 'Netflix', amount: -99000, category: 'Giải trí', icon: '🎬', date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), verified: false },
    { id: 'demo-tx-9', userId, name: 'Internet VNPT', amount: -250000, category: 'Hóa đơn', icon: '🌐', date: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000), verified: false },
    { id: 'demo-tx-10', userId, name: 'Tiền thuê nhà T' + (now.getMonth() + 1), amount: -4500000, category: 'Hóa đơn', icon: '🏠', date: new Date(now.getFullYear(), now.getMonth(), 1), verified: false },
  ];

  if (isDemo) {
    const local = getLocalDemoTransactions();
    if (local.length === 0) {
      saveLocalDemoTransactions(demoData);
    }
    return;
  }

  try {
    const existingTx = await getTransactions(userId, 1);
    if (existingTx.length > 0) return; // Already has data

    const batch = writeBatch(db);
    demoData.forEach((tx) => {
      const ref = doc(collection(db, 'transactions'));
      batch.set(ref, {
        name: tx.name,
        amount: tx.amount,
        category: tx.category,
        icon: tx.icon,
        note: tx.note || '',
        verified: tx.verified,
        userId,
        date: Timestamp.fromDate(tx.date as Date),
        createdAt: serverTimestamp(),
      });
    });
    await batch.commit();
  } catch (err: any) {
    console.warn('Firestore seedDemoTransactions fallback to local storage:', err?.message);
    const local = getLocalDemoTransactions();
    if (local.length === 0) {
      saveLocalDemoTransactions(demoData);
    }
  }
}
