import './main.js';
import {
  conCarga,
  direccionVivienda,
  folioReporte,
  leerIdDeUrl,
  limpiarAlEditar,
  llenarSelect,
  mostrarNoEncontrado,
  setErrorCampo,
  validarCampos,
} from './app.js';
import {
  actualizarReporte,
  crearReporte,
  obtenerCategoriasProblemas,
  obtenerCiudadanos,
  obtenerColonias,
  obtenerEvidencias,
  obtenerReporte,
  obtenerViviendas,
} from './datos.js';
import { escapar, icono } from './utils.js';

const contenido = document.querySelector('[data-contenido]');
const form = document.querySelector('[data-formulario]');
const alerta = form.querySelector('[data-alerta]');
const guardar = form.querySelector('[data-guardar]');
const campos = form.elements;
const gravedades = form.querySelector('[data-gravedades]');
const errorGravedad = document.getElementById('nivel_prioridad-error');
const dropzone = form.querySelector('[data-dropzone]');
const inputFotos = form.querySelector('[data-fotos]');
const errorFotos = document.getElementById('fotos-error');
const vistaFotos = form.querySelector('[data-vista-fotos]');

form.addEventListener('submit', (event) => event.preventDefault());
guardar.disabled = true;

const MAX_FOTOS = 3;
const MAX_BYTES = 5 * 1024 * 1024;
const TIPOS_FOTO = ['image/jpeg', 'image/png'];
const LADO_MAXIMO = 1280; /* las fotos se reducen para guardarlas en el navegador */

/* La gravedad que elige quien reporta llena nivel_prioridad. "Crítica" solo aparece al editar. */
const OPCIONES_GRAVEDAD = {
  Baja: 'Flujo menor',
  Media: 'Flujo continuo',
  Alta: 'Riesgo inmediato',
  Crítica: 'Emergencia',
};

let viviendas = [];
let ciudadanoPorId = new Map();
let evidenciasActuales = [];
const fotosNuevas = [];

/* --------------------------------------------------------------------------
   Gravedad (tarjetas de opción)
   -------------------------------------------------------------------------- */
const renderGravedades = (opciones) => {
  gravedades.classList.toggle('choice-cards--4', opciones.length === 4);
  gravedades.innerHTML = opciones
    .map(
      (valor) => `
      <label class="choice-card">
        <input type="radio" name="nivel_prioridad" value="${valor}" />
        <span class="choice-card__title">${valor}</span>
        <span class="choice-card__text">${OPCIONES_GRAVEDAD[valor]}</span>
      </label>`,
    )
    .join('');
};

const gravedadElegida = () => form.querySelector('input[name="nivel_prioridad"]:checked')?.value ?? '';

/* --------------------------------------------------------------------------
   Ubicación: la colonia filtra las viviendas registradas (reporte → vivienda → colonia)
   -------------------------------------------------------------------------- */
const nombreCiudadano = (v) => {
  const c = ciudadanoPorId.get(v.id_ciudadano);
  return c ? `${c.nombre} ${c.apellido_paterno}` : 'Sin ciudadano registrado';
};

const llenarViviendas = () => {
  const idColonia = Number(campos.id_colonia.value);
  const opciones = viviendas
    .filter((v) => v.id_colonia === idColonia)
    .map((v) => ({ texto: `${direccionVivienda(v)} · ${nombreCiudadano(v)}`, valor: v.id_vivienda }));
  llenarSelect(campos.id_vivienda, opciones, idColonia ? 'Seleccionar vivienda' : 'Primero elige la colonia');
  campos.id_vivienda.disabled = !idColonia;
  mostrarVivienda();
};

const mostrarVivienda = () => {
  const hint = form.querySelector('[data-hint-id_vivienda]');
  const vivienda = viviendas.find((v) => v.id_vivienda === Number(campos.id_vivienda.value));
  hint.textContent = vivienda
    ? `Reporta: ${nombreCiudadano(vivienda)} · ${vivienda.tipo_vivienda}, ${vivienda.numero_habitantes} habitantes`
    : 'La vivienda desde la que se levanta el reporte; de ella salen el ciudadano y la colonia.';
};

