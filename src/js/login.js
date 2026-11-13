import { obtenerRoles, obtenerUsuarioRoles, obtenerUsuarios } from './datos.js';
import { guardarSesion, normalizar } from './utils.js';

const form = document.querySelector('.login-form');
const usuario = form.querySelector('#usuario');
const password = form.querySelector('#password');
const recordar = form.querySelector('[name="recordar"]');
const toggle = form.querySelector('.login-form__toggle');
const submit = form.querySelector('.login-form__submit');

/* Mostrar / ocultar contraseña */
toggle.addEventListener('click', () => {
  const visible = password.type === 'text';
  password.type = visible ? 'password' : 'text';
  toggle.setAttribute('aria-pressed', String(!visible));
  toggle.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
  toggle.querySelector('use').setAttribute('href', `#${visible ? 'eye' : 'eye-off'}`);
});

/* Validación */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USUARIO = /^[\p{L}0-9._ -]{3,50}$/u;
const ROLES_SIN_ACCESO = ['Ciudadano'];

const alerta = form.querySelector('.login-form__alert');
const alertaTitulo = alerta.querySelector('.login-form__alert-title');
const alertaTexto = alerta.querySelector('.login-form__alert-text');

/** Banner de error superior (como en el diseño). Sin mensaje, se oculta. */
const mostrarAlerta = (titulo, mensaje) => {
  alerta.hidden = !mensaje;
  alertaTitulo.textContent = titulo;
  alertaTexto.textContent = mensaje;
};

const marcarCampo = (input, invalido) => {
  input.classList.toggle('login-form__input--invalid', invalido);
  input.setAttribute('aria-invalid', String(invalido));
  if (invalido) input.setAttribute('aria-describedby', 'login-alerta');
  else input.removeAttribute('aria-describedby');
};

/** Valida los campos; regresa el primer mensaje de error o '' si todo está bien. */
const validar = () => {
  const valorUsuario = usuario.value.trim();
  let errorUsuario = '';
  if (!valorUsuario) errorUsuario = 'Ingresa tu usuario o correo institucional.';
  else if (valorUsuario.includes('@') ? !EMAIL.test(valorUsuario) : !USUARIO.test(valorUsuario)) {
    errorUsuario = 'El usuario o correo no tiene un formato válido.';
  }

  let errorPassword = '';
  if (!password.value) errorPassword = 'Ingresa tu contraseña.';
  else if (password.value.length < 8) errorPassword = 'La contraseña debe tener al menos 8 caracteres.';

  marcarCampo(usuario, Boolean(errorUsuario));
  marcarCampo(password, Boolean(errorPassword));

  if (!valorUsuario && !password.value) return 'Usuario y contraseña son obligatorios.';
  return errorUsuario || errorPassword;
};

[usuario, password].forEach((input) => {
  input.addEventListener('input', () => {
    if (input.classList.contains('login-form__input--invalid')) marcarCampo(input, false);
    if (!form.querySelector('.login-form__input--invalid')) mostrarAlerta('', '');
  });
});

/* Autenticación contra la tabla Usuarios */
const hashSha256 = async (texto) => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

const autenticar = async (credencial, contrasena) => {
  const valor = credencial.trim();
  const usuarios = await obtenerUsuarios();
  const usuario = valor.includes('@')
    ? usuarios.find((u) => u.correo.toLowerCase() === valor.toLowerCase())
    : usuarios.find((u) => normalizar(u.nombre_usuario) === normalizar(valor));

  if (!usuario || usuario.contrasena_hash !== (await hashSha256(contrasena))) {
    return { error: 'Usuario o contraseña incorrectos.' };
  }
  if (usuario.estado !== 'activo') {
    return { error: 'Tu cuenta está inactiva. Contacta al administrador del sistema.' };
  }

  const [asignados, roles] = await Promise.all([obtenerUsuarioRoles(usuario.id_usuario), obtenerRoles()]);
  const nombresRol = asignados.map((ur) => roles.find((r) => r.id_rol === ur.id_rol)?.nombre_rol);
  if (!nombresRol.some((nombre) => nombre && !ROLES_SIN_ACCESO.includes(nombre))) {
    return { error: 'Tu cuenta no tiene acceso al centro operativo.' };
  }

  return { usuario };
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const errorValidacion = validar();
  if (errorValidacion) {
    mostrarAlerta('Verifica tus datos', errorValidacion);
    form.querySelector('.login-form__input--invalid')?.focus();
    return;
  }
  mostrarAlerta('', '');

  const textoBoton = submit.textContent;
  submit.disabled = true;
  submit.textContent = 'Validando acceso…';

  let redirigiendo = false;
  try {
    const { usuario: cuenta, error } = await autenticar(usuario.value, password.value);
    if (error) {
      mostrarAlerta('No pudimos iniciar sesión', error);
      password.focus();
      return;
    }
    guardarSesion(cuenta.id_usuario, recordar.checked);
    redirigiendo = true;
    window.location.href = '/home.html';
  } catch {
    mostrarAlerta('No pudimos iniciar sesión', 'No pudimos verificar tus credenciales. Intenta de nuevo.');
  } finally {
    if (!redirigiendo) {
      submit.disabled = false;
      submit.textContent = textoBoton;
    }
  }
});
