# -*- coding: utf-8 -*-
"""
KIỂM THỬ VỎ PHẦN MỀM XML-Pro 3 (WebView2) — chạy thật XML-Pro.exe vừa đóng gói, nối vào trang bên trong
bằng cổng gỡ lỗi của WebView2 (biến môi trường WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS), kiểm từng việc.
Mỗi mục có điều kiện bắt buộc; sai là thoát mã lỗi 1.
Chạy sau khi đóng gói:  python kiem-thu-vo-webview2.py
"""
import glob, json, os, shutil, subprocess, sys, tempfile, time, urllib.request
import websocket

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

APP = os.path.dirname(os.path.abspath(__file__))
RA = os.path.join(APP, 'dong-goi', 'ban-phat-hanh')
MAU = os.path.join(APP, 'mau-xml')
CONG = 9340
ket_qua = []


def danh_gia(ten, dat, chi_tiet=''):
    ket_qua.append((ten, dat))
    print(('  [ĐẠT]  ' if dat else '  [HỎNG] ') + ten + (f'  — {chi_tiet}' if chi_tiet else ''))


def tien_trinh_xml_pro(thu_muc):
    out = subprocess.run(['powershell', '-NoProfile', '-Command',
                          "Get-CimInstance Win32_Process -Filter \"name='XML-Pro.exe'\" | ForEach-Object { $_.ProcessId.ToString() + '|' + $_.ExecutablePath }"],
                         capture_output=True, text=True)
    return [l.split('|')[0] for l in out.stdout.splitlines() if '|' in l and l.split('|', 1)[1].lower().startswith(thu_muc.lower())]


