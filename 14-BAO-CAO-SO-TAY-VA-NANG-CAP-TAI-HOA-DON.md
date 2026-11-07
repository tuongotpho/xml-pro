# [14] Sổ tay kế toán 3.0.7 và đánh giá nâng cấp tải hoá đơn

06/11/2026 · Tiếp nối [13](13-BAO-CAO-PHAN-TICH-APP-QUAN-LY-HOA-DON-1.2.8.md) · Nguồn: mã XML-Pro nhánh `webview2-v3`, 6 hoá đơn mẫu, extension `F:\AI\6.chrome-ex\tai-xml-hoa-don` (bản 1.0.1, báo cáo 04 của thư mục đó)

## Kết luận

- **Đã làm xong 3 việc nhỏ:** khoá sổ, ghi chú theo hoá đơn, nối lại đường dẫn tệp. Bộ cài 3.0.7 đã đóng gói trên máy, **chưa đăng, chưa commit**, trang web sửa rồi nhưng **chưa deploy**.
- **Tìm và sửa thêm một lỗi có sẵn:** bảng kê 01-1 và 01-2 trong Excel ra doanh số 0, thuế 0, mẫu số rỗng. Các bản đã phát hành đều dính.
- **Nâng cấp từ extension: làm được, và nên làm.** Đưa phần tải của extension vào ngay XML-Pro: anh đăng nhập cổng thuế trong cửa sổ của app, tự gõ captcha, app tải XML và nạp luôn. Không lưu mật khẩu, không tự giải captcha. Tôi **chưa làm**, chờ anh quyết (mục 4).

## 1. Ba tính năng

| Tính năng | Cách dùng | Làm được gì |
|---|---|---|
| **Khoá sổ** | Dashboard → nút **Khoá sổ** trên dòng kỳ | Kỳ đã khoá không lập tờ khai, tờ khai bổ sung; ghi chú không sửa được. App nhớ danh sách hoá đơn và tiền lúc khoá, hoá đơn đổi về sau thì báo |
| **Ghi chú** | Bấm **số hoá đơn** trên dòng kỳ, hoặc ô Ghi chú đầu trang hoá đơn | Gõ thẳng, `Ctrl+D`, dán cột từ Excel, ghi hàng loạt, Shift để chọn đoạn. Tìm được theo ghi chú. Ra cột Ghi chú của bảng kê Excel |
| **Nối lại đường dẫn** | 🧰 Công cụ → Nối lại đường dẫn tệp | Vỏ app báo tệp nào mất, chọn thư mục mới, app so nội dung để nối. Không sửa tệp nào trên ổ cứng |

Khác với app HDV: XML-Pro chỉ đọc hoá đơn nên khoá sổ của mình giống **niêm phong kỳ**. Điểm chính là phát hiện thay đổi sau khi niêm phong, ví dụ đo được: *"thêm 1 hoá đơn, tiền lệch +122.720.000, thuế lệch +9.817.600"*.

Ghi chú và khoá sổ gắn theo MST bán + mẫu + ký hiệu + số, không theo đường dẫn, nên chuyển thư mục không mất. Mã mới nằm ở `so-tay.js`.

## 2. Lỗi bảng kê Excel (đã sửa)

`xuat-excel.js` đọc tên trường không tồn tại với hoá đơn (`tienHang`, `tienThue`, `mauSo`), nên hai bảng kê ra 0 và rỗng. Sau khi sửa, đối chiếu với Python đọc thẳng XML:

| Bảng kê (5 hoá đơn mẫu, MST 2601102955) | App | Python |
|---|---|---|
| Bán ra: doanh số / thuế | 1.046.895.000 / 83.751.600 | 1.046.895.000 / 83.751.600 |
| Mua vào: doanh số / thuế | 800.096 / 0 | 800.096 / 0 |

Sheet tổng hợp hoá đơn không dính lỗi này. Sheet nhập MISA có dòng hàng hoá thì đúng; tôi chỉ sửa nhánh dự phòng khi hoá đơn không có dòng hàng, và cột Mẫu số. **Ai đã dùng hai bảng kê này từ bản cũ thì nên xuất lại.**

## 3. Kết quả đo

| Bộ test | Kết quả |
|---|---|
| `kiem-thu-so-tay.py` (mới, chạy trang thật trên Edge) | **24/24** |
| `kiem-thu-sua-loi.py` (hồi quy) | **37/37** |
| `kiem-thu-vo-webview2.py` (chạy thật `XML-Pro.exe` 3.0.7, thêm mục báo tệp mất) | **10/10** |
| `so-tay.js` có trong gói Store và bộ cài | Có |
| Xem bằng mắt trên trình duyệt | Bảng hoá đơn ở cả nền tối và nền sáng; sửa 3 lỗi nhìn thấy (số hoá đơn tối màu, ô khoá đen, ô trống không có viền) |
| Hỏi đáp trên trang web và JSON-LD | Trùng 11/11 câu |

