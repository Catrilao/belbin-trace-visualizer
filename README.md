# Visualizador Belbin - Interfaz de Simulación UI/UX

Interfaz especializada en React y Framer Motion para la visualización determinista y temporal de simulaciones de equipos con perfiles Belbin.

## Arquitectura de Componentes

La interfaz está organizada modularmente en cuatro áreas principales dentro de un layout limpio y minimalista:

```
src/
├── components/
│   ├── BelbinVisualizer.tsx     # Ensamblador principal de layout y estado temporal
│   ├── ParticipantsArea.tsx     # Área 1: Tarjetas con iluminación de habla y solapamiento
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
│   └── sampleSimulation.ts      # Traza de demostración con 5 roles Belbin y solapamiento
├── types/
│   └── index.ts                 # Tipos oficiales de Belbin, eventos y modelos de visualización
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

## Características Técnicas Clave

1. **Área de Participantes**:
   - Tarjetas por agente con rol Belbin en español.
   - Borde iluminado con el color determinista del agente cuando está hablando (`isSpeaking`).
   - Detección reactiva de habla solapada (`activeSpeakerIds.length > 1`) con anillo de alerta ámbar y microondas de audio animadas con Framer Motion.

2. **Área de Conversación**:
   - Lista cronológica estricta: los turnos futuros (`startTime > currentTime`) se mantienen ocultos.
   - Turnos activos destacados con borde iluminado, insignia "Activo" y elevación suave.
   - Auto-scroll automático hacia el turno en curso.

3. **Mapa de Interacciones (SVG Nativo)**:
   - Cero dependencias pesadas de grafos (SVG puro en React).
   - Distribución radial de agentes mediante funciones trigonométricas.
   - Conexiones dirigidas (`<line>`) basadas en `receiver_id`.
   - Cuando un turno está activo, viaja un `<circle>` interpolado linealmente sobre la línea según el progreso temporal del turno.

4. **Controles de Reproducción**:
   - Conexión directa a `usePlaybackEngine`.
   - Barra de arrastre con `<input type="range">` nativo.
   - Transporte: Play, Pausa, Reinicio a t=0, avance y retroceso de 1s.
   - Selector de velocidad (0.5x, 1.0x, 1.5x, 2.0x).
