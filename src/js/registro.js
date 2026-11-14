import { obtenerRoles, registrarEmpleado, validarMasterKey } from './datos.js';

/* Catálogos del formulario (como en el diseño). */
const ESPECIALIDADES = ['Tuberías', 'Sensores IoT', 'Válvulas'];
const DISPONIBILIDADES = ['Disponible', 'Fuera de turno'];
const ROLES_EMPLEADO_EXCLUIDOS = ['Ciudadano'];

const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const USUARIO = /^[\p{L}0-9._ -]{3,50}$/u;
const TELEFONO = /^[0-9 +()-]{10,20}$/;

const card = document.querySelector('.enroll__card');
const lock = card.querySelector('.enroll__lock');
const check = card.querySelector('.enroll__check');
const kicker = card.querySelector('.enroll__kicker');
const titulo = card.querySelector('.enroll__title');
const pasos = {
  clave: card.querySelector('[data-paso="clave"]'),
  registro: card.querySelector('[data-paso="registro"]'),
  exito: card.querySelector('[data-paso="exito"]'),
};
const alerta = pasos.registro.querySelector('.enroll__alert');

/** La clave validada solo vive en memoria mientras la pestaña está abierta. */
let masterKey = '';

/* --------------------------------------------------------------------------
   Utilidades
   -------------------------------------------------------------------------- */
const setError = (input, mensaje) => {
  const error = document.getElementById(`${input.id}-error`);
  error.textContent = mensaje;
  input.classList.toggle('field__input--invalid', Boolean(mensaje));
  input.setAttribute('aria-invalid', String(Boolean(mensaje)));
  if (mensaje) input.setAttribute('aria-describedby', error.id);
  else input.removeAttribute('aria-describedby');
};

const opciones = (select, valores, vacia) => {
  select.innerHTML = '';
  if (vacia) select.add(new Option(vacia.texto, vacia.valor));
  valores.forEach(({ texto, valor }) => select.add(new Option(texto, valor)));
};

const mostrarPaso = (nombre) => {
  Object.entries(pasos).forEach(([clave, elemento]) => {
    elemento.hidden = clave !== nombre;
  });
  const exito = nombre === 'exito';
  card.classList.toggle('enroll__card--success', exito);
  lock.hidden = exito;
  check.hidden = !exito;
  kicker.textContent = exito ? 'Cuenta preparada' : 'Administración de acceso';
  titulo.textContent = { clave: 'Acceso de alta restringido', registro: 'Registrar empleado', exito: 'Empleado registrado' }[
    nombre
  ];
};

const conCarga = async (boton, texto, accion) => {
  const original = boton.textContent;
  boton.disabled = true;
  boton.textContent = texto;
  try {
    return await accion();
  } finally {
    boton.disabled = false;
    boton.textContent = original;
  }
};

/* --------------------------------------------------------------------------
   Paso 1: master key
   -------------------------------------------------------------------------- */
const inputClave = pasos.clave.querySelector('#master-key');

pasos.clave.addEventListener('submit', async (event) => {
  event.preventDefault();
  const clave = inputClave.value;

  const errorFormato = !clave
    ? 'Ingresa la clave maestra.'
    : clave.length < 8
      ? 'La clave maestra tiene al menos 8 caracteres.'
      : '';
  setError(inputClave, errorFormato);
  if (errorFormato) {
    inputClave.focus();
    return;
  }

  const boton = pasos.clave.querySelector('.enroll__submit');
  try {
    const valida = await conCarga(boton, 'Validando…', () => validarMasterKey(clave));
    if (!valida) {
      setError(inputClave, 'La master key no es válida.');
      inputClave.select();
      return;
    }
    masterKey = clave;
    inputClave.value = '';
    mostrarPaso('registro');
    pasos.registro.querySelector('input').focus();
  } catch {
    setError(inputClave, 'No pudimos validar la clave. Intenta de nuevo.');
  }
});

