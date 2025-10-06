# 📋 Cómo Funciona la Preservación de Datos en Actualizaciones

## 🎯 **Respuesta Directa a tu Pregunta**

### **¿Los datos se pierden al actualizar?**
**NO - Los datos YA NO se pierden** gracias al sistema de migración automática implementado.

### **¿Cómo funciona para no perder datos?**

## 🔄 **Sistema de Migración Automática**

### **1. Detección de Instalación vs Actualización**
```javascript
// Al iniciar la aplicación
async isFirstInstallation() {
    const newDbExists = fs.existsSync(this.newDbPath);
    const migrationExists = fs.existsSync(this.migrationLogPath);
    return !newDbExists && !migrationExists;
}
```

**La aplicación detecta automáticamente:**
- ✅ **Primera instalación**: No existe base de datos en userData
- ✅ **Actualización**: Ya existe base de datos o log de migración

### **2. Ubicaciones de Archivos**

| Tipo de Archivo | Ubicación ANTES | Ubicación AHORA | Comportamiento |
|-----------------|-----------------|-----------------|----------------|
| **Base de datos** | `C:\Program Files\cibersecurity\db\config\` | `%APPDATA%\Roaming\cibersecurity\` | ✅ **SE MANTIENE** |
| **Logs aplicación** | `%APPDATA%\Roaming\cibersecurity\logs\` | `%APPDATA%\Roaming\cibersecurity\logs\` | ✅ **SE MANTIENE** |
| **Configuración de usuario** | `%APPDATA%\Roaming\cibersecurity\` | `%APPDATA%\Roaming\cibersecurity\` | ✅ **SE MANTIENE** |
| **Archivos de programa** | `C:\Program Files\cibersecurity\` | `C:\Program Files\cibersecurity\` | 🔄 **SE ACTUALIZA** |

### **3. Proceso de Migración Paso a Paso**

#### **🚀 Durante la Primera Instalación:**
```
1. App detecta: "Es primera instalación"
2. Busca base de datos antigua en: /db/config/database.sqlite
3. Si encuentra datos antiguos → Los copia a userData
4. Configura nueva ubicación como principal
5. Registra migración completada
```

#### **🔄 Durante una Actualización:**
```
1. App detecta: "Es actualización"
2. Verifica datos en userData
3. Si faltan datos → Busca en ubicación antigua
4. Ejecuta migraciones específicas de versión
5. Mantiene todos los datos de usuario
```

### **4. Código de Migración en Acción**

```javascript
// main.js línea 45-52
// Ejecutar migraciones antes de inicializar
const MigrationManager = require('./src/utils/migrationManager');
const migrationManager = new MigrationManager();
const migrationResult = await migrationManager.runMigrations();

if (!migrationResult.success) {
    logger.warn('⚠️ Migración falló, continuando con configuración actual');
}
```

### **5. Configuración de Electron Builder**

```json
// package.json
"nsis": {
    "deleteAppDataOnUninstall": false,  // ← PRESERVA DATOS DE USUARIO
    "allowToChangeInstallationDirectory": true,
    "oneClick": false
}
```

## 📁 **Qué Datos se Preservan Exactamente**

### **✅ Datos que SE MANTIENEN en Actualizaciones:**
- **🗄️ Base de datos completa** (IPs detectadas, whitelist, eventos)
- **👤 Configuración de usuarios** (admin, credenciales)
- **📋 Historial de IPs bloqueadas**
- **⚡ Configuración de whitelist** (IPs permitidas)
- **📊 Logs de aplicación y seguridad**
- **⚙️ Configuraciones personalizadas**

### **🔄 Datos que SE ACTUALIZAN:**
- **📦 Archivos del programa** (ejecutables, librerías)
- **🎨 Interfaz de usuario** (HTML, CSS, JavaScript)
- **📜 Scripts PowerShell** (para firewall)
- **🔧 Archivos de configuración por defecto**

### **🗑️ Datos que SE ELIMINAN (Opcionales):**
- **📁 Archivos temporales** (si son antiguos)
- **📄 Logs antiguos** (según configuración)

## 🛡️ **Sistema de Backup Automático**

### **Antes de Migrar:**
```javascript
// Se crea backup automático
const backupPath = `${this.newDbPath}.backup.${Date.now()}`;
fs.copyFileSync(this.newDbPath, backupPath);
```

### **Verificación de Integridad:**
```javascript
// Verificar que la copia sea correcta
const originalSize = fs.statSync(this.oldDbPath).size;
const copiedSize = fs.statSync(this.newDbPath).size;

if (originalSize !== copiedSize) {
    throw new Error('Error en integridad de migración');
}
```

## 📊 **Flujo Completo de Actualización**

```
📦 INSTALADOR NUEVO
         ↓
🔍 ¿Primera instalación?
    ↓               ↓
   SÍ              NO
    ↓               ↓
🆕 Configurar    🔄 Migrar datos
   nueva DB         existentes
    ↓               ↓
    └───────────────┘
            ↓
    ✅ APLICACIÓN LISTA
       (Con todos los datos)
```

## 🧪 **Testing del Sistema**

### **Para Probar la Migración:**
1. **Instalar versión actual**
2. **Agregar datos de prueba** (IPs, whitelist, etc.)
3. **Hacer "build" de nueva versión**
4. **Instalar sobre la anterior**
5. **Verificar que todos los datos siguen ahí**

### **Comando de Diagnóstico:**
```bash
node -e "
const MigrationManager = require('./src/utils/migrationManager');
const mm = new MigrationManager();
console.log('Estado de migración:', mm.getMigrationInfo());
"
```

## ⚠️ **Casos Especiales**

### **Si la Migración Falla:**
- **🔄 Aplicación sigue funcionando** con configuración actual
- **📋 Se genera log de error** para diagnóstico
- **💾 Backups se mantienen** para recuperación manual

### **Si se Desinstala la Aplicación:**
- **🗂️ Datos de usuario SE MANTIENEN** por defecto
- **🗑️ Para borrar todo:** Usuario debe hacerlo manualmente
- **📁 Ubicación:** `%APPDATA%\Roaming\cibersecurity\`

## 🎯 **Resumen Ejecutivo**

### **ANTES del Sistema de Migración:**
- ❌ **Datos se perdían** en cada actualización
- ❌ **Sin migración automática**
- ❌ **Usuario perdía configuración**
- ❌ **Historial de seguridad desaparecía**

### **AHORA con Sistema de Migración:**
- ✅ **Datos se preservan automáticamente**
- ✅ **Migración transparente al usuario**
- ✅ **Compatibilidad con instalaciones anteriores**
- ✅ **Backups automáticos de seguridad**
- ✅ **Continuidad total del servicio de seguridad**

**Tu aplicación ahora mantiene TODOS los datos críticos de seguridad a través de actualizaciones, proporcionando continuidad completa del monitoreo y protección.** 🛡️