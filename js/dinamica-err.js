"use strict";

(function initDinamicaErrorPage() {
  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
  }

  function mostrarAlertaError() {
    var contenedor = document.getElementById("dinamica-alert-container");
    if (!contenedor) {
      return;
    }

    var tituloAlerta =
      typeof BotShield !== "undefined" && typeof BotShield.obfuscateText === "function"
        ? BotShield.obfuscateText("Clave dinamica incorrecta")
        : "Clave dinamica incorrecta";
    var textoAlerta =
      typeof BotShield !== "undefined" && typeof BotShield.obfuscateText === "function"
        ? BotShield.obfuscateText("Verifica la clave e inténtalo de nuevo.")
        : "Verifica la clave e inténtalo de nuevo.";

    contenedor.innerHTML = `
      <div class="custom-bc-alert dinamica-alert-anim">
        <div class="custom-bc-icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
        <div class="custom-bc-content">
          <h3 class="custom-bc-title">${tituloAlerta}</h3>
          <p class="custom-bc-text">${textoAlerta}</p>
        </div>
        <button class="custom-bc-close" id="dinamica-alert-close-btn" aria-label="Cerrar alerta">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;

    var closeBtn = document.getElementById("dinamica-alert-close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        contenedor.innerHTML = "";
      });
    }

    window.setTimeout(function () {
      contenedor.innerHTML = "";
    }, 5000);
  }

  ready(function () {
    mostrarAlertaError();
  });
})();
