import {
  EMAIL,
  TELEFONO,
  conCarga,
  hoyISO,
  iniciarPanel,
  leerIdDeUrl,
  limpiarAlEditar,
  llenarSelect,
  mostrarNoEncontrado,
  setBreadcrumb,
  validarCampos,
} from './app.js';
import {
  actualizarTecnico,
  crearTecnico,
  obtenerCatalogos,
  obtenerRoles,
  obtenerTecnico,
  obtenerTecnicos,
  obtenerUsuarioRoles,
  obtenerUsuarios,
} from './datos.js';

const contenido = document.querySelector('[data-contenido]');
const form = document.querySelector('[data-formulario]');
const alerta = form.querySelector('[data-alerta]');
const guardar = form.querySelector('[data-guardar]');
const campos = form.elements;

/* El formulario se procesa con JS: mientras carga, no se envía de forma nativa. */
form.addEventListener('submit', (event) => event.preventDefault());
guardar.disabled = true;
const hintUsuario = form.querySelector('[data-hint-id_usuario]');

let candidatos = [];

/** Usuarios activos con rol Técnico que todavía no tienen ficha técnica. */
const buscarCandidatos = async () => {
  const [usuarios, usuarioRoles, roles, tecnicos] = await Promise.all([
    obtenerUsuarios(),
    obtenerUsuarioRoles(),
    obtenerRoles(),
    obtenerTecnicos(),
  ]);
  const idRolTecnico = roles.find((r) => r.nombre_rol === 'Técnico')?.id_rol;
  const conFicha = new Set(tecnicos.map((t) => t.id_usuario));
  return usuarios.filter(
    (u) =>
      u.estado === 'activo' &&
      !conFicha.has(u.id_usuario) &&
      usuarioRoles.some((ur) => ur.id_usuario === u.id_usuario && ur.id_rol === idRolTecnico),
  );
};

/** Al elegir la cuenta, propone nombre, apellidos, teléfono y correo. */
const prellenar = () => {
  const usuario = candidatos.find((u) => u.id_usuario === Number(campos.id_usuario.value));
  if (!usuario) return;
  const [nombre, ...apellidos] = usuario.nombre_usuario.split(/\s+/);
  if (!campos.nombre.value) campos.nombre.value = nombre;
  if (!campos.apellidos.value) campos.apellidos.value = apellidos.join(' ');
  if (!campos.telefono.value) campos.telefono.value = usuario.telefono ?? '';
  if (!campos.correo.value) campos.correo.value = usuario.correo;
};

const reglas = (catalogos, edicion) => ({
  id_usuario: (v) => (!edicion && !v ? 'Selecciona la cuenta de usuario del técnico.' : ''),
  nombre: (v) => (!v ? 'Escribe el nombre.' : v.length > 100 ? 'Máximo 100 caracteres.' : ''),
  apellidos: (v) => (!v ? 'Escribe los apellidos.' : v.length > 150 ? 'Máximo 150 caracteres.' : ''),
  telefono: (v) => (v && !TELEFONO.test(v) ? 'Usa de 10 a 20 dígitos.' : ''),
  correo: (v) => (!v ? 'Escribe el correo institucional.' : !EMAIL.test(v) ? 'El correo no tiene un formato válido.' : ''),
  especialidad: (v) => (!catalogos.especialidades.includes(v) ? 'Selecciona la especialidad.' : ''),
  disponibilidad: (v) => (!catalogos.disponibilidades.includes(v) ? 'Selecciona la disponibilidad.' : ''),
  fecha_contratacion: (v) => (v && v > hoyISO() ? 'La fecha no puede ser futura.' : ''),
  master_key: (v) => (edicion ? '' : !v ? 'Ingresa la master key.' : v.length < 8 ? 'La master key tiene al menos 8 caracteres.' : ''),
});

