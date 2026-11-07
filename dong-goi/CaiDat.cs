// CaiDat-XML-Pro.exe — bộ cài 3 bước như các app desktop thường gặp:
//   1. Chào mừng + tuỳ chọn (thư mục cài, lối tắt, mục chuột phải / "Mở bằng")
//   2. Đang cài (thanh tiến trình; XML-Pro đang mở thì hỏi trước khi đóng)
//   3. Hoàn tất (tick "Mở XML-Pro ngay")
// Các tệp của chương trình nhúng sẵn bên trong bộ cài. Cài riêng cho tài khoản đang dùng, không cần quyền quản trị.
// Thư mục đã chọn được ghi nhớ để lần cập nhật sau cài đè đúng chỗ cũ.
// Tham số /quiet: cài không hỏi, mọi tuỳ chọn mặc định (dùng khi kiểm thử).
// Tham số /thu: chạy đủ 3 bước nhưng KHÔNG chép tệp, không ghi registry (xem thử giao diện).
// Tham số /chup <thư mục>: tự chụp 3 màn hình ra buoc-1.png… rồi thoát (kiểm thử giao diện, không cài gì).
// Viết theo C# 5 để biên dịch bằng csc.exe có sẵn trong Windows.
using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

static class CaiDat
{
    public static readonly string[] Tep = { "XML-Pro.exe", "Microsoft.Web.WebView2.Core.dll", "Microsoft.Web.WebView2.WinForms.dll", "WebView2Loader.dll", "index.html", "dashboard-dong.js", "so-tay.js", "kho-hoa-don.js", "tai-hoa-don.js", "tai-hoa-don-loi.js", "phien-ban.js", "jszip.min.js", "xuat-excel.js", "nganh-doc.js", "doi-chieu.js", "lap-to-khai.js", "kiem-toan-misa.js", "dashboard-ke-toan.js", "mau-itax.js", "ten-chi-tieu.js", "HUONG-DAN.md" };

    [STAThread]
    static int Main(string[] args)
    {
        bool imLang = args.Length > 0 && args[0].Equals("/quiet", StringComparison.OrdinalIgnoreCase);
        if (imLang)
        {
            try { CaiVao(Chung.ThuMucCaiDaChon, true, true, null); return 0; }
            catch (Exception e) { GhiLoi(e); return 2; }
        }
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        CuaSoCaiDat.CheDoThu = args.Length > 0 && args[0].Equals("/thu", StringComparison.OrdinalIgnoreCase);
        if (args.Length > 1 && args[0].Equals("/chup", StringComparison.OrdinalIgnoreCase)) { CuaSoCaiDat.ChupManHinh(args[1]); return 0; }
        var f = new CuaSoCaiDat();
        Application.Run(f);
        return f.KetQua;
    }

    /// <summary>Chép tệp, đăng ký với Windows, tạo lối tắt. baoTienTrinh(tệp thứ mấy, tên tệp) để cập nhật thanh tiến trình.</summary>
    public static void CaiVao(string dich, bool loiTatManHinh, bool chuotPhai, Action<int, string> baoTienTrinh)
    {
        Directory.CreateDirectory(dich);
        var asm = Assembly.GetExecutingAssembly();
        for (int i = 0; i < Tep.Length; i++)
        {
            string t = Tep[i];
            if (baoTienTrinh != null) baoTienTrinh(i, t);
            using (Stream s = asm.GetManifestResourceStream(t))
            {
                if (s == null) throw new Exception("Bộ cài thiếu tệp " + t);
                using (var f = File.Create(Path.Combine(dich, t))) s.CopyTo(f);
            }
        }
        string exe = Path.Combine(dich, Chung.TenExe);
        Chung.DangKy(exe, chuotPhai);
        // Dọn lối tắt cũ tiếng Việt nếu có
        try { File.Delete(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Desktop), "Xem XML thuế.lnk")); } catch { }
        try { File.Delete(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), "Xem XML thuế.lnk")); } catch { }
        Chung.TaoLoiTat(Chung.LoiTat, exe);
        if (loiTatManHinh) Chung.TaoLoiTat(Chung.LoiTatDesktop, exe);
        else try { File.Delete(Chung.LoiTatDesktop); } catch { }
        if (baoTienTrinh != null) baoTienTrinh(Tep.Length, "");
    }

    public static void GhiLoi(Exception e)
    {
        try { File.WriteAllText(Path.Combine(Path.GetTempPath(), "XemXmlThue-caidat-loi.txt"), e.ToString()); } catch { }
    }
}

