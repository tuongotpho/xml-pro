// kho-hoa-don.js — Kho hoá đơn: bảng chỉ mục lưu trong IndexedDB của app, chỉ trên máy này.
// Tệp XML trong thư mục vẫn là bản gốc, kho chỉ giữ số, ngày, đối tác, tiền, đường dẫn. Mất kho thì nạp lại thư mục là có lại.
// Ghi chú, trạng thái, khoá sổ nằm ở so-tay.js và nhận hoá đơn theo MST bán + mẫu + ký hiệu + số.
(() => {
  'use strict';

  const DB = 'XmlProKho', BANG = 'hd', CO_TRANG = 100;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const so = v => Math.round(v || 0).toLocaleString('vi-VN');
  const ngayVN = s => (s || '').split('-').reverse().join('/');
  const TT_CONG = { 1: 'Mới', 2: 'Thay thế', 3: 'Điều chỉnh', 4: 'Đã bị thay thế', 5: 'Đã bị điều chỉnh', 6: 'Đã bị huỷ' };
  const sach = s => window.DOI_CHIEU.sachMst(s);

  let _db = null;
  function moDb() {
    if (_db) return Promise.resolve(_db);
    return new Promise((ok, loi) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = e => { e.target.result.createObjectStore(BANG, { keyPath: 'k' }); };
      r.onsuccess = () => { _db = r.result; ok(_db); };
      r.onerror = () => loi(r.error);
    });
  }
  async function docTatCa() {
    const db = await moDb();
    return new Promise((ok, loi) => { const r = db.transaction(BANG).objectStore(BANG).getAll(); r.onsuccess = () => ok(r.result || []); r.onerror = () => loi(r.error); });
  }
  async function ghiLoat(ds) {
    if (!ds.length) return;
    const db = await moDb();
    await new Promise((ok, loi) => {
      const tx = db.transaction(BANG, 'readwrite'), st = tx.objectStore(BANG);
      for (const r of ds) st.put(r);
      tx.oncomplete = ok; tx.onerror = () => loi(tx.error);
    });
  }
  async function xoaLoat(ks) {
    const db = await moDb();
    await new Promise((ok, loi) => {
      const tx = db.transaction(BANG, 'readwrite'), st = tx.objectStore(BANG);
      for (const k of ks) st.delete(k);
      tx.oncomplete = ok; tx.onerror = () => loi(tx.error);
    });
  }
  async function xoaHet() {
    const db = await moDb();
    await new Promise((ok, loi) => { const tx = db.transaction(BANG, 'readwrite'); tx.objectStore(BANG).clear(); tx.oncomplete = ok; tx.onerror = () => loi(tx.error); });
  }

  /** Đổi bản ghi kho thành dạng so-tay.js hiểu được */
  const giaHD = r => ({ ban: { MST: r.mstBan }, mua: { MST: r.mstMua }, mau: r.mau, kyHieu: r.kh, so: r.so, ngay: r.ngay });
  const khoaBG = (chu, mstBan, mau, kh, so_) => [chu, mstBan, mau, kh, so_].map(x => String(x ?? '').trim()).join('|');

  /** Hoá đơn đã nạp → bản ghi kho. Công ty chủ: bên đang được xem là "mình" theo nhãn Mua vào / Bán ra */
  function tuHoaDon(d) {
    const DC = window.DOI_CHIEU, t = DC.tachHoaDon(d);
    const mstBan = sach(d.ban?.MST), mstMua = sach(d.mua?.MST), chieu = d.phanLoai === 'ban' ? 'ban' : 'mua', chu = chieu === 'ban' ? mstBan : mstMua;
    return {
      k: khoaBG(chu, mstBan, d.mau, d.kyHieu, d.so), chu, chieu, mstBan, tenBan: d.ban?.Ten || '', mstMua, tenMua: d.mua?.Ten || '',
      mau: (d.mau || '').trim(), kh: (d.kyHieu || '').trim(), so: (d.so || '').trim(), ngay: d.ngay || '', V: Math.round(t.V), T: Math.round(t.T), tong: Math.round(d.tong || 0),
      lq: d.lienQuan ? { tc: d.lienQuan.tc, kh: d.lienQuan.kh, so: d.lienQuan.so } : null, duongDan: d.duongDan || '', tep: d.fileName || ''
    };
  }

  /** Thêm các hoá đơn đã nạp vào kho. Giữ lại kết quả đối soát cổng thuế, đường dẫn thật thắng đường dẫn rỗng */
  async function themDocs(docs) {
    const moi = docs.filter(d => d.kind === 'hd' && !d.error && d.mau !== undefined).map(tuHoaDon).filter(r => r.chu && r.kh && r.so);
    if (!moi.length) return 0;
    const cu = new Map((await docTatCa()).map(r => [r.k, r]));
    for (const r of moi) {
      const c = cu.get(r.k);
      if (c) { r.cqt = c.cqt; r.lechCong = c.lechCong; r.khongTrenCong = c.khongTrenCong; if (!r.duongDan) r.duongDan = c.duongDan; }
    }
    await ghiLoat(moi);
    ve.ds = null;
    return moi.length;
  }

  /** Đối soát danh sách cổng thuế với kho. dong: [chieu, nbmst, nbten, nmmst, nmten, mau, kh, so, ngay, V, T, tong, tthai] */
  async function doiSoat({ dong, tu, den, coMtt, du }) {
    const ds = await docTatCa(), theoK = new Map(ds.map(r => [r.k, r]));
    const doi = [], thay = new Set(), kq = { soCong: dong.length, chuaCoXml: 0, biHuy: 0, lechTien: 0, khongTrenCong: 0, trongKyKhoa: 0 };
    const chuDs = new Set();
    for (const x of dong) {
      const [chieu, nbmst, nbten, nmmst, nmten, mau, kh, so_, ngay, V, T, tong, tthai] = x;
      const mstBan = sach(nbmst), mstMua = sach(nmmst), chu = chieu === 'ban' ? mstBan : mstMua, k = khoaBG(chu, mstBan, mau, kh, so_);
      chuDs.add(chu); thay.add(k);
      let r = theoK.get(k);
      if (!r) {
        r = { k, chu, chieu, mstBan, tenBan: nbten || '', mstMua, tenMua: nmten || '', mau: String(mau), kh: String(kh), so: String(so_), ngay, V: Math.round(V || 0), T: Math.round(T || 0), tong: Math.round(tong || 0), lq: null, duongDan: '', tep: '', chuaCoXml: true };
        kq.chuaCoXml++;
      } else if (r.chuaCoXml) kq.chuaCoXml++;
      const lech = !r.chuaCoXml && Math.abs((tong || 0) - (r.tong || 0)) > 1;
      r.cqt = Number(tthai) || 0; r.lechCong = lech ? Math.round(tong || 0) : undefined; r.khongTrenCong = false;
      if ([4, 5, 6].includes(r.cqt)) {
        kq.biHuy++;
        if (window.SO_TAY && window.SO_TAY.khoaCuaHD(giaHD(r))) kq.trongKyKhoa++;
      }
      if (lech) kq.lechTien++;
      doi.push(r);
    }
    // Có trong kho mà cổng không có. Chỉ kết luận khi danh sách cổng lấy đủ; hoá đơn máy tính tiền chỉ so khi đã tìm cửa đó
    if (du) for (const r of ds) {
      if (r.chuaCoXml || !chuDs.has(r.chu) || r.ngay < tu || r.ngay > den || thay.has(r.k)) continue;
      if (!coMtt && r.kh.charAt(3).toUpperCase() === 'M') continue;
      r.khongTrenCong = true; kq.khongTrenCong++; doi.push(r);
    }
    await ghiLoat(doi);
    ve.ds = null;
    return kq;
  }

  // ---------- Màn Kho hoá đơn ----------
  const loc = { chu: '', tu: '', den: '', chieu: '', tt: '', q: '', trang: 0 };
  const chon = new Set();
  const ve = { ds: null, khung: null, opt: null, loc: [] };

  const danhDau = (r, st) => st.tt?.[window.SO_TAY.khoaHD(giaHD(r))] || {};
  const coVanDe = r => r.chuaCoXml || [4, 5, 6].includes(r.cqt) || r.lechCong != null || r.khongTrenCong;

  function tinhBiThay(ds) {
    const bi = new Set();
    for (const r of ds) if (r.lq && r.lq.tc === '1') bi.add(`${r.mstBan}|${String(r.lq.kh || '').trim()}|${String(r.lq.so || '').trim()}`);
    for (const r of ds) r.biThay = bi.has(`${r.mstBan}|${r.kh}|${r.so}`);
  }
  function congTy(ds) {
    const m = new Map();
    for (const r of ds) { const g = m.get(r.chu) || { mst: r.chu, ten: '', n: 0 }; g.n++; g.ten = g.ten || (r.chieu === 'ban' ? r.tenBan : r.tenMua); m.set(r.chu, g); }
    return [...m.values()].sort((a, b) => b.n - a.n);
  }
  function khoaCua(chu, st) { return (st.khoa[chu] || []).map(l => window.SO_TAY.khoangKy(l.ky)); }

  function locDs(ds) {
    const st = window.SO_TAY.doc(), q = loc.q.trim().toLowerCase(), khoa = khoaCua(loc.chu, st);
    const tu = loc.tu ? loc.tu + '-01' : '', den = loc.den ? loc.den + '-31' : '';
    return ds.filter(r => {
      if (r.chu !== loc.chu || (loc.chieu && r.chieu !== loc.chieu) || (tu && r.ngay < tu) || (den && r.ngay > den)) return false;
      if (loc.tt) {
        const d = danhDau(r, st), gc = st.ghiChu[window.SO_TAY.khoaHD(giaHD(r))];
        if (loc.tt === 'chuaHT' && d.ht) return false;
        if (loc.tt === 'chuaTT' && d.tt) return false;
        if (loc.tt === 'xem' && !d.xem) return false;
        if (loc.tt === 'ghi' && !gc) return false;
        if (loc.tt === 'khoa' && !khoa.some(x => x.tu <= r.ngay && x.den >= r.ngay)) return false;
        if (loc.tt === 'cong' && !coVanDe(r)) return false;
      }
      if (q) {
        const gc = st.ghiChu[window.SO_TAY.khoaHD(giaHD(r))] || '';
        if (![r.kh, r.so, r.tenBan, r.tenMua, r.mstBan, r.mstMua, gc].join(' ').toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => (a.ngay < b.ngay ? 1 : a.ngay > b.ngay ? -1 : Number(b.so) - Number(a.so)));
  }

  function nhanDong(r, d, st, khoa) {
    const nh = [];
    if (r.chuaCoXml) nh.push('<span class="kho-nhan kho-do">Có trên cổng, chưa có XML</span>');
    if ([4, 5, 6].includes(r.cqt)) nh.push(`<span class="kho-nhan kho-do">Cổng: ${esc(TT_CONG[r.cqt])}</span>`);
    if (r.lechCong != null) nh.push(`<span class="kho-nhan kho-do" title="Cổng ghi tổng ${so(r.lechCong)}">Lệch tiền với cổng</span>`);
    if (r.khongTrenCong) nh.push('<span class="kho-nhan kho-do">Không thấy trên cổng</span>');
    if (r.biThay) nh.push('<span class="kho-nhan">Bị thay thế</span>');
    if (khoa) nh.push('<span class="kho-nhan">Khoá sổ</span>');
    if (d.ht) nh.push('<span class="kho-nhan kho-xanh">Đã hạch toán</span>');
    if (d.tt) nh.push('<span class="kho-nhan kho-xanh">Đã thanh toán</span>');
    if (d.xem) nh.push('<span class="kho-nhan kho-vang">Cần xem</span>');
    return nh.join('');
  }

  function dongBang(r, st, khoa) {
    const k = window.SO_TAY.khoaHD(giaHD(r)), d = st.tt?.[k] || {}, ban = r.chieu === 'ban';
    const khoaDong = khoa.some(x => x.tu <= r.ngay && x.den >= r.ngay);
    return `<tr data-k="${esc(r.k)}"><td><input type="checkbox" class="kho-chon"${chon.has(r.k) ? ' checked' : ''} aria-label="Chọn dòng"></td>
      <td>${esc(ngayVN(r.ngay))}</td><td>${ban ? 'Bán ra' : 'Mua vào'}</td>
      <td>${r.duongDan ? `<a href="#" class="kho-mo">${esc(r.kh)}-${esc(r.so)}</a>` : `${esc(r.kh)}-${esc(r.so)}`}</td>
      <td class="kho-ten" title="${esc(ban ? r.tenMua : r.tenBan)}">${esc(ban ? r.tenMua : r.tenBan)}<div class="ktt-nho">${esc(ban ? r.mstMua : r.mstBan)}</div></td>
      <td class="st-so">${so(r.V)}</td><td class="st-so">${so(r.T)}</td><td class="st-so">${so(r.tong)}</td>
      <td class="kho-tt">${nhanDong(r, d, st, khoaDong)}</td>
      <td><input type="text" class="st-gc kho-gc" maxlength="500" value="${esc(st.ghiChu[k] || '')}"${khoaDong ? ' disabled title="Thuộc kỳ đã khoá sổ"' : ''}></td></tr>`;
  }

  function veBang() {
    const st = window.SO_TAY.doc(), kq = ve.loc = locDs(ve.ds), khoa = khoaCua(loc.chu, st);
    const soTrang = Math.max(1, Math.ceil(kq.length / CO_TRANG));
    loc.trang = Math.min(loc.trang, soTrang - 1);
    const hien = kq.slice(loc.trang * CO_TRANG, (loc.trang + 1) * CO_TRANG);
    const co = kq.filter(r => !r.biThay && !r.chuaCoXml);
    const cong = (ch, f) => co.filter(r => r.chieu === ch).reduce((s, r) => s + r[f], 0);
    const vanDe = kq.filter(coVanDe).length;
    ve.khung.querySelector('#khoTong').innerHTML = `<div><span>Số hoá đơn</span><b>${kq.length.toLocaleString('vi-VN')}</b></div>
      <div><span>Bán ra trước thuế</span><b>${so(cong('ban', 'V'))}</b></div><div><span>Thuế đầu ra</span><b>${so(cong('ban', 'T'))}</b></div>
      <div><span>Mua vào trước thuế</span><b>${so(cong('mua', 'V'))}</b></div><div><span>Thuế đầu vào</span><b>${so(cong('mua', 'T'))}</b></div>
      ${vanDe ? `<div class="kho-canh"><span>Lệch với cổng thuế</span><b>${vanDe}</b></div>` : ''}`;
    ve.khung.querySelector('tbody').innerHTML = hien.map(r => dongBang(r, st, khoa)).join('') || '<tr><td colspan="10" class="kho-rong">Không có hoá đơn nào khớp bộ lọc.</td></tr>';
    ve.khung.querySelector('#khoTrang').innerHTML = kq.length > CO_TRANG ? `<button type="button" data-trang="-1"${loc.trang ? '' : ' disabled'}>Trước</button><span>Trang ${loc.trang + 1}/${soTrang}</span><button type="button" data-trang="1"${loc.trang + 1 < soTrang ? '' : ' disabled'}>Sau</button>` : '';
    baoChon();
  }
  function baoChon(them) {
    ve.khung.querySelector('#khoBao').textContent = them || (chon.size ? `Đã chọn ${chon.size.toLocaleString('vi-VN')} hoá đơn` : '');
  }

  async function moKho(khung, opt) {
    ve.khung = khung; ve.opt = opt;
    if (!ve.ds) { ve.ds = await docTatCa(); tinhBiThay(ve.ds); }
    const dsCt = congTy(ve.ds);
    if (!dsCt.some(c => c.mst === loc.chu)) { const m = sach(opt.myMst); loc.chu = dsCt.some(c => c.mst === m) ? m : (dsCt[0]?.mst || ''); }
    if (!dsCt.length) {
      khung.innerHTML = `<div class="kho"><h1>Kho hoá đơn</h1><p class="kho-rong">Kho chưa có hoá đơn. Tải từ cổng thuế hoặc mở thư mục hoá đơn, hoá đơn tự vào kho và còn nguyên lần sau mở app.</p></div>`;
      return;
    }
    khung.innerHTML = `<div class="kho">
      <div class="kho-dau"><h1>Kho hoá đơn</h1><div class="kho-nut"><button type="button" id="khoExcel">Xuất Excel</button><button type="button" id="khoSaoLuu">Sao lưu</button><button type="button" id="khoPhucHoi">Phục hồi</button><input type="file" id="khoTep" accept=".json" hidden></div></div>
      <div class="kho-loc">
        <select id="khoCty" aria-label="Công ty">${dsCt.map(c => `<option value="${esc(c.mst)}"${c.mst === loc.chu ? ' selected' : ''}>${esc(c.ten || c.mst)} · ${esc(c.mst)} (${c.n})</option>`).join('')}</select>
        <label>Từ <input type="month" id="khoTu" value="${esc(loc.tu)}"></label><label>Đến <input type="month" id="khoDen" value="${esc(loc.den)}"></label>
        <select id="khoChieu" aria-label="Chiều"><option value="">Mua vào và bán ra</option><option value="mua"${loc.chieu === 'mua' ? ' selected' : ''}>Mua vào</option><option value="ban"${loc.chieu === 'ban' ? ' selected' : ''}>Bán ra</option></select>
        <select id="khoTT" aria-label="Trạng thái">${[['', 'Mọi trạng thái'], ['chuaHT', 'Chưa hạch toán'], ['chuaTT', 'Chưa thanh toán'], ['xem', 'Cần xem'], ['ghi', 'Có ghi chú'], ['khoa', 'Kỳ đã khoá sổ'], ['cong', 'Lệch với cổng thuế']].map(([v, t]) => `<option value="${v}"${loc.tt === v ? ' selected' : ''}>${t}</option>`).join('')}</select>
        <input type="search" id="khoQ" placeholder="Tìm số, tên, MST, ghi chú…" value="${esc(loc.q)}" aria-label="Tìm trong kho">
      </div>
      <div class="ktt-tong" id="khoTong"></div>
      <div class="kho-loat"><button type="button" data-dau="ht">Đã hạch toán</button><button type="button" data-dau="tt">Đã thanh toán</button><button type="button" data-dau="xem">Cần xem</button><button type="button" data-dau="bo">Bỏ đánh dấu</button><button type="button" id="khoChonHet">Chọn cả bộ lọc</button><button type="button" id="khoBoChon">Bỏ chọn</button><span id="khoBao"></span></div>
      <div class="st-khung kho-khung"><table class="st-bang"><thead><tr><th><input type="checkbox" id="khoChonTrang" aria-label="Chọn cả trang"></th><th>Ngày</th><th>Chiều</th><th>Hoá đơn</th><th>Đối tác</th><th class="st-so">Trước thuế</th><th class="st-so">Thuế</th><th class="st-so">Tổng</th><th>Trạng thái</th><th>Ghi chú</th></tr></thead><tbody></tbody></table></div>
      <div class="kho-trang" id="khoTrang"></div>
      <div class="ktt-chan">Kho chỉ là bảng chỉ mục trên máy này, tệp XML trong thư mục vẫn là bản gốc · tổng tiền bỏ hoá đơn bị thay thế và hoá đơn chưa có XML</div>
    </div>`;
    veBang();
  }

  /** Bản ghi đang chọn còn đang nằm trong bộ nhớ của màn hình */
  const dangChon = () => ve.ds.filter(r => chon.has(r.k));

  function dat(field, v) {
    if (field === 'chu') { chon.clear(); }
    loc[field] = v; loc.trang = 0; veBang();
  }

  function saoLuu() {
    const nd = JSON.stringify({ ung_dung: 'XML-Pro', loai: 'so-tay-va-kho', phien_ban: 1, luc: new Date().toISOString(), soTay: window.SO_TAY.doc(), kho: ve.ds.map(({ biThay, ...r }) => r) });
    const url = URL.createObjectURL(new Blob([nd], { type: 'application/json' }));
    const a = document.createElement('a'), n = new Date();
    a.href = url; a.download = `XML-Pro-sao-luu-${n.getFullYear()}${String(n.getMonth() + 1).padStart(2, '0')}${String(n.getDate()).padStart(2, '0')}.json`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
    baoChon(`Đã xuất ${ve.ds.length.toLocaleString('vi-VN')} hoá đơn và sổ tay. Tệp không chứa mật khẩu, nhưng có số liệu hoá đơn nên cần giữ kín.`);
  }
  async function phucHoi(tep) {
    let d;
    try { d = JSON.parse(await tep.text()); } catch (e) { return baoChon('Tệp không đọc được.'); }
    if (d.ung_dung !== 'XML-Pro' || d.loai !== 'so-tay-va-kho' || !Array.isArray(d.kho)) return baoChon('Đây không phải tệp sao lưu của XML-Pro.');
    const hop = d.kho.filter(r => r && typeof r.k === 'string' && typeof r.chu === 'string');
    await ghiLoat(hop);
    const kq = window.SO_TAY.nhap(d.soTay || {});
    ve.ds = null;
    await moKho(ve.khung, ve.opt);
    baoChon(`Đã phục hồi ${hop.length.toLocaleString('vi-VN')} hoá đơn, ${kq.ghiChu} ghi chú, ${kq.khoa} kỳ khoá sổ. Mục đang có trên máy được giữ nếu trùng.`);
  }
  function xuatExcel() {
    const st = window.SO_TAY.doc(), ds = ve.loc;
    const dong = ds.map((r, i) => {
      const k = window.SO_TAY.khoaHD(giaHD(r)), d = st.tt?.[k] || {}, ban = r.chieu === 'ban';
      return [i + 1, ngayVN(r.ngay), ban ? 'Bán ra' : 'Mua vào', r.mau, r.kh, r.so, ban ? r.mstMua : r.mstBan, ban ? r.tenMua : r.tenBan, r.V, r.T, r.tong,
        [r.chuaCoXml && 'Chưa có XML', TT_CONG[r.cqt] && `Cổng: ${TT_CONG[r.cqt]}`, r.lechCong != null && 'Lệch tiền với cổng', r.khongTrenCong && 'Không thấy trên cổng', r.biThay && 'Bị thay thế'].filter(Boolean).join(', '),
        d.ht ? 'Có' : '', d.tt ? 'Có' : '', st.ghiChu[k] || ''];
    });
    return window.xuatBangTuy(`Kho_hoa_don_${loc.chu}`, [{
      name: 'Kho hoá đơn',
      cols: [6, 12, 10, 8, 12, 12, 16, 36, 16, 14, 16, 26, 12, 12, 30].map(width => ({ width })),
      headers: ['STT', 'Ngày', 'Chiều', 'Mẫu', 'Ký hiệu', 'Số', 'MST đối tác', 'Tên đối tác', 'Trước thuế', 'Thuế', 'Tổng', 'Tình trạng', 'Đã hạch toán', 'Đã thanh toán', 'Ghi chú'],
      rows: dong
    }]);
  }

  function ganSuKien(khung) {
    khung.addEventListener('change', e => {
      const t = e.target;
      if (t.id === 'khoCty') dat('chu', t.value);
      else if (t.id === 'khoTu') dat('tu', t.value);
      else if (t.id === 'khoDen') dat('den', t.value);
      else if (t.id === 'khoChieu') dat('chieu', t.value);
      else if (t.id === 'khoTT') dat('tt', t.value);
      else if (t.id === 'khoTep' && t.files[0]) phucHoi(t.files[0]);
      else if (t.id === 'khoChonTrang') {
        khung.querySelectorAll('.kho-chon').forEach(c => { c.checked = t.checked; const k = c.closest('tr').dataset.k; if (t.checked) chon.add(k); else chon.delete(k); });
        baoChon();
      } else if (t.matches('.kho-chon')) { const k = t.closest('tr').dataset.k; if (t.checked) chon.add(k); else chon.delete(k); baoChon(); }
    });
    khung.addEventListener('input', e => {
      if (e.target.id === 'khoQ') dat('q', e.target.value);
      else if (e.target.matches('.kho-gc')) {
        const r = ve.ds.find(x => x.k === e.target.closest('tr').dataset.k);
        if (r) window.SO_TAY.ghiLoat([[giaHD(r), e.target.value]]);
      }
    });
    khung.addEventListener('click', e => {
      const t = e.target;
      if (t.matches('.kho-mo')) {
        e.preventDefault();
        const r = ve.ds.find(x => x.k === t.closest('tr').dataset.k);
        if (r) ve.opt.moTep(r.duongDan);
      } else if (t.dataset.trang) { loc.trang += Number(t.dataset.trang); veBang(); khung.querySelector('.kho-khung').scrollTop = 0; }
      else if (t.id === 'khoChonHet') { ve.loc.forEach(r => chon.add(r.k)); veBang(); }
      else if (t.id === 'khoBoChon') { chon.clear(); veBang(); }
      else if (t.id === 'khoExcel') xuatExcel();
      else if (t.id === 'khoSaoLuu') saoLuu();
      else if (t.id === 'khoPhucHoi') khung.querySelector('#khoTep').click();
      else if (t.dataset.dau) {
        const ds = dangChon();
        if (!ds.length) return baoChon('Hãy tích chọn ít nhất một hoá đơn.');
        const kq = t.dataset.dau === 'bo' ? window.SO_TAY.datDau(ds.map(giaHD), null) : window.SO_TAY.datDau(ds.map(giaHD), t.dataset.dau);
        veBang();
        baoChon(`Đã đánh dấu ${kq.ghi} hoá đơn${kq.boQua ? `, bỏ qua ${kq.boQua} hoá đơn thuộc kỳ đã khoá sổ` : ''}.`);
      }
    });
  }

  window.KHO_HD = { docTatCa, ghiLoat, xoaLoat, xoaHet, themDocs, doiSoat, moKho, ganSuKien, huyDem: () => { ve.ds = null; } };
})();
