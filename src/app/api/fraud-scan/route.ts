import { ApiRequestError, errorResponse, readJsonWithLimit } from '@/lib/api-validation';
import { authenticateRequest } from '@/lib/server-auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

interface ScanTransaction {
  id: string;
  name: string;
  amount: number;
  category: string;
  date: string;
  verified: boolean;
}

interface FraudResult {
  transactionId: string;
  transactionName: string;
  amount: number;
  reason: string;
  severity: 'high' | 'medium' | 'low';
  ruleId: string;
}

function parseTransactions(value: unknown): ScanTransaction[] {
  if (!Array.isArray(value)) throw new ApiRequestError('transactions must be an array');
  if (value.length > 500) throw new ApiRequestError('A maximum of 500 transactions can be scanned');

  return value.map((item, index) => {
    if (!item || typeof item !== 'object') throw new ApiRequestError(`transactions[${index}] must be an object`);
    const tx = item as Record<string, unknown>;
    if (typeof tx.id !== 'string' || !tx.id.trim() || tx.id.length > 128) throw new ApiRequestError(`transactions[${index}].id is invalid`);
    if (typeof tx.name !== 'string' || !tx.name.trim() || tx.name.length > 200) throw new ApiRequestError(`transactions[${index}].name is invalid`);
    if (typeof tx.category !== 'string' || !tx.category.trim() || tx.category.length > 100) throw new ApiRequestError(`transactions[${index}].category is invalid`);
    if (typeof tx.amount !== 'number' || !Number.isFinite(tx.amount) || Math.abs(tx.amount) > Number.MAX_SAFE_INTEGER) throw new ApiRequestError(`transactions[${index}].amount is invalid`);
    if (typeof tx.verified !== 'boolean') throw new ApiRequestError(`transactions[${index}].verified must be boolean`);
    if (typeof tx.date !== 'string') throw new ApiRequestError(`transactions[${index}].date is invalid`);
    const timestamp = Date.parse(tx.date);
    const year = new Date(timestamp).getUTCFullYear();
    if (!Number.isFinite(timestamp) || year < 2000 || year > 2100) throw new ApiRequestError(`transactions[${index}].date is invalid`);
    return { id: tx.id, name: tx.name.trim(), amount: tx.amount, category: tx.category.trim(), date: new Date(timestamp).toISOString(), verified: tx.verified };
  });
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function detectFraud(transactions: ScanTransaction[]): FraudResult[] {
  const results: FraudResult[] = [];
  const dailyCategory = new Map<string, { count: number; first: ScanTransaction }>();
  const categoryExpenses = new Map<string, { amount: number; first: ScanTransaction }>();
  let totalSpending = 0;

  for (const tx of transactions) {
    const date = new Date(tx.date);
    const key = `${dayKey(date)}\u0000${tx.category}`;
    const daily = dailyCategory.get(key);
    dailyCategory.set(key, { count: (daily?.count || 0) + 1, first: daily?.first || tx });
    if (tx.amount < 0) {
      const amount = Math.abs(tx.amount);
      totalSpending += amount;
      const category = categoryExpenses.get(tx.category);
      categoryExpenses.set(tx.category, { amount: (category?.amount || 0) + amount, first: category?.first || tx });
    }
  }

  for (const tx of transactions) {
    const txDate = new Date(tx.date);
    const absAmount = Math.abs(tx.amount);
    if (absAmount > 5_000_000) results.push({ transactionId: tx.id, transactionName: tx.name, amount: tx.amount, reason: `Giao dịch lớn bất thường: ${new Intl.NumberFormat('vi-VN').format(absAmount)}₫ (> 5.000.000₫)`, severity: absAmount > 20_000_000 ? 'high' : 'medium', ruleId: 'LARGE_AMOUNT' });
    if (txDate.getHours() < 5) results.push({ transactionId: tx.id, transactionName: tx.name, amount: tx.amount, reason: `Giao dịch vào ${txDate.getHours()}:${String(txDate.getMinutes()).padStart(2, '0')} (giờ bất thường: 0h-5h)`, severity: 'medium', ruleId: 'LATE_NIGHT' });
    if (!tx.verified && absAmount > 2_000_000) results.push({ transactionId: tx.id, transactionName: tx.name, amount: tx.amount, reason: `Giao dịch giá trị cao chưa có chứng cứ on-chain: ${new Intl.NumberFormat('vi-VN').format(absAmount)}₫`, severity: 'medium', ruleId: 'UNVERIFIED_HIGH_VALUE' });
  }

  for (const entry of dailyCategory.values()) {
    if (entry.count >= 4) results.push({ transactionId: entry.first.id, transactionName: entry.first.name, amount: entry.first.amount, reason: `${entry.count} giao dịch "${entry.first.category}" trong cùng ngày`, severity: 'low', ruleId: 'RAPID_SAME_CAT' });
  }
  for (const [category, entry] of categoryExpenses) {
    const ratio = totalSpending > 0 ? entry.amount / totalSpending : 0;
    if (entry.amount > 3_000_000 && ratio > 0.5) results.push({ transactionId: entry.first.id, transactionName: entry.first.name, amount: entry.first.amount, reason: `Danh mục "${category}" chiếm ${Math.round(ratio * 100)}% tổng chi tiêu`, severity: 'low', ruleId: 'CATEGORY_DOMINANCE' });
  }
  return results;
}

export async function POST(request: Request) {
  try {
    const user = await authenticateRequest(request);
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const rate = checkRateLimit(`fraud-scan:${user.uid}`, { perMinute: 10, perDay: 100 });
    if (!rate.allowed) return Response.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } });
    const body = await readJsonWithLimit<{ transactions?: unknown }>(request, 512 * 1024);
    const transactions = parseTransactions(body.transactions);
    const alerts = detectFraud(transactions);
    const severityOrder = { high: 0, medium: 1, low: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    return Response.json({
      success: true, scanType: 'server', timestamp: new Date().toISOString(), totalScanned: transactions.length,
      alertsFound: alerts.length, alerts,
      rules: [
        { id: 'LARGE_AMOUNT', name: 'Giao dịch lớn > 5M₫', type: 'amount' },
        { id: 'LATE_NIGHT', name: 'Giao dịch 0h-5h', type: 'time' },
        { id: 'RAPID_SAME_CAT', name: 'Giao dịch lặp cùng ngày', type: 'pattern' },
        { id: 'UNVERIFIED_HIGH_VALUE', name: 'Chưa có chứng cứ on-chain > 2M₫', type: 'blockchain' },
        { id: 'CATEGORY_DOMINANCE', name: 'Chi tiêu lệch danh mục', type: 'pattern' },
      ],
    });
  } catch (error) { return errorResponse(error); }
}
