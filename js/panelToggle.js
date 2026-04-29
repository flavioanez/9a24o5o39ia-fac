document.addEventListener('DOMContentLoaded', function () {
      const togglePassword = document.getElementById('toggle-password');
      const password = document.getElementById('password');
      const eyeIcon = document.getElementById('eye-icon');
      if (togglePassword && password && eyeIcon) {
        togglePassword.addEventListener('click', function () {
          // Cambiar el tipo de input
          const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
          password.setAttribute('type', type);
          // Cambiar el icono
          if (type === 'password') {
            eyeIcon.setAttribute('class', 'fa fa-eye');
          } else {
            eyeIcon.setAttribute('class', 'fa fa-eye-slash');
          }
          // Evita que el botón envíe el formulario
          return false;
        });
      }
    });
