# Xem XML thuế

Mở `index.html` bằng Chrome/Edge (bấm đúp). Không cần cài, không cần mạng, không gửi dữ liệu đi đâu.

- Kéo thả file `.xml`, file `.zip`, hoặc cả thư mục vào khung bên trái (hoặc bấm "Chọn file…" / "Chọn thư mục…").
- Đọc được: tờ khai/BCTC HTKK (`HSoThueDTu`, kể cả file lưu trong `HTKK\DataFiles`), thông báo thuế (`TBaoThue`), chứng từ nộp tiền (`CHUNGTU`), hoá đơn điện tử (`HDon`).
- Nút "In / Lưu PDF" ở góc trên bên phải → chọn máy in "Lưu dưới dạng PDF".
- Trang KHÔNG kiểm tra chữ ký số là thật hay giả — chỉ hiện người ký và thời điểm ký ghi trong file.

## Bản cài đặt (.exe) — để bấm đúp tệp .xml là mở

- Bộ cài: `dong-goi\ban-phat-hanh\CaiDat-XemXmlThue-<phiên bản>.exe` (vd `CaiDat-XemXmlThue-1.0.1.exe`) → bấm đúp → Có. Cài vào `%LOCALAPPDATA%\Programs\XemXmlThue`, không cần quyền quản trị.
- Đặt làm mặc định: cuối bộ cài bấm Có để mở Cài đặt → dòng `.xml` → chọn "Xem XML thuế". Hoặc chuột phải tệp .xml → Mở bằng → Chọn ứng dụng khác → Xem XML thuế → Luôn luôn. (Windows không cho chương trình tự đặt mình làm mặc định.)
- Chưa đặt mặc định vẫn dùng được: chuột phải tệp .xml → "Xem bằng Xem XML thuế".
- Chỉ một cửa sổ: mở thêm tệp lúc nào cũng thành **tab mới** trong cửa sổ đang mở (bấm × hoặc bấm chuột giữa để đóng tab). Mở lại tệp đã mở thì nhảy tới tab cũ, không mở trùng.
- Mục **Lịch sử** (bên trái): các tệp đã mở bằng bấm đúp/"Mở bằng", bấm để mở lại. Lưu trên máy này, tối đa 300 mục, có nút "Xoá lịch sử".
- Gỡ: Cài đặt → Ứng dụng → Xem XML thuế → Gỡ cài đặt.
- **Chạy thử trước khi đóng gói** (chạy thẳng bản nguồn, cửa sổ có nhãn "CHẠY THỬ", không đụng bản đã cài):
  `powershell -ExecutionPolicy Bypass -File dong-goi\chay-thu.ps1 "C:\đường\dẫn\tệp.xml"`
  Sửa `index.html` xong bấm F5 trong cửa sổ chạy thử là thấy ngay.
- Đóng gói lại sau khi sửa `index.html` hay `ten-chi-tieu.js`:
  `powershell -ExecutionPolicy Bypass -File dong-goi\dong-goi.ps1`
  Mỗi lần chạy tự tăng phiên bản (1.0.1 → 1.0.2…). Thêm `-GiuPhienBan` để giữ số, `-PhienBan 1.1.0` để đặt số mới.

## Các tệp
- `index.html` — trang xem.
- `mau-itax.js` — bộ mẫu hiển thị XSLT + CSS + danh mục biểu mẫu rút từ iTax Viewer (giúp hiển thị tờ khai, phụ lục, thông báo, chứng từ chuẩn y hệt iTax Viewer; tự tạo, không sửa tay).
- `ten-chi-tieu.js` — tên chỉ tiêu rút từ bộ cài HTKK 5.8.1 (dùng cho file nháp `HTKK\DataFiles` và mẫu dự phòng; tự tạo, không sửa tay).
- `jszip.min.js` — thư viện mở file .zip.
- `cong-cu/tao-mau-itax.py` — công cụ tạo lại `mau-itax.js` khi Tổng cục Thuế ra bản iTax Viewer mới:

```powershell
python -I cong-cu\tao-mau-itax.py "C:\Program Files (x86)\iTax Viewer" mau-itax.js
```

- `cong-cu/tao-ten-chi-tieu.py` — công cụ tạo lại `ten-chi-tieu.js` khi có bản HTKK mới:

```powershell
expand.exe <đường dẫn>\Data1.cab -F:* C:\Temp\htkk-cab
python -I cong-cu\tao-ten-chi-tieu.py C:\Temp\htkk-cab ten-chi-tieu.js
```
(cần Python và gói `xlrd`)

(C) August87 - 0982722036