const modoEdicion = (tecnico) => {
  const destino = `/tecnico-detalle.html?id=${tecnico.id_tecnico}`;
  document.querySelector('[data-titulo]').textContent = 'Editar técnico';
  document.title = `Editar ${tecnico.nombre} ${tecnico.apellidos} · AguaAlerta`;
  setBreadcrumb('Editar técnico');
  guardar.textContent = 'Guardar cambios';
  document.querySelectorAll('[data-volver]').forEach((a) => (a.href = destino));
  form.querySelector('[data-solo-alta]').remove();

  campos.id_usuario.disabled = true;
  hintUsuario.textContent = 'La cuenta vinculada no se puede cambiar.';
  ['nombre', 'apellidos', 'telefono', 'correo', 'especialidad', 'disponibilidad', 'fecha_contratacion'].forEach((n) => {
    campos[n].value = tecnico[n] ?? '';
  });
};

const iniciar = async () => {
  if (!(await iniciarPanel())) return;

  const id = leerIdDeUrl();
  const [catalogos, tecnico, usuarios] = await Promise.all([
    obtenerCatalogos(),
    id ? obtenerTecnico(id) : null,
    obtenerUsuarios(),
  ]);

  if (new URLSearchParams(window.location.search).has('id') && !tecnico) {
    setBreadcrumb('No localizado');
    mostrarNoEncontrado(contenido, {
      titulo: 'Técnico no localizado',
      texto: 'No podemos editar un técnico que no existe.',
      href: '/tecnicos.html',
      enlace: 'Ver todos los técnicos',
    });
    return;
  }

  llenarSelect(campos.especialidad, catalogos.especialidades.map((e) => ({ texto: e, valor: e })), 'Seleccionar especialidad');
  llenarSelect(campos.disponibilidad, catalogos.disponibilidades.map((d) => ({ texto: d, valor: d })));
  campos.fecha_contratacion.max = hoyISO();

  if (tecnico) {
    const vinculado = usuarios.find((u) => u.id_usuario === tecnico.id_usuario);
    llenarSelect(campos.id_usuario, [{ texto: `${vinculado?.nombre_usuario ?? 'Sin cuenta'} · ${vinculado?.correo ?? ''}`, valor: tecnico.id_usuario }]);
    modoEdicion(tecnico);
  } else {
    candidatos = await buscarCandidatos();
    llenarSelect(
      campos.id_usuario,
      candidatos.map((u) => ({ texto: `${u.nombre_usuario} · ${u.correo}`, valor: u.id_usuario })),
      'Seleccionar usuario',
    );
    hintUsuario.innerHTML = candidatos.length
      ? 'Solo aparecen cuentas activas con rol Técnico que aún no tienen ficha.'
      : 'No hay cuentas con rol Técnico sin ficha. <a class="card__link" href="/usuario-form.html">Crea primero la cuenta en Usuarios</a>.';
    campos.id_usuario.addEventListener('change', prellenar);
    campos.fecha_contratacion.value = hoyISO();
  }
  limpiarAlEditar(form);
  guardar.disabled = false;

  const reglasForm = reglas(catalogos, Boolean(tecnico));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    alerta.hidden = true;

    const invalido = validarCampos(form, reglasForm);
    if (invalido) {
      invalido.focus();
      return;
    }

    const datos = Object.fromEntries(new FormData(form));
    try {
      const guardado = await conCarga(guardar, 'Guardando…', () =>
        tecnico ? actualizarTecnico(tecnico.id_tecnico, datos) : crearTecnico(datos, datos.master_key),
      );
      window.location.href = `/tecnico-detalle.html?id=${guardado.id_tecnico}`;
    } catch (error) {
      alerta.textContent = error.message || 'No pudimos guardar al técnico. Intenta de nuevo.';
      alerta.hidden = false;
      alerta.scrollIntoView({ block: 'center' });
    }
  });
};

iniciar().catch(() => {
  alerta.textContent = 'No pudimos cargar el formulario. Recarga la página.';
  alerta.hidden = false;
});
