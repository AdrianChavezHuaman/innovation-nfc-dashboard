/* Módulo Tarjetas NFC — Bloque 7
   Inventario, asignación, bloqueo y permisos de zona.
*/

(function () {
  'use strict';

  window.DashboardModules = window.DashboardModules || {};

  const ESTADOS = {
    activa: { label: 'Activa', tono: 'success' },
    bloqueada: { label: 'Bloqueada', tono: 'danger' }
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
      tarjetas: [],
      filtros: { busqueda: '', estado: '', area: '', asignacion: '' },
      ultimoFoco: null
    };

    const controller = new AbortController();
    const { signal } = controller;

    const cargarTarjetas = () => {
      const lista = window.NFCReader?.getTarjetas?.() || ctx.tarjetas || [];
      return (lista || []).slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));
    };

    state.tarjetas = cargarTarjetas();

    const estadoDe = (tarjeta) => ESTADOS[tarjeta?.estado] || ESTADOS.activa;
    const empleadoDe = (tarjeta) => (ctx.empleados || []).find((emp) => emp.id === tarjeta?.empleadoId) || null;
    const nombreZona = (id) => (ctx.zonas || []).find((zona) => zona.id === id)?.nombre || id;
    const fechaDe = (fecha) => {
      if (!fecha) return '—';
      const hora = String(fecha).match(/T(\d{2}):(\d{2})/);
      if (hora) return `${UI.fechaCorta(String(fecha).slice(0, 10))} · ${UI.hora12(`${hora[1]}:${hora[2]}`)}`;
      return UI.fechaCorta(String(fecha).slice(0, 10));
    };

    const aplicarFiltros = () => {
      const q = state.filtros.busqueda.trim().toLowerCase();
      return state.tarjetas.filter((tarjeta) => {
        const emp = empleadoDe(tarjeta);
        if (state.filtros.estado && tarjeta.estado !== state.filtros.estado) return false;
        if (state.filtros.area && emp?.area !== state.filtros.area) return false;
        if (state.filtros.asignacion === 'asignada' && !emp) return false;
        if (state.filtros.asignacion === 'sin_asignar' && emp) return false;
        if (q) {
          const texto = `${tarjeta.id} ${tarjeta.uid} ${tarjeta.serie} ${emp?.nombre || ''} ${emp?.area || ''}`.toLowerCase();
          if (!texto.includes(q)) return false;
        }
        return true;
      });
    };

    function renderStats() {
      const el = document.getElementById('tarjetas-stats');
      if (!el) return;
      const bloqueadas = state.tarjetas.filter((t) => t.estado === 'bloqueada').length;
      const asignadas = state.tarjetas.filter((t) => Boolean(t.empleadoId)).length;
      const activas = state.tarjetas.filter((t) => t.estado === 'activa').length;

      el.innerHTML = [
        UI.kpiCard({
          label: 'Activas',
          valor: UI.fmtNumero(activas),
          detalle: 'Disponibles para operar',
          tono: 'success',
          icono: '✅'
        }),
        UI.kpiCard({
          label: 'Bloqueadas',
          valor: UI.fmtNumero(bloqueadas),
          detalle: 'Rechazan el acceso',
          tono: 'danger',
          icono: '🔒'
        }),
        UI.kpiCard({
          label: 'Asignadas',
          valor: UI.fmtNumero(asignadas),
          detalle: 'Con colaborador',
          tono: 'accent',
          icono: '👤'
        }),
        UI.kpiCard({
          label: 'Total',
          valor: UI.fmtNumero(state.tarjetas.length),
          detalle: 'Inventario NFC',
          icono: '💳'
        })
      ].join('');
    }

    function renderTabla() {
      const el = document.getElementById('tarjetas-tabla-wrap');
      const countEl = document.getElementById('tarjetas-count');
      if (!el) return;
      const filtradas = aplicarFiltros();
      if (countEl) countEl.textContent = `${filtradas.length} de ${state.tarjetas.length} tarjetas`;

      if (!state.tarjetas.length) {
        el.innerHTML = UI.emptyState('Sin tarjetas', 'El inventario NFC aparecerá aquí.', '💳');
        return;
      }
      if (!filtradas.length) {
        el.innerHTML = `
          ${UI.emptyState('Sin resultados', 'No hay tarjetas que coincidan con los filtros actuales.', '🔎')}
          <div class="tarjetas-empty-action"><button type="button" class="btn btn-secondary btn-sm" data-tarjeta-limpiar>Limpiar filtros</button></div>
        `;
        return;
      }

      el.innerHTML = `
        <div class="table-wrap" role="region" aria-label="Inventario de tarjetas NFC" tabindex="0">
          <table class="data-table tarjetas-table">
            <thead>
              <tr>
                <th scope="col">Tarjeta</th>
                <th scope="col">UID</th>
                <th scope="col">Empleado</th>
                <th scope="col">Zonas</th>
                <th scope="col">Estado</th>
                <th scope="col">Asignación</th>
                <th scope="col" class="tarjetas-action-col">Acción</th>
              </tr>
            </thead>
            <tbody>
              ${filtradas.map((tarjeta) => {
                const emp = empleadoDe(tarjeta);
                const estado = estadoDe(tarjeta);
                const zonas = Array.isArray(tarjeta.zonasPermitidas) ? tarjeta.zonasPermitidas : [];
                return `
                  <tr data-tarjeta-id="${UI.esc(tarjeta.id)}" class="${emp ? '' : 'is-unassigned'} ${tarjeta.estado === 'bloqueada' ? 'is-blocked' : ''}"
                    tabindex="0" role="button" aria-label="Ver tarjeta ${UI.esc(tarjeta.id)}">
                    <td>
                      <strong class="tarjeta-id">${UI.esc(tarjeta.id)}</strong>
                      <small class="tarjeta-serie">${UI.esc(tarjeta.serie || '—')}</small>
                    </td>
                    <td><span class="tarjeta-uid">${UI.esc(tarjeta.uid || '—')}</span></td>
                    <td>
                      ${emp ? `
                        <div class="tarjeta-empleado">
                          ${UI.avatar(emp.nombre, 'avatar-sm')}
                          <span><strong>${UI.esc(emp.nombre)}</strong><small>${UI.esc(emp.area || '—')}</small></span>
                        </div>
                      ` : '<span class="tarjeta-unassigned">Sin asignar</span>'}
                    </td>
                    <td>
                      <span class="tarjeta-zonas-count">${UI.fmtNumero(zonas.length)} ${zonas.length === 1 ? 'zona' : 'zonas'}</span>
                      <small class="tarjeta-zonas-names">${UI.esc(zonas.slice(0, 2).map(nombreZona).join(' · ') || 'Sin permisos')}</small>
                    </td>
                    <td>${UI.badge(estado.label, estado.tono)}</td>
                    <td><span class="tarjeta-fecha">${UI.esc(tarjeta.fechaAsignacion ? UI.fechaCorta(tarjeta.fechaAsignacion) : '—')}</span></td>
                    <td class="tarjetas-action-col">
                      <button type="button" class="icon-btn btn-tarjeta-open" data-tarjeta-open="${UI.esc(tarjeta.id)}" aria-label="Editar tarjeta ${UI.esc(tarjeta.id)}">
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
      const modal = document.getElementById('tarjeta-modal');
      const card = document.getElementById('tarjeta-modal-card');
      if (!modal || !card) return;
      if (modal.hidden) state.ultimoFoco = document.activeElement;
      card.innerHTML = contenido;
      modal.hidden = false;
      modal.classList.remove('oculto');
      document.body.classList.add('modal-open');
      requestAnimationFrame(() => card.querySelector('.modal-close')?.focus());
    }

    function cerrarModal() {
      const modal = document.getElementById('tarjeta-modal');
      const card = document.getElementById('tarjeta-modal-card');
      if (!modal || !card) return;
      modal.hidden = true;
      modal.classList.add('oculto');
      card.innerHTML = '';
      document.body.classList.remove('modal-open');
      const foco = state.ultimoFoco;
      state.ultimoFoco = null;
      if (foco && foco.isConnected) foco.focus();
    }

    function historialHTML(tarjeta) {
      const eventos = [];
      if (tarjeta.fechaAsignacion) {
        eventos.push({ fecha: tarjeta.fechaAsignacion, texto: 'Asignación inicial', tipo: 'asignacion' });
      }
      if (Array.isArray(tarjeta.historial)) {
        tarjeta.historial.forEach((item) => {
          if (item?.texto) eventos.push({ fecha: item.fecha, texto: item.texto, tipo: item.tipo || 'cambio' });
        });
      }
      if (!eventos.length) {
        return '<p class="tarjeta-sin-historial">Sin cambios registrados.</p>';
      }
      return `
        <div class="tarjeta-timeline">
          <span class="tarjeta-timeline-title">Actividad de la tarjeta</span>
          ${eventos.map((evento) => `
            <div class="tarjeta-timeline-item">
              <span class="tarjeta-timeline-dot ${evento.tipo === 'bloqueo' ? 'is-bloqueo' : ''}"></span>
              <div><strong>${UI.esc(evento.texto)}</strong><small>${UI.esc(fechaDe(evento.fecha))}</small></div>
            </div>
          `).join('')}
        </div>
      `;
    }

    function abrirDetalle(id) {
      const tarjeta = state.tarjetas.find((item) => item.id === id);
      if (!tarjeta) return;
      const emp = empleadoDe(tarjeta);
      const estado = estadoDe(tarjeta);
      const zonas = new Set(Array.isArray(tarjeta.zonasPermitidas) ? tarjeta.zonasPermitidas : []);
      const empleados = (ctx.empleados || []).slice().sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));

      const body = `
        <div class="tarjeta-visual" aria-hidden="true">
          <span class="tarjeta-visual-brand">INNOVATION NFC</span>
          <span class="tarjeta-visual-chip"></span>
          <span class="tarjeta-visual-n">N</span>
          <strong>${UI.esc(tarjeta.uid || '—')}</strong>
          <small>${UI.esc(tarjeta.serie || '—')}</small>
        </div>

        <div class="tarjeta-resumen">
          <div>
            <span class="tarjeta-resumen-label">Estado</span>
            ${UI.badge(estado.label, estado.tono)}
          </div>
          <div>
            <span class="tarjeta-resumen-label">Empleado asignado</span>
            <strong>${UI.esc(emp?.nombre || 'Sin asignar')}</strong>
          </div>
          <div>
            <span class="tarjeta-resumen-label">Zonas habilitadas</span>
            <strong>${UI.fmtNumero(zonas.size)} de ${UI.fmtNumero((ctx.zonas || []).length)}</strong>
          </div>
          <div>
            <span class="tarjeta-resumen-label">Alta</span>
            <strong>${UI.esc(tarjeta.fechaAsignacion ? UI.fechaCorta(tarjeta.fechaAsignacion) : '—')}</strong>
          </div>
        </div>

        <form id="tarjeta-form" class="tarjeta-form" data-tarjeta-id="${UI.esc(tarjeta.id)}" novalidate>
          <div class="form-group">
            <label class="form-label" for="tarjeta-empleado">Empleado asignado</label>
            <select class="form-input" id="tarjeta-empleado" name="empleadoId">
              <option value="">Sin asignar</option>
              ${empleados.map((e) => `<option value="${UI.esc(e.id)}" ${e.id === tarjeta.empleadoId ? 'selected' : ''}>${UI.esc(e.nombre)} · ${UI.esc(e.area || '—')}</option>`).join('')}
            </select>
            <small class="tarjeta-form-hint">Al cambiar de empleado se cargan sus permisos de zona por defecto.</small>
          </div>

          <div class="form-group">
            <span class="form-label">Permisos de zona</span>
            <div class="tarjeta-zonas-grid">
              ${(ctx.zonas || []).map((zona) => `
                <label class="tarjeta-zona-option">
                  <input type="checkbox" name="zonas" value="${UI.esc(zona.id)}" ${zonas.has(zona.id) ? 'checked' : ''}>
                  <span>${UI.esc(zona.nombre)}</span>
                </label>
              `).join('')}
            </div>
            <small class="tarjeta-form-hint">El bloqueo de tarjeta y estos permisos se aplican al simulador NFC.</small>
          </div>

          ${historialHTML(tarjeta)}

          <div class="tarjeta-modal-actions">
            <button type="button" class="btn btn-secondary" data-tarjeta-close>Cerrar</button>
            ${tarjeta.estado === 'bloqueada'
              ? '<button type="button" class="btn btn-ghost tarjeta-btn-success" data-tarjeta-accion="desbloquear">Desbloquear tarjeta</button>'
              : '<button type="button" class="btn btn-ghost tarjeta-btn-danger" data-tarjeta-accion="bloquear">Bloquear tarjeta</button>'}
            <button type="submit" class="btn btn-primary">Guardar cambios</button>
          </div>
        </form>
      `;

      abrirModal(`
        <div class="modal-header">
          <div>
            <span class="modal-eyebrow">Tarjeta NFC · ${UI.esc(tarjeta.id)}</span>
            <h2>${UI.esc(emp?.nombre || 'Tarjeta sin asignar')}</h2>
          </div>
          <button type="button" class="modal-close" data-tarjeta-close aria-label="Cerrar">✕</button>
        </div>
        <div class="modal-body">${body}</div>
      `);
    }

    function guardarTarjeta(form) {
      const tarjeta = state.tarjetas.find((item) => item.id === form.dataset.tarjetaId);
      if (!tarjeta) return;
      const datos = new FormData(form);
      const empleadoId = String(datos.get('empleadoId') || '').trim();
      const zonas = [...new Set(datos.getAll('zonas').map(String))];
      const empleadoNuevo = (ctx.empleados || []).find((emp) => emp.id === empleadoId) || null;
      const empleadoAnterior = empleadoDe(tarjeta);
      const zonasAnteriores = [...(tarjeta.zonasPermitidas || [])].sort();
      const zonasNuevas = [...zonas].sort();
      const cambioEmpleado = (tarjeta.empleadoId || '') !== empleadoId;
      const cambioZonas = zonasAnteriores.join('|') !== zonasNuevas.join('|');

      if (!cambioEmpleado && !cambioZonas) {
        UI.toast('No hay cambios para guardar.', 'info');
        return;
      }

      const historial = Array.isArray(tarjeta.historial) ? [...tarjeta.historial] : [];
      const ahora = new Date().toISOString();
      if (cambioEmpleado) {
        historial.push({
          fecha: ahora,
          tipo: 'asignacion',
          texto: empleadoNuevo ? `Asignada a ${empleadoNuevo.nombre}` : 'Tarjeta sin asignar'
        });
      }
      if (cambioZonas) {
        historial.push({
          fecha: ahora,
          tipo: 'permisos',
          texto: `Permisos de zona actualizados (${zonasNuevas.length})`
        });
      }

      window.NFCReader.actualizarTarjeta(tarjeta.id, {
        empleadoId: empleadoId || null,
        zonasPermitidas: zonas,
        fechaAsignacion: cambioEmpleado ? (empleadoNuevo ? ahora.slice(0, 10) : null) : tarjeta.fechaAsignacion,
        actualizadoEn: ahora,
        historial
      });

      state.tarjetas = cargarTarjetas();
      renderTodo();
      abrirDetalle(tarjeta.id);
      if (window.DashboardApp?.refrescarTarjetas) window.DashboardApp.refrescarTarjetas();
      UI.toast('Tarjeta actualizada correctamente.', 'success');
    }

    function abrirConfirmacion(id, accion) {
      const tarjeta = state.tarjetas.find((item) => item.id === id);
      if (!tarjeta) return;
      const esBloqueo = accion === 'bloquear';
      const body = `
        <div class="tarjeta-confirm">
          <span class="tarjeta-confirm-icon" aria-hidden="true">${esBloqueo ? '🔒' : '🔓'}</span>
          <h3>${esBloqueo ? '¿Bloquear esta tarjeta?' : '¿Desbloquear esta tarjeta?'}</h3>
          <p>${esBloqueo
            ? `La tarjeta <strong>${UI.esc(tarjeta.id)}</strong> dejará de permitir accesos hasta que la desbloquees.`
            : `La tarjeta <strong>${UI.esc(tarjeta.id)}</strong> volverá a aceptar accesos según sus permisos.`}</p>
        </div>
      `;
      abrirModal(`
        <div class="modal-header">
          <div><span class="modal-eyebrow">Control de tarjeta</span><h2>${esBloqueo ? 'Bloquear tarjeta' : 'Desbloquear tarjeta'}</h2></div>
          <button type="button" class="modal-close" data-tarjeta-close aria-label="Cerrar">✕</button>
        </div>
        <div class="modal-body">${body}</div>
        <div class="tarjeta-modal-actions">
          <button type="button" class="btn btn-secondary" data-tarjeta-close>Cancelar</button>
          <button type="button" class="btn ${esBloqueo ? 'btn-ghost tarjeta-btn-danger' : 'btn-ghost tarjeta-btn-success'}" data-tarjeta-confirmar="${accion}" data-tarjeta-id="${UI.esc(tarjeta.id)}">
            ${esBloqueo ? 'Sí, bloquear' : 'Sí, desbloquear'}
          </button>
        </div>
      `);
    }

    function cambiarEstadoTarjeta(id, accion) {
      const tarjeta = state.tarjetas.find((item) => item.id === id);
      if (!tarjeta) return;
      const esBloqueo = accion === 'bloquear';
      const nuevoEstado = esBloqueo ? 'bloqueada' : 'activa';
      const historial = Array.isArray(tarjeta.historial) ? [...tarjeta.historial] : [];
      historial.push({
        fecha: new Date().toISOString(),
        tipo: 'bloqueo',
        texto: esBloqueo ? 'Tarjeta bloqueada' : 'Tarjeta desbloqueada'
      });
      window.NFCReader.actualizarTarjeta(id, { estado: nuevoEstado, historial });
      state.tarjetas = cargarTarjetas();
      renderTodo();
      abrirDetalle(id);
      if (window.DashboardApp?.refrescarTarjetas) window.DashboardApp.refrescarTarjetas();
      UI.toast(esBloqueo ? 'Tarjeta bloqueada.' : 'Tarjeta desbloqueada.', esBloqueo ? 'warning' : 'success');
    }

    /* ---------- HTML inicial ---------- */

    container.innerHTML = `
      ${UI.pageHeader({
        eyebrow: 'Tarjetas NFC',
        titulo: 'Inventario y control',
        descripcion: 'Asigna, bloquea y configura los permisos de las tarjetas del proyecto.'
      })}

      <section id="tarjetas-stats" class="kpi-grid kpi-grid-4" aria-label="Resumen de tarjetas"></section>

      <section class="filters-bar tarjetas-filters" role="search" aria-label="Filtros de tarjetas">
        <div class="filters-left">
          <div class="filter-group filter-search">
            <label for="tarjeta-buscar" class="visually-hidden">Buscar tarjeta</label>
            <div class="input-con-icono">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="search" id="tarjeta-buscar" class="filter-input" placeholder="Buscar por tarjeta, UID, serie o empleado..." autocomplete="off">
            </div>
          </div>
          <div class="filter-group">
            <label for="tarjeta-filtro-estado" class="visually-hidden">Estado</label>
            <select id="tarjeta-filtro-estado" class="filter-select">
              <option value="">Todos los estados</option>
              ${Object.entries(ESTADOS).map(([clave, valor]) => `<option value="${clave}">${valor.label}</option>`).join('')}
            </select>
          </div>
          <div class="filter-group">
            <label for="tarjeta-filtro-area" class="visually-hidden">Área</label>
            <select id="tarjeta-filtro-area" class="filter-select">
              <option value="">Todas las áreas</option>
              ${[...new Set((ctx.empleados || []).map((emp) => emp.area).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')).map((area) => `<option value="${UI.esc(area)}">${UI.esc(area)}</option>`).join('')}
            </select>
          </div>
          <div class="filter-group">
            <label for="tarjeta-filtro-asignacion" class="visually-hidden">Asignación</label>
            <select id="tarjeta-filtro-asignacion" class="filter-select">
              <option value="">Todas las asignaciones</option>
              <option value="asignada">Asignadas</option>
              <option value="sin_asignar">Sin asignar</option>
            </select>
          </div>
        </div>
        <div class="filters-right">
          <span id="tarjetas-count" class="tarjetas-count">0 de 0 tarjetas</span>
          <button type="button" class="btn btn-ghost btn-sm" data-tarjeta-limpiar>Limpiar</button>
        </div>
      </section>

      <section id="tarjetas-tabla-wrap" class="tarjetas-table-section" aria-live="polite"></section>

      <div class="modal-overlay oculto" id="tarjeta-modal" hidden>
        <div class="modal-card modal-tarjeta" id="tarjeta-modal-card" role="dialog" aria-modal="true" aria-label="Detalle de tarjeta NFC"></div>
      </div>
    `;

    const modalEl = document.getElementById('tarjeta-modal');
    const buscarEl = document.getElementById('tarjeta-buscar');
    const estadoEl = document.getElementById('tarjeta-filtro-estado');
    const areaEl = document.getElementById('tarjeta-filtro-area');
    const asignacionEl = document.getElementById('tarjeta-filtro-asignacion');

    const actualizarFiltros = () => {
      state.filtros.busqueda = buscarEl?.value || '';
      state.filtros.estado = estadoEl?.value || '';
      state.filtros.area = areaEl?.value || '';
      state.filtros.asignacion = asignacionEl?.value || '';
      renderTabla();
    };

    const limpiarFiltros = () => {
      state.filtros = { busqueda: '', estado: '', area: '', asignacion: '' };
      if (buscarEl) buscarEl.value = '';
      if (estadoEl) estadoEl.value = '';
      if (areaEl) areaEl.value = '';
      if (asignacionEl) asignacionEl.value = '';
      renderTabla();
    };

    buscarEl?.addEventListener('input', UI.debounce(actualizarFiltros, 180), { signal });
    [estadoEl, areaEl, asignacionEl].forEach((select) => {
      select?.addEventListener('change', actualizarFiltros, { signal });
    });

    container.addEventListener('click', (e) => {
      if (e.target.closest('#tarjeta-modal')) return;
      if (e.target.closest('[data-tarjeta-limpiar]')) {
        limpiarFiltros();
        return;
      }
      const abrir = e.target.closest('[data-tarjeta-open]');
      const fila = e.target.closest('[data-tarjeta-id]');
      if (abrir || fila) abrirDetalle(abrir?.dataset.tarjetaOpen || fila?.dataset.tarjetaId);
    }, { signal });

    container.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const fila = e.target.closest('[data-tarjeta-id]');
      if (!fila || e.target !== fila) return;
      e.preventDefault();
      abrirDetalle(fila.dataset.tarjetaId);
    }, { signal });

    modalEl?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target === modalEl || e.target.closest('[data-tarjeta-close]')) {
        cerrarModal();
        return;
      }
      const accion = e.target.closest('[data-tarjeta-accion]');
      if (accion) {
        const form = document.getElementById('tarjeta-form');
        const id = form?.dataset.tarjetaId;
        if (id) abrirConfirmacion(id, accion.dataset.tarjetaAccion);
        return;
      }
      const confirmar = e.target.closest('[data-tarjeta-confirmar]');
      if (confirmar) {
        cambiarEstadoTarjeta(confirmar.dataset.tarjetaId, confirmar.dataset.tarjetaConfirmar);
      }
    }, { signal });

    modalEl?.addEventListener('change', (e) => {
      if (e.target?.id !== 'tarjeta-empleado') return;
      const form = document.getElementById('tarjeta-form');
      if (!form) return;
      const empleadoId = e.target.value;
      const zonas = empleadoId ? (window.NFCReader?.getZonasPermitidasParaEmpleado?.(empleadoId) || []) : [];
      form.querySelectorAll('input[name="zonas"]').forEach((checkbox) => {
        checkbox.checked = zonas.includes(checkbox.value);
      });
    }, { signal });

    modalEl?.addEventListener('submit', (e) => {
      if (e.target?.id !== 'tarjeta-form') return;
      e.preventDefault();
      guardarTarjeta(e.target);
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
    const input = container?.querySelector('#tarjeta-buscar');
    if (!input) return;
    input.value = String(valor || '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  window.DashboardModules.tarjetas = {
    titulo: 'Tarjetas NFC',
    render,
    onSearch,
    onUnload() {
      destruirEventos();
    }
  };
})();
