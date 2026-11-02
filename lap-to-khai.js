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

  function xmlGTGT(tk, ky, dn, ngayLap = homNay()) {
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
${coPhuLuc ? `<PLuc>
<PL_NQ142_GTGT>
${[plMua, plBan].filter(Boolean).join('\n')}
<ChenhLech>
<ct9>${tk.ct9}</ct9>
</ChenhLech>
</PL_NQ142_GTGT>
</PLuc>` : '<PLuc/>'}`;
    return dinhDang(`<?xml version="1.0" encoding="UTF-8"?>
<HSoThueDTu xmlns="http://kekhaithue.gdt.gov.vn/TKhaiThue" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<HSoKhaiThue id="ID_1">
${body}
</HSoKhaiThue>
</HSoThueDTu>
`);
  }

  /** Tên tệp theo cách HTKK đặt: <MST>000-01_GTGT_TT80-Q32026-L00.xml (kỳ tháng: -M102026-) */
  const tenFile = (ky, mst) => `${String(mst).replace(/[^0-9-]/g, '')}000-${MAU.maFile}-${ky.kieu === 'Q' ? 'Q' + ky.quy : 'M' + pad(ky.thang)}${ky.nam}-L00.xml`;

  window.LAP_TO_KHAI = { tinhGTGT, xmlGTGT, khoangKy, kyTruoc, timCt22, thongTinDN, tenFile, NHAP_TAY_TRONG };
})();
