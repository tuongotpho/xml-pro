# KẾ HOẠCH TÁI CẤU TRÚC TOÀN DIỆN (MỨC 2) — PHẦN MỀM KẾ TOÁN, HÓA ĐƠN & THUẾ CHUYÊN NGHIỆP (V4)

*Ngày lập: 08/11/2026 · Nền tảng xuất phát: XML-Pro v3.0.8 (`c3dc342`)*
*Mục tiêu: Chuyển đổi triệt để từ giao diện "Trình đọc tệp XML lẻ đa ngành" sang **Phần mềm Quản lý Hóa đơn – Kế toán – Thuế Đa doanh nghiệp** chuẩn Desktop chuyên nghiệp, tốc độ tức thì, 100% xử lý cục bộ trên máy.*

---

## 1. Định vị Sản phẩm & 5 Nguyên tắc Kiến trúc Bất biến

1. **Định vị thuần Kế toán – Hóa đơn – Thuế:**
   - Lấy **Doanh nghiệp / Hộ kinh doanh (`MST`) + Kỳ tính thuế (`Năm / Quý / Tháng`)** làm trung tâm điều hướng thay vì lấy "danh sách tệp đang kéo thả" làm trung tâm.
   - Phục vụ tối ưu cả **Kế toán nội bộ 1 công ty** lẫn **Đại lý thuế / Kế toán dịch vụ quản lý 10–50 MST** trên cùng một máy.
   - Giữ ngầm bộ giải mã XML phụ trợ (`nganh-doc.js`) để không lỗi khi người dùng mở tệp lạ ở phân hệ đọc XML, nhưng **gỡ bỏ hoàn toàn thông tin giới thiệu 9 ngành (Y tế BHYT, Đấu thầu, Hải quan…)** khỏi màn hình chính và điều hướng.
2. **An toàn & Ngoại tuyến 100% (Offline-First):**
   - Giữ nguyên chính sách `Content-Security-Policy` khóa mạng của trang (`connect-src 'self' https://tep.xml-pro.example`), vỏ Windows `WebView2` (`VoWebView2.cs`) biên dịch bằng `csc.exe` có sẵn trên Windows.
   - Chỉ kết nối trực tiếp Cổng Thuế (`hoadondientu.gdt.gov.vn`) khi người dùng chủ động mở khung tải hóa đơn (không lưu mật khẩu, không qua máy chủ trung gian).
3. **Bảo toàn 100% Lõi Nghiệp vụ đã kiểm chứng (`45/45` test):**
   - Giữ nguyên độ chính xác của các mô-đun cốt lõi: kiểm tra chữ ký số XMLDSig (`verifySig` khớp `.NET SignedXml`), dựng tờ khai XSLT `iTax Viewer` (`mau-itax.js`), đối chiếu tờ khai `01/GTGT` (`doi-chieu.js`), lập tờ khai `01/GTGT` / `04/GTGT` / `01/CNKD` / `KHBS` (`lap-to-khai.js`), tính thuế TNDN Luật 67/2025/QH15 (`dashboard-ke-toan.js`), kiểm toán 4 nhóm rủi ro HĐ & xuất MISA tự học định khoản (`kiem-toan-misa.js`), khóa sổ & ghi chú (`so-tay.js`).
4. **Chuẩn Thẩm mỹ Phần mềm Kế toán Chuyên nghiệp:**
   - **Mặc định Giao diện Sáng (Light Mode)** nền đặc sắc nét (`#ffffff` / `#f8fafc`, không nền mờ trong suốt `backdrop-filter`), hỗ trợ Chế độ Tối tương phản $\ge 3:1$.
   - **Không Emoji (`0 emoji`) trên toàn bộ ứng dụng:** thay toàn bộ biểu tượng cảm xúc ở thanh bên, nút bấm, hộp thoại bằng hệ thống **SVG Icon nét mảnh đồng bộ (`16px` / `18px`)**.
   - **Mật độ hiển thị chuẩn bảng tính:** dòng bảng gọn `28–30px`, phông số `font-variant-numeric: tabular-nums` thẳng hàng chữ số tuyệt đối, hộp thoại bảng kê rộng toàn khung (`96vw`).
