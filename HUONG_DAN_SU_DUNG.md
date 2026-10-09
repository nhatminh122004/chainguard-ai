# HƯỚNG DẪN CÀI ĐẶT, VẬN HÀNH VÀ SỬ DỤNG CHAINGUARD AI

> Phiên bản tài liệu: nhánh `final-HY`
>
> Dự án: ChainGuard AI — Quản lý tài chính, phát hiện gian lận và xác thực giao dịch bằng AI + Blockchain
>
> Cuộc thi: Khởi nghiệp, đổi mới sáng tạo tỉnh Hưng Yên năm 2026
>
> Repository: <https://github.com/nhatminh122004/chainguard-ai>

---

## 1. Giới thiệu

ChainGuard AI là ứng dụng web hỗ trợ người dùng Việt Nam:

- Quản lý thu nhập, chi tiêu và số dư cá nhân.
- Phân tích thói quen tài chính bằng biểu đồ và điểm tín dụng.
- Tư vấn tài chính bằng Google Gemini.
- Quét hóa đơn, trích xuất thông tin giao dịch bằng AI Vision.
- Phát hiện giao dịch bất thường bằng hệ thống luật phía máy chủ.
- Giám định ảnh bill chuyển khoản và phân tích mã VietQR/QR đáng ngờ.
- Ghi dấu vân tay giao dịch lên Ethereum Sepolia để tạo bằng chứng on-chain.
- Xuất báo cáo sang CSV, HTML, TXT, Google Sheets và gửi qua Gmail.

### 1.1. Công nghệ chính

| Thành phần | Công nghệ |
|---|---|
| Giao diện | Next.js 16.4, React 19, TypeScript, Chart.js |
| AI | Google Gemini 3.6 Flash và Gemini 2.5 Flash |
| Xác thực và dữ liệu | Firebase Authentication, Cloud Firestore |
| Blockchain | Solidity, Ethers.js 6, MetaMask, Ethereum Sepolia |
| QR | VietQR/EMVCo, CRC-16/CCITT-FALSE, jsQR |
| Tích hợp Google | Sheets API, Gmail API, Calendar API |

### 1.2. Nguyên tắc an toàn

- Khóa Gemini chỉ tồn tại phía máy chủ với tên `GEMINI_API_KEY`.
- Không đưa khóa Gemini vào biến có tiền tố `NEXT_PUBLIC_`.
- Firestore chỉ cho phép người dùng đọc/ghi tài liệu thuộc chính UID của mình.
- Tất cả API AI và fraud scan đều yêu cầu đăng nhập.
- API giới hạn kích thước request, tần suất gọi và quota theo người dùng.
- Nội dung chat/báo cáo được render an toàn, không thực thi HTML từ người dùng hoặc AI.
- Trạng thái “on-chain” chỉ hợp lệ khi có đủ `dataHash`, transaction hash và block number.
- Phân tích AI chỉ là công cụ hỗ trợ; người bán vẫn phải kiểm tra biến động số dư trực tiếp trên ứng dụng ngân hàng.

---

## 2. Yêu cầu hệ thống

### 2.1. Bắt buộc

- Windows 10/11, macOS hoặc Linux.
- Node.js 20 LTS trở lên; khuyến nghị Node.js 22 hoặc 24.
- npm đi kèm Node.js.
- Git.
- Chrome hoặc Microsoft Edge phiên bản mới.
- Kết nối Internet.

### 2.2. Tùy chọn theo tính năng

- MetaMask: cần khi ghi giao dịch lên Sepolia.
- SepoliaETH: dùng trả phí gas thử nghiệm, không phải tiền thật.
- Tài khoản Google Cloud: cần cho Sheets, Gmail và Calendar.
- Firebase CLI: chỉ cần khi triển khai Firestore Rules; lệnh của dự án có thể tự gọi qua `npx`.

---

## 3. Tải đúng phiên bản `final-HY`

### 3.1. Clone mới từ GitHub

