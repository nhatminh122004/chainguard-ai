/**
 * Canvas-based Realistic Banking Receipt Generators for Demo Presets
 * Allows instant live testing of Gemini AI Forensics without needing real bank leaks.
 */

export interface PresetItem {
  id: string;
  name: string;
  bank: string;
  type: 'legit' | 'fake_font' | 'pending_schedule' | 'phishing_qr';
  badge: string;
  badgeClass: string;
  description: string;
  generateImage: () => string; // Returns data:image/png;base64,...
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

        // Big fake QR representation
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(150, 180, 300, 300);

        // QR finder patterns (corners)
        ctx.fillStyle = '#000000';
        // Top-left
        ctx.fillRect(180, 210, 70, 70);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(195, 225, 40, 40);
        ctx.fillStyle = '#000000';
        ctx.fillRect(205, 235, 20, 20);

        // Top-right
        ctx.fillRect(350, 210, 70, 70);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(365, 225, 40, 40);
        ctx.fillStyle = '#000000';
        ctx.fillRect(375, 235, 20, 20);

        // Bottom-left
        ctx.fillRect(180, 380, 70, 70);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(195, 395, 40, 40);
        ctx.fillStyle = '#000000';
        ctx.fillRect(205, 405, 20, 20);

        // Random matrix blocks simulating phishing QR
        for (let i = 0; i < 40; i++) {
          const rx = 270 + ((i * 17) % 100);
          const ry = 220 + ((i * 23) % 200);
          ctx.fillRect(rx, ry, 12, 12);
        }

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
  ];
}
