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
    model: 'gemini-3.6-flash',
  });
};

export default genAI;
