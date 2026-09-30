import { PrismaClient, DiaSemana, EstadoMatricula } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CARRERAS_TECSUP = [
  { codigo: 'C1', nombre: 'Procesos Químicos y Metalúrgicos' },
  { codigo: 'C5', nombre: 'Electrónica y Automatización Industrial' },
  { codigo: 'C11', nombre: 'Operaciones Mineras' },
  { codigo: 'C12', nombre: 'Producción y Gestión Industrial' },
  { codigo: 'C14', nombre: 'Aviónica y Mecánica Aeronáutica' },
  { codigo: 'C16', nombre: 'Mecatrónica Industrial' },
  { codigo: 'C20', nombre: 'Administración de Redes y Comunicaciones' },
  { codigo: 'C21', nombre: 'Mantenimiento de Maquinaria Pesada' },
  { codigo: 'C22', nombre: 'Mantenimiento de Maquinaria de Planta' },
  { codigo: 'C23', nombre: 'Electricidad Industrial' },
  { codigo: 'C24', nombre: 'Diseño y Desarrollo de Software' },
  { codigo: 'C25', nombre: 'Diseño Industrial' },
  { codigo: 'C26', nombre: 'Diseño y Desarrollo de Videojuegos' },
  { codigo: 'C28', nombre: 'Big data y Ciencia de Datos' },
  { codigo: 'D12', nombre: 'Ciencia de Datos' },
  { codigo: 'D13', nombre: 'Logística Digital' },
  { codigo: 'D14', nombre: 'Modelado y Animación Digital' },
];

