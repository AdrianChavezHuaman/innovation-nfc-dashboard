/* ========================================
   Session Manager — INNOVATION NFC E.S.F
   Seguridad: timeout, visibilidad, limpieza de credenciales
   Script clásico (sin módulos ES)
   ======================================== */

(function () {
  'use strict';

  const SESSION_CONFIG = {
    // Tiempo de inactividad antes de expirar (ms) - 15 min
    INACTIVITY_TIMEOUT: 15 * 60 * 1000,
    // Intervalo para verificar actividad (ms) - 30 seg
    CHECK_INTERVAL: 30 * 1000,
    // Tiempo antes de advertir (ms) - 1 min
    WARNING_TIME: 60 * 1000,
    // Claves de storage
    TOKEN_KEY: 'authToken',
    USER_KEY: 'user',
    SESSION_START_KEY: 'sessionStart',
    LAST_ACTIVITY_KEY: 'lastActivity'
  };

  let inactivityTimer = null;
  let checkInterval = null;
  let warningShown = false;
  let isSessionLocked = false;
  let visibilityEventsBound = false;

  // ============================================================
  // Utilidades de Storage (solo token/sesión, NUNCA credenciales)
  // ============================================================

  const sessionStorage = {
    get(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch {
        return defaultValue;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
    clearSession() {
      this.remove(SESSION_CONFIG.TOKEN_KEY);
      this.remove(SESSION_CONFIG.USER_KEY);
      this.remove(SESSION_CONFIG.SESSION_START_KEY);
      this.remove(SESSION_CONFIG.LAST_ACTIVITY_KEY);
    }
  };

  // ============================================================
  // API Pública
  // ============================================================

  window.SessionManager = {
    // Iniciar sesión (llamado tras login exitoso)
    startSession(userData) {
      const now = Date.now();
      isSessionLocked = false;
      warningShown = false;
      sessionStorage.set(SESSION_CONFIG.TOKEN_KEY, 'session-' + now);
      sessionStorage.set(SESSION_CONFIG.USER_KEY, userData);
      sessionStorage.set(SESSION_CONFIG.SESSION_START_KEY, now);
      sessionStorage.set(SESSION_CONFIG.LAST_ACTIVITY_KEY, now);
      this.resetInactivityTimer();
      this.startActivityMonitor();
      this.bindVisibilityEvents();
      console.log('[SessionManager] Sesión iniciada para:', userData.nombre);
    },

    // Verificar si hay sesión válida
    isAuthenticated() {
      const token = sessionStorage.get(SESSION_CONFIG.TOKEN_KEY);
      const user = sessionStorage.get(SESSION_CONFIG.USER_KEY);
      const lastActivity = sessionStorage.get(SESSION_CONFIG.LAST_ACTIVITY_KEY);

      if (!token || !user || !lastActivity) return false;

      // Verificar expiración por inactividad
      const elapsed = Date.now() - lastActivity;
      if (elapsed > SESSION_CONFIG.INACTIVITY_TIMEOUT) {
        this.destroySession('Sesión expirada por inactividad');
        return false;
      }

      return true;
    },

    // Obtener usuario actual (sin credenciales)
    getUser() {
      return sessionStorage.get(SESSION_CONFIG.USER_KEY);
    },

    // Actualizar actividad (llamado en eventos de usuario)
    updateActivity() {
      if (this.isAuthenticated()) {
        sessionStorage.set(SESSION_CONFIG.LAST_ACTIVITY_KEY, Date.now());
        this.resetInactivityTimer();
        warningShown = false;
      }
    },

    // Cerrar sesión manual
    logout(redirect = true) {
      this.destroySession('Sesión cerrada por el usuario');
      if (redirect) {
        window.location.href = 'index.html';
      }
    },

    // Destruir sesión y limpiar
    destroySession(reason) {
      console.log('[SessionManager] Destruyendo sesión:', reason);
      this.stopTimers();
      sessionStorage.clearSession();
      isSessionLocked = true;

      // Avisar a la página para que redirija de inmediato, sin esperar
      // al siguiente chequeo de 30 segundos.
      if (/inactividad|timeout/i.test(reason)) {
        window.dispatchEvent(new CustomEvent('session:expired', { detail: { reason } }));
      }
    },

    // Bloquear sesión (p.ej. al cambiar de pestaña)
    lockSession() {
      if (this.isAuthenticated()) {
        console.log('[SessionManager] Sesión bloqueada por cambio de visibilidad');
        isSessionLocked = true;
        // No destruimos, solo marcamos para pedir re-auth al volver
      }
    },

    // Desbloquear sesión (al volver a la pestaña)
    unlockSession() {
      if (isSessionLocked && this.isAuthenticated()) {
        console.log('[SessionManager] Sesión desbloqueada, actividad actualizada');
        isSessionLocked = false;
        this.updateActivity();
        return true;
      }
      return this.isAuthenticated();
    },

    // Verificar si está bloqueada
    isLocked() {
      return isSessionLocked;
    },

    // Obtener tiempo restante de sesión (ms)
    getRemainingTime() {
      const lastActivity = sessionStorage.get(SESSION_CONFIG.LAST_ACTIVITY_KEY);
      if (!lastActivity) return 0;
      const elapsed = Date.now() - lastActivity;
      return Math.max(0, SESSION_CONFIG.INACTIVITY_TIMEOUT - elapsed);
    },

    // Formatear tiempo restante para mostrar
    formatRemainingTime() {
      const ms = this.getRemainingTime();
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    },

    // Inicializar en login page (limpiar formulario, etc.)
    initLoginPage() {
      this.clearLoginForm();
      // Si venimos de logout o expiración, mostrar mensaje
      const params = new URLSearchParams(window.location.search);
      const error = params.get('error');
      if (error === 'session_expired') {
        this.showToast('Tu sesión ha expirado por inactividad. Inicia sesión nuevamente.', 'warning');
      } else if (error === 'unauthorized') {
        this.showToast('Debes iniciar sesión para acceder.', 'warning');
      }
    },

    // Inicializar en una página protegida (dashboard, áreas, asistencia).
    // Reactiva el timeout y los listeners de actividad tras una recarga.
    initProtectedPage() {
      if (!this.isAuthenticated()) return false;
      this.bindVisibilityEvents();
      this.startActivityMonitor();
      this.resetInactivityTimer();
      return true;
    },

    // Limpiar formulario de login (seguridad: no autollenar credenciales)
    clearLoginForm() {
      const usuario = document.getElementById('usuario');
      const email = document.getElementById('email');
      const password = document.getElementById('password');

      if (usuario) usuario.value = '';
      if (email) email.value = '';
      if (password) password.value = '';

      // Deshabilitar autocompletado en campo password
      if (password) {
        password.autocomplete = 'off';
        password.setAttribute('autocomplete', 'new-password');
      }
    },

    // Toast simple
    showToast(message, type = 'info') {
      const colors = {
        info: '#1E1E1E',
        success: '#8FBF8F',
        warning: '#F5D25A',
        error: '#D97757'
      };
      let container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:9999;display:flex;flex-direction:column;gap:.5rem;pointer-events:none;';
        document.body.appendChild(container);
      }
      const item = document.createElement('div');
      item.textContent = message;
      item.style.cssText = `background:${colors[type] || colors.info};color:${type === 'warning' ? '#1E1E1E' : '#FFFFFF'};padding:.8rem 1.1rem;border-radius:999px;box-shadow:0 16px 34px rgba(30,30,30,.18);font-size:.8rem;font-weight:500;pointer-events:auto;animation:slideIn .3s ease;`;
      container.appendChild(item);
      setTimeout(() => { item.style.animation = 'slideOut .3s ease forwards'; setTimeout(() => item.remove(), 300); }, 3500);
      // Estilos de animación
      if (!document.getElementById('session-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'session-toast-styles';
        style.textContent = `@keyframes slideIn {from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}@keyframes slideOut {from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(20px)}}`;
        document.head.appendChild(style);
      }
    },

    // ============================================================
    // Internos
    // ============================================================

    resetInactivityTimer() {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      const remaining = this.getRemainingTime();
      inactivityTimer = setTimeout(() => this.destroySession('Timeout por inactividad'), remaining);
    },

    startActivityMonitor() {
      if (checkInterval) clearInterval(checkInterval);
      checkInterval = setInterval(() => {
        if (!this.isAuthenticated()) {
          this.stopTimers();
          return;
        }
        const remaining = this.getRemainingTime();
        // Mostrar advertencia 1 min antes
        if (remaining <= SESSION_CONFIG.WARNING_TIME && remaining > 0 && !warningShown) {
          warningShown = true;
          this.showToast(`Tu sesión expirará en ${this.formatRemainingTime()}. Mueve el mouse para continuar.`, 'warning');
        }
      }, SESSION_CONFIG.CHECK_INTERVAL);
    },

    stopTimers() {
      if (inactivityTimer) { clearTimeout(inactivityTimer); inactivityTimer = null; }
      if (checkInterval) { clearInterval(checkInterval); checkInterval = null; }
    },

    bindVisibilityEvents() {
      if (visibilityEventsBound) return;
      visibilityEventsBound = true;

      // Detectar cambio de pestaña/ventana
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          // Pestaña oculta: bloquear sesión
          this.lockSession();
        } else {
          // Pestaña visible: intentar desbloquear
          if (isSessionLocked) {
            const unlocked = this.unlockSession();
            if (!unlocked) {
              // Sesión expiró mientras estaba oculto
              this.showToast('Sesión expirada. Redirigiendo al login...', 'warning');
              setTimeout(() => window.location.href = 'index.html?error=session_expired', 1500);
            }
          }
        }
      });

      // Detectar actividad del usuario para resetear timer
      const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
      let activityThrottle = null;
      const handleActivity = () => {
        if (activityThrottle) return;
        activityThrottle = setTimeout(() => {
          activityThrottle = null;
          this.updateActivity();
        }, 1000); // Throttle 1s
      };
      activityEvents.forEach(evt => document.addEventListener(evt, handleActivity, { passive: true }));

      // Antes de cerrar/recargar: limpiar credenciales del formulario si existe
      window.addEventListener('beforeunload', () => {
        this.clearLoginForm();
      });
    }
  };

  // Auto-inicializar según el tipo de página.
  const iniciarPagina = () => {
    if (document.getElementById('login-form')) {
      window.SessionManager.initLoginPage();
    } else if (window.SessionManager.isAuthenticated()) {
      window.SessionManager.initProtectedPage();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarPagina);
  } else {
    iniciarPagina();
  }

})();