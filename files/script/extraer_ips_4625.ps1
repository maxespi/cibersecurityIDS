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

# Leer el archivo CSV y extraer las IPs
$whitelistCsvPath = Join-Path -Path $configPath -ChildPath "whitelistIps.csv" # Ruta del archivo CSV de la lista blanca
$whitelistIps = if (Test-Path $whitelistCsvPath) {
    Import-Csv -Path $whitelistCsvPath | Select-Object -ExpandProperty ip
}
else {
    Write-Host "El archivo CSV de la lista blanca no se encontro en la ruta: $whitelistCsvPath"
    @()
}


# N�mero m�ximo de eventos a procesar
$maxEventos = 1000
$ips = @()  # Array para almacenar las IPs encontradas

# Ruta del archivo de salida
$ipsFile = Join-Path -Path $LogPath -ChildPath "salida_ips.txt"
#$ipsFile = "C:\scripts\logs\salida_ips.txt"


# Obtener las IPs actuales en el archivo (si existen)
if (Test-Path $ipsFile) {
    $existingIps = Get-Content -Path $ipsFile
}
else {
    $existingIps = @()  # Si no existe el archivo, inicializa el array vacio
}

# Inicializar el tiempo de inicio global
$startTime = Get-Date

# Obtener solo los primeros N eventos 4625 para evitar sobrecargar el sistema
$eventosProcesados = 0  # Contador de eventos procesados

Get-WinEvent -LogName Security | Where-Object { $_.Id -eq 4625 } | Select-Object -First $maxEventos | ForEach-Object {
    $event = [xml]$_.ToXml()  # Convertir el evento a XML
    $ip = $event.Event.EventData.Data | Where-Object { $_.Name -eq "IpAddress" } | Select-Object -ExpandProperty '#text'
    
    if ($ip -and $ip -notin $whitelistIps) {
        $ips += $ip  # Añadir la IP al array si no esta en la lista blanca
    }

    # Actualizar el contador de eventos procesados
    $eventosProcesados++
   
    # Calcular el porcentaje de avance
    $porcentaje = ($eventosProcesados / $maxEventos) * 100

    # Mostrar el avance solo cuando pasen 1000 eventos
    if ($eventosProcesados % 1000 -eq 0) {
        $currentTime = Get-Date
        $elapsedTime = $currentTime - $startTime  # Tiempo transcurrido desde el inicio
        $porcentaje = ($eventosProcesados / $maxEventos) * 100  
        
        Write-Host "Progreso: $([math]::Round($porcentaje, 2))% ($eventosProcesados de $maxEventos) $($elapsedTime.TotalSeconds) s"

        # Reiniciar el tiempo de inicio para el siguiente bloque
        $startTime = $currentTime
    }
}

# Combinar las IPs nuevas con las existentes
$allIps = $existingIps + $ips

# Funcion para convertir la direccion IP en un arreglo de numeros
function ConvertTo-IpArray($ip) {
    return $ip.Split('.') | ForEach-Object { [int]$_ }
}

# Ordenar las IPs correctamente por cada octeto
$sortedIps = $allIps | Sort-Object {
    $ipArray = ConvertTo-IpArray $_
    [string]::Join('.', $ipArray)
}

# Eliminar duplicados y ordenar las IPs de menor a mayor de forma numerica
$sortedIps = $sortedIps | Sort-Object {
    $ipArray = ConvertTo-IpArray $_
    [string]::Join('.', $ipArray)
} | Sort-Object -Unique

# Guardar las IPs ordenadas en el archivo
$sortedIps | Out-File -FilePath $ipsFile

# Calcular los res�menes
$previousCount = $existingIps.Count
$newIps = $ips | Where-Object { $_ -notin $existingIps }
$newCount = $newIps.Count
$totalCount = $sortedIps.Count

# Mostrar resumen
Write-Host "Proceso finalizado. Resumen:"
Write-Host "Cantidad de IPs anteriores: $previousCount"
Write-Host "Cantidad de nuevas IPs encontradas: $newCount"
Write-Host "Total de IPs unicas: $totalCount"

# Mostrar las nuevas IPs encontradas sin duplicados
if ($newCount -gt 0) {
    Write-Host "IPs nuevas encontradas:"
    $uniqueNewIps = $newIps | Sort-Object -Unique
    $uniqueNewIps | ForEach-Object { Write-Host $_ }
}
else {
    Write-Host "No se encontraron IPs nuevas."
}

Write-Host "Las IPs unicas y ordenadas se guardaron"