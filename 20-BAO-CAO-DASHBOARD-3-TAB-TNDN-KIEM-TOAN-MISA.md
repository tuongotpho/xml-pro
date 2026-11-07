# [20] Dashboard 3 Tab, Thuế TNDN tự động, Kiểm toán rủi ro HĐ & Xuất MISA tự học định khoản

07/11/2026 · Tiếp nối [19](19-BAO-CAO-CONG-MO-VA-LOC-DASHBOARD.md) · Nguồn: nhánh `webview2-v3`, Luật Thuế TNDN 67/2025/QH15, Luật Thuế GTGT 48/2024/QH15, 6 hoá đơn mẫu + dữ liệu kho thật 238 hoá đơn

## Kết luận

- **Giao diện mặc định Sáng (`xmlpro.theme.v2`)** và **Dashboard kế toán chia 3 Tab tách biệt:** (1) *Thuế GTGT*, (2) *Thu nhập DN & Lợi nhuận sau thuế*, (3) *Tổng hợp hóa đơn & Khách hàng*.
- **Bảng tính tự động Thuế TNDN & Lợi nhuận sau thuế:** tự lấy doanh thu/chi phí từ hoá đơn, lương từ tờ khai `05/KK-TNCN`, giấy nộp tiền `1052`, tự chọn thuế suất **15% / 17% / 20%** theo quy mô doanh thu (Luật 67/2025/QH15), tự bù lỗ luỹ kế giữa các quý và xuất kèm sheet Excel.
- **Nhóm 1 — Bộ Kiểm toán rủi ro Hóa đơn trước thanh tra thuế (`kiem-toan-misa.js`):** tự bắt 4 nhóm rủi ro trọng yếu: (1a) ký số lệch ngày lập / vắt sang kỳ kê khai sau, (1b) thanh toán tiền mặt $\ge 5$ triệu từ `01/07/2025` (kể cả tách nhiều hoá đơn cùng ngày cùng nhà cung cấp), (1c) thủng dải số hoá đơn bán ra theo `Mẫu số + Ký hiệu`, (1d) sai lệch tên/địa chỉ/MST người mua trên hoá đơn đầu vào.
- **Nhóm 2 — Xuất Excel chuẩn Import MISA / FAST + Tự học định khoản (`kiem-toan-misa.js`):** sinh file `.xlsx` 3 sheet (`MISA_Mua_hang`, `MISA_Ban_hang`, `Tong_hop_Dinh_khoan`) theo **TT200 / TT99** hoặc **TT133**, tự gợi ý tài khoản Nợ/Có/Thuế và ghi nhớ quy tắc định khoản vào `localStorage` (`xmlpro.dinhKhoan.v1`) cho các kỳ sau.
- **Đã đóng gói phiên bản `3.0.8`:** bộ cài `dong-goi/ban-phat-hanh/CaiDat-XML-Pro-3.0.8.exe` và gói Store `XML-Pro-3.0.8-Store.msix`, kèm cải tiến hộp thoại xuất bảng kê rộng toàn khung (`96vw`), nền đặc không trong suốt, dòng gọn `28 px`.

## 1. Giao diện Sáng mặc định & Dashboard 3 Tab + Thuế TNDN

1. **Giao diện Sáng mặc định:** chuyển khoá lưu giao diện sang `xmlpro.theme.v2`, mặc định khởi tạo ở chế độ `light` (nền trắng, chữ đậm rõ số liệu), vẫn cho phép chuyển sang chế độ Tối bất cứ lúc nào và giữ độ tương phản $\ge 3:1$.
2. **Tách 3 Tab trên Dashboard kế toán (`dashboard-ke-toan.js`):**
   - **Tab 1 (`gtgt`) — Thuế GTGT:** toàn bộ thẻ tổng Bán ra / Mua vào / Chênh lệch thuế và bảng *Theo kỳ kê khai* (gập/mở theo năm, đối chiếu tờ khai, lập tờ khai, khoá sổ).
   - **Tab 2 (`tndn`) — Thu nhập DN & Lợi nhuận sau thuế:** bảng tính kết quả kinh doanh Quý 1..4 và Cả năm, tự áp bậc thuế suất 15% ($\le 3$ tỷ), 17% ($3 - 50$ tỷ), 20% ($> 50$ tỷ), cho phép gõ trực tiếp chi phí ngoài hoá đơn (giữ nguyên con trỏ ô nhập), chi phí không được trừ `[B4]`, miễn thuế & chuyển lỗ `[C2+C3]`, lưu riêng theo từng MST và năm tại `xmlpro.tndn.v1`.
   - **Tab 3 (`hoadon`) — Tổng hợp hóa đơn & Khách hàng:** 4 thẻ tóm tắt, khối *Kiểm toán rủi ro hóa đơn*, bảng Khách hàng / Nhà cung cấp và bảng lọc chi tiết hoá đơn.

## 2. Nhóm 1 — Bộ Kiểm toán rủi ro Hóa đơn trước thanh tra thuế

Mô-đun `kiem-toan-misa.js` chạy tự động mỗi khi nạp tệp hoặc đổi MST công ty, gắn cảnh báo trực tiếp vào từng hoá đơn (`inv.notes`) và tổng hợp bảng kiểm toán trên **Tab 3 (`hoadon`)** kèm sheet Excel `Kiểm toán rủi ro HĐ`:

| Hạng mục kiểm toán | Quy tắc phát hiện | Ý nghĩa nghiệp vụ thuế |
|---|---|---|
| **1a. Ký số lệch ngày / vắt kỳ** | So sánh `<NLap>` với ngày trong `<SigningTime>` chữ ký số người bán (`NBan`). Báo riêng mức độ **khác kỳ tháng/quý**. | Ngăn rủi ro xuất hoá đơn lùi ngày hoặc kê khai khấu trừ sai kỳ phát sinh chữ ký số. |
| **1b. Rủi ro thanh toán tiền mặt** | Áp ngưỡng **5.000.000 đ** từ `01/07/2025` (Luật GTGT 48/2024/QH15) và **20.000.000 đ** trước `01/07/2025`. Bắt cả HĐ ghi thuần `TM`/`Tiền mặt` $\ge$ ngưỡng **và** nhiều HĐ đầu vào cùng ngày của cùng 1 MST bán có tổng cộng dồn $\ge$ ngưỡng. | Tránh bị xuất toán khấu trừ thuế GTGT đầu vào và loại chi phí được trừ TNDN do tách lẻ hoá đơn trong ngày. |
| **1c. Thủng dải số HĐ bán ra** | Gom toàn bộ HĐ bán ra của công ty (gồm cả HĐ đã thay thế nếu có) theo `Mẫu số + Ký hiệu`, dò chuỗi liên tục `min → max` và liệt kê chính xác các số bị khuyết. | Phát hiện ngay hoá đơn bán ra bị sót chưa tải về hoặc hoá đơn xoá/huỷ chưa lưu biên bản. |
| **1d. Sai thông tin người mua** | Xác định Tên chuẩn và Địa chỉ cốt lõi của công ty (từ tờ khai thuế hoặc đa số HĐ đầu vào), đối chiếu chuẩn hoá với `NMua/Ten`, `NMua/MST`, `NMua/DChi` trên từng HĐ mua vào. | Phát hiện sớm hoá đơn đầu vào ghi thiếu MST, sai tên loại hình công ty hoặc sai địa chỉ trụ sở để yêu cầu lập biên bản/HĐ điều chỉnh kịp thời. |

## 3. Nhóm 2 — Xuất Excel chuẩn MISA / FAST + Bộ nhớ tự học định khoản

Từ nút **Xuất MISA / Định khoản** trên đầu Dashboard hoặc trong menu **Công cụ** thanh bên, hộp thoại `#dlgMisa` thực hiện:

1. **Tự động gợi ý định khoản theo chế độ kế toán:**
   - **Thông tư 200 / TT99:** Hàng hoá `1561`, Dịch vụ mua ngoài (điện, nước, viễn thông, vận chuyển, phần mềm, phí…) `6427` / `6428`, TSCĐ ($\ge 30$ triệu) `2111`, Thuế GTGT đầu vào `1331`, Công nợ / Tiền mặt `331` / `1111`, Phải thu `131`, Doanh thu `5111` / `5113`, Thuế GTGT đầu ra `33311`.
   - **Thông tư 133:** Hàng hoá `156`, Chi phí quản lý kinh doanh `6422`, TSCĐ `211`, Thuế GTGT `1331` / `33311`, Công nợ `331` / `131` / `1111`, Doanh thu `5111`.
2. **Tự học & ghi nhớ vĩnh viễn trên máy (`xmlpro.dinhKhoan.v1`):** khi kế toán sửa `Mã hàng`, `TK Nợ`, `TK Có`, `TK Thuế` cho một cặp *(Đối tác + Mặt hàng)* trong bảng xem trước, quy tắc được lưu tự động vào `localStorage` theo từng MST công ty — lần mở sau hoặc quý sau tự động điền lại chính xác.
3. **Xuất tệp `.xlsx` 3 sheet:**
   - `MISA_Mua_hang`: đầy đủ cột chứng từ mua hàng (Hình thức mua, Phương thức thanh toán, Ngày hạch toán, Ngày HĐ, Số chứng từ, Mẫu số, Ký hiệu, Số HĐ, Mã NCC, Tên NCC, MST, Diễn giải, Mã hàng, Tên hàng, ĐVT, SL, Đơn giá, Thành tiền, % CK, Tiền CK, % GTGT, Tiền thuế GTGT, Tổng thanh toán, TK Kho/Chi phí, TK Công nợ/Tiền, TK Thuế GTGT).
   - `MISA_Ban_hang`: đầy đủ cột chứng từ bán hàng kiêm hoá đơn chuẩn nhập khẩu MISA SME / AMIS / FAST.
   - `Tong_hop_Dinh_khoan`: bảng tổng hợp phát sinh Nợ – Có theo từng cặp tài khoản để kế toán kiểm nhanh cân đối trước khi import.

## 4. Đánh giá Kiến trúc Đa ngành & Lộ trình Nhóm 3 → 6

Đã cập nhật đầy đủ vào `KE-HOACH-NANG-CAP.md`:
- Làm rõ hiện trạng 3 tầng lưu trữ (`docs[]` RAM, `XmlProDB_v2` phiên 1.500 tệp đa ngành, `XmlProKho` vĩnh viễn chuyên `hd`) và cơ chế rẽ nhánh `DASHBOARD_KE_TOAN` ↔ `DASHBOARD_DONG` cho Y tế BHYT / BHXH / Hải quan / Ngân hàng / Đấu thầu.
- Xác lập lộ trình tiếp theo: **Nhóm 3** (Khớp sao kê Ngân hàng ISO 20022 ↔ Hoá đơn & Công nợ 131/331), **Nhóm 4** (Đối chiếu 3 chiều Lương – TNCN – BHXH), **Nhóm 5** (Kiểm soát âm kho chứng từ & giá vốn mặt hàng), **Nhóm 6** (Kiểm chéo 12 chỉ tiêu BCTC & nháp quyết toán `03/TNDN`).

## 5. Kết quả đo kiểm thử tự động & Thực nghiệm dữ liệu kho thật

| Bộ kiểm thử | Kết quả | Nội dung kiểm chứng trọng tâm |
|---|---|---|
| `kiem-thu-sua-loi.py` | **ĐẠT 45/45** | Đủ 15 phần: chữ ký số `.NET`, iTax XSLT, tương phản chế độ tối $\ge 3:1$, đối chiếu & lập tờ khai `01/GTGT`, `KHBS`, `04/GTGT`, `05/KK-TNCN`, `01/CNKD`, 4 năm (1.920 tệp), **Dashboard 3 Tab + Thuế TNDN tự động (4/4)**, **Kiểm toán rủi ro HĐ & Xuất MISA tự học định khoản (4/4)**. |
| `kiem-thu-kho.py` | **ĐẠT 29/29** | Kho hoá đơn vĩnh viễn `XmlProKho`, đối soát cổng thuế, sao lưu/khôi phục JSON, hiệu năng 50.000 bản ghi. |
| `kiem-thu-so-tay.py` | **ĐẠT 24/24** | Khoá sổ kỳ kê khai, ghi chú kế toán, nối lại đường dẫn tệp, xuất bảng kê Excel nhiều sheet. |

**Thực nghiệm trên 238 hoá đơn kho thật (`MST 2601102955`):**
- Chuẩn hoá tên pháp lý không báo giả (`0` cảnh báo sai tên giả trên 159 hoá đơn đầu vào dù có hoá đơn dư khoảng trắng kép).
- Phát hiện thực tế **11 hoá đơn mua vào thuộc diện cộng dồn cùng ngày của cùng nhà cung cấp vượt ngưỡng không dùng tiền mặt**, tiêu biểu cụm 5 hoá đơn `C25TMV-13..17` ngày `18/01/2025` của *Công ty TNHH Xây dựng Thương mại Mạnh Vinh* (từng tờ chỉ từ `4,44` đến `13,14` triệu đ — đều dưới ngưỡng `20` triệu nếu nhìn rời rạc, nhưng tổng cộng dồn trong ngày lên tới **41.029.038 đ**, bắt buộc phải có chứng từ chuyển khoản cho cả 5 tờ).
- Hộp thoại **Xuất MISA / Định khoản** dựng tức thì **159 dòng mua hàng** + **73 dòng bán hàng** + bảng tổng hợp định khoản cân đối.