def main():
    # XML-Pro chỉ cho một cửa sổ: nếu người dùng đang mở bản đã cài, bản test sẽ gửi tệp mẫu sang cửa sổ của họ.
    # Vì vậy thấy XML-Pro đang chạy thì dừng, không chạy gì.
    dang_chay = tien_trinh_xml_pro('')
    if dang_chay:
        print(f'  [DỪNG] XML-Pro đang mở (tiến trình {", ".join(dang_chay)}). Đóng XML-Pro rồi chạy lại bài test này.')
        sys.exit(2)
    tam = tempfile.mkdtemp(prefix='xmlpro3-')
    app = os.path.join(tam, 'app')
    os.makedirs(app)
    for f in glob.glob(os.path.join(APP, '*.js')) + [os.path.join(APP, 'index.html')]:
        shutil.copy(f, app)
    for f in ('XML-Pro.exe', 'Microsoft.Web.WebView2.Core.dll', 'Microsoft.Web.WebView2.WinForms.dll', 'WebView2Loader.dll'):
        shutil.copy(os.path.join(RA, f), app)
    luu = os.path.join(tam, 'luu'); os.makedirs(luu)
    exe = os.path.join(app, 'XML-Pro.exe')
    env = dict(os.environ, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=f'--remote-debugging-port={CONG}', XMLPRO_THU_MUC_LUU=luu)
    hd = sorted(glob.glob(os.path.join(MAU, 'hd_mau_*.xml')))
    print('=== Chạy XML-Pro.exe 3 với 1 hoá đơn ===')
    p1 = subprocess.Popen([exe, hd[0]], env=env)
    try:
        tab = None
        for _ in range(60):
            try:
                tabs = json.loads(urllib.request.urlopen(f'http://127.0.0.1:{CONG}/json', timeout=2).read())
                tab = next((t for t in tabs if t.get('type') == 'page' and t['url'].startswith('https://xml-pro.example/')), None)
                if tab:
                    break
            except Exception:
                pass
            time.sleep(0.5)
        danh_gia('Cửa sổ WebView2 mở trang ở địa chỉ nội bộ https://xml-pro.example (không còn file:///)', bool(tab), tab['url'] if tab else 'không thấy trang')
        if not tab:
            return
        ws = websocket.create_connection(tab['webSocketDebuggerUrl'], timeout=60)
        so = [0]

        def ev(bt):
            so[0] += 1
            ws.send(json.dumps({'id': so[0], 'method': 'Runtime.evaluate', 'params': {'expression': bt, 'returnByValue': True, 'awaitPromise': True}}))
            while True:
                r = json.loads(ws.recv())
                if r.get('id') == so[0]:
                    if 'exceptionDetails' in r['result']:
                        raise RuntimeError(json.dumps(r['result']['exceptionDetails'], ensure_ascii=False)[:300])
                    return r['result']['result'].get('value')

        def cho(bt, giay=15):
            for _ in range(int(giay / 0.25)):
                try:
                    v = ev(bt)
                    if v:
                        return v
                except Exception:
                    pass
                time.sleep(0.25)
            return None

        cho('!!window.__xemXmlThue')
        r = cho('window.__xemXmlThue.docs.length > 0 && ({ n: window.__xemXmlThue.docs.length, duongDan: window.__xemXmlThue.docs[0].duongDan, vo: !!(window.chrome && window.chrome.webview), origin: location.origin, phienBan: window.PHIEN_BAN })')
        danh_gia('Bấm đúp tệp (tham số dòng lệnh): tệp vào app, giữ đúng đường dẫn trên ổ đĩa', bool(r) and r['duongDan'] == hd[0] and r['vo'] and r['origin'] == 'https://xml-pro.example', json.dumps(r, ensure_ascii=False))

        print('=== Chạy lần 2 với cả thư mục mau-xml (như chuột phải thư mục → Mở bằng XML-Pro) ===')
        so_tep = len(glob.glob(os.path.join(MAU, '*.xml')))
        t0 = time.time()
        p2 = subprocess.run([exe, MAU], env=env, timeout=30)
        thoi = time.time() - t0
        r = cho(f'window.__xemXmlThue.docs.length >= {1 + so_tep} && ({{ n: window.__xemXmlThue.docs.length, rel: window.__xemXmlThue.docs.slice(1).map(d => d.relPath || d.source).slice(0, 3) }})', 20)
        con = tien_trinh_xml_pro(app)
        danh_gia(f'Lần chạy thứ 2 chuyển thư mục ({so_tep} tệp) sang cửa sổ đang mở rồi thoát, chỉ 1 XML-Pro chạy',
                 p2.returncode == 0 and thoi < 10 and bool(r) and len(con) == 1,
                 f'mã thoát {p2.returncode}, {thoi:.1f} s, {json.dumps(r, ensure_ascii=False)}, tiến trình: {con}')
        danh_gia('Tệp trong thư mục giữ cấu trúc "mau-xml/…" cho cây thư mục (Explorer)', bool(r) and all(str(x).startswith('mau-xml/') for x in r['rel']), json.dumps(r and r['rel'], ensure_ascii=False))

        print('=== Lịch sử: mở lại theo đường dẫn ===')
        ban_sao = os.path.join(tam, 'mo-lai.xml'); shutil.copy(hd[2], ban_sao)
        n0 = ev('window.__xemXmlThue.docs.length')
        ev(f'window.__xemXmlThue.moLai({json.dumps(ban_sao)}); true')
        r1 = cho(f'window.__xemXmlThue.docs.length > {n0} && window.__xemXmlThue.docs[window.__xemXmlThue.docs.length - 1].duongDan', 10)
        ev(f'window.__xemXmlThue.moLai({json.dumps(os.path.join(tam, "khong-co.xml"))}); true')
        r2 = cho("document.getElementById('main').textContent.includes('Không mở lại được')", 5)
        danh_gia('Mở lại từ Lịch sử: tệp còn → mở được; tệp mất → báo rõ', r1 == ban_sao and bool(r2), f'{r1} / báo lỗi: {r2}')

        print('=== An toàn ===')
        r = ev('''(async () => {
            const thu = async u => { try { const x = await fetch(u); return x.status; } catch (e) { return 'chặn'; } };
            return { maBua: await thu('https://tep.xml-pro.example/00000000000000000000000000000000'),
                     winIni: await thu('file:///C:/Windows/win.ini'),
                     ngoai: await thu('https://example.com/'),
                     cungThuMuc: await thu('https://xml-pro.example/../../Windows/win.ini') }; })()''')
        danh_gia('Trang không đọc được tệp ngoài danh sách đã chọn, không gọi ra mạng', r['maBua'] == 404 and r['winIni'] == 'chặn' and r['ngoai'] == 'chặn' and r['cungThuMuc'] in (404, 'chặn'), json.dumps(r))
        ev("location.href = 'file:///C:/Windows/'; true")
        time.sleep(1.5)
        r = ev('location.origin')
        danh_gia('Trang không bị điều hướng ra khỏi địa chỉ nội bộ', r == 'https://xml-pro.example', r)

        print('=== Tờ khai theo mẫu iTax + lưu tệp ===')
        p3 = subprocess.run([exe, os.path.join(MAU, 'mau-bctc-tt99.xml')], env=env, timeout=30)
        r = cho('''(() => { const A = window.__xemXmlThue, d = A.docs[A.docs.length - 1];
                 return d && d.mtk === '1281' && d._itaxDone && { bieu: (d._itaxSheets || []).length, the: document.querySelectorAll('.itax-tabs button').length }; })()''', 20)
        danh_gia('BCTC TT99 mở từ Explorer: dựng đủ biểu theo mẫu iTax, có thẻ', bool(r) and r['bieu'] >= 3 and r['the'] >= 3, json.dumps(r))
        ev("window.xuatExcel(window.__xemXmlThue.docs); true")
        tep_luu = None
        for _ in range(40):
            tep_luu = [f for f in os.listdir(luu) if f.endswith('.xlsx') and not f.endswith('.crdownload')]
            if tep_luu:
                break
            time.sleep(0.25)
        danh_gia('Xuất Excel: lưu thành tệp thật trên ổ đĩa qua vỏ (hộp "Lưu thành" — khi kiểm thử lưu thẳng)', bool(tep_luu) and os.path.getsize(os.path.join(luu, tep_luu[0])) > 5000, json.dumps(tep_luu))
        ws.close()
    finally:
        for pid in tien_trinh_xml_pro(app):
            subprocess.run(['taskkill', '/PID', pid, '/T', '/F'], capture_output=True)
        time.sleep(1)
        shutil.rmtree(tam, ignore_errors=True)

    dat = sum(1 for _, d in ket_qua if d)
    print(f'\n=== KẾT QUẢ VỎ WebView2: ĐẠT {dat}/{len(ket_qua)} ===')
    sys.exit(0 if dat == len(ket_qua) else 1)


if __name__ == '__main__':
    main()
