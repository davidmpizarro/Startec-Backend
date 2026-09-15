import { PrismaClient, DiaSemana } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando carga de datos maestros para Tecsup (StarTec)...');

  // Limpieza inicial para evitar conflictos de claves foráneas
  await prisma.pago.deleteMany();
  await prisma.sesionHorario.deleteMany();
  await prisma.estudiante.deleteMany();
  await prisma.seccion.deleteMany();
  await prisma.curso.deleteMany();
  await prisma.carrera.deleteMany();

  // =========================================================================
  // 1. CARRERA C24: Diseño y Desarrollo de Software
  // =========================================================================
  const carreraC24 = await prisma.carrera.create({
    data: {
      codigo: 'C24',
      nombre: 'Diseño y Desarrollo de Software',
      sede: 'Lima - Santa Anita',
      totalCiclos: 6,
    },
  });
  console.log(`✅ Carrera creada: ${carreraC24.nombre} (${carreraC24.codigo})`);

  // 6 Cursos reales oficiales de 1er ciclo para C24
  const cursosC24Data = [
    {
      codigo: 'EG101',
      nombre: 'Técnicas de Expresión Oral y Escrita',
      ciclo: 1,
      creditos: 3,
      horasSemanales: 4,
      tipoCompetencia: 'Empleabilidad',
      carreraId: carreraC24.id,
    },
    {
      codigo: 'MA101',
      nombre: 'Cálculo y Estadística',
      ciclo: 1,
      creditos: 4,
      horasSemanales: 5,
      tipoCompetencia: 'Empleabilidad',
      carreraId: carreraC24.id,
    },
    {
      codigo: 'DP101',
      nombre: 'Desarrollo Personal',
      ciclo: 1,
      creditos: 2,
      horasSemanales: 3,
      tipoCompetencia: 'Empleabilidad',
      carreraId: carreraC24.id,
    },
    {
      codigo: 'CB101',
      nombre: 'Ciencias Básicas Aplicadas',
      ciclo: 1,
      creditos: 3,
      horasSemanales: 4,
      tipoCompetencia: 'Específica técnica',
      carreraId: carreraC24.id,
    },
    {
      codigo: 'CS102',
      nombre: 'Diseño de Interfaces de Programación',
      ciclo: 1,
      creditos: 4,
      horasSemanales: 5,
      tipoCompetencia: 'Específica técnica',
      carreraId: carreraC24.id,
    },
    {
      codigo: 'CS101',
      nombre: 'Fundamentos de Programación',
      ciclo: 1,
      creditos: 4,
      horasSemanales: 6,
      tipoCompetencia: 'Específica técnica',
      carreraId: carreraC24.id,
    },
  ];

  const cursosC24 = [];
  for (const c of cursosC24Data) {
    const curso = await prisma.curso.create({ data: c });
    cursosC24.push(curso);
  }
  console.log(`   └─ ${cursosC24.length} cursos oficiales creados para ${carreraC24.codigo}`);

  // Sección base C24-1A
  const seccionC24 = await prisma.seccion.create({
    data: {
      carreraId: carreraC24.id,
      ciclo: 1,
      codigoSeccion: 'C24-1A',
      periodo: '2026-1',
      aulaBase: 'Pabellón B - Aula 204',
    },
  });
  console.log(`   └─ Sección base creada: ${seccionC24.codigoSeccion}`);

  // Horarios semanales para C24-1A
  const horariosC24 = [
    {
      seccionId: seccionC24.id,
      cursoId: cursosC24.find((c) => c.codigo === 'CS101')!.id,
      dia: DiaSemana.LUNES,
      horaInicio: '08:00',
      horaFin: '11:00',
      aula: 'Lab 302',
      docente: 'Ing. Carlos Mendoza',
    },
    {
      seccionId: seccionC24.id,
      cursoId: cursosC24.find((c) => c.codigo === 'CS102')!.id,
      dia: DiaSemana.MARTES,
      horaInicio: '08:00',
      horaFin: '10:30',
      aula: 'Lab 304',
      docente: 'Ing. Patricia Ramos',
    },
    {
      seccionId: seccionC24.id,
      cursoId: cursosC24.find((c) => c.codigo === 'MA101')!.id,
      dia: DiaSemana.MIERCOLES,
      horaInicio: '08:00',
      horaFin: '11:00',
      aula: 'Pabellón B - Aula 204',
      docente: 'Lic. Roberto Gómez',
    },
    {
      seccionId: seccionC24.id,
      cursoId: cursosC24.find((c) => c.codigo === 'CB101')!.id,
      dia: DiaSemana.JUEVES,
      horaInicio: '08:00',
      horaFin: '10:30',
      aula: 'Lab Ciencias 102',
      docente: 'Fís. Eduardo Flores',
    },
    {
      seccionId: seccionC24.id,
      cursoId: cursosC24.find((c) => c.codigo === 'EG101')!.id,
      dia: DiaSemana.VIERNES,
      horaInicio: '08:00',
      horaFin: '10:30',
      aula: 'Pabellón B - Aula 204',
      docente: 'Mg. Carmen Torres',
    },
    {
      seccionId: seccionC24.id,
      cursoId: cursosC24.find((c) => c.codigo === 'DP101')!.id,
      dia: DiaSemana.SABADO,
      horaInicio: '09:00',
      horaFin: '11:30',
      aula: 'Auditorio 1',
      docente: 'Psic. Claudia Navarro',
    },
  ];

  for (const h of horariosC24) {
    await prisma.sesionHorario.create({ data: h });
  }
  console.log(`   └─ ${horariosC24.length} sesiones de horario asignadas a ${seccionC24.codigoSeccion}`);

  // =========================================================================
  // 2. CARRERA C11: Mecatrónica Industrial
  // =========================================================================
  const carreraC11 = await prisma.carrera.create({
    data: {
      codigo: 'C11',
      nombre: 'Mecatrónica Industrial',
      sede: 'Lima - Santa Anita',
      totalCiclos: 6,
    },
  });
  console.log(`✅ Carrera creada: ${carreraC11.nombre} (${carreraC11.codigo})`);

  const cursosC11Data = [
    {
      codigo: 'MI101',
      nombre: 'Introducción a la Mecatrónica',
      ciclo: 1,
      creditos: 3,
      horasSemanales: 4,
      tipoCompetencia: 'Específica técnica',
      carreraId: carreraC11.id,
    },
    {
      codigo: 'MI102',
      nombre: 'Dibujo y Modelado CAD Mecánico',
      ciclo: 1,
      creditos: 4,
      horasSemanales: 5,
      tipoCompetencia: 'Específica técnica',
      carreraId: carreraC11.id,
    },
    {
      codigo: 'MI103',
      nombre: 'Fundamentos de Electricidad y Circuitos',
      ciclo: 1,
      creditos: 4,
      horasSemanales: 5,
      tipoCompetencia: 'Específica técnica',
      carreraId: carreraC11.id,
    },
    {
      codigo: 'EG101',
      nombre: 'Técnicas de Expresión Oral y Escrita',
      ciclo: 1,
      creditos: 3,
      horasSemanales: 4,
      tipoCompetencia: 'Empleabilidad',
      carreraId: carreraC11.id,
    },
    {
      codigo: 'MA101',
      nombre: 'Cálculo y Estadística',
      ciclo: 1,
      creditos: 4,
      horasSemanales: 5,
      tipoCompetencia: 'Empleabilidad',
      carreraId: carreraC11.id,
    },
  ];

  for (const c of cursosC11Data) {
    await prisma.curso.create({ data: c });
  }

  const seccionC11 = await prisma.seccion.create({
    data: {
      carreraId: carreraC11.id,
      ciclo: 1,
      codigoSeccion: 'C11-1A',
      periodo: '2026-1',
      aulaBase: 'Pabellón A - Aula 101',
    },
  });
  console.log(`   └─ Sección base creada: ${seccionC11.codigoSeccion}`);

  // =========================================================================
  // 3. CARRERA C12: Electrónica y Automatización Industrial
  // =========================================================================
  const carreraC12 = await prisma.carrera.create({
    data: {
      codigo: 'C12',
      nombre: 'Electrónica y Automatización Industrial',
      sede: 'Lima - Santa Anita',
      totalCiclos: 6,
    },
  });
  console.log(`✅ Carrera creada: ${carreraC12.nombre} (${carreraC12.codigo})`);

  const cursosC12Data = [
    {
      codigo: 'EA101',
      nombre: 'Análisis de Circuitos Eléctricos',
      ciclo: 1,
      creditos: 4,
      horasSemanales: 5,
      tipoCompetencia: 'Específica técnica',
      carreraId: carreraC12.id,
    },
    {
      codigo: 'EA102',
      nombre: 'Dispositivos y Mediciones Electrónicas',
      ciclo: 1,
      creditos: 4,
      horasSemanales: 5,
      tipoCompetencia: 'Específica técnica',
      carreraId: carreraC12.id,
    },
    {
      codigo: 'EA103',
      nombre: 'Lógica Digital y Microcontroladores',
      ciclo: 1,
      creditos: 3,
      horasSemanales: 4,
      tipoCompetencia: 'Específica técnica',
      carreraId: carreraC12.id,
    },
    {
      codigo: 'EG101',
      nombre: 'Técnicas de Expresión Oral y Escrita',
      ciclo: 1,
      creditos: 3,
      horasSemanales: 4,
      tipoCompetencia: 'Empleabilidad',
      carreraId: carreraC12.id,
    },
    {
      codigo: 'MA101',
      nombre: 'Cálculo y Estadística',
      ciclo: 1,
      creditos: 4,
      horasSemanales: 5,
      tipoCompetencia: 'Empleabilidad',
      carreraId: carreraC12.id,
    },
  ];

  for (const c of cursosC12Data) {
    await prisma.curso.create({ data: c });
  }

  const seccionC12 = await prisma.seccion.create({
    data: {
      carreraId: carreraC12.id,
      ciclo: 1,
      codigoSeccion: 'C12-1A',
      periodo: '2026-1',
      aulaBase: 'Pabellón C - Aula 305',
    },
  });
  console.log(`   └─ Sección base creada: ${seccionC12.codigoSeccion}`);

  console.log('\n✨ Seed de datos maestros completado con éxito!');
  console.log('📌 Nota: Los estudiantes ahora se registran dinámicamente a través del endpoint POST /auth/register.');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
