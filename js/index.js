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
    var accessButton = document.querySelector("[data-test=login-button]");

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

    userInput.addEventListener("input", function () {
      this.value = sanitizeUser(this.value || "");
      syncFloatingLabel(this);
      validateInputs();
    });

    passInput.addEventListener("input", function () {
      this.value = sanitizePass(this.value || "");
      syncFloatingLabel(this);
      validateInputs();
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
  });
})();
