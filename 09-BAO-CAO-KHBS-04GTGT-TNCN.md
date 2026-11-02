# [09] Tờ khai bổ sung 01/GTGT (KHBS), tờ khai 04/GTGT và sửa lỗi nhận nhầm 05/KK-TNCN — bản 3.0.2

> Ngày 03/11/2026 · Tiếp nối: [08 — Dashboard kế toán mới](08-BAO-CAO-DASHBOARD-KE-TOAN.md) · Xem [00 — Mục lục](00-MUC-LUC-BAO-CAO.md)
> Nguồn dữ liệu:
> - 4 tờ khai bổ sung 05/KK-TNCN thật do HTKK xuất ra (`C:\HTKK-TEMP\BCTC 2025`), dùng làm khuôn phụ lục KHBS;
> - mẫu hiển thị của iTax Viewer cài trên máy (`PLuc_01KHBS_TT80`, `PLuc_01_1_KHBS_TT80`, `TKhai_GTGT_04_TT80`, danh mục `DMucTKhai.xml`);
> - từ điển chỉ tiêu HTKK trong app (`ten-chi-tieu.js`, mẫu 842 và 847);
> - thư mục `HD-TK` (dữ liệu thật năm 2026, không lên git) và 6 hoá đơn mẫu trong `mau-xml`.

---

## Kết luận trước

1. **Sửa lỗi anh báo: 05/KK-TNCN bị nhận nhầm.**
   - **Nguyên nhân:** app nhận "tờ khai 01/GTGT" chỉ bằng cách xem tờ khai có ô `[23]` và `[32]` không. Nhưng 05/KK-TNCN cũng có hai ô này: [23] là thu nhập của cá nhân không cư trú, [32] là thuế trên phí bảo hiểm. Thêm nữa, Dashboard xếp *mọi* tờ khai HTKK vào ngành "Hoá đơn & Thuế GTGT".
   - **Hậu quả:**
     - thư mục chỉ có 4 tờ khai TNCN hiện Dashboard "HÓA ĐƠN & THUẾ GTGT … 4 hóa đơn/chứng từ", toàn số 0;
     - nếu trộn với hoá đơn, tờ khai TNCN có thể bị coi là tờ khai GTGT để đối chiếu.
   - **Đã sửa:**
     - nhận tờ khai theo **mã mẫu**: 842 hoặc 01 mới là 01/GTGT;
     - Dashboard chia ngành theo mã mẫu: TNCN sang "Nhân sự, BHXH & Thuế TNCN", GTGT sang "Hoá đơn";
     - Dashboard nhân sự đọc được 05/KK-TNCN (bảng theo kỳ: lao động [16], thu nhập chịu thuế [21], thuế đã khấu trừ [29]); mỗi kỳ chỉ tính bản bổ sung mới nhất.
   - **Đo:** đã thử bằng 4 tệp thật của anh. Số hiện ra (5 người, 75.000.000 đ/quý, cộng 300.000.000 đ) khớp với Python đọc thẳng tệp.
2. **Tờ khai bổ sung 01/GTGT, kèm phụ lục 01/KHBS và 01-1/KHBS.**
   - **Cách dùng:** từ một tờ khai bị lệch hoá đơn, bấm "Lập tờ khai bổ sung". App tính lại tờ khai theo hoá đơn và xuất XML "bổ sung lần n".
   - **Khuôn XML** chép theo tệp bổ sung thật của HTKK.
   - **Đo trên dữ liệu thật quý 1/2026** (tờ khai đã kê cả hoá đơn C26TKL-18 bị thay thế):
     - [23] giảm 89.656.000, [24] giảm 7.172.480 — đúng bằng hoá đơn bị thay thế;
     - [40] phải nộp: 0 → **401.941 đ**;
     - [43] chuyển kỳ sau: 6.770.539 → **0**;
     - tiền chậm nộp ước tính đến 03/11/2026 (187 ngày): **22.549 đ**;
     - bản bổ sung lập ra, khi đối chiếu lại, **khớp hoá đơn**.
