// Gemini AI Configuration
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(
  process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY'
);

// Text model for financial advisor chat
export const getGeminiModel = () => {
  return genAI.getGenerativeModel({
    model: 'gemini-3.6-flash',
    systemInstruction: `Bạn là ChainGuard AI — một cố vấn tài chính AI thông minh, chuyên nghiệp và thân thiện.
    
Vai trò của bạn:
- Tư vấn quản lý tài chính cá nhân cho người dùng Việt Nam
- Phân tích chi tiêu và đưa ra lời khuyên tiết kiệm
- Giải thích về blockchain và cryptocurrency một cách dễ hiểu
- Cảnh báo về các rủi ro gian lận tài chính
- Đề xuất chiến lược đầu tư phù hợp

Quy tắc:
- Luôn trả lời bằng tiếng Việt trừ khi người dùng hỏi bằng tiếng Anh
- Sử dụng đơn vị tiền tệ VND khi nói về tài chính Việt Nam
- Đưa ra lời khuyên thận trọng, không hứa hẹn lợi nhuận
- Format câu trả lời rõ ràng với bullet points và emoji phù hợp
- Khi phát hiện dấu hiệu gian lận, cảnh báo ngay lập tức`,
  });
};

// Vision model for receipt scanning
export const getGeminiVisionModel = () => {
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
  });
};

// Interface for Fake Bill & Scam QR Detection Analysis
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
  riskScore: number; // 0 - 100
  verdict: 'SAFE' | 'SUSPICIOUS' | 'HIGH_RISK_FAKE';
  forensicAudit: {
    fontCheck: { status: 'passed' | 'warning' | 'failed'; detail: string };
    alignmentCheck: { status: 'passed' | 'warning' | 'failed'; detail: string };
    tamperingArtifacts: { status: 'passed' | 'warning' | 'failed'; detail: string };
    transactionCodeLogic: { status: 'passed' | 'warning' | 'failed'; detail: string };
    statusIntegrity: { status: 'passed' | 'warning' | 'failed'; detail: string };
    qrCodeSecurity: { status: 'passed' | 'warning' | 'failed' | 'not_applicable'; detail: string };
  };
  detectedAnomalies: string[];
  actionAdvice: string;
  summary: string;
}

