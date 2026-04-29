# 🔧 Ejemplos de Implementación - Sistema de Audio

## 📋 Ejemplos por Tipo de Proyecto

### 1. 🛒 E-commerce - Monitoreo de Pedidos

```javascript
// Configuración específica para pedidos
function getItemId(order) {
    return order.order_id;
}

function getItemState(order) {
    return {
        status: order.status,           // 'pending', 'processing', 'shipped', 'delivered'
        payment: order.payment_status,  // 'pending', 'paid', 'failed', 'refunded'
        total: order.total_amount,
        items_count: order.items.length,
        customer_id: order.customer_id
    };
}

// Integración con API
async function loadOrders() {
    try {
        const response = await fetch('/api/orders?status=active');
        const orders = await response.json();
        updateUI(orders);
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// Polling cada 30 segundos
setInterval(loadOrders, 30000);
```

### 2. 🎫 Sistema de Soporte - Tickets

```javascript
// Configuración para tickets de soporte
function getItemId(ticket) {
    return ticket.ticket_id;
}

function getItemState(ticket) {
    return {
        status: ticket.status,          // 'open', 'in_progress', 'waiting', 'closed'
        priority: ticket.priority,      // 'low', 'medium', 'high', 'urgent'
        assignee: ticket.assignee_id,
        category: ticket.category,
        last_update: ticket.updated_at
    };
}

// WebSocket para tiempo real
const socket = new WebSocket('wss://support.example.com/tickets');

socket.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.type === 'tickets_update') {
        updateUI(data.tickets);
    }
};

// Sonidos específicos por prioridad
function playNotificationSound() {
    if (!audioConfig.enabled) return;
    
    // Usar sonido diferente según prioridad del último ticket
    let soundFile = audioConfig.notificationSound;
    if (lastNewTicket && lastNewTicket.priority === 'urgent') {
        soundFile = '/sounds/urgent-alert.mp3';
    }
    
    const audio = new Audio(soundFile);
    audio.volume = audioConfig.volume;
    audio.play().catch(() => showVisualNotification('nuevo'));
}
```

### 3. 💬 Sistema de Chat/Mensajería

```javascript
// Configuración para mensajes
function getItemId(message) {
    return message.message_id;
}

function getItemState(message) {
    return {
        read_status: message.is_read,
        sender_id: message.sender_id,
        room_id: message.room_id,
        message_type: message.type,     // 'text', 'image', 'file'
        timestamp: message.created_at
    };
}

// Socket.io para chat en tiempo real
const socket = io('https://chat.example.com');

socket.on('new_message', (message) => {
    updateUI([message]);
});

socket.on('message_read', (messageId) => {
    // Actualizar estado de lectura
    const messages = getCurrentMessages();
    updateUI(messages);
});

// Diferentes sonidos por tipo de mensaje
const messageSounds = {
    'text': '/sounds/message-text.mp3',
    'image': '/sounds/message-image.mp3',
    'file': '/sounds/message-file.mp3'
};

function playMessageSound(messageType) {
    if (!audioConfig.enabled) return;
    
    const soundFile = messageSounds[messageType] || audioConfig.notificationSound;
    const audio = new Audio(soundFile);
    audio.volume = audioConfig.volume;
    audio.play().catch(() => showVisualNotification('mensaje'));
}
```

### 4. 🚚 Sistema de Delivery/Logística

```javascript
// Configuración para entregas
function getItemId(delivery) {
    return delivery.delivery_id;
}

function getItemState(delivery) {
    return {
        status: delivery.status,        // 'assigned', 'picked_up', 'in_transit', 'delivered'
        driver_id: delivery.driver_id,
        location: delivery.current_location,
        estimated_time: delivery.eta,
        priority: delivery.priority
    };
}

// GPS tracking en tiempo real
function startDeliveryTracking() {
    setInterval(async () => {
        try {
            const response = await fetch('/api/deliveries/active');
            const deliveries = await response.json();
            updateUI(deliveries);
        } catch (error) {
            console.error('Error tracking deliveries:', error);
        }
    }, 15000); // Cada 15 segundos
}

// Alertas específicas por zona
function checkDeliveryAlerts(deliveries) {
    deliveries.forEach(delivery => {
        if (delivery.status === 'delivered') {
            playDeliveryCompleteSound();
        } else if (delivery.delay_minutes > 30) {
            playDelayAlertSound();
        }
    });
}
```