5. **Đóng gói gọn nhẹ không phụ thuộc Node Bundler:**
   - Tách mô-đun `.css` / `.js` sạch sẽ nhưng nạp trực tiếp không cần Webpack/Vite để giữ quy trình biên dịch 1 lệnh bằng PowerShell + `csc.exe` (`dong-goi\dong-goi.ps1`).

---

## 2. Kiến trúc Khung Giao diện Mới (App Shell Mức 2)

### 2.1. Sơ đồ bố cục tổng thể

```text
+--------------------------------------------------------------------------------------------------+
| [Logo] TÊN APP   [Công ty: 2601102955 - TNHH TM NGA ANH PHÚ THỌ v] [Kỳ: Năm 2026 | Quý 4 v]      |
|                  [+ Nạp XML/ZIP] [Tải Cổng Thuế] [Xuất MISA/Excel v] [Tìm Ctrl+K] [Sáng/Tối]     |
+--------------------+---------------------------------------------+-------------------------------+
| ĐIỀU HƯỚNG (210px) | KHUNG NGHIỆP VỤ CHÍNH (Co giãn 100%)        | NGĂN XEM NHANH (500px, ẩn/mở) |
| (Thu gọn 52px      |                                             |                               |
|  bằng Ctrl+B)      |  - Thẻ chỉ số KPI chuẩn xác                 |  [Bản thể hiện Hóa đơn A4]    |
|                    |  - Bảng dữ liệu mật độ cao (28px/dòng)      |  - Trạng thái Chữ ký số       |
| 1. Danh bạ Công ty |  - Bộ lọc nhanh theo trạng thái / rủi ro    |  - Cảnh báo Kiểm toán         |
| 2. Tổng quan Thuế  |                                             |  - Ô Ghi chú & Đánh dấu       |
| 3. Sổ Hóa đơn      |                                             |  - Phím [↑] [↓] duyệt liên    |
| 4. Kiểm toán Rủi ro|                                             |    tiếp không mất bảng lọc    |
| 5. Tờ khai & Đ.Chiếu                                             |                               |
| 6. Xuất MISA & BK  |                                             |                               |
| 7. Đọc XML & CKS   |                                             |                               |
+--------------------+---------------------------------------------+-------------------------------+
```

### 2.2. Chi tiết 3 thành phần đột phá của App Shell

1. **Thanh Ngữ cảnh Toàn cục (`Global Topbar` — cao `48px`, cố định trên cùng):**
   - **Bộ chọn Công ty toàn cục (`#ctxMst`):** Hiển thị `MST — Tên doanh nghiệp / Hộ KD`. Khi chuyển công ty tại đây, toàn bộ các phân hệ (*Tổng quan Thuế, Sổ Hóa đơn, Kiểm toán, Tờ khai, Xuất MISA*) tự động chuyển dữ liệu sang đúng công ty đó (xóa bỏ tình trạng 4 ô chọn MST rời rạc như bản v3).
   - **Bộ chọn Kỳ làm việc toàn cục (`#ctxNam`, `#ctxKy`):** Chọn nhanh `Cả năm` / `Quý 1..4` / `Tháng 01..12`.
   - **Cụm nút Hành động nhanh:** `+ Nạp XML / Thư mục` (thay cho khung nét đứt chiếm chỗ cũ), `Tải HĐ Cổng Thuế`, `Xuất nhanh ▾` (Bảng kê Excel tổng hợp / Xuất MISA / Đổi tên file hàng loạt), `Tìm kiếm toàn cục (Ctrl+K)`.

