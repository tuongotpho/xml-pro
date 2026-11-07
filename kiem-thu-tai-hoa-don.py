# -*- coding: utf-8 -*-
"""
KIỂM THỬ TẢI HOÁ ĐƠN: chạy thật XML-Pro.exe, cửa sổ cổng thuế nối vào CỔNG GIẢ trên máy này (không đụng cổng thật, không cần tài khoản).
Cổng giả trả 6 hoá đơn mẫu, phân trang, báo gọi dày 1 lần, 1 hoá đơn không có XML, 1 hoá đơn máy tính tiền.
Kiểm: tệp về đúng từng byte, tải bù, không ghi đè, đường dẫn độc bị từ chối, không ra ngoài cổng, phiên không còn sau khi đóng cửa sổ.
Chạy sau khi đóng gói (XML-Pro đang mở cũng được):  python kiem-thu-tai-hoa-don.py
"""
import base64, functools, re, glob, hashlib, http.server, json, os, shutil, subprocess, sys, tempfile, threading, time, urllib.request
import xml.etree.ElementTree as ET
import websocket

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

APP = os.path.dirname(os.path.abspath(__file__))
RA = os.path.join(APP, 'dong-goi', 'ban-phat-hanh')
CONG, CONG_WEB = 9361, 9362
MST = '2601102955'
ket_qua = []


def danh_gia(ten, dat, chi_tiet=''):
    ket_qua.append((ten, dat))
    print(('  [ĐẠT]  ' if dat else '  [HỎNG] ') + ten + (f'  — {chi_tiet}' if chi_tiet else ''))


class ImLang(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


TRANG = r'''<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Cổng thuế giả</title></head><body><h2>Cổng thuế GIẢ để kiểm thử</h2><form onsubmit="return false"><input name="username"><input type="password" id="mk"></form>
<script>
window.__jwtGia = '';
window.__NEXT_REDUX_STORE__ = { getState: () => ({ authReducer: { jwt: window.__jwtGia } }) };
window.__mock = { calls: [], pageSize: 2, fail429Once: true, loi500: 0 };
const san = fetch('fixtures.json').then(r => r.json()).then(f => { window.__mock.fixtures = f; });
const that = window.fetch.bind(window);
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
const dmy = s => { const [d, m, y] = s.split('/'); return `${y}-${m}-${d}`; };
window.__dapAn = 'abc123';
window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  if (!url.startsWith('/api/')) return that(input, init);
  await san;
  const M = window.__mock, u = new URL(url, location.origin), h = init.headers || {};
  M.calls.push({ path: u.pathname, auth: h.Authorization, rid: !!h['request-id'] });
  if (h.Authorization !== 'Bearer jwt-gia') return json({ message: 'Unauthorized' }, 401);
  if (u.pathname === '/api/captcha') { M.soMa = (M.soMa || 0) + 1; return json({ key: 'k' + M.soMa, content: '<svg xmlns="http://www.w3.org/2000/svg" width="150" height="50"><rect width="150" height="50" fill="#eee"/><text x="20" y="32" font-size="22">abc123</text><scr' + 'ipt>window.__maDoc=1</scr' + 'ipt></svg>' }); }
  const sc = u.pathname.match(/^\/api\/sco-query\/invoices\/(purchase|sold)$/);
  if (sc) {
    const s = decodeURIComponent(url.match(/search=([^&]*)/)[1]);
    if (u.searchParams.get('cvalue') !== window.__dapAn || !u.searchParams.get('ckey')) return json({ message: 'Mã captcha không đúng' }, 400);
    const ge = dmy(s.match(/tdlap=ge=(\d\d\/\d\d\/\d{4})/)[1]), le = dmy(s.match(/tdlap=le=(\d\d\/\d\d\/\d{4})/)[1]), tt = (s.match(/ttxly==(\d)/) || [])[1];
    if ((new Date(le) - new Date(ge)) / 864e5 > 10) return json({ message: 'Khoảng tìm quá 10 ngày' }, 400);
    const chieu = sc[1] === 'purchase' ? 'mua' : 'ban';
    const all = M.fixtures.filter(f => f.sco && f.chieu === chieu).map(f => f.inv).filter(i => i.ngay >= ge && i.ngay <= le && (chieu === 'ban' || String(i.ttxly) === tt));
    const dau = Number(u.searchParams.get('state') || 0), sau = dau + M.pageSize;
    M.timSco = (M.timSco || 0) + 1;
    return json({ datas: all.slice(dau, sau), total: all.length, state: sau < all.length ? String(sau) : null });
  }
  const l = u.pathname.match(/^\/api\/query\/invoices\/(purchase|sold)$/);
  if (l) {
    const s = decodeURIComponent(url.match(/search=([^&]*)/)[1]);
    const ge = dmy(s.match(/tdlap=ge=(\d\d\/\d\d\/\d{4})/)[1]), le = dmy(s.match(/tdlap=le=(\d\d\/\d\d\/\d{4})/)[1]), tt = (s.match(/ttxly==(\d)/) || [])[1];
    const chieu = l[1] === 'purchase' ? 'mua' : 'ban';
    const all = M.fixtures.filter(f => !f.sco && f.chieu === chieu).map(f => f.inv).filter(i => i.ngay >= ge && i.ngay <= le && (chieu === 'ban' || String(i.ttxly) === tt));
    const dau = Number(u.searchParams.get('state') || 0), sau = dau + M.pageSize;
    return json({ datas: all.slice(dau, sau), total: all.length, state: sau < all.length ? String(sau) : null });
  }
  const x = u.pathname.match(/^\/api\/(query|sco-query)\/invoices\/export-xml$/);
  if (x) {
    if (M.fail429Once) { M.fail429Once = false; return json({ message: 'Too many requests' }, 429); }
    const p = u.searchParams, f = M.fixtures.find(k => k.inv.nbmst === p.get('nbmst') && k.inv.khhdon === p.get('khhdon') && String(k.inv.shdon) === p.get('shdon'));
    if (!f || !f.xml) return json({ message: 'Không tồn tại hồ sơ gốc của hóa đơn' }, 400);
    if ((f.sco || f.inv.ttxly === 8) && x[1] === 'query') return json({ message: 'Không có dữ liệu XML' }, 400);
    const z = new JSZip(); z.file('invoice.xml', Uint8Array.from(atob(f.xml), c => c.charCodeAt(0))); z.file('details.js', 'var x=1;');
    return new Response(await z.generateAsync({ type: 'uint8array' }), { status: 200 });
  }
  return json({ message: 'khong gia lap' }, 404);
};
</script></body></html>'''


def tao_fixture(hd):
    ra = []
    for f in hd:
        goc = open(f, 'rb').read()
        g = ET.fromstring(goc)
        t = lambda p: (g.findtext('.//' + p) or '').strip()
        chieu = 'ban' if t('NBan/MST') == MST else 'mua'
        kh, ngay = t('KHHDon'), t('NLap')
        inv = {'nbmst': t('NBan/MST'), 'nbten': t('NBan/Ten'), 'nmmst': t('NMua/MST'), 'nmten': t('NMua/Ten'), 'khmshdon': int(t('KHMSHDon') or 1),
               'khhdon': kh, 'shdon': int(t('SHDon')), 'tdlap': ngay + 'T03:00:00Z', 'ngay': ngay, 'tgtcthue': float(t('TgTCThue') or 0), 'tgtthue': float(t('TgTThue') or 0),
               'tgtttbso': float(t('TgTTTBSo') or 0), 'tthai': 1, 'ttxly': 8 if kh == 'C26TMA' else 5}  # lượt máy tính tiền: /query báo không có, phải sang /sco-query
        ra.append({'chieu': chieu, 'inv': inv, 'xml': base64.b64encode(goc).decode()})
    gia = dict(ra[0]['inv'] if ra[0]['chieu'] == 'mua' else next(r['inv'] for r in ra if r['chieu'] == 'mua'))
    gia.update({'khhdon': 'C26TZZ', 'shdon': 999, 'ttxly': 5})
    ra.append({'chieu': 'mua', 'inv': gia, 'xml': ''})
    # Hoá đơn máy tính tiền giả: lấy nội dung mẫu, đổi ký hiệu và số
    ban = next(r for r in ra if r['chieu'] == 'ban' and r['xml'])
    mua = next(r for r in ra if r['chieu'] == 'mua' and r['xml'])
    for chieu, nen, so, ngay, tt in (('ban', ban, 801, '2026-10-03', 5), ('ban', ban, 802, '2026-10-05', 5), ('ban', ban, 803, '2026-10-07', 5), ('ban', ban, 804, '2026-10-25', 5), ('mua', mua, 805, '2026-10-12', 6)):
        goc = base64.b64decode(nen['xml']).decode('utf-8-sig')
        moi = re.sub(r'<KHHDon>[^<]*</KHHDon>', '<KHHDon>C26MSG</KHHDon>', goc, count=1)
        moi = re.sub(r'<SHDon>[^<]*</SHDon>', f'<SHDon>{so}</SHDon>', moi, count=1).encode('utf-8')
        inv = dict(nen['inv'], khhdon='C26MSG', shdon=so, ngay=ngay, tdlap=ngay + 'T03:00:00Z', ttxly=tt)
        ra.append({'chieu': chieu, 'inv': inv, 'xml': base64.b64encode(moi).decode(), 'sco': True})
    return ra


def so_khung_tren(pid):
    """Khung nào đang nằm trên cùng trong cửa sổ chính: trang app phủ kín cửa sổ, khung cổng thì không ('app' / 'cong')"""
    ps = r'''
Add-Type @"
using System; using System.Runtime.InteropServices;
public static class D { [StructLayout(LayoutKind.Sequential)] public struct R { public int L, T, P, B; }
 [DllImport("user32.dll")] public static extern IntPtr GetTopWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out R r);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out R r);
 public static string Tren(IntPtr g) { R a, b; GetClientRect(g, out a); GetWindowRect(GetTopWindow(g), out b); return (b.P - b.L) >= (a.P - a.L) ? "app" : "cong"; } }
"@
[D]::Tren((Get-Process -Id %d).MainWindowHandle)''' % pid
    return subprocess.run(['powershell', '-NoProfile', '-Command', ps], capture_output=True, text=True).stdout.strip()


def goi_anh(tab):
    tab.n += 1
    tab.ws.send(json.dumps({'id': tab.n, 'method': 'Page.captureScreenshot', 'params': {'format': 'png'}}))
    while True:
        r = json.loads(tab.ws.recv())
        if r.get('id') == tab.n:
            d = r.get('result', {}).get('data')
            return base64.b64decode(d) if d else None


class Tab:
    def __init__(self, url):
        self.ws = websocket.create_connection(url, timeout=420, suppress_origin=True)
        self.n = 0

    def ev(self, bt):
        self.n += 1
        self.ws.send(json.dumps({'id': self.n, 'method': 'Runtime.evaluate', 'params': {'expression': bt, 'returnByValue': True, 'awaitPromise': True}}))
        while True:
            r = json.loads(self.ws.recv())
            if r.get('id') == self.n:
                if 'exceptionDetails' in r['result']:
                    raise RuntimeError(json.dumps(r['result']['exceptionDetails'], ensure_ascii=False)[:400])
                return r['result']['result'].get('value')


def tim_tab(tien_to, giay=20):
    for _ in range(giay * 3):
        try:
            for t in json.loads(urllib.request.urlopen(f'http://127.0.0.1:{CONG}/json', timeout=3).read()):
                if t.get('type') == 'page' and t['url'].startswith(tien_to):
                    return t
        except Exception:
            pass
        time.sleep(0.33)
    raise RuntimeError('Không thấy trang ' + tien_to)


def bam_tai(chinh):
    chinh.ev("(() => { document.getElementById('cgTu').value = '2026-10'; document.getElementById('cgDen').value = '2026-10'; document.getElementById('cgTT').textContent = ''; document.getElementById('cgChay').click(); })()")
    for _ in range(280):
        t = chinh.ev("document.getElementById('cgTT')?.textContent ?? ('MAT THE: ' + document.getElementById('main').innerText.slice(0, 200) + ' | so ' + document.title)")
        if t.startswith('MAT THE'):
            raise RuntimeError(t)
        if t.startswith('Xong') or t.startswith('Chưa tải xong') or t.startswith('Đã dừng'):
            return t, chinh.ev("document.getElementById('cgNk').textContent")
        time.sleep(0.5)
    raise RuntimeError('Quá giờ chờ tải')


def main():
    # Bản test có khoá và thư mục dữ liệu riêng (XMLPRO_THU_DU_LIEU), nên XML-Pro đang mở trên máy không bị đụng tới
    tam = tempfile.mkdtemp(prefix='xmlpro-cong-')
    app = os.path.join(tam, 'app'); web = os.path.join(tam, 'web'); luu = os.path.join(tam, 'luu')
    for d in (app, web, luu):
        os.makedirs(d)
    for f in glob.glob(os.path.join(APP, '*.js')) + [os.path.join(APP, 'index.html')]:
        shutil.copy(f, app)
    for f in ('XML-Pro.exe', 'Microsoft.Web.WebView2.Core.dll', 'Microsoft.Web.WebView2.WinForms.dll', 'WebView2Loader.dll'):
        shutil.copy(os.path.join(RA, f), app)
    hd = sorted(glob.glob(os.path.join(APP, 'mau-xml', 'hd_mau_*.xml')))
    open(os.path.join(web, 'index.html'), 'w', encoding='utf-8').write(TRANG)
    json.dump(tao_fixture(hd), open(os.path.join(web, 'fixtures.json'), 'w', encoding='utf-8'))
    may = http.server.ThreadingHTTPServer(('127.0.0.1', CONG_WEB), functools.partial(ImLang, directory=web))
    threading.Thread(target=may.serve_forever, daemon=True).start()
    env = dict(os.environ, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=f'--remote-debugging-port={CONG}', XMLPRO_THU_MUC_LUU=luu,
               XMLPRO_CONG_THU=f'http://127.0.0.1:{CONG_WEB}/', XMLPRO_THU_DU_LIEU=os.path.join(tam, 'dl'))
    os.makedirs(env['XMLPRO_THU_DU_LIEU'])
    p = subprocess.Popen([os.path.join(app, 'XML-Pro.exe')], env=env)
    try:
        chinh = Tab(tim_tab('https://xml-pro.example/', 40)['webSocketDebuggerUrl'])
        for _ in range(60):
            if chinh.ev("!!window.__xemXmlThue && document.readyState === 'complete'") is True:
                break
            time.sleep(0.3)
        print('=== 1. Mở cửa sổ cổng thuế ===')
        chinh.ev("document.getElementById('btnCongThue').click(); true")
        cong = Tab(tim_tab(f'http://127.0.0.1:{CONG_WEB}/')['webSocketDebuggerUrl'])
        for _ in range(40):
            if cong.ev("window.__taiHdXmlPro === true") is True:
                break
            time.sleep(0.25)
        danh_gia('Bấm nút trong app mở trang cổng, đã gắn phần tải, không còn khung trong trang', cong.ev("!!window.JSZip && !document.getElementById('xmlpro-tai-hd')") is True)

        print('=== 2. Trước khi đăng nhập ===')
        r = chinh.ev("(() => { const o = document.getElementById('congViTri').getBoundingClientRect(); return { w: o.width, h: o.height, the: !!document.getElementById('cgChay') }; })()")
        kt = cong.ev('({ w: innerWidth, h: innerHeight })')
        danh_gia('Chưa đăng nhập: thấy trang cổng đúng vùng nội dung, chưa có thẻ tải', not r['the'] and so_khung_tren(p.pid) == 'cong' and abs(kt['w'] - r['w']) <= 3 and abs(kt['h'] - r['h']) <= 3, f"vùng {r['w']:.0f}x{r['h']:.0f}")
        danh_gia('Mã nguồn phần tải không đụng tới ô mật khẩu', not any(k in (open(os.path.join(APP, t), encoding='utf-8').read().lower()) for t in ('tai-hoa-don.js', 'tai-hoa-don-loi.js') for k in ('type=password', 'type="password"', '.password', "'password'")))
        MK = 'MatKhauThu98765Zq'
        cong.ev(f"document.getElementById('mk').value = '{MK}'; document.querySelector('[name=username]').value = '{MST}'; true")

        print('=== 2b. Đăng nhập xong: trang tự ẩn ===')
        chinh.ev("window.__nhan = []; window.chrome.webview.addEventListener('message', e => window.__nhan.push(JSON.stringify(e.data).slice(0, 90))); true")
        cong.ev("window.__idTrang = 1; window.__jwtGia = 'jwt-gia'; true")
        for _ in range(30):
            if chinh.ev("!!document.getElementById('cgChay')") is True:
                break
            time.sleep(0.2)
        else:
            print('  CHAN DOAN', cong.ev("JSON.stringify({ id: window.__idTrang, jwt: window.__jwtGia, co: window.__taiHdXmlPro, tok: window.__taiXml.CONG.layMaDangNhap() })"), chinh.ev("JSON.stringify(window.__nhan)"), chinh.ev("document.getElementById('main').innerText.slice(0, 120)"))
        time.sleep(0.5)
        r = chinh.ev("(() => { const q = document.getElementById('cgDen').getBoundingClientRect(), k = document.querySelector('.cong-the').getBoundingClientRect(); return { the: true, rong: k.width, tran: q.right > k.right, an: !document.getElementById('congViTri') }; })()")
        tren = so_khung_tren(p.pid)
        danh_gia('Đăng nhập xong: trang cổng tự lùi, chỉ còn thẻ chọn tháng trong XML-Pro', r['an'] and tren == 'app', f'{r} tren={tren!r}')
        danh_gia('Thẻ tải đủ rộng, ô tháng không tràn', not r['tran'] and r['rong'] >= 400, f"{r['rong']:.0f} px")
        if os.environ.get('XMLPRO_ANH'):
            open(os.environ['XMLPRO_ANH'], 'wb').write(goi_anh(chinh))
        if '--do-nhip' in sys.argv:
            # Đo nhịp đồng hồ của trang khi nằm phía sau hơn 5 phút (Chromium giãn đồng hồ của trang ẩn sau 5 phút)
            kq = cong.ev('''new Promise(ok => { const ds = []; let t = performance.now(); const bd = t; const buoc = () => { const n = performance.now(); ds.push(n - t); t = n;
                if (n - bd > 370000) ok({ lan: ds.length, tb: ds.reduce((a, b) => a + b, 0) / ds.length, lonNhat: Math.max(...ds), cuoi: Math.max(...ds.slice(-60)), an: document.visibilityState }); else setTimeout(buoc, 800); }; setTimeout(buoc, 800); })''')
            print('NHIP', json.dumps(kq))
            return

        print('=== 3. Tải lần đầu ===')
        t0 = time.time()
        tt, nk = bam_tai(chinh)
        giay = time.time() - t0
        danh_gia('Tải xong: 6 tệp mới, 7 hoá đơn trong danh sách', tt.startswith('Xong: tải mới 6') and 'tổng 7' in tt, f'{tt} ({giay:.0f} giây)')
        goc = {hashlib.sha256(open(f, 'rb').read()).hexdigest() for f in hd}
        tep = [f for f in glob.glob(os.path.join(luu, '**', '*.xml'), recursive=True)]
        ve = {hashlib.sha256(open(f, 'rb').read()).hexdigest() for f in tep}
        danh_gia('6 tệp XML khớp từng byte với hoá đơn gốc', len(tep) == 6 and ve == goc, f'{len(tep)} tệp')
        rel = sorted(os.path.relpath(f, luu).replace('\\', '/') for f in tep)
        danh_gia('Lưu theo MST / chiều / loại', all(x.startswith(MST + '/') for x in rel) and sum('/MUA-VAO/HD-DIEN-TU/XML/' in x for x in rel) == 2 and sum('/BAN-RA/HD-DIEN-TU/XML/' in x for x in rel) == 4, rel[0][:70])
        xlsx = glob.glob(os.path.join(luu, MST, 'TOM-TAT-HOA-DON-*.xlsx')); txt = glob.glob(os.path.join(luu, MST, 'CAN-XEM-LAI-*.txt'))
        danh_gia('Có bảng tóm tắt, có danh sách cần xem lại ghi hoá đơn không có XML', len(xlsx) == 1 and len(txt) == 1 and 'C26TZZ' in open(txt[0], encoding='utf-8-sig').read())
        danh_gia('Gặp báo gọi dày: tự nghỉ, không mất hoá đơn; khung ghi rõ', 'gọi dày' in nk)
        danh_gia('Mọi lời gọi có mã đăng nhập và request-id', cong.ev("window.__mock.calls.every(c => c.auth === 'Bearer jwt-gia' && c.rid)") is True)
        for _ in range(40):
            if chinh.ev('window.__xemXmlThue.docs.filter(d => d.kind === "hd").length') == 6:
                break
            time.sleep(0.25)
        r = chinh.ev('({ n: __xemXmlThue.docs.filter(d => d.kind === "hd").length, conThe: !!document.getElementById("cgChay"), xem: !document.getElementById("cgXem").hidden, sd: __xemXmlThue.docs[0]?.duongDan })')
        danh_gia('Tệp tự vào XML-Pro ngầm, vẫn đứng ở thẻ để đọc kết quả, giữ đường dẫn thật', r['n'] == 6 and r['conThe'] and r['xem'] and r['sd'].startswith(luu), json.dumps(r, ensure_ascii=False)[:140])

        print('=== 4. Tải bù ===')
        os.remove(tep[0])
        cong.ev("window.__mock.calls.length = 0; true")
        tt, _ = bam_tai(chinh)
        xml_goi = cong.ev("window.__mock.calls.filter(c => c.path.endsWith('export-xml')).length")
        danh_gia('Xoá 1 tệp rồi tải lại: chỉ tải đúng 1 tệp, 5 tệp bỏ qua', tt.startswith('Xong: tải mới 1, đã có 5') and os.path.exists(tep[0]), f'{tt}, {xml_goi} lời gọi XML (gồm hoá đơn không có XML)')

        print('=== 4b. Hoá đơn máy tính tiền, tự gõ captcha ===')
        def cho_ma(giay=20):
            for _ in range(giay * 5):
                r = chinh.ev("(() => { const b = document.getElementById('cgMa'), a = document.getElementById('cgAnh'); return b && !b.hidden ? { w: a.naturalWidth, mo: document.getElementById('cgMoTa').textContent } : null; })()")
                if r:
                    return r
                t = chinh.ev("document.getElementById('cgTT').textContent")
                if t.startswith(('Xong', 'Chưa tải xong', 'Đã dừng')):
                    return None
                time.sleep(0.2)
            return None
        def go(ma):
            chinh.ev("(() => { const o = document.getElementById('cgNhapMa'); o.value = %s; document.getElementById('cgGuiMa').click(); })()" % json.dumps(ma))
            time.sleep(0.3)
        chinh.ev("(() => { const g = (i, v) => { document.getElementById(i).checked = v; }; g('cgMua', false); g('cgBan', false); g('cgMttBan', true); g('cgMttMua', false); document.getElementById('cgTu').value = '2026-10'; document.getElementById('cgDen').value = '2026-10'; document.getElementById('cgTT').textContent = ''; document.getElementById('cgChay').click(); })()")
        m1 = cho_ma()
        danh_gia('Tích máy tính tiền bán ra: thẻ hiện ảnh captcha trong XML-Pro', bool(m1) and m1['w'] > 0, str(m1))
        if os.environ.get('XMLPRO_ANH'):
            open(os.environ['XMLPRO_ANH'], 'wb').write(goi_anh(chinh))
        go('sai000')
        m2 = cho_ma()
        danh_gia('Gõ sai: báo gõ lại, không nghỉ 60 giây', bool(m2) and 'gõ lại' in m2['mo'], m2 and m2['mo'])
        danh_gia('Ảnh captcha không chạy được mã trong app', chinh.ev('window.__maDoc === undefined') is True)
        so_lan = 0
        chinh.ev("__xemXmlThue.moDashboard(''); true")
        time.sleep(0.4)
        nhac = chinh.ev("!document.getElementById('cgNhac').hidden")
        chinh.ev("document.getElementById('cgNhac').click(); true")
        time.sleep(0.4)
        danh_gia('Đang xem Dashboard: có nút nhắc, bấm về đúng ô gõ', nhac is True and chinh.ev("!document.getElementById('cgMa').hidden") is True)
        while True:
            m = cho_ma()
            if not m:
                break
            so_lan += 1
            go('abc123')
            if so_lan > 12:
                break
        tt = chinh.ev("document.getElementById('cgTT').textContent")
        goi_sco = cong.ev('window.__mock.timSco')
        danh_gia('Tải đủ 4 hoá đơn máy tính tiền bán ra, 4 đoạn của tháng 31 ngày và 1 trang thêm: 5 lượt tìm', tt.startswith('Xong: tải mới 4') and goi_sco == 5, f'{tt}, {goi_sco} lượt, {so_lan} lần gõ đúng')
        fx = {f['inv']['shdon']: base64.b64decode(f['xml']) for f in json.load(open(os.path.join(web, 'fixtures.json'), encoding='utf-8')) if f.get('sco')}
        sco_tep = glob.glob(os.path.join(luu, '**', 'HD-MAY-TINH-TIEN', 'XML', '*.xml'), recursive=True)
        danh_gia('Vào thư mục HD-MAY-TINH-TIEN, khớp từng byte', len(sco_tep) == 4 and {hashlib.sha256(open(f, 'rb').read()).hexdigest() for f in sco_tep} == {hashlib.sha256(fx[k]).hexdigest() for k in (801, 802, 803, 804)}, f'{len(sco_tep)} tệp')
        chinh.ev("(() => { const g = (i, v) => { document.getElementById(i).checked = v; }; g('cgMttBan', false); g('cgMttMua', true); document.getElementById('cgTT').textContent = ''; document.getElementById('cgChay').click(); })()")
        so_lan = 0
        while True:
            m = cho_ma()
            if not m:
                break
            so_lan += 1
            if so_lan == 1:
                chinh.ev("document.getElementById('cgBoMa').click(); true")
                time.sleep(0.3)
            else:
                go('abc123')
            if so_lan > 12:
                break
        tt = chinh.ev("document.getElementById('cgTT').textContent")
        nk = chinh.ev("document.getElementById('cgNk').textContent")
        danh_gia('Mua vào: 4 đoạn x 3 lượt = 12 lần gõ, bỏ qua 1 lần thì ghi rõ thiếu', so_lan == 12 and tt.startswith('Xong: tải mới 1') and 'anh chị đã bỏ qua' in nk, f'{so_lan} lần, {tt}')
        chinh.ev("(() => { document.getElementById('cgTT').textContent = ''; document.getElementById('cgChay').click(); })()")
        cho_ma()
        chinh.ev("document.getElementById('cgChay').click(); true")
        time.sleep(1)
        danh_gia('Bấm Dừng khi đang chờ captcha: dừng ngay, ô gõ biến mất', chinh.ev("document.getElementById('cgTT').textContent.startsWith('Đã dừng') && document.getElementById('cgMa').hidden") is True)
        chinh.ev("(() => { const g = (i, v) => { document.getElementById(i).checked = v; }; g('cgMttMua', false); g('cgMua', true); g('cgBan', true); g('cgChiDs', true); document.getElementById('cgTT').textContent = ''; document.getElementById('cgChay').click(); })()")
        truoc = len(glob.glob(os.path.join(luu, '**', '*.xml'), recursive=True))
        for _ in range(120):
            tt = chinh.ev("document.getElementById('cgTT').textContent")
            if tt.startswith('Xong'):
                break
            time.sleep(0.5)
        time.sleep(0.6)
        r = chinh.ev("(async () => { const ds = await KHO_HD.docTatCa(); return { cho: ds.filter(x => x.chuaCoXml).map(x => x.kh + '-' + x.so), n: ds.length, nk: document.getElementById('cgNk').textContent, kho: !document.getElementById('cgKho').hidden }; })()")
        danh_gia('Chỉ đối soát: không tải tệp nào, kho ghi hoá đơn có trên cổng mà chưa có XML', len(glob.glob(os.path.join(luu, '**', '*.xml'), recursive=True)) == truoc and 'C26TZZ-999' in r['cho'] and r['kho'] and 'Đối soát với kho' in r['nk'], f"{tt} {r['cho']}")
        chinh.ev("document.getElementById('cgChiDs').checked = false; true")

        print('=== 5. An toàn ===')
        doc = cong.ev('''(async () => { const v = window.chrome.webview, kq = {};
          const gui = (id, duong, b64 = 'QUJD') => new Promise(ok => { const f = e => { if (e.data.id === id) { v.removeEventListener('message', f); ok(e.data); } }; v.addEventListener('message', f); v.postMessage({ lenh: 'luuTep', id, duong, b64 }); });
          kq.leo = await gui(9001, '../../thoat.xml'); kq.tuyetDoi = await gui(9002, 'C:/Windows/thoat.xml'); kq.exe = await gui(9003, 'a/thoat.exe'); kq.chinhDuoi = await gui(9004, 'a/..\\\\..\\\\thoat.txt');
          return kq; })()''')
        danh_gia('Đường dẫn độc, đuôi lạ bị từ chối, không tệp nào lọt ra', not any(v['ok'] for v in doc.values()) and not glob.glob(os.path.join(tam, '**', 'thoat.*'), recursive=True), json.dumps({k: v['loi'] for k, v in doc.items()}, ensure_ascii=False)[:150])
        k = hashlib.sha256(open(tep[1], 'rb').read()).hexdigest()
        rel1 = os.path.relpath(tep[1], luu).replace('\\', '/')
        r = cong.ev('''new Promise(ok => { const v = window.chrome.webview, f = e => { if (e.data.id === 9005) { v.removeEventListener('message', f); ok(e.data); } }; v.addEventListener('message', f); v.postMessage({ lenh: 'luuTep', id: 9005, duong: %s, b64: 'QUJD' }); })''' % json.dumps(rel1))
        danh_gia('Không ghi đè tệp đã có', hashlib.sha256(open(tep[1], 'rb').read()).hexdigest() == k)
        cong.ev("location.href = 'https://example.invalid/'; true")
        time.sleep(1.2)
        danh_gia('Trang không rời được cổng thuế', cong.ev('location.origin') == f'http://127.0.0.1:{CONG_WEB}')

        print('=== 6. Đóng cửa sổ là hết phiên ===')
        chinh.ev("document.getElementById('cgXem').click(); true")
        time.sleep(0.6)
        r = {'dash': chinh.ev("!!document.querySelector('.ktt-dash')"), 'tren': so_khung_tren(p.pid)}
        danh_gia('Xem trên Dashboard: về app, phiên còn', r['dash'] and r['tren'] == 'app', str(r))
        chinh.ev("document.getElementById('btnCongThue').click(); true")
        time.sleep(0.6)
        danh_gia('Bấm lại mục Công cụ: về thẻ tải, kết quả còn nguyên, không phải đăng nhập lại', len(chinh.ev("document.getElementById('cgTT').textContent")) > 0 and cong.ev("window.__mock.calls.length > 0") is True)
        chinh.ev("document.getElementById('btnXemTrang').click(); true")
        time.sleep(0.6)
        a0 = so_khung_tren(p.pid)
        chinh.ev("document.getElementById('about').click(); true")
        time.sleep(0.6)
        a1 = so_khung_tren(p.pid)
        chinh.ev("document.getElementById('dlg').close(); true")
        time.sleep(0.6)
        danh_gia('Xem trang cổng được; mở hộp Giới thiệu thì trang lùi, đóng hộp thì hiện lại', a0 == 'cong' and a1 == 'app' and so_khung_tren(p.pid) == 'cong', f'{a0} {a1}')
        cong.ev("window.__jwtGia = ''; true")
        time.sleep(1.6)
        danh_gia('Hết phiên: trang đăng nhập tự hiện lại', chinh.ev("!!document.getElementById('congViTri')") is True and so_khung_tren(p.pid) == 'cong')
        cong.ev("window.__jwtGia = 'jwt-gia'; true")
        time.sleep(1.2)
        cong.ev("localStorage.setItem('phien', '1'); document.cookie = 'phien=1'; true")
        cong.ev("window.chrome.webview.postMessage({ lenh: 'trangThai', dangTai: false }); true")
        chinh.ev("document.getElementById('btnDongCong').click(); true")
        time.sleep(2)
        danh_gia('Đóng và đăng xuất: về Dashboard', chinh.ev("!!document.querySelector('.ktt-dash')") is True)
        chinh.ev("document.getElementById('btnCongThue').click(); true")
        time.sleep(1.5)
        cong2 = Tab(tim_tab(f'http://127.0.0.1:{CONG_WEB}/')['webSocketDebuggerUrl'])
        r = cong2.ev("({ ls: localStorage.getItem('phien'), ck: document.cookie })")
        danh_gia('Mở lại cửa sổ: không còn dữ liệu phiên trước', r['ls'] is None and 'phien' not in r['ck'], str(r))
        time.sleep(1.5)
        tim = [MK.encode('utf-8'), MK.encode('utf-16-le')]
        co = []
        for goc_tim in (luu, env['XMLPRO_THU_DU_LIEU']):
            for d, _, ds in os.walk(goc_tim):
                for t in ds:
                    try:
                        b = open(os.path.join(d, t), 'rb').read()
                    except Exception:
                        continue
                    if any(k in b for k in tim):
                        co.append(t)
        danh_gia('Dò toàn bộ thư mục dữ liệu app và thư mục tải: không có mật khẩu', not co, f'{co[:3]}')
        r = chinh.ev("JSON.stringify(Object.keys(localStorage))")
        danh_gia('Phiên cổng tách khỏi trang app', 'phien' not in json.loads(r))
    finally:
        p.kill()
        subprocess.run(['powershell', '-NoProfile', '-Command', f"Get-CimInstance Win32_Process -Filter \"name='XML-Pro.exe'\" | Where-Object {{ $_.ExecutablePath -like '{tam}*' }} | ForEach-Object {{ Stop-Process -Id $_.ProcessId -Force }}"], capture_output=True)
        may.shutdown()
        time.sleep(1)
        shutil.rmtree(tam, ignore_errors=True)
    dat = sum(1 for _, d in ket_qua if d)
    print(f'\n=== KẾT QUẢ TẢI HOÁ ĐƠN: ĐẠT {dat}/{len(ket_qua)} ===')
    sys.exit(0 if dat == len(ket_qua) else 1)


if __name__ == '__main__':
    main()
