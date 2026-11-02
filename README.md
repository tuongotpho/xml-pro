# XML-Pro — Trình xem & Trích xuất dữ liệu Chứng từ điện tử chuẩn Quốc gia

Ứng dụng Windows siêu nhẹ, độc lập, **100% offline**, thay thế hoàn hảo cho iTax Viewer và mở rộng thành **Trình đọc và xử lý chứng từ điện tử số 1 cho doanh nghiệp và kế toán tại Việt Nam** (hỗ trợ toàn diện 8 hệ sinh thái chứng từ điện tử).

Repository: [https://github.com/tuongotpho/xml-pro.git](https://github.com/tuongotpho/xml-pro.git)

---

## 🚀 Tính Năng Đột Phá Mới (Phiên bản v1.8.0)

### 1. Nạp Lười Siêu Tốc (Lazy-Loading Dictionary)
* **Khởi động tức thì < 50ms:** Tách toàn bộ 16.6 MB dữ liệu mẫu XSLT iTax (`mau-itax.js`) và từ điển chỉ tiêu HTKK (`ten-chi-tieu.js`) khỏi luồng tải đồng bộ ban đầu. Ứng dụng chỉ nạp động khi mở tờ khai thuế hoặc tải ngầm trong lúc rảnh rỗi.

### 2. Xác Thực Toàn Vẹn Chữ Ký Số XMLDSig Ngoại Tuyến (Offline Verification)
* **Kiểm tra toán học cấp trình duyệt:** Sử dụng Web Crypto API chuẩn quốc tế để tính toán lại giá trị băm DigestValue (SHA-256 / SHA-1) trên toàn bộ khối dữ liệu hóa đơn `<DLHDon>` và đối chiếu với chữ ký số của người bán & Cơ quan thuế.
* **Cảnh báo đỏ can thiệp dữ liệu:** Nếu file XML bị chỉnh sửa số tiền, thuế suất, ngày lập dù chỉ 1 ký tự sau khi ký số, hệ thống lập tức hiển thị cảnh báo: *"✖ CẢNH BÁO TOÀN VẸN: Dữ liệu bị can thiệp sau khi ký!"*.

### 3. Trợ Lý Đối Chiếu Kế Toán Thông Minh (Smart Audit Assistant)
* **Phát hiện hóa đơn nạp trùng lặp:** Tự động gom nhóm theo bộ ba `MST Bán + Ký hiệu + Số HĐ`, gắn huy hiệu cảnh báo `⚠️ TRÙNG (N)` trên danh sách và trong bảng điều hành.
* **Ghép cặp Hóa đơn Thay thế / Điều chỉnh:** Nhận diện trường `<TTHDLQuan>` để tự động liên kết HĐ điều chỉnh với HĐ gốc đang nạp trong tệp, tránh tính đúp doanh số.
* **Tra cứu Mã QR:** Trích xuất thẻ `<DLQRCode>` và hiển thị nút tra cứu nhanh 1-chạm tới Cổng thông tin HĐĐT của Tổng cục Thuế.

### 4. Mẫu Xuất Excel Chuẩn Kế Toán Việt Nam (MISA AMIS & HTKK TT80)
* Tự động sinh thêm 4 sheet chuyên biệt khi xuất Excel:
  * **Sheet MISA - Mua vào:** Cấu trúc cột chuẩn để Import thẳng vào chứng từ mua hàng MISA AMIS / SME.
  * **Sheet MISA - Bán ra:** Cấu trúc cột chuẩn để Import thẳng vào chứng từ bán hàng MISA AMIS / SME.
  * **Sheet Bảng kê 01-1_GTGT (Bán ra):** Định dạng chuẩn phụ lục 01-1/GTGT phân loại theo mức thuế suất.
  * **Sheet Bảng kê 01-2_GTGT (Mua vào):** Định dạng chuẩn phụ lục 01-2/GTGT tổng hợp thuế GTGT được khấu trừ.

---

## 🚀 Tính Năng Đột Phá & Bảo Mật Mới (Phiên bản v1.8.0)

### 1. Nâng cấp An toàn & Bảo mật Cao cấp (Security Hardened)
* **Bảo vệ phòng thủ cấp nhân Chromium:** Tích hợp `Content-Security-Policy` (CSP) nghiêm ngặt với `connect-src 'none'`, đảm bảo cam kết bảo mật 100% offline, tuyệt đối không gửi dữ liệu tài chính/thuế ra ngoài mạng.
* **Chống Command Injection & Path Traversal:** Công cụ đổi tên hàng loạt Smart File Renamer chuyển toàn diện sang chuỗi nguyên văn PowerShell `-LiteralPath` kết hợp bộ lọc Whitelist ký tự an toàn trên cả 8 định dạng chứng từ, loại bỏ hoàn toàn nguy cơ khai thác qua tên file hoặc nội dung XML độc hại.
* **Làm sạch chuẩn OpenXML:** Bộ sinh bảng kê Excel `.xlsx` tự động lọc bỏ các ký tự điều khiển bất hợp pháp trong XML 1.0, ngăn chặn triệt để lỗi crash file khi mở trên Microsoft Excel.

### 2. Duyệt Cây Thư Mục Thông Minh (Folder Tree View)
* **Nạp cả cây thư mục 1-chạm:** Chọn hoặc kéo thả thư mục tổng (chứa hàng trăm thư mục con các tháng, các phòng ban).
* **Sidebar dạng Explorer:** Tab `[📁 Cây thư mục]` trực quan với icon phân cấp `📂`, đóng/mở từng nhánh, hiển thị số lượng file và icon phân loại ngành của từng thư mục.
* **Lọc theo thư mục linh hoạt:** Click vào bất kỳ thư mục nhánh nào để lọc ngay danh sách file và cập nhật Dashboard theo đúng phạm vi thư mục đó. Thanh breadcrumb cho phép quay lại xem toàn bộ thư mục chỉ với 1 click `✖`.

### 3. Dashboard Động Thích Ứng Theo Ngữ Cảnh Chuyên Ngành (Adaptive Dashboard)
Tự động nhận diện loại chứng từ chiếm đa số trong thư mục đang duyệt để "biến hình" giao diện Dashboard phù hợp 100%:
* **Thư mục Hóa đơn & Thuế (`hd`):** Dashboard Doanh thu bán ra vs Chi phí mua vào, Thuế GTGT tạm tính (Phải nộp/Khấu trừ), Cơ cấu thuế suất (0%, 5%, 8%, 10%), Top 5 Khách hàng & Top 5 Nhà cung cấp, Hóa đơn cảnh báo rủi ro. Tự động phát hiện và cảnh báo hóa đơn chưa rõ phân loại để kế toán thiết lập MST.
* **Thư mục Hải quan & XNK (`hq`):** Dashboard Phân luồng kiểm tra (🟢 Luồng Xanh, 🟡 Luồng Vàng, 🔴 Luồng Đỏ), Tổng kim ngạch XNK, Nghĩa vụ thuế XNK và GTGT, Thống kê theo Chi cục & Loại hình XNK.
* **Thư mục Bệnh viện & BHYT (`yte`):** Dashboard Quỹ BHYT chi trả vs Bệnh nhân cùng chi trả vs Ngoài danh mục, Tỷ lệ Nội trú / Ngoại trú, Top nhóm bệnh ICD-10.
* **Thư mục Ngân hàng (`nh`):** Dashboard Sổ phụ & Dòng tiền, Dòng tiền ròng (Net Cashflow), Tổng thu (Ghi Có $+$) vs Tổng chi (Ghi Nợ $-$), khử trùng lặp số dư đầu kỳ/cuối kỳ theo từng số tài khoản khi nạp sao kê nhiều tháng.
* **Thư mục Nhân sự (`bhxh`, `tncn`):** Dashboard Lao động tham gia BHXH, Quỹ lương đóng bảo hiểm 32%, Thu nhập chịu thuế chi trả & Thuế TNCN đã khấu trừ.
* **Thư mục Đấu thầu (`thau`):** Dashboard Gói thầu E-HSDT, Tổng giá dự thầu, Hạn mức thư bảo lãnh ngân hàng.
* **Thư mục Tổng hợp Đa ngành:** Thẻ thống kê tổng quan các lĩnh vực và bảng tài liệu liên ngành.

---

## 🚀 Tính Năng Cho Kế Toán Doanh Nghiệp (Phiên bản v1.8.0)

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
* **2 hình thức xuất 1-click an toàn tuyệt đối:**
  1. **Tải file .ZIP đã đổi tên:** Đóng gói toàn bộ hóa đơn đã đổi tên vào 1 file ZIP sạch sẽ, an toàn tuyệt đối.
  2. **Tải Script PowerShell (.ps1):** Tải script về thư mục chứa hóa đơn trên máy, click chuột phải chọn *"Run with PowerShell"* để đổi tên trực tiếp hàng loạt file trên ổ cứng trong 1 giây (đã mã hóa chuỗi nháy đơn an toàn chống injection).

---

## 8 Nhóm Chứng từ & Định dạng Chuyên biệt Hỗ trợ

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
1. Chạy file bộ cài đặt: `dong-goi\ban-phat-hanh\CaiDat-XML-Pro-1.8.0.exe`.
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
  powershell -ExecutionPolicy Bypass -File dong-goi\dong-goi.ps1 -PhienBan 1.8.0
  ```
* **Chạy kiểm thử tự động toàn diện (3 bộ test Edge CDP):**
  ```powershell
  python kiem-thu-8-nganh.py
  python kiem-thu-ke-toan.py
  python kiem-thu-tree-dashboard.py
  ```

---

*(C) August87 - 0982722036*
