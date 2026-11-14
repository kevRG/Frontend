/**
 * Panel interno: lo que comparten home y los módulos (sesión, sidebar, topbar,
 * alertas, contadores del menú y utilidades de vista).
 */
import {
  marcarNotificacionesLeidas,
  obtenerDepositos,
  obtenerNotificaciones,
  obtenerReportes,
  obtenerRoles,
  obtenerUsuario,
  obtenerUsuarioRoles,
} from './datos.js';
import { UMBRAL_CRITICO, aFecha, cerrarSesion, escapar, haceCuanto, icono, leerSesion, porcentajeLlenado } from './utils.js';

/* --------------------------------------------------------------------------
   Utilidades de vista compartidas
   -------------------------------------------------------------------------- */
export const formatoLitros = new Intl.NumberFormat('en-US');
export const formatoFecha = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
export const formatoFechaHora = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export const iniciales = (nombre) =>
  String(nombre ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('');

/** Estado visual de un depósito según su porcentaje de llenado. */
export const nivelDeposito = (porcentaje) => {
  if (porcentaje < UMBRAL_CRITICO) return { clave: 'danger', texto: 'Crítico' };
  if (porcentaje < 50) return { clave: 'warning', texto: 'Atención' };
  return { clave: 'ok', texto: 'Estable' };
};

/** Lee ?id= de la dirección; regresa null si no es un número válido. */
export const leerIdDeUrl = () => {
  const id = Number(new URLSearchParams(window.location.search).get('id'));
  return Number.isInteger(id) && id > 0 ? id : null;
};

/** Pinta el estado "no localizado" en el contenedor de la página. */
export const mostrarNoEncontrado = (contenedor, { titulo, texto, href, enlace }) => {
  contenedor.innerHTML = `
    <section class="empty-state">
      <span class="empty-state__icon">${icono('alert-triangle')}</span>
      <h1 class="empty-state__title">${escapar(titulo)}</h1>
      <p class="empty-state__text">${escapar(texto)}</p>
      <a class="button" href="${href}">${escapar(enlace)}</a>
    </section>`;
};

/** Cambia el texto del último nivel de la ruta (breadcrumb). */
export const setBreadcrumb = (texto) => {
  const actual = document.querySelector('[data-breadcrumb-actual]');
  if (actual) actual.textContent = texto;
};

/* --------------------------------------------------------------------------
   Sesión y usuario
   -------------------------------------------------------------------------- */
const cargarUsuario = async () => {
  const idUsuario = leerSesion();
  if (!idUsuario) return null;

  const usuario = await obtenerUsuario(idUsuario);
  if (!usuario || usuario.estado !== 'activo') {
    cerrarSesion();
    return null;
  }

  const [asignados, roles] = await Promise.all([obtenerUsuarioRoles(idUsuario), obtenerRoles()]);
  const rol = asignados.map((ur) => roles.find((r) => r.id_rol === ur.id_rol)).find((r) => r && r.nombre_rol !== 'Ciudadano');
  if (!rol) {
    cerrarSesion();
    return null;
  }
  return { ...usuario, nombre_rol: rol.nombre_rol };
};

const setTodos = (selector, callback) => document.querySelectorAll(selector).forEach(callback);

const renderUsuario = (usuario) => {
  const nombre = usuario.nombre_usuario;
  setTodos('[data-usuario-iniciales]', (el) => {
    el.textContent = iniciales(nombre);
    el.title = nombre;
  });
  setTodos('[data-usuario-nombre]', (el) => (el.textContent = nombre));
  setTodos('[data-usuario-rol]', (el) => (el.textContent = usuario.nombre_rol));
};

/* --------------------------------------------------------------------------
   Navegación y contadores
   -------------------------------------------------------------------------- */
const marcarNavegacion = () => {
  const modulo = document.body.dataset.modulo;
  setTodos('[data-nav]', (link) => {
    const activo = link.dataset.nav === modulo;
    link.classList.toggle(link.classList.contains('bottom-nav__item') ? 'bottom-nav__item--active' : 'sidebar__link--active', activo);
    if (activo) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  const seccion = document.querySelector('[data-breadcrumb-seccion]');
  if (seccion && !seccion.textContent.trim()) seccion.remove();
};

const renderBadge = (selector, cantidad, etiqueta) => {
  const badge = document.querySelector(selector);
  if (!badge) return;
  badge.hidden = cantidad === 0;
  badge.textContent = cantidad;
  badge.setAttribute('aria-label', `${cantidad} ${etiqueta}`);
};

const renderContadores = async () => {
  const [reportes, depositos] = await Promise.all([obtenerReportes(), obtenerDepositos()]);
  renderBadge('[data-badge-reportes]', reportes.filter((r) => r.estado !== 'Cerrado').length, 'reportes activos');
  renderBadge(
    '[data-badge-depositos]',
    depositos.filter((d) => porcentajeLlenado(d) < UMBRAL_CRITICO).length,
    'alertas',
  );
};

/* --------------------------------------------------------------------------
   Interacciones del panel
   -------------------------------------------------------------------------- */
const initSidebar = () => {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.app__overlay');
  const abrir = document.querySelector('.topbar__menu');
  const cerrar = document.querySelector('.sidebar__close');

  const setOpen = (open) => {
    sidebar.classList.toggle('sidebar--open', open);
    overlay.hidden = !open;
    abrir.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  };

  abrir.addEventListener('click', () => setOpen(true));
  document.querySelector('[data-abrir-menu]')?.addEventListener('click', () => setOpen(true));
  cerrar.addEventListener('click', () => setOpen(false));
  overlay.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('sidebar--open')) setOpen(false);
  });
  window.matchMedia('(min-width: 761px)').addEventListener('change', (e) => {
    if (e.matches) setOpen(false);
  });
};

