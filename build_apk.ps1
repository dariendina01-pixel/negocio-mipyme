# =============================================================
# build_apk.ps1 — Compila el APK de forma local
# Requisitos (ver README): JDK 17 en C:\Java\jdk-17,
# Android SDK en C:\Android\Sdk y gradle zip en C:\gradle-dist.
# =============================================================
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$javaHome = "C:\Java\jdk-17"
$sdk = "C:\Android\Sdk"
$gradleZip = "C:\gradle-dist\gradle-9.3.1-bin.zip"

foreach ($p in @($javaHome, $sdk, $gradleZip)) {
  if (-not (Test-Path $p)) {
    Write-Host "FALTA: $p" -ForegroundColor Red
    Write-Host "Descarga los archivos indicados y vuelve a intentar." -ForegroundColor Yellow
    exit 1
  }
}

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $sdk
$env:Path = "$javaHome\bin;C:\Program Files\nodejs;" + $env:Path

Set-Location "$root\android"
Write-Host "Compilando APK (release)... esto tarda la primera vez." -ForegroundColor Cyan
.\gradlew.bat assembleRelease
if ($LASTEXITCODE -ne 0) { Write-Host "La compilacion fallo." -ForegroundColor Red; exit $LASTEXITCODE }

$apk = "$root\android\app\build\outputs\apk\release\app-release.apk"
if (Test-Path $apk) {
  Copy-Item $apk "$root\NegocioMipyme.apk" -Force
  Write-Host "" -NoNewline
  Write-Host "APK listo: $root\NegocioMipyme.apk" -ForegroundColor Green
} else {
  Write-Host "APK no generado (revisa build/outputs)." -ForegroundColor Red
  exit 1
}