<#
.SYNOPSIS
  Idempotent dependency setup for the synced AI-DLC Windows test tree.

.DESCRIPTION
  The `e2e` TUI tests drive the real `claude` TUI through Bun.Terminal +
  @xterm/headless on Windows (docs/reference/09-testing.md "The tui Mechanism").
  This script verifies the Bun-only prerequisites and installs the locked
  development dependencies with Bun.

.PARAMETER ProjectDir
  The synced project tree (where sync.sh deposited the git-archive). Default C:\amadeus.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tests\harness\windows\setup.ps1 -ProjectDir C:\amadeus
#>
param(
  [string]$ProjectDir = "C:\amadeus",
  [string]$BunExe = "C:\bun\bin\bun.exe",
  [string]$ClaudeBin = "",
  [string]$GitBash = "C:\Program Files\Git\bin\bash.exe"
)
$ErrorActionPreference = "Stop"

# The claude native installer drops claude.exe under the INSTALLING user's
# ~\.local\bin (Administrator under EC2Launch v2 UserData; systemprofile when
# bootstrapped as SYSTEM). Probe the known homes unless a path was passed.
if (-not $ClaudeBin) {
  $ClaudeBin = @(
    "C:\Users\Administrator\.local\bin\claude.exe",
    "C:\Windows\System32\config\systemprofile\.local\bin\claude.exe",
    (Join-Path $env:USERPROFILE ".local\bin\claude.exe")
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $ClaudeBin) { $ClaudeBin = "C:\Users\Administrator\.local\bin\claude.exe" }
}

function Require-Path([string]$path, [string]$what) {
  if (-not (Test-Path $path)) { throw "MISSING PREREQUISITE: $what not found at $path" }
}

Write-Output "=== AI-DLC Windows tui harness setup ==="
Write-Output "ProjectDir: $ProjectDir"

# --- 1. Verify the documented prerequisites are present (install them out-of-band).
Require-Path $BunExe    "bun"
Require-Path $ClaudeBin "claude CLI"
Require-Path $GitBash   "Git Bash"
Write-Output ("bun {0}; claude present; git-bash present" -f (& $BunExe --version))

if (-not (Test-Path "$ProjectDir\package.json")) {
  throw "No package.json in $ProjectDir  -  run sync.sh from the repo first to copy the tree up."
}

# --- 2. Install the locked test devDependencies with Bun.
Set-Location $ProjectDir

# Clear any partial node_modules from a prior failed install.
if (Test-Path "$ProjectDir\node_modules") {
  Write-Output "=== clearing prior node_modules ==="
  Remove-Item -Recurse -Force "$ProjectDir\node_modules" -ErrorAction SilentlyContinue
}

Write-Output "=== bun install --frozen-lockfile ==="
& $BunExe install --frozen-lockfile
if ($LASTEXITCODE -ne 0) { throw "bun install failed ($LASTEXITCODE)" }

# --- 3. Verify Bun's Windows PTY API and screen renderer.
Write-Output "=== verify Bun.Terminal + @xterm/headless ==="
& $BunExe -e "if (typeof Bun.Terminal !== 'function') process.exit(1); await import('@xterm/headless'); console.log('DEPS-OK: Bun.Terminal + @xterm/headless')"
if ($LASTEXITCODE -ne 0) { throw "dependency resolution check failed" }

Write-Output "=== setup complete  -  run a test with run.ps1 ==="
