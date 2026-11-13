import {
  avatarVariante,
  formatoFecha,
  formatoFechaHora,
  formatoLitros,
  iniciales,
  iniciarPanel,
  leerIdDeUrl,
  mostrarNoEncontrado,
  pillRol,
  rolesPorUsuario,
  setBreadcrumb,
} from './app.js';
import {
  cambiarEstadoUsuario,
  obtenerAbastecimientos,
  obtenerAsignaciones,
  obtenerDepositos,
  obtenerNotificaciones,
  obtenerRoles,
  obtenerTecnicos,
  obtenerUsuario,
  obtenerUsuarioRoles,
} from './datos.js';
import { aFecha, escapar, icono } from './utils.js';

const contenedor = document.querySelector('[data-detalle]');
const ACTIVIDAD_VISIBLE = 8;

/** Junta notificaciones, asignaciones (si es técnico) y abastecimientos registrados. */
const armarActividad = ({ usuario, notificaciones, tecnico, asignaciones, abastecimientos, depositos }) => {
  const depositoPorId = new Map(depositos.map((d) => [d.id_deposito, d]));
  const eventos = [
    ...notificaciones.map((n) => ({ fecha: n.fecha_hora, tipo: n.tipo_alerta, detalle: n.mensaje })),
    ...(tecnico
      ? asignaciones
          .filter((a) => a.id_tecnico === tecnico.id_tecnico)
          .map((a) => ({ fecha: a.fecha_asignacion, tipo: 'Asignación', detalle: `#REP-${a.id_reporte} · ${a.estado}` }))
      : []),
    ...abastecimientos
      .filter((a) => a.id_usuario_responsable === usuario.id_usuario)
      .map((a) => ({
        fecha: a.fecha_hora,
        tipo: 'Abastecimiento',
        detalle: `${formatoLitros.format(a.cantidad_litros)} L a ${depositoPorId.get(a.id_deposito)?.nombre_deposito ?? 'depósito'}`,
      })),
    { fecha: usuario.fecha_registro, tipo: 'Registro', detalle: 'Se creó la cuenta en el sistema' },
  ];
  return eventos.sort((a, b) => aFecha(b.fecha) - aFecha(a.fecha)).slice(0, ACTIVIDAD_VISIBLE);
};

const render = ({ usuario: u, roles, tecnico, actividad, esPropio }) => {
  const activo = u.estado === 'activo';
  const filas = actividad
    .map(
      (e) => `
      <tr>
        <td class="data-table__td">${escapar(formatoFechaHora.format(aFecha(e.fecha)))}</td>
        <td class="data-table__td"><b>${escapar(e.tipo)}</b></td>
        <td class="data-table__td">${escapar(e.detalle)}</td>
      </tr>`,
    )
    .join('');

  contenedor.innerHTML = `
    <header class="page-header">
      <div class="detail-header">
        <span class="avatar avatar--xl ${avatarVariante(u.id_usuario)}" aria-hidden="true">${escapar(iniciales(u.nombre_usuario))}</span>
        <div>
          <p class="eyebrow">Cuenta · USR-${String(u.id_usuario).padStart(3, '0')}</p>
          <h1 class="page-header__title">${escapar(u.nombre_usuario)}</h1>
          <div class="detail-header__badges">
            ${roles.map((r) => `<span class="pill pill--${pillRol(r.nombre_rol)}">${escapar(r.nombre_rol)}</span>`).join('')}
            <span class="pill pill--${activo ? 'success' : 'neutral'}">${activo ? 'Activa' : 'Inactiva'}</span>
          </div>
        </div>
      </div>
      <div class="page-header__actions">
        <button class="button button--secondary" type="button" data-cambiar-estado ${esPropio ? 'disabled title="No puedes desactivar tu propia cuenta"' : ''}>
          ${activo ? 'Desactivar' : 'Activar'}
        </button>
        <a class="button" href="/usuario-form.html?id=${u.id_usuario}">${icono('pencil', 'icon icon--sm')}<span>Editar usuario</span></a>
      </div>
    </header>

    <div class="detail-grid">
      <section class="card" aria-labelledby="actividad-titulo">
        <header class="card__header">
          <div>
            <p class="eyebrow">Historial</p>
            <h2 class="card__title" id="actividad-titulo">Actividad reciente</h2>
          </div>
        </header>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th class="data-table__th" scope="col">Fecha</th>
                <th class="data-table__th" scope="col">Tipo</th>
                <th class="data-table__th" scope="col">Detalle</th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
      </section>

      <section class="card" aria-labelledby="contacto-titulo">
        <header class="card__header">
          <div>
            <p class="eyebrow">Datos de contacto</p>
            <h2 class="card__title" id="contacto-titulo">Información de la cuenta</h2>
          </div>
        </header>
        <dl class="info-list">
          <div class="info-list__row"><dt class="info-list__term">Correo</dt><dd class="info-list__value">${escapar(u.correo)}</dd></div>
          <div class="info-list__row"><dt class="info-list__term">Teléfono</dt><dd class="info-list__value">${escapar(u.telefono ?? '—')}</dd></div>
          <div class="info-list__row"><dt class="info-list__term">Registro</dt><dd class="info-list__value">${escapar(formatoFecha.format(aFecha(u.fecha_registro)))}</dd></div>
          <div class="info-list__row"><dt class="info-list__term">Estado</dt><dd class="info-list__value">${activo ? 'Activa' : 'Inactiva'}</dd></div>
          <div class="info-list__row"><dt class="info-list__term">Ficha técnica</dt><dd class="info-list__value">${
            tecnico
              ? `<a class="card__link" href="/tecnico-detalle.html?id=${tecnico.id_tecnico}">${escapar(tecnico.especialidad)}</a>`
              : 'No aplica'
          }</dd></div>
        </dl>
      </section>
    </div>`;
};