```bash
git clone --branch final-HY --single-branch https://github.com/nhatminh122004/chainguard-ai.git
cd chainguard-ai
```

Kiểm tra branch:

```bash
git branch --show-current
```

Kết quả phải là:

```text
final-HY
```

### 3.2. Nếu đã clone repository trước đó

```bash
git fetch origin
git switch final-HY
git pull --ff-only origin final-HY
```

### 3.3. Cài dependency

```bash
npm install
```

Nếu PowerShell chặn `npm.ps1`, có thể dùng:

```powershell
npm.cmd install
```

---

## 4. Cấu hình biến môi trường

Tạo file `.env.local` tại thư mục gốc của dự án. Có thể sao chép từ file mẫu:

```powershell
Copy-Item .env.example .env.local
```

Trên macOS/Linux:

```bash
cp .env.example .env.local
```

Mẫu cấu hình đầy đủ:

```env
# Firebase Web SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Gemini — bí mật, chỉ sử dụng phía server
GEMINI_API_KEY=your_gemini_api_key

# Bí mật ký cookie phiên demo; tối thiểu 32 ký tự
DEMO_SESSION_SECRET=replace_with_a_long_random_secret

# Ethereum Sepolia
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_key
NEXT_PUBLIC_CONTRACT_ADDRESS=0xA780D4450ae5953E49b794bAbC4B7Dd71EaFEb99

# Google Workspace OAuth — tùy chọn
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com

# Firebase Cloud Messaging — tùy chọn
NEXT_PUBLIC_FCM_VAPID_KEY=your_vapid_key
```

### 4.1. Quy tắc bảo mật biến môi trường

- Không commit `.env.local` lên GitHub.
- Không chụp màn hình hoặc gửi `GEMINI_API_KEY` cho người khác.
- Không dùng `NEXT_PUBLIC_GEMINI_API_KEY`.
- Khi khóa bị lộ, cần thu hồi khóa cũ và tạo khóa mới ngay.
- Trên nền tảng hosting, nhập `GEMINI_API_KEY` và `DEMO_SESSION_SECRET` trong phần Environment Variables của dịch vụ.

### 4.2. Tạo `DEMO_SESSION_SECRET`

PowerShell:

```powershell
$bytes = New-Object byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

Sao chép chuỗi kết quả vào `DEMO_SESSION_SECRET`.

---

## 5. Cấu hình Firebase

### 5.1. Tạo Firebase project

1. Mở <https://console.firebase.google.com/>.
2. Chọn **Add project**.
3. Tạo Web App bằng biểu tượng `</>`.
4. Sao chép thông tin cấu hình Web SDK vào `.env.local`.

### 5.2. Bật Authentication

1. Vào **Build → Authentication → Get started**.
2. Bật **Email/Password**.
3. Bật **Google**.
4. Trong **Authorized domains**, thêm domain triển khai nếu chạy production.

### 5.3. Tạo Cloud Firestore

1. Vào **Build → Firestore Database**.
2. Chọn **Create database**.
3. Chọn khu vực phù hợp.
4. Không để rules ở test mode khi trình diễn hoặc triển khai thật.

### 5.4. Triển khai Firestore Security Rules

Đăng nhập Firebase CLI:

```bash
npx firebase-tools login
```

Nếu chưa chọn project:

```bash
npx firebase-tools use --add
```

Triển khai rules owner-only:

```bash
npm run deploy:rules
```

Rules hiện bảo vệ các collection:

- `transactions`: chỉ chủ sở hữu đọc/ghi.
- `fraudAlerts`: chỉ chủ sở hữu đọc/ghi.
- `users/{uid}`: chỉ đúng UID truy cập.
- `userSettings/{uid}` và `demoSeeded/{uid}`: chỉ đúng UID truy cập.
- Các collection khác: mặc định từ chối.

> Chế độ Demo dùng localStorage và cookie phiên demo, không cần mở quyền công khai trên Firestore.

---

## 6. Cấu hình Gemini AI

1. Mở <https://aistudio.google.com/apikey>.
2. Chọn **Create API key**.
3. Điền khóa vào `GEMINI_API_KEY`.
4. Khởi động lại server sau khi đổi biến môi trường.

Gemini được gọi thông qua các API server-side:

| API | Chức năng |
|---|---|
| `/api/ai/chat` | Chat tư vấn tài chính |
| `/api/ai/generate` | Báo cáo và kế hoạch tài chính |
| `/api/ai/receipt` | Nhận dạng hóa đơn |
| `/api/ai/fake-bill` | Giám định bill/QR bằng AI Vision |

Các API này có:

- Xác thực Firebase ID token hoặc cookie demo `HttpOnly`.
- Body-size limit.
- Ảnh chỉ nhận JPEG, PNG hoặc WEBP, tối đa 8MB.
- Rate limit và quota theo người dùng.
- Kiểm tra cấu trúc dữ liệu AI trả về trước khi gửi cho giao diện.

---

## 7. Cấu hình Blockchain Sepolia

### 7.1. Chuẩn bị MetaMask

1. Cài MetaMask từ trang chính thức.
2. Bật hiển thị test network.
3. Chọn **Sepolia Test Network**.
4. Nhận SepoliaETH từ faucet uy tín.

Không gửi ETH thật vào địa chỉ thử nghiệm.

### 7.2. RPC và contract

- Tạo Sepolia RPC tại Alchemy hoặc dịch vụ RPC tương thích.
- Điền URL vào `NEXT_PUBLIC_SEPOLIA_RPC_URL`.
- Contract mặc định:
  `0xA780D4450ae5953E49b794bAbC4B7Dd71EaFEb99`.
- Xem contract tại:
  <https://sepolia.etherscan.io/address/0xA780D4450ae5953E49b794bAbC4B7Dd71EaFEb99>.

### 7.3. Tự triển khai contract mới

1. Mở `contracts/TransactionLedger.sol`.
2. Mở <https://remix.ethereum.org/>.
3. Tạo file mới và dán mã contract.
4. Compile bằng Solidity `0.8.24`.
5. Chọn **Injected Provider - MetaMask**.
6. Đảm bảo MetaMask đang ở Sepolia.
7. Deploy và xác nhận giao dịch.
8. Sao chép contract address mới vào `.env.local`.

### 7.4. Dữ liệu bằng chứng on-chain

Khi ghi thành công, ứng dụng lưu:

- `dataHash`: Keccak-256 của dữ liệu giao dịch chuẩn hóa.
- `txHash`: transaction hash của Sepolia.
- `blockNumber`: block chứa giao dịch.
- `walletAddress`: ví đã ký.
- `contractAddress`: contract tiếp nhận.
- `network`: `sepolia`.
- `verifiedAt`: thời điểm ứng dụng ghi nhận kết quả.

Hash được tạo từ phiên bản cấu trúc, ID giao dịch, UID, tên, số tiền, danh mục và ngày. Không chứa thời gian ngẫu nhiên nên có thể tái tạo để đối chiếu.

> Dữ liệu demo ban đầu không được đánh dấu on-chain. Chỉ sau khi MetaMask ghi thành công thì giao dịch mới hiển thị “Verified”.

---

## 8. Cấu hình Google Sheets, Gmail và Calendar

1. Mở <https://console.cloud.google.com/>.
2. Tạo hoặc chọn project.
3. Bật Google Sheets API, Gmail API và Google Calendar API.
4. Cấu hình OAuth consent screen.
5. Tạo OAuth Client ID loại **Web application**.
6. Thêm JavaScript origin:
   - `http://localhost:3000`
   - Domain production, nếu có.
