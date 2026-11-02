/* ============================================================
   Chart Theme Premium — INNOVATION NFC E.S.F
   Tema unificado para Chart.js v4 — Estilo SaaS Premium
   Se usa en: Panel, Horarios, Personal, Reportes
   ============================================================ */

(function () {
  'use strict';

  // Nitidez global: Chart.js usa 1x por defecto y el canvas se ve suave.
  // Forzamos al menos 2x para pantallas normales y respetamos pantallas HiDPI.
  if (window.Chart?.defaults) {
    window.Chart.defaults.devicePixelRatio = Math.max(2, window.devicePixelRatio || 1);
  }

  // Ajusta ejes y grillas al tema global carbón sin tocar la lógica
  // de cada módulo.
  if (window.Chart?.register) {
    window.Chart.register({
      id: 'carbonTheme',
      beforeLayout(chart) {
        if (document.documentElement.getAttribute('data-tema') !== 'carbon') return;
        const textColor = 'rgba(247, 242, 232, 0.68)';
        const gridColor = 'rgba(247, 242, 232, 0.08)';
        Object.values(chart.options?.scales || {}).forEach((scale) => {
          if (!scale) return;
          if (scale.ticks) scale.ticks.color = textColor;
          if (scale.grid) scale.grid.color = gridColor;
          if (scale.angleLines) scale.angleLines.color = gridColor;
          if (scale.pointLabels) scale.pointLabels.color = textColor;
        });
        if (chart.options?.plugins?.legend?.labels) {
          chart.options.plugins.legend.labels.color = textColor;
        }
      }
    });
  }

  // ============================================================
  // PALETA PREMIUM (basada en variables CSS del proyecto)
  // ============================================================
  const PALETTE = {
    // Colores principales (basados en --color-accent-*)
    primary: {
      solid: '#E88D2A',           // Dorado principal
      light: 'rgba(232, 141, 42, 0.15)',
      gradient: ['rgba(232, 141, 42, 0.25)', 'rgba(232, 141, 42, 0.02)'],
      border: '#E88D2A'
    },
    // Colores semánticos para estados
    success: {
      solid: '#6FA96F',
      light: 'rgba(111, 169, 111, 0.15)',
      gradient: ['rgba(111, 169, 111, 0.25)', 'rgba(111, 169, 111, 0.02)'],
      border: '#6FA96F'
    },
    warning: {
      solid: '#D19E33',
      light: 'rgba(209, 158, 51, 0.15)',
      gradient: ['rgba(209, 158, 51, 0.25)', 'rgba(209, 158, 51, 0.02)'],
      border: '#D19E33'
    },
    danger: {
      solid: '#C45F3F',
      light: 'rgba(196, 95, 63, 0.15)',
      gradient: ['rgba(196, 95, 63, 0.25)', 'rgba(196, 95, 63, 0.02)'],
      border: '#C45F3F'
    },
    info: {
      solid: '#2F6B4F',
      light: 'rgba(47, 107, 79, 0.15)',
      gradient: ['rgba(47, 107, 79, 0.25)', 'rgba(47, 107, 79, 0.02)'],
      border: '#2F6B4F'
    },
    // Colores para gráficos categóricos (áreas, cargos, etc.)
    categorical: [
      '#E88D2A',  // Dorado
      '#C45F3F',  // Terracota
      '#6FA96F',  // Verde
      '#2F6B4F',  // Verde oscuro
      '#D19E33',  // Ámbar
      '#8A6A00',  // Dorado oscuro
      '#1E3A5F',  // Azul marino
      '#55524B',  // Gris cálido
      '#8FBF8F',  // Verde claro
      '#E8B44A',  // Amarillo
      '#D97757',  // Rojo suave
      '#C9A62E'   // Mostaza
    ],
    // Color estable por área: Panel y Personal comparten el mismo lenguaje.
    area: {
      Produccion: '#C45F3F',
      Logistica: '#D97757',
      Gerencia: '#D19E33',
      'RR.HH.': '#E8C33F',
      Mantenimiento: '#6FA96F',
      Limpieza: '#2F6B4F',
      Seguridad: '#1E3A5F',
      Almacen: '#3E6B8A',
      Recepcion: '#8B887E',
      Soporte: '#C9A62E',
      Direccion: '#8FBF8F'
    },
    // Colores neutros
    neutral: {
      text: '#1E1E1E',
      textSecondary: '#8B887E',
      textTertiary: '#B5B1A6',
      grid: 'rgba(30, 30, 30, 0.03)',
      gridStrong: 'rgba(30, 30, 30, 0.06)',
      background: '#FAF8F2',
      surface: '#FFFFFF',
      border: 'rgba(30, 30, 30, 0.06)'
    }
  };

  // ============================================================
  // CONFIGURACIONES BASE REUTILIZABLES
  // ============================================================

  // Tooltip premium estándar
  const premiumTooltip = {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    titleColor: '#F5D25A',
    bodyColor: '#FFFFFF',
    padding: 12,
    titleFont: { size: 12, weight: '600', family: 'Plus Jakarta Sans, Inter, sans-serif' },
    bodyFont: { size: 11, family: 'Plus Jakarta Sans, Inter, sans-serif' },
    cornerRadius: 8,
    displayColors: true,
    borderWidth: 1,
    borderColor: 'rgba(245, 210, 90, 0.3)',
    callbacks: {
      // En barras horizontales el valor está en parsed.x; en verticales/líneas
      // en parsed.y. Antes se leía siempre parsed.y y se mostraba el índice
      // de la categoría (0, 1, 2...) con un porcentaje vacío.
      label: (ctx) => {
        const horizontal = (ctx.chart?.options?.indexAxis || ctx.dataset?.indexAxis) === 'y';
        const valor = horizontal ? ctx.parsed.x : ctx.parsed.y;
        const total = Number(ctx.dataset?._total) || 0;
        const unidad = ctx.dataset?._unit || '';
        const porcentaje = total > 0 ? ` (${Math.round((valor / total) * 100)}%)` : '';
        return `  ${ctx.label}: ${valor}${unidad}${porcentaje}`;
      }
    }
  };

  // Leyenda personalizada estándar
  const premiumLegend = {
    display: false // Usamos leyenda HTML personalizada
  };

  // Animaciones suaves
  const premiumAnimation = {
    duration: 800,
    easing: 'easeOutQuart',
    animateRotate: true,
    animateScale: false
  };

  // Escalas premium para gráficos cartesianos
  const premiumScales = {
    x: {
      grid: {
        display: false,
        drawBorder: false,
        drawTicks: false
      },
      ticks: {
        maxTicksLimit: 12,
        color: PALETTE.neutral.textSecondary,
        font: { size: 10, family: 'Plus Jakarta Sans, Inter, sans-serif', weight: '500' },
        padding: 8
      }
    },
    y: {
      min: 0,
      grid: {
        color: PALETTE.neutral.grid,
        drawBorder: false,
        drawTicks: false,
        lineWidth: 1
      },
      ticks: {
        stepSize: 20,
        color: PALETTE.neutral.textSecondary,
        font: { size: 10, family: 'Plus Jakarta Sans, Inter, sans-serif', weight: '500' },
        padding: 8,
        callback: (v) => `${v}%`
      }
    }
  };

  // ============================================================
  // GENERADORES DE GRADIENTES (para Chart.js)
  // ============================================================

  function createVerticalGradient(ctx, colorStops) {
    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
    colorStops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
    return gradient;
  }

  function createHorizontalGradient(ctx, colorStops) {
    const gradient = ctx.createLinearGradient(0, 0, ctx.chart.width, 0);
    colorStops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
    return gradient;
  }

  // Generadores listos para usar
  const Gradients = {
    primaryArea: (ctx) => PALETTE.primary.light,
    successArea: (ctx) => PALETTE.success.light,
    warningArea: (ctx) => PALETTE.warning.light,
    dangerArea: (ctx) => PALETTE.danger.light,
    primaryBar: (ctx) => PALETTE.primary.light,
    successBar: (ctx) => PALETTE.success.light,
    warningBar: (ctx) => PALETTE.warning.light,
    dangerBar: (ctx) => PALETTE.danger.light,
  };

  // ============================================================
  // CONFIGURACIONES PREDEFINIDAS POR TIPO DE GRÁFICO
  // ============================================================

  const ChartPresets = {
    // Gráfico de línea / área (ej: Asistencia diaria)
    lineArea: (label, data, ctx, options = {}) => {
      const gradient = Gradients.primaryArea(ctx);
      return {
        type: 'line',
        data: {
          labels: options.labels || [],
          datasets: [{
            label: label,
            data: data,
            borderColor: PALETTE.primary.solid,
            backgroundColor: gradient,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointBackgroundColor: PALETTE.primary.solid,
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 3,
            pointHitRadius: 10,
            _total: data.reduce((a, b) => a + b, 0)
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: 'index' },
          plugins: {
            legend: { display: false },
            tooltip: premiumTooltip
          },
          scales: {
            ...premiumScales,
            y: { ...premiumScales.y, max: options.maxY || 100 }
          },
          animation: premiumAnimation
        }
      };
    },

    // Gráfico de barras vertical (ej: Tardanzas por día)
    barVertical: (label, data, labels, ctx, options = {}) => {
      return {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: label,
            data: data,
            backgroundColor: (ctx) => Gradients.primaryBar(ctx),
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 40,
            _total: data.reduce((a, b) => a + b, 0)
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: premiumTooltip
          },
          scales: {
            x: {
              grid: { display: false, drawBorder: false },
              ticks: { color: PALETTE.neutral.textSecondary, font: { size: 10, family: 'Plus Jakarta Sans, Inter, sans-serif' } }
            },
            y: {
              min: 0,
              grid: { color: PALETTE.neutral.grid, drawBorder: false },
              ticks: { stepSize: 1, color: PALETTE.neutral.textSecondary, font: { size: 10 }, precision: 0 }
            }
          },
          animation: { duration: 800, easing: 'easeOutQuart' }
        }
      };
    },

    // Gráfico de barras horizontal (ej: Tardanzas por área/cargo)
    barHorizontal: (label, data, labels, ctx, options = {}) => {
      const colors = data.map((_, i) => PALETTE.categorical[i % PALETTE.categorical.length]);
      return {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: label,
            data: data,
            backgroundColor: colors.map((c, i) => `rgba(${parseInt(c.slice(1,3),16)}, ${parseInt(c.slice(3,5),16)}, ${parseInt(c.slice(5,7),16)}, 0.85)`),
            borderColor: colors,
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 36,
            indexAxis: 'y',
            _total: data.reduce((a, b) => a + b, 0)
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            tooltip: premiumTooltip
          },
          scales: {
            x: {
              min: 0,
              grid: { color: PALETTE.neutral.grid, drawBorder: false },
              ticks: { color: PALETTE.neutral.textSecondary, font: { size: 10 }, stepSize: 1, precision: 0 }
            },
            y: {
              grid: { display: false, drawBorder: false },
              ticks: { color: PALETTE.neutral.textSecondary, font: { size: 10 } }
            }
          },
          animation: { duration: 800, easing: 'easeOutQuart' }
        }
      };
    },

    // Gráfico de dona (ej: Tardanzas por área, Estados de contratos)
    doughnut: (labels, data, options = {}) => {
      const colors = data.map((_, i) => PALETTE.categorical[i % PALETTE.categorical.length]);
      const total = data.reduce((a, b) => a + b, 0);
      return {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: colors.map(c => c),
            borderColor: '#FFFFFF',
            borderWidth: 3,
            cutout: '70%',
            hoverOffset: 4,
            hoverBorderWidth: 2,
            _total: total
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              ...premiumTooltip,
              callbacks: {
                label: (ctx) => `  ${ctx.label}: ${ctx.parsed} (${Math.round((ctx.parsed / total) * 100)}%)`
              }
            }
          },
          animation: { animateRotate: true, animateScale: false, duration: 800, easing: 'easeOutQuart' },
          onHover: (e, elements) => { e.native.target.style.cursor = elements.length ? 'pointer' : 'default'; }
        }
      };
    }
  };

  // ============================================================
  // UTILIDADES PARA LEYENDAS HTML PERSONALIZADAS
  // ============================================================

  function renderLegend(legendId, labels, data, colors) {
    const el = document.getElementById(legendId);
    if (!el) return;
    const total = data.reduce((a, b) => a + b, 0);
    el.innerHTML = labels.map((l, i) => {
      const pct = total ? Math.round((data[i] / total) * 100) : 0;
      const c = colors[i % colors.length];
      return `<span class="legend-item" style="display:inline-flex;align-items:center;gap:6px;margin:4px 12px 4px 0;font-size:.7rem;">
        <span class="legend-color" style="width:12px;height:12px;border-radius:3px;background:${c};border:1px solid rgba(0,0,0,.1);"></span>
        <span class="legend-label">${UI.esc(l)}</span>
        <span class="legend-value">${data[i]} (${pct}%)</span>
      </span>`;
    }).join('');
  }

  // ============================================================
  // TOOLTIP PERSONALIZADO PARA LÍNEA
  // ============================================================

  function makeLineTooltip(label) {
    return {
      ...premiumTooltip,
      callbacks: {
        label: (ctx) => `  ${label}: ${ctx.parsed.y}%`
      }
    };
  }

  // ============================================================
  // EXPORTAR API PÚBLICA
  // ============================================================

  window.ChartTheme = {
    PALETTE,
    Gradients,
    ChartPresets,
    premiumTooltip,
    premiumScales,
    premiumAnimation,
    renderLegend,
    makeLineTooltip,
    colorArea: (area) => PALETTE.area[area] || PALETTE.categorical[0],
    // Helper para crear gradiente vertical personalizado
    createVerticalGradient: (ctx, stops) => {
      const g = ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
      stops.forEach(([offset, color]) => g.addColorStop(offset, color));
      return g;
    }
  };

})();