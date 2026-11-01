# XML-Pro — Trình xem & Trích xuất dữ liệu XML Thuế, Hóa đơn điện tử ra Excel

Ứng dụng Windows siêu nhẹ, độc lập, **100% offline**, thay thế hoàn hảo cho iTax Viewer và bổ sung khả năng đọc hoá đơn điện tử cùng tính năng **trích xuất bảng kê Excel (.xlsx)** tự động.

Repository: [https://github.com/tuongotpho/xml-pro.git](https://github.com/tuongotpho/xml-pro.git)

---

## Tính năng nổi bật

1. **Hiển thị chuẩn mẫu iTax Viewer:**
   * Dựng chuẩn 100% theo bộ mẫu XSLT của Tổng cục Thuế: Tờ khai thuế (01/GTGT, 05/KK-TNCN, 03/TNDN...), Phụ lục, Báo cáo tài chính (TT200, TT133), Thông báo thuế, Chứng từ nộp tiền.
   * Đọc cả file nháp trong thư mục `HTKK\DataFiles`.
2. **Đọc Hóa đơn điện tử (HDon):**
   * Hóa đơn có mã CQT, không có mã, khởi tạo từ máy tính tiền.
   * Hiển thị bảng hàng hóa, chiết khấu, thuế suất, thông tin mở rộng.
   * Đọc trực tiếp **Trạng thái thanh toán** (*Đã thanh toán* / *Chưa thanh toán*), hình thức thanh toán, mã tra cứu.
3. **📊 Xuất Bảng kê Excel (.xlsx chuẩn OpenXML):**
   * **Bảng kê Hóa đơn:** Tổng hợp số HĐ, ký hiệu, ngày lập, thông tin người bán/người mua, MST, doanh thu chưa thuế, tiền thuế GTGT, phí khác, tổng tiền thanh toán, trạng thái thanh toán, mã CQT, chữ ký số... kèm công thức `=SUM(...)` tự động.
   * **Chi tiết hàng hóa HĐ:** Từng dòng mặt hàng, số lượng, đơn giá, chiết khấu, thuế suất, thành tiền.
   * **Hồ sơ & Tờ khai thuế:** Danh mục toàn bộ tờ khai, BCTC, thông báo, kỳ thuế, người nộp thuế, ngày nộp, người ký số.
   * Tạo file `.xlsx` thật 100% ngay trên trình duyệt máy, mở được trên mọi bản Microsoft Excel, Google Sheets, LibreOffice.
4. **Mở hàng loạt cực nhanh (Lazy Loading):**
   * Mở file `.xml`, file `.zip`, hoặc **kéo thả cả thư mục** chứa hàng trăm hóa đơn/tờ khai chỉ trong tích tắc.
   * Dựng mẫu tức thì theo nhu cầu khi chọn tab, không làm đơ máy.
5. **Duyệt Lịch sử tiện lợi:**
   * Giữ nguyên giao diện Lịch sử khi click xem các file cũ, có đánh dấu nổi bật file đang xem.
6. **Bảo mật tuyệt đối (100% Offline):**
   * Chạy hoàn toàn trên máy cục bộ, không gửi bất kỳ dữ liệu nào qua mạng internet.
   * Không đòi hỏi quyền Administrator (UAC).

---

## Hướng dẫn sử dụng & Cài đặt

### Cách 1: Dùng trực tiếp không cần cài đặt
Bấm đúp file `index.html` để mở bằng Microsoft Edge hoặc Google Chrome. Kéo thả file XML/ZIP vào và xem/xuất Excel ngay lập tức.

### Cách 2: Cài đặt vào Windows (Bấm đúp file XML là tự mở)
1. Chạy file bộ cài đặt: `dong-goi\ban-phat-hanh\CaiDat-XemXmlThue-1.1.0.exe`.
2. Bấm **Có** để cài đặt vào `%LOCALAPPDATA%\Programs\XemXmlThue`.
3. Đặt làm ứng dụng mặc định cho đuôi file `.xml` khi được Windows hỏi.

---

## Đóng gói & Phát triển

Yêu cầu môi trường: Windows 10/11 có sẵn .NET Framework 4.0+ (không cần cài thêm công cụ).

* **Chạy thử bản nguồn:**
  ```powershell
  powershell -ExecutionPolicy Bypass -File dong-goi\chay-thu.ps1 "C:\duong\dan\file.xml"
  ```
* **Đóng gói phiên bản mới (.exe):**
  ```powershell
  powershell -ExecutionPolicy Bypass -File dong-goi\dong-goi.ps1 -PhienBan 1.1.0
  ```

---

*(C) August87 - 0982722036*
