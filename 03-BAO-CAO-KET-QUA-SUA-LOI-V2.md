# [03] Kết quả sửa toàn bộ lỗi XML-Pro v2.0.0 → bộ cài 2.0.1

> Ngày 02/11/2026 · Tiếp nối: [02 — Kế hoạch sửa lỗi](02-BAO-CAO-KE-HOACH-SUA-LOI-V2.md) (lỗi gốc ở [01](01-BAO-CAO-RA-SOAT-TOAN-DIEN-V2.md)) · Xem [00 — Mục lục](00-MUC-LUC-BAO-CAO.md)
> Nguồn dữ liệu: 5 bộ kiểm thử chạy trên mã sau khi sửa; kiểm chéo chữ ký bằng Windows .NET `SignedXml`; chạy thật `XML-Pro.exe` 2.0.1 từ thư mục tạm; nhánh git `sua-loi-v2`.

---

## Kết luận trước

- **Đã sửa hết các lỗi ở báo cáo 01** (A1–A5, B1–B4, B6). Đi theo phương án đã khuyên: **bỏ máy chủ nội bộ** và **gỡ Trung tâm cập nhật**. Anh nói "sửa toàn bộ" mà không chọn phương án, nên tôi lấy phương án khuyên.
- **Bộ test mới đạt 15/15.** Khi chạy trên mã 2.0.0, đúng bộ test này **chỉ đạt 6/14** (lúc đó mới có 14 mục; mục 15 "bấm Xoá" thêm sau). 4 bộ test cũ đều đạt, và giờ đã có điều kiện bắt buộc.
- **Bộ cài mới:** `dong-goi\ban-phat-hanh\CaiDat-XML-Pro-2.0.1.exe` (16.955 KB). **Chưa cài đè** lên bản 1.7.7 đang dùng trên máy anh, để anh tự bấm.
- Code nằm trên nhánh `sua-loi-v2`, **chưa gộp vào `main`, chưa đẩy lên GitHub.**

---

## Trước / sau — số đo

| Lỗi | Trước (2.0.0) | Sau (2.0.1) |
|---|---|---|
| A1 chữ ký số hoá đơn thật | 0/12 hợp lệ (báo "bị sửa" cả 12) | **12/12 hợp lệ, 12/12 khớp Windows .NET** |
| A1 hoá đơn sửa 1 chữ số | bị bắt (vì cái gì cũng bị bắt) | **bị bắt** |
| A1 giả mạo khéo: sửa tiền + tính lại vân tay | (bản sửa 1 dòng sẽ báo **hợp lệ**) | **bị bắt**, khớp .NET |
| A1 huy hiệu khi mở hoá đơn | 0 huy hiệu, phải bấm lại tab | **2 huy hiệu trong ≤ 2 giây** |
| A2 máy chủ nội bộ | tắt sau 2,6 s, F5 / tờ khai / tab 2 hỏng | **không còn máy chủ**; mở tệp 2 → tab mới, tiêu đề cửa sổ đúng hoá đơn số 18 |
| A3 cổng mở cho web lạ | cổng 28765–28784, `Allow-Origin: *` | **0 cổng**; CSP `connect-src 'self'` |
| A4 dòng chữ Việt mất dấu | 29 dòng (phép dò chặt), nút sáng/tối "??" | **0 dòng**; nút hiện ☀️ / 🌙 |
| A5 `.ps1` với tên có dấu | 0/1 tệp được đổi | **1/1**; có BOM; không ghi đè tệp trùng tên |
| B1 Trung tâm cập nhật | luôn báo "mới nhất" | **đã gỡ** |
| B4 xoá dữ liệu phiên | không có | **có nút**; bấm xong IndexedDB 0 bản ghi, lịch sử rỗng |
| Chèn mã độc qua XML / tên tệp | 0/13 | **0/13** (đo lại sau khi sửa) |

---

## Đã làm gì

### Chữ ký số (`index.html`)
- Tìm đúng phần dữ liệu đã ký trong **cả tài liệu**, không tìm trong khối chữ ký. Đây là nguyên nhân báo giả.
- Viết lại bộ chuẩn hoá XML (C14N 1.0, bao gồm và loại trừ):
  - mang namespace kế thừa từ tổ tiên;
  - sắp thuộc tính theo mã ký tự;
  - xử lý CDATA và biến đổi enveloped-signature.
