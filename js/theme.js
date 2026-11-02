/* ========================================
   Theme Manager — tema global del proyecto
   ======================================== */

(function () {
  'use strict';

  const STORAGE_KEY = 'nfc_config';

  function leerConfig() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function normalizar(tema) {
    return tema === 'carbon' ? 'carbon' : 'claro';
  }

  function aplicar(tema) {
    const valor = normalizar(tema);
    document.documentElement.setAttribute('data-tema', valor);
    document.body?.classList.toggle('tema-carbon', valor === 'carbon');

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', valor === 'carbon' ? '#171513' : '#FAF8F2');

    if (window.Chart?.defaults) {
      window.Chart.defaults.color = valor === 'carbon' ? 'rgba(247,242,232,.68)' : '#8B887E';
    }

    window.dispatchEvent(new CustomEvent('tema-cambiado', { detail: { tema: valor } }));
    return valor;
  }

  function cargar() {
    return aplicar(leerConfig().tema || 'claro');
  }

  window.ThemeManager = {
    aplicar,
    cargar,
    actual: () => normalizar(document.documentElement.getAttribute('data-tema'))
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cargar, { once: true });
  } else {
    cargar();
  }
})();
