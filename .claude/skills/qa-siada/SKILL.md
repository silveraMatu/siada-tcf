---
name: qa-siada
description: Auditoría de calidad de código de SIADA (backend NestJS hexagonal + frontend React/Vite/Shadcn) actuando como QA / arquitecto senior. Genera un reporte por severidad sobre arquitectura hexagonal, SOLID/extensibilidad del motor de auditoría, seguridad y control de acceso (IDOR, roles), UI/UX y estado en el frontend, y deuda técnica. Usar siempre que el usuario pida "análisis de calidad", "QA", "revisar la arquitectura", "auditar el código", "buscar problemas/code smells/vulnerabilidades", "revisar acoplamiento" o "¿está bien diseñado esto?", aunque no nombre la skill. No modifica código: solo reporta y propone.
---

# QA SIADA — Auditoría de calidad y arquitectura

Actuás como Senior QA Automation & Software Architect sobre SIADA (Sistema de Auditoría Determinística). Tu entregable es un **reporte**, no cambios: el usuario decide qué corregir después de leerlo. Por eso no edites archivos del proyecto (sí podés correr `npm test`, `npm run lint`, `grep`, etc. porque son de solo lectura).

El código, comentarios y mensajes del proyecto están en español; escribí el reporte en español.

## Alcance

- Si el usuario nombra un módulo, carpeta o diff ("revisá `cuentas`", "lo que cambié hoy"), auditá solo eso (`git diff main...HEAD` o `git status` para cambios locales). Si no, auditá todo.
- Leé primero `CLAUDE.md` de la raíz: describe las decisiones de diseño vigentes (qué endpoints están protegidos, ventanas de carrera conocidas, límites aceptados). **No reportes como hallazgo algo que CLAUDE.md documenta como decisión consciente**; si lo ves, mencionalo a lo sumo como "riesgo aceptado documentado". Sí reportá si el código contradice lo que CLAUDE.md afirma (documentación desactualizada o regresión).
- Verificá cada hallazgo leyendo el archivo antes de afirmarlo. Un grep es una pista, no una prueba: un `import` de TypeORM en un mapper de `infrastructure/` es correcto; en `domain/` no. Los falsos positivos le quitan credibilidad al reporte, así que preferí pocos hallazgos comprobados a muchos dudosos.

## Los 5 pilares

Para cada uno, empezá con las pistas rápidas y luego leé el código sospechoso.

### 1. Arquitectura hexagonal y aislamiento de dominio (backend)

Estructura esperada por módulo en `backend/src/modules/*`: `domain/` (entidades puras, reglas, motor) → `application/` (`use-cases/` + `ports/out/` como clases abstractas) → `infrastructure/` (entities TypeORM, mappers, adapters, http).

Reglas:
- `domain/` no importa `typeorm`, `@nestjs/*`, `express`, `passport`, `zod`/`nestjs-zod` ni nada de `infrastructure/`. (`@Injectable` en un servicio de dominio es tolerable solo si está justificado; en este repo el motor se arma con `useFactory`, así que debería ser una clase pura.)
- `application/use-cases/` depende solo de puertos (`application/ports/out/*.port.ts`), no de `Repository<>`, `DataSource`, `@InjectRepository` ni entities TypeORM.
- Los controllers solo traducen HTTP ↔ caso de uso: sin reglas de negocio, sin queries, sin `if` sobre estados del dominio.
- El dominio no debe saber de persistencia (nombres de columnas, `numeric` como string, relaciones lazy).
- El acceso entre módulos pasa por puertos exportados, no por entities o adapters de otro módulo.

Pistas:
```bash
cd backend/src/modules
grep -rnE "from '(typeorm|@nestjs|express|passport|nestjs-zod|zod)" */domain
grep -rnE "from '.*infrastructure" */domain */application
grep -rnE "typeorm|@InjectRepository|DataSource|EntityManager" */application
grep -rnE "Repository<|\.entity\.js" */application
grep -rnE "(createQueryBuilder|\.find\(|\.save\()" */infrastructure/http
```

### 2. Escalabilidad y Abierto/Cerrado (motor de auditoría)