sealed class CuaSoCaiDat : Form
{
    static readonly Color Do = Color.FromArgb(200, 16, 46);
    static readonly Color ChuPhu = Color.FromArgb(75, 85, 99);
    public int KetQua = 1;
    public static bool CheDoThu;

    readonly Panel _ben = new Panel(), _than = new Panel(), _chan = new Panel();
    readonly Button _nutPhai = new Button(), _nutGiua = new Button();
    int _soBuoc = 1;
    string _thuMuc;

    // Bước 1
    readonly TextBox _oThuMuc = new TextBox();
    readonly CheckBox _cMan = new CheckBox(), _cChuot = new CheckBox();
    // Bước 2
    readonly ProgressBar _thanh = new ProgressBar();
    readonly Label _dangChep = new Label();
    // Bước 3
    readonly CheckBox _cMo = new CheckBox(), _cMacDinh = new CheckBox();

    public CuaSoCaiDat()
    {
        _thuMuc = Chung.ThuMucCaiDaChon;
        Text = "Cài đặt " + Chung.TenApp + " " + Chung.PhienBan;
        try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
        Font = new Font("Segoe UI", 9.5f);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        ClientSize = new Size(640, 420);
        BackColor = Color.White;
        AutoScaleMode = AutoScaleMode.Dpi;

        // Dải đỏ bên trái: biểu tượng + bước hiện tại
        _ben.Dock = DockStyle.Left; _ben.Width = 170; _ben.BackColor = Do;
        _ben.Paint += VeDaiBen;


        // Chân: nút bấm + bản quyền
        _chan.Dock = DockStyle.Bottom; _chan.Height = 52; _chan.BackColor = Color.FromArgb(249, 250, 251);
        _chan.Paint += (s, e) => e.Graphics.DrawLine(new Pen(Color.FromArgb(229, 231, 235)), 0, 0, _chan.Width, 0);
        var banQuyen = new Label { Text = "(C) August87 - 0982722036", ForeColor = Color.FromArgb(156, 163, 175), AutoSize = true, Location = new Point(14, 18), BackColor = Color.Transparent };
        var hang = new FlowLayoutPanel { Dock = DockStyle.Right, FlowDirection = FlowDirection.RightToLeft, AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, Padding = new Padding(0, 10, 10, 0), BackColor = Color.Transparent, WrapContents = false };
        _nutPhai.Size = new Size(104, 30); _nutGiua.Size = new Size(96, 30); _nutPhai.Margin = new Padding(6, 0, 0, 0); _nutGiua.Margin = new Padding(6, 0, 0, 0);
        hang.Controls.Add(_nutPhai); hang.Controls.Add(_nutGiua);
        _nutPhai.FlatStyle = FlatStyle.Flat; _nutPhai.BackColor = Do; _nutPhai.ForeColor = Color.White; _nutPhai.FlatAppearance.BorderColor = Do;
        _nutGiua.FlatStyle = FlatStyle.System;
        _chan.Controls.AddRange(new Control[] { hang, banQuyen });

        _than.Dock = DockStyle.Fill; _than.Padding = new Padding(24, 22, 24, 10);
        Controls.Add(_than); Controls.Add(_chan); Controls.Add(_ben);

        _nutPhai.Click += (s, e) => BamNutPhai();
        _nutGiua.Click += (s, e) => { if (_soBuoc == 1) Close(); };
        VeBuoc1();
    }

