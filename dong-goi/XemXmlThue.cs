// Cách mở DỰ PHÒNG của XML-Pro 3 (giữ nguyên như bản 2.0.4): dùng khi máy chưa có WebView2 Runtime.
// Vỏ chính nằm ở VoWebView2.cs. Bên dưới là mô tả gốc của cách mở bằng cửa sổ Edge.
// XemXmlThue.exe — bấm đúp tệp .xml thì chạy chương trình này.
// Chỉ dùng MỘT cửa sổ: tệp cần mở được ghi vào hàng chờ %LOCALAPPDATA%\XemXmlThue\mo\hang\<số>.js
// (số tăng dần). Cửa sổ "Xem XML thuế" đang mở thì nó tự đọc hàng chờ và mở thành tab mới;
// chưa có cửa sổ thì mở trang index.html (cùng thư mục) bằng cửa sổ riêng của Edge. Không gửi gì lên mạng.
// Tham số /uninstall: gỡ chương trình.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

static class KhoiDongEdge
{
    public static int Chay(string[] args)
    {
        string thuMuc = AppDomain.CurrentDomain.BaseDirectory;
        if (args.Length > 0 && args[0].Equals("/uninstall", StringComparison.OrdinalIgnoreCase))
            return GoCai(thuMuc, args.Length > 1 && args[1].Equals("/quiet", StringComparison.OrdinalIgnoreCase));

        string trang = Path.Combine(thuMuc, "index.html");
        if (!File.Exists(trang))
        {
            MessageBox.Show("Không thấy tệp index.html cạnh chương trình. Hãy cài lại.", Chung.TenApp, MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
        var tep = new List<string>();
        foreach (string a in args) if (File.Exists(a)) tep.Add(Path.GetFullPath(a));

        string hang = Path.Combine(Chung.ThuMucDuLieu, @"mo\hang");
        Directory.CreateDirectory(hang);

        // Chọn nhiều tệp rồi Enter thì Windows chạy nhiều bản exe cùng lúc: khoá chung để chỉ một bản mở cửa sổ.
        using (var khoa = new Mutex(false, @"Local\XemXmlThue-mo"))
        {
            try { khoa.WaitOne(30000); } catch (AbandonedMutexException) { }
            try
            {
                IntPtr cuaSo = TimCuaSo();
                if (cuaSo != IntPtr.Zero)
                {
                    string tepSo = Path.Combine(hang, "so.txt");
                    int so = 1;
                    try { so = Math.Max(1, int.Parse(File.ReadAllText(tepSo).Trim())); } catch { }
                    if (tep.Count > 0)
                    {
                        DonTepCu(hang);
                        GhiHang(Path.Combine(hang, so + ".js"), so, tep);
                        File.WriteAllText(tepSo, (so + 1).ToString());
                    }
                    DuaLenTruoc(cuaSo);
                    return 0;
                }

                // Chưa có cửa sổ Edge XML-Pro: Khởi tạo phiên mới, dọn sạch hàng chờ cũ
                XoaSachHang(hang);
                string tepSoMoi = Path.Combine(hang, "so.txt");
                int soDau = 1;
                if (tep.Count > 0)
                {
                    GhiHang(Path.Combine(hang, "1.js"), 1, tep);
                    File.WriteAllText(tepSoMoi, "2");
                }
                else
                {
                    File.WriteAllText(tepSoMoi, "1");
                }

                string edge = TimEdge();
                if (edge == null)
                {
                    MessageBox.Show("Máy chưa có trình duyệt Microsoft Edge (có sẵn trong Windows 10/11). Hãy mở tệp index.html trong thư mục:\n" + thuMuc, Chung.TenApp, MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return 1;
                }
                string url = new Uri(trang).AbsoluteUri + "?hang=" + Uri.EscapeDataString(new Uri(hang + "\\").AbsoluteUri) + "&so=" + soDau;
                // Hồ sơ trình duyệt riêng: không đụng tới Edge hằng ngày, không đồng bộ lên tài khoản.
                // --allow-file-access-from-files: để mục Lịch sử mở lại được tệp theo đường dẫn trên máy.
                string hoSo = Path.Combine(Chung.ThuMucDuLieu, "trinh-duyet");
                var psi = new ProcessStartInfo(edge,
                    "--app=\"" + url + "\" --user-data-dir=\"" + hoSo + "\" --no-first-run --no-default-browser-check --disable-sync" +
                    " --allow-file-access-from-files --disable-background-mode" +
                    " --start-maximized --window-position=0,0 --disable-pinch --overscroll-history-navigation=0" +
                    // Giao diện trình duyệt tiếng Việt trùng ngôn ngữ trang + tắt tính năng dịch: không còn hỏi \"Dịch trang này?\"
                    " --lang=vi --disable-features=Translate,TranslateUI,msEdgeTranslate,msEdgeSidebarV2");
                psi.UseShellExecute = false;
                Process.Start(psi);
                // Giữ khoá tới khi cửa sổ hiện ra, để các bản exe chạy sau gửi tệp vào cửa sổ này.
                for (int i = 0; i < 100 && TimCuaSo() == IntPtr.Zero; i++) Thread.Sleep(100);
                return 0;
            }
            finally { khoa.ReleaseMutex(); }
        }
    }

    static void GhiHang(string tepJs, int so, List<string> tep)
    {
        var js = new StringBuilder("window.__NHAN_FILE&&window.__NHAN_FILE(" + so + ",[");
        for (int i = 0; i < tep.Count; i++)
        {
            if (i > 0) js.Append(',');
            js.Append("{ten:").Append(ChuoiJs(Path.GetFileName(tep[i])))
              .Append(",duongDan:").Append(ChuoiJs(tep[i]))
              .Append(",b64:\"").Append(Convert.ToBase64String(File.ReadAllBytes(tep[i]))).Append("\"}");
        }
        js.Append("]);");
        // ghi ra tệp tạm rồi đổi tên, để trang không đọc phải tệp đang ghi dở
        string tam = tepJs + ".tam";
        File.WriteAllText(tam, js.ToString(), new UTF8Encoding(false));
        if (File.Exists(tepJs)) File.Delete(tepJs);
        File.Move(tam, tepJs);
    }

    // ---- Tìm cửa sổ "XML-Pro" của Edge (tiêu đề đúng bằng tên app) ----
    delegate bool EnumProc(IntPtr h, IntPtr l);
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc f, IntPtr l);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder s, int n);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int c);
    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")] static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);
    [DllImport("user32.dll")] static extern bool EnumDesktopWindows(IntPtr hDesktop, EnumProc lpfn, IntPtr lParam);
    [DllImport("user32.dll")] static extern bool CloseDesktop(IntPtr hDesktop);

