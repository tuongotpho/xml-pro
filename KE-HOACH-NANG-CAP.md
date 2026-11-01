# KẾ HOẠCH NÂNG CẤP VÀ TÍNH NĂNG TƯƠNG LAI — XML-PRO

Tài liệu này lưu trữ toàn bộ các ý tưởng, kiến trúc và lộ trình tính năng nâng cấp tiếp theo cho **XML-Pro** để triển khai trong các phiên bản kế tiếp.

---

## 1. Bộ công cụ Đối soát & Phát hiện rủi ro (Audit & Reconciliation Engine)
* **Ý nghĩa:** Biến XML-Pro từ một trình xem đơn thuần thành trợ lý kiểm toán số thông minh cho kế toán doanh nghiệp.
* **Các tính năng cụ thể:**
  1. **Đối soát chéo Tờ khai thuế GTGT (01/GTGT) với Bảng kê Hóa đơn:**
     * Nạp đồng thời file Tờ khai 01/GTGT và thư mục/file zip chứa hóa đơn mua vào - bán ra.
     * Tự động so khớp:
       * Tổng tiền bán ra & tiền thuế có khớp với chỉ tiêu `[27]`, `[28]` trên tờ khai?
       * Tổng tiền mua vào & thuế có khớp với chỉ tiêu `[23]`, `[24]`, `[25]`?
     * Xuất bảng báo cáo lệch màu đỏ/xanh, liệt kê rõ các hóa đơn bị bỏ sót hoặc kê khai thừa.
  2. **Kiểm tra rủi ro Hóa đơn đầu vào (Automated Invoice Risk Auditor):**
     * **Cảnh báo trùng lặp:** Quét phát hiện các hóa đơn bị nạp trùng lặp (cùng Số HĐ + Ký hiệu + MST người bán) để tránh kê khai khấu trừ 2 lần.
     * **Cảnh báo lệch ngày ký số:** Phát hiện ngày ký số lệch quá xa ngày lập hóa đơn (nguy cơ bị cơ quan thuế phạt xuất hóa đơn lùi ngày).
     * **Cảnh báo sai lệch số học:** Hóa đơn có `Tiền hàng + Tiền thuế != Tổng thanh toán` (do làm tròn sai hoặc chiết khấu ẩn).
     * **Cảnh báo hóa đơn hủy / điều chỉnh:** Tự động kết nối hóa đơn gốc với hóa đơn điều chỉnh/thay thế đi kèm.

---

## 2. Tìm kiếm sâu nội dung & Bộ lọc thông minh (Deep Search & Smart Filter)
* **Ý nghĩa:** Tối ưu hiệu năng làm việc khi người dùng mở hàng trăm đến hàng nghìn file XML cùng lúc.
* **Các tính năng cụ thể:**
  1. **Tìm kiếm toàn văn (Deep Search):**
     * Cho phép gõ tìm bất kỳ từ khóa nào nằm sâu trong nội dung file:
       * Tìm tên mặt hàng (ví dụ: *"ThinkPad"*, *"Xi măng"*, *"Thép Hòa Phát"*).
       * Tìm tên biệt dược / dịch vụ y tế (ví dụ: *"Nexium"*, *"Nội soi"*).
       * Tìm mã HS Hải quan (ví dụ: *"84713020"*).
       * Tìm theo số tiền chính xác hoặc khoảng tiền.
       * Tìm theo số tài khoản ngân hàng hoặc nội dung chuyển tiền.
     * App quét tức thì trong RAM và làm nổi bật các file khớp từ khóa.
  2. **Bộ lọc theo ngành & phân loại:**
     * Thanh lọc trên sidebar: `[Tất cả]` · `[Hóa đơn]` · `[Thuế]` · `[Hải quan]` · `[Y tế]` · `[TNCN]` · `[BHXH]` · `[Ngân hàng]` · `[Đấu thầu]`.
     * Lọc hóa đơn theo tình trạng: `[Đã thanh toán]` vs `[Chưa thanh toán]`.
     * Sắp xếp danh sách: Mới nhất → Cũ nhất, Giá trị tiền lớn nhất → Nhỏ nhất.

---

## 3. Cơ chế Cập nhật tự động 1-Click (Auto-Updater via GitHub Releases)
* **Ý nghĩa:** Người dùng luôn có bản cập nhật mới nhất mà không cần cài đặt lại thủ công.
* **Cơ chế triển khai:**
  1. App kiểm tra phiên bản mới qua GitHub API `https://api.github.com/repos/tuongotpho/xml-pro/releases/latest`.
  2. Nếu có bản mới (ví dụ v1.3.1), hiển thị badge thông báo nhẹ ở góc màn hình.
  3. Bấm nút *"Cập nhật ngay"*: App tự động tải file `CaiDat-XemXmlThue-<version>.exe` về thư mục `%TEMP%` và thực thi lệnh cài đặt im lặng (`/quiet`) để nâng cấp đè trong `%LOCALAPPDATA%\Programs\XemXmlThue`.

