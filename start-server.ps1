$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$CodexPython = "C:\Users\laurent.moulin\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

Set-Location $ProjectRoot

if (Test-Path $CodexPython) {
  & $CodexPython -m http.server 5173 --bind 127.0.0.1
} else {
  python -m http.server 5173 --bind 127.0.0.1
}

