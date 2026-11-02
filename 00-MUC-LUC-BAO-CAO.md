# [00] Mục lục báo cáo — thư mục `F:\AI\7.xml-pro`

> Quy tắc: mỗi báo cáo mới lấy **số tiếp theo** (tiếp theo là `04-`), tên tệp `NN-BAO-CAO-<CHU-DE>.md`, dòng đầu ghi `[NN]`, dòng thứ ba ghi báo cáo nó tiếp nối và nguồn dữ liệu. Thêm một dòng vào bảng dưới đây mỗi khi có báo cáo mới.

| Số | Báo cáo | Ngày | Tiếp nối | Nguồn dữ liệu chính | Kết luận một câu |
|---|---|---|---|---|---|
| 01 | [Rà soát toàn diện XML-Pro v2.0.0](01-BAO-CAO-RA-SOAT-TOAN-DIEN-V2.md) | 02/11/2026 | — | Mã nguồn (commit `333247e` + phần chưa commit), `XML-Pro.exe` 2.0.0, 12 XML mẫu, 4 bộ test + 4 phép đo độc lập | Lõi tốt, không lỗ chèn mã độc; nhưng v2.0.0 chưa nên phát hành: chữ ký số báo giả 12/12, máy chủ nội bộ tắt sau 2,6 s và để ngỏ cho web lạ, 39 dòng mất dấu, `.ps1` không đổi được tên có dấu |
| 02 | [Kế hoạch sửa toàn bộ lỗi v2.0.0](02-BAO-CAO-KE-HOACH-SUA-LOI-V2.md) | 02/11/2026 | 01 | Lỗi và số đo của báo cáo 01; phần sửa chưa commit của `XemXmlThue.cs` | 9 bước, khoảng 1 ngày: viết test có điều kiện bắt buộc trước, sửa chữ ký số (kể cả kiểm chữ ký thật), bỏ máy chủ nội bộ, gỡ trung tâm cập nhật rỗng; ra bộ cài 2.0.1 |
| 03 | [Kết quả sửa toàn bộ lỗi → bộ cài 2.0.1](03-BAO-CAO-KET-QUA-SUA-LOI-V2.md) | 02/11/2026 | 02 | 5 bộ test sau khi sửa; kiểm chéo .NET `SignedXml`; chạy thật `XML-Pro.exe` 2.0.1 | Đã sửa hết lỗi của báo cáo 01: test mới 15/15 (trước 6/14), chữ ký 12/12 khớp Windows, bỏ máy chủ nội bộ (0 cổng), `.ps1` đổi được tên có dấu; chưa cài đè, chưa gộp `main` |
