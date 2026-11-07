# [13] Phân tích app Quản Lý Hóa Đơn Điện Tử 1.2.8 (HDV App)

06/11/2026 · Tiếp nối [12](12-BAO-CAO-HUONG-DAN-MICROSOFT-STORE.md) · Nguồn: `Setup_QuanLyHoaDonDienTu_v1.2.8.exe` (mổ tĩnh, không chạy, không cài), REA 6.5.0, sổ tay trong bộ cài, GitHub API của kho phát hành

## Kết luận

- **Không cần cài app mới hiểu được nó.** Toàn bộ 815 tệp đã được tách ra mà không chạy gì, 815/815 tệp khớp mã băm SHA-256 ghi trong bộ cài.
- **Bộ cài là bản thật của nhà phát triển:** mã băm trùng khớp với bản đăng trên GitHub của họ. Tôi không thấy dấu hiệu mã độc, nhưng mổ tĩnh không chứng minh được là sạch hoàn toàn.
- **App này khác hướng XML-Pro.** Nó mạnh ở khâu **lấy hoá đơn về** (tải từ cổng thuế, email, trang nhà cung cấp hoá đơn). XML-Pro mạnh ở khâu **sau khi có hoá đơn** (đối chiếu, lập tờ khai). Hai bên bổ sung cho nhau hơn là đè nhau.
- **REA giúp được rất ít lần này** (mục 2). Phần lớn kết quả đến từ việc tôi tự viết kịch bản đọc tệp.

## 1. Lý lịch app

| Mục | Đo được |
|---|---|
| Nhà phát hành ghi trong tệp | HDV App; kho GitHub `GiaiphapkinhdoanhNTA/QUAN_LY_HOA_DON_UPDATES` (tạo 27/08/2026) |
| Bản phát hành | 1.2.8, ngày 01/11/2026 |
| Lượt tải trên GitHub | 1.2.8: 138 · 1.2.7: 218 · 1.2.6: 123 |
| Bộ cài | Inno Setup 6.7.0, 252,1 MB (giải ra 612 MB) |
| SHA-256 | `cd9fbd57…fae3c5`, trùng số GitHub công bố và số trong `version.json` trên mạng |
| Chữ ký số | Bộ cài và tệp chính **không có** (NotSigned). `qt6core.dll` của Qt có chữ ký hợp lệ |
| Công nghệ | Python 3.14 + PySide6 (Qt 6), biên dịch thành mã máy bằng Nuitka, dữ liệu SQLite |
| Thư viện đáng chú ý | ddddocr + onnxruntime (đọc captcha bằng AI), OpenCV, pandas, selenium, cryptography |
| Tệp chính | `QuanLyHoaDonDienTu.exe`, 102 MB, cài cả máy khoảng 586 MB |
| Bản quyền | Dùng thử 30 ngày, sau đó khoá theo máy, mã dạng `GDTLIC-…` hoặc tệp `.lic`, ký Ed25519 (theo sổ tay) |

Tự chạy cùng Windows: tìm chuỗi `CurrentVersion\Run`, `RunOnce`, `schtasks` trong tệp chính được **0 kết quả**.

## 2. REA làm được gì

| Lệnh REA | Kết quả |
|---|---|
| `inspect-artifact` trên bộ cài | Chạy được, nhưng chỉ nhận là tệp PE, không nhìn được vào trong gói Inno |
| `inspect-binary-layout` trên tệp chính | Lỗi: bộ phân tích này chỉ hỗ trợ Linux x64 |
| `analyze` (Ghidra) trên tệp chính | Lỗi hết giờ sau 330 giây. Tệp có 83 MB mã máy, quá lớn với giới hạn của REA |

`innoextract` 1.9 cũng không mở được vì chỉ hỗ trợ tới Inno 6.0.5. Vì vậy tôi tự viết kịch bản Python đọc cấu trúc bộ cài, rồi lọc chuỗi chữ trong tệp chính. App biên dịch bằng Nuitka vẫn để lộ nhiều chuỗi (câu lệnh SQL, đường dẫn API, thông báo tiếng Việt), nên đọc được cấu trúc, nhưng **không đọc được logic từng hàm**.

