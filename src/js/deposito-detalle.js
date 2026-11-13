import {
  formatoFecha,
  formatoFechaHora,
  formatoLitros,
  iniciarPanel,
  leerIdDeUrl,
  mostrarNoEncontrado,
  nivelDeposito,
  setBreadcrumb,
} from './app.js';
import {
  obtenerAbastecimientos,
  obtenerColonia,
  obtenerDeposito,
  obtenerFuentesAbastecimiento,
  obtenerMediciones,
  obtenerSensores,
  obtenerUsuarios,
} from './datos.js';
import { UMBRAL_CRITICO, aFecha, escapar, haceCuanto, icono, porcentajeLlenado } from './utils.js';

const contenedor = document.querySelector('[data-detalle]');
const PILL_NIVEL = { danger: 'danger', warning: 'warning', ok: 'success' };
const TEXTO_NIVEL = { danger: 'Nivel crítico', warning: 'Nivel en atención', ok: 'Nivel estable' };
const CAIDA_EVENTO = 10;

const codigo = (id) => `TAN-${String(id).padStart(3, '0')}`;

/* --------------------------------------------------------------------------
   Gráfica de las últimas 24 horas
   -------------------------------------------------------------------------- */
const graficaNivel = (lecturas, capacidad) => {
  if (lecturas.length < 2) return '<p class="data-table__empty">Aún no hay suficientes lecturas para graficar.</p>';

  const ancho = 700;
  const alto = 240;
  const margen = { arriba: 12, derecha: 12, abajo: 26, izquierda: 44 };
  const area = { ancho: ancho - margen.izquierda - margen.derecha, alto: alto - margen.arriba - margen.abajo };
  const inicio = aFecha(lecturas[0].fecha_hora).getTime();
  const fin = aFecha(lecturas.at(-1).fecha_hora).getTime();
  const x = (fecha) => margen.izquierda + ((aFecha(fecha).getTime() - inicio) / Math.max(1, fin - inicio)) * area.ancho;
  const y = (porcentaje) => margen.arriba + (1 - porcentaje / 100) * area.alto;

  const puntos = lecturas.map((m) => `${x(m.fecha_hora).toFixed(1)},${y(m.porcentaje_llenado).toFixed(1)}`);
  const base = y(0).toFixed(1);
  const areaPath = `M${puntos[0].split(',')[0]},${base} L${puntos.join(' L')} L${puntos.at(-1).split(',')[0]},${base} Z`;

  /* Mayor caída entre dos lecturas seguidas: posible fuga. */
  let evento = null;
  for (let i = 1; i < lecturas.length; i += 1) {
    const caida = lecturas[i - 1].porcentaje_llenado - lecturas[i].porcentaje_llenado;
    if (caida >= CAIDA_EVENTO && (!evento || caida > evento.caida)) evento = { caida, lectura: lecturas[i] };
  }

  const lineasGuia = [0, 25, 50, 75, 100]
    .map(
      (p) => `
      <line class="chart__grid" x1="${margen.izquierda}" x2="${ancho - margen.derecha}" y1="${y(p)}" y2="${y(p)}" />
      <text class="chart__axis" x="${margen.izquierda - 8}" y="${y(p) + 3}" text-anchor="end">${p}%</text>`,
    )
    .join('');

  const etiquetasX = lecturas
    .filter((_, i) => i % 6 === 0 || i === lecturas.length - 1)
    .map((m) => {
      const fecha = aFecha(m.fecha_hora);
      const texto = m === lecturas.at(-1) ? 'Ahora' : fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
      return `<text class="chart__axis" x="${x(m.fecha_hora)}" y="${alto - 6}" text-anchor="middle">${texto}</text>`;
    })
    .join('');

  const marcaEvento = evento
    ? `<circle class="chart__event" cx="${x(evento.lectura.fecha_hora)}" cy="${y(evento.lectura.porcentaje_llenado)}" r="6">
         <title>Caída abrupta: −${formatoLitros.format(Math.round((evento.caida / 100) * capacidad))} L</title>
       </circle>`
    : '';

  return `
    <svg class="chart__svg" viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="Nivel del depósito en las últimas 24 horas">
      ${lineasGuia}
      <path class="chart__area" d="${areaPath}" />
      <polyline class="chart__line" points="${puntos.join(' ')}" />
      <line class="chart__threshold" x1="${margen.izquierda}" x2="${ancho - margen.derecha}" y1="${y(UMBRAL_CRITICO)}" y2="${y(UMBRAL_CRITICO)}" />
      <text class="chart__threshold-label" x="${ancho - margen.derecha}" y="${y(UMBRAL_CRITICO) - 6}" text-anchor="end">Umbral crítico ${UMBRAL_CRITICO}%</text>
      ${marcaEvento}
      ${etiquetasX}
    </svg>
    <div class="chart__legend">
      <span>Nivel de llenado (%)</span>
      ${evento ? `<span>● Caída abrupta de ${evento.caida.toFixed(0)} puntos: posible fuga</span>` : '<span>Sin caídas abruptas en el periodo</span>'}
    </div>`;
};

