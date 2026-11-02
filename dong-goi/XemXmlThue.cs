// XemXmlThue.exe — Bấm đúp tệp .xml thì chạy chương trình này.
// Phiên bản v2.0.0: Tích hợp Local Loopback Server (HttpListener)
// - Cung cấp API /api/rename để đổi tên file trực tiếp trên ổ cứng 1-click
// - Cung cấp API /api/poll để chuyển file tức thì giữa các phiên mà không lưu rác ra đĩa
// - Chạy origin an toàn http://127.0.0.1:<port> không cần cờ --allow-file-access-from-files
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

static class XemXmlThue
{
    static HttpListener _server;
    static int _port = 0;
    static readonly List<string> _hangDoiMo = new List<string>();
    static readonly object _khoaHang = new object();

    [STAThread]
    static int Main(string[] args)
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

        using (var khoa = new Mutex(false, @"Local\XemXmlThue-mo"))
        {
            try { khoa.WaitOne(30000); } catch (AbandonedMutexException) { }
            try
            {
                IntPtr cuaSo = TimCuaSo();
                if (cuaSo != IntPtr.Zero)
                {
                    // Đã có cửa sổ đang chạy: thêm file vào hàng chờ
                    string tepSo = Path.Combine(hang, "so.txt");
                    int so = 1;
                    try { so = Math.Max(1, int.Parse(File.ReadAllText(tepSo).Trim())); } catch { }
                    if (tep.Count > 0)
                    {
                        DonTepCu(hang);
                        GhiHang(Path.Combine(hang, so + ".js"), so, tep);
                        ThemHangDoiMemory(tep);
                        File.WriteAllText(tepSo, (so + 1).ToString());
                    }
                    DuaLenTruoc(cuaSo);
                    return 0;
                }

                // Khởi tạo phiên mới
                XoaSachHang(hang);
                string tepSoMoi = Path.Combine(hang, "so.txt");
                int soDau = 1;
                if (tep.Count > 0)
                {
                    GhiHang(Path.Combine(hang, "1.js"), 1, tep);
                    ThemHangDoiMemory(tep);
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

                // Khởi động Local Loopback Server cho v2.0.0
                BatDauServer(thuMuc);

                string url;
                if (_port > 0)
                {
                    url = "http://127.0.0.1:" + _port + "/index.html?hang=" + Uri.EscapeDataString(new Uri(hang + "\\").AbsoluteUri) + "&so=" + soDau;
                }
                else
                {
                    url = new Uri(trang).AbsoluteUri + "?hang=" + Uri.EscapeDataString(new Uri(hang + "\\").AbsoluteUri) + "&so=" + soDau;
                }

                string hoSo = Path.Combine(Chung.ThuMucDuLieu, "trinh-duyet");
                string cờEdge = "--app=\"" + url + "\" --user-data-dir=\"" + hoSo + "\" --no-first-run --no-default-browser-check --disable-sync" +
                    (_port > 0 ? "" : " --allow-file-access-from-files") +
                    " --disable-background-mode --start-maximized --window-position=0,0 --disable-pinch --overscroll-history-navigation=0" +
                    " --lang=vi --disable-features=Translate,TranslateUI,msEdgeTranslate,msEdgeSidebarV2";

                var psi = new ProcessStartInfo(edge, cờEdge);
                psi.UseShellExecute = false;
                Process.Start(psi);

                for (int i = 0; i < 100 && TimCuaSo() == IntPtr.Zero; i++) Thread.Sleep(100);
                return 0;
            }
            finally { khoa.ReleaseMutex(); }
        }
    }

    static void ThemHangDoiMemory(List<string> tep)
    {
        lock (_khoaHang)
        {
            foreach (var t in tep)
            {
                if (!_hangDoiMo.Contains(t)) _hangDoiMo.Add(t);
            }
        }
    }

    static void BatDauServer(string thuMucGoc)
    {
        for (int p = 28765; p < 28785; p++)
        {
            try
            {
                var l = new HttpListener();
                l.Prefixes.Add("http://127.0.0.1:" + p + "/");
                l.Start();
                _server = l;
                _port = p;
                break;
            }
            catch { }
        }
        if (_server == null) return;

        ThreadPool.QueueUserWorkItem(state =>
        {
            while (_server != null && _server.IsListening)
            {
                try
                {
                    var ctx = _server.GetContext();
                    ThreadPool.QueueUserWorkItem(c => XuLyYeuCau((HttpListenerContext)c, thuMucGoc), ctx);
                }
                catch { }
            }
        });
    }

