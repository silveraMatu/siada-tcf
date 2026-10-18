# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Delegado fiscal** del Tribunal de Cuentas de la Provincia de Formosa (HTC Formosa). Audita las rendiciones de cuentas mensuales que presentan los organismos públicos. Es el usuario principal y el destinatario de la landing.
- **Responsable de carga** de cada organismo. Presenta la rendición mensual y sube el Libro Banco.
- Roles de la plataforma: ADMIN, JUEZ_TRAMITE, AUDITOR, RESPONSABLE.

## Product Purpose
SIADA (Sistema Integral de Auditoría) acompaña al delegado fiscal en la auditoría de las rendiciones de cuentas. Ordena la recepción de la rendición mensual de cada organismo, verifica su consistencia contable y deja trazabilidad de cada etapa. El éxito es que el delegado revise rendiciones con criterio y respaldo, y que el uso de los recursos públicos quede documentado.

## Positioning
Un recorrido completo que ningún libro de planillas ofrece: ingesta de la rendición, motor determinístico de validación cruzada (saldos, depósitos, retiros), asistente de IA para consultar y redactar, y trazabilidad de estados. La decisión siempre es del delegado fiscal.

## Operating Context
- Rendiciones mensuales por organismo y ejercicio fiscal (cuenta anual → cuenta mensual → Libro Banco con sus transacciones).
- Estados de la rendición: Pendiente, En Auditoría, Aprobado.
- Control externo constructivo, por parte del Tribunal de Cuentas.

## Capabilities and Constraints
- **Implementado hoy:** registro y login con JWT, activación de usuarios y roles por un administrador, gestión de organismos, vinculación de responsables con su organismo, ingesta del Libro Banco desde planilla Excel y resolución de la cuenta mensual.
- **Planificado, aún sin implementar en el backend:** motor determinístico de validación cruzada y asistente de IA. El usuario pidió que sean los pilares centrales de la landing. No se afirman métricas, cifras, plazos ni casos reales.
- Idioma de la interfaz: español (Argentina). Frontend: React, Vite, Tailwind v3, shadcn/ui.

## Brand Commitments
- Nombre: SIADA, del Tribunal de Cuentas de la Provincia de Formosa (HTC Formosa).
- Mensaje exacto pedido por el usuario: acompañar al delegado fiscal en la auditoría de las rendiciones de cuentas.
- Control constructivo y mejora continua, no punitivo.

## Evidence on Hand
No hay testimonios, clientes, métricas ni logotipo oficial en el repositorio. Solo existe `public/favicon.svg`. Cualquier dato de demostración en la landing es ficticio y debe rotularse como ilustrativo.

## Product Principles
1. El delegado fiscal decide; el sistema le da respaldo, no lo reemplaza.
2. Confianza antes que espectáculo: nada se afirma que no pueda sostenerse.
3. Cada paso de la rendición queda registrado y es rastreable.
4. Lo que el motor determinístico encuentra es verificable; la IA asiste y no resuelve.

## Accessibility & Inclusion
Contraste mínimo WCAG AA, navegación por teclado y respeto a `prefers-reduced-motion`.