/* "Calle y número" y "Referencias visuales" se guardan juntos en reporte.ubicacion: "Av. Reforma 184 (Frente al parque)". */
const unirUbicacion = (calle, referencias) => (referencias ? `${calle} (${referencias})` : calle);
const separarUbicacion = (ubicacion) => {
  const partes = /^(.*?) \(([^)]*)\)$/.exec(ubicacion ?? '');
  return partes ? { calle: partes[1], referencias: partes[2] } : { calle: ubicacion ?? '', referencias: '' };
};

/* --------------------------------------------------------------------------
   Pasos: se marcan conforme se completa cada sección
   -------------------------------------------------------------------------- */
const actualizarPasos = () => {
  const completos = [
    Boolean(campos.id_categoria.value && gravedadElegida()),
    Boolean(campos.id_colonia.value && campos.ubicacion.value.trim() && campos.id_vivienda.value),
    campos.descripcion.value.trim().length >= 10,
  ];
  completos.forEach((listo, i) => {
    document.querySelector(`[data-paso="${i + 1}"]`).classList.toggle('steps__item--done', listo);
  });
  document.querySelector('[data-pasos-texto]').textContent = `${completos.filter(Boolean).length} de 3 secciones completas`;
};

/* --------------------------------------------------------------------------
   Fotografías (tabla evidencia_reporte, hasta 3 por reporte)
   -------------------------------------------------------------------------- */
const leerImagen = (archivo) =>
  new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No pudimos leer la imagen.'));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error(`${archivo.name} no es una imagen válida.`));
      img.onload = () => {
        const escala = Math.min(1, LADO_MAXIMO / Math.max(img.width, img.height));
        const lienzo = document.createElement('canvas');
        lienzo.width = Math.round(img.width * escala);
        lienzo.height = Math.round(img.height * escala);
        lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height);
        resolve(lienzo.toDataURL('image/jpeg', 0.75));
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  });

const espacioFotos = () => MAX_FOTOS - evidenciasActuales.length - fotosNuevas.length;

const renderFotos = () => {
  const actuales = evidenciasActuales.map(
    (e) => `
      <figure class="evidence-grid__item">
        <img class="evidence-grid__img" src="${escapar(e.url_fotografia)}" alt="${escapar(e.descripcion ?? 'Evidencia guardada')}" />
        <figcaption class="evidence-grid__caption">Guardada</figcaption>
      </figure>`,
  );
  const nuevas = fotosNuevas.map(
    (f, i) => `
      <figure class="evidence-grid__item">
        <img class="evidence-grid__img" src="${f.url_fotografia}" alt="${escapar(f.descripcion)}" />
        <figcaption class="evidence-grid__caption">${escapar(f.descripcion)}</figcaption>
        <button class="evidence-grid__remove" type="button" data-quitar="${i}" aria-label="Quitar ${escapar(f.descripcion)}">${icono('x', 'icon icon--sm')}</button>
      </figure>`,
  );
  vistaFotos.innerHTML = [...actuales, ...nuevas].join('');
  const lleno = espacioFotos() <= 0;
  dropzone.setAttribute('aria-disabled', String(lleno));
  inputFotos.disabled = lleno;
};