2. **Thanh Điều hướng 7 Phân hệ (`Sidebar Rail` — đóng/mở `210px ↔ 52px` bằng `Ctrl+B`):**
   - **Phân hệ 1 — `Danh bạ Công ty` (Workspace Launcher):** Thay thế hoàn toàn màn hình chào `#homeEmpty` cũ. Hiển thị lưới thẻ các Doanh nghiệp / Hộ KD đang quản lý trên máy: MST, tên đơn vị, tổng số HĐ Mua/Bán, trạng thái tờ khai kỳ gần nhất, số cảnh báo rủi ro tồn đọng, nút bấm 1 chạm vào làm việc ngay hoặc tải bù hóa đơn Cổng Thuế.
   - **Phân hệ 2 — `Tổng quan Thuế & Lợi nhuận`:** Kế thừa và tối ưu không gian rộng của Dashboard 2 mảng cốt lõi:
     - *Thuế GTGT:* Sổ kê khai theo kỳ (gập/mở năm), trạng thái Khóa sổ, Đối chiếu tờ khai, Lập tờ khai nhanh.
     - *Thuế TNDN & Lợi nhuận sau thuế:* Bảng tính KQKD Quý 1..4 & Cả năm (15%/17%/20% Luật 67/2025/QH15), bù lỗ tự động, điều chỉnh `[B4]` / `[C3]`.
   - **Phân hệ 3 — `Sổ Hóa đơn Mua / Bán`:** Hợp nhất `Kho hóa đơn` và bảng chi tiết hóa đơn thành một sổ tra cứu duy nhất tốc độ cao ($\ge 50.000$ HĐ): lọc Mua vào / Bán ra / Máy tính tiền / Hóa đơn thay thế – điều chỉnh / Đã hạch toán / Đã thanh toán; thống kê Top Khách hàng & Nhà cung cấp.
   - **Phân hệ 4 — `Kiểm toán Rủi ro Thuế`:** Màn hình chuyên biệt dành cho kế toán trưởng rà soát trước kỳ quyết toán/thanh tra:
     - 4 nhóm rủi ro hiện có (Ký lệch ngày/vắt kỳ, Tiền mặt $\ge 5$tr & cộng dồn cùng ngày, Thủng dải số bán ra, Sai tên/ĐC/MST người mua) + Đối soát lệch Cổng Thuế.
     - Sẵn sàng gắn thêm Nhóm 3 (Chứng từ ngân hàng UNC) và Nhóm 5 (Xuất khống trước ngày nhập).
   - **Phân hệ 5 — `Tờ khai & Đối chiếu HTKK`:** Quản lý tập trung toàn bộ tệp tờ khai (`01/GTGT`, `04/GTGT`, `01/CNKD`, `05/KK-TNCN`, `03/TNDN`, `BCTC`, Giấy nộp tiền) của công ty đang chọn; hiển thị kết quả đối chiếu từng chỉ tiêu và nút `Lập tờ khai mới` / `Lập KHBS`.
   - **Phân hệ 6 — `Kết xuất MISA & Bảng kê`:** Đưa giao diện Định khoản thông minh tự học (`TT200/TT99` & `TT133`) thành một màn hình làm việc toàn trang thoáng rộng (không cần gò trong popup), kèm xuất Bảng kê `01-1/GTGT`, `01-2/GTGT`, `MISA_Mua_hang`, `MISA_Ban_hang`.
   - **Phân hệ 7 — `Đọc XML & Chữ ký số`:** Giữ nguyên trải nghiệm mở nhiều tab chứng từ, xem biểu mẫu chuẩn XSLT `iTax Viewer`, in PDF từng biểu/tất cả biểu, kiểm tra chi tiết chứng thư số X.509 và cây thư mục Explorer (chỉ khi đứng ở phân hệ này mới bung cột danh sách tệp đang mở).

