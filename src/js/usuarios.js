import { avatarVariante, formatoFecha, iniciales, iniciarPanel, llenarSelect, pillRol, rolesPorUsuario } from './app.js';
import { obtenerRoles, obtenerUsuarioRoles, obtenerUsuarios } from './datos.js';
import { aFecha, escapar, normalizar } from './utils.js';

const lista = document.querySelector('[data-lista]');
const vacio = document.querySelector('[data-vacio]');
const conteo = document.querySelector('[data-conteo]');
const filtroTexto = document.querySelector('[data-filtro-texto]');
const filtroRol = document.querySelector('[data-filtro-rol]');
const filtroEstado = document.querySelector('[data-filtro-estado]');

let usuarios = [];
let rolesDe = new Map();

const tarjeta = (u) => {
  const roles = rolesDe.get(u.id_usuario) ?? [];
  const principal = roles[0]?.nombre_rol ?? 'Sin rol';
  const activo = u.estado === 'activo';
  return `
    <article class="person-card">
      <div class="person-card__top">
        <span class="avatar ${avatarVariante(u.id_usuario)}" aria-hidden="true">${escapar(iniciales(u.nombre_usuario))}</span>
        <span class="pill pill--${pillRol(principal)}">${escapar(principal)}</span>
      </div>
      <h2 class="person-card__name">${escapar(u.nombre_usuario)}</h2>
      <p class="person-card__text">${escapar(u.correo)}</p>
      <div class="person-card__metrics">
        <div>
          <span class="person-card__metric-label">Registro</span>
          <span class="person-card__metric-value">${escapar(formatoFecha.format(aFecha(u.fecha_registro)))}</span>
        </div>
        <div>
          <span class="person-card__metric-label">Estado</span>
          <span class="person-card__metric-value">${activo ? 'Activo' : 'Inactivo'}</span>
        </div>
      </div>
      <a class="person-card__link" href="/usuario-detalle.html?id=${u.id_usuario}">Ver perfil y actividad</a>
    </article>`;
};

const renderLista = () => {
  const texto = normalizar(filtroTexto.value);
  const visibles = usuarios.filter((u) => {
    const roles = rolesDe.get(u.id_usuario) ?? [];
    return (
      (!texto || normalizar(`${u.nombre_usuario} ${u.correo}`).includes(texto)) &&
      (!filtroRol.value || roles.some((r) => r.id_rol === Number(filtroRol.value))) &&
      (!filtroEstado.value || u.estado === filtroEstado.value)
    );
  });
  lista.innerHTML = visibles.map(tarjeta).join('');
  vacio.hidden = visibles.length > 0;
  conteo.textContent = `${visibles.length} de ${usuarios.length} cuentas`;
};

const iniciar = async () => {
  if (!(await iniciarPanel())) return;

  const [listaUsuarios, usuarioRoles, roles] = await Promise.all([obtenerUsuarios(), obtenerUsuarioRoles(), obtenerRoles()]);
  usuarios = listaUsuarios.sort((a, b) => a.nombre_usuario.localeCompare(b.nombre_usuario, 'es'));
  rolesDe = rolesPorUsuario(usuarioRoles, roles);

  const activos = usuarios.filter((u) => u.estado === 'activo').length;
  document.querySelector('[data-resumen-texto]').textContent =
    `Gestión de accesos, roles y estado de cuentas · ${activos} de ${usuarios.length} activas`;

  llenarSelect(filtroRol, roles.map((r) => ({ texto: r.nombre_rol, valor: r.id_rol })), 'Todos los roles');
  llenarSelect(
    filtroEstado,
    [
      { texto: 'Activos', valor: 'activo' },
      { texto: 'Inactivos', valor: 'inactivo' },
    ],
    'Todos los estados',
  );
  renderLista();

  filtroTexto.addEventListener('input', renderLista);
  [filtroRol, filtroEstado].forEach((s) => s.addEventListener('change', renderLista));
  document.querySelectorAll('[data-limpiar]').forEach((boton) =>
    boton.addEventListener('click', () => {
      filtroTexto.value = '';
      filtroRol.value = '';
      filtroEstado.value = '';
      renderLista();
      filtroTexto.focus();
    }),
  );
};

iniciar().catch(() => {
  lista.innerHTML = '<p class="empty-state__text">No pudimos cargar a los usuarios. Recarga la página.</p>';
});
