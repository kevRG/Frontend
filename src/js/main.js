import { obtenerUsuario, cerrarSesion } from './sesion.js'
import { puedeEntrar } from './permisos.js'

const usuario = obtenerUsuario()

if (!usuario) {
    location.replace('login.html')
    throw new Error('Sin sesión')
}

const paginaActual = location.pathname.split('/').pop().replace('.html', '')

if (!puedeEntrar(paginaActual, usuario.role)) {
    // Si el rol tampoco puede entrar al home (por ejemplo, un ciudadano), se cierra la sesión para no ciclar.
    if (paginaActual === 'home' || !puedeEntrar('home', usuario.role)) cerrarSesion()
    else location.replace('home.html')
    throw new Error('Sin permiso para esta página')
}

// El formulario de reporte no tiene menú lateral, por eso estos elementos son opcionales.
const nombreUsuario = document.querySelector('#nombre-usuario')
const avatarUsuario = document.querySelector('#avatar-usuario')
if (nombreUsuario) nombreUsuario.textContent = usuario.name
if (avatarUsuario) avatarUsuario.textContent = iniciales(usuario.name)
document.querySelector('#cerrar-sesion')?.addEventListener('click', (evento) => {
    evento.preventDefault()
    cerrarSesion()
})

/* Enlaces del menú lateral y de la barra inferior. La sección activa ya la marca app.js. */
for (const enlace of document.querySelectorAll('.sidebar__link, a.bottom-nav__item')) {
    const pagina = enlace.getAttribute('href').split('/').pop().replace('.html', '')
    if (!puedeEntrar(pagina, usuario.role)) (enlace.closest('li') ?? enlace).remove()
}

export function formatearFecha(fecha) {
    return new Date(`${fecha}T00:00`).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

export function iniciales(nombre) {
    return nombre
        .split(' ')
        .slice(0, 2)
        .map((palabra) => palabra[0])
        .join('')
        .toUpperCase()
}

export function crearEtiqueta(texto) {
    const etiqueta = document.createElement('span')
    const clase = texto.toLowerCase().replace('en ', '')
    etiqueta.className = `etiqueta etiqueta-${clase}`
    etiqueta.textContent = texto
    return etiqueta
}
