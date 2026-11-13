import {
  avatarVariante,
  disponibilidadTecnico,
  formatoDuracion,
  formatoFecha,
  formatoFechaHora,
  iniciales,
  iniciarPanel,
  leerIdDeUrl,
  mostrarNoEncontrado,
  rendimientoTecnico,
  setBreadcrumb,
} from './app.js';
import { obtenerAsignaciones, obtenerReportes, obtenerTecnico, obtenerUsuario } from './datos.js';
import { aFecha, escapar, icono } from './utils.js';

const contenedor = document.querySelector('[data-detalle]');

const PILL_ASIGNACION = {
  Concluida: 'success',
  'En sitio': 'warning',
  'En camino': 'warning',
  Programada: 'neutral',
};

const fechaCorta = (valor) => (valor ? formatoFechaHora.format(aFecha(valor)) : '—');

/** Promedio en minutos entre dos campos de fecha de las asignaciones que los tienen. */
const promedioMinutos = (asignaciones, desde, hasta) => {
  const duraciones = asignaciones
    .filter((a) => a[desde] && a[hasta])
    .map((a) => (aFecha(a[hasta]) - aFecha(a[desde])) / 60_000);
  return duraciones.length ? duraciones.reduce((x, y) => x + y, 0) / duraciones.length : null;
};

const filasAsignaciones = (asignaciones, reportePorId) => {
  if (!asignaciones.length) {
    return '<tr><td class="data-table__empty" colspan="5">Este técnico todavía no tiene asignaciones.</td></tr>';
  }
  return asignaciones
    .map((a) => {
      const reporte = reportePorId.get(a.id_reporte);
      return `
      <tr>
        <td class="data-table__td">
          <b>#REP-${a.id_reporte}</b>
          <span class="data-table__secondary">${escapar(reporte?.titulo ?? 'Reporte sin datos')}</span>
        </td>
        <td class="data-table__td">${escapar(fechaCorta(a.fecha_asignacion))}</td>
        <td class="data-table__td">
          ${escapar(fechaCorta(a.fecha_inicio))}
          <span class="data-table__secondary">Término: ${escapar(fechaCorta(a.fecha_termino))}</span>
        </td>
        <td class="data-table__td"><span class="pill pill--${PILL_ASIGNACION[a.estado] ?? 'neutral'}">${escapar(a.estado)}</span></td>
        <td class="data-table__td">
          ${escapar(a.resultado_atencion ?? '—')}
          <span class="data-table__secondary">${escapar(a.observaciones ?? '')}</span>
        </td>
      </tr>`;
    })
    .join('');
};

