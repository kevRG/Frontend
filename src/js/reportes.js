import './main.js';
import {
  contextoReporte,
  fechaCortaReporte,
  fechaDeReporte,
  folioReporte,
  iniciarPanel,
  llenarSelect,
  mapasReporte,
  nombreTecnico,
  pillEstadoReporte,
  pillPrioridad,
  responsableReporte,
} from './app.js';
import {
  obtenerAsignaciones,
  obtenerCatalogos,
  obtenerCategoriasProblemas,
  obtenerColonias,
  obtenerReportes,
  obtenerTecnicos,
  obtenerViviendas,
} from './datos.js';
import { puedeEntrar } from './permisos.js';
import { obtenerUsuario } from './sesion.js';
import { escapar, icono, normalizar } from './utils.js';

const resumen = document.querySelector('[data-resumen-texto]');
const lista = document.querySelector('[data-lista]');
const bandeja = document.querySelector('[data-bandeja]');
const vacio = document.querySelector('[data-vacio]');
const conteo = document.querySelector('[data-conteo]');
const filtroTexto = document.querySelector('[data-filtro-texto]');
const filtroCategoria = document.querySelector('[data-filtro-categoria]');
const filtroPrioridad = document.querySelector('[data-filtro-prioridad]');
const filtroEstado = document.querySelector('[data-filtro-estado]');

/* Cada fila ya trae resuelto lo que sale por JOIN (vivienda → colonia, técnico responsable). */
let filas = [];

const fila = ({ reporte: r, categoria, colonia, responsable }) => {
  const folio = folioReporte(r.id_reporte);
  return `
    <tr class="report-table__row" tabindex="0" data-href="/reporte-detalle.html?id=${r.id_reporte}" aria-label="Reporte ${escapar(folio)}">
      <td class="report-table__cell" data-label="Folio / fecha">
        <span class="report-table__primary">${escapar(folio)}</span>
        <span class="report-table__secondary">${escapar(fechaCortaReporte(fechaDeReporte(r)))}</span>
      </td>
      <td class="report-table__cell" data-label="Incidencia"><span class="report-table__primary">${escapar(categoria?.nombre_categoria ?? r.titulo)}</span></td>
      <td class="report-table__cell" data-label="Ubicación">
        <span class="report-table__primary">${escapar(r.ubicacion)}</span>
        <span class="report-table__secondary">${escapar(colonia?.nombre_colonia ?? '')}</span>
      </td>
      <td class="report-table__cell" data-label="Prioridad"><span class="pill pill--${pillPrioridad(r.nivel_prioridad)}">${escapar(r.nivel_prioridad)}</span></td>
      <td class="report-table__cell" data-label="Responsable"><span class="report-table__primary">${escapar(responsable ? nombreTecnico(responsable) : '—')}</span></td>
      <td class="report-table__cell" data-label="Estado"><span class="pill pill--${pillEstadoReporte(r.estado)}">${escapar(r.estado)}</span></td>
      <td class="report-table__cell"><span class="report-table__action">${icono('chevron-right')}</span></td>
    </tr>`;
};

const renderLista = () => {
  const texto = normalizar(filtroTexto.value.trim());
  const visibles = filas.filter(({ reporte: r, busqueda }) => {
    if (texto && !busqueda.includes(texto)) return false;
    if (filtroCategoria.value && r.id_categoria !== Number(filtroCategoria.value)) return false;
    if (filtroPrioridad.value && r.nivel_prioridad !== filtroPrioridad.value) return false;
    return !filtroEstado.value || r.estado === filtroEstado.value;
  });

  lista.innerHTML = visibles.map(fila).join('');
  bandeja.hidden = visibles.length === 0;
  vacio.hidden = visibles.length > 0;
  conteo.textContent = `${visibles.length} de ${filas.length} reportes`;
};

const renderResumen = (reportes) => {
  const activos = reportes.filter((r) => r.estado !== 'Cerrado');
  const sinAsignar = activos.filter((r) => r.estado === 'Sin asignar').length;
  resumen.textContent = `${activos.length} ${activos.length === 1 ? 'incidencia activa' : 'incidencias activas'} · ${sinAsignar} ${
    sinAsignar === 1 ? 'requiere' : 'requieren'
  } asignación inmediata`;
};

const limpiar = () => {
  filtroTexto.value = '';
  filtroCategoria.value = '';
  filtroPrioridad.value = '';
  filtroEstado.value = '';
  renderLista();
  filtroTexto.focus();
};

const abrir = (elemento) => {
  const destino = elemento?.closest('[data-href]');
  if (destino) window.location.href = destino.dataset.href;
};

const iniciar = async () => {
  if (!(await iniciarPanel())) return;

  /* Solo administración y operación levantan reportes desde el panel. */
  document.querySelector('[data-solo-gestion]').hidden = !puedeEntrar('reporte-form', obtenerUsuario()?.role);

  const [reportes, catalogos, categorias, viviendas, colonias, asignaciones, tecnicos] = await Promise.all([
    obtenerReportes(),
    obtenerCatalogos(),
    obtenerCategoriasProblemas(),
    obtenerViviendas(),
    obtenerColonias(),
    obtenerAsignaciones(),
    obtenerTecnicos(),
  ]);

  const mapas = mapasReporte({ viviendas, colonias, categorias, tecnicos });
  filas = reportes
    .sort((a, b) => fechaDeReporte(b) - fechaDeReporte(a))
    .map((reporte) => {
      const { categoria, colonia } = contextoReporte(reporte, mapas);
      const responsable = responsableReporte(reporte.id_reporte, asignaciones, mapas);
      const busqueda = normalizar(
        [folioReporte(reporte.id_reporte), `REP-${reporte.id_reporte}`, reporte.titulo, reporte.ubicacion, colonia?.nombre_colonia]
          .filter(Boolean)
          .join(' '),
      );
      return { reporte, categoria, colonia, responsable, busqueda };
    });

  llenarSelect(filtroCategoria, categorias.map((c) => ({ texto: c.nombre_categoria, valor: c.id_categoria })), 'Categoría');
  llenarSelect(filtroPrioridad, catalogos.prioridades.map((p) => ({ texto: p, valor: p })), 'Prioridad');
  llenarSelect(filtroEstado, catalogos.estados_reporte.map((e) => ({ texto: e, valor: e })), 'Estado');

  renderResumen(reportes);
  renderLista();

  filtroTexto.addEventListener('input', renderLista);
  [filtroCategoria, filtroPrioridad, filtroEstado].forEach((s) => s.addEventListener('change', renderLista));
  document.querySelectorAll('[data-limpiar]').forEach((b) => b.addEventListener('click', limpiar));
  lista.addEventListener('click', (e) => abrir(e.target));
  lista.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') abrir(e.target);
  });
};

iniciar().catch(() => {
  resumen.textContent = 'No pudimos cargar los reportes. Recarga la página.';
});