7. Điền Client ID vào `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

Khi sử dụng lần đầu, trình duyệt sẽ yêu cầu người dùng cấp quyền Google tương ứng.

---

## 9. Chạy dự án

### 9.1. Development

```bash
npm run dev
```

Truy cập:

```text
http://localhost:3000
```

### 9.2. Kiểm tra production build

```bash
npm run build
npm run start
```

### 9.3. Các lệnh kiểm tra trước khi trình diễn

```bash
npx tsc --noEmit
npm run lint
npm run build
npm audit --omit=dev
node scripts/test-vietqr.mjs
```

Kỳ vọng của phiên bản `final-HY`:

- TypeScript không có lỗi.
- Build production thành công.
- ESLint không có error; một số warning cải thiện mã có thể vẫn còn.
- Production dependency audit không có lỗ hổng đã biết.
- Bộ test VietQR đạt 12/12.

---

## 10. Đăng nhập và chế độ Demo

### 10.1. Email/Password

1. Mở `/login`.
2. Chọn đăng ký nếu chưa có tài khoản.
3. Nhập tên hiển thị, email và mật khẩu tối thiểu 6 ký tự.
4. Sau khi đăng nhập, dữ liệu được lưu theo Firebase UID.

### 10.2. Google Sign-In

1. Nhấn nút đăng nhập bằng Google.
2. Chọn tài khoản.
3. Chấp nhận yêu cầu đăng nhập.

### 10.3. Truy cập Demo cho giám khảo

1. Tại `/login`, nhấn nút truy cập Demo.
2. Server phát hành cookie demo `HttpOnly`, có chữ ký và thời hạn 12 giờ.
3. Giao dịch/cảnh báo demo được lưu trong localStorage của trình duyệt.
4. API AI vẫn xác thực phiên demo bằng cookie phía server.

Khi đăng xuất, cookie và dấu phiên demo được xóa.

---

## 11. Hướng dẫn sử dụng từng chức năng

### 11.1. Landing page

Các trang công khai gồm:

- `/`: giới thiệu tổng quan.
- `/features`: tính năng.
- `/how-it-works`: cách hoạt động.
- `/technology`: công nghệ.
- `/stats`: số liệu minh họa.

Nhấn **Bắt đầu ngay** để mở trang đăng nhập.

### 11.2. Dashboard

Sau đăng nhập, trang `/dashboard` hiển thị:

- Tổng số dư.
- Thu nhập và chi tiêu tháng hiện tại.
- Điểm tín dụng.
- Số giao dịch có bằng chứng on-chain.
- Biểu đồ phân loại chi tiêu.
- Xu hướng thu/chi.
- Danh sách giao dịch gần nhất.

Các số liệu được tính từ dữ liệu của tài khoản hiện tại, không đọc dữ liệu người dùng khác.

### 11.3. Quản lý giao dịch

Mở `/transactions`.

#### Thêm giao dịch

1. Nhấn **Thêm giao dịch**.
2. Nhập tên giao dịch.
3. Nhập số tiền.
4. Chọn loại thu nhập hoặc chi tiêu theo giao diện.
5. Chọn danh mục, ngày và ghi chú.
6. Nhấn lưu.

#### Lọc và sắp xếp

- Lọc theo danh mục.
- Sắp xếp theo ngày hoặc số tiền.
- Chọn chiều tăng/giảm.

#### Xóa giao dịch

Nhấn biểu tượng xóa tại dòng tương ứng và xác nhận. Thao tác này không thể xóa bản ghi đã tồn tại trên blockchain; nó chỉ xóa dữ liệu ứng dụng.

#### Xuất CSV

Nhấn nút xuất CSV. Cột “Verified” chỉ ghi Có khi giao dịch có đầy đủ bằng chứng blockchain.

### 11.4. AI Financial Advisor

Mở `/chat`.

Ví dụ câu hỏi:

- “Làm sao tiết kiệm 20% thu nhập?”
- “Tôi nên xây quỹ khẩn cấp thế nào?”
- “Blockchain credit score là gì?”
- “Dấu hiệu nhận biết gian lận chuyển khoản?”

Cách dùng:

1. Nhập câu hỏi.
2. Nhấn nút gửi hoặc Enter.
3. Dùng Shift+Enter để xuống dòng.
4. Chờ phản hồi từ Gemini.

Không nhập mật khẩu ngân hàng, mã OTP, seed phrase, private key hoặc số thẻ đầy đủ vào AI Chat.

### 11.5. Receipt Scanner

Mở `/scanner`.

1. Chọn ảnh JPEG, PNG hoặc WEBP không quá 8MB.
2. Nhấn quét hóa đơn.
3. AI trích xuất cửa hàng, ngày, tổng tiền, danh mục và danh sách mặt hàng.
4. Kiểm tra lại kết quả.
5. Nhấn lưu để tạo giao dịch chi tiêu.

Nếu tổng tiền hoặc ngày bị đọc sai, không lưu và hãy thử ảnh rõ hơn.

### 11.6. Fraud Detection Shield

Mở `/fraud`.

Có hai cách quét:

- **Client Scan**: chạy kiểm tra nhanh trên dữ liệu hiện có.
- **Server Scan**: gửi tối đa 500 giao dịch đã chuẩn hóa tới API bảo vệ.

Các nhóm luật chính:

| Mã luật | Nội dung |
|---|---|
| `LARGE_AMOUNT` | Giá trị tuyệt đối trên 5.000.000 VND |
| `LATE_NIGHT` | Giao dịch trong khoảng 0h–5h |
| `RAPID_SAME_CAT` | Từ 4 giao dịch cùng danh mục trong một ngày |
| `UNVERIFIED_HIGH_VALUE` | Trên 2.000.000 VND nhưng chưa có bằng chứng on-chain |
| `CATEGORY_DOMINANCE` | Một danh mục chiếm trên 50% chi tiêu và trên 3.000.000 VND |

Khi có cảnh báo:

1. Đọc lý do và mức độ.
2. Đối chiếu với lịch sử thực tế.
3. Đánh dấu đã xử lý sau khi xác minh.
4. Không coi cảnh báo tự động là kết luận pháp lý.

### 11.7. Fake Bill & Scam QR Detector

Mở `/fake-bill`.

Ứng dụng hỗ trợ:

- Tải ảnh bill từ thiết bị.
- Chụp bill bằng camera.
- Quét QR trực tiếp.
- Chọn ảnh mẫu để trình diễn.

#### Giám định bill bằng AI

1. Chọn ảnh không quá 8MB.
2. Nhấn **Bắt đầu giám định AI**.
3. Xem risk score, verdict và checklist pháp chứng.
4. Đọc kỹ trạng thái giao dịch: thành công, đang xử lý, hẹn giờ, thất bại hoặc không rõ.
5. Nếu nghi ngờ, lưu kết quả vào Fraud Shield.

AI đánh giá font, căn lề, dấu chỉnh sửa, mã giao dịch, trạng thái và QR. AI không thể xác nhận tiền đã vào tài khoản; phải kiểm tra ứng dụng ngân hàng của người nhận.

#### Phân tích QR tại thiết bị

QR được kiểm tra cục bộ theo:

- Cấu trúc TLV/EMVCo.
- GUID VietQR.
- CRC-16/CCITT-FALSE.
- Bank BIN và số tài khoản.
- URL lừa đảo, giao thức nguy hiểm, tên miền giả mạo.
- So khớp với tài khoản nhận tiền đã ghim.

### 11.8. Ghim tài khoản người nhận

Khi QR hợp lệ chứa tài khoản cửa hàng:

1. Chọn ghim tài khoản.
2. Đặt nhãn dễ nhận biết.
3. Lần quét sau, ứng dụng so sánh QR với danh sách đã ghim.

Nếu QR có CRC đúng nhưng trỏ tới tài khoản khác, ứng dụng vẫn cảnh báo nguy cơ tráo QR. Danh sách ghim được lưu cục bộ trong trình duyệt.

### 11.9. Blockchain Verification

Mở `/blockchain`.

#### Kết nối ví

1. Mở khóa MetaMask.
2. Nhấn **Connect Wallet**.
3. Cho phép ứng dụng xem địa chỉ ví.
4. Chấp nhận chuyển sang Sepolia nếu được hỏi.

#### Ghi một giao dịch

1. Chọn giao dịch chưa verified.
2. Nhấn ghi on-chain.
3. Kiểm tra thông tin trên MetaMask.
4. Xác nhận gas Sepolia.
5. Chờ giao dịch được đào.

Sau thành công, nhấn link transaction hash để xem trên Etherscan.

#### Ghi hàng loạt

1. Nhấn **Verify All**.
2. Ứng dụng chọn tối đa 20 giao dịch chưa verified.
3. Xác nhận một giao dịch batch trong MetaMask.
4. Mỗi giao dịch được lưu data hash riêng nhưng dùng chung transaction hash batch.

Không đóng trang hoặc đổi mạng khi MetaMask đang chờ xác nhận.

### 11.10. Credit Score

Mở `/credit`.

Điểm nằm trong khoảng 300–850, được tính từ các nhóm yếu tố trong ứng dụng, gồm:

- Cân đối thu nhập/chi tiêu.
- Mức độ ổn định tài chính.
- Đa dạng nguồn thu và hành vi giao dịch.
- Mức tiết kiệm.
- Tỷ lệ giao dịch có bằng chứng on-chain.

Đây là chỉ số mô phỏng phục vụ quản lý tài chính, không phải điểm tín dụng chính thức của ngân hàng hoặc CIC.

### 11.11. AI Report

Mở `/report`.

#### Báo cáo tài chính

1. Chọn tab báo cáo.
2. Nhấn tạo báo cáo AI.
3. Xem tổng quan, phân tích chi tiêu, cảnh báo, khuyến nghị và kế hoạch hành động.

#### Kế hoạch tháng tới

1. Chọn tab kế hoạch tháng tới.
2. Nhấn tạo kế hoạch.
3. Xem mục tiêu, ngân sách, tiết kiệm, quản lý rủi ro và checklist.

#### Xuất báo cáo

- Copy vào clipboard.
- Xuất TXT.
- Xuất HTML an toàn.
- Xuất Google Sheets.
- Gửi Gmail.

Nội dung AI và tên người dùng được escape khi tạo HTML/email để tránh chèn mã độc.

### 11.12. Settings

Mở `/settings` để:

- Đổi tên hiển thị.
- Chọn đơn vị tiền tệ/ngôn ngữ nếu giao diện hỗ trợ.
- Bật/tắt các nhóm thông báo.
- Kết nối Google Workspace.
- Gửi thông báo thử.
- Tạo nhắc thanh toán trên Google Calendar.
- Quản lý tài khoản nhận tiền đã ghim.

---

## 12. Kịch bản trình diễn đề xuất cho giám khảo

Thời lượng gợi ý: 7–10 phút.

### Bước 1 — Nêu bài toán

Trình bày rủi ro bill chuyển khoản giả, QR bị tráo, chi tiêu mất kiểm soát và dữ liệu giao dịch thiếu bằng chứng minh bạch.

### Bước 2 — Vào chế độ Demo

1. Mở `/login`.
2. Chọn truy cập Demo.
3. Mở Dashboard và giới thiệu các chỉ số.

### Bước 3 — Trình diễn QR

1. Mở Fake Bill & QR.
2. Quét một VietQR hợp lệ.
3. Ghim tài khoản cửa hàng.
4. Quét QR hợp lệ nhưng khác tài khoản để chứng minh cơ chế phát hiện tráo QR.

### Bước 4 — Trình diễn bill giả

1. Chọn một mẫu nghi ngờ.
2. Chạy AI Forensics.
3. Giải thích risk score và checklist.
4. Lưu cảnh báo vào Fraud Shield.

### Bước 5 — Trình diễn server fraud scan

1. Mở Fraud Shield.
2. Nhấn Server Scan.
3. Giải thích một hoặc hai luật nổi bật.

### Bước 6 — Trình diễn blockchain thật

1. Mở Blockchain.
2. Chỉ rõ ban đầu demo không giả vờ là verified.
3. Kết nối MetaMask Sepolia.
4. Ghi một giao dịch.
5. Mở transaction trên Etherscan.
6. Refresh trang để cho thấy transaction hash vẫn còn do đã được lưu bền vững.

### Bước 7 — Kết thúc bằng AI Report

1. Tạo báo cáo tài chính.
2. Xuất HTML hoặc Google Sheets.
3. Nhấn mạnh mô hình có thể mở rộng cho hộ kinh doanh và tiểu thương Hưng Yên.

---

## 13. Quyền riêng tư và giới hạn sản phẩm

- Không lưu private key hoặc seed phrase.
- MetaMask ký trực tiếp trên ví của người dùng.
- Dữ liệu transaction Firestore được tách theo UID.
- Demo dùng localStorage nên dữ liệu phụ thuộc trình duyệt hiện tại.
- AI có thể nhận dạng sai ảnh mờ, ảnh nén mạnh hoặc ảnh bị che.
- Kết quả fake-bill là đánh giá rủi ro, không phải kết luận giám định pháp lý.
- Điểm tín dụng là chỉ số nội bộ, không liên kết CIC.
- Blockchain không xác nhận tiền ngân hàng đã chuyển; nó chỉ chứng minh một hash đã được ghi bởi địa chỉ ví tại một block.
- Rate limit hiện lưu trong bộ nhớ của tiến trình. Khi chạy nhiều server production, nên chuyển quota sang Redis/Upstash hoặc kho dùng chung.

---

## 14. Xử lý lỗi thường gặp

### 14.1. AI báo chưa cấu hình API key

Kiểm tra:

```env
GEMINI_API_KEY=...
```

Không dùng `NEXT_PUBLIC_GEMINI_API_KEY`. Khởi động lại server sau khi sửa.

### 14.2. API trả 401

- Đăng nhập lại Firebase hoặc Demo.
- Kiểm tra cookie không bị trình duyệt chặn.
- Với Firebase, thử đăng xuất rồi đăng nhập lại để lấy ID token mới.

### 14.3. API trả 429

Người dùng đã vượt rate limit/quota. Chờ theo header `Retry-After` rồi thử lại; không bấm liên tục.

### 14.4. Ảnh bị từ chối

- Chỉ dùng JPEG, PNG hoặc WEBP.
- Kích thước không quá 8MB.
- Không đổi đuôi file giả; hãy xuất lại đúng định dạng ảnh.

### 14.5. Firestore “Missing or insufficient permissions”

- Kiểm tra người dùng đã đăng nhập.
- Kiểm tra document có `userId` đúng bằng Firebase UID.
- Chạy `npm run deploy:rules` để triển khai rules mới.
- Không mở rules thành `allow read, write: if true`.

### 14.6. Demo không hoạt động production

- Kiểm tra `DEMO_SESSION_SECRET` dài ít nhất 32 ký tự.
- Kiểm tra website dùng HTTPS để cookie `Secure` hoạt động.
- Xóa cookie cũ, tải lại trang rồi đăng nhập Demo lại.

### 14.7. MetaMask không xuất hiện

- Cài đúng extension MetaMask.
- Mở khóa ví.
- Cho phép extension chạy trên domain hiện tại.
- Dùng Chrome/Edge desktop.

### 14.8. Sai network

Chọn Sepolia, Chain ID `11155111`. Ứng dụng sẽ thử yêu cầu MetaMask chuyển mạng tự động.

### 14.9. Contract hiển thị 0 record

Đây là trạng thái đúng nếu chưa có giao dịch nào được gửi đến contract bằng ví hiện tại/hệ thống. Dữ liệu demo không tự giả lập record on-chain.

### 14.10. Camera không mở

- Cấp quyền Camera cho trình duyệt.
- Production phải dùng HTTPS.
- `localhost` thường được trình duyệt coi là secure context.
- Nếu vẫn lỗi, dùng chức năng tải ảnh.

### 14.11. Google Sheets/Gmail/Calendar không hoạt động

- Kiểm tra `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
- Kiểm tra OAuth consent screen.
- Thêm đúng JavaScript origin.
- Bật đúng API trong Google Cloud Console.
- Kiểm tra popup không bị chặn.

