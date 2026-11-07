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
- **Lập tờ khai 01/CNKD cho hộ kinh doanh, cá nhân kinh doanh (bản 3.0.4):** nạp hoá đơn bán ra của hộ → "🧰 Công cụ → 📝 Lập tờ khai từ hoá đơn" → Mẫu "01/CNKD". Chọn nhóm ngành mặc định, đổi nhóm cho hoá đơn nào khác nhóm (6 nhóm theo TT 50/2026: hàng hoá, dịch vụ, cho thuê tài sản, sản xuất/vận tải, nội dung số, khác). App tính thuế GTGT = doanh thu × tỷ lệ %, thuế TNCN = (doanh thu − phần được trừ trong mức 01 tỷ/năm) × tỷ lệ %, tự trừ dần mức 01 tỷ qua các kỳ (ngành có thuế suất TNCN cao trừ trước). Ngưỡng 01 tỷ và "đã trừ ở các kỳ trước" sửa được. Hộ nộp TNCN theo thu nhập tính thuế thì chọn phương pháp "theo thu nhập": app chỉ khai GTGT. Muốn thử: kéo thư mục `mau-xml\ho-kinh-doanh-gia-lap` (10 hoá đơn giả lập, MST 8000000001) vào app.
- **Lập tờ khai bổ sung 01/GTGT:** mở tờ khai đã nộp cùng hoá đơn của kỳ; khung đối chiếu báo lệch thì bấm "📝 Lập tờ khai bổ sung theo hoá đơn" (hoặc nút "Lập tờ khai bổ sung" trên thẻ kỳ ở Dashboard) → xem bảng chỉ tiêu cũ / mới, số thuế tăng giảm, tiền chậm nộp ước tính → "Lập & mở". File gồm tờ khai đã điều chỉnh (bổ sung lần n) và phụ lục 01/KHBS, 01-1/KHBS. Các chỉ tiêu nhập tay ([22], [37], [38]…) giữ như tờ khai cũ. Nếu [43] đổi, tờ khai các kỳ sau đã lấy [22] theo số cũ cũng phải xem lại — app không tự sửa.
- **Đối chiếu tờ khai 01/GTGT với hoá đơn:** kéo vào cùng lúc tờ khai (XML), hoá đơn mua vào / bán ra của kỳ đó (XML hoặc .zip, cả thư mục cũng được) và giấy nộp tiền nếu có. App tự ghép theo MST + kỳ của từng tờ khai (làm được cho nhiều công ty một lúc). Mở tờ khai sẽ thấy khung "🔎 Đối chiếu với hoá đơn đã nạp": ✔ khớp / ✖ lệch kèm hoá đơn nghi ngờ (bấm để mở). Dashboard có bảng tổng hợp mọi tờ khai; Xuất Excel có sheet "Đối chiếu tờ khai GTGT". Lệch chưa chắc là sai (HĐ kê kỳ sau, HĐ không đủ điều kiện khấu trừ, thiếu tệp) — app chỉ chỉ ra, kế toán quyết định.
- Khi Tổng cục Thuế ra iTax Viewer mới: cài iTax Viewer bản mới rồi chạy `python -I cong-cu\tao-mau-itax.py "C:\Program Files (x86)\iTax Viewer" mau-itax.js` và đóng gói lại.
- Chữ ký số: app kiểm ngay trên máy (vân tay dữ liệu + chữ ký trong chứng thư) và gắn nhãn ✔ hợp lệ / ✖ dữ liệu bị sửa đổi sau khi ký / ⓘ không kiểm tra được. **Không** kiểm chứng thư có bị thu hồi (cần mạng) — muốn chắc chắn thì tra trên cổng thuế điện tử.
- Đổi tên hàng loạt (nút "Đổi tên"): tải tệp .ZIP đã đổi tên, hoặc tải script `.ps1` → chép vào thư mục chứa hoá đơn → chuột phải → Run with PowerShell. Script không ghi đè tệp trùng tên. Windows chặn tệp tải về thì chuột phải → Properties → Unblock.
- Dữ liệu lưu trên máy: phiên làm việc gần nhất và lịch sử tệp đã mở. Xoá bằng nút "🗑 Xoá dữ liệu phiên" trong hộp Giới thiệu.

