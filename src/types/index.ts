/**
 * Tipos oficiales para los 9 roles de equipo de Belbin en inglés.
 */
export type BelbinRoleEn =
  | 'Plant'
  | 'Resource Investigator'
  | 'Coordinator'
  | 'Shaper'
  | 'Monitor Evaluator'
  | 'Teamworker'
  | 'Implementer'
  | 'Completer Finisher'
  | 'Specialist';

/**
 * Tipos oficiales para los 9 roles de equipo de Belbin en español.
 */
export type BelbinRoleEs =
  | 'Cerebro'
  | 'Investigador de Recursos'
  | 'Coordinador'
  | 'Impulsor'
  | 'Monitor Evaluador'
  | 'Cohesionador'
  | 'Implementador'
  | 'Finalizador'
  | 'Especialista';

/**
 * Tipos de eventos del contrato real del simulador.
 */
export type TraceEventType = 'StartTalking' | 'StopTalking';

/**
 * Estados crudos del emisor después de un evento de traza del simulador.
 */
export type RawSenderState = 'Talking' | 'Silent' | 'Overlapping';

/**
 * Estados visuales mapeados al español para la interfaz de miembros.
 */
export type MemberVisualState = 'Hablando' | 'Callado' | 'Solapado';

/**
 * Alias de compatibilidad para MemberVisualState.
 */
export type VisualMemberState = MemberVisualState;

/**
 * Representación de un miembro dentro de los metadatos o raíz de la simulación en el JSON crudo.
 * Soporta tanto `member_id` como `agent_id` (y `id` como respaldo).
 */
export interface RawMember {
  readonly member_id?: string;
  readonly agent_id?: string;
  readonly id?: string;
  readonly name?: string;
  readonly dominant_roles?: readonly string[] | string;
  readonly belbin_role?: string;
  readonly belbinRole?: string;
  readonly role?: string;
  readonly [key: string]: unknown;
}

/**
 * Alias de compatibilidad para código heredado.
 */
export type RawSimulationAgent = RawMember;

/**
 * Metadatos crudos de la simulación recibidos en el JSON.
 */
export interface SimulationMetadata {
  readonly id?: string;
  readonly simulation_id?: string;
  readonly name?: string;
  readonly description?: string;
  readonly context_type?: string;
  readonly simulation_duration_s?: number;
  readonly duration?: number;
  readonly total_duration?: number;
  readonly start_time?: number | string;
  readonly end_time?: number | string;
  readonly members?: readonly RawMember[];
  readonly agents?: readonly RawMember[];
  readonly [key: string]: unknown;
}

/**
 * Evento individual dentro de la traza cruda del simulador.
 */
export interface RawTraceEvent {
  readonly id?: string;
  readonly event_id?: string;
  readonly time_ms: number;
  readonly timestamp?: number;
  readonly event_type: TraceEventType | string;
  readonly sender_id: string;
  readonly sender_state_after: RawSenderState | string;
  readonly receiver_id?: string | null;
  readonly recipient_id?: string;
  readonly target?: string;
  readonly content?: string;
  readonly message?: string;
  readonly payload?: Record<string, unknown>;
  readonly [key: string]: unknown;
}

/**
 * Alias de compatibilidad para RawTraceEvent.
 */
export type TraceEvent = RawTraceEvent;

/**
 * Estructura raíz del JSON crudo de la simulación.
 * Prioriza `members` con `agents` como propiedad opcional de respaldo.
 */
export interface RawSimulationTrace {
  readonly simulation_metadata: SimulationMetadata;
  readonly members?: readonly RawMember[];
  readonly agents?: readonly RawMember[];
  readonly trace_events: readonly RawTraceEvent[];
  readonly [key: string]: unknown;
}

/**
 * Representación visual procesada de un miembro para renderizado en la UI.
 */
export interface VisualMember {
  readonly id: string;
  readonly memberId: string;
  readonly name: string;
  readonly belbinRole: BelbinRoleEs | string;
  readonly dominantRoles: readonly (BelbinRoleEs | string)[];
  readonly color: string;
  readonly state: MemberVisualState;
  readonly originalRole?: string;
}

/**
 * Alias de compatibilidad para código heredado.
 */
export type VisualAgent = VisualMember;

/**
 * Representación procesada de un turno de habla (SpeechTurn) resultante
 * del emparejamiento de un evento "StartTalking" con su "StopTalking" respectivo.
 */
export interface SpeechTurn {
  readonly id: string;
  readonly sender_id: string;
  readonly receiver_id?: string;
  readonly recipient_id?: string;
  readonly target?: string;
  readonly memberId: string;
  readonly agentId?: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly duration: number;
  readonly senderStateAfter: MemberVisualState;
  readonly endStateAfter: MemberVisualState;
  readonly autoClosed?: boolean;
  readonly content?: string;
  readonly [key: string]: unknown;
}

/**
 * Modelo visual unificado retornado por la capa de adaptación de dominio.
 */
export interface VisualSimulationModel {
  readonly contextType?: string;
  readonly totalDuration: number;
  readonly duration: number;
  readonly members: readonly VisualMember[];
  readonly agents?: readonly VisualMember[];
  readonly turns: readonly SpeechTurn[];
  readonly speechTurns: readonly SpeechTurn[];
}

/**
 * Conexión o enlace activo entre miembros en un fotograma temporal.
 */
export interface ActiveConnection {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly type: 'turn-taking' | 'co-occurrence' | 'direct' | 'broadcast';
  readonly turnId?: string;
  readonly intensity?: number;
}

/**
 * Estado instantáneo derivado para un fotograma específico.
 */
export interface InstantaneousPlaybackState {
  readonly currentTime: number;
  readonly activeSpeakerIds: readonly string[];
  readonly activeSpeakers: readonly string[];
  readonly activeTurns: readonly SpeechTurn[];
  readonly activeConnections: readonly ActiveConnection[];
  readonly isSpeaking: (memberId: string) => boolean;
}
