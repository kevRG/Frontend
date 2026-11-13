import { formatoLitros, iniciarPanel, llenarSelect, nivelDeposito } from './app.js';
import { obtenerCatalogos, obtenerColonias, obtenerDepositos, obtenerMediciones, obtenerSensores } from './datos.js';
import { aFecha, escapar, haceCuanto, icono, normalizar, porcentajeLlenado } from './utils.js';

/* Una caída mayor a estos puntos porcentuales en 6 h se marca como descenso acelerado. */
const CAIDA_ALERTA = 15;
const HORAS_COMPARACION = 6;

const NIVELES = [
  { valor: 'danger', texto: 'Crítico' },
  { valor: 'warning', texto: 'Atención' },
  { valor: 'ok', texto: 'Estable' },
];

const PILL_NIVEL = { danger: 'danger', warning: 'warning', ok: 'success' };

const lista = document.querySelector('[data-lista]');
const vacio = document.querySelector('[data-vacio]');
const conteo = document.querySelector('[data-conteo]');
const filtroTexto = document.querySelector('[data-filtro-texto]');
const filtroNivel = document.querySelector('[data-filtro-nivel]');
const filtroTipo = document.querySelector('[data-filtro-tipo]');

let filas = [];

/* --------------------------------------------------------------------------
   Preparación de datos
   -------------------------------------------------------------------------- */
const prepararFilas = ({ depositos, colonias, sensores, mediciones }) => {
  const coloniaPorId = new Map(colonias.map((c) => [c.id_colonia, c]));
  return depositos.map((d) => {
    const porcentaje = porcentajeLlenado(d);
    const sensorNivel = sensores.find((s) => s.id_deposito === d.id_deposito && s.tipo_sensor === 'Nivel ultrasónico');
    const lecturas = mediciones
      .filter((m) => m.id_sensor === sensorNivel?.id_sensor)
      .sort((a, b) => aFecha(b.fecha_hora) - aFecha(a.fecha_hora));
    const anterior = lecturas[HORAS_COMPARACION];
    const descenso = anterior ? anterior.porcentaje_llenado - lecturas[0].porcentaje_llenado >= CAIDA_ALERTA : false;

    return {
      deposito: d,
      colonia: coloniaPorId.get(d.id_colonia)?.nombre_colonia ?? 'Sin colonia',
      porcentaje,
      nivel: nivelDeposito(porcentaje),
      sensor: sensorNivel,
      ultimaLectura: lecturas[0] ? haceCuanto(aFecha(lecturas[0].fecha_hora)) : null,
      descenso,
    };
  });
};

/* --------------------------------------------------------------------------
   Render
   -------------------------------------------------------------------------- */
const renderResumen = ({ depositos, sensores }) => {
  const capacidad = depositos.reduce((t, d) => t + d.capacidad_litros, 0);
  const almacenado = depositos.reduce((t, d) => t + d.nivel_actual_litros, 0);
  const porcentaje = capacidad ? Math.round((almacenado / capacidad) * 1000) / 10 : 0;
  const enLinea = sensores.filter((s) => s.estado === 'en línea').length;
  const criticos = filas.filter((f) => f.nivel.clave === 'danger').length;

  document.querySelector('[data-resumen-texto]').textContent =
    `Capacidad instalada ${formatoLitros.format(capacidad)} L · Almacenamiento actual ${porcentaje}%`;

  document.querySelector('[data-resumen]').innerHTML = `
    <span class="summary__icon">${icono('database')}</span>
    <div>
      <span class="summary__label">Almacenamiento global</span>
      <span class="summary__value">${formatoLitros.format(almacenado)} L</span>
    </div>
    <div class="summary__progress">
      <div class="summary__bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${porcentaje}" aria-label="Capacidad total ocupada">
        <span class="summary__fill" style="--level: ${porcentaje}%"></span>
      </div>
      <span class="summary__caption">${porcentaje}% de capacidad total</span>
    </div>
    <div class="summary__pills">
      <span class="pill pill--success">${enLinea} sensores en línea</span>
      <span class="pill pill--${criticos ? 'danger' : 'neutral'}">${criticos} ${criticos === 1 ? 'alerta crítica' : 'alertas críticas'}</span>
    </div>`;
};

