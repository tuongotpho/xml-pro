# [17] Tải hoá đơn máy tính tiền, tự gõ captcha trong XML-Pro

07/11/2026 · Tiếp nối [16](16-BAO-CAO-TU-AN-TRANG-CONG-THUE.md) · Nguồn: `XML-Pro.exe` 3.0.7, cổng thuế giả, giao thức cửa `/sco-query` đọc từ extension cũ (báo cáo 03 ở `F:/AI/6.chrome-ex`, tệp `background.js`)

## Kết luận

- **Đã làm xong trên cổng giả:** tích **Máy tính tiền mua vào** hoặc **bán ra**, ảnh captcha hiện ngay trên thẻ của XML-Pro để anh tự gõ.
- **Chưa chạy trên cổng thật.** Giao thức lấy từ việc đọc extension cũ, chưa ai thử bằng mã của XML-Pro.
- **Sửa lại số đã báo:** tôi từng nói khoảng 6 lần gõ một tháng. Số đúng theo mã extension cũ là **tháng 31 ngày: bán ra 4 lần, mua vào 12 lần** (tháng 30 ngày: 3 và 9), thêm 1 lần cho mỗi trang kết quả.
- Chưa commit, chưa đăng, trang web chưa deploy.

## 1. Vì sao gõ nhiều như vậy

| Điều kiện của cổng | Hệ quả |
|---|---|
| Mỗi lần tìm tối đa 10 ngày | Tháng 31 ngày chia 4 đoạn (1-10, 11-20, 21-30, 31) |
| Mọi lần tìm phải kèm captcha, kể cả sang trang sau | Thêm 1 lần mỗi trang (mỗi trang 50 hoá đơn) |
| Mua vào phải tìm 3 lượt theo trạng thái xử lý | Gấp 3 lần so với bán ra |

Vì vậy tôi tách 2 ô chọn riêng, mặc định không tích. Không có loại nào thì khỏi gõ. Trước khi tải, nhật ký trên thẻ báo số lần gõ tối thiểu.

## 2. Cách dùng

1. Trên thẻ tải, tích ô máy tính tiền cần lấy, bấm **Chọn thư mục và tải**.
2. Ảnh captcha hiện trên thẻ, gõ 6 ký tự, Enter.
3. Gõ sai thì có ảnh mới, tối đa 3 lần cho mỗi lượt tìm. **Bỏ qua đoạn này** thì đoạn đó được ghi vào danh sách thiếu.
4. Đang xem Dashboard mà có captcha mới, góc phải hiện nút nhắc.
5. Tệp vào `<MST>/MUA-VAO` hoặc `BAN-RA` `/HD-MAY-TINH-TIEN/XML`, tải bù như hoá đơn thường.

XML-Pro không tự giải captcha. Ảnh của cổng chỉ hiện qua thẻ ảnh nên mã trong ảnh không chạy được, đã thử bằng ảnh có gài mã.

## 3. Kết quả đo

| Mục | Kết quả |
|---|---|
| `kiem-thu-tai-hoa-don.py` (exe thật + cổng giả), 4 lần trên bản cuối và gần cuối | **32/32** cả 4 lần |
| 4 hoá đơn máy tính tiền bán ra | Khớp từng byte, 5 lượt tìm |
| Mua vào, tháng 31 ngày | 12 lần gõ; bỏ qua 1 lần thì ghi rõ thiếu |
| Gõ sai | Có ảnh mới ngay, không nghỉ 60 giây |
| Bấm Dừng lúc đang chờ captcha | Dừng ngay, ô gõ biến mất |
| `kiem-thu-so-tay.py` · `kiem-thu-sua-loi.py` | **24/24 · 37/37** |
| `kiem-thu-vo-webview2.py` | **Chưa chạy lại trên bản cuối**, tự dừng vì XML-Pro đang mở. Lần gần nhất 10/10, trước khi thêm phần này |
| Bộ cài 3.0.7 | 19.632.640 byte, tăng 9.728 byte so với báo cáo 16 |

## 4. Chưa kiểm được

1. **Cổng thật:** lời nhắn khi sai captcha, thời hạn của mã, và giới hạn 10 ngày đều lấy từ extension cũ.
2. **Captcha có thể hết hạn trong lúc người dùng gõ:** extension cũ tự giải nên gửi ngay; gõ tay chậm hơn nhiều. Nếu cổng hết hạn quá nhanh sẽ phải sửa.
3. **Cửa này trả chậm:** extension cũ chờ tới 75 giây, app chờ 90 giây.
4. Chưa có số thật để biết lượt mua vào có cần đủ 3 trạng thái không. Nếu một lượt luôn rỗng thì có thể bỏ để bớt gõ.
5. Kết quả đối chiếu tháng 10/2026 (22 hoá đơn, 2.227.597.704 đ) tôi chưa nhận được.

## 5. Tự khai

- Tôi báo sai "khoảng 6 lần gõ" vì chưa đọc lại mã trước khi nói. Sau đó lại ghi 3 và 9, chỉ đúng với tháng 30 ngày; test đo ra tháng 31 ngày cần 4 đoạn nên mới sửa.
- Test phát hiện một lỗi của tôi: captcha đang chờ mà chuyển sang Dashboard thì không có nút nhắc. Đã sửa.
- Một lúc test hỏng hàng loạt do chính trang cổng giả của tôi viết sai. Đó là lỗi của test, không phải của app. Lỗi chập chờn ở báo cáo 16 vẫn chưa rõ gốc; cả 4 lần chạy lần này không gặp lại.
