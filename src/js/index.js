import {
  obtenerAbastecimientos,
  obtenerAsignaciones,
  obtenerColonias,
  obtenerDepositos,
  obtenerMediciones,
  obtenerSensores,
} from './datos.js';
import {
  UMBRAL_CRITICO,
  aFecha,
  escapar,
  haceCuanto,
  icono,
  mismoDia,
  normalizar,
  porcentajeLlenado,
  variacion,
} from './utils.js';

const formatoMillones = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });

/* --------------------------------------------------------------------------
   Cálculos
   -------------------------------------------------------------------------- */
const litrosDelDia = (abastecimientos, dia) =>
  abastecimientos
    .filter((a) => mismoDia(aFecha(a.fecha_hora), dia))
    .reduce((total, a) => total + a.cantidad_litros, 0);

const diaAnterior = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d;
};

const estadoReserva = (porcentaje) => {
  if (porcentaje >= 90) return { texto: 'Estable', modificador: 'success' };
  if (porcentaje >= 75) return { texto: 'En vigilancia', modificador: 'warning' };
  return { texto: 'Crítica', modificador: 'danger' };
};

/* --------------------------------------------------------------------------
   Render
   -------------------------------------------------------------------------- */
const renderMetricas = ({ litrosHoy, tendenciaLitros, reservaSegura, cuadrillas }) => {
  const lista = document.querySelector('[data-metricas]');
  const reserva = estadoReserva(reservaSegura);

  lista.innerHTML = `
    <li class="metric">
      <span class="metric__icon metric__icon--brand">${icono('droplet')}</span>
      <div class="metric__body">
        <span class="metric__value">${formatoMillones.format(litrosHoy)}</span>
        <span class="metric__label">litros inyectados hoy</span>
      </div>
      <span class="metric__trend">${tendenciaLitros}</span>
    </li>
    <li class="metric">
      <span class="metric__icon metric__icon--success">${icono('database')}</span>
      <div class="metric__body">
        <span class="metric__value">${reservaSegura}%</span>
        <span class="metric__label">depósitos en nivel seguro</span>
      </div>
      <span class="pill pill--${reserva.modificador} metric__pill">${reserva.texto}</span>
    </li>
    <li class="metric">
      <span class="metric__icon metric__icon--warning">${icono('user-check')}</span>
      <div class="metric__body">
        <span class="metric__value">${cuadrillas}</span>
        <span class="metric__label">cuadrillas en resolución</span>
      </div>
      <a class="metric__link" href="/login.html">
        Ver operación
        ${icono('arrow-right', 'icon icon--sm')}
      </a>
    </li>`;
};

const cargarEstado = async () => {
  const [depositos, sensores, mediciones, abastecimientos, asignaciones] = await Promise.all([
    obtenerDepositos(),
    obtenerSensores(),
    obtenerMediciones(),
    obtenerAbastecimientos(),
    obtenerAsignaciones(),
  ]);

  const seguros = depositos.filter((d) => porcentajeLlenado(d) >= UMBRAL_CRITICO).length;
  const reservaSegura = Math.round((seguros / depositos.length) * 100);

  const litrosHoy = litrosDelDia(abastecimientos, new Date());
  const litrosAyer = litrosDelDia(abastecimientos, diaAnterior(1));
  const promedioSemana =
    Array.from({ length: 7 }, (_, i) => litrosDelDia(abastecimientos, diaAnterior(i + 1))).reduce((a, b) => a + b, 0) / 7;

  const sensoresEnLinea = sensores.filter((s) => s.estado === 'en línea').length;
  const cuadrillas = asignaciones.filter((a) => ['Programada', 'En camino', 'En sitio'].includes(a.estado)).length;
  const ultimaLectura = new Date(Math.max(...mediciones.map((m) => aFecha(m.fecha_hora))));

  document.querySelector('[data-reserva]').textContent = `${reservaSegura}%`;
  document.querySelector('[data-sensores]').textContent = `${sensoresEnLinea} sensores`;
  document.querySelector('[data-flujo]').textContent = variacion(litrosHoy, promedioSemana);
  document.querySelector('[data-actualizado]').textContent = `Actualizado ${haceCuanto(ultimaLectura)}`;

  renderMetricas({ litrosHoy, tendenciaLitros: variacion(litrosHoy, litrosAyer), reservaSegura, cuadrillas });
};

/* --------------------------------------------------------------------------
   Consulta de suministro por colonia
   -------------------------------------------------------------------------- */
const form = document.querySelector('.search-card');
const input = form.querySelector('.search-card__input');
const feedback = form.querySelector('.search-card__feedback');
const SOLO_TEXTO = /^[a-zñ0-9 .]+$/;

const datosConsulta = Promise.all([obtenerColonias(), obtenerDepositos()]);

const mostrarMensaje = (mensaje, tipo) => {
  feedback.textContent = mensaje;
  feedback.classList.remove('search-card__feedback--error', 'search-card__feedback--success');
  if (tipo) feedback.classList.add(`search-card__feedback--${tipo}`);
  input.setAttribute('aria-invalid', String(tipo === 'error'));
};

const validarConsulta = (consulta) => {
  if (!consulta) return 'Escribe el nombre de tu colonia para consultar.';
  if (consulta.length < 3) return 'Escribe al menos 3 letras del nombre de la colonia.';
  if (!SOLO_TEXTO.test(consulta)) return 'El nombre de la colonia solo puede tener letras, números y espacios.';
  return '';
};

const estadoSuministro = (porcentaje) => {
  if (porcentaje >= 50) return 'Suministro normal';
  if (porcentaje >= UMBRAL_CRITICO) return 'Suministro con presión baja';
  return 'Reserva crítica, se programa tandeo';
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const consulta = normalizar(input.value).replace(/^col(onia)?\.?\s+/, '');

  const error = validarConsulta(consulta);
  if (error) {
    mostrarMensaje(error, 'error');
    input.focus();
    return;
  }

  try {
    const [colonias, depositos] = await datosConsulta;
    const colonia = colonias.find((c) => normalizar(c.nombre_colonia) === consulta);

    if (!colonia || colonia.estado !== 'activa') {
      const disponibles = colonias.filter((c) => c.estado === 'activa').map((c) => c.nombre_colonia);
      mostrarMensaje(`No encontramos esa colonia. Prueba con ${disponibles.join(', ')}.`, 'error');
      return;
    }

    const propios = depositos.filter((d) => d.id_colonia === colonia.id_colonia);
    const capacidad = propios.reduce((total, d) => total + d.capacidad_litros, 0);
    const nivel = propios.reduce((total, d) => total + d.nivel_actual_litros, 0);
    const porcentaje = capacidad ? Math.round((nivel / capacidad) * 100) : 0;
    const criticos = propios.filter((d) => porcentajeLlenado(d) < UMBRAL_CRITICO).length;

    const detalle = `Los ${propios.length} depósitos de ${colonia.nombre_colonia} están al ${porcentaje}% de su capacidad`;
    const alerta = criticos ? `; ${criticos} en nivel crítico.` : '.';
    mostrarMensaje(`${estadoSuministro(porcentaje)}. ${detalle}${alerta}`, 'success');
  } catch {
    mostrarMensaje('No pudimos consultar el suministro. Intenta de nuevo en unos minutos.', 'error');
  }
});

input.addEventListener('input', () => {
  if (feedback.textContent) mostrarMensaje('');
});

cargarEstado().catch(() => {
  document.querySelector('[data-metricas]').innerHTML =
    `<li class="metric"><span class="metric__label">${escapar('No pudimos cargar el estado de la red.')}</span></li>`;
});