const initBusqueda = () => {
  const input = document.querySelector('.search-box__input');
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });
};

/* Tipos de notificación que aparecen en el menú de alertas críticas. */
const ALERTAS = {
  'Descenso repentino': { icon: 'alert-triangle', modificador: '' },
  'Nivel crítico': { icon: 'alert-triangle', modificador: '' },
  'Sensor sin señal': { icon: 'radio', modificador: 'alerts__icon--warning' },
};

const renderAlertas = (notificaciones) => {
  const lista = document.querySelector('[data-alertas]');
  const contador = document.querySelector('[data-alertas-contador]');
  const alertas = notificaciones
    .filter((n) => ALERTAS[n.tipo_alerta])
    .sort((a, b) => aFecha(b.fecha_hora) - aFecha(a.fecha_hora));
  const nuevas = alertas.filter((n) => n.estado_lectura === 'no leída').length;

  contador.className = `pill pill--${nuevas ? 'danger' : 'neutral'}`;
  contador.textContent = nuevas ? `${nuevas} ${nuevas === 1 ? 'nueva' : 'nuevas'}` : 'Al día';

  lista.innerHTML = alertas.length
    ? alertas
        .map((n) => {
          const tipo = ALERTAS[n.tipo_alerta];
          const destino = n.id_deposito ? `/deposito-detalle.html?id=${n.id_deposito}` : '#';
          return `
      <li>
        <a class="alerts__item" href="${destino}">
          <span class="alerts__icon ${tipo.modificador}">${icono(tipo.icon)}</span>
          <span class="alerts__text">
            <b>${escapar(n.tipo_alerta)}</b>
            <small>${escapar(n.mensaje)}</small>
            <em>${escapar(haceCuanto(aFecha(n.fecha_hora)).replace(/^h/, 'H'))}</em>
          </span>
        </a>
      </li>`;
        })
        .join('')
    : '<li class="alerts__empty">No hay alertas críticas.</li>';
};

const initNotificaciones = async (idUsuario) => {
  const boton = document.querySelector('.icon-button--notify');
  const panel = document.getElementById('alertas');
  const notificaciones = await obtenerNotificaciones(idUsuario);
  const sinLeer = notificaciones.filter((n) => n.estado_lectura === 'no leída').length;

  renderAlertas(notificaciones);
  if (sinLeer) {
    boton.classList.remove('icon-button--read');
    boton.setAttribute('aria-label', `Notificaciones (${sinLeer} sin leer)`);
  }

  const setAbierto = (abierto) => {
    panel.hidden = !abierto;
    boton.setAttribute('aria-expanded', String(abierto));
    if (abierto && !boton.classList.contains('icon-button--read')) {
      boton.classList.add('icon-button--read');
      boton.setAttribute('aria-label', 'Notificaciones');
      /* Marcar como leídas no debe bloquear el popover; si falla, se reintenta al volver a abrir. */
      marcarNotificacionesLeidas(idUsuario).catch(() => boton.classList.remove('icon-button--read'));
    }
  };

  boton.addEventListener('click', () => setAbierto(panel.hidden));
  document.querySelector('[data-abrir-alertas]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    setAbierto(panel.hidden);
  });
  document.addEventListener('click', (e) => {
    if (!panel.hidden && !panel.contains(e.target) && !boton.contains(e.target)) setAbierto(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) {
      setAbierto(false);
      boton.focus();
    }
  });
};

/* --------------------------------------------------------------------------
   Arranque
   -------------------------------------------------------------------------- */
/**
 * Prepara el panel. Si no hay sesión válida manda al login y regresa null;
 * si la hay, regresa el usuario con su nombre_rol.
 */
export const iniciarPanel = async () => {
  const usuario = await cargarUsuario();
  if (!usuario) {
    window.location.replace('/login.html');
    return null;
  }

  marcarNavegacion();
  renderUsuario(usuario);
  initSidebar();
  initBusqueda();
  document.querySelector('[data-cerrar-sesion]').addEventListener('click', cerrarSesion);
  await Promise.all([renderContadores(), initNotificaciones(usuario.id_usuario)]);
  return usuario;
};

/* --------------------------------------------------------------------------
   Utilidades de formularios (alta y edición)
   -------------------------------------------------------------------------- */
export const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
export const TELEFONO = /^[0-9 +()-]{10,20}$/;

