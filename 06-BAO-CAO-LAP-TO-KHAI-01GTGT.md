# [06] Lập tờ khai 01/GTGT tháng / quý từ hoá đơn (bản 2.0.4)

> Ngày 02/11/2026 · Tiếp nối: [05 — Đối chiếu tờ khai ↔ hoá đơn](05-BAO-CAO-DOI-CHIEU-TO-KHAI-HOA-DON.md) · Xem [00 — Mục lục](00-MUC-LUC-BAO-CAO.md)
> Nguồn dữ liệu: mã lập tờ khai của app khai thuế (`F:\AI\4.August\apps\khaithue\app\src\core\gtgt.ts` và `xml.ts`); thư mục `HD-TK` (tờ khai quý 3/2026 đã nộp + zip hoá đơn thật — **không đưa lên git**); 6 hoá đơn mẫu trong `mau-xml`.

---

## Kết luận trước

- **Đã chuyển tính năng sang XML-Pro.**
  - Nút "📝 Lập tờ khai 01/GTGT từ hoá đơn" ở thanh bên.
  - Chọn **doanh nghiệp (MST)** và **tháng hoặc quý**; app lập đủ chỉ tiêu và phụ lục giảm thuế NQ142.
  - Hai lối ra: **mở xem ngay** theo mẫu iTax (app tự đối chiếu luôn), hoặc **tải file XML** khuôn HTKK để nạp vào HTKK / eTax.
- **Đo trên tờ khai thật quý 3/2026:** lập lại từ hoá đơn trong zip → **trùng 109/109 ô dữ liệu** với tờ khai anh đã nộp. Chỉ khác **thứ tự 5 dòng phụ lục mua vào** (số liệu y hệt). Lý do ở mục C.
- **Kỳ tháng** (app khai thuế chỉ có quý): lập tháng 10/2026 từ hoá đơn mẫu → số liệu đúng phép cộng Python độc lập, mở được bằng mẫu iTax, app tự đối chiếu ra **✔ Khớp**.
- **Test 27/27** (thêm 4 mục), 4 bộ test cũ đạt. Bộ cài `CaiDat-XML-Pro-2.0.4.exe` (18.108 KB), đã kiểm có nhúng `lap-to-khai.js`.

---

## A. Cách dùng

1. Kéo hoá đơn **mua vào và bán ra** của kỳ vào app (cả thư mục hoặc file zip). Nếu có tờ khai kỳ trước thì kéo vào luôn.
2. Bấm **📝 Lập tờ khai 01/GTGT từ hoá đơn**.
3. **Doanh nghiệp:** danh sách mọi MST có trong hoá đơn đã nạp, kèm số hoá đơn. Mặc định là MST anh đã cài, hoặc MST nhiều hoá đơn nhất. Kế toán dịch vụ chọn lần lượt từng công ty.
4. **Kỳ:** Quý / Tháng, số kỳ, năm. Mặc định là quý chứa hoá đơn mới nhất. Ngay dưới hiện "Quý 3/2026 (01/07 → 30/09): 12 hoá đơn mua vào, 3 hoá đơn bán ra".
5. **Thông tin người nộp thuế** (tên, địa chỉ, tỉnh, cơ quan thuế, người ký) tự điền, ưu tiên theo thứ tự:
   - tờ khai cũ cùng MST đang nạp;
   - lần lập trước trên máy này (app nhớ riêng cho từng MST);
   - thông tin trên hoá đơn — trường hợp này cần bổ sung mã tỉnh, cơ quan thuế.
6. **Chỉ tiêu nhập tay:**
   - [22] tự lấy = [43] của tờ khai **lần đầu** kỳ liền trước nếu có nạp; không có thì app ghi rõ để nhập tay;
   - [21], [23a], [24a], [37], [38], [39a], [40b], [42] nhập tay.
7. Bảng **xem trước** tính lại ngay khi sửa, kèm cảnh báo, ví dụ:
   - hoá đơn có thuế suất lạ;
   - hoá đơn không có bảng thuế suất;
   - hoá đơn mua vào có chữ ký bị sửa;
   - [42] lớn hơn [41];
   - đánh dấu [21] mà vẫn có hoá đơn.
8. **Lập & mở tờ khai:** tờ khai vào danh sách, hiện theo mẫu iTax (2 thẻ: tờ khai chính và phụ lục NQ142), khung đối chiếu chạy luôn. **Tải file XML:** lưu file tên kiểu HTKK, ví dụ `2601102955000-01_GTGT_TT80-Q32026-L00.xml`.

