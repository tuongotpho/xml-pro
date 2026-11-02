# [01] Báo cáo rà soát toàn diện XML-Pro v2.0.0 — tính năng, bảo mật, đề xuất sửa & nâng cấp

> Ngày 02/11/2026 · Tiếp nối: — (báo cáo đầu tiên của thư mục) · Xem [00 — Mục lục](00-MUC-LUC-BAO-CAO.md)
> Nguồn dữ liệu: mã nguồn `F:\AI\7.xml-pro` (commit `333247e` + **1.658 dòng sửa chưa commit** của v2.0.0), bản đóng gói `dong-goi\ban-phat-hanh\XML-Pro.exe` 2.0.0, 12 tệp XML mẫu trong `mau-xml\`, chạy 4 bộ kiểm thử có sẵn + 4 phép đo độc lập (mô tả ở Phụ lục).

---

## Kết luận trước

**Phần lõi của app tốt**: đọc và hiển thị đủ 6 nhóm chứng từ mẫu, xuất Excel, phân loại mua/bán, phát hiện hoá đơn trùng, đổi tên file. Thử nhét mã độc vào mọi ô chữ của 12 tệp mẫu: **không có lần nào chạy được**.

**Nhưng bản v2.0.0 hiện tại (chưa commit) CHƯA NÊN phát hành.** Có 5 lỗi nặng, tất cả đều đã đo được:

| # | Lỗi | Mức | Bằng chứng đo |
|---|---|---|---|
| A1 | Kiểm tra chữ ký số **báo "bị sửa đổi" với cả hoá đơn thật** | 🔴 Nặng | 12/12 chữ ký thật bị báo đỏ; Windows (.NET) xác nhận cả 12 hợp lệ |
| A2 | "Máy chủ nội bộ" mới của v2.0.0 **tắt sau 2,6 giây** | 🔴 Nặng | Chạy đúng `XML-Pro.exe` 2.0.0: cổng 28765 không còn nghe |
| A3 | Máy chủ đó **để ngỏ cho mọi trang web** đọc file / đổi tên / xoá file trên máy | 🔴 Nặng (lộ ra khi sửa A2) | Đọc mã + đo cách Windows ghép đường dẫn |
| A4 | **39 dòng tiếng Việt bị biến thành dấu "?"** trong `index.html` | 🟠 Vừa-nặng | Nút sáng/tối hiện "??" (chính bộ test in ra) |
| A5 | Script đổi tên `.ps1` **không đổi được file có tên tiếng Việt** | 🟠 Vừa-nặng | Thử thật: 0/1 file được đổi; thêm 3 byte BOM → 1/1 |

Thêm vào đó: "Trung tâm cập nhật" là vỏ rỗng (luôn báo "đang dùng bản mới nhất"), và các bộ kiểm thử chấm "ĐẠT 100%" ngay cả khi kết quả sai — nên các lỗi trên lọt qua.

**Tin tốt:** A1 sửa **đúng 1 dòng** (đã thử trên bản sao: 12/12 hợp lệ, hoá đơn bị sửa 1 chữ số vẫn bị bắt). A4, A5 sửa trong vài phút. A2 + A3 cần anh chọn phương án (mục D).

---

## A. Lỗi nặng — chi tiết

### A1. Chữ ký số: báo động giả 100%

**Hiện tượng.** Mở bất kỳ hoá đơn thật nào, app đều kết luận "✖ Dữ liệu bị sửa đổi sau khi ký" cho cả chữ ký người bán lẫn chữ ký cơ quan thuế. Hoá đơn còn bị dồn vào bộ lọc "⚠ Cần chú ý" (`index.html:2287`).

**Số đo** (Phụ lục, phép đo 2 và 3):

| Hoá đơn mẫu | App v2.0.0 nói | Windows .NET `SignedXml` nói | App sau khi sửa 1 dòng |
|---|---|---|---|
| hd_mau_1 … hd_mau_6 (12 chữ ký) | 12/12 **bị sửa** | 12/12 **hợp lệ** | 12/12 hợp lệ |
| hd_mau_1 sửa 1 chữ số tiền thuế | bị sửa | — | **bị sửa** (đúng) |

**Nguyên nhân.** Hàm `readSigner` (`index.html:2231`) chỉ đưa cho bộ kiểm **khối chữ ký** (`DSCKS/NBan`), không đưa cả hoá đơn. Bộ kiểm (`index.html:1494`) đi tìm phần dữ liệu đã ký (`DLHDon`) *bên trong khối chữ ký* → không thấy → băm nhầm chính khối chữ ký → lần nào cũng lệch.
Ví von: đi đo điện trở cách điện nhưng kẹp que đo vào chính vỏ đồng hồ — lần nào cũng ra "hỏng".

**Sửa (đã thử trên bản sao, không đụng mã gốc):** tìm phần dữ liệu trong toàn bộ tài liệu (`root.ownerDocument`) thay vì trong khối chữ ký.

**Hai điểm yếu còn lại sau khi sửa 1 dòng:**
1. **Chỉ kiểm "vân tay" (DigestValue), chưa kiểm chữ ký thật (SignatureValue).** Người cố tình sửa số tiền có thể tính lại vân tay mới và dán vào → app vẫn báo "✔ toàn vẹn 100%". Giống kiểm kẹp chì niêm phong nhưng không xem dấu trên kẹp chì có đúng của điện lực không. Câu trong README "dữ liệu khớp 100% bản ký gốc" là **nói quá** — hiện nó chỉ bắt được sửa vụng (sửa tay bằng Notepad).
   → Cần kiểm thêm chữ ký RSA trên `SignedInfo` bằng khoá công khai trong chứng thư số (trình duyệt làm được, không cần mạng).
2. **Huy hiệu hiện trễ.** Kiểm chữ ký chạy ngầm nhưng trang vẽ trước, không vẽ lại → lúc mở hoá đơn chưa có huy hiệu; chỉ hiện khi bấm sang tab khác rồi quay lại (đo: 0 huy hiệu lúc mở, 0 sau 2 giây, 2 sau khi bấm lại).

**Vì sao test không bắt được:** `kiem-thu-ke-toan.py` in ra `"verified": false` nhưng không kiểm điều kiện đó, vẫn in "[PASS] … chính xác 100%".

### A2. Máy chủ nội bộ v2.0.0 tắt ngay sau khi mở cửa sổ

**Số đo:** chạy đúng `XML-Pro.exe` 2.0.0 (từ thư mục tạm, kèm 1 hoá đơn mẫu): cửa sổ mở ở `http://127.0.0.1:28765/...`; chương trình thoát sau **2,6 giây**; ngay sau đó và 3 giây sau: **0 cổng đang nghe**, không tải được `mau-itax.js`. Một chương trình C# tối giản cùng kiểu viết cũng cho kết quả y hệt.

