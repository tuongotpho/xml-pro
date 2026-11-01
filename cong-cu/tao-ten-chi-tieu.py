"""Doc bo cai HTKK da bung (menu.xml + file anh xa o .xml + file mau .xls)
-> tao ten-chi-tieu.js cho trinh xem XML thue.
Chay: python -I build_ten.py <thu_muc_cab> <file_ra.js>
"""
import sys, os, re, json, glob
import xml.etree.ElementTree as ET
import xlrd

sys.stdout.reconfigure(encoding="utf-8")
CAB, OUT = sys.argv[1], sys.argv[2]
FILES = {f.lower(): f for f in os.listdir(CAB)}


def cab_name(goc, ver, ext):
    """MaFile '05_KK_TNCN_TT80' + '293' -> '_5_kk_tncn_tt80_293.xls'
    (ten bat dau bang chu so thi cab thay ky tu dau bang '_'; ten dai co the bi cat duoi)."""
    if goc[:1].isdigit():
        goc = "_" + goc[1:]
    ten = (goc + ("_" + ver if ver else "") + ext).lower()
    if ten in FILES:
        return os.path.join(CAB, FILES[ten])
    for f in FILES:  # ten bi cat cut
        if len(f) >= 24 and ten.startswith(f) and len(f) < len(ten):
            return os.path.join(CAB, FILES[f])
    return None


def doc_text(path):
    b = open(path, "rb").read()
    if b[:2] in (b"\xff\xfe", b"\xfe\xff"):
        return b.decode("utf-16")
    return b.decode("utf-8-sig", errors="replace")


def col_idx(letters):
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


CO_CHU = re.compile(r"[^\W\d_]{3,}")
RAC = re.compile(r"^(chk|eof|x|#.*|[-+]?\d+(\.\d+)?|\(\d+\)|\d+[a-z]?)$", re.I)


def chu(s):
    if not isinstance(s, str):
        return ""
    s = re.sub(r"\s+", " ", s).strip()
    return "" if RAC.match(s) else s


class Sheet:
    def __init__(self, sh):
        self.sh = sh
        self.merge = {}
        for (r0, r1, c0, c1) in getattr(sh, "merged_cells", []):
            for r in range(r0, r1):
                for c in range(c0, c1):
                    self.merge[(r, c)] = (r0, c0)

    def val(self, r, c):
        sh = self.sh
        if r < 0 or c < 0 or r >= sh.nrows or c >= sh.ncols:
            return ""
        v = sh.cell_value(r, c)
        if (v == "" or v is None) and (r, c) in self.merge:
            r0, c0 = self.merge[(r, c)]
            v = sh.cell_value(r0, c0)
        return v if sh.cell_type(r, c) in (1, 0) or (r, c) in self.merge else ""

    def nhan_dong(self, r, c_max, bo_cot, tu=0):
        """Chu cua dong r, tu cot `tu` toi truoc c_max (tru cac cot la o so lieu).
        Neu ben trai con o so lieu khac (vd 'Nguoi lap bieu: [o]  Giam doc: [o]') thi chi lay chu giua hai o."""
        if tu == 0:
            truoc = [x for x in bo_cot if x < c_max]
            if truoc:
                rieng = self.nhan_dong(r, c_max, bo_cot, tu=max(truoc) + 1)
                if CO_CHU.search(rieng):
                    return rieng
        out = []
        if r < 0 or r >= self.sh.nrows:
            return ""
        for c in range(tu, min(c_max, self.sh.ncols)):
            if c in bo_cot:
                continue
            t = chu(self.sh.cell_value(r, c)) if self.sh.cell_type(r, c) == 1 else ""
            if t and t not in out:
                out.append(t)
        # bo cac o danh dau le (A, I, IV, -) nam o cot rieng khi dong da co chu dai hon
        if len(out) > 1 and any(len(x) > 4 for x in out):
            out = [x for x in out if not re.match(r"^([IVX]+|[A-Z]|-|\+|\*)\.?$", x)]
        return " ".join(out)

    def tieu_de_cot(self, r, c, tren=12, duoi=None, bo_dong=(), mot=False):
        """Doc len tren cot c tim tieu de cot (dong dau tien co chu), bo qua cac dong so lieu."""
        lo = r - tren if duoi is None else duoi
        out = []
        for rr in range(r - 1, max(lo, 0) - 1, -1):
            if rr in bo_dong:
                continue
            t = chu(self.val(rr, c))
            if t:
                if t not in out:
                    out.insert(0, t)
                if mot or duoi is None and not (re.match(r"^\[.*\]$", out[0]) or len(out[0]) <= 4) or len(out) >= 3:
                    break
        return " ".join(out)


