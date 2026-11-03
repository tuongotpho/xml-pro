# -*- coding: utf-8 -*-
r"""
Tạo bộ hoá đơn bán hàng GIẢ LẬP của một hộ kinh doanh (năm 2026) để thử tính năng lập tờ khai 01/CNKD.
Không có chữ ký số, MST và tên đều giả. Chạy:  python cong-cu\tao-hd-hkd-gia-lap.py  → mau-xml\ho-kinh-doanh-gia-lap\
  Quý 1: bán hàng hoá 600 triệu
  Quý 2: bán hàng hoá 500 triệu + dịch vụ 200 triệu (2 hoá đơn ký hiệu C26HDV)
  Quý 3: bán hàng hoá 900 triệu, trong đó 1 hoá đơn có 50 triệu hàng không chịu thuế GTGT (ghi "KCT")
"""
import os
from xml.sax.saxutils import escape

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RA = os.path.join(APP, 'mau-xml', 'ho-kinh-doanh-gia-lap')
MST = '8000000001'
TEN = 'HỘ KINH DOANH MẪU NGUYỄN VĂN A (GIẢ LẬP)'

# (ký hiệu, số, ngày, người mua, mặt hàng, tiền, phần KCT)
HOA_DON = [
    ('C26HHK', 1, '2026-01-15', 'Khách lẻ', 'Vật liệu xây dựng', 100_000_000, 0),
    ('C26HHK', 2, '2026-02-10', 'Công ty TNHH Khách Mẫu Một (giả lập)', 'Vật liệu xây dựng', 200_000_000, 0),
    ('C26HHK', 3, '2026-03-20', 'Khách lẻ', 'Thiết bị điện', 300_000_000, 0),
    ('C26HHK', 4, '2026-04-12', 'Khách lẻ', 'Vật liệu xây dựng', 250_000_000, 0),
    ('C26HHK', 5, '2026-05-25', 'Công ty TNHH Khách Mẫu Hai (giả lập)', 'Thiết bị điện', 250_000_000, 0),
    ('C26HDV', 1, '2026-05-05', 'Công ty TNHH Khách Mẫu Một (giả lập)', 'Dịch vụ sửa chữa điện', 100_000_000, 0),
    ('C26HDV', 2, '2026-06-18', 'Khách lẻ', 'Dịch vụ lắp đặt', 100_000_000, 0),
    ('C26HHK', 6, '2026-07-08', 'Khách lẻ', 'Vật liệu xây dựng', 400_000_000, 0),
    ('C26HHK', 7, '2026-08-19', 'Công ty TNHH Khách Mẫu Hai (giả lập)', 'Thiết bị điện', 450_000_000, 0),
    ('C26HHK', 8, '2026-09-26', 'Khách lẻ', 'Phân bón', 50_000_000, 50_000_000),
]


def xml_hoa_don(kh, so, ngay, mua, hang, tien, kct):
    ts = f'<TSuat>KCT</TSuat>' if kct else ''
    bang = f'<THTTLTSuat><LTSuat><TSuat>KCT</TSuat><ThTien>{kct}</ThTien><TThue>0</TThue></LTSuat></THTTLTSuat>' if kct else ''
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<HDon><DLHDon Id="GL-{kh}-{so}"><TTChung><PBan>2.1.0</PBan><THDon>Hóa đơn bán hàng</THDon><KHMSHDon>2</KHMSHDon><KHHDon>{kh}</KHHDon><SHDon>{so}</SHDon><NLap>{ngay}</NLap><DVTTe>VND</DVTTe><TGia>1</TGia><HTTToan>TM/CK</HTTToan></TTChung>
<NDHDon><NBan><Ten>{escape(TEN)}</Ten><MST>{MST}</MST><DChi>Số 1 đường Mẫu, phường Mẫu, tỉnh Mẫu (giả lập)</DChi></NBan>
<NMua><Ten>{escape(mua)}</Ten><MST></MST><DChi>Địa chỉ giả lập</DChi></NMua>
<DSHHDVu><HHDVu><TChat>1</TChat><STT>1</STT><THHDVu>{escape(hang)}</THHDVu><DVTinh>lô</DVTinh><SLuong>1</SLuong><DGia>{tien}</DGia><ThTien>{tien}</ThTien>{ts}</HHDVu></DSHHDVu>
<TToan>{bang}<TgTCThue>{tien}</TgTCThue><TgTThue>0</TgTThue><TTCKTMai>0</TTCKTMai><TgTTTBSo>{tien}</TgTTTBSo><TgTTTBChu>(giả lập)</TgTTTBChu></TToan></NDHDon></DLHDon></HDon>
'''


def tao(thu_muc=RA):
    os.makedirs(thu_muc, exist_ok=True)
    ds = []
    for kh, so, ngay, mua, hang, tien, kct in HOA_DON:
        f = os.path.join(thu_muc, f'GIA-LAP_{ngay.replace("-", "")}_{MST}_{kh}_{so:07d}.xml')
        with open(f, 'w', encoding='utf-8') as g:
            g.write(xml_hoa_don(kh, so, ngay, mua, hang, tien, kct))
        ds.append(f)
    return ds


if __name__ == '__main__':
    ds = tao()
    print(f'Đã tạo {len(ds)} hoá đơn giả lập trong {RA}')
