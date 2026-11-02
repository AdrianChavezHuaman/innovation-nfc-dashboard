/* ========================================
   Módulo Panel — INNOVATION NFC E.S.F
   Bloque 1: Panel completo con gráficos ChartTheme Premium
   ======================================== */

(function () {
  'use strict';

  window.DashboardModules = window.DashboardModules || {};

  const TIPO_MARCA = {
    entrada: 'Entrada',
    almuerzo_salida: 'Salida a almuerzo',
    almuerzo_retorno: 'Retorno de almuerzo',
    salida: 'Salida final'
  };

  const OBJETIVO_DIARIO_MIN = 8 * 60;
  const OBJETIVO_SEMANAL_MIN = 48 * 60;

  // Paleta del Panel: deriva de los tokens cálidos del proyecto y añade
  // verdes/azules fríos para que los gráficos tengan contraste y armonía.
  const COLORES_PANEL = {
    dorado: '#E8C33F',
    doradoClaro: '#F5D25A',
    mostaza: '#C9A62E',
    ambar: '#D19E33',
    terracota: '#C45F3F',
    coral: '#D97757',
    salvia: '#6FA96F',
    salviaClara: '#8FBF8F',
    bosque: '#2F6B4F',
    marino: '#1E3A5F',
    acero: '#3E6B8A',
    gris: '#8B887E',
    tinta: '#55524B'
  };

  const COLORES_AREA = {
    Produccion: COLORES_PANEL.terracota,
    Logistica: COLORES_PANEL.coral,
    Gerencia: COLORES_PANEL.ambar,
    'RR.HH.': COLORES_PANEL.dorado,
    Mantenimiento: COLORES_PANEL.salvia,
    Limpieza: COLORES_PANEL.bosque,
    Seguridad: COLORES_PANEL.marino,
    Almacen: COLORES_PANEL.acero,
    Recepcion: COLORES_PANEL.gris,
    Soporte: COLORES_PANEL.mostaza,
    Direccion: COLORES_PANEL.salviaClara
  };

  function colorDeArea(area) {
    return COLORES_AREA[area] || COLORES_PANEL.marino;
  }

  function altoNitidez() {
    return Math.max(2, window.devicePixelRatio || 1);
  }

  function gradienteVertical(context, colorInferior, colorSuperior) {
    const chart = context.chart;
    const area = chart.chartArea;
    if (!area) return colorInferior;
    const gradiente = chart.ctx.createLinearGradient(0, area.bottom, 0, area.top);
    gradiente.addColorStop(0, colorInferior);
    gradiente.addColorStop(1, colorSuperior);
    return gradiente;
  }

  let charts = {};

  function destruirCharts() {
    Object.values(charts).forEach((chart) => chart.destroy && chart.destroy());
    charts = {};
  }

  function fechaISO(fecha) {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
  }

  function diasLaborablesDelMes(periodo = {}) {
    const corte = UI.parseFecha(periodo.fechaCorte) || new Date(2026, 9, 30, 12, 0, 0);
    const [anioPeriodo, mesPeriodo] = String(periodo.periodo || '').split('-').map(Number);
    const anio = anioPeriodo || corte.getFullYear();
    const mes = mesPeriodo ? mesPeriodo - 1 : corte.getMonth();
    const ultimoDia = new Date(anio, mes + 1, 0, 12, 0, 0).getDate();
    const dias = [];

    for (let dia = 1; dia <= ultimoDia; dia++) {
      const fecha = new Date(anio, mes, dia, 12, 0, 0);
      if (fecha.getDay() === 0) continue;
      dias.push({ fecha, iso: fechaISO(fecha), dia });
    }

    return dias;
  }

  function rangoSemana(semana) {
    if (!semana.dias.length) return '—';
    const inicio = UI.parseFecha(semana.dias[0].fecha);
    const fin = UI.parseFecha(semana.dias[semana.dias.length - 1].fecha);
    if (!inicio || !fin) return '—';
    return `${inicio.getDate()} al ${fin.getDate()} de ${UI.MESES[fin.getMonth()]} de ${fin.getFullYear()}`;
  }

  function calcularSemana(marcas, fechaCorte) {
    const corte = UI.parseFecha(fechaCorte);
    if (!corte) return { trabajados: 0, objetivo: OBJETIVO_SEMANAL_MIN, dias: [] };

    const lunes = new Date(corte);
    const offset = (lunes.getDay() + 6) % 7;
    lunes.setDate(lunes.getDate() - offset);

    const dias = [];
    let trabajados = 0;

    for (let i = 0; i < 6; i++) {
      const fecha = new Date(lunes);
      fecha.setDate(lunes.getDate() + i);
      const iso = fechaISO(fecha);
      const delDia = marcas.filter((m) => m.fecha === iso);
      const entrada = delDia.find((m) => m.tipo === 'entrada');
      const salidaAlmuerzo = delDia.find((m) => m.tipo === 'almuerzo_salida');
      const retorno = delDia.find((m) => m.tipo === 'almuerzo_retorno');
      const salida = delDia.find((m) => m.tipo === 'salida');

      let minutos = 0;
      if (entrada && salida) {
        minutos = UI.sumaMinutosEntre(entrada.hora, salida.hora);
        if (salidaAlmuerzo && retorno) {
          minutos -= UI.sumaMinutosEntre(salidaAlmuerzo.hora, retorno.hora);
        }
        minutos = Math.max(0, minutos);
      }
      trabajados += minutos;

      const nombre = UI.DIAS[fecha.getDay()];
      dias.push({
        fecha: iso,
        nombre,
        etiqueta: `${nombre.charAt(0).toUpperCase()}${nombre.slice(1, 3)} ${fecha.getDate()}`,
        dia: fecha.getDate(),
        minutos,
        presente: Boolean(entrada)
      });
    }

    return { trabajados, objetivo: OBJETIVO_SEMANAL_MIN, dias };
  }

  function ultimasMarcaciones(marcas) {
    return [...marcas]
      .sort((a, b) => String(b.timestamp || b.fecha + b.hora).localeCompare(String(a.timestamp || a.fecha + a.hora)))
      .slice(0, 6);
  }

  function construirAsistenciaDiaria(visibles, marcas, periodo) {
    const dias = diasLaborablesDelMes(periodo);
    const entradasPorFecha = new Map();

    marcas.forEach((m) => {
      if (m.tipo !== 'entrada') return;
      if (!entradasPorFecha.has(m.fecha)) entradasPorFecha.set(m.fecha, new Set());
      entradasPorFecha.get(m.fecha).add(m.empleadoId);
    });

    let totalPresentes = 0;
    let totalElegibles = 0;

    const items = dias.map((dia) => {
      const entradas = entradasPorFecha.get(dia.iso) || new Set();
      const elegibles = visibles.filter((emp) => !emp.fechaIngreso || emp.fechaIngreso <= dia.iso);
      const presentes = elegibles.reduce((total, emp) => total + (entradas.has(emp.id) ? 1 : 0), 0);
      const total = elegibles.length;

      totalPresentes += presentes;
      totalElegibles += total;

      return {
        ...dia,
        presentes,
        total,
        porcentaje: total ? Math.round((presentes / total) * 100) : 0
      };
    });

    return {
      items,
      promedio: totalElegibles ? Math.round((totalPresentes / totalElegibles) * 100) : 0,
      totalPresentes,
      totalElegibles
    };
  }

  function construirTardanzasPorArea(visibles, marcas) {
    const areaPorId = new Map(visibles.map((emp) => [emp.id, emp.area]));
    const conteo = new Map();

    visibles.forEach((emp) => {
      if (emp.area) conteo.set(emp.area, 0);
    });

    marcas.forEach((m) => {
      if (m.tipo !== 'entrada' || !m.esTardanza) return;
      const area = areaPorId.get(m.empleadoId);
      if (!area) return;
      conteo.set(area, (conteo.get(area) || 0) + 1);
    });

    const items = [...conteo.entries()]
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count || a.area.localeCompare(b.area, 'es'));

    return {
      items,
      total: items.reduce((total, item) => total + item.count, 0)
    };
  }

  function construirTardanzasPorDia(visibles, marcas, periodo) {
    const ids = new Set(visibles.map((emp) => emp.id));
    const dias = diasLaborablesDelMes(periodo);
    const conteo = new Map(dias.map((dia) => [dia.iso, 0]));

    marcas.forEach((m) => {
      if (m.tipo !== 'entrada' || !m.esTardanza || !ids.has(m.empleadoId)) return;
      if (conteo.has(m.fecha)) conteo.set(m.fecha, conteo.get(m.fecha) + 1);
    });

    const items = dias.map((dia) => ({ ...dia, count: conteo.get(dia.iso) || 0 }));

    return {
      items,
      total: items.reduce((total, item) => total + item.count, 0)
    };
  }

  function construirTopTardanzas(visibles, marcas) {
    const conteo = new Map(visibles.map((emp) => [emp.id, 0]));

    marcas.forEach((m) => {
      if (m.tipo !== 'entrada' || !m.esTardanza || !conteo.has(m.empleadoId)) return;
      conteo.set(m.empleadoId, (conteo.get(m.empleadoId) || 0) + 1);
    });

    const items = visibles
      .map((emp) => ({
        id: emp.id,
        nombre: emp.nombre,
        area: emp.area,
        tardanzas: conteo.get(emp.id) || 0
      }))
      .filter((emp) => emp.tardanzas > 0)
      .sort((a, b) => b.tardanzas - a.tardanzas || a.nombre.localeCompare(b.nombre, 'es'))
      .slice(0, 10);

    return { items, max: items[0]?.tardanzas || 0 };
  }

  function construirEstadosContrato(visibles) {
    const estados = { vigente: 0, por_vencer: 0, vencido: 0 };

    visibles.forEach((emp) => {
      const estado = emp.contrato?.estado;
      if (estado && Object.prototype.hasOwnProperty.call(estados, estado)) estados[estado]++;
    });

    return [
      { key: 'vigente', label: 'Vigentes', count: estados.vigente, color: COLORES_PANEL.salvia },
      { key: 'por_vencer', label: 'Por vencer', count: estados.por_vencer, color: COLORES_PANEL.ambar },
      { key: 'vencido', label: 'Vencidos', count: estados.vencido, color: COLORES_PANEL.terracota }
    ].filter((estado) => estado.count > 0);
  }

  function construirDatosPanel(ctx, semana) {
    const visibles = ctx.visibles || ctx.empleados;
    const marcas = ctx.asistencia.filter((m) => m.valida !== false);

    return {
      visibles,
      marcas,
      semana,
      asistencia: construirAsistenciaDiaria(visibles, marcas, ctx.periodo),
      tardanzasArea: construirTardanzasPorArea(visibles, marcas),
      tardanzasDia: construirTardanzasPorDia(visibles, marcas, ctx.periodo),
      topTardanzas: construirTopTardanzas(visibles, marcas),
      contratos: construirEstadosContrato(visibles)
    };
  }

  function renderPerfil(ctx) {
    const emp = ctx.empleado || {};
    const initials = UI.iniciales(emp.nombre);
    return `
      <article class="panel-profile">
        <div class="panel-profile-avatar">${UI.esc(initials)}</div>
        <div class="panel-profile-body">
          <div class="panel-profile-top">
            <div>
              <h2>${UI.esc(emp.nombre || 'Usuario')}</h2>
              <p>${UI.esc(emp.puesto || '—')} · ${UI.esc(emp.area || '—')}</p>
            </div>
            <span class="role-chip role-${UI.esc(ctx.rol)}">${UI.esc(UI.rolLabel(ctx.rol))}</span>
          </div>
          <div class="panel-profile-meta">
            <span><strong>DNI</strong> ${UI.esc(emp.dni || '—')}</span>
            <span><strong>Ingreso</strong> ${UI.esc(UI.fechaCorta(emp.fechaIngreso))}</span>
            <span><strong>Correo</strong> ${UI.esc(emp.email || ctx.user.email || '—')}</span>
            <span><strong>Contrato</strong> ${UI.esc(UI.contratoLabel(emp.contrato?.tipo))} ${UI.badgeContrato(emp.contrato?.estado)}</span>
          </div>
        </div>
      </article>
    `;
  }

  function renderSemana(semana) {
    const porcentaje = Math.round((semana.trabajados / semana.objetivo) * 100);
    const faltan = Math.max(0, semana.objetivo - semana.trabajados);
    return `
      <article class="panel-card panel-week">
        <div class="panel-card-head">
          <div>
            <h3>Jornada semanal</h3>
            <p>Semana del ${UI.esc(rangoSemana(semana))}</p>
          </div>
          <span class="panel-card-pill">${porcentaje}%</span>
        </div>
        <div class="week-numbers">
          <div><strong>${UI.fmtHoras(semana.trabajados)}</strong><span>Trabajadas</span></div>
          <div><strong>${UI.fmtHoras(faltan)}</strong><span>Faltantes</span></div>
          <div><strong>${UI.fmtHoras(semana.objetivo)}</strong><span>Objetivo</span></div>
        </div>
        ${UI.progressBar(porcentaje, 'Jornada semanal completada')}
        <div class="week-days">
          ${semana.dias.map((d) => `
            <div class="week-day ${d.presente ? 'is-present' : ''}">
              <span>${UI.esc(d.nombre)}</span>
              <strong>${d.dia}</strong>
              <small>${d.presente ? UI.fmtHoras(d.minutos) : 'Ausente'}</small>
            </div>
          `).join('')}
        </div>
      </article>
    `;
  }

  function renderMarcaciones(marcas) {
    const ultimas = ultimasMarcaciones(marcas);
    return `
      <article class="panel-card">
        <div class="panel-card-head">
          <div>
            <h3>Últimas marcaciones</h3>
            <p>Registros válidos de octubre 2026</p>
          </div>
          <span class="panel-card-pill">${UI.fmtNumero(marcas.length)} marcas</span>
        </div>
        ${ultimas.length ? `
          <ul class="mark-list">
            ${ultimas.map((m) => `
              <li>
                <span class="mark-dot mark-${UI.esc(m.tipo)}"></span>
                <div class="mark-body">
                  <strong>${UI.esc(TIPO_MARCA[m.tipo] || m.tipo)}</strong>
                  <small>${UI.esc(UI.fechaLarga(m.fecha))}${m.esTardanza ? ' · Tardanza' : ''}</small>
                </div>
                <time>${UI.esc(UI.hora12(m.hora))}</time>
              </li>
            `).join('')}
          </ul>
        ` : UI.emptyState('Sin marcaciones', 'Todavía no hay registros para este periodo.')}
      </article>
    `;
  }

  function renderReuniones(reuniones, fechaCorte) {
    return `
      <article class="panel-card">
        <div class="panel-card-head">
          <div>
            <h3>Reuniones</h3>
            <p>Agenda desde el ${UI.esc(UI.fechaCorta(fechaCorte))}</p>
          </div>
          <span class="panel-card-pill">${reuniones.length}</span>
        </div>
        ${reuniones.length ? `
          <ul class="meeting-list">
            ${reuniones.map((r) => `
              <li>
                <div class="meeting-date">
                  <strong>${UI.esc(UI.fechaDiaMes(r.fecha))}</strong>
                  <span>${UI.esc(UI.hora12(r.horaInicio))}</span>
                </div>
                <div class="meeting-body">
                  <strong>${UI.esc(r.titulo)}</strong>
                  <small>${UI.esc(r.lugar || '—')} · ${UI.esc(UI.acortar(r.descripcion, 70))}</small>
                </div>
              </li>
            `).join('')}
          </ul>
        ` : UI.emptyState('Sin reuniones próximas', 'Las reuniones programadas aparecerán aquí.')}
        <div class="panel-card-foot">
          <a href="#/calendario" class="panel-card-link">Abrir calendario →</a>
        </div>
      </article>
    `;
  }

  function renderContratos(contratos) {
    return `
      <article class="panel-card">
        <div class="panel-card-head">
          <div>
            <h3>Contratos por vencer</h3>
            <p>Alertas de los próximos 90 días</p>
          </div>
          <span class="panel-card-pill">${contratos.length}</span>
        </div>
        ${contratos.length ? `
          <ul class="contract-list">
            ${contratos.slice(0, 5).map((emp) => `
              <li>
                ${UI.avatar(emp.nombre, 'avatar-sm')}
                <div class="contract-body">
                  <strong>${UI.esc(emp.nombre)}</strong>
                  <small>${UI.esc(emp.area)} · ${UI.esc(UI.contratoLabel(emp.contrato.tipo))}</small>
                </div>
                <div class="contract-state">
                  ${UI.badgeContrato(emp.contrato.estado)}
                  <small>${UI.esc(UI.fechaCorta(emp.contrato.fin))}</small>
                </div>
              </li>
            `).join('')}
          </ul>
        ` : UI.emptyState('Sin contratos por vencer', 'No hay alertas de contrato en este periodo.')}
      </article>
    `;
  }

  // ============================================================
  // Plugins locales de Chart.js (sin CDN)
  // ============================================================

  const pluginEtiquetasValor = {
    id: 'panelEtiquetasValor',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      chart.data.datasets.forEach((dataset, index) => {
        if (!dataset._showValues || !chart.isDatasetVisible(index)) return;
        const meta = chart.getDatasetMeta(index);
        if (!meta?.data?.length) return;

        const horizontal = chart.options.indexAxis === 'y';
        ctx.save();
        ctx.font = '600 10px "Plus Jakarta Sans", Inter, sans-serif';
        ctx.fillStyle = dataset._valueColor || COLORES_PANEL.tinta;
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

  function pluginLineaReferencia(valor, etiqueta = '', color = COLORES_PANEL.gris) {
    return {
      id: 'panelLineaReferencia',
      afterDatasetsDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        const escalaY = scales?.y;
        if (!escalaY || !chartArea) return;

        const y = escalaY.getPixelForValue(valor);
        if (y < chartArea.top || y > chartArea.bottom) return;

        ctx.save();
        ctx.setLineDash([6, 5]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(chartArea.left, y);
        ctx.lineTo(chartArea.right, y);
        ctx.stroke();
        ctx.setLineDash([]);

        if (etiqueta) {
          ctx.font = '600 9px "Plus Jakarta Sans", Inter, sans-serif';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          const ancho = ctx.measureText(etiqueta).width;
          const x = chartArea.right - 2;
          const yTexto = y - 4;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.86)';
          ctx.fillRect(x - ancho - 5, yTexto - 11, ancho + 7, 13);
          ctx.fillStyle = color;
          ctx.fillText(etiqueta, x, yTexto);
        }
        ctx.restore();
      }
    };
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

  function tooltipBase(overrides = {}) {
    const base = window.ChartTheme.premiumTooltip;
    return {
      ...base,
      callbacks: {
        ...base.callbacks,
        ...overrides
      }
    };
  }

  // ============================================================
  // Helpers de gráficos
  // ============================================================

  function crearJornadaChart(canvasId, semana) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx || !window.Chart || !window.ChartTheme) return;
    if (charts[canvasId]) charts[canvasId].destroy();

    const labels = semana.dias.map((d) => d.etiqueta || d.nombre);
    const values = semana.dias.map((d) => d.presente ? Math.round((d.minutos / 60) * 10) / 10 : 0);

    charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Horas trabajadas',
          data: values,
          backgroundColor: (context) => gradienteVertical(
            context,
            'rgba(201, 166, 46, 0.82)',
            'rgba(245, 210, 90, 0.96)'
          ),
          borderColor: 'rgba(232, 195, 63, 0.55)',
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 38,
          _showValues: true,
          _valueFormatter: (value) => `${Number(value).toFixed(1)} h`,
          _valueColor: COLORES_PANEL.tinta
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        devicePixelRatio: altoNitidez(),
        layout: { padding: { top: 20 } },
        plugins: {
          legend: { display: false },
          tooltip: tooltipBase({
            label: (item) => `  ${Number(item.parsed.y).toFixed(1)} h trabajadas`
          })
        },
        scales: {
          x: {
            grid: { display: false, drawBorder: false },
            ticks: { color: COLORES_PANEL.gris, font: { size: 10 }, autoSkip: false }
          },
          y: {
            min: 0,
            suggestedMax: 12,
            grid: { color: 'rgba(30, 30, 30, 0.04)', drawBorder: false },
            ticks: {
              stepSize: 2,
              color: COLORES_PANEL.gris,
              font: { size: 10 },
              callback: (value) => `${value} h`
            }
          }
        },
        animation: { duration: 800, easing: 'easeOutQuart' }
      },
      plugins: [pluginLineaReferencia(OBJETIVO_DIARIO_MIN / 60, '', COLORES_PANEL.marino), pluginEtiquetasValor]
    });
  }

  function crearLineChart(canvasId, asistencia) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx || !window.Chart || !window.ChartTheme) return;
    if (charts[canvasId]) charts[canvasId].destroy();

    const labels = asistencia.items.map((dia) => String(dia.dia));
    const values = asistencia.items.map((dia) => dia.porcentaje);
    const fechas = asistencia.items.map((dia) => dia.iso);
    const presentes = asistencia.items.map((dia) => dia.presentes);
    const totales = asistencia.items.map((dia) => dia.total);

    charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: '% Asistencia',
          data: values,
          borderColor: COLORES_PANEL.bosque,
          backgroundColor: (context) => gradienteVertical(
            context,
            'rgba(47, 107, 79, 0.02)',
            'rgba(47, 107, 79, 0.24)'
          ),
          fill: true,
          tension: 0.35,
          pointRadius: 2.5,
          pointHoverRadius: 6,
          pointBackgroundColor: COLORES_PANEL.bosque,
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          pointHitRadius: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        devicePixelRatio: altoNitidez(),
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: tooltipBase({
            title: (items) => UI.fechaLarga(fechas[items[0].dataIndex]),
            label: (item) => `  ${item.parsed.y}% · ${presentes[item.dataIndex]} de ${totales[item.dataIndex]} empleados`
          })
        },
        scales: {
          x: {
            grid: { display: false, drawBorder: false },
            ticks: { color: COLORES_PANEL.gris, font: { size: 10 }, maxTicksLimit: 12, autoSkip: true }
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(30, 30, 30, 0.04)', drawBorder: false },
            ticks: {
              stepSize: 20,
              color: COLORES_PANEL.gris,
              font: { size: 10 },
              callback: (value) => `${value}%`
            }
          }
        },
        animation: { duration: 800, easing: 'easeOutQuart' }
      },
      plugins: [pluginLineaReferencia(asistencia.promedio, '', COLORES_PANEL.gris)]
    });
  }

  function crearBarHorizontal(canvasId, items, opciones = {}) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx || !window.Chart || !window.ChartTheme) return;
    if (charts[canvasId]) charts[canvasId].destroy();

    const labels = items.map((item) => item.label);
    const values = items.map((item) => item.value);
    const maxValue = values.length ? Math.max(...values) : 0;
    const xMax = limiteEje(maxValue);
    const colors = Array.isArray(opciones.colors) && opciones.colors.length
      ? opciones.colors
      : values.map(() => opciones.color || COLORES_PANEL.dorado);

    charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: opciones.datasetLabel || '',
          data: values,
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 0,
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: opciones.maxBarThickness || 24,
          _showValues: true,
          _valueFormatter: opciones.valueFormatter || ((value) => String(value)),
          _valueColor: COLORES_PANEL.tinta
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        devicePixelRatio: altoNitidez(),
        layout: { padding: { right: opciones.rightPadding || 26 } },
        plugins: {
          legend: { display: false },
          tooltip: tooltipBase({
            label: (item) => {
              const fila = items[item.dataIndex] || {};
              if (opciones.tooltipLabel) return `  ${opciones.tooltipLabel(item, fila)}`;
              return `  ${item.label}: ${item.parsed.x}`;
            }
          })
        },
        scales: {
          x: {
            min: 0,
            max: xMax,
            grid: { color: 'rgba(30, 30, 30, 0.04)', drawBorder: false },
            ticks: { color: COLORES_PANEL.gris, font: { size: 10 }, precision: 0, stepSize: pasoEje(xMax), maxTicksLimit: 8 }
          },
          y: {
            grid: { display: false, drawBorder: false },
            ticks: {
              color: COLORES_PANEL.gris,
              font: { size: 10 },
              autoSkip: false,
              callback: function (value) {
                const texto = this.getLabelForValue(value);
                return opciones.truncate ? UI.acortar(texto, opciones.truncate) : texto;
              }
            }
          }
        },
        animation: { duration: 800, easing: 'easeOutQuart' }
      },
      plugins: [pluginEtiquetasValor]
    });
  }

  function crearBarVertical(canvasId, items, opciones = {}) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx || !window.Chart || !window.ChartTheme) return;
    if (charts[canvasId]) charts[canvasId].destroy();

    const labels = items.map((item) => item.label);
    const values = items.map((item) => item.value);
    const maxValue = values.length ? Math.max(...values) : 0;
    const yMax = limiteEje(maxValue);
    const step = opciones.stepSize || (maxValue > 10 ? 5 : maxValue > 5 ? 2 : 1);

    charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: opciones.datasetLabel || '',
          data: values,
          backgroundColor: (context) => gradienteVertical(
            context,
            opciones.color || COLORES_PANEL.marino,
            opciones.colorTop || COLORES_PANEL.acero
          ),
          borderColor: opciones.borderColor || 'rgba(30, 58, 95, 0.35)',
          borderWidth: 1,
          borderRadius: 5,
          borderSkipped: false,
          maxBarThickness: 28,
          _showValues: Boolean(opciones.showValues),
          _valueFormatter: opciones.valueFormatter || ((value) => String(value)),
          _valueColor: COLORES_PANEL.tinta
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        devicePixelRatio: altoNitidez(),
        layout: { padding: { top: 16 } },
        plugins: {
          legend: { display: false },
          tooltip: tooltipBase({
            title: (tooltipItems) => opciones.tooltipTitle
              ? opciones.tooltipTitle(tooltipItems[0])
              : (tooltipItems[0]?.label || ''),
            label: (item) => {
              const fila = items[item.dataIndex] || {};
              if (opciones.tooltipLabel) return `  ${opciones.tooltipLabel(item, fila)}`;
              return `  ${item.parsed.y}`;
            }
          })
        },
        scales: {
          x: {
            grid: { display: false, drawBorder: false },
            ticks: { color: COLORES_PANEL.gris, font: { size: 10 }, maxTicksLimit: opciones.maxTicks || 12, autoSkip: true }
          },
          y: {
            min: 0,
            max: yMax,
            grid: { color: 'rgba(30, 30, 30, 0.04)', drawBorder: false },
            ticks: {
              stepSize: step,
              precision: 0,
              color: COLORES_PANEL.gris,
              font: { size: 10 }
            }
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
          borderWidth: 3,
          cutout: '70%',
          hoverOffset: 4,
          hoverBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        devicePixelRatio: altoNitidez(),
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
      crearJornadaChart('chart-semana-horas', datos.semana);
      crearLineChart('chart-asistencia-diaria', datos.asistencia);

      crearBarHorizontal(
        'chart-tardanzas-area',
        datos.tardanzasArea.items.map((item) => ({ label: item.area, value: item.count })),
        {
          colors: datos.tardanzasArea.items.map((item) => colorDeArea(item.area)),
          maxBarThickness: 20,
          rightPadding: 32,
          truncate: 18,
          tooltipLabel: (item, fila) => `${fila.label}: ${fila.value} ${fila.value === 1 ? 'tardanza' : 'tardanzas'}`
        }
      );

      crearDoughnutChart(
        'chart-contratos-estado',
        datos.contratos.map((estado) => estado.label),
        datos.contratos.map((estado) => estado.count),
        datos.contratos.map((estado) => estado.color),
        'legend-contratos-estado'
      );

      crearBarVertical(
        'chart-tardanzas-dia',
        datos.tardanzasDia.items.map((dia) => ({
          label: String(dia.dia),
          value: dia.count,
          iso: dia.iso,
          count: dia.count
        })),
        {
          color: COLORES_PANEL.marino,
          colorTop: COLORES_PANEL.acero,
          borderColor: 'rgba(30, 58, 95, 0.28)',
          maxTicks: 10,
          tooltipTitle: (item) => UI.fechaLarga(datos.tardanzasDia.items[item.dataIndex].iso),
          tooltipLabel: (item, fila) => `${fila.count} ${fila.count === 1 ? 'tardanza' : 'tardanzas'}`
        }
      );

      crearBarHorizontal(
        'chart-top-empleados',
        datos.topTardanzas.items.map((emp) => ({ label: emp.nombre, value: emp.tardanzas, area: emp.area })),
        {
          colors: datos.topTardanzas.items.map((emp) => colorDeArea(emp.area)),
          maxBarThickness: 24,
          rightPadding: 32,
          truncate: 24,
          tooltipLabel: (item, fila) => `${fila.label}${fila.area ? ` · ${fila.area}` : ''}: ${fila.value} tardanzas`
        }
      );
    });
  }

  // ============================================================
  // Render principal
  // ============================================================

  function render(container, ctx) {
    const visibles = ctx.visibles || ctx.empleados;
    const marcas = ctx.asistencia.filter((m) => m.valida !== false);
    const misMarcas = marcas.filter((m) => m.empleadoId === ctx.empleado?.id);
    const diasLaborables = diasLaborablesDelMes(ctx.periodo)
      .filter((dia) => dia.iso <= ctx.periodo.fechaCorte)
      .length;
    const semana = calcularSemana(misMarcas, ctx.periodo.fechaCorte);
    const datos = construirDatosPanel(ctx, semana);
    const reuniones = ctx.reuniones
      .filter((r) => r.estado !== 'cancelada' && String(r.fecha) >= String(ctx.periodo.fechaCorte))
      .slice(0, 6);
    const contratos = visibles
      .filter((emp) => emp.contrato && ['por_vencer', 'vencido'].includes(emp.contrato.estado))
      .sort((a, b) => String(a.contrato.fin).localeCompare(String(b.contrato.fin)));

    const misDias = new Set(misMarcas.filter((m) => m.tipo === 'entrada').map((m) => m.fecha));
    const miAsistencia = diasLaborables
      ? Math.min(100, Math.round((misDias.size / diasLaborables) * 100))
      : 0;
    const misTardanzas = misMarcas.filter((m) => m.tipo === 'entrada' && m.esTardanza).length;

    container.innerHTML = `
      ${UI.pageHeader({
        eyebrow: 'Panel',
        titulo: `Hola, ${(ctx.empleado?.nombre || 'Usuario').split(' ')[0]}`,
        descripcion: `Periodo octubre 2026 · Corte al ${UI.fechaLarga(ctx.periodo.fechaCorte)}`
      })}

      ${renderPerfil(ctx)}

      <div class="kpi-section">
        ${UI.kpiCard({ label: 'Mi asistencia', valor: `${miAsistencia}%`, detalle: `${misDias.size} de ${diasLaborables} días laborables`, tono: 'success', icono: '✅' })}
        ${UI.kpiCard({ label: 'Mis tardanzas', valor: UI.fmtNumero(misTardanzas), detalle: 'Entradas después de 07:40', tono: 'warning', icono: '⏱️' })}
        ${UI.kpiCard({ label: 'Mis marcas', valor: UI.fmtNumero(misMarcas.length), detalle: 'Registros válidos del mes', tono: 'primary', icono: '📌' })}
        ${UI.kpiCard({ label: 'Jornada semanal', valor: `${Math.round((semana.trabajados / semana.objetivo) * 100)}%`, detalle: `${UI.fmtHoras(semana.trabajados)} de ${UI.fmtHoras(semana.objetivo)}`, icono: '🕒' })}
      </div>

      <div class="panel-grid panel-grid-2">
        ${renderSemana(semana)}
        ${renderMarcaciones(misMarcas)}
      </div>

      <section class="charts-section">
        <div class="charts-grid">
          <article class="chart-card" aria-labelledby="chart-semana-horas-title">
            <div class="chart-header">
              <h3 id="chart-semana-horas-title">Horas trabajadas por día</h3>
              <p class="chart-subtitle">Semana del ${UI.esc(rangoSemana(semana))} · La línea punteada marca el objetivo de 8 h</p>
            </div>
            <div class="chart-wrap chart-wrap-semana">
              <canvas id="chart-semana-horas" aria-label="Horas trabajadas por día de la semana"></canvas>
            </div>
          </article>
          <article class="chart-card" aria-labelledby="chart-asistencia-diaria-title">
            <div class="chart-header">
              <h3 id="chart-asistencia-diaria-title">Asistencia diaria %</h3>
              <p class="chart-subtitle">Entradas válidas sobre personal activo · Promedio ${datos.asistencia.promedio}% · Octubre 2026</p>
            </div>
            <div class="chart-wrap chart-wrap-asistencia">
              <canvas id="chart-asistencia-diaria" aria-label="Porcentaje de asistencia por día"></canvas>
            </div>
          </article>
        </div>
        <div class="charts-grid">
          <article class="chart-card" aria-labelledby="chart-tardanzas-area-title">
            <div class="chart-header">
              <h3 id="chart-tardanzas-area-title">Tardanzas por área</h3>
              <p class="chart-subtitle">${UI.fmtNumero(datos.tardanzasArea.total)} tardanzas · ${datos.tardanzasArea.items.length} áreas · Octubre 2026</p>
            </div>
            <div class="chart-wrap chart-wrap-tardanzas-area">
              <canvas id="chart-tardanzas-area" aria-label="Tardanzas por área"></canvas>
            </div>
          </article>
          <article class="chart-card" aria-labelledby="chart-contratos-estado-title">
            <div class="chart-header">
              <h3 id="chart-contratos-estado-title">Estado de contratos</h3>
              <p class="chart-subtitle">Vigentes, por vencer y vencidos · ${UI.fmtNumero(visibles.length)} colaboradores</p>
            </div>
            <div class="doughnut-layout">
              <div class="doughnut-canvas"><canvas id="chart-contratos-estado" aria-label="Contratos por estado"></canvas></div>
              <div class="chart-legend chart-legend-vertical" id="legend-contratos-estado"></div>
            </div>
          </article>
        </div>
        <div class="charts-grid">
          <article class="chart-card" aria-labelledby="chart-tardanzas-dia-title">
            <div class="chart-header">
              <h3 id="chart-tardanzas-dia-title">Tardanzas por día</h3>
              <p class="chart-subtitle">Días laborables de octubre · Total ${UI.fmtNumero(datos.tardanzasDia.total)} tardanzas</p>
            </div>
            <div class="chart-wrap chart-wrap-tardanzas-dia">
              <canvas id="chart-tardanzas-dia" aria-label="Tardanzas por día"></canvas>
            </div>
          </article>
          <article class="chart-card" aria-labelledby="chart-top-empleados-title">
            <div class="chart-header">
              <h3 id="chart-top-empleados-title">Top 10 tardanzas</h3>
              <p class="chart-subtitle">Empleados con más entradas tardías · Color por área · Máximo ${datos.topTardanzas.max}</p>
            </div>
            <div class="chart-wrap chart-wrap-top">
              <canvas id="chart-top-empleados" aria-label="Top 10 empleados con tardanzas"></canvas>
            </div>
          </article>
        </div>
      </section>

      <div class="panel-grid panel-grid-2">
        ${renderReuniones(reuniones, ctx.periodo.fechaCorte)}
        ${renderContratos(contratos)}
      </div>

    `;

    montarGraficos(datos);
  }

  window.DashboardModules.panel = {
    titulo: 'Panel',
    render,
    onUnload() { destruirCharts(); }
  };
})();