**Nguyên nhân:** máy chủ chạy *bên trong* `XML-Pro.exe`, mà `XML-Pro.exe` mở Edge xong là kết thúc (`XemXmlThue.cs:113`) → máy chủ chết theo. Như máy phát dự phòng chạy xong thì người trực tắt cầu dao tổng khi ra về.

**Hệ quả (suy ra từ mã, khớp với số đo):**
- Mở **tờ khai thuế** cần bộ mẫu iTax 16,6 MB nạp sau ("nạp lười") → không còn chỗ tải → hỏng đúng tính năng gốc của app.
- Bấm F5 → trang trắng.
- **Bấm đúp file thứ hai → không vào tab mới**: lần chạy thứ hai ghi tên file vào bộ nhớ của *chính nó* (`XemXmlThue.cs:60`), không phải của máy chủ; còn đường dự phòng qua thư mục `mo\hang` thì trình duyệt chặn vì trang đang chạy ở địa chỉ `http://`.
- Nút "Đổi tên trực tiếp trên ổ đĩa" → báo lỗi kết nối.

⚠️ **Cần mắt anh xác nhận:** trang đầu tiên có thể vẫn hiện ra (nếu kịp tải trước khi máy chủ tắt). Tôi đã đo cổng chết nhưng **chưa nhìn giao diện** của cửa sổ thử đó.

Bản đang cài trên máy anh là **1.7.7** (không có máy chủ) nên chưa bị ảnh hưởng.

### A3. Lỗ bảo mật trong máy chủ nội bộ