def anh_xa(path):
    """Doc file anh xa o -> duong dan. Tra ve (o_tinh, bang_lap)."""
    txt = doc_text(path)
    txt = re.sub(r"<\?xml[^>]*\?>", "", txt)
    try:
        root = ET.fromstring(txt)
    except ET.ParseError:
        root = ET.fromstring("<R>" + re.sub(r"&(?!\w+;|#)", "&amp;", txt) + "</R>")
    tinh, lap, in2 = [], [], set()  # in2: cac dong co so lieu tren mau in (.xls1)
    for sec in root.iter("Section"):
        if sec.get("Dynamic") == "1":
            loc = sec.find("Location")
            def so(tag):
                e = loc.find(tag) if loc is not None else None
                try:
                    return int(e.text.strip())
                except Exception:
                    return 0
            cols = []
            for cell in sec.iter("Cell"):
                p, cid = cell.get("Path") or "", cell.get("CellID") or ""
                if p and re.match(r"^[A-Z]+$", cid):
                    cols.append((col_idx(cid), p))
            lap.append(dict(path=sec.get("TablePath") or "", ten=sec.get("TableName") or "",
                            tbl=so("TableTemplateRowStart"), data=so("DataLocationTemplateRowStart"), cols=cols))
            if so("DataLocationReportRowStart") > 0:
                in2.add(so("DataLocationReportRowStart") - 1)
        else:
            for cell in sec.iter("Cell"):
                p, cid = cell.get("Path") or "", cell.get("CellID") or ""
                m = re.match(r"^([A-Z]+)_(\d+)$", cid)
                if p and m:
                    tinh.append((int(m.group(2)) - 1, col_idx(m.group(1)), p))
                    m2 = re.match(r"^([A-Z]+)_(\d+)$", cell.get("CellID2") or "")
                    la = p.split("/")[-1]
                    if m2 and not p.startswith("HSoThueDTu/HSoKhaiThue/TTinChung") and re.match(r"^(ct|tong|chiTieu)", la, re.I):
                        in2.add(int(m2.group(2)) - 1)
    return tinh, lap, in2


def chuan(p):
    p = re.sub(r"^HSoThueDTu/HSoKhaiThue/", "", p)
    p = re.sub(r"^PLuc/", "", p)
    return p


RAC_PATH = re.compile(r"^(path_?\w*|Path_?\w*|null\w*|p\d+|[A-Z]{1,2}\d+|btn\w*)$")

# --- Tach tung cot cua dong chi tieu (STT, Chi tieu, Ma so / Ma chi tieu, Don vi tinh) tren mau HTKK ---
RAC_O = re.compile(r"^(chk|eof|cbo|cmc|aaaa+|x|nguoi ky|0\.0)$", re.I)


def o_chu(v):
    if not isinstance(v, str):
        return ""
    v = re.sub(r"\s+", " ", v).strip()
    return "" if not v or RAC_O.match(v) else v


def cac_cot(sh, r, bo_cot):
    """Cac o chu (khong phai o so lieu) cua dong r: [[cot, chu], ...]."""
    out = []
    if r >= sh.sh.nrows:
        return out
    for c in range(sh.sh.row_len(r)):
        if c in bo_cot or sh.sh.cell_type(r, c) != 1:
            continue
        t = o_chu(sh.sh.cell_value(r, c))
        if t:
            out.append([c, t])
    return out


