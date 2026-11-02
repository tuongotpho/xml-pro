// doi-chieu.js — Đối chiếu tờ khai 01/GTGT với hoá đơn điện tử và giấy nộp tiền đã nạp trong app.
// Mỗi tờ khai đối chiếu riêng theo MST và kỳ (tháng / quý) của chính nó, nên dùng được cho nhiều công ty
// (kế toán dịch vụ). Quy tắc tính chỉ tiêu theo app khai thuế (F:\AI\4.August\apps\khaithue\app\src\core\gtgt.ts),
// đã khớp với tờ khai HTKK nộp thật:
//   [23]/[24] = cộng giá trị / thuế mọi HĐ mua vào trong kỳ
//   [26] KCT · [29] 0% · [30]/[31] 5% · [32]/[33] 8% + 10% (thuế thật trên HĐ) · [32a] KKKNT · [34]/[35] tổng bán ra
//   Phụ lục NQ142: mua vào kê phần 8% theo người bán; bán ra kê phần 8% theo người mua, thuế được giảm = 2%.
// Chạy hoàn toàn trên máy, không gửi gì đi đâu.
(() => {
  'use strict';

  const so = s => { const n = Number(String(s ?? '').trim()); return isFinite(n) ? n : 0; };
  const sachMst = s => String(s || '').replace(/[^0-9]/g, '');
  const tenChuan = s => String(s || '').normalize('NFC').toUpperCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const ddmmyyyy = s => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(s || '').trim()); return m ? `${m[3]}-${pad(m[2])}-${pad(m[1])}` : ''; };

  // ---------- Đọc tờ khai ----------
  function docXml(d) {
    if (d._dcXml !== undefined) return d._dcXml;
    try {
      const x = new DOMParser().parseFromString(String(d.rawXml || '').replace(/^\uFEFF/, ''), 'application/xml');
      d._dcXml = x.getElementsByTagName('parsererror').length ? null : x;
    } catch (e) { d._dcXml = null; }
    return d._dcXml;
  }
  const theo = (el, ten) => el ? Array.from(el.getElementsByTagNameNS('*', ten)) : [];
  const chu = (el, ten) => { const e = theo(el, ten)[0]; return e ? e.textContent.trim() : ''; };

  /** Tờ khai 01/GTGT (khấu trừ): có các chỉ tiêu [23] và [32] trong phần chính */
  function laToKhaiGTGT(d) {
    if (!d || d.kind !== 'tk' || !d.rawXml) return false;
    if (d._laGTGT !== undefined) return d._laGTGT;
    const x = docXml(d);
    const chinh = x && theo(x, 'CTieuTKhaiChinh')[0];
    return (d._laGTGT = !!(chinh && theo(chinh, 'ct23').length && theo(chinh, 'ct32').length));
  }

  function docToKhai(d) {
    if (d._dcTk) return d._dcTk;
    const x = docXml(d);
    const chinh = theo(x, 'CTieuTKhaiChinh')[0];
    const ct = {};
    for (const e of chinh.getElementsByTagName('*')) {
      if (/^ct\d+[a-z]?$/.test(e.localName) && !e.children.length && !(e.localName in ct)) ct[e.localName] = so(e.textContent);
    }
    const tk = theo(x, 'TKhaiThue')[0];
    const ky = theo(x, 'KyKKhaiThue')[0];
    const kieuKy = chu(ky, 'kieuKy').toUpperCase();
    const kyTxt = chu(ky, 'kyKKhai');
    let tu = ddmmyyyy(chu(ky, 'kyKKhaiTuNgay')), den = ddmmyyyy(chu(ky, 'kyKKhaiDenNgay'));
    let quy = 0, thang = 0, nam = 0;
    const mQ = /^(\d)\/(\d{4})$/.exec(kyTxt), mM = /^(\d{1,2})\/(\d{4})$/.exec(kyTxt);
    if (kieuKy === 'Q' && mQ) { quy = +mQ[1]; nam = +mQ[2]; }
    else if (mM) { thang = +mM[1]; nam = +mM[2]; }
    if ((!tu || !den) && nam) {
      const t0 = quy ? new Date(nam, (quy - 1) * 3, 1) : new Date(nam, thang - 1, 1);
      const t1 = quy ? new Date(nam, quy * 3, 0) : new Date(nam, thang, 0);
      tu = iso(t0); den = iso(t1);
    }
    // Phụ lục giảm thuế GTGT (NQ142 / NQ204…)
    const pl = theo(x, 'PLuc')[0];
    const plGiam = pl && Array.from(pl.children).find(c => /GTGT/i.test(c.localName) && theo(c, 'BangKeTenHHDV').length);
    let plMua = null, plBan = null;
    if (plGiam) {
      const m = theo(plGiam, 'HH_DV_MuaVaoTrongKy')[0], b = theo(plGiam, 'HH_DV_BanRaTrongKy')[0];
      if (m) plMua = theo(m, 'BangKeTenHHDV').map(r => ({ ten: chu(r, 'tenHHDVMuaVao'), giaTri: so(chu(r, 'giaTriHHDVMuaVao')), thue: so(chu(r, 'thueGTGTHHDV')) })).filter(r => r.ten || r.giaTri);
      if (b) plBan = theo(b, 'BangKeTenHHDV').map(r => ({ ten: chu(r, 'tenHHDV'), giaTri: so(chu(r, 'giaTriHHDV')), giam: so(chu(r, 'thueGTGTDuocGiam')) })).filter(r => r.ten || r.giaTri);
    }
    return (d._dcTk = {
      ct, mst: sachMst(chu(theo(x, 'NNT')[0], 'mst')), ten: chu(theo(x, 'NNT')[0], 'tenNNT'),
      kieuKy: quy ? 'Q' : 'M', quy, thang, nam, tu, den,
      kyTen: quy ? `Quý ${quy}/${nam}` : `Tháng ${pad(thang)}/${nam}`,
      lanDau: chu(tk, 'loaiTKhai').toUpperCase() !== 'B' && !so(chu(tk, 'soLan')),
      soLan: so(chu(tk, 'soLan')), plMua, plBan
    });
  }

  // ---------- Hoá đơn: tách giá trị / thuế theo thuế suất ----------
  const nhomThueSuat = ts => {
    const t = String(ts || '').toUpperCase().replace(/\s+/g, '');
    if (t === 'KCT') return 'kct';
    if (t === 'KKKNT') return 'kkknt';
    const m = /^(\d+(?:[.,]\d+)?)%?$/.exec(t);
    if (!m) return 'khac';
    const p = Number(m[1].replace(',', '.'));
    return p === 0 ? 't0' : p === 5 ? 't5' : p === 8 ? 't8' : p === 10 ? 't10' : 'khac';
  };
  function tachHoaDon(inv) {
    if (inv._dcTach) return inv._dcTach;
    const tg = inv.tien_te && inv.tien_te !== 'VND' && Number(inv.tyGia) > 0 ? Number(inv.tyGia) : 1;
    const kq = { kct: 0, t0: 0, v5: 0, t5: 0, v8: 0, t8: 0, v10: 0, t10: 0, kkknt: 0, vKhac: 0, tKhac: 0, V: 0, T: 0, nguon: '' };
    const cong = (nhom, v, t) => {
      v *= tg; t *= tg;
      if (nhom === 'kct') kq.kct += v; else if (nhom === 'kkknt') kq.kkknt += v; else if (nhom === 't0') kq.t0 += v;
      else if (nhom === 't5') { kq.v5 += v; kq.t5 += t; } else if (nhom === 't8') { kq.v8 += v; kq.t8 += t; }
      else if (nhom === 't10') { kq.v10 += v; kq.t10 += t; } else { kq.vKhac += v; kq.tKhac += t; }
    };
    if (inv.thueSuat && inv.thueSuat.length) {
      kq.nguon = 'bang';
      for (const l of inv.thueSuat) cong(nhomThueSuat(l.ts), l.tien || 0, l.thue || 0);
    } else if (inv.lines && inv.lines.some(l => l.ts)) {
      kq.nguon = 'dong';
      for (const l of inv.lines) {
        if (l.tchat === '4' || l.tien == null) continue;
        const dau = l.tchat === '3' ? -1 : 1;
        const thue = l.thue != null ? l.thue : 0;
        cong(nhomThueSuat(l.ts), dau * Math.abs(l.tien), dau * Math.abs(thue));
      }
    } else {
      kq.nguon = 'tong';
      const V = inv.tongTruocThue || 0, T = inv.tongThue || 0, r = V ? T / V : 0;
      cong(T === 0 ? 't0' : Math.abs(r - 0.08) < 0.001 ? 't8' : Math.abs(r - 0.1) < 0.001 ? 't10' : Math.abs(r - 0.05) < 0.001 ? 't5' : 'khac', V, T);
    }
    // Tổng của cả hoá đơn lấy theo dòng "Cộng tiền hàng / Tiền thuế" in trên hoá đơn khi có
    kq.V = inv.tongTruocThue != null ? inv.tongTruocThue * tg : kq.kct + kq.t0 + kq.v5 + kq.v8 + kq.v10 + kq.kkknt + kq.vKhac;
    kq.T = inv.tongThue != null ? inv.tongThue * tg : kq.t5 + kq.t8 + kq.t10 + kq.tKhac;
    return (inv._dcTach = kq);
  }

  // ---------- Giấy nộp tiền: số đã nộp thuế GTGT (mã 1701) theo kỳ ----------
  function docGiayNop(d) {
    if (d._dcGnt !== undefined) return d._dcGnt;
    const x = d.kind === 'ct' && docXml(d);
    if (!x) return (d._dcGnt = null);
    const mst = sachMst(chu(x, 'MST_NNOP'));
    const dong = theo(x, 'MA_NDKT').map(e => {
      const p = e.parentElement;
      return { ndkt: e.textContent.trim(), ky: chu(p, 'KY_THUE'), tien: so(chu(p, 'TIEN_PNOP')) };
    });
    return (d._dcGnt = { mst, ngay: chu(x, 'NGAY_LAP') || chu(x, 'NGAY_CTU'), so: chu(x, 'SO_CTU'), dong });
  }
  const kyKhop = (kyThue, tk) => {
    const k = String(kyThue || '').toUpperCase();
    const q = /Q(\d)\/(\d{4})/.exec(k);
    if (q) return tk.kieuKy === 'Q' && +q[1] === tk.quy && +q[2] === tk.nam;
    const m = /(\d{1,2})\/(\d{4})$/.exec(k);
    return !!m && tk.kieuKy === 'M' && +m[1] === tk.thang && +m[2] === tk.nam;
  };

  // ---------- Đối chiếu ----------
  const dungSai = n => Math.max(5, n); // làm tròn từng hoá đơn / từng dòng
  const tien = n => Math.round(n).toLocaleString('vi-VN');

  /**
   * Hoá đơn của một MST trong kỳ [tu, den] (ngày dạng YYYY-MM-DD) — dùng chung cho ĐỐI CHIẾU và LẬP tờ khai.
   * HĐ nạp trùng chỉ tính một lần; HĐ gốc đã có HĐ thay thế đang nạp thì không tính bản gốc.
   */
  function chonHoaDon(docs, mst, tu, den) {
    mst = sachMst(mst);
    const hoaDon = [];
    const daCo = new Set();
    for (const d of docs) {
      if (d.kind !== 'hd' || d.error) continue;
      const k = `${sachMst(d.ban?.MST)}_${(d.kyHieu || '').trim()}_${(d.so || '').trim()}`;
      if (daCo.has(k)) continue;
      daCo.add(k);
      hoaDon.push(d);
    }
    const laBan = d => sachMst(d.ban?.MST) === mst;
    const laMua = d => sachMst(d.mua?.MST) === mst;
    const trongKy = d => d.ngay >= tu && d.ngay <= den;
    const conHieuLuc = d => !(d.thayTheBoi && d.thayTheBoi.lienQuan?.tc === '1');
    const cuaDn = hoaDon.filter(d => (laBan(d) || laMua(d)) && conHieuLuc(d));
    return {
      mua: cuaDn.filter(d => laMua(d) && trongKy(d)),
      ban: cuaDn.filter(d => laBan(d) && trongKy(d)),
      ngoaiKy: cuaDn.filter(d => !trongKy(d)),
      laBan, laMua
    };
  }

  function doiChieuMot(tkDoc, docs, idxCua) {
    const tk = docToKhai(tkDoc);
    const { mua, ban, ngoaiKy, laBan, laMua } = chonHoaDon(docs, tk.mst, tk.tu, tk.den);

    const cong = (ds, f) => ds.reduce((s, d) => s + f(tachHoaDon(d)), 0);
    const ct = tk.ct;
    const dong = [];
    const them = (ma, ten, toKhai, hd, ben, lay, n) => {
      if (toKhai === undefined) return;
      const lech = Math.round(toKhai - hd);
      const r = { ma, ten, toKhai, hoaDon: Math.round(hd), lech, khop: Math.abs(lech) <= dungSai(n), ben, goiY: [] };
      if (!r.khop && lay) r.goiY = goiY(r, ben, lay, ben === 'mua' ? mua : ban, ngoaiKy.filter(ben === 'mua' ? laMua : laBan), idxCua);
      dong.push(r);
    };
    const nMua = mua.length, nBan = ban.length;
    them('[23]', 'Giá trị HHDV mua vào', ct.ct23, cong(mua, t => t.V), 'mua', t => t.V, nMua);
    them('[24]', 'Thuế GTGT HHDV mua vào', ct.ct24, cong(mua, t => t.T), 'mua', t => t.T, nMua);
    them('[26]', 'Bán ra không chịu thuế (KCT)', ct.ct26, cong(ban, t => t.kct), 'ban', t => t.kct, nBan);
    them('[29]', 'Bán ra thuế suất 0%', ct.ct29, cong(ban, t => t.t0), 'ban', t => t.t0, nBan);
    them('[30]', 'Bán ra 5% — giá trị', ct.ct30, cong(ban, t => t.v5), 'ban', t => t.v5, nBan);
    them('[31]', 'Bán ra 5% — thuế', ct.ct31, cong(ban, t => t.t5), 'ban', t => t.t5, nBan);
    them('[32]', 'Bán ra 10% (gồm hàng giảm còn 8%) — giá trị', ct.ct32, cong(ban, t => t.v8 + t.v10), 'ban', t => t.v8 + t.v10, nBan);
    them('[33]', 'Bán ra 10% / 8% — thuế', ct.ct33, cong(ban, t => t.t8 + t.t10), 'ban', t => t.t8 + t.t10, nBan);
    them('[32a]', 'Bán ra không kê khai, tính nộp thuế (KKKNT)', ct.ct32a, cong(ban, t => t.kkknt), 'ban', t => t.kkknt, nBan);
    them('[34]', 'Tổng doanh thu bán ra', ct.ct34, cong(ban, t => t.V), 'ban', t => t.V, nBan);
    them('[35]', 'Tổng thuế GTGT bán ra', ct.ct35, cong(ban, t => t.T), 'ban', t => t.T, nBan);

    // Phụ lục giảm thuế: so từng đối tác (theo tên, vì phụ lục không ghi MST)
    const phuLuc = [];
    const soPhuLuc = (ds, dsHd, tenDoiTac, layGT, layThue, ben) => {
      if (!ds) return;
      const gom = new Map();
      for (const d of dsHd) {
        const t = tachHoaDon(d);
        if (!t.v8) continue;
        const k = tenChuan(tenDoiTac(d));
        const g = gom.get(k) || { ten: tenDoiTac(d), giaTri: 0, thue: 0, hd: [] };
        g.giaTri += t.v8; g.thue += t.t8; g.hd.push(d); gom.set(k, g);
      }
      for (const r of ds) {
        const k = tenChuan(r.ten);
        const g = gom.get(k);
        gom.delete(k);
        const gtHd = g ? g.giaTri : 0, thueHd = g ? (ben === 'ban' ? Math.round(g.giaTri * 0.02) : g.thue) : 0;
        const lechGT = Math.round(layGT(r) - gtHd), lechThue = Math.round(layThue(r) - thueHd);
        phuLuc.push({ ben, ten: r.ten, toKhai: layGT(r), hoaDon: Math.round(gtHd), thueToKhai: layThue(r), thueHoaDon: thueHd,
          khop: Math.abs(lechGT) <= dungSai(g ? g.hd.length : 1) && Math.abs(lechThue) <= dungSai(g ? g.hd.length : 1),
          hd: g ? g.hd.map(idxCua) : [], ghiChu: g ? '' : 'Không thấy hoá đơn 8% nào của đối tác này trong kỳ' });
      }
      for (const g of gom.values()) {
        phuLuc.push({ ben, ten: g.ten, toKhai: 0, hoaDon: Math.round(g.giaTri), thueToKhai: 0, thueHoaDon: ben === 'ban' ? Math.round(g.giaTri * 0.02) : Math.round(g.thue),
          khop: false, hd: g.hd.map(idxCua), ghiChu: 'Có hoá đơn 8% nhưng phụ lục không kê đối tác này' });
      }
    };
    soPhuLuc(tk.plMua, mua, d => d.ban?.Ten || '', r => r.giaTri, r => r.thue, 'mua');
    soPhuLuc(tk.plBan, ban, d => d.mua?.Ten || '', r => r.giaTri, r => r.giam, 'ban');

    // Số học trong chính tờ khai (công thức HTKK)
    const noiBo = [];
    const kiem = (bt, trai, phai) => { if (trai === undefined || phai === undefined || isNaN(phai)) return; noiBo.push({ bt, trai, phai: Math.round(phai), khop: Math.abs(trai - phai) <= 5 }); };
    const c = k => ct[k] === undefined ? 0 : ct[k];
    kiem('[25] = [24] + [24a]', ct.ct25, c('ct24') + c('ct24a'));
    kiem('[27] = [29] + [30] + [32] + [32a]', ct.ct27, c('ct29') + c('ct30') + c('ct32') + c('ct32a'));
    kiem('[28] = [31] + [33]', ct.ct28, c('ct31') + c('ct33'));
    kiem('[34] = [26] + [27]', ct.ct34, c('ct26') + c('ct27'));
    kiem('[35] = [28]', ct.ct35, c('ct28'));
    kiem('[36] = [35] − [25]', ct.ct36, c('ct35') - c('ct25'));
    const x = c('ct36') - c('ct22') + c('ct37') - c('ct38') - c('ct39a');
    kiem('[40a] = [36] − [22] + [37] − [38] − [39a] (nếu dương)', ct.ct40a, Math.max(x, 0));
    kiem('[41] = phần âm của [36] − [22] + [37] − [38] − [39a]', ct.ct41, Math.max(-x, 0));
    kiem('[40] = [40a] − [40b]', ct.ct40, Math.max(c('ct40a') - c('ct40b'), 0));
    kiem('[43] = [41] − [42]', ct.ct43, c('ct41') - c('ct42'));
    if (tk.plBan) {
      const giam = tk.plBan.reduce((s, r) => s + r.giam, 0);
      kiem('[33] = 10% × [32] − thuế được giảm (phụ lục NQ142)', ct.ct33, Math.round(c('ct32') * 0.1) - giam);
    }

    // Đầu kỳ – cuối kỳ: [22] phải = [43] tờ khai LẦN ĐẦU kỳ liền trước
    let dauKy = null;
    const truoc = tk.kieuKy === 'Q' ? (tk.quy === 1 ? { quy: 4, nam: tk.nam - 1 } : { quy: tk.quy - 1, nam: tk.nam })
      : (tk.thang === 1 ? { thang: 12, nam: tk.nam - 1 } : { thang: tk.thang - 1, nam: tk.nam });
    const tkTruoc = docs.find(d => laToKhaiGTGT(d) && d !== tkDoc && (() => {
      const t = docToKhai(d);
      return t.mst === tk.mst && t.lanDau && t.kieuKy === tk.kieuKy && t.nam === truoc.nam && (tk.kieuKy === 'Q' ? t.quy === truoc.quy : t.thang === truoc.thang);
    })());
    if (tkTruoc) {
      const c43 = docToKhai(tkTruoc).ct.ct43 || 0;
      dauKy = { ky: docToKhai(tkTruoc).kyTen, ct22: c('ct22'), ct43Truoc: c43, khop: c('ct22') === c43, idx: idxCua(tkTruoc) };
    }

    // Giấy nộp tiền thuế GTGT (tiểu mục 1701) cùng MST, cùng kỳ
    let daNop = null;
    const gnt = docs.map(d => [d, docGiayNop(d)]).filter(([, g]) => g && g.mst === tk.mst);
    if (gnt.length) {
      let tong = 0; const ct2 = [];
      for (const [d, g] of gnt) {
        const t = g.dong.filter(r => r.ndkt === '1701' && kyKhop(r.ky, tk)).reduce((s, r) => s + r.tien, 0);
        if (t) { tong += t; ct2.push({ idx: idxCua(d), so: g.so, ngay: g.ngay, tien: t }); }
      }
      if (ct2.length) daNop = { phaiNop: c('ct40'), daNop: tong, chungTu: ct2, khop: tong === c('ct40') };
    }

    const soLech = dong.filter(r => !r.khop).length + phuLuc.filter(r => !r.khop).length + noiBo.filter(r => !r.khop).length
      + (dauKy && !dauKy.khop ? 1 : 0) + (daNop && !daNop.khop ? 1 : 0);
    const trangThai = !mua.length && !ban.length ? 'chuaCoHD' : soLech ? 'lech' : 'khop';
    return { tkIdx: idxCua(tkDoc), tk, soMua: mua.length, soBan: ban.length, dong, phuLuc, noiBo, dauKy, daNop, soLech, trangThai };
  }

  // Tìm hoá đơn giải thích được chỗ lệch: một HĐ có đúng số tiền bằng phần lệch
  function goiY(r, ben, lay, trongKy, ngoaiKy, idxCua) {
    const can = Math.abs(r.lech);
    const kq = [];
    const khop = d => Math.abs(Math.abs(lay(tachHoaDon(d))) - can) <= 5;
    if (r.lech < 0) {
      for (const d of trongKy) if (khop(d)) kq.push({ idx: idxCua(d), loai: 'chuaKe', text: `HĐ ${d.kyHieu}-${d.so} ngày ${ngayVN(d.ngay)} (${ben === 'mua' ? d.ban?.Ten : d.mua?.Ten}) có đúng ${tien(can)} đ — có thể chưa kê trên tờ khai` });
    } else {
      for (const d of ngoaiKy) if (khop(d)) kq.push({ idx: idxCua(d), loai: 'khacKy', text: `HĐ ${d.kyHieu}-${d.so} ngày ${ngayVN(d.ngay)} (ngoài kỳ) có đúng ${tien(can)} đ — có thể kê vào kỳ này (kê bổ sung / kê sớm)` });
      if (!kq.length) kq.push({ idx: -1, loai: 'thieuTep', text: `Tờ khai nhiều hơn hoá đơn ${tien(can)} đ — có thể thư mục còn thiếu tệp hoá đơn ${ben === 'mua' ? 'mua vào' : 'bán ra'}` });
    }
    return kq.slice(0, 5);
  }
  const ngayVN = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : (s || ''); };

  // Kết quả cho toàn bộ tài liệu đang nạp (ghi nhớ theo danh sách hiện tại)
  let _nho = { khoa: '', kq: [] };
  function tinh(docs) {
    const khoa = docs.length + '|' + docs.map(d => d.source || d.fileName).join('\u0001').length + '|' + docs.filter(d => d.thayTheBoi).length;
    if (_nho.khoa === khoa) return _nho.kq;
    const idxCua = d => docs.indexOf(d);
    const kq = docs.filter(laToKhaiGTGT).map(d => doiChieuMot(d, docs, idxCua));
    _nho = { khoa, kq };
    return kq;
  }
  const choToKhai = (docs, d) => tinh(docs).find(k => k.tkIdx === docs.indexOf(d)) || null;

  window.DOI_CHIEU = { laToKhaiGTGT, tinh, choToKhai, tachHoaDon, docToKhai, nhomThueSuat, chonHoaDon, sachMst };
})();
