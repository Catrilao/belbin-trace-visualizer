import React, { useMemo } from 'react';
import { adaptTraceToVisualModel } from '../core/adapter';
import { usePlaybackEngine } from '../hooks/usePlaybackEngine';
import { RawSimulationTrace, VisualSimulationModel } from '../types';
import { SAMPLE_BELBIN_TRACE } from '../mock/sampleSimulation';
import { ParticipantsArea } from './ParticipantsArea';
import { ConversationArea } from './ConversationArea';
import { InteractionMapArea } from './InteractionMapArea';
import { PlaybackControls } from './PlaybackControls';
import './visualizer.css';

export interface BelbinVisualizerProps {
  /**
   * Traza cruda de simulación (JSON del simulador).
   * Si se omite y no se provee `model`, se utiliza la traza de demostración `SAMPLE_BELBIN_TRACE`.
   */
  readonly trace?: RawSimulationTrace;
  /**
   * Modelo visual pre-adaptado opcional.
   */
  readonly model?: VisualSimulationModel;
  /**
   * Título para el encabezado del visualizador.
   */
  readonly title?: string;
  /**
   * Subtítulo o descripción breve opcional.
   */
  readonly subtitle?: string;
  /**
   * Clase CSS opcional para el contenedor raíz.
   */
  readonly className?: string;
}

/**
 * Visualizador Belbin - Componente Principal Ensamblador
 *
 * Especialista UI/UX en React:
 * 1. Consume el adaptador de dominio `adaptTraceToVisualModel` y el motor `usePlaybackEngine`.
 * 2. Layout minimalista con fondo claro dividido estrictamente en cuatro áreas:
 *    - Miembros (Tarjetas reactivas al estado vivo del motor, iluminación de habla y solapamiento)
 *    - Flujo de conversación (Turnos cronológicos, eventos futuros ocultos y turno activo destacado)
 *    - Mapa de interacciones (SVG nativo puro con nodos en círculo y líneas basadas en receiver_id)
 *    - Controles de reproducción (Transporte, scrubber de rango y velocidad conectados al motor)
 * 3. Enfoque riguroso, responsive y sin métricas inventadas.
 */
export const BelbinVisualizer: React.FC<BelbinVisualizerProps> = ({
  trace,
  model: providedModel,
  title = 'Visualizador Belbin',
  subtitle = 'Dinámica de interacción conversacional y roles de equipo en simulación',
  className = '',
}) => {
  // 1. Adaptación determinista del dominio
  const visualModel = useMemo<VisualSimulationModel>(() => {
    if (providedModel) {
      return providedModel;
    }
    const rawData = trace ?? SAMPLE_BELBIN_TRACE;
    return adaptTraceToVisualModel(rawData);
  }, [trace, providedModel]);

  // 2. Motor de reproducción temporal
  const engine = usePlaybackEngine(visualModel.totalDuration, {
    turns: visualModel.turns,
  });

  return (
    <div className={`belbin-visualizer-container min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans p-4 sm:p-6 lg:p-8 ${className}`}>
      <div className="max-w-7xl w-full mx-auto flex flex-col space-y-5 flex-1">
        {/* Encabezado Principal Minimalista */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200/90 gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {title}
              </h1>
              <span
                className={`text-[11px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full border ${
                  engine.isPlaying
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {engine.isPlaying ? 'Reproduciendo' : 'En pausa'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {subtitle}
            </p>
          </div>

          {/* Resumen del Estado Instantáneo */}
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 shadow-2xs">
              Miembros hablando:{' '}
              <strong className="text-slate-900">
                {engine.activeSpeakerIds.length}
              </strong>
            </span>
            <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 shadow-2xs">
              Turnos activos:{' '}
              <strong className="text-slate-900">
                {engine.activeTurns.length}
              </strong>
            </span>
          </div>
        </header>

        {/* Grid Principal: 3 Áreas de Visualización */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start flex-1">
          {/* Columna Izquierda: Miembros + Mapa de Interacciones */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* Área 1: Miembros */}
            <ParticipantsArea
              members={visualModel.members}
              activeSpeakerIds={engine.activeSpeakerIds}
              activeTurns={engine.activeTurns}
              isSpeaking={engine.instantaneousState.isSpeaking}
            />

            {/* Área 3: Mapa de Interacciones SVG Nativo */}
            <InteractionMapArea
              members={visualModel.members}
              turns={visualModel.turns}
              activeTurns={engine.activeTurns}
              activeConnections={engine.activeConnections}
              currentTime={engine.currentTime}
              isSpeaking={engine.instantaneousState.isSpeaking}
            />
          </div>

          {/* Columna Derecha: Flujo de Conversación */}
          <div className="lg:col-span-5 h-full">
            {/* Área 2: Flujo de Conversación */}
            <ConversationArea
              turns={visualModel.turns}
              members={visualModel.members}
              currentTime={engine.currentTime}
              activeTurns={engine.activeTurns}
            />
          </div>
        </main>

        {/* Área 4: Controles de Reproducción (Barra Inferior) */}
        <footer className="sticky bottom-4 z-20 pt-2">
          <PlaybackControls
            isPlaying={engine.isPlaying}
            currentTime={engine.currentTime}
            totalDuration={engine.totalDuration}
            speed={engine.speed}
            progress={engine.progress}
            play={engine.play}
            pause={engine.pause}
            toggle={engine.toggle}
            seekTo={engine.seekTo}
            reset={engine.reset}
            setSpeed={engine.setSpeed}
            stepForward={engine.stepForward}
            stepBackward={engine.stepBackward}
          />
        </footer>
      </div>
    </div>
  );
};

export default BelbinVisualizer;
