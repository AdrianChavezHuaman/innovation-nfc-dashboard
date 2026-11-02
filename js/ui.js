/* ========================================
   UI Helpers — INNOVATION NFC E.S.F
   Componentes compartidos para el dashboard
   ======================================== */

(function () {
  'use strict';

  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  const ROL_LABEL = {
    dueno: 'Dueño',
    jefe: 'Jefatura',
    rrhh: 'RR.HH.',
    operario: 'Operario',
    simulado: 'Empleado'
  };

  const CONTRATO_LABEL = {
    indefinido: 'Indefinido',
    plazo_fijo: 'Plazo fijo',
    practicante: 'Practicante'
  };

  const ESTADO_CONTRATO_LABEL = {
    vigente: 'Vigente',
    por_vencer: 'Por vencer',
    vencido: 'Vencido'
  };

  function esc(valor) {
    return String(valor == null ? '' : valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function iniciales(nombre) {
    const partes = String(nombre || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!partes.length) return 'NN';
    const primera = partes[0][0] || '';
    const segunda = partes.length > 1 ? partes[partes.length - 1][0] || '' : '';
    return (primera + segunda).toUpperCase();
  }

  function parseFecha(fecha) {
    if (!fecha) return null;
    const [anio, mes, dia] = String(fecha).split('-').map(Number);
    if (!anio || !mes || !dia) return null;
    return new Date(anio, mes - 1, dia, 12, 0, 0);
  }

  function fechaLarga(fecha) {
    const d = parseFecha(fecha);
    if (!d) return '—';
    return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
  }

  function fechaCorta(fecha) {
    const d = parseFecha(fecha);
    if (!d) return '—';
    return `${String(d.getDate()).padStart(2, '0')} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`;
  }

  function fechaDiaMes(fecha) {
    const d = parseFecha(fecha);
    if (!d) return '—';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function hora12(hora) {
    if (!hora) return '—';
    const [h, m] = String(hora).split(':').map(Number);
    if (Number.isNaN(h)) return hora;
    const sufijo = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, '0')}:${String(m || 0).padStart(2, '0')} ${sufijo}`;
  }

  function minutosDesdeHora(hora) {
    const [h, m] = String(hora || '').split(':').map(Number);
    if (Number.isNaN(h)) return null;
    return h * 60 + (m || 0);
  }

  function fmtHoras(minutos) {
    const total = Math.max(0, Math.round(Number(minutos) || 0));
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (!h) return `${m} min`;
    return `${h} h ${String(m).padStart(2, '0')} min`;
  }

  function fmtNumero(n) {
    return new Intl.NumberFormat('es-PE').format(Number(n) || 0);
  }

  function rolLabel(rol) {
    return ROL_LABEL[rol] || rol || '—';
  }

  function contratoLabel(tipo) {
    return CONTRATO_LABEL[tipo] || tipo || '—';
  }

  function estadoContratoLabel(estado) {
    return ESTADO_CONTRATO_LABEL[estado] || estado || '—';
  }

  function toast(message, type = 'info') {
    const colores = {
      info: 'var(--color-dark-900)',
      success: '#2F6B4F',
      warning: '#8A6A00',
      error: '#A9442E'
    };

    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const item = document.createElement('div');
    item.className = `toast toast-${type}`;
    item.style.background = colores[type] || colores.info;
    item.textContent = message;
    container.appendChild(item);

    setTimeout(() => {
      item.classList.add('toast-out');
      setTimeout(() => item.remove(), 220);
    }, 3600);
  }

  function pageHeader(opciones = {}) {
    const { titulo = '', descripcion = '', acciones = '', eyebrow = '' } = opciones;
    return `
      <header class="page-head">
        <div class="page-head-text">
          ${eyebrow ? `<span class="page-eyebrow">${esc(eyebrow)}</span>` : ''}
          <h1 class="page-title">${esc(titulo)}</h1>
          ${descripcion ? `<p class="page-desc">${esc(descripcion)}</p>` : ''}
        </div>
        ${acciones ? `<div class="page-actions">${acciones}</div>` : ''}
      </header>
    `;
  }

  function kpiCard(opciones = {}) {
    const { label = '', valor = '—', detalle = '', tono = '', icono = '' } = opciones;
    return `
      <article class="kpi-card ${tono ? `kpi-${tono}` : ''}">
        <div class="kpi-top">
          <span class="kpi-label">${esc(label)}</span>
          ${icono ? `<span class="kpi-icon" aria-hidden="true">${icono}</span>` : ''}
        </div>
        <strong class="kpi-value">${esc(valor)}</strong>
        ${detalle ? `<span class="kpi-detail">${esc(detalle)}</span>` : ''}
      </article>
    `;
  }

  function badge(texto, tono = 'neutral') {
    return `<span class="badge badge-${esc(tono)}">${esc(texto)}</span>`;
  }

  function badgeContrato(estado) {
    const tono = estado === 'vencido' ? 'danger' : estado === 'por_vencer' ? 'warning' : 'success';
    return badge(estadoContratoLabel(estado), tono);
  }

  function avatar(nombre, extraClass = '') {
    return `<span class="ui-avatar ${extraClass}" aria-hidden="true">${esc(iniciales(nombre))}</span>`;
  }

  function emptyState(titulo, detalle = '', icono = '') {
    return `
      <div class="empty-state">
        ${icono ? `<div class="empty-icon" aria-hidden="true">${icono}</div>` : ''}
        <h3>${esc(titulo)}</h3>
        ${detalle ? `<p>${esc(detalle)}</p>` : ''}
      </div>
    `;
  }

  function progressBar(porcentaje, etiqueta = '') {
    const valor = Math.max(0, Math.min(100, Math.round(Number(porcentaje) || 0)));
    return `
      <div class="ui-progress" role="progressbar" aria-valuenow="${valor}" aria-valuemin="0" aria-valuemax="100" ${etiqueta ? `aria-label="${esc(etiqueta)}"` : ''}>
        <span style="width:${valor}%"></span>
      </div>
    `;
  }

  function sumaMinutosEntre(inicio, fin) {
    const a = minutosDesdeHora(inicio);
    const b = minutosDesdeHora(fin);
    if (a == null || b == null || b < a) return 0;
    return b - a;
  }

  function acortar(texto, max = 90) {
    const limpio = String(texto || '').trim();
    return limpio.length > max ? `${limpio.slice(0, max - 1)}…` : limpio;
  }

  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function placeholderModule(opciones = {}) {
    const {
      titulo = 'Módulo',
      descripcion = '',
      bloque = 'Bloque 0',
      icono = '🧩',
      puntos = [],
      extra = ''
    } = opciones;

    return `
      ${pageHeader({
        eyebrow: 'Módulo',
        titulo,
        descripcion
      })}
      <section class="module-placeholder">
        <div class="placeholder-hero">
          <div class="placeholder-icon" aria-hidden="true">${icono}</div>
          <div>
            <span class="page-eyebrow">${esc(bloque)}</span>
            <h2>Módulo preparado para la siguiente fase</h2>
            <p>${esc(descripcion || 'La estructura, la ruta y el control de acceso ya están listos.')}</p>
          </div>
        </div>
        ${puntos.length ? `
          <div class="placeholder-body">
            <h3>Qué incluirá este módulo</h3>
            <ul class="placeholder-list">
              ${puntos.map((punto) => `<li><span aria-hidden="true">✓</span>${esc(punto)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${extra}
      </section>
    `;
  }

  window.UI = {
    MESES,
    MESES_CORTOS,
    DIAS,
    ROL_LABEL,
    esc,
    iniciales,
    parseFecha,
    fechaLarga,
    fechaCorta,
    fechaDiaMes,
    hora12,
    minutosDesdeHora,
    fmtHoras,
    fmtNumero,
    rolLabel,
    contratoLabel,
    estadoContratoLabel,
    toast,
    pageHeader,
    kpiCard,
    badge,
    badgeContrato,
    avatar,
    emptyState,
    progressBar,
    sumaMinutosEntre,
    acortar,
    debounce,
    placeholderModule
  };
})();