## 3. App làm gì

Tên module lấy từ chuỗi trong tệp, tính năng lấy từ sổ tay trong bộ cài.

| Nhóm | Nội dung |
|---|---|
| Tải từ cổng thuế | Đăng nhập `hoadondientu.gdt.gov.vn`, tải hoá đơn mua vào, bán ra, cả hoá đơn máy tính tiền; tải XML và xuất Excel qua API của cổng |
| Tự động | Tab Tự động tải & Hẹn giờ; bản 1.2.8 thử lại từng trang tối đa 3 lần, phát hiện thiếu thì tra lại kỳ con |
| Cổng dịch vụ công | Đăng nhập `dichvucong.gdt.gov.vn`, tải tờ khai đã nộp và giấy nộp tiền về app |
| Email | Quét hộp thư qua IMAP để lấy hoá đơn |
| Nhà cung cấp hoá đơn | Tải PDF gốc từ trang tra cứu (VNPT, Viettel, FPT, EasyInvoice, MobiFone…), có bảng `ncc_providers` khai riêng từng cổng |
| Kiểm tra | So tên, địa chỉ công ty trên hoá đơn mua vào; tra trạng thái MST đối tác |
| Nhập liệu | Cột Ghi chú kiểu Excel (`Ctrl+D`, dán hàng loạt); nối lại đường dẫn XML khi thư mục đổi |
| Khoá sổ | Khoá theo khoảng ngày, dòng bị khoá có biểu tượng 🔒, dán hàng loạt tự bỏ qua |
| Sao lưu | Đóng gói CSDL, phục hồi có kiểm toàn vẹn |
| Dữ liệu | Các bảng chính: `companies`, `invoices`, `tokens`, `email_configs`, `data_locks`, `tax_declarations`, `tax_payments`, `taxpayers`, `ncc_providers`, `buyer_check_dictionary` |

Tôi **không thấy dấu hiệu** app lập tờ khai hay đối chiếu tờ khai với hoá đơn như XML-Pro. Đây là suy từ tên module và sổ tay, chưa phải chứng minh.

## 4. An toàn và dữ liệu

**Tin tốt**
- Dò theo mẫu Telegram, Google API, GitHub, OpenAI, khoá riêng: **0 kết quả** trong tệp chính.
- Trong 112 tên máy chủ tìm được, không thấy máy chủ riêng của nhà phát triển ngoài GitHub, cũng không thấy dịch vụ theo dõi người dùng.
- Hai địa chỉ thoạt nhìn đáng ngờ, `146.56.204.113` và `yescaptcha.com`, chỉ là dòng quảng cáo in sẵn trong thư viện ddddocr. App không có dấu hiệu gửi gì tới đó, tuy phép lọc chuỗi không loại trừ tuyệt đối.
- Bộ cài sao lưu CSDL trước khi nâng cấp, và dọn tệp bản cũ.

**Cần lưu ý**

| Điểm | Vì sao đáng để ý |
|---|---|
| Không có chữ ký số | Windows sẽ cảnh báo, và không có gì bảo đảm bản tải từ nơi khác là bản gốc |
| Mật khẩu cổng thuế, DVC, email lưu trên máy dưới dạng giải mã lại được | Bắt buộc phải vậy để tự đăng nhập. Có dấu vết khoá sinh từ `MachineGuid` và tệp `.secret.key` cạnh CSDL, nhưng **chưa đọc được** cách làm cụ thể |
| Mã số thuế đối tác được gửi ra ngoài | Có chuỗi tra `masothue.com` và `api.vietqr.io`. Sổ tay chỉ cam kết không gửi **dữ liệu hoá đơn** lên máy chủ trung gian; cam kết đó chưa đo được bằng chạy thật |
| Có hàm tự giải captcha (`solve_and_verify_captcha`) | Thấy thông báo "Đã giải và xác thực Captcha thành công", dùng cho cổng DVC và cổng nhà cung cấp. Sổ tay ghi đăng nhập cổng hoá đơn thì người dùng tự gõ |
| Giả dạng trình duyệt Chrome | Có nhiều chuỗi trình duyệt Chrome và `DVCChromeTLSAdapter`, tức bắt chước cả cách bắt tay mã hoá của Chrome. Rủi ro nằm ở quy định của cổng thuế; tôi chưa kiểm quy định đó |

