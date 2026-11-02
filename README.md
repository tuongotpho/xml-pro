# XML-Pro — Trình xem & trích xuất dữ liệu chứng từ điện tử (XML)

Ứng dụng Windows nhẹ, chạy **hoàn toàn trên máy, không cần mạng, không gửi dữ liệu đi đâu**. Đọc tờ khai thuế HTKK theo mẫu iTax Viewer, hoá đơn điện tử và một số loại chứng từ XML khác.

Repository: [https://github.com/tuongotpho/xml-pro.git](https://github.com/tuongotpho/xml-pro.git)

---

## Phiên bản 3.0.0 — phần mềm Windows thật (WebView2)

Chi tiết ở [07-BAO-CAO-VO-WEBVIEW2-V3.md](07-BAO-CAO-VO-WEBVIEW2-V3.md). Bản 2.0.4 (cửa sổ Edge) vẫn giữ ở thẻ git `v2.0.4`.

* `XML-Pro.exe` là cửa sổ Windows riêng nhúng **WebView2** (nhân Edge có sẵn trong Windows 10/11). Trang chạy ở địa chỉ nội bộ `https://xml-pro.example` (chỉ trỏ vào thư mục cài, không ra mạng) — **không còn chữ "file:///" và không còn popup hỏi quyền** khi chọn thư mục.
* "Chọn file…" / "Chọn thư mục…" dùng hộp thoại của Windows; trang chỉ đọc được đúng những tệp người dùng đã chọn, bấm đúp hoặc "Mở bằng".
* Chuột phải thư mục (hoặc vùng trống trong thư mục) → **"Mở bằng XML-Pro"**: nạp mọi .xml, .zip bên trong, giữ cấu trúc thư mục cho Explorer.
* Một cửa sổ duy nhất: mở thêm tệp / thư mục lúc nào cũng vào cửa sổ đang mở, thành tab mới. Xuất Excel / XML / .ps1: hộp "Lưu thành" của Windows. Liên kết ra ngoài (tra cứu trên cổng thuế) mở bằng trình duyệt mặc định.
* Máy chưa có WebView2 thì tự mở bằng cửa sổ Edge như 2.0.4. Bộ cài tăng 857 KB (3 thư viện WebView2 có chữ ký số của Microsoft).

## Phiên bản 2.0.4 — lập tờ khai 01/GTGT tháng / quý từ hoá đơn

Chi tiết ở [06-BAO-CAO-LAP-TO-KHAI-01GTGT.md](06-BAO-CAO-LAP-TO-KHAI-01GTGT.md).

* Nút **"📝 Lập tờ khai GTGT từ hoá đơn"** ở thanh bên — mẫu **01/GTGT** hoặc **04/GTGT** (trực tiếp trên doanh thu, chọn nhóm ngành 1% / 5% / 3% / 2% cho từng hoá đơn): chọn doanh nghiệp (MST — có sẵn danh sách mọi MST trong hoá đơn đã nạp, dùng được cho nhiều công ty), kỳ **tháng hoặc quý**; app cộng hoá đơn mua vào / bán ra, lập đủ chỉ tiêu và phụ lục giảm thuế NQ142, xuất **XML theo khuôn HTKK** (chưa ký số) để nạp HTKK / eTax.
* **Tờ khai bổ sung 01/GTGT** (bản 3.0.2): từ tờ khai đã nộp bị lệch hoá đơn, app tính lại và lập tờ khai bổ sung lần n kèm phụ lục **01/KHBS** và **01-1/KHBS** (khuôn lấy từ tệp bổ sung thật của HTKK và mẫu iTax), có ước tính tiền chậm nộp.
* Thông tin doanh nghiệp tự lấy từ tờ khai cũ đang nạp (hoặc lần lập trước trên máy, hoặc hoá đơn); [22] tự lấy = [43] tờ khai lần đầu kỳ trước nếu có nạp; các chỉ tiêu không có trong hoá đơn ([21], [23a], [24a], [37], [38], [39a], [40b], [42]) nhập tay, xem trước số liệu ngay.
* Quy tắc tính chuyển từ app khai thuế (đã khớp tờ khai HTKK nộp thật) và dùng chung cách chọn hoá đơn với phần đối chiếu. Đo: lập lại tờ khai quý 3/2026 thật từ hoá đơn → trùng 109/109 ô dữ liệu.

## Phiên bản 2.0.3 — đối chiếu tờ khai 01/GTGT với hoá đơn và giấy nộp tiền

Chi tiết ở [05-BAO-CAO-DOI-CHIEU-TO-KHAI-HOA-DON.md](05-BAO-CAO-DOI-CHIEU-TO-KHAI-HOA-DON.md).

* Nạp cùng lúc tờ khai 01/GTGT, hoá đơn mua vào / bán ra (XML hoặc .zip) và giấy nộp tiền → app tự ghép theo **MST + kỳ (tháng hoặc quý)** của từng tờ khai, nên dùng được cho **nhiều công ty** (kế toán dịch vụ).
* So từng chỉ tiêu [23] [24] [26] [29]–[35] [32a] với tổng cộng từ hoá đơn; so **phụ lục giảm thuế NQ142 theo từng đối tác**; kiểm 11 công thức số học trong tờ khai; kiểm **[22] = [43] tờ khai lần đầu kỳ trước** (nếu có nạp); kiểm **số phải nộp [40] = số đã nộp** theo giấy nộp tiền (tiểu mục 1701).
* Lệch thì chỉ đích danh hoá đơn nghi ngờ ("HĐ C26TNV-29 ngày 24/08/2026 có đúng 73.301.000 đ — có thể chưa kê"), bấm vào là mở hoá đơn đó.
* Hiện ở 3 chỗ: khung "🔎 Đối chiếu với hoá đơn đã nạp" trên tờ khai (tự mở khi lệch), bảng tổng hợp mọi tờ khai trên Dashboard, nhãn **KHỚP HĐ / LỆCH HĐ** ở danh sách. Xuất Excel có thêm sheet "Đối chiếu tờ khai GTGT".

## Phiên bản 2.0.2 — tờ khai mở từng thẻ như iTax Viewer

Chi tiết ở [04-BAO-CAO-RA-SOAT-GIAO-DIEN-THE-ITAX.md](04-BAO-CAO-RA-SOAT-GIAO-DIEN-THE-ITAX.md).

* **Sửa lỗi nặng của 2.0.0:** tờ khai / BCTC không dựng được theo mẫu iTax (lỗi `ITAX is not defined`), mọi tờ khai rơi về danh sách mã chỉ tiêu thô.
* **Mỗi biểu một thẻ** (tờ khai chính, từng phụ lục) như iTax Viewer: thanh thẻ dính đầu trang khi cuộn, `Ctrl + PageUp / PageDown` để chuyển biểu, nút "In biểu này" và "In tất cả N biểu" (mỗi biểu sang trang mới).
* **Bộ mẫu iTax cập nhật tới XSLT 3.0.9** (trích từ iTax Viewer cài trên máy ngày 02/11/2026): có BCTC TT99/2025 và TT58/2026. Mẫu nào bộ iTax chưa có thì vẫn có đủ thẻ, dựng dự phòng theo mã chỉ tiêu và ghi rõ là dự phòng.
* Tờ khổ cố định tự co cho vừa khung (trước bị cắt mép phải trên màn hình hẹp). Chế độ tối hết chỗ chữ trắng trên nền trắng.

## Phiên bản 2.0.1 — sửa lỗi của 2.0.0

Chi tiết lỗi và cách đo ở [01-BAO-CAO-RA-SOAT-TOAN-DIEN-V2.md](01-BAO-CAO-RA-SOAT-TOAN-DIEN-V2.md), kế hoạch ở [02](02-BAO-CAO-KE-HOACH-SUA-LOI-V2.md), kết quả ở [03](03-BAO-CAO-KET-QUA-SUA-LOI-V2.md).

* **Kiểm chữ ký số đúng:** 2.0.0 báo "bị sửa đổi" với cả hoá đơn thật. Nay kiểm cả vân tay dữ liệu lẫn chữ ký trong chứng thư; đo trên 6 hoá đơn mẫu: 12/12 chữ ký khớp kết quả kiểm của Windows (.NET).
* **Bỏ máy chủ nội bộ** của 2.0.0 (tắt sau vài giây và để ngỏ cho trang web lạ đọc/đổi tên tệp). Quay về cách mở tệp của 1.7.x.
* **Gỡ "Trung tâm cập nhật"** (không kiểm được bản mới thật). Thêm nút **"Xoá dữ liệu phiên"** trong hộp Giới thiệu.
* **Script đổi tên `.ps1`** đổi được tệp có tên tiếng Việt, không ghi đè tệp trùng tên, báo rõ số tệp đã đổi / bỏ qua / lỗi.
* Khôi phục chữ tiếng Việt bị lỗi bảng mã trong giao diện.

---

## Tính năng chính

### 1. Kiểm chữ ký số ngay trên máy
* Băm lại phần dữ liệu đã ký (C14N, SHA-1/256/384/512) và so với `DigestValue`; kiểm `SignatureValue` trên khối `SignedInfo` bằng khoá công khai trong chứng thư số (RSA hoặc ECDSA) qua Web Crypto.
* Ba mức: **✔ hợp lệ** · **✖ dữ liệu bị sửa đổi sau khi ký** (kể cả khi người sửa tính lại vân tay) · **ⓘ không kiểm tra được** (thuật toán chưa hỗ trợ). Cảnh báo vàng nếu thời điểm ký nằm ngoài hạn chứng thư.
* **Không** kiểm chứng thư có bị thu hồi hay không (việc đó cần mạng) — muốn chắc chắn thì tra trên cổng thuế điện tử.

### 2. Nạp lười bộ mẫu iTax / HTKK
* `mau-itax.js` và `ten-chi-tieu.js` (khoảng 16,6 MB) chỉ nạp khi mở tờ khai thuế hoặc nạp ngầm lúc rảnh, nên mở hoá đơn nhanh.

### 3. Trợ lý đối chiếu kế toán
* **Hoá đơn nạp trùng:** gom theo `MST bán + Ký hiệu + Số HĐ`, gắn cảnh báo `⚠️ TRÙNG (N)`.
* **Hoá đơn thay thế / điều chỉnh:** đọc `<TTHDLQuan>` để liên kết với hoá đơn gốc đang nạp.
* **Tra cứu mã QR:** đọc `<DLQRCode>`, có nút tra cứu trên cổng hoá đơn điện tử.

### 4. Xuất Excel cho kế toán
* Thêm các sheet: MISA - Mua vào, MISA - Bán ra, Bảng kê 01-1/GTGT, Bảng kê 01-2/GTGT. *(Chưa thử nhập thật vào MISA.)*
* Lọc ký tự điều khiển không hợp lệ trong XML 1.0 để tệp `.xlsx` không lỗi khi mở bằng Excel.

### 5. An toàn dữ liệu
* `Content-Security-Policy` với `connect-src 'self'`: trang không gọi được máy chủ bên ngoài.
* Mọi nội dung từ tệp XML và tên tệp đều được lọc ký tự trước khi hiện (đo: thay mọi ô chữ của 12 tệp mẫu bằng mã độc → 0 lần chạy).
* Dữ liệu lưu trên máy: phiên làm việc gần nhất (nội dung các tệp đã nạp, trong IndexedDB của trình duyệt) và lịch sử tệp đã mở. Xoá bằng nút "🗑 Xoá dữ liệu phiên" trong hộp Giới thiệu.

### 6. Duyệt Cây Thư Mục Thông Minh (Folder Tree View)
* **Nạp cả cây thư mục 1-chạm:** Chọn hoặc kéo thả thư mục tổng (chứa hàng trăm thư mục con các tháng, các phòng ban).
* **Sidebar dạng Explorer:** Tab `[📁 Cây thư mục]` trực quan với icon phân cấp `📂`, đóng/mở từng nhánh, hiển thị số lượng file và icon phân loại ngành của từng thư mục.
* **Lọc theo thư mục linh hoạt:** Click vào bất kỳ thư mục nhánh nào để lọc ngay danh sách file và cập nhật Dashboard theo đúng phạm vi thư mục đó. Thanh breadcrumb cho phép quay lại xem toàn bộ thư mục chỉ với 1 click `✖`.

### 7. Dashboard Động Thích Ứng Theo Ngữ Cảnh Chuyên Ngành (Adaptive Dashboard)
Tự động nhận diện loại chứng từ chiếm đa số trong thư mục đang duyệt để "biến hình" giao diện Dashboard phù hợp 100%:
* **Thư mục Hóa đơn & Thuế (`hd`):** Dashboard Doanh thu bán ra vs Chi phí mua vào, Thuế GTGT tạm tính (Phải nộp/Khấu trừ), Cơ cấu thuế suất (0%, 5%, 8%, 10%), Top 5 Khách hàng & Top 5 Nhà cung cấp, Hóa đơn cảnh báo rủi ro. Tự động phát hiện và cảnh báo hóa đơn chưa rõ phân loại để kế toán thiết lập MST.
* **Thư mục Hải quan & XNK (`hq`):** Dashboard Phân luồng kiểm tra (🟢 Luồng Xanh, 🟡 Luồng Vàng, 🔴 Luồng Đỏ), Tổng kim ngạch XNK, Nghĩa vụ thuế XNK và GTGT, Thống kê theo Chi cục & Loại hình XNK.
* **Thư mục Bệnh viện & BHYT (`yte`):** Dashboard Quỹ BHYT chi trả vs Bệnh nhân cùng chi trả vs Ngoài danh mục, Tỷ lệ Nội trú / Ngoại trú, Top nhóm bệnh ICD-10.
* **Thư mục Ngân hàng (`nh`):** Dashboard Sổ phụ & Dòng tiền, Dòng tiền ròng (Net Cashflow), Tổng thu (Ghi Có $+$) vs Tổng chi (Ghi Nợ $-$), khử trùng lặp số dư đầu kỳ/cuối kỳ theo từng số tài khoản khi nạp sao kê nhiều tháng.
* **Thư mục Nhân sự (`bhxh`, `tncn`):** Dashboard Lao động tham gia BHXH, Quỹ lương đóng bảo hiểm 32%, Thu nhập chịu thuế chi trả & Thuế TNCN đã khấu trừ.
* **Thư mục Đấu thầu (`thau`):** Dashboard Gói thầu E-HSDT, Tổng giá dự thầu, Hạn mức thư bảo lãnh ngân hàng.
* **Thư mục Tổng hợp Đa ngành:** Thẻ thống kê tổng quan các lĩnh vực và bảng tài liệu liên ngành.

---

## Tính năng cho kế toán doanh nghiệp

Dành riêng cho các chuyên viên kế toán xử lý hàng nghìn hóa đơn đầu vào - đầu ra mỗi tháng:

### 1. Tự động Phân loại Hóa đơn Mua vào (Đầu vào) / Bán ra (Đầu ra) / Chưa rõ
* **Nhận diện theo MST Doanh nghiệp:** Chỉ cần nhập Mã số thuế công ty của bạn một lần, ứng dụng tự động lưu trên máy và đối chiếu với mọi hóa đơn XML:
  * Trùng MST người bán $\rightarrow$ Gán nhãn **📤 BÁN RA (ĐẦU RA)**.
  * Trùng MST người mua $\rightarrow$ Gán nhãn **📥 MUA VÀO (ĐẦU VÀO)**.
  * Không trùng cả hai $\rightarrow$ Gán nhãn **❓ CHƯA RÕ** kèm thanh cảnh báo hướng dẫn cài đặt MST, tránh sai lệch nghĩa vụ thuế.
* **Tự nhận diện theo cấu trúc thư mục:** Nếu chưa cài MST hoặc xử lý file lưu trong các thư mục có tên `mua`, `ban`, `dauvao`, `daura`, `in`, `out`... app tự động phân loại thông minh.
* Huy hiệu (Badge) trực quan trên danh sách file và ngay góc trên bên trái tờ hóa đơn điện tử.

### 2. Mini-Dashboard Kế toán & Bộ lọc Nhanh
* **Mini-Dashboard tính toán tức thời:**
  * Thống kê tổng số lượng hóa đơn, tổng doanh thu & tiền thuế GTGT **Bán ra**.
  * Thống kê tổng số lượng hóa đơn, tổng chi phí tiền hàng & tiền thuế GTGT **Mua vào**.
  * **Chênh lệch thuế GTGT tạm tính:** Tự động tính `Thuế đầu ra - Thuế đầu vào`. Hiển thị màu đỏ nổi bật nếu phát sinh thuế GTGT phải nộp, hoặc màu xanh nếu thuế GTGT còn được khấu trừ chuyển kỳ sau.
  * Thống kê phân bổ theo thuế suất chính xác đến từng mặt hàng thực tế.
* **Bộ lọc nhanh 1-chạm:**
  * `[Tất cả]` · `[📥 Mua vào (N)]` · `[📤 Bán ra (N)]` · `[⚠ Cần chú ý (N)]` (lọc nhanh các hóa đơn có cảnh báo lệch tiền, thiếu MCCQT, hóa đơn điều chỉnh/thay thế...).

### 3. Đổi tên File Hàng loạt Chuẩn Kế toán (Smart File Renamer)
* Giải quyết triệt để vấn đề file hóa đơn tải về từ các nhà mạng (VNPT, Viettel, MISA, BKAV...) bị đặt tên lộn xộn khó tra cứu (`hdon_1234.xml`, `invoice.xml`, chuỗi GUID...).
* Chuẩn hóa tự động sang định dạng kế toán chuẩn:
  ```text
  [Loai]_[YYYYMMDD]_[MSTDoiTac]_[TenDoiTac]_[KyHieu]_[SoHD].xml
  Ví dụ: Mua_20261008_2601102955_RENTECH_C26TNA_0000017.xml
         Ban_20261015_0100112437_PETROLIMEX_1C26TAA_0000099.xml
  ```
* Xem trước bảng đối chiếu tên cũ $\rightarrow$ tên mới, tích chọn từng file linh hoạt.
* **2 cách lấy kết quả:**
  1. **Tải tệp .ZIP đã đổi tên:** gói các hoá đơn với tên mới vào một tệp ZIP; tệp gốc trên máy giữ nguyên.
  2. **Tải script PowerShell (.ps1):** chép script vào thư mục chứa hoá đơn, chuột phải → *Run with PowerShell*. Script có BOM UTF-8 nên đổi được tên tiếng Việt có dấu; **không ghi đè** tệp đã có cùng tên; cuối script báo số tệp đã đổi / bỏ qua / lỗi. Nếu Windows chặn tệp tải về: chuột phải → Properties → Unblock.

---

## 8 Nhóm Chứng từ & Định dạng Chuyên biệt Hỗ trợ

> Lưu ý: tờ khai thuế và hoá đơn đã chạy với tệp thật. Các nhóm hải quan, BHXH, BHYT, ngân hàng, đấu thầu, TNCN mới kiểm bằng **tệp mẫu tự soạn** trong `mau-xml\` — định dạng tệp thật của từng ngành có thể khác.

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
1. Chạy file bộ cài đặt: `dong-goi\ban-phat-hanh\CaiDat-XML-Pro-<phiên bản>.exe` (vd `CaiDat-XML-Pro-2.0.1.exe`).
2. Bấm **Có** để cài đặt vào `%LOCALAPPDATA%\Programs\XemXmlThue` (không cần quyền Admin).
3. Đặt làm ứng dụng mặc định cho đuôi file `.xml` khi được Windows hỏi.
4. Mở thêm tệp lúc nào cũng thành **tab mới** trong cửa sổ đang mở. Muốn có bản mới: cài đè bộ cài mới (không có cập nhật tự động).

---

## Đóng gói & Phát triển

Yêu cầu môi trường: Windows 10/11 có sẵn .NET Framework 4.0+ (không cần cài thêm công cụ).

* **Chạy thử bản nguồn:**
  ```powershell
  powershell -ExecutionPolicy Bypass -File dong-goi\chay-thu.ps1 "C:\duong\dan\file.xml"
  ```
* **Đóng gói phiên bản mới (.exe):**
  ```powershell
  powershell -ExecutionPolicy Bypass -File dong-goi\dong-goi.ps1            # tự tăng số phiên bản
  ```
* **Chạy kiểm thử tự động (Edge chạy ngầm; cần Python + `websocket-client`, `lxml`):** mỗi bộ thoát mã lỗi khác 0 nếu hỏng.
  ```powershell
  python kiem-thu-sua-loi.py          # 15 mục: chữ ký số (đối chiếu .NET), bảng mã, máy chủ, .ps1, xoá phiên
  python kiem-thu-8-nganh.py
  python kiem-thu-ke-toan.py
  python kiem-thu-tree-dashboard.py
  python kiem-thu-giai-doan-3.py
  ```

---

*(C) August87 - 0982722036*
