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

  // Export to window
  window.NGANH_DOC = {
    isCustomsXml,
    parseCustoms,
    renderCustoms,
    isHealthcareXml,
    parseHealthcare,
    renderHealthcare
  };
})();
