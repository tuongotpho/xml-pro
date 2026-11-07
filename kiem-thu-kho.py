# -*- coding: utf-8 -*-
"""
KIỂM THỬ KHO HOÁ ĐƠN: trang chủ, kho còn nguyên sau khi mở lại app, lọc, đánh dấu, khoá sổ, Excel, sao lưu, đối soát cổng, 50.000 hoá đơn.
Chạy trang thật trong Edge không giao diện, vỏ WebView2 thay bằng vỏ giả. Tiền so với Python đọc thẳng XML.
Chạy:  python kiem-thu-kho.py      (cần Edge, Python có websocket-client)
"""
import functools, glob, http.server, json, os, re, shutil, subprocess, sys, tempfile, threading, time, urllib.request
import xml.etree.ElementTree as ET
import websocket

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

APP = os.path.dirname(os.path.abspath(__file__))
CONG, CONG_WEB = 9381, 9382
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(EDGE):
    EDGE = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
MST = '2601102955'
ket_qua = []


def danh_gia(ten, dat, chi_tiet=''):
    ket_qua.append((ten, dat))
    print(('  [ĐẠT]  ' if dat else '  [HỎNG] ') + ten + (f'  — {chi_tiet}' if chi_tiet else ''))


class ImLang(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


VO_GIA = r'''
window.__lenh = [];
window.chrome = window.chrome || {};
window.chrome.webview = { addEventListener(t, f) { this.f = f; }, gui(m) { this.f({ data: m }); }, postMessage(m) { window.__lenh.push(m); } };
window.confirm = () => true; window.alert = () => {};
'''
XEM = r'''(() => { const q = s => document.querySelector(s); return { dong: [...document.querySelectorAll('.kho tbody tr[data-k]')].length, tong: q('#khoTong')?.innerText || '', bao: q('#khoBao')?.textContent || '' }; })()'''


def cong_xml(cac_tep, mst):
    kq = {'ban': [0, 0, 0], 'mua': [0, 0, 0]}
    for f in cac_tep:
        g = ET.parse(f).getroot()
        t = lambda p: (g.findtext('.//' + p) or '').strip()
        ben = 'ban' if t('NBan/MST') == mst else 'mua' if t('NMua/MST') == mst else None
        if ben:
            kq[ben][0] += float(t('TToan/TgTCThue') or 0); kq[ben][1] += float(t('TToan/TgTThue') or 0); kq[ben][2] += 1
    return kq


def main():
    tam = tempfile.mkdtemp(prefix='xmlpro-kho-')
    web = os.path.join(tam, 'web')
    os.makedirs(os.path.join(web, 'cu'))
    for f in glob.glob(os.path.join(APP, '*.js')) + [os.path.join(APP, 'index.html')]:
        shutil.copy(f, web)
    hd = sorted(glob.glob(os.path.join(APP, 'mau-xml', 'hd_mau_*.xml')))
    ten = [f'hd{i + 1}.xml' for i in range(len(hd))]
    for f, t in zip(hd, ten):
        shutil.copy(f, os.path.join(web, 'cu', t))
    nap = json.dumps([{'ten': t, 'url': f'/cu/{t}', 'relPath': f'cu/{t}', 'duongDan': 'C:\\cu\\' + t} for t in ten])
    may = http.server.ThreadingHTTPServer(('127.0.0.1', CONG_WEB), functools.partial(ImLang, directory=web))
    threading.Thread(target=may.serve_forever, daemon=True).start()
    hoso = tempfile.mkdtemp(prefix='xmlpro-edge-')
    p = subprocess.Popen([EDGE, f'--remote-debugging-port={CONG}', '--headless', '--disable-gpu', '--no-first-run', '--user-data-dir=' + hoso, 'about:blank'])
    try:
        for _ in range(40):
            try:
                tab = [t for t in json.loads(urllib.request.urlopen(f'http://127.0.0.1:{CONG}/json').read()) if t['type'] == 'page'][0]
                break
            except Exception:
                time.sleep(0.3)
        ws = websocket.create_connection(tab['webSocketDebuggerUrl'], timeout=180, suppress_origin=True)
        so = [0]

        def goi(pt, tham):
            so[0] += 1
            ws.send(json.dumps({'id': so[0], 'method': pt, 'params': tham}))
            while True:
                r = json.loads(ws.recv())
                if r.get('id') == so[0]:
                    return r['result']

        def ev(bt):
            r = goi('Runtime.evaluate', {'expression': bt, 'returnByValue': True, 'awaitPromise': True})
            if 'exceptionDetails' in r:
                raise RuntimeError(json.dumps(r['exceptionDetails'], ensure_ascii=False)[:500])
            return r['result'].get('value')

        goi('Page.enable', {})
        goi('Page.addScriptToEvaluateOnNewDocument', {'source': VO_GIA})
        goi('Page.navigate', {'url': f'http://127.0.0.1:{CONG_WEB}/index.html'})

        def cho_trang():
            for _ in range(60):
                try:
                    if ev("!!window.__xemXmlThue && !!window.KHO_HD && document.readyState === 'complete'") is True:
                        return
                except Exception:
                    pass
                time.sleep(0.25)
            raise RuntimeError('Trang không nạp được')

        cho_trang()
        print('=== 1. Trang chủ ===')
        r = ev("""(() => { const q = s => document.querySelector(s), b = q('#btnEmptyCong').getBoundingClientRect(); return { thay: b.width > 80 && b.height > 30, bang: document.querySelectorAll('#btnEmptyCong').length, chu: q('.home-tai').innerText, ben: !!q('#btnNavCong') && !!q('#btnNavKho'), khoAn: q('#homeKho').hidden }; })()""")
        danh_gia('Trang chủ có khối tải hoá đơn nổi bật, nói rõ tự đăng nhập, không lưu mật khẩu', r['thay'] and r['bang'] == 1 and 'không lưu mật khẩu' in r['chu'], r['chu'][:70].replace('\n', ' '))
        danh_gia('Thanh bên luôn có nút Tải hoá đơn và Kho hoá đơn', r['ben'])
        danh_gia('Kho trống thì chưa hiện dòng báo kho', r['khoAn'])
        ev("document.getElementById('btnEmptyCong').click(); true")
        time.sleep(0.2)
        danh_gia('Bấm nút trang chủ vào đúng màn tải cổng thuế', ev("!!document.getElementById('congViTri') && window.__lenh.some(m => m.lenh === 'hienCong')") is True)
        ev("window.chrome.webview.gui({ loai: 'congDaDong' }); true")

        print('=== 2. Kho còn nguyên sau khi mở lại app ===')
        ev(f'''(async () => {{ window.chrome.webview.gui({{ loai: 'tep', nguon: 'chon', ds: {nap} }});
              for (let i = 0; i < 60 && __xemXmlThue.docs.length < 6; i++) await new Promise(r => setTimeout(r, 100));
              await new Promise(r => setTimeout(r, 400)); __xemXmlThue.setMyMst('{MST}'); }})()''')
        ev("(async () => { await KHO_HD.xoaHet(); KHO_HD.huyDem(); document.getElementById('btnNavKho').click(); await new Promise(r => setTimeout(r, 400)); })()")
        ev('location.reload(); true'); time.sleep(1); cho_trang(); time.sleep(0.4)
        r = ev("({ co: !document.getElementById('homeKho').hidden, chu: document.getElementById('homeKhoChu').textContent, docs: __xemXmlThue.docs.length })")
        danh_gia('Mở lại app không nạp gì: trang chủ báo kho có 6 hoá đơn', r['co'] and '6' in r['chu'] and r['docs'] == 0, r['chu'])
        ev("(async () => { document.getElementById('btnEmptyKho').click(); await new Promise(r => setTimeout(r, 400)); })()")
        r = ev(XEM)
        py = cong_xml(hd, MST)
        so_ = lambda v: f'{round(v):,}'.replace(',', '.')
        danh_gia('Màn Kho hiện đủ 6 dòng, tiền khớp Python đọc XML', r['dong'] == 6 and all(so_(x) in r['tong'] for x in (py['ban'][0], py['ban'][1], py['mua'][0], py['mua'][1])), r['tong'].replace('\n', ' ')[:130])

        print('=== 3. Lọc, tìm ===')
        loc = lambda i, v: ev(f"(async () => {{ const e = document.getElementById('{i}'); e.value = {json.dumps(v)}; e.dispatchEvent(new Event('{'input' if i == 'khoQ' else 'change'}', {{ bubbles: true }})); await new Promise(r => setTimeout(r, 80)); return {XEM}; }})()")
        danh_gia('Lọc mua vào: 2 dòng', loc('khoChieu', 'mua')['dong'] == 2)
        danh_gia('Lọc bán ra: 4 dòng', loc('khoChieu', 'ban')['dong'] == 4)
        loc('khoChieu', '')
        danh_gia('Lọc tháng không có hoá đơn: 0 dòng', loc('khoTu', '2026-11')['dong'] == 0)
        loc('khoTu', '')
        danh_gia('Tìm theo số hoá đơn: 1 dòng', loc('khoQ', 'C26TTP')['dong'] == 1)
        loc('khoQ', '')

        print('=== 4. Trạng thái, ghi chú, khoá sổ ===')
        r = ev("""(async () => { const qa = s => [...document.querySelectorAll(s)], dan = (i, v) => { const c = qa('.kho-chon')[i]; c.checked = v; c.dispatchEvent(new Event('change', { bubbles: true })); };
          dan(0, true); dan(1, true); document.querySelector('[data-dau="ht"]').click(); await new Promise(r => setTimeout(r, 80));
          const o = qa('.kho-gc')[2]; o.value = 'Đã gọi NCC'; o.dispatchEvent(new InputEvent('input', { bubbles: true })); return document.getElementById('khoBao').textContent; })()""")
        danh_gia('Đánh dấu hàng loạt đã hạch toán', 'Đã đánh dấu 2' in r, r)
        danh_gia('Lọc chưa hạch toán: còn 4', loc('khoTT', 'chuaHT')['dong'] == 4)
        danh_gia('Lọc có ghi chú: 1', loc('khoTT', 'ghi')['dong'] == 1)
        danh_gia('Tìm được theo ghi chú', loc('khoTT', '') and loc('khoQ', 'gọi NCC')['dong'] == 1)
        loc('khoQ', '')
        r = ev("""(async () => { document.getElementById('khoBoChon').click(); SO_TAY.khoaKy('%s', '2026-Q4', __xemXmlThue.docs.length ? __xemXmlThue.docs : await (async () => [])()); document.getElementById('khoChonHet').click();
          document.querySelector('[data-dau="tt"]').click(); await new Promise(r => setTimeout(r, 80)); const bao = document.getElementById('khoBao').textContent; const khoa = [...document.querySelectorAll('.kho-gc')].filter(x => x.disabled).length; SO_TAY.moKhoa('%s', '2026-Q4'); return { bao, khoa }; })()""" % (MST, MST))
        danh_gia('Kỳ đã khoá sổ: đánh dấu bị bỏ qua, ô ghi chú khoá', 'bỏ qua 6' in r['bao'] and r['khoa'] == 6, r['bao'])

        print('=== 5. Excel, sao lưu ===')
        r = ev("""(async () => { document.getElementById('khoBoChon').click(); let blob = null; const goc = URL.createObjectURL; URL.createObjectURL = b => { blob = b; return goc.call(URL, b); };
          document.getElementById('khoExcel').click(); await new Promise(r => setTimeout(r, 500)); URL.createObjectURL = goc;
          const z = await JSZip.loadAsync(blob), x = await z.file('xl/worksheets/sheet1.xml').async('string'); return { dong: (x.match(/<row /g) || []).length, gc: x.includes('Đã gọi NCC'), ht: x.includes('>Có<') }; })()""")
        danh_gia('Xuất Excel đúng số dòng, có ghi chú, có cột đánh dấu', r['dong'] == 7 and r['gc'] and r['ht'], str(r))
        r = ev("""(async () => { let blob = null; const goc = URL.createObjectURL; URL.createObjectURL = b => { blob = b; return goc.call(URL, b); };
          document.getElementById('khoSaoLuu').click(); await new Promise(r => setTimeout(r, 200)); URL.createObjectURL = goc;
          const nd = await blob.text(); await KHO_HD.xoaHet(); KHO_HD.huyDem(); localStorage.removeItem('xmlpro.soTay.v1');
          const dt = new DataTransfer(); dt.items.add(new File([nd], 'sao-luu.json')); const i = document.getElementById('khoTep'); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true }));
          await new Promise(r => setTimeout(r, 700)); const qa = s => [...document.querySelectorAll(s)];
          return { co: nd.length, dong: qa('.kho tbody tr[data-k]').length, gc: qa('.kho-gc').some(x => x.value === 'Đã gọi NCC'), bao: document.getElementById('khoBao').textContent, mk: /password|mat.?khau|jwt/i.test(nd) }; })()""")
        danh_gia('Xoá hết rồi phục hồi từ tệp sao lưu: đủ dòng, đủ ghi chú', r['dong'] == 6 and r['gc'], r['bao'])
        danh_gia('Tệp sao lưu không chứa mật khẩu, mã phiên', not r['mk'], f"{r['co']} byte")

        print('=== 6. Đối soát với cổng thuế ===')
        r = ev("""(async () => { const ds = await KHO_HD.docTatCa(), ban = ds.filter(x => x.chieu === 'ban'), mua = ds.filter(x => x.chieu === 'mua'), h = (x, tt, tong) => [x.chieu, x.mstBan, x.tenBan, x.mstMua, x.tenMua, x.mau, x.kh, x.so, x.ngay, x.V, x.T, tong ?? x.tong, tt];
          const dong = [h(ban[0], 6), h(ban[1], 1, ban[1].tong + 1000), h(ban[2], 1), h(mua[0], 1), h(mua[1], 1), ['mua', '0100000000', 'NCC THU', '%s', 'X', '1', 'C26TAA', '777', '2026-10-09', 100, 10, 110, 1]];
          const kq = await KHO_HD.doiSoat({ dong, tu: '2026-10-01', den: '2026-10-31', coMtt: false, du: true }); KHO_HD.huyDem(); document.getElementById('btnNavKho').click(); await new Promise(r => setTimeout(r, 400));
          const e = document.getElementById('khoTT'); e.value = 'cong'; e.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(r => setTimeout(r, 100));
          return { kq, xem: document.querySelector('.kho tbody').innerText, dong: document.querySelectorAll('.kho tbody tr[data-k]').length, tong: document.getElementById('khoTong').innerText }; })()""" % MST)
        k = r['kq']
        danh_gia('Đối soát: 1 chưa có XML, 1 bị huỷ, 1 lệch tiền, 1 không thấy trên cổng', k['chuaCoXml'] == 1 and k['biHuy'] == 1 and k['lechTien'] == 1 and k['khongTrenCong'] == 1, json.dumps(k))
        danh_gia('Bộ lọc Lệch với cổng thuế hiện đúng 4 dòng và đủ nhãn', r['dong'] == 4 and all(x in r['xem'] for x in ('chưa có XML', 'Đã bị huỷ', 'Lệch tiền', 'Không thấy trên cổng')), r['tong'].replace('\n', ' ')[-40:])
        r = ev("""(async () => { const e = document.getElementById('khoTT'); e.value = ''; e.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(r => setTimeout(r, 80));
          window.__lenh.length = 0; document.querySelector('.kho-mo').click(); await new Promise(r => setTimeout(r, 100)); return window.__lenh.map(m => m.lenh); })()""")
        danh_gia('Bấm số hoá đơn trong kho: mở tệp gốc theo đường dẫn', 'moLai' in r, str(r))

        print('=== 7. 50.000 hoá đơn ===')
        r = ev("""(async () => { await KHO_HD.xoaHet(); KHO_HD.huyDem(); const ds = [];
          for (let i = 0; i < 50000; i++) { const m = 1 + i %% 12; ds.push({ k: 'k' + i, chu: '%s', chieu: i %% 3 ? 'mua' : 'ban', mstBan: '0100000' + (i %% 900), tenBan: 'CONG TY ' + i, mstMua: '%s', tenMua: 'MINH', mau: '1', kh: 'C26TAA', so: String(i), ngay: '2026-' + String(m).padStart(2, '0') + '-15', V: 1000 + i, T: 100, tong: 1100 + i, lq: null, duongDan: 'C:\\\\a\\\\' + i + '.xml', tep: i + '.xml' }); }
          const t0 = performance.now(); await KHO_HD.ghiLoat(ds); const t1 = performance.now(); KHO_HD.huyDem(); document.getElementById('main').innerHTML = ''; document.getElementById('btnNavKho').click();
          for (let i = 0; i < 400 && !document.querySelector('.kho tbody tr[data-k]'); i++) await new Promise(r => setTimeout(r, 25));
          const t2 = performance.now(); const q = document.getElementById('khoQ'); q.value = 'CONG TY 49999'; q.dispatchEvent(new Event('input', { bubbles: true })); const t3 = performance.now();
          return { ghi: t1 - t0, mo: t2 - t1, loc: t3 - t2, dong: document.querySelectorAll('.kho tbody tr[data-k]').length }; })()""" % (MST, MST))
        danh_gia('Kho 50.000 hoá đơn: mở dưới 3 giây, lọc dưới 1 giây', r['mo'] < 3000 and r['loc'] < 1000 and r['dong'] == 1, f"ghi {r['ghi']:.0f} ms, mở {r['mo']:.0f} ms, lọc {r['loc']:.0f} ms")
    finally:
        p.kill()
        may.shutdown()
        time.sleep(0.5)
        shutil.rmtree(tam, ignore_errors=True)
        shutil.rmtree(hoso, ignore_errors=True)
    dat = sum(1 for _, d in ket_qua if d)
    print(f'\n=== KẾT QUẢ KHO HOÁ ĐƠN: ĐẠT {dat}/{len(ket_qua)} ===')
    sys.exit(0 if dat == len(ket_qua) else 1)


if __name__ == '__main__':
    main()