# --- Khung tu mau in (.xls1): mau so, ten bao cao, cac dong dau bieu, cam doan, khoi ky, ghi chu ---
DINH_DANH = re.compile(r"^[a-z]+[A-Z]\w*$")          # kyKKhaiTuNgay...
CHI_SO = re.compile(r"^[\d.\s\-/]+$")                 # 1, 2, 0.0, 01/01/2009, " - "
NHAN = re.compile(r"(:\s*$|^\[\d+[a-z.]*\]$)")       # o nhan: "Ten nguoi nop thue:", "[04]"
TIEU_DE_BANG = re.compile(r"^(STT|CHỈ TIÊU|Chỉ tiêu|TÀI SẢN|NGUỒN VỐN|Mã ?số|Mã chỉ tiêu)$", re.I)


def dong_khung(sh, r):
    """Mot dong cua mau in: bo o mau (gia tri vi du) nam sau o nhan, bo so, bo ten bien."""
    s2 = sh.sh
    out, sau_nhan = [], False
    if r >= s2.nrows:
        return out
    for c in range(s2.row_len(r)):
        v = s2.cell_value(r, c)
        if s2.cell_type(r, c) != 1:
            continue
        t = re.sub(r"\s+", " ", v).strip()
        if not t or RAC_O.match(t) or DINH_DANH.match(t) or CHI_SO.match(t) or re.match(r"^[A-Za-z][A-Za-z ._]*$", t):
            continue
        la_nhan = bool(NHAN.search(t)) or ":" in t or t.startswith("(") or (not re.search(r"[a-zà-ỹ]", t) and len(t) > 12) or len(t) > 25
        if sau_nhan and not la_nhan and not (out and out[-1][1].startswith("Mẫu số")):
            continue  # o gia tri vi du ngay sau nhan ("cmc", "hoang mai"...); rieng so mau sau "Mau so:" thi giu
        sau_nhan = t.endswith(":") or bool(re.match(r"^\[\d", t))
        out.append([c, t])
    return out


def khung_mau_in(wb1, sid, in2):
    names = wb1.sheet_names()
    ten = sid if sid in names else sid.replace("-", "_") if sid.replace("-", "_") in names else None
    if not ten or not in2:
        return None
    sh = Sheet(wb1.sheet_by_name(ten))
    dau_cuoi, het = min(in2), max(in2)
    k = dict(qh=False, ms="", bh="", dau=[], cuoi=[])
    for r in range(0, dau_cuoi):
        o = dong_khung(sh, r)
        if any(TIEU_DE_BANG.match(t) for _, t in o):
            break  # dong tieu de cot cua bang: bang cua app tu ve
        con = []
        for c, t in o:
            if "XÃ HỘI CHỦ NGHĨA" in t.upper():
                k["qh"] = True
            elif "Độc lập - Tự do" in t and len(t) > 35:
                du = re.sub(r"Độc lập\s*-\s*Tự do\s*-\s*Hạnh phúc", "", t).strip()  # mau gop ten to khai chung o quoc hieu
                if du:
                    con.append([c, du])
            elif t.startswith("Mẫu số") and not k["ms"]:
                k["ms"] = t
            elif k["ms"] and len(k["ms"]) <= 9 and not k["ms"].endswith(t) and re.match(r"^[\w/ .–-]+$", t) and len(t) < 30 and not con and not k["dau"]:
                k["ms"] = (k["ms"] + " " + t).strip()  # "Mau so: " + "05/KK-TNCN"
            elif t.startswith("(Ban hành") or t.startswith("(Kèm theo"):
                k["bh"] = k["bh"] or t
            elif "Độc lập - Tự do" in t:
                continue
            else:
                con.append([c, t])
        if con:
            k["dau"].append(con)
    for r in range(het + 1, sh.sh.nrows):
        o = dong_khung(sh, r)
        if o:
            k["cuoi"].append(o)
    k["cuoi"] = [d for d in k["cuoi"] if CO_CHU.search(" ".join(t for _, t in d))]
    return k

