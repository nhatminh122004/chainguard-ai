/**
 * Google APIs Integration Service
 * Provides OAuth2 authentication and API calls for:
 * - Google Sheets (export financial reports)
 * - Gmail (send email reports)
 * - Google Calendar (payment reminders)
 *
 * Uses Google Identity Services (GIS) for OAuth2 token flow.
 * Access tokens are stored in sessionStorage for the current session.
 */

// === CONFIGURATION ===
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

const SCOPES = {
  sheets: 'https://www.googleapis.com/auth/spreadsheets',
  gmail: 'https://www.googleapis.com/auth/gmail.send',
  calendar: 'https://www.googleapis.com/auth/calendar.events',
};

const ALL_SCOPES = Object.values(SCOPES).join(' ');

const TOKEN_STORAGE_KEY = 'chainguard_google_token';
const TOKEN_EXPIRY_KEY = 'chainguard_google_token_expiry';

// === TOKEN MANAGEMENT ===
function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);
  if (token && expiry && Date.now() < parseInt(expiry)) {
    return token;
  }
  // Token expired, clean up
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
  return null;
}

function storeToken(token: string, expiresIn: number) {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  sessionStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresIn * 1000));
}

export function clearGoogleToken() {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
}

export function isGoogleConnected(): boolean {
  return getStoredToken() !== null;
}

// === OAUTH2 — Google Identity Services ===

/**
 * Load the Google Identity Services script if not already loaded.
 */
function loadGISScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Not in browser'));
      return;
    }
    if ((window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

/**
 * Request Google OAuth2 access token with required scopes.
 * Shows a popup for user consent.
 * Returns the access token string.
 */
export async function requestGoogleAccess(): Promise<string> {
  // Check if we already have a valid token
  const existing = getStoredToken();
  if (existing) return existing;

  await loadGISScript();

  return new Promise((resolve, reject) => {
    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services not loaded'));
      return;
    }

    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: ALL_SCOPES,
      callback: (response: any) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        storeToken(response.access_token, response.expires_in || 3600);
        resolve(response.access_token);
      },
      error_callback: (error: any) => {
        const msg = error?.message || error?.type || 'OAuth popup failed';
        if (msg.includes('popup_closed') || msg.includes('Popup window closed')) {
          reject(new Error('USER_CANCELLED'));
        } else {
          reject(new Error(msg));
        }
      },
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

// === GOOGLE SHEETS API ===

interface SheetData {
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

/**
 * Create a new Google Spreadsheet and populate with data.
 * Returns the spreadsheet URL.
 */
export async function exportToGoogleSheets(
  sheetTitle: string,
  sheets: SheetData[]
): Promise<string> {
  const token = await requestGoogleAccess();

  // 1. Create the spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: sheetTitle,
      },
      sheets: sheets.map((s, i) => ({
        properties: {
          sheetId: i,
          title: s.title,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      })),
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || 'Failed to create spreadsheet');
  }

  const spreadsheet = await createRes.json();
  const spreadsheetId = spreadsheet.spreadsheetId;
  const spreadsheetUrl = spreadsheet.spreadsheetUrl;

  // 2. Write data to each sheet
  const batchData: any[] = [];
  for (const sheet of sheets) {
    const values = [sheet.headers, ...sheet.rows];
    batchData.push({
      range: `'${sheet.title}'!A1`,
      values,
    });
  }

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: batchData,
      }),
    }
  );

  // 3. Format header row (bold + background color)
  const formatRequests = sheets.map((_, i) => ({
    repeatCell: {
      range: {
        sheetId: i,
        startRowIndex: 0,
        endRowIndex: 1,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.42, green: 0.39, blue: 1.0, alpha: 1 },
          textFormat: {
            bold: true,
            foregroundColor: { red: 1, green: 1, blue: 1 },
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    },
  }));

  // Auto-resize columns
  const resizeRequests = sheets.map((_, i) => ({
    autoResizeDimensions: {
      dimensions: {
        sheetId: i,
        dimension: 'COLUMNS',
        startIndex: 0,
        endIndex: 20,
      },
    },
  }));

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [...formatRequests, ...resizeRequests],
      }),
    }
  );

  return spreadsheetUrl;
}

// === GMAIL API ===

/**
 * Send an email using Gmail API.
 * The email is sent from the authenticated user's account.
 */
export async function sendGmailReport(
  to: string,
  subject: string,
  htmlBody: string
): Promise<boolean> {
  const token = await requestGoogleAccess();

  // Construct MIME message
  const boundary = 'chainguard_boundary_' + Date.now();
  const mimeMessage = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    btoa(unescape(encodeURIComponent(htmlBody))),
    `--${boundary}--`,
  ].join('\r\n');

  // Base64url encode
  const encoded = btoa(unescape(encodeURIComponent(mimeMessage)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encoded }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to send email');
  }

  return true;
}

/**
 * Build a beautiful HTML email for the financial report.
 */
