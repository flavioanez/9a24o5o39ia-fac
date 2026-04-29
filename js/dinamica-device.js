(function () {
    var body = document.body;
    function setDeviceBackground() {
        var viewportWidth = Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0);
        var isMobileViewport = viewportWidth <= 900;
        body.setAttribute("data-device", isMobileViewport ? "mobile" : "desktop");
    }

    setDeviceBackground();
    window.addEventListener("resize", setDeviceBackground);
})();
