# Chạy thử bản NGUỒN (F:\AI\6.chrome-ex\xem-xml-thue\index.html) trước khi đóng gói exe.
#   powershell -ExecutionPolicy Bypass -File F:\AI\6.chrome-ex\xem-xml-thue\dong-goi\chay-thu.ps1 "C:\đường\dẫn\tệp.xml" "tệp2.xml"
# - Mở cửa sổ Edge giống hệt bản cài (một cửa sổ, tab, lịch sử, tắt dịch) nhưng chạy thẳng tệp nguồn,
#   hồ sơ + lịch sử riêng ở %LOCALAPPDATA%\XemXmlThue-ChayThu — không đụng bản đã cài.
# - Chạy lại lệnh với tệp khác: tệp vào thành tab mới trong cửa sổ chạy thử đang mở.
# - Không truyền tệp: chỉ mở cửa sổ, kéo thả tệp vào.
# Sửa index.html xong: bấm F5 trong cửa sổ chạy thử là thấy ngay. Ưng rồi mới chạy dong-goi.ps1.
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Tep)
$ErrorActionPreference = 'Stop'
$app  = Split-Path $PSScriptRoot -Parent
$goc  = Join-Path $env:LOCALAPPDATA 'XemXmlThue-ChayThu'
$hang = Join-Path $goc 'XemXmlThue\mo\hang'
New-Item -ItemType Directory -Force $hang | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding $false

# Ghi tệp vào hàng chờ — cùng cách XemXmlThue.exe làm
$tepSo = Join-Path $hang 'so.txt'
$so = 1; if (Test-Path $tepSo) { $so = [int](Get-Content $tepSo) }
$soDau = $so
$ds = @($Tep | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | ForEach-Object { (Resolve-Path -LiteralPath $_).Path })
if ($ds.Count) {
  $muc = $ds | ForEach-Object {
    '{ten:' + (ConvertTo-Json ([IO.Path]::GetFileName($_))) + ',duongDan:' + (ConvertTo-Json $_) +
    ',b64:"' + [Convert]::ToBase64String([IO.File]::ReadAllBytes($_)) + '"}'
  }
  [IO.File]::WriteAllText("$hang\$so.js.tam", "window.__NHAN_FILE&&window.__NHAN_FILE($so,[" + ($muc -join ',') + "]);", $utf8)
  Move-Item -Force "$hang\$so.js.tam" "$hang\$so.js"
  [IO.File]::WriteAllText($tepSo, [string]($so + 1), $utf8)
  "Đã gửi $($ds.Count) tệp (lượt $so)"
}

# Cửa sổ chạy thử đang mở thật sự (có cửa sổ hiển thị) thì đưa lên trước; nếu chỉ còn tiến trình ngầm không cửa sổ thì dọn đi để mở mới
$procs = @(Get-CimInstance Win32_Process -Filter "name='msedge.exe'" | Where-Object { $_.CommandLine -like '*XemXmlThue-ChayThu*' })
if ($procs.Count) {
  $win = Get-Process -Id ($procs | Select-Object -ExpandProperty ProcessId) -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
  if ($win) {
    Add-Type -Name WinFg -Namespace XemXml -MemberDefinition '[DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr h, int c); [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);' -ErrorAction SilentlyContinue
    [void][XemXml.WinFg]::ShowWindowAsync($win.MainWindowHandle, 9)
    [void][XemXml.WinFg]::SetForegroundWindow($win.MainWindowHandle)
    'Cửa sổ chạy thử đang mở — tệp sẽ vào tab mới.'; exit 0
  }
  $procs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Milliseconds 800
}

$edge = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe' -ErrorAction SilentlyContinue).'(default)'
if (-not $edge) { $edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe" }
$url = ([Uri](Join-Path $app 'index.html')).AbsoluteUri + '?thu=1&hang=' + [Uri]::EscapeDataString(([Uri]"$hang\").AbsoluteUri) + "&so=$soDau"
# Cùng các cờ như XemXmlThue.exe
$co = @("--app=`"$url`"", "--user-data-dir=`"$goc\trinh-duyet`"", '--no-first-run', '--no-default-browser-check', '--disable-sync',
        '--allow-file-access-from-files', '--disable-background-mode', '--lang=vi',
        '--disable-features=Translate,TranslateUI,msEdgeTranslate,msEdgeSidebarV2')
Start-Process $edge -ArgumentList $co -WindowStyle Normal
'Đã mở cửa sổ CHẠY THỬ (bản nguồn).'