    // ---------- Vẽ dải bên: ô trắng chữ XML / PRO (giống biểu tượng app, đảo màu) ----------
    void VeDaiBen(object s, PaintEventArgs e)
    {
        var g = e.Graphics; g.SmoothingMode = SmoothingMode.AntiAlias; g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.AntiAliasGridFit;
        var o = new Rectangle(45, 70, 80, 80);
        using (var p = BoGoc(o, 18)) g.FillPath(Brushes.White, p);
        using (var f1 = new Font("Arial", 21f, FontStyle.Bold, GraphicsUnit.Pixel))
        using (var b = new SolidBrush(Do))
        using (var sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
        {
            g.DrawString("XML", f1, b, new RectangleF(o.X, o.Y + 8, o.Width, 30), sf);
            var nen = new Rectangle(o.X + 12, o.Y + 46, o.Width - 24, 22);
            using (var p = BoGoc(nen, 5)) g.FillPath(b, p);
            using (var f2 = new Font("Arial", 13f, FontStyle.Bold, GraphicsUnit.Pixel)) g.DrawString("PRO", f2, Brushes.White, nen, sf);
        }
        using (var f3 = new Font("Segoe UI", 12f, FontStyle.Bold))
        using (var sf = new StringFormat { Alignment = StringAlignment.Center })
            g.DrawString(Chung.TenApp, f3, Brushes.White, new RectangleF(0, 165, _ben.Width, 26), sf);
        using (var f4 = new Font("Segoe UI", 9f))
        using (var sf = new StringFormat { Alignment = StringAlignment.Center })
        using (var b = new SolidBrush(Color.FromArgb(255, 220, 225)))
            g.DrawString("phiên bản " + Chung.PhienBan, f4, b, new RectangleF(0, 192, _ben.Width, 20), sf);
        using (var f5 = new Font("Segoe UI", 10f))
        using (var sf = new StringFormat { Alignment = StringAlignment.Center })
            g.DrawString("Bước " + _soBuoc + " / 3", f5, Brushes.White, new RectangleF(0, 250, _ben.Width, 24), sf);
    }
    static GraphicsPath BoGoc(Rectangle r, int k)
    {
        var p = new GraphicsPath(); int d = k * 2;
        p.AddArc(r.X, r.Y, d, d, 180, 90); p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
        p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90); p.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
        p.CloseFigure(); return p;
    }

    Label TieuDe(string chu, int y)
    {
        return new Label { Text = chu, Font = new Font("Segoe UI", 14f, FontStyle.Bold), ForeColor = Color.FromArgb(17, 24, 39), AutoSize = true, Location = new Point(24, y) };
    }
    Label Doan(string chu, int y, int cao)
    {
        return new Label { Text = chu, ForeColor = ChuPhu, AutoSize = false, Location = new Point(24, y), Size = new Size(_than.Width - 48, cao) };
    }
    void DatBuoc(int n)
    {
        _soBuoc = n; _than.Controls.Clear(); _ben.Invalidate();
    }

