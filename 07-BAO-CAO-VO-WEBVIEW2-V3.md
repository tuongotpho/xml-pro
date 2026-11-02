# [07] XML-Pro 3.0.0 — vỏ phần mềm Windows bằng WebView2 (và 2 phát hiện trên tờ khai thật)

> Ngày 02/11/2026 · Tiếp nối: [06 — Lập tờ khai 01/GTGT](06-BAO-CAO-LAP-TO-KHAI-01GTGT.md) · Xem [00 — Mục lục](00-MUC-LUC-BAO-CAO.md)
> Nguồn dữ liệu: lịch sử git (kiểm bản 2.0 của Gemini có WebView2 hay không); WebView2 Runtime 156 trên máy; 3 thư viện WebView2 1.0.3856.49 lấy từ máy (có chữ ký số Microsoft, không tải mạng); chạy thật `XML-Pro.exe` 3.0.0; thư mục `HD-TK` (không lên git).
> Làm ở thư mục riêng `F:\AI\7.xml-pro-v3`, nhánh `webview2-v3`. Bản 2.0.4 giữ nguyên ở `F:\AI\7.xml-pro` và thẻ git `v2.0.4`.

---

## Kết luận trước

- **Bản 2.0 của Gemini không hề dùng WebView2.**
  - Lịch sử git không có commit nào, code không có thư viện nào.
  - Bản đó chỉ mở cửa sổ Edge thường (`msedge --app`) kèm một máy chủ nội bộ, chính là máy chủ đã gỡ ở 2.0.1.
- **XML-Pro 3.0.0 giờ là cửa sổ phần mềm Windows thật**, nhúng WebView2:
  - không còn chữ "file:///" và **không còn popup hỏi quyền**;
  - chọn tệp, chọn thư mục, lưu tệp đều bằng hộp thoại Windows;
  - chuột phải thư mục → "Mở bằng XML-Pro";
  - chỉ một cửa sổ, mở thêm thì vào tab mới.
- **Dung lượng:** bộ cài 18.965 KB so với 18.108 KB của 2.0.4, tức **+857 KB (+4,7%)**. Gemini nói "không tăng" là gần đúng, nhưng không phải bằng 0. Phần lõi WebView2 có sẵn trong Windows nên không đóng gói theo.
- **Đo:**
  - test riêng cho vỏ (chạy thật exe, nối vào trang bên trong): **9/9**;
  - toàn bộ test trang: **27/27** (kể cả dữ liệu thật);
  - 4 bộ test cũ: đạt;
  - đã chụp riêng cửa sổ chính và hộp chọn thư mục để xem bằng mắt.
- **Phát hiện ngoài lề, cần anh xem** (mục B): tờ khai thật quý 1 và quý 2/2026 trong `HD-TK` **lệch so với hoá đơn**. Quý 1 **kê cả hoá đơn đã bị thay thế → khấu trừ thừa 7.172.480 đ** (đã đính chính nhận định ban đầu).

---

## A. Vỏ WebView2 — làm gì, an toàn thế nào

