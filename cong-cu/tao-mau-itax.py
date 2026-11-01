"""
Rút bộ mẫu hiển thị XSLT + danh mục biểu mẫu + hàm định dạng từ bộ cài iTax Viewer
thành tệp mau-itax.js (nén ZIP base64, giải nén trên trình duyệt bằng JSZip có sẵn).

Cách chạy khi Tổng cục Thuế ra bản iTax Viewer mới:
  python -I cong-cu\\tao-mau-itax.py "C:\\Program Files (x86)\\iTax Viewer" mau-itax.js
"""
import base64
import hashlib
import html
import io
import json
import os
import re
import sys
import xml.etree.ElementTree as ET
import zipfile

sys.stdout.reconfigure(encoding='utf-8')


def norm_rel(itax_dir: str, full_path: str) -> str:
    return os.path.relpath(os.path.normpath(full_path), os.path.normpath(itax_dir)).replace('\\', '/').lower()


def split_top_args(arg_str: str):
    args, cur, depth, in_q = [], [], 0, None
    for ch in arg_str:
        if in_q:
            cur.append(ch)
            if ch == in_q:
                in_q = None
        else:
            if ch in ("'", '"'):
                in_q = ch
                cur.append(ch)
            elif ch == '(':
                depth += 1
                cur.append(ch)
            elif ch == ')':
                depth -= 1
                cur.append(ch)
            elif ch == ',' and depth == 0:
                args.append(''.join(cur).strip())
                cur = []
            else:
                cur.append(ch)
    if cur:
        args.append(''.join(cur).strip())
    return args


def quote_xpath_attr(expr: str) -> str:
    if '"' not in expr:
        return f'"{expr}"'
    if "'" not in expr:
        return f"'{expr}'"
    return '"' + expr.replace('"', '&quot;') + '"'


