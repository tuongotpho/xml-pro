// xuat-excel.js — Xuất danh sách file XML (hóa đơn, tờ khai, BCTC...) ra file Excel (.xlsx) chuẩn OpenXML
// 100% offline, không cần thư viện ngoài, tận dụng JSZip có sẵn trong app.
(() => {
  'use strict';

  function xmlEsc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function colLetters(n) {
    let s = '', rem;
    while (n > 0) {
      rem = (n - 1) % 26;
      s = String.fromCharCode(65 + rem) + s;
      n = Math.floor((n - rem - 1) / 26);
    }
    return s;
  }

  function fmtDateStr(s) {
    if (!s) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return s;
  }

  function timTrangThaiThanhToan(inv) {
    const all = [...(inv.khacChung || []), ...(inv.khacToan || []), ...(inv.ban?.khac || []), ...(inv.mua?.khac || [])];
    for (const x of all) {
      if (/^trạng thái thanh toán$/i.test((x.k || '').trim())) return x.v || '';
    }
    return '';
  }

  async function buildXlsx(sheets) {
    if (!window.JSZip) throw new Error('Chưa nạp được thư viện JSZip.');
    const zip = new JSZip();

    let sheetOverrides = '';
    let sheetRels = '';
    let sheetList = '';

    sheets.forEach((sh, idx) => {
      const sheetNum = idx + 1;
      sheetOverrides += `<Override PartName="/xl/worksheets/sheet${sheetNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
      sheetRels += `<Relationship Id="rId${sheetNum}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${sheetNum}.xml"/>`;
      sheetList += `<sheet name="${xmlEsc(sh.name)}" sheetId="${sheetNum}" r:id="rId${sheetNum}"/>`;
    });

    // 1. [Content_Types].xml
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheetOverrides}
</Types>`);

    // 2. _rels/.rels
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);

    // 3. xl/_rels/workbook.xml.rels
    zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRels}
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

    // 4. xl/workbook.xml
    zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheetList}
  </sheets>
</workbook>`);

    // 5. xl/styles.xml
    zip.file('xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1">
    <numFmt numFmtId="164" formatCode="#,##0"/>
  </numFmts>
  <fonts count="4">
    <font><sz val="10"/><name val="Segoe UI"/><color rgb="FF1E293B"/></font>
    <font><b/><sz val="10.5"/><name val="Segoe UI"/><color rgb="FFFFFFFF"/></font>
    <font><b/><sz val="10"/><name val="Segoe UI"/><color rgb="FF0F172A"/></font>
    <font><i/><sz val="9.5"/><name val="Segoe UI"/><color rgb="FF64748B"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E3A8A"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
    </border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FF475569"/></top>
      <bottom style="double"><color rgb="FF0F172A"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="8">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="2" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`);

    // 6. Từng sheet
    sheets.forEach((sh, idx) => {
      const sheetNum = idx + 1;
      let sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`;

      if (sh.cols && sh.cols.length) {
        sheetXml += '<cols>';
        sh.cols.forEach((c, cIdx) => {
          const w = c.width || 15;
          sheetXml += `<col min="${cIdx + 1}" max="${cIdx + 1}" width="${w}" customWidth="1"/>`;
        });
        sheetXml += '</cols>';
      }

      sheetXml += '<sheetData>';

      // Tiêu đề cột (Dòng 1)
      let rowIndex = 1;
      sheetXml += `<row r="${rowIndex}" ht="28" customHeight="1">`;
      sh.headers.forEach((h, cIdx) => {
        const cellRef = colLetters(cIdx + 1) + rowIndex;
        sheetXml += `<c r="${cellRef}" t="inlineStr" s="1"><is><t>${xmlEsc(h)}</t></is></c>`;
      });
      sheetXml += '</row>';

      // Các dòng dữ liệu
      (sh.rows || []).forEach(row => {
        rowIndex++;
        sheetXml += `<row r="${rowIndex}" ht="21" customHeight="1">`;
        row.forEach((cell, cIdx) => {
          const cellRef = colLetters(cIdx + 1) + rowIndex;
          if (cell == null || cell === '') {
            sheetXml += `<c r="${cellRef}" s="3"/>`;
          } else if (typeof cell === 'number') {
            sheetXml += `<c r="${cellRef}" s="2"><v>${cell}</v></c>`;
          } else if (typeof cell === 'object') {
            if (cell.formula) {
              const style = cell.isMoney ? '5' : '6';
              sheetXml += `<c r="${cellRef}" s="${style}"><f>${xmlEsc(cell.formula)}</f></c>`;
            } else if (cell.isCenter) {
              sheetXml += `<c r="${cellRef}" t="inlineStr" s="4"><is><t>${xmlEsc(cell.text)}</t></is></c>`;
            } else if (cell.isBold) {
              sheetXml += `<c r="${cellRef}" t="inlineStr" s="6"><is><t>${xmlEsc(cell.text)}</t></is></c>`;
            } else if (cell.isMuted) {
              sheetXml += `<c r="${cellRef}" t="inlineStr" s="7"><is><t>${xmlEsc(cell.text)}</t></is></c>`;
            } else {
              sheetXml += `<c r="${cellRef}" t="inlineStr" s="3"><is><t>${xmlEsc(cell.text ?? '')}</t></is></c>`;
            }
          } else {
            sheetXml += `<c r="${cellRef}" t="inlineStr" s="3"><is><t>${xmlEsc(cell)}</t></is></c>`;
          }
        });
        sheetXml += '</row>';
      });

      sheetXml += '</sheetData></worksheet>';
      zip.file(`xl/worksheets/sheet${sheetNum}.xml`, sheetXml);
    });

    return await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', compression: 'DEFLATE' });
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 1500);
  }

  // Hàm xuất Excel chính
  async function xuatExcel(docs) {
    if (!docs || !docs.length) {
      alert('Chưa có file nào trong danh sách. Hãy chọn hoặc kéo thả file XML/ZIP trước khi xuất Excel!');
      return;
    }

    const validDocs = docs.filter(d => !d.error);
    if (!validDocs.length) {
      alert('Tất cả các file hiện tại đều bị lỗi định dạng, không thể xuất dữ liệu.');
      return;
    }

    const hdDocs = validDocs.filter(d => d.kind === 'hd');
    const hqDocs = validDocs.filter(d => d.kind === 'hq');
    const yteDocs = validDocs.filter(d => d.kind === 'yte');
    const tkDocs = validDocs.filter(d => d.kind !== 'hd' && d.kind !== 'hq' && d.kind !== 'yte');

    const sheets = [];

    // 1. Sheet: Bảng kê Hóa đơn điện tử
    if (hdDocs.length > 0) {
      const hdCols = [
        { width: 6 },  // STT
        { width: 14 }, // Phân loại/Trạng thái
        { width: 8 },  // Mẫu số
        { width: 11 }, // Ký hiệu
        { width: 11 }, // Số HĐ
        { width: 12 }, // Ngày lập
        { width: 34 }, // Tên người bán
        { width: 15 }, // MST người bán
        { width: 32 }, // Tên người mua
        { width: 15 }, // MST người mua
        { width: 18 }, // Tiền hàng chưa thuế
        { width: 16 }, // Tiền thuế GTGT
        { width: 15 }, // Phí khác
        { width: 19 }, // Tổng thanh toán
        { width: 16 }, // Trạng thái thanh toán
        { width: 14 }, // Hình thức TT
        { width: 26 }, // Mã CQT
        { width: 28 }, // Người ký bán
        { width: 18 }, // Ngày ký bán
        { width: 28 }, // HĐ liên quan
        { width: 30 }  // Tên file gốc
      ];

      const hdHeaders = [
        'STT', 'Trạng thái', 'Mẫu số', 'Ký hiệu', 'Số HĐ', 'Ngày lập',
        'Tên người bán', 'MST người bán', 'Tên người mua', 'MST người mua',
        'Tiền hàng (VNĐ)', 'Thuế GTGT (VNĐ)', 'Phí khác (VNĐ)', 'Tổng thanh toán (VNĐ)',
        'Trạng thái TT', 'Hình thức TT', 'Mã CQT cấp',
        'Người ký phát hành', 'Thời điểm ký', 'HĐ liên quan', 'Tên file XML'
      ];

      const hdRows = [];
      hdDocs.forEach((inv, i) => {
        const stt = i + 1;
        const ttStatus = timTrangThaiThanhToan(inv);
        const tongPhi = (inv.phi || []).reduce((sum, p) => sum + (Number(p.tien) || 0), 0);
        const lqTxt = inv.lienQuan ? `${inv.lienQuan.tc === '1' ? 'Thay thế' : 'Điều chỉnh'} HĐ ${inv.lienQuan.kh}-${inv.lienQuan.so} ngày ${inv.lienQuan.ngay || ''}` : '';
        const ttHD = inv.notes?.some(n => n[0] === 'warn') ? 'Cần kiểm tra' : 'Hợp lệ';

        hdRows.push([
          stt,
          { text: ttHD, isCenter: true },
          { text: inv.mau || '', isCenter: true },
          { text: inv.kyHieu || '', isCenter: true },
          { text: inv.so || '', isCenter: true },
          { text: fmtDateStr(inv.ngay), isCenter: true },
          inv.ban?.ten || '',
          { text: inv.ban?.mst || '', isCenter: true },
          inv.mua?.ten || '',
          { text: inv.mua?.mst || '', isCenter: true },
          typeof inv.tienHang === 'number' ? inv.tienHang : (Number(inv.tienHang) || 0),
          typeof inv.tongThue === 'number' ? inv.tongThue : (Number(inv.tongThue) || 0),
          tongPhi || 0,
          typeof inv.tong === 'number' ? inv.tong : (Number(inv.tong) || 0),
          { text: ttStatus || 'Chưa rõ', isCenter: true },
          { text: inv.httt || '', isCenter: true },
          inv.mccqt || '',
          inv.kyBan?.nguoiKy || '',
          inv.kyBan?.ngayKy || '',
          lqTxt,
          inv.fileName || inv.source || ''
        ]);
      });

      // Dòng tổng cộng
      if (hdDocs.length > 1) {
        const lastRow = hdDocs.length + 1;
        hdRows.push([
          { text: 'Tổng cộng', isBold: true },
          '', '', '', '', '', '', '', '', '',
          { formula: `SUM(K2:K${lastRow})`, isMoney: true },
          { formula: `SUM(L2:L${lastRow})`, isMoney: true },
          { formula: `SUM(M2:M${lastRow})`, isMoney: true },
          { formula: `SUM(N2:N${lastRow})`, isMoney: true },
          '', '', '', '', '', '', ''
        ]);
      }

      sheets.push({
        name: 'Bảng kê Hóa đơn',
        cols: hdCols,
        headers: hdHeaders,
        rows: hdRows
      });

      // 2. Sheet: Chi tiết hàng hóa Hóa đơn
      const lineCols = [
        { width: 6 },  // STT
        { width: 11 }, // Ký hiệu
        { width: 11 }, // Số HĐ
        { width: 12 }, // Ngày HĐ
        { width: 28 }, // Người bán
        { width: 8 },  // Dòng
        { width: 14 }, // Mã hàng
        { width: 35 }, // Tên hàng hóa, dịch vụ
        { width: 10 }, // ĐVT
        { width: 12 }, // Số lượng
        { width: 15 }, // Đơn giá
        { width: 14 }, // Chiết khấu
        { width: 11 }, // Thuế suất
        { width: 17 }  // Thành tiền
      ];

      const lineHeaders = [
        'STT HĐ', 'Ký hiệu', 'Số HĐ', 'Ngày HĐ', 'Bên bán',
        'STT hàng', 'Mã hàng', 'Tên hàng hóa, dịch vụ', 'Đơn vị tính',
        'Số lượng', 'Đơn giá (VNĐ)', 'Chiết khấu (VNĐ)', 'Thuế suất', 'Thành tiền (VNĐ)'
      ];

      const lineRows = [];
      hdDocs.forEach((inv, invIdx) => {
        const lines = inv.lines || [];
        lines.forEach(l => {
          lineRows.push([
            invIdx + 1,
            { text: inv.kyHieu || '', isCenter: true },
            { text: inv.so || '', isCenter: true },
            { text: fmtDateStr(inv.ngay), isCenter: true },
            inv.ban?.ten || '',
            { text: l.stt || '', isCenter: true },
            l.ma || '',
            l.ten || '',
            { text: l.dvt || '', isCenter: true },
            typeof l.sl === 'number' ? l.sl : (Number(l.sl) || 0),
            typeof l.dg === 'number' ? l.dg : (Number(l.dg) || 0),
            typeof l.stck === 'number' ? l.stck : (Number(l.stck) || 0),
            { text: l.ts || '', isCenter: true },
            typeof l.tien === 'number' ? l.tien : (Number(l.tien) || 0)
          ]);
        });
      });

      if (lineRows.length > 0) {
        if (lineRows.length > 1) {
          const lastLineRow = lineRows.length + 1;
          lineRows.push([
            { text: 'Tổng cộng', isBold: true },
            '', '', '', '', '', '', '', '',
            { formula: `SUM(J2:J${lastLineRow})`, isMoney: true },
            '',
            { formula: `SUM(L2:L${lastLineRow})`, isMoney: true },
            '',
            { formula: `SUM(N2:N${lastLineRow})`, isMoney: true }
          ]);
        }
        sheets.push({
          name: 'Chi tiết hàng hóa HĐ',
          cols: lineCols,
          headers: lineHeaders,
          rows: lineRows
        });
      }
    }

    // 2. Sheet: Bảng kê Tờ khai Hải quan
    if (hqDocs.length > 0) {
      const hqCols = [
        { width: 6 },  // STT
        { width: 14 }, // Phân luồng
        { width: 14 }, // Số tờ khai
        { width: 12 }, // Ngày đăng ký
        { width: 10 }, // Mã LH
        { width: 28 }, // Tên loại hình
        { width: 28 }, // Chi cục Hải quan
        { width: 32 }, // Đơn vị xuất khẩu
        { width: 15 }, // MST xuất khẩu
        { width: 32 }, // Đơn vị nhập khẩu
        { width: 15 }, // MST nhập khẩu
        { width: 16 }, // Vận đơn (B/L)
        { width: 15 }, // Số HĐ thương mại
        { width: 16 }, // Trị giá HĐ (Ngoại tệ)
        { width: 10 }, // Đồng tiền
        { width: 16 }, // Thuế XNK (VNĐ)
        { width: 16 }, // Thuế GTGT (VNĐ)
        { width: 18 }, // Tổng tiền thuế
        { width: 28 }  // Tên file gốc
      ];

      const hqHeaders = [
        'STT', 'Phân luồng', 'Số tờ khai', 'Ngày đăng ký', 'Mã LH',
        'Tên loại hình XNK', 'Chi cục Hải quan',
        'Đơn vị xuất khẩu', 'MST xuất khẩu', 'Đơn vị nhập khẩu', 'MST nhập khẩu',
        'Số vận đơn (B/L)', 'Số HĐ thương mại', 'Trị giá hóa đơn', 'Đồng tiền',
        'Tiền thuế XNK (VNĐ)', 'Tiền thuế GTGT (VNĐ)', 'Tổng tiền thuế (VNĐ)', 'Tên file XML'
      ];

      const hqRows = [];
      hqDocs.forEach((d, idx) => {
        const lName = d.luong?.name || 'LUỒNG XANH';
        hqRows.push([
          idx + 1,
          { text: lName, isCenter: true },
          { text: d.soTKhai || '', isCenter: true },
          { text: fmtDateStr(d.ngayDky), isCenter: true },
          { text: d.maLH || '', isCenter: true },
          d.tenLH || '',
          d.chiCucHQ || '',
          d.xk?.ten || '',
          { text: d.xk?.mst || '', isCenter: true },
          d.nk?.ten || '',
          { text: d.nk?.mst || '', isCenter: true },
          d.vanChuyen?.vanDon || '',
          d.hoaDon?.soHD || '',
          d.hoaDon?.triGia || 0,
          { text: d.hoaDon?.dongTien || 'USD', isCenter: true },
          d.tongThueXNK || 0,
          d.tongThueGTGT || 0,
          d.tongTienThue || 0,
          d.fileName || d.source || ''
        ]);
      });

      if (hqDocs.length > 1) {
        const lastHqRow = hqDocs.length + 1;
        hqRows.push([
          { text: 'Tổng cộng', isBold: true },
          '', '', '', '', '', '', '', '', '', '', '', '', '', '',
          { formula: `SUM(P2:P${lastHqRow})`, isMoney: true },
          { formula: `SUM(Q2:Q${lastHqRow})`, isMoney: true },
          { formula: `SUM(R2:R${lastHqRow})`, isMoney: true },
          ''
        ]);
      }

      sheets.push({
        name: 'Bảng kê Tờ khai Hải quan',
        cols: hqCols,
        headers: hqHeaders,
        rows: hqRows
      });

      // Sheet: Chi tiết hàng hóa XNK
      const hqItemCols = [
        { width: 6 },  // STT
        { width: 14 }, // Số tờ khai
        { width: 10 }, // Mã HS
        { width: 35 }, // Mô tả hàng hóa
        { width: 10 }, // Xuất xứ
        { width: 8 },  // ĐVT
        { width: 12 }, // Số lượng
        { width: 14 }, // Đơn giá
        { width: 17 }, // Trị giá tính thuế (VNĐ)
        { width: 12 }, // Thuế suất XNK
        { width: 16 }, // Tiền thuế XNK
        { width: 12 }, // Thuế suất GTGT
        { width: 16 }  // Tiền thuế GTGT
      ];

      const hqItemHeaders = [
        'STT dòng', 'Số tờ khai', 'Mã HS', 'Mô tả hàng hóa', 'Xuất xứ',
        'ĐVT', 'Số lượng', 'Đơn giá', 'Trị giá tính thuế (VNĐ)',
        'Thuế suất XNK', 'Tiền thuế XNK (VNĐ)', 'Thuế suất GTGT', 'Tiền thuế GTGT (VNĐ)'
      ];

      const hqItemRows = [];
      hqDocs.forEach(d => {
        (d.hangHoa || []).forEach((h, hIdx) => {
          hqItemRows.push([
            hIdx + 1,
            { text: d.soTKhai || '', isCenter: true },
            { text: h.maHS || '', isCenter: true },
            h.ten || '',
            { text: h.xuatXu || '', isCenter: true },
            { text: h.dvt || '', isCenter: true },
            h.sl || 0,
            h.dg || 0,
            h.triGiaTinhThue || h.triGia || 0,
            { text: h.tsXNK || '', isCenter: true },
            h.thueXNK || 0,
            { text: h.tsGTGT || '', isCenter: true },
            h.thueGTGT || 0
          ]);
        });
      });

      if (hqItemRows.length > 0) {
        if (hqItemRows.length > 1) {
          const lastItemRow = hqItemRows.length + 1;
          hqItemRows.push([
            { text: 'Tổng cộng', isBold: true },
            '', '', '', '', '',
            { formula: `SUM(G2:G${lastItemRow})`, isMoney: true },
            '',
            { formula: `SUM(I2:I${lastItemRow})`, isMoney: true },
            '',
            { formula: `SUM(K2:K${lastItemRow})`, isMoney: true },
            '',
            { formula: `SUM(M2:M${lastItemRow})`, isMoney: true }
          ]);
        }
        sheets.push({
          name: 'Chi tiết hàng hóa XNK',
          cols: hqItemCols,
          headers: hqItemHeaders,
          rows: hqItemRows
        });
      }
    }

    // 3. Sheet: Bảng kê Hồ sơ BHYT - Viện phí
    if (yteDocs.length > 0) {
      const yteCols = [
        { width: 6 },  // STT
        { width: 14 }, // Mã bệnh nhân
        { width: 26 }, // Họ tên bệnh nhân
        { width: 12 }, // Ngày sinh
        { width: 10 }, // Giới tính
        { width: 16 }, // Mã thẻ BHYT
        { width: 28 }, // Cơ sở KCB
        { width: 16 }, // Loại KCB
        { width: 12 }, // Ngày vào viện
        { width: 12 }, // Ngày ra viện
        { width: 10 }, // Số ngày ĐT
        { width: 10 }, // Mã bệnh (ICD-10)
        { width: 30 }, // Tên bệnh chính
        { width: 12 }, // Kết quả ĐT
        { width: 16 }, // Tổng chi phí KCB (VNĐ)
        { width: 16 }, // BHYT thanh toán (VNĐ)
        { width: 16 }, // BN cùng chi trả (VNĐ)
        { width: 16 }, // BN tự trả (VNĐ)
        { width: 28 }  // Tên file XML
      ];

      const yteHeaders = [
        'STT', 'Mã bệnh nhân', 'Họ tên bệnh nhân', 'Ngày sinh', 'Giới tính',
        'Mã thẻ BHYT', 'Cơ sở KCB', 'Hình thức KCB',
        'Ngày vào', 'Ngày ra', 'Số ngày', 'Mã ICD-10', 'Chẩn đoán bệnh', 'Kết quả ĐT',
        'Tổng chi phí (VNĐ)', 'BHYT thanh toán (VNĐ)', 'Người bệnh trả (VNĐ)', 'Ngoài danh mục (VNĐ)', 'Tên file XML'
      ];

      const yteRows = [];
      yteDocs.forEach((d, idx) => {
        yteRows.push([
          idx + 1,
          { text: d.maBN || '', isCenter: true },
          d.hoTen || '',
          { text: fmtDateStr(d.ngaySinh), isCenter: true },
          { text: d.gioiTinh || '', isCenter: true },
          { text: d.maThe || '', isCenter: true },
          d.tenCSKCB || '',
          { text: d.tenLoaiKCB || '', isCenter: true },
          { text: fmtDateStr(d.ngayVao), isCenter: true },
          { text: fmtDateStr(d.ngayRa), isCenter: true },
          d.soNgayDt || 1,
          { text: d.maBenh || '', isCenter: true },
          d.tenBenh || '',
          { text: d.ketQua || '', isCenter: true },
          d.tongChi || 0,
          d.bhytChi || 0,
          d.cungChiTra || 0,
          d.tuTra || 0,
          d.fileName || d.source || ''
        ]);
      });

      if (yteDocs.length > 1) {
        const lastYteRow = yteDocs.length + 1;
        yteRows.push([
          { text: 'Tổng cộng', isBold: true },
          '', '', '', '', '', '', '', '', '', '', '', '', '',
          { formula: `SUM(O2:O${lastYteRow})`, isMoney: true },
          { formula: `SUM(P2:P${lastYteRow})`, isMoney: true },
          { formula: `SUM(Q2:Q${lastYteRow})`, isMoney: true },
          { formula: `SUM(R2:R${lastYteRow})`, isMoney: true },
          ''
        ]);
      }

      sheets.push({
        name: 'Bảng kê Viện phí BHYT',
        cols: yteCols,
        headers: yteHeaders,
        rows: yteRows
      });

      // Sheet: Chi tiết thuốc & DVKT BHYT
      const medCols = [
        { width: 6 },  // STT
        { width: 14 }, // Mã BN
        { width: 22 }, // Họ tên BN
        { width: 14 }, // Phân loại (Thuốc / DVKT)
        { width: 12 }, // Mã mục
        { width: 35 }, // Tên thuốc / Dịch vụ kỹ thuật
        { width: 10 }, // ĐVT
        { width: 10 }, // Số lượng
        { width: 14 }, // Đơn giá
        { width: 16 }, // Thành tiền
        { width: 16 }  // Tiền BHYT trả
      ];

      const medHeaders = [
        'STT', 'Mã BN', 'Tên bệnh nhân', 'Phân loại', 'Mã mục',
        'Tên thuốc / Dịch vụ kỹ thuật', 'ĐVT', 'Số lượng', 'Đơn giá (VNĐ)', 'Thành tiền (VNĐ)', 'BHYT chi trả (VNĐ)'
      ];

      const medRows = [];
      let medIdx = 1;
      yteDocs.forEach(d => {
        (d.dsThuoc || []).forEach(t => {
          medRows.push([
            medIdx++,
            { text: d.maBN || '', isCenter: true },
            d.hoTen || '',
            { text: 'Thuốc / Dược', isCenter: true },
            { text: t.ma || '', isCenter: true },
            t.ten || '',
            { text: t.dvt || '', isCenter: true },
            t.sl || 0,
            t.dg || 0,
            t.tien || 0,
            t.tienBHYT || t.tien || 0
          ]);
        });
        (d.dsDVKT || []).forEach(v => {
          medRows.push([
            medIdx++,
            { text: d.maBN || '', isCenter: true },
            d.hoTen || '',
            { text: 'Dịch vụ KT', isCenter: true },
            { text: v.ma || '', isCenter: true },
            v.ten || '',
            { text: v.dvt || '', isCenter: true },
            v.sl || 0,
            v.dg || 0,
            v.tien || 0,
            v.tienBHYT || v.tien || 0
          ]);
        });
      });

      if (medRows.length > 0) {
        if (medRows.length > 1) {
          const lastMedRow = medRows.length + 1;
          medRows.push([
            { text: 'Tổng cộng', isBold: true },
            '', '', '', '', '', '',
            { formula: `SUM(H2:H${lastMedRow})`, isMoney: true },
            '',
            { formula: `SUM(J2:J${lastMedRow})`, isMoney: true },
            { formula: `SUM(K2:K${lastMedRow})`, isMoney: true }
          ]);
        }
        sheets.push({
          name: 'Chi tiết thuốc & DVKT',
          cols: medCols,
          headers: medHeaders,
          rows: medRows
        });
      }
    }

    // 3. Sheet: Hồ sơ & Tờ khai thuế
    if (tkDocs.length > 0) {
      const KIND_NAMES = {
        tk: 'Tờ khai thuế HTKK/eTax',
        nhap: 'Bản nháp HTKK DataFiles',
        tb: 'Thông báo thuế CQT',
        ct: 'Chứng từ nộp thuế',
        khac: 'Hồ sơ thuế khác'
      };

      const tkCols = [
        { width: 6 },  // STT
        { width: 22 }, // Loại hồ sơ
        { width: 14 }, // Mã tờ khai / Biểu
        { width: 38 }, // Tên tờ khai / Hồ sơ
        { width: 18 }, // Kỳ tính thuế
        { width: 16 }, // Mã số thuế
        { width: 35 }, // Tên người nộp thuế
        { width: 14 }, // Ngày nộp / Ngày lập
        { width: 30 }, // Người ký số
        { width: 18 }, // Ngày ký số
        { width: 30 }  // Tên file gốc
      ];

      const tkHeaders = [
        'STT', 'Loại hồ sơ', 'Mã biểu / Mẫu', 'Tên tờ khai / Báo cáo',
        'Kỳ tính thuế', 'Mã số thuế (MST)', 'Tên người nộp thuế (NNT)',
        'Ngày lập / Nộp', 'Người ký số', 'Thời điểm ký', 'Tên file XML'
      ];

      const tkRows = [];
      tkDocs.forEach((d, idx) => {
        const sig = d.sigs?.[0] || {};
        tkRows.push([
          idx + 1,
          { text: KIND_NAMES[d.kind] || 'Hồ sơ thuế', isCenter: true },
          { text: d.mtk || '', isCenter: true },
          d.title || '',
          { text: d.ky || '', isCenter: true },
          { text: d.mst || '', isCenter: true },
          d.ten || '',
          { text: fmtDateStr(d.ngay), isCenter: true },
          sig.nguoiKy || '',
          sig.ngayKy || '',
          d.fileName || d.source || ''
        ]);
      });

      sheets.push({
        name: 'Hồ sơ & Tờ khai thuế',
        cols: tkCols,
        headers: tkHeaders,
        rows: tkRows
      });
    }

    // Tạo file XLSX
    try {
      const blob = await buildXlsx(sheets);
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const tenFile = `Bang_ke_thue_${timestamp}.xlsx`;
      downloadBlob(blob, tenFile);
    } catch (e) {
      console.error(e);
      alert('Không xuất được file Excel: ' + e.message);
    }
  }

  window.xuatExcel = xuatExcel;
})();