async function main() {
  console.log('🌱 Iniciando carga de datos de prueba para Tecsup (StarTec)...');

  // Limpieza en orden relacional
  await prisma.pago.deleteMany();
  await prisma.sesionHorario.deleteMany();
  await prisma.estudiante.deleteMany();
  await prisma.seccion.deleteMany();
  await prisma.curso.deleteMany();
  await prisma.carrera.deleteMany();

  // 1. Crear el catálogo completo de carreras Tecsup
  const carrerasMap = new Map<string, any>();

  for (const c of CARRERAS_TECSUP) {
    const carreraCreada = await prisma.carrera.create({
      data: {
        codigo: c.codigo,
        nombre: c.nombre,
        sede: 'Lima - Santa Anita',
        totalCiclos: 6,
      },
    });
    carrerasMap.set(c.codigo, carreraCreada);
  }
  console.log(`✅ Catálogo de ${CARRERAS_TECSUP.length} carreras creado exitosamente`);

  const carreraC24 = carrerasMap.get('C24');
  const carreraC12 = carrerasMap.get('C12');
  const carreraC14 = carrerasMap.get('C14');

  // 2. Crear Cursos del 1er Ciclo para C24
  const cursosData = [
    {
      codigo: 'CS101',
      nombre: 'Fundamentos de Programación',
      ciclo: 1,
      creditos: 4,
      horasSemanales: 6,
      tipoCompetencia: 'Específica técnica',
      carreraId: carreraC24.id,
    },
    {
      codigo: 'CS102',
      nombre: 'Modelado y Diseño de Base de Datos',
      ciclo: 1,
      creditos: 4,
      horasSemanales: 5,
      tipoCompetencia: 'Específica técnica',
      carreraId: carreraC24.id,
    },
    {
      codigo: 'CS103',
      nombre: 'Arquitectura y Organización de Computadoras',
      ciclo: 1,
      creditos: 3,
      horasSemanales: 4,
      tipoCompetencia: 'Específica técnica',
      carreraId: carreraC24.id,
    },
    {
      codigo: 'EG101',
      nombre: 'Comunicación y Redacción Efectiva',
      ciclo: 1,
      creditos: 3,
      horasSemanales: 4,
      tipoCompetencia: 'Empleabilidad',
      carreraId: carreraC24.id,
    },
    {
      codigo: 'MA101',
      nombre: 'Matemática Aplicada a la Computación',
      ciclo: 1,
      creditos: 4,
      horasSemanales: 5,
      tipoCompetencia: 'Específica técnica',
      carreraId: carreraC24.id,
    },
  ];

  const cursos = [];
  for (const c of cursosData) {
    const curso = await prisma.curso.create({ data: c });
    cursos.push(curso);
  }
  console.log(`✅ ${cursos.length} cursos de 1er ciclo creados para C24`);

  // 3. Crear Sección 1A para C24
  const seccion = await prisma.seccion.create({
    data: {
      carreraId: carreraC24.id,
      ciclo: 1,
      codigoSeccion: '1A',
      periodo: '2026-1',
      aulaBase: 'Pabellón B - Aula 204',
    },
  });

  // 3.1 Crear Secciones 1A para C12 y C14
  await prisma.seccion.create({
    data: {
      carreraId: carreraC12.id,
      ciclo: 1,
      codigoSeccion: '1A',
      periodo: '2026-1',
      aulaBase: 'Pabellón C - Aula 301',
    },
  });
  console.log(`✅ Sección 1A creada para C12`);

  await prisma.seccion.create({
    data: {
      carreraId: carreraC14.id,
      ciclo: 1,
      codigoSeccion: '1A',
      periodo: '2026-1',
      aulaBase: 'Pabellón M - Taller 102',
    },
  });
  console.log(`✅ Sección 1A creada para C14`);

  // 4. Detalle de Horarios Semanales (Lunes a Viernes) para la sección 1A de C24
  const horariosData = [
    {
      seccionId: seccion.id,
      cursoId: cursos.find((c) => c.codigo === 'CS101')!.id,
      dia: DiaSemana.LUNES,
      horaInicio: '08:00',
      horaFin: '11:00',
      aula: 'Lab 302',
      docente: 'Ing. Carlos Mendoza',
    },
    {
      seccionId: seccion.id,
      cursoId: cursos.find((c) => c.codigo === 'CS102')!.id,
      dia: DiaSemana.MARTES,
      horaInicio: '08:00',
      horaFin: '10:30',
      aula: 'Lab 304',
      docente: 'Ing. Patricia Ramos',
    },
    {
      seccionId: seccion.id,
      cursoId: cursos.find((c) => c.codigo === 'MA101')!.id,
      dia: DiaSemana.MIERCOLES,
      horaInicio: '08:00',
      horaFin: '11:00',
      aula: 'Pabellón B - Aula 204',
      docente: 'Lic. Roberto Gómez',
    },
    {
      seccionId: seccion.id,
      cursoId: cursos.find((c) => c.codigo === 'CS103')!.id,
      dia: DiaSemana.JUEVES,
      horaInicio: '08:00',
      horaFin: '10:30',
      aula: 'Lab 201',
      docente: 'Ing. Fernando Alva',
    },
    {
      seccionId: seccion.id,
      cursoId: cursos.find((c) => c.codigo === 'EG101')!.id,
      dia: DiaSemana.VIERNES,
      horaInicio: '08:00',
      horaFin: '10:30',
      aula: 'Pabellón B - Aula 204',
      docente: 'Mg. Carmen Torres',
    },
  ];

  for (const h of horariosData) {
    await prisma.sesionHorario.create({ data: h });
  }
  console.log(`✅ ${horariosData.length} sesiones de horario asignadas a la sección 1A`);

  // 5. Estudiante Admitido de Prueba
  const defaultPassword = '72123456';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const estudiante = await prisma.estudiante.create({
    data: {
      dni: '72123456',
      passwordHash,
      nombres: 'Juan Carlos',
      apellidos: 'Pérez Quispe',
      correoPersonal: 'juan.perez@gmail.com',
      correoInstitucional: 'juan.perez@tecsup.edu.pe',
      telefono: '987654321',
      carreraId: carreraC24.id,
      seccionId: seccion.id,
      cicloActual: 1,
      biometriaRegistrada: false,
      tokenBiometrico: null,
      fotoPerfilUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      pasoActualMatricula: 1,
      estadoMatricula: EstadoMatricula.NO_INICIADO,
      horarioLiberado: true,
    },
  });

  console.log('✅ Estudiante de prueba creado:');
  console.log(`   - DNI: ${estudiante.dni}`);
  console.log(`   - Password: ${defaultPassword}`);
  console.log(`   - Estudiante: ${estudiante.nombres} ${estudiante.apellidos}`);
  console.log(`   - Carrera: ${carreraC24.nombre}`);
  console.log(`   - Sección: ${seccion.codigoSeccion}`);

  console.log('✨ Seed completado con éxito!');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });