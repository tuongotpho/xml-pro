# -*- coding: utf-8 -*-
import subprocess, time, json, os, re, sys, urllib.request, websocket

try:
    sys.stdout.reconfigure(encoding="utf-8")  # console Windows mặc định cp1252 không in được tiếng Việt
except Exception:
    pass

EDGE_EXE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(EDGE_EXE):
    EDGE_EXE = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"

proc = subprocess.Popen([
    EDGE_EXE,
    "--remote-debugging-port=9232",
    "--headless",
    "--disable-gpu",
    "--no-first-run",
    "--allow-file-access-from-files",
    "file:///" + os.path.abspath("index.html").replace("\\", "/")
])
time.sleep(2.0)

try:
    with urllib.request.urlopen("http://127.0.0.1:9232/json") as r:
        tabs = json.loads(r.read())
    page_tab = [t for t in tabs if t.get("type") == "page" and "index.html" in t.get("url", "")][0]
    ws_url = page_tab["webSocketDebuggerUrl"]
    ws = websocket.create_connection(ws_url, timeout=10)

    def evaluate(expr):
        req_id = int(time.time() * 1000) % 1000000
        msg = {"id": req_id, "method": "Runtime.evaluate", "params": {"expression": expr, "returnByValue": True, "awaitPromise": True}}
        ws.send(json.dumps(msg))
        while True:
            resp = json.loads(ws.recv())
            if resp.get("id") == req_id:
                res = resp.get("result", {})
                if "exceptionDetails" in res:
                    raise Exception(res["exceptionDetails"])
                return res.get("result", {}).get("value")

    # Đợi trang sẵn sàng
    for _ in range(20):
        if evaluate("document.readyState === 'complete' && !!window.__xemXmlThue"):
            break
        time.sleep(0.3)

    print("[+] Kết nối CDP thành công và trang đã sẵn sàng!")
    
    # 1. Kiểm tra Version v2.0.0
    pb = evaluate("window.PHIEN_BAN")
    print(f"[+] Phiên bản window.PHIEN_BAN: {pb}")
    assert pb and re.fullmatch(r"\d+\.\d+\.\d+", pb) and tuple(map(int, pb.split("."))) >= (2, 0, 0), f"Phiên bản phải >= 2.0.0, nhận {pb}"

    # 2. Kiểm tra Dark Mode Toggle
    dark_init = evaluate("document.documentElement.classList.contains('dark')")
    btn_icon = evaluate("document.getElementById('btnToggleDark')?.textContent")
    print(f"[+] Trạng thái Dark ban đầu: {dark_init}, Icon: {btn_icon}")
    
    # Click toggle
    evaluate("document.getElementById('btnToggleDark')?.click()")
    dark_after = evaluate("document.documentElement.classList.contains('dark')")
    btn_icon_after = evaluate("document.getElementById('btnToggleDark')?.textContent")
    print(f"[+] Sau khi click toggle: Dark={dark_after}, Icon: {btn_icon_after}")
    assert dark_after != dark_init, "Dark mode class must toggle"
    for icon in (btn_icon, btn_icon_after):
        assert icon and "?" not in icon, f"Biểu tượng nút sáng/tối bị lỗi bảng mã: {icon!r}"
    assert btn_icon != btn_icon_after, "Biểu tượng phải đổi khi chuyển sáng/tối"

    # Click toggle lại về ban đầu
    evaluate("document.getElementById('btnToggleDark')?.click()")

    # 3. Đổi tên trực tiếp qua máy chủ nội bộ đã gỡ (báo cáo 01, lỗi A2/A3): chỉ còn tải .zip / .ps1
    has_btn_direct = evaluate("Boolean(document.getElementById('btnDoiTenTrucTiep'))")
    print(f"[+] Nút Đổi Tên Trực Tiếp (#btnDoiTenTrucTiep) có mặt: {has_btn_direct}")
    assert not has_btn_direct, "btnDoiTenTrucTiep phải được gỡ (dùng máy chủ nội bộ không an toàn)"

    # 4. Kiểm tra IndexedDB XmlProDB_v2
    idb_check = evaluate("""
      new Promise(async (resolve) => {
        try {
          const db = await window.__xemXmlThue.moIndexedDB();
          resolve({ ok: true, name: db.name, version: db.version, stores: Array.from(db.objectStoreNames) });
        } catch (e) {
          resolve({ ok: false, error: e.message });
        }
      })
    """)
    print(f"[+] Kiểm tra IndexedDB: {idb_check}")
    assert idb_check.get("ok") and idb_check.get("name") == "XmlProDB_v2", "IndexedDB XmlProDB_v2 initialization failed"
    assert "phienLamViec" in idb_check.get("stores"), "Store phienLamViec must exist"

    # 5. Kiểm tra Thẻ Gợi Ý Khôi Phục Phiên (#sessionCard)
    has_session_card = evaluate("Boolean(document.getElementById('sessionCard'))")
    print(f"[+] Thẻ Khôi Phục Phiên (#sessionCard) có mặt trong DOM: {has_session_card}")
    assert has_session_card, "sessionCard must exist"

    # 6. Kiểm tra phím tắt Ctrl+F
    eval_shortcut = evaluate("""
      (() => {
        const q = document.getElementById('q');
        q.blur();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }));
        return document.activeElement === q;
      })()
    """)
    print(f"[+] Phím tắt Ctrl+F kích hoạt focus ô tìm kiếm: {eval_shortcut}")
    assert eval_shortcut, "Ctrl+F must focus search input"

    print("\n=======================================================")
    print(" TẤT CẢ TÍNH NĂNG GIAI ĐOẠN 3 (v2.0.x) ĐẠT 100% PASS! ")
    print("=======================================================")

finally:
    try: ws.close()
    except: pass
    proc.terminate()
