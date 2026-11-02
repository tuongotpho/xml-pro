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

  class TreeNode {
    constructor(name, path, isRoot = false) {
      this.name = name;
      this.path = path;
      this.isRoot = isRoot;
      this.children = new Map();
      this.docIndices = [];     // Các file nằm trực tiếp trong thư mục này
      this.allDocIndices = [];  // Toàn bộ file trong thư mục này và tất cả thư mục con
      this.kindCounts = {};
      this.dominantDomain = 'tonghop';
      this.isExpanded = true;
    }
  }

  function tachDuongDan(d) {
    let raw = d.relPath || d.duongDan || d.source || '';
    raw = raw.replace(/^[A-Za-z]:[\\/]/, '').replace(/\\/g, '/');
    const parts = raw.split('/').filter(p => p && p !== '.');
    if (parts.length > 1) {
      const fileName = parts.pop();
      return { folders: parts, fileName };
    }
    return { folders: ['(Thư mục gốc)'], fileName: parts[0] || 'file.xml' };
  }

  function buildFolderTree(docs) {
    const root = new TreeNode('Tất cả thư mục', '', true);

    docs.forEach((d, idx) => {
      if (d.error) return;
      const { folders } = tachDuongDan(d);
      let cur = root;
      let curPath = '';

      folders.forEach((fName, i) => {
        curPath = curPath ? `${curPath}/${fName}` : fName;
        if (!cur.children.has(fName)) {
          cur.children.set(fName, new TreeNode(fName, curPath));
        }
        cur = cur.children.get(fName);
        cur.allDocIndices.push(idx);
      });

      cur.docIndices.push(idx);
      root.allDocIndices.push(idx);
    });

    function phanTichNode(node) {
      node.kindCounts = {};
      node.allDocIndices.forEach(i => {
        const d = docs[i];
        if (!d) return;
        const k = d.kind || 'khac';
        node.kindCounts[k] = (node.kindCounts[k] || 0) + 1;
      });

      // Xác định ngành chủ đạo
      node.dominantDomain = detectDominantDomain(node.allDocIndices.map(i => docs[i]));

      for (const child of node.children.values()) {
        phanTichNode(child);
      }
    }

    phanTichNode(root);
    return root;
  }

  function detectDominantDomain(folderDocs) {
    if (!folderDocs || !folderDocs.length) return 'tonghop';
    const counts = {};
    for (const d of folderDocs) {
      if (!d || d.error) continue;
      let k = d.kind;
      if (k === 'tk' || k === 'ct' || k === 'tb') k = 'hd';
      if (k === 'tncn' || k === 'bhxh') k = 'nhansu';
      counts[k] = (counts[k] || 0) + 1;
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (!total) return 'tonghop';

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const [topKind, topCount] = entries[0];

    if (entries.length === 1 || topCount / total >= 0.55) {
      return topKind;
    }
    return 'tonghop';
  }

  // =========================================================================
  // 2. GIAO DIỆN CÂY THƯ MỤC BÊN THANH SIDEBAR
  // =========================================================================

  function renderTreeHtml(node, selectedPath, level = 0) {
    const isSelected = (node.path === selectedPath) || (node.isRoot && !selectedPath);
    const hasChildren = node.children.size > 0;
    const info = DOMAIN_INFO[node.dominantDomain] || DOMAIN_INFO.tonghop;
    const indent = level * 14;

    let html = `
      <div class="tree-node ${isSelected ? 'sel' : ''}" data-path="${esc(node.path)}" style="padding-left:${indent + 6}px">
        <span class="tree-toggle ${hasChildren ? '' : 'leaf'}" data-path="${esc(node.path)}">${hasChildren ? (node.isExpanded ? '▾' : '▸') : '•'}</span>
        <span class="tree-icon">${node.isRoot ? '🗂️' : (hasChildren ? (node.isExpanded ? '📂' : '📁') : '📄')}</span>
        <span class="tree-name" title="${esc(node.path || node.name)}">${esc(node.name)}</span>
        <span class="tree-tag" style="background:${info.bg};color:${info.color}" title="${esc(info.name)}">${info.icon} ${node.allDocIndices.length}</span>
      </div>
    `;

    if (hasChildren && node.isExpanded) {
      for (const child of node.children.values()) {
        html += renderTreeHtml(child, selectedPath, level + 1);
      }
    }

    return html;
  }

  // =========================================================================
  // 3. CÁC MODULE DASHBOARD ĐỘNG THEO CHUYÊN NGÀNH
  // =========================================================================

  // --- 3.1. DASHBOARD HÓA ĐƠN & THUẾ GTGT ---
  function renderDashboardHoaDon(docs, folderTitle, path) {
    let countBan = 0, tienBan = 0, thueBan = 0;
    let countMua = 0, tienMua = 0, thueMua = 0;
    let countWarn = 0;
    const thueSuatMap = {};
    const khachHangMap = {};
    const nhaCungCapMap = {};
    const warnList = [];

    docs.forEach((d, idx) => {
      if (d.kind !== 'hd') return;
      const isBan = d.phanLoai === 'ban';
      const isMua = d.phanLoai === 'mua';
      const tienHang = d.tongTruocThue || d.tong || 0;
      const tienThue = d.tongThue || 0;

      if (isBan) {
        countBan++;
        tienBan += tienHang;
        thueBan += tienThue;
        const tenMua = d.mua?.Ten || d.mua?.MST || 'Khách vãng lai';
        khachHangMap[tenMua] = (khachHangMap[tenMua] || 0) + (d.tong || tienHang);
      } else if (isMua) {
        countMua++;
        tienMua += tienHang;
        thueMua += tienThue;
        const tenBan = d.ban?.Ten || d.ban?.MST || 'Nhà cung cấp khác';
        nhaCungCapMap[tenBan] = (nhaCungCapMap[tenBan] || 0) + (d.tong || tienHang);
      }

      // Thuế suất
      (d.thueSuat || []).forEach(ts => {
        const k = ts.ts || 'KCT';
        thueSuatMap[k] = (thueSuatMap[k] || 0) + (ts.tien || 0);
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

        <!-- 4 KPI Cards -->
        <div class="kpi-grid">
          <div class="kpi-card ban">
            <div class="kpi-title">📤 TỔNG DOANH THU BÁN RA (${countBan} HĐ)</div>
            <div class="kpi-val">${money(tienBan)} <small>đ</small></div>
            <div class="kpi-sub">Thuế GTGT đầu ra: <b>${money(thueBan)} đ</b></div>
          </div>
          <div class="kpi-card mua">
            <div class="kpi-title">📥 TỔNG CHI PHÍ MUA VÀO (${countMua} HĐ)</div>
            <div class="kpi-val">${money(tienMua)} <small>đ</small></div>
            <div class="kpi-sub">Thuế GTGT đầu vào: <b>${money(thueMua)} đ</b></div>
          </div>
          <div class="kpi-card ${thueChenh >= 0 ? 'duong' : 'am'}">
            <div class="kpi-title">⚖️ NGHĨA VỤ THUẾ GTGT TẠM TÍNH</div>
            <div class="kpi-val">${thueChenh >= 0 ? '+' : '-'}${money(Math.abs(thueChenh))} <small>đ</small></div>
            <div class="kpi-sub">${thueChenh >= 0 ? '🔴 Dự kiến PHẢI NỘP ngân sách' : '🟢 Thuế GTGT CÒN ĐƯỢC KHẤU TRỪ'}</div>
          </div>
          <div class="kpi-card warn">
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
                  <div class="rate-item">
                    <div class="rate-lbl"><span>Thuế suất: <b>${esc(ts)}</b></span> <span>${money(val)} đ (${pct}%)</span></div>
                    <div class="bar-bg"><div class="bar-fill" style="width:${pct}%"></div></div>
                  </div>
                `;
              }).join('') || '<div class="empty-hint">Chưa có số liệu thuế suất</div>'}
            </div>

            <h3 style="margin-top:16px">🏆 Top 5 Khách Hàng Lớn Nhất</h3>
            <table class="dash-tbl">
              <thead><tr><th>#</th><th>Khách hàng</th><th style="text-align:right">Doanh số (VND)</th></tr></thead>
              <tbody>
                ${topKhach.map((k, i) => `<tr><td>${i+1}</td><td><b>${esc(k[0])}</b></td><td style="text-align:right">${money(k[1])}</td></tr>`).join('') || '<tr><td colspan="3" style="text-align:center">Chưa có số liệu</td></tr>'}
              </tbody>
            </table>
          </div>

          <!-- Cột 2: Top Nhà cung cấp & Cảnh báo -->
          <div class="dash-box">
            <h3>🏭 Top 5 Nhà Cung Cấp Chi Phí Lớn Nhất</h3>
            <table class="dash-tbl">
              <thead><tr><th>#</th><th>Nhà cung cấp</th><th style="text-align:right">Giá trị mua (VND)</th></tr></thead>
              <tbody>
                ${topNCC.map((k, i) => `<tr><td>${i+1}</td><td><b>${esc(k[0])}</b></td><td style="text-align:right">${money(k[1])}</td></tr>`).join('') || '<tr><td colspan="3" style="text-align:center">Chưa có số liệu</td></tr>'}
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
      if (luong === 'xanh' || (d.luong?.name || '').includes('XANH')) xanh++;
      else if (luong === 'do' || (d.luong?.name || '').includes('ĐỎ')) doCount++;
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
      if (d.loaiKcb === 'Nội trú' || (d.soNgayDtri && Number(d.soNgayDtri) > 0)) noiTru++;
      else ngoaiTru++;

      tongChiPhi += (d.tongChiPhi || 0);
      tongBhyt += (d.tienBhyt || 0);
      tongNguoiBenh += (d.tienBntt || 0);
      tongNgoaiDs += (d.tienNgoaiDs || 0);

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
      (d.giaoDich || []).forEach(tx => {
        const amt = Math.abs(tx.soTien || 0);
        if (tx.loai === 'CRDT' || tx.soTien > 0) {
          tongThu += amt; soMonThu++;
        } else {
          tongChi += amt; soMonChi++;
        }
      });
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
        tongBaoLanh += (d.giaTriBaoLanh || 0);
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
    DOMAIN_INFO
  };
})();
