// XML-Pro 3 — vỏ phần mềm Windows nhúng WebView2 (nhân Edge có sẵn trong Windows 10/11).
// - Trang chạy ở địa chỉ nội bộ https://xml-pro.example (ánh xạ thẳng vào thư mục cài, không ra mạng),
//   nên không còn chữ "file:///" và không còn popup hỏi quyền khi chọn thư mục.
// - Chọn tệp / thư mục bằng hộp thoại của Windows; trang CHỈ đọc được những tệp người dùng đã chọn,
//   bấm đúp hoặc "Mở bằng" (mỗi tệp một mã ngẫu nhiên, phục vụ qua https://tep.xml-pro.example/<mã>).
// - Một cửa sổ duy nhất: chạy thêm lần nữa (bấm đúp tệp khác, chuột phải thư mục) thì chuyển đường dẫn
//   sang cửa sổ đang mở qua đường ống nội bộ (named pipe) của tài khoản này, mở thành tab mới.
// - Máy chưa có WebView2 Runtime: quay về cách mở bằng cửa sổ Edge như bản 2.0.4 (KhoiDongEdge.Chay).
// - Kiểm tra bản mới: CHỈ vỏ này hỏi đúng một địa chỉ — danh sách bản phát hành của kho GitHub tuongotpho/xml-pro-ban-phat-hanh (chỉ chứa bộ cài) —
//   không gửi kèm dữ liệu nào của người dùng. Trang bên trong vẫn bị chặn ra mạng (CSP).
// Viết theo C# 5 để biên dịch bằng csc.exe có sẵn trong Windows.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Pipes;
using System.Linq;
using System.Net;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

static class ChuongTrinh
{
    public const string MayTrang = "xml-pro.example";      // địa chỉ nội bộ của trang
    public const string MayTep = "tep.xml-pro.example";    // địa chỉ nội bộ phục vụ tệp người dùng đã chọn
    static readonly string TenOng = "XMLPro-v3-" + Environment.UserName.Replace('\\', '_');

