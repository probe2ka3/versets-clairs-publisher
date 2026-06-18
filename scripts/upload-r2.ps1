param(
  [string]$Source = "C:\Users\Rexhep\Desktop\claude-remote-test\renders\local\ordered",
  [string]$Bucket = "versets-clairs",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $Source)) {
  throw "Source folder not found: $Source"
}

$videos = Get-ChildItem -LiteralPath $Source -Filter "*.mp4" -File | Sort-Object Name
if (-not $videos.Count) {
  throw "No mp4 files found in: $Source"
}

$totalBytes = ($videos | Measure-Object Length -Sum).Sum
$totalGb = [math]::Round($totalBytes / 1GB, 2)
Write-Host "Uploading $($videos.Count) videos ($totalGb GB) to R2 bucket '$Bucket'."

foreach ($video in $videos) {
  $key = $video.Name
  $cmd = @("wrangler", "r2", "object", "put", "$Bucket/$key", "--file", $video.FullName)
  Write-Host ($cmd -join " ")
  if (-not $DryRun) {
    npx.cmd @cmd
  }
}
