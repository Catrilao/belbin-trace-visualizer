import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActiveConnection,
  InstantaneousPlaybackState,
  SpeechTurn,
} from '../types';

/**
 * Re-exportación de tipos fundamentales para consumo directo desde el hook.
 */
export type { ActiveConnection, InstantaneousPlaybackState, SpeechTurn };

/**
 * Opciones de configuración para el motor de reproducción.
 */
export interface PlaybackEngineOptions {
  /**
   * Lista de turnos de habla (SpeechTurns) procesados por el adaptador.
   */
  readonly turns?: readonly SpeechTurn[];
  /**
   * Alias de compatibilidad para turns.
   */
  readonly speechTurns?: readonly SpeechTurn[];
  /**
   * Velocidad inicial de reproducción (por defecto 1.0 = tiempo real).
   */
  readonly initialSpeed?: number;
  /**
   * Tiempo inicial al montar el hook (por defecto 0).
   */
  readonly initialTime?: number;
  /**
   * Iniciar la reproducción automáticamente al montar (por defecto false).
   */
  readonly autoPlay?: boolean;
  /**
   * Reproducir en bucle continuo al alcanzar el final (por defecto false).
   */
  readonly loop?: boolean;
  /**
   * Unidad de tiempo de la simulación:
   * - 'seconds': 1 segundo de tiempo real = 1 unidad de tiempo (por defecto).
   * - 'ms': 1 milisegundo de tiempo real = 1 unidad de tiempo.
   */
  readonly timeUnit?: 'seconds' | 'ms';
  /**
   * Callback invocado en cada actualización de fotograma con el tiempo actual.
   */
  readonly onTimeUpdate?: (currentTime: number) => void;
  /**
   * Callback invocado cuando la reproducción llega al final de la simulación.
   */
  readonly onEnd?: () => void;
}

/**
 * Configuración unificada cuando se pasa un único objeto de opciones.
 */
export interface PlaybackEngineConfig extends PlaybackEngineOptions {
  readonly totalDuration: number;
}

/**
 * Métodos imperativos de control del motor de reproducción.
 */
export interface PlaybackEngineControls {
  /** Inicia la reproducción temporal continua */
  readonly play: () => void;
  /** Pausa la reproducción temporal */
  readonly pause: () => void;
  /** Alterna entre reproducir y pausar */
  readonly toggle: () => void;
  /** Alias de conveniencia para toggle */
  readonly togglePlay: () => void;
  /** Modifica la velocidad del multiplicador de tiempo (ej. 0.5x, 1x, 2x, 5x) */
  readonly setSpeed: (speed: number) => void;
  /** Salta instantáneamente a una posición temporal específica dentro de [0, totalDuration] */
  readonly seekTo: (time: number) => void;
  /** Pausa y reinicia la reproducción en t = 0 */
  readonly reset: () => void;
  /** Avanza un delta temporal especificado en segundos o unidades */
  readonly stepForward: (amount?: number) => void;
  /** Retrocede un delta temporal especificado en segundos o unidades */
  readonly stepBackward: (amount?: number) => void;
  /** Función pura para consultar el estado instantáneo en cualquier tiempo arbitrario */
  readonly getInstantaneousState: (time?: number) => InstantaneousPlaybackState;
}

/**
 * Estado completo y controles retornados por el hook `usePlaybackEngine`.
 */
export interface PlaybackEngineReturn extends PlaybackEngineControls {
  /** Tiempo actual de la simulación */
  readonly currentTime: number;
  /** Indica si la simulación está actualmente en reproducción */
  readonly isPlaying: boolean;
  /** Multiplicador de velocidad actual */
  readonly speed: number;
  /** Progreso normalizado entre 0.0 y 1.0 */
  readonly progress: number;
  /** Duración total de la simulación */
  readonly totalDuration: number;
  /** Indica si el tiempo actual ha alcanzado o superado la duración total */
  readonly isEnded: boolean;
  /** Estado instantáneo derivado para el fotograma actual */
  readonly instantaneousState: InstantaneousPlaybackState;
  /** Lista de identificadores de miembros que están hablando en el fotograma actual */
  readonly activeSpeakerIds: readonly string[];
  /** Alias de activeSpeakerIds */
  readonly activeSpeakers: readonly string[];
  /** Lista de turnos de habla activos en el fotograma actual */
  readonly activeTurns: readonly SpeechTurn[];
  /** Conexiones o enlaces conversacionales activos en el fotograma actual */
  readonly activeConnections: readonly ActiveConnection[];
  /** Función para verificar si un miembro específico está hablando en este fotograma */
  readonly isSpeaking: (memberId: string) => boolean;
}