3. **Tờ khai 04/GTGT (phương pháp trực tiếp trên doanh thu).**
   - **Cách dùng:** chọn Mẫu "04/GTGT" trong hộp lập tờ khai. Chọn nhóm ngành mặc định (1%, 5%, 3% hoặc 2%) rồi đổi nhóm cho từng hoá đơn nếu cần. App xuất XML mã 847.
   - **Đo:** 4 hoá đơn mẫu, doanh thu 1.130.646.600 đ, thuế 1% là 11.306.466 đ — đúng phép cộng Python độc lập. Mẫu iTax 04/GTGT dựng được tờ khai.
4. **Test:**
   - bộ test chính **36/36** (trước 29/29), thêm 7 mục mới;
   - 4 bộ test cũ: đạt;
   - đã có bộ cài **`CaiDat-XML-Pro-3.0.2.exe`** và đã kiểm mã mới nằm trong bộ cài.
5. **Chưa kiểm được — cần anh:**
   - nạp file KHBS và 04/GTGT vào HTKK / eTax: máy không có tệp kiểm cấu trúc (XSD) của Tổng cục Thuế, nên chưa chắc HTKK nhận 100%;
   - test phần vỏ WebView2 chưa chạy, vì XML-Pro đang mở trên máy anh (mục E).

## A. Lỗi nhận nhầm 05/KK-TNCN

| | Trước | Sau |
|---|---|---|
| Nhận tờ khai 01/GTGT | Có ô `ct23` và `ct32` là coi là 01/GTGT, nên 05/KK-TNCN bị nhận nhầm | Phải đúng mã mẫu 842 (TT80) hoặc 01 (mẫu cũ), và có các ô đó |
| Dashboard thư mục chỉ có 05/KK-TNCN | "HÓA ĐƠN & THUẾ GTGT", 4 "hóa đơn", toàn số 0 | "NHÂN SỰ, BHXH & THUẾ TNCN", bảng 4 quý, cộng thu nhập chịu thuế 300.000.000 đ |
| Tờ khai khác (BCTC, TNDN…) | Cũng bị gộp vào "Hoá đơn" | Không gộp vào ngành nào. Thư mục chỉ có loại này thì hiện trang tổng hợp |
| Một kỳ có cả lần đầu và bổ sung | — | Chỉ lấy bản bổ sung mới nhất, không cộng hai lần |

Việc này giúp làm lại Dashboard các ngành khác như anh muốn: mỗi loại tờ khai giờ đi đúng ngành theo mã mẫu, không đoán theo tên ô nữa.

## B. Tờ khai bổ sung 01/GTGT

**Khuôn lấy từ đâu:**
- Cấu trúc XML của hai phụ lục (`PL01_KHBS`, `PL01_1_KHBS`) chép theo 4 tệp bổ sung 05/KK-TNCN thật do HTKK xuất ra. Gồm cả các ô rỗng, ô `xsi:nil`, và ô xã/phường mới (`ma_Xa`, `ten_Xa`).
- Ý nghĩa từng mục lấy từ mẫu hiển thị chính thức của iTax:
  - 01/KHBS: I.1 thuế phải nộp tăng/giảm theo tiểu mục [10]; I.3 tiền chậm nộp; II thuế được khấu trừ tăng/giảm [12]; III thuế đề nghị hoàn [13];
  - 01-1/KHBS: số đã kê khai, số điều chỉnh, chênh lệch, điều chỉnh nghĩa vụ thuế, lý do; tổng [07] phải nộp, [08] khấu trừ, [09] hoàn.

