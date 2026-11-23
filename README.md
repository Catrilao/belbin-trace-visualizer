# Visualizador Belbin - Interfaz de Simulación UI/UX

Interfaz especializada en React, TypeScript y Framer Motion para la visualización determinista y temporal de simulaciones de equipos con perfiles Belbin.

## Arquitectura de Componentes

La interfaz está organizada modularmente en cuatro áreas principales dentro de un layout limpio y minimalista:

```
src/
├── components/
│   ├── BelbinVisualizer.tsx     # Ensamblador principal de layout y estado temporal
│   ├── ParticipantsArea.tsx     # Área 1: Tarjetas de miembros con estados Hablando / Callado / Solapado
│   ├── ConversationArea.tsx     # Área 2: Turnos cronológicos (futuros ocultos, activos destacados)
│   ├── InteractionMapArea.tsx   # Área 3: Grafo SVG nativo radial (líneas receiver_id y partículas)
│   ├── PlaybackControls.tsx     # Área 4: Scrubber <input type="range">, transporte y velocidad
│   ├── visualizer.css           # Estilos complementarios para range sliders y scrollbars
│   └── index.ts                 # Re-exportaciones limpias de componentes
├── core/
│   ├── adapter.ts               # Transformación pura de traza JSON a VisualSimulationModel
│   └── index.ts
├── hooks/
│   ├── usePlaybackEngine.ts     # Motor de reproducción sincronizado por requestAnimationFrame
│   └── index.ts
├── mock/
│   └── sampleSimulation.ts      # Traza de demostración adaptada al contrato real del simulador
├── types/
│   └── index.ts                 # Tipos oficiales de Belbin, miembros, eventos y modelos de visualización
└── index.ts                     # Punto de entrada unificado
```

## Uso Rápido

```tsx
import React from 'react';
import { BelbinVisualizer, SAMPLE_BELBIN_TRACE } from './src';

export function App() {
  return (
    <BelbinVisualizer
      trace={SAMPLE_BELBIN_TRACE}
      title="Sesión de Planificación Estratégica"
    />
  );
}
```

## Desarrollo Local

Requiere **Node.js 20+** (especificado en `.node-version`):

```bash
npm ci
npm run dev
```

Para validar tipos y generar el bundle de producción en `dist/`:

```bash
npm run build
npm run preview
```

## Despliegue en Cloudflare

El proyecto está preconfigurado para desplegarse directamente en **Cloudflare Pages** o **Cloudflare Workers (Static Assets)**:

### Opción 1: Cloudflare Pages (conectado a GitHub)
1. En el panel de Cloudflare, ve a **Workers & Pages → Create → Pages → Connect to Git**.
2. Selecciona el repositorio `belbin-trace-visualizer` y la rama `main`.
3. Configura el build:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Cloudflare usará automáticamente `.node-version` (`20`), fallback SPA nativo y `public/_headers` (cabeceras de seguridad y caché inmutable para `/assets/*`).

### Opción 2: Cloudflare Workers Static Assets (`wrangler.jsonc`)
Con el archivo `wrangler.jsonc` incluido en la raíz:

```bash
npm ci
npm run build
npx wrangler deploy
```

## Características Técnicas Clave

1. **Área de Miembros**:
   - Tarjetas por miembro con roles dominantes Belbin mapeados al español.
   - Borde iluminado con el color determinista del miembro en estado `Hablando` y alerta ámbar en estado `Solapado`.
   - Indicador reactivo de los estados del simulador (`Talking` → `Hablando`, `Silent` → `Callado`, `Overlapping` → `Solapado`).

2. **Área de Conversación**:
   - Lista cronológica estricta: los turnos futuros (`startTime > currentTime`) se mantienen ocultos.
   - Turnos activos destacados con borde iluminado, insignia "Activo" y auto-scroll suave.

3. **Mapa de Interacciones (SVG Nativo)**:
   - Grafo radial puro en React + SVG sin dependencias pesadas.
   - Conexiones dirigidas (`<line>`) basadas en `receiver_id` y partícula animada interpolada en tiempo real.

4. **Controles de Reproducción**:
   - Motor `usePlaybackEngine` sincronizado exclusivamente con `requestAnimationFrame`.
   - Barra de arrastre `<input type="range">`, transporte (Play, Pausa, Reinicio, avance/retroceso de 1s) y selector de velocidad (0.5x a 2.0x).
