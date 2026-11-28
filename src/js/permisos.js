/* Roles del personal que puede usar el sistema interno (en minúsculas, como se registran en el API).
   Los ciudadanos no tienen acceso al panel. */
const PERSONAL = ['administrador', 'tecnico']

export const permisos = {
    home: PERSONAL,
    depositos: PERSONAL,
    'deposito-detalle': PERSONAL,
    'deposito-form': ['administrador'],
    tecnicos: PERSONAL,
    'tecnico-detalle': PERSONAL,
    'tecnico-form': ['administrador'],
    reportes: PERSONAL,
    'reporte-detalle': PERSONAL,
    'reporte-form': ['administrador'],
    'vivienda-form': ['administrador'],
    usuarios: ['administrador'],
    'registro-empleado': ['administrador'],
    'usuario-detalle': ['administrador'],
    'usuario-form': ['administrador'],
}

export function puedeEntrar(pagina, rol) {
    const roles = permisos[pagina]
    return !roles || roles.includes(rol)
}
