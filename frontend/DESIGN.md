---
name: SIADA · Landing «El Expediente Foliado»
description: La rendición mensual presentada como un expediente de legajo, construida solo con las variables semánticas de shadcn: fondo blanco, fojas, tinta casi negra y sellos de estado en paleta Tailwind. Tema oscuro en negro neutro.
colors:
  background: "#ffffff"
  foreground: "#0a0a0a"
  card: "#ffffff"
  card-foreground: "#0a0a0a"
  muted: "#f5f5f5"
  muted-foreground: "#666666"
  border: "#e5e5e5"
  primary: "#171717"
  primary-foreground: "#fafafa"
  secondary: "#f5f5f5"
  accent: "#f2f2f2"
  background-dark: "#0a0a0a"
  foreground-dark: "#f5f5f5"
  card-dark: "#121212"
  muted-dark: "#1f1f1f"
  muted-foreground-dark: "#a6a6a6"
  border-dark: "#2e2e2e"
  primary-dark: "#fafafa"
  sello-violeta: "#5b21b6"
  sello-violeta-dark: "#c4b5fd"
  sello-rojo: "#b91c1c"
  sello-rojo-dark: "#f87171"
  sello-verde: "#047857"
  sello-verde-dark: "#34d399"
  folio-texto-dark: "#09090b"
typography:
  display:
    fontFamily: "Libre Franklin Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 4.4vw, 3.6rem)"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Libre Franklin Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 3vw, 2.5rem)"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Libre Franklin Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
    lineHeight: 1.25
  body:
    fontFamily: "Libre Franklin Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
  campo:
    fontFamily: "Courier Prime, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Courier Prime, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 400
    letterSpacing: "0.05em"
rounded:
  none: "0px"
  sm: "2px"
  md: "6px"
spacing:
  sm: "12px"
  md: "16px"
  lg: "32px"
  seccion: "80px"
  seccion-desktop: "112px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.none}"
    height: "48px"
    padding: "0 32px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.none}"
    height: "48px"
    padding: "0 32px"
  foja-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.none}"
    padding: "28px"
  celda-dictamina:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    padding: "20px 24px"
  navbar:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    height: "64px"
  folio:
    textColor: "{colors.sello-violeta}"
    rounded: "{rounded.sm}"
    padding: "6px 10px"
  sello:
    textColor: "{colors.sello-rojo}"
    rounded: "{rounded.sm}"
    padding: "4px 12px"
  boton-tema:
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.md}"
    size: "36px"
---

# Design System: SIADA · Landing «El Expediente Foliado»

> Alcance: este sistema describe la landing (`/`, `src/features/landing/components/`) y el botón de tema de su cabecera (`src/components/theme/ThemeToggle.tsx`). Ya no tiene tokens propios: usa únicamente las variables semánticas de shadcn definidas en `src/index.css` (`:root` y `.dark`, canales HSL) y expuestas en `tailwind.config.ts` (`background`, `foreground`, `card`, `muted`, `border`, `primary`, `secondary`, `accent`). Lo único propio de la landing es la tipografía (`font-prensa`, `font-maquina`), las animaciones de entrada y los sellos con paleta de Tailwind. Los valores claros y oscuros de los colores van en el frontmatter (`*-dark` para el tema oscuro); la fuente normativa es `src/index.css`.

## Overview

**Creative North Star: "El Expediente Foliado"**

La rendición mensual se presenta como un legajo del Tribunal de Cuentas: la carátula declara el propósito, cada foja es una verificación y el sello es del delegado fiscal. Es una superficie de persuasión institucional, sobria y legible, que se apoya en materiales de oficina pública (papel, tinta, sello, lápiz) y no en decoración de producto.

El fondo es blanco y la composición alterna franjas de fondo con una franja gris apenas más oscura (`muted` al 40%: motor, trazabilidad, cierre). Sobre ellas se apoyan fojas (`card`) con borde fino y sombra suave de papel apilado, numeradas con un foliador. Las cifras, campos y datos de expediente van en máquina de escribir; los titulares, en grotesca de prensa oficial con pesos altos. Un reglado tenue sobre el hero, trazado con el color de borde, recuerda la hoja de trabajo. El único movimiento orquestado es la verificación renglón por renglón de la planilla del hero, que cierra con el sello rojo.