#  Nguon ten thu hai: file khung .xsd cua Tong cuc Thue co loi giai thich (xs:documentation)
#  cho tung truong — dung cho cac truong khong co dong chu tren mau .xls (o danh dau, truong an, phan dau phu luc).
XS = "{http://www.w3.org/2001/XMLSchema}"


def doc_xsd(path):
    try:
        return ET.fromstring(doc_text(path).encode("utf-8"))
    except Exception:
        return None


def kieu_ten(root):
    return {ct.get("name"): ct for ct in root.iter(XS + "complexType") if ct.get("name")} if root is not None else {}


THU_VIEN = {}
for ten in ("tkhaithue.xsd", "tkhaithue_dbhc.xsd"):
    if ten in FILES:
        THU_VIEN.update(kieu_ten(doc_xsd(os.path.join(CAB, FILES[ten]))))


def di_xsd(node, prefix, out, types, sau=0):
    for ch in node:
        if ch.tag == XS + "annotation":
            continue
        if ch.tag != XS + "element":
            di_xsd(ch, prefix, out, types, sau)
            continue
        name = ch.get("name") or (ch.get("ref") or "").split(":")[-1]
        if not name:
            continue
        p = prefix + "/" + name if prefix else name
        d = ch.find(XS + "annotation/" + XS + "documentation")
        if d is not None and d.text and d.text.strip():
            out.setdefault(p, re.sub(r"\s+", " ", d.text).strip())
        if sau < 14:
            di_xsd(ch, p, out, types, sau + 1)
            t = (ch.get("type") or "").split(":")[-1]
            if t in types and t not in ("CTieuTKhaiChinhType", "PLucType"):
                di_xsd(types[t], p, out, types, sau + 1)


def giai_thich_xsd(path):
    root = doc_xsd(path)
    out = {}
    if root is None:
        return out
    types = dict(THU_VIEN)
    types.update(kieu_ten(root))
    for ct in root.iter(XS + "complexType"):
        if ct.get("name") == "CTieuTKhaiChinhType":
            di_xsd(ct, "CTieuTKhaiChinh", out, types)
        elif ct.get("name") == "PLucType":
            di_xsd(ct, "", out, types)
    return out