---

## 15. Checklist trước khi deploy hoặc dự thi

### Mã nguồn

- [ ] Đang ở branch `final-HY`.
- [ ] `git status` không có thay đổi chưa commit ngoài file cá nhân không cần thiết.
- [ ] Không có `.env.local` hoặc khóa bí mật trong commit.
- [ ] `npm run build` thành công.
- [ ] `npm audit --omit=dev` không có vulnerability production.

### Firebase

- [ ] Authentication Email/Password và Google đã bật.
- [ ] Authorized domain đã cấu hình.
- [ ] Firestore Rules đã deploy.
- [ ] Thử tài khoản A không đọc được dữ liệu tài khoản B.

### AI

- [ ] Chat trả lời thành công.
- [ ] Receipt Scanner nhận ảnh đúng định dạng.
- [ ] Fake Bill Analyzer chạy được.
- [ ] Không có `NEXT_PUBLIC_GEMINI_API_KEY`.

### Blockchain

- [ ] MetaMask có SepoliaETH.
- [ ] RPC hoạt động.
- [ ] Contract address đúng.
- [ ] Ghi thử một giao dịch và mở được Etherscan.
- [ ] Refresh trang vẫn thấy transaction hash.

### Trình diễn

- [ ] Chuẩn bị sẵn một QR hợp lệ và một QR bị tráo tài khoản.
- [ ] Chuẩn bị một bill rõ và một bill nghi ngờ.
- [ ] Đăng nhập Demo thử trước.
- [ ] Có phương án tải ảnh nếu camera không được cấp quyền.
- [ ] Không tuyên bố dữ liệu demo là dữ liệu blockchain thật.

