# [05] Tính năng đối chiếu tờ khai 01/GTGT ↔ hoá đơn ↔ giấy nộp tiền (bản 2.0.3)

> Ngày 02/11/2026 · Tiếp nối: [04 — mục D, đề xuất số 1](04-BAO-CAO-RA-SOAT-GIAO-DIEN-THE-ITAX.md) · Xem [00 — Mục lục](00-MUC-LUC-BAO-CAO.md)
> Nguồn dữ liệu: thư mục mẫu `HD-TK` anh gửi (tờ khai 01/GTGT quý 3/2026 lần đầu + giấy nộp tiền quý 3 + zip 99 hoá đơn tháng 1–10/2026 của MST 2601102955 — **chỉ dùng trên máy, không đưa lên git**); quy tắc tính chỉ tiêu trong app khai thuế của anh (`F:\AI\4.August\apps\khaithue\app\src\core\gtgt.ts`, đã khớp tờ khai HTKK nộp thật); 6 hoá đơn mẫu trong `mau-xml`.

---

## Kết luận trước

- **Đã làm xong theo đúng cách anh mô tả:**
  - Tờ khai do kế toán làm sẵn. Anh kéo cùng lúc tờ khai, hoá đơn (XML hoặc zip) và giấy nộp tiền vào app.
  - App tự ghép theo **MST + kỳ của từng tờ khai**, tự cộng và so sánh.
  - Chỗ nào lệch thì cảnh báo, kèm **hoá đơn nghi ngờ** (bấm vào là mở).
  - Dùng được cho **nhiều công ty cùng lúc** và **cả tháng lẫn quý**.
- **Đo trên dữ liệu thật quý 3/2026:**
  - App ra đúng con số mà tôi cộng bằng một chương trình Python viết riêng.
  - [23] 613.452.567 · [24] 48.879.396 · [32]/[34] 657.612.650 · [33]/[35] 52.609.012, cả 8 dòng phụ lục giảm thuế theo đối tác, 11 công thức số học → **khớp hết**.
  - Phải nộp [40] 3.729.616 = đã nộp theo giấy nộp tiền số 9531196 ngày 06/10/2026.
- **Thử 2 ca lệch giả lập trên chính dữ liệu thật — app chỉ đúng hoá đơn gây lệch:**
  - Bỏ sót 1 hoá đơn mua vào → app chỉ ra "HĐ C26TNV-29 ngày 24/08/2026 (Nam Vương) có đúng 73.301.000 đ — có thể chưa kê", và báo số phải nộp không còn khớp số đã nộp.
  - Kê nhầm 1 hoá đơn quý 2 vào quý 3 → app chỉ ra "HĐ C26TLX-95 ngày 06/04/2026 (ngoài kỳ)…", và bắt được [25] ≠ [24] + [24a].
- **Test 23/23** (thêm 4 mục); 4 bộ test cũ đạt. Bộ cài: `CaiDat-XML-Pro-2.0.3.exe` (đã kiểm có nhúng `doi-chieu.js`).

---

## A. App kiểm những gì

| Nhóm | Kiểm | Lấy từ |
|---|---|---|
| Mua vào | [23] giá trị, [24] thuế | Cộng mọi hoá đơn có **MST người mua** = MST tờ khai, ngày lập trong kỳ |
| Bán ra | [26] KCT · [29] 0% · [30]/[31] 5% · [32]/[33] 10% và hàng giảm còn 8% · [32a] KKKNT · [34]/[35] tổng | Hoá đơn có **MST người bán** = MST tờ khai; tách theo bảng thuế suất ghi trên hoá đơn (`THTTLTSuat`), không đoán theo tỷ lệ |
| Phụ lục giảm thuế (NQ142…) | Từng đối tác: giá trị, thuế (mua vào) / thuế được giảm 2% (bán ra) | Phần 8% của hoá đơn, gom theo tên đối tác (phụ lục không ghi MST). Đối tác có hoá đơn 8% mà phụ lục **không kê** → báo |
| Số học trong tờ khai | 11 công thức: [25], [27], [28], [34], [35], [36], [40a], [41], [40], [43], và [33] = 10% × [32] − thuế được giảm | Chính các chỉ tiêu trên tờ khai |
| Đầu kỳ – cuối kỳ | [22] = [43] tờ khai **lần đầu** kỳ liền trước (cùng MST) | Chỉ kiểm khi có nạp tờ khai kỳ trước |
| Nộp thuế | [40] phải nộp = tổng đã nộp tiểu mục 1701 đúng kỳ (vd "Q3/2026") | Giấy nộp tiền (XML `CHUNGTU`) cùng MST |

