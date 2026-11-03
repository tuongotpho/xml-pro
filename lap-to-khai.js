// lap-to-khai.js — Lập tờ khai 01/GTGT (TT80, mã 842) tháng / quý từ hoá đơn điện tử đã nạp, xuất XML nạp HTKK / eTax.
// Chuyển từ app khai thuế (F:\AI\4.August\apps\khaithue\app\src\core\gtgt.ts + xml.ts — công thức đã khớp tờ khai
// HTKK nộp thật), thêm kỳ THÁNG và lấy thuế suất từ bảng thuế suất ghi trên hoá đơn (không phải đoán theo tỷ lệ).
// Chọn hoá đơn bằng đúng hàm của phần đối chiếu (doi-chieu.js) để lập và đối chiếu không bao giờ lệch quy tắc.
// File xuất ra CHƯA ký số — khi nộp trên thuedientu.gdt.gov.vn sẽ ký bằng USB token. Chạy hoàn toàn trên máy.
(() => {
  'use strict';

  const DICH_VU = { maDVu: 'HTKK', tenDVu: 'HỖ TRỢ KÊ KHAI THUẾ', pbanDVu: '5.7.3', ttinNhaCCapDVu: '' };
  const MAU = { maTKhai: '842', tenTKhai: 'TỜ KHAI THUẾ GIÁ TRỊ GIA TĂNG (Mẫu số 01/GTGT)', pban: '2.8.3', maFile: '01_GTGT_TT80' };
  const MO_TA = '(Ban hành kèm theo Thông tư số 80/2021/TT-BTC ngày 29 tháng 9 năm 2021 của Bộ trưởng Bộ Tài chính)';

  /** Các chỉ tiêu không có trong hoá đơn, kế toán tự nhập */
  const NHAP_TAY_TRONG = { ct21: false, ct22: 0, ct23a: 0, ct24a: 0, ct37: 0, ct38: 0, ct39a: 0, ct40b: 0, ct42: 0 };

  const pad = n => String(n).padStart(2, '0');
  const tienVN = n => Math.round(n).toLocaleString('vi-VN');
  const ngayVN = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : (s || ''); };

  // ---------- Kỳ kê khai ----------
  /** ky = { kieu: 'Q', quy, nam } hoặc { kieu: 'M', thang, nam } */
  function khoangKy(ky) {
    const t0 = ky.kieu === 'Q' ? (ky.quy - 1) * 3 + 1 : ky.thang;
    const t1 = ky.kieu === 'Q' ? t0 + 2 : t0;
    const ngayCuoi = new Date(ky.nam, t1, 0).getDate();
    return {
      tu: `${ky.nam}-${pad(t0)}-01`, den: `${ky.nam}-${pad(t1)}-${pad(ngayCuoi)}`,
      tuVN: `01/${pad(t0)}/${ky.nam}`, denVN: `${pad(ngayCuoi)}/${pad(t1)}/${ky.nam}`,
      kyKKhai: ky.kieu === 'Q' ? `${ky.quy}/${ky.nam}` : `${pad(ky.thang)}/${ky.nam}`,
      ten: ky.kieu === 'Q' ? `Quý ${ky.quy}/${ky.nam}` : `Tháng ${pad(ky.thang)}/${ky.nam}`
    };
  }
  const kyTruoc = ky => ky.kieu === 'Q'
    ? (ky.quy === 1 ? { kieu: 'Q', quy: 4, nam: ky.nam - 1 } : { kieu: 'Q', quy: ky.quy - 1, nam: ky.nam })
    : (ky.thang === 1 ? { kieu: 'M', thang: 12, nam: ky.nam - 1 } : { kieu: 'M', thang: ky.thang - 1, nam: ky.nam });
  const cungKy = (t, ky) => t.kieuKy === ky.kieu && t.nam === ky.nam && (ky.kieu === 'Q' ? t.quy === ky.quy : t.thang === ky.thang);

  // ---------- Tính chỉ tiêu ----------
  function gomNhom(ds, cong) {
    const m = new Map();
    for (const d of ds) {
      const k = d.mst || d.ten;
      const co = m.get(k);
      if (co) cong(co, d); else m.set(k, { ...d });
    }
    return [...m.values()];
  }

  /**
   * Tính tờ khai cho MST trong kỳ từ các hoá đơn đã nạp.
   * nhap: chỉ tiêu nhập tay (xem NHAP_TAY_TRONG). Trả về { ct, plMua, plBan, tongPlMua, tongPlBan, ct9, canhBao, mua, ban }.
   */
  function tinhGTGT(docs, mst, ky, nhap = NHAP_TAY_TRONG) {
    const DC = window.DOI_CHIEU;
    const k = khoangKy(ky);
    const { mua, ban } = DC.chonHoaDon(docs, mst, k.tu, k.den);
    const thuTu = (a, b) => (a.ngay || '').localeCompare(b.ngay || '') || String(a.kyHieu).localeCompare(String(b.kyHieu)) || (Number(a.so) - Number(b.so));
    mua.sort(thuTu); ban.sort(thuTu);
    const canhBao = [];
    const tenHD = h => `HĐ ${h.kyHieu}-${h.so} ngày ${ngayVN(h.ngay)} (${ban.includes(h) ? h.mua?.Ten : h.ban?.Ten})`;

    // ---- Bán ra ----
    let ct26 = 0, ct29 = 0, ct30 = 0, ct31 = 0, ct32 = 0, ct32a = 0, thueTrenHD = 0;
    const banGiam = [];
    for (const h of ban) {
      const t = DC.tachHoaDon(h);
      if (t.vKhac || t.tKhac) canhBao.push({ muc: 'chu_y', noiDung: `${tenHD(h)} có thuế suất khác (không phải 0/5/8/10%, KCT, KKKNT): giá trị ${tienVN(t.vKhac)} đ, thuế ${tienVN(t.tKhac)} đ — chưa đưa vào chỉ tiêu nào, kiểm tra lại.` });
      if (t.t0) canhBao.push({ muc: 'chu_y', noiDung: `${tenHD(h)}: có hàng thuế suất 0% (${tienVN(t.t0)} đ) — tính vào [29].` });
      if (t.nguon === 'tong') canhBao.push({ muc: 'chu_y', noiDung: `${tenHD(h)} không có bảng thuế suất — app suy ra thuế suất từ tỷ lệ thuế / giá trị, kiểm tra lại.` });
      ct26 += t.kct; ct29 += t.t0; ct30 += t.v5; ct31 += t.t5; ct32 += t.v8 + t.v10; ct32a += t.kkknt;
      thueTrenHD += t.t8 + t.t10;
      if (t.v8) banGiam.push({ mst: DC.sachMst(h.mua?.MST), ten: h.mua?.Ten || '', giaTri: t.v8, thueSuat: 10, thueSuatSauGiam: 8, thueGiam: 0 });
    }
    const plBan = gomNhom(banGiam, (a, b) => { a.giaTri += b.giaTri; });
    for (const d of plBan) { d.giaTri = Math.round(d.giaTri); d.thueGiam = Math.round(d.giaTri * 0.02); }
    const tongGiam = plBan.reduce((s, d) => s + d.thueGiam, 0);
    // HTKK: thuế dòng [33] = 10% doanh thu − số thuế được giảm ở phụ lục
    ct32 = Math.round(ct32);
    const ct33 = Math.round(ct32 * 0.1) - tongGiam;
    if (Math.abs(thueTrenHD - ct33) > Math.max(5, ban.length)) {
      canhBao.push({ muc: 'chu_y', noiDung: `Thuế bán ra theo công thức [33] = ${tienVN(ct33)} đ, cộng trên hoá đơn = ${tienVN(thueTrenHD)} đ (lệch ${tienVN(thueTrenHD - ct33)} đ).` });
    }

    // ---- Mua vào ----
    let ct23 = 0, ct24 = 0;
    const muaTam = [];
    for (const h of mua) {
      const t = DC.tachHoaDon(h);
      ct23 += t.V; ct24 += t.T;
      if (h.kyBan?.tampered) canhBao.push({ muc: 'loi', noiDung: `${tenHD(h)}: chữ ký số của người bán KHÔNG khớp dữ liệu (hoá đơn có dấu hiệu bị sửa) — xem lại trước khi khấu trừ.` });
      if (t.nguon === 'tong') canhBao.push({ muc: 'chu_y', noiDung: `${tenHD(h)} không có bảng thuế suất — phần 8% ở phụ lục được suy theo tỷ lệ, kiểm tra lại.` });
      if (t.v8) muaTam.push({ mst: DC.sachMst(h.ban?.MST), ten: h.ban?.Ten || '', giaTri: t.v8, thue: t.t8 });
    }
    const plMua = gomNhom(muaTam, (a, b) => { a.giaTri += b.giaTri; a.thue += b.thue; });
    for (const d of plMua) { d.giaTri = Math.round(d.giaTri); d.thue = Math.round(d.thue); }
    const tongPlMua = { giaTri: plMua.reduce((s, d) => s + d.giaTri, 0), thue: plMua.reduce((s, d) => s + d.thue, 0) };
    const tongPlBan = { giaTri: plBan.reduce((s, d) => s + d.giaTri, 0), thueGiam: tongGiam };

    // ---- Các chỉ tiêu tổng hợp (giống gtgt.ts) ----
    const n = { ...NHAP_TAY_TRONG, ...nhap };
    const r = Math.round;
    ct23 = r(ct23); ct24 = r(ct24); ct26 = r(ct26); ct29 = r(ct29); ct30 = r(ct30); ct31 = r(ct31); ct32a = r(ct32a);
    const ct25 = ct24 + n.ct24a;
    const ct27 = ct29 + ct30 + ct32 + ct32a;
    const ct28 = ct31 + ct33;
    const ct34 = ct26 + ct27;
    const ct35 = ct28;
    const ct36 = ct35 - ct25;
    const x = ct36 - n.ct22 + n.ct37 - n.ct38 - n.ct39a;
    const ct40a = x > 0 ? x : 0;
    const ct40 = Math.max(ct40a - n.ct40b, 0);
    const ct41 = x < 0 ? -x : 0;
    const ct43 = ct41 - n.ct42;
    if (n.ct42 > ct41) canhBao.push({ muc: 'loi', noiDung: '[42] đề nghị hoàn lớn hơn [41] số thuế chưa khấu trừ hết.' });
    if (n.ct21 && (ban.length || mua.length)) canhBao.push({ muc: 'loi', noiDung: 'Đã đánh dấu [21] "không phát sinh" nhưng vẫn có hoá đơn trong kỳ.' });
    if (!ban.length && !mua.length && !n.ct21) canhBao.push({ muc: 'chu_y', noiDung: `Không có hoá đơn nào của MST ${mst} trong ${k.ten}. Nếu thật sự không phát sinh, đánh dấu [21].` });

    const ct = {
      ct21: n.ct21 ? 1 : 0, ct22: n.ct22, ct23, ct24, ct23a: n.ct23a, ct24a: n.ct24a, ct25, ct26, ct27, ct28, ct29,
      ct30, ct31, ct32, ct33, ct32a, ct34, ct35, ct36, ct37: n.ct37, ct38: n.ct38, ct39a: n.ct39a,
      ct40a, ct40b: n.ct40b, ct40, ct41, ct42: n.ct42, ct43
    };
    return { ct, plMua, plBan, tongPlMua, tongPlBan, ct9: tongGiam - tongPlMua.thue, canhBao, mua, ban, ky: k };
  }

  /** [22] = [43] tờ khai LẦN ĐẦU kỳ liền trước (cùng MST) nếu đang nạp; null nếu không có */
  function timCt22(docs, mst, ky) {
    const DC = window.DOI_CHIEU;
    const kt = kyTruoc(ky);
    const d = docs.find(x => DC.laToKhaiGTGT(x) && (() => { const t = DC.docToKhai(x); return t.mst === DC.sachMst(mst) && t.lanDau && cungKy(t, kt); })());
    return d ? { ct22: DC.docToKhai(d).ct.ct43 || 0, ky: khoangKy(kt).ten, doc: d } : null;
  }

  /** Thông tin doanh nghiệp: lấy từ tờ khai gần nhất cùng MST đang nạp, không có thì từ hoá đơn */
  function thongTinDN(docs, mst) {
    const DC = window.DOI_CHIEU;
    mst = DC.sachMst(mst);
    const tks = docs.filter(x => x.kind === 'tk' && x.rawXml && DC.laToKhaiGTGT(x) && DC.docToKhai(x).mst === mst)
      .sort((a, b) => (DC.docToKhai(b).den || '').localeCompare(DC.docToKhai(a).den || ''));
    if (tks.length) {
      const x = new DOMParser().parseFromString(String(tks[0].rawXml).replace(/^\uFEFF/, ''), 'application/xml');
      const g = t => (x.getElementsByTagNameNS('*', t)[0]?.textContent || '').trim();
      return { nguon: 'tờ khai ' + DC.docToKhai(tks[0]).kyTen, mst, tenNNT: g('tenNNT'), dchiNNT: g('dchiNNT'), phuongXa: g('phuongXa'),
        maTinhNNT: g('maTinhNNT'), tenTinhNNT: g('tenTinhNNT'), dthoaiNNT: g('dthoaiNNT'), emailNNT: g('emailNNT'),
        maCQTNoiNop: g('maCQTNoiNop'), tenCQTNoiNop: g('tenCQTNoiNop'), nguoiKy: g('nguoiKy') };
    }
    const h = docs.find(d => d.kind === 'hd' && !d.error && DC.sachMst(d.ban?.MST) === mst) || docs.find(d => d.kind === 'hd' && !d.error && DC.sachMst(d.mua?.MST) === mst);
    const p = h ? (DC.sachMst(h.ban?.MST) === mst ? h.ban : h.mua) : {};
    return { nguon: h ? 'hoá đơn ' + h.kyHieu + '-' + h.so : '', mst, tenNNT: p.Ten || '', dchiNNT: p.DChi || '', phuongXa: '', maTinhNNT: '', tenTinhNNT: '',
      dthoaiNNT: p.SDThoai || '', emailNNT: p.DCTDTu || '', maCQTNoiNop: '', tenCQTNoiNop: '', nguoiKy: '' };
  }

  // ---------- XML (khuôn HTKK, giống xml.ts) ----------
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const the = (tag, v) => v === undefined || v === null || v === '' ? `<${tag}/>` : `<${tag}>${esc(v)}</${tag}>`;

  function dinhDang(xml) {
    let cap = 0;
    return xml.split('\n').map(dong => {
      const d = dong.trim();
      if (!d) return '';
      if (d.startsWith('</')) cap--;
      const ra = d.startsWith('<?') ? d : '  '.repeat(Math.max(cap, 0)) + d;
      if (/^<[^/?!][^>]*[^/]>$/.test(d) && !d.includes('</')) cap++;
      return ra;
    }).filter(Boolean).join('\n') + '\n';
  }

  const homNay = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

  /** bs (tờ khai bổ sung): { soLan, plKhbs } — plKhbs là XML hai phụ lục 01/KHBS + 01-1/KHBS (xmlPhuLucKHBS) */
  function xmlGTGT(tk, ky, dn, ngayLap = homNay(), bs = null) {
    const k = khoangKy(ky), c = tk.ct;
    const so = key => `<${key}>${c[key]}</${key}>`;
    const nnt = [
      the('mst', dn.mst), the('tenNNT', dn.tenNNT), the('dchiNNT', dn.dchiNNT), the('phuongXa', dn.phuongXa),
      '<maHuyenNNT/>', '<tenHuyenNNT/>', the('maTinhNNT', dn.maTinhNNT), the('tenTinhNNT', dn.tenTinhNNT),
      the('dthoaiNNT', dn.dthoaiNNT), '<faxNNT/>', the('emailNNT', dn.emailNNT)
    ].join('\n');
    const plMua = tk.plMua.length ? `<HH_DV_MuaVaoTrongKy>
${tk.plMua.map((d, i) => `<BangKeTenHHDV ID="ID_${i + 1}">
${the('tenHHDVMuaVao', d.ten)}
<giaTriHHDVMuaVao>${d.giaTri}</giaTriHHDVMuaVao>
<thueGTGTHHDV>${d.thue}</thueGTGTHHDV>
</BangKeTenHHDV>`).join('\n')}
<tongCongGiaTriHHDVMuaVao>${tk.tongPlMua.giaTri}</tongCongGiaTriHHDVMuaVao>
<tongCongThueGTGTHHDV>${tk.tongPlMua.thue}</tongCongThueGTGTHHDV>
</HH_DV_MuaVaoTrongKy>` : '';
    const plBan = tk.plBan.length ? `<HH_DV_BanRaTrongKy>
${tk.plBan.map((d, i) => `<BangKeTenHHDV ID="ID_${i + 1}">
${the('tenHHDV', d.ten)}
<giaTriHHDV>${d.giaTri}</giaTriHHDV>
<thueSuatTheoQuyDinh>${d.thueSuat}</thueSuatTheoQuyDinh>
<thueSuatSauGiam>${d.thueSuatSauGiam}</thueSuatSauGiam>
<thueGTGTDuocGiam>${d.thueGiam}</thueGTGTDuocGiam>
</BangKeTenHHDV>`).join('\n')}
<tongCongGiaTriHHDV>${tk.tongPlBan.giaTri}</tongCongGiaTriHHDV>
<tongCongThueGTGTDuocGiam>${tk.tongPlBan.thueGiam}</tongCongThueGTGTDuocGiam>
</HH_DV_BanRaTrongKy>` : '';
    const coPhuLuc = tk.plBan.length > 0 || tk.plMua.length > 0;
    const body = `<TTinChung>
<TTinDVu>
${the('maDVu', DICH_VU.maDVu)}
${the('tenDVu', DICH_VU.tenDVu)}
${the('pbanDVu', DICH_VU.pbanDVu)}
${the('ttinNhaCCapDVu', DICH_VU.ttinNhaCCapDVu)}
</TTinDVu>
<TTinTKhaiThue>
<TKhaiThue>
${the('maTKhai', MAU.maTKhai)}
${the('tenTKhai', MAU.tenTKhai)}
${the('moTaBMau', MO_TA)}
${the('pbanTKhaiXML', MAU.pban)}
<loaiTKhai>${bs ? 'B' : 'C'}</loaiTKhai>
<soLan>${bs ? bs.soLan : 0}</soLan>
<KyKKhaiThue>
<kieuKy>${ky.kieu}</kieuKy>
${the('kyKKhai', k.kyKKhai)}
${the('kyKKhaiTuNgay', k.tuVN)}
${the('kyKKhaiDenNgay', k.denVN)}
<kyKKhaiTuThang/>
<kyKKhaiDenThang/>
</KyKKhaiThue>
${the('maCQTNoiNop', dn.maCQTNoiNop)}
${the('tenCQTNoiNop', dn.tenCQTNoiNop)}
${the('ngayLapTKhai', ngayLap)}
<GiaHan>
<maLyDoGiaHan/>
<lyDoGiaHan/>
</GiaHan>
${the('nguoiKy', dn.nguoiKy)}
${the('ngayKy', ngayLap)}
<nganhNgheKD/>
</TKhaiThue>
<NNT>
${nnt}
</NNT>
</TTinTKhaiThue>
</TTinChung>
<CTieuTKhaiChinh>
<ma_NganhNghe>00</ma_NganhNghe>
<ten_NganhNghe>Hoạt động sản xuất kinh doanh thông thường</ten_NganhNghe>
<tieuMucHachToan>1701</tieuMucHachToan>
<Header>
<ct09/>
<ct10/>
<DiaChiHDSXKDKhacTinhNDTSC>
<ct11a_phuongXa_ma/>
<ct11a_phuongXa_ten/>
<ct11b_quanHuyen_ma/>
<ct11b_quanHuyen_ten/>
<ct11c_tinhTP_ma/>
<ct11c_tinhTP_ten/>
</DiaChiHDSXKDKhacTinhNDTSC>
</Header>
<ct21>${c.ct21 ? 1 : 0}</ct21>
${so('ct22')}
<GiaTriVaThueGTGTHHDVMuaVao>
${so('ct23')}
${so('ct24')}
</GiaTriVaThueGTGTHHDVMuaVao>
<HangHoaDichVuNhapKhau>
${so('ct23a')}
${so('ct24a')}
</HangHoaDichVuNhapKhau>
${so('ct25')}
${so('ct26')}
<HHDVBRaChiuThueGTGT>
${so('ct27')}
${so('ct28')}
</HHDVBRaChiuThueGTGT>
${so('ct29')}
<HHDVBRaChiuTSuat5>
${so('ct30')}
${so('ct31')}
</HHDVBRaChiuTSuat5>
<HHDVBRaChiuTSuat10>
${so('ct32')}
${so('ct33')}
</HHDVBRaChiuTSuat10>
${so('ct32a')}
<TongDThuVaThueGTGTHHDVBRa>
${so('ct34')}
${so('ct35')}
</TongDThuVaThueGTGTHHDVBRa>
${['ct36', 'ct37', 'ct38', 'ct39a', 'ct40a', 'ct40b', 'ct40', 'ct41', 'ct42', 'ct43'].map(so).join('\n')}
</CTieuTKhaiChinh>
${coPhuLuc || bs ? `<PLuc>
${bs ? bs.plKhbs : ''}
${coPhuLuc ? `<PL_NQ142_GTGT>
${[plMua, plBan].filter(Boolean).join('\n')}
<ChenhLech>
<ct9>${tk.ct9}</ct9>
</ChenhLech>
</PL_NQ142_GTGT>` : ''}
</PLuc>` : '<PLuc/>'}`;
    return dinhDang(`<?xml version="1.0" encoding="UTF-8"?>
<HSoThueDTu xmlns="http://kekhaithue.gdt.gov.vn/TKhaiThue" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<HSoKhaiThue id="ID_1">
${body}
</HSoKhaiThue>
</HSoThueDTu>
`);
  }

  // ---------- Tờ khai bổ sung 01/GTGT (loaiTKhai B) + 01/KHBS + 01-1/KHBS ----------
  // Khuôn phụ lục theo tệp bổ sung thật xuất từ HTKK (PL01_KHBS / PL01_1_KHBS) và mẫu iTax PLuc_01KHBS_TT80, PLuc_01_1_KHBS_TT80.
  const TEN_CT = {
    ct22: 'Thuế GTGT còn được khấu trừ kỳ trước chuyển sang', ct23: 'Giá trị của hàng hóa, dịch vụ mua vào', ct24: 'Thuế GTGT của hàng hóa, dịch vụ mua vào',
    ct23a: 'Giá trị hàng hóa, dịch vụ nhập khẩu', ct24a: 'Thuế GTGT hàng hóa, dịch vụ nhập khẩu', ct25: 'Tổng số thuế GTGT được khấu trừ kỳ này',
    ct26: 'Hàng hóa, dịch vụ bán ra không chịu thuế GTGT', ct27: 'Hàng hóa, dịch vụ bán ra chịu thuế GTGT - giá trị', ct28: 'Hàng hóa, dịch vụ bán ra chịu thuế GTGT - thuế',
    ct29: 'Hàng hóa, dịch vụ bán ra chịu thuế suất 0%', ct30: 'Hàng hóa, dịch vụ bán ra chịu thuế suất 5% - giá trị', ct31: 'Hàng hóa, dịch vụ bán ra chịu thuế suất 5% - thuế',
    ct32: 'Hàng hóa, dịch vụ bán ra chịu thuế suất 10% - giá trị', ct33: 'Hàng hóa, dịch vụ bán ra chịu thuế suất 10% - thuế',
    ct32a: 'Hàng hóa, dịch vụ bán ra không phải kê khai, tính nộp thuế GTGT', ct34: 'Tổng doanh thu hàng hóa, dịch vụ bán ra', ct35: 'Tổng số thuế GTGT của hàng hóa, dịch vụ bán ra',
    ct36: 'Thuế GTGT phát sinh trong kỳ', ct37: 'Điều chỉnh giảm', ct38: 'Điều chỉnh tăng', ct39a: 'Thuế GTGT nhận bàn giao được khấu trừ / đã nộp ở địa phương khác',
    ct40a: 'Thuế GTGT phải nộp của hoạt động sản xuất kinh doanh trong kỳ', ct40b: 'Thuế GTGT mua vào của dự án đầu tư được bù trừ', ct40: 'Thuế GTGT còn phải nộp trong kỳ',
    ct41: 'Thuế GTGT chưa khấu trừ hết kỳ này', ct42: 'Thuế GTGT đề nghị hoàn', ct43: 'Thuế GTGT còn được khấu trừ chuyển kỳ sau'
  };
  const THU_TU_CT = ['ct22', 'ct23', 'ct24', 'ct23a', 'ct24a', 'ct25', 'ct26', 'ct27', 'ct28', 'ct29', 'ct30', 'ct31', 'ct32', 'ct33', 'ct32a', 'ct34', 'ct35',
    'ct36', 'ct37', 'ct38', 'ct39a', 'ct40a', 'ct40b', 'ct40', 'ct41', 'ct42', 'ct43'];
  const TIEU_MUC = { ma: '1701', ten: 'Thuế GTGT hàng sản xuất, kinh doanh trong nước' };
  const LAI_CHAM_NOP = 0.0003; // 0,03%/ngày (Luật Quản lý thuế 38/2019/QH14, Điều 59)

  /** Hạn nộp tờ khai: quý → ngày cuối tháng đầu quý sau; tháng → ngày 20 tháng sau (TT80, Luật QLT Điều 44) */
  function hanNop(ky) {
    if (ky.kieu === 'Q') { const t = ky.quy * 3 + 1, n = ky.nam + (t > 12 ? 1 : 0), th = t > 12 ? 1 : t; return `${n}-${pad(th)}-${pad(new Date(n, th, 0).getDate())}`; }
    const n = ky.nam + (ky.thang === 12 ? 1 : 0), th = ky.thang === 12 ? 1 : ky.thang + 1;
    return `${n}-${pad(th)}-20`;
  }
  const soNgay = (tu, den) => Math.round((Date.parse(den + 'T00:00:00Z') - Date.parse(tu + 'T00:00:00Z')) / 86400000);

  /** Tờ khai đang nạp có số lần cao nhất của cùng MST và kỳ — tờ khai bổ sung phải điều chỉnh từ bản này */
  function toKhaiMoiNhat(docs, mst, ky) {
    const DC = window.DOI_CHIEU;
    mst = DC.sachMst(mst);
    const ds = docs.filter(x => DC.laToKhaiGTGT(x) && (() => { const t = DC.docToKhai(x); return t.mst === mst && cungKy(t, ky); })());
    return ds.sort((a, b) => DC.docToKhai(b).soLan - DC.docToKhai(a).soLan)[0] || null;
  }

  /**
   * Tính tờ khai bổ sung cho tờ khai tkDoc từ hoá đơn đang nạp.
   * Chỉ tiêu nhập tay ([21], [22], [23a], [24a], [37]–[39a], [40b], [42]) giữ nguyên như tờ khai cũ — chỉ phần lấy từ hoá đơn được tính lại.
   * opt: { ngayLap, ngayTinhChamNop, lyDo }
   */
  function tinhKHBS(docs, tkDoc, opt = {}) {
    const DC = window.DOI_CHIEU;
    const cu = DC.docToKhai(tkDoc);
    const ky = cu.kieuKy === 'Q' ? { kieu: 'Q', quy: cu.quy, nam: cu.nam } : { kieu: 'M', thang: cu.thang, nam: cu.nam };
    const c0 = cu.ct, g = k => Number(c0[k]) || 0;
    const nhap = { ct21: !!g('ct21'), ct22: g('ct22'), ct23a: g('ct23a'), ct24a: g('ct24a'), ct37: g('ct37'), ct38: g('ct38'), ct39a: g('ct39a'), ct40b: g('ct40b'), ct42: g('ct42') };
    const moi = tinhGTGT(docs, cu.mst, ky, nhap);
    const ngayLap = opt.ngayLap || homNay();
    const lyDo = opt.lyDo || 'Điều chỉnh theo hoá đơn điện tử thực tế';
    const dong = THU_TU_CT.map(k => {
      const a = g(k), b = Number(moi.ct[k]) || 0;
      return { k, ma: '[' + k.slice(2) + ']', ten: TEN_CT[k], cu: a, moi: b, lech: b - a,
        // Cột (7) "Điều chỉnh tăng/giảm nghĩa vụ thuế": chỉ các chỉ tiêu là nghĩa vụ — phải nộp [40], khấu trừ chuyển kỳ sau [43], đề nghị hoàn [42]
        nhom: k === 'ct40' ? 'phaiNop' : k === 'ct43' ? 'khauTru' : k === 'ct42' ? 'hoan' : '' };
    }).filter(r => r.lech !== 0);
    const dPhaiNop = moi.ct.ct40 - g('ct40'), dKhauTru = moi.ct.ct43 - g('ct43'), dHoan = moi.ct.ct42 - g('ct42');
    const han = hanNop(ky), ngayTinh = opt.ngayTinhChamNop || ngayLap;
    const soNgayCham = dPhaiNop > 0 ? Math.max(soNgay(han, ngayTinh), 0) : 0;
    const chamNop = Math.round(dPhaiNop * LAI_CHAM_NOP * soNgayCham);
    const canhBao = [...moi.canhBao];
    if (!dong.length) canhBao.unshift({ muc: 'chu_y', noiDung: `Tính lại từ hoá đơn ra đúng như tờ khai ${cu.lanDau ? 'lần đầu' : 'bổ sung lần ' + cu.soLan} — không có gì để khai bổ sung.` });
    if (dKhauTru) canhBao.push({ muc: 'loi', noiDung: `[43] chuyển kỳ sau đổi ${tienVN(g('ct43'))} → ${tienVN(moi.ct.ct43)} đ. Tờ khai các kỳ sau đã lấy [22] = [43] cũ thì cũng phải xem lại — app không tự sửa các kỳ đó.` });
    const pl0 = cu.plMua || [], pl0b = cu.plBan || [];
    const tongPl = a => a.reduce((s, r) => s + (r.thue || r.giam || 0), 0);
    if (Math.round(tongPl(pl0)) !== moi.tongPlMua.thue || Math.round(tongPl(pl0b)) !== moi.tongPlBan.thueGiam)
      canhBao.push({ muc: 'chu_y', noiDung: 'Phụ lục giảm thuế NQ142 cũng thay đổi: tờ khai bổ sung đã lập lại phụ lục theo hoá đơn, nhưng bảng 01-1/KHBS chỉ liệt kê chỉ tiêu của tờ khai chính.' });
    return { cu, moi, ky, dong, dPhaiNop, dKhauTru, dHoan, han, ngayTinh, soNgayCham, chamNop, lyDo, ngayLap,
      soLan: (cu.lanDau ? 0 : cu.soLan) + 1, canhBao };
  }

  function xmlPhuLucKHBS(kb, dn) {
    const k = khoangKy(kb.ky);
    const header = `<Header>
${the('maTKhai', MAU.maTKhai)}
<tenTKhai>Tờ khai thuế GTGT (01/GTGT)(TT80/2021)</tenTKhai>
<maGiaoDich/>
<KyKKhaiThue>
<kieuKy>${kb.ky.kieu}</kieuKy>
${the('kyKKhai', k.kyKKhai)}
${the('kyKKhaiTuNgay', k.tuVN)}
${the('kyKKhaiDenNgay', k.denVN)}
<kyKKhaiTuThang/>
<kyKKhaiDenThang/>
</KyKKhaiThue>
<soLan>${kb.soLan}</soLan>
${the('mst', dn.mst)}
${the('tenNNT', dn.tenNNT)}
<mstDLyThue xsi:nil="true"/>
<tenDLyThue/>
<soHDongDLyThue/>
<ngayKyHDDLyThue xsi:nil="true"/>
</Header>
<ma_DonViTien>VND</ma_DonViTien>
<ten_DonViTien>Đồng Việt Nam</ten_DonViTien>`;
    const tieuMuc = (v, tong) => `<ChiTiet id="ID_1">
${v ? the('ct2_ma', TIEU_MUC.ma) : '<ct2_ma/>'}
${v ? the('ct2_ten', TIEU_MUC.ten) : '<ct2_ten/>'}
<ct3>${v}</ct3>
</ChiTiet>
<${tong}>${v}</${tong}>`;
    const pl01 = `<PL01_KHBS>
${header}
<Muc_A>
<Muc_I>
<Muc_1>
${tieuMuc(kb.dPhaiNop, 'tongCong_ct10')}
</Muc_1>
<Muc_2>
<DSachPLuc>
<BKePLuc id="ID_1">
<ma_PLuc/>
<ten_PLuc/>
<CTietPLuc>
<ChiTiet id="ID_1">
<ct2_ma/>
<ct2_ten/>
<ct3_ma/>
<ct3_ten/>
<ma_Xa/>
<ten_Xa/>
<ct04_ma/>
<ct04_ten/>
<ct05_ma/>
<ct05_ten/>
<ct06_ma/>
<ct06_ten/>
<ct7>0</ct7>
</ChiTiet>
</CTietPLuc>
</BKePLuc>
<tongCong_ct11>0</tongCong_ct11>
</DSachPLuc>
</Muc_2>
<Muc_3>
${kb.soNgayCham ? the('ct3a_1', ngayVN(kb.ngayTinh)) : '<ct3a_1 xsi:nil="true"/>'}
<ct3a_2>${kb.soNgayCham}</ct3a_2>
<ct3b>${kb.chamNop}</ct3b>
</Muc_3>
</Muc_I>
<Muc_II>
${tieuMuc(kb.dKhauTru, 'tongCong_ct12')}
</Muc_II>
<Muc_III>
${tieuMuc(kb.dHoan, 'tongCong_ct13')}
</Muc_III>
</Muc_A>
<Muc_B>
<Muc_I>
<ct_1>0</ct_1>
<ct_2_so/>
<ct_2_ngay xsi:nil="true"/>
<ct_2_CQT_ma/>
<ct_2_CQT_ten/>
<ct_3_so/>
<ct_3_ngay xsi:nil="true"/>
</Muc_I>
<Muc_II>
<ct_1>0</ct_1>
<ct_2>0</ct_2>
</Muc_II>
</Muc_B>
</PL01_KHBS>`;
    const tong = n => kb.dong.filter(r => r.nhom === n).reduce((s, r) => s + r.lech, 0);
    const pl011 = `<PL01_1_KHBS>
${header}
<Muc_A>
<DSachHSo>
<BKeHSo id="ID_1">
<ma_HSo>0001</ma_HSo>
<ten_HSo>01/GTGT</ten_HSo>
<CTietHSo>
${kb.dong.map((r, i) => `<ChiTiet id="ID_${i + 1}">
<ct2_ma/>
<ct2_ten/>
${the('ct3_ma', r.ma)}
${the('ct3_ten', r.ten)}
<ct3_1_ma/>
<ct3_1_ten/>
<ct3_2_ma/>
<ct3_2_ten/>
<ct04>${r.cu}</ct04>
<ct05>${r.moi}</ct05>
<ct06>${r.lech}</ct06>
<ct7>${r.nhom ? r.lech : 0}</ct7>
${the('ct8', kb.lyDo)}
</ChiTiet>`).join('\n')}
</CTietHSo>
</BKeHSo>
<TongCong>
<tongCong_7>${tong('phaiNop')}</tongCong_7>
<tongCong_8>${tong('khauTru')}</tongCong_8>
<tongCong_9>${tong('hoan')}</tongCong_9>
</TongCong>
</DSachHSo>
</Muc_A>
<Muc_B>
<CTietTaiLieu id="ID_1">
<ma_TLieu/>
<ten_TLieu/>
</CTietTaiLieu>
</Muc_B>
</PL01_1_KHBS>`;
    return pl01 + '\n' + pl011;
  }

  function xmlKHBS(kb, dn) {
    return xmlGTGT(kb.moi, kb.ky, dn, kb.ngayLap, { soLan: kb.soLan, plKhbs: xmlPhuLucKHBS(kb, dn) });
  }

  // ---------- Tờ khai 04/GTGT (TT80, mã 847) — phương pháp trực tiếp trên doanh thu ----------
  const MAU_04 = { maTKhai: '847', tenTKhai: 'TỜ KHAI THUẾ GIÁ TRỊ GIA TĂNG (Mẫu số 04/GTGT)', pban: '2.7.4', maFile: '04_GTGT_TT80' };
  /** Nhóm ngành theo tỷ lệ % trên doanh thu (TT80 / TT219 Điều 13) */
  const NHOM_04 = [
    { ma: 'pp', ten: 'Phân phối, cung cấp hàng hoá', tyLe: 1, dt: 'ct22', thue: 'ct23', the: 'PPhoiCCapHHoa' },
    { ma: 'dv', ten: 'Dịch vụ, xây dựng không bao thầu nguyên vật liệu', tyLe: 5, dt: 'ct24', thue: 'ct25', the: 'DVuXDungKoBaoThauNVL' },
    { ma: 'sx', ten: 'Sản xuất, vận tải, dịch vụ có gắn với hàng hoá, xây dựng có bao thầu nguyên vật liệu', tyLe: 3, dt: 'ct26', thue: 'ct27', the: 'HHoaXDungCoBaoThauNVL' },
    { ma: 'khac', ten: 'Hoạt động kinh doanh khác', tyLe: 2, dt: 'ct28', thue: 'ct29', the: 'HDongKDoanhKhac' }
  ];

  /**
   * Tính 04/GTGT từ hoá đơn bán ra của MST trong kỳ.
   * nhomHD: { [chỉ số hoá đơn trong docs]: mã nhóm } — hoá đơn không có trong đây lấy nhomMacDinh.
   * Doanh thu tính thuế theo tỷ lệ là giá thanh toán (đã gồm thuế nếu có); phần hàng không chịu thuế / thuế suất 0% vào [21].
   */
  function tinh04(docs, mst, ky, nhomMacDinh = 'pp', nhomHD = {}) {
    const DC = window.DOI_CHIEU;
    const k = khoangKy(ky);
    const { ban } = DC.chonHoaDon(docs, mst, k.tu, k.den);
    ban.sort((a, b) => (a.ngay || '').localeCompare(b.ngay || '') || String(a.kyHieu).localeCompare(String(b.kyHieu)) || (Number(a.so) - Number(b.so)));
    const canhBao = [];
    const ct = { ct21: 0, ct22: 0, ct23: 0, ct24: 0, ct25: 0, ct26: 0, ct27: 0, ct28: 0, ct29: 0, ct30: 0, ct31: 0, ct32: 0, ct36: 0, ct37: 0 };
    const hd = ban.map(h => {
      const t = DC.tachHoaDon(h);
      const tg = h.tien_te && h.tien_te !== 'VND' && Number(h.tyGia) > 0 ? Number(h.tyGia) : 1;
      const tong = h.tong != null ? h.tong * tg : t.V + t.T;
      const khongChiu = t.nguon === 'tong' ? 0 : t.kct + t.t0; // hoá đơn bán hàng không ghi thuế suất: không suy ra 0%
      const idx = docs.indexOf(h);
      const nhom = nhomHD[idx] || nhomMacDinh;
      if (t.T) canhBao.push({ muc: 'chu_y', noiDung: `HĐ ${h.kyHieu}-${h.so} ngày ${ngayVN(h.ngay)} có ghi thuế GTGT ${tienVN(t.T)} đ — doanh nghiệp khai 04/GTGT thường xuất hoá đơn bán hàng; app tính doanh thu theo giá thanh toán ${tienVN(tong)} đ.` });
      return { idx, kyHieu: h.kyHieu, so: h.so, ngay: h.ngay, ten: h.mua?.Ten || '', doanhThu: Math.round(tong - khongChiu), khongChiu: Math.round(khongChiu), nhom };
    });
    for (const r of hd) {
      ct.ct21 += r.khongChiu;
      const n = NHOM_04.find(x => x.ma === r.nhom) || NHOM_04[0];
      ct[n.dt] += r.doanhThu;
    }
    for (const n of NHOM_04) ct[n.thue] = Math.round(ct[n.dt] * n.tyLe / 100);
    ct.ct30 = ct.ct22 + ct.ct24 + ct.ct26 + ct.ct28;
    ct.ct31 = ct.ct23 + ct.ct25 + ct.ct27 + ct.ct29;
    ct.ct32 = ct.ct21 + ct.ct30;
    if (!hd.length) canhBao.push({ muc: 'chu_y', noiDung: `Không có hoá đơn bán ra nào của MST ${mst} trong ${k.ten}.` });
    canhBao.push({ muc: 'chu_y', noiDung: 'Nếu được giảm 20% mức tỷ lệ % (Nghị quyết giảm thuế GTGT) thì lập thêm phụ lục giảm thuế trong HTKK — app chưa lập phụ lục này cho 04/GTGT.' });
    return { ct, hd, canhBao, ky: k };
  }

  function xml04(tk, ky, dn, ngayLap = homNay()) {
    const k = khoangKy(ky), c = tk.ct;
    const so = key => `<${key}>${c[key]}</${key}>`;
    return dinhDang(`<?xml version="1.0" encoding="UTF-8"?>
<HSoThueDTu xmlns="http://kekhaithue.gdt.gov.vn/TKhaiThue" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<HSoKhaiThue id="ID_1">
<TTinChung>
<TTinDVu>
${the('maDVu', DICH_VU.maDVu)}
${the('tenDVu', DICH_VU.tenDVu)}
${the('pbanDVu', DICH_VU.pbanDVu)}
${the('ttinNhaCCapDVu', DICH_VU.ttinNhaCCapDVu)}
</TTinDVu>
<TTinTKhaiThue>
<TKhaiThue>
${the('maTKhai', MAU_04.maTKhai)}
${the('tenTKhai', MAU_04.tenTKhai)}
${the('moTaBMau', MO_TA)}
${the('pbanTKhaiXML', MAU_04.pban)}
<loaiTKhai>C</loaiTKhai>
<soLan>0</soLan>
<KyKKhaiThue>
<kieuKy>${ky.kieu}</kieuKy>
${the('kyKKhai', k.kyKKhai)}
${the('kyKKhaiTuNgay', k.tuVN)}
${the('kyKKhaiDenNgay', k.denVN)}
<kyKKhaiTuThang/>
<kyKKhaiDenThang/>
</KyKKhaiThue>
${the('maCQTNoiNop', dn.maCQTNoiNop)}
${the('tenCQTNoiNop', dn.tenCQTNoiNop)}
${the('ngayLapTKhai', ngayLap)}
<GiaHan>
<maLyDoGiaHan/>
<lyDoGiaHan/>
</GiaHan>
${the('nguoiKy', dn.nguoiKy)}
${the('ngayKy', ngayLap)}
<nganhNgheKD/>
</TKhaiThue>
<NNT>
${the('mst', dn.mst)}
${the('tenNNT', dn.tenNNT)}
${the('dchiNNT', dn.dchiNNT)}
${the('phuongXa', dn.phuongXa)}
<maHuyenNNT/>
<tenHuyenNNT/>
${the('maTinhNNT', dn.maTinhNNT)}
${the('tenTinhNNT', dn.tenTinhNNT)}
${the('dthoaiNNT', dn.dthoaiNNT)}
<faxNNT/>
${the('emailNNT', dn.emailNNT)}
</NNT>
</TTinTKhaiThue>
</TTinChung>
<CTieuTKhaiChinh>
<Header>
<khaiRiengThuHo>false</khaiRiengThuHo>
<ct09/>
<ct10/>
<ct11/>
<ct11a_ma/>
<ct11a_ten/>
<ct11b_ma/>
<ct11b_ten/>
<ct11c_ma/>
<ct11c_ten/>
</Header>
<KhaiThueTPPTTTDT>
${so('ct21')}
${NHOM_04.map(n => `<${n.the}>
${so(n.dt)}
${so(n.thue)}
</${n.the}>`).join('\n')}
<DoanhThuVaSoThuePNop>
${so('ct30')}
${so('ct31')}
</DoanhThuVaSoThuePNop>
${so('ct32')}
</KhaiThueTPPTTTDT>
<KhaiRiengDoiVoiKhoanThuHo>
<DoanhThuVaSoThuePhaiNop>
${so('ct36')}
${so('ct37')}
</DoanhThuVaSoThuePhaiNop>
</KhaiRiengDoiVoiKhoanThuHo>
</CTieuTKhaiChinh>
<PLuc/>
</HSoKhaiThue>
</HSoThueDTu>
`);
  }

  // ---------- Tờ khai 01/CNKD (hộ kinh doanh, cá nhân kinh doanh) — TT 18/2026, sửa đổi bởi TT 50/2026, mã 1266 ----------
  // Khuôn XML theo mẫu iTax tkhai_01_cnkd.xslt bản 2.9.8; cách ghi theo văn bản TT 50/2026 (mẫu 01/CNKD):
  //  - dành cho hộ có doanh thu năm trên 01 tỷ đồng; khai quý (1–50 tỷ) hoặc tháng (trên 50 tỷ);
  //  - mỗi nhóm ngành một dòng, mã chỉ tiêu (a)…(e); thuế GTGT = doanh thu chịu thuế × tỷ lệ;
  //  - thuế TNCN theo doanh thu: được trừ 01 tỷ đồng, trừ dần qua các kỳ, chọn ngành có lợi nhất trừ trước.
  // Tỷ lệ % theo bảng của Nghị định 68/2026/NĐ-CP (ngưỡng 01 tỷ theo NĐ 141/2026) — sửa được trên hộp thoại nếu văn bản thay đổi.
  const MAU_CNKD = { maTKhai: '1266', tenTKhai: 'TỜ KHAI THUẾ ĐỐI VỚI HỘ KINH DOANH, CÁ NHÂN KINH DOANH', pban: '2.9.8', maFile: '01_CNKD',
    moTa: '(Kèm theo Thông tư số 50/2026/TT-BTC ngày 13/5/2026 của Bộ trưởng Bộ Tài chính)' };
  const NHOM_CNKD = [
    { ma: '01', chiTieu: '(a)', ten: 'Phân phối, cung cấp hàng hóa', gtgt: 1, tncn: 0.5 },
    { ma: '02', chiTieu: '(b)', ten: 'Dịch vụ, xây dựng không bao thầu nguyên vật liệu', gtgt: 5, tncn: 2 },
    { ma: '03', chiTieu: '(c)', ten: 'Hoạt động cho thuê tài sản trừ bất động sản', gtgt: 5, tncn: 5 },
    { ma: '04', chiTieu: '(d)', ten: 'Sản xuất, vận tải, dịch vụ có gắn với hàng hóa, xây dựng có bao thầu nguyên vật liệu', gtgt: 3, tncn: 1.5 },
    { ma: '05', chiTieu: '(đ)', ten: 'Hoạt động cung cấp sản phẩm nội dung thông tin số về giải trí, trò chơi điện tử, phim số, ảnh số, nhạc số, quảng cáo số', gtgt: 5, tncn: 5 },
    { ma: '06', chiTieu: '(e)', ten: 'Hoạt động kinh doanh khác', gtgt: 2, tncn: 1 }
  ];
  const NGUONG_HKD = 1000000000; // 01 tỷ đồng/năm
  const TIEU_MUC_GTGT_HKD = { ma: '1701', ten: 'Thuế giá trị gia tăng hàng sản xuất, kinh doanh trong nước' };
  const TIEU_MUC_TNCN_HKD = { ma: '1003', ten: 'Thuế thu nhập cá nhân từ hoạt động sản xuất, kinh doanh của cá nhân' };

  /** Doanh thu (giá thanh toán) từng hoá đơn bán ra của MST trong khoảng ngày, tách phần không chịu thuế GTGT / thuế suất 0% */
  function doanhThuBan(docs, mst, tu, den) {
    const DC = window.DOI_CHIEU;
    const { ban } = DC.chonHoaDon(docs, mst, tu, den);
    ban.sort((a, b) => (a.ngay || '').localeCompare(b.ngay || '') || String(a.kyHieu).localeCompare(String(b.kyHieu)) || (Number(a.so) - Number(b.so)));
    return ban.map(h => {
      const t = DC.tachHoaDon(h);
      const tg = h.tien_te && h.tien_te !== 'VND' && Number(h.tyGia) > 0 ? Number(h.tyGia) : 1;
      return { h, idx: docs.indexOf(h), kyHieu: h.kyHieu, so: h.so, ngay: h.ngay, ten: h.mua?.Ten || '',
        // Hoá đơn bán hàng không ghi thuế suất: tachHoaDon suy "thuế = 0" thành 0% — chỉ tách KCT / 0% khi hoá đơn ghi rõ thuế suất
        tong: Math.round(h.tong != null ? h.tong * tg : t.V + t.T), kct: t.nguon === 'tong' ? 0 : Math.round(t.kct), t0: t.nguon === 'tong' ? 0 : Math.round(t.t0), coThue: !!t.T };
    });
  }

  /**
   * Tính 01/CNKD cho MST trong kỳ.
   * opt: { nhomMacDinh: '01'…'06', nhomHD: {idx: mã nhóm}, phuongPhap: 'doanhThu' | 'thuNhap',
   *        nguong: mức trừ cả năm (mặc định 01 tỷ), daTru: doanh thu đã trừ ở các kỳ trước trong năm (bỏ trống thì tự tính từ hoá đơn đang nạp) }
   */
  function tinhCNKD(docs, mst, ky, opt = {}) {
    const k = khoangKy(ky);
    const nguong = opt.nguong != null ? Number(opt.nguong) : NGUONG_HKD;
    const thuNhap = opt.phuongPhap === 'thuNhap';
    const canhBao = [];
    const hd = doanhThuBan(docs, mst, k.tu, k.den).map(r => ({ ...r, nhom: (opt.nhomHD || {})[r.idx] || opt.nhomMacDinh || '01' }));
    // Doanh thu các kỳ trước trong năm (từ hoá đơn đang nạp) → phần 01 tỷ đã trừ
    const truocKy = k.tu > `${ky.nam}-01-01` ? doanhThuBan(docs, mst, `${ky.nam}-01-01`, ngayTruoc(k.tu)) : [];
    const dtTruoc = truocKy.reduce((s, r) => s + r.tong, 0);
    const daTruTuDong = Math.min(nguong, dtTruoc);
    const daTru = opt.daTru != null && opt.daTru !== '' ? Math.max(0, Number(opt.daTru)) : daTruTuDong;
    const dtNam = doanhThuBan(docs, mst, `${ky.nam}-01-01`, `${ky.nam}-12-31`).reduce((s, r) => s + r.tong, 0);

    const dong = NHOM_CNKD.map(n => {
      const ds = hd.filter(r => r.nhom === n.ma);
      const ct11 = ds.reduce((s, r) => s + r.tong, 0), ct12 = ds.reduce((s, r) => s + r.kct, 0), ct13 = ds.reduce((s, r) => s + r.t0, 0);
      return { n, soHD: ds.length, ct11, ct12, ct13, ct14: Math.round((ct11 - ct12 - ct13) * n.gtgt / 100), ct15: thuNhap ? 0 : ct11, ct16: 0, ct17: 0 };
    }).filter(d => d.soHD);
    // Mức trừ còn lại trong năm: trừ vào nhóm có thuế suất TNCN cao nhất trước (phương án có lợi nhất)
    let conLai = thuNhap ? 0 : Math.max(0, nguong - daTru);
    for (const d of [...dong].sort((a, b) => b.n.tncn - a.n.tncn)) {
      d.ct16 = Math.min(d.ct15, conLai); conLai -= d.ct16;
      d.ct17 = Math.round((d.ct15 - d.ct16) * d.n.tncn / 100);
    }
    const tong = key => dong.reduce((s, d) => s + d[key], 0);
    const ct = { tongCT11: tong('ct11'), tongCT12: tong('ct12'), tongCT13: tong('ct13'), tongCT14: tong('ct14'), tongCT15: tong('ct15'), tongCT16: tong('ct16'), tongCT17: tong('ct17') };

    if (!hd.length) canhBao.push({ muc: 'chu_y', noiDung: `Không có hoá đơn bán ra nào của MST ${mst} trong ${k.ten}.` });
    if (hd.some(r => r.coThue)) canhBao.push({ muc: 'chu_y', noiDung: `Có ${hd.filter(r => r.coThue).length} hoá đơn ghi thuế GTGT riêng — hộ kinh doanh thường xuất hoá đơn bán hàng; app tính doanh thu theo giá thanh toán.` });
    if (dtNam <= nguong) canhBao.push({ muc: 'chu_y', noiDung: `Doanh thu cả năm ${ky.nam} theo hoá đơn đang nạp là ${tienVN(dtNam)} đ, chưa vượt ${tienVN(nguong)} đ: hộ có doanh thu năm từ 01 tỷ trở xuống không phải nộp thuế GTGT, TNCN và thông báo doanh thu theo mẫu 01/TKN-CNKD (không khai 01/CNKD). Kiểm tra lại nếu còn doanh thu chưa có hoá đơn.` });
    if (dtNam > 50000000000 && ky.kieu === 'Q') canhBao.push({ muc: 'loi', noiDung: 'Doanh thu năm trên 50 tỷ đồng: theo TT 50/2026 phải khai theo THÁNG, không khai quý.' });
    if (thuNhap) canhBao.push({ muc: 'chu_y', noiDung: 'Nộp thuế TNCN theo thu nhập tính thuế: tờ khai chỉ kê doanh thu và thuế GTGT; thuế TNCN tạm nộp tính theo thu nhập (doanh thu trừ chi phí) — app không có số liệu chi phí nên để trống phần TNCN.' });
    else if (dtNam > 3000000000) canhBao.push({ muc: 'chu_y', noiDung: `Doanh thu năm ${tienVN(dtNam)} đ trên 03 tỷ đồng: kiểm tra hộ có thuộc diện nộp thuế TNCN theo thu nhập tính thuế không (khi đó chọn phương pháp "theo thu nhập").` });
    if (opt.daTru == null || opt.daTru === '') {
      if (truocKy.length) canhBao.push({ muc: 'chu_y', noiDung: `Mức trừ 01 tỷ: các kỳ trước trong năm đã có ${tienVN(dtTruoc)} đ doanh thu (theo hoá đơn đang nạp) nên đã trừ ${tienVN(daTruTuDong)} đ. Nếu tờ khai các kỳ trước trừ khác, sửa ô "Đã trừ ở các kỳ trước".` });
      else if (k.tu > `${ky.nam}-01-01`) canhBao.push({ muc: 'chu_y', noiDung: 'Không có hoá đơn các kỳ trước trong năm nên app coi như chưa trừ đồng nào. Nếu các kỳ trước đã trừ, nhập ở ô "Đã trừ ở các kỳ trước".' });
    }
    return { dong, ct, hd, canhBao, ky: k, nguong, daTru, conLaiKySau: thuNhap ? 0 : conLai, thuNhap, dtNam };
  }
  const ngayTruoc = iso => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };

  function xmlCNKD(tk, ky, dn, ngayLap = homNay()) {
    const k = khoangKy(ky), c = tk.ct;
    const dongXml = tk.dong.map(d => `<CTietDoanhThu>
${the('ct09_ma', d.n.ma)}
${the('ct09_ten', d.n.ten)}
${the('ct10', d.n.chiTieu)}
<ct11>${d.ct11}</ct11>
<ct12>${d.ct12}</ct12>
<ct13>${d.ct13}</ct13>
${the('ct14_maTieuMuc', TIEU_MUC_GTGT_HKD.ma)}
${the('ct14_tenTieuMuc', TIEU_MUC_GTGT_HKD.ten)}
<ct14_soThue>${d.ct14}</ct14_soThue>
<ct15>${d.ct15}</ct15>
<ct16>${d.ct16}</ct16>
${tk.thuNhap ? '<ct17_maTieuMuc/>\n<ct17_tenTieuMuc/>' : `${the('ct17_maTieuMuc', TIEU_MUC_TNCN_HKD.ma)}\n${the('ct17_tenTieuMuc', TIEU_MUC_TNCN_HKD.ten)}`}
<ct17_soThue>${d.ct17}</ct17_soThue>
</CTietDoanhThu>`).join('\n');
    const nopThue = [
      c.tongCT14 ? [TIEU_MUC_GTGT_HKD, c.tongCT14] : null,
      c.tongCT17 ? [TIEU_MUC_TNCN_HKD, c.tongCT17] : null
    ].filter(Boolean);
    return dinhDang(`<?xml version="1.0" encoding="UTF-8"?>
<HSoThueDTu xmlns="http://kekhaithue.gdt.gov.vn/TKhaiThue" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<HSoKhaiThue id="ID_1">
<TTinChung>
<TTinDVu>
${the('maDVu', DICH_VU.maDVu)}
${the('tenDVu', DICH_VU.tenDVu)}
${the('pbanDVu', DICH_VU.pbanDVu)}
${the('ttinNhaCCapDVu', DICH_VU.ttinNhaCCapDVu)}
</TTinDVu>
<TTinTKhaiThue>
<TKhaiThue>
${the('maTKhai', MAU_CNKD.maTKhai)}
${the('tenTKhai', MAU_CNKD.tenTKhai)}
${the('moTaBMau', MAU_CNKD.moTa)}
${the('pbanTKhaiXML', MAU_CNKD.pban)}
<loaiTKhai>C</loaiTKhai>
<soLan>0</soLan>
<KyKKhaiThue>
<kieuKy>${ky.kieu}</kieuKy>
${the('kyKKhai', k.kyKKhai)}
${the('kyKKhaiTuNgay', k.tuVN)}
${the('kyKKhaiDenNgay', k.denVN)}
<kyKKhaiTuThang/>
<kyKKhaiDenThang/>
</KyKKhaiThue>
${the('maCQTNoiNop', dn.maCQTNoiNop)}
${the('tenCQTNoiNop', dn.tenCQTNoiNop)}
${the('ngayLapTKhai', ngayLap)}
<GiaHan>
<maLyDoGiaHan/>
<lyDoGiaHan/>
</GiaHan>
${the('nguoiKy', dn.nguoiKy)}
${the('ngayKy', ngayLap)}
<nganhNgheKD/>
</TKhaiThue>
<NNT>
${the('mst', dn.mst)}
${the('tenNNT', dn.tenNNT)}
${the('dchiNNT', dn.dchiNNT)}
${the('phuongXa', dn.phuongXa)}
<maHuyenNNT/>
<tenHuyenNNT/>
${the('maTinhNNT', dn.maTinhNNT)}
${the('tenTinhNNT', dn.tenTinhNNT)}
${the('dthoaiNNT', dn.dthoaiNNT)}
<faxNNT/>
${the('emailNNT', dn.emailNNT)}
</NNT>
</TTinTKhaiThue>
</TTinChung>
<CTieuTKhaiChinh>
<mst_cu/>
<Header>
<nopThueTNCNDoanhThu>${tk.thuNhap ? 'false' : 'true'}</nopThueTNCNDoanhThu>
<nopThueTNCNThunhapTinhThue>${tk.thuNhap ? 'true' : 'false'}</nopThueTNCNThunhapTinhThue>
<hoatDongTMDT>false</hoatDongTMDT>
<hoatDongKhac>false</hoatDongKhac>
<hoatDongLPS>false</hoatDongLPS>
<ToChucNopThueThay>
<ct6_ten/>
<ct6_1_ma/>
<ct6_2_so/>
<ct6_2_ngay xsi:nil="true"/>
</ToChucNopThueThay>
</Header>
<KhaiThueGTGTTNCN>
<KinhDoanhDiaDiemCoDinh>
<DoanhThuThueGTGTTNCN>
<stt>1</stt>
<truSoChinh>true</truSoChinh>
${the('mst_diaDiemKD', dn.mst)}
<ma_diaDiemKD/>
${the('ten_diaDiemKD', dn.tenNNT)}
<diaChi_diaDiemKD>
${the('diaChi', dn.dchiNNT)}
<ma_xaPhuong/>
${the('ten_xaPhuong', dn.phuongXa)}
${the('ma_tinh', dn.maTinhNNT)}
${the('ten_tinh', dn.tenTinhNNT)}
</diaChi_diaDiemKD>
${dongXml}
</DoanhThuThueGTGTTNCN>
</KinhDoanhDiaDiemCoDinh>
<TongCongCT18>
${['tongCT11', 'tongCT12', 'tongCT13', 'tongCT14', 'tongCT15', 'tongCT16', 'tongCT17'].map(x => `<${x}>${c[x]}</${x}>`).join('\n')}
</TongCongCT18>
<SoThueMienCT19>
<soThueDuocMienCT14>0</soThueDuocMienCT14>
<soThueDuocMienCT17>0</soThueDuocMienCT17>
</SoThueMienCT19>
<SoThueConPhaiNopCT20>
<soThueGTGT_ct14>${c.tongCT14}</soThueGTGT_ct14>
<soThueTNCN_ct17>${c.tongCT17}</soThueTNCN_ct17>
</SoThueConPhaiNopCT20>
</KhaiThueGTGTTNCN>
<HoTroThongTinNopThue>
${nopThue.map(([tm, tien]) => `<ChiTietThongTinNopTHue>
${the('ct38_mst', dn.mst)}
<ct38_ma/>
${the('ct38_ten', dn.tenNNT)}
${the('ct39', tm.ten)}
<ct40>${tien}</ct40>
<soTienChenhLech>0</soTienChenhLech>
<ct41_ma/>
${the('ct42_ma', tm.ma)}
<ct43_maDBHC/>
<ct43_tenDBHC/>
<ct44_maCQThu/>
<ct44_tenCQThu/>
${the('ct45_maCQThue', dn.maCQTNoiNop)}
${the('ct45_tenCQThue', dn.tenCQTNoiNop)}
${the('ct46', hanNop(ky))}
</ChiTietThongTinNopTHue>`).join('\n')}
<tongTienCT47>${c.tongCT14 + c.tongCT17}</tongTienCT47>
</HoTroThongTinNopThue>
<soTienTruKyTiep>${tk.conLaiKySau}</soTienTruKyTiep>
</CTieuTKhaiChinh>
<PLuc/>
</HSoKhaiThue>
</HSoThueDTu>
`);
  }

  /** Tên tệp theo cách HTKK đặt: <MST>000-01_GTGT_TT80-Q32026-L00.xml (kỳ tháng: -M102026-; bổ sung lần n: -L0n) */
  const tenFile = (ky, mst, maFile = MAU.maFile, soLan = 0) => `${String(mst).replace(/[^0-9-]/g, '')}000-${maFile}-${ky.kieu === 'Q' ? 'Q' + ky.quy : 'M' + pad(ky.thang)}${ky.nam}-L${pad(soLan)}.xml`;

  window.LAP_TO_KHAI = { tinhGTGT, xmlGTGT, khoangKy, kyTruoc, timCt22, thongTinDN, tenFile, NHAP_TAY_TRONG,
    tinhKHBS, xmlKHBS, toKhaiMoiNhat, hanNop, tinh04, xml04, NHOM_04, MAU_04, tinhCNKD, xmlCNKD, NHOM_CNKD, MAU_CNKD, NGUONG_HKD };
})();
