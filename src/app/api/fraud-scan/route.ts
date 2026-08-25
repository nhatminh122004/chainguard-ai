/**
 * Server-side Fraud Scan API Route
 * POST /api/fraud-scan
 * 
 * Replaces Firebase Cloud Functions (which require Blaze plan + credit card).
 * Runs fraud detection algorithm server-side in Next.js API route.
 */

import { NextRequest, NextResponse } from 'next/server';

// Note: For a full production setup, you'd use Firebase Admin SDK with service account.
// For this demo, we run the fraud detection logic server-side and return results.

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

// === FRAUD DETECTION RULES (server-side) ===

function detectFraud(transactions: ScanTransaction[]): FraudResult[] {
  const results: FraudResult[] = [];

  for (const tx of transactions) {
    const txDate = new Date(tx.date);
    const hour = txDate.getHours();
    const absAmount = Math.abs(tx.amount);

    // Rule 1: Large transactions (> 5,000,000₫)
    if (absAmount > 5000000) {
      results.push({
        transactionId: tx.id,
        transactionName: tx.name,
        amount: tx.amount,
        reason: `Giao dịch lớn bất thường: ${new Intl.NumberFormat('vi-VN').format(absAmount)}₫ (> 5,000,000₫)`,
        severity: absAmount > 20000000 ? 'high' : 'medium',
        ruleId: 'LARGE_AMOUNT',
      });
    }

    // Rule 2: Late night transactions (12AM - 5AM)
    if (hour >= 0 && hour < 5) {
      results.push({
        transactionId: tx.id,
        transactionName: tx.name,
        amount: tx.amount,
        reason: `Giao dịch vào ${hour}:${String(txDate.getMinutes()).padStart(2, '0')} (giờ bất thường: 12AM-5AM)`,
        severity: 'medium',
        ruleId: 'LATE_NIGHT',
      });
    }

    // Rule 3: Rapid successive transactions (same category, same day, > 3 times)
    const sameDaySameCategory = transactions.filter(t => {
      const d = new Date(t.date);
      return t.category === tx.category 
        && d.toDateString() === txDate.toDateString() 
        && t.id !== tx.id;
    });

    if (sameDaySameCategory.length >= 3) {
      // Only flag once per category per day
      const alreadyFlagged = results.some(
        r => r.ruleId === 'RAPID_SAME_CAT' 
          && r.transactionName === tx.name
      );
      if (!alreadyFlagged) {
        results.push({
          transactionId: tx.id,
          transactionName: tx.name,
          amount: tx.amount,
          reason: `${sameDaySameCategory.length + 1} giao dịch "${tx.category}" trong cùng ngày`,
          severity: 'low',
          ruleId: 'RAPID_SAME_CAT',
        });
      }
    }

    // Rule 4: Unverified high-value transactions
    if (!tx.verified && absAmount > 2000000) {
      results.push({
        transactionId: tx.id,
        transactionName: tx.name,
        amount: tx.amount,
        reason: `Giao dịch giá trị cao chưa verified on-chain: ${new Intl.NumberFormat('vi-VN').format(absAmount)}₫`,
        severity: 'medium',
        ruleId: 'UNVERIFIED_HIGH_VALUE',
      });
    }

    // Rule 5: Unusual category spending (> 50% of total in one category)
    const totalSpending = transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    if (totalSpending > 0 && tx.amount < 0) {
      const categorySpending = transactions
        .filter(t => t.category === tx.category && t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      if (categorySpending / totalSpending > 0.5 && categorySpending > 3000000) {
        const alreadyFlagged = results.some(
          r => r.ruleId === 'CATEGORY_DOMINANCE' && r.transactionId === tx.id
        );
        if (!alreadyFlagged) {
          results.push({
            transactionId: tx.id,
            transactionName: tx.name,
            amount: tx.amount,
            reason: `Danh mục "${tx.category}" chiếm > 50% tổng chi tiêu (${Math.round(categorySpending / totalSpending * 100)}%)`,
            severity: 'low',
            ruleId: 'CATEGORY_DOMINANCE',
          });
        }
      }
    }
  }

  // Deduplicate by transactionId + ruleId
  const seen = new Set<string>();
  return results.filter(r => {
    const key = `${r.transactionId}-${r.ruleId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// === API HANDLER ===

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactions } = body;

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json(
        { error: 'Missing or invalid transactions array' },
        { status: 400 }
      );
    }

    // Run server-side fraud detection
    const results = detectFraud(transactions);

    // Sort by severity
    const severityOrder = { high: 0, medium: 1, low: 2 };
    results.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return NextResponse.json({
      success: true,
      scanType: 'server',
      timestamp: new Date().toISOString(),
      totalScanned: transactions.length,
      alertsFound: results.length,
      alerts: results,
      rules: [
        { id: 'LARGE_AMOUNT', name: 'Giao dịch lớn > 5M₫', type: 'amount' },
        { id: 'LATE_NIGHT', name: 'Giao dịch 12AM-5AM', type: 'time' },
        { id: 'RAPID_SAME_CAT', name: 'Giao dịch lặp cùng ngày', type: 'pattern' },
        { id: 'UNVERIFIED_HIGH_VALUE', name: 'Chưa verified > 2M₫', type: 'blockchain' },
        { id: 'CATEGORY_DOMINANCE', name: 'Chi tiêu lệch danh mục', type: 'pattern' },
      ],
    });
  } catch (error) {
    console.error('Fraud scan API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