/* --------------------------------------------------------------------------
   Render
   -------------------------------------------------------------------------- */
const filaSensor = (s) => `
  <div class="info-list__row"><dt class="info-list__term">Tipo</dt><dd class="info-list__value">${escapar(s.tipo_sensor)}</dd></div>
  <div class="info-list__row"><dt class="info-list__term">Marca y modelo</dt><dd class="info-list__value">${escapar(`${s.marca} ${s.modelo}`)}</dd></div>
  <div class="info-list__row"><dt class="info-list__term">Estado</dt><dd class="info-list__value"><span class="pill pill--${s.estado === 'en línea' ? 'success' : 'danger'}">${escapar(s.estado)}</span></dd></div>
  <div class="info-list__row"><dt class="info-list__term">Última conexión</dt><dd class="info-list__value">${escapar(haceCuanto(aFecha(s.ultima_conexion)))}</dd></div>`;

const filasAbastecimiento = (abastecimientos, fuentes, usuarios) => {
  if (!abastecimientos.length) {
    return '<tr><td class="data-table__empty" colspan="4">Este depósito no tiene abastecimientos registrados.</td></tr>';
  }
  const fuentePorId = new Map(fuentes.map((f) => [f.id_fuente, f]));
  const usuarioPorId = new Map(usuarios.map((u) => [u.id_usuario, u]));
  return abastecimientos
    .map((a) => {
      const fuente = fuentePorId.get(a.id_fuente);
      return `
      <tr>
        <td class="data-table__td">${escapar(formatoFechaHora.format(aFecha(a.fecha_hora)))}</td>
        <td class="data-table__td">${escapar(fuente?.nombre_fuente ?? '—')}<span class="data-table__secondary">${escapar(fuente?.tipo_fuente ?? '')}</span></td>
        <td class="data-table__td">${formatoLitros.format(a.cantidad_litros)} L</td>
        <td class="data-table__td">${escapar(usuarioPorId.get(a.id_usuario_responsable)?.nombre_usuario ?? '—')}</td>
      </tr>`;
    })
    .join('');
};

const render = ({ deposito: d, colonia, sensores, lecturas, abastecimientos, fuentes, usuarios }) => {
  const porcentaje = porcentajeLlenado(d);
  const nivel = nivelDeposito(porcentaje);
  const sensorNivel = sensores.find((s) => s.tipo_sensor === 'Nivel ultrasónico');
  const enLinea = sensorNivel?.estado === 'en línea';
  const ultima = lecturas.at(-1);

  contenedor.innerHTML = `
    <header class="page-header">
      <div>
        <p class="eyebrow">Depósito · ${codigo(d.id_deposito)}</p>
        <h1 class="page-header__title">${escapar(d.nombre_deposito)}</h1>
        <p class="page-header__text">${escapar(d.tipo_deposito)} · Colonia ${escapar(colonia?.nombre_colonia ?? 'sin asignar')} · ${ultima ? `Última lectura ${escapar(haceCuanto(aFecha(ultima.fecha_hora)))}` : 'Sin lecturas'}</p>
      </div>
      <div class="page-header__actions">
        <span class="pill pill--${enLinea ? 'success' : 'danger'}">${enLinea ? 'Sensor en línea' : 'Sensor sin conexión'}</span>
        <a class="button" href="/deposito-form.html?id=${d.id_deposito}">${icono('pencil', 'icon icon--sm')}<span>Editar depósito</span></a>
      </div>
    </header>

    <div class="detail-grid">
      <section class="card" aria-label="Nivel actual">
        <div class="level-hero">
          <div class="tank-visual tank-visual--lg tank-visual--${nivel.clave}">
            <span class="tank-visual__body" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${porcentaje}" aria-label="Nivel actual">
              <span class="tank-visual__fill" style="--level: ${porcentaje}%"></span>
              <span class="tank-visual__value">${porcentaje}%</span>
            </span>
            <span class="tank-visual__caption">Nivel actual</span>
          </div>
          <div>
            <span class="pill pill--${PILL_NIVEL[nivel.clave]}">${TEXTO_NIVEL[nivel.clave]}</span>
            <p class="level-hero__value">${formatoLitros.format(d.nivel_actual_litros)} <span class="level-hero__unit">litros</span></p>
            <p class="level-hero__text">de ${formatoLitros.format(d.capacidad_litros)} L de capacidad · Estado ${escapar(d.estado)}</p>
          </div>
        </div>
        <div class="stat-tiles">
          <div class="stat-tile"><span class="stat-tile__label">Temperatura</span><span class="stat-tile__value">${ultima ? `${ultima.temperatura} °C` : '—'}</span></div>
          <div class="stat-tile"><span class="stat-tile__label">Ubicación</span><span class="stat-tile__value stat-tile__value--text">${escapar(d.ubicacion ?? '—')}</span></div>
          <div class="stat-tile"><span class="stat-tile__label">Instalación</span><span class="stat-tile__value stat-tile__value--text">${escapar(formatoFecha.format(aFecha(d.fecha_instalacion)))}</span></div>
        </div>
      </section>

      <section class="card" aria-labelledby="sensores-titulo">
        <header class="card__header">
          <div>
            <p class="eyebrow">Sensores asociados</p>
            <h2 class="card__title" id="sensores-titulo">${sensores.length} ${sensores.length === 1 ? 'sensor' : 'sensores'} IoT</h2>
          </div>
          ${icono('radio')}
        </header>
        ${sensores.length ? sensores.map((s) => `<dl class="info-list">${filaSensor(s)}</dl>`).join('') : '<p class="data-table__empty">Sin sensores vinculados.</p>'}
      </section>
    </div>

    <section class="card" aria-labelledby="historial-titulo">
      <header class="card__header">
        <div>
          <p class="eyebrow">Histórico de nivel</p>
          <h2 class="card__title" id="historial-titulo">Comportamiento de las últimas 24 horas</h2>
        </div>
      </header>
      <div class="chart">${graficaNivel(lecturas, d.capacidad_litros)}</div>
    </section>

    <section class="card card--reports" aria-labelledby="abastecimientos-titulo">
      <header class="card__header">
        <div>
          <p class="eyebrow">Suministro</p>
          <h2 class="card__title" id="abastecimientos-titulo">Historial de abastecimientos</h2>
        </div>
      </header>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th class="data-table__th" scope="col">Fecha</th>
              <th class="data-table__th" scope="col">Fuente</th>
              <th class="data-table__th" scope="col">Litros</th>
              <th class="data-table__th" scope="col">Operador</th>
            </tr>
          </thead>
          <tbody>${filasAbastecimiento(abastecimientos, fuentes, usuarios)}</tbody>
        </table>
      </div>
    </section>`;
};

/* --------------------------------------------------------------------------
   Arranque
   -------------------------------------------------------------------------- */
const noEncontrado = () => {
  setBreadcrumb('No localizado');
  mostrarNoEncontrado(contenedor, {
    titulo: 'Depósito no localizado',
    texto: 'El depósito que buscas no existe o el enlace es incorrecto.',
    href: '/depositos.html',
    enlace: 'Ver todos los depósitos',
  });
};

const iniciar = async () => {
  if (!(await iniciarPanel())) return;

  const id = leerIdDeUrl();
  const deposito = id ? await obtenerDeposito(id) : null;
  if (!deposito) {
    noEncontrado();
    return;
  }

  const [colonia, todosSensores, mediciones, abastecimientos, fuentes, usuarios] = await Promise.all([
    obtenerColonia(deposito.id_colonia),
    obtenerSensores(),
    obtenerMediciones(),
    obtenerAbastecimientos(),
    obtenerFuentesAbastecimiento(),
    obtenerUsuarios(),
  ]);

  const sensores = todosSensores.filter((s) => s.id_deposito === deposito.id_deposito);
  const idNivel = sensores.find((s) => s.tipo_sensor === 'Nivel ultrasónico')?.id_sensor;
  const lecturas = mediciones
    .filter((m) => m.id_sensor === idNivel)
    .sort((a, b) => aFecha(a.fecha_hora) - aFecha(b.fecha_hora));

  setBreadcrumb(deposito.nombre_deposito);
  document.title = `${deposito.nombre_deposito} · AguaAlerta`;
  render({
    deposito,
    colonia,
    sensores,
    lecturas,
    abastecimientos: abastecimientos
      .filter((a) => a.id_deposito === deposito.id_deposito)
      .sort((a, b) => aFecha(b.fecha_hora) - aFecha(a.fecha_hora)),
    fuentes,
    usuarios,
  });
  contenedor.removeAttribute('aria-busy');
};

iniciar().catch(() => {
  contenedor.innerHTML = '<p class="empty-state__text">No pudimos cargar el depósito. Recarga la página.</p>';
});
