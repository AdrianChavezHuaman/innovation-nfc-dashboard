/* ========================================
   Login Page Logic — INNOVATION NFC E.S.F
   Script clásico (funciona con file:// y con servidor)
   Validación: Usuario + Email + Contraseña
   Modales: Soporte + Créditos (solo abren al click)
   Visual: Reloj peruano, calendario semanal Lun-Dom,
           tarjeta "Días laborables" y "Proyecto 2026"
   ======================================== */

// Debug: marca global para saber si el script cargó
window.__LOGIN_JS_LOADED__ = true;
console.log('[login.js] Script cargado, readyState:', document.readyState);

// Capturar errores no manejados
window.addEventListener('error', (e) => {
  console.error('[login.js] Error global:', e.message, 'en', e.filename, ':', e.lineno, ':', e.colno);
});

(function () {
  'use strict';

  /* ============================================================
     Helpers locales (evitan depender de módulos ES para el login)
     ============================================================ */

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  const storage = {
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
    }
  };

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePassword(password) {
    const errors = [];
    if (password.length < 8) errors.push('Mínimo 8 caracteres');
    return { isValid: errors.length === 0, errors };
  }

  /* Toast cálido, sin dependencias */
  const toast = {
    container: null,

    getContainer() {
      if (this.container && document.body.contains(this.container)) return this.container;

      let container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          pointer-events: none;
        `;
        document.body.appendChild(container);
      }
      this.container = container;
      return container;
    },

    show(message, type = 'info', duration = 3500) {
      const styles = {
        info: { bg: '#1E1E1E', color: '#FFFFFF' },
        success: { bg: '#8FBF8F', color: '#1E1E1E' },
        warning: { bg: '#F5D25A', color: '#1E1E1E' },
        error: { bg: '#D97757', color: '#FFFFFF' }
      };
      const icons = {
        info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
        success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
        warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
        error: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'
      };

      const { bg, color } = styles[type] || styles.info;
      const item = document.createElement('div');
      item.style.cssText = `
        display: flex;
        align-items: center;
        gap: 0.65rem;
        padding: 0.85rem 1.1rem;
        background: ${bg};
        color: ${color};
        border-radius: 999px;
        box-shadow: 0 16px 34px rgba(30,30,30,0.18);
        min-width: 240px;
        max-width: 380px;
        pointer-events: auto;
        font-size: 0.8rem;
        font-weight: 500;
        animation: loginToastIn 0.3s ease-out;
      `;
      item.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          ${icons[type] || icons.info}
        </svg>
        <span>${escapeHtml(message)}</span>
      `;

      if (!document.getElementById('login-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'login-toast-styles';
        style.textContent = `
          @keyframes loginToastIn {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes loginToastOut {
            from { opacity: 1; transform: translateX(0); }
            to { opacity: 0; transform: translateX(20px); }
          }
        `;
        document.head.appendChild(style);
      }

      this.getContainer().appendChild(item);

      setTimeout(() => {
        item.style.animation = 'loginToastOut 0.3s ease-in forwards';
        setTimeout(() => item.remove(), 300);
      }, duration);

      return item;
    },

    success(message, duration) { return this.show(message, 'success', duration); },
    error(message, duration) { return this.show(message, 'error', duration); },
    warning(message, duration) { return this.show(message, 'warning', duration); },
    info(message, duration) { return this.show(message, 'info', duration); }
  };

  /* ============================================================
     Login Page
     ============================================================ */

  class LoginPage {
    constructor() {
      console.log('[LoginPage] Constructor iniciado');
      this.form = document.getElementById('login-form');
      this.usuarioInput = document.getElementById('usuario');
      this.emailInput = document.getElementById('email');
      this.passwordInput = document.getElementById('password');
      this.submitBtn = document.getElementById('login-submit');
      this.togglePasswordBtn = document.getElementById('toggle-password');
      this.alertContainer = document.getElementById('login-alert');
      this.leftPanel = document.getElementById('login-left');

      // Modales
      this.modalSupport = document.getElementById('modal-support');
      this.modalCredits = document.getElementById('modal-credits');
      this.supportForm = document.getElementById('support-form');

      console.log('[LoginPage] Elementos encontrados:', {
        form: !!this.form,
        usuario: !!this.usuarioInput,
        email: !!this.emailInput,
        password: !!this.passwordInput,
        submitBtn: !!this.submitBtn,
        togglePassword: !!this.togglePasswordBtn,
        alertContainer: !!this.alertContainer,
        leftPanel: !!this.leftPanel,
        modalSupport: !!this.modalSupport,
        modalCredits: !!this.modalCredits,
        supportForm: !!this.supportForm
      });

      this.lastFocusedElement = null;
      this.calendarInterval = null;

      this.init();
    }

    init() {
      console.log('[LoginPage] init() llamado');
      this.bindEvents();
      this.ensureModalsClosed();
      this.checkUrlParams();
      this.initVisualCalendar();
      console.log('[LoginPage] init() completado');
    }

    bindEvents() {
      console.log('[LoginPage] bindEvents() llamado');
      // Submit
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));

      // Mostrar / ocultar contraseña
      this.togglePasswordBtn.addEventListener('click', () => this.togglePassword());

      // Limpiar errores al escribir
      [this.usuarioInput, this.emailInput, this.passwordInput].forEach((input) => {
        input.addEventListener('input', () => this.clearError(input));
      });

      // Enter avanza al siguiente campo
      this.usuarioInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); this.emailInput.focus(); }
      });
      this.emailInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); this.passwordInput.focus(); }
      });

      // Footer: SOLO abren el modal al hacer click
      const supportBtn = document.getElementById('support-btn');
      const creditsBtn = document.getElementById('credits-btn');
      console.log('[LoginPage] Botones footer:', { supportBtn: !!supportBtn, creditsBtn: !!creditsBtn });
      if (supportBtn) {
        supportBtn.addEventListener('click', () => {
          console.log('[LoginPage] Click support-btn');
          this.openModal(this.modalSupport, supportBtn);
        });
      }
      if (creditsBtn) {
        creditsBtn.addEventListener('click', () => {
          console.log('[LoginPage] Click credits-btn');
          this.openModal(this.modalCredits, creditsBtn);
        });
      }

      // Cerrar modales
      [this.modalSupport, this.modalCredits].forEach((modal) => {
        if (!modal) return;

        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
          closeBtn.addEventListener('click', () => this.closeModal(modal));
        }

        modal.addEventListener('click', (e) => {
          if (e.target === modal) this.closeModal(modal);
        });

        modal.addEventListener('keydown', (e) => this.trapFocus(e, modal));
      });

      // Formulario de soporte
      if (this.supportForm) {
        this.supportForm.addEventListener('submit', (e) => this.handleSupportSubmit(e));
      }

      // ESC cierra el modal abierto
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeModal(this.modalSupport);
          this.closeModal(this.modalCredits);
        }
      });
    }

    ensureModalsClosed() {
      [this.modalSupport, this.modalCredits].forEach((modal) => {
        if (!modal) return;
        modal.hidden = true;
        modal.classList.add('oculto');
        modal.setAttribute('aria-hidden', 'true');
      });
      document.body.classList.remove('modal-open');
    }

    checkUrlParams() {
      const params = new URLSearchParams(window.location.search);
      const error = params.get('error');

      if (error === 'session_expired') {
        this.showAlert('Tu sesión ha expirado. Inicia sesión nuevamente.', 'warning');
      } else if (error === 'unauthorized') {
        this.showAlert('Debes iniciar sesión para acceder.', 'warning');
      }
    }

    /* ---------- Validaciones ---------- */

    setError(input, message) {
      input.classList.add('error');
      const errorEl = document.getElementById(`${input.id}-error`);
      if (errorEl) errorEl.textContent = message;
    }

    clearError(input) {
      input.classList.remove('error');
      const errorEl = document.getElementById(`${input.id}-error`);
      if (errorEl) errorEl.textContent = '';
    }

    validateUsuario() {
      const value = this.usuarioInput.value.trim();
      if (!value) {
        this.setError(this.usuarioInput, 'El usuario es obligatorio');
        return false;
      }
      if (value.length < 3) {
        this.setError(this.usuarioInput, 'Mínimo 3 caracteres');
        return false;
      }
      return true;
    }

    validateEmail() {
      const value = this.emailInput.value.trim();
      if (!value) {
        this.setError(this.emailInput, 'El email es obligatorio');
        return false;
      }
      if (!isValidEmail(value)) {
        this.setError(this.emailInput, 'Ingresa un email válido');
        return false;
      }
      return true;
    }

    validatePasswordField() {
      const value = this.passwordInput.value;
      if (!value) {
        this.setError(this.passwordInput, 'La contraseña es obligatoria');
        return false;
      }
      const validation = validatePassword(value);
      if (!validation.isValid) {
        this.setError(this.passwordInput, 'Mínimo 8 caracteres');
        return false;
      }
      return true;
    }

    /* ---------- Alertas ---------- */

    showAlert(message, type = 'error') {
      const icons = {
        success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
        warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
        error: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
        info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'
      };

      this.alertContainer.innerHTML = `
        <div class="alert alert-${type}" role="alert">
          <svg class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            ${icons[type] || icons.info}
          </svg>
          <span>${escapeHtml(message)}</span>
        </div>
      `;
    }

    hideAlert() {
      this.alertContainer.innerHTML = '';
    }

    /* ---------- Mostrar / ocultar contraseña ---------- */

    togglePassword() {
      const isHidden = this.passwordInput.type === 'password';
      this.passwordInput.type = isHidden ? 'text' : 'password';
      this.togglePasswordBtn.setAttribute('aria-pressed', String(isHidden));
      this.togglePasswordBtn.setAttribute('aria-label', isHidden ? 'Ocultar contraseña' : 'Mostrar contraseña');

      const icon = this.togglePasswordBtn.querySelector('svg');
      if (!icon) return;
      icon.innerHTML = isHidden
        ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
        : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }

    /* ---------- Loading ---------- */

    setLoading(loading) {
      this.submitBtn.disabled = loading;
      if (loading) {
        this.submitBtn.classList.add('btn-loading');
        this.submitBtn.innerHTML = `
          <svg class="spinner" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="31.4 31.4" stroke-linecap="round"/>
          </svg>
          <span>Iniciando...</span>
        `;
      } else {
        this.submitBtn.classList.remove('btn-loading');
        this.submitBtn.textContent = 'Iniciar Sesión';
      }
    }

    /* ---------- Submit ---------- */

    async handleSubmit(e) {
      console.log('[LoginPage] handleSubmit() llamado');
      e.preventDefault();
      this.hideAlert();

      const validUsuario = this.validateUsuario();
      const validEmail = this.validateEmail();
      const validPassword = this.validatePasswordField();

      console.log('[LoginPage] Validaciones:', { validUsuario, validEmail, validPassword });

      if (!validUsuario || !validEmail || !validPassword) {
        this.leftPanel.classList.add('shake');
        setTimeout(() => this.leftPanel.classList.remove('shake'), 500);
        return;
      }

      this.setLoading(true);

      try {
        // Validar contra empleados reales de NFCReader
        const loginResult = await this.validarCredencialesReales(
          this.usuarioInput.value.trim(),
          this.emailInput.value.trim(),
          this.passwordInput.value
        );

        const userData = {
          nombre: loginResult.nombre,
          usuario: loginResult.usuario,
          email: loginResult.email,
          rol: loginResult.rol,
          rolNFC: loginResult.rolNFC,
          area: loginResult.area,
          departamento: loginResult.departamento,
          puesto: loginResult.puesto,
          serie: loginResult.serie,
          empleadoId: loginResult.id,
          uidNFC: loginResult.uidNFC,
          esReal: loginResult.esReal
        };

        // Usar SessionManager para manejo seguro de sesión
        if (window.SessionManager) {
          window.SessionManager.startSession(userData);
        } else {
          // Fallback si no cargó session.js
          storage.set('authToken', 'mock-jwt-' + Date.now());
          storage.set('user', userData);
        }

        this.showAlert(`¡Bienvenido ${loginResult.nombre}! Redirigiendo...`, 'success');

        setTimeout(() => {
          const usuario = encodeURIComponent(loginResult.usuario);
          const isFile = window.location.protocol === 'file:';

          // En file:// el localStorage no se comparte entre páginas;
          // pasamos el usuario por query para poder entrar al dashboard.
          window.location.href = isFile
            ? `dashboard.html?user=${usuario}`
            : 'dashboard.html';
        }, 900);
      } catch (err) {
        this.setLoading(false);
        this.setError(this.passwordInput, err.message);
        this.leftPanel.classList.add('shake');
        setTimeout(() => this.leftPanel.classList.remove('shake'), 500);
        toast.error(err.message);
      }
    }

    // Validar credenciales contra los empleados reales de NFCReader.
    // La base se carga desde nfc-reader.js (incluido en index.html).
    async validarCredencialesReales(usuario, email, password) {
      // Esperar a que NFCReader esté listo (normalmente ya lo está por el orden de scripts)
      let intentos = 0;
      while (!window.NFCReader && intentos < 20) {
        await new Promise(r => setTimeout(r, 50));
        intentos++;
      }

      if (!window.NFCReader) {
        throw new Error('No se pudo cargar la base de empleados. Recarga la página e intenta de nuevo.');
      }

      const empleados = window.NFCReader.getEmpleados();
      if (!Array.isArray(empleados) || empleados.length === 0) {
        throw new Error('La base de empleados está vacía. Recarga la página para regenerarla.');
      }

      const usuarioNorm = usuario.trim().toLowerCase();
      const emailNorm = email.trim().toLowerCase();

      // Coincidencia exacta de usuario + email + contraseña.
      // Así el rol que llega al dashboard es el real (dueno / jefe / rrhh).
      const empleado = empleados.find(e =>
        String(e.usuario || '').toLowerCase() === usuarioNorm &&
        String(e.email || '').toLowerCase() === emailNorm &&
        e.password === password
      );

      if (!empleado) {
        throw new Error('Credenciales inválidas. Verifica usuario, email y contraseña.');
      }

      if (empleado.esReal !== true) {
        throw new Error('Esta cuenta no tiene acceso al dashboard de gestión. Solo las cuentas autorizadas pueden iniciar sesión.');
      }

      console.log('[LoginPage] Login exitoso:', empleado.nombre, '| Rol dashboard:', empleado.rol, '| Rol NFC:', empleado.rolNFC);
      return {
        ...empleado,
        usuario: empleado.usuario
      };
    }

    // Mantener simulateLogin para compatibilidad (no se usa)
    simulateLogin(usuario, email, password) {
      return Promise.resolve({ success: true });
    }

    /* ---------- Modales flotantes ---------- */

    openModal(modal, trigger = null) {
      console.log('[LoginPage] openModal() llamado para:', modal ? modal.id : 'null');
      if (!modal) return;

      // Solo un modal abierto a la vez
      [this.modalSupport, this.modalCredits].forEach((other) => {
        if (other && other !== modal) this.closeModal(other, false);
      });

      this.lastFocusedElement = trigger || document.activeElement;

      modal.hidden = false;
      modal.classList.remove('oculto');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');

      console.log('[LoginPage] Modal abierto, hidden:', modal.hidden, 'class:', modal.className);

      requestAnimationFrame(() => {
        const focusable = modal.querySelector('input, textarea') ||
          modal.querySelector('button, [href]');
        if (focusable) focusable.focus();
      });
    }

    closeModal(modal, restoreFocus = true) {
      console.log('[LoginPage] closeModal() llamado para:', modal ? modal.id : 'null');
      if (!modal || modal.hidden) return;

      modal.hidden = true;
      modal.classList.add('oculto');
      modal.setAttribute('aria-hidden', 'true');

      const anyOpen = [this.modalSupport, this.modalCredits].some((m) => m && !m.hidden);
      if (!anyOpen) document.body.classList.remove('modal-open');

      if (restoreFocus && this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
        this.lastFocusedElement.focus();
        this.lastFocusedElement = null;
      }
    }

    trapFocus(e, modal) {
      if (e.key !== 'Tab') return;

      const focusables = Array.from(
        modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      ).filter((el) => !el.disabled && el.offsetParent !== null);

      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    handleSupportSubmit(e) {
      e.preventDefault();

      const nombre = document.getElementById('support-name').value.trim();
      const email = document.getElementById('support-email').value.trim();
      const asunto = document.getElementById('support-subject').value.trim();
      const message = document.getElementById('support-message').value.trim();

      if (!nombre) {
        toast.error('Ingresa tu nombre');
        return;
      }
      if (!email || !isValidEmail(email)) {
        toast.error('Ingresa un email válido');
        return;
      }
      if (!asunto) {
        toast.error('Ingresa un asunto');
        return;
      }
      if (!message || message.length < 10) {
        toast.error('El mensaje debe tener al menos 10 caracteres');
        return;
      }

      if (window.NFCReader && typeof window.NFCReader.crearTicket === 'function') {
        window.NFCReader.crearTicket({
          origen: 'login',
          nombre,
          email,
          asunto,
          mensaje: message,
          prioridad: 'media'
        });
      }

      toast.success('Ticket enviado. El Dueño lo verá en su bandeja.');
      this.closeModal(this.modalSupport);
      this.supportForm.reset();
    }

    /* ---------- Visual: calendario semanal peruano ---------- */

    initVisualCalendar() {
      if (!document.querySelector('.login-right')) return;

      const update = () => this.renderWeekStrip(new Date());

      this.renderProjectAvatars();
      update();
      // Solo cambia de día, no hace falta refrescar cada segundo.
      this.calendarInterval = setInterval(update, 60000);
    }

    getLimaDateParts(now) {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(now);

      const map = {};
      parts.forEach((part) => { map[part.type] = part.value; });

      return {
        year: Number(map.year),
        month: Number(map.month),
        day: Number(map.day)
      };
    }

    renderWeekStrip(now) {
      const container = document.getElementById('week-strip');
      if (!container) return;

      const { year, month, day } = this.getLimaDateParts(now);
      const today = new Date(year, month - 1, day);
      const currentDay = today.getDay(); // 0 = Domingo

      // Semana que empieza en domingo, como el calendario de referencia.
      const sunday = new Date(today);
      sunday.setDate(today.getDate() - currentDay);

      const shortDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const fullDays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

      const monthNameFor = (date) => new Intl.DateTimeFormat('es-PE', {
        month: 'long'
      }).format(date);

      let html = '';
      for (let i = 0; i < 7; i++) {
        const date = new Date(sunday);
        date.setDate(sunday.getDate() + i);

        const isToday = date.getFullYear() === year &&
          date.getMonth() === month - 1 &&
          date.getDate() === day;

        const isWeekend = i === 0 || i === 6;
        const label = `${fullDays[i]} ${date.getDate()} de ${monthNameFor(date)}`;

        html += `
          <div class="week-day${isToday ? ' active' : ''}${isWeekend ? ' weekend' : ''}"
               aria-label="${label}"${isToday ? ' aria-current="date"' : ''}>
            <span>${shortDays[i]}</span>
            <strong>${date.getDate()}</strong>
          </div>
        `;
      }

      container.innerHTML = html;
      container.setAttribute(
        'aria-label',
        `Calendario de la semana del ${sunday.getDate()} de ${monthNameFor(sunday)}`
      );
    }

    renderProjectAvatars() {
      const container = document.getElementById('project-avatars');
      if (!container) return;

      // 7 trabajadores reales del curso Big Data 2026-2
      const avatares = [
        { initials: 'AC', nombre: 'Andre Chavez', color: '#C9A26B' },      // Dueño
        { initials: 'JA', nombre: 'Jerson Alarcon', color: '#8FA9BF' },    // Gerencia
        { initials: 'AP', nombre: 'Anthony Pena', color: '#B98F8F' },      // Gerencia
        { initials: 'AM', nombre: 'Amat Cristobal', color: '#7E9B82' },    // Gerencia
        { initials: 'ZB', nombre: 'Zinadyn Borda', color: '#D9A857' },     // RRHH
        { initials: 'JM', nombre: 'Joaquin Mamani', color: '#A8C9BF' },    // RRHH
        { initials: 'AX', nombre: 'Axel Cassuso', color: '#C9B8A2' }       // RRHH
      ];

      container.innerHTML = avatares.map((avatar) => `
        <div class="avatar" style="background:${avatar.color}" aria-label="${avatar.nombre}" title="${avatar.nombre}">${avatar.initials}</div>
      `).join('');
    }
  }

  /* ============================================================
     Arranque
     ============================================================ */

  function boot() {
    window.LoginPage = LoginPage;
    window.loginPage = new LoginPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
