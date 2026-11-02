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


def cong_hoa_don(cac_tep, mst, tu, den):
    """Phép cộng ĐỘC LẬP với app (đọc XML bằng ElementTree): giá trị / thuế mua vào, bán ra theo thuế suất trong kỳ."""
    kq = {'mua_V': 0, 'mua_T': 0, 'ban': {}, 'pl_mua': {}, 'pl_ban': {}, 'hd': []}
    for f in cac_tep:
        dl = etree.parse(f).getroot().find('DLHDon')
        t = lambda p: (dl.findtext(p) or '').strip()
        ngay = t('TTChung/NLap')
        if not (tu <= ngay <= den):
            continue
        V, T = float(t('NDHDon/TToan/TgTCThue') or 0), float(t('NDHDon/TToan/TgTThue') or 0)
        lts = [(l.findtext('TSuat'), float(l.findtext('ThTien') or 0), float(l.findtext('TThue') or 0)) for l in dl.findall('NDHDon/TToan/THTTLTSuat/LTSuat')]
        if t('NDHDon/NMua/MST') == mst:
            kq['mua_V'] += V; kq['mua_T'] += T
            for ts, v, tx in lts:
                if ts == '8%':
                    g = kq['pl_mua'].setdefault(t('NDHDon/NBan/Ten'), [0, 0]); g[0] += v; g[1] += tx
        elif t('NDHDon/NBan/MST') == mst:
            for ts, v, tx in lts:
                g = kq['ban'].setdefault(ts, [0, 0]); g[0] += v; g[1] += tx
                if ts == '8%':
                    kq['pl_ban'][t('NDHDon/NMua/Ten')] = kq['pl_ban'].get(t('NDHDon/NMua/Ten'), 0) + v
            kq['hd'].append((f, t('TTChung/KHHDon') + '-' + t('TTChung/SHDon'), lts))
    return kq


def to_khai_gtgt(mst, ten, kieu, ky, tu_vn, den_vn, ct, pl_mua, pl_ban):
    """Dựng tờ khai 01/GTGT (TT80, mã 842) tối giản để kiểm phần đối chiếu."""
    dong = ''.join(f'<{k}>{int(round(v))}</{k}>' for k, v in ct.items())
    mua = ''.join(f'<BangKeTenHHDV ID="ID_{i}"><tenHHDVMuaVao>{tn}</tenHHDVMuaVao><giaTriHHDVMuaVao>{int(v[0])}</giaTriHHDVMuaVao><thueGTGTHHDV>{int(v[1])}</thueGTGTHHDV></BangKeTenHHDV>'
                  for i, (tn, v) in enumerate(pl_mua.items(), 1))
    ban = ''.join(f'<BangKeTenHHDV ID="ID_{i}"><tenHHDV>{tn}</tenHHDV><giaTriHHDV>{int(v)}</giaTriHHDV><thueSuatTheoQuyDinh>10</thueSuatTheoQuyDinh><thueSuatSauGiam>8</thueSuatSauGiam><thueGTGTDuocGiam>{round(v * 0.02)}</thueGTGTDuocGiam></BangKeTenHHDV>'
                  for i, (tn, v) in enumerate(pl_ban.items(), 1))
    return ('<?xml version="1.0" encoding="UTF-8"?><HSoThueDTu xmlns="http://kekhaithue.gdt.gov.vn/TKhaiThue"><HSoKhaiThue><TTinChung><TTinTKhaiThue>'
            '<TKhaiThue><maTKhai>842</maTKhai><tenTKhai>TỜ KHAI THUẾ GIÁ TRỊ GIA TĂNG (Mẫu số 01/GTGT)</tenTKhai><pbanTKhaiXML>2.5.1</pbanTKhaiXML><loaiTKhai>C</loaiTKhai><soLan>0</soLan>'
            f'<KyKKhaiThue><kieuKy>{kieu}</kieuKy><kyKKhai>{ky}</kyKKhai><kyKKhaiTuNgay>{tu_vn}</kyKKhaiTuNgay><kyKKhaiDenNgay>{den_vn}</kyKKhaiDenNgay></KyKKhaiThue></TKhaiThue>'
            f'<NNT><mst>{mst}</mst><tenNNT>{ten}</tenNNT></NNT></TTinTKhaiThue></TTinChung>'
            f'<CTieuTKhaiChinh>{dong}</CTieuTKhaiChinh>'
            f'<PLuc><PL_NQ142_GTGT><HH_DV_MuaVaoTrongKy>{mua}</HH_DV_MuaVaoTrongKy><HH_DV_BanRaTrongKy>{ban}</HH_DV_BanRaTrongKy></PL_NQ142_GTGT></PLuc>'
            '</HSoKhaiThue></HSoThueDTu>')


