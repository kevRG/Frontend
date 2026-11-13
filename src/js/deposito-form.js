import {
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
  actualizarDeposito,
  crearDeposito,
  obtenerCatalogos,
  obtenerColonias,
  obtenerDeposito,
  obtenerSensores,
} from './datos.js';

const contenido = document.querySelector('[data-contenido]');
const form = document.querySelector('[data-formulario]');
const alerta = form.querySelector('[data-alerta]');
const guardar = form.querySelector('[data-guardar]');
const campos = form.elements;

/* El formulario se procesa con JS: mientras carga, no se envía de forma nativa. */
form.addEventListener('submit', (event) => event.preventDefault());
guardar.disabled = true;
const MAX_LITROS = 10_000_000;

let colonias = [];

const mostrarCoordenadas = () => {
  const hint = form.querySelector('[data-hint-id_colonia]');
  const colonia = colonias.find((c) => c.id_colonia === Number(campos.id_colonia.value));
  hint.textContent = colonia ? `Coordenadas de la colonia: ${colonia.latitud}, ${colonia.longitud}` : '';
};

const reglas = (catalogos) => ({
  nombre_deposito: (v) => (!v ? 'Escribe el nombre del depósito.' : v.length > 100 ? 'Máximo 100 caracteres.' : ''),
  tipo_deposito: (v) => (!catalogos.tipos_deposito.includes(v) ? 'Selecciona el tipo de depósito.' : ''),
  estado: (v) => (!catalogos.estados_deposito.includes(v) ? 'Selecciona el estado operativo.' : ''),
  capacidad_litros: (v) => {
    const n = Number(v);
    if (!v) return 'Escribe la capacidad en litros.';
    if (!Number.isInteger(n) || n <= 0) return 'Debe ser un número entero mayor a 0.';
    return n > MAX_LITROS ? 'La capacidad máxima es de 10,000,000 L.' : '';
  },
  nivel_actual_litros: (v) => {
    const n = Number(v);
    if (v === '') return 'Escribe el nivel actual en litros.';
    if (!Number.isInteger(n) || n < 0) return 'Debe ser un número entero de 0 o más.';
    return n > Number(campos.capacidad_litros.value) ? 'No puede ser mayor que la capacidad.' : '';
  },
  fecha_instalacion: (v) => (v && v > hoyISO() ? 'La fecha no puede ser futura.' : ''),
  id_colonia: (v) => (!v ? 'Selecciona la colonia abastecida.' : ''),
  ubicacion: (v) => (v.length > 255 ? 'Máximo 255 caracteres.' : ''),
  marca_sensor: (v) => (!v ? 'Escribe la marca del sensor.' : v.length > 50 ? 'Máximo 50 caracteres.' : ''),
  modelo_sensor: (v) => (!v ? 'Escribe el modelo del sensor.' : v.length > 50 ? 'Máximo 50 caracteres.' : ''),
});

const cargarValores = (deposito, sensor) => {
  ['nombre_deposito', 'tipo_deposito', 'estado', 'capacidad_litros', 'nivel_actual_litros', 'fecha_instalacion', 'id_colonia'].forEach(
    (nombre) => {
      campos[nombre].value = deposito[nombre] ?? '';
    },
  );
  campos.ubicacion.value = deposito.ubicacion ?? '';
  campos.marca_sensor.value = sensor?.marca ?? '';
  campos.modelo_sensor.value = sensor?.modelo ?? '';
};

const modoEdicion = (deposito) => {
  const destino = `/deposito-detalle.html?id=${deposito.id_deposito}`;
  document.querySelector('[data-titulo]').textContent = 'Editar depósito';
  document.title = `Editar ${deposito.nombre_deposito} · AguaAlerta`;
  setBreadcrumb('Editar depósito');
  guardar.textContent = 'Guardar cambios';
  document.querySelectorAll('[data-volver]').forEach((a) => (a.href = destino));
};

const iniciar = async () => {
  if (!(await iniciarPanel())) return;

  const id = leerIdDeUrl();
  const [catalogos, listaColonias, deposito, sensores] = await Promise.all([
    obtenerCatalogos(),
    obtenerColonias(),
    id ? obtenerDeposito(id) : null,
    id ? obtenerSensores() : [],
  ]);

  if (new URLSearchParams(window.location.search).has('id') && !deposito) {
    setBreadcrumb('No localizado');
    mostrarNoEncontrado(contenido, {
      titulo: 'Depósito no localizado',
      texto: 'No podemos editar un depósito que no existe.',
      href: '/depositos.html',
      enlace: 'Ver todos los depósitos',
    });
    return;
  }

  colonias = listaColonias.filter((c) => c.estado === 'activa');
  llenarSelect(campos.tipo_deposito, catalogos.tipos_deposito.map((t) => ({ texto: t, valor: t })), 'Seleccionar tipo');
  llenarSelect(campos.estado, catalogos.estados_deposito.map((e) => ({ texto: e[0].toUpperCase() + e.slice(1), valor: e })));
  llenarSelect(campos.id_colonia, colonias.map((c) => ({ texto: c.nombre_colonia, valor: c.id_colonia })), 'Seleccionar colonia');
  campos.fecha_instalacion.max = hoyISO();

  if (deposito) {
    modoEdicion(deposito);
    const sensor = sensores.find((s) => s.id_deposito === deposito.id_deposito && s.tipo_sensor === 'Nivel ultrasónico');
    cargarValores(deposito, sensor);
  }
  mostrarCoordenadas();
  campos.id_colonia.addEventListener('change', mostrarCoordenadas);
  limpiarAlEditar(form);
  guardar.disabled = false;

  const reglasForm = reglas(catalogos);
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
        deposito ? actualizarDeposito(deposito.id_deposito, datos) : crearDeposito(datos),
      );
      window.location.href = `/deposito-detalle.html?id=${guardado.id_deposito}`;
    } catch (error) {
      alerta.textContent = error.message || 'No pudimos guardar el depósito. Intenta de nuevo.';
      alerta.hidden = false;
      alerta.scrollIntoView({ block: 'center' });
    }
  });
};

iniciar().catch(() => {
  alerta.textContent = 'No pudimos cargar el formulario. Recarga la página.';
  alerta.hidden = false;
});