3. **Ngăn Xem nhanh Hóa đơn cạnh Bảng kê (`Split Preview Drawer`):**
   - Ở `Sổ Hóa đơn` và `Kiểm toán Rủi ro`, bấm 1 dòng hóa đơn sẽ mở ngăn phải (`45%` chiều ngang hoặc `520px`) hiển thị ngay bản thể hiện Hóa đơn + Chữ ký số + Ô ghi chú.
   - Hỗ trợ phím mũi tên **`↑` / `↓`** để lướt kiểm tra hàng chục hóa đơn liên tiếp trong tích tắc mà mắt vẫn nhìn thấy dòng đang chọn trên bảng kê; bấm `Esc` để đóng ngăn xem nhanh, bấm đúp để mở sang tab đầy đủ.

---

## 3. Hợp nhất Kiến trúc Lưu trữ Dữ liệu (`XmlProKho v2`)

### Vấn đề của bản v3 cần xóa bỏ
Ở bản v3, `XmlProKho` chỉ lưu 15 trường tóm tắt của Hóa đơn (không lưu dòng hàng `<HHDVu>`, không lưu `<SigningTime>`, không lưu XML gốc, không lưu Tờ khai thuế). Vì vậy mỗi lần mở lại app, người dùng thấy "Kho có 238 hóa đơn" nhưng Dashboard, Kiểm toán rủi ro, Lập tờ khai và Xuất MISA lại trống rỗng cho tới khi nạp lại thư mục XML.

### Thiết kế IndexedDB hợp nhất mới (`XmlProKho` nâng lên `version 2`)

| Object Store | Khóa chính (`keyPath`) | Nội dung lưu trữ | Mục đích & Tối ưu tốc độ |
|---|---|---|---|
| **`cong_ty`** | `mst` | `mst`, `ten`, `dchi`, `cheDoKt` (`TT200`/`TT133`/`HKD`), `loaiKy` (`thang`/`quy`), `soHdMua`, `soHdBan`, `capNhatLuc`, `ghim` | Dựng tức thì màn hình **Danh bạ Công ty** và thanh chọn Công ty toàn cục khi vừa mở app (`< 50ms`). |
| **`hoadon`** | `k` (`chu\|mstBan\|mau\|kh\|so`) | Giữ tương thích ngược v3 + bổ sung: `httt`, `ngayKy`, `dchiBan`, `dchiMua`, `tsChinh`, `soDongHang`, `coXmlGoc`, `ruiRo` (mảng mã lỗi kiểm toán) | Chỉ mục siêu nhẹ trên RAM: lọc, cộng tổng GTGT/TNDN và chạy Kiểm toán cho `50.000` hóa đơn dưới `1,2 giây`. |
| **`xml_goc`** | `k` | `k`, `xml` (chuỗi XML gốc), `tenTep`, `duongDan`, `kyBan`, `kyCqt` | Tách riêng chuỗi XML nặng khỏi bảng chỉ mục `hoadon`. Chỉ đọc theo lô của đúng `MST + Kỳ` khi người dùng bấm xem bản thể hiện, Lập tờ khai chi tiết hoặc Xuất MISA dòng hàng. |
| **`to_khai`** | `id` (`mst\|maTKhai\|ky\|lan`) | `mst`, `kind` (`tk`/`tb`/`ct`), `maTKhai`, `title`, `ky`, `ngayNop`, `xml`, `tenTep`, `duongDan` | Lưu bền vững Tờ khai thuế, BCTC và Giấy nộp tiền theo từng công ty — mở app lên là tự động đối chiếu `01/GTGT` và lấy lương `05/KK-TNCN` ngay lập tức. |

> **Cơ chế Di trú Tự động (Auto-Migration):** Khi nâng cấp hoặc nạp bản sao lưu JSON từ v3.0.8, tự động giữ nguyên 100% bản ghi `hoadon` + `SO_TAY` + `xmlpro.tndn.v1` + `xmlpro.dinhKhoan.v1` đã có. Khi người dùng chọn thư mục XML hoặc tải từ Cổng Thuế, tự động điền đầy đủ cả 4 store.

---

## 4. Cấu trúc Tệp Mã nguồn Đề xuất (Tách gọn `index.html`)

