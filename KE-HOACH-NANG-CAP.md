# KẾ HOẠCH NÂNG CẤP VÀ LỘ TRÌNH PHÁT TRIỂN — XML-PRO V3

*Cập nhật lần cuối: 07/11/2026 · Áp dụng cho nhánh `webview2-v3` (XML-Pro 3.0.7+)*

Tài liệu này tổng hợp toàn bộ trạng thái các tính năng đã hoàn thành từ v1.4.0 đến v3.0.7+, đánh giá kiến trúc lưu trữ đa ngành hiện tại, và lộ trình phát triển chuyên sâu cho mảng **Kế toán – Hóa đơn – Thuế** (100% xử lý nội bộ trên máy người dùng, không gửi dữ liệu lên máy chủ trung gian).

---

## Phần A. Các hạng mục đã hoàn thành (v1.4.0 → v3.0.7+)

### 1. Nền tảng cốt lõi & Bảo mật chữ ký số (Báo cáo 01 → 12)
* **Vỏ ứng dụng Windows thật (`WebView2`):** Loại bỏ hoàn toàn máy chủ nội bộ (`HttpListener`), đóng gói bộ cài `.exe` và gói `.msix` Microsoft Store.
* **Kiểm tra chữ ký số XMLDSig ngoại tuyến (`Web Crypto`):** Băm lại `Reference` theo chuẩn C14N và xác thực chữ ký RSA/ECDSA trực tiếp từ chứng thư X.509 đính kèm, khớp 100% với `.NET SignedXml` của Windows, phát hiện sửa đổi dù chỉ 1 ký tự.
* **Hiển thị Tờ khai / BCTC chuẩn mẫu in iTax Viewer:** Hỗ trợ đầy đủ các biểu tờ khai HTKK/eTax và Báo cáo tài chính (TT200, TT133, TT99), mở từng phụ lục theo thẻ và in PDF vừa khổ giấy.
* **Giao diện Sáng mặc định (`xmlpro.theme.v2`):** Mặc định mở ở chế độ Sáng (Light Mode) dễ đọc số liệu kế toán; nút chuyển Sáng/Tối lưu tùy chọn riêng trên máy và đảm bảo độ tương phản $\ge 3:1$.

### 2. Tự động hóa Tờ khai, Kho Hóa đơn & Cổng Thuế (Báo cáo 05 → 19)
* **Đối chiếu chéo `01/GTGT` ↔ Hóa đơn ↔ Giấy nộp tiền:** Tự động phát hiện hóa đơn bỏ sót, kê khai nhầm kỳ, hoặc kê trùng hóa đơn gốc đã bị thay thế; đối chiếu số thuế đã nộp NSNN (tiểu mục `1701`).
* **Lập tờ khai XML nạp thẳng HTKK / eTax:** Tự động tổng hợp từ hóa đơn để sinh XML chuẩn cho `01/GTGT` (lần đầu & bổ sung `01/KHBS`), `04/GTGT` (trực tiếp trên doanh thu), và `01/CNKD` hộ kinh doanh (Thông tư 50/2026 & Nghị định 68/2026).
* **Tải hóa đơn trực tiếp từ Cổng Thuế (`hoadondientu.gdt.gov.vn`):** Người dùng tự đăng nhập trên trang thật (app không lưu mật khẩu/token), tự tải cả hóa đơn thường và hóa đơn khởi tạo từ máy tính tiền (`/sco-query`), đối soát chéo danh sách cổng thuế với kho nội bộ.
* **Kho Hóa đơn vĩnh viễn (`XmlProKho` — IndexedDB) & Sổ tay kế toán (`SO_TAY`):** Chịu tải $\ge 50.000$ hóa đơn mở dưới 1,5 giây, đánh dấu *Đã kiểm / Đã hạch toán / Đã thanh toán*, ghi chú từng hóa đơn, khóa sổ theo kỳ và sao lưu/phục hồi JSON.

