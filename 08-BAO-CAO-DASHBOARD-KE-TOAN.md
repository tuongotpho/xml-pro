# [08] Dashboard kế toán mới (ghép "Việc cần làm" + "Sổ sách") — bản 3.0.1

> Ngày 02/11/2026 · Tiếp nối: [07 — Vỏ WebView2](07-BAO-CAO-VO-WEBVIEW2-V3.md) · Xem [00 — Mục lục](00-MUC-LUC-BAO-CAO.md)
> Nguồn dữ liệu: 3 mẫu thiết kế HTML trong `thiet-ke\` (anh chọn ghép C + A); thư mục `HD-TK` (dữ liệu thật năm 2026, không lên git); 6 hoá đơn mẫu trong `mau-xml`.

---

## Kết luận trước

- **Dashboard mới đã vào app 3.0.1.**
  - Phần trên lấy từ phương án C: chọn công ty, dải tóm tắt trạng thái, mỗi kỳ kê khai một thẻ có trạng thái và nút làm ngay.
  - Phần dưới lấy từ phương án A: dải 5 con số, bảng theo kỳ có dòng Cộng, khách hàng và nhà cung cấp.
  - Không emoji, không chữ IN HOA, không nền chuyển màu. Màu chỉ dùng để báo trạng thái: đỏ là lệch thuế, vàng là cần xem lại, xanh là xong, xanh lam là chưa lập.
- **Sửa luôn lỗi số liệu của Dashboard cũ**: Dashboard cũ cộng cả hoá đơn gốc đã bị thay thế. Dashboard mới đi qua đúng hàm chọn hoá đơn của phần đối chiếu và lập tờ khai, nên ba nơi luôn ra cùng một số.
  - Mua vào cả năm: Dashboard mới **3.497.515.467 đ**, Dashboard cũ **3.587.171.467 đ** (dư 89.656.000 đ vì cộng cả HĐ C26TKL-18 đã bị thay thế).
- **Phần đối chiếu thông minh hơn**: tờ khai kê cả hoá đơn đã bị thay thế thì giờ nói thẳng ra. Thẻ quý 1 ghi: "Kê cả HĐ C26TKL-18 ngày 26/02/2026 đã bị thay thế bởi HĐ C26TKL-19: [23] dư 89.656.000, [24] dư 7.172.480". Trước đây chỉ gợi ý chung "có thể thiếu tệp".
- **Đo:**
  - test trang **29/29**, có 2 mục mới cho Dashboard: tổng số khớp phép cộng Python độc lập, có tính việc loại hoá đơn bị thay thế;
  - 4 bộ test cũ: đạt;
  - đã đo độ tương phản chữ ở chế độ sáng và tối: không chỗ nào khó đọc;
  - đã chụp màn hình xem bằng mắt.

## A. Dashboard hiện gì

| Phần | Nội dung |
|---|---|
| Công ty | Nút chọn công ty khi thư mục có nhiều MST: lấy MST có tờ khai 01/GTGT, cộng thêm MST đã cài. Hiện khi có từ 2 công ty trở lên |
| Đầu trang | Tên công ty, MST, khoảng ngày hoá đơn, số hoá đơn còn hiệu lực, số hoá đơn bị thay thế đã loại; nút Tháng / Quý, Xuất Excel, Lập tờ khai |
| Thẻ kỳ (mới nhất ở trên) | **Chưa lập tờ khai**: số hoá đơn, hạn nộp, nút "Lập tờ khai quý …" (hộp lập tờ khai mở sẵn đúng công ty, đúng kỳ) · **Đã xong**: khớp hoá đơn, phụ lục, công thức, đã nộp đủ · **Khớp hoá đơn**: khớp nhưng chưa nạp giấy nộp tiền · **Cần xem lại**: lệch không ảnh hưởng tiền thuế · **Lệch thuế**: lệch ở [24], [25], [31], [33], [35], công thức, hoặc số đã nộp. Mỗi thẻ có nút "Xem tờ khai và đối chiếu" và nút mở hoá đơn nghi ngờ |
| Dải số | Bán ra, thuế đầu ra, mua vào, thuế đầu vào, chênh lệch thuế |
| Bảng theo kỳ | Bán ra, thuế ra, mua vào, thuế vào, chênh lệch, số hoá đơn, trạng thái tờ khai; dòng Cộng; bấm dòng có tờ khai để mở |
| Khách hàng / nhà cung cấp | 6 đối tác lớn nhất, kèm MST, số hoá đơn, tỷ trọng |

**Xem theo tháng khi công ty khai theo quý** (hoặc ngược lại): thẻ ghi "Công ty khai theo quý" và **không hiện nút lập tờ khai**, để tránh lập nhầm tờ khai tháng.

**Khi nào hiện Dashboard mới:** khi hoá đơn / tờ khai thuế là loại chính của thư mục (từ 55% trở lên). Thư mục trộn nhiều ngành (hải quan, BHYT, ngân hàng…) vẫn dùng trang tổng quan cũ. Dashboard của từng ngành khác **chưa làm lại**.

## B. Thay đổi kỹ thuật

- `dashboard-ke-toan.js` (mới): vẽ Dashboard, gắn sự kiện chọn công ty / Tháng-Quý / Lập tờ khai.
- `doi-chieu.js`:
  - `chonHoaDon` trả thêm danh sách hoá đơn bị thay thế trong kỳ;
  - phần gợi ý ưu tiên chỉ ra trường hợp "kê cả hoá đơn đã bị thay thế".
- `index.html`:
  - CSS tiền tố `ktt-` cho Dashboard mới (lúc đầu dùng `kt-` thì trùng với một lớp `.kt-dash` có sẵn, nền trắng cố định, làm hỏng chế độ tối; đã đổi tên);
  - bỏ bảng đối chiếu cũ ở đầu Dashboard (các thẻ kỳ đã thay);
  - hộp lập tờ khai nhận sẵn công ty và kỳ.
- Bộ cài: thêm `dashboard-ke-toan.js` vào danh sách, đã kiểm có trong `CaiDat-XML-Pro-3.0.1.exe`.
- `kiem-thu-sua-loi.py`: thêm mục 7 (Dashboard). `kiem-thu-vo-webview2.py`: **tự dừng nếu XML-Pro đang mở**. Lý do ở mục C.

## C. Sự cố trong lúc làm — tự khai

- Khi chạy lại test phần vỏ, anh đang mở XML-Pro 3.0.0 đã cài. App chỉ cho một cửa sổ, nên bài test đã **gửi nhầm tệp mẫu sang cửa sổ của anh**: 1 hoá đơn mẫu, thư mục `mau-xml` (14 tệp), BCTC TT99 mẫu.
- Các tệp chỉ được mở để xem, không có gì bị sửa hay xoá. Bấm "Xoá" ở thanh bên là sạch.
- Đã sửa: bài test giờ thấy XML-Pro đang mở thì dừng, không gửi gì (đã thử: dừng với mã 2).
- Vì vậy **test phần vỏ chưa chạy lại trên bản 3.0.1**. Phần vỏ không đổi so với 3.0.0 (đã đạt 9/9). Đóng XML-Pro rồi chạy `python kiem-thu-vo-webview2.py` để xác nhận.

## Cần anh

1. Đóng XML-Pro, cài `F:\AI\7.xml-pro-v3\dong-goi\ban-phat-hanh\CaiDat-XML-Pro-3.0.1.exe`, mở thư mục hoá đơn của công ty và xem Dashboard.
2. Nếu ưng, có thể làm lại theo cùng phong cách Dashboard các ngành khác (hải quan, BHYT, ngân hàng, BHXH, đấu thầu) và trang tổng quan đa ngành.