Hiện tại `index.html` dài hơn `5.400 dòng` (ôm cả CSS, Parser, Chữ ký số, UI, IndexedDB). Khi sang thư mục mới, tách thành cấu trúc sạch, dễ bảo trì và cập nhật danh sách nhúng trong `dong-goi\dong-goi.ps1` + `dong-goi\CaiDat.cs`:

```text
<thu-muc-app-moi>/
├── index.html                 # Khung HTML gọn (~350 dòng): Topbar, Sidebar 7 phân hệ, Main, Split Drawer, Dialogs
├── giao-dien.css              # Toàn bộ CSS chuẩn hoá Design Tokens, Light/Dark mode, bảng gọn 28px, 0 emoji
├── bieu-tuong.js              # Bộ SVG Icon nét mảnh dùng chung toàn ứng dụng (icon(ten, size))
├── loi-xml-cks.js             # Lõi đọc XML (parseInvoice, parseTaxDoc) + Kiểm tra chữ ký số XMLDSig (tách từ index.html)
├── kho-du-lieu.js             # Hợp nhất XmlProKho v2 (cong_ty, hoadon, xml_goc, to_khai) + AppContext (mst, nam, ky)
├── khung-ung-dung.js          # Điều phối App Shell: Topbar, Sidebar Ctrl+B, Router 7 phân hệ, Split Preview ↑/↓, Ctrl+K
├── ban-lam-viec.js            # Phân hệ 1: Danh bạ Doanh nghiệp / Hộ kinh doanh (thẻ công ty, thống kê nhanh)
├── dashboard-ke-toan.js       # Phân hệ 2 & 3: Tổng quan GTGT, TNDN & Lợi nhuận sau thuế, Sổ Hóa đơn & Khách hàng
├── kiem-toan-misa.js          # Phân hệ 4 & 6: Trung tâm Kiểm toán rủi ro HĐ + Màn hình Định khoản & Xuất MISA/FAST
├── doi-chieu.js               # Phân hệ 5: Đối chiếu 01/GTGT ↔ Hóa đơn ↔ Giấy nộp tiền
├── lap-to-khai.js             # Phân hệ 5: Lập tờ khai 01/GTGT, 04/GTGT, 01/CNKD, 01/KHBS
├── so-tay.js                  # Khóa sổ kỳ kê khai, ghi chú kế toán, nối lại đường dẫn tệp
├── tai-hoa-don.js             # Tải hóa đơn & hóa đơn máy tính tiền từ Cổng Thuế (+ tai-hoa-don-loi.js)
├── xuat-excel.js              # Xuất bảng kê Excel tổng hợp (.xlsx)
├── nganh-doc.js               # Bộ giải mã XML phụ trợ (Sao kê ngân hàng ISO 20022 cho Nhóm 3, chứng từ TNCN, BHXH…)
├── mau-itax.js / ten-chi-tieu.js / jszip.min.js / phien-ban.js
└── dong-goi/                  # Vỏ C# WebView2 (VoWebView2.cs, KhungCongThue.cs, CaiDat.cs, dong-goi.ps1, dong-goi-store.ps1)
```

---

## 5. Lộ trình Thi công 5 Giai đoạn (Làm cuốn chiếu, chạy được ngay sau mỗi giai đoạn)

### Giai đoạn 1 — Dựng App Shell Mức 2, Tách CSS/Icon SVG & Xóa sạch Emoji
1. Tạo `bieu-tuong.js` (24 SVG icon chuẩn: công ty, tổng quan, hóa đơn, kiểm toán, tờ khai, xuất MISA, tải cổng thuế, tìm kiếm, khóa sổ, chữ ký số, thu gọn…) và `giao-dien.css`.
2. Dựng khung `index.html` + `khung-ung-dung.js` mới gồm **Global Topbar** (chọn Công ty + Kỳ làm việc + nút Nạp XML / Tải Cổng Thuế) và **Sidebar 7 phân hệ** thu gọn được bằng `Ctrl+B` (nhớ trạng thái thu gọn vào `localStorage`).
3. Thay thế toàn bộ emoji còn sót ở thanh bên, thanh tab, hộp thoại bằng SVG icon; gỡ bỏ khối chữ giới thiệu 9 ngành ở `#homeEmpty`.
4. **Đầu ra kiểm chứng:** Toàn bộ 7 phân hệ chuyển mượt tức thì, không còn bất kỳ ký tự emoji nào trên toàn ứng dụng, chế độ Sáng/Tối đạt tương phản $\ge 3:1$.

