# TCP Static Web Server in PowerShell (Hostname-Agnostic)
# Serves the video-playing kiosk application on localhost:8080
$port = 8080
$localAddr = [System.Net.IPAddress]::Loopback # 127.0.0.1
$server = New-Object System.Net.Sockets.TcpListener($localAddr, $port)

try {
    $server.Start()
    Write-Output "PowerShell TCP Kiosk Web Server started successfully."
    Write-Output "Listening on http://127.0.0.1:$port/"
    Write-Output "Press Ctrl+C in the console to stop the server."
} catch {
    Write-Error "Failed to start listener: $_"
    exit
}

$root = $PSScriptRoot
if ([string]::IsNullOrEmpty($root)) {
    $root = (Get-Item .).FullName
}

# Loop to handle incoming requests
while ($true) {
    try {
        $client = $server.AcceptTcpClient()
        $stream = $client.GetStream()
        
        # Set short timeouts to prevent hanging sockets
        $client.ReceiveTimeout = 2000
        $client.SendTimeout = 2000

        $reader = New-Object System.IO.StreamReader($stream)
        $writer = New-Object System.IO.StreamWriter($stream)

        # Read Request Line (e.g., "GET /index.html HTTP/1.1")
        $requestLine = $reader.ReadLine()
        if ($null -eq $requestLine -or $requestLine.Trim() -eq "") {
            $client.Close()
            continue
        }

        # Parse Request Line
        $parts = $requestLine.Split(" ")
        if ($parts.Length -lt 2) {
            $client.Close()
            continue
        }
        $method = $parts[0]
        $urlPath = $parts[1]

        # Strip query string or hash parameters if present
        if ($urlPath.Contains("?")) {
            $urlPath = $urlPath.Substring(0, $urlPath.IndexOf("?"))
        }
        if ($urlPath.Contains("#")) {
            $urlPath = $urlPath.Substring(0, $urlPath.IndexOf("#"))
        }

        # Default to index.html for root requests
        if ($urlPath -eq "/" -or $urlPath -eq "") {
            $urlPath = "/index.html"
        }

        # Decode URL path (e.g. %20 -> space)
        $urlPath = [System.Uri]::UnescapeDataString($urlPath)

        # Clean path and normalize path separators
        $urlPathClean = $urlPath.Replace("/", "\")
        $localPath = ""
        if ($urlPathClean -match "^\\?[A-Za-z]:") {
            # Handle absolute local path requests (e.g. C:\Users\...)
            $localPath = $urlPathClean.TrimStart('\')
        } else {
            $urlPathClean = $urlPathClean.TrimStart('\')
            $localPath = Join-Path $root $urlPathClean
        }

        # Dynamically resolve any Desktop video request to the current user's desktop path using %USERPROFILE%
        if ($localPath -match "Desktop\\[A-C]타입\.mp4$") {
            $fileName = [System.IO.Path]::GetFileName($localPath)
            $desktopPath = Join-Path $env:USERPROFILE "Desktop"
            $localPath = Join-Path $desktopPath $fileName
        }

        # Resolve full path to prevent directory traversal
        $fullPath = [System.IO.Path]::GetFullPath($localPath)

        # Read remaining request headers to clear the buffer
        while ($true) {
            $line = $reader.ReadLine()
            if ($null -eq $line -or $line.Trim() -eq "") {
                break
            }
        }

        # Verify if path is allowed (within root directory, or matching specific desktop videos in user's profile)
        $isAllowed = $false
        $actualDesktopPath = Join-Path $env:USERPROFILE "Desktop"
        if ($fullPath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
            $isAllowed = $true
        } elseif ($fullPath.StartsWith($actualDesktopPath, [System.StringComparison]::OrdinalIgnoreCase) -and ($fullPath -match "\\[A-C]타입\.mp4$")) {
            $isAllowed = $true
        }

        if ($isAllowed -and (Test-Path $fullPath -PathType Leaf)) {
            $bytes = [System.IO.File]::ReadAllBytes($fullPath)
            
            # Determine Content Type
            $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
            $mime = "application/octet-stream"
            if ($ext -eq ".html") { $mime = "text/html; charset=utf-8" }
            elseif ($ext -eq ".css") { $mime = "text/css; charset=utf-8" }
            elseif ($ext -eq ".js") { $mime = "application/javascript; charset=utf-8" }
            elseif ($ext -eq ".png") { $mime = "image/png" }
            elseif ($ext -eq ".jpg" -or $ext -eq ".jpeg") { $mime = "image/jpeg" }
            elseif ($ext -eq ".svg") { $mime = "image/svg+xml" }
            elseif ($ext -eq ".json") { $mime = "application/json; charset=utf-8" }
            elseif ($ext -eq ".mp4") { $mime = "video/mp4" }

            # Send HTTP headers
            $writer.WriteLine("HTTP/1.1 200 OK")
            $writer.WriteLine("Content-Type: $mime")
            $writer.WriteLine("Content-Length: $($bytes.Length)")
            $writer.WriteLine("Connection: close")
            $writer.WriteLine()
            $writer.Flush()

            # Send binary body
            $stream.Write($bytes, 0, $bytes.Length)
        } else {
            # Serve 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $writer.WriteLine("HTTP/1.1 404 Not Found")
            $writer.WriteLine("Content-Type: text/plain; charset=utf-8")
            $writer.WriteLine("Content-Length: $($errBytes.Length)")
            $writer.WriteLine("Connection: close")
            $writer.WriteLine()
            $writer.Flush()
            $stream.Write($errBytes, 0, $errBytes.Length)
        }
        
        $stream.Flush()
        $client.Close()
    } catch {
        # Log error but continue serving subsequent requests
        Write-Host "Error serving request: $_"
        if ($null -ne $client) { $client.Close() }
    }
}
