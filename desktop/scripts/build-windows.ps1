# Build Pixel Agents desktop on Windows (needs MSVC + Rust + Node).
# Usage (from repo root or desktop/):
#   powershell -ExecutionPolicy Bypass -File desktop/scripts/build-windows.ps1

$ErrorActionPreference = "Stop"
$desktop = Split-Path -Parent $PSScriptRoot
$repo = Split-Path -Parent $desktop
$vcvars = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if (-not (Test-Path $vcvars)) {
  throw "MSVC vcvars64.bat not found. Install VS 2022 Build Tools with C++ workload."
}

$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
Push-Location $repo
try {
  npm run desktop:stage
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  cmd /c "`"$vcvars`" && cd /d `"$desktop`" && npm run build"
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