const agregarFotos = async (archivos) => {
  errorFotos.textContent = '';
  const lista = [...archivos];
  if (lista.length > espacioFotos()) {
    errorFotos.textContent = `Puedes adjuntar hasta ${MAX_FOTOS} fotografías por reporte.`;
    lista.length = Math.max(0, espacioFotos());
  }
  for (const archivo of lista) {
    if (!TIPOS_FOTO.includes(archivo.type)) {
      errorFotos.textContent = `${archivo.name}: solo se aceptan imágenes JPG o PNG.`;
      continue;
    }
    if (archivo.size > MAX_BYTES) {
      errorFotos.textContent = `${archivo.name} pesa más de 5 MB.`;
      continue;
    }
    try {
      fotosNuevas.push({ url_fotografia: await leerImagen(archivo), descripcion: archivo.name.replace(/\.[^.]+$/, '') });
    } catch (error) {
      errorFotos.textContent = error.message;
    }
  }
  renderFotos();
};

const initFotos = () => {
  inputFotos.addEventListener('change', () => {
    agregarFotos(inputFotos.files);
    inputFotos.value = '';
  });
  ['dragenter', 'dragover'].forEach((tipo) =>
    dropzone.addEventListener(tipo, (e) => {
      e.preventDefault();
      if (espacioFotos() > 0) dropzone.classList.add('dropzone--over');
    }),
  );
  ['dragleave', 'drop'].forEach((tipo) => dropzone.addEventListener(tipo, () => dropzone.classList.remove('dropzone--over')));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (espacioFotos() > 0) agregarFotos(e.dataTransfer.files);
  });
  vistaFotos.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-quitar]');
    if (!boton) return;
    fotosNuevas.splice(Number(boton.dataset.quitar), 1);
    errorFotos.textContent = '';
    renderFotos();
  });
};

/* --------------------------------------------------------------------------
   Validación y guardado
   -------------------------------------------------------------------------- */
const reglas = {
  id_categoria: (v) => (!v ? 'Selecciona la categoría del problema.' : ''),
  id_colonia: (v) => (!v ? 'Selecciona la colonia.' : ''),
  ubicacion: (v) => (!v ? 'Escribe la calle y el número.' : v.length > 200 ? 'Máximo 200 caracteres.' : ''),
  id_vivienda: (v) => (!v ? 'Selecciona la vivienda desde la que se reporta.' : ''),
  referencias: (v) => (v.length > 50 ? 'Máximo 50 caracteres.' : ''),
  descripcion: (v) =>
    !v ? 'Describe lo que observas.' : v.length < 10 ? 'Agrega un poco más de detalle (mínimo 10 caracteres).' : '',
};

const validarGravedad = () => {
  const mensaje = gravedadElegida() ? '' : 'Elige la gravedad que percibes.';
  errorGravedad.textContent = mensaje;
  return !mensaje;
};

const modoEdicion = (reporte) => {
  const folio = folioReporte(reporte.id_reporte);
  const destino = `/reporte-detalle.html?id=${reporte.id_reporte}`;
  document.querySelector('[data-eyebrow]').textContent = `Reporte · ${folio}`;
  document.querySelector('[data-titulo]').textContent = 'Editar reporte';
  document.title = `Editar ${folio} · AguaAlerta`;
  guardar.textContent = 'Guardar cambios';
  document.querySelectorAll('[data-volver]').forEach((a) => (a.href = destino));
};

const cargarValores = (reporte) => {
  const vivienda = viviendas.find((v) => v.id_vivienda === reporte.id_vivienda);
  const { calle, referencias } = separarUbicacion(reporte.ubicacion);
  campos.id_categoria.value = reporte.id_categoria;
  campos.id_colonia.value = vivienda?.id_colonia ?? '';
  llenarViviendas();
  campos.id_vivienda.value = reporte.id_vivienda;
  campos.ubicacion.value = calle;
  campos.referencias.value = referencias;
  campos.descripcion.value = reporte.descripcion;
  const radio = form.querySelector(`input[name="nivel_prioridad"][value="${reporte.nivel_prioridad}"]`);
  if (radio) radio.checked = true;
  mostrarVivienda();
};

