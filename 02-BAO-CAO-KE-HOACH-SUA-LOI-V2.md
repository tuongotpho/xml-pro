# [02] Kế hoạch sửa toàn bộ lỗi XML-Pro v2.0.0

> Ngày 02/11/2026 · Tiếp nối: [01 — Rà soát toàn diện v2.0.0](01-BAO-CAO-RA-SOAT-TOAN-DIEN-V2.md) · Xem [00 — Mục lục](00-MUC-LUC-BAO-CAO.md)
> Nguồn dữ liệu: các lỗi và số đo trong báo cáo 01; phần sửa chưa commit của `dong-goi/XemXmlThue.cs` (238 dòng thêm, 49 dòng bỏ).

---

## Kết luận trước

- **9 bước, khoảng 1 ngày làm.** Làm đúng kiểu đo cách điện: **viết phép đo trước** (bộ test mới, lúc đầu phải báo HỎNG), rồi sửa từng lỗi cho tới khi phép đo báo ĐẠT.
- **Phải chốt 2 việc** trước khi bắt đầu (kế hoạch dưới đây theo phương án tôi khuyên):
  1. **Máy chủ nội bộ:** **bỏ** (quay về cách mở tệp của 1.7.x). Nếu anh chọn *giữ*, thay Bước 5 bằng Bước 5B.
  2. **Trung tâm cập nhật:** **gỡ** cho tới khi có kênh phát hành thật.
- Cuối cùng có **bộ cài mới 2.0.1**. Riêng việc **cài đè lên bản 1.7.7 đang dùng** thì để anh bấm. Các chỗ cần anh xác nhận bằng mắt ghi ở mục "Nghiệm thu".

---

## Bảng lỗi → bước sửa

| Lỗi (báo cáo 01) | Sửa ở bước | Đạt khi |
|---|---|---|
| A1 Chữ ký số báo giả 12/12 | 3 | 12/12 hợp lệ, khớp kết quả kiểm của Windows; hoá đơn bị sửa thì bị bắt |
| A1 Chỉ kiểm "vân tay", chưa kiểm chữ ký thật | 3 | Hoá đơn bị sửa **và tính lại vân tay** vẫn bị bắt |
| A1 Huy hiệu hiện trễ | 3 | Huy hiệu hiện trong ≤ 2 giây, không cần bấm lại tab |
| A2 Máy chủ tắt sau 2,6 s | 5 | Không còn máy chủ; bấm đúp 2 tệp → 2 tab |
| A3 Máy chủ để ngỏ cho web lạ | 5 | Không còn cổng nào mở |
| A4 39 dòng mất dấu | 2 | 0 dòng hỏng; nút sáng/tối hiện đúng biểu tượng |
| A5 `.ps1` không đổi được tên có dấu | 4 | Thử thật đổi được 1/1 tệp tên có dấu |
| B1 Trung tâm cập nhật rỗng | 6 | Gỡ khỏi giao diện |
| B2 Tài liệu không khớp mã | 7 | README / HUONG-DAN nói đúng cái app làm được |
| B3 Test không canh gác | 1 | Test cũ in "PASS" sai thì giờ báo HỎNG |
| B4 Lưu phiên không có nút xoá | 6 | Có nút "Xoá dữ liệu phiên", xoá xong IndexedDB rỗng |
| B6 1.658 dòng chưa commit | 0 và 9 | Mọi thứ nằm trong git |

---

## Các bước

### Bước 0 — Chốt đường lùi (5 phút)
- Tạo nhánh `sua-loi-v2`, commit **nguyên trạng** phần sửa chưa commit (kể cả các dòng mất dấu) với ghi chú "WIP v2.0.0 trước khi sửa lỗi".
- Lý do: 1.658 dòng hiện chỉ nằm trên ổ đĩa. Có bản chụp này thì sửa hỏng vẫn quay lại được.

### Bước 1 — Viết phép đo trước: `kiem-thu-sua-loi.py` (1–1,5 giờ)
Bộ test mới chạy Edge ngầm như các bộ cũ, nhưng **mỗi mục có điều kiện bắt buộc**, sai là dừng với mã lỗi:
1. 6 hoá đơn mẫu → 12/12 chữ ký `verified = true`.
2. Hoá đơn sửa 1 chữ số `TgTThue` → `tampered = true`.
3. Hoá đơn sửa số **và tính lại DigestValue** → vẫn `tampered = true`. Đây là phép thử kiểm chữ ký thật.
4. Mở hoá đơn → trong 2 giây có huy hiệu, không cần bấm lại.
5. `index.html` không còn dòng chữ Việt bị thành "?" (dùng lại phép dò của báo cáo 01).
6. Script `.ps1` sinh ra bắt đầu bằng BOM và chạy thật bằng PowerShell 5.1 đổi được tệp tên có dấu.
7. Mã nguồn không còn `api/rename`, `api/poll`, `HttpListener`.
8. Không còn nút / hộp "Trung tâm cập nhật"; có nút "Xoá dữ liệu phiên".
9. Thêm `kiem-thu-chu-ky-dotnet.ps1`: kiểm chéo 12 chữ ký bằng .NET `SignedXml`. App và Windows phải ra **cùng** kết quả.

