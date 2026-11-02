// dashboard-ke-toan.js — Dashboard kế toán (bản 3): ghép phương án C "Việc cần làm" (mỗi kỳ kê khai một thẻ có trạng thái
// và nút làm ngay) với phương án A "Sổ sách" (dải số tổng, bảng theo kỳ có dòng Cộng, khách hàng / nhà cung cấp).
// Mọi con số đi qua DOI_CHIEU.chonHoaDon (bỏ HĐ trùng, bỏ HĐ gốc đã bị thay thế) và DOI_CHIEU.tachHoaDon,
// nên Dashboard, đối chiếu và lập tờ khai luôn ra cùng một số. Chạy hoàn toàn trên máy.
(() => {
  'use strict';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const so = v => Math.round(v || 0).toLocaleString('vi-VN');
  const pad = n => String(n).padStart(2, '0');
  const MA_THUE = new Set(['[24]', '[25]', '[31]', '[33]', '[35]']); // lệch các dòng này là lệch tiền thuế

  // Lựa chọn của người xem (giữ khi vẽ lại)
  const chon = { mst: '', kieu: '', namMo: {} }; // namMo: năm người dùng tự mở / gập (giữ khi vẽ lại)

  function coDuLieu(docs) {
    const DC = window.DOI_CHIEU;
    return !!DC && docs.some(d => (d.kind === 'hd' && !d.error) || DC.laToKhaiGTGT(d));
  }

  // Công ty: MST có tờ khai 01/GTGT + MST đã cài; không có thì MST xuất hiện nhiều nhất trên hoá đơn
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

  /** Vẽ Dashboard. docs: toàn bộ tài liệu; pham: tài liệu trong thư mục đang xem; opt: { myMst } */
  function ve(docs, pham, opt) {
    const DC = window.DOI_CHIEU;
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
    const bangDoiTac = (tieuDe, phu, dsDt, tong) => `<div class="ktt-khoi"><div class="ktt-khoi-dau"><b>${tieuDe}</b><span>${phu}</span></div>
      <table class="ktt-bang"><tbody>${dsDt.slice(0, 6).map(g => `<tr><td>${esc(g.ten)}<div class="ktt-nho">${esc(g.mst)} · ${g.n} HĐ</div></td><td>${so(g.v)}</td><td class="ktt-nho">${tong ? (g.v / tong * 100).toFixed(1).replace('.', ',') + '%' : ''}</td></tr>`).join('') || '<tr><td class="ktt-nho">Chưa có</td></tr>'}</tbody></table></div>`;

    // Sổ theo kỳ là nơi làm việc chính: mỗi năm một dòng cộng nổi bật (bấm để gập / mở), dưới là các kỳ, mới nhất trên cùng.
    // Mở sẵn năm mới nhất và năm có kỳ lệch / cần xem; năm cũ chỉ "chưa lập" thường là chưa nạp tờ khai năm đó — gập lại cho gọn
    const nams = [...new Set(dsKy.map(g => g.k.slice(0, 4)))].sort().reverse();
    const congDs = dsN => dsN.reduce((x, g) => ({ banV: x.banV + g.banV, banT: x.banT + g.banT, muaV: x.muaV + g.muaV, muaT: x.muaT + g.muaT,
      n: x.n + g.nBan + g.nMua, pn: x.pn + (g.dc ? g.dc.tk.ct.ct40 || 0 : 0) }), { banV: 0, banT: 0, muaV: 0, muaT: 0, n: 0, pn: 0 });
    const oSo = c => `<td>${so(c.banV)}</td><td>${so(c.banT)}</td><td>${so(c.muaV)}</td><td>${so(c.muaT)}</td><td>${so(c.banT - c.muaT)}</td>`;
    const tenHd = i => esc(docs[i].kyHieu + '-' + docs[i].so);
    // Cột Tờ khai: chưa lập → nút lập ngay; đã có → bấm trạng thái để mở tờ khai; lệch → thêm nút lập bổ sung
    const oToKhai = g => {
      if (!g.tkDoc) return khacKieu ? `<span class="ktt-huy ktt-cho">${g.nhan}</span>`
        : `<button type="button" class="ktt-huy ktt-cho ktt-bam" data-lap-tk="${esc(JSON.stringify({ mst, ky: kyLap(g.k) }))}" title="Hạn nộp ${hanNop(g.k)}">+ Lập tờ khai</button>`;
      const i = docs.indexOf(g.tkDoc);
      return `<button type="button" class="ktt-huy ktt-${g.loai} ktt-bam" data-mo-doc="${i}" title="Mở tờ khai và đối chiếu">${g.nhan}</button>`
        + (g.loai === 'loi' || g.loai === 'xem' ? `<button type="button" class="ktt-huy ktt-bam ktt-phu" data-khbs="${i}" title="Lập tờ khai bổ sung theo hoá đơn">Lập bổ sung</button>` : '');
    };
    const dongKy = g => `<tr class="ktt-dong-ky ktt-${g.loai}" data-trang-thai="${esc(g.nhan)}"><td><span class="ktt-ten-ky">${tenKy(g.k)}</span>${
        (g.loai === 'loi' || g.loai === 'xem') && g.moTa.length ? `<div class="ktt-ly-do" title="${esc(g.moTa.join(' · '))}">${esc(g.moTa[0])}${g.hdMo ? ` · <a class="ktt-lk" data-mo-doc="${g.hdMo.idx}">mở HĐ ${tenHd(g.hdMo.idx)}</a>` : ''}</div>`
        : !g.tkDoc && !khacKieu ? `<div class="ktt-nho">Hạn nộp ${hanNop(g.k)}</div>` : ''}</td>${oSo(g)}<td>${g.dc ? so(g.dc.tk.ct.ct40) : ''}</td><td>${g.nBan + g.nMua}</td><td class="ktt-o-tk">${oToKhai(g)}</td></tr>`;
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

    return `<div class="ktt-dash">
      ${ds.length > 1 ? `<div class="ktt-cty">${ds.map(c => `<button type="button" class="ktt-cty-nut${c.mst === mst ? ' on' : ''}" data-cty="${esc(c.mst)}">${esc(c.ten || c.mst)}<span>${esc(c.mst)}</span></button>`).join('')}</div>` : ''}
      <div class="ktt-dau">
        <div><h1>${esc(cty.ten || 'MST ' + mst)}</h1><div class="ktt-nho">MST ${esc(mst)} · hoá đơn từ ${pham_} · ${t.n} hoá đơn còn hiệu lực${biThayThe.length ? ` (${biThayThe.length} hoá đơn bị thay thế đã loại)` : ''}</div></div>
        <div class="ktt-dau-nut">
          <div class="ktt-chon-ky"><span data-kieu="M" class="${kieu === 'M' ? 'on' : ''}">Tháng</span><span data-kieu="Q" class="${kieu === 'Q' ? 'on' : ''}">Quý</span></div>
          <button type="button" class="ktt-nut btn-xuat-excel">Xuất Excel</button>
          <button type="button" class="ktt-nut ktt-chinh" data-lap-tk="${esc(JSON.stringify({ mst }))}">Lập tờ khai</button>
        </div>
      </div>
      <div class="ktt-tom">
        ${dem('loi') ? `<span class="ktt-loi">${dem('loi')} kỳ lệch thuế</span>` : ''}${dem('xem') ? `<span class="ktt-xem">${dem('xem')} kỳ cần xem lại</span>` : ''}${dem('xong') ? `<span class="ktt-xong">${dem('xong')} kỳ đã xong</span>` : ''}${dem('cho') && !khacKieu ? `<span class="ktt-cho">${dem('cho')} kỳ chưa lập</span>` : ''}
      </div>
      <div class="ktt-tong">
        <div><span>Bán ra</span><b>${so(t.banV)}</b></div><div><span>Thuế đầu ra</span><b>${so(t.banT)}</b></div>
        <div><span>Mua vào</span><b>${so(t.muaV)}</b></div><div><span>Thuế đầu vào</span><b>${so(t.muaT)}</b></div>
        <div><span>Chênh lệch thuế</span><b class="${t.banT - t.muaT > 0 ? 'ktt-am' : ''}">${t.banT - t.muaT > 0 ? '+' : ''}${so(t.banT - t.muaT)}</b></div>
      </div>
      <div class="ktt-khoi"><div class="ktt-khoi-dau"><b>Theo kỳ kê khai</b><span>Đơn vị: đồng · bấm trạng thái để mở tờ khai${nams.length > 1 ? ' · bấm dòng năm để gập / mở' : ''}</span></div>
        <table class="ktt-bang ktt-so-sach"><thead><tr><th>Kỳ</th><th>Bán ra</th><th>Thuế ra</th><th>Mua vào</th><th>Thuế vào</th><th>Chênh lệch</th><th title="Thuế GTGT còn phải nộp trên tờ khai">Phải nộp [40]</th><th>Số HĐ</th><th>Tờ khai</th></tr></thead><tbody>
          ${nams.map(dongNam).join('')}
          ${(c => `<tr class="ktt-cong"><td>Cộng${nams.length > 1 ? ` ${nams.length} năm` : ''}</td>${oSo(c)}<td>${c.pn ? so(c.pn) : ''}</td><td>${c.n}</td><td></td></tr>`)(congDs(dsKy))}
        </tbody></table></div>
      <div class="ktt-hai">${bangDoiTac('Khách hàng', 'Giá trị bán ra', kh, t.banV)}${bangDoiTac('Nhà cung cấp', 'Giá trị mua vào', ncc, t.muaV)}</div>
      <div class="ktt-chan">Số liệu chưa trừ thuế kỳ trước chuyển sang · hoá đơn trùng và hoá đơn bị thay thế đã loại · (C) August87 - 0982722036</div>
    </div>`;
  }

  /** Gắn sự kiện một lần lên khung chính. veLai(): vẽ lại Dashboard; moLapTk(preset): mở hộp lập tờ khai;
   *  chonCty(mst): báo app công ty vừa chọn, để danh sách bên trái gắn nhãn Mua vào / Bán ra theo công ty đó */
  function ganSuKien(khung, veLai, moLapTk, chonCty) {
    khung.addEventListener('click', e => {
      const cty = e.target.closest('[data-cty]');
      if (cty) { chon.mst = cty.dataset.cty; chon.kieu = ''; chon.namMo = {}; if (chonCty) chonCty(chon.mst); veLai(); return; }
      const k = e.target.closest('.ktt-chon-ky [data-kieu]');
      if (k) { chon.kieu = k.dataset.kieu; chon.namMo = {}; veLai(); return; }
      const n = e.target.closest('[data-nam-tg]');
      if (n && !e.target.closest('button, a')) { chon.namMo[n.dataset.namTg] = n.dataset.mo !== '1'; veLai(); return; }
      const l = e.target.closest('[data-lap-tk]');
      if (l) { let p = {}; try { p = JSON.parse(l.dataset.lapTk); } catch (err) { } moLapTk(p); }
    });
  }

  window.DASHBOARD_KE_TOAN = { coDuLieu, ve, ganSuKien, dsCongTy };
})();
