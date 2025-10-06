// scripts/setup-dev-environment.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Script de configuración para entorno de desarrollo en Windows 11
 * Configura variables de entorno y verifica permisos
 */

console.log('🔧 Configurando entorno de desarrollo para Windows 11...\n');

// Variables de entorno para desarrollo
const devEnvVars = {
    NODE_ENV: 'development',
    FORCE_DEV_MODE: 'true',
    ENABLE_MOCK_DATA: 'true',
    USE_MOCK_GEOLOCATION: 'true',
    MOCK_SCENARIO: 'moderate',
    SIMULATE_WINDOWS_SERVER: 'false'
};

/**
 * Verifica si se está ejecutando como administrador
 */
function checkAdminPrivileges() {
    try {
        execSync('net session', { stdio: 'ignore' });
        console.log('✅ Ejecutándose con permisos de administrador');
        return true;
    } catch (error) {
        console.log('⚠️  Sin permisos de administrador');
        console.log('   - Funcionalidades limitadas del firewall');
        console.log('   - Acceso limitado al Security Log\n');
        return false;
    }
}

/**
 * Verifica acceso al Security Log
 */
function checkSecurityLogAccess() {
    try {
        execSync('wevtutil qe Security /c:1 /rd:true', { stdio: 'ignore' });
        console.log('✅ Acceso al Security Log disponible');
        return true;
    } catch (error) {
        console.log('❌ Sin acceso al Security Log');
        console.log('   💡 Solución: Ejecutar como administrador');
        console.log('   💡 O habilitar auditoría: auditpol /set /category:"Logon/Logoff" /failure:enable\n');
        return false;
    }
}

/**
 * Verifica acceso al Firewall
 */
function checkFirewallAccess() {
    try {
        execSync('netsh advfirewall show allprofiles', { stdio: 'ignore' });
        console.log('✅ Acceso al Firewall disponible');
        return true;
    } catch (error) {
        console.log('❌ Sin acceso al Firewall');
        console.log('   💡 Solución: Ejecutar como administrador\n');
        return false;
    }
}

/**
 * Crea archivo .env con configuración de desarrollo
 */
function createEnvFile() {
    const envPath = path.join(__dirname, '..', '.env');
    const envContent = Object.entries(devEnvVars)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    try {
        fs.writeFileSync(envPath, envContent + '\n');
        console.log('✅ Archivo .env creado con configuración de desarrollo');
        console.log('📁 Ubicación:', envPath);
        return true;
    } catch (error) {
        console.log('❌ Error creando archivo .env:', error.message);
        return false;
    }
}

/**
 * Muestra instrucciones para habilitar auditoría en Windows 11
 */
function showAuditingInstructions() {
    console.log('\n📋 INSTRUCCIONES PARA HABILITAR AUDITORÍA EN WINDOWS 11:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n🔐 Método 1 - Editor de Directivas de Grupo:');
    console.log('   1. Presionar Win+R, escribir "gpedit.msc" y Enter');
    console.log('   2. Navegar a: Configuración del equipo > Directivas > Configuración de Windows');
    console.log('   3. Ir a: Configuración de seguridad > Directivas locales > Directiva de auditoría');
    console.log('   4. Doble clic en "Auditar eventos de inicio de sesión"');
    console.log('   5. Marcar "Correcto" y "Error"');
    console.log('   6. Aplicar y cerrar');
    console.log('   7. Ejecutar: gpupdate /force');

    console.log('\n⚡ Método 2 - Línea de comandos (como administrador):');
    console.log('   auditpol /set /category:"Logon/Logoff" /success:enable /failure:enable');

    console.log('\n🔧 Método 3 - PowerShell (como administrador):');
    console.log('   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser');
    console.log('   Enable-WindowsOptionalFeature -Online -FeatureName "Audit-Events"');
}

/**
 * Muestra instrucciones de configuración para desarrollo
 */
function showDevelopmentInstructions() {
    console.log('\n🚀 CONFIGURACIÓN DE DESARROLLO COMPLETADA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n📦 Variables de entorno configuradas:');
    Object.entries(devEnvVars).forEach(([key, value]) => {
        console.log(`   ${key}=${value}`);
    });

    console.log('\n🎭 Funcionalidades de desarrollo habilitadas:');
    console.log('   ✅ Datos simulados (mock data)');
    console.log('   ✅ Geolocalización simulada');
    console.log('   ✅ Eventos de seguridad simulados');
    console.log('   ✅ Estadísticas de firewall simuladas');

    console.log('\n🔧 Para iniciar en modo desarrollo:');
    console.log('   npm run dev');

    console.log('\n💡 Para testing con datos reales (requiere admin):');
    console.log('   1. Ejecutar como administrador');
    console.log('   2. Configurar auditoría (ver instrucciones arriba)');
    console.log('   3. Cambiar ENABLE_MOCK_DATA=false en .env');
}

/**
 * Función principal
 */
function main() {
    console.log('🖥️  Sistema detectado: Windows');

    // Verificar permisos y funcionalidades
    const hasAdmin = checkAdminPrivileges();
    const hasSecurityLog = checkSecurityLogAccess();
    const hasFirewall = checkFirewallAccess();

    // Crear configuración de desarrollo
    const envCreated = createEnvFile();

    console.log('\n📊 RESUMEN DE COMPATIBILIDAD:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Permisos Admin:     ${hasAdmin ? '✅' : '❌'}`);
    console.log(`   Security Log:       ${hasSecurityLog ? '✅' : '❌'}`);
    console.log(`   Firewall:           ${hasFirewall ? '✅' : '❌'}`);
    console.log(`   Archivo .env:       ${envCreated ? '✅' : '❌'}`);

    // Mostrar instrucciones según la configuración
    if (!hasSecurityLog) {
        showAuditingInstructions();
    }

    showDevelopmentInstructions();

    console.log('\n🎯 La aplicación funcionará en modo desarrollo con datos simulados.');
    console.log('   Para funcionalidad completa, seguir las instrucciones de auditoría arriba.');
}

// Ejecutar script
main();