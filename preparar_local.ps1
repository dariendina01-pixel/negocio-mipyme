# =============================================================
# preparar_local.ps1 — Descarga JDK, Gradle y Android SDK
# para compilación local del APK. Requiere conexión estable.
# =============================================================
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$sdk = "C:\Android\Sdk"
$gradleDist = "C:\gradle-dist"
$javaHome = "C:\Java\jdk-17"

Write-Host "=== Preparando entorno de compilacion local ===" -ForegroundColor Cyan

function Descargar($url, $dest, $label) {
  if (Test-Path $dest) { Write-Host "[$label] ya existe, saltando"; return }
  $ok = $false
  for ($i = 1; $i -le 8; $i++) {
    Write-Host "[$label] descargando (intento $i)..."
    try {
      $sw = [System.Diagnostics.Stopwatch]::StartNew()
      $wc = New-Object System.Net.WebClient
      $wc.DownloadFile($url, $dest)
      $sw.Stop()
      $len = (Get-Item $dest).Length
      Write-Host "[$label] OK: $([math]::Round($len/1MB,1)) MB en $([math]::Round($sw.Elapsed.TotalSeconds))s" -ForegroundColor Green
      $ok = $true; break
    } catch {
      Write-Host "[$label] fallo: $($_.Exception.InnerException.Message)" -ForegroundColor Yellow
      Start-Sleep 5
    }
  }
  if (-not $ok) { Write-Host "[$label] NO SE PUDO DESCARGAR" -ForegroundColor Red; exit 1 }
}

# Crear carpetas
New-Item -ItemType Directory -Force -Path $gradleDist, $javaHome, "$sdk\platforms", "$sdk\build-tools", "$sdk\platform-tools", "$sdk\licenses" | Out-Null

# Licencias Android SDK
Set-Content -Path "$sdk\licenses\android-sdk-license" -Value "`n24333f8a63b6825ea9c5514f83c2829b004d1fee" -Encoding ascii
Set-Content -Path "$sdk\licenses\android-sdk-preview-license" -Value "`n84831b9409646a918e30573bab4c9c91346d8abd" -Encoding ascii
Write-Host "[sdk-licenses] listo" -ForegroundColor Green

# 1. JDK 17 (Adoptium)
$jdkUrl = "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse"
$jdkZip = "$env:TEMP\jdk17.zip"
Descargar $jdkUrl $jdkZip "JDK17"
Write-Host "[JDK17] extrayendo..."
Expand-Archive -Path $jdkZip -DestinationPath "C:\Java\jdk-tmp" -Force
$jdkDir = Get-ChildItem "C:\Java\jdk-tmp" -Directory | Select-Object -First 1
if (Test-Path $javaHome) { Remove-Item $javaHome -Recurse -Force }
Move-Item $jdkDir.FullName $javaHome
Remove-Item "C:\Java\jdk-tmp" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $jdkZip -Force -ErrorAction SilentlyContinue
Write-Host "[JDK17] listo en $javaHome" -ForegroundColor Green

# 2. Gradle 9.3.1
$gradleZip = "$gradleDist\gradle-9.3.1-bin.zip"
Descargar "https://services.gradle.org/distributions/gradle-9.3.1-bin.zip" $gradleZip "Gradle"
Write-Host "[Gradle] listo" -ForegroundColor Green

# 3. Android platform 36
$platZip = "$env:TEMP\platform-36.zip"
Descargar "https://mirrors.cloud.tencent.com/AndroidSDK/platform-36_r02.zip" $platZip "Platform-36"
Expand-Archive -Path $platZip -DestinationPath "$sdk\platforms" -Force
Remove-Item $platZip -Force -ErrorAction SilentlyContinue
Write-Host "[Platform-36] listo" -ForegroundColor Green

# 4. Android build-tools 36
$btZip = "$env:TEMP\build-tools-36.zip"
Descargar "https://mirrors.cloud.tencent.com/AndroidSDK/build-tools_r36_windows.zip" $btZip "BuildTools-36"
Expand-Archive -Path $btZip -DestinationPath "$sdk\build-tools" -Force
Remove-Item $btZip -Force -ErrorAction SilentlyContinue
Write-Host "[BuildTools-36] listo" -ForegroundColor Green

# 5. Android platform-tools
$ptZip = "$env:TEMP\platform-tools.zip"
Descargar "https://mirrors.cloud.tencent.com/AndroidSDK/platform-tools_r37.0.1-win.zip" $ptZip "PlatformTools"
Expand-Archive -Path $ptZip -DestinationPath "$sdk" -Force
Remove-Item $ptZip -Force -ErrorAction SilentlyContinue
Write-Host "[PlatformTools] listo" -ForegroundColor Green

Write-Host ""
Write-Host "=== TODO LISTO ===" -ForegroundColor Green
Write-Host "Ejecuta .\build_apk.ps1 para compilar el APK" -ForegroundColor Cyan
