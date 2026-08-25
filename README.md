<div align="center">

# 🛡️ ChainGuard AI

### Nền tảng Quản lý Tài chính Thông minh — Tích hợp AI & Blockchain

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Gemini AI](https://img.shields.io/badge/Gemini-3.6_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_&_Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Ethereum](https://img.shields.io/badge/Ethereum-Sepolia-3C3C3D?style=for-the-badge&logo=ethereum)](https://sepolia.etherscan.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**Bảo vệ tài chính của bạn bằng AI thông minh và Blockchain minh bạch**

[🚀 Demo](#-demo) · [✨ Tính năng](#-tính-năng) · [🏗️ Kiến trúc](#️-kiến-trúc) · [⚡ Cài đặt](#-cài-đặt) · [🔧 Công nghệ](#-công-nghệ-sử-dụng)

---

</div>

## 📋 Giới thiệu

**ChainGuard AI** là nền tảng quản lý tài chính cá nhân thế hệ mới, kết hợp sức mạnh của **Google Gemini AI** và **Blockchain Ethereum** để giúp người dùng Việt Nam:

- 🤖 Nhận tư vấn tài chính 24/7 từ AI
- 🛡️ Phát hiện gian lận tài chính tự động
- 🔗 Xác minh giao dịch trên blockchain — không thể giả mạo
- 📊 Theo dõi chi tiêu với biểu đồ tương tác real-time

> 🏆 *Dự án tham gia [AI Riser Vietnam 2026](https://goo.gle/airiservietnam) — Google Developer Program*

---

## ✨ Tính năng

### 🤖 AI-Powered Features
| Tính năng | Mô tả |
|-----------|--------|
| **💬 AI Chat Advisor** | Cố vấn tài chính AI 24/7 với Gemini 3.6 Flash — tư vấn tiết kiệm, đầu tư, phân tích chi tiêu |
| **📸 Receipt Scanner** | Chụp ảnh hóa đơn → AI Vision tự động nhận diện tên, số tiền, danh mục |
| **📝 AI Report** | Tạo báo cáo phân tích tài chính chi tiết + kế hoạch tháng tới |
| **🏆 Credit Score** | Tính điểm tín dụng (300-850) dựa trên 5 yếu tố hành vi chi tiêu |

### 🛡️ Fraud Detection
| Tính năng | Mô tả |
|-----------|--------|
| **🔍 Server-side Scan** | 5 quy tắc phát hiện gian lận chạy server-side |
| **⚠️ Real-time Alerts** | Cảnh báo tức thì khi phát hiện giao dịch bất thường |
| **📊 Pattern Analysis** | Phân tích pattern: giao dịch lớn, giờ khuya, lặp bất thường |

### 🔗 Blockchain Verification
| Tính năng | Mô tả |
|-----------|--------|
| **📜 Smart Contract** | Solidity contract trên Ethereum Sepolia Testnet |
| **✅ On-chain Verify** | Ghi hash giao dịch lên blockchain — không thể giả mạo |
| **🔗 Etherscan Links** | Link xác minh trực tiếp trên Etherscan |

### 📊 Dashboard & Visualization
| Tính năng | Mô tả |
|-----------|--------|
| **🍩 Doughnut Chart** | Chi tiêu theo danh mục (Chart.js) |
| **📈 Line Chart** | Xu hướng thu/chi 7 ngày |
| **📊 Bar Chart** | So sánh thu/chi theo tháng |
| **📥 Export CSV** | Xuất giao dịch ra file CSV |

### 🔌 Google Workspace Integration
| Tính năng | Mô tả |
|-----------|--------|
| **📋 Google Sheets** | Xuất báo cáo trực tiếp ra Google Sheets |
| **✉️ Gmail** | Gửi báo cáo tài chính qua email |
| **📅 Google Calendar** | Đặt nhắc nhở thanh toán tự động |

---

## 🏗️ Kiến trúc

```
┌─────────────────────────────────────────────────┐
│                  FRONTEND                        │
│         Next.js 16.3 + TypeScript                │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Dashboard │ │ AI Chat  │ │ Fraud Detection  │  │
│  │ (Charts) │ │ (Gemini) │ │ (Server Scan)    │  │
│  └──────────┘ └──────────┘ └──────────────────┘  │
├─────────────────────────────────────────────────┤
│                 SERVICE LAYER                    │
│  ┌─────────┐ ┌──────────┐ ┌────────────────┐    │
│  │Firebase  │ │ Gemini   │ │ Google APIs    │    │
│  │Auth +    │ │ 3.6 Flash│ │ Sheets/Gmail/  │    │
│  │Firestore │ │ + Vision │ │ Calendar       │    │
│  └─────────┘ └──────────┘ └────────────────┘    │
├─────────────────────────────────────────────────┤
│                 BLOCKCHAIN                       │
│  ┌──────────────────────────────────────────┐    │
│  │  TransactionLedger.sol — Ethereum Sepolia │    │
│  │  Contract: 0xA780D4450ae5953E49b794bAbC.. │    │
│  └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

---

## 🔧 Công nghệ sử dụng

<table>
<tr>
<td align="center" width="150">

**Frontend**

</td>
<td>

`Next.js 16.3` `TypeScript` `React 19` `Chart.js` `CSS3 (Glassmorphism)`

</td>
</tr>
<tr>
<td align="center">

**AI / ML**

</td>
<td>

`Google Gemini 3.6 Flash` `Gemini Vision API` `@google/generative-ai`

</td>
</tr>
<tr>
<td align="center">

**Backend**

</td>
<td>

`Firebase Auth` `Cloud Firestore` `Next.js API Routes`

</td>
</tr>
<tr>
<td align="center">

**Blockchain**

</td>
<td>

`Solidity` `Ethers.js 6` `Ethereum Sepolia` `MetaMask`

</td>
</tr>
<tr>
<td align="center">

**Google APIs**

</td>
<td>

`Google Sheets API` `Gmail API` `Google Calendar API` `Google Identity Services`

</td>
</tr>
</table>

---

## ⚡ Cài đặt

### Yêu cầu
- Node.js 18+
- npm hoặc yarn
- MetaMask (cho tính năng Blockchain)

### 1. Clone repository

```bash
git clone https://github.com/nhatminh122004/chainguard-ai.git
cd chainguard-ai
```

### 2. Cài dependencies

```bash
npm install
```

### 3. Cấu hình environment

Tạo file `.env.local`:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Gemini AI
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key

# Blockchain (Sepolia)
NEXT_PUBLIC_ALCHEMY_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_key
NEXT_PUBLIC_CONTRACT_ADDRESS=your_contract_address

# Google APIs
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

### 4. Chạy development server

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) 🚀

---

## 📊 Thống kê dự án

| Metric | Giá trị |
|--------|---------|
| Source files | 32 files (TypeScript/TSX) |
| Lines of code | ~17,000 |
| Pages | 15 trang |
| Components | 6 reusable components |
| Service layers | 6 (Firebase, Firestore, Gemini, Google APIs, Blockchain, Notifications) |
| API Routes | 1 (Fraud Detection Server-side) |
| Smart Contracts | 1 (TransactionLedger.sol) |

---

## 📁 Cấu trúc thư mục

```
chainguard-ai/
├── contracts/               # Smart Contracts (Solidity)
│   └── TransactionLedger.sol
├── public/                  # Static assets
├── src/
│   ├── app/
│   │   ├── (dashboard)/     # Protected pages
│   │   │   ├── blockchain/  # 🔗 Blockchain verification
│   │   │   ├── chat/        # 💬 AI Chat advisor
│   │   │   ├── credit/      # 🏆 Credit Score
│   │   │   ├── dashboard/   # 📊 Main dashboard
│   │   │   ├── fraud/       # 🛡️ Fraud detection
│   │   │   ├── report/      # 📝 AI Reports
│   │   │   ├── scanner/     # 📸 Receipt scanner
│   │   │   ├── settings/    # ⚙️ Settings
│   │   │   └── transactions/# 💰 Transactions CRUD
│   │   ├── api/             # API Routes
│   │   ├── features/        # Static pages
│   │   ├── login/           # Authentication
│   │   └── page.tsx         # Landing page
│   ├── components/          # Reusable components
│   │   ├── Charts/          # 📊 Chart.js components
│   │   ├── Sidebar/         # Navigation
│   │   ├── Toast/           # Notifications
│   │   └── ...
│   ├── contexts/            # React contexts
│   └── lib/                 # Service layer
│       ├── blockchain.ts    # Ethereum integration
│       ├── firebase.ts      # Firebase config
│       ├── firestore.ts     # Firestore CRUD
│       ├── gemini.ts        # Gemini AI config
│       ├── google-apis.ts   # Sheets/Gmail/Calendar
│       └── notifications.ts # Push notifications
├── firestore.rules          # Security rules
└── package.json
```

---

## 🔐 Smart Contract

**Network:** Ethereum Sepolia Testnet  
**Contract:** [`0xA780D4450ae5953E49b794bAbC4B7Dd71EaFEb99`](https://sepolia.etherscan.io/address/0xA780D4450ae5953E49b794bAbC4B7Dd71EaFEb99)

```solidity
// TransactionLedger.sol — Core functions
function recordTransaction(string txId, int256 amount, string category, uint256 timestamp)
function verifyTransaction(string txId) → returns (bool exists, bytes32 hash)
function batchRecord(string[] txIds, int256[] amounts, string[] categories, uint256[] timestamps)
function getUserRecordCount(address user) → returns (uint256)
```

---

## 🛡️ Fraud Detection Rules

| Rule | Mô tả | Severity |
|------|--------|----------|
| `LARGE_AMOUNT` | Giao dịch > 5,000,000₫ | 🔴 High |
| `LATE_NIGHT` | Giao dịch 12AM - 5AM | 🟡 Medium |
| `RAPID_SAME_CAT` | > 3 giao dịch cùng danh mục/ngày | 🟡 Medium |
| `UNVERIFIED_HIGH_VALUE` | > 2M₫ chưa verified on-chain | 🟡 Medium |
| `CATEGORY_DOMINANCE` | 1 danh mục > 50% tổng chi tiêu | 🔵 Low |

---

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng:

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Mở Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">

**Được xây dựng với ❤️ bởi [nhatminh122004](https://github.com/nhatminh122004)**

*Dự án tham gia AI Riser Vietnam 2026 — Google Developer Program*

[![Google AI](https://img.shields.io/badge/Powered_by-Google_AI-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)
[![Firebase](https://img.shields.io/badge/Built_with-Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Ethereum](https://img.shields.io/badge/Secured_by-Ethereum-3C3C3D?style=flat-square&logo=ethereum)](https://ethereum.org/)

`#AIRiserVietnam` `#BuildwithGoogleAI` `#ChainGuardAI`

</div>
