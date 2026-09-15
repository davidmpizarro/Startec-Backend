# StarTec Backend (NestJS + Prisma + PostgreSQL)

Backend de servicios para la aplicación móvil **StarTec** en Flutter, brindando autenticación con DNI y biometría, selección dinámica de carreras de Tecsup, gestión de matrícula, consulta de perfil y asignación de horarios por secciones fijas.

---

## 🛠 Tecnologías Utilizadas

- **Framework**: [NestJS](https://nestjs.com/) v10
- **ORM**: [Prisma ORM](https://www.prisma.io/) v5
- **Base de Datos**: PostgreSQL 16 (Docker)
- **Autenticación**: Passport JWT + Bcrypt
- **Validaciones**: class-validator & class-transformer

---

## 📦 Estructura del Proyecto

```
startec-backend/
├── prisma/
│   ├── schema.prisma       # Modelado de datos PostgreSQL
│   └── seed.ts             # Datos maestros: C24 (Software), C11 (Mecatrónica), C12 (Electrónica)
├── src/
│   ├── auth/               # Registro dinámico, login DNI, registro biométrico, login biométrico
│   ├── carreras/           # Catálogo público de carreras de Tecsup (GET /carreras)
│   ├── common/             # Decorador @CurrentUser y Guards reutilizables
│   ├── estudiantes/        # Perfil y control de pasos del flujo de matrícula
│   ├── horarios/           # Consulta de horarios por sección fija asignada
│   ├── matricula/          # Procesamiento y pagos de matrícula
│   ├── prisma/             # PrismaService y PrismaModule global
│   ├── app.module.ts       # Módulo principal
│   └── main.ts             # Entrada de la aplicación con CORS y ValidationPipe
├── docker-compose.yml      # Contenedor PostgreSQL 16
├── .env                    # Configuración de entorno y DATABASE_URL
├── package.json
└── tsconfig.json
```

---

## ⚙️ Configuración e Inicialización

### 1. Levantar la Base de Datos PostgreSQL
```bash
docker compose up -d
```

### 2. Sincronizar Esquema y Generar Prisma Client
```bash
npx prisma db push
```

### 3. Cargar Datos Maestros (Seed Tecsup)
Puebla las carreras (`C24`, `C11`, `C12`), secciones base de primer ciclo (`C24-1A`, `C11-1A`, `C12-1A`), cursos oficiales y horarios:
```bash
npm run prisma:seed
```

### 4. Iniciar Servidor en Desarrollo
```bash
npm run start:dev
```

---

## 🚀 Endpoints de la API

### 1. Catálogo de Carreras (`/carreras`) - *Público*
| Método | Endpoint | Autenticación | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/carreras` | Pública | Listado de carreras disponibles (`id`, `codigo`, `nombre`, `sede`) para el Dropdown en Flutter |
| `GET` | `/carreras/:id` | Pública | Detalle de una carrera con sus cursos de ciclo 1 |

### 2. Autenticación y Registro (`/auth`)
| Método | Endpoint | Autenticación | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Pública | Registro dinámico seleccionando carrera (`codigoCarrera` o `carreraId`). Retorna JWT y perfil con cursos |
| `POST` | `/auth/login` | Pública | Login inicial con `dni` y `password` |
| `POST` | `/auth/register-biometric` | Bearer JWT | Vincula el `tokenBiometrico` del móvil |
| `POST` | `/auth/biometric-login` | Pública | Login rápido con `dni` y `tokenBiometrico` |

#### Payload de Registro (`POST /auth/register`):
```json
{
  "dni": "72123456",
  "password": "password123",
  "nombres": "Juan Carlos",
  "apellidos": "Pérez Quispe",
  "codigoCarrera": "C24",
  "correoPersonal": "juan.perez@gmail.com",
  "telefono": "987654321"
}
```

### 3. Estudiantes (`/estudiantes`)
| Método | Endpoint | Autenticación | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/estudiantes/perfil` | Bearer JWT | Perfil completo (carrera, cursos, sección, estado) |
| `PATCH` | `/estudiantes/paso-matricula` | Bearer JWT | Actualiza el paso del onboarding (`paso`) |

### 4. Matrícula y Pagos (`/matricula`)
| Método | Endpoint | Autenticación | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/matricula/pagar` | Bearer JWT | Registra y aprueba el pago de matrícula |
| `POST` | `/matricula/confirmar` | Bearer JWT | Confirma el estado a `MATRICULADO_CONFIRMADO` |
| `GET` | `/matricula/historial-pagos` | Bearer JWT | Historial de pagos del estudiante |
| `GET` | `/matricula/estado` | Bearer JWT | Estado actual de matrícula y pagos |

### 5. Horarios (`/horarios`)
| Método | Endpoint | Autenticación | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/horarios/mi-horario` | Bearer JWT | Horario semanal ordenado por día y hora |
| `GET` | `/horarios/seccion/:seccionId` | Bearer JWT | Horario completo de una sección |
