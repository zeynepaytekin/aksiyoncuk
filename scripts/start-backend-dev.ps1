[CmdletBinding()]
param(
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$environmentFile = Join-Path $repositoryRoot ".env"
$backendDirectory = Join-Path $repositoryRoot "backend"
$jarPath = Join-Path $backendDirectory "target\aksiyoncuk-backend-0.1.0-SNAPSHOT.jar"

if (-not (Test-Path -LiteralPath $environmentFile)) {
    throw "Root .env is required. Copy .env.example to .env and use local-only values."
}

foreach ($line in Get-Content -LiteralPath $environmentFile) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) {
        continue
    }
    $separator = $trimmed.IndexOf("=")
    if ($separator -lt 1) {
        throw "Invalid .env entry: $trimmed"
    }
    $name = $trimmed.Substring(0, $separator).Trim()
    $value = $trimmed.Substring($separator + 1)
    [Environment]::SetEnvironmentVariable($name, $value, "Process")
}

[Environment]::SetEnvironmentVariable("SPRING_PROFILES_ACTIVE", "dev", "Process")

if (-not $SkipBuild) {
    & mvn --file (Join-Path $backendDirectory "pom.xml") package -DskipTests
    if ($LASTEXITCODE -ne 0) {
        throw "Backend package failed with exit code $LASTEXITCODE."
    }
}
elseif (-not (Test-Path -LiteralPath $jarPath)) {
    throw "Packaged backend not found at $jarPath. Run without -SkipBuild first."
}

& java -jar $jarPath
exit $LASTEXITCODE