menu = ET.fromstring(doc_text(os.path.join(CAB, "menu.xml")).encode("utf-8"))
forms, datafile_map, thieu = {}, {}, []
for m in menu.iter("Menu"):
    mtk = m.get("MaToKhai")
    if not mtk:
        continue
    f = forms.setdefault(mtk, dict(ten=m.get("TenToKhai") or "", cap=m.get("Caption") or "", ver=m.get("VersionXML") or "", sheets={}, xsd={}))
    xsd = m.get("XsdSchema") or m.get("MaFile") or ""
    if xsd:
        goc = ("_" + xsd[1:]) if xsd[:1].isdigit() else xsd
        pat_x = re.compile("^(khbs_)?" + re.escape(goc.lower()) + r"_(\d+)\.xsd$|^khbs_" + re.escape(xsd.lower()) + r"_(\d+)\.xsd$")
        cac = sorted((x for x in FILES if pat_x.match(x)), key=lambda x: int(re.findall(r"_(\d+)\.xsd$", x)[0]), reverse=True)
        for x in cac:  # ban moi truoc, ban cu bo sung cho thieu
            for k, v in giai_thich_xsd(os.path.join(CAB, FILES[x])).items():
                f["xsd"].setdefault(k, v)
    for vd in m.iter("Validity"):
        folder = vd.get("FolderName") or m.get("MaFile")
        sheets = list(vd.iter("Sheet"))
        for s in sheets:
            if s.get("DataFile"):
                datafile_map.setdefault(s.get("DataFile").upper(), mtk)
        # cac phien ban co file .xls mau
        goc_xls = ("_" + folder[1:]) if folder[:1].isdigit() else folder
        pat = re.compile("^" + re.escape(goc_xls.lower()) + r"_(\d+)\.xls$")
        vers = sorted({pat.match(x).group(1) for x in FILES if pat.match(x)}, key=int, reverse=True)
        for ver in vers:
            xls = cab_name(folder, ver, ".xls")
            try:
                wb = xlrd.open_workbook(xls, formatting_info=True)
            except Exception:
                try:
                    wb = xlrd.open_workbook(xls)
                except Exception as e:
                    thieu.append((mtk, xls, str(e)[:60]))
                    continue
            names = wb.sheet_names()
            wb1 = None
            x1 = cab_name(folder, ver, ".xls1")
            if x1:
                try:
                    wb1 = xlrd.open_workbook(x1)
                except Exception:
                    wb1 = None
            for s in sheets:
                df = s.get("DataFile")
                if not df or df.upper() == "KHBS":
                    continue
                mp = cab_name(df, ver, ".xml")
                if not mp and df.upper().startswith("KHBS_01_1_"):  # HTKK dung chung mot ban do KHBS cho moi mau TT80
                    mp = cab_name("KHBS_01_1_TT80", ver, ".xml")
                elif not mp and df.upper().startswith("KHBS_01_"):
                    mp = cab_name("KHBS_01_TT80", ver, ".xml")
                if not mp:
                    continue
                sid = s.get("ID")
                if sid in names:
                    sh = Sheet(wb.sheet_by_name(sid))
                elif sid.replace("-", "_") in names:
                    sh = Sheet(wb.sheet_by_name(sid.replace("-", "_")))
                else:
                    continue
                tinh, lap, in2 = anh_xa(mp)
                key_sheet = s.get("SheetName") or sid
                dst = f["sheets"].setdefault(key_sheet, dict(rows={}, tables={}, P={}, H={}, G={}))
                bo_cot_dong = {}
                for (r, c, p) in tinh:
                    bo_cot_dong.setdefault(r, set()).add(c)
                ban_nay = dst.setdefault("pver", ver) == ver
                if ban_nay and wb1 is not None and "khung" not in dst:
                    dst["khung"] = khung_mau_in(wb1, sid, in2)
                for (r, c, p) in tinh:
                    if RAC_PATH.match(p.split("/")[-1]) or "/" not in p and RAC_PATH.match(p):
                        continue
                    k = chuan(p)
                    if k.startswith("TTinChung") or k in dst["rows"]:
                        continue
                    if ban_nay and r not in dst["P"]:
                        dst["P"][r] = cac_cot(sh, r, bo_cot_dong.get(r, set()))
                    nhan = sh.nhan_dong(r, c, bo_cot_dong.get(r, set()))
                    cot = sh.tieu_de_cot(r, c, tren=400, bo_dong=bo_cot_dong)
                    dst["rows"][k] = [r, c, nhan, cot]
                if ban_nay and not dst["H"]:
                    # Tieu de cot: tim dong tieu de bang (co "STT", "Chi tieu", "TAI SAN"...) ngay tren dong bang dau tien.
                    bang = sorted(dst["P"])
                    hr = None
                    if bang:
                        ung = [r0 for r0 in range(0, bang[-1]) if r0 not in dst["P"] and
                               any(TIEU_DE_BANG.match(o_chu(sh.val(r0, c0)) or "") for c0 in range(min(sh.sh.ncols, 40)))]
                        tot = -1
                        for i0, r0 in enumerate(ung):  # chon dong tieu de nam tren khoi dong chi tieu lon nhat
                            ke = ung[i0 + 1] if i0 + 1 < len(ung) else 10 ** 9
                            n = sum(1 for x in bang if r0 < x < ke)
                            if n > tot:
                                tot, hr = n, r0
                    cots = {cc for v in dst["P"].values() for cc, _ in v}

                    def tde(cc):
                        a1 = o_chu(sh.val(hr, cc))
                        a2 = o_chu(sh.val(hr + 1, cc)) if hr + 1 < bang[0] and hr + 1 not in bo_cot_dong else ""
                        return " ".join(x for x in dict.fromkeys([a1, a2]) if x and not CHI_SO.match(x))
                    if hr is not None:
                        # o so lieu trong bang: tieu de cot theo dong tieu de bang (Gia tri HHDV / Thue GTGT, So cuoi nam...)
                        for kk, vv in dst["rows"].items():
                            if vv[0] > hr and vv[0] in dst["P"]:
                                h = tde(vv[1])
                                if h:
                                    vv[3] = h
                        for cc in cots:
                            h = tde(cc)
                            if h:
                                dst["H"][cc] = h
                        # dong muc xen giua bang (A. Ket qua kinh doanh..., B. ...): co chu nhung khong co o so lieu
                        for r0 in range(hr + 1, bang[-1]):
                            if r0 not in dst["P"] and r0 not in bo_cot_dong:
                                v = cac_cot(sh, r0, set())
                                if v and CO_CHU.search(" ".join(t for _, t in v)) and not any(TIEU_DE_BANG.match(t) for _, t in v):
                                    dst["G"][r0] = v
                for t in lap:
                    k = chuan(t["path"])
                    if not k or k in dst["tables"]:
                        continue
                    ten_bang = ""
                    for rr in range(t["tbl"] - 2, max(t["tbl"] - 6, 0), -1):
                        ten_bang = sh.nhan_dong(rr, 60, set())
                        if CO_CHU.search(ten_bang):
                            break
                    cols = []
                    for (c, p) in sorted(t["cols"]):
                        if RAC_PATH.match(p) or p in ("stt",):
                            continue
                        hd = sh.tieu_de_cot(t["data"] - 1, c, duoi=max(t["tbl"] - 2, 0))
                        if not hd:  # tieu de nam cao hon vung bang
                            hd = sh.tieu_de_cot(t["data"], c, tren=10, bo_dong={t["data"] - 1})
                        cols.append([p, hd])
                    dst["tables"][k] = [t["tbl"], ten_bang, cols]

