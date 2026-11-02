# XML-Pro — hướng dẫn nhanh

Mở `index.html` bằng Chrome/Edge (bấm đúp). Không cần cài, không cần mạng, không gửi dữ liệu đi đâu.

- Kéo thả file `.xml`, file `.zip`, hoặc cả thư mục vào khung bên trái (hoặc bấm "Chọn file…" / "Chọn thư mục…").
- Đọc được: tờ khai/BCTC HTKK (`HSoThueDTu`, kể cả file lưu trong `HTKK\DataFiles`), thông báo thuế (`TBaoThue`), chứng từ nộp tiền (`CHUNGTU`), hoá đơn điện tử (`HDon`).
- Nút "In / Lưu PDF" ở góc trên bên phải → chọn máy in "Lưu dưới dạng PDF".
- Chữ ký số: app kiểm ngay trên máy (vân tay dữ liệu + chữ ký trong chứng thư) và gắn nhãn ✔ hợp lệ / ✖ dữ liệu bị sửa đổi sau khi ký / ⓘ không kiểm tra được. **Không** kiểm chứng thư có bị thu hồi (cần mạng) — muốn chắc chắn thì tra trên cổng thuế điện tử.
- Đổi tên hàng loạt (nút "Đổi tên"): tải tệp .ZIP đã đổi tên, hoặc tải script `.ps1` → chép vào thư mục chứa hoá đơn → chuột phải → Run with PowerShell. Script không ghi đè tệp trùng tên. Windows chặn tệp tải về thì chuột phải → Properties → Unblock.
- Dữ liệu lưu trên máy: phiên làm việc gần nhất và lịch sử tệp đã mở. Xoá bằng nút "🗑 Xoá dữ liệu phiên" trong hộp Giới thiệu.

## Bản cài đặt (.exe) — để bấm đúp tệp .xml là mở

- Bộ cài: `dong-goi\ban-phat-hanh\CaiDat-XML-Pro-<phiên bản>.exe` (vd `CaiDat-XML-Pro-2.0.1.exe`) → bấm đúp → Có. Cài vào `%LOCALAPPDATA%\Programs\XemXmlThue`, không cần quyền quản trị.
- Đặt làm mặc định: cuối bộ cài bấm Có để mở Cài đặt → dòng `.xml` → chọn "XML-Pro". Hoặc chuột phải tệp .xml → Mở bằng → Chọn ứng dụng khác → XML-Pro → Luôn luôn. (Windows không cho chương trình tự đặt mình làm mặc định.)
- Chưa đặt mặc định vẫn dùng được: chuột phải tệp .xml → "Xem bằng XML-Pro".
- Chỉ một cửa sổ: mở thêm tệp lúc nào cũng thành **tab mới** trong cửa sổ đang mở (bấm × hoặc bấm chuột giữa để đóng tab). Mở lại tệp đã mở thì nhảy tới tab cũ, không mở trùng.
- Mục **Lịch sử** (bên trái): các tệp đã mở bằng bấm đúp/"Mở bằng", bấm để mở lại. Lưu trên máy này, tối đa 300 mục, có nút "Xoá lịch sử".
- Gỡ: Cài đặt → Ứng dụng → XML-Pro → Gỡ cài đặt.
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