Hiện lỗ này "ngủ" vì máy chủ chết sau 2,6 giây; **nhưng nếu chỉ sửa A2 (giữ máy chủ sống) mà không sửa A3 thì lỗ mở ra ngay.**

Máy chủ trả lời mọi nơi gọi tới (`Access-Control-Allow-Origin: *`, `XemXmlThue.cs:169`), không có mật khẩu/mã phiên. Nghĩa là **bất kỳ trang web nào** anh đang mở trên Chrome/Edge khác cũng gọi được nó:

1. **Đọc trộm file bất kỳ trên máy.** Địa chỉ dạng `http://127.0.0.1:28765/C:/Users/.../tai-lieu.xlsx` → máy chủ ghép đường dẫn bằng `Path.Combine` (`XemXmlThue.cs:257`); đã đo: ghép thư mục cài với `C:\Windows\win.ini` cho ra **`C:\Windows\win.ini`** (bỏ hẳn thư mục cài).
2. **Đổi tên và xoá file từ xa.** `/api/rename` nhận đường dẫn bất kỳ; nếu tên mới trùng file có sẵn thì **xoá file đó** trước (`XemXmlThue.cs:236`). Trang web độc gửi được yêu cầu này mà trình duyệt không chặn (máy chủ không kiểm loại dữ liệu gửi lên).
3. `/api/poll` trả nguyên nội dung file vừa mở.

Ví von: tủ điện đặt ngoài hành lang, cửa không khoá, ai đi qua cũng đóng cắt được.
Ghi chú trung thực: tôi **chưa khai thác thật** (máy chủ đã chết trước khi kịp thử); kết luận dựa trên đọc mã + phép đo ghép đường dẫn ở trên.

### A4. 39 dòng tiếng Việt bị thành dấu "?"

Ví dụ: `Chuy?n ch? ?? Giao di?n T?i / S?ng`, `Vui l?ng t?ch ch?n…`. Ảnh hưởng: nút sáng/tối hiện **"??"** (chính `kiem-thu-giai-doan-3.py` in ra `Icon: ??` mà vẫn PASS), thẻ "Khôi phục phiên làm việc", nút + mọi hộp thông báo của "Đổi tên trực tiếp". Commit `333247e` **không có** lỗi này → do lần sửa chưa commit ghi tệp bằng bảng mã ANSI (thường là công cụ dùng `Set-Content` của PowerShell). Các tệp khác không bị.

### A5. Script đổi tên `.ps1` không đổi được file tên có dấu

App lưu `.ps1` dạng UTF-8 **không có BOM** (`index.html:3837`). PowerShell 5.1 có sẵn trong Windows (cái mà "Run with PowerShell" dùng) đọc tệp không BOM theo bảng mã ANSI → tên tiếng Việt trong script bị méo → không khớp file nào → script báo "Đã đổi tên: 0" mà không báo lỗi (`ErrorActionPreference = SilentlyContinue`).
**Đo thật:** file `hd_CÔNG TY TNHH MỘT THÀNH VIÊN.xml` — script không BOM đổi được **0/1**; cùng script thêm BOM (3 byte đầu tệp) đổi được **1/1**. Trong khi tên file hoá đơn tải về thường chứa tên công ty có dấu (như cả 6 file mẫu).
Sửa: thêm `'\uFEFF'` vào đầu nội dung trước khi tạo Blob.

---

## B. Vấn đề mức vừa