const iniciar = async () => {
  const id = leerIdDeUrl();
  const [categorias, colonias, listaViviendas, ciudadanos, reporte, evidencias] = await Promise.all([
    obtenerCategoriasProblemas(),
    obtenerColonias(),
    obtenerViviendas(),
    obtenerCiudadanos(),
    id ? obtenerReporte(id) : null,
    id ? obtenerEvidencias(id) : [],
  ]);

  if (new URLSearchParams(window.location.search).has('id') && !reporte) {
    mostrarNoEncontrado(contenido, {
      titulo: 'Reporte no localizado',
      texto: 'No podemos editar un reporte que no existe.',
      href: '/reportes.html',
      enlace: 'Ver todos los reportes',
    });
    return;
  }

  viviendas = listaViviendas;
  ciudadanoPorId = new Map(ciudadanos.map((c) => [c.id_ciudadano, c]));
  evidenciasActuales = evidencias;

  const activas = categorias.filter((c) => c.estado === 'activa');
  llenarSelect(campos.id_categoria, activas.map((c) => ({ texto: c.nombre_categoria, valor: c.id_categoria })), 'Selecciona una categoría');
  llenarSelect(
    campos.id_colonia,
    colonias.filter((c) => c.estado === 'activa').map((c) => ({ texto: c.nombre_colonia, valor: c.id_colonia })),
    'Selecciona la colonia',
  );
  renderGravedades(reporte ? ['Baja', 'Media', 'Alta', 'Crítica'] : ['Baja', 'Media', 'Alta']);
  llenarViviendas();

  if (reporte) {
    modoEdicion(reporte);
    cargarValores(reporte);
  }

  /* Al elegir la vivienda se propone su dirección como calle y número. */
  campos.id_colonia.addEventListener('change', llenarViviendas);
  campos.id_vivienda.addEventListener('change', () => {
    mostrarVivienda();
    const vivienda = viviendas.find((v) => v.id_vivienda === Number(campos.id_vivienda.value));
    if (vivienda && !campos.ubicacion.value.trim()) {
      campos.ubicacion.value = direccionVivienda(vivienda);
      setErrorCampo(campos.ubicacion, '');
    }
  });
  gravedades.addEventListener('change', () => {
    errorGravedad.textContent = '';
  });
  form.addEventListener('input', actualizarPasos);
  form.addEventListener('change', actualizarPasos);
  actualizarPasos();
  initFotos();
  renderFotos();
  limpiarAlEditar(form);
  guardar.disabled = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    alerta.hidden = true;

    const invalido = validarCampos(form, reglas);
    const gravedadOk = validarGravedad();
    if (invalido || !gravedadOk) {
      (invalido ?? form.querySelector('input[name="nivel_prioridad"]')).focus();
      return;
    }

    const calle = campos.ubicacion.value.trim();
    const categoria = activas.find((c) => c.id_categoria === Number(campos.id_categoria.value));
    const datos = {
      id_categoria: campos.id_categoria.value,
      id_vivienda: campos.id_vivienda.value,
      nivel_prioridad: gravedadElegida(),
      descripcion: campos.descripcion.value,
      ubicacion: unirUbicacion(calle, campos.referencias.value.trim()),
      /* reporte.titulo es obligatorio; se arma con la categoría y la calle. */
      titulo: reporte?.titulo ?? `${categoria.nombre_categoria} en ${calle}`.slice(0, 150),
    };

    try {
      const guardado = await conCarga(guardar, reporte ? 'Guardando…' : 'Enviando…', () =>
        reporte ? actualizarReporte(reporte.id_reporte, datos, fotosNuevas) : crearReporte(datos, fotosNuevas),
      );
      window.location.href = `/reporte-detalle.html?id=${guardado.id_reporte}`;
    } catch (error) {
      alerta.textContent = error.message || 'No pudimos guardar el reporte. Intenta de nuevo.';
      alerta.hidden = false;
      alerta.scrollIntoView({ block: 'center' });
    }
  });
};

iniciar().catch(() => {
  alerta.textContent = 'No pudimos cargar el formulario. Recarga la página.';
  alerta.hidden = false;
});