const cargar = async (id, idSesion) => {
  const usuario = await obtenerUsuario(id);
  if (!usuario) return false;

  const [usuarioRoles, roles, notificaciones, tecnicos, asignaciones, abastecimientos, depositos] = await Promise.all([
    obtenerUsuarioRoles(usuario.id_usuario),
    obtenerRoles(),
    obtenerNotificaciones(usuario.id_usuario),
    obtenerTecnicos(),
    obtenerAsignaciones(),
    obtenerAbastecimientos(),
    obtenerDepositos(),
  ]);
  const tecnico = tecnicos.find((t) => t.id_usuario === usuario.id_usuario) ?? null;

  setBreadcrumb(usuario.nombre_usuario);
  document.title = `${usuario.nombre_usuario} · AguaAlerta`;
  render({
    usuario,
    roles: rolesPorUsuario(usuarioRoles, roles).get(usuario.id_usuario) ?? [],
    tecnico,
    actividad: armarActividad({ usuario, notificaciones, tecnico, asignaciones, abastecimientos, depositos }),
    esPropio: usuario.id_usuario === idSesion,
  });

  contenedor.querySelector('[data-cambiar-estado]').addEventListener('click', async (event) => {
    const activo = usuario.estado === 'activo';
    const accion = activo ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Seguro que quieres ${accion} la cuenta de ${usuario.nombre_usuario}?`)) return;
    event.currentTarget.disabled = true;
    await cambiarEstadoUsuario(usuario.id_usuario, activo ? 'inactivo' : 'activo');
    await cargar(id, idSesion);
  });
  return true;
};

const iniciar = async () => {
  const sesion = await iniciarPanel();
  if (!sesion) return;

  const id = leerIdDeUrl();
  if (!id || !(await cargar(id, sesion.id_usuario))) {
    setBreadcrumb('No localizado');
    mostrarNoEncontrado(contenedor, {
      titulo: 'Usuario no localizado',
      texto: 'La cuenta que buscas no existe o el enlace es incorrecto.',
      href: '/usuarios.html',
      enlace: 'Ver todos los usuarios',
    });
    return;
  }
  contenedor.removeAttribute('aria-busy');
};

iniciar().catch(() => {
  contenedor.innerHTML = '<p class="empty-state__text">No pudimos cargar la cuenta. Recarga la página.</p>';
});
