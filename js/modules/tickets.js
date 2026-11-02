/* Módulo Tickets — Bloque 7
   Bandeja de soporte del Dueño.
   Los tickets llegan desde el login y desde Configuración.
*/

(function () {
  'use strict';

  window.DashboardModules = window.DashboardModules || {};

  const ESTADOS = {
    abierto: { label: 'Abierto', tono: 'warning' },
    en_proceso: { label: 'En proceso', tono: 'accent' },
    resuelto: { label: 'Resuelto', tono: 'success' }
  };

  const PRIORIDADES = {
    alta: { label: 'Alta', tono: 'danger' },
    media: { label: 'Media', tono: 'warning' },
    baja: { label: 'Baja', tono: 'neutral' }
  };

  const ORIGENES = {
    login: { label: 'Login', tono: 'neutral' },
    configuracion: { label: 'Configuración', tono: 'accent' }
  };

  let limpiarEventos = null;

  function destruirEventos() {
    if (limpiarEventos) {
      limpiarEventos();
      limpiarEventos = null;
    }
  }

  function render(container, ctx) {
    destruirEventos();

    const state = {
      ctx,
      tickets: [],
      filtros: { busqueda: '', estado: '', origen: '', prioridad: '' },
      ultimoFoco: null
    };

    const controller = new AbortController();
    const { signal } = controller;

    const cargarTickets = () => {
      const lista = window.NFCReader?.getTickets?.() || ctx.tickets || [];
      return (lista || []).slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    };

    state.tickets = cargarTickets();

    const estadoDe = (ticket) => ESTADOS[ticket?.estado] || ESTADOS.abierto;
    const prioridadDe = (ticket) => PRIORIDADES[ticket?.prioridad] || PRIORIDADES.media;
    const origenDe = (ticket) => ORIGENES[ticket?.origen] || { label: ticket?.origen || 'Otro', tono: 'neutral' };

    const horaDeTicket = (fecha) => {
      const match = String(fecha || '').match(/T(\d{2}):(\d{2})/);
      return match ? UI.hora12(`${match[1]}:${match[2]}`) : '';
    };

    const fechaHoraDeTicket = (fecha) => {
      if (!fecha) return '—';
      const hora = horaDeTicket(fecha);
      return `${UI.fechaCorta(String(fecha).slice(0, 10))}${hora ? ` · ${hora}` : ''}`;
    };

    const aplicarFiltros = () => {
      const q = state.filtros.busqueda.trim().toLowerCase();
      return state.tickets.filter((ticket) => {
        if (state.filtros.estado && ticket.estado !== state.filtros.estado) return false;
        if (state.filtros.origen && ticket.origen !== state.filtros.origen) return false;
        if (state.filtros.prioridad && ticket.prioridad !== state.filtros.prioridad) return false;
        if (q) {
          const texto = `${ticket.id} ${ticket.nombre} ${ticket.email} ${ticket.asunto} ${ticket.mensaje}`.toLowerCase();
          if (!texto.includes(q)) return false;
        }
        return true;
      });
    };

    function renderStats() {
      const el = document.getElementById('tickets-stats');
      if (!el) return;
      const abiertos = state.tickets.filter((t) => t.estado === 'abierto').length;
      const enProceso = state.tickets.filter((t) => t.estado === 'en_proceso').length;
      const resueltos = state.tickets.filter((t) => t.estado === 'resuelto').length;

      el.innerHTML = [
        UI.kpiCard({
          label: 'Abiertos',
          valor: UI.fmtNumero(abiertos),
          detalle: 'Pendientes de atención',
          tono: 'warning',
          icono: '🔔'
        }),
        UI.kpiCard({
          label: 'En proceso',
          valor: UI.fmtNumero(enProceso),
          detalle: 'En revisión por el Dueño',
          tono: 'accent',
          icono: '⏳'
        }),
        UI.kpiCard({
          label: 'Resueltos',
          valor: UI.fmtNumero(resueltos),
          detalle: 'Cerrados en la bandeja',
          tono: 'success',
          icono: '✅'
        }),
        UI.kpiCard({
          label: 'Total',
          valor: UI.fmtNumero(state.tickets.length),
          detalle: 'Login y Configuración',
          icono: '🎫'
        })
      ].join('');
    }

    function renderTabla() {
      const el = document.getElementById('tickets-tabla-wrap');
      const countEl = document.getElementById('tickets-count');
      if (!el) return;

      const filtrados = aplicarFiltros();
      if (countEl) {
        countEl.textContent = `${filtrados.length} de ${state.tickets.length} tickets`;
      }

      if (!state.tickets.length) {
        el.innerHTML = UI.emptyState('Sin tickets', 'Los tickets de soporte del login y de Configuración aparecerán aquí.', '🎫');
        return;
      }

      if (!filtrados.length) {
        el.innerHTML = `
          ${UI.emptyState('Sin resultados', 'No hay tickets que coincidan con los filtros actuales.', '🔎')}
          <div class="tickets-empty-action">
            <button type="button" class="btn btn-secondary btn-sm" data-ticket-limpiar>Limpiar filtros</button>
          </div>
        `;
        return;
      }

      el.innerHTML = `
        <div class="table-wrap" role="region" aria-label="Bandeja de tickets" tabindex="0">
          <table class="data-table tickets-table">
            <thead>
              <tr>
                <th scope="col">Ticket</th>
                <th scope="col">Origen</th>
                <th scope="col">Asunto</th>
                <th scope="col">Prioridad</th>
                <th scope="col">Estado</th>
                <th scope="col">Fecha</th>
                <th scope="col" class="tickets-action-col">Acción</th>
              </tr>
            </thead>
            <tbody>
              ${filtrados.map((ticket) => {
                const estado = estadoDe(ticket);
                const prioridad = prioridadDe(ticket);
                const origen = origenDe(ticket);
                return `
                  <tr data-ticket-id="${UI.esc(ticket.id)}" tabindex="0" role="button" aria-label="Abrir ticket ${UI.esc(ticket.id)}: ${UI.esc(ticket.asunto)}">
                    <td>
                      <strong class="ticket-id">${UI.esc(ticket.id)}</strong>
                      <small class="ticket-user">${UI.esc(ticket.nombre || '—')}</small>
                    </td>
                    <td>${UI.badge(origen.label, origen.tono)}</td>
                    <td>
                      <strong class="ticket-asunto">${UI.esc(ticket.asunto || 'Sin asunto')}</strong>
                      <small class="ticket-snippet">${UI.esc(UI.acortar(ticket.mensaje || '', 78))}</small>
                    </td>
                    <td>${UI.badge(prioridad.label, prioridad.tono)}</td>
                    <td>${UI.badge(estado.label, estado.tono)}</td>
                    <td>
                      <span class="ticket-fecha">${UI.esc(UI.fechaCorta(String(ticket.fecha || '').slice(0, 10)))}</span>
                      <small class="ticket-hora">${UI.esc(horaDeTicket(ticket.fecha))}</small>
                    </td>
                    <td class="tickets-action-col">
                      <button type="button" class="icon-btn btn-ticket-open" data-ticket-open="${UI.esc(ticket.id)}" aria-label="Ver detalle del ticket ${UI.esc(ticket.id)}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    function renderTodo() {
      renderStats();
      renderTabla();
    }

    /* ---------- Modal ---------- */

    function abrirModal(contenido) {
      const modal = document.getElementById('ticket-modal');
      const card = document.getElementById('ticket-modal-card');
      if (!modal || !card) return;
      if (modal.hidden) state.ultimoFoco = document.activeElement;
      card.innerHTML = contenido;
      modal.hidden = false;
      modal.classList.remove('oculto');
      document.body.classList.add('modal-open');
      requestAnimationFrame(() => card.querySelector('.modal-close')?.focus());
    }

    function cerrarModal() {
      const modal = document.getElementById('ticket-modal');
      const card = document.getElementById('ticket-modal-card');
      if (!modal || !card) return;
      modal.hidden = true;
      modal.classList.add('oculto');
      card.innerHTML = '';
      document.body.classList.remove('modal-open');
      const foco = state.ultimoFoco;
      state.ultimoFoco = null;
      if (foco && foco.isConnected) foco.focus();
    }

    function historialHTML(ticket) {
      const eventos = [];
      if (ticket.fecha) {
        eventos.push({ fecha: ticket.fecha, texto: 'Ticket creado', tipo: 'creado' });
      }
      if (Array.isArray(ticket.historial)) {
        ticket.historial.forEach((item) => {
          if (item?.texto) eventos.push({ fecha: item.fecha, texto: item.texto, tipo: item.tipo || 'cambio' });
        });
      }
      return `
        <div class="ticket-timeline">
          <span class="ticket-timeline-title">Actividad</span>
          ${eventos.map((evento) => `
            <div class="ticket-timeline-item">
              <span class="ticket-timeline-dot ${evento.tipo === 'estado' ? 'is-estado' : ''} ${evento.tipo === 'respuesta' ? 'is-respuesta' : ''}"></span>
              <div>
                <strong>${UI.esc(evento.texto)}</strong>
                <small>${UI.esc(fechaHoraDeTicket(evento.fecha))}</small>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    function abrirDetalle(id) {
      const ticket = state.tickets.find((item) => item.id === id);
      if (!ticket) return;
      const estado = estadoDe(ticket);
      const prioridad = prioridadDe(ticket);
      const origen = origenDe(ticket);
      const actualizado = ticket.actualizadoEn ? `<div><dt>Actualizado</dt><dd>${UI.esc(fechaHoraDeTicket(ticket.actualizadoEn))}</dd></div>` : '';

      const body = `
        <div class="ticket-hero">
          ${UI.avatar(ticket.nombre || 'Soporte', 'ticket-avatar')}
          <div class="ticket-hero-copy">
            <strong>${UI.esc(ticket.nombre || '—')}</strong>
            <small>${UI.esc(ticket.email || 'Sin correo registrado')}</small>
            <span class="ticket-origin">${UI.esc(origen.label)} · ${UI.esc(fechaHoraDeTicket(ticket.fecha))}</span>
          </div>
          <div class="ticket-hero-badges">
            ${UI.badge(prioridad.label, prioridad.tono)}
            ${UI.badge(estado.label, estado.tono)}
          </div>
        </div>

        <div class="ticket-message">
          <span class="ticket-section-label">Mensaje del solicitante</span>
          <p>${UI.esc(ticket.mensaje || 'Sin mensaje adicional.')}</p>
        </div>

        <dl class="ticket-meta-grid">
          <div><dt>Ticket</dt><dd>${UI.esc(ticket.id)}</dd></div>
          <div><dt>Fecha de creación</dt><dd>${UI.esc(fechaHoraDeTicket(ticket.fecha))}</dd></div>
          <div><dt>Origen</dt><dd>${UI.esc(origen.label)}</dd></div>
          ${actualizado}
        </dl>

        <form id="ticket-form" class="ticket-form" data-ticket-id="${UI.esc(ticket.id)}" novalidate>
          <div class="ticket-form-grid">
            <div class="form-group">
              <label class="form-label" for="ticket-estado">Estado</label>
              <select class="form-input" id="ticket-estado" name="estado">
                ${Object.entries(ESTADOS).map(([clave, valor]) => `
                  <option value="${clave}" ${ticket.estado === clave ? 'selected' : ''}>${valor.label}</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="ticket-prioridad">Prioridad</label>
              <select class="form-input" id="ticket-prioridad" name="prioridad">
                ${Object.entries(PRIORIDADES).map(([clave, valor]) => `
                  <option value="${clave}" ${ticket.prioridad === clave ? 'selected' : ''}>${valor.label}</option>
                `).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="ticket-respuesta">Respuesta / nota interna</label>
            <textarea class="form-input" id="ticket-respuesta" name="respuesta" rows="3"
              placeholder="Agrega una respuesta o una nota para el seguimiento.">${UI.esc(ticket.respuesta || '')}</textarea>
            <small class="ticket-form-hint">La respuesta queda guardada en el ticket. Aún no se envía correo automático.</small>
          </div>
          ${historialHTML(ticket)}
          <div class="ticket-modal-actions">
            <button type="button" class="btn btn-secondary" data-ticket-close>Cerrar</button>
            ${ticket.estado !== 'resuelto' ? '<button type="button" class="btn btn-ghost ticket-btn-success" data-ticket-resolver>Marcar resuelto</button>' : ''}
            <button type="submit" class="btn btn-primary">Guardar cambios</button>
          </div>
        </form>
      `;

      abrirModal(`
        <div class="modal-header">
          <div>
            <span class="modal-eyebrow">Bandeja de soporte · ${UI.esc(ticket.id)}</span>
            <h2>${UI.esc(ticket.asunto || 'Ticket de soporte')}</h2>
          </div>
          <button type="button" class="modal-close" data-ticket-close aria-label="Cerrar">✕</button>
        </div>
        <div class="modal-body">${body}</div>
      `);
    }

    function guardarTicket(form) {
      const ticket = state.tickets.find((item) => item.id === form.dataset.ticketId);
      if (!ticket) return;

      const datos = new FormData(form);
      const nuevoEstado = String(datos.get('estado') || 'abierto');
      const nuevaPrioridad = String(datos.get('prioridad') || 'media');
      const nuevaRespuesta = String(datos.get('respuesta') || '').trim();

      if (!ESTADOS[nuevoEstado] || !PRIORIDADES[nuevaPrioridad]) {
        UI.toast('Revisa el estado y la prioridad del ticket.', 'warning');
        return;
      }

      const estadoAnterior = estadoDe(ticket);
      const prioridadAnterior = prioridadDe(ticket);
      const respuestaAnterior = String(ticket.respuesta || '').trim();
      const historial = Array.isArray(ticket.historial) ? [...ticket.historial] : [];
      const ahora = new Date().toISOString();
      let cambios = 0;

      if (nuevoEstado !== ticket.estado) {
        cambios++;
        historial.push({
          fecha: ahora,
          tipo: 'estado',
          texto: `Estado: ${estadoAnterior.label} → ${ESTADOS[nuevoEstado].label}`
        });
      }
      if (nuevaPrioridad !== ticket.prioridad) {
        cambios++;
        historial.push({
          fecha: ahora,
          tipo: 'prioridad',
          texto: `Prioridad: ${prioridadAnterior.label} → ${PRIORIDADES[nuevaPrioridad].label}`
        });
      }
      if (nuevaRespuesta !== respuestaAnterior) {
        cambios++;
        historial.push({
          fecha: ahora,
          tipo: 'respuesta',
          texto: nuevaRespuesta ? 'Respuesta registrada' : 'Respuesta eliminada'
        });
      }

      if (!cambios) {
        UI.toast('No hay cambios para guardar.', 'info');
        return;
      }

      window.NFCReader.actualizarTicket(ticket.id, {
        estado: nuevoEstado,
        prioridad: nuevaPrioridad,
        respuesta: nuevaRespuesta,
        actualizadoEn: ahora,
        historial
      });

      state.tickets = cargarTickets();
      renderTodo();
      abrirDetalle(ticket.id);
      if (window.DashboardApp?.refrescarTickets) window.DashboardApp.refrescarTickets();
      UI.toast('Ticket actualizado correctamente.', 'success');
    }

    /* ---------- HTML inicial ---------- */

    container.innerHTML = `
      ${UI.pageHeader({
        eyebrow: 'Tickets',
        titulo: 'Bandeja de soporte',
        descripcion: 'Gestiona las solicitudes del login y de Configuración. Solo el Dueño accede a esta bandeja.'
      })}

      <section id="tickets-stats" class="kpi-grid kpi-grid-4" aria-label="Resumen de tickets"></section>

      <section class="filters-bar tickets-filters" role="search" aria-label="Filtros de tickets">
        <div class="filters-left">
          <div class="filter-group filter-search">
            <label for="ticket-buscar" class="visually-hidden">Buscar ticket</label>
            <div class="input-con-icono">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="search" id="ticket-buscar" class="filter-input" placeholder="Buscar por ticket, nombre, asunto o correo..." autocomplete="off">
            </div>
          </div>
          <div class="filter-group">
            <label for="ticket-filtro-estado" class="visually-hidden">Estado</label>
            <select id="ticket-filtro-estado" class="filter-select">
              <option value="">Todos los estados</option>
              ${Object.entries(ESTADOS).map(([clave, valor]) => `<option value="${clave}">${valor.label}</option>`).join('')}
            </select>
          </div>
          <div class="filter-group">
            <label for="ticket-filtro-origen" class="visually-hidden">Origen</label>
            <select id="ticket-filtro-origen" class="filter-select">
              <option value="">Todos los orígenes</option>
              ${Object.entries(ORIGENES).map(([clave, valor]) => `<option value="${clave}">${valor.label}</option>`).join('')}
            </select>
          </div>
          <div class="filter-group">
            <label for="ticket-filtro-prioridad" class="visually-hidden">Prioridad</label>
            <select id="ticket-filtro-prioridad" class="filter-select">
              <option value="">Todas las prioridades</option>
              ${Object.entries(PRIORIDADES).map(([clave, valor]) => `<option value="${clave}">${valor.label}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="filters-right">
          <span id="tickets-count" class="tickets-count">0 de 0 tickets</span>
          <button type="button" class="btn btn-ghost btn-sm" data-ticket-limpiar>Limpiar</button>
        </div>
      </section>

      <section id="tickets-tabla-wrap" class="tickets-table-section" aria-live="polite"></section>

      <div class="modal-overlay oculto" id="ticket-modal" hidden>
        <div class="modal-card modal-ticket" id="ticket-modal-card" role="dialog" aria-modal="true" aria-label="Detalle del ticket"></div>
      </div>
    `;

    const modalEl = document.getElementById('ticket-modal');
    const buscarEl = document.getElementById('ticket-buscar');
    const estadoEl = document.getElementById('ticket-filtro-estado');
    const origenEl = document.getElementById('ticket-filtro-origen');
    const prioridadEl = document.getElementById('ticket-filtro-prioridad');

    const actualizarFiltros = () => {
      state.filtros.busqueda = buscarEl?.value || '';
      state.filtros.estado = estadoEl?.value || '';
      state.filtros.origen = origenEl?.value || '';
      state.filtros.prioridad = prioridadEl?.value || '';
      renderTabla();
    };

    const limpiarFiltros = () => {
      state.filtros = { busqueda: '', estado: '', origen: '', prioridad: '' };
      if (buscarEl) buscarEl.value = '';
      if (estadoEl) estadoEl.value = '';
      if (origenEl) origenEl.value = '';
      if (prioridadEl) prioridadEl.value = '';
      renderTabla();
    };

    buscarEl?.addEventListener('input', UI.debounce(actualizarFiltros, 180), { signal });
    [estadoEl, origenEl, prioridadEl].forEach((select) => {
      select?.addEventListener('change', actualizarFiltros, { signal });
    });

    container.addEventListener('click', (e) => {
      if (e.target.closest('#ticket-modal')) return;
      const limpiar = e.target.closest('[data-ticket-limpiar]');
      if (limpiar) {
        limpiarFiltros();
        return;
      }
      const abrir = e.target.closest('[data-ticket-open]');
      const fila = e.target.closest('[data-ticket-id]');
      if (abrir || fila) {
        abrirDetalle(abrir?.dataset.ticketOpen || fila?.dataset.ticketId);
      }
    }, { signal });

    container.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const fila = e.target.closest('[data-ticket-id]');
      if (!fila || e.target !== fila) return;
      e.preventDefault();
      abrirDetalle(fila.dataset.ticketId);
    }, { signal });

    modalEl?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target === modalEl) {
        cerrarModal();
        return;
      }
      if (e.target.closest('[data-ticket-close]')) {
        cerrarModal();
        return;
      }
      const resolver = e.target.closest('[data-ticket-resolver]');
      if (resolver) {
        const form = document.getElementById('ticket-form');
        const select = form?.querySelector('[name="estado"]');
        if (form && select) {
          select.value = 'resuelto';
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      }
    }, { signal });

    modalEl?.addEventListener('submit', (e) => {
      if (e.target?.id !== 'ticket-form') return;
      e.preventDefault();
      guardarTicket(e.target);
    }, { signal });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalEl && !modalEl.hidden) cerrarModal();
    }, { signal });

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

  function onSearch(valor, container) {
    const input = container?.querySelector('#ticket-buscar');
    if (!input) return;
    input.value = String(valor || '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  window.DashboardModules.tickets = {
    titulo: 'Tickets',
    render,
    onSearch,
    onUnload() {
      destruirEventos();
    }
  };
})();