export function buildReportEmailHTML(
  userName: string,
  reportContent: string,
  stats: {
    balance: string;
    income: string;
    expense: string;
    creditScore: number;
  }
): string {
  const escapeHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  // Escape untrusted content before applying the small supported markdown subset.
  const formattedContent = escapeHtml(reportContent)
    .replace(/## (.*)/g, '<h2 style="color:#6C63FF;border-bottom:1px solid #eee;padding-bottom:8px;margin-top:24px;">$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Segoe UI',Tahoma,sans-serif;background:#f5f5f5;padding:0;margin:0;">
  <div style="max-width:640px;margin:20px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a1a3e,#0d0d2b);padding:32px 24px;color:white;">
      <div style="font-size:12px;color:#a5a0ff;margin-bottom:8px;">🛡️ ChainGuard AI — Financial Report</div>
      <h1 style="margin:0;font-size:22px;">Báo Cáo Tài Chính</h1>
      <p style="margin:4px 0 0;color:#8888aa;font-size:14px;">${escapeHtml(userName)} — ${new Date().toLocaleDateString('vi-VN')}</p>
    </div>

    <!-- Stats -->
    <div style="display:flex;padding:16px 24px;background:#fafafa;border-bottom:1px solid #eee;">
      <div style="flex:1;text-align:center;">
        <div style="font-size:11px;color:#888;text-transform:uppercase;">Số dư</div>
        <div style="font-size:16px;font-weight:700;color:#0288d1;">${escapeHtml(stats.balance)}</div>
      </div>
      <div style="flex:1;text-align:center;">
        <div style="font-size:11px;color:#888;text-transform:uppercase;">Thu nhập</div>
        <div style="font-size:16px;font-weight:700;color:#00a651;">${escapeHtml(stats.income)}</div>
      </div>
      <div style="flex:1;text-align:center;">
        <div style="font-size:11px;color:#888;text-transform:uppercase;">Chi tiêu</div>
        <div style="font-size:16px;font-weight:700;color:#e53935;">${escapeHtml(stats.expense)}</div>
      </div>
      <div style="flex:1;text-align:center;">
        <div style="font-size:11px;color:#888;text-transform:uppercase;">Credit</div>
        <div style="font-size:16px;font-weight:700;color:#7c4dff;">${stats.creditScore}/850</div>
      </div>
    </div>

    <!-- Content -->
    <div style="padding:24px;font-size:14px;line-height:1.7;color:#333;">
      ${formattedContent}
    </div>

    <!-- Footer -->
    <div style="padding:16px 24px;background:#fafafa;border-top:1px solid #eee;text-align:center;font-size:12px;color:#999;">
      🛡️ ChainGuard AI — Powered by Google Gemini 2.0 Flash<br>
      Báo cáo được tạo tự động • ${new Date().toLocaleString('vi-VN')}
    </div>
  </div>
</body>
</html>`;
}

// === GOOGLE CALENDAR API ===

export interface CalendarEvent {
  summary: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  reminders?: { method: 'popup' | 'email'; minutes: number }[];
  colorId?: string;
}

/**
 * Create a Google Calendar event.
 * Returns the event URL.
 */
export async function createCalendarEvent(event: CalendarEvent): Promise<string> {
  const token = await requestGoogleAccess();

  const startDateTime = event.startDate.toISOString();
  const endDateTime = (event.endDate || new Date(event.startDate.getTime() + 30 * 60000)).toISOString();

  const body: any = {
    summary: event.summary,
    description: event.description || 'Tạo bởi ChainGuard AI',
    start: {
      dateTime: startDateTime,
      timeZone: 'Asia/Ho_Chi_Minh',
    },
    end: {
      dateTime: endDateTime,
      timeZone: 'Asia/Ho_Chi_Minh',
    },
    reminders: {
      useDefault: false,
      overrides: event.reminders || [
        { method: 'popup', minutes: 30 },
        { method: 'email', minutes: 60 },
      ],
    },
  };

  if (event.colorId) {
    body.colorId = event.colorId;
  }

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to create calendar event');
  }

  const data = await res.json();
  return data.htmlLink || '';
}

/**
 * Create multiple payment reminder events.
 */
export async function createPaymentReminders(
  reminders: { name: string; amount: number; dueDate: Date; category: string }[]
): Promise<string[]> {
  const links: string[] = [];

  for (const reminder of reminders) {
    const formatted = new Intl.NumberFormat('vi-VN').format(Math.abs(reminder.amount));
    const link = await createCalendarEvent({
      summary: `💰 Thanh toán: ${reminder.name}`,
      description: `ChainGuard AI — Nhắc thanh toán\n\n📋 ${reminder.name}\n💰 Số tiền: ${formatted}₫\n📂 Danh mục: ${reminder.category}\n\n🛡️ Tạo bởi ChainGuard AI`,
      startDate: reminder.dueDate,
      reminders: [
        { method: 'popup', minutes: 60 },
        { method: 'email', minutes: 1440 }, // 1 day before
      ],
      colorId: '11', // Red
    });
    links.push(link);
  }

  return links;
}
