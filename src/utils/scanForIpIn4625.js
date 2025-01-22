const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function scanForIpIn4625(logPath, configPath) {
    console.log('scanForIpIn4625 ha sido llamado'); // Mensaje de prueba

    // Asegurarse de que el directorio del archivo de log exista
    const logDir = path.dirname(logPath);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    // Asegurarse de que el archivo de log exista
    if (!fs.existsSync(logPath)) {
        fs.writeFileSync(logPath, '');
    }

    // Obtener información del sistema operativo
    const os = execSync('wmic os get Caption').toString();
    if (!os.includes('Server')) {
        console.log('Para Windows Server.');
        return;
    }

    console.log('Ejecutando...');

    const ips = [];
    const ipsFile = path.join(logPath, 'salida_ips.txt');
    let existingIps = [];
    if (fs.existsSync(ipsFile)) {
        existingIps = fs.readFileSync(ipsFile, 'utf-8').split('\n').filter(Boolean);
    }

    const whitelistCsvPath = path.join(configPath, 'whitelistIps.csv');
    const logFile = path.join(logPath, 'registro_intentos.csv');
    const timestampFile = path.join(logPath, 'last_event_timestamp.txt');

    let whitelistIps = [];
    if (fs.existsSync(whitelistCsvPath)) {
        whitelistIps = fs.readFileSync(whitelistCsvPath, 'utf-8').split('\n').map(line => line.split(',')[0]);
    } else {
        console.log(`El archivo de la lista blanca no se encontro en la ruta: ${whitelistCsvPath}`);
    }
    console.log(`IPs en la lista blanca: ${whitelistIps.join(', ')}`);

    const maxEventos = 40000;
    let eventosParaGuardar = [];

    if (!fs.existsSync(logFile)) {
        fs.writeFileSync(logFile, 'IP,Fecha,Usuario,TipoInicioSesion,CodigoError,Dominio,NombreEquipo\n');
    }

    let lastTimestamp = new Date(0);
    if (fs.existsSync(timestampFile)) {
        const lastTimestampString = fs.readFileSync(timestampFile, 'utf-8').trim();
        try {
            lastTimestamp = new Date(lastTimestampString);
            console.log(`Fecha del evento del ultimo analisis ${lastTimestamp}`);
        } catch {
            console.log('Error al convertir el timestamp, asignando el valor mínimo.');
        }
    } else {
        console.log(`No existe ultima lectura, se usa ${lastTimestamp}`);
    }

    // Filtrar eventos 4625 a partir de lastTimestamp
    const filter = {
        LogName: 'Security',
        ID: 4625,
        StartTime: lastTimestamp
    };

    // Obtener los eventos filtrados por ID 4625 y StartTime, limitando hasta maxEventos
    let eventos;
    try {
        eventos = execSync(`Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625} -MaxEvents ${maxEventos}`).toString();
        if (!eventos) {
            console.log('No se encontraron eventos con los criterios especificados.');
        } else {
            console.log(`Se encontraron ${eventos.length} eventos.`);
        }
    } catch (error) {
        console.log(`Ocurrio un error al obtener los eventos: ${error}`);
    }

    if (eventos && eventos.length > 0) {
        const primerEventoFecha = new Date(eventos[0].TimeCreated);
        console.log('El script comenzo a procesar eventos.');

        let porcentaje = 0;

        function getEventProperty(event, propertyName) {
            const property = event.Event.EventData.Data.find(data => data.Name === propertyName);
            return property ? property['#text'] : `${propertyName} no disponible`;
        }

        eventos.forEach(event => {
            const eventXml = new DOMParser().parseFromString(event.ToXml(), 'text/xml');

            if (eventXml) {
                const ip = getEventProperty(eventXml, 'IpAddress');

                if (ip === 'IpAddress no disponible') {
                    console.log('IP no disponible, omitiendo...');
                    return;
                }

                if (whitelistIps.includes(ip)) {
                    console.log('IP en lista blanca, omitiendo...');
                    return;
                }

                if (!existingIps.includes(ip) && !ips.includes(ip)) {
                    ips.push(ip);
                }

                const timeCreated = eventXml.querySelector('System > TimeCreated').getAttribute('SystemTime');
                const fecha = timeCreated ? new Date(timeCreated).toISOString() : 'Fecha no disponible';

                const fechaDatetime = new Date(fecha);

                if (fechaDatetime > lastTimestamp) {
                    const usuario = getEventProperty(eventXml, 'TargetUserName');
                    const tipoInicioSesion = getEventProperty(eventXml, 'LogonType');
                    const codigoError = getEventProperty(eventXml, 'Status');
                    const dominio = getEventProperty(eventXml, 'TargetDomainName');
                    const nombreEquipo = getEventProperty(eventXml, 'WorkstationName');

                    eventosParaGuardar.push(`${ip},${fecha},${usuario},${tipoInicioSesion},${codigoError},${dominio},${nombreEquipo}`);
                } else {
                    console.log('Anterior, omitiendo...');
                }
            } else {
                console.log('Evento nulo, omitiendo...');
            }

            const porcentajeActual = Math.round((porcentaje / eventos.length) * 100);
            if (porcentajeActual > porcentaje) {
                porcentaje = porcentajeActual;
                console.log(`Procesando eventos: ${porcentaje}% completado`);
            }
        });

        if (eventosParaGuardar.length > 0) {
            eventosParaGuardar.sort((a, b) => new Date(a.split(',')[1]) - new Date(b.split(',')[1]));

            eventosParaGuardar.forEach(evento => {
                fs.appendFileSync(logFile, `${evento}\n`);
            });

            fs.writeFileSync(timestampFile, primerEventoFecha.toISOString());
            console.log(`Fecha de ultimo evento: ${primerEventoFecha}`);
        }

        if (ips.length > 0) {
            const allIps = [...new Set([...existingIps, ...ips])];

            fs.writeFileSync(ipsFile, allIps.join('\n'));
            console.log('IP identificadas para bloquear:');
            console.log(`Cantidad de IPs anteriores: ${existingIps.length}`);
            console.log(`Cantidad de nuevas IPs encontradas: ${ips.length}`);
            console.log(`Total de IPs únicas: ${allIps.length}`);

            const uniqueNewIps = [...new Set(ips)];
            if (uniqueNewIps.length > 0) {
                console.log('IPs nuevas encontradas:');
                uniqueNewIps.forEach(ip => console.log(ip));
            } else {
                console.log('No se encontraron IPs nuevas.');
            }
        } else {
            console.log('No se encontraron IPs para procesar.');
        }
    } else {
        console.log('No se encontraron eventos nuevos desde el último procesamiento.');
    }

    console.log('Exito.');
    return 'Datos de log generados por la lógica del proyecto';
}

module.exports = scanForIpIn4625;