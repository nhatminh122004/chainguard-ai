import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/Toast/Toast";
import CustomCursor from "@/components/CustomCursor/CustomCursor";
import CopyProtection from "@/components/CopyProtection/CopyProtection";

export const metadata: Metadata = {
  title: "ChainGuard AI — Nền Tảng Tài Chính Minh Bạch Bằng Blockchain & AI",
  description: "ChainGuard AI giúp bạn quản lý tài chính thông minh với AI Gemini, bảo vệ giao dịch bằng blockchain, và xây dựng điểm tín dụng on-chain minh bạch. Chống gian lận tài chính hiệu quả cho người Việt.",
  keywords: "fintech, blockchain, AI, credit score, anti-fraud, Vietnam, ChainGuard",
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icon.svg',
  },
  openGraph: {
    title: "ChainGuard AI — Smart Finance Powered by Blockchain & AI",
    description: "Quản lý tài chính minh bạch, chống gian lận, xây dựng tín dụng on-chain",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" sizes="any" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Sanitize extension injected attributes (e.g. Bitdefender bis_skin_checked) before React hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined' && window.MutationObserver) {
                  var obs = new MutationObserver(function(mutations) {
                    for (var i = 0; i < mutations.length; i++) {
                      if (mutations[i].attributeName === 'bis_skin_checked') {
                        mutations[i].target.removeAttribute('bis_skin_checked');
                      }
                    }
                  });
                  obs.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['bis_skin_checked'] });
                }
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <CustomCursor />
        <CopyProtection />
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
