---
version: 1
slug: "src-features-landing-components-landingpage-tsx"
primary_target: "src/features/landing/components/LandingPage.tsx"
related_targets: []
---

# Landing de SIADA (`/`)

Modo: Persuade. Rediseño completo; se conserva la verdad de producto, las rutas `/login` y `/registro` y el texto institucional del pie.

## Alcance
- Visitante: delegado fiscal del Tribunal de Cuentas de Formosa. En segundo plano, responsables de carga de los organismos.
- Trabajo: entender en segundos que SIADA acompaña al delegado fiscal en la auditoría de las rendiciones de cuentas, confiar en ello e iniciar sesión.
- Prueba: demostración ilustrativa con datos ficticios (rotulada). Motor determinístico e IA son pilares centrales y todavía no existen en el backend; se describen por función, sin cifras ni plazos.
- Mundo elegido por el usuario: «El Expediente Foliado» (pick). Construcción code-led.

## Direction contract

THESIS: La rendición mensual presentada como un expediente: la carátula declara el propósito, cada foja es una verificación y el sello es del delegado. Rechaza el hero centrado con badge, dos botones y una fila de tarjetas iguales.

OWN-WORLD: Campo índigo de carpeta de legajo a escala de página en el hero y el cierre. Fojas de papel blanco frío numeradas con foliador, planilla con reglado de lápiz, texto mecanografiado en cifras y campos. Tinta de sello violeta, sello rojo «Observado», sello verde «Aprobado». Marcas de lápiz del auditor en los renglones. Esquinas rectas, sombras suaves de papel apilado, sin tarjetas con icono. Titulares en grotesca de prensa oficial (Libre Franklin, pesos altos) y máquina de escribir (Courier Prime) solo para cifras, campos y expediente.

STORY: El visitante entiende que SIADA es para el delegado fiscal y su auditoría de rendiciones, ve cómo el motor marca una diferencia concreta, comprende que la IA consulta y cita pero no decide, y concluye que la decisión y la trazabilidad son suyas. Acción: «Iniciar sesión». Secundaria: «Registrarse» para responsables.

FIRST VIEWPORT: Escritorio 1440x900 sobre campo índigo. Izquierda (≈6 de 12 columnas): titular «Acompañamos al delegado fiscal en la auditoría de las rendiciones de cuentas.», subtítulo de dos líneas y «Iniciar sesión» (papel blanco sobre índigo) junto a «Registrarse». Derecha: pila de fojas con la planilla ilustrativa del Libro Banco. Se verifica renglón por renglón con marcas de lápiz y cae el sello rojo «Observado» sobre la diferencia. Rótulo «Ejemplo ilustrativo · datos ficticios». Un solo movimiento orquestado, con `prefers-reduced-motion` respetado.

FORM: El Expediente Foliado, posición 1 en mi lista ordenada (IMPECCABLE’S PICK), elegido por el usuario. seed:60b1a56eff8bd475

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
