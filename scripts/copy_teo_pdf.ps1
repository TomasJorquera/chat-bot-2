# Copies teo.pdf from your local documentation folder into backend uploads so the frontend can download it
$src = "C:\Users\jojor\OneDrive\Escritorio\Chat-botDocumentacion\teo.pdf"
$destDir = "c:\Users\jojor\OneDrive\Escritorio\chatbot\chat-bot-2\backend\uploads\planificaciones"
if (-not (Test-Path $src)) {
    Write-Error "Source file not found: $src"
    exit 1
}
New-Item -ItemType Directory -Force -Path $destDir | Out-Null
Copy-Item -Path $src -Destination (Join-Path $destDir 'teo.pdf') -Force
Write-Output "Copied teo.pdf to $destDir"