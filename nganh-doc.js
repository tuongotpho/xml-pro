// nganh-doc.js — Bộ phân tích và hiển thị chuyên biệt cho:
// 1. Tờ khai Hải quan & Xuất nhập khẩu (VNACCS / Cổng Một cửa Quốc gia NSW)
// 2. Bệnh án điện tử & Hồ sơ giám định BHYT (XML 4210 / QĐ 130 / BV)
(() => {
  'use strict';

  const esc = s => String(s ?? '').replace(/[&<>"\']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = s => {
    if (s === '' || s == null) return null;
    const v = Number(String(s).replace(/,/g, ''));
    return Number.isFinite(v) ? v : null;
  };
  const nf = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 });
  const money = v => v == null ? '' : nf.format(v);
  const dateVN = s => {
    if (!s) return '';
    const m = /^(\d{4})[-/]?(\d{2})[-/]?(\d{2})/.exec(s);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    const m2 = /^(\d{2})(\d{2})(\d{4})/.exec(s); // ddmmyyyy
    if (m2) return `${m2[1]}/${m2[2]}/${m2[3]}`;
    return s;
  };
  const dateTimeVN = s => {
    if (!s) return '';
    let m = /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/.exec(s);
    if (m) return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`;
    return dateVN(s);
  };

  const deep = (el, name) => el ? Array.from(el.getElementsByTagNameNS('*', name)) : [];
  const deepTxt = (el, ...names) => {
    for (const n of names) {
      const match = deep(el, n)[0];
      if (match && match.textContent.trim()) return match.textContent.trim();
    }
    return '';
  };

  // =========================================================================
  // 1. HẢI QUAN & XUẤT NHẬP KHẨU (CUSTOMS)
  // =========================================================================

  const LUONG_MAP = {
    '1': { code: '1', name: 'LUỒNG XANH', desc: 'Miễn kiểm tra chi tiết hồ sơ và miễn kiểm tra thực tế hàng hóa', cls: 'xanh' },
    '2': { code: '2', name: 'LUỒNG VÀNG', desc: 'Kiểm tra chi tiết hồ sơ chứng từ, miễn kiểm tra thực tế hàng hóa', cls: 'vang' },
    '3': { code: '3', name: 'LUỒNG ĐỎ', desc: 'Kiểm tra chi tiết hồ sơ và kiểm tra thực tế hàng hóa', cls: 'do' }
  };

  const LOAI_HINH_MAP = {
    'A11': 'Nhập kinh doanh tiêu dùng',
    'A12': 'Nhập kinh doanh sản xuất',
    'A21': 'Chuyển tiêu thụ nội địa từ nguồn tạm nhập',
    'A31': 'Nhập khẩu hàng xuất khẩu bị trả lại',
    'A41': 'Nhập kinh doanh của doanh nghiệp đầu tư',
    'B11': 'Xuất kinh doanh',
    'B12': 'Xuất sau khi đã tạm xuất',
    'B13': 'Xuất khẩu hàng đã nhập khẩu',
    'E11': 'Nhập nguyên liệu gia công cho thương nhân nước ngoài',
    'E15': 'Xuất khẩu sản phẩm gia công ngoại tỉnh',
    'E21': 'Xuất sản phẩm gia công cho thương nhân nước ngoài',
    'E31': 'Nhập nguyên liệu sản xuất xuất khẩu (SXXK)',
    'E42': 'Xuất khẩu sản phẩm của DNCX',
    'E52': 'Xuất sản phẩm SXXK',
    'E62': 'Xuất sản phẩm SXXK ra nước ngoài',
    'G11': 'Tạm nhập tái xuất kinh doanh',
    'G21': 'Tái xuất hàng tạm nhập kinh doanh'
  };

  function isCustomsXml(root) {
    const r = (root.localName || '').toUpperCase();
    if (r === 'TOKHAI_OBJ' || r === 'TOKHAISUA_OBJ' || r === 'CUSTOMS_DECLARATION' || r === 'DECLARATION' || r === 'CUSTOMSDECLARATION' || r === 'TKHAIHQ' || r === 'TOKHAIHAIQUAN') return true;
    if (deep(root, 'DeclarationNumber').length || deep(root, 'soTKhai').length || deep(root, 'maTBaoHquan').length || deep(root, 'DeclarationKindCode').length) return true;
    return false;
  }

  function parseCustoms(root, fileName, readSignatures) {
    const soTKhai = deepTxt(root, 'soTKhai', 'DeclarationNumber', 'customsDeclarationNo', 'soToKhai', 'Reference');
    const ngayDky = deepTxt(root, 'ngayDky', 'DeclarationDate', 'registrationDate', 'ngayDangKy', 'IssueDate');
    const maLH = deepTxt(root, 'maLHinh', 'NatureOfTransaction', 'DeclarationKindCode', 'maLoaiHinh', 'loaiHinh');
    const tenLH = LOAI_HINH_MAP[maLH] || deepTxt(root, 'tenLoaiHinh', 'DeclarationKindName');
    
    let rawLuong = deepTxt(root, 'phanLuong', 'ClearanceStatus', 'ClassificationCheckCode', 'luong');
    if (/xanh/i.test(rawLuong)) rawLuong = '1';
    else if (/v[aà]ng/i.test(rawLuong)) rawLuong = '2';
    else if (/[đd][oỏ]/i.test(rawLuong)) rawLuong = '3';
    const luong = LUONG_MAP[rawLuong] || { code: rawLuong || '1', name: `LUỒNG ${rawLuong || 'XANH'}`, desc: '', cls: rawLuong === '3' ? 'do' : rawLuong === '2' ? 'vang' : 'xanh' };

    const cucHQ = deepTxt(root, 'tenCucHQ', 'maCucHQ', 'CustomsOffice', 'coQuanHaiQuan', 'CucHaiQuan');
    const chiCucHQ = deepTxt(root, 'tenChiCucHQ', 'maChiCucHQ', 'SubCustomsOffice', 'chiCuc', 'ChiCucHaiQuan');

    // Người xuất khẩu
    const xk = {
      ten: deepTxt(root, 'tenNguoiXK', 'ExporterName', 'tenDviXuat', 'Exporter'),
      mst: deepTxt(root, 'mstNguoiXK', 'ExporterTaxCode', 'mstDviXuat'),
      diaChi: deepTxt(root, 'diaChiNguoiXK', 'ExporterAddress', 'diaChiDviXuat'),
      nuoc: deepTxt(root, 'nuocXK', 'ExporterCountryCode', 'nuocXuatKhau')
    };

    // Người nhập khẩu
    const nk = {
      ten: deepTxt(root, 'tenNguoiNK', 'ImporterName', 'tenDviNhap', 'Importer'),
      mst: deepTxt(root, 'mstNguoiNK', 'ImporterTaxCode', 'mstDviNhap'),
      diaChi: deepTxt(root, 'diaChiNguoiNK', 'ImporterAddress', 'diaChiDviNhap'),
      nuoc: deepTxt(root, 'nuocNK', 'ImporterCountryCode', 'nuocNhapKhau')
    };

    // Vận chuyển & Hóa đơn
    const vanChuyen = {
      vanDon: deepTxt(root, 'soVanDon', 'BillOfLadingNumber', 'HouseBL', 'AWB'),
      phuongTien: deepTxt(root, 'tenPhuongTien', 'TransportMeans', 'VesselName', 'tenTau'),
      cangBoc: deepTxt(root, 'cangBocHang', 'LoadingPort', 'DeparturePort', 'cangXepHang'),
      cangDo: deepTxt(root, 'cangDoHang', 'DischargePort', 'DestinationPort'),
      ngayDen: deepTxt(root, 'ngayHangDen', 'ArrivalDate', 'ngayDen'),
      diaDiemLuuKho: deepTxt(root, 'diaDiemLuuKho', 'WarehouseCode', 'CustomsWarehouse')
    };

    const hoaDon = {
      soHD: deepTxt(root, 'soHDTM', 'CommercialInvoiceNo', 'InvoiceNumber', 'soHoaDon'),
      ngayHD: deepTxt(root, 'ngayHDTM', 'InvoiceDate', 'ngayHoaDon'),
      triGia: num(deepTxt(root, 'tongTriGiaHD', 'TotalInvoiceAmount', 'tongTriGia', 'InvoiceAmount')),
      dongTien: deepTxt(root, 'dongTienHD', 'CurrencyCode', 'dvtTienTe', 'Currency') || 'USD',
      dieuKien: deepTxt(root, 'dieuKienGiaoHang', 'IncotermsCode', 'dieuKien', 'DeliveryTerms')
    };

    // Danh sách dòng hàng
    let itemNodes = deep(root, 'DeclarationItem');
    if (!itemNodes.length) itemNodes = deep(root, 'HangHoa');
    if (!itemNodes.length) itemNodes = deep(root, 'Commodity');
    if (!itemNodes.length) itemNodes = deep(root, 'Hang');

    const hangHoa = itemNodes.map((el, idx) => {
      const stt = deepTxt(el, 'stt', 'ItemNumber', 'LineNumber') || (idx + 1);
      const maHS = deepTxt(el, 'maHS', 'TariffClassificationCode', 'HSCode', 'maHang');
      const ten = deepTxt(el, 'tenHang', 'GoodsDescription', 'CommodityName', 'moTaHangHoa');
      const xuatXu = deepTxt(el, 'nuocXX', 'OriginCountryCode', 'Origin', 'xuatXu');
      const sl = num(deepTxt(el, 'soLuong', 'Quantity', 'GrossWeight', 'sl'));
      const dvt = deepTxt(el, 'dvt', 'UnitOfMeasure', 'QuantityUnit', 'donViTinh');
      const dg = num(deepTxt(el, 'donGia', 'UnitPrice', 'donGiaNT'));
      const triGia = num(deepTxt(el, 'triGiaKB', 'ItemAmount', 'InvoiceAmount', 'triGia'));
      const triGiaTinhThue = num(deepTxt(el, 'triGiaTinhThue', 'CustomsValue', 'triGiaTT'));
      const tsXNK = deepTxt(el, 'thueSuatXNK', 'DutyRate', 'tsXNK');
      const thueXNK = num(deepTxt(el, 'tienThueXNK', 'DutyAmount', 'thueXNK'));
      const tsGTGT = deepTxt(el, 'thueSuatGTGT', 'VatRate', 'tsGTGT');
      const thueGTGT = num(deepTxt(el, 'tienThueGTGT', 'VatAmount', 'thueGTGT'));
      return { stt, maHS, ten, xuatXu, sl, dvt, dg, triGia, triGiaTinhThue, tsXNK, thueXNK, tsGTGT, thueGTGT };
    });

    const tongThueXNK = hangHoa.reduce((s, h) => s + (h.thueXNK || 0), 0) || num(deepTxt(root, 'tongThueXNK', 'TotalDutyAmount'));
    const tongThueGTGT = hangHoa.reduce((s, h) => s + (h.thueGTGT || 0), 0) || num(deepTxt(root, 'tongThueGTGT', 'TotalVatAmount'));
    const tongTienThue = (tongThueXNK || 0) + (tongThueGTGT || 0);

    return {
      kind: 'hq',
      fileName,
      title: `Tờ khai Hải quan ${soTKhai || ''}`,
      sub: maLH ? `Loại hình: ${maLH}${tenLH ? ' - ' + tenLH : ''}` : 'Tờ khai hàng hóa xuất nhập khẩu',
      soTKhai,
      ngayDky,
      ngay: ngayDky,
      maLH,
      tenLH,
      luong,
      cucHQ,
      chiCucHQ,
      xk,
      nk,
      vanChuyen,
      hoaDon,
      hangHoa,
      tongThueXNK,
      tongThueGTGT,
      tongTienThue,
      mst: nk.mst || xk.mst || '',
      ten: nk.ten || xk.ten || '',
      ky: dateVN(ngayDky),
      sigs: readSignatures(root),
      info: [
        ['Số tờ khai', soTKhai],
        ['Ngày đăng ký', dateTimeVN(ngayDky)],
        ['Phân luồng', `${luong.name} (${luong.desc})`],
        ['Loại hình XNK', `${maLH} - ${tenLH}`],
        ['Cơ quan Hải quan', [chiCucHQ, cucHQ].filter(Boolean).join(' / ')],
        ['Vận đơn (B/L)', vanChuyen.vanDon],
        ['Hóa đơn thương mại', `${hoaDon.soHD || ''} (${hoaDon.triGia ? money(hoaDon.triGia) + ' ' + hoaDon.dongTien : ''})`]
      ]
    };
  }

  function renderCustoms(d) {
    const l = d.luong || LUONG_MAP['1'];
    return `
      <div class="top-strip">
        <div class="note ok">✔ Tờ khai Hải quan điện tử (VNACCS / NSW) · <span style="color:var(--muted)">Nguồn: ${esc(d.source)}</span></div>
        <div style="display:flex;gap:8px">
          <button type="button" class="btn-xuat-excel" style="background:#15803d;color:#fff;border-color:#15803d;font-weight:600">📊 Xuất Excel</button>
          <button class="primary" id="printBtn">In / Lưu PDF</button>
        </div>
      </div>
      <div class="paper hq-paper">
        <div class="hq-head">
          <div class="hq-brand">
            <h3>TỔNG CỤC HẢI QUAN</h3>
            <div>${esc(d.cucHQ || 'Cục Hải quan')}</div>
            <div><b>${esc(d.chiCucHQ || 'Chi cục Hải quan')}</b></div>
          </div>
          <div class="hq-title-box">
            <h2>TỜ KHAI HÀNG HÓA XUẤT NHẬP KHẨU</h2>
            <div class="sub">(Bản thể hiện thông điệp điện tử VNACCS/VCIS)</div>
            <div class="hq-luong-badge ${l.cls}">
              <span class="badge-dot">●</span> <b>${esc(l.name)}</b>
              <small>${esc(l.desc)}</small>
            </div>
          </div>
          <div class="hq-meta">
            <div>Số tờ khai: <b>${esc(d.soTKhai || 'Chưa cấp')}</b></div>
            <div>Ngày ĐK: <b>${esc(dateTimeVN(d.ngayDky))}</b></div>
            <div>Mã loại hình: <b>${esc(d.maLH || '')}</b> (${esc(d.tenLH || '')})</div>
          </div>
        </div>

        <div class="hq-parties">
          <div class="hq-party-box">
            <h4>1. Người xuất khẩu (Exporter)</h4>
            <div><b>${esc(d.xk?.ten || '---')}</b></div>
            <div>Mã số / MST: <b>${esc(d.xk?.mst || '---')}</b></div>
            <div>Địa chỉ: ${esc(d.xk?.diaChi || '---')}</div>
            <div>Quốc gia: <b>${esc(d.xk?.nuoc || '')}</b></div>
          </div>
          <div class="hq-party-box">
            <h4>2. Người nhập khẩu (Importer)</h4>
            <div><b>${esc(d.nk?.ten || '---')}</b></div>
            <div>Mã số / MST: <b>${esc(d.nk?.mst || '---')}</b></div>
            <div>Địa chỉ: ${esc(d.nk?.diaChi || '---')}</div>
            <div>Quốc gia: <b>${esc(d.nk?.nuoc || '')}</b></div>
          </div>
        </div>

        <div class="hq-section">
          <h4>3. Thông tin vận tải & Hóa đơn thương mại</h4>
          <div class="hq-grid-4">
            <div><span>Số vận đơn (B/L / AWB):</span> <b>${esc(d.vanChuyen?.vanDon || '---')}</b></div>
            <div><span>Phương tiện vận chuyển:</span> <b>${esc(d.vanChuyen?.phuongTien || '---')}</b></div>
            <div><span>Cảng xếp (bốc) hàng:</span> <b>${esc(d.vanChuyen?.cangBoc || '---')}</b></div>
            <div><span>Cảng dỡ hàng:</span> <b>${esc(d.vanChuyen?.cangDo || '---')}</b></div>
            <div><span>Số hóa đơn TM:</span> <b>${esc(d.hoaDon?.soHD || '---')}</b></div>
            <div><span>Ngày hóa đơn:</span> <b>${esc(dateVN(d.hoaDon?.ngayHD) || '---')}</b></div>
            <div><span>Điều kiện giao hàng:</span> <b>${esc(d.hoaDon?.dieuKien || '---')}</b></div>
            <div><span>Tổng trị giá hóa đơn:</span> <b>${d.hoaDon?.triGia ? money(d.hoaDon.triGia) + ' ' + esc(d.hoaDon.dongTien) : '---'}</b></div>
          </div>
        </div>

        <div class="hq-section">
          <h4>4. Danh mục hàng hóa xuất nhập khẩu (${(d.hangHoa || []).length} mặt hàng)</h4>
          <table class="lines hq-lines">
            <tr>
              <th style="width:36px">STT</th>
              <th style="width:90px">Mã HS</th>
              <th>Mô tả hàng hóa</th>
              <th style="width:60px">Xuất xứ</th>
              <th style="width:55px">ĐVT</th>
              <th style="width:75px">Số lượng</th>
              <th style="width:85px">Đơn giá</th>
              <th style="width:105px">Trị giá tính thuế</th>
              <th style="width:65px">Thuế XNK</th>
              <th style="width:65px">Thuế GTGT</th>
            </tr>
            ${(d.hangHoa && d.hangHoa.length) ? d.hangHoa.map(h => `
              <tr>
                <td class="c">${esc(h.stt)}</td>
                <td class="c"><b>${esc(h.maHS)}</b></td>
                <td><b>${esc(h.ten)}</b></td>
                <td class="c">${esc(h.xuatXu)}</td>
                <td class="c">${esc(h.dvt)}</td>
                <td class="n">${money(h.sl)}</td>
                <td class="n">${money(h.dg)}</td>
                <td class="n"><b>${money(h.triGiaTinhThue || h.triGia)}</b></td>
                <td class="c">${h.thueXNK ? money(h.thueXNK) : esc(h.tsXNK || '0%')}</td>
                <td class="c">${h.thueGTGT ? money(h.thueGTGT) : esc(h.tsGTGT || '0%')}</td>
              </tr>
            `).join('') : '<tr><td colspan="10" class="c"><i>Không có thông tin chi tiết dòng hàng</i></td></tr>'}
            ${d.tongTienThue ? `
              <tr class="sum-row"><td colspan="8" class="n">Tổng tiền thuế XNK:</td><td colspan="2" class="n"><b>${money(d.tongThueXNK)} VNĐ</b></td></tr>
              <tr class="sum-row"><td colspan="8" class="n">Tổng tiền thuế GTGT:</td><td colspan="2" class="n"><b>${money(d.tongThueGTGT)} VNĐ</b></td></tr>
              <tr class="sum-grand"><td colspan="8" class="n">TỔNG CỘNG TIỀN THUẾ PHẢI NỘP:</td><td colspan="2" class="n"><b>${money(d.tongTienThue)} VNĐ</b></td></tr>
            ` : ''}
          </table>
        </div>

        <div class="hd-sigs c2" style="margin-top:20px">
          <div>
            <h4>Người khai hải quan / Doanh nghiệp</h4>
            <div class="role-sub">(Chữ ký điện tử, ký số nếu có)</div>
            ${d.sigs && d.sigs.length ? `
              <div class="sig-stamp">
                <div class="stamp-box">
                  <div class="s-title">✔ KÝ ĐIỆN TỬ HẢI QUAN</div>
                  <div class="s-signer">Ký bởi: <b>${esc(d.sigs[0].nguoiKy)}</b></div>
                  <div class="s-time">Thời điểm: ${esc(dateTimeVN(d.sigs[0].ngayKy))}</div>
                </div>
              </div>
            ` : '<div style="color:var(--muted);font-style:italic">Không có chữ ký số điện tử</div>'}
          </div>
          <div>
            <h4>Cơ quan Hải quan tiếp nhận</h4>
            <div class="role-sub">(Xác nhận thông quan điện tử)</div>
            <div class="sig-stamp">
              <div class="stamp-box" style="border-color:#0284c7">
                <div class="s-title" style="color:#0284c7">✔ HỆ THỐNG VNACCS/VCIS</div>
                <div class="s-signer">Cơ quan: <b>${esc(d.chiCucHQ || 'Cơ quan Hải quan')}</b></div>
                <div class="s-time">Trạng thái: <b>ĐÃ TIẾP NHẬN & PHÂN LUỒNG</b></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="copyright">(C) August87 - 0982722036</div>
    `;
  }

  // =========================================================================
  // 2. Y TẾ & GIÁM ĐỊNH BHYT (HEALTHCARE - XML 4210 / QĐ 130 / BV)
  // =========================================================================

  const KET_QUA_DT_MAP = {
    '1': 'Khỏi',
    '2': 'Đỡ / Giảm',
    '3': 'Không thay đổi',
    '4': 'Nặng hơn',
    '5': 'Tử vong'
  };

  const LOAI_KCB_MAP = {
    '1': 'Khám bệnh',
    '2': 'Điều trị ngoại trú',
    '3': 'Điều trị nội trú',
    '4': 'Điều trị ban ngày'
  };

  function isHealthcareXml(root) {
    const r = (root.localName || '').toUpperCase();
    if (r === 'GIAMDINHHS' || r === 'HOSOCHITIET' || r === 'HSBA' || r === 'TONG_HOP' || r === 'DSACH_CHI_TIET_THUOC' || r === 'CHITIET_DVKT' || r === 'BENH_AN' || r === 'EMR') return true;
    if (deep(root, 'MA_THE').length || deep(root, 'MA_CSKCB').length || deep(root, 'MA_LOAI_KCB').length || deep(root, 'T_TONGCHI').length || deep(root, 'CHI_TIET_THUOC').length) return true;
    return false;
  }

  function parseHealthcare(root, fileName, readSignatures) {
    // Thông tin hành chính bệnh nhân (Bảng 1 - TONG_HOP)
    const maBN = deepTxt(root, 'MA_BN', 'MA_BENH_NHAN', 'PatientID');
    const hoTen = deepTxt(root, 'HO_TEN', 'TEN_BENH_NHAN', 'PatientName', 'HoTen');
    const ngaySinh = deepTxt(root, 'NGAY_SINH', 'DOB', 'NgaySinh');
    const rawGt = deepTxt(root, 'GIOI_TINH', 'Gender', 'GioiTinh');
    const gioiTinh = rawGt === '1' ? 'Nam' : rawGt === '2' ? 'Nữ' : rawGt;
    const diaChi = deepTxt(root, 'DIA_CHI', 'Address', 'DiaChi');
    const maThe = deepTxt(root, 'MA_THE', 'MA_THE_BHYT', 'HealthInsuranceNo', 'SoTheBHYT');
    const maDKBD = deepTxt(root, 'MA_DKBD', 'NoiKCBBD', 'HospitalCode');
    const gtTheTu = deepTxt(root, 'GT_THE_TU', 'ValidFrom');
    const gtTheDen = deepTxt(root, 'GT_THE_DEN', 'ValidTo');

    // Quá trình khám chữa bệnh
    const maCSKCB = deepTxt(root, 'MA_CSKCB', 'HospitalCode');
    const tenCSKCB = deepTxt(root, 'TEN_CSKCB', 'HospitalName', 'TenBV') || 'Cơ sở khám chữa bệnh';
    const ngayVao = deepTxt(root, 'NGAY_VAO', 'AdmissionDate', 'NgayVao');
    const ngayRa = deepTxt(root, 'NGAY_RA', 'DischargeDate', 'NgayRa');
    const soNgayDt = num(deepTxt(root, 'SO_NGAY_DTRI', 'TreatmentDays', 'SoNgay'));
    const maLoaiKCB = deepTxt(root, 'MA_LOAI_KCB', 'LoaiKCB');
    const tenLoaiKCB = LOAI_KCB_MAP[maLoaiKCB] || maLoaiKCB || 'Khám chữa bệnh BHYT';
    const maBenh = deepTxt(root, 'MA_BENH', 'ICD10Code', 'MaBenhChinh');
    const tenBenh = deepTxt(root, 'TEN_BENH', 'DiseaseName', 'ChanDoan', 'TenBenhChinh');
    const maBenhKem = deepTxt(root, 'MA_BENHKEM', 'SecondaryICD10', 'MaBenhKem');
    const rawKq = deepTxt(root, 'KET_QUA_DTRI', 'KetQuaDieuTri');
    const ketQua = KET_QUA_DT_MAP[rawKq] || rawKq || 'Đỡ';

    // Tổng hợp chi phí viện phí
    const tongChi = num(deepTxt(root, 'T_TONGCHI', 'TotalCost', 'TongChiPhi'));
    const bhytChi = num(deepTxt(root, 'T_BHTT', 'InsurancePaid', 'BHYTThanhToan'));
    const cungChiTra = num(deepTxt(root, 'T_BNCCT', 'CoPayment', 'NguoiBenhCungChiTra'));
    const tuTra = num(deepTxt(root, 'T_BNTT', 'PatientSelfPaid', 'NguoiBenhTuTra'));
    const nguonKhac = num(deepTxt(root, 'T_NGUONKHAC', 'OtherSource'));

    const chiTietNhom = {
      kham: num(deepTxt(root, 'T_KHAM')),
      thuoc: num(deepTxt(root, 'T_THUOC')),
      mau: num(deepTxt(root, 'T_MAU')),
      pttt: num(deepTxt(root, 'T_PTTT')),
      vtyt: num(deepTxt(root, 'T_VTYT')),
      dvkt: num(deepTxt(root, 'T_DVKT_TYLE')),
      thuocTyle: num(deepTxt(root, 'T_THUOC_TYLE')),
      vtytTyle: num(deepTxt(root, 'T_VTYT_TYLE')),
      giuong: num(deepTxt(root, 'T_GIUONG')),
      vanChuyen: num(deepTxt(root, 'T_VANCHUYEN'))
    };

    // Bảng chi tiết thuốc (Bảng 2)
    let thuocNodes = deep(root, 'CHI_TIET_THUOC');
    if (!thuocNodes.length) thuocNodes = deep(root, 'Thuoc');
    const dsThuoc = thuocNodes.map((el, i) => ({
      stt: i + 1,
      ma: deepTxt(el, 'MA_THUOC', 'MaThuoc'),
      ten: deepTxt(el, 'TEN_THUOC', 'TenThuoc'),
      hamLuong: deepTxt(el, 'HAM_LUONG', 'HamLuong'),
      dvt: deepTxt(el, 'DON_VI_TINH', 'DVT'),
      sl: num(deepTxt(el, 'SO_LUONG', 'SoLuong')),
      dg: num(deepTxt(el, 'DON_GIA', 'DonGia')),
      tien: num(deepTxt(el, 'THANH_TIEN', 'ThanhTien')),
      tienBHYT: num(deepTxt(el, 'T_BHTT', 'TienBHYT')),
      tyLe: deepTxt(el, 'TYLE_TT', 'TyLe')
    }));

    // Bảng chi tiết dịch vụ kỹ thuật (Bảng 3)
    let dvktNodes = deep(root, 'CHI_TIET_DVKT');
    if (!dvktNodes.length) dvktNodes = deep(root, 'DVKT');
    const dsDVKT = dvktNodes.map((el, i) => ({
      stt: i + 1,
      ma: deepTxt(el, 'MA_DICH_VU', 'MaDV'),
      ten: deepTxt(el, 'TEN_DICH_VU', 'TenDV'),
      dvt: deepTxt(el, 'DON_VI_TINH', 'DVT'),
      sl: num(deepTxt(el, 'SO_LUONG', 'SoLuong')),
      dg: num(deepTxt(el, 'DON_GIA', 'DonGia')),
      tien: num(deepTxt(el, 'THANH_TIEN', 'ThanhTien')),
      tienBHYT: num(deepTxt(el, 'T_BHTT', 'TienBHYT'))
    }));

    return {
      kind: 'yte',
      fileName,
      title: `Hồ sơ KCB: ${hoTen || 'Bệnh nhân'} (${maBN || ''})`,
      sub: `${tenLoaiKCB} · Mã thẻ BHYT: ${maThe || 'Không thẻ'}`,
      maBN,
      hoTen,
      ngaySinh,
      gioiTinh,
      diaChi,
      maThe,
      maDKBD,
      gtTheTu,
      gtTheDen,
      maCSKCB,
      tenCSKCB,
      ngayVao,
      ngayRa,
      ngay: ngayRa || ngayVao,
      soNgayDt,
      maLoaiKCB,
      tenLoaiKCB,
      maBenh,
      tenBenh,
      maBenhKem,
      ketQua,
      tongChi,
      bhytChi,
      cungChiTra,
      tuTra,
      nguonKhac,
      chiTietNhom,
      dsThuoc,
      dsDVKT,
      mst: maThe || maBN || '',
      ten: hoTen || '',
      ky: dateVN(ngayRa || ngayVao),
      sigs: readSignatures(root),
      info: [
        ['Họ tên bệnh nhân', hoTen],
        ['Mã bệnh nhân (ID)', maBN],
        ['Mã thẻ BHYT', maThe],
        ['Thời hạn thẻ', gtTheTu ? `${dateVN(gtTheTu)} đến ${dateVN(gtTheDen)}` : '---'],
        ['Cơ sở khám chữa bệnh', `${maCSKCB} - ${tenCSKCB}`],
        ['Thời gian KCB', `${dateTimeVN(ngayVao)} → ${dateTimeVN(ngayRa)} (${soNgayDt || 1} ngày)`],
        ['Chẩn đoán bệnh (ICD-10)', `[${maBenh}] ${tenBenh}${maBenhKem ? ` (Kèm: ${maBenhKem})` : ''}`],
        ['Tổng chi phí KCB', money(tongChi) + ' VNĐ (BHYT trả: ' + money(bhytChi) + ' VNĐ)']
      ]
    };
  }

  function renderHealthcare(d) {
    return `
      <div class="top-strip">
        <div class="note ok">✔ Hồ sơ viện phí & Giám định BHYT (XML 4210 / QĐ 130) · <span style="color:var(--muted)">Nguồn: ${esc(d.source)}</span></div>
        <div style="display:flex;gap:8px">
          <button type="button" class="btn-xuat-excel" style="background:#15803d;color:#fff;border-color:#15803d;font-weight:600">📊 Xuất Excel</button>
          <button class="primary" id="printBtn">In / Lưu PDF</button>
        </div>
      </div>
      <div class="paper yte-paper">
        <div class="yte-head">
          <div class="yte-brand">
            <h3>BỘ Y TẾ / BẢO HIỂM XÃ HỘI VIỆT NAM</h3>
            <div>Cơ sở KCB: <b>${esc(d.tenCSKCB)}</b></div>
            <div>Mã CSKCB: <b>${esc(d.maCSKCB || '---')}</b></div>
          </div>
          <div class="yte-title-box">
            <h2>BẢNG KÊ CHI PHÍ KHÁM BỆNH, CHỮA BỆNH BHYT</h2>
            <div class="sub">(Mẫu chuẩn XML 4210 / Quyết định 130/QĐ-BYT)</div>
            <div class="yte-badge">Hình thức: <b>${esc(d.tenLoaiKCB)}</b></div>
          </div>
          <div class="yte-meta">
            <div>Mã bệnh nhân: <b>${esc(d.maBN || '---')}</b></div>
            <div>Kết quả điều trị: <b>${esc(d.ketQua)}</b></div>
            <div>Số ngày ĐT: <b>${esc(d.soNgayDt || 1)} ngày</b></div>
          </div>
        </div>

        <div class="yte-section">
          <h4>I. THÔNG TIN HÀNH CHÍNH & THẺ BHYT</h4>
          <div class="yte-grid-3">
            <div><span>Họ và tên:</span> <b style="font-size:14px;color:#0f172a">${esc(d.hoTen)}</b></div>
            <div><span>Ngày sinh:</span> <b>${esc(dateVN(d.ngaySinh))}</b></div>
            <div><span>Giới tính:</span> <b>${esc(d.gioiTinh || '---')}</b></div>
            <div style="grid-column:span 2"><span>Địa chỉ:</span> ${esc(d.diaChi || '---')}</div>
            <div><span>Nơi ĐKKCB ban đầu:</span> <b>${esc(d.maDKBD || d.maCSKCB || '---')}</b></div>
            <div><span>Mã thẻ BHYT:</span> <b class="yte-card">${esc(d.maThe || 'KHÔNG CÓ THẺ')}</b></div>
            <div style="grid-column:span 2"><span>Hạn thẻ BHYT:</span> <b>${d.gtTheTu ? `${dateVN(d.gtTheTu)} đến ${dateVN(d.gtTheDen)}` : '---'}</b></div>
          </div>
        </div>

        <div class="yte-section">
          <h4>II. THÔNG TIN KHÁM CHỮA BỆNH & CHẨN ĐOÁN</h4>
          <div class="yte-grid-2">
            <div><span>Thời gian vào viện:</span> <b>${esc(dateTimeVN(d.ngayVao))}</b></div>
            <div><span>Thời gian ra viện:</span> <b>${esc(dateTimeVN(d.ngayRa))}</b></div>
            <div style="grid-column:span 2"><span>Chẩn đoán chính (ICD-10):</span> <b style="color:#b91c1c">[${esc(d.maBenh || '---')}]</b> <b>${esc(d.tenBenh || '---')}</b></div>
            ${d.maBenhKem ? `<div style="grid-column:span 2"><span>Bệnh kèm theo:</span> <b>[${esc(d.maBenhKem)}]</b></div>` : ''}
          </div>
        </div>

        <div class="yte-section">
          <h4>III. TỔNG HỢP CHI PHÍ VIỆN PHÍ & BHYT THANH TOÁN</h4>
          <div class="yte-cost-cards">
            <div class="c-card total">
              <div class="c-lbl">TỔNG CHI PHÍ KCB</div>
              <div class="c-val">${money(d.tongChi)} đ</div>
            </div>
            <div class="c-card bhyt">
              <div class="c-lbl">BHYT THANH TOÁN</div>
              <div class="c-val">${money(d.bhytChi)} đ</div>
            </div>
            <div class="c-card bn">
              <div class="c-lbl">NGƯỜI BỆNH CÙNG CHI TRẢ</div>
              <div class="c-val">${money(d.cungChiTra)} đ</div>
            </div>
            <div class="c-card out">
              <div class="c-lbl">NGƯỜI BỆNH TỰ TRẢ (NGOÀI DM)</div>
              <div class="c-val">${money(d.tuTra)} đ</div>
            </div>
          </div>
        </div>

        ${d.dsThuoc && d.dsThuoc.length ? `
          <div class="yte-section">
            <h4>IV. CHI TIẾT THUỐC, HOÁ CHẤT ĐÃ SỬ DỤNG (${d.dsThuoc.length} khoản)</h4>
            <table class="lines yte-lines">
              <tr>
                <th style="width:36px">STT</th>
                <th style="width:90px">Mã thuốc</th>
                <th>Tên thuốc / Biệt dược</th>
                <th style="width:110px">Hàm lượng</th>
                <th style="width:55px">ĐVT</th>
                <th style="width:65px">Số lượng</th>
                <th style="width:85px">Đơn giá</th>
                <th style="width:105px">Thành tiền</th>
                <th style="width:95px">BHYT trả</th>
              </tr>
              ${d.dsThuoc.map(t => `
                <tr>
                  <td class="c">${esc(t.stt)}</td>
                  <td class="c"><b>${esc(t.ma)}</b></td>
                  <td><b>${esc(t.ten)}</b></td>
                  <td>${esc(t.hamLuong)}</td>
                  <td class="c">${esc(t.dvt)}</td>
                  <td class="n">${money(t.sl)}</td>
                  <td class="n">${money(t.dg)}</td>
                  <td class="n"><b>${money(t.tien)}</b></td>
                  <td class="n" style="color:#059669">${money(t.tienBHYT || t.tien)}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        ` : ''}

        ${d.dsDVKT && d.dsDVKT.length ? `
          <div class="yte-section">
            <h4>V. CHI TIẾT DỊCH VỤ KỸ THUẬT & CẬN LÂM SÀNG (${d.dsDVKT.length} dịch vụ)</h4>
            <table class="lines yte-lines">
              <tr>
                <th style="width:36px">STT</th>
                <th style="width:95px">Mã dịch vụ</th>
                <th>Tên dịch vụ kỹ thuật / phẫu thuật / xét nghiệm</th>
                <th style="width:60px">ĐVT</th>
                <th style="width:65px">Số lượng</th>
                <th style="width:85px">Đơn giá</th>
                <th style="width:105px">Thành tiền</th>
                <th style="width:95px">BHYT trả</th>
              </tr>
              ${d.dsDVKT.map(v => `
                <tr>
                  <td class="c">${esc(v.stt)}</td>
                  <td class="c"><b>${esc(v.ma)}</b></td>
                  <td><b>${esc(v.ten)}</b></td>
                  <td class="c">${esc(v.dvt || 'Lần')}</td>
                  <td class="n">${money(v.sl)}</td>
                  <td class="n">${money(v.dg)}</td>
                  <td class="n"><b>${money(v.tien)}</b></td>
                  <td class="n" style="color:#059669">${money(v.tienBHYT || v.tien)}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        ` : ''}

        <div class="hd-sigs c3" style="margin-top:25px">
          <div>
            <h4>Người bệnh / Thân nhân</h4>
            <div class="role-sub">(Ký xác nhận chi phí)</div>
          </div>
          <div>
            <h4>Bác sĩ điều trị</h4>
            <div class="role-sub">(Ký tên / Ký số điện tử)</div>
            ${d.sigs && d.sigs.length ? `
              <div class="sig-stamp">
                <div class="stamp-box">
                  <div class="s-title">✔ BÁC SĨ KÝ SỐ</div>
                  <div class="s-signer">BS: <b>${esc(d.sigs[0].nguoiKy)}</b></div>
                  <div class="s-time">Thời điểm: ${esc(dateTimeVN(d.sigs[0].ngayKy))}</div>
                </div>
              </div>
            ` : ''}
          </div>
          <div>
            <h4>Đại diện Cơ sở KCB</h4>
            <div class="role-sub">(Giám đốc / Trưởng phòng KHTH)</div>
            <div class="sig-stamp">
              <div class="stamp-box" style="border-color:#059669">
                <div class="s-title" style="color:#059669">✔ BỆNH VIỆN XÁC THỰC</div>
                <div class="s-signer"><b>${esc(d.tenCSKCB)}</b></div>
                <div class="s-time">Hồ sơ đã gửi Cổng BHYT</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="copyright">(C) August87 - 0982722036</div>
    `;
  }

  // =========================================================================
  // 3. CHỨNG TỪ KHẤU TRỪ THUẾ TNCN ĐIỆN TỬ (TNCN - NĐ 123/2020/NĐ-CP & TT 78)
  // =========================================================================

  function isTncnXml(root) {
    const r = (root.localName || '').toUpperCase();
    if (r === 'CTRTNCN' || r === 'CHUNGTUKHAUTRUTHUETNCN' || r === 'CHUNGTUTNCN' || r === 'CTKT_TNCN' || r === 'TNCNDOCUMENT') return true;
    if (r === 'CHUNGTU' && (deep(root, 'soThueTNCNKhauTru').length || deep(root, 'soThueKhauTru').length || deep(root, 'khoanThuNhap').length)) return true;
    if (deep(root, 'soThueTNCNKhauTru').length || deep(root, 'tongThuNhapChiuThue').length || deep(root, 'soThueKhauTru').length) return true;
    return false;
  }

  function parseTncn(root, fileName, readSignatures) {
    const soChungTu = deepTxt(root, 'soChungTu', 'soCT', 'so', 'soChungTuKhauTru', 'soChungTuDienTu');
    const kyHieu = deepTxt(root, 'kyHieu', 'khieu', 'kyHieuMau', 'kyHieuChungTu');
    const mauSo = deepTxt(root, 'mauSo', 'mauChungTu', 'soHieuMau') || '01/TNCN';
    const ngayLap = deepTxt(root, 'ngayLap', 'ngayCT', 'ngayChungTu', 'IssueDate', 'ngayKy');

    // Tổ chức chi trả
    const toChuc = {
      ten: deepTxt(root, 'tenToChuc', 'tenNNT', 'tenDvi', 'tenNguoiChiTra', 'tenDonViChiTra', 'tenDonVi'),
      mst: deepTxt(root, 'mstToChuc', 'mstNNT', 'mstDvi', 'mst', 'maSoThue'),
      diaChi: deepTxt(root, 'diaChiToChuc', 'diaChiNNT', 'diaChiDvi', 'diaChi'),
      sdt: deepTxt(root, 'sdtToChuc', 'dienthoai', 'sdt', 'soDienThoai')
    };

    // Cá nhân nhận thu nhập
    const caNhan = {
      hoTen: deepTxt(root, 'hoTen', 'tenNguoiNhan', 'hoVaTen', 'tenNhanVien', 'hoTenNguoiNopThue'),
      mst: deepTxt(root, 'mstCaNhan', 'mstNguoiNhan', 'mst', 'tin'),
      cccd: deepTxt(root, 'soCCCD', 'soCMND_CCCD', 'soCMND', 'soHoChieu', 'cccd', 'cmnd', 'idNumber'),
      quocTich: deepTxt(root, 'quocTich', 'quocTichNNT') || 'Việt Nam',
      cuTru: /1|true|c[oó]/i.test(deepTxt(root, 'cuTru', 'caNhanCuTru', 'tinhTrangCuTru')) ? 'Có' : (deepTxt(root, 'cuTru') ? 'Không' : 'Có'),
      diaChi: deepTxt(root, 'diaChiCaNhan', 'diaChi', 'diaChiLienHe'),
      email: deepTxt(root, 'email', 'emailCaNhan'),
      sdt: deepTxt(root, 'sdtCaNhan', 'sdt')
    };

    // Khoản thu nhập & tính thuế
    const khoanThuNhap = deepTxt(root, 'khoanThuNhap', 'tenKhoanThuNhap', 'loaiThuNhap') || 'Tiền lương, tiền công';
    const thoiDiemTraThuNhap = deepTxt(root, 'thoiDiemTraThuNhap', 'thoiGianTra', 'kyChiTra', 'thangNam', 'kyTinhThue');
    const tongThuNhapChiuThue = num(deepTxt(root, 'tongThuNhapChiuThue', 'thuNhapChiuThue', 'tongThuNhap', 'thuNhapChiuThuePhaiKhauTru'));
    const khoanGiamTru = num(deepTxt(root, 'khoanGiamTru', 'giamTru', 'tongGiamTru', 'baoHiemBatBuoc', 'giamTruGiaCanh')) || 0;
    let thuNhapTinhThue = num(deepTxt(root, 'thuNhapTinhThue', 'tinhThue'));
    if (thuNhapTinhThue == null && tongThuNhapChiuThue != null) {
      thuNhapTinhThue = Math.max(0, tongThuNhapChiuThue - khoanGiamTru);
    }
    const soThueTNCNKhauTru = num(deepTxt(root, 'soThueTNCNKhauTru', 'soThueKhauTru', 'tienThue', 'thueTNCNKhauTru'));
    let soThuNhapThucNhan = num(deepTxt(root, 'soThuNhapThucNhan', 'thuNhapConLai', 'thucNhan', 'soTienConLai'));
    if (soThuNhapThucNhan == null && tongThuNhapChiuThue != null && soThueTNCNKhauTru != null) {
      soThuNhapThucNhan = tongThuNhapChiuThue - soThueTNCNKhauTru;
    }
    const soTienBangChu = deepTxt(root, 'soTienBangChu', 'tongTienBangChu', 'tienBangChu');

    return {
      kind: 'tncn',
      fileName,
      title: `Chứng từ khấu trừ thuế TNCN ${soChungTu || ''}`,
      sub: `Ký hiệu: ${kyHieu || '—'} · Mẫu số: ${mauSo}`,
      soChungTu,
      kyHieu,
      mauSo,
      ngayLap,
      toChuc,
      caNhan,
      khoanThuNhap,
      thoiDiemTraThuNhap,
      tongThuNhapChiuThue,
      khoanGiamTru,
      thuNhapTinhThue,
      soThueTNCNKhauTru,
      soThuNhapThucNhan,
      soTienBangChu,
      mst: caNhan.mst || toChuc.mst || '',
      ten: caNhan.hoTen || toChuc.ten || '',
      ky: thoiDiemTraThuNhap || dateVN(ngayLap),
      sigs: readSignatures(root),
      info: [
        ['Số chứng từ', soChungTu],
        ['Ký hiệu', kyHieu],
        ['Mẫu số', mauSo],
        ['Ngày lập', dateVN(ngayLap)],
        ['Tổ chức chi trả', toChuc.ten],
        ['MST tổ chức', toChuc.mst],
        ['Người nộp thuế', caNhan.hoTen],
        ['MST cá nhân', caNhan.mst || '(Chưa có)'],
        ['Số CCCD/CMND', caNhan.cccd],
        ['Kỳ trả thu nhập', thoiDiemTraThuNhap],
        ['Số thuế TNCN khấu trừ', money(soThueTNCNKhauTru) + ' VNĐ']
      ]
    };
  }

  function renderTncn(d) {
    return `
      <div class="top-strip">
        <div class="note ok">✔ Chứng từ khấu trừ thuế TNCN điện tử (NĐ 123/2020/NĐ-CP & TT 78/2021/TT-BTC) · <span style="color:var(--muted)">Nguồn: ${esc(d.source)}</span></div>
        <div style="display:flex;gap:8px">
          <button type="button" class="btn-xuat-excel" style="background:#15803d;color:#fff;border-color:#15803d;font-weight:600">📊 Xuất Excel</button>
          <button class="primary" id="printBtn">In / Lưu PDF</button>
        </div>
      </div>
      <div class="paper tncn-paper">
        <div class="tncn-head">
          <div class="tncn-nat">
            <div class="t-top">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div class="t-sub">Độc lập - Tự do - Hạnh phúc</div>
            <div class="t-line">——————</div>
          </div>
          <div class="tncn-title-box">
            <h2>CHỨNG TỪ KHẤU TRỪ THUẾ THU NHẬP CÁ NHÂN</h2>
            <div class="sub">(Theo Nghị định số 123/2020/NĐ-CP ngày 19/10/2020 của Chính phủ)</div>
            <div class="sub-date">${d.ngayLap ? 'Ngày lập: ' + esc(dateVN(d.ngayLap)) : ''}</div>
          </div>
          <div class="tncn-meta">
            <div>Mẫu số: <b>${esc(d.mauSo || '01/TNCN')}</b></div>
            <div>Ký hiệu: <b>${esc(d.kyHieu || '—')}</b></div>
            <div>Số: <b style="color:var(--accent);font-size:14px">${esc(d.soChungTu || '—')}</b></div>
          </div>
        </div>

        <!-- PHẦN I: TỔ CHỨC CHI TRẢ -->
        <div class="tncn-sec">
          <div class="sec-title">I. THÔNG TIN TỔ CHỨC, CÁ NHÂN TRẢ THU NHẬP</div>
          <div class="grid-2">
            <div>[01] Tên tổ chức, cá nhân: <b>${esc(d.toChuc.ten)}</b></div>
            <div>[02] Mã số thuế: <b class="tag-mst">${esc(d.toChuc.mst)}</b></div>
            <div class="span-2">[03] Địa chỉ: ${esc(d.toChuc.diaChi)}</div>
            <div>[04] Điện thoại: ${esc(d.toChuc.sdt || '—')}</div>
          </div>
        </div>

        <!-- PHẦN II: NGƯỜI NỘP THUẾ -->
        <div class="tncn-sec">
          <div class="sec-title">II. THÔNG TIN NGƯỜI NỘP THUẾ (CÁ NHÂN ĐƯỢC KHẤU TRỪ THUẾ)</div>
          <div class="grid-2">
            <div>[05] Họ và tên: <b style="font-size:13.5px;color:#0f172a">${esc(d.caNhan.hoTen)}</b></div>
            <div>[06] Mã số thuế: <b>${esc(d.caNhan.mst || '—')}</b></div>
            <div>[07] Quốc tịch: ${esc(d.caNhan.quocTich)}</div>
            <div>[08] Cá nhân cư trú: <b>${esc(d.caNhan.cuTru)}</b></div>
            <div>[09] Số CCCD / CMND / Hộ chiếu: <b>${esc(d.caNhan.cccd || '—')}</b></div>
            <div>[10] Địa chỉ liên hệ: ${esc(d.caNhan.diaChi || '—')}</div>
          </div>
        </div>

        <!-- PHẦN III: THÔNG TIN KHẤU TRỪ -->
        <div class="tncn-sec">
          <div class="sec-title">III. THÔNG TIN THUẾ THU NHẬP CÁ NHÂN KHẤU TRỪ</div>
          <div style="margin-bottom:10px;font-size:12.5px;display:flex;gap:24px;flex-wrap:wrap">
            <div>[11] Khoản thu nhập: <b>${esc(d.khoanThuNhap)}</b></div>
            <div>[12] Thời điểm trả thu nhập: <b style="color:#0369a1">${esc(d.thoiDiemTraThuNhap || '—')}</b></div>
          </div>

          <table class="lines tncn-table">
            <thead>
              <tr>
                <th style="width:45px">STT</th>
                <th>Chỉ tiêu thu nhập & thuế khấu trừ</th>
                <th style="width:90px" class="c">Mã chỉ tiêu</th>
                <th style="width:180px" class="n">Số tiền (VNĐ)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="c">1</td>
                <td>Tổng thu nhập chịu thuế phải khấu trừ</td>
                <td class="c"><b>[13]</b></td>
                <td class="n"><b>${money(d.tongThuNhapChiuThue)}</b></td>
              </tr>
              <tr>
                <td class="c">2</td>
                <td>Các khoản đóng bảo hiểm bắt buộc và các khoản giảm trừ khác</td>
                <td class="c"><b>[14]</b></td>
                <td class="n">${money(d.khoanGiamTru)}</td>
              </tr>
              <tr style="background:#f8fafc">
                <td class="c">3</td>
                <td>Tổng thu nhập tính thuế</td>
                <td class="c"><b>[15]</b></td>
                <td class="n"><b>${money(d.thuNhapTinhThue)}</b></td>
              </tr>
              <tr style="background:#fef2f2">
                <td class="c">4</td>
                <td style="color:#b91c1c;font-weight:700">Số thuế thu nhập cá nhân đã khấu trừ</td>
                <td class="c"><b style="color:#b91c1c">[16]</b></td>
                <td class="n" style="color:#b91c1c;font-weight:800;font-size:13.5px">${money(d.soThueTNCNKhauTru)}</td>
              </tr>
              <tr style="background:#f0fdf4">
                <td class="c">5</td>
                <td style="color:#15803d;font-weight:700">Số thu nhập còn lại thực nhận</td>
                <td class="c"><b style="color:#15803d">[17]</b></td>
                <td class="n" style="color:#15803d;font-weight:800;font-size:13.5px">${money(d.soThuNhapThucNhan)}</td>
              </tr>
            </tbody>
          </table>
          ${d.soTienBangChu ? `<div style="margin-top:8px;font-style:italic;font-size:12px;color:var(--muted)">Số tiền thuế khấu trừ bằng chữ: <b>${esc(d.soTienBangChu)}</b></div>` : ''}
        </div>

        <!-- CHỮ KÝ SỐ -->
        <div class="hd-sigs c2" style="margin-top:24px">
          <div>
            <h4>NGƯỜI NỘP THUẾ</h4>
            <div class="role-sub">(Ký, ghi rõ họ tên nếu có yêu cầu)</div>
          </div>
          <div>
            <h4>ĐẠI DIỆN TỔ CHỨC TRẢ THU NHẬP</h4>
            <div class="role-sub">(Ký điện tử / Ký tên, đóng dấu)</div>
            ${d.sigs && d.sigs.length ? `
              <div class="sig-stamp">
                <div class="stamp-box" style="border-color:#b91c1c">
                  <div class="s-title" style="color:#b91c1c">✔ KÝ BỞI TỔ CHỨC CHI TRẢ</div>
                  <div class="s-signer">Đơn vị: <b>${esc(d.sigs[0].cn || d.toChuc.ten)}</b></div>
                  ${d.sigs[0].mst ? `<div class="s-signer">MST: ${esc(d.sigs[0].mst)}</div>` : ''}
                  <div class="s-time">Thời điểm ký: ${esc(dateTimeVN(d.sigs[0].time))}</div>
                </div>
              </div>
            ` : `
              <div class="sig-stamp">
                <div class="stamp-box" style="border-color:#1e3a8a">
                  <div class="s-title" style="color:#1e3a8a">✔ CHỨNG TỪ ĐIỆN TỬ</div>
                  <div class="s-signer">Đơn vị: <b>${esc(d.toChuc.ten)}</b></div>
                  <div class="s-time">Khấu trừ thuế theo quy định</div>
                </div>
              </div>
            `}
          </div>
        </div>
      </div>
      <div class="copyright">(C) August87 - 0982722036</div>
    `;
  }

  // =========================================================================
  // 4. HỒ SƠ BẢO HIỂM XÃ HỘI ĐIỆN TỬ (BHXH - QĐ 595/505 & QĐ 899)
  // =========================================================================

  function isBhxhXml(root) {
    const r = (root.localName || '').toUpperCase();
    if (r.startsWith('D02') || r.startsWith('C70') || r.startsWith('TK1') || r.startsWith('TK3') || r === 'HSBHXH' || r === 'HOSOBHXH' || r === 'HOSOGIAODICHDDIENTUBHXH') return true;
    if (deep(root, 'maDonVi').length && (deep(root, 'maSoBHXH').length || deep(root, 'coQuanBHXH').length || deep(root, 'tyLeDongBHXH').length || deep(root, 'tienLuong').length || deep(root, 'dsLaoDong').length)) return true;
    return false;
  }

  function parseBhxh(root, fileName, readSignatures) {
    const rName = (root.localName || '').toUpperCase();
    const maThuTuc = deepTxt(root, 'maThuTuc', 'maHoSo', 'soHoSo', 'maBieuMau') || (rName.includes('D02') ? 'D02-LT' : rName.includes('C70') ? 'C70a-HD' : rName);
    
    let tenBieuMau = deepTxt(root, 'tenBieuMau', 'tenThuTuc', 'tieuDe', 'tenHoSo');
    if (!tenBieuMau) {
      if (maThuTuc.includes('D02')) tenBieuMau = 'BẢNG KÊ LAO ĐỘNG THAM GIA BHXH, BHYT, BHTN (Mẫu D02-LT)';
      else if (maThuTuc.includes('C70')) tenBieuMau = 'DANH SÁCH ĐỀ NGHỊ GIẢI QUYẾT HƯỞNG CHẾ ĐỘ ỐM ĐAU, THAI SẢN (Mẫu C70a-HD)';
      else if (maThuTuc.includes('TK1')) tenBieuMau = 'TỜ KHAI THAM GIA, ĐIỀU CHỈNH THÔNG TIN BHXH, BHYT (Mẫu TK1-TS)';
      else tenBieuMau = 'HỒ SƠ GIAO DỊCH ĐIỆN TỬ BẢO HIỂM XÃ HỘI';
    }

    const kyKeKhai = deepTxt(root, 'thangNam', 'kyKeKhai', 'namThang', 'kyTinhThue', 'dotKeKhai') || [deepTxt(root, 'thang'), deepTxt(root, 'nam')].filter(Boolean).join('/');
    const ngayLap = deepTxt(root, 'ngayLap', 'ngayNop', 'ngayKy', 'ngayGui');

    // Đơn vị sử dụng lao động
    const donVi = {
      ten: deepTxt(root, 'tenDonVi', 'tenDvi', 'tenDonViSDLD', 'tenDoanhNghiep', 'tenNNT'),
      ma: deepTxt(root, 'maDonVi', 'maDvi', 'maDV', 'maDonViBHXH'),
      mst: deepTxt(root, 'mstDonVi', 'mst', 'maSoThue'),
      diaChi: deepTxt(root, 'diaChiDonVi', 'diaChi', 'diaChiDvi'),
      coQuanBHXH: deepTxt(root, 'coQuanBHXH', 'tenCoQuanBHXH', 'coQuanQuanLy', 'tenCQBHXH')
    };

    // Danh sách lao động
    let itemNodes = deep(root, 'LaoDong');
    if (!itemNodes.length) itemNodes = deep(root, 'ChiTiet');
    if (!itemNodes.length) itemNodes = deep(root, 'BangKe');
    if (!itemNodes.length) itemNodes = deep(root, 'NhanVien');
    if (!itemNodes.length) itemNodes = deep(root, 'NguoiLaoDong');
    if (!itemNodes.length) itemNodes = deep(root, 'ROW_D02');
    if (!itemNodes.length) itemNodes = deep(root, 'ROW_C70');

    const dsLaoDong = itemNodes.map((el, idx) => {
      const stt = deepTxt(el, 'stt', 'STT') || (idx + 1);
      const hoTen = deepTxt(el, 'hoTen', 'hoVaTen', 'tenLaoDong', 'tenNV');
      const maSoBHXH = deepTxt(el, 'maSoBHXH', 'soBHXH', 'maBHXH', 'soSoBHXH');
      const ngaySinh = dateVN(deepTxt(el, 'ngaySinh', 'namSinh'));
      const rawGT = deepTxt(el, 'gioiTinh');
      const gioiTinh = rawGT === '1' ? 'Nam' : rawGT === '2' ? 'Nữ' : rawGT;
      const cccd = deepTxt(el, 'soCCCD', 'soCMND', 'cccd', 'cmnd');
      const chucVu = deepTxt(el, 'chucVu', 'chucDanh', 'viTriViecLam', 'congViec');
      const tienLuong = num(deepTxt(el, 'tienLuong', 'mucLuong', 'mucDong', 'tienLuongDongBHXH')) || 0;
      const heSo = deepTxt(el, 'heSo', 'heSoLuong');
      const tyLeDong = num(deepTxt(el, 'tyLeDong', 'tyLeDongBHXH')) || 32;
      const tuThang = deepTxt(el, 'tuThang', 'tuThangNam', 'tuNgay');
      const denThang = deepTxt(el, 'denThang', 'denThangNam', 'denNgay');
      const ghiChu = deepTxt(el, 'ghiChu', 'phuongAn', 'loaiDieuChinh', 'noiDung');
      const loaiCheDo = deepTxt(el, 'loaiCheDo', 'tenCheDo', 'cheDo');
      const soNgayNghi = num(deepTxt(el, 'soNgayNghi', 'soNgay'));
      const tienDeNghi = num(deepTxt(el, 'tienDeNghi', 'soTienDeNghi', 'soTienTroCap'));

      return { stt, hoTen, maSoBHXH, ngaySinh, gioiTinh, cccd, chucVu, tienLuong, heSo, tyLeDong, tuThang, denThang, ghiChu, loaiCheDo, soNgayNghi, tienDeNghi };
    });

    const tongSoLaoDong = dsLaoDong.length || num(deepTxt(root, 'tongSoLaoDong', 'soLaoDong')) || 0;
    const tongQuyLuong = dsLaoDong.reduce((s, l) => s + (l.tienLuong || 0), 0) || num(deepTxt(root, 'tongQuyLuong', 'tongTienLuong')) || 0;
    const tongTienDong = num(deepTxt(root, 'tongTienDong', 'tongSoTien')) || Math.round(tongQuyLuong * 0.32);
    const tongTienDeNghi = dsLaoDong.reduce((s, l) => s + (l.tienDeNghi || 0), 0) || num(deepTxt(root, 'tongTienDeNghi', 'tongTienTroCap')) || 0;

    return {
      kind: 'bhxh',
      fileName,
      title: tenBieuMau,
      sub: `Mã thủ tục: ${maThuTuc} · Mã đơn vị: ${donVi.ma || '—'}`,
      maThuTuc,
      tenBieuMau,
      kyKeKhai,
      ngayLap,
      donVi,
      dsLaoDong,
      tongSoLaoDong,
      tongQuyLuong,
      tongTienDong,
      tongTienDeNghi,
      mst: donVi.mst || '',
      ten: donVi.ten || '',
      ky: kyKeKhai,
      sigs: readSignatures(root),
      info: [
        ['Mã thủ tục', maThuTuc],
        ['Tên biểu mẫu', tenBieuMau],
        ['Kỳ kê khai', kyKeKhai],
        ['Ngày lập', dateVN(ngayLap)],
        ['Tên đơn vị', donVi.ten],
        ['Mã đơn vị BHXH', donVi.ma],
        ['MST', donVi.mst],
        ['Cơ quan BHXH', donVi.coQuanBHXH],
        ['Số lao động', tongSoLaoDong],
        ['Tổng quỹ lương đóng', money(tongQuyLuong) + ' VNĐ']
      ]
    };
  }

  function renderBhxh(d) {
    const isC70 = (d.maThuTuc || '').toUpperCase().includes('C70');
    return `
      <div class="top-strip">
        <div class="note ok">✔ Hồ sơ Bảo hiểm Xã hội điện tử (Cổng BHXH Việt Nam) · <span style="color:var(--muted)">Nguồn: ${esc(d.source)}</span></div>
        <div style="display:flex;gap:8px">
          <button type="button" class="btn-xuat-excel" style="background:#15803d;color:#fff;border-color:#15803d;font-weight:600">📊 Xuất Excel</button>
          <button class="primary" id="printBtn">In / Lưu PDF</button>
        </div>
      </div>
      <div class="paper bhxh-paper">
        <div class="bhxh-head">
          <div class="bhxh-brand">
            <h3>BẢO HIỂM XÃ HỘI VIỆT NAM</h3>
            <div>Cơ quan quản lý: <b>${esc(d.donVi.coQuanBHXH || 'Cơ quan BHXH')}</b></div>
          </div>
          <div class="bhxh-title-box">
            <h2>${esc(d.tenBieuMau)}</h2>
            <div class="sub">Mã thủ tục: <b>${esc(d.maThuTuc)}</b> ${d.kyKeKhai ? '· Kỳ kê khai: <b>' + esc(d.kyKeKhai) + '</b>' : ''}</div>
            <div class="sub-date">${d.ngayLap ? 'Ngày lập: ' + esc(dateVN(d.ngayLap)) : ''}</div>
          </div>
          <div class="bhxh-meta">
            <div>Mã đơn vị: <b style="color:#0891b2;font-size:13.5px">${esc(d.donVi.ma || '—')}</b></div>
            <div>Mã số thuế: <b>${esc(d.donVi.mst || '—')}</b></div>
          </div>
        </div>

        <!-- THÔNG TIN ĐƠN VỊ -->
        <div class="bhxh-sec">
          <div class="grid-2" style="background:#f0fdfa;border-color:#ccfbf1">
            <div>Tên đơn vị sử dụng lao động: <b style="color:#0f766e">${esc(d.donVi.ten)}</b></div>
            <div>Mã đơn vị BHXH: <b>${esc(d.donVi.ma || '—')}</b></div>
            <div class="span-2">Địa chỉ đơn vị: ${esc(d.donVi.diaChi || '—')}</div>
          </div>
        </div>

        <!-- THẺ KPI TỔNG HỢP -->
        <div class="bhxh-kpis">
          <div class="b-card">
            <div class="b-lbl">TỔNG LAO ĐỘNG</div>
            <div class="b-val" style="color:#0891b2">${d.tongSoLaoDong} <span style="font-size:12px;font-weight:400">người</span></div>
          </div>
          <div class="b-card">
            <div class="b-lbl">${isC70 ? 'TỔNG TIỀN ĐỀ NGHỊ TRỢ CẤP' : 'TỔNG QUỸ LƯƠNG ĐÓNG BHXH'}</div>
            <div class="b-val" style="color:#0f766e">${money(isC70 ? d.tongTienDeNghi : d.tongQuyLuong)} <span style="font-size:12px;font-weight:400">VNĐ</span></div>
          </div>
          ${!isC70 ? `
            <div class="b-card">
              <div class="b-lbl">ƯỚC TÍNH TIỀN ĐÓNG (32%)</div>
              <div class="b-val" style="color:#b91c1c">${money(d.tongTienDong)} <span style="font-size:12px;font-weight:400">VNĐ</span></div>
            </div>
          ` : ''}
        </div>

        <!-- BẢNG DANH SÁCH LAO ĐỘNG -->
        <div class="bhxh-sec" style="margin-top:16px">
          <div class="sec-title">DANH SÁCH CHI TIẾT NGƯỜI LAO ĐỘNG (${d.dsLaoDong.length} dòng)</div>
          <div style="overflow-x:auto">
            <table class="lines bhxh-table">
              <thead>
                <tr>
                  <th style="width:38px">STT</th>
                  <th>Họ và tên</th>
                  <th style="width:105px" class="c">Mã số BHXH</th>
                  <th style="width:75px" class="c">Ngày sinh</th>
                  <th style="width:50px" class="c">Phái</th>
                  <th style="width:100px" class="c">CCCD/CMND</th>
                  <th>Chức danh / Vị trí</th>
                  ${isC70 ? `
                    <th>Chế độ</th>
                    <th style="width:70px" class="c">Số ngày</th>
                    <th style="width:110px" class="n">Số tiền trợ cấp</th>
                  ` : `
                    <th style="width:110px" class="n">Lương đóng BH</th>
                    <th style="width:55px" class="c">Tỷ lệ</th>
                    <th style="width:85px" class="c">Từ tháng</th>
                    <th>Phương án / Ghi chú</th>
                  `}
                </tr>
              </thead>
              <tbody>
                ${d.dsLaoDong.map(l => `
                  <tr>
                    <td class="c">${l.stt}</td>
                    <td><b>${esc(l.hoTen)}</b></td>
                    <td class="c" style="font-family:Consolas,monospace;color:#0891b2"><b>${esc(l.maSoBHXH)}</b></td>
                    <td class="c">${esc(l.ngaySinh)}</td>
                    <td class="c">${esc(l.gioiTinh)}</td>
                    <td class="c" style="font-family:Consolas,monospace">${esc(l.cccd)}</td>
                    <td>${esc(l.chucVu)}</td>
                    ${isC70 ? `
                      <td><span class="badge-chedo">${esc(l.loaiCheDo)}</span></td>
                      <td class="c"><b>${l.soNgayNghi || ''}</b></td>
                      <td class="n" style="color:#b91c1c;font-weight:700">${money(l.tienDeNghi)}</td>
                    ` : `
                      <td class="n"><b>${money(l.tienLuong)}</b></td>
                      <td class="c">${l.tyLeDong ? l.tyLeDong + '%' : '32%'}</td>
                      <td class="c">${esc(l.tuThang)}</td>
                      <td><span class="pa-note">${esc(l.ghiChu)}</span></td>
                    `}
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="background:#f8fafc;font-weight:700">
                  <td colspan="7" style="text-align:right">Tổng cộng (${d.dsLaoDong.length} người):</td>
                  ${isC70 ? `
                    <td></td>
                    <td></td>
                    <td class="n" style="color:#b91c1c;font-size:13px">${money(d.tongTienDeNghi)}</td>
                  ` : `
                    <td class="n" style="color:#0f766e;font-size:13px">${money(d.tongQuyLuong)}</td>
                    <td colspan="3"></td>
                  `}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- CHỮ KÝ SỐ -->
        <div class="hd-sigs c2" style="margin-top:24px">
          <div>
            <h4>NGƯỜI LẬP BIỂU</h4>
            <div class="role-sub">(Ký, ghi rõ họ tên)</div>
          </div>
          <div>
            <h4>THỦ TRƯỞNG ĐƠN VỊ</h4>
            <div class="role-sub">(Ký điện tử / Đóng dấu)</div>
            ${d.sigs && d.sigs.length ? `
              <div class="sig-stamp">
                <div class="stamp-box" style="border-color:#0891b2">
                  <div class="s-title" style="color:#0891b2">✔ KÝ BỞI ĐƠN VỊ SỬ DỤNG LAO ĐỘNG</div>
                  <div class="s-signer">Đơn vị: <b>${esc(d.sigs[0].cn || d.donVi.ten)}</b></div>
                  ${d.sigs[0].mst ? `<div class="s-signer">MST: ${esc(d.sigs[0].mst)}</div>` : ''}
                  <div class="s-time">Thời điểm ký: ${esc(dateTimeVN(d.sigs[0].time))}</div>
                </div>
              </div>
            ` : `
              <div class="sig-stamp">
                <div class="stamp-box" style="border-color:#0f766e">
                  <div class="s-title" style="color:#0f766e">✔ HỒ SƠ ĐIỆN TỬ BHXH</div>
                  <div class="s-signer">Đơn vị: <b>${esc(d.donVi.ten)}</b></div>
                  <div class="s-time">Giao dịch điện tử BHXH Việt Nam</div>
                </div>
              </div>
            `}
          </div>
        </div>
      </div>
      <div class="copyright">(C) August87 - 0982722036</div>
    `;
  }

  // =========================================================================
  // 5. SỔ PHỤ NGÂN HÀNG ĐIỆN TỬ & SAO KÊ (ISO 20022 camt.053 / camt.054 / UNC)
  // =========================================================================

  function isBankXml(root) {
    const r = (root.localName || '').toUpperCase();
    if (r === 'BKOCSTMSTMT' || r === 'BKOCSTMRDBTCDTNTFCTN' || r === 'STATEMENT' || r === 'SOPHU' || r === 'SO_PHU' || r === 'SAO_KE' || r === 'SAOKE' || r === 'UNC' || r === 'UYNHIEMCHI' || r === 'UY_NHIEM_CHI') return true;
    if (deep(root, 'BkToCstmrStmt').length || deep(root, 'BkToCstmrDbtCdtNtfctn').length || deep(root, 'Ntry').length) return true;
    if (deep(root, 'soTaiKhoan').length && (deep(root, 'soDuDauKy').length || deep(root, 'soDuCuoiKy').length || deep(root, 'giaoDich').length)) return true;
    return false;
  }

  function parseBank(root, fileName, readSignatures) {
    // Ngân hàng
    const tenNganHang = deepTxt(root, 'tenNganHang', 'bankName', 'Nm', 'FinInstnId') || 'Ngân hàng Thương mại';
    const chiNhanh = deepTxt(root, 'chiNhanh', 'branch', 'BchId');
    const maBIC = deepTxt(root, 'maBIC', 'BIC', 'BICFI', 'swiftCode');

    // Tài khoản
    const soTaiKhoan = deepTxt(root, 'soTaiKhoan', 'accountNo', 'IBAN', 'Id') || deepTxt(deep(root, 'Acct')[0], 'Id');
    const chuTaiKhoan = deepTxt(root, 'chuTaiKhoan', 'accountHolder', 'tenKhachHang', 'Nm') || deepTxt(deep(root, 'Ownr')[0], 'Nm');
    const dongTien = deepTxt(root, 'dongTien', 'Ccy', 'currency') || 'VND';

    // Kỳ sao kê
    const soSaoKe = deepTxt(root, 'soSaoKe', 'soSoPhu', 'soThamChieu', 'LglSeqNb', 'Id');
    const tuNgay = deepTxt(root, 'tuNgay', 'FrDtTm', 'fromPeriod', 'fromDate');
    const denNgay = deepTxt(root, 'denNgay', 'ToDtTm', 'toPeriod', 'toDate');
    const ngayLap = deepTxt(root, 'ngayLap', 'CreDtTm', 'ngayPhatHanh');

    // Số dư
    let soDuDauKy = num(deepTxt(root, 'soDuDauKy', 'soDuDau', 'openingBalance'));
    let soDuCuoiKy = num(deepTxt(root, 'soDuCuoiKy', 'soDuCuoi', 'closingBalance'));

    // Xử lý Balance tags trong chuẩn camt.053
    const balNodes = deep(root, 'Bal');
    balNodes.forEach(b => {
      const cd = deepTxt(b, 'Cd');
      const amt = num(deepTxt(b, 'Amt'));
      const cdtDbt = deepTxt(b, 'CdtDbtInd');
      const val = (cdtDbt === 'DBIT' ? -1 : 1) * (amt || 0);
      if (cd === 'OPBD' || cd === 'PRCD') soDuDauKy = val;
      if (cd === 'CLBD' || cd === 'CLAV') soDuCuoiKy = val;
    });

    // Danh sách giao dịch
    let entryNodes = deep(root, 'Ntry');
    if (!entryNodes.length) entryNodes = deep(root, 'GiaoDich');
    if (!entryNodes.length) entryNodes = deep(root, 'Transaction');
    if (!entryNodes.length) entryNodes = deep(root, 'Entry');
    if (!entryNodes.length) entryNodes = deep(root, 'Row');

    let tongPhatSinhCo = 0;
    let tongPhatSinhNo = 0;
    let soMonCo = 0;
    let soMonNo = 0;

    const giaoDich = entryNodes.map((el, idx) => {
      const stt = deepTxt(el, 'stt', 'STT') || (idx + 1);
      const ngayGD = dateVN(deepTxt(el, 'ngayGD', 'BookgDt', 'Dt', 'ngayGiaoDich', 'TransDate'));
      const ngayGiaTri = dateVN(deepTxt(el, 'ngayGiaTri', 'ValDt', 'ValueDate'));
      const soThamChieu = deepTxt(el, 'soThamChieu', 'AcctSvcrRef', 'maGD', 'refNo', 'TxId');
      
      let rawLoai = deepTxt(el, 'loaiGD', 'CdtDbtInd', 'loai', 'type');
      let loaiGD = 'CRDT'; // default Có
      if (/DBIT|NỢ|NO|DEBIT/i.test(rawLoai)) loaiGD = 'DBIT';

      const soTien = num(deepTxt(el, 'soTien', 'Amt', 'amount', 'soTienGD')) || 0;
      const soDu = num(deepTxt(el, 'soDu', 'runningBalance', 'soDuSauGD'));

      // Đối ứng
      const tkDoiUng = deepTxt(el, 'tkDoiUng', 'soTKDoiUng', 'contraAccount') || deepTxt(deep(el, 'RltdPties')[0], 'Id');
      const tenDoiUng = deepTxt(el, 'tenDoiUng', 'tenNguoiDoiUng', 'contraName') || deepTxt(deep(el, 'RltdPties')[0], 'Nm');
      const nhDoiUng = deepTxt(el, 'nhDoiUng', 'tenNganHangDoiUng', 'contraBank');
      const noiDung = deepTxt(el, 'noiDung', 'Ustrd', 'dienGiai', 'noiDungGD', 'narrative', 'details');

      if (loaiGD === 'CRDT') {
        tongPhatSinhCo += soTien;
        soMonCo++;
      } else {
        tongPhatSinhNo += soTien;
        soMonNo++;
      }

      return { stt, ngayGD, ngayGiaTri, soThamChieu, loaiGD, soTien, soDu, tkDoiUng, tenDoiUng, nhDoiUng, noiDung };
    });

    if (soDuDauKy == null) soDuDauKy = 0;
    if (soDuCuoiKy == null) soDuCuoiKy = soDuDauKy + tongPhatSinhCo - tongPhatSinhNo;

    return {
      kind: 'nh',
      fileName,
      title: `Sổ phụ Ngân hàng ${soTaiKhoan || ''}`,
      sub: `${tenNganHang} · TK: ${soTaiKhoan || '—'} · ${dongTien}`,
      tenNganHang,
      chiNhanh,
      maBIC,
      soTaiKhoan,
      chuTaiKhoan,
      dongTien,
      soSaoKe,
      tuNgay,
      denNgay,
      ngayLap,
      soDuDauKy,
      tongPhatSinhCo,
      tongPhatSinhNo,
      soDuCuoiKy,
      soMonCo,
      soMonNo,
      giaoDich,
      mst: '',
      ten: chuTaiKhoan || tenNganHang,
      ky: [dateVN(tuNgay), dateVN(denNgay)].filter(Boolean).join(' - '),
      sigs: readSignatures(root),
      info: [
        ['Ngân hàng', tenNganHang],
        ['Số tài khoản', soTaiKhoan],
        ['Chủ tài khoản', chuTaiKhoan],
        ['Đồng tiền', dongTien],
        ['Kỳ sao kê', [dateVN(tuNgay), dateVN(denNgay)].filter(Boolean).join(' đến ')],
        ['Số dư đầu kỳ', money(soDuDauKy) + ' ' + dongTien],
        ['Tổng phát sinh Có (+)', money(tongPhatSinhCo) + ' ' + dongTien],
        ['Tổng phát sinh Nợ (-)', money(tongPhatSinhNo) + ' ' + dongTien],
        ['Số dư cuối kỳ', money(soDuCuoiKy) + ' ' + dongTien]
      ]
    };
  }

  function renderBank(d) {
    return `
      <div class="top-strip">
        <div class="note ok">✔ Sổ phụ Ngân hàng điện tử & Sao kê (Chuẩn ISO 20022 camt.053/054 & Ngân hàng Việt Nam) · <span style="color:var(--muted)">Nguồn: ${esc(d.source)}</span></div>
        <div style="display:flex;gap:8px">
          <button type="button" class="btn-xuat-excel" style="background:#15803d;color:#fff;border-color:#15803d;font-weight:600">📊 Xuất Excel</button>
          <button class="primary" id="printBtn">In / Lưu PDF</button>
        </div>
      </div>
      <div class="paper nh-paper">
        <div class="nh-head">
          <div class="nh-brand">
            <h3>${esc(d.tenNganHang)}</h3>
            <div>${esc(d.chiNhanh || 'Chi nhánh / Phòng giao dịch')}</div>
            ${d.maBIC ? `<div style="font-size:11px;color:var(--muted)">SWIFT/BIC: ${esc(d.maBIC)}</div>` : ''}
          </div>
          <div class="nh-title-box">
            <h2>SỔ PHỤ TÀI KHOẢN TIỀN GỬI</h2>
            <div class="sub">BẢNG SAO KÊ CHI TIẾT GIAO DỊCH (BANK STATEMENT)</div>
            <div class="sub-date">${d.ky ? 'Kỳ sao kê: <b>' + esc(d.ky) + '</b>' : (d.ngayLap ? 'Ngày lập: ' + esc(dateVN(d.ngayLap)) : '')}</div>
          </div>
          <div class="nh-meta">
            <div>Số tham chiếu: <b>${esc(d.soSaoKe || '—')}</b></div>
            <div>Loại tiền tệ: <b class="tag-mst" style="background:#e0e7ff;color:#3730a3">${esc(d.dongTien)}</b></div>
          </div>
        </div>

        <!-- THÔNG TIN CHỦ TÀI KHOẢN -->
        <div class="nh-sec">
          <div class="grid-2" style="background:#eef2ff;border-color:#c7d2fe">
            <div>Tên chủ tài khoản: <b style="font-size:14px;color:#312e81">${esc(d.chuTaiKhoan)}</b></div>
            <div>Số tài khoản: <b style="font-size:15px;color:#4338ca;font-family:Consolas,monospace">${esc(d.soTaiKhoan)}</b></div>
          </div>
        </div>

        <!-- 4 THẺ KPI TÀI CHÍNH -->
        <div class="nh-kpis">
          <div class="nh-kpi-card">
            <div class="k-lbl">SỐ DƯ ĐẦU KỲ</div>
            <div class="k-val">${money(d.soDuDauKy)}</div>
            <div class="k-sub">${esc(d.dongTien)}</div>
          </div>
          <div class="nh-kpi-card in">
            <div class="k-lbl">TỔNG PHÁT SINH CÓ (+)</div>
            <div class="k-val" style="color:#15803d">+${money(d.tongPhatSinhCo)}</div>
            <div class="k-sub">${d.soMonCo} giao dịch nhận</div>
          </div>
          <div class="nh-kpi-card out">
            <div class="k-lbl">TỔNG PHÁT SINH NỢ (-)</div>
            <div class="k-val" style="color:#b91c1c">-${money(d.tongPhatSinhNo)}</div>
            <div class="k-sub">${d.soMonNo} giao dịch chi</div>
          </div>
          <div class="nh-kpi-card bal">
            <div class="k-lbl">SỐ DƯ CUỐI KỲ</div>
            <div class="k-val" style="color:#1e3a8a">${money(d.soDuCuoiKy)}</div>
            <div class="k-sub">${esc(d.dongTien)}</div>
          </div>
        </div>

        <!-- BẢNG NHẬT KÝ GIAO DỊCH -->
        <div class="nh-sec" style="margin-top:16px">
          <div class="sec-title">NHẬT KÝ PHÁT SINH GIAO DỊCH (${d.giaoDich.length} giao dịch)</div>
          <div style="overflow-x:auto">
            <table class="lines nh-table">
              <thead>
                <tr>
                  <th style="width:38px">STT</th>
                  <th style="width:85px" class="c">Ngày GD</th>
                  <th style="width:110px">Số tham chiếu</th>
                  <th style="width:70px" class="c">Phát sinh</th>
                  <th style="width:130px" class="n">Số tiền (${esc(d.dongTien)})</th>
                  <th style="width:130px" class="n">Số dư sau GD</th>
                  <th style="width:180px">Đối tác / Tài khoản đối ứng</th>
                  <th>Nội dung chi tiết giao dịch</th>
                </tr>
              </thead>
              <tbody>
                ${d.giaoDich.map(g => {
                  const isCrdt = g.loaiGD === 'CRDT';
                  return `
                    <tr>
                      <td class="c">${g.stt}</td>
                      <td class="c">${esc(g.ngayGD)}</td>
                      <td style="font-family:Consolas,monospace;font-size:11px">${esc(g.soThamChieu)}</td>
                      <td class="c"><span class="badge-ps ${isCrdt ? 'in' : 'out'}">${isCrdt ? 'GHI CÓ' : 'GHI NỢ'}</span></td>
                      <td class="n" style="font-weight:700;color:${isCrdt ? '#15803d' : '#b91c1c'}">
                        ${isCrdt ? '+' : '-'}${money(g.soTien)}
                      </td>
                      <td class="n" style="font-weight:600;color:#0f172a">${g.soDu != null ? money(g.soDu) : '—'}</td>
                      <td>
                        ${g.tenDoiUng ? `<b>${esc(g.tenDoiUng)}</b><br>` : ''}
                        ${g.tkDoiUng ? `<span style="font-family:Consolas,monospace;font-size:11px;color:var(--muted)">TK: ${esc(g.tkDoiUng)}</span>` : ''}
                        ${g.nhDoiUng ? `<br><span style="font-size:11px;color:var(--muted)">${esc(g.nhDoiUng)}</span>` : ''}
                      </td>
                      <td style="font-size:12px;line-height:1.4">${esc(g.noiDung)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr style="background:#f8fafc;font-weight:700">
                  <td colspan="4" style="text-align:right">Tổng phát sinh:</td>
                  <td class="n" style="color:#0f172a;font-size:13px">+${money(d.tongPhatSinhCo)} / -${money(d.tongPhatSinhNo)}</td>
                  <td class="n" style="color:#1e3a8a;font-size:13px">Cuối kỳ: ${money(d.soDuCuoiKy)}</td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- CHỮ KÝ / DẤU SỐ NGÂN HÀNG -->
        <div class="hd-sigs c2" style="margin-top:24px">
          <div>
            <h4>NGƯỜI KIỂM SOÁT</h4>
            <div class="role-sub">(Ký và ghi rõ họ tên)</div>
          </div>
          <div>
            <h4>NGÂN HÀNG XÁC NHẬN</h4>
            <div class="role-sub">(Ký số điện tử ngân hàng / Kiểm toán)</div>
            ${d.sigs && d.sigs.length ? `
              <div class="sig-stamp">
                <div class="stamp-box" style="border-color:#4338ca">
                  <div class="s-title" style="color:#4338ca">✔ CHỮ KÝ SỐ NGÂN HÀNG</div>
                  <div class="s-signer">Tổ chức: <b>${esc(d.sigs[0].cn || d.tenNganHang)}</b></div>
                  <div class="s-time">Thời điểm ký: ${esc(dateTimeVN(d.sigs[0].time))}</div>
                </div>
              </div>
            ` : `
              <div class="sig-stamp">
                <div class="stamp-box" style="border-color:#4338ca">
                  <div class="s-title" style="color:#4338ca">✔ XÁC THỰC SỔ PHỤ ĐIỆN TỬ</div>
                  <div class="s-signer">Ngân hàng: <b>${esc(d.tenNganHang)}</b></div>
                  <div class="s-time">Dữ liệu sao kê chính thức</div>
                </div>
              </div>
            `}
          </div>
        </div>
      </div>
      <div class="copyright">(C) August87 - 0982722036</div>
    `;
  }

  // =========================================================================
  // 6. HỒ SƠ ĐẤU THẦU QUA MẠNG (E-HSDT / E-HSMT - muasamcong.mpi.gov.vn)
  // =========================================================================

  function isProcurementXml(root) {
    const r = (root.localName || '').toUpperCase();
    if (r.startsWith('E_HSDT') || r.startsWith('E_HSMT') || r.startsWith('E_HSDX') || r === 'HOSODUTHAU' || r === 'HOSOMOITHAU' || r === 'GOITHAU' || r === 'DAUTHAU' || r === 'BAOLANHDUTHAU' || r === 'BANGGIADUTHAU' || r === 'HS_DUTHAU') return true;
    if (deep(root, 'maTBMT').length || (deep(root, 'maGoiThau').length && (deep(root, 'giaDuThau').length || deep(root, 'baoLanhDuThau').length || deep(root, 'bangGiaDuThau').length))) return true;
    return false;
  }

  function parseProcurement(root, fileName, readSignatures) {
    const maTBMT = deepTxt(root, 'maTBMT', 'soTBMT', 'soThongBao');
    const maGoiThau = deepTxt(root, 'maGoiThau', 'packageCode', 'maGoi');
    const tenGoiThau = deepTxt(root, 'tenGoiThau', 'packageName', 'tenGoi');
    const tenDuAn = deepTxt(root, 'tenDuAn', 'projectName', 'duAn');
    const hinhThucLCNT = deepTxt(root, 'hinhThucLCNT', 'procurementMethod', 'hinhThucDauThau') || 'Đấu thầu rộng rãi qua mạng';
    const phuongThucLCNT = deepTxt(root, 'phuongThucLCNT', 'phuongThuc') || 'Một giai đoạn một túi hồ sơ';
    const soQD = deepTxt(root, 'soQD', 'soQuyetDinh', 'decisionNo');

    // Bên mời thầu & Chủ đầu tư
    const chuDauTu = deepTxt(root, 'chuDauTu', 'investorName', 'chuDauTuTen');
    const benMoiThau = deepTxt(root, 'benMoiThau', 'procuringEntity', 'tenBMT') || chuDauTu;
    const diaChiBMT = deepTxt(root, 'diaChiBMT', 'diaChiBenMoiThau');

    // Nhà thầu
    const nhaThau = {
      ten: deepTxt(root, 'tenNhaThau', 'bidderName', 'tenDoiTac', 'nhaThau'),
      mst: deepTxt(root, 'mstNhaThau', 'bidderTaxCode', 'mst'),
      diaChi: deepTxt(root, 'diaChiNhaThau', 'diaChi'),
      lienDanh: /lien.*danh/i.test(deepTxt(root, 'hinhThucThamDu', 'tuCachNhaThau')) ? 'Nhà thầu liên danh' : 'Nhà thầu độc lập'
    };

    // Giá & Bảo lãnh dự thầu
    const giaDuThau = num(deepTxt(root, 'giaDuThau', 'tongGiaDuThau', 'bidPrice', 'giaDuThauCoThue'));
    const giaDuThauChuaThue = num(deepTxt(root, 'giaDuThauChuaThue', 'bidPriceNet'));
    const giaGiamGia = num(deepTxt(root, 'giaGiamGia', 'discountAmount')) || 0;
    const giaDuThauSauGiamGia = num(deepTxt(root, 'giaDuThauSauGiamGia', 'finalBidPrice')) || (giaDuThau != null ? giaDuThau - giaGiamGia : null);

    const baoLanh = {
      nganHang: deepTxt(root, 'nganHangBaoLanh', 'bankGuaranteeName', 'toChucTinDung'),
      giaTri: num(deepTxt(root, 'giaTriBaoLanh', 'guaranteeAmount', 'soTienBaoLanh')),
      hieuLuc: deepTxt(root, 'hieuLucBaoLanh', 'guaranteeValidity', 'thoiGianHieuLuc'),
      thoiGianThucHien: deepTxt(root, 'thoiGianThucHien', 'executionTime', 'thoiGianThucHienHopDong'),
      hieuLucHSDT: deepTxt(root, 'hieuLucHSDT', 'bidValidity')
    };

    // Bảng biểu giá dự thầu
    let itemNodes = deep(root, 'HangMuc');
    if (!itemNodes.length) itemNodes = deep(root, 'CongViec');
    if (!itemNodes.length) itemNodes = deep(root, 'BangGiaItem');
    if (!itemNodes.length) itemNodes = deep(root, 'Item');
    if (!itemNodes.length) itemNodes = deep(root, 'Row');

    const dsHangMuc = itemNodes.map((el, idx) => {
      const stt = deepTxt(el, 'stt', 'STT') || (idx + 1);
      const maHieu = deepTxt(el, 'maHieu', 'itemCode', 'maCV', 'maHang');
      const hangMuc = deepTxt(el, 'hangMuc', 'tenHangMuc', 'moTaCongViec', 'description', 'noiDung');
      const dvt = deepTxt(el, 'dvt', 'donViTinh', 'unit');
      const khoiLuong = num(deepTxt(el, 'khoiLuong', 'quantity', 'sl'));
      const donGia = num(deepTxt(el, 'donGia', 'unitPrice', 'dg'));
      const thanhTien = num(deepTxt(el, 'thanhTien', 'amount', 'tien')) || ((khoiLuong && donGia) ? Math.round(khoiLuong * donGia) : 0);
      const ghiChu = deepTxt(el, 'ghiChu', 'note');

      return { stt, maHieu, hangMuc, dvt, khoiLuong, donGia, thanhTien, ghiChu };
    });

    const tongTienHangMuc = dsHangMuc.reduce((s, h) => s + (h.thanhTien || 0), 0);
    const finalGiaDuThau = giaDuThau || tongTienHangMuc;

    return {
      kind: 'thau',
      fileName,
      title: `Hồ sơ Dự thầu (E-HSDT) ${maTBMT || maGoiThau || ''}`,
      sub: `${tenGoiThau || 'Gói thầu'} · ${nhaThau.ten}`,
      maTBMT,
      maGoiThau,
      tenGoiThau,
      tenDuAn,
      hinhThucLCNT,
      phuongThucLCNT,
      soQD,
      chuDauTu,
      benMoiThau,
      diaChiBMT,
      nhaThau,
      giaDuThau: finalGiaDuThau,
      giaDuThauChuaThue,
      giaGiamGia,
      giaDuThauSauGiamGia,
      baoLanh,
      dsHangMuc,
      mst: nhaThau.mst || '',
      ten: nhaThau.ten || '',
      ky: maTBMT,
      sigs: readSignatures(root),
      info: [
        ['Số TBMT', maTBMT],
        ['Mã gói thầu', maGoiThau],
        ['Tên gói thầu', tenGoiThau],
        ['Chủ đầu tư / BMT', benMoiThau],
        ['Nhà thầu tham dự', nhaThau.ten],
        ['MST nhà thầu', nhaThau.mst],
        ['Tư cách tham dự', nhaThau.lienDanh],
        ['Giá dự thầu', money(finalGiaDuThau) + ' VNĐ'],
        ['Bảo lãnh dự thầu', money(baoLanh.giaTri) + ' VNĐ (' + (baoLanh.nganHang || 'Ngân hàng') + ')'],
        ['Thời gian thực hiện', baoLanh.thoiGianThucHien || 'Theo HSMT']
      ]
    };
  }

  function renderProcurement(d) {
    return `
      <div class="top-strip">
        <div class="note ok">✔ Hồ sơ Dự thầu điện tử (Hệ thống Mạng Đấu thầu Quốc gia - muasamcong.mpi.gov.vn) · <span style="color:var(--muted)">Nguồn: ${esc(d.source)}</span></div>
        <div style="display:flex;gap:8px">
          <button type="button" class="btn-xuat-excel" style="background:#15803d;color:#fff;border-color:#15803d;font-weight:600">📊 Xuất Excel</button>
          <button class="primary" id="printBtn">In / Lưu PDF</button>
        </div>
      </div>
      <div class="paper thau-paper">
        <div class="thau-head">
          <div class="thau-brand">
            <h3>HỆ THỐNG MẠNG ĐẤU THẦU QUỐC GIA</h3>
            <div>Cổng thông tin đấu thầu: <b>muasamcong.mpi.gov.vn</b></div>
          </div>
          <div class="thau-title-box">
            <h2>HỒ SƠ DỰ THẦU ĐIỆN TỬ (E-HSDT)</h2>
            <div class="sub">Mã TBMT: <b style="color:#7c3aed;font-size:13.5px">${esc(d.maTBMT || '—')}</b></div>
            <div class="sub-date">Hình thức LCNT: <b>${esc(d.hinhThucLCNT)}</b></div>
          </div>
          <div class="thau-meta">
            <div>Mã gói thầu: <b>${esc(d.maGoiThau || '—')}</b></div>
            <div>Tư cách: <b class="tag-mst" style="background:#f5f3ff;color:#6d28d9">${esc(d.nhaThau.lienDanh)}</b></div>
          </div>
        </div>

        <!-- THÔNG TIN GÓI THẦU & BÊN MỜI THẦU -->
        <div class="thau-sec">
          <div class="sec-title">I. THÔNG TIN GÓI THẦU & BÊN MỜI THẦU</div>
          <div class="grid-2">
            <div class="span-2">Tên gói thầu: <b style="font-size:13.5px;color:#0f172a">${esc(d.tenGoiThau)}</b></div>
            ${d.tenDuAn ? `<div class="span-2">Thuộc dự án: <b>${esc(d.tenDuAn)}</b></div>` : ''}
            <div>Bên mời thầu / Chủ đầu tư: <b>${esc(d.benMoiThau)}</b></div>
            <div>Phương thức LCNT: ${esc(d.phuongThucLCNT)}</div>
          </div>
        </div>

        <!-- THÔNG TIN NHÀ THẦU & BẢO LÃNH -->
        <div class="thau-sec">
          <div class="sec-title">II. THÔNG TIN NHÀ THẦU & BẢO ĐẢM DỰ THẦU</div>
          <div class="grid-2">
            <div>Tên nhà thầu: <b style="font-size:13.5px;color:#6d28d9">${esc(d.nhaThau.ten)}</b></div>
            <div>Mã số thuế: <b class="tag-mst">${esc(d.nhaThau.mst)}</b></div>
            <div class="span-2">Địa chỉ nhà thầu: ${esc(d.nhaThau.diaChi || '—')}</div>
            <div>Giá trị bảo đảm dự thầu: <b style="color:#b91c1c">${money(d.baoLanh.giaTri)} VNĐ</b></div>
            <div>Ngân hàng phát hành bảo lãnh: <b>${esc(d.baoLanh.nganHang || '—')}</b></div>
            <div>Thời hạn hiệu lực bảo lãnh: <b>${esc(d.baoLanh.hieuLuc || '—')}</b></div>
            <div>Thời gian thực hiện hợp đồng: <b>${esc(d.baoLanh.thoiGianThucHien || '—')}</b></div>
          </div>
        </div>

        <!-- TỔNG KẾT TÀI CHÍNH -->
        <div class="thau-kpis">
          <div class="t-card">
            <div class="t-lbl">GIÁ DỰ THẦU (BAO GỒM THUẾ)</div>
            <div class="t-val" style="color:#7c3aed">${money(d.giaDuThau)} <span style="font-size:12px;font-weight:400">VNĐ</span></div>
          </div>
          ${d.giaGiamGia ? `
            <div class="t-card">
              <div class="t-lbl">GIÁ TRỊ GIẢM GIÁ</div>
              <div class="t-val" style="color:#15803d">-${money(d.giaGiamGia)} <span style="font-size:12px;font-weight:400">VNĐ</span></div>
            </div>
            <div class="t-card">
              <div class="t-lbl">GIÁ DỰ THẦU SAU GIẢM GIÁ</div>
              <div class="t-val" style="color:#b91c1c">${money(d.giaDuThauSauGiamGia)} <span style="font-size:12px;font-weight:400">VNĐ</span></div>
            </div>
          ` : ''}
        </div>

        <!-- BẢNG BIỂU GIÁ DỰ THẦU CHI TIẾT -->
        ${d.dsHangMuc && d.dsHangMuc.length ? `
          <div class="thau-sec" style="margin-top:16px">
            <div class="sec-title">III. BẢNG BIỂU GIÁ DỰ THẦU CHI TIẾT (${d.dsHangMuc.length} hạng mục)</div>
            <div style="overflow-x:auto">
              <table class="lines thau-table">
                <thead>
                  <tr>
                    <th style="width:38px">STT</th>
                    <th style="width:90px" class="c">Mã hiệu</th>
                    <th>Nội dung công việc / Hạng mục</th>
                    <th style="width:65px" class="c">ĐVT</th>
                    <th style="width:85px" class="n">Khối lượng</th>
                    <th style="width:115px" class="n">Đơn giá dự thầu</th>
                    <th style="width:135px" class="n">Thành tiền (VNĐ)</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  ${d.dsHangMuc.map(h => `
                    <tr>
                      <td class="c">${h.stt}</td>
                      <td class="c" style="font-family:Consolas,monospace;font-size:11.5px">${esc(h.maHieu)}</td>
                      <td><b>${esc(h.hangMuc)}</b></td>
                      <td class="c">${esc(h.dvt)}</td>
                      <td class="n">${h.khoiLuong != null ? money(h.khoiLuong) : ''}</td>
                      <td class="n">${money(h.donGia)}</td>
                      <td class="n" style="font-weight:700;color:#0f172a">${money(h.thanhTien)}</td>
                      <td style="font-size:11.5px;color:var(--muted)">${esc(h.ghiChu)}</td>
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot>
                  <tr style="background:#f8fafc;font-weight:700">
                    <td colspan="6" style="text-align:right">Tổng cộng giá trị dự thầu:</td>
                    <td class="n" style="color:#7c3aed;font-size:13.5px">${money(d.giaDuThau)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ` : ''}

        <!-- CHỮ KÝ SỐ NHÀ THẦU -->
        <div class="hd-sigs c2" style="margin-top:24px">
          <div>
            <h4>ĐẠI DIỆN LIÊN DANH / PHÓ GIÁM ĐỐC</h4>
            <div class="role-sub">(Nếu được ủy quyền)</div>
          </div>
          <div>
            <h4>ĐẠI DIỆN HỢP PHÁP CỦA NHÀ THẦU</h4>
            <div class="role-sub">(Người đại diện theo pháp luật ký số)</div>
            ${d.sigs && d.sigs.length ? `
              <div class="sig-stamp">
                <div class="stamp-box" style="border-color:#7c3aed">
                  <div class="s-title" style="color:#7c3aed">✔ KÝ BỞI NHÀ THẦU HỢP LỆ</div>
                  <div class="s-signer">Nhà thầu: <b>${esc(d.sigs[0].cn || d.nhaThau.ten)}</b></div>
                  ${d.sigs[0].mst ? `<div class="s-signer">MST: ${esc(d.sigs[0].mst)}</div>` : ''}
                  <div class="s-time">Thời điểm ký: ${esc(dateTimeVN(d.sigs[0].time))}</div>
                </div>
              </div>
            ` : `
              <div class="sig-stamp">
                <div class="stamp-box" style="border-color:#7c3aed">
                  <div class="s-title" style="color:#7c3aed">✔ HỒ SƠ DỰ THẦU QUA MẠNG</div>
                  <div class="s-signer">Nhà thầu: <b>${esc(d.nhaThau.ten)}</b></div>
                  <div class="s-time">Hồ sơ đã nộp thành công</div>
                </div>
              </div>
            `}
          </div>
        </div>
      </div>
      <div class="copyright">(C) August87 - 0982722036</div>
    `;
  }

  // Export to window
  window.NGANH_DOC = {
    isCustomsXml,
    parseCustoms,
    renderCustoms,
    isHealthcareXml,
    parseHealthcare,
    renderHealthcare,
    isTncnXml,
    parseTncn,
    renderTncn,
    isBhxhXml,
    parseBhxh,
    renderBhxh,
    isBankXml,
    parseBank,
    renderBank,
    isProcurementXml,
    parseProcurement,
    renderProcurement
  };
})();