const render = ({ tecnico: t, usuario, asignaciones, todas, reportes }) => {
  const nombre = `${t.nombre} ${t.apellidos}`;
  const estado = disponibilidadTecnico(t, todas);
  const { total, concluidas, efectividad } = rendimientoTecnico(t.id_tecnico, todas);
  const respuesta = promedioMinutos(asignaciones, 'fecha_asignacion', 'fecha_inicio');
  const resolucion = promedioMinutos(asignaciones, 'fecha_asignacion', 'fecha_termino');
  const reportePorId = new Map(reportes.map((r) => [r.id_reporte, r]));

  contenedor.innerHTML = `
    <header class="page-header">
      <div class="detail-header">
        <span class="avatar avatar--xl ${avatarVariante(t.id_tecnico)}" aria-hidden="true">${escapar(iniciales(nombre))}</span>
        <div>
          <p class="eyebrow">Técnico · TEC-${String(t.id_tecnico).padStart(3, '0')}</p>
          <h1 class="page-header__title">${escapar(nombre)}</h1>
          <div class="detail-header__badges">
            <span class="pill pill--info">${escapar(t.especialidad)}</span>
            <span class="pill pill--${estado.pill}">${escapar(estado.texto)}</span>
          </div>
        </div>
      </div>
      <div class="page-header__actions">
        <a class="button" href="/tecnico-form.html?id=${t.id_tecnico}">${icono('pencil', 'icon icon--sm')}<span>Editar técnico</span></a>
      </div>
    </header>

    <section class="card card--spaced" aria-labelledby="rendimiento-titulo">
      <header class="card__header">
        <div>
          <p class="eyebrow">Indicadores de rendimiento</p>
          <h2 class="card__title" id="rendimiento-titulo">${concluidas} de ${total} asignaciones concluidas</h2>
        </div>
      </header>
      <div class="stat-tiles">
        <div class="stat-tile"><span class="stat-tile__label">Tiempo promedio de respuesta</span><span class="stat-tile__value">${respuesta === null ? '—' : formatoDuracion(respuesta)}</span></div>
        <div class="stat-tile"><span class="stat-tile__label">Tiempo promedio de resolución</span><span class="stat-tile__value">${resolucion === null ? '—' : formatoDuracion(resolucion)}</span></div>
        <div class="stat-tile"><span class="stat-tile__label">Efectividad</span><span class="stat-tile__value">${efectividad === null ? '—' : `${efectividad}%`}</span></div>
      </div>
    </section>

    <div class="detail-grid">
      <section class="card" aria-labelledby="asignaciones-titulo">
        <header class="card__header">
          <div>
            <p class="eyebrow">Historial</p>
            <h2 class="card__title" id="asignaciones-titulo">Asignaciones atendidas</h2>
          </div>
        </header>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th class="data-table__th" scope="col">Reporte</th>
                <th class="data-table__th" scope="col">Asignación</th>
                <th class="data-table__th" scope="col">Inicio / término</th>
                <th class="data-table__th" scope="col">Estado</th>
                <th class="data-table__th" scope="col">Resultado</th>
              </tr>
            </thead>
            <tbody>${filasAsignaciones(asignaciones, reportePorId)}</tbody>
          </table>
        </div>
      </section>

      <section class="card" aria-labelledby="datos-titulo">
        <header class="card__header">
          <div>
            <p class="eyebrow">Datos generales</p>
            <h2 class="card__title" id="datos-titulo">Contacto y contrato</h2>
          </div>
        </header>
        <dl class="info-list">
          <div class="info-list__row"><dt class="info-list__term">Teléfono</dt><dd class="info-list__value">${escapar(t.telefono ?? '—')}</dd></div>
          <div class="info-list__row"><dt class="info-list__term">Correo</dt><dd class="info-list__value">${escapar(t.correo)}</dd></div>
          <div class="info-list__row"><dt class="info-list__term">Contratación</dt><dd class="info-list__value">${escapar(formatoFecha.format(aFecha(t.fecha_contratacion)))}</dd></div>
          <div class="info-list__row"><dt class="info-list__term">Disponibilidad</dt><dd class="info-list__value">${escapar(t.disponibilidad)}</dd></div>
          <div class="info-list__row"><dt class="info-list__term">Cuenta de usuario</dt><dd class="info-list__value">${
            usuario
              ? `<a class="card__link" href="/usuario-detalle.html?id=${usuario.id_usuario}">${escapar(usuario.nombre_usuario)}</a>`
              : '—'
          }</dd></div>
        </dl>
      </section>
    </div>`;
};

const iniciar = async () => {
  if (!(await iniciarPanel())) return;

  const id = leerIdDeUrl();
  const tecnico = id ? await obtenerTecnico(id) : null;
  if (!tecnico) {
    setBreadcrumb('No localizado');
    mostrarNoEncontrado(contenedor, {
      titulo: 'Técnico no localizado',
      texto: 'El técnico que buscas no existe o el enlace es incorrecto.',
      href: '/tecnicos.html',
      enlace: 'Ver todos los técnicos',
    });
    return;
  }

  const [usuario, todas, reportes] = await Promise.all([
    obtenerUsuario(tecnico.id_usuario),
    obtenerAsignaciones(),
    obtenerReportes(),
  ]);
  const asignaciones = todas
    .filter((a) => a.id_tecnico === tecnico.id_tecnico)
    .sort((a, b) => aFecha(b.fecha_asignacion) - aFecha(a.fecha_asignacion));

  const nombre = `${tecnico.nombre} ${tecnico.apellidos}`;
  setBreadcrumb(nombre);
  document.title = `${nombre} · AguaAlerta`;
  render({ tecnico, usuario, asignaciones, todas, reportes });
  contenedor.removeAttribute('aria-busy');
};

iniciar().catch(() => {
  contenedor.innerHTML = '<p class="empty-state__text">No pudimos cargar al técnico. Recarga la página.</p>';
});