### 3. Dashboard Kế toán 3 Tab & Tính tự động Thuế TNDN (Báo cáo 20)
* **Cấu trúc 3 Tab nghiệp vụ tách biệt trên Dashboard:**
  1. **Tab 1 — Thuế GTGT:** Sổ kê khai theo Tháng/Quý, gom theo năm, đối chiếu tờ khai, khóa sổ và lập tờ khai nhanh.
  2. **Tab 2 — Thu nhập DN & Lợi nhuận sau thuế:** Tự động tập hợp doanh thu bán ra, chi phí mua vào có hóa đơn, chi phí tiền lương từ tờ khai `05/KK-TNCN`, chứng từ nộp thuế TNDN (`1052`) và đối chiếu BCTC (`B02-DN`). Tự động áp dụng bậc thuế suất **15% / 17% / 20%** theo **Luật Thuế TNDN số 67/2025/QH15** (doanh thu $\le 3$ tỷ $\rightarrow 15\%$; $3 - 50$ tỷ $\rightarrow 17\%$; $> 50$ tỷ $\rightarrow 20\%$), bù trừ lỗ lũy kế giữa các quý trong năm, cho phép nhập điều chỉnh chi phí ngoài HĐ / chi phí loại trừ `[B4]` / lỗ năm trước `[C3]` lưu riêng theo từng MST và năm (`xmlpro.tndn.v1`).
  3. **Tab 3 — Tổng hợp Hóa đơn & Khách hàng:** Thống kê cấu trúc hóa đơn hợp lệ, Top Khách hàng / Nhà cung cấp, bộ lọc hóa đơn tức thì và bảng Kiểm toán rủi ro hóa đơn.

### 4. Triển khai Đợt này: Nhóm 1 (Kiểm toán rủi ro HĐ) & Nhóm 2 (Xuất MISA + Tự học định khoản)
* **Nhóm 1 — Bộ "Kiểm toán rủi ro Hóa đơn" trước thanh tra thuế (`kiem-toan-misa.js`):**
  * **1a. Bắt lỗi lập sai thời điểm / ký lùi ngày:** So sánh `<NLap>` với `<SigningTime>` chữ ký số người bán; cảnh báo đỏ các hóa đơn ký lệch ngày, đặc biệt hóa đơn ký vắt sang tháng/quý sau (nguy cơ bị loại thời điểm khấu trừ hoặc phạt hành chính xuất hóa đơn sai thời điểm).
  * **1b. Cảnh báo thanh toán tiền mặt theo Luật GTGT 48/2024/QH15 (từ 01/07/2025):** Áp ngưỡng **5.000.000 đ** cho hóa đơn từ `01/07/2025` (và **20.000.000 đ** trước `01/07/2025`). Bắt cả 2 trường hợp: (i) 1 hóa đơn đầu vào ghi hình thức thanh toán `TM` / `Tiền mặt` từ ngưỡng trở lên, và (ii) **nhiều hóa đơn đầu vào mua cùng 1 ngày của cùng 1 nhà cung cấp** có tổng thanh toán cộng dồn $\ge$ ngưỡng (bẫy tách nhỏ hóa đơn né chuyển khoản).
  * **1c. Rà soát "Thủng dải số" hóa đơn bán ra:** Gom hóa đơn bán ra theo `Mẫu số + Ký hiệu`, kiểm tra tính liên tục từ số nhỏ nhất đến số lớn nhất trong tập dữ liệu và chỉ đích danh các số hóa đơn bị khuyết thiếu để kế toán kiểm tra sót file hoặc hóa đơn hủy.
  * **1d. Kiểm tra sai lệch thông tin pháp lý người mua trên HĐ đầu vào:** Đối chiếu chuẩn hóa tên doanh nghiệp, MST và địa chỉ trụ sở người mua trên từng hóa đơn mua vào so với thông tin chuẩn của công ty, cảnh báo ngay hóa đơn ghi sai tên loại hình/địa chỉ hoặc thiếu MST người mua.