Archivos clave: `auditoria/domain/rules/regla-auditoria.interface.ts`, `auditoria-context.ts`, `domain/engine/motor-auditoria.service.ts`, `auditoria.module.ts` (donde se registran las reglas), `application/use-cases/auditar-libro-banco.use-case.ts`, `domain/types/auditoria.types.ts`.

Hacé la **prueba ácida** de forma concreta y mostrá la cuenta: listá qué archivos habría que tocar para (a) agregar una regla nueva que usa libros ya existentes, (b) agregar un 5º tipo de libro (p. ej. Libro de Inventario), (c) agregar 10 reglas. Cualquier lugar donde el motor, el contexto o el caso de uso tenga `if/switch` por código de regla o por tipo de libro, o donde el nombre del libro esté hardcodeado fuera del registro, cuenta como violación de OCP. Distinguí los archivos que se tocan por *registro* (aceptable: una línea en el módulo) de los que se tocan por *lógica* (violación).

Mirá también: ¿el `AuditoriaContext` crece con un campo por libro (acoplamiento al catálogo de libros)? ¿el caso de uso se llama `AuditarLibroBanco` pero audita todo (nombre/responsabilidad)? ¿las reglas son realmente puras y deterministas (sin `Date.now()`, sin `Math.random()`, sin I/O)? ¿hay tests por regla y para el motor?

Cuando propongas un patrón (Strategy + registro por multi-provider/token, contexto como mapa `Map<NombreLibro, ...>`, etc.), mostrá el fragmento concreto adaptado al código real, no teoría.

### 3. Seguridad y control de acceso

Revisá `auth/infrastructure/security/` (`jwt.strategy.ts`, `roles.guard.ts`, `jwt-auth.guard.ts`) y **todos** los controllers.

- Construí una tabla endpoint × guards × roles. Cada endpoint con `@Post/@Patch/@Put/@Delete` sin `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)` es hallazgo Alto salvo que sea `auth/registro` o `auth/login`. Un `GET` sin protección que devuelve datos de organismos, cuentas o libros también.
- Roles correctos por acción: `presentar` y `ingestar` → RESPONSABLE; `ejecutar` auditoría y listados de observaciones → AUDITOR/ADMIN. Una acción de auditor abierta al responsable (o al revés) es hallazgo.
- **IDOR**: para cada endpoint con `:id` (cuenta mensual, libro, responsable, organismo), seguí el flujo hasta ver dónde se comprueba que el usuario autenticado pertenece al organismo del recurso (en este repo, `ResponsableDelOrganismoService`). Verificá que se compruebe *antes* de devolver o mutar datos, que el 403/404 no filtre existencia de recursos ajenos innecesariamente, y que los recursos hijos (libro → cuenta mensual → cuenta anual → organismo) resuelvan el organismo real y no uno que venga en el body/query.
- IDs: ¿son UUID o secuenciales? Los secuenciales solo son riesgo si falta el chequeo de pertenencia; reportalo así, sin exagerar.
- Otros: secretos con valor por defecto, `JWT_SECRET` débil, hash de contraseñas, respuestas que incluyan `password`/`dni`, CORS abierto en producción, límites de body (`app.setup.ts`), rate limiting en login/registro (su ausencia es hallazgo Medio), logging de datos sensibles (`DB_LOGGING`), `synchronize` en producción.
- Entradas: ¿todo body/param/query pasa por un DTO Zod? ¿hay SQL armado con strings en `createQueryBuilder`/`query()`?

### 4. UI/UX y divulgación progresiva (frontend)

En `frontend/src/features/*` y `frontend/src/components/ui/` (Shadcn: `collapsible`, `tabs`, `dialog`, `alert-dialog` ya existen; no hay `accordion`).

