import { avatarVariante, disponibilidadTecnico, iniciales, iniciarPanel, llenarSelect, rendimientoTecnico } from './app.js';
import { obtenerAsignaciones, obtenerCatalogos, obtenerTecnicos } from './datos.js';
import { escapar, normalizar } from './utils.js';

const lista = document.querySelector('[data-lista]');
const vacio = document.querySelector('[data-vacio]');
const conteo = document.querySelector('[data-conteo]');
const filtroTexto = document.querySelector('[data-filtro-texto]');
const filtroDisponibilidad = document.querySelector('[data-filtro-disponibilidad]');

let tecnicos = [];
let asignaciones = [];

const tarjeta = (t) => {
  const nombre = `${t.nombre} ${t.apellidos}`;
  const estado = disponibilidadTecnico(t, asignaciones);
  const { resueltasMes, efectividad } = rendimientoTecnico(t.id_tecnico, asignaciones);
  return `
    <article class="person-card">
      <div class="person-card__top">
        <span class="avatar ${avatarVariante(t.id_tecnico)}" aria-hidden="true">${escapar(iniciales(nombre))}</span>
        <span class="pill pill--${estado.pill}">${escapar(estado.texto)}</span>
      </div>
      <h2 class="person-card__name">${escapar(nombre)}</h2>
      <p class="person-card__text">${escapar(t.especialidad)}</p>
      <div class="person-card__metrics">
        <div>
          <span class="person-card__metric-label">Resueltas este mes</span>
          <span class="person-card__metric-value">${resueltasMes}</span>
        </div>
        <div>
          <span class="person-card__metric-label">Efectividad</span>
          <span class="person-card__metric-value">${efectividad === null ? '—' : `${efectividad}%`}</span>
        </div>
      </div>
      <a class="person-card__link" href="/tecnico-detalle.html?id=${t.id_tecnico}">Ver perfil y asignaciones</a>
    </article>`;
};

const renderLista = () => {
  const texto = normalizar(filtroTexto.value);
  const visibles = tecnicos.filter(
    (t) =>
      (!texto || normalizar(`${t.nombre} ${t.apellidos} ${t.especialidad}`).includes(texto)) &&
      (!filtroDisponibilidad.value || t.disponibilidad === filtroDisponibilidad.value),
  );
  lista.innerHTML = visibles.map(tarjeta).join('');
  vacio.hidden = visibles.length > 0;
  conteo.textContent = `${visibles.length} de ${tecnicos.length} técnicos`;
};

const iniciar = async () => {
  if (!(await iniciarPanel())) return;

  const [listaTecnicos, listaAsignaciones, catalogos] = await Promise.all([
    obtenerTecnicos(),
    obtenerAsignaciones(),
    obtenerCatalogos(),
  ]);
  tecnicos = listaTecnicos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  asignaciones = listaAsignaciones;

  const disponibles = tecnicos.filter((t) => t.disponibilidad === 'Disponible').length;
  document.querySelector('[data-resumen-texto]').textContent =
    `Disponibilidad y desempeño del personal operativo · ${disponibles} de ${tecnicos.length} disponibles`;

  llenarSelect(
    filtroDisponibilidad,
    catalogos.disponibilidades.map((d) => ({ texto: d, valor: d })),
    'Toda disponibilidad',
  );
  renderLista();

  filtroTexto.addEventListener('input', renderLista);
  filtroDisponibilidad.addEventListener('change', renderLista);
  document.querySelectorAll('[data-limpiar]').forEach((boton) =>
    boton.addEventListener('click', () => {
      filtroTexto.value = '';
      filtroDisponibilidad.value = '';
      renderLista();
      filtroTexto.focus();
    }),
  );
};

iniciar().catch(() => {
  lista.innerHTML = '<p class="empty-state__text">No pudimos cargar a los técnicos. Recarga la página.</p>';
});