/**
 * Función pura que calcula qué miembros están hablando y qué conexiones
 * o aristas conversacionales están activas en un fotograma temporal exacto.
 *
 * @param currentTime Tiempo instantáneo en el que evaluar la simulación.
 * @param speechTurns Colección de turnos de habla normalizados.
 * @returns Estado instantáneo inmutable derivado.
 */
export function deriveInstantaneousState(
  currentTime: number,
  speechTurns: readonly SpeechTurn[] = []
): InstantaneousPlaybackState {
  if (!Array.isArray(speechTurns) || speechTurns.length === 0) {
    return Object.freeze({
      currentTime,
      activeSpeakerIds: Object.freeze([]),
      activeSpeakers: Object.freeze([]),
      activeTurns: Object.freeze([]),
      activeConnections: Object.freeze([]),
      isSpeaking: () => false,
    });
  }

  // 1. Filtrar turnos activos en el fotograma actual
  const activeTurns: SpeechTurn[] = [];
  for (let i = 0; i < speechTurns.length; i++) {
    const turn = speechTurns[i];
    const start = turn.startTime;
    const end = turn.endTime;

    // Si el turno tiene duración 0 (inicio y fin coinciden), permitir margen de tolerancia
    if (start === end) {
      if (Math.abs(currentTime - start) < 0.05) {
        activeTurns.push(turn);
      }
    } else if (currentTime >= start && currentTime <= end) {
      activeTurns.push(turn);
    }
  }

  // 2. Extraer identificadores únicos de los miembros hablantes activos
  const speakerSet = new Set<string>();
  for (const turn of activeTurns) {
    const memberId = turn.memberId || turn.agentId || turn.sender_id;
    if (memberId) {
      speakerSet.add(memberId);
    }
  }
  const activeSpeakerIds = Object.freeze(Array.from(speakerSet));

  // 3. Derivar conexiones conversacionales activas
  const connections: ActiveConnection[] = [];
  const registeredConnectionKeys = new Set<string>();

  // A) Conexión por toma de turnos (Turn-Taking / Réplica en el diálogo):
  // Cada turno activo conecta al hablante actual con el último miembro que habló antes que él
  for (const activeTurn of activeTurns) {
    const currentMember = activeTurn.memberId || activeTurn.agentId || activeTurn.sender_id;
    if (!currentMember) continue;

    // Buscar en el historial previo el turno más reciente emitido por un miembro distinto que comenzó antes
    let previousTurn: SpeechTurn | null = null;
    for (let i = 0; i < speechTurns.length; i++) {
      const turn = speechTurns[i];
      const turnMember = turn.memberId || turn.agentId || turn.sender_id;
      if (turn.startTime < activeTurn.startTime && turnMember !== currentMember) {
        if (!previousTurn || turn.startTime > previousTurn.startTime) {
          previousTurn = turn;
        }
      }
    }

    if (previousTurn) {
      const prevMember = previousTurn.memberId || previousTurn.agentId || previousTurn.sender_id;
      const connKey = `${prevMember}->${currentMember}`;
      if (!registeredConnectionKeys.has(connKey)) {
        registeredConnectionKeys.add(connKey);
        connections.push(
          Object.freeze({
            id: `conn-turn-${prevMember}-${currentMember}-${activeTurn.id}`,
            source: prevMember,
            target: currentMember,
            type: 'turn-taking',
            turnId: activeTurn.id,
            intensity: 1.0,
          })
        );
      }
    }

    // B) Conexión directa si el turno contiene destinatario/target explícito en metadatos
    const turnRecord = activeTurn as unknown as Record<string, unknown>;
    const directTarget = (activeTurn.receiver_id ??
      activeTurn.target ??
      activeTurn.recipient_id ??
      turnRecord.receiver ??
      turnRecord.targetId ??
      turnRecord.recipient) as string | undefined;

    if (directTarget && directTarget !== currentMember) {
      const directKey = `direct-${currentMember}->${directTarget}`;
      if (!registeredConnectionKeys.has(directKey)) {
        registeredConnectionKeys.add(directKey);
        connections.push(
          Object.freeze({
            id: `conn-direct-${currentMember}-${directTarget}-${activeTurn.id}`,
            source: currentMember,
            target: directTarget,
            type: 'direct',
            turnId: activeTurn.id,
            intensity: 1.0,
          })
        );
      }
    }
  }

  // C) Conexión por co-ocurrencia / solapamiento (dos o más miembros hablando en simultáneo)
  if (activeSpeakerIds.length > 1) {
    for (let i = 0; i < activeSpeakerIds.length; i++) {
      for (let j = i + 1; j < activeSpeakerIds.length; j++) {
        const memberA = activeSpeakerIds[i];
        const memberB = activeSpeakerIds[j];
        const coKey = `co-${memberA}-${memberB}`;
        if (!registeredConnectionKeys.has(coKey)) {
          registeredConnectionKeys.add(coKey);
          connections.push(
            Object.freeze({
              id: `conn-co-${memberA}-${memberB}-${currentTime.toFixed(2)}`,
              source: memberA,
              target: memberB,
              type: 'co-occurrence',
              intensity: 0.85,
            })
          );
        }
      }
    }
  }

  return Object.freeze({
    currentTime,
    activeSpeakerIds,
    activeSpeakers: activeSpeakerIds,
    activeTurns: Object.freeze(activeTurns),
    activeConnections: Object.freeze(connections),
    isSpeaking: (memberId: string) => speakerSet.has(memberId),
  });
}