| # | Vấn đề | Chi tiết | Đề xuất |
|---|---|---|---|
| B1 | **"Trung tâm cập nhật" là vỏ rỗng** | Đọc `dong-goi/phien-ban.txt` — tệp này **không có** trong bộ cài (`CaiDat.cs:145`) → luôn báo "✓ đang dùng bản mới nhất". Nội dung "bản mới" viết cứng của v1.8.0; nút tải trỏ tới file không tồn tại | Gỡ, hoặc làm thật qua GitHub Releases (`api.github.com` đã có sẵn trong CSP mà chưa dùng). Theo nguyên tắc của anh: không để tính năng "trông như chạy" |
| B2 | **Lời cam kết trong tài liệu không khớp mã** | README: "CSP `connect-src 'none'`, 100% offline" — thực tế cho phép `127.0.0.1:*` và `api.github.com`. `HUONG-DAN.md`: "KHÔNG kiểm tra chữ ký số" — đã lỗi thời. README lặp mục "Tính năng đột phá v1.8.0" 2 lần trong khi app là 2.0.0. Tên app 3 kiểu: XML-Pro / Xem XML thuế / XemXmlThue | Viết lại README theo đúng cái app làm được, đo được |
| B3 | **Bộ kiểm thử không canh gác** | 3/4 bộ in "ĐẠT 100%" dù có kết quả sai (A1, A4). `kiem-thu-giai-doan-3.py` **đổ lỗi** trên console Windows nếu không đặt `PYTHONIOENCODING=utf-8`. Không có test cho **tờ khai thuế HTKK** — tính năng gốc — vì `mau-xml` không có tệp tờ khai nào. Chưa có CI | Thêm điều kiện bắt buộc (6 HĐ phải hợp lệ, HĐ bị sửa phải bị bắt, không còn chuỗi `??`), thêm 1–2 tờ khai mẫu, chạy tự động trên GitHub Actions (máy Windows) |
| B4 | **Lưu phiên làm việc lưu nguyên văn XML** | IndexedDB lưu toàn bộ nội dung (có thể có CCCD, lương, hồ sơ khám bệnh BHYT) dạng chữ thường trong hồ sơ trình duyệt | Chấp nhận được với app một máy, nhưng cần nút "Xoá dữ liệu phiên" rõ ràng và ghi trong hướng dẫn |
| B5 | **CSP vẫn cho `'unsafe-inline'`** | Hàng rào chống mã độc yếu đi một lớp | Hiện **không có lỗ thật**: đo 12 tệp × mọi ô chữ + tên file bị thay bằng mã độc → 0 lần chạy (mã đã lọc ký tự tốt). Để sau |
| B6 | **1.658 dòng sửa chưa commit, `index.html` 4.276 dòng một khối** | Mất máy / ghi đè nhầm là mất cả v2.0.0 | Sửa A4 rồi commit ngay; về sau tách `index.html` thành vài tệp theo khối chức năng |

---

## C. Đánh giá tính năng (điểm mạnh — có số đo)

| Tính năng | Kết quả đo |
|---|---|
| Đọc 6 nhóm chứng từ mẫu (hải quan, BHYT, TNCN, BHXH, ngân hàng, đấu thầu) | 6/6 nhận đúng loại, dựng được "tờ giấy" (`kiem-thu-8-nganh.py`) |
| Xuất Excel nhiều sheet | Tạo được tệp 15.352 byte cho 6 tài liệu; có sheet Phân loại, MISA, Bảng kê GTGT |
| Cây thư mục + Dashboard tự đổi theo ngành | Đạt: HĐ, ngân hàng, tổng hợp đa ngành; lọc theo thư mục đúng 3 file |
| Phân loại mua/bán theo MST, đổi tên chuẩn kế toán | Đạt |
| Phát hiện hoá đơn trùng | Đạt (bắt được 2 bản trùng) |
| Chống chèn mã độc qua nội dung XML / tên file | **0/13** trường hợp chạy được mã độc |
| Script `.ps1` chống chèn lệnh qua tên file | Cách bọc nháy đơn + `-LiteralPath` đúng (chỉ lỗi bảng mã ở A5) |

**Giới hạn của đánh giá này:** 6 tệp mẫu ngoài hoá đơn là tệp **tự soạn**, chưa phải tệp thật xuất từ VNACCS, cổng BHXH, ngân hàng, mạng đấu thầu. Định dạng thật các ngành này có thể khác → cần vài tệp thật để kiểm.

---

## D. Đề xuất sửa — theo thứ tự

### Đợt 1 — chặn phát hành (ước ~nửa ngày)

