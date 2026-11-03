# [10] Phát hành XML-Pro 3.0.3: kiểm tra bản mới thật, kho bộ cài, trang giới thiệu

> Ngày 03/11/2026 · Tiếp nối: [09 — KHBS, 04/GTGT, 05/KK-TNCN](09-BAO-CAO-KHBS-04GTGT-TNCN.md) · Xem [00 — Mục lục](00-MUC-LUC-BAO-CAO.md)
> Nguồn dữ liệu: GitHub API (`releases/latest`), Firebase Hosting site `xmlpro` (project `app-from-ai`), bộ cài `CaiDat-XML-Pro-3.0.3.exe`.

## Kết luận trước

- **Trang giới thiệu đã lên mạng:** https://xmlpro.web.app (Firebase Hosting, site `xmlpro`).
- **Bộ cài nằm ở kho công khai mới, chỉ chứa bộ cài, không có mã nguồn:** https://github.com/tuongotpho/xml-pro-ban-phat-hanh.
  - Bản phát hành `v3.0.3` có 2 tệp: `CaiDat-XML-Pro-3.0.3.exe` và `CaiDat-XML-Pro.exe` (tên cố định, để nút tải trên web luôn trỏ tới bản mới nhất).
  - Kho `xml-pro` cũ không đụng tới; mã nguồn mới không đẩy lên đâu (theo yêu cầu "bỏ mã nguồn đi").
- **Tính năng cập nhật làm lại thật.** Bản cũ do Gemini làm là vỏ rỗng, luôn báo "đang dùng bản mới nhất"; tôi đã gỡ nó ở bản 2.0.1 (báo cáo 01, mục B1).
  - Bản mới: vỏ Windows hỏi GitHub, tối đa 1 lần / 20 giờ, tắt được, không gửi kèm dữ liệu nào.
  - Trang bên trong app vẫn bị chặn ra mạng.
- **Đo:**

| Kiểm | Kết quả |
|---|---|
| Đoạn mã kiểm tra cập nhật của app, giả làm bản 3.0.2, hỏi GitHub thật | `coBanMoi: true`, `banMoi: 3.0.3`, đường tải đúng kho |
| Cùng đoạn mã đó, bản 3.0.3 | `coBanMoi: false` (đang dùng bản mới nhất) |
| Nút tải trên web (`releases/latest/download/CaiDat-XML-Pro.exe`) | HTTP 200, 19.486.720 byte, đúng kích thước bộ cài |
| Trang web hiện phiên bản lấy từ GitHub | "Bản mới nhất 3.0.3 · ngày 3/11/2026" |
| Trang xem bằng mắt | máy tính và điện thoại, sáng và tối |
| Test chính / 4 bộ test cũ | 39/39 / đạt cả 4 |

## A. App thay đổi gì (3.0.3)

- **Vỏ `VoWebView2.cs`, lớp `CapNhat`:**
  - hỏi `https://api.github.com/repos/tuongotpho/xml-pro-ban-phat-hanh/releases/latest` (TLS 1.2, chờ tối đa 10 giây);
  - so số phiên bản; chỉ mở đường dẫn bắt đầu bằng `https://github.com/tuongotpho/xml-pro-ban-phat-hanh/releases/`.
- **Mục Giới thiệu:**
  - mục Cập nhật: nút "Kiểm tra bản mới", ô tắt tự kiểm tra, ghi chú bản mới, nút "Tải bộ cài bản mới";
  - câu "không gửi dữ liệu đi đâu" nói rõ ngoại lệ duy nhất là việc hỏi bản mới.
- **Chân thanh bên:** có dòng xanh "⬆ Có bản mới …" khi có bản mới.
- **Mở bằng cửa sổ Edge** (máy chưa có WebView2): không tự hỏi mạng, chỉ ghi chỗ tải `xmlpro.web.app`.
- **Test:** số liệu thuế thật chuyển ra `HD-TK\ky-vong.json` (không thuộc mã, không lên GitHub). Không có tệp này thì bài test bỏ qua phần đó và nói rõ.

## B. Phát hành bản sau thế nào

1. Đóng gói: `powershell -ExecutionPolicy Bypass -File dong-goi\dong-goi.ps1` (tự tăng số phiên bản).
2. Đăng lên kho bộ cài với thẻ `vX.Y.Z`, kèm 2 tệp: `CaiDat-XML-Pro-X.Y.Z.exe` và bản sao tên `CaiDat-XML-Pro.exe`.
3. Máy đang cài bản cũ tự thấy bản mới trong vòng 1 ngày, hoặc ngay khi bấm "Kiểm tra bản mới".
4. Trang web không cần deploy lại: nút tải và dòng phiên bản tự lấy bản mới nhất.

## C. Chưa làm / cần anh

- **Chưa thử trong app đã cài thật.** Đã thử đúng đoạn mã kiểm tra cập nhật (biên dịch riêng) với GitHub thật. Còn nút bấm trong app thì chỉ xác nhận được khi anh cài 3.0.3 rồi bấm Giới thiệu → Kiểm tra bản mới.
- **Bộ cài chưa có chữ ký số nhà phát hành:** Windows SmartScreen sẽ cảnh báo. Trang web đã hướng dẫn "Thông tin bổ sung → Vẫn chạy". Muốn hết cảnh báo phải mua chứng thư ký mã (code signing).
- **Kho `xml-pro` cũ vẫn công khai,** còn mã bản 1.7 và 6 hoá đơn mẫu thật. Muốn ẩn: GitHub → kho xml-pro → Settings → đổi sang Private.
