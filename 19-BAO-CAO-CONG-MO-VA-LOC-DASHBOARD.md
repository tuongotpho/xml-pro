# [19] Trang cổng mờ sau thẻ tải, sửa lỗi bật lại, bộ lọc hoá đơn trên Dashboard

07/11/2026 · Tiếp nối [18](18-BAO-CAO-KHO-HOA-DON.md) · Nguồn: `XML-Pro.exe` 3.0.7, cổng giả, trang công khai cổng thuế thật (không đăng nhập), 6 hoá đơn mẫu

## Kết luận

- **Đã sửa lỗi không bật lại được** trang tải hoá đơn. Trên cổng thật đã thử đóng rồi mở lại ngay: chạy được.
- **Trang cổng hiện mờ phía sau thẻ tải**, có nút **×** để tắt thẻ và xem trang cổng.
- **Dashboard có lại bộ lọc hoá đơn:** bấm là thấy danh sách ngay.
- Chưa commit, chưa đăng, trang web chưa deploy, chưa đăng nhập thật.

## 1. Lỗi không bật lại được

Bấm **Đóng và đăng xuất** rồi mở lại nhanh: trang app chờ vỏ báo đã đóng. Mở lại xong thì lệnh báo đóng mới tới, xoá màn hình đúng lúc khung cổng mới vừa tạo, nên khung nằm đè lên Dashboard mà app tưởng đã đóng. Tôi tái hiện được trên `XML-Pro.exe` thật.

Cách sửa: trang app tự chuyển màn ngay khi bấm, không chờ báo lại. Test: đóng và bật lại liền tay 3 lần đều đạt.

**Chưa chắc đây là đúng tình huống anh gặp**, vì tôi chỉ tái hiện được khi bấm nhanh. Nếu còn lỗi, anh cho tôi biết đã bấm nút nào trước đó.

## 2. Trang cổng mờ phía sau

Hai khung WebView2 không chồng trong suốt lên nhau được, nên vỏ app chụp ảnh trang cổng rồi hiện ảnh đó mờ phía sau thẻ, độ đậm 20%. Ảnh chỉ nằm trong bộ nhớ, không ghi xuống đĩa. Trang thật vẫn chạy phía sau.

Vì là ảnh chụp, nền không cập nhật liên tục mà chụp lại mỗi lần thẻ hiện ra.

Ảnh kiểm tra trên cổng thật được tạo bằng cách giả trạng thái đăng nhập chỉ trong lúc test, không gọi API của cổng. Sau khi đăng nhập thật, nền sẽ là trang sau đăng nhập, tôi chưa thấy.

## 3. Bộ lọc trên Dashboard

Như Dashboard cũ, phần sau đều là bộ lọc, bấm lần nữa để tắt:

- Thẻ Bán ra, Thuế đầu ra, Mua vào, Thuế đầu vào.
- Ô tiền của từng kỳ trong sổ theo kỳ.
- Dòng khách hàng, nhà cung cấp.
- Nút Tất cả, Mua vào, Bán ra, Cần chú ý ở bảng hoá đơn.

Bảng **Hoá đơn** nằm dưới sổ theo kỳ, báo đang lọc gì, bao nhiêu hoá đơn, cộng tiền theo lọc. Bấm dòng là mở hoá đơn. Hiện tối đa 200 dòng mới nhất, xem đủ ở Kho hoá đơn. Chưa khôi phục: lọc theo thuế suất và sắp xếp theo cột của Dashboard cũ.

## 4. Kết quả đo

| Bộ test | Kết quả |
|---|---|
| `kiem-thu-tai-hoa-don.py` | **39/39** |
| `kiem-thu-kho.py` | **29/29** |
| `kiem-thu-so-tay.py` · `kiem-thu-sua-loi.py` | **24/24 · 37/37** |
| `kiem-thu-vo-webview2.py` | **Chưa chạy lại**, tự dừng vì XML-Pro đang mở |
| Cổng thật, đóng rồi mở lại | Trang mở lại, phần tải gắn được |

Hai bộ test kho và tải chạy trước lần đóng gói cuối, lần đó chỉ đổi chữ mô tả.