El tema oscuro es el mismo expediente en negro neutro, sin tinte azul: la foja pasa a gris carbón y los sellos se aclaran para sostener el contraste. Se activa con un único botón en la cabecera; la primera visita sigue al sistema.

**Key Characteristics:**
- Colores solo por variable semántica de shadcn; el tema oscuro funciona sin variantes `dark:` salvo en los sellos.
- Esquinas rectas en botones y fojas (`rounded-none`); el único redondeo es de 2px en sellos y folio.
- Neutros puros como base; tres tintas de sello (violeta, rojo, verde) como únicos acentos.
- Dos familias: Libre Franklin (prensa) y Courier Prime (máquina).
- Sin tarjetas con icono; la jerarquía la dan filetes, folios y sellos.
- Todo material de demostración lleva el rótulo «Ejemplo ilustrativo · datos ficticios».
- Movimiento solo con `motion-safe:`; respeta `prefers-reduced-motion`.

## Colors

Blanco y negro neutros de shadcn, más tres tintas de sello que significan estado. Todo neutro es gris puro (matiz 0, saturación 0).

### Primary
- **Tinta** (`foreground`, #0a0a0a claro; #f5f5f5 oscuro): titulares, texto, filete grueso de foja (`border-foreground`), subrayado del titular (al 30%), recuadro del botón outline del hero y celda invertida «Dictamina» (`bg-foreground text-background`).
- **Botón principal** (`primary`, #171717 claro; #fafafa oscuro, con `primary-foreground`): fondo del botón default de shadcn; se invierte solo con el tema.

### Secondary
- **Violeta de Sello** (`text-violet-800` #5b21b6; oscuro `dark:text-violet-300` #c4b5fd): foliador «Fs. N», rótulo ilustrativo, viñetas cuadradas (`bg-violet-800 dark:bg-violet-300`) y numeración de pasos. El folio en oscuro se estampa relleno (`dark:bg-violet-300 dark:text-zinc-950`, texto #09090b).
- **Rojo Observado** (`text-red-700` #b91c1c; oscuro `dark:text-red-400` #f87171): sello «Observado» y la línea de diferencia; significa siempre una discrepancia hallada.
- **Verde Aprobado** (`text-emerald-700` #047857; oscuro `dark:text-emerald-400` #34d399): sello «Aprobado» del dictamen emitido.

### Neutral
- **Fondo** (`background`, #ffffff claro; #0a0a0a oscuro): página, hero, asistente, organismos, pie. La navbar usa `bg-background/80` con `backdrop-blur`.
- **Franja alterna** (`bg-muted/40`; `muted` #f5f5f5 claro, #1f1f1f oscuro): motor, trazabilidad y cierre.
- **Foja** (`card` con `card-foreground`, #ffffff claro; #121212 oscuro): planillas, consultas y el ticket del asistente.
- **Hojas apiladas** (`secondary` y `muted`): las dos hojas rotadas detrás de la planilla del hero.
- **Línea** (`border`, #e5e5e5 claro; #2e2e2e oscuro): bordes de foja, filetes de sección, reglado del hero (al 60%), filas (al 70%) y resúmenes punteados.
- **Texto secundario** (`muted-foreground`, #666666 claro; #a6a6a6 oscuro): párrafos, subtítulos, cabeceras de columna.
- **Acento** (`accent`, #f2f2f2 claro; #262626 oscuro): hover del botón outline y del botón de tema.

### Named Rules
**The Tinta de Estado Rule.** Violeta identifica al sistema y al auditor (folio, viñetas, rótulo), rojo una observación, verde un dictamen aprobado. Ninguna tinta se usa como decoración.

**The Variable Semántica Rule.** Todo color de superficie, texto y línea sale de una variable semántica de shadcn; solo los sellos, el folio y las viñetas usan la paleta de Tailwind (violet, red, emerald, y zinc-950 para el texto del folio relleno), siempre con su par `dark:`.

**The Foja sobre Fondo Rule.** El contenido operativo (cifras, planillas, consultas) vive sobre una foja `bg-card` con borde `border-border`; en oscuro la foja suma un anillo blanco al 15% (`dark:ring-1 dark:ring-white/15`). Las franjas solo alternan entre `bg-background` y `bg-muted/40`.

**The Neutro Rule.** Ni el tema claro ni el oscuro llevan tinte de matiz: gris puro en ambos. No reintroducir campos de color de marca.

## Typography

**Display Font:** Libre Franklin Variable (con ui-sans-serif, system-ui), clase `font-prensa`
**Body Font:** Libre Franklin Variable
**Label/Mono Font:** Courier Prime (con ui-monospace), clase `font-maquina`

**Character:** Grotesca de prensa oficial, pesada y compacta en titulares, que contrasta con la máquina de escribir de los datos de expediente.

### Hierarchy
- **Display** (800, clamp(2.25rem, 4.4vw, 3.6rem), 1.04, -0.025em): titular del hero, con `text-balance`; «delegado fiscal» lleva subrayado grueso de `foreground` al 30%.
- **Headline** (800, clamp(1.75rem, 3vw, 2.5rem), 1.08, -0.02em): títulos de sección; el cierre usa clamp(2rem, 4vw, 3.25rem).
- **Title** (800, 1rem a 1.25rem): encabezados de foja y de la cadena Presenta/Verifica/Consulta/Dictamina.
- **Body** (400, 1.125rem, 1.625): párrafos en `text-muted-foreground`, 52 a 55ch.
- **Campo** (Courier Prime 400, 12.5 a 13px, cifras con `tabular-nums`): renglones de planilla, importes, organismo.
- **Label** (Courier Prime, 12px, versalitas con `tracking-wider`): cabeceras de columna y rótulo ilustrativo.

### Named Rules
**The Máquina Solo para Datos Rule.** Courier Prime se reserva a cifras, campos y datos de expediente; los titulares y la prosa nunca van en máquina.

## Layout

Contenedor `max-w-6xl` centrado con padding horizontal de 16px (32px desde `md`). El hero y las secciones usan una grilla de 12 columnas desde `lg`: el hero reparte 7 de texto y 5 de planilla; el asistente invierte el orden con 5 de texto y 7 de foja. Ritmo vertical de sección de 80px (112px desde `md`); el hero es más compacto. Bajo el hero, una cadena de cuatro roles en grilla de 2 columnas en móvil y 4 desde `md`, separada por filetes `border-border`, con el último («Dictamina», Delegado fiscal) invertido (`bg-foreground text-background`). Navbar fija de 64px con borde inferior. En móvil todo colapsa a una columna y los botones se apilan.

## Elevation & Depth

Híbrido de papel apilado y campos planos. Las fojas se elevan con una sombra grande, difusa y neutra, y la del hero se refuerza con dos hojas rotadas detrás (1.4deg y -0.9deg, desplazadas 12px y 6px). Las franjas son planas. En oscuro, donde la sombra casi no se ve, la foja se separa con un anillo de 1px blanco al 15%. La navbar se separa por transparencia (80%) y desenfoque de fondo, no por sombra.

### Shadow Vocabulary
- **Foja del hero** (`box-shadow: 0 30px 50px -26px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.1)`): planilla principal.
- **Foja de sección** (`box-shadow: 0 28px 50px -26px rgba(0,0,0,0.25), 0 2px 5px rgba(0,0,0,0.08)`): consulta del asistente y fojas de motor y trazabilidad.

### Named Rules
**The Papel Apilado Rule.** La profundidad se logra con hojas apiladas y sombras difusas de papel, nunca con sombras duras desplazadas ni brillos.

## Shapes

Esquinas rectas por defecto: los botones de shadcn se pasan a `rounded-none` y las fojas no llevan radio. Los sellos y el folio usan `rounded-sm` (2px), doble filete (borde de 3px más contorno de 1px con offset de 3px, ambos en `currentColor`), mayúsculas con tracking de 0.08em, giro leve, `mix-blend-multiply` en claro (normal en oscuro) y un filtro SVG de turbulencia (`#tinta-sello`) que irregulariza borde y entintado. El botón outline del hero es un recuadro de 2px en `border-foreground`. El botón de tema es la excepción: toma el borde y el radio `md` (6px) de shadcn.

## Components

### Buttons
Componente `Button` de shadcn (`src/components/ui/button.tsx`), variantes `default` y `outline`, siempre con `rounded-none` para conservar las esquinas rectas.
- **Shape:** rectos (0px).
- **Primary (`default`):** `bg-primary text-primary-foreground`, 700, altura 48px y padding horizontal 32px en hero y cierre (`size="lg"`, `h-12 px-8 text-base`); en la navbar `size="sm"` (32px). Lleva flecha de Lucide a la derecha en hero y cierre. Hover a `primary` al 90%.
- **Outline:** `border-input bg-background`, hover `accent`; en el hero con `border-2 border-foreground` y 600. En la navbar «Registrarse» usa el outline estándar de 1px.
- **Focus:** el botón de shadcn quita el contorno y muestra anillo de 1px `ring-ring`; el resto de elementos enfocables usa el contorno global de 2px con `hsl(var(--ring))` y offset de 3px.

### Foja (Cards / Containers)
- **Corner Style:** recto.
- **Background:** `bg-card text-card-foreground`, borde `border-border` de 1px, padding 20 a 32px.
- **Shadow Strategy:** ver Elevation & Depth.
- **Border:** encabezado con filete inferior de 2px `border-foreground`; filas con filete `border-border`; resúmenes con filete punteado.

### Planilla (Signature Component)
Tabla en Courier Prime con reglado de `border-border`, encabezado de columnas en versalitas `text-muted-foreground`, una marca de lápiz (tilde que se traza) por renglón y un resumen Saldo anterior, Depósitos, Retiros, Saldo calculado, Saldo informado y Diferencia. Entra con retardos escalonados (650ms de inicio, 240ms por fila) y el sello «Observado» cae al final (380ms, escala de 1.45 a 1). Animaciones `fila-in`, `foja-in`, `lapiz-in` y `sello-in` con easing cubic-bezier(0.16, 1, 0.3, 1), definidas en `tailwind.config.ts`.

### Sello y Folio
Sello de tinta en tono violeta, rojo, verde o atenuado (`text-muted-foreground`). El Folio («Fs. N», 13px, giro de -3deg) numera cada foja: va nítido, sin filtro de textura, y en tema oscuro se estampa relleno de violeta claro con texto zinc-950. El filtro `#tinta-sello` se monta una sola vez por página con `FiltroTintaSello`.

### Navigation
Barra fija (`sticky`, 64px) en `bg-background/80` con `backdrop-blur` y borde inferior `border-border`; «SIADA» en Libre Franklin 800 y «Tribunal de Cuentas · Formosa» en `muted-foreground` desde `sm`; a la derecha el botón de tema, «Registrarse» (outline) e «Iniciar sesión» (default), ambos rectos.

### Botón de tema
Un solo botón de 36px en la cabecera que alterna claro y oscuro (tema por clase `dark`, `next-themes`): muestra la luna en claro y el sol en oscuro (iconos de Lucide), con `aria-label` y `title` que nombran la acción. Borde `border-border`, texto `muted-foreground`, radio `md`, hover con fondo `accent`.

## Do's and Don'ts

### Do:
- **Do** apoyar toda cifra o dato operativo sobre una foja `bg-card` con borde `border-border`, en Courier Prime con `tabular-nums`.
- **Do** usar solo variables semánticas de shadcn para superficies, texto y líneas (`background`, `foreground`, `card`, `muted`, `muted-foreground`, `border`), de modo que el tema oscuro funcione sin variantes `dark:` propias.
- **Do** usar el `Button` de shadcn con `rounded-none`; variante `default` para la acción principal y `outline` para la secundaria, y un solo botón de tema en la cabecera.
- **Do** dar a los sellos su par claro/oscuro (`text-violet-800 dark:text-violet-300`, `text-red-700 dark:text-red-400`, `text-emerald-700 dark:text-emerald-400`).
- **Do** rotular todo material con datos ficticios con «Ejemplo ilustrativo · datos ficticios».
- **Do** numerar las fojas con el Folio y usar sellos para estados.
- **Do** envolver cada animación en `motion-safe:` y usar el easing cubic-bezier(0.16, 1, 0.3, 1).
- **Do** mantener titulares en Libre Franklin 800 con interletrado negativo.

### Don't:
- **Don't** usar el hero centrado con badge, dos botones y fila de tarjetas iguales (rechazo explícito de la dirección).
- **Don't** reintroducir un campo índigo o azul ni tintes azulados en el negro: el usuario rechazó el fondo índigo y el oscuro es neutro.
- **Don't** usar tarjetas con icono para explicar funciones.
- **Don't** crear de nuevo tokens de color propios de la landing (suelo, papel, tinta, lápiz, sello-*); si falta un matiz, se resuelve con la variable semántica más cercana.
- **Don't** usar Courier Prime para titulares o prosa.
- **Don't** presentar cifras, plazos o capacidades del motor determinístico o de la IA como existentes: se describen por función (todavía no existen en el backend).
