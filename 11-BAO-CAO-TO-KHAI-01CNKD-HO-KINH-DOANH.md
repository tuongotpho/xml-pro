# [11] Lập tờ khai 01/CNKD cho hộ kinh doanh (TT 50/2026) — bản 3.0.4

> Ngày 03/11/2026 · Tiếp nối: [10 — Phát hành 3.0.3](10-BAO-CAO-PHAT-HANH-3.0.3.md) · Xem [00 — Mục lục](00-MUC-LUC-BAO-CAO.md)
> Nguồn dữ liệu:
> - **văn bản Thông tư 50/2026/TT-BTC** (tệp Word đính kèm bài của MeInvoice): mẫu 01/CNKD và phần ghi chú;
> - khuôn hiển thị chính thức của iTax Viewer trên máy (`HoKinhDoanh/TKhai_01_CNKD.xslt` bản 2.9.8, mã tờ khai 1266) và từ điển chỉ tiêu HTKK trong app;
> - bảng tỷ lệ theo Nghị định 68/2026/NĐ-CP: [Thư viện Pháp luật — bảng tra cứu tỷ lệ thuế HKD 2026](https://thuvienphapluat.vn/phap-luat-doanh-nghiep/bai-viet/bang-tra-cuu-ty-le-thue-ho-kinh-doanh-2026-theo-tung-nganh-nghe-theo-nghi-dinh-68-2026-nd-cp-19602.html); ngưỡng 01 tỷ theo NĐ 141/2026: [Thư viện Pháp luật](https://thuvienphapluat.vn/banan/tin-tuc/chinh-thuc-ho-kinh-doanh-co-doanh-thu-duoi-01-ty-dongnam-khong-phai-nop-thue-gtgt-tncn-tu-112026-the-21558.html), [Quốc Luật](https://quocluat.vn/kinh-nghiem/cach-tinh-thue-tncn-gtgt-ho-kinh-doanh-2026-theo-nguong-doanh-thu-1-ty);
> - **10 hoá đơn bán hàng giả lập** do app tạo (`mau-xml\ho-kinh-doanh-gia-lap`, MST giả 8000000001). Không có hoá đơn hay tờ khai thật của hộ kinh doanh nào.

---

## Kết luận trước

- **Đã làm xong:** lập tờ khai **01/CNKD** (hộ kinh doanh, cá nhân kinh doanh) từ hoá đơn bán ra, tháng hoặc quý, theo mẫu mới nhất của **Thông tư 50/2026**.
  - Cách mở: hộp "Lập tờ khai từ hoá đơn" → ô Mẫu chọn "01/CNKD — hộ, cá nhân kinh doanh".
- **Đo, với 10 hoá đơn giả lập của một hộ** (quý 1: 600 tr hàng hoá; quý 2: 500 tr hàng hoá + 200 tr dịch vụ; quý 3: 900 tr hàng hoá, có 50 tr hàng không chịu thuế):

  | | Thuế GTGT | Thuế TNCN | Mức 01 tỷ còn trừ kỳ sau | Khớp Python độc lập |
  |---|---|---|---|---|
  | Quý 1 | 6.000.000 | 0 (trừ 600 tr) | 400.000.000 | ✔ |
  | Quý 2 | 15.000.000 | 1.500.000 (trừ hết 200 tr dịch vụ trước, rồi 200 tr hàng hoá) | 0 | ✔ |
  | Quý 3 | 8.500.000 (không tính 50 tr hàng không chịu thuế) | 4.500.000 | 0 | ✔ |

  - Tệp XML lập ra mở bằng **khuôn chính thức của iTax** (mẫu TT 50/2026) hiện đủ bảng nhóm ngành, mã chỉ tiêu (a)(b), các dòng [18], [19], [20].
  - Ô "nộp thuế TNCN trên doanh thu tính thuế" được tích đúng.
- **Sửa thêm một lỗi tìm ra khi làm (có cả ở 04/GTGT bản 3.0.2):**
  - hoá đơn bán hàng không ghi thuế suất bị app coi là "thuế suất 0%";
  - hậu quả: cả doanh thu bị đưa vào cột 0%, không tính thuế;
  - đã sửa: chỉ tách phần không chịu thuế / 0% khi hoá đơn **ghi rõ** thuế suất đó.
- **Test:** bộ chính **41/41** (thêm 2 mục 01/CNKD), 4 bộ test cũ đạt.
- **Bộ cài:** `CaiDat-XML-Pro-3.0.4.exe` mới đóng gói **trên máy, chưa đăng GitHub**. Đăng lên thì máy người dùng sẽ tự báo cập nhật, nên chờ anh thử xong.
- **Chưa kiểm được:** chưa nạp tệp vào HTKK / eTax (không có HTKK, không có tờ khai 01/CNKD thật để so từng ô).

## A. Căn cứ — cái gì chắc, cái gì chưa chắc

| Điểm | Căn cứ | Độ chắc |
|---|---|---|
| Cấu trúc tờ khai, tên thẻ XML, mã tờ khai 1266, 6 nhóm ngành | khuôn iTax chính thức trên máy + từ điển HTKK | Chắc |
| Mã chỉ tiêu (a) (b) (c) (d) (đ) (e) cho 6 nhóm | văn bản TT 50/2026 (mẫu 01/CNKD) | Chắc |
| Dành cho hộ doanh thu năm **trên 01 tỷ**; khai quý nếu đến 50 tỷ, tháng nếu trên 50 tỷ | văn bản TT 50/2026 (ghi chú [01a], [01b]) | Chắc |
| Mức trừ 01 tỷ khi tính TNCN; chọn ngành có lợi nhất trừ trước; trừ tiếp đến khi đủ 01 tỷ | văn bản TT 50/2026 (ghi chú mẫu 01/CNKD) | Chắc |
| Tỷ lệ % GTGT / TNCN từng nhóm (1/0,5 · 5/2 · 5/5 · 3/1,5 · 5/5 · 2/1) | bảng tra cứu Thư viện Pháp luật theo NĐ 68/2026 (không mở được văn bản gốc NĐ 68) | Khá chắc, khớp bảng cũ của TT 40/2021 |
| Ngưỡng 01 tỷ (thay 500 triệu) | nhiều bài viết về NĐ 141/2026; một số bài cũ vẫn ghi 500 triệu | Khá chắc. **Sửa được trên hộp thoại** |
| Tiểu mục nộp: GTGT 1701, TNCN 1003 (phần D "hỗ trợ thông tin nộp thuế") | hiểu biết chung về mục lục ngân sách | Chưa đối chiếu văn bản. Mã chương để trống |

## B. App tính thế nào

- **Doanh thu:** giá thanh toán trên hoá đơn bán ra (`TgTTTBSo`).
  - Phần hàng ghi rõ "KCT" vào cột "doanh thu không chịu thuế GTGT"; phần ghi rõ "0%" vào cột 0%.
  - Hoá đơn trùng và hoá đơn đã bị thay thế được loại bằng đúng hàm của phần đối chiếu.
- **Nhóm ngành:**
  - chọn nhóm mặc định, đổi riêng từng hoá đơn ở bảng dưới;
  - mỗi nhóm một dòng ở mục I (địa điểm kinh doanh cố định — trụ sở).
- **Thuế GTGT** = (tổng doanh thu − doanh thu không chịu thuế − doanh thu 0%) × tỷ lệ % của nhóm.
- **Thuế TNCN (phương pháp theo doanh thu)** = (doanh thu − phần được trừ) × tỷ lệ % của nhóm.
  - Phần được trừ lấy từ mức 01 tỷ/năm còn lại.
  - "Đã trừ ở các kỳ trước" app tự tính từ hoá đơn các kỳ trước trong năm đang nạp; anh chị sửa được nếu tờ khai các kỳ trước trừ khác.
  - Trong kỳ, nhóm có tỷ lệ TNCN cao hơn được trừ trước, vì đó là phương án có lợi nhất cho người nộp.
  - Số còn trừ được ghi vào dòng "Bạn còn được tiếp tục trừ … đồng vào kỳ tiếp theo".
- **Phương pháp theo thu nhập tính thuế:** tờ khai chỉ kê doanh thu và thuế GTGT. App không có số liệu chi phí nên không tính TNCN, và báo rõ điều này.
- **Cảnh báo app tự đưa ra:**
  - doanh thu cả năm (theo hoá đơn đang nạp) chưa vượt 01 tỷ → hộ không phải khai 01/CNKD;
  - doanh thu trên 50 tỷ mà đang khai quý;
  - doanh thu trên 03 tỷ → kiểm tra có thuộc diện nộp TNCN theo thu nhập không;
  - hoá đơn có ghi thuế GTGT riêng (hộ kinh doanh thường xuất hoá đơn bán hàng).

## C. Chưa làm

- Phụ lục **01/BK-STK** (thông báo tài khoản ngân hàng) và **01/BK-HTK** (hàng tồn kho): app **xem** được nhưng chưa **lập**.
- Tờ khai năm **01/TKN-CNKD** (hộ doanh thu đến 01 tỷ) và **02/CNKD-TNCN-QTT** (quyết toán TNCN): xem được, chưa lập.
- Hộ có **nhiều địa điểm kinh doanh**, bán qua sàn thương mại điện tử (mục II), hoá đơn theo từng lần phát sinh (mục III): app hiện chỉ kê một địa điểm (trụ sở).
- App chưa tự đoán nhóm ngành theo tên hàng hoá; nhóm do người dùng chọn.

## D. Cần anh

1. Cài `F:\AI\7.xml-pro-v3\dong-goi\ban-phat-hanh\CaiDat-XML-Pro-3.0.4.exe` (đóng XML-Pro trước).
2. Kéo thư mục `F:\AI\7.xml-pro-v3\mau-xml\ho-kinh-doanh-gia-lap` vào app.
3. Mở "🧰 Công cụ → 📝 Lập tờ khai từ hoá đơn" → Mẫu "01/CNKD", doanh nghiệp 8000000001, quý 2/2026. Đổi 2 hoá đơn ký hiệu C26HDV sang nhóm "02 — Dịch vụ". Kết quả đúng phải ra GTGT 15.000.000, TNCN 1.500.000.
4. Nếu có khách là hộ kinh doanh thật: nạp tờ khai app lập vào HTKK xem có nhận không. Đó là bước chứng minh cuối cùng.
5. Thử ổn thì báo tôi đăng bản 3.0.4 lên kho phát hành.
