# SIADA · Frontend

Interfaz de chat construida con React, TypeScript, Tailwind CSS y componentes de
shadcn/ui. La pantalla inicia sin conversaciones ni mensajes de ejemplo; los
mensajes escritos se mantienen en el estado del frontend y no generan una
respuesta automática.

## Desarrollo

```sh
npm install
npm run dev
```

Para validar los cambios:

```sh
npm run build
npm run lint
```

## Estructura

- `src/App.tsx`: composición general de la página.
- `src/components/layout/`: barra lateral y cabecera.
- `src/components/chat/`: estado vacío, mensajes y compositor.
- `src/components/ui/`: primitivas reutilizables de shadcn/ui.
- `src/features/chat/hooks/useChat.ts`: estado y acciones de las conversaciones.
- `src/features/chat/types.ts`: tipos compartidos del chat.
- `src/App.css`: estilos de la interfaz del chat.

La integración con el servicio de respuestas no está implementada en este
frontend.
