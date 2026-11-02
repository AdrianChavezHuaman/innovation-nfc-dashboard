/* ========================================
   Módulo Perfiles — Bloque 4
   Ficha 360, documentos, cumpleaños, justificaciones y alta de personal
   ======================================== */

(function () {
  'use strict';

  window.DashboardModules = window.DashboardModules || {};

  let charts = {};
  let limpiarEventos = null;
  let buscarHandler = null;

  const MOTIVOS_JUSTIFICACION = ['Enfermedad', 'Permiso personal', 'Trámite', 'Capacitación', 'Otro'];
  const BANCOS = ['BCP', 'BBVA', 'Interbank', 'Scotiabank', 'Banbif'];
  const TIPOS_CUENTA = ['Ahorros', 'Corriente'];
  const TIPOS_CONTRATO = [
    { valor: 'indefinido', label: 'Indefinido' },
    { valor: 'plazo_fijo', label: 'Plazo fijo' },
    { valor: 'practicante', label: 'Practicante' }
  ];

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
  // Helpers
  // ============================================================

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function fechaISO(fecha) {
    return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
  }

  function fechasPeriodo(ctx) {
    const [anio, mes] = String(ctx.periodo?.periodo || '2026-10').split('-').map(Number);
    const ultimo = new Date(anio, mes, 0, 12, 0, 0).getDate();
    const fechas = [];
    for (let dia = 1; dia <= ultimo; dia++) {
      const fecha = new Date(anio, mes - 1, dia, 12, 0, 0);
      if (fecha.getDay() !== 0) fechas.push(fechaISO(fecha));
    }
    return fechas;
  }

  function fechasActivas(emp, fechas) {
    return fechas.filter((fecha) => !emp.fechaIngreso || fecha >= emp.fechaIngreso);
  }

  function nombreDia(iso) {
    const fecha = UI.parseFecha(iso);
    return fecha ? UI.DIAS[fecha.getDay()] : '';
  }

  function mapaAsistencia(ctx, empId) {
    const mapa = {};
    (ctx.asistencia || []).forEach((m) => {
      if (m.empleadoId !== empId) return;
      if (m.valida === false) return;
      if (!mapa[m.fecha]) mapa[m.fecha] = {};
      mapa[m.fecha][m.tipo] = m;
    });
    return mapa;
  }

  function mapaJustificaciones(ctx, empId) {
    const mapa = {};
    (ctx.justificaciones || []).forEach((j) => {
      if (j.empleadoId !== empId || j.estado !== 'aprobada') return;
      mapa[j.fecha] = j;
    });
    return mapa;
  }

  function resumenEmpleado(emp, ctx) {
    const fechas = fechasActivas(emp, fechasPeriodo(ctx));
    const asistencia = mapaAsistencia(ctx, emp.id);
    const justificadas = mapaJustificaciones(ctx, emp.id);
    let diasConEntrada = 0;
    let tardanzas = 0;
    let faltas = 0;
    let totalJustificadas = 0;
    let totalMinutos = 0;
    let countEntradas = 0;
    const faltasPendientes = [];

    fechas.forEach((fecha) => {
      const m = asistencia[fecha];
      if (m?.entrada) {
        diasConEntrada++;
        if (m.entrada.esTardanza) tardanzas++;
        const [h, min] = String(m.entrada.hora || '00:00').split(':').map(Number);
        totalMinutos += (h * 60) + (min || 0);
        countEntradas++;
        return;
      }
      if (justificadas[fecha]) {
        totalJustificadas++;
        return;
      }
      faltas++;
      faltasPendientes.push({ fecha, nombre: nombreDia(fecha) });
    });

    const historial = (ctx.justificaciones || [])
      .filter((j) => j.empleadoId === emp.id)
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));

    return {
      fechas,
      diasConEntrada,
      tardanzas,
      faltas,
      justificadas: totalJustificadas,
      faltasPendientes,
      historial,
      pctAsistencia: fechas.length ? Math.round((diasConEntrada / fechas.length) * 100) : 0,
      promEntrada: countEntradas ? (() => { const prom = Math.round(totalMinutos / countEntradas); return `${pad(Math.floor(prom / 60))}:${pad(prom % 60)}`; })() : '—'
    };
  }

  function antiguedad(emp, ctx) {
    const inicio = UI.parseFecha(emp.fechaIngreso);
    const corte = UI.parseFecha(ctx.periodo?.fechaCorte) || new Date();
    if (!inicio) return '—';
    let meses = (corte.getFullYear() - inicio.getFullYear()) * 12 + (corte.getMonth() - inicio.getMonth());
    if (corte.getDate() < inicio.getDate()) meses--;
    meses = Math.max(0, meses);
    const anios = Math.floor(meses / 12);
    const resto = meses % 12;
    if (anios && resto) return `${anios} a ${resto} m`;
    if (anios) return `${anios} año${anios === 1 ? '' : 's'}`;
    return `${resto} mes${resto === 1 ? '' : 'es'}`;
  }

  function diasContrato(emp, ctx) {
    if (!emp.contrato?.fin) return 'Indefinido';
    const fin = UI.parseFecha(emp.contrato.fin);
    const corte = UI.parseFecha(ctx.periodo?.fechaCorte) || new Date();
    if (!fin) return '—';
    const dias = Math.round((fin - corte) / 86400000);
    if (dias < 0) return `Vencido hace ${Math.abs(dias)} días`;
    if (dias === 0) return 'Vence hoy';
    return `En ${dias} días`;
  }

  function edadActual(emp, ctx) {
    const nac = UI.parseFecha(emp.fechaNacimiento);
    const corte = UI.parseFecha(ctx.periodo?.fechaCorte) || new Date();
    if (!nac) return null;
    let edad = corte.getFullYear() - nac.getFullYear();
    const cumpleEsteAnio = new Date(corte.getFullYear(), nac.getMonth(), nac.getDate());
    if (corte < cumpleEsteAnio) edad--;
    return edad;
  }

  function siguienteCumple(emp, ctx) {
    const nac = UI.parseFecha(emp.fechaNacimiento);
    const base = UI.parseFecha(ctx.periodo?.fechaCorte) || new Date();
    if (!nac) return null;
    let siguiente = new Date(base.getFullYear(), nac.getMonth(), nac.getDate(), 12, 0, 0);
    const hoy = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 12, 0, 0);
    if (siguiente < hoy) siguiente = new Date(base.getFullYear() + 1, nac.getMonth(), nac.getDate(), 12, 0, 0);
    const dias = Math.round((siguiente - hoy) / 86400000);
    return {
      empleado: emp,
      fecha: fechaISO(siguiente),
      dia: siguiente.getDate(),
      mes: siguiente.getMonth(),
      edad: siguiente.getFullYear() - nac.getFullYear(),
      dias
    };
  }

  function cumpleaniosProximos(ctx, limite = 6) {
    return (ctx.empleados || [])
      .map((emp) => siguienteCumple(emp, ctx))
      .filter(Boolean)
      .sort((a, b) => a.dias - b.dias)
      .slice(0, limite);
  }

  function conteoMeses(ctx) {
    const conteo = Array(12).fill(0);
    (ctx.empleados || []).forEach((emp) => {
      const nac = UI.parseFecha(emp.fechaNacimiento);
      if (nac) conteo[nac.getMonth()]++;
    });
    return conteo;
  }

  function mascarar(valor, visibles = 4) {
    const texto = String(valor || '');
    if (!texto) return '—';
    return `•••• ${texto.slice(-visibles)}`;
  }

  function mascararCCI(valor) {
    return `•••• •••• •••• ${String(valor || '').slice(-4)}`;
  }

  function formatoMoneda(valor) {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2
    }).format(Number(valor) || 0);
  }

  function nombreCompleto(emp) {
    return UI.esc(emp?.nombre || 'Colaborador');
  }

  // ============================================================
  // Render del módulo
  // ============================================================

  function renderModuloKPIs(ctx) {
    const areas = new Set((ctx.empleados || []).map((e) => e.area).filter(Boolean));
    const mesCorte = String(ctx.periodo?.periodo || '2026-10').split('-')[1];
    const cumpleMes = (ctx.empleados || []).filter((emp) => {
      const nac = UI.parseFecha(emp.fechaNacimiento);
      return nac && String(nac.getMonth() + 1).padStart(2, '0') === String(mesCorte).padStart(2, '0');
    }).length;
    const justificaciones = (ctx.justificaciones || []).filter((j) => j.estado === 'aprobada').length;

    return `
      <div class="kpi-section perfiles-kpis">
        ${UI.kpiCard({ label: 'Colaboradores', valor: UI.fmtNumero(ctx.empleados.length), detalle: 'Plantilla visible', icono: '👥', tono: 'success' })}
        ${UI.kpiCard({ label: 'Áreas', valor: UI.fmtNumero(areas.size), detalle: 'Estructura organizacional', icono: '🏢' })}
        ${UI.kpiCard({ label: 'Cumpleaños del mes', valor: UI.fmtNumero(cumpleMes), detalle: 'Según fecha de corte', icono: '🎂', tono: 'warning' })}
        ${UI.kpiCard({ label: 'Justificaciones', valor: UI.fmtNumero(justificaciones), detalle: 'Faltas aprobadas', icono: '📎', tono: 'primary' })}
      </div>
    `;
  }

  function renderSelector(ctx, state, areas) {
    const trabajadores = state.area
      ? ctx.empleados.filter((emp) => emp.area === state.area).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      : [];

    return `
      <section class="perfiles-selector-card">
        <div class="perfiles-selector-head">
          <div>
            <span class="perfil-eyebrow">Ficha 360</span>
            <h2>Selección de colaborador</h2>
            <p>Elige un área y luego un trabajador para abrir su información detallada.</p>
          </div>
          <button type="button" class="btn btn-primary" id="btn-alta-perfil">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Agregar personal
          </button>
        </div>
        <div class="perfiles-selector-fields">
          <div class="filter-group">
            <label for="perfil-area" class="filter-label">Área</label>
            <select id="perfil-area" class="filter-select">
              <option value="">Selecciona un área</option>
              ${areas.map((area) => `<option value="${UI.esc(area)}" ${state.area === area ? 'selected' : ''}>${UI.esc(area)}</option>`).join('')}
            </select>
          </div>
          <div class="filter-group">
            <label for="perfil-empleado" class="filter-label">Trabajador</label>
            <select id="perfil-empleado" class="filter-select" ${state.area ? '' : 'disabled'}>
              <option value="">${state.area ? 'Selecciona un trabajador' : 'Primero selecciona un área'}</option>
              ${trabajadores.map((emp) => `<option value="${UI.esc(emp.id)}" ${state.empleadoId === emp.id ? 'selected' : ''}>${UI.esc(emp.nombre)} — ${UI.esc(emp.puesto)}</option>`).join('')}
            </select>
          </div>
        </div>
      </section>
    `;
  }

  function renderDataRow(label, valor) {
    return `<div class="perfil-data-row"><span>${UI.esc(label)}</span><strong>${valor || '—'}</strong></div>`;
  }

  function renderTabResumen(emp, datos, ctx) {
    return `
      <div class="perfil-mini-grid">
        <div class="perfil-mini"><span>Asistencia</span><strong>${datos.pctAsistencia}%</strong><small>${datos.diasConEntrada} de ${datos.fechas.length} jornadas</small></div>
        <div class="perfil-mini"><span>Tardanzas</span><strong>${datos.tardanzas}</strong><small>Entradas después de 07:40</small></div>
        <div class="perfil-mini"><span>Faltas sin justificar</span><strong>${datos.faltas}</strong><small>${datos.faltasPendientes.length ? 'Requieren revisión' : 'Sin pendientes'}</small></div>
        <div class="perfil-mini"><span>Justificadas</span><strong>${datos.justificadas}</strong><small>Respaldadas por RRHH</small></div>
      </div>

      <div class="perfil-two-col">
        <article class="perfil-panel">
          <div class="perfil-panel-head"><h3>Contrato</h3>${UI.badgeContrato(emp.contrato?.estado)}</div>
          <div class="perfil-data-grid">
            ${renderDataRow('Tipo', UI.esc(UI.contratoLabel(emp.contrato?.tipo)))}
            ${renderDataRow('Inicio', UI.esc(UI.fechaCorta(emp.contrato?.inicio)))}
            ${renderDataRow('Fin', UI.esc(emp.contrato?.fin ? UI.fechaCorta(emp.contrato.fin) : 'Indefinido'))}
            ${renderDataRow('Vencimiento', UI.esc(diasContrato(emp, ctx)))}
          </div>
        </article>
        <article class="perfil-panel">
          <div class="perfil-panel-head"><h3>Estado del perfil</h3></div>
          <div class="perfil-data-grid">
            ${renderDataRow('Documentos', `${(emp.documentos || []).length} archivos`)}
            ${renderDataRow('Justificaciones', `${(datos.historial || []).filter((j) => j.estado === 'aprobada').length} aprobadas`)}
            ${renderDataRow('Faltas pendientes', `${datos.faltasPendientes.length}`)}
            ${renderDataRow('Cuenta bancaria', emp.banco ? 'Registrada' : 'Pendiente')}
          </div>
        </article>
      </div>

      <div class="perfil-note">
        <span aria-hidden="true">🔒</span>
        <p>Los datos personales, bancarios, documentos y justificaciones están separados en pestañas. No se muestran todos al abrir la ficha.</p>
      </div>
    `;
  }

  function renderTabPersonal(emp, ctx) {
    const edad = edadActual(emp, ctx);
    return `
      <div class="perfil-panel">
        <div class="perfil-panel-head">
          <div>
            <h3>Datos personales</h3>
            <p>Información de contacto y identificación del colaborador.</p>
          </div>
          <button type="button" class="btn btn-ghost" data-action="editar-contacto">Editar contacto</button>
        </div>
        <div class="perfil-data-grid">
          ${renderDataRow('DNI', UI.esc(emp.dni || '—'))}
          ${renderDataRow('Fecha de nacimiento', UI.esc(UI.fechaCorta(emp.fechaNacimiento)))}
          ${renderDataRow('Edad', edad == null ? '—' : `${edad} años`)}
          ${renderDataRow('Teléfono', UI.esc(emp.telefono || '—'))}
          ${renderDataRow('Dirección', UI.esc(emp.direccion || '—'))}
          ${renderDataRow('Distrito', UI.esc(emp.distrito || '—'))}
          ${renderDataRow('Email', UI.esc(emp.email || '—'))}
        </div>
      </div>

      <div class="perfil-panel">
        <div class="perfil-panel-head"><div><h3>Contacto de emergencia</h3><p>Persona a contactar en caso de incidente.</p></div></div>
        <div class="perfil-data-grid">
          ${renderDataRow('Nombre', UI.esc(emp.contactoEmergencia?.nombre || '—'))}
          ${renderDataRow('Parentesco', UI.esc(emp.contactoEmergencia?.parentesco || '—'))}
          ${renderDataRow('Teléfono', UI.esc(emp.contactoEmergencia?.telefono || '—'))}
        </div>
      </div>
    `;
  }

  function renderTabBancario(emp, state, ctx) {
    const revelar = state.revelarBanco;
    return `
      <div class="perfil-panel">
        <div class="perfil-panel-head">
          <div>
            <h3>Cuenta bancaria</h3>
            <p>Datos usados para el abono de remuneraciones.</p>
          </div>
          <button type="button" class="btn btn-ghost" data-action="toggle-banco">${revelar ? 'Ocultar datos' : 'Mostrar datos'}</button>
        </div>
        <div class="perfil-data-grid">
          ${renderDataRow('Banco', UI.esc(emp.banco || '—'))}
          ${renderDataRow('Tipo de cuenta', UI.esc(emp.tipoCuenta || '—'))}
          ${renderDataRow('Número de cuenta', revelar ? UI.esc(emp.numeroCuenta || '—') : mascarar(emp.numeroCuenta))}
          ${renderDataRow('CCI', revelar ? UI.esc(emp.cci || '—') : mascararCCI(emp.cci))}
          ${renderDataRow('Remuneración bruta', formatoMoneda(emp.sueldoBruto))}
        </div>
      </div>

      <div class="perfil-panel">
        <div class="perfil-panel-head"><div><h3>Contrato</h3><p>Condiciones laborales registradas.</p></div>${UI.badgeContrato(emp.contrato?.estado)}</div>
        <div class="perfil-data-grid">
          ${renderDataRow('Tipo', UI.esc(UI.contratoLabel(emp.contrato?.tipo)))}
          ${renderDataRow('Inicio', UI.esc(UI.fechaCorta(emp.contrato?.inicio)))}
          ${renderDataRow('Fin', UI.esc(emp.contrato?.fin ? UI.fechaCorta(emp.contrato.fin) : 'Indefinido'))}
          ${renderDataRow('Antigüedad', antiguedad(emp, ctx))}
        </div>
      </div>
    `;
  }

  function renderTabDocumentos(emp) {
    const docs = emp.documentos || [];
    return `
      <div class="perfil-panel">
        <div class="perfil-panel-head">
          <div><h3>Documentos</h3><p>Vistas previas generadas para el expediente del colaborador.</p></div>
        </div>
        <div class="perfil-doc-grid">
          ${docs.map((doc) => `
            <article class="perfil-doc-card">
              <span class="perfil-doc-icon">${doc.tipo === 'dni' ? '🆔' : '📄'}</span>
              <div>
                <strong>${UI.esc(doc.nombre)}</strong>
                <small>${doc.estado === 'simulado' ? 'Digital' : UI.esc(doc.estado || 'Digital')} · ${doc.tipo === 'dni' ? 'Identidad' : 'Contrato'}</small>
              </div>
              <button type="button" class="btn btn-ghost" data-action="ver-documento" data-tipo="${UI.esc(doc.tipo)}">Vista previa</button>
            </article>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderTabJustificaciones(emp, datos) {
    return `
      <div class="perfil-panel">
        <div class="perfil-panel-head">
          <div><h3>Faltas por justificar</h3><p>Días laborables sin entrada válida en el periodo.</p></div>
          <span class="perfil-count">${datos.faltasPendientes.length}</span>
        </div>
        ${datos.faltasPendientes.length ? `
          <ul class="perfil-faltas-lista">
            ${datos.faltasPendientes.map((falta) => `
              <li>
                <div>
                  <strong>${UI.esc(UI.fechaCorta(falta.fecha))}</strong>
                  <small>${UI.esc(falta.nombre)}</small>
                </div>
                <button type="button" class="btn btn-primary btn-sm" data-action="justificar" data-fecha="${UI.esc(falta.fecha)}">Justificar falta</button>
              </li>
            `).join('')}
          </ul>
        ` : UI.emptyState('Sin faltas pendientes', 'Todas las ausencias del periodo están justificadas o no hay ausencias registradas.', '✅')}
      </div>

      <div class="perfil-panel">
        <div class="perfil-panel-head"><div><h3>Historial de justificaciones</h3><p>Sustentos registrados y su estado.</p></div></div>
        ${datos.historial.length ? `
          <ul class="perfil-justificaciones-lista">
            ${datos.historial.map((j) => `
              <li class="justificacion-item ${j.estado === 'aprobada' ? 'is-approved' : 'is-cancelled'}">
                <span class="justificacion-icon">📎</span>
                <div class="justificacion-main">
                  <strong>${UI.esc(j.motivo)} · ${UI.esc(UI.fechaCorta(j.fecha))}</strong>
                  <small>${UI.esc(j.archivo?.nombre || 'Sin archivo')}${j.detalle ? ` · ${UI.esc(j.detalle)}` : ''}</small>
                  <small>Creado por ${UI.esc(j.creadoPor || 'RRHH')} · ${UI.esc(String(j.creadoEn || '').slice(0, 10))}</small>
                </div>
                <div class="justificacion-actions">
                  ${UI.badge(j.estado === 'aprobada' ? 'Aprobada' : 'Anulada', j.estado === 'aprobada' ? 'success' : 'neutral')}
                  ${j.archivo?.nombre ? `<button type="button" class="btn btn-ghost btn-sm" data-action="ver-sustento" data-id="${UI.esc(j.id)}">Ver sustento</button>` : ''}
                  ${j.estado === 'aprobada' ? `<button type="button" class="btn btn-ghost btn-sm danger" data-action="anular-justificacion" data-id="${UI.esc(j.id)}">Anular</button>` : ''}
                </div>
              </li>
            `).join('')}
          </ul>
        ` : UI.emptyState('Sin justificaciones', 'Los sustentos que registres aparecerán aquí.', '📎')}
      </div>
    `;
  }

  function renderFicha(emp, datos, state, ctx) {
    const tabs = [
      { id: 'resumen', label: 'Resumen' },
      { id: 'personal', label: 'Datos personales' },
      { id: 'bancario', label: 'Cuenta y contrato' },
      { id: 'justificaciones', label: 'Justificaciones' },
      { id: 'documentos', label: 'Documentos' }
    ];
    const tabActual = tabs.some((tab) => tab.id === state.tab) ? state.tab : 'resumen';

    const contenido = tabActual === 'personal'
      ? renderTabPersonal(emp, ctx)
      : tabActual === 'bancario'
        ? renderTabBancario(emp, state, ctx)
        : tabActual === 'justificaciones'
          ? renderTabJustificaciones(emp, datos)
          : tabActual === 'documentos'
            ? renderTabDocumentos(emp)
            : renderTabResumen(emp, datos, ctx);

    return `
      <article class="perfil-hero">
        <div class="perfil-avatar">${UI.esc(UI.iniciales(emp.nombre))}</div>
        <div class="perfil-hero-main">
          <div class="perfil-hero-top">
            <div>
              <span class="perfil-eyebrow">Ficha 360</span>
              <h2>${nombreCompleto(emp)}</h2>
              <p>${UI.esc(emp.puesto || '—')} · ${UI.esc(emp.area || '—')}</p>
            </div>
            <div class="perfil-hero-badges">
              ${UI.badgeContrato(emp.contrato?.estado)}
              <span class="role-chip role-${UI.esc(emp.rol)}">${UI.esc(UI.rolLabel(emp.rol))}</span>
            </div>
          </div>
          <div class="perfil-hero-meta">
            <span><strong>ID</strong>${UI.esc(emp.id)}</span>
            <span><strong>Ingreso</strong>${UI.esc(UI.fechaCorta(emp.fechaIngreso))}</span>
            <span><strong>Antigüedad</strong>${UI.esc(antiguedad(emp, ctx))}</span>
            <span><strong>DNI</strong>${mascarar(emp.dni)}</span>
            <span><strong>Contrato</strong>${UI.esc(UI.contratoLabel(emp.contrato?.tipo))}</span>
          </div>
        </div>
      </article>

      <div class="perfil-tabs" role="tablist" aria-label="Secciones de la ficha">
        ${tabs.map((tab) => `
          <button type="button" class="perfil-tab ${tab.id === tabActual ? 'is-active' : ''}" data-tab="${tab.id}" role="tab" aria-selected="${tab.id === tabActual}">
            ${tab.label}
          </button>
        `).join('')}
      </div>
      <div class="perfil-tab-panel" role="tabpanel">
        ${contenido}
      </div>
    `;
  }

  function renderCumpleanios(ctx) {
    const proximos = cumpleaniosProximos(ctx, 6);
    const conteo = conteoMeses(ctx);
    const total = proximos.length;

    return `
      <section class="cumple-section" aria-labelledby="cumple-title">
        <div class="cumple-section-head">
          <div>
            <span class="perfil-eyebrow">Equipo</span>
            <h2 id="cumple-title">Cumpleaños</h2>
            <p>Próximos cumpleaños y distribución por mes.</p>
          </div>
          <span class="panel-card-pill">${UI.fmtNumero(total)} próximos</span>
        </div>
        <div class="cumple-grid">
          <article class="cumple-list-card">
            ${proximos.length ? `
              <ul class="cumple-lista">
                ${proximos.map((item) => `
                  <li>
                    ${UI.avatar(item.empleado.nombre, 'avatar-sm')}
                    <div class="cumple-persona">
                      <strong>${UI.esc(item.empleado.nombre)}</strong>
                      <small>${UI.esc(item.empleado.area)}</small>
                    </div>
                    <div class="cumple-fecha">
                      <strong>${UI.esc(UI.fechaCorta(item.fecha))}</strong>
                      <small>${item.dias === 0 ? 'Hoy' : `En ${item.dias} días`} · ${item.edad} años</small>
                    </div>
                  </li>
                `).join('')}
              </ul>
            ` : UI.emptyState('Sin cumpleaños', 'No hay fechas de nacimiento registradas.', '🎂')}
          </article>
          <article class="chart-card cumple-chart-card">
            <div class="chart-header">
              <h3>Cumpleaños por mes</h3>
              <p class="chart-subtitle">Distribución de toda la plantilla</p>
            </div>
            <div class="chart-wrap chart-wrap-cumpleanios">
              <canvas id="chart-cumpleanios" aria-label="Cumpleaños por mes"></canvas>
            </div>
          </article>
        </div>
      </section>
    `;
  }

  // ============================================================
  // Modales
  // ============================================================

  function renderModalDocumento() {
    return `
      <div class="modal-overlay" id="perfil-modal-documento" role="dialog" aria-modal="true" aria-labelledby="perfil-doc-title" hidden>
        <div class="modal-card modal-lg modal-perfil">
          <div class="modal-header">
            <div><span class="modal-eyebrow">Documento digital</span><h2 id="perfil-doc-title">Vista previa</h2></div>
            <button type="button" class="modal-close" data-close="perfil-modal-documento" aria-label="Cerrar">✕</button>
          </div>
          <div class="modal-body" id="perfil-documento-body"></div>
        </div>
      </div>
    `;
  }

  function renderModalJustificacion() {
    return `
      <div class="modal-overlay" id="perfil-modal-justificacion" role="dialog" aria-modal="true" aria-labelledby="perfil-just-title" hidden>
        <div class="modal-card modal-lg modal-perfil">
          <div class="modal-header">
            <div><span class="modal-eyebrow">Recursos Humanos</span><h2 id="perfil-just-title">Justificar falta</h2></div>
            <button type="button" class="modal-close" data-close="perfil-modal-justificacion" aria-label="Cerrar">✕</button>
          </div>
          <div class="modal-body">
            <form id="form-justificacion" class="perfil-form" novalidate>
              <input type="hidden" id="just-empleado-id">
              <input type="hidden" id="just-fecha">
              <div class="just-context-card">
                <strong id="just-empleado-nombre">Colaborador</strong>
                <span id="just-fecha-texto">—</span>
              </div>
              <div class="form-group">
                <label for="just-motivo" class="form-label">Motivo</label>
                <select id="just-motivo" class="form-input" required>
                  <option value="">Selecciona un motivo</option>
                  ${MOTIVOS_JUSTIFICACION.map((motivo) => `<option value="${UI.esc(motivo)}">${UI.esc(motivo)}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label for="just-detalle" class="form-label">Detalle</label>
                <textarea id="just-detalle" class="form-input" rows="3" placeholder="Describe brevemente la justificación"></textarea>
              </div>
              <div class="form-group">
                <label for="just-archivo" class="form-label">Sustento (PDF, JPG o PNG · máx. 2 MB)</label>
                <input type="file" id="just-archivo" class="form-input archivo-input" accept=".pdf,.jpg,.jpeg,.png" required>
                <div id="just-archivo-info" class="archivo-info"></div>
              </div>
              <div id="just-error" class="form-error" aria-live="polite"></div>
              <div class="perfil-form-actions">
                <button type="button" class="btn btn-ghost" data-close="perfil-modal-justificacion">Cancelar</button>
                <button type="submit" class="btn btn-primary">Guardar justificación</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  function renderModalAlta() {
    return `
      <div class="modal-overlay" id="perfil-modal-alta" role="dialog" aria-modal="true" aria-labelledby="perfil-alta-title" hidden>
        <div class="modal-card modal-perfil modal-xl">
          <div class="modal-header">
            <div><span class="modal-eyebrow">Alta de personal</span><h2 id="perfil-alta-title">Agregar colaborador</h2></div>
            <button type="button" class="modal-close" data-close="perfil-modal-alta" aria-label="Cerrar">✕</button>
          </div>
          <div class="modal-body">
            <form id="form-alta" class="perfil-form" novalidate>
              <input type="hidden" id="alta-error">
              <div class="form-section-title">Identidad y contacto</div>
              <div class="form-grid-2">
                <div class="form-group"><label for="alta-nombre" class="form-label">Nombre completo *</label><input id="alta-nombre" class="form-input" required></div>
                <div class="form-group"><label for="alta-dni" class="form-label">DNI *</label><input id="alta-dni" class="form-input" maxlength="8" inputmode="numeric" required></div>
                <div class="form-group"><label for="alta-email" class="form-label">Email *</label><input id="alta-email" type="email" class="form-input" required></div>
                <div class="form-group"><label for="alta-usuario" class="form-label">Usuario</label><input id="alta-usuario" class="form-input" placeholder="Se genera desde el email"></div>
                <div class="form-group"><label for="alta-telefono" class="form-label">Teléfono</label><input id="alta-telefono" class="form-input" placeholder="+51 999 999 999"></div>
                <div class="form-group"><label for="alta-fecha-nacimiento" class="form-label">Fecha de nacimiento</label><input id="alta-fecha-nacimiento" type="date" class="form-input"></div>
                <div class="form-group"><label for="alta-direccion" class="form-label">Dirección</label><input id="alta-direccion" class="form-input"></div>
                <div class="form-group"><label for="alta-distrito" class="form-label">Distrito</label><input id="alta-distrito" class="form-input"></div>
              </div>

              <div class="form-section-title">Datos laborales</div>
              <div class="form-grid-2">
                <div class="form-group"><label for="alta-area" class="form-label">Área *</label><input id="alta-area" class="form-input" list="perfil-areas-list" required><datalist id="perfil-areas-list"></datalist></div>
                <div class="form-group"><label for="alta-puesto" class="form-label">Cargo *</label><input id="alta-puesto" class="form-input" required></div>
                <div class="form-group"><label for="alta-departamento" class="form-label">Departamento</label><input id="alta-departamento" class="form-input"></div>
                <div class="form-group"><label for="alta-ingreso" class="form-label">Fecha de ingreso *</label><input id="alta-ingreso" type="date" class="form-input" value="2026-10-01" required></div>
                <div class="form-group"><label for="alta-tipo-contrato" class="form-label">Tipo de contrato *</label>
                  <select id="alta-tipo-contrato" class="form-input">
                    ${TIPOS_CONTRATO.map((tipo) => `<option value="${tipo.valor}">${tipo.label}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group"><label for="alta-fin-contrato" class="form-label">Fin del contrato</label><input id="alta-fin-contrato" type="date" class="form-input" disabled></div>
              </div>

              <div class="form-section-title">Contacto de emergencia</div>
              <div class="form-grid-2">
                <div class="form-group"><label for="alta-contacto-nombre" class="form-label">Nombre</label><input id="alta-contacto-nombre" class="form-input"></div>
                <div class="form-group"><label for="alta-contacto-parentesco" class="form-label">Parentesco</label><input id="alta-contacto-parentesco" class="form-input"></div>
                <div class="form-group"><label for="alta-contacto-telefono" class="form-label">Teléfono</label><input id="alta-contacto-telefono" class="form-input"></div>
              </div>

              <div class="form-section-title">Datos bancarios</div>
              <div class="form-grid-2">
                <div class="form-group"><label for="alta-banco" class="form-label">Banco *</label>
                  <select id="alta-banco" class="form-input">${BANCOS.map((banco) => `<option>${banco}</option>`).join('')}</select>
                </div>
                <div class="form-group"><label for="alta-tipo-cuenta" class="form-label">Tipo de cuenta *</label>
                  <select id="alta-tipo-cuenta" class="form-input">${TIPOS_CUENTA.map((tipo) => `<option>${tipo}</option>`).join('')}</select>
                </div>
                <div class="form-group"><label for="alta-numero-cuenta" class="form-label">Número de cuenta *</label><input id="alta-numero-cuenta" class="form-input" inputmode="numeric" required></div>
                <div class="form-group"><label for="alta-cci" class="form-label">CCI *</label><input id="alta-cci" class="form-input" inputmode="numeric" maxlength="20" required></div>
                <div class="form-group"><label for="alta-sueldo" class="form-label">Remuneración bruta (S/) *</label><input id="alta-sueldo" type="number" min="0" step="50" class="form-input" required></div>
              </div>

              <div id="alta-form-error" class="form-error" aria-live="polite"></div>
              <div class="perfil-form-actions">
                <button type="button" class="btn btn-ghost" data-close="perfil-modal-alta">Cancelar</button>
                <button type="submit" class="btn btn-primary">Registrar colaborador</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  function renderModalEditar() {
    return `
      <div class="modal-overlay" id="perfil-modal-editar" role="dialog" aria-modal="true" aria-labelledby="perfil-edit-title" hidden>
        <div class="modal-card modal-lg modal-perfil">
          <div class="modal-header">
            <div><span class="modal-eyebrow">Datos de contacto</span><h2 id="perfil-edit-title">Editar contacto</h2></div>
            <button type="button" class="modal-close" data-close="perfil-modal-editar" aria-label="Cerrar">✕</button>
          </div>
          <div class="modal-body">
            <form id="form-editar" class="perfil-form" novalidate>
              <div class="form-grid-2">
                <div class="form-group"><label for="edit-telefono" class="form-label">Teléfono</label><input id="edit-telefono" class="form-input"></div>
                <div class="form-group"><label for="edit-distrito" class="form-label">Distrito</label><input id="edit-distrito" class="form-input"></div>
                <div class="form-group"><label for="edit-direccion" class="form-label">Dirección</label><input id="edit-direccion" class="form-input"></div>
              </div>
              <div class="form-section-title">Contacto de emergencia</div>
              <div class="form-grid-2">
                <div class="form-group"><label for="edit-contacto-nombre" class="form-label">Nombre</label><input id="edit-contacto-nombre" class="form-input"></div>
                <div class="form-group"><label for="edit-contacto-parentesco" class="form-label">Parentesco</label><input id="edit-contacto-parentesco" class="form-input"></div>
                <div class="form-group"><label for="edit-contacto-telefono" class="form-label">Teléfono</label><input id="edit-contacto-telefono" class="form-input"></div>
              </div>
              <div id="edit-form-error" class="form-error" aria-live="polite"></div>
              <div class="perfil-form-actions">
                <button type="button" class="btn btn-ghost" data-close="perfil-modal-editar">Cancelar</button>
                <button type="submit" class="btn btn-primary">Guardar cambios</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  function asegurarModales() {
    if (!document.getElementById('perfil-modal-documento')) document.body.insertAdjacentHTML('beforeend', renderModalDocumento());
    if (!document.getElementById('perfil-modal-justificacion')) document.body.insertAdjacentHTML('beforeend', renderModalJustificacion());
    if (!document.getElementById('perfil-modal-alta')) document.body.insertAdjacentHTML('beforeend', renderModalAlta());
    if (!document.getElementById('perfil-modal-editar')) document.body.insertAdjacentHTML('beforeend', renderModalEditar());
  }

  // ============================================================
  // Charts
  // ============================================================

  function montarCumpleanios(ctx) {
    if (!window.Chart || !window.ChartTheme) return;
    const canvas = document.getElementById('chart-cumpleanios');
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;
    if (charts.cumpleanios) charts.cumpleanios.destroy();

    const data = conteoMeses(ctx);
    const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const tooltipBase = window.ChartTheme.premiumTooltip;

    charts.cumpleanios = new Chart(ctx2d, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Cumpleaños',
          data,
          backgroundColor: 'rgba(232, 195, 63, 0.78)',
          borderColor: '#C9A62E',
          borderWidth: 1,
          borderRadius: 5,
          borderSkipped: false,
          maxBarThickness: 28
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        devicePixelRatio: Math.max(2, window.devicePixelRatio || 1),
        layout: { padding: { top: 12 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltipBase,
            callbacks: {
              ...tooltipBase.callbacks,
              label: (item) => `  ${item.parsed.y} cumpleaños`
            }
          }
        },
        scales: {
          x: { grid: { display: false, drawBorder: false }, ticks: { color: '#8B887E', font: { size: 10 } } },
          y: { min: 0, suggestedMax: Math.max(2, Math.max(...data) + 1), grid: { color: 'rgba(30,30,30,0.04)', drawBorder: false }, ticks: { stepSize: 1, precision: 0, color: '#8B887E', font: { size: 10 } } }
        },
        animation: { duration: 700, easing: 'easeOutQuart' }
      }
    });
  }

  // ============================================================
  // Modales: abrir/cerrar y formularios
  // ============================================================

  function renderPreviewDocumento(emp, tipo) {
    if (tipo === 'dni') {
      return `
        <div class="doc-preview doc-dni">
          <div class="doc-dni-top">REPÚBLICA DEL PERÚ · DOCUMENTO NACIONAL DE IDENTIDAD</div>
          <div class="doc-dni-main">
            <div class="doc-photo">${UI.esc(UI.iniciales(emp.nombre))}</div>
            <div class="doc-dni-data">
              <div><span>Apellidos y nombres</span><strong>${UI.esc(emp.nombre)}</strong></div>
              <div><span>DNI</span><strong>${UI.esc(emp.dni || '—')}</strong></div>
              <div><span>Fecha de nacimiento</span><strong>${UI.esc(UI.fechaCorta(emp.fechaNacimiento))}</strong></div>
              <div><span>Área</span><strong>${UI.esc(emp.area)}</strong></div>
            </div>
          </div>
          <div class="doc-watermark">COPIA DIGITAL</div>
        </div>
      `;
    }

    return `
      <div class="doc-preview doc-contrato">
        <h3>CONTRATO DE TRABAJO</h3>
        <p>Entre <strong>INNOVATION NFC E.S.F.</strong> y <strong>${UI.esc(emp.nombre)}</strong>, identificado con DNI <strong>${UI.esc(emp.dni || '—')}</strong>, se acuerda el presente contrato.</p>
        <div class="doc-contract-grid">
          <div><span>Cargo</span><strong>${UI.esc(emp.puesto)}</strong></div>
          <div><span>Área</span><strong>${UI.esc(emp.area)}</strong></div>
          <div><span>Tipo</span><strong>${UI.esc(UI.contratoLabel(emp.contrato?.tipo))}</strong></div>
          <div><span>Inicio</span><strong>${UI.esc(UI.fechaCorta(emp.contrato?.inicio))}</strong></div>
          <div><span>Fin</span><strong>${UI.esc(emp.contrato?.fin ? UI.fechaCorta(emp.contrato.fin) : 'Indefinido')}</strong></div>
          <div><span>Remuneración</span><strong>${formatoMoneda(emp.sueldoBruto)}</strong></div>
        </div>
        <div class="doc-signatures"><span>Empleador</span><span>Colaborador</span></div>
        <div class="doc-watermark">COPIA DIGITAL</div>
      </div>
    `;
  }

  function renderSustento(j) {
    return `
      <div class="doc-preview doc-sustento">
        <div class="doc-sustento-icon">📎</div>
        <h3>${UI.esc(j.archivo?.nombre || 'Sustento')}</h3>
        <p>Documento adjunto para la justificación del <strong>${UI.esc(UI.fechaCorta(j.fecha))}</strong>.</p>
        <div class="doc-sustento-meta">
          <span>Motivo: ${UI.esc(j.motivo)}</span>
          <span>Tipo: ${UI.esc(j.archivo?.tipo || 'archivo')}</span>
          <span>Tamaño: ${UI.esc(String(Math.round((j.archivo?.tamano || 0) / 1024)))} KB</span>
        </div>
        <div class="doc-watermark">ADJUNTO</div>
      </div>
    `;
  }

  // ============================================================
  // Render principal
  // ============================================================

  function render(container, ctx) {
    destruirEventos();
    destruirCharts();
    let contexto = ctx;

    let seleccion = null;
    try {
      const guardada = sessionStorage.getItem('perfiles_seleccion');
      if (guardada) seleccion = JSON.parse(guardada);
      sessionStorage.removeItem('perfiles_seleccion');
    } catch {}

    const areas = [...new Set((contexto.empleados || []).map((emp) => emp.area).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
    const state = {
      area: seleccion?.area || '',
      empleadoId: seleccion?.empleadoId || '',
      tab: seleccion?.tab || 'resumen',
      revelarBanco: false
    };

    container.innerHTML = `
      ${UI.pageHeader({
        eyebrow: 'Perfiles',
        titulo: 'Ficha 360 y gestión de personal',
        descripcion: 'Consulta información laboral, documentos, cumpleaños y justificaciones de faltas.'
      })}
      <div id="perfiles-kpis">${renderModuloKPIs(contexto)}</div>
      ${renderSelector(contexto, state, areas)}
      <div id="perfil-ficha-wrap"></div>
      ${renderCumpleanios(contexto)}
    `;

    asegurarModales();

    const fichaWrap = document.getElementById('perfil-ficha-wrap');
    const areaSelect = document.getElementById('perfil-area');
    const empleadoSelect = document.getElementById('perfil-empleado');
    const btnAlta = document.getElementById('btn-alta-perfil');
    const controller = new AbortController();
    const { signal } = controller;
    limpiarEventos = () => controller.abort();

    let archivoSeleccionado = null;
    let archivoPreviewUrl = null;

    const empleadoActual = () => (contexto.empleados || []).find((emp) => emp.id === state.empleadoId) || null;

    function actualizarTrabajadores() {
      if (!empleadoSelect) return;
      const trabajadores = state.area
        ? (contexto.empleados || []).filter((emp) => emp.area === state.area).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
        : [];
      empleadoSelect.disabled = !state.area;
      empleadoSelect.innerHTML = `<option value="">${state.area ? 'Selecciona un trabajador' : 'Primero selecciona un área'}</option>` +
        trabajadores.map((emp) => `<option value="${UI.esc(emp.id)}" ${state.empleadoId === emp.id ? 'selected' : ''}>${UI.esc(emp.nombre)} — ${UI.esc(emp.puesto)}</option>`).join('');
    }

    function actualizarKPIs() {
      const wrap = document.getElementById('perfiles-kpis');
      if (wrap) wrap.innerHTML = renderModuloKPIs(contexto);
    }

    function actualizarFicha() {
      const emp = empleadoActual();
      if (!emp) {
        fichaWrap.innerHTML = UI.emptyState(
          state.area ? 'Selecciona un trabajador' : 'Selecciona un área',
          state.area ? 'Elige un colaborador para abrir su ficha 360.' : 'Primero elige un área para filtrar la plantilla.',
          '🪪'
        );
        return;
      }
      const datos = resumenEmpleado(emp, contexto);
      fichaWrap.innerHTML = renderFicha(emp, datos, state, contexto);
    }

    function actualizarSelects() {
      if (areaSelect) areaSelect.value = state.area;
      actualizarTrabajadores();
      if (empleadoSelect) empleadoSelect.value = state.empleadoId;
    }

    function abrirModal(id) {
      const modal = document.getElementById(id);
      if (!modal) return;
      modal.hidden = false;
      document.body.classList.add('modal-open');
      setTimeout(() => {
        modal.querySelector('input:not([type="hidden"]), select, textarea, button, .modal-close')?.focus();
      }, 30);
    }

    function cerrarModal(id) {
      const modal = document.getElementById(id);
      if (modal) modal.hidden = true;
      if (!document.querySelector('.modal-overlay:not([hidden])')) {
        document.body.classList.remove('modal-open');
      }
    }

    function cerrarTodosLosModales() {
      document.querySelectorAll('.modal-overlay:not([hidden])').forEach((modal) => { modal.hidden = true; });
      document.body.classList.remove('modal-open');
      revocarArchivo();
    }

    function revocarArchivo() {
      if (archivoPreviewUrl) {
        URL.revokeObjectURL(archivoPreviewUrl);
        archivoPreviewUrl = null;
      }
    }

    function abrirDocumento(emp, tipo) {
      const body = document.getElementById('perfil-documento-body');
      const title = document.getElementById('perfil-doc-title');
      if (!body) return;
      if (title) title.textContent = tipo === 'dni' ? 'Vista previa de DNI' : 'Vista previa de contrato';
      body.innerHTML = renderPreviewDocumento(emp, tipo);
      abrirModal('perfil-modal-documento');
    }

    function abrirSustento(id) {
      const j = (contexto.justificaciones || []).find((item) => item.id === id);
      if (!j) return;
      const body = document.getElementById('perfil-documento-body');
      const title = document.getElementById('perfil-doc-title');
      if (title) title.textContent = 'Vista previa de sustento';
      if (body) body.innerHTML = renderSustento(j);
      abrirModal('perfil-modal-documento');
    }

    function abrirAlta() {
      const form = document.getElementById('form-alta');
      form?.reset();
      const error = document.getElementById('alta-form-error');
      if (error) error.textContent = '';
      const ingreso = document.getElementById('alta-ingreso');
      if (ingreso) ingreso.value = '2026-10-01';
      const fin = document.getElementById('alta-fin-contrato');
      if (fin) { fin.disabled = true; fin.value = ''; }
      const datalist = document.getElementById('perfil-areas-list');
      if (datalist) datalist.innerHTML = areas.map((area) => `<option value="${UI.esc(area)}"></option>`).join('');
      abrirModal('perfil-modal-alta');
    }

    function abrirEditar(emp) {
      const campos = {
        'edit-telefono': emp.telefono || '',
        'edit-direccion': emp.direccion || '',
        'edit-distrito': emp.distrito || '',
        'edit-contacto-nombre': emp.contactoEmergencia?.nombre || '',
        'edit-contacto-parentesco': emp.contactoEmergencia?.parentesco || '',
        'edit-contacto-telefono': emp.contactoEmergencia?.telefono || ''
      };
      Object.entries(campos).forEach(([id, valor]) => {
        const input = document.getElementById(id);
        if (input) input.value = valor;
      });
      const error = document.getElementById('edit-form-error');
      if (error) error.textContent = '';
      abrirModal('perfil-modal-editar');
    }

    function abrirJustificacion(emp, fecha) {
      archivoSeleccionado = null;
      revocarArchivo();
      const set = (id, valor) => { const el = document.getElementById(id); if (el) el.value = valor; };
      set('just-empleado-id', emp.id);
      set('just-fecha', fecha);
      document.getElementById('just-empleado-nombre').textContent = emp.nombre;
      document.getElementById('just-fecha-texto').textContent = `${UI.fechaCorta(fecha)} · ${nombreDia(fecha)}`;
      set('just-motivo', '');
      set('just-detalle', '');
      const archivo = document.getElementById('just-archivo');
      if (archivo) archivo.value = '';
      const info = document.getElementById('just-archivo-info');
      if (info) info.innerHTML = '';
      const error = document.getElementById('just-error');
      if (error) error.textContent = '';
      abrirModal('perfil-modal-justificacion');
    }

    function mostrarArchivo(file) {
      const info = document.getElementById('just-archivo-info');
      const error = document.getElementById('just-error');
      if (error) error.textContent = '';
      if (!file) {
        archivoSeleccionado = null;
        if (info) info.innerHTML = '';
        return;
      }
      const extension = file.name.split('.').pop().toLowerCase();
      const permitidos = ['pdf', 'jpg', 'jpeg', 'png'];
      if (!permitidos.includes(extension)) {
        archivoSeleccionado = null;
        if (info) info.innerHTML = '';
        if (error) error.textContent = 'El sustento debe ser PDF, JPG o PNG';
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        archivoSeleccionado = null;
        if (info) info.innerHTML = '';
        if (error) error.textContent = 'El archivo supera el límite de 2 MB';
        return;
      }
      archivoSeleccionado = file;
      revocarArchivo();
      const esImagen = file.type.startsWith('image/');
      if (esImagen) {
        archivoPreviewUrl = URL.createObjectURL(file);
      }
      if (info) {
        info.innerHTML = `
          <div class="archivo-preview">
            ${esImagen ? `<img src="${archivoPreviewUrl}" alt="Vista previa del sustento">` : '<span class="archivo-pdf">PDF</span>'}
            <div><strong>${UI.esc(file.name)}</strong><small>${Math.round(file.size / 1024)} KB · Adjunto local de demostración</small></div>
          </div>
        `;
      }
    }

    // Selector
    areaSelect?.addEventListener('change', () => {
      state.area = areaSelect.value;
      state.empleadoId = '';
      state.tab = 'resumen';
      state.revelarBanco = false;
      actualizarTrabajadores();
      actualizarFicha();
    }, { signal });

    empleadoSelect?.addEventListener('change', () => {
      state.empleadoId = empleadoSelect.value;
      state.tab = 'resumen';
      state.revelarBanco = false;
      actualizarFicha();
    }, { signal });

    btnAlta?.addEventListener('click', abrirAlta, { signal });

    // Acciones de la ficha
    container.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-tab]');
      if (tab) {
        state.tab = tab.dataset.tab;
        state.revelarBanco = false;
        actualizarFicha();
        return;
      }

      const action = e.target.closest('[data-action]');
      if (!action) return;
      const emp = empleadoActual();
      if (!emp) return;

      if (action.dataset.action === 'toggle-banco') {
        state.revelarBanco = !state.revelarBanco;
        actualizarFicha();
        return;
      }
      if (action.dataset.action === 'editar-contacto') {
        abrirEditar(emp);
        return;
      }
      if (action.dataset.action === 'ver-documento') {
        abrirDocumento(emp, action.dataset.tipo);
        return;
      }
      if (action.dataset.action === 'justificar') {
        abrirJustificacion(emp, action.dataset.fecha);
        return;
      }
      if (action.dataset.action === 'ver-sustento') {
        abrirSustento(action.dataset.id);
        return;
      }
      if (action.dataset.action === 'anular-justificacion') {
        if (!window.confirm('¿Anular esta justificación? La falta volverá a contar como no justificada.')) return;
        try {
          window.NFCReader.anularJustificacion(action.dataset.id, contexto.user?.nombre || 'RRHH');
          contexto.justificaciones = window.NFCReader.getJustificaciones();
          if (window.DashboardApp) window.DashboardApp.justificaciones = contexto.justificaciones;
          UI.toast('Justificación anulada', 'success');
          actualizarKPIs();
          actualizarFicha();
        } catch (err) {
          UI.toast(err.message || 'No se pudo anular la justificación', 'error');
        }
      }
    }, { signal });

    // Modales: cerrar
    ['perfil-modal-documento', 'perfil-modal-justificacion', 'perfil-modal-alta', 'perfil-modal-editar'].forEach((id) => {
      const modal = document.getElementById(id);
      modal?.addEventListener('click', (e) => {
        if (e.target === modal || e.target.closest(`[data-close="${id}"]`)) {
          cerrarModal(id);
          if (id === 'perfil-modal-justificacion') revocarArchivo();
        }
      }, { signal });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') cerrarTodosLosModales();
    }, { signal });

    // Justificación
    const archivoInput = document.getElementById('just-archivo');
    archivoInput?.addEventListener('change', () => mostrarArchivo(archivoInput.files?.[0]), { signal });

    document.getElementById('form-justificacion')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const error = document.getElementById('just-error');
      const empleadoId = document.getElementById('just-empleado-id')?.value;
      const fecha = document.getElementById('just-fecha')?.value;
      const motivo = document.getElementById('just-motivo')?.value;
      const detalle = document.getElementById('just-detalle')?.value;
      if (error) error.textContent = '';
      if (!motivo) { if (error) error.textContent = 'Selecciona un motivo'; return; }
      if (!archivoSeleccionado) { if (error) error.textContent = 'Adjunta el sustento de la justificación'; return; }
      try {
        window.NFCReader.crearJustificacion({
          empleadoId,
          fecha,
          motivo,
          detalle,
          archivo: {
            nombre: archivoSeleccionado.name,
            tipo: archivoSeleccionado.type,
            tamano: archivoSeleccionado.size
          },
          creadoPor: contexto.user?.nombre || 'RRHH'
        });
        contexto.justificaciones = window.NFCReader.getJustificaciones();
        if (window.DashboardApp) window.DashboardApp.justificaciones = contexto.justificaciones;
        UI.toast('Falta justificada correctamente', 'success');
        cerrarModal('perfil-modal-justificacion');
        revocarArchivo();
        actualizarKPIs();
        actualizarFicha();
      } catch (err) {
        if (error) error.textContent = err.message || 'No se pudo guardar la justificación';
      }
    }, { signal });

    // Editar contacto
    document.getElementById('form-editar')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const emp = empleadoActual();
      if (!emp) return;
      const error = document.getElementById('edit-form-error');
      if (error) error.textContent = '';
      try {
        window.NFCReader.actualizarEmpleado(emp.id, {
          telefono: document.getElementById('edit-telefono')?.value || '',
          direccion: document.getElementById('edit-direccion')?.value || '',
          distrito: document.getElementById('edit-distrito')?.value || '',
          contactoEmergencia: {
            nombre: document.getElementById('edit-contacto-nombre')?.value || '',
            parentesco: document.getElementById('edit-contacto-parentesco')?.value || '',
            telefono: document.getElementById('edit-contacto-telefono')?.value || ''
          }
        });
        contexto.empleados = window.NFCReader.getEmpleados();
        if (window.DashboardApp) window.DashboardApp.empleados = contexto.empleados;
        cerrarModal('perfil-modal-editar');
        UI.toast('Datos de contacto actualizados', 'success');
        actualizarFicha();
      } catch (err) {
        if (error) error.textContent = err.message || 'No se pudieron guardar los cambios';
      }
    }, { signal });

    // Alta de personal
    const tipoContrato = document.getElementById('alta-tipo-contrato');
    const finContrato = document.getElementById('alta-fin-contrato');
    tipoContrato?.addEventListener('change', () => {
      if (!finContrato) return;
      const indefinido = tipoContrato.value === 'indefinido';
      finContrato.disabled = indefinido;
      if (indefinido) finContrato.value = '';
    }, { signal });

    const emailAlta = document.getElementById('alta-email');
    const usuarioAlta = document.getElementById('alta-usuario');
    emailAlta?.addEventListener('blur', () => {
      if (!usuarioAlta || usuarioAlta.value.trim()) return;
      const prefijo = String(emailAlta.value || '').split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
      if (prefijo) usuarioAlta.value = prefijo;
    }, { signal });

    document.getElementById('form-alta')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const error = document.getElementById('alta-form-error');
      if (error) error.textContent = '';
      try {
        const dniValor = String(document.getElementById('alta-dni')?.value || '').replace(/\D/g, '');
        const cuentaValor = String(document.getElementById('alta-numero-cuenta')?.value || '').replace(/\D/g, '');
        const cciValor = String(document.getElementById('alta-cci')?.value || '').replace(/\D/g, '');
        const sueldoValor = Number(document.getElementById('alta-sueldo')?.value);
        if (!/^\d{8}$/.test(dniValor)) throw new Error('El DNI debe tener 8 dígitos');
        if (!/^\d{6,20}$/.test(cuentaValor)) throw new Error('El número de cuenta debe tener entre 6 y 20 dígitos');
        if (!/^\d{20}$/.test(cciValor)) throw new Error('El CCI debe tener 20 dígitos');
        if (!sueldoValor || sueldoValor <= 0) throw new Error('Ingresa una remuneración válida');
        if (tipoContrato?.value !== 'indefinido' && !finContrato?.value) throw new Error('Indica la fecha de fin del contrato');

        const nuevo = window.NFCReader.crearEmpleado({
          nombre: document.getElementById('alta-nombre')?.value,
          dni: dniValor,
          email: document.getElementById('alta-email')?.value,
          usuario: document.getElementById('alta-usuario')?.value,
          telefono: document.getElementById('alta-telefono')?.value,
          fechaNacimiento: document.getElementById('alta-fecha-nacimiento')?.value,
          direccion: document.getElementById('alta-direccion')?.value,
          distrito: document.getElementById('alta-distrito')?.value,
          area: document.getElementById('alta-area')?.value,
          puesto: document.getElementById('alta-puesto')?.value,
          departamento: document.getElementById('alta-departamento')?.value,
          fechaIngreso: document.getElementById('alta-ingreso')?.value,
          tipoContrato: tipoContrato?.value,
          finContrato: finContrato?.value,
          contactoEmergencia: {
            nombre: document.getElementById('alta-contacto-nombre')?.value,
            parentesco: document.getElementById('alta-contacto-parentesco')?.value,
            telefono: document.getElementById('alta-contacto-telefono')?.value
          },
          banco: document.getElementById('alta-banco')?.value,
          tipoCuenta: document.getElementById('alta-tipo-cuenta')?.value,
          numeroCuenta: cuentaValor,
          cci: cciValor,
          sueldoBruto: sueldoValor
        });
        if (window.DashboardApp) window.DashboardApp.empleados = window.NFCReader.getEmpleados();
        sessionStorage.setItem('perfiles_seleccion', JSON.stringify({ area: nuevo.area, empleadoId: nuevo.id, tab: 'resumen' }));
        cerrarModal('perfil-modal-alta');
        UI.toast(`${nuevo.nombre} se agregó a la plantilla`, 'success');
        render(container, window.DashboardApp ? window.DashboardApp.crearContexto() : contexto);
      } catch (err) {
        if (error) error.textContent = err.message || 'No se pudo registrar al colaborador';
      }
    }, { signal });

    // Estado inicial del selector / ficha
    actualizarSelects();
    actualizarFicha();
    montarCumpleanios(contexto);

    buscarHandler = (valor) => {
      const q = String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
      if (!q) {
        state.area = '';
        state.empleadoId = '';
        state.tab = 'resumen';
        state.revelarBanco = false;
        actualizarSelects();
        actualizarFicha();
        return;
      }
      const empleado = (contexto.empleados || []).find((emp) =>
        [emp.nombre, emp.usuario, emp.dni, emp.email]
          .some((dato) => String(dato || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(q))
      );
      if (empleado) {
        state.area = empleado.area;
        state.empleadoId = empleado.id;
        state.tab = 'resumen';
        state.revelarBanco = false;
        actualizarSelects();
        actualizarFicha();
        return;
      }
      const area = areas.find((item) => String(item || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(q));
      if (area) {
        state.area = area;
        state.empleadoId = '';
        state.tab = 'resumen';
        state.revelarBanco = false;
        actualizarSelects();
        actualizarFicha();
      }
    };

    if (sessionStorage.getItem('perfiles_alta') === '1') {
      sessionStorage.removeItem('perfiles_alta');
      abrirAlta();
    }
  }

  window.DashboardModules.perfiles = {
    titulo: 'Perfiles',
    render,
    onSearch(valor) {
      if (buscarHandler) buscarHandler(valor);
    },
    onUnload() {
      destruirCharts();
      destruirEventos();
      buscarHandler = null;
      document.querySelectorAll('.modal-overlay:not([hidden])').forEach((modal) => { modal.hidden = true; });
      document.body.classList.remove('modal-open');
    }
  };
})();