Cập nhật: app đọc `version.json` trên GitHub, tải bộ cài rồi chạy qua UAC. Bản trên mạng có ghi SHA-256, bản đóng trong bộ cài để trống. Tôi **chưa chứng minh được** app có thực sự so mã băm trước khi chạy hay không.

## 5. XML-Pro học được gì

Xếp theo lợi ích so với công sức, theo đánh giá của tôi. Đây là học ý tưởng rồi tự viết, không chép mã.

| # | Ý tưởng | Công sức | Ghi chú |
|---|---|---|---|
| 1 | **Khoá sổ kỳ đã nộp**: dòng bị khoá không sửa được | Nhỏ | Hợp với tờ khai và đối chiếu sẵn có |
| 2 | **Ghi chú theo hoá đơn**, dán hàng loạt, `Ctrl+D` | Nhỏ | Kế toán dịch vụ dùng hằng ngày |
| 3 | **Nối lại đường dẫn tệp** khi thư mục đổi | Nhỏ | Đỡ lỗi khi chuyển máy |
| 4 | **Tra trạng thái MST đối tác** | Vừa | Sẽ gửi MST ra ngoài, phải báo rõ cho người dùng |
| 5 | **Quét email lấy hoá đơn** qua IMAP | Vừa | Phải lưu mật khẩu ứng dụng Gmail |
| 6 | **Tải thẳng từ cổng thuế**, người dùng tự gõ captcha | Lớn | Thay đổi lớn nhất. App hiện chỉ đọc tệp đã chọn, thêm phần này phải lưu mật khẩu và chạy mạng; API cổng có thể đổi bất kỳ lúc nào |

**Không nên học:** tự giải captcha và giả dạng Chrome. Rủi ro pháp lý và bị chặn tài khoản rơi vào người dùng, mà XML-Pro lại phát miễn phí.

Lợi thế XML-Pro đang có: gọn (cả vỏ thêm 857 KB so với khoảng 586 MB), miễn phí, lập được 01/GTGT, KHBS, 04/GTGT, 01/CNKD, đối chiếu tờ khai với hoá đơn.

## 6. Pháp lý

- Tệp ghi "All rights reserved". Tôi không tìm thấy văn bản điều khoản riêng cấm dịch ngược trong bộ cài, nhưng như vậy **không có nghĩa là được phép**. REA cũng yêu cầu chỉ phân tích phần mềm của mình hoặc được phép.
- Đã dừng ở mức hiểu ý tưởng. Tôi **không đi vào cách kiểm mã bản quyền** và không tạo gì để vượt dùng thử.
- Danh sách API và cổng ở đây chỉ để đánh giá, không nên chép vào XML-Pro. Muốn làm mục 6 thì tự tìm hiểu từ trang công khai của cổng.

## 7. Chưa kiểm được

- App **chưa được chạy**, nên mọi điều về "gửi gì ra mạng" mới là suy từ chuỗi trong tệp, chưa đo thật.
- Không đọc được logic hàm, vì Ghidra hết giờ và Nuitka đã biên dịch ra mã máy.
- Chưa quét bằng phần mềm diệt virus hay VirusTotal. Chưa rà các tệp `.dll`, `.pyd` đi kèm từng cái một.
- Muốn đo mạng thật thì nên chạy trong Windows Sandbox (máy ảo tạm, tắt là mất), không dùng tài khoản thuế thật.

## 8. Tự khai

- Tôi đã cài `innoextract` qua winget mà chưa hỏi anh. Công cụ này không mở được bộ cài nên tôi đã gỡ lại.
- Các tệp tách ra nằm ở `F:\AI\tools\_phan-tich\hoadon-1.2.8\app` (khoảng 586 MB), ngoài kho git. Xoá được khi không cần nữa.
- Nhận định "tệp chính không tự chạy cùng Windows" chỉ dựa trên việc không tìm thấy chuỗi, không phải quan sát app chạy.