/** Muestra u oculta el mensaje de error de un campo (id del error: `${input.id}-error`). */
export const setErrorCampo = (input, mensaje) => {
  const error = document.getElementById(`${input.id}-error`);
  if (error) error.textContent = mensaje;
  input.classList.toggle('field__input--invalid', Boolean(mensaje));
  input.setAttribute('aria-invalid', String(Boolean(mensaje)));
  if (mensaje && error) input.setAttribute('aria-describedby', error.id);
  else input.removeAttribute('aria-describedby');
};

/** Llena un <select> con { texto, valor }; `vacia` agrega una primera opción sin valor. */
export const llenarSelect = (select, opciones, vacia) => {
  const actual = select.value;
  select.innerHTML = '';
  if (vacia) select.add(new Option(vacia, ''));
  opciones.forEach(({ texto, valor }) => select.add(new Option(texto, valor)));
  if ([...select.options].some((o) => o.value === actual)) select.value = actual;
};

/**
 * Valida los campos con sus reglas ({ nombre: (valor) => mensaje | '' }).
 * Marca los errores y regresa el primer campo inválido (o null).
 */
export const validarCampos = (form, reglas) => {
  let primero = null;
  Object.entries(reglas).forEach(([nombre, regla]) => {
    const input = form.elements[nombre];
    if (!input || input.disabled) return;
    const mensaje = regla(typeof input.value === 'string' ? input.value.trim() : input.value);
    if (input.id) setErrorCampo(input, mensaje);
    if (mensaje && !primero) primero = input;
  });
  return primero;
};

/** Limpia el error de un campo en cuanto el usuario lo corrige. */
export const limpiarAlEditar = (form) => {
  form.querySelectorAll('.field__input').forEach((input) => {
    input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', () => {
      if (input.classList.contains('field__input--invalid')) setErrorCampo(input, '');
    });
  });
};

/** Desactiva el botón con un texto de carga mientras corre la acción. */
export const conCarga = async (boton, texto, accion) => {
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

/** Fecha de hoy en formato AAAA-MM-DD (para inputs type="date"). */
export const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Duración en minutos como "4h 18m". */
export const formatoDuracion = (minutos) =>
  `${Math.floor(minutos / 60)}h ${String(Math.round(minutos % 60)).padStart(2, '0')}m`;

/* --------------------------------------------------------------------------
   Técnicos: estado operativo y rendimiento (lista y ficha)
   -------------------------------------------------------------------------- */
export const ESTADOS_ASIGNACION_ACTIVOS = ['En camino', 'En sitio'];

/** Pill de disponibilidad: si atiende un reporte, lo muestra. */
export const disponibilidadTecnico = (tecnico, asignaciones) => {
  const activa = asignaciones.find(
    (a) => a.id_tecnico === tecnico.id_tecnico && ESTADOS_ASIGNACION_ACTIVOS.includes(a.estado),
  );
  if (activa) return { texto: `Atendiendo #REP-${activa.id_reporte}`, pill: 'warning' };
  if (tecnico.disponibilidad === 'Disponible') return { texto: 'Disponible', pill: 'success' };
  if (tecnico.disponibilidad === 'En servicio') return { texto: 'En servicio', pill: 'warning' };
  return { texto: tecnico.disponibilidad, pill: 'neutral' };
};

/** Resueltas en los últimos 30 días y efectividad (concluidas / asignadas). */
export const rendimientoTecnico = (idTecnico, asignaciones) => {
  const propias = asignaciones.filter((a) => a.id_tecnico === idTecnico);
  const concluidas = propias.filter((a) => a.estado === 'Concluida');
  const hace30 = Date.now() - 30 * 86_400_000;
  const resueltasMes = concluidas.filter((a) => a.fecha_termino && aFecha(a.fecha_termino).getTime() >= hace30).length;
  const efectividad = propias.length ? Math.round((concluidas.length / propias.length) * 100) : null;
  return { total: propias.length, concluidas: concluidas.length, resueltasMes, efectividad };
};

export const avatarVariante = (id) => (id % 4 === 0 ? '' : `avatar--${id % 4}`);

/* --------------------------------------------------------------------------
   Usuarios: rol principal y color de su etiqueta
   -------------------------------------------------------------------------- */
const PILL_ROL = { Administrador: 'success', 'Operadora central': 'info', Técnico: 'warning', Ciudadano: 'neutral' };

export const pillRol = (nombreRol) => PILL_ROL[nombreRol] ?? 'neutral';

/** Roles de cada usuario: Map(id_usuario → [Rol, ...]); el interno va primero. */
export const rolesPorUsuario = (usuarioRoles, roles) => {
  const rolPorId = new Map(roles.map((r) => [r.id_rol, r]));
  const mapa = new Map();
  usuarioRoles.forEach((ur) => {
    const rol = rolPorId.get(ur.id_rol);
    if (!rol) return;
    mapa.set(ur.id_usuario, [...(mapa.get(ur.id_usuario) ?? []), rol]);
  });
  mapa.forEach((lista) => lista.sort((a, b) => a.id_rol - b.id_rol));
  return mapa;
};