inputClave.addEventListener('input', () => setError(inputClave, ''));

/* --------------------------------------------------------------------------
   Paso 2: datos del empleado
   -------------------------------------------------------------------------- */
const campos = Object.fromEntries(
  [...pasos.registro.querySelectorAll('.field__input')].map((input) => [input.name, input]),
);

const reglas = {
  nombre_usuario: (v) => (!v ? 'Escribe el nombre de usuario.' : !USUARIO.test(v) ? 'Usa de 3 a 50 letras, números o . _ -' : ''),
  correo: (v) => (!v ? 'Escribe el correo institucional.' : !EMAIL.test(v) ? 'El correo no tiene un formato válido.' : ''),
  contrasena: (v) => (!v ? 'Escribe la contraseña inicial.' : v.length < 8 ? 'Debe tener al menos 8 caracteres.' : ''),
  telefono: (v) => (v && !TELEFONO.test(v) ? 'Usa de 10 a 20 dígitos.' : ''),
  nombre_completo: (v) => (!v ? 'Escribe el nombre completo.' : v.split(/\s+/).length < 2 ? 'Incluye nombre y apellido.' : ''),
  id_rol: (v) => (!v ? 'Selecciona un rol.' : ''),
  especialidad: (v, datos) =>
    datos.rol === 'Técnico' && !v ? 'Selecciona la especialidad del técnico.' : '',
  disponibilidad: (v) => (!v ? 'Selecciona la disponibilidad.' : ''),
};

const validarRegistro = () => {
  const rolSeleccionado = campos.id_rol.selectedOptions[0]?.textContent ?? '';
  let primero = null;
  Object.entries(reglas).forEach(([nombre, regla]) => {
    const input = campos[nombre];
    const mensaje = regla(input.value.trim(), { rol: rolSeleccionado });
    setError(input, mensaje);
    if (mensaje && !primero) primero = input;
  });
  return primero;
};

Object.values(campos).forEach((input) => {
  const evento = input.tagName === 'SELECT' ? 'change' : 'input';
  input.addEventListener(evento, () => {
    if (input.classList.contains('field__input--invalid')) setError(input, '');
  });
});

pasos.registro.addEventListener('submit', async (event) => {
  event.preventDefault();
  alerta.hidden = true;

  const invalido = validarRegistro();
  if (invalido) {
    invalido.focus();
    return;
  }

  const datos = Object.fromEntries(Object.entries(campos).map(([nombre, input]) => [nombre, input.value.trim()]));
  datos.contrasena = campos.contrasena.value;

  const boton = pasos.registro.querySelector('.enroll__submit');
  try {
    await conCarga(boton, 'Creando cuenta…', () => registrarEmpleado(datos, masterKey));
    masterKey = '';
    pasos.registro.reset();
    mostrarPaso('exito');
  } catch (error) {
    alerta.textContent = error.message || 'No pudimos crear la cuenta. Intenta de nuevo.';
    alerta.hidden = false;
  }
});

/* --------------------------------------------------------------------------
   Catálogos
   -------------------------------------------------------------------------- */
const cargarCatalogos = async () => {
  opciones(
    campos.especialidad,
    ESPECIALIDADES.map((e) => ({ texto: e, valor: e })),
    { texto: 'No aplica', valor: '' },
  );
  opciones(
    campos.disponibilidad,
    DISPONIBILIDADES.map((d) => ({ texto: d, valor: d })),
  );

  const roles = await obtenerRoles();
  opciones(
    campos.id_rol,
    roles
      .filter((r) => r.estado === 'activo' && !ROLES_EMPLEADO_EXCLUIDOS.includes(r.nombre_rol))
      .map((r) => ({ texto: r.nombre_rol, valor: r.id_rol })),
    { texto: 'Seleccionar rol', valor: '' },
  );
};

cargarCatalogos().catch(() => {
  alerta.textContent = 'No pudimos cargar los roles. Recarga la página.';
  alerta.hidden = false;
});
