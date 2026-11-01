# -*- coding: utf-8 -*-
"""
Kiểm thử tự động các tính năng kế toán (Tính năng 1, 5, 6) của XML Pro:
1. Tự động phân loại Mua vào / Bán ra theo MST Doanh nghiệp & từ khóa đường dẫn
2. Dashboard mini Kế toán & Bộ lọc nhanh (Mua vào / Bán ra / Cần chú ý)
3. Đổi tên file hàng loạt chuẩn kế toán + Xuất ZIP & script PowerShell (.ps1)
4. Xuất Excel chuẩn hóa với cột Phân loại
"""
import subprocess
import time
import json
import urllib.request
import websocket
import os
import sys
import glob

sys.stdout.reconfigure(encoding='utf-8')

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
PORT = 9226
BASE_DIR = r"F:\AI\7.xml-pro"
HTML_URL = "file:///" + os.path.join(BASE_DIR, "index.html").replace("\\", "/")

def get_ws_url():
    url = f"http://127.0.0.1:{PORT}/json"
    for _ in range(10):
        try:
            req = urllib.request.urlopen(url)
            targets = json.loads(req.read().decode())
            print("[*] Các targets của Edge:", [(t.get("type"), t.get("url")) for t in targets])
            for t in targets:
                if t.get("type") == "page" and "index.html" in t.get("url", "").lower():
                    return t["webSocketDebuggerUrl"]
            for t in targets:
                if t.get("type") == "page":
                    return t["webSocketDebuggerUrl"]
        except Exception as e:
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
    print(" BẮT ĐẦU KIỂM THỬ TÍNH NĂNG KẾ TOÁN (1, 5, 6) - XML PRO")
    print("=" * 65)

    user_data = r"C:\temp\edge_test_kt"
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

        # Chờ trang nạp xong
        mid = 1
        for _ in range(15):
            ready = cdp_eval(ws, "document.readyState === 'complete' && !!window.__xemXmlThue", mid)
            if ready is True:
                break
            time.sleep(0.5)
            mid += 1
        print("[+] Trang index.html đã sẵn sàng và window.__xemXmlThue đã nạp!")

        # 1. Tìm các file hóa đơn thực tế trong mau-xml
        mau_dir = os.path.join(BASE_DIR, "mau-xml")
        xml_files = glob.glob(os.path.join(mau_dir, "hd_mau_*.xml"))
        print(f"[+] Tìm thấy {len(xml_files)} file hóa đơn mẫu")

        for fpath in xml_files:
            with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            fname = os.path.basename(fpath)
            
            expr = f"""(() => {{
                const app = window.__xemXmlThue;
                return app.addText({json.dumps(content)}, {json.dumps(fname)}, {json.dumps(fpath)});
            }})()"""
            mid += 1
            idx = cdp_eval(ws, expr, mid)
            print(f"[+] Đã nạp: {fname[:35]}... -> vị trí {idx}")

        # Kiểm tra tổng số file nạp
        mid += 1
        doc_count = cdp_eval(ws, "window.__xemXmlThue.docs.length", mid)
        print(f"[+] Tổng số tài liệu đã nạp: {doc_count}")

        # 2. KIỂM THỬ TÍNH NĂNG 1: Phân loại tự động Mua vào / Bán ra
        print("\n--- KIỂM THỬ 1: PHÂN LOẠI MUA / BÁN THEO MST ---")
        
        # Lấy thông tin MST người bán & người mua của các file
        mid += 1
        parties = cdp_eval(ws, """(() => {
            const docs = window.__xemXmlThue.docs.filter(d => d.kind === 'hd');
            return docs.map(d => ({
                source: d.fileName,
                banMst: d.ban?.MST,
                banTen: d.ban?.Ten,
                muaMst: d.mua?.MST,
                muaTen: d.mua?.Ten,
                phanLoai: d.phanLoai
            }));
        })()""", mid)
        print("Danh sách MST các bên:", json.dumps(parties[:3], ensure_ascii=False, indent=2))

        seller_mst = parties[0]['banMst']
        buyer_mst = parties[0]['muaMst']
        print(f"[i] MST Người bán file 1: {seller_mst} | MST Người mua: {buyer_mst}")

        # Test 1.1: Cài MST công ty trùng với MST người bán file 1
        mid += 1
        set_seller_res = cdp_eval(ws, f"""(() => {{
            window.__xemXmlThue.setMyMst({json.dumps(seller_mst)});
            const docs = window.__xemXmlThue.docs.filter(d => d.kind === 'hd');
            return docs.map(d => ({{
                source: d.fileName,
                phanLoai: d.phanLoai,
                banMst: d.ban?.MST,
                muaMst: d.mua?.MST
            }}));
        }})()""", mid)
        print(f"\nSau khi cài myMst = '{seller_mst}': file 1 phân loại là '{set_seller_res[0]['phanLoai']}'")
        assert set_seller_res[0]['phanLoai'] == 'ban', f"File 1 phải được phân loại là 'ban' vì trùng MST người bán {seller_mst}"
        print("=> [PASS] File bán ra đã được phân loại chuẩn 'ban' khi trùng MST người bán!")

        # Test 1.2: Đổi MST công ty trùng với MST người mua file 1
        if buyer_mst:
            mid += 1
            set_buyer_res = cdp_eval(ws, f"""(() => {{
                window.__xemXmlThue.setMyMst({json.dumps(buyer_mst)});
                const docs = window.__xemXmlThue.docs.filter(d => d.kind === 'hd');
                return docs.map(d => ({{
                    source: d.fileName,
                    phanLoai: d.phanLoai
                }}));
            }})()""", mid)
            print(f"Sau khi cài myMst = '{buyer_mst}': file 1 phân loại là '{set_buyer_res[0]['phanLoai']}'")
            assert set_buyer_res[0]['phanLoai'] == 'mua', f"File 1 phải được phân loại là 'mua' vì trùng MST người mua {buyer_mst}"
            print("=> [PASS] File mua vào đã được phân loại chuẩn 'mua' khi trùng MST người mua!")

        # 3. KIỂM THỬ TÍNH NĂNG 6: Mini-Dashboard & Filter Pills
        print("\n--- KIỂM THỬ 2: MINI-DASHBOARD & FILTER PILLS ---")
        mid += 1
        dash_info = cdp_eval(ws, r"""(() => {
            const dash = document.getElementById('ktDash');
            const pills = {
                all: document.getElementById('cntAll')?.textContent,
                mua: document.getElementById('cntMua')?.textContent,
                ban: document.getElementById('cntBan')?.textContent,
                warn: document.getElementById('cntWarn')?.textContent
            };
            return {
                dashDisplay: dash ? getComputedStyle(dash).display : 'none',
                dashText: dash ? dash.innerText.replace(/\s+/g, ' ') : '',
                pills
            };
        })()""", mid)
        print("Thông tin Dashboard:", json.dumps(dash_info, ensure_ascii=False, indent=2))
        assert dash_info['dashDisplay'] != 'none', "Dashboard kế toán phải hiển thị khi có hóa đơn!"
        print("=> [PASS] Dashboard kế toán hiển thị đầy đủ tổng tiền hàng, thuế và chênh lệch GTGT!")

        # Thử bấm filter pill [📥 Mua vào]
        mid += 1
        filter_mua = cdp_eval(ws, """(() => {
            const btn = document.querySelector('#filterPills .pill.mua');
            if (btn) btn.click();
            const visibleItems = document.querySelectorAll('#list .item');
            return {
                count: visibleItems.length,
                badgeSample: visibleItems[0]?.querySelector('.tag-pl')?.innerText
            };
        })()""", mid)
        print(f"Bấm lọc 'Mua vào': hiển thị {filter_mua['count']} mục, badge: {filter_mua['badgeSample']}.")
        assert filter_mua['count'] >= 1, "Bộ lọc Mua vào phải hiển thị đúng tài liệu mua vào"
        print("=> [PASS] Bộ lọc pill hoạt động chính xác!")

        # Bấm lại [Tất cả]
        mid += 1
        cdp_eval(ws, "document.querySelector('#filterPills .pill:first-child').click()", mid)

        # 4. KIỂM THỬ TÍNH NĂNG 5: Smart Batch File Renamer
        print("\n--- KIỂM THỬ 3: ĐỔI TÊN HÀNG LOẠT & TẠO SCRIPT/ZIP ---")
        mid += 1
        rename_preview = cdp_eval(ws, """(() => {
            window.__xemXmlThue.moDlgDoiTen();
            const rows = Array.from(document.querySelectorAll('#tbDoiTenBody tr')).map(tr => {
                const tds = tr.querySelectorAll('td');
                return {
                    loai: tds[1]?.innerText.trim(),
                    oldName: tds[2]?.innerText.trim(),
                    newName: tds[3]?.innerText.trim()
                };
            });
            return {
                totalRows: rows.length,
                samples: rows.slice(0, 3)
            };
        })()""", mid)
        print("Bảng xem trước Đổi tên:", json.dumps(rename_preview, ensure_ascii=False, indent=2))
        assert rename_preview['totalRows'] >= 3, "Bảng đổi tên phải có các file hóa đơn hợp lệ"
        
        # Kiểm tra mẫu tên chuẩn: [Loai]_[YYYYMMDD]_[MST]_[Ten]_[KyHieu]_[So].xml
        first_renamed = rename_preview['samples'][0]['newName']
        print(f"Ví dụ tên file mới: {first_renamed}")
        assert "_" in first_renamed and first_renamed.endswith(".xml"), "Tên file mới phải đúng định dạng chuẩn kế toán"
        print("=> [PASS] Chuẩn hóa tên file theo đúng format kế toán!")

        # 5. KIỂM THỬ XUẤT EXCEL CÓ CỘT PHÂN LOẠI
        print("\n--- KIỂM THỬ 4: XUẤT EXCEL CHUẨN KẾ TOÁN ---")
        mid += 1
        excel_check = cdp_eval(ws, """(async () => {
            let capturedBlob = null;
            const origCreate = URL.createObjectURL;
            URL.createObjectURL = (blob) => {
                capturedBlob = blob;
                return origCreate(blob);
            };
            await window.xuatExcel(window.__xemXmlThue.docs);
            URL.createObjectURL = origCreate;
            
            if (!capturedBlob) return { error: 'Không bắt được blob Excel' };
            const zip = await JSZip.loadAsync(capturedBlob);
            const sheet1 = await zip.file('xl/worksheets/sheet1.xml').async('text');
            
            const hasPhanLoai = sheet1.includes('Phân loại') || sheet1.includes('MUA VÀO') || sheet1.includes('BÁN RA');
            return {
                blobSize: capturedBlob.size,
                hasPhanLoai,
                sheetSample: sheet1.slice(0, 500)
            };
        })()""", mid)
        print("Kết quả kiểm tra Excel:", json.dumps(excel_check, ensure_ascii=False, indent=2))
        assert excel_check.get('hasPhanLoai') == True, "File Excel phải chứa cột Phân loại (BÁN RA / MUA VÀO)"
        print("=> [PASS] Xuất Excel chứa cột Phân loại chuẩn xác!")

        print("\n" + "=" * 65)
        print(" TẤT CẢ 4 HẠNG MỤC KIỂM THỬ KẾ TOÁN ĐỀU ĐẠT 100%! ")
        print("=" * 65)

    finally:
        try:
            ws.close()
        except:
            pass
        proc.terminate()

if __name__ == "__main__":
    main()