---

## 4. Báo cáo tổng hợp Dashboard & Đồ thị trực quan
* Biểu đồ doanh thu - chi phí - tiền thuế theo tháng từ toàn bộ hóa đơn đã mở.
* Thống kê top 10 nhà cung cấp lớn nhất, top 10 khách hàng lớn nhất.
* Đồ thị phân luồng hàng hóa Hải quan (tỷ lệ Xanh / Vàng / Đỏ).

---

## 5. Lộ trình Chuyên biệt Phục vụ Kế toán Doanh nghiệp & Kế toán Thuế
*Các tính năng được đề xuất và ghi nhớ để phát triển tiếp theo sau phiên bản v1.4.0:*

### 5.1. Tự Động Lập "Bản Nháp Tờ Khai 01/GTGT" Tạm Tính (Tính năng 2)
* **Ý nghĩa:** Giúp kế toán và chủ doanh nghiệp biết ngay số thuế GTGT phải nộp chỉ sau 3 giây nạp thư mục hóa đơn.
* **Quy tắc tính toán chỉ tiêu:**
  * **Chỉ tiêu [23], [24], [25]:** Tổng giá trị hàng hóa, dịch vụ mua vào và thuế GTGT đầu vào đủ điều kiện khấu trừ.
  * **Chỉ tiêu [26], [29], [30], [32]:** Doanh thu bán ra chưa thuế phân bổ theo các mức thuế suất: Không chịu thuế, 0%, 5%, 8% (giảm thuế NQ), 10%.
  * **Chỉ tiêu [27], [28], [31], [33]:** Tổng thuế GTGT bán ra.
  * **Chỉ tiêu [40] / [43]:** Cân đối thuế:
    $$\text{Thuế phải nộp [40]} = \text{Thuế bán ra [28]} - \text{Thuế mua vào [25]}$$
    Nếu âm $\rightarrow$ chuyển sang Thuế còn được khấu trừ kỳ sau **[43]**.
* **Xuất file XML nạp thẳng vào HTKK:** Tự động sinh file XML chuẩn cấu trúc `01/GTGT` của Tổng cục Thuế để nạp ngay vào ứng dụng HTKK.

### 5.2. Bộ lọc "Rủi Ro & Bẫy Thuế" Nâng cao (Tính năng 3)
* **Cảnh báo ký lùi ngày / trễ quý:** Hóa đơn lập ngày cuối quý nhưng đối tác ký số sang quý sau (nguy cơ bị cơ quan thuế loại khấu trừ).
* **Cảnh báo sai lệch số học:** Kiểm tra tự động từng dòng hàng `Đơn giá × Số lượng - Chiết khấu = Thành tiền` và `Thành tiền × Thuế suất = Tiền thuế` (báo động khi sai lệch làm tròn $> 50$ đồng).
* **Cảnh báo hóa đơn điều chỉnh / thay thế:** Liên kết mã số và hiển thị cây quan hệ giữa HĐ gốc và HĐ thay thế/điều chỉnh, tránh kế toán kê khai sót hoặc trùng 2 lần.
* **Đối chiếu danh sách đen Doanh nghiệp bỏ trốn / Tạm ngừng kinh doanh:** Tra cứu cảnh báo các MST bán hàng có rủi ro cao.

### 5.3. Xuất Bảng Kê Chuẩn Nhập Vào Phần Mềm Kế Toán (Tính năng 4)
* **MISA SME / MISA AMIS:** Xuất file Excel đúng chuẩn cấu trúc cột để kế toán vào MISA chọn *Tệp $\rightarrow$ Nhập khẩu từ Excel* là vào thẳng chứng từ mua/bán hàng.
* **Fast Accounting / Bravo / Asia:** Bảng kê tương thích các trường dữ liệu kế toán thông dụng.
* **Bảng kê công nợ đối tác:** Tự động gom nhóm theo từng Nhà cung cấp / Khách hàng để kế toán đối chiếu công nợ cuối kỳ.

---

*(Đã triển khai trong v1.4.0: Tính năng 1 - Tự phân loại Mua/Bán theo MST công ty; Tính năng 5 - Bộ công cụ Đổi tên file chuẩn hóa kế toán hàng loạt; Tính năng 6 - Bộ lọc nhanh & Mini Dashboard tài chính Mua/Bán/Cân đối thuế).*

*(Ghi nhận vào hệ thống bộ nhớ XML-Pro ngày 02/11/2026)*

