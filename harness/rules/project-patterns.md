# Patrones del proyecto (fuente de verdad para el implementador)

Este repo es un **monorepo pnpm** con `apps/backend` (NestJS 11) y `apps/frontend`
(Vue 3 + Vuetify 4). `AGENTS.md` en la raíz describe el estado del proyecto; este
archivo describe **cómo escribir código nuevo sin romper los patrones existentes**.

Antes de escribir nada: lee un módulo análogo ya existente y cópialo en forma.
`src/modules/categories/` es el módulo de referencia más limpio del backend.

---

## Backend — Clean Architecture por módulo

```
apps/backend/src/modules/<modulo>/
├── domain/entities/<x>.entity.ts          Reglas de negocio. CERO imports de @nestjs/*
├── application/
│   ├── ports/<x>.repository.ts            interface + token de DI (const X_REPOSITORY)
│   └── use-cases/<verbo>-<x>.use-case.ts  @Injectable, un execute(input) por caso de uso
├── infrastructure/persistence/
│   ├── <x>.schema.ts                      Schema de Mongoose
│   └── <x>.repository.mongo.ts            Adaptador que implementa el port
├── presentation/
│   ├── <modulo>.controller.ts             Sólo HTTP: valida, delega, mapea a DTO
│   └── dto/                               create/update/response DTOs
└── <modulo>.module.ts                     Wiring: { provide: X_REPOSITORY, useClass: XMongoRepository }
```

### Reglas duras

1. **La dependencia apunta hacia adentro.** `domain` no importa de `application`,
   `application` no importa de `infrastructure`, jamás. El caso de uso depende del
   *port*, nunca del repositorio de Mongo.
2. **Los controladores no contienen lógica de negocio.** Un método de controlador
   es: recibir DTO + `@CurrentUser()`, llamar `useCase.execute(...)`, mapear a
   response DTO. Si hay un `if` de negocio en un controlador, está mal ubicado.
3. **Inyección por token**, no por clase concreta:
   ```ts
   constructor(@Inject(CATEGORY_REPOSITORY) private readonly repo: CategoryRepository) {}
   ```
4. **Entidades con factories**: `Entity.create({...})` para creación nueva (aplica
   invariantes y genera valores derivados) y `Entity.restore({...})` para rehidratar
   desde persistencia. Nunca `new Entity()` desde fuera del dominio.
5. **Errores de dominio → excepciones HTTP en la frontera correcta.** Los casos de
   uso lanzan excepciones de Nest (`ConflictException`, `NotFoundException`,
   `ForbiddenException`). No devuelvas `null` esperando que el controlador adivine.
6. **Multi-tenencia por `userId`**: toda consulta y toda mutación filtra por el
   `userId` del token. Nunca aceptes `userId` desde el body o la query.
7. **Validación en DTOs** con class-validator; el `ValidationPipe` global usa
   `whitelist` + `transform`, así que todo campo no declarado se descarta.
8. **Dinero**: nunca uses `float` para operar montos sin cuidado; sigue lo que ya hace
   `accounts` (y `frontend/src/utils/money.ts`). Los redondeos se hacen en un solo
   lugar, no esparcidos por los casos de uso.
9. **No pongas `isolatedModules: true`** en el tsconfig del backend (rompe la
   cobertura de branches con ts-jest).
10. Todo endpoint nuevo va protegido con `JwtAuthGuard` salvo que el spec diga
    explícitamente lo contrario.

### Antipatrones que rechaza el auditor

- Lógica de negocio en el controlador o en el repositorio.
- Importar `mongoose`/`@nestjs/mongoose` desde `domain/` o `application/`.
- Casos de uso "god": un `ManageCategoryUseCase` con un `switch` de acciones.
- Repositorios que devuelven documentos de Mongoose crudos en lugar de entidades.
- Duplicar reglas de negocio entre backend y frontend (el frontend valida para UX,
  el backend valida para verdad).
- `any` para esquivar tipos; `@ts-ignore`.

---

## Frontend — Atomic Design + Pinia

```
apps/frontend/src/
├── components/{atoms,molecules,organisms,templates}/
├── views/            páginas enrutadas
├── stores/           Pinia: estado + acciones que llaman a services
├── services/         clientes HTTP (api.ts inyecta el JWT)
├── types/            tipos compartidos con la API
└── utils/            lógica pura y testeable (cobertura ≥ 80 % exigida aquí)
```

### Reglas duras

1. **Respeta la jerarquía atómica**: un organism puede usar molecules y atoms; un
   atom no importa organisms. Si dudas del nivel, mira `AccountCard` (molecule) vs
   `AccountFormDialog` (organism).
2. **Los componentes no llaman a `fetch`/axios.** Llaman a un store; el store llama a
   un service en `src/services/`.
3. **Un service por recurso** (`accounts.ts`, `categories.ts`, …) que reutiliza el
   cliente de `api.ts`; nunca reconstruyas headers de auth a mano.
4. **Tema Vuetify `greenBeige`**: usa tokens del tema, no colores hex sueltos en los
   componentes.
5. **Lógica pura fuera de los `.vue`**: cálculos, formateo y derivaciones van a
   `src/utils/` para poder testearlos (es donde aplica el umbral de cobertura).
6. **Rutas protegidas** con `meta.requiresAuth`; el guard vive sólo en `router/index.ts`.
7. Tipos de la API en `src/types/`, alineados con los response DTOs del backend.

---

## Convenciones transversales

- **Idioma**: código, nombres de archivo, identificadores y tests en **inglés**;
  specs, documentación y mensajes de commit en **español**.
- **Commits**: conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`),
  validados por commitlint. Husky corre `pnpm test:coverage` en pre-commit: si la
  cobertura cae bajo 80 % el commit se rechaza.
- **Comandos** desde la raíz: `pnpm test`, `pnpm test:coverage`, `pnpm build`,
  `pnpm --filter backend <cmd>`.
- **Nunca** commitees `.env`; los cambios de configuración van a `.env.example`.