def kiem_doi_chieu(ev, J, hd):
    print('=== 5. Đối chiếu tờ khai 01/GTGT ↔ hoá đơn ↔ giấy nộp tiền (báo cáo 05) ===')
    ev('location.reload(); true')
    time.sleep(1.5)
    for _ in range(40):
        try:
            if ev('!!window.__xemXmlThue && !!window.DOI_CHIEU') is True:
                break
        except Exception:
            pass
        time.sleep(0.3)
    MST = '2601102955'
    kq = cong_hoa_don(hd, MST, '2026-10-01', '2026-10-31')
    v8 = sum(v for ts, (v, _) in kq['ban'].items() if ts in ('8%', '10%'))
    t8 = sum(t for ts, (_, t) in kq['ban'].items() if ts in ('8%', '10%'))
    giam = sum(round(v * 0.02) for v in kq['pl_ban'].values())
    ct = {'ct22': 0, 'ct23': kq['mua_V'], 'ct24': kq['mua_T'], 'ct23a': 0, 'ct24a': 0, 'ct25': kq['mua_T'], 'ct26': 0, 'ct27': v8, 'ct28': t8, 'ct29': 0,
          'ct30': 0, 'ct31': 0, 'ct32': v8, 'ct33': t8, 'ct32a': 0, 'ct34': v8, 'ct35': t8, 'ct36': t8 - kq['mua_T'], 'ct37': 0, 'ct38': 0, 'ct39a': 0,
          'ct40a': max(t8 - kq['mua_T'], 0), 'ct40b': 0, 'ct40': max(t8 - kq['mua_T'], 0), 'ct41': 0, 'ct42': 0, 'ct43': 0}
    assert abs(round(v8 * 0.1) - giam - t8) <= 5, 'mẫu hoá đơn không còn đúng 8% — sửa lại test'
    tk_dung = to_khai_gtgt(MST, 'Công ty mẫu', 'M', '10/2026', '01/10/2026', '31/10/2026', ct, kq['pl_mua'], kq['pl_ban'])
    # Ca lệch: kế toán quên 1 hoá đơn bán ra
    f_quen, so_quen, lts_quen = kq['hd'][2]
    v_q = sum(v for _, v, _ in lts_quen); t_q = sum(t for _, _, t in lts_quen)
    ct2 = dict(ct, ct27=v8 - v_q, ct28=t8 - t_q, ct32=v8 - v_q, ct33=t8 - t_q, ct34=v8 - v_q, ct35=t8 - t_q,
               ct36=t8 - t_q - kq['mua_T'], ct40a=t8 - t_q - kq['mua_T'], ct40=t8 - t_q - kq['mua_T'])
    tk_quen = to_khai_gtgt(MST, 'Công ty mẫu', 'M', '10/2026', '01/10/2026', '31/10/2026', ct2, kq['pl_mua'], kq['pl_ban'])
    r = ev('''(async () => { const A = window.__xemXmlThue, DC = window.DOI_CHIEU;
          for (const [ten, vb] of %s) A.addText(vb, ten, 'dc/' + ten);
          const iDung = A.addText(%s, 'tk-dung.xml', 'dc/tk-dung'), iQuen = A.addText(%s, 'tk-quen.xml', 'dc/tk-quen');
          const kq = DC.tinh(A.docs), f = i => kq.find(k => k.tkIdx === i);
          const tom = k => ({ trangThai: k.trangThai, mua: k.soMua, ban: k.soBan, lech: k.dong.filter(r => !r.khop).map(r => r.ma),
                              goiY: k.dong.flatMap(r => r.goiY.map(g => g.text)), plSai: k.phuLuc.filter(r => !r.khop).length, soPl: k.phuLuc.length,
                              noiBoSai: k.noiBo.filter(r => !r.khop).length, soNoiBo: k.noiBo.length });
          A.select(iDung); await new Promise(r => setTimeout(r, 300));
          A.select(iQuen);
          for (let n = 0; n < 200 && !A.docs[iQuen]._itaxDone; n++) await new Promise(r => setTimeout(r, 50));
          await new Promise(r => setTimeout(r, 300));
          const panel = document.querySelector('.dc-panel');
          A.select(-2); await new Promise(r => setTimeout(r, 300));
          return { dung: tom(f(iDung)), quen: tom(f(iQuen)), coKhungTrenToKhai: !!panel, khungMo: !!(panel && panel.open),
                   dashboard: document.querySelectorAll('.ktt-dong-ky [data-mo-doc]').length,
                   nhan: [...document.querySelectorAll('#list .tag-pl')].map(e => e.textContent).filter(t => /HĐ/.test(t)) }; })()'''
           % (J([[os.path.basename(f), open(f, encoding='utf-8-sig').read()] for f in hd]), J(tk_dung), J(tk_quen)))
    d, q = r['dung'], r['quen']
    danh_gia('Đối chiếu: tờ khai đúng (tháng 10/2026) → KHỚP mọi chỉ tiêu, phụ lục, công thức',
             d['trangThai'] == 'khop' and d['mua'] == 2 and d['ban'] == 4 and d['plSai'] == 0 and d['soPl'] == 2 and d['noiBoSai'] == 0 and d['soNoiBo'] >= 10, J(d, ensure_ascii=False))
    danh_gia(f'Đối chiếu: tờ khai quên 1 HĐ bán ra → LỆCH [32]–[35], chỉ đích danh HĐ {so_quen}',
             q['trangThai'] == 'lech' and {'[32]', '[33]', '[34]', '[35]'} <= set(q['lech']) and any(so_quen in g and 'chưa kê' in g for g in q['goiY']), J(q, ensure_ascii=False))
    danh_gia('Đối chiếu: khung trên tờ khai (tự mở khi lệch), thẻ kỳ trên Dashboard mở được tờ khai, nhãn KHỚP/LỆCH ở danh sách',
             r['coKhungTrenToKhai'] and r['khungMo'] and r['dashboard'] >= 1 and 'KHỚP HĐ' in r['nhan'] and any(t.startswith('LỆCH HĐ') for t in r['nhan']), J(r['nhan'] + [r['dashboard']], ensure_ascii=False))

    # Dữ liệu thật (thư mục HD-TK chỉ có trên máy anh, không đưa lên git): quý 3/2026 + giấy nộp tiền + zip hoá đơn
    that = os.path.join(APP, 'HD-TK')
    if not os.path.isdir(that):
        that = os.environ.get('XMLPRO_HD_TK', that)  # thư mục dữ liệu thật ở chỗ khác (vd thư mục làm việc khác của cùng kho)
    if not os.path.isdir(that):
        print('  [BỎ QUA] Không có thư mục HD-TK (dữ liệu thật) trên máy này')
        return
    tep = [os.path.join(that, f) for f in sorted(os.listdir(that)) if f.lower().endswith(('.xml', '.zip'))]
    ev('location.reload(); true'); time.sleep(1.5)
    for _ in range(40):
        try:
            if ev('!!window.__xemXmlThue && !!window.DOI_CHIEU') is True:
                break
        except Exception:
            pass
        time.sleep(0.3)
    r = ev('''(async () => { const A = window.__xemXmlThue;
          const files = %s.map(([ten, b]) => { const s = atob(b), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new File([u], ten); });
          await A.addFiles(files);
          return window.DOI_CHIEU.tinh(A.docs).map(k => ({ ky: k.tk.kyTen, trangThai: k.trangThai, mua: k.soMua, ban: k.soBan, soLech: k.soLech,
             daNop: k.daNop && k.daNop.khop, dong: k.dong.filter(r => r.toKhai || r.hoaDon).map(r => r.ma + (r.khop ? '✔' : '✖')).join(' ') })); })()'''
           % J([[os.path.basename(f), base64.b64encode(open(f, 'rb').read()).decode()] for f in tep]))
    # Quý 3/2026 đã kiểm tay: khớp hoá đơn và có giấy nộp tiền. Các tờ khai khác trong HD-TK có thể lệch thật
    # (báo cáo 07, mục B) — chỉ yêu cầu đối chiếu chạy được và liệt kê kết quả.
    q3 = [k for k in r if k['ky'] == 'Quý 3/2026']
    danh_gia('Đối chiếu dữ liệu thật HD-TK: quý 3/2026 khớp hoá đơn và đã nộp đủ [40]; các kỳ khác đều đối chiếu được',
             len(q3) == 1 and q3[0]['trangThai'] == 'khop' and q3[0]['daNop'] and all(k['trangThai'] in ('khop', 'lech') for k in r),
             J(r, ensure_ascii=False))


