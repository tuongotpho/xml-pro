# -*- coding: utf-8 -*-
"""
KIỂM THỬ SỬA LỖI v2.0.1 — mỗi mục có điều kiện BẮT BUỘC, sai là thoát mã lỗi 1.
Lỗi đo được ở báo cáo 01 (01-BAO-CAO-RA-SOAT-TOAN-DIEN-V2.md):
  A1 chữ ký số báo giả · A1 chưa kiểm chữ ký thật · A1 huy hiệu hiện trễ
  A2/A3 máy chủ nội bộ · A4 chữ Việt mất dấu · A5 .ps1 không đổi được tên có dấu
  B1 trung tâm cập nhật rỗng · B4 thiếu nút xoá dữ liệu phiên
Chạy:  python kiem-thu-sua-loi.py      (cần Edge, Python có lxml + websocket-client)
"""
import base64, glob, hashlib, json, os, re, shutil, subprocess, sys, tempfile, time, urllib.request
import websocket
from lxml import etree

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

APP = os.path.dirname(os.path.abspath(__file__))
MAU = os.path.join(APP, 'mau-xml')
CONG = 9251
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(EDGE):
    EDGE = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
DS = '{http://www.w3.org/2000/09/xmldsig#}'

ket_qua = []


def danh_gia(ten, dat, chi_tiet=''):
    ket_qua.append((ten, dat))
    print(('  [ĐẠT]  ' if dat else '  [HỎNG] ') + ten + (f'  — {chi_tiet}' if chi_tiet else ''))


# ---------- Tạo hoá đơn "giả mạo khéo": sửa tiền thuế rồi tính lại DigestValue ----------
def tao_hoa_don_gia_mao(duong_dan):
    cay = etree.parse(duong_dan)
    dl = cay.find('.//DLHDon')
    thue = dl.find('.//TgTThue')
    thue.text = str(int(float(thue.text)) + 1000)
    ma = dl.get('Id')
    c14n = etree.tostring(dl, method='c14n')
    for ref in cay.iter(DS + 'Reference'):
        if ref.get('URI') != '#' + ma:
            continue
        thuat_toan = ref.find(DS + 'DigestMethod').get('Algorithm')
        h = hashlib.sha256 if 'sha256' in thuat_toan else hashlib.sha1
        ref.find(DS + 'DigestValue').text = base64.b64encode(h(c14n).digest()).decode()
    return etree.tostring(cay, encoding='unicode')


def sua_mot_chu_so(van_ban):
    m = re.search(r'<TgTThue>(\d)', van_ban)
    return van_ban[:m.start(1)] + str((int(m.group(1)) + 1) % 10) + van_ban[m.end(1):]


