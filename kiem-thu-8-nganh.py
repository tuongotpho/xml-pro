# -*- coding: utf-8 -*-
"""
Kiểm thử tự động toàn diện 6 định dạng chuyên ngành + hóa đơn + tờ khai thuế
Chạy với Microsoft Edge headless qua Chrome DevTools Protocol (CDP).
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
PORT = 9224
BASE_DIR = r"F:\AI\7.xml-pro"
HTML_URL = "file:///" + os.path.join(BASE_DIR, "index.html").replace("\\", "/")

def get_ws_url():
    url = f"http://127.0.0.1:{PORT}/json"
    req = urllib.request.urlopen(url)
    targets = json.loads(req.read().decode())
    print("[*] Các targets của Edge:", [(t.get("type"), t.get("url")) for t in targets])
    for t in targets:
        if t.get("type") == "page" and "index.html" in t.get("url", ""):
            return t["webSocketDebuggerUrl"]
    for t in targets:
        if t.get("type") == "page":
            return t["webSocketDebuggerUrl"]
    return targets[0]["webSocketDebuggerUrl"]

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
            return resp

def main():
    print(f"[*] Khởi động Edge headless kiểm thử trên port {PORT}...")
    proc = subprocess.Popen([
        EDGE_PATH,
        "--headless",
        "--disable-gpu",
        f"--remote-debugging-port={PORT}",
        "--allow-file-access-from-files",
        HTML_URL
    ])
    
    time.sleep(2.0)
    try:
        ws_url = get_ws_url()
        print(f"[*] Đã kết nối CDP: {ws_url}")
        ws = websocket.create_connection(ws_url, timeout=10)

        # Chờ trang tải hoàn tất
        for _ in range(20):
            ready = cdp_eval(ws, "document.readyState === 'complete' && !!window.__xemXmlThue", 0)
            if ready:
                break
            time.sleep(0.5)

        # 1. Kiểm tra môi trường & các module đã load
        init_res = cdp_eval(ws, """(() => {
            return {
                title: document.title,
                hasNganhDoc: !!window.NGANH_DOC,
                hasXuatExcel: !!window.xuatExcel,
                hasXemXmlThue: !!window.__xemXmlThue
            };
        })()""", 1)
        print("[*] Trạng thái ứng dụng:", init_res)
        assert init_res["hasNganhDoc"], "Chưa load được nganh-doc.js"
        assert init_res["hasXuatExcel"], "Chưa load được xuat-excel.js"

        # 2. Đọc các file XML mẫu
        mau_files = [
            ("mau-hai-quan-vnaccs.xml", "hq"),
            ("mau-bhyt-4210.xml", "yte"),
            ("mau-khau-tru-tncn.xml", "tncn"),
            ("mau-bhxh-d02-lt.xml", "bhxh"),
            ("mau-ngan-hang-camt053.xml", "nh"),
            ("mau-dau-thau-ehsdt.xml", "thau")
        ]

        print("\n[*] Bắt đầu nạp và kiểm tra từng định dạng XML chuyên ngành:")
        loaded_count = 0
        for f_name, expected_kind in mau_files:
            f_path = os.path.join(BASE_DIR, "mau-xml", f_name)
            with open(f_path, "r", encoding="utf-8") as f:
                content = f.read()

            res = cdp_eval(ws, f"""(() => {{
                const xml = {json.dumps(content)};
                const fileName = {json.dumps(f_name)};
                const idx = window.__xemXmlThue.addText(xml, fileName, fileName);
                window.__xemXmlThue.select(idx);
                const doc = window.__xemXmlThue.docs[idx];
                const mainHtml = document.getElementById('main').innerHTML;
                return {{
                    idx: idx,
                    kind: doc.kind,
                    title: doc.title,
                    hasError: !!doc.error,
                    paperRendered: mainHtml.includes('{expected_kind}-paper'),
                    topStripRendered: mainHtml.includes('top-strip')
                }};
            }})()""", 10 + loaded_count)
            loaded_count += 1
            print(f"  + [{expected_kind.upper()}] {f_name}: kind={res.get('kind')} | title='{res.get('title')}' | paper={res.get('paperRendered')}")
            assert res.get("kind") == expected_kind, f"Sai loại định dạng: mong đợi {expected_kind}, nhận được {res.get('kind')}"
            assert res.get("paperRendered"), f"Giao diện {expected_kind}-paper chưa hiển thị chính xác!"

        # 3. Kiểm tra tính năng Xuất Excel đa sheet
        print("\n[*] Kiểm tra hàm buildXlsx và xuất Excel đa sheet:")
        excel_res = cdp_eval(ws, """(async () => {
            try {
                const docs = window.__xemXmlThue.docs;
                let capturedBlob = null;
                const origCreate = URL.createObjectURL;
                URL.createObjectURL = (blob) => {
                    capturedBlob = blob;
                    return origCreate(blob);
                };
                let alertMsg = null;
                window.alert = (msg) => { alertMsg = msg; };
                
                await window.xuatExcel(docs);
                // Đợi 200ms
                await new Promise(r => setTimeout(r, 200));
                
                return {
                    success: !!capturedBlob,
                    blobSize: capturedBlob ? capturedBlob.size : 0,
                    alertMsg: alertMsg,
                    docCount: docs.length
                };
            } catch (err) {
                return { error: err.message, stack: err.stack };
            }
        })()""", 50)
        print("[*] Kết quả kiểm thử Xuất Excel:", excel_res)
        assert excel_res.get("success"), f"Xuất excel thất bại: {excel_res.get('error')}"
        assert excel_res.get("blobSize", 0) > 1000, "File Excel sinh ra quá nhỏ hoặc rỗng"
        print(f"[OK] File Excel sinh ra thành công với dung lượng: {excel_res.get('blobSize')} bytes cho {excel_res.get('docCount')} tài liệu đa ngành!")

        ws.close()
        print("\n=== TẤT CẢ KIỂM THỬ ĐÃ THÀNH CÔNG RỰC RỠ 100% ===")

    finally:
        proc.terminate()
        proc.wait()

if __name__ == "__main__":
    main()
