# [04] Rà soát lại tính năng, giao diện, font chữ; làm lại thẻ tờ khai kiểu iTax Viewer; nghiên cứu thị trường để nâng cấp

> Ngày 02/11/2026 · Tiếp nối: [03 — Kết quả sửa lỗi v2.0.0](03-BAO-CAO-KET-QUA-SUA-LOI-V2.md) · Xem [00 — Mục lục](00-MUC-LUC-BAO-CAO.md)
> Nguồn dữ liệu: chạy app trong trình duyệt (khung Browser của Claude) với 8 tờ khai / BCTC (2 tờ thật của doanh nghiệp lấy từ thư mục Downloads, chỉ dùng trên máy và không đưa vào git; còn lại là tệp MST giả do app khai thuế của anh tạo); bản gốc trước khi Gemini sửa `F:\AI\6.chrome-ex\xem-xml-thue`; iTax Viewer cài trên máy (cập nhật 01/11/2026); tìm kiếm web (nguồn ở cuối).

---

## Kết luận trước

1. **Tính năng gốc của app — hiển thị tờ khai theo mẫu iTax — đã hỏng hoàn toàn từ bản 2.0.0 của Gemini.**
   - Lỗi: `ITAX is not defined`. Khi làm "nạp lười" bộ mẫu, Gemini xoá biến `ITAX` nhưng quên sửa 6 chỗ đang dùng nó.
   - Hậu quả: mọi tờ khai / BCTC rơi về danh sách mã chỉ tiêu thô ("chưa có tên chỉ tiêu") và không có thẻ nào. Đây là lý do anh thấy "không mở từng thẻ như iTax nữa".
   - Báo cáo 01 không bắt được lỗi này vì kho mẫu không có tờ khai nào để thử; tôi đã ghi điều đó ở mục "Chưa kiểm được" của báo cáo 01.
2. **Đã làm lại tính năng mở từng thẻ như iTax Viewer:**
   - mỗi biểu (tờ khai chính, từng phụ lục) là một thẻ, mỗi lần chỉ hiện 1 biểu;
   - thanh thẻ dính đầu trang khi cuộn, `Ctrl + PageUp/PageDown` để chuyển biểu;
   - hai nút "In biểu này" và "In tất cả N biểu".
3. **Bộ mẫu iTax trong app đã cũ.** Nó chỉ tới XSLT 2.9.2, trong khi iTax Viewer trên máy anh đã có 3.0.9. Tôi trích lại bộ mẫu, nên **BCTC TT99/2025 và TT58/2026 nay hiện đúng khuôn**. Trước đó app còn mượn nhầm phụ lục TT200 và **làm mất hẳn Bảng cân đối kế toán**.
4. **Giao diện:**
   - tờ khổ cố định bị cắt mép phải trên màn hình hẹp → nay tự co vừa khung;
   - chế độ tối có 12+ chỗ chữ trắng trên nền trắng → đã sửa, có test đo tương phản tự động;
   - font chữ ổn: giao diện dùng Segoe UI, tờ khai / hoá đơn dùng Times New Roman như mẫu giấy.
5. **Bộ test mới đạt 19/19** (thêm 4 mục cho phần này). 4 bộ cũ đạt. Đã thử chèn mã độc vào cả phần tờ khai iTax: 0 lần chạy.
6. **Thị trường:** chưa thấy sản phẩm nào vừa **miễn phí, chạy offline**, vừa đọc hàng loạt tờ khai + hoá đơn + xuất Excel + kiểm chữ ký. Các sản phẩm "xịn" (MISA meInvoice, xCyber BillStore, Sapo, AMIS) đều chạy trên mây, trả phí, mạnh ở **tự tải hoá đơn từ cổng thuế và tra tình trạng MST online** — hai việc XML-Pro không làm được nếu giữ cam kết offline. Đề xuất nâng cấp ở mục D tập trung vào thế mạnh offline.

---

## A. Tính năng thẻ tờ khai — trước / sau (đo trong trình duyệt)

