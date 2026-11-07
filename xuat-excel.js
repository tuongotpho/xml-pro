// xuat-excel.js — Xuất danh sách file XML (hóa đơn, tờ khai, BCTC...) ra file Excel (.xlsx) chuẩn OpenXML
// 100% offline, không cần thư viện ngoài, tận dụng JSZip có sẵn trong app.
(() => {
  'use strict';

  function xmlEsc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
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
  /** Xuất một bảng bất kỳ, dùng cho Kho hoá đơn */
  window.xuatBangTuy = async (ten, sheets) => {
    const n = new Date(), p = v => String(v).padStart(2, '0');
    downloadBlob(await buildXlsx(sheets), `${ten}_${n.getFullYear()}${p(n.getMonth() + 1)}${p(n.getDate())}_${p(n.getHours())}${p(n.getMinutes())}.xlsx`);
  };

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
    const tncnDocs = validDocs.filter(d => d.kind === 'tncn');
    const bhxhDocs = validDocs.filter(d => d.kind === 'bhxh');
    const nhDocs = validDocs.filter(d => d.kind === 'nh');
    const thauDocs = validDocs.filter(d => d.kind === 'thau');
    const tkDocs = validDocs.filter(d => !['hd', 'hq', 'yte', 'tncn', 'bhxh', 'nh', 'thau'].includes(d.kind));

    const sheets = [];

    // 1. Sheet: Bảng kê Hóa đơn điện tử
    if (hdDocs.length > 0) {
      const hdCols = [
        { width: 6 },  // STT
        { width: 14 }, // Phân loại (Mua/Bán)
        { width: 14 }, // Trạng thái kiểm tra
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
        'STT', 'Phân loại', 'Trạng thái', 'Mẫu số', 'Ký hiệu', 'Số HĐ', 'Ngày lập',
        'Tên người bán', 'MST người bán', 'Tên người mua', 'MST người mua',
        'Tiền hàng (VNĐ)', 'Thuế GTGT (VNĐ)', 'Phí khác (VNĐ)', 'Tổng thanh toán (VNĐ)',
        'Trạng thái TT', 'Hình thức TT', 'Mã CQT cấp',
        'Người ký phát hành', 'Thời điểm ký', 'HĐ liên quan', 'Tên file XML'
      ];

      const hdRows = [];
      hdDocs.forEach((inv, i) => {
        const stt = i + 1;
        const plTxt = inv.phanLoai === 'ban' ? 'BÁN RA' : inv.phanLoai === 'mua' ? 'MUA VÀO' : 'CHƯA XÁC ĐỊNH';
        const ttStatus = timTrangThaiThanhToan(inv);
        const tongPhi = (inv.phi || []).reduce((sum, p) => sum + (Number(p.tien) || 0), 0);
        const lqTxt = inv.lienQuan ? `${inv.lienQuan.tc === '1' ? 'Thay thế' : 'Điều chỉnh'} HĐ ${inv.lienQuan.kh || ''}-${inv.lienQuan.so || ''} ngày ${inv.lienQuan.ngay || ''}` : '';
        const ttHD = inv.notes?.some(n => n[0] === 'warn') ? 'Cần kiểm tra' : 'Hợp lệ';

        const tenBan = inv.ban?.Ten || inv.ban?.ten || '';
        const mstBan = inv.ban?.MST || inv.ban?.mst || '';
        const tenMua = inv.mua?.Ten || inv.mua?.ten || '';
        const mstMua = inv.mua?.MST || inv.mua?.mst || '';
        const tienHang = inv.tongTruocThue != null ? inv.tongTruocThue : (inv.tienHang != null ? inv.tienHang : 0);
        const tongThue = inv.tongThue != null ? inv.tongThue : 0;
        const tongTien = inv.tong != null ? inv.tong : 0;
        const nguoiKy = inv.kyBan?.cn || inv.kyBan?.nguoiKy || '';
        const thoiDiemKy = inv.kyBan?.time || inv.kyBan?.ngayKy || '';

        hdRows.push([
          stt,
          { text: plTxt, isCenter: true },
          { text: ttHD, isCenter: true },
          { text: inv.mau || '', isCenter: true },
          { text: inv.kyHieu || '', isCenter: true },
          { text: inv.so || '', isCenter: true },
          { text: fmtDateStr(inv.ngay), isCenter: true },
          tenBan,
          { text: mstBan, isCenter: true },
          tenMua,
          { text: mstMua, isCenter: true },
          typeof tienHang === 'number' ? tienHang : (Number(tienHang) || 0),
          typeof tongThue === 'number' ? tongThue : (Number(tongThue) || 0),
          tongPhi || 0,
          typeof tongTien === 'number' ? tongTien : (Number(tongTien) || 0),
          { text: ttStatus || 'Chưa rõ', isCenter: true },
          { text: inv.httt || '', isCenter: true },
          inv.mccqt || '',
          nguoiKy,
          thoiDiemKy,
          lqTxt,
          inv.fileName || inv.source || ''
        ]);
      });

      // Dòng tổng cộng tách bạch theo phân loại nghiệp vụ
      if (hdDocs.length > 0) {
        const lastRow = hdDocs.length + 1;
        const hasBan = hdDocs.some(d => d.phanLoai === 'ban');
        const hasMua = hdDocs.some(d => d.phanLoai === 'mua');
        const hasKhac = hdDocs.some(d => d.phanLoai !== 'ban' && d.phanLoai !== 'mua');

        if (hasBan) {
          hdRows.push([
            { text: 'TỔNG BÁN RA (ĐẦU RA)', isBold: true },
            '', '', '', '', '', '', '', '', '', '',
            { formula: `SUMIF(B2:B${lastRow},"BÁN RA",L2:L${lastRow})`, isMoney: true },
            { formula: `SUMIF(B2:B${lastRow},"BÁN RA",M2:M${lastRow})`, isMoney: true },
            { formula: `SUMIF(B2:B${lastRow},"BÁN RA",N2:N${lastRow})`, isMoney: true },
            { formula: `SUMIF(B2:B${lastRow},"BÁN RA",O2:O${lastRow})`, isMoney: true },
            '', '', '', '', '', '', ''
          ]);
        }
        if (hasMua) {
          hdRows.push([
            { text: 'TỔNG MUA VÀO (ĐẦU VÀO)', isBold: true },
            '', '', '', '', '', '', '', '', '', '',
            { formula: `SUMIF(B2:B${lastRow},"MUA VÀO",L2:L${lastRow})`, isMoney: true },
            { formula: `SUMIF(B2:B${lastRow},"MUA VÀO",M2:M${lastRow})`, isMoney: true },
            { formula: `SUMIF(B2:B${lastRow},"MUA VÀO",N2:N${lastRow})`, isMoney: true },
            { formula: `SUMIF(B2:B${lastRow},"MUA VÀO",O2:O${lastRow})`, isMoney: true },
            '', '', '', '', '', '', ''
          ]);
        }
        if (hasKhac) {
          hdRows.push([
            { text: 'TỔNG CHƯA XÁC ĐỊNH', isBold: true },
            '', '', '', '', '', '', '', '', '', '',
            { formula: `SUMIF(B2:B${lastRow},"CHƯA XÁC ĐỊNH",L2:L${lastRow})`, isMoney: true },
            { formula: `SUMIF(B2:B${lastRow},"CHƯA XÁC ĐỊNH",M2:M${lastRow})`, isMoney: true },
            { formula: `SUMIF(B2:B${lastRow},"CHƯA XÁC ĐỊNH",N2:N${lastRow})`, isMoney: true },
            { formula: `SUMIF(B2:B${lastRow},"CHƯA XÁC ĐỊNH",O2:O${lastRow})`, isMoney: true },
            '', '', '', '', '', '', ''
          ]);
        }
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
            (inv.ban?.Ten || inv.ban?.ten || ''),
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

      // 3. Sheet: MISA AMIS - Hóa đơn mua vào
      const muaDocs = hdDocs.filter(d => d.phanLoai === 'mua' || d.phanLoai === 'khac');
      if (muaDocs.length > 0) {
        const misaMuaCols = [
          { width: 6 },  // STT
          { width: 12 }, // Số HĐ
          { width: 12 }, // Ngày HĐ
          { width: 10 }, // Mẫu số
          { width: 12 }, // Ký hiệu
          { width: 15 }, // MST người bán
          { width: 32 }, // Tên người bán
          { width: 32 }, // Tên hàng hóa, dịch vụ
          { width: 10 }, // ĐVT
          { width: 12 }, // Số lượng
          { width: 15 }, // Đơn giá
          { width: 18 }, // Tiền hàng chưa thuế
          { width: 12 }, // Thuế suất (%)
          { width: 16 }, // Tiền thuế GTGT
          { width: 18 }  // Tổng thanh toán
        ];
        const misaMuaHeaders = [
          'STT', 'Số HĐ', 'Ngày HĐ', 'Mẫu số', 'Ký hiệu', 'Mã NCC (MST)', 'Tên nhà cung cấp',
          'Tên hàng hóa, dịch vụ', 'ĐVT', 'Số lượng', 'Đơn giá', 'Thành tiền', 'Thuế suất', 'Tiền thuế', 'Tổng thanh toán'
        ];
        const misaMuaRows = [];
        let sttMua = 1;
        muaDocs.forEach(inv => {
          const items = (inv.lines && inv.lines.length) ? inv.lines : [{
            ten: inv.title || 'Hàng hóa, dịch vụ',
            dvt: '',
            sl: 1,
            dg: inv.tongTruocThue ?? inv.tienHang ?? 0,
            tien: inv.tongTruocThue ?? inv.tienHang ?? 0,
            ts: inv.thueSuat || ''
          }];
          items.forEach(l => {
            const tienHang = typeof l.tien === 'number' ? l.tien : (Number(l.tien) || 0);
            const tsNum = Number(String(l.ts || '').replace(/[^0-9.]/g, '')) || 0;
            const thueDong = typeof l.thue === 'number' ? l.thue : Math.round(tienHang * tsNum / 100);
            const tongDong = tienHang + thueDong;
            misaMuaRows.push([
              sttMua++,
              inv.so || '',
              inv.ngayLap || inv.ngay || '',
              inv.mau || inv.mauSo || '',
              inv.kyHieu || '',
              inv.ban?.MST || inv.mst || '',
              inv.ban?.Ten || inv.ban?.ten || '',
              l.ten || '',
              { text: l.dvt || '', isCenter: true },
              typeof l.sl === 'number' ? l.sl : (Number(l.sl) || 0),
              typeof l.dg === 'number' ? l.dg : (Number(l.dg) || 0),
              tienHang,
              { text: l.ts || '', isCenter: true },
              thueDong,
              tongDong
            ]);
          });
        });
        if (misaMuaRows.length > 0) {
          const lastM = misaMuaRows.length + 1;
          misaMuaRows.push([
            { text: 'TỔNG CỘNG MUA VÀO (MISA)', isBold: true },
            '', '', '', '', '', '', '', '', '', '',
            { formula: `SUM(L2:L${lastM})`, isMoney: true },
            '',
            { formula: `SUM(N2:N${lastM})`, isMoney: true },
            { formula: `SUM(O2:O${lastM})`, isMoney: true }
          ]);
          sheets.push({
            name: 'MISA - Mua vào',
            cols: misaMuaCols,
            headers: misaMuaHeaders,
            rows: misaMuaRows
          });
        }
      }

      // 4. Sheet: MISA AMIS - Hóa đơn bán ra
      const banDocs = hdDocs.filter(d => d.phanLoai === 'ban');
      if (banDocs.length > 0) {
        const misaBanCols = [
          { width: 6 },  // STT
          { width: 12 }, // Số HĐ
          { width: 12 }, // Ngày HĐ
          { width: 10 }, // Mẫu số
          { width: 12 }, // Ký hiệu
          { width: 15 }, // MST người mua
          { width: 32 }, // Tên người mua
          { width: 32 }, // Tên hàng hóa, dịch vụ
          { width: 10 }, // ĐVT
          { width: 12 }, // Số lượng
          { width: 15 }, // Đơn giá
          { width: 18 }, // Tiền hàng chưa thuế
          { width: 12 }, // Thuế suất (%)
          { width: 16 }, // Tiền thuế GTGT
          { width: 18 }  // Tổng thanh toán
        ];
        const misaBanHeaders = [
          'STT', 'Số HĐ', 'Ngày HĐ', 'Mẫu số', 'Ký hiệu', 'Mã KH (MST)', 'Tên khách hàng',
          'Tên hàng hóa, dịch vụ', 'ĐVT', 'Số lượng', 'Đơn giá', 'Thành tiền', 'Thuế suất', 'Tiền thuế', 'Tổng thanh toán'
        ];
        const misaBanRows = [];
        let sttBan = 1;
        banDocs.forEach(inv => {
          const items = (inv.lines && inv.lines.length) ? inv.lines : [{
            ten: inv.title || 'Hàng hóa, dịch vụ',
            dvt: '',
            sl: 1,
            dg: inv.tongTruocThue ?? inv.tienHang ?? 0,
            tien: inv.tongTruocThue ?? inv.tienHang ?? 0,
            ts: inv.thueSuat || ''
          }];
          items.forEach(l => {
            const tienHang = typeof l.tien === 'number' ? l.tien : (Number(l.tien) || 0);
            const tsNum = Number(String(l.ts || '').replace(/[^0-9.]/g, '')) || 0;
            const thueDong = typeof l.thue === 'number' ? l.thue : Math.round(tienHang * tsNum / 100);
            const tongDong = tienHang + thueDong;
            misaBanRows.push([
              sttBan++,
              inv.so || '',
              inv.ngayLap || inv.ngay || '',
              inv.mau || inv.mauSo || '',
              inv.kyHieu || '',
              inv.mua?.MST || '',
              inv.mua?.Ten || inv.mua?.ten || '',
              l.ten || '',
              { text: l.dvt || '', isCenter: true },
              typeof l.sl === 'number' ? l.sl : (Number(l.sl) || 0),
              typeof l.dg === 'number' ? l.dg : (Number(l.dg) || 0),
              tienHang,
              { text: l.ts || '', isCenter: true },
              thueDong,
              tongDong
            ]);
          });
        });
        if (misaBanRows.length > 0) {
          const lastB = misaBanRows.length + 1;
          misaBanRows.push([
            { text: 'TỔNG CỘNG BÁN RA (MISA)', isBold: true },
            '', '', '', '', '', '', '', '', '', '',
            { formula: `SUM(L2:L${lastB})`, isMoney: true },
            '',
            { formula: `SUM(N2:N${lastB})`, isMoney: true },
            { formula: `SUM(O2:O${lastB})`, isMoney: true }
          ]);
          sheets.push({
            name: 'MISA - Bán ra',
            cols: misaBanCols,
            headers: misaBanHeaders,
            rows: misaBanRows
          });
        }
      }

      // 5. Sheet: Bảng kê 01-1/GTGT (Bán ra) theo chuẩn TT80/HTKK
      if (banDocs.length > 0) {
        const bkBanCols = [
          { width: 6 },  // STT
          { width: 10 }, // Mẫu số
          { width: 12 }, // Ký hiệu
          { width: 12 }, // Số HĐ
          { width: 12 }, // Ngày HĐ
          { width: 32 }, // Tên người mua
          { width: 15 }, // MST người mua
          { width: 28 }, // Mặt hàng
          { width: 18 }, // Doanh số chưa thuế
          { width: 16 }, // Tiền thuế GTGT
          { width: 18 }  // Ghi chú
        ];
        const bkBanHeaders = [
          'STT', 'Mẫu số', 'Ký hiệu HĐ', 'Số HĐ', 'Ngày lập', 'Tên người mua', 'MST người mua',
          'Mặt hàng', 'Doanh số chưa thuế', 'Thuế GTGT', 'Ghi chú'
        ];
        const bkBanRows = [];
        let sttBkBan = 1;
        banDocs.forEach(inv => {
          const matHang = (inv.lines && inv.lines.length) ? inv.lines.map(l => l.ten).filter(Boolean).slice(0, 3).join(', ') : (inv.title || '');
          bkBanRows.push([
            sttBkBan++,
            inv.mau || inv.mauSo || '',
            inv.kyHieu || '',
            inv.so || '',
            inv.ngayLap || inv.ngay || '',
            inv.mua?.Ten || inv.mua?.ten || '',
            inv.mua?.MST || '',
            matHang,
            Number(inv.tongTruocThue ?? inv.tienHang) || 0,
            Number(inv.tongThue ?? inv.tienThue) || 0,
            [inv.lienQuan ? 'HĐ điều chỉnh/thay thế' : '', window.SO_TAY ? window.SO_TAY.ghiChu(inv) : ''].filter(Boolean).join(' · ')
          ]);
        });
        if (bkBanRows.length > 0) {
          const lastBk = bkBanRows.length + 1;
          bkBanRows.push([
            { text: 'TỔNG CỘNG PHỤ LỤC 01-1/GTGT', isBold: true },
            '', '', '', '', '', '', '',
            { formula: `SUM(I2:I${lastBk})`, isMoney: true },
            { formula: `SUM(J2:J${lastBk})`, isMoney: true },
            ''
          ]);
          sheets.push({
            name: 'Bảng kê 01-1_GTGT (Bán ra)',
            cols: bkBanCols,
            headers: bkBanHeaders,
            rows: bkBanRows
          });
        }
      }

      // 6. Sheet: Bảng kê 01-2/GTGT (Mua vào) theo chuẩn TT80/HTKK
      if (muaDocs.length > 0) {
        const bkMuaCols = [
          { width: 6 },  // STT
          { width: 10 }, // Mẫu số
          { width: 12 }, // Ký hiệu
          { width: 12 }, // Số HĐ
          { width: 12 }, // Ngày HĐ
          { width: 32 }, // Tên người bán
          { width: 15 }, // MST người bán
          { width: 28 }, // Mặt hàng
          { width: 18 }, // Giá trị mua chưa thuế
          { width: 16 }, // Tiền thuế GTGT được khấu trừ
          { width: 18 }  // Ghi chú
        ];
        const bkMuaHeaders = [
          'STT', 'Mẫu số', 'Ký hiệu HĐ', 'Số HĐ', 'Ngày lập', 'Tên người bán', 'MST người bán',
          'Mặt hàng', 'Giá trị chưa thuế', 'Thuế GTGT khấu trừ', 'Ghi chú'
        ];
        const bkMuaRows = [];
        let sttBkMua = 1;
        muaDocs.forEach(inv => {
          const matHang = (inv.lines && inv.lines.length) ? inv.lines.map(l => l.ten).filter(Boolean).slice(0, 3).join(', ') : (inv.title || '');
          bkMuaRows.push([
            sttBkMua++,
            inv.mau || inv.mauSo || '',
            inv.kyHieu || '',
            inv.so || '',
            inv.ngayLap || inv.ngay || '',
            inv.ban?.Ten || inv.ban?.ten || '',
            inv.ban?.MST || inv.mst || '',
            matHang,
            Number(inv.tongTruocThue ?? inv.tienHang) || 0,
            Number(inv.tongThue ?? inv.tienThue) || 0,
            inv.phanLoai === 'khac' ? 'Chưa xác định mua/bán' : ([inv.lienQuan ? 'HĐ điều chỉnh/thay thế' : '', window.SO_TAY ? window.SO_TAY.ghiChu(inv) : ''].filter(Boolean).join(' · '))
          ]);
        });
        if (bkMuaRows.length > 0) {
          const lastBkM = bkMuaRows.length + 1;
          bkMuaRows.push([
            { text: 'TỔNG CỘNG PHỤ LỤC 01-2/GTGT', isBold: true },
            '', '', '', '', '', '', '',
            { formula: `SUM(I2:I${lastBkM})`, isMoney: true },
            { formula: `SUM(J2:J${lastBkM})`, isMoney: true },
            ''
          ]);
          sheets.push({
            name: 'Bảng kê 01-2_GTGT (Mua vào)',
            cols: bkMuaCols,
            headers: bkMuaHeaders,
            rows: bkMuaRows
          });
        }
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

    // Sheet: Bảng kê Chứng từ khấu trừ TNCN
    if (tncnDocs.length > 0) {
      const tncnCols = [
        { width: 6 },  // STT
        { width: 14 }, // Số chứng từ
        { width: 12 }, // Ký hiệu
        { width: 10 }, // Mẫu số
        { width: 12 }, // Ngày lập
        { width: 32 }, // Đơn vị chi trả
        { width: 15 }, // MST đơn vị
        { width: 28 }, // Người nộp thuế
        { width: 15 }, // MST cá nhân
        { width: 16 }, // CCCD / CMND
        { width: 12 }, // Cá nhân cư trú
        { width: 24 }, // Khoản thu nhập
        { width: 16 }, // Kỳ trả thu nhập
        { width: 18 }, // Tổng thu nhập chịu thuế
        { width: 18 }, // Khoản giảm trừ
        { width: 18 }, // Thu nhập tính thuế
        { width: 18 }, // Thuế TNCN đã khấu trừ
        { width: 18 }, // Thu nhập thực nhận
        { width: 28 }, // Người ký số
        { width: 18 }, // Ngày ký
        { width: 28 }  // Tên file XML
      ];

      const tncnHeaders = [
        'STT', 'Số chứng từ', 'Ký hiệu', 'Mẫu số', 'Ngày lập',
        'Tổ chức, cá nhân chi trả', 'MST chi trả',
        'Người nộp thuế (Cá nhân)', 'MST cá nhân', 'CCCD/CMND', 'Cư trú',
        'Khoản thu nhập', 'Kỳ trả thu nhập',
        'Thu nhập chịu thuế (VNĐ)', 'Các khoản giảm trừ (VNĐ)', 'Thu nhập tính thuế (VNĐ)',
        'Thuế TNCN khấu trừ (VNĐ)', 'Thu nhập thực nhận (VNĐ)',
        'Đơn vị ký số', 'Thời điểm ký', 'Tên file XML'
      ];

      const tncnRows = [];
      tncnDocs.forEach((d, idx) => {
        const sig = d.sigs?.[0] || {};
        tncnRows.push([
          idx + 1,
          { text: d.soChungTu || '', isCenter: true },
          { text: d.kyHieu || '', isCenter: true },
          { text: d.mauSo || '', isCenter: true },
          { text: fmtDateStr(d.ngayLap), isCenter: true },
          d.toChuc?.ten || '',
          { text: d.toChuc?.mst || '', isCenter: true },
          d.caNhan?.hoTen || '',
          { text: d.caNhan?.mst || '', isCenter: true },
          { text: d.caNhan?.cccd || '', isCenter: true },
          { text: d.caNhan?.cuTru || 'Có', isCenter: true },
          d.khoanThuNhap || '',
          { text: d.thoiDiemTraThuNhap || '', isCenter: true },
          d.tongThuNhapChiuThue || 0,
          d.khoanGiamTru || 0,
          d.thuNhapTinhThue || 0,
          d.soThueTNCNKhauTru || 0,
          d.soThuNhapThucNhan || 0,
          sig.cn || '',
          sig.time || '',
          d.fileName || d.source || ''
        ]);
      });

      if (tncnDocs.length > 1) {
        const lastTncnRow = tncnDocs.length + 1;
        tncnRows.push([
          { text: 'Tổng cộng', isBold: true },
          '', '', '', '', '', '', '', '', '', '', '', '',
          { formula: `SUM(N2:N${lastTncnRow})`, isMoney: true },
          { formula: `SUM(O2:O${lastTncnRow})`, isMoney: true },
          { formula: `SUM(P2:P${lastTncnRow})`, isMoney: true },
          { formula: `SUM(Q2:Q${lastTncnRow})`, isMoney: true },
          { formula: `SUM(R2:R${lastTncnRow})`, isMoney: true },
          '', '', ''
        ]);
      }

      sheets.push({
        name: 'Chứng từ Khấu trừ TNCN',
        cols: tncnCols,
        headers: tncnHeaders,
        rows: tncnRows
      });
    }

    // Sheet: Bảng kê Hồ sơ BHXH
    if (bhxhDocs.length > 0) {
      const bhxhCols = [
        { width: 6 },  // STT
        { width: 14 }, // Mã thủ tục
        { width: 38 }, // Tên biểu mẫu
        { width: 14 }, // Kỳ kê khai
        { width: 12 }, // Ngày lập
        { width: 34 }, // Tên đơn vị
        { width: 14 }, // Mã đơn vị BHXH
        { width: 15 }, // MST đơn vị
        { width: 28 }, // Cơ quan BHXH
        { width: 12 }, // Số lao động
        { width: 18 }, // Tổng quỹ lương đóng
        { width: 18 }, // Tiền đóng (32%) / Trợ cấp
        { width: 28 }, // Người ký số
        { width: 18 }, // Ngày ký
        { width: 28 }  // Tên file XML
      ];

      const bhxhHeaders = [
        'STT', 'Mã thủ tục', 'Tên biểu mẫu hồ sơ', 'Kỳ kê khai', 'Ngày lập',
        'Tên đơn vị sử dụng lao động', 'Mã đơn vị BHXH', 'Mã số thuế',
        'Cơ quan BHXH quản lý', 'Số lao động', 'Tổng quỹ lương đóng (VNĐ)',
        'Tiền đóng / Đề nghị trợ cấp (VNĐ)', 'Người ký số', 'Thời điểm ký', 'Tên file XML'
      ];

      const bhxhRows = [];
      bhxhDocs.forEach((d, idx) => {
        const sig = d.sigs?.[0] || {};
        const tienDong = d.tongTienDeNghi || d.tongTienDong || 0;
        bhxhRows.push([
          idx + 1,
          { text: d.maThuTuc || '', isCenter: true },
          d.tenBieuMau || '',
          { text: d.kyKeKhai || '', isCenter: true },
          { text: fmtDateStr(d.ngayLap), isCenter: true },
          d.donVi?.ten || '',
          { text: d.donVi?.ma || '', isCenter: true },
          { text: d.donVi?.mst || '', isCenter: true },
          d.donVi?.coQuanBHXH || '',
          d.tongSoLaoDong || 0,
          d.tongQuyLuong || 0,
          tienDong,
          sig.cn || '',
          sig.time || '',
          d.fileName || d.source || ''
        ]);
      });

      if (bhxhDocs.length > 1) {
        const lastBhxhRow = bhxhDocs.length + 1;
        bhxhRows.push([
          { text: 'Tổng cộng', isBold: true },
          '', '', '', '', '', '', '', '',
          { formula: `SUM(J2:J${lastBhxhRow})`, isMoney: true },
          { formula: `SUM(K2:K${lastBhxhRow})`, isMoney: true },
          { formula: `SUM(L2:L${lastBhxhRow})`, isMoney: true },
          '', '', ''
        ]);
      }

      sheets.push({
        name: 'Hồ sơ BHXH',
        cols: bhxhCols,
        headers: bhxhHeaders,
        rows: bhxhRows
      });

      // Sheet phụ: Danh sách lao động BHXH
      const ldCols = [
        { width: 6 },  // STT
        { width: 14 }, // Mã đơn vị
        { width: 28 }, // Họ và tên
        { width: 14 }, // Mã số BHXH
        { width: 12 }, // Ngày sinh
        { width: 8 },  // Giới tính
        { width: 16 }, // Số CCCD
        { width: 24 }, // Chức vụ / Công việc
        { width: 16 }, // Mức lương đóng BH
        { width: 10 }, // Tỷ lệ đóng
        { width: 12 }, // Từ tháng
        { width: 20 }, // Chế độ / Trợ cấp
        { width: 16 }, // Số tiền trợ cấp
        { width: 24 }  // Phương án / Ghi chú
      ];

      const ldHeaders = [
        'STT', 'Mã đơn vị', 'Họ và tên lao động', 'Mã số BHXH',
        'Ngày sinh', 'Phái', 'Số CCCD/CMND', 'Chức danh / Nghề nghiệp',
        'Tiền lương đóng BH (VNĐ)', 'Tỷ lệ đóng', 'Từ tháng',
        'Chế độ hưởng', 'Tiền trợ cấp (VNĐ)', 'Phương án điều chỉnh / Ghi chú'
      ];

      const ldRows = [];
      let ldIdx = 1;
      bhxhDocs.forEach(d => {
        (d.dsLaoDong || []).forEach(l => {
          ldRows.push([
            ldIdx++,
            { text: d.donVi?.ma || '', isCenter: true },
            l.hoTen || '',
            { text: l.maSoBHXH || '', isCenter: true },
            { text: l.ngaySinh || '', isCenter: true },
            { text: l.gioiTinh || '', isCenter: true },
            { text: l.cccd || '', isCenter: true },
            l.chucVu || '',
            l.tienLuong || 0,
            { text: l.tyLeDong ? l.tyLeDong + '%' : '32%', isCenter: true },
            { text: l.tuThang || '', isCenter: true },
            l.loaiCheDo || '',
            l.tienDeNghi || 0,
            l.ghiChu || ''
          ]);
        });
      });

      if (ldRows.length > 0) {
        if (ldRows.length > 1) {
          const lastLdRow = ldRows.length + 1;
          ldRows.push([
            { text: 'Tổng cộng', isBold: true },
            '', '', '', '', '', '', '',
            { formula: `SUM(I2:I${lastLdRow})`, isMoney: true },
            '', '', '',
            { formula: `SUM(M2:M${lastLdRow})`, isMoney: true },
            ''
          ]);
        }
        sheets.push({
          name: 'Danh sách lao động BHXH',
          cols: ldCols,
          headers: ldHeaders,
          rows: ldRows
        });
      }
    }

    // Sheet: Sổ phụ Ngân hàng
    if (nhDocs.length > 0) {
      const nhCols = [
        { width: 6 },  // STT
        { width: 28 }, // Ngân hàng
        { width: 18 }, // Chi nhánh
        { width: 18 }, // Số tài khoản
        { width: 32 }, // Chủ tài khoản
        { width: 10 }, // Đồng tiền
        { width: 22 }, // Kỳ sao kê
        { width: 18 }, // Số dư đầu kỳ
        { width: 18 }, // Tổng phát sinh Có (+)
        { width: 10 }, // Món Có
        { width: 18 }, // Tổng phát sinh Nợ (-)
        { width: 10 }, // Món Nợ
        { width: 18 }, // Số dư cuối kỳ
        { width: 28 }  // Tên file XML
      ];

      const nhHeaders = [
        'STT', 'Tên Ngân hàng', 'Chi nhánh / PGD', 'Số tài khoản', 'Chủ tài khoản',
        'Đồng tiền', 'Kỳ sao kê', 'Số dư đầu kỳ',
        'Tổng phát sinh Có (+)', 'Món Có',
        'Tổng phát sinh Nợ (-)', 'Món Nợ',
        'Số dư cuối kỳ', 'Tên file XML'
      ];

      const nhRows = [];
      nhDocs.forEach((d, idx) => {
        nhRows.push([
          idx + 1,
          d.tenNganHang || '',
          d.chiNhanh || '',
          { text: d.soTaiKhoan || '', isCenter: true },
          d.chuTaiKhoan || '',
          { text: d.dongTien || 'VND', isCenter: true },
          { text: d.ky || '', isCenter: true },
          d.soDuDauKy || 0,
          d.tongPhatSinhCo || 0,
          d.soMonCo || 0,
          d.tongPhatSinhNo || 0,
          d.soMonNo || 0,
          d.soDuCuoiKy || 0,
          d.fileName || d.source || ''
        ]);
      });

      if (nhDocs.length > 1) {
        const lastNhRow = nhDocs.length + 1;
        nhRows.push([
          { text: 'Tổng phát sinh', isBold: true },
          '', '', '', '', '', '',
          '',
          { formula: `SUM(I2:I${lastNhRow})`, isMoney: true },
          { formula: `SUM(J2:J${lastNhRow})` },
          { formula: `SUM(K2:K${lastNhRow})`, isMoney: true },
          { formula: `SUM(L2:L${lastNhRow})` },
          '',
          ''
        ]);
      }
      sheets.push({
        name: 'Sổ phụ Ngân hàng',
        cols: nhCols,
        headers: nhHeaders,
        rows: nhRows
      });

      // Sheet phụ: Chi tiết giao dịch phát sinh
      const gdCols = [
        { width: 6 },  // STT
        { width: 16 }, // Số tài khoản
        { width: 12 }, // Ngày GD
        { width: 18 }, // Số tham chiếu
        { width: 12 }, // Loại GD
        { width: 18 }, // Số tiền GD
        { width: 18 }, // Số dư sau GD
        { width: 18 }, // TK đối ứng
        { width: 28 }, // Đối tác đối ứng
        { width: 20 }, // Ngân hàng đối tác
        { width: 45 }  // Diễn giải / Nội dung
      ];

      const gdHeaders = [
        'STT', 'Số tài khoản', 'Ngày GD', 'Mã / Số tham chiếu',
        'Loại GD', 'Số tiền giao dịch', 'Số dư sau GD',
        'Tài khoản đối ứng', 'Tên người / Đơn vị đối tác', 'Ngân hàng đối tác',
        'Nội dung chi tiết giao dịch'
      ];

      const gdRows = [];
      let gdIdx = 1;
      nhDocs.forEach(d => {
        (d.giaoDich || []).forEach(g => {
          const isCrdt = g.loaiGD === 'CRDT';
          gdRows.push([
            gdIdx++,
            { text: d.soTaiKhoan || '', isCenter: true },
            { text: g.ngayGD || '', isCenter: true },
            { text: g.soThamChieu || '', isCenter: true },
            { text: isCrdt ? 'GHI CÓ (+)' : 'GHI NỢ (-)', isCenter: true },
            g.soTien || 0,
            g.soDu || 0,
            { text: g.tkDoiUng || '', isCenter: true },
            g.tenDoiUng || '',
            g.nhDoiUng || '',
            g.noiDung || ''
          ]);
        });
      });

      if (gdRows.length > 0) {
        sheets.push({
          name: 'Giao dịch sao kê NH',
          cols: gdCols,
          headers: gdHeaders,
          rows: gdRows
        });
      }
    }

    // Sheet: Hồ sơ Đấu thầu
    if (thauDocs.length > 0) {
      const thauCols = [
        { width: 6 },  // STT
        { width: 18 }, // Số TBMT
        { width: 16 }, // Mã gói thầu
        { width: 35 }, // Tên gói thầu
        { width: 30 }, // Bên mời thầu / CDT
        { width: 32 }, // Tên nhà thầu
        { width: 15 }, // MST nhà thầu
        { width: 18 }, // Tư cách tham dự
        { width: 20 }, // Giá dự thầu (có VAT)
        { width: 16 }, // Giảm giá
        { width: 20 }, // Giá sau giảm giá
        { width: 18 }, // Giá trị bảo lãnh
        { width: 28 }, // Ngân hàng bảo lãnh
        { width: 16 }, // Thời gian TH
        { width: 28 }  // Tên file XML
      ];

      const thauHeaders = [
        'STT', 'Mã số TBMT', 'Mã gói thầu', 'Tên gói thầu',
        'Bên mời thầu / Chủ đầu tư', 'Tên nhà thầu tham dự', 'MST nhà thầu',
        'Tư cách tham dự', 'Giá dự thầu (VNĐ)', 'Giá trị giảm giá (VNĐ)',
        'Giá sau giảm giá (VNĐ)', 'Giá trị bảo lãnh (VNĐ)', 'Ngân hàng bảo lãnh',
        'Thời gian thực hiện', 'Tên file XML'
      ];

      const thauRows = [];
      thauDocs.forEach((d, idx) => {
        thauRows.push([
          idx + 1,
          { text: d.maTBMT || '', isCenter: true },
          { text: d.maGoiThau || '', isCenter: true },
          d.tenGoiThau || '',
          d.benMoiThau || '',
          d.nhaThau?.ten || '',
          { text: d.nhaThau?.mst || '', isCenter: true },
          { text: d.nhaThau?.lienDanh || 'Độc lập', isCenter: true },
          d.giaDuThau || 0,
          d.giaGiamGia || 0,
          d.giaDuThauSauGiamGia || 0,
          d.baoLanh?.giaTri || 0,
          d.baoLanh?.nganHang || '',
          d.baoLanh?.thoiGianThucHien || '',
          d.fileName || d.source || ''
        ]);
      });

      if (thauDocs.length > 1) {
        const lastThauRow = thauDocs.length + 1;
        thauRows.push([
          { text: 'Tổng cộng', isBold: true },
          '', '', '', '', '', '', '',
          { formula: `SUM(I2:I${lastThauRow})`, isMoney: true },
          { formula: `SUM(J2:J${lastThauRow})`, isMoney: true },
          { formula: `SUM(K2:K${lastThauRow})`, isMoney: true },
          { formula: `SUM(L2:L${lastThauRow})`, isMoney: true },
          '', '', ''
        ]);
      }

      sheets.push({
        name: 'Hồ sơ Đấu thầu',
        cols: thauCols,
        headers: thauHeaders,
        rows: thauRows
      });

      // Sheet phụ: Biểu giá dự thầu chi tiết
      const bgCols = [
        { width: 6 },  // STT
        { width: 18 }, // Số TBMT
        { width: 28 }, // Tên nhà thầu
        { width: 14 }, // Mã hiệu
        { width: 42 }, // Hạng mục / Công việc
        { width: 10 }, // ĐVT
        { width: 12 }, // Khối lượng
        { width: 16 }, // Đơn giá dự thầu
        { width: 18 }, // Thành tiền
        { width: 20 }  // Ghi chú
      ];

      const bgHeaders = [
        'STT', 'Mã số TBMT', 'Tên nhà thầu', 'Mã hiệu',
        'Nội dung công việc / Hạng mục', 'ĐVT', 'Khối lượng',
        'Đơn giá dự thầu (VNĐ)', 'Thành tiền (VNĐ)', 'Ghi chú'
      ];

      const bgRows = [];
      let bgIdx = 1;
      thauDocs.forEach(d => {
        (d.dsHangMuc || []).forEach(h => {
          bgRows.push([
            bgIdx++,
            { text: d.maTBMT || '', isCenter: true },
            d.nhaThau?.ten || '',
            { text: h.maHieu || '', isCenter: true },
            h.hangMuc || '',
            { text: h.dvt || '', isCenter: true },
            h.khoiLuong || 0,
            h.donGia || 0,
            h.thanhTien || 0,
            h.ghiChu || ''
          ]);
        });
      });

      if (bgRows.length > 0) {
        if (bgRows.length > 1) {
          const lastBgRow = bgRows.length + 1;
          bgRows.push([
            { text: 'Tổng cộng', isBold: true },
            '', '', '', '', '', '', '',
            { formula: `SUM(I2:I${lastBgRow})`, isMoney: true },
            ''
          ]);
        }
        sheets.push({
          name: 'Bảng giá dự thầu chi tiết',
          cols: bgCols,
          headers: bgHeaders,
          rows: bgRows
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

    // Đối chiếu tờ khai 01/GTGT ↔ hoá đơn ↔ giấy nộp tiền (doi-chieu.js)
    const dsDoiChieu = window.DOI_CHIEU ? window.DOI_CHIEU.tinh(docs) : [];
    if (dsDoiChieu.length) {
      const KQ = { khop: 'Khớp', lech: 'LỆCH', chuaCoHD: 'Chưa nạp HĐ kỳ này' };
      const dcRows = [];
      const them = (k, muc, ten, toKhai, hoaDon, khop, ghiChu) => dcRows.push([
        dcRows.length + 1, k.tk.ten || '', { text: k.tk.mst, isCenter: true }, { text: k.tk.kyTen, isCenter: true },
        { text: k.tk.lanDau ? 'Lần đầu' : 'Bổ sung ' + k.tk.soLan, isCenter: true }, muc, ten,
        toKhai == null ? '' : Math.round(toKhai), hoaDon == null ? '' : Math.round(hoaDon),
        toKhai == null || hoaDon == null ? '' : Math.round(toKhai - hoaDon),
        { text: khop ? 'Khớp' : 'LỆCH', isCenter: true, isBold: !khop }, ghiChu || ''
      ]);
      dsDoiChieu.forEach(k => {
        them(k, 'Tổng hợp', `${k.soMua} HĐ mua vào, ${k.soBan} HĐ bán ra trong kỳ`, null, null, k.trangThai !== 'lech', KQ[k.trangThai] + (k.soLech ? ` (${k.soLech} điểm lệch)` : ''));
        k.dong.filter(r => r.toKhai || r.hoaDon || !r.khop).forEach(r => them(k, 'Chỉ tiêu', `${r.ma} ${r.ten}`, r.toKhai, r.hoaDon, r.khop, r.goiY.map(g => g.text).join(' | ')));
        k.phuLuc.forEach(r => them(k, r.ben === 'mua' ? 'PL giảm thuế - mua vào' : 'PL giảm thuế - bán ra', r.ten, r.toKhai, r.hoaDon, r.khop,
          (r.ghiChu ? r.ghiChu + ' | ' : '') + `Thuế trên PL ${Math.round(r.thueToKhai).toLocaleString('vi-VN')} / theo HĐ ${Math.round(r.thueHoaDon).toLocaleString('vi-VN')}`));
        k.noiBo.filter(r => !r.khop).forEach(r => them(k, 'Số học tờ khai', r.bt, r.trai, r.phai, false, 'Tờ khai ghi khác với công thức'));
        if (k.dauKy) them(k, 'Đầu kỳ – cuối kỳ', `[22] kỳ này / [43] lần đầu ${k.dauKy.ky}`, k.dauKy.ct22, k.dauKy.ct43Truoc, k.dauKy.khop, '');
        if (k.daNop) them(k, 'Nộp thuế', '[40] phải nộp / đã nộp (tiểu mục 1701)', k.daNop.phaiNop, k.daNop.daNop, k.daNop.khop, k.daNop.chungTu.map(c => 'CT ' + c.so + ' ngày ' + c.ngay).join(', '));
      });
      sheets.push({
        name: 'Đối chiếu tờ khai GTGT',
        cols: [{ width: 6 }, { width: 34 }, { width: 13 }, { width: 13 }, { width: 11 }, { width: 20 }, { width: 46 }, { width: 16 }, { width: 16 }, { width: 14 }, { width: 10 }, { width: 70 }],
        headers: ['STT', 'Người nộp thuế', 'MST', 'Kỳ', 'Lần khai', 'Mục', 'Chỉ tiêu / Đối tác', 'Trên tờ khai', 'Cộng từ hoá đơn / Tính ra', 'Lệch', 'Kết quả', 'Gợi ý / Ghi chú'],
        rows: dcRows
      });
    }

    // Tạo file XLSX (kèm sheet Thuế TNDN & Lợi nhuận và Kiểm toán rủi ro HĐ nếu có dữ liệu)
    const shTndn = window.DASHBOARD_KE_TOAN && window.DASHBOARD_KE_TOAN.xuatTndnExcel ? window.DASHBOARD_KE_TOAN.xuatTndnExcel(docs) : null;
    if (shTndn) sheets.push(shTndn);
    const shKt = window.KIEM_TOAN_MISA && window.KIEM_TOAN_MISA.xuatKiemToanExcel ? window.KIEM_TOAN_MISA.xuatKiemToanExcel(docs) : null;
    if (shKt) sheets.push(shKt);
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

