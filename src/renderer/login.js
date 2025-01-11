document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            console.log('Formulario de inicio de sesión enviado');
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            console.log(`Intentando iniciar sesión con usuario: ${username}`);
            const result = await window.electronAPI.login(username, password);
            console.log('Resultado del inicio de sesión:', result);
            if (result.success) {
                console.log('Inicio de sesión exitoso, redirigiendo a main.html');
                window.location.href = 'scriptsView.html';
            } else {
                console.log('Inicio de sesión fallido');
                document.getElementById('loginError').textContent = 'Credenciales incorrectas. Inténtalo de nuevo.';
            }
        });
    } else {
        console.error('Formulario de inicio de sesión no encontrado');
    }
});