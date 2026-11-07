// XML-Pro: khung tải hoá đơn, nằm ngay trong cửa sổ chính, đè lên vùng nội dung của trang app (thanh bên vẫn dùng được).
// Mở trang cổng thuế thật trong WebView2 ở chế độ riêng tư (đóng khung là hết phiên, không còn gì trên đĩa).
// Người dùng tự đăng nhập, tự gõ captcha; app không lưu mật khẩu, không giải captcha, không đổi dấu hiệu trình duyệt.
// Đăng nhập xong khung lùi xuống sau trang XML-Pro (vẫn "đang hiện" nên Windows không làm chậm), người dùng chỉ thấy thẻ chọn tháng.
// Vỏ gắn tai-hoa-don.js vào trang, nhận tệp XML và ghi vào thư mục người dùng chọn.
// Trang là nội dung bên ngoài: mọi lệnh từ trang đều kiểm nguồn, kiểm đường dẫn và không bao giờ ghi đè.
using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

sealed class KhungCongThue : Panel
{
    const string CongThat = "https://hoadondientu.gdt.gov.vn/";
    const int TepToiDa = 30 * 1024 * 1024;
    readonly CuaSoChinh _chinh;
    readonly CoreWebView2Environment _env;
    readonly string _thuMucApp;
    readonly string _cong;
    readonly bool _cheDoThu;
    readonly WebView2 _wv = new WebView2();
    readonly JavaScriptSerializer _json = new JavaScriptSerializer { MaxJsonLength = int.MaxValue };
    string _goc;       // thư mục người dùng đã chọn cho lượt này
    bool _dangTai;
    public bool DangTai { get { return _dangTai; } }

    public KhungCongThue(CuaSoChinh chinh, CoreWebView2Environment env, string thuMucApp)
    {
        _chinh = chinh; _env = env; _thuMucApp = thuMucApp;
        // Địa chỉ thay thế chỉ dành cho kiểm thử trên cổng giả, và chỉ nhận máy này
        string thu = Environment.GetEnvironmentVariable("XMLPRO_CONG_THU");
        _cheDoThu = !string.IsNullOrEmpty(thu) && thu.StartsWith("http://127.0.0.1:", StringComparison.OrdinalIgnoreCase);
        _cong = _cheDoThu ? thu : CongThat;
        _wv.Dock = DockStyle.Fill;
        Controls.Add(_wv);
    }

    /// <summary>Chuyển lệnh của XML-Pro xuống trang cổng (bắt đầu tải, dừng)</summary>
    public void GuiXuong(Dictionary<string, object> m)
    {
        if (!IsDisposed && _wv.CoreWebView2 != null) _wv.CoreWebView2.PostWebMessageAsJson(_json.Serialize(m));
    }

