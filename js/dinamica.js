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
})();