// Forensic Analyzer for Fake Banking Receipts and Scam QR
export async function analyzeFakeBillAndQR(imageBase64: string, mimeType: string): Promise<FakeBillAnalysisResult> {
  const modelsToTry = ['gemini-2.5-flash', 'gemini-3.6-flash'];
  let lastError: Error | null = null;

  const prompt = `Bạn là một CHUYÊN GIA GIÁM ĐỊNH KỸ THUẬT SỐ & BẢO MẬT NGÂN HÀNG VIỆT NAM (Digital Banking Forensics Expert).
Nhiệm vụ của bạn là kiểm tra tỉ mỉ ảnh biên lai chuyển tiền / thông báo biến động số dư hoặc mã QR thanh toán để phát hiện BILL GIẢ MẠO (Fake Banking Receipt) hoặc QR LỪA ĐẢO (Scam Phishing QR).

CÁC DẤU HIỆU BILL GIẢ THƯỜNG GẶP TẠI VIỆT NAM:
1. Font chữ số tiền và tên người nhận bị sai lệch font chuẩn của app ngân hàng (Vietcombank, MB, Techcombank, BIDV, Vietinbank, ACB, VPBank, TPBank, Momo...). Thường do dùng web/app tạo bill giả dẫn đến font bị đậm nhạt bất thường, răng cưa, sai kích thước.
2. Căn lề bất thường: Dòng số tiền không thẳng hàng với đơn vị VND, khoảng cách giữa các số không đều.
3. Dấu hiệu cắt ghép / Photoshop: Vùng quanh số tiền và tên người nhận có vệt mờ (blur), nhiễu nén ảnh (compression artifacts) khác biệt với nền của ảnh.
4. Lệnh hẹn giờ / Đang xử lý: Hiển thị giao dịch nhưng thực chất là lệnh đặt lịch tương lai (scheduled) hoặc đang xử lý chứ tiền chưa về tài khoản đích.
5. Mã giao dịch (Ref/FT/Transaction ID): Thiếu mã giao dịch hoặc cú pháp mã không tuân thủ quy tắc của ngân hàng hiển thị.
6. Mã QR: Nếu ảnh có mã QR, kiểm tra xem có phải mã VietQR chuẩn (EMVCo) hay là link rút gọn, link lừa đảo dẫn đến trang giả mạo ngân hàng.

Hãy phân tích kỹ và trả về ĐÚNG ĐỊNH DẠNG JSON sau (không kèm markdown ngoài JSON):
{
  "isFinancialReceiptOrQR": true,
  "bankOrApp": "Tên ngân hàng hoặc ví điện tử (VD: Vietcombank, MBBank, Techcombank, Momo...)",
  "senderName": "Tên người chuyển (nếu có)",
  "receiverName": "Tên người nhận (nếu có)",
  "receiverAccount": "Số tài khoản nhận (nếu có)",
  "amount": "Số tiền (VD: 5,000,000 VND)",
  "amountInWords": "Số tiền bằng chữ (nếu có)",
  "transactionTime": "Thời gian giao dịch trên bill",
  "transactionCode": "Mã giao dịch / Mã tham chiếu",
  "transactionStatus": "SUCCESS" | "PENDING" | "SCHEDULED" | "FAILED" | "UNKNOWN",
  "riskScore": 0 đến 100, // 0: an toàn, 100: nguy cơ giả mạo 100%
  "verdict": "SAFE" | "SUSPICIOUS" | "HIGH_RISK_FAKE",
  "forensicAudit": {
    "fontCheck": {
      "status": "passed" | "warning" | "failed",
      "detail": "Đánh giá chi tiết về font chữ số tiền và nội dung"
    },
    "alignmentCheck": {
      "status": "passed" | "warning" | "failed",
      "detail": "Đánh giá căn lề, khoảng cách dòng và các phần tử đồ họa"
    },
    "tamperingArtifacts": {
      "status": "passed" | "warning" | "failed",
      "detail": "Đánh giá dấu vết chỉnh sửa ảnh, nén bất thường hoặc tẩy xóa"
    },
    "transactionCodeLogic": {
      "status": "passed" | "warning" | "failed",
      "detail": "Đánh giá tính hợp lệ của mã giao dịch"
    },
    "statusIntegrity": {
      "status": "passed" | "warning" | "failed",
      "detail": "Đánh giá trạng thái thành công thực tế hay lệnh hẹn giờ"
    },
    "qrCodeSecurity": {
      "status": "passed" | "warning" | "failed" | "not_applicable",
      "detail": "Đánh giá độ an toàn mã QR nếu có"
    }
  },
  "detectedAnomalies": [
    "Danh sách các điểm bất thường phát hiện được (nếu an toàn thì ghi 'Không phát hiện bất thường')"
  ],
  "actionAdvice": "Lời khuyên hành động khẩn cấp cho tiểu thương/người bán (VD: 'KHÔNG giao hàng, kiểm tra trực tiếp biến động số dư trên app ngân hàng của bạn')",
  "summary": "Tóm tắt kết luận giám định trong 1-2 câu"
}

LƯU Ý: CHỈ TRẢ VỀ JSON HỢP LỆ. KHÔNG VIẾT THÊM TEXT BÊN NGOÀI.`;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType,
          },
        },
      ]);
      const response = await result.response;
      const text = response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as FakeBillAnalysisResult;
      }
    } catch (err) {
      lastError = err as Error;
      console.warn(`Model ${modelName} failed for fake bill analysis:`, err);
    }
  }

  throw lastError || new Error('Không thể phân tích ảnh biên lai. Vui lòng kiểm tra API Key Gemini.');
}

export default genAI;

