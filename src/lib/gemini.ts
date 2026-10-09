'use client';

import { apiFetch } from '@/lib/api-client';

export interface ReceiptData {
  merchant: string;
  date: string;
  total: string;
  category: string;
  items: { name: string; price: string }[];
  currency: string;
}

type AuditStatus = 'passed' | 'warning' | 'failed';
export interface FakeBillAnalysisResult {
  isFinancialReceiptOrQR: boolean;
  bankOrApp: string;
  senderName?: string;
  receiverName?: string;
  receiverAccount?: string;
  amount: string;
  amountInWords?: string;
  transactionTime?: string;
  transactionCode?: string;
  transactionStatus: 'SUCCESS' | 'PENDING' | 'SCHEDULED' | 'FAILED' | 'UNKNOWN';
  riskScore: number;
  verdict: 'SAFE' | 'SUSPICIOUS' | 'HIGH_RISK_FAKE';
  forensicAudit: {
    fontCheck: { status: AuditStatus; detail: string };
    alignmentCheck: { status: AuditStatus; detail: string };
    tamperingArtifacts: { status: AuditStatus; detail: string };
    transactionCodeLogic: { status: AuditStatus; detail: string };
    statusIntegrity: { status: AuditStatus; detail: string };
    qrCodeSecurity: { status: AuditStatus | 'not_applicable'; detail: string };
  };
  detectedAnomalies: string[];
  actionAdvice: string;
  summary: string;
}

export async function generateChatResponse(message: string, history: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<string> {
  const result = await apiFetch<{ text: string }>('/api/ai/chat', { method: 'POST', body: JSON.stringify({ message, history }) });
  return result.text;
}

export async function generateFinancialText(prompt: string, task: 'financial-report' | 'financial-plan'): Promise<string> {
  const result = await apiFetch<{ text: string }>('/api/ai/generate', { method: 'POST', body: JSON.stringify({ prompt, task }) });
  return result.text;
}

export async function scanReceipt(imageBase64: string, mimeType: string): Promise<ReceiptData> {
  return apiFetch<ReceiptData>('/api/ai/receipt', { method: 'POST', body: JSON.stringify({ imageBase64, mimeType }) });
}

export async function analyzeFakeBillAndQR(imageBase64: string, mimeType: string): Promise<FakeBillAnalysisResult> {
  return apiFetch<FakeBillAnalysisResult>('/api/ai/fake-bill', { method: 'POST', body: JSON.stringify({ imageBase64, mimeType }) });
}