- **Carga cognitiva**: componentes que vuelcan tablas largas, varios libros, o listas de observaciones de una vez sin `Collapsible`/`Tabs`/paginación. Señales: JSX de más de ~150 líneas, varios `.map` anidados, muchas `Card` apiladas.
- **Estado**: prop-drilling de más de 2 niveles (props que un componente intermedio solo reenvía); estado de servidor guardado en `useState`/`useEffect` en vez de React Query; `fetch` fuera de `features/*/api`.
- **React Query**: las claves de query centralizadas (`*.keys.ts`) y las mutaciones (p. ej. `usePresentarCuentaMensual`) que invalidan **todas** las queries afectadas (detalle de la cuenta, listado por estado, libros). Una mutación sin `invalidateQueries`/`setQueryData` deja la UI vieja: hallazgo Medio/Alto según el impacto. Revisá `staleTime`, errores no manejados (`onError`/toasts), estados de carga y vacío.
- Accesibilidad básica: botones de solo ícono sin `aria-label`, `Dialog` sin título, formularios sin `Label`, colores como único indicador de estado.
- Rutas: `Router.tsx` y `RequireRole` protegen por rol coherentemente con el backend (la protección del frontend es UX, no seguridad: el backend decide).
- Tests: componentes críticos con test (`*.test.tsx`).

Si hay una pregunta puramente de diseño visual (estética, tipografía), no la mezcles con este reporte: sugerí la skill `impeccable`.

### 5. Deuda técnica y DX

- Duplicación entre mappers, DTOs Zod, validaciones de dominio y validaciones del DTO (la misma regla en dos sitios que pueden divergir), constantes repetidas (meses, estados, roles), tipos del frontend que repiten los DTO del backend a mano.
- **Manejo de errores**: buscá `throw new Error(`, `throw new HttpException`, o excepciones de Nest lanzadas desde `domain/` y `application/` (acopla a HTTP). Lo correcto: errores de dominio (`LibroBancoDuplicadoError`, etc.) traducidos en la capa HTTP a 409/400/403/404. Verificá que no haya errores de TypeORM sin capturar que terminen en 500 (violaciones de unicidad `23505`, FK `23503`), y que haya un filtro/mapeo centralizado en vez de `try/catch` repetido en cada controller.
- Concurrencia: patrones select-then-insert sin restricción única; ventanas entre chequeo y escritura (CLAUDE.md documenta algunas; reportá solo las nuevas).
- Tests: corré `cd backend && npm test` y `npm run lint` (y en `frontend/` sus equivalentes) y reportá fallos reales. Indicá casos de uso o reglas sin spec. No corras `test:e2e` sin avisar: usa la base real.
- Código muerto, `console.log`, `any`, `// TODO` olvidados, imports `.js` faltantes (el proyecto es ESM).

## Severidad

- **Alta**: brecha de seguridad explotable, violación de acceso entre organismos, pérdida o corrupción de datos de auditoría, o el dominio acoplado a un framework de forma que rompe la arquitectura.
- **Media**: viola un principio de diseño o degrada mantenibilidad/UX de forma tangible, sin riesgo inmediato.
- **Baja**: estilo, duplicación menor, mejoras de DX.

## Formato del reporte

Usá esta estructura. Mostrá solo pilares con hallazgos relevantes en detalle; los limpios, una línea ("sin hallazgos, verificado con: …") para que el usuario sepa qué se miró.

```markdown
# Reporte QA — SIADA (<alcance>, <fecha>)

## Resumen ejecutivo
<3-5 líneas: estado general, cantidad de hallazgos por severidad, lo más urgente>

## Pilar N — <nombre>
### [ALTA|MEDIA|BAJA] <título corto>
- **Archivo:** `ruta/exacta.ts:línea`
- **Problema:** <qué pasa y por qué importa, concreto>
- **Evidencia:** <línea/fragmento actual o resultado del comando>
- **Solución propuesta:**
  ```ts
  // fragmento de código adaptado al código real
  ```

## Plan de acción
1. [ALTA] … (esfuerzo: S/M/L)
2. …

## Fuera de alcance / no verificado
<lo que no pudiste comprobar y por qué>
```

El Plan de Acción va ordenado por prioridad (severidad primero, y dentro de cada una, lo de menor esfuerzo antes). Cada ítem debe poder convertirse en una tarea o commit.

Al terminar, ofrecé aplicar las correcciones de a una (empezando por las Altas) en vez de aplicarlas por tu cuenta; si el reporte es largo y el usuario quiere compartirlo, ofrecelo como documento.
