/** Utilidades compartidas entre páginas. */

/** Escapa texto antes de insertarlo como HTML. */
export const escapar = (texto) =>
  String(texto ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

/** Ícono del sprite SVG. */
export const icono = (nombre, clase = 'icon') =>
  `<svg class="${clase}" aria-hidden="true"><use href="#${nombre}" /></svg>`;

/** Minúsculas y sin acentos, para comparar textos. */
export const normalizar = (texto) =>
  String(texto ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Convierte un DATETIME ('AAAA-MM-DD HH:MM:SS') o DATE ('AAAA-MM-DD') a Date local. */
export const aFecha = (valor, hora = '00:00:00') => {
  const [dia, tiempo = hora] = String(valor).split(' ');
  return new Date(`${dia}T${tiempo}`);
};

/** ¿La fecha cae en el mismo día que `referencia`? */
export const mismoDia = (a, b = new Date()) => a.toDateString() === b.toDateString();

/** Porcentaje de llenado de un depósito. */
export const porcentajeLlenado = (deposito) =>
  Math.round((deposito.nivel_actual_litros / deposito.capacidad_litros) * 100);

/** Nivel por debajo del cual un depósito se considera crítico. */
export const UMBRAL_CRITICO = 20;

/** Texto relativo: "hace 2 min", "hace 3 h"... */
export const haceCuanto = (fecha, ahora = new Date()) => {
  const minutos = Math.max(0, Math.round((ahora - fecha) / 60_000));
  if (minutos < 1) return 'hace un momento';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return `hace ${Math.round(horas / 24)} d`;
};

/** Variación porcentual con signo: "+6.4%", "-12%". */
export const variacion = (actual, anterior, decimales = 1) => {
  if (!anterior) return '0%';
  const valor = ((actual - anterior) / anterior) * 100;
  const texto = Number(valor.toFixed(decimales)).toString();
  return `${valor > 0 ? '+' : ''}${texto}%`;
};

/* Sesión (sin backend: se guarda el id del usuario en el navegador) */
const CLAVE_SESION = 'aguaalerta:sesion';

const almacenes = () => [window.sessionStorage, window.localStorage];

export const guardarSesion = (idUsuario, recordar) => {
  try {
    cerrarSesion();
    (recordar ? window.localStorage : window.sessionStorage).setItem(CLAVE_SESION, String(idUsuario));
  } catch {
    /* El navegador bloquea el almacenamiento: la sesión dura solo esta página. */
  }
};

export const leerSesion = () => {
  try {
    for (const almacen of almacenes()) {
      const valor = almacen.getItem(CLAVE_SESION);
      if (valor) return Number(valor);
    }
  } catch {
    /* Sin acceso al almacenamiento. */
  }
  return null;
};

export const cerrarSesion = () => {
  try {
    almacenes().forEach((almacen) => almacen.removeItem(CLAVE_SESION));
  } catch {
    /* Sin acceso al almacenamiento. */
  }
};
