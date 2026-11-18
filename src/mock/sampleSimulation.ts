import { RawSimulationTrace } from '../types';

/**
 * Traza de simulación de ejemplo adaptada al contrato real del simulador.
 * Incluye turnos individuales, interacciones directas con `receiver_id`,
 * marcas temporales en milisegundos (`time_ms`), eventos `StartTalking`/`StopTalking`
 * y un solapamiento intencional (`Overlapping`).
 */
export const SAMPLE_BELBIN_TRACE: RawSimulationTrace = {
  simulation_metadata: {
    id: 'sim-belbin-001',
    simulation_id: 'sim-belbin-001',
    name: 'Sesión de Planificación Estratégica',
    description: 'Resolución de cuello de botella en desarrollo de producto bajo roles Belbin',
    context_type: 'team_meeting',
    simulation_duration_s: 36,
    members: [
      {
        member_id: 'mem-coord',
        name: 'Elena Ramos',
        dominant_roles: ['coordinator'],
      },
      {
        member_id: 'mem-plant',
        name: 'Mateo Silva',
        dominant_roles: ['plant'],
      },
      {
        member_id: 'mem-shaper',
        name: 'Sofía Vargas',
        dominant_roles: ['shaper'],
      },
      {
        member_id: 'mem-resinv',
        name: 'Lucas Mendoza',
        dominant_roles: ['resource_investigator'],
      },
      {
        member_id: 'mem-impl',
        name: 'Camila Ortiz',
        dominant_roles: ['implementer'],
      },
    ],
  },
  trace_events: [
    // Turno 1: Elena (Coordinador) abre la sesión dirigiéndose a Mateo (Cerebro)
    {
      time_ms: 1000,
      event_type: 'StartTalking',
      sender_id: 'mem-coord',
      receiver_id: 'mem-plant',
      sender_state_after: 'Talking',
      content: 'Buenos días equipo. Mateo, ¿tienes la propuesta creativa para destrabar la arquitectura?',
    },
    {
      time_ms: 5200,
      event_type: 'StopTalking',
      sender_id: 'mem-coord',
      sender_state_after: 'Silent',
    },

    // Turno 2: Mateo (Cerebro) responde a Elena
    {
      time_ms: 6000,
      event_type: 'StartTalking',
      sender_id: 'mem-plant',
      receiver_id: 'mem-coord',
      sender_state_after: 'Talking',
      content: 'Sí Elena. Sugiero desacoplar el pipeline de procesamiento usando una cola distribuida reactiva.',
    },
    {
      time_ms: 11500,
      event_type: 'StopTalking',
      sender_id: 'mem-plant',
      sender_state_after: 'Silent',
    },

    // Turno 3: Sofía (Impulsor) interviene dirigiéndose a Camila (Implementador)
    {
      time_ms: 12200,
      event_type: 'StartTalking',
      sender_id: 'mem-shaper',
      receiver_id: 'mem-impl',
      sender_state_after: 'Talking',
      content: 'Suena bien en teoría, pero ¿cuánto tiempo real nos tomará desplegarlo en producción, Camila?',
    },
    {
      time_ms: 16800,
      event_type: 'StopTalking',
      sender_id: 'mem-shaper',
      sender_state_after: 'Silent',
    },

    // Turno 4 & 5 (Solapamiento intencional): Camila responde a Sofía, y Lucas se cruza dirigiéndose a Camila
    {
      time_ms: 17500,
      event_type: 'StartTalking',
      sender_id: 'mem-impl',
      receiver_id: 'mem-shaper',
      sender_state_after: 'Talking',
      content: 'Con el equipo actual necesitaríamos 4 días para los adaptadores y pruebas de regresión.',
    },
    {
      time_ms: 19000,
      event_type: 'StartTalking',
      sender_id: 'mem-resinv',
      receiver_id: 'mem-impl',
      sender_state_after: 'Overlapping',
      content: '¡Espera Camila! Ya encontré una librería de código abierto verificada que nos ahorra 2 días.',
    },
    {
      time_ms: 22000,
      event_type: 'StopTalking',
      sender_id: 'mem-impl',
      sender_state_after: 'Silent',
    },
    {
      time_ms: 25000,
      event_type: 'StopTalking',
      sender_id: 'mem-resinv',
      sender_state_after: 'Silent',
    },

    // Turno 6: Elena (Coordinador) sintetiza y asigna acción a Camila
    {
      time_ms: 26000,
      event_type: 'StartTalking',
      sender_id: 'mem-coord',
      receiver_id: 'mem-impl',
      sender_state_after: 'Talking',
      content: 'Excelente hallazgo Lucas. Camila, valida esa librería hoy mismo y definimos el cronograma final.',
    },
    {
      time_ms: 31000,
      event_type: 'StopTalking',
      sender_id: 'mem-coord',
      sender_state_after: 'Silent',
    },

    // Turno 7: Camila (Implementador) confirma a Elena
    {
      time_ms: 31800,
      event_type: 'StartTalking',
      sender_id: 'mem-impl',
      receiver_id: 'mem-coord',
      sender_state_after: 'Talking',
      content: 'Entendido Elena. La reviso y presento el análisis de viabilidad técnica antes del mediodía.',
    },
    {
      time_ms: 35500,
      event_type: 'StopTalking',
      sender_id: 'mem-impl',
      sender_state_after: 'Silent',
    },
  ],
};
