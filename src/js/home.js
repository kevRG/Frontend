import { formatoLitros, iniciarPanel, nivelDeposito } from './app.js';
import {
  obtenerAsignaciones,
  obtenerCategoriasProblemas,
  obtenerColonias,
  obtenerDepositos,
  obtenerMediciones,
  obtenerReportes,
  obtenerSensores,
  obtenerViviendas,
} from './datos.js';
import { UMBRAL_CRITICO, aFecha, escapar, haceCuanto, icono, mismoDia, porcentajeLlenado, variacion } from './utils.js';

/* --------------------------------------------------------------------------
   Configuración de la vista
   -------------------------------------------------------------------------- */
const TANQUES_VISIBLES = 4;
const REPORTES_VISIBLES = 3;
const ESTADOS_ACTIVOS_ASIGNACION = ['Programada', 'En camino', 'En sitio'];

const PRIORIDADES = {
  Crítica: { orden: 0, modificador: 'danger' },
  Alta: { orden: 1, modificador: 'warning' },
  Media: { orden: 2, modificador: 'neutral' },
  Baja: { orden: 3, modificador: 'neutral' },
};

const ESTADOS_REPORTE = {
  'Sin asignar': 'danger',
  'En proceso': 'success',
  Diagnóstico: 'warning',
  Programado: 'warning',
  Cerrado: 'neutral',
};

/* Proyección de latitud/longitud al área del mapa (1000 × 440 unidades = 100 % × 100 %). */
const MAPA = { lonMin: -99.3, lonMax: -99.2, latMax: 18.97, latMin: 18.926, ancho: 1000, alto: 440 };
/* Los depósitos se dibujan junto al punto de su colonia para no encimarse con las incidencias. */
const DESFASE_DEPOSITO = { x: -140, y: 112 };

const formatoDia = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });

/* --------------------------------------------------------------------------
   Utilidades de la vista
   -------------------------------------------------------------------------- */
const proyectar = ({ latitud, longitud }) => ({
  x: Math.round(((longitud - MAPA.lonMin) / (MAPA.lonMax - MAPA.lonMin)) * MAPA.ancho),
  y: Math.round(((MAPA.latMax - latitud) / (MAPA.latMax - MAPA.latMin)) * MAPA.alto),
});

const fechaReporte = (reporte) => aFecha(reporte.fecha_reporte, reporte.hora_reporte);

const formatoFechaCorta = (fecha) => {
  const hora = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  if (mismoDia(fecha)) return `Hoy, ${hora}`;
  if (mismoDia(fecha, ayer)) return `Ayer, ${hora}`;
  return `${formatoDia.format(fecha)}, ${hora}`;
};

const formatoDuracion = (minutos) => `${Math.floor(minutos / 60)}h ${String(Math.round(minutos % 60)).padStart(2, '0')}m`;

const promedioCierre = (asignaciones, desdeDias, hastaDias) => {
  const ahora = Date.now();
  const duraciones = asignaciones
    .filter((a) => a.estado === 'Concluida' && a.fecha_termino)
    .filter((a) => {
      const dias = (ahora - aFecha(a.fecha_termino)) / 86_400_000;
      return dias >= desdeDias && dias < hastaDias;
    })
    .map((a) => (aFecha(a.fecha_termino) - aFecha(a.fecha_asignacion)) / 60_000);
  return duraciones.length ? duraciones.reduce((x, y) => x + y, 0) / duraciones.length : 0;
};

const saludo = () => {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

/* --------------------------------------------------------------------------
   Render: saludo y KPIs
   -------------------------------------------------------------------------- */
const kpi = ({ icon, modificador, pill, pillModificador, valor, etiqueta }) => `
  <li class="kpi">
    <div class="kpi__top">
      <span class="kpi__icon kpi__icon--${modificador}">${icono(icon)}</span>
      <span class="pill pill--${pillModificador}">${escapar(pill)}</span>
    </div>
    <span class="kpi__value">${escapar(valor)}</span>
    <span class="kpi__label">${escapar(etiqueta)}</span>
  </li>`;

const renderKpis = ({ depositosCriticos, reportesActivos, asignaciones }) => {
  const reportesHoy = reportesActivos.filter((r) => mismoDia(fechaReporte(r))).length;
  const despachadas = asignaciones.filter((a) => ESTADOS_ACTIVOS_ASIGNACION.includes(a.estado));
  const enSitio = despachadas.filter((a) => a.estado === 'En sitio').length;
  const cierreActual = promedioCierre(asignaciones, 0, 30);
  const cierreAnterior = promedioCierre(asignaciones, 30, 60);

  document.querySelector('[data-kpis]').innerHTML = [
    kpi({
      icon: 'alert-triangle',
      modificador: 'danger',
      pill: depositosCriticos.length ? 'Requiere acción' : 'Sin alertas',
      pillModificador: depositosCriticos.length ? 'danger' : 'success',
      valor: depositosCriticos.length,
      etiqueta: 'Depósitos en nivel crítico',
    }),
    kpi({
      icon: 'file-text',
      modificador: 'warning',
      pill: `+${reportesHoy} hoy`,
      pillModificador: 'warning',
      valor: reportesActivos.length,
      etiqueta: 'Reportes activos',
    }),
    kpi({
      icon: 'user-check',
      modificador: 'teal',
      pill: `${enSitio} en sitio`,
      pillModificador: 'neutral',
      valor: despachadas.length,
      etiqueta: 'Cuadrillas despachadas',
    }),
    kpi({
      icon: 'clock',
      modificador: 'brand',
      pill: `${variacion(cierreActual, cierreAnterior, 0)} vs. mes`,
      pillModificador: 'neutral',
      valor: formatoDuracion(cierreActual),
      etiqueta: 'Tiempo promedio de cierre',
    }),
  ].join('');
};

/* --------------------------------------------------------------------------
   Render: mapa
   -------------------------------------------------------------------------- */
const marcador = ({ tipo, x, y, titulo }) => {
  const icon = tipo === 'incident' ? 'alert-triangle' : 'database';
  const left = ((x / MAPA.ancho) * 100).toFixed(1);
  const top = ((y / MAPA.alto) * 100).toFixed(1);
  return `
    <span class="network-map__pin network-map__pin--${tipo}" style="left: ${left}%; top: ${top}%" title="${escapar(titulo)}">
      ${icono(icon)}
    </span>`;
};

const renderMapa = ({ incidencias, depositosCriticos, colonias, coloniaDeReporte }) => {
  const coloniaPorId = new Map(colonias.map((c) => [c.id_colonia, c]));

  const marcadoresIncidencias = incidencias
    .map((r) => ({ reporte: r, colonia: coloniaDeReporte(r) }))
    .filter(({ colonia }) => colonia)
    .map(({ reporte, colonia }) => ({
      tipo: 'incident',
      ...proyectar(colonia),
      titulo: `#REP-${reporte.id_reporte} · ${reporte.titulo} · ${colonia.nombre_colonia}`,
    }));

  const marcadoresDepositos = depositosCriticos
    .filter((d) => coloniaPorId.has(d.id_colonia))
    .map((d) => {
      const punto = proyectar(coloniaPorId.get(d.id_colonia));
      return {
        tipo: 'deposit',
        x: punto.x + DESFASE_DEPOSITO.x,
        y: punto.y + DESFASE_DEPOSITO.y,
        titulo: `${d.nombre_deposito} · ${porcentajeLlenado(d)}%`,
      };
    });

  document.querySelector('[data-marcadores]').innerHTML = [...marcadoresIncidencias, ...marcadoresDepositos]
    .map(marcador)
    .join('');

  document
    .querySelector('[data-mapa]')
    .setAttribute(
      'aria-label',
      `Mapa con ${marcadoresIncidencias.length} incidencias críticas y ${marcadoresDepositos.length} depósitos en nivel crítico sobre la red troncal`,
    );
};

/* --------------------------------------------------------------------------
   Render: telemetría
   -------------------------------------------------------------------------- */
const renderTanques = ({ depositos, sensores, mediciones }) => {
  const ultimaLectura = (idDeposito) => {
    const idsSensor = sensores.filter((s) => s.id_deposito === idDeposito).map((s) => s.id_sensor);
    const fechas = mediciones.filter((m) => idsSensor.includes(m.id_sensor)).map((m) => aFecha(m.fecha_hora));
    return fechas.length ? haceCuanto(new Date(Math.max(...fechas))) : 'sin lectura';
  };

  document.querySelector('[data-tanks]').innerHTML = depositos
    .slice(0, TANQUES_VISIBLES)
    .map((d) => {
      const nivel = porcentajeLlenado(d);
      return `
      <li>
        <a class="tank" href="/deposito-detalle.html?id=${d.id_deposito}">
        <span class="tank__gauge" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${nivel}" aria-label="Nivel de ${escapar(d.nombre_deposito)}">
          <span class="tank__fill tank__fill--${nivelDeposito(nivel).clave}" style="--level: ${nivel}%"></span>
        </span>
        <div class="tank__info">
          <span class="tank__name">${escapar(d.nombre_deposito)}</span>
          <span class="tank__reading">${icono('radio', 'icon icon--xs')} Lectura ${escapar(ultimaLectura(d.id_deposito))}</span>
        </div>
        <div class="tank__data">
          <span class="tank__percent">${nivel}%</span>
          <span class="tank__liters">${formatoLitros.format(d.nivel_actual_litros)} L</span>
        </div>
        </a>
      </li>`;
    })
    .join('');
};

/* --------------------------------------------------------------------------
   Render: reportes
   -------------------------------------------------------------------------- */
const renderReportes = ({ reportesActivos, categorias, coloniaDeReporte }) => {
  const categoriaPorId = new Map(categorias.map((c) => [c.id_categoria, c]));

  const visibles = [...reportesActivos]
    .sort(
      (a, b) =>
        (PRIORIDADES[a.nivel_prioridad]?.orden ?? 9) - (PRIORIDADES[b.nivel_prioridad]?.orden ?? 9) ||
        fechaReporte(b) - fechaReporte(a),
    )
    .slice(0, REPORTES_VISIBLES);

  const cuerpo = document.querySelector('[data-reports]');
  if (!visibles.length) {
    cuerpo.innerHTML = `<tr><td class="report-table__empty" colspan="6">No hay reportes pendientes.</td></tr>`;
    return;
  }

  cuerpo.innerHTML = visibles
    .map((r) => {
      const folio = `#REP-${r.id_reporte}`;
      const prioridad = PRIORIDADES[r.nivel_prioridad]?.modificador ?? 'neutral';
      const estado = ESTADOS_REPORTE[r.estado] ?? 'neutral';
      const categoria = categoriaPorId.get(r.id_categoria)?.nombre_categoria ?? r.titulo;
      const colonia = coloniaDeReporte(r)?.nombre_colonia ?? '';
      return `
      <tr class="report-table__row" tabindex="0" aria-label="Reporte ${escapar(folio)}">
        <td class="report-table__cell" data-label="Folio / fecha">
          <span class="report-table__primary">${escapar(folio)}</span>
          <span class="report-table__secondary">${escapar(formatoFechaCorta(fechaReporte(r)))}</span>
        </td>
        <td class="report-table__cell" data-label="Incidencia"><span class="report-table__primary">${escapar(categoria)}</span></td>
        <td class="report-table__cell" data-label="Ubicación">
          <span class="report-table__primary">${escapar(r.ubicacion)}</span>
          <span class="report-table__secondary">${escapar(colonia)}</span>
        </td>
        <td class="report-table__cell" data-label="Prioridad"><span class="pill pill--${prioridad}">${escapar(r.nivel_prioridad)}</span></td>
        <td class="report-table__cell" data-label="Estado"><span class="pill pill--${estado}">${escapar(r.estado)}</span></td>
        <td class="report-table__cell"><span class="report-table__action">${icono('chevron-right')}</span></td>
      </tr>`;
    })
    .join('');
};

/* --------------------------------------------------------------------------
   Carga del dashboard
   -------------------------------------------------------------------------- */
const cargarDashboard = async () => {
  const [depositos, sensores, mediciones, reportes, categorias, viviendas, colonias, asignaciones] = await Promise.all([
    obtenerDepositos(),
    obtenerSensores(),
    obtenerMediciones(),
    obtenerReportes(),
    obtenerCategoriasProblemas(),
    obtenerViviendas(),
    obtenerColonias(),
    obtenerAsignaciones(),
  ]);

  const viviendaPorId = new Map(viviendas.map((v) => [v.id_vivienda, v]));
  const coloniaPorId = new Map(colonias.map((c) => [c.id_colonia, c]));
  const coloniaDeReporte = (r) => coloniaPorId.get(viviendaPorId.get(r.id_vivienda)?.id_colonia);

  const depositosCriticos = depositos.filter((d) => porcentajeLlenado(d) < UMBRAL_CRITICO);
  const reportesActivos = reportes.filter((r) => r.estado !== 'Cerrado');
  const incidencias = reportesActivos.filter((r) => ['Crítica', 'Alta'].includes(r.nivel_prioridad));

  renderKpis({ depositosCriticos, reportesActivos, asignaciones });
  renderMapa({ incidencias, depositosCriticos, colonias, coloniaDeReporte });
  renderTanques({ depositos, sensores, mediciones });
  renderReportes({ reportesActivos, categorias, coloniaDeReporte });
};

const iniciar = async () => {
  const usuario = await iniciarPanel();
  if (!usuario) return;
  document.querySelector('[data-saludo]').textContent = `${saludo()}, ${usuario.nombre_usuario.split(' ')[0]}`;
  await cargarDashboard();
};

iniciar().catch(() => {
  document.querySelector('[data-reports]').innerHTML =
    `<tr><td class="report-table__empty" colspan="6">No pudimos cargar la información. Recarga la página.</td></tr>`;
});
