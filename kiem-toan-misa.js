/* kiem-toan-misa.js — Nhóm 1: Bộ Kiểm toán rủi ro Hóa đơn trước thanh tra thuế
 *                     Nhóm 2: Xuất Excel chuẩn Import MISA / FAST + Bộ nhớ tự học định khoản (localStorage)
 * Hoàn toàn chạy cục bộ trên trình duyệt, không gọi mạng, không emoji trong vùng Dashboard (.ktt-dash). */
(function () {
  'use strict';

  const KHOA_DINH_KHOAN = 'xmlpro.dinhKhoan.v1';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const so = n => Math.round(Number(n) || 0).toLocaleString('vi-VN');
  const sachMst = s => String(s || '').replace(/\s+/g, '').trim();

  const ngayVN = s => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '').trim());
    return m ? `${m[3]}/${m[2]}/${m[1]}` : String(s || '');
  };

  /** Trích ngày YYYY-MM-DD từ chuỗi thời gian ký số (<SigningTime> ISO, DD/MM/YYYY, YYYYMMDD..., DDMMYYYY...) */
  function tachNgayKy(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    m = /^(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/.exec(s);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = /^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])(20\d{2})/.exec(s);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return '';
  }

  const quyCuaNgay = s => {
    const m = /^(\d{4})-(\d{2})/.exec(s || '');
    return m ? `${m[1]}-Q${Math.ceil(Number(m[2]) / 3)}` : '';
  };

  /** Chuẩn hoá tên doanh nghiệp để so khớp pháp lý (chấp nhận viết tắt chuẩn TNHH, CP, TM, DV, MTV) */
  function chuanTenDn(s) {
    let t = ' ' + String(s || '').normalize('NFC').toUpperCase()
      .replace(/[.,;:'"()[\]\-–—/\\]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() + ' ';
    const cap = [
      ['TRÁCH NHIỆM HỮU HẠN', 'TNHH'],
      ['TRACH NHIEM HUU HAN', 'TNHH'],
      ['CỔ PHẦN', 'CP'],
      ['CO PHAN', 'CP'],
      ['MỘT THÀNH VIÊN', 'MTV'],
      ['MOT THANH VIEN', 'MTV'],
      ['THƯƠNG MẠI', 'TM'],
      ['THUONG MAI', 'TM'],
      ['DỊCH VỤ', 'DV'],
      ['DICH VU', 'DV'],
      ['SẢN XUẤT', 'SX'],
      ['SAN XUAT', 'SX'],
      ['XÂY DỰNG', 'XD'],
      ['XAY DUNG', 'XD'],
      ['VIỆT NAM', 'VN'],
      ['VIET NAM', 'VN']
    ];
    for (const [tu, gon] of cap) {
      const mau = ` ${tu} `;
      while (t.includes(mau)) t = t.replace(mau, ` ${gon} `);
    }
    return t.replace(/\s+/g, ' ').trim();
  }

  const TU_DEM_DIA_CHI = new Set([
    'viet', 'nam', 'vn', 'tinh', 'thanh', 'pho', 'tp', 'quan', 'huyen', 'thi', 'xa', 'phuong',
    'tran', 'thon', 'xom', 'ap', 'khu', 'to', 'dan', 'cum', 'so', 'nha', 'duong', 'ngo', 'ngach', 'hem', 'lo', 'tang', 'phong'
  ]);

  function boDau(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  }

  /** Tách tập từ khoá cốt lõi của địa chỉ (bỏ từ hành chính đệm và ", Việt Nam") */
  function tokenDiaChi(s) {
    const sach = boDau(String(s || '')).toLowerCase()
      .replace(/,\s*viet\s*nam\s*$/i, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w && !TU_DEM_DIA_CHI.has(w));
    return [...new Set(sach)];
  }

  function khopDiaChi(dchiHd, dchiChuan) {
    const a = tokenDiaChi(dchiHd), b = tokenDiaChi(dchiChuan);
    if (!a.length || !b.length) return true;
    const setA = new Set(a), setB = new Set(b);
    let chung = 0;
    for (const w of setB) if (setA.has(w)) chung++;
    const tyLeB = chung / setB.size;
    const tyLeA = chung / setA.size;
    // Khớp nếu đạt >= 60% từ khoá cốt lõi của một trong hai vế (tránh báo giả khi thiếu/thừa tên TP/Quận cũ sau sáp nhập)
    return Math.max(tyLeA, tyLeB) >= 0.6;
  }

  /** Ngưỡng bắt buộc thanh toán không dùng tiền mặt: 5 triệu từ 01/07/2025 (Luật GTGT 48/2024/QH15), 20 triệu trước đó */
  const nguongKhongTienMat = ngay => (!ngay || ngay >= '2025-07-01') ? 5_000_000 : 20_000_000;

  const laTienMatThuan = httt => {
    const s = boDau(String(httt || '')).toLowerCase().replace(/\s+/g, ' ').trim();
    return s === 'tm' || s === 'tien mat' || s === 'cash';
  };

  const laChuyenKhoanThuan = httt => {
    const s = boDau(String(httt || '')).toLowerCase().replace(/\s+/g, ' ').trim();
    return s === 'ck' || s === 'chuyen khoan' || s === 'unc' || s === 'uy nhiem chi';
  };

  const tongThanhToanHd = d => {
    if (d.tong != null && isFinite(Number(d.tong))) return Number(d.tong);
    return (Number(d.tongTruocThue) || 0) + (Number(d.tongThue) || 0);
  };

  /** Tìm tên pháp lý & địa chỉ chuẩn của công ty theo MST từ tờ khai thuế hoặc đa số hoá đơn */
  function timThongTinChuanCty(docs, mst) {
    const cMst = sachMst(mst);
    if (!cMst) return { ten: '', dchi: '' };
    const demTen = new Map(), gocTen = new Map();
    const demDc = new Map(), gocDc = new Map();
    const ghiTen = (raw, trongSo) => {
      const t = String(raw || '').trim();
      if (!t) return;
      const k = chuanTenDn(t);
      if (!k) return;
      demTen.set(k, (demTen.get(k) || 0) + trongSo);
      if (!gocTen.has(k) || t.length > gocTen.get(k).length) gocTen.set(k, t);
    };
    const ghiDc = (raw, trongSo) => {
      const d = String(raw || '').trim();
      if (!d) return;
      const tk = tokenDiaChi(d).join(' ');
      if (!tk) return;
      demDc.set(tk, (demDc.get(tk) || 0) + trongSo);
      if (!gocDc.has(tk)) gocDc.set(tk, d);
    };
    for (const d of (docs || [])) {
      if (!d || d.error) continue;
      if (d.kind === 'tk' && sachMst(d.mst) === cMst) {
        ghiTen(d.ten || d.hd?.tenNNT, 5);
        const dcTk = [d.hd?.dchi, d.hd?.xa, d.hd?.huyen, d.hd?.tinh].filter(Boolean).join(', ');
        ghiDc(dcTk, 4);
      } else if (d.kind === 'hd') {
        if (sachMst(d.ban?.MST) === cMst) {
          ghiTen(d.ban?.Ten, 3);
          ghiDc(d.ban?.DChi, 3);
        } else if (sachMst(d.mua?.MST) === cMst) {
          ghiTen(d.mua?.Ten, 1);
          ghiDc(d.mua?.DChi, 1);
        }
      }
    }
    let bestTen = '', maxT = 0;
    for (const [k, n] of demTen) if (n > maxT) { maxT = n; bestTen = gocTen.get(k) || ''; }
    let bestDc = '', maxD = 0;
    for (const [k, n] of demDc) if (n > maxD) { maxD = n; bestDc = gocDc.get(k) || ''; }
    return { ten: bestTen, dchi: bestDc };
  }

  /** Xác định MST công ty để chạy kiểm toán khi myMst chưa cài tay */
  function chonMstKiemToan(docs, myMst) {
    if (sachMst(myMst)) return sachMst(myMst);
    if (window.DASHBOARD_KE_TOAN && window.DASHBOARD_KE_TOAN.dsCongTy) {
      const ds = window.DASHBOARD_KE_TOAN.dsCongTy(docs, '');
      if (ds.length) return ds[0].mst;
    }
    return '';
  }

  /**
   * Nhóm 1: Chạy kiểm toán rủi ro trên tập tài liệu, gắn kết quả vào từng HĐ (d._ruiRo & d._ghiChuKiemToan)
   * và trả về đối tượng tổng hợp để vẽ trên Tab 3 Dashboard + xuất sheet Excel.
   */
  function kiemToanHoaDon(docs, pham, myMst, capNhatDoc = false) {
    const danhSach = pham || docs || [];
    const mst = chonMstKiemToan(danhSach, myMst);
    const hdAll = danhSach.filter(d => d && !d.error && d.kind === 'hd');

    if (capNhatDoc) {
      for (const d of hdAll) {
        d._ruiRo = {};
        d._ghiChuKiemToan = [];
      }
    }

    const kq = {
      mst,
      tenChuan: '',
      dchiChuan: '',
      lechNgayKy: [],
      ruiRoTienMat: [],
      khuyetSoBan: [],
      saiThongTinMua: [],
      tongSoRuiRo: 0
    };
    if (!hdAll.length) return kq;

    const chuan = timThongTinChuanCty(docs || danhSach, mst);
    kq.tenChuan = chuan.ten;
    kq.dchiChuan = chuan.dchi;
    const tenChuanNorm = chuanTenDn(chuan.ten);

    const chieuCua = d => {
      if (mst) {
        if (sachMst(d.ban?.MST) === mst) return 'ban';
        if (sachMst(d.mua?.MST) === mst) return 'mua';
      }
      return d.phanLoai === 'ban' || d.phanLoai === 'mua' ? d.phanLoai : '';
    };

    // Tập hoá đơn hiệu lực (bỏ bản sao trùng lặp thứ 2 trở đi và bỏ HĐ đã bị thay thế)
    const daThayKhoa = new Set();
    const hdHieuLuc = [];
    for (const d of hdAll) {
      if (d.thayTheBoi) continue;
      const khoa = `${sachMst(d.ban?.MST)}|${(d.kyHieu || '').trim()}|${(d.so || '').trim()}`;
      if (d.so && daThayKhoa.has(khoa)) continue;
      if (d.so) daThayKhoa.add(khoa);
      hdHieuLuc.push(d);
    }

    // 1a. Kiểm tra ngày lập (<NLap>) lệch ngày ký số người bán (<SigningTime>)
    for (const d of hdHieuLuc) {
      const chieu = chieuCua(d);
      if (mst && !chieu) continue;
      const ngayLap = String(d.ngay || '').trim();
      const ngayKy = tachNgayKy(d.kyBan?.time);
      if (!ngayLap || !ngayKy || ngayLap === ngayKy) continue;
      const tLap = Date.parse(ngayLap), tKy = Date.parse(ngayKy);
      const soNgay = (isFinite(tLap) && isFinite(tKy)) ? Math.round((tKy - tLap) / 86400000) : 0;
      const vatQuy = quyCuaNgay(ngayLap) !== quyCuaNgay(ngayKy);
      const vatThang = ngayLap.slice(0, 7) !== ngayKy.slice(0, 7);
      const mucDo = vatQuy ? 'Ký vắt quý' : vatThang ? 'Ký vắt tháng' : 'Ký khác ngày';
      const moTa = vatQuy
        ? `Ký số vắt quý: ngày lập ${ngayVN(ngayLap)} nhưng người bán ký số ngày ${ngayVN(ngayKy)} (khác quý kê khai — rủi ro bị loại khấu trừ kỳ lập hoặc phạt xuất sai thời điểm).`
        : vatThang
          ? `Ký số vắt tháng: ngày lập ${ngayVN(ngayLap)} nhưng người bán ký số ngày ${ngayVN(ngayKy)} (khác tháng kê khai).`
          : `Ngày ký số người bán (${ngayVN(ngayKy)}) lệch ${Math.abs(soNgay)} ngày so với ngày lập hóa đơn (${ngayVN(ngayLap)}).`;
      const muc = { d, chieu: chieu || d.phanLoai || 'khac', ngayLap, ngayKy, soNgay, vatQuy, vatThang, mucDo, moTa };
      kq.lechNgayKy.push(muc);
      if (capNhatDoc) {
        d._ruiRo.ngayKy = muc;
        d._ghiChuKiemToan.push(['warn', moTa]);
      }
    }

    // 1b. Kiểm tra điều kiện thanh toán không dùng tiền mặt (5 triệu từ 01/07/2025, 20 triệu trước đó)
    //     Bao gồm cả cộng dồn nhiều hoá đơn mua cùng ngày của cùng 1 nhà cung cấp
    const muaHieuLuc = hdHieuLuc.filter(d => chieuCua(d) === 'mua');
    const nhomCungNgayNcc = new Map();
    for (const d of muaHieuLuc) {
      if (d.lienQuan && (d.lienQuan.tc === '2' || d.lienQuan.tc === '3')) continue; // bỏ HĐ điều chỉnh âm/thông tin
      const mstBan = sachMst(d.ban?.MST);
      const ngay = String(d.ngay || '').trim();
      if (!mstBan || !ngay) continue;
      const k = `${mstBan}|${ngay}`;
      if (!nhomCungNgayNcc.has(k)) nhomCungNgayNcc.set(k, []);
      nhomCungNgayNcc.get(k).push(d);
    }

    const daCanhBaoTienMat = new Set();
    for (const d of muaHieuLuc) {
      const tong = tongThanhToanHd(d);
      const nguong = nguongKhongTienMat(d.ngay);
      if (tong >= nguong && laTienMatThuan(d.httt)) {
        const moTa = `Rủi ro loại khấu trừ GTGT & chi phí TNDN: Hóa đơn mua vào ${so(tong)} đ (từ ngưỡng ${so(nguong)} đ) ghi thanh toán "${d.httt || 'TM'}" — bắt buộc có chứng từ thanh toán không dùng tiền mặt.`;
        const muc = { d, loai: 'donLe', tong, nguong, httt: d.httt || 'TM', soHdCungNgay: 1, moTa };
        kq.ruiRoTienMat.push(muc);
        daCanhBaoTienMat.add(d);
        if (capNhatDoc) {
          d._ruiRo.tienMat = muc;
          d._ghiChuKiemToan.push(['warn', moTa]);
        }
      }
    }

    for (const dsNhom of nhomCungNgayNcc.values()) {
      if (dsNhom.length < 2) continue;
      const nguong = nguongKhongTienMat(dsNhom[0].ngay);
      const tongNgay = dsNhom.reduce((s, x) => s + Math.max(0, tongThanhToanHd(x)), 0);
      if (tongNgay < nguong) continue;
      // Nếu tất cả đều ghi thuần Chuyển khoản (CK) thì chỉ lưu ý nhẹ nếu cần; còn có HĐ ghi TM hoặc TM/CK hoặc để trống -> cảnh báo bẫy tách hoá đơn!
      const coKhongPhaiCkThuan = dsNhom.some(x => !laChuyenKhoanThuan(x.httt));
      if (!coKhongPhaiCkThuan) continue;
      const dsSo = dsNhom.map(x => `${x.kyHieu || ''}-${x.so || ''}`).join(', ');
      for (const d of dsNhom) {
        if (daCanhBaoTienMat.has(d)) continue;
        const moTa = `Cộng dồn trong ngày ≥ ${so(nguong)} đ: Có ${dsNhom.length} hóa đơn mua cùng ngày ${ngayVN(d.ngay)} của NCC ${d.ban?.Ten || d.ban?.MST || ''} (${dsSo}) tổng cộng ${so(tongNgay)} đ — bắt buộc thanh toán chuyển khoản cho toàn bộ các hóa đơn này.`;
        const muc = { d, loai: 'congDonNgay', tong: tongThanhToanHd(d), tongNgay, nguong, httt: d.httt || '', soHdCungNgay: dsNhom.length, moTa };
        kq.ruiRoTienMat.push(muc);
        daCanhBaoTienMat.add(d);
        if (capNhatDoc) {
          d._ruiRo.tienMat = muc;
          d._ghiChuKiemToan.push(['warn', moTa]);
        }
      }
    }

    // 1c. Rà soát "Thủng dải số" hoá đơn bán ra theo Mẫu số + Ký hiệu (tính cả HĐ đã bị thay thế/huỷ nếu đang nạp)
    const nhomDaiSo = new Map();
    for (const d of hdAll) {
      if (chieuCua(d) !== 'ban') continue;
      const soTxt = String(d.so || '').trim();
      if (!/^\d+$/.test(soTxt)) continue;
      const soInt = parseInt(soTxt, 10);
      if (!(soInt > 0)) continue;
      const mau = String(d.mau || '').trim(), kh = String(d.kyHieu || '').trim();
      if (!kh) continue;
      const k = `${mau}|${kh}`;
      if (!nhomDaiSo.has(k)) nhomDaiSo.set(k, { mau, kyHieu: kh, set: new Set(), minNgay: d.ngay || '', maxNgay: d.ngay || '' });
      const g = nhomDaiSo.get(k);
      g.set.add(soInt);
      if (d.ngay && (!g.minNgay || d.ngay < g.minNgay)) g.minNgay = d.ngay;
      if (d.ngay && (!g.maxNgay || d.ngay > g.maxNgay)) g.maxNgay = d.ngay;
    }

    for (const g of nhomDaiSo.values()) {
      if (g.set.size < 2) continue;
      const nums = [...g.set].sort((a, b) => a - b);
      let tongThieu = 0;
      const doanThieu = [];
      for (let i = 0; i < nums.length - 1; i++) {
        const a = nums[i], b = nums[i + 1];
        if (b - a <= 1) continue;
        const sl = b - a - 1;
        tongThieu += sl;
        if (doanThieu.length < 15) {
          if (sl === 1) doanThieu.push(String(a + 1));
          else if (sl <= 3) { for (let v = a + 1; v < b; v++) doanThieu.push(String(v)); }
          else doanThieu.push(`${a + 1}→${b - 1} (${sl} số)`);
        }
      }
      if (tongThieu > 0) {
        kq.khuyetSoBan.push({
          mau: g.mau,
          kyHieu: g.kyHieu,
          nhanDai: `${g.mau}${g.kyHieu}`,
          tuSo: nums[0],
          denSo: nums[nums.length - 1],
          daCo: nums.length,
          tongThieu,
          dsThieuText: doanThieu.join(', ') + (tongThieu > 30 && doanThieu.length >= 15 ? '…' : ''),
          minNgay: g.minNgay,
          maxNgay: g.maxNgay
        });
      }
    }

    // 1d. Kiểm tra sai lệch thông tin pháp lý người mua trên hoá đơn đầu vào
    for (const d of muaHieuLuc) {
      const loi = [];
      const mstMua = sachMst(d.mua?.MST);
      const tenMua = String(d.mua?.Ten || '').trim();
      const dchiMua = String(d.mua?.DChi || '').trim();

      if (mst && !mstMua) {
        loi.push('Thiếu MST người mua trên hóa đơn đầu vào');
      } else if (mst && mstMua && mstMua !== mst) {
        loi.push(`MST người mua (${mstMua}) khác MST công ty (${mst})`);
      }

      if (tenChuanNorm) {
        if (!tenMua) {
          loi.push('Thiếu tên đơn vị mua hàng trên hóa đơn đầu vào');
        } else if (chuanTenDn(tenMua) !== tenChuanNorm) {
          loi.push(`Tên người mua ("${tenMua}") lệch so với tên chuẩn ("${chuan.ten}")`);
        }
      }

      if (chuan.dchi) {
        if (!dchiMua) {
          loi.push('Thiếu địa chỉ người mua trên hóa đơn đầu vào');
        } else if (!khopDiaChi(dchiMua, chuan.dchi)) {
          loi.push(`Địa chỉ người mua ("${dchiMua}") khác biệt lớn so với địa chỉ chuẩn ("${chuan.dchi}")`);
        }
      }

      if (loi.length) {
        const moTa = `Sai lệch thông tin người mua trên HĐ đầu vào: ${loi.join('; ')}.`;
        const muc = { d, loi, tenMua, dchiMua, mstMua, moTa };
        kq.saiThongTinMua.push(muc);
        if (capNhatDoc) {
          d._ruiRo.thongTinMua = muc;
          d._ghiChuKiemToan.push(['warn', moTa]);
        }
      }
    }

    kq.tongSoRuiRo = kq.lechNgayKy.length + kq.ruiRoTienMat.length + kq.khuyetSoBan.length + kq.saiThongTinMua.length;
    return kq;
  }

  /** Gọi từ auditInvoices() của index.html để gắn kết quả kiểm toán vào từng hoá đơn */
  function danhDauRuiRo(allDocs, myMst) {
    return kiemToanHoaDon(allDocs, allDocs, myMst, true);
  }

  /** Vẽ khối Kiểm toán rủi ro hóa đơn không emoji cho Tab 3 của Dashboard kế toán */
  function veKhoiKiemToan(docs, pham, mst, attrLoc, giongLoc) {
    const kq = kiemToanHoaDon(docs, pham, mst, false);
    const nNgay = kq.lechNgayKy.length;
    const nTm = kq.ruiRoTienMat.length;
    const nDai = kq.khuyetSoBan.length;
    const nSoThieu = kq.khuyetSoBan.reduce((s, g) => s + g.tongThieu, 0);
    const nMua = kq.saiThongTinMua.length;

    const the = (tieuDe, giaTri, phu, locObj, coLoi) => {
      const bam = locObj && coLoi ? `${attrLoc(locObj)} class="ktt-kt-the ktt-kt-bam${giongLoc(locObj) ? ' on' : ''}" title="Bấm để lọc danh sách hoá đơn thuộc nhóm rủi ro này"` : 'class="ktt-kt-the"';
      return `<div ${bam}>
        <span class="ktt-nhan-o">${esc(tieuDe)}</span>
        <b class="${coLoi ? 'ktt-am' : 'ktt-duong'}">${esc(giaTri)}</b>
        <span class="ktt-phu-o">${esc(phu)}</span>
      </div>`;
    };

    const bangKhuyet = nDai ? `<div class="ktt-kt-phu">
      <div class="ktt-kt-phu-dau"><b>Dải ký hiệu bán ra bị khuyết số (${nDai} ký hiệu · thiếu ${so(nSoThieu)} số)</b><span class="ktt-nho">Cần đối chiếu biên bản huỷ / xoá bỏ hoặc tải bù từ Cổng Thuế</span></div>
      <table class="ktt-bang">
        <thead><tr><th>Mẫu &amp; Ký hiệu</th><th>Dải số đã nạp</th><th>Số lượng đã có</th><th>Số lượng khuyết</th><th>Các số hoá đơn bị thiếu</th></tr></thead>
        <tbody>
          ${kq.khuyetSoBan.map(g => `<tr>
            <td><b>${esc(g.nhanDai)}</b></td>
            <td>${g.tuSo} → ${g.denSo}</td>
            <td>${so(g.daCo)} HĐ</td>
            <td class="ktt-am"><b>${so(g.tongThieu)} số</b></td>
            <td style="text-align:left;font-family:ui-monospace,Consolas,monospace;font-size:12px">${esc(g.dsThieuText)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : '';

    return `<div class="ktt-khoi ktt-khoi-kiem-toan" id="kttKiemToan">
      <div class="ktt-khoi-dau">
        <div>
          <b>Kiểm toán rủi ro hóa đơn trước thanh tra thuế</b>
          <div class="ktt-nho">Tự động rà soát thời điểm ký số, ngưỡng thanh toán không dùng tiền mặt (5 triệu từ 01/07/2025), tính liên tục số HĐ bán ra và thông tin pháp lý người mua</div>
        </div>
        <span class="ktt-huy ${kq.tongSoRuiRo ? 'ktt-loi' : 'ktt-xong'}">${kq.tongSoRuiRo ? `${kq.tongSoRuiRo} phát hiện cần rà soát` : 'Đạt 4/4 tiêu chí an toàn'}</span>
      </div>
      <div class="ktt-kt-luoi">
        ${the('1. Thời điểm lập & ký số', nNgay ? `${so(nNgay)} HĐ lệch` : '0 lệch', nNgay ? `${kq.lechNgayKy.filter(x => x.vatQuy || x.vatThang).length} HĐ ký vắt tháng/quý · bấm để lọc` : 'Ngày ký số khớp ngày lập', { ruiRo: 'ngayKy' }, nNgay > 0)}
        ${the('2. Thanh toán tiền mặt (≥ 5tr)', nTm ? `${so(nTm)} HĐ rủi ro` : '0 rủi ro', nTm ? 'TM ≥ ngưỡng hoặc tách nhiều HĐ trong ngày · bấm để lọc' : 'Đạt điều kiện khấu trừ không tiền mặt', { ruiRo: 'tienMat' }, nTm > 0)}
        ${the('3. Liên tục dải số bán ra', nDai ? `Thiếu ${so(nSoThieu)} số` : 'Liên tục', nDai ? `Trên ${nDai} ký hiệu hoá đơn bán ra` : 'Không phát hiện khuyết số giữa chừng', null, nDai > 0)}
        ${the('4. Pháp lý người mua (đầu vào)', nMua ? `${so(nMua)} HĐ lệch` : 'Chuẩn khớp', nMua ? 'Sai tên / địa chỉ / thiếu MST · bấm để lọc' : (kq.tenChuan ? `Khớp ${kq.tenChuan}` : 'Chưa phát sinh sai lệch'), { ruiRo: 'thongTinMua' }, nMua > 0)}
      </div>
      ${bangKhuyet}
    </div>`;
  }

  /** Xuất sheet Excel "Kiểm toán rủi ro HĐ" khi bấm Xuất Excel tổng hợp */
  function xuatKiemToanExcel(docs, myMst) {
    const kq = kiemToanHoaDon(docs, docs, myMst, false);
    if (!kq.tongSoRuiRo) return null;
    const rows = [];
    const them = (nhom, chieu, khSo, ngay, doiTac, mstDt, giaTri, chiTiet) => rows.push([
      rows.length + 1,
      nhom,
      { text: chieu, isCenter: true },
      { text: khSo, isCenter: true },
      { text: ngay, isCenter: true },
      doiTac,
      { text: mstDt, isCenter: true },
      giaTri == null ? '' : Math.round(giaTri),
      chiTiet
    ]);

    for (const x of kq.lechNgayKy) {
      const p = x.chieu === 'ban' ? x.d.mua : x.d.ban;
      them(`1. ${x.mucDo}`, x.chieu === 'ban' ? 'Bán ra' : 'Mua vào', `${x.d.kyHieu || ''}-${x.d.so || ''}`, ngayVN(x.ngayLap), p?.Ten || '', p?.MST || '', tongThanhToanHd(x.d), x.moTa);
    }
    for (const x of kq.ruiRoTienMat) {
      them(x.loai === 'congDonNgay' ? '2. Tiền mặt cộng dồn ngày' : '2. Tiền mặt ≥ ngưỡng', 'Mua vào', `${x.d.kyHieu || ''}-${x.d.so || ''}`, ngayVN(x.d.ngay), x.d.ban?.Ten || '', x.d.ban?.MST || '', x.tong, x.moTa);
    }
    for (const g of kq.khuyetSoBan) {
      them('3. Thủng dải số bán ra', 'Bán ra', g.nhanDai, `${ngayVN(g.minNgay)} - ${ngayVN(g.maxNgay)}`, `Dải số ${g.tuSo} → ${g.denSo} (đã có ${g.daCo} HĐ)`, kq.mst, null, `Thiếu ${g.tongThieu} số hóa đơn: ${g.dsThieuText}`);
    }
    for (const x of kq.saiThongTinMua) {
      them('4. Sai thông tin người mua', 'Mua vào', `${x.d.kyHieu || ''}-${x.d.so || ''}`, ngayVN(x.d.ngay), x.d.ban?.Ten || '', x.d.ban?.MST || '', tongThanhToanHd(x.d), x.moTa);
    }

    return {
      name: 'Kiểm toán rủi ro HĐ',
      cols: [{ width: 6 }, { width: 25 }, { width: 11 }, { width: 15 }, { width: 16 }, { width: 34 }, { width: 15 }, { width: 16 }, { width: 72 }],
      headers: ['STT', 'Nhóm rủi ro', 'Chiều HĐ', 'Ký hiệu - Số', 'Ngày lập', 'Đối tác liên quan', 'MST đối tác', 'Tổng thanh toán', 'Chi tiết cảnh báo & Khuyến nghị xử lý'],
      rows
    };
  }

  // =========================================================================================
  // NHÓM 2: XUẤT EXCEL CHUẨN IMPORT MISA / FAST + TỰ HỌC ĐỊNH KHOẢN (localStorage)
  // =========================================================================================

  function docBoNhoDk() {
    try {
      const r = JSON.parse(localStorage.getItem(KHOA_DINH_KHOAN) || '{}');
      return {
        cheDo: r.cheDo === 'TT133' ? 'TT133' : 'TT200',
        quyTac: (r.quyTac && typeof r.quyTac === 'object') ? r.quyTac : {},
        doiTac: (r.doiTac && typeof r.doiTac === 'object') ? r.doiTac : {}
      };
    } catch (e) {
      return { cheDo: 'TT200', quyTac: {}, doiTac: {} };
    }
  }

  function ghiBoNhoDk(fn) {
    const db = docBoNhoDk();
    fn(db);
    try { localStorage.setItem(KHOA_DINH_KHOAN, JSON.stringify(db)); } catch (e) { }
    return db;
  }

  function maSlug(s, tienTo, maxLen = 20) {
    const sach = boDau(String(s || '')).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (!sach) return tienTo + '_CHUNG';
    return (tienTo + '_' + sach).slice(0, maxLen).replace(/_+$/, '');
  }

  function chuanKhoaHang(ten) {
    return boDau(String(ten || '')).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 80) || '_chung_';
  }

  function phanTichThueSuat(tsRaw) {
    const s = String(tsRaw || '').trim().toUpperCase();
    if (!s) return { nhan: '', tyLe: 0 };
    if (/KCT|KHONG CHIU/.test(boDau(s))) return { nhan: 'KCT', tyLe: 0 };
    if (/KKKNT/.test(s)) return { nhan: 'KKKNT', tyLe: 0 };
    const m = /(\d+(?:[.,]\d+)?)/.exec(s);
    if (!m) return { nhan: s, tyLe: 0 };
    const n = Number(m[1].replace(',', '.'));
    return { nhan: String(n), tyLe: isFinite(n) ? n / 100 : 0 };
  }

  /** Tự động gợi ý tài khoản kế toán thông minh theo TT200/TT99 hoặc TT133 */
  function goiYDinhKhoanDong(chieu, d, dong, cheDo, db, mstCty) {
    const p = chieu === 'ban' ? d.mua : d.ban;
    const mstDt = sachMst(p?.MST) || maSlug(p?.Ten || 'KHACH_LE', 'DT', 14);
    const kDt = `${mstCty}|${chieu}|${mstDt}`;
    const kQt = `${mstCty}|${chieu}|${mstDt}|${chuanKhoaHang(dong.ten)}`;
    const daNhoQt = db.quyTac[kQt] || null;
    const daNhoDt = db.doiTac[kDt] || null;

    const maDoiTacMacDinh = (chieu === 'mua' ? 'NCC_' : 'KH_') + (sachMst(p?.MST) || maSlug(p?.Ten || 'LE', '', 12).replace(/^_/, ''));
    const maHangMacDinh = String(dong.ma || '').trim() || maSlug(dong.ten || (chieu === 'mua' ? 'MUA_VAO' : 'BAN_RA'), chieu === 'mua' ? 'MH' : 'HH', 22);

    const ten = String(dong.ten || '').toLowerCase();
    const dg = Math.abs(Number(dong.dg) || Number(dong.tien) || 0);
    const tienMat = laTienMatThuan(d.httt);

    let tkNo = '', tkCo = '', tkThue = '';
    if (chieu === 'mua') {
      tkCo = tienMat ? '1111' : '331';
      const laTscd = dg >= 30_000_000 && /(máy|thiết bị|ô tô|xe tải|xe nâng|dây chuyền|nhà xưởng|máy chủ|server|hệ thống)/i.test(ten);
      const laVanPhong = /(văn phòng phẩm|giấy in|mực in|bút|kẹp file)/i.test(ten);
      const laDichVu = /(dịch vụ|cước|điện năng|tiền điện|tiền nước|viễn thông|internet|chữ ký số|phần mềm|vận chuyển|vận tải|thuê|bảo hiểm|sửa chữa|bảo dưỡng|tiếp khách|ăn uống|khách sạn|lưu trú|vé máy bay|phí|lệ phí|tư vấn|kiểm toán|quảng cáo|chuyển phát)/i.test(ten);
      const laNvl = /(nguyên liệu|vật liệu chính|nhiên liệu|xăng|dầu diesel|dầu DO|than đá)/i.test(ten);
      const laCcdc = /(công cụ|dụng cụ|khuôn|bàn ghế|tủ hồ sơ|máy in|laptop|máy tính)/i.test(ten) && dg < 30_000_000;

      if (laTscd) tkNo = cheDo === 'TT133' ? '211' : '2111';
      else if (laDichVu) tkNo = cheDo === 'TT133' ? '6422' : '6427';
      else if (laVanPhong) tkNo = cheDo === 'TT133' ? '6422' : '6423';
      else if (laCcdc) tkNo = cheDo === 'TT133' ? '153' : '1531';
      else if (laNvl) tkNo = '152';
      else tkNo = cheDo === 'TT133' ? '156' : '1561';

      tkThue = tkNo.startsWith('211') ? '1332' : '1331';
    } else {
      tkNo = tienMat ? '1111' : '131';
      const laDvBan = /(dịch vụ|vận chuyển|vận tải|sửa chữa|tư vấn|gia công|cho thuê|lắp đặt|thi công|cước|phần mềm|thiết kế)/i.test(ten);
      tkCo = (cheDo === 'TT200' && laDvBan) ? '5113' : '5111';
      tkThue = '33311';
    }

    return {
      kQt,
      kDt,
      daNho: !!daNhoQt,
      maDoiTac: (daNhoDt && daNhoDt.maDoiTac) || (daNhoQt && daNhoQt.maDoiTac) || maDoiTacMacDinh,
      maHang: (daNhoQt && daNhoQt.maHang) || maHangMacDinh,
      tkNo: (daNhoQt && daNhoQt.tkNo) || (chieu === 'ban' && daNhoDt?.tkCongNo ? daNhoDt.tkCongNo : tkNo),
      tkCo: (daNhoQt && daNhoQt.tkCo) || (chieu === 'mua' && daNhoDt?.tkCongNo ? daNhoDt.tkCongNo : tkCo),
      tkThue: (daNhoQt && daNhoQt.tkThue) || tkThue
    };
  }

  /** Chuẩn hoá danh sách dòng hàng của 1 hoá đơn, đảm bảo tổng tiền thuế các dòng khớp TgTThue */
  function layDongHangChuan(d) {
    const rawLines = Array.isArray(d.lines) ? d.lines.filter(l => l && l.tchat !== '4' && (l.tien != null || l.ten)) : [];
    if (!rawLines.length) {
      const ts0 = (d.thueSuat && d.thueSuat[0]?.ts) || (d.tongThue ? '10%' : 'KCT');
      return [{
        stt: 1,
        ma: '',
        ten: d.loai || 'Hàng hóa, dịch vụ theo hóa đơn ' + (d.kyHieu || '') + '-' + (d.so || ''),
        dvt: 'Lần',
        sl: 1,
        dg: Number(d.tongTruocThue) || 0,
        tlck: 0,
        stck: Number(d.ckTM) || 0,
        tien: Number(d.tongTruocThue) || 0,
        tsNhan: phanTichThueSuat(ts0).nhan,
        thue: Number(d.tongThue) || 0
      }];
    }

    const out = rawLines.map((l, idx) => {
      const dau = l.tchat === '3' ? -1 : 1;
      const tien = dau * Math.abs(Number(l.tien) || 0);
      const pt = phanTichThueSuat(l.ts || (d.thueSuat && d.thueSuat.length === 1 ? d.thueSuat[0].ts : ''));
      const coThueXml = l.thue != null && l.thue !== '' && (Number(l.thue) !== 0 || pt.tyLe === 0);
      const thue = coThueXml ? (dau * Math.abs(Number(l.thue) || 0)) : Math.round(tien * pt.tyLe);
      return {
        stt: l.stt || (idx + 1),
        ma: l.ma || '',
        ten: l.ten || 'Hàng hóa, dịch vụ',
        dvt: l.dvt || '',
        sl: Number(l.sl) || 0,
        dg: Number(l.dg) || 0,
        tlck: Number(l.tlck) || 0,
        stck: Number(l.stck) || 0,
        tien,
        tsNhan: pt.nhan,
        thue
      };
    });

    // Khớp chênh lệch làm tròn tiền thuế dòng hàng với tổng thuế trên hoá đơn (TgTThue)
    if (d.tongThue != null && out.length) {
      const sumThue = out.reduce((s, x) => s + x.thue, 0);
      const lech = Math.round(Number(d.tongThue) - sumThue);
      if (lech !== 0 && Math.abs(lech) <= Math.max(50, out.length * 5)) {
        for (let i = out.length - 1; i >= 0; i--) {
          if (out[i].tien !== 0) { out[i].thue += lech; break; }
        }
      }
    }
    return out;
  }

  function khopKyLoc(ngay, kyLoc) {
    if (!kyLoc) return true;
    const m = /^(\d{4})-(\d{2})/.exec(ngay || '');
    if (!m) return false;
    if (kyLoc.includes('-Q')) return `${m[1]}-Q${Math.ceil(Number(m[2]) / 3)}` === kyLoc;
    if (kyLoc.includes('-M')) return `${m[1]}-M${m[2]}` === kyLoc;
    return ngay.startsWith(kyLoc);
  }

  /** Tập hợp dữ liệu dòng chứng từ + nhóm quy tắc định khoản cho hộp thoại #dlgMisa và xuất Excel */
  function thuThapDuLieuMisa(docs, mstCty, kyLoc) {
    const DC = window.DOI_CHIEU;
    const db = docBoNhoDk();
    const mst = chonMstKiemToan(docs, mstCty);
    if (!DC || !mst) return { mst, cheDo: db.cheDo, mua: [], ban: [], dongMua: [], dongBan: [], nhom: [], soDaNho: 0 };

    const { mua, ban } = DC.chonHoaDon(docs, mst, '0000-00-00', '9999-12-31');
    const muaLoc = mua.filter(d => khopKyLoc(d.ngay, kyLoc)).sort((a, b) => (a.ngay || '').localeCompare(b.ngay || ''));
    const banLoc = ban.filter(d => khopKyLoc(d.ngay, kyLoc)).sort((a, b) => (a.ngay || '').localeCompare(b.ngay || ''));

    const nhomMap = new Map();
    const dongMua = [], dongBan = [];

    const xuLy = (dsHd, chieu, mangDong) => {
      dsHd.forEach((d, idxHd) => {
        const p = chieu === 'ban' ? d.mua : d.ban;
        const soCt = (chieu === 'mua' ? 'MH' : 'BH') + String(d.ngay || '').replace(/-/g, '').slice(2, 6) + '_' + String(idxHd + 1).padStart(4, '0');
        const lines = layDongHangChuan(d);
        for (const l of lines) {
          const dk = goiYDinhKhoanDong(chieu, d, l, db.cheDo, db, mst);
          const banGhi = { chieu, d, p, soCt, l, dk };
          mangDong.push(banGhi);

          if (!nhomMap.has(dk.kQt)) {
            nhomMap.set(dk.kQt, {
              kQt: dk.kQt,
              kDt: dk.kDt,
              chieu,
              tenDoiTac: p?.Ten || '(Khách lẻ / Không ghi tên)',
              mstDoiTac: sachMst(p?.MST),
              tenHang: l.ten,
              maDoiTac: dk.maDoiTac,
              maHang: dk.maHang,
              tkNo: dk.tkNo,
              tkCo: dk.tkCo,
              tkThue: dk.tkThue,
              daNho: dk.daNho,
              soDong: 0,
              tongTien: 0,
              tongThue: 0
            });
          }
          const g = nhomMap.get(dk.kQt);
          g.soDong++;
          g.tongTien += l.tien;
          g.tongThue += l.thue;
        }
      });
    };

    xuLy(muaLoc, 'mua', dongMua);
    xuLy(banLoc, 'ban', dongBan);

    const nhom = [...nhomMap.values()].sort((a, b) => {
      if (a.chieu !== b.chieu) return a.chieu === 'mua' ? -1 : 1;
      return Math.abs(b.tongTien) - Math.abs(a.tongTien);
    });

    const soDaNho = Object.keys(db.quyTac).filter(k => k.startsWith(mst + '|')).length;
    return { mst, cheDo: db.cheDo, mua: muaLoc, ban: banLoc, dongMua, dongBan, nhom, soDaNho };
  }

  /** Tạo 3 sheet Excel chuẩn Import MISA SME / AMIS / FAST: MISA_Mua_hang, MISA_Ban_hang, Tong_hop_Dinh_khoan */
  function taoSheetsMisa(docs, mstCty, kyLoc) {
    const dl = thuThapDuLieuMisa(docs, mstCty, kyLoc);
    const sheets = [];

    const rowsMua = dl.dongMua.map(x => {
      const { d, p, soCt, l, dk } = x;
      const tienMat = laTienMatThuan(d.httt);
      const laDv = dk.tkNo.startsWith('64') || dk.tkNo.startsWith('242');
      const ngay = ngayVN(d.ngay);
      return [
        laDv ? 'Mua dịch vụ' : 'Mua hàng trong nước nhập kho',
        tienMat ? 'Tiền mặt' : 'Chưa thanh toán',
        'Nhận kèm hóa đơn',
        { text: ngay, isCenter: true },
        { text: ngay, isCenter: true },
        { text: soCt, isCenter: true },
        { text: d.mau || '', isCenter: true },
        { text: d.kyHieu || '', isCenter: true },
        { text: d.so || '', isCenter: true },
        { text: ngay, isCenter: true },
        dk.maDoiTac,
        p?.Ten || '',
        { text: sachMst(p?.MST), isCenter: true },
        p?.DChi || '',
        `Mua hàng của ${p?.Ten || p?.MST || 'NCC'} theo HĐ ${d.kyHieu || ''}-${d.so || ''}`,
        dk.maHang,
        l.ten,
        { text: l.dvt || '', isCenter: true },
        l.sl || 0,
        l.dg || 0,
        Math.round(l.tien),
        l.tlck || 0,
        Math.round(l.stck || 0),
        { text: l.tsNhan, isCenter: true },
        Math.round(l.thue),
        Math.round(l.tien + l.thue),
        { text: dk.tkNo, isCenter: true, isBold: true },
        { text: dk.tkCo, isCenter: true, isBold: true },
        { text: dk.tkThue, isCenter: true }
      ];
    });

    sheets.push({
      name: 'MISA_Mua_hang',
      cols: [
        { width: 26 }, { width: 17 }, { width: 18 }, { width: 14 }, { width: 14 }, { width: 16 },
        { width: 10 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 18 }, { width: 34 },
        { width: 15 }, { width: 36 }, { width: 38 }, { width: 18 }, { width: 36 }, { width: 10 },
        { width: 11 }, { width: 15 }, { width: 16 }, { width: 11 }, { width: 14 }, { width: 11 },
        { width: 15 }, { width: 17 }, { width: 16 }, { width: 16 }, { width: 13 }
      ],
      headers: [
        'Hình thức mua hàng', 'Phương thức thanh toán', 'Nhận kèm hóa đơn', 'Ngày hạch toán (*)', 'Ngày chứng từ (*)', 'Số phiếu nhập / CT (*)',
        'Mẫu số HĐ', 'Ký hiệu HĐ', 'Số hóa đơn', 'Ngày hóa đơn', 'Mã nhà cung cấp (*)', 'Tên nhà cung cấp',
        'Mã số thuế NCC', 'Địa chỉ NCC', 'Diễn giải', 'Mã hàng (*)', 'Tên hàng', 'ĐVT',
        'Số lượng', 'Đơn giá', 'Thành tiền', 'Tỷ lệ CK (%)', 'Tiền chiết khấu', '% thuế GTGT',
        'Tiền thuế GTGT', 'Tổng thanh toán', 'TK kho / chi phí (*)', 'TK công nợ / tiền (*)', 'TK thuế GTGT'
      ],
      rows: rowsMua
    });

    const rowsBan = dl.dongBan.map(x => {
      const { d, p, soCt, l, dk } = x;
      const tienMat = laTienMatThuan(d.httt);
      const kiemXk = dk.tkCo === '5111' ? 'Có' : 'Không';
      const ngay = ngayVN(d.ngay);
      return [
        tienMat ? 'Thu tiền ngay (Tiền mặt)' : 'Chưa thu tiền',
        { text: kiemXk, isCenter: true },
        { text: 'Có', isCenter: true },
        { text: ngay, isCenter: true },
        { text: ngay, isCenter: true },
        { text: soCt, isCenter: true },
        { text: d.mau || '', isCenter: true },
        { text: d.kyHieu || '', isCenter: true },
        { text: d.so || '', isCenter: true },
        { text: ngay, isCenter: true },
        dk.maDoiTac,
        p?.Ten || 'Khách lẻ không lấy hóa đơn',
        { text: sachMst(p?.MST), isCenter: true },
        p?.DChi || '',
        `Bán hàng cho ${p?.Ten || p?.MST || 'khách hàng'} theo HĐ ${d.kyHieu || ''}-${d.so || ''}`,
        dk.maHang,
        l.ten,
        { text: l.dvt || '', isCenter: true },
        l.sl || 0,
        l.dg || 0,
        Math.round(l.tien),
        l.tlck || 0,
        Math.round(l.stck || 0),
        { text: l.tsNhan, isCenter: true },
        Math.round(l.thue),
        Math.round(l.tien + l.thue),
        { text: dk.tkNo, isCenter: true, isBold: true },
        { text: dk.tkCo, isCenter: true, isBold: true },
        { text: dk.tkThue, isCenter: true }
      ];
    });

    sheets.push({
      name: 'MISA_Ban_hang',
      cols: [
        { width: 22 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 16 },
        { width: 10 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 18 }, { width: 34 },
        { width: 15 }, { width: 36 }, { width: 38 }, { width: 18 }, { width: 36 }, { width: 10 },
        { width: 11 }, { width: 15 }, { width: 16 }, { width: 11 }, { width: 14 }, { width: 11 },
        { width: 15 }, { width: 17 }, { width: 16 }, { width: 16 }, { width: 13 }
      ],
      headers: [
        'Phương thức thanh toán', 'Kiêm phiếu xuất kho', 'Lập kèm hóa đơn', 'Ngày hạch toán (*)', 'Ngày chứng từ (*)', 'Số chứng từ (*)',
        'Mẫu số HĐ', 'Ký hiệu HĐ', 'Số hóa đơn', 'Ngày hóa đơn', 'Mã khách hàng (*)', 'Tên khách hàng',
        'Mã số thuế KH', 'Địa chỉ KH', 'Diễn giải', 'Mã hàng (*)', 'Tên hàng', 'ĐVT',
        'Số lượng', 'Đơn giá', 'Thành tiền', 'Tỷ lệ CK (%)', 'Tiền chiết khấu', '% thuế GTGT',
        'Tiền thuế GTGT', 'Tổng thanh toán', 'TK công nợ / tiền (*)', 'TK doanh thu (*)', 'TK thuế GTGT'
      ],
      rows: rowsBan
    });

    // Sheet 3: Tổng hợp bút toán Nợ - Có
    const butToan = new Map();
    const congBt = (phanHe, tkNo, tkCo, dienGiai, tien) => {
      const v = Math.round(Number(tien) || 0);
      if (!v) return;
      const k = `${phanHe}|${tkNo}|${tkCo}`;
      if (!butToan.has(k)) butToan.set(k, { phanHe, tkNo, tkCo, dienGiai, soDong: 0, soTien: 0 });
      const b = butToan.get(k);
      b.soDong++;
      b.soTien += v;
    };

    for (const x of dl.dongMua) {
      congBt('Mua vào', x.dk.tkNo, x.dk.tkCo, `Hạch toán giá trị mua vào (${dl.cheDo})`, x.l.tien);
      congBt('Thuế GTGT đầu vào', x.dk.tkThue, x.dk.tkCo, 'Thuế GTGT đầu vào được khấu trừ', x.l.thue);
    }
    for (const x of dl.dongBan) {
      congBt('Bán ra', x.dk.tkNo, x.dk.tkCo, `Hạch toán doanh thu bán hàng & dịch vụ (${dl.cheDo})`, x.l.tien);
      congBt('Thuế GTGT đầu ra', x.dk.tkNo, x.dk.tkThue, 'Thuế GTGT đầu ra phải nộp', x.l.thue);
    }

    const rowsDk = [...butToan.values()].map((b, i) => [
      i + 1,
      b.phanHe,
      { text: b.tkNo, isCenter: true, isBold: true },
      { text: b.tkCo, isCenter: true, isBold: true },
      b.dienGiai,
      b.soDong,
      b.soTien
    ]);
    const tongPhatSinh = [...butToan.values()].reduce((s, b) => s + b.soTien, 0);
    if (rowsDk.length) {
      rowsDk.push([
        '',
        { text: 'TỔNG PHÁT SINH ĐỐI ỨNG NỢ - CÓ', isBold: true },
        '',
        '',
        `Chế độ kế toán: ${dl.cheDo === 'TT133' ? 'Thông tư 133/2016/TT-BTC' : 'Thông tư 200/2014/TT-BTC & TT99'}`,
        [...butToan.values()].reduce((s, b) => s + b.soDong, 0),
        tongPhatSinh
      ]);
    }

    sheets.push({
      name: 'Tong_hop_Dinh_khoan',
      cols: [{ width: 6 }, { width: 22 }, { width: 14 }, { width: 14 }, { width: 46 }, { width: 14 }, { width: 20 }],
      headers: ['STT', 'Phân hệ', 'Tài khoản Nợ', 'Tài khoản Có', 'Diễn giải bút toán tổng hợp', 'Số dòng CT', 'Số tiền phát sinh (VNĐ)'],
      rows: rowsDk
    });

    return { sheets, thongKe: { mst: dl.mst, cheDo: dl.cheDo, soMua: dl.mua.length, soBan: dl.ban.length, dongMua: rowsMua.length, dongBan: rowsBan.length, tongPhatSinh } };
  }

  // ---------------- Giao diện hộp thoại #dlgMisa ----------------
  let _stateMisa = { docs: [], mst: '', ky: '', tim: '', daGanSuKien: false };

  function danhSachKyMisa(docs, mst) {
    const DC = window.DOI_CHIEU;
    if (!DC || !mst) return [];
    const { mua, ban } = DC.chonHoaDon(docs, mst, '0000-00-00', '9999-12-31');
    const quy = new Set(), thang = new Set();
    for (const d of [...mua, ...ban]) {
      const m = /^(\d{4})-(\d{2})/.exec(d.ngay || '');
      if (!m) continue;
      quy.add(`${m[1]}-Q${Math.ceil(Number(m[2]) / 3)}`);
      thang.add(`${m[1]}-M${m[2]}`);
    }
    const ten = k => k.includes('-Q') ? `Quý ${k.slice(6)}/${k.slice(0, 4)}` : `Tháng ${k.slice(6)}/${k.slice(0, 4)}`;
    return [
      ...[...quy].sort().reverse().map(k => ({ k, nhan: ten(k) })),
      ...[...thang].sort().reverse().map(k => ({ k, nhan: ten(k) }))
    ];
  }

  function damBaoHopThoaiMisa() {
    let dlg = document.getElementById('dlgMisa');
    if (dlg) return dlg;

    const css = document.createElement('style');
    css.id = 'cssKiemToanMisa';
    css.textContent = `
      #dlgMisa { border: 1px solid var(--line); border-radius: 8px; padding: 12px 16px; width: 96vw; max-width: none; max-height: 92vh; background: #ffffff; color: var(--ink); box-shadow: 0 12px 32px rgba(0,0,0,.28); }
      #dlgMisa::backdrop { background: rgba(15, 23, 42, .65); backdrop-filter: none; }
      html.dark #dlgMisa { background: #1e293b; color: #f1f5f9; border-color: #475569; }
      .misa-dau { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 6px; }
      .misa-dau h3 { margin: 0 0 2px; font-size: 15px; line-height: 1.25; }
      .misa-phu { font-size: 11.5px; color: var(--muted); line-height: 1.2; }
      .misa-thanh { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 6px 10px; background: var(--bg); border: 1px solid var(--line); border-radius: 6px; margin-bottom: 6px; }
      .misa-thanh label { display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; }
      .misa-thanh select, .misa-thanh input[type="search"] { padding: 3px 7px; height: 27px; border: 1px solid var(--line); border-radius: 5px; background: #ffffff; color: var(--ink); font-size: 12px; }
      .misa-tom { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 12px; margin-bottom: 5px; color: var(--muted); line-height: 1.25; }
      .misa-tom b { color: var(--ink); }
      .misa-cuon { max-height: 68vh; overflow: auto; border: 1px solid var(--line); border-radius: 6px; margin-bottom: 8px; background: #ffffff; }
      html.dark .misa-cuon { background: #1e293b; }
      .misa-bang { width: 100%; border-collapse: collapse; font-size: 12px; line-height: 1.2; }
      .misa-bang th { position: sticky; top: 0; z-index: 2; background: #f1f5f9; color: var(--ink); font-weight: 700; text-align: left; padding: 5px 7px; border-bottom: 1px solid var(--line); white-space: nowrap; }
      html.dark .misa-bang th { background: #0f172a; color: #e2e8f0; }
      .misa-bang td { padding: 2px 6px; border-bottom: 1px solid #eef0f2; vertical-align: middle; line-height: 1.2; }
      html.dark .misa-bang td { border-bottom-color: #334155; }
      .misa-bang tr:hover td { background: #f1f5f9; }
      html.dark .misa-bang tr:hover td { background: #253349; }
      .misa-dt-ten { font-weight: 600; max-width: 400px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .misa-dt-ten .misa-phu { font-weight: 400; margin-left: 4px; }
      .misa-mh-ten { max-width: 440px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .misa-o { width: 100%; box-sizing: border-box; padding: 1px 5px; height: 23px; border: 1px solid var(--line); border-radius: 4px; background: #ffffff; color: var(--ink); font-family: ui-monospace, Consolas, monospace; font-size: 12px; line-height: 1.15; }
      html.dark #dlgMisa select, html.dark #dlgMisa input { background: #0f172a; color: #f1f5f9; border-color: #475569; }
      .misa-o:focus { outline: 2px solid #0284c7; border-color: #0284c7; }
      .misa-tk { width: 64px; text-align: center; font-weight: 700; }
      .misa-ma { width: 132px; }
      .misa-nho-nhan { display: inline-block; padding: 1px 6px; border-radius: 99px; font-size: 10.5px; font-weight: 600; white-space: nowrap; line-height: 1.3; }
      .misa-nho-nhan.da-nho { background: #dcfce7; color: #166534; }
      .misa-nho-nhan.goi-y { background: #f1f5f9; color: #475569; }
      html.dark .misa-nho-nhan.da-nho { background: #14532d; color: #bbf7d0; }
      html.dark .misa-nho-nhan.goi-y { background: #334155; color: #e2e8f0; }
      .misa-chan { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
    `;
    document.head.appendChild(css);

    dlg = document.createElement('dialog');
    dlg.id = 'dlgMisa';
    dlg.innerHTML = `
      <div class="misa-dau">
        <div>
          <h3>Xuất Bảng kê chuẩn Import MISA / FAST &amp; Tự học Định khoản</h3>
          <div class="misa-phu">Sửa Mã hàng hoặc Tài khoản Nợ / Có một lần — phần mềm tự động ghi nhớ trên máy cho toàn bộ các tháng/quý sau.</div>
        </div>
        <button type="button" id="btnMisaDong" title="Đóng hộp thoại">✕</button>
      </div>
      <div class="misa-thanh">
        <label>Công ty <select id="misaMst"></select></label>
        <label>Kỳ chứng từ <select id="misaKy"></select></label>
        <label>Chế độ kế toán
          <select id="misaCheDo">
            <option value="TT200">Thông tư 200 / TT99 (TK 1561, 6427, 5111, 5113…)</option>
            <option value="TT133">Thông tư 133 DN nhỏ &amp; vừa (TK 156, 6422, 5111…)</option>
          </select>
        </label>
        <input type="search" id="misaTim" placeholder="Lọc nhanh tên đối tác, mặt hàng, tài khoản…" style="flex:1;min-width:210px">
      </div>
      <div class="misa-tom" id="misaTomTat"></div>
      <div class="misa-cuon">
        <table class="misa-bang">
          <thead>
            <tr>
              <th>Phân hệ</th>
              <th>Đối tác (NCC / Khách hàng)</th>
              <th>Mã đối tượng</th>
              <th>Mặt hàng / Dịch vụ</th>
              <th>Mã vật tư / hàng</th>
              <th>TK Nợ</th>
              <th>TK Có</th>
              <th>TK Thuế</th>
              <th style="text-align:right">Cộng trước thuế</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody id="misaBangBody"></tbody>
        </table>
      </div>
      <div class="misa-chan">
        <button type="button" id="btnMisaXoaNho" title="Xoá các quy tắc định khoản đã lưu của công ty này để quay về gợi ý tự động">Đặt lại quy tắc đã nhớ</button>
        <div style="display:flex;gap:8px">
          <button type="button" id="btnMisaXuat" class="primary" style="background:#15803d;border-color:#15803d;color:#fff;font-weight:600">Xuất Excel MISA (.xlsx)</button>
          <button type="button" id="btnMisaDong2">Đóng</button>
        </div>
      </div>
    `;
    document.body.appendChild(dlg);

    if (!_stateMisa.daGanSuKien) {
      _stateMisa.daGanSuKien = true;
      const dong = () => dlg.close();
      dlg.querySelector('#btnMisaDong').onclick = dong;
      dlg.querySelector('#btnMisaDong2').onclick = dong;

      dlg.querySelector('#misaMst').onchange = e => {
        _stateMisa.mst = e.target.value;
        _stateMisa.ky = '';
        veLaiHopThoaiMisa(true);
      };
      dlg.querySelector('#misaKy').onchange = e => {
        _stateMisa.ky = e.target.value;
        veLaiHopThoaiMisa(false);
      };
      dlg.querySelector('#misaCheDo').onchange = e => {
        ghiBoNhoDk(db => { db.cheDo = e.target.value === 'TT133' ? 'TT133' : 'TT200'; });
        veLaiHopThoaiMisa(false);
      };
      dlg.querySelector('#misaTim').oninput = e => {
        _stateMisa.tim = e.target.value.trim().toLowerCase();
        locDongBangMisa();
      };

      // Tự động lưu quy tắc định khoản ngay khi kế toán sửa ô trong bảng
      dlg.querySelector('#misaBangBody').addEventListener('input', e => {
        const inp = e.target.closest('input[data-misa-truong]');
        if (!inp) return;
        const tr = inp.closest('tr[data-kqt]');
        if (!tr) return;
        const kQt = tr.dataset.kqt, kDt = tr.dataset.kdt;
        const layO = ten => (tr.querySelector(`input[data-misa-truong="${ten}"]`)?.value || '').trim();
        const maDoiTac = layO('maDoiTac');
        const maHang = layO('maHang');
        const tkNo = layO('tkNo');
        const tkCo = layO('tkCo');
        const tkThue = layO('tkThue');

        ghiBoNhoDk(db => {
          db.quyTac[kQt] = { maDoiTac, maHang, tkNo, tkCo, tkThue };
          if (inp.dataset.misaTruong === 'maDoiTac' && kDt) {
            db.doiTac[kDt] = { ...(db.doiTac[kDt] || {}), maDoiTac };
          }
        });

        // Đồng bộ Mã đối tượng cho các dòng khác cùng đối tác
        if (inp.dataset.misaTruong === 'maDoiTac' && kDt) {
          dlg.querySelectorAll(`#misaBangBody tr[data-kdt="${CSS.escape(kDt)}"] input[data-misa-truong="maDoiTac"]`).forEach(el => {
            if (el !== inp) el.value = maDoiTac;
          });
        }

        const huy = tr.querySelector('.misa-nho-nhan');
        if (huy) { huy.textContent = 'Đã nhớ'; huy.className = 'misa-nho-nhan da-nho'; }
        capNhatDemNhoMisa();
      });

      dlg.querySelector('#btnMisaXoaNho').onclick = () => {
        if (!_stateMisa.mst) return;
        if (!confirm(`Xoá toàn bộ quy tắc định khoản đã nhớ của MST ${_stateMisa.mst} để quay về gợi ý mặc định?`)) return;
        const tienTo = _stateMisa.mst + '|';
        ghiBoNhoDk(db => {
          for (const k of Object.keys(db.quyTac)) if (k.startsWith(tienTo)) delete db.quyTac[k];
          for (const k of Object.keys(db.doiTac)) if (k.startsWith(tienTo)) delete db.doiTac[k];
        });
        veLaiHopThoaiMisa(false);
      };

      dlg.querySelector('#btnMisaXuat').onclick = async () => {
        const { sheets, thongKe } = taoSheetsMisa(_stateMisa.docs, _stateMisa.mst, _stateMisa.ky);
        if (!thongKe.dongMua && !thongKe.dongBan) {
          alert('Không có hoá đơn mua vào hoặc bán ra nào trong kỳ đang chọn để xuất MISA.');
          return;
        }
        if (window.xuatBangTuy) {
          const tenKy = _stateMisa.ky ? '_' + _stateMisa.ky : '';
          await window.xuatBangTuy(`MISA_${thongKe.mst}${tenKy}`, sheets);
        }
      };
    }
    return dlg;
  }

  function locDongBangMisa() {
    const dlg = document.getElementById('dlgMisa');
    if (!dlg) return;
    const q = _stateMisa.tim;
    dlg.querySelectorAll('#misaBangBody tr[data-tim]').forEach(tr => {
      tr.hidden = !!q && !tr.dataset.tim.includes(q);
    });
  }

  function capNhatDemNhoMisa() {
    const el = document.getElementById('misaSoDaNho');
    if (!el || !_stateMisa.mst) return;
    const db = docBoNhoDk();
    el.textContent = so(Object.keys(db.quyTac).filter(k => k.startsWith(_stateMisa.mst + '|')).length);
  }

  function veLaiHopThoaiMisa(capNhatDsKy) {
    const dlg = damBaoHopThoaiMisa();
    const selKy = dlg.querySelector('#misaKy');
    if (capNhatDsKy) {
      const dsKy = danhSachKyMisa(_stateMisa.docs, _stateMisa.mst);
      selKy.innerHTML = `<option value="">Tất cả các kỳ (${dsKy.filter(x => x.k.includes('-M')).length} tháng)</option>`
        + dsKy.map(x => `<option value="${esc(x.k)}"${x.k === _stateMisa.ky ? ' selected' : ''}>${esc(x.nhan)}</option>`).join('');
    }

    const dl = thuThapDuLieuMisa(_stateMisa.docs, _stateMisa.mst, _stateMisa.ky);
    dlg.querySelector('#misaCheDo').value = dl.cheDo;
    dlg.querySelector('#misaTomTat').innerHTML = `
      <span>Tổng hợp: <b>${so(dl.mua.length)}</b> HĐ mua vào (${so(dl.dongMua.length)} dòng) · <b>${so(dl.ban.length)}</b> HĐ bán ra (${so(dl.dongBan.length)} dòng) · Gom thành <b>${so(dl.nhom.length)}</b> nhóm định khoản</span>
      <span>Bộ nhớ máy tính: đã thuộc <b id="misaSoDaNho">${so(dl.soDaNho)}</b> quy tắc định khoản của MST ${esc(dl.mst)}</span>
    `;

    const body = dlg.querySelector('#misaBangBody');
    if (!dl.nhom.length) {
      body.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--muted);padding:20px">Chưa có hoá đơn mua vào / bán ra nào của đơn vị trong kỳ đang chọn.</td></tr>`;
      return;
    }

    body.innerHTML = dl.nhom.map(g => {
      const chuoiTim = `${g.chieu} ${g.tenDoiTac} ${g.mstDoiTac} ${g.maDoiTac} ${g.tenHang} ${g.maHang} ${g.tkNo} ${g.tkCo}`.toLowerCase();
      const ttDoiTac = `${g.tenDoiTac} (${g.mstDoiTac || 'Không MST'} · ${g.soDong} dòng)`;
      return `<tr data-kqt="${esc(g.kQt)}" data-kdt="${esc(g.kDt)}" data-tim="${esc(chuoiTim)}">
        <td style="white-space:nowrap"><span class="tag-pl ${g.chieu}">${g.chieu === 'ban' ? 'BÁN RA' : 'MUA VÀO'}</span></td>
        <td><div class="misa-dt-ten" title="${esc(ttDoiTac)}">${esc(g.tenDoiTac)}<span class="misa-phu">(${esc(g.mstDoiTac || '—')} · ${g.soDong})</span></div></td>
        <td><input type="text" class="misa-o misa-ma" data-misa-truong="maDoiTac" value="${esc(g.maDoiTac)}"></td>
        <td><div class="misa-mh-ten" title="${esc(g.tenHang)}">${esc(g.tenHang)}</div></td>
        <td><input type="text" class="misa-o misa-ma" data-misa-truong="maHang" value="${esc(g.maHang)}"></td>
        <td><input type="text" class="misa-o misa-tk" data-misa-truong="tkNo" value="${esc(g.tkNo)}"></td>
        <td><input type="text" class="misa-o misa-tk" data-misa-truong="tkCo" value="${esc(g.tkCo)}"></td>
        <td><input type="text" class="misa-o misa-tk" data-misa-truong="tkThue" value="${esc(g.tkThue)}"></td>
        <td style="text-align:right;font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap">${so(g.tongTien)}</td>
        <td><span class="misa-nho-nhan ${g.daNho ? 'da-nho' : 'goi-y'}">${g.daNho ? 'Đã nhớ' : 'Tự gợi ý'}</span></td>
      </tr>`;
    }).join('');
    locDongBangMisa();
  }

  function moHopThoaiMisa(docs, mstPreset, kyPreset) {
    const valid = (docs || []).filter(d => d && !d.error && d.kind === 'hd');
    if (!valid.length) {
      alert('Chưa có hoá đơn điện tử nào đang mở. Hãy nạp tệp XML/ZIP hoặc mở từ Kho hoá đơn trước khi xuất MISA!');
      return;
    }
    const dsCty = (window.DASHBOARD_KE_TOAN && window.DASHBOARD_KE_TOAN.dsCongTy)
      ? window.DASHBOARD_KE_TOAN.dsCongTy(docs, mstPreset)
      : [];
    if (!dsCty.length) {
      alert('Chưa xác định được MST công ty để phân loại Mua vào / Bán ra.');
      return;
    }

    _stateMisa.docs = docs;
    _stateMisa.mst = dsCty.some(c => c.mst === sachMst(mstPreset)) ? sachMst(mstPreset) : dsCty[0].mst;
    _stateMisa.ky = kyPreset || '';
    _stateMisa.tim = '';

    const dlg = damBaoHopThoaiMisa();
    dlg.querySelector('#misaTim').value = '';
    dlg.querySelector('#misaMst').innerHTML = dsCty.map(c =>
      `<option value="${esc(c.mst)}"${c.mst === _stateMisa.mst ? ' selected' : ''}>${esc(c.mst)} — ${esc(c.ten || 'Đơn vị kê khai')}</option>`
    ).join('');

    veLaiHopThoaiMisa(true);
    if (!dlg.open) dlg.showModal();
  }

  window.KIEM_TOAN_MISA = {
    tachNgayKy,
    nguongKhongTienMat,
    kiemToanHoaDon,
    danhDauRuiRo,
    veKhoiKiemToan,
    xuatKiemToanExcel,
    docBoNhoDk,
    thuThapDuLieuMisa,
    taoSheetsMisa,
    moHopThoaiMisa
  };
})();
