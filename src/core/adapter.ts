import {
  BelbinRoleEs,
  MemberVisualState,
  RawMember,
  RawSimulationTrace,
  RawTraceEvent,
  SimulationMetadata,
  SpeechTurn,
  VisualMember,
  VisualSimulationModel,
} from '../types';

/**
 * Paleta curada de colores deterministas, de alto contraste y legibilidad visual.
 */
export const MEMBER_COLOR_PALETTE: readonly string[] = Object.freeze([
  '#2563EB', // Azul Real
  '#16A34A', // Verde Esmeralda
  '#DC2626', // Rojo Carmesí
  '#D97706', // Ámbar Cálido
  '#7C3AED', // Púrpura Intenso
  '#0891B2', // Cian Profundo
  '#EA580C', // Naranja Quemado
  '#DB2777', // Rosa Fucsia
  '#4F46E5', // Índigo Eléctrico
  '#059669', // Verde Mar
  '#9333EA', // Violeta
  '#0284C7', // Azul Cielo
  '#CA8A04', // Dorado
  '#E11D48', // Rosa Rubí
  '#475569', // Pizarra
  '#0D9488', // Verde Azulado
]);

/**
 * Alias de compatibilidad para código heredado.
 */
export const AGENT_COLOR_PALETTE: readonly string[] = MEMBER_COLOR_PALETTE;

/**
 * Diccionario de mapeo exhaustivo de roles Belbin (en minúsculas, inglés, siglas y variaciones)
 * a su denominación oficial en español.
 */
const BELBIN_ROLE_MAP: Readonly<Record<string, BelbinRoleEs>> = Object.freeze({
  // Plant / Cerebro
  plant: 'Cerebro',
  pl: 'Cerebro',
  cerebro: 'Cerebro',
  creativo: 'Cerebro',

  // Resource Investigator / Investigador de Recursos
  'resource investigator': 'Investigador de Recursos',
  resource_investigator: 'Investigador de Recursos',
  resourceinvestigator: 'Investigador de Recursos',
  ri: 'Investigador de Recursos',
  'investigador de recursos': 'Investigador de Recursos',
  investigadorderecursos: 'Investigador de Recursos',

  // Coordinator / Coordinador
  coordinator: 'Coordinador',
  co: 'Coordinador',
  coordinador: 'Coordinador',

  // Shaper / Impulsor
  shaper: 'Impulsor',
  sh: 'Impulsor',
  impulsor: 'Impulsor',

  // Monitor Evaluator / Monitor Evaluador
  'monitor evaluator': 'Monitor Evaluador',
  monitor_evaluator: 'Monitor Evaluador',
  monitorevaluator: 'Monitor Evaluador',
  me: 'Monitor Evaluador',
  'monitor evaluador': 'Monitor Evaluador',
  monitorevaluador: 'Monitor Evaluador',
  evaluador: 'Monitor Evaluador',

  // Teamworker / Cohesionador
  teamworker: 'Cohesionador',
  'team worker': 'Cohesionador',
  team_worker: 'Cohesionador',
  teamwork: 'Cohesionador',
  tw: 'Cohesionador',
  cohesionador: 'Cohesionador',
  'trabajador en equipo': 'Cohesionador',
  trabajadorenequipo: 'Cohesionador',

  // Implementer / Implementador
  implementer: 'Implementador',
  imp: 'Implementador',
  implementador: 'Implementador',

  // Completer Finisher / Finalizador
  'completer finisher': 'Finalizador',
  completer_finisher: 'Finalizador',
  completerfinisher: 'Finalizador',
  cf: 'Finalizador',
  finalizador: 'Finalizador',

  // Specialist / Especialista
  specialist: 'Especialista',
  sp: 'Especialista',
  especialista: 'Especialista',
});

/**
 * Normaliza cadenas para comparación insensible a mayúsculas, espacios y guiones.
 */
function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Redondea valores en segundos a 3 decimales para limpiar residuos de punto flotante.
 */
function roundSeconds(seconds: number): number {
  if (!Number.isFinite(seconds)) return 0;
  return Number(seconds.toFixed(3));
}