    [DllImport("user32.dll")] static extern void SwitchToThisWindow(IntPtr h, bool fAltTab);

    static IntPtr TimCuaSo()
    {
        IntPtr thay = IntPtr.Zero;
        EnumProc proc = delegate (IntPtr h, IntPtr l)
        {
            if (!IsWindowVisible(h)) return true;

            var c = new StringBuilder(128); GetClassName(h, c, 128);
            string cls = c.ToString();
            if (!cls.StartsWith("Chrome_WidgetWin")) return true;

            uint pid;
            GetWindowThreadProcessId(h, out pid);
            if (pid == 0) return true;
            try
            {
                using (var p = Process.GetProcessById((int)pid))
                {
                    if (!p.ProcessName.Equals("msedge", StringComparison.OrdinalIgnoreCase))
                        return true;
                }
            }
            catch { return true; }

            var t = new StringBuilder(512); GetWindowText(h, t, 512);
            string title = t.ToString();
            if (string.IsNullOrEmpty(title)) return true;

            // Kiểm tra tiêu đề: chứa XML-Pro hoặc Xem XML hoặc Bảng Điều Hành
            if (title.IndexOf(Chung.TenApp, StringComparison.OrdinalIgnoreCase) >= 0 ||
                title.IndexOf("XML-Pro", StringComparison.OrdinalIgnoreCase) >= 0 ||
                title.IndexOf("Xem XML", StringComparison.OrdinalIgnoreCase) >= 0 ||
                title.IndexOf("Bảng Điều Hành", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                thay = h;
                return false;
            }
            return true;
        };

        EnumWindows(proc, IntPtr.Zero);
        if (thay == IntPtr.Zero)
        {
            try
            {
                IntPtr hDesk = OpenInputDesktop(0, false, 0x0100 /* DESKTOP_READOBJECTS */);
                if (hDesk != IntPtr.Zero)
                {
                    try { EnumDesktopWindows(hDesk, proc, IntPtr.Zero); }
                    finally { CloseDesktop(hDesk); }
                }
            }
            catch { }
        }
        return thay;
    }

    static void DuaLenTruoc(IntPtr h)
    {
        if (IsIconic(h)) ShowWindow(h, 9); // SW_RESTORE
        ShowWindow(h, 3); // SW_MAXIMIZE
        SwitchToThisWindow(h, true);
        SetForegroundWindow(h);
    }

    static string ChuoiJs(string s)
    {
        var b = new StringBuilder("\"");
        foreach (char c in s)
        {
            if (c == '"' || c == '\\') b.Append('\\').Append(c);
            else if (c < 0x20 || c == '\u2028' || c == '\u2029' || c == '<') b.Append("\\u").Append(((int)c).ToString("x4"));
            else b.Append(c);
        }
        return b.Append('"').ToString();
    }

    // Xoá sạch toàn bộ hàng chờ cũ khi khởi động phiên làm việc mới
    static void XoaSachHang(string thuMuc)
    {
        try
        {
            if (!Directory.Exists(thuMuc)) return;
            foreach (string f in Directory.GetFiles(thuMuc, "*.js*"))
                try { File.Delete(f); } catch { }
            string tepSo = Path.Combine(thuMuc, "so.txt");
            if (File.Exists(tepSo)) try { File.Delete(tepSo); } catch { }
        }
        catch { }
    }

    // Tệp tạm cũ hơn 1 ngày thì xoá (trang đã đọc xong từ lâu).
    static void DonTepCu(string thuMuc)
    {
        foreach (string f in Directory.GetFiles(thuMuc, "*.js*"))
            try { if (File.GetLastWriteTime(f) < DateTime.Now.AddDays(-1)) File.Delete(f); } catch { }
    }

    static string TimEdge()
    {
        foreach (RegistryKey goc in new[] { Registry.CurrentUser, Registry.LocalMachine })
        {
            try
            {
                using (var k = goc.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe"))
                {
                    string p = k == null ? null : k.GetValue("") as string;
                    if (!string.IsNullOrEmpty(p) && File.Exists(p)) return p;
                }
            }
            catch { }
        }
        foreach (string g in new[] { Environment.GetEnvironmentVariable("ProgramFiles(x86)"), Environment.GetEnvironmentVariable("ProgramFiles") })
        {
            if (string.IsNullOrEmpty(g)) continue;
            string p = Path.Combine(g, @"Microsoft\Edge\Application\msedge.exe");
            if (File.Exists(p)) return p;
        }
        return null;
    }

    public static int GoCai(string thuMuc, bool imLang)
    {
        if (!imLang && MessageBox.Show("Gỡ " + Chung.TenApp + " khỏi máy?", Chung.TenApp, MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes)
            return 1;
        Chung.HuyDangKy();
        try { File.Delete(Chung.LoiTat); } catch { }
        try { File.Delete(Chung.LoiTatDesktop); } catch { }
        try { Directory.Delete(Chung.ThuMucDuLieu, true); } catch { }
        // Tệp đang chạy không tự xoá được: nhờ cmd xoá thư mục cài sau 2 giây.
        // Chỉ xoá khi đang chạy từ đúng thư mục cài (tránh xoá nhầm thư mục khác).
        if (!string.Equals(Path.GetFullPath(thuMuc).TrimEnd('\\'), Path.GetFullPath(Chung.ThuMucCai).TrimEnd('\\'), StringComparison.OrdinalIgnoreCase))
            return 0;
        var psi = new ProcessStartInfo("cmd.exe", "/c timeout /t 2 /nobreak >nul & rmdir /s /q \"" + thuMuc.TrimEnd('\\') + "\"");
        psi.CreateNoWindow = true; psi.UseShellExecute = false;
        Process.Start(psi);
        if (!imLang) MessageBox.Show("Đã gỡ " + Chung.TenApp + ".", Chung.TenApp);
        return 0;
    }
}
