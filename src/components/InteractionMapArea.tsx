import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ActiveConnection, SpeechTurn, VisualMember } from '../types';

export interface InteractionMapAreaProps {
  /** Colección de miembros visuales mapeados */
  readonly members: readonly VisualMember[];
  /** Propiedad opcional de respaldo para compatibilidad */
  readonly agents?: readonly VisualMember[];
  /** Todos los turnos de habla de la simulación */
  readonly turns: readonly SpeechTurn[];
  /** Turnos activos en el fotograma actual */
  readonly activeTurns: readonly SpeechTurn[];
  /** Conexiones activas derivadas por el motor temporal */
  readonly activeConnections?: readonly ActiveConnection[];
  /** Tiempo actual de la simulación */
  readonly currentTime: number;
  /** Función para consultar si un miembro específico está hablando */
  readonly isSpeaking: (memberId: string) => boolean;
  /** Clase CSS opcional para personalización del contenedor */
  readonly className?: string;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Mapa de Interacciones
 *
 * Especialista UI/UX en React:
 * Dibuja un grafo radial nativo puro en SVG:
 * 1. Distribuye uniformemente los nodos de los miembros en una circunferencia mediante trigonometría pura.
 * 2. Traza las líneas de conexión dirigidas basándose en el destinatario de cada intervención (receiver_id).
 * 3. Las líneas históricas se muestran en trazo sutil punteado.
 * 4. El turno activo ilumina la línea directa emisor -> destinatario con el color del emisor,
 *    una flecha direccional precisa y una partícula animada (<circle>) viajando en tiempo real.
 * 5. Si la intervención carece de destinatario puntual, se genera una onda radial de difusión al equipo.
 */
export const InteractionMapArea: React.FC<InteractionMapAreaProps> = ({
  members,
  agents,
  turns,
  activeTurns,
  activeConnections = [],
  currentTime,
  isSpeaking,
  className = '',
}) => {
  const memberList = members ?? agents ?? [];

  // Dimensiones del lienzo SVG
  const width = 500;
  const height = 500;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 160; // Radio del círculo central de distribución
  const nodeRadius = 24; // Radio de cada nodo de miembro

  // 1. Mapeo O(1) de miembros para consulta rápida
  const memberMap = useMemo(() => {
    const map = new Map<string, VisualMember>();
    for (const member of memberList) {
      map.set(member.id, member);
    }
    return map;
  }, [memberList]);

  // 2. Coordenadas circulares para cada miembro
  const memberCoordinates = useMemo(() => {
    const map = new Map<
      string,
      { pos: Point; angle: number; textAnchor: 'start' | 'middle' | 'end'; labelPos: Point }
    >();
    const n = memberList.length;
    if (n === 0) return map;

    memberList.forEach((member, index) => {
      // Ángulo en radianes comenzando desde arriba (12 en punto = -PI/2)
      const angle = (2 * Math.PI * index) / n - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      // Posicionamiento radial de etiquetas de texto hacia el exterior para evitar colisiones
      const labelDistance = radius + nodeRadius + 14;
      const lx = centerX + labelDistance * Math.cos(angle);
      const ly = centerY + labelDistance * Math.sin(angle);

      const cosVal = Math.cos(angle);
      let textAnchor: 'start' | 'middle' | 'end' = 'middle';
      if (cosVal > 0.3) {
        textAnchor = 'start';
      } else if (cosVal < -0.3) {
        textAnchor = 'end';
      }

      map.set(member.id, {
        pos: { x, y },
        angle,
        textAnchor,
        labelPos: { x: lx, y: ly },
      });
    });

    return map;
  }, [memberList, centerX, centerY, radius, nodeRadius]);

  // 3. Extracción de todas las conexiones históricas dirigidas por receiver_id
  const staticDirectedPairs = useMemo(() => {
    const pairsMap = new Map<
      string,
      { source: string; target: string; count: number }
    >();

    for (const turn of turns) {
      const source = turn.memberId || turn.agentId || turn.sender_id;
      const target =
        turn.receiver_id ||
        turn.target ||
        turn.recipient_id ||
        ((turn as Record<string, unknown>).receiver as string | undefined);

      if (source && target && source !== target && memberCoordinates.has(source) && memberCoordinates.has(target)) {
        const key = `${source}->${target}`;
        const existing = pairsMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          pairsMap.set(key, { source, target, count: 1 });
        }
      }
    }

    return Array.from(pairsMap.values());
  }, [turns, memberCoordinates]);

