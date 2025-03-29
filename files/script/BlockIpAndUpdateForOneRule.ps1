param (
    [string]$LogPath,
    [string]$configPath
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Obtener información del sistema operativo
$os = Get-CimInstance -ClassName Win32_OperatingSystem

if ($os.Caption -notlike "*Server*") {
    Write-Host "Para Windows Server."
    Exit
}

Write-Host "Ejecutando..."

# Función para validar direcciones IP
function Is-ValidIp {
    param (
        [string]$ip
    )
    return $ip -match '^(([0-9]{1,3}\.){3}[0-9]{1,3})(\/[0-9]{1,2})?$' -and ($ip -split '/')[0] -notmatch '^25[6-9]|2[6-9][0-9]|[3-9][0-9]{2}'
}
# Leer el archivo CSV y extraer las IPs
$whitelistCsvPath = Join-Path -Path $configPath -ChildPath "whitelistIps.csv" # Ruta del archivo CSV de la lista blanca
$whitelistIps = if (Test-Path $whitelistCsvPath) {
    Import-Csv -Path $whitelistCsvPath | Select-Object -ExpandProperty ip
}
else {
    Write-Host "El archivo CSV de la lista blanca no se encontro en la ruta: $whitelistCsvPath"
    @()
}

# Ruta del archivo de texto con las IPs que quieres bloquear
$ipsFile = Join-Path -Path $LogPath -ChildPath "salida_ips.txt"

#$ipsFile = "C:\scripts\logs\salida_ips.txt"

# Lee las IPs desde el archivo de texto
$ips = Get-Content -Path $ipsFile

# Filtrar las IPs que no están en la lista blanca
$ipsToBlock = $ips | Where-Object { $_ -and ($_ -notin $whitelistIps) -and (Is-ValidIp $_) }

# Verifica si ya existe la regla de entrada
$existingInboundRule = Get-NetFirewallRule | Where-Object { $_.DisplayName -eq "Bloquear IPs seleccionadas Inbound" }

# Verifica si ya existe la regla de salida
$existingOutboundRule = Get-NetFirewallRule | Where-Object { $_.DisplayName -eq "Bloquear IPs seleccionadas Outbound" }

# Si la regla de entrada no existe, crea la regla
if (-not $existingInboundRule) {
    Write-Host "Creando nueva regla de entrada de firewall."
    New-NetFirewallRule -DisplayName "Bloquear IPs seleccionadas Inbound" -Direction Inbound -Action Block -RemoteAddress $ipsToBlock -Protocol Any
}
else {
    Write-Host "Actualizando reglas de entrada de firewall con nuevas IPs."
    $existingInboundIps = $existingInboundRule | Get-NetFirewallAddressFilter | Select-Object -ExpandProperty RemoteAddress
    $newInboundIps = $ipsToBlock | Where-Object { $_ -notin $existingInboundIps }
    
    # Eliminar IPs que ya no están en la lista
    $removeInboundIps = $existingInboundIps | Where-Object { $_ -notin $ipsToBlock }
    if ($removeInboundIps.Count -gt 0) {
        Set-NetFirewallRule -DisplayName "Bloquear IPs seleccionadas Inbound" -RemoteAddress ($existingInboundIps | Where-Object { $_ -notin $removeInboundIps }) -Direction Inbound
        Write-Host "Se eliminaron IPs no presentes en la lista de entrada."
    }

    # Agregar nuevas IPs
    if ($newInboundIps.Count -gt 0) {
        $allInboundIps = $existingInboundIps + $newInboundIps
        Set-NetFirewallRule -DisplayName "Bloquear IPs seleccionadas Inbound" -RemoteAddress $allInboundIps -Direction Inbound
        Write-Host "Se agregaron nuevas IPs a la regla de entrada de firewall."
    }
    else {
        Write-Host "No se encontraron nuevas IPs para agregar en la regla de entrada."
    }
}

# Repite el mismo proceso para las reglas de salida
$existingOutboundRule = Get-NetFirewallRule | Where-Object { $_.DisplayName -eq "Bloquear IPs seleccionadas Outbound" }

# Si la regla de salida no existe, crea la regla
if (-not $existingOutboundRule) {
    Write-Host "Creando nueva regla de salida de firewall."
    New-NetFirewallRule -DisplayName "Bloquear IPs seleccionadas Outbound" -Direction Outbound -Action Block -RemoteAddress $ipsToBlock -Protocol Any
}
else {
    Write-Host "Actualizando reglas de salida de firewall con nuevas IPs."
    $existingOutboundIps = $existingOutboundRule | Get-NetFirewallAddressFilter | Select-Object -ExpandProperty RemoteAddress
    $newOutboundIps = $ipsToBlock | Where-Object { $_ -notin $existingOutboundIps }

    # Eliminar IPs que ya no están en la lista
    $removeOutboundIps = $existingOutboundIps | Where-Object { $_ -notin $ipsToBlock }
    if ($removeOutboundIps.Count -gt 0) {
        Set-NetFirewallRule -DisplayName "Bloquear IPs seleccionadas Outbound" -RemoteAddress ($existingOutboundIps | Where-Object { $_ -notin $removeOutboundIps }) -Direction Outbound
        Write-Host "Se eliminaron IPs no presentes en la lista de salida."
    }

    # Agregar nuevas IPs
    if ($newOutboundIps.Count -gt 0) {
        $allOutboundIps = $existingOutboundIps + $newOutboundIps
        Set-NetFirewallRule -DisplayName "Bloquear IPs seleccionadas Outbound" -RemoteAddress $allOutboundIps -Direction Outbound
        Write-Host "Se agregaron nuevas IPs a la regla de salida de firewall."
    }
    else {
        Write-Host "No se encontraron nuevas IPs para agregar en la regla de salida."
    }
}