    public async Task KhoiTao()
    {
        try
        {
            string loi = DocTep("tai-hoa-don-loi.js"), khung = DocTep("tai-hoa-don.js"), zip = DocTep("jszip.min.js");
            var tuyChon = _env.CreateCoreWebView2ControllerOptions();
            tuyChon.ProfileName = "cong-thue";
            tuyChon.IsInPrivateModeEnabled = true;
            await _wv.EnsureCoreWebView2Async(_env, tuyChon);
            var c = _wv.CoreWebView2;
            c.Settings.AreHostObjectsAllowed = false;
            c.Settings.IsGeneralAutofillEnabled = false;
            c.Settings.IsPasswordAutosaveEnabled = false;
            c.Settings.AreDevToolsEnabled = Environment.GetEnvironmentVariable("XMLPRO_DEVTOOLS") == "1";
            c.Settings.IsStatusBarEnabled = false;
            // Chỉ chạy ở khung chính của đúng trang cổng thuế
            string nguon = _json.Serialize(new Uri(_cong).GetLeftPart(UriPartial.Authority));
            await c.AddScriptToExecuteOnDocumentCreatedAsync("(function(){if(window!==window.top||location.origin!==" + nguon + ")return;\n" + zip + "\n;" + loi + "\n;" + khung + "\n})();");
            c.NavigationStarting += (s, e) =>
            {
                if (!ChoPhep(e.Uri)) { e.Cancel = true; MoNgoai(e.Uri); }
            };
            c.NewWindowRequested += (s, e) =>
            {
                e.Handled = true;
                if (ChoPhep(e.Uri)) c.Navigate(e.Uri); else MoNgoai(e.Uri);
            };
            c.WindowCloseRequested += (s, e) => _chinh.DongCongThue(false);
            c.WebMessageReceived += NhanLenh;
            c.Navigate(_cong);
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, "Không mở được cổng thuế:\n" + ex.Message, Chung.TenApp, MessageBoxButtons.OK, MessageBoxIcon.Error);
            _chinh.DongCongThue(true);
        }
    }

    string DocTep(string ten) { return File.ReadAllText(Path.Combine(_thuMucApp, ten), Encoding.UTF8); }

    bool ChoPhep(string uri)
    {
        if (_cheDoThu) return uri.StartsWith(_cong, StringComparison.OrdinalIgnoreCase) || uri == "about:blank";
        Uri u;
        if (!Uri.TryCreate(uri, UriKind.Absolute, out u)) return false;
        return u.Scheme == "https" && (u.Host.Equals("hoadondientu.gdt.gov.vn", StringComparison.OrdinalIgnoreCase) || u.Host.EndsWith(".gdt.gov.vn", StringComparison.OrdinalIgnoreCase));
    }

    void MoNgoai(string uri)
    {
        if (_cheDoThu || uri == null || !(uri.StartsWith("https://", StringComparison.OrdinalIgnoreCase) || uri.StartsWith("http://", StringComparison.OrdinalIgnoreCase))) return;
        try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(uri) { UseShellExecute = true }); } catch { }
    }

    void Tra(object id, Dictionary<string, object> kq)
    {
        kq["id"] = id;
        if (!IsDisposed && _wv.CoreWebView2 != null) _wv.CoreWebView2.PostWebMessageAsJson(_json.Serialize(kq));
    }

    void NhanLenh(object s, CoreWebView2WebMessageReceivedEventArgs e)
    {
        if (!e.Source.StartsWith(new Uri(_cong).GetLeftPart(UriPartial.Authority) + "/", StringComparison.OrdinalIgnoreCase)) return;
        Dictionary<string, object> m;
        try { m = _json.Deserialize<Dictionary<string, object>>(e.WebMessageAsJson); } catch { return; }
        object v, id;
        m.TryGetValue("id", out id);
        string lenh = m.TryGetValue("lenh", out v) ? Convert.ToString(v) : "";
        switch (lenh)
        {
            case "chonThuMucLuu": ChonThuMuc(id); break;
            case "luuTep":
                string loi = LuuTep(m);
                Tra(id, new Dictionary<string, object> { { "ok", loi == null }, { "loi", loi ?? "" } });
                break;
            case "trangThai":
                _dangTai = m.TryGetValue("dangTai", out v) && Convert.ToBoolean(v);
                break;
            case "napVaoApp":
                if (_goc == null || !m.TryGetValue("mst", out v) || !(v is System.Collections.IEnumerable)) break;
                var ds = ((System.Collections.IEnumerable)v).Cast<object>().Select(Convert.ToString)
                    .Where(x => Regex.IsMatch(x, "^[0-9A-Za-z-]{1,40}$")).Select(x => Path.Combine(_goc, x)).Where(Directory.Exists).ToList();
                if (ds.Count > 0) _chinh.NapTuCongThue(ds);
                break;
            case "dangNhap":
                _chinh.GuiTrang(new Dictionary<string, object> { { "loai", "congDangNhap" }, { "co", m.TryGetValue("co", out v) && Convert.ToBoolean(v) } });
                break;
            case "tien":
                // Chỉ chuyển đúng các mục này, trang XML-Pro không nhận gì khác từ trang cổng
                var t = new Dictionary<string, object> { { "loai", "congTien" } };
                foreach (string k in new[] { "tt", "ghi", "dang", "moi", "coTep", "captcha", "moTa", "danhSach", "kyTu", "kyDen", "coMtt", "du" }) if (m.TryGetValue(k, out v)) t[k] = v;
                _chinh.GuiTrang(t);
                break;
        }
    }

    void ChonThuMuc(object id)
    {
        string thu = Environment.GetEnvironmentVariable("XMLPRO_THU_MUC_LUU"); // chỉ dùng khi kiểm thử tự động
        string tm = !string.IsNullOrEmpty(thu) ? thu : HopChonThuMuc.Hien(this, "Chọn thư mục lưu hoá đơn");
        if (tm == null) { Tra(id, new Dictionary<string, object> { { "duongDan", "" } }); return; }
        _goc = Path.GetFullPath(tm).TrimEnd('\\');
        string goc = _goc;
        Task.Run(() =>
        {
            var co = new List<string>();
            try
            {
                foreach (string f in Directory.EnumerateFiles(goc, "*.xml", SearchOption.AllDirectories))
                {
                    co.Add(f.Substring(goc.Length + 1).Replace('\\', '/').ToLowerInvariant());
                    if (co.Count >= 300000) break;
                }
            }
            catch { } // thư mục con không đọc được thì coi như chưa có, tải lại cũng không ghi đè
            return co;
        }).ContinueWith(t => Tra(id, new Dictionary<string, object> { { "duongDan", goc }, { "coSan", t.Result } }), TaskScheduler.FromCurrentSynchronizationContext());
    }

    /// <summary>Ghi một tệp vào thư mục đã chọn. Trả về lỗi, hoặc null nếu xong.</summary>
    string LuuTep(Dictionary<string, object> m)
    {
        if (_goc == null) return "Chưa chọn thư mục";
        object v;
        string rel = m.TryGetValue("duong", out v) ? Convert.ToString(v) : "";
        string b64 = m.TryGetValue("b64", out v) ? Convert.ToString(v) : "";
        string duoi = Path.GetExtension(rel).ToLowerInvariant();
        if (rel.Length == 0 || rel.Length > 400 || (duoi != ".xml" && duoi != ".xlsx" && duoi != ".txt")) return "Tên tệp không hợp lệ";
        if (rel.StartsWith("/") || rel.StartsWith("\\") || rel.Contains(":") || rel.Contains("..")) return "Đường dẫn không hợp lệ";
        if (b64.Length > TepToiDa / 3 * 4 + 8) return "Tệp quá lớn";
        try
        {
            string dich = Path.GetFullPath(Path.Combine(_goc, rel.Replace('/', '\\')));
            if (!dich.StartsWith(_goc + "\\", StringComparison.OrdinalIgnoreCase)) return "Đường dẫn ra ngoài thư mục đã chọn";
            if (File.Exists(dich)) return null; // không ghi đè tệp đã có
            byte[] du = Convert.FromBase64String(b64);
            Directory.CreateDirectory(Path.GetDirectoryName(dich));
            File.WriteAllBytes(dich, du);
            return null;
        }
        catch (Exception ex) { return ex.Message; }
    }
}