/**
 * Hook de React memoizado para derivar el estado instantáneo a partir de currentTime y SpeechTurns.
 * Exportado para componentes o paneles que necesiten consumir o proyectar fotogramas de forma aislada.
 */
export function useInstantaneousState(
  currentTime: number,
  speechTurns: readonly SpeechTurn[] = []
): InstantaneousPlaybackState {
  return useMemo(() => {
    return deriveInstantaneousState(currentTime, speechTurns);
  }, [currentTime, speechTurns]);
}

/**
 * Sobrecargas de signatura para permitir invocación flexible:
 * - Duración + arreglo directo de SpeechTurns.
 * - Duración + objeto de opciones avanzadas.
 * - Objeto unificado PlaybackEngineConfig.
 */
export function usePlaybackEngine(
  totalDuration: number,
  turns: readonly SpeechTurn[]
): PlaybackEngineReturn;
export function usePlaybackEngine(
  totalDuration: number,
  options?: PlaybackEngineOptions
): PlaybackEngineReturn;
export function usePlaybackEngine(
  config: PlaybackEngineConfig
): PlaybackEngineReturn;

/**
 * Hook de React para la gestión del motor de reproducción temporal del Visualizador Belbin.
 *
 * Utiliza EXCLUSIVAMENTE `requestAnimationFrame` para sincronizar el bucle con la tasa de
 * refresco del monitor, previniendo derivas temporales y garantizando animaciones fluidas a 60+ FPS.
 *
 * @param durationOrConfig Duración total en segundos/ms o configuración completa.
 * @param maybeOptions Opciones complementarias o arreglo directo de turnos cuando el primer argumento es la duración.
 */
export function usePlaybackEngine(
  durationOrConfig: number | PlaybackEngineConfig,
  maybeOptions?: PlaybackEngineOptions | readonly SpeechTurn[]
): PlaybackEngineReturn {
  // 1. Normalización de argumentos
  const isNumber = typeof durationOrConfig === 'number';
  const totalDuration = Math.max(
    0,
    isNumber ? durationOrConfig : (durationOrConfig?.totalDuration ?? 0)
  );

  const turns = useMemo<readonly SpeechTurn[]>(() => {
    if (Array.isArray(maybeOptions)) {
      return maybeOptions;
    }
    if (isNumber) {
      const opts = maybeOptions as PlaybackEngineOptions | undefined;
      return opts?.turns ?? opts?.speechTurns ?? [];
    }
    const cfg = durationOrConfig as PlaybackEngineConfig;
    return cfg?.turns ?? cfg?.speechTurns ?? [];
  }, [durationOrConfig, maybeOptions, isNumber]);

  const options = useMemo<PlaybackEngineOptions>(() => {
    if (Array.isArray(maybeOptions)) {
      return { turns: maybeOptions };
    }
    if (isNumber) {
      return (maybeOptions as PlaybackEngineOptions) ?? {};
    }
    return (durationOrConfig as PlaybackEngineConfig) ?? {};
  }, [durationOrConfig, maybeOptions, isNumber]);

  const timeUnit = options.timeUnit ?? 'seconds';

  // 2. Estados reactivos de reproducción
  const [currentTime, setCurrentTime] = useState<number>(() => {
    const init = options.initialTime ?? 0;
    return Math.max(0, totalDuration > 0 ? Math.min(init, totalDuration) : init);
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(() => !!options.autoPlay);
  const [speed, setSpeedState] = useState<number>(() => {
    const s = options.initialSpeed ?? 1.0;
    return s > 0 ? s : 1.0;
  });

  // 3. Referencias mutables para el bucle requestAnimationFrame (evitan cierres obsoletos / stale closures)
  const currentTimeRef = useRef<number>(currentTime);
  currentTimeRef.current = currentTime;

  const isPlayingRef = useRef<boolean>(isPlaying);
  isPlayingRef.current = isPlaying;

  const speedRef = useRef<number>(speed);
  speedRef.current = speed;

  const totalDurationRef = useRef<number>(totalDuration);
  totalDurationRef.current = totalDuration;

  const loopRef = useRef<boolean>(!!options.loop);
  loopRef.current = !!options.loop;

  const onTimeUpdateRef = useRef(options.onTimeUpdate);
  onTimeUpdateRef.current = options.onTimeUpdate;

  const onEndRef = useRef(options.onEnd);
  onEndRef.current = options.onEnd;

  const animFrameIdRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  // 4. Métodos de control expuestos (memoizados para estabilidad de referencias)
  const pause = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
  }, []);

  const play = useCallback(() => {
    // Si ya estamos al final o superándolo, reiniciar automáticamente al inicio al pulsar reproducir
    if (totalDurationRef.current > 0 && currentTimeRef.current >= totalDurationRef.current) {
      currentTimeRef.current = 0;
      setCurrentTime(0);
      onTimeUpdateRef.current?.(0);
    }
    setIsPlaying(true);
    isPlayingRef.current = true;
  }, []);

  const toggle = useCallback(() => {
    if (isPlayingRef.current) {
      pause();
    } else {
      play();
    }
  }, [play, pause]);

  const setSpeed = useCallback((newSpeed: number) => {
    if (typeof newSpeed === 'number' && !isNaN(newSpeed) && newSpeed > 0) {
      setSpeedState(newSpeed);
      speedRef.current = newSpeed;
    }
  }, []);

  const seekTo = useCallback((targetTime: number) => {
    const maxDur = totalDurationRef.current;
    const clamped = Math.max(0, maxDur > 0 ? Math.min(targetTime, maxDur) : Math.max(0, targetTime));
    currentTimeRef.current = clamped;
    setCurrentTime(clamped);
    // Reiniciar referencia del último fotograma para evitar saltos temporales bruscos en rAF
    lastTimestampRef.current = null;
    onTimeUpdateRef.current?.(clamped);
  }, []);

  const reset = useCallback(() => {
    pause();
    seekTo(0);
  }, [pause, seekTo]);

  const stepForward = useCallback((amount = 1) => {
    seekTo(currentTimeRef.current + amount);
  }, [seekTo]);

  const stepBackward = useCallback((amount = 1) => {
    seekTo(currentTimeRef.current - amount);
  }, [seekTo]);

  // 5. Bucle de tiempo EXCLUSIVO con requestAnimationFrame
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      lastTimestampRef.current = null;
      return;
    }

    // Si al iniciar ya está al final, reiniciar al principio
    if (totalDurationRef.current > 0 && currentTimeRef.current >= totalDurationRef.current) {
      currentTimeRef.current = 0;
      setCurrentTime(0);
      onTimeUpdateRef.current?.(0);
    }

    lastTimestampRef.current = null;

    const frameCallback = (timestamp: DOMHighResTimeStamp) => {
      if (lastTimestampRef.current !== null) {
        const deltaMs = timestamp - lastTimestampRef.current;

        // Limitar salto máximo a 250ms por seguridad ante cambios de pestaña o suspensiones
        const safeDeltaMs = Math.min(deltaMs, 250);

        // Calcular delta temporal según la unidad configurada y la velocidad de reproducción
        const simDelta =
          timeUnit === 'ms'
            ? safeDeltaMs * speedRef.current
            : (safeDeltaMs / 1000) * speedRef.current;

        let nextTime = currentTimeRef.current + simDelta;
        const maxDur = totalDurationRef.current;

        if (maxDur > 0 && nextTime >= maxDur) {
          if (loopRef.current) {
            nextTime = nextTime % maxDur;
            currentTimeRef.current = nextTime;
            setCurrentTime(nextTime);
            onTimeUpdateRef.current?.(nextTime);
          } else {
            nextTime = maxDur;
            currentTimeRef.current = nextTime;
            setCurrentTime(nextTime);
            setIsPlaying(false);
            isPlayingRef.current = false;
            onTimeUpdateRef.current?.(nextTime);
            onEndRef.current?.();
            animFrameIdRef.current = null;
            return;
          }
        } else {
          currentTimeRef.current = nextTime;
          setCurrentTime(nextTime);
          onTimeUpdateRef.current?.(nextTime);
        }
      }

      lastTimestampRef.current = timestamp;
      animFrameIdRef.current = requestAnimationFrame(frameCallback);
    };

    animFrameIdRef.current = requestAnimationFrame(frameCallback);

    return () => {
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      lastTimestampRef.current = null;
    };
  }, [isPlaying, timeUnit]);

  // Sincronizar cambios externos de totalDuration
  useEffect(() => {
    totalDurationRef.current = totalDuration;
    if (totalDuration > 0 && currentTimeRef.current > totalDuration) {
      seekTo(totalDuration);
    }
  }, [totalDuration, seekTo]);

  // 6. Derivación del estado instantáneo para el fotograma actual
  const instantaneousState = useMemo(() => {
    return deriveInstantaneousState(currentTime, turns);
  }, [currentTime, turns]);

  const getInstantaneousState = useCallback(
    (time?: number) => {
      const target = typeof time === 'number' ? time : currentTimeRef.current;
      return deriveInstantaneousState(target, turns);
    },
    [turns]
  );

  // 7. Cálculos complementarios de conveniencia
  const progress =
    totalDuration > 0 ? Math.min(1, Math.max(0, currentTime / totalDuration)) : 0;
  const isEnded = totalDuration > 0 && currentTime >= totalDuration;

  return {
    // Estado reactivo
    currentTime,
    isPlaying,
    speed,
    progress,
    totalDuration,
    isEnded,

    // Estado instantáneo derivado
    instantaneousState,
    activeSpeakerIds: instantaneousState.activeSpeakerIds,
    activeSpeakers: instantaneousState.activeSpeakers,
    activeTurns: instantaneousState.activeTurns,
    activeConnections: instantaneousState.activeConnections,
    isSpeaking: instantaneousState.isSpeaking,

    // Métodos imperativos de reproducción
    play,
    pause,
    toggle,
    togglePlay: toggle,
    setSpeed,
    seekTo,
    reset,
    stepForward,
    stepBackward,

    // Función de consulta instantánea
    getInstantaneousState,
  };
}

export default usePlaybackEngine;