### 5. 🏥 Sistema Hospitalario - Pacientes

```javascript
// Configuración para pacientes
function getItemId(patient) {
    return patient.patient_id;
}

function getItemState(patient) {
    return {
        status: patient.status,         // 'admitted', 'in_treatment', 'discharged'
        priority: patient.triage_level, // 1-5 (1 = crítico)
        room: patient.room_number,
        doctor_id: patient.assigned_doctor,
        last_vitals: patient.last_vitals_check
    };
}

// Monitoreo crítico cada 5 segundos
setInterval(async () => {
    const response = await fetch('/api/patients/active');
    const patients = await response.json();
    
    // Filtrar pacientes críticos
    const criticalPatients = patients.filter(p => p.triage_level <= 2);
    if (criticalPatients.length > 0) {
        updateUI(patients);
    }
}, 5000);

// Sonidos de emergencia
function playEmergencyAlert() {
    const audio = new Audio('/sounds/emergency-alert.mp3');
    audio.volume = 1.0; // Volumen máximo para emergencias
    audio.play();
}
```

## 🔧 Configuraciones Avanzadas

### Múltiples Tipos de Eventos

```javascript
// Sistema con múltiples tipos de eventos
const eventTypes = {
    NEW_ORDER: 'new_order',
    ORDER_CANCELLED: 'order_cancelled',
    PAYMENT_RECEIVED: 'payment_received',
    INVENTORY_LOW: 'inventory_low',
    USER_REGISTERED: 'user_registered'
};

const eventSounds = {
    [eventTypes.NEW_ORDER]: '/sounds/new-order.mp3',
    [eventTypes.ORDER_CANCELLED]: '/sounds/order-cancelled.mp3',
    [eventTypes.PAYMENT_RECEIVED]: '/sounds/payment-success.mp3',
    [eventTypes.INVENTORY_LOW]: '/sounds/inventory-warning.mp3',
    [eventTypes.USER_REGISTERED]: '/sounds/user-joined.mp3'
};

function playEventSound(eventType, volume = audioConfig.volume) {
    if (!audioConfig.enabled) return;
    
    const soundFile = eventSounds[eventType];
    if (!soundFile) return;
    
    const audio = new Audio(soundFile);
    audio.volume = volume;
    audio.play().catch(() => showVisualNotification(eventType));
}

// Detectar diferentes tipos de eventos
function detectEvents(newData, previousData) {
    const events = [];
    
    // Nuevos pedidos
    const newOrders = newData.orders.filter(order => 
        !previousData.orders.some(prev => prev.id === order.id)
    );
    if (newOrders.length > 0) {
        events.push({ type: eventTypes.NEW_ORDER, count: newOrders.length });
    }
    
    // Pagos recibidos
    const newPayments = newData.payments.filter(payment => 
        payment.status === 'completed' && 
        !previousData.payments.some(prev => prev.id === payment.id && prev.status === 'completed')
    );
    if (newPayments.length > 0) {
        events.push({ type: eventTypes.PAYMENT_RECEIVED, count: newPayments.length });
    }
    
    // Inventario bajo
    const lowInventory = newData.products.filter(product => 
        product.stock < product.min_stock && 
        previousData.products.find(prev => prev.id === product.id)?.stock >= product.min_stock
    );
    if (lowInventory.length > 0) {
        events.push({ type: eventTypes.INVENTORY_LOW, count: lowInventory.length });
    }
    
    return events;
}
```

### Sistema de Prioridades

```javascript
// Configuración de prioridades
const priorityConfig = {
    CRITICAL: { level: 1, volume: 1.0, repeat: 3 },
    HIGH: { level: 2, volume: 0.8, repeat: 2 },
    MEDIUM: { level: 3, volume: 0.6, repeat: 1 },
    LOW: { level: 4, volume: 0.4, repeat: 1 }
};

function playPrioritySound(eventType, priority = 'MEDIUM') {
    const config = priorityConfig[priority];
    const soundFile = eventSounds[eventType];
    
    if (!audioConfig.enabled || !soundFile) return;
    
    // Reproducir sonido según prioridad
    for (let i = 0; i < config.repeat; i++) {
        setTimeout(() => {
            const audio = new Audio(soundFile);
            audio.volume = config.volume;
            audio.play().catch(() => showVisualNotification(eventType));
        }, i * 1000); // 1 segundo entre repeticiones
    }
}

// Uso con prioridades
function handleCriticalEvent(event) {
    playPrioritySound(event.type, 'CRITICAL');
    showUrgentNotification(event);
    logCriticalEvent(event);
}
```

