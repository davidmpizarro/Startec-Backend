# StarTec Backend (NestJS + Prisma + PostgreSQL)

Backend de servicios para la aplicación móvil **StarTec** en Flutter, brindando autenticación con DNI y biometría, gestión de matrícula, consulta de perfil y asignación de horarios por secciones fijas en Tecsup.

---

## 🛠 Tecnologías Utilizadas

- **Framework**: [NestJS](https://nestjs.com/) v10
- **ORM**: [Prisma ORM](https://www.prisma.io/) v5
- **Base de Datos**: PostgreSQL
- **Autenticación**: Passport JWT + Bcrypt
- **Validaciones**: class-validator & class-transformer

---

## 📦 Estructura del Proyecto

```
startec-backend/
├── prisma/
│   ├── schema.prisma       # Modelado de datos PostgreSQL
│   └── seed.ts             # Script de seed con datos iniciales de Tecsup
├── src/
│   ├── auth/               # Login DNI, registro biométrico, login biométrico y JWT guard
│   ├── common/             # Decorador @CurrentUser y Guards reutilizables
│   ├── estudiantes/        # Perfil y control de pasos del flujo de matrícula
│   ├── horarios/           # Consulta de horarios por sección fija asignada
│   ├── matricula/          # Procesamiento y pagos de matrícula
│   ├── prisma/             # PrismaService y PrismaModule global
│   ├── app.module.ts       # Módulo principal
│   └── main.ts             # Entrada de la aplicación con CORS y ValidationPipe
├── .env                    # Configuración de entorno y DATABASE_URL
├── package.json
└── tsconfig.json
```

---

## ⚙️ Configuración e Instalación

### 1. Variables de entorno
Configura tu cadena de conexión a PostgreSQL en el archivo `.env`:
```env
PORT=3000
DATABASE_URL="postgresql://postgres:tu_password@localhost:5432/startec_db?schema=public"
JWT_SECRET="startec_super_secret_jwt_key_2026"
JWT_EXPIRES_IN="7d"
```

### 2. Sincronización y Migración de la Base de Datos
Para aplicar el esquema a tu base de datos PostgreSQL:
```bash
npx prisma db push
```

### 3. Cargar Datos de Prueba (Seed Tecsup)
Para poblar la base de datos con la carrera C11 (Diseño y Desarrollo de Software), cursos del ciclo 1, la sección 1A, sus horarios semanales y el estudiante de prueba:
```bash
npm run prisma:seed
```

### 4. Iniciar el Servidor en Desarrollo
```bash
npm run start:dev
```

---

## 🚀 Endpoints de la API

### 1. Autenticación (`/auth`)
| Método | Endpoint | Autenticación | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Pública | Login inicial con `dni` y `password` |
| `POST` | `/auth/register-biometric` | Bearer JWT | Vincula el `tokenBiometrico` del móvil |
| `POST` | `/auth/biometric-login` | Pública | Login rápido con `dni` y `tokenBiometrico` |

### 2. Estudiantes (`/estudiantes`)
| Método | Endpoint | Autenticación | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/estudiantes/perfil` | Bearer JWT | Perfil completo (carrera, sección, estado) |
| `PATCH` | `/estudiantes/paso-matricula` | Bearer JWT | Actualiza el paso del onboarding (`paso`) |

### 3. Matrícula y Pagos (`/matricula`)
| Método | Endpoint | Autenticación | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/matricula/pagar` | Bearer JWT | Registra y aprueba el pago de matrícula |
| `POST` | `/matricula/confirmar` | Bearer JWT | Confirma el estado a `MATRICULADO_CONFIRMADO` |
| `GET` | `/matricula/historial-pagos` | Bearer JWT | Historial de pagos del estudiante |
| `GET` | `/matricula/estado` | Bearer JWT | Estado actual de matrícula y pagos |

### 4. Horarios (`/horarios`)
| Método | Endpoint | Autenticación | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/horarios/mi-horario` | Bearer JWT | Horario semanal de la sección del alumno |
| `GET` | `/horarios/seccion/:seccionId` | Bearer JWT | Horario completo de una sección |

---

## 👤 Credenciales del Estudiante de Prueba

- **DNI**: `72123456`
- **Contraseña inicial**: `password123` (o su mismo DNI `72123456`)
- **Carrera**: Diseño y Desarrollo de Software (C11)
- **Sección**: 1A