| Việc | Cách làm | Đã đo |
|---|---|---|
| Cửa sổ | WinForms + WebView2. Trang ở `https://xml-pro.example`: địa chỉ ảo, trỏ thẳng vào thư mục cài, không ra mạng | ✔ trang chạy ở `https://xml-pro.example`, tiêu đề cửa sổ theo tài liệu đang xem |
| Chọn tệp / thư mục | Trang nhờ vỏ mở hộp thoại Windows (thư mục dùng hộp kiểu mới `IFileOpenDialog`, Windows nhớ chỗ chọn lần trước) | ✔ ảnh chụp hộp "Chọn thư mục hoá đơn / tờ khai", nút "Chọn thư mục này" |
| Trang đọc tệp | Mỗi tệp người dùng đã chọn / bấm đúp / "Mở bằng" được cấp **một mã ngẫu nhiên**; trang tải qua `https://tep.xml-pro.example/<mã>`. Không có mã thì không đọc được | ✔ mã bịa → 404; `file:///C:/Windows/win.ini` → bị chặn; gọi ra mạng → bị chặn |
| Rời khỏi trang | Mọi điều hướng ra ngoài địa chỉ nội bộ bị huỷ; liên kết http/https (vd tra cứu hoá đơn trên cổng thuế) mở bằng trình duyệt mặc định | ✔ thử chuyển sang `file:///C:/Windows/` → vẫn ở trang |
| Một cửa sổ | Khoá riêng + kênh nội bộ của Windows (named pipe, chỉ tài khoản đang dùng) | ✔ chạy lần 2 với thư mục 14 tệp: thoát sau 0,2 s, tệp vào cửa sổ đang mở, chỉ 1 tiến trình |
| Chuột phải thư mục | Đăng ký `Directory\shell` và `Directory\Background\shell` → "Mở bằng XML-Pro"; vỏ quét mọi .xml, .zip kể cả thư mục con | ✔ tệp giữ đường dẫn "mau-xml/…" cho cây thư mục |
| Lịch sử → mở lại | Vỏ đọc lại theo đường dẫn (chỉ .xml / .zip còn tồn tại) | ✔ tệp còn → mở được; tệp mất → báo rõ |
| Lưu tệp | Xuất Excel / XML tờ khai / .ps1 / ZIP → hộp "Lưu thành" của Windows | ✔ Excel lưu thành tệp thật (khi test thì lưu thẳng, không mở hộp) |
| Tờ khai iTax | Không đổi | ✔ BCTC TT99 mở từ Explorer: 3 biểu, 3 thẻ |
| Máy chưa có WebView2 | Tự quay về cách mở bằng cửa sổ Edge như 2.0.4 | Chỉ kiểm bằng đọc mã (máy này có WebView2) |

Ba thư viện WebView2 (Core, WinForms, Loader x64) được kiểm **chữ ký số Microsoft mỗi lần đóng gói**: nếu chữ ký hỏng, quá trình đóng gói dừng lại.

## B. Phát hiện trên tờ khai thật (thư mục HD-TK, anh mới bỏ thêm quý 1–2)

Lệch chưa chắc là sai. Dưới đây là số liệu app đo được, để anh hoặc kế toán xem lại.

**Quý 2/2026** (tờ khai lần đầu, [22] = [43] quý 1 = 6.770.539 ✔):
- [23] trên tờ khai **nhiều hơn hoá đơn 600.036 đ**. App chỉ ra **HĐ C26TMA-15367 ngày 02/07/2026** (Vận tải ô tô Phú Thọ, hàng KKKNT) có đúng số đó. Hoá đơn ngày 02/07 thuộc quý 3, và tờ khai quý 3 **cũng đã kê** nó, nghĩa là **kê ở cả hai quý**. Thuế 0 đ nên không ảnh hưởng tiền thuế, chỉ sai giá trị [23].
- **Phụ lục giảm thuế, phần mua vào, để trống**, trong khi trong kỳ có hàng 8% mua của 4 người bán: VNG 236.327.000 đ, Mạnh Vinh 13.810.150 đ, KG Home 5.315.000 đ, Đăng kiểm 19-01V 227.273 đ.

**Quý 1/2026** (tệp `842-1.007014-20260501083733.xml`, lần đầu):
- [23] **nhiều hơn hoá đơn 89.656.000 đ**, [24] **nhiều hơn 7.172.480 đ**.
- ⚠️ **Đính chính (cùng ngày, khi dựng mẫu Dashboard):** bản đầu của báo cáo này đoán "có thể tệp zip thiếu hoá đơn" — **đoán sai**. Kiểm lại zip thì thấy:
  - HĐ **C26TKL-18** ngày 26/02/2026 của Bảo Khánh Linh (89.656.000 đ, thuế 7.172.480 đ) **đã bị thay thế** bởi HĐ **C26TKL-19** ngày 27/02/2026 (95.256.000 đ, thuế 7.620.480 đ). Hoá đơn 19 ghi rõ là hoá đơn thay thế cho hoá đơn 18.
  - Phụ lục của tờ khai kê Bảo Khánh Linh 184.912.000 đ = 89.656.000 + 95.256.000, tức là **kê cả hoá đơn gốc đã bị thay thế**. Như vậy quý 1 **khấu trừ thừa 7.172.480 đ thuế GTGT** trên một hoá đơn không còn hiệu lực.
  - Bản quý 1 do app khai thuế lập (`Downloads°1102955000-01_GTGT_TT80-Q12026-L00.xml`) có [23] = 1.634.134.094, [24] = 131.639.819: **đúng** (đã loại hoá đơn bị thay thế). Bản lệch là bản tải từ eTax.