### Filtros y Condiciones

```javascript
// Sistema de filtros para eventos
const audioFilters = {
    enabled: true,
    timeRange: { start: '09:00', end: '18:00' }, // Solo en horario laboral
    userTypes: ['admin', 'manager'],              // Solo para ciertos usuarios
    eventTypes: ['NEW_ORDER', 'PAYMENT_RECEIVED'], // Solo ciertos eventos
    minimumAmount: 100,                           // Solo pedidos > $100
    excludeTestData: true                         // Excluir datos de prueba
};

function shouldPlaySound(event, currentUser) {
    if (!audioFilters.enabled) return false;
    
    // Verificar horario
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    if (currentTime < audioFilters.timeRange.start || currentTime > audioFilters.timeRange.end) {
        return false;
    }
    
    // Verificar tipo de usuario
    if (!audioFilters.userTypes.includes(currentUser.type)) {
        return false;
    }
    
    // Verificar tipo de evento
    if (!audioFilters.eventTypes.includes(event.type)) {
        return false;
    }
    
    // Verificar monto mínimo (para pedidos)
    if (event.type === 'NEW_ORDER' && event.amount < audioFilters.minimumAmount) {
        return false;
    }
    
    // Excluir datos de prueba
    if (audioFilters.excludeTestData && event.isTest) {
        return false;
    }
    
    return true;
}
```

## 🎨 Personalizaciones de UI

### Panel Compacto

```html
<!-- Versión compacta del panel -->
<div class="card">
  <div class="card-header">
    <div class="d-flex justify-content-between align-items-center">
      <span>🔊 Audio</span>
      <div class="btn-group btn-group-sm">
        <button class="btn btn-outline-secondary" onclick="toggleAudio()">
          <i class="fas fa-volume-up"></i>
        </button>
        <button class="btn btn-outline-secondary" onclick="testSound()">
          <i class="fas fa-play"></i>
        </button>
        <button class="btn btn-outline-secondary" onclick="toggleAudioPanel()">
          <i class="fas fa-cog"></i>
        </button>
      </div>
    </div>
  </div>
</div>
```

### Panel con Tabs

```html
<!-- Panel con pestañas -->
<div class="card">
  <div class="card-header">
    <ul class="nav nav-tabs card-header-tabs">
      <li class="nav-item">
        <a class="nav-link active" data-toggle="tab" href="#audio-config">Configuración</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" data-toggle="tab" href="#audio-stats">Estadísticas</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" data-toggle="tab" href="#audio-filters">Filtros</a>
      </li>
    </ul>
  </div>
  <div class="card-body">
    <div class="tab-content">
      <div class="tab-pane active" id="audio-config">
        <!-- Controles de configuración -->
      </div>
      <div class="tab-pane" id="audio-stats">
        <!-- Estadísticas detalladas -->
      </div>
      <div class="tab-pane" id="audio-filters">
        <!-- Configuración de filtros -->
      </div>
    </div>
  </div>
</div>
```

## 📊 Analytics y Métricas

```javascript
// Sistema de métricas avanzado
const audioMetrics = {
    totalNotifications: 0,
    notificationsByType: {},
    notificationsByHour: {},
    averageResponseTime: 0,
    userInteractions: 0
};

function trackNotification(eventType) {
    audioMetrics.totalNotifications++;
    audioMetrics.notificationsByType[eventType] = (audioMetrics.notificationsByType[eventType] || 0) + 1;
    
    const hour = new Date().getHours();
    audioMetrics.notificationsByHour[hour] = (audioMetrics.notificationsByHour[hour] || 0) + 1;
    
    // Guardar métricas
    localStorage.setItem('audioMetrics', JSON.stringify(audioMetrics));
}

function generateReport() {
    const report = {
        period: '24h',
        total: audioMetrics.totalNotifications,
        byType: audioMetrics.notificationsByType,
        peakHours: Object.entries(audioMetrics.notificationsByHour)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3),
        userEngagement: audioMetrics.userInteractions / audioMetrics.totalNotifications
    };
    

    return report;
}
```

Este conjunto de ejemplos te permitirá implementar el sistema de audio en prácticamente cualquier tipo de aplicación web. ¡Cada ejemplo está optimizado para casos de uso específicos!
