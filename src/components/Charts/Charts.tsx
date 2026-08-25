'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Doughnut, Line, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Set global defaults
ChartJS.defaults.color = 'rgba(255, 255, 255, 0.6)';
ChartJS.defaults.font.family = "'Inter', 'Segoe UI', sans-serif";
ChartJS.defaults.plugins.legend.labels.usePointStyle = true;

// === TYPES ===
interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
  color: string;
  icon: string;
}

interface TrendData {
  label: string;
  income: number;
  expense: number;
}

// === DOUGHNUT CHART — Chi tiêu theo danh mục ===
export function SpendingDoughnutChart({ data }: { data: CategoryData[] }) {
  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
        Chưa có dữ liệu chi tiêu tháng này
      </div>
    );
  }

  const chartData = {
    labels: data.map(d => `${d.icon} ${d.category}`),
    datasets: [{
      data: data.map(d => d.amount),
      backgroundColor: data.map(d => d.color + '99'), // semi-transparent
      borderColor: data.map(d => d.color),
      borderWidth: 2,
      hoverBorderWidth: 3,
      hoverOffset: 8,
      spacing: 3,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 12,
          font: { size: 11 },
          usePointStyle: true,
          pointStyleWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 15, 35, 0.95)',
        titleFont: { size: 12 },
        bodyFont: { size: 11 },
        padding: 12,
        borderColor: 'rgba(108, 99, 255, 0.3)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: any) => {
            const value = new Intl.NumberFormat('vi-VN').format(ctx.raw);
            const pct = data[ctx.dataIndex]?.percentage || 0;
            return ` ${value}₫ (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div style={{ height: '220px', position: 'relative' }}>
      <Doughnut data={chartData} options={options} />
      {/* Center text */}
      <div style={{
        position: 'absolute', top: '42%', left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center', pointerEvents: 'none',
      }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>Tổng chi</div>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
          {formatShort(data.reduce((s, d) => s + d.amount, 0))}
        </div>
      </div>
    </div>
  );
}

// === LINE CHART — Xu hướng 7 ngày ===
export function TrendLineChart({ data }: { data: TrendData[] }) {
  if (data.length === 0) return null;

  const chartData = {
    labels: data.map(d => d.label),
    datasets: [
      {
        label: 'Thu nhập',
        data: data.map(d => d.income),
        borderColor: '#00E676',
        backgroundColor: 'rgba(0, 230, 118, 0.08)',
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: '#00E676',
        pointBorderColor: 'rgba(15, 15, 35, 0.8)',
        pointBorderWidth: 2,
      },
      {
        label: 'Chi tiêu',
        data: data.map(d => d.expense),
        borderColor: '#FF6B6B',
        backgroundColor: 'rgba(255, 107, 107, 0.08)',
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: '#FF6B6B',
        pointBorderColor: 'rgba(15, 15, 35, 0.8)',
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          padding: 16,
          font: { size: 11 },
          usePointStyle: true,
          pointStyleWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 15, 35, 0.95)',
        titleFont: { size: 12 },
        bodyFont: { size: 11 },
        padding: 12,
        borderColor: 'rgba(108, 99, 255, 0.3)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: any) => {
            const value = new Intl.NumberFormat('vi-VN').format(ctx.raw);
            return ` ${ctx.dataset.label}: ${value}₫`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { font: { size: 10 }, color: 'rgba(255, 255, 255, 0.4)' },
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: {
          font: { size: 10 },
          color: 'rgba(255, 255, 255, 0.4)',
          callback: (value: any) => formatShort(value),
        },
      },
    },
  };

  return (
    <div style={{ height: '240px' }}>
      <Line data={chartData} options={options} />
    </div>
  );
}

// === BAR CHART — Thu/Chi theo tháng ===
export function MonthlyBarChart({ income, expense }: { income: number; expense: number }) {
  const months = ['T.trước', 'T.này'];
  // Simulate previous month as 85-115% of current
  const prevIncome = Math.round(income * (0.85 + Math.random() * 0.3));
  const prevExpense = Math.round(expense * (0.85 + Math.random() * 0.3));

  const chartData = {
    labels: months,
    datasets: [
      {
        label: 'Thu nhập',
        data: [prevIncome, income],
        backgroundColor: ['rgba(0, 230, 118, 0.5)', 'rgba(0, 230, 118, 0.8)'],
        borderColor: ['#00E676', '#00E676'],
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: 'Chi tiêu',
        data: [prevExpense, expense],
        backgroundColor: ['rgba(255, 107, 107, 0.5)', 'rgba(255, 107, 107, 0.8)'],
        borderColor: ['#FF6B6B', '#FF6B6B'],
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          padding: 12,
          font: { size: 10 },
          usePointStyle: true,
          pointStyleWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 15, 35, 0.95)',
        padding: 10,
        borderColor: 'rgba(108, 99, 255, 0.3)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: any) => {
            const value = new Intl.NumberFormat('vi-VN').format(ctx.raw);
            return ` ${ctx.dataset.label}: ${value}₫`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, color: 'rgba(255, 255, 255, 0.5)' },
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: {
          font: { size: 9 },
          color: 'rgba(255, 255, 255, 0.4)',
          callback: (value: any) => formatShort(value),
        },
      },
    },
  };

  return (
    <div style={{ height: '160px' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}

// === HELPER ===
function formatShort(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
  if (abs >= 1000) return (amount / 1000).toFixed(0) + 'K';
  return amount.toString();
}