- Phụ lục còn kê **Thanh Bình Phú Thọ 45.454.545 đ, thuế 4.545.455 đ** (tức 10%) ở mục hàng 8%, mà thư mục không có hoá đơn 8% nào của bên này.
- **Dashboard hiện tại cũng cộng cả hoá đơn bị thay thế** (mua vào cả năm hiện 3.587.171.467 thay vì 3.497.515.467). Lỗi này sẽ sửa khi làm lại Dashboard.

Bộ test đã sửa cho đúng ý: chỉ đòi **quý 3 khớp và đã nộp đủ**; các kỳ khác chỉ cần đối chiếu chạy được và liệt kê kết quả. Phần lập lại tờ khai chỉ so từng ô với tờ khai khớp hoá đơn (quý 3: vẫn 109/109).

## C. Giới hạn và chỗ chưa kiểm được

- **Chưa cài thử bộ cài 3.0.0 vào máy**, vì sẽ đè bản 1.7.7 đang dùng. Đã kiểm bộ cài có đủ tệp nhúng.
- **Hộp "Lưu thành", hộp chọn tệp, hộp in:** đã viết, chạy qua code, nhưng chưa xem bằng mắt. Mới xem bằng mắt hộp chọn thư mục.
- **Máy không có WebView2** (Windows 10 rất cũ chưa cập nhật): đường quay về cửa sổ Edge chỉ kiểm bằng đọc mã.
- **Dữ liệu cũ không tự chuyển sang:** MST đã cài, lịch sử tệp, phiên làm việc, thông tin doanh nghiệp đã lưu nằm trong hồ sơ Edge của bản cũ, theo địa chỉ `file:///`. Bản 3 dùng địa chỉ mới nên bắt đầu trống, cần cài lại MST một lần.
- `dong-goi\chay-thu.ps1` (chạy thử bản nguồn) vẫn mở bằng Edge như cũ. Muốn chạy thử vỏ mới thì đóng gói rồi chạy `ban-phat-hanh\XML-Pro.exe`.
- Không dùng chế độ quản trị: vẫn cài cho riêng tài khoản, như cũ.

## D. Tệp thay đổi

- `dong-goi/VoWebView2.cs` (mới): vỏ WebView2, kênh một cửa sổ, phục vụ tệp theo mã, hộp chọn thư mục Windows, lưu tệp.
- `dong-goi/XemXmlThue.cs`: cách mở bằng Edge của 2.0.4, giờ là đường dự phòng (`KhoiDongEdge`).
- `dong-goi/Chung.cs`: thêm/gỡ "Mở bằng XML-Pro" khi chuột phải thư mục.
- `dong-goi/dong-goi.ps1`, `CaiDat.cs`: biên dịch 64-bit với thư viện WebView2, kiểm chữ ký số, nhúng vào bộ cài.
- `dong-goi/webview2/`: 3 thư viện của Microsoft (831 KB).
- `index.html`: nếu chạy trong vỏ thì nút chọn tệp/thư mục và "mở lại" đi qua vỏ; CSP thêm đúng một địa chỉ nội bộ `https://tep.xml-pro.example`. Mở bằng trình duyệt thường thì chạy như cũ.
- `kiem-thu-vo-webview2.py` (mới, 9 mục); `kiem-thu-sua-loi.py`: CSP mới, tìm `HD-TK` qua biến `XMLPRO_HD_TK`, điều kiện dữ liệu thật như mục B.

## Cần anh

1. Cài `F:\AI\7.xml-pro-v3\dong-goi\ban-phat-hanh\CaiDat-XML-Pro-3.0.0.exe`, rồi thử chuột phải một thư mục hoá đơn → "Mở bằng XML-Pro"; thử Xuất Excel, In / Lưu PDF. Không ưng thì cài lại `CaiDat-XML-Pro-2.0.4.exe` ở `F:\AI\7.xml-pro\dong-goi\ban-phat-hanh`.
2. Xem hai phát hiện ở quý 1, quý 2 (mục B) với kế toán: có cần khai bổ sung không.
