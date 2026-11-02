/* ========================================
   NFC Reader — INNOVATION NFC E.S.F
   Web NFC API real + Seed histórico + Fallback manual
   Datos en localStorage, listos para Dashboard
   ======================================== */

(function () {
  'use strict';

  // ============================================================
  // CONFIG & STORAGE KEYS
  // ============================================================

  const STORAGE_KEYS = {
    ASISTENCIA: 'nfc_asistencia_jornada',
    ACCESOS_ZONAS: 'nfc_accesos_zonas',
    EMPLEADOS: 'nfc_empleados_db',
    ZONAS: 'nfc_zonas_db',
    AUDITORIA_ACCESOS: 'nfc_auditoria_accesos',
    REUNIONES: 'nfc_reuniones',
    TICKETS: 'nfc_tickets',
    TARJETAS: 'nfc_tarjetas',
    CONFIG: 'nfc_config',
    JUSTIFICACIONES: 'nfc_justificaciones',
    SEED_VERSION: 'nfc_seed_version'
  };

  const SEED_VERSION = 3; // Cambiar para forzar re-seed

  // Periodo fijo de la simulación. El dashboard de gestión trabaja con
  // octubre 2026 aunque la fecha real sea otra.
  const SIM_CONFIG = {
    empresa: 'INNOVATION NFC E.S.F',
    periodo: '2026-10',
    fechaCorte: '2026-10-30',
    anio: 2026,
    mes: 10,
    diaCorte: 30,
    jornadaSemanalHoras: 48
  };

  // ============================================================
  // DATOS BASE (EMPLEADOS + ZONAS) — Semilla para BD
  // ============================================================

  const EMPLEADOS_SEED = [
    // ============================================================
    // A. 7 TRABAJADORES REALES (KV uni_empleados) — ESQUEMA PRINCIPAL
    // Adrian Chavez = DUEÑO | Los otros 6 = compañeros de curso
    // Roles reasignados para Dashboard Gerencia/RRHH:
    //   3 Gerencia (jefe): Jerson, Anthony, Amat
    //   3 RRHH (rrhh): Zinadyn, Joaquin, Axel
    // rolNFC = rol original del KV (para control de acceso NFC físico)
    // ============================================================
    { id: 'EMP001', nombre: 'Andre Chavez Huaman', usuario: 'achavezh', email: 'achavezh@innovation.nfc.esf', password: 'huaman123', area: 'Direccion', rol: 'dueno', rolNFC: 'dueno', departamento: 'Gerencia', puesto: 'Dueno', serie: 'SERIE-001', uidNFC: '04A1B2C3', esReal: true },
    { id: 'EMP002', nombre: 'Jerson Alarcon Riquelme', usuario: 'jalarconr', email: 'jalarconr@innovation.nfc.esf', password: 'riquelme123', area: 'Gerencia', rol: 'jefe', rolNFC: 'jefe', departamento: 'Gerencia', puesto: 'Gerente General', serie: 'SERIE-002', uidNFC: '04B2C3D4', esReal: true },
    { id: 'EMP003', nombre: 'Anthony Alejandro Pena Palomino', usuario: 'apenap', email: 'apenap@innovation.nfc.esf', password: 'palomino123', area: 'Gerencia', rol: 'jefe', rolNFC: 'soporte', departamento: 'Gerencia', puesto: 'Senior', serie: 'SERIE-003', uidNFC: '04C3D4E5', esReal: true },
    { id: 'EMP004', nombre: 'Amat Cristobal Manuel', usuario: 'acristobalm', email: 'acristobalm@innovation.nfc.esf', password: 'manuel123', area: 'Gerencia', rol: 'jefe', rolNFC: 'almacen', departamento: 'Gerencia', puesto: 'Almacenero', serie: 'SERIE-004', uidNFC: '04D4E5F6', esReal: true },
    { id: 'EMP005', nombre: 'Zinadyn Zidan Aykio Borda Velazque', usuario: 'zbordav', email: 'zbordav@innovation.nfc.esf', password: 'velazque123', area: 'RR.HH.', rol: 'rrhh', rolNFC: 'rrhh', departamento: 'RR.HH.', puesto: 'Secretaria', serie: 'SERIE-005', uidNFC: '04E5F6A7', esReal: true },
    { id: 'EMP006', nombre: 'Joaquin Abraham Mamani Quispe', usuario: 'jmamaniq', email: 'jmamaniq@innovation.nfc.esf', password: 'quispe123', area: 'RR.HH.', rol: 'rrhh', rolNFC: 'limpieza', departamento: 'RR.HH.', puesto: 'Personal', serie: 'SERIE-006', uidNFC: '04F6A7B8', esReal: true },
    { id: 'EMP007', nombre: 'Axel Manuel Cassuso Perez', usuario: 'acassusop', email: 'acassusop@innovation.nfc.esf', password: 'perez123', area: 'RR.HH.', rol: 'rrhh', rolNFC: 'admin_limpieza', departamento: 'RR.HH.', puesto: 'Jefa de Limpieza', serie: 'SERIE-007', uidNFC: '04A7B8C9', esReal: true },

    // ============================================================
    // B. 13 EQUIPO EXTENDIDO — Comparten áreas con el equipo real
    // Tienen roles NFC reales para acceder a sus áreas específicas
    // esReal: false (no son los 7 principales, pero sí tienen accesos reales)
    // ============================================================
    { id: 'EMP008', nombre: 'Roberto Jimenez Cruz', usuario: 'rjimenezc', email: 'rjimenezc@innovation.nfc.esf', password: 'jimenez123', area: 'Gerencia', rol: 'jefe', rolNFC: 'jefe', departamento: 'Gerencia', puesto: 'Subgerente', serie: 'SERIE-008', uidNFC: '04B8C9D0', esReal: false },
    { id: 'EMP009', nombre: 'Patricia Vargas Herrera', usuario: 'pvargash', email: 'pvargash@innovation.nfc.esf', password: 'vargas123', area: 'RR.HH.', rol: 'rrhh', rolNFC: 'rrhh', departamento: 'RR.HH.', puesto: 'Analista RRHH', serie: 'SERIE-009', uidNFC: '04C9D0E1', esReal: false },
    { id: 'EMP010', nombre: 'Miguel Angel Ruiz', usuario: 'mruiz', email: 'mruiz@innovation.nfc.esf', password: 'ruiz1234', area: 'Soporte', rol: 'soporte', rolNFC: 'soporte', departamento: 'Soporte', puesto: 'Tecnico Soporte', serie: 'SERIE-010', uidNFC: '04D0E1F2', esReal: false },
    { id: 'EMP011', nombre: 'Sofia Castillo Moran', usuario: 'scastillom', email: 'scastillom@innovation.nfc.esf', password: 'castillo123', area: 'Almacen', rol: 'almacen', rolNFC: 'almacen', departamento: 'Almacen', puesto: 'Auxiliar Almacen', serie: 'SERIE-011', uidNFC: '04E1F2A3', esReal: false },
    { id: 'EMP012', nombre: 'Diego Herrera Silva', usuario: 'dherreras', email: 'dherreras@innovation.nfc.esf', password: 'herrera123', area: 'Gerencia', rol: 'jefe', rolNFC: 'jefe', departamento: 'Gerencia', puesto: 'Coordinador', serie: 'SERIE-012', uidNFC: '04F2A3B4', esReal: false },
    { id: 'EMP013', nombre: 'Valeria Ortiz Paredes', usuario: 'vortizp', email: 'vortizp@innovation.nfc.esf', password: 'ortiz123', area: 'RR.HH.', rol: 'rrhh', rolNFC: 'rrhh', departamento: 'RR.HH.', puesto: 'Asistente RRHH', serie: 'SERIE-013', uidNFC: '04A3B4C5', esReal: false },
    { id: 'EMP014', nombre: 'Fernando Lopez Vargas', usuario: 'flopezv', email: 'flopezv@innovation.nfc.esf', password: 'lopez123', area: 'Soporte', rol: 'soporte', rolNFC: 'soporte', departamento: 'Soporte', puesto: 'Practicante TI', serie: 'SERIE-014', uidNFC: '04B4C5D6', esReal: false },
    { id: 'EMP015', nombre: 'Gabriela Ruiz Mendoza', usuario: 'gruizm', email: 'gruizm@innovation.nfc.esf', password: 'ruiz1234', area: 'Almacen', rol: 'almacen', rolNFC: 'almacen', departamento: 'Almacen', puesto: 'Auxiliar Logistica', serie: 'SERIE-015', uidNFC: '04C5D6E7', esReal: false },
    { id: 'EMP016', nombre: 'Carlos Mendez Torres', usuario: 'cmendezt', email: 'cmendezt@innovation.nfc.esf', password: 'mendez123', area: 'Gerencia', rol: 'jefe', rolNFC: 'jefe', departamento: 'Gerencia', puesto: 'Analista Proyectos', serie: 'SERIE-016', uidNFC: '04D6E7F8', esReal: false },
    { id: 'EMP017', nombre: 'Lucia Fernandez Rojas', usuario: 'lfernandezr', email: 'lfernandezr@innovation.nfc.esf', password: 'fernandez123', area: 'RR.HH.', rol: 'rrhh', rolNFC: 'rrhh', departamento: 'RR.HH.', puesto: 'Reclutamiento', serie: 'SERIE-017', uidNFC: '04E7F8A9', esReal: false },
    { id: 'EMP018', nombre: 'Pedro Sanchez Vera', usuario: 'psanchezv', email: 'psanchezv@innovation.nfc.esf', password: 'sanchez123', area: 'Soporte', rol: 'soporte', rolNFC: 'soporte', departamento: 'Soporte', puesto: 'SysAdmin Junior', serie: 'SERIE-018', uidNFC: '04F8A9B0', esReal: false },
    { id: 'EMP019', nombre: 'Ana Torres Medina', usuario: 'atorresm', email: 'atorresm@innovation.nfc.esf', password: 'torres123', area: 'Almacen', rol: 'almacen', rolNFC: 'almacen', departamento: 'Almacen', puesto: 'Control Inventario', serie: 'SERIE-019', uidNFC: '04A9B0C1', esReal: false },
    { id: 'EMP020', nombre: 'Roberto Paredes Lopez', usuario: 'rparedesl', email: 'rparedesl@innovation.nfc.esf', password: 'paredes123', area: 'Limpieza', rol: 'limpieza', rolNFC: 'limpieza', departamento: 'Limpieza', puesto: 'Supervisor Turno', serie: 'SERIE-020', uidNFC: '04B0C1D2', esReal: false },

    // ============================================================
    // C. 30 EMPLEADOS SERVICIO/REGULARES — Solo acceso común
    // rolNFC: 'simulado' = solo comedor + salas_comunes
    // Generan volumen de datos para métricas realistas
    // ============================================================
    { id: 'EMP021', nombre: 'Juan Perez Garcia', usuario: 'jperezg', email: 'jperezg@innovation.nfc.esf', password: 'perez123', area: 'Produccion', rol: 'operario', rolNFC: 'simulado', departamento: 'Operaciones', puesto: 'Operario Linea 1', serie: 'SERIE-021', uidNFC: '04C1D2E3', esReal: false },
    { id: 'EMP022', nombre: 'Maria Lopez Sanchez', usuario: 'mlopezs', email: 'mlopezs@innovation.nfc.esf', password: 'lopez123', area: 'Produccion', rol: 'operario', rolNFC: 'simulado', departamento: 'Operaciones', puesto: 'Operario Linea 2', serie: 'SERIE-022', uidNFC: '04D2E3F4', esReal: false },
    { id: 'EMP023', nombre: 'Carlos Rodriguez Martin', usuario: 'crodriguezm', email: 'crodriguezm@innovation.nfc.esf', password: 'rodriguez123', area: 'Produccion', rol: 'operario', rolNFC: 'simulado', departamento: 'Operaciones', puesto: 'Operario Linea 3', serie: 'SERIE-023', uidNFC: '04E3F4A5', esReal: false },
    { id: 'EMP024', nombre: 'Laura Gomez Fernandez', usuario: 'lgomezmf', email: 'lgomezmf@innovation.nfc.esf', password: 'gomez123', area: 'Produccion', rol: 'operario', rolNFC: 'simulado', departamento: 'Operaciones', puesto: 'Operario Linea 1', serie: 'SERIE-024', uidNFC: '04F4A5B6', esReal: false },
    { id: 'EMP025', nombre: 'Jose Martinez Ruiz', usuario: 'jmartinezm', email: 'jmartinezm@innovation.nfc.esf', password: 'martinez123', area: 'Produccion', rol: 'operario', rolNFC: 'simulado', departamento: 'Operaciones', puesto: 'Operario Linea 2', serie: 'SERIE-025', uidNFC: '04A5B6C7', esReal: false },
    { id: 'EMP026', nombre: 'Carmen Sanchez Perez', usuario: 'csanchezm', email: 'csanchezm@innovation.nfc.esf', password: 'sanchez123', area: 'Produccion', rol: 'operario', rolNFC: 'simulado', departamento: 'Operaciones', puesto: 'Operario Linea 3', serie: 'SERIE-026', uidNFC: '04B6C7D8', esReal: false },
    { id: 'EMP027', nombre: 'Miguel Torres Lopez', usuario: 'mtorresl', email: 'mtorresl@innovation.nfc.esf', password: 'torres123', area: 'Produccion', rol: 'operario', rolNFC: 'simulado', departamento: 'Operaciones', puesto: 'Operario Linea 1', serie: 'SERIE-027', uidNFC: '04C7D8E9', esReal: false },
    { id: 'EMP028', nombre: 'Elena Ramirez Gomez', usuario: 'eramirez', email: 'eramirez@innovation.nfc.esf', password: 'ramirez123', area: 'Produccion', rol: 'operario', rolNFC: 'simulado', departamento: 'Operaciones', puesto: 'Operario Linea 2', serie: 'SERIE-028', uidNFC: '04D8E9F0', esReal: false },
    { id: 'EMP029', nombre: 'David Flores Vargas', usuario: 'dfloresv', email: 'dfloresv@innovation.nfc.esf', password: 'flores123', area: 'Produccion', rol: 'operario', rolNFC: 'simulado', departamento: 'Operaciones', puesto: 'Operario Linea 3', serie: 'SERIE-029', uidNFC: '04E9F0A1', esReal: false },
    { id: 'EMP030', nombre: 'Sofia Herrera Cruz', usuario: 'sherrerac', email: 'sherrerac@innovation.nfc.esf', password: 'herrera123', area: 'Produccion', rol: 'operario', rolNFC: 'simulado', departamento: 'Operaciones', puesto: 'Operario Linea 1', serie: 'SERIE-030', uidNFC: '04F0A1B2', esReal: false },
    { id: 'EMP031', nombre: 'Javier Medina Torres', usuario: 'jmedinat', email: 'jmedinat@innovation.nfc.esf', password: 'medina123', area: 'Logistica', rol: 'operario', rolNFC: 'simulado', departamento: 'Logistica', puesto: 'Almacenero Junior', serie: 'SERIE-031', uidNFC: '05000031', esReal: false },
    { id: 'EMP032', nombre: 'Paula Ortiz Mendez', usuario: 'portizm', email: 'portizm@innovation.nfc.esf', password: 'ortiz123', area: 'Logistica', rol: 'operario', rolNFC: 'simulado', departamento: 'Logistica', puesto: 'Despacho', serie: 'SERIE-032', uidNFC: '05000032', esReal: false },
    { id: 'EMP033', nombre: 'Andres Ruiz Gonzalez', usuario: 'aruizg', email: 'aruizg@innovation.nfc.esf', password: 'ruiz1234', area: 'Logistica', rol: 'operario', rolNFC: 'simulado', departamento: 'Logistica', puesto: 'Recepcion', serie: 'SERIE-033', uidNFC: '05000033', esReal: false },
    { id: 'EMP034', nombre: 'Monica Castro Lopez', usuario: 'mcastrol', email: 'mcastrol@innovation.nfc.esf', password: 'castro123', area: 'Logistica', rol: 'operario', rolNFC: 'simulado', departamento: 'Logistica', puesto: 'Inventario', serie: 'SERIE-034', uidNFC: '05000034', esReal: false },
    { id: 'EMP035', nombre: 'Rafael Moreno Perez', usuario: 'rmorenop', email: 'rmorenop@innovation.nfc.esf', password: 'moreno123', area: 'Logistica', rol: 'operario', rolNFC: 'simulado', departamento: 'Logistica', puesto: 'Transporte', serie: 'SERIE-035', uidNFC: '05000035', esReal: false },
    { id: 'EMP036', nombre: 'Isabel Jimenez Ruiz', usuario: 'ijimenezr', email: 'ijimenezr@innovation.nfc.esf', password: 'jimenez123', area: 'Mantenimiento', rol: 'operario', rolNFC: 'simulado', departamento: 'Mantenimiento', puesto: 'Mantenimiento General', serie: 'SERIE-036', uidNFC: '05000036', esReal: false },
    { id: 'EMP037', nombre: 'Fernando Garcia Lopez', usuario: 'fgarcial', email: 'fgarcial@innovation.nfc.esf', password: 'garcia123', area: 'Mantenimiento', rol: 'operario', rolNFC: 'simulado', departamento: 'Mantenimiento', puesto: 'Electricista', serie: 'SERIE-037', uidNFC: '05000037', esReal: false },
    { id: 'EMP038', nombre: 'Rosa Martinez Sanchez', usuario: 'rmartinezs', email: 'rmartinezs@innovation.nfc.esf', password: 'martinez123', area: 'Mantenimiento', rol: 'operario', rolNFC: 'simulado', departamento: 'Mantenimiento', puesto: 'Plomeria', serie: 'SERIE-038', uidNFC: '05000038', esReal: false },
    { id: 'EMP039', nombre: 'Daniel Torres Martinez', usuario: 'dtorresm', email: 'dtorresm@innovation.nfc.esf', password: 'torres123', area: 'Mantenimiento', rol: 'operario', rolNFC: 'simulado', departamento: 'Mantenimiento', puesto: 'Carpinteria', serie: 'SERIE-039', uidNFC: '05000039', esReal: false },
    { id: 'EMP040', nombre: 'Patricia Flores Gonzalez', usuario: 'pfloresg', email: 'pfloresg@innovation.nfc.esf', password: 'flores123', area: 'Mantenimiento', rol: 'operario', rolNFC: 'simulado', departamento: 'Mantenimiento', puesto: 'Pintura', serie: 'SERIE-040', uidNFC: '05000040', esReal: false },
    { id: 'EMP041', nombre: 'Alberto Sanchez Perez', usuario: 'asanchezp', email: 'asanchezp@innovation.nfc.esf', password: 'sanchez123', area: 'Seguridad', rol: 'operario', rolNFC: 'simulado', departamento: 'Seguridad', puesto: 'Vigilante Turno 1', serie: 'SERIE-041', uidNFC: '05000041', esReal: false },
    { id: 'EMP042', nombre: 'Cristina Lopez Torres', usuario: 'clopezr', email: 'clopezr@innovation.nfc.esf', password: 'lopez123', area: 'Seguridad', rol: 'operario', rolNFC: 'simulado', departamento: 'Seguridad', puesto: 'Vigilante Turno 2', serie: 'SERIE-042', uidNFC: '05000042', esReal: false },
    { id: 'EMP043', nombre: 'Manuel Ruiz Gomez', usuario: 'mruizg', email: 'mruizg@innovation.nfc.esf', password: 'ruiz1234', area: 'Seguridad', rol: 'operario', rolNFC: 'simulado', departamento: 'Seguridad', puesto: 'Control Acceso', serie: 'SERIE-043', uidNFC: '05000043', esReal: false },
    { id: 'EMP044', nombre: 'Teresa Martinez Lopez', usuario: 'tmartinezl', email: 'tmartinezl@innovation.nfc.esf', password: 'martinez123', area: 'Seguridad', rol: 'operario', rolNFC: 'simulado', departamento: 'Seguridad', puesto: 'Rondas', serie: 'SERIE-044', uidNFC: '05000044', esReal: false },
    { id: 'EMP045', nombre: 'Francisco Herrera Perez', usuario: 'fherrerap', email: 'fherrerap@innovation.nfc.esf', password: 'herrera123', area: 'Limpieza', rol: 'operario', rolNFC: 'simulado', departamento: 'Limpieza', puesto: 'Limpieza Oficinas', serie: 'SERIE-045', uidNFC: '05000045', esReal: false },
    { id: 'EMP046', nombre: 'Silvia Gonzalez Ruiz', usuario: 'sgonzalezr', email: 'sgonzalezr@innovation.nfc.esf', password: 'gonzalez123', area: 'Limpieza', rol: 'operario', rolNFC: 'simulado', departamento: 'Limpieza', puesto: 'Limpieza Comunes', serie: 'SERIE-046', uidNFC: '05000046', esReal: false },
    { id: 'EMP047', nombre: 'Ricardo Sanchez Torres', usuario: 'rsanchezt', email: 'rsanchezt@innovation.nfc.esf', password: 'sanchez123', area: 'Limpieza', rol: 'operario', rolNFC: 'simulado', departamento: 'Limpieza', puesto: 'Limpieza Baños', serie: 'SERIE-047', uidNFC: '05000047', esReal: false },
    { id: 'EMP048', nombre: 'Beatriz Torres Martinez', usuario: 'btorresm', email: 'btorresm@innovation.nfc.esf', password: 'torres123', area: 'Limpieza', rol: 'operario', rolNFC: 'simulado', departamento: 'Limpieza', puesto: 'Limpieza Cocina', serie: 'SERIE-048', uidNFC: '05000048', esReal: false },
    { id: 'EMP049', nombre: 'Oscar Flores Lopez', usuario: 'ofloresl', email: 'ofloresl@innovation.nfc.esf', password: 'flores123', area: 'Recepcion', rol: 'operario', rolNFC: 'simulado', departamento: 'Recepcion', puesto: 'Recepcionista', serie: 'SERIE-049', uidNFC: '05000049', esReal: false },
    { id: 'EMP050', nombre: 'Miriam Perez Sanchez', usuario: 'mperezs', email: 'mperezs@innovation.nfc.esf', password: 'perez123', area: 'Recepcion', rol: 'operario', rolNFC: 'simulado', departamento: 'Recepcion', puesto: 'Telefonista', serie: 'SERIE-050', uidNFC: '05000050', esReal: false }
  ];

  const ZONAS_SEED = [
    // Exactamente del KV uni_zonas (ids = keys originales)
    { id: 'almacen', nombre: 'Almacén', icono: '📦', rolesPermitidos: ['dueno', 'jefe', 'almacen'], descripcion: 'Almacén general y logística' },
    { id: 'comedor', nombre: 'Comedor', icono: '🍽️', rolesPermitidos: ['todos'], descripcion: 'Acceso al comedor para almuerzo' },
    { id: 'cuarto_limpieza', nombre: 'Cuarto de Limpieza', icono: '🧹', rolesPermitidos: ['dueno', 'jefe', 'limpieza', 'admin_limpieza'], descripcion: 'Depósito de materiales de limpieza' },
    { id: 'datacenter', nombre: 'Data Center', icono: '🖥️', rolesPermitidos: ['dueno', 'jefe', 'soporte'], descripcion: 'Sala de servidores y red' },
    { id: 'oficina_jefatura', nombre: 'Oficina Jefatura', icono: '🏢', rolesPermitidos: ['dueno', 'jefe', 'admin_limpieza'], descripcion: 'Oficina de Jefatura' },
    { id: 'oficina_rrhh', nombre: 'Oficina RR.HH.', icono: '📋', rolesPermitidos: ['dueno', 'jefe', 'rrhh'], descripcion: 'Área de Recursos Humanos' },
    { id: 'oficina_soporte', nombre: 'Oficina Soporte', icono: '💻', rolesPermitidos: ['dueno', 'jefe', 'soporte'], descripcion: 'Oficina de Soporte TI' },
    { id: 'salas_comunes', nombre: 'Salas Comunes', icono: '🚪', rolesPermitidos: ['todos'], descripcion: 'Salas de reuniones y áreas comunes' }
  ];

  const TIPOS_MARCACION = {
    entrada: { label: 'Entrada', icono: '🟢', horario: '07:00 – 08:30', zona: 'principal', color: '#8FBF8F' },
    almuerzo_salida: { label: 'Salida almuerzo', icono: '🟡', horario: '12:00 – 13:30', zona: 'comedor', color: '#F5D25A' },
    almuerzo_retorno: { label: 'Retorno almuerzo', icono: '🟠', horario: '13:00 – 14:30', zona: 'comedor', color: '#E8A83F' },
    salida: { label: 'Salida final', icono: '🔴', horario: '17:00 – 19:00', zona: 'principal', color: '#D97757' }
  };

  // ============================================================
  // UTILIDADES STORAGE
  // ============================================================

  function getStorage(key, defaultValue = []) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  function setStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function generarId(prefix = 'NFC') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  // ============================================================
  // DATOS ENRIQUECIDOS DEL SEED V3 (contratos, DNI, cumpleaños)
  // Son simulados y estables: no usan Math.random para que las
  // tablas y los reportes no cambien entre recargas.
  // ============================================================

  const AREAS_SUPERVISADAS = {
    EMP002: ['todas'],
    EMP003: ['Soporte', 'Almacen'],
    EMP004: ['Almacen', 'Logistica']
  };

  function fechaTexto(anio, mes, dia) {
    return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }

  function sumarDiasFecha(fechaStr, dias) {
    const [anio, mes, dia] = String(fechaStr).split('-').map(Number);
    const fecha = new Date(anio, mes - 1, dia, 12, 0, 0);
    fecha.setDate(fecha.getDate() + dias);
    return fechaTexto(fecha.getFullYear(), fecha.getMonth() + 1, fecha.getDate());
  }

  function diferenciaDias(desde, hasta) {
    const [a1, m1, d1] = String(desde).split('-').map(Number);
    const [a2, m2, d2] = String(hasta).split('-').map(Number);
    const inicio = new Date(a1, m1 - 1, d1, 12, 0, 0);
    const fin = new Date(a2, m2 - 1, d2, 12, 0, 0);
    return Math.round((fin - inicio) / 86400000);
  }

  const PERFIL_BANCOS = ['BCP', 'BBVA', 'Interbank', 'Scotiabank', 'Banbif'];
  const PERFIL_DISTRITOS = ['Santiago de Surco', 'San Isidro', 'Miraflores', 'La Molina', 'San Miguel', 'Lince', 'Ate', 'Callao'];
  const PERFIL_DIRECCIONES = [
    'Av. Los Álamos 245', 'Calle Las Begonias 118', 'Av. Primavera 890', 'Jr. Los Cedros 302',
    'Av. Arequipa 1540', 'Calle Los Olivos 77', 'Av. Universitaria 3210', 'Jr. Tacna 460',
    'Av. Brasil 1120', 'Calle Cantuarias 210'
  ];
  const PERFIL_PARENTESCOS = ['Madre', 'Padre', 'Hermano/a', 'Esposo/a', 'Tío/a'];

  function generarPerfilExtra(indice = 0) {
    const n = Math.abs(Number(indice) || 0);
    const numeroCuenta = String(1000000000000 + n * 1379).padStart(13, '0');
    const cci = '002' + String(1000000000000 + n * 977).padStart(17, '0');

    return {
      direccion: PERFIL_DIRECCIONES[n % PERFIL_DIRECCIONES.length],
      distrito: PERFIL_DISTRITOS[n % PERFIL_DISTRITOS.length],
      banco: PERFIL_BANCOS[n % PERFIL_BANCOS.length],
      tipoCuenta: n % 2 === 0 ? 'Ahorros' : 'Corriente',
      numeroCuenta,
      cci,
      sueldoBruto: 2500 + (n % 15) * 250,
      parentesco: PERFIL_PARENTESCOS[n % PERFIL_PARENTESCOS.length]
    };
  }

  function generarEmpleadosEnriquecidos() {
    return EMPLEADOS_SEED.map((emp, indice) => {
      const anioNacimiento = 1980 + (indice % 20);
      const mesNacimiento = (indice % 12) + 1;
      const diaNacimiento = 1 + ((indice * 7) % 28);

      const anioIngreso = 2018 + (indice % 7);
      const mesIngreso = ((indice * 3) % 12) + 1;
      const diaIngreso = 1 + ((indice * 5) % 27);
      const fechaIngreso = fechaTexto(anioIngreso, mesIngreso, diaIngreso);

      const dni = String(70000000 + indice + 1);
      const telefono = `+51 9${String(10 + (indice % 80)).padStart(2, '0')} ${String(100 + ((indice * 7) % 900)).padStart(3, '0')} ${String(100 + ((indice * 13) % 900)).padStart(3, '0')}`;

      const grupo = indice % 20;
      let tipoContrato = 'indefinido';
      let finContrato = null;

      if (grupo >= 12 && grupo <= 16) {
        const plazos = [15, 30, 60, 90, 45];
        tipoContrato = 'plazo_fijo';
        finContrato = sumarDiasFecha(SIM_CONFIG.fechaCorte, plazos[grupo - 12]);
      } else if (grupo === 17 || grupo === 18) {
        tipoContrato = 'practicante';
        finContrato = grupo === 17 ? '2026-12-31' : '2027-03-31';
      } else if (grupo === 19) {
        tipoContrato = 'plazo_fijo';
        finContrato = '2026-09-30';
      }

      let estadoContrato = 'vigente';
      if (finContrato) {
        const restantes = diferenciaDias(SIM_CONFIG.fechaCorte, finContrato);
        if (restantes < 0) estadoContrato = 'vencido';
        else if (restantes <= 90) estadoContrato = 'por_vencer';
      }

      const { parentesco, ...perfilExtra } = generarPerfilExtra(indice);

      return {
        ...emp,
        ...perfilExtra,
        dni,
        fechaNacimiento: fechaTexto(anioNacimiento, mesNacimiento, diaNacimiento),
        fechaIngreso,
        telefono,
        contactoEmergencia: {
          nombre: `Contacto ${indice + 1}`,
          parentesco,
          telefono: `+51 9${String(20 + (indice % 70)).padStart(2, '0')} ${String(200 + ((indice * 11) % 800)).padStart(3, '0')} ${String(300 + ((indice * 17) % 700)).padStart(3, '0')}`
        },
        contrato: {
          tipo: tipoContrato,
          inicio: fechaIngreso,
          fin: finContrato,
          estado: estadoContrato
        },
        documentos: [
          { tipo: 'dni', nombre: `DNI_${emp.id}.pdf`, estado: 'simulado' },
          { tipo: 'contrato', nombre: `CONTRATO_${emp.id}.pdf`, estado: 'simulado' }
        ],
        foto: null,
        areasSupervisadas: AREAS_SUPERVISADAS[emp.id] || []
      };
    });
  }

  const EMPLEADOS_ENRIQUECIDOS = generarEmpleadosEnriquecidos();

  // Completa perfiles antiguos sin cambiar el seed ni la asistencia.
  // Es una migración no destructiva: solo agrega campos que falten.
  function asegurarPerfilDatos(empleados) {
    let cambios = false;
    const resultado = empleados.map((emp, indice) => {
      const extra = generarPerfilExtra(indice);
      const siguiente = { ...emp };

      ['direccion', 'distrito', 'banco', 'tipoCuenta', 'numeroCuenta', 'cci', 'sueldoBruto'].forEach((campo) => {
        if (siguiente[campo] == null || siguiente[campo] === '') {
          siguiente[campo] = extra[campo];
          cambios = true;
        }
      });

      const contacto = { ...(siguiente.contactoEmergencia || {}) };
      if (!contacto.nombre) {
        contacto.nombre = `Contacto ${indice + 1}`;
        cambios = true;
      }
      if (!contacto.telefono) {
        contacto.telefono = `+51 9${String(20 + (indice % 70)).padStart(2, '0')} ${String(200 + ((indice * 11) % 800)).padStart(3, '0')} ${String(300 + ((indice * 17) % 700)).padStart(3, '0')}`;
        cambios = true;
      }
      if (!contacto.parentesco) {
        contacto.parentesco = extra.parentesco;
        cambios = true;
      }
      siguiente.contactoEmergencia = contacto;

      if (!Array.isArray(siguiente.documentos) || !siguiente.documentos.length) {
        siguiente.documentos = [
          { tipo: 'dni', nombre: `DNI_${siguiente.id}.pdf`, estado: 'simulado' },
          { tipo: 'contrato', nombre: `CONTRATO_${siguiente.id}.pdf`, estado: 'simulado' }
        ];
        cambios = true;
      }

      return siguiente;
    });

    if (cambios) setStorage(STORAGE_KEYS.EMPLEADOS, resultado);
    return resultado;
  }

  function calcularEstadoContrato(fin) {
    if (!fin) return 'vigente';
    const restantes = diferenciaDias(SIM_CONFIG.fechaCorte, fin);
    if (restantes < 0) return 'vencido';
    if (restantes <= 90) return 'por_vencer';
    return 'vigente';
  }

  function ahoraPeruISO() {
    return new Date().toLocaleString('sv-SE', { timeZone: 'America/Lima' }).replace(' ', 'T');
  }

  function horaPeru(fecha = new Date()) {
    return fecha.toLocaleTimeString('es-PE', {
      timeZone: 'America/Lima',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  function fechaHoyPeru() {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Lima' });
  }

  function tarjetaPorUID(uid) {
    const uidNormalizado = normalizarUID(uid);
    if (!uidNormalizado) return null;
    return getStorage(STORAGE_KEYS.TARJETAS, [])
      .find(t => normalizarUID(t.uid) === uidNormalizado) || null;
  }

  function empleadoPorUID(uid) {
    const uidNormalizado = normalizarUID(uid);
    if (!uidNormalizado) return undefined;
    const empleados = getStorage(STORAGE_KEYS.EMPLEADOS, EMPLEADOS_SEED);
    // La tarjeta es la fuente de verdad para saber a quién pertenece el UID.
    // Si existe pero está sin asignar, el UID no debe resolver a un empleado.
    const tarjeta = tarjetaPorUID(uid);
    if (tarjeta) {
      if (!tarjeta.empleadoId) return undefined;
      return empleados.find(e => e.id === tarjeta.empleadoId);
    }
    return empleados.find(e => normalizarUID(e.uidNFC) === uidNormalizado);
  }

  function validarTarjetaParaUso(uid) {
    const tarjeta = tarjetaPorUID(uid);
    if (!tarjeta) return { error: 'TARJETA_NO_REGISTRADA', tarjeta: null };
    if (tarjeta.estado === 'bloqueada') return { error: 'TARJETA_BLOQUEADA', tarjeta };
    if (!tarjeta.empleadoId) return { error: 'TARJETA_SIN_ASIGNAR', tarjeta };
    return { error: null, tarjeta };
  }

  function mensajeErrorTarjeta(error) {
    if (error === 'TARJETA_BLOQUEADA') return 'Tarjeta bloqueada. Contacta al Dueño para habilitarla.';
    if (error === 'TARJETA_SIN_ASIGNAR') return 'Tarjeta sin asignar. El Dueño debe asignarla a un empleado.';
    return 'Tarjeta no registrada en el sistema';
  }

  function empleadoTieneAcceso(empleado, zona) {
    const rol = empleado.rolNFC || empleado.rol; // fallback a rol si no hay rolNFC
    const roles = zona.rolesPermitidos || [];
    
    // Dueño tiene acceso a todo
    if (rol === 'dueno') return true;
    
    // Empleados simulados solo acceden a zonas con 'todos' (comedor, salas_comunes)
    if (rol === 'simulado') return roles.includes('todos');
    
    // Roles reales: acceso según KV original
    return roles.includes('todos') || roles.includes(rol);
  }

  function mostrarToast(mensaje, tipo = 'info', duracion = 3000) {
    const colors = { success: '#8FBF8F', warning: '#F5D25A', error: '#D97757', info: '#1E1E1E' };
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:9999;display:flex;flex-direction:column;gap:.5rem;pointer-events:none;';
      document.body.appendChild(container);
    }
    const item = document.createElement('div');
    item.textContent = mensaje;
    item.style.cssText = `background:${colors[tipo] || colors.info};color:${tipo === 'warning' ? '#1E1E1E' : '#FFFFFF'};padding:.8rem 1.1rem;border-radius:999px;box-shadow:0 16px 34px rgba(30,30,30,.18);font-size:.8rem;font-weight:500;pointer-events:auto;animation:slideIn .3s ease;`;
    container.appendChild(item);
    setTimeout(() => { item.style.animation = 'slideOut .3s ease forwards'; setTimeout(() => item.remove(), 300); }, duracion);
    if (!document.getElementById('toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `@keyframes slideIn {from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}@keyframes slideOut {from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(20px)}}`;
      document.head.appendChild(style);
    }
  }

  // ============================================================
  // SEED HISTÓRICO (mes anterior + mes actual hasta hoy, sin datos futuros)
  // ============================================================

  function generarSeedHistorico() {
    const empleados = EMPLEADOS_ENRIQUECIDOS;
    const asistencia = [];
    const accesosZonas = [];
    const auditoriaAccesos = [];
    let secuenciaAsistencia = 0;
    let secuenciaAcceso = 0;
    let secuenciaAuditoria = 0;

    const pad = (n) => String(n).padStart(2, '0');
    const formatearFecha = (anio, mes, dia) => `${anio}-${pad(mes)}-${pad(dia)}`;
    const horaTexto = (minutos) => {
      const h = Math.floor(minutos / 60).toString().padStart(2, '0');
      const m = (minutos % 60).toString().padStart(2, '0');
      return `${h}:${m}`;
    };

    const anio = SIM_CONFIG.anio;
    const mes = SIM_CONFIG.mes;
    const ultimoDia = new Date(anio, mes, 0).getDate();
    const cursor = new Date(anio, mes - 1, 1, 12, 0, 0);
    const fin = new Date(anio, mes - 1, ultimoDia, 12, 0, 0);

    while (cursor <= fin) {
      const anioActual = cursor.getFullYear();
      const mesActual = cursor.getMonth() + 1;
      const diaActual = cursor.getDate();
      const fechaStr = formatearFecha(anioActual, mesActual, diaActual);
      const diaSemana = cursor.getDay();

      // Domingo no laborable.
      if (diaSemana === 0) {
        cursor.setDate(cursor.getDate() + 1);
        continue;
      }

      empleados.forEach((emp) => {
        if (Math.random() > 0.85) return; // 85% asiste

        const baseEntrada = 7 * 60 + 30;
        const baseAlmuerzoSalida = 12 * 60 + 30;
        const baseAlmuerzoRetorno = 13 * 60 + 30;
        const baseSalida = 18 * 60;
        const variacion = () => Math.floor((Math.random() - 0.5) * 40);

        [
          { tipo: 'entrada', baseMin: baseEntrada },
          { tipo: 'almuerzo_salida', baseMin: baseAlmuerzoSalida },
          { tipo: 'almuerzo_retorno', baseMin: baseAlmuerzoRetorno },
          { tipo: 'salida', baseMin: baseSalida }
        ].forEach((m) => {
          const minutos = m.baseMin + variacion();
          const hora = horaTexto(minutos);
          const esEntrada = m.tipo === 'entrada';
          const limiteTardanza = 7 * 60 + 40; // 07:40
          const esTardanza = esEntrada && minutos > limiteTardanza;

          asistencia.push({
            id: `ASI-SEED-${String(++secuenciaAsistencia).padStart(6, '0')}`,
            empleadoId: emp.id,
            empleadoNombre: emp.nombre,
            area: emp.area,
            rol: emp.rol,
            tipo: m.tipo,
            zona: TIPOS_MARCACION[m.tipo].zona,
            fecha: fechaStr,
            hora,
            timestamp: `${fechaStr}T${hora}:00`,
            valida: true,
            esTardanza,
            minutosTardanza: esTardanza ? minutos - limiteTardanza : 0,
            origen: 'seed'
          });
        });

        // 2% de marcas de prueba por empleado-día. No contaminan estadísticas.
        if (Math.random() < 0.02) {
          const minutosTest = 9 * 60 + Math.floor(Math.random() * 180);
          const horaTest = horaTexto(minutosTest);
          asistencia.push({
            id: `ASI-SEED-${String(++secuenciaAsistencia).padStart(6, '0')}`,
            empleadoId: emp.id,
            empleadoNombre: emp.nombre,
            area: emp.area,
            rol: emp.rol,
            tipo: 'entrada',
            zona: 'principal',
            fecha: fechaStr,
            hora: horaTest,
            timestamp: `${fechaStr}T${horaTest}:00`,
            valida: false,
            esTardanza: false,
            minutosTardanza: 0,
            origen: 'seed_test',
            motivo: 'fuera_de_horario'
          });
        }

        // Accesos a zonas.
        ZONAS_SEED.forEach((zona) => {
          if (!empleadoTieneAcceso(emp, zona)) return;

          let visitas = 0;
          if (zona.id === 'comedor') visitas = 1 + Math.floor(Math.random() * 3);
          else if (['salas_comunes', 'oficina_rrhh'].includes(zona.id)) visitas = Math.random() < 0.3 ? 1 + Math.floor(Math.random() * 2) : 0;
          else if (['datacenter', 'almacen', 'cuarto_limpieza'].includes(zona.id)) visitas = Math.random() < 0.15 ? 1 : 0;
          else visitas = Math.random() < 0.2 ? 1 : 0;

          for (let v = 0; v < visitas; v++) {
            const horaVisita = 8 * 60 + Math.floor(Math.random() * 600) + Math.floor(Math.random() * 60);
            const duracion = zona.id === 'comedor' ? 30 + Math.floor(Math.random() * 45) : 15 + Math.floor(Math.random() * 120);
            const horaEntrada = horaTexto(horaVisita);
            const horaSalida = horaTexto(horaVisita + duracion);

            accesosZonas.push({
              id: `ACC-SEED-${String(++secuenciaAcceso).padStart(6, '0')}`,
              empleadoId: emp.id,
              empleadoNombre: emp.nombre,
              area: emp.area,
              rol: emp.rol,
              zonaId: zona.id,
              zonaNombre: zona.nombre,
              tipo: 'acceso',
              fecha: fechaStr,
              horaEntrada,
              horaSalida,
              duracionMin: duracion,
              timestampEntrada: `${fechaStr}T${horaEntrada}:00`,
              timestampSalida: `${fechaStr}T${horaSalida}:00`,
              permitido: true,
              origen: 'seed'
            });
          }
        });
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    // ============================================================
    // AUDITORÍA DE ACCESOS (permitidos y denegados reales)
    // ============================================================
    const parejasPermitidas = [];
    const parejasDenegadas = [];

    empleados.forEach((emp) => {
      ZONAS_SEED.forEach((zona) => {
        const par = { emp, zona };
        if (empleadoTieneAcceso(emp, zona)) parejasPermitidas.push(par);
        else parejasDenegadas.push(par);
      });
    });

    const diasLaborables = [];
    for (let dia = 1; dia <= ultimoDia; dia++) {
      const fecha = new Date(anio, mes - 1, dia, 12, 0, 0);
      if (fecha.getDay() !== 0) diasLaborables.push(dia);
    }

    for (let i = 0; i < 220; i++) {
      const usarDenegado = Math.random() < 0.18;
      const pool = usarDenegado ? parejasDenegadas : parejasPermitidas;
      if (!pool.length) continue;

      const { emp, zona } = pool[Math.floor(Math.random() * pool.length)];
      const dia = diasLaborables[Math.floor(Math.random() * diasLaborables.length)];
      const fecha = formatearFecha(anio, mes, dia);
      const minutos = 8 * 60 + Math.floor(Math.random() * 660);
      const hora = horaTexto(minutos);

      auditoriaAccesos.push({
        id: `AUD-SEED-${String(++secuenciaAuditoria).padStart(6, '0')}`,
        empleadoId: emp.id,
        empleadoNombre: emp.nombre,
        area: emp.area,
        rol: emp.rol,
        zonaId: zona.id,
        zonaNombre: zona.nombre,
        fecha,
        hora,
        timestamp: `${fecha}T${hora}:00`,
        permitido: !usarDenegado,
        motivo: usarDenegado ? 'sin_permiso' : 'autorizado',
        origen: 'seed'
      });
    }

    // ============================================================
    // REUNIONES, TICKETS, TARJETAS Y CONFIGURACIÓN
    // ============================================================
    const reuniones = [
      { id: 'REU-0001', titulo: 'Cierre de asistencia de octubre', descripcion: 'Revisión de marcas, tardanzas y ausencias del mes.', fecha: '2026-10-29', horaInicio: '09:00', horaFin: '10:00', lugar: 'Sala de reuniones', creadoPor: 'EMP005', rolesInvitados: ['rrhh', 'jefe', 'dueno'], estado: 'finalizada' },
      { id: 'REU-0002', titulo: 'Revisión de contratos por vencer', descripcion: 'Contratos con vencimiento en los próximos 30 días.', fecha: '2026-10-30', horaInicio: '11:00', horaFin: '12:00', lugar: 'Oficina RR.HH.', creadoPor: 'EMP006', rolesInvitados: ['rrhh', 'dueno'], estado: 'programada' },
      { id: 'REU-0003', titulo: 'Comité de gerencia', descripcion: 'Indicadores de personal y accesos del mes.', fecha: '2026-11-03', horaInicio: '09:00', horaFin: '10:30', lugar: 'Sala de directorio', creadoPor: 'EMP002', rolesInvitados: ['jefe', 'dueno'], estado: 'programada' },
      { id: 'REU-0004', titulo: 'Planificación de noviembre', descripcion: 'Horarios, coberturas y nuevas contrataciones.', fecha: '2026-11-05', horaInicio: '10:00', horaFin: '11:00', lugar: 'Sala de reuniones', creadoPor: 'EMP003', rolesInvitados: ['rrhh', 'jefe', 'dueno'], estado: 'programada' },
      { id: 'REU-0005', titulo: 'Auditoría de accesos', descripcion: 'Revisión de intentos denegados a zonas restringidas.', fecha: '2026-11-10', horaInicio: '15:00', horaFin: '16:00', lugar: 'Oficina de Jefatura', creadoPor: 'EMP004', rolesInvitados: ['jefe', 'dueno'], estado: 'programada' },
      { id: 'REU-0006', titulo: 'Onboarding de nuevo personal', descripcion: 'Documentación y accesos para ingresos de noviembre.', fecha: '2026-11-12', horaInicio: '09:30', horaFin: '10:30', lugar: 'Oficina RR.HH.', creadoPor: 'EMP005', rolesInvitados: ['rrhh', 'dueno'], estado: 'programada' }
    ];

    const tickets = [
      { id: 'TKT-0001', origen: 'login', nombre: 'Visitante', email: 'visitante@ejemplo.com', asunto: 'No puedo iniciar sesión', mensaje: 'Intenté entrar con mi usuario y el sistema me rechazó.', fecha: '2026-10-28T10:15:00', estado: 'abierto', prioridad: 'alta' },
      { id: 'TKT-0002', origen: 'login', nombre: 'Ana Torres', email: 'ana.torres@ejemplo.com', asunto: 'Problema con mi tarjeta NFC', mensaje: 'La tarjeta no responde en el lector del comedor.', fecha: '2026-10-29T08:40:00', estado: 'en_proceso', prioridad: 'media' },
      { id: 'TKT-0003', origen: 'configuracion', nombre: 'Joaquin Mamani', email: 'jmamaniq@innovation.nfc.esf', asunto: 'Actualizar correo de contacto', mensaje: 'Necesito cambiar el correo registrado en mi perfil.', fecha: '2026-10-27T16:20:00', estado: 'resuelto', prioridad: 'baja' },
      { id: 'TKT-0004', origen: 'configuracion', nombre: 'Zinadyn Borda', email: 'zbordav@innovation.nfc.esf', asunto: 'Solicitud de reporte de tardanzas', mensaje: 'Necesito el reporte de tardanzas por área de octubre.', fecha: '2026-10-30T09:05:00', estado: 'abierto', prioridad: 'media' }
    ];

    const tarjetas = empleados.map((emp, indice) => ({
      id: `TAR-${String(indice + 1).padStart(3, '0')}`,
      empleadoId: emp.id,
      uid: emp.uidNFC,
      serie: emp.serie,
      estado: [3, 17, 34].includes(indice) ? 'bloqueada' : 'activa',
      zonasPermitidas: ZONAS_SEED.filter((zona) => empleadoTieneAcceso(emp, zona)).map((zona) => zona.id),
      fechaAsignacion: '2026-10-01'
    }));

    const config = {
      empresa: SIM_CONFIG.empresa,
      periodoSimulacion: SIM_CONFIG.periodo,
      fechaCorte: SIM_CONFIG.fechaCorte,
      jornadaSemanalHoras: SIM_CONFIG.jornadaSemanalHoras,
      tema: 'claro',
      notificaciones: true
    };

    return { empleados, zonas: ZONAS_SEED, asistencia, accesosZonas, auditoriaAccesos, reuniones, tickets, tarjetas, config };
  }

  function asegurarSeed() {
    const versionActual = parseInt(localStorage.getItem(STORAGE_KEYS.SEED_VERSION) || '0', 10);
    if (versionActual >= SEED_VERSION) return;

    console.log('[NFCReader] Generando seed histórico v' + SEED_VERSION + '...');
    const { empleados, zonas, asistencia, accesosZonas, auditoriaAccesos, reuniones, tickets, tarjetas, config } = generarSeedHistorico();

    // Guardar todo o nada: si localStorage se llena, no dejar un seed parcial.
    const guardados = [
      setStorage(STORAGE_KEYS.ASISTENCIA, asistencia),
      setStorage(STORAGE_KEYS.ACCESOS_ZONAS, accesosZonas),
      setStorage(STORAGE_KEYS.EMPLEADOS, empleados),
      setStorage(STORAGE_KEYS.ZONAS, zonas),
      setStorage(STORAGE_KEYS.AUDITORIA_ACCESOS, auditoriaAccesos),
      setStorage(STORAGE_KEYS.REUNIONES, reuniones),
      setStorage(STORAGE_KEYS.TICKETS, tickets),
      setStorage(STORAGE_KEYS.TARJETAS, tarjetas),
      setStorage(STORAGE_KEYS.CONFIG, config)
    ];

    if (guardados.some((ok) => !ok)) {
      Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
      console.error('[NFCReader] No se pudo guardar el seed: localStorage sin espacio. Se usarán los datos base en memoria.');
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEYS.SEED_VERSION, String(SEED_VERSION));
    } catch {
      console.error('[NFCReader] No se pudo guardar la versión del seed.');
      return;
    }

    console.log(`[NFCReader] Seed generado: ${asistencia.length} asistencias, ${accesosZonas.length} accesos, ${auditoriaAccesos.length} auditorías, ${reuniones.length} reuniones, ${tickets.length} tickets, ${tarjetas.length} tarjetas`);
  }

  // ============================================================
  // WEB NFC API REAL
  // ============================================================

  let nfcReader = null;
  let nfcController = null;
  let nfcCancelarPendiente = null;

  function nfcDisponible() {
    return 'NDEFReader' in window;
  }

  // Normaliza UIDs: acepta "04:A1:B2:C3", "04-A1-B2-C3", "04A1B2C3" o texto NDEF.
  function normalizarUID(valor) {
    const raw = String(valor || '').trim().toUpperCase();
    if (!raw) return '';

    const compacto = raw.replace(/[\s:_-]+/g, '');
    if (/^[0-9A-F]{4,}$/.test(compacto)) return compacto;

    // Si el texto trae prefijo (por ejemplo "UID: 04A1B2C3"), extrae el bloque hexadecimal.
    const bloque = raw.match(/[0-9A-F]{2}(?:[\s:_-]?[0-9A-F]{2}){3,}/);
    return bloque ? bloque[0].replace(/[^0-9A-F]/g, '') : raw;
  }

  function leerUIDTarjeta(timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      if (!nfcDisponible()) {
        reject(new Error('NFC_NO_SOPORTADO'));
        return;
      }

      const reader = new NDEFReader();
      const controller = new AbortController();
      let terminado = false;
      let timeoutId = null;

      const limpiar = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = null;
        reader.onreading = null;
        reader.onreadingerror = null;
        if (nfcReader === reader) nfcReader = null;
        if (nfcController === controller) nfcController = null;
        if (nfcCancelarPendiente === cancelar) nfcCancelarPendiente = null;
      };

      const finalizar = (fn, valor) => {
        if (terminado) return;
        terminado = true;
        limpiar();
        try { controller.abort(); } catch { /* ignorar */ }
        fn(valor);
      };

      const cancelar = () => finalizar(reject, new Error('NFC_CANCELADO'));

      nfcReader = reader;
      nfcController = controller;
      nfcCancelarPendiente = cancelar;

      timeoutId = setTimeout(() => finalizar(reject, new Error('NFC_TIMEOUT')), timeoutMs);

      reader.onreading = (event) => {
        // 1) El UID real de la tarjeta viene en serialNumber.
        const uidTarjeta = normalizarUID(event.serialNumber);
        if (uidTarjeta) {
          finalizar(resolve, uidTarjeta);
          return;
        }

        // 2) Fallback: algunas tarjetas solo exponen el UID como texto NDEF.
        let texto = '';
        try {
          for (const record of event.message.records) {
            if (record.recordType === 'text') {
              const dec = new TextDecoder(record.encoding || 'utf-8');
              texto = dec.decode(record.data).trim();
              break;
            }
          }
        } catch { /* ignorar */ }

        if (!texto) {
          finalizar(reject, new Error('NFC_SIN_TEXTO'));
          return;
        }
        finalizar(resolve, normalizarUID(texto));
      };

      reader.onreadingerror = () => finalizar(reject, new Error('NFC_ERROR_LECTURA'));

      reader.scan({ signal: controller.signal }).catch(err => {
        if (err.name === 'NotAllowedError') finalizar(reject, new Error('NFC_PERMISO_DENEGADO'));
        else if (err.name === 'NotSupportedError') finalizar(reject, new Error('NFC_NO_SOPORTADO'));
        else if (err.name === 'AbortError') finalizar(reject, new Error('NFC_CANCELADO'));
        else finalizar(reject, new Error('NFC_ERROR: ' + err.message));
      });
    });
  }

  function cancelarEscaneoNFC() {
    const cancelar = nfcCancelarPendiente;
    nfcCancelarPendiente = null;
    if (cancelar) cancelar();

    if (nfcController) {
      try { nfcController.abort(); } catch { /* ignorar */ }
      nfcController = null;
    }
    nfcReader = null;
  }

  // ============================================================
  // API PÚBLICA
  // ============================================================

  window.NFCReader = {
    // Inicializar (seed + verificar NFC)
    async init() {
      asegurarSeed();
      const tieneNFC = nfcDisponible();
      console.log('[NFCReader] Iniciado. Web NFC:', tieneNFC ? 'DISPONIBLE' : 'NO DISPONIBLE (usar selección manual)');
      return { nfcDisponible: tieneNFC, version: SEED_VERSION };
    },

    // Forzar regenerar seed (testing)
    regenerarSeed() {
      Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
      asegurarSeed();
      console.log('[NFCReader] Seed regenerado forzosamente');
    },

    // ===== ESCANEO NFC REAL =====
    // Retorna Promise<{uid, empleado}>
    // UI debe mostrar: "Escaneando..." + botón "Cancelar"
    async escanearTarjeta(opciones = {}) {
      const { timeout = 30000, onStart, onCancel, onError } = opciones;

      if (onStart) onStart();

      if (!nfcDisponible()) {
        // Sin hardware NFC no se abre la lista manual automáticamente.
        // El modal de escaneo se queda abierto mostrando este error.
        const msg = 'Este dispositivo no tiene lector NFC. Usa "Seleccionar empleado manualmente".';
        mostrarToast(msg, 'warning', 5000);
        if (onError) onError(msg);
        return { uid: null, empleado: null, error: 'NFC_NO_SOPORTADO' };
      }

      try {
        const uid = await leerUIDTarjeta(timeout);
        const control = validarTarjetaParaUso(uid);
        if (control.error) {
          mostrarToast(mensajeErrorTarjeta(control.error), 'error', 5000);
          return { uid, empleado: null, error: control.error };
        }
        const empleado = empleadoPorUID(uid);
        if (!empleado) {
          mostrarToast(`Tarjeta desconocida (UID: ${uid}). Registra la tarjeta primero.`, 'warning', 5000);
          return { uid, empleado: null, error: 'TARJETA_NO_REGISTRADA' };
        }
        mostrarToast(`✅ Tarjeta leída: ${empleado.nombre}`, 'success');
        return { uid, empleado, error: null };
      } catch (err) {
        if (err.message === 'NFC_CANCELADO') {
          if (onCancel) onCancel();
          return { uid: null, empleado: null, error: 'CANCELADO' };
        }
        if (err.message === 'NFC_PERMISO_DENEGADO') {
          const msg = 'Permiso NFC denegado. Permite el acceso en el navegador o usa "Seleccionar empleado manualmente".';
          mostrarToast(msg, 'error', 6000);
          if (onError) onError(msg);
          return { uid: null, empleado: null, error: 'PERMISO_DENEGADO' };
        }
        if (err.message === 'NFC_TIMEOUT') {
          const msg = 'Tiempo agotado. No se detectó tarjeta.';
          mostrarToast(msg, 'warning', 4000);
          if (onError) onError(msg);
          return { uid: null, empleado: null, error: 'TIMEOUT' };
        }
        const msg = 'Error NFC: ' + err.message;
        mostrarToast(msg, 'error', 5000);
        if (onError) onError(msg);
        return { uid: null, empleado: null, error: err.message };
      }
    },

    cancelarEscaneo() {
      cancelarEscaneoNFC();
    },

    // Fallback manual: selector de empleado (para desktop testing)
    seleccionarEmpleadoManual() {
      return new Promise((resolve) => {
        const empleados = getStorage(STORAGE_KEYS.EMPLEADOS, EMPLEADOS_SEED);
        const modal = document.createElement('div');
        modal.className = 'nfc-modal-overlay';
        modal.innerHTML = `
          <div class="nfc-modal-card">
            <div class="nfc-modal-header">
              <h3>Seleccionar empleado (fallback manual)</h3>
              <button type="button" class="nfc-modal-close" aria-label="Cancelar">✕</button>
            </div>
            <div class="nfc-modal-body">
              <p style="color:var(--color-text-secondary);margin-bottom:12px;font-size:.9rem;">
                NFC no disponible en este dispositivo. Elige un empleado para simular el escaneo:
              </p>
              <div class="nfc-empleados-lista" style="max-height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">
                ${empleados.map(emp => `
                  <button type="button" class="nfc-emp-btn" data-id="${emp.id}" style="
                    display:flex;align-items:center;gap:12px;padding:12px 16px;
                    background:var(--color-white);border:1px solid var(--color-border-light);
                    border-radius:var(--radius-lg);cursor:pointer;text-align:left;
                    transition:all var(--transition-fast);width:100%;
                  " onmouseover="this.style.borderColor='var(--color-accent-500)'" onmouseout="this.style.borderColor='var(--color-border-light)'">
                    <span style="font-size:1.25rem;">👤</span>
                    <div style="flex:1;">
                      <strong style="color:var(--color-text-primary);">${emp.nombre}</strong><br>
                      <small style="color:var(--color-text-tertiary);">${emp.area} · ${emp.rol} · UID: ${emp.uidNFC}</small>
                    </div>
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('show'));

        const cleanup = () => {
          modal.classList.remove('show');
          setTimeout(() => modal.remove(), 200);
        };

        modal.querySelector('.nfc-modal-close').onclick = () => {
          cleanup();
          resolve({ uid: null, empleado: null, error: 'CANCELADO' });
        };
        modal.querySelectorAll('.nfc-emp-btn').forEach(btn => {
          btn.onclick = () => {
            const emp = empleados.find(e => e.id === btn.dataset.id);
            cleanup();
            mostrarToast(`Empleado seleccionado: ${emp.nombre}`, 'info');
            resolve({ uid: emp.uidNFC, empleado: emp, error: null });
          };
        });
        modal.onclick = (e) => { if (e.target === modal) { cleanup(); resolve({ uid: null, empleado: null, error: 'CANCELADO' }); } };
      });
    },

    // ===== REGISTRAR MARCACIÓN JORNADA =====
    // tipo: 'entrada' | 'almuerzo_salida' | 'almuerzo_retorno' | 'salida'
    async registrarMarcacion(tipo, uidTarjeta) {
      const config = TIPOS_MARCACION[tipo];
      if (!config) throw new Error('Tipo de marcación inválido');

      const control = validarTarjetaParaUso(uidTarjeta);
      if (control.error) throw new Error(mensajeErrorTarjeta(control.error));
      let empleado = empleadoPorUID(uidTarjeta);
      if (!empleado) {
        throw new Error('Tarjeta no registrada en el sistema');
      }

      const now = new Date();
      const registro = {
        id: generarId('ASI'),
        empleadoId: empleado.id,
        empleadoNombre: empleado.nombre,
        area: empleado.area,
        rol: empleado.rol,
        tipo,
        zona: config.zona,
        fecha: fechaHoyPeru(),
        hora: horaPeru(now),
        timestamp: ahoraPeruISO(),
        valida: true,
        origen: 'nfc_real' // distingue de seed
      };

      const asistencia = getStorage(STORAGE_KEYS.ASISTENCIA);
      asistencia.unshift(registro);
      setStorage(STORAGE_KEYS.ASISTENCIA, asistencia);

      console.log('[NFCReader] Marcación real registrada:', registro);
      return registro;
    },

    // ===== REGISTRAR ACCESO ZONA =====
    async registrarAccesoZona(zonaId, uidTarjeta) {
      const zonas = getStorage(STORAGE_KEYS.ZONAS, ZONAS_SEED);
      const zona = zonas.find(z => z.id === zonaId);
      if (!zona) throw new Error('Zona no existe');

      const control = validarTarjetaParaUso(uidTarjeta);
      if (control.error) throw new Error(mensajeErrorTarjeta(control.error));
      const empleado = empleadoPorUID(uidTarjeta);
      if (!empleado) throw new Error('Tarjeta no registrada');

      // Los permisos efectivos viven en la tarjeta; si no existen, se
      // mantiene el fallback por rol para datos antiguos.
      const permitidas = Array.isArray(control.tarjeta.zonasPermitidas)
        ? control.tarjeta.zonasPermitidas
        : null;
      const autorizado = permitidas
        ? permitidas.includes(zona.id)
        : empleadoTieneAcceso(empleado, zona);

      if (!autorizado) {
        throw new Error(`Acceso denegado: ${empleado.nombre} no tiene permiso para ${zona.nombre}`);
      }

      const now = new Date();
      const duracion = zona.id === 'comedor' ? 30 + Math.floor(Math.random() * 45) : 15 + Math.floor(Math.random() * 105);
      const salidaTime = new Date(now.getTime() + duracion * 60000);

      const registro = {
        id: generarId('ACC'),
        empleadoId: empleado.id,
        empleadoNombre: empleado.nombre,
        area: empleado.area,
        rol: empleado.rol,
        zonaId: zona.id,
        zonaNombre: zona.nombre,
        tipo: 'acceso',
        fecha: fechaHoyPeru(),
        horaEntrada: horaPeru(now),
        horaSalida: horaPeru(salidaTime),
        duracionMin: duracion,
        timestampEntrada: ahoraPeruISO(),
        timestampSalida: salidaTime.toLocaleString('sv-SE', { timeZone: 'America/Lima' }).replace(' ', 'T'),
        permitido: true,
        origen: 'nfc_real'
      };

      const accesos = getStorage(STORAGE_KEYS.ACCESOS_ZONAS);
      accesos.unshift(registro);
      setStorage(STORAGE_KEYS.ACCESOS_ZONAS, accesos);

      console.log('[NFCReader] Acceso zona real registrado:', registro);
      return registro;
    },

    // ===== GETTERS PARA DASHBOARD =====
    getAsistencia() { return getStorage(STORAGE_KEYS.ASISTENCIA); },
    getAccesosZonas() { return getStorage(STORAGE_KEYS.ACCESOS_ZONAS); },
    getEmpleados() {
      asegurarSeed();
      const empleados = getStorage(STORAGE_KEYS.EMPLEADOS, EMPLEADOS_ENRIQUECIDOS);
      return asegurarPerfilDatos(empleados);
    },
    getZonas() { return getStorage(STORAGE_KEYS.ZONAS, ZONAS_SEED); },
    getEmpleadoPorUID(uid) { return empleadoPorUID(uid); },
    getEmpleadoPorId(id) {
      return this.getEmpleados().find((emp) => emp.id === id) || null;
    },
    getEmpleadoPorUsuario(usuario) {
      const objetivo = String(usuario || '').trim().toLowerCase();
      if (!objetivo) return null;
      return this.getEmpleados().find((emp) => String(emp.usuario || '').toLowerCase() === objetivo) || null;
    },
    getEmpleadosReales() {
      return this.getEmpleados().filter((emp) => emp.esReal === true);
    },

    crearEmpleado(datos = {}) {
      const empleados = this.getEmpleados();
      const nombre = String(datos.nombre || '').trim();
      const email = String(datos.email || '').trim().toLowerCase();
      const dni = String(datos.dni || '').replace(/\D/g, '');
      const area = String(datos.area || '').trim();
      const puesto = String(datos.puesto || '').trim();

      if (!nombre || !email || !dni || !area || !puesto || !datos.fechaIngreso) {
        throw new Error('Completa nombre, email, DNI, área, cargo y fecha de ingreso');
      }
      if (!/^\d{8}$/.test(dni)) throw new Error('El DNI debe tener 8 dígitos');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('El email no es válido');
      if (empleados.some((emp) => String(emp.dni) === dni)) throw new Error('Ya existe un empleado con ese DNI');
      if (empleados.some((emp) => String(emp.email || '').toLowerCase() === email)) throw new Error('Ya existe un empleado con ese email');

      const usuarioBase = String(datos.usuario || email.split('@')[0] || 'usuario')
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '') || 'usuario';
      let usuario = usuarioBase;
      let sufijo = 1;
      while (empleados.some((emp) => String(emp.usuario || '').toLowerCase() === usuario)) {
        sufijo++;
        usuario = `${usuarioBase}${sufijo}`;
      }

      const numero = Math.max(0, ...empleados.map((emp) => parseInt(String(emp.id || '').replace(/\D/g, ''), 10) || 0)) + 1;
      const id = `EMP${String(numero).padStart(3, '0')}`;
      const indice = numero - 1;
      const extra = generarPerfilExtra(indice);
      const fechaIngreso = datos.fechaIngreso;
      const tipoContrato = datos.tipoContrato || datos.contrato?.tipo || 'indefinido';
      const finContrato = tipoContrato === 'indefinido' ? null : (datos.finContrato || datos.contrato?.fin || null);

      if (tipoContrato !== 'indefinido' && !finContrato) {
        throw new Error('El contrato a plazo fijo necesita fecha de fin');
      }
      if (finContrato && finContrato < fechaIngreso) {
        throw new Error('La fecha de fin del contrato no puede ser anterior al ingreso');
      }

      let uidNFC = '';
      let intentoUID = 0;
      do {
        uidNFC = (0x06000000 + numero + intentoUID).toString(16).toUpperCase().padStart(8, '0');
        intentoUID++;
      } while (empleados.some((emp) => normalizarUID(emp.uidNFC) === uidNFC));

      const nuevo = {
        id,
        nombre,
        usuario,
        email,
        password: 'simulado123',
        area,
        rol: 'operario',
        rolNFC: 'simulado',
        departamento: String(datos.departamento || area).trim(),
        puesto,
        serie: `SERIE-${String(numero).padStart(3, '0')}`,
        uidNFC,
        esReal: false,
        dni,
        fechaNacimiento: datos.fechaNacimiento || '',
        fechaIngreso,
        telefono: String(datos.telefono || '').trim(),
        direccion: String(datos.direccion || extra.direccion).trim(),
        distrito: String(datos.distrito || extra.distrito).trim(),
        banco: String(datos.banco || extra.banco).trim(),
        tipoCuenta: String(datos.tipoCuenta || extra.tipoCuenta).trim(),
        numeroCuenta: String(datos.numeroCuenta || extra.numeroCuenta).trim(),
        cci: String(datos.cci || extra.cci).trim(),
        sueldoBruto: Number(datos.sueldoBruto) || extra.sueldoBruto,
        contactoEmergencia: {
          nombre: String(datos.contactoEmergencia?.nombre || `Contacto ${numero}`).trim(),
          parentesco: String(datos.contactoEmergencia?.parentesco || extra.parentesco).trim(),
          telefono: String(datos.contactoEmergencia?.telefono || '').trim()
        },
        contrato: {
          tipo: tipoContrato,
          inicio: fechaIngreso,
          fin: finContrato,
          estado: calcularEstadoContrato(finContrato)
        },
        documentos: [
          { tipo: 'dni', nombre: `DNI_${id}.pdf`, estado: 'simulado' },
          { tipo: 'contrato', nombre: `CONTRATO_${id}.pdf`, estado: 'simulado' }
        ],
        foto: null,
        areasSupervisadas: []
      };

      empleados.push(nuevo);
      if (!setStorage(STORAGE_KEYS.EMPLEADOS, empleados)) {
        throw new Error('No se pudo guardar el empleado en el almacenamiento local');
      }

      const tarjetas = getStorage(STORAGE_KEYS.TARJETAS, []);
      tarjetas.push({
        id: `TAR-${String(tarjetas.length + 1).padStart(3, '0')}`,
        empleadoId: id,
        uid: uidNFC,
        serie: nuevo.serie,
        estado: 'activa',
        fechaAsignacion: fechaHoyPeru(),
        zonasPermitidas: ZONAS_SEED.filter((zona) => empleadoTieneAcceso(nuevo, zona)).map((zona) => zona.id)
      });
      setStorage(STORAGE_KEYS.TARJETAS, tarjetas);

      return nuevo;
    },

    actualizarEmpleado(id, cambios = {}) {
      const empleados = this.getEmpleados();
      const indice = empleados.findIndex((emp) => emp.id === id);
      if (indice === -1) return null;

      const permitidos = ['telefono', 'direccion', 'distrito', 'banco', 'tipoCuenta', 'numeroCuenta', 'cci', 'sueldoBruto', 'fechaNacimiento'];
      const actual = { ...empleados[indice] };
      permitidos.forEach((campo) => {
        if (cambios[campo] !== undefined) {
          actual[campo] = cambios[campo];
        }
      });
      if (cambios.contactoEmergencia) {
        actual.contactoEmergencia = {
          ...(actual.contactoEmergencia || {}),
          ...cambios.contactoEmergencia
        };
      }

      empleados[indice] = actual;
      setStorage(STORAGE_KEYS.EMPLEADOS, empleados);
      return actual;
    },

    cambiarPassword(id, passwordActual, passwordNueva) {
      const empleados = this.getEmpleados();
      const indice = empleados.findIndex((emp) => emp.id === id);
      if (indice === -1) throw new Error('El usuario no existe');
      if (String(empleados[indice].password || '') !== String(passwordActual || '')) {
        throw new Error('La contraseña actual no es correcta');
      }
      if (String(passwordNueva || '').length < 8) {
        throw new Error('La nueva contraseña debe tener al menos 8 caracteres');
      }
      if (String(passwordNueva) === String(passwordActual)) {
        throw new Error('La nueva contraseña debe ser diferente a la actual');
      }
      empleados[indice] = { ...empleados[indice], password: String(passwordNueva) };
      setStorage(STORAGE_KEYS.EMPLEADOS, empleados);
      return true;
    },

    // ===== JUSTIFICACIONES DE FALTAS =====
    getJustificaciones() {
      return getStorage(STORAGE_KEYS.JUSTIFICACIONES, [])
        .slice()
        .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || String(b.creadoEn).localeCompare(String(a.creadoEn)));
    },

    crearJustificacion(datos = {}) {
      const empleado = this.getEmpleados().find((emp) => emp.id === datos.empleadoId);
      if (!empleado) throw new Error('El empleado no existe');

      const fecha = String(datos.fecha || '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error('Selecciona una fecha válida');
      const [anio, mes, dia] = fecha.split('-').map(Number);
      if (new Date(anio, mes - 1, dia).getDay() === 0) throw new Error('No se puede justificar un domingo');

      const justificaciones = getStorage(STORAGE_KEYS.JUSTIFICACIONES, []);
      if (justificaciones.some((j) => j.empleadoId === datos.empleadoId && j.fecha === fecha && j.estado === 'aprobada')) {
        throw new Error('Ya existe una justificación aprobada para ese día');
      }

      const asistencia = getStorage(STORAGE_KEYS.ASISTENCIA, []);
      const entrada = asistencia.find((m) =>
        m.empleadoId === datos.empleadoId &&
        m.fecha === fecha &&
        m.tipo === 'entrada' &&
        m.valida !== false
      );
      if (entrada) throw new Error('Ese día ya tiene una entrada válida registrada');

      if (!datos.motivo) throw new Error('Indica el motivo de la justificación');
      if (!datos.archivo?.nombre) throw new Error('Adjunta el sustento de la justificación');

      const numero = justificaciones.reduce((max, j) => {
        const n = parseInt(String(j.id || '').replace(/\D/g, ''), 10) || 0;
        return Math.max(max, n);
      }, 0) + 1;

      const nueva = {
        id: `JUS-${String(numero).padStart(4, '0')}`,
        empleadoId: datos.empleadoId,
        fecha,
        motivo: String(datos.motivo).trim(),
        detalle: String(datos.detalle || '').trim(),
        archivo: {
          nombre: datos.archivo.nombre,
          tipo: datos.archivo.tipo || '',
          tamano: Number(datos.archivo.tamano) || 0,
          placeholder: true
        },
        estado: 'aprobada',
        creadoPor: datos.creadoPor || '',
        creadoEn: ahoraPeruISO()
      };

      justificaciones.unshift(nueva);
      setStorage(STORAGE_KEYS.JUSTIFICACIONES, justificaciones);
      return nueva;
    },

    anularJustificacion(id, usuario = '') {
      const justificaciones = getStorage(STORAGE_KEYS.JUSTIFICACIONES, []);
      const indice = justificaciones.findIndex((j) => j.id === id);
      if (indice === -1) return null;
      justificaciones[indice] = {
        ...justificaciones[indice],
        estado: 'anulada',
        anuladoPor: usuario,
        anuladoEn: ahoraPeruISO()
      };
      setStorage(STORAGE_KEYS.JUSTIFICACIONES, justificaciones);
      return justificaciones[indice];
    },

    getAreas() {
      return [...new Set(this.getEmpleados().map((emp) => emp.area).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
    },
    getConfig() {
      asegurarSeed();
      return getStorage(STORAGE_KEYS.CONFIG, {
        empresa: SIM_CONFIG.empresa,
        periodoSimulacion: SIM_CONFIG.periodo,
        fechaCorte: SIM_CONFIG.fechaCorte,
        jornadaSemanalHoras: SIM_CONFIG.jornadaSemanalHoras,
        tema: 'claro',
        notificaciones: true
      });
    },
    actualizarConfig(cambios = {}) {
      const config = { ...this.getConfig(), ...cambios };
      setStorage(STORAGE_KEYS.CONFIG, config);
      return config;
    },
    getPeriodoSimulacion() {
      const config = this.getConfig();
      return {
        periodo: config.periodoSimulacion || SIM_CONFIG.periodo,
        fechaCorte: config.fechaCorte || SIM_CONFIG.fechaCorte,
        anio: SIM_CONFIG.anio,
        mes: SIM_CONFIG.mes,
        jornadaSemanalHoras: config.jornadaSemanalHoras || SIM_CONFIG.jornadaSemanalHoras
      };
    },

    // ===== AUDITORÍA DE ACCESOS =====
    getAuditoria() { return getStorage(STORAGE_KEYS.AUDITORIA_ACCESOS, []); },
    registrarAuditoria(registro) {
      const auditoria = this.getAuditoria();
      const nuevo = {
        id: generarId('AUD'),
        fecha: fechaHoyPeru(),
        hora: horaPeru(),
        permitido: false,
        motivo: 'sin_permiso',
        origen: 'nfc_real',
        ...registro
      };
      auditoria.unshift(nuevo);
      setStorage(STORAGE_KEYS.AUDITORIA_ACCESOS, auditoria);
      return nuevo;
    },

    // ===== REUNIONES =====
    getReuniones() {
      return getStorage(STORAGE_KEYS.REUNIONES, []).slice().sort((a, b) =>
        String(a.fecha + a.horaInicio).localeCompare(String(b.fecha + b.horaInicio))
      );
    },
    getReunionesParaRol(rol) {
      return this.getReuniones().filter((r) => Array.isArray(r.rolesInvitados) && r.rolesInvitados.includes(rol));
    },
    crearReunion(datos = {}) {
      const reuniones = getStorage(STORAGE_KEYS.REUNIONES, []);
      // Usar el mayor consecutivo existente evita IDs duplicados tras eliminar.
      const numero = reuniones.reduce((max, r) => {
        const n = Number(String(r.id || '').replace(/\D/g, ''));
        return Number.isFinite(n) ? Math.max(max, n) : max;
      }, 0) + 1;
      const nueva = {
        id: `REU-${String(numero).padStart(4, '0')}`,
        titulo: 'Reunión',
        descripcion: '',
        fecha: SIM_CONFIG.fechaCorte,
        horaInicio: '09:00',
        horaFin: '10:00',
        lugar: 'Sala de reuniones',
        creadoPor: '',
        rolesInvitados: ['rrhh', 'jefe', 'dueno'],
        estado: 'programada',
        ...datos
      };
      reuniones.push(nueva);
      setStorage(STORAGE_KEYS.REUNIONES, reuniones);
      return nueva;
    },
    actualizarReunion(id, cambios = {}) {
      const reuniones = this.getReuniones();
      const indice = reuniones.findIndex((r) => r.id === id);
      if (indice === -1) return null;
      reuniones[indice] = { ...reuniones[indice], ...cambios, id };
      setStorage(STORAGE_KEYS.REUNIONES, reuniones);
      return reuniones[indice];
    },
    eliminarReunion(id) {
      const reuniones = this.getReuniones().filter((r) => r.id !== id);
      setStorage(STORAGE_KEYS.REUNIONES, reuniones);
      return true;
    },

    // ===== TICKETS =====
    getTickets() {
      asegurarSeed();
      return getStorage(STORAGE_KEYS.TICKETS, []).slice().sort((a, b) =>
        String(b.fecha).localeCompare(String(a.fecha))
      );
    },
    crearTicket(datos = {}) {
      asegurarSeed();
      const tickets = getStorage(STORAGE_KEYS.TICKETS, []);
      const numero = tickets.length + 1;
      const nuevo = {
        id: `TKT-${String(numero).padStart(4, '0')}`,
        origen: 'login',
        nombre: 'Visitante',
        email: '',
        asunto: 'Soporte',
        mensaje: '',
        fecha: ahoraPeruISO(),
        estado: 'abierto',
        prioridad: 'media',
        ...datos
      };
      tickets.unshift(nuevo);
      setStorage(STORAGE_KEYS.TICKETS, tickets);
      return nuevo;
    },
    actualizarTicket(id, cambios = {}) {
      const tickets = this.getTickets();
      const indice = tickets.findIndex((t) => t.id === id);
      if (indice === -1) return null;
      tickets[indice] = { ...tickets[indice], ...cambios, id };
      setStorage(STORAGE_KEYS.TICKETS, tickets);
      return tickets[indice];
    },

    // ===== TARJETAS NFC =====
    getTarjetas() { return getStorage(STORAGE_KEYS.TARJETAS, []); },
    getTarjetaPorUID(uid) {
      return tarjetaPorUID(uid);
    },
    getZonasPermitidasParaEmpleado(empleadoId) {
      const empleado = this.getEmpleadoPorId(empleadoId);
      if (!empleado) return [];
      return this.getZonas()
        .filter((zona) => empleadoTieneAcceso(empleado, zona))
        .map((zona) => zona.id);
    },
    getTarjetaPorEmpleado(empleadoId) {
      return this.getTarjetas().find((t) => t.empleadoId === empleadoId) || null;
    },
    actualizarTarjeta(id, cambios = {}) {
      const tarjetas = this.getTarjetas();
      const indice = tarjetas.findIndex((t) => t.id === id);
      if (indice === -1) return null;
      tarjetas[indice] = { ...tarjetas[indice], ...cambios, id };
      setStorage(STORAGE_KEYS.TARJETAS, tarjetas);
      return tarjetas[indice];
    },

    // Lista para el modal manual: 7 reales, luego 13 extendidos y 30 simulados.
    getEmpleadosOrdenados() {
      const empleados = this.getEmpleados();
      const grupo = (emp) => {
        if (emp.esReal) return 0;
        const numero = parseInt(String(emp.id || '').replace(/\D/g, ''), 10);
        return Number.isFinite(numero) && numero <= 20 ? 1 : 2;
      };
      return [...empleados].sort((a, b) =>
        (grupo(a) - grupo(b)) || String(a.id).localeCompare(String(b.id))
      );
    },

    // Permiso centralizado: Comedor y Salas Comunes permiten a los 50.
    tieneAcceso(empleado, zona) {
      if (!empleado || !zona) return false;
      return empleadoTieneAcceso(empleado, zona);
    },

    // Stats rápidos. Por defecto usa la fecha de corte de la simulación
    // (30/10/2026), no la fecha real del navegador.
    getStatsHoy(fecha = null) {
      const hoy = fecha || this.getPeriodoSimulacion().fechaCorte;
      const asi = this.getAsistencia().filter(m => m.fecha === hoy);
      const acc = this.getAccesosZonas().filter(m => m.fecha === hoy);
      return {
        fecha: hoy,
        totalMarcaciones: asi.length,
        entradas: asi.filter(m => m.tipo === 'entrada').length,
        salidasAlmuerzo: asi.filter(m => m.tipo === 'almuerzo_salida').length,
        retornosAlmuerzo: asi.filter(m => m.tipo === 'almuerzo_retorno').length,
        salidasFinales: asi.filter(m => m.tipo === 'salida').length,
        totalAccesosZonas: acc.length,
        porArea: [...new Set(asi.map(m => m.area))].reduce((o, a) => {
          o[a] = asi.filter(m => m.area === a).length; return o;
        }, {})
      };
    },

    // Utilidades
    limpiarTodo() {
      Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
      console.log('[NFCReader] Todo limpiado');
    }
  };

  // Auto-seed al cargar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', asegurarSeed);
  } else {
    asegurarSeed();
  }

})();