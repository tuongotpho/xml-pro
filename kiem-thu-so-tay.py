# -*- coding: utf-8 -*-
"""
KIỂM THỬ SỔ TAY (bản 3.0.7): khoá sổ, ghi chú, nối lại đường dẫn, cột Ghi chú và tiền của bảng kê Excel.
Chạy trang thật trong Edge không giao diện, thay vỏ WebView2 bằng vỏ giả ghi lại lệnh (bản đang mở trên máy không bị đụng tới).
Tiền đối chiếu bằng Python đọc thẳng XML, không dùng số của app. Sai mục nào thoát mã lỗi 1.
Chạy:  python kiem-thu-so-tay.py      (cần Edge, Python có websocket-client)
"""
import functools, glob, http.server, json, os, re, shutil, subprocess, sys, tempfile, threading, time, urllib.request
import xml.etree.ElementTree as ET
import websocket

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

APP = os.path.dirname(os.path.abspath(__file__))
CONG, CONG_WEB = 9352, 9353
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
window.__lenh = []; window.__dsMoi = []; window.__baoTruoc = [];
window.chrome = window.chrome || {};
window.chrome.webview = {
  addEventListener(t, f) { this.f = f; },
  gui(m) { this.f({ data: m }); },
  postMessage(m) {
    window.__lenh.push(m);
    if (m.lenh === 'kiemDuongDan') setTimeout(() => this.gui({ loai: 'ketQuaDuongDan', mat: m.ds.filter(p => p.startsWith('C:\\cu\\')) }), 0);
    if (m.lenh === 'chonThuMucNoiLai') setTimeout(() => this.gui({ loai: 'tep', nguon: 'noiLai', ds: window.__dsMoi }), 0);
  }
};
window.confirm = () => true;
window.alert = t => { window.__baoTruoc.push(String(t)); };
'''


def cong_xml(cac_tep, mst):
    """Python đọc thẳng XML: trả về {ban: (V, T), mua: (V, T)} và số hoá đơn"""
    kq = {'ban': [0, 0, 0], 'mua': [0, 0, 0]}
    for f in cac_tep:
        g = ET.parse(f).getroot()
        t = lambda p: (g.findtext('.//' + p) or '').strip()
        ben = 'ban' if t('NBan/MST') == mst else 'mua' if t('NMua/MST') == mst else None
        if ben:
            kq[ben][0] += float(t('TToan/TgTCThue') or 0); kq[ben][1] += float(t('TToan/TgTThue') or 0); kq[ben][2] += 1
    return kq


def main():
    tam = tempfile.mkdtemp(prefix='xmlpro-sotay-')
    web = os.path.join(tam, 'web')
    os.makedirs(os.path.join(web, 'cu')); os.makedirs(os.path.join(web, 'moi', 'con'))
    for f in glob.glob(os.path.join(APP, '*.js')) + [os.path.join(APP, 'index.html')]:
        shutil.copy(f, web)
    hd = sorted(glob.glob(os.path.join(APP, 'mau-xml', 'hd_mau_*.xml')))
    ten = [f'hd{i + 1}.xml' for i in range(len(hd))]
    for f, t in zip(hd, ten):
        shutil.copy(f, os.path.join(web, 'cu', t))
    # Thư mục mới: hd1 đổi tên, hd2 vào thư mục con, hd3..5 giữ tên, hd6 không chuyển sang
    ten_moi = {'hd1.xml': 'moi/doi-ten-roi.xml', 'hd2.xml': 'moi/con/hd2.xml', 'hd3.xml': 'moi/hd3.xml', 'hd4.xml': 'moi/hd4.xml', 'hd5.xml': 'moi/hd5.xml'}
    for c, m in ten_moi.items():
        shutil.copy(os.path.join(web, 'cu', c), os.path.join(web, m.replace('/', os.sep)))
    for t in ('chi-lich-su.xml', 'con/trung.xml', 'trung.xml'):
        open(os.path.join(web, 'moi', t.replace('/', os.sep)), 'w', encoding='utf-8').write('<a/>')

    may = http.server.ThreadingHTTPServer(('127.0.0.1', CONG_WEB), functools.partial(ImLang, directory=web))
    threading.Thread(target=may.serve_forever, daemon=True).start()
    hoso = tempfile.mkdtemp(prefix='xmlpro-edge-')
    p = subprocess.Popen([EDGE, f'--remote-debugging-port={CONG}', '--headless', '--disable-gpu', '--no-first-run',
                          '--user-data-dir=' + hoso, 'about:blank'])
    try:
        for _ in range(40):
            try:
                tabs = json.loads(urllib.request.urlopen(f'http://127.0.0.1:{CONG}/json').read())
                tab = [t for t in tabs if t['type'] == 'page'][0]
                break
            except Exception:
                time.sleep(0.3)
        ws = websocket.create_connection(tab['webSocketDebuggerUrl'], timeout=90)
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
                    if ev('!!window.__xemXmlThue && !!window.SO_TAY && !!window.LAP_TO_KHAI') is True:
                        return
                except Exception:
                    pass
                time.sleep(0.25)
            raise RuntimeError('Trang không nạp được')

        cho_trang()
        nap = json.dumps([{'ten': t, 'url': f'/cu/{t}', 'relPath': f'cu/{t}', 'duongDan': 'C:\\cu\\' + t} for t in ten])
        nap5 = json.dumps(json.loads(nap)[:5])
        ev(f'''(async () => {{ window.chrome.webview.gui({{ loai: 'tep', nguon: 'chon', ds: {nap5} }});
              for (let i = 0; i < 60 && __xemXmlThue.docs.length < 5; i++) await new Promise(r => setTimeout(r, 100));
              await new Promise(r => setTimeout(r, 300)); __xemXmlThue.setMyMst('{MST}'); __xemXmlThue.moDashboard(); }})()''')

        print('=== 1. Ghi chú ===')
        r = ev('''(async () => { const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)];
          q('[data-so-hd]').click();
          const hop = q('#dlgSoHd'), o = qa('#dlgSoHd .st-gc');
          const dat = (e, v) => { e.value = v; e.dispatchEvent(new InputEvent('input', { bubbles: true })); };
          const dan = (e, t) => { const dt = new DataTransfer(); dt.setData('text/plain', t); e.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); };
          const ctrlD = e => { const k = new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, bubbles: true, cancelable: true }); e.dispatchEvent(k); return k.defaultPrevented; };
          const kq = { mo: hop.open, dong: o.length, dau: q('#stTieuDe').textContent };
          dat(o[0], 'Đã thanh toán');
          kq.ctrlD = ctrlD(o[1]); kq.sauCtrlD = o[1].value;
          dan(o[0], 'A\\r\\nB\\r\\nC\\r\\n'); kq.sauDan = o.slice(0, 3).map(x => x.value);
          qa('#dlgSoHd .st-chon').slice(0, 2).forEach(c => { c.checked = true; });
          q('#stNoiDung').value = 'Chờ hồ sơ'; q('#stApDung').click(); kq.sauHangLoat = o.slice(0, 3).map(x => x.value);
          kq.bao = q('#stBao').textContent;
          dat(o[1], 'B2');
          const hang = [...new Set(__xemXmlThue.docs.filter(d => d.kind === 'hd').map(d => window.SO_TAY.ghiChu(d)))];
          hop.close(); await new Promise(r => setTimeout(r, 200));
          __xemXmlThue.docs.forEach((d, i) => __xemXmlThue.select(i)); __xemXmlThue.moDashboard();
          kq.nhan = qa('.tag-pl.ghi').length; kq.hang = hang; return kq; })()''')
        danh_gia('Bấm số hoá đơn trên dòng kỳ mở bảng đủ dòng', r['mo'] and r['dong'] == 5, f"{r['dong']} dòng, {r['dau']}")
        danh_gia('Ctrl+D chép dòng trên xuống và chặn phím của trình duyệt', r['ctrlD'] and r['sauCtrlD'] == 'Đã thanh toán')
        danh_gia('Dán 3 dòng từ Excel điền dọc, bỏ dòng trống cuối', r['sauDan'] == ['A', 'B', 'C'], str(r['sauDan']))
        danh_gia('Ghi cho dòng đã chọn chỉ đụng dòng đã chọn', r['sauHangLoat'] == ['Chờ hồ sơ', 'Chờ hồ sơ', 'C'], str(r['sauHangLoat']))
        danh_gia('Danh sách bên trái gắn nhãn hoá đơn có ghi chú', r['nhan'] == 3, f"{r['nhan']} nhãn")

        ev('location.reload(); true'); time.sleep(1); cho_trang()
        nap_lai = f'''(async () => {{ window.chrome.webview.gui({{ loai: 'tep', nguon: 'chon', ds: {nap5} }});
              for (let i = 0; i < 60 && __xemXmlThue.docs.length < 5; i++) await new Promise(r => setTimeout(r, 100));
              await new Promise(r => setTimeout(r, 300)); __xemXmlThue.setMyMst('{MST}'); __xemXmlThue.moDashboard(); }})()'''
        ev(nap_lai)
        r = ev('__xemXmlThue.docs.filter(d => d.kind === "hd").map(d => window.SO_TAY.ghiChu(d)).filter(Boolean).sort()')
        danh_gia('Ghi chú còn nguyên sau khi tải lại app', r == sorted(['Chờ hồ sơ', 'B2', 'C']), str(r))

        print('=== 2. Excel: bảng kê có tiền, mẫu số, ghi chú ===')
        r = ev('''(async () => { let blob = null; const goc = URL.createObjectURL; URL.createObjectURL = b => { blob = b; return goc.call(URL, b); };
          await window.xuatExcel(__xemXmlThue.docs); URL.createObjectURL = goc;
          const z = await JSZip.loadAsync(blob), wb = await z.file('xl/workbook.xml').async('string');
          const ten = [...wb.matchAll(/<sheet name="([^"]+)"/g)].map(m => m[1]);
          const lay = async t => { const i = ten.findIndex(x => x.includes(t)); return i < 0 ? '' : z.file(`xl/worksheets/sheet${i + 1}.xml`).async('string'); };
          return { ten, ban: await lay('01-1'), mua: await lay('01-2') }; })()''')
        bk = cong_xml(glob.glob(os.path.join(web, 'cu', 'hd[1-5].xml')), MST)
        def tong_cot(xml, cot):
            return sum(float(m) for m in re.findall(rf'<c r="{cot}\d+"[^>]*><v>([\d.]+)</v>', xml))
        for nhan, tt, x in (('bán ra', 'ban', r['ban']), ('mua vào', 'mua', r['mua'])):
            if not bk[tt][2]:
                continue
            danh_gia(f'Bảng kê {nhan}: doanh số và thuế khớp Python đọc XML', x != '' and abs(tong_cot(x, 'I') - bk[tt][0]) < 1 and abs(tong_cot(x, 'J') - bk[tt][1]) < 1,
                     f"app {tong_cot(x, 'I'):,.0f} / {tong_cot(x, 'J'):,.0f}, Python {bk[tt][0]:,.0f} / {bk[tt][1]:,.0f}, {bk[tt][2]} HĐ")
        tat_ca = r['ban'] + r['mua']
        danh_gia('Bảng kê có cột Ghi chú mang nội dung người dùng', 'Chờ hồ sơ' in tat_ca and 'B2' in tat_ca)
        danh_gia('Bảng kê có Mẫu số (trước đây rỗng)', bool(re.search(r'<c r="B2"[^>]*>.*?\b1\b', tat_ca)))

        print('=== 3. Khoá sổ ===')
        r = ev('''(async () => { const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)];
          const kq = {}, A = __xemXmlThue, k = q('.ktt-dong-ky').dataset.ky; kq.ky = k;
          kq.coLap = !!q('.ktt-dong-ky [data-lap-tk], .ktt-dong-ky [data-khbs]');
          q('.ktt-dong-ky [data-khoa-so]').click(); await new Promise(r => setTimeout(r, 100));
          const d = q('.ktt-dong-ky');
          kq.nhan = d.innerText; kq.conLap = !!d.querySelector('[data-lap-tk], [data-khbs]'); kq.nut = d.querySelector('[data-khoa-so]').textContent;
          q('[data-so-hd]').click();
          const o = qa('#dlgSoHd .st-gc'); kq.khoaO = o.every(x => x.disabled);
          q('#stChonTat').checked = true; q('#stChonTat').dispatchEvent(new Event('change'));
          q('#stNoiDung').value = 'Không được ghi'; q('#stApDung').click(); kq.bao = q('#stBao').textContent;
          q('#dlgSoHd').close(); await new Promise(r => setTimeout(r, 100));
          const hd = A.docs.find(x => x.kind === 'hd');
          A.select(A.docs.indexOf(hd)); kq.oHd = q('[data-gc-hd]').disabled;
          kq.ghiChu = A.docs.filter(x => x.kind === 'hd').some(x => window.SO_TAY.ghiChu(x) === 'Không được ghi');
          return kq; })()''')
        danh_gia('Khoá sổ: dòng kỳ hiện Đã khoá sổ, nút đổi thành Mở khoá, không còn nút lập', 'Đã khoá sổ' in r['nhan'] and r['nut'] == 'Mở khoá' and not r['conLap'], f"kỳ {r['ky']}")
        danh_gia('Khoá sổ: ô ghi chú trong bảng và trong trang hoá đơn bị khoá', r['khoaO'] and r['oHd'])
        danh_gia('Khoá sổ: ghi hàng loạt bị bỏ qua, báo số dòng, không ghi vào sổ', 'bỏ qua 5' in r['bao'] and not r['ghiChu'], r['bao'])
        ky_khoa = ev("JSON.parse(localStorage.getItem('xmlpro.soTay.v1')).khoa['%s'][0].ky" % MST)
        nam, q_ = ky_khoa.split('-')
        r4 = ev('''(async () => { const q = s => document.querySelector(s); const A = __xemXmlThue; window.__baoTruoc.length = 0;
          A.moDlgLapTk({ mst: '%s', ky: { kieu: 'Q', quy: %d, nam: %s } }); await new Promise(r => setTimeout(r, 100));
          const xmlTruoc = A.docs.length; q('#ltLap').click(); await new Promise(r => setTimeout(r, 100));
          const kq = { bao: [...window.__baoTruoc], them: A.docs.length - xmlTruoc, conMo: q('#dlgLapTk').open };
          q('#dlgLapTk').close(); return kq; })()''' % (MST, int(q_[1:]), nam))
        danh_gia('Khoá sổ: bấm Lập tờ khai cho kỳ đã khoá bị chặn, không sinh tệp', r4['them'] == 0 and r4['conMo'] and any('đã khoá sổ' in b for b in r4['bao']), str(r4['bao'])[:120])

        print('=== 4. Cảnh báo thay đổi sau khoá sổ ===')
        r = ev(f'''(async () => {{ const q = s => document.querySelector(s), A = __xemXmlThue;
          A.moDashboard(); await new Promise(r => setTimeout(r, 100));
          const truoc = q('.ktt-dong-ky').innerText;
          window.chrome.webview.gui({{ loai: 'tep', nguon: 'chon', ds: {nap} }});
          for (let i = 0; i < 60 && A.docs.length < 6; i++) await new Promise(r => setTimeout(r, 100));
          await new Promise(r => setTimeout(r, 300)); A.moDashboard(); await new Promise(r => setTimeout(r, 100));
          return {{ truoc, sau: q('.ktt-dong-ky').innerText, tom: q('.ktt-dash').innerText.includes('kỳ đã khoá sổ có hoá đơn thay đổi') }}; }})()''')
        hd6 = cong_xml([os.path.join(web, 'cu', 'hd6.xml')], MST)
        co_hd6 = hd6['ban'][2] + hd6['mua'][2]
        danh_gia('Trước khi đổi: không cảnh báo', 'Sau khi khoá sổ' not in r['truoc'])
        if co_hd6:
            danh_gia('Nạp thêm hoá đơn vào kỳ đã khoá: Dashboard cảnh báo đúng số', 'thêm 1 hoá đơn' in r['sau'] and r['tom'], r['sau'].replace('\n', ' ')[:150])
        else:
            danh_gia('Hoá đơn thứ 6 không thuộc MST này: không cảnh báo nhầm', 'Sau khi khoá sổ' not in r['sau'], 'hd6 khác MST')
            r = ev(f'''(async () => {{ const q = s => document.querySelector(s), A = __xemXmlThue, ST = window.SO_TAY;
              const raw = JSON.parse(localStorage.getItem('xmlpro.soTay.v1')); const l = raw.khoa['{MST}'][0];
              const k0 = Object.keys(l.moc)[0]; delete l.moc[k0]; localStorage.setItem('xmlpro.soTay.v1', JSON.stringify(raw));
              A.moDashboard(); await new Promise(r => setTimeout(r, 100)); return {{ sau: q('.ktt-dong-ky').innerText, tom: q('.ktt-dash').innerText.includes('kỳ đã khoá sổ có hoá đơn thay đổi') }}; }})()''')
            danh_gia('Có hoá đơn ngoài mốc lúc khoá: Dashboard cảnh báo đúng số', 'thêm 1 hoá đơn' in r['sau'] and r['tom'], r['sau'].replace('\n', ' ')[:150])
        r = ev('''(async () => { const q = s => document.querySelector(s); q('.ktt-dong-ky [data-khoa-so]').click(); await new Promise(r => setTimeout(r, 100));
          q('[data-so-hd]').click(); const ok = [...document.querySelectorAll('#dlgSoHd .st-gc')].every(x => !x.disabled); q('#dlgSoHd').close();
          return { ok, chu: q('.ktt-dong-ky').innerText }; })()''')
        danh_gia('Mở khoá: ghi chú sửa được trở lại, hết nhãn khoá', r['ok'] and 'Đã khoá sổ' not in r['chu'])

        print('=== 5. Nối lại đường dẫn ===')
        ls = [{'p': 'C:\\cu\\chi-lich-su.xml', 't': 'x', 'k': 'hd', 'ky': '', 'ten': '', 'n': 1, 'l': ''},
              {'p': 'C:\\cu\\trung.xml', 't': 'x', 'k': 'hd', 'ky': '', 'ten': '', 'n': 1, 'l': ''}]
        ds_moi = [{'ten': os.path.basename(m), 'url': '/' + m, 'relPath': m, 'duongDan': 'D:\\' + m.replace('/', '\\')} for m in ten_moi.values()]
        ds_moi += [{'ten': os.path.basename(m), 'url': '/moi/' + m, 'relPath': 'moi/' + m, 'duongDan': 'D:\\moi\\' + m.replace('/', '\\')} for m in ('chi-lich-su.xml', 'trung.xml', 'con/trung.xml')]
        r = ev('''(async () => { const q = s => document.querySelector(s), A = __xemXmlThue;
          const ls0 = A.docLs(); localStorage.setItem('xemxmlthue.lichSu', JSON.stringify([...%s, ...ls0]));
          window.__dsMoi = %s; const gc0 = A.docs.filter(d => d.kind === 'hd').map(d => window.SO_TAY.ghiChu(d)).filter(Boolean).sort();
          q('#btnNoiLai').click(); await new Promise(r => setTimeout(r, 200));
          const tom0 = q('#nlTom').innerText, nut = !q('#nlChon').disabled;
          q('#nlChon').click(); for (let i = 0; i < 50 && !q('#nlTom').innerText.includes('Đã nối'); i++) await new Promise(r => setTimeout(r, 100));
          const gc1 = A.docs.filter(d => d.kind === 'hd').map(d => window.SO_TAY.ghiChu(d)).filter(Boolean).sort();
          return { tom0, nut, tom1: q('#nlTom').innerText, dd: A.docs.map(d => [d.fileName, d.duongDan, d.source]), ls: A.docLs().map(x => x.p), gcGiu: JSON.stringify(gc0) === JSON.stringify(gc1), con: [...q('#nlDs').querySelectorAll('div')].map(x => x.textContent), lenh: window.__lenh.filter(m => m.lenh !== 'sanSang' && m.lenh !== 'kiemCapNhat').map(m => m.lenh) }; })()''' % (json.dumps(ls), json.dumps(ds_moi)))
        danh_gia('Vỏ được hỏi đúng 1 lần và báo đủ tệp mất (6 tệp + 2 mục lịch sử)', '8 tệp không còn ở chỗ cũ' in r['tom0'] and r['nut'] and r['lenh'].count('kiemDuongDan') == 1, r['tom0'].replace('\n', ' '))
        dd = {a: b for a, b, _ in r['dd']}
        danh_gia('Tệp đổi tên nối theo nội dung', dd.get('hd1.xml') == 'D:\\moi\\doi-ten-roi.xml', dd.get('hd1.xml'))
        danh_gia('Tệp vào thư mục con nối đúng', dd.get('hd2.xml') == 'D:\\moi\\con\\hd2.xml', dd.get('hd2.xml'))
        danh_gia('Tệp không có ở thư mục mới giữ nguyên, vẫn báo mất', dd.get('hd6.xml') == 'C:\\cu\\hd6.xml' and 'C:\\cu\\hd6.xml' in r['con'])
        danh_gia('Mục chỉ có trong lịch sử: nối theo tên khi duy nhất, trùng tên thì không đoán',
                 'D:\\moi\\chi-lich-su.xml' in r['ls'] and 'C:\\cu\\trung.xml' in r['ls'], str([x for x in r['ls'] if 'trung' in x or 'lich' in x]))
        danh_gia('Báo kết quả đúng: 6 tệp, 5 theo nội dung, 1 theo tên, 1 trùng tên', 'Đã nối 6 tệp (5 theo nội dung, 1 theo tên), 1 tệp trùng tên' in r['tom1'], r['tom1'].split('\n')[0])
        danh_gia('Ghi chú không mất sau khi nối lại', r['gcGiu'])
    finally:
        p.kill()
        may.shutdown()
        shutil.rmtree(tam, ignore_errors=True)
        shutil.rmtree(hoso, ignore_errors=True)

    dat = sum(1 for _, d in ket_qua if d)
    print(f'\n=== KẾT QUẢ: ĐẠT {dat}/{len(ket_qua)} ===')
    sys.exit(0 if dat == len(ket_qua) else 1)


if __name__ == '__main__':
    main()