### Giai đoạn 2 — Hợp nhất Kho Đa công ty (`XmlProKho v2`) & Phân hệ "Danh bạ Công ty"
1. Xây dựng `kho-du-lieu.js` nâng cấp IndexedDB lên `v2` (`cong_ty`, `hoadon`, `xml_goc`, `to_khai`) + đối tượng trạng thái trung tâm `APP_CTX` (`mst`, `nam`, `ky`, sự kiện `onContextChange`).
2. Khi nạp tệp `.xml` / `.zip` / thư mục hoặc tải từ Cổng Thuế: tự động phân loại vào đúng `MST` công ty, cập nhật bảng `cong_ty` và lưu `xml_goc` + `to_khai`.
3. Dựng `ban-lam-viec.js` (**Phân hệ 1 — Danh bạ Công ty**): hiển thị danh sách thẻ công ty có tìm kiếm, ghim công ty thường làm lên đầu, bấm vào công ty là nạp ngữ cảnh và nhảy thẳng vào `Tổng quan Thuế`. Khi máy chỉ có 1 công ty thì mở app lên vào thẳng số liệu của công ty đó.
4. **Đầu ra kiểm chứng:** Đóng app mở lại có ngay đầy đủ Dashboard GTGT, TNDN, Kiểm toán rủi ro, Tờ khai và Xuất MISA của từng công ty mà **không cần nạp lại thư mục XML**.

### Giai đoạn 3 — Sổ Hóa đơn Hợp nhất, Ngăn Xem nhanh (`Split Preview`) & Tách trang Kiểm toán / MISA
1. Hợp nhất giao diện `Kho hóa đơn` và `Tab 3 Dashboard` thành **Phân hệ 3 (`Sổ Hóa đơn Mua / Bán`)** có bộ lọc đa chiều, đánh dấu *Đã hạch toán / Đã thanh toán*, ghi chú nhanh.
2. Xây dựng **Ngăn Xem nhanh Hóa đơn bên phải (`Split Preview Drawer`)**: bấm 1 dòng hóa đơn hiện ngay bản thể hiện A4 + chữ ký số + cảnh báo rủi ro bên phải; bắt phím `↑` / `↓` duyệt liên tiếp và `Esc` để đóng.
3. Đưa **Kiểm toán Rủi ro Thuế** ra **Phân hệ 4** độc lập (hiển thị chi tiết từng thẻ rủi ro + bảng hóa đơn vi phạm + nút lọc & xuất báo cáo rà soát) và đưa **Kết xuất MISA & Bảng kê** ra **Phân hệ 6** toàn màn hình (không còn bị bó trong `<dialog>`).
4. **Đầu ra kiểm chứng:** Duyệt 500–50.000 hóa đơn mượt mà, bấm `↑/↓` chuyển bản thể hiện dưới `50ms`, sửa định khoản trên Phân hệ 6 tự lưu tức thì.