def nap_lai_trang(ev):
    ev('location.reload(); true')
    time.sleep(1.5)
    for _ in range(40):
        try:
            if ev('!!window.__xemXmlThue && !!window.LAP_TO_KHAI') is True:
                return
        except Exception:
            pass
        time.sleep(0.3)


def kiem_lap_to_khai(ev, J, hd):
    print('=== 6. Lập tờ khai 01/GTGT tháng / quý từ hoá đơn (báo cáo 06) ===')
    nap_lai_trang(ev)
    MST = '2601102955'
    kq = cong_hoa_don(hd, MST, '2026-10-01', '2026-10-31')
    v8 = sum(v for ts, (v, _) in kq['ban'].items() if ts in ('8%', '10%'))
    giam = sum(round(v * 0.02) for v in kq['pl_ban'].values())
    mong = {'ct23': round(kq['mua_V']), 'ct24': round(kq['mua_T']), 'ct32': round(v8), 'ct33': round(v8 * 0.1) - giam,
            'ct32a': round(sum(v for ts, (v, _) in kq['ban'].items() if ts == 'KKKNT'))}
    r = ev('''(async () => { const A = window.__xemXmlThue, L = window.LAP_TO_KHAI;
          for (const [ten, vb] of %s) A.addText(vb, ten, 'lt/' + ten);
          const ky = { kieu: 'M', thang: 10, nam: 2026 };
          const k = L.tinhGTGT(A.docs, '%s', ky, { ct22: 1000 });
          const xml = L.xmlGTGT(k, ky, L.thongTinDN(A.docs, '%s'), '2026-11-02'), ten = L.tenFile(ky, '%s');
          const i = A.addText(xml, ten, 'lt/' + ten); A.select(i);
          for (let n = 0; n < 200 && !A.docs[i]._itaxDone; n++) await new Promise(r => setTimeout(r, 50));
          const dc = window.DOI_CHIEU.choToKhai(A.docs, A.docs[i]);
          document.getElementById('btnLapTk').click(); await new Promise(r => setTimeout(r, 300));
          const hop = { mo: document.getElementById('dlgLapTk').open, mst: document.getElementById('ltMst').value, dem: document.getElementById('ltDem').textContent };
          document.getElementById('dlgLapTk').close();
          return { ct: k.ct, mua: k.mua.length, ban: k.ban.length, plMua: k.plMua.length, plBan: k.plBan.length, canhBao: k.canhBao.map(c => c.noiDung),
                   ten, kind: A.docs[i].kind, bieu: (A.docs[i]._itaxSheets || []).length, duPhong: (A.docs[i]._itaxSheets || []).filter(s => s.duPhong).length,
                   doiChieu: dc && dc.trangThai, kyDoc: dc && dc.tk.kyTen, hop }; })()''' % (J([[os.path.basename(f), open(f, encoding='utf-8-sig').read()] for f in hd]), MST, MST, MST))
    c = r['ct']
    dung_so = all(c[k] == v for k, v in mong.items())
    # [22] = 1000 nhập tay → [36] − [22] → [40]
    dung_cong_thuc = c['ct25'] == c['ct24'] and c['ct34'] == c['ct26'] + c['ct27'] and c['ct36'] == c['ct35'] - c['ct25'] and c['ct40'] == max(c['ct36'] - 1000, 0)
    danh_gia('Lập tờ khai THÁNG 10/2026 từ 6 HĐ mẫu: số liệu đúng phép cộng Python độc lập, công thức đúng',
             dung_so and dung_cong_thuc and r['mua'] == 2 and r['ban'] == 4 and r['plMua'] == 1 and r['plBan'] == 1,
             J({k: (c[k], v) for k, v in mong.items()}, ensure_ascii=False) + ' ' + J(r['canhBao'], ensure_ascii=False))
    danh_gia('Tờ khai lập ra: tên tệp kiểu HTKK, mở được bằng mẫu iTax, app tự đối chiếu → KHỚP',
             r['ten'] == f'{MST}000-01_GTGT_TT80-M102026-L00.xml' and r['kind'] == 'tk' and r['bieu'] >= 2 and r['duPhong'] == 0
             and r['doiChieu'] == 'khop' and r['kyDoc'] == 'Tháng 10/2026', J({k: r[k] for k in ('ten', 'bieu', 'duPhong', 'doiChieu', 'kyDoc')}, ensure_ascii=False))
    danh_gia('Hộp thoại "Lập tờ khai 01/GTGT" mở, tự chọn đúng MST, đếm hoá đơn trong kỳ',
             r['hop']['mo'] and r['hop']['mst'] == MST and 'hoá đơn mua vào' in r['hop']['dem'], J(r['hop'], ensure_ascii=False))

    that = os.path.join(APP, 'HD-TK')
    if not os.path.isdir(that):
        that = os.environ.get('XMLPRO_HD_TK', that)  # thư mục dữ liệu thật ở chỗ khác (vd thư mục làm việc khác của cùng kho)
    if not os.path.isdir(that):
        print('  [BỎ QUA] Không có thư mục HD-TK (dữ liệu thật) trên máy này')
        return
    nap_lai_trang(ev)
    tep = {f: os.path.join(that, f) for f in os.listdir(that)}
    zipf = [f for f in tep if f.lower().endswith('.zip')]
    # Chỉ so từng ô với tờ khai KHỚP hoá đơn (quý 3/2026); tờ khai lệch thật thì lập lại tất nhiên khác (báo cáo 07)
    tkf = [f for f in tep if f.lower().endswith('.xml') and '<kyKKhai>3/2026</kyKKhai>' in open(tep[f], encoding='utf-8-sig', errors='ignore').read()
           and '<maTKhai>842</maTKhai>' in open(tep[f], encoding='utf-8-sig', errors='ignore').read()]
    r = ev('''(async () => { const A = window.__xemXmlThue, L = window.LAP_TO_KHAI;
          const mk = ([ten, b]) => { const s = atob(b), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new File([u], ten); };
          await A.addFiles(%s.map(mk));
          const that = %s, x = new DOMParser().parseFromString(that.replace(/^\\uFEFF/, ''), 'application/xml');
          const g = t => (x.getElementsByTagNameNS('*', t)[0]?.textContent || '').trim();
          const mst = g('mst'), q = /^(\\d)\\/(\\d{4})$/.exec(g('kyKKhai')), ky = { kieu: 'Q', quy: +q[1], nam: +q[2] };
          const k = L.tinhGTGT(A.docs, mst, ky, { ct22: Number(g('ct22')) || 0 });
          A.addText(that, 'that.xml', 'lt/that');
          const moi = L.xmlGTGT(k, ky, L.thongTinDN(A.docs, mst), g('ngayLapTKhai'));
          const la = s => { const d = new DOMParser().parseFromString(s.replace(/^\\uFEFF/, ''), 'application/xml'), o = [];
            const di = (e, p) => { const c = [...e.children], pp = p + '/' + e.localName; if (!c.length) o.push(pp + '=' + e.textContent.trim()); else c.forEach(z => di(z, pp)); };
            di(d.documentElement, ''); return o.sort(); };
          const a = la(that), b = la(moi);
          return { ky: g('kyKKhai'), soO: a.length, chiTrongThat: a.filter(v => !b.includes(v)), chiTrongBanLap: b.filter(v => !a.includes(v)) }; })()'''
           % (J([[f, base64.b64encode(open(tep[f], 'rb').read()).decode()] for f in zipf]), J(open(tep[tkf[0]], encoding='utf-8-sig').read())))
    danh_gia(f'Lập lại tờ khai thật quý {r["ky"]} từ hoá đơn (HD-TK): trùng {r["soO"]}/{r["soO"]} ô dữ liệu với tờ khai đã nộp',
             not r['chiTrongThat'] and not r['chiTrongBanLap'] and r['soO'] > 100, J(r, ensure_ascii=False)[:600])