/**
 * Transforma un tiempo en milisegundos (`time_ms`) a segundos dividiendo por 1000
 * y redondeando a 3 decimales para limpiar residuos de punto flotante.
 */
export function msToSeconds(timeMs: number): number {
  if (typeof timeMs !== 'number' || !Number.isFinite(timeMs)) {
    return 0;
  }
  return roundSeconds(timeMs / 1000);
}

/**
 * Mapea un perfil Belbin normalizado a minúsculas al español estándar.
 * Si el rol no figura en el catálogo oficial de Belbin, devuelve el valor original limpio.
 */
export function mapBelbinRoleToSpanish(rawRole?: unknown): BelbinRoleEs | string {
  if (typeof rawRole !== 'string' || !rawRole.trim()) {
    return 'Sin rol';
  }

  const lowercased = rawRole.trim().toLowerCase();
  const directMatch = BELBIN_ROLE_MAP[lowercased];
  if (directMatch) {
    return directMatch;
  }

  const normalized = normalizeKey(lowercased);
  const mapped = BELBIN_ROLE_MAP[normalized];
  if (mapped) {
    return mapped;
  }

  return rawRole.trim();
}

/**
 * Mapea los estados crudos del simulador al estado visual en español:
 * - "Talking" -> "Hablando"
 * - "Silent" -> "Callado"
 * - "Overlapping" -> "Solapado"
 */
export function mapSenderStateToSpanish(rawState?: unknown): MemberVisualState {
  if (typeof rawState !== 'string' || !rawState.trim()) {
    return 'Callado';
  }

  const normalized = rawState.trim().toLowerCase();
  if (normalized === 'talking' || normalized === 'hablando') {
    return 'Hablando';
  }
  if (normalized === 'overlapping' || normalized === 'solapado') {
    return 'Solapado';
  }
  if (normalized === 'silent' || normalized === 'callado') {
    return 'Callado';
  }

  return 'Callado';
}

/**
 * Asigna un color determinista a partir de un identificador de miembro mediante el algoritmo DJB2.
 * Garantiza que la misma entrada reciba exactamente el mismo color en cada ejecución.
 */
export function getDeterministicColor(identifier: string): string {
  if (!identifier || typeof identifier !== 'string') {
    return MEMBER_COLOR_PALETTE[0];
  }

  let hash = 5381;
  for (let i = 0; i < identifier.length; i++) {
    hash = ((hash << 5) + hash) + identifier.charCodeAt(i);
    hash |= 0; // Conversión a entero de 32 bits
  }

  const index = Math.abs(hash) % MEMBER_COLOR_PALETTE.length;
  return MEMBER_COLOR_PALETTE[index];
}

/**
 * Obtiene el instante temporal en segundos (redondeado a 3 decimales) desde `time_ms`
 * o desde `timestamp` como respaldo de compatibilidad.
 */
function getEventTimeSeconds(event: RawTraceEvent): number {
  if (typeof event.time_ms === 'number' && Number.isFinite(event.time_ms)) {
    return msToSeconds(event.time_ms);
  }
  if (typeof event.timestamp === 'number' && Number.isFinite(event.timestamp)) {
    return roundSeconds(event.timestamp);
  }
  return 0;
}

/**
 * Determina si el evento corresponde al inicio de habla (`StartTalking` o respaldo `InicioHabla`).
 */
function isStartTalking(eventType?: unknown): boolean {
  if (typeof eventType !== 'string') return false;
  const normalized = normalizeKey(eventType);
  return (
    normalized === 'starttalking' ||
    normalized === 'start talking' ||
    normalized === 'iniciohabla' ||
    normalized === 'inicio habla'
  );
}

/**
 * Determina si el evento corresponde al fin de habla (`StopTalking` o respaldo `FinHabla`).
 */
function isStopTalking(eventType?: unknown): boolean {
  if (typeof eventType !== 'string') return false;
  const normalized = normalizeKey(eventType);
  return (
    normalized === 'stoptalking' ||
    normalized === 'stop talking' ||
    normalized === 'finhabla' ||
    normalized === 'fin habla'
  );
}