  // 4. Conexiones dirigidas activas en el fotograma actual
  const activeDirectedInteractions = useMemo(() => {
    const list: Array<{
      turnId: string;
      source: string;
      target: string;
      sourcePos: Point;
      targetPos: Point;
      trimmedStart: Point;
      trimmedEnd: Point;
      sourceColor: string;
      progress: number;
    }> = [];

    for (const turn of activeTurns) {
      const source = turn.memberId || turn.agentId || turn.sender_id;
      const target =
        turn.receiver_id ||
        turn.target ||
        turn.recipient_id ||
        ((turn as Record<string, unknown>).receiver as string | undefined);

      if (source && target && source !== target) {
        const srcMeta = memberCoordinates.get(source);
        const tgtMeta = memberCoordinates.get(target);

        if (srcMeta && tgtMeta) {
          const sPos = srcMeta.pos;
          const tPos = tgtMeta.pos;

          // Cálculo del recorte exacto en los bordes de los nodos
          const dx = tPos.x - sPos.x;
          const dy = tPos.y - sPos.y;
          const dist = Math.hypot(dx, dy);

          if (dist > 0) {
            const ux = dx / dist;
            const uy = dy / dist;

            const trimmedStart: Point = {
              x: sPos.x + ux * (nodeRadius + 2),
              y: sPos.y + uy * (nodeRadius + 2),
            };
            const trimmedEnd: Point = {
              x: tPos.x - ux * (nodeRadius + 7),
              y: tPos.y - uy * (nodeRadius + 7),
            };

            const duration = Math.max(0.1, turn.endTime - turn.startTime);
            const elapsed = currentTime - turn.startTime;
            const progress = Math.max(0, Math.min(1, elapsed / duration));
            const sourceMember = memberMap.get(source);

            list.push({
              turnId: turn.id,
              source,
              target,
              sourcePos: sPos,
              targetPos: tPos,
              trimmedStart,
              trimmedEnd,
              sourceColor: sourceMember?.color ?? '#2563EB',
              progress,
            });
          }
        }
      }
    }

    return list;
  }, [activeTurns, memberCoordinates, memberMap, currentTime, nodeRadius]);