Sửa luôn 3 bộ test cũ cho có "răng":
- `kiem-thu-ke-toan.py`: thêm `assert verified == True`.
- `kiem-thu-giai-doan-3.py`: tự đặt bảng mã UTF-8 để không còn đổ lỗi trên console Windows; kiểm biểu tượng sáng/tối khác "??".

**Đạt bước này khi:** chạy trên mã hiện tại, bộ test mới **báo HỎNG đúng các mục 1, 3, 4, 5, 6, 7, 8**. Mục 2 đã đúng sẵn nên không đếm. Test không bắt được lỗi đang có thì test vô dụng.

### Bước 2 — A4: khôi phục 39 dòng mất dấu (45 phút)
- Không lấy lại được chữ gốc từ git, vì các dòng này chưa từng được commit đúng. Phải **viết lại theo ngữ cảnh** từng dòng.
- Khoảng 20 dòng nằm trong phần "Đổi tên trực tiếp". Phần này **bị gỡ ở Bước 5**, nên chỉ phải viết lại khoảng 19 dòng: chế độ sáng/tối, thẻ "Khôi phục phiên", lưu phiên IndexedDB, chú thích.
- Biểu tượng nút sáng/tối (hiện là "??") dùng lại ☀️/🌙.
- Mọi lần ghi tệp dùng công cụ ghi UTF-8, **không** dùng `Set-Content` của PowerShell.

### Bước 3 — A1: sửa kiểm chữ ký số (2–3 giờ)
1. **Sửa 1 dòng đã thử** (`index.html:1494`): tìm phần dữ liệu đã ký trong cả tài liệu (`root.ownerDocument`), không tìm trong khối chữ ký.
2. **Kiểm chữ ký thật:**
   - lấy khoá công khai trong chứng thư số (`X509Certificate`);
   - chuẩn hoá khối `SignedInfo` theo đúng thuật toán ghi trong tệp (C14N có / không chú thích);
   - kiểm `SignatureValue` bằng Web Crypto. Hỗ trợ RSA-SHA1 và RSA-SHA256 (6 tệp mẫu dùng cả hai), chạy offline.
   - Kết quả có 3 mức: **Hợp lệ** (vân tay + chữ ký đều khớp), **Bị sửa** (lệch bất kỳ), **Không kiểm được** (thuật toán lạ). Mức cuối hiện màu xám, **không** báo đỏ.
3. **Chứng thư còn hạn lúc ký:** so `SigningTime` với hạn của chứng thư. Ngoài hạn thì cảnh báo vàng.
4. **Huy hiệu hiện ngay:** kiểm xong thì vẽ lại phần chữ ký của tab đang xem và cập nhật bộ lọc "⚠ Cần chú ý".
5. Sửa câu chữ: bỏ "khớp 100% bản ký gốc". Ghi rõ "Không kiểm tra chứng thư có bị thu hồi (cần mạng)".

### Bước 4 — A5: script `.ps1` (20 phút)
- Thêm BOM (`'\uFEFF'`) vào đầu nội dung trước khi tạo tệp tải về.
- Bỏ `SilentlyContinue`. Cuối script in rõ: đổi được N tệp, bỏ qua M tệp (không tìm thấy hoặc trùng tên), lỗi K tệp.
- **Không ghi đè tệp đã có**: bỏ `-Force`; tên mới trùng thì báo, không đổi.
- Thêm 2 dòng hướng dẫn đầu script: nếu Windows chặn tệp tải về thì chuột phải → Properties → Unblock.

### Bước 5 — A2 + A3: bỏ máy chủ nội bộ (1,5 giờ)
**`dong-goi/XemXmlThue.cs`**
- Lấy lại bản ở commit `333247e` (cách cũ: hàng chờ `mo\hang\<số>.js`, chạy ổn ở 1.7.7).
- Rồi so từng đoạn với bản v2.0.0, **chỉ giữ cải tiến không dính máy chủ**:
  - tìm cửa sổ theo đúng tiến trình Edge (`msedge`) thay vì chỉ theo tiêu đề;
  - dọn tệp hàng chờ cũ (`DonTepCu`).
- Khôi phục các chú thích tiếng Việt bị xoá.