    // ---------- Bước 1: chào mừng + tuỳ chọn ----------
    void VeBuoc1()
    {
        DatBuoc(1);
        bool daCai = File.Exists(Path.Combine(_thuMuc, Chung.TenExe));
        _than.Controls.Add(TieuDe(daCai ? "Cập nhật " + Chung.TenApp + " lên " + Chung.PhienBan : "Chào mừng đến với " + Chung.TenApp, 20));
        _than.Controls.Add(Doan("Đọc XML hoá đơn điện tử, tờ khai thuế theo mẫu iTax Viewer; kiểm chữ ký số; đối chiếu tờ khai với hoá đơn; lập tờ khai 01/GTGT, 04/GTGT, 01/CNKD hộ kinh doanh và tờ khai bổ sung.\r\nMiễn phí · chạy trên máy · không gửi dữ liệu đi đâu.", 56, 62));
        _than.Controls.Add(new Label { Text = "Thư mục cài", AutoSize = true, Location = new Point(24, 128), ForeColor = Color.FromArgb(17, 24, 39) });
        _oThuMuc.Text = _thuMuc; _oThuMuc.ReadOnly = true; _oThuMuc.BackColor = Color.White; _oThuMuc.SetBounds(24, 150, 330, 26);
        var doi = new Button { Text = "Đổi…", FlatStyle = FlatStyle.System }; doi.SetBounds(362, 149, 76, 28);
        doi.Click += (s, e) =>
        {
            using (var h = new FolderBrowserDialog { Description = "Chọn thư mục cài " + Chung.TenApp, SelectedPath = Path.GetDirectoryName(_thuMuc) })
                if (h.ShowDialog(this) == DialogResult.OK) { _thuMuc = Path.Combine(h.SelectedPath, "XML-Pro"); _oThuMuc.Text = _thuMuc; }
        };
        _cMan.Text = "Tạo lối tắt trên màn hình nền"; _cMan.Checked = true; _cMan.AutoSize = true; _cMan.Location = new Point(24, 192);
        _cChuot.Text = "Thêm \"Mở bằng " + Chung.TenApp + "\" khi chuột phải tệp .xml và thư mục"; _cChuot.Checked = true; _cChuot.AutoSize = true; _cChuot.Location = new Point(24, 218);
        var ghi = Doan("Lối tắt ở menu Start luôn được tạo. Gỡ cài đặt trong Cài đặt Windows → Ứng dụng.", 250, 40);
        ghi.ForeColor = Color.FromArgb(156, 163, 175);
        _than.Controls.AddRange(new Control[] { _oThuMuc, doi, _cMan, _cChuot, ghi });
        _nutGiua.Text = "Huỷ"; _nutGiua.Visible = true; _nutGiua.Enabled = true;
        _nutPhai.Text = daCai ? "Cập nhật" : "Cài đặt"; _nutPhai.Enabled = true;
        AcceptButton = _nutPhai; ActiveControl = _nutPhai; _oThuMuc.SelectionLength = 0;
    }

    // ---------- Bước 2: đang cài ----------
    void VeBuoc2()
    {
        DatBuoc(2);
        _than.Controls.Add(TieuDe("Đang cài đặt…", 20));
        _thanh.SetBounds(24, 76, _than.Width - 48, 20); _thanh.Maximum = CaiDat.Tep.Length; _thanh.Value = 0;
        _dangChep.SetBounds(24, 104, _than.Width - 48, 22); _dangChep.ForeColor = ChuPhu; _dangChep.Text = "Chuẩn bị…";
        _than.Controls.AddRange(new Control[] { _thanh, _dangChep });
        _nutGiua.Visible = false; _nutPhai.Text = "Cài đặt"; _nutPhai.Enabled = false;
    }

    // ---------- Bước 3: hoàn tất ----------
    void VeBuoc3()
    {
        DatBuoc(3);
        _than.Controls.Add(TieuDe("Cài đặt xong", 20));
        _than.Controls.Add(Doan(Chung.TenApp + " " + Chung.PhienBan + " đã sẵn sàng. Kéo thả tệp hoặc cả thư mục hoá đơn, tờ khai vào cửa sổ app để bắt đầu.", 56, 44));
        _cMo.Text = "Mở " + Chung.TenApp + " ngay"; _cMo.Checked = true; _cMo.AutoSize = true; _cMo.Location = new Point(24, 112);
        _cMacDinh.Text = "Chọn " + Chung.TenApp + " làm ứng dụng mở tệp .xml (mở Cài đặt Windows)"; _cMacDinh.AutoSize = true; _cMacDinh.Location = new Point(24, 138);
        _than.Controls.AddRange(new Control[] { _cMo, _cMacDinh });
        _nutGiua.Visible = false; _nutPhai.Text = "Hoàn tất"; _nutPhai.Enabled = true;
        AcceptButton = _nutPhai;
    }