* **Nhóm 2 — Xuất Excel chuẩn Import MISA / FAST + Bộ nhớ tự học định khoản (`kiem-toan-misa.js`):**
  * Hỗ trợ chuyển đổi linh hoạt chế độ kế toán **Thông tư 200 / TT99** (`1561`, `6427`, `6428`, `5111`, `5113`…) và **Thông tư 133** (`156`, `6422`, `5111`…).
  * Tự động gợi ý `Mã đối tượng`, `Mã vật tư/hàng hóa`, `TK Nợ`, `TK Có`, `TK Thuế` (`1331` / `33311`) dựa trên nội dung tên hàng, giá trị TSCĐ ($\ge 30$ triệu $\rightarrow 211$) và hình thức thanh toán (`TM` $\rightarrow 1111$, `CK`/`TM/CK` $\rightarrow 331/131`).
  * Hộp thoại tương tác cho phép kế toán rà soát, sửa tài khoản định khoản theo từng nhóm Đối tác + Mặt hàng và **tự động ghi nhớ vào `localStorage` (`xmlpro.dinhKhoan.v1`)** — các kỳ sau tự động điền đúng 100%.
  * Xuất file `.xlsx` gồm 3 sheet chuẩn: `MISA_Mua_hang`, `MISA_Ban_hang`, và `Tong_hop_Dinh_khoan` (Bút toán Nợ – Có tổng hợp).

---

## Phần B. Đánh giá Kiến trúc Lưu trữ & Hiển thị Đa ngành hiện tại

Hiện tại XML-Pro đọc được **8 nhóm hồ sơ XML** (`hd` Hóa đơn, `tk/tb/ct` Thuế, `hq` Hải quan VNACCS, `yte` Y tế BHYT 4210/130, `tncn` Khấu trừ TNCN, `bhxh` Bảo hiểm xã hội, `nh` Sao kê Ngân hàng ISO 20022, `thau` Đấu thầu e-GP), được tổ chức trên **3 tầng lưu trữ**:

| Tầng lưu trữ | Nơi lưu | Phạm vi ngành hỗ trợ | Đặc điểm & Giới hạn hiện tại |
|---|---|---|---|
| **1. Bộ nhớ phiên (`docs[]`)** | RAM trình duyệt | Đủ 8 ngành | Giữ nguyên cấu trúc chi tiết (dòng hàng, thuốc, dịch vụ kỹ thuật, tờ khai, chữ ký) trong lúc mở app. |
| **2. Khôi phục phiên (`XmlProDB_v2`)** | IndexedDB (`phienLamViec`) | Đủ 8 ngành | Lưu tối đa `1.500` file `rawXml` của lần mở gần nhất; bấm *Đóng tất cả* sẽ ghi đè phiên rỗng. |
| **3. Kho vĩnh viễn (`XmlProKho`)** | IndexedDB (`hoadon` + `cong`) | **Chỉ Hóa đơn (`hd`)** | Lưu vĩnh viễn $\ge 50.000$ bản ghi tóm tắt hóa đơn. Hồ sơ Y tế (`yte`), BHXH (`bhxh`), Hải quan (`hq`)… hiện **chưa lưu vào Kho vĩnh viễn**. |

* **Cơ chế hiển thị Dashboard:** Hàm `detectDominantDomain(fDocs)` tự nhận diện loại tài liệu chiếm đa số trong thư mục đang xem:
  * Nếu là Hóa đơn / Tờ khai thuế $\rightarrow$ mở **`DASHBOARD_KE_TOAN` (3 Tab chuyên sâu GTGT – TNDN – Hóa đơn)**.
  * Nếu là Y tế BHYT, BHXH, Hải quan, Ngân hàng, Đấu thầu $\rightarrow$ mở **`DASHBOARD_DONG` (Executive Dashboard đa ngành)** hiển thị KPI tổng hợp + bảng chứng từ + mở chi tiết từng hồ sơ qua `nganh-doc.js` (phiếu khám BHYT 4210/130 tách bảng Thuốc, DVKT, CLS; bảng kê lao động BHXH; tờ khai Hải quan luồng Xanh/Vàng/Đỏ…).
* **Định hướng nếu mở rộng cho Bệnh viện / Phòng khám / DN Xuất nhập khẩu:** Bổ sung kho IndexedDB chuyên ngành (`XmlProKhoYTe`, `XmlProKhoHQ`) để thống kê xuất toán BHYT đa kỳ và theo dõi tờ khai hải quan dài hạn tương tự `XmlProKho`.

---

## Phần C. Lộ trình Chuyên sâu Kế toán – Hóa đơn – Thuế tiếp theo (Nhóm 3 → Nhóm 6)

### Nhóm 3 — Khớp Sao kê Ngân hàng XML ↔ Hóa đơn & Quản trị Công nợ (131 / 331)
* **Ý nghĩa:** Tận dụng sẵn bộ đọc sao kê ngân hàng ISO 20022 (`camt.052` / `camt.053`) trong `nganh-doc.js` để giải quyết bài toán đối chiếu chứng từ thanh toán không dùng tiền mặt và theo dõi công nợ.
* **Tính năng chi tiết:**
  1. **Tự động khớp giao dịch Ủy nhiệm chi / Báo có với Hóa đơn:** Quét nội dung chuyển khoản (`RemittanceInformation`), số tiền và tên/STK đối tác để gợi ý gạch nợ tự động cho từng hóa đơn mua vào / bán ra.
  2. **Chứng minh điều kiện khấu trừ thuế GTGT ($\ge 5$ triệu đ):** Tự động đánh dấu *"Đã có chứng từ thanh toán ngân hàng"* cho các hóa đơn mua vào $\ge 5$ triệu đồng đã khớp sao kê; cảnh báo các hóa đơn sắp quá hạn thanh toán nhưng chưa có UNC.
  3. **Báo cáo Tuổi nợ (Aging Report) TK 131 & 331:** Phân nhóm công nợ theo hạn `0–30 ngày`, `31–60 ngày`, `61–90 ngày`, `> 90 ngày`.

### Nhóm 4 — Đối chiếu chéo 3 chiều: Lương – Thuế TNCN (`05/KK`) – BHXH (`bhxh`)
* **Ý nghĩa:** Khi thanh tra thuế TNDN và TNCN, cơ quan thuế luôn đối chiếu chéo quỹ lương trên sổ kế toán với tờ khai TNCN và hồ sơ đóng BHXH để loại chi phí lương khống hoặc truy thu BHXH.
* **Tính năng chi tiết:**
  1. So khớp tổng thu nhập chịu thuế `[21]` / số lao động `[16]` trên các kỳ `05/KK-TNCN` với quyết toán năm `05/QTT-TNCN` (kiểm tra tổng 4 quý có khớp quyết toán năm hay không).
  2. Đối chiếu danh sách CCCD/MST người lao động và quỹ lương đóng BHXH trong hồ sơ XML `bhxh` với bảng kê `05-1/BK-QTT-TNCN` để phát hiện chênh lệch quỹ lương.

### Nhóm 5 — Kiểm soát Giá vốn, Cảnh báo "Xuất khống / Âm kho trên giấy" & Lãi gộp mặt hàng
* **Ý nghĩa:** Dựa trên dữ liệu dòng hàng chi tiết (`<DSHHDVu>/<HHDVu>`: Mã hàng, Tên hàng, ĐVT, Số lượng, Đơn giá) có sẵn trong mọi XML hóa đơn mua vào và bán ra.
* **Tính năng chi tiết:**
  1. **Rà soát trình tự ngày Nhập – Xuất mặt hàng:** Phát hiện mặt hàng xuất hóa đơn bán ra vào ngày $T_1$ nhưng hóa đơn mua vào đầu tiên mới lập ngày $T_2 > T_1$ (rủi ro bị cơ quan thuế quy kết mua bán hóa đơn hợp thức hóa đầu vào sau khi đã xuất bán).
  2. **Phân tích biên lợi nhuận gộp theo mặt hàng:** Cảnh báo các mặt hàng có giá bán thấp bất thường so với giá mua bình quân (bán dưới giá vốn không có hồ sơ đăng ký khuyến mại).

### Nhóm 6 — Hỗ trợ Quyết toán Năm: Nháp `03/TNDN` & Kiểm tra chéo Báo cáo Tài chính
* **Ý nghĩa:** Khép kín chu trình thuế cuối năm từ Hóa đơn $\rightarrow$ GTGT $\rightarrow$ BCTC $\rightarrow$ Quyết toán TNDN.
* **Tính năng chi tiết:**
  1. **Kiểm tra chéo 12 chỉ tiêu sống còn trên BCTC XML (TT200 / TT133 / TT99):** Kiểm tra cân đối Bảng CĐKT (`Tổng Tài sản = Tổng Nguồn vốn`), khớp Tiền cuối kỳ với Lưu chuyển tiền tệ, khớp Lợi nhuận chưa phân phối với KQHĐKD, khớp Số dư Thuế GTGT được khấu trừ (`133`) / phải nộp (`3331`) trên CĐKT với chỉ tiêu `[43]` / `[40]` tờ khai `01/GTGT` tháng 12 / quý 4.
  2. **Sinh bản nháp Tờ khai Quyết toán Thuế TNDN (`03/TNDN`):** Đổ tự động số liệu từ BCTC XML và bảng tính TNDN Tab 2 sang các chỉ tiêu tờ khai `03/TNDN` và phụ lục `03-1A/TNDN`, `03-2/TNDN` (chuyển lỗ 5 năm).
