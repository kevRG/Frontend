import {
  EMAIL,
  TELEFONO,
  conCarga,
  iniciarPanel,
  leerIdDeUrl,
  limpiarAlEditar,
  mostrarNoEncontrado,
  rolesPorUsuario,
  setBreadcrumb,
  validarCampos,
} from './app.js';
import { actualizarUsuario, crearUsuario, obtenerRoles, obtenerUsuario, obtenerUsuarioRoles } from './datos.js';
import { escapar } from './utils.js';

const contenido = document.querySelector('[data-contenido]');
const form = document.querySelector('[data-formulario]');
const alerta = form.querySelector('[data-alerta]');
const guardar = form.querySelector('[data-guardar]');
const campos = form.elements;

/* El formulario se procesa con JS: mientras carga, no se envía de forma nativa. */
form.addEventListener('submit', (event) => event.preventDefault());
guardar.disabled = true;
const contenedorRoles = form.querySelector('[data-roles]');
const errorRol = document.getElementById('id_rol-error');

const USUARIO = /^[\p{L}0-9._ -]{3,50}$/u;

const renderRoles = (roles, seleccionado) => {
  contenedorRoles.innerHTML = roles
    .map(
      (r) => `
      <label class="choice-card">
        <input type="radio" name="id_rol" value="${r.id_rol}" ${r.id_rol === seleccionado ? 'checked' : ''} />
        <span class="choice-card__title">${escapar(r.nombre_rol)}</span>
        <span class="choice-card__text">${escapar(r.descripcion ?? '')}</span>
      </label>`,
    )
    .join('');
  contenedorRoles.addEventListener('change', () => (errorRol.textContent = ''));
};

const reglas = (edicion) => ({
  nombre_usuario: (v) => (!v ? 'Escribe el nombre de usuario.' : !USUARIO.test(v) ? 'Usa de 3 a 50 letras, números o . _ -' : ''),
  correo: (v) => (!v ? 'Escribe el correo electrónico.' : !EMAIL.test(v) ? 'El correo no tiene un formato válido.' : ''),
  contrasena: (v) => {
    if (!v) return edicion ? '' : 'Escribe la contraseña inicial.';
    return v.length < 8 ? 'Debe tener al menos 8 caracteres.' : '';
  },
  telefono: (v) => (v && !TELEFONO.test(v) ? 'Usa de 10 a 20 dígitos.' : ''),
  master_key: (v) => (edicion ? '' : !v ? 'Ingresa la master key.' : v.length < 8 ? 'La master key tiene al menos 8 caracteres.' : ''),
});

const modoEdicion = (usuario) => {
  const destino = `/usuario-detalle.html?id=${usuario.id_usuario}`;
  document.querySelector('[data-titulo]').textContent = 'Editar usuario';
  document.title = `Editar ${usuario.nombre_usuario} · AguaAlerta`;
  setBreadcrumb('Editar usuario');
  guardar.textContent = 'Guardar cambios';
  document.querySelectorAll('[data-volver]').forEach((a) => (a.href = destino));
  form.querySelector('[data-solo-alta]').remove();

  document.querySelector('label[for="contrasena"]').textContent = 'Nueva contraseña';
  form.querySelector('[data-hint-contrasena]').textContent = 'Déjala vacía para conservar la contraseña actual.';
  campos.nombre_usuario.value = usuario.nombre_usuario;
  campos.correo.value = usuario.correo;
  campos.telefono.value = usuario.telefono ?? '';
  campos.estado.checked = usuario.estado === 'activo';
};

const iniciar = async () => {
  const sesion = await iniciarPanel();
  if (!sesion) return;

  const id = leerIdDeUrl();
  const [roles, usuario, usuarioRoles] = await Promise.all([
    obtenerRoles(),
    id ? obtenerUsuario(id) : null,
    id ? obtenerUsuarioRoles(id) : [],
  ]);

  if (new URLSearchParams(window.location.search).has('id') && !usuario) {
    setBreadcrumb('No localizado');
    mostrarNoEncontrado(contenido, {
      titulo: 'Usuario no localizado',
      texto: 'No podemos editar una cuenta que no existe.',
      href: '/usuarios.html',
      enlace: 'Ver todos los usuarios',
    });
    return;
  }

  const activos = roles.filter((r) => r.estado === 'activo');
  const rolActual = usuario ? rolesPorUsuario(usuarioRoles, roles).get(usuario.id_usuario)?.[0]?.id_rol : null;
  renderRoles(activos, rolActual);
  if (usuario) modoEdicion(usuario);
  limpiarAlEditar(form);
  guardar.disabled = false;

  const reglasForm = reglas(Boolean(usuario));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    alerta.hidden = true;

    let invalido = validarCampos(form, reglasForm);
    const rol = form.querySelector('input[name="id_rol"]:checked');
    errorRol.textContent = rol ? '' : 'Selecciona el rol del usuario.';
    if (!rol && !invalido) invalido = contenedorRoles.querySelector('input');

    if (usuario && usuario.id_usuario === sesion.id_usuario && !campos.estado.checked) {
      alerta.textContent = 'No puedes desactivar tu propia cuenta.';
      alerta.hidden = false;
      return;
    }
    if (invalido) {
      invalido.focus();
      return;
    }

    const datos = {
      nombre_usuario: campos.nombre_usuario.value,
      correo: campos.correo.value,
      contrasena: campos.contrasena.value,
      telefono: campos.telefono.value,
      id_rol: rol.value,
      estado: campos.estado.checked ? 'activo' : 'inactivo',
    };

    try {
      const guardado = await conCarga(guardar, 'Guardando…', () =>
        usuario ? actualizarUsuario(usuario.id_usuario, datos) : crearUsuario(datos, campos.master_key.value),
      );
      window.location.href = `/usuario-detalle.html?id=${guardado.id_usuario}`;
    } catch (error) {
      alerta.textContent = error.message || 'No pudimos guardar el usuario. Intenta de nuevo.';
      alerta.hidden = false;
      alerta.scrollIntoView({ block: 'center' });
    }
  });
};

iniciar().catch(() => {
  alerta.textContent = 'No pudimos cargar el formulario. Recarga la página.';
  alerta.hidden = false;
});
