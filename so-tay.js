// so-tay.js — Sổ tay kế toán: khoá sổ theo kỳ và ghi chú theo hoá đơn. Lưu trong localStorage của app, chỉ trên máy này.
// Hoá đơn nhận theo MST bán + mẫu + ký hiệu + số (không theo đường dẫn), nên chuyển thư mục hay đổi tên tệp không mất ghi chú.
// Khoá sổ: lưu "mốc" (danh sách hoá đơn và tiền lúc khoá) để cảnh báo khi hoá đơn của kỳ đã khoá thay đổi về sau.
(() => {
  'use strict';

  const KHOA_LS = 'xmlpro.soTay.v1';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const so = v => Math.round(v || 0).toLocaleString('vi-VN');
  const pad = n => String(n).padStart(2, '0');
  const ngayVN = s => (s || '').split('-').reverse().join('/');

  function doc() {
    try {
      const d = JSON.parse(localStorage.getItem(KHOA_LS)) || {};
      return { ghiChu: d.ghiChu || {}, khoa: d.khoa || {}, tt: d.tt || {} };
    } catch (e) { return { ghiChu: {}, khoa: {}, tt: {} }; }
  }
  function luu(d) {
    try { localStorage.setItem(KHOA_LS, JSON.stringify(d)); return true; }
    catch (e) { alert('Không lưu được sổ tay: bộ nhớ của app đã đầy.'); return false; }
  }

  const sachMst = s => window.DOI_CHIEU ? window.DOI_CHIEU.sachMst(s) : String(s || '').trim();
  const khoaHD = d => [sachMst(d.ban?.MST), (d.mau || '').trim(), (d.kyHieu || '').trim(), (d.so || '').trim()].join('|');

  /** Kỳ dạng 2026-Q3 hoặc 2026-M07 → khoảng ngày */
  function khoangKy(k) {
    const [nam, x] = k.split('-');
    const t0 = x[0] === 'Q' ? (+x.slice(1) - 1) * 3 + 1 : +x.slice(1);
    const t1 = x[0] === 'Q' ? t0 + 2 : t0;
    return { tu: `${nam}-${pad(t0)}-01`, den: `${nam}-${pad(t1)}-${pad(new Date(+nam, t1, 0).getDate())}` };
  }
  const tenKy = k => { const [nam, x] = k.split('-'); return x[0] === 'Q' ? `Quý ${x.slice(1)}/${nam}` : `Tháng ${x.slice(1)}/${nam}`; };

  // ---------- Khoá sổ ----------
  const dsKhoa = mst => doc().khoa[sachMst(mst)] || [];

  /** Khoá sổ có giao với khoảng ngày (dùng để chặn lập tờ khai) */
  const khoaGiao = (mst, tu, den) => dsKhoa(mst).find(l => { const r = khoangKy(l.ky); return r.tu <= den && r.den >= tu; }) || null;
  /** Khoá sổ phủ trọn khoảng ngày */
  const khoaPhu = (mst, tu, den) => dsKhoa(mst).find(l => { const r = khoangKy(l.ky); return r.tu <= tu && r.den >= den; }) || null;
  /** Hoá đơn có thuộc kỳ đã khoá của bên bán hoặc bên mua không */
  function khoaCuaHD(d) {
    if (!d || !d.ngay) return null;
    return khoaPhu(d.ban?.MST, d.ngay, d.ngay) || khoaPhu(d.mua?.MST, d.ngay, d.ngay);
  }

  /** Ảnh chụp hoá đơn còn hiệu lực của kỳ: khoá hoá đơn → [tiền, thuế] */
  function chupMoc(pham, mst, tu, den) {
    const DC = window.DOI_CHIEU;
    const { mua, ban } = DC.chonHoaDon(pham, mst, tu, den);
    const moc = {};
    for (const d of [...ban, ...mua]) { const t = DC.tachHoaDon(d); moc[khoaHD(d)] = [Math.round(t.V), Math.round(t.T)]; }
    return moc;
  }

  function khoaKy(mst, k, pham) {
    const r = khoangKy(k), m = sachMst(mst), d = doc();
    const ds = (d.khoa[m] || []).filter(l => l.ky !== k);
    ds.push({ ky: k, luc: new Date().toISOString(), moc: chupMoc(pham, m, r.tu, r.den) });
    d.khoa[m] = ds;
    return luu(d);
  }
  function moKhoa(mst, k) {
    const m = sachMst(mst), d = doc();
    d.khoa[m] = (d.khoa[m] || []).filter(l => l.ky !== k);
    if (!d.khoa[m].length) delete d.khoa[m];
    return luu(d);
  }

  /** So hoá đơn đang nạp với mốc lúc khoá. Chưa nạp hoá đơn nào của kỳ thì không kết luận gì. */
  function soVoiMoc(l, pham, mst) {
    const r = khoangKy(l.ky), nay = chupMoc(pham, mst, r.tu, r.den);
    const kn = Object.keys(nay), kc = Object.keys(l.moc || {});
    if (!kn.length) return { chuaNap: true, them: [], mat: [], doi: [], moTa: [] };
    const them = kn.filter(k => !(k in l.moc)), mat = kc.filter(k => !(k in nay));
    const doi = kn.filter(k => k in l.moc && (l.moc[k][0] !== nay[k][0] || l.moc[k][1] !== nay[k][1]));
    const cong = (m, i) => Object.values(m).reduce((s, v) => s + v[i], 0);
    const lechV = cong(nay, 0) - cong(l.moc, 0), lechT = cong(nay, 1) - cong(l.moc, 1);
    const moTa = [];
    if (them.length) moTa.push(`thêm ${them.length} hoá đơn`);
    if (mat.length) moTa.push(`thiếu ${mat.length} hoá đơn so với lúc khoá`);
    if (doi.length) moTa.push(`${doi.length} hoá đơn đổi tiền`);
    if (moTa.length && (lechV || lechT)) moTa.push(`tiền lệch ${lechV > 0 ? '+' : ''}${so(lechV)}, thuế lệch ${lechT > 0 ? '+' : ''}${so(lechT)}`);
    return { chuaNap: false, them, mat, doi, lechV, lechT, moTa };
  }

  /** Trạng thái khoá của một dòng kỳ trên Dashboard */
  function trangThaiKy(mst, k, pham) {
    const r = khoangKy(k), l = khoaPhu(mst, r.tu, r.den);
    if (!l) return { khoa: null, giao: khoaGiao(mst, r.tu, r.den) };
    return { khoa: l, ss: soVoiMoc(l, pham, mst), lucVN: new Date(l.luc).toLocaleDateString('vi-VN') };
  }

  // ---------- Ghi chú ----------
  const ghiChu = d => doc().ghiChu[khoaHD(d)] || '';
  /** Ghi một loạt [hoá đơn, nội dung]. Hoá đơn thuộc kỳ đã khoá bị bỏ qua. Trả về { ghi, boQua } */
  function ghiLoat(cap) {
    const d = doc();
    let ghi = 0, boQua = 0;
    for (const [hd, nd] of cap) {
      if (khoaCuaHD(hd)) { boQua++; continue; }
      const k = khoaHD(hd), t = String(nd ?? '').trim();
      if (t) d.ghiChu[k] = t; else delete d.ghiChu[k];
      ghi++;
    }
    if (ghi) luu(d);
    return { ghi, boQua };
  }

  /** Đánh dấu trạng thái công việc: ht đã hạch toán, tt đã thanh toán, xem cần xem; null là bỏ hết. Kỳ đã khoá bị bỏ qua. */
  function datDau(dsHd, truong) {
    const d = doc();
    let ghi = 0, boQua = 0;
    for (const hd of dsHd) {
      if (khoaCuaHD(hd)) { boQua++; continue; }
      const k = khoaHD(hd);
      if (truong === null) delete d.tt[k];
      else d.tt[k] = { ...(d.tt[k] || {}), [truong]: 1 };
      ghi++;
    }
    if (ghi) luu(d);
    return { ghi, boQua };
  }

  /** Nhập từ tệp sao lưu: mục đang có trên máy được giữ nếu trùng */
  function nhap(ngoai) {
    const d = doc();
    let ghiChuMoi = 0, khoaMoi = 0;
    for (const [k, v] of Object.entries(ngoai.ghiChu || {})) if (!(k in d.ghiChu) && typeof v === 'string') { d.ghiChu[k] = v; ghiChuMoi++; }
    for (const [k, v] of Object.entries(ngoai.tt || {})) if (!(k in d.tt) && v && typeof v === 'object') d.tt[k] = { ht: v.ht ? 1 : undefined, tt: v.tt ? 1 : undefined, xem: v.xem ? 1 : undefined };
    for (const [m, ds] of Object.entries(ngoai.khoa || {})) {
      if (!Array.isArray(ds)) continue;
      d.khoa[m] = d.khoa[m] || [];
      for (const l of ds) if (l && /^\d{4}-(Q[1-4]|M\d{2})$/.test(l.ky) && !d.khoa[m].some(x => x.ky === l.ky)) { d.khoa[m].push(l); khoaMoi++; }
    }
    luu(d);
    return { ghiChu: ghiChuMoi, khoa: khoaMoi };
  }

  /** Ô ghi chú ở đầu trang xem hoá đơn */
  const oGhiChuHD = hd => {
    const l = khoaCuaHD(hd);
    return `<div class="st-o-hd"><label>Ghi chú<input type="text" data-gc-hd maxlength="500" placeholder="Ghi chú riêng cho hoá đơn này…" value="${esc(ghiChu(hd))}"${l ? ' disabled' : ''}></label>${l ? `<span class="ktt-nho">Đã khoá sổ ${esc(tenKy(l.ky))}</span>` : ''}</div>`;
  };

  // ---------- Bảng hoá đơn của kỳ (hộp dlgSoHd) ----------
  const bang = { dong: [], neo: -1, sauKhiDong: null };
  const dlg = () => document.getElementById('dlgSoHd');
  const baoSt = t => { document.getElementById('stBao').textContent = t; };
  const cacDong = () => [...dlg().querySelectorAll('tbody tr')].filter(tr => !tr.hidden);
  const hdCua = tr => bang.dong[Number(tr.dataset.r)];
  const oCua = tr => tr.querySelector('.st-gc');
  const daChon = () => cacDong().filter(tr => tr.querySelector('.st-chon').checked);
  const baoGhi = kq => baoSt(`Đã ghi ${kq.ghi} dòng${kq.boQua ? `, bỏ qua ${kq.boQua} dòng thuộc kỳ đã khoá sổ` : ''}.`);

  /** Ghi cùng lúc lên màn hình và vào sổ, dòng bị khoá giữ nguyên */
  function dienDong(cap) {
    const kq = ghiLoat(cap.map(([tr, nd]) => [hdCua(tr), nd]));
    for (const [tr, nd] of cap) if (!oCua(tr).disabled) oCua(tr).value = String(nd ?? '').trim();
    return kq;
  }

  /**
   * opt: { docs, pham, mst, k, moDoc(i), doiThay() }: docs là danh sách đầy đủ để mở hoá đơn,
   * pham là phạm vi đang xem trên Dashboard, doiThay() gọi khi đóng hộp để vẽ lại danh sách.
   */
  function moBang(opt) {
    const DC = window.DOI_CHIEU, r = khoangKy(opt.k);
    const { mua, ban, biThayThe, laBan } = DC.chonHoaDon(opt.pham, opt.mst, r.tu, r.den);
    const ds = [...ban, ...mua, ...biThayThe].sort((a, b) => (a.ngay || '').localeCompare(b.ngay || '') || String(a.so).localeCompare(String(b.so), 'vi', { numeric: true }));
    bang.dong = ds; bang.neo = -1; bang.sauKhiDong = opt.doiThay || null;
    const bi = new Set(biThayThe);
    document.getElementById('stTieuDe').textContent = `Hoá đơn ${tenKy(opt.k)} · MST ${opt.mst}`;
    document.getElementById('stTim').value = ''; document.getElementById('stNoiDung').value = ''; document.getElementById('stChonTat').checked = false;
    baoSt(`${ds.length} hoá đơn. Ghi chú tự lưu ngay khi gõ.`);
    dlg().querySelector('tbody').innerHTML = ds.map((d, i) => {
      const dt = laBan(d) ? d.mua : d.ban, t = DC.tachHoaDon(d), l = khoaCuaHD(d), cTen = dt?.Ten || '';
      return `<tr data-r="${i}" data-tim="${esc((d.kyHieu + ' ' + d.so + ' ' + cTen + ' ' + (dt?.MST || '')).toLowerCase())}"${bi.has(d) ? ' class="st-bo"' : ''}>
        <td><input type="checkbox" class="st-chon" aria-label="Chọn dòng"></td><td>${laBan(d) ? 'Bán ra' : 'Mua vào'}</td><td>${esc(ngayVN(d.ngay))}</td>
        <td><a href="#" data-mo-i="${opt.docs.indexOf(d)}">${esc(d.kyHieu)}-${esc(d.so)}</a>${bi.has(d) ? ' <span class="ktt-nho">bị thay thế</span>' : ''}</td>
        <td class="st-ten" title="${esc(cTen)}">${esc(cTen)}</td><td class="st-so">${so(t.V)}</td><td class="st-so">${so(t.T)}</td>
        <td><input type="text" class="st-gc" maxlength="500" value="${esc(ghiChu(d))}"${l ? ' disabled title="Thuộc kỳ đã khoá sổ"' : ''}></td></tr>`;
    }).join('');
    bang.moDoc = opt.moDoc;
    dlg().showModal();
  }

  function ganBang() {
    const h = dlg();
    if (!h) return;
    h.addEventListener('click', e => {
      const a = e.target.closest('[data-mo-i]');
      if (a) { e.preventDefault(); const i = Number(a.dataset.moI); h.close(); if (bang.moDoc) bang.moDoc(i); return; }
      const c = e.target.closest('.st-chon');
      if (c) {
        const ds = cacDong(), i = ds.indexOf(c.closest('tr'));
        if (e.shiftKey && bang.neo >= 0) for (let j = Math.min(i, bang.neo); j <= Math.max(i, bang.neo); j++) ds[j].querySelector('.st-chon').checked = c.checked;
        bang.neo = i;
      }
    });
    document.getElementById('stChonTat').onchange = e => { cacDong().forEach(tr => { tr.querySelector('.st-chon').checked = e.target.checked; }); };
    document.getElementById('stTim').oninput = e => {
      const q = e.target.value.trim().toLowerCase();
      h.querySelectorAll('tbody tr').forEach(tr => { tr.hidden = !!q && !tr.dataset.tim.includes(q); });
      bang.neo = -1;
    };
    document.getElementById('stApDung').onclick = () => {
      const ds = daChon();
      if (!ds.length) return baoSt('Hãy tích chọn ít nhất một dòng.');
      const nd = document.getElementById('stNoiDung').value;
      baoGhi(dienDong(ds.map(tr => [tr, nd])));
    };
    document.getElementById('stDong').onclick = () => h.close();
    h.addEventListener('close', () => { if (bang.sauKhiDong) bang.sauKhiDong(); });
    h.addEventListener('input', e => {
      if (e.target.matches('.st-gc')) ghiLoat([[hdCua(e.target.closest('tr')), e.target.value]]);
    });
    h.addEventListener('keydown', e => {
      if (!e.target.matches('.st-gc')) return;
      const tr = e.target.closest('tr'), ds = cacDong(), i = ds.indexOf(tr);
      if (e.ctrlKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault(); // Ctrl+D của trình duyệt là đánh dấu trang
        const chon = daChon();
        if (chon.length > 1) {
          const nd = oCua(chon[0]).value;
          baoGhi(dienDong(chon.slice(1).map(x => [x, nd])));
        } else if (i > 0) baoGhi(dienDong([[tr, oCua(ds[i - 1]).value]]));
        return;
      }
      const buoc = e.key === 'ArrowDown' || e.key === 'Enter' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
      if (buoc && ds[i + buoc]) { e.preventDefault(); oCua(ds[i + buoc]).focus(); }
    });
    h.addEventListener('paste', e => {
      if (!e.target.matches('.st-gc')) return;
      const dong = (e.clipboardData.getData('text/plain') || '').replace(/\r/g, '').replace(/\n+$/, '').split('\n').map(x => x.replace(/\t/g, ' '));
      const tr = e.target.closest('tr'), ds = cacDong(), chon = daChon();
      if (dong.length > 1) {
        // Dán cột từ Excel: chạy dọc từ ô đang đứng, dòng khoá sổ bị bỏ qua và không ăn mất nội dung
        e.preventDefault();
        const cap = [];
        let boQua = 0;
        for (let i = ds.indexOf(tr), j = 0; i < ds.length && j < dong.length; i++) {
          if (oCua(ds[i]).disabled) { boQua++; continue; }
          cap.push([ds[i], dong[j++]]);
        }
        const kq = dienDong(cap);
        baoGhi({ ghi: kq.ghi, boQua: kq.boQua + boQua });
      } else if (chon.length > 1 && chon.includes(tr)) {
        e.preventDefault();
        baoGhi(dienDong(chon.map(x => [x, dong[0]])));
      }
    });
  }

  document.addEventListener('DOMContentLoaded', ganBang);
  if (document.readyState !== 'loading') ganBang();

  window.SO_TAY = { doc, khoaHD, khoangKy, tenKy, khoaKy, moKhoa, khoaGiao, khoaCuaHD, trangThaiKy, ghiChu, ghiLoat, datDau, nhap, oGhiChuHD, moBang };
})();