    [STAThread]
    static int Main(string[] args)
    {
        string thuMuc = AppDomain.CurrentDomain.BaseDirectory;
        if (args.Length > 0 && args[0].Equals("/uninstall", StringComparison.OrdinalIgnoreCase))
            return KhoiDongEdge.GoCai(thuMuc, args.Length > 1 && args[1].Equals("/quiet", StringComparison.OrdinalIgnoreCase));
        if (!File.Exists(Path.Combine(thuMuc, "index.html")))
        {
            MessageBox.Show("Không thấy tệp index.html cạnh chương trình. Hãy cài lại.", Chung.TenApp, MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
        bool coWebView2 = false;
        try { coWebView2 = KiemWebView2(); } catch { coWebView2 = false; }
        if (!coWebView2) return KhoiDongEdge.Chay(args);

        var duongDan = new List<string>();
        foreach (string a in args)
        {
            if (string.IsNullOrWhiteSpace(a)) continue;
            try { if (File.Exists(a) || Directory.Exists(a)) duongDan.Add(Path.GetFullPath(a)); } catch { }
        }

        bool moi;
        using (var khoa = new Mutex(true, @"Local\XMLPro-v3-cua-so", out moi))
        {
            if (!moi)
            {
                // Đã có cửa sổ: gửi đường dẫn sang rồi thoát
                if (GuiSangBanDangChay(duongDan)) return 0;
                MessageBox.Show("XML-Pro đang mở nhưng không nhận được tệp. Hãy đóng XML-Pro rồi mở lại.", Chung.TenApp, MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return 1;
            }
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            var cuaSo = new CuaSoChinh(thuMuc, duongDan);
            BatDauNhanTuBanKhac(cuaSo);
            Application.Run(cuaSo);
        }
        return 0;
    }

    // Tách riêng để nếu thiếu thư viện WebView2 thì lỗi nằm trong khối try ở Main
    [MethodImpl(MethodImplOptions.NoInlining)]
    static bool KiemWebView2()
    {
        string v = CoreWebView2Environment.GetAvailableBrowserVersionString();
        return !string.IsNullOrEmpty(v);
    }

    static bool GuiSangBanDangChay(List<string> duongDan)
    {
        for (int lan = 0; lan < 3; lan++)
        {
            try
            {
                using (var ong = new NamedPipeClientStream(".", TenOng, PipeDirection.Out))
                {
                    ong.Connect(4000);
                    byte[] b = Encoding.UTF8.GetBytes(string.Join("\n", duongDan) + "\n<HET>");
                    ong.Write(b, 0, b.Length);
                    ong.Flush();
                    return true;
                }
            }
            catch { Thread.Sleep(500); }
        }
        return false;
    }

    static void BatDauNhanTuBanKhac(CuaSoChinh cuaSo)
    {
        var luong = new Thread(() =>
        {
            while (true)
            {
                try
                {
                    using (var ong = new NamedPipeServerStream(TenOng, PipeDirection.In, 1, PipeTransmissionMode.Byte))
                    {
                        ong.WaitForConnection();
                        var ms = new MemoryStream();
                        ong.CopyTo(ms);
                        string s = Encoding.UTF8.GetString(ms.ToArray());
                        var ds = s.Split('\n').Select(x => x.Trim()).Where(x => x.Length > 0 && x != "<HET>").ToList();
                        if (!cuaSo.IsDisposed) cuaSo.BeginInvoke((Action)(() => cuaSo.NhanTuBanKhac(ds)));
                    }
                }
                catch { Thread.Sleep(300); }
            }
        });
        luong.IsBackground = true;
        luong.Start();
    }
}

sealed class CuaSoChinh : Form
{
    readonly string _thuMuc;
    readonly WebView2 _wv = new WebView2();
    readonly JavaScriptSerializer _json = new JavaScriptSerializer { MaxJsonLength = int.MaxValue };
    readonly Dictionary<string, string> _tepChoPhep = new Dictionary<string, string>(); // mã -> đường dẫn
    readonly List<object> _choGui = new List<object>();
    List<string> _moLucDau;
    bool _sanSang;
    CoreWebView2Environment _env;

    public CuaSoChinh(string thuMuc, List<string> moLucDau)
    {
        _thuMuc = thuMuc;
        _moLucDau = moLucDau;
        Text = Chung.TenApp;
        try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
        StartPosition = FormStartPosition.CenterScreen;
        Size = new Size(1280, 820);
        MinimumSize = new Size(900, 600);
        WindowState = FormWindowState.Maximized;
        BackColor = Color.FromArgb(238, 241, 244);
        _wv.Dock = DockStyle.Fill;
        _wv.DefaultBackgroundColor = Color.FromArgb(238, 241, 244);
        Controls.Add(_wv);
        Load += async (s, e) => await KhoiTao();
    }

    async Task KhoiTao()
    {
        try
        {
            var tuyChon = new CoreWebView2EnvironmentOptions();
            tuyChon.Language = "vi";
            tuyChon.AdditionalBrowserArguments = "--disable-features=Translate,msEdgeTranslate";
            _env = await CoreWebView2Environment.CreateAsync(null, Path.Combine(Chung.ThuMucDuLieu, "webview2"), tuyChon);
            await _wv.EnsureCoreWebView2Async(_env);
            var c = _wv.CoreWebView2;
            c.Settings.AreDevToolsEnabled = Environment.GetEnvironmentVariable("XMLPRO_DEVTOOLS") == "1";
            c.Settings.IsStatusBarEnabled = false;
            c.Settings.AreHostObjectsAllowed = false;
            c.Settings.IsGeneralAutofillEnabled = false;
            c.Settings.IsPasswordAutosaveEnabled = false;
            if (Chung.LaBanStore) await c.AddScriptToExecuteOnDocumentCreatedAsync("window.__xmlproStore=true;");
            c.SetVirtualHostNameToFolderMapping(ChuongTrinh.MayTrang, _thuMuc, CoreWebView2HostResourceAccessKind.Deny);
            c.AddWebResourceRequestedFilter("https://" + ChuongTrinh.MayTep + "/*", CoreWebView2WebResourceContext.All);
            c.WebResourceRequested += PhucVuTep;
            c.WebMessageReceived += NhanLenh;
            c.NavigationStarting += (s, e) =>
            {
                // Trang chỉ được ở trong địa chỉ nội bộ; liên kết ra ngoài (tra cứu HĐ trên cổng thuế…) mở bằng trình duyệt mặc định
                if (!e.Uri.StartsWith("https://" + ChuongTrinh.MayTrang + "/", StringComparison.OrdinalIgnoreCase))
                {
                    e.Cancel = true;
                    MoNgoai(e.Uri);
                }
            };
            c.NewWindowRequested += (s, e) => { e.Handled = true; MoNgoai(e.Uri); };
            c.DocumentTitleChanged += (s, e) => { Text = string.IsNullOrWhiteSpace(c.DocumentTitle) ? Chung.TenApp : c.DocumentTitle; };
            c.DownloadStarting += LuuTep;
            c.Navigate("https://" + ChuongTrinh.MayTrang + "/index.html");
        }
        catch (Exception ex)
        {
            MessageBox.Show("Không khởi động được cửa sổ XML-Pro (WebView2):\n" + ex.Message + "\n\nChương trình sẽ mở bằng cửa sổ Edge như bản cũ.", Chung.TenApp, MessageBoxButtons.OK, MessageBoxIcon.Warning);
            var a = _moLucDau.ToArray();
            BeginInvoke((Action)(() => { Close(); KhoiDongEdge.Chay(a); }));
        }
    }

    static void MoNgoai(string uri)
    {
        if (uri != null && (uri.StartsWith("https://", StringComparison.OrdinalIgnoreCase) || uri.StartsWith("http://", StringComparison.OrdinalIgnoreCase)))
        {
            try { Process.Start(new ProcessStartInfo(uri) { UseShellExecute = true }); } catch { }
        }
    }

    // ---------- Phục vụ nội dung tệp đã được người dùng chọn ----------
    void PhucVuTep(object s, CoreWebView2WebResourceRequestedEventArgs e)
    {
        string ma = e.Request.Uri.Substring(e.Request.Uri.LastIndexOf('/') + 1);
        string p = null;
        lock (_tepChoPhep) { _tepChoPhep.TryGetValue(ma, out p); }
        const string cors = "Access-Control-Allow-Origin: https://" + ChuongTrinh.MayTrang;
        if (p == null || !File.Exists(p))
        {
            e.Response = _env.CreateWebResourceResponse(null, 404, "Not Found", cors);
            return;
        }
        try
        {
            var ms = new MemoryStream(File.ReadAllBytes(p));
            e.Response = _env.CreateWebResourceResponse(ms, 200, "OK", "Content-Type: application/octet-stream\r\n" + cors);
        }
        catch (Exception ex)
        {
            e.Response = _env.CreateWebResourceResponse(null, 500, "Loi doc tep: " + ex.GetType().Name, cors);
        }
    }

    // ---------- Lệnh từ trang ----------
    void NhanLenh(object s, CoreWebView2WebMessageReceivedEventArgs e)
    {
        Dictionary<string, object> m;
        try { m = _json.Deserialize<Dictionary<string, object>>(e.WebMessageAsJson); } catch { return; }
        object lenh;
        if (m == null || !m.TryGetValue("lenh", out lenh)) return;
        switch (Convert.ToString(lenh))
        {
            case "sanSang":
                _sanSang = true;
                if (_moLucDau.Count > 0) { var dau = _moLucDau; _moLucDau = new List<string>(); GuiDuongDan(dau, "mo"); }
                foreach (var x in _choGui) _wv.CoreWebView2.PostWebMessageAsJson(_json.Serialize(x));
                _choGui.Clear();
                break;
            case "chonTep":
                using (var hop = new OpenFileDialog())
                {
                    hop.Title = "Chọn tệp hồ sơ XML / ZIP";
                    hop.Filter = "Hồ sơ XML, ZIP (*.xml;*.zip)|*.xml;*.zip|Tất cả tệp (*.*)|*.*";
                    hop.Multiselect = true;
                    if (hop.ShowDialog(this) == DialogResult.OK) GuiDuongDan(hop.FileNames.ToList(), "chon");
                }
                break;
            case "chonThuMuc":
                string tm = HopChonThuMuc.Hien(this, "Chọn thư mục hoá đơn / tờ khai");
                if (tm != null) GuiDuongDan(new List<string> { tm }, "chon");
                break;
            case "kiemCapNhat":
                // tuDong = true: lúc mở app, tối đa 1 lần / 20 giờ, lỗi mạng thì im lặng; false: người dùng bấm nút
                object td;
                bool tuDong = m.TryGetValue("tuDong", out td) && Convert.ToBoolean(td);
                KiemCapNhat(tuDong);
                break;
            case "taiBanMoi":
                object u;
                string url = m.TryGetValue("url", out u) ? Convert.ToString(u) : "";
                // Chỉ mở trang / tệp phát hành của đúng kho này
                if (url.StartsWith(CapNhat.TienToTai, StringComparison.OrdinalIgnoreCase)) MoNgoai(url);
                break;
            case "moLai":
                object v;
                string p = m.TryGetValue("duongDan", out v) ? Convert.ToString(v) : "";
                string duoi = Path.GetExtension(p ?? "").ToLowerInvariant();
                if (!string.IsNullOrEmpty(p) && File.Exists(p) && (duoi == ".xml" || duoi == ".zip")) GuiDuongDan(new List<string> { p }, "mo");
                else Gui(new Dictionary<string, object> { { "loai", "loiMo" }, { "duongDan", p } });
                break;
        }
    }

    void KiemCapNhat(bool tuDong)
    {
        if (Chung.LaBanStore) return; // bản Store do Microsoft Store cập nhật
        string tepLanCuoi = Path.Combine(Chung.ThuMucDuLieu, "lan-kiem-cap-nhat.txt");
        if (tuDong)
        {
            try
            {
                DateTime lan;
                if (File.Exists(tepLanCuoi) && DateTime.TryParse(File.ReadAllText(tepLanCuoi), null, System.Globalization.DateTimeStyles.RoundtripKind, out lan)
                    && (DateTime.UtcNow - lan).TotalHours < 20) return;
            }
            catch { }
        }
        Task.Run(() => CapNhat.Hoi()).ContinueWith(t =>
        {
            var kq = t.Result;
            if (kq.ContainsKey("loi"))
            {
                if (!tuDong) Gui(kq);
                return;
            }
            try { Directory.CreateDirectory(Chung.ThuMucDuLieu); File.WriteAllText(tepLanCuoi, DateTime.UtcNow.ToString("o")); } catch { }
            if (!tuDong || Convert.ToBoolean(kq["coBanMoi"])) Gui(kq);
        }, TaskScheduler.FromCurrentSynchronizationContext());
    }

    public void NhanTuBanKhac(List<string> ds)
    {
        if (WindowState == FormWindowState.Minimized) WindowState = FormWindowState.Maximized;
        Activate();
        TopMost = true; TopMost = false;
        if (ds.Count > 0) GuiDuongDan(ds, "mo");
    }

    void Gui(object x)
    {
        if (_sanSang && _wv.CoreWebView2 != null) _wv.CoreWebView2.PostWebMessageAsJson(_json.Serialize(x));
        else _choGui.Add(x);
    }

    // Duyệt tệp / thư mục (thư mục thì lấy mọi .xml, .zip bên trong, kể cả thư mục con) rồi gửi danh sách cho trang
    void GuiDuongDan(List<string> ds, string nguon)
    {
        Task.Run(() =>
        {
            var ra = new List<Dictionary<string, object>>();
            foreach (string p in ds)
            {
                if (File.Exists(p)) ra.Add(MucTep(p, p));
                else if (Directory.Exists(p))
                {
                    string goc = Path.GetFullPath(p).TrimEnd('\\');
                    string ten = Path.GetFileName(goc);
                    if (string.IsNullOrEmpty(ten)) ten = goc.TrimEnd(':');
                    foreach (string f in DuyetThuMuc(goc))
                    {
                        string rel = ten + "/" + f.Substring(goc.Length + 1).Replace('\\', '/');
                        ra.Add(MucTep(f, rel));
                        if (ra.Count >= 20000) break;
                    }
                }
            }
            return ra;
        }).ContinueWith(t =>
        {
            if (t.Exception != null || t.Result.Count == 0)
            {
                if (nguon == "chon") Gui(new Dictionary<string, object> { { "loai", "thongBao" }, { "noiDung", "Không thấy tệp .xml hoặc .zip nào trong lựa chọn." } });
                return;
            }
            Gui(new Dictionary<string, object> { { "loai", "tep" }, { "nguon", nguon }, { "ds", t.Result } });
        }, TaskScheduler.FromCurrentSynchronizationContext());
    }

    static IEnumerable<string> DuyetThuMuc(string goc)
    {
        var cho = new Stack<string>();
        cho.Push(goc);
        while (cho.Count > 0)
        {
            string d = cho.Pop();
            string[] tep = new string[0], con = new string[0];
            try { tep = Directory.GetFiles(d); } catch { }
            try { con = Directory.GetDirectories(d); } catch { }
            Array.Sort(tep, StringComparer.OrdinalIgnoreCase);
            foreach (string f in tep)
            {
                string duoi = Path.GetExtension(f).ToLowerInvariant();
                if (duoi == ".xml" || duoi == ".zip") yield return f;
            }
            Array.Sort(con, StringComparer.OrdinalIgnoreCase);
            for (int i = con.Length - 1; i >= 0; i--) cho.Push(con[i]);
        }
    }

    Dictionary<string, object> MucTep(string duongDan, string relPath)
    {
        string ma = Guid.NewGuid().ToString("N");
        lock (_tepChoPhep) { _tepChoPhep[ma] = duongDan; }
        return new Dictionary<string, object> {
            { "ten", Path.GetFileName(duongDan) }, { "duongDan", duongDan }, { "relPath", relPath },
            { "url", "https://" + ChuongTrinh.MayTep + "/" + ma }
        };
    }

    // ---------- Lưu tệp (Excel, XML tờ khai, script .ps1, ZIP đổi tên): hộp "Lưu thành" của Windows ----------
    void LuuTep(object s, CoreWebView2DownloadStartingEventArgs e)
    {
        var hoan = e.GetDeferral();
        BeginInvoke((Action)(() =>
        {
            try
            {
                string thuMucThu = Environment.GetEnvironmentVariable("XMLPRO_THU_MUC_LUU"); // chỉ dùng khi kiểm thử tự động
                string ten = Path.GetFileName(e.ResultFilePath);
                if (!string.IsNullOrEmpty(thuMucThu))
                {
                    e.ResultFilePath = Path.Combine(thuMucThu, ten);
                    e.Handled = true;
                    return;
                }
                using (var hop = new SaveFileDialog())
                {
                    hop.Title = "Lưu tệp";
                    hop.FileName = ten;
                    string duoi = Path.GetExtension(ten);
                    hop.Filter = (string.IsNullOrEmpty(duoi) ? "Tệp" : duoi.TrimStart('.').ToUpperInvariant()) + " (*" + duoi + ")|*" + duoi + "|Tất cả tệp (*.*)|*.*";
                    hop.OverwritePrompt = true;
                    if (hop.ShowDialog(this) == DialogResult.OK) { e.ResultFilePath = hop.FileName; e.Handled = true; }
                    else e.Cancel = true;
                }
            }
            finally { hoan.Complete(); }
        }));
    }
}

// ---------- Hỏi GitHub Releases xem có bản mới không ----------
static class CapNhat
{
    public const string Kho = "tuongotpho/xml-pro-ban-phat-hanh"; // kho chỉ chứa bộ cài, không có mã nguồn
    public const string TienToTai = "https://github.com/" + Kho + "/releases/";
    const string DiaChi = "https://api.github.com/repos/" + Kho + "/releases/latest";

    public static Dictionary<string, object> Hoi()
    {
        var kq = new Dictionary<string, object> { { "loai", "capNhat" }, { "banDangDung", PhienBanApp.So } };
        try
        {
            ServicePointManager.SecurityProtocol |= (SecurityProtocolType)3072; // TLS 1.2
            var yc = (HttpWebRequest)WebRequest.Create(DiaChi);
            yc.UserAgent = "XML-Pro/" + PhienBanApp.So;
            yc.Accept = "application/vnd.github+json";
            yc.Timeout = 10000;
            yc.ReadWriteTimeout = 10000;
            string chu;
            using (var tl = (HttpWebResponse)yc.GetResponse())
            using (var doc = new StreamReader(tl.GetResponseStream(), Encoding.UTF8)) chu = doc.ReadToEnd();
            var j = new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(chu);
            string the = Convert.ToString(j["tag_name"]).TrimStart('v', 'V');
            Version moi, cu;
            if (!Version.TryParse(the, out moi) || !Version.TryParse(PhienBanApp.So, out cu)) { kq["loi"] = "Số phiên bản trên GitHub không đọc được: " + the; return kq; }
            kq["coBanMoi"] = moi > cu;
            kq["banMoi"] = the;
            string trang = Convert.ToString(j["html_url"]);
            kq["trang"] = trang.StartsWith(TienToTai, StringComparison.OrdinalIgnoreCase) ? trang : TienToTai + "latest";
            string ghi = j.ContainsKey("body") ? Convert.ToString(j["body"]) : "";
            kq["ghiChu"] = ghi.Length > 2000 ? ghi.Substring(0, 2000) + "…" : ghi;
            object tsObj;
            var ts = j.TryGetValue("assets", out tsObj) ? tsObj as System.Collections.ArrayList : null;
            if (ts != null)
                foreach (Dictionary<string, object> a in ts)
                {
                    string u = Convert.ToString(a["browser_download_url"]);
                    if (u.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) && u.StartsWith(TienToTai, StringComparison.OrdinalIgnoreCase)) { kq["tai"] = u; break; }
                }
        }
        catch (WebException ex)
        {
            var tl = ex.Response as HttpWebResponse;
            kq["loi"] = tl != null && tl.StatusCode == HttpStatusCode.NotFound ? "Chưa có bản phát hành nào trên GitHub."
                : "Không kết nối được GitHub (" + ex.Status + "). Kiểm tra mạng rồi thử lại.";
        }
        catch (Exception ex) { kq["loi"] = "Lỗi khi kiểm tra bản mới: " + ex.Message; }
        return kq;
    }
}

// ---------- Hộp chọn thư mục kiểu Windows mới (IFileOpenDialog, FOS_PICKFOLDERS) ----------
static class HopChonThuMuc
{
    [ComImport, Guid("DC1C5A9C-E88A-4dde-A5A1-60F82A20AEF7")]
    class FileOpenDialogCom { }

    [ComImport, Guid("42f85136-db7e-439c-85f1-e4075d135fc8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IFileDialog
    {
        [PreserveSig] int Show(IntPtr parent);
        void SetFileTypes(uint c, IntPtr specs);
        void SetFileTypeIndex(uint i);
        void GetFileTypeIndex(out uint i);
        void Advise(IntPtr sink, out uint cookie);
        void Unadvise(uint cookie);
        void SetOptions(uint fos);
        void GetOptions(out uint fos);
        void SetDefaultFolder(IShellItem si);
        void SetFolder(IShellItem si);
        void GetFolder(out IShellItem si);
        void GetCurrentSelection(out IShellItem si);
        void SetFileName([MarshalAs(UnmanagedType.LPWStr)] string name);
        void GetFileName([MarshalAs(UnmanagedType.LPWStr)] out string name);
        void SetTitle([MarshalAs(UnmanagedType.LPWStr)] string title);
        void SetOkButtonLabel([MarshalAs(UnmanagedType.LPWStr)] string text);
        void SetFileNameLabel([MarshalAs(UnmanagedType.LPWStr)] string label);
        void GetResult(out IShellItem si);
        void AddPlace(IShellItem si, int fdap);
        void SetDefaultExtension([MarshalAs(UnmanagedType.LPWStr)] string ext);
        void Close(int hr);
        void SetClientGuid(ref Guid guid);
        void ClearClientData();
        void SetFilter(IntPtr filter);
    }

    [ComImport, Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IShellItem
    {
        void BindToHandler(IntPtr pbc, ref Guid bhid, ref Guid riid, out IntPtr ppv);
        void GetParent(out IShellItem si);
        void GetDisplayName(uint sigdn, [MarshalAs(UnmanagedType.LPWStr)] out string name);
        void GetAttributes(uint mask, out uint attrs);
        void Compare(IShellItem si, uint hint, out int order);
    }

    const uint FOS_PICKFOLDERS = 0x20, FOS_FORCEFILESYSTEM = 0x40, FOS_PATHMUSTEXIST = 0x800;
    const uint SIGDN_FILESYSPATH = 0x80058000;
    static Guid NhoViTri = new Guid("6f1b2a3c-58e4-4d0b-9c1a-7a3e2b5d8c41"); // Windows nhớ thư mục chọn lần trước

    public static string Hien(IWin32Window chu, string tieuDe)
    {
        var hop = (IFileDialog)new FileOpenDialogCom();
        try
        {
            uint tc; hop.GetOptions(out tc);
            hop.SetOptions(tc | FOS_PICKFOLDERS | FOS_FORCEFILESYSTEM | FOS_PATHMUSTEXIST);
            hop.SetTitle(tieuDe);
            hop.SetOkButtonLabel("Chọn thư mục này");
            hop.SetClientGuid(ref NhoViTri);
            if (hop.Show(chu == null ? IntPtr.Zero : chu.Handle) != 0) return null; // bấm Huỷ
            IShellItem kq; hop.GetResult(out kq);
            string p; kq.GetDisplayName(SIGDN_FILESYSPATH, out p);
            Marshal.ReleaseComObject(kq);
            return p;
        }
        catch { return null; }
        finally { Marshal.ReleaseComObject(hop); }
    }
}
