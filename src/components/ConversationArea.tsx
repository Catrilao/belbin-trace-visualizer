import React, { useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpeechTurn, VisualMember } from '../types';

export interface ConversationAreaProps {
  /** Colección completa de turnos de habla */
  readonly turns: readonly SpeechTurn[];
  /** Colección de miembros visuales mapeados */
  readonly members: readonly VisualMember[];
  /** Propiedad opcional de respaldo para compatibilidad */
  readonly agents?: readonly VisualMember[];
  /** Tiempo actual de la simulación */
  readonly currentTime: number;
  /** Turnos actualmente activos en este fotograma */
  readonly activeTurns: readonly SpeechTurn[];
  /** Clase CSS opcional para personalización del contenedor */
  readonly className?: string;
}

/**
 * Formatea segundos a formato mm:ss.s
 */
function formatTime(seconds: number): string {
  const safe = Math.max(0, isNaN(seconds) ? 0 : seconds);
  const mins = Math.floor(safe / 60);
  const secs = (safe % 60).toFixed(1);
  const paddedSecs = (safe % 60) < 10 ? `0${secs}` : secs;
  return `${mins.toString().padStart(2, '0')}:${paddedSecs}`;
}

/**
 * Área de Conversación (Flujo de conversación)
 *
 * Especialista UI/UX:
 * Renderiza el historial cronológico de turnos conversacionales:
 * - Oculta estrictamente los eventos futuros (turnos con startTime > currentTime).
 * - Destaca de forma prominente el turno activo (startTime <= currentTime <= endTime)
 *   con borde coloreado según el emisor, insignia con indicador de pulso y relieve.
 * - Desplazamiento automático suave (auto-scroll) hacia el turno activo.
 * - Muestra emisor, rol Belbin, destinatario específico (receiver_id) y tiempo exacto.
 */
export const ConversationArea: React.FC<ConversationAreaProps> = ({
  turns,
  members,
  agents,
  currentTime,
  activeTurns,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeTurnRef = useRef<HTMLElement | null>(null);
  const memberList = members ?? agents ?? [];

  // Mapeo O(1) de miembros por ID
  const memberMap = useMemo(() => {
    const map = new Map<string, VisualMember>();
    for (const member of memberList) {
      map.set(member.id, member);
    }
    return map;
  }, [memberList]);

  // Turnos visibles: SOLO los que ya han comenzado (startTime <= currentTime)
  // Los eventos futuros permanecen estrictamente ocultos.
  const visibleTurns = useMemo(() => {
    return turns.filter((turn) => turn.startTime <= currentTime);
  }, [turns, currentTime]);

  // Conjunto de IDs de turnos activos para búsqueda instantánea
  const activeTurnIdSet = useMemo(() => {
    return new Set(activeTurns.map((t) => t.id));
  }, [activeTurns]);

  // Desplazamiento automático inteligente hacia el turno activo
  useEffect(() => {
    if (activeTurnRef.current) {
      activeTurnRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    } else if (containerRef.current && visibleTurns.length > 0) {
      // Si estamos en un silencio intermedio, mantener el scroll al final del historial visible
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [visibleTurns.length, activeTurns]);

  return (
    <section
      aria-labelledby="conversation-heading"
      className={`bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col h-full overflow-hidden transition-shadow hover:shadow-sm ${className}`}
    >
      {/* Cabecera del área */}
      <header className="flex items-center justify-between p-4 pb-3 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2
            id="conversation-heading"
            className="text-xs font-semibold tracking-wider text-slate-500 uppercase"
          >
            Flujo de Conversación
          </h2>
          <span
            className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"
            title="Turnos transcurridos respecto al total de la simulación"
          >
            {visibleTurns.length} / {turns.length}
          </span>
        </div>

        <div className="text-xs font-mono text-slate-500 font-medium">
          t = <span className="text-slate-800">{formatTime(currentTime)}</span>
        </div>
      </header>

      {/* Contenedor con scroll de turnos cronológicos */}
      <div
        ref={containerRef}
        className="custom-scrollbar flex-1 overflow-y-auto p-4 space-y-3 min-h-[360px] max-h-[640px] scroll-smooth"
      >
        {visibleTurns.length === 0 ? (
          <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center p-6 text-slate-400 select-none">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-xs font-semibold text-slate-600">
              Sin turnos iniciados todavía
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
              Pulsa Reproducir o desliza la línea de tiempo para observar el diálogo en curso.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {visibleTurns.map((turn) => {
              const isActive = activeTurnIdSet.has(turn.id);
              const sender = memberMap.get(turn.memberId || turn.agentId || turn.sender_id);
              const senderColor = sender?.color ?? '#2563EB';
              const senderName = sender?.name ?? turn.sender_id;
              const senderRole = sender?.belbinRole ?? 'Miembro';

              // Destinatario explícito o inferido
              const receiverId =
                turn.receiver_id ||
                turn.target ||
                turn.recipient_id ||
                ((turn as Record<string, unknown>).receiver as string | undefined);
              const receiver = receiverId ? memberMap.get(receiverId) : undefined;
              const receiverName = receiver?.name ?? receiverId;
              const receiverRole = receiver?.belbinRole;

              return (
                <motion.article
                  key={turn.id}
                  ref={isActive ? (activeTurnRef as React.RefObject<HTMLElement>) : undefined}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: isActive ? 1.012 : 1,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="relative rounded-lg p-3.5 border transition-all"
                  style={{
                    backgroundColor: isActive ? '#FAFCFF' : '#FFFFFF',
                    borderColor: isActive ? senderColor : '#E2E8F0',
                    borderLeftWidth: isActive ? '4px' : '2px',
                    borderLeftColor: senderColor,
                    boxShadow: isActive
                      ? `0 0 0 1px ${senderColor}30, 0 4px 16px ${senderColor}18`
                      : '0 1px 2px rgba(15, 23, 42, 0.03)',
                  }}
                >
                  {/* Fila Superior: Emisor, Destinatario y Metadatos de Tiempo */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {/* Avatar del emisor */}
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: senderColor }}
                      />
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {senderName}
                      </span>
                      <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                        {senderRole}
                      </span>

                      {/* Destinatario de la intervención si existe */}
                      {receiverName && (
                        <div
                          className="flex items-center gap-1 text-[11px] text-slate-500 font-medium"
                          title={`Dirigido a ${receiverName} (${receiverRole || 'Miembro'})`}
                        >
                          <span className="text-slate-300">→</span>
                          <span
                            className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0"
                            style={{
                              backgroundColor: receiver?.color ?? '#94A3B8',
                            }}
                          />
                          <span className="text-slate-700 truncate max-w-[130px]">
                            {receiverName}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Insignia Activo y Marcador Cronológico */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isActive && (
                        <motion.span
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          className="flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full text-white shadow-2xs"
                          style={{ backgroundColor: senderColor }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          Activo
                        </motion.span>
                      )}
                      <span className="text-[10px] font-mono text-slate-400">
                        {formatTime(turn.startTime)} - {formatTime(turn.endTime)}
                      </span>
                    </div>
                  </div>

                  {/* Cuerpo del Mensaje */}
                  <div className="text-xs text-slate-700 leading-relaxed pl-2 font-normal">
                    {turn.content ? (
                      <p>{turn.content}</p>
                    ) : (
                      <p className="italic text-slate-400">
                        (Intervención oral sin registro textual)
                      </p>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </section>
  );
};

export default ConversationArea;