def rewrite_xslt(raw_txt: str, cur_path: str, itax_dir: str) -> str:
    txt = raw_txt.lstrip('\ufeff')
    txt = re.sub(r'<\?xml[^>]*\?>', '', txt, count=1).strip()
    # Bỏ khối <msxsl:script> (đã trích xuất riêng sang hàm JS dùng chung)
    txt = re.sub(r'<msxsl:script\b[\s\S]*?</msxsl:script>', '', txt)

    # Chuẩn hoá <xsl:include / <xsl:import href="..."> thành đường dẫn chuẩn hoá từ gốc iTax Viewer
    def resolve_inc_path(href: str) -> str:
        href_norm = href.strip().replace('/', '\\')
        p1 = os.path.normpath(os.path.join(os.path.dirname(cur_path), href_norm))
        if os.path.exists(p1) and os.path.isfile(p1):
            return p1
        p2 = os.path.normpath(os.path.join(itax_dir, href_norm))
        if os.path.exists(p2) and os.path.isfile(p2):
            return p2
        return ''

    def repl_inc(m):
        tag = m.group(1)
        inc_full = resolve_inc_path(m.group(2))
        if not inc_full:
            return ''
        k = norm_rel(itax_dir, inc_full)
        return f'<xsl:{tag} href="{k}"/>'

    txt = re.sub(r'<xsl:(include|import)\s+href\s*=\s*["\']([^"\']+)["\']\s*/>', repl_inc, txt)
    txt = re.sub(r'<xsl:(include|import)\s+href\s*=\s*["\']([^"\']+)["\']\s*>\s*</xsl:\1>', repl_inc, txt)

    # Sửa lỗi đóng thẻ </div> đặt nhầm sau </table> và select="" rỗng trong tệp gốc của iTax Viewer
    txt = re.sub(
        r'(<div class="ghichu">\s*<div><i>[^<]*</i></div>\s*<div id="sigDiv"></div>)\s*(</td>\s*</tr>\s*</table>)\s*</div>',
        r'\1</div>\n\2',
        txt
    )
    txt = re.sub(r'(<xsl:(?:variable|param)\b[^>]*?\bselect\s*=\s*)""', r'\1"\'\'"', txt)

    # Thay <xsl:value-of select="ihtkk:fn(...)" /> thành <span data-ih="fn"><i data-a="0">...</i></span>
    def repl_vo(m):
        fn = m.group(2)
        args = split_top_args(m.group(3))
        inner = ''.join(f'<i data-a="{i}"><xsl:value-of select={quote_xpath_attr(a)}/></i>' for i, a in enumerate(args))
        return f'<span data-ih="{fn}">{inner}</span>'

    txt = re.sub(
        r'<xsl:value-of\b[^>]*?\bselect\s*=\s*(["\'])\s*(?:ihtkk|kdtxslt):([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)\s*\1[^>]*(?:/>|>\s*</xsl:value-of>)',
        repl_vo,
        txt
    )

    # Thay các lệnh gọi ihtkk:stringDatetime(...) còn lại trong biểu thức XPath (vd <xsl:if test="...">) bằng XPath 1.0 thuần
    def repl_dt_xpath(m):
        expr = m.group(1).strip()
        fmt = m.group(2).strip()
        if fmt == 'yyyy':
            return f"concat(substring({expr},7,4*number(contains({expr},'/'))),substring({expr},1,4*number(contains({expr},'-'))))"
        if fmt == 'mm':
            return f"concat(substring({expr},4,2*number(contains({expr},'/'))),substring({expr},6,2*number(contains({expr},'-'))))"
        if fmt == 'dd':
            return f"concat(substring({expr},1,2*number(contains({expr},'/'))),substring({expr},9,2*number(contains({expr},'-'))))"
        if fmt == 'dd/mm/yyyy':
            return (
                f"concat(substring({expr},1,10*number(contains({expr},'/'))),"
                f"substring({expr},9,2*number(contains({expr},'-'))),substring('/',1,number(contains({expr},'-'))),"
                f"substring({expr},6,2*number(contains({expr},'-'))),substring('/',1,number(contains({expr},'-'))),"
                f"substring({expr},1,4*number(contains({expr},'-'))))"
            )
        return expr

    txt = re.sub(
        r"(?:ihtkk|kdtxslt):stringDatetime\s*\(\s*([^,]+?)\s*,\s*['\"]([^'\"]+)['\"]\s*\)",
        repl_dt_xpath,
        txt
    )

    # Gom bớt khoảng trắng đầu dòng để giảm dung lượng
    txt = re.sub(r'\n[ \t]+', '\n', txt)
    return txt


def local_tag(tag: str) -> str:
    return tag.split('}', 1)[1] if '}' in tag else tag


def child_text(el, name: str) -> str:
    for c in el:
        if local_tag(c.tag) == name:
            return (c.text or '').strip()
    return ''