## B. Quy tắc tính

Lấy nguyên từ `gtgt.ts` của app khai thuế (đã khớp tờ khai HTKK nộp thật), có hai khác biệt:
- **Thuế suất lấy từ bảng thuế suất ghi trên hoá đơn** (`THTTLTSuat`), không phải đoán theo tỷ lệ thuế/giá trị như khi đọc Excel. Nhờ vậy [26] (KCT) và [32a] (KKKNT) **tự tính được**; bên app khai thuế hai ô này phải nhập tay.
- **Chọn hoá đơn dùng chung một hàm với phần đối chiếu:** theo MST và ngày lập trong kỳ, hoá đơn nạp trùng chỉ tính một lần, bỏ hoá đơn gốc đã bị thay thế. Vì vậy tờ khai lập ra và phần đối chiếu không bao giờ lệch quy tắc với nhau.

Các công thức chính:
- [23]/[24] = cộng giá trị / thuế mọi hoá đơn mua vào;
- [32] = phần 8% + 10% bán ra;
- [33] = 10% × [32] − thuế được giảm ở phụ lục;
- phụ lục bán ra: thuế được giảm = 2% giá trị, làm tròn theo từng người mua;
- [9] = tổng thuế được giảm − tổng thuế mua vào 8%;
- [34]–[43] theo công thức HTKK.

Khuôn XML lấy nguyên từ `xml.ts`: HTKK 5.7.3, mẫu 842, phiên bản XML 2.8.3, có thêm kỳ tháng (`kieuKy` M, `kyKKhai` dạng `10/2026`).

## C. Giới hạn — nói rõ

- **Thứ tự dòng phụ lục:** app xếp theo ngày hoá đơn. Tờ khai thật xếp theo một thứ tự khác: tôi thử ngày, MST, tên, số tiền đều không khớp, có lẽ là thứ tự trong file Excel tải từ cổng thuế. Số liệu từng dòng giống hệt, và tôi hiểu HTKK / eTax không yêu cầu thứ tự dòng, nhưng **chưa thử nộp thật**.
- **Kỳ tháng chưa so với tờ khai tháng thật**, vì trên máy không có tờ khai tháng nào. Định dạng `kyKKhai` "10/2026", tên tệp "-M102026-" và ngày từ/đến là theo cách HTKK hay ghi. Cần anh nạp thử một file tháng vào HTKK hoặc eTax để xác nhận.
- Chỉ lập **tờ khai lần đầu** (`loaiTKhai` C, lần 0). Chưa lập tờ khai bổ sung.
- **Mã ngành nghề** để mặc định "00 — Hoạt động sản xuất kinh doanh thông thường", giống app khai thuế. Doanh nghiệp có hoạt động đặc thù (xây dựng ngoại tỉnh, xổ số, thuỷ điện…) phải sửa trong HTKK.
- **Hàng nhập khẩu** ([23a]/[24a]) phải nhập tay, vì hoá đơn không chứa tờ khai hải quan.
- **File chưa ký số.** Kế toán nạp vào HTKK hoặc eTax để kiểm tra lần cuối, ký bằng USB token rồi nộp. App không nộp thay.

## D. Test

| Mục | Kết quả |
|---|---|
| Lập tháng 10/2026 từ 6 hoá đơn mẫu, so với phép cộng Python độc lập ([23] [24] [32] [33] [32a]) và công thức ([25] [34] [36] [40] khi nhập [22] = 1.000) | ✔ |
| Tờ khai lập ra: tên tệp kiểu HTKK, mở bằng mẫu iTax (2 biểu, không dự phòng), app tự đối chiếu → Khớp | ✔ |
| Hộp thoại mở, tự chọn đúng MST, đếm hoá đơn trong kỳ | ✔ |
| Lập lại quý 3/2026 thật (HD-TK) → 109/109 ô trùng tờ khai đã nộp | ✔ (chỉ chạy khi máy có `HD-TK`) |
| `kiem-thu-sua-loi.py` | **27/27**, mã thoát 0 |
| 4 bộ test cũ | đạt |

## Cần anh

- Cài `CaiDat-XML-Pro-2.0.4.exe`, lập tờ khai quý tới cho doanh nghiệp, **nạp file XML vào HTKK hoặc eTax** xem có được chấp nhận không. Bước này tôi không làm được thay.
- Nếu có doanh nghiệp khai theo **tháng**, thử lập một tháng và nạp vào HTKK để xác nhận định dạng kỳ tháng.