**App tính thế nào:**
- Tính lại tờ khai từ hoá đơn đang nạp, bằng đúng hàm của phần lập tờ khai và đối chiếu.
- Các chỉ tiêu kế toán tự nhập ([21], [22], [23a], [24a], [37], [38], [39a], [40b], [42]) **giữ nguyên như tờ khai cũ**.
- Bảng 01-1/KHBS liệt kê mọi chỉ tiêu có thay đổi. Cột (7) "điều chỉnh nghĩa vụ thuế" chỉ ghi ở [40] (phải nộp), [43] (khấu trừ chuyển kỳ sau) và [42] (đề nghị hoàn); các dòng khác ghi 0.
  - Đây là cách app hiểu mẫu; tệp HTKK thật để so lại không có dòng điều chỉnh thuế nào (cả 4 tệp đều không đổi tiền thuế). **Cần anh xem HTKK có tính lại khác không.**
- 01/KHBS:
  - mục I.1 tiểu mục 1701 = thay đổi của [40];
  - mục II = thay đổi của [43];
  - tiền chậm nộp = số thuế tăng thêm × 0,03% × số ngày từ hạn nộp đến ngày anh chọn. Hạn nộp: kỳ quý là ngày cuối tháng đầu quý sau, kỳ tháng là ngày 20 tháng sau. Đây là **số ước tính**; số chính xác do cơ quan thuế tính theo ngày nộp thật.
- Số lần bổ sung = số lần của tờ khai đang điều chỉnh + 1. Đang nạp cả bản bổ sung trước thì app hỏi để lập tiếp từ bản mới nhất.
- Tên tệp theo kiểu HTKK: `…-01_GTGT_TT80-Q12026-L01.xml`.

**Cảnh báo app tự đưa ra:**
- [43] thay đổi: tờ khai các kỳ sau đã lấy [22] theo [43] cũ cũng phải xem lại; app **không tự sửa** các kỳ đó. Ví dụ dữ liệu thật: [22] của quý 2 = 6.770.539, chính là [43] cũ của quý 1.
- Phụ lục giảm thuế NQ142 thay đổi: tờ khai bổ sung đã lập lại phụ lục theo hoá đơn, nhưng bảng 01-1/KHBS chỉ kê chỉ tiêu của tờ khai chính.

**Chỗ bấm:**
- nút "📝 Lập tờ khai bổ sung theo hoá đơn" trong khung đối chiếu (khi lệch);
- nút "Lập tờ khai bổ sung" trên thẻ kỳ "Lệch thuế" / "Cần xem lại" ở Dashboard.

Hộp thoại cho chọn ngày lập, ngày tính chậm nộp và lý do. Nó hiện bảng cũ / mới / chênh lệch trước khi lập.

## C. Tờ khai 04/GTGT

- **Khuôn:**
  - đường dẫn từng ô theo từ điển HTKK mẫu 847 (`KhaiThueTPPTTTDT/PPhoiCCapHHoa/ct22`…);
  - phiên bản khuôn 2.7.4 (bản mới nhất trong danh mục iTax);
  - ô `khaiRiengThuHo` ghi `true` / `false` như mẫu iTax đọc (lúc đầu app ghi `0`, đọc mẫu mới thấy sai, đã sửa).
- **Doanh thu tính thuế:** giá thanh toán trên hoá đơn bán ra (`TgTTTBSo`). Phần hàng không chịu thuế / thuế suất 0% vào [21].
- **Nhóm ngành:** [22]/[23] 1%, [24]/[25] 5%, [26]/[27] 3%, [28]/[29] 2%; [30] = cộng doanh thu, [31] = cộng thuế, [32] = [21] + [30].
- **Cảnh báo:**
  - hoá đơn bán ra có ghi thuế GTGT (doanh nghiệp khai 04 thường xuất hoá đơn bán hàng) — app vẫn tính theo giá thanh toán và báo để kế toán xem;
  - app **chưa lập phụ lục giảm 20% mức tỷ lệ** theo nghị quyết giảm thuế GTGT. Không có tệp mẫu thật nào để chép khuôn, nên không đoán. Nếu doanh nghiệp được giảm thì lập thêm phụ lục trong HTKK.
