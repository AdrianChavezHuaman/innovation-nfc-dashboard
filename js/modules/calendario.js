/* Módulo Calendario — Bloque 6
   Agenda mensual de reuniones.
   Dueño y Jefatura: crear, editar y eliminar.
   RR.HH.: solo lectura.
*/

(function () {
  'use strict';

  window.DashboardModules = window.DashboardModules || {};

  const ESTADOS = {
    programada: { label: 'Programada', tono: 'accent' },
    finalizada: { label: 'Finalizada', tono: 'neutral' },
    cancelada: { label: 'Cancelada', tono: 'danger' }
  };

  const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const ROLES_INVITABLES = ['dueno', 'jefe', 'rrhh'];

  let limpiarEventos = null;
  let buscarHandler = null;

  function destruirEventos() {
    if (limpiarEventos) {
      limpiarEventos();
      limpiarEventos = null;
    }
  }

  function render(container, ctx) {
    destruirEventos();

    const corteIso = ctx.periodo?.fechaCorte || '2026-10-30';
    const corte = UI.parseFecha(corteIso) || new Date(2026, 9, 30, 12);
    const periodo = String(ctx.periodo?.periodo || '');
    const [periodoAnio, periodoMes] = periodo.split('-').map(Number);
    const anioInicial = periodoAnio || corte.getFullYear();
    const mesInicial = (periodoMes || corte.getMonth() + 1) - 1;

    const state = {
      ctx,
      gestion: ['dueno', 'jefe'].includes(ctx.rol),
      anio: anioInicial,
      mes: mesInicial,
      corteIso,
      corte,
      reuniones: [],
      busqueda: '',
      ultimoFoco: null
    };

    const controller = new AbortController();
    const { signal } = controller;
    const pad2 = (n) => String(n).padStart(2, '0');
    const isoDe = (fecha) => `${fecha.getFullYear()}-${pad2(fecha.getMonth() + 1)}-${pad2(fecha.getDate())}`;
    const capitalizar = (texto) => String(texto || '').replace(/^./, (c) => c.toUpperCase());
    const claveMes = () => `${state.anio}-${pad2(state.mes + 1)}`;
    const mesTitulo = () => `${capitalizar(UI.MESES[state.mes])} ${state.anio}`;

    const cargarReuniones = () => {
      const reader = window.NFCReader;
      let lista = [];
      if (reader) {
        lista = state.gestion
          ? reader.getReuniones()
          : reader.getReunionesParaRol(ctx.rol);
      } else {
        lista = Array.isArray(ctx.reuniones) ? ctx.reuniones.slice() : [];
      }
      return (lista || []).slice().sort((a, b) =>
        String(a.fecha + (a.horaInicio || '')).localeCompare(String(b.fecha + (b.horaInicio || '')))
      );
    };

    state.reuniones = cargarReuniones();

    const estadoDe = (reunion) => ESTADOS[reunion?.estado] || ESTADOS.programada;
    const rangoHora = (reunion) => `${UI.hora12(reunion.horaInicio)} – ${UI.hora12(reunion.horaFin)}`;
    const rolesDe = (reunion) => (reunion.rolesInvitados || [])
      .map((rol) => UI.rolLabel(rol) || rol)
      .filter(Boolean);
    const creadorDe = (reunion) => {
      const empleado = (ctx.empleados || []).find((emp) => emp.id === reunion.creadoPor);
      return empleado?.nombre || 'Equipo de gestión';
    };
    const reunionesDelDia = (fecha) => state.reuniones.filter((reunion) => reunion.fecha === fecha);
    const claveCorte = () => String(state.corteIso).slice(0, 7);

    const normalizarBusqueda = (texto) => String(texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    const coincideBusqueda = (reunion) => {
      const q = normalizarBusqueda(state.busqueda);
      if (!q) return true;
      const texto = normalizarBusqueda([
        reunion.titulo,
        reunion.descripcion,
        reunion.lugar,
        ...(reunion.rolesInvitados || []).map((rol) => UI.rolLabel(rol) || rol)
      ].join(' '));
      return texto.includes(q);
    };

    function renderStats() {
      const el = document.getElementById('calendario-stats');
      if (!el) return;
      const delMes = state.reuniones.filter((reunion) =>
        String(reunion.fecha || '').startsWith(claveMes()) && reunion.estado !== 'cancelada'
      );
      const programadas = delMes.filter((reunion) => (reunion.estado || 'programada') === 'programada').length;
      const finalizadas = delMes.filter((reunion) => reunion.estado === 'finalizada').length;

      el.innerHTML = [
        UI.kpiCard({
          label: 'Reuniones del mes',
          valor: UI.fmtNumero(delMes.length),
          detalle: mesTitulo(),
          tono: 'accent',
          icono: '📅'
        }),
        UI.kpiCard({
          label: 'Programadas',
          valor: UI.fmtNumero(programadas),
          detalle: 'Pendientes en la agenda',
          tono: 'warning',
          icono: '🕘'
        }),
        UI.kpiCard({
          label: 'Finalizadas',
          valor: UI.fmtNumero(finalizadas),
          detalle: 'Cerradas en el mes',
          tono: 'success',
          icono: '✅'
        })
      ].join('');
    }

    function renderCabeceraMes() {
      const tituloEl = document.getElementById('calendario-mes');
      const subEl = document.getElementById('calendario-mes-sub');
      if (tituloEl) tituloEl.textContent = mesTitulo();
      if (subEl) {
        subEl.textContent = claveMes() === claveCorte()
          ? `Periodo activo · corte ${UI.fechaCorta(state.corteIso)}`
          : `Vista de agenda · corte ${UI.fechaCorta(state.corteIso)}`;
      }
    }

    function eventoHTML(reunion) {
      const estado = estadoDe(reunion);
      return `
        <button type="button" class="calendario-evento estado-${estado.label.toLowerCase()}" data-cal-ver="${UI.esc(reunion.id)}"
          title="${UI.esc(reunion.titulo)} · ${UI.esc(rangoHora(reunion))}">
          <span class="calendario-evento-hora">${UI.esc(UI.hora12(reunion.horaInicio))}</span>
          <span class="calendario-evento-titulo">${UI.esc(reunion.titulo)}</span>
        </button>
      `;
    }

    function renderCalendario() {
      const grid = document.getElementById('calendario-grid');
      if (!grid) return;

      const primerDia = new Date(state.anio, state.mes, 1, 12);
      const desplazamiento = (primerDia.getDay() + 6) % 7;
      const inicio = new Date(state.anio, state.mes, 1 - desplazamiento, 12);
      const diasDelMes = new Date(state.anio, state.mes + 1, 0, 12).getDate();
      const totalCeldas = Math.ceil((desplazamiento + diasDelMes) / 7) * 7;
      const celdas = [];

      for (let i = 0; i < totalCeldas; i++) {
        const fecha = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i, 12);
        const iso = isoDe(fecha);
        const esDelMes = fecha.getMonth() === state.mes && fecha.getFullYear() === state.anio;
        const esCorte = iso === state.corteIso;
        const eventos = reunionesDelDia(iso).filter(coincideBusqueda);
        // El mes conserva su lectura limpia; los días vecinos solo se
        // muestran como referencia y sus eventos aparecen al abrirlos.
        const visibles = esDelMes ? eventos.slice(0, 2) : [];
        const restantes = esDelMes ? Math.max(0, eventos.length - visibles.length) : 0;
        const etiqueta = `${capitalizar(UI.fechaLarga(iso))} · ${eventos.length} ${eventos.length === 1 ? 'reunión' : 'reuniones'}`;

        celdas.push(`
          <div class="calendario-dia ${esDelMes ? '' : 'is-fuera'} ${esCorte ? 'is-corte' : ''}"
            data-cal-dia="${iso}" tabindex="0" role="button"
            aria-label="${UI.esc(etiqueta)}">
            <div class="calendario-dia-top">
              <span class="calendario-dia-numero">${fecha.getDate()}</span>
              ${esCorte ? '<span class="calendario-corte-tag">Corte</span>' : ''}
            </div>
            <div class="calendario-dia-eventos">
              ${visibles.map((reunion) => eventoHTML(reunion)).join('')}
              ${restantes ? `<span class="calendario-mas">+${restantes} más</span>` : ''}
            </div>
          </div>
        `);
      }

      grid.innerHTML = celdas.join('');
    }

    function renderAgenda() {
      const el = document.getElementById('calendario-agenda');
      const countEl = document.getElementById('calendario-agenda-count');
      if (!el) return;

      const proximas = state.reuniones
        .filter((reunion) => reunion.estado !== 'cancelada' && String(reunion.fecha) >= state.corteIso && coincideBusqueda(reunion))
        .sort((a, b) => String(a.fecha + (a.horaInicio || '')).localeCompare(String(b.fecha + (b.horaInicio || ''))));

      if (countEl) countEl.textContent = String(proximas.length);

      if (!proximas.length) {
        el.innerHTML = `
          <div class="calendario-empty">
            <span aria-hidden="true">${state.busqueda ? '🔎' : '📅'}</span>
            <strong>${state.busqueda ? 'Sin coincidencias' : 'Sin reuniones próximas'}</strong>
            <small>${state.busqueda ? `No hay reuniones próximas para “${UI.esc(state.busqueda)}”.` : 'La agenda desde el corte está despejada.'}</small>
          </div>
        `;
        return;
      }

      el.innerHTML = proximas.slice(0, 5).map((reunion) => {
        const fecha = UI.parseFecha(reunion.fecha);
        const estado = estadoDe(reunion);
        return `
          <button type="button" class="calendario-agenda-item" data-cal-ver="${UI.esc(reunion.id)}">
            <span class="calendario-agenda-fecha" aria-hidden="true">
              <strong>${fecha ? fecha.getDate() : '—'}</strong>
              <span>${fecha ? UI.MESES_CORTOS[fecha.getMonth()] : ''}</span>
            </span>
            <span class="calendario-agenda-copy">
              <strong>${UI.esc(reunion.titulo)}</strong>
              <small>${UI.esc(UI.hora12(reunion.horaInicio))} · ${UI.esc(reunion.lugar || 'Sin lugar')}</small>
              <span class="calendario-agenda-roles">${UI.esc(rolesDe(reunion).join(' · '))}</span>
            </span>
            ${UI.badge(estado.label, estado.tono)}
          </button>
        `;
      }).join('');
    }

    function renderTodo() {
      renderStats();
      renderCabeceraMes();
      renderCalendario();
      renderAgenda();
    }

    /* ---------- Modal ---------- */

    const modalHTML = ({ eyebrow, titulo, body, footer = '' }) => `
      <div class="modal-header">
        <div>
          <span class="modal-eyebrow">${UI.esc(eyebrow)}</span>
          <h2>${UI.esc(titulo)}</h2>
        </div>
        <button type="button" class="modal-close" data-cal-close aria-label="Cerrar">✕</button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="calendario-modal-actions">${footer}</div>` : ''}
    `;

    function abrirModal(contenido, claseExtra = '') {
      const modal = document.getElementById('calendario-modal');
      const card = document.getElementById('calendario-modal-card');
      if (!modal || !card) return;
      if (modal.hidden) state.ultimoFoco = document.activeElement;
      card.className = `modal-card modal-calendario ${claseExtra}`.trim();
      card.innerHTML = contenido;
      modal.hidden = false;
      modal.classList.remove('oculto');
      document.body.classList.add('modal-open');
      requestAnimationFrame(() => card.querySelector('.modal-close')?.focus());
    }

    function cerrarModal() {
      const modal = document.getElementById('calendario-modal');
      const card = document.getElementById('calendario-modal-card');
      if (!modal || !card) return;
      modal.hidden = true;
      modal.classList.add('oculto');
      card.innerHTML = '';
      document.body.classList.remove('modal-open');
      const foco = state.ultimoFoco;
      state.ultimoFoco = null;
      if (foco && foco.isConnected) foco.focus();
    }

    function abrirDia(fecha) {
      const parsed = UI.parseFecha(fecha);
      if (!parsed) return;
      if (parsed.getFullYear() !== state.anio || parsed.getMonth() !== state.mes) {
        state.anio = parsed.getFullYear();
        state.mes = parsed.getMonth();
        renderTodo();
      }
      const eventos = reunionesDelDia(fecha);
      const body = eventos.length
        ? `<div class="calendario-dia-lista">
            ${eventos.map((reunion) => {
              const estado = estadoDe(reunion);
              return `
                <button type="button" class="calendario-dia-evento" data-cal-ver="${UI.esc(reunion.id)}">
                  <span class="calendario-dia-evento-hora">${UI.esc(rangoHora(reunion))}</span>
                  <span class="calendario-dia-evento-copy">
                    <strong>${UI.esc(reunion.titulo)}</strong>
                    <small>${UI.esc(reunion.lugar || 'Sin lugar')} · ${UI.esc(rolesDe(reunion).join(' · '))}</small>
                  </span>
                  ${UI.badge(estado.label, estado.tono)}
                </button>
              `;
            }).join('')}
          </div>`
        : `<div class="calendario-dia-vacio">
            <span aria-hidden="true">🗓️</span>
            <strong>Sin reuniones este día</strong>
            <small>${state.gestion ? 'Puedes crear una reunión para esta fecha.' : 'No hay actividad programada.'}</small>
          </div>`;

      const footer = `
        <button type="button" class="btn btn-secondary" data-cal-close>Cerrar</button>
        ${state.gestion ? `<button type="button" class="btn btn-primary" data-cal-nueva-dia="${UI.esc(fecha)}">Nueva reunión</button>` : ''}
      `;
      abrirModal(modalHTML({
        eyebrow: 'Agenda del día',
        titulo: capitalizar(UI.fechaLarga(fecha)),
        body,
        footer
      }), 'modal-calendario-ancho');
    }

    function abrirFormulario(reunion = null, fechaSugerida = '') {
      if (!state.gestion) return;
      const esEdicion = Boolean(reunion?.id);
      const fechaDefault = reunion?.fecha
        || fechaSugerida
        || (claveMes() === claveCorte() ? state.corteIso : `${state.anio}-${pad2(state.mes + 1)}-01`);
      const roles = new Set(reunion?.rolesInvitados || ROLES_INVITABLES);
      const estadoActual = reunion?.estado || 'programada';

      const body = `
        <form id="calendario-form" class="calendario-form" data-reunion-id="${UI.esc(reunion?.id || '')}" novalidate>
          <div class="form-group">
            <label class="form-label" for="cal-titulo">Título</label>
            <input class="form-input" id="cal-titulo" name="titulo" type="text" maxlength="80" required
              placeholder="Ej. Comité de gerencia" value="${UI.esc(reunion?.titulo || '')}">
          </div>
          <div class="form-group">
            <label class="form-label" for="cal-descripcion">Descripción</label>
            <textarea class="form-input" id="cal-descripcion" name="descripcion" rows="3"
              placeholder="Temas a tratar, objetivos o notas para los invitados.">${UI.esc(reunion?.descripcion || '')}</textarea>
          </div>
          <div class="calendario-form-row">
            <div class="form-group">
              <label class="form-label" for="cal-fecha">Fecha</label>
              <input class="form-input" id="cal-fecha" name="fecha" type="date" required value="${UI.esc(fechaDefault)}">
            </div>
            <div class="form-group">
              <label class="form-label" for="cal-lugar">Lugar</label>
              <input class="form-input" id="cal-lugar" name="lugar" type="text" maxlength="60" required
                placeholder="Sala de reuniones" value="${UI.esc(reunion?.lugar || 'Sala de reuniones')}">
            </div>
          </div>
          <div class="calendario-form-row calendario-form-row-3">
            <div class="form-group">
              <label class="form-label" for="cal-inicio">Hora inicio</label>
              <input class="form-input" id="cal-inicio" name="horaInicio" type="time" required value="${UI.esc(reunion?.horaInicio || '09:00')}">
            </div>
            <div class="form-group">
              <label class="form-label" for="cal-fin">Hora fin</label>
              <input class="form-input" id="cal-fin" name="horaFin" type="time" required value="${UI.esc(reunion?.horaFin || '10:00')}">
            </div>
            <div class="form-group">
              <label class="form-label" for="cal-estado">Estado</label>
              <select class="form-input" id="cal-estado" name="estado">
                ${Object.entries(ESTADOS).map(([clave, valor]) => `
                  <option value="${clave}" ${estadoActual === clave ? 'selected' : ''}>${valor.label}</option>
                `).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <span class="form-label">Roles invitados</span>
            <div class="calendario-role-grid">
              ${ROLES_INVITABLES.map((rol) => `
                <label class="calendario-role-option">
                  <input type="checkbox" name="roles" value="${rol}" ${roles.has(rol) ? 'checked' : ''}>
                  <span>${UI.esc(UI.rolLabel(rol))}</span>
                </label>
              `).join('')}
            </div>
            <small class="calendario-form-hint">Los roles marcados verán la reunión en su Panel y en la campana del topbar.</small>
          </div>
          <p id="calendario-form-error" class="calendario-form-error" hidden></p>
          <div class="calendario-modal-actions">
            <button type="button" class="btn btn-secondary" data-cal-close>Cancelar</button>
            <button type="submit" class="btn btn-primary">${esEdicion ? 'Guardar cambios' : 'Crear reunión'}</button>
          </div>
        </form>
      `;

      abrirModal(modalHTML({
        eyebrow: esEdicion ? 'Editar reunión' : 'Nueva reunión',
        titulo: esEdicion ? reunion.titulo : 'Agenda una reunión',
        body
      }), 'modal-calendario-ancho');
    }

    function abrirDetalle(id) {
      const reunion = state.reuniones.find((item) => item.id === id);
      if (!reunion) return;
      const estado = estadoDe(reunion);
      const fecha = UI.parseFecha(reunion.fecha);
      const body = `
        <div class="calendario-detalle-hero">
          <div class="calendario-detalle-fecha" aria-hidden="true">
            <strong>${fecha ? fecha.getDate() : '—'}</strong>
            <span>${fecha ? UI.MESES_CORTOS[fecha.getMonth()] : ''}</span>
          </div>
          <div class="calendario-detalle-copy">
            ${UI.badge(estado.label, estado.tono)}
            <p class="calendario-detalle-hora">${UI.esc(rangoHora(reunion))}</p>
            <p class="calendario-detalle-lugar">📍 ${UI.esc(reunion.lugar || 'Sin lugar')}</p>
          </div>
        </div>
        <dl class="calendario-detalle-grid">
          <div><dt>Fecha</dt><dd>${UI.esc(capitalizar(UI.fechaLarga(reunion.fecha)))}</dd></div>
          <div><dt>Creada por</dt><dd>${UI.esc(creadorDe(reunion))}</dd></div>
          <div class="calendario-detalle-full"><dt>Roles invitados</dt><dd class="calendario-detalle-roles">
            ${rolesDe(reunion).map((rol) => `<span class="calendario-role-chip">${UI.esc(rol)}</span>`).join('') || '—'}
          </dd></div>
          <div class="calendario-detalle-full"><dt>Descripción</dt><dd>${UI.esc(reunion.descripcion || 'Sin descripción adicional.')}</dd></div>
        </dl>
      `;
      const footer = `
        <button type="button" class="btn btn-secondary" data-cal-close>Cerrar</button>
        ${state.gestion ? `
          <button type="button" class="btn btn-ghost" data-cal-editar="${UI.esc(reunion.id)}">Editar</button>
          <button type="button" class="btn btn-ghost calendario-btn-danger" data-cal-eliminar="${UI.esc(reunion.id)}">Eliminar</button>
        ` : ''}
      `;
      abrirModal(modalHTML({
        eyebrow: 'Detalle de la reunión',
        titulo: reunion.titulo,
        body,
        footer
      }), 'modal-calendario-ancho');
    }

    function abrirConfirmacion(id) {
      const reunion = state.reuniones.find((item) => item.id === id);
      if (!reunion) return;
      const body = `
        <div class="calendario-confirm">
          <span class="calendario-confirm-icon" aria-hidden="true">🗑️</span>
          <h3>¿Eliminar esta reunión?</h3>
          <p><strong>${UI.esc(reunion.titulo)}</strong> se quitará de la agenda y del Panel de los roles invitados.</p>
        </div>
      `;
      const footer = `
        <button type="button" class="btn btn-secondary" data-cal-close>Cancelar</button>
        <button type="button" class="btn btn-ghost calendario-btn-danger" data-cal-eliminar-confirmar="${UI.esc(reunion.id)}">Sí, eliminar</button>
      `;
      abrirModal(modalHTML({
        eyebrow: 'Confirmar eliminación',
        titulo: 'Eliminar reunión',
        body,
        footer
      }));
    }

    function mostrarErrorFormulario(form, mensaje) {
      const error = form.querySelector('#calendario-form-error');
      if (!error) return;
      error.textContent = mensaje;
      error.hidden = false;
      error.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    }

    function guardarFormulario(form) {
      if (!state.gestion) return;
      const datos = new FormData(form);
      const titulo = String(datos.get('titulo') || '').trim();
      const descripcion = String(datos.get('descripcion') || '').trim();
      const fecha = String(datos.get('fecha') || '').trim();
      const lugar = String(datos.get('lugar') || '').trim();
      const horaInicio = String(datos.get('horaInicio') || '').trim();
      const horaFin = String(datos.get('horaFin') || '').trim();
      const estado = String(datos.get('estado') || 'programada');
      const roles = [...new Set(datos.getAll('roles').map(String))].filter((rol) => ROLES_INVITABLES.includes(rol));

      if (titulo.length < 3) return mostrarErrorFormulario(form, 'El título debe tener al menos 3 caracteres.');
      if (!UI.parseFecha(fecha)) return mostrarErrorFormulario(form, 'Selecciona una fecha válida.');
      if (!lugar) return mostrarErrorFormulario(form, 'Indica el lugar de la reunión.');
      if (!horaInicio || !horaFin) return mostrarErrorFormulario(form, 'Completa la hora de inicio y de fin.');
      if (horaFin <= horaInicio) return mostrarErrorFormulario(form, 'La hora de fin debe ser posterior a la hora de inicio.');
      if (!roles.length) return mostrarErrorFormulario(form, 'Selecciona al menos un rol invitado.');
      if (!ESTADOS[estado]) return mostrarErrorFormulario(form, 'Selecciona un estado válido.');

      const id = form.dataset.reunionId;
      try {
        if (id) {
          const actualizada = window.NFCReader.actualizarReunion(id, {
            titulo, descripcion, fecha, lugar, horaInicio, horaFin, estado, rolesInvitados: roles
          });
          if (!actualizada) throw new Error('La reunión ya no existe.');
          UI.toast('Reunión actualizada', 'success');
        } else {
          window.NFCReader.crearReunion({
            titulo,
            descripcion,
            fecha,
            lugar,
            horaInicio,
            horaFin,
            estado,
            rolesInvitados: roles,
            creadoPor: ctx.empleado?.id || ctx.user?.empleadoId || ''
          });
          UI.toast(`Reunión creada · ${roles.length} ${roles.length === 1 ? 'rol invitado' : 'roles invitados'}`, 'success');
        }

        state.reuniones = cargarReuniones();
        const fechaGuardada = UI.parseFecha(fecha);
        if (fechaGuardada) {
          state.anio = fechaGuardada.getFullYear();
          state.mes = fechaGuardada.getMonth();
        }
        cerrarModal();
        renderTodo();
        if (window.DashboardApp?.refrescarReuniones) window.DashboardApp.refrescarReuniones();
      } catch (error) {
        mostrarErrorFormulario(form, error.message || 'No se pudo guardar la reunión.');
      }
    }

    function eliminarReunion(id) {
      if (!state.gestion) return;
      const reunion = state.reuniones.find((item) => item.id === id);
      window.NFCReader.eliminarReunion(id);
      state.reuniones = cargarReuniones();
      cerrarModal();
      renderTodo();
      if (window.DashboardApp?.refrescarReuniones) window.DashboardApp.refrescarReuniones();
      UI.toast(`Reunión eliminada${reunion ? `: ${reunion.titulo}` : ''}`, 'warning');
    }

    /* ---------- HTML inicial ---------- */

    const iconoLectura = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

    container.innerHTML = `
      ${UI.pageHeader({
        eyebrow: 'Calendario',
        titulo: 'Agenda del equipo',
        descripcion: state.gestion
          ? 'Organiza reuniones y comparte la agenda con los roles del proyecto.'
          : 'Consulta las reuniones programadas para tu rol. La gestión está reservada a Jefatura y Dueño.'
      })}

      <section id="calendario-stats" class="kpi-grid kpi-grid-3" aria-label="Resumen del mes"></section>

      <section class="calendario-layout">
        <div class="calendario-main">
          <div class="calendario-toolbar">
            <div class="calendario-month-nav" role="group" aria-label="Navegación por mes">
              <button type="button" class="calendario-nav-btn" data-cal-nav="prev" aria-label="Mes anterior">‹</button>
              <div class="calendario-month-copy">
                <h2 id="calendario-mes">—</h2>
                <span id="calendario-mes-sub">—</span>
              </div>
              <button type="button" class="calendario-nav-btn" data-cal-nav="next" aria-label="Mes siguiente">›</button>
              <button type="button" class="btn btn-ghost btn-sm calendario-corte-btn" data-cal-nav="corte">Mes del corte</button>
            </div>
            <div class="calendario-toolbar-actions">
              ${state.gestion
                ? '<button type="button" class="btn btn-primary btn-sm" data-cal-nueva>＋ Nueva reunión</button>'
                : `<span class="calendario-readonly">${iconoLectura} Solo lectura</span>`}
            </div>
          </div>

          <div class="calendario-card">
            <div class="calendario-weekdays" aria-hidden="true">
              ${DIAS_SEMANA.map((dia) => `<span>${dia}</span>`).join('')}
            </div>
            <div id="calendario-grid" class="calendario-grid" role="group" aria-label="Calendario mensual de reuniones"></div>
            <div class="calendario-legend" aria-label="Leyenda">
              <span><i class="calendario-legend-dot is-programada"></i> Programada</span>
              <span><i class="calendario-legend-dot is-finalizada"></i> Finalizada</span>
              <span><i class="calendario-legend-dot is-cancelada"></i> Cancelada</span>
              <span><i class="calendario-legend-dot is-corte"></i> Día de corte</span>
            </div>
          </div>
        </div>

        <aside class="calendario-side" aria-label="Próximas reuniones">
          <div class="calendario-side-head">
            <div>
              <h3>Próximas reuniones</h3>
              <p>Desde el corte del periodo</p>
            </div>
            <span id="calendario-agenda-count" class="calendario-count">0</span>
          </div>
          <div id="calendario-agenda" class="calendario-agenda"></div>
          <div class="calendario-note">
            <span aria-hidden="true">🔔</span>
            Las reuniones nuevas aparecen en la campana del topbar de los roles invitados.
          </div>
        </aside>
      </section>

      <div class="modal-overlay oculto" id="calendario-modal" hidden>
        <div class="modal-card modal-calendario" id="calendario-modal-card" role="dialog" aria-modal="true" aria-label="Calendario"></div>
      </div>
    `;

    const modalEl = document.getElementById('calendario-modal');

    /* ---------- Eventos ---------- */

    container.addEventListener('click', (e) => {
      if (e.target.closest('#calendario-modal')) return;
      const nav = e.target.closest('[data-cal-nav]');
      if (nav) {
        const accion = nav.dataset.calNav;
        if (accion === 'corte') {
          state.anio = state.corte.getFullYear();
          state.mes = state.corte.getMonth();
        } else {
          const fecha = new Date(state.anio, state.mes + (accion === 'next' ? 1 : -1), 1, 12);
          state.anio = fecha.getFullYear();
          state.mes = fecha.getMonth();
        }
        renderTodo();
        return;
      }

      const nueva = e.target.closest('[data-cal-nueva]');
      if (nueva) {
        abrirFormulario();
        return;
      }

      const ver = e.target.closest('[data-cal-ver]');
      if (ver) {
        abrirDetalle(ver.dataset.calVer);
        return;
      }

      const dia = e.target.closest('[data-cal-dia]');
      if (dia) abrirDia(dia.dataset.calDia);
    }, { signal });

    container.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const dia = e.target.closest('[data-cal-dia]');
      if (!dia || e.target !== dia) return;
      e.preventDefault();
      abrirDia(dia.dataset.calDia);
    }, { signal });

    modalEl?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target === modalEl) {
        cerrarModal();
        return;
      }
      if (e.target.closest('[data-cal-close]')) {
        cerrarModal();
        return;
      }
      const ver = e.target.closest('[data-cal-ver]');
      if (ver) {
        abrirDetalle(ver.dataset.calVer);
        return;
      }
      const nuevaDia = e.target.closest('[data-cal-nueva-dia]');
      if (nuevaDia) {
        abrirFormulario(null, nuevaDia.dataset.calNuevaDia);
        return;
      }
      const editar = e.target.closest('[data-cal-editar]');
      if (editar) {
        const reunion = state.reuniones.find((item) => item.id === editar.dataset.calEditar);
        if (reunion) abrirFormulario(reunion);
        return;
      }
      const eliminar = e.target.closest('[data-cal-eliminar]');
      if (eliminar) {
        abrirConfirmacion(eliminar.dataset.calEliminar);
        return;
      }
      const confirmar = e.target.closest('[data-cal-eliminar-confirmar]');
      if (confirmar) eliminarReunion(confirmar.dataset.calEliminarConfirmar);
    }, { signal });

    modalEl?.addEventListener('submit', (e) => {
      if (e.target?.id !== 'calendario-form') return;
      e.preventDefault();
      guardarFormulario(e.target);
    }, { signal });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalEl && !modalEl.hidden) cerrarModal();
    }, { signal });

    buscarHandler = (valor) => {
      state.busqueda = String(valor || '').trim();
      if (state.busqueda) {
        const hayEnMes = state.reuniones.some((reunion) =>
          String(reunion.fecha || '').startsWith(claveMes()) && coincideBusqueda(reunion)
        );
        if (!hayEnMes) {
          const primera = state.reuniones
            .filter(coincideBusqueda)
            .sort((a, b) => String(a.fecha + (a.horaInicio || '')).localeCompare(String(b.fecha + (b.horaInicio || ''))))[0];
          const fecha = UI.parseFecha(primera?.fecha);
          if (fecha) {
            state.anio = fecha.getFullYear();
            state.mes = fecha.getMonth();
          }
        }
      }
      renderTodo();
    };

    renderTodo();

    limpiarEventos = () => {
      controller.abort();
      if (modalEl && !modalEl.hidden) {
        modalEl.hidden = true;
        modalEl.classList.add('oculto');
        document.body.classList.remove('modal-open');
      }
    };
  }

  window.DashboardModules.calendario = {
    titulo: 'Calendario',
    render,
    onSearch(valor) {
      if (buscarHandler) buscarHandler(valor);
    },
    onUnload() {
      buscarHandler = null;
      destruirEventos();
    }
  };
})();