### Giai đoạn 4 — Triển khai Nghiệp vụ Kế toán Chuyên sâu tiếp theo (Nhóm 3 → Nhóm 6)
Thực hiện lần lượt theo thứ tự ưu tiên nghiệp vụ đã vạch tại `KE-HOACH-NANG-CAP.md`:
1. **Nhóm 3 — Khớp Sao kê Ngân hàng (`camt.052/053` hoặc bảng kê Excel/XML) ↔ Hóa đơn & Công nợ `131`/`331`:** Tự động gạch nợ hóa đơn mua vào $\ge 5$ triệu đồng đã có Ủy nhiệm chi ngân hàng, cảnh báo hóa đơn $\ge 5$ triệu chưa có chứng từ thanh toán không dùng tiền mặt, lên báo cáo Tuổi nợ.
2. **Nhóm 5 — Kiểm soát "Xuất khống / Âm kho chứng từ" & Giá vốn mặt hàng:** Dò ngày lập `<NLap>` và mã/tên hàng `<HHDVu>` để cảnh báo mặt hàng xuất bán trước ngày có hóa đơn mua vào đầu tiên hoặc bán dưới giá mua bình quân.
3. **Nhóm 4 & Nhóm 6 — Đối chiếu Lương – TNCN – BHXH & Kiểm chéo 12 chỉ tiêu BCTC + Nháp `03/TNDN`:** Kiểm tra cân đối Bảng CĐKT, khớp thuế GTGT còn được khấu trừ `[43]` với TK `133` trên BCTC, đổ tự động tờ khai quyết toán `03/TNDN`.

### Giai đoạn 5 — Đổi nhận diện Thương hiệu mới (nếu cần), Đóng gói `.exe` / `.msix` & Kiểm thử Toàn diện
1. Cấu hình tên ứng dụng mới, biểu tượng `.ico`, thông tin bản quyền trong `dong-goi\Chung.cs`, `VoWebView2.cs`, `CaiDat.cs`, `AppxManifest.xml` và danh sách tệp nhúng trong `dong-goi\dong-goi.ps1`, `dong-goi\dong-goi-store.ps1` (lưu ý giữ BOM UTF-8 cho mọi tệp `.ps1`).
2. Cập nhật và chạy trọn bộ kiểm thử tự động (`kiem-thu-sua-loi.py`, `kiem-thu-kho.py`, `kiem-thu-so-tay.py`, `kiem-thu-tai-hoa-don.py`, `kiem-thu-vo-webview2.py`) đạt **100% PASS** trước khi xuất bản cài `v4.0.0`.

---

## 6. Hướng dẫn Chuyển sang Thư mục Mới & Khởi chạy Nhanh

### Bước 1: Sao chép sang thư mục mới sạch sẽ (chạy trong PowerShell)
Khi tạo thư mục dự án mới (ví dụ `F:\AI\8.ke-toan-thue-v4`), chỉ cần chép mã nguồn và bỏ qua `.git` cũ cùng các bản `.exe` phát hành cũ:

```powershell
$nguon = "F:\AI\7.xml-pro-v3"
$dich  = "F:\AI\8.ke-toan-thue-v4"   # Đổi tên thư mục tuỳ ý
robocopy $nguon $dich /E /XD ".git" "dong-goi\ban-phat-hanh" "mau-xml\NgaAnh-T10-11" "__pycache__"
Set-Location $dich
git init -b main
git add .
git commit -m "Khoi tao nen tang tu XML-Pro 3.0.8 truoc khi tai cau truc V4"
```

### Bước 2: Câu lệnh mở đầu gợi ý cho phiên làm việc ở thư mục mới
Khi mở cửa sổ làm việc mới tại thư mục mới, bạn chỉ cần nhắn:

> *"Đọc tệp `KE-HOACH-TAI-CAU-TRUC-V4.md` và `KE-HOACH-NANG-CAP.md`. Hãy triển khai tuần tự **Giai đoạn 1** và **Giai đoạn 2** của kế hoạch tái cấu trúc Mức 2 (dựng App Shell mới có Topbar chọn Công ty/Kỳ toàn cục, Sidebar 7 phân hệ thu gọn `Ctrl+B`, bộ SVG icon 0 emoji, và hợp nhất Kho dữ liệu đa công ty `XmlProKho v2` + màn hình Danh bạ Công ty), giữ nguyên độ chính xác của toàn bộ các mô-đun thuế hiện có và bật cửa sổ xem trước để kiểm tra."*