## Tải hoá đơn từ cổng thuế (bản 3.0.7)

1. **🧰 Công cụ → ⬇ Tải hoá đơn từ cổng thuế.** Trang cổng thuế thật hiện ngay trong XML-Pro, thanh bên vẫn dùng được.
2. Tự đăng nhập, tự gõ captcha trên trang đó. XML-Pro không có ô nhập mật khẩu, không đọc, không lưu. Bấm **Đóng và đăng xuất** là hết phiên. **Về XML-Pro** thì giữ phiên, chọn lại mục trong Công cụ để quay về.
3. Đăng nhập xong trang cổng tự ẩn, chỉ còn thẻ chọn tháng trong XML-Pro. Chọn tháng, Mua vào / Bán ra, bấm **Chọn thư mục và tải**. Trang cổng hiện mờ phía sau thẻ để anh chị thấy cổng thật vẫn ở đó. Cần xem rõ thì bấm **×** trên thẻ hoặc **Xem trang cổng**, bấm **Hiện thẻ tải** để quay lại. Hết phiên thì trang đăng nhập tự hiện lại.
4. Tệp lưu theo dạng `<thư mục>\<MST>\MUA-VAO\HD-DIEN-TU\XML\…`, có thêm bảng `TOM-TAT-HOA-DON-….xlsx`, và `CAN-XEM-LAI-….txt` nếu có hoá đơn thiếu hoặc lỗi. Tải xong tệp tự nạp vào app, bấm **Xem trên Dashboard** để xem.

* Tải lại cùng thư mục thì chỉ tải bù hoá đơn còn thiếu, không ghi đè tệp đã có. Bấm Dừng hay hết phiên giữa chừng vẫn giữ tệp đã tải.
* Tải chậm có chủ ý (khoảng 1 giây một hoá đơn) để cổng không khoá tài khoản. Tối đa 24 tháng một lần.
* **Hoá đơn máy tính tiền:** tích **Máy tính tiền mua vào** hoặc **bán ra**. Cổng đòi captcha cho mỗi lần tìm, mỗi lần tối đa 10 ngày: tháng 31 ngày là 4 lần gõ cho bán ra, 12 lần cho mua vào (tháng 30 ngày 3 và 9), thêm 1 lần mỗi trang kết quả. Ảnh captcha hiện ngay trên thẻ; đang xem Dashboard thì có nút nhắc ở góc phải. Không có loại đó thì khỏi tích. XML-Pro không tự giải captcha.

## Kho hoá đơn (bản 3.0.7)

Nút **🧾 Kho hoá đơn** ở thanh bên. Hoá đơn tải về hoặc mở từ thư mục tự vào kho, lần sau mở app vẫn còn, không cần nạp lại. Kho là chỉ mục trên máy này; tệp XML trong thư mục vẫn là bản gốc, xoá tệp thì kho vẫn còn dòng nhưng không mở được.

* **Lọc, tìm:** theo công ty, tháng, mua bán, trạng thái; tìm theo số, tên, MST, ghi chú.
* **Đánh dấu:** tích dòng rồi bấm Đã hạch toán, Đã thanh toán, Cần xem. Kỳ đã khoá sổ được bỏ qua.
* **Đối soát với cổng thuế:** ở thẻ tải, tích **Chỉ đối soát với Kho** để lấy danh sách, không tải XML. Mỗi lần tải thường cũng tự đối soát. Nhãn đỏ: chưa có XML, bị huỷ, bị thay thế, lệch tiền, không thấy trên cổng. Lọc **Lệch với cổng thuế** để xem riêng.
* **Xuất Excel:** xuất đúng các dòng đang lọc.
* **Sao lưu, Phục hồi:** ra một tệp `.json` gồm kho và sổ tay, không có mật khẩu nhưng có số liệu hoá đơn nên cần giữ kín. Phục hồi không ghi đè mục đang có.

## Sổ tay kế toán (bản 3.0.7)

