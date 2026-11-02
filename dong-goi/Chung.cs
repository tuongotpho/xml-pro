// Phần dùng chung cho XemXmlThue.exe và bộ cài: thông tin tệp, đường dẫn, đăng ký với Windows.
// Viết theo C# 5 để biên dịch được bằng csc.exe có sẵn trong Windows (không cần cài Visual Studio).
using System;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using Microsoft.Win32;

[assembly: AssemblyTitle("XML-Pro")]
[assembly: AssemblyProduct("XML-Pro")]
[assembly: AssemblyDescription("Xem và xử lý 8 hệ sinh thái chứng từ điện tử Việt Nam (XML)")]
[assembly: AssemblyCompany("August87")]
[assembly: AssemblyCopyright("(C) August87 - 0982722036")]
// Số phiên bản nằm ở PhienBan.cs — do dong-goi.ps1 tự tạo, tự tăng mỗi lần đóng gói.

static class Chung
{
    public const string TenApp = "XML-Pro";
    public const string PhienBan = global::PhienBanApp.So;
    public const string ProgId = "XMLPro.xml";
    public const string TenExe = "XML-Pro.exe";
    const string KhoaGoCai = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\XMLPro";
    const string KhoaApp = @"Software\XMLPro";

    // Cài riêng cho tài khoản đang dùng: không cần quyền quản trị.
    public static string ThuMucCai
    {
        get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\XemXmlThue"); }
    }
    public static string ThuMucDuLieu
    {
        get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "XemXmlThue"); }
    }
    public static string LoiTat
    {
        get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), TenApp + ".lnk"); }
    }
    public static string LoiTatDesktop
    {
        get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Desktop), TenApp + ".lnk"); }
    }

    public static void DangKy(string exe)
    {
        string lenh = "\"" + exe + "\" \"%1\"";
        string bieuTuong = "\"" + exe + "\",0";
        using (var k = Registry.CurrentUser.CreateSubKey(@"Software\Classes\" + ProgId))
        {
            k.SetValue("", "Tệp XML (" + TenApp + ")");
            k.SetValue("FriendlyTypeName", "Tệp XML (" + TenApp + ")");
            using (var i = k.CreateSubKey("DefaultIcon")) i.SetValue("", bieuTuong);
            using (var c = k.CreateSubKey(@"shell\open\command")) c.SetValue("", lenh);
        }
        // Hiện trong "Mở bằng" của .xml (không chiếm quyền mặc định)
        using (var k = Registry.CurrentUser.CreateSubKey(@"Software\Classes\.xml\OpenWithProgids"))
            k.SetValue(ProgId, new byte[0], RegistryValueKind.None);
        using (var k = Registry.CurrentUser.CreateSubKey(@"Software\Classes\Applications\" + TenExe))
        {
            k.SetValue("FriendlyAppName", TenApp);
            using (var c = k.CreateSubKey(@"shell\open\command")) c.SetValue("", lenh);
            using (var s = k.CreateSubKey("SupportedTypes")) s.SetValue(".xml", "");
        }
        // Mục chuột phải "Xem bằng Xem XML thuế" cho mọi tệp .xml
        using (var k = Registry.CurrentUser.CreateSubKey(@"Software\Classes\SystemFileAssociations\.xml\shell\XemXmlThue"))
        {
            k.SetValue("", "Xem bằng " + TenApp);
            k.SetValue("Icon", bieuTuong);
            using (var c = k.CreateSubKey("command")) c.SetValue("", lenh);
        }
        // Để Windows liệt kê app trong Cài đặt > Ứng dụng mặc định
        using (var k = Registry.CurrentUser.CreateSubKey(KhoaApp + @"\Capabilities"))
        {
            k.SetValue("ApplicationName", TenApp);
            k.SetValue("ApplicationDescription", "Xem tờ khai, BCTC, thông báo thuế, chứng từ nộp tiền, hoá đơn điện tử");
            k.SetValue("ApplicationIcon", bieuTuong);
            using (var f = k.CreateSubKey("FileAssociations")) f.SetValue(".xml", ProgId);
        }
        using (var k = Registry.CurrentUser.CreateSubKey(@"Software\RegisteredApplications"))
            k.SetValue(TenApp, KhoaApp + @"\Capabilities");
        using (var k = Registry.CurrentUser.CreateSubKey(KhoaGoCai))
        {
            k.SetValue("DisplayName", TenApp);
            k.SetValue("DisplayVersion", PhienBan);
            k.SetValue("Publisher", "(C) August87 - 0982722036");
            k.SetValue("DisplayIcon", bieuTuong);
            k.SetValue("InstallLocation", Path.GetDirectoryName(exe));
            k.SetValue("UninstallString", "\"" + exe + "\" /uninstall");
            k.SetValue("NoModify", 1, RegistryValueKind.DWord);
            k.SetValue("NoRepair", 1, RegistryValueKind.DWord);
        }
        BaoWindows();
    }

    public static void HuyDangKy()
    {
        XoaKhoa(@"Software\Classes\" + ProgId);
        XoaKhoa(@"Software\Classes\Applications\" + TenExe);
        XoaKhoa(@"Software\Classes\SystemFileAssociations\.xml\shell\XemXmlThue");
        XoaKhoa(KhoaApp);
        XoaKhoa(KhoaGoCai);
        XoaGiaTri(@"Software\Classes\.xml\OpenWithProgids", ProgId);
        XoaGiaTri(@"Software\RegisteredApplications", TenApp);
        BaoWindows();
    }

    static void XoaKhoa(string k) { try { Registry.CurrentUser.DeleteSubKeyTree(k, false); } catch { } }
    static void XoaGiaTri(string k, string ten)
    {
        try { using (var x = Registry.CurrentUser.OpenSubKey(k, true)) if (x != null) x.DeleteValue(ten, false); } catch { }
    }

    [DllImport("shell32.dll")]
    static extern void SHChangeNotify(int eventId, int flags, IntPtr a, IntPtr b);
    static void BaoWindows() { SHChangeNotify(0x08000000, 0, IntPtr.Zero, IntPtr.Zero); } // SHCNE_ASSOCCHANGED

    public static void TaoLoiTat(string lnk, string exe)
    {
        Type t = Type.GetTypeFromProgID("WScript.Shell");
        object sh = Activator.CreateInstance(t);
        // WScript.Shell không lưu được tên có dấu ("ế"): lưu tên không dấu rồi đổi tên.
        string tam = Path.Combine(Path.GetDirectoryName(lnk), "XemXmlThue-tam.lnk");
        object sc = t.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, sh, new object[] { tam });
        Type st = sc.GetType();
        st.InvokeMember("TargetPath", BindingFlags.SetProperty, null, sc, new object[] { exe });
        st.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, sc, new object[] { Path.GetDirectoryName(exe) });
        st.InvokeMember("IconLocation", BindingFlags.SetProperty, null, sc, new object[] { exe + ",0" });
        st.InvokeMember("Description", BindingFlags.SetProperty, null, sc, new object[] { "XML-Pro - Phan tich & Xem ho so XML chuyen nghiep" });
        st.InvokeMember("Save", BindingFlags.InvokeMethod, null, sc, null);
        if (File.Exists(lnk)) File.Delete(lnk);
        File.Move(tam, lnk);
    }
}
