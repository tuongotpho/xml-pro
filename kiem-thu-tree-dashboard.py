# -*- coding: utf-8 -*-
"""
Kiểm thử tự động tính năng Duyệt Cây Thư Mục & Dashboard Động Thích Ứng (v1.5.0)
"""
import subprocess
import time
import json
import urllib.request
import websocket
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
PORT = 9227
BASE_DIR = r"F:\AI\7.xml-pro"
HTML_URL = "file:///" + os.path.join(BASE_DIR, "index.html").replace("\\", "/")

def get_ws_url():
    url = f"http://127.0.0.1:{PORT}/json"
    for _ in range(10):
        try:
            req = urllib.request.urlopen(url)
            targets = json.loads(req.read().decode())
            for t in targets:
                if t.get("type") == "page" and "index.html" in t.get("url", "").lower():
                    return t["webSocketDebuggerUrl"]
            for t in targets:
                if t.get("type") == "page":
                    return t["webSocketDebuggerUrl"]
        except Exception:
            time.sleep(1)
    raise RuntimeError("Không tìm thấy target Edge hợp lệ")

def cdp_eval(ws, expr, msg_id=1):
    req = {
        "id": msg_id,
        "method": "Runtime.evaluate",
        "params": {
            "expression": expr,
            "returnByValue": True,
            "awaitPromise": True
        }
    }
    ws.send(json.dumps(req))
    while True:
        resp = json.loads(ws.recv())
        if resp.get("id") == msg_id:
            res = resp.get("result", {}).get("result", {})
            if "value" in res:
                return res["value"]
            if "description" in res:
                return res["description"]
            return res

