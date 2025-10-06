# Guía de Desarrollo - Windows 11 vs Windows Server

## 📋 Análisis de Compatibilidad

### ✅ **Funcionalidades que SÍ funcionan en Windows 11:**
- **Interfaz de usuario completa** (React + Electron)
- **Base de datos SQLite** (gestión de IPs, whitelist, eventos)
- **Firewall management** (con permisos de administrador)
- **Geolocalización de IPs** (APIs externas)
- **Sistema de logging** (archivos locales)

### ❌ **Limitaciones en Windows 11:**
- **Security Event Log 4625** (requiere configuración manual)
- **Auditoría de eventos** (deshabilitada por defecto)
- **Eventos de failed logon** (menos comunes en PCs de usuario)

### 🎯 **Funcionalidades específicas de Windows Server:**
- **Event Log Security habilitado** por defecto
- **Auditoría de logon** configurada automáticamente
- **Mayor volumen de eventos** de seguridad
- **Funciones de servidor** (RDP, servicios, etc.)

## 🔧 Configuración para Desarrollo en Windows 11

### **Paso 1: Configuración Automática**
```bash
npm run setup-dev
```

### **Paso 2: Modo de Desarrollo con Mock Data**
```bash
# Desarrollo con datos simulados
npm run dev:mock

# Desarrollo simulando Windows Server
npm run dev:server

# Desarrollo normal (requiere configuración manual)
npm run dev
```

### **Paso 3: Habilitar Auditoría (Opcional para datos reales)**

#### **Método 1 - Directivas de Grupo:**
1. Presionar `Win+R` → escribir `gpedit.msc`
2. Navegar a: `Configuración del equipo > Directivas > Configuración de Windows > Configuración de seguridad > Directivas locales > Directiva de auditoría`
3. Doble clic en **"Auditar eventos de inicio de sesión"**
4. Marcar **"Correcto"** y **"Error"**
5. Aplicar y ejecutar: `gpupdate /force`

#### **Método 2 - Línea de comandos (Como administrador):**
```cmd
auditpol /set /category:"Logon/Logoff" /success:enable /failure:enable
```

#### **Método 3 - PowerShell (Como administrador):**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
auditpol /set /category:"Logon/Logoff" /failure:enable
```

## 🎭 Sistema de Mock Data

### **Variables de Entorno de Desarrollo:**
```bash
NODE_ENV=development
FORCE_DEV_MODE=true
ENABLE_MOCK_DATA=true
USE_MOCK_GEOLOCATION=true
MOCK_SCENARIO=moderate          # light, moderate, heavy, attack
SIMULATE_WINDOWS_SERVER=false
```

### **Escenarios de Simulación:**
- **`light`**: 5 eventos/hora, 20% maliciosos
- **`moderate`**: 25 eventos/hora, 40% maliciosos
- **`heavy`**: 100 eventos/hora, 60% maliciosos
- **`attack`**: 500 eventos/hora, 80% maliciosos

### **Datos Simulados Incluidos:**
- ✅ **Eventos 4625** (failed logon) con IPs maliciosas reales
- ✅ **Geolocalización** con países y amenazas conocidas
- ✅ **Estadísticas de firewall** realistas
- ✅ **IPs bloqueadas** con datos de amenazas
- ✅ **Análisis de seguridad** con recomendaciones

## 🖥️ Modos de Ejecución

### **1. Desarrollo Completo (Windows 11 + Mock Data):**
```bash
npm run dev:mock
```
- ✅ Datos simulados realistas
- ✅ No requiere permisos admin
- ✅ Funcionalidad completa de testing
- ✅ Geolocalización simulada

### **2. Desarrollo Híbrido (Windows 11 + Algunos datos reales):**
```bash
npm run dev
```
- ⚠️ Requiere ejecutar como administrador
- ⚠️ Requiere configuración de auditoría
- ✅ Firewall real + datos simulados

### **3. Producción (Windows Server):**
```bash
npm run build
```
- ✅ Funcionalidad completa
- ✅ Eventos reales del sistema
- ✅ Monitoreo de seguridad real

## 🔍 Verificación de Estado

### **Comando de diagnóstico:**
```bash
node scripts/setup-dev-environment.js
```

**Output esperado:**
```
📊 RESUMEN DE COMPATIBILIDAD:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Permisos Admin:     ✅/❌
   Security Log:       ✅/❌
   Firewall:           ✅/❌
   Archivo .env:       ✅
```

## 🛠️ Solución de Problemas

### **Error: "Sistema no compatible - requiere Windows Server"**
**Solución:** Habilitar modo desarrollo:
```bash
set FORCE_DEV_MODE=true
npm run dev:mock
```

### **Error: "Sin acceso al Security Log"**
**Solución 1:** Ejecutar como administrador
**Solución 2:** Habilitar auditoría (ver arriba)
**Solución 3:** Usar mock data: `ENABLE_MOCK_DATA=true`

### **Error: "Rate limit alcanzado para geolocalización"**
**Solución:** Usar geolocalización simulada:
```bash
set USE_MOCK_GEOLOCATION=true
npm run dev:mock
```

### **Error: "Sin acceso al Firewall"**
**Solución:** Ejecutar como administrador o usar mock data

## 📊 Diferencias de Funcionalidad

| Funcionalidad | Windows Server | Windows 11 + Admin | Windows 11 + Mock |
|---------------|----------------|--------------------|--------------------|
| Events 4625 reales | ✅ Completo | ⚠️ Configuración requerida | ✅ Simulado |
| Firewall management | ✅ Completo | ✅ Completo | ✅ Simulado |
| Geolocalización | ✅ Real | ✅ Real | ✅ Simulada |
| Base de datos | ✅ Completa | ✅ Completa | ✅ Completa |
| Interfaz UI | ✅ Completa | ✅ Completa | ✅ Completa |
| Logging | ✅ Completo | ✅ Completo | ✅ Completo |

## 🎯 Recomendaciones para Desarrollo

### **Para Testing Diario:**
- Usar `npm run dev:mock` en Windows 11
- Datos realistas sin configuración compleja
- Desarrollo rápido y eficiente

### **Para Testing de Integración:**
- Configurar auditoría en Windows 11
- Ejecutar como administrador
- Probar funcionalidades reales

### **Para Deployment:**
- Usar Windows Server
- Configuración automática de eventos
- Funcionalidad completa de producción

## 🔐 Seguridad en Desarrollo

- Mock data usa **IPs maliciosas reales conocidas**
- Geolocalización simulada basada en **datos de amenazas reales**
- Eventos simulados siguen **patrones de ataques reales**
- Sistema mantiene **separación clara** entre datos reales y simulados

---

**La aplicación está completamente funcional en Windows 11 para desarrollo, con capacidades de simulación que permiten testing completo sin requerir Windows Server.**