| Tệp | 2.0.1 (trước) | 2.0.2 (sau) |
|---|---|---|
| BCTC TT200 thật (ETAX…, năm 2024) | danh sách mã thô, 0 thẻ | **3 thẻ**: Tờ khai chính · Kết quả HĐKD · Lưu chuyển tiền tệ trực tiếp |
| Tờ khai 01/GTGT thật (2 tệp) | mã thô | **2 thẻ**: Tờ khai chính · Giảm thuế GTGT theo NQ 142/2024/QH15 |
| BCTC TT99/2025 | mã thô | **3 thẻ chuẩn mẫu** (trước khi cập nhật bộ mẫu: mất Bảng CĐKT, phụ lục mượn khuôn TT200) |
| BCTC TT58/2026 | mã thô | **2 thẻ chuẩn mẫu** |
| BCTC TT133 B01a-DNN, 05/KK-TNCN | mã thô | 3 thẻ / 1 biểu, chuẩn mẫu |
| Thời gian dựng 1 tờ | — | khoảng 120 ms (mở lần đầu hiện "Đang dựng biểu…") |
| Chạy thật `XML-Pro.exe` 2.0.2 với BCTC TT99 | — | tiêu đề cửa sổ "… - Tờ khai chính — XML-Pro" (đã dựng theo mẫu) |

**Đã làm:**
- Lấy lại bộ mẫu tại chỗ trong các hàm dựng biểu.
- **Chờ nạp xong bộ mẫu** rồi mới dựng; trong lúc chờ hiện "Đang dựng biểu…". Trước đó app dựng ngay khi bộ mẫu chưa nạp, rồi đánh dấu "xong" luôn nên không bao giờ thử lại.
- Thanh thẻ kiểu iTax Viewer:
  - tên thẻ chuyển từ CHỮ IN HOA dài của mẫu thuế sang chữ thường dễ đọc, giữ các chữ viết tắt (GTGT, QH15…); tên đầy đủ hiện khi rê chuột;
  - ô "Biểu 2/3" ở cuối thanh thẻ.
- Mẫu nào bộ iTax chưa có:
  - vẫn có đủ thẻ, kể cả **tờ khai chính**, dựng dự phòng theo mã/tên chỉ tiêu;
  - thẻ in nghiêng và có dòng cảnh báo vàng;
  - **không mượn khuôn của mẫu khác** (chỉ tiêu có thể khác nghĩa), chỉ mượn tên phụ lục.
- Ô chữ ký trong tờ khai cập nhật theo kết quả kiểm chữ ký (trước đây "đóng băng" ở lúc dựng).
- "In tất cả": vẽ tạm cả bộ biểu, mỗi biểu sang trang mới, in xong quay về thẻ đang xem.

**Bản gốc trước Gemini** (`6.chrome-ex`) mặc định "Xem tất cả" kèm nút từng biểu. Bản này làm theo đúng ý anh: mặc định từng thẻ, còn "xem/in tất cả" chuyển thành nút in.

## B. Giao diện & font

| Hạng mục | Phát hiện | Đã sửa |
|---|---|---|
| Tờ khai khổ cố định (dọc 920px, ngang 1262px) | Khung xem 838px → **mất mép phải**, không cuộn ngang được | Tự co cả tờ cho vừa khung (vd 88,5%), co lại khi đổi cỡ cửa sổ; khi in vẫn 100% |
| Chế độ tối — thanh bên | Nút "Chọn thư mục", nút MST, thẻ "Đang mở": chữ trắng trên nền trắng (tương phản 1,0–1,1) | Nền tối, chữ sáng |
| Chế độ tối — Dashboard | Bảng danh sách tài liệu, ô KPI, khung cảnh báo vàng/xanh, nhãn CHƯA RÕ / TRÙNG / Hợp lệ / Cần kiểm tra khó đọc | Sửa cả một lượt; nhãn trong Dashboard chuyển sang dùng lớp màu chung (giao diện sáng không đổi) |
| Chế độ tối — "Thông tin file" của tờ khai | Nền trắng, chữ sáng | Sửa |
| Font | Giao diện: Segoe UI; tờ khai / hoá đơn: Times New Roman (giống mẫu giấy); mã số: Consolas | Giữ nguyên — hợp lý, hiển thị tiếng Việt đầy đủ trên Windows |
| Hoá đơn | Hiển thị tốt; số lượng dùng dấu phẩy thập phân, tiền dùng dấu chấm hàng nghìn (đúng kiểu Việt Nam) | — |