def main():
    print("=" * 65)
    print(" KIỂM THỬ: DUYỆT CÂY THƯ MỤC & DASHBOARD ĐỘNG THÍCH ỨNG")
    print("=" * 65)

    user_data = r"C:\temp\edge_test_tree"
    cmd = [
        EDGE_PATH,
        "--headless=new",
        f"--remote-debugging-port={PORT}",
        f"--user-data-dir={user_data}",
        "--allow-file-access-from-files",
        HTML_URL
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)

    try:
        ws_url = get_ws_url()
        print(f"[+] Kết nối CDP thành công: {ws_url}")
        ws = websocket.create_connection(ws_url)

        mid = 1
        for _ in range(15):
            ready = cdp_eval(ws, "document.readyState === 'complete' && !!window.__xemXmlThue && !!window.DASHBOARD_DONG", mid)
            if ready is True:
                break
            time.sleep(0.5)
            mid += 1
        print("[+] Ứng dụng và module DASHBOARD_DONG đã sẵn sàng!")

        # 1. Nạp các file với đường dẫn phân cấp thư mục giả lập
        mau_dir = os.path.join(BASE_DIR, "mau-xml")
        files_to_load = [
            # Thư mục Hóa đơn kế toán
            ("hd_mau_1_261008-2600835029-C26TNA-17-CÔNG TY TNHH MỘT THÀNH VIÊN RENTECH.xml", "KETOAN_2026/Thang_10/HoaDon_BanRa/hd1.xml"),
            ("hd_mau_2_261015-2600835029-C26TNA-18-CÔNG TY TNHH MỘT THÀNH VIÊN RENTECH.xml", "KETOAN_2026/Thang_10/HoaDon_BanRa/hd2.xml"),
            ("hd_mau_5_261001-2600167501-C26TMA-23167-CÔNG TY CỔ PHẦN VẬN TẢI Ô TÔ PHÚ THỌ.xml", "KETOAN_2026/Thang_10/HoaDon_MuaVao/hd5.xml"),
            # Thư mục Hải quan
            ("mau-hai-quan-vnaccs.xml", "LOGISTICS/HaiQuan_HaiPhong/tokhai_hq1.xml"),
            # Thư mục Bệnh viện
            ("mau-bhyt-4210.xml", "BENH_VIEN/Khoa_Noi/benhan_01.xml"),
            # Thư mục Ngân hàng
            ("mau-ngan-hang-camt053.xml", "TAI_CHINH/NganHang_MB/so_phu_thang10.xml"),
            # Thư mục Nhân sự / BHXH
            ("mau-bhxh-d02-lt.xml", "NHAN_SU/BaoHiem/d02_thang10.xml")
        ]

        for fname, fake_rel_path in files_to_load:
            fpath = os.path.join(mau_dir, fname)
            if not os.path.exists(fpath):
                print(f"[!] Không tìm thấy file: {fpath}")
                continue
            with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            mid += 1
            expr = f"""(() => {{
                const app = window.__xemXmlThue;
                const idx = app.addText({json.dumps(content)}, {json.dumps(os.path.basename(fake_rel_path))}, {json.dumps(fake_rel_path)});
                if (idx >= 0) {{
                    app.docs[idx].relPath = {json.dumps(fake_rel_path)};
                }}
                return idx;
            }})()"""
            idx = cdp_eval(ws, expr, mid)
            print(f"[+] Đã nạp: {fake_rel_path} -> vị trí {idx}")

        # 2. KIỂM THỬ CÂY THƯ MỤC
        print("\n--- KIỂM THỬ 1: DỰNG CÂY THƯ MỤC SIDEBAR ---")
        mid += 1
        tree_check = cdp_eval(ws, r"""(() => {
            document.getElementById('segCay').click();
            const treeNodes = Array.from(document.querySelectorAll('#list .tree-node')).map(el => ({
                name: el.querySelector('.tree-name')?.textContent,
                path: el.dataset.path,
                tag: el.querySelector('.tree-tag')?.textContent
            }));
            return {
                nodeCount: treeNodes.length,
                nodes: treeNodes
            };
        })()""", mid)
        print("Cây thư mục dựng được:", json.dumps(tree_check, ensure_ascii=False, indent=2))
        assert tree_check['nodeCount'] >= 6, "Phải dựng được ít nhất 6 nhánh thư mục phân cấp"
        print("=> [PASS] Cây thư mục sidebar dựng thành công chuẩn phân cấp!")

        # 3. KIỂM THỬ DASHBOARD THÍCH ỨNG THEO TỪNG NGÀNH
        print("\n--- KIỂM THỬ 2: DASHBOARD THÍCH ỨNG THEO NGÀNH ---")

        # Case 3.1: Click vào thư mục Hóa đơn -> Dashboard Hóa đơn & Thuế GTGT
        mid += 1
        dash_hd = cdp_eval(ws, r"""(() => {
            window.__xemXmlThue.moDashboard('KETOAN_2026/Thang_10');
            const h2 = document.querySelector('#main .dash-header h2')?.textContent;
            const badge = document.querySelector('#main .dash-badge')?.textContent;
            const kpiTitles = Array.from(document.querySelectorAll('#main .kpi-title')).map(e => e.textContent);
            return { h2, badge, kpiTitles };
        })()""", mid)
        print("Dashboard Thư mục Kế toán:", json.dumps(dash_hd, ensure_ascii=False, indent=2))
        assert "HÓA ĐƠN" in dash_hd['badge'], "Thư mục kế toán phải kích hoạt Dashboard Hóa đơn & Thuế GTGT"
        assert any("DOANH THU" in t for t in dash_hd['kpiTitles']), "Phải có KPI Doanh thu bán ra"
        print("=> [PASS] Kích hoạt chính xác Dashboard Hóa đơn & Thuế GTGT!")

        # Case 3.2: Click vào thư mục Hải quan -> Dashboard Hải quan & Logistics
        mid += 1
        dash_hq = cdp_eval(ws, r"""(() => {
            window.__xemXmlThue.moDashboard('LOGISTICS/HaiQuan_HaiPhong');
            const h2 = document.querySelector('#main .dash-header h2')?.textContent;
            const badge = document.querySelector('#main .dash-badge')?.textContent;
            const kpiTitles = Array.from(document.querySelectorAll('#main .kpi-title')).map(e => e.textContent);
            return { h2, badge, kpiTitles };
        })()""", mid)
        print("Dashboard Thư mục Hải quan:", json.dumps(dash_hq, ensure_ascii=False, indent=2))
        assert "HẢI QUAN" in dash_hq['badge'], "Thư mục Logistics phải kích hoạt Dashboard Hải quan & Logistics"
        assert any("LUỒNG XANH" in t for t in dash_hq['kpiTitles']), "Phải có thẻ thống kê Luồng Xanh"
        print("=> [PASS] Kích hoạt chính xác Dashboard Hải quan & Logistics!")

        # Case 3.3: Click vào thư mục Bệnh viện -> Dashboard Y tế & BHYT
        mid += 1
        dash_yte = cdp_eval(ws, r"""(() => {
            window.__xemXmlThue.moDashboard('BENH_VIEN/Khoa_Noi');
            const h2 = document.querySelector('#main .dash-header h2')?.textContent;
            const badge = document.querySelector('#main .dash-badge')?.textContent;
            const kpiTitles = Array.from(document.querySelectorAll('#main .kpi-title')).map(e => e.textContent);
            return { h2, badge, kpiTitles };
        })()""", mid)
        print("Dashboard Thư mục Bệnh viện:", json.dumps(dash_yte, ensure_ascii=False, indent=2))
        assert "BỆNH VIỆN" in dash_yte['badge'] or "Y TẾ" in dash_yte['badge'], "Thư mục Bệnh viện phải kích hoạt Dashboard Y tế"
        assert any("BHYT" in t for t in dash_yte['kpiTitles']), "Phải có thẻ thống kê Quỹ BHYT chi trả"
        print("=> [PASS] Kích hoạt chính xác Dashboard Bệnh viện & BHYT!")

        # Case 3.4: Click vào thư mục Ngân hàng -> Dashboard Sổ phụ & Dòng tiền
        mid += 1
        dash_nh = cdp_eval(ws, r"""(() => {
            window.__xemXmlThue.moDashboard('TAI_CHINH/NganHang_MB');
            const h2 = document.querySelector('#main .dash-header h2')?.textContent;
            const badge = document.querySelector('#main .dash-badge')?.textContent;
            const kpiTitles = Array.from(document.querySelectorAll('#main .kpi-title')).map(e => e.textContent);
            return { h2, badge, kpiTitles };
        })()""", mid)
        print("Dashboard Thư mục Ngân hàng:", json.dumps(dash_nh, ensure_ascii=False, indent=2))
        assert "NGÂN HÀNG" in dash_nh['badge'] or "DÒNG TIỀN" in dash_nh['badge'], "Thư mục Ngân hàng phải kích hoạt Dashboard Sổ phụ"
        assert any("DÒNG TIỀN VÀO" in t for t in dash_nh['kpiTitles']), "Phải có thẻ thống kê Dòng tiền vào"
        print("=> [PASS] Kích hoạt chính xác Dashboard Sổ phụ & Dòng tiền Ngân hàng!")

        # Case 3.5: Xem thư mục gốc (Tất cả thư mục) -> Dashboard Tổng hợp Đa ngành
        mid += 1
        dash_all = cdp_eval(ws, r"""(() => {
            window.__xemXmlThue.moDashboard('');
            const badge = document.querySelector('#main .dash-badge')?.textContent;
            const kpiTitles = Array.from(document.querySelectorAll('#main .kpi-title')).map(e => e.textContent);
            return { badge, kpiTitles };
        })()""", mid)
        print("Dashboard Thư mục gốc:", json.dumps(dash_all, ensure_ascii=False, indent=2))
        assert "ĐA NGÀNH" in dash_all['badge'] or "TỔNG QUAN" in dash_all['badge'], "Thư mục gốc phải là Dashboard Tổng hợp Đa ngành"
        print("=> [PASS] Kích hoạt chính xác Dashboard Tổng hợp Đa ngành!")

        # 4. KIỂM THỬ LỌC FILE THEO THƯ MỤC
        print("\n--- KIỂM THỬ 3: LỌC DANH SÁCH FILE THEO THƯ MỤC ---")
        mid += 1
        filter_check = cdp_eval(ws, r"""(() => {
            document.getElementById('segMo').click();
            window.__xemXmlThue.setSelectedFolder('KETOAN_2026/Thang_10');
            window.__xemXmlThue.moDashboard('KETOAN_2026/Thang_10');
            document.getElementById('segMo').click();
            const visible = document.querySelectorAll('#list .item');
            const barText = document.getElementById('lblCurrentFolder')?.textContent;
            return {
                visibleCount: visible.length,
                barText
            };
        })()""", mid)
        print("Trạng thái lọc danh sách:", json.dumps(filter_check, ensure_ascii=False, indent=2))
        assert filter_check['visibleCount'] == 3, f"Thư mục KETOAN_2026/Thang_10 phải lọc đúng 3 file hóa đơn (thực tế {filter_check['visibleCount']})"
        print("=> [PASS] Lọc danh sách theo thư mục chuẩn xác 100%!")

        print("\n" + "=" * 65)
        print(" TẤT CẢ KIỂM THỬ DUYỆT CÂY THƯ MỤC & DASHBOARD ĐẠT 100%! ")
        print("=" * 65)

    finally:
        try:
            ws.close()
        except:
            pass
        proc.terminate()

if __name__ == "__main__":
    main()
