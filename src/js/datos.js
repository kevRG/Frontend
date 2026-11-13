/**
 * Datos de AguaAlerta (simulan la base de datos).
 *
 * Cada arreglo corresponde a una tabla del modelo y sus campos usan los mismos
 * nombres que las columnas. Las páginas nunca leen los arreglos directamente:
 * siempre usan las funciones async del final, que simulan una petición a la API.
 *
 * Fechas: DATETIME → 'AAAA-MM-DD HH:MM:SS', DATE → 'AAAA-MM-DD', TIME → 'HH:MM:SS'.
 * Se calculan relativas al día actual para que la demo siempre muestre datos recientes.
 *
 * Credenciales de prueba (contrasena_hash = SHA-256 de la contraseña):
 *   Operadora central → lucia.mendoza@municipio.gob.mx / AguaAlerta#2026
 *   Técnicos           → <correo del técnico> / Tecnico#2026
 *   Usuario inactivo   → jorge.salinas@municipio.gob.mx (debe ser rechazado)
 *   Ciudadanos         → no tienen acceso al sistema interno
 *   Master key (alta de empleados) → Maestra#AguaAlerta2026
 *     Aquí solo se guarda su hash. En el backend la valida el servidor con MASTER_KEY.
 */

/* --------------------------------------------------------------------------
   Utilidades de fecha para los datos de ejemplo
   -------------------------------------------------------------------------- */
const AHORA = new Date();
const pad = (n) => String(n).padStart(2, '0');
const aFecha = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** DATE de hace `dias` días. */
const fecha = (dias) => {
  const d = new Date(AHORA);
  d.setDate(d.getDate() - dias);
  return aFecha(d);
};

/** DATETIME de hace `dias` días a la hora indicada (HH:MM). */
const fechaHora = (dias, hora) => `${fecha(dias)} ${hora}:00`;