**Test mới chặn tái phát:**
- `kiem-thu-sua-loi.py` đo tương phản mọi chữ ngoài tờ giấy ở chế độ tối, yêu cầu ≥ 3:1. Lần chạy đầu nó bắt thêm 8 chỗ tôi chưa thấy bằng mắt.
- Thêm một test bắt lỗi JavaScript khi dựng biểu.

## C. Thị trường — các sản phẩm tương tự

| Sản phẩm | Loại | Mạnh | Yếu so với XML-Pro |
|---|---|---|---|
| **iTax Viewer** (Tổng cục Thuế) | Miễn phí, Windows (Java) | Chuẩn mẫu chính thức, cập nhật mẫu thường xuyên (bản mới nhất tìm thấy: 2.7.9) | Xem từng tệp; không đọc hàng loạt, không thống kê, không xuất Excel bảng kê, không kiểm chữ ký hoá đơn kiểu toán học |
| **MISA meInvoice — xử lý HĐ đầu vào** | Trên mây, trả phí | Tự đồng bộ HĐ đầu vào, lưu 10 năm, AI phân loại chi phí, cảnh báo người bán rủi ro, kiểm trạng thái hoạt động DN | Cần mạng + tài khoản; trang dùng thử đọc XML giới hạn 10 lần |
| **xCyber BillStore** | Trên mây, có dùng thử | Tự kiểm người mua/bán, chữ ký số, trạng thái NNT; đồng bộ phần mềm kế toán | Cần mạng, trả phí |
| **MISA AMIS Kế toán (từ R56)** | Phần mềm kế toán | Tự cảnh báo nhà cung cấp rủi ro cao về thuế & hoá đơn | Phải dùng cả bộ kế toán |
| **Sapo — xử lý HĐ đầu vào** | Trên mây | Kiểm MST, tình trạng hoạt động NCC, định dạng XML, chữ ký số | Cần mạng, gắn với hệ sinh thái Sapo |
| XML Viewer / EditiX / XML Notepad | Công cụ XML chung | — | Chỉ hiện cây XML, không hiểu tờ khai / hoá đơn |

**Danh sách DN rủi ro cao về thuế:**
- Tổng cục Thuế công bố trên cổng `gdt.gov.vn` và `tracuuhoadon.gdt.gov.vn`: tra từng mã số thuế, có mã xác thực (captcha).
- **Không tìm thấy API chính thức.**
- Có bản tổng hợp dạng tệp (vd của MISA), số liệu tới 01/04/2026 theo nguồn đó.

**Vị trí của XML-Pro:** miễn phí, chạy offline (không lộ dữ liệu), đọc được cả tờ khai lẫn hoá đơn hàng loạt, xuất Excel, kiểm chữ ký số. Đây là khoảng trống thật giữa iTax Viewer (chỉ xem) và các dịch vụ mây (trả phí, cần gửi dữ liệu lên mạng).

*Lưu ý: phần lớn nguồn là trang của chính nhà cung cấp hoặc bài hướng dẫn trên trang tin; tôi chưa dùng thử các sản phẩm này.*

## D. Đề xuất nâng cấp (giữ cam kết offline) — xếp theo giá trị

