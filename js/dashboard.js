/* ========================================
   Dashboard Shell — INNOVATION NFC E.S.F
   Router por hash, menú dinámico y RBAC
   ======================================== */

(function () {
  'use strict';

  const ROLES_TODOS = ['dueno', 'jefe', 'rrhh'];

  const MODULES = {
    panel: {
      ruta: 'panel',
      label: 'Panel',
      descripcion: 'Resumen general y actividad del periodo',
      roles: ROLES_TODOS,
      icon: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'
    },
    personal: {
      ruta: 'personal',
      label: 'Personal',
      descripcion: 'Plantilla, contratos y vencimientos',
      busqueda: 'Buscar nombre, usuario o DNI...',
      roles: ROLES_TODOS,
      icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
    },
    horarios: {
      ruta: 'horarios',
      label: 'Horarios',
      descripcion: 'Marcas, tardanzas y asistencia mensual',
      busqueda: 'Buscar empleado, área o cargo...',
      roles: ROLES_TODOS,
      icon: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>'
    },
    perfiles: {
      ruta: 'perfiles',
      label: 'Perfiles',
      descripcion: 'Ficha 360, documentos y cumpleaños',
      busqueda: 'Buscar colaborador por nombre, usuario o DNI...',
      roles: ['dueno', 'rrhh'],
      icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2.5"/><path d="M5.5 17a3.5 3.5 0 0 1 7 0"/><line x1="15" y1="9" x2="18" y2="9"/><line x1="15" y1="13" x2="18" y2="13"/>'
    },
    reportes: {
      ruta: 'reportes',
      label: 'Reportes',
      descripcion: 'Dashboards, auditoría y exportación',
      busqueda: 'Buscar widget del reporte...',
      roles: ROLES_TODOS,
      icon: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="3" y1="20" x2="21" y2="20"/>'
    },
    calendario: {
      ruta: 'calendario',
      label: 'Calendario',
      descripcion: 'Reuniones y agenda del equipo (RR.HH. solo lectura)',
      busqueda: 'Buscar reunión por título, lugar o invitado...',
      roles: ['dueno', 'jefe', 'rrhh'],
      icon: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 15h3M8 18h6"/>'
    },
    tickets: {
      ruta: 'tickets',
      label: 'Tickets',
      descripcion: 'Bandeja de soporte del Dueño',
      busqueda: 'Buscar ticket, asunto o solicitante...',
      roles: ['dueno'],
      icon: '<path d="M21 10V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3a2 2 0 0 1 0 4v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 0 1 0-4z"/><line x1="13" y1="5" x2="13" y2="19"/>'
    },
    tarjetas: {
      ruta: 'tarjetas',
      label: 'Tarjetas NFC',
      descripcion: 'Inventario, bloqueo y permisos',
      busqueda: 'Buscar tarjeta, UID o empleado...',
      roles: ['dueno'],
      icon: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/>'
    },
    configuracion: {
      ruta: 'configuracion',
      label: 'Configuración',
      descripcion: 'Cuenta, empresa y periodo activo',
      roles: ROLES_TODOS,
      icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'
    }
  };

  const ORDEN = ['panel', 'personal', 'horarios', 'perfiles', 'reportes', 'calendario', 'tickets', 'tarjetas', 'configuracion'];

  function iconSvg(paths) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  }

  function normalizarRuta(hash) {
    const limpio = String(hash || '').replace(/^#\/?/, '').trim();
    if (!limpio) return 'panel';
    return limpio.split('?')[0].split('/')[0] || 'panel';
  }

  class DashboardApp {
    constructor() {
      this.user = null;
      this.empleado = null;
      this.rol = null;
      this.urlUser = new URLSearchParams(window.location.search).get('user');
      this.fileMode = window.location.protocol === 'file:';
      this.rutaActual = 'panel';
      this.clockTimer = null;
      this.sessionMonitor = null;
      this.redirecting = false;
      this.searchValue = '';
      this.modules = window.DashboardModules || {};

      this.init();
    }

    init() {
      if (!this.ensureAuth()) return;
      if (!this.loadData()) return;

      if (window.SessionManager) window.SessionManager.initProtectedPage();

      this.renderIdentity();
      this.renderPeriodoUI();
      this.renderNav();
      this.bindEvents();
      this.startClock();
      this.startSessionMonitor();

      window.addEventListener('hashchange', () => this.renderRoute());
      this.renderRoute();
    }

    /* ---------- Autenticación y alcance ---------- */

    ensureAuth() {
      if (this.fileMode && this.urlUser) {
        const empleado = window.NFCReader?.getEmpleados().find((emp) =>
          emp.usuario === this.urlUser || emp.id === this.urlUser || emp.email === this.urlUser
        );

        if (!empleado || empleado.esReal !== true) {
          window.location.href = 'index.html?error=unauthorized';
          return false;
        }

        this.user = { ...empleado, empleadoId: empleado.id };
        if (window.SessionManager) window.SessionManager.startSession(this.user);
        return true;
      }

      if (!window.SessionManager || !window.SessionManager.isAuthenticated()) {
        window.location.href = 'index.html?error=unauthorized';
        return false;
      }

      this.user = window.SessionManager.getUser();
      if (!this.user) {
        window.location.href = 'index.html?error=unauthorized';
        return false;
      }
      return true;
    }

    loadData() {
      if (!window.NFCReader || !window.UI) {
        document.getElementById('view').innerHTML = `
          <div class="empty-state">
            <h3>No se pudo cargar la aplicación</h3>
            <p>Revisa que js/nfc-reader.js y js/ui.js estén disponibles y recarga la página.</p>
          </div>
        `;
        return false;
      }

      const empleados = window.NFCReader.getEmpleados();
      const empleado = empleados.find((emp) =>
        (this.user.empleadoId && emp.id === this.user.empleadoId) ||
        (this.user.usuario && emp.usuario === this.user.usuario) ||
        (this.user.email && emp.email === this.user.email)
      ) || null;

      if (!empleado || empleado.esReal !== true) {
        if (window.SessionManager) window.SessionManager.destroySession('Cuenta sin acceso al dashboard');
        window.location.href = 'index.html?error=unauthorized';
        return false;
      }

      this.empleado = empleado;
      this.user = { ...this.user, ...empleado, empleadoId: empleado.id };
      this.rol = empleado.rol;
      this.empleados = empleados;
      this.asistencia = window.NFCReader.getAsistencia();
      this.accesos = window.NFCReader.getAccesosZonas();
      this.zonas = window.NFCReader.getZonas();
      this.auditoria = window.NFCReader.getAuditoria();
      this.reuniones = window.NFCReader.getReunionesParaRol(this.rol);
      this.tickets = window.NFCReader.getTickets();
      this.tarjetas = window.NFCReader.getTarjetas();
      this.justificaciones = window.NFCReader.getJustificaciones();
      this.config = window.NFCReader.getConfig();
      this.periodo = window.NFCReader.getPeriodoSimulacion();
      return true;
    }

    empleadosVisibles() {
      if (this.rol !== 'jefe') return this.empleados;
      const areas = this.empleado?.areasSupervisadas || [];
      if (areas.includes('todas')) return this.empleados;
      return this.empleados.filter((emp) => areas.includes(emp.area));
    }

    tienePermiso(ruta) {
      const modulo = MODULES[ruta];
      return Boolean(modulo && modulo.roles.includes(this.rol));
    }

    rutasPermitidas() {
      return ORDEN.filter((ruta) => this.tienePermiso(ruta));
    }

    /* ---------- Identidad y navegación ---------- */

    renderIdentity() {
      const nombre = this.empleado?.nombre || this.user?.nombre || 'Usuario';
      const rolLabel = UI.rolLabel(this.rol);
      const iniciales = UI.iniciales(nombre);

      const set = (id, texto) => {
        const el = document.getElementById(id);
        if (el) el.textContent = texto;
      };

      set('sidebar-avatar', iniciales);
      set('sidebar-user-name', nombre);
      set('sidebar-user-role', `${rolLabel} · ${this.empleado?.area || '—'}`);
      set('topbar-avatar', iniciales);
      set('topbar-user-name', nombre.split(/\s+/).slice(0, 2).join(' '));
      set('topbar-user-role', rolLabel);
      set('dropdown-user-name', nombre);
      set('dropdown-user-email', this.empleado?.email || this.user?.email || '—');
    }

    renderPeriodoUI() {
      const periodo = String(this.periodo?.periodo || '2026-10');
      const [anio, mes] = periodo.split('-').map(Number);
      const nombreMes = UI.MESES[(mes || 1) - 1] || 'octubre';
      const etiqueta = `${nombreMes.charAt(0).toUpperCase()}${nombreMes.slice(1)} ${anio || 2026}`;
      const corte = this.periodo?.fechaCorte || '2026-10-30';
      const [corteAnio, corteMes, corteDia] = String(corte).split('-');
      const corteVisual = corteAnio && corteMes && corteDia ? `${corteDia}/${corteMes}/${corteAnio}` : corte;
      const sidebar = document.querySelector('.sidebar-period');
      if (sidebar) {
        const strong = sidebar.querySelector('strong');
        const span = sidebar.querySelector('span:last-child');
        if (strong) strong.textContent = etiqueta;
        if (span) span.textContent = `Corte ${corteVisual}`;
      }
      const badge = document.querySelector('.topbar-sim');
      if (badge) badge.textContent = etiqueta;
      const footer = document.querySelector('.app-footer span:first-child');
      if (footer) footer.textContent = `${etiqueta} · Corte ${corteVisual}`;
    }

    actualizarBuscador(ruta) {
      const input = document.getElementById('global-search');
      if (!input) return;
      const modulo = this.modules[ruta];
      const habilitado = typeof modulo?.onSearch === 'function';
      const placeholder = habilitado
        ? (MODULES[ruta]?.busqueda || `Buscar en ${MODULES[ruta]?.label || 'el módulo'}...`)
        : 'Sin búsqueda aquí';
      input.disabled = !habilitado;
      input.placeholder = placeholder;
      input.setAttribute('aria-label', placeholder);
      if (!habilitado) input.value = '';
    }

    renderNav() {
      const nav = document.getElementById('sidebar-nav');
      nav.innerHTML = this.rutasPermitidas().map((ruta) => {
        const modulo = MODULES[ruta];
        return `
          <a href="#/${ruta}" class="sidebar-link" data-route="${ruta}" title="${UI.esc(modulo.descripcion)}">
            ${iconSvg(modulo.icon)}
            <span>${UI.esc(modulo.label)}</span>
          </a>
        `;
      }).join('');
    }

    marcarNavActiva(ruta) {
      document.querySelectorAll('.sidebar-link').forEach((link) => {
        const activa = link.dataset.route === ruta;
        link.classList.toggle('active', activa);
        if (activa) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
    }

    /* ---------- Router ---------- */

    renderRoute() {
      if (this.redirecting) return;

      let ruta = normalizarRuta(window.location.hash);
      if (!MODULES[ruta]) ruta = 'panel';

      if (!this.tienePermiso(ruta)) {
        UI.toast('No tienes permiso para entrar a ese módulo. Te llevamos al Panel.', 'warning');
        if (window.location.hash !== '#/panel') {
          window.location.hash = '#/panel';
          return;
        }
        ruta = 'panel';
      }

      // Limpiar módulo anterior si tiene onUnload
      const moduloAnterior = this.modules[this.rutaActual];
      if (moduloAnterior && typeof moduloAnterior.onUnload === 'function') {
        moduloAnterior.onUnload();
      }

      this.rutaActual = ruta;
      this.marcarNavActiva(ruta);
      document.title = `${MODULES[ruta].label} · INNOVATION NFC E.S.F`;
      this.closeMobileSidebar();
      this.closeUserMenu();
      this.closeNotifications();
      this.limpiarBusqueda();

      const view = document.getElementById('view');
      const modulo = this.modules[ruta];
      if (!modulo || typeof modulo.render !== 'function') {
        view.innerHTML = UI.emptyState('Módulo no disponible', `No se encontró el script del módulo ${MODULES[ruta].label}.`);
        return;
      }

      try {
        view.innerHTML = '';
        modulo.render(view, this.crearContexto());
        this.actualizarBuscador(ruta);
        view.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: 'auto' });
      } catch (error) {
        console.error(`[Dashboard] Error al renderizar ${ruta}:`, error);
        view.innerHTML = UI.emptyState('No se pudo cargar el módulo', error.message || 'Error inesperado.');
      }
    }

    crearContexto() {
      // Refresca datos que pueden cambiar desde Perfiles o Calendario
      // sin obligar a recargar la página.
      this.empleados = window.NFCReader.getEmpleados();
      this.justificaciones = window.NFCReader.getJustificaciones();
      this.reuniones = window.NFCReader.getReunionesParaRol(this.rol);
      this.tickets = window.NFCReader.getTickets();
      this.tarjetas = window.NFCReader.getTarjetas();
      const ticketsAbiertos = this.tickets.filter((t) => t.estado === 'abierto').length;
      return {
        user: this.user,
        empleado: this.empleado,
        rol: this.rol,
        empleados: this.empleados,
        visibles: this.empleadosVisibles(),
        asistencia: this.asistencia,
        accesos: this.accesos,
        zonas: this.zonas,
        auditoria: this.auditoria,
        reuniones: this.reuniones,
        tickets: this.tickets,
        ticketsAbiertos,
        justificaciones: this.justificaciones,
        tarjetas: this.tarjetas,
        config: this.config,
        periodo: this.periodo,
        ruta: this.rutaActual
      };
    }

    refrescarReuniones() {
      this.reuniones = window.NFCReader.getReunionesParaRol(this.rol);
      this.renderNotificaciones();
    }

    refrescarTickets() {
      this.tickets = window.NFCReader.getTickets();
      this.renderNotificaciones();
    }

    refrescarTarjetas() {
      this.tarjetas = window.NFCReader.getTarjetas();
    }

    /* ---------- Reloj y notificaciones ---------- */

    startClock() {
      const actualizar = () => {
        const el = document.getElementById('topbar-clock');
        if (!el) return;
        const texto = new Intl.DateTimeFormat('es-PE', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).format(new Date());
        el.textContent = texto.replace(',', ' ·');
      };
      actualizar();
      this.clockTimer = setInterval(actualizar, 1000);
    }

    construirNotificaciones() {
      if (this.config?.notificaciones === false) return [];
      const items = [];
      const hoy = this.periodo.fechaCorte;

      this.reuniones
        .filter((r) => r.estado !== 'cancelada' && String(r.fecha) >= String(hoy))
        .slice(0, 6)
        .forEach((r) => {
          items.push({
            icono: '📅',
            titulo: r.titulo,
            detalle: `${UI.fechaCorta(r.fecha)} · ${UI.hora12(r.horaInicio)} · ${r.lugar}`
          });
        });

      const visibles = this.empleadosVisibles();
      const contratos = visibles.filter((e) => e.contrato?.estado === 'por_vencer').length;
      if (contratos) {
        items.push({ icono: '📄', titulo: `${contratos} contratos por vencer`, detalle: 'Revisa el módulo Personal' });
      }

      if (this.rol === 'dueno') {
        const abiertos = this.tickets.filter((t) => t.estado === 'abierto').length;
        if (abiertos) {
          items.push({ icono: '🎫', titulo: `${abiertos} ticket${abiertos === 1 ? '' : 's'} abierto${abiertos === 1 ? '' : 's'}`, detalle: 'Bandeja de soporte del Dueño' });
        }
      }

      return items;
    }

    renderNotificaciones() {
      const items = this.construirNotificaciones();
      const badge = document.getElementById('notification-count');
      const body = document.getElementById('notification-body');

      if (badge) {
        badge.textContent = String(items.length);
        badge.hidden = items.length === 0;
      }

      if (body) {
        body.innerHTML = items.length
          ? items.map((item) => `
              <div class="notification-item">
                <span aria-hidden="true">${item.icono}</span>
                <div><strong>${UI.esc(item.titulo)}</strong><small>${UI.esc(item.detalle)}</small></div>
              </div>
            `).join('')
          : '<p class="notification-empty">Sin notificaciones pendientes.</p>';
      }
    }

    closeNotifications() {
      const panel = document.getElementById('notification-panel');
      const btn = document.getElementById('notification-btn');
      if (panel) panel.hidden = true;
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }

    /* ---------- Menús y móvil ---------- */

    closeUserMenu() {
      const dropdown = document.getElementById('user-dropdown');
      const btn = document.getElementById('user-menu-btn');
      if (dropdown) dropdown.hidden = true;
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }

    toggleUserMenu() {
      const dropdown = document.getElementById('user-dropdown');
      const btn = document.getElementById('user-menu-btn');
      if (!dropdown || !btn) return;
      const abrir = dropdown.hidden;
      dropdown.hidden = !abrir;
      btn.setAttribute('aria-expanded', String(abrir));
      if (abrir) this.closeNotifications();
    }

    abrirMobileSidebar() {
      document.body.classList.add('sidebar-open');
      document.getElementById('menu-toggle')?.setAttribute('aria-expanded', 'true');
      document.getElementById('sidebar-backdrop')?.removeAttribute('hidden');
    }

    closeMobileSidebar() {
      document.body.classList.remove('sidebar-open');
      document.getElementById('menu-toggle')?.setAttribute('aria-expanded', 'false');
      const backdrop = document.getElementById('sidebar-backdrop');
      if (backdrop) backdrop.setAttribute('hidden', '');
    }

    limpiarBusqueda() {
      this.searchValue = '';
      const input = document.getElementById('global-search');
      if (input) input.value = '';
    }

    /* ---------- Eventos ---------- */

    bindEvents() {
      document.getElementById('menu-toggle')?.addEventListener('click', () => {
        if (document.body.classList.contains('sidebar-open')) this.closeMobileSidebar();
        else this.abrirMobileSidebar();
      });

      document.getElementById('sidebar-backdrop')?.addEventListener('click', () => this.closeMobileSidebar());

      document.getElementById('sidebar-logout')?.addEventListener('click', () => this.logout());
      document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());

      document.getElementById('user-menu-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleUserMenu();
      });

      document.getElementById('notification-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const panel = document.getElementById('notification-panel');
        const btn = e.currentTarget;
        if (!panel) return;
        const abrir = panel.hidden;
        panel.hidden = !abrir;
        btn.setAttribute('aria-expanded', String(abrir));
        if (abrir) this.closeUserMenu();
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('#user-menu')) this.closeUserMenu();
        if (!e.target.closest('.notification-wrap')) this.closeNotifications();
      });

      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        this.closeUserMenu();
        this.closeNotifications();
        this.closeMobileSidebar();
      });

      const search = document.getElementById('global-search');
      search?.addEventListener('input', () => {
        this.searchValue = search.value;
        const modulo = this.modules[this.rutaActual];
        if (modulo && typeof modulo.onSearch === 'function') {
          modulo.onSearch(this.searchValue, document.getElementById('view'), this.crearContexto());
        }
      });

      search?.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const modulo = this.modules[this.rutaActual];
        if (modulo && typeof modulo.onSearch === 'function') {
          modulo.onSearch(this.searchValue, document.getElementById('view'), this.crearContexto());
        }
        search.blur();
      });

      window.addEventListener('session:expired', () => this.handleSessionExpired());

      window.addEventListener('storage', (e) => {
        if (e.key === 'authToken' && !e.newValue) this.handleSessionExpired();
      });

      window.addEventListener('resize', () => {
        if (window.innerWidth > 980) this.closeMobileSidebar();
      });
    }

    logout() {
      if (window.SessionManager) window.SessionManager.logout(false);
      window.location.href = 'index.html';
    }

    /* ---------- Sesión ---------- */

    startSessionMonitor() {
      if (!window.SessionManager) return;
      if (this.sessionMonitor) clearInterval(this.sessionMonitor);
      this.sessionMonitor = setInterval(() => {
        if (!window.SessionManager.isAuthenticated()) this.handleSessionExpired();
      }, 30000);
    }

    handleSessionExpired() {
      if (this.redirecting) return;
      this.redirecting = true;
      if (this.sessionMonitor) clearInterval(this.sessionMonitor);
      UI.toast('Sesión expirada. Redirigiendo al inicio de sesión...', 'warning');
      setTimeout(() => {
        window.location.href = 'index.html?error=session_expired';
      }, 1200);
    }
  }

  function iniciar() {
    window.DashboardApp = new DashboardApp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
