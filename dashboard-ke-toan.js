// dashboard-ke-toan.js — Dashboard kế toán (bản 3): ghép phương án C "Việc cần làm" (mỗi kỳ kê khai một thẻ có trạng thái
// và nút làm ngay) với phương án A "Sổ sách" (dải số tổng, bảng theo kỳ có dòng Cộng, bảng tự động tính Thuế TNDN & Lợi nhuận sau thuế,
// khách hàng / nhà cung cấp).
// Mọi con số hoá đơn đi qua DOI_CHIEU.chonHoaDon (bỏ HĐ trùng, bỏ HĐ gốc đã bị thay thế) và DOI_CHIEU.tachHoaDon,
// nên Dashboard, đối chiếu và lập tờ khai luôn ra cùng một số. Chạy hoàn toàn trên máy.
(() => {
  'use strict';

  const KHOA_LS_TNDN = 'xmlpro.tndn.v1';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const so = v => Math.round(v || 0).toLocaleString('vi-VN');
  const soCoDau = v => { const n = Math.round(v || 0); return (n < 0 ? '−' : '') + Math.abs(n).toLocaleString('vi-VN'); };
  const tyLeVN = v => v == null || !isFinite(v) ? '—' : (v < 0 ? '−' : '') + Math.abs(v).toFixed(1).replace('.', ',') + '%';
  const pad = n => String(n).padStart(2, '0');
  const MA_THUE = new Set(['[24]', '[25]', '[31]', '[33]', '[35]']); // lệch các dòng này là lệch tiền thuế

  // Lựa chọn của người xem (giữ khi vẽ lại)
  const chon = { mst: '', tab: '', kieu: '', namMo: {}, doiTacMo: {}, loc: null, namTndn: '' };
  const canh = { pham: [], docs: [], mst: '', namTndn: '', dlTndn: null };

  // ---------- Đọc phụ trợ XML cho Thuế TNDN, BCTC, 05/KK-TNCN, Giấy nộp tiền 1052 ----------
  const soXml = s => { const n = Number(String(s ?? '').trim()); return isFinite(n) ? n : 0; };
  function docXml(d) {
    if (d._dcXml !== undefined) return d._dcXml;
    if (!d || !d.rawXml) return (d._dcXml = null);
    try {
      const x = new DOMParser().parseFromString(String(d.rawXml).replace(/^\uFEFF/, ''), 'application/xml');
      d._dcXml = x.getElementsByTagName('parsererror').length ? null : x;
    } catch (e) { d._dcXml = null; }
    return d._dcXml;
  }
  const theo = (el, ten) => el ? Array.from(el.getElementsByTagNameNS('*', ten)) : [];
  const chu = (el, ten) => { const e = theo(el, ten)[0]; return e ? e.textContent.trim() : ''; };
  const sachMst = s => window.DOI_CHIEU ? window.DOI_CHIEU.sachMst(s) : String(s || '').replace(/[^0-9]/g, '');

  function namTuKyXml(kyEl) {
    if (!kyEl) return '';
    const kyTxt = chu(kyEl, 'kyKKhai');
    const mNam = /(\d{4})$/.exec(kyTxt);
    if (mNam) return mNam[1];
    const den = chu(kyEl, 'kyKKhaiDenNgay') || chu(kyEl, 'kyKKhaiTuNgay');
    const mNgay = /(\d{4})/.exec(den);
    return mNgay ? mNgay[1] : '';
  }

  /** Đọc Báo cáo kết quả hoạt động kinh doanh trong BCTC (TT200, TT99, TT133, TT132) */
  function docBctc(d) {
    if (!d || d.kind !== 'tk' || !d.rawXml) return null;
    if (d._ktBctc !== undefined) return d._ktBctc;
    const x = docXml(d);
    if (!x) return (d._ktBctc = null);
    const kq1 = theo(x, 'PL_KQHDSXKD')[0];
    const kqSn = !kq1 && theo(x, 'PL_KQHDXSKD')[0]; // B01-DNSN (686)
    const kq132 = !kq1 && !kqSn && theo(x, 'PL_BCKQHDKD')[0]; // TT132 (1273)
    const khung = kq1 || kqSn || kq132;
    const nn = khung && theo(khung, 'NamNay')[0];
    if (!nn) return (d._ktBctc = null);
    const tk = theo(x, 'TKhaiThue')[0], nnt = theo(x, 'NNT')[0], ky = theo(x, 'KyKKhaiThue')[0];
    const mst = sachMst(chu(nnt, 'mst')), nam = namTuKyXml(ky);
    if (!mst || !nam) return (d._ktBctc = null);
    let doanhThu = 0, giaVon = 0, lnTruoc = 0, thueTndn = 0, lnSau = 0;
    if (kq1) {
      doanhThu = soXml(chu(nn, 'ct10')) || soXml(chu(nn, 'ct01'));
      giaVon = soXml(chu(nn, 'ct11'));
      lnTruoc = soXml(chu(nn, 'ct50'));
      thueTndn = soXml(chu(nn, 'ct51')) + soXml(chu(nn, 'ct52'));
      lnSau = soXml(chu(nn, 'ct60'));
    } else if (kqSn) {
      doanhThu = soXml(chu(nn, 'ct01'));
      giaVon = soXml(chu(nn, 'ct02'));
      lnTruoc = soXml(chu(nn, 'ct05'));
      thueTndn = soXml(chu(nn, 'ct06'));
      lnSau = soXml(chu(nn, 'ct07'));
    } else {
      doanhThu = soXml(chu(nn, 'ct01'));
      giaVon = soXml(chu(nn, 'ct02'));
      lnSau = soXml(chu(nn, 'ct03'));
      lnTruoc = doanhThu - giaVon;
    }
    return (d._ktBctc = {
      mst, ten: chu(nnt, 'tenNNT'), nam, soLan: soXml(chu(tk, 'soLan')),
      tenTKhai: chu(tk, 'tenTKhai') || 'Báo cáo tài chính',
      doanhThu, giaVon, lnTruoc, thueTndn, lnSau
    });
  }

  /** Đọc Tờ khai quyết toán thuế TNDN 03/TNDN (mã 892, 03) */
  function doc03Tndn(d) {
    if (!d || d.kind !== 'tk' || !d.rawXml) return null;
    if (d._kt03Tndn !== undefined) return d._kt03Tndn;
    const x = docXml(d);
    const tk = x && theo(x, 'TKhaiThue')[0];
    if (!tk || !['892', '03'].includes(chu(tk, 'maTKhai'))) return (d._kt03Tndn = null);
    const nnt = theo(x, 'NNT')[0], ky = theo(x, 'KyKKhaiThue')[0], chinh = theo(x, 'CTieuTKhaiChinh')[0];
    const mst = sachMst(chu(nnt, 'mst')), nam = namTuKyXml(ky);
    if (!mst || !nam || !chinh) return (d._kt03Tndn = null);
    const lnTruoc = soXml(chu(chinh, 'ctA1'));
    const cpLoai = soXml(chu(chinh, 'ctB4'));
    const mienLo = soXml(chu(chinh, 'ctC2')) + soXml(chu(chinh, 'ctC3'));
    const tntt = soXml(chu(chinh, 'ctC6')) || soXml(chu(chinh, 'ctC4'));
    const thueTndn = soXml(chu(chinh, 'ctC17')) || soXml(chu(chinh, 'tong1052'));
    return (d._kt03Tndn = {
      mst, ten: chu(nnt, 'tenNNT'), nam, soLan: soXml(chu(tk, 'soLan')),
      lnTruoc, cpLoai, mienLo, tntt, thueTndn, lnSau: lnTruoc - thueTndn
    });
  }

  /** Đọc tiền lương chịu thuế [21] trên Tờ khai 05/KK-TNCN (mã 864, 394) */
  function doc05Tncn(d) {
    if (!d || d.kind !== 'tk' || !d.rawXml) return null;
    if (d._kt05Tncn !== undefined) return d._kt05Tncn;
    const x = docXml(d);
    const tk = x && theo(x, 'TKhaiThue')[0];
    if (!tk || !['864', '394'].includes(chu(tk, 'maTKhai'))) return (d._kt05Tncn = null);
    const nnt = theo(x, 'NNT')[0], ky = theo(x, 'KyKKhaiThue')[0], chinh = theo(x, 'CTieuTKhaiChinh')[0];
    const mst = sachMst(chu(nnt, 'mst')), kieuKy = chu(ky, 'kieuKy').toUpperCase(), kyTxt = chu(ky, 'kyKKhai');
    const m = /^(\d{1,2})\/(\d{4})$/.exec(kyTxt);
    if (!mst || !m || !chinh) return (d._kt05Tncn = null);
    const soKy = +m[1], nam = m[2], quy = kieuKy === 'Q' ? soKy : Math.ceil(soKy / 3);
    if (quy < 1 || quy > 4) return (d._kt05Tncn = null);
    return (d._kt05Tncn = {
      mst, khoaKy: `${kieuKy}_${kyTxt}`, nam, quy, soLan: soXml(chu(tk, 'soLan')),
      luong: soXml(chu(chinh, 'ct21'))
    });
  }

  /** Đọc Giấy nộp tiền NSNN cho tiểu mục Thuế TNDN (1052, 1056) */
  function docGntTndn(d) {
    if (!d || d.kind !== 'ct' || !d.rawXml) return null;
    if (d._ktGntTndn !== undefined) return d._ktGntTndn;
    const x = docXml(d);
    if (!x) return (d._ktGntTndn = null);
    const mst = sachMst(chu(x, 'MST_NNOP'));
    const ngay = chu(x, 'NGAY_LAP') || chu(x, 'NGAY_CTU');
    const soCt = chu(x, 'SO_CTU');
    const dong = theo(x, 'MA_NDKT').map(e => {
      const p = e.parentElement;
      return { ndkt: e.textContent.trim(), ky: chu(p, 'KY_THUE'), tien: soXml(chu(p, 'TIEN_PNOP')) };
    }).filter(r => (r.ndkt === '1052' || r.ndkt === '1056') && r.tien > 0);
    return (d._ktGntTndn = dong.length ? { mst, ngay, so: soCt, dong } : null);
  }

  // ---------- Lưu cấu hình điều chỉnh Thuế TNDN trong localStorage (chỉ trên máy này) ----------
  function docLsTndn() {
    try { return JSON.parse(localStorage.getItem(KHOA_LS_TNDN)) || {}; } catch (e) { return {}; }
  }
  function luuLsTndn(d) {
    try { localStorage.setItem(KHOA_LS_TNDN, JSON.stringify(d)); } catch (e) { }
  }
  function layCauHinhTndn(mst, nam) {
    const k = `${mst}_${nam}`, d = docLsTndn()[k] || {};
    return {
      tsCheDo: d.tsCheDo || 'auto',
      tsKhac: d.tsKhac != null ? Number(d.tsKhac) : 10,
      cpKhac: d.cpKhac || {},
      cpLoai: d.cpLoai || {},
      mienLo: d.mienLo !== undefined ? d.mienLo : null
    };
  }
  function ghiCauHinhTndn(mst, nam, capNhat) {
    const k = `${mst}_${nam}`, all = docLsTndn();
    const cur = layCauHinhTndn(mst, nam);
    capNhat(cur);
    all[k] = cur;
    luuLsTndn(all);
    return cur;
  }
  function xoaCauHinhTndn(mst, nam) {
    const k = `${mst}_${nam}`, all = docLsTndn();
    delete all[k];
    luuLsTndn(all);
  }
  function daChinhTndn(ch) {
    return ch.tsCheDo !== 'auto' || ch.mienLo !== null
      || [1, 2, 3, 4].some(q => ch.cpKhac[q] != null || (ch.cpLoai[q] || 0) !== 0);
  }

  /** Giá trị trước thuế của hoá đơn (hỗ trợ cả HĐ bán hàng trực tiếp không có dòng TgTCThue) */
  function giaTriTruocThue(d, DC) {
    const t = DC.tachHoaDon(d);
    if (t.V || t.T || d.tongTruocThue != null) return t.V;
    const tg = d.tien_te && d.tien_te !== 'VND' && Number(d.tyGia) > 0 ? Number(d.tyGia) : 1;
    return (d.tong || 0) * tg;
  }

  /** Gom dữ liệu tự động theo từng năm cho một MST */
  function thuThapTndn(docs, pham, mst, ban, mua) {
    const DC = window.DOI_CHIEU;
    const namMap = new Map();
    const layNam = n => {
      if (!namMap.has(n)) {
        namMap.set(n, {
          nam: n,
          dt: [0, 0, 0, 0, 0], mua: [0, 0, 0, 0, 0],
          soBan: [0, 0, 0, 0, 0], soMua: [0, 0, 0, 0, 0],
          luongTk: [0, 0, 0, 0, 0], daNop: [0, 0, 0, 0, 0], daNopKhac: 0, chungTuNop: [],
          bctc: null, qt03: null
        });
      }
      return namMap.get(n);
    };

    for (const d of ban) {
      const m = /^(\d{4})-(\d{2})/.exec(d.ngay || '');
      if (!m) continue;
      const q = Math.ceil(+m[2] / 3), g = layNam(m[1]);
      g.dt[q] += giaTriTruocThue(d, DC); g.soBan[q]++;
    }
    for (const d of mua) {
      const m = /^(\d{4})-(\d{2})/.exec(d.ngay || '');
      if (!m) continue;
      const q = Math.ceil(+m[2] / 3), g = layNam(m[1]);
      g.mua[q] += giaTriTruocThue(d, DC); g.soMua[q]++;
    }

    // Lương từ tờ khai 05/KK-TNCN cùng MST (mỗi kỳ chỉ lấy bản bổ sung mới nhất)
    const tncnMap = new Map();
    for (const d of pham) {
      const t = doc05Tncn(d);
      if (!t || t.mst !== mst) continue;
      const cu = tncnMap.get(t.khoaKy);
      if (!cu || t.soLan >= cu.soLan) tncnMap.set(t.khoaKy, t);
    }
    for (const t of tncnMap.values()) {
      if (t.luong > 0 && (namMap.has(t.nam) || !ban.length && !mua.length)) layNam(t.nam).luongTk[t.quy] += t.luong;
    }

    // BCTC và 03/TNDN cùng MST (lấy lần nộp mới nhất mỗi năm)
    for (const d of pham) {
      const b = docBctc(d);
      if (b && b.mst === mst) {
        const g = layNam(b.nam);
        if (!g.bctc || b.soLan >= g.bctc.soLan) g.bctc = { ...b, docIdx: docs.indexOf(d) };
      }
      const qt = doc03Tndn(d);
      if (qt && qt.mst === mst) {
        const g = layNam(qt.nam);
        if (!g.qt03 || qt.soLan >= g.qt03.soLan) g.qt03 = { ...qt, docIdx: docs.indexOf(d) };
      }
    }

    // Giấy nộp tiền tiểu mục 1052 / 1056 của cùng MST
    for (const d of docs) {
      const gnt = docGntTndn(d);
      if (!gnt || gnt.mst !== mst) continue;
      for (const r of gnt.dong) {
        const ky = String(r.ky || '').toUpperCase();
        const mQ = /Q(\d)\/(\d{4})/.exec(ky), mM = /(\d{1,2})\/(\d{4})$/.exec(ky), mY = /(\d{4})/.exec(ky) || /(\d{4})/.exec(gnt.ngay || '');
        if (!mY) continue;
        const nam = mQ ? mQ[2] : mM ? mM[2] : mY[1];
        if (!namMap.has(nam)) continue;
        const g = layNam(nam);
        if (mQ) g.daNop[+mQ[1]] += r.tien;
        else if (mM) g.daNop[Math.ceil(+mM[1] / 3)] += r.tien;
        else g.daNopKhac += r.tien;
        g.chungTuNop.push({ idx: docs.indexOf(d), so: gnt.so, ngay: gnt.ngay, tien: r.tien });
      }
    }
    return namMap;
  }

  /**
   * Tính toán Thuế TNDN và Lợi nhuận sau thuế cho một năm.
   * Quy tắc thuế suất tự động theo Luật Thuế TNDN số 67/2025/QH15 (từ kỳ tính thuế 2025):
   *   - Doanh thu năm ≤ 3 tỷ đồng: 15% (doanh nghiệp siêu nhỏ)
   *   - Doanh thu năm > 3 tỷ đến ≤ 50 tỷ đồng: 17% (doanh nghiệp nhỏ và vừa)
   *   - Doanh thu năm > 50 tỷ đồng (hoặc năm trước 2025): 20% (phổ thông)
   * Các quý tạm tính theo nguyên tắc luỹ kế đầu năm (tự động bù trừ lỗ quý trước trong cùng năm tài chính).
   */
  function tinhTndnNam(nam, dl, ch) {
    const soHdNam = [1, 2, 3, 4].reduce((s, q) => s + dl.soBan[q] + dl.soMua[q], 0);
    const chiCoBctc = soHdNam === 0 && !!(dl.bctc || dl.qt03);

    const dt = [0, 0, 0, 0, 0], mua = [0, 0, 0, 0, 0], cpKhac = [0, 0, 0, 0, 0];
    const tongCp = [0, 0, 0, 0, 0], lnTruoc = [0, 0, 0, 0, 0], cpLoai = [0, 0, 0, 0, 0];
    for (let q = 1; q <= 4; q++) {
      dt[q] = Math.round(dl.dt[q]);
      mua[q] = Math.round(dl.mua[q]);
      cpKhac[q] = ch.cpKhac[q] != null ? Math.round(ch.cpKhac[q]) : Math.round(dl.luongTk[q]);
      tongCp[q] = mua[q] + cpKhac[q];
      lnTruoc[q] = dt[q] - tongCp[q];
      cpLoai[q] = Math.max(0, Math.round(ch.cpLoai[q] || 0));
    }

    let dtNam = dt[1] + dt[2] + dt[3] + dt[4];
    let muaNam = mua[1] + mua[2] + mua[3] + mua[4];
    let cpKhacNam = cpKhac[1] + cpKhac[2] + cpKhac[3] + cpKhac[4];
    let tongCpNam = muaNam + cpKhacNam;
    let lnTruocNam = dtNam - tongCpNam;
    let cpLoaiNam = cpLoai[1] + cpLoai[2] + cpLoai[3] + cpLoai[4];
    const mienLoNam = Math.max(0, ch.mienLo != null ? Math.round(ch.mienLo) : Math.round(dl.qt03 ? dl.qt03.mienLo : 0));

    if (chiCoBctc) {
      if (dl.bctc) {
        dtNam = Math.round(dl.bctc.doanhThu);
        muaNam = Math.round(dl.bctc.giaVon);
        tongCpNam = dtNam - Math.round(dl.bctc.lnTruoc);
        cpKhacNam = tongCpNam - muaNam;
        lnTruocNam = Math.round(dl.bctc.lnTruoc);
      } else if (dl.qt03) {
        lnTruocNam = Math.round(dl.qt03.lnTruoc);
        cpLoaiNam = Math.round(dl.qt03.cpLoai);
      }
    }

    // Xác định thuế suất TNDN
    let thueSuat = 20, canCuTs = 'Mức phổ thông 20%';
    if (ch.tsCheDo === 'auto') {
      if (+nam >= 2025) {
        if (dtNam <= 3e9) { thueSuat = 15; canCuTs = 'DT năm ≤ 3 tỷ · Luật 67/2025'; }
        else if (dtNam <= 50e9) { thueSuat = 17; canCuTs = 'DT năm 3–50 tỷ · Luật 67/2025'; }
        else { thueSuat = 20; canCuTs = 'DT năm > 50 tỷ · Luật 67/2025'; }
      } else {
        thueSuat = 20; canCuTs = 'Phổ thông 20% (trước 2025)';
      }
    } else if (ch.tsCheDo === 'khac') {
      thueSuat = Math.min(50, Math.max(0, Number(ch.tsKhac) || 0));
      canCuTs = 'Thuế suất tự nhập';
    } else {
      thueSuat = Number(ch.tsCheDo);
      canCuTs = thueSuat === 0 ? 'Miễn thuế TNDN' : thueSuat === 15 ? 'DN siêu nhỏ (≤ 3 tỷ)' : thueSuat === 17 ? 'DN nhỏ & vừa (3–50 tỷ)' : thueSuat === 10 ? 'Thuế suất ưu đãi 10%' : 'Thuế suất phổ thông';
    }

    // Tính luỹ kế từng quý và quyết toán cả năm
    const tntt = [0, 0, 0, 0, 0], thue = [0, 0, 0, 0, 0], lnSau = [0, 0, 0, 0, 0], tySuatSauQ = [null, null, null, null, null];
    let lkChiuThue = 0, dinhTntt = 0;
    for (let q = 1; q <= 4; q++) {
      lkChiuThue += lnTruoc[q] + cpLoai[q];
      const lkTntt = Math.max(0, lkChiuThue - mienLoNam);
      tntt[q] = Math.max(0, lkTntt - dinhTntt);
      if (lkTntt > dinhTntt) dinhTntt = lkTntt;
      thue[q] = Math.round(tntt[q] * thueSuat / 100);
      lnSau[q] = lnTruoc[q] - thue[q];
      tySuatSauQ[q] = dt[q] > 0 ? (lnSau[q] / dt[q] * 100) : null;
    }

    let tnttNam = Math.max(0, lnTruocNam + cpLoaiNam - mienLoNam);
    let thueNam = Math.round(tnttNam * thueSuat / 100);
    let lnSauNam = lnTruocNam - thueNam;
    if (chiCoBctc && !daChinhTndn(ch)) {
      if (dl.qt03) { tnttNam = Math.round(dl.qt03.tntt); thueNam = Math.round(dl.qt03.thueTndn); lnSauNam = lnTruocNam - thueNam; }
      else if (dl.bctc) { thueNam = Math.round(dl.bctc.thueTndn); lnSauNam = Math.round(dl.bctc.lnSau); }
    }

    const daNopNam = Math.round(dl.daNop[1] + dl.daNop[2] + dl.daNop[3] + dl.daNop[4] + dl.daNopKhac);
    const conPhaiNop = thueNam - daNopNam;
    const tamNop80 = Math.round(thueNam * 0.8);
    const tySuatTruoc = dtNam > 0 ? (lnTruocNam / dtNam * 100) : null;
    const tySuatSau = dtNam > 0 ? (lnSauNam / dtNam * 100) : null;
    const coLuongTk = dl.luongTk.some((v, q) => q >= 1 && v > 0 && ch.cpKhac[q] == null);

    return {
      nam, soHdNam, chiCoBctc, dt, dtNam, mua, muaNam, cpKhac, cpKhacNam, tongCp, tongCpNam,
      lnTruoc, lnTruocNam, cpLoai, cpLoaiNam, mienLoNam,
      thueSuat, canCuTs, tntt, tnttNam, thue, thueNam, lnSau, lnSauNam,
      tySuatTruoc, tySuatSau, tySuatSauQ, daNop: dl.daNop, daNopNam, conPhaiNop, tamNop80, coLuongTk
    };
  }

  function coDuLieu(docs) {
    const DC = window.DOI_CHIEU;
    return !!DC && docs.some(d => (d.kind === 'hd' && !d.error) || DC.laToKhaiGTGT(d) || docBctc(d) || doc03Tndn(d));
  }

  // Công ty: MST có tờ khai 01/GTGT + MST đã cài; không có thì MST xuất hiện nhiều nhất trên hoá đơn; cuối cùng mới xét BCTC / 03-TNDN
  function dsCongTy(docs, myMst) {
    const DC = window.DOI_CHIEU;
    const m = new Map();
    const lay = mst => { if (!m.has(mst)) m.set(mst, { mst, ten: '', soTk: 0, soHd: 0 }); return m.get(mst); };
    for (const d of docs) {
      if (DC.laToKhaiGTGT(d)) { const t = DC.docToKhai(d); const c = lay(t.mst); c.soTk++; c.ten = c.ten || t.ten; }
    }
    const demHd = new Map();
    for (const d of docs) {
      if (d.kind !== 'hd' || d.error) continue;
      for (const p of [d.ban, d.mua]) {
        const k = DC.sachMst(p?.MST);
        if (!k) continue;
        const g = demHd.get(k) || { n: 0, ten: p.Ten || '' };
        g.n++; demHd.set(k, g);
      }
    }
    const cai = DC.sachMst(myMst);
    if (cai && demHd.has(cai)) lay(cai);
    if (!m.size && demHd.size) lay([...demHd.entries()].sort((a, b) => b[1].n - a[1].n)[0][0]);
    if (!m.size) {
      for (const d of docs) {
        const b = docBctc(d) || doc03Tndn(d);
        if (b && b.mst) { const c = lay(b.mst); c.soTk++; c.ten = c.ten || b.ten; }
      }
    }
    for (const c of m.values()) { const g = demHd.get(c.mst); if (g) { c.soHd = g.n; c.ten = c.ten || g.ten; } }
    return [...m.values()].sort((a, b) => (b.mst === cai) - (a.mst === cai) || b.soTk - a.soTk || b.soHd - a.soHd);
  }

  const khoaKy = (kieu, ngay) => {
    const m = /^(\d{4})-(\d{2})/.exec(ngay || '');
    if (!m) return null;
    return kieu === 'Q' ? `${m[1]}-Q${Math.ceil(+m[2] / 3)}` : `${m[1]}-M${m[2]}`;
  };
  const tenKy = k => { const [nam, x] = k.split('-'); return x[0] === 'Q' ? `Quý ${x.slice(1)}/${nam}` : `Tháng ${x.slice(1)}/${nam}`; };
  const kyLap = k => { const [nam, x] = k.split('-'); return x[0] === 'Q' ? { kieu: 'Q', quy: +x.slice(1), nam: +nam } : { kieu: 'M', thang: +x.slice(1), nam: +nam }; };
  // Hạn nộp: ngày cuối của tháng đầu quý sau (quý) / ngày 20 tháng sau (tháng)
  const hanNop = k => {
    const [nam, x] = k.split('-');
    if (x[0] === 'Q') { const t = +x.slice(1) * 3 + 1, n = t > 12 ? +nam + 1 : +nam, tt = t > 12 ? 1 : t; return `${pad(new Date(n, tt, 0).getDate())}/${pad(tt)}/${n}`; }
    const t = +x.slice(1) + 1, n = t > 12 ? +nam + 1 : +nam, tt = t > 12 ? 1 : t;
    return `20/${pad(tt)}/${n}`;
  };

  const lopLoiNhuan = v => v > 0 ? 'ktt-duong' : v < 0 ? 'ktt-am' : '';
  const chuTs = v => String(v).replace('.', ',') + '%';

  /** Vẽ khối Bảng tính tự động Thuế TNDN và lợi nhuận sau thuế */
  function veKhoiTndn(mst, namMap, attrLoc) {
    const nams = [...namMap.keys()].sort().reverse();
    if (!nams.length) return { html: '', kq: null };
    if (!nams.includes(chon.namTndn)) chon.namTndn = nams[0];
    const nam = chon.namTndn, dl = namMap.get(nam), ch = layCauHinhTndn(mst, nam);
    canh.mst = mst; canh.namTndn = nam; canh.dlTndn = dl;
    const kq = tinhTndnNam(nam, dl, ch);
    const daSua = daChinhTndn(ch);

    const locQuy = (c, q) => kq.soHdNam > 0 ? `${attrLoc({ c, ky: `${nam}-Q${q}` })} title="Xem hoá đơn ${c === 'ban' ? 'bán ra' : 'mua vào'} Quý ${q}/${nam}"` : '';
    const oNhap = (loai, q, giaTri, goiY) => {
      const hien = giaTri ? so(giaTri) : '';
      return `<input type="text" inputmode="numeric" class="ktt-o-nhap" data-tndn-nhap="${loai}" data-quy="${q}" value="${esc(hien)}" placeholder="${goiY || '0'}" title="Nhập số tiền (đồng) — tự động tính lại ngay">`;
    };

    const tsTuyChon = [
      ['auto', `Tự động theo doanh thu (${chuTs(kq.thueSuat)})`],
      ['15', '15% — DN siêu nhỏ (DT ≤ 3 tỷ)'],
      ['17', '17% — DN nhỏ & vừa (DT 3–50 tỷ)'],
      ['20', '20% — Thuế suất phổ thông'],
      ['10', '10% — Ưu đãi thuế'],
      ['0', '0% — Đang được miễn thuế'],
      ['khac', 'Mức khác (%)…']
    ];

    // Đối chiếu với BCTC / 03-TNDN đã nạp trong thư mục (nếu có)
    const doiChieuBc = [];
    if (dl.bctc) {
      const lechLn = kq.soHdNam > 0 ? Math.round(kq.lnSauNam - dl.bctc.lnSau) : 0;
      doiChieuBc.push(`BCTC năm ${nam} (<a class="ktt-lk" data-mo-doc="${dl.bctc.docIdx}">mở báo cáo</a>): doanh thu thuần <b>${so(dl.bctc.doanhThu)}</b> · LN trước thuế <b>${soCoDau(dl.bctc.lnTruoc)}</b> · thuế TNDN <b>${so(dl.bctc.thueTndn)}</b> · LN sau thuế <b>${soCoDau(dl.bctc.lnSau)}</b>${kq.soHdNam > 0 && Math.abs(lechLn) > 5 ? ` <span class="ktt-nho">(tạm tính đang ${lechLn > 0 ? 'cao hơn' : 'thấp hơn'} ${so(Math.abs(lechLn))} đ)</span>` : ''}`);
    }
    if (dl.qt03) {
      doiChieuBc.push(`Quyết toán 03/TNDN năm ${nam} (<a class="ktt-lk" data-mo-doc="${dl.qt03.docIdx}">mở tờ khai</a>): TN tính thuế <b>${so(dl.qt03.tntt)}</b> · thuế TNDN phải nộp [C17] <b>${so(dl.qt03.thueTndn)}</b>`);
    }

    const html = `<div class="ktt-khoi" id="kttTndn">
      <div class="ktt-tndn-dau">
        <div class="ktt-tndn-trai">
          <b>Thuế TNDN và lợi nhuận sau thuế</b>
          ${nams.length > 1 ? `<div class="ktt-chip">${nams.map(n => `<button type="button" data-nam-tndn="${esc(n)}" class="${n === nam ? 'on' : ''}">Năm ${esc(n)}</button>`).join('')}</div>` : `<span class="ktt-nho">Năm ${esc(nam)}</span>`}
        </div>
        <div class="ktt-tndn-phai">
          <span class="ktt-nho">Thuế suất TNDN:</span>
          <select data-tndn-ts aria-label="Chọn thuế suất TNDN">${tsTuyChon.map(([v, nhan]) => `<option value="${v}"${ch.tsCheDo === v ? ' selected' : ''}>${esc(nhan)}</option>`).join('')}</select>
          ${ch.tsCheDo === 'khac' ? `<input type="text" inputmode="decimal" class="ktt-ts-khac" data-tndn-ts-khac value="${esc(String(ch.tsKhac).replace('.', ','))}" title="Nhập phần trăm thuế suất (0–50)"> <span class="ktt-nho">%</span>` : ''}
          <button type="button" class="ktt-nut" data-tndn-reset ${daSua ? '' : 'hidden'} title="Xoá các số nhập tay, quay về số tự động từ chứng từ">Đặt lại mặc định</button>
        </div>
      </div>

      <div class="ktt-tndn-tom">
        <div>
          <span class="ktt-nhan-o">Lợi nhuận trước thuế (${esc(nam)})</span>
          <b data-tndn-o="tomLnTruoc" class="${lopLoiNhuan(kq.lnTruocNam)}">${soCoDau(kq.lnTruocNam)}</b>
          <span class="ktt-phu-o" data-tndn-o="tomTySuatTruoc">Tỷ suất trước thuế: ${tyLeVN(kq.tySuatTruoc)}</span>
        </div>
        <div>
          <span class="ktt-nhan-o">Thuế suất TNDN áp dụng</span>
          <b data-tndn-o="tomThueSuat">${chuTs(kq.thueSuat)}</b>
          <span class="ktt-phu-o" data-tndn-o="tomCanCuTs">${esc(kq.canCuTs)}</span>
        </div>
        <div>
          <span class="ktt-nhan-o">Thuế TNDN ước tính</span>
          <b data-tndn-o="tomThueNam" class="${kq.thueNam > 0 ? 'ktt-am' : ''}">${so(kq.thueNam)}</b>
          <span class="ktt-phu-o" data-tndn-o="tomTamNop80">Tối thiểu 4 quý (80%): ${so(kq.tamNop80)}</span>
        </div>
        <div>
          <span class="ktt-nhan-o">Lợi nhuận sau thuế (${esc(nam)})</span>
          <b data-tndn-o="tomLnSau" class="${lopLoiNhuan(kq.lnSauNam)}">${soCoDau(kq.lnSauNam)}</b>
          <span class="ktt-phu-o" data-tndn-o="tomTySuatSau">Biên lợi nhuận ròng: ${tyLeVN(kq.tySuatSau)}</span>
        </div>
      </div>

      <table class="ktt-bang ktt-bang-tndn">
        <thead>
          <tr>
            <th>Chỉ tiêu (đơn vị: đồng)</th>
            <th>Quý 1/${esc(nam)}</th>
            <th>Quý 2/${esc(nam)}</th>
            <th>Quý 3/${esc(nam)}</th>
            <th>Quý 4/${esc(nam)}</th>
            <th>Cả năm ${esc(nam)}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1. Doanh thu bán hàng và dịch vụ <span class="ktt-nho">(chưa thuế GTGT)</span></td>
            ${[1, 2, 3, 4].map(q => `<td ${locQuy('ban', q)}>${so(kq.dt[q])}</td>`).join('')}
            <td>${so(kq.dtNam)}</td>
          </tr>
          <tr>
            <td>2. Chi phí mua vào có hoá đơn <span class="ktt-nho">(chưa thuế GTGT)</span></td>
            ${[1, 2, 3, 4].map(q => `<td ${locQuy('mua', q)}>${so(kq.mua[q])}</td>`).join('')}
            <td>${so(kq.muaNam)}</td>
          </tr>
          <tr>
            <td>3. Chi phí lương, khấu hao, hợp lý khác${kq.coLuongTk ? ` <span class="ktt-nho">(tự lấy lương 05/KK-TNCN)</span>` : ` <span class="ktt-nho">(nhập thêm ngoài HĐ)</span>`}</td>
            ${[1, 2, 3, 4].map(q => `<td>${oNhap('cpKhac', q, kq.cpKhac[q], '0')}</td>`).join('')}
            <td data-tndn-o="cpKhacNam">${soCoDau(kq.cpKhacNam)}</td>
          </tr>
          <tr>
            <td>4. Tổng chi phí kế toán <span class="ktt-nho">(2 + 3)</span></td>
            ${[1, 2, 3, 4].map(q => `<td data-tndn-o="tongCp_${q}">${soCoDau(kq.tongCp[q])}</td>`).join('')}
            <td data-tndn-o="tongCpNam">${soCoDau(kq.tongCpNam)}</td>
          </tr>
          <tr class="ktt-dong-dam">
            <td>5. Lợi nhuận kế toán trước thuế <span class="ktt-nho">(1 − 4)</span></td>
            ${[1, 2, 3, 4].map(q => `<td data-tndn-o="lnTruoc_${q}" class="${lopLoiNhuan(kq.lnTruoc[q])}">${soCoDau(kq.lnTruoc[q])}</td>`).join('')}
            <td data-tndn-o="lnTruocNam" class="${lopLoiNhuan(kq.lnTruocNam)}">${soCoDau(kq.lnTruocNam)}</td>
          </tr>
          <tr>
            <td>6. Cộng: Chi phí không được trừ khi tính thuế <span class="ktt-nho">[B4]</span></td>
            ${[1, 2, 3, 4].map(q => `<td>${oNhap('cpLoai', q, kq.cpLoai[q], '0')}</td>`).join('')}
            <td data-tndn-o="cpLoaiNam">${so(kq.cpLoaiNam)}</td>
          </tr>
          <tr>
            <td>7. Trừ: Thu nhập miễn thuế &amp; lỗ năm trước chuyển sang <span class="ktt-nho">[C2+C3]</span></td>
            <td colspan="4" class="ktt-nho" style="text-align:right">Tự động bù trừ từ quý đầu tiên có lãi trong năm →</td>
            <td>${oNhap('mienLo', 0, kq.mienLoNam, '0')}</td>
          </tr>
          <tr>
            <td>8. Thu nhập tính thuế TNDN <span class="ktt-nho">(tạm tính luỹ kế theo quý)</span></td>
            ${[1, 2, 3, 4].map(q => `<td data-tndn-o="tntt_${q}">${so(kq.tntt[q])}</td>`).join('')}
            <td data-tndn-o="tnttNam">${so(kq.tnttNam)}</td>
          </tr>
          <tr class="ktt-dong-dam">
            <td>9. Thuế TNDN ước tính <span class="ktt-nho" data-tndn-o="nhanDongThue">(${chuTs(kq.thueSuat)})</span></td>
            ${[1, 2, 3, 4].map(q => `<td data-tndn-o="thue_${q}" class="${kq.thue[q] > 0 ? 'ktt-am' : ''}">${so(kq.thue[q])}</td>`).join('')}
            <td data-tndn-o="thueNam" class="${kq.thueNam > 0 ? 'ktt-am' : ''}">${so(kq.thueNam)}</td>
          </tr>
          ${kq.daNopNam > 0 ? `<tr>
            <td>Đã nộp NSNN <span class="ktt-nho">(giấy nộp tiền tiểu mục 1052)</span></td>
            ${[1, 2, 3, 4].map(q => `<td>${kq.daNop[q] ? so(kq.daNop[q]) : '—'}</td>`).join('')}
            <td>${so(kq.daNopNam)} · <span data-tndn-o="conPhaiNop" class="${kq.conPhaiNop > 0 ? 'ktt-am' : 'ktt-duong'}">${kq.conPhaiNop > 0 ? 'còn nộp ' + so(kq.conPhaiNop) : kq.conPhaiNop < 0 ? 'nộp thừa ' + so(-kq.conPhaiNop) : 'đã nộp đủ'}</span></td>
          </tr>` : ''}
          <tr class="ktt-ket-qua">
            <td>10. Lợi nhuận sau thuế TNDN <span class="ktt-nho">(5 − 9)</span></td>
            ${[1, 2, 3, 4].map(q => `<td data-tndn-o="lnSau_${q}" class="${lopLoiNhuan(kq.lnSau[q])}">${soCoDau(kq.lnSau[q])}</td>`).join('')}
            <td data-tndn-o="lnSauNam" class="${lopLoiNhuan(kq.lnSauNam)}">${soCoDau(kq.lnSauNam)}</td>
          </tr>
          <tr>
            <td class="ktt-nho">Tỷ suất lợi nhuận sau thuế / doanh thu</td>
            ${[1, 2, 3, 4].map(q => `<td class="ktt-nho" data-tndn-o="tySuat_${q}">${tyLeVN(kq.tySuatSauQ[q])}</td>`).join('')}
            <td class="ktt-nho" data-tndn-o="tySuatNam">${tyLeVN(kq.tySuatSau)}</td>
          </tr>
        </tbody>
      </table>

      ${doiChieuBc.length ? `<div class="ktt-tndn-chu"><div>${doiChieuBc.join('<br>')}</div></div>` : ''}
      <div class="ktt-tndn-chu">
        <span>Số tạm tính từ hoá đơn chưa gồm chênh lệch tồn kho đầu/cuối kỳ (có thể nhập điều chỉnh âm/dương ở dòng 3). Các thông số nhập tay tự lưu trên máy theo từng công ty và năm.</span>
        <span>Hạn tạm nộp quý 4/${esc(nam)}: 30/01/${+nam + 1} · Quyết toán năm: 31/03/${+nam + 1}</span>
      </div>
    </div>`;
    return { html, kq };
  }

  /** Cập nhật tức thì các ô kết quả TNDN khi gõ số, giữ nguyên con trỏ trong ô đang nhập */
  function capNhatTndnTaiCho(khung) {
    const khoi = khung.querySelector('#kttTndn');
    if (!khoi || !canh.dlTndn) return;
    const ch = layCauHinhTndn(canh.mst, canh.namTndn);
    const kq = tinhTndnNam(canh.namTndn, canh.dlTndn, ch);
    const dat = (ma, txt, cls) => {
      const el = khoi.querySelector(`[data-tndn-o="${ma}"]`);
      if (!el) return;
      el.textContent = txt;
      if (cls !== undefined) {
        el.classList.remove('ktt-duong', 'ktt-am');
        if (cls) el.classList.add(cls);
      }
    };
    dat('tomLnTruoc', soCoDau(kq.lnTruocNam), lopLoiNhuan(kq.lnTruocNam));
    dat('tomTySuatTruoc', 'Tỷ suất trước thuế: ' + tyLeVN(kq.tySuatTruoc));
    dat('tomThueSuat', chuTs(kq.thueSuat));
    dat('tomCanCuTs', kq.canCuTs);
    dat('tomThueNam', so(kq.thueNam), kq.thueNam > 0 ? 'ktt-am' : '');
    dat('tomTamNop80', 'Tối thiểu 4 quý (80%): ' + so(kq.tamNop80));
    dat('tomLnSau', soCoDau(kq.lnSauNam), lopLoiNhuan(kq.lnSauNam));
    dat('tomTySuatSau', 'Biên lợi nhuận ròng: ' + tyLeVN(kq.tySuatSau));
    dat('cpKhacNam', soCoDau(kq.cpKhacNam));
    dat('tongCpNam', soCoDau(kq.tongCpNam));
    dat('lnTruocNam', soCoDau(kq.lnTruocNam), lopLoiNhuan(kq.lnTruocNam));
    dat('cpLoaiNam', so(kq.cpLoaiNam));
    dat('tnttNam', so(kq.tnttNam));
    dat('nhanDongThue', '(' + chuTs(kq.thueSuat) + ')');
    dat('thueNam', so(kq.thueNam), kq.thueNam > 0 ? 'ktt-am' : '');
    dat('lnSauNam', soCoDau(kq.lnSauNam), lopLoiNhuan(kq.lnSauNam));
    dat('tySuatNam', tyLeVN(kq.tySuatSau));
    if (kq.daNopNam > 0) {
      dat('conPhaiNop', kq.conPhaiNop > 0 ? 'còn nộp ' + so(kq.conPhaiNop) : kq.conPhaiNop < 0 ? 'nộp thừa ' + so(-kq.conPhaiNop) : 'đã nộp đủ', kq.conPhaiNop > 0 ? 'ktt-am' : 'ktt-duong');
    }
    for (let q = 1; q <= 4; q++) {
      dat(`tongCp_${q}`, soCoDau(kq.tongCp[q]));
      dat(`lnTruoc_${q}`, soCoDau(kq.lnTruoc[q]), lopLoiNhuan(kq.lnTruoc[q]));
      dat(`tntt_${q}`, so(kq.tntt[q]));
      dat(`thue_${q}`, so(kq.thue[q]), kq.thue[q] > 0 ? 'ktt-am' : '');
      dat(`lnSau_${q}`, soCoDau(kq.lnSau[q]), lopLoiNhuan(kq.lnSau[q]));
      dat(`tySuat_${q}`, tyLeVN(kq.tySuatSauQ[q]));
    }
    const nutReset = khoi.querySelector('[data-tndn-reset]');
    if (nutReset) nutReset.hidden = !daChinhTndn(ch);
    const phuTab = khung.querySelector('[data-tndn-o="tabPhuTndn"]');
    if (phuTab) phuTab.textContent = `Năm ${kq.nam} · ${chuTs(kq.thueSuat)}`;
  }

  /** Xuất dữ liệu bảng Thuế TNDN & Lợi nhuận sau thuế sang sheet Excel (xuat-excel.js gọi) */
  function xuatTndnExcel(docs, myMst) {
    const DC = window.DOI_CHIEU;
    if (!DC || !coDuLieu(docs)) return null;
    const ds = dsCongTy(docs, myMst || chon.mst || canh.mst);
    if (!ds.length) return null;
    const rows = [];
    for (const cty of ds) {
      const { mua, ban } = DC.chonHoaDon(docs, cty.mst, '0000-00-00', '9999-12-31');
      const namMap = thuThapTndn(docs, docs, cty.mst, ban, mua);
      const nams = [...namMap.keys()].sort().reverse();
      for (const nam of nams) {
        const ch = layCauHinhTndn(cty.mst, nam);
        const kq = tinhTndnNam(nam, namMap.get(nam), ch);
        const them = (chiTieu, q1, q2, q3, q4, caNam, isBold) => rows.push([
          cty.ten || ('MST ' + cty.mst), { text: cty.mst, isCenter: true }, { text: nam, isCenter: true },
          isBold ? { text: chiTieu, isBold: true } : chiTieu,
          q1, q2, q3, q4, caNam, { text: chuTs(kq.thueSuat) + ' (' + kq.canCuTs + ')', isCenter: false }
        ]);
        them('1. Doanh thu bán hàng và dịch vụ (chưa thuế GTGT)', kq.dt[1], kq.dt[2], kq.dt[3], kq.dt[4], kq.dtNam, false);
        them('2. Chi phí mua vào có hoá đơn (chưa thuế GTGT)', kq.mua[1], kq.mua[2], kq.mua[3], kq.mua[4], kq.muaNam, false);
        them('3. Chi phí lương, khấu hao, hợp lý khác', kq.cpKhac[1], kq.cpKhac[2], kq.cpKhac[3], kq.cpKhac[4], kq.cpKhacNam, false);
        them('4. Tổng chi phí kế toán (2 + 3)', kq.tongCp[1], kq.tongCp[2], kq.tongCp[3], kq.tongCp[4], kq.tongCpNam, false);
        them('5. Lợi nhuận kế toán trước thuế (1 - 4)', kq.lnTruoc[1], kq.lnTruoc[2], kq.lnTruoc[3], kq.lnTruoc[4], kq.lnTruocNam, true);
        them('6. Cộng: Chi phí không được trừ [B4]', kq.cpLoai[1], kq.cpLoai[2], kq.cpLoai[3], kq.cpLoai[4], kq.cpLoaiNam, false);
        them('7. Trừ: Miễn thuế & lỗ năm trước chuyển sang [C2+C3]', '', '', '', '', kq.mienLoNam, false);
        them('8. Thu nhập tính thuế TNDN', kq.tntt[1], kq.tntt[2], kq.tntt[3], kq.tntt[4], kq.tnttNam, false);
        them('9. Thuế TNDN ước tính', kq.thue[1], kq.thue[2], kq.thue[3], kq.thue[4], kq.thueNam, true);
        them('10. Lợi nhuận sau thuế TNDN (5 - 9)', kq.lnSau[1], kq.lnSau[2], kq.lnSau[3], kq.lnSau[4], kq.lnSauNam, true);
      }
    }
    if (!rows.length) return null;
    return {
      name: 'Thuế TNDN & Lợi nhuận',
      cols: [{ width: 32 }, { width: 14 }, { width: 8 }, { width: 46 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 18 }, { width: 30 }],
      headers: ['Doanh nghiệp', 'MST', 'Năm', 'Chỉ tiêu', 'Quý 1', 'Quý 2', 'Quý 3', 'Quý 4', 'Cả năm', 'Thuế suất áp dụng'],
      rows
    };
  }

  /** Vẽ Dashboard. docs: toàn bộ tài liệu; pham: tài liệu trong thư mục đang xem; opt: { myMst } */
  function ve(docs, pham, opt) {
    const DC = window.DOI_CHIEU;
    canh.pham = pham; canh.docs = docs;
    const ds = dsCongTy(pham, opt.myMst);
    if (!ds.length) return '';
    if (!ds.some(c => c.mst === chon.mst)) chon.mst = ds[0].mst;
    const cty = ds.find(c => c.mst === chon.mst);
    const mst = cty.mst;

    const tks = pham.filter(d => DC.laToKhaiGTGT(d) && DC.docToKhai(d).mst === mst);
    const kieuKhai = tks.length ? DC.docToKhai(tks[tks.length - 1]).kieuKy : null; // công ty đang khai theo tháng hay quý
    const kieu = chon.kieu || kieuKhai || 'Q';
    const khacKieu = !!kieuKhai && kieuKhai !== kieu; // đang xem theo kỳ khác kỳ khai thuế: không gợi ý lập tờ khai
    const { mua, ban, biThayThe } = DC.chonHoaDon(pham, mst, '0000-00-00', '9999-12-31');

    // Gom theo kỳ
    const ky = new Map();
    const lay = k => { if (!ky.has(k)) ky.set(k, { k, banV: 0, banT: 0, muaV: 0, muaT: 0, nBan: 0, nMua: 0, tk: [] }); return ky.get(k); };
    for (const d of ban) { const k = khoaKy(kieu, d.ngay); if (!k) continue; const t = DC.tachHoaDon(d), g = lay(k); g.banV += t.V; g.banT += t.T; g.nBan++; }
    for (const d of mua) { const k = khoaKy(kieu, d.ngay); if (!k) continue; const t = DC.tachHoaDon(d), g = lay(k); g.muaV += t.V; g.muaT += t.T; g.nMua++; }
    for (const d of tks) {
      const t = DC.docToKhai(d);
      if (t.kieuKy !== kieu) continue; // tờ khai tháng khi đang xem theo quý (hoặc ngược lại): không gắn vào thẻ
      lay(t.kieuKy === 'Q' ? `${t.nam}-Q${t.quy}` : `${t.nam}-M${pad(t.thang)}`).tk.push(d);
    }
    const dsKy = [...ky.values()].sort((a, b) => a.k.localeCompare(b.k));

    // Trạng thái từng kỳ
    for (const g of dsKy) {
      // Có khai bổ sung thì lấy lần khai mới nhất
      g.tk.sort((a, b) => DC.docToKhai(a).soLan - DC.docToKhai(b).soLan);
      g.tkDoc = g.tk[g.tk.length - 1] || null;
      g.dc = g.tkDoc ? DC.choToKhai(docs, g.tkDoc) : null;
      const c = g.dc;
      if (!g.tkDoc && khacKieu) { g.loai = 'cho'; g.nhan = kieuKhai === 'Q' ? 'Công ty khai theo quý' : 'Công ty khai theo tháng'; }
      else if (!g.tkDoc) { g.loai = 'cho'; g.nhan = 'Chưa lập tờ khai'; }
      else if (c.trangThai === 'chuaCoHD') { g.loai = 'xem'; g.nhan = 'Chưa nạp hoá đơn'; }
      else if (c.trangThai === 'khop' && (!c.daNop || c.daNop.khop)) { g.loai = 'xong'; g.nhan = c.daNop ? 'Đã xong' : 'Khớp hoá đơn'; }
      else {
        const lechThue = c.dong.some(r => !r.khop && MA_THUE.has(r.ma)) || (c.daNop && !c.daNop.khop) || c.noiBo.some(r => !r.khop);
        g.loai = lechThue ? 'loi' : 'xem'; g.nhan = lechThue ? 'Lệch thuế' : 'Cần xem lại';
      }
      // Mô tả: những điều cụ thể nhất trước
      const y = [];
      if (c) {
        // Nhiều chỉ tiêu lệch vì cùng một hoá đơn ([23] và [24]…) thì gộp thành một dòng
        const lechSo = r => `${r.ma} ${r.toKhai > r.hoaDon ? 'dư' : 'thiếu'} ${so(Math.abs(r.lech))}`;
        const nhom = new Map();
        for (const r of c.dong) if (!r.khop) {
          const g0 = r.goiY[0], k = g0 && g0.idx >= 0 ? 'hd' + g0.idx : 'r' + r.ma;
          if (!nhom.has(k)) nhom.set(k, { g0, ds: [] });
          nhom.get(k).ds.push(r);
        }
        for (const { g0, ds: dsR } of nhom.values()) {
          const h = g0 && g0.idx >= 0 ? docs[g0.idx] : null;
          if (h && g0.loai === 'biThayThe') y.push(`Kê cả HĐ ${h.kyHieu}-${h.so} ngày ${h.ngay.split('-').reverse().join('/')} đã bị thay thế bởi HĐ ${h.thayTheBoi.kyHieu}-${h.thayTheBoi.so}: ${dsR.map(lechSo).join(', ')}`);
          else if (h && g0.loai === 'khacKy') y.push(`${dsR.map(lechSo).join(', ')} — HĐ ${h.kyHieu}-${h.so} ngày ${h.ngay.split('-').reverse().join('/')} thuộc kỳ khác nhưng có đúng số này`);
          else if (h && g0.loai === 'chuaKe') y.push(`${dsR.map(lechSo).join(', ')} — có thể chưa kê HĐ ${h.kyHieu}-${h.so} ngày ${h.ngay.split('-').reverse().join('/')}`);
          else y.push(`${dsR.map(lechSo).join(', ')} so với hoá đơn`);
        }
        const plSai = c.phuLuc.filter(r => !r.khop);
        if (plSai.length) y.push(`Phụ lục giảm thuế: ${plSai.length} đối tác không khớp (${plSai.slice(0, 2).map(r => r.ten).join(', ')}${plSai.length > 2 ? '…' : ''})`);
        for (const r of c.noiBo) if (!r.khop) y.push(`${r.bt}: tờ khai ghi ${so(r.trai)}, tính ra ${so(r.phai)}`);
        if (c.dauKy && !c.dauKy.khop) y.push(`[22] = ${so(c.dauKy.ct22)} khác [43] lần đầu ${c.dauKy.ky} = ${so(c.dauKy.ct43Truoc)}`);
        if (c.daNop && !c.daNop.khop) y.push(`Phải nộp [40] ${so(c.daNop.phaiNop)} nhưng đã nộp ${so(c.daNop.daNop)}`);
        if (c.trangThai === 'khop') y.push(`Khớp ${c.soMua + c.soBan} hoá đơn, ${c.phuLuc.length ? `phụ lục khớp ${c.phuLuc.length}/${c.phuLuc.length} đối tác, ` : ''}${c.noiBo.length}/${c.noiBo.length} công thức đúng.` + (c.daNop ? ` Đã nộp đủ theo ${c.daNop.chungTu.map(t => 'chứng từ ' + t.so + ' ngày ' + t.ngay).join(', ')}.` : ' Chưa nạp giấy nộp tiền để kiểm số đã nộp.'));
      } else {
        y.push(khacKieu ? `Đã có ${g.nBan + g.nMua} hoá đơn. Tờ khai và đối chiếu xem ở chế độ ${kieuKhai === 'Q' ? 'Quý' : 'Tháng'}.` : `Đã có ${g.nBan + g.nMua} hoá đơn. Hạn nộp tờ khai: ${hanNop(g.k)}.`);
      }
      g.moTa = y;
      g.so = window.SO_TAY ? window.SO_TAY.trangThaiKy(mst, g.k, pham) : { khoa: null };
      if (g.so.khoa && !g.tkDoc) g.loai = 'daKhoa'; // kỳ đã khoá không còn là việc "chưa lập"
      g.hdMo = c ? (c.dong.flatMap(r => r.goiY).find(x => x.idx >= 0) || null) : null;
    }

    const t = dsKy.reduce((s, g) => ({ banV: s.banV + g.banV, banT: s.banT + g.banT, muaV: s.muaV + g.muaV, muaT: s.muaT + g.muaT, n: s.n + g.nBan + g.nMua }), { banV: 0, banT: 0, muaV: 0, muaT: 0, n: 0 });
    const ngay = [...ban, ...mua].map(d => d.ngay).filter(Boolean).sort();
    const pham_ = ngay.length ? `${ngay[0].split('-').reverse().join('/')} – ${ngay[ngay.length - 1].split('-').reverse().join('/')}` : 'chưa có hoá đơn';
    const dem = l => dsKy.filter(g => g.loai === l).length;

    // Khách hàng / nhà cung cấp
    const gom = (dsHd, ben) => {
      const m = new Map();
      for (const d of dsHd) { const p = ben === 'ban' ? d.mua : d.ban; const k = DC.sachMst(p?.MST) || p?.Ten || '?'; const g = m.get(k) || { ten: p?.Ten || k, mst: DC.sachMst(p?.MST), v: 0, n: 0 }; g.v += DC.tachHoaDon(d).V; g.n++; m.set(k, g); }
      return [...m.values()].sort((a, b) => b.v - a.v);
    };
    const kh = gom(ban, 'ban'), ncc = gom(mua, 'mua');

    // Bảng hoá đơn: như Dashboard cũ, thẻ tổng, ô tiền của kỳ và dòng đối tác đều là bộ lọc, bấm là thấy hoá đơn ngay
    const attrLoc = p => `data-loc-hd="${esc(JSON.stringify(p))}"`;
    const giongLoc = p => JSON.stringify(p) === JSON.stringify(chon.loc);

    // Khách hàng / nhà cung cấp: mặc định 6 đơn vị lớn nhất; "Xem tất cả" bung đủ danh sách (có ô tìm, tự cuộn khi dài)
    const bangDoiTac = (ma, tieuDe, phu, dsDt, tong) => {
      const mo = !!chon.doiTacMo[ma], hien = mo ? dsDt : dsDt.slice(0, 6);
      return `<div class="ktt-khoi" data-doi-tac="${ma}"><div class="ktt-khoi-dau"><b>${tieuDe} <span class="ktt-nho">(${dsDt.length})</span></b><span>${phu}</span></div>
      ${mo && dsDt.length > 10 ? `<div class="ktt-tim-dt"><input type="search" placeholder="Tìm tên hoặc MST…" data-tim-dt="${ma}"></div>` : ''}
      <div class="${mo ? 'ktt-dt-cuon' : ''}"><table class="ktt-bang"><tbody>${hien.map((g, i) => `<tr data-tim="${esc((g.ten + ' ' + g.mst).toLowerCase())}" ${attrLoc({ c: ma === 'kh' ? 'ban' : 'mua', dt: g.mst || g.ten })} title="Xem hoá đơn của đơn vị này"><td>${mo ? `<span class="ktt-nho">${i + 1}.</span> ` : ''}${esc(g.ten)}<div class="ktt-nho">${esc(g.mst)} · ${g.n} HĐ</div></td><td>${so(g.v)}</td><td class="ktt-nho">${tong ? (g.v / tong * 100).toFixed(1).replace('.', ',') + '%' : ''}</td></tr>`).join('') || '<tr><td class="ktt-nho">Chưa có</td></tr>'}</tbody></table></div>
      ${dsDt.length > 6 ? `<button type="button" class="ktt-xem-them" data-xem-dt="${ma}">${mo ? 'Thu gọn' : `Xem tất cả ${dsDt.length} ${tieuDe.toLowerCase()}`}</button>` : ''}</div>`;
    };

    if (window.KIEM_TOAN_MISA && window.KIEM_TOAN_MISA.kiemToanHoaDon) {
      window.KIEM_TOAN_MISA.kiemToanHoaDon(docs, pham, mst, true);
    }
    const canChuY = d => (d.notes || []).some(n => n[0] === 'warn') || (d._ghiChuKiemToan || []).some(n => n[0] === 'warn');
    const tatCaHd = [...ban.map(d => ({ d, c: 'ban' })), ...mua.map(d => ({ d, c: 'mua' }))].sort((a, b) => (b.d.ngay || '').localeCompare(a.d.ngay || ''));
    const doiTacCua = x => x.c === 'ban' ? x.d.mua : x.d.ban;
    const dungLoc = x => {
      const l = chon.loc;
      if (!l) return true;
      if (l.c && x.c !== l.c) return false;
      if (l.ky && khoaKy(l.ky.includes('-Q') ? 'Q' : 'M', x.d.ngay) !== l.ky) return false;
      if (l.chuY && !canChuY(x.d)) return false;
      if (l.ruiRo && !(x.d._ruiRo && x.d._ruiRo[l.ruiRo])) return false;
      if (l.dt) { const p = doiTacCua(x); if ((DC.sachMst(p?.MST) || p?.Ten || '?') !== l.dt) return false; }
      return true;
    };
    const hdLoc = tatCaHd.filter(dungLoc);
    const TEN_RUI_RO = { ngayKy: 'Ký số lệch ngày lập', tienMat: 'Rủi ro thanh toán tiền mặt', thongTinMua: 'Sai thông tin người mua' };
    const nhanLoc = () => { const l = chon.loc; if (!l) return ''; const y = []; if (l.c) y.push(l.c === 'ban' ? 'Bán ra' : 'Mua vào'); if (l.ky) y.push(tenKy(l.ky)); if (l.chuY) y.push('Cần chú ý'); if (l.ruiRo) y.push(TEN_RUI_RO[l.ruiRo] || 'Rủi ro kiểm toán'); if (l.dt) { const p = hdLoc[0] && doiTacCua(hdLoc[0]); y.push(p?.Ten || l.dt); } return y.join(' · '); };
    const congLoc = hdLoc.reduce((s, x) => { const t = DC.tachHoaDon(x.d); s.V += t.V; s.T += t.T; return s; }, { V: 0, T: 0 });
    const HIEN_TOI_DA = 200;
    const dongHd = x => { const p = doiTacCua(x), t = DC.tachHoaDon(x.d), i = docs.indexOf(x.d);
      return `<tr data-mo-doc="${i}" style="cursor:pointer" title="Mở hoá đơn"><td><span class="tag-pl ${x.c}">${x.c === 'ban' ? 'BÁN RA' : 'MUA VÀO'}</span></td><td>${esc(x.d.kyHieu)}-${esc(x.d.so)}</td><td>${esc((x.d.ngay || '').split('-').reverse().join('/'))}</td><td>${esc(p?.Ten || '')}<div class="ktt-nho">${esc(p?.MST || '')}</div></td><td>${so(t.V)}</td><td>${so(t.T)}</td><td>${canChuY(x.d) ? '<span class="ktt-huy ktt-xem">Cần chú ý</span>' : ''}</td></tr>`; };
    const khoiHd = `<div class="ktt-khoi" id="kttHoaDon"><div class="ktt-khoi-dau"><b>Hoá đơn</b><div class="ktt-chip">
        <button type="button" ${attrLoc({ tat: 1 })} class="${chon.loc ? '' : 'on'}">Tất cả (${tatCaHd.length})</button>
        <button type="button" ${attrLoc({ c: 'mua' })} class="${giongLoc({ c: 'mua' }) ? 'on' : ''}">Mua vào (${mua.length})</button>
        <button type="button" ${attrLoc({ c: 'ban' })} class="${giongLoc({ c: 'ban' }) ? 'on' : ''}">Bán ra (${ban.length})</button>
        <button type="button" ${attrLoc({ chuY: 1 })} class="${giongLoc({ chuY: 1 }) ? 'on' : ''}">Cần chú ý (${tatCaHd.filter(x => canChuY(x.d)).length})</button>
        ${chon.loc ? `<span class="ktt-dang-loc" id="kttDangLoc">Đang lọc: <b>${esc(nhanLoc())}</b> · ${hdLoc.length} hoá đơn · trước thuế ${so(congLoc.V)} · thuế ${so(congLoc.T)}</span>` : ''}
      </div></div>
      <div class="ktt-hd-cuon"><table class="ktt-bang ktt-bang-hd"><thead><tr><th>Loại</th><th>Hoá đơn</th><th>Ngày</th><th>Đối tác</th><th>Trước thuế</th><th>Thuế</th><th></th></tr></thead><tbody>${hdLoc.slice(0, HIEN_TOI_DA).map(dongHd).join('') || '<tr><td colspan="7" class="ktt-nho">Không có hoá đơn nào khớp bộ lọc.</td></tr>'}</tbody></table></div>
      ${hdLoc.length > HIEN_TOI_DA ? `<div class="ktt-nho" style="padding:8px">Hiện ${HIEN_TOI_DA} hoá đơn mới nhất trong ${hdLoc.length}. Xem đủ ở Kho hoá đơn.</div>` : ''}</div>`;

    // Sổ theo kỳ là nơi làm việc chính: mỗi năm một dòng cộng nổi bật (bấm để gập / mở), dưới là các kỳ, mới nhất trên cùng.
    // Mở sẵn năm mới nhất và năm có kỳ lệch / cần xem; năm cũ chỉ "chưa lập" thường là chưa nạp tờ khai năm đó — gập lại cho gọn
    const nams = [...new Set(dsKy.map(g => g.k.slice(0, 4)))].sort().reverse();
    const congDs = dsN => dsN.reduce((x, g) => ({ banV: x.banV + g.banV, banT: x.banT + g.banT, muaV: x.muaV + g.muaV, muaT: x.muaT + g.muaT,
      n: x.n + g.nBan + g.nMua, pn: x.pn + (g.dc ? g.dc.tk.ct.ct40 || 0 : 0) }), { banV: 0, banT: 0, muaV: 0, muaT: 0, n: 0, pn: 0 });
    const oSo = c => `<td>${so(c.banV)}</td><td>${so(c.banT)}</td><td>${so(c.muaV)}</td><td>${so(c.muaT)}</td><td>${so(c.banT - c.muaT)}</td>`;
    const oSoKy = g => { const b = attrLoc({ c: 'ban', ky: g.k }), m = attrLoc({ c: 'mua', ky: g.k }); return `<td ${b} title="Xem hoá đơn bán ra của kỳ">${so(g.banV)}</td><td ${b}>${so(g.banT)}</td><td ${m} title="Xem hoá đơn mua vào của kỳ">${so(g.muaV)}</td><td ${m}>${so(g.muaT)}</td><td>${so(g.banT - g.muaT)}</td>`; };
    const tenHd = i => esc(docs[i].kyHieu + '-' + docs[i].so);
    // Cột Tờ khai: chưa lập → nút lập ngay; đã có → bấm trạng thái để mở tờ khai; lệch → thêm nút lập bổ sung
    const nutKhoa = g => {
      const l = g.so.khoa;
      if (!window.SO_TAY || (!l && g.so.giao)) return '';
      return `<button type="button" class="ktt-huy ktt-bam ktt-phu" data-khoa-so="${esc(JSON.stringify({ mst, k: l ? l.ky : g.k, mo: !!l }))}">${l ? 'Mở khoá' : 'Khoá sổ'}</button>`;
    };
    const oToKhai = g => {
      if (g.so.khoa) return (g.tkDoc ? `<button type="button" class="ktt-huy ktt-${g.loai} ktt-bam" data-mo-doc="${docs.indexOf(g.tkDoc)}" title="Mở tờ khai và đối chiếu">${g.nhan}</button>` : '') + `<span class="ktt-huy ktt-khoa">Đã khoá sổ</span>`;
      if (!g.tkDoc) return khacKieu ? `<span class="ktt-huy ktt-cho">${g.nhan}</span>`
        : `<button type="button" class="ktt-huy ktt-cho ktt-bam" data-lap-tk="${esc(JSON.stringify({ mst, ky: kyLap(g.k) }))}" title="Hạn nộp ${hanNop(g.k)}">+ Lập tờ khai</button>`;
      const i = docs.indexOf(g.tkDoc);
      return `<button type="button" class="ktt-huy ktt-${g.loai} ktt-bam" data-mo-doc="${i}" title="Mở tờ khai và đối chiếu">${g.nhan}</button>`
        + (g.loai === 'loi' || g.loai === 'xem' ? `<button type="button" class="ktt-huy ktt-bam ktt-phu" data-khbs="${i}" title="Lập tờ khai bổ sung theo hoá đơn">Lập bổ sung</button>` : '');
    };
    const dongKy = g => `<tr class="ktt-dong-ky ktt-${g.loai}" data-trang-thai="${esc(g.nhan)}" data-ky="${esc(g.k)}"><td><span class="ktt-ten-ky">${tenKy(g.k)}</span>${
        g.so.khoa ? (g.so.ss.moTa.length ? `<div class="ktt-ly-do ktt-doi-sau-khoa" title="Khoá sổ ngày ${esc(g.so.lucVN)}">Sau khi khoá sổ: ${esc(g.so.ss.moTa.join(', '))}</div>` : `<div class="ktt-nho">Khoá sổ ngày ${esc(g.so.lucVN)}${g.so.ss.chuaNap ? ' · chưa nạp hoá đơn kỳ này' : ''}</div>`)
        : (g.loai === 'loi' || g.loai === 'xem') && g.moTa.length ? `<div class="ktt-ly-do" title="${esc(g.moTa.join(' · '))}">${esc(g.moTa[0])}${g.hdMo ? ` · <a class="ktt-lk" data-mo-doc="${g.hdMo.idx}">mở HĐ ${tenHd(g.hdMo.idx)}</a>` : ''}</div>`
        : !g.tkDoc && !khacKieu ? `<div class="ktt-nho">Hạn nộp ${hanNop(g.k)}</div>` : ''}</td>${oSoKy(g)}<td>${g.dc ? so(g.dc.tk.ct.ct40) : ''}</td><td>${window.SO_TAY ? `<button type="button" class="ktt-so-hd" data-so-hd="${esc(g.k)}" title="Xem hoá đơn của kỳ, thêm ghi chú">${g.nBan + g.nMua}</button>` : g.nBan + g.nMua}</td><td class="ktt-o-tk">${oToKhai(g)}${nutKhoa(g)}</td></tr>`;
    const dongNam = nam => {
      const dsN = dsKy.filter(g => g.k.startsWith(nam)).reverse(), c = congDs(dsN);
      const demN = l => dsN.filter(g => g.loai === l).length;
      const mo = nam in chon.namMo ? chon.namMo[nam] : (nam === nams[0] || demN('loi') + demN('xem') > 0);
      const huy = [demN('loi') && `<span class="ktt-huy ktt-loi">${demN('loi')} lệch</span>`, demN('xem') && `<span class="ktt-huy ktt-xem">${demN('xem')} cần xem</span>`,
        demN('cho') && !khacKieu && `<span class="ktt-huy ktt-cho">${demN('cho')} chưa lập</span>`, demN('xong') && `<span class="ktt-huy ktt-xong">${demN('xong')} xong</span>`].filter(Boolean).join('');
      return (nams.length > 1 ? `<tr class="ktt-dong-nam" data-nam-tg="${nam}" data-mo="${mo ? 1 : 0}" title="Bấm để ${mo ? 'gập' : 'mở'} các kỳ của năm ${nam}">
          <td><span class="ktt-mui">${mo ? '▾' : '▸'}</span>Năm ${nam} <span class="ktt-nho">· ${dsN.length} ${kieu === 'Q' ? 'quý' : 'tháng'}</span></td>${oSo(c)}<td>${c.pn ? so(c.pn) : ''}</td><td>${c.n}</td><td class="ktt-o-tk">${huy}</td></tr>` : '')
        + (mo || nams.length === 1 ? dsN.map(dongKy).join('') : '');
    };

    // Khối Thuế TNDN và lợi nhuận sau thuế
    const namMapTndn = thuThapTndn(docs, pham, mst, ban, mua);
    const { html: khoiTndn, kq: kqTndn } = veKhoiTndn(mst, namMapTndn, attrLoc);

    // Chia 3 tab rõ ràng: (1) Thuế GTGT · (2) Thu nhập DN & Lợi nhuận sau thuế · (3) Tổng hợp hóa đơn & Khách hàng
    const tabHopLe = ['gtgt', 'tndn', 'hoadon'];
    const macDinhTab = (!dsKy.length && !tatCaHd.length && namMapTndn.size) ? 'tndn' : 'gtgt';
    const tab = tabHopLe.includes(chon.tab) ? chon.tab : macDinhTab;
    const soChuY = tatCaHd.filter(x => canChuY(x.d)).length;
    const khoiKiemToan = (tatCaHd.length && window.KIEM_TOAN_MISA && window.KIEM_TOAN_MISA.veKhoiKiemToan)
      ? window.KIEM_TOAN_MISA.veKhoiKiemToan(docs, pham, mst, attrLoc, giongLoc)
      : '';

    const phuTabGtgt = dem('loi') ? `${dem('loi')} kỳ lệch` : dsKy.length ? `${dsKy.length} ${kieu === 'Q' ? 'quý' : 'tháng'}` : '0 kỳ';
    const phuTabTndn = kqTndn ? `Năm ${kqTndn.nam} · ${chuTs(kqTndn.thueSuat)}` : 'Chưa có';
    const phuTabHd = `${so(tatCaHd.length)} HĐ · ${so(kh.length + ncc.length)} đối tác`;

    const tomHdKh = `<div class="ktt-hd-tom">
      <div>
        <span class="ktt-nhan-o">Tổng hoá đơn hợp lệ</span>
        <b>${so(tatCaHd.length)}</b>
        <span class="ktt-phu-o">${so(ban.length)} bán ra · ${so(mua.length)} mua vào${biThayThe.length ? ` · loại ${biThayThe.length} HĐ thay thế` : ''}</span>
      </div>
      <div ${kh[0] ? `${attrLoc({ c: 'ban', dt: kh[0].mst || kh[0].ten })} title="Xem hoá đơn của khách hàng lớn nhất"` : ''}>
        <span class="ktt-nhan-o">Khách hàng (bán ra)</span>
        <b>${so(kh.length)}</b>
        <span class="ktt-phu-o">${kh[0] ? `${esc(kh[0].ten)} (${t.banV ? (kh[0].v / t.banV * 100).toFixed(1).replace('.', ',') + '%' : '0%'})` : 'Chưa phát sinh bán ra'}</span>
      </div>
      <div ${ncc[0] ? `${attrLoc({ c: 'mua', dt: ncc[0].mst || ncc[0].ten })} title="Xem hoá đơn của nhà cung cấp lớn nhất"` : ''}>
        <span class="ktt-nhan-o">Nhà cung cấp (mua vào)</span>
        <b>${so(ncc.length)}</b>
        <span class="ktt-phu-o">${ncc[0] ? `${esc(ncc[0].ten)} (${t.muaV ? (ncc[0].v / t.muaV * 100).toFixed(1).replace('.', ',') + '%' : '0%'})` : 'Chưa phát sinh mua vào'}</span>
      </div>
      <div ${soChuY ? `${attrLoc({ chuY: 1 })} title="Bấm để lọc hoá đơn cần chú ý"` : ''}>
        <span class="ktt-nhan-o">Hoá đơn cần chú ý</span>
        <b class="${soChuY > 0 ? 'ktt-am' : 'ktt-duong'}">${so(soChuY)}</b>
        <span class="ktt-phu-o">${soChuY > 0 ? 'Có cảnh báo chữ ký / kiểm toán' : 'Tất cả hoá đơn bình thường'}</span>
      </div>
    </div>`;

    return `<div class="ktt-dash">
      ${ds.length > 1 ? `<div class="ktt-cty">${ds.map(c => `<button type="button" class="ktt-cty-nut${c.mst === mst ? ' on' : ''}" data-cty="${esc(c.mst)}">${esc(c.ten || c.mst)}<span>${esc(c.mst)}</span></button>`).join('')}</div>` : ''}
      <div class="ktt-dau">
        <div><h1>${esc(cty.ten || 'MST ' + mst)}</h1><div class="ktt-nho">MST ${esc(mst)} · hoá đơn từ ${pham_} · ${t.n} hoá đơn còn hiệu lực${biThayThe.length ? ` (${biThayThe.length} hoá đơn bị thay thế đã loại)` : ''}</div></div>
        <div class="ktt-dau-nut">
          <div class="ktt-chon-ky"><span data-kieu="M" class="${kieu === 'M' ? 'on' : ''}">Tháng</span><span data-kieu="Q" class="${kieu === 'Q' ? 'on' : ''}">Quý</span></div>
          <button type="button" class="ktt-nut" data-mo-misa="${esc(mst)}" title="Xuất bảng kê chuẩn Import MISA / FAST kèm tự học tài khoản định khoản">Xuất MISA / Định khoản</button>
          <button type="button" class="ktt-nut btn-xuat-excel">Xuất Excel</button>
          <button type="button" class="ktt-nut ktt-chinh" data-lap-tk="${esc(JSON.stringify({ mst }))}">Lập tờ khai</button>
        </div>
      </div>

      <div class="ktt-tabs" role="tablist" aria-label="Các mục Dashboard">
        <button type="button" role="tab" aria-selected="${tab === 'gtgt'}" class="ktt-tab${tab === 'gtgt' ? ' on' : ''}" data-ktt-tab="gtgt">Thuế GTGT<span class="ktt-tab-phu">${esc(phuTabGtgt)}</span></button>
        <button type="button" role="tab" aria-selected="${tab === 'tndn'}" class="ktt-tab${tab === 'tndn' ? ' on' : ''}" data-ktt-tab="tndn">Thu nhập DN &amp; Lợi nhuận sau thuế<span class="ktt-tab-phu" data-tndn-o="tabPhuTndn">${esc(phuTabTndn)}</span></button>
        <button type="button" role="tab" aria-selected="${tab === 'hoadon'}" class="ktt-tab${tab === 'hoadon' ? ' on' : ''}" data-ktt-tab="hoadon">Tổng hợp hóa đơn &amp; Khách hàng<span class="ktt-tab-phu">${esc(phuTabHd)}</span></button>
      </div>

      <section class="ktt-tab-panel" data-tab-panel="gtgt"${tab === 'gtgt' ? '' : ' hidden'}>
        <div class="ktt-tom">
          ${dem('loi') ? `<span class="ktt-loi">${dem('loi')} kỳ lệch thuế</span>` : ''}${dem('xem') ? `<span class="ktt-xem">${dem('xem')} kỳ cần xem lại</span>` : ''}${dem('xong') ? `<span class="ktt-xong">${dem('xong')} kỳ đã xong</span>` : ''}${dem('cho') && !khacKieu ? `<span class="ktt-cho">${dem('cho')} kỳ chưa lập</span>` : ''}
        </div>
        ${(n => n ? `<div class="ktt-tom"><span class="ktt-loi">${n} kỳ đã khoá sổ có hoá đơn thay đổi</span></div>` : '')(dsKy.filter(g => g.so.khoa && g.so.ss.moTa.length).length)}
        <div class="ktt-tong">
          <div ${attrLoc({ c: 'ban' })} class="${giongLoc({ c: 'ban' }) ? 'on' : ''}" title="Bấm để xem hoá đơn bán ra"><span>Bán ra</span><b>${so(t.banV)}</b></div><div ${attrLoc({ c: 'ban' })}><span>Thuế đầu ra</span><b>${so(t.banT)}</b></div>
          <div ${attrLoc({ c: 'mua' })} class="${giongLoc({ c: 'mua' }) ? 'on' : ''}" title="Bấm để xem hoá đơn mua vào"><span>Mua vào</span><b>${so(t.muaV)}</b></div><div ${attrLoc({ c: 'mua' })}><span>Thuế đầu vào</span><b>${so(t.muaT)}</b></div>
          <div><span>Chênh lệch thuế</span><b class="${t.banT - t.muaT > 0 ? 'ktt-am' : ''}">${t.banT - t.muaT > 0 ? '+' : ''}${so(t.banT - t.muaT)}</b></div>
        </div>
        ${dsKy.length ? `<div class="ktt-khoi"><div class="ktt-khoi-dau"><b>Theo kỳ kê khai</b><span>Đơn vị: đồng · bấm trạng thái để mở tờ khai${nams.length > 1 ? ' · bấm dòng năm để gập / mở' : ''}</span></div>
          <table class="ktt-bang ktt-so-sach"><thead><tr><th>Kỳ</th><th>Bán ra</th><th>Thuế ra</th><th>Mua vào</th><th>Thuế vào</th><th>Chênh lệch</th><th title="Thuế GTGT còn phải nộp trên tờ khai">Phải nộp [40]</th><th>Số HĐ</th><th>Tờ khai</th></tr></thead><tbody>
            ${nams.map(dongNam).join('')}
            ${(c => `<tr class="ktt-cong"><td>Cộng${nams.length > 1 ? ` ${nams.length} năm` : ''}</td>${oSo(c)}<td>${c.pn ? so(c.pn) : ''}</td><td>${c.n}</td><td></td></tr>`)(congDs(dsKy))}
          </tbody></table></div>` : `<div class="ktt-khoi"><div class="ktt-khoi-dau"><b>Theo kỳ kê khai</b><span class="ktt-nho">Chưa có hoá đơn hoặc tờ khai thuế GTGT của đơn vị này</span></div></div>`}
      </section>

      <section class="ktt-tab-panel" data-tab-panel="tndn"${tab === 'tndn' ? '' : ' hidden'}>
        ${khoiTndn || `<div class="ktt-khoi"><div class="ktt-khoi-dau"><b>Thuế TNDN và lợi nhuận sau thuế</b><span class="ktt-nho">Chưa có dữ liệu doanh thu, chi phí hoặc báo cáo tài chính</span></div></div>`}
      </section>

      <section class="ktt-tab-panel" data-tab-panel="hoadon"${tab === 'hoadon' ? '' : ' hidden'}>
        ${tomHdKh}
        ${khoiKiemToan}
        ${tatCaHd.length ? `<div class="ktt-hai">${bangDoiTac('kh', 'Khách hàng', 'Giá trị bán ra', kh, t.banV)}${bangDoiTac('ncc', 'Nhà cung cấp', 'Giá trị mua vào', ncc, t.muaV)}</div>` : ''}
        ${tatCaHd.length ? khoiHd : `<div class="ktt-khoi"><div class="ktt-khoi-dau"><b>Hoá đơn</b><span class="ktt-nho">Chưa nạp hoá đơn điện tử của đơn vị này</span></div></div>`}
      </section>

      <div class="ktt-chan">Số liệu chưa trừ thuế kỳ trước chuyển sang · hoá đơn trùng và hoá đơn bị thay thế đã loại · (C) August87 - 0982722036</div>
    </div>`;
  }

  const docSoNhap = s => {
    const t = String(s ?? '').trim();
    if (!t || t === '-' || t === '−') return 0;
    const am = t[0] === '-' || t[0] === '−';
    const n = Number(t.replace(/[^0-9]/g, ''));
    return isFinite(n) ? (am ? -n : n) : 0;
  };

  /** Gắn sự kiện một lần lên khung chính. veLai(): vẽ lại Dashboard; moLapTk(preset): mở hộp lập tờ khai;
   *  chonCty(mst): báo app công ty vừa chọn, để danh sách bên trái gắn nhãn Mua vào / Bán ra theo công ty đó */
  function ganSuKien(khung, veLai, moLapTk, chonCty, moDoc) {
    // Lọc danh sách khách hàng / nhà cung cấp & cập nhật tức thì bảng Thuế TNDN khi gõ
    khung.addEventListener('input', e => {
      const o = e.target.closest('[data-tim-dt]');
      if (o) {
        const q = o.value.trim().toLowerCase();
        o.closest('.ktt-khoi').querySelectorAll('tr[data-tim]').forEach(tr => { tr.hidden = !!q && !tr.dataset.tim.includes(q); });
        return;
      }
      const nhap = e.target.closest('[data-tndn-nhap]');
      if (nhap && canh.mst && canh.namTndn) {
        const loai = nhap.dataset.tndnNhap, q = +nhap.dataset.quy;
        const ranh = nhap.value.trim();
        ghiCauHinhTndn(canh.mst, canh.namTndn, c => {
          if (loai === 'cpKhac') c.cpKhac[q] = ranh === '' ? 0 : docSoNhap(ranh);
          else if (loai === 'cpLoai') c.cpLoai[q] = Math.max(0, docSoNhap(ranh));
          else if (loai === 'mienLo') c.mienLo = Math.max(0, docSoNhap(ranh));
        });
        capNhatTndnTaiCho(khung);
        return;
      }
      const tsKhac = e.target.closest('[data-tndn-ts-khac]');
      if (tsKhac && canh.mst && canh.namTndn) {
        const v = Number(String(tsKhac.value || '').replace(',', '.').replace(/[^0-9.]/g, ''));
        ghiCauHinhTndn(canh.mst, canh.namTndn, c => { c.tsKhac = isFinite(v) ? Math.min(50, Math.max(0, v)) : 0; });
        capNhatTndnTaiCho(khung);
      }
    });

    khung.addEventListener('change', e => {
      const selTs = e.target.closest('[data-tndn-ts]');
      if (selTs && canh.mst && canh.namTndn) {
        ghiCauHinhTndn(canh.mst, canh.namTndn, c => { c.tsCheDo = selTs.value; });
        veLai();
        return;
      }
      const nhap = e.target.closest('[data-tndn-nhap]');
      if (nhap) {
        const v = nhap.dataset.tndnNhap === 'cpKhac' ? docSoNhap(nhap.value) : Math.max(0, docSoNhap(nhap.value));
        nhap.value = v ? (v < 0 ? '-' + Math.abs(v).toLocaleString('vi-VN') : so(v)) : '';
      }
    });

    khung.addEventListener('click', e => {
      const nutMisa = e.target.closest('[data-mo-misa]');
      if (nutMisa) {
        if (window.KIEM_TOAN_MISA && window.KIEM_TOAN_MISA.moHopThoaiMisa) {
          window.KIEM_TOAN_MISA.moHopThoaiMisa(canh.pham && canh.pham.length ? canh.pham : canh.docs, nutMisa.dataset.moMisa || chon.mst);
        }
        return;
      }
      const tabNut = e.target.closest('[data-ktt-tab]');
      if (tabNut) { chon.tab = tabNut.dataset.kttTab; veLai(); return; }
      const cty = e.target.closest('[data-cty]');
      if (cty) { chon.mst = cty.dataset.cty; chon.kieu = ''; chon.namMo = {}; chon.doiTacMo = {}; chon.loc = null; chon.namTndn = ''; if (chonCty) chonCty(chon.mst); veLai(); return; }
      const namTndn = e.target.closest('[data-nam-tndn]');
      if (namTndn) { chon.namTndn = namTndn.dataset.namTndn; veLai(); return; }
      const resetTndn = e.target.closest('[data-tndn-reset]');
      if (resetTndn && canh.mst && canh.namTndn) { xoaCauHinhTndn(canh.mst, canh.namTndn); veLai(); return; }
      const lh = e.target.closest('[data-loc-hd]');
      if (lh && !e.target.closest('a, input, select, [data-so-hd], [data-khoa-so], [data-lap-tk], [data-khbs], [data-mo-doc]')) {
        const p = JSON.parse(lh.dataset.locHd), giong = JSON.stringify(p) === JSON.stringify(chon.loc);
        chon.loc = p.tat || giong ? null : p; // bấm lại đúng bộ lọc đang bật thì tắt
        chon.tab = 'hoadon';
        veLai();
        const b = khung.querySelector('#kttHoaDon');
        if (b) b.scrollIntoView({ block: 'start' });
        return;
      }
      const k = e.target.closest('.ktt-chon-ky [data-kieu]');
      if (k) { chon.kieu = k.dataset.kieu; chon.namMo = {}; chon.loc = null; veLai(); return; }
      const n = e.target.closest('[data-nam-tg]');
      if (n && !e.target.closest('button, a')) { chon.namMo[n.dataset.namTg] = n.dataset.mo !== '1'; veLai(); return; }
      const x = e.target.closest('[data-xem-dt]');
      if (x) { chon.doiTacMo[x.dataset.xemDt] = !chon.doiTacMo[x.dataset.xemDt]; veLai(); return; }
      const ks = e.target.closest('[data-khoa-so]');
      if (ks) {
        const p = JSON.parse(ks.dataset.khoaSo), ST = window.SO_TAY, ten = ST.tenKy(p.k);
        if (p.mo) { if (confirm(`Mở khoá sổ ${ten}?\nGhi chú và lập tờ khai của kỳ này sẽ làm được trở lại.`)) { ST.moKhoa(p.mst, p.k); veLai(); } return; }
        if (confirm(`Khoá sổ ${ten}?\n\n- Ghi chú hoá đơn của kỳ không sửa được nữa.\n- Không lập tờ khai hay tờ khai bổ sung cho kỳ này.\n- App ghi lại danh sách hoá đơn và số tiền hiện tại, sau này hoá đơn của kỳ thay đổi sẽ cảnh báo.`)) { ST.khoaKy(p.mst, p.k, canh.pham); veLai(); }
        return;
      }
      const sh = e.target.closest('[data-so-hd]');
      if (sh) { window.SO_TAY.moBang({ docs: canh.docs, pham: canh.pham, mst: chon.mst, k: sh.dataset.soHd, moDoc: moDoc || (() => {}), doiThay: veLai }); return; }
      const l = e.target.closest('[data-lap-tk]');
      if (l) { let p = {}; try { p = JSON.parse(l.dataset.lapTk); } catch (err) { } moLapTk(p); }
    });
  }

  window.DASHBOARD_KE_TOAN = { coDuLieu, ve, ganSuKien, dsCongTy, tinhTndnNam, xuatTndnExcel };
})();
