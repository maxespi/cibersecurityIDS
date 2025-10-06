# Análisis de Actualización y Persistencia de Datos

## 📋 Análisis Actual

### **Comportamiento de Datos Durante Actualizaciones**

Basado en la configuración actual de la aplicación, he identificado los siguientes comportamientos:

## 🗄️ **Ubicación de la Base de Datos**

### **Configuración Actual:**
```javascript
// src/config/constants.js línea 22
DATABASE.STORAGE: path.join(APP_ROOT, 'db/config/database.sqlite')
```

### **Problema Identificado:**
- **Base de datos ubicada en carpeta de instalación**
- **Se PERDERÁ en cada actualización**
- **No sigue mejores prácticas de Electron**

### **Ubicación Recomendada:**
```javascript
// Debería estar en userData
DATABASE.STORAGE: path.join(USER_DATA_PATH, 'database.sqlite')
```

## 📁 **Análisis de Rutas por Tipo de Dato**

| Tipo de Archivo | Ubicación Actual | Comportamiento en Update | Estado |
|-----------------|------------------|-------------------------|---------|
| **database.sqlite** | `/db/config/` | ❌ SE PIERDE | PROBLEMÁTICO |
| **Logs aplicación** | `%APPDATA%/logs/` | ✅ SE MANTIENE | CORRECTO |
| **Archivos temporales** | `%APPDATA%/temp/` | ✅ SE MANTIENE | CORRECTO |
| **Scripts PowerShell** | `/files/script/` | ❌ SE SOBRESCRIBE | NORMAL |
| **Configuración** | `/files/config/` | ❌ SE SOBRESCRIBE | NORMAL |

## 🔧 **Configuración de Electron Builder**

### **ExtraFiles Incluidos:**
```json
"extraFiles": [
    {"from": "files/script", "to": "files/script"},
    {"from": "files/logs", "to": "files/logs"},
    {"from": "files/config", "to": "files/config"},
    {"from": "dist", "to": "dist"}
]
```

### **Análisis del Problema:**
- Los `extraFiles` se **sobrescriben** en cada instalación
- Base de datos está incluida en la carpeta de instalación
- **Datos de usuario se pierden** al actualizar

## 🛠️ **Soluciones Requeridas**

### **1. Migración de Base de Datos**
Mover la base de datos a `userData`:
```javascript
DATABASE.STORAGE: path.join(app.getPath('userData'), 'database.sqlite')
```

### **2. Migración Durante Actualización**
Crear script de migración automática:
```javascript
async function migrateDatabase() {
    const oldDbPath = path.join(APP_ROOT, 'db/config/database.sqlite');
    const newDbPath = path.join(app.getPath('userData'), 'database.sqlite');

    if (fs.existsSync(oldDbPath) && !fs.existsSync(newDbPath)) {
        fs.copyFileSync(oldDbPath, newDbPath);
        logger.info('Base de datos migrada a userData');
    }
}
```

### **3. Configuración de Auto-Updater**
```javascript
"build": {
    "nsis": {
        "oneClick": false,
        "allowToChangeInstallationDirectory": true,
        "deleteAppDataOnUninstall": false
    },
    "directories": {
        "output": "dist-app"
    }
}
```

## 📊 **Ubicaciones de Datos en Windows**

### **Datos que SE MANTIENEN (userData):**
- `%APPDATA%/cibersecurity/logs/`
- `%APPDATA%/cibersecurity/temp/`
- **✅ NUEVA:** `%APPDATA%/cibersecurity/database.sqlite`

### **Datos que SE SOBRESCRIBEN (instalación):**
- `Program Files/cibersecurity/files/script/`
- `Program Files/cibersecurity/files/config/`
- `Program Files/cibersecurity/dist/`

## 🔄 **Flujo de Actualización Recomendado**

### **Primera Instalación:**
1. Crear base de datos en `userData`
2. Configurar usuario admin
3. Inicializar logs

### **Actualización:**
1. **Detectar versión anterior**
2. **Migrar datos si es necesario**
3. **Mantener configuración de usuario**
4. **Actualizar solo archivos de aplicación**

### **Desinstalación:**
- Archivos de aplicación: **SE ELIMINAN**
- Datos de usuario: **SE MANTIENEN** (opcional)

## ⚠️ **Riesgos Actuales**

### **Al Actualizar la Aplicación:**
- ❌ **Todos los datos de la base de datos se pierden**
- ❌ **IPs bloqueadas se pierden**
- ❌ **Configuración de whitelist se pierde**
- ❌ **Historial de eventos se pierde**
- ❌ **Usuario admin se recrea**

### **Impacto en Seguridad:**
- **Pérdida de contexto de amenazas**
- **Configuración de seguridad se resetea**
- **Historial de ataques desaparece**

## 🎯 **Plan de Corrección**

### **Fase 1: Migración Inmediata**
1. Cambiar ubicación de base de datos a `userData`
2. Crear función de migración automática
3. Mantener compatibilidad con instalaciones existentes

### **Fase 2: Configuración de Builder**
1. Configurar NSIS para preservar datos
2. Implementar auto-updater
3. Configurar políticas de desinstalación

### **Fase 3: Testing**
1. Probar actualización con datos existentes
2. Verificar migración automática
3. Confirmar persistencia de configuración

## 📝 **Respuesta a la Pregunta**

### **¿Se pierden los datos al actualizar?**
**SÍ - ACTUALMENTE SE PIERDEN TODOS LOS DATOS** porque:
- Base de datos está en carpeta de instalación
- Se sobrescribe con cada actualización
- No hay migración automática

### **¿Se reconoce como actualización?**
**SÍ - Electron Builder maneja actualizaciones** pero:
- Solo preserva archivos en `userData`
- Archivos en carpeta de instalación se sobrescriben
- Base de datos actual se pierde

### **Solución Inmediata:**
Implementar la migración de base de datos a `userData` **antes** de la próxima actualización.