    static void XuLyYeuCau(HttpListenerContext ctx, string thuMucGoc)
    {
        try
        {
            string urlPath = ctx.Request.Url.AbsolutePath.TrimStart('/');
            if (string.IsNullOrEmpty(urlPath)) urlPath = "index.html";

            // CORS & Security headers
            ctx.Response.Headers["Access-Control-Allow-Origin"] = "*";
            ctx.Response.Headers["Access-Control-Allow-Headers"] = "Content-Type";
            ctx.Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";

            if (ctx.Request.HttpMethod == "OPTIONS")
            {
                ctx.Response.StatusCode = 204;
                ctx.Response.Close();
                return;
            }

            // API 1: Lấy danh sách file mới mở (Direct IPC polling)
            if (urlPath.Equals("api/poll", StringComparison.OrdinalIgnoreCase))
            {
                var danhSach = new List<string>();
                lock (_khoaHang)
                {
                    danhSach.AddRange(_hangDoiMo);
                    _hangDoiMo.Clear();
                }

                var sb = new StringBuilder("[");
                for (int i = 0; i < danhSach.Count; i++)
                {
                    if (i > 0) sb.Append(",");
                    string f = danhSach[i];
                    string b64 = Convert.ToBase64String(File.ReadAllBytes(f));
                    sb.Append("{\"ten\":").Append(ChuoiJs(Path.GetFileName(f)))
                      .Append(",\"duongDan\":").Append(ChuoiJs(f))
                      .Append(",\"b64\":\"").Append(b64).Append("\"}");
                }
                sb.Append("]");
                byte[] data = Encoding.UTF8.GetBytes(sb.ToString());
                ctx.Response.ContentType = "application/json; charset=utf-8";
                ctx.Response.ContentLength64 = data.Length;
                ctx.Response.OutputStream.Write(data, 0, data.Length);
                ctx.Response.Close();
                return;
            }

            // API 2: Đổi tên file trực tiếp 1-click trên ổ cứng an toàn
            if (urlPath.Equals("api/rename", StringComparison.OrdinalIgnoreCase) && ctx.Request.HttpMethod == "POST")
            {
                string json;
                using (var r = new StreamReader(ctx.Request.InputStream, Encoding.UTF8)) json = r.ReadToEnd();

                int thanhCong = 0;
                var loi = new List<string>();

                // Parse { "items": [ { "oldPath": "...", "newName": "..." } ] }
                var regex = new Regex(@"""oldPath""\s*:\s*""(?<old>[^""]+)""\s*,\s*""newName""\s*:\s*""(?<new>[^""]+)""");
                foreach (Match m in regex.Matches(json))
                {
                    try
                    {
                        string oldP = m.Groups["old"].Value.Replace(@"\\", @"\");
                        string newN = m.Groups["new"].Value;
                        if (!File.Exists(oldP)) continue;

                        // Chống Path Traversal: tên file mới không chứa dấu phân cách thư mục
                        string safeName = Path.GetFileName(newN);
                        if (string.IsNullOrEmpty(safeName) || safeName.Contains("..")) continue;

                        string dir = Path.GetDirectoryName(oldP);
                        string target = Path.Combine(dir, safeName);
                        if (!string.Equals(oldP, target, StringComparison.OrdinalIgnoreCase))
                        {
                            if (File.Exists(target)) File.Delete(target);
                            File.Move(oldP, target);
                            thanhCong++;
                        }
                    }
                    catch (Exception ex)
                    {
                        loi.Add(ex.Message);
                    }
                }

                string res = "{\"success\":true,\"renamed\":" + thanhCong + ",\"errorCount\":" + loi.Count + "}";
                byte[] bytes = Encoding.UTF8.GetBytes(res);
                ctx.Response.ContentType = "application/json; charset=utf-8";
                ctx.Response.ContentLength64 = bytes.Length;
                ctx.Response.OutputStream.Write(bytes, 0, bytes.Length);
                ctx.Response.Close();
                return;
            }

            // Phục vụ tệp tĩnh trong thư mục cài đặt
            string filePath = Path.Combine(thuMucGoc, urlPath.Replace('/', '\\'));
            if (!File.Exists(filePath))
            {
                ctx.Response.StatusCode = 404;
                ctx.Response.Close();
                return;
            }

            string ext = Path.GetExtension(filePath).ToLowerInvariant();
            string mime = "application/octet-stream";
            if (ext == ".html" || ext == ".htm") mime = "text/html; charset=utf-8";
            else if (ext == ".js") mime = "application/javascript; charset=utf-8";
            else if (ext == ".css") mime = "text/css; charset=utf-8";
            else if (ext == ".ico") mime = "image/x-icon";
            else if (ext == ".png") mime = "image/png";
            else if (ext == ".svg") mime = "image/svg+xml";

            byte[] fileBytes = File.ReadAllBytes(filePath);
            ctx.Response.ContentType = mime;
            ctx.Response.ContentLength64 = fileBytes.Length;
            ctx.Response.OutputStream.Write(fileBytes, 0, fileBytes.Length);
            ctx.Response.Close();
        }
        catch { }
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
        string tam = tepJs + ".tam";
        File.WriteAllText(tam, js.ToString(), new UTF8Encoding(false));
        if (File.Exists(tepJs)) File.Delete(tepJs);
        File.Move(tam, tepJs);
    }

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
                    if (!p.ProcessName.Equals("msedge", StringComparison.OrdinalIgnoreCase) &&
                        !p.ProcessName.Equals("msedgewebview2", StringComparison.OrdinalIgnoreCase))
                        return true;
                }
            }
            catch { return true; }

            var t = new StringBuilder(512); GetWindowText(h, t, 512);
            string title = t.ToString();
            if (string.IsNullOrEmpty(title)) return true;

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
                IntPtr hDesk = OpenInputDesktop(0, false, 0x0100);
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
        if (IsIconic(h)) ShowWindow(h, 9);
        SetForegroundWindow(h);
        SwitchToThisWindow(h, true);
    }

    static void XoaSachHang(string thuMuc)
    {
        try
        {
            foreach (string f in Directory.GetFiles(thuMuc, "*.js*"))
            {
                try { File.Delete(f); } catch { }
            }
        }
        catch { }
    }

    static void DonTepCu(string thuMuc)
    {
        try
        {
            string[] tepJs = Directory.GetFiles(thuMuc, "*.js");
            if (tepJs.Length <= 1) return;
            Array.Sort(tepJs);
            for (int i = 0; i < tepJs.Length - 1; i++)
            {
                try { File.Delete(tepJs[i]); } catch { }
            }
        }
        catch { }
    }

    static string ChuoiJs(string s)
    {
        if (s == null) return "null";
        var b = new StringBuilder("\"");
        foreach (char c in s)
        {
            if (c == '\\') b.Append(@"\\");
            else if (c == '"') b.Append("\\\"");
            else if (c == '\r') b.Append(@"\r");
            else if (c == '\n') b.Append(@"\n");
            else if (c == '\t') b.Append(@"\t");
            else if (c < ' ') b.AppendFormat(@"\u{0:x4}", (int)c);
            else b.Append(c);
        }
        return b.Append('"').ToString();
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

    static int GoCai(string thuMuc, bool imLang)
    {
        if (!imLang && MessageBox.Show("Gỡ " + Chung.TenApp + " khỏi máy?", Chung.TenApp, MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes)
            return 1;
        Chung.HuyDangKy();
        try { File.Delete(Chung.LoiTat); } catch { }
        try { File.Delete(Chung.LoiTatDesktop); } catch { }
        try { Directory.Delete(Chung.ThuMucDuLieu, true); } catch { }
        if (!string.Equals(Path.GetFullPath(thuMuc).TrimEnd('\\'), Path.GetFullPath(Chung.ThuMucCai).TrimEnd('\\'), StringComparison.OrdinalIgnoreCase))
            return 0;
        var psi = new ProcessStartInfo("cmd.exe", "/c timeout /t 2 /nobreak >nul & rmdir /s /q \"" + thuMuc.TrimEnd('\\') + "\"");
        psi.CreateNoWindow = true; psi.UseShellExecute = false;
        Process.Start(psi);
        if (!imLang) MessageBox.Show("Đã gỡ " + Chung.TenApp + ".", Chung.TenApp);
        return 0;
    }
}
