/**
 * Canvas-based Realistic Banking Receipt Generators for Demo Presets
 * Allows instant live testing of Gemini AI Forensics without needing real bank leaks.
 */

import QRCode from 'qrcode';
import { buildVietQr } from '@/lib/vietqr';

export interface PresetItem {
  id: string;
  name: string;
  bank: string;
  type: 'legit' | 'fake_font' | 'pending_schedule' | 'phishing_qr' | 'qr_legit' | 'qr_swapped' | 'qr_tampered';
  badge: string;
  badgeClass: string;
  description: string;
  generateImage: () => string; // Returns data:image/png;base64,...
}

/** Draws a REAL, decodable QR code (black on white, with quiet zone). */
function drawQrCode(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const quiet = 4;
  const cell = size / (n + quiet * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#000000';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.modules.data[r * n + c]) {
        ctx.fillRect(x + (c + quiet) * cell, y + (r + quiet) * cell, Math.ceil(cell), Math.ceil(cell));
      }
    }
  }
}

interface StandeeOptions {
  accent: string;
  printedName: string;
  printedBank: string;
  printedAccount: string;
  qrText: string;
  sticker?: boolean; // simulate a QR sticker pasted over the original
  footnote: string;
}

/** Draws a shop-counter VietQR standee. */
function drawStandee(canvas: HTMLCanvasElement, o: StandeeOptions) {
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#F4F6FB';
  ctx.fillRect(0, 0, 600, 900);

  ctx.fillStyle = o.accent;
  ctx.fillRect(0, 0, 600, 130);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('QUÉT MÃ ĐỂ THANH TOÁN', 300, 62);
  ctx.font = '15px sans-serif';
  ctx.fillText('VietQR • Napas 247 • Chấp nhận mọi ngân hàng', 300, 95);

  // Original QR frame
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(110, 170, 380, 380);
  ctx.strokeStyle = o.accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(110, 170, 380, 380);

  if (o.sticker) {
    // Sticker pasted slightly off-center with a drop shadow
    ctx.save();
    ctx.translate(300, 360);
    ctx.rotate(-0.035);
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-172, -172, 344, 344);
    ctx.shadowColor = 'transparent';
    drawQrCode(ctx, o.qrText, -165, -165, 330);
    ctx.restore();
  } else {
    drawQrCode(ctx, o.qrText, 125, 185, 350);
  }

  ctx.fillStyle = '#1F2937';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(o.printedName, 300, 610);
  ctx.fillStyle = '#4B5563';
  ctx.font = '18px sans-serif';
  ctx.fillText(`${o.printedBank} • STK ${o.printedAccount}`, 300, 645);

  ctx.fillStyle = '#E5E7EB';
  ctx.fillRect(60, 700, 480, 120);
  ctx.fillStyle = '#374151';
  ctx.font = '14px sans-serif';
  ctx.fillText('Vui lòng kiểm tra TÊN NGƯỜI NHẬN trên app trước khi chuyển', 300, 745);
  ctx.fillText(o.footnote, 300, 775);
}


