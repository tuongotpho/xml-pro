// CaiDat-XemXmlThue.exe — bộ cài. Chứa sẵn các tệp của chương trình (nhúng bên trong),
// chép vào %LOCALAPPDATA%\Programs\XemXmlThue, tạo lối tắt ở menu Start, đăng ký với Windows
// để "Xem XML thuế" hiện trong "Mở bằng" và trong Cài đặt > Ứng dụng mặc định.
// Tham số /quiet: cài không hỏi (dùng khi kiểm thử).
using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

static class CaiDat
{
    static readonly string[] Tep = { "XemXmlThue.exe", "index.html", "phien-ban.js", "jszip.min.js", "xuat-excel.js", "mau-itax.js", "ten-chi-tieu.js", "HUONG-DAN.md" };

    [STAThread]
    static int Main(string[] args)
    {
        bool imLang = args.Length > 0 && args[0].Equals("/quiet", StringComparison.OrdinalIgnoreCase);
        string dich = Chung.ThuMucCai;
        if (!imLang && MessageBox.Show(
                "Cài " + Chung.TenApp + " " + Chung.PhienBan + " vào máy?\n\n" +
                "• Đọc tờ khai, BCTC, thông báo thuế, chứng từ nộp tiền, hoá đơn điện tử (XML).\n" +
                "• Chạy hoàn toàn trên máy, không gửi dữ liệu đi đâu.\n" +
                "• Cài cho riêng tài khoản này, không cần quyền quản trị.\n\n" +
                "Thư mục cài: " + dich + "\n\n(C) August87 - 0982722036",
                "Cài đặt " + Chung.TenApp, MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes)
            return 1;
        try
        {
            Directory.CreateDirectory(dich);
            var asm = Assembly.GetExecutingAssembly();
            foreach (string t in Tep)
            {
                using (Stream s = asm.GetManifestResourceStream(t))
                {
                    if (s == null) throw new Exception("Bộ cài thiếu tệp " + t);
                    using (var f = File.Create(Path.Combine(dich, t))) s.CopyTo(f);
                }
            }
            string exe = Path.Combine(dich, Chung.TenExe);
            Chung.DangKy(exe);
            Chung.TaoLoiTat(Chung.LoiTat, exe);
        }
        catch (Exception e)
        {
            try { File.WriteAllText(Path.Combine(Path.GetTempPath(), "XemXmlThue-caidat-loi.txt"), e.ToString()); } catch { }
            if (!imLang) MessageBox.Show("Cài không thành công: " + e.Message + "\n\nNếu chương trình đang mở, hãy đóng lại rồi cài lại.", Chung.TenApp, MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 2;
        }
        if (imLang) return 0;

        var tl = MessageBox.Show(
            "Đã cài xong " + Chung.TenApp + ".\n\n" +
            "Windows không cho chương trình tự đặt mình làm mặc định — anh cần chọn một lần:\n" +
            "bấm Có → trong cửa sổ Cài đặt, ở dòng \".xml\" chọn \"" + Chung.TenApp + "\" → \"Đặt mặc định\".\n\n" +
            "(Hoặc: chuột phải một tệp .xml → Mở bằng → Chọn ứng dụng khác → " + Chung.TenApp + " → Luôn luôn.)\n\n" +
            "Mở cửa sổ Cài đặt ứng dụng mặc định ngay bây giờ?",
            Chung.TenApp, MessageBoxButtons.YesNo, MessageBoxIcon.Information);
        if (tl == DialogResult.Yes)
        {
            try { Process.Start("ms-settings:defaultapps?registeredAppUser=" + Uri.EscapeDataString(Chung.TenApp)); }
            catch { try { Process.Start("ms-settings:defaultapps"); } catch { } }
        }
        return 0;
    }
}
