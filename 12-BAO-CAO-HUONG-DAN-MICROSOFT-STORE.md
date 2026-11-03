# [12] Hướng dẫn đưa XML-Pro lên Microsoft Store (để hết cảnh báo khi cài) + bộ cài 3 bước

> Ngày 03/11/2026 · Tiếp nối: [11 — Tờ khai 01/CNKD](11-BAO-CAO-TO-KHAI-01CNKD-HO-KINH-DOANH.md) · Xem [00 — Mục lục](00-MUC-LUC-BAO-CAO.md)
> Nguồn: [Windows Developer Blog — đăng ký miễn phí cho nhà phát triển cá nhân (10/09/2025)](https://blogs.windows.com/windowsdeveloper/2025/09/10/free-developer-registration-for-individual-developers-on-microsoft-store/), [Microsoft Store Developer](https://storedeveloper.microsoft.com/), [Microsoft Learn — chọn cách phân phối app](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/choose-distribution-path), [Microsoft Learn — yêu cầu gói MSIX](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-package-requirements), [Microsoft Learn — bắt đầu với Store](https://learn.microsoft.com/en-us/windows/apps/publish/get-started); bộ cài `CaiDat-XML-Pro-3.0.6.exe` (chụp màn hình ở chế độ không cài).

---

## Kết luận trước

- **Đường đi được: đóng gói XML-Pro theo chuẩn MSIX rồi nộp lên Microsoft Store.**
  - Microsoft **tự ký số** gói sau khi duyệt, nên người dùng cài từ Store **không còn cảnh báo**.
  - Store tự cập nhật app cho người dùng.
- **Đường không được: nộp tệp .exe như bây giờ.** Store không ký thay cho tệp .exe. Muốn đi đường này vẫn phải tự mua chứng thư ký mã, nên không giải quyết được cảnh báo.
- **Chi phí: 0 đồng.** Từ 10/09/2025 Microsoft miễn phí đăng ký tài khoản nhà phát triển cá nhân, gần 200 nước, không cần thẻ tín dụng.
- **Chỗ cần anh tự làm (tôi không làm thay được):**
  - đăng ký tài khoản, xác minh bằng **căn cước + ảnh chân dung**;
  - đặt tên app trên Store;
  - gửi tôi 3 dòng thông tin định danh.
- **Bộ cài 3 bước** (chào mừng + tuỳ chọn → đang cài → hoàn tất) đã làm xong ở bản 3.0.6. Bản này dùng cho người tải từ trang web; cảnh báo SmartScreen vẫn còn với cách cài này.

## A. Anh làm (khoảng 30 phút, trên trình duyệt)

1. Vào **https://storedeveloper.microsoft.com** → bấm đăng ký (Get started / Sign up).
   - Phải vào đúng trang này: vào thẳng Partner Center có thể gặp quy trình cũ có thu phí.
2. Đăng nhập bằng **tài khoản Microsoft cá nhân** (Outlook / Hotmail / tài khoản Windows của anh).
3. Chọn loại tài khoản **Individual (Cá nhân)**.
   - Loại tài khoản **không đổi được** về sau.
   - Nếu muốn đứng tên công ty thì chọn Company. Theo trang của Microsoft, từ 07/05/2026 loại công ty cũng miễn phí, nhưng phải đăng nhập bằng tài khoản công việc (Microsoft Entra ID).
4. Xác minh danh tính: quét **căn cước công dân** và chụp **ảnh chân dung (selfie)** theo hướng dẫn trên màn hình. Thường duyệt trong vài phút đến vài ngày.
5. Tài khoản kích hoạt xong: vào **Partner Center → Apps and games → New product → MSIX or PWA app** → đặt tên **XML-Pro**. Tên trùng thì thử "XML-Pro Thuế" hoặc tên khác.
6. Mở app vừa tạo → **Product management → Product identity**. Gửi tôi 3 dòng ở đó:
   - `Package/Identity/Name`
   - `Package/Identity/Publisher` (dạng `CN=…`)
   - `Package/Properties/PublisherDisplayName`

Đây là chỗ **chặn thật**: thiếu 3 dòng này tôi không đóng được gói hợp lệ để nộp.

## B. Tôi làm (sau khi có 3 dòng trên)

1. **Cài Windows SDK** (công cụ đóng gói MSIX miễn phí của Microsoft) bằng `winget`. Cần anh đồng ý vì là cài phần mềm mới lên máy.
2. **Làm bản XML-Pro cho Store:**
   - gói MSIX gồm XML-Pro.exe, các tệp trang, thư viện WebView2;
   - biểu tượng các cỡ Store yêu cầu (44, 50, 150, 310 px…) dựng từ biểu tượng đỏ XML / PRO;
   - khai báo mở tệp `.xml` bằng XML-Pro;
   - **tắt tính năng tự kiểm tra bản mới qua GitHub**: bản Store do Store cập nhật, mục Cập nhật trong Giới thiệu sẽ ghi "cập nhật qua Microsoft Store".
3. **Thử trên máy** ở chế độ nhà phát triển (bật Developer Mode trong Cài đặt Windows, anh bấm). Kiểm: mở app, kéo thả thư mục, lập tờ khai, in.
4. **Trang chính sách riêng tư** trên `xmlpro.web.app`. Store thường yêu cầu đường link này khi app có ra mạng (app có hỏi bản mới; bản Store thì không, nhưng vẫn nên có).
5. **Soạn sẵn nội dung trang Store:** mô tả, tính năng, ảnh chụp màn hình (dùng dữ liệu giả lập), từ khoá. Anh chỉ cần dán vào Partner Center.

## C. Anh nộp (trong Partner Center)

1. **Packages:** tải lên tệp `.msixupload` tôi đưa.
2. **Store listings:** dán mô tả, ảnh chụp màn hình.
3. **Properties:** chọn nhóm "Business" hoặc "Productivity"; dán link chính sách riêng tư.
4. **Age ratings:** trả lời bảng câu hỏi (app không có nội dung nhạy cảm).
5. **Pricing:** miễn phí; thị trường chọn Việt Nam hoặc tất cả.
6. **Submit for certification.** Microsoft duyệt, thường 1–3 ngày. Bị trả về thì gửi tôi thư phản hồi để sửa.

## D. Bản Store khác bản tải từ web chỗ nào

| | Bản tải từ web (bộ cài 3 bước) | Bản Microsoft Store |
|---|---|---|
| Cảnh báo khi cài | Có (SmartScreen) | **Không** |
| Cập nhật | App tự báo, người dùng tải bộ cài mới | Store tự cập nhật |
| Chuột phải thư mục → "Mở bằng XML-Pro" | Có | Bản đầu chưa có (cần thêm phần mở rộng Explorer, làm sau) |
| Mở tệp .xml bằng XML-Pro | Có | Có |
| Số lượt cài, lượt dùng | Chỉ có số lượt tải trên GitHub | **Partner Center có sẵn thống kê**: lượt tải, lượt cài, số người dùng, lỗi app — không phải tự làm thêm |

Nên **giữ cả hai**: Store là đường chính cho người dùng mới, trang web vẫn để bộ cài cho ai cần. Ngoài ra, chuyển sang Store cũng giải quyết luôn câu hỏi "đếm người cài, người dùng": Partner Center có sẵn số liệu, không cần sửa lời cam kết "không gửi dữ liệu".

## E. Bộ cài 3 bước (bản 3.0.6, chưa đăng)

| Bước | Nội dung |
|---|---|
| 1. Chào mừng + tuỳ chọn | Giới thiệu ngắn; thư mục cài (đổi được, **ghi nhớ** để lần sau cập nhật đúng chỗ); tạo lối tắt màn hình nền; thêm "Mở bằng XML-Pro" khi chuột phải. Đã cài rồi thì tiêu đề ghi "Cập nhật XML-Pro lên …" |
| 2. Đang cài | Thanh tiến trình theo từng tệp. XML-Pro đang mở thì **hỏi trước** rồi mới đóng |
| 3. Hoàn tất | Tick "Mở XML-Pro ngay"; tuỳ chọn mở Cài đặt Windows để chọn XML-Pro làm app mở tệp .xml |

- Dải đỏ bên trái có biểu tượng XML / PRO, phiên bản và bước hiện tại. Chân cửa sổ có dòng `(C) August87 - 0982722036`.
- **Đã kiểm:** biên dịch được; chụp cả 3 màn hình bằng chế độ `/chup` (không cài gì). Lần chụp đầu phát hiện nút bấm bị tràn ra ngoài khung và chữ "Bước 1" bị tô màu lạ; đã sửa và chụp lại.
- **Chưa kiểm:** **chưa cài thật**. Cài thật trên máy này sẽ đè lên XML-Pro anh đang dùng. Muốn xem thử giao diện mà không cài, chạy bộ cài với tham số `/thu`. Cài thật lần đầu nên do anh bấm, để kiểm cả việc ghi nhớ thư mục và tự đóng app đang mở.
- Sửa kèm: mô tả trong thông tin tệp .exe trước ghi "8 hệ sinh thái", nay ghi đúng tính năng.
