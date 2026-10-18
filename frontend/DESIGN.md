---
name: SIADA · Landing «El Expediente Foliado»
description: La rendición mensual presentada como un expediente de legajo: carátula índigo, fojas de papel frío, tinta de sello y lápiz del auditor.
colors:
  carpeta: "#1b2470"
  carpeta-hondo: "#121a55"
  carpeta-claro: "#2b37a0"
  foja: "#fbfbf8"
  oficio: "#e9ebf2"
  tinta: "#14173a"
  lapiz: "#b8bfd9"
  sello-violeta: "#5b2d9e"
  sello-rojo: "#c4301f"
  sello-verde: "#17784a"
  texto-sobre-carpeta: "#cfd3f2"
  foja-apilada-1: "#eceef6"
  foja-apilada-2: "#d9dcec"
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
  sm: "2px"
  none: "0px"
spacing:
  sm: "12px"
  md: "16px"
  lg: "32px"
  seccion: "80px"
  seccion-desktop: "112px"
components:
  button-primary:
    backgroundColor: "{colors.foja}"
    textColor: "{colors.carpeta}"
    rounded: "{rounded.none}"
    padding: "16px 32px"
  button-primary-hover:
    backgroundColor: "#ffffff"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.foja}"
    rounded: "{rounded.none}"
    padding: "14px 28px"
  foja-card:
    backgroundColor: "{colors.foja}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.none}"
    padding: "28px"
  sello:
    textColor: "{colors.sello-rojo}"
    rounded: "{rounded.sm}"
    padding: "4px 12px"
---

# Design System: SIADA · Landing «El Expediente Foliado»

> Alcance: este sistema describe únicamente la landing (`/`, `src/features/landing/`). El resto de la aplicación (DashboardLayout, pantallas internas con shadcn e Inter, variables HSL neutras de `:root`) conserva su propio sistema y no forma parte de este mundo. Los tokens de este mundo conviven en `tailwind.config.ts` (colores `carpeta`, `foja`, `oficio`, `tinta`, `lapiz`, `sello.*`; fuentes `prensa` y `maquina`) pero no deben aplicarse a las pantallas internas sin una decisión explícita.

## Overview

**Creative North Star: "El Expediente Foliado"**

La rendición mensual se presenta como un legajo del Tribunal de Cuentas: la carátula índigo declara el propósito, cada foja de papel frío es una verificación y el sello es del delegado fiscal. Es una superficie de persuasión institucional, sobria y legible, que se apoya en materiales de oficina pública (carpeta, papel, tinta de sello, lápiz) y no en decoración de producto.

La composición alterna campos índigo a escala de página (hero, sección del asistente, cierre, pie) con campo de papel «oficio» claro (motor, trazabilidad, organismos). Sobre ellos se apoyan fojas blancas con sombra suave de papel apilado, numeradas con un foliador. Las cifras, campos y datos de expediente van en máquina de escribir; los titulares, en grotesca de prensa oficial con pesos altos. El único movimiento orquestado es la verificación renglón por renglón de la planilla del hero, que cierra con el sello rojo.

**Key Characteristics:**
- Esquinas rectas en botones y fojas; el único redondeo es de 2px en sellos.
- Campo índigo de carpeta contra papel blanco frío; tres tintas de sello como únicos acentos.
- Dos familias: Libre Franklin (prensa) y Courier Prime (máquina).
- Sin tarjetas con icono; la jerarquía la dan filetes, folios y sellos.
- Todo material de demostración lleva el rótulo «Ejemplo ilustrativo · datos ficticios».
- Movimiento solo con `motion-safe:`; respeta `prefers-reduced-motion`.

## Colors

Un índigo de carpeta profundo, papel de tono frío y tres tintas de sello que significan estado.

