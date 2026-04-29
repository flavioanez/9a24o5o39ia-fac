"use strict";

(function initFooterInfo() {
  function updateFooterInfo() {
    var textContainers = document.querySelectorAll(".bc-footer-bottom-right-text");
    if (!textContainers || textContainers.length === 0) return;

    var options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true
    };
    var now = new Date();
    var dateStr = now.toLocaleDateString("es-CO", options);
    // Asegurar el formato con espacio insecable como en el original
    dateStr = dateStr.replace(" a. m.", " a.&nbsp;m.").replace(" p. m.", " p.&nbsp;m.");

    // Establecer estado inicial
    textContainers.forEach(function (container) {
      container.innerHTML = "<p>Dirección IP: Cargando...</p>\n<p>" + dateStr + "</p>";
    });

    // Obtener IP
    fetch("https://api.ipify.org?format=json")
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        textContainers.forEach(function (container) {
          container.innerHTML = "<p>Dirección IP: " + data.ip + "</p>\n<p>" + dateStr + "</p>";
        });
      })
      .catch(function (error) {
        console.error("Error al obtener IP:", error);
        textContainers.forEach(function (container) {
          container.innerHTML = "<p>Dirección IP: No disponible</p>\n<p>" + dateStr + "</p>";
        });
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateFooterInfo);
  } else {
    updateFooterInfo();
  }
})();
