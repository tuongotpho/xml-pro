# [15] Tải hoá đơn từ cổng thuế ngay trong XML-Pro

07/11/2026 · Tiếp nối [14](14-BAO-CAO-SO-TAY-VA-NANG-CAP-TAI-HOA-DON.md) · Nguồn: extension `F:\AI\6.chrome-ex\tai-xml-hoa-don` 1.0.1, `XML-Pro.exe` 3.0.7 chạy thật, cổng thuế giả dùng 6 hoá đơn mẫu, trang công khai của `hoadondientu.gdt.gov.vn` (không đăng nhập)

## Kết luận

- **Đã làm xong, cổng thuế nằm ngay trong cửa sổ XML-Pro**, không mở cửa sổ riêng. Thanh bên vẫn dùng được.
- **Đã mở được trang thật của cổng thuế trong app, khung tải gắn vào đúng, nhưng chưa đăng nhập, chưa tải thật.** Việc này cần anh làm, tôi không đăng nhập thay.
- Bộ cài 3.0.7 tăng **43,5 KB** vì tính năng này, đúng khoảng đã ước tính 30–50 KB.
- **Chưa commit, chưa đăng, trang web chưa deploy.**

## 1. Cách dùng

1. **🧰 Công cụ → ⬇ Tải hoá đơn từ cổng thuế.** Trang cổng hiện ở vùng bên phải của app.
2. Tự đăng nhập, tự gõ captcha.
3. Khung góc phải: chọn tháng, Mua vào / Bán ra, bấm **Chọn thư mục và tải**.
4. Tệp lưu vào `<thư mục>\<MST>\MUA-VAO\...` và `BAN-RA\...`, tự nạp vào app. Bấm **Xem trên Dashboard** để xem.

Thanh trên cùng có **Về XML-Pro** (giữ phiên, chọn lại mục Công cụ để quay về) và **Đóng và đăng xuất** (hết phiên).

## 2. Đã tốt hơn extension ở đâu

| Việc | Extension 1.0.1 | XML-Pro 3.0.7 |
|---|---|---|
| Kết quả | Một tệp zip, tự kéo vào app | Tệp vào thư mục, nạp thẳng vào app |
| Dừng hoặc hết phiên giữa chừng | Mất, chưa tạo tệp | Giữ tệp đã tải, tải lại là tải tiếp |
| Tải lại tháng cũ | Tải lại từ đầu | Chỉ tải hoá đơn còn thiếu, không ghi đè |
| Danh sách thiếu so với số cổng báo | Không so | Tìm lại 1 lần, vẫn thiếu thì ghi rõ |
| XML lỗi | Ghi lại | Thử lại 1 lượt cuối, rồi ghi rõ |
| Nhiều công ty | Một tệp zip theo lần tải | Mỗi MST một thư mục |

Giữ nguyên: nhịp gọi cổng (khoảng 1 giây một hoá đơn, tối đa 400 lần trong 10 phút), không lưu mật khẩu, không tự giải captcha, không giả dạng trình duyệt. Trang chạy trong WebView2 của Windows nên cổng thấy đúng là Edge.

## 3. An toàn

- Khung cổng ở **chế độ riêng tư**: đóng là hết phiên. Đã đo: mở lại không còn dữ liệu phiên trước.
- Trang cổng là nội dung bên ngoài nên vỏ app kiểm mọi lệnh: chỉ nhận từ đúng địa chỉ cổng, chỉ ghi trong thư mục anh chọn, chỉ đuôi `.xml`, `.xlsx`, `.txt`, tệp tối đa 30 MB, không ghi đè.
- Khung chỉ được đi trong các tên miền `gdt.gov.vn`. Liên kết ngoài mở bằng trình duyệt của anh.
- Đã sửa lời cam kết "việc duy nhất ra mạng" ở trang chính app, hộp Giới thiệu, trang web, chính sách riêng tư, nội dung Store, README.

## 4. Kết quả đo

| Mục | Kết quả |
|---|---|
| `kiem-thu-tai-hoa-don.py` (mới, `XML-Pro.exe` thật + cổng giả) | **21/21** |
| 6 tệp XML tải về so với hoá đơn gốc | **Khớp từng byte 6/6**, 26 giây |
| Xoá 1 tệp rồi tải lại | Tải mới 1, bỏ qua 5 |
| Vùng cổng so với vùng nội dung của app | Khớp 1580×961 |
| Thẻ tải | Rộng 500 px (trước 370 px), ô tháng không tràn, đo cả trên trang thật |
| Trang công khai cổng thuế thật trong app | Mở được; khung tải có; tìm thấy kho mã đăng nhập `authReducer` của trang |
| `kiem-thu-so-tay.py` · `kiem-thu-sua-loi.py` · `kiem-thu-vo-webview2.py` | **24/24 · 37/37 · 10/10** |

| Bộ cài | Dung lượng |
|---|---|
| 3.0.6 | 19.538.944 byte |
| 3.0.7 có sổ tay | 19.574.784 byte |
| 3.0.7 có sổ tay + tải hoá đơn | 19.619.328 byte (**+44.544 byte**) |

## 5. Chưa kiểm được

1. **Đăng nhập và tải thật.** Chưa có lần tải nào trên cổng thật từ trong app. Lời gọi API dùng lại đúng cách của extension 1.0.1, nhưng cổng có chấp nhận từ khung này không thì phải thử.
2. **Đối chiếu số:** tải tháng 10/2026, phải ra 22 hoá đơn, tổng 2.227.597.704 đ như zip cũ.
3. **Hộp chọn thư mục thật:** test tự động dùng thư mục đặt sẵn.
4. Khi về XML-Pro giữa lúc đang tải, Windows có thể làm chậm khung đang ẩn. Tải vẫn chạy nhưng tôi chưa đo tốc độ lúc đó.
5. Máy đặt tỉ lệ màn hình khác 100%: chưa thử nhiều mức. Nếu khung lệch vị trí thì báo tôi.
6. Thẻ tải có thể che một phần trang đăng nhập. Bấm **×** để thu gọn.
7. Chưa gồm hoá đơn máy tính tiền bán ra, vì cổng đòi captcha từng lần.
8. Microsoft Store có thể xét kỹ hơn khi app mở trang đăng nhập cơ quan thuế. Nếu vướng thì chỉ bật ở bản `.exe`.

## 6. Lưu ý từ trang cổng

Mở cổng thật, trang hiện thông báo của Cục Thuế về **phần mềm giả mạo ứng dụng ngành thuế**. Vì vậy trang giới thiệu và bản phát hành của XML-Pro không nên viết theo kiểu dễ hiểu nhầm là ứng dụng của cơ quan thuế; nên ghi rõ đây là phần mềm độc lập. Trang web hiện chưa có câu đó, tôi chưa thêm.

## 7. Tự khai

- Lần đầu tôi làm cửa sổ riêng, anh yêu cầu đổi sang khung trong app nên đã làm lại.
- Ảnh chụp đầu cho thấy ô tháng tràn ra ngoài thẻ, do tôi giữ nguyên độ rộng của extension mà không tính đến cách Edge hiện tên tháng tiếng Việt. Đã sửa, test có đo.
- Một lần chụp, vùng cổng còn trắng vì trang chưa tải xong. Lần chụp sau hiện đủ, nên tôi chưa rõ mạng chậm hay có lỗi nạp thoáng qua. Nếu gặp vùng trắng lâu, anh báo tôi.
- Lần này tôi có mở trang công khai của cổng thuế thật qua app để kiểm, không đăng nhập, không gọi API tải.