| # | Nâng cấp | Vì sao đáng làm | Công sức ước tính |
|---|---|---|---|
| 1 | **Đối chiếu hoá đơn ↔ tờ khai 01/GTGT cùng kỳ**: cộng thuế từ các HĐ mua vào / bán ra đã nạp, so với chỉ tiêu [24]/[25], [34]/[35] trên tờ khai; chỉ rõ HĐ nào chưa kê / kê thừa | Việc kế toán làm tay mỗi quý; dịch vụ mây có làm nhưng cần gửi dữ liệu đi. App đã có sẵn cả 2 nguồn số liệu | 1–2 ngày |
| 2 | **Nút "Cập nhật bộ mẫu từ iTax Viewer trên máy"**: tự trích lại bộ mẫu (như tôi vừa làm tay) khi Tổng cục Thuế ra bản mới | Lỗi TT99 vừa rồi chính là do bộ mẫu cũ. Cập nhật thật, không cần mạng — thay cho "Trung tâm cập nhật" giả đã gỡ | 1 ngày (chuyển công cụ Python sang C# trong exe) |
| 3 | **Nhập danh sách DN rủi ro từ tệp Excel** (anh tải từ cổng thuế / MISA) → gắn cờ người bán rủi ro trên HĐ và Dashboard | Bản offline của tính năng "cảnh báo NCC rủi ro" mà MISA, AMIS bán; không cần mạng lúc dùng | 0,5–1 ngày |
| 4 | **So sánh 2 kỳ tờ khai / BCTC**: đặt 2 tệp cạnh nhau, tô màu chỉ tiêu lệch; kiểm [43] kỳ trước = [22] kỳ này | Hữu ích khi soát quyết toán, khi khai bổ sung | 1–2 ngày |
| 5 | **Tìm trong nội dung**: tìm theo tên hàng hoá, số tiền trên toàn bộ HĐ đã nạp | Hiện chỉ tìm theo tên / MST / ký hiệu | 0,5 ngày |
| 6 | **In / lưu PDF hàng loạt** nhiều tờ khai, nhiều HĐ một lần | iTax Viewer không làm được | 1 ngày |

**Không nên làm (không hợp offline):** tự tải hoá đơn từ cổng hoadondientu.gdt.gov.vn (cần tài khoản + captcha, dễ vỡ); tra trạng thái MST trực tiếp (không có API chính thức).

---

## Nghiệm thu

| Hạng mục | Tôi đo | Cần anh |
|---|---|---|
| Thẻ tờ khai, in tất cả, co vừa khung, không lỗi JS | ✔ test 19/19 + 4 bộ cũ | Mở vài tờ khai / BCTC thật của anh, thử **In tất cả → Lưu PDF**, xem PDF có đúng mỗi biểu một trang không |
| BCTC TT99 / TT58 chuẩn mẫu | ✔ trong trình duyệt + `XML-Pro.exe` 2.0.2 | — |
| Chế độ tối | ✔ đo tương phản tự động + chụp màn hình | Nhìn qua một lượt |
| Chèn mã độc qua tờ khai iTax | ✔ 0 lần chạy | — |
| Bộ cài `CaiDat-XML-Pro-2.0.2.exe` (18.050 KB) | ✔ đóng gói | **Cài thử** (chưa cài đè 1.7.7) |

## Nguồn tham khảo (tìm 02/11/2026)
- iTax Viewer: [thuvienphapluat — iTaxViewer 2.7.9](https://thuvienphapluat.vn/hoi-dap-phap-luat/tai-ve-itaxviewer-279-phan-mem-doc-to-khai-thue-xml-moi-nhat-o-dau-138098845.html), [fptshop — iTaxViewer](https://fptshop.com.vn/tin-tuc/thu-thuat/itaxviewer-169225), [ihoadon — phần mềm đọc HĐ XML](https://ihoadon.vn/hddt/phan-mem-doc-hoa-don-dien-tu-dinh-dang-file-goc-xml.html)
- MISA meInvoice xử lý HĐ đầu vào: [meinvoice.vn/xu-ly-hoa-don-dau-vao](https://meinvoice.vn/xu-ly-hoa-don-dau-vao/), [meinvoice — HĐ điện tử file XML](https://www.meinvoice.vn/tin-tuc/9169/hoa-don-dien-tu-file-xml/)
- xCyber BillStore: [xcyber.vn/xcyberbillstore](https://xcyber.vn/xcyberbillstore/)
- MISA AMIS cảnh báo NCC rủi ro (R56): [helpact.misa.vn](https://helpact.misa.vn/?p=32001)
- Sapo xử lý HĐ đầu vào: [sapo.vn — tự động xử lý HĐ đầu vào](https://www.sapo.vn/cap-nhat-tinh-nang/tu-dong-xu-ly-hoa-don-dau-vao)
- DN rủi ro cao về thuế: [luatvietnam — tra cứu danh sách](https://luatvietnam.vn/thue-phi-le-phi/huong-dan-tra-cuu-danh-sach-doanh-nghiep-rui-ro-cao-ve-thue-565-97440-article.html), [ketoananpha — 2 cách tra cứu](https://ketoananpha.vn/tra-cuu-doanh-nghiep-rui-ro-cao-ve-thue-hoa-don.html), [MISA AMIS — tổng hợp danh sách](https://amis.misa.vn/?p=295073)
