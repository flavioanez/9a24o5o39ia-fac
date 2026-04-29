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
})();
