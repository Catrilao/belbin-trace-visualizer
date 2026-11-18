import React from 'react';
import { motion } from 'framer-motion';

export interface PlaybackControlsProps {
  /** Indica si la simulación está actualmente reproduciéndose */
  readonly isPlaying: boolean;
  /** Tiempo actual de la simulación en segundos */
  readonly currentTime: number;
  /** Duración total de la simulación en segundos */
  readonly totalDuration: number;
  /** Multiplicador de velocidad de reproducción */
  readonly speed: number;
  /** Progreso normalizado [0, 1] */
  readonly progress: number;
  /** Iniciar reproducción */
  readonly play: () => void;
  /** Pausar reproducción */
  readonly pause: () => void;
  /** Alternar entre reproducir y pausar */
  readonly toggle: () => void;
  /** Saltar a un tiempo arbitrario [0, totalDuration] */
  readonly seekTo: (time: number) => void;
  /** Reiniciar la simulación a t = 0 */
  readonly reset: () => void;
  /** Ajustar la velocidad del multiplicador temporal */
  readonly setSpeed: (speed: number) => void;
  /** Avanzar un delta temporal en segundos */
  readonly stepForward?: (amount?: number) => void;
  /** Retroceder un delta temporal en segundos */
  readonly stepBackward?: (amount?: number) => void;
  /** Clase CSS opcional para personalización */
  readonly className?: string;
}

/**
 * Formatea segundos en formato digital mm:ss.s
 */
function formatTime(seconds: number): string {
  const safe = Math.max(0, isNaN(seconds) ? 0 : seconds);
  const mins = Math.floor(safe / 60);
  const secs = (safe % 60).toFixed(1);
  const paddedSecs = (safe % 60) < 10 ? `0${secs}` : secs;
  return `${mins.toString().padStart(2, '0')}:${paddedSecs}`;
}

const SPEED_OPTIONS = [0.5, 1.0, 1.5, 2.0] as const;

/**
 * Área de Controles de Reproducción
 *
 * Especialista UI/UX en React:
 * Conecta directamente todos los botones de transporte y la barra de rango (scrubber)
 * a los métodos expuestos por el motor de reproducción temporal `usePlaybackEngine`:
 * - Slider nativo `<input type="range">` con llenado visual reactivo.
 * - Transporte: Play/Pause, Reinicio a t=0, Saltos hacia adelante/atrás.
 * - Selector ergonómico de velocidad multiplicadora (0.5x a 2.0x).
 * - Diseño minimalista y limpio con fondo claro y accesibilidad mediante teclado.
 */
export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  currentTime,
  totalDuration,
  speed,
  progress,
  toggle,
  seekTo,
  reset,
  setSpeed,
  stepForward,
  stepBackward,
  className = '',
}) => {
  const progressPercent = Math.min(100, Math.max(0, progress * 100));

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (!isNaN(newTime)) {
      seekTo(newTime);
    }
  };

  return (
    <nav
      aria-label="Controles de reproducción de la simulación"
      className={`bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col gap-3.5 transition-shadow hover:shadow-sm ${className}`}
    >
      {/* 1. Scrubber / Barra de Rango de la Línea de Tiempo */}
      <div className="flex flex-col gap-1.5">
        <div className="relative flex items-center group">
          <input
            type="range"
            min={0}
            max={totalDuration > 0 ? totalDuration : 1}
            step={0.05}
            value={currentTime}
            onChange={handleSliderChange}
            aria-label="Progreso temporal de la simulación"
            aria-valuemin={0}
            aria-valuemax={totalDuration}
            aria-valuenow={currentTime}
            aria-valuetext={`${formatTime(currentTime)} de ${formatTime(totalDuration)}`}
            className="w-full h-2 rounded-full appearance-none cursor-pointer focus:outline-none transition-all"
            style={{
              background: `linear-gradient(to right, #2563EB 0%, #2563EB ${progressPercent}%, #E2E8F0 ${progressPercent}%, #E2E8F0 100%)`,
            }}
          />
        </div>

        {/* Indicadores digitales de tiempo */}
        <div className="flex items-center justify-between text-xs font-mono text-slate-500">
          <span className="font-semibold text-slate-800">
            {formatTime(currentTime)}
          </span>
          <span className="text-slate-400">
            {formatTime(totalDuration)}
          </span>
        </div>
      </div>

      {/* 2. Barra de Transporte y Velocidad */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-1 border-t border-slate-100">
        {/* Controles de Transporte Primarios */}
        <div className="flex items-center gap-1.5">
          {/* Botón Reiniciar a t = 0 */}
          <button
            type="button"
            onClick={reset}
            title="Reiniciar simulación (t = 0)"
            aria-label="Reiniciar simulación a cero segundos"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          {/* Botón Retroceder 1 segundo */}
          {stepBackward && (
            <button
              type="button"
              onClick={() => stepBackward(1)}
              title="Retroceder 1 segundo"
              aria-label="Retroceder un segundo"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"
                />
              </svg>
            </button>
          )}

          {/* Botón Principal Play / Pause */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={toggle}
            aria-label={isPlaying ? 'Pausar simulación' : 'Iniciar reproducción de la simulación'}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white font-medium text-xs flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {isPlaying ? (
              <>
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
                <span>Pausar</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>Reproducir</span>
              </>
            )}
          </motion.button>

          {/* Botón Avanzar 1 segundo */}
          {stepForward && (
            <button
              type="button"
              onClick={() => stepForward(1)}
              title="Avanzar 1 segundo"
              aria-label="Avanzar un segundo"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Selector de Velocidad */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <span className="text-[10px] text-slate-400 px-1.5 font-mono uppercase font-semibold">
            Vel
          </span>
          {SPEED_OPTIONS.map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => setSpeed(rate)}
              aria-label={`Velocidad ${rate}x`}
              className={`px-2 py-0.5 rounded text-xs font-mono font-medium transition-colors ${
                speed === rate
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default PlaybackControls;
