import './main.js';
import {
  conCarga,
  iniciarPanel,
  leerIdDeUrl,
  limpiarAlEditar,
  llenarSelect,
  mostrarNoEncontrado,
  nombreCompleto,
  setBreadcrumb,
  validarCampos,
} from './app.js';
import {
  actualizarVivienda,
  crearVivienda,
  obtenerCatalogos,
  obtenerCiudadanos,
  obtenerColonias,
  obtenerVivienda,
} from './datos.js';
import { escapar } from './utils.js';

/*
 * Tabla vivienda: id_colonia, id_ciudadano (opcional), calle, numero_exterior, numero_interior,
 * referencia, numero_habitantes y tipo_vivienda. El nombre del ciudadano sale de Usuarios (JOIN).
 *
 * Parámetros de la dirección:
 *   ?id=N          edita la vivienda N
 *   ?colonia=N     preselecciona la colonia
 *   ?ciudadano=N   preselecciona el ciudadano
 *   ?volver=reporte[&reporte=R]  al guardar regresa al formulario de reporte con la vivienda elegida
 */
const contenido = document.querySelector('[data-contenido]');
const form = document.querySelector('[data-formulario]');
const alerta = form.querySelector('[data-alerta]');
const guardar = form.querySelector('[data-guardar]');
const campos = form.elements;
const tipos = form.querySelector('[data-tipos]');
const errorTipo = document.getElementById('tipo_vivienda-error');

form.addEventListener('submit', (event) => event.preventDefault());
guardar.disabled = true;

const params = new URLSearchParams(window.location.search);
const volverAReporte = params.get('volver') === 'reporte';
const idReporte = Number(params.get('reporte')) || null;

let ciudadanos = [];

/** A dónde regresar al descartar o al guardar. */
const destino = (idVivienda = null) => {
  if (volverAReporte) {
    const q = new URLSearchParams();
    if (idReporte) q.set('id', idReporte);
    if (idVivienda) q.set('vivienda', idVivienda);
    const texto = q.toString();
    return `/reporte-form.html${texto ? `?${texto}` : ''}`;
  }
  if (idVivienda && params.get('ciudadano')) {
    const c = ciudadanos.find((x) => x.id_ciudadano === Number(params.get('ciudadano')));
    if (c) return `/usuario-detalle.html?id=${c.id_usuario}`;
  }
  return '/reportes.html';
};

const renderTipos = (opciones) => {
  tipos.innerHTML = opciones
    .map(
      (t) => `
      <label class="choice-card">
        <input type="radio" name="tipo_vivienda" value="${escapar(t)}" />
        <span class="choice-card__title">${escapar(t)}</span>
      </label>`,
    )
    .join('');
  tipos.addEventListener('change', () => (errorTipo.textContent = ''));
};

const mostrarCiudadano = () => {
  const c = ciudadanos.find((x) => x.id_ciudadano === Number(campos.id_ciudadano.value));
  form.querySelector('[data-hint-id_ciudadano]').textContent = c
    ? [c.telefono, c.correo].filter(Boolean).join(' · ')
    : 'Opcional: la vivienda puede registrarse sin un ciudadano.';
};

const reglas = {
  id_colonia: (v) => (!v ? 'Selecciona la colonia.' : ''),
  calle: (v) => (!v ? 'Escribe la calle.' : v.length > 150 ? 'Máximo 150 caracteres.' : ''),
  numero_exterior: (v) => (!v ? 'Escribe el número exterior.' : v.length > 20 ? 'Máximo 20 caracteres.' : ''),
  numero_interior: (v) => (v.length > 20 ? 'Máximo 20 caracteres.' : ''),
  referencia: (v) => (v.length > 255 ? 'Máximo 255 caracteres.' : ''),
  numero_habitantes: (v) => {
    const n = Number(v);
    if (!v) return 'Escribe el número de habitantes.';
    return !Number.isInteger(n) || n < 1 ? 'Debe ser un número entero de 1 o más.' : n > 100 ? 'Revisa la cantidad (máximo 100).' : '';
  },
};