def parse_dmuc_all(itax_dir: str):
    data_dir = os.path.join(itax_dir, 'data')
    dmuc = {
        'tkhai': {},      # maTKhai -> [{p, l, k, o, x, pl: {id: [ten, x, o]}}]
        'tbao': {},       # maTBao -> [{p, o, x}]
        'tbaoNtdt': {},   # maTBao -> [{p, o, x}]
        'tbaoKdtt': {},   # maTBao -> [{p, o, x}]
        'ctu': {},        # maCTu -> [{p, o, x}]
        'dky': {},        # maDKy -> [{p, o, x}]
        'bkeKdtt': {},    # maBKe -> [{p, o, x}]
        'tsoat': [],      # [{p, x}]
        'xnhan': [],      # [{p, x}]
        'btru': [],       # [{p, x}]
        'hquan': {},      # ma -> [{p, x}]
    }
    seed_files = set()

    def reg_xsl(raw_rel: str) -> str:
        if not raw_rel:
            return ''
        full = os.path.normpath(os.path.join(itax_dir, raw_rel.strip().replace('/', '\\')))
        if not os.path.exists(full) or not os.path.isfile(full):
            return ''
        seed_files.add(full)
        return norm_rel(itax_dir, full)

    # 1. DMucTKhai.xml
    p_tk = os.path.join(data_dir, 'DMucTKhai.xml')
    if os.path.exists(p_tk):
        for tk in ET.parse(p_tk).getroot():
            if local_tag(tk.tag) != 'TKhai':
                continue
            ma = tk.attrib.get('maTKhai', '').strip()
            x = reg_xsl(child_text(tk, 'XSLT'))
            pls = {}
            for ds in tk:
                if local_tag(ds.tag) == 'DSachPLuc':
                    for pl in ds:
                        if local_tag(pl.tag) == 'PLuc':
                            pid = pl.attrib.get('plucID', '').strip()
                            px = reg_xsl(child_text(pl, 'PLucXSLT'))
                            if pid and px:
                                pls[pid] = [
                                    child_text(pl, 'TenPLuc'),
                                    px,
                                    pl.attrib.get('plucOrientation', '0').strip()
                                ]
            if ma and (x or pls):
                entry = {
                    'p': tk.attrib.get('pbanTKhai', '').strip(),
                    'l': tk.attrib.get('loaiTKhai', '').strip(),
                    'o': tk.attrib.get('orientation', '0').strip(),
                    'x': x,
                }
                if pls:
                    entry['pl'] = pls
                dmuc['tkhai'].setdefault(ma, []).append(entry)

    # 2. DMucTbao.xml & DMucTbao_InCDoi.xml
    for fn in ('DMucTbao.xml', 'DMucTbao_InCDoi.xml'):
        pf = os.path.join(data_dir, fn)
        if os.path.exists(pf):
            for tb in ET.parse(pf).getroot():
                if local_tag(tb.tag) != 'TBao':
                    continue
                ma = tb.attrib.get('maTBao', '').strip()
                x = reg_xsl(child_text(tb, 'XSLT'))
                if ma and x:
                    dmuc['tbao'].setdefault(ma, []).append({
                        'p': tb.attrib.get('pbanTBao', '').strip(),
                        'o': tb.attrib.get('orientation', '0').strip(),
                        'x': x,
                    })

    # 3. DMucTBaoNtdt.xml & DMucTBaoNtdt22.xml
    for fn in ('DMucTBaoNtdt.xml', 'DMucTBaoNtdt22.xml'):
        pf = os.path.join(data_dir, fn)
        if os.path.exists(pf):
            for tb in ET.parse(pf).getroot():
                if local_tag(tb.tag) != 'TBao':
                    continue
                ma = tb.attrib.get('maTBao', '').strip()
                x = reg_xsl(child_text(tb, 'XSLT'))
                if ma and x:
                    dmuc['tbaoNtdt'].setdefault(ma, []).append({
                        'p': tb.attrib.get('pbanTBao', '').strip(),
                        'o': tb.attrib.get('orientation', '0').strip(),
                        'x': x,
                    })

    # 4. DMucTBaoKDTT.xml
    pf = os.path.join(data_dir, 'DMucTBaoKDTT.xml')
    if os.path.exists(pf):
        for tb in ET.parse(pf).getroot():
            if local_tag(tb.tag) != 'TBao':
                continue
            ma = tb.attrib.get('maTBao', '').strip()
            x = reg_xsl(child_text(tb, 'XSLT'))
            if ma and x:
                dmuc['tbaoKdtt'].setdefault(ma, []).append({
                    'p': tb.attrib.get('pbanTBao', '').strip(),
                    'o': tb.attrib.get('orientation', '0').strip(),
                    'x': x,
                })

    # 5. DMucCTu.xml
    pf = os.path.join(data_dir, 'DMucCTu.xml')
    if os.path.exists(pf):
        for ct in ET.parse(pf).getroot():
            if local_tag(ct.tag) != 'CTu':
                continue
            ma = ct.attrib.get('maCTu', '').strip()
            x = reg_xsl(child_text(ct, 'XSLT'))
            if ma and x:
                dmuc['ctu'].setdefault(ma, []).append({
                    'p': ct.attrib.get('pbanCTu', '').strip(),
                    'o': ct.attrib.get('orientation', '0').strip(),
                    'x': x,
                })

    # 6. DMucHSoDky.xml
    pf = os.path.join(data_dir, 'DMucHSoDky.xml')
    if os.path.exists(pf):
        for dk in ET.parse(pf).getroot():
            if local_tag(dk.tag) != 'DKyThueDTu':
                continue
            ma = dk.attrib.get('maDKy', '').strip()
            x = reg_xsl(child_text(dk, 'XSLT'))
            if ma and x:
                dmuc['dky'].setdefault(ma, []).append({
                    'p': dk.attrib.get('pBanDKy', '').strip(),
                    'o': dk.attrib.get('orientation', '0').strip(),
                    'x': x,
                })

    # 7. DMucBKeKDTT.xml
    pf = os.path.join(data_dir, 'DMucBKeKDTT.xml')
    if os.path.exists(pf):
        for bk in ET.parse(pf).getroot():
            if local_tag(bk.tag) != 'BKe':
                continue
            ma = bk.attrib.get('maBKe', '').strip()
            x = reg_xsl(child_text(bk, 'XSLT'))
            if ma and x:
                dmuc['bkeKdtt'].setdefault(ma, []).append({
                    'p': bk.attrib.get('pbanBKe', '').strip(),
                    'o': bk.attrib.get('orientation', '0').strip(),
                    'x': x,
                })

    # 8. Tra soát / Xác nhận / Bù trừ
    for fn, key, tag, pattr in (
        ('DmucTSoatNtdt.xml', 'tsoat', 'TSoat', 'pbanTSoat'),
        ('DMucXNhanCTuNtdt.xml', 'xnhan', 'XNhanCTu', 'pbanXML'),
        ('DmucBtruNtdt.xml', 'btru', 'Btru', 'pbanBtru'),
    ):
        pf = os.path.join(data_dir, fn)
        if os.path.exists(pf):
            for el in ET.parse(pf).getroot():
                if local_tag(el.tag) == tag:
                    x = reg_xsl(child_text(el, 'XSLT'))
                    if x:
                        dmuc[key].append({'p': el.attrib.get(pattr, '').strip(), 'x': x})

    # 9. Hải quan
    for fn in ('DMucHquanNew.xml', 'DMucHquan1.xml', 'DMucHquan.xml'):
        pf = os.path.join(data_dir, fn)
        if os.path.exists(pf):
            for el in ET.parse(pf).getroot():
                ma = el.attrib.get('maTBaoHquan', '').strip()
                x = reg_xsl(child_text(el, 'XSLT'))
                if ma and x:
                    dmuc['hquan'].setdefault(ma, []).append({
                        'p': el.attrib.get('pbanTBaoHquan', '').strip(),
                        'x': x,
                    })

    return dmuc, seed_files


