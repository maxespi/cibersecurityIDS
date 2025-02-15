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

$ips = @()  # Array para almacenar las IPs encontradas
$ipsFile = Join-Path -Path $LogPath -ChildPath "salida_ips.txt" # Ruta del archivo de salida
if (Test-Path $ipsFile) {
    # Obtener las IPs actuales en el archivo (si existen)
    $existingIps = Get-Content -Path $ipsFile
}
else {
    $existingIps = @()  # Si no existe el archivo, inicializa el array vacio
}


# Ruta del archivo de salida
$whitelistCsvPath = Join-Path -Path $configPath -ChildPath "whitelistIps.csv" # Ruta del archivo CSV de la lista blanca
$logFile = Join-Path -Path $LogPath -ChildPath "registro_intentos.csv"  # Archivo CSV para registrar las IPs y fechas
$timestampFile = Join-Path -Path $LogPath -ChildPath "last_event_timestamp.txt"  # Archivo para almacenar el último timestamp procesado

# Leer el archivo CSV y extraer las IPs
$whitelistIps = @()
if (Test-Path $whitelistCsvPath) {
    $whitelistIps = Import-Csv -Path $whitelistCsvPath | Select-Object -ExpandProperty ip
}
else {
    Write-Host "El archivo de la lista blanca no se encontro en la ruta: $whitelistCsvPath"
}
Write-Host "IPs en la lista blanca: $($whitelistIps -join ', ')"

$maxEventos = 40000 # Valor predeterminado siendo el maximo de eventos de windows
$eventosParaGuardar = @()  # Array para almacenar los eventos a guardar en el archivo CSV


# Verificar si el archivo CSV existe, de lo contrario, crearlo con encabezados
if (-not (Test-Path $logFile)) {
    "IP,Fecha,Usuario,TipoInicioSesion,CodigoError,Dominio,NombreEquipo" | Out-File -FilePath $logFile -Encoding UTF8
}

# Verificar si el archivo de timestamp existe y leerlo
if (-not (Test-Path $timestampFile)) {
    $lastTimestamp = [datetime]::MinValue  # Valor mínimo si no existe
    Write-Host "No existe ultima lectura, se usa $lastTimestamp."
}
else {
    $lastTimestampString = (Get-Content -Path $timestampFile).Trim()
    try {
        $lastTimestamp = [datetime]::ParseExact($lastTimestampString, 'yyyy-MM-ddTHH:mm:ss.fff', $null)
        Write-Host "Fecha del evento del ultimo analisis $lastTimestamp."
    }
    catch {
        Write-Host "Error al convertir el timestamp, asignando el valor mínimo."
        $lastTimestamp = [datetime]::MinValue
    }  
}

# Filtrar eventos 4625 a partir de lastTimestamp
$filter = @{
    LogName   = 'Security'
    ID        = 4625
    StartTime = $lastTimestamp  # Usamos StartTime para filtrar por fecha
}

# Obtener los eventos filtrados por ID 4625 y StartTime, limitando hasta $maxEventos
try {
    $eventos = Get-WinEvent -FilterHashtable $filter -MaxEvents $maxEventos
    if ($null -eq $eventos) {
        Write-Host "No se encontraron eventos con los criterios especificados."
    }
    else {
        Write-Host "Se encontraron $($eventos.Count) eventos."
    }
}
catch {
    Write-Host "Ocurrio un error al obtener los eventos: $_"
}