# ---------- Windows .NET SignedXml: kiểm đủ vân tay + chữ ký RSA ----------
def kiem_bang_dotnet(cac_tep):
    ps = r'''
[Console]::OutputEncoding = [Text.Encoding]::UTF8
Add-Type -AssemblyName System.Security
$kq = @{}
foreach ($f in $args) {
  $x = New-Object System.Xml.XmlDocument; $x.PreserveWhitespace = $true; $x.Load($f)
  $ns = New-Object System.Xml.XmlNamespaceManager($x.NameTable); $ns.AddNamespace('ds','http://www.w3.org/2000/09/xmldsig#')
  $ds = @()
  foreach ($s in $x.SelectNodes('//ds:Signature', $ns)) {
    $sx = New-Object System.Security.Cryptography.Xml.SignedXml($x); $sx.LoadXml([System.Xml.XmlElement]$s)
    try { $ok = $sx.CheckSignature() } catch { $ok = $false }
    $ds += @{ ben = $s.ParentNode.LocalName; hopLe = [bool]$ok }
  }
  $kq[[IO.Path]::GetFileName($f)] = $ds
}
$kq | ConvertTo-Json -Depth 4 -Compress
'''
    tep_ps = os.path.join(tempfile.gettempdir(), 'xmlpro-kiem-dotnet.ps1')
    with open(tep_ps, 'w', encoding='utf-8-sig') as f:
        f.write(ps)
    out = subprocess.run(['powershell.exe', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', tep_ps] + cac_tep,
                         capture_output=True, text=True, encoding='utf-8')
    return json.loads(out.stdout)


def main():
    tam = tempfile.mkdtemp(prefix='xmlpro-test-')
    hd = sorted(glob.glob(os.path.join(MAU, 'hd_mau_*.xml')))
    van_ban = {os.path.basename(f): open(f, encoding='utf-8-sig').read() for f in hd}
    ten1 = os.path.basename(hd[0])
    tep_gia_mao = os.path.join(tam, 'gia-mao.xml')
    with open(tep_gia_mao, 'w', encoding='utf-8') as f:
        f.write(tao_hoa_don_gia_mao(hd[0]))
    tep_sua = os.path.join(tam, 'sua-1-chu-so.xml')
    with open(tep_sua, 'w', encoding='utf-8') as f:
        f.write(sua_mot_chu_so(van_ban[ten1]))

    print('=== 0. Mã nguồn ===')
    nguon = open(os.path.join(APP, 'index.html'), encoding='utf-8').read()
    host = open(os.path.join(APP, 'dong-goi', 'XemXmlThue.cs'), encoding='utf-8').read()
    # Chữ Việt bị ghi bằng bảng mã ANSI thành "?" : chữ?chữ (trừ "?t=" của địa chỉ), hoặc "??" dính chữ / dính thẻ
    hong = [i + 1 for i, d in enumerate(nguon.splitlines())
            if (re.search(r'[A-Za-z]\?[A-Za-z ]', d) and '?t=' not in d) or re.search(r'(?<![\s(])\?\?(?!\s)', d)
            or re.search(r'>\s*\?\s', d)]
    danh_gia('A4: index.html không còn dòng chữ Việt mất dấu', not hong, f'{len(hong)} dòng hỏng: {hong[:12]}')
    sot = [k for k in ('api/rename', 'api/poll', 'HttpListener') if k in nguon or k in host]
    danh_gia('A2/A3: không còn máy chủ nội bộ trong mã', not sot, 'còn: ' + ', '.join(sot) if sot else '')
    csp = re.search(r'Content-Security-Policy" content="([^"]+)"', nguon).group(1)
    danh_gia('A3: CSP chỉ cho kết nối nội bộ (connect-src \'self\')', "connect-src 'self';" in csp, csp.split('connect-src')[1].split(';')[0])

    print('=== 1. Windows .NET kiểm chữ ký (chuẩn đối chiếu) ===')
    net = kiem_bang_dotnet(hd + [tep_gia_mao, tep_sua])
    for k, v in net.items():
        print('   ', k[:34], ' '.join(f"{s['ben']}={s['hopLe']}" for s in v))

    hoso = tempfile.mkdtemp(prefix='xmlpro-edge-')
    p = subprocess.Popen([EDGE, f'--remote-debugging-port={CONG}', '--headless', '--disable-gpu', '--no-first-run',
                          '--user-data-dir=' + hoso, '--allow-file-access-from-files',
                          'file:///' + APP.replace('\\', '/') + '/index.html'])
    try:
        for _ in range(40):
            try:
                tabs = json.loads(urllib.request.urlopen(f'http://127.0.0.1:{CONG}/json').read())
                tab = [t for t in tabs if t['type'] == 'page' and 'index.html' in t['url']][0]
                break
            except Exception:
                time.sleep(0.3)
        ws = websocket.create_connection(tab['webSocketDebuggerUrl'], timeout=90)
        so = [0]

        def ev(bt):
            so[0] += 1
            ws.send(json.dumps({'id': so[0], 'method': 'Runtime.evaluate',
                                'params': {'expression': bt, 'returnByValue': True, 'awaitPromise': True}}))
            while True:
                r = json.loads(ws.recv())
                if r.get('id') == so[0]:
                    if 'exceptionDetails' in r['result']:
                        raise RuntimeError(json.dumps(r['result']['exceptionDetails'], ensure_ascii=False)[:400])
                    return r['result']['result'].get('value')

        for _ in range(40):
            if ev('!!window.__xemXmlThue') is True:
                break
            time.sleep(0.3)
        ev('window.confirm = () => true; window.alert = () => {}; true')
        J = json.dumps

        def chu_ky_app(ten, vb):
            return ev('''(async () => { const A = window.__xemXmlThue; const i = A.addText(%s, %s, 'kt/' + %s);
              await new Promise(r => setTimeout(r, 2500)); const d = A.docs[i];
              return [d.kyBan, d.kyCqt].filter(Boolean).map(s => ({ verified: s.verified === true, tampered: s.tampered === true })); })()'''
                      % (J(vb), J(ten), J(ten)))

        print('=== 2. Chữ ký số trong app ===')
        khop = 0; tong = 0; hop_le = 0
        for f in hd:
            ten = os.path.basename(f)
            app = chu_ky_app(ten, van_ban[ten])
            for a, n in zip(app, net[ten]):
                tong += 1; hop_le += a['verified']; khop += (a['verified'] == n['hopLe'] and a['tampered'] != n['hopLe'])
        danh_gia('A1: 6 hoá đơn thật → 12/12 chữ ký hợp lệ', hop_le == 12 and tong == 12, f'{hop_le}/{tong} hợp lệ')
        danh_gia('A1: app khớp Windows .NET trên 12 chữ ký', khop == 12, f'{khop}/12 khớp')
        app = chu_ky_app('sua.xml', open(tep_sua, encoding='utf-8').read())
        danh_gia('A1: sửa 1 chữ số tiền thuế → bị bắt', all(a['tampered'] for a in app) and len(app) == 2, J(app))
        app = chu_ky_app('gia-mao.xml', open(tep_gia_mao, encoding='utf-8').read())
        dn = [s['hopLe'] for s in net['gia-mao.xml']]
        danh_gia('A1: sửa tiền + tính lại vân tay (giả mạo khéo) → bị bắt', all(a['tampered'] for a in app) and len(app) == 2 and not any(dn),
                 f'app={J(app)} · .NET={dn}')

        r = ev('''(async () => { const A = window.__xemXmlThue; const i = A.addText(%s, 'huy-hieu.xml', 'kt/huy-hieu'); A.select(i);
              await new Promise(r => setTimeout(r, 2000));
              return [...document.querySelectorAll('.sig-v-badge')].map(e => e.className + ':' + e.textContent); })()''' % J(van_ban[ten1]))
        danh_gia('A1: huy hiệu "hợp lệ" hiện trong 2 giây, không cần bấm lại tab',
                 len([x for x in r if ' ok:' in x]) == 2, J(r, ensure_ascii=False))

        print('=== 3. Giao diện ===')
        r = ev('''(() => { const b = document.getElementById('btnToggleDark'); return b ? b.textContent.trim() : null; })()''')
        danh_gia('A4: nút sáng/tối có biểu tượng thật (không phải "??")', bool(r) and '?' not in r, J(r, ensure_ascii=False))
        r = ev('''(() => ({ capNhat: !!document.getElementById('btnMoCapNhat') || !!document.getElementById('dlgCapNhat'),
                           doiTenTrucTiep: !!document.getElementById('btnDoiTenTrucTiep'),
                           xoaPhien: !!document.getElementById('btnXoaPhien') }))()''')
        danh_gia('B1: đã gỡ Trung tâm cập nhật', not r['capNhat'])
        danh_gia('A3: đã gỡ nút Đổi tên trực tiếp (dùng máy chủ)', not r['doiTenTrucTiep'])
        danh_gia('B4: có nút Xoá dữ liệu phiên', r['xoaPhien'])
        if r['xoaPhien']:
            r = ev('''(async () => { const A = window.__xemXmlThue; await A.luuPhienIndexedDb();
                  try { localStorage.setItem('xemxmlthue.lichSu', '[{"ten":"x"}]'); } catch (e) {}
                  document.getElementById('btnXoaPhien').click(); await new Promise(r => setTimeout(r, 800));
                  const db = await A.moIndexedDB();
                  const dem = await new Promise(r => { const q = db.transaction('phienLamViec').objectStore('phienLamViec').count(); q.onsuccess = () => r(q.result); });
                  return { banGhiPhien: dem, lichSu: localStorage.getItem('xemxmlthue.lichSu') }; })()''')
            danh_gia('B4: bấm Xoá → IndexedDB rỗng, lịch sử rỗng', r['banGhiPhien'] == 0 and not r['lichSu'], J(r))

        print('=== 3b. Tờ khai / BCTC nhiều biểu: mở từng thẻ như iTax Viewer (báo cáo 04) ===')
        ev('''window.__loi = []; addEventListener('error', e => __loi.push(e.message));
              addEventListener('unhandledrejection', e => __loi.push(String(e.reason))); true''')
        for ten_mau in ('mau-bctc-tt200.xml', 'mau-bctc-tt99.xml'):
            vb = open(os.path.join(MAU, ten_mau), encoding='utf-8-sig').read()
            r = ev('''(async () => { const A = window.__xemXmlThue; const i = A.addText(%s, %s, 'the/' + %s); A.select(i);
                  const choLucDau = !!document.querySelector('.itax-cho');
                  for (let k = 0; k < 200 && !A.docs[i]._itaxDone; k++) await new Promise(r => setTimeout(r, 50));
                  await new Promise(r => setTimeout(r, 100));
                  const d = A.docs[i], sh = d._itaxSheets || [];
                  const the = [...document.querySelectorAll('.itax-tabs button')];
                  const kq = { choLucDau, soBieu: sh.length, duPhong: sh.filter(s => s.duPhong).length, soNut: the.length,
                               bieuHien: document.querySelectorAll('.itax-sheet').length };
                  if (the[1]) { the[1].click(); await new Promise(r => setTimeout(r, 100)); }
                  kq.sauBamThe2 = { dangChon: document.querySelector('.itax-tabs button.on')?.dataset.sh, bieuHien: document.querySelectorAll('.itax-sheet').length };
                  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', ctrlKey: true, bubbles: true }));
                  await new Promise(r => setTimeout(r, 100));
                  kq.sauCtrlPgDn = document.querySelector('.itax-tabs button.on')?.dataset.sh;
                  d._inTatCa = true; A.select(i); kq.inTatCa = document.querySelectorAll('.itax-sheet').length; d._inTatCa = false; A.select(i);
                  const sht = document.querySelector('.itax-sheet'), main = document.getElementById('main');
                  kq.vuaKhung = Math.round(sht.getBoundingClientRect().width) <= main.clientWidth;
                  return kq; })()''' % (J(vb), J(ten_mau), J(ten_mau)))
            dat = (r['choLucDau'] and r['soBieu'] >= 3 and r['duPhong'] == 0 and r['soNut'] == r['soBieu'] and r['bieuHien'] == 1
                   and r['sauBamThe2'] == {'dangChon': '1', 'bieuHien': 1} and r['sauCtrlPgDn'] == '2'
                   and r['inTatCa'] == r['soBieu'] and r['vuaKhung'])
            danh_gia(f'iTax: {ten_mau} — đủ biểu chuẩn mẫu, 1 thẻ / lần, bấm thẻ + Ctrl+PgDn, in tất cả, vừa khung', dat, J(r))
        r = ev('window.__loi')
        danh_gia('iTax: không có lỗi JavaScript khi dựng biểu (lỗi "ITAX is not defined" của 2.0.0)', not r, J(r, ensure_ascii=False))

        # Chế độ tối: chữ trên nút / bảng ngoài tờ giấy phải đọc được (tương phản >= 3:1)
        r = ev(r'''(async () => { const A = window.__xemXmlThue;
              const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
              const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
              const nen = el => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== 'none') return null;
                  const c = rgb(cs.backgroundColor); if (c.length >= 3 && (c.length < 4 || c[3] > .5)) return c; } return [255, 255, 255]; };
              const st = document.createElement('style'); st.textContent = '*{transition:none!important}'; document.head.appendChild(st);
              A.apDungTheme('dark'); const loi = [];
              for (const i of [A.docs.length - 1, -2]) { A.select(i); await new Promise(r => setTimeout(r, 400));
                document.querySelectorAll('body *').forEach(el => {
                  if (!el.offsetParent || el.closest('.itax-sheet, .paper, dialog') || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
                  const b = nen(el); if (!b) return; const a = lum(rgb(getComputedStyle(el).color)), c = lum(b);
                  const tl = (Math.max(a, c) + .05) / (Math.min(a, c) + .05);
                  if (tl < 3) loi.push(tl.toFixed(1) + ' ' + el.tagName + '.' + el.className + ' "' + el.textContent.trim().slice(0, 20) + '"'); }); }
              A.apDungTheme('light'); st.remove(); return [...new Set(loi)]; })()''')
        danh_gia('Giao diện tối: không còn chữ khó đọc (tương phản < 3:1) ở danh sách, thẻ, Dashboard', not r, J(r[:8], ensure_ascii=False))

        print('=== 4. Script đổi tên .ps1 với tên file tiếng Việt có dấu ===')
        r = ev('''(async () => { const A = window.__xemXmlThue; const i = A.addText(%s, %s, 'kt/ps1');
              let blob = null; const goc = URL.createObjectURL; URL.createObjectURL = b => { blob = b; return goc.call(URL, b); };
              A.moDlgDoiTen(); document.querySelectorAll('.chk-dt-row').forEach(c => c.checked = Number(c.dataset.idx) === i);
              document.getElementById('btnExportPs1').click(); URL.createObjectURL = goc;
              document.getElementById('dlgDoiTen').close();
              const u = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (const x of u) s += String.fromCharCode(x);
              return btoa(s); })()''' % (J(van_ban[ten1]), J(ten1)))
        noi_dung = base64.b64decode(r)
        danh_gia('A5: tệp .ps1 có BOM UTF-8', noi_dung[:3] == b'\xef\xbb\xbf')
        thu = os.path.join(tam, 'doi-ten'); os.makedirs(thu)
        shutil.copy(hd[0], os.path.join(thu, ten1))
        with open(os.path.join(thu, 'doi-ten-hoa-don.ps1'), 'wb') as f:
            f.write(noi_dung)
        subprocess.run(['powershell.exe', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'doi-ten-hoa-don.ps1'],
                       cwd=thu, capture_output=True, input='\n', text=True, timeout=60)
        con = sorted(os.listdir(thu))
        danh_gia('A5: chạy thật bằng PowerShell 5.1 → tệp tên có dấu được đổi', ten1 not in con and len(con) == 2, J(con, ensure_ascii=False))
    finally:
        p.kill()
        shutil.rmtree(tam, ignore_errors=True)

    dat = sum(1 for _, d in ket_qua if d)
    print(f'\n=== KẾT QUẢ: ĐẠT {dat}/{len(ket_qua)} ===')
    sys.exit(0 if dat == len(ket_qua) else 1)


if __name__ == '__main__':
    main()
