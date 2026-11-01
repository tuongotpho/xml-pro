# XML-Pro — Trình xem & Trích xuất dữ liệu Chứng từ điện tử chuẩn Quốc gia (Thuế, Hóa đơn, Hải quan, Y tế BHYT)

Ứng dụng Windows siêu nhẹ, độc lập, **100% offline**, thay thế hoàn hảo cho iTax Viewer và mở rộng thành **Trình đọc và xử lý chứng từ điện tử số 1 cho người dùng Windows tại Việt Nam**.

Repository: [https://github.com/tuongotpho/xml-pro.git](https://github.com/tuongotpho/xml-pro.git)

---

## Các lĩnh vực chứng từ hỗ trợ

### 1. Thuế & Kế toán (Mẫu chuẩn iTax Viewer)
* **Tờ khai, phụ lục, báo cáo tài chính** xuất từ HTKK / eTax (gốc `HSoThueDTu`): 01/GTGT, 05/KK-TNCN, 03/TNDN, BCTC TT200, TT133…
* Đọc cả file nháp trong thư mục `HTKK\DataFiles`.
* Thông báo thuế (`TBaoThue`), đăng ký thuế, chứng từ nộp tiền thuế (`CHUNGTU`).
* Dựng chuẩn 100% theo bộ mẫu XSLT của Tổng cục Thuế.

### 2. Hoá đơn điện tử (HDon)
* Mọi loại hóa đơn: Có mã CQT, không có mã, khởi tạo từ máy tính tiền.
* Hiển thị bảng hàng hóa, chiết khấu, thuế suất, thông tin mở rộng.
* Đọc trực tiếp **Trạng thái thanh toán** (*Đã thanh toán* / *Chưa thanh toán*), hình thức thanh toán, mã tra cứu.

### 3. Hải quan & Xuất nhập khẩu (Customs & Logistics)
* Đọc **Tờ khai Hải quan điện tử** (chuẩn VNACCS/VCIS, Cổng Một cửa Quốc gia NSW).
* Nhận diện và hiển thị nổi bật **Phân luồng Hải quan**:
  * 🟢 **LUỒNG XANH:** Miễn kiểm tra hồ sơ và hàng hóa.
  * 🟡 **LUỒNG VÀNG:** Kiểm tra chi tiết hồ sơ chứng từ.
  * 🔴 **LUỒNG ĐỎ:** Kiểm tra chi tiết hồ sơ và kiểm tra thực tế hàng hóa.
* Hiển thị đầy đủ: Bên xuất khẩu, Bên nhập khẩu, Vận đơn (B/L), Hóa đơn thương mại, Danh mục hàng hóa mã HS, Trị giá tính thuế, Thuế XNK và Thuế GTGT.

### 4. Y tế & Giám định BHYT (Healthcare & EMR)
* Đọc **Bệnh án điện tử & Hồ sơ giám định BHYT** (chuẩn Bộ Y tế: XML 4210 / Quyết định 130/QĐ-BYT).
* Thông tin hành chính bệnh nhân, mã thẻ BHYT, hạn thẻ, nơi ĐKKCB ban đầu.
* Quá trình điều trị: Ngày vào/ra viện, mã bệnh ICD-10 chính & phụ, kết quả điều trị.
* Bảng cơ cấu viện phí: Tổng chi phí, BHYT thanh toán, Người bệnh cùng chi trả, Chi phí ngoài danh mục.
* Bảng chi tiết thuốc/hóa chất và chi tiết dịch vụ kỹ thuật (DVKT/PTTT/Xét nghiệm).

---

## 📊 Xuất Bảng kê Excel (.xlsx chuẩn OpenXML)
Tạo file `.xlsx` thật 100% trong tích tắc ngay trên máy, tương thích mọi phiên bản Excel, Google Sheets:
* **Sheet Bảng kê Hóa đơn:** Tổng hợp số HĐ, ký hiệu, ngày lập, thông tin người bán/người mua, MST, doanh thu chưa thuế, tiền thuế GTGT, tổng tiền, trạng thái thanh toán, mã CQT... kèm công thức `=SUM(...)`.
* **Sheet Chi tiết hàng hóa HĐ:** Từng dòng mặt hàng, số lượng, đơn vị tính, đơn giá, chiết khấu, thuế suất, thành tiền.
* **Sheet Bảng kê Tờ khai Hải quan:** Số tờ khai, phân luồng, mã loại hình, đơn vị XNK, số vận đơn, thuế XNK, thuế GTGT.
* **Sheet Chi tiết hàng hóa XNK:** Mã HS, mô tả hàng hóa, xuất xứ, lượng hàng, thuế suất và tiền thuế.
* **Sheet Bảng kê Viện phí BHYT:** Mã BN, tên bệnh nhân, thẻ BHYT, mã bệnh ICD-10, tổng chi phí KCB, BHYT trả, bệnh nhân trả.
* **Sheet Chi tiết thuốc & DVKT:** Danh mục thuốc và dịch vụ kỹ thuật đã chỉ định.
* **Sheet Hồ sơ & Tờ khai thuế:** Danh mục toàn bộ tờ khai, BCTC, kỳ thuế, MST, người nộp thuế, ngày nộp, chữ ký số.

---

## Hướng dẫn sử dụng & Cài đặt

### Cách 1: Dùng trực tiếp không cần cài đặt
Bấm đúp file `index.html` để mở bằng Microsoft Edge hoặc Google Chrome. Kéo thả file XML/ZIP vào và xem/xuất Excel ngay lập tức.

### Cách 2: Cài đặt vào Windows (Bấm đúp file XML là tự mở)
1. Chạy file bộ cài đặt: `dong-goi\ban-phat-hanh\CaiDat-XemXmlThue-1.2.0.exe`.
2. Bấm **Có** để cài đặt vào `%LOCALAPPDATA%\Programs\XemXmlThue` (không cần quyền Admin).
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
  powershell -ExecutionPolicy Bypass -File dong-goi\dong-goi.ps1 -PhienBan 1.2.0
  ```

---

*(C) August87 - 0982722036*