1. **A4** khôi phục 39 dòng chữ Việt (lấy lại chữ từ ý nghĩa, ghi tệp bằng UTF-8).
2. **A1** sửa 1 dòng tìm phần dữ liệu ký + vẽ lại huy hiệu sau khi kiểm xong.
3. **A5** thêm BOM vào script `.ps1`.
4. **A2 + A3 — anh cần chọn một phương án:**
   - **Phương án 1 (tôi khuyên): bỏ máy chủ nội bộ, quay về cách của 1.7.x** (mở tệp trực tiếp, đã chạy ổn ở bản đang cài). Đổi tên trực tiếp thì dùng `.ps1` đã sửa BOM. Ưu: hết hẳn lỗ A3, ít mã hơn. Nhược: mất nút "đổi tên 1 chạm".
   - **Phương án 2: giữ máy chủ nhưng làm lại cho đúng**: chương trình chạy suốt tới khi đóng cửa sổ; mã phiên ngẫu nhiên mỗi lần mở (trang web lạ không biết mã → bị từ chối); bỏ `Allow-Origin: *`; chỉ phục vụ đúng danh sách tệp của app; chỉ đổi tên những tệp đã mở qua app; **không bao giờ xoá** tệp trùng tên; lần chạy thứ hai chuyển tệp sang lần chạy đầu qua kênh nội bộ (named pipe). Nhiều việc hơn, cần kiểm bảo mật kỹ.
5. Sửa test cho có "răng" (mục B3), chạy lại cả 4 bộ, **rồi commit**.

### Đợt 2 — làm cho đúng lời hứa

6. Kiểm chữ ký RSA thật (A1 điểm yếu 1) + kiểm chứng thư còn hạn tại thời điểm ký.
7. Trung tâm cập nhật: gỡ, hoặc làm thật qua GitHub Releases (B1).
8. Viết lại README/HUONG-DAN cho khớp thực tế; thống nhất một tên app (B2).
9. Thêm tờ khai HTKK mẫu + tệp thật các ngành vào bộ test; chạy test tự động trên GitHub Actions.

### Đợt 3 — nâng cấp (khi cần)

10. Tách `index.html` thành module; nút "Xoá dữ liệu phiên" (B4).
11. Ký số tệp `.exe` để Windows SmartScreen không cảnh báo khi người khác cài.
12. Các ý tưởng trong `KE-HOACH-NANG-CAP.md` cần dữ liệu ngoài (vd "đối chiếu danh sách doanh nghiệp bỏ trốn") **không làm được nếu giữ cam kết offline** — cần ghi rõ hoặc bỏ.

---

## E. Chưa kiểm được — cần anh

- Giao diện thật của v2.0.0 khi máy chủ đã tắt (trang đầu có hiện không, tab hoá đơn có lên không).
- Khai thác lỗ A3 trên máy chủ đang sống (chưa thử vì máy chủ chết trước).
- Tệp Excel xuất ra nhập thử vào MISA thật.
- Tệp XML thật của hải quan, BHXH, BHYT, ngân hàng, đấu thầu.

---

## Phụ lục — cách đo (lặp lại được)

1. **4 bộ kiểm thử có sẵn**: `kiem-thu-8-nganh.py`, `kiem-thu-tree-dashboard.py`, `kiem-thu-ke-toan.py`, `kiem-thu-giai-doan-3.py` (bộ cuối phải chạy với `PYTHONIOENCODING=utf-8`). Cả 4 in "đạt".
2. **Chữ ký số trong app**: Edge chạy ngầm (headless) mở `index.html`, nạp 6 hoá đơn mẫu, chờ 2 giây, đọc kết quả kiểm chữ ký; thêm 1 bản hoá đơn sửa 1 chữ số `TgTThue`.
3. **Chữ ký số bằng Windows**: PowerShell + `System.Security.Cryptography.Xml.SignedXml.CheckSignature()` trên cả 12 chữ ký (kiểm đủ vân tay + chữ ký RSA).
4. **Máy chủ nội bộ**: chép `XML-Pro.exe` 2.0.0 + tệp trang vào thư mục tạm, chạy với 1 hoá đơn mẫu, đo cổng 28765–28784 bằng `Get-NetTCPConnection` và tải thử `mau-itax.js`; đã đóng cửa sổ thử sau khi đo.
5. **Script `.ps1`**: tạo tệp tên có dấu, chạy cùng một script hai lần — không BOM / có BOM — bằng `powershell.exe` 5.1.
6. **Chèn mã độc**: thay mọi ô chữ trong 12 tệp mẫu và tên tệp bằng `<img src=x onerror=…>`, mở từng tệp, mở Dashboard, mở hộp đổi tên; đếm số lần mã chạy.

Kịch bản đo nằm ở thư mục nháp của phiên (không đưa vào dự án).