**`index.html`**
- Gỡ: khối gọi `/api/poll`, nút + hàm "Đổi tên trực tiếp trên ổ đĩa".
- Hộp đổi tên giữ 2 cách: tải `.zip` hoặc tải `.ps1` (đã sửa ở Bước 4).
- CSP: bỏ `http://127.0.0.1:*` và `https://api.github.com` → `connect-src 'self'`. Lúc đó lời "100% offline" mới đúng.

**Đạt khi:**
- đóng gói, chạy `XML-Pro.exe` từ thư mục tạm, bấm đúp 2 hoá đơn mẫu lần lượt → 2 tab;
- `Get-NetTCPConnection` cho thấy không có cổng nào của app;
- F5 không trắng trang.

#### Bước 5B — nếu anh chọn GIỮ máy chủ (thay Bước 5, khoảng 1 ngày riêng)
- `XML-Pro.exe` chạy suốt tới khi cửa sổ Edge đóng.
- Mỗi lần mở tạo **mã phiên ngẫu nhiên** gửi kèm mọi yêu cầu. Bỏ `Allow-Origin: *`; kiểm tiêu đề `Host` / `Origin`.
- Chỉ phục vụ đúng danh sách tệp của app. Không nhận đường dẫn tuyệt đối.
- Chỉ đổi tên tệp **đã mở qua app**. **Không bao giờ xoá** tệp trùng tên.
- Lần chạy thứ hai chuyển tệp sang lần chạy đầu qua kênh nội bộ (named pipe).
- Thêm test tấn công: một trang web lạ gọi máy chủ phải bị từ chối 100%.

### Bước 6 — B1, B4: gỡ "Trung tâm cập nhật", thêm "Xoá dữ liệu phiên" (45 phút)
- Gỡ nút, hộp thoại và hàm kiểm cập nhật. Ô "Giới thiệu" chỉ ghi số phiên bản.
- Thêm nút "Xoá dữ liệu phiên". Bấm thì xoá IndexedDB và lịch sử, có hỏi lại trước khi xoá.

### Bước 7 — B2: tài liệu (45 phút)
- **README:** viết lại theo đúng cái app làm được, kèm số đo. Bỏ mục lặp "v1.8.0", bỏ "đối chiếu danh sách DN bỏ trốn" (không làm được offline).
- **HUONG-DAN.md:** cập nhật phần chữ ký số và phần đổi tên.
- Thống nhất tên hiển thị **XML-Pro**. Tên thư mục cài `XemXmlThue` **giữ nguyên** để không phá bản đang cài.
- Giữ dòng `(C) August87 - 0982722036` ở chân trang, Giới thiệu, thông tin `.exe`.

### Bước 8 — Đóng gói & nghiệm thu (45 phút)
- Chạy cả 5 bộ test + phép kiểm .NET. **Tất cả phải ĐẠT bằng điều kiện bắt buộc.**
- `dong-goi.ps1` → `CaiDat-XML-Pro-2.0.1.exe`.
- Chạy thử bộ cài ở chế độ im lặng (`/quiet`) vào máy? → **Không tự làm**, vì sẽ cài đè bản 1.7.7 anh đang dùng. Để anh bấm.

### Bước 9 — Commit (10 phút)
- Commit trên nhánh `sua-loi-v2`, mỗi bước một commit (dễ quay lui từng phần).
- Gộp vào `main` và đẩy lên GitHub **khi anh đồng ý**.
- Viết báo cáo `03-BAO-CAO-KET-QUA-SUA-LOI-V2.md` kèm số đo trước / sau.

---

## Nghiệm thu — cái tôi đo được và cái cần mắt anh

| Hạng mục | Tôi đo | Cần anh |
|---|---|---|
| Chữ ký số 12/12, bắt hoá đơn sửa, khớp .NET | ✔ | — |
| Không còn chữ mất dấu, `.ps1` đổi tên có dấu | ✔ | — |
| Không còn cổng mở, 2 tệp → 2 tab | ✔ (bản chạy từ thư mục tạm) | Cài 2.0.1, bấm đúp vài tệp thật |
| Tờ khai thuế HTKK hiển thị đúng | ✘ — kho mẫu chưa có tờ khai nào | Gửi 1–2 tệp tờ khai (hoặc cho phép lấy từ `F:\AI\HTKK-thanh`) |
| Giao diện chung, màu sáng/tối | Một phần (qua test) | Nhìn qua một lượt |
| Excel nhập vào MISA | ✘ | Thử nhập 1 tệp |

## Không nằm trong đợt sửa này
- Tách `index.html` thành module.
- Ký số tệp `.exe` (cần mua chứng thư ký mã).
- Chạy test tự động trên GitHub Actions.
- Bỏ `'unsafe-inline'` khỏi CSP. Đo thực tế chưa có lỗ, nên để đợt nâng cấp sau.
