# Đóng gói Xem XML thuế thành bộ cài .exe — chạy trong PowerShell:
#   powershell -ExecutionPolicy Bypass -File F:\AI\6.chrome-ex\xem-xml-thue\dong-goi\dong-goi.ps1
# Mỗi lần chạy tự tăng phiên bản (1.0.0 -> 1.0.1 ...), ghi ở dong-goi\phien-ban.txt.
#   -GiuPhienBan   : đóng gói lại, giữ nguyên số phiên bản
#   -PhienBan 1.1.0: đặt hẳn một số phiên bản
# Dùng csc.exe có sẵn trong Windows (.NET Framework 4), không cần cài thêm gì.
param([switch]$GiuPhienBan, [string]$PhienBan)
$ErrorActionPreference = 'Stop'
$dg   = $PSScriptRoot
$app  = Split-Path $dg -Parent
$ra   = Join-Path $dg 'ban-phat-hanh'
$csc  = "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$utf8 = New-Object System.Text.UTF8Encoding $false

# --- Phiên bản ---
$tepPb = Join-Path $dg 'phien-ban.txt'
$cu = if (Test-Path $tepPb) { (Get-Content $tepPb -Raw).Trim() } else { '1.0.0' }
if ($PhienBan) { $moi = $PhienBan }
elseif ($GiuPhienBan) { $moi = $cu }
else { $p = $cu.Split('.'); $p[2] = [string]([int]$p[2] + 1); $moi = $p -join '.' }
if ($moi -notmatch '^\d+\.\d+\.\d+$') { throw "Số phiên bản không hợp lệ: $moi" }
[IO.File]::WriteAllText($tepPb, $moi, $utf8)
[IO.File]::WriteAllText((Join-Path $dg 'PhienBan.cs'),
  "// TU TAO boi dong-goi.ps1 - khong sua tay.`r`nusing System.Reflection;`r`n" +
  "[assembly: AssemblyVersion(`"$moi.0`")]`r`n[assembly: AssemblyFileVersion(`"$moi.0`")]`r`n[assembly: AssemblyInformationalVersion(`"$moi`")]`r`n" +
  "static class PhienBanApp { public const string So = `"$moi`"; }`r`n", $utf8)
[IO.File]::WriteAllText((Join-Path $app 'phien-ban.js'), "window.PHIEN_BAN = `"$moi`";`n", $utf8)
"Phiên bản: $cu -> $moi"

# --- Biên dịch ---
New-Item -ItemType Directory -Force $ra | Out-Null
Get-ChildItem $ra -Filter "CaiDat-XML-Pro-$moi.exe" | Remove-Item -Force
$chung = @('/nologo', '/target:winexe', '/codepage:65001', '/optimize+', "/win32icon:$dg\XemXmlThue.ico",
           '/r:System.Windows.Forms.dll', '/r:System.Core.dll')

& $csc @chung "/out:$ra\XML-Pro.exe" "$dg\XemXmlThue.cs" "$dg\Chung.cs" "$dg\PhienBan.cs"
if ($LASTEXITCODE) { throw 'Biên dịch XML-Pro.exe lỗi' }

$nhung = @("/resource:$ra\XML-Pro.exe,XML-Pro.exe",
           "/resource:$app\index.html,index.html",
           "/resource:$app\dashboard-dong.js,dashboard-dong.js",
           "/resource:$app\phien-ban.js,phien-ban.js",
           "/resource:$app\jszip.min.js,jszip.min.js",
           "/resource:$app\xuat-excel.js,xuat-excel.js",
           "/resource:$app\nganh-doc.js,nganh-doc.js",
           "/resource:$app\doi-chieu.js,doi-chieu.js",
           "/resource:$app\mau-itax.js,mau-itax.js",
           "/resource:$app\ten-chi-tieu.js,ten-chi-tieu.js",
           "/resource:$app\HUONG-DAN.md,HUONG-DAN.md")
$caiDat = "$ra\CaiDat-XML-Pro-$moi.exe"
& $csc @chung @nhung "/out:$caiDat" "$dg\CaiDat.cs" "$dg\Chung.cs" "$dg\PhienBan.cs"
if ($LASTEXITCODE) { throw 'Biên dịch bộ cài lỗi' }

Get-ChildItem $ra | Select-Object Name, @{n='KB';e={[int]($_.Length/1KB)}}, @{n='PhienBan';e={$_.VersionInfo.ProductVersion}}
