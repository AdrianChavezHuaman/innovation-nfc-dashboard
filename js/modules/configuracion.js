/* Módulo Configuración — preferencias globales, cuenta y entorno */

(function () {
  'use strict';

  window.DashboardModules = window.DashboardModules || {};

  function render(container, ctx) {
    const emp = ctx.empleado || {};
    const config = ctx.config || {};
    const temaActual = config.tema === 'carbon' ? 'carbon' : 'claro';
    const esDueno = ctx.rol === 'dueno';

    container.innerHTML = `
      ${UI.pageHeader({
        eyebrow: 'Configuración',
        titulo: 'Preferencias del sistema',
        descripcion: 'Apariencia, cuenta, seguridad, entorno y soporte técnico.'
      })}

      <section class="configuracion-card">
        <div class="configuracion-head">
          <div>
            <span class="perfil-eyebrow">Apariencia</span>
            <h2>Tema del proyecto</h2>
            <p>El tema se aplica a todos los módulos y a los reportes exportados.</p>
          </div>
        </div>
        <div class="config-theme-grid">
          <button type="button" class="config-theme-card ${temaActual === 'claro' ? 'is-active' : ''}" data-tema-global="claro">
            <span class="config-theme-preview config-theme-preview-claro" aria-hidden="true">
              <i></i><i></i><i></i>
            </span>
            <span class="config-theme-copy">
              <strong>Claro crema</strong>
              <small>La identidad cálida original del sistema.</small>
            </span>
            <span class="config-theme-check">${temaActual === 'claro' ? '✓' : ''}</span>
          </button>
          <button type="button" class="config-theme-card ${temaActual === 'carbon' ? 'is-active' : ''}" data-tema-global="carbon">
            <span class="config-theme-preview config-theme-preview-carbon" aria-hidden="true">
              <i></i><i></i><i></i>
            </span>
            <span class="config-theme-copy">
              <strong>Carbón</strong>
              <small>Interfaz oscura con acentos dorados y verdes.</small>
            </span>
            <span class="config-theme-check">${temaActual === 'carbon' ? '✓' : ''}</span>
          </button>
        </div>
        <p class="config-theme-note">
          <span aria-hidden="true">◐</span>
          El cambio se aplica al instante y queda guardado para las próximas sesiones.
        </p>
      </section>

      <div class="configuracion-columns">
        <section class="configuracion-card">
          <div class="configuracion-head">
            <div>
              <span class="perfil-eyebrow">Cuenta</span>
              <h2>Datos de contacto</h2>
              <p>Información visible en tu ficha y en la gestión interna.</p>
            </div>
          </div>
          <div class="config-grid config-grid-3 config-account-summary">
            <div class="config-item"><span>Usuario</span><strong>${UI.esc(emp.nombre || '—')}</strong></div>
            <div class="config-item"><span>Correo</span><strong>${UI.esc(emp.email || '—')}</strong></div>
            <div class="config-item"><span>Rol</span><strong>${UI.esc(UI.rolLabel(ctx.rol))}</strong></div>
          </div>
          <form id="config-cuenta-form" class="config-form">
            <div class="config-form-grid">
              <div class="form-group">
                <label class="form-label" for="config-telefono">Teléfono</label>
                <input class="form-input" id="config-telefono" name="telefono" type="tel" value="${UI.esc(emp.telefono || '')}" placeholder="+51 999 999 999">
              </div>
              <div class="form-group">
                <label class="form-label" for="config-distrito">Distrito</label>
                <input class="form-input" id="config-distrito" name="distrito" type="text" value="${UI.esc(emp.distrito || '')}" placeholder="Distrito">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="config-direccion">Dirección</label>
              <input class="form-input" id="config-direccion" name="direccion" type="text" value="${UI.esc(emp.direccion || '')}" placeholder="Dirección de contacto">
            </div>
            <div class="config-form-actions">
              <span>El correo de acceso se mantiene protegido.</span>
              <button type="submit" class="btn btn-primary btn-sm">Guardar contacto</button>
            </div>
          </form>
        </section>

        <section class="configuracion-card">
          <div class="configuracion-head">
            <div>
              <span class="perfil-eyebrow">Seguridad</span>
              <h2>Contraseña y sesión</h2>
              <p>Cambia tu clave o cierra la sesión activa.</p>
            </div>
          </div>
          <form id="config-password-form" class="config-form">
            <div class="form-group">
              <label class="form-label" for="config-pass-actual">Contraseña actual</label>
              <input class="form-input" id="config-pass-actual" name="actual" type="password" autocomplete="current-password" required>
            </div>
            <div class="config-form-grid">
              <div class="form-group">
                <label class="form-label" for="config-pass-nueva">Nueva contraseña</label>
                <input class="form-input" id="config-pass-nueva" name="nueva" type="password" minlength="8" autocomplete="new-password" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="config-pass-confirmar">Confirmar nueva</label>
                <input class="form-input" id="config-pass-confirmar" name="confirmar" type="password" minlength="8" autocomplete="new-password" required>
              </div>
            </div>
            <div class="config-form-actions">
              <span>Mínimo 8 caracteres.</span>
              <button type="submit" class="btn btn-primary btn-sm">Cambiar contraseña</button>
            </div>
          </form>
          <div class="config-security-footer">
            <span>La sesión se cierra automáticamente tras 15 minutos de inactividad.</span>
            <button type="button" class="btn btn-ghost btn-sm config-logout" data-config-logout>Cerrar sesión</button>
          </div>
        </section>
      </div>

      <section class="configuracion-card">
        <div class="configuracion-head">
          <div>
            <span class="perfil-eyebrow">Entorno</span>
            <h2>Empresa y periodo</h2>
            <p>${esDueno ? 'Datos globales de la simulación. Solo el Dueño puede modificarlos.' : 'Solo el Dueño puede modificar estos datos.'}</p>
          </div>
        </div>
        ${esDueno ? `
          <form id="config-entorno-form" class="config-form">
            <div class="config-form-grid">
              <div class="form-group">
                <label class="form-label" for="config-empresa">Empresa</label>
                <input class="form-input" id="config-empresa" name="empresa" type="text" value="${UI.esc(config.empresa || 'INNOVATION NFC E.S.F')}" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="config-periodo">Periodo activo</label>
                <input class="form-input" id="config-periodo" name="periodoSimulacion" type="month" value="${UI.esc(config.periodoSimulacion || '2026-10')}" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="config-fecha-corte">Fecha de corte</label>
                <input class="form-input" id="config-fecha-corte" name="fechaCorte" type="date" value="${UI.esc(config.fechaCorte || '2026-10-30')}" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="config-jornada">Jornada semanal (horas)</label>
                <input class="form-input" id="config-jornada" name="jornadaSemanalHoras" type="number" min="1" max="60" step="1" value="${UI.esc(config.jornadaSemanalHoras || 48)}" required>
              </div>
            </div>
            <label class="config-toggle">
              <input type="checkbox" name="notificaciones" ${config.notificaciones !== false ? 'checked' : ''}>
              <span class="config-toggle-track" aria-hidden="true"></span>
              <span class="config-toggle-copy">
                <strong>Notificaciones del sistema</strong>
                <small>Mostrar reuniones, contratos y tickets en la campana del topbar.</small>
              </span>
            </label>
            <div class="config-form-actions">
              <span>Los cambios de periodo se reflejan en los módulos al volver a entrar.</span>
              <button type="submit" class="btn btn-primary btn-sm">Guardar entorno</button>
            </div>
          </form>
        ` : `
          <div class="config-grid config-info-grid">
            <div class="config-item"><span>Empresa</span><strong>${UI.esc(config.empresa || 'INNOVATION NFC E.S.F')}</strong></div>
            <div class="config-item"><span>Periodo</span><strong>${UI.esc(config.periodoSimulacion || '2026-10')}</strong></div>
            <div class="config-item"><span>Fecha de corte</span><strong>${UI.esc(config.fechaCorte || '2026-10-30')}</strong></div>
            <div class="config-item"><span>Jornada semanal</span><strong>${UI.esc(config.jornadaSemanalHoras || 48)} horas</strong></div>
            <div class="config-item"><span>Notificaciones</span><strong>${config.notificaciones === false ? 'Desactivadas' : 'Activadas'}</strong></div>
            <div class="config-item"><span>Acceso</span><strong>Solo lectura</strong></div>
          </div>
        `}
      </section>

      <section class="configuracion-card config-soporte-card">
        <div class="configuracion-head">
          <div>
            <span class="perfil-eyebrow">Soporte técnico</span>
            <h2>¿Necesitas ayuda?</h2>
            <p>Envía una solicitud a la bandeja del Dueño.</p>
          </div>
        </div>
        <form id="config-soporte-form" class="config-soporte-form">
          <div class="config-soporte-grid">
            <div class="form-group">
              <label class="form-label" for="config-soporte-asunto">Asunto</label>
              <input class="form-input" id="config-soporte-asunto" name="asunto" type="text" maxlength="80" required placeholder="Ej. No puedo actualizar mis datos">
            </div>
            <div class="form-group">
              <label class="form-label" for="config-soporte-prioridad">Prioridad</label>
              <select class="form-input" id="config-soporte-prioridad" name="prioridad">
                <option value="baja">Baja</option>
                <option value="media" selected>Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="config-soporte-mensaje">Mensaje</label>
            <textarea class="form-input" id="config-soporte-mensaje" name="mensaje" rows="4" required minlength="10" placeholder="Describe tu consulta o problema con el sistema."></textarea>
          </div>
          <div class="config-soporte-actions">
            <span>El ticket aparecerá en <strong>Tickets</strong>, visible solo para el Dueño.</span>
            <button type="submit" class="btn btn-primary">Enviar ticket</button>
          </div>
        </form>
      </section>
    `;

    const soporteForm = container.querySelector('#config-soporte-form');
    soporteForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const asunto = String(soporteForm.querySelector('#config-soporte-asunto')?.value || '').trim();
      const mensaje = String(soporteForm.querySelector('#config-soporte-mensaje')?.value || '').trim();
      const prioridad = String(soporteForm.querySelector('#config-soporte-prioridad')?.value || 'media');
      if (asunto.length < 3) {
        UI.toast('Escribe un asunto de al menos 3 caracteres.', 'warning');
        return;
      }
      if (mensaje.length < 10) {
        UI.toast('El mensaje debe tener al menos 10 caracteres.', 'warning');
        return;
      }
      window.NFCReader.crearTicket({
        origen: 'configuracion',
        nombre: emp.nombre || 'Usuario',
        email: emp.email || '',
        asunto,
        mensaje,
        prioridad
      });
      soporteForm.reset();
      window.DashboardApp?.refrescarTickets?.();
      UI.toast('Ticket enviado a soporte. El Dueño lo verá en su bandeja.', 'success');
    });

    const cuentaForm = container.querySelector('#config-cuenta-form');
    cuentaForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const datos = new FormData(cuentaForm);
      window.NFCReader.actualizarEmpleado(emp.id, {
        telefono: String(datos.get('telefono') || '').trim(),
        direccion: String(datos.get('direccion') || '').trim(),
        distrito: String(datos.get('distrito') || '').trim()
      });
      if (window.DashboardApp) {
        window.DashboardApp.empleado = window.NFCReader.getEmpleadoPorId(emp.id);
        window.DashboardApp.user = { ...window.DashboardApp.user, ...window.DashboardApp.empleado };
      }
      UI.toast('Datos de contacto actualizados.', 'success');
      render(container, window.DashboardApp ? window.DashboardApp.crearContexto() : ctx);
    });

    const passwordForm = container.querySelector('#config-password-form');
    passwordForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const actual = String(passwordForm.querySelector('#config-pass-actual')?.value || '');
      const nueva = String(passwordForm.querySelector('#config-pass-nueva')?.value || '');
      const confirmar = String(passwordForm.querySelector('#config-pass-confirmar')?.value || '');
      if (nueva !== confirmar) {
        UI.toast('La confirmación de la nueva contraseña no coincide.', 'warning');
        return;
      }
      try {
        window.NFCReader.cambiarPassword(emp.id, actual, nueva);
        passwordForm.reset();
        UI.toast('Contraseña actualizada correctamente.', 'success');
      } catch (error) {
        UI.toast(error.message || 'No se pudo cambiar la contraseña.', 'warning');
      }
    });

    container.querySelector('[data-config-logout]')?.addEventListener('click', () => {
      if (window.DashboardApp?.logout) window.DashboardApp.logout();
      else window.SessionManager?.logout?.();
    });

    const entornoForm = container.querySelector('#config-entorno-form');
    entornoForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!esDueno) return;
      const datos = new FormData(entornoForm);
      const empresa = String(datos.get('empresa') || '').trim();
      const periodo = String(datos.get('periodoSimulacion') || '').trim();
      const fechaCorte = String(datos.get('fechaCorte') || '').trim();
      const jornada = Number(datos.get('jornadaSemanalHoras'));

      if (empresa.length < 2) {
        UI.toast('Escribe el nombre de la empresa.', 'warning');
        return;
      }
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
        UI.toast('El periodo debe tener el formato AAAA-MM.', 'warning');
        return;
      }
      if (!UI.parseFecha(fechaCorte)) {
        UI.toast('Selecciona una fecha de corte válida.', 'warning');
        return;
      }
      if (!Number.isFinite(jornada) || jornada < 1 || jornada > 60) {
        UI.toast('La jornada semanal debe estar entre 1 y 60 horas.', 'warning');
        return;
      }

      const nuevo = window.NFCReader.actualizarConfig({
        empresa,
        periodoSimulacion: periodo,
        fechaCorte,
        jornadaSemanalHoras: jornada,
        notificaciones: Boolean(datos.get('notificaciones'))
      });
      if (window.DashboardApp) {
        window.DashboardApp.config = nuevo;
        window.DashboardApp.periodo = window.NFCReader.getPeriodoSimulacion();
        window.DashboardApp.renderPeriodoUI?.();
        window.DashboardApp.renderNotificaciones();
      }
      UI.toast('Entorno actualizado. Los módulos ya usan la nueva configuración.', 'success');
      render(container, window.DashboardApp ? window.DashboardApp.crearContexto() : { ...ctx, config: nuevo });
    });

    container.querySelectorAll('[data-tema-global]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const tema = boton.dataset.temaGlobal === 'carbon' ? 'carbon' : 'claro';
        const nuevo = window.NFCReader.actualizarConfig({ tema });
        if (window.DashboardApp) window.DashboardApp.config = nuevo;
        window.ThemeManager?.aplicar(tema);
        UI.toast(`Tema ${tema === 'carbon' ? 'carbón' : 'claro crema'} aplicado`, 'success');
        const actualizado = window.DashboardApp ? window.DashboardApp.crearContexto() : { ...ctx, config: nuevo };
        render(container, actualizado);
      });
    });
  }

  window.DashboardModules.configuracion = {
    titulo: 'Configuración',
    render
  };
})();
