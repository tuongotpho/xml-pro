/*
 * Tải XML hóa đơn (August87) — phần lõi: các hàm tính toán, không đụng giao diện.
 * Bản dùng trong XML-Pro, chép từ extension F:/AI/6.chrome-ex/tai-xml-hoa-don (1.0.1). Sửa cổng thì sửa cả hai nơi.
 * Tự viết, dựa trên cách gọi công khai của cổng hoadondientu.gdt.gov.vn.
 * (C) August87 - 0982722036
 *
 * Mọi chỗ phụ thuộc cổng thuế (địa chỉ, tham số, nơi lấy mã đăng nhập) gom ở mục CỔNG THUẾ
 * để cổng đổi thì sửa một chỗ.
 */
(function (root) {
  'use strict';

  // ---------- CỔNG THUẾ ----------
  const CONG = {
    api: '/api',
    endPoint: '/tra-cuu/tra-cuu-hoa-don',
    kichTrang: 50,
    duong: { mua: 'purchase', ban: 'sold' },
    thaoTac: { mua: 'Tìm kiếm (hóa đơn mua vào)', ban: 'Tìm kiếm (hóa đơn bán ra)', xml: 'Tải XML' },
    // Mua vào phải tìm 3 lượt theo trạng thái xử lý; bán ra một lượt
    luot: {
      mua: [{ loc: 'ttxly==5', nhan: 'đã cấp mã' }, { loc: 'ttxly==6', nhan: 'không mã' }, { loc: 'ttxly==8', nhan: 'máy tính tiền' }],
      ban: [{ loc: '', nhan: 'tất cả' }]
    },
    tienToXml: ['/query', '/sco-query'],
    // Hoá đơn máy tính tiền: cửa riêng, mỗi lần tìm (cả mỗi trang) phải kèm captcha, mỗi lần tối đa 10 ngày
    sco: {
      tienTo: '/sco-query', soNgay: 10,
      thaoTac: { mua: 'Tìm kiếm (hóa đơn máy tính tiền mua vào)', ban: 'Tìm kiếm (hóa đơn máy tính tiền bán ra)' }
    },
    layMaDangNhap: () => root.__NEXT_REDUX_STORE__?.getState?.()?.authReducer?.jwt || ''
  };

  const TRANG_THAI = { 1: 'Mới', 2: 'Thay thế', 3: 'Điều chỉnh', 4: 'Đã bị thay thế', 5: 'Đã bị điều chỉnh', 6: 'Đã bị hủy' };

  // ---------- Ngày tháng ----------
  const hai = n => String(n).padStart(2, '0');

  /** 'YYYY-MM' .. 'YYYY-MM' → danh sách tháng { nhan, tu, den } (tu/den dạng dd/mm/yyyy) */
  function cacThang(tuThang, denThang) {
    const [y1, m1] = tuThang.split('-').map(Number);
    const [y2, m2] = denThang.split('-').map(Number);
    if (!y1 || !m1 || !y2 || !m2) throw new Error('Tháng không hợp lệ.');
    const ds = [];
    for (let y = y1, m = m1; y < y2 || (y === y2 && m <= m2); m === 12 ? (y++, m = 1) : m++) {
      const cuoi = new Date(Date.UTC(y, m, 0)).getUTCDate();
      ds.push({ nhan: `${hai(m)}/${y}`, tu: `01/${hai(m)}/${y}`, den: `${hai(cuoi)}/${hai(m)}/${y}` });
      if (ds.length > 24) throw new Error('Chỉ tải tối đa 24 tháng một lần.');
    }
    if (!ds.length) throw new Error('"Từ tháng" phải trước hoặc bằng "Đến tháng".');
    return ds;
  }

  /** Một tháng { tu, den } → các đoạn tối đa soNgay ngày */
  function chiaDoan(thang, soNgay) {
    const [d2, m, y] = thang.den.split('/').map(Number);
    const ds = [];
    for (let d = 1; d <= d2; d += soNgay) {
      const cuoi = Math.min(d2, d + soNgay - 1);
      ds.push({ nhan: `${hai(d)}-${hai(cuoi)}/${hai(m)}/${y}`, tu: `${hai(d)}/${hai(m)}/${y}`, den: `${hai(cuoi)}/${hai(m)}/${y}` });
    }
    return ds;
  }

  /** Điều kiện tìm theo ngày lập (+ lọc trạng thái nếu có) — để nguyên dạng chữ như giao diện cổng thuế gửi */
  function chuoiTim(thang, loc) {
    const ds = [`tdlap=ge=${thang.tu}T00:00:00`, `tdlap=le=${thang.den}T23:59:59`];
    if (loc) ds.push(loc);
    return ds.join(';');
  }

  /** Ngày lập từ danh sách → 'YYYY-MM-DD' theo giờ Việt Nam */
  function ngayVN(gt) {
    const s = String(gt || '').trim();
    if (!s) return '';
    if (/T.*(Z|[+-]\d{2}:?\d{2})$/i.test(s)) {
      const d = new Date(s);
      if (!isNaN(d)) {
        const vn = new Date(d.getTime() + 7 * 3600 * 1000);
        return `${vn.getUTCFullYear()}-${hai(vn.getUTCMonth() + 1)}-${hai(vn.getUTCDate())}`;
      }
    }
    let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
    if (m) return `${m[3]}-${hai(m[2])}-${hai(m[1])}`;
    return '';
  }

  // ---------- Hóa đơn ----------
  /** Ký hiệu dạng C26MSG: ký tự thứ 4 là M = khởi tạo từ máy tính tiền */
  const laMayTinhTien = inv => !!inv.__sco || String(inv.khhdon || '').charAt(3).toUpperCase() === 'M';

  const khoa = (chieu, inv) => [chieu, inv.nbmst, inv.khmshdon, inv.khhdon, inv.shdon].join('|');

  const benKia = (chieu, inv) => chieu === 'mua'
    ? { mst: inv.nbmst || '', ten: inv.nbten || '' }
    : { mst: inv.nmmst || '', ten: inv.nmten || inv.nmtnmua || '' };

  const sachTen = s => String(s).replace(/[\\/:*?"<>|%\u0000-\u001f]/g, '_').replace(/\s+/g, ' ').trim();

  /** Thư mục + tên file trong zip, giống cách đặt của file mẫu đã quen dùng */
  function duongDanTep(chieu, inv) {
    const ngay = ngayVN(inv.tdlap).replace(/-/g, '').slice(2) || '000000';
    const bk = benKia(chieu, inv);
    const ten = sachTen(bk.ten).slice(0, 80).trim();
    const goc = sachTen([ngay, bk.mst || 'khong-mst', inv.khhdon, inv.shdon, ten].filter(Boolean).join('-'));
    const thuMuc = `${chieu === 'mua' ? 'MUA-VAO' : 'BAN-RA'}/${laMayTinhTien(inv) ? 'HD-MAY-TINH-TIEN' : 'HD-DIEN-TU'}/XML`;
    return `${thuMuc}/${goc}.xml`;
  }

  const thamSoHoaDon = inv => ['nbmst', 'khhdon', 'shdon', 'khmshdon']
    .map(k => `${k}=${encodeURIComponent(inv[k] ?? '')}`).join('&');

  /** Còn trang sau không: trang vừa đủ cỡ (hoặc chưa đủ tổng) và có con trỏ mới */
  function conTrangSau(trang, daNhan, conTroCu) {
    const ds = Array.isArray(trang?.datas) ? trang.datas : [];
    if (!ds.length || !trang.state || trang.state === conTroCu) return false;
    if (typeof trang.total === 'number') return daNhan < trang.total;
    return ds.length >= CONG.kichTrang;
  }

  // ---------- Phản hồi từ cổng ----------
  const boDau = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

  const laLoiCaptcha = (status, text) => [400, 422, 500].includes(status) && /captcha|ma xac thuc|\bckey\b|\bcvalue\b/.test(boDau(text));

  const laKhongCoXml = text => /khong (co|tim thay|ton tai) (du lieu |file |ho so goc|xml)|chua co xml|xml not found|no xml/.test(boDau(text));

  /** Xếp loại lỗi để quyết định: dừng hẳn, nghỉ rồi thử lại, hay bỏ qua */
  function loaiLoi(status, text) {
    const t = boDau(text);
    if (status === 401) return 'het-phien';
    // Chỉ coi là bị chặn khi cổng nói rõ (như extension cũ); 403 khác (mã đăng nhập không hợp lệ…) là hết phiên
    if (status === 403) return /phat hien hanh vi khong hop le|yeu cau da bi chan/.test(t) ? 'bi-chan' : 'het-phien';
    if (status === 429) return 'qua-day';
    if (laKhongCoXml(t) || status === 404) return 'khong-co-xml';
    if (status === 0 || status >= 500) return 'may-chu';
    return 'khac';
  }

  /** Mở phản hồi export-xml: zip (giữ nguyên từng byte các file .xml) hoặc XML dạng chữ */
  async function moPhanHoiXml(buffer, JSZip) {
    const u8 = new Uint8Array(buffer);
    if (!u8.length) return { khongCo: true };
    if (u8[0] === 0x50 && u8[1] === 0x4b) {
      const zip = await JSZip.loadAsync(u8);
      const ten = Object.keys(zip.files).filter(n => !zip.files[n].dir && n.toLowerCase().endsWith('.xml'));
      if (!ten.length) return { khongCo: true };
      const tep = [];
      for (const n of ten) tep.push({ ten: n.split('/').pop(), du: await zip.files[n].async('uint8array') });
      return { tep };
    }
    const text = new TextDecoder('utf-8').decode(u8);
    const dau = text.replace(/^﻿/, '').trimStart();
    if (dau.startsWith('<')) return { tep: [{ ten: 'invoice.xml', du: u8 }] };
    if (laKhongCoXml(text)) return { khongCo: true };
    throw new Error('Cổng thuế trả về nội dung lạ, không phải XML: ' + text.slice(0, 120));
  }

  // ---------- Nhịp gọi (hãm tốc độ để khỏi bị khóa) ----------
  function ngu(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(new DOMException('Đã dừng', 'AbortError'));
      const id = setTimeout(() => { signal?.removeEventListener('abort', huy); resolve(); }, ms);
      const huy = () => { clearTimeout(id); reject(new DOMException('Đã dừng', 'AbortError')); };
      signal?.addEventListener('abort', huy, { once: true });
    });
  }

  class NhipGoi {
    /** cachMs: khoảng cách tối thiểu; toiDa lần trong trongMs (0 = không giới hạn) */
    constructor({ cachMs, toiDa = 0, trongMs = 0, now = () => Date.now(), sleep = ngu }) {
      Object.assign(this, { goc: cachMs, cach: cachMs, toiDa, trongMs, now, sleep });
      this.lanCuoi = 0;
      this.dauVet = [];
      this.lan429 = [];
    }
    async cho(signal) {
      let doi = Math.max(0, this.lanCuoi + this.cach - this.now());
      if (this.toiDa && this.trongMs) {
        const tu = this.now() - this.trongMs;
        this.dauVet = this.dauVet.filter(t => t > tu);
        if (this.dauVet.length >= this.toiDa) doi = Math.max(doi, this.dauVet[0] + this.trongMs - this.now());
      }
      if (doi > 0) await this.sleep(doi, signal);
      this.lanCuoi = this.now();
      this.dauVet.push(this.lanCuoi);
    }
    thanhCong() { this.cach = Math.max(this.goc, Math.round(this.cach * 0.8)); }
    /** Bị báo gọi dày: giãn gấp 5 (trần 60 giây); 3 lần trong 1 phút thì nghỉ thêm 30 giây. Trả về số ms nên nghỉ */
    biQuaDay() {
      this.cach = Math.min(60000, this.cach * 5);
      const t = this.now();
      this.lan429 = this.lan429.filter(x => x > t - 60000).concat(t);
      return this.cach + (this.lan429.length >= 3 ? 30000 : 0);
    }
  }

  // ---------- Bảng tóm tắt Excel (.xlsx tự dựng, không cần thư viện Excel) ----------
  const COT = [
    ['Chiều', 10], ['Ngày lập', 11], ['Mẫu số', 7], ['Ký hiệu', 10], ['Số', 10], ['MST bên kia', 15], ['Tên bên kia', 45],
    ['Tiền trước thuế', 16], ['Tiền thuế', 14], ['Tổng thanh toán', 16], ['Trạng thái', 16], ['Lượt tìm', 14], ['Có XML', 8], ['File', 60]
  ];

  const xmlEsc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  const tenCot = i => { let s = ''; for (i++; i; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s; return s; };
  const soHoacRong = v => (v === '' || v == null || isNaN(Number(v))) ? null : Number(v);

  function dongTomTat(chieu, inv, coXml, tep) {
    const bk = benKia(chieu, inv);
    const ngay = ngayVN(inv.tdlap);
    return [
      chieu === 'mua' ? 'Mua vào' : 'Bán ra', ngay ? ngay.split('-').reverse().join('/') : '', inv.khmshdon, inv.khhdon, inv.shdon,
      bk.mst, bk.ten, soHoacRong(inv.tgtcthue), soHoacRong(inv.tgtthue), soHoacRong(inv.tgtttbso),
      TRANG_THAI[inv.tthai] || (inv.tthai ?? ''), inv.__luot || '', coXml ? 'Có' : 'Không', tep || ''
    ];
  }

  async function taoXlsx(dong, JSZip) {
    const o = (v, r, c) => {
      const ref = tenCot(c) + r;
      if (typeof v === 'number') return `<c r="${ref}" s="${COT[c][0].startsWith('Ti') || COT[c][0].startsWith('Tổng') ? 2 : 0}"><v>${v}</v></c>`;
      if (v === '' || v == null) return '';
      return `<c r="${ref}" t="inlineStr"${r === 1 ? ' s="1"' : ''}><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
    };
    const hang = [COT.map(c => c[0]), ...dong]
      .map((d, i) => `<row r="${i + 1}">${d.map((v, c) => o(v, i + 1, c)).join('')}</row>`).join('');
    const z = new JSZip();
    z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>');
    z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    z.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Hoa don" sheetId="1" r:id="rId1"/></sheets></workbook>');
    z.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    z.file('xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf/><xf fontId="1" applyFont="1"/><xf numFmtId="164" applyNumberFormat="1"/></cellXfs></styleSheet>');
    z.file('xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${COT.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c[1]}" customWidth="1"/>`).join('')}</cols><sheetData>${hang}</sheetData><autoFilter ref="A1:${tenCot(COT.length - 1)}${dong.length + 1}"/></worksheet>`);
    return z.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  }

  root.__taiXml = {
    CONG, cacThang, chiaDoan, laLoiCaptcha, chuoiTim, ngayVN, laMayTinhTien, khoa, benKia, duongDanTep, thamSoHoaDon,
    conTrangSau, laKhongCoXml, loaiLoi, moPhanHoiXml, ngu, NhipGoi, dongTomTat, taoXlsx
  };
})(typeof window !== 'undefined' ? window : globalThis);
