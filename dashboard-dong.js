// dashboard-dong.js - Bộ máy Duyệt Cây Thư Mục & Dashboard Động Thích Ứng Theo Ngữ Cảnh Chuyên Ngành
// 100% Client-side, hoàn toàn Offline, tối ưu cho Windows Desktop
(() => {
  'use strict';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
  const money = v => v == null || isNaN(v) ? '0' : nf.format(v);
  const dateVN = s => {
    if (!s) return '';
    const m = /^(\d{4})[-/]?(\d{2})[-/]?(\d{2})/.exec(s);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return s;
  };

  let curFilterFrom = '';
  let curFilterTo = '';
  let curSortCol = 'ngay';
  let curSortAsc = false;
  let activeFilter = null; // { type, val, label }

  function setDateFilter(from, to) {
    curFilterFrom = from || '';
    curFilterTo = to || '';
  }

  function setSort(col) {
    if (curSortCol === col) {
      curSortAsc = !curSortAsc;
    } else {
      curSortCol = col;
      curSortAsc = (col === 'shd' || col === 'ngay' || col === 'tien' || col === 'thue') ? false : true;
    }
  }

  function setInteractiveFilter(type, val, label) {
    if (activeFilter && activeFilter.type === type && activeFilter.val === val) {
      activeFilter = null; // Bấm lại thì hủy lọc
    } else {
      activeFilter = { type, val, label };
    }
  }

  function clearInteractiveFilter() {
    activeFilter = null;
  }

  function sortIcon(col) {
    if (curSortCol !== col) return '<span style="opacity:.3">↕</span>';
    return curSortAsc ? '▲' : '▼';
  }

  function layNgayChuan(d) {
    const raw = d.ngay || d.ky || '';
    if (!raw) return '';
    const m = String(raw).match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/) || String(raw).match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (!m) return '';
    if (m[3].length === 4) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  }

  const DOMAIN_INFO = {
    hd: { name: 'Hóa đơn & Thuế GTGT', icon: '🧾', color: '#1e3a8a', bg: '#eff6ff', tag: 'hd' },
    hq: { name: 'Hải quan & Logistics XNK', icon: '🚢', color: '#0369a1', bg: '#f0f9ff', tag: 'hq' },
    yte: { name: 'Bệnh viện & Giám định BHYT', icon: '🏥', color: '#047857', bg: '#ecfdf5', tag: 'yte' },
    nh: { name: 'Sổ phụ & Dòng tiền Ngân hàng', icon: '🏦', color: '#4338ca', bg: '#eef2ff', tag: 'nh' },
    nhansu: { name: 'Nhân sự, BHXH & Thuế TNCN', icon: '👥', color: '#c2410c', bg: '#fff7ed', tag: 'nhansu' },
    thau: { name: 'Đấu thầu & Mua sắm công', icon: '📑', color: '#7c3aed', bg: '#f5f3ff', tag: 'thau' },
    tonghop: { name: 'Tổng hợp Đa ngành', icon: '🌐', color: '#334155', bg: '#f8fafc', tag: 'tonghop' }
  };

  // =========================================================================
  // 1. CẤU TRÚC DỮ LIỆU CÂY THƯ MỤC (FOLDER TREE ENGINE)
  // =========================================================================

  // Trạng thái đóng/mở được giữ qua các lần dựng lại cây (key = đường dẫn thư mục)
  const trangThaiMo = new Map();

  class TreeNode {
    constructor(name, path, isRoot = false) {
      this.name = name;          // tên hiển thị (có thể gộp "A › B › C")
      this.path = path;          // đường dẫn đầy đủ dùng để lọc
      this.isRoot = isRoot;
      this.children = new Map();
      this.docIndices = [];      // file nằm trực tiếp trong thư mục
      this.allDocIndices = [];   // file trong thư mục và mọi thư mục con
      this.dominantDomain = 'tonghop';
      this.isExpanded = true;
    }
  }

  // Đường dẫn tương đối của file (bỏ ổ đĩa, đổi \ thành /)
  function duongDanFile(d) {
    return (d.relPath || d.duongDan || d.source || '').replace(/^[A-Za-z]:[\\/]/, '').replace(/\\/g, '/').replace(/\s*›\s*/g, '/');
  }

  function tachDuongDan(d) {
    const parts = duongDanFile(d).split('/').filter(p => p && p !== '.');
    if (parts.length > 1) { const fileName = parts.pop(); return { folders: parts, fileName }; }
    return { folders: [], fileName: parts[0] || 'file.xml' };
  }

  function buildFolderTree(docs) {
    const root = new TreeNode('Tất cả file đang mở', '', true);
    docs.forEach((d, idx) => {
      const { folders } = tachDuongDan(d);
      let cur = root, curPath = '';
      root.allDocIndices.push(idx);
      for (const fName of folders) {
        curPath = curPath ? `${curPath}/${fName}` : fName;
        if (!cur.children.has(fName)) cur.children.set(fName, new TreeNode(fName, curPath));
        cur = cur.children.get(fName);
        cur.allDocIndices.push(idx);
      }
      cur.docIndices.push(idx);
    });

    // Gộp chuỗi thư mục chỉ có đúng 1 thư mục con và không có file trực tiếp (BAN-RA › HD-DIEN-TU › XML)
    function gop(node) {
      for (const [k, ch] of Array.from(node.children.entries())) {
        let c = ch;
        while (c.children.size === 1 && c.docIndices.length === 0) {
          const only = c.children.values().next().value;
          only.name = `${c.name} › ${only.name}`;
          c = only;
        }
        node.children.set(k, c);
        gop(c);
      }
    }
    gop(root);

    // Chỉ có đúng 1 thư mục tổng và không có file lẻ: lấy luôn thư mục đó làm gốc
    let goc = root;
    if (root.children.size === 1 && root.docIndices.length === 0) {
      goc = root.children.values().next().value;
      goc.isRoot = true;
    }

    function phanTich(node, level) {
      node.dominantDomain = detectDominantDomain(node.allDocIndices.map(i => docs[i]));
      node.isExpanded = trangThaiMo.has(node.path) ? trangThaiMo.get(node.path) : level <= 1;
      for (const ch of node.children.values()) phanTich(ch, level + 1);
    }
    phanTich(goc, 0);
    return goc;
  }

  const daVe = new Map(); // trạng thái đóng/mở lần vẽ gần nhất
  function toggleNode(path) {
    const cur = trangThaiMo.has(path) ? trangThaiMo.get(path) : (daVe.has(path) ? daVe.get(path) : true);
    trangThaiMo.set(path, !cur);
  }

  function nhomNganh(kind) {
    if (kind === 'tk' || kind === 'ct' || kind === 'tb' || kind === 'nhap') return 'hd';
    if (kind === 'tncn' || kind === 'bhxh') return 'nhansu';
    if (DOMAIN_INFO[kind]) return kind;
    return 'khac';
  }

  function demTheoNganh(folderDocs) {
    const counts = {};
    for (const d of folderDocs || []) {
      if (!d || d.error) continue;
      const k = nhomNganh(d.kind);
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }

  function detectDominantDomain(folderDocs) {
    const counts = demTheoNganh(folderDocs);
    delete counts.khac;
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return 'tonghop';
    const total = entries.reduce((a, e) => a + e[1], 0);
    return (entries.length === 1 || entries[0][1] / total >= 0.55) ? entries[0][0] : 'tonghop';
  }

  // =========================================================================
  // 2. GIAO DIỆN CÂY THƯ MỤC BÊN THANH SIDEBAR (thư mục + file bên trong như Explorer)
  // =========================================================================

  function nhanFile(d) {
    if (d.error) return '⚠ ' + (d.source || '').split('/').pop();
    if (d.kind === 'hd') return `HĐ ${d.kyHieu || ''}-${d.so || ''} · ${d.ban?.Ten || d.ten || ''}`;
    if (d.kind === 'hq') return `HQ ${d.soTKhai || ''} · ${d.maLH || ''}`;
    if (d.kind === 'yte') return `KCB ${d.hoTen || ''} (${d.maBN || ''})`;
    if (d.kind === 'nh') return `NH ${d.tenNganHang || ''} · ${d.soTaiKhoan || ''}`;
    if (d.kind === 'tncn') return `TNCN ${d.soChungTu || ''} · ${d.caNhan?.hoTen || ''}`;
    if (d.kind === 'bhxh') return `BHXH ${d.maThuTuc || ''} · ${d.kyKeKhai || ''}`;
    if (d.kind === 'thau') return `HSDT ${d.maTBMT || ''} · ${d.nhaThau?.ten || ''}`;
    return d.title || d.fileName || 'Tài liệu XML';
  }
  function soTienFile(d) {
    if (d.error) return '';
    const v = d.kind === 'hd' || d.kind === 'ct' ? (d.tong != null ? d.tong : (d.tongTruocThue || 0) + (d.tongThue || 0))
      : d.kind === 'yte' ? d.tongChi
      : d.kind === 'hq' ? d.tongTienThue
      : d.kind === 'nh' ? (d.soDuCuoiKy ?? d.tongPhatSinhCo)
      : d.kind === 'tncn' ? d.soThueTNCNKhauTru
      : d.kind === 'bhxh' ? d.tongTienDong
      : d.kind === 'thau' ? (d.giaDuThau || d.giaDuThauSauGiamGia) : null;
    return v != null ? money(v) : '';
  }

  function renderTreeHtml(node, selectedPath, level = 0, docs = [], selectedDoc = -1) {
    // mở sẵn các thư mục cha của thư mục đang chọn
    if (selectedPath && node.path && selectedPath.startsWith(node.path + '/')) {
      node.isExpanded = true; trangThaiMo.set(node.path, true);
    }
    daVe.set(node.path, node.isExpanded);

    const isSelected = node.isRoot ? !selectedPath || selectedPath === node.path : node.path === selectedPath;
    const coNoiDung = node.children.size > 0 || node.docIndices.length > 0;
    const info = DOMAIN_INFO[node.dominantDomain] || DOMAIN_INFO.tonghop;
    const pad = level * 14 + 6;

    let html = `<div class="tree-node ${isSelected ? 'sel' : ''}" data-path="${esc(node.isRoot && node.path === '' ? '' : node.path)}" style="padding-left:${pad}px" title="${esc((node.path || node.name) + ' — bấm để xem Bảng điều hành')}">
        <span class="tree-toggle ${coNoiDung ? '' : 'leaf'}" data-path="${esc(node.path)}">${coNoiDung ? (node.isExpanded ? '▾' : '▸') : ''}</span>
        <span class="tree-icon">${node.isRoot ? '🗂️' : (node.isExpanded ? '📂' : '📁')}</span>
        <span class="tree-name">${esc(node.name)}</span>
        <span class="tree-tag" style="background:${info.bg};color:${info.color}" title="${esc(info.name)}">${info.icon} ${node.allDocIndices.length}</span>
      </div>`;

    if (node.isExpanded) {
      for (const child of node.children.values()) html += renderTreeHtml(child, selectedPath, level + 1, docs, selectedDoc);
      for (const i of node.docIndices) {
        const d = docs[i]; if (!d) continue;
        const pl = d.kind === 'hd' && d.phanLoai === 'ban' ? '<span class="tag-pl ban">BÁN</span>' : d.kind === 'hd' && d.phanLoai === 'mua' ? '<span class="tag-pl mua">MUA</span>' : '';
        html += `<div class="tree-file ${i === selectedDoc ? 'sel' : ''} ${d.error ? 'err' : ''}" data-i="${i}" style="padding-left:${pad + 28}px" title="${esc(d.source || '')}">
          <span class="tree-fname">${esc(nhanFile(d))}</span>${pl}<span class="tree-money">${esc(soTienFile(d))}</span></div>`;
      }
    }
    return html;
  }
  // =========================================================================
  // 3. CÁC MODULE DASHBOARD ĐỘNG THEO CHUYÊN NGÀNH
  // =========================================================================

  function phanLoaiTuPath(p) {
    if (!p) return null;
    const parts = String(p).replace(/^[A-Za-z]:[\/]/, '').replace(/\\/g, '/').split(/[\/\s*›\s*]+/).filter(Boolean);
    const folderParts = (parts.length > 1 && parts[parts.length - 1].toLowerCase().endsWith('.xml'))
      ? parts.slice(0, -1)
      : parts;
    for (let i = folderParts.length - 1; i >= 0; i--) {
      const seg = folderParts[i].toLowerCase();
      const hasMua = /(?:^|[_\W])(mua[-_ ]*vao|dau[-_ ]*vao|dauvao|nhap|mua|input|inbound)(?:$|[_\W])/i.test(seg);
      const hasBan = /(?:^|[_\W])(ban[-_ ]*ra|dau[-_ ]*ra|daura|xuat|ban|output|outbound)(?:$|[_\W])/i.test(seg);
      if (hasMua && hasBan) continue;
      if (hasBan) return 'ban';
      if (hasMua) return 'mua';
    }
    const fileName = parts[parts.length - 1] || '';
    if (/^(ban[-_]|xuat[-_]|output[-_])/i.test(fileName)) return 'ban';
    if (/^(mua[-_]|nhap[-_]|input[-_])/i.test(fileName)) return 'mua';
    return null;
  }

  // --- 3.1. DASHBOARD HÓA ĐƠN & THUẾ GTGT ---
  function renderDashboardHoaDon(docs, folderTitle, path) {
    let countBan = 0, tienBan = 0, thueBan = 0;
    let countMua = 0, tienMua = 0, thueMua = 0;
    let countWarn = 0;
    const thueSuatMap = {};
    const khachHangMap = {};
    const nhaCungCapMap = {};
    const warnList = [];

    // Áp dụng bộ lọc ngày nếu có
    const filtered = docs.filter(d => {
      if (d.error) return false;
      const dDate = layNgayChuan(d);
      if (curFilterFrom && dDate && dDate < curFilterFrom) return false;
      if (curFilterTo && dDate && dDate > curFilterTo) return false;
      return true;
    });

    // Nhận diện phân loại theo cấu trúc nhánh thư mục đang xem
    const folderPl = phanLoaiTuPath(path) || phanLoaiTuPath(folderTitle);

    
    function laHoaDonBan(d) {
      if (folderPl === 'ban') return true;
      if (folderPl === 'mua') return false;
      if (d.phanLoai === 'ban') return true;
      if (d.phanLoai === 'mua') return false;
      const filePl = phanLoaiTuPath(d.relPath || d.duongDan || d.source || '');
      if (filePl === 'ban') return true;
      if (filePl === 'mua') return false;
      return true;
    }

    filtered.forEach((d, idx) => {
      if (d.kind !== 'hd') return;
      const isBan = laHoaDonBan(d);
      const isMua = !isBan;


      const tienHang = d.tongTruocThue || d.tong || 0;
      const tienThue = d.tongThue || 0;

      if (isBan) {
        countBan++;
        tienBan += tienHang;
        thueBan += tienThue;
        const tenMua = d.mua?.Ten || d.mua?.MST || 'Khách vãng lai';
        khachHangMap[tenMua] = (khachHangMap[tenMua] || 0) + (d.tong || (tienHang + tienThue));
      } else if (isMua) {
        countMua++;
        tienMua += tienHang;
        thueMua += tienThue;
        const tenBan = d.ban?.Ten || d.ban?.MST || 'Nhà cung cấp khác';
        nhaCungCapMap[tenBan] = (nhaCungCapMap[tenBan] || 0) + (d.tong || (tienHang + tienThue));
      }
      // Thuế suất (hỗ trợ cả THTTLTSuat lẫn từng dòng hàng HHDVu)
      const tsList = (d.thueSuat && d.thueSuat.length)
        ? d.thueSuat
        : (d.lines || []).map(l => ({ ts: l.ts, tien: l.thTien || l.thanhTien || 0, thue: l.tThue || 0 }));
      tsList.forEach(ts => {
        const k = (ts.ts || 'KCT').trim();
        thueSuatMap[k] = (thueSuatMap[k] || 0) + (ts.tien || tienHang);
      });

      // Cảnh báo
      const warns = (d.notes || []).filter(n => n[0] === 'warn');
      if (warns.length) {
        countWarn++;
        warnList.push({ d, warns, idx });
      }
    });

    const thueChenh = thueBan - thueMua;
    const topKhach = Object.entries(khachHangMap).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const topNCC = Object.entries(nhaCungCapMap).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const tongDoanhSo = Object.values(thueSuatMap).reduce((a,b) => a + b, 0) || 1;

    return `
      <div class="dash-exec">
        <div class="dash-header hd">
          <div class="dash-h-left">
            <span class="dash-badge hd">🧾 HÓA ĐƠN & THUẾ GTGT</span>
            <h2>Bảng Điều Hành: ${esc(folderTitle)}</h2>
            <div class="dash-sub">Đường dẫn: <code>${esc(path || '/')}</code> • Tổng cộng: <b>${docs.length}</b> hóa đơn/chứng từ</div>
          </div>
          <div class="dash-actions">
            <button type="button" class="btn-xuat-excel" style="background:#15803d;color:#fff;border-color:#15803d;font-weight:600">📊 Xuất Excel</button>
            <button type="button" onclick="window.print()" class="primary">🖨️ In Báo Cáo</button>
          </div>
        </div>

        <!-- 4 KPI Cards có lọc tương tác khi bấm -->
        <div class="kpi-grid">
          <div class="kpi-card ban dash-filter-trigger ${activeFilter?.type === 'pl' && activeFilter?.val === 'ban' ? 'active-filter' : ''}" data-filter-type="pl" data-filter-val="ban" data-filter-label="Hóa đơn BÁN RA" title="Bấm để lọc bảng kê phía dưới chỉ hiện HĐ Bán ra">
            <div class="kpi-title">📤 TỔNG DOANH THU BÁN RA (${countBan} HĐ)</div>
            <div class="kpi-val">${money(tienBan)} <small>đ</small></div>
            <div class="kpi-sub">Thuế GTGT đầu ra: <b>${money(thueBan)} đ</b></div>
          </div>
          <div class="kpi-card mua dash-filter-trigger ${activeFilter?.type === 'pl' && activeFilter?.val === 'mua' ? 'active-filter' : ''}" data-filter-type="pl" data-filter-val="mua" data-filter-label="Hóa đơn MUA VÀO" title="Bấm để lọc bảng kê phía dưới chỉ hiện HĐ Mua vào">
            <div class="kpi-title">📥 TỔNG CHI PHÍ MUA VÀO (${countMua} HĐ)</div>
            <div class="kpi-val">${money(tienMua)} <small>đ</small></div>
            <div class="kpi-sub">Thuế GTGT đầu vào: <b>${money(thueMua)} đ</b></div>
          </div>
          <div class="kpi-card ${thueChenh >= 0 ? 'duong' : 'am'}">
            <div class="kpi-title">⚖️ NGHĨA VỤ THUẾ GTGT TẠM TÍNH</div>
            <div class="kpi-val">${thueChenh >= 0 ? '+' : '-'}${money(Math.abs(thueChenh))} <small>đ</small></div>
            <div class="kpi-sub">${thueChenh >= 0 ? '🔴 Dự kiến PHẢI NỘP ngân sách' : '🟢 Thuế GTGT CÒN ĐƯỢC KHẤU TRỪ'}</div>
          </div>
          <div class="kpi-card warn dash-filter-trigger ${activeFilter?.type === 'warn' ? 'active-filter' : ''}" data-filter-type="warn" data-filter-val="1" data-filter-label="Hóa đơn CẦN CHÚ Ý" title="Bấm để lọc bảng kê phía dưới chỉ hiện HĐ Cần kiểm tra">
            <div class="kpi-title">⚠️ HÓA ĐƠN CẦN CHÚ Ý</div>
            <div class="kpi-val">${countWarn} <small>HĐ</small></div>
            <div class="kpi-sub">${countWarn ? 'Cần đối chiếu số học & pháp lý' : '100% dữ liệu hợp lệ'}</div>
          </div>
        </div>

        <!-- 2 Cột Phân tích chi tiết -->
        <div class="dash-row-2">
          <!-- Cột 1: Phân bổ Thuế suất & Top Khách hàng -->
          <div class="dash-box">
            <h3>📈 Phân Bổ Doanh Số Theo Thuế Suất</h3>
            <div class="rate-bars">
              ${Object.entries(thueSuatMap).map(([ts, val]) => {
                const pct = Math.round((val / tongDoanhSo) * 100);
                return `
                  <div class="rate-item dash-filter-trigger ${activeFilter?.type === 'ts' && activeFilter?.val === ts ? 'active-filter' : ''}" data-filter-type="ts" data-filter-val="${esc(ts)}" data-filter-label="Thuế suất ${esc(ts)}" title="Bấm để lọc bảng kê theo thuế suất ${esc(ts)}">
                    <div class="rate-lbl"><span>Thuế suất: <b>${esc(ts)}</b></span> <span>${money(val)} đ (${pct}%)</span></div>
                    <div class="bar-bg"><div class="bar-fill" style="width:${pct}%"></div></div>
                  </div>
                `;
              }).join('') || '<div class="empty-hint">Chưa có số liệu thuế suất</div>'}
            </div>

            <h3 style="margin-top:16px">🏆 Top 5 Khách Hàng Lớn Nhất <small style="font-weight:400;color:#64748b">(Bấm dòng để lọc)</small></h3>
            <table class="dash-tbl">
              <thead><tr><th>#</th><th>Khách hàng</th><th style="text-align:right">Doanh số (VND)</th></tr></thead>
              <tbody>
                ${topKhach.map((k, i) => {
                  const isAct = activeFilter?.type === 'khach' && activeFilter?.val === k[0];
                  return `<tr class="dash-filter-trigger ${isAct ? 'active-filter' : ''}" data-filter-type="khach" data-filter-val="${esc(k[0])}" data-filter-label="Khách hàng: ${esc(k[0])}"><td>${i+1}</td><td><b>${esc(k[0])}</b></td><td style="text-align:right">${money(k[1])}</td></tr>`;
                }).join('') || '<tr><td colspan="3" style="text-align:center">Chưa có số liệu</td></tr>'}
              </tbody>
            </table>
          </div>

          <!-- Cột 2: Top Nhà cung cấp & Cảnh báo -->
          <div class="dash-box">
            <h3>🏭 Top 5 Nhà Cung Cấp Chi Phí Lớn Nhất <small style="font-weight:400;color:#64748b">(Bấm dòng để lọc)</small></h3>
            <table class="dash-tbl">
              <thead><tr><th>#</th><th>Nhà cung cấp</th><th style="text-align:right">Giá trị mua (VND)</th></tr></thead>
              <tbody>
                ${topNCC.map((k, i) => {
                  const isAct = activeFilter?.type === 'ncc' && activeFilter?.val === k[0];
                  return `<tr class="dash-filter-trigger ${isAct ? 'active-filter' : ''}" data-filter-type="ncc" data-filter-val="${esc(k[0])}" data-filter-label="Nhà cung cấp: ${esc(k[0])}"><td>${i+1}</td><td><b>${esc(k[0])}</b></td><td style="text-align:right">${money(k[1])}</td></tr>`;
                }).join('') || '<tr><td colspan="3" style="text-align:center">Chưa có số liệu</td></tr>'}
              </tbody>
            </table>

            <h3 style="margin-top:16px">⚠️ Danh Sách Hóa Đơn Cần Kiểm Tra (${warnList.length})</h3>
            <div class="warn-list-scroll">
              ${warnList.map(w => `
                <div class="warn-item-row" data-doc-idx="${w.idx}">
                  <b>${esc(w.d.title)}</b> (${esc(w.d.ten || w.d.mst)})<br>
                  <span style="color:#b91c1c">${esc(w.warns[0]?.[1] || 'Cần kiểm tra')}</span>
                </div>
              `).join('') || '<div style="color:#15803d;padding:8px 0">✓ Toàn bộ hóa đơn đều khớp số học, không có cảnh báo nào.</div>'}
            </div>
          </div>
        </div>

        <!-- Bảng kê Hóa đơn chi tiết có Sắp xếp, Lọc ngày & Lọc tương tác -->
        <div class="dash-box" style="margin-top:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;border-bottom:1px solid #f1f5f9;padding-bottom:10px">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <h3 style="margin:0;border:0;padding:0">📋 Bảng Kê Chi Tiết Hóa Đơn</h3>
              ${activeFilter ? `<div class="active-filter-indicator">🔍 Đang lọc: <b>${esc(activeFilter.label)}</b> <button type="button" class="btn-clear-dash-filter" title="Hủy bộ lọc này">✕ Bỏ lọc</button></div>` : ''}
            </div>
            <div class="dash-filter-group" style="display:flex;align-items:center;gap:8px;font-size:12px">
              <span>Khoảng ngày:</span>
              <input type="date" id="dashDateFrom" class="dash-inp-date" value="${curFilterFrom}">
              <span>-</span>
              <input type="date" id="dashDateTo" class="dash-inp-date" value="${curFilterTo}">
              <button type="button" id="btnApplyDateFilter" class="btn-dash-sm">Lọc</button>
              <button type="button" id="btnResetDateFilter" class="btn-dash-sm alt">Tất cả ngày</button>
            </div>
          </div>
          <div style="max-height:480px;overflow-y:auto">
            <table class="dash-tbl sortable-tbl">
              <thead>
                <tr>
                  <th style="width:36px">#</th>
                  <th class="th-sort" data-sort="loai">Loại ${sortIcon('loai')}</th>
                  <th class="th-sort" data-sort="shd">Số HĐ ${sortIcon('shd')}</th>
                  <th>Ký hiệu</th>
                  <th class="th-sort" data-sort="ngay">Ngày lập ${sortIcon('ngay')}</th>
                  <th class="th-sort" data-sort="ten">Đối tác ${sortIcon('ten')}</th>
                  <th class="th-sort" data-sort="mst">MST ${sortIcon('mst')}</th>
                  <th class="th-sort" data-sort="tien" style="text-align:right">Tiền hàng (VND) ${sortIcon('tien')}</th>
                  <th class="th-sort" data-sort="thue" style="text-align:right">Thuế GTGT ${sortIcon('thue')}</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                ${(() => {
                  // Lọc theo bộ lọc tương tác nếu có
                  const tableFiltered = filtered.filter(d => {
                    if (!activeFilter) return true;
                    if (activeFilter.type === 'pl') {
                      const isB = laHoaDonBan(d);
                      return activeFilter.val === 'ban' ? isB : !isB;
                    }
                    if (activeFilter.type === 'warn') {
                      return (d.notes || []).some(n => n[0] === 'warn');
                    }
                    if (activeFilter.type === 'ts') {
                        const hasTs = (d.thueSuat || []).some(t => String(t.ts || 'KCT').trim() === activeFilter.val);
                        const hasLine = (d.lines || []).some(l => String(l.ts || 'KCT').trim() === activeFilter.val);
                        return hasTs || hasLine;
                      }
                    if (activeFilter.type === 'khach') {
                      const ten = d.mua?.Ten || d.mua?.MST || '';
                      return ten === activeFilter.val;
                    }
                    if (activeFilter.type === 'ncc') {
                      const ten = d.ban?.Ten || d.ban?.MST || '';
                      return ten === activeFilter.val;
                    }
                    return true;
                  });

                  const sorted = [...tableFiltered].sort((a, b) => {
                    let vA, vB;
                    if (curSortCol === 'ngay') {
                      vA = layNgayChuan(a); vB = layNgayChuan(b);
                    } else if (curSortCol === 'shd') {
                      vA = parseInt(a.so, 10) || 0; vB = parseInt(b.so, 10) || 0;
                    } else if (curSortCol === 'tien') {
                      vA = (a.tongTruocThue || a.tong || 0); vB = (b.tongTruocThue || b.tong || 0);
                    } else if (curSortCol === 'thue') {
                      vA = (a.tongThue || 0); vB = (b.tongThue || 0);
                    } else if (curSortCol === 'ten') {
                      vA = (a.phanLoai === 'ban' ? (a.mua?.Ten || a.mua?.ten) : (a.ban?.Ten || a.ban?.ten)) || a.ten || '';
                      vB = (b.phanLoai === 'ban' ? (b.mua?.Ten || b.mua?.ten) : (b.ban?.Ten || b.ban?.ten)) || b.ten || '';
                    } else if (curSortCol === 'mst') {
                      vA = (a.phanLoai === 'ban' ? (a.mua?.MST || a.mua?.mst) : (a.ban?.MST || a.ban?.mst)) || a.mst || '';
                      vB = (b.phanLoai === 'ban' ? (b.mua?.MST || b.mua?.mst) : (b.ban?.MST || b.ban?.mst)) || b.mst || '';
                    } else if (curSortCol === 'loai') {
                      vA = a.phanLoai || ''; vB = b.phanLoai || '';
                    }
                    if (vA < vB) return curSortAsc ? -1 : 1;
                    if (vA > vB) return curSortAsc ? 1 : -1;
                    return 0;
                  });

                  return sorted.slice(0, 150).map((d, i) => {
                    const isB = laHoaDonBan(d);
                    const plTag = isB ? '<span class="tag-pl ban">BÁN RA</span>' : '<span class="tag-pl mua">MUA VÀO</span>';
                    const doiTac = (isB ? (d.mua?.Ten || d.mua?.ten) : (d.ban?.Ten || d.ban?.ten)) || d.ten || 'Chưa rõ';
                    const mst = (isB ? (d.mua?.MST || d.mua?.mst) : (d.ban?.MST || d.ban?.mst)) || d.mst || '';
                    const warns = (d.notes || []).filter(n => n[0] === 'warn');
                    const sttHtml = warns.length
                      ? `<span style="color:#b91c1c;font-weight:600" title="${esc(warns[0][1])}">⚠️ Cần kiểm tra</span>`
                      : `<span style="color:#15803d">✓ Hợp lệ</span>`;

                    return `
                      <tr class="dash-doc-click" data-doc-src="${esc(d.source)}">
                        <td>${i + 1}</td>
                        <td>${plTag}</td>
                        <td><b>${esc(d.so || '')}</b></td>
                        <td><code>${esc(d.kyHieu || '')}</code></td>
                        <td>${esc(dateVN(d.ngay))}</td>
                        <td><b>${esc(doiTac)}</b></td>
                        <td>${esc(mst)}</td>
                        <td style="text-align:right"><b>${money(d.tongTruocThue || d.tong)}</b></td>
                        <td style="text-align:right">${money(d.tongThue)}</td>
                        <td>${sttHtml}</td>
                      </tr>
                    `;
                  }).join('') || '<tr><td colspan="10" style="text-align:center;padding:12px;color:var(--muted)">Không có hóa đơn nào khớp bộ lọc</td></tr>';
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // --- 3.2. DASHBOARD HẢI QUAN & LOGISTICS XNK ---
  function renderDashboardHaiQuan(docs, folderTitle, path) {
    let xanh = 0, vang = 0, doCount = 0;
    let tongThueXNK = 0, tongThueGTGT = 0, tongTienThue = 0;
    let tongTriGiaUSD = 0;
    const chiCucMap = {};
    const loaiHinhMap = {};

    docs.forEach(d => {
      if (d.kind !== 'hq') return;
      const luong = (d.luong?.code || '').toLowerCase();
      if (luong === 'xanh' || (d.luong?.name || '').includes('XANH') || luong === '1') xanh++;
      else if (luong === 'do' || (d.luong?.name || '').includes('ĐỎ') || luong === '3') doCount++;
      else vang++;

      tongThueXNK += (d.tongThueXNK || 0);
      tongThueGTGT += (d.tongThueGTGT || 0);
      tongTienThue += (d.tongTienThue || 0);
      tongTriGiaUSD += (d.hoaDon?.triGia || 0);

      const cc = d.chiCucHQ || 'Chi cục khác';
      chiCucMap[cc] = (chiCucMap[cc] || 0) + 1;

      const lh = d.maLH ? `${d.maLH} - ${d.tenLH || ''}` : 'Loại hình khác';
      loaiHinhMap[lh] = (loaiHinhMap[lh] || 0) + 1;
    });

    const total = docs.length || 1;
    const pctXanh = Math.round((xanh / total) * 100);
    const pctVang = Math.round((vang / total) * 100);
    const pctDo = Math.round((doCount / total) * 100);

    return `
      <div class="dash-exec">
        <div class="dash-header hq">
          <div class="dash-h-left">
            <span class="dash-badge hq">🚢 HẢI QUAN & LOGISTICS XNK</span>
            <h2>Bảng Điều Hành: ${esc(folderTitle)}</h2>
            <div class="dash-sub">Đường dẫn: <code>${esc(path || '/')}</code> • Tổng số: <b>${docs.length}</b> tờ khai hải quan</div>
          </div>
          <div class="dash-actions">
            <button type="button" class="btn-xuat-excel" style="background:#15803d;color:#fff;border-color:#15803d;font-weight:600">📊 Xuất Excel</button>
            <button type="button" onclick="window.print()" class="primary">🖨️ In Báo Cáo</button>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card xanh">
            <div class="kpi-title">🟢 LUỒNG XANH (THÔNG QUAN)</div>
            <div class="kpi-val">${xanh} <small>tờ khai (${pctXanh}%)</small></div>
            <div class="kpi-sub">Miễn kiểm tra hồ sơ và hàng hóa</div>
          </div>
          <div class="kpi-card vang">
            <div class="kpi-title">🟡 LUỒNG VÀNG (KIỂM CHỨNG TỪ)</div>
            <div class="kpi-val">${vang} <small>tờ khai (${pctVang}%)</small></div>
            <div class="kpi-sub">Kiểm tra chi tiết hồ sơ hải quan</div>
          </div>
          <div class="kpi-card am">
            <div class="kpi-title">🔴 LUỒNG ĐỎ (KIỂM THỰC TẾ)</div>
            <div class="kpi-val">${doCount} <small>tờ khai (${pctDo}%)</small></div>
            <div class="kpi-sub">Kiểm tra chi tiết thực tế hàng hóa</div>
          </div>
          <div class="kpi-card pri">
            <div class="kpi-title">💵 TỔNG NGHĨA VỤ THUẾ XNK</div>
            <div class="kpi-val">${money(tongTienThue)} <small>đ</small></div>
            <div class="kpi-sub">Thuế XNK: ${money(tongThueXNK)} đ • GTGT: ${money(tongThueGTGT)} đ</div>
          </div>
        </div>

        <div class="dash-row-2">
          <div class="dash-box">
            <h3>🏢 Thống Kê Theo Chi Cục Hải Quan</h3>
            <table class="dash-tbl">
              <thead><tr><th>Chi cục Hải quan</th><th style="text-align:right">Số tờ khai</th></tr></thead>
              <tbody>
                ${Object.entries(chiCucMap).map(([cc, c]) => `<tr><td><b>${esc(cc)}</b></td><td style="text-align:right">${c}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div class="dash-box">
            <h3>📦 Thống Kê Theo Loại Hình XNK</h3>
            <table class="dash-tbl">
              <thead><tr><th>Mã & Tên loại hình</th><th style="text-align:right">Số tờ khai</th></tr></thead>
              <tbody>
                ${Object.entries(loaiHinhMap).map(([lh, c]) => `<tr><td><b>${esc(lh)}</b></td><td style="text-align:right">${c}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // --- 3.3. DASHBOARD BỆNH VIỆN & GIÁM ĐỊNH BHYT ---
  function renderDashboardYTe(docs, folderTitle, path) {
    let noiTru = 0, ngoaiTru = 0;
    let tongChiPhi = 0, tongBhyt = 0, tongNguoiBenh = 0, tongNgoaiDs = 0;
    const icdMap = {};

    docs.forEach(d => {
      if (d.kind !== 'yte') return;
      const isNoiTru = (d.tenLoaiKCB && d.tenLoaiKCB.toLowerCase().includes('nội trú')) || d.maLoaiKCB === '03' || (Number(d.soNgayDt) > 1);
      if (isNoiTru) noiTru++;
      else ngoaiTru++;

      tongChiPhi += (d.tongChi || 0);
      tongBhyt += (d.bhytChi || 0);
      tongNguoiBenh += (d.cungChiTra || 0);
      tongNgoaiDs += (d.tuTra || 0);

      const benh = d.tenBenh ? `${d.maBenh || ''} - ${d.tenBenh}` : (d.maBenh || 'Khác');
      icdMap[benh] = (icdMap[benh] || 0) + 1;
    });

    const topBenh = Object.entries(icdMap).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const pctBhyt = tongChiPhi ? Math.round((tongBhyt / tongChiPhi) * 100) : 0;

    return `
      <div class="dash-exec">
        <div class="dash-header yte">
          <div class="dash-h-left">
            <span class="dash-badge yte">🏥 BỆNH VIỆN & GIÁM ĐỊNH BHYT</span>
            <h2>Bảng Điều Hành: ${esc(folderTitle)}</h2>
            <div class="dash-sub">Đường dẫn: <code>${esc(path || '/')}</code> • Tổng cộng: <b>${docs.length}</b> hồ sơ KCB</div>
          </div>
          <div class="dash-actions">
            <button type="button" class="btn-xuat-excel" style="background:#15803d;color:#fff;border-color:#15803d;font-weight:600">📊 Xuất Excel</button>
            <button type="button" onclick="window.print()" class="primary">🖨️ In Báo Cáo</button>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card yte">
            <div class="kpi-title">🩺 TỔNG LƯỢT KHÁM CHỮA BỆNH</div>
            <div class="kpi-val">${docs.length} <small>lượt</small></div>
            <div class="kpi-sub">Nội trú: <b>${noiTru}</b> • Ngoại trú: <b>${ngoaiTru}</b></div>
          </div>
          <div class="kpi-card pri">
            <div class="kpi-title">🛡️ QUỸ BHYT CHI TRẢ (${pctBhyt}%)</div>
            <div class="kpi-val">${money(tongBhyt)} <small>đ</small></div>
            <div class="kpi-sub">Tổng chi phí KCB: <b>${money(tongChiPhi)} đ</b></div>
          </div>
          <div class="kpi-card ban">
            <div class="kpi-title">👤 NGƯỜI BỆNH CÙNG CHI TRẢ</div>
            <div class="kpi-val">${money(tongNguoiBenh)} <small>đ</small></div>
            <div class="kpi-sub">Trách nhiệm đồng chi trả của bệnh nhân</div>
          </div>
          <div class="kpi-card warn">
            <div class="kpi-title">💊 CHI PHÍ NGOÀI DANH MỤC</div>
            <div class="kpi-val">${money(tongNgoaiDs)} <small>đ</small></div>
            <div class="kpi-sub">Chi phí tự túc không thuộc phạm vi BHYT</div>
          </div>
        </div>

        <div class="dash-box" style="margin-top:14px">
          <h3>📋 Top 5 Nhóm Bệnh Chẩn Đoán ICD-10 Phổ Biến</h3>
          <table class="dash-tbl">
            <thead><tr><th>#</th><th>Mã & Tên chẩn đoán bệnh</th><th style="text-align:right">Số ca</th></tr></thead>
            <tbody>
              ${topBenh.map((b, i) => `<tr><td>${i+1}</td><td><b>${esc(b[0])}</b></td><td style="text-align:right">${b[1]}</td></tr>`).join('') || '<tr><td colspan="3" style="text-align:center">Chưa có số liệu</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // --- 3.4. DASHBOARD SỔ PHỤ & SAO KÊ NGÂN HÀNG ---
  function renderDashboardNganHang(docs, folderTitle, path) {
    let tongThu = 0, soMonThu = 0;
    let tongChi = 0, soMonChi = 0;
    let soDuDau = 0, soDuCuoi = 0;

    docs.forEach(d => {
      if (d.kind !== 'nh') return;
      soDuDau += (d.soDuDauKy || 0);
      soDuCuoi += (d.soDuCuoiKy || 0);
      if (d.tongPhatSinhCo != null || d.tongPhatSinhNo != null) {
        tongThu += (d.tongPhatSinhCo || 0);
        tongChi += (d.tongPhatSinhNo || 0);
        soMonThu += (d.soMonCo || 0);
        soMonChi += (d.soMonNo || 0);
      } else {
        (d.giaoDich || []).forEach(tx => {
          const amt = Math.abs(tx.soTien || 0);
          if (tx.loai === 'CRDT' || tx.soTien > 0) {
            tongThu += amt; soMonThu++;
          } else {
            tongChi += amt; soMonChi++;
          }
        });
      }
    });

    const netFlow = tongThu - tongChi;

    return `
      <div class="dash-exec">
        <div class="dash-header nh">
          <div class="dash-h-left">
            <span class="dash-badge nh">🏦 SỔ PHỤ & DÒNG TIỀN NGÂN HÀNG</span>
            <h2>Bảng Điều Hành: ${esc(folderTitle)}</h2>
            <div class="dash-sub">Đường dẫn: <code>${esc(path || '/')}</code> • Tổng số: <b>${docs.length}</b> sổ phụ/sao kê</div>
          </div>
          <div class="dash-actions">
            <button type="button" class="btn-xuat-excel" style="background:#15803d;color:#fff;border-color:#15803d;font-weight:600">📊 Xuất Excel</button>
            <button type="button" onclick="window.print()" class="primary">🖨️ In Báo Cáo</button>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card mua">
            <div class="kpi-title">📈 TỔNG DÒNG TIỀN VÀO (GHI CÓ +)</div>
            <div class="kpi-val">${money(tongThu)} <small>đ</small></div>
            <div class="kpi-sub">${soMonThu} giao dịch nộp tiền / chuyển khoản đến</div>
          </div>
          <div class="kpi-card am">
            <div class="kpi-title">📉 TỔNG DÒNG TIỀN RA (GHI NỢ -)</div>
            <div class="kpi-val">${money(tongChi)} <small>đ</small></div>
            <div class="kpi-sub">${soMonChi} giao dịch chi tiền / ủy nhiệm chi</div>
          </div>
          <div class="kpi-card ${netFlow >= 0 ? 'duong' : 'am'}">
            <div class="kpi-title">⚖️ DÒNG TIỀN RÒNG (NET CASHFLOW)</div>
            <div class="kpi-val">${netFlow >= 0 ? '+' : '-'}${money(Math.abs(netFlow))} <small>đ</small></div>
            <div class="kpi-sub">${netFlow >= 0 ? '🟢 Dòng tiền thuần DƯƠNG' : '🔴 Dòng tiền thuần ÂM'}</div>
          </div>
          <div class="kpi-card nh">
            <div class="kpi-title">🏁 SỐ DƯ TÀI KHOẢN CUỐI KỲ</div>
            <div class="kpi-val">${money(soDuCuoi)} <small>đ</small></div>
            <div class="kpi-sub">Số dư đầu kỳ: <b>${money(soDuDau)} đ</b></div>
          </div>
        </div>
      </div>
    `;
  }

  // --- 3.5. DASHBOARD NHÂN SỰ, BHXH & THUẾ TNCN ---
  function renderDashboardNhanSu(docs, folderTitle, path) {
    let tongLaoDong = 0, tongQuyLuong = 0, tongTienBhxh = 0;
    let tongThuNhapTncn = 0, tongThueTncn = 0, soChungTuTncn = 0;

    docs.forEach(d => {
      if (d.kind === 'bhxh') {
        tongLaoDong += (d.tongSoLaoDong || 0);
        tongQuyLuong += (d.tongQuyLuong || 0);
        tongTienBhxh += (d.tongTienDong || 0);
      } else if (d.kind === 'tncn') {
        soChungTuTncn++;
        tongThuNhapTncn += (d.tongThuNhapChiuThue || 0);
        tongThueTncn += (d.soThueTNCNKhauTru || 0);
      }
    });

    return `
      <div class="dash-exec">
        <div class="dash-header nhansu">
          <div class="dash-h-left">
            <span class="dash-badge nhansu">👥 NHÂN SỰ, BHXH & THUẾ TNCN</span>
            <h2>Bảng Điều Hành: ${esc(folderTitle)}</h2>
            <div class="dash-sub">Đường dẫn: <code>${esc(path || '/')}</code> • Tổng cộng: <b>${docs.length}</b> chứng từ/báo cáo</div>
          </div>
          <div class="dash-actions">
            <button type="button" class="btn-xuat-excel" style="background:#15803d;color:#fff;border-color:#15803d;font-weight:600">📊 Xuất Excel</button>
            <button type="button" onclick="window.print()" class="primary">🖨️ In Báo Cáo</button>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card bhxh">
            <div class="kpi-title">👨‍💼 LAO ĐỘNG THAM GIA BHXH</div>
            <div class="kpi-val">${tongLaoDong} <small>người</small></div>
            <div class="kpi-sub">Quỹ lương đóng: <b>${money(tongQuyLuong)} đ</b></div>
          </div>
          <div class="kpi-card pri">
            <div class="kpi-title">🏛️ NGHĨA VỤ NỘP BHXH (32%)</div>
            <div class="kpi-val">${money(tongTienBhxh)} <small>đ</small></div>
            <div class="kpi-sub">BHXH + BHYT + BHTN bắt buộc</div>
          </div>
          <div class="kpi-card tncn">
            <div class="kpi-title">🧾 THU NHẬP CHỊU THUẾ TNCN (${soChungTuTncn} người)</div>
            <div class="kpi-val">${money(tongThuNhapTncn)} <small>đ</small></div>
            <div class="kpi-sub">Tổng thu nhập chi trả theo chứng từ</div>
          </div>
          <div class="kpi-card am">
            <div class="kpi-title">💸 THUẾ TNCN ĐÃ KHẤU TRỪ</div>
            <div class="kpi-val">${money(tongThueTncn)} <small>đ</small></div>
            <div class="kpi-sub">Đã khấu trừ nộp vào Ngân sách Nhà nước</div>
          </div>
        </div>
      </div>
    `;
  }

  // --- 3.6. DASHBOARD ĐẤU THẦU & MUA SẮM CÔNG ---
  function renderDashboardDauThau(docs, folderTitle, path) {
    let tongGiaDuThau = 0, tongBaoLanh = 0;
    docs.forEach(d => {
      if (d.kind === 'thau') {
        tongGiaDuThau += (d.giaDuThau || 0);
        tongBaoLanh += (d.baoLanh?.giaTri || d.giaTriBaoLanh || 0);
      }
    });

    return `
      <div class="dash-exec">
        <div class="dash-header thau">
          <div class="dash-h-left">
            <span class="dash-badge thau">📑 ĐẤU THẦU & MUA SẮM CÔNG</span>
            <h2>Bảng Điều Hành: ${esc(folderTitle)}</h2>
            <div class="dash-sub">Đường dẫn: <code>${esc(path || '/')}</code> • Tổng số: <b>${docs.length}</b> gói thầu E-HSDT</div>
          </div>
        </div>
        <div class="kpi-grid">
          <div class="kpi-card thau">
            <div class="kpi-title">📑 SỐ GÓI THẦU THAM GIA</div>
            <div class="kpi-val">${docs.length} <small>hồ sơ</small></div>
            <div class="kpi-sub">Hồ sơ dự thầu điện tử trên Hệ thống QG</div>
          </div>
          <div class="kpi-card pri">
            <div class="kpi-title">💰 TỔNG GIÁ DỰ THẦU</div>
            <div class="kpi-val">${money(tongGiaDuThau)} <small>đ</small></div>
            <div class="kpi-sub">Cam kết giá dự thầu (đã gồm VAT)</div>
          </div>
          <div class="kpi-card ban">
            <div class="kpi-title">🛡️ BẢO LÃNH DỰ THẦU NGÂN HÀNG</div>
            <div class="kpi-val">${money(tongBaoLanh)} <small>đ</small></div>
            <div class="kpi-sub">Hạn mức thư bảo lãnh phát hành</div>
          </div>
        </div>
      </div>
    `;
  }

  // --- 3.7. DASHBOARD TỔNG HỢP ĐA NGÀNH ---
  function renderDashboardTongHop(docs, folderTitle, path) {
    const counts = {};
    docs.forEach(d => {
      const k = d.kind || 'khac';
      counts[k] = (counts[k] || 0) + 1;
    });

    return `
      <div class="dash-exec">
        <div class="dash-header tonghop">
          <div class="dash-h-left">
            <span class="dash-badge tonghop">🌐 TỔNG QUAN ĐA NGÀNH</span>
            <h2>Bảng Điều Hành: ${esc(folderTitle)}</h2>
            <div class="dash-sub">Đường dẫn: <code>${esc(path || '/')}</code> • Tổng cộng: <b>${docs.length}</b> tài liệu thuộc nhiều lĩnh vực</div>
          </div>
          <div class="dash-actions">
            <button type="button" class="btn-xuat-excel" style="background:#15803d;color:#fff;border-color:#15803d;font-weight:600">📊 Xuất Excel</button>
            <button type="button" onclick="window.print()" class="primary">🖨️ In Báo Cáo</button>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card ban">
            <div class="kpi-title">🧾 HÓA ĐƠN & THUẾ</div>
            <div class="kpi-val">${(counts.hd || 0) + (counts.tk || 0)} <small>tài liệu</small></div>
            <div class="kpi-sub">Hóa đơn điện tử, tờ khai thuế, chứng từ nộp</div>
          </div>
          <div class="kpi-card hq">
            <div class="kpi-title">🚢 HẢI QUAN XNK</div>
            <div class="kpi-val">${counts.hq || 0} <small>tờ khai</small></div>
            <div class="kpi-sub">Phân luồng hải quan, vận đơn B/L</div>
          </div>
          <div class="kpi-card yte">
            <div class="kpi-title">🏥 Y TẾ & BHYT</div>
            <div class="kpi-val">${counts.yte || 0} <small>hồ sơ</small></div>
            <div class="kpi-sub">Hồ sơ bệnh án, giám định viện phí</div>
          </div>
          <div class="kpi-card nh">
            <div class="kpi-title">🏦 NGÂN HÀNG & BHXH</div>
            <div class="kpi-val">${(counts.nh || 0) + (counts.bhxh || 0) + (counts.tncn || 0)} <small>chứng từ</small></div>
            <div class="kpi-sub">Sổ phụ, chứng từ TNCN, báo cáo BHXH</div>
          </div>
        </div>

        <div class="dash-box" style="margin-top:14px">
          <h3>📂 Danh Sách Tài Liệu Trong Thư Mục Này (${docs.length})</h3>
          <p style="color:var(--muted);font-size:12.5px;margin:0 0 10px">Bấm vào bất kỳ dòng nào bên dưới hoặc trên danh sách bên trái để mở tài liệu chi tiết.</p>
          <table class="dash-tbl">
            <thead><tr><th>#</th><th>Loại chứng từ</th><th>Tiêu đề / Ký hiệu</th><th>Ngày</th><th>Số tiền</th></tr></thead>
            <tbody>
              ${docs.slice(0, 25).map((d, i) => `
                <tr class="dash-doc-click" data-doc-src="${esc(d.source)}">
                  <td>${i+1}</td>
                  <td><span class="tag ${d.kind}">${d.kind.toUpperCase()}</span></td>
                  <td><b>${esc(d.title)}</b></td>
                  <td>${esc(dateVN(d.ngay))}</td>
                  <td style="text-align:right"><b>${money(d.tong || d.tongChiPhi || d.soDuCuoiKy || d.giaDuThau)}</b></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${docs.length > 25 ? `<div style="text-align:center;padding:8px;color:var(--muted);font-size:12px">... và còn ${docs.length - 25} tài liệu khác (xem danh sách bên trái)</div>` : ''}
        </div>
      </div>
    `;
  }

  // --- 3.8. HÀM ĐIỀU PHỐI CHÍNH ---
  function renderExecutiveDashboard(docs, folderTitle, path, dominantDomain) {
    const domain = dominantDomain || detectDominantDomain(docs);

    if (domain === 'hd') return renderDashboardHoaDon(docs, folderTitle, path);
    if (domain === 'hq') return renderDashboardHaiQuan(docs, folderTitle, path);
    if (domain === 'yte') return renderDashboardYTe(docs, folderTitle, path);
    if (domain === 'nh') return renderDashboardNganHang(docs, folderTitle, path);
    if (domain === 'nhansu') return renderDashboardNhanSu(docs, folderTitle, path);
    if (domain === 'thau') return renderDashboardDauThau(docs, folderTitle, path);
    return renderDashboardTongHop(docs, folderTitle, path);
  }

  // Xuất ra phạm vi toàn cục
  window.DASHBOARD_DONG = {
    buildFolderTree,
    renderTreeHtml,
    detectDominantDomain,
    renderExecutiveDashboard,
    toggleNode,
    setSort,
    setDateFilter,
    setInteractiveFilter,
    clearInteractiveFilter,
    getInteractiveFilter: () => activeFilter,
    getDateFilter: () => ({ from: curFilterFrom, to: curFilterTo }),
    getSort: () => ({ col: curSortCol, asc: curSortAsc }),
    DOMAIN_INFO
  };
})();

