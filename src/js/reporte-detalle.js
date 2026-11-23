import './main.js';
import {
  conCarga,
  contextoReporte,
  direccionVivienda,
  fechaCortaReporte,
  fechaDeReporte,
  folioReporte,
  formatoFechaHora,
  iniciarPanel,
  leerIdDeUrl,
  llenarSelect,
  mapasReporte,
  mostrarNoEncontrado,
  nombreTecnico,
  pillEstadoReporte,
  pillPrioridad,
  setBreadcrumb,
} from './app.js';
import {
  actualizarAtencionReporte,
  crearAsignacion,
  obtenerAsignaciones,
  obtenerCatalogos,
  obtenerCategoriasProblemas,
  obtenerCiudadanos,
  obtenerColonias,
  obtenerEvidencias,
  obtenerReporte,
  obtenerTecnicos,
  obtenerTuberia,
  obtenerUsuarios,
  obtenerViviendas,
} from './datos.js';
import { puedeEntrar } from './permisos.js';
import { obtenerUsuario } from './sesion.js';
import { aFecha, escapar, icono } from './utils.js';

const contenedor = document.querySelector('[data-detalle]');

const PILL_ASIGNACION = { Concluida: 'success', 'En sitio': 'warning', 'En camino': 'warning', Programada: 'neutral' };

const fechaCorta = (valor) => (valor ? formatoFechaHora.format(aFecha(valor)) : '—');
const fila = (termino, valor) =>
  `<div class="info-list__row"><dt class="info-list__term">${escapar(termino)}</dt><dd class="info-list__value">${valor}</dd></div>`;