def cong_ca_zip(duong_dan_zip, mst):
    """Phép cộng ĐỘC LẬP cả năm từ zip hoá đơn: loại HĐ gốc đã có HĐ thay thế (TTHDLQuan, TCHDon = 1)."""
    import zipfile
    z = zipfile.ZipFile(duong_dan_zip)
    hds = []
    for n in z.namelist():
        if not n.lower().endswith('.xml'):
            continue
        dl = etree.fromstring(z.read(n)).find('DLHDon')
        t = lambda p: (dl.findtext(p) or '').strip()
        hds.append({'kh': t('TTChung/KHHDon'), 'so': t('TTChung/SHDon'), 'tc': t('TTChung/TTHDLQuan/TCHDon'),
                    'goc': t('TTChung/TTHDLQuan/KHHDCLQuan') + '-' + t('TTChung/TTHDLQuan/SHDCLQuan'),
                    'ban': t('NDHDon/NBan/MST'), 'mua': t('NDHDon/NMua/MST'),
                    'V': float(t('NDHDon/TToan/TgTCThue') or 0), 'T': float(t('NDHDon/TToan/TgTThue') or 0)})
    bi_thay = {h['goc'] for h in hds if h['tc'] == '1'}
    con = [h for h in hds if h['kh'] + '-' + h['so'] not in bi_thay]
    return {'banV': round(sum(h['V'] for h in con if h['ban'] == mst)), 'muaV': round(sum(h['V'] for h in con if h['mua'] == mst)),
            'muaT': round(sum(h['T'] for h in con if h['mua'] == mst)), 'biThay': len(bi_thay)}


def kiem_dashboard(ev, J, hd):
    print('=== 7. Dashboard kế toán mới (ghép "Việc cần làm" + "Sổ sách", báo cáo 08) ===')
    nap_lai_trang(ev)
    MST = '2601102955'
    kq = cong_hoa_don(hd, MST, '2026-10-01', '2026-10-31')
    ban_v = round(sum(v for ts, (v, _) in kq['ban'].items()))
    r = ev('''(async () => { const A = window.__xemXmlThue;
          for (const [ten, vb] of %s) A.addText(vb, ten, 'db/' + ten);
          A.select(-2); await new Promise(r => setTimeout(r, 400));
          const q = s => document.querySelector(s);
          const kq = { co: !!q('.ktt-dash'), ten: q('.ktt-dau h1')?.textContent, the: [...document.querySelectorAll('.ktt-dong-ky')].map(e => e.querySelector('.ktt-ten-ky').textContent + ' | ' + e.dataset.trangThai),
                       lap: !!q('.ktt-dong-ky [data-lap-tk]'), banRa: q('.ktt-tong b')?.textContent, chu: q('.ktt-dash').innerText };
          q('.ktt-chon-ky [data-kieu="M"]').click(); await new Promise(r => setTimeout(r, 300));
          kq.thang = [...document.querySelectorAll('.ktt-dong-ky .ktt-ten-ky')].map(e => e.textContent);
          q('.ktt-chon-ky [data-kieu="Q"]').click();
          return kq; })()''' % J([[os.path.basename(f), open(f, encoding='utf-8-sig').read()] for f in hd]))
    emoji = [ch for ch in r['chu'] if ord(ch) >= 0x1F300 or 0x2600 <= ord(ch) <= 0x27BF]
    danh_gia('Dashboard mới: có thẻ kỳ "Quý 4/2026 — Chưa lập tờ khai" kèm nút lập, tổng bán ra đúng phép cộng Python, không emoji',
             r['co'] and r['the'] == ['Quý 4/2026 | Chưa lập tờ khai'] and r['lap'] and r['banRa'] == f'{ban_v:,}'.replace(',', '.') and not emoji and r['thang'] == ['Tháng 10/2026'],
             J({k: r[k] for k in ('the', 'banRa', 'thang')}, ensure_ascii=False) + f' (mong {ban_v:,}) emoji={emoji[:5]}')

    that = os.path.join(APP, 'HD-TK')
    if not os.path.isdir(that):
        that = os.environ.get('XMLPRO_HD_TK', that)
    if not os.path.isdir(that):
        print('  [BỎ QUA] Không có thư mục HD-TK (dữ liệu thật) trên máy này')
        return
    nap_lai_trang(ev)
    tep = [os.path.join(that, f) for f in sorted(os.listdir(that)) if f.lower().endswith(('.xml', '.zip'))]
    oracle = cong_ca_zip(next(f for f in tep if f.lower().endswith('.zip')), MST)
    r = ev('''(async () => { const A = window.__xemXmlThue;
          const files = %s.map(([ten, b]) => { const s = atob(b), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new File([u], ten); });
          await A.addFiles(files); A.select(-2); await new Promise(r => setTimeout(r, 500));
          const tong = [...document.querySelectorAll('.ktt-tong b')].map(e => e.textContent);
          return { the: [...document.querySelectorAll('.ktt-dong-ky')].map(e => e.querySelector('.ktt-ten-ky').textContent + ' | ' + e.dataset.trangThai + ' :: ' + (e.querySelector('.ktt-ly-do')?.title || '')),
                   banRa: tong[0], muaVao: tong[2], thueVao: tong[3], phu: document.querySelector('.ktt-dau .ktt-nho').textContent }; })()'''
           % J([[os.path.basename(f), base64.b64encode(open(f, 'rb').read()).decode()] for f in tep]))
    fmt = lambda n: f'{n:,}'.replace(',', '.')
    the = {x.split(' :: ')[0]: x for x in r['the']}
    q1 = the.get('Quý 1/2026 | Lệch thuế', '')
    dat = (r['banRa'] == fmt(oracle['banV']) and r['muaVao'] == fmt(oracle['muaV']) and r['thueVao'] == fmt(oracle['muaT'])
           and 'đã bị thay thế bởi HĐ C26TKL-19' in q1 and 'Quý 3/2026 | Đã xong' in the and 'Quý 4/2026 | Chưa lập tờ khai' in the
           and 'Quý 2/2026 | Cần xem lại' in the and f"{oracle['biThay']} hoá đơn bị thay thế đã loại" in r['phu'])
    danh_gia('Dashboard mới với dữ liệu thật HD-TK: tổng khớp phép cộng độc lập (đã loại HĐ bị thay thế); quý 1 chỉ ra HĐ C26TKL-18 bị thay thế; quý 2/3/4 đúng trạng thái',
             dat, J(r, ensure_ascii=False)[:700] + f" | mong: bán {fmt(oracle['banV'])}, mua {fmt(oracle['muaV'])}, thuế vào {fmt(oracle['muaT'])}")