# rut gon
out = {}
dem_ten = 0
for mtk, f in forms.items():
    sh_out = []
    for name, d in f["sheets"].items():
        rows = sorted(d["rows"].items(), key=lambda kv: (kv[1][0], kv[1][1]))
        rr = [[k, v[0], v[2], v[3]] for k, v in rows]
        dem_ten += sum(1 for x in rr if x[2])
        tb = [[k] + v[1:] for k, v in sorted(d["tables"].items(), key=lambda kv: kv[1][0])]
        if rr or tb:
            dung = {x[1] for x in rr}
            P = {str(r): v for r, v in d["P"].items() if r in dung and v}
            H = {str(c): h for c, h in d["H"].items() if h}
            G = {str(r): v for r, v in d["G"].items()}
            sh_out.append([name, rr, tb, P, H, d.get("khung"), G])
    co_ten = {r[0] for s in sh_out for r in s[1] if r[2]}
    x = {k: v for k, v in f["xsd"].items() if k not in co_ten and not k.startswith("TTinChung")}
    dem_xsd = globals().get("dem_xsd", 0) + len(x)
    out[mtk] = dict(t=f["ten"], c=f["cap"], s=sh_out, x=x)

js = ("// Tu dong tao tu bo cai HTKK 5.8.1 (Data1.cab: menu.xml + file anh xa .xml + file mau .xls).\n"
      "// Moi muc: [duong_dan, dong_mau, ten_dong, tieu_de_cot]; x = giai thich truong lay tu file khung .xsd. Khong sua tay.\n"
      "window.TEN_CHI_TIEU=" + json.dumps(dict(forms=out, files=datafile_map), ensure_ascii=False, separators=(",", ":")) + ";\n")
open(OUT, "w", encoding="utf-8").write(js)
co = [k for k, v in out.items() if v["s"]]
print("mau trong menu:", len(out), "| co ten chi tieu:", len(co), "| so dong co ten:", dem_ten, "| kich thuoc:", len(js.encode()) // 1024, "KB")
print("loi doc xls:", len(thieu), thieu[:5])
for k in ["402", "683", "1280", "1281", "864", "892", "953", "842", "844"]:
    v = out.get(k)
    print(k, v and v["t"][:60], v and [(s[0], len(s[1]), len(s[2])) for s in v["s"]])
