import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MemberVisualState, SpeechTurn, VisualMember } from '../types';

export interface ParticipantsAreaProps {
  /** Colección de miembros visuales mapeados */
  readonly members: readonly VisualMember[];
  /** Propiedad opcional de respaldo para compatibilidad */
  readonly agents?: readonly VisualMember[];
  /** Identificadores de miembros que están hablando en el fotograma actual */
  readonly activeSpeakerIds: readonly string[];
  /** Turnos activos en el fotograma actual para reflejar el estado del simulador */
  readonly activeTurns?: readonly SpeechTurn[];
  /** Función para verificar si un miembro específico está hablando */
  readonly isSpeaking: (memberId: string) => boolean;
  /** Clase CSS opcional para personalización del contenedor */
  readonly className?: string;
}

/**
 * Área de Miembros
 *
 * Especialista UI/UX:
 * Renderiza las tarjetas de los miembros del equipo Belbin reaccionando en tiempo real
 * al estado vivo del motor de reproducción temporal:
 * - Iluminación del borde con el color distintivo y resplandor dinámico cuando está Hablando.
 * - Alerta y estilo ámbar en caso de habla simultánea / estado Solapado.
 * - Visualización de ecualizador de audio / microondas sonoras animadas.
 * - Indicación clara de rol Belbin en español estándar y estado visual (Hablando, Callado, Solapado).
 */
export const ParticipantsArea: React.FC<ParticipantsAreaProps> = ({
  members,
  agents,
  activeSpeakerIds,
  activeTurns = [],
  isSpeaking,
  className = '',
}) => {
  const memberList = members ?? agents ?? [];
  const isMultipleSpeaking = activeSpeakerIds.length > 1;

  const activeTurnByMember = useMemo(() => {
    const map = new Map<string, SpeechTurn>();
    for (const turn of activeTurns) {
      const id = turn.memberId || turn.agentId || turn.sender_id;
      if (id) {
        map.set(id, turn);
      }
    }
    return map;
  }, [activeTurns]);

  return (
    <section
      aria-labelledby="members-heading"
      className={`bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-sm ${className}`}
    >
      {/* Cabecera del área con contador y alerta de solapamiento */}
      <header className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h2
            id="members-heading"
            className="text-xs font-semibold tracking-wider text-slate-500 uppercase"
          >
            Miembros
          </h2>
          <span
            className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"
            title={`${memberList.length} miembros registrados en la simulación`}
          >
            {memberList.length}
          </span>
        </div>

        {/* Indicador reactivo de solapamiento conversacional */}
        <AnimatePresence>
          {isMultipleSpeaking && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 text-[11px] font-medium shadow-2xs"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Solapamiento ({activeSpeakerIds.length} hablando)</span>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Grid de tarjetas de miembros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2.5">
        {memberList.map((member) => {
          const activeTurn = activeTurnByMember.get(member.id);
          const speaking = isSpeaking(member.id);
          const overlapping =
            (speaking && isMultipleSpeaking) ||
            (speaking && activeTurn?.senderStateAfter === 'Solapado');

          const visualState: MemberVisualState = overlapping
            ? 'Solapado'
            : speaking
              ? 'Hablando'
              : member.state === 'Hablando' || member.state === 'Solapado'
                ? 'Callado'
                : member.state ?? 'Callado';

          // Cálculo reactivo de estilos visuales
          let borderColor = '#E2E8F0'; // slate-200
          let boxShadow = '0 1px 2px rgba(15, 23, 42, 0.04)';
          let backgroundColor = '#FFFFFF';

          if (visualState === 'Solapado') {
            borderColor = '#F59E0B'; // amber-500
            boxShadow = '0 0 0 2px rgba(245, 158, 11, 0.25), 0 4px 12px rgba(245, 158, 11, 0.12)';
            backgroundColor = '#FFFBEB'; // amber-50
          } else if (visualState === 'Hablando') {
            borderColor = member.color;
            boxShadow = `0 0 0 2px ${member.color}35, 0 4px 14px ${member.color}20`;
            backgroundColor = '#FAFAFA';
          }

          const rolesLabel =
            member.dominantRoles && member.dominantRoles.length > 0
              ? member.dominantRoles.join(' · ')
              : member.belbinRole;

          return (
            <motion.div
              key={member.id}
              layout
              animate={{
                borderColor,
                boxShadow,
                backgroundColor,
                scale: speaking ? 1.015 : 1,
              }}
              transition={{
                duration: 0.18,
                ease: 'easeOut',
              }}
              className="relative rounded-lg p-3 border transition-colors flex items-center justify-between gap-3 select-none"
              style={{
                borderColor,
                boxShadow,
                backgroundColor,
              }}
            >
              {/* Avatar e Identidad del Miembro */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="relative flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs"
                  style={{ backgroundColor: member.color }}
                >
                  {member.name.charAt(0).toUpperCase()}

                  {/* Indicador puntual de habla activa */}
                  {speaking && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                      style={{
                        backgroundColor: visualState === 'Solapado' ? '#F59E0B' : '#22C55E',
                      }}
                    />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {member.name}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: member.color }}
                    />
                    <span className="truncate">{rolesLabel}</span>
                  </p>
                </div>
              </div>

              {/* Indicador de Estado Visual (Hablando / Solapado / Callado) */}
              <div className="flex-shrink-0 flex items-center">
                <AnimatePresence mode="wait">
                  {visualState === 'Solapado' ? (
                    <motion.span
                      key="badge-overlap"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ duration: 0.15 }}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300"
                    >
                      Solapado
                    </motion.span>
                  ) : visualState === 'Hablando' ? (
                    <motion.div
                      key="wave-speaking"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-1.5"
                      title="Miembro hablando"
                    >
                      <div className="flex items-end gap-0.5 h-4 px-0.5">
                        {[0.35, 0.9, 0.55, 0.75].map((initialHeight, i) => (
                          <motion.span
                            key={i}
                            animate={{
                              height: ['25%', '100%', '25%'],
                            }}
                            transition={{
                              repeat: Infinity,
                              duration: 0.55 + i * 0.12,
                              ease: 'easeInOut',
                            }}
                            className="w-0.5 rounded-full"
                            style={{
                              backgroundColor: member.color,
                              height: `${initialHeight * 100}%`,
                            }}
                          />
                        ))}
                      </div>
                      <span
                        className="text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded border"
                        style={{
                          color: member.color,
                          borderColor: `${member.color}40`,
                          backgroundColor: `${member.color}12`,
                        }}
                      >
                        Hablando
                      </span>
                    </motion.div>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      Callado
                    </span>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default ParticipantsArea;