export function createPresets(): PresetItem[] {
  // Helper to create a canvas in browser
  const createCanvas = (w: number, h: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    return canvas;
  };

  return [
    {
      id: 'vcb_legit',
      name: 'Bill VCB Hợp Lệ (2.500.000₫)',
      bank: 'Vietcombank',
      type: 'legit',
      badge: 'Mẫu Bill Thật',
      badgeClass: 'badge-success',
      description: 'Giao dịch chuyển nhanh Napas247 hoàn tất, chuẩn font VCB Digibank',
      generateImage: () => {
        const c = createCanvas(600, 900);
        const ctx = c.getContext('2d')!;

        // Background
        ctx.fillStyle = '#0F2417';
        ctx.fillRect(0, 0, 600, 900);

        // Header bar
        const grad = ctx.createLinearGradient(0, 0, 600, 180);
        grad.addColorStop(0, '#10562C');
        grad.addColorStop(1, '#0C3D1E');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 600, 160);

        // VCB Brand
        ctx.fillStyle = '#73C852';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText('Vietcombank', 40, 60);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px sans-serif';
        ctx.fillText('VCB Digibank • Chuyển tiền thành công', 40, 90);

        // Success Icon Circle
        ctx.beginPath();
        ctx.arc(300, 210, 40, 0, Math.PI * 2);
        ctx.fillStyle = '#73C852';
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✓', 300, 222);

        // Amount
        ctx.fillStyle = '#73C852';
        ctx.font = 'bold 38px sans-serif';
        ctx.fillText('2,500,000 VND', 300, 290);

        ctx.fillStyle = '#A0B4A8';
        ctx.font = 'italic 15px sans-serif';
        ctx.fillText('Hai triệu năm trăm nghìn đồng', 300, 320);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px sans-serif';
        ctx.fillText('07/10/2026 • 15:32:10 (GMT+7)', 300, 350);

        // Divider
        ctx.strokeStyle = '#1D452B';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(40, 380);
        ctx.lineTo(560, 380);
        ctx.stroke();

        // Details
        ctx.textAlign = 'left';
        const rows = [
          ['Người thụ hưởng', 'NGUYEN HOANG MINH'],
          ['Tài khoản nhận', '1029384756 (Vietcombank)'],
          ['Người gửi', 'TRAN THI HUONG'],
          ['Mã giao dịch (FT)', 'MBVCB.78923481029'],
          ['Hình thức chuyển', 'Chuyển tiền nhanh Napas 247'],
          ['Lời nhắn', 'Thanh toan tien hang don #489'],
        ];

        let y = 430;
        rows.forEach(([label, val]) => {
          ctx.fillStyle = '#7A9A85';
          ctx.font = '14px sans-serif';
          ctx.fillText(label, 40, y);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 15px sans-serif';
          ctx.fillText(val, 40, y + 24);

          y += 68;
        });

        // Watermark & Footer
        ctx.fillStyle = '#265C39';
        ctx.fillRect(40, 840, 520, 35);
        ctx.fillStyle = '#8DC8A0';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Giao dịch đã được ghi nhận trên hệ thống Vietcombank', 300, 862);

        return c.toDataURL('image/png');
      },
    },
    {
      id: 'mb_fake_font',
      name: 'Bill MB Sửa Số Tiền (50.000.000₫)',
      bank: 'MBBank',
      type: 'fake_font',
      badge: 'Mẫu Bill Giả Mạo',
      badgeClass: 'badge-danger',
      description: 'Chỉnh sửa photoshop: font số tiền sai lệch, vệt mờ, mã GD không hợp lệ',
      generateImage: () => {
        const c = createCanvas(600, 900);
        const ctx = c.getContext('2d')!;

        // MB Bank blue background
        ctx.fillStyle = '#06163A';
        ctx.fillRect(0, 0, 600, 900);

        ctx.fillStyle = '#185BFF';
        ctx.fillRect(0, 0, 600, 140);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText('MB: NGÂN HÀNG QUÂN ĐỘI', 40, 65);

        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#B4CAFE';
        ctx.fillText('GIAO DỊCH THÀNH CÔNG', 40, 95);

        // Blurry patch indicating Photoshop edit around amount
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(50, 200, 500, 110);
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.4)';
        ctx.strokeRect(50, 200, 500, 110);

        // Intentionally mismatched FONT and SIZE for amount (classic fake bill generator artifact)
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FF5252';
        ctx.font = 'bold 44px "Courier New", monospace'; // Obvious font mismatch!
        ctx.fillText('50,000,000 VND', 300, 265);

        ctx.fillStyle = '#E0E0E0';
        ctx.font = 'italic 13px "Times New Roman"'; // Another font mismatch
        ctx.fillText('Năm mươi triệu đồng chẵn', 300, 295);

        // Normal details below
        ctx.textAlign = 'left';
        ctx.fillStyle = '#7E95C7';
        ctx.font = '14px sans-serif';

        const rows = [
          ['Người nhận', 'LE VAN THINH'],
          ['Tài khoản thụ hưởng', '0987654321 - MB Bank'],
          ['Người chuyển', 'NGUYEN DUC ANH'],
          ['Mã giao dịch', '123456'], // Invalid short code
          ['Thời gian', '07/10/2026 03:15:00'], // Odd late night time
          ['Nội dung', 'Chuyen tien mua hang dien tu'],
        ];

        let y = 370;
        rows.forEach(([label, val]) => {
          ctx.fillStyle = '#7E95C7';
          ctx.font = '13px sans-serif';
          ctx.fillText(label, 40, y);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 15px sans-serif';
          ctx.fillText(val, 40, y + 22);

          y += 62;
        });

        // Warning stamp in demo
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText('[VẾT TẨY XÓA - FONT KHÔNG ĐỒNG NHẤT]', 80, 800);

        return c.toDataURL('image/png');
      },
    },
    {
      id: 'tcb_pending',
      name: 'Lệnh Hẹn Giờ Treo (Techcombank)',
      bank: 'Techcombank',
      type: 'pending_schedule',
      badge: 'Mẫu Lừa Đảo Hẹn Giờ',
      badgeClass: 'badge-warning',
      description: 'Lệnh đặt lịch hẹn giờ chưa hoàn tất thanh toán, kẻ gian vờ đã chuyển tiền',
      generateImage: () => {
        const c = createCanvas(600, 900);
        const ctx = c.getContext('2d')!;

        // Techcombank red/black theme
        ctx.fillStyle = '#121212';
        ctx.fillRect(0, 0, 600, 900);

        ctx.fillStyle = '#E90000';
        ctx.fillRect(0, 0, 600, 130);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('TECHCOMBANK', 40, 60);

        ctx.font = '14px sans-serif';
        ctx.fillText('DỊCH VỤ NGÂN HÀNG ĐIỆN TỬ F@ST MOBILE', 40, 90);

        // Status banner: PENDING / SCHEDULED
        ctx.fillStyle = '#3A2E12';
        ctx.fillRect(40, 160, 520, 60);
        ctx.strokeStyle = '#FFB347';
        ctx.lineWidth = 1;
        ctx.strokeRect(40, 160, 520, 60);

        ctx.fillStyle = '#FFB347';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ LỆNH CHUYỂN TIỀN TƯƠNG LAI — ĐANG CHỜ XỬ LÝ', 300, 195);

        // Amount
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText('12,800,000 VND', 300, 270);

        ctx.fillStyle = '#888888';
        ctx.font = '13px sans-serif';
        ctx.fillText('Ngày dự kiến thực hiện: 09/10/2026 (Chưa trừ tiền)', 300, 305);

        ctx.textAlign = 'left';
        const rows = [
          ['Trạng thái giao dịch', 'ĐÃ TIẾP NHẬN LỆNH (CHƯA HOÀN TẤT)'],
          ['Tài khoản trích tiền', '19033481928019'],
          ['Tài khoản người nhận', 'CHỦ CỬA HÀNG HƯNG YÊN - 88291029'],
          ['Mã yêu cầu lệnh', 'REQ-TCB-992102'],
          ['Nội dung', 'Chuyen tien coc may moc'],
        ];

        let y = 370;
        rows.forEach(([label, val]) => {
          ctx.fillStyle = '#777777';
          ctx.font = '13px sans-serif';
          ctx.fillText(label, 40, y);

          ctx.fillStyle = label.includes('Trạng thái') ? '#FFB347' : '#FFFFFF';
          ctx.font = 'bold 15px sans-serif';
          ctx.fillText(val, 40, y + 24);

          y += 68;
        });

        // Note
        ctx.fillStyle = '#222';
        ctx.fillRect(40, 780, 520, 70);
        ctx.fillStyle = '#E57373';
        ctx.font = '12px sans-serif';
        ctx.fillText('Lưu ý: Tiền chỉ được chuyển vào tài khoản thụ hưởng khi đến ngày hẹn', 55, 810);
        ctx.fillText('và tài khoản trích tiền có đủ số dư khả dụng.', 55, 830);

        return c.toDataURL('image/png');
      },
    },
    {
      id: 'qr_scam',
      name: 'Mã QR Lừa Đảo Phishing',
      bank: 'Mã QR Giả Mạo',
      type: 'phishing_qr',
      badge: 'Mã QR Độc Hại',
      badgeClass: 'badge-danger',
      description: 'Mã QR dán đè chứa đường link phishing giả mạo ngân hàng đánh cắp OTP',
      generateImage: () => {
        const c = createCanvas(600, 900);
        const ctx = c.getContext('2d')!;

        // Yellow danger theme
        ctx.fillStyle = '#1A1810';
        ctx.fillRect(0, 0, 600, 900);

        ctx.fillStyle = '#D97706';
        ctx.fillRect(0, 0, 600, 120);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('QUÉT MÃ QR NHẬN KHUYẾN MÃI', 40, 60);

        ctx.font = '14px sans-serif';
        ctx.fillText('Chương trình tri ân khách hàng Hưng Yên 2026', 40, 90);

        // Real, decodable QR containing the phishing URL
        drawQrCode(ctx, 'http://vcb-nhanthuong-otp.xyz/login', 150, 180, 300);

        // Malicious URL label below QR
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FF5252';
        ctx.font = 'bold 15px monospace';
        ctx.fillText('URL ĐÍCH: http://vcb-nhanthuong-otp.xyz/login', 300, 520);

        ctx.fillStyle = '#CCCCCC';
        ctx.font = '13px sans-serif';
        ctx.fillText('Quét để đăng nhập tài khoản ngân hàng và nhận 500,000 VND', 300, 555);

        // Analysis note
        ctx.fillStyle = '#2A1F08';
        ctx.fillRect(40, 620, 520, 220);
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 1;
        ctx.strokeRect(40, 620, 520, 220);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#F59E0B';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('⚠️ PHÂN TÍCH RỦI RO QR SCAM:', 60, 660);

        ctx.fillStyle = '#E5E7EB';
        ctx.font = '13px sans-serif';
        ctx.fillText('• Không phải chuẩn VietQR (EMVCo) để nhận tiền thanh toán.', 60, 695);
        ctx.fillText('• Mã QR chứa đường dẫn URL lạ (vcb-nhanthuong-otp.xyz) mạo danh VCB.', 60, 725);
        ctx.fillText('• Hành vi: Lừa người dùng nhập thông tin tài khoản và mã OTP ngân hàng.', 60, 755);
        ctx.fillText('• Khuyến cáo: KHÔNG quét, KHÔNG nhập OTP vào bất kỳ website nào.', 60, 785);

        return c.toDataURL('image/png');
      },
    },
    {
      id: 'qr_vietqr_legit',
      name: 'VietQR Chính Chủ (VCB)',
      bank: 'Vietcombank',
      type: 'qr_legit',
      badge: 'QR Hợp Lệ',
      badgeClass: 'badge-success',
      description: 'Mã VietQR thật của quán — CRC khớp, trùng tài khoản đã ghim',
      generateImage: () => {
        const c = createCanvas(600, 900);
        drawStandee(c, {
          accent: '#0B6B3A',
          printedName: 'NGUYEN HOANG MINH',
          printedBank: 'Vietcombank',
          printedAccount: '1029384756',
          qrText: buildVietQr({ bankBin: '970436', accountNumber: '1029384756', merchantName: 'NGUYEN HOANG MINH' }),
          footnote: 'Mã QR in sẵn • Không dán đè',
        });
        return c.toDataURL('image/png');
      },
    },
    {
      id: 'qr_vietqr_swapped',
      name: 'QR Dán Đè (CRC vẫn hợp lệ)',
      bank: 'MB Bank',
      type: 'qr_swapped',
      badge: 'QR Dán Đè',
      badgeClass: 'badge-danger',
      description: 'Sticker VietQR của kẻ gian dán lên biển quán — chỉ QR Pinning phát hiện',
      generateImage: () => {
        const c = createCanvas(600, 900);
        drawStandee(c, {
          accent: '#0B6B3A',
          printedName: 'NGUYEN HOANG MINH',
          printedBank: 'Vietcombank',
          printedAccount: '1029384756',
          qrText: buildVietQr({ bankBin: '970422', accountNumber: '0987654321', merchantName: 'LE VAN THINH' }),
          sticker: true,
          footnote: 'Biển in tên chủ quán, nhưng mã QR đã bị thay',
        });
        return c.toDataURL('image/png');
      },
    },
    {
      id: 'qr_vietqr_tampered',
      name: 'QR Bị Sửa Số Tiền (CRC sai)',
      bank: 'Vietcombank',
      type: 'qr_tampered',
      badge: 'QR Bị Can Thiệp',
      badgeClass: 'badge-danger',
      description: 'Chuỗi QR bị sửa số tiền 250.000₫ → 950.000₫ nhưng không tính lại CRC',
      generateImage: () => {
        const original = buildVietQr({
          bankBin: '970436',
          accountNumber: '1029384756',
          amount: 250000,
          merchantName: 'NGUYEN HOANG MINH',
          purpose: 'Thanh toan don 489',
        });
        const tampered = original.replace('5406250000', '5406950000');
        const c = createCanvas(600, 900);
        drawStandee(c, {
          accent: '#0B6B3A',
          printedName: 'NGUYEN HOANG MINH',
          printedBank: 'Vietcombank',
          printedAccount: '1029384756',
          qrText: tampered,
          footnote: 'Hóa đơn #489 • 250.000₫',
        });
        return c.toDataURL('image/png');
      },
    },
  ];
}