    /// <summary>Chụp 3 màn hình ra tệp PNG (kiểm thử giao diện, không cài gì)</summary>
    public static void ChupManHinh(string thuMuc)
    {
        Directory.CreateDirectory(thuMuc);
        using (var f = new CuaSoCaiDat())
        {
            f.StartPosition = FormStartPosition.Manual; f.Location = new Point(-3000, -3000); f.ShowInTaskbar = false;
            f.Show(); Application.DoEvents();
            Action<int> chup = n =>
            {
                Application.DoEvents();
                using (var b = new Bitmap(f.Width, f.Height)) { f.DrawToBitmap(b, new Rectangle(0, 0, f.Width, f.Height)); b.Save(Path.Combine(thuMuc, "buoc-" + n + ".png")); }
            };
            chup(1);
            f.VeBuoc2(); f._thanh.Value = 10; f._dangChep.Text = "Đang chép mau-itax.js (11 / " + CaiDat.Tep.Length + ")"; chup(2);
            f.VeBuoc3(); chup(3);
            f.Close();
        }
    }

    void BamNutPhai()
    {
        if (_soBuoc == 1) BatDauCai();
        else if (_soBuoc == 3)
        {
            string exe = Path.Combine(_thuMuc, Chung.TenExe);
            if (CheDoThu) { KetQua = 0; Close(); return; }
            if (_cMo.Checked) try { Process.Start(new ProcessStartInfo(exe) { WorkingDirectory = _thuMuc }); } catch { }
            if (_cMacDinh.Checked)
            {
                try { Process.Start("ms-settings:defaultapps?registeredAppUser=" + Uri.EscapeDataString(Chung.TenApp)); }
                catch { try { Process.Start("ms-settings:defaultapps"); } catch { } }
            }
            KetQua = 0; Close();
        }
    }

    void BatDauCai()
    {
        // XML-Pro đang mở thì không ghi đè được tệp: hỏi trước, người dùng đồng ý mới đóng
        var dangMo = Process.GetProcessesByName(Path.GetFileNameWithoutExtension(Chung.TenExe));
        if (dangMo.Length > 0)
        {
            if (MessageBox.Show(this, Chung.TenApp + " đang mở. Đóng " + Chung.TenApp + " để cài tiếp?\n\nNhớ lưu việc đang làm dở (nếu có) trước khi bấm Có.", Text, MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
            foreach (var p in dangMo)
            {
                try { p.CloseMainWindow(); if (!p.WaitForExit(4000)) { p.Kill(); p.WaitForExit(3000); } } catch { }
            }
        }
        string dich = _thuMuc; bool man = _cMan.Checked, chuot = _cChuot.Checked;
        VeBuoc2();
        if (CheDoThu)
        {
            // Xem thử: chạy thanh tiến trình, không chép gì
            var t = new System.Windows.Forms.Timer { Interval = 120 }; int i = 0;
            t.Tick += (s2, e2) => { _thanh.Value = Math.Min(++i, _thanh.Maximum); _dangChep.Text = "Đang chép " + CaiDat.Tep[Math.Min(i, CaiDat.Tep.Length - 1)] + " (chế độ xem thử, không chép thật)"; if (i >= _thanh.Maximum) { t.Stop(); VeBuoc3(); } };
            t.Start(); return;
        }
        var luong = new Thread(() =>
        {
            Exception loi = null;
            try
            {
                CaiDat.CaiVao(dich, man, chuot, (i, ten) => BeginInvoke((Action)(() =>
                {
                    _thanh.Value = Math.Min(i, _thanh.Maximum);
                    _dangChep.Text = ten.Length > 0 ? "Đang chép " + ten + " (" + (i + 1) + " / " + CaiDat.Tep.Length + ")" : "Đang đăng ký với Windows…";
                })));
                Chung.GhiThuMucCai(dich);
            }
            catch (Exception e) { loi = e; CaiDat.GhiLoi(e); }
            BeginInvoke((Action)(() =>
            {
                if (loi == null) { VeBuoc3(); return; }
                MessageBox.Show(this, "Cài không thành công: " + loi.Message + "\n\nNếu " + Chung.TenApp + " đang mở, hãy đóng lại rồi chạy bộ cài lần nữa. Nếu đã chọn thư mục khác, chọn thư mục mà tài khoản này được quyền ghi (ví dụ trong thư mục người dùng).", Text, MessageBoxButtons.OK, MessageBoxIcon.Error);
                KetQua = 2; VeBuoc1();
            }));
        });
        luong.IsBackground = true;
        luong.Start();
    }
}