**Xử lý hoá đơn đặc biệt:**
- hoá đơn nạp trùng chỉ tính một lần;
- hoá đơn gốc đã có hoá đơn **thay thế** đang nạp thì không tính bản gốc;
- hoá đơn ngoại tệ quy đổi theo tỷ giá ghi trên hoá đơn;
- dung sai làm tròn: tối đa 5 đ, hoặc 1 đ cho mỗi hoá đơn.

**Gợi ý khi lệch:**
- **Hoá đơn nhiều hơn tờ khai:** tìm hoá đơn trong kỳ có đúng số tiền bằng phần lệch → "có thể chưa kê".
- **Tờ khai nhiều hơn hoá đơn:** tìm hoá đơn ngoài kỳ có đúng số đó → "có thể kê vào kỳ này". Không có thì nhắc "có thể thư mục còn thiếu tệp hoá đơn".

## B. Hiện ở đâu

1. **Trên tờ khai:** khung "🔎 Đối chiếu với hoá đơn đã nạp" nằm trên thanh thẻ. Khung **tự mở khi lệch**, thu gọn khi khớp. Dòng lệch tô đỏ, bên dưới là gợi ý có liên kết. Khi in, khung này không bị in ra.
2. **Dashboard:** bảng "Đối chiếu tờ khai 01/GTGT ↔ hoá đơn". Mỗi tờ khai một dòng: người nộp thuế, MST, kỳ, số hoá đơn mua/bán, phải nộp [40] ✔ đã nộp đủ, kết quả. Bấm vào dòng là mở tờ khai. Hợp cho kế toán dịch vụ nạp nhiều công ty một lúc.
3. **Danh sách bên trái:** nhãn **KHỚP HĐ** / **LỆCH HĐ (n)** trên tờ khai.
4. **Excel:** sheet "Đối chiếu tờ khai GTGT", gồm từng chỉ tiêu, từng dòng phụ lục, công thức sai, đầu kỳ, nộp thuế và gợi ý.

Đã đo độ tương phản chữ của khung và bảng ở cả chế độ sáng và tối: không chỗ nào khó đọc.

## C. Giới hạn — nói rõ

- **Lệch chưa chắc là sai:**
  - hoá đơn mua vào được kê ở kỳ sau;
  - hoá đơn không đủ điều kiện khấu trừ bị kế toán loại;
  - [23] có tính hàng nhập khẩu ([23a]) mà app không có tờ khai hải quan để cộng.

  App chỉ chỉ ra chỗ lệch, kế toán quyết định. Chưa có nút "đánh dấu đã giải trình". Nếu anh cần, làm ở bước sau (cần nơi lưu, có thể dùng IndexedDB như phiên làm việc).
- **Mua vào cộng mọi hoá đơn**, kể cả KCT/KKKNT, đúng như app khai thuế của anh đang làm (khớp tờ khai thật quý 3).
- Hiện chỉ đối chiếu **01/GTGT** (phương pháp khấu trừ). Chưa làm 04/GTGT (phương pháp trực tiếp), tờ khai TNCN, TNDN.
- Gợi ý chỉ tìm **một** hoá đơn có đúng số tiền lệch. Lệch do 2–3 hoá đơn cộng lại thì app chỉ báo số lệch, không đoán tổ hợp.
- Phụ lục giảm thuế ghép theo **tên** đối tác. Hoá đơn và tờ khai viết tên khác nhau (viết tắt, sai chính tả) sẽ báo lệch giả. Dữ liệu thật quý 3 khớp tên cả 8 đối tác.

## D. Test

| Mục | Kết quả |
|---|---|
| Tờ khai tháng 10/2026 dựng từ 6 hoá đơn mẫu trong repo (đáp án tính bằng Python độc lập) | ✔ khớp: 2 mua, 4 bán, 2 dòng phụ lục, 11 công thức |
| Cùng tờ khai nhưng bỏ sót HĐ C26TNA-19 | ✔ báo lệch [32]–[35], chỉ đích danh C26TNA-19 |
| Khung trên tờ khai tự mở khi lệch; bảng Dashboard 2 dòng; nhãn KHỚP / LỆCH | ✔ |
| Dữ liệu thật `HD-TK` (chỉ chạy khi máy có thư mục này) | ✔ khớp + đã nộp đủ |
| Toàn bộ `kiem-thu-sua-loi.py` | **23/23**, mã thoát 0 |
| 4 bộ test cũ | đạt |

## Cần anh

- Cài `dong-goi\ban-phat-hanh\CaiDat-XML-Pro-2.0.3.exe`, kéo thư mục một quý thật (một hoặc nhiều công ty) vào, xem khung đối chiếu và bảng Dashboard có dễ hiểu với kế toán không.
- Nếu muốn có nút "đã giải trình" cho các chỗ lệch hợp lệ, hoặc đối chiếu thêm 04/GTGT, TNCN: báo tôi.