const modoEdicion = (vivienda) => {
  document.querySelector('[data-titulo]').textContent = 'Editar vivienda';
  document.title = `Editar ${vivienda.calle} ${vivienda.numero_exterior} · AguaAlerta`;
  setBreadcrumb('Editar vivienda');
  guardar.textContent = 'Guardar cambios';
  ['id_colonia', 'calle', 'numero_exterior', 'numero_interior', 'referencia', 'numero_habitantes'].forEach((n) => {
    campos[n].value = vivienda[n] ?? '';
  });
  campos.id_ciudadano.value = vivienda.id_ciudadano ?? '';
  const radio = form.querySelector(`input[name="tipo_vivienda"][value="${vivienda.tipo_vivienda}"]`);
  if (radio) radio.checked = true;
};

const iniciar = async () => {
  if (!(await iniciarPanel())) return;

  const id = leerIdDeUrl();
  const [catalogos, colonias, listaCiudadanos, vivienda] = await Promise.all([
    obtenerCatalogos(),
    obtenerColonias(),
    obtenerCiudadanos(),
    id ? obtenerVivienda(id) : null,
  ]);
  ciudadanos = listaCiudadanos;

  if (params.has('id') && !vivienda) {
    setBreadcrumb('No localizado');
    mostrarNoEncontrado(contenido, {
      titulo: 'Vivienda no localizada',
      texto: 'No podemos editar una vivienda que no existe.',
      href: '/reportes.html',
      enlace: 'Ver reportes',
    });
    return;
  }

  document.querySelectorAll('[data-volver]').forEach((a) => (a.href = destino()));
  llenarSelect(
    campos.id_colonia,
    colonias.filter((c) => c.estado === 'activa').map((c) => ({ texto: c.nombre_colonia, valor: c.id_colonia })),
    'Seleccionar colonia',
  );
  llenarSelect(
    campos.id_ciudadano,
    ciudadanos
      .map((c) => ({ texto: nombreCompleto(c), valor: c.id_ciudadano }))
      .sort((a, b) => a.texto.localeCompare(b.texto, 'es')),
    'Sin ciudadano registrado',
  );
  renderTipos(catalogos.tipos_vivienda);

  if (vivienda) {
    modoEdicion(vivienda);
  } else {
    if (params.get('colonia')) campos.id_colonia.value = params.get('colonia');
    if (params.get('ciudadano')) campos.id_ciudadano.value = params.get('ciudadano');
  }
  mostrarCiudadano();
  campos.id_ciudadano.addEventListener('change', mostrarCiudadano);
  limpiarAlEditar(form);
  guardar.disabled = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    alerta.hidden = true;

    const invalido = validarCampos(form, reglas);
    const tipo = form.querySelector('input[name="tipo_vivienda"]:checked')?.value ?? '';
    errorTipo.textContent = tipo ? '' : 'Selecciona el tipo de vivienda.';
    if (invalido || !tipo) {
      (invalido ?? tipos.querySelector('input')).focus();
      return;
    }

    const datos = { ...Object.fromEntries(new FormData(form)), tipo_vivienda: tipo };
    try {
      const guardada = await conCarga(guardar, 'Guardando…', () =>
        vivienda ? actualizarVivienda(vivienda.id_vivienda, datos) : crearVivienda(datos),
      );
      window.location.href = destino(guardada.id_vivienda);
    } catch (error) {
      alerta.textContent = error.message || 'No pudimos guardar la vivienda. Intenta de nuevo.';
      alerta.hidden = false;
      alerta.scrollIntoView({ block: 'center' });
    }
  });
};

iniciar().catch(() => {
  alerta.textContent = 'No pudimos cargar el formulario. Recarga la página.';
  alerta.hidden = false;
});
