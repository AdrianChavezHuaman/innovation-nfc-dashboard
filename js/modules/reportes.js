/* ========================================
   Módulo Reportes — INNOVATION NFC E.S.F
   Bloque 5: Constructor de reportes con vista previa,
   paginación y exportación PNG 4x + CSV
   ======================================== */

(function () {
  'use strict';

  window.DashboardModules = window.DashboardModules || {};

  let charts = {};
  let limpiarEventos = null;

  // Lienzo lógico 16:9 (960×540). La vista previa se dibuja 1:1 y el
  // PNG se exporta a 3840×2160 (4x) para máxima nitidez.
  const BASE_W = 960;
  const BASE_H = 540;
  const HEADER_H = 70;
  const FOOTER_H = 28;
  const PADX = 24;
  const GAP = 8;
  const CONTENT_TOP = HEADER_H + 12;
  const CONTENT_H = BASE_H - HEADER_H - FOOTER_H - 24;
  const EXPORT_SCALE = 4;

  const TEMAS = {
    claro: {
      nombre: 'Claro crema',
      fondo: '#F6F2E7',
      fondo2: '#FBF7EC',
      fondoDetalle: 'rgba(232, 195, 63, 0.08)',
      tarjeta: '#FFFFFF',
      borde: 'rgba(30, 30, 30, 0.07)',
      texto: '#1E1E1E',
      subtexto: '#8B887E',
      grid: 'rgba(30, 30, 30, 0.05)',
      cabecera: ['#1E1E1E', '#2E2E2E'],
      cabeceraTexto: '#FFFFFF',
      acento: '#F5D25A',
      pie: '#1E1E1E',
      pieTexto: 'rgba(255, 255, 255, 0.66)'
    },
    oscuro: {
      nombre: 'Carbón',
      fondo: '#191613',
      fondo2: '#211D18',
      fondoDetalle: 'rgba(245, 210, 90, 0.07)',
      tarjeta: '#221F1A',
      borde: 'rgba(245, 210, 90, 0.14)',
      texto: '#F7F2E8',
      subtexto: 'rgba(247, 242, 232, 0.66)',
      grid: 'rgba(247, 242, 232, 0.08)',
      cabecera: ['#0D0D0C', '#2A251E'],
      cabeceraTexto: '#FFFFFF',
      acento: '#F5D25A',
      pie: '#0C0C0B',
      pieTexto: 'rgba(247, 242, 232, 0.62)'
    }
  };

  const PALETA = {
    dorado: '#E8C33F',
    mostaza: '#C9A62E',
    terracota: '#C45F3F',
    coral: '#D97757',
    ambar: '#D19E33',
    salvia: '#6FA96F',
    bosque: '#2F6B4F',
    marino: '#1E3A5F',
    acero: '#3E6B8A',
    gris: '#8B887E',
    crema: '#F5D25A'
  };

  const COLOR_ESTADO = {
    ok: '#6FA96F',
    late: '#D19E33',
    absent: '#C45F3F',
    test: '#C9A62E',
    justified: '#2F6B4F',
    danger: '#C45F3F',
    success: '#6FA96F'
  };

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
  // Datos base (misma lógica que los módulos)
  // ============================================================

  function pad(n) { return String(n).padStart(2, '0'); }

  function fechaISO(fecha) {
    return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
  }

  function periodoInfo(ctx) {
    const [anio, mes] = String(ctx.periodo?.periodo || '2026-10').split('-').map(Number);
    const nombreMes = UI.MESES[mes - 1] || 'octubre';
    const ultimo = new Date(anio, mes, 0, 12, 0, 0).getDate();
    return {
      titulo: `${nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)} ${anio}`,
      desde: `${anio}-${pad(mes)}-01`,
      hasta: `${anio}-${pad(mes)}-${pad(ultimo)}`,
      corte: ctx.periodo?.fechaCorte || `${anio}-${pad(mes)}-${pad(ultimo)}`
    };
  }

  function fechasLaborables(ctx) {
    const info = periodoInfo(ctx);
    const desde = UI.parseFecha(info.desde);
    const hasta = UI.parseFecha(info.hasta);
    const fechas = [];
    if (!desde || !hasta) return fechas;
    const cursor = new Date(desde);
    while (cursor <= hasta) {
      if (cursor.getDay() !== 0) fechas.push(fechaISO(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return fechas;
  }

  function mapAsistencia(ctx, ids) {
    const set = new Set(ids);
    const mapa = {};
    ids.forEach((id) => { mapa[id] = {}; });
    (ctx.asistencia || []).forEach((m) => {
      if (!set.has(m.empleadoId)) return;
      if (m.valida === false) return;
      if (!mapa[m.empleadoId][m.fecha]) mapa[m.empleadoId][m.fecha] = {};
      mapa[m.empleadoId][m.fecha][m.tipo] = m;
    });
    return mapa;
  }

  function mapJustificaciones(ctx) {
    const mapa = {};
    (ctx.justificaciones || []).forEach((j) => {
      if (j.estado !== 'aprobada') return;
      if (!mapa[j.empleadoId]) mapa[j.empleadoId] = {};
      mapa[j.empleadoId][j.fecha] = j;
    });
    return mapa;
  }

  function resumenEmpleado(emp, fechas, mapa, justificadas) {
    let dias = 0, tardanzas = 0, faltas = 0, just = 0, totalMin = 0, count = 0;
    fechas.forEach((fecha) => {
      const m = mapa[emp.id]?.[fecha];
      if (m?.entrada) {
        dias++;
        if (m.entrada.esTardanza) tardanzas++;
        const [h, min] = String(m.entrada.hora || '00:00').split(':').map(Number);
        totalMin += (h * 60) + (min || 0);
        count++;
        return;
      }
      if (justificadas[emp.id]?.[fecha]) { just++; return; }
      faltas++;
    });
    return {
      emp,
      dias,
      tardanzas,
      faltas,
      justificadas: just,
      pct: fechas.length ? Math.round((dias / fechas.length) * 100) : 0,
      prom: count ? `${pad(Math.floor((totalMin / count) / 60))}:${pad(Math.round(totalMin / count) % 60)}` : '—'
    };
  }

  function construirDatosBase(ctx) {
    const empleados = [...(ctx.visibles || ctx.empleados || [])];
    const fechas = fechasLaborables(ctx);
    const mapa = mapAsistencia(ctx, empleados.map((e) => e.id));
    const justificadas = mapJustificaciones(ctx);
    const porEmpleado = {};
    let totalDias = 0, totalTardanzas = 0, totalFaltas = 0, totalJustificadas = 0, totalMin = 0, totalCount = 0;

    empleados.forEach((emp) => {
      const activas = fechas.filter((fecha) => !emp.fechaIngreso || fecha >= emp.fechaIngreso);
      const r = resumenEmpleado(emp, activas, mapa, justificadas);
      porEmpleado[emp.id] = r;
      totalDias += r.dias;
      totalTardanzas += r.tardanzas;
      totalFaltas += r.faltas;
      totalJustificadas += r.justificadas;
    });

    empleados.forEach((emp) => {
      const r = porEmpleado[emp.id];
      const promSplit = r.prom.split(':');
      if (promSplit.length === 2) {
        totalMin += (Number(promSplit[0]) * 60) + Number(promSplit[1]);
        if (r.prom !== '—') totalCount++;
      }
    });

    const asistenciaDiaria = fechas.map((fecha) => {
      const activos = empleados.filter((emp) => !emp.fechaIngreso || fecha >= emp.fechaIngreso);
      let presentes = 0;
      activos.forEach((emp) => { if (mapa[emp.id]?.[fecha]?.entrada) presentes++; });
      const total = activos.length;
      return { fecha, presentes, total, pct: total ? Math.round((presentes / total) * 100) : 0 };
    });

    const tardanzasPorDia = fechas.map((fecha) => {
      let n = 0;
      empleados.forEach((emp) => {
        const m = mapa[emp.id]?.[fecha];
        if (m?.entrada?.esTardanza) n++;
      });
      return { fecha, n };
    });

    const tardanzasArea = new Map();
    empleados.forEach((emp) => tardanzasArea.set(emp.area, 0));
    empleados.forEach((emp) => {
      Object.values(mapa[emp.id] || {}).forEach((m) => {
        if (m.entrada?.esTardanza) tardanzasArea.set(emp.area, (tardanzasArea.get(emp.area) || 0) + 1);
      });
    });
    const tardanzasAreaList = [...tardanzasArea.entries()]
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count || a.area.localeCompare(b.area, 'es'));

    const topTardanzas = empleados
      .map((emp) => ({ nombre: emp.nombre, area: emp.area, tardanzas: porEmpleado[emp.id].tardanzas }))
      .filter((e) => e.tardanzas > 0)
      .sort((a, b) => b.tardanzas - a.tardanzas || a.nombre.localeCompare(b.nombre, 'es'))
      .slice(0, 10);

    const plantillaArea = new Map();
    empleados.forEach((emp) => plantillaArea.set(emp.area, (plantillaArea.get(emp.area) || 0) + 1));
    const plantillaAreaList = [...plantillaArea.entries()]
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count || a.area.localeCompare(b.area, 'es'));

    const contratos = { vigente: 0, por_vencer: 0, vencido: 0 };
    empleados.forEach((emp) => {
      const estado = emp.contrato?.estado;
      if (estado && Object.prototype.hasOwnProperty.call(contratos, estado)) contratos[estado]++;
    });

    const vencimientos = empleados
      .filter((emp) => emp.contrato && ['por_vencer', 'vencido'].includes(emp.contrato.estado))
      .sort((a, b) => String(a.contrato.fin).localeCompare(String(b.contrato.fin)))
      .slice(0, 12);

    const justificaciones = (ctx.justificaciones || [])
      .filter((j) => j.estado === 'aprobada')
      .slice(0, 12);

    const cumpleMeses = Array(12).fill(0);
    empleados.forEach((emp) => {
      const nac = UI.parseFecha(emp.fechaNacimiento);
      if (nac) cumpleMeses[nac.getMonth()]++;
    });

    const corte = UI.parseFecha(periodoInfo(ctx).corte) || new Date();
    const proximos = empleados
      .map((emp) => {
        const nac = UI.parseFecha(emp.fechaNacimiento);
        if (!nac) return null;
        let siguiente = new Date(corte.getFullYear(), nac.getMonth(), nac.getDate(), 12, 0, 0);
        const hoy = new Date(corte.getFullYear(), corte.getMonth(), corte.getDate(), 12, 0, 0);
        if (siguiente < hoy) siguiente = new Date(corte.getFullYear() + 1, nac.getMonth(), nac.getDate(), 12, 0, 0);
        const dias = Math.round((siguiente - hoy) / 86400000);
        return { emp, fecha: fechaISO(siguiente), dias, edad: siguiente.getFullYear() - nac.getFullYear() };
      })
      .filter(Boolean)
      .sort((a, b) => a.dias - b.dias)
      .slice(0, 8);

    const auditoria = ctx.auditoria || [];
    const denegados = auditoria.filter((a) => a.permitido === false);
    const auditoriaPorZona = new Map();
    auditoria.forEach((a) => {
      const zona = a.zonaNombre || a.zona || '—';
      auditoriaPorZona.set(zona, (auditoriaPorZona.get(zona) || 0) + 1);
    });

    const totalPosibles = empleados.length * fechas.length;
    const pctAsistencia = totalPosibles ? Math.round((totalDias / totalPosibles) * 100) : 0;
    const pctTardanzas = totalDias ? Math.round((totalTardanzas / totalDias) * 100) : 0;
    const promGlobal = totalCount ? `${pad(Math.floor((totalMin / totalCount) / 60))}:${pad(Math.round(totalMin / totalCount) % 60)}` : '—';

    const insights = {
      asistencia: `La asistencia global del periodo fue de ${pctAsistencia}%. ${totalJustificadas ? `Se registraron ${totalJustificadas} ausencias justificadas.` : 'No hay ausencias justificadas en el periodo.'}`,
      tardanzas: `${totalTardanzas} entradas registraron tardanza (${pctTardanzas}% del total de entradas). ${topTardanzas.length ? `El mayor acumulado es de ${topTardanzas[0].nombre} con ${topTardanzas[0].tardanzas}.` : ''}`,
      plantilla: `La plantilla suma ${empleados.length} colaboradores en ${new Set(empleados.map((e) => e.area)).size} áreas. ${contratos.por_vencer} contratos por vencer y ${contratos.vencido} vencidos.`,
      auditoria: `Se registraron ${auditoria.length} accesos; ${denegados.length} fueron denegados (${auditoria.length ? Math.round((denegados.length / auditoria.length) * 100) : 0}%).`
    };

    return {
      ctx,
      empleados,
      areas: [...new Set(empleados.map((e) => e.area))].sort((a, b) => a.localeCompare(b, 'es')),
      fechas,
      porEmpleado,
      mapa,
      justificadasMap: justificadas,
      asistenciaDiaria,
      tardanzasPorDia,
      tardanzasArea: tardanzasAreaList,
      topTardanzas,
      plantillaArea: plantillaAreaList,
      contratos,
      vencimientos,
      justificaciones,
      cumpleMeses,
      proximos,
      auditoria,
      denegados,
      auditoriaPorZona,
      resumen: {
        totalDias, totalTardanzas, totalFaltas, totalJustificadas,
        pctAsistencia, pctTardanzas, promGlobal,
        porVencer: contratos.por_vencer,
        vencidos: contratos.vencido
      },
      insights
    };
  }

  // ============================================================
  // Registro de widgets
  // ============================================================

  const AREA_COLOR = {
    Produccion: PALETA.terracota,
    Logistica: PALETA.coral,
    Gerencia: PALETA.ambar,
    'RR.HH.': PALETA.dorado,
    Mantenimiento: PALETA.salvia,
    Limpieza: PALETA.bosque,
    Seguridad: PALETA.marino,
    Almacen: PALETA.acero,
    Recepcion: PALETA.gris,
    Soporte: PALETA.mostaza,
    Direccion: PALETA.salvia
  };

  function colorArea(area) {
    return AREA_COLOR[area] || window.ChartTheme?.colorArea?.(area) || PALETA.dorado;
  }

  function celda(valor, tono) {
    return { v: valor, t: tono || '' };
  }

  function filaTablaPersonal(emp) {
    return [emp.nombre, emp.area, emp.puesto, UI.contratoLabel(emp.contrato?.tipo), emp.contrato?.fin ? UI.fechaCorta(emp.contrato.fin) : 'Indefinido', emp.contrato?.estado || ''];
  }

  const WIDGETS = [
    {
      id: 'kpi-resumen', nombre: 'Resumen ejecutivo', cat: 'Resumen ejecutivo', tipo: 'kpi', span: 12, h: 112,
      datos(base) {
        return {
          tipo: 'kpi', titulo: 'Resumen ejecutivo', subtitulo: 'Indicadores principales del periodo',
          kpis: [
            { label: 'Asistencia global', valor: `${base.resumen.pctAsistencia}%`, detalle: `${base.resumen.totalDias} de ${base.empleados.length * base.fechas.length} jornadas`, tono: 'success' },
            { label: 'Tardanzas', valor: `${base.resumen.pctTardanzas}%`, detalle: `${base.resumen.totalTardanzas} entradas tardías`, tono: 'warning' },
            { label: 'Ausencias', valor: String(base.resumen.totalFaltas), detalle: `${base.resumen.totalJustificadas} justificadas`, tono: 'danger' },
            { label: 'Prom. entrada', valor: base.resumen.promGlobal, detalle: 'Hora promedio de llegada', tono: 'neutral' }
          ]
        };
      }
    },
    {
      id: 'kpi-plantilla', nombre: 'Plantilla y contratos', cat: 'Plantilla y contratos', tipo: 'kpi', span: 12, h: 112,
      datos(base) {
        return {
          tipo: 'kpi', titulo: 'Plantilla y contratos', subtitulo: 'Estado de la organización',
          kpis: [
            { label: 'Colaboradores', valor: String(base.empleados.length), detalle: `${base.areas.length} áreas`, tono: 'neutral' },
            { label: 'Contratos vigentes', valor: String(base.contratos.vigente), detalle: 'Estado actual', tono: 'success' },
            { label: 'Por vencer', valor: String(base.contratos.por_vencer), detalle: 'Próximos 90 días', tono: 'warning' },
            { label: 'Vencidos', valor: String(base.contratos.vencido), detalle: 'Requieren acción', tono: 'danger' }
          ]
        };
      }
    },
    {
      id: 'line-asistencia', nombre: 'Asistencia diaria', cat: 'Asistencia y puntualidad', tipo: 'line', span: 6, h: 188,
      datos(base) {
        return {
          tipo: 'line', titulo: 'Asistencia diaria', subtitulo: 'Porcentaje de asistencia por día laborable', unit: '%',
          labels: base.asistenciaDiaria.map((d) => `${UI.parseFecha(d.fecha)?.getDate()} ${UI.MESES_CORTOS[UI.parseFecha(d.fecha).getMonth()]}`),
          values: base.asistenciaDiaria.map((d) => d.pct),
          detalle: base.asistenciaDiaria.map((d) => `${d.pct}% · ${d.presentes} de ${d.total}`)
        };
      }
    },
    {
      id: 'barh-tardanzas-area', nombre: 'Tardanzas por área', cat: 'Asistencia y puntualidad', tipo: 'barh', span: 6, h: 188,
      datos(base) {
        const top = base.tardanzasArea.filter((a) => a.count > 0).slice(0, 8);
        const resto = base.tardanzasArea.filter((a) => a.count > 0).slice(8);
        const data = resto.length
          ? [...top, { area: 'Otras áreas', count: resto.reduce((acc, a) => acc + a.count, 0) }]
          : top;
        return {
          tipo: 'barh', titulo: 'Tardanzas por área', subtitulo: 'Top de áreas · resto agrupado',
          labels: data.map((a) => a.area),
          values: data.map((a) => a.count),
          colors: data.map((a) => colorArea(a.area)),
          unit: ' tardanzas'
        };
      }
    },
    {
      id: 'barv-tardanzas-dia', nombre: 'Tardanzas por día', cat: 'Asistencia y puntualidad', tipo: 'barv', span: 12, h: 190,
      datos(base) {
        return {
          tipo: 'barv', titulo: 'Tardanzas por día', subtitulo: 'Distribución diaria de entradas tardías',
          labels: base.tardanzasPorDia.map((d) => String(UI.parseFecha(d.fecha).getDate())),
          values: base.tardanzasPorDia.map((d) => d.n),
          unit: ''
        };
      }
    },
    {
      id: 'barh-top10', nombre: 'Top 10 tardanzas', cat: 'Asistencia y puntualidad', tipo: 'barh', span: 6, h: 188,
      datos(base) {
        return {
          tipo: 'barh', titulo: 'Top 10 tardanzas', subtitulo: 'Colaboradores con más entradas tardías',
          labels: base.topTardanzas.map((t) => t.nombre),
          values: base.topTardanzas.map((t) => t.tardanzas),
          colors: base.topTardanzas.map((t) => colorArea(t.area)),
          unit: ' tardanzas'
        };
      }
    },
    {
      id: 'table-horarios', nombre: 'Resumen de asistencia', cat: 'Asistencia y puntualidad', tipo: 'table', span: 12, h: 220, csv: true,
      datos(base) {
        const filas = base.empleados.slice(0, 12).map((emp) => {
          const r = base.porEmpleado[emp.id];
          return [emp.nombre, emp.area, celda(String(r.dias), 'ok'), celda(String(r.tardanzas), 'late'), celda(String(r.faltas), 'absent'), celda(String(r.justificadas), 'justified'), celda(`${r.pct}%`, 'neutral')];
        });
        return {
          tipo: 'table', titulo: 'Resumen de asistencia', subtitulo: 'Primeros 12 colaboradores del periodo',
          headers: ['Empleado', 'Área', 'Asistió', 'Tardanzas', 'Faltas', 'Justificadas', '%'],
          rows: filas,
          csv: {
            headers: ['Empleado', 'Área', 'Asistió', 'Tardanzas', 'Faltas', 'Justificadas', '% Asistencia'],
            rows: base.empleados.slice(0, 60).map((emp) => {
              const r = base.porEmpleado[emp.id];
              return [emp.nombre, emp.area, r.dias, r.tardanzas, r.faltas, r.justificadas, `${r.pct}%`];
            })
          }
        };
      }
    },
    {
      id: 'barh-plantilla', nombre: 'Plantilla por área', cat: 'Plantilla y contratos', tipo: 'barh', span: 6, h: 188,
      datos(base) {
        return {
          tipo: 'barh', titulo: 'Plantilla por área', subtitulo: 'Colaboradores por área',
          labels: base.plantillaArea.map((a) => a.area),
          values: base.plantillaArea.map((a) => a.count),
          colors: base.plantillaArea.map((a) => colorArea(a.area)),
          unit: ''
        };
      }
    },
    {
      id: 'donut-contratos', nombre: 'Contratos por estado', cat: 'Plantilla y contratos', tipo: 'donut', span: 6, h: 188,
      datos(base) {
        return {
          tipo: 'donut', titulo: 'Contratos por estado', subtitulo: 'Vigentes, por vencer y vencidos',
          labels: ['Vigentes', 'Por vencer', 'Vencidos'],
          values: [base.contratos.vigente, base.contratos.por_vencer, base.contratos.vencido],
          colors: [PALETA.salvia, PALETA.ambar, PALETA.terracota]
        };
      }
    },
    {
      id: 'table-personal', nombre: 'Personal y contratos', cat: 'Plantilla y contratos', tipo: 'table', span: 12, h: 220, csv: true,
      datos(base) {
        return {
          tipo: 'table', titulo: 'Personal y contratos', subtitulo: 'Primeros 12 colaboradores',
          headers: ['Empleado', 'Área', 'Cargo', 'Contrato', 'Fin', 'Estado'],
          rows: base.empleados.slice(0, 12).map((emp) => {
            const fila = filaTablaPersonal(emp);
            fila[5] = celda(UI.estadoContratoLabel(fila[5]) || fila[5], fila[5] === 'vencido' ? 'danger' : fila[5] === 'por_vencer' ? 'late' : 'success');
            return fila;
          }),
          csv: {
            headers: ['Empleado', 'Área', 'Cargo', 'Contrato', 'Fin', 'Estado'],
            rows: base.empleados.map(filaTablaPersonal)
          }
        };
      }
    },
    {
      id: 'table-vencimientos', nombre: 'Contratos por vencer', cat: 'Plantilla y contratos', tipo: 'table', span: 6, h: 220, csv: true,
      datos(base) {
        return {
          tipo: 'table', titulo: 'Contratos por vencer', subtitulo: 'Alertas de renovación',
          headers: ['Empleado', 'Área', 'Fin', 'Estado'],
          rows: base.vencimientos.slice(0, 10).map((emp) => [
            emp.nombre,
            emp.area,
            UI.fechaCorta(emp.contrato.fin),
            celda(UI.estadoContratoLabel(emp.contrato.estado), emp.contrato.estado === 'vencido' ? 'danger' : 'late')
          ]),
          csv: {
            headers: ['Empleado', 'Área', 'Fin', 'Estado'],
            rows: base.vencimientos.map((emp) => [emp.nombre, emp.area, emp.contrato.fin, UI.estadoContratoLabel(emp.contrato.estado)])
          }
        };
      }
    },
    {
      id: 'barv-cumple-meses', nombre: 'Cumpleaños por mes', cat: 'Personas y cumpleaños', tipo: 'barv', span: 6, h: 188,
      datos(base) {
        return {
          tipo: 'barv', titulo: 'Cumpleaños por mes', subtitulo: 'Distribución anual de la plantilla',
          labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
          values: base.cumpleMeses,
          unit: ''
        };
      }
    },
    {
      id: 'table-cumple', nombre: 'Próximos cumpleaños', cat: 'Personas y cumpleaños', tipo: 'table', span: 6, h: 220, csv: true,
      datos(base) {
        return {
          tipo: 'table', titulo: 'Próximos cumpleaños', subtitulo: 'Siguientes cumpleaños desde la fecha de corte',
          headers: ['Colaborador', 'Área', 'Fecha', 'Días'],
          rows: base.proximos.map((item) => [
            item.emp.nombre,
            item.emp.area,
            UI.fechaCorta(item.fecha),
            celda(item.dias === 0 ? 'Hoy' : `${item.dias} días`, item.dias <= 15 ? 'success' : 'neutral')
          ]),
          csv: {
            headers: ['Colaborador', 'Área', 'Fecha', 'Días'],
            rows: base.proximos.map((item) => [item.emp.nombre, item.emp.area, item.fecha, item.dias])
          }
        };
      }
    },
    {
      id: 'table-justificaciones', nombre: 'Justificaciones', cat: 'Personas y cumpleaños', tipo: 'table', span: 12, h: 220, csv: true, roles: ['rrhh', 'dueno'],
      datos(base) {
        return {
          tipo: 'table', titulo: 'Justificaciones aprobadas', subtitulo: 'Faltas respaldadas por RRHH',
          headers: ['Colaborador', 'Fecha', 'Motivo', 'Sustento', 'Registrado por'],
          rows: base.justificaciones.slice(0, 10).map((j) => {
            const emp = base.empleados.find((e) => e.id === j.empleadoId);
            return [emp?.nombre || j.empleadoId, UI.fechaCorta(j.fecha), j.motivo || '—', j.archivo?.nombre || '—', j.creadoPor || '—'];
          }),
          csv: {
            headers: ['Colaborador', 'Fecha', 'Motivo', 'Sustento', 'Registrado por'],
            rows: base.justificaciones.map((j) => {
              const emp = base.empleados.find((e) => e.id === j.empleadoId);
              return [emp?.nombre || j.empleadoId, j.fecha, j.motivo || '—', j.archivo?.nombre || '—', j.creadoPor || '—'];
            })
          }
        };
      }
    },
    {
      id: 'insight-asistencia', nombre: 'Insight: asistencia', cat: 'Resumen ejecutivo', tipo: 'insight', span: 6, h: 100,
      datos(base) {
        return { tipo: 'insight', icono: '💡', titulo: 'Lectura de asistencia', texto: base.insights.asistencia, destacado: `${base.resumen.pctAsistencia}%` };
      }
    },
    {
      id: 'insight-tardanzas', nombre: 'Insight: puntualidad', cat: 'Resumen ejecutivo', tipo: 'insight', span: 6, h: 100,
      datos(base) {
        return { tipo: 'insight', icono: '⏱️', titulo: 'Lectura de puntualidad', texto: base.insights.tardanzas, destacado: `${base.resumen.totalTardanzas} tardanzas` };
      }
    },
    {
      id: 'insight-plantilla', nombre: 'Insight: plantilla', cat: 'Resumen ejecutivo', tipo: 'insight', span: 6, h: 100,
      datos(base) {
        return { tipo: 'insight', icono: '👥', titulo: 'Lectura de plantilla', texto: base.insights.plantilla, destacado: `${base.empleados.length} colaboradores` };
      }
    },
    {
      id: 'insight-auditoria', nombre: 'Insight: accesos', cat: 'Auditoría NFC', tipo: 'insight', span: 6, h: 100, roles: ['jefe', 'dueno'],
      datos(base) {
        return { tipo: 'insight', icono: '🛡️', titulo: 'Lectura de accesos', texto: base.insights.auditoria, destacado: `${base.denegados.length} denegados` };
      }
    },
    {
      id: 'kpi-auditoria', nombre: 'Accesos NFC', cat: 'Auditoría NFC', tipo: 'kpi', span: 12, h: 112, roles: ['jefe', 'dueno'],
      datos(base) {
        const pctDenegados = base.auditoria.length ? Math.round((base.denegados.length / base.auditoria.length) * 100) : 0;
        return {
          tipo: 'kpi', titulo: 'Auditoría de accesos NFC', subtitulo: 'Registros del periodo',
          kpis: [
            { label: 'Accesos totales', valor: String(base.auditoria.length), detalle: 'Registros en el periodo', tono: 'neutral' },
            { label: 'Autorizados', valor: String(base.auditoria.length - base.denegados.length), detalle: 'Ingresos permitidos', tono: 'success' },
            { label: 'Denegados', valor: String(base.denegados.length), detalle: `${pctDenegados}% del total`, tono: 'danger' },
            { label: 'Zonas monitoreadas', valor: String(base.auditoriaPorZona.size), detalle: 'Con registros de acceso', tono: 'warning' }
          ]
        };
      }
    },
    {
      id: 'donut-auditoria', nombre: 'Accesos permitidos', cat: 'Auditoría NFC', tipo: 'donut', span: 6, h: 188, roles: ['jefe', 'dueno'],
      datos(base) {
        return {
          tipo: 'donut', titulo: 'Accesos permitidos vs denegados', subtitulo: 'Resultado de la validación NFC',
          labels: ['Autorizados', 'Denegados'],
          values: [base.auditoria.length - base.denegados.length, base.denegados.length],
          colors: [PALETA.salvia, PALETA.terracota]
        };
      }
    },
    {
      id: 'table-auditoria', nombre: 'Auditoría de accesos', cat: 'Auditoría NFC', tipo: 'table', span: 12, h: 220, csv: true, roles: ['jefe', 'dueno'],
      datos(base) {
        const filas = base.auditoria.slice(0, 12).map((a) => {
          const emp = base.empleados.find((e) => e.id === a.empleadoId);
          return [
            a.fecha || '—',
            a.hora || '—',
            emp?.nombre || a.empleadoId || '—',
            a.zonaNombre || a.zona || '—',
            celda(a.permitido ? 'Autorizado' : 'Denegado', a.permitido ? 'success' : 'danger'),
            a.motivo || '—'
          ];
        });
        return {
          tipo: 'table', titulo: 'Auditoría de accesos', subtitulo: 'Últimos 12 registros del periodo',
          headers: ['Fecha', 'Hora', 'Colaborador', 'Zona', 'Resultado', 'Motivo'],
          rows: filas,
          csv: {
            headers: ['Fecha', 'Hora', 'Colaborador', 'Zona', 'Resultado', 'Motivo'],
            rows: base.auditoria.map((a) => {
              const emp = base.empleados.find((e) => e.id === a.empleadoId);
              return [a.fecha || '—', a.hora || '—', emp?.nombre || a.empleadoId || '—', a.zonaNombre || a.zona || '—', a.permitido ? 'Autorizado' : 'Denegado', a.motivo || '—'];
            })
          }
        };
      }
    }
  ];

  const PLANTILLAS = {
    resumen: ['kpi-resumen', 'line-asistencia', 'barh-tardanzas-area', 'insight-asistencia', 'insight-tardanzas'],
    asistencia: ['kpi-resumen', 'line-asistencia', 'barh-tardanzas-area', 'insight-asistencia', 'insight-tardanzas', 'barv-tardanzas-dia', 'table-horarios'],
    plantilla: ['kpi-plantilla', 'barh-plantilla', 'donut-contratos', 'insight-plantilla', 'table-personal', 'table-vencimientos'],
    personas: ['kpi-plantilla', 'barv-cumple-meses', 'table-cumple', 'insight-plantilla', 'table-justificaciones'],
    auditoria: ['kpi-auditoria', 'donut-auditoria', 'insight-auditoria', 'table-auditoria']
  };

  function widgetsParaRol(rol) {
    return WIDGETS.filter((w) => !w.roles || w.roles.includes(rol));
  }

  // ============================================================
  // Layout y paginación
  // ============================================================

  function anchoDeSpan(span) {
    const contenido = BASE_W - (PADX * 2);
    const totalGaps = 11 * GAP;
    const col = (contenido - totalGaps) / 12;
    return Math.floor((col * span) + (GAP * (span - 1)));
  }

  function construirPaginas(ids, widgetsData) {
    const paginas = [];
    let actual = { widgets: [], y: 0, rowH: 0, x: PADX, maxH: 0 };
    const totalH = CONTENT_H;

    ids.forEach((id) => {
      const def = WIDGETS.find((w) => w.id === id);
      if (!def) return;
      const w = anchoDeSpan(def.span);
      const h = Math.min(def.h, totalH);

      if (actual.x + w > BASE_W - PADX) {
        actual.x = PADX;
        actual.y += actual.rowH + GAP;
        actual.rowH = 0;
      }
      if (actual.y + h > totalH) {
        paginas.push(actual);
        actual = { widgets: [], y: 0, rowH: 0, x: PADX, maxH: 0 };
      }

      actual.widgets.push({
        ...def,
        datos: widgetsData[id],
        x: actual.x,
        y: actual.y,
        w,
        h
      });

      actual.rowH = Math.max(actual.rowH, h);
      actual.maxH = Math.max(actual.maxH, actual.y + h);
      actual.x += w + GAP;
    });

    if (actual.widgets.length) paginas.push(actual);

    return paginas.map((pagina, indice) => ({
      widgets: pagina.widgets,
      numero: indice + 1,
      total: Math.max(1, paginas.length)
    }));
  }

  // ============================================================
  // Charts
  // ============================================================

  function coloresTema(tema) {
    return {
      texto: tema === 'oscuro' ? 'rgba(255,255,255,0.72)' : '#8B887E',
      grid: tema === 'oscuro' ? 'rgba(255,255,255,0.08)' : 'rgba(30,30,30,0.05)'
    };
  }

  function crearChartDeDatos(canvas, datos, tema, responsive, dpr, escala = 1) {
    if (!window.Chart) return null;
    const c = coloresTema(tema);
    const f = (px) => px * escala;
    const baseOptions = {
      responsive,
      maintainAspectRatio: false,
      devicePixelRatio: dpr || Math.max(2, window.devicePixelRatio || 1),
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(30,30,30,0.95)',
          titleColor: '#F5D25A',
          bodyColor: '#FFFFFF',
          padding: f(6),
          cornerRadius: f(6),
          titleFont: { size: f(6.5), weight: '600' },
          bodyFont: { size: f(6) },
          displayColors: true
        }
      }
    };

    const ticksX = { color: c.texto, font: { size: f(7.5) }, grid: { display: false } };
    const ticksY = { color: c.texto, font: { size: f(7.5) }, grid: { color: c.grid } };

    if (datos.tipo === 'line') {
      return new Chart(canvas, {
        type: 'line',
        data: {
          labels: datos.labels,
          datasets: [{
            label: datos.titulo,
            data: datos.values,
            borderColor: PALETA.bosque,
            backgroundColor: 'rgba(47,107,79,0.12)',
            fill: true,
            tension: 0.35,
            pointRadius: f(1.4),
            pointBackgroundColor: PALETA.salvia,
            pointBorderColor: 'transparent',
            pointBorderWidth: 0,
            pointHoverRadius: f(4),
            borderWidth: f(2)
          }]
        },
        options: {
          ...baseOptions,
          interaction: { intersect: false, mode: 'index' },
          scales: {
            x: { ticks: { ...ticksX, maxTicksLimit: 10, autoSkip: true }, grid: { display: false } },
            y: { min: 0, max: 100, ticks: { ...ticksY, stepSize: 20, callback: (v) => `${v}%` } }
          }
        }
      });
    }

    if (datos.tipo === 'barv') {
      return new Chart(canvas, {
        type: 'bar',
        data: {
          labels: datos.labels,
          datasets: [{
            label: datos.titulo,
            data: datos.values,
            backgroundColor: 'rgba(30,58,95,0.85)',
            borderColor: PALETA.marino,
            borderWidth: f(1),
            borderRadius: f(3),
            maxBarThickness: f(13)
          }]
        },
        options: {
          ...baseOptions,
          scales: {
            x: { ticks: { ...ticksX, maxTicksLimit: 12, autoSkip: true }, grid: { display: false } },
            y: { min: 0, suggestedMax: Math.max(2, Math.max(...datos.values) + 1), ticks: { ...ticksY, stepSize: 1, precision: 0 } }
          }
        }
      });
    }

    if (datos.tipo === 'barh') {
      return new Chart(canvas, {
        type: 'bar',
        data: {
          labels: datos.labels,
          datasets: [{
            label: datos.titulo,
            data: datos.values,
            backgroundColor: datos.colors || PALETA.dorado,
            borderColor: datos.colors || PALETA.dorado,
            borderWidth: 0,
            borderRadius: f(3),
            maxBarThickness: f(9),
            indexAxis: 'y'
          }]
        },
        options: {
          ...baseOptions,
          indexAxis: 'y',
          scales: {
            x: { min: 0, suggestedMax: Math.max(2, Math.max(...datos.values) + 1), ticks: { ...ticksY, precision: 0, maxTicksLimit: 6 }, grid: { color: c.grid } },
            y: { ticks: { ...ticksX, autoSkip: false }, grid: { display: false } }
          }
        }
      });
    }

    if (datos.tipo === 'donut') {
      return new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: datos.labels,
          datasets: [{
            data: datos.values,
            backgroundColor: datos.colors,
            borderColor: TEMAS[tema] ? TEMAS[tema].tarjeta : '#FFFFFF',
            borderWidth: f(3),
            cutout: '68%',
            hoverOffset: 4
          }]
        },
        options: {
          ...baseOptions,
          cutout: '68%'
        }
      });
    }

    return null;
  }

  // ============================================================
  // Render de widgets (HTML de vista previa)
  // ============================================================

  function renderKpisHTML(kpis, tema) {
    const tonos = {
      success: 'rgba(111,169,111,0.14)',
      warning: 'rgba(209,158,51,0.16)',
      danger: 'rgba(196,95,63,0.14)',
      neutral: 'rgba(30,30,30,0.06)'
    };
    return `<div class="reporte-kpis">
      ${kpis.map((kpi) => `
        <div class="reporte-kpi" style="background:${tonos[kpi.tono] || tonos.neutral}">
          <span class="reporte-kpi-label">${UI.esc(kpi.label)}</span>
          <strong class="reporte-kpi-valor">${UI.esc(kpi.valor)}</strong>
          <small class="reporte-kpi-detalle">${UI.esc(kpi.detalle)}</small>
        </div>
      `).join('')}
    </div>`;
  }

  function renderTablaHTML(datos) {
    const filas = datos.rows.slice(0, 12);
    const claseTono = (tono) => tono ? `reporte-cell-${tono}` : '';
    return `
      <table class="reporte-tabla">
        <thead><tr>${datos.headers.map((h) => `<th>${UI.esc(h)}</th>`).join('')}</tr></thead>
        <tbody>
          ${filas.map((fila) => `
            <tr>${fila.map((cell) => {
              const esObjeto = cell && typeof cell === 'object';
              const texto = esObjeto ? cell.v : cell;
              const tono = esObjeto ? cell.t : '';
              return `<td class="${claseTono(tono)}">${UI.esc(texto == null ? '—' : texto)}</td>`;
            }).join('')}</tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  function renderWidgetHTML(def, datos, pagina, tema) {
    const contenido = datos.tipo === 'kpi'
      ? renderKpisHTML(datos.kpis, tema)
      : datos.tipo === 'table'
        ? renderTablaHTML(datos)
        : datos.tipo === 'insight'
          ? `<div class="reporte-insight">
              <span class="reporte-insight-icono">${UI.esc(datos.icono)}</span>
              <div>
                <strong>${UI.esc(datos.titulo)}</strong>
                <p>${UI.esc(datos.texto)}</p>
                <em>${UI.esc(datos.destacado || '')}</em>
              </div>
            </div>`
          : '<div class="reporte-chart"></div>';

    return `
      <article class="reporte-widget" data-widget="${UI.esc(def.id)}" data-pagina="${pagina}">
        <header class="reporte-widget-head">
          <div>
            <h4>${UI.esc(datos.titulo || def.nombre)}</h4>
            ${datos.subtitulo ? `<p>${UI.esc(datos.subtitulo)}</p>` : ''}
          </div>
          ${datos.csv ? `<button type="button" class="reporte-csv-btn" data-csv="${UI.esc(def.id)}" title="Exportar tabla a CSV">CSV</button>` : ''}
        </header>
        <div class="reporte-widget-body">${contenido}</div>
      </article>
    `;
  }

  function montarPreviewCharts(pagina, tema) {
    Object.keys(charts).forEach((key) => { charts[key]?.destroy(); });
    charts = {};
    if (!pagina) return;

    pagina.widgets.forEach((def) => {
      const contenedor = document.querySelector(`.reporte-widget[data-widget="${def.id}"][data-pagina="${pagina.numero}"] .reporte-chart`);
      if (!contenedor) return;
      const canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      contenedor.appendChild(canvas);
      const chart = crearChartDeDatos(canvas, def.datos, tema, true, Math.max(2, window.devicePixelRatio || 1));
      if (chart) charts[`${pagina.numero}-${def.id}`] = chart;
    });
  }

  // ============================================================
  // Exportación PNG
  // ============================================================

  function redondearRect(ctx, x, y, w, h, r) {
    const radio = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radio, y);
    ctx.arcTo(x + w, y, x + w, y + h, radio);
    ctx.arcTo(x + w, y + h, x, y + h, radio);
    ctx.arcTo(x, y + h, x, y, radio);
    ctx.arcTo(x, y, x + w, y, radio);
    ctx.closePath();
  }

  function ajustarTexto(ctx, texto, maxWidth) {
    const lineas = [];
    const palabras = String(texto || '').split(/\s+/);
    let linea = '';
    palabras.forEach((palabra) => {
      const prueba = linea ? `${linea} ${palabra}` : palabra;
      if (ctx.measureText(prueba).width <= maxWidth) {
        linea = prueba;
      } else {
        if (linea) lineas.push(linea);
        linea = palabra;
      }
    });
    if (linea) lineas.push(linea);
    return lineas;
  }

  function dibujarCabecera(ctx, meta, tema, pagina) {
    const t = TEMAS[tema];
    const grad = ctx.createLinearGradient(0, 0, 0, HEADER_H);
    grad.addColorStop(0, t.cabecera[0]);
    grad.addColorStop(1, t.cabecera[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, BASE_W, HEADER_H);

    // Marca
    ctx.fillStyle = t.acento;
    redondearRect(ctx, PADX, 17, 26, 26, 7);
    ctx.fill();
    ctx.fillStyle = '#1E1E1E';
    ctx.font = '800 13px "Plus Jakarta Sans", Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', PADX + 13, 31);

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '600 7px "Plus Jakarta Sans", Inter, sans-serif';
    ctx.fillText('INNOVATION NFC E.S.F', PADX + 35, 24);
    ctx.fillStyle = t.cabeceraTexto;
    ctx.font = '700 18px "Plus Jakarta Sans", Inter, sans-serif';
    ctx.fillText(meta.titulo, PADX + 35, 42);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '400 8px "Plus Jakarta Sans", Inter, sans-serif';
    const desc = meta.descripcion || '';
    ctx.fillText(ajustarTexto(ctx, desc, BASE_W - (PADX * 2) - 320)[0] || desc, PADX + 35, 56);

    // Panel de metadatos alineado
    const panelW = 220;
    const panelX = BASE_W - PADX - panelW;
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    redondearRect(ctx, panelX, 14, panelW, 46, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const filasMeta = [
      ['Periodo', meta.periodo],
      ['Corte', meta.corte],
      ['Autor', meta.autor || '—']
    ];
    filasMeta.forEach(([label, value], indice) => {
      const fy = 27 + (indice * 13);
      ctx.fillStyle = 'rgba(255,255,255,0.46)';
      ctx.font = '700 5.5px "Plus Jakarta Sans", Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label.toUpperCase(), panelX + 9, fy);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '600 6.5px "Plus Jakarta Sans", Inter, sans-serif';
      ctx.textAlign = 'right';
      let texto = String(value || '');
      while (ctx.measureText(texto).width > 125 && texto.length > 1) texto = `${texto.slice(0, -2)}…`;
      ctx.fillText(texto, panelX + panelW - 9, fy);
    });
    ctx.textAlign = 'left';
  }

  function dibujarPie(ctx, meta, tema, pagina) {
    const t = TEMAS[tema];
    ctx.fillStyle = t.pie;
    ctx.fillRect(0, BASE_H - FOOTER_H, BASE_W, FOOTER_H);
    ctx.fillStyle = t.pieTexto;
    ctx.font = '500 7px "Plus Jakarta Sans", Inter, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${meta.periodo} · Corte ${meta.corte}`, PADX, BASE_H - (FOOTER_H / 2));
    ctx.textAlign = 'right';
    ctx.fillText('INNOVATION NFC E.S.F', BASE_W - PADX, BASE_H - (FOOTER_H / 2));
    ctx.textAlign = 'center';
    ctx.fillStyle = t.acento;
    ctx.font = '700 7px "Plus Jakarta Sans", Inter, sans-serif';
    ctx.fillText(`Página ${pagina.numero} de ${pagina.total}`, BASE_W / 2, BASE_H - (FOOTER_H / 2));
    ctx.textAlign = 'left';
  }

  function dibujarKpisExport(ctx, datos, x, y, w, h, tema) {
    const t = TEMAS[tema];
    const kpis = datos.kpis || [];
    const gap = 7;
    const ancho = Math.floor((w - (gap * (kpis.length - 1))) / kpis.length);
    const tonos = {
      success: 'rgba(111,169,111,0.14)',
      warning: 'rgba(209,158,51,0.16)',
      danger: 'rgba(196,95,63,0.14)',
      neutral: t.fondoDetalle
    };
    kpis.forEach((kpi, indice) => {
      const kx = x + (indice * (ancho + gap));
      ctx.fillStyle = tonos[kpi.tono] || tonos.neutral;
      redondearRect(ctx, kx, y, ancho, h, 7);
      ctx.fill();
      ctx.fillStyle = t.subtexto;
      ctx.font = '700 6.5px "Plus Jakarta Sans", Inter, sans-serif';
      ctx.fillText(String(kpi.label).toUpperCase(), kx + 10, y + 17);
      ctx.fillStyle = t.texto;
      ctx.font = '800 20px "Plus Jakarta Sans", Inter, sans-serif';
      ctx.fillText(String(kpi.valor), kx + 10, y + 42);
      ctx.fillStyle = t.subtexto;
      ctx.font = '400 7px "Plus Jakarta Sans", Inter, sans-serif';
      ctx.fillText(kpi.detalle || '', kx + 10, y + 57);
    });
  }

  function dibujarTablaExport(ctx, datos, x, y, w, h, tema) {
    const t = TEMAS[tema];
    const headers = datos.headers || [];
    const filas = (datos.rows || []).slice(0, 12);
    const anchoCol = w / Math.max(1, headers.length);
    const filaH = 12;
    const filasMax = Math.max(2, Math.floor((h - filaH - 5) / filaH));

    ctx.fillStyle = t.fondoDetalle;
    redondearRect(ctx, x, y, w, filaH, 4);
    ctx.fill();
    ctx.font = '700 6px "Plus Jakarta Sans", Inter, sans-serif';
    headers.forEach((header, i) => {
      ctx.fillStyle = t.subtexto;
      ctx.fillText(header, x + 5 + (i * anchoCol), y + 11);
    });

    filas.slice(0, filasMax).forEach((fila, fi) => {
      const ry = y + filaH + (fi * filaH);
      if (fi % 2 === 0) {
        ctx.fillStyle = t.fondoDetalle;
        ctx.fillRect(x, ry, w, filaH);
      }
      fila.forEach((cell, i) => {
        const esObjeto = cell && typeof cell === 'object';
        const texto = String(esObjeto ? cell.v : (cell == null ? '—' : cell));
        ctx.fillStyle = esObjeto && cell.t && COLOR_ESTADO[cell.t] ? COLOR_ESTADO[cell.t] : t.texto;
        ctx.font = '500 6px "Plus Jakarta Sans", Inter, sans-serif';
        const max = anchoCol - 9;
        let dibujado = texto;
        while (ctx.measureText(dibujado).width > max && dibujado.length > 1) dibujado = `${dibujado.slice(0, -2)}…`;
        ctx.fillText(dibujado, x + 5 + (i * anchoCol), ry + 11);
      });
    });
  }

  function dibujarInsightExport(ctx, datos, x, y, w, h, tema) {
    const t = TEMAS[tema];
    ctx.fillStyle = t.fondoDetalle;
    redondearRect(ctx, x, y, w, h, 7);
    ctx.fill();
    ctx.font = '14px sans-serif';
    ctx.fillText(datos.icono || '💡', x + 11, y + 24);
    ctx.fillStyle = t.texto;
    ctx.font = '700 9px "Plus Jakarta Sans", Inter, sans-serif';
    ctx.fillText(datos.titulo, x + 33, y + 22);
    // Se permite hasta 3 líneas y se reduce ligeramente la tipografía
    // si hace falta para que ningún insight exportado pierda texto.
    let fuente = 7;
    let lineas = [];
    do {
      ctx.fillStyle = t.subtexto;
      ctx.font = `400 ${fuente}px "Plus Jakarta Sans", Inter, sans-serif`;
      lineas = ajustarTexto(ctx, datos.texto || '', w - 44);
      if (lineas.length <= 3) break;
      fuente -= 0.25;
    } while (fuente >= 5.5);
    lineas.slice(0, 3).forEach((linea, i) => {
      ctx.fillText(linea, x + 33, y + 34 + (i * 9.3));
    });
    if (datos.destacado) {
      ctx.fillStyle = t.acento;
      ctx.font = '700 7px "Plus Jakarta Sans", Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(datos.destacado, x + w - 10, y + 22);
      ctx.textAlign = 'left';
    }
  }

  function dibujarWidgetExport(ctx, def, tema) {
    const t = TEMAS[tema];
    const { x, y: yRelativo, w, h, datos } = def;
    const y = yRelativo + CONTENT_TOP;

    ctx.fillStyle = t.tarjeta;
    redondearRect(ctx, x, y, w, h, 9);
    ctx.fill();
    ctx.strokeStyle = t.borde;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = t.texto;
    ctx.font = '700 9px "Plus Jakarta Sans", Inter, sans-serif';
    ctx.fillText(datos.titulo || def.nombre, x + 11, y + 18);
    if (datos.subtitulo) {
      ctx.fillStyle = t.subtexto;
      ctx.font = '400 6.5px "Plus Jakarta Sans", Inter, sans-serif';
      ctx.fillText(datos.subtitulo, x + 11, y + 28);
    }

    const bodyY = y + 35;
    const bodyH = h - 43;
    const bodyW = w - 22;

    if (datos.tipo === 'kpi') {
      dibujarKpisExport(ctx, datos, x + 11, bodyY + 5, bodyW, bodyH - 10, tema);
      return;
    }
    if (datos.tipo === 'table') {
      dibujarTablaExport(ctx, datos, x + 11, bodyY + 5, bodyW, bodyH - 10, tema);
      return;
    }
    if (datos.tipo === 'insight') {
      dibujarInsightExport(ctx, datos, x + 11, bodyY + 5, bodyW, bodyH - 10, tema);
      return;
    }

    // Gráfico: Chart.js offscreen al tamaño de exportación
    const temp = document.createElement('canvas');
    temp.width = Math.max(1, Math.round(bodyW * EXPORT_SCALE));
    temp.height = Math.max(1, Math.round((bodyH - 10) * EXPORT_SCALE));
    const chart = crearChartDeDatos(temp, datos, tema, false, 1, EXPORT_SCALE);
    if (chart) {
      ctx.drawImage(temp, x + 11, bodyY + 5, bodyW, bodyH - 10);
      chart.destroy();
    }
  }

  // ============================================================
  // Exportación PPTX nativa (PptxGenJS)
  // Una diapositiva por página; gráficos nativos con marcadores.
  // ============================================================
  const PPT_W = 13.333;
  const PPT_H = 7.5;
  const PPT_S = PPT_W / BASE_W;
  const PPT_FONT = 'Arial';

  function pptHex(color, fallback = 'FFFFFF') {
    const valor = String(color || '').trim();
    if (/^#[0-9a-f]{3}$/i.test(valor)) {
      return valor.slice(1).split('').map((c) => c + c).join('');
    }
    if (/^#[0-9a-f]{6}/i.test(valor)) return valor.slice(1, 7);
    const rgb = valor.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgb) {
      return [rgb[1], rgb[2], rgb[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase();
    }
    return fallback;
  }

  function pptTema(tema) {
    const t = TEMAS[tema] || TEMAS.claro;
    const oscuro = tema === 'oscuro';
    return {
      fondo: pptHex(t.fondo, 'F6F2E7'),
      tarjeta: pptHex(t.tarjeta, 'FFFFFF'),
      texto: pptHex(t.texto, '1E1E1E'),
      sub: pptHex(t.subtexto, oscuro ? 'B8B0A0' : '8B887E'),
      borde: oscuro ? '5A4E36' : 'E2DCCF',
      detalle: oscuro ? '352F24' : 'F7F1DE',
      acento: pptHex(t.acento, 'F5D25A'),
      cabecera: pptHex(t.cabecera?.[0], '1E1E1E'),
      pie: pptHex(t.pie, '1E1E1E'),
      linea: '6FA96F',
      marino: '1E3A5F',
      grid: oscuro ? '4B4232' : 'ECE7DB',
      kpi: {
        success: oscuro ? '263326' : 'E7F0E4',
        warning: oscuro ? '3A3019' : 'FBF0D9',
        danger: oscuro ? '35221D' : 'F7E4DC',
        neutral: oscuro ? '2A2620' : 'F5F2EA'
      }
    };
  }

  function pptTexto(slide, texto, opciones = {}) {
    slide.addText(String(texto == null ? '' : texto), {
      fontFace: PPT_FONT,
      margin: 0,
      breakLine: false,
      ...opciones
    });
  }

  function pptRect(slide, pptx, opciones) {
    slide.addShape(pptx.ShapeType.roundRect, {
      rectRadius: 0.06,
      line: { color: opciones.fill?.color || 'FFFFFF', width: 0 },
      ...opciones
    });
  }

  function pptCabecera(slide, pptx, meta, pal) {
    const S = PPT_S;
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: PPT_W, h: HEADER_H * S,
      fill: { color: pal.cabecera }, line: { color: pal.cabecera, width: 0 }
    });
    pptRect(slide, pptx, {
      x: 24 * S, y: 17 * S, w: 26 * S, h: 26 * S,
      fill: { color: pal.acento }, line: { color: pal.acento, width: 0 }, rectRadius: 0.08
    });
    pptTexto(slide, 'N', {
      x: 24 * S, y: 18 * S, w: 26 * S, h: 24 * S,
      fontSize: 13, bold: true, color: '1E1E1E', align: 'center', valign: 'middle'
    });
    pptTexto(slide, 'INNOVATION NFC E.S.F', {
      x: 60 * S, y: 14 * S, w: 680 * S, h: 9 * S,
      fontSize: 6.5, bold: true, color: pal.acento, charSpacing: 1
    });
    pptTexto(slide, meta.titulo || 'Reporte de gestión', {
      x: 60 * S, y: 21 * S, w: 680 * S, h: 24 * S,
      fontSize: 18, bold: true, color: 'F7F2E8', fit: 'shrink', valign: 'middle'
    });
    pptTexto(slide, meta.descripcion || '', {
      x: 60 * S, y: 44 * S, w: 680 * S, h: 10 * S,
      fontSize: 8, color: 'D8D2C3', fit: 'shrink', valign: 'middle'
    });

    const panelX = 760 * S;
    const panelY = 14 * S;
    const panelW = 176 * S;
    const panelH = 42 * S;
    pptRect(slide, pptx, {
      x: panelX, y: panelY, w: panelW, h: panelH,
      fill: { color: '2A2A2A' }, line: { color: '5A4E36', width: 0.5 }, rectRadius: 0.06
    });
    const filas = [
      ['Periodo', meta.periodo || '—'],
      ['Corte', meta.corte || '—'],
      ['Autor', meta.autor || '—']
    ];
    filas.forEach(([label, valor], indice) => {
      const yy = panelY + 5 * S + indice * 12 * S;
      pptTexto(slide, label.toUpperCase(), {
        x: panelX + 7 * S, y: yy, w: 54 * S, h: 8 * S,
        fontSize: 4.8, bold: true, color: 'A9A28F', valign: 'middle'
      });
      pptTexto(slide, valor, {
        x: panelX + 60 * S, y: yy, w: 108 * S, h: 8 * S,
        fontSize: 6, color: 'F7F2E8', align: 'right', valign: 'middle', fit: 'shrink'
      });
    });
  }

  function pptPie(slide, pptx, meta, pagina, pal) {
    const S = PPT_S;
    const y = PPT_H - FOOTER_H * S;
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y, w: PPT_W, h: FOOTER_H * S,
      fill: { color: pal.pie }, line: { color: pal.pie, width: 0 }
    });
    pptTexto(slide, `${meta.periodo || ''} · Corte ${meta.corte || ''}`, {
      x: 24 * S, y: y + 7 * S, w: 300 * S, h: 12 * S,
      fontSize: 6, color: 'CFC8B8', valign: 'middle'
    });
    pptTexto(slide, 'INNOVATION NFC E.S.F', {
      x: 360 * S, y: y + 7 * S, w: 240 * S, h: 12 * S,
      fontSize: 5.5, color: 'CFC8B8', align: 'center', valign: 'middle'
    });
    pptTexto(slide, `Página ${pagina.numero} de ${pagina.total}`, {
      x: 760 * S, y: y + 7 * S, w: 176 * S, h: 12 * S,
      fontSize: 6, bold: true, color: pal.acento, align: 'right', valign: 'middle'
    });
  }

  function pptKpis(slide, pptx, datos, x, y, w, h, pal) {
    const kpis = datos.kpis || [];
    const gap = 7 * PPT_S;
    const ancho = (w - gap * (kpis.length - 1)) / Math.max(1, kpis.length);
    const tonos = { success: pal.kpi.success, warning: pal.kpi.warning, danger: pal.kpi.danger, neutral: pal.kpi.neutral };
    kpis.forEach((kpi, indice) => {
      const kx = x + indice * (ancho + gap);
      pptRect(slide, pptx, {
        x: kx, y, w: ancho, h,
        fill: { color: tonos[kpi.tono] || tonos.neutral },
        line: { color: pal.borde, width: 0.3 }
      });
      pptTexto(slide, String(kpi.label || '').toUpperCase(), {
        x: kx + 10 * PPT_S, y: y + 8 * PPT_S, w: ancho - 20 * PPT_S, h: 10 * PPT_S,
        fontSize: 6, bold: true, color: pal.sub, valign: 'middle', fit: 'shrink'
      });
      pptTexto(slide, kpi.valor == null ? '—' : kpi.valor, {
        x: kx + 10 * PPT_S, y: y + 20 * PPT_S, w: ancho - 20 * PPT_S, h: 22 * PPT_S,
        fontSize: 19, bold: true, color: pal.texto, valign: 'middle', fit: 'shrink'
      });
      pptTexto(slide, kpi.detalle || '', {
        x: kx + 10 * PPT_S, y: y + 43 * PPT_S, w: ancho - 20 * PPT_S, h: 9 * PPT_S,
        fontSize: 6.5, color: pal.sub, valign: 'middle', fit: 'shrink'
      });
    });
  }

  function pptInsight(slide, pptx, datos, x, y, w, h, pal) {
    pptRect(slide, pptx, {
      x, y, w, h, fill: { color: pal.detalle }, line: { color: pal.borde, width: 0.3 }
    });
    pptTexto(slide, datos.icono || '💡', {
      x: x + 10 * PPT_S, y: y + 8 * PPT_S, w: 18 * PPT_S, h: 18 * PPT_S,
      fontSize: 14, valign: 'middle'
    });
    pptTexto(slide, datos.titulo || '', {
      x: x + 31 * PPT_S, y: y + 7 * PPT_S, w: w - 100 * PPT_S, h: 12 * PPT_S,
      fontSize: 9, bold: true, color: pal.texto, fit: 'shrink', valign: 'middle'
    });
    pptTexto(slide, datos.texto || '', {
      x: x + 31 * PPT_S, y: y + 20 * PPT_S, w: w - 42 * PPT_S, h: h - 25 * PPT_S,
      fontSize: 7, color: pal.sub, fit: 'shrink', valign: 'top'
    });
    if (datos.destacado) {
      pptTexto(slide, datos.destacado, {
        x: x + w - 105 * PPT_S, y: y + 8 * PPT_S, w: 92 * PPT_S, h: 10 * PPT_S,
        fontSize: 7, bold: true, color: pal.acento, align: 'right', valign: 'middle', fit: 'shrink'
      });
    }
  }

  function pptTabla(slide, datos, x, y, w, h, pal) {
    const headers = datos.headers || [];
    const filas = (datos.rows || []).slice(0, 12);
    const pesos = [1.4, 0.8, 1.7, 1.1, 0.8, 0.7];
    const totalPesos = pesos.slice(0, headers.length).reduce((a, b) => a + b, 0);
    const colW = pesos.slice(0, headers.length).map((peso) => (w * peso) / totalPesos);
    const rowH = Math.max(0.14, (h - 0.06) / (filas.length + 1));
    const colorEstado = {
      success: '6FA96F',
      late: 'D19E33',
      absent: 'C45F3F',
      justified: '2F6B4F',
      danger: 'C45F3F'
    };
    const cabecera = headers.map((header) => ({
      text: String(header),
      options: { bold: true, color: pal.sub, fill: { color: pal.detalle }, fontSize: 5.5, margin: 0.02 }
    }));
    const cuerpo = filas.map((fila) => fila.map((cell) => {
      const esObjeto = cell && typeof cell === 'object';
      const texto = esObjeto ? cell.v : cell;
      const color = esObjeto && colorEstado[cell.t] ? colorEstado[cell.t] : pal.texto;
      return {
        text: String(texto == null ? '—' : texto),
        options: { color, fontSize: 5.7, margin: 0.018 }
      };
    }));
    slide.addTable([cabecera, ...cuerpo], {
      x, y, w, colW, rowH,
      fontFace: PPT_FONT,
      fontSize: 5.7,
      color: pal.texto,
      border: { pt: 0.35, color: pal.borde },
      valign: 'middle',
      autoPage: false,
      margin: 0.02
    });
  }

  function pptGrafico(slide, pptx, datos, x, y, w, h, pal) {
    const comun = {
      x, y, w, h,
      showLegend: false,
      showTitle: false,
      showValue: false,
      catAxisLabelFontSize: 5.5,
      valAxisLabelFontSize: 5.5,
      catAxisLabelColor: pal.sub,
      valAxisLabelColor: pal.sub,
      catGridLine: { color: pal.grid, pt: 0.4 },
      valGridLine: { color: pal.grid, pt: 0.4 },
      chartArea: { fill: { color: pal.tarjeta }, border: { color: pal.tarjeta, width: 0 } },
      plotArea: { fill: { color: pal.tarjeta }, border: { color: pal.tarjeta, width: 0 } },
      legendColor: pal.sub,
      legendFontFace: PPT_FONT,
      legendFontSize: 6
    };

    if (datos.tipo === 'line') {
      slide.addChart(pptx.ChartType.line, [{
        name: datos.titulo || 'Serie',
        labels: datos.labels || [],
        values: datos.values || []
      }], {
        ...comun,
        chartColors: [pal.linea],
        lineDataSymbol: 'circle',
        lineDataSymbolSize: 5,
        lineDataSymbolLineSize: 1,
        lineSize: 1.5,
        lineSmooth: true,
        valAxisMinVal: 0,
        valAxisMaxVal: 100
      });
      return;
    }
    if (datos.tipo === 'barh' || datos.tipo === 'barv') {
      slide.addChart(pptx.ChartType.bar, [{
        name: datos.titulo || 'Serie',
        labels: datos.labels || [],
        values: datos.values || []
      }], {
        ...comun,
        barDir: datos.tipo === 'barh' ? 'bar' : 'col',
        barGrouping: 'clustered',
        barGapWidthPct: 55,
        chartColors: datos.tipo === 'barv' ? [pal.marino] : [pal.acento],
        valAxisMinVal: 0
      });
      return;
    }
    if (datos.tipo === 'donut') {
      slide.addChart(pptx.ChartType.doughnut, [{
        name: datos.titulo || 'Serie',
        labels: datos.labels || [],
        values: datos.values || []
      }], {
        ...comun,
        showLegend: true,
        legendPos: 'r',
        showPercent: true,
        holeSize: 58,
        chartColors: (datos.colors || []).map((color) => pptHex(color, pal.acento))
      });
    }
  }

  function pptWidget(slide, pptx, def, pal) {
    const S = PPT_S;
    const x = def.x * S;
    const y = (CONTENT_TOP + def.y) * S;
    const w = def.w * S;
    const h = def.h * S;
    const datos = def.datos || {};
    if (!datos.tipo) return;

    pptRect(slide, pptx, {
      x, y, w, h, fill: { color: pal.tarjeta }, line: { color: pal.borde, width: 0.5 }
    });
    pptTexto(slide, datos.titulo || def.nombre || '', {
      x: x + 11 * S, y: y + 7 * S, w: w - 22 * S, h: 13 * S,
      fontSize: 9, bold: true, color: pal.texto, fit: 'shrink', valign: 'middle'
    });
    if (datos.subtitulo) {
      pptTexto(slide, datos.subtitulo, {
        x: x + 11 * S, y: y + 21 * S, w: w - 22 * S, h: 8 * S,
        fontSize: 6.5, color: pal.sub, fit: 'shrink', valign: 'middle'
      });
    }

    const bodyX = x + 11 * S;
    const bodyY = y + 35 * S;
    const bodyW = w - 22 * S;
    const bodyH = h - 43 * S;

    try {
      if (datos.tipo === 'kpi') pptKpis(slide, pptx, datos, bodyX, bodyY + 5 * S, bodyW, bodyH - 10 * S, pal);
      else if (datos.tipo === 'table') pptTabla(slide, datos, bodyX, bodyY + 5 * S, bodyW, bodyH - 10 * S, pal);
      else if (datos.tipo === 'insight') pptInsight(slide, pptx, datos, bodyX, bodyY + 5 * S, bodyW, bodyH - 10 * S, pal);
      else pptGrafico(slide, pptx, datos, bodyX, bodyY + 5 * S, bodyW, bodyH - 10 * S, pal);
    } catch (error) {
      console.warn('[Reportes] No se pudo dibujar el widget en PPT:', def.id, error);
      pptTexto(slide, 'No se pudo generar este gráfico en PPTX.', {
        x: bodyX, y: bodyY + 12 * S, w: bodyW, h: 24 * S,
        fontSize: 8, color: pal.sub, align: 'center', valign: 'middle', fit: 'shrink'
      });
    }
  }

  async function exportarPPTX(paginas, meta) {
    const Pptx = window.PptxGenJS;
    if (!Pptx) {
      UI.toast('No se pudo cargar el generador de PPTX. Recarga la página.', 'warning');
      return false;
    }
    if (!paginas?.length) {
      UI.toast('No hay páginas para exportar.', 'warning');
      return false;
    }
    try {
      const pptx = new Pptx();
      pptx.layout = 'LAYOUT_WIDE';
      pptx.author = meta.autor || 'INNOVATION NFC E.S.F';
      pptx.company = 'INNOVATION NFC E.S.F';
      pptx.subject = 'Reporte de gestión';
      pptx.title = meta.titulo || 'Reporte de gestión';
      const pal = pptTema(meta.tema);

      paginas.forEach((pagina) => {
        const slide = pptx.addSlide();
        slide.background = { color: pal.fondo };
        pptCabecera(slide, pptx, meta, pal);
        pagina.widgets.forEach((def) => pptWidget(slide, pptx, def, pal));
        pptPie(slide, pptx, meta, pagina, pal);
      });

      const mes = String(meta.periodo || 'periodo').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const nombre = `reporte-${mes || 'gestion'}.pptx`;
      await pptx.writeFile({ fileName: nombre });
      UI.toast(`PPTX exportado · ${paginas.length} diapositiva(s)`, 'success');
      return true;
    } catch (error) {
      console.error('[Reportes] Error exportando PPTX:', error);
      UI.toast('No se pudo generar el PPTX. Revisa la consola.', 'warning');
      return false;
    }
  }


  function exportarPaginaPNG(pagina, meta, tema) {
    const canvas = document.createElement('canvas');
    canvas.width = BASE_W * EXPORT_SCALE;
    canvas.height = BASE_H * EXPORT_SCALE;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(EXPORT_SCALE, 0, 0, EXPORT_SCALE, 0, 0);

    const t = TEMAS[tema];
    const grad = ctx.createLinearGradient(0, 0, BASE_W, BASE_H);
    grad.addColorStop(0, t.fondo);
    grad.addColorStop(1, t.fondo2 || t.fondo);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, BASE_W, BASE_H);

    dibujarCabecera(ctx, meta, tema, pagina);
    pagina.widgets.forEach((def) => dibujarWidgetExport(ctx, def, tema));
    dibujarPie(ctx, meta, tema, pagina);

    const nombre = `reporte-${String(meta.titulo || 'gestion').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-p${pagina.numero}.png`;
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        descargarArchivo(url, nombre);
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }, 'image/png');
    } else {
      descargarArchivo(canvas.toDataURL('image/png'), nombre);
    }
  }

  function descargarArchivo(url, nombre) {
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
  }

  function exportarCSVPlano(headers, rows, nombre) {
    const escapar = (valor) => `"${String(valor == null ? '' : valor).replace(/"/g, '""')}"`;
    const contenido = '\uFEFF' + [
      headers.map(escapar).join(','),
      ...rows.map((fila) => fila.map(escapar).join(','))
    ].join('\n');
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    descargarArchivo(url, nombre);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function exportarCSVWidget(datos, id) {
    if (!datos?.csv) return;
    exportarCSVPlano(datos.csv.headers, datos.csv.rows, `${id || 'tabla'}.csv`);
  }

  function exportarPowerBIAsistencia(base) {
    const headers = [
      'empleado_id', 'empleado', 'area', 'cargo', 'tipo_contrato', 'estado_contrato',
      'fecha', 'dia', 'entrada', 'salida_almuerzo', 'retorno_almuerzo', 'salida',
      'estado', 'minutos_tardanza', 'justificada'
    ];
    const rows = [];

    base.empleados.forEach((emp) => {
      base.fechas.forEach((fecha) => {
        if (emp.fechaIngreso && fecha < emp.fechaIngreso) return;
        const m = base.mapa?.[emp.id]?.[fecha];
        const justificacion = base.justificadasMap?.[emp.id]?.[fecha];
        const entrada = m?.entrada;
        let estado = 'Falta';
        if (entrada) estado = entrada.esTardanza ? 'Tardanza' : 'Asistió';
        else if (justificacion) estado = 'Justificada';

        rows.push([
          emp.id,
          emp.nombre,
          emp.area,
          emp.puesto,
          UI.contratoLabel(emp.contrato?.tipo),
          UI.estadoContratoLabel(emp.contrato?.estado),
          fecha,
          UI.DIAS[UI.parseFecha(fecha)?.getDay()] || '',
          entrada?.hora || '',
          m?.almuerzo_salida?.hora || '',
          m?.almuerzo_retorno?.hora || '',
          m?.salida?.hora || '',
          estado,
          entrada?.esTardanza ? (entrada.minutosTardanza || 0) : 0,
          justificacion ? 1 : 0
        ]);
      });
    });

    const periodo = periodoInfo(base.ctx).desde.slice(0, 7);
    exportarCSVPlano(headers, rows, `powerbi-asistencia-${periodo}.csv`);
  }

  function exportarPowerBIPlantilla(base) {
    const headers = [
      'empleado_id', 'empleado', 'area', 'cargo', 'departamento',
      'fecha_ingreso', 'fecha_nacimiento', 'tipo_contrato', 'inicio_contrato',
      'fin_contrato', 'estado_contrato', 'areas_supervisadas'
    ];
    const rows = base.empleados.map((emp) => [
      emp.id,
      emp.nombre,
      emp.area,
      emp.puesto,
      emp.departamento || '',
      emp.fechaIngreso || '',
      emp.fechaNacimiento || '',
      UI.contratoLabel(emp.contrato?.tipo),
      emp.contrato?.inicio || '',
      emp.contrato?.fin || '',
      UI.estadoContratoLabel(emp.contrato?.estado),
      (emp.areasSupervisadas || []).join(' | ')
    ]);
    const periodo = periodoInfo(base.ctx).desde.slice(0, 7);
    exportarCSVPlano(headers, rows, `powerbi-plantilla-${periodo}.csv`);
  }

  // ============================================================
  // Render principal
  // ============================================================

  function render(container, ctx) {
    destruirEventos();
    destruirCharts();

    const rol = ctx.rol;
    const base = construirDatosBase(ctx);
    const catalogo = widgetsParaRol(rol);

    const meta = {
      titulo: `Reporte de gestión · ${periodoInfo(ctx).titulo}`,
      descripcion: 'Resumen ejecutivo de personal, asistencia, puntualidad y contratos.',
      autor: ctx.user?.nombre || '',
      periodo: periodoInfo(ctx).titulo,
      corte: periodoInfo(ctx).corte,
      tema: ctx.config?.tema === 'carbon' ? 'oscuro' : 'claro'
    };

    let seleccionados = PLANTILLAS.resumen.filter((id) => catalogo.some((w) => w.id === id));

    const estado = {
      meta,
      seleccionados,
      paginaActual: 0,
      paginas: [],
      widgetsData: {}
    };

    const construir = () => {
      const widgetsData = {};
      estado.seleccionados.forEach((id) => {
        const def = WIDGETS.find((w) => w.id === id);
        if (def) widgetsData[id] = def.datos(base, ctx);
      });
      estado.widgetsData = widgetsData;
      estado.paginas = construirPaginas(estado.seleccionados, widgetsData);
      estado.paginaActual = Math.min(estado.paginaActual, Math.max(0, estado.paginas.length - 1));
    };
    construir();

    container.innerHTML = `
      ${UI.pageHeader({
        eyebrow: 'Reportes',
        titulo: 'Constructor de reportes',
        descripcion: 'Arma tu presentación, revisa la vista previa y exporta PNG en alta resolución o CSV por tabla.'
      })}

      <section class="reportes-meta-card">
        <div class="reportes-meta-fields">
          <div class="form-group">
            <label for="reporte-titulo" class="form-label">Título del reporte</label>
            <input id="reporte-titulo" class="form-input" value="${UI.esc(meta.titulo)}">
          </div>
          <div class="form-group">
            <label for="reporte-descripcion" class="form-label">Descripción</label>
            <input id="reporte-descripcion" class="form-input" value="${UI.esc(meta.descripcion)}">
          </div>
          <div class="form-group">
            <label for="reporte-autor" class="form-label">Autor</label>
            <input id="reporte-autor" class="form-input" value="${UI.esc(meta.autor)}">
          </div>
        </div>
        <div class="reportes-plantillas">
          <span class="form-label">Plantillas rápidas</span>
          <div class="reportes-plantillas-botones">
            ${Object.entries(PLANTILLAS)
              .filter(([clave]) => !(rol === 'rrhh' && clave === 'auditoria'))
              .map(([clave]) => `
                <button type="button" class="btn btn-ghost btn-sm" data-plantilla="${clave}">${UI.esc(clave.charAt(0).toUpperCase() + clave.slice(1))}</button>
              `).join('')}
          </div>
        </div>
        <div class="reportes-powerbi">
          <span class="form-label">Datos para Power BI</span>
          <button type="button" class="btn btn-ghost btn-sm" id="reporte-powerbi-asistencia">CSV Asistencia</button>
          <button type="button" class="btn btn-ghost btn-sm" id="reporte-powerbi-plantilla">CSV Plantilla</button>
        </div>
      </section>

      <section class="reportes-builder">
        <aside class="reportes-side">
          <div class="reportes-side-head">
            <div>
              <h3>Widgets</h3>
              <span id="reportes-contador">${estado.seleccionados.length} seleccionados</span>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" id="reportes-limpiar">Limpiar</button>
          </div>
          <div class="reportes-catalog-tools">
            <input type="search" id="reportes-buscar" class="filter-input" placeholder="Buscar widget...">
            <div class="reportes-cat-pills" id="reportes-cat-pills"></div>
          </div>
          <div class="reportes-selected" id="reportes-selected"></div>
          <div class="reportes-catalogo" id="reportes-catalogo"></div>
        </aside>

        <main class="reportes-preview-zone">
          <div class="reportes-preview-tools">
            <div class="reportes-page-nav">
              <button type="button" class="btn btn-ghost btn-sm" id="reporte-page-prev" aria-label="Página anterior">‹</button>
              <span id="reporte-page-info">Página 1 de 1</span>
              <button type="button" class="btn btn-ghost btn-sm" id="reporte-page-next" aria-label="Página siguiente">›</button>
            </div>
            <div class="reportes-actions">
              <button type="button" class="btn btn-ghost" id="reporte-ampliar">⛶ Ampliar</button>
              <button type="button" class="btn btn-ghost" id="reporte-export-pagina">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                PNG de esta página
              </button>
              <button type="button" class="btn btn-ghost" id="reporte-export-pptx">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 22h8M12 18v4"/><path d="M7 9h10M7 13h6"/></svg>
                Exportar PPTX
              </button>
              <button type="button" class="btn btn-primary" id="reporte-export-todo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Exportar todo (PNG 4x)
              </button>
            </div>
          </div>
          <div class="reportes-slide-wrap">
            <div class="reporte-slide tema-${meta.tema}" id="reporte-slide"></div>
          </div>
        </main>
      </section>
    `;

    const controller = new AbortController();
    const { signal } = controller;
    let escalaObserver = null;

    const catalogoEl = document.getElementById('reportes-catalogo');
    const slideEl = document.getElementById('reporte-slide');
    const slideWrap = container.querySelector('.reportes-slide-wrap');
    const contadorEl = document.getElementById('reportes-contador');
    const pageInfoEl = document.getElementById('reporte-page-info');

    // La diapositiva se compone siempre a 960×540 y se escala al ancho
    // disponible. Así la vista previa conserva exactamente la misma
    // proporción y tipografía que el PNG exportado, sin recortes.
    const ajustarEscalaSlide = () => {
      if (!slideWrap || !slideEl) return;
      const escala = Math.max(0.1, slideWrap.clientWidth / BASE_W);
      slideWrap.style.setProperty('--reporte-scale', escala);
      slideEl.style.transform = `scale(${escala})`;
    };

    limpiarEventos = () => {
      controller.abort();
      escalaObserver?.disconnect();
      window.removeEventListener('resize', ajustarEscalaSlide);
    };

    const categorias = [...new Set(catalogo.map((w) => w.cat))];
    const pillsEl = document.getElementById('reportes-cat-pills');
    const seleccionadosEl = document.getElementById('reportes-selected');
    const buscarEl = document.getElementById('reportes-buscar');
    let categoriaActual = 'Todos';
    let busquedaCatalogo = '';

    const ICONO_TIPO = {
      kpi: '▦',
      line: '↗',
      barh: '▥',
      barv: '▥',
      donut: '◔',
      table: '☷',
      insight: '✦'
    };
    const ETIQUETA_TIPO = {
      kpi: 'KPIs',
      line: 'Línea',
      barh: 'Barras',
      barv: 'Barras',
      donut: 'Dona',
      table: 'Tabla',
      insight: 'Insight'
    };

    function renderPills() {
      if (!pillsEl) return;
      const opciones = ['Todos', ...categorias];
      pillsEl.innerHTML = opciones.map((cat) => `
        <button type="button" class="reportes-pill ${categoriaActual === cat ? 'is-active' : ''}" data-cat="${UI.esc(cat)}" aria-pressed="${categoriaActual === cat}">
          ${UI.esc(cat.replace('Resumen ejecutivo', 'Resumen').replace('Asistencia y puntualidad', 'Asistencia').replace('Plantilla y contratos', 'Plantilla').replace('Personas y cumpleaños', 'Personas').replace('Auditoría NFC', 'Auditoría'))}
        </button>
      `).join('');
    }

    function renderSeleccionados() {
      if (!seleccionadosEl) return;
      if (!estado.seleccionados.length) {
        seleccionadosEl.innerHTML = `
          <div class="reportes-selected-empty">
            <span>+</span>
            <p>Agrega widgets del catálogo para armar tu presentación.</p>
          </div>
        `;
        return;
      }
      seleccionadosEl.innerHTML = `
        <div class="reportes-selected-head">
          <h3>Seleccionados</h3>
          <span>${estado.seleccionados.length}</span>
        </div>
        <ol class="reportes-selected-list">
          ${estado.seleccionados.map((id, indice) => {
            const def = WIDGETS.find((w) => w.id === id);
            if (!def) return '';
            return `
              <li>
                <span class="reportes-order">${indice + 1}</span>
                <div class="reportes-selected-info">
                  <strong>${UI.esc(def.nombre)}</strong>
                  <small>${UI.esc(def.cat)}</small>
                </div>
                <div class="reportes-order-actions">
                  <button type="button" data-move="up" data-id="${UI.esc(id)}" ${indice === 0 ? 'disabled' : ''} aria-label="Subir ${UI.esc(def.nombre)}">↑</button>
                  <button type="button" data-move="down" data-id="${UI.esc(id)}" ${indice === estado.seleccionados.length - 1 ? 'disabled' : ''} aria-label="Bajar ${UI.esc(def.nombre)}">↓</button>
                  <button type="button" data-remove="${UI.esc(id)}" aria-label="Quitar ${UI.esc(def.nombre)}">×</button>
                </div>
              </li>
            `;
          }).join('')}
        </ol>
      `;
    }

    function renderCatalogo() {
      if (!catalogoEl) return;
      const q = busquedaCatalogo.trim().toLowerCase();
      const filtrados = catalogo.filter((w) => {
        if (categoriaActual !== 'Todos' && w.cat !== categoriaActual) return false;
        if (q && !`${w.nombre} ${w.cat}`.toLowerCase().includes(q)) return false;
        return true;
      });

      if (!filtrados.length) {
        catalogoEl.innerHTML = `<div class="reportes-catalogo-vacio">No hay widgets que coincidan con la búsqueda.</div>`;
        return;
      }

      catalogoEl.innerHTML = filtrados.map((w) => `
        <button type="button" class="reportes-widget-card ${estado.seleccionados.includes(w.id) ? 'is-selected' : ''}" data-add-widget="${UI.esc(w.id)}">
          <span class="reportes-widget-icon">${ICONO_TIPO[w.tipo] || '▦'}</span>
          <span class="reportes-widget-info">
            <strong>${UI.esc(w.nombre)}</strong>
            <small>${UI.esc(ETIQUETA_TIPO[w.tipo] || 'Widget')} · ${UI.esc(w.cat)}</small>
          </span>
          <span class="reportes-widget-add">${estado.seleccionados.includes(w.id) ? '✓' : '+'}</span>
        </button>
      `).join('');
    }

    function renderSidebar() {
      renderPills();
      renderSeleccionados();
      renderCatalogo();
      if (contadorEl) contadorEl.textContent = `${estado.seleccionados.length} seleccionados`;
    }

    function renderSlide() {
      const pagina = estado.paginas[estado.paginaActual];
      if (!pagina) {
        slideEl.innerHTML = `<div class="reporte-slide-vacio">Selecciona widgets para armar el reporte.</div>`;
        pageInfoEl.textContent = 'Página 0 de 0';
        return;
      }

      const t = TEMAS[meta.tema];
      const cuerpoTop = (HEADER_H / BASE_H) * 100;
      const cuerpoH = (CONTENT_H / BASE_H) * 100;

      slideEl.className = `reporte-slide tema-${meta.tema}`;
      slideEl.style.background = meta.tema === 'oscuro'
        ? `radial-gradient(circle at 84% 8%, rgba(245, 210, 90, 0.1), transparent 28%), linear-gradient(160deg, ${t.fondo}, ${t.fondo2})`
        : `linear-gradient(160deg, ${t.fondo}, ${t.fondo2})`;
      slideEl.innerHTML = `
        <div class="reporte-cabecera" style="height:${(HEADER_H / BASE_H) * 100}%">
          <div class="reporte-marca"><span>N</span></div>
          <div class="reporte-cabecera-texto">
            <small>INNOVATION NFC E.S.F</small>
            <h2>${UI.esc(meta.titulo)}</h2>
            <p>${UI.esc(meta.descripcion)}</p>
          </div>
          <div class="reporte-cabecera-meta">
            <div><span>Periodo</span><strong>${UI.esc(meta.periodo)}</strong></div>
            <div><span>Corte</span><strong>${UI.esc(meta.corte)}</strong></div>
            <div><span>Autor</span><strong>${UI.esc(meta.autor || '—')}</strong></div>
          </div>
        </div>
        <div class="reporte-cuerpo" style="top:${cuerpoTop}%;height:${cuerpoH}%">
          ${pagina.widgets.map((def) => `
            <div class="reporte-widget-pos" style="left:${(def.x / BASE_W) * 100}%;top:${(def.y / CONTENT_H) * 100}%;width:${(def.w / BASE_W) * 100}%;height:${(def.h / CONTENT_H) * 100}%">
              ${renderWidgetHTML(def, def.datos, pagina.numero, meta.tema)}
            </div>
          `).join('')}
        </div>
        <div class="reporte-pie" style="height:${(FOOTER_H / BASE_H) * 100}%">
          <span>${UI.esc(meta.periodo)} · Corte ${UI.esc(meta.corte)}</span>
          <span>INNOVATION NFC E.S.F</span>
          <strong>Página ${pagina.numero} de ${pagina.total}</strong>
        </div>
      `;

      pageInfoEl.textContent = `Página ${pagina.numero} de ${pagina.total}`;
      contadorEl.textContent = `${estado.seleccionados.length} seleccionados`;
      ajustarEscalaSlide();
      requestAnimationFrame(() => montarPreviewCharts(pagina, meta.tema));
    }

    function aplicarPlantilla(ids) {
      estado.seleccionados = ids.filter((id) => catalogo.some((w) => w.id === id));
      construir();
      renderSidebar();
      renderSlide();
    }

    // Catálogo: agregar/quitar, buscar y filtrar
    buscarEl?.addEventListener('input', UI.debounce(() => {
      busquedaCatalogo = buscarEl.value || '';
      renderCatalogo();
    }, 180), { signal });

    pillsEl?.addEventListener('click', (e) => {
      const pill = e.target.closest('[data-cat]');
      if (!pill) return;
      categoriaActual = pill.dataset.cat;
      renderPills();
      renderCatalogo();
    }, { signal });

    catalogoEl?.addEventListener('click', (e) => {
      const card = e.target.closest('[data-add-widget]');
      if (!card) return;
      const id = card.dataset.addWidget;
      if (estado.seleccionados.includes(id)) {
        estado.seleccionados = estado.seleccionados.filter((sel) => sel !== id);
      } else {
        estado.seleccionados.push(id);
      }
      construir();
      renderSidebar();
      renderSlide();
    }, { signal });

    seleccionadosEl?.addEventListener('click', (e) => {
      const remove = e.target.closest('[data-remove]');
      if (remove) {
        estado.seleccionados = estado.seleccionados.filter((id) => id !== remove.dataset.remove);
        construir();
        renderSidebar();
        renderSlide();
        return;
      }
      const mover = e.target.closest('[data-move]');
      if (mover) {
        const id = mover.dataset.id;
        const indice = estado.seleccionados.indexOf(id);
        const destino = mover.dataset.move === 'up' ? indice - 1 : indice + 1;
        if (indice >= 0 && destino >= 0 && destino < estado.seleccionados.length) {
          [estado.seleccionados[indice], estado.seleccionados[destino]] = [estado.seleccionados[destino], estado.seleccionados[indice]];
          construir();
          renderSidebar();
          renderSlide();
        }
      }
    }, { signal });

    document.getElementById('reportes-limpiar')?.addEventListener('click', () => {
      estado.seleccionados = [];
      construir();
      renderSidebar();
      renderSlide();
    }, { signal });

    container.addEventListener('click', (e) => {
      const plantilla = e.target.closest('[data-plantilla]');
      if (plantilla) {
        aplicarPlantilla(PLANTILLAS[plantilla.dataset.plantilla] || []);
        return;
      }
      const csvBtn = e.target.closest('[data-csv]');
      if (csvBtn) {
        const datos = estado.widgetsData[csvBtn.dataset.csv];
        if (datos?.csv) {
          exportarCSVWidget(datos, csvBtn.dataset.csv);
          UI.toast(`Exportando CSV: ${datos.titulo || csvBtn.dataset.csv}`, 'info');
        }
      }
    }, { signal });

    // Metadatos
    const tituloInput = document.getElementById('reporte-titulo');
    const descripcionInput = document.getElementById('reporte-descripcion');
    const autorInput = document.getElementById('reporte-autor');
    const aplicarMeta = () => {
      meta.titulo = tituloInput?.value || 'Reporte de gestión';
      meta.descripcion = descripcionInput?.value || '';
      meta.autor = autorInput?.value || '';
      renderSlide();
    };
    [tituloInput, descripcionInput, autorInput].forEach((input) => {
      input?.addEventListener('input', UI.debounce(aplicarMeta, 200), { signal });
    });
    // Paginación y exportación
    document.getElementById('reporte-ampliar')?.addEventListener('click', (e) => {
      const builder = container.querySelector('.reportes-builder');
      if (!builder) return;
      const activo = builder.classList.toggle('modo-presentacion');
      e.currentTarget.textContent = activo ? '⛶ Reducir' : '⛶ Ampliar';
      requestAnimationFrame(() => renderSlide());
    }, { signal });

    document.getElementById('reporte-powerbi-asistencia')?.addEventListener('click', () => {
      exportarPowerBIAsistencia(base);
      UI.toast('CSV de asistencia para Power BI exportado', 'success');
    }, { signal });

    document.getElementById('reporte-powerbi-plantilla')?.addEventListener('click', () => {
      exportarPowerBIPlantilla(base);
      UI.toast('CSV de plantilla para Power BI exportado', 'success');
    }, { signal });

    document.getElementById('reporte-page-prev')?.addEventListener('click', () => {
      estado.paginaActual = Math.max(0, estado.paginaActual - 1);
      renderSlide();
    }, { signal });
    document.getElementById('reporte-page-next')?.addEventListener('click', () => {
      estado.paginaActual = Math.min(estado.paginas.length - 1, estado.paginaActual + 1);
      renderSlide();
    }, { signal });

    document.getElementById('reporte-export-pagina')?.addEventListener('click', () => {
      const pagina = estado.paginas[estado.paginaActual];
      if (!pagina) { UI.toast('No hay widgets seleccionados', 'warning'); return; }
      exportarPaginaPNG(pagina, meta, meta.tema);
      UI.toast(`Generando PNG de la página ${pagina.numero}…`, 'info');
    }, { signal });

    document.getElementById('reporte-export-pptx')?.addEventListener('click', async (e) => {
      if (!estado.paginas.length) { UI.toast('No hay páginas para exportar', 'warning'); return; }
      const boton = e.currentTarget;
      boton.disabled = true;
      UI.toast(`Generando PPTX con ${estado.paginas.length} diapositiva(s)…`, 'info');
      try {
        await exportarPPTX(estado.paginas, meta);
      } finally {
        boton.disabled = false;
      }
    }, { signal });

    document.getElementById('reporte-export-todo')?.addEventListener('click', () => {
      if (!estado.paginas.length) { UI.toast('No hay widgets seleccionados', 'warning'); return; }
      estado.paginas.forEach((pagina, indice) => {
        setTimeout(() => exportarPaginaPNG(pagina, meta, meta.tema), indice * 350);
      });
      UI.toast(`Exportando ${estado.paginas.length} página(s) en PNG 4x…`, 'info');
    }, { signal });

    if (window.ResizeObserver && slideWrap) {
      escalaObserver = new ResizeObserver(ajustarEscalaSlide);
      escalaObserver.observe(slideWrap);
    } else {
      window.addEventListener('resize', ajustarEscalaSlide);
    }

    renderSidebar();
    renderSlide();
  }

  function onSearch(valor, container) {
    const input = container?.querySelector('#reportes-buscar');
    if (!input) return;
    input.value = String(valor || '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  window.DashboardModules.reportes = {
    titulo: 'Reportes',
    render,
    onSearch,
    onUnload() {
      destruirCharts();
      destruirEventos();
    }
  };
})();