  return (
    <section
      aria-labelledby="interaction-map-heading"
      className={`bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col items-center justify-between transition-shadow hover:shadow-sm ${className}`}
    >
      {/* Cabecera del área */}
      <header className="w-full flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h2
            id="interaction-map-heading"
            className="text-xs font-semibold tracking-wider text-slate-500 uppercase"
          >
            Mapa de Interacciones
          </h2>
          <span className="text-[11px] font-mono text-slate-500 font-medium">
            {activeDirectedInteractions.length > 0 ? (
              <span className="text-emerald-700 font-medium flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Intervención dirigida en curso
              </span>
            ) : (
              <span className="text-slate-400">En espera de intervenciones</span>
            )}
          </span>
        </div>
      </header>

      {/* SVG Nativo Puro de Interacciones */}
      <div className="relative flex items-center justify-center w-full max-w-[460px] aspect-square select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          role="img"
          aria-label="Grafo circular de interacciones dirigidas entre miembros del equipo"
        >
          <defs>
            {/* Sombra sutil de nodos */}
            <filter id="bv-node-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.08" />
            </filter>

            {/* Marcador de punta de flecha genérico para líneas históricas */}
            <marker
              id="bv-arrow-historic"
              markerWidth="7"
              markerHeight="7"
              refX="6"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 1, 6 3.5, 0 6" fill="#CBD5E1" />
            </marker>
          </defs>

          {/* Círculo guía radial de fondo */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* 1. Líneas de interacción históricas basadas en destinatarios (receiver_id) */}
          <g className="historic-interaction-lines">
            {staticDirectedPairs.map((pair) => {
              const srcMeta = memberCoordinates.get(pair.source);
              const tgtMeta = memberCoordinates.get(pair.target);
              if (!srcMeta || !tgtMeta) return null;

              const dx = tgtMeta.pos.x - srcMeta.pos.x;
              const dy = tgtMeta.pos.y - srcMeta.pos.y;
              const dist = Math.hypot(dx, dy);
              if (dist <= 0) return null;

              const ux = dx / dist;
              const uy = dy / dist;
              const startX = srcMeta.pos.x + ux * (nodeRadius + 2);
              const startY = srcMeta.pos.y + uy * (nodeRadius + 2);
              const endX = tgtMeta.pos.x - ux * (nodeRadius + 6);
              const endY = tgtMeta.pos.y - uy * (nodeRadius + 6);

              return (
                <line
                  key={`historic-${pair.source}->${pair.target}`}
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke="#E2E8F0"
                  strokeWidth="1.4"
                  strokeDasharray="4 4"
                  markerEnd="url(#bv-arrow-historic)"
                />
              );
            })}
          </g>

          {/* 2. Líneas dirigidas activas destacadas */}
          <g className="active-interaction-lines">
            {activeDirectedInteractions.map((act) => {
              const dx = act.trimmedEnd.x - act.trimmedStart.x;
              const dy = act.trimmedEnd.y - act.trimmedStart.y;
              const angle = Math.atan2(dy, dx);

              // Coordenadas precisas para la punta de flecha en el receptor
              const arrowLength = 9;
              const arrowWidth = 5;
              const tipX = act.trimmedEnd.x;
              const tipY = act.trimmedEnd.y;
              const p1X = tipX - arrowLength * Math.cos(angle - Math.PI / 7);
              const p1Y = tipY - arrowLength * Math.sin(angle - Math.PI / 7);
              const p2X = tipX - arrowLength * Math.cos(angle + Math.PI / 7);
              const p2Y = tipY - arrowLength * Math.sin(angle + Math.PI / 7);

              return (
                <g key={`act-line-${act.turnId}-${act.source}-${act.target}`}>
                  {/* Halo de resplandor activo */}
                  <line
                    x1={act.trimmedStart.x}
                    y1={act.trimmedStart.y}
                    x2={act.trimmedEnd.x}
                    y2={act.trimmedEnd.y}
                    stroke={act.sourceColor}
                    strokeWidth="6"
                    strokeOpacity="0.22"
                    strokeLinecap="round"
                  />
                  {/* Línea principal activa */}
                  <line
                    x1={act.trimmedStart.x}
                    y1={act.trimmedStart.y}
                    x2={act.trimmedEnd.x}
                    y2={act.trimmedEnd.y}
                    stroke={act.sourceColor}
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                  {/* Punta de flecha coloreada en el nodo receptor */}
                  <polygon
                    points={`${tipX},${tipY} ${p1X},${p1Y} ${p2X},${p2Y}`}
                    fill={act.sourceColor}
                  />
                </g>
              );
            })}
          </g>

          {/* 3. Partícula viajante animada sobre la línea de intervención activa */}
          <g className="traveling-tokens">
            {activeDirectedInteractions.map((act) => {
              // Interpolación lineal sobre el tramo recortado:
              // P(t) = P_start + (P_end - P_start) * progress
              const currentX =
                act.trimmedStart.x + (act.trimmedEnd.x - act.trimmedStart.x) * act.progress;
              const currentY =
                act.trimmedStart.y + (act.trimmedEnd.y - act.trimmedStart.y) * act.progress;

              return (
                <g key={`token-${act.turnId}`}>
                  {/* Halo de dispersión */}
                  <circle
                    cx={currentX}
                    cy={currentY}
                    r="8"
                    fill={act.sourceColor}
                    opacity="0.3"
                  />
                  {/* Núcleo de la partícula */}
                  <circle
                    cx={currentX}
                    cy={currentY}
                    r="4.5"
                    fill="#FFFFFF"
                    stroke={act.sourceColor}
                    strokeWidth="2.5"
                  />
                </g>
              );
            })}
          </g>

          {/* 4. Nodos de miembros y etiquetas informativas */}
          <g className="member-nodes">
            {memberList.map((member) => {
              const meta = memberCoordinates.get(member.id);
              if (!meta) return null;

              const speaking = isSpeaking(member.id);
              const isTargetOfActiveTurn = activeDirectedInteractions.some(
                (act) => act.target === member.id
              );

              return (
                <g
                  key={member.id}
                  className="member-node-group"
                >
                  {/* Ondas concéntricas animadas si el miembro está hablando */}
                  {speaking && (
                    <motion.circle
                      cx={meta.pos.x}
                      cy={meta.pos.y}
                      r={nodeRadius + 6}
                      fill="none"
                      stroke={member.color}
                      strokeWidth="2"
                      initial={{ scale: 0.95, opacity: 0.8 }}
                      animate={{ scale: [1, 1.35, 1], opacity: [0.8, 0, 0.8] }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.6,
                        ease: 'easeInOut',
                      }}
                    />
                  )}

                  {/* Halo receptivo en el nodo destinatario de la intervención */}
                  {isTargetOfActiveTurn && (
                    <motion.circle
                      cx={meta.pos.x}
                      cy={meta.pos.y}
                      r={nodeRadius + 5}
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                      animate={{ rotate: 360 }}
                      style={{ originX: `${meta.pos.x}px`, originY: `${meta.pos.y}px` }}
                      transition={{ repeat: Infinity, duration: 5, ease: 'linear' }}
                    />
                  )}

                  {/* Círculo base con sombra */}
                  <circle
                    cx={meta.pos.x}
                    cy={meta.pos.y}
                    r={nodeRadius}
                    fill="#FFFFFF"
                    stroke={speaking ? member.color : '#CBD5E1'}
                    strokeWidth={speaking ? 2.5 : 1.5}
                    filter="url(#bv-node-shadow)"
                  />

                  {/* Relleno con el color determinista del miembro */}
                  <circle
                    cx={meta.pos.x}
                    cy={meta.pos.y}
                    r={nodeRadius - 4}
                    fill={member.color}
                    opacity={speaking ? 1 : 0.9}
                  />

                  {/* Inicial del miembro */}
                  <text
                    x={meta.pos.x}
                    y={meta.pos.y}
                    textAnchor="middle"
                    dy="0.36em"
                    fill="#FFFFFF"
                    fontSize="12"
                    fontWeight="700"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    pointerEvents="none"
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </text>

                  {/* Etiquetas de Nombre y Rol Belbin proyectadas radialmente hacia afuera */}
                  <g pointerEvents="none">
                    <text
                      x={meta.labelPos.x}
                      y={meta.labelPos.y}
                      textAnchor={meta.textAnchor}
                      fill="#0F172A"
                      fontSize="11"
                      fontWeight="600"
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      {member.name}
                    </text>
                    <text
                      x={meta.labelPos.x}
                      y={meta.labelPos.y + 13}
                      textAnchor={meta.textAnchor}
                      fill="#64748B"
                      fontSize="9"
                      fontWeight="500"
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      {member.belbinRole}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Leyenda minimalista inferior */}
      <footer className="w-full pt-3 mt-1 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-slate-300 rounded inline-block" />
          <span>Línea punteada: Historial de intervenciones dirigidas</span>
        </span>
        <span className="flex items-center gap-1.5 font-medium text-slate-700">
          <span className="w-3 h-0.5 bg-blue-600 rounded inline-block" />
          <span>Línea activa: Intervención dirigida al destinatario (receiver_id)</span>
        </span>
      </footer>
    </section>
  );
};

export default InteractionMapArea;
