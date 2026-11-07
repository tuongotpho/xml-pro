# [18] Nút tải ở trang chủ và Kho hoá đơn (3 giai đoạn đầu)

07/11/2026 · Tiếp nối [17](17-BAO-CAO-TAI-HOA-DON-MAY-TINH-TIEN.md) · Nguồn: mã `kho-hoa-don.js`, 6 hoá đơn mẫu, cổng thuế giả, 50.000 bản ghi giả lập để đo tốc độ

## Kết luận

- **Trang chủ** có khối **Tải hoá đơn từ cổng thuế** nổi bật. Thanh bên luôn có nút **Tải hoá đơn** và **Kho hoá đơn**.
- **Đã làm 3 trong 4 giai đoạn:** Kho hoá đơn, theo dõi công việc, đối soát với cổng thuế. Giai đoạn 4 (tra MST đối tác, công nợ) để sau, lý do ở mục 5.
- Kho 50.000 hoá đơn mở trong **1,3 giây**, lọc trong **0,1 giây**.
- **Chưa thử trên dữ liệu thật và cổng thật. Chưa commit, chưa đăng, trang web chưa deploy.**

## 1. Kho hoá đơn hoạt động thế nào

- Hoá đơn tải về hoặc mở từ thư mục **tự vào kho**. Mở lại app là có sẵn, trang chủ báo số hoá đơn đang có.
- Kho là **bảng chỉ mục** trên máy này (IndexedDB): số, ngày, đối tác, tiền, đường dẫn. **Tệp XML vẫn là bản gốc** trong thư mục, app không sửa.
- Kho không chứa nội dung XML nên không còn giới hạn 1.500 hồ sơ như phiên làm việc.
- Công ty chủ lấy theo nhãn Mua vào / Bán ra, nên một kho chứa được nhiều công ty.

## 2. Theo giai đoạn

| Giai đoạn | Làm được |
|---|---|
| **1. Kho** | Lọc theo công ty, tháng, chiều, trạng thái; tìm theo số, tên, MST, ghi chú; cộng tiền theo bộ lọc, bỏ hoá đơn bị thay thế; xuất Excel đúng các dòng đang lọc; bấm số hoá đơn mở tệp gốc |
| **2. Theo dõi** | Đánh dấu hàng loạt: Đã hạch toán, Đã thanh toán, Cần xem; ghi chú ngay trên dòng; kỳ khoá sổ được bỏ qua; **Sao lưu, Phục hồi** kho và sổ tay ra một tệp `.json` |
| **3. Đối soát** | Mỗi lần tải tự so danh sách cổng với kho. Có thêm ô **Chỉ đối soát với Kho, không tải XML**. Nhãn đỏ: có trên cổng chưa có XML, cổng báo bị huỷ / thay thế / điều chỉnh, lệch tiền, không thấy trên cổng. Lọc **Lệch với cổng thuế**. Báo riêng số hoá đơn thuộc kỳ đã khoá sổ |

Tính năng khoá sổ ở báo cáo 14 mới biết khi nạp thêm tệp. Đối soát bổ sung việc biết cả khi **cổng** thay đổi, ví dụ người bán huỷ hoá đơn sau khi đã nộp tờ khai.

## 3. Kết quả đo

| Bộ test | Kết quả |
|---|---|
| `kiem-thu-kho.py` (mới) | **22/22** |
| `kiem-thu-tai-hoa-don.py` (exe thật + cổng giả) | **33/33** |
| `kiem-thu-so-tay.py` · `kiem-thu-sua-loi.py` | **24/24 · 37/37** |
| `kiem-thu-vo-webview2.py` | **Chưa chạy lại**, tự dừng vì XML-Pro đang mở; lần gần nhất 10/10 từ trước phần máy tính tiền |
| Tiền trên màn Kho so với Python đọc XML | Khớp: bán ra 1.046.895.000 / 83.751.600; mua vào 123.520.096 / 9.817.600 |
| Xoá hết rồi phục hồi từ tệp sao lưu | Đủ 6 dòng, đủ ghi chú; tệp không có mật khẩu, mã phiên |
| 50.000 bản ghi giả lập | Ghi 8,1 giây; mở 1.271 ms; lọc 97 ms |
| Bộ cài 3.0.7 | 19.664.384 byte, tăng 31.744 byte so với báo cáo 17 |

## 4. Chưa kiểm được

1. **Đối soát trên cổng thật:** mã trạng thái `tthai` lấy từ extension cũ. Cần thử một tháng có hoá đơn đã huỷ hoặc thay thế.
2. **Nhãn "Không thấy trên cổng":** chỉ hiện khi danh sách cổng lấy đủ. Hoá đơn máy tính tiền chỉ so khi anh tích ô máy tính tiền, tránh báo nhầm. Có thể còn trường hợp báo nhầm trên dữ liệu thật.
3. **Nhiều công ty thật:** nhận công ty chủ dựa vào nhãn Mua vào / Bán ra. Hoá đơn của công ty chưa cài MST có thể xếp vào bên mua.
4. **Đánh dấu không gắn với tờ khai:** "đã kê khai" tôi chưa làm vì tờ khai không ghi theo từng hoá đơn; dùng khoá sổ cho việc đó.
5. **Cửa sổ hẹp** khoảng 1.000 px: bảng phải cuộn ngang mới thấy cột Ghi chú. Cửa sổ phóng to thì đủ.
6. Tốc độ 50.000 hoá đơn đo trên bản ghi giả lập; xoá tệp XML thì dòng vẫn còn trong kho, bấm mở sẽ báo không mở được.

## 5. Giai đoạn 4 để sau

Tra trạng thái MST đối tác phải gửi MST ra ngoài (cổng tra cứu của cơ quan thuế hoặc trang bên thứ ba), và công nợ cần anh chốt phạm vi để khỏi thành phần mềm kế toán. Nên làm sau khi anh dùng thật 3 giai đoạn này.

## 6. Tự khai

- Bước đầu tôi để sót nút tải cũ, thành 2 nút trùng mã ở trang chủ. Đã bỏ.
- Nút tải ở thanh bên làm giảm tương phản ở chế độ tối, test hồi quy phát hiện, đã sửa.
- Kho 50.000 hoá đơn ban đầu mở mất 3,5 giây do cách sắp xếp, đã sửa còn 1,3 giây. Phép đo đầu tiên của tôi cũng sai, đo ra 0 ms do đọc nhầm bảng cũ.
- Tôi đã khuyên commit 3.0.7 trước khi làm việc lớn, nhưng hiện các thay đổi vẫn chưa vào git, khoảng 33 tệp đang chờ.
