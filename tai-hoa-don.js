/*
 * XML-Pro: phần tải hoá đơn chạy ngay trong trang cổng thuế, do vỏ app gắn vào. Không có giao diện: thẻ chọn tháng nằm ở XML-Pro.
 * Người dùng tự đăng nhập, tự gõ captcha trên trang của cổng. Không đọc ô mật khẩu. Mã phiên chỉ đọc từ bộ nhớ trang lúc gọi cổng, không lưu.
 * Tệp không đi đâu ngoài máy: gửi sang vỏ app để ghi vào thư mục người dùng chọn. Lõi ở tai-hoa-don-loi.js.
 * (C) August87 - 0982722036
 */
(function () {
  'use strict';
  const X = window.__taiXml, VO = window.chrome && window.chrome.webview;
  if (!X || !VO || window.__taiHdXmlPro) return;
  const { CONG } = X;

  class DungHan extends Error {}

  // ---------- Nói chuyện với vỏ app ----------
  const cho = new Map();
  let soLenh = 0;
  VO.addEventListener('message', e => {
    const m = e.data || {}, f = cho.get(m.id);
    if (f) { cho.delete(m.id); f(m); }
  });
  const hoi = (lenh, them) => new Promise(ok => { const id = ++soLenh; cho.set(id, ok); VO.postMessage({ lenh, id, ...them }); });

  function sangBase64(u8) {
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  }
  async function luuTep(duong, u8) {
    const r = await hoi('luuTep', { duong, b64: sangBase64(u8) });
    if (!r.ok) throw new DungHan(`Không ghi được tệp ${duong}: ${r.loi || 'lỗi không rõ'}`);
  }

  // ---------- Gọi cổng thuế (giữ nguyên nhịp của extension) ----------
  async function goi(url, { thaoTac, kieu, nhip, signal, ghi }) {
    let lanMayChu = 0, lan429 = 0;
    for (;;) {
      const jwt = CONG.layMaDangNhap();
      if (!jwt) throw new DungHan('Chưa đăng nhập cổng thuế (hoặc đã hết phiên). Hãy đăng nhập rồi bấm tải lại.');
      await nhip.cho(signal);
      let res, loi = null;
      const hetGio = new AbortController();
      const hen = setTimeout(() => hetGio.abort(), 90000);
      const huy = () => hetGio.abort();
      signal.addEventListener('abort', huy, { once: true });
      try {
        res = await fetch(url, {
          headers: {
            Accept: 'application/json, text/plain, */*', 'Accept-Language': 'vi', Authorization: 'Bearer ' + jwt,
            'request-id': crypto.randomUUID(), Action: encodeURIComponent(thaoTac), 'End-Point': CONG.endPoint
          },
          credentials: 'include', signal: hetGio.signal
        });
      } catch (e) {
        if (signal.aborted) throw e;
        loi = e;
      } finally {
        clearTimeout(hen);
        signal.removeEventListener('abort', huy);
      }
      if (res && res.ok) {
        nhip.thanhCong();
        return { ok: true, status: res.status, body: kieu === 'json' ? await res.json() : await res.arrayBuffer() };
      }
      const status = res ? res.status : 0;
      const text = res ? await res.text().catch(() => '') : String(loi?.message || '');
      if (X.laLoiCaptcha(status, text)) return { ok: false, status, text, loai: 'captcha' }; // không nghỉ 60 giây như lỗi máy chủ
      const loai = X.loaiLoi(status, text);
      const nguyenVan = ` [mã ${status}: ${text.replace(/\s+/g, ' ').slice(0, 200) || 'không có nội dung'}]`;
      if (loai === 'het-phien') throw new DungHan('Cổng thuế không nhận mã đăng nhập (hết phiên). Hãy đăng nhập lại rồi bấm tải.' + nguyenVan);
      if (loai === 'bi-chan') throw new DungHan('Cổng thuế báo phát hiện hành vi lạ và chặn tạm. Dừng lại, chờ 15–30 phút rồi tải tiếp.' + nguyenVan);
      if (loai === 'qua-day') {
        if (++lan429 > 8) throw new DungHan('Cổng thuế liên tục báo gọi dày quá. Dừng lại, lát nữa tải tiếp.');
        const nghi = nhip.biQuaDay();
        ghi(`Cổng thuế báo gọi dày, nghỉ ${Math.round(nghi / 1000)} giây…`);
        await X.ngu(nghi, signal);
        continue;
      }
      if (loai === 'may-chu') {
        if (++lanMayChu > 3) return { ok: false, status, text, loai };
        ghi(`Cổng thuế chưa trả lời (mã ${status || 'mất kết nối'}), nghỉ 60 giây rồi thử lại (lần ${lanMayChu}/3)…`);
        await X.ngu(60000, signal);
        continue;
      }
      return { ok: false, status, text, loai };
    }
  }

  // ---------- Quy trình ----------
  const tenChieu = c => c === 'mua' ? 'mua vào' : 'bán ra';
  const mstCuaMinh = inv => String((inv.__chieu === 'mua' ? inv.nmmst : inv.nbmst) || 'chua-ro-mst').replace(/[^0-9A-Za-z-]/g, '');

  /** Một lượt tìm của một tháng. Trả về { daNhan, tong, hopLe } */
  async function timLuot(c, t, l, hoaDon, { signal, ghi, tienDo, nhipDs }) {
    let conTro = '', daNhan = 0, trang = 0, tong = null;
    for (;;) {
      const url = `${CONG.api}/query/invoices/${CONG.duong[c]}?sort=tdlap:desc&size=${CONG.kichTrang}&search=${X.chuoiTim(t, l.loc)}${conTro ? '&state=' + encodeURIComponent(conTro) : ''}`;
      const r = await goi(url, { thaoTac: CONG.thaoTac[c], kieu: 'json', nhip: nhipDs, signal, ghi });
      if (!r.ok) return { daNhan, tong, hopLe: false, loi: `mã ${r.status}: ${String(r.text).slice(0, 120)}` };
      const ds = Array.isArray(r.body?.datas) ? r.body.datas : [];
      if (typeof r.body?.total === 'number') tong = r.body.total;
      daNhan += ds.length;
      trang++;
      for (const inv of ds) {
        const k = X.khoa(c, inv);
        if (!hoaDon.has(k)) hoaDon.set(k, { ...inv, __chieu: c, __luot: l.nhan });
      }
      tienDo(`Tìm ${tenChieu(c)} ${t.nhan} (${l.nhan}), trang ${trang}: ${daNhan}${tong != null ? '/' + tong : ''}`);
      if (!X.conTrangSau(r.body, daNhan, conTro) || trang > 200) break;
      conTro = r.body.state;
    }
    return { daNhan, tong, hopLe: tong == null || daNhan >= tong };
  }

  // ---------- Hoá đơn máy tính tiền: người dùng tự gõ captcha trong thẻ của XML-Pro ----------
  let choMa = null;
  /** Hiện ảnh, chờ người dùng gõ. Trả về chuỗi đã gõ, hoặc null nếu người dùng bỏ qua */
  function hoiMa(noiDung, moTa, signal) {
    return new Promise((ok, loi) => {
      const huy = () => { choMa = null; bao({ captcha: '' }); loi(new DOMException('Đã dừng', 'AbortError')); };
      signal.addEventListener('abort', huy, { once: true });
      choMa = v => { signal.removeEventListener('abort', huy); choMa = null; bao({ captcha: '' }); ok(v); };
      bao({ captcha: noiDung, moTa });
    });
  }

  /** Một lượt tìm ở cửa máy tính tiền. Mỗi trang một captcha; gõ sai cho gõ lại, quá 3 lần thì báo thiếu */
  async function timLuotSco(c, doan, l, hoaDon, dk) {
    const S = CONG.sco, ten = `máy tính tiền ${tenChieu(c)} ${doan.nhan}${l.loc ? ` (${l.nhan})` : ''}`;
    let conTro = '', daNhan = 0, trang = 0, tong = null;
    for (;;) {
      const goc = `${CONG.api}${S.tienTo}/invoices/${CONG.duong[c]}?sort=tdlap:desc&size=${CONG.kichTrang}&search=${X.chuoiTim(doan, l.loc)}${conTro ? '&state=' + encodeURIComponent(conTro) : ''}`;
      let r = null;
      for (let lan = 1; lan <= 3; lan++) {
        const m = await goi(`${CONG.api}/captcha`, { thaoTac: '', kieu: 'json', nhip: dk.nhipDs, signal: dk.signal, ghi: dk.ghi });
        if (!m.ok || typeof m.body?.key !== 'string' || !m.body.key) return { hopLe: false, loi: `không lấy được captcha, mã ${m.status}` };
        const gia = await hoiMa(String(m.body.content || ''), `${ten}${trang ? `, trang ${trang + 1}` : ''}${lan > 1 ? ': mã vừa rồi chưa đúng, gõ lại' : ''}`, dk.signal);
        if (gia === null) return { hopLe: false, boQua: true, loi: 'anh chị đã bỏ qua' };
        tienDo(`Tìm ${ten}…`);
        r = await goi(`${goc}&ckey=${encodeURIComponent(m.body.key)}&cvalue=${encodeURIComponent(gia.toLowerCase())}`, { thaoTac: S.thaoTac[c], kieu: 'json', nhip: dk.nhipDs, signal: dk.signal, ghi: dk.ghi });
        if (r.loai !== 'captcha') break;
      }
      if (!r.ok) return { hopLe: false, loi: r.loai === 'captcha' ? 'gõ sai captcha 3 lần' : `mã ${r.status}: ${String(r.text).slice(0, 120)}` };
      const ds = Array.isArray(r.body?.datas) ? r.body.datas : [];
      if (typeof r.body?.total === 'number') tong = r.body.total;
      daNhan += ds.length;
      trang++;
      for (const inv of ds) {
        const k = X.khoa(c, inv), cu = hoaDon.get(k);
        if (cu) cu.__sco = true; else hoaDon.set(k, { ...inv, __chieu: c, __luot: 'máy tính tiền', __sco: true });
      }
      if (!X.conTrangSau(r.body, daNhan, conTro) || trang > 200) break;
      conTro = r.body.state;
    }
    return { hopLe: tong == null || daNhan >= tong, tong, daNhan };
  }

  async function taiMotHoaDon(inv, duong, dk) {
    let ketQua = null, lyDo = '';
    const tienTo = X.laMayTinhTien(inv) ? [...CONG.tienToXml].reverse() : CONG.tienToXml;
    for (const tt of tienTo) {
      const r = await goi(`${CONG.api}${tt}/invoices/export-xml?${X.thamSoHoaDon(inv)}`, { thaoTac: CONG.thaoTac.xml, kieu: 'buffer', nhip: dk.nhipXml, signal: dk.signal, ghi: dk.ghi });
      if (r.ok) {
        try {
          ketQua = await X.moPhanHoiXml(r.body, JSZip);
          if (ketQua.tep) break;
          lyDo = 'Cổng thuế không có file XML';
        } catch (e) { lyDo = e.message; ketQua = null; }
      } else lyDo = r.loai === 'khong-co-xml' ? 'Cổng thuế không có file XML' : `mã ${r.status}: ${String(r.text).slice(0, 120)}`;
    }
    const tep = ketQua?.tep || [];
    const ten = [];
    for (let j = 0; j < tep.length; j++) {
      const p = tep.length > 1 ? duong.replace(/\.xml$/, `_${j + 1}.xml`) : duong;
      await luuTep(p, tep[j].du);
      ten.push(p);
    }
    return { ten, lyDo };
  }

  /** ket: ghi dần, nên bấm dừng hay hết phiên giữa chừng vẫn biết đã lưu những gì */
  async function chay(tuyChon, coSan, ket, { signal, ghi, tienDo }) {
    const thang = X.cacThang(tuyChon.tuThang, tuyChon.denThang);
    const chieu = ['mua', 'ban'].filter(c => tuyChon[c]);
    const chieuSco = [tuyChon.mttMua && 'mua', tuyChon.mttBan && 'ban'].filter(Boolean);
    if (!chieu.length && !chieuSco.length) throw new DungHan('Chọn ít nhất một loại hoá đơn.');
    const dk = { signal, ghi, tienDo, nhipDs: new X.NhipGoi({ cachMs: 1500 }), nhipXml: new X.NhipGoi({ cachMs: 800, toiDa: 400, trongMs: 10 * 60000 }) };

    // 1) Danh sách. Thiếu so với số cổng báo thì tìm lại một lần; vẫn thiếu thì ghi ra để anh biết, không im lặng
    const hoaDon = new Map(), thieu = [];
    for (const c of chieu) for (const t of thang) for (const l of CONG.luot[c]) {
      let kq = await timLuot(c, t, l, hoaDon, dk);
      if (!kq.hopLe) {
        ghi(`Tháng ${t.nhan} (${tenChieu(c)}, ${l.nhan}): chưa đủ, tìm lại một lần…`);
        await X.ngu(3000, signal);
        kq = await timLuot(c, t, l, hoaDon, dk);
      }
      if (!kq.hopLe) thieu.push(`Tháng ${t.nhan}, ${tenChieu(c)}, ${l.nhan}: ${kq.loi || `cổng báo ${kq.tong}, nhận ${kq.daNhan}`}`);
    }
    if (chieuSco.length) {
      const doan = thang.flatMap(t => X.chiaDoan(t, CONG.sco.soNgay));
      ghi(`Hoá đơn máy tính tiền: cần gõ ít nhất ${chieuSco.reduce((n, c) => n + doan.length * CONG.luot[c].length, 0)} captcha, thêm 1 cho mỗi trang kết quả.`);
      for (const c of chieuSco) for (const d of doan) for (const l of CONG.luot[c]) {
        const kq = await timLuotSco(c, d, l, hoaDon, dk);
        if (!kq.hopLe) thieu.push(`Máy tính tiền ${tenChieu(c)} ${d.nhan}, ${l.nhan}: ${kq.loi || `cổng báo ${kq.tong}, nhận ${kq.daNhan}`}`);
      }
    }
    const ds = [...hoaDon.values()].sort((a, b) => (a.__chieu + X.ngayVN(a.tdlap)).localeCompare(b.__chieu + X.ngayVN(b.tdlap)));
    // Danh sách cổng gửi về Kho hoá đơn để đối soát: chỉ số, tiền, trạng thái, không có XML
    const hai0 = t => { const [d, m, y] = t.split('/'); return `${y}-${m}-${d}`; };
    bao({ danhSach: ds.map(i => [i.__chieu, i.nbmst, i.nbten, i.nmmst, i.nmten || i.nmtnmua, i.khmshdon, i.khhdon, i.shdon, X.ngayVN(i.tdlap), i.tgtcthue, i.tgtthue, i.tgtttbso, i.tthai]),
      kyTu: hai0(thang[0].tu), kyDen: hai0(thang[thang.length - 1].den), coMtt: chieuSco.length > 0, du: !thieu.length });
    if (tuyChon.chiDoiSoat) return { tong: ds.length, mua: ds.filter(i => i.__chieu === 'mua').length, ban: ds.filter(i => i.__chieu === 'ban').length, khongCo: 0, loi: 0, thieu: thieu.length, dsKhongCo: [], dsLoi: [], dsThieu: thieu };
    const soMua = ds.filter(i => i.__chieu === 'mua').length;
    ghi(`Tìm thấy ${ds.length} hoá đơn (mua vào ${soMua}, bán ra ${ds.length - soMua}).`);

    // 2) XML từng hoá đơn, bỏ qua tệp đã có. Lỗi thì sang lượt thử lại ở cuối, không chặn các hoá đơn sau
    const dong = new Map(), khongCo = [], daDung = new Set();
    let cho = [];
    ds.forEach(inv => {
      const mst = mstCuaMinh(inv);
      ket.mst.add(mst);
      let duong = `${mst}/${X.duongDanTep(inv.__chieu, inv)}`;
      for (let n = 2; daDung.has(duong.toLowerCase()); n++) duong = `${mst}/${X.duongDanTep(inv.__chieu, inv).replace(/\.xml$/, `_${n}.xml`)}`;
      daDung.add(duong.toLowerCase());
      const coRoi = coSan.has(duong.toLowerCase()) || coSan.has(duong.replace(/\.xml$/, '_1.xml').toLowerCase());
      if (coRoi && tuyChon.boQua) { ket.daCo++; dong.set(inv, X.dongTomTat(inv.__chieu, inv, true, duong)); }
      else cho.push({ inv, duong });
    });
    if (ket.daCo) ghi(`Bỏ qua ${ket.daCo} hoá đơn đã có trong thư mục.`);
    let loi = [];
    for (let lan = 1; lan <= 2 && cho.length; lan++) {
      if (lan === 2) { ghi(`Thử lại ${cho.length} hoá đơn lỗi…`); await X.ngu(5000, signal); }
      loi = [];
      let i = 0;
      for (const m of cho) {
        i++;
        tienDo(`Tải XML ${i}/${cho.length}${lan === 2 ? ' (lượt lại)' : ''}: ${m.inv.khhdon} số ${m.inv.shdon}`);
        const { ten, lyDo } = await taiMotHoaDon(m.inv, m.duong, dk);
        const nhan = `${m.inv.__chieu === 'mua' ? 'Mua vào' : 'Bán ra'} · ${m.inv.khhdon} số ${m.inv.shdon} · MST bán ${m.inv.nbmst} · ${X.ngayVN(m.inv.tdlap)}`;
        if (ten.length) ket.moi++;
        else if (lyDo.startsWith('Cổng thuế không có')) khongCo.push(nhan);
        else loi.push({ ...m, nhan: `${nhan} · ${lyDo}` });
        dong.set(m.inv, X.dongTomTat(m.inv.__chieu, m.inv, ten.length > 0, ten.join(' ; ')));
      }
      cho = loi;
    }

    // 3) Bảng tóm tắt, danh sách cần xem lại: ghi vào thư mục đầu tiên
    const gio = new Date(), hai = n => String(n).padStart(2, '0');
    const nhanGio = `${gio.getFullYear()}${hai(gio.getMonth() + 1)}${hai(gio.getDate())}-${hai(gio.getHours())}${hai(gio.getMinutes())}${hai(gio.getSeconds())}`;
    const goc = [...ket.mst][0] || 'chua-ro-mst';
    if (dong.size) await luuTep(`${goc}/TOM-TAT-HOA-DON-${nhanGio}.xlsx`, await X.taoXlsx(ds.map(i => dong.get(i)).filter(Boolean), JSZip));
    if (khongCo.length || loi.length || thieu.length) {
      const nd = '﻿' + [
        `Tải lúc ${gio.toLocaleString('vi-VN')} · tháng ${tuyChon.tuThang} đến ${tuyChon.denThang}`,
        '', `DANH SÁCH CHƯA ĐỦ (${thieu.length}):`, ...thieu,
        '', `KHÔNG CÓ XML TRÊN CỔNG THUẾ (${khongCo.length}):`, ...khongCo,
        '', `LỖI KHI TẢI, NÊN TẢI LẠI (${loi.length}):`, ...loi.map(x => x.nhan)
      ].join('\r\n');
      await luuTep(`${goc}/CAN-XEM-LAI-${nhanGio}.txt`, new TextEncoder().encode(nd));
    }
    return { tong: ds.length, mua: soMua, ban: ds.length - soMua, khongCo: khongCo.length, loi: loi.length, thieu: thieu.length, dsKhongCo: khongCo, dsLoi: loi.map(x => x.nhan), dsThieu: thieu };
  }

  // ---------- Nhận lệnh từ XML-Pro, báo tiến độ về XML-Pro ----------
  // Thẻ chọn tháng nằm trong giao diện XML-Pro. Trang cổng chạy phía sau, chỉ báo đã đăng nhập hay chưa:
  // không đọc ô mật khẩu, không gửi mã đăng nhập ra khỏi trang.
  let dk = null, coLanTruoc = null, lanKhong = 0;
  const bao = m => VO.postMessage({ lenh: 'tien', ...m });
  const ghi = s => bao({ ghi: s });
  const tienDo = s => bao({ tt: s });
  setInterval(() => {
    const co = !!CONG.layMaDangNhap();
    // Mất mã đăng nhập phải kéo dài vài lượt mới coi là hết phiên, tránh trang đăng nhập nhảy ra vì trang đang vẽ lại
    lanKhong = co ? 0 : lanKhong + 1;
    if (!co && coLanTruoc === true && lanKhong < 4) return;
    if (co !== coLanTruoc) { coLanTruoc = co; VO.postMessage({ lenh: 'dangNhap', co }); }
  }, 700);

  async function batDau(tuyChon) {
    if (dk) return;
    if (!CONG.layMaDangNhap()) { tienDo('Chưa đăng nhập.'); return; }
    const tm = tuyChon.chiDoiSoat ? { duongDan: '' } : await hoi('chonThuMucLuu');
    if (!tm.duongDan && !tuyChon.chiDoiSoat) return;
    dk = new AbortController();
    bao({ moi: true, dang: true, tt: 'Đang bắt đầu…' });
    VO.postMessage({ lenh: 'trangThai', dangTai: true });
    const ket = { mst: new Set(), moi: 0, daCo: 0 };
    ghi(tuyChon.chiDoiSoat ? 'Chỉ đối soát: lấy danh sách trên cổng, không tải XML.' : `Lưu vào ${tm.duongDan}`);
    try {
      const t = await chay(tuyChon, new Set(tm.coSan || []), ket, { signal: dk.signal, ghi, tienDo });
      tienDo(tuyChon.chiDoiSoat ? `Xong: cổng có ${t.tong} hoá đơn.` : `Xong: tải mới ${ket.moi}, đã có ${ket.daCo}, tổng ${t.tong} hoá đơn.`);
      ghi(`Mua vào ${t.mua}, bán ra ${t.ban}.`);
      if (t.thieu) ghi(`Danh sách chưa đủ (${t.thieu}):\n${t.dsThieu.join('\n')}`);
      if (t.khongCo) ghi(`Không có XML trên cổng (${t.khongCo}):\n${t.dsKhongCo.join('\n')}`);
      if (t.loi) ghi(`Lỗi, nên bấm tải lại (${t.loi}):\n${t.dsLoi.join('\n')}`);
    } catch (e) {
      if (e?.name === 'AbortError') tienDo(`Đã dừng. Giữ lại ${ket.moi} tệp vừa tải, bấm tải lại sẽ tải tiếp.`);
      else {
        tienDo('Chưa tải xong.');
        ghi(e instanceof DungHan ? e.message : 'Lỗi: ' + (e?.message || e));
        ghi(`Giữ lại ${ket.moi} tệp vừa tải, bấm tải lại sẽ tải tiếp.`);
      }
    } finally {
      dk = null;
      VO.postMessage({ lenh: 'trangThai', dangTai: false });
      if (ket.mst.size) VO.postMessage({ lenh: 'napVaoApp', mst: [...ket.mst] });
      bao({ dang: false, coTep: ket.mst.size > 0 });
    }
  }

  VO.addEventListener('message', e => {
    const m = e.data || {};
    if (m.loai === 'batDau') batDau(m.tuyChon || {});
    else if (m.loai === 'dung' && dk) dk.abort();
    else if (m.loai === 'captcha' && choMa) choMa(String(m.giaTri || ''));
    else if (m.loai === 'boQuaMa' && choMa) choMa(null);
  });
  window.__taiHdXmlPro = true;
})();