def scope_css(raw_css: str, prefix='.itax-sheet') -> str:
    # Bỏ chú thích /*...*/ và các dòng // lỗi cú pháp trong ihtkk_ntdt.css
    css = re.sub(r'/\*[\s\S]*?\*/', '', raw_css)
    css = re.sub(r'(?m)^\s*//.*$', '', css)
    css = css.replace('##', '#')
    out = []
    for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', css):
        sel_raw = m.group(1).strip()
        body = m.group(2).strip()
        if not sel_raw or not body:
            continue
        sels = []
        for s in sel_raw.split(','):
            s = s.strip()
            if not s:
                continue
            if s.lower() == 'body':
                sels.append(prefix)
            else:
                sels.append(f'{prefix} {s}')
        if sels:
            out.append(','.join(sels) + '{' + re.sub(r'\s+', ' ', body) + '}')
    return '\n'.join(out)


def extract_ih_js(itax_dir: str) -> str:
    """Trích xuất toàn bộ các hàm JS trong <msxsl:script> từ các tệp common.xsl của iTax Viewer."""
    xsl_root = os.path.join(itax_dir, 'data', 'xslt')
    sources = [
        r'CTu\common\commonTT84.xsl',
        r'XSLT 2.0.9\TBaoKDTT\common\common.xsl',
        r'XSLT 2.0.9\TBaoKDTT_InCDoi\common\common.xsl',
        r'XSLT 2.3.7\TKhaiThue\common\common.xsl',
        r'XSLT 2.0.6\XSLT 2.5.6\TBaoThue\common\common.xsl',
        r'XSLT 2.3.4\TKhaiThue\common\common.xsl',
        r'XSLT 2.8.6\TKhaiThue\xslt\DNHT\PL01_1_HT.xslt',
        r'XSLT 2.8.1\TKhaiThue\common\common.xsl',
    ]
    chunks = []
    for rel in sources:
        p = os.path.join(xsl_root, rel)
        if not os.path.exists(p):
            continue
        txt = open(p, 'r', encoding='utf-8', errors='replace').read()
        for m in re.finditer(r'<msxsl:script[^>]*>([\s\S]*?)</msxsl:script>', txt):
            js = html.unescape(m.group(1))
            chunks.append(f'// --- {rel} ---\n' + js)
    return '\n'.join(chunks)


def main():
    itax_dir = sys.argv[1] if len(sys.argv) > 1 else r'C:\Program Files (x86)\iTax Viewer'
    out_js = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.dirname(__file__)), 'mau-itax.js')

    dmuc, seed_files = parse_dmuc_all(itax_dir)

    # Duyệt bắc cầu mọi <xsl:include> / <xsl:import>
    visited = {}
    queue = list(seed_files)
    while queue:
        cur = queue.pop()
        k = norm_rel(itax_dir, cur)
        if k in visited or not os.path.exists(cur):
            continue
        raw = open(cur, 'r', encoding='utf-8', errors='replace').read()
        for m in re.finditer(r'<xsl:(?:include|import)\s+href\s*=\s*["\']([^"\']+)["\']', raw):
            href_norm = m.group(1).strip().replace('/', '\\')
            inc = os.path.normpath(os.path.join(os.path.dirname(cur), href_norm))
            if not (os.path.exists(inc) and os.path.isfile(inc)):
                inc = os.path.normpath(os.path.join(itax_dir, href_norm))
            if os.path.exists(inc) and os.path.isfile(inc) and norm_rel(itax_dir, inc) not in visited:
                queue.append(inc)
        visited[k] = rewrite_xslt(raw, cur, itax_dir)

    # Khử trùng nội dung XSLT theo mã băm SHA1
    hash_to_text = {}
    path_to_hash = {}
    for k, content in sorted(visited.items()):
        h = hashlib.sha1(content.encode('utf-8')).hexdigest()[:10]
        hash_to_text[h] = content
        path_to_hash[k] = h

    # Đóng gói toàn bộ các tệp XSLT duy nhất vào một kho nén ZIP trong bộ nhớ (để JSZip mở cực nhanh)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for h, content in sorted(hash_to_text.items()):
            zf.writestr(h, content.encode('utf-8'))
    zip_bytes = buf.getvalue()
    zip_b64 = base64.b64encode(zip_bytes).decode('ascii')

    # CSS chuẩn của iTax Viewer (đã cô lập trong .itax-sheet)
    css1 = open(os.path.join(itax_dir, 'data', 'css', 'ihtkk.css'), 'r', encoding='utf-8', errors='replace').read()
    css2 = open(os.path.join(itax_dir, 'data', 'css', 'ihtkk_ntdt.css'), 'r', encoding='utf-8', errors='replace').read()
    scoped_css = scope_css(css1 + '\n' + css2, '.itax-sheet')

    ih_js = extract_ih_js(itax_dir)

    # Xuất ra mau-itax.js
    payload_meta = json.dumps({
        'dmuc': dmuc,
        'files': path_to_hash,
        'css': scoped_css,
    }, ensure_ascii=False, separators=(',', ':'))

    js_out = f"""// TỰ TẠO bởi cong-cu/tao-mau-itax.py từ bộ cài iTax Viewer — không sửa tay.
(() => {{
  const META = {payload_meta};
  const ZIP_B64 = "{zip_b64}";
  // Bộ hàm định dạng gốc trong <msxsl:script> của iTax Viewer
  const ihScope = (() => {{
{ih_js}
    return {{
      DocTienBangChu, breakWord, convertKyBaoCao, formatNumber, formatNumberUSD,
      formatVar, getHuyen, getKHBM, getMaCTcapTren, getMonthFromString,
      getTTThayDoi, getTenBVMT, getTenCT, getTenGhiChuBC26, getTenNganCT,
      getTenPLP, getTenTN, getTenUpperCT, getTinh, kyTinhThue,
      kyTinhThueTruMot, kyTinhThue_hddt, stringDatetime, stringDatetimeTEM,
      timeToString, toEnglishCashUSD, toFormatDecimal, toFormatDecimall
    }};
  }})();

  // Bộ chuyển đổi tham số chuỗi sang đối tượng giống MSXML NodeList mà hàm gốc của iTax Viewer mong đợi
  const wrapNode = s => {{
    const v = s == null ? '' : String(s);
    return {{
      nextNode: () => ({{
        hasChildNodes: () => v !== '',
        childNodes: v !== '' ? [{{ nodeValue: v }}] : []
      }})
    }};
  }};

  // Ghi đè formatNumber an toàn cho cả số nguyên lớn > 15 chữ số
  function safeFormatNumber(raw) {{
    if (raw == null) return '';
    let v = String(raw).trim();
    if (!v) return '';
    if (!/^-?\\d+(?:\\.\\d+)?$/.test(v)) {{
      try {{ return ihScope.formatNumber(wrapNode(v)); }} catch {{ return v; }}
    }}
    let neg = false;
    if (v.startsWith('-')) {{ neg = true; v = v.slice(1); }}
    let [intP, decP] = v.split('.');
    intP = intP.replace(/^0+(?=\\d)/, '') || '0';
    intP = intP.replace(/\\B(?=(\\d{{3}})+(?!\\d))/g, '.');
    let out = decP !== undefined ? intP + ',' + decP : intP;
    return neg ? '(' + out + ')' : out;
  }}

  function callIh(fn, args) {{
    if (fn === 'formatNumber') return safeFormatNumber(args[0]);
    const f = ihScope[fn];
    if (!f) return args.join('');
    try {{
      // Một số hàm nhận chuỗi trực tiếp (strFormat), đối số đầu là nodeList
      const wrapped = args.map((a, idx) => {{
        if ((fn === 'stringDatetime' || fn === 'stringDatetimeTEM' || fn === 'timeToString') && idx === 1) return String(a || '');
        if ((fn === 'toFormatDecimal' || fn === 'toFormatDecimall') && idx === 1) return Number(a) || 0;
        if (fn === 'breakWord' && idx > 0) return Number(a) || 0;
        return wrapNode(a);
      }});
      const r = f(...wrapped);
      return r == null ? '' : String(r);
    }} catch {{
      return args[0] || '';
    }}
  }}

  window.MAU_ITAX = {{
    ...META,
    zipB64: ZIP_B64,
    callIh,
    formatNumber: safeFormatNumber,
  }};
}})();
"""
    with open(out_js, 'w', encoding='utf-8') as f:
        f.write(js_out)

    print(f"Đã tạo {out_js}:")
    print(f"  - Tệp XSLT tham chiếu (gồm cả include): {len(visited)} -> duy nhất: {len(hash_to_text)}")
    print(f"  - Dung lượng kho XSLT nén (ZIP): {len(zip_bytes)/1024/1024:.2f} MB")
    print(f"  - Tổng dung lượng mau-itax.js: {os.path.getsize(out_js)/1024/1024:.2f} MB")


if __name__ == '__main__':
    main()

