# ============================================================
#  serve.ps1  -  mini serveur HTTP local (SamtexChabet POS)
# ============================================================
#  Sert le dossier de l'application en http://127.0.0.1:<port>
#  avec PowerShell + .NET uniquement (aucune installation
#  requise : PowerShell est pre-installe sur Windows, pas besoin
#  de Python ni d'administration).
#
#  Double-cliquez sur "Demarrer-Samtex.bat" pour le lancer.
# ============================================================

$ErrorActionPreference = 'Stop'

$root = [System.IO.Path]::GetFullPath($PSScriptRoot).TrimEnd('\')
$rootSep = $root + '\'

function Get-MimeType([string]$ext) {
    switch ($ext.ToLower()) {
        '.html' { return 'text/html; charset=utf-8' }
        '.htm'  { return 'text/html; charset=utf-8' }
        '.js'   { return 'application/javascript; charset=utf-8' }
        '.css'  { return 'text/css; charset=utf-8' }
        '.json' { return 'application/json; charset=utf-8' }
        '.png'  { return 'image/png' }
        '.jpg'  { return 'image/jpeg' }
        '.jpeg' { return 'image/jpeg' }
        '.gif'  { return 'image/gif' }
        '.svg'  { return 'image/svg+xml' }
        '.ico'  { return 'image/x-icon' }
        '.woff' { return 'font/woff' }
        '.woff2'{ return 'font/woff2' }
        '.ttf'  { return 'font/ttf' }
        '.mp3'  { return 'audio/mpeg' }
        '.wav'  { return 'audio/wav' }
        default  { return 'application/octet-stream' }
    }
}

function Send-Response($stream, [int]$status, [string]$reason, [string]$contentType, [byte[]]$body) {
    if (-not $contentType) { $contentType = Get-MimeType '' }
    if ($null -eq $body) { $body = New-Object byte[] 0 }
    $head = "HTTP/1.1 $status $reason`r`n" +
            "Content-Type: $contentType`r`n" +
            "Content-Length: $($body.Length)`r`n" +
            'Connection: close' + "`r`n`r`n"
    $headBytes = [System.Text.Encoding]::ASCII.GetBytes($head)
    $stream.Write($headBytes, 0, $headBytes.Length)
    if ($body.Length -gt 0) { $stream.Write($body, 0, $body.Length) }
    $stream.Flush()
}

function Serve-Client($client) {
    try {
        $stream = $client.GetStream()
        $stream.ReadTimeout = 8000
        $buf = New-Object byte[] 8192
        $read = $stream.Read($buf, 0, $buf.Length)
        if ($read -le 0) { return }
        $text = [System.Text.Encoding]::ASCII.GetString($buf, 0, $read)
        $lines = $text -split "`r?`n"
        $reqLine = $lines[0]
        $parts = $reqLine -split ' '
        if ($parts.Length -lt 2) { return }
        $method = $parts[0]
        $raw = $parts[1]
        $pathPart = ($raw -split '\?')[0]
        $pathPart = [System.Uri]::UnescapeDataString($pathPart)
        # Signal d'arrêt envoyé par la caisse à la fermeture (sendBeacon POST).
        # On répond 204 et on marque l'heure de l'arrêt : la boucle principale
        # s'arrête s'il n'y a plus de demande (vraie fermeture) dans la minute.
        if ($pathPart -eq '/__shutdown__') {
            $script:shutdownAt = Get-Date
            Send-Response $stream 204 'No Content' 'text/plain' ([System.Text.Encoding]::ASCII.GetBytes(''))
            return $true
        }
        if ($method -ne 'GET' -and $method -ne 'HEAD') {
            Send-Response $stream 405 'Method Not Allowed' 'text/plain' ([Text.Encoding]::UTF8.GetBytes('Not supported'))
            return
        }
        if ($pathPart -eq '/' -or $pathPart -eq '') { $pathPart = '/index.html' }
        $relative = $pathPart.TrimStart('/')
        $full = [System.IO.Path]::GetFullPath((Join-Path $root $relative))
        if (-not $full.StartsWith($rootSep, [System.StringComparison]::OrdinalIgnoreCase)) {
            Send-Response $stream 403 'Forbidden' 'text/plain' ([Text.Encoding]::UTF8.GetBytes('Access denied'))
            return
        }
        if (-not [System.IO.File]::Exists($full)) {
            Send-Response $stream 404 'Not Found' 'text/html' ([Text.Encoding]::UTF8.GetBytes('<h1>404 - Not found</h1>'))
            return
        }
        $ext = [System.IO.Path]::GetExtension($full)
        $mime = Get-MimeType $ext
        $body = [System.IO.File]::ReadAllBytes($full)
        if ($method -eq 'HEAD') { $body = New-Object byte[] 0 }
        Send-Response $stream 200 'OK' $mime $body
    } catch {
        # erreur client : on ignore
    } finally {
        try { $client.Close() } catch {}
    }
}

# --- choisir un port libre ---
$port = 8866
$listener = $null
for ($i = 0; $i -lt 20; $i++) {
    try {
        $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $port)
        $listener.Start()
        break
    } catch {
        $listener = $null
        $port++
    }
}
if ($null -eq $listener) {
    Write-Host "Impossible de demarrer le serveur. Lancez l'app en double-cliquant sur index.html." -ForegroundColor Red
    Read-Host "Appuyez sur Entree pour fermer"
    exit 1
}

$url = "http://127.0.0.1:$port/"
Write-Host ""
Write-Host "  SamtexChabet - Caisse en ligne" -ForegroundColor Cyan
Write-Host "  -------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  Adresse  : $url" -ForegroundColor Green
Write-Host "  Dossier  : $root" -ForegroundColor Gray
Write-Host "  Pour arreter : fermez cette fenetre (ou Ctrl+C)" -ForegroundColor DarkGray
Write-Host ""

# --- ouvrir la caisse dans le navigateur par defaut ---
try { Start-Process $url } catch {}

# Arret automatique :
#  - si la caisse envoie le signal /__shutdown__ (fermeture du navigateur)
#    et qu'aucune nouvelle demande n'arrive dans les 3 s -> on s'arrete.
#  - sinon, arret apres $IDLE_STOP_SECONDS sans aucune demande.
$IDLE_STOP_SECONDS = 180
$script:shutdownAt = $null
$script:idleSince = Get-Date

try {
    while ($true) {
        if ($listener.Pending()) {
            # Une demande HTTP arrive (chargement normal OU rechargement après un signal d'arrêt).
            $script:idleSince = Get-Date
            $client = $listener.AcceptTcpClient()
            $wasShutdown = Serve-Client $client
            # Une requête NORMALE qui arrive après un signal d'arrêt signifie un
            # rechargement (ex. changement de thème) : on annule l'arrêt. La requête
            # de signal elle-même ne doit pas annuler.
            if ($script:shutdownAt -and -not $wasShutdown) { $script:shutdownAt = $null }
            continue
        }
        if ($script:shutdownAt) {
            if (((Get-Date) - $script:shutdownAt).TotalSeconds -gt 3) { break }
            Start-Sleep -Milliseconds 200
        } elseif (((Get-Date) - $script:idleSince).TotalSeconds -gt $IDLE_STOP_SECONDS) {
            break
        } else {
            Start-Sleep -Milliseconds 400
        }
    }
} catch {
    # arret du serveur
} finally {
    try { $listener.Stop() } catch {}
}