* **Khoá sổ:** trên Dashboard, bấm **Khoá sổ** ở dòng kỳ đã nộp. Kỳ đó không lập tờ khai, tờ khai bổ sung; ghi chú hoá đơn không sửa được. App nhớ danh sách hoá đơn và số tiền lúc khoá: nạp thêm hoặc đổi hoá đơn của kỳ thì Dashboard báo rõ thêm mấy hoá đơn, lệch bao nhiêu. Bấm **Mở khoá** khi cần sửa.
* **Ghi chú:** bấm số hoá đơn trên dòng kỳ để mở bảng hoá đơn của kỳ. Gõ thẳng vào cột Ghi chú, `Ctrl+D` chép từ dòng trên, `Ctrl+V` một cột từ Excel điền dọc, tích nhiều dòng rồi **Ghi cho dòng đã chọn**. Trang xem hoá đơn cũng có ô ghi chú. Ghi chú ra cột Ghi chú của bảng kê 01-1, 01-2 khi xuất Excel.
* **Nối lại đường dẫn tệp** (🧰 Công cụ): thư mục chuyển chỗ thì chọn thư mục mới. App so nội dung nên tệp đổi tên vẫn nối được; mục chỉ có trong Lịch sử nối theo tên, tên trùng thì bỏ qua. Không sửa tệp nào trên ổ cứng. Chỉ chạy trong app cài trên máy.
* Sổ tay lưu trên máy này (`so-tay.js`, khoá `xmlpro.soTay.v1`). Nút xoá dữ liệu phiên không xoá sổ tay. Hoá đơn nhận theo MST bán + mẫu + ký hiệu + số, nên đổi thư mục không mất ghi chú. Đổi máy thì dùng nút Sao lưu trong Kho hoá đơn.

## Dashboard 3 Tab, Thuế TNDN, Kiểm toán rủi ro HĐ & Xuất MISA (bản 3.0.8)

* **Giao diện Sáng mặc định & Dashboard 3 Tab:** Tab 1 (*Thuế GTGT*), Tab 2 (*Thu nhập DN & Lợi nhuận sau thuế*), Tab 3 (*Tổng hợp hóa đơn & Khách hàng*).
* **Tính tự động Thuế TNDN & Lợi nhuận sau thuế (Tab 2):** tự lấy doanh thu/chi phí từ hoá đơn hiệu lực, tiền lương từ tờ khai `05/KK-TNCN`, giấy nộp tiền tiểu mục `1052`; tự áp thuế suất **15% / 17% / 20%** theo quy mô doanh thu (Luật 67/2025/QH15), tự bù lỗ luỹ kế giữa các quý và xuất sheet Excel `Thuế TNDN & Lợi nhuận`.
* **Kiểm toán rủi ro Hóa đơn trước thanh tra thuế (Tab 3):** tự động rà soát 4 nhóm rủi ro trọng yếu: (1) ngày ký số người bán lệch ngày lập / vắt tháng / vắt quý; (2) thanh toán tiền mặt vượt ngưỡng **5 triệu** từ `01/07/2025` (**20 triệu** trước đó), kể cả nhiều hoá đơn mua cùng ngày của cùng nhà cung cấp cộng dồn vượt ngưỡng; (3) thủng dải số hoá đơn bán ra theo `Mẫu số + Ký hiệu`; (4) sai lệch tên/địa chỉ/MST người mua trên hoá đơn đầu vào. Bấm vào từng thẻ cảnh báo để lọc danh sách hoá đơn; xuất kèm sheet `Kiểm toán rủi ro HĐ`.
* **Xuất Bảng kê chuẩn Import MISA / FAST & Tự học định khoản:** mở từ nút **Xuất MISA / Định khoản** trên đầu Dashboard hoặc menu **🧰 Công cụ**. Hỗ trợ **Thông tư 200 / TT99** và **Thông tư 133**, sửa Mã hàng hoặc Tài khoản Nợ/Có một lần là máy tự động ghi nhớ (`xmlpro.dinhKhoan.v1`) cho các kỳ sau, xuất tệp `.xlsx` 3 sheet (`MISA_Mua_hang`, `MISA_Ban_hang`, `Tong_hop_Dinh_khoan`).

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
