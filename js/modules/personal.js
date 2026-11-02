/* ========================================
   Módulo Personal — INNOVATION NFC E.S.F
   Bloque 2: Gestión de plantilla y contratos con ChartTheme Premium
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

  function empleadosVisibles(ctx) {
    const base = ctx.rol === 'jefe'
      ? (ctx.empleado?.areasSupervisadas || []).includes('todas')
        ? ctx.empleados
        : ctx.empleados.filter((emp) => (ctx.empleado?.areasSupervisadas || []).includes(emp.area))
      : ctx.empleados;

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

  function obtenerEstadosContrato() {
    return ['vigente', 'por_vencer', 'vencido'];
  }

  function filtrarEmpleados(empleados, filtros) {
    return empleados.filter((emp) => {
      if (filtros.busqueda) {
        const q = filtros.busqueda.toLowerCase();
        const nombre = (emp.nombre || '').toLowerCase();
        const usuario = (emp.usuario || '').toLowerCase();
        const dni = (emp.dni || '').toLowerCase();
        if (!nombre.includes(q) && !usuario.includes(q) && !dni.includes(q)) return false;
      }
      if (filtros.area && emp.area !== filtros.area) return false;
      if (filtros.cargo && emp.puesto !== filtros.cargo) return false;
      if (filtros.estadoContrato && emp.contrato?.estado !== filtros.estadoContrato) return false;
      return true;
    });
  }

  function datosPlantillaPorArea(empleados) {
    const porArea = {};
    empleados.forEach((emp) => { porArea[emp.area] = (porArea[emp.area] || 0) + 1; });
    return Object.entries(porArea)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
      .map(([area, count]) => ({ area, count }));
  }

  function datosContratosPorEstado(empleados) {
    const estados = { vigente: 0, por_vencer: 0, vencido: 0 };
    empleados.forEach((emp) => {
      if (emp.contrato?.estado && Object.prototype.hasOwnProperty.call(estados, emp.contrato.estado)) estados[emp.contrato.estado]++;
    });
    return [
      { estado: 'vigente', count: estados.vigente, label: 'Vigentes', color: '#6FA96F' },
      { estado: 'por_vencer', count: estados.por_vencer, label: 'Por vencer', color: '#D19E33' },
      { estado: 'vencido', count: estados.vencido, label: 'Vencidos', color: '#C45F3F' }
    ].filter((e) => e.count > 0);
  }

  function limiteEje(valor) {
    if (!valor) return 5;
    const paso = valor <= 5 ? 1 : valor <= 10 ? 2 : valor <= 20 ? 5 : valor <= 50 ? 10 : 20;
    return Math.ceil((valor * 1.15) / paso) * paso;
  }

  function pasoEje(valor) {
    if (valor <= 6) return 1;
    if (valor <= 12) return 2;
    if (valor <= 30) return 5;
    if (valor <= 60) return 10;
    return 20;
  }

  const pluginEtiquetasValor = {
    id: 'personalEtiquetasValor',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      chart.data.datasets.forEach((dataset, index) => {
        if (!dataset._showValues || !chart.isDatasetVisible(index)) return;
        const meta = chart.getDatasetMeta(index);
        if (!meta?.data?.length) return;

        const horizontal = chart.options.indexAxis === 'y';
        ctx.save();
        ctx.font = '600 10px "Plus Jakarta Sans", Inter, sans-serif';
        ctx.fillStyle = dataset._valueColor || '#55524B';
        ctx.textAlign = horizontal ? 'left' : 'center';
        ctx.textBaseline = horizontal ? 'middle' : 'bottom';

        meta.data.forEach((element, i) => {
          const value = dataset.data[i];
          if (value == null) return;
          const text = dataset._valueFormatter ? dataset._valueFormatter(value) : String(value);
          if (horizontal) {
            ctx.fillText(text, element.x + 6, element.y);
          } else {
            ctx.fillText(text, element.x, element.y - 4);
          }
        });

        ctx.restore();
      });
    }
  };

  function renderFiltros(areas, cargos, estadosContrato, filtrosActuales, modoLectura) {
    return `
      <section class="filters-bar personal-filters" role="search" aria-label="Filtros de personal">
        <div class="filters-left">
          <div class="filter-group filter-search">
            <label for="filtro-busqueda" class="visually-hidden">Buscar</label>
            <div class="input-con-icono">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="search" id="filtro-busqueda" class="filter-input" placeholder="Buscar por nombre, usuario o DNI..." value="${UI.esc(filtrosActuales.busqueda || '')}" ${modoLectura ? '' : 'autofocus'}>
            </div>
          </div>
          <div class="filter-group">
            <select id="filtro-area" class="filter-select" aria-label="Filtrar por área">
              <option value="">Todas las áreas</option>
              ${areas.map((a) => `<option value="${UI.esc(a)}" ${filtrosActuales.area === a ? 'selected' : ''}>${UI.esc(a)}</option>`).join('')}
            </select>
          </div>
          <div class="filter-group">
            <select id="filtro-cargo" class="filter-select" aria-label="Filtrar por cargo">
              <option value="">Todos los cargos</option>
              ${cargos.map((c) => `<option value="${UI.esc(c)}" ${filtrosActuales.cargo === c ? 'selected' : ''}>${UI.esc(c)}</option>`).join('')}
            </select>
          </div>
          <div class="filter-group">
            <select id="filtro-estado" class="filter-select" aria-label="Filtrar por estado de contrato">
              <option value="">Todos los estados</option>
              ${estadosContrato.map((e) => `<option value="${e}" ${filtrosActuales.estadoContrato === e ? 'selected' : ''}>${UI.esc(UI.estadoContratoLabel(e))}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="filters-right">
          ${!modoLectura ? `
            <button type="button" class="btn btn-primary" id="btn-agregar-personal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Agregar personal
            </button>
          ` : ''}
        </div>
      </section>
    `;
  }

  function renderTablaEmpleados(empleados, modoLectura) {
    if (!empleados.length) {
      return UI.emptyState('Sin resultados', 'No hay empleados que coincidan con los filtros actuales.', '👥');
    }
    return `
      <div class="table-wrap" role="region" aria-label="Tabla de personal" tabindex="0">
        <table class="data-table" id="tabla-personal">
          <thead>
            <tr>
              <th scope="col">Empleado</th>
              <th scope="col">Área</th>
              <th scope="col">Cargo</th>
              <th scope="col">Tipo contrato</th>
              <th scope="col">Inicio</th>
              <th scope="col">Fin</th>
              <th scope="col">Estado</th>
              ${!modoLectura ? '<th scope="col">Acciones</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${empleados.map((emp) => `
              <tr data-id="${UI.esc(emp.id)}" tabindex="0" role="button" aria-label="Ver ficha de ${UI.esc(emp.nombre)}">
                <td class="col-empleado">
                  ${UI.avatar(emp.nombre, 'avatar-sm')}
                  <strong>${UI.esc(emp.nombre)}</strong>
                </td>
                <td>${UI.esc(emp.area || '—')}</td>
                <td>${UI.esc(emp.puesto || '—')}</td>
                <td>${UI.esc(UI.contratoLabel(emp.contrato?.tipo))}</td>
                <td>${UI.esc(UI.fechaCorta(emp.contrato?.inicio))}</td>
                <td>${UI.esc(emp.contrato?.fin ? UI.fechaCorta(emp.contrato.fin) : 'Indefinido')}</td>
                <td>${UI.badgeContrato(emp.contrato?.estado)}</td>
                ${!modoLectura ? `
                  <td>
                    <button type="button" class="icon-btn btn-ver-ficha" data-id="${UI.esc(emp.id)}" aria-label="Ver ficha de ${UI.esc(emp.nombre)}" aria-haspopup="dialog">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  </td>
                ` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderVencimientos(empleados) {
    const periodos = [
      { dias: 15, label: '15 días', tono: 'danger' },
      { dias: 30, label: '30 días', tono: 'danger' },
      { dias: 60, label: '60 días', tono: 'warning' },
      { dias: 90, label: '90 días', tono: 'accent' }
    ];
    const vencidos = empleados.filter((e) => e.contrato?.estado === 'vencido');

    return `
      <section class="panel-section" aria-labelledby="vencimientos-title">
        <div class="section-head">
          <h2 id="vencimientos-title">Contratos por vencer</h2>
          <p>Próximos a vencer desde el corte 30/10/2026 · ${vencidos.length} ya vencidos</p>
        </div>
        <div class="vencimientos-grid">
          ${periodos.map((p) => {
            const lista = empleados.filter((emp) => {
              if (!emp.contrato?.fin) return false;
              const fin = new Date(emp.contrato.fin + 'T12:00:00');
              const corte = new Date(2026, 9, 30);
              return fin > corte && fin <= new Date(corte.getTime() + p.dias * 86400000);
            });
            return `
              <article class="vencimiento-card vencimiento-${p.tono}">
                <div class="vencimiento-head">
                  <h3>${UI.esc(p.label)}</h3>
                  <span class="vencimiento-count">${UI.fmtNumero(lista.length)}</span>
                </div>
                <ul class="vencimiento-lista">
                  ${lista.length ? lista.slice(0, 5).map((emp) => `
                    <li>
                      <div>
                        <strong>${UI.esc(emp.nombre)}</strong>
                        <small>${UI.esc(emp.area)} · ${UI.esc(UI.contratoLabel(emp.contrato.tipo))}</small>
                      </div>
                      <div class="vencimiento-fecha">
                        ${UI.badgeContrato(emp.contrato.estado)}
                        <small>${UI.esc(UI.fechaCorta(emp.contrato.fin))}</small>
                      </div>
                    </li>
                  `).join('') : '<li class="vencimiento-vacio">Sin contratos en este rango</li>'}
                </ul>
                ${lista.length > 5 ? `<p class="vencimiento-mas">+${lista.length - 5} más...</p>` : ''}
              </article>
            `;
          }).join('')}
        </div>
        ${vencidos.length ? `
          <article class="vencimiento-card vencimiento-danger" style="margin-top: 12px;">
            <div class="vencimiento-head">
              <h3>⚠️ Ya vencidos</h3>
              <span class="vencimiento-count">${UI.fmtNumero(vencidos.length)}</span>
            </div>
            <ul class="vencimiento-lista">
              ${vencidos.slice(0, 5).map((emp) => `
                <li>
                  <div>
                    <strong>${UI.esc(emp.nombre)}</strong>
                    <small>${UI.esc(emp.area)} · ${UI.esc(UI.contratoLabel(emp.contrato.tipo))}</small>
                  </div>
                  <div class="vencimiento-fecha">
                    ${UI.badgeContrato(emp.contrato.estado)}
                    <small>${UI.esc(UI.fechaCorta(emp.contrato.fin))}</small>
                  </div>
                </li>
              `).join('')}
            </ul>
            ${vencidos.length > 5 ? `<p class="vencimiento-mas">+${vencidos.length - 5} más...</p>` : ''}
          </article>
        ` : ''}
      </section>
    `;
  }

  function renderKPIs(empleados, visibles) {
    const porVencer = visibles.filter((e) => e.contrato?.estado === 'por_vencer').length;
    const vencidos = visibles.filter((e) => e.contrato?.estado === 'vencido').length;
    const areas = obtenerAreas(visibles).length;

    return `
      <div class="kpi-section" role="region" aria-label="Indicadores de plantilla">
        ${UI.kpiCard({
          label: 'Total plantilla',
          valor: UI.fmtNumero(empleados.length),
          detalle: `${UI.fmtNumero(visibles.length)} en tu alcance · ${areas} áreas`,
          tono: 'success',
          icono: '👥'
        })}
        ${UI.kpiCard({
          label: 'Áreas',
          valor: UI.fmtNumero(areas),
          detalle: 'Distribución geográfica',
          icono: '🏢'
        })}
        ${UI.kpiCard({
          label: 'Por vencer (90d)',
          valor: UI.fmtNumero(porVencer),
          detalle: 'Requieren renovación',
          tono: 'warning',
          icono: '📄'
        })}
        ${UI.kpiCard({
          label: 'Vencidos',
          valor: UI.fmtNumero(vencidos),
          detalle: 'Acción inmediata',
          tono: 'danger',
          icono: '⚠️'
        })}
      </div>
    `;
  }

  function renderGraficos(datosArea, datosContratos) {
    const total = datosArea.reduce((acc, item) => acc + item.count, 0);
    return `
      <section class="charts-section" aria-label="Gráficos de plantilla">
        <div class="charts-grid">
          <article class="chart-card" aria-labelledby="grafico-area-title">
            <div class="chart-header">
              <h3 id="grafico-area-title">Plantilla por área</h3>
              <p class="chart-subtitle">Distribución de ${UI.fmtNumero(total)} empleados · ${datosArea.length} áreas</p>
            </div>
            <div class="chart-wrap chart-wrap-personal-area">
              <canvas id="chart-plantilla-area" aria-label="Empleados por área"></canvas>
            </div>
          </article>
          <article class="chart-card" aria-labelledby="grafico-contratos-title">
            <div class="chart-header">
              <h3 id="grafico-contratos-title">Contratos por estado</h3>
              <p class="chart-subtitle">Vigentes, por vencer y vencidos · ${UI.fmtNumero(datosContratos.reduce((acc, item) => acc + item.count, 0))} colaboradores</p>
            </div>
            <div class="doughnut-layout">
              <div class="doughnut-canvas"><canvas id="chart-contratos-estado" aria-label="Contratos por estado"></canvas></div>
              <div class="chart-legend chart-legend-vertical" id="legend-contratos-estado"></div>
            </div>
          </article>
        </div>
      </section>
    `;
  }

  function renderContenidoFicha(emp) {
    const esReal = emp.esReal === true;
    return `
      <div class="modal-header">
        <div>
          <span class="modal-eyebrow">Personal · Ficha 360</span>
          <h2 id="ficha-title">Ficha del empleado</h2>
        </div>
        <button type="button" class="modal-close" id="cerrar-ficha" aria-label="Cerrar">✕</button>
      </div>
      <div class="modal-body">
        <div class="ficha-grid">
          <div class="ficha-perfil">
            <div class="ficha-avatar">${UI.esc(UI.iniciales(emp.nombre))}</div>
            <h3>${UI.esc(emp.nombre)}</h3>
            <p>${UI.esc(emp.puesto || '—')} · ${UI.esc(emp.area || '—')}</p>
            <span class="role-chip role-${UI.esc(emp.rol)}">${UI.esc(UI.rolLabel(emp.rol))}</span>
            ${esReal ? '<span class="badge badge-accent" style="margin-top:8px;">Cuenta real</span>' : ''}
          </div>
          <div class="ficha-datos">
            <div class="ficha-row"><strong>ID</strong><span>${UI.esc(emp.id)}</span></div>
            <div class="ficha-row"><strong>Usuario</strong><span>${UI.esc(emp.usuario)}</span></div>
            <div class="ficha-row"><strong>Email</strong><span>${UI.esc(emp.email)}</span></div>
            <div class="ficha-row"><strong>DNI</strong><span>${UI.esc(emp.dni || '—')}</span></div>
            <div class="ficha-row"><strong>Teléfono</strong><span>${UI.esc(emp.telefono || '—')}</span></div>
            <div class="ficha-row"><strong>Nacimiento</strong><span>${UI.esc(UI.fechaLarga(emp.fechaNacimiento))}</span></div>
            <div class="ficha-row"><strong>Ingreso</strong><span>${UI.esc(UI.fechaLarga(emp.fechaIngreso))}</span></div>
            <div class="ficha-row"><strong>Departamento</strong><span>${UI.esc(emp.departamento || '—')}</span></div>
            <div class="ficha-row"><strong>Serie NFC</strong><span>${UI.esc(emp.serie)}</span></div>
            <div class="ficha-row"><strong>UID NFC</strong><span>${UI.esc(emp.uidNFC)}</span></div>
          </div>
        </div>
        <div class="ficha-seccion">
          <h4>Contacto de emergencia</h4>
          <div class="ficha-row"><strong>Nombre</strong><span>${UI.esc(emp.contactoEmergencia?.nombre || '—')}</span></div>
          <div class="ficha-row"><strong>Teléfono</strong><span>${UI.esc(emp.contactoEmergencia?.telefono || '—')}</span></div>
        </div>
        <div class="ficha-seccion">
          <h4>Contrato</h4>
          <div class="ficha-row"><strong>Tipo</strong><span>${UI.esc(UI.contratoLabel(emp.contrato?.tipo))}</span></div>
          <div class="ficha-row"><strong>Inicio</strong><span>${UI.esc(UI.fechaLarga(emp.contrato?.inicio))}</span></div>
          <div class="ficha-row"><strong>Fin</strong><span>${UI.esc(emp.contrato?.fin ? UI.fechaLarga(emp.contrato.fin) : 'Indefinido')}</span></div>
          <div class="ficha-row"><strong>Estado</strong><span>${UI.badgeContrato(emp.contrato?.estado)}</span></div>
        </div>
        <div class="ficha-seccion">
          <h4>Documentos</h4>
          <ul class="documentos-lista">
            ${(emp.documentos || []).map((doc) => `
              <li>
                <span class="doc-icon">${doc.tipo === 'dni' ? '🆔' : '📄'}</span>
                <span>${UI.esc(doc.nombre)}</span>
                <span class="badge badge-neutral">${UI.esc(doc.estado)}</span>
              </li>
            `).join('')}
          </ul>
        </div>
        ${emp.areasSupervisadas?.length ? `
          <div class="ficha-seccion">
            <h4>Áreas supervisadas</h4>
            <p>${UI.esc(emp.areasSupervisadas.join(', '))}</p>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderModalFicha() {
    return `
      <div class="modal-overlay" id="modal-ficha" role="dialog" aria-modal="true" aria-labelledby="ficha-title" hidden>
        <div class="modal-card modal-lg modal-ficha" id="ficha-contenido"></div>
      </div>
    `;
  }

  // ============================================================
  // Gráficos con ChartTheme
  // ============================================================

  function colorDeArea(area) {
    return window.ChartTheme?.colorArea ? window.ChartTheme.colorArea(area) : '#E88D2A';
  }

  function crearBarChartHorizontal(canvasId, data) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx || !window.Chart || !window.ChartTheme) return;
    if (charts[canvasId]) charts[canvasId].destroy();

    const labels = data.map((d) => d.label);
    const values = data.map((d) => d.value);
    const maxValue = values.length ? Math.max(...values) : 0;
    const xMax = limiteEje(maxValue);
    const colors = data.map((d) => colorDeArea(d.label));
    const tooltipBase = window.ChartTheme.premiumTooltip;

    charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Empleados',
          data: values,
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 0,
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 22,
          _showValues: true,
          _valueFormatter: (value) => String(value),
          _valueColor: '#55524B'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        devicePixelRatio: Math.max(2, window.devicePixelRatio || 1),
        layout: { padding: { right: 32 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltipBase,
            callbacks: {
              ...tooltipBase.callbacks,
              label: (item) => `  ${item.label}: ${item.parsed.x} ${item.parsed.x === 1 ? 'empleado' : 'empleados'}`
            }
          }
        },
        scales: {
          x: {
            min: 0,
            max: xMax,
            grid: { color: 'rgba(30,30,30,0.04)', drawBorder: false },
            ticks: { color: '#8B887E', font: { size: 10 }, precision: 0, stepSize: pasoEje(xMax), maxTicksLimit: 8 }
          },
          y: {
            grid: { display: false, drawBorder: false },
            ticks: { color: '#8B887E', font: { size: 10 }, autoSkip: false }
          }
        },
        animation: { duration: 800, easing: 'easeOutQuart' }
      },
      plugins: [pluginEtiquetasValor]
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
            callbacks: { label: (item) => `  ${item.label}: ${item.parsed} (${total ? Math.round((item.parsed / total) * 100) : 0}%)` }
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

  function montarGraficos(datosArea, datosContratos) {
    if (!window.Chart || !window.ChartTheme) return;
    requestAnimationFrame(() => {
      crearBarChartHorizontal('chart-plantilla-area', datosArea.map((d) => ({ label: d.area, value: d.count })));
      crearDoughnutChart(
        'chart-contratos-estado',
        datosContratos.map((d) => d.label),
        datosContratos.map((d) => d.count),
        datosContratos.map((d) => d.color),
        'legend-contratos-estado'
      );
    });
  }

  function render(container, ctx) {
    destruirEventos();

    const todos = ctx.empleados;
    const visibles = empleadosVisibles(ctx);
    const modoLectura = esModoLectura(ctx);
    const areas = obtenerAreas(visibles);
    const cargos = obtenerCargos(visibles);
    const estadosContrato = obtenerEstadosContrato();

    const storageKey = `filtros_personal_${ctx.rol}`;
    let filtros = { busqueda: '', area: '', cargo: '', estadoContrato: '' };
    try { const g = sessionStorage.getItem(storageKey); if (g) filtros = { ...filtros, ...JSON.parse(g), busqueda: '' }; } catch {}

    let empleadosFiltrados = filtrarEmpleados(visibles, filtros);
    const datosArea = datosPlantillaPorArea(visibles);
    const datosContratos = datosContratosPorEstado(visibles);

    container.innerHTML = `
      ${UI.pageHeader({
        eyebrow: 'Personal',
        titulo: 'Gestión de plantilla',
        descripcion: modoLectura ? 'Modo lectura: solo áreas supervisadas' : 'Búsqueda, filtros, vencimientos y ficha 360'
      })}

      ${renderKPIs(todos, visibles)}

      ${renderFiltros(areas, cargos, estadosContrato, filtros, modoLectura)}

      <div id="personal-tabla-wrap">${renderTablaEmpleados(empleadosFiltrados, modoLectura)}</div>

      ${renderVencimientos(visibles)}
      ${renderGraficos(datosArea, datosContratos)}
    `;

    if (!document.getElementById('modal-ficha')) {
      document.body.insertAdjacentHTML('beforeend', renderModalFicha());
    }

    const search = document.getElementById('filtro-busqueda');
    const area = document.getElementById('filtro-area');
    const cargo = document.getElementById('filtro-cargo');
    const estado = document.getElementById('filtro-estado');
    const btnAgregar = document.getElementById('btn-agregar-personal');
    const modalFichaEl = document.getElementById('modal-ficha');

    if (modalFichaEl) {
      modalFichaEl.hidden = true;
      document.body.classList.remove('modal-open');
    }

    const controller = new AbortController();
    const { signal } = controller;
    limpiarEventos = () => controller.abort();

    let ultimoFoco = null;

    const aplicarFiltros = () => {
      if (signal.aborted) return;
      filtros = {
        busqueda: search?.value.trim() || '',
        area: area?.value || '',
        cargo: cargo?.value || '',
        estadoContrato: estado?.value || ''
      };
      sessionStorage.setItem(`filtros_personal_${ctx.rol}`, JSON.stringify({ area: filtros.area, cargo: filtros.cargo, estadoContrato: filtros.estadoContrato }));
      empleadosFiltrados = filtrarEmpleados(visibles, filtros);
      const tablaWrap = document.getElementById('personal-tabla-wrap');
      if (tablaWrap) tablaWrap.innerHTML = renderTablaEmpleados(empleadosFiltrados, modoLectura);
    };

    search?.addEventListener('input', UI.debounce ? UI.debounce(aplicarFiltros, 300) : aplicarFiltros, { signal });
    area?.addEventListener('change', () => {
      const areaSel = area?.value || '';
      const cargosFiltrados = areaSel
        ? [...new Set(visibles.filter((e) => e.area === areaSel).map((e) => e.puesto))].sort((a, b) => a.localeCompare(b, 'es'))
        : obtenerCargos(visibles);
      if (cargo) {
        const val = cargo.value;
        cargo.innerHTML = '<option value="">Todos los cargos</option>' + cargosFiltrados.map((c) => `<option value="${UI.esc(c)}" ${val === c ? 'selected' : ''}>${UI.esc(c)}</option>`).join('');
      }
      if (filtros.cargo && !cargosFiltrados.includes(filtros.cargo)) filtros.cargo = '';
      aplicarFiltros();
    }, { signal });
    cargo?.addEventListener('change', aplicarFiltros, { signal });
    estado?.addEventListener('change', aplicarFiltros, { signal });

    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-ver-ficha');
      if (btn) {
        const emp = visibles.find((em) => em.id === btn.dataset.id);
        if (emp) { e.preventDefault(); abrirFicha(emp, btn); }
        return;
      }
      const row = e.target.closest('#tabla-personal tr[data-id]');
      if (row) {
        const emp = visibles.find((em) => em.id === row.dataset.id);
        if (emp) abrirFicha(emp, row);
      }
    }, { signal });

    container.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const row = e.target.closest('#tabla-personal tr[data-id]');
        if (row) {
          e.preventDefault();
          const emp = visibles.find((em) => em.id === row.dataset.id);
          if (emp) abrirFicha(emp, row);
        }
      }
    }, { signal });

    modalFichaEl?.addEventListener('click', (e) => {
      if (e.target.closest('#cerrar-ficha')) {
        e.preventDefault();
        cerrarModalFicha();
        return;
      }
      if (e.target === modalFichaEl) cerrarModalFicha();
    }, { signal });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalFichaEl && !modalFichaEl.hidden) cerrarModalFicha();
    }, { signal });

    function abrirFicha(emp, origen) {
      if (!modalFichaEl) return;
      const contenido = modalFichaEl.querySelector('.modal-card');
      if (!contenido) return;
      ultimoFoco = origen || document.activeElement;
      contenido.innerHTML = renderContenidoFicha(emp);
      modalFichaEl.hidden = false;
      document.body.classList.add('modal-open');
      modalFichaEl.querySelector('#cerrar-ficha')?.focus();
    }

    function cerrarModalFicha() {
      if (!modalFichaEl) return;
      modalFichaEl.hidden = true;
      document.body.classList.remove('modal-open');
      const foco = ultimoFoco;
      ultimoFoco = null;
      if (foco && document.contains(foco) && typeof foco.focus === 'function') foco.focus();
    }

    btnAgregar?.addEventListener('click', () => {
      sessionStorage.setItem('perfiles_alta', '1');
      window.location.hash = '#/perfiles';
    }, { signal });

    montarGraficos(datosArea, datosContratos);
  }

  function onSearch(valor, container) {
    const input = container?.querySelector('#filtro-busqueda');
    if (!input) return;
    input.value = String(valor || '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  window.DashboardModules.personal = {
    titulo: 'Personal',
    render,
    onSearch,
    onUnload() {
      destruirCharts();
      destruirEventos();
      const modal = document.getElementById('modal-ficha');
      if (modal) modal.hidden = true;
      document.body.classList.remove('modal-open');
    }
  };
})();