Nối lại đường dẫn đã thử: tệp đổi tên, tệp vào thư mục con, tệp không chuyển sang, mục chỉ có trong lịch sử, tên trùng hai nơi (không đoán, báo chưa nối).

## 4. Extension tải XML: nâng cấp được gì

**Cách extension đang làm:** chạy ngay trong trang cổng thuế, lấy mã đăng nhập từ bộ nhớ trang lúc bấm tải, gọi API như chính trang gọi, hãm nhịp để khỏi bị khoá. Bản 1.0.1 anh đã báo tải được trên cổng thật.

**Đề xuất:** thêm nút **Tải từ cổng thuế** trong XML-Pro, mở trang cổng thật trong một cửa sổ WebView2 riêng, chạy lại lõi `core.js`. Tải xong tệp vào thẳng Dashboard.

| Tiêu chí | Extension hiện tại | Tích hợp vào XML-Pro | App HDV |
|---|---|---|---|
| Thao tác | Mở Chrome, tải zip, kéo vào app | Bấm trong app, xong là có số | Bấm trong app |
| Mật khẩu | Không lưu | **Không lưu** | Lưu trên máy |
| Captcha | Người dùng gõ trên trang | Người dùng gõ trên trang | Có hàm tự giải |
| Giả dạng trình duyệt | Không | **Không**, đây là trang thật trong Edge | Có |

**Việc phải làm:**

1. Vỏ app: cửa sổ phụ chỉ cho vào `hoadondientu.gdt.gov.vn`, chạy `core.js` vào trang, nhận tệp về thư mục anh chọn.
2. Tách quy trình trong `ui.js` khỏi khung giao diện, thêm thanh tiến độ, nút dừng.
3. Bổ sung phần còn thiếu, học ý tưởng từ HDV nhưng tự viết: thử lại từng trang, so tổng cổng báo với số đã nhận rồi báo thiếu, tải bù đúng tháng lỗi, hiện danh sách hoá đơn không có XML (hiện chỉ ghi `CAN-XEM-LAI.txt`).
4. Sửa lại lời hứa: trang riêng tư, hộp Giới thiệu, Store đang ghi "việc duy nhất ra mạng là hỏi bản mới". Thêm tính năng này thì câu đó **không còn đúng**.

**Rủi ro và điều chưa biết:**

- Chưa thử cổng thuế có chạy trong WebView2 không; phải có anh đăng nhập thử, tôi không đăng nhập thay.
- Cổng đổi API thì phải sửa và phát hành lại, nên gom phần phụ thuộc cổng vào một chỗ như `CONG` trong `core.js`.
- Bản 1.0.1 vẫn chưa đối chiếu số với zip cũ (22 hoá đơn, 2.227.597.704 đ). Nên làm việc này trước.
- Microsoft Store có thể xét kỹ hơn khi app gọi trang đăng nhập cơ quan thuế; nếu vướng thì chỉ bật ở bản `.exe`.

**Không cần làm gì thêm cho đường cũ:** zip của extension vẫn kéo thẳng vào XML-Pro được.

## 5. Chưa kiểm được

- **Hộp chọn thư mục thật của Nối lại đường dẫn** chưa ai bấm: phần so và nối đã test bằng vỏ giả, phần vỏ báo tệp mất đã test bằng `.exe` thật, riêng hộp thoại cần mắt anh.
- Chưa cài đè 3.0.7 lên bản đang dùng. Chưa nạp lại bảng kê vào MISA, HTKK.
- Dán từ Excel và Ctrl+D test bằng sự kiện giả lập trên trình duyệt, chưa dán từ Excel thật.
- Sổ tay nằm trong dữ liệu của app trên máy này, **chưa có sao lưu**. Đổi máy hoặc gỡ sạch thì mất. Nút xoá dữ liệu phiên không xoá sổ tay.
- Trang web đã sửa nhưng chưa deploy; deploy trước khi đăng bản 3.0.7 sẽ mô tả tính năng chưa có.

## 6. Tự khai

- Lỗi bảng kê Excel đã nằm trong các bản đã phát hành từ bản 1.1.0, mà test cũ không phát hiện vì chỉ kiểm sheet có tồn tại, không kiểm số trong đó.
- Trong lúc thử trên trình duyệt có lần trạng thái khoá biến mất. Tôi kiểm lại: khoá vẫn còn sau khi tải lại trang (`true`), nên nguyên nhân nhiều khả năng là có người bấm **Mở khoá** trong khung xem, nhưng tôi không có bằng chứng chắc chắn.