const filasAsignaciones = (asignaciones, mapas) => {
  if (!asignaciones.length) {
    return '<tr><td class="data-table__empty" colspan="4">Todavía no se asigna ningún técnico.</td></tr>';
  }
  return asignaciones
    .map((a) => {
      const tecnico = mapas.tecnico.get(a.id_tecnico);
      return `
      <tr>
        <td class="data-table__td">
          ${tecnico ? `<a class="card__link" href="/tecnico-detalle.html?id=${tecnico.id_tecnico}">${escapar(nombreTecnico(tecnico))}</a>` : '—'}
          <span class="data-table__secondary">Asignado: ${escapar(fechaCorta(a.fecha_asignacion))}</span>
        </td>
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

const galeria = (evidencias) =>
  evidencias.length
    ? `<div class="evidence-grid">${evidencias
        .map(
          (e) => `
        <figure class="evidence-grid__item">
          <a href="${escapar(e.url_fotografia)}" target="_blank" rel="noopener">
            <img class="evidence-grid__img" src="${escapar(e.url_fotografia)}" alt="${escapar(e.descripcion ?? 'Evidencia del reporte')}" loading="lazy" />
          </a>
          <figcaption class="evidence-grid__caption">${escapar(e.descripcion ?? fechaCorta(e.fecha_carga))}</figcaption>
        </figure>`,
        )
        .join('')}</div>`
    : '<p class="evidence-grid__empty">Este reporte no tiene fotografías.</p>';

const formAsignar = (reporte) =>
  reporte.estado === 'Cerrado'
    ? '<p class="evidence-grid__empty report-detail__body">El reporte está cerrado; ya no admite asignaciones.</p>'
    : `
    <form class="report-detail__form report-detail__form--assign" novalidate data-form-asignar>
      <div class="field">
        <label class="field__label" for="id_tecnico">Técnico *</label>
        <select class="field__input" id="id_tecnico" name="id_tecnico" required></select>
        <p class="field__error" id="id_tecnico-error"></p>
      </div>
      <div class="field">
        <label class="field__label" for="observaciones">Observaciones</label>
        <input class="field__input" id="observaciones" name="observaciones" maxlength="255" placeholder="Indicaciones para la cuadrilla" />
        <p class="field__error" id="observaciones-error"></p>
      </div>
      <div class="report-detail__form-actions">
        <p class="report-detail__note" role="status" data-nota-asignar></p>
        <button class="button" type="submit">Asignar técnico</button>
      </div>
    </form>`;

const render = ({ reporte: r, contexto, tuberia, asignaciones, evidencias, mapas, catalogos, puedeGestionar }) => {
  const { vivienda, colonia, ciudadano, usuario, categoria } = contexto;
  const folio = folioReporte(r.id_reporte);
  const nombreCiudadano = ciudadano
    ? [ciudadano.nombre, ciudadano.apellido_paterno, ciudadano.apellido_materno].filter(Boolean).join(' ')
    : '—';

  contenedor.innerHTML = `
    <header class="page-header">
      <div>
        <p class="eyebrow">Reporte · ${escapar(folio)} · ${escapar(fechaCortaReporte(fechaDeReporte(r)))}</p>
        <h1 class="page-header__title">${escapar(r.titulo)}</h1>
        <div class="detail-header__badges">
          <span class="pill pill--info">${escapar(categoria?.nombre_categoria ?? 'Sin categoría')}</span>
          <span class="pill pill--${pillPrioridad(r.nivel_prioridad)}">Prioridad ${escapar(r.nivel_prioridad)}</span>
          <span class="pill pill--${pillEstadoReporte(r.estado)}">${escapar(r.estado)}</span>
        </div>
      </div>
      ${
        puedeGestionar
          ? `<div class="page-header__actions"><a class="button" href="/reporte-form.html?id=${r.id_reporte}">${icono('pencil', 'icon icon--sm')}<span>Editar reporte</span></a></div>`
          : ''
      }
    </header>

    <div class="detail-grid">
      <div class="detail-stack">
        <section class="card" aria-labelledby="descripcion-titulo">
          <header class="card__header">
            <div>
              <p class="eyebrow">Lo que se reportó</p>
              <h2 class="card__title" id="descripcion-titulo">Descripción y evidencias</h2>
            </div>
          </header>
          <div class="report-detail__body">
            <p class="report-detail__description">${escapar(r.descripcion)}</p>
            ${galeria(evidencias)}
          </div>
        </section>

        <section class="card" aria-labelledby="atencion-titulo">
          <header class="card__header">
            <div>
              <p class="eyebrow">Atención</p>
              <h2 class="card__title" id="atencion-titulo">Técnicos asignados</h2>
            </div>
          </header>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="data-table__th" scope="col">Técnico</th>
                  <th class="data-table__th" scope="col">Inicio / término</th>
                  <th class="data-table__th" scope="col">Estado</th>
                  <th class="data-table__th" scope="col">Resultado</th>
                </tr>
              </thead>
              <tbody>${filasAsignaciones(asignaciones, mapas)}</tbody>
            </table>
          </div>
          ${puedeGestionar ? formAsignar(r) : ''}
        </section>
      </div>

      <div class="detail-stack">
        <section class="card" aria-labelledby="seguimiento-titulo">
          <header class="card__header">
            <div>
              <p class="eyebrow">Seguimiento</p>
              <h2 class="card__title" id="seguimiento-titulo">Estado y prioridad</h2>
            </div>
          </header>
          <form class="report-detail__form report-detail__form--plain" novalidate data-form-atencion>
            <div class="field field--wide">
              <label class="field__label" for="estado">Estado</label>
              <select class="field__input" id="estado" name="estado"></select>
            </div>
            <div class="field field--wide">
              <label class="field__label" for="nivel_prioridad">Prioridad</label>
              <select class="field__input" id="nivel_prioridad" name="nivel_prioridad"></select>
            </div>
            <div class="report-detail__form-actions">
              <p class="report-detail__note" role="status" data-nota-atencion></p>
              <button class="button" type="submit">Guardar</button>
            </div>
          </form>
        </section>

        <section class="card" aria-labelledby="datos-titulo">
          <header class="card__header">
            <div>
              <p class="eyebrow">Datos del reporte</p>
              <h2 class="card__title" id="datos-titulo">Incidencia</h2>
            </div>
          </header>
          <dl class="info-list">
            ${fila('Folio', escapar(folio))}
            ${fila('Categoría', escapar(categoria ? `${categoria.nombre_categoria} · gravedad ${categoria.nivel_gravedad.toLowerCase()}` : '—'))}
            ${fila('Fecha y hora', escapar(`${r.fecha_reporte} · ${r.hora_reporte.slice(0, 5)}`))}
            ${fila('Ubicación', escapar(r.ubicacion))}
            ${fila('Colonia', escapar(colonia?.nombre_colonia ?? '—'))}
            ${fila('Tubería', escapar(tuberia ? `${tuberia.codigo_tuberia} · ${tuberia.estado}` : 'No relacionada'))}
          </dl>
        </section>

        <section class="card" aria-labelledby="vivienda-titulo">
          <header class="card__header">
            <div>
              <p class="eyebrow">Se reporta desde</p>
              <h2 class="card__title" id="vivienda-titulo">Vivienda y ciudadano</h2>
            </div>
          </header>
          <dl class="info-list">
            ${fila('Vivienda', escapar(direccionVivienda(vivienda) || '—'))}
            ${fila('Tipo', escapar(vivienda ? `${vivienda.tipo_vivienda} · ${vivienda.numero_habitantes} habitantes` : '—'))}
            ${fila('Ciudadano', escapar(nombreCiudadano))}
            ${fila('Teléfono', escapar(usuario?.telefono ?? '—'))}
            ${fila('Correo', escapar(usuario?.correo ?? '—'))}
          </dl>
        </section>
      </div>
    </div>`;

  /* Seguimiento: el estado y la prioridad los puede cambiar todo el personal. */
  const atencion = contenedor.querySelector('[data-form-atencion]');
  llenarSelect(atencion.elements.estado, catalogos.estados_reporte.map((e) => ({ texto: e, valor: e })));
  llenarSelect(atencion.elements.nivel_prioridad, catalogos.prioridades.map((p) => ({ texto: p, valor: p })));
  atencion.elements.estado.value = r.estado;
  atencion.elements.nivel_prioridad.value = r.nivel_prioridad;
};

const nota = (elemento, texto, ok) => {
  elemento.textContent = texto;
  elemento.className = `report-detail__note report-detail__note--${ok ? 'ok' : 'error'}`;
};

const iniciar = async () => {
  if (!(await iniciarPanel())) return;

  const id = leerIdDeUrl();
  const reporte = id ? await obtenerReporte(id) : null;
  if (!reporte) {
    setBreadcrumb('No localizado');
    mostrarNoEncontrado(contenedor, {
      titulo: 'Reporte no localizado',
      texto: 'El reporte que buscas no existe o el enlace es incorrecto.',
      href: '/reportes.html',
      enlace: 'Ver todos los reportes',
    });
    return;
  }

  const [catalogos, categorias, viviendas, colonias, ciudadanos, usuarios, tecnicos, todas, evidencias, tuberia] =
    await Promise.all([
      obtenerCatalogos(),
      obtenerCategoriasProblemas(),
      obtenerViviendas(),
      obtenerColonias(),
      obtenerCiudadanos(),
      obtenerUsuarios(),
      obtenerTecnicos(),
      obtenerAsignaciones(),
      obtenerEvidencias(reporte.id_reporte),
      reporte.id_tuberia ? obtenerTuberia(reporte.id_tuberia) : null,
    ]);

  const mapas = mapasReporte({ viviendas, colonias, ciudadanos, usuarios, categorias, tecnicos });
  const asignaciones = todas
    .filter((a) => a.id_reporte === reporte.id_reporte)
    .sort((a, b) => aFecha(b.fecha_asignacion) - aFecha(a.fecha_asignacion));
  const puedeGestionar = puedeEntrar('reporte-form', obtenerUsuario()?.role);

  const folio = folioReporte(reporte.id_reporte);
  setBreadcrumb(folio);
  document.title = `${folio} ${reporte.titulo} · AguaAlerta`;
  render({ reporte, contexto: contextoReporte(reporte, mapas), tuberia, asignaciones, evidencias, mapas, catalogos, puedeGestionar });
  contenedor.removeAttribute('aria-busy');

  const atencion = contenedor.querySelector('[data-form-atencion]');
  atencion.addEventListener('submit', async (event) => {
    event.preventDefault();
    const datos = Object.fromEntries(new FormData(atencion));
    try {
      await conCarga(atencion.querySelector('[type=submit]'), 'Guardando…', () => actualizarAtencionReporte(reporte.id_reporte, datos));
      window.location.reload();
    } catch (error) {
      nota(atencion.querySelector('[data-nota-atencion]'), error.message, false);
    }
  });

  const asignar = contenedor.querySelector('[data-form-asignar]');
  if (!asignar) return;
  llenarSelect(
    asignar.elements.id_tecnico,
    tecnicos
      .filter((t) => t.disponibilidad !== 'Fuera de turno')
      .map((t) => ({ texto: `${nombreTecnico(t)} · ${t.especialidad}`, valor: t.id_tecnico })),
    'Seleccionar técnico',
  );
  asignar.addEventListener('submit', async (event) => {
    event.preventDefault();
    const select = asignar.elements.id_tecnico;
    const error = document.getElementById('id_tecnico-error');
    error.textContent = select.value ? '' : 'Selecciona el técnico que atenderá el reporte.';
    select.classList.toggle('field__input--invalid', !select.value);
    if (!select.value) {
      select.focus();
      return;
    }
    try {
      await conCarga(asignar.querySelector('[type=submit]'), 'Asignando…', () =>
        crearAsignacion(reporte.id_reporte, Object.fromEntries(new FormData(asignar))),
      );
      window.location.reload();
    } catch (e) {
      nota(asignar.querySelector('[data-nota-asignar]'), e.message, false);
    }
  });
};

iniciar().catch(() => {
  contenedor.innerHTML = '<p class="empty-state__text">No pudimos cargar el reporte. Recarga la página.</p>';
});