- **Kiểm chữ ký thật:** lấy khoá công khai trong chứng thư (RSA hoặc ECDSA) và kiểm `SignatureValue` trên `SignedInfo` bằng Web Crypto. Chạy offline.
- Ba mức: ✔ hợp lệ / ✖ bị sửa / ⓘ không kiểm được (màu xám, không báo đỏ). Cảnh báo vàng nếu ký ngoài hạn chứng thư.
- Kiểm xong thì tự vẽ lại tờ đang xem và danh sách. Cảnh báo toàn vẹn chuyển sang loại "cảnh báo", nên giờ hiện trên tờ hoá đơn, vào bộ lọc "Cần chú ý" và cột "Cần kiểm tra" của Excel. Trước đó nó là loại "lỗi", không chỗ nào hiển thị.

### Máy chủ nội bộ (`dong-goi/XemXmlThue.cs`, `index.html`)
- Lấy lại phần mềm máy bản 1.7.x (commit `333247e`). Bản này **tốt hơn** bản 2.0.0 ở hai chỗ:
  - thoát ký tự an toàn hơn khi ghi tên tệp vào hàng chờ;
  - không xoá nhầm tệp hàng chờ chưa đọc. Bản 2.0.0 xoá mọi tệp trừ tệp mới nhất.
- Giữ 2 cải tiến nhỏ: dọn tệp hàng chờ cũ hơn 1 ngày; đóng đúng handle desktop.
- Gỡ trong trang: khối hỏi máy chủ định kỳ, nút + hàm "Đổi tên trực tiếp".

### Khác
- Khôi phục chữ Việt cho các dòng còn giữ lại. Các dòng nằm trong phần bị gỡ thì bỏ luôn.
- Sửa thẻ "Khôi phục phiên" bị lồng nhầm vào hàng nút "Chọn file".
- Script `.ps1`:
  - có BOM UTF-8;
  - không còn `-Force` (không ghi đè tệp có sẵn) và không còn `SilentlyContinue` (lỗi không bị nuốt);
  - báo số tệp đổi / bỏ qua / không thấy / lỗi;
  - tự chuyển về thư mục chứa script;
  - bỏ dòng trùng tên cũ để PowerShell không báo lỗi "trùng khoá".
- Gỡ Trung tâm cập nhật (nút, hộp thoại, CSS, mã). Thêm nút "🗑 Xoá dữ liệu phiên" vào hộp Giới thiệu.
- Sửa câu "không kiểm tra chữ ký" đã lỗi thời trong hộp Giới thiệu.
- **Tài liệu:**
  - README viết lại phần đầu theo đúng cái app làm được; bỏ 2 mục "v1.8.0" trùng lặp và lời "connect-src 'none'"; ghi rõ 6 nhóm ngành mới kiểm bằng tệp mẫu tự soạn.
  - HUONG-DAN cập nhật phần chữ ký số, đổi tên, xoá dữ liệu; tên bộ cài đúng `CaiDat-XML-Pro-*`.
  - KE-HOACH ghi chú mục "danh sách DN bỏ trốn" không làm được offline.
- **Test:**
  - thêm `kiem-thu-sua-loi.py` (15 mục, đối chiếu .NET);
  - `kiem-thu-ke-toan.py` bắt buộc chữ ký phải hợp lệ;
  - `kiem-thu-giai-doan-3.py` tự in được tiếng Việt, bắt lỗi biểu tượng "??", chấp nhận mọi phiên bản ≥ 2.0.0, và yêu cầu nút "Đổi tên trực tiếp" phải **không còn**.

---

## Nghiệm thu

| Hạng mục | Tôi đo | Cần anh |
|---|---|---|
| 5 bộ test | ✔ 15/15 + 4 bộ cũ đạt, mã thoát 0 | — |
| Chữ ký số khớp Windows | ✔ 12/12 | — |
| Chạy `XML-Pro.exe` 2.0.1: 1 cửa sổ, 0 cổng, tệp thứ 2 thành tab | ✔ (chạy từ thư mục tạm; cửa sổ thử đã đóng) | **Cài `CaiDat-XML-Pro-2.0.1.exe`**, bấm đúp vài tệp thật, thử F5 |
| Tờ khai thuế HTKK | ✘ kho mẫu vẫn chưa có tờ khai | Gửi 1–2 tệp tờ khai, hoặc cho phép lấy từ `F:\AI\HTKK-thanh` |
| Giao diện: huy hiệu chữ ký, nút Xoá dữ liệu phiên, chế độ tối | Qua test (đọc trang), **chưa nhìn bằng mắt** | Nhìn qua một lượt |
| Excel nhập vào MISA | ✘ | Thử nhập 1 tệp |

## Còn lại (ngoài đợt này)
Tách `index.html` thành module · ký số tệp `.exe` · chạy test tự động trên GitHub Actions · bỏ `'unsafe-inline'` khỏi CSP. Không làm trong đợt này, đúng như kế hoạch 02.
