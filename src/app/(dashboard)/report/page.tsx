'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast/Toast';
import { getGeminiModel } from '@/lib/gemini';
import {
  getTransactions,
  getDashboardStats,
  getSpendingByCategory,
  getScoreLabel,
  calculateCreditScore,
  Transaction,
  DashboardStats,
  seedDemoTransactions,
} from '@/lib/firestore';
import { Timestamp } from 'firebase/firestore';
import {
  exportToGoogleSheets,
  sendGmailReport,
  buildReportEmailHTML,
  isGoogleConnected,
  requestGoogleAccess,
} from '@/lib/google-apis';
import './report.css';

interface ReportSection {
  title: string;
  icon: string;
  content: string;
}

export default function AIReportPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [spending, setSpending] = useState<{ category: string; amount: number; percentage: number; color: string; icon: string }[]>([]);
  const [creditScore, setCreditScore] = useState(0);
  const [loading, setLoading] = useState(true);

  // AI Report state
  const [report, setReport] = useState<string | null>(null);
  const [reportSections, setReportSections] = useState<ReportSection[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'report' | 'nextmonth'>('report');
  // Next month plan
  const [nextMonthPlan, setNextMonthPlan] = useState<string | null>(null);
  const [nextMonthSections, setNextMonthSections] = useState<ReportSection[]>([]);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  // Google APIs state
  const [exportingSheets, setExportingSheets] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const reportRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      await seedDemoTransactions(user.uid);
      const [txData, dashStats, categorySpending, score] = await Promise.all([
        getTransactions(user.uid, 500),
        getDashboardStats(user.uid),
        getSpendingByCategory(user.uid),
        calculateCreditScore(user.uid),
      ]);
      setTransactions(txData);
      setStats(dashStats);
      setSpending(categorySpending);
      setCreditScore(score);
    } catch (err) {
      console.error('Error loading data:', err);
      showToast('error', 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(amount)) + '₫';
  };

  const buildFinancialContext = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyTx = transactions.filter((t) => {
      const d = t.date instanceof Date ? t.date : (t.date as Timestamp).toDate();
      return d >= startOfMonth;
    });

    const incomeList = monthlyTx.filter((t) => t.amount > 0);
    const expenseList = monthlyTx.filter((t) => t.amount < 0);

    const topExpenses = expenseList
      .sort((a, b) => a.amount - b.amount)
      .slice(0, 5)
      .map((t) => `${t.name}: ${formatCurrency(t.amount)} (${t.category})`)
      .join('\n');

    const categoryBreakdown = spending
      .map((s) => `${s.icon} ${s.category}: ${formatCurrency(s.amount)} (${s.percentage}%)`)
      .join('\n');

    const totalIncome = stats?.monthlyIncome || 0;
    const totalExpense = stats?.monthlyExpense || 0;
    const balance = stats?.totalBalance || 0;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : '0';

    return `
DỮ LIỆU TÀI CHÍNH CỦA USER:

=== TỔNG QUAN ===
- Tổng số dư hiện tại: ${formatCurrency(balance)}
- Thu nhập tháng này: ${formatCurrency(totalIncome)}
- Chi tiêu tháng này: ${formatCurrency(totalExpense)}
- Tỷ lệ tiết kiệm: ${savingsRate}%
- Credit Score: ${creditScore}/850 (${getScoreLabel(creditScore).label})
- Tổng giao dịch tháng: ${monthlyTx.length}
- Giao dịch verified (on-chain): ${stats?.verifiedCount || 0}

=== CHI TIÊU THEO DANH MỤC ===
${categoryBreakdown || 'Chưa có dữ liệu'}

=== TOP 5 CHI TIÊU LỚN NHẤT ===
${topExpenses || 'Chưa có dữ liệu'}

=== THU NHẬP ===
${incomeList.map((t) => `${t.name}: ${formatCurrency(t.amount)}`).join('\n') || 'Chưa có dữ liệu'}
    `.trim();
  };

  // Parse sections helper
  const parseSections = (text: string): ReportSection[] => {
    const sections: ReportSection[] = [];
    const parts = text.split(/(?=^## )/gm);
    for (const part of parts) {
      const headerMatch = part.match(/^## (.+)/);
      if (!headerMatch) continue;
      const titleLine = headerMatch[1].trim();
      const content = part.replace(/^## .+\n?/, '').trim();
      const emojiMatch = titleLine.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u);
      const icon = emojiMatch ? emojiMatch[0] : '📄';
      const title = titleLine.replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u, '').trim();
      sections.push({ title, icon, content });
    }
    return sections;
  };

  const generateReport = async () => {
    if (generating) return;
    setGenerating(true);
    setReport(null);
    setReportSections([]);
    setActiveTab('report');

    try {
      const model = getGeminiModel();
      const financialContext = buildFinancialContext();

      const prompt = `Dựa trên dữ liệu tài chính thực tế sau, hãy tạo BÁO CÁO TÀI CHÍNH TOÀN DIỆN bằng tiếng Việt.

${financialContext}

Hãy viết báo cáo chi tiết với format sau (DÙNG ĐÚNG CÁC HEADER NÀY):

## 📊 TỔNG QUAN TÀI CHÍNH
Tóm tắt tình hình tài chính hiện tại, so sánh thu/chi, đánh giá sức khỏe tài chính.

## 📈 PHÂN TÍCH CHI TIÊU
Phân tích chi tiêu theo từng danh mục, đánh giá tỷ lệ phù hợp hay cần điều chỉnh. Nêu cụ thể danh mục nào quá cao.

## ⚠️ CẢNH BÁO & RỦI RO
Phát hiện các vấn đề tiềm ẩn: chi tiêu vượt thu nhập, thiếu quỹ khẩn cấp, danh mục chi tiêu bất thường.

## 💡 KHUYẾN NGHỊ TỐI ƯU
Đưa ra 4-6 lời khuyên cụ thể, thực tế để cải thiện tài chính. Bao gồm con số cụ thể.

## 🏆 ĐIỂM TÍN DỤNG & ĐÁNH GIÁ
Đánh giá credit score hiện tại, giải thích ý nghĩa, và cách cải thiện.

## 📅 KẾ HOẠCH HÀNH ĐỘNG THÁNG NÀY
Đề xuất 3 bước hành động ngay trong tháng này, có timeline cụ thể.

YÊU CẦU:
- Sử dụng emoji cho bullet points
- Đưa ra con số cụ thể dựa trên data thật
- Giọng văn chuyên nghiệp nhưng dễ hiểu
- Mỗi section dài 3-5 câu / 4-6 bullet points`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      setReport(text);
      setGeneratedAt(new Date());
      setReportSections(parseSections(text));
      showToast('success', 'Báo cáo đã tạo thành công!', 'Powered by Gemini AI');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Lỗi khi tạo báo cáo';
      showToast('error', 'Lỗi tạo báo cáo', message);
      console.error('Report generation error:', error);
    } finally {
      setGenerating(false);
    }
  };

  const generateNextMonthPlan = async () => {
    if (generatingPlan) return;
    setGeneratingPlan(true);
    setNextMonthPlan(null);
    setNextMonthSections([]);
    setActiveTab('nextmonth');

    try {
      const model = getGeminiModel();
      const financialContext = buildFinancialContext();
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const nextMonthName = nextMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

      const prompt = `Dựa trên dữ liệu tài chính thực tế sau, hãy tạo KẾ HOẠCH TÀI CHÍNH CHI TIẾT CHO THÁNG TỚI (${nextMonthName}) bằng tiếng Việt.

${financialContext}

Hãy viết kế hoạch chi tiết với format sau (DÙNG ĐÚNG CÁC HEADER NÀY):

## 🎯 MỤC TIÊU TÀI CHÍNH THÁNG ${nextMonthName.toUpperCase()}
Đặt 3-4 mục tiêu cụ thể, đo lường được cho tháng tới. Dựa trên data thật để đề xuất con số hợp lý.

## 💰 NGÂN SÁCH DỰ KIẾN
Lập ngân sách theo từng danh mục chi tiêu. Dựa trên chi tiêu tháng này để đề xuất điều chỉnh hợp lý. Nêu rõ nên tăng/giảm bao nhiêu % so với tháng này.

## 📊 CHIẾN LƯỢC TIẾT KIỆM
Đề xuất chiến lược tiết kiệm cụ thể: mục tiêu bao nhiêu, cách thực hiện, tips tiết kiệm hàng ngày phù hợp với thói quen chi tiêu hiện tại.

## 🛡️ QUẢN LÝ RỦI RO
Đề xuất cách phòng tránh rủi ro tài chính: quỹ khẩn cấp, bảo hiểm, đa dạng hóa thu nhập dựa trên tình hình hiện tại.

## 📅 LỊCH TRÌNH HÀNH ĐỘNG TUẦN
Chia kế hoạch thành 4 tuần cụ thể:
- Tuần 1: Làm gì
- Tuần 2: Làm gì
- Tuần 3: Làm gì
- Tuần 4: Làm gì

## ✅ CHECKLIST HÀNG NGÀY
Tạo checklist 5-7 thói quen tài chính tốt nên duy trì mỗi ngày.

YÊU CẦU:
- Sử dụng emoji cho bullet points
- Đưa ra con số CỤ THỂ dựa trên data thật (ví dụ: "Giảm chi ăn uống từ 2.5M xuống 2M")
- Giọng văn như một chuyên gia tài chính tư vấn 1-1
- Thực tế, không lý thuyết suông
- Mỗi section dài 4-6 bullet points`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      setNextMonthPlan(text);
      setNextMonthSections(parseSections(text));
      showToast('success', 'Kế hoạch tháng tới đã tạo!', `Kế hoạch cho ${nextMonthName}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Lỗi khi tạo kế hoạch';
      showToast('error', 'Lỗi tạo kế hoạch', message);
      console.error('Plan generation error:', error);
    } finally {
      setGeneratingPlan(false);
    }
  };

  const formatReportContent = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  const copyReport = () => {
    const text = activeTab === 'report' ? report : nextMonthPlan;
    if (text) {
      navigator.clipboard.writeText(text);
      showToast('success', 'Đã copy!', 'Nội dung đã được copy vào clipboard');
    }
  };

  // === EXPORT FUNCTIONS ===
  const exportAsTextFile = () => {
    const text = activeTab === 'report' ? report : nextMonthPlan;
    if (!text) return;

    const header = activeTab === 'report'
      ? `BÁO CÁO TÀI CHÍNH — ${user?.displayName || 'User'}\nNgày tạo: ${generatedAt?.toLocaleString('vi-VN') || new Date().toLocaleString('vi-VN')}\nPowered by ChainGuard AI × Gemini\n${'='.repeat(60)}\n\n`
      : `KẾ HOẠCH TÀI CHÍNH THÁNG TỚI — ${user?.displayName || 'User'}\nNgày tạo: ${new Date().toLocaleString('vi-VN')}\nPowered by ChainGuard AI × Gemini\n${'='.repeat(60)}\n\n`;

    const blob = new Blob([header + text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab === 'report'
      ? `ChainGuard_BaoCaoTaiChinh_${new Date().toISOString().slice(0, 10)}.txt`
      : `ChainGuard_KeHoachThangToi_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('success', 'Đã tải file!', 'File TXT đã được lưu');
  };

  // === GOOGLE SHEETS EXPORT ===
  const exportToSheets = async () => {
    if (exportingSheets) return;
    const text = activeTab === 'report' ? report : nextMonthPlan;
    if (!text) return;

    setExportingSheets(true);
    try {
      const date = new Date().toLocaleDateString('vi-VN');
      const sheetTitle = activeTab === 'report'
        ? `ChainGuard Báo Cáo Tài Chính — ${date}`
        : `ChainGuard Kế Hoạch Tháng Tới — ${date}`;

      // Sheet 1: Summary Stats
      const summaryRows: (string | number)[][] = [
        ['Tổng số dư', formatCurrency(stats?.totalBalance || 0)],
        ['Thu nhập tháng', formatCurrency(stats?.monthlyIncome || 0)],
        ['Chi tiêu tháng', formatCurrency(stats?.monthlyExpense || 0)],
        ['Tỷ lệ tiết kiệm', `${((stats?.monthlyIncome || 0) > 0 ? (((stats?.monthlyIncome || 0) - (stats?.monthlyExpense || 0)) / (stats?.monthlyIncome || 1) * 100) : 0).toFixed(1)}%`],
        ['Credit Score', `${creditScore}/850 (${getScoreLabel(creditScore).label})`],
        ['Tổng giao dịch', stats?.transactionCount || 0],
        ['Giao dịch verified', stats?.verifiedCount || 0],
      ];

      // Sheet 2: Spending by Category
      const spendingRows = spending.map(s => [s.icon + ' ' + s.category, s.amount, `${s.percentage}%`]);

      // Sheet 3: Transactions
      const txRows = transactions.slice(0, 100).map(t => {
        const d = t.date instanceof Date ? t.date : (t.date as Timestamp).toDate();
        return [d.toLocaleDateString('vi-VN'), t.name, t.category, t.amount, t.verified ? '✅' : '❌'];
      });

      // Sheet 4: AI Report content
      const reportRows = text.split('\n').map(line => [line]);

      const sheetsUrl = await exportToGoogleSheets(sheetTitle, [
        { title: 'Tổng quan', headers: ['Chỉ số', 'Giá trị'], rows: summaryRows },
        { title: 'Chi tiêu theo danh mục', headers: ['Danh mục', 'Số tiền', 'Tỷ lệ'], rows: spendingRows },
        { title: 'Giao dịch', headers: ['Ngày', 'Tên', 'Danh mục', 'Số tiền', 'Verified'], rows: txRows },
        { title: 'Báo cáo AI', headers: ['Nội dung'], rows: reportRows },
      ]);

      showToast('success', 'Đã xuất Google Sheets!', 'Đang mở spreadsheet...');
      window.open(sheetsUrl, '_blank');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Lỗi xuất Google Sheets';
      if (msg.includes('popup')) {
        showToast('error', 'Popup bị chặn', 'Cho phép popup để đăng nhập Google');
      } else {
        showToast('error', 'Lỗi Google Sheets', msg);
      }
      console.error('Sheets export error:', error);
    } finally {
      setExportingSheets(false);
    }
  };

  // === GMAIL SEND ===
  const sendReportEmail = async () => {
    if (sendingEmail || !user?.email) return;
    const text = activeTab === 'report' ? report : nextMonthPlan;
    if (!text) return;

    setSendingEmail(true);
    try {
      const subject = activeTab === 'report'
        ? `📊 Báo Cáo Tài Chính — ChainGuard AI — ${new Date().toLocaleDateString('vi-VN')}`
        : `📅 Kế Hoạch Tháng Tới — ChainGuard AI — ${new Date().toLocaleDateString('vi-VN')}`;

      const htmlBody = buildReportEmailHTML(
        user.displayName || user.email,
        text,
        {
          balance: formatCurrency(stats?.totalBalance || 0),
          income: formatCurrency(stats?.monthlyIncome || 0),
          expense: formatCurrency(stats?.monthlyExpense || 0),
          creditScore,
        }
      );

      await sendGmailReport(user.email, subject, htmlBody);
      showToast('success', 'Đã gửi email!', `Báo cáo đã gửi đến ${user.email}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Lỗi gửi email';
      showToast('error', 'Lỗi Gmail', msg);
      console.error('Gmail send error:', error);
    } finally {
      setSendingEmail(false);
    }
  };

  const exportAsHTML = () => {
    const sections = activeTab === 'report' ? reportSections : nextMonthSections;
    const rawText = activeTab === 'report' ? report : nextMonthPlan;
    if (!rawText) return;

    const title = activeTab === 'report' ? 'Báo Cáo Tài Chính' : 'Kế Hoạch Tài Chính Tháng Tới';
    const totalIncome = stats?.monthlyIncome || 0;
    const totalExpense = stats?.monthlyExpense || 0;

    const sectionsHTML = sections.length > 0
      ? sections.map(s => `
        <div class="section">
          <h2>${s.icon} ${s.title}</h2>
          <div class="section-body">${formatReportContent(s.content)}</div>
        </div>
      `).join('\n')
      : `<div class="section"><div class="section-body">${formatReportContent(rawText)}</div></div>`;

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — ChainGuard AI</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background: #0a0a1a;
      color: #e0e0f0;
      line-height: 1.7;
      padding: 0;
    }
    .header {
      background: linear-gradient(135deg, #1a1a3e, #0d0d2b);
      padding: 48px 40px;
      border-bottom: 2px solid rgba(108, 99, 255, 0.3);
    }
    .header-badge {
      display: inline-block;
      background: rgba(108, 99, 255, 0.15);
      border: 1px solid rgba(108, 99, 255, 0.3);
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 0.8rem;
      color: #a5a0ff;
      margin-bottom: 16px;
    }
    .header h1 {
      font-size: 2rem;
      font-weight: 800;
      margin-bottom: 8px;
    }
    .header h1 span { color: #6C63FF; }
    .header .subtitle { color: #8888aa; font-size: 0.9rem; }
    .stats-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      padding: 24px 40px;
      background: #0d0d2b;
    }
    .stat-box {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 16px 20px;
      text-align: center;
    }
    .stat-box .label { font-size: 0.75rem; color: #8888aa; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-box .value { font-size: 1.3rem; font-weight: 700; margin-top: 4px; font-family: 'JetBrains Mono', monospace; }
    .stat-box .value.green { color: #00e676; }
    .stat-box .value.red { color: #ff6b6b; }
    .stat-box .value.purple { color: #bb86fc; }
    .stat-box .value.blue { color: #00d2ff; }
    .content { padding: 32px 40px; max-width: 900px; }
    .section {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      margin-bottom: 20px;
      overflow: hidden;
    }
    .section h2 {
      font-size: 1.05rem;
      font-weight: 700;
      padding: 18px 24px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      background: rgba(108, 99, 255, 0.04);
    }
    .section-body {
      padding: 20px 24px;
      font-size: 0.9rem;
      color: #b0b0d0;
    }
    .section-body strong { color: #e0e0f0; }
    .footer {
      padding: 32px 40px;
      border-top: 1px solid rgba(255,255,255,0.06);
      color: #555577;
      font-size: 0.8rem;
      text-align: center;
    }
    @media print {
      body { background: white; color: #1a1a2e; }
      .header { background: #f5f5ff; border-color: #6C63FF; }
      .header h1 span { color: #6C63FF; }
      .header .subtitle { color: #666; }
      .header-badge { background: #ebebff; color: #6C63FF; border-color: #6C63FF; }
      .stats-bar { background: #fafafa; }
      .stat-box { background: #f5f5f5; border-color: #e0e0e0; }
      .stat-box .label { color: #888; }
      .stat-box .value { color: #333; }
      .stat-box .value.green { color: #00a651; }
      .stat-box .value.red { color: #e53935; }
      .stat-box .value.purple { color: #7c4dff; }
      .stat-box .value.blue { color: #0288d1; }
      .section { background: #fafafa; border-color: #e8e8e8; }
      .section h2 { background: #f0f0ff; }
      .section-body { color: #444; }
      .section-body strong { color: #111; }
      .footer { color: #999; }
    }
    @media (max-width: 600px) {
      .stats-bar { grid-template-columns: 1fr 1fr; }
      .header, .content, .footer { padding-left: 20px; padding-right: 20px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-badge">✨ Gemini AI Report — ChainGuard AI</div>
    <h1>${title} — <span>${user?.displayName || 'User'}</span></h1>
    <p class="subtitle">Ngày tạo: ${new Date().toLocaleString('vi-VN')} • ${transactions.length} giao dịch đã phân tích</p>
  </div>

  <div class="stats-bar">
    <div class="stat-box">
      <div class="label">Tổng số dư</div>
      <div class="value blue">${formatCurrency(stats?.totalBalance || 0)}</div>
    </div>
    <div class="stat-box">
      <div class="label">Thu nhập</div>
      <div class="value green">${formatCurrency(totalIncome)}</div>
    </div>
    <div class="stat-box">
      <div class="label">Chi tiêu</div>
      <div class="value red">${formatCurrency(totalExpense)}</div>
    </div>
    <div class="stat-box">
      <div class="label">Credit Score</div>
      <div class="value purple">${creditScore}/850</div>
    </div>
  </div>

  <div class="content">
    ${sectionsHTML}
  </div>

  <div class="footer">
    🛡️ ChainGuard AI — Nền Tảng Tài Chính Minh Bạch Bằng Blockchain & AI<br>
    Báo cáo được tạo bởi Google Gemini 2.0 Flash • ${new Date().toLocaleDateString('vi-VN')}
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab === 'report'
      ? `ChainGuard_BaoCaoTaiChinh_${new Date().toISOString().slice(0, 10)}.html`
      : `ChainGuard_KeHoachThangToi_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('success', 'Đã tải file HTML!', 'Mở file bằng trình duyệt, nhấn Ctrl+P để in PDF');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-md)', animation: 'pulse 2s infinite' }}>📄</div>
          <p style={{ color: 'var(--text-secondary)' }}>Đang tải dữ liệu tài chính...</p>
        </div>
      </div>
    );
  }

  const totalIncome = stats?.monthlyIncome || 0;
  const totalExpense = stats?.monthlyExpense || 0;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100) : 0;
  const hasReport = report !== null;
  const hasPlan = nextMonthPlan !== null;
  const currentSections = activeTab === 'report' ? reportSections : nextMonthSections;
  const currentRaw = activeTab === 'report' ? report : nextMonthPlan;
  const isGenerating = activeTab === 'report' ? generating : generatingPlan;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header animate-fade-in-down">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">📄 AI Financial <span className="text-gradient">Report</span></h1>
            <p className="page-subtitle">Báo cáo tài chính & tư vấn kế hoạch — Powered by Gemini AI</p>
          </div>
          <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
            {(hasReport || hasPlan) && (
              <>
                <button className="btn btn-secondary btn-sm" onClick={copyReport}>
                  📋 Copy
                </button>
                <button className="btn btn-secondary btn-sm" onClick={exportAsTextFile}>
                  📝 TXT
                </button>
                <button className="btn btn-secondary btn-sm" onClick={exportAsHTML}>
                  🌐 HTML
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={exportToSheets}
                  disabled={exportingSheets}
                  style={{ borderColor: 'rgba(15, 157, 88, 0.3)' }}
                >
                  {exportingSheets ? '⏳...' : '📊 Sheets'}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={sendReportEmail}
                  disabled={sendingEmail || !user?.email}
                  style={{ borderColor: 'rgba(234, 67, 53, 0.3)' }}
                >
                  {sendingEmail ? '⏳...' : '📧 Email'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Financial Summary */}
      <div className="stats-grid">
        <div className="glass-card stat-card-3d animate-fade-in-up" style={{ borderTopColor: 'var(--primary)' }}>
          <div className="stat-card-top">
            <div>
              <p className="stat-label">Tổng số dư</p>
              <p className="stat-value-3d text-gradient">{formatCurrency(stats?.totalBalance || 0)}</p>
            </div>
            <div className="stat-icon-3d" style={{ background: 'rgba(108, 99, 255, 0.08)' }}>💰</div>
          </div>
          <div className="stat-card-bottom">
            <span className="stat-change positive">Balance</span>
          </div>
        </div>
        <div className="glass-card stat-card-3d animate-fade-in-up" style={{ borderTopColor: 'var(--accent-emerald)', animationDelay: '0.1s' }}>
          <div className="stat-card-top">
            <div>
              <p className="stat-label">Tỷ lệ tiết kiệm</p>
              <p className="stat-value-3d" style={{ color: savingsRate >= 20 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                {savingsRate.toFixed(1)}%
              </p>
            </div>
            <div className="stat-icon-3d" style={{ background: 'rgba(0, 230, 118, 0.08)' }}>📈</div>
          </div>
          <div className="stat-card-bottom">
            <span className={`stat-change ${savingsRate >= 20 ? 'positive' : 'negative'}`}>
              {savingsRate >= 20 ? '↑ Tốt' : '↓ Cần cải thiện'}
            </span>
          </div>
        </div>
        <div className="glass-card stat-card-3d animate-fade-in-up" style={{ borderTopColor: 'var(--accent-purple)', animationDelay: '0.2s' }}>
          <div className="stat-card-top">
            <div>
              <p className="stat-label">Credit Score</p>
              <p className="stat-value-3d" style={{ color: 'var(--accent-purple)' }}>{creditScore}</p>
            </div>
            <div className="stat-icon-3d" style={{ background: 'rgba(187, 134, 252, 0.08)' }}>🏆</div>
          </div>
          <div className="stat-card-bottom">
            <span className="stat-change positive">{getScoreLabel(creditScore).label}</span>
          </div>
        </div>
        <div className="glass-card stat-card-3d animate-fade-in-up" style={{ borderTopColor: 'var(--secondary)', animationDelay: '0.3s' }}>
          <div className="stat-card-top">
            <div>
              <p className="stat-label">Giao dịch tháng</p>
              <p className="stat-value-3d" style={{ color: 'var(--secondary)' }}>{stats?.transactionCount || 0}</p>
            </div>
            <div className="stat-icon-3d" style={{ background: 'rgba(0, 210, 255, 0.08)' }}>💳</div>
          </div>
          <div className="stat-card-bottom">
            <span className="stat-change positive">{stats?.verifiedCount || 0} verified</span>
          </div>
        </div>
      </div>

      {/* Tab Buttons — always visible */}
      <div className="report-tabs animate-fade-in-up">
        <button
          className={`report-tab ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => setActiveTab('report')}
        >
          <span className="report-tab-icon">📊</span>
          <div className="report-tab-text">
            <span className="report-tab-title">Báo Cáo Tài Chính</span>
            <span className="report-tab-desc">Phân tích chi tiêu & đánh giá</span>
          </div>
          {hasReport && <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>✅</span>}
        </button>
        <button
          className={`report-tab ${activeTab === 'nextmonth' ? 'active' : ''}`}
          onClick={() => setActiveTab('nextmonth')}
        >
          <span className="report-tab-icon">📅</span>
          <div className="report-tab-text">
            <span className="report-tab-title">Kế Hoạch Tháng Tới</span>
            <span className="report-tab-desc">Tư vấn ngân sách & hành động</span>
          </div>
          {hasPlan && <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>✅</span>}
        </button>
      </div>

      {/* Main Content */}
      <div className="report-layout">
        {/* Left: Report Content */}
        <div className="report-main" ref={reportRef}>
          {/* Empty state */}
          {!currentRaw && !isGenerating && (
            <div className="glass-card animate-fade-in-up report-empty-state">
              <div className="report-empty-content">
                <div className="report-empty-icon-wrapper">
                  <div className="report-empty-icon">
                    <span>{activeTab === 'report' ? '📊' : '📅'}</span>
                    <div className="report-empty-pulse"></div>
                  </div>
                </div>
                <h2 className="report-empty-title">
                  {activeTab === 'report'
                    ? <>Tạo Báo Cáo Tài Chính <span className="text-gradient">AI</span></>
                    : <>Lập Kế Hoạch <span className="text-gradient">Tháng Tới</span></>
                  }
                </h2>
                <p className="report-empty-desc">
                  {activeTab === 'report'
                    ? <>Gemini AI sẽ phân tích <strong>{transactions.length} giao dịch</strong> và tạo báo cáo toàn diện bao gồm:</>
                    : <>Gemini AI sẽ tư vấn kế hoạch tài chính chi tiết cho tháng tới dựa trên <strong>{transactions.length} giao dịch</strong>:</>
                  }
                </p>
                <div className="report-features-grid">
                  {(activeTab === 'report' ? [
                    { icon: '📊', title: 'Tổng quan tài chính', desc: 'Đánh giá sức khỏe tài chính tổng thể' },
                    { icon: '📈', title: 'Phân tích chi tiêu', desc: 'Breakdown theo danh mục với insights' },
                    { icon: '⚠️', title: 'Cảnh báo rủi ro', desc: 'Phát hiện vấn đề tiềm ẩn' },
                    { icon: '💡', title: 'Khuyến nghị AI', desc: 'Lời khuyên cá nhân hóa từ Gemini' },
                    { icon: '🏆', title: 'Đánh giá Credit', desc: 'Phân tích và cách cải thiện' },
                    { icon: '📅', title: 'Kế hoạch hành động', desc: 'Các bước cụ thể cho tháng này' },
                  ] : [
                    { icon: '🎯', title: 'Mục tiêu tháng tới', desc: 'Đặt mục tiêu cụ thể, đo lường được' },
                    { icon: '💰', title: 'Ngân sách chi tiết', desc: 'Ngân sách theo từng danh mục' },
                    { icon: '📊', title: 'Chiến lược tiết kiệm', desc: 'Tips tiết kiệm phù hợp với bạn' },
                    { icon: '🛡️', title: 'Quản lý rủi ro', desc: 'Quỹ khẩn cấp & phòng ngừa' },
                    { icon: '📅', title: 'Lịch trình 4 tuần', desc: 'Hành động cụ thể từng tuần' },
                    { icon: '✅', title: 'Checklist hàng ngày', desc: 'Thói quen tài chính tốt' },
                  ]).map((f) => (
                    <div key={f.title} className="report-feature-item glass-card">
                      <span className="report-feature-icon">{f.icon}</span>
                      <h4>{f.title}</h4>
                      <p>{f.desc}</p>
                    </div>
                  ))}
                </div>
                <button
                  className="btn btn-primary btn-lg btn-glow report-generate-btn"
                  onClick={activeTab === 'report' ? generateReport : generateNextMonthPlan}
                >
                  <span className="btn-shine"></span>
                  {activeTab === 'report' ? '✨ Tạo Báo Cáo Ngay' : '📅 Lập Kế Hoạch Tháng Tới'}
                </button>
                <p className="report-empty-note">
                  Phân tích dựa trên dữ liệu thật từ Firestore • Powered by Gemini 2.0 Flash
                </p>
              </div>
            </div>
          )}

          {/* Generating Animation */}
          {isGenerating && (
            <div className="glass-card animate-scale-in report-generating">
              <div className="report-generating-content">
                <div className="report-ai-animation">
                  <div className="ai-brain">
                    <span>🤖</span>
                    <div className="ai-brain-ring ring-1"></div>
                    <div className="ai-brain-ring ring-2"></div>
                    <div className="ai-brain-ring ring-3"></div>
                  </div>
                </div>
                <h3>Gemini AI đang {activeTab === 'report' ? 'phân tích' : 'lập kế hoạch'}...</h3>
                <div className="generating-steps">
                  {(activeTab === 'report' ? [
                    'Đọc dữ liệu giao dịch',
                    'Phân tích xu hướng chi tiêu',
                    'Đánh giá rủi ro tài chính',
                    'Tạo khuyến nghị cá nhân hóa',
                    'Viết báo cáo toàn diện',
                  ] : [
                    'Phân tích thói quen chi tiêu',
                    'Tính toán ngân sách tối ưu',
                    'Xây dựng chiến lược tiết kiệm',
                    'Lập lịch trình hành động',
                    'Tạo checklist hàng ngày',
                  ]).map((step, i) => (
                    <div
                      key={step}
                      className="generating-step"
                      style={{ animationDelay: `${i * 0.6}s` }}
                    >
                      <div className="step-dot"></div>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
                <div className="generating-progress">
                  <div className="generating-progress-bar"></div>
                </div>
              </div>
            </div>
          )}

          {/* Report / Plan Content */}
          {currentRaw && currentSections.length > 0 && !isGenerating && (
            <div className="report-content animate-fade-in-up">
              {/* Report Header */}
              <div className="glass-card report-header-card">
                <div className="report-header-content">
                  <div className="report-header-badge">
                    <span className="badge badge-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                      {activeTab === 'report' ? '✨ Gemini AI Report' : '📅 AI Financial Plan'}
                    </span>
                    {generatedAt && activeTab === 'report' && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        {generatedAt.toLocaleString('vi-VN')}
                      </span>
                    )}
                  </div>
                  <h2 className="report-header-title">
                    {activeTab === 'report'
                      ? <>Báo Cáo Tài Chính — <span className="text-gradient">{user?.displayName || 'User'}</span></>
                      : <>Kế Hoạch Tháng Tới — <span className="text-gradient">{user?.displayName || 'User'}</span></>
                    }
                  </h2>
                  <p className="report-header-subtitle">
                    Phân tích từ {transactions.length} giao dịch • Credit Score: {creditScore}/850
                  </p>
                </div>
              </div>

              {/* Sections */}
              {currentSections.map((section, i) => (
                <div
                  key={i}
                  className="glass-card report-section animate-fade-in-up"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="report-section-header">
                    <div className="report-section-icon">{section.icon}</div>
                    <h3 className="report-section-title">{section.title}</h3>
                  </div>
                  <div
                    className="report-section-body"
                    dangerouslySetInnerHTML={{ __html: formatReportContent(section.content) }}
                  />
                </div>
              ))}

              {/* Actions */}
              <div className="report-actions">
                <button
                  className="btn btn-primary"
                  onClick={activeTab === 'report' ? generateReport : generateNextMonthPlan}
                  disabled={isGenerating}
                >
                  🔄 Tạo lại
                </button>
                <button className="btn btn-secondary" onClick={exportAsHTML}>
                  🌐 HTML
                </button>
                <button className="btn btn-secondary" onClick={exportAsTextFile}>
                  📝 TXT
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={exportToSheets}
                  disabled={exportingSheets}
                >
                  {exportingSheets ? '⏳ Đang xuất...' : '📊 Google Sheets'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={sendReportEmail}
                  disabled={sendingEmail || !user?.email}
                >
                  {sendingEmail ? '⏳ Đang gửi...' : '📧 Gửi Email'}
                </button>
                <button className="btn btn-secondary" onClick={copyReport}>
                  📋 Copy
                </button>
              </div>
            </div>
          )}

          {/* Fallback raw */}
          {currentRaw && currentSections.length === 0 && !isGenerating && (
            <div className="glass-card animate-fade-in-up">
              <div className="card-header">
                <h3 className="card-title">📄 {activeTab === 'report' ? 'Báo Cáo AI' : 'Kế Hoạch AI'}</h3>
                <span className="badge badge-success">✅ Đã tạo</span>
              </div>
              <div
                className="card-body report-raw"
                dangerouslySetInnerHTML={{ __html: formatReportContent(currentRaw) }}
              />
              <div className="report-actions" style={{ padding: 'var(--space-lg)' }}>
                <button className="btn btn-secondary" onClick={exportAsHTML}>🌐 Xuất HTML</button>
                <button className="btn btn-secondary" onClick={exportAsTextFile}>📝 Xuất TXT</button>
                <button className="btn btn-secondary" onClick={copyReport}>📋 Copy</button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Financial Snapshot */}
        <div className="report-sidebar">
          {/* Action Cards */}
          <div className="glass-card animate-fade-in-up report-action-cards" style={{ animationDelay: '0.1s' }}>
            <div className="card-header">
              <h3 className="card-title">⚡ Tạo nhanh</h3>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'flex-start', gap: 'var(--space-sm)' }}
                onClick={generateReport}
                disabled={generating}
              >
                {generating ? '⏳ Đang tạo...' : '📊 Tạo Báo Cáo Tài Chính'}
              </button>
              <button
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'flex-start', gap: 'var(--space-sm)' }}
                onClick={generateNextMonthPlan}
                disabled={generatingPlan}
              >
                {generatingPlan ? '⏳ Đang tạo...' : '📅 Tư Vấn Tháng Tới'}
              </button>
            </div>
          </div>

          {/* Spending Breakdown */}
          <div className="glass-card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="card-header">
              <h3 className="card-title">📊 Chi tiêu tháng</h3>
            </div>
            <div className="card-body">
              {spending.length === 0 ? (
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', textAlign: 'center', padding: 'var(--space-lg)' }}>
                  Chưa có dữ liệu
                </p>
              ) : (
                <>
                  {/* Mini donut chart */}
                  <div className="report-donut-wrapper">
                    <svg viewBox="0 0 120 120" className="report-donut">
                      {spending.map((cat, i) => {
                        const total = spending.reduce((s, c) => s + c.percentage, 0);
                        const offset = spending.slice(0, i).reduce((s, c) => s + (c.percentage / total) * 283, 0);
                        const dash = (cat.percentage / total) * 283;
                        return (
                          <circle
                            key={cat.category}
                            cx="60" cy="60" r="45"
                            fill="none"
                            stroke={cat.color}
                            strokeWidth="16"
                            strokeDasharray={`${dash} ${283 - dash}`}
                            strokeDashoffset={-offset}
                            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                          />
                        );
                      })}
                    </svg>
                    <div className="report-donut-center">
                      <span className="text-mono" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                        {formatCurrency(totalExpense)}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Tổng chi</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="report-legend">
                    {spending.map((cat) => (
                      <div key={cat.category} className="report-legend-item">
                        <div className="report-legend-dot" style={{ background: cat.color }}></div>
                        <span className="report-legend-label">{cat.icon} {cat.category}</span>
                        <span className="report-legend-value text-mono">{cat.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Income vs Expense */}
          <div className="glass-card animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="card-header">
              <h3 className="card-title">💰 Thu vs Chi</h3>
            </div>
            <div className="card-body">
              <div className="report-compare">
                <div className="report-compare-item">
                  <div className="report-compare-bar-wrapper">
                    <div
                      className="report-compare-bar income"
                      style={{ width: `${totalIncome > 0 ? (totalIncome / (totalIncome + totalExpense)) * 100 : 50}%` }}
                    ></div>
                  </div>
                  <div className="report-compare-info">
                    <span style={{ color: 'var(--accent-emerald)' }}>📈 Thu nhập</span>
                    <span className="text-mono" style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>
                      {formatCurrency(totalIncome)}
                    </span>
                  </div>
                </div>
                <div className="report-compare-item">
                  <div className="report-compare-bar-wrapper">
                    <div
                      className="report-compare-bar expense"
                      style={{ width: `${totalExpense > 0 ? (totalExpense / (totalIncome + totalExpense)) * 100 : 50}%` }}
                    ></div>
                  </div>
                  <div className="report-compare-info">
                    <span style={{ color: 'var(--accent-coral)' }}>📉 Chi tiêu</span>
                    <span className="text-mono" style={{ color: 'var(--accent-coral)', fontWeight: 700 }}>
                      {formatCurrency(totalExpense)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="report-net" style={{
                color: totalIncome >= totalExpense ? 'var(--accent-emerald)' : 'var(--accent-coral)',
              }}>
                <span>{totalIncome >= totalExpense ? '✅ Tiết kiệm' : '⚠️ Vượt chi'}</span>
                <span className="text-mono" style={{ fontWeight: 700 }}>
                  {totalIncome >= totalExpense ? '+' : '-'}{formatCurrency(Math.abs(totalIncome - totalExpense))}
                </span>
              </div>
            </div>
          </div>

          {/* Export Info */}
          <div className="glass-card animate-fade-in-up" style={{
            animationDelay: '0.4s',
            background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.08), rgba(0, 210, 255, 0.05))',
            borderColor: 'rgba(108, 99, 255, 0.15)',
          }}>
            <div className="card-body" style={{ padding: 'var(--space-xl)' }}>
              <h4 style={{ marginBottom: 'var(--space-md)', fontSize: '0.9rem' }}>📤 Xuất Báo Cáo</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                  <span>📊</span> <strong style={{ color: '#0F9D58' }}>Google Sheets</strong> — Xuất trực tiếp lên Google Drive
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                  <span>📧</span> <strong style={{ color: '#EA4335' }}>Gmail</strong> — Gửi báo cáo đẹp về email
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                  <span>🌐</span> <strong>HTML</strong> — Nhấn <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>Ctrl+P</kbd> để in PDF
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                  <span>📝</span> <strong>TXT</strong> — File văn bản thuần
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                  <span>📋</span> <strong>Copy</strong> — Dán vào Docs, Word...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
