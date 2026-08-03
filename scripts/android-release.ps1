# Safe release APK build — avoids broken `gradlew clean` (CMake/codegen chicken-and-egg).
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$android = Join-Path $root 'android'

Set-Location $android
$env:NODE_ENV = 'production'

foreach ($p in @('app\.cxx', 'app\build', 'build')) {
  $full = Join-Path $android $p
  if (Test-Path $full) {
    Write-Host "Removing $p ..."
    Remove-Item -Recurse -Force $full
  }
}

Write-Host 'assembleRelease ...'
& .\gradlew.bat assembleRelease --no-daemon
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$apk = Join-Path $android 'app\build\outputs\apk\release\app-release.apk'
Write-Host "APK: $apk"
Get-Item $apk | Format-List FullName, Length, LastWriteTime