/** DATETIME de hace `minutos` minutos. */
const haceMinutos = (minutos) => {
  const d = new Date(AHORA.getTime() - minutos * 60_000);
  return `${aFecha(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/* --------------------------------------------------------------------------
   Cambios guardados (simula que el servidor conserva lo que se crea o edita)
   Solo se guardan los registros creados o editados desde los formularios; al
   cargar, se aplican sobre los arreglos base. Los datos base viven en este archivo.
   -------------------------------------------------------------------------- */
const CLAVE_CAMBIOS = 'aguaalerta:cambios';

const leerCambios = () => {
  try {
    const guardado = JSON.parse(window.localStorage.getItem(CLAVE_CAMBIOS));
    return guardado && typeof guardado === 'object' ? guardado : {};
  } catch {
    return {};
  }
};

const cambios = leerCambios();

const guardarCambios = () => {
  try {
    window.localStorage.setItem(CLAVE_CAMBIOS, JSON.stringify(cambios));
  } catch {
    /* Sin almacenamiento disponible: los cambios duran solo esta página. */
  }
};

/** Aplica los registros guardados de una tabla (reemplaza por id o agrega). */
const aplicarCambios = (nombreTabla, tabla, campoId) => {
  Object.values(cambios[nombreTabla] ?? {}).forEach((fila) => {
    const indice = tabla.findIndex((f) => f[campoId] === fila[campoId]);
    if (indice >= 0) tabla[indice] = fila;
    else tabla.push(fila);
  });
};

/** Guarda un registro creado o editado. */
const registrarCambio = (nombreTabla, campoId, fila) => {
  cambios[nombreTabla] = { ...(cambios[nombreTabla] ?? {}), [fila[campoId]]: fila };
  guardarCambios();
};

const siguienteId = (tabla, campoId) => Math.max(0, ...tabla.map((f) => f[campoId])) + 1;

const HASH_OPERADORA = '4dde06582c15784e87b44b22627aac66c6236657845e2960c5aac10c56402049';
const HASH_TECNICO = '03ae43bba3f6b60e2786a938760279316d4ffa8ffc4ec3a4ac998a94079fad4f';
const HASH_CIUDADANO = '1514d1b184bd859d99c6b965e45f638fcc71884f7af90e1a2bfb1b47ae60ca92';
const HASH_MASTER_KEY = 'cd54abe2b10305e0f92e618043845d5e500828f8688869c818f0cd53bf644530';

/* --------------------------------------------------------------------------
   Usuarios y roles
   -------------------------------------------------------------------------- */
const roles = [
  { id_rol: 1, nombre_rol: 'Administrador', descripcion: 'Gestión total del sistema', estado: 'activo' },
  { id_rol: 2, nombre_rol: 'Operadora central', descripcion: 'Monitoreo y despacho desde el centro operativo', estado: 'activo' },
  { id_rol: 3, nombre_rol: 'Técnico', descripcion: 'Atención de reportes y mantenimiento en campo', estado: 'activo' },
  { id_rol: 4, nombre_rol: 'Ciudadano', descripcion: 'Consulta y reporte desde el portal público', estado: 'activo' },
];

const usuarios = [
  { id_usuario: 1, nombre_usuario: 'Lucía Mendoza', correo: 'lucia.mendoza@municipio.gob.mx', contrasena_hash: HASH_OPERADORA, telefono: '777 310 4521', fecha_registro: fechaHora(410, '09:00'), estado: 'activo' },
  { id_usuario: 2, nombre_usuario: 'Mario Cortés', correo: 'mario.cortes@municipio.gob.mx', contrasena_hash: HASH_TECNICO, telefono: '777 310 4602', fecha_registro: fechaHora(380, '10:15'), estado: 'activo' },
  { id_usuario: 3, nombre_usuario: 'Ana Valdés', correo: 'ana.valdes@municipio.gob.mx', contrasena_hash: HASH_TECNICO, telefono: '777 310 4603', fecha_registro: fechaHora(360, '10:20'), estado: 'activo' },
  { id_usuario: 4, nombre_usuario: 'Jorge Ríos', correo: 'jorge.rios@municipio.gob.mx', contrasena_hash: HASH_TECNICO, telefono: '777 310 4604', fecha_registro: fechaHora(355, '11:00'), estado: 'activo' },
  { id_usuario: 5, nombre_usuario: 'Sofía Lara', correo: 'sofia.lara@municipio.gob.mx', contrasena_hash: HASH_TECNICO, telefono: '777 310 4605', fecha_registro: fechaHora(300, '09:30'), estado: 'activo' },
  { id_usuario: 6, nombre_usuario: 'Iván Castillo', correo: 'ivan.castillo@municipio.gob.mx', contrasena_hash: HASH_TECNICO, telefono: '777 310 4606', fecha_registro: fechaHora(280, '12:10'), estado: 'activo' },
  { id_usuario: 7, nombre_usuario: 'Sofía Navarro', correo: 'sofia.navarro@municipio.gob.mx', contrasena_hash: HASH_TECNICO, telefono: '777 310 4607', fecha_registro: fechaHora(240, '08:45'), estado: 'activo' },
  { id_usuario: 8, nombre_usuario: 'Andrés Vega', correo: 'andres.vega@municipio.gob.mx', contrasena_hash: HASH_TECNICO, telefono: '777 310 4608', fecha_registro: fechaHora(200, '13:00'), estado: 'activo' },
  { id_usuario: 9, nombre_usuario: 'Paola Ríos', correo: 'paola.rios@municipio.gob.mx', contrasena_hash: HASH_TECNICO, telefono: '777 310 4609', fecha_registro: fechaHora(150, '09:05'), estado: 'activo' },
  { id_usuario: 10, nombre_usuario: 'Carmen López', correo: 'carmen.lopez@correo.com', contrasena_hash: HASH_CIUDADANO, telefono: '777 455 1201', fecha_registro: fechaHora(120, '18:22'), estado: 'activo' },
  { id_usuario: 11, nombre_usuario: 'Miguel Hernández', correo: 'miguel.hernandez@correo.com', contrasena_hash: HASH_CIUDADANO, telefono: '777 455 1202', fecha_registro: fechaHora(95, '20:10'), estado: 'activo' },
  { id_usuario: 12, nombre_usuario: 'Rosa Jiménez', correo: 'rosa.jimenez@correo.com', contrasena_hash: HASH_CIUDADANO, telefono: '777 455 1203', fecha_registro: fechaHora(60, '07:45'), estado: 'activo' },
  { id_usuario: 13, nombre_usuario: 'Tomás García', correo: 'tomas.garcia@correo.com', contrasena_hash: HASH_CIUDADANO, telefono: '777 455 1204', fecha_registro: fechaHora(30, '16:30'), estado: 'activo' },
  { id_usuario: 15, nombre_usuario: 'Luis Pérez', correo: 'luis.perez@municipio.gob.mx', contrasena_hash: HASH_TECNICO, telefono: '777 310 4610', fecha_registro: fechaHora(90, '09:00'), estado: 'activo' },
  { id_usuario: 14, nombre_usuario: 'Jorge Salinas', correo: 'jorge.salinas@municipio.gob.mx', contrasena_hash: HASH_OPERADORA, telefono: '777 310 4500', fecha_registro: fechaHora(600, '09:00'), estado: 'inactivo' },
];

aplicarCambios('usuarios', usuarios, 'id_usuario');

const usuarioRoles = [
  { id_usuario_rol: 1, id_usuario: 1, id_rol: 2, fecha_asignacion: fechaHora(410, '09:05') },
  { id_usuario_rol: 2, id_usuario: 2, id_rol: 3, fecha_asignacion: fechaHora(380, '10:20') },
  { id_usuario_rol: 3, id_usuario: 3, id_rol: 3, fecha_asignacion: fechaHora(360, '10:25') },
  { id_usuario_rol: 4, id_usuario: 4, id_rol: 3, fecha_asignacion: fechaHora(355, '11:05') },
  { id_usuario_rol: 5, id_usuario: 5, id_rol: 3, fecha_asignacion: fechaHora(300, '09:35') },
  { id_usuario_rol: 6, id_usuario: 6, id_rol: 3, fecha_asignacion: fechaHora(280, '12:15') },
  { id_usuario_rol: 7, id_usuario: 7, id_rol: 3, fecha_asignacion: fechaHora(240, '08:50') },
  { id_usuario_rol: 8, id_usuario: 8, id_rol: 3, fecha_asignacion: fechaHora(200, '13:05') },
  { id_usuario_rol: 9, id_usuario: 9, id_rol: 3, fecha_asignacion: fechaHora(150, '09:10') },
  { id_usuario_rol: 10, id_usuario: 10, id_rol: 4, fecha_asignacion: fechaHora(120, '18:22') },
  { id_usuario_rol: 11, id_usuario: 11, id_rol: 4, fecha_asignacion: fechaHora(95, '20:10') },
  { id_usuario_rol: 12, id_usuario: 12, id_rol: 4, fecha_asignacion: fechaHora(60, '07:45') },
  { id_usuario_rol: 13, id_usuario: 13, id_rol: 4, fecha_asignacion: fechaHora(30, '16:30') },
  { id_usuario_rol: 14, id_usuario: 14, id_rol: 1, fecha_asignacion: fechaHora(600, '09:05') },
  { id_usuario_rol: 15, id_usuario: 2, id_rol: 1, fecha_asignacion: fechaHora(380, '10:20') },
  { id_usuario_rol: 16, id_usuario: 15, id_rol: 3, fecha_asignacion: fechaHora(90, '09:05') },
];

aplicarCambios('usuarioRoles', usuarioRoles, 'id_usuario_rol');
/* Roles reemplazados desde el formulario de usuario: { id_usuario: [id_rol, ...] } */
Object.entries(cambios.rolesPorUsuario ?? {}).forEach(([idUsuario, idsRol]) => {
  const id = Number(idUsuario);
  for (let i = usuarioRoles.length - 1; i >= 0; i -= 1) {
    if (usuarioRoles[i].id_usuario === id && !idsRol.includes(usuarioRoles[i].id_rol)) usuarioRoles.splice(i, 1);
  }
});

const ciudadanos = [
  { id_ciudadano: 1, id_usuario: 10, nombre: 'Carmen', apellido_paterno: 'López', apellido_materno: 'Durán', telefono: '777 455 1201', correo: 'carmen.lopez@correo.com', fecha_registro: fechaHora(120, '18:22') },
  { id_ciudadano: 2, id_usuario: 11, nombre: 'Miguel', apellido_paterno: 'Hernández', apellido_materno: 'Sosa', telefono: '777 455 1202', correo: 'miguel.hernandez@correo.com', fecha_registro: fechaHora(95, '20:10') },
  { id_ciudadano: 3, id_usuario: 12, nombre: 'Rosa', apellido_paterno: 'Jiménez', apellido_materno: 'Mora', telefono: '777 455 1203', correo: 'rosa.jimenez@correo.com', fecha_registro: fechaHora(60, '07:45') },
  { id_ciudadano: 4, id_usuario: 13, nombre: 'Tomás', apellido_paterno: 'García', apellido_materno: 'Peña', telefono: '777 455 1204', correo: 'tomas.garcia@correo.com', fecha_registro: fechaHora(30, '16:30') },
];

const tecnicos = [
  { id_tecnico: 1, id_usuario: 2, nombre: 'Mario', apellidos: 'Cortés Ibarra', telefono: '777 310 4602', correo: 'mario.cortes@municipio.gob.mx', especialidad: 'Reparación de tuberías', fecha_contratacion: fecha(380), disponibilidad: 'En servicio' },
  { id_tecnico: 2, id_usuario: 3, nombre: 'Ana', apellidos: 'Valdés Romero', telefono: '777 310 4603', correo: 'ana.valdes@municipio.gob.mx', especialidad: 'Calibración de sensores', fecha_contratacion: fecha(360), disponibilidad: 'En servicio' },
  { id_tecnico: 3, id_usuario: 4, nombre: 'Jorge', apellidos: 'Ríos Herrera', telefono: '777 310 4604', correo: 'jorge.rios@municipio.gob.mx', especialidad: 'Operación de válvulas', fecha_contratacion: fecha(355), disponibilidad: 'Disponible' },
  { id_tecnico: 4, id_usuario: 5, nombre: 'Sofía', apellidos: 'Lara Núñez', telefono: '777 310 4605', correo: 'sofia.lara@municipio.gob.mx', especialidad: 'Diagnóstico hidráulico', fecha_contratacion: fecha(300), disponibilidad: 'Fuera de turno' },
  { id_tecnico: 5, id_usuario: 6, nombre: 'Iván', apellidos: 'Castillo Lara', telefono: '777 310 4606', correo: 'ivan.castillo@municipio.gob.mx', especialidad: 'Telemetría IoT', fecha_contratacion: fecha(280), disponibilidad: 'En servicio' },
  { id_tecnico: 6, id_usuario: 7, nombre: 'Sofía', apellidos: 'Navarro Cruz', telefono: '777 310 4607', correo: 'sofia.navarro@municipio.gob.mx', especialidad: 'Presión y bombeo', fecha_contratacion: fecha(240), disponibilidad: 'En servicio' },
  { id_tecnico: 7, id_usuario: 8, nombre: 'Andrés', apellidos: 'Vega Rojas', telefono: '777 310 4608', correo: 'andres.vega@municipio.gob.mx', especialidad: 'Fugas y tuberías', fecha_contratacion: fecha(200), disponibilidad: 'En servicio' },
  { id_tecnico: 8, id_usuario: 9, nombre: 'Paola', apellidos: 'Ríos Aguilar', telefono: '777 310 4609', correo: 'paola.rios@municipio.gob.mx', especialidad: 'Calidad del agua', fecha_contratacion: fecha(150), disponibilidad: 'En servicio' },
  { id_tecnico: 9, id_usuario: 15, nombre: 'Luis', apellidos: 'Pérez Ochoa', telefono: '777 310 4610', correo: 'luis.perez@municipio.gob.mx', especialidad: 'Reparación de tuberías', fecha_contratacion: fecha(90), disponibilidad: 'En servicio' },
];

aplicarCambios('tecnicos', tecnicos, 'id_tecnico');

/* --------------------------------------------------------------------------
   Territorio
   -------------------------------------------------------------------------- */
const colonias = [
  { id_colonia: 1, nombre_colonia: 'Centro', municipio: 'Cuernavaca', codigo_postal: '62000', descripcion: 'Zona centro y comercial', latitud: 18.946, longitud: -99.254, estado: 'activa' },
  { id_colonia: 2, nombre_colonia: 'San Baltazar', municipio: 'Cuernavaca', codigo_postal: '62030', descripcion: 'Zona habitacional oriente', latitud: 18.949, longitud: -99.2283, estado: 'activa' },
  { id_colonia: 3, nombre_colonia: 'Los Fuertes', municipio: 'Cuernavaca', codigo_postal: '62040', descripcion: 'Zona habitacional norte', latitud: 18.9545, longitud: -99.2622, estado: 'activa' },
  { id_colonia: 4, nombre_colonia: 'La Paz', municipio: 'Cuernavaca', codigo_postal: '62050', descripcion: 'Zona habitacional poniente', latitud: 18.94, longitud: -99.275, estado: 'activa' },
  { id_colonia: 5, nombre_colonia: 'Lomas del Valle', municipio: 'Cuernavaca', codigo_postal: '62060', descripcion: 'Zona habitacional sur', latitud: 18.9507, longitud: -99.2253, estado: 'activa' },
];

const viviendas = [
  { id_vivienda: 1, id_colonia: 3, id_ciudadano: 1, calle: 'Av. Reforma', numero_exterior: '184', numero_interior: null, referencia: 'Frente al parque', numero_habitantes: 4, tipo_vivienda: 'Casa' },
  { id_vivienda: 2, id_colonia: 2, id_ciudadano: 2, calle: 'Calle Fresno', numero_exterior: '22', numero_interior: null, referencia: 'Portón verde', numero_habitantes: 5, tipo_vivienda: 'Casa' },
  { id_vivienda: 3, id_colonia: 4, id_ciudadano: 3, calle: 'Priv. Norte', numero_exterior: '8', numero_interior: 'B', referencia: 'Al fondo de la privada', numero_habitantes: 3, tipo_vivienda: 'Departamento' },
  { id_vivienda: 4, id_colonia: 1, id_ciudadano: 4, calle: 'Calle Hidalgo', numero_exterior: '45', numero_interior: null, referencia: 'Junto al mercado', numero_habitantes: 6, tipo_vivienda: 'Casa' },
  { id_vivienda: 5, id_colonia: 5, id_ciudadano: 2, calle: 'Calle Encino', numero_exterior: '17', numero_interior: null, referencia: 'Esquina con Roble', numero_habitantes: 4, tipo_vivienda: 'Casa' },
];

/* --------------------------------------------------------------------------
   Infraestructura
   -------------------------------------------------------------------------- */
const fuentesAbastecimiento = [
  { id_fuente: 1, nombre_fuente: 'Pozo Profundo Norte', tipo_fuente: 'Pozo', ubicacion: 'Los Fuertes', capacidad_suministro_litros: 900000, descripcion: 'Pozo principal de la zona norte', estado: 'operativa' },
  { id_fuente: 2, nombre_fuente: 'Manantial Chapultepec', tipo_fuente: 'Manantial', ubicacion: 'San Baltazar', capacidad_suministro_litros: 850000, descripcion: 'Manantial con conducción por gravedad', estado: 'operativa' },
  { id_fuente: 3, nombre_fuente: 'Planta Potabilizadora Sur', tipo_fuente: 'Planta', ubicacion: 'Lomas del Valle', capacidad_suministro_litros: 600000, descripcion: 'Tratamiento y bombeo al sur', estado: 'operativa' },
];

const depositos = [
  { id_deposito: 1, id_colonia: 3, nombre_deposito: 'Tanque Los Fuertes', capacidad_litros: 50000, nivel_actual_litros: 9000, tipo_deposito: 'Tanque elevado', ubicacion: 'Av. Reforma y Calle 5', fecha_instalacion: fecha(2900), estado: 'operativo' },
  { id_deposito: 2, id_colonia: 2, nombre_deposito: 'Cisterna San Baltazar', capacidad_litros: 50000, nivel_actual_litros: 33500, tipo_deposito: 'Cisterna subterránea', ubicacion: 'Calle Fresno 40', fecha_instalacion: fecha(2500), estado: 'operativo' },
  { id_deposito: 3, id_colonia: 4, nombre_deposito: 'Depósito La Paz', capacidad_litros: 50000, nivel_actual_litros: 22000, tipo_deposito: 'Depósito superficial', ubicacion: 'Priv. Norte s/n', fecha_instalacion: fecha(2200), estado: 'operativo' },
  { id_deposito: 4, id_colonia: 1, nombre_deposito: 'Tanque Centro', capacidad_litros: 50000, nivel_actual_litros: 43000, tipo_deposito: 'Tanque elevado', ubicacion: 'Calle Hidalgo 10', fecha_instalacion: fecha(3100), estado: 'operativo' },
  { id_deposito: 5, id_colonia: 3, nombre_deposito: 'Cisterna Reforma', capacidad_litros: 50000, nivel_actual_litros: 36500, tipo_deposito: 'Cisterna subterránea', ubicacion: 'Av. Reforma 300', fecha_instalacion: fecha(1900), estado: 'operativo' },
  { id_deposito: 6, id_colonia: 5, nombre_deposito: 'Depósito Norte', capacidad_litros: 50000, nivel_actual_litros: 8000, tipo_deposito: 'Depósito superficial', ubicacion: 'Calle Encino 2', fecha_instalacion: fecha(1800), estado: 'operativo' },
  { id_deposito: 7, id_colonia: 1, nombre_deposito: 'Cisterna Mercado Centro', capacidad_litros: 30000, nivel_actual_litros: 21000, tipo_deposito: 'Cisterna subterránea', ubicacion: 'Mercado municipal', fecha_instalacion: fecha(2000), estado: 'operativo' },
  { id_deposito: 8, id_colonia: 2, nombre_deposito: 'Tanque Alto San Baltazar', capacidad_litros: 60000, nivel_actual_litros: 41000, tipo_deposito: 'Tanque elevado', ubicacion: 'Calle Pino 3', fecha_instalacion: fecha(2600), estado: 'operativo' },
  { id_deposito: 9, id_colonia: 2, nombre_deposito: 'Cisterna Escuela San Baltazar', capacidad_litros: 20000, nivel_actual_litros: 15000, tipo_deposito: 'Cisterna subterránea', ubicacion: 'Escuela primaria', fecha_instalacion: fecha(1500), estado: 'operativo' },
  { id_deposito: 10, id_colonia: 3, nombre_deposito: 'Tanque Bajo Los Fuertes', capacidad_litros: 40000, nivel_actual_litros: 26000, tipo_deposito: 'Depósito superficial', ubicacion: 'Calle 9 s/n', fecha_instalacion: fecha(2300), estado: 'operativo' },
  { id_deposito: 11, id_colonia: 3, nombre_deposito: 'Cisterna Los Fuertes Sur', capacidad_litros: 20000, nivel_actual_litros: 12000, tipo_deposito: 'Cisterna subterránea', ubicacion: 'Calle 2 y Reforma', fecha_instalacion: fecha(1400), estado: 'operativo' },
  { id_deposito: 12, id_colonia: 4, nombre_deposito: 'Tanque La Paz Oriente', capacidad_litros: 50000, nivel_actual_litros: 30000, tipo_deposito: 'Tanque elevado', ubicacion: 'Av. de la Paz 80', fecha_instalacion: fecha(2100), estado: 'operativo' },
  { id_deposito: 13, id_colonia: 4, nombre_deposito: 'Cisterna La Paz Poniente', capacidad_litros: 25000, nivel_actual_litros: 14000, tipo_deposito: 'Cisterna subterránea', ubicacion: 'Calle Olivo 15', fecha_instalacion: fecha(1300), estado: 'operativo' },
  { id_deposito: 14, id_colonia: 5, nombre_deposito: 'Tanque Lomas Alto', capacidad_litros: 60000, nivel_actual_litros: 45000, tipo_deposito: 'Tanque elevado', ubicacion: 'Calle Roble 50', fecha_instalacion: fecha(1900), estado: 'operativo' },
  { id_deposito: 15, id_colonia: 5, nombre_deposito: 'Cisterna Lomas Centro', capacidad_litros: 30000, nivel_actual_litros: 18000, tipo_deposito: 'Cisterna subterránea', ubicacion: 'Plaza Lomas', fecha_instalacion: fecha(1200), estado: 'operativo' },
  { id_deposito: 16, id_colonia: 1, nombre_deposito: 'Tanque Elevado Centro', capacidad_litros: 40000, nivel_actual_litros: 32000, tipo_deposito: 'Tanque elevado', ubicacion: 'Calle Juárez 5', fecha_instalacion: fecha(3300), estado: 'operativo' },
  { id_deposito: 17, id_colonia: 1, nombre_deposito: 'Cisterna Clínica Centro', capacidad_litros: 15000, nivel_actual_litros: 9000, tipo_deposito: 'Cisterna subterránea', ubicacion: 'Clínica municipal', fecha_instalacion: fecha(1100), estado: 'operativo' },
  { id_deposito: 18, id_colonia: 2, nombre_deposito: 'Tanque Mirador San Baltazar', capacidad_litros: 45000, nivel_actual_litros: 27000, tipo_deposito: 'Tanque elevado', ubicacion: 'Mirador', fecha_instalacion: fecha(2400), estado: 'operativo' },
  { id_deposito: 19, id_colonia: 2, nombre_deposito: 'Cisterna Deportivo San Baltazar', capacidad_litros: 20000, nivel_actual_litros: 11000, tipo_deposito: 'Cisterna subterránea', ubicacion: 'Unidad deportiva', fecha_instalacion: fecha(1000), estado: 'operativo' },
  { id_deposito: 20, id_colonia: 3, nombre_deposito: 'Tanque Cerro Los Fuertes', capacidad_litros: 50000, nivel_actual_litros: 33000, tipo_deposito: 'Tanque elevado', ubicacion: 'Cerro de Los Fuertes', fecha_instalacion: fecha(3000), estado: 'operativo' },
  { id_deposito: 21, id_colonia: 3, nombre_deposito: 'Cisterna Primaria Los Fuertes', capacidad_litros: 15000, nivel_actual_litros: 8000, tipo_deposito: 'Cisterna subterránea', ubicacion: 'Escuela primaria', fecha_instalacion: fecha(900), estado: 'operativo' },
  { id_deposito: 22, id_colonia: 4, nombre_deposito: 'Tanque Jardines La Paz', capacidad_litros: 55000, nivel_actual_litros: 36000, tipo_deposito: 'Tanque elevado', ubicacion: 'Calle Jardín 1', fecha_instalacion: fecha(2800), estado: 'operativo' },
  { id_deposito: 23, id_colonia: 4, nombre_deposito: 'Cisterna Mercado La Paz', capacidad_litros: 20000, nivel_actual_litros: 13000, tipo_deposito: 'Cisterna subterránea', ubicacion: 'Mercado La Paz', fecha_instalacion: fecha(800), estado: 'operativo' },
  { id_deposito: 24, id_colonia: 5, nombre_deposito: 'Tanque Lomas Poniente', capacidad_litros: 45000, nivel_actual_litros: 29000, tipo_deposito: 'Depósito superficial', ubicacion: 'Calle Cedro 30', fecha_instalacion: fecha(1700), estado: 'operativo' },
  { id_deposito: 25, id_colonia: 5, nombre_deposito: 'Cisterna Lomas Oriente', capacidad_litros: 20000, nivel_actual_litros: 10500, tipo_deposito: 'Cisterna subterránea', ubicacion: 'Calle Ciprés 12', fecha_instalacion: fecha(700), estado: 'operativo' },
];

aplicarCambios('depositos', depositos, 'id_deposito');

const abastecimientos = [
  { id_abastecimiento: 1, id_deposito: 4, id_fuente: 2, id_usuario_responsable: 1, fecha_hora: fechaHora(7, '06:00'), cantidad_litros: 1750000 },
  { id_abastecimiento: 2, id_deposito: 1, id_fuente: 1, id_usuario_responsable: 1, fecha_hora: fechaHora(6, '06:00'), cantidad_litros: 1751500 },
  { id_abastecimiento: 3, id_deposito: 2, id_fuente: 2, id_usuario_responsable: 1, fecha_hora: fechaHora(5, '06:00'), cantidad_litros: 1730000 },
  { id_abastecimiento: 4, id_deposito: 3, id_fuente: 1, id_usuario_responsable: 1, fecha_hora: fechaHora(4, '06:00'), cantidad_litros: 1780000 },
  { id_abastecimiento: 5, id_deposito: 5, id_fuente: 3, id_usuario_responsable: 1, fecha_hora: fechaHora(3, '06:00'), cantidad_litros: 1745000 },
  { id_abastecimiento: 6, id_deposito: 4, id_fuente: 2, id_usuario_responsable: 1, fecha_hora: fechaHora(2, '06:00'), cantidad_litros: 1760000 },
  { id_abastecimiento: 7, id_deposito: 1, id_fuente: 1, id_usuario_responsable: 1, fecha_hora: fechaHora(1, '05:30'), cantidad_litros: 900000 },
  { id_abastecimiento: 8, id_deposito: 2, id_fuente: 2, id_usuario_responsable: 1, fecha_hora: fechaHora(1, '07:00'), cantidad_litros: 810000 },
  { id_abastecimiento: 9, id_deposito: 1, id_fuente: 1, id_usuario_responsable: 1, fecha_hora: fechaHora(0, '00:30'), cantidad_litros: 700000 },
  { id_abastecimiento: 10, id_deposito: 2, id_fuente: 2, id_usuario_responsable: 1, fecha_hora: fechaHora(0, '00:45'), cantidad_litros: 620000 },
  { id_abastecimiento: 11, id_deposito: 5, id_fuente: 3, id_usuario_responsable: 1, fecha_hora: fechaHora(0, '01:00'), cantidad_litros: 500000 },
];

const redesHidraulicas = [
  { id_red: 1, nombre_red: 'Red troncal norte', tipo_red: 'Troncal', longitud_metros: 12400, fecha_instalacion: fecha(4200), estado: 'operativa', descripcion: 'Conduce agua de pozos a tanques elevados' },
  { id_red: 2, nombre_red: 'Red de distribución sur', tipo_red: 'Distribución', longitud_metros: 8600, fecha_instalacion: fecha(3600), estado: 'operativa', descripcion: 'Distribuye a colonias del sur' },
];

const coloniaRedes = [
  { id_colonia_red: 1, id_colonia: 1, id_red: 1 },
  { id_colonia_red: 2, id_colonia: 2, id_red: 1 },
  { id_colonia_red: 3, id_colonia: 3, id_red: 1 },
  { id_colonia_red: 4, id_colonia: 4, id_red: 2 },
  { id_colonia_red: 5, id_colonia: 5, id_red: 2 },
];

const tuberias = [
  { id_tuberia: 1, id_red: 1, codigo_tuberia: 'TB-LF-014', material: 'PVC', diametro: 6, longitud_metros: 320, fecha_instalacion: fecha(4000), estado: 'dañada', ubicacion: 'Av. Reforma, Los Fuertes' },
  { id_tuberia: 2, id_red: 1, codigo_tuberia: 'TB-SB-022', material: 'Polietileno', diametro: 4, longitud_metros: 210, fecha_instalacion: fecha(3500), estado: 'en revisión', ubicacion: 'Calle Fresno, San Baltazar' },
  { id_tuberia: 3, id_red: 2, codigo_tuberia: 'TB-LP-008', material: 'Hierro dúctil', diametro: 8, longitud_metros: 450, fecha_instalacion: fecha(3000), estado: 'operativa', ubicacion: 'Priv. Norte, La Paz' },
];

/* Dos sensores por depósito (nivel y presión). Dos sensores de presión sin conexión. */
const sensores = depositos.flatMap((d) => [
  { id_sensor: d.id_deposito * 2 - 1, id_deposito: d.id_deposito, tipo_sensor: 'Nivel ultrasónico', marca: 'Siemens', modelo: 'LUT400', fecha_instalacion: d.fecha_instalacion, ultima_conexion: haceMinutos(1), estado: 'en línea' },
  { id_sensor: d.id_deposito * 2, id_deposito: d.id_deposito, tipo_sensor: 'Presión', marca: 'WIKA', modelo: 'A-10', fecha_instalacion: d.fecha_instalacion, ultima_conexion: [5, 17].includes(d.id_deposito) ? haceMinutos(190) : haceMinutos(1), estado: [5, 17].includes(d.id_deposito) ? 'sin conexión' : 'en línea' },
]);

aplicarCambios('sensores', sensores, 'id_sensor');

/*
 * Lecturas del sensor de nivel de cada depósito: una por hora en las últimas 24 h
 * (la más reciente hace 1 min). Los depósitos críticos muestran una caída brusca.
 */
const HORAS_HISTORIAL = 24;

const porcentajeHistorico = (d, horasAtras) => {
  const actual = (d.nivel_actual_litros / d.capacidad_litros) * 100;
  if (actual < 20) {
    const caida = horasAtras >= 8 ? 30 : 0;
    return Math.min(95, actual + caida + horasAtras * 0.9);
  }
  const variacion = Math.sin((horasAtras + d.id_deposito) / 3) * 4 + horasAtras * 0.15;
  return Math.min(98, Math.max(2, actual + variacion));
};

const mediciones = depositos.flatMap((d) =>
  Array.from({ length: HORAS_HISTORIAL + 1 }, (_, horasAtras) => {
    const porcentaje = Math.round(porcentajeHistorico(d, horasAtras) * 100) / 100;
    return {
      id_medicion: d.id_deposito * 100 + horasAtras,
      id_sensor: d.id_deposito * 2 - 1,
      fecha_hora: haceMinutos(horasAtras === 0 ? 1 : horasAtras * 60),
      nivel_agua_litros: horasAtras === 0 ? d.nivel_actual_litros : Math.round((d.capacidad_litros * porcentaje) / 100),
      porcentaje_llenado: horasAtras === 0 ? Math.round((d.nivel_actual_litros / d.capacidad_litros) * 10000) / 100 : porcentaje,
      temperatura: Math.round((21.5 - Math.cos(horasAtras / 4) * 1.5) * 10) / 10,
      observaciones: null,
    };
  }),
);

/* --------------------------------------------------------------------------
   Reportes y atención
   -------------------------------------------------------------------------- */
const categoriasProblemas = [
  { id_categoria: 1, nombre_categoria: 'Tubería rota', descripcion: 'Ruptura de tubería con pérdida de agua', nivel_gravedad: 'Crítica', estado: 'activa' },
  { id_categoria: 2, nombre_categoria: 'Fuga en calle', descripcion: 'Fuga visible en vía pública', nivel_gravedad: 'Alta', estado: 'activa' },
  { id_categoria: 3, nombre_categoria: 'Baja presión', descripcion: 'El agua llega con poca presión', nivel_gravedad: 'Media', estado: 'activa' },
  { id_categoria: 4, nombre_categoria: 'Falta de agua', descripcion: 'No llega agua en el horario de tandeo', nivel_gravedad: 'Alta', estado: 'activa' },
  { id_categoria: 5, nombre_categoria: 'Contaminación', descripcion: 'Agua turbia, con olor, sabor o sedimento', nivel_gravedad: 'Media', estado: 'activa' },
];

const reportes = [
  { id_reporte: 188, id_ciudadano: 1, id_categoria: 2, id_vivienda: 1, id_tuberia: 1, titulo: 'Fuga en banqueta', descripcion: 'Fuga constante frente al domicilio.', fecha_reporte: fecha(50), hora_reporte: '08:40:00', ubicacion: 'Av. Reforma 184', fotografia: null, nivel_prioridad: 'Alta', estado: 'Cerrado' },
  { id_reporte: 189, id_ciudadano: 2, id_categoria: 3, id_vivienda: 2, id_tuberia: null, titulo: 'Poca presión en la mañana', descripcion: 'El agua apenas sube al tinaco.', fecha_reporte: fecha(40), hora_reporte: '08:10:00', ubicacion: 'Calle Fresno 22', fotografia: null, nivel_prioridad: 'Media', estado: 'Cerrado' },
  { id_reporte: 190, id_ciudadano: 3, id_categoria: 4, id_vivienda: 3, id_tuberia: null, titulo: 'Sin agua desde ayer', descripcion: 'No llegó el agua en el horario.', fecha_reporte: fecha(35), hora_reporte: '07:55:00', ubicacion: 'Priv. Norte 8', fotografia: null, nivel_prioridad: 'Alta', estado: 'Cerrado' },
  { id_reporte: 191, id_ciudadano: 4, id_categoria: 5, id_vivienda: 4, id_tuberia: null, titulo: 'Agua turbia', descripcion: 'Sale agua color café.', fecha_reporte: fecha(20), hora_reporte: '08:20:00', ubicacion: 'Calle Hidalgo 45', fotografia: null, nivel_prioridad: 'Media', estado: 'Cerrado' },
  { id_reporte: 192, id_ciudadano: 2, id_categoria: 2, id_vivienda: 5, id_tuberia: null, titulo: 'Fuga en esquina', descripcion: 'Charco permanente en la esquina.', fecha_reporte: fecha(12), hora_reporte: '08:35:00', ubicacion: 'Calle Encino 17', fotografia: null, nivel_prioridad: 'Alta', estado: 'Cerrado' },
  { id_reporte: 193, id_ciudadano: 1, id_categoria: 3, id_vivienda: 1, id_tuberia: null, titulo: 'Baja presión', descripcion: 'Presión baja toda la tarde.', fecha_reporte: fecha(8), hora_reporte: '08:05:00', ubicacion: 'Av. Reforma 184', fotografia: null, nivel_prioridad: 'Media', estado: 'Cerrado' },
  { id_reporte: 194, id_ciudadano: 1, id_categoria: 5, id_vivienda: 1, id_tuberia: null, titulo: 'Olor en el agua', descripcion: 'El agua tiene olor a cloro fuerte.', fecha_reporte: fecha(6), hora_reporte: '13:00:00', ubicacion: 'Av. Reforma 184', fotografia: null, nivel_prioridad: 'Baja', estado: 'Sin asignar' },
  { id_reporte: 195, id_ciudadano: 4, id_categoria: 3, id_vivienda: 4, id_tuberia: null, titulo: 'Presión irregular', descripcion: 'La presión sube y baja.', fecha_reporte: fecha(5), hora_reporte: '17:15:00', ubicacion: 'Calle Hidalgo 45', fotografia: null, nivel_prioridad: 'Baja', estado: 'Sin asignar' },
  { id_reporte: 196, id_ciudadano: 2, id_categoria: 5, id_vivienda: 5, id_tuberia: null, titulo: 'Sedimento en el agua', descripcion: 'Aparece arena en el filtro.', fecha_reporte: fecha(4), hora_reporte: '08:50:00', ubicacion: 'Calle Encino 17', fotografia: null, nivel_prioridad: 'Baja', estado: 'En proceso' },
  { id_reporte: 197, id_ciudadano: 3, id_categoria: 3, id_vivienda: 3, id_tuberia: 3, titulo: 'Baja presión en privada', descripcion: 'Toda la privada tiene poca presión.', fecha_reporte: fecha(4), hora_reporte: '10:30:00', ubicacion: 'Priv. Norte 8', fotografia: null, nivel_prioridad: 'Media', estado: 'Diagnóstico' },
  { id_reporte: 198, id_ciudadano: 2, id_categoria: 5, id_vivienda: 2, id_tuberia: null, titulo: 'Agua blanquecina', descripcion: 'El agua sale con burbujas.', fecha_reporte: fecha(3), hora_reporte: '11:05:00', ubicacion: 'Calle Fresno 22', fotografia: null, nivel_prioridad: 'Baja', estado: 'En proceso' },
  { id_reporte: 199, id_ciudadano: 1, id_categoria: 3, id_vivienda: 1, id_tuberia: 1, titulo: 'Presión baja en la tarde', descripcion: 'Después de las 16:00 casi no hay presión.', fecha_reporte: fecha(3), hora_reporte: '16:40:00', ubicacion: 'Av. Reforma 184', fotografia: null, nivel_prioridad: 'Media', estado: 'En proceso' },
  { id_reporte: 200, id_ciudadano: 4, id_categoria: 5, id_vivienda: 4, id_tuberia: null, titulo: 'Sabor metálico', descripcion: 'El agua tiene sabor metálico.', fecha_reporte: fecha(2), hora_reporte: '09:10:00', ubicacion: 'Calle Hidalgo 45', fotografia: null, nivel_prioridad: 'Baja', estado: 'Diagnóstico' },
  { id_reporte: 201, id_ciudadano: 4, id_categoria: 4, id_vivienda: 4, id_tuberia: null, titulo: 'Falta de agua', descripcion: 'No llegó el agua en el horario de tandeo.', fecha_reporte: fecha(1), hora_reporte: '15:31:00', ubicacion: 'Circuito Sur 114', fotografia: null, nivel_prioridad: 'Media', estado: 'Programado' },
  { id_reporte: 202, id_ciudadano: 3, id_categoria: 3, id_vivienda: 3, id_tuberia: 3, titulo: 'Baja presión', descripcion: 'La presión bajó desde la mañana.', fecha_reporte: fecha(1), hora_reporte: '18:05:00', ubicacion: 'Priv. Norte 8', fotografia: null, nivel_prioridad: 'Media', estado: 'Diagnóstico' },
  { id_reporte: 203, id_ciudadano: 2, id_categoria: 2, id_vivienda: 2, id_tuberia: 2, titulo: 'Fuga en calle', descripcion: 'Fuga que corre por toda la calle.', fecha_reporte: fecha(0), hora_reporte: '08:16:00', ubicacion: 'Calle Fresno 22', fotografia: null, nivel_prioridad: 'Alta', estado: 'En proceso' },
  { id_reporte: 204, id_ciudadano: 1, id_categoria: 1, id_vivienda: 1, id_tuberia: 1, titulo: 'Fuga abundante sobre vía principal', descripcion: 'El agua está saliendo desde una grieta visible en el pavimento y ya cubre ambos carriles.', fecha_reporte: fecha(0), hora_reporte: '09:42:00', ubicacion: 'Av. Reforma 184', fotografia: 'reportes/rep-204.jpg', nivel_prioridad: 'Crítica', estado: 'Sin asignar' },
  { id_reporte: 205, id_ciudadano: 4, id_categoria: 5, id_vivienda: 4, id_tuberia: null, titulo: 'Agua turbia', descripcion: 'El agua salió turbia en la mañana.', fecha_reporte: fecha(0), hora_reporte: '10:05:00', ubicacion: 'Calle Hidalgo 45', fotografia: null, nivel_prioridad: 'Baja', estado: 'Sin asignar' },
];

const asignaciones = [
  /* Concluidas (para el tiempo promedio de cierre) */
  { id_asignacion: 1, id_reporte: 188, id_tecnico: 1, fecha_asignacion: fechaHora(50, '09:00'), fecha_inicio: fechaHora(50, '09:40'), fecha_termino: fechaHora(50, '13:40'), observaciones: 'Se cambió el tramo dañado.', estado: 'Concluida', resultado_atencion: 'Fuga reparada' },
  { id_asignacion: 2, id_reporte: 189, id_tecnico: 2, fecha_asignacion: fechaHora(40, '09:00'), fecha_inicio: fechaHora(40, '09:30'), fecha_termino: fechaHora(40, '13:53'), observaciones: 'Se ajustó la válvula reguladora.', estado: 'Concluida', resultado_atencion: 'Presión normalizada' },
  { id_asignacion: 3, id_reporte: 190, id_tecnico: 6, fecha_asignacion: fechaHora(35, '09:00'), fecha_inicio: fechaHora(35, '09:50'), fecha_termino: fechaHora(35, '14:06'), observaciones: 'Se liberó la línea de conducción.', estado: 'Concluida', resultado_atencion: 'Suministro restablecido' },
  { id_asignacion: 4, id_reporte: 191, id_tecnico: 4, fecha_asignacion: fechaHora(20, '09:00'), fecha_inicio: fechaHora(20, '09:20'), fecha_termino: fechaHora(20, '13:00'), observaciones: 'Se purgó la red.', estado: 'Concluida', resultado_atencion: 'Agua clara' },
  { id_asignacion: 5, id_reporte: 192, id_tecnico: 3, fecha_asignacion: fechaHora(12, '09:00'), fecha_inicio: fechaHora(12, '09:35'), fecha_termino: fechaHora(12, '13:18'), observaciones: 'Se selló la unión.', estado: 'Concluida', resultado_atencion: 'Fuga reparada' },
  { id_asignacion: 6, id_reporte: 193, id_tecnico: 2, fecha_asignacion: fechaHora(8, '09:00'), fecha_inicio: fechaHora(8, '09:25'), fecha_termino: fechaHora(8, '13:36'), observaciones: 'Se limpió el filtro de la toma.', estado: 'Concluida', resultado_atencion: 'Presión normalizada' },
  /* Cuadrillas despachadas */
  { id_asignacion: 7, id_reporte: 196, id_tecnico: 8, fecha_asignacion: fechaHora(0, '07:10'), fecha_inicio: null, fecha_termino: null, observaciones: null, estado: 'En camino', resultado_atencion: null },
  { id_asignacion: 8, id_reporte: 197, id_tecnico: 6, fecha_asignacion: fechaHora(0, '07:20'), fecha_inicio: fechaHora(0, '07:55'), fecha_termino: null, observaciones: 'Medición de presión en curso.', estado: 'En sitio', resultado_atencion: null },
  { id_asignacion: 9, id_reporte: 198, id_tecnico: 9, fecha_asignacion: fechaHora(0, '07:25'), fecha_inicio: fechaHora(0, '08:00'), fecha_termino: null, observaciones: null, estado: 'En sitio', resultado_atencion: null },
  { id_asignacion: 10, id_reporte: 199, id_tecnico: 7, fecha_asignacion: fechaHora(0, '07:30'), fecha_inicio: fechaHora(0, '08:05'), fecha_termino: null, observaciones: null, estado: 'En sitio', resultado_atencion: null },
  { id_asignacion: 11, id_reporte: 200, id_tecnico: 5, fecha_asignacion: fechaHora(0, '07:40'), fecha_inicio: fechaHora(0, '08:10'), fecha_termino: null, observaciones: 'Toma de muestra.', estado: 'En sitio', resultado_atencion: null },
  { id_asignacion: 12, id_reporte: 201, id_tecnico: 3, fecha_asignacion: fechaHora(1, '16:00'), fecha_inicio: null, fecha_termino: null, observaciones: 'Visita programada para revisar la válvula de la red sur.', estado: 'Programada', resultado_atencion: null },
  { id_asignacion: 13, id_reporte: 202, id_tecnico: 1, fecha_asignacion: fechaHora(0, '08:20'), fecha_inicio: fechaHora(0, '08:45'), fecha_termino: null, observaciones: 'Revisión de válvula.', estado: 'En sitio', resultado_atencion: null },
  { id_asignacion: 14, id_reporte: 203, id_tecnico: 2, fecha_asignacion: fechaHora(0, '08:25'), fecha_inicio: fechaHora(0, '08:50'), fecha_termino: null, observaciones: 'Excavación para localizar la fuga.', estado: 'En sitio', resultado_atencion: null },
];

/* --------------------------------------------------------------------------
   Mantenimiento y notificaciones
   -------------------------------------------------------------------------- */
const mantenimientos = [
  { id_mantenimiento: 1, tipo_mantenimiento: 'Preventivo', fecha: fecha(15), costo: 8500, observaciones: 'Limpieza y desinfección de tanque.' },
  { id_mantenimiento: 2, tipo_mantenimiento: 'Correctivo', fecha: fecha(9), costo: 3200, observaciones: 'Reemplazo de sensor de presión.' },
];

const mantenimientoInfraestructura = [
  { id_mant_infra: 1, id_mantenimiento: 1, id_deposito: 4, id_sensor: null, id_red: null, id_tuberia: null },
  { id_mant_infra: 2, id_mantenimiento: 2, id_deposito: 17, id_sensor: 34, id_red: null, id_tuberia: null },
];

const notificaciones = [
  { id_notificacion: 1, id_usuario: 1, id_deposito: null, id_sensor: null, id_reporte: 204, tipo_alerta: 'Nuevo reporte', mensaje: 'Reporte #REP-204 de prioridad crítica en Los Fuertes.', fecha_hora: fechaHora(0, '09:43'), estado_lectura: 'leída' },
  { id_notificacion: 2, id_usuario: 1, id_deposito: 6, id_sensor: 11, id_reporte: null, tipo_alerta: 'Descenso repentino', mensaje: 'Depósito Norte · posible fuga mayor', fecha_hora: haceMinutos(4), estado_lectura: 'no leída' },
  { id_notificacion: 3, id_usuario: 1, id_deposito: 5, id_sensor: 10, id_reporte: null, tipo_alerta: 'Sensor sin señal', mensaje: 'Cisterna Reforma · revisar enlace', fecha_hora: haceMinutos(18), estado_lectura: 'no leída' },
];

/* --------------------------------------------------------------------------
   Acceso a datos (simula una API asíncrona)
   -------------------------------------------------------------------------- */
const LATENCIA_MS = 150;

/** Devuelve una copia del valor tras una pequeña espera, como una respuesta de red. */
const responder = (valor) =>
  new Promise((resolve) => {
    setTimeout(() => resolve(structuredClone(valor)), LATENCIA_MS);
  });

const buscarPorId = (tabla, campo, id) => responder(tabla.find((fila) => fila[campo] === Number(id)) ?? null);

/* Usuarios y roles */
export const obtenerRoles = () => responder(roles);
export const obtenerRol = (id) => buscarPorId(roles, 'id_rol', id);
export const obtenerUsuarios = () => responder(usuarios);
export const obtenerUsuario = (id) => buscarPorId(usuarios, 'id_usuario', id);
export const obtenerUsuarioRoles = (idUsuario) =>
  responder(idUsuario === undefined ? usuarioRoles : usuarioRoles.filter((ur) => ur.id_usuario === Number(idUsuario)));
export const obtenerCiudadanos = () => responder(ciudadanos);
export const obtenerCiudadano = (id) => buscarPorId(ciudadanos, 'id_ciudadano', id);
export const obtenerTecnicos = () => responder(tecnicos);
export const obtenerTecnico = (id) => buscarPorId(tecnicos, 'id_tecnico', id);

/* Territorio */
export const obtenerColonias = () => responder(colonias);
export const obtenerColonia = (id) => buscarPorId(colonias, 'id_colonia', id);
export const obtenerViviendas = () => responder(viviendas);
export const obtenerVivienda = (id) => buscarPorId(viviendas, 'id_vivienda', id);

/* Infraestructura */
export const obtenerFuentesAbastecimiento = () => responder(fuentesAbastecimiento);
export const obtenerFuenteAbastecimiento = (id) => buscarPorId(fuentesAbastecimiento, 'id_fuente', id);
export const obtenerDepositos = () => responder(depositos);
export const obtenerDeposito = (id) => buscarPorId(depositos, 'id_deposito', id);
export const obtenerAbastecimientos = () => responder(abastecimientos);
export const obtenerRedesHidraulicas = () => responder(redesHidraulicas);
export const obtenerRedHidraulica = (id) => buscarPorId(redesHidraulicas, 'id_red', id);
export const obtenerColoniaRedes = () => responder(coloniaRedes);
export const obtenerTuberias = () => responder(tuberias);
export const obtenerTuberia = (id) => buscarPorId(tuberias, 'id_tuberia', id);
export const obtenerSensores = () => responder(sensores);
export const obtenerSensor = (id) => buscarPorId(sensores, 'id_sensor', id);
export const obtenerMediciones = () => responder(mediciones);

/* Reportes y atención */
export const obtenerCategoriasProblemas = () => responder(categoriasProblemas);
export const obtenerCategoriaProblema = (id) => buscarPorId(categoriasProblemas, 'id_categoria', id);
export const obtenerReportes = () => responder(reportes);
export const obtenerReporte = (id) => buscarPorId(reportes, 'id_reporte', id);
export const obtenerAsignaciones = () => responder(asignaciones);
export const obtenerAsignacion = (id) => buscarPorId(asignaciones, 'id_asignacion', id);

/* Mantenimiento */
export const obtenerMantenimientos = () => responder(mantenimientos);
export const obtenerMantenimiento = (id) => buscarPorId(mantenimientos, 'id_mantenimiento', id);
export const obtenerMantenimientoInfraestructura = () => responder(mantenimientoInfraestructura);

/* Notificaciones */
export const obtenerNotificaciones = (idUsuario) =>
  responder(idUsuario === undefined ? notificaciones : notificaciones.filter((n) => n.id_usuario === Number(idUsuario)));

export const marcarNotificacionesLeidas = (idUsuario) => {
  notificaciones
    .filter((n) => n.id_usuario === Number(idUsuario))
    .forEach((n) => {
      n.estado_lectura = 'leída';
    });
  return responder(true);
};

/* --------------------------------------------------------------------------
   Alta de empleados con master key (simula los POST protegidos del backend)
   -------------------------------------------------------------------------- */
const sha256 = async (texto) => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

/** Agrega o reemplaza una fila en memoria y la guarda como cambio. */
const insertar = (nombreTabla, tabla, campoId, fila) => {
  const indice = tabla.findIndex((f) => f[campoId] === fila[campoId]);
  if (indice >= 0) tabla[indice] = fila;
  else tabla.push(fila);
  registrarCambio(nombreTabla, campoId, fila);
  return fila;
};

const sinHash = ({ contrasena_hash: _oculta, ...publico }) => publico;

/** Simula la validación del servidor: true si la clave es la master key. */
export const validarMasterKey = async (clave) => {
  const valida = (await sha256(clave)) === HASH_MASTER_KEY;
  return responder(valida);
};

/**
 * Registra un empleado: crea el usuario, su rol en Usuario_Roles y, si es técnico,
 * su registro en Tecnicos. Lanza un Error con mensaje si algo no es válido.
 */
export const registrarEmpleado = async (empleado, masterKey) => {
  if (!(await validarMasterKey(masterKey))) throw new Error('La master key no es válida.');

  const correo = empleado.correo.trim().toLowerCase();
  if (usuarios.some((u) => u.correo.toLowerCase() === correo)) {
    throw new Error(`Ya existe una cuenta con el correo ${correo}.`);
  }
  const rol = roles.find((r) => r.id_rol === Number(empleado.id_rol));
  if (!rol) throw new Error('El rol seleccionado no existe.');

  const ahora = haceMinutos(0);
  const usuario = {
    id_usuario: siguienteId(usuarios, 'id_usuario'),
    nombre_usuario: empleado.nombre_usuario.trim(),
    correo,
    contrasena_hash: await sha256(empleado.contrasena),
    telefono: empleado.telefono.trim() || null,
    fecha_registro: ahora,
    estado: 'activo',
  };
  insertar('usuarios', usuarios, 'id_usuario', usuario);
  insertar('usuarioRoles', usuarioRoles, 'id_usuario_rol', {
    id_usuario_rol: siguienteId(usuarioRoles, 'id_usuario_rol'),
    id_usuario: usuario.id_usuario,
    id_rol: rol.id_rol,
    fecha_asignacion: ahora,
  });

  if (rol.nombre_rol === 'Técnico') {
    const [nombre, ...apellidos] = empleado.nombre_completo.trim().split(/\s+/);
    insertar('tecnicos', tecnicos, 'id_tecnico', {
      id_tecnico: siguienteId(tecnicos, 'id_tecnico'),
      id_usuario: usuario.id_usuario,
      nombre,
      apellidos: apellidos.join(' '),
      telefono: usuario.telefono,
      correo,
      especialidad: empleado.especialidad || 'No aplica',
      fecha_contratacion: fecha(0),
      disponibilidad: empleado.disponibilidad,
    });
  }

  return responder(sinHash(usuario));
};

/* --------------------------------------------------------------------------
   Catálogos de los formularios
   -------------------------------------------------------------------------- */
const catalogos = {
  tipos_deposito: ['Tanque elevado', 'Cisterna subterránea', 'Depósito superficial'],
  estados_deposito: ['operativo', 'en mantenimiento', 'fuera de servicio'],
  /* Incluye las del formulario de alta de empleado (Tuberías, Sensores IoT, Válvulas). */
  especialidades: [
    'Reparación de tuberías',
    'Fugas y tuberías',
    'Tuberías',
    'Calibración de sensores',
    'Telemetría IoT',
    'Sensores IoT',
    'Operación de válvulas',
    'Válvulas',
    'Presión y bombeo',
    'Diagnóstico hidráulico',
    'Calidad del agua',
  ],
  disponibilidades: ['Disponible', 'En servicio', 'Fuera de turno'],
  estados_usuario: ['activo', 'inactivo'],
};

export const obtenerCatalogos = () => responder(catalogos);

/* --------------------------------------------------------------------------
   Depósitos: alta y edición
   -------------------------------------------------------------------------- */
const validarDeposito = (datos, idActual = null) => {
  if (!colonias.some((c) => c.id_colonia === Number(datos.id_colonia))) {
    throw new Error('La colonia seleccionada no existe.');
  }
  if (Number(datos.nivel_actual_litros) > Number(datos.capacidad_litros)) {
    throw new Error('El nivel actual no puede ser mayor que la capacidad.');
  }
  const nombre = datos.nombre_deposito.trim().toLowerCase();
  if (depositos.some((d) => d.nombre_deposito.toLowerCase() === nombre && d.id_deposito !== idActual)) {
    throw new Error(`Ya existe un depósito llamado ${datos.nombre_deposito.trim()}.`);
  }
};

const guardarSensorNivel = (deposito, marca, modelo) => {
  const idSensor = deposito.id_deposito * 2 - 1;
  const actual = sensores.find((s) => s.id_sensor === idSensor);
  insertar('sensores', sensores, 'id_sensor', {
    id_sensor: idSensor,
    id_deposito: deposito.id_deposito,
    tipo_sensor: 'Nivel ultrasónico',
    marca: marca.trim(),
    modelo: modelo.trim(),
    fecha_instalacion: actual?.fecha_instalacion ?? deposito.fecha_instalacion,
    ultima_conexion: actual?.ultima_conexion ?? haceMinutos(0),
    estado: actual?.estado ?? 'en línea',
  });
};

const filaDeposito = (id, datos) => ({
  id_deposito: id,
  id_colonia: Number(datos.id_colonia),
  nombre_deposito: datos.nombre_deposito.trim(),
  capacidad_litros: Number(datos.capacidad_litros),
  nivel_actual_litros: Number(datos.nivel_actual_litros),
  tipo_deposito: datos.tipo_deposito,
  ubicacion: datos.ubicacion.trim() || null,
  fecha_instalacion: datos.fecha_instalacion || fecha(0),
  estado: datos.estado || 'operativo',
});

export const crearDeposito = async (datos) => {
  validarDeposito(datos);
  const deposito = insertar('depositos', depositos, 'id_deposito', filaDeposito(siguienteId(depositos, 'id_deposito'), datos));
  guardarSensorNivel(deposito, datos.marca_sensor, datos.modelo_sensor);
  return responder(deposito);
};

export const actualizarDeposito = async (id, datos) => {
  const idDeposito = Number(id);
  if (!depositos.some((d) => d.id_deposito === idDeposito)) throw new Error('El depósito no existe.');
  validarDeposito(datos, idDeposito);
  const deposito = insertar('depositos', depositos, 'id_deposito', filaDeposito(idDeposito, datos));
  guardarSensorNivel(deposito, datos.marca_sensor, datos.modelo_sensor);
  return responder(deposito);
};

/* --------------------------------------------------------------------------
   Técnicos: alta (con master key) y edición
   -------------------------------------------------------------------------- */
const filaTecnico = (id, idUsuario, datos, fechaContratacion) => ({
  id_tecnico: id,
  id_usuario: idUsuario,
  nombre: datos.nombre.trim(),
  apellidos: datos.apellidos.trim(),
  telefono: datos.telefono.trim() || null,
  correo: datos.correo.trim().toLowerCase(),
  especialidad: datos.especialidad,
  fecha_contratacion: datos.fecha_contratacion || fechaContratacion,
  disponibilidad: datos.disponibilidad,
});

export const crearTecnico = async (datos, masterKey) => {
  if (!(await validarMasterKey(masterKey))) throw new Error('La master key no es válida.');
  const idUsuario = Number(datos.id_usuario);
  if (!usuarios.some((u) => u.id_usuario === idUsuario)) throw new Error('El usuario seleccionado no existe.');
  if (tecnicos.some((t) => t.id_usuario === idUsuario)) throw new Error('Ese usuario ya está registrado como técnico.');
  const tecnico = filaTecnico(siguienteId(tecnicos, 'id_tecnico'), idUsuario, datos, fecha(0));
  return responder(insertar('tecnicos', tecnicos, 'id_tecnico', tecnico));
};

export const actualizarTecnico = async (id, datos) => {
  const actual = tecnicos.find((t) => t.id_tecnico === Number(id));
  if (!actual) throw new Error('El técnico no existe.');
  const tecnico = filaTecnico(actual.id_tecnico, actual.id_usuario, datos, actual.fecha_contratacion);
  return responder(insertar('tecnicos', tecnicos, 'id_tecnico', tecnico));
};

/* --------------------------------------------------------------------------
   Usuarios: alta (con master key) y edición
   -------------------------------------------------------------------------- */
const validarUsuario = (datos, idActual = null) => {
  const correo = datos.correo.trim().toLowerCase();
  if (usuarios.some((u) => u.correo.toLowerCase() === correo && u.id_usuario !== idActual)) {
    throw new Error(`Ya existe una cuenta con el correo ${correo}.`);
  }
  if (!roles.some((r) => r.id_rol === Number(datos.id_rol))) throw new Error('El rol seleccionado no existe.');
};

/** Deja al usuario con un solo rol (el que se eligió en el formulario). */
const asignarRolUnico = (idUsuario, idRol) => {
  if (!usuarioRoles.some((ur) => ur.id_usuario === idUsuario && ur.id_rol === idRol)) {
    insertar('usuarioRoles', usuarioRoles, 'id_usuario_rol', {
      id_usuario_rol: siguienteId(usuarioRoles, 'id_usuario_rol'),
      id_usuario: idUsuario,
      id_rol: idRol,
      fecha_asignacion: haceMinutos(0),
    });
  }
  for (let i = usuarioRoles.length - 1; i >= 0; i -= 1) {
    if (usuarioRoles[i].id_usuario === idUsuario && usuarioRoles[i].id_rol !== idRol) usuarioRoles.splice(i, 1);
  }
  cambios.rolesPorUsuario = { ...(cambios.rolesPorUsuario ?? {}), [idUsuario]: [idRol] };
  guardarCambios();
};

export const crearUsuario = async (datos, masterKey) => {
  if (!(await validarMasterKey(masterKey))) throw new Error('La master key no es válida.');
  validarUsuario(datos);
  const usuario = insertar('usuarios', usuarios, 'id_usuario', {
    id_usuario: siguienteId(usuarios, 'id_usuario'),
    nombre_usuario: datos.nombre_usuario.trim(),
    correo: datos.correo.trim().toLowerCase(),
    contrasena_hash: await sha256(datos.contrasena),
    telefono: datos.telefono.trim() || null,
    fecha_registro: haceMinutos(0),
    estado: datos.estado,
  });
  asignarRolUnico(usuario.id_usuario, Number(datos.id_rol));
  return responder(sinHash(usuario));
};

export const actualizarUsuario = async (id, datos) => {
  const actual = usuarios.find((u) => u.id_usuario === Number(id));
  if (!actual) throw new Error('El usuario no existe.');
  validarUsuario(datos, actual.id_usuario);
  const usuario = insertar('usuarios', usuarios, 'id_usuario', {
    ...actual,
    nombre_usuario: datos.nombre_usuario.trim(),
    correo: datos.correo.trim().toLowerCase(),
    contrasena_hash: datos.contrasena ? await sha256(datos.contrasena) : actual.contrasena_hash,
    telefono: datos.telefono.trim() || null,
    estado: datos.estado,
  });
  asignarRolUnico(usuario.id_usuario, Number(datos.id_rol));
  return responder(sinHash(usuario));
};

/** Activa o desactiva una cuenta sin cambiar sus demás datos. */
export const cambiarEstadoUsuario = async (id, estado) => {
  const actual = usuarios.find((u) => u.id_usuario === Number(id));
  if (!actual) throw new Error('El usuario no existe.');
  return responder(sinHash(insertar('usuarios', usuarios, 'id_usuario', { ...actual, estado })));
};
