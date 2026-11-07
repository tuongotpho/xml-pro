# [16] Đăng nhập xong tự ẩn trang cổng, chỉ còn thẻ chọn tháng

07/11/2026 · Tiếp nối [15](15-BAO-CAO-TAI-HOA-DON-TRONG-APP.md) · Nguồn: `XML-Pro.exe` 3.0.7 chạy thật, cổng thuế giả dùng 6 hoá đơn mẫu

## Kết luận

- **Đã làm và build xong.** Đăng nhập xong trang cổng tự ẩn, chỉ còn thẻ chọn tháng nằm trong giao diện XML-Pro.
- **Chạy ngầm không bị chậm:** đo 6 phút 10 giây, nhịp 0,81 giây đều, chậm nhất 0,818 giây.
- **Đã nhấn mạnh việc tự đăng nhập** ở trang chính app, hộp Giới thiệu, trang web, chính sách riêng tư, nội dung Store.
- **Chưa đăng nhập thật, chưa commit, chưa đăng, trang web chưa deploy.**

## 1. Luồng dùng

1. Bấm **Tải từ cổng thuế** ở màn hình đầu, hoặc trong 🧰 Công cụ. Trang đăng nhập thật của cổng hiện ở vùng bên phải.
2. Tự nhập MST, mật khẩu, captcha trên trang đó.
3. App nhận ra đã đăng nhập, trang lùi ra sau. Hiện thẻ chọn tháng của XML-Pro.
4. Bấm **Chọn thư mục và tải**. Tiến độ và kết quả hiện ngay trên thẻ.
5. Bấm **Xem trên Dashboard**.

Thanh trên có **Xem trang cổng**, **Về XML-Pro** và **Đóng và đăng xuất**. Hết phiên thì trang đăng nhập tự hiện lại. Đang tải mà mất phiên thì lượt tải báo xong rồi mới đổi màn hình.

## 2. Cách ẩn

Tôi không ẩn hẳn trang, mà đưa khung cổng xuống **phía sau** trang XML-Pro. Ẩn hẳn thì trình duyệt coi là trang nền và có thể giãn đồng hồ từ phút thứ 5, tải sẽ rất chậm. Nằm phía sau thì trang vẫn được coi là đang hiện.

| Đo khi khung nằm phía sau | Kết quả |
|---|---|
| Thời gian đo | 370 giây, 458 nhịp |
| Nhịp trung bình | 808 ms (đặt 800 ms) |
| Chậm nhất | 818 ms |
| 60 nhịp cuối, sau mốc 5 phút | Chậm nhất 817 ms |

## 3. Lời hứa về mật khẩu và bằng chứng

Câu nói trong giới thiệu: anh chị tự đăng nhập trên trang thật của cổng; XML-Pro không có ô nhập mật khẩu, không đọc, không lưu; đóng là hết phiên.

| Kiểm | Kết quả |
|---|---|
| Mã phần tải có đụng tới ô mật khẩu không | Không (dò trong `tai-hoa-don.js`, `tai-hoa-don-loi.js`) |
| Nhập mật khẩu thử vào cổng giả, chạy cả lượt tải, đóng khung, dò từng byte thư mục dữ liệu app và thư mục tải, cả 2 kiểu mã hoá chữ | **0 tệp chứa mật khẩu** |
| Mở lại khung sau khi đóng | Không còn dữ liệu phiên trước |

Giới hạn của lời hứa: phần tải có đọc **mã phiên** trong bộ nhớ trang để gọi cổng, đúng như extension. Mã này không ghi xuống đĩa và không gửi đi đâu ngoài cổng. Câu giới thiệu nói về mật khẩu nên vẫn đúng, nhưng nếu có người hỏi kỹ thì phải trả lời như vậy.

## 4. Kết quả đo

| Bộ test | Kết quả |
|---|---|
| `kiem-thu-tai-hoa-don.py` (exe thật + cổng giả), 3 lần liền trên bản cuối | **24/24 cả 3 lần** |
| `kiem-thu-so-tay.py` · `kiem-thu-sua-loi.py` · `kiem-thu-vo-webview2.py` | **24/24 · 37/37 · 10/10** |
| Thẻ tải | Rộng 620 px, ô tháng không tràn |
| Hỏi đáp trang web và JSON-LD | Trùng 13/13 |
| Bộ cài 3.0.7 | 19.622.912 byte, phần tải làm tăng 48.128 byte |

## 5. Chưa kiểm được

1. **Đăng nhập và tải thật:** vẫn chưa có lần nào, tôi không đăng nhập thay. Trên cổng thật chưa biết tính năng tự nhận đã đăng nhập có đúng lúc không.
2. **Đối chiếu số:** tháng 10/2026 phải ra 22 hoá đơn, tổng 2.227.597.704 đ.
3. **Trang cổng đang che thông báo:** cổng thật hiện thông báo của Cục Thuế khi mở; đăng nhập xong trang ẩn đi, tôi chưa biết cổng còn hộp thoại nào cần bấm sau đăng nhập không. Nếu có, bấm **Xem trang cổng**.
4. **Hộp chọn thư mục thật** và **tỉ lệ màn hình khác 100%**.
5. Đo nhịp đồng hồ trên cổng giả, chưa đo tốc độ thật của cổng thuế.

## 6. Tự khai

- Một lần test hỏng giữa chừng: app tưởng mất đăng nhập, trang cổng nhảy lên, thẻ tải biến mất. Tôi **không tái tạo được và chưa rõ nguyên nhân gốc**. Đã phòng bằng cách: mất mã đăng nhập phải kéo dài khoảng 3 giây mới coi là hết phiên, và đang tải thì không đổi màn hình. Sau đó 3 lần liền đạt, nhưng chưa chứng minh được lỗi đã hết hẳn.
- Tôi thêm vào mã một lối chỉ dùng cho kiểm thử: biến `XMLPRO_THU_DU_LIEU` để bản test chạy tách riêng, không đụng bản anh đang mở. Máy người dùng không đặt biến này thì app chạy như thường.
- Tính năng ẩn thay thế thẻ trong trang cổng ở báo cáo 15, nên ảnh và mô tả thẻ ở báo cáo 15 không còn đúng.
- Trang web chưa có câu "phần mềm độc lập, không phải của cơ quan thuế" đã nêu ở báo cáo 15.
