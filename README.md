# XML-Pro — Trình xem & Trích xuất dữ liệu Chứng từ điện tử chuẩn Quốc gia

Ứng dụng Windows siêu nhẹ, độc lập, **100% offline**, thay thế hoàn hảo cho iTax Viewer và mở rộng thành **Trình đọc và xử lý chứng từ điện tử số 1 cho người dùng Windows tại Việt Nam**.

Repository: [https://github.com/tuongotpho/xml-pro.git](https://github.com/tuongotpho/xml-pro.git)

---

## 8 Nhóm Chứng từ & Định dạng Chuyên biệt Hỗ trợ (Phiên bản v1.3.0)

### 1. Thuế & Kế toán (Mẫu chuẩn iTax Viewer)
* **Tờ khai, phụ lục, báo cáo tài chính** xuất từ HTKK / eTax (gốc `HSoThueDTu`): 01/GTGT, 05/KK-TNCN, 03/TNDN, BCTC TT200, TT133…
* Đọc cả file nháp trong thư mục `HTKK\DataFiles`.
* Thông báo thuế (`TBaoThue`), đăng ký thuế, chứng từ nộp tiền thuế (`CHUNGTU`).
* Dựng chuẩn 100% theo bộ mẫu XSLT của Tổng cục Thuế.

### 2. Hoá đơn điện tử (HDon)
* Mọi loại hóa đơn: Có mã CQT, không có mã, khởi tạo từ máy tính tiền theo NĐ 123/2020/NĐ-CP & TT 78/2021/TT-BTC.
* Hiển thị bảng hàng hóa, chiết khấu, thuế suất, thông tin mở rộng.
* Đọc trực tiếp **Trạng thái thanh toán** (*Đã thanh toán* / *Chưa thanh toán*), hình thức thanh toán, mã CQT cấp.

### 3. Chứng từ Khấu trừ Thuế TNCN Điện tử (TNCN)
* Chuẩn quy định theo Nghị định 123/2020/NĐ-CP và Thông tư 78/2021/TT-BTC (Mẫu 01/TNCN).
* Bóc tách đầy đủ: Tổ chức chi trả thu nhập (Tên, MST, địa chỉ), Người nộp thuế (Họ tên, MST cá nhân, CCCD/CMND, tình trạng cư trú).
* Bảng kê tài chính chi tiết: Thu nhập chịu thuế, Các khoản giảm trừ đóng bảo hiểm bắt buộc, Thu nhập tính thuế, Số thuế TNCN khấu trừ, Số tiền thực nhận, Số tiền bằng chữ.
* Dấu xác thực và chữ ký số điện tử của doanh nghiệp chi trả.

### 4. Hồ sơ Bảo hiểm Xã hội Điện tử (BHXH)
* Chuẩn giao dịch điện tử BHXH Việt Nam (Quyết định 595/QĐ-BHXH, QĐ 505/QĐ-BHXH, QĐ 899).
* Hỗ trợ các mẫu biểu:
  * **Mẫu D02-LT:** Báo cáo tình hình sử dụng lao động và danh sách lao động tham gia BHXH, BHYT, BHTN.
  * **Mẫu C70a-HD:** Danh sách đề nghị giải quyết hưởng chế độ ốm đau, thai sản, dưỡng sức.
  * **Mẫu TK1-TS / TK3-TS:** Tờ khai tham gia, điều chỉnh thông tin người tham gia và đơn vị.
* Bảng thống kê KPI: Tổng số lao động, Tổng quỹ lương đóng, Ước tính tiền đóng 32%, Danh sách lao động chi tiết kèm mã số BHXH và tiền lương.

### 5. Sổ phụ Ngân hàng Điện tử & Sao kê (Banking)
* Chuẩn quốc tế **ISO 20022 `camt.053`** (Bank to Customer Statement), `camt.054` (Debit/Credit Notification) và định dạng Ủy nhiệm chi (`UNC`).
* Thông tin ngân hàng, chi nhánh, mã SWIFT/BIC, số tài khoản, chủ tài khoản, loại tiền tệ.
* Thống kê 4 thẻ tài chính: [Số dư đầu kỳ] · [Tổng phát sinh Có (+)] · [Tổng phát sinh Nợ (-)] · [Số dư cuối kỳ].
* Bảng nhật ký giao dịch: Badge Ghi Có / Ghi Nợ trực quan, số dư lũy kế từng giao dịch, thông tin đối ứng (người chuyển/nhận, số TK, ngân hàng), nội dung chi tiết.

### 6. Hồ sơ Đấu thầu qua Mạng (Procurement)
* Chuẩn Hệ thống Mạng Đấu thầu Quốc gia (`muasamcong.mpi.gov.vn`) theo Luật Đấu thầu số 22/2023/QH15.
* Hỗ trợ Hồ sơ dự thầu điện tử (**E-HSDT**), Hồ sơ mời thầu (**E-HSMT**).
* Thông tin gói thầu: Mã TBMT, mã gói thầu, tên gói thầu, chủ đầu tư, bên mời thầu, phương thức lựa chọn nhà thầu.
* Tư cách nhà thầu: Nhà thầu độc lập hay Liên danh, MST nhà thầu.
* Cam kết tài chính: Giá dự thầu (có VAT), Thư giảm giá, Giá sau giảm giá, Thư bảo lãnh dự thầu ngân hàng, giá trị bảo lãnh, hiệu lực HSDT.
* Biểu giá dự thầu chi tiết: Danh mục công việc, mã hiệu định mức, khối lượng, đơn giá, thành tiền.

### 7. Hải quan & Xuất nhập khẩu (Customs & Logistics)
* Đọc **Tờ khai Hải quan điện tử** (chuẩn VNACCS/VCIS, Cổng Một cửa Quốc gia NSW).
* Nhận diện và hiển thị nổi bật **Phân luồng Hải quan**:
  * 🟢 **LUỒNG XANH:** Miễn kiểm tra hồ sơ và hàng hóa.
  * 🟡 **LUỒNG VÀNG:** Kiểm tra chi tiết hồ sơ chứng từ.
  * 🔴 **LUỒNG ĐỎ:** Kiểm tra chi tiết hồ sơ và kiểm tra thực tế hàng hóa.
* Hiển thị: Bên xuất khẩu, Bên nhập khẩu, Vận đơn (B/L), Hóa đơn thương mại, Danh mục hàng hóa mã HS, Trị giá tính thuế, Thuế XNK và Thuế GTGT.

### 8. Y tế & Giám định BHYT (Healthcare & EMR)
* Đọc **Bệnh án điện tử & Hồ sơ giám định BHYT** (chuẩn Bộ Y tế: XML 4210 / Quyết định 130/QĐ-BYT).
* Thông tin hành chính bệnh nhân, mã thẻ BHYT, hạn thẻ, nơi ĐKKCB ban đầu.
* Quá trình điều trị: Ngày vào/ra viện, mã bệnh ICD-10 chính & phụ, kết quả điều trị.
* Bảng cơ cấu viện phí: Tổng chi phí, BHYT thanh toán, Người bệnh cùng chi trả, Chi phí ngoài danh mục.
* Bảng chi tiết thuốc/hóa chất và chi tiết dịch vụ kỹ thuật (DVKT/PTTT/Xét nghiệm).

---

## 📊 Xuất Bảng kê Excel (.xlsx chuẩn OpenXML siêu tốc)
Tạo file `.xlsx` thật 100% trong tích tắc ngay trên máy, tương thích mọi phiên bản Excel, Google Sheets, LibreOffice:
* **Sheet Bảng kê Hóa đơn:** Tổng hợp số HĐ, ký hiệu, ngày lập, thông tin bên bán/mua, MST, doanh thu, tiền thuế GTGT, tổng thanh toán, trạng thái thanh toán, mã CQT... kèm công thức `=SUM(...)`.
* **Sheet Chi tiết hàng hóa HĐ:** Từng dòng mặt hàng, số lượng, đơn vị tính, đơn giá, chiết khấu, thuế suất, thành tiền.
* **Sheet Chứng từ Khấu trừ TNCN:** Danh sách chứng từ khấu trừ thuế, MST đơn vị, NNT, thu nhập chịu thuế, giảm trừ, số thuế khấu trừ, số tiền thực nhận.
* **Sheet Hồ sơ BHXH:** Danh mục báo cáo D02-LT, C70a-HD, mã thủ tục, kỳ kê khai, số lao động, tổng quỹ lương, tiền đóng BHXH.
* **Sheet Danh sách lao động BHXH:** Chi tiết từng lao động, mã số BHXH, CCCD, chức vụ, mức lương đóng BHXH, chế độ trợ cấp.
* **Sheet Sổ phụ Ngân hàng:** Số tài khoản, số dư đầu kỳ, tổng phát sinh Có, số món Có, tổng phát sinh Nợ, số món Nợ, số dư cuối kỳ.
* **Sheet Giao dịch sao kê NH:** Chi tiết từng giao dịch, loại GD (+/-), số tiền, số dư sau GD, tài khoản đối ứng, diễn giải chuyển khoản.
* **Sheet Hồ sơ Đấu thầu:** Mã TBMT, tên gói thầu, bên mời thầu, nhà thầu, giá dự thầu, giảm giá, giá trị bảo lãnh ngân hàng.
* **Sheet Bảng giá dự thầu chi tiết:** Từng hạng mục công việc, mã hiệu, khối lượng, đơn giá, thành tiền dự thầu.
* **Sheet Bảng kê Tờ khai Hải quan & Chi tiết hàng hóa XNK:** Phân luồng xanh/vàng/đỏ, số tờ khai, vận đơn B/L, thuế XNK, thuế GTGT.
* **Sheet Bảng kê Viện phí BHYT & Chi tiết thuốc/DVKT:** Chi phí KCB, BHYT trả, bệnh nhân trả.
* **Sheet Hồ sơ & Tờ khai thuế:** Danh mục toàn bộ tờ khai 01/GTGT, BCTC, thông báo thuế, chữ ký số.

---

## Hướng dẫn sử dụng & Cài đặt

### Cách 1: Dùng trực tiếp không cần cài đặt
Bấm đúp file `index.html` để mở bằng Microsoft Edge hoặc Google Chrome. Kéo thả file XML/ZIP vào và xem/xuất Excel ngay lập tức.

### Cách 2: Cài đặt vào Windows (Bấm đúp file XML là tự mở)
1. Chạy file bộ cài đặt: `dong-goi\ban-phat-hanh\CaiDat-XemXmlThue-1.3.0.exe`.
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
  powershell -ExecutionPolicy Bypass -File dong-goi\dong-goi.ps1 -PhienBan 1.3.0
  ```
* **Chạy kiểm thử tự động toàn diện:**
  ```powershell
  python kiem-thu-8-nganh.py
  ```

---

*(C) August87 - 0982722036*