- Mẫu iTax 04/GTGT in dòng "[01] Kỳ tính thuế: Lần phát sinh Tháng 10 năm 2026". Chữ "Lần phát sinh" là **mẫu chính thức in cố định**, không phải app ghi sai (đã đọc mẫu `TKhaiHeader.xsl`).

## D. Bằng chứng đo

| Mục test | Kết quả |
|---|---|
| 05/KK-TNCN không phải tờ khai GTGT, thư mục ra Dashboard nhân sự, mỗi kỳ lấy bản bổ sung mới nhất | ĐẠT |
| Thư mục trộn hoá đơn + 05/KK-TNCN: Dashboard kế toán không lấy tờ khai TNCN | ĐẠT |
| KHBS: tờ khai quên HĐ C26TNA-19 → [32] +254.233.250, [33]/[40] +20.338.660, chậm nộp 30 ngày 183.048 đ (Python tính độc lập) | ĐẠT |
| KHBS qua giao diện: nút → hộp thoại → file `-L01.xml` loại B lần 1, mẫu iTax dựng thẻ "Tờ khai bổ sung" + "Bản giải trình khai bổ sung", đối chiếu lại khớp | ĐẠT |
| KHBS dữ liệu thật quý 1/2026: số ở phần Kết luận | ĐẠT |
| 04/GTGT: doanh thu = cộng `TgTTTBSo` bằng Python (1.130.646.600), thuế 1% | ĐẠT |
| 04/GTGT: đổi 1 hoá đơn sang nhóm 5% → XML mã 847 đúng từng ô, mẫu iTax dựng được | ĐẠT |
| Toàn bộ test chính | **36/36** |
| 4 bộ test cũ (cây thư mục & Dashboard, 8 ngành, kế toán, giai đoạn 3) | đạt cả 4 |
| Bộ cài 3.0.2 chứa mã mới (`tinhKHBS`, `MA_TK_GTGT`, hộp thoại KHBS, nhóm 04) | đã kiểm |

## E. Chưa làm được / tự khai

- **Test phần vỏ WebView2 chưa chạy trên 3.0.2.** XML-Pro đang mở trên máy anh (tiến trình 5404), nên bài test tự dừng để không gửi nhầm tệp vào app của anh. Phần vỏ không đổi từ 3.0.0 (đã đạt 9/9).
  - Cách chạy: đóng XML-Pro, rồi mở PowerShell trong `F:\AI\7.xml-pro-v3` và gõ `python kiem-thu-vo-webview2.py`.
- **Chưa nạp thử vào HTKK / eTax.** Máy không có XSD, cũng không có chương trình HTKK (chỉ còn thư mục dữ liệu).
- **Lỗi nhận nhầm gồm hai phần, có từ hai lúc:**
  - Gộp mọi tờ khai vào ngành "Hoá đơn" có từ bản Gemini (commit `73458f1`, sáng 02/11).
  - Nhận 01/GTGT theo tên ô có từ bản 2.0.3, khi tôi làm phần đối chiếu (báo cáo 05). Tôi đã không kiểm mã mẫu — **lỗi của tôi**. Các bản 2.0.3 → 3.0.1 đều có lỗi này, kể cả bản 2.0.4 đang dùng ở `F:\AI\7.xml-pro` (chưa sửa ở đó).

## Cần anh

1. Đóng XML-Pro, cài `F:\AI\7.xml-pro-v3\dong-goi\ban-phat-hanh\CaiDat-XML-Pro-3.0.2.exe`, mở lại thư mục `BCTC 2025` để xem Dashboard TNCN.
2. Lập tờ khai bổ sung quý 1/2026 trong app, nạp file `-L01.xml` vào HTKK. Xem HTKK có nhận không, và số [40] 401.941, [43] 0 có giống HTKK tự tính không.
3. Nếu có doanh nghiệp khai 04/GTGT: lập thử một kỳ và nạp vào HTKK. Nếu có một tệp 04/GTGT thật (nhất là có phụ lục giảm thuế), gửi để tôi chép đúng khuôn phụ lục.
