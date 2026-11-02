/* ========================================
   Módulo Horarios — INNOVATION NFC E.S.F
   Bloque 3: Dashboard profesional de asistencia
   ======================================== */

(function () {
  'use strict';

  window.DashboardModules = window.DashboardModules || {};

  let charts = {};
  let limpiarEventos = null;

  function destruirCharts() {
    Object.values(charts).forEach((chart) => chart.destroy && chart.destroy());
    charts = {};
  }

  function destruirEventos() {
    if (limpiarEventos) {
      limpiarEventos();
      limpiarEventos = null;
    }
  }

  // ============================================================
  // Helpers de datos
  // ============================================================

  function empleadosVisibles(ctx) {
    if (ctx.rol !== 'jefe') return [...ctx.empleados].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
    const areas = ctx.empleado?.areasSupervisadas || [];
    const base = areas.includes('todas') ? ctx.empleados : ctx.empleados.filter((emp) => areas.includes(emp.area));
    return [...base].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
  }

  function esModoLectura(ctx) {
    return ctx.rol === 'jefe';
  }

  function obtenerAreas(empleados) {
    return [...new Set(empleados.map((e) => e.area).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  }

  function obtenerCargos(empleados) {
    return [...new Set(empleados.map((e) => e.puesto).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function fechaISO(fecha) {
    return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
  }

  function rangoPeriodo(periodo = {}) {
    const corte = UI.parseFecha(periodo.fechaCorte) || new Date(2026, 9, 31, 12, 0, 0);
    const [anioPeriodo, mesPeriodo] = String(periodo.periodo || '').split('-').map(Number);
    const anio = anioPeriodo || corte.getFullYear();
    const mes = mesPeriodo || corte.getMonth() + 1;
    const ultimoDia = new Date(anio, mes, 0, 12, 0, 0).getDate();
    return { desde: `${anio}-${pad(mes)}-01`, hasta: `${anio}-${pad(mes)}-${pad(ultimoDia)}` };
  }

  function fechasEntre(desde, hasta) {
    const inicio = UI.parseFecha(desde);
    const fin = UI.parseFecha(hasta);
    if (!inicio || !fin) return [];
    if (inicio > fin) return [];
    const fechas = [];
    const cursor = new Date(inicio);
    while (cursor <= fin) {
      fechas.push(fechaISO(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return fechas;
  }

  function esDomingo(iso) {
    return UI.parseFecha(iso)?.getDay() === 0;
  }

  function formatoDiaCorto(iso) {
    const fecha = UI.parseFecha(iso);
    if (!fecha) return iso;
    return `${fecha.getDate()} ${UI.MESES_CORTOS[fecha.getMonth()]}`;
  }

  function formatoRango(desde, hasta) {
    return `${UI.fechaCorta(desde)} – ${UI.fechaCorta(hasta)}`;
  }

  function formatoHora(minutos) {
    if (minutos == null) return '—';
    return `${pad(Math.floor(minutos / 60))}:${pad(minutos % 60)}`;
  }

  function construirMapaMarcas(asistencia, ids, incluirPruebas) {
    const idsSet = new Set(ids);
    const mapa = {};
    ids.forEach((id) => { mapa[id] = {}; });

    asistencia.forEach((m) => {
      if (!idsSet.has(m.empleadoId)) return;
      if (!incluirPruebas && m.valida === false) return;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(m.fecha || ''))) return;
      if (!mapa[m.empleadoId][m.fecha]) mapa[m.empleadoId][m.fecha] = {};
      mapa[m.empleadoId][m.fecha][m.tipo] = m;
    });

    return mapa;
  }

  function construirMapaJustificaciones(justificaciones, ids) {
    const idsSet = new Set(ids);
    const mapa = {};
    ids.forEach((id) => { mapa[id] = {}; });

    (justificaciones || []).forEach((justificacion) => {
      if (!idsSet.has(justificacion.empleadoId)) return;
      if (justificacion.estado !== 'aprobada') return;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(justificacion.fecha || ''))) return;
      mapa[justificacion.empleadoId][justificacion.fecha] = justificacion;
    });

    return mapa;
  }

  function calcularResumenEmpleado(empId, mapaMarcas, fechas, incluirPruebas, justificadasMap = {}) {
    const marcas = mapaMarcas[empId] || {};
    let diasConEntrada = 0;
    let tardanzas = 0;
    let pruebas = 0;
    let justificadas = 0;
    let totalMinutos = 0;
    let countEntradas = 0;

    fechas.forEach((fecha) => {
      const m = marcas[fecha];
      if (!m?.entrada) {
        if (justificadasMap[fecha]) justificadas++;
        return;
      }
      diasConEntrada++;
      if (m.entrada.valida === false) pruebas++;
      if (m.entrada.esTardanza && m.entrada.valida !== false) tardanzas++;
      const [h, min] = String(m.entrada.hora || '00:00').split(':').map(Number);
      totalMinutos += (h * 60) + (min || 0);
      countEntradas++;
    });

    const faltas = Math.max(0, fechas.length - diasConEntrada - justificadas);
    const promEntradaMin = countEntradas ? Math.round(totalMinutos / countEntradas) : null;

    return {
      diasConEntrada,
      tardanzas,
      faltas,
      justificadas,
      pruebas,
      diasPosibles: fechas.length,
      pctAsistencia: fechas.length ? Math.round((diasConEntrada / fechas.length) * 100) : 0,
      pctTardanzas: diasConEntrada ? Math.round((tardanzas / diasConEntrada) * 100) : 0,
      promEntrada: promEntradaMin == null ? '—' : formatoHora(promEntradaMin),
      totalMinutos,
      countEntradas
    };
  }

  function estadoDia(m, incluirPruebas, justificacion = null) {
    if (!m?.entrada) {
      if (justificacion) return { label: 'Justificada', clase: 'badge-justified', icon: '📎' };
      return { label: 'Falta', clase: 'badge-absent', icon: '✕' };
    }
    if (m.entrada.valida === false && incluirPruebas) return { label: 'Prueba', clase: 'badge-test', icon: '🧪' };
    if (m.entrada.esTardanza) return { label: `Tardanza +${m.entrada.minutosTardanza}m`, clase: 'badge-late', icon: '⏰' };
    return { label: 'A tiempo', clase: 'badge-ok', icon: '✓' };
  }

  function filtrarBase(visibles, filtros) {
    let res = visibles;
    if (filtros.empleadoId) res = res.filter((e) => e.id === filtros.empleadoId);
    if (filtros.area) res = res.filter((e) => e.area === filtros.area);
    if (filtros.cargo) res = res.filter((e) => e.puesto === filtros.cargo);
    return res;
  }

  function cumpleEstado(resumen, estado) {
    if (!estado) return true;
    if (estado === 'tardanza') return resumen.tardanzas > 0;
    if (estado === 'ausencia') return resumen.faltas > 0;
    if (estado === 'prueba') return resumen.pruebas > 0;
    if (estado === 'justificada') return resumen.justificadas > 0;
    if (estado === 'valida') return resumen.diasConEntrada > 0 && resumen.tardanzas === 0;
    return true;
  }

  function calcularRango(state, ctx, incluirPruebas, ids) {
    const porDefecto = rangoPeriodo(ctx.periodo);
    let desde = state.filtros.desde || porDefecto.desde;
    let hasta = state.filtros.hasta || porDefecto.hasta;
    const fechasExplicitas = Boolean(state.filtros.desde || state.filtros.hasta);
    const idsSet = new Set(ids || []);

    // Si se piden pruebas y no se fijaron fechas, el rango se amplía para
    // que también se vean las marcas de prueba fuera del mes de simulación.
    if (incluirPruebas && !fechasExplicitas) {
      state.asistencia.forEach((m) => {
        if (!idsSet.has(m.empleadoId)) return;
        if (m.valida !== false || !/^\d{4}-\d{2}-\d{2}$/.test(String(m.fecha || ''))) return;
        if (String(m.fecha) < desde) desde = m.fecha;
        if (String(m.fecha) > hasta) hasta = m.fecha;
      });
    }

    if (desde > hasta) [desde, hasta] = [hasta, desde];

    const fechas = fechasEntre(desde, hasta);
    return {
      desde,
      hasta,
      fechas,
      laborables: fechas.filter((fecha) => !esDomingo(fecha)),
      label: formatoRango(desde, hasta)
    };
  }

  function calcularDatos(state, ctx) {
    const incluirPruebas = Boolean(state.filtros.incluirPruebas || state.filtros.estado === 'prueba');
    const base = filtrarBase(state.visibles, state.filtros);
    const rango = calcularRango(state, ctx, incluirPruebas, base.map((emp) => emp.id));
    const fechas = rango.laborables;
    const mapa = construirMapaMarcas(state.asistencia, base.map((e) => e.id), incluirPruebas);
    const justificadas = construirMapaJustificaciones(state.justificaciones, base.map((e) => e.id));

    const resumenBase = {};
    base.forEach((emp) => {
      const fechasEmpleado = fechas.filter((fecha) => !emp.fechaIngreso || fecha >= emp.fechaIngreso);
      resumenBase[emp.id] = calcularResumenEmpleado(
        emp.id,
        mapa,
        fechasEmpleado,
        incluirPruebas,
        justificadas[emp.id] || {}
      );
    });

    const empleadosFiltrados = base.filter((emp) => cumpleEstado(resumenBase[emp.id], state.filtros.estado));
    const resumenEmpleados = {};
    empleadosFiltrados.forEach((emp) => { resumenEmpleados[emp.id] = resumenBase[emp.id]; });

    const totalDiasConEntrada = Object.values(resumenEmpleados).reduce((acc, r) => acc + r.diasConEntrada, 0);
    const totalTardanzas = Object.values(resumenEmpleados).reduce((acc, r) => acc + r.tardanzas, 0);
    const totalFaltas = Object.values(resumenEmpleados).reduce((acc, r) => acc + r.faltas, 0);
    const totalJustificadas = Object.values(resumenEmpleados).reduce((acc, r) => acc + r.justificadas, 0);
    const totalPruebas = Object.values(resumenEmpleados).reduce((acc, r) => acc + r.pruebas, 0);
    const totalPosibles = Object.values(resumenEmpleados).reduce((acc, r) => acc + r.diasPosibles, 0);
    const totalMinutos = Object.values(resumenEmpleados).reduce((acc, r) => acc + r.totalMinutos, 0);
    const totalEntradas = Object.values(resumenEmpleados).reduce((acc, r) => acc + r.countEntradas, 0);
    const pctAsistencia = totalPosibles ? Math.round((totalDiasConEntrada / totalPosibles) * 100) : 0;
    const pctTardanzas = totalDiasConEntrada ? Math.round((totalTardanzas / totalDiasConEntrada) * 100) : 0;
    const pctFaltas = totalPosibles ? Math.round((totalFaltas / totalPosibles) * 100) : 0;
    const promEntrada = totalEntradas ? formatoHora(Math.round(totalMinutos / totalEntradas)) : '—';

    const asistenciaDiaria = fechas.map((fecha) => {
      const activos = empleadosFiltrados.filter((emp) => !emp.fechaIngreso || fecha >= emp.fechaIngreso);
      let presentes = 0;
      activos.forEach((emp) => {
        if (mapa[emp.id]?.[fecha]?.entrada) presentes++;
      });
      const total = activos.length;
      return { fecha, presentes, total, pct: total ? Math.round((presentes / total) * 100) : 0 };
    });

    const porArea = new Map();
    empleadosFiltrados.forEach((emp) => porArea.set(emp.area, 0));
    empleadosFiltrados.forEach((emp) => {
      Object.entries(mapa[emp.id] || {}).forEach(([fecha, m]) => {
        if (!fechas.includes(fecha)) return;
        if (m.entrada?.esTardanza && m.entrada.valida !== false) {
          porArea.set(emp.area, (porArea.get(emp.area) || 0) + 1);
        }
      });
    });
    const tardanzasArea = [...porArea.entries()]
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count || a.area.localeCompare(b.area, 'es'));

    const promedioAsistencia = pctAsistencia;

    return {
      base,
      empleadosFiltrados,
      resumenEmpleados,
      resumenGlobal: {
        totalDiasConEntrada,
        totalTardanzas,
        totalFaltas,
        totalJustificadas,
        totalPruebas,
        totalPosibles,
        pctAsistencia,
        pctTardanzas,
        pctFaltas,
        promEntrada,
        totalMinutos,
        totalEntradas
      },
      rango,
      fechasLaborables: fechas,
      incluirPruebas,
      mapa,
      mapaJustificaciones: justificadas,
      asistenciaDiaria,
      tardanzasArea,
      promedioAsistencia
    };
  }

  // ============================================================
  // Render — componentes
  // ============================================================

  function renderKPIs(resumenGlobal, datos) {
    return `
      <section class="kpi-section" aria-label="Indicadores clave">
        ${UI.kpiCard({
          label: 'Asistencia global',
          valor: `${resumenGlobal.pctAsistencia}%`,
          detalle: `${resumenGlobal.totalDiasConEntrada} de ${resumenGlobal.totalPosibles} jornadas`,
          tono: 'success',
          icono: '✅'
        })}
        ${UI.kpiCard({
          label: 'Tardanzas',
          valor: `${resumenGlobal.pctTardanzas}%`,
          detalle: `${resumenGlobal.totalTardanzas} de ${resumenGlobal.totalDiasConEntrada} entradas`,
          tono: 'warning',
          icono: '⏱️'
        })}
        ${UI.kpiCard({
          label: 'Ausencias',
          valor: `${resumenGlobal.pctFaltas}%`,
          detalle: `${resumenGlobal.totalFaltas} sin justificar · ${resumenGlobal.totalJustificadas} justificadas`,
          tono: 'danger',
          icono: '🚫'
        })}
        ${UI.kpiCard({
          label: 'Prom. entrada',
          valor: resumenGlobal.promEntrada,
          detalle: datos.incluirPruebas ? 'Incluye marcas de prueba' : 'Hora promedio de llegada',
          tono: 'primary',
          icono: '🕐'
        })}
      </section>
    `;
  }

  function renderFiltros(ctx, state) {
    const areas = obtenerAreas(state.visibles);
    const cargos = obtenerCargos(state.visibles);
    const modoLectura = esModoLectura(ctx);
    const f = state.filtros;

    return `
      <section class="filters-bar horarios-filters" role="search" aria-label="Filtros de horarios">
        <div class="filters-left horarios-filters-top">
          <div class="filter-group">
            <label for="filtro-empleado" class="filter-label">Empleado</label>
            <select id="filtro-empleado" class="filter-select" aria-label="Filtrar por empleado">
              <option value="">Todos los empleados</option>
              ${state.visibles.map((e) => `<option value="${UI.esc(e.id)}" ${f.empleadoId === e.id ? 'selected' : ''}>${UI.esc(e.nombre)} (${UI.esc(e.area)})</option>`).join('')}
            </select>
          </div>
          <div class="filter-group">
            <label for="filtro-area" class="filter-label">Área</label>
            <select id="filtro-area" class="filter-select" aria-label="Filtrar por área">
              <option value="">Todas las áreas</option>
              ${areas.map((a) => `<option value="${UI.esc(a)}" ${f.area === a ? 'selected' : ''}>${UI.esc(a)}</option>`).join('')}
            </select>
          </div>
          <div class="filter-group">
            <label for="filtro-cargo" class="filter-label">Cargo</label>
            <select id="filtro-cargo" class="filter-select" aria-label="Filtrar por cargo">
              <option value="">Todos los cargos</option>
              ${cargos.map((c) => `<option value="${UI.esc(c)}" ${f.cargo === c ? 'selected' : ''}>${UI.esc(c)}</option>`).join('')}
            </select>
          </div>
          <div class="filter-group">
            <label for="filtro-estado" class="filter-label">Estado</label>
            <select id="filtro-estado" class="filter-select" aria-label="Filtrar por estado">
              <option value="">Todos los estados</option>
              <option value="valida" ${f.estado === 'valida' ? 'selected' : ''}>A tiempo</option>
              <option value="tardanza" ${f.estado === 'tardanza' ? 'selected' : ''}>Tardanza</option>
              <option value="ausencia" ${f.estado === 'ausencia' ? 'selected' : ''}>Falta</option>
              <option value="justificada" ${f.estado === 'justificada' ? 'selected' : ''}>Justificada</option>
              <option value="prueba" ${f.estado === 'prueba' ? 'selected' : ''}>Prueba</option>
            </select>
          </div>
        </div>

        <div class="horarios-filters-bottom">
          <div class="horarios-dates">
            <div class="filter-group">
              <label for="filtro-desde" class="filter-label">Desde</label>
              <input type="date" id="filtro-desde" class="filter-input" value="${UI.esc(f.desde || '')}" aria-label="Desde día">
            </div>
            <div class="filter-group">
              <label for="filtro-hasta" class="filter-label">Hasta</label>
              <input type="date" id="filtro-hasta" class="filter-input" value="${UI.esc(f.hasta || '')}" aria-label="Hasta día">
            </div>
          </div>
          <div class="horarios-filter-actions filters-right">
            <label class="toggle-wrapper" title="Incluir marcas de prueba en tabla y gráficos; si no hay fechas, amplía el rango para mostrarlas">
              <input type="checkbox" id="filtro-incluir-pruebas" class="toggle-input" ${f.incluirPruebas ? 'checked' : ''} aria-label="Incluir marcas de prueba">
              <span class="toggle-slider"></span>
              <span class="toggle-label">Incluir pruebas</span>
            </label>
            <button type="button" class="btn btn-ghost" id="btn-limpiar-filtros" aria-label="Limpiar todos los filtros">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Limpiar
            </button>
            ${!modoLectura ? `
              <button type="button" class="btn btn-primary" id="btn-export-csv" aria-label="Exportar CSV filtrado">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Exportar CSV
              </button>
            ` : ''}
          </div>
        </div>
      </section>
    `;
  }

  function renderTablaResumen(datos) {
    if (!datos.empleadosFiltrados.length) {
      return UI.emptyState('Sin resultados', 'No hay empleados que coincidan con los filtros actuales.', '📅');
    }

    const rows = datos.empleadosFiltrados.map((emp) => {
      const r = datos.resumenEmpleados[emp.id] || { diasConEntrada: 0, tardanzas: 0, faltas: 0, justificadas: 0, pruebas: 0, pctAsistencia: 0, promEntrada: '—' };
      return `
        <tr data-id="${UI.esc(emp.id)}" tabindex="0" role="row" aria-label="Ver detalle de ${UI.esc(emp.nombre)}">
          <td class="col-empleado">
            ${UI.avatar(emp.nombre, 'avatar-sm')}
            <div>
              <strong>${UI.esc(emp.nombre)}</strong>
            </div>
          </td>
          <td>${UI.esc(emp.area)}</td>
          <td>${UI.esc(emp.puesto)}</td>
          <td><span class="stat-badge stat-ok">${r.diasConEntrada}</span></td>
          <td><span class="stat-badge stat-late">${r.tardanzas}</span></td>
          <td><span class="stat-badge stat-absent">${r.faltas}</span></td>
          <td><span class="stat-badge stat-justified">${r.justificadas}</span></td>
          <td><span class="stat-badge stat-test">${r.pruebas}</span></td>
          <td><strong>${r.pctAsistencia}%</strong></td>
          <td>${r.promEntrada}</td>
          <td class="col-action">
            <button type="button" class="icon-btn btn-ver-detalle" data-id="${UI.esc(emp.id)}" aria-label="Ver detalle de ${UI.esc(emp.nombre)}" aria-haspopup="dialog">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <section class="table-section" aria-label="Resumen de asistencia">
        <div class="table-wrap" role="region" tabindex="0">
          <table class="data-table" id="tabla-resumen-horarios">
            <thead>
              <tr>
                <th scope="col">Empleado</th>
                <th scope="col">Área</th>
                <th scope="col">Cargo</th>
                <th scope="col">Asistió</th>
                <th scope="col">Tardanzas</th>
                <th scope="col">Faltas</th>
                <th scope="col">Justificadas</th>
                <th scope="col">Pruebas</th>
                <th scope="col">% Asistencia</th>
                <th scope="col">Prom. entrada</th>
                <th scope="col"><span class="visually-hidden">Acciones</span></th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div class="table-footer">
          <span class="table-count">${datos.empleadosFiltrados.length} empleados · ${datos.fechasLaborables.length} jornadas · ${UI.esc(datos.rango.label)}</span>
        </div>
      </section>
    `;
  }

  function renderGraficos(datos) {
    const areasConDatos = datos.tardanzasArea.filter((item) => item.count > 0);
    const rango = UI.esc(datos.rango.label);
    const pruebas = datos.incluirPruebas ? ' · Incluye pruebas' : '';

    return `
      <section class="charts-section horarios-charts" aria-label="Gráficos de asistencia">
        <div class="charts-grid">
          <article class="chart-card" aria-labelledby="chart-asistencia-title">
            <div class="chart-header">
              <h3 id="chart-asistencia-title">Asistencia diaria %</h3>
              <p class="chart-subtitle">${rango} · ${datos.fechasLaborables.length} días laborables · Promedio ${datos.promedioAsistencia}%${pruebas}</p>
            </div>
            <div class="chart-wrap chart-wrap-horarios-asistencia">
              <canvas id="chart-asistencia-diaria" aria-label="Porcentaje de asistencia por día"></canvas>
            </div>
          </article>
          <article class="chart-card" aria-labelledby="chart-tardanzas-area-title">
            <div class="chart-header">
              <h3 id="chart-tardanzas-area-title">Tardanzas por área</h3>
              <p class="chart-subtitle">${datos.resumenGlobal.totalTardanzas} tardanzas · ${areasConDatos.length} áreas · ${rango}</p>
            </div>
            ${areasConDatos.length ? `
              <div class="doughnut-layout">
                <div class="doughnut-canvas"><canvas id="chart-tardanzas-area" aria-label="Tardanzas por área"></canvas></div>
                <div class="chart-legend chart-legend-vertical" id="legend-tardanzas-area"></div>
              </div>
            ` : UI.emptyState('Sin tardanzas', 'No hay entradas tardías en el periodo seleccionado.', '⏱️')}
          </article>
        </div>
      </section>
    `;
  }

  function renderDrawer() {
    return `
      <aside class="drawer-overlay" id="drawer-overlay" hidden></aside>
      <aside class="drawer horarios-drawer" id="drawer-detalle" role="dialog" aria-modal="true" aria-labelledby="drawer-title" hidden>
        <div class="drawer-header">
          <h2 id="drawer-title">Detalle de asistencia</h2>
          <button type="button" class="icon-btn drawer-close" id="drawer-close" aria-label="Cerrar detalle">✕</button>
        </div>
        <div class="drawer-body" id="drawer-body">
          <div class="drawer-loading">Cargando…</div>
        </div>
      </aside>
    `;
  }

  // ============================================================
  // Chart.js
  // ============================================================

  function gradienteVertical(context, colorInferior, colorSuperior) {
    const chart = context.chart;
    const area = chart.chartArea;
    if (!area) return colorInferior;
    const gradiente = chart.ctx.createLinearGradient(0, area.bottom, 0, area.top);
    gradiente.addColorStop(0, colorInferior);
    gradiente.addColorStop(1, colorSuperior);
    return gradiente;
  }

  function pluginLineaReferencia(valor) {
    return {
      id: 'horariosLineaReferencia',
      afterDatasetsDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        const yScale = scales?.y;
        if (!yScale || !chartArea) return;
        const y = yScale.getPixelForValue(valor);
        if (y < chartArea.top || y > chartArea.bottom) return;
        ctx.save();
        ctx.setLineDash([6, 5]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#8B887E';
        ctx.beginPath();
        ctx.moveTo(chartArea.left, y);
        ctx.lineTo(chartArea.right, y);
        ctx.stroke();
        ctx.restore();
      }
    };
  }

  function crearLineChart(canvasId, datos, promedio) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx || !window.Chart || !window.ChartTheme) return;
    if (charts[canvasId]) charts[canvasId].destroy();

    const labels = datos.map((d) => formatoDiaCorto(d.fecha));
    const values = datos.map((d) => d.pct);
    const fechas = datos.map((d) => d.fecha);
    const presentes = datos.map((d) => d.presentes);
    const totales = datos.map((d) => d.total);
    const tooltipBase = window.ChartTheme.premiumTooltip;

    charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: '% Asistencia',
          data: values,
          borderColor: '#2F6B4F',
          backgroundColor: (context) => gradienteVertical(context, 'rgba(47, 107, 79, 0.02)', 'rgba(47, 107, 79, 0.24)'),
          fill: true,
          tension: 0.35,
          pointRadius: 2.5,
          pointHoverRadius: 6,
          pointBackgroundColor: '#2F6B4F',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          pointHitRadius: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        devicePixelRatio: Math.max(2, window.devicePixelRatio || 1),
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltipBase,
            callbacks: {
              ...tooltipBase.callbacks,
              title: (items) => UI.fechaLarga(fechas[items[0].dataIndex]),
              label: (item) => `  ${item.parsed.y}% · ${presentes[item.dataIndex]} de ${totales[item.dataIndex]} empleados`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false, drawBorder: false },
            ticks: { color: '#8B887E', font: { size: 10 }, maxTicksLimit: 12, autoSkip: true }
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(30, 30, 30, 0.04)', drawBorder: false },
            ticks: { stepSize: 20, color: '#8B887E', font: { size: 10 }, callback: (value) => `${value}%` }
          }
        },
        animation: { duration: 800, easing: 'easeOutQuart' }
      },
      plugins: [pluginLineaReferencia(promedio)]
    });
  }

  function crearDoughnutChart(canvasId, labels, data, colors, legendId) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx || !window.Chart || !window.ChartTheme) return;
    if (charts[canvasId]) charts[canvasId].destroy();

    const total = data.reduce((a, b) => a + b, 0);
    charts[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: '#FFFFFF',
          borderWidth: 4,
          cutout: '72%',
          hoverOffset: 4,
          hoverBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        devicePixelRatio: Math.max(2, window.devicePixelRatio || 1),
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(30,30,30,0.95)',
            titleColor: '#F5D25A',
            bodyColor: '#FFFFFF',
            padding: 12,
            titleFont: { size: 12, weight: '600' },
            bodyFont: { size: 11 },
            callbacks: {
              label: (item) => `  ${item.label}: ${item.parsed} (${total ? Math.round((item.parsed / total) * 100) : 0}%)`
            }
          }
        },
        animation: { animateRotate: true, animateScale: false, duration: 800, easing: 'easeOutQuart' },
        onHover: (e, elements) => { e.native.target.style.cursor = elements.length ? 'pointer' : 'default'; }
      }
    });

    const legendEl = document.getElementById(legendId);
    if (legendEl) {
      legendEl.innerHTML = labels.map((label, i) => {
        const pct = total ? Math.round((data[i] / total) * 100) : 0;
        return `<span class="legend-item" style="display:inline-flex;align-items:center;gap:6px;margin:4px 12px 4px 0;font-size:.7rem;">
          <span class="legend-color" style="width:12px;height:12px;border-radius:3px;background:${colors[i]};border:1px solid rgba(0,0,0,.1);"></span>
          <span class="legend-label">${UI.esc(label)}</span>
          <span class="legend-value">${data[i]} (${pct}%)</span>
        </span>`;
      }).join('');
    }
  }

  function montarGraficos(datos) {
    if (!window.Chart || !window.ChartTheme) return;
    requestAnimationFrame(() => {
      crearLineChart('chart-asistencia-diaria', datos.asistenciaDiaria, datos.promedioAsistencia);

      const areas = datos.tardanzasArea.filter((item) => item.count > 0);
      if (areas.length) {
        const colors = areas.map((item) => window.ChartTheme.colorArea?.(item.area) || '#E88D2A');
        crearDoughnutChart(
          'chart-tardanzas-area',
          areas.map((item) => item.area),
          areas.map((item) => item.count),
          colors,
          'legend-tardanzas-area'
        );
      }
    });
  }

  // ============================================================
  // Export CSV
  // ============================================================

  function exportarCSV(datos) {
    if (!datos.empleadosFiltrados.length) {
      UI.toast('No hay empleados para exportar con los filtros actuales', 'warning');
      return;
    }

    const fechas = datos.fechasLaborables;
    const headers = [
      'Empleado',
      'Área',
      'Cargo',
      ...fechas.map((fecha) => `${formatoDiaCorto(fecha)} ${UI.parseFecha(fecha)?.getFullYear() || ''}`.trim()),
      'Asistió',
      'Tardanzas',
      'Faltas',
      'Justificadas',
      'Pruebas',
      '% Asistencia',
      'Prom. entrada'
    ];

    const escapar = (valor) => `"${String(valor ?? '').replace(/"/g, '""')}"`;

    const rows = datos.empleadosFiltrados.map((emp) => {
      const resumen = datos.resumenEmpleados[emp.id];
      const dias = fechas.map((fecha) => {
        if (emp.fechaIngreso && fecha < emp.fechaIngreso) return '—';
        const m = datos.mapa[emp.id]?.[fecha];
        const justificacion = datos.mapaJustificaciones?.[emp.id]?.[fecha] || null;
        return estadoDia(m, datos.incluirPruebas, justificacion).label;
      });
      return [
        emp.nombre,
        emp.area,
        emp.puesto,
        ...dias,
        resumen.diasConEntrada,
        resumen.tardanzas,
        resumen.faltas,
        resumen.justificadas,
        resumen.pruebas,
        `${resumen.pctAsistencia}%`,
        resumen.promEntrada
      ].map(escapar);
    });

    const csv = '\uFEFF' + [headers.map(escapar).join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `horarios-${datos.rango.desde}_${datos.rango.hasta}.csv`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    UI.toast(`Exportados ${datos.empleadosFiltrados.length} empleados con los filtros actuales`, 'success');
  }

  // ============================================================
  // Drawer de detalle
  // ============================================================

  function renderDrawerContenido(emp, datos) {
    const resumen = datos.resumenEmpleados[emp.id];
    const fechasEmpleado = datos.fechasLaborables.filter((fecha) => !emp.fechaIngreso || fecha >= emp.fechaIngreso);
    const rows = fechasEmpleado.map((fecha) => {
      const m = datos.mapa[emp.id]?.[fecha];
      const justificacion = datos.mapaJustificaciones?.[emp.id]?.[fecha] || null;
      const est = estadoDia(m, datos.incluirPruebas, justificacion);
      const marcasDia = m
        ? `${m.entrada?.hora || '--'} | ${m.almuerzo_salida?.hora || '--'} | ${m.almuerzo_retorno?.hora || '--'} | ${m.salida?.hora || '--'}`
        : '—';
      return `
        <tr class="row-${est.clase.replace('badge-', '')}">
          <td><strong>${UI.esc(formatoDiaCorto(fecha))}</strong> <span class="day-name">(${UI.esc(nombreDia(fecha))})</span></td>
          <td><span class="badge ${est.clase}">${est.icon} ${est.label}</span></td>
          <td class="marcas-cell">${marcasDia}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="drawer-profile">
        ${UI.avatar(emp.nombre, 'avatar-lg')}
        <div>
          <h3>${UI.esc(emp.nombre)}</h3>
          <p>${UI.esc(emp.puesto)} · ${UI.esc(emp.area)}</p>
          <small>${UI.esc(datos.rango.label)}${datos.incluirPruebas ? ' · Incluye pruebas' : ''}</small>
        </div>
      </div>
      <div class="drawer-stats">
        <div class="stat"><span>${resumen.diasConEntrada}</span><label>Asistió</label></div>
        <div class="stat"><span>${resumen.tardanzas}</span><label>Tardanzas</label></div>
        <div class="stat"><span>${resumen.faltas}</span><label>Faltas</label></div>
        <div class="stat"><span>${resumen.justificadas}</span><label>Justificadas</label></div>
        <div class="stat"><span>${resumen.pruebas}</span><label>Pruebas</label></div>
        <div class="stat"><span>${resumen.pctAsistencia}%</span><label>% Asistencia</label></div>
        <div class="stat"><span>${resumen.promEntrada}</span><label>Prom. entrada</label></div>
      </div>
      <table class="drawer-table">
        <thead><tr><th>Día</th><th>Estado</th><th>Marcaciones (E | S.A | R.A | S)</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function nombreDia(iso) {
    const fecha = UI.parseFecha(iso);
    return fecha ? UI.DIAS[fecha.getDay()] : '';
  }

  // ============================================================
  // Render principal
  // ============================================================

  function render(container, ctx) {
    destruirEventos();

    const todos = ctx.empleados;
    const visibles = empleadosVisibles(ctx);
    const modoLectura = esModoLectura(ctx);
    const state = {
      visibles,
      todos,
      asistencia: ctx.asistencia,
      justificaciones: ctx.justificaciones || [],
      filtros: { empleadoId: '', area: '', cargo: '', desde: '', hasta: '', estado: '', incluirPruebas: false },
      datos: null,
      modoLectura
    };

    const storageKey = `filtros_horarios_${ctx.rol}`;
    try {
      const guardado = sessionStorage.getItem(storageKey);
      if (guardado) state.filtros = { ...state.filtros, ...JSON.parse(guardado) };
    } catch {}

    if (state.filtros.estado === 'prueba') state.filtros.incluirPruebas = true;

    container.innerHTML = `
      ${UI.pageHeader({
        eyebrow: 'Horarios',
        titulo: 'Control de asistencia',
        descripcion: 'Analiza asistencia, tardanzas y ausencias por periodo · Detalle al hacer clic'
      })}

      <div id="horarios-kpis"></div>

      ${renderFiltros(ctx, state)}

      <div id="horarios-charts"></div>
      <div id="horarios-tabla"></div>

      ${renderDrawer()}
    `;

    const kpisWrap = document.getElementById('horarios-kpis');
    const chartsWrap = document.getElementById('horarios-charts');
    const tablaWrap = document.getElementById('horarios-tabla');
    const searchEmp = document.getElementById('filtro-empleado');
    const area = document.getElementById('filtro-area');
    const cargo = document.getElementById('filtro-cargo');
    const desde = document.getElementById('filtro-desde');
    const hasta = document.getElementById('filtro-hasta');
    const estado = document.getElementById('filtro-estado');
    const incluirPruebas = document.getElementById('filtro-incluir-pruebas');
    const btnLimpiar = document.getElementById('btn-limpiar-filtros');
    const btnExport = document.getElementById('btn-export-csv');
    const drawer = document.getElementById('drawer-detalle');
    const overlay = document.getElementById('drawer-overlay');
    const closeBtn = document.getElementById('drawer-close');

    const controller = new AbortController();
    const { signal } = controller;
    limpiarEventos = () => controller.abort();

    const recalcular = () => {
      if (signal.aborted) return;
      destruirCharts();
      const datos = calcularDatos(state, ctx);
      state.datos = datos;
      kpisWrap.innerHTML = renderKPIs(datos.resumenGlobal, datos);
      chartsWrap.innerHTML = renderGraficos(datos);
      tablaWrap.innerHTML = renderTablaResumen(datos);
      montarGraficos(datos);
    };

    const actualizarCargosSegunArea = () => {
      const areaSel = area?.value || '';
      const cargos = obtenerCargos(areaSel ? state.visibles.filter((e) => e.area === areaSel) : state.visibles);
      if (cargo) {
        const valor = cargo.value;
        cargo.innerHTML = '<option value="">Todos los cargos</option>' + cargos.map((c) => `<option value="${UI.esc(c)}" ${valor === c ? 'selected' : ''}>${UI.esc(c)}</option>`).join('');
      }
    };

    const aplicarFiltros = () => {
      if (signal.aborted) return;

      let desdeValor = desde?.value || '';
      let hastaValor = hasta?.value || '';
      if (desdeValor && hastaValor && desdeValor > hastaValor) {
        [desdeValor, hastaValor] = [hastaValor, desdeValor];
        if (desde) desde.value = desdeValor;
        if (hasta) hasta.value = hastaValor;
        UI.toast('El rango de fechas se invirtió automáticamente', 'warning');
      }

      let incluir = incluirPruebas?.checked || false;
      let estadoValor = estado?.value || '';
      if (estadoValor === 'prueba' && !incluir) {
        incluir = true;
        if (incluirPruebas) incluirPruebas.checked = true;
      }
      if (!incluir && estadoValor === 'prueba') {
        estadoValor = '';
        if (estado) estado.value = '';
      }

      state.filtros = {
        empleadoId: searchEmp?.value || '',
        area: area?.value || '',
        cargo: cargo?.value || '',
        desde: desdeValor,
        hasta: hastaValor,
        estado: estadoValor,
        incluirPruebas: incluir
      };
      sessionStorage.setItem(storageKey, JSON.stringify(state.filtros));
      recalcular();
    };

    actualizarCargosSegunArea();
    recalcular();

    area?.addEventListener('change', () => {
      actualizarCargosSegunArea();
      aplicarFiltros();
    }, { signal });
    searchEmp?.addEventListener('change', aplicarFiltros, { signal });
    cargo?.addEventListener('change', aplicarFiltros, { signal });
    desde?.addEventListener('change', aplicarFiltros, { signal });
    hasta?.addEventListener('change', aplicarFiltros, { signal });
    estado?.addEventListener('change', aplicarFiltros, { signal });
    incluirPruebas?.addEventListener('change', aplicarFiltros, { signal });

    btnLimpiar?.addEventListener('click', () => {
      state.filtros = { empleadoId: '', area: '', cargo: '', desde: '', hasta: '', estado: '', incluirPruebas: false };
      sessionStorage.removeItem(storageKey);
      if (searchEmp) searchEmp.value = '';
      if (area) area.value = '';
      if (cargo) cargo.value = '';
      if (desde) desde.value = '';
      if (hasta) hasta.value = '';
      if (estado) estado.value = '';
      if (incluirPruebas) incluirPruebas.checked = false;
      actualizarCargosSegunArea();
      recalcular();
    }, { signal });

    btnExport?.addEventListener('click', () => {
      aplicarFiltros();
      if (state.datos) exportarCSV(state.datos);
    }, { signal });

    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-ver-detalle');
      if (btn) {
        const emp = state.datos?.empleadosFiltrados.find((em) => em.id === btn.dataset.id);
        if (emp) abrirDrawer(emp);
        return;
      }
      const row = e.target.closest('#tabla-resumen-horarios tbody tr[data-id]');
      if (row) {
        const emp = state.datos?.empleadosFiltrados.find((em) => em.id === row.dataset.id);
        if (emp) abrirDrawer(emp);
      }
    }, { signal });

    container.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const row = e.target.closest('#tabla-resumen-horarios tbody tr[data-id]');
      if (!row) return;
      e.preventDefault();
      const emp = state.datos?.empleadosFiltrados.find((em) => em.id === row.dataset.id);
      if (emp) abrirDrawer(emp);
    }, { signal });

    function abrirDrawer(emp) {
      if (!drawer || !overlay || !state.datos) return;
      const body = document.getElementById('drawer-body');
      if (!body) return;
      body.innerHTML = renderDrawerContenido(emp, state.datos);
      drawer.hidden = false;
      overlay.hidden = false;
      document.body.style.overflow = 'hidden';
      closeBtn?.focus();
    }

    function cerrarDrawer() {
      if (drawer) drawer.hidden = true;
      if (overlay) overlay.hidden = true;
      document.body.style.overflow = '';
    }

    closeBtn?.addEventListener('click', cerrarDrawer, { signal });
    overlay?.addEventListener('click', cerrarDrawer, { signal });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer && !drawer.hidden) cerrarDrawer();
    }, { signal });
  }

  function normalizarBusqueda(texto) {
    return String(texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function onSearch(valor, container) {
    const q = normalizarBusqueda(valor);
    const emp = container?.querySelector('#filtro-empleado');
    const area = container?.querySelector('#filtro-area');
    const cargo = container?.querySelector('#filtro-cargo');
    if (!emp || !area || !cargo) return;

    const cambiar = (select) => select?.dispatchEvent(new Event('change', { bubbles: true }));
    const limpiar = () => {
      emp.value = '';
      area.value = '';
      cambiar(area);
      cargo.value = '';
      cambiar(cargo);
      cambiar(emp);
    };

    if (!q) {
      limpiar();
      return;
    }

    const empleado = [...emp.options].find((option) =>
      option.value && normalizarBusqueda(option.textContent).includes(q)
    );
    if (empleado) {
      if (area.value) {
        area.value = '';
        cambiar(area);
      }
      cargo.value = '';
      emp.value = empleado.value;
      cambiar(emp);
      return;
    }

    const areaMatch = [...area.options].find((option) =>
      option.value && normalizarBusqueda(option.textContent).includes(q)
    );
    if (areaMatch) {
      emp.value = '';
      area.value = areaMatch.value;
      cambiar(area);
      cargo.value = '';
      cambiar(cargo);
      return;
    }

    const cargoMatch = [...cargo.options].find((option) =>
      option.value && normalizarBusqueda(option.textContent).includes(q)
    );
    if (cargoMatch) {
      emp.value = '';
      area.value = '';
      cambiar(area);
      cargo.value = cargoMatch.value;
      cambiar(cargo);
    }
  }

  window.DashboardModules.horarios = {
    titulo: 'Horarios',
    render,
    onSearch,
    onUnload() {
      destruirCharts();
      destruirEventos();
      const drawer = document.getElementById('drawer-detalle');
      const overlay = document.getElementById('drawer-overlay');
      if (drawer) drawer.hidden = true;
      if (overlay) overlay.hidden = true;
      document.body.style.overflow = '';
    }
  };
})();