def to_khai_tncn(quy, so_lan, ct16, ct21, ct29):
    """Tờ khai 05/KK-TNCN (mã 864) tối giản. Cố ý có ct23 và ct32 như mẫu thật — trùng tên ô với 01/GTGT."""
    ct = {'ct16': ct16, 'ct17': ct16, 'ct21': ct21, 'ct22': ct21, 'ct23': 0, 'ct26': ct21, 'ct29': ct29, 'ct30': ct29, 'ct31': 0, 'ct32': 0}
    t0, t1 = (quy - 1) * 3 + 1, quy * 3
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<HSoThueDTu xmlns="http://kekhaithue.gdt.gov.vn/TKhaiThue"><HSoKhaiThue id="ID_1"><TTinChung><TTinTKhaiThue><TKhaiThue>
<maTKhai>864</maTKhai><tenTKhai>TK khấu trừ thuế thu nhập cá nhân Mẫu 05/KK-TNCN (TT80/2021)</tenTKhai><pbanTKhaiXML>2.9.3</pbanTKhaiXML>
<loaiTKhai>{'B' if so_lan else 'C'}</loaiTKhai><soLan>{so_lan}</soLan>
<KyKKhaiThue><kieuKy>Q</kieuKy><kyKKhai>{quy}/2026</kyKKhai><kyKKhaiTuNgay>01/{t0:02d}/2026</kyKKhaiTuNgay><kyKKhaiDenNgay>28/{t1:02d}/2026</kyKKhaiDenNgay></KyKKhaiThue>
</TKhaiThue><NNT><mst>0100000001</mst><tenNNT>Công ty thử TNCN</tenNNT></NNT></TTinTKhaiThue></TTinChung>
<CTieuTKhaiChinh>{''.join(f'<{k}>{v}</{k}>' for k, v in ct.items())}</CTieuTKhaiChinh><PLuc/></HSoKhaiThue></HSoThueDTu>"""


def kiem_tncn(ev, J, hd):
    print('=== 8. Tờ khai 05/KK-TNCN không bị nhận nhầm thành tờ khai GTGT / ngành hoá đơn ===')
    nap_lai_trang(ev)
    tk = [['tncn-q1-L00.xml', to_khai_tncn(1, 0, 4, 60000000, 500000)], ['tncn-q1-L01.xml', to_khai_tncn(1, 1, 5, 75000000, 700000)],
          ['tncn-q2-L00.xml', to_khai_tncn(2, 0, 5, 75000000, 800000)]]
    r = ev("""(async () => { const A = window.__xemXmlThue;
          for (const [ten, vb] of %s) A.addText(vb, ten, 'tncn/' + ten);
          const gtgt = A.docs.map(d => window.DOI_CHIEU.laToKhaiGTGT(d));
          A.select(0); A.setSelectedFolder('tncn'); A.moDashboard(); await new Promise(r => setTimeout(r, 400));
          return { gtgt, nganh: window.DASHBOARD_DONG.detectDominantDomain(A.docs), chu: document.getElementById('main').innerText }; })()""" % J(tk))
    dat = (r['gtgt'] == [False, False, False] and r['nganh'] == 'nhansu' and 'NHÂN SỰ, BHXH & THUẾ TNCN' in r['chu'].upper()
           and 'HÓA ĐƠN & THUẾ GTGT' not in r['chu'].upper() and 'Bổ sung 1' in r['chu'] and '1.500.000' in r['chu'] and '150.000.000' in r['chu'])
    danh_gia('05/KK-TNCN: không phải tờ khai GTGT, thư mục ra Dashboard "Nhân sự & Thuế TNCN", mỗi kỳ chỉ tính bản bổ sung mới nhất (thuế 700.000 + 800.000)',
             dat, J({'gtgt': r['gtgt'], 'nganh': r['nganh']}) + ' | ' + r['chu'][:300].replace(chr(10), ' / '))
    # Trộn với hoá đơn: Dashboard kế toán không được có thẻ kỳ nào do tờ khai TNCN sinh ra
    nap_lai_trang(ev)
    r = ev("""(async () => { const A = window.__xemXmlThue;
          for (const [ten, vb] of %s) A.addText(vb, ten, 'tron/' + ten);
          A.select(-2); await new Promise(r => setTimeout(r, 400));
          return { the: [...document.querySelectorAll('.ktt-dong-ky')].map(e => e.querySelector('.ktt-ten-ky').textContent + ' | ' + e.dataset.trangThai),
                   cty: [...document.querySelectorAll('[data-cty]')].map(e => e.dataset.cty) }; })()"""
           % J(tk + [[os.path.basename(f), open(f, encoding='utf-8-sig').read()] for f in hd]))
    danh_gia('Thư mục trộn hoá đơn + 05/KK-TNCN: Dashboard kế toán không lấy tờ khai TNCN làm tờ khai GTGT',
             not any('2026' in t and 'Quý 1' in t for t in r['the']) and '0100000001' not in r['cty'], J(r, ensure_ascii=False))


def kiem_khbs(ev, J, hd):
    print('=== 9. Tờ khai bổ sung 01/GTGT + 01/KHBS + 01-1/KHBS (báo cáo 09) ===')
    nap_lai_trang(ev)
    MST = '2601102955'
    kq = cong_hoa_don(hd, MST, '2026-10-01', '2026-10-31')
    v8 = sum(v for ts, (v, _) in kq['ban'].items() if ts in ('8%', '10%'))
    t8 = sum(t for ts, (_, t) in kq['ban'].items() if ts in ('8%', '10%'))
    _, so_quen, lts_quen = kq['hd'][2]
    v_q = sum(v for _, v, _ in lts_quen); t_q = sum(t for _, _, t in lts_quen)
    phai = t8 - t_q - kq['mua_T']
    assert phai > 0, 'mẫu hoá đơn đổi — sửa lại test'
    # Tờ khai lần đầu quên 1 hoá đơn bán ra (giống mục 5)
    ct = {'ct22': 0, 'ct23': kq['mua_V'], 'ct24': kq['mua_T'], 'ct23a': 0, 'ct24a': 0, 'ct25': kq['mua_T'], 'ct26': 0, 'ct27': v8 - v_q, 'ct28': t8 - t_q, 'ct29': 0,
          'ct30': 0, 'ct31': 0, 'ct32': v8 - v_q, 'ct33': t8 - t_q, 'ct32a': 0, 'ct34': v8 - v_q, 'ct35': t8 - t_q, 'ct36': phai, 'ct37': 0, 'ct38': 0, 'ct39a': 0,
          'ct40a': phai, 'ct40b': 0, 'ct40': phai, 'ct41': 0, 'ct42': 0, 'ct43': 0}
    tk_quen = to_khai_gtgt(MST, 'Công ty mẫu', 'M', '10/2026', '01/10/2026', '31/10/2026', ct, kq['pl_mua'], kq['pl_ban'])
    r = ev('''(async () => { const A = window.__xemXmlThue, L = window.LAP_TO_KHAI;
          for (const [ten, vb] of %s) A.addText(vb, ten, 'bs/' + ten);
          const iTk = A.addText(%s, 'tk-quen.xml', 'bs/tk-quen');
          const kb = L.tinhKHBS(A.docs, A.docs[iTk], { ngayLap: '2026-12-20' });
          A.select(iTk);
          for (let n = 0; n < 200 && !document.querySelector('.dc-panel [data-khbs]'); n++) await new Promise(r => setTimeout(r, 50));
          const nut = document.querySelector('.dc-panel [data-khbs]'); nut && nut.click(); await new Promise(r => setTimeout(r, 300));
          const hop = document.getElementById('dlgKhbs').open;
          document.getElementById('kbNgayLap').value = '2026-12-20'; document.getElementById('kbNgayTinh').value = '2026-12-20';
          document.getElementById('kbNgayTinh').dispatchEvent(new Event('input', { bubbles: true }));
          document.getElementById('kbLap').click();
          const i = A.docs.length - 1;
          for (let n = 0; n < 200 && !A.docs[i]._itaxDone; n++) await new Promise(r => setTimeout(r, 50));
          await new Promise(r => setTimeout(r, 300));
          const x = new DOMParser().parseFromString(A.docs[i].rawXml, 'application/xml'), g = t => x.getElementsByTagNameNS('*', t)[0]?.textContent;
          const dc = window.DOI_CHIEU.choToKhai(A.docs, A.docs[i]);
          return { dong: kb.dong.map(r => [r.ma, r.lech, r.nhom]), soLan: kb.soLan, dPN: kb.dPhaiNop, ngay: kb.soNgayCham, cham: kb.chamNop, hop,
                   ten: A.docs[i].fileName, loai: g('loaiTKhai'), soLanXml: g('soLan'), tc10: g('tongCong_ct10'), tc7: g('tongCong_7'), ct3b: g('ct3b'),
                   tab: [...document.querySelectorAll('.itax-tabs button')].map(b => b.textContent.trim()), dc: dc && dc.trangThai }; })()'''
           % (J([[os.path.basename(f), open(f, encoding='utf-8-sig').read()] for f in hd]), J(tk_quen)))
    lech = {m: (l, n) for m, l, n in r['dong']}
    cham = round(round(t_q) * 0.0003 * 30)  # hạn nộp tháng 10/2026 là 20/11/2026 → 20/12/2026: 30 ngày
    dat = (r['soLan'] == 1 and lech.get('[32]', (0,))[0] == round(v_q) and lech.get('[33]', (0,))[0] == round(t_q)
           and tuple(lech.get('[40]', ())) == (round(t_q), 'phaiNop') and r['dPN'] == round(t_q) and r['ngay'] == 30 and r['cham'] == cham)
    danh_gia(f'KHBS: tờ khai quên HĐ {so_quen} → điều chỉnh [32] +{round(v_q):,}, [33]/[40] +{round(t_q):,}, chậm nộp 30 ngày = {cham:,} (Python độc lập)',
             dat, J({k: r[k] for k in ('dong', 'soLan', 'dPN', 'ngay', 'cham')}, ensure_ascii=False))
    danh_gia('KHBS: nút trong khung đối chiếu mở hộp thoại; file L01 loại B lần 1 có 01/KHBS + 01-1/KHBS, mẫu iTax dựng thẻ "Tờ khai bổ sung", app đối chiếu lại → KHỚP',
             r['hop'] and r['ten'] == f'{MST}000-01_GTGT_TT80-M102026-L01.xml' and r['loai'] == 'B' and r['soLanXml'] == '1'
             and r['tc10'] == str(round(t_q)) and r['tc7'] == str(round(t_q)) and r['ct3b'] == str(cham)
             and 'Tờ khai bổ sung' in r['tab'] and 'Bản giải trình khai bổ sung' in r['tab'] and r['dc'] == 'khop',
             J({k: r[k] for k in ('hop', 'ten', 'loai', 'soLanXml', 'tc10', 'tc7', 'ct3b', 'tab', 'dc')}, ensure_ascii=False))

    that = os.path.join(APP, 'HD-TK')
    if not os.path.isdir(that):
        that = os.environ.get('XMLPRO_HD_TK', that)
    if not os.path.isdir(that):
        print('  [BỎ QUA] Không có thư mục HD-TK (dữ liệu thật) trên máy này')
        return
    nap_lai_trang(ev)
    tep = [os.path.join(that, f) for f in sorted(os.listdir(that)) if f.lower().endswith(('.xml', '.zip'))]
    r = ev('''(async () => { const A = window.__xemXmlThue, L = window.LAP_TO_KHAI, DC = window.DOI_CHIEU;
          const files = %s.map(([ten, b]) => { const s = atob(b), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new File([u], ten); });
          await A.addFiles(files);
          const q1 = A.docs.find(d => DC.laToKhaiGTGT(d) && DC.docToKhai(d).quy === 1 && DC.docToKhai(d).nam === 2026);
          const kb = L.tinhKHBS(A.docs, q1, { ngayLap: '2026-11-03' });
          const i = A.addText(L.xmlKHBS(kb, L.thongTinDN(A.docs, '2601102955')), 'q1-bs.xml', 'bs/q1-bs.xml');
          return { dong: Object.fromEntries(kb.dong.map(r => [r.ma, [r.cu, r.moi]])), dPN: kb.dPhaiNop, dKT: kb.dKhauTru, dc: DC.choToKhai(A.docs, A.docs[i]).trangThai }; })()'''
           % J([[os.path.basename(f), base64.b64encode(open(f, 'rb').read()).decode()] for f in tep]))
    d = r['dong']
    hieu = lambda m: d.get(m, [0, 0])[0] - d.get(m, [0, 0])[1]
    danh_gia('KHBS dữ liệu thật quý 1/2026: bỏ HĐ C26TKL-18 đã bị thay thế → [23] −89.656.000, [24] −7.172.480, [40] 0 → 401.941, [43] 6.770.539 → 0; bản bổ sung KHỚP hoá đơn',
             hieu('[23]') == 89656000 and hieu('[24]') == 7172480 and d.get('[40]') == [0, 401941] and d.get('[43]') == [6770539, 0]
             and r['dPN'] == 401941 and r['dKT'] == -6770539 and r['dc'] == 'khop', J(r, ensure_ascii=False))


def kiem_04(ev, J, hd):
    print('=== 10. Lập tờ khai 04/GTGT (trực tiếp trên doanh thu) từ hoá đơn bán ra (báo cáo 09) ===')
    nap_lai_trang(ev)
    MST = '2601102955'
    ban = []
    for f in hd:
        dl = etree.parse(f).getroot().find('DLHDon')
        if dl.findtext('NDHDon/NBan/MST') == MST and '2026-10-01' <= dl.findtext('TTChung/NLap') <= '2026-10-31':
            ban.append((dl.findtext('TTChung/NLap'), dl.findtext('TTChung/KHHDon') + '-' + dl.findtext('TTChung/SHDon'), float(dl.findtext('NDHDon/TToan/TgTTTBSo'))))
    ban.sort()
    tong = round(sum(t for _, _, t in ban)); dau = round(ban[0][2])
    r = ev('''(async () => { const A = window.__xemXmlThue, L = window.LAP_TO_KHAI;
          for (const [ten, vb] of %s) A.addText(vb, ten, 'g4/' + ten);
          A.moDlgLapTk({ mst: '%s', ky: { kieu: 'M', thang: 10, nam: 2026 }, mau: '04' }); await new Promise(r => setTimeout(r, 300));
          const tieuDe = document.getElementById('ltTieuDe').textContent, an01 = document.getElementById('ltKhoiNhap').hidden;
          const ct1 = { ...L.tinh04(A.docs, '%s', { kieu: 'M', thang: 10, nam: 2026 }, 'pp').ct };
          const s = document.querySelector('#lt04Ds [data-nhom-hd]'); s.value = 'dv'; s.dispatchEvent(new Event('change', { bubbles: true }));
          await new Promise(r => setTimeout(r, 200));
          document.getElementById('ltLap').click();
          const i = A.docs.length - 1;
          for (let n = 0; n < 200 && !A.docs[i]._itaxDone; n++) await new Promise(r => setTimeout(r, 50));
          await new Promise(r => setTimeout(r, 300));
          const x = new DOMParser().parseFromString(A.docs[i].rawXml, 'application/xml'), g = t => x.getElementsByTagNameNS('*', t)[0]?.textContent;
          const s0 = [...document.querySelectorAll('.itax-sheet')].find(e => e.offsetParent);
          return { tieuDe, an01, ct1, ten: A.docs[i].fileName, mtk: A.docs[i].mtk, itax: !!A.docs[i]._itaxDone, duPhong: (A.docs[i]._itaxSheets || []).filter(s => s.duPhong).length,
                   x: { ct22: g('ct22'), ct23: g('ct23'), ct24: g('ct24'), ct25: g('ct25'), ct30: g('ct30'), ct31: g('ct31'), ct32: g('ct32') },
                   chu: s0 ? s0.innerText : '' }; })()'''
           % (J([[os.path.basename(f), open(f, encoding='utf-8-sig').read()] for f in hd]), MST, MST))
    c1, x = r['ct1'], r['x']
    danh_gia(f'04/GTGT: {len(ban)} HĐ bán ra tháng 10/2026, doanh thu = cộng TgTTTBSo bằng Python {tong:,}, thuế 1% = {round(tong * 0.01):,}',
             r['tieuDe'].endswith('04/GTGT từ hoá đơn đã nạp') and r['an01'] and c1['ct22'] == tong and c1['ct23'] == round(tong * 0.01)
             and c1['ct30'] == tong and c1['ct31'] == c1['ct23'] and c1['ct32'] == tong and c1['ct21'] == 0, J(c1))
    mong = {'ct22': tong - dau, 'ct23': round((tong - dau) * 0.01), 'ct24': dau, 'ct25': round(dau * 0.05)}
    danh_gia(f'04/GTGT: đổi HĐ {ban[0][1]} sang nhóm dịch vụ 5% → file XML mã 847 đúng số, mẫu iTax 04/GTGT dựng được',
             all(x[k] == str(v) for k, v in mong.items()) and x['ct31'] == str(mong['ct23'] + mong['ct25']) and r['mtk'] == '847'
             and r['ten'] == f'{MST}000-04_GTGT_TT80-M102026-L00.xml' and r['itax'] and r['duPhong'] == 0 and 'Mẫu số: 04/GTGT' in r['chu'],
             J({'x': x, 'mong': mong, 'ten': r['ten'], 'mtk': r['mtk'], 'duPhong': r['duPhong']}, ensure_ascii=False))


def kiem_thanh_ben(ev, J, hd):
    print('=== 11. Thanh bên: tự nhận MST, menu Công cụ, "Đóng tất cả" hỏi lại ===')
    nap_lai_trang(ev)
    MST = '2601102955'
    dem = {}
    for f in hd:
        dl = etree.parse(f).getroot().find('DLHDon')
        for p in ('NBan', 'NMua'):
            m = dl.findtext(f'NDHDon/{p}/MST')
            if m:
                dem[m] = dem.get(m, 0) + 1
    top = max(dem, key=dem.get)
    mong = {'ban': sum(1 for f in hd if etree.parse(f).getroot().findtext('DLHDon/NDHDon/NBan/MST') == top),
            'mua': sum(1 for f in hd if etree.parse(f).getroot().findtext('DLHDon/NDHDon/NMua/MST') == top)}
    r = ev('''(async () => { const A = window.__xemXmlThue;
          localStorage.removeItem('xmlpro.myMst');
          const truoc = document.getElementById('lblMyMst').textContent;
          await A.addFiles(%s.map(([ten, vb]) => new File([vb], ten)));
          const nhan = {}; A.docs.forEach(d => { if (d.kind === 'hd') nhan[d.phanLoai] = (nhan[d.phanLoai] || 0) + 1; });
          const sau = document.getElementById('lblMyMst').textContent;
          document.querySelector('#congCu summary').click(); await new Promise(r => setTimeout(r, 100));
          const mo = document.getElementById('congCu').open;
          document.getElementById('btnLapTk').click(); await new Promise(r => setTimeout(r, 300));
          const hop = document.getElementById('dlgLapTk').open, menuDong = !document.getElementById('congCu').open;
          document.getElementById('dlgLapTk').close();
          const goc = window.confirm, n0 = A.docs.length;
          window.confirm = () => false; document.getElementById('clear').click(); const huy = A.docs.length;
          window.confirm = () => true; document.getElementById('clear').click(); const dong = A.docs.length;
          window.confirm = goc;
          return { truoc, sau, nhan, mo, hop, menuDong, n0, huy, dong, nut: document.getElementById('clear').textContent,
                   conNutCu: !!document.querySelector('.kt-tools') }; })()''' % J([[os.path.basename(f), open(f, encoding='utf-8-sig').read()] for f in hd]))
    danh_gia(f'Chưa cài MST: app tự nhận {top} (MST có trên nhiều hoá đơn nhất), gắn nhãn đủ {mong["ban"]} bán ra / {mong["mua"]} mua vào',
             top == MST and r['truoc'] == 'chưa nhận ra' and r['sau'] == f'{MST} (tự nhận)' and r['nhan'] == mong, J({k: r[k] for k in ('truoc', 'sau', 'nhan')}, ensure_ascii=False) + f' mong {mong}')
    danh_gia('Thanh bên: 3 nút gom vào "Công cụ", bấm mục thì mở hộp và menu tự đóng; "Đóng tất cả" hỏi lại (Huỷ giữ nguyên, OK mới đóng)',
             r['mo'] and r['hop'] and r['menuDong'] and r['n0'] == len(hd) and r['huy'] == len(hd) and r['dong'] == 0 and r['nut'] == 'Đóng tất cả' and not r['conNutCu'],
             J({k: r[k] for k in ('mo', 'hop', 'menuDong', 'n0', 'huy', 'dong', 'nut', 'conNutCu')}, ensure_ascii=False))


def kiem_nhieu_nam(ev, J, hd):
    print('=== 12. Dashboard kho hoá đơn nhiều năm: sổ theo kỳ gom theo năm ===')
    nap_lai_trang(ev)
    r = ev('''(async () => { const A = window.__xemXmlThue;
          const goc = %s, files = []; let so = 900000;
          for (const y of [2023, 2024, 2025, 2026]) for (let m = 1; m <= 12; m++) goc.forEach(([ten, x], i) => { so++;
            files.push(new File([x.replace(/<NLap>[^<]*<\\/NLap>/, `<NLap>${y}-${String(m).padStart(2, '0')}-1${i}</NLap>`).replace(/<SHDon>[^<]*<\\/SHDon>/, `<SHDon>${so}</SHDon>`)], `nn-${y}-${m}-${i}.xml`)); });
          await A.addFiles(files); A.select(-2); await new Promise(r => setTimeout(r, 500));
          const namDs = () => [...document.querySelectorAll('.ktt-dong-nam')].map(n => n.dataset.namTg + ':' + n.dataset.mo);
          const nam = namDs(), soKy = document.querySelectorAll('.ktt-dong-ky').length;
          document.querySelector('[data-nam-tg="2024"]').click(); await new Promise(r => setTimeout(r, 100));
          A.select(-2); await new Promise(r => setTimeout(r, 300));
          const giu = namDs(), soKy2 = document.querySelectorAll('.ktt-dong-ky').length;
          const hang = [...document.querySelectorAll('.ktt-so-sach tbody tr')], i24 = hang.findIndex(t => t.dataset.namTg === '2024');
          const sau2024 = hang[i24 + 1]?.querySelector('.ktt-ten-ky')?.textContent;
          document.querySelector('.ktt-chon-ky [data-kieu="M"]').click(); await new Promise(r => setTimeout(r, 300));
          const thang = document.querySelectorAll('.ktt-dong-ky').length;
          const nutLap = document.querySelectorAll('.ktt-dong-ky button[data-lap-tk]').length, conThe = document.querySelectorAll('.ktt-ky, .ktt-nam').length;
          return { nam, soKy, giu, soKy2, sau2024, thang, nutLap, conThe, cong: document.querySelector('.ktt-so-sach .ktt-cong td').textContent,
                   rong: document.querySelector('.ktt-dash').offsetWidth, khung: document.getElementById('main').clientWidth }; })()'''
           % J([[os.path.basename(f), open(f, encoding='utf-8-sig').read()] for f in hd]))
    dat = (r['nam'] == ['2026:1', '2025:0', '2024:0', '2023:0'] and r['soKy'] == 4 and r['giu'] == ['2026:1', '2025:0', '2024:1', '2023:0']
           and r['soKy2'] == 8 and r['sau2024'] == 'Quý 4/2024' and r['thang'] == 12 and r['nutLap'] == 12 and r['conThe'] == 0
           and r['cong'] == 'Cộng 4 năm' and r['rong'] > r['khung'] - 60)
    danh_gia('4 năm hoá đơn: không còn thẻ kỳ; sổ có dòng cộng năm ở đầu mỗi năm (năm mới nhất mở, năm cũ gập, bấm mở thì giữ khi vẽ lại), kỳ chưa lập có nút Lập tờ khai, Dashboard giãn hết khung',
             dat, J(r, ensure_ascii=False))


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
    # Bản 3 (vỏ WebView2) thêm đúng một địa chỉ nội bộ phục vụ tệp người dùng đã chọn — không địa chỉ nào khác
    nguon_ket_noi = csp.split('connect-src')[1].split(';')[0].split()
    danh_gia('A3: CSP chỉ cho kết nối nội bộ (\'self\' + https://tep.xml-pro.example của vỏ)',
             sorted(nguon_ket_noi) in (["'self'"], ["'self'", 'https://tep.xml-pro.example']), ' '.join(nguon_ket_noi))

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

        kiem_doi_chieu(ev, J, hd)
        kiem_lap_to_khai(ev, J, hd)
        kiem_dashboard(ev, J, hd)
        kiem_tncn(ev, J, hd)
        kiem_khbs(ev, J, hd)
        kiem_04(ev, J, hd)
        kiem_thanh_ben(ev, J, hd)
        kiem_nhieu_nam(ev, J, hd)
    finally:
        p.kill()
        shutil.rmtree(tam, ignore_errors=True)

    dat = sum(1 for _, d in ket_qua if d)
    print(f'\n=== KẾT QUẢ: ĐẠT {dat}/{len(ket_qua)} ===')
    sys.exit(0 if dat == len(ket_qua) else 1)


if __name__ == '__main__':
    main()