### Primary
- **Índigo de Carpeta** (#1b2470, `carpeta`): campo del hero, navbar, cierre y texto de botones sobre papel. Variantes: **Carpeta Hondo** (#121a55) para la sección del asistente y el pie; **Carpeta Claro** (#2b37a0) definido en la configuración pero sin uso verificado en la landing.

### Secondary
- **Violeta de Sello** (#5b2d9e, `sello-violeta`): foliador «Fs. N», marcas de lápiz, rótulo ilustrativo, viñetas cuadradas, selección de texto y anillo de foco global.
- **Rojo Observado** (#c4301f, `sello-rojo`): sello «Observado» y la línea de diferencia; significa siempre una discrepancia hallada.
- **Verde Aprobado** (#17784a, `sello-verde`): sello «Aprobado» del estado de dictamen emitido.

### Neutral
- **Foja** (#fbfbf8): papel de las planillas y botón primario sobre índigo; también el texto principal sobre carpeta.
- **Oficio** (#e9ebf2): fondo de página y de las secciones claras.
- **Tinta** (#14173a): texto sobre papel y filete grueso de encabezado de foja.
- **Lápiz** (#b8bfd9): reglado de la planilla, filetes y subrayado del titular.
- **Texto sobre Carpeta** (#cfd3f2): texto secundario sobre índigo (valor literal repetido en las secciones, no es token de Tailwind).
- **Fojas apiladas** (#eceef6, #d9dcec): hojas rotadas detrás de la planilla del hero.

### Named Rules
**The Tinta de Estado Rule.** Violeta identifica al sistema y al auditor (folio, lápiz), rojo identifica una observación, verde un dictamen aprobado. Ninguna tinta se usa como decoración.

**The Campo y Papel Rule.** El índigo es campo de escala de página; el contenido operativo (cifras, planillas, consultas) siempre vive sobre una foja de papel.

## Typography

**Display Font:** Libre Franklin Variable (con ui-sans-serif, system-ui)
**Body Font:** Libre Franklin Variable
**Label/Mono Font:** Courier Prime (con ui-monospace)

**Character:** Grotesca de prensa oficial, pesada y compacta en titulares, que contrasta con la máquina de escribir de los datos de expediente.

### Hierarchy
- **Display** (800, clamp(2.25rem, 4.4vw, 3.6rem), 1.04, -0.025em): titular del hero, con `text-balance`.
- **Headline** (800, clamp(1.75rem, 3vw, 2.5rem), 1.08, -0.02em): títulos de sección; el cierre usa clamp(2rem, 4vw, 3.25rem).
- **Title** (800, 1rem a 1.25rem): encabezados de foja y de la cadena Presenta/Verifica/Consulta/Dictamina.
- **Body** (400, 1.125rem, 1.625): párrafos, en 52 a 55ch.
- **Campo** (Courier Prime 400, 12.5 a 13px, cifras con `tabular-nums`): renglones de planilla, importes, organismo.
- **Label** (Courier Prime, 11 a 12px, versalitas con `tracking-wider`): cabeceras de columna y rótulo ilustrativo.

### Named Rules
**The Máquina Solo para Datos Rule.** Courier Prime se reserva a cifras, campos y datos de expediente; los titulares y la prosa nunca van en máquina.

## Layout

Contenedor `max-w-6xl` centrado con padding horizontal de 16px (32px desde `md`). El hero y las secciones usan una grilla de 12 columnas desde `lg`: texto en 5 a 7 columnas y la foja en el resto, alternando lado (el asistente invierte el orden). Ritmo vertical de sección de 80px (112px desde `md`); el hero es más compacto (56px arriba, 64px abajo). Bajo el hero, una cadena de cuatro roles en grilla de 2 columnas en móvil y 4 desde `md`, con el último («Dictamina», Delegado fiscal) invertido en papel. Navbar fija de 64px de alto. En móvil todo colapsa a una columna y los botones se apilan.

## Elevation & Depth

Híbrido de papel apilado y campos planos. Las fojas se elevan con una sombra grande y suave y se refuerzan con dos hojas rotadas detrás (1.4deg y -0.9deg, desplazadas 12px y 6px). Los campos índigo son planos, con un reglado horizontal tenue de 36px en el hero.

### Shadow Vocabulary
- **Foja del hero** (`box-shadow: 0 34px 60px -24px rgba(6,8,36,0.7), 0 2px 6px rgba(6,8,36,0.18)`): planilla principal.
- **Foja de sección** (`box-shadow: 0 30px 60px -26px rgba(0,0,0,0.6)`): foja de consulta del asistente.

### Named Rules
**The Papel Apilado Rule.** La profundidad se logra con hojas apiladas y sombras difusas de papel, nunca con sombras duras desplazadas ni brillos.

## Shapes

Esquinas rectas por defecto (botones, fojas, viñetas cuadradas de 8px). Los sellos usan `rounded-sm` (2px), doble filete (borde de 3px más contorno de 1px con offset de 3px), mayúsculas con tracking de 0.08em, giro leve (-3deg a -8deg), `mix-blend-multiply` y un filtro SVG de turbulencia que irregulariza el borde y el entintado. El botón secundario es un recuadro de 2px sin relleno.

## Components

### Buttons
- **Shape:** rectos, sin radio.
- **Primary:** papel (#fbfbf8) con texto índigo, 700, padding 16px 32px, flecha de Lucide a la derecha; en la navbar 8px 16px. Hover a blanco.
- **Secondary:** contorno de 2px en foja al 50%, texto foja; hover con borde pleno y velo blanco al 10%.
- **Focus:** contorno de 2px violeta con offset de 3px; sobre campo índigo (`.sobre-carpeta`) el contorno pasa a foja.

### Foja (Cards / Containers)
- **Corner Style:** recto.
- **Background:** foja con texto tinta, padding 20 a 32px.
- **Shadow Strategy:** ver Elevation & Depth.
- **Border:** encabezado con filete inferior de 2px en tinta; filas con filete de lápiz; resúmenes con filete punteado.

### Planilla (Signature Component)
Tabla en Courier Prime con reglado de lápiz, encabezado de columnas en versalitas, una marca de lápiz (tilde violeta que se traza) por renglón y un resumen Saldo anterior, Depósitos, Retiros, Saldo calculado, Saldo informado y Diferencia. Entra con retardos escalonados (650ms de inicio, 240ms por fila) y el sello «Observado» cae al final (380ms, escala de 1.45 a 1). Las animaciones son `fila-in`, `foja-in`, `lapiz-in` y `sello-in` con easing cubic-bezier(0.16, 1, 0.3, 1).

### Sello y Folio
Sello de tinta en tono violeta, rojo, verde o tinta atenuada. El Folio («Fs. N», violeta, 12px) numera cada foja. El filtro `#tinta-sello` se monta una sola vez por página con `FiltroTintaSello`.

### Navigation
Barra fija índigo (64px) con «SIADA» en Libre Franklin 800 y «Tribunal de Cuentas · Formosa» desde `sm`; a la derecha «Registrarse» como texto y «Iniciar sesión» como botón de papel. Filete inferior blanco al 10%.

## Do's and Don'ts

### Do:
- **Do** apoyar toda cifra o dato operativo sobre una foja de papel (#fbfbf8) en Courier Prime con `tabular-nums`.
- **Do** rotular todo material con datos ficticios con «Ejemplo ilustrativo · datos ficticios».
- **Do** numerar las fojas con el Folio y usar sellos para estados (violeta, rojo, verde).
- **Do** envolver cada animación en `motion-safe:` y usar el easing cubic-bezier(0.16, 1, 0.3, 1).
- **Do** mantener esquinas rectas y titulares en Libre Franklin 800 con interletrado negativo.

### Don't:
- **Don't** usar el hero centrado con badge, dos botones y fila de tarjetas iguales (rechazo explícito de la dirección).
- **Don't** usar tarjetas con icono para explicar funciones.
- **Don't** usar Inter, shadcn ni los neutros HSL internos dentro de la landing, ni llevar este mundo a las pantallas internas sin decisión explícita.
- **Don't** usar Courier Prime para titulares o prosa.
- **Don't** presentar cifras, plazos o capacidades del motor determinístico o de la IA como existentes: se describen por función (todavía no existen en el backend).
