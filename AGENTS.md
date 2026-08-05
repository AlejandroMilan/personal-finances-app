# AGENTS.md

## Proyecto

Monorepo para la administración de finanzas personales. Gestionado con **pnpm workspaces**.

## Estructura

```
.
├── apps/
│   ├── backend/    # API NestJS
│   └── frontend/   # SPA Vue 3
├── pnpm-workspace.yaml
├── commitlint.config.cjs
└── .husky/
```

### apps/backend — NestJS (API REST)

- **Framework**: NestJS 11
- **Persistencia**: MongoDB con Mongoose (`@nestjs/mongoose`, `mongoose`); URI desde `MONGODB_URI` (cluster remoto o local)
- **Autenticación**: JWT (`@nestjs/jwt`) con `JWT_SECRET` y `JWT_EXPIRES_IN` desde env; hasheo de contraseñas con bcryptjs
- **Validación**: class-validator + class-transformer con `ValidationPipe` global (`whitelist` + `transform`)
- **Tests**: Jest (umbral de cobertura global 80 %)
- **Arquitectura**: Clean architecture. Cada módulo vive en `src/modules/<modulo>/`, organizado por capas:
  - `domain/` — entidades, value objects, reglas de negocio (sin dependencias de Nest)
  - `application/` — casos de uso (orquestan el dominio) y puertos (interfaces + tokens de DI)
  - `infrastructure/` — adaptadores (MongoDB, hashing, JWT)
  - `presentation/` — controladores y DTOs
- **Módulo auth** (`src/modules/auth/`): registro (`POST /auth/register`) y login (`POST /auth/login`) con generación de token JWT. Incluye `JwtAuthGuard` (valida `Authorization: Bearer <token>`) y el decorador `@CurrentUser()`, exportados para otros módulos
- **Módulo accounts** (`src/modules/accounts/`): CRUD de cuentas protegido con JWT (`GET/POST/PATCH/DELETE /accounts`). Cada cuenta tiene nombre, balance, color, tipo (`cash` | `debit` | `credit`) y userId; las de tipo crédito generan una entidad `CreditCard` asociada (límite, usado, fecha de corte, fecha de pago). Al borrar una cuenta de crédito se elimina también su tarjeta
- Configuración por env: copiar `apps/backend/.env.example` a `apps/backend/.env`
- El estado actual es un hello world (`GET /` → `Hello World! Personal Finances API`)

### apps/frontend — Vue 3 (SPA)

- **Framework**: Vue 3 + TypeScript + Vite
- **Estado global**: Pinia (`src/stores/`)
- **Router**: vue-router con navigation guard (`src/router/index.ts`); rutas protegidas con `meta.requiresAuth`
- **UI**: Vuetify 4 con tema personalizado **verde/arena** (`src/plugins/vuetify.ts`)
- **Tests**: Vitest + jsdom (umbral de cobertura 80 % sobre `src/utils/**`)
- **Arquitectura**: Atomic design. Componentes en `src/components/` por nivel:
  - `atoms/` — componentes básicos (botones, inputs)
  - `molecules/` — combinaciones de átomos
  - `organisms/` — secciones completas
  - `templates/` — layouts por página
  - `views/` — páginas
- Servicios de API en `src/services/` (proxy `/api` → backend :3000, token JWT automático en headers), utilidades en `src/utils/`
- Flujo auth: `LoginView`/`RegisterView` → `AuthStore` (token + usuario en localStorage) → guard redirige a `/home`
- Cuentas: `AccountsView` (listado) + `AccountCard` (molecule) + `AccountFormDialog` (organism) + `AccountsStore`

## Comandos

Todos se ejecutan desde la raíz del repo con pnpm:

| Comando | Descripción |
| --- | --- |
| `pnpm install` | Instala todas las dependencias del workspace |
| `pnpm dev` | Levanta backend y frontend en paralelo (backend :3000, frontend :5173) |
| `pnpm dev:backend` | Solo backend (watch mode) |
| `pnpm dev:frontend` | Solo frontend (Vite dev server) |
| `pnpm build` | Compila backend (nest build) y frontend (vue-tsc + vite build) |
| `pnpm test` | Ejecuta los tests de ambos paquetes |
| `pnpm test:coverage` | Tests con cobertura (falla si no se alcanza el 80 %) |
| `pnpm --filter backend <cmd>` | Comando puntual en el backend |
| `pnpm --filter frontend <cmd>` | Comando puntual en el frontend |

## Convenciones

- **Commits**: Conventional commits (validados por Husky + commitlint en el hook `commit-msg`). Ejemplos: `feat: ...`, `fix: ...`, `chore: ...`, `refactor: ...`
- **Pre-commit**: Husky ejecuta `pnpm test:coverage` antes de cada commit; si la cobertura baja del 80 % el commit se rechaza
- **Cobertura**: mínimo 80 % en branches, functions, lines y statements (Jest y Vitest)
- **pnpm 11**: la configuración del workspace vive en `pnpm-workspace.yaml` (no en `.npmrc` ni en el campo `pnpm` de package.json). Para aprobar build scripts de dependencias se usa `allowBuilds`
- **Backend**: los controllers nunca deben incluir lógica de negocio; se delega a casos de uso en `application/`. No usar `isolatedModules: true` en el tsconfig del backend: ts-jest lo usa para emitir metadata de decoradores y eso genera un guard de runtime que degrada la cobertura de branches
- **Frontend**: componentes Vuetify siempre bajo el tema `greenBeige`; respetar la jerarquía de atomic design al agregar componentes
- **Idioma**: código y nombres de archivos en inglés; documentación y mensajes de commit en español es aceptable, pero mantener consistencia con lo existente
