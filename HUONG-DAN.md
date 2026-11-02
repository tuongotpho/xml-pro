# XML-Pro — hướng dẫn nhanh

Cách dùng chính: cài `CaiDat-XML-Pro-<phiên bản>.exe` rồi mở **XML-Pro** (menu Start / Desktop), bấm đúp tệp .xml, hoặc **chuột phải một thư mục → "Mở bằng XML-Pro"**. Từ bản 3.0.0 đây là cửa sổ phần mềm riêng (WebView2): chọn tệp / thư mục bằng hộp thoại Windows, không có popup hỏi quyền. Không cần mạng, không gửi dữ liệu đi đâu.
Không cài cũng được: mở `index.html` bằng Chrome/Edge (khi đó nút "Chọn thư mục…" sẽ có popup hỏi quyền của trình duyệt — kéo thả thư mục thì không).
Lưu ý khi lên 3.0.0 từ bản cũ: MST đã cài, lịch sử tệp, phiên làm việc của bản cũ nằm trong hồ sơ Edge riêng nên không chuyển sang — cài lại MST một lần.

- Kéo thả file `.xml`, file `.zip`, hoặc cả thư mục vào khung bên trái (hoặc bấm "Chọn file…" / "Chọn thư mục…").
- Đọc được: tờ khai/BCTC HTKK (`HSoThueDTu`, kể cả file lưu trong `HTKK\DataFiles`), thông báo thuế (`TBaoThue`), chứng từ nộp tiền (`CHUNGTU`), hoá đơn điện tử (`HDon`).
- Tờ khai / BCTC có nhiều biểu (tờ khai chính, các phụ lục): mỗi biểu một **thẻ** như iTax Viewer, bấm thẻ để xem; `Ctrl + PageDown` / `Ctrl + PageUp` để sang biểu sau / trước. Thẻ chữ nghiêng là biểu dựng dự phòng (bộ mẫu iTax chưa có mẫu đó).
- Nút "In / Lưu PDF biểu này" in biểu đang xem; "In tất cả N biểu" in cả bộ, mỗi biểu một trang mới → chọn máy in "Lưu dưới dạng PDF".
- **Thanh bên (bản 3.0.2):**
  - "Đóng tất cả" (cạnh ô tìm kiếm) chỉ đóng các tệp đang mở trong app, không xoá tệp trên ổ cứng; app hỏi lại trước khi đóng.
  - MST công ty: app tự nhận từ tờ khai GTGT đang nạp, không có thì lấy MST xuất hiện trên nhiều hoá đơn nhất, rồi gắn nhãn Mua vào / Bán ra. Thư mục có nhiều công ty thì chọn công ty trên Dashboard. Nhận sai thì cài tay ở "🧰 Công cụ → ⚙ MST công ty".
  - "🧰 Công cụ" gom: Lập tờ khai GTGT, Đổi tên file hàng loạt (đổi tên tệp trên ổ cứng cho dễ tìm, app không cần tên tệp để nhận diện), MST công ty.
- **Lập tờ khai 01/GTGT từ hoá đơn:** nạp hoá đơn mua vào và bán ra của kỳ (cả thư mục / zip), bấm "Lập tờ khai" trên Dashboard, hoặc "🧰 Công cụ → 📝 Lập tờ khai GTGT từ hoá đơn" ở thanh bên → chọn MST, tháng hoặc quý → kiểm thông tin doanh nghiệp và các chỉ tiêu nhập tay ([22] tự lấy từ [43] kỳ trước nếu có nạp tờ khai kỳ trước) → "Lập & mở tờ khai" (xem ngay theo mẫu iTax, app tự đối chiếu) hoặc "Tải file XML". File chưa ký số: nạp vào HTKK hoặc eTax để kiểm tra, ký, nộp. Ô "Mẫu" chọn 01/GTGT (khấu trừ) hoặc 04/GTGT (trực tiếp trên doanh thu).
- **Lập tờ khai 04/GTGT:** trong hộp lập tờ khai chọn Mẫu "04/GTGT" → chọn nhóm ngành mặc định (1% phân phối hàng hoá, 5% dịch vụ, 3% sản xuất / vận tải / xây dựng có bao thầu vật liệu, 2% khác); hoá đơn nào khác nhóm thì đổi ở cột "Nhóm". Doanh thu lấy theo giá thanh toán trên hoá đơn bán ra. App chưa lập phụ lục giảm 20% mức tỷ lệ (nếu được giảm thì lập thêm trong HTKK).
- **Lập tờ khai bổ sung 01/GTGT:** mở tờ khai đã nộp cùng hoá đơn của kỳ; khung đối chiếu báo lệch thì bấm "📝 Lập tờ khai bổ sung theo hoá đơn" (hoặc nút "Lập tờ khai bổ sung" trên thẻ kỳ ở Dashboard) → xem bảng chỉ tiêu cũ / mới, số thuế tăng giảm, tiền chậm nộp ước tính → "Lập & mở". File gồm tờ khai đã điều chỉnh (bổ sung lần n) và phụ lục 01/KHBS, 01-1/KHBS. Các chỉ tiêu nhập tay ([22], [37], [38]…) giữ như tờ khai cũ. Nếu [43] đổi, tờ khai các kỳ sau đã lấy [22] theo số cũ cũng phải xem lại — app không tự sửa.
- **Đối chiếu tờ khai 01/GTGT với hoá đơn:** kéo vào cùng lúc tờ khai (XML), hoá đơn mua vào / bán ra của kỳ đó (XML hoặc .zip, cả thư mục cũng được) và giấy nộp tiền nếu có. App tự ghép theo MST + kỳ của từng tờ khai (làm được cho nhiều công ty một lúc). Mở tờ khai sẽ thấy khung "🔎 Đối chiếu với hoá đơn đã nạp": ✔ khớp / ✖ lệch kèm hoá đơn nghi ngờ (bấm để mở). Dashboard có bảng tổng hợp mọi tờ khai; Xuất Excel có sheet "Đối chiếu tờ khai GTGT". Lệch chưa chắc là sai (HĐ kê kỳ sau, HĐ không đủ điều kiện khấu trừ, thiếu tệp) — app chỉ chỉ ra, kế toán quyết định.
- Khi Tổng cục Thuế ra iTax Viewer mới: cài iTax Viewer bản mới rồi chạy `python -I cong-cu\tao-mau-itax.py "C:\Program Files (x86)\iTax Viewer" mau-itax.js` và đóng gói lại.
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