const tarjeta = ({ deposito: d, colonia, porcentaje, nivel, sensor, ultimaLectura, descenso }) => {
  const conectado = sensor?.estado === 'en línea';
  const estadoSensor = conectado ? `Conectado · ${ultimaLectura ?? 'sin lectura'}` : 'Desconectado';
  const alerta =
    nivel.clave === 'danger' || descenso
      ? `<span class="tank-card__alert">${icono('trending-down', 'icon icon--xs')} ${descenso ? 'Descenso acelerado detectado' : 'Nivel crítico · alerta de suministro'}</span>`
      : '';

  return `
    <a class="tank-card ${nivel.clave === 'danger' ? 'tank-card--critical' : ''}" href="/deposito-detalle.html?id=${d.id_deposito}">
      <div class="tank-card__head">
        <div>
          <span class="tank-card__type">${escapar(d.tipo_deposito)}</span>
          <span class="tank-card__name">${escapar(d.nombre_deposito)}</span>
        </div>
        <span class="pill pill--${PILL_NIVEL[nivel.clave]}">${nivel.texto}</span>
      </div>
      <div class="tank-card__content">
        <div class="tank-visual tank-visual--${nivel.clave}">
          <span class="tank-visual__body" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${porcentaje}" aria-label="Nivel de ${escapar(d.nombre_deposito)}">
            <span class="tank-visual__fill" style="--level: ${porcentaje}%"></span>
            <span class="tank-visual__value">${porcentaje}%</span>
          </span>
          <span class="tank-visual__caption">Nivel actual</span>
        </div>
        <div class="tank-card__data">
          <div>
            <span class="tank-card__label">Volumen actual</span>
            <span class="tank-card__value">${formatoLitros.format(d.nivel_actual_litros)} / ${formatoLitros.format(d.capacidad_litros)} L</span>
          </div>
          <div>
            <span class="tank-card__label">Sensor IoT</span>
            <span class="tank-card__value tank-card__value--${conectado ? 'online' : 'offline'}">${icono('radio', 'icon icon--xs')} ${escapar(estadoSensor)}</span>
          </div>
          <div>
            <span class="tank-card__label">Colonia</span>
            <span class="tank-card__value">${escapar(colonia)}</span>
          </div>
          ${alerta}
        </div>
      </div>
      <span class="tank-card__foot">Ver telemetría e historial ${icono('arrow-right', 'icon icon--sm')}</span>
    </a>`;
};

const renderLista = () => {
  const texto = normalizar(filtroTexto.value);
  const visibles = filas.filter(
    (f) =>
      (!texto || normalizar(`${f.deposito.nombre_deposito} ${f.colonia}`).includes(texto)) &&
      (!filtroNivel.value || f.nivel.clave === filtroNivel.value) &&
      (!filtroTipo.value || f.deposito.tipo_deposito === filtroTipo.value),
  );

  lista.innerHTML = visibles.map(tarjeta).join('');
  lista.hidden = visibles.length === 0;
  vacio.hidden = visibles.length > 0;
  conteo.textContent = `${visibles.length} de ${filas.length} depósitos`;
};

/* --------------------------------------------------------------------------
   Arranque
   -------------------------------------------------------------------------- */
const iniciar = async () => {
  if (!(await iniciarPanel())) return;

  const [depositos, colonias, sensores, mediciones, catalogos] = await Promise.all([
    obtenerDepositos(),
    obtenerColonias(),
    obtenerSensores(),
    obtenerMediciones(),
    obtenerCatalogos(),
  ]);

  filas = prepararFilas({ depositos, colonias, sensores, mediciones });
  llenarSelect(filtroNivel, NIVELES, 'Todos los niveles');
  llenarSelect(
    filtroTipo,
    catalogos.tipos_deposito.map((t) => ({ texto: t, valor: t })),
    'Todos los tipos',
  );

  renderResumen({ depositos, sensores });
  renderLista();

  filtroTexto.addEventListener('input', renderLista);
  [filtroNivel, filtroTipo].forEach((s) => s.addEventListener('change', renderLista));
  document.querySelectorAll('[data-limpiar]').forEach((boton) =>
    boton.addEventListener('click', () => {
      filtroTexto.value = '';
      filtroNivel.value = '';
      filtroTipo.value = '';
      renderLista();
      filtroTexto.focus();
    }),
  );
};

iniciar().catch(() => {
  lista.innerHTML = '<p class="empty-state__text">No pudimos cargar los depósitos. Recarga la página.</p>';
});