if ($eventos.Count -gt 0) {
    $primerEventoFecha = $eventos[0].TimeCreated 
    Write-Host "El script comenzo a procesar eventos."   

    $porcentaje = 0

    function Get-EventProperty($event, $propertyName) {
        $property = $event.Event.EventData.Data | Where-Object { $_.Name -eq $propertyName }
        if ($property -and $null -ne $property.'#text') {
            return $property.'#text'
        }
        else {
            return "$propertyName no disponible"
        }
    }  

    $eventos | ForEach-Object {
        $event = [xml]$_.ToXml()  # Convertir el evento a XML  

        # Verificar que el evento no sea nulo
        if ($null -ne $event) {
            $ip = Get-EventProperty $event "IpAddress"

            if ($ip -eq "IpAddress no disponible") {
                Write-Host "IP no disponible, omitiendo..."
                continue
            }          

            if ($ip -in $whitelistIps) {
                Write-Host "IP en lista blanca, omitiendo..."
                continue
            }

            if ($ip -notin $existingIps -and $ip -notin $ips) {
                $ips += $ip  # Añadir la IP al array si no esta en la lista blanca
            } 

            # Acceder correctamente a la propiedad TimeCreated
            $timeCreated = $event.Event.System.TimeCreated.SystemTime
            if ($null -ne $timeCreated) {
                $fecha = [datetime]::Parse($timeCreated).ToString("yyyy-MM-ddTHH:mm:ss.fff")
            }
            else {
                $fecha = "Fecha no disponible"
            }

            $fechaDatetime = [datetime]::Parse($fecha)

            # Solo procesar eventos con timestamp mayor al último registrado
            if ($fechaDatetime -gt $lastTimestamp) {
                $usuario = Get-EventProperty $event "TargetUserName"
                $tipoInicioSesion = Get-EventProperty $event "LogonType"
                $codigoError = Get-EventProperty $event "Status"
                $dominio = Get-EventProperty $event "TargetDomainName"
                $nombreEquipo = Get-EventProperty $event "WorkstationName"

                # Añadir el evento al array de eventos a guardar
                $eventosParaGuardar += "$ip,$fecha,$usuario,$tipoInicioSesion,$codigoError,$dominio,$nombreEquipo"
            }
            else {
                Write-Host "Anterior, omitiendo..."
            }

        }
        else {
            Write-Host "Evento nulo, omitiendo..."
        }
        # Calcular el porcentaje de eventos procesados cada 25%
        $porcentajeActual = [math]::Round(($porcentaje / $eventos.Count) * 100)
        if ($porcentajeActual -gt $porcentaje) {
            $porcentaje = $porcentajeActual
            Write-Progress -Activity "Procesando eventos" -Status "$porcentaje% completado" -PercentComplete $porcentaje
        }   
    }

    if ($eventosParaGuardar.Count -gt 0) {
        # Ordenar los eventos por fecha antes de guardarlos
        $eventosParaGuardar = $eventosParaGuardar | Sort-Object { [datetime]::Parse($_.Split(',')[1]) }

        # Guardar los eventos ordenados en el archivo CSV
        $eventosParaGuardar | ForEach-Object {
            $_ | Out-File -FilePath $logFile -Append -Encoding UTF8
        }

        # Guardar el timestamp del último evento procesado
        $primerEventoFecha.ToString("yyyy-MM-ddTHH:mm:ss.fff") | Out-File -FilePath $timestampFile -Encoding UTF8
        Write-Host "Fecha de ultimo evento: $primerEventoFecha"
    }   

    if ($ips) {        
        # Combinar las IPs existentes y las nuevas
        $allIps = $existingIps + $ips

        # Eliminar duplicados y ordenar
        $uniqueIps = $allIps | Sort-Object -Unique

        # Guardar las IPs únicas en el archivo
        $uniqueIps | Out-File -FilePath $ipsFile -Encoding UTF8       
     
        Write-Host "IP identificadas para bloquear:"
        Write-Host "Cantidad de IPs anteriores: $($existingIps.Count)"
        Write-Host "Cantidad de nuevas IPs encontradas: $($ips.Count)"
        Write-Host "Total de IPs únicas: $($uniqueIps.Count)"

        # Mostrar las nuevas IPs encontradas sin duplicados
        $uniqueNewIps = $ips | Sort-Object -Unique
        if ($uniqueNewIps.Count -gt 0) {
            Write-Host "IPs nuevas encontradas:"
            $uniqueNewIps | ForEach-Object { Write-Host $_ }
        }
        else {
            Write-Host "No se encontraron IPs nuevas."
        }
    }
    else {
        Write-Host "No se encontraron IPs para procesar."
    }
}
else {
    Write-Host "No se encontraron eventos nuevos desde el último procesamiento."
}

Write-Host "Exito."
