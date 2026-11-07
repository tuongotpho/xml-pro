# Đóng gói XML-Pro thành tệp .msix để nộp Microsoft Store (Store ký số thay, người cài không bị cảnh báo).
# Chạy SAU dong-goi.ps1 (cần XML-Pro.exe và 3 thư viện WebView2 trong ban-phat-hanh).
# Cách chạy (PowerShell, tại thư mục dự án):  powershell -ExecutionPolicy Bypass -File dong-goi\dong-goi-store.ps1
# Cần makeappx.exe (Windows SDK). Tìm theo thứ tự: biến XMLPRO_MAKEAPPX, thư mục dong-goi\cong-cu-sdk, Windows Kits.
$ErrorActionPreference = 'Stop'
$dg  = $PSScriptRoot
$app = Split-Path $dg -Parent
$ra  = Join-Path $dg 'ban-phat-hanh'
$utf8 = New-Object System.Text.UTF8Encoding($false)

$pb = (Get-Content (Join-Path $dg 'phien-ban.txt') -Raw).Trim()
$goi = Join-Path $ra 'msix'
if (Test-Path $goi) { Remove-Item $goi -Recurse -Force }
New-Item -ItemType Directory -Force (Join-Path $goi 'Assets') | Out-Null

# 1. Tệp chương trình: đúng danh sách bộ cài chép (CaiDat.Tep)
$tep = @('XML-Pro.exe', 'Microsoft.Web.WebView2.Core.dll', 'Microsoft.Web.WebView2.WinForms.dll', 'WebView2Loader.dll')
foreach ($t in $tep) {
  $p = Join-Path $ra $t
  if (-not (Test-Path $p)) { throw "Thiếu $t — chạy dong-goi.ps1 trước" }
  Copy-Item $p $goi
}
if ((Get-Item (Join-Path $ra 'XML-Pro.exe')).VersionInfo.ProductVersion -notlike "$pb*") { throw "XML-Pro.exe không phải bản $pb — chạy lại dong-goi.ps1 -GiuPhienBan" }
foreach ($t in @('index.html', 'dashboard-dong.js', 'phien-ban.js', 'jszip.min.js', 'xuat-excel.js', 'nganh-doc.js', 'doi-chieu.js',
                 'lap-to-khai.js', 'dashboard-ke-toan.js', 'so-tay.js', 'kho-hoa-don.js', 'tai-hoa-don.js', 'tai-hoa-don-loi.js', 'mau-itax.js', 'ten-chi-tieu.js', 'HUONG-DAN.md')) {
  Copy-Item (Join-Path $app $t) $goi
}

# 2. Biểu tượng các cỡ Store cần, dựng từ XemXmlThue.ico (ảnh 256 px)
Add-Type -AssemblyName System.Drawing
# Ảnh 256 px trong .ico lưu dạng PNG: đọc thẳng từ bảng mục lục của tệp .ico
$by = [IO.File]::ReadAllBytes((Join-Path $dg 'XemXmlThue.ico'))
$goc = $null
for ($i = 0; $i -lt [BitConverter]::ToUInt16($by, 4); $i++) {
  $m = 6 + 16 * $i
  if ($by[$m] -eq 0) { $goc = [System.Drawing.Image]::FromStream((New-Object IO.MemoryStream($by, [BitConverter]::ToInt32($by, $m + 12), [BitConverter]::ToInt32($by, $m + 8)))) }
}
if (-not $goc) { throw 'XemXmlThue.ico không có ảnh 256 px' }
function Ve([string]$ten, [int]$r, [int]$c, [int]$co) {
  $b = New-Object System.Drawing.Bitmap($r, $c)
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.InterpolationMode = 'HighQualityBicubic'; $g.SmoothingMode = 'HighQuality'; $g.PixelOffsetMode = 'HighQuality'
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.DrawImage($goc, [int](($r - $co) / 2), [int](($c - $co) / 2), $co, $co)
  $g.Dispose()
  $b.Save((Join-Path $goi "Assets\$ten"), [System.Drawing.Imaging.ImageFormat]::Png); $b.Dispose()
}
Ve 'Square44x44Logo.png' 44 44 44
Ve 'Square150x150Logo.png' 150 150 110
Ve 'Wide310x150Logo.png' 310 150 110
Ve 'StoreLogo.png' 50 50 50
$goc.Dispose()

# 3. Khai báo gói, số phiên bản dạng x.y.z.0 (Store bắt số cuối bằng 0)
$mf = (Get-Content (Join-Path $dg 'AppxManifest.xml') -Raw -Encoding UTF8).Replace('$PHIENBAN$', "$pb.0")
[IO.File]::WriteAllText((Join-Path $goi 'AppxManifest.xml'), $mf, $utf8)

# 4. Đóng gói
$mk = $env:XMLPRO_MAKEAPPX
if (-not $mk) { $mk = Get-ChildItem (Join-Path $dg 'cong-cu-sdk') -Recurse -Filter makeappx.exe -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match 'x64' } | Select-Object -First 1 -ExpandProperty FullName }
if (-not $mk) { $mk = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin" -Recurse -Filter makeappx.exe -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match '\\x64\\' } | Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName }
if (-not $mk) { Write-Host "Đã soạn xong thư mục gói: $goi"; Write-Host 'Chưa có makeappx.exe (Windows SDK) nên chưa đóng được tệp .msix.'; exit 2 }
$msix = Join-Path $ra "XML-Pro-$pb-Store.msix"
& $mk pack /o /h SHA256 /d $goi /p $msix
if ($LASTEXITCODE) { throw 'makeappx báo lỗi' }
Get-Item $msix | Select-Object Name, @{n='KB';e={[int]($_.Length/1KB)}}