/**
 * Extrae el destinatario de un evento si está presente y no es nulo.
 */
function extractReceiverId(event: RawTraceEvent | undefined): string | undefined {
  if (!event) return undefined;
  const payload = event.payload as Record<string, unknown> | undefined;
  const candidates = [
    event.receiver_id,
    event.recipient_id,
    event.target,
    payload?.receiver_id,
    payload?.target,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return undefined;
}

/**
 * Empareja de forma determinista cada evento `StartTalking` con su `StopTalking` por `sender_id`
 * y cierra en `simulationDurationS` cualquier turno que quede sin evento de cierre al final de la traza.
 * Es una función pura que no muta el arreglo recibido.
 */
function pairSpeechTurns(
  events: readonly RawTraceEvent[],
  simulationDurationS?: number
): readonly SpeechTurn[] {
  // Clonación inmutable y ordenación cronológica por tiempo convertido a segundos
  const sortedEvents = [...events].sort((a, b) => {
    return getEventTimeSeconds(a) - getEventTimeSeconds(b);
  });

  const pendingStarts = new Map<string, RawTraceEvent[]>();
  const turns: SpeechTurn[] = [];
  let maxEventTimeS = 0;

  for (const event of sortedEvents) {
    const eventTimeS = getEventTimeSeconds(event);
    if (eventTimeS > maxEventTimeS) {
      maxEventTimeS = eventTimeS;
    }

    const senderId = event.sender_id;
    if (!senderId) continue;

    const eventType = event.event_type ?? (event as Record<string, unknown>).type;

    if (isStartTalking(eventType)) {
      const queue = pendingStarts.get(senderId) ?? [];
      pendingStarts.set(senderId, [...queue, event]);
    } else if (isStopTalking(eventType)) {
      const queue = pendingStarts.get(senderId);
      if (queue && queue.length > 0) {
        const [startEvent, ...remainingQueue] = queue;
        pendingStarts.set(senderId, remainingQueue);

        const startTime = getEventTimeSeconds(startEvent);
        const endTime = roundSeconds(Math.max(startTime, eventTimeS));
        const duration = roundSeconds(Math.max(0, endTime - startTime));

        const content =
          startEvent.content ??
          event.content ??
          startEvent.message ??
          event.message ??
          undefined;

        const receiver_id = extractReceiverId(startEvent) ?? extractReceiverId(event);
        const senderStateAfter: MemberVisualState =
          startEvent.sender_state_after !== undefined
            ? mapSenderStateToSpanish(startEvent.sender_state_after)
            : 'Hablando';
        const endStateAfter: MemberVisualState =
          event.sender_state_after !== undefined
            ? mapSenderStateToSpanish(event.sender_state_after)
            : 'Callado';

        turns.push(
          Object.freeze({
            id: `turn-${senderId}-${startTime}-${endTime}-${turns.length}`,
            sender_id: senderId,
            receiver_id,
            target: receiver_id,
            memberId: senderId,
            agentId: senderId,
            startTime,
            endTime,
            duration,
            senderStateAfter,
            endStateAfter,
            autoClosed: false,
            content,
          })
        );
      }
    }
  }

  // Cerrar en simulation_duration_s cualquier turno que quede sin evento de cierre al final de la traza
  const fallbackCloseTime =
    typeof simulationDurationS === 'number' &&
    Number.isFinite(simulationDurationS) &&
    simulationDurationS >= 0
      ? roundSeconds(simulationDurationS)
      : maxEventTimeS;

  for (const [senderId, openQueue] of pendingStarts.entries()) {
    for (const startEvent of openQueue) {
      const startTime = getEventTimeSeconds(startEvent);
      const endTime = roundSeconds(Math.max(startTime, fallbackCloseTime));
      const duration = roundSeconds(Math.max(0, endTime - startTime));
      const receiver_id = extractReceiverId(startEvent);
      const content = startEvent.content ?? startEvent.message ?? undefined;
      const senderStateAfter: MemberVisualState =
        startEvent.sender_state_after !== undefined
          ? mapSenderStateToSpanish(startEvent.sender_state_after)
          : 'Hablando';

      turns.push(
        Object.freeze({
          id: `turn-${senderId}-${startTime}-${endTime}-${turns.length}`,
          sender_id: senderId,
          receiver_id,
          target: receiver_id,
          memberId: senderId,
          agentId: senderId,
          startTime,
          endTime,
          duration,
          senderStateAfter,
          endStateAfter: 'Callado',
          autoClosed: true,
          content,
        })
      );
    }
  }

  // Asegura orden cronológico de los turnos resultantes
  turns.sort((a, b) => a.startTime - b.startTime || a.endTime - b.endTime);

  return Object.freeze(turns);
}

/**
 * Resuelve el identificador único de un miembro crudo soportando `member_id`, `agent_id` y `id`.
 */
function resolveRawMemberId(rawMember: RawMember): string | undefined {
  const candidate = rawMember.member_id ?? rawMember.agent_id ?? rawMember.id;
  if (typeof candidate === 'string' && candidate.trim()) {
    return candidate.trim();
  }
  return undefined;
}

/**
 * Extrae y normaliza los roles dominantes de un miembro crudo al español.
 */
function resolveMemberRoles(rawMember: RawMember): {
  dominantRoles: readonly (BelbinRoleEs | string)[];
  belbinRole: BelbinRoleEs | string;
  originalRole?: string;
} {
  const rawDominant = rawMember.dominant_roles;
  const rawList: string[] = [];

  if (Array.isArray(rawDominant)) {
    for (const item of rawDominant) {
      if (typeof item === 'string' && item.trim()) {
        rawList.push(item.trim().toLowerCase());
      }
    }
  } else if (typeof rawDominant === 'string' && rawDominant.trim()) {
    rawList.push(rawDominant.trim().toLowerCase());
  }

  const fallbackRawRole = (
    rawMember.belbin_role ??
    rawMember.belbinRole ??
    rawMember.role
  ) as string | undefined;

  if (rawList.length === 0 && typeof fallbackRawRole === 'string' && fallbackRawRole.trim()) {
    rawList.push(fallbackRawRole.trim().toLowerCase());
  }

  const mappedRoles = rawList.map((role) => mapBelbinRoleToSpanish(role));
  const primaryRole = mappedRoles[0] ?? 'Sin rol';

  return {
    dominantRoles: Object.freeze(mappedRoles.length > 0 ? mappedRoles : ['Sin rol']),
    belbinRole: primaryRole,
    originalRole: rawList[0] ?? fallbackRawRole,
  };
}

/**
 * Extrae y mapea la lista de miembros visuales priorizando `members` con `agents` como respaldo.
 */
function extractVisualMembers(
  rawTrace: RawSimulationTrace | undefined,
  metadata: SimulationMetadata | undefined,
  events: readonly RawTraceEvent[]
): readonly VisualMember[] {
  const membersMap = new Map<string, VisualMember>();

  // 1. Priorizar `members` (en raíz o metadata) con `agents` como respaldo de compatibilidad
  const declaredMembers: readonly RawMember[] =
    (Array.isArray(rawTrace?.members) && rawTrace.members.length > 0
      ? rawTrace.members
      : undefined) ??
    (Array.isArray(metadata?.members) && metadata.members.length > 0
      ? metadata.members
      : undefined) ??
    (Array.isArray(rawTrace?.agents) && rawTrace.agents.length > 0
      ? rawTrace.agents
      : undefined) ??
    (Array.isArray(metadata?.agents) && metadata.agents.length > 0
      ? metadata.agents
      : undefined) ??
    [];

  for (const rawMember of declaredMembers) {
    if (!rawMember) continue;
    const memberId = resolveRawMemberId(rawMember);
    if (!memberId) continue;

    const { dominantRoles, belbinRole, originalRole } = resolveMemberRoles(rawMember);
    const color = getDeterministicColor(memberId);

    membersMap.set(
      memberId,
      Object.freeze({
        id: memberId,
        memberId,
        name: rawMember.name || memberId,
        belbinRole,
        dominantRoles,
        color,
        state: 'Callado',
        originalRole,
      })
    );
  }

  // 2. Descubrir miembros que participan en los eventos pero no estaban declarados
  for (const event of events) {
    if (event.sender_id && !membersMap.has(event.sender_id)) {
      const payload = event.payload as Record<string, unknown> | undefined;
      const rawRole = (
        event.belbin_role ??
        payload?.belbin_role
      ) as string | undefined;

      const mappedRole = mapBelbinRoleToSpanish(rawRole);
      const color = getDeterministicColor(event.sender_id);

      membersMap.set(
        event.sender_id,
        Object.freeze({
          id: event.sender_id,
          memberId: event.sender_id,
          name: event.sender_id,
          belbinRole: mappedRole,
          dominantRoles: Object.freeze([mappedRole]),
          color,
          state: 'Callado',
          originalRole: rawRole,
        })
      );
    }
  }

  return Object.freeze(Array.from(membersMap.values()));
}

/**
 * Obtiene la duración declarada en los metadatos priorizando `simulation_duration_s`.
 */
function getDeclaredSimulationDuration(metadata: SimulationMetadata | undefined): number | undefined {
  if (typeof metadata?.simulation_duration_s === 'number' && metadata.simulation_duration_s >= 0) {
    return roundSeconds(metadata.simulation_duration_s);
  }
  if (typeof metadata?.total_duration === 'number' && metadata.total_duration >= 0) {
    return roundSeconds(metadata.total_duration);
  }
  if (typeof metadata?.duration === 'number' && metadata.duration >= 0) {
    return roundSeconds(metadata.duration);
  }
  return undefined;
}

/**
 * Computa la duración total de la simulación respetando `simulation_duration_s`
 * o calculándola como el punto temporal máximo alcanzado por eventos y turnos.
 */
function computeTotalDuration(
  metadata: SimulationMetadata | undefined,
  turns: readonly SpeechTurn[],
  events: readonly RawTraceEvent[]
): number {
  const declaredDuration = getDeclaredSimulationDuration(metadata);
  if (declaredDuration !== undefined) {
    return declaredDuration;
  }

  const maxTurnEndTime = turns.reduce((max, turn) => Math.max(max, turn.endTime), 0);
  const maxEventTime = events.reduce((max, ev) => {
    return Math.max(max, getEventTimeSeconds(ev));
  }, 0);

  return roundSeconds(Math.max(maxTurnEndTime, maxEventTime, 0));
}

/**
 * Función pura que transforma la traza cruda del simulador en el modelo visual del dominio.
 *
 * Cumple con:
 * - Cero dependencias externas y cero efectos secundarios.
 * - Conversión de `time_ms` a segundos redondeados a 3 decimales.
 * - Normalización a minúsculas de `dominant_roles` y mapeo de roles Belbin al español estándar.
 * - Asignación determinista de color por miembro.
 * - Emparejamiento de `StartTalking` y `StopTalking` por `sender_id`, cerrando turnos abiertos en `simulation_duration_s`.
 * - Mapeo de estados visuales (`Talking` -> `Hablando`, `Silent` -> `Callado`, `Overlapping` -> `Solapado`).
 */
export function adaptTraceToVisualModel(rawTrace: RawSimulationTrace): VisualSimulationModel {
  const metadata = rawTrace?.simulation_metadata ?? {};
  const events = Array.isArray(rawTrace?.trace_events) ? rawTrace.trace_events : [];

  const declaredDurationS = getDeclaredSimulationDuration(metadata);
  const turns = pairSpeechTurns(events, declaredDurationS);
  const members = extractVisualMembers(rawTrace, metadata, events);
  const totalDuration = computeTotalDuration(metadata, turns, events);

  return Object.freeze({
    contextType: metadata.context_type,
    totalDuration,
    duration: totalDuration,
    members,
    agents: members,
    turns,
    speechTurns: turns,
  });
}