---

## 16. Cấu trúc thư mục quan trọng

```text
chainguard-ai/
├── contracts/
│   └── TransactionLedger.sol
├── scripts/
│   └── test-vietqr.mjs
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── blockchain/
│   │   │   ├── chat/
│   │   │   ├── credit/
│   │   │   ├── dashboard/
│   │   │   ├── fake-bill/
│   │   │   ├── fraud/
│   │   │   ├── report/
│   │   │   ├── scanner/
│   │   │   ├── settings/
│   │   │   └── transactions/
│   │   └── api/
│   │       ├── ai/
│   │       ├── auth/demo/
│   │       └── fraud-scan/
│   ├── components/
│   ├── contexts/
│   └── lib/
├── .env.example
├── firebase.json
├── firestore.rules
├── HUONG_DAN_SU_DUNG.md
└── package.json
```

---

## 17. Quy trình cập nhật branch `final-HY`

Chỉ thực hiện khi đã kiểm tra build:

```bash
git switch final-HY
git pull --rebase origin final-HY
npm install
npm run build
git add <cac-file-can-cap-nhat>
git commit -m "docs: update final HY release"
git push origin final-HY
```

Không dùng `git push --force` trên branch trình diễn nếu chưa hiểu rõ ảnh hưởng.

---

## 18. Thông tin hỗ trợ

- GitHub: <https://github.com/nhatminh122004/chainguard-ai>
- Branch bản hoàn thiện: `final-HY`
- Network blockchain: Ethereum Sepolia
- Contract mặc định: `0xA780D4450ae5953E49b794bAbC4B7Dd71EaFEb99`

Khi báo lỗi, nên cung cấp:

1. Trang/chức năng gặp lỗi.
2. Các bước tái hiện.
3. Ảnh chụp màn hình đã che thông tin nhạy cảm.
4. Log trình duyệt hoặc terminal, không kèm API key/token.
5. Phiên bản Node.js và tên branch.

---

**ChainGuard AI — AI hỗ trợ ra quyết định, blockchain tạo bằng chứng, con người thực hiện xác minh cuối cùng